-- =====================================================
-- Delete All Test Data Script
-- The Nineteenth - Golf Competition App
-- =====================================================
-- This script removes ALL competition-related data from the database.
-- Run this BEFORE seeding with new test data.
-- =====================================================

-- Disable triggers temporarily for faster deletion
SET session_replication_role = replica;

-- =====================================================
-- Delete in dependency order (child tables first)
-- =====================================================

-- 1. Scoring Pairs (references rounds, players)
DELETE FROM scoring_pairs;

-- 2. Round Results (references rounds, players, teams)
DELETE FROM round_results;

-- 3. Scorecards (references rounds, players)
DELETE FROM scorecards;

-- 4. Pairings (references rounds)
DELETE FROM pairings;

-- 5. Team Members (references teams, players)
DELETE FROM team_members;

-- 6. Teams (references competitions)
DELETE FROM teams;

-- 7. Rounds (references competitions, courses)
DELETE FROM rounds;

-- 8. Competition Players (references competitions, players)
DELETE FROM competition_players;

-- 9. Competitions (main table)
DELETE FROM competitions;

-- Re-enable triggers
SET session_replication_role = DEFAULT;

-- =====================================================
-- Verification
-- =====================================================

SELECT 'Deletion Complete - Verification:' as status;

SELECT
  'competitions' as table_name, COUNT(*) as remaining_rows FROM competitions
UNION ALL SELECT
  'rounds', COUNT(*) FROM rounds
UNION ALL SELECT
  'teams', COUNT(*) FROM teams
UNION ALL SELECT
  'team_members', COUNT(*) FROM team_members
UNION ALL SELECT
  'pairings', COUNT(*) FROM pairings
UNION ALL SELECT
  'scorecards', COUNT(*) FROM scorecards
UNION ALL SELECT
  'round_results', COUNT(*) FROM round_results
UNION ALL SELECT
  'competition_players', COUNT(*) FROM competition_players
UNION ALL SELECT
  'scoring_pairs', COUNT(*) FROM scoring_pairs;
