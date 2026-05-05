-- Manual verification for the from_bunker trigger.
-- Run with: psql "$LOCAL_DB_URL" -f supabase/tests/from_bunker_trigger_verify.sql
-- All assertions are wrapped in a ROLLBACK so the DB stays clean.

BEGIN;

-- Setup synthetic course/hole/round/player data
-- auth.users row is required because rounds.user_id and players.id (historically)
-- reference auth.users(id). Minimal columns only.
INSERT INTO auth.users (id, email)
  VALUES ('00000000-0000-0000-0000-000000000003', 'verify-test@example.com');

INSERT INTO clubs (id, source, name)
  VALUES ('00000000-0000-0000-0000-000000000001', 'manual', 'Test Club');

INSERT INTO courses (id, club_id, name)
  VALUES ('00000000-0000-0000-0000-000000000002',
          '00000000-0000-0000-0000-000000000001',
          'Test Course');

INSERT INTO players (id, name, email)
  VALUES ('00000000-0000-0000-0000-000000000003',
          'Test Player',
          'verify-test@example.com');

INSERT INTO rounds (id, course_id, status, user_id)
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
INSERT INTO rounds (id, course_id, status, user_id)
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
