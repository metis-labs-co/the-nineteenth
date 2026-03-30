-- =============================================================================
-- Update "Shark Waters" 9-Hole Par 3 Course
-- =============================================================================
-- This script finds the existing Shark Waters course (created via build-as-you-play)
-- and replaces its hole data with the correct 9-hole par 3 configuration.
--
-- Run via: Supabase SQL Editor or psql
-- =============================================================================

BEGIN;

-- Step 1: Find the course and display current state
-- -------------------------------------------------
SELECT
  c.id AS course_id,
  c.name AS course_name,
  c.num_holes,
  c.measure_unit,
  c.holes,
  cl.id AS club_id,
  cl.name AS club_name
FROM courses c
JOIN clubs cl ON cl.id = c.club_id
WHERE c.name ILIKE '%Shark Waters%'
   OR cl.name ILIKE '%Shark Waters%';

-- Step 2: Show existing tees
-- --------------------------
SELECT
  t.id AS tee_id,
  t.name AS tee_name,
  t.color,
  t.measure_unit,
  t.length_hole_1, t.length_hole_2, t.length_hole_3,
  t.length_hole_4, t.length_hole_5, t.length_hole_6,
  t.length_hole_7, t.length_hole_8, t.length_hole_9,
  t.length_hole_10, t.length_hole_11, t.length_hole_12,
  t.total_length
FROM tees t
JOIN courses c ON c.id = t.course_id
JOIN clubs cl ON cl.id = c.club_id
WHERE c.name ILIKE '%Shark Waters%'
   OR cl.name ILIKE '%Shark Waters%';

-- Step 3: Update course — set num_holes, measure_unit, and holes JSONB
-- ---------------------------------------------------------------------
UPDATE courses
SET
  num_holes = 9,
  measure_unit = 'm',
  holes = '[
    {"number": 1, "par": 3, "strokeIndex": 3},
    {"number": 2, "par": 3, "strokeIndex": 5},
    {"number": 3, "par": 3, "strokeIndex": 6},
    {"number": 4, "par": 3, "strokeIndex": 4},
    {"number": 5, "par": 3, "strokeIndex": 9},
    {"number": 6, "par": 3, "strokeIndex": 7},
    {"number": 7, "par": 3, "strokeIndex": 1},
    {"number": 8, "par": 3, "strokeIndex": 8},
    {"number": 9, "par": 3, "strokeIndex": 2}
  ]'::jsonb,
  updated_at = NOW()
WHERE id = (
  SELECT c.id
  FROM courses c
  JOIN clubs cl ON cl.id = c.club_id
  WHERE c.name ILIKE '%Shark Waters%'
     OR cl.name ILIKE '%Shark Waters%'
  LIMIT 1
);

-- Step 4: Update tees — set per-hole distances, clear holes 10-18
-- ----------------------------------------------------------------
UPDATE tees
SET
  measure_unit = 'm',
  length_hole_1  = 153,
  length_hole_2  = 135,
  length_hole_3  = 124,
  length_hole_4  = 121,
  length_hole_5  = 105,
  length_hole_6  = 129,
  length_hole_7  = 165,
  length_hole_8  = 117,
  length_hole_9  = 142,
  length_hole_10 = NULL,
  length_hole_11 = NULL,
  length_hole_12 = NULL,
  length_hole_13 = NULL,
  length_hole_14 = NULL,
  length_hole_15 = NULL,
  length_hole_16 = NULL,
  length_hole_17 = NULL,
  length_hole_18 = NULL,
  updated_at = NOW()
WHERE course_id = (
  SELECT c.id
  FROM courses c
  JOIN clubs cl ON cl.id = c.club_id
  WHERE c.name ILIKE '%Shark Waters%'
     OR cl.name ILIKE '%Shark Waters%'
  LIMIT 1
);

-- Step 5: Verify the updates
-- --------------------------
SELECT
  c.id AS course_id,
  c.name AS course_name,
  c.num_holes,
  c.measure_unit,
  c.holes,
  cl.name AS club_name
FROM courses c
JOIN clubs cl ON cl.id = c.club_id
WHERE c.name ILIKE '%Shark Waters%'
   OR cl.name ILIKE '%Shark Waters%';

SELECT
  t.id AS tee_id,
  t.name AS tee_name,
  t.measure_unit,
  t.length_hole_1, t.length_hole_2, t.length_hole_3,
  t.length_hole_4, t.length_hole_5, t.length_hole_6,
  t.length_hole_7, t.length_hole_8, t.length_hole_9,
  t.total_length, t.front9_length
FROM tees t
JOIN courses c ON c.id = t.course_id
JOIN clubs cl ON cl.id = c.club_id
WHERE c.name ILIKE '%Shark Waters%'
   OR cl.name ILIKE '%Shark Waters%';

COMMIT;
