# Auto-tracked Bunker Shots — Design

**Status:** Approved (V1 scope)
**Date:** 2026-05-05
**Owner:** Sam
**Related:** Phase C1 (`hole_hazards`), Phase C2 (`shot_log`)

## 1. Problem

Players who track shots via GPS in the score-entry screen want their bunker shots auto-counted, and their **sand-save %** (PGA-style) derived automatically. Manual bunker tagging is tedious and gets skipped, so bunker stats today are unreliable.

## 2. Goal (V1)

When a player logs a shot whose GPS coordinates fall inside a known bunker polygon for that hole, the shot is automatically marked `from_bunker = true`. From that flag, sand-save % is derived for stats display.

V1 ships **polygon-only auto-detect.** No heuristic prompt fallback. No fairway/rough/green polygons. No new screens.

## 3. Non-goals

- **Heuristic prompt fallback** — deferred to V2 pending real-world miss-rate measurement on the V1 polygon-only path.
- **Lie classification beyond bunker/not-bunker** — fairway, rough, etc. are out of scope.
- **Manual bunker toggle on shot entry** — the existing edit-stats path remains the only manual override.
- **GPS-drift edge handling** — shot-edit Undo is the recovery affordance; we do not buffer polygons or do confidence scoring in V1.
- **Course-level bunker visualisation beyond existing HazardOverlay** — the hole map already renders polygons; no new chrome.
- **Refresh strategy for cached polygons** — polygons are ingested once at course import and never refreshed in V1.

## 4. User-visible outcome

1. After a shot is logged from inside a bunker polygon, the existing shot toast reads **"Bunker shot logged · Undo"** instead of "Shot logged · Undo".
2. The existing `BunkerStatsSection` gains a **Sand Save %** stat alongside the bunker count.
3. No new buttons. No new prompts. No tap added to the per-shot interaction.

## 5. Architecture

Three independent layers:

```
┌──────────────────────────────────────────────────────┐
│ 1. Polygon ingestion (one-shot, server-side)         │
│    OSM Overpass per-hole bbox → hole_hazards table   │
│    Triggered: at course import time                  │
└──────────────────────────────────────────────────────┘
                         │
                         ▼
┌──────────────────────────────────────────────────────┐
│ 2. Detection (per shot, server-side)                 │
│    BEFORE INSERT trigger on shot_log                 │
│    PostGIS ST_Contains → sets NEW.from_bunker        │
└──────────────────────────────────────────────────────┘
                         │
                         ▼
┌──────────────────────────────────────────────────────┐
│ 3. Stats derivation (read-time)                      │
│    v_sand_saves view aggregates consecutive shots    │
│    Consumed by BunkerStatsSection                    │
└──────────────────────────────────────────────────────┘
```

Each layer is independently testable. No write-time computation of sand-save events; the view derives them from raw `shot_log` rows on demand.

## 6. Data model

### 6.1 New column on `shot_log`

```sql
ALTER TABLE shot_log
  ADD COLUMN from_bunker BOOLEAN NOT NULL DEFAULT false;

COMMENT ON COLUMN shot_log.from_bunker IS
  'True when the shot origin GPS point lies inside a hole_hazards bunker polygon for this round''s course+hole. Set automatically by the shot_log_detect_bunker BEFORE INSERT trigger.';
```

No backfill of existing `shot_log` rows in V1. New shots from this point forward get tagged; historical shots stay `false`.

### 6.2 Detection trigger

```sql
CREATE OR REPLACE FUNCTION shot_log_detect_bunker()
RETURNS TRIGGER AS $$
DECLARE
  v_course_id UUID;
BEGIN
  -- Resolve course via the round. Standalone rounds without a course are no-ops.
  SELECT course_id INTO v_course_id FROM rounds WHERE id = NEW.round_id;
  IF v_course_id IS NULL THEN
    RETURN NEW;
  END IF;

  IF EXISTS (
    SELECT 1
    FROM hole_hazards
    WHERE course_id   = v_course_id
      AND hole_number = NEW.hole_number
      AND hazard_type = 'bunker'
      AND ST_Contains(
            polygon::geometry,
            ST_SetSRID(ST_MakePoint(NEW.longitude, NEW.latitude), 4326)
          )
    LIMIT 1
  ) THEN
    NEW.from_bunker := true;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER shot_log_detect_bunker_bef_ins
  BEFORE INSERT ON shot_log
  FOR EACH ROW
  EXECUTE FUNCTION shot_log_detect_bunker();
```

`SECURITY DEFINER` is needed so the trigger can read `hole_hazards` even though the inserting user has no direct read access to that table (RLS-restricted to the polygon overlay use-case via separate select policy).

### 6.3 Sand-save derivation view

PGA-style sand save: a `from_bunker = true` shot whose subsequent stroke landed on/near the green AND was the final stroke before holing out (i.e., one putt or hole-out).

Approach: per (round, hole, player), order shots by `sequence`. For each `from_bunker` shot at sequence N, the sand save fires iff:

1. A shot at sequence N+1 exists, lands within ~10m of the hole's `green_center` coordinate (using `hole_coordinates` table), AND
2. Either the hole is finalised at sequence N+1 (no further shots — implies hole-out), OR exactly one further shot at sequence N+2 exists and the player's recorded stroke count for that hole equals N+2.

```sql
CREATE OR REPLACE VIEW v_sand_saves AS
WITH shot_chain AS (
  SELECT
    s.id,
    s.round_id,
    s.hole_number,
    s.player_id,
    s.sequence,
    s.from_bunker,
    s.location,
    LEAD(s.location, 1) OVER w AS next_location,
    LEAD(s.sequence, 1) OVER w AS next_seq,
    COUNT(*) OVER w_grp        AS total_shots
  FROM shot_log s
  WINDOW
    w     AS (PARTITION BY s.round_id, s.hole_number, s.player_id ORDER BY s.sequence),
    w_grp AS (PARTITION BY s.round_id, s.hole_number, s.player_id)
),
green_centers AS (
  SELECT
    course_id,
    hole_number,
    location AS green_location
  FROM hole_coordinates
  WHERE poi_type = 'green_center'
)
SELECT
  sc.id          AS bunker_shot_id,
  sc.round_id,
  sc.hole_number,
  sc.player_id,
  TRUE           AS is_sand_save
FROM shot_chain sc
JOIN rounds r        ON r.id = sc.round_id
JOIN green_centers gc
  ON gc.course_id = r.course_id AND gc.hole_number = sc.hole_number
WHERE sc.from_bunker = true
  AND sc.next_location IS NOT NULL
  -- Next shot is on/near the green
  AND ST_DWithin(sc.next_location, gc.green_location, 10)
  -- Bunker shot was within 2 strokes of the final stroke (PGA: 1 putt max after escape)
  AND sc.total_shots - sc.sequence <= 2;
```

The view returns one row per sand save. Aggregation (e.g., "sand saves per player per round") happens at the consumption layer.

**Sand save attempt count** (denominator for %): a `from_bunker = true` shot that was greenside — meaning the player's *next* shot landed on or near the green. This includes both successful saves and missed saves (e.g., 2-putt bogeys after escape). Bunker shots that didn't reach the green (chunked, fairway-bunker punch-out short of the green, etc.) are excluded from the denominator — by PGA convention they aren't sand-save opportunities.

```sql
CREATE OR REPLACE VIEW v_sand_save_attempts AS
WITH shot_chain AS (
  SELECT
    s.id,
    s.round_id,
    s.hole_number,
    s.player_id,
    s.sequence,
    s.from_bunker,
    LEAD(s.location, 1) OVER (
      PARTITION BY s.round_id, s.hole_number, s.player_id ORDER BY s.sequence
    ) AS next_location
  FROM shot_log s
),
green_centers AS (
  SELECT course_id, hole_number, location AS green_location
  FROM hole_coordinates
  WHERE poi_type = 'green_center'
)
SELECT
  sc.id        AS bunker_shot_id,
  sc.round_id,
  sc.hole_number,
  sc.player_id,
  TRUE         AS is_attempt
FROM shot_chain sc
JOIN rounds r        ON r.id = sc.round_id
JOIN green_centers gc
  ON gc.course_id = r.course_id AND gc.hole_number = sc.hole_number
WHERE sc.from_bunker = true
  AND sc.next_location IS NOT NULL
  AND ST_DWithin(sc.next_location, gc.green_location, 10);
```

Note: a successful sand save is always also an attempt — the attempt view's WHERE clause is a strict subset of the save view's preconditions. `v_sand_saves` rows are guaranteed to have a matching row in `v_sand_save_attempts` joined by `bunker_shot_id`.

`Sand save % = COUNT(v_sand_saves) / COUNT(v_sand_save_attempts) * 100` for any (player, round, …) scope.

**Edge case:** if `hole_coordinates` has no `green_center` for a hole (course not fully imported), neither view returns rows for that hole's bunker shots. The bunker shot is still counted in the bunker-count stat (which derives from `from_bunker` directly), but it doesn't contribute to sand save %. Acceptable — these are courses with incomplete data anyway.

## 7. OSM polygon ingestion

### 7.1 Why this is the biggest piece of V1

`useHazardBackfill` is a stub today. There is no edge function or admin script that actually writes to `hole_hazards`. V1 must build this end-to-end or there will be no polygons and the detection trigger will never fire.

### 7.2 Approach: Supabase Edge Function `ingest-course-hazards`

A new edge function in `supabase/functions/ingest-course-hazards/index.ts`:

- **Input:** `{ courseId: string }`
- **Auth:** invoked with service-role key (server-to-server only) OR by an authenticated admin user; not callable by regular clients
- **Logic per hole** — iterate over every hole that has both `tee_back` and `green_center` rows in `hole_coordinates` for the given course. Holes missing either are skipped (logged as warnings; do not fail the whole ingestion).
  1. Read tee_back + green_center coordinates from `hole_coordinates`
  2. Build a per-hole bbox padded by ~40m
  3. Call the Overpass fetcher (port `src/services/hazards/osmHazards.ts` to Deno or inline the HTTP call — it's plain `fetch`)
  4. Upsert each returned polygon into `hole_hazards` with `course_id, hole_number, hazard_type, polygon, source='osm', external_id` — using the existing `(course_id, hole_number, hazard_type, external_id)` unique index for idempotency
- **Throttling:** 18 sequential Overpass calls per course with a 200ms gap between calls keeps us well within Overpass fair-use (~10k/IP/day). No retry on Overpass 429 — log and move on; the next ingest will pick up missed holes.

### 7.3 Trigger points

- **Eager:** `importCourse` (in `src/services/courses/courseService/import.ts`) fires the edge function as a fire-and-forget after `importCoordinates` succeeds. Course creation is not blocked — polygons populate in the background within 30–60s.
- **Backfill:** rewrite `src/hooks/hazards/backfill.ts` from a no-op stub to actually invoke the edge function when a hole has zero hazards cached. Triggered from `HoleMapScreen` on first open. Idempotent — a course that already has polygons is a no-op.

### 7.4 Why per-hole bbox over whole-course

A whole-course bbox returns one big list of polygons that we'd then have to assign to holes (closest tee-to-green centerline). Per-hole queries return polygons already scoped to a hole — `hole_number` falls out of the input, not classification. Eighteen Overpass queries vs. one is acceptable: each query is small and the API supports it.

## 8. UI changes

### 8.1 Shot toast

`useShotLoggingUiStore.showToast` is invoked from `LogShotInline.onSuccess`. Today the rendered toast computes its text from `sequence` and `holeNumber`. Change required:

- Pass `from_bunker` from the shot row through to the store
- When `from_bunker === true`, render the toast as **"Bunker shot logged · Undo"** instead of the default "Shot logged · Undo"

The Undo affordance is unchanged; deleting an auto-tagged bunker shot deletes the row, which clears `from_bunker` along with everything else.

### 8.2 BunkerStatsSection

Existing component at `src/components/statistics/BunkerStatsSection.tsx`. Adds one row:

- **Sand Save %** — derived from `v_sand_saves` and `v_sand_save_attempts` joined by `bunker_shot_id`
- Display format: `64% (7/11)` — same percentage style as existing GIR / fairway stats

A new TanStack Query hook `useSandSaveStats(playerId)` fetches the aggregate. Query key: `['stats', 'sandSave', playerId]`.

### 8.3 No other UI changes

No new screens, no new modal, no new toggle, no new icon. The feature is silent in the no-bunker case.

## 9. Offline behaviour

`useLogShot` posts directly to Supabase. The detection trigger only fires server-side on actual insert. Implications:

- **Online:** server returns the inserted row with `from_bunker` already set. Toast reflects this. ~200ms latency same as today.
- **Offline:** today, `useLogShot` simply errors offline (per `mutations.ts` — no offline queue). That's existing behaviour and unchanged. When/if shot logging gets offline-queued in a future phase, the trigger fires on sync — `from_bunker` is correctly set, but the original toast feedback at the time of the shot would not reflect bunker status. Acceptable: stats accuracy is preserved.

No client-side polygon caching needed for V1.

## 10. Component / file inventory

### Files added

| Path | Purpose |
|---|---|
| `supabase/migrations/20260505000000_add_shot_log_from_bunker.sql` | Column + trigger |
| `supabase/migrations/20260505000001_create_sand_save_views.sql` | Two views |
| `supabase/functions/ingest-course-hazards/index.ts` | OSM → hole_hazards |
| `supabase/functions/ingest-course-hazards/overpass.ts` | Inline Overpass fetcher (Deno-compatible) |
| `src/hooks/queries/useSandSaveStats.ts` | TanStack hook for stats |

### Files modified

| Path | Change |
|---|---|
| `src/hooks/hazards/backfill.ts` | Replace no-op stub with edge-function invoker |
| `src/services/courses/courseService/import.ts` | Fire-and-forget hazard ingestion after coordinates import |
| `src/store/shotLoggingUiStore.ts` | Toast text variant for `from_bunker` |
| `src/components/scorecard/ShotLogging/LogShotInline.tsx` | Pass `from_bunker` from inserted shot to toast |
| `src/components/statistics/BunkerStatsSection.tsx` | Add Sand Save % row |
| `src/types/database/shotLog.types.ts` | Add `from_bunker: boolean` to `ShotLogEntry` |

### Files unchanged but verified compatible

- `src/services/hazards/osmHazards.ts` — Deno-compatible logic; reused conceptually in the edge function (or imported via a shared shape if Deno tooling allows)
- `src/components/scorecard/HoleMap/HazardOverlay.tsx` — already renders bunker polygons once they exist
- `src/hooks/hazards/queries.ts` — already reads `hole_hazards` correctly

## 11. Testing strategy

**Unit (Postgres):** SQL migration test covering:
- Shot inserted with no polygon → `from_bunker = false`
- Shot inserted with point inside bunker polygon → `from_bunker = true`
- Shot inserted with point outside polygon but within course bbox → `from_bunker = false`
- Standalone round (no `course_id`) → no error, `from_bunker = false`
- Polygon for different hole → `from_bunker = false`

**Unit (view):** synthetic shot sequences exercising:
- Bunker → green → 1 putt → sand save fires
- Bunker → green → 2 putts → no sand save
- Bunker → not green → no sand save
- Bunker hole-out (sequence N is final) → sand save fires
- Two bunker shots in a row → only the last counts toward attempt

**Unit (TS):** `useSandSaveStats` hook query-key + return shape

**Integration (manual, V1):** ingest a known sandbelt course (e.g., Kingston Heath via the existing club ID `141520610397251566`), score a round through a bunker, verify the toast and stats.

**E2E:** none for V1 — too dependent on real OSM data.

## 12. Risks & mitigations

| Risk | Mitigation |
|---|---|
| OSM bunker coverage variance — rural Aussie courses may have zero polygons | Acceptable for V1. Measure miss-rate in production; V2 prompt fallback if material. |
| Overpass rate limits on bulk re-imports | 200ms inter-hole delay; only fire on first import or explicit backfill. |
| Bunker polygon spans two holes (shared boundary bunker) | Per-hole bbox query duplicates that polygon under both holes — acceptable; the trigger's existence check is correct either way. |
| GPS drift mis-classifies edge shots | Existing toast Undo is the affordance. Acceptable accuracy for V1. |
| Edge function timeout on 18 sequential Overpass calls | Function does not need to be synchronous to anything — fire-and-forget. If it times out, the backfill path picks up missing holes on next map open. |
| `hole_coordinates` missing for the course | Skip ingestion for that course entirely; log warning. No detection until coordinates are imported. |
| `SECURITY DEFINER` trigger reading `hole_hazards` could be a permission escalation if abused | Trigger is locked to `BEFORE INSERT ON shot_log`, only reads (does not write hole_hazards), and can only be invoked via legitimate shot inserts (which are RLS-gated). Low risk. |

## 13. Open questions resolved during design

| Question | Resolution |
|---|---|
| Auto-detect vs. always-prompt | Silent auto when polygon exists; nothing when it doesn't (V1). |
| Sand-save scope (PGA vs. recreational) | PGA-style (greenside-only, ≤ 1 putt after escape). |
| Polygon source (GolfAPI vs. OSM) | OSM only. GolfAPI hazard POI is a sparse point, not a polygon. |
| Per-course vs. per-hole bbox | Per-hole. Sidesteps polygon-to-hole assignment. |
| Where does ingestion run | New Supabase Edge Function. The existing `useHazardBackfill` stub is rewritten to invoke it. |
| Refresh strategy for polygons | None in V1. One-shot ingest at course import. |

## 14. Migration / rollout

1. Deploy migrations (column + trigger + views) — backwards-compatible; existing shots get `false`.
2. Deploy edge function `ingest-course-hazards`.
3. Deploy app build with toast variant + sand save % stat.
4. Run the edge function manually for the top ~20 most-played sandbelt courses to seed coverage before users encounter the feature.
5. Wire `importCourse` to fire-and-forget the edge function for new course imports.
6. Wire `useHazardBackfill` to invoke the edge function when a hole opens with zero hazards.

The feature flips on without an explicit user-facing toggle; the only visible change is when bunker shots happen, and that's intentional.

## 15. V2+ roadmap (informational, not in scope)

- Heuristic prompt fallback when polygons missing
- Manual override toggle in the shot-edit modal
- Crowdsourced bunker polygon contributions (admin-curated from confirmed bunker shots in unmapped areas)
- Refresh strategy for cached OSM polygons (e.g., once-yearly per course)
- Fairway / rough lie classification (large scope expansion — separate spec)
