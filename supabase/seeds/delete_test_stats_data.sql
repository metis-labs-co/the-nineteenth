-- =====================================================
-- Delete Test Stats Data
-- The Nineteenth - Golf Competition App
-- =====================================================
-- Run this script to clean up all test statistics data
-- created by test_stats_data.sql
-- =====================================================

-- User IDs for reference:
-- Jordan Pro: ca7c2924-39e8-4b66-bbb8-d9699adb3d65
-- Test Player: 5d7c1ffc-0ad4-486b-b069-d93d626c762f

-- Competition ID: eeee0001-0001-0001-0001-000000000001

BEGIN;

SELECT 'Starting cleanup of test stats data...' as status;

-- =====================================================
-- STEP 1: Delete Round Results
-- =====================================================
DELETE FROM round_results
WHERE round_id IN (
  SELECT id FROM rounds WHERE competition_id = 'eeee0001-0001-0001-0001-000000000001'
);

SELECT 'Round results deleted' as status;

-- =====================================================
-- STEP 2: Delete Scorecards
-- =====================================================
DELETE FROM scorecards
WHERE round_id IN (
  SELECT id FROM rounds WHERE competition_id = 'eeee0001-0001-0001-0001-000000000001'
);

SELECT 'Scorecards deleted' as status;

-- =====================================================
-- STEP 3: Delete Pairings
-- =====================================================
DELETE FROM pairings
WHERE round_id IN (
  SELECT id FROM rounds WHERE competition_id = 'eeee0001-0001-0001-0001-000000000001'
);

SELECT 'Pairings deleted' as status;

-- =====================================================
-- STEP 4: Delete Rounds
-- =====================================================
DELETE FROM rounds
WHERE competition_id = 'eeee0001-0001-0001-0001-000000000001';

SELECT 'Rounds deleted' as status;

-- =====================================================
-- STEP 5: Delete Competition Players
-- =====================================================
DELETE FROM competition_players
WHERE competition_id = 'eeee0001-0001-0001-0001-000000000001';

SELECT 'Competition players deleted' as status;

-- =====================================================
-- STEP 6: Delete Competition
-- =====================================================
DELETE FROM competitions
WHERE id = 'eeee0001-0001-0001-0001-000000000001';

SELECT 'Competition deleted' as status;

-- =====================================================
-- VERIFICATION
-- =====================================================
SELECT 'Cleanup verification:' as info;

SELECT
  'Competition' as entity,
  COUNT(*) as remaining
FROM competitions
WHERE id = 'eeee0001-0001-0001-0001-000000000001'
UNION ALL
SELECT 'Rounds', COUNT(*) FROM rounds WHERE competition_id = 'eeee0001-0001-0001-0001-000000000001'
UNION ALL
SELECT 'Scorecards (stats-test)', COUNT(*) FROM scorecards WHERE id::text LIKE 'eeee0001%';

COMMIT;

SELECT 'Test stats data cleanup complete!' as status;

-- =====================================================
-- OPTIONAL: Reset Player Handicaps (uncomment if needed)
-- =====================================================
-- UPDATE players SET handicap = NULL WHERE id = 'ca7c2924-39e8-4b66-bbb8-d9699adb3d65';
-- UPDATE players SET handicap = NULL WHERE id = '5d7c1ffc-0ad4-486b-b069-d93d626c762f';

-- =====================================================
-- OPTIONAL: Delete Test Player entirely (uncomment if needed)
-- =====================================================
-- DELETE FROM players WHERE id = '5d7c1ffc-0ad4-486b-b069-d93d626c762f';

-- =====================================================
-- OPTIONAL: Delete Eastern Golf Club courses (uncomment if needed)
-- WARNING: Only do this if no other data references these courses!
-- =====================================================
-- DELETE FROM courses WHERE id IN (
--   'c1111111-1111-1111-1111-111111111111',
--   'c2222222-2222-2222-2222-222222222222',
--   'c3333333-3333-3333-3333-333333333333'
-- );
-- DELETE FROM clubs WHERE id = 'a1b2c3d4-e5f6-7890-abcd-ef1234567890';
