# Hole Map Phase C1 — Hazard Overlays (Premium tier)

**Status:** Draft
**Date:** 2026-05-01
**Owner:** Sam
**Type:** Feature spec — depends on Phase A + Phase B

---

## 1. Goal & non-goals

### Goal

Premium-tier users see bunker and water hazard polygons rendered as semi-transparent overlays on the hole map. Helps with planning layups and visualising shot dispersion on the existing map view.

### Non-goals (v1)

- **Hazard awareness in scoring** (e.g. "ball in bunker" auto-detection).
- **Authoring tools.** No admin UI for drawing/editing polygons. v2.
- **Cross-hole hazard stats.** No "you hit 3 bunkers this round" aggregation.
- **OB / hazard-aware penalty handling.** Out of scope — scoring is unchanged.

---

## 2. Eligibility gate

Hazard polygons render only when:

- `useMapTier()` returns `'premium'`
- `hole_hazards` rows exist for the `(course_id, hole_number)` of the current view

If no rows exist for the hole, the map renders without hazards (no error, no warning) — same graceful-no-data behaviour as Phase B's POI markers.

---

## 3. Data sourcing

### 3.1 Strategy

Three potential sources, tried in priority order during a one-shot backfill per course:

1. **GolfAPI.io extended endpoint** (primary). The same provider already feeding `hole_coordinates`. If their API exposes hazard polygons (need to verify their docs during implementation), use them — same cache TTL semantics, same auth.
2. **OSM Overpass on demand** (fallback). Query `leisure=golf_course` polygons within the course bounding box, filtered by `golf=bunker` and `natural=water` / `golf=water_hazard`. Convert to PostGIS polygons and cache locally. OSM coverage is patchy globally but solid in metro Australia (the launch market).
3. **Skip the course** (last resort). No hazards rendered. Map still functions per Phase A/B.

The orchestration is encapsulated in a new hook `useHazardBackfill(courseId)` mirroring the existing `useCoordinateBackfill` pattern.

### 3.2 GolfAPI.io confirmation

The implementation plan must include a **pre-flight investigation step** to confirm whether GolfAPI.io exposes hazards:

- Check their public API docs at golfapi.io
- If yes: use their endpoint
- If no: skip the GolfAPI.io step entirely and OSM becomes primary

This is a 30-minute task during the plan, not a design blocker.

### 3.3 OSM rate-limit etiquette

The public Overpass API (`overpass-api.de`) has fair-use policy — roughly 10,000 queries per IP per day. Mitigations:

- Cache aggressively: 30-day TTL on `hole_hazards` rows, same as `hole_coordinates`.
- Backfill is one query per course (covers all 18 holes via the course bounding box), not per hole.
- For long-tail courses, batch backfill is acceptable since each course is queried ≤1× per 30 days.

---

## 4. Data model

### 4.1 New table

```sql
CREATE TABLE hole_hazards (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  course_id    UUID NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
  hole_number  SMALLINT NOT NULL CHECK (hole_number BETWEEN 1 AND 18),
  hazard_type  TEXT NOT NULL CHECK (hazard_type IN ('bunker', 'water')),
  polygon      GEOGRAPHY(POLYGON, 4326) NOT NULL,
  source       TEXT NOT NULL CHECK (source IN ('golfapi', 'osm', 'manual')),
  external_id  TEXT,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (course_id, hole_number, hazard_type, external_id)
);

CREATE INDEX hole_hazards_course_hole_idx
  ON hole_hazards (course_id, hole_number);
```

The `external_id` column captures the upstream identifier (GolfAPI feature id, OSM way/relation id) so subsequent backfills can de-dupe rather than insert clones. The unique constraint allows multiple bunkers per hole as long as their external ids differ.

### 4.2 RLS

```sql
ALTER TABLE hole_hazards ENABLE ROW LEVEL SECURITY;

-- All authenticated users can read hazards (course data is shared).
CREATE POLICY hole_hazards_select ON hole_hazards FOR SELECT
USING (auth.role() = 'authenticated');

-- Inserts/updates only via service-role backfill (no client mutations).
-- No client-facing INSERT/UPDATE/DELETE policies.
```

---

## 5. Architecture

### 5.1 New hooks

| Hook | Purpose |
|------|---------|
| `useHoleHazards(courseId, holeNumber)` | TanStack query → `HazardPolygon[]` for the hole. Cache key: `['holeHazards', courseId, holeNumber]`. Returns `[]` for free/social tier or no data. |
| `useHazardBackfill(courseId)` | Auto-trigger on first hole-map open per course. Sequence: GolfAPI.io check → OSM query → cache populate. Mirrors `useCoordinateBackfill` exactly in shape, including `triggerBackfill` callback for explicit retries. |

### 5.2 New components

| Component | Responsibility |
|-----------|----------------|
| `HazardOverlay` | Renders one `<Polygon>` per hazard with semantic fill — sand-tan for bunkers, water-blue for water — at low opacity (~0.35). Stroke colour matches fill at higher opacity. |

### 5.3 Modified components

- `useHoleMapMarkers` — when tier === `'premium'`, populate the `hazards` field from `useHoleHazards()` (currently unused since Phase A reserved it as `[]`). Shape change to `HazardMarker` carrying `{ type, polygon: LatLng[] }`.
- `MapMarkerSet` — new branch when `tier === 'premium'`: render a `<HazardOverlay>` per hazard before the POI markers (so hazards are visually under the POIs).

### 5.4 New types

```ts
// In useHoleMapMarkers types
export type HazardType = 'bunker' | 'water';

export interface HazardPolygon {
  type: HazardType;
  polygon: LatLng[];
  source: 'golfapi' | 'osm' | 'manual';
  externalId?: string;
}

// Update HoleMapMarkers.hazards type:
hazards: HazardPolygon[];  // was: PoiMarker<string>[] in Phase B
```

The Phase B contract used `PoiMarker<string>` for hazards as a placeholder. Phase C1 reshapes to `HazardPolygon[]`. Update consumers (only `MapMarkerSet`) accordingly.

---

## 6. Integration

The Phase A architecture explicitly reserved `hazards: []` in `useHoleMapMarkers` for this exact use case. Phase C1 fills that field for premium users. No screen-level changes — `HoleMapScreen` continues to consume `useHoleMapMarkers` as it does today; the `MapMarkerSet` already receives the `hazards` array and just needs to render it.

---

## 7. Tests

### 7.1 Unit

- `useHoleHazards`: returns empty array for non-premium tiers (defensive — should never be called for non-premium, but tier-aware safety).
- `useHoleMapMarkers`: populates `hazards` from `useHoleHazards` only on premium tier; remains empty on free/social.
- `useHazardBackfill`: GolfAPI failure → falls through to OSM; OSM failure → no-op without throwing.

### 7.2 Component

- `HazardOverlay`: renders one `<Polygon>` per hazard; bunker vs water gets different fill colour; opacity matches design.
- `MapMarkerSet`: on premium tier, renders hazard overlays before POI markers; on social/free, skips hazards.

### 7.3 Schema

- RLS test: anonymous read returns 0 rows; authenticated read returns all rows for the course; client INSERT fails (no policy).

### 7.4 Manual

- Open hole map for a known course with hazards → verify polygons appear at correct locations and don't visually overlap with POI markers.
- Toggle tier (via debug settings) free → social → premium → confirm hazards only render at premium.

---

## 8. Open questions

1. **GolfAPI.io extended endpoint shape.** Need to confirm whether their API exposes hazard polygons. If not, the GolfAPI.io ingestion step is dropped and OSM becomes primary. **Investigation, not a design blocker.**
2. **Hazard polygon precision.** OSM polygons can be coarse. If they look bad on the satellite map (offset by 5–10m), we need a smoothing/correction step. Defer to manual QA on real courses; mitigate via the `manual` source enum value if curation becomes necessary.
3. **Performance on dense holes.** A par 5 might have 8+ bunkers. Rendering many `<Polygon>` overlays could affect frame rate during pan/zoom. Mitigation: `tracksViewChanges={false}` on the polygons (similar to POI markers in Phase B); benchmark on a low-end Android device.

---

## 9. Considered alternatives

- **Render hazards via tile overlay** (e.g. pre-baked tile layer per course). Rejected — adds tile-server complexity, no editability, doesn't match the polygon-as-data approach.
- **Skip hazards entirely**. Considered — Premium can be hazard-free, focus on shot logging only. Rejected because hazards is the cheaper of the two Phase C deliverables and adds genuine planning value to the existing map.
- **Manual admin curation as primary**. Rejected — too much operational burden for a launch market. OSM gets us 80% there for free.

---

## 10. Risks

- **OSM coverage gaps.** Some courses (especially regional Australia) have minimal OSM golf data. Mitigation: the no-data case is graceful (map renders without hazards). Track coverage operationally; if it's <30% of active courses, prioritise admin curation tooling.
- **Hazard misclassification.** OSM tags aren't always consistent. A pond tagged `golf=water_hazard` vs `natural=water` might look different. Mitigation: backfill normalises both to `'water'` in our schema.
- **API quota leakage.** Forgetting `tracksViewChanges={false}` on hazard polygons could trigger expensive re-renders. Mitigation: enforced via lint rule or test.

---

## 11. Phased rollout

- Land behind the existing `enableHoleMap` flag.
- No separate `enableHazards` flag — when shipped, all premium users with the hole map enabled see hazards on courses with data.

---

## 12. File touch list

### New

- `supabase/migrations/<ts>_create_hole_hazards.sql` — table, indexes, RLS
- `src/types/database/holeHazards.types.ts` — DB row shape + `HazardPolygon` interface
- `src/hooks/hazards/queries.ts` — `useHoleHazards`
- `src/hooks/hazards/backfill.ts` — `useHazardBackfill`
- `src/hooks/hazards/index.ts` — barrel
- `src/services/hazards/golfApiHazards.ts` — GolfAPI.io fetch helpers (skipped if no endpoint)
- `src/services/hazards/osmHazards.ts` — Overpass query + parse + normalise
- `src/components/scorecard/HoleMap/HazardOverlay.tsx`
- `src/__tests__/hooks/hazards/queries.test.ts`
- `src/__tests__/hooks/hazards/backfill.test.ts`
- `src/__tests__/components/scorecard/HoleMap/HazardOverlay.test.tsx`

### Modified

- `src/hooks/useHoleMapMarkers.ts` — populate `hazards` on premium; reshape type from `PoiMarker<string>[]` to `HazardPolygon[]`
- `src/components/scorecard/HoleMap/MapMarkerSet.tsx` — render `HazardOverlay` per hazard on premium tier
- `src/components/scorecard/HoleMap/index.ts` — export `HazardOverlay`
- `src/__tests__/hooks/useHoleMapMarkers.test.ts` — add hazard population assertions
- `src/__tests__/components/scorecard/HoleMap/MapMarkerSet.test.tsx` — assert hazard overlays render on premium
- `docs/guides/SUBSCRIPTION_TIERS.md` — note hazards available on premium
