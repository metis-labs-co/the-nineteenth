-- =====================================================
-- DATA DELETION SCRIPT
-- =====================================================
-- ⚠️  WARNING: This script PERMANENTLY DELETES data!
-- ⚠️  Make sure you have run export-data.sql first!
-- ⚠️  This cannot be undone!
--
-- This script deletes:
-- 1. All competitions and related data (rounds, scorecards, etc.)
-- 2. All manual clubs and their courses
-- 3. Optionally: All API-synced clubs (commented out by default)
--
-- Run each section separately and verify before proceeding.
-- =====================================================

-- =====================================================
-- PHASE 1: Delete Competition-Related Data
-- =====================================================
-- Order matters due to foreign key constraints!

BEGIN;

-- 1.1 Delete skins-related data (depends on rounds)
DELETE FROM skins_player_statistics;
DELETE FROM skins_payouts;
DELETE FROM skins_results;
DELETE FROM skins_games;

-- 1.2 Delete prize pool data (depends on competitions)
DELETE FROM pool_transactions;
DELETE FROM competition_prize_pools;

-- 1.3 Delete round results (depends on rounds)
DELETE FROM round_results;

-- 1.4 Delete scoring pairs (depends on rounds)
DELETE FROM scoring_pairs;

-- 1.5 Delete scorecards (depends on rounds and players)
DELETE FROM scorecards;

-- 1.6 Delete pairings (depends on rounds)
DELETE FROM pairings;

-- 1.7 Delete round players (depends on rounds)
DELETE FROM round_players;

-- 1.8 Delete team members (depends on teams)
DELETE FROM team_members;

-- 1.9 Delete teams (depends on competitions)
DELETE FROM teams;

-- 1.10 Delete rounds (depends on competitions and courses)
DELETE FROM rounds;

-- 1.11 Delete competition players (depends on competitions)
DELETE FROM competition_players;

-- 1.12 Delete notifications related to competitions
DELETE FROM notifications
WHERE competition_id IS NOT NULL
   OR round_id IS NOT NULL;

-- 1.13 Delete competitions
DELETE FROM competitions;

COMMIT;

-- Verify Phase 1
SELECT 'competitions' as table_name, COUNT(*) as remaining FROM competitions
UNION ALL SELECT 'rounds', COUNT(*) FROM rounds
UNION ALL SELECT 'scorecards', COUNT(*) FROM scorecards
UNION ALL SELECT 'skins_games', COUNT(*) FROM skins_games;

-- =====================================================
-- PHASE 2: Delete Manual Clubs and Courses
-- =====================================================

BEGIN;

-- 2.1 Delete favorite courses for manual clubs
DELETE FROM favorite_courses
WHERE course_id IN (
  SELECT co.id
  FROM courses co
  JOIN clubs cl ON co.club_id = cl.id
  WHERE cl.source = 'manual'
     OR cl.golfapi_club_id IS NULL
);

-- 2.2 Delete hole coordinates for manual clubs
DELETE FROM hole_coordinates
WHERE course_id IN (
  SELECT co.id
  FROM courses co
  JOIN clubs cl ON co.club_id = cl.id
  WHERE cl.source = 'manual'
     OR cl.golfapi_club_id IS NULL
);

-- 2.3 Delete tees for manual clubs
DELETE FROM tees
WHERE course_id IN (
  SELECT co.id
  FROM courses co
  JOIN clubs cl ON co.club_id = cl.id
  WHERE cl.source = 'manual'
     OR cl.golfapi_club_id IS NULL
);

-- 2.4 Delete courses for manual clubs
DELETE FROM courses
WHERE club_id IN (
  SELECT id
  FROM clubs
  WHERE source = 'manual'
     OR golfapi_club_id IS NULL
);

-- 2.5 Clear home_club_id references to manual clubs
UPDATE players
SET home_club_id = NULL
WHERE home_club_id IN (
  SELECT id
  FROM clubs
  WHERE source = 'manual'
     OR golfapi_club_id IS NULL
);

-- 2.6 Delete manual clubs
DELETE FROM clubs
WHERE source = 'manual'
   OR golfapi_club_id IS NULL;

COMMIT;

-- Verify Phase 2
SELECT 'manual clubs remaining' as check_name, COUNT(*) as count
FROM clubs
WHERE source = 'manual' OR golfapi_club_id IS NULL

UNION ALL

SELECT 'api clubs remaining', COUNT(*)
FROM clubs
WHERE source = 'api' AND golfapi_club_id IS NOT NULL;

-- =====================================================
-- PHASE 3: (OPTIONAL) Delete ALL Clubs and Courses
-- =====================================================
-- ⚠️  UNCOMMENT ONLY IF YOU WANT TO DELETE EVERYTHING
-- ⚠️  This includes API-synced clubs!

/*
BEGIN;

-- 3.1 Delete all favorite courses
DELETE FROM favorite_courses;

-- 3.2 Delete all hole coordinates
DELETE FROM hole_coordinates;

-- 3.3 Delete all tees
DELETE FROM tees;

-- 3.4 Delete all courses
DELETE FROM courses;

-- 3.5 Clear all home_club_id references
UPDATE players
SET home_club_id = NULL;

-- 3.6 Delete all clubs
DELETE FROM clubs;

COMMIT;

-- Verify Phase 3
SELECT 'clubs' as table_name, COUNT(*) as remaining FROM clubs
UNION ALL SELECT 'courses', COUNT(*) FROM courses
UNION ALL SELECT 'tees', COUNT(*) FROM tees
UNION ALL SELECT 'hole_coordinates', COUNT(*) FROM hole_coordinates;
*/

-- =====================================================
-- FINAL VERIFICATION
-- =====================================================

SELECT
  'Final State' as report,
  (SELECT COUNT(*) FROM competitions) as competitions,
  (SELECT COUNT(*) FROM rounds) as rounds,
  (SELECT COUNT(*) FROM scorecards) as scorecards,
  (SELECT COUNT(*) FROM clubs) as clubs,
  (SELECT COUNT(*) FROM courses) as courses,
  (SELECT COUNT(*) FROM tees) as tees;
