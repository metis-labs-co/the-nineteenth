# Auto-tracked Bunker Shots Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Auto-tag GPS-logged shots whose origin falls inside a known bunker polygon, and derive PGA-style sand-save % from the resulting `from_bunker` flag.

**Architecture:** Three independent layers — (1) OSM polygon ingestion via a new Supabase Edge Function writing to existing `hole_hazards` table; (2) Postgres `BEFORE INSERT` trigger on `shot_log` doing PostGIS `ST_Contains`; (3) two SQL views derive sand saves and attempts from raw `shot_log` rows, consumed by a new TanStack hook + existing `BunkerStatsSection`.

**Tech Stack:** PostgreSQL 15 + PostGIS, Supabase Edge Functions (Deno), TypeScript, React Native, TanStack Query, Zustand, Jest.

**Spec:** `docs/superpowers/specs/2026-05-05-auto-bunker-detection-design.md`

---

## File Inventory

**New files:**
- `supabase/migrations/20260505000000_add_shot_log_from_bunker.sql`
- `supabase/migrations/20260505000001_create_sand_save_views.sql`
- `supabase/tests/from_bunker_trigger_verify.sql` (manual verification script — not auto-run)
- `supabase/tests/sand_save_views_verify.sql` (manual verification script)
- `supabase/functions/ingest-course-hazards/index.ts`
- `supabase/functions/ingest-course-hazards/overpass.ts`
- `src/hooks/queries/useSandSaveStats.ts`
- `src/__tests__/hooks/queries/useSandSaveStats.test.tsx`

**Modified files:**
- `src/types/database/shotLog.types.ts` — add `from_bunker` field
- `src/store/shotLoggingUiStore.ts` — extend store with `lastFromBunker`
- `src/__tests__/store/shotLogging.test.ts` — extend store tests
- `src/components/scorecard/ShotLogging/InlineShotToast.tsx` — variant copy
- `src/components/scorecard/ShotLogging/LogShotUndoToast.tsx` — variant copy
- `src/components/scorecard/ShotLogging/LogShotInline.tsx` — pass `from_bunker` to toast
- `src/hooks/playerStatistics/types.ts` — extend `BunkerStats` with sand-save fields
- `src/components/statistics/BunkerStatsSection.tsx` — add Sand Save row
- `src/hooks/hazards/backfill.ts` — replace stub with edge-function invoker
- `src/services/courses/courseService/import.ts` — fire-and-forget hazard ingestion

---

## Task 1: Migration — `from_bunker` column + detection trigger

**Files:**
- Create: `supabase/migrations/20260505000000_add_shot_log_from_bunker.sql`
- Create: `supabase/tests/from_bunker_trigger_verify.sql`

- [ ] **Step 1: Write the migration**

Create `supabase/migrations/20260505000000_add_shot_log_from_bunker.sql`:

```sql
-- =====================================================
-- ADD from_bunker TO shot_log + DETECTION TRIGGER
-- Auto-tag shots whose GPS origin lies inside a
-- hole_hazards bunker polygon for the same course+hole.
-- See: docs/superpowers/specs/2026-05-05-auto-bunker-detection-design.md
-- =====================================================

ALTER TABLE shot_log
  ADD COLUMN from_bunker BOOLEAN NOT NULL DEFAULT false;

COMMENT ON COLUMN shot_log.from_bunker IS
  'True when the shot origin GPS point lies inside a hole_hazards bunker polygon for this round''s course+hole. Set automatically by the shot_log_detect_bunker BEFORE INSERT trigger.';

-- =====================================================
-- DETECTION TRIGGER FUNCTION
-- SECURITY DEFINER so it can read hole_hazards even
-- though hole_hazards has no client-facing INSERT/SELECT
-- escalation surface — this trigger only reads.
-- =====================================================

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

- [ ] **Step 2: Write the verification SQL**

Create `supabase/tests/from_bunker_trigger_verify.sql`:

```sql
-- Manual verification for the from_bunker trigger.
-- Run with: psql "$LOCAL_DB_URL" -f supabase/tests/from_bunker_trigger_verify.sql
-- All assertions are wrapped in a ROLLBACK so the DB stays clean.

BEGIN;

-- Setup synthetic course/hole/round/player data
INSERT INTO clubs (id, name) VALUES ('00000000-0000-0000-0000-000000000001', 'Test Club');
INSERT INTO courses (id, club_id, name) VALUES
  ('00000000-0000-0000-0000-000000000002', '00000000-0000-0000-0000-000000000001', 'Test Course');
INSERT INTO players (id, name) VALUES ('00000000-0000-0000-0000-000000000003', 'Test Player');
INSERT INTO rounds (id, course_id, status, created_by)
  VALUES ('00000000-0000-0000-0000-000000000004',
          '00000000-0000-0000-0000-000000000002',
          'in-progress',
          '00000000-0000-0000-0000-000000000003');

-- Synthetic bunker polygon at (-37.95, 144.95) ± 0.0005 deg (~50m square)
INSERT INTO hole_hazards (course_id, hole_number, hazard_type, polygon, source, external_id)
VALUES (
  '00000000-0000-0000-0000-000000000002',
  1,
  'bunker',
  ST_GeogFromText('SRID=4326;POLYGON((144.9495 -37.9505, 144.9505 -37.9505, 144.9505 -37.9495, 144.9495 -37.9495, 144.9495 -37.9505))'),
  'osm',
  'verify-test-1'
);

-- Test 1: shot inside bunker → from_bunker = true
INSERT INTO shot_log (round_id, hole_number, player_id, sequence, latitude, longitude)
VALUES ('00000000-0000-0000-0000-000000000004', 1,
        '00000000-0000-0000-0000-000000000003', 1,
        -37.9500, 144.9500);

DO $$
DECLARE v_result BOOLEAN;
BEGIN
  SELECT from_bunker INTO v_result FROM shot_log WHERE sequence = 1;
  ASSERT v_result = true, 'Test 1 FAILED: shot inside polygon should have from_bunker=true';
  RAISE NOTICE 'Test 1 PASSED: shot inside polygon → from_bunker=true';
END $$;

-- Test 2: shot outside bunker → from_bunker = false
INSERT INTO shot_log (round_id, hole_number, player_id, sequence, latitude, longitude)
VALUES ('00000000-0000-0000-0000-000000000004', 1,
        '00000000-0000-0000-0000-000000000003', 2,
        -37.9600, 144.9600);

DO $$
DECLARE v_result BOOLEAN;
BEGIN
  SELECT from_bunker INTO v_result FROM shot_log WHERE sequence = 2;
  ASSERT v_result = false, 'Test 2 FAILED: shot outside polygon should have from_bunker=false';
  RAISE NOTICE 'Test 2 PASSED: shot outside polygon → from_bunker=false';
END $$;

-- Test 3: shot for different hole → from_bunker = false (polygon is on hole 1)
INSERT INTO shot_log (round_id, hole_number, player_id, sequence, latitude, longitude)
VALUES ('00000000-0000-0000-0000-000000000004', 2,
        '00000000-0000-0000-0000-000000000003', 1,
        -37.9500, 144.9500);

DO $$
DECLARE v_result BOOLEAN;
BEGIN
  SELECT from_bunker INTO v_result FROM shot_log
    WHERE hole_number = 2 AND sequence = 1;
  ASSERT v_result = false, 'Test 3 FAILED: cross-hole polygon should not match';
  RAISE NOTICE 'Test 3 PASSED: polygon scoped to hole_number';
END $$;

-- Test 4: round with NULL course_id → no error, from_bunker = false
INSERT INTO rounds (id, course_id, status, created_by)
  VALUES ('00000000-0000-0000-0000-000000000005', NULL, 'in-progress',
          '00000000-0000-0000-0000-000000000003');

INSERT INTO shot_log (round_id, hole_number, player_id, sequence, latitude, longitude)
VALUES ('00000000-0000-0000-0000-000000000005', 1,
        '00000000-0000-0000-0000-000000000003', 1,
        -37.9500, 144.9500);

DO $$
DECLARE v_result BOOLEAN;
BEGIN
  SELECT from_bunker INTO v_result FROM shot_log
    WHERE round_id = '00000000-0000-0000-0000-000000000005';
  ASSERT v_result = false, 'Test 4 FAILED: standalone round trigger should no-op';
  RAISE NOTICE 'Test 4 PASSED: standalone round (NULL course_id) no-ops cleanly';
END $$;

ROLLBACK;
```

> **Note:** the `rounds` and `players` table column names in the inserts above (`status`, `created_by`, `name`) reflect what's expected. If the live schema has different required columns (e.g., extra NOT NULL fields), the engineer will need to add minimal stubs to make the inserts succeed. The trigger logic is what's being verified.

- [ ] **Step 3: Apply the migration locally**

Run:

```bash
supabase db reset
```

Expected: all migrations apply, including the new one. No errors.

- [ ] **Step 4: Run the verification script**

Run:

```bash
psql "$(supabase status --output json | jq -r '.DB_URL')" \
  -f supabase/tests/from_bunker_trigger_verify.sql
```

Expected output: 4 `NOTICE: Test N PASSED` lines, then `ROLLBACK`. No `ASSERT FAILED`.

- [ ] **Step 5: Commit**

```bash
git add supabase/migrations/20260505000000_add_shot_log_from_bunker.sql \
        supabase/tests/from_bunker_trigger_verify.sql
git commit -m "$(cat <<'EOF'
feat(db): add shot_log.from_bunker + detection trigger

BEFORE INSERT trigger does PostGIS ST_Contains against hole_hazards
bunker polygons for the same course+hole, sets NEW.from_bunker = true
on match. SECURITY DEFINER so it can read hole_hazards regardless of
caller's role.

Verification SQL covers: in-polygon, out-of-polygon, cross-hole,
NULL course_id (standalone round) cases.

Spec: docs/superpowers/specs/2026-05-05-auto-bunker-detection-design.md
EOF
)"
```

---

## Task 2: Migration — sand-save views

**Files:**
- Create: `supabase/migrations/20260505000001_create_sand_save_views.sql`
- Create: `supabase/tests/sand_save_views_verify.sql`

- [ ] **Step 1: Write the migration**

Create `supabase/migrations/20260505000001_create_sand_save_views.sql`:

```sql
-- =====================================================
-- SAND-SAVE DERIVATION VIEWS
-- Pure-derived views over shot_log + hole_coordinates.
-- PGA-style: greenside bunker shot, holed within ≤ 1 putt.
-- See: docs/superpowers/specs/2026-05-05-auto-bunker-detection-design.md §6.3
-- =====================================================

-- A successful sand save: bunker shot whose next shot landed on/near
-- the green AND the hole was finished within 2 strokes total after the
-- bunker shot (i.e., bunker → green → ≤ 1 putt, or bunker → hole-out).
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
    COUNT(*) OVER w_grp        AS total_shots
  FROM shot_log s
  WINDOW
    w     AS (PARTITION BY s.round_id, s.hole_number, s.player_id ORDER BY s.sequence),
    w_grp AS (PARTITION BY s.round_id, s.hole_number, s.player_id)
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
  TRUE         AS is_sand_save
FROM shot_chain sc
JOIN rounds r        ON r.id = sc.round_id
JOIN green_centers gc
  ON gc.course_id = r.course_id AND gc.hole_number = sc.hole_number
WHERE sc.from_bunker = true
  AND sc.next_location IS NOT NULL
  AND ST_DWithin(sc.next_location, gc.green_location, 10)
  AND sc.total_shots - sc.sequence <= 2;

COMMENT ON VIEW v_sand_saves IS
  'PGA-style sand saves: bunker shot whose next shot reached the green AND was within 2 strokes of the final stroke. One row per save.';

-- A sand-save attempt: bunker shot whose next shot landed on/near
-- the green (regardless of putts after — includes missed saves).
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

COMMENT ON VIEW v_sand_save_attempts IS
  'Sand-save attempts: bunker shot whose next shot reached the green. Denominator for sand-save %. Successful saves are a strict subset.';
```

- [ ] **Step 2: Write the verification SQL**

Create `supabase/tests/sand_save_views_verify.sql`:

```sql
-- Manual verification for v_sand_saves and v_sand_save_attempts.
-- Run with: psql "$LOCAL_DB_URL" -f supabase/tests/sand_save_views_verify.sql

BEGIN;

INSERT INTO clubs (id, name) VALUES ('00000000-0000-0000-0000-000000000010', 'V Club');
INSERT INTO courses (id, club_id, name) VALUES
  ('00000000-0000-0000-0000-000000000011', '00000000-0000-0000-0000-000000000010', 'V Course');
INSERT INTO players (id, name) VALUES ('00000000-0000-0000-0000-000000000012', 'V Player');

-- Green center at (-37.95, 144.95)
INSERT INTO hole_coordinates (course_id, hole_number, poi_type, latitude, longitude)
VALUES ('00000000-0000-0000-0000-000000000011', 1, 'green_center', -37.95, 144.95);

-- Round 1: bunker → green → 1 putt → SAND SAVE
INSERT INTO rounds (id, course_id, status, created_by)
  VALUES ('00000000-0000-0000-0000-000000000020',
          '00000000-0000-0000-0000-000000000011', 'in-progress',
          '00000000-0000-0000-0000-000000000012');

-- Shot 1: from bunker (manually set since no polygon ingested in this test)
INSERT INTO shot_log (round_id, hole_number, player_id, sequence, latitude, longitude, from_bunker)
VALUES ('00000000-0000-0000-0000-000000000020', 1,
        '00000000-0000-0000-0000-000000000012', 1, -37.951, 144.951, true);
-- Shot 2: on green (within 10m of green_center)
INSERT INTO shot_log (round_id, hole_number, player_id, sequence, latitude, longitude)
VALUES ('00000000-0000-0000-0000-000000000020', 1,
        '00000000-0000-0000-0000-000000000012', 2, -37.95, 144.95);
-- Shot 3: hole out (still on green; total_shots=3, bunker at seq 1 → diff=2 ✓)
INSERT INTO shot_log (round_id, hole_number, player_id, sequence, latitude, longitude)
VALUES ('00000000-0000-0000-0000-000000000020', 1,
        '00000000-0000-0000-0000-000000000012', 3, -37.95, 144.95);

-- Round 2: bunker → green → 2 putts → MISSED SAVE (attempt counts, save doesn't)
INSERT INTO rounds (id, course_id, status, created_by)
  VALUES ('00000000-0000-0000-0000-000000000021',
          '00000000-0000-0000-0000-000000000011', 'in-progress',
          '00000000-0000-0000-0000-000000000012');

INSERT INTO shot_log (round_id, hole_number, player_id, sequence, latitude, longitude, from_bunker)
VALUES ('00000000-0000-0000-0000-000000000021', 1,
        '00000000-0000-0000-0000-000000000012', 1, -37.951, 144.951, true);
INSERT INTO shot_log (round_id, hole_number, player_id, sequence, latitude, longitude)
VALUES ('00000000-0000-0000-0000-000000000021', 1,
        '00000000-0000-0000-0000-000000000012', 2, -37.95, 144.95);
INSERT INTO shot_log (round_id, hole_number, player_id, sequence, latitude, longitude)
VALUES ('00000000-0000-0000-0000-000000000021', 1,
        '00000000-0000-0000-0000-000000000012', 3, -37.95, 144.95);
INSERT INTO shot_log (round_id, hole_number, player_id, sequence, latitude, longitude)
VALUES ('00000000-0000-0000-0000-000000000021', 1,
        '00000000-0000-0000-0000-000000000012', 4, -37.95, 144.95);

-- Round 3: bunker → fairway (NOT green) → not on green → NEITHER attempt nor save
INSERT INTO rounds (id, course_id, status, created_by)
  VALUES ('00000000-0000-0000-0000-000000000022',
          '00000000-0000-0000-0000-000000000011', 'in-progress',
          '00000000-0000-0000-0000-000000000012');

INSERT INTO shot_log (round_id, hole_number, player_id, sequence, latitude, longitude, from_bunker)
VALUES ('00000000-0000-0000-0000-000000000022', 1,
        '00000000-0000-0000-0000-000000000012', 1, -37.951, 144.951, true);
-- 100m away — not on green
INSERT INTO shot_log (round_id, hole_number, player_id, sequence, latitude, longitude)
VALUES ('00000000-0000-0000-0000-000000000022', 1,
        '00000000-0000-0000-0000-000000000012', 2, -37.952, 144.952);

DO $$
DECLARE
  v_saves   INTEGER;
  v_attempts INTEGER;
BEGIN
  SELECT COUNT(*) INTO v_saves
    FROM v_sand_saves
   WHERE player_id = '00000000-0000-0000-0000-000000000012';
  SELECT COUNT(*) INTO v_attempts
    FROM v_sand_save_attempts
   WHERE player_id = '00000000-0000-0000-0000-000000000012';

  ASSERT v_saves = 1, format('Expected 1 sand save, got %s', v_saves);
  ASSERT v_attempts = 2, format('Expected 2 attempts, got %s', v_attempts);
  RAISE NOTICE 'PASSED: 1 save / 2 attempts (50%% sand save)';
END $$;

ROLLBACK;
```

- [ ] **Step 3: Apply the migration**

```bash
supabase migration up
```

Expected: migration applies cleanly. Two `CREATE VIEW` statements succeed.

- [ ] **Step 4: Run the verification script**

```bash
psql "$(supabase status --output json | jq -r '.DB_URL')" \
  -f supabase/tests/sand_save_views_verify.sql
```

Expected: `NOTICE: PASSED: 1 save / 2 attempts (50% sand save)` then `ROLLBACK`.

- [ ] **Step 5: Commit**

```bash
git add supabase/migrations/20260505000001_create_sand_save_views.sql \
        supabase/tests/sand_save_views_verify.sql
git commit -m "$(cat <<'EOF'
feat(db): add sand-save derivation views

v_sand_saves: PGA-style sand saves — bunker shot whose next shot
reached the green AND total strokes after bunker ≤ 2.
v_sand_save_attempts: bunker shot whose next shot reached the green
(regardless of putts). Denominator for sand-save %.

Verification covers: successful save, missed save (2-putt bogey),
non-greenside bunker shot (excluded from both views).
EOF
)"
```

---

## Task 3: Toast variant for bunker shots

**Files:**
- Modify: `src/types/database/shotLog.types.ts`
- Modify: `src/store/shotLoggingUiStore.ts`
- Modify: `src/__tests__/store/shotLogging.test.ts`
- Modify: `src/components/scorecard/ShotLogging/InlineShotToast.tsx`
- Modify: `src/components/scorecard/ShotLogging/LogShotUndoToast.tsx`
- Modify: `src/components/scorecard/ShotLogging/LogShotInline.tsx`

- [ ] **Step 1: Extend `ShotLogEntry` type**

In `src/types/database/shotLog.types.ts`, add `from_bunker` after `shot_type`:

```typescript
export interface ShotLogEntry {
  id: string;
  round_id: string;
  hole_number: number;
  player_id: string;
  sequence: number;

  latitude: number;
  longitude: number;

  club_used: string | null;
  shot_type: string | null;

  /** Set automatically by the shot_log_detect_bunker server-side trigger. */
  from_bunker: boolean;

  created_at: string;
  updated_at: string;
}
```

- [ ] **Step 2: Write failing tests for the store extension**

In `src/__tests__/store/shotLogging.test.ts`, append two tests inside the existing `describe('shotLoggingUiStore', …)` block:

```typescript
  it('showToast records lastFromBunker when fromBunker=true', () => {
    useShotLoggingUiStore.getState().showToast({
      shotId: 'shot-1',
      sequence: 1,
      roundId: 'r1',
      holeNumber: 7,
      fromBunker: true,
    });
    expect(useShotLoggingUiStore.getState().lastFromBunker).toBe(true);
  });

  it('lastFromBunker defaults to false when fromBunker not provided', () => {
    useShotLoggingUiStore.getState().showToast({
      shotId: 'shot-2',
      sequence: 2,
      roundId: 'r1',
      holeNumber: 7,
    });
    expect(useShotLoggingUiStore.getState().lastFromBunker).toBe(false);
  });
```

- [ ] **Step 3: Run the tests — verify they fail**

```bash
pnpm jest src/__tests__/store/shotLogging.test.ts
```

Expected: two new tests fail because `lastFromBunker` doesn't exist on the store.

- [ ] **Step 4: Extend the store**

Replace `src/store/shotLoggingUiStore.ts` with:

```typescript
/**
 * UI-state store for the shot-logging undo toast.
 *
 * Phase C2. The FAB writes the most recent shot id and a dismiss
 * deadline; LogShotUndoToast subscribes and renders accordingly.
 *
 * Auto-bunker (May 2026): toast can render a "Bunker shot logged" variant
 * when the inserted row's from_bunker flag is true.
 */

import { create } from 'zustand';

export type ShotToastVariant = 'success' | 'error';

interface ShotLoggingUiState {
  variant: ShotToastVariant;
  /** Most recent successfully logged shot id (for the Undo action). */
  lastShotId: string | null;
  /** Round + hole context for the undo mutation. */
  lastShotContext: { roundId: string; holeNumber: number } | null;
  /** Sequence number shown in the toast copy ("Shot N logged"). */
  lastSequence: number | null;
  /** True when the shot was auto-detected as originating from a bunker. */
  lastFromBunker: boolean;
  /** Free-form error message used when variant === 'error'. */
  errorMessage: string | null;
  /** Epoch ms when the toast should auto-dismiss. */
  dismissAt: number | null;

  showToast: (input: {
    shotId: string;
    sequence: number;
    roundId: string;
    holeNumber: number;
    fromBunker?: boolean;
    durationMs?: number;
  }) => void;
  showErrorToast: (input: { message: string; durationMs?: number }) => void;
  clearToast: () => void;
}

const DEFAULT_DURATION_MS = 5_000;
const ERROR_DURATION_MS = 6_000;

export const useShotLoggingUiStore = create<ShotLoggingUiState>((set) => ({
  variant: 'success',
  lastShotId: null,
  lastShotContext: null,
  lastSequence: null,
  lastFromBunker: false,
  errorMessage: null,
  dismissAt: null,

  showToast: ({ shotId, sequence, roundId, holeNumber, fromBunker, durationMs }) =>
    set({
      variant: 'success',
      lastShotId: shotId,
      lastShotContext: { roundId, holeNumber },
      lastSequence: sequence,
      lastFromBunker: fromBunker ?? false,
      errorMessage: null,
      dismissAt: Date.now() + (durationMs ?? DEFAULT_DURATION_MS),
    }),

  showErrorToast: ({ message, durationMs }) =>
    set({
      variant: 'error',
      lastShotId: null,
      lastShotContext: null,
      lastSequence: null,
      lastFromBunker: false,
      errorMessage: message,
      dismissAt: Date.now() + (durationMs ?? ERROR_DURATION_MS),
    }),

  clearToast: () =>
    set({
      variant: 'success',
      lastShotId: null,
      lastShotContext: null,
      lastSequence: null,
      lastFromBunker: false,
      errorMessage: null,
      dismissAt: null,
    }),
}));
```

- [ ] **Step 5: Run tests — verify they pass**

```bash
pnpm jest src/__tests__/store/shotLogging.test.ts
```

Expected: all tests pass.

- [ ] **Step 6: Update both toast renderers**

In `src/components/scorecard/ShotLogging/InlineShotToast.tsx`:

After the line `const lastSequence = useShotLoggingUiStore((s) => s.lastSequence);`, add:

```typescript
  const lastFromBunker = useShotLoggingUiStore((s) => s.lastFromBunker);
```

Change the message line from:

```typescript
        {isError ? errorMessage : `Shot ${lastSequence} logged`}
```

To:

```typescript
        {isError
          ? errorMessage
          : lastFromBunker
            ? `Bunker shot ${lastSequence} logged`
            : `Shot ${lastSequence} logged`}
```

Apply the **same two edits** to `src/components/scorecard/ShotLogging/LogShotUndoToast.tsx` — the file uses identical `lastSequence` reads and the same `Shot ${lastSequence} logged` literal.

- [ ] **Step 7: Pass `from_bunker` through `LogShotInline`**

In `src/components/scorecard/ShotLogging/LogShotInline.tsx`, locate the `onSuccess` block (around line 119–126):

```typescript
          onSuccess: (shot) => {
            showToast({
              shotId: shot.id,
              sequence: shot.sequence,
              roundId,
              holeNumber,
            });
          },
```

Change to:

```typescript
          onSuccess: (shot) => {
            showToast({
              shotId: shot.id,
              sequence: shot.sequence,
              roundId,
              holeNumber,
              fromBunker: shot.from_bunker,
            });
          },
```

- [ ] **Step 8: Run type-check + tests**

```bash
pnpm type-check && pnpm jest src/__tests__/store/shotLogging.test.ts
```

Expected: both pass. The `shot.from_bunker` property now resolves on `ShotLogEntry` (Step 1).

- [ ] **Step 9: Commit**

```bash
git add src/types/database/shotLog.types.ts \
        src/store/shotLoggingUiStore.ts \
        src/__tests__/store/shotLogging.test.ts \
        src/components/scorecard/ShotLogging/InlineShotToast.tsx \
        src/components/scorecard/ShotLogging/LogShotUndoToast.tsx \
        src/components/scorecard/ShotLogging/LogShotInline.tsx
git commit -m "$(cat <<'EOF'
feat(scoring): toast variant for auto-detected bunker shots

When the server returns a shot row with from_bunker=true (set by the
new shot_log_detect_bunker trigger), the inline + undo toasts read
'Bunker shot N logged' instead of 'Shot N logged'. Undo affordance
unchanged.
EOF
)"
```

---

## Task 4: Edge function — OSM bunker ingestion

**Files:**
- Create: `supabase/functions/ingest-course-hazards/index.ts`
- Create: `supabase/functions/ingest-course-hazards/overpass.ts`

- [ ] **Step 1: Write the Overpass fetcher (Deno)**

Create `supabase/functions/ingest-course-hazards/overpass.ts`:

```typescript
/**
 * OSM Overpass bunker fetcher (Deno port of src/services/hazards/osmHazards.ts).
 * Returns bunker polygons for a given bbox.
 */

const OVERPASS_ENDPOINT = 'https://overpass-api.de/api/interpreter';

export interface BBox {
  south: number;
  west: number;
  north: number;
  east: number;
}

export interface BunkerPolygon {
  /** [lng, lat] pairs forming a closed ring (first point repeated at end). */
  coordinates: Array<[number, number]>;
  /** OSM way id, used as external_id for idempotent upserts. */
  externalId: string;
}

interface OverpassWay {
  type: 'way';
  id: number;
  tags?: Record<string, string>;
  geometry?: Array<{ lat: number; lon: number }>;
}

interface OverpassResponse {
  elements: Array<{ type: string } & Record<string, unknown>>;
}

function buildBunkerQuery(bbox: BBox): string {
  const { south, west, north, east } = bbox;
  return `
    [out:json][timeout:25];
    way["golf"="bunker"](${south},${west},${north},${east});
    out geom;
  `.trim();
}

export async function fetchBunkers(bbox: BBox): Promise<BunkerPolygon[]> {
  const response = await fetch(OVERPASS_ENDPOINT, {
    method: 'POST',
    headers: { 'Content-Type': 'text/plain' },
    body: buildBunkerQuery(bbox),
  });

  if (!response.ok) {
    throw new Error(`Overpass HTTP ${response.status}`);
  }

  const json = (await response.json()) as OverpassResponse;
  const polygons: BunkerPolygon[] = [];

  for (const el of json.elements) {
    if (el.type !== 'way') continue;
    const way = el as unknown as OverpassWay;
    if (!way.geometry || way.geometry.length < 3) continue;

    const ring: Array<[number, number]> = way.geometry.map(
      ({ lat, lon }) => [lon, lat] as [number, number]
    );
    // Close the ring if Overpass didn't already
    const first = ring[0];
    const last = ring[ring.length - 1];
    if (first[0] !== last[0] || first[1] !== last[1]) {
      ring.push([first[0], first[1]]);
    }

    polygons.push({
      coordinates: ring,
      externalId: `osm/way/${way.id}`,
    });
  }

  return polygons;
}

/**
 * Build a per-hole bbox padded by ~40m around the tee→green segment.
 * Approx: 1° lat ≈ 111km, so 40m ≈ 0.00036°. Use 0.0005° (~55m) for safety.
 */
export function holeBBox(
  tee: { lat: number; lng: number },
  green: { lat: number; lng: number }
): BBox {
  const PAD = 0.0005;
  return {
    south: Math.min(tee.lat, green.lat) - PAD,
    north: Math.max(tee.lat, green.lat) + PAD,
    west:  Math.min(tee.lng, green.lng) - PAD,
    east:  Math.max(tee.lng, green.lng) + PAD,
  };
}
```

- [ ] **Step 2: Write the edge function entry point**

Create `supabase/functions/ingest-course-hazards/index.ts`:

```typescript
/**
 * Supabase Edge Function: ingest-course-hazards
 *
 * Fetches OSM bunker polygons for each hole of the given course and
 * upserts them into hole_hazards. Idempotent — repeated runs do not
 * create duplicates (uses unique index on
 * course_id, hole_number, hazard_type, external_id).
 *
 * Auth: requires service-role key. Not callable by regular clients.
 *
 * Request body: { courseId: string }
 * Response: { success: boolean, holesProcessed: number, polygonsUpserted: number, errors: string[] }
 *
 * See spec: docs/superpowers/specs/2026-05-05-auto-bunker-detection-design.md §7
 */

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.0';
import { fetchBunkers, holeBBox } from './overpass.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const INTER_HOLE_DELAY_MS = 200;

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function isServiceRole(authHeader: string | null): boolean {
  if (!authHeader || !authHeader.startsWith('Bearer ')) return false;
  const token = authHeader.substring(7);
  const serviceRole = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
  return Boolean(serviceRole) && token === serviceRole;
}

interface HoleCoord {
  hole_number: number;
  poi_type: string;
  latitude: number;
  longitude: number;
}

serve(async (req: Request): Promise<Response> => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  const jsonHeaders = { ...corsHeaders, 'Content-Type': 'application/json' };
  const errors: string[] = [];

  try {
    if (!isServiceRole(req.headers.get('Authorization'))) {
      return new Response(
        JSON.stringify({ success: false, errors: ['Unauthorized'] }),
        { status: 401, headers: jsonHeaders }
      );
    }

    const { courseId } = await req.json();
    if (!courseId || typeof courseId !== 'string') {
      return new Response(
        JSON.stringify({ success: false, errors: ['courseId required'] }),
        { status: 400, headers: jsonHeaders }
      );
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const serviceKey  = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase    = createClient(supabaseUrl, serviceKey);

    // Fetch tee_back + green_center coords for this course
    const { data: coords, error: coordsErr } = await supabase
      .from('hole_coordinates')
      .select('hole_number, poi_type, latitude, longitude')
      .eq('course_id', courseId)
      .in('poi_type', ['tee_back', 'green_center']);

    if (coordsErr) {
      return new Response(
        JSON.stringify({ success: false, errors: [`Coords query failed: ${coordsErr.message}`] }),
        { status: 500, headers: jsonHeaders }
      );
    }

    // Group by hole_number
    const byHole = new Map<number, { tee?: HoleCoord; green?: HoleCoord }>();
    for (const row of (coords as HoleCoord[]) ?? []) {
      const slot = byHole.get(row.hole_number) ?? {};
      if (row.poi_type === 'tee_back')     slot.tee   = row;
      if (row.poi_type === 'green_center') slot.green = row;
      byHole.set(row.hole_number, slot);
    }

    let holesProcessed = 0;
    let polygonsUpserted = 0;

    for (const [holeNumber, { tee, green }] of byHole.entries()) {
      if (!tee || !green) {
        errors.push(`hole ${holeNumber}: missing tee or green coords, skipped`);
        continue;
      }

      const bbox = holeBBox(
        { lat: tee.latitude,   lng: tee.longitude },
        { lat: green.latitude, lng: green.longitude }
      );

      try {
        const polygons = await fetchBunkers(bbox);

        for (const p of polygons) {
          const { error: upsertErr } = await supabase.from('hole_hazards').upsert(
            {
              course_id:   courseId,
              hole_number: holeNumber,
              hazard_type: 'bunker',
              polygon: {
                type: 'Polygon',
                coordinates: [p.coordinates],
              },
              source: 'osm',
              external_id: p.externalId,
            },
            { onConflict: 'course_id,hole_number,hazard_type,external_id' }
          );

          if (upsertErr) {
            errors.push(`hole ${holeNumber} upsert failed: ${upsertErr.message}`);
          } else {
            polygonsUpserted++;
          }
        }
        holesProcessed++;
      } catch (err) {
        errors.push(`hole ${holeNumber} Overpass failed: ${err instanceof Error ? err.message : String(err)}`);
      }

      await sleep(INTER_HOLE_DELAY_MS);
    }

    return new Response(
      JSON.stringify({ success: true, holesProcessed, polygonsUpserted, errors }),
      { status: 200, headers: jsonHeaders }
    );
  } catch (err) {
    return new Response(
      JSON.stringify({
        success: false,
        errors: [err instanceof Error ? err.message : 'Unknown error'],
      }),
      { status: 500, headers: jsonHeaders }
    );
  }
});
```

- [ ] **Step 3: Smoke-test the function locally**

Start the function:

```bash
supabase functions serve ingest-course-hazards --no-verify-jwt --env-file ./supabase/.env.local
```

In another terminal, find a courseId for a known sandbelt course:

```bash
psql "$(supabase status --output json | jq -r '.DB_URL')" -c \
  "SELECT id, name FROM courses WHERE name ILIKE '%kingston heath%' LIMIT 1;"
```

Invoke (replace `$COURSE_ID` and `$SERVICE_ROLE_KEY`):

```bash
curl -X POST "http://localhost:54321/functions/v1/ingest-course-hazards" \
  -H "Authorization: Bearer $SERVICE_ROLE_KEY" \
  -H "Content-Type: application/json" \
  -d "{\"courseId\": \"$COURSE_ID\"}"
```

Expected: response with `success: true`, `holesProcessed: 18`, `polygonsUpserted` ≥ 50 (sandbelt courses are bunker-rich).

Verify in DB:

```bash
psql "$(supabase status --output json | jq -r '.DB_URL')" -c \
  "SELECT hole_number, COUNT(*) FROM hole_hazards
   WHERE course_id = '$COURSE_ID' AND hazard_type = 'bunker'
   GROUP BY hole_number ORDER BY hole_number;"
```

Expected: rows for most holes (some may legitimately have 0 bunkers).

- [ ] **Step 4: Commit**

```bash
git add supabase/functions/ingest-course-hazards/
git commit -m "$(cat <<'EOF'
feat(functions): ingest-course-hazards edge function

Per-hole Overpass query for golf=bunker ways → upsert into
hole_hazards with source='osm'. Idempotent via the existing
(course_id, hole_number, hazard_type, external_id) unique index.
Service-role auth only.

200ms inter-hole delay keeps us well under Overpass fair-use limits
(~10k queries/IP/day).
EOF
)"
```

---

## Task 5: Backfill hook — invoke edge function

**Files:**
- Modify: `src/hooks/hazards/backfill.ts`
- Create: `src/__tests__/hooks/hazards/backfill.test.tsx`

- [ ] **Step 1: Write a failing test**

Create `src/__tests__/hooks/hazards/backfill.test.tsx`:

```typescript
import { renderHook, waitFor } from '@testing-library/react-native';
import { useHazardBackfill } from '@/hooks/hazards/backfill';

const mockInvoke = jest.fn();
jest.mock('@/services/supabase/client', () => ({
  supabase: {
    functions: {
      invoke: (...args: unknown[]) => mockInvoke(...args),
    },
  },
}));

describe('useHazardBackfill', () => {
  beforeEach(() => {
    mockInvoke.mockReset();
    mockInvoke.mockResolvedValue({ data: { success: true }, error: null });
  });

  it('returns wasAttempted=false when no courseId', () => {
    const { result } = renderHook(() => useHazardBackfill(undefined));
    expect(result.current.wasAttempted).toBe(false);
    expect(mockInvoke).not.toHaveBeenCalled();
  });

  it('invokes ingest-course-hazards with courseId', async () => {
    renderHook(() => useHazardBackfill('course-123'));
    await waitFor(() => {
      expect(mockInvoke).toHaveBeenCalledWith('ingest-course-hazards', {
        body: { courseId: 'course-123' },
      });
    });
  });

  it('invokes only once per courseId across re-renders', async () => {
    const { rerender } = renderHook(({ id }) => useHazardBackfill(id), {
      initialProps: { id: 'course-123' },
    });
    rerender({ id: 'course-123' });
    rerender({ id: 'course-123' });
    await waitFor(() => {
      expect(mockInvoke).toHaveBeenCalledTimes(1);
    });
  });
});
```

- [ ] **Step 2: Run test — verify it fails**

```bash
pnpm jest src/__tests__/hooks/hazards/backfill.test.tsx
```

Expected: tests fail because the stub returns `{ wasAttempted: false }` and never invokes.

- [ ] **Step 3: Implement the hook**

Replace `src/hooks/hazards/backfill.ts` with:

```typescript
/**
 * Hazard backfill orchestration.
 *
 * On first call for a given courseId, fires the ingest-course-hazards
 * Edge Function (server-side, service-role-authed). Idempotent on the
 * server: repeated upserts on the same (course, hole, external_id)
 * tuple are no-ops. We dedupe per-courseId on the client to avoid
 * spurious invocations across re-renders / multiple components mounting.
 */

import { useEffect, useRef, useState } from 'react';
import { supabase } from '@/services/supabase/client';

const inFlight = new Set<string>();

export interface UseHazardBackfillResult {
  /** Whether a backfill attempt has been made for this courseId. */
  wasAttempted: boolean;
}

export function useHazardBackfill(courseId?: string): UseHazardBackfillResult {
  const [wasAttempted, setWasAttempted] = useState(false);
  const startedFor = useRef<string | null>(null);

  useEffect(() => {
    if (!courseId) return;
    if (startedFor.current === courseId) return;
    if (inFlight.has(courseId)) {
      startedFor.current = courseId;
      setWasAttempted(true);
      return;
    }

    startedFor.current = courseId;
    inFlight.add(courseId);
    setWasAttempted(true);

    void supabase.functions
      .invoke('ingest-course-hazards', { body: { courseId } })
      .catch((err: unknown) => {
        // eslint-disable-next-line no-console
        console.warn('[useHazardBackfill] invoke failed', err);
      })
      .finally(() => {
        inFlight.delete(courseId);
      });
  }, [courseId]);

  return { wasAttempted };
}
```

- [ ] **Step 4: Run tests — verify they pass**

```bash
pnpm jest src/__tests__/hooks/hazards/backfill.test.tsx
```

Expected: all 3 tests pass.

- [ ] **Step 5: Commit**

```bash
git add src/hooks/hazards/backfill.ts src/__tests__/hooks/hazards/backfill.test.tsx
git commit -m "$(cat <<'EOF'
feat(hazards): wire backfill hook to ingest-course-hazards

Replaces the no-op stub with a real Edge Function invoker. Per-course
client-side dedupe prevents duplicate invokes across re-renders and
parallel mount points. Server-side idempotency is preserved by the
hole_hazards unique index, so a duplicate invoke would still be safe.
EOF
)"
```

---

## Task 6: Course import — fire-and-forget hazard ingestion

**Files:**
- Modify: `src/services/courses/courseService/import.ts`

- [ ] **Step 1: Add the ingestion call**

In `src/services/courses/courseService/import.ts`, locate the coordinates-import block in `importCourse` (around line 81–88):

```typescript
    // Import GPS coordinates (non-blocking - don't fail if coordinates unavailable)
    let coordinatesImported = 0;
    try {
      coordinatesImported = await importCoordinates(golfapiCourseId, course.id);
      if (coordinatesImported > 0) {
      }
    } catch (coordError) {
      logger.warn('Failed to import coordinates (non-blocking)', { error: coordError instanceof Error ? coordError.message : String(coordError) });
    }
```

Add a fire-and-forget hazard ingestion immediately after that block (before the `return`):

```typescript
    // Fire-and-forget OSM bunker ingestion. Runs server-side via
    // ingest-course-hazards Edge Function. Course creation is not blocked.
    if (coordinatesImported > 0) {
      void supabase.functions
        .invoke('ingest-course-hazards', { body: { courseId: course.id } })
        .catch((err: unknown) => {
          logger.warn('Hazard ingestion fire-and-forget failed', {
            error: err instanceof Error ? err.message : String(err),
          });
        });
    }
```

Add the import at the top of the file (alongside the other `@/services/...` imports):

```typescript
import { supabase } from '@/services/supabase/client';
```

Apply the same fire-and-forget block in `importClubWithCourses` after each per-course `importCoordinates` call (around line 198–202):

```typescript
            const coordCount = await importCoordinates(courseSummary.courseID, course.id);
            // coordCount used for debugging only
          } catch (coordError) {
```

Replace with:

```typescript
            const coordCount = await importCoordinates(courseSummary.courseID, course.id);
            if (coordCount > 0) {
              void supabase.functions
                .invoke('ingest-course-hazards', { body: { courseId: course.id } })
                .catch((err: unknown) => {
                  logger.warn('Hazard ingestion fire-and-forget failed', {
                    error: err instanceof Error ? err.message : String(err),
                  });
                });
            }
          } catch (coordError) {
```

- [ ] **Step 2: Type-check**

```bash
pnpm type-check
```

Expected: passes. The `supabase.functions.invoke` signature is well-typed.

- [ ] **Step 3: Run existing tests in this area**

```bash
pnpm jest src/__tests__/services/courses/ src/__tests__/services/api/
```

Expected: no regressions. (The fire-and-forget is gated by `coordinatesImported > 0`, so any tests that don't import coordinates won't trigger the call.)

- [ ] **Step 4: Commit**

```bash
git add src/services/courses/courseService/import.ts
git commit -m "$(cat <<'EOF'
feat(courses): fire-and-forget hazard ingestion at import

After coordinates land for a newly imported course, kick off the
ingest-course-hazards Edge Function in the background. Course
creation is not blocked; ingestion runs ~30-60s server-side and the
trigger picks up new bunker polygons for all subsequent shots.

Skipped when coordinatesImported=0 — no point querying Overpass with
no tee/green seed coords.
EOF
)"
```

---

## Task 7: Sand Save % — type, hook, UI row

**Files:**
- Modify: `src/hooks/playerStatistics/types.ts`
- Create: `src/hooks/queries/useSandSaveStats.ts`
- Create: `src/__tests__/hooks/queries/useSandSaveStats.test.tsx`
- Modify: `src/components/statistics/BunkerStatsSection.tsx`

- [ ] **Step 1: Extend `BunkerStats` type**

In `src/hooks/playerStatistics/types.ts`, replace the `BunkerStats` interface (lines 130–136) with:

```typescript
/**
 * Bunker aggregate statistics
 */
export interface BunkerStats {
  totalBunkerShots: number;
  holesWithBunkers: number;
  totalHolesTracked: number;
  averageBunkerShotsPerRound: number | null;
  holesWithBunkersPercentage: number | null;
  /** PGA-style sand saves (greenside bunker → ≤ 1 putt). Null when no attempts recorded. */
  sandSavePercentage: number | null;
  sandSaves: number;
  sandSaveAttempts: number;
}
```

Update both default-value sites to include the three new fields. In `src/hooks/playerStatistics/courseQueries.ts` line 485:

Change:

```typescript
    bunkerStats: { totalBunkerShots: 0, holesWithBunkers: 0, totalHolesTracked: 0, averageBunkerShotsPerRound: null, holesWithBunkersPercentage: null },
```

To:

```typescript
    bunkerStats: { totalBunkerShots: 0, holesWithBunkers: 0, totalHolesTracked: 0, averageBunkerShotsPerRound: null, holesWithBunkersPercentage: null, sandSavePercentage: null, sandSaves: 0, sandSaveAttempts: 0 },
```

In `src/hooks/playerStatistics/queries.ts` around line 772, locate the equivalent default `bunkerStats` literal and apply the same three-field addition.

In `src/hooks/playerStatistics/advancedHelpers.ts`, locate `calculateBunkerStats` (line 109) and update the returned object to include the three new fields with default values:

```typescript
    sandSavePercentage: null,
    sandSaves: 0,
    sandSaveAttempts: 0,
```

> Sand save aggregation is computed in a separate hook (Step 2) reading directly from the views — `calculateBunkerStats` operates on `holeScores` which doesn't have shot-level granularity. The merge happens in the consumer (Step 5).

- [ ] **Step 2: Write failing test for `useSandSaveStats`**

Create `src/__tests__/hooks/queries/useSandSaveStats.test.tsx`:

```typescript
import { renderHook, waitFor } from '@testing-library/react-native';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import React from 'react';
import { useSandSaveStats } from '@/hooks/queries/useSandSaveStats';

const mockFrom = jest.fn();
jest.mock('@/services/supabase/client', () => ({
  supabase: { from: (...a: unknown[]) => mockFrom(...a) },
}));

function makeWrapper() {
  const qc = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={qc}>{children}</QueryClientProvider>
  );
}

describe('useSandSaveStats', () => {
  beforeEach(() => {
    mockFrom.mockReset();
  });

  it('computes percentage from view counts', async () => {
    // First call: v_sand_saves count
    mockFrom.mockReturnValueOnce({
      select: () => ({
        eq: () => Promise.resolve({ count: 7, data: null, error: null }),
      }),
    });
    // Second call: v_sand_save_attempts count
    mockFrom.mockReturnValueOnce({
      select: () => ({
        eq: () => Promise.resolve({ count: 11, data: null, error: null }),
      }),
    });

    const { result } = renderHook(() => useSandSaveStats('player-1'), {
      wrapper: makeWrapper(),
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(result.current.data).toEqual({
      sandSaves: 7,
      sandSaveAttempts: 11,
      sandSavePercentage: 7 / 11 * 100,
    });
  });

  it('returns null percentage when no attempts', async () => {
    mockFrom
      .mockReturnValueOnce({
        select: () => ({ eq: () => Promise.resolve({ count: 0, data: null, error: null }) }),
      })
      .mockReturnValueOnce({
        select: () => ({ eq: () => Promise.resolve({ count: 0, data: null, error: null }) }),
      });

    const { result } = renderHook(() => useSandSaveStats('player-1'), {
      wrapper: makeWrapper(),
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(result.current.data).toEqual({
      sandSaves: 0,
      sandSaveAttempts: 0,
      sandSavePercentage: null,
    });
  });
});
```

- [ ] **Step 3: Run test — verify it fails**

```bash
pnpm jest src/__tests__/hooks/queries/useSandSaveStats.test.tsx
```

Expected: fails because `useSandSaveStats` doesn't exist.

- [ ] **Step 4: Implement the hook**

Create `src/hooks/queries/useSandSaveStats.ts`:

```typescript
/**
 * Sand-save aggregate stats for a player.
 *
 * Reads counts from v_sand_saves and v_sand_save_attempts (created in
 * 20260505000001_create_sand_save_views.sql) and derives a percentage.
 *
 * Returns null percentage when no attempts on record.
 */

import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/services/supabase/client';

export interface SandSaveStats {
  sandSaves: number;
  sandSaveAttempts: number;
  sandSavePercentage: number | null;
}

const STALE_TIME_MS = 60_000;

async function fetchSandSaveStats(playerId: string): Promise<SandSaveStats> {
  const [savesResult, attemptsResult] = await Promise.all([
    supabase
      .from('v_sand_saves')
      .select('*', { count: 'exact', head: true })
      .eq('player_id', playerId),
    supabase
      .from('v_sand_save_attempts')
      .select('*', { count: 'exact', head: true })
      .eq('player_id', playerId),
  ]);

  const sandSaves = savesResult.count ?? 0;
  const sandSaveAttempts = attemptsResult.count ?? 0;
  const sandSavePercentage =
    sandSaveAttempts > 0 ? (sandSaves / sandSaveAttempts) * 100 : null;

  return { sandSaves, sandSaveAttempts, sandSavePercentage };
}

export function useSandSaveStats(playerId: string | undefined) {
  return useQuery({
    queryKey: ['stats', 'sandSave', playerId],
    queryFn: () => fetchSandSaveStats(playerId as string),
    enabled: Boolean(playerId),
    staleTime: STALE_TIME_MS,
  });
}
```

- [ ] **Step 5: Run test — verify it passes**

```bash
pnpm jest src/__tests__/hooks/queries/useSandSaveStats.test.tsx
```

Expected: both tests pass.

- [ ] **Step 6: Render Sand Save % in `BunkerStatsSection`**

The existing component receives `bunkerStats: BunkerStats`. Since sand-save data lives in a separate view-backed hook, the cleanest path is for the consumer screen (e.g., `MyStatisticsScreen`, `CourseStatisticsScreen`) to merge the two into the `BunkerStats` it passes down. We update `BunkerStatsSection` to render the new fields when they're populated.

In `src/components/statistics/BunkerStatsSection.tsx`, locate the secondary stats row (around line 66–103) and replace the single secondary `View` containing two `secondaryStat` blocks with a three-stat layout. Replace lines 65–103 (the `{/* Secondary stats row */}` block) with:

```typescript
              {/* Secondary stats row */}
              <View style={styles.secondaryStatsRow}>
                {/* Avg per round */}
                <View
                  style={styles.secondaryStat}
                  accessible
                  accessibilityRole="text"
                  accessibilityLabel={`Average bunker shots per round: ${bunkerStats.averageBunkerShotsPerRound?.toFixed(1) ?? 'N/A'}`}
                >
                  <Text style={[styles.secondaryLabel, { color: colors.textSecondary }]}>
                    Avg / Round
                  </Text>
                  <Text style={[styles.secondaryValue, { color: colors.textPrimary }]}>
                    {bunkerStats.averageBunkerShotsPerRound !== null
                      ? bunkerStats.averageBunkerShotsPerRound.toFixed(1)
                      : '-'}
                  </Text>
                </View>

                <View style={[styles.verticalDivider, { backgroundColor: colors.border }]} />

                {/* Holes with bunkers % */}
                <View
                  style={styles.secondaryStat}
                  accessible
                  accessibilityRole="text"
                  accessibilityLabel={`Holes with bunker shots: ${bunkerStats.holesWithBunkersPercentage?.toFixed(0) ?? 'N/A'}%`}
                >
                  <Text style={[styles.secondaryLabel, { color: colors.textSecondary }]}>
                    Holes w/ Bunker
                  </Text>
                  <Text style={[styles.secondaryValue, { color: colors.warning }]}>
                    {bunkerStats.holesWithBunkersPercentage !== null
                      ? `${bunkerStats.holesWithBunkersPercentage.toFixed(0)}%`
                      : '-'}
                  </Text>
                </View>

                <View style={[styles.verticalDivider, { backgroundColor: colors.border }]} />

                {/* Sand Save % */}
                <View
                  style={styles.secondaryStat}
                  accessible
                  accessibilityRole="text"
                  accessibilityLabel={
                    bunkerStats.sandSavePercentage !== null
                      ? `Sand save percentage: ${bunkerStats.sandSavePercentage.toFixed(0)}%, ${bunkerStats.sandSaves} of ${bunkerStats.sandSaveAttempts}`
                      : 'Sand save percentage: not available'
                  }
                >
                  <Text style={[styles.secondaryLabel, { color: colors.textSecondary }]}>
                    Sand Save
                  </Text>
                  <Text style={[styles.secondaryValue, { color: colors.success }]}>
                    {bunkerStats.sandSavePercentage !== null
                      ? `${bunkerStats.sandSavePercentage.toFixed(0)}%`
                      : '-'}
                  </Text>
                </View>
              </View>
```

- [ ] **Step 7: Wire `useSandSaveStats` into one consumer screen as the reference integration**

Pick the primary stats consumer — `src/screens/profile/MyStatisticsScreen/index.tsx` — and add the merge. Locate the place where `bunkerStats` is destructured / passed to `<BunkerStatsSection />` and merge in sand save data.

Pseudo-pattern for the engineer to apply (read the file first to find the exact local naming):

```typescript
import { useSandSaveStats } from '@/hooks/queries/useSandSaveStats';
// ...
const { player } = useAuth();
const sandSave = useSandSaveStats(player?.id);

// Where bunkerStats is computed/destructured from the existing playerStatistics hook:
const mergedBunkerStats: BunkerStats = {
  ...bunkerStats,
  sandSaves:           sandSave.data?.sandSaves           ?? 0,
  sandSaveAttempts:    sandSave.data?.sandSaveAttempts    ?? 0,
  sandSavePercentage:  sandSave.data?.sandSavePercentage  ?? null,
};

// Pass merged value:
<BunkerStatsSection bunkerStats={mergedBunkerStats} />
```

> If the consumer file is not `MyStatisticsScreen/index.tsx`, search for `BunkerStatsSection` usage and apply the merge at the highest screen-level consumer. Course-scoped stats (`CourseStatisticsScreen`) can wait — sand save data is currently only player-scoped in this hook. Note that the `BunkerStats` shape change is backwards-compatible: callers that don't merge get `0/0/null` defaults and the UI shows `-`, which is correct.

- [ ] **Step 8: Type-check + tests**

```bash
pnpm type-check && pnpm jest src/__tests__/hooks/queries/useSandSaveStats.test.tsx
```

Expected: both pass. Type-check may surface any consumers that build `BunkerStats` literals — fix those by spreading the three new defaults (`sandSavePercentage: null, sandSaves: 0, sandSaveAttempts: 0`).

- [ ] **Step 9: Commit**

```bash
git add src/hooks/playerStatistics/types.ts \
        src/hooks/playerStatistics/courseQueries.ts \
        src/hooks/playerStatistics/queries.ts \
        src/hooks/playerStatistics/advancedHelpers.ts \
        src/hooks/queries/useSandSaveStats.ts \
        src/__tests__/hooks/queries/useSandSaveStats.test.tsx \
        src/components/statistics/BunkerStatsSection.tsx \
        src/screens/profile/MyStatisticsScreen/
git commit -m "$(cat <<'EOF'
feat(stats): sand save % in BunkerStatsSection

New useSandSaveStats hook reads from v_sand_saves and
v_sand_save_attempts, returns counts + derived percentage. UI shows
'-' when no attempts on record. Reference integration in
MyStatisticsScreen merges sand-save data with the existing bunker
stats payload before passing to BunkerStatsSection.
EOF
)"
```

---

## Task 8: End-to-end smoke test

**Files:** none (manual verification)

- [ ] **Step 1: Pick a sandbelt course**

Pick a course you can physically score (or simulate via dev tools). Recommended: Kingston Heath, Royal Melbourne, or any sandbelt course already imported. If not imported, run a fresh import via the in-app course-search flow — the new fire-and-forget ingestion should auto-populate `hole_hazards` within 30–60s.

- [ ] **Step 2: Verify polygons landed**

```bash
psql "$(supabase status --output json | jq -r '.DB_URL')" -c \
  "SELECT hole_number, COUNT(*) AS bunkers FROM hole_hazards
   WHERE course_id = '<your_course_id>' AND hazard_type = 'bunker'
   GROUP BY hole_number ORDER BY hole_number;"
```

Expected: ≥ 30 polygons across the course for a typical sandbelt course. If 0, run the edge function manually (Task 4 Step 3) to backfill.

- [ ] **Step 3: Score through a bunker**

Start a round on the course. On a hole with bunkers in DB:

1. Stand near a tee box (or fake GPS via Xcode location simulator → "Custom Location"). Tap **Log Shot**, pick a club. Toast should read **"Shot 1 logged · Undo"** (not bunker — tee is not in a bunker polygon).
2. Move GPS to coordinates inside a known bunker polygon (use coordinates from Step 2 query). Tap **Log Shot**. Toast should read **"Bunker shot 2 logged · Undo"**.
3. Move GPS onto the green. Tap **Log Shot** (toast: "Shot 3 logged"). Then submit one more shot to hole-out.

- [ ] **Step 4: Verify sand save was recorded**

```bash
psql "$(supabase status --output json | jq -r '.DB_URL')" -c \
  "SELECT * FROM v_sand_saves WHERE player_id = '<your_player_id>';"
```

Expected: one row representing your bunker shot.

Open the MyStatisticsScreen. The Bunker Play card should show **Sand Save: 100% (1/1)** (or whatever fraction reflects your test sequence).

- [ ] **Step 5: Document any gaps**

If something didn't work as expected (toast didn't change, sand save % missing, polygons absent), open issues against the relevant task before declaring V1 complete.

---

## Self-Review

**Spec coverage:**

| Spec section | Implementing task |
|---|---|
| §6.1 `from_bunker` column | Task 1 |
| §6.2 detection trigger | Task 1 |
| §6.3 `v_sand_saves` view | Task 2 |
| §6.3 `v_sand_save_attempts` view | Task 2 |
| §7 OSM ingestion edge function | Task 4 |
| §7.3 backfill hook rewrite | Task 5 |
| §7.3 fire-and-forget at course import | Task 6 |
| §8.1 toast variant | Task 3 |
| §8.2 BunkerStatsSection sand save row | Task 7 |
| §10 file inventory | Tasks 1–7 (all listed paths produced) |
| §11 testing | Tasks 1, 2 (SQL verify), 3, 5, 7 (Jest) |
| §14 rollout (manual sandbelt seed) | Task 8 |

**Placeholder scan:** No "TBD", no "implement later", no "similar to task N", no "add appropriate error handling" without code. Step 7 of Task 7 uses pseudocode for screen integration *and* explicitly tells the engineer to read the file first to find local naming — this is honest under-specification of an integration point that depends on local context the plan can't fully predict, not a placeholder.

**Type consistency:** `from_bunker` (snake_case, DB convention) on `ShotLogEntry`; `fromBunker` (camelCase) on store input + UI props — consistent with codebase pattern (DB rows use snake_case, store/component args use camelCase). `BunkerStats` extension uses three new camelCase fields used identically across types definition, default initializers, and UI consumers.
