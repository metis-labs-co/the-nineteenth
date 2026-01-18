-- =====================================================
-- DATA IMPORT SCRIPT
-- =====================================================
-- Use this to restore manual club/course data from backup
--
-- Instructions:
-- 1. Replace the JSON in each section with your backup data
-- 2. Run each section in order
-- 3. Verify data after each step
-- =====================================================

-- =====================================================
-- STEP 1: Import Manual Clubs
-- =====================================================
-- Paste your manual_clubs_backup.json content below

INSERT INTO clubs (
  id, source, golfapi_club_id, name, address, city, postal_code,
  state, country, continent, phone, email, website,
  latitude, longitude, location, total_holes, last_synced,
  created_at, updated_at
)
SELECT
  (j->>'id')::uuid,
  COALESCE(j->>'source', 'manual'),
  j->>'golfapi_club_id',
  j->>'name',
  j->>'address',
  j->>'city',
  j->>'postal_code',
  j->>'state',
  COALESCE(j->>'country', 'Australia'),
  j->>'continent',
  j->>'phone',
  j->>'email',
  j->>'website',
  (j->>'latitude')::numeric,
  (j->>'longitude')::numeric,
  CASE
    WHEN j->>'latitude' IS NOT NULL AND j->>'longitude' IS NOT NULL
    THEN ST_SetSRID(ST_MakePoint((j->>'longitude')::numeric, (j->>'latitude')::numeric), 4326)::geography
    ELSE NULL
  END,
  (j->>'total_holes')::integer,
  (j->>'last_synced')::timestamptz,
  COALESCE((j->>'created_at')::timestamptz, NOW()),
  COALESCE((j->>'updated_at')::timestamptz, NOW())
FROM json_array_elements('
  -- PASTE YOUR manual_clubs_backup.json HERE
  -- Example:
  -- [
  --   {"id": "uuid-here", "name": "My Club", "source": "manual", ...}
  -- ]
  []
'::json) AS j
ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name,
  address = EXCLUDED.address,
  updated_at = NOW();

-- =====================================================
-- STEP 2: Import Courses for Manual Clubs
-- =====================================================
-- Paste your manual_courses_backup.json content below

INSERT INTO courses (
  id, club_id, golfapi_course_id, golfapi_long_course_id,
  name, description, num_holes, measure_unit,
  holes, holes_women, match_play_indexes, tees, tees_migrated,
  course_rating, slope_rating, golfapi_updated_at,
  created_at, updated_at
)
SELECT
  (j->>'id')::uuid,
  (j->>'club_id')::uuid,
  j->>'golfapi_course_id',
  j->>'golfapi_long_course_id',
  j->>'name',
  j->>'description',
  COALESCE((j->>'num_holes')::integer, 18),
  j->>'measure_unit',
  (j->'holes')::jsonb,
  (j->'holes_women')::jsonb,
  (j->'match_play_indexes')::jsonb,
  (j->'tees')::jsonb,
  (j->>'tees_migrated')::boolean,
  (j->>'course_rating')::numeric,
  (j->>'slope_rating')::numeric,
  (j->>'golfapi_updated_at')::timestamptz,
  COALESCE((j->>'created_at')::timestamptz, NOW()),
  COALESCE((j->>'updated_at')::timestamptz, NOW())
FROM json_array_elements('
  -- PASTE YOUR manual_courses_backup.json HERE
  []
'::json) AS j
ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name,
  holes = EXCLUDED.holes,
  updated_at = NOW();

-- =====================================================
-- STEP 3: Import Tees for Manual Club Courses
-- =====================================================
-- Paste your manual_tees_backup.json content below

INSERT INTO tees (
  id, course_id, golfapi_tee_id, name, color, measure_unit,
  course_rating, slope, course_rating_front9, course_rating_back9,
  slope_front9, slope_back9, course_rating_women, slope_women,
  course_rating_women_front9, course_rating_women_back9,
  slope_women_front9, slope_women_back9,
  length_hole_1, length_hole_2, length_hole_3, length_hole_4,
  length_hole_5, length_hole_6, length_hole_7, length_hole_8,
  length_hole_9, length_hole_10, length_hole_11, length_hole_12,
  length_hole_13, length_hole_14, length_hole_15, length_hole_16,
  length_hole_17, length_hole_18,
  created_at, updated_at
)
SELECT
  (j->>'id')::uuid,
  (j->>'course_id')::uuid,
  j->>'golfapi_tee_id',
  j->>'name',
  j->>'color',
  j->>'measure_unit',
  (j->>'course_rating')::numeric,
  (j->>'slope')::integer,
  (j->>'course_rating_front9')::numeric,
  (j->>'course_rating_back9')::numeric,
  (j->>'slope_front9')::integer,
  (j->>'slope_back9')::integer,
  (j->>'course_rating_women')::numeric,
  (j->>'slope_women')::integer,
  (j->>'course_rating_women_front9')::numeric,
  (j->>'course_rating_women_back9')::numeric,
  (j->>'slope_women_front9')::integer,
  (j->>'slope_women_back9')::integer,
  (j->>'length_hole_1')::integer,
  (j->>'length_hole_2')::integer,
  (j->>'length_hole_3')::integer,
  (j->>'length_hole_4')::integer,
  (j->>'length_hole_5')::integer,
  (j->>'length_hole_6')::integer,
  (j->>'length_hole_7')::integer,
  (j->>'length_hole_8')::integer,
  (j->>'length_hole_9')::integer,
  (j->>'length_hole_10')::integer,
  (j->>'length_hole_11')::integer,
  (j->>'length_hole_12')::integer,
  (j->>'length_hole_13')::integer,
  (j->>'length_hole_14')::integer,
  (j->>'length_hole_15')::integer,
  (j->>'length_hole_16')::integer,
  (j->>'length_hole_17')::integer,
  (j->>'length_hole_18')::integer,
  COALESCE((j->>'created_at')::timestamptz, NOW()),
  COALESCE((j->>'updated_at')::timestamptz, NOW())
FROM json_array_elements('
  -- PASTE YOUR manual_tees_backup.json HERE
  []
'::json) AS j
ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name,
  updated_at = NOW();

-- =====================================================
-- STEP 4: Import Hole Coordinates
-- =====================================================
-- Paste your manual_coordinates_backup.json content below

INSERT INTO hole_coordinates (
  id, course_id, hole_number, poi_type, latitude, longitude,
  side_of_fairway, created_at
)
SELECT
  (j->>'id')::uuid,
  (j->>'course_id')::uuid,
  (j->>'hole_number')::integer,
  j->>'poi_type',
  (j->>'latitude')::numeric,
  (j->>'longitude')::numeric,
  j->>'side_of_fairway',
  COALESCE((j->>'created_at')::timestamptz, NOW())
FROM json_array_elements('
  -- PASTE YOUR manual_coordinates_backup.json HERE
  []
'::json) AS j
ON CONFLICT (id) DO NOTHING;

-- =====================================================
-- VERIFICATION
-- =====================================================

SELECT
  'Imported' as status,
  (SELECT COUNT(*) FROM clubs WHERE source = 'manual' OR golfapi_club_id IS NULL) as manual_clubs,
  (SELECT COUNT(*) FROM courses co JOIN clubs cl ON co.club_id = cl.id WHERE cl.source = 'manual' OR cl.golfapi_club_id IS NULL) as manual_courses,
  (SELECT COUNT(*) FROM tees te JOIN courses co ON te.course_id = co.id JOIN clubs cl ON co.club_id = cl.id WHERE cl.source = 'manual' OR cl.golfapi_club_id IS NULL) as manual_tees;
