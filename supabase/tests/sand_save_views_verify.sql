-- Manual verification for the sand-save views.
-- Run with: psql "$LOCAL_DB_URL" -f supabase/tests/sand_save_views_verify.sql
-- All assertions are wrapped in a ROLLBACK so the DB stays clean.
--
-- Three test rounds:
--   Round 1: bunker → green → 1 putt → SAND SAVE (in BOTH views)
--   Round 2: bunker → green → 2 putts → ATTEMPT only (missed save)
--   Round 3: bunker → fairway (NOT green) → neither
-- Final assertion: 1 save / 2 attempts.

BEGIN;

-- =====================================================
-- SCAFFOLDING: auth.users, club, course, player, rounds
-- =====================================================

INSERT INTO auth.users (id, email)
  VALUES ('00000000-0000-0000-0000-000000000003', 'sand-save-verify@example.com');

INSERT INTO clubs (id, source, name)
  VALUES ('00000000-0000-0000-0000-000000000001', 'manual', 'Sand Save Test Club');

INSERT INTO courses (id, club_id, name)
  VALUES ('00000000-0000-0000-0000-000000000002',
          '00000000-0000-0000-0000-000000000001',
          'Sand Save Test Course');

INSERT INTO players (id, name, email)
  VALUES ('00000000-0000-0000-0000-000000000003',
          'Sand Save Test Player',
          'sand-save-verify@example.com');

-- Three rounds, one per test scenario, all on hole 1.
INSERT INTO rounds (id, course_id, status, user_id) VALUES
  ('00000000-0000-0000-0000-000000000010',
   '00000000-0000-0000-0000-000000000002', 'in-progress',
   '00000000-0000-0000-0000-000000000003'),
  ('00000000-0000-0000-0000-000000000020',
   '00000000-0000-0000-0000-000000000002', 'in-progress',
   '00000000-0000-0000-0000-000000000003'),
  ('00000000-0000-0000-0000-000000000030',
   '00000000-0000-0000-0000-000000000002', 'in-progress',
   '00000000-0000-0000-0000-000000000003');

-- Green center for hole 1 at (-37.95, 144.95).
-- Distances used in fixtures:
--   green shot   (-37.95,  144.95)   = 0m   → on green
--   bunker shot  (-37.951, 144.951)  ≈ 144m → off green (bunker_from set explicitly)
--   fairway shot (-37.952, 144.952)  ≈ 287m → off green
INSERT INTO hole_coordinates (course_id, hole_number, poi_type, latitude, longitude)
VALUES (
  '00000000-0000-0000-0000-000000000002',
  1,
  'green_center',
  -37.9500000,
  144.9500000
);

-- =====================================================
-- ROUND 1: SAND SAVE (bunker → green → 1 putt)
-- shots: 1=bunker (from_bunker=true), 2=green, 3=putt holed
-- total=3, bunker.sequence=1 → total - sequence = 2 → save ✓
-- =====================================================

INSERT INTO shot_log (round_id, hole_number, player_id, sequence, latitude, longitude)
VALUES
  ('00000000-0000-0000-0000-000000000010', 1,
   '00000000-0000-0000-0000-000000000003', 1, -37.9510000, 144.9510000),
  ('00000000-0000-0000-0000-000000000010', 1,
   '00000000-0000-0000-0000-000000000003', 2, -37.9500000, 144.9500000),
  ('00000000-0000-0000-0000-000000000010', 1,
   '00000000-0000-0000-0000-000000000003', 3, -37.9500000, 144.9500000);

-- Force from_bunker=true on the bunker shot (no polygon ingested in this test).
UPDATE shot_log
   SET from_bunker = true
 WHERE round_id = '00000000-0000-0000-0000-000000000010'
   AND sequence = 1;

-- =====================================================
-- ROUND 2: MISSED SAVE (bunker → green → 2 putts → bogey)
-- shots: 1=bunker, 2=green, 3=putt, 4=putt holed
-- total=4, bunker.sequence=1 → total - sequence = 3 → attempt only
-- =====================================================

INSERT INTO shot_log (round_id, hole_number, player_id, sequence, latitude, longitude)
VALUES
  ('00000000-0000-0000-0000-000000000020', 1,
   '00000000-0000-0000-0000-000000000003', 1, -37.9510000, 144.9510000),
  ('00000000-0000-0000-0000-000000000020', 1,
   '00000000-0000-0000-0000-000000000003', 2, -37.9500000, 144.9500000),
  ('00000000-0000-0000-0000-000000000020', 1,
   '00000000-0000-0000-0000-000000000003', 3, -37.9500000, 144.9500000),
  ('00000000-0000-0000-0000-000000000020', 1,
   '00000000-0000-0000-0000-000000000003', 4, -37.9500000, 144.9500000);

UPDATE shot_log
   SET from_bunker = true
 WHERE round_id = '00000000-0000-0000-0000-000000000020'
   AND sequence = 1;

-- =====================================================
-- ROUND 3: NON-GREENSIDE (bunker → fairway)
-- shots: 1=bunker, 2=fairway (NOT on green), 3=green, 4=putt holed
-- next_location after bunker is fairway (~287m off green) → neither view
-- =====================================================

INSERT INTO shot_log (round_id, hole_number, player_id, sequence, latitude, longitude)
VALUES
  ('00000000-0000-0000-0000-000000000030', 1,
   '00000000-0000-0000-0000-000000000003', 1, -37.9510000, 144.9510000),
  ('00000000-0000-0000-0000-000000000030', 1,
   '00000000-0000-0000-0000-000000000003', 2, -37.9520000, 144.9520000),
  ('00000000-0000-0000-0000-000000000030', 1,
   '00000000-0000-0000-0000-000000000003', 3, -37.9500000, 144.9500000),
  ('00000000-0000-0000-0000-000000000030', 1,
   '00000000-0000-0000-0000-000000000003', 4, -37.9500000, 144.9500000);

UPDATE shot_log
   SET from_bunker = true
 WHERE round_id = '00000000-0000-0000-0000-000000000030'
   AND sequence = 1;

-- =====================================================
-- ASSERTIONS
-- =====================================================

-- Test 1: Round 1 appears as a save AND an attempt.
DO $$
DECLARE v_save_count INT; v_attempt_count INT;
BEGIN
  SELECT COUNT(*) INTO v_save_count FROM v_sand_saves
    WHERE round_id = '00000000-0000-0000-0000-000000000010';
  SELECT COUNT(*) INTO v_attempt_count FROM v_sand_save_attempts
    WHERE round_id = '00000000-0000-0000-0000-000000000010';
  ASSERT v_save_count = 1,
    'Test 1 FAILED: round 1 should produce 1 sand save (got ' || v_save_count || ')';
  ASSERT v_attempt_count = 1,
    'Test 1 FAILED: round 1 should produce 1 attempt (got ' || v_attempt_count || ')';
  RAISE NOTICE 'Test 1 PASSED: round 1 (bunker → green → 1 putt) = save + attempt';
END $$;

-- Test 2: Round 2 appears as an attempt but NOT a save.
DO $$
DECLARE v_save_count INT; v_attempt_count INT;
BEGIN
  SELECT COUNT(*) INTO v_save_count FROM v_sand_saves
    WHERE round_id = '00000000-0000-0000-0000-000000000020';
  SELECT COUNT(*) INTO v_attempt_count FROM v_sand_save_attempts
    WHERE round_id = '00000000-0000-0000-0000-000000000020';
  ASSERT v_save_count = 0,
    'Test 2 FAILED: round 2 should NOT produce a sand save (got ' || v_save_count || ')';
  ASSERT v_attempt_count = 1,
    'Test 2 FAILED: round 2 should produce 1 attempt (got ' || v_attempt_count || ')';
  RAISE NOTICE 'Test 2 PASSED: round 2 (bunker → green → 2 putts) = attempt only';
END $$;

-- Test 3: Round 3 appears in neither view (next shot landed off-green).
DO $$
DECLARE v_save_count INT; v_attempt_count INT;
BEGIN
  SELECT COUNT(*) INTO v_save_count FROM v_sand_saves
    WHERE round_id = '00000000-0000-0000-0000-000000000030';
  SELECT COUNT(*) INTO v_attempt_count FROM v_sand_save_attempts
    WHERE round_id = '00000000-0000-0000-0000-000000000030';
  ASSERT v_save_count = 0,
    'Test 3 FAILED: round 3 should NOT produce a sand save (got ' || v_save_count || ')';
  ASSERT v_attempt_count = 0,
    'Test 3 FAILED: round 3 should NOT produce an attempt (got ' || v_attempt_count || ')';
  RAISE NOTICE 'Test 3 PASSED: round 3 (bunker → fairway) excluded from both views';
END $$;

-- Test 4: Total counts across all 3 test rounds = 1 save / 2 attempts.
DO $$
DECLARE v_save_count INT; v_attempt_count INT;
BEGIN
  SELECT COUNT(*) INTO v_save_count FROM v_sand_saves
    WHERE round_id IN (
      '00000000-0000-0000-0000-000000000010',
      '00000000-0000-0000-0000-000000000020',
      '00000000-0000-0000-0000-000000000030'
    );
  SELECT COUNT(*) INTO v_attempt_count FROM v_sand_save_attempts
    WHERE round_id IN (
      '00000000-0000-0000-0000-000000000010',
      '00000000-0000-0000-0000-000000000020',
      '00000000-0000-0000-0000-000000000030'
    );
  ASSERT v_save_count = 1,
    'Test 4 FAILED: expected 1 total save (got ' || v_save_count || ')';
  ASSERT v_attempt_count = 2,
    'Test 4 FAILED: expected 2 total attempts (got ' || v_attempt_count || ')';
  RAISE NOTICE 'Test 4 PASSED: 1 save / 2 attempts → sand-save % = 50%%';
END $$;

-- Test 5: Saves are a strict subset of attempts (joinable by bunker_shot_id).
DO $$
DECLARE v_orphan_saves INT;
BEGIN
  SELECT COUNT(*) INTO v_orphan_saves
  FROM v_sand_saves s
  LEFT JOIN v_sand_save_attempts a ON a.bunker_shot_id = s.bunker_shot_id
  WHERE a.bunker_shot_id IS NULL;
  ASSERT v_orphan_saves = 0,
    'Test 5 FAILED: every save must also appear in attempts (got '
      || v_orphan_saves || ' orphan saves)';
  RAISE NOTICE 'Test 5 PASSED: saves are a strict subset of attempts';
END $$;

ROLLBACK;
