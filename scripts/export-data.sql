-- =====================================================
-- DATA EXPORT SCRIPT
-- =====================================================
-- Run this in Supabase SQL Editor to export data as JSON
-- Copy the results from each query and save to separate files
--
-- Order of export:
-- 1. clubs (manual only)
-- 2. courses (for manual clubs)
-- 3. tees (for manual club courses)
-- 4. hole_coordinates (for manual club courses)
-- =====================================================

-- =====================================================
-- STEP 1: Export Manual Clubs
-- =====================================================
-- Save result as: manual_clubs_backup.json

SELECT json_agg(row_to_json(c))
FROM (
  SELECT *
  FROM clubs
  WHERE source = 'manual'
     OR golfapi_club_id IS NULL
  ORDER BY name
) c;

-- =====================================================
-- STEP 2: Export Courses for Manual Clubs
-- =====================================================
-- Save result as: manual_courses_backup.json

SELECT json_agg(row_to_json(c))
FROM (
  SELECT co.*
  FROM courses co
  JOIN clubs cl ON co.club_id = cl.id
  WHERE cl.source = 'manual'
     OR cl.golfapi_club_id IS NULL
  ORDER BY cl.name, co.name
) c;

-- =====================================================
-- STEP 3: Export Tees for Manual Club Courses
-- =====================================================
-- Save result as: manual_tees_backup.json

SELECT json_agg(row_to_json(t))
FROM (
  SELECT te.*
  FROM tees te
  JOIN courses co ON te.course_id = co.id
  JOIN clubs cl ON co.club_id = cl.id
  WHERE cl.source = 'manual'
     OR cl.golfapi_club_id IS NULL
  ORDER BY cl.name, co.name, te.name
) t;

-- =====================================================
-- STEP 4: Export Hole Coordinates for Manual Club Courses
-- =====================================================
-- Save result as: manual_coordinates_backup.json

SELECT json_agg(row_to_json(hc))
FROM (
  SELECT hc.*
  FROM hole_coordinates hc
  JOIN courses co ON hc.course_id = co.id
  JOIN clubs cl ON co.club_id = cl.id
  WHERE cl.source = 'manual'
     OR cl.golfapi_club_id IS NULL
  ORDER BY cl.name, co.name, hc.hole_number
) hc;

-- =====================================================
-- STEP 5: Export ALL Competitions (for reference)
-- =====================================================
-- Save result as: all_competitions_backup.json

SELECT json_agg(row_to_json(c))
FROM (
  SELECT *
  FROM competitions
  ORDER BY created_at
) c;

-- =====================================================
-- STEP 6: Export ALL Rounds (for reference)
-- =====================================================
-- Save result as: all_rounds_backup.json

SELECT json_agg(row_to_json(r))
FROM (
  SELECT r.*, c.name as competition_name, co.name as course_name
  FROM rounds r
  LEFT JOIN competitions c ON r.competition_id = c.id
  LEFT JOIN courses co ON r.course_id = co.id
  ORDER BY r.created_at
) r;

-- =====================================================
-- STEP 7: Export ALL Scorecards (for reference)
-- =====================================================
-- Save result as: all_scorecards_backup.json

SELECT json_agg(row_to_json(s))
FROM (
  SELECT s.*, p.name as player_name
  FROM scorecards s
  LEFT JOIN players p ON s.player_id = p.id
  ORDER BY s.created_at
) s;

-- =====================================================
-- SUMMARY: Count records before deletion
-- =====================================================

SELECT
  'clubs (manual)' as table_name,
  COUNT(*) as count
FROM clubs
WHERE source = 'manual' OR golfapi_club_id IS NULL

UNION ALL

SELECT
  'clubs (api)' as table_name,
  COUNT(*) as count
FROM clubs
WHERE source = 'api' AND golfapi_club_id IS NOT NULL

UNION ALL

SELECT 'courses (all)' as table_name, COUNT(*) FROM courses

UNION ALL

SELECT 'tees' as table_name, COUNT(*) FROM tees

UNION ALL

SELECT 'hole_coordinates' as table_name, COUNT(*) FROM hole_coordinates

UNION ALL

SELECT 'competitions' as table_name, COUNT(*) FROM competitions

UNION ALL

SELECT 'rounds' as table_name, COUNT(*) FROM rounds

UNION ALL

SELECT 'scorecards' as table_name, COUNT(*) FROM scorecards

UNION ALL

SELECT 'competition_players' as table_name, COUNT(*) FROM competition_players

ORDER BY table_name;
