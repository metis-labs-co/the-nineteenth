# Hole Map & Tap-to-Measure — Design Spec

**Status:** Draft
**Date:** 2026-05-01
**Owner:** Sam
**Type:** Phased roadmap (three tiers, three phases)

---

## 1. Problem & Goal

The score entry screen already shows a numeric distance-to-pin badge (`src/components/scorecard/HoleHeader/DistanceToPin.tsx`) calculated from live GPS to `green_center` via Haversine. Players want a richer, visual version of this: tap the badge → see the hole on a satellite map → tap any point on the map to plan a shot, with carry and remaining distances rendered as line segments.

**Goals**

- Visualise the player's GPS position and the green on a satellite map of the current hole.
- Tap-to-measure: drop a marker anywhere; render two segments (you → tap, tap → green) with distance labels on each.
- Use the new map view as the central upsell ladder for paid tiers — what's *on* the map differs by tier, not whether the map exists.

**Non-goals (entire roadmap)**

- Replacing the existing distance-to-pin badge.
- Vector-rendered hole geometry (custom golf-course tiles, OSM `golf=*` overlays).
- Offline map tiles. Map view requires network; offline scoring keeps working as today.
- Wind, elevation, slope, or club-suggestion overlays.
- A standalone "browse-the-course" mode outside an active round (Phase 1–3 are all anchored to score entry).

---

## 2. Tier Strategy

| Tier | Map content | What it costs to build |
|------|-------------|-------------------------|
| **Free** | Satellite tiles, GPS dot, pin marker, tap-to-measure with two distance segments. | Phase A — full architecture |
| **Social** | Above + tee back/front markers and green front/centre/back markers, with F/C/B distances on labels. | Phase B — markers + label upgrades |
| **Premium** | Above + hazard overlays + per-round shot logging trail. | Phase C — new data model + scoring-flow integration |

The existing distance-to-pin badge is **formally Free** for all users (already the case in code; this spec aligns the tier doc to match). Tier gating only applies to *map content*, never to whether the map opens.

---

## 3. Phase A — Free tier (minimum viable map)

### 3.1 Scope

Tap distance badge → modal `HoleMapScreen` with:

- Satellite map centred on the hole (centroid of available coordinates; falls back to GPS or course centroid).
- User position marker driven by `useUserLocation()`.
- Pin marker at `green_center`.
- One distance polyline: GPS → green centre, with the existing distance label rendered as a callout near the line midpoint.
- **Tap to drop a measure marker:** single tap places a yellow marker. The map then renders two polylines:
  - GPS → tap point ("carry")
  - Tap point → green ("remaining")
  - Each line carries a distance callout in the user's preferred unit (m/yd).
- "Reset" action in the header clears the tap marker (returns to the single-line state).
- Close button returns to score entry; tap marker is not persisted.

### 3.2 Permission and fallback states

| Condition | Behaviour |
|-----------|-----------|
| GPS permission granted, lock acquired | Full experience as above. |
| GPS denied/unavailable | Map opens. No user dot. Default measurement source becomes `tee_back` if available, else map centre. Tap-to-measure still works tap-to-tap. |
| Course has no `hole_coordinates` rows for this hole | Map opens at the course-level centroid (or country fallback). `<NoCoordinatesFallback>` overlay shown with copy + a CTA that triggers the existing `useCoordinateBackfill()` hook. |
| Network offline | Map view is non-functional. Show offline message and a "view distance only" link that closes the modal. Score entry itself remains fully offline-capable. |

### 3.3 Architecture

```
ScorecardScreen
  └── ScorecardHeader
        └── DistanceToPin  ← existing component, becomes <Pressable>
              └─[onPress]─► navigation.navigate('HoleMap', { courseId, holeNumber, roundId })

HoleMapScreen (new, modal route in scorecard navigator)
  ├── useUserLocation()                     [existing]
  ├── useHoleCoordinatesByHole(courseId, holeNumber)  [existing]
  ├── useGreenCoordinate(courseId, holeNumber)        [existing]
  ├── useHoleMapMarkers(coords, tier)        [new — composes coords into render-ready markers]
  ├── useMapTier()                           [new — wraps useSubscription() → 'free' | 'social' | 'premium']
  └── <MapView provider={PROVIDER_DEFAULT} mapType="satellite">
        ├── <UserMarker />            (from useUserLocation)
        ├── <PinMarker />             (green_center)
        ├── <TapMarker />             (local state)
        ├── <MapMarkerSet tier={tier} />   (no-op in Phase A; renders POIs in Phase B)
        ├── <DistanceLine ... />      (GPS → tap or GPS → green)
        └── <DistanceLine ... />      (tap → green, when tap marker present)
```

### 3.4 Components

- **`HoleMapScreen`** — top-level screen, owns local `tapMarker: LatLng | null` state. Wraps everything in a themed modal layout.
- **`MapHeader`** — back button, hole number + par, "Reset marker" button (disabled when no marker).
- **`UserMarker`, `PinMarker`, `TapMarker`** — thin presentational wrappers around `<Marker>` with theme-aware icons.
- **`DistanceLine`** — `<Polyline>` + a `<Marker>` near midpoint that renders a styled callout label. Two reusable variants: `gps-to-tap`, `tap-to-pin`, `gps-to-pin`.
- **`MapMarkerSet`** — pure tier-driven renderer; in Phase A it's a no-op so the contract is fixed early.
- **`NoCoordinatesFallback`** — overlay shown when no POIs exist for the hole.

### 3.5 Data layer

- No schema changes.
- New hook `useHoleMapMarkers(courseId, holeNumber, tier)` selects from `useHoleCoordinatesByHole` and returns a `{ pin, tees: [], greens: [], hazards: [] }` shape. Phase A only populates `pin`.
- Tier hook `useMapTier()`: `useSubscription()` → maps `Free | Social | Premium | SuperAdmin` to a single string.

### 3.6 Distance calculation

Reuse `calculateDistance()` from `src/utils/gpsCalculations.ts` for all three legs. Convert to user's preferred unit via existing `useFormattedDistance()`.

### 3.7 Native dependency

- `react-native-maps` added to `package.json`.
- iOS uses Apple Maps (`PROVIDER_DEFAULT`). No API key. EAS rebuild required.
- Android uses Google Maps (`PROVIDER_DEFAULT`). Requires Google Maps API key in `app.json` `android.config.googleMaps.apiKey`. New EAS secret + production key with platform/package restrictions.
- `mapType="satellite"` chosen — golf maps are useless without imagery.

### 3.8 Feature flag

- `enableHoleMap` boolean in `settingsStore` and a remote-config equivalent for staged rollout.
- Off by default for first build, on for staff, then gradual %.

### 3.9 Testing

- Unit: `useHoleMapMarkers` reducer, distance recomputation when tap marker changes.
- Component: snapshot for each tier (free with no POIs, social with POIs, premium with POIs+hazards stub), fallback states (no GPS, no coords, offline).
- Manual: real-device GPS lock at a known course; verify carry+remaining sum within ±2m of `calculate_hole_distance` SQL helper.

---

## 4. Phase B — Social tier (POI-aware)

### 4.1 Scope adds

- Render markers for every POI returned by `useHoleCoordinatesByHole`:
  - `tee_back`, `tee_front` — small grey pegs.
  - `green_front`, `green_center`, `green_back` — three small green circles.
- Distance label format upgrades:
  - GPS → green callout shows `F · C · B` triple distance (e.g. `98 · 105 · 112 m`) instead of single number.
  - Tap → green callout shows the same triple.
- Tap a green POI marker to switch the measurement target endpoint (default target is `green_center`; tap `green_front` to make the line end there instead). The start anchor — GPS or the user's tap marker — is unchanged.
- Tap a tee POI marker to switch the start anchor to that tee (e.g. measure tee_back → green_center to see the printed hole length).
- POI markers do not render on Free tier (see §6.1).

### 4.2 Architecture impact

- `MapMarkerSet` starts rendering POIs.
- `DistanceLine` callout supports the F/C/B triple format.
- `useHoleMapMarkers` populates `tees` and `greens` arrays.

### 4.3 Coverage dependency

Phase B's value depends on `hole_coordinates` coverage. The SQL coverage check must run before locking Phase B's go-live, and the result drives whether Phase B ships behind a per-course gate ("Map markers available on supported courses").

---

## 5. Phase C — Premium tier (hazard + shot history)

### 5.1 Scope adds

- **Hazard overlays** — bunker and water polygons rendered on the map.
- **Shot logging** — during score entry, after entering a score on a hole, the user can tap "Log shots" and drop one marker per shot in sequence; markers persist for the round and are visible on the map.
- **Shot trail** — connects shot markers as a coloured polyline; final shot links to the pin.

### 5.2 Architecture impact (high-level — *not* fully designed in this spec)

- New table `shot_log` (round_id, hole_number, player_id, sequence, lat, lng, club_used?, shot_type?). RLS mirrors `scorecards`.
- Shot logging UX is its own brainstorm — score-entry flow integration, optional vs required, multi-player groups, offline sync. **Phase C should be re-spec'd before implementation.** This document only commits to *what* Phase C contains, not how it's built.
- Hazard data source — three candidates: GolfAPI.io extended endpoint (pending check), OSM `leisure=golf_course` polygons via Overpass on demand, or admin-curated polygons stored in a new `hole_hazards` table.

### 5.3 Why include Phase C in this spec at all?

So that the Phase A architecture leaves room for it: `MapMarkerSet` is tier-driven from day one; `useHoleMapMarkers` returns `hazards: []` from day one; the screen layout reserves space for a "shots" toolbar. No code is written for Phase C in Phase A's plan.

---

## 6. Open Questions

1. **POI markers as upsell teaser on Free tier.** Spec defaults to *not* rendering POIs on Free (clean visual). Alternative: render them visibly but make them inert/dimmed in Free as an upsell prompt. The codebase's existing pattern is graceful degradation (locked-but-visible) per `SUBSCRIPTION_TIERS.md`, which would argue for showing them. Decide before Phase B build.
2. **Coordinate coverage %.** Blocking data point for Phase B rollout strategy. SQL listed in §A.1 — must be run before Phase B kicks off.
3. **Hazard data source.** Decide as part of Phase C re-spec, not now.
4. **Persistence of tap marker across hole change.** Spec says "no" (resets). Confirm during Phase A build that this matches expected behaviour on real hardware.
5. **Distance unit.** Inherits user's existing preference (m / yd) via `useFormattedDistance` — no new toggle.

---

## 7. Considered Alternatives

- **MapLibre + tile provider** — more control, no native SDK gymnastics, but adds tile-provider plumbing and cost. Not justified at v1.
- **`react-native-maps` + OSM raster tiles via `<UrlTile>`** — street-only data, not useful for golf, and high-volume use violates OSM tile-server policy.
- **Single-anchor measurement (GPS → tap *or* tap → green)** — simpler, but the carry+remaining pair is what golfers actually plan with.
- **Persistent tap marker across holes** — rejected; per-hole reset is the obvious mental model and avoids stale-marker confusion.

---

## 8. Risks

- **Android Google Maps API key management.** Production key needs platform/package restrictions; leakage risks billing surprises. Mitigation: EAS secrets, key restrictions, monitor in Google Cloud Console.
- **Battery drain.** Map + GPS at 10s interval is fine but verify under sustained 18-hole use.
- **Coverage gap UX.** If Phase B ships before coverage is broadly populated, "Social tier" upsell looks broken on many courses. Mitigation: per-course gate plus `useCoordinateBackfill()` autotrigger on first map open.
- **GolfAPI.io coordinate quality.** Backfill data is only as good as upstream; spot-checks needed during Phase A QA.

---

## Appendix A — Coverage SQL

### A.1 Course-level coverage

```sql
SELECT
  COUNT(*) FILTER (WHERE hc.course_id IS NOT NULL) AS courses_with_coords,
  COUNT(*) AS total_courses,
  ROUND(100.0 * COUNT(*) FILTER (WHERE hc.course_id IS NOT NULL) / NULLIF(COUNT(*), 0), 1) AS pct
FROM courses c
LEFT JOIN (SELECT DISTINCT course_id FROM hole_coordinates) hc ON hc.course_id = c.id;
```

### A.2 Per-course completeness (top 20 most-complete)

```sql
SELECT c.id, c.name,
       COUNT(DISTINCT hc.hole_number) AS holes_with_any_coord,
       c.num_holes
FROM courses c
LEFT JOIN hole_coordinates hc ON hc.course_id = c.id
GROUP BY c.id, c.name, c.num_holes
ORDER BY holes_with_any_coord DESC
LIMIT 20;
```

### A.3 POI-type coverage (per hole)

```sql
SELECT poi_type, COUNT(*) AS rows, COUNT(DISTINCT (course_id, hole_number)) AS distinct_holes
FROM hole_coordinates
GROUP BY poi_type
ORDER BY rows DESC;
```

---

## Appendix B — File touch list (Phase A)

**New:**

- `src/screens/scorecard/HoleMapScreen.tsx`
- `src/components/scorecard/HoleMap/MapHeader.tsx`
- `src/components/scorecard/HoleMap/UserMarker.tsx`
- `src/components/scorecard/HoleMap/PinMarker.tsx`
- `src/components/scorecard/HoleMap/TapMarker.tsx`
- `src/components/scorecard/HoleMap/DistanceLine.tsx`
- `src/components/scorecard/HoleMap/MapMarkerSet.tsx`
- `src/components/scorecard/HoleMap/NoCoordinatesFallback.tsx`
- `src/hooks/coordinates/useHoleMapMarkers.ts`
- `src/hooks/subscription/useMapTier.ts`

**Modified:**

- `src/components/scorecard/HoleHeader/DistanceToPin.tsx` — wrap in `<Pressable>`, dispatch navigation
- `src/navigation/types.ts` — add `HoleMap` route
- `src/navigation/<scorecard navigator>` — register modal route
- `src/store/settingsStore.ts` — add `enableHoleMap` flag
- `app.json` — add Android Google Maps API key config
- `package.json` — add `react-native-maps`
- `docs/guides/SUBSCRIPTION_TIERS.md` — note that distance-to-pin badge is Free; map content tiered

---
