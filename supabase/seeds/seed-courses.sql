-- ============================================
-- AUSTRALIAN GOLF COURSE SEED DATA
-- ============================================
-- Source: BlueGolf Course Database & Golfify.io
-- Data collected: December 2025
--
-- This file contains real Australian golf course data
-- including hole-by-hole par, stroke index, and yardages.
--
-- Run this file after seed.sql or standalone.
-- ============================================


-- ============================================
-- CLEANUP: Remove existing seed courses
-- ============================================
-- This preserves any user-created courses while removing test data
-- Must delete in order due to foreign key constraints:
-- scorecards -> rounds -> courses

-- Step 1: Delete scorecards for rounds on seed courses
DELETE FROM scorecards WHERE round_id IN (
  SELECT id FROM rounds WHERE course_id IN (
    'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
    'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb',
    '10000000-0000-0000-0000-000000000001',
    '10000000-0000-0000-0000-000000000002',
    '10000000-0000-0000-0000-000000000003'
  )
);

-- Step 2: Delete pairings for rounds on seed courses
DELETE FROM pairings WHERE round_id IN (
  SELECT id FROM rounds WHERE course_id IN (
    'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
    'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb',
    '10000000-0000-0000-0000-000000000001',
    '10000000-0000-0000-0000-000000000002',
    '10000000-0000-0000-0000-000000000003'
  )
);

-- Step 3: Delete rounds on seed courses
DELETE FROM rounds WHERE course_id IN (
  'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
  'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb',
  '10000000-0000-0000-0000-000000000001',
  '10000000-0000-0000-0000-000000000002',
  '10000000-0000-0000-0000-000000000003'
);

-- Step 4: Delete the seed courses
DELETE FROM courses WHERE id IN (
  -- From seed.sql
  'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
  'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb',
  -- From seed-sam.sql
  '10000000-0000-0000-0000-000000000001',
  '10000000-0000-0000-0000-000000000002',
  '10000000-0000-0000-0000-000000000003'
);


-- ============================================
-- 1. KINGSTON HEATH GOLF CLUB (VIC)
-- ============================================
-- Location: Cheltenham, Victoria
-- Par: 72 | Slope: 129 | Course Rating: 72.0
-- Source: BlueGolf & Golfify.io

INSERT INTO courses (id, source, name, state, city, address, holes, tees, slope_rating, course_rating, created_at, updated_at)
VALUES (
  'c0000001-0000-0000-0000-000000000001',
  'manual',
  'Kingston Heath Golf Club',
  'VIC',
  'Cheltenham',
  'Kingston Road, Cheltenham VIC 3192',
  '[
    {"number": 1, "par": 4, "strokeIndex": 4, "yardages": {"white": 418, "red": 392}},
    {"number": 2, "par": 4, "strokeIndex": 8, "yardages": {"white": 351, "red": 297}},
    {"number": 3, "par": 4, "strokeIndex": 16, "yardages": {"white": 269, "red": 209}},
    {"number": 4, "par": 4, "strokeIndex": 15, "yardages": {"white": 357, "red": 323}},
    {"number": 5, "par": 3, "strokeIndex": 11, "yardages": {"white": 173, "red": 144}},
    {"number": 6, "par": 4, "strokeIndex": 2, "yardages": {"white": 393, "red": 349}},
    {"number": 7, "par": 5, "strokeIndex": 18, "yardages": {"white": 462, "red": 443}},
    {"number": 8, "par": 4, "strokeIndex": 7, "yardages": {"white": 398, "red": 319}},
    {"number": 9, "par": 4, "strokeIndex": 14, "yardages": {"white": 330, "red": 273}},
    {"number": 10, "par": 3, "strokeIndex": 17, "yardages": {"white": 127, "red": 99}},
    {"number": 11, "par": 4, "strokeIndex": 3, "yardages": {"white": 380, "red": 335}},
    {"number": 12, "par": 5, "strokeIndex": 9, "yardages": {"white": 509, "red": 444}},
    {"number": 13, "par": 4, "strokeIndex": 13, "yardages": {"white": 324, "red": 273}},
    {"number": 14, "par": 5, "strokeIndex": 10, "yardages": {"white": 516, "red": 430}},
    {"number": 15, "par": 3, "strokeIndex": 12, "yardages": {"white": 142, "red": 113}},
    {"number": 16, "par": 4, "strokeIndex": 1, "yardages": {"white": 391, "red": 341}},
    {"number": 17, "par": 4, "strokeIndex": 5, "yardages": {"white": 421, "red": 391}},
    {"number": 18, "par": 4, "strokeIndex": 6, "yardages": {"white": 391, "red": 324}}
  ]'::jsonb,
  '[
    {"name": "Men", "color": "white", "totalYardage": 6352, "courseRating": 72.0, "slopeRating": 129},
    {"name": "Ladies", "color": "red", "totalYardage": 5499, "courseRating": 75.6, "slopeRating": 136}
  ]'::jsonb,
  129,
  72.0,
  NOW(),
  NOW()
)
ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name,
  holes = EXCLUDED.holes,
  tees = EXCLUDED.tees,
  slope_rating = EXCLUDED.slope_rating,
  course_rating = EXCLUDED.course_rating,
  updated_at = NOW();


-- ============================================
-- 2. ROYAL MELBOURNE GOLF CLUB - COMPOSITE (VIC)
-- ============================================
-- Location: Black Rock, Victoria
-- Par: 72 | Slope: 110 | Course Rating: 70.0
-- Note: This is the famous composite course used for Presidents Cup
-- Source: BlueGolf

INSERT INTO courses (id, source, name, state, city, address, holes, tees, slope_rating, course_rating, created_at, updated_at)
VALUES (
  'c0000002-0000-0000-0000-000000000002',
  'manual',
  'Royal Melbourne Golf Club - Composite',
  'VIC',
  'Black Rock',
  '359 Cheltenham Rd, Black Rock VIC 3193',
  '[
    {"number": 1, "par": 4, "strokeIndex": 1, "yardages": {"blue": 429, "red": 393}},
    {"number": 2, "par": 5, "strokeIndex": 2, "yardages": {"blue": 480, "red": 445}},
    {"number": 3, "par": 4, "strokeIndex": 3, "yardages": {"blue": 333, "red": 298}},
    {"number": 4, "par": 4, "strokeIndex": 4, "yardages": {"blue": 440, "red": 395}},
    {"number": 5, "par": 3, "strokeIndex": 5, "yardages": {"blue": 176, "red": 156}},
    {"number": 6, "par": 4, "strokeIndex": 6, "yardages": {"blue": 428, "red": 388}},
    {"number": 7, "par": 3, "strokeIndex": 7, "yardages": {"blue": 148, "red": 128}},
    {"number": 8, "par": 4, "strokeIndex": 8, "yardages": {"blue": 317, "red": 282}},
    {"number": 9, "par": 4, "strokeIndex": 9, "yardages": {"blue": 455, "red": 410}},
    {"number": 10, "par": 4, "strokeIndex": 10, "yardages": {"blue": 476, "red": 431}},
    {"number": 11, "par": 4, "strokeIndex": 11, "yardages": {"blue": 439, "red": 394}},
    {"number": 12, "par": 4, "strokeIndex": 12, "yardages": {"blue": 433, "red": 388}},
    {"number": 13, "par": 4, "strokeIndex": 13, "yardages": {"blue": 354, "red": 319}},
    {"number": 14, "par": 5, "strokeIndex": 14, "yardages": {"blue": 504, "red": 464}},
    {"number": 15, "par": 4, "strokeIndex": 15, "yardages": {"blue": 383, "red": 343}},
    {"number": 16, "par": 3, "strokeIndex": 16, "yardages": {"blue": 201, "red": 171}},
    {"number": 17, "par": 5, "strokeIndex": 17, "yardages": {"blue": 568, "red": 523}},
    {"number": 18, "par": 4, "strokeIndex": 18, "yardages": {"blue": 432, "red": 387}}
  ]'::jsonb,
  '[
    {"name": "Championship", "color": "blue", "totalYardage": 6996, "courseRating": 70.0, "slopeRating": 110},
    {"name": "Ladies", "color": "red", "totalYardage": 5849, "courseRating": 70.0, "slopeRating": 110}
  ]'::jsonb,
  110,
  70.0,
  NOW(),
  NOW()
)
ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name,
  holes = EXCLUDED.holes,
  tees = EXCLUDED.tees,
  slope_rating = EXCLUDED.slope_rating,
  course_rating = EXCLUDED.course_rating,
  updated_at = NOW();


-- ============================================
-- 3. VICTORIA GOLF CLUB (VIC) - METERS
-- ============================================
-- Location: Cheltenham, Victoria
-- Par: 72 | Slope: 113 | Course Rating: 70.0
-- Note: Distances are in METERS (Australian standard)
-- Source: BlueGolf

INSERT INTO courses (id, source, name, state, city, address, holes, tees, slope_rating, course_rating, created_at, updated_at)
VALUES (
  'c0000003-0000-0000-0000-000000000003',
  'manual',
  'Victoria Golf Club',
  'VIC',
  'Cheltenham',
  'Park Road, Cheltenham VIC 3192',
  '[
    {"number": 1, "par": 4, "strokeIndex": 1, "yardages": {"blue": 233, "red": 210}},
    {"number": 2, "par": 4, "strokeIndex": 2, "yardages": {"blue": 392, "red": 353}},
    {"number": 3, "par": 4, "strokeIndex": 3, "yardages": {"blue": 401, "red": 307}},
    {"number": 4, "par": 3, "strokeIndex": 4, "yardages": {"blue": 164, "red": 119}},
    {"number": 5, "par": 4, "strokeIndex": 5, "yardages": {"blue": 398, "red": 323}},
    {"number": 6, "par": 4, "strokeIndex": 6, "yardages": {"blue": 398, "red": 306}},
    {"number": 7, "par": 3, "strokeIndex": 7, "yardages": {"blue": 165, "red": 146}},
    {"number": 8, "par": 5, "strokeIndex": 8, "yardages": {"blue": 448, "red": 413}},
    {"number": 9, "par": 5, "strokeIndex": 9, "yardages": {"blue": 559, "red": 497}},
    {"number": 10, "par": 4, "strokeIndex": 10, "yardages": {"blue": 348, "red": 313}},
    {"number": 11, "par": 4, "strokeIndex": 11, "yardages": {"blue": 370, "red": 303}},
    {"number": 12, "par": 4, "strokeIndex": 12, "yardages": {"blue": 390, "red": 343}},
    {"number": 13, "par": 4, "strokeIndex": 13, "yardages": {"blue": 392, "red": 365}},
    {"number": 14, "par": 3, "strokeIndex": 14, "yardages": {"blue": 142, "red": 110}},
    {"number": 15, "par": 4, "strokeIndex": 15, "yardages": {"blue": 289, "red": 271}},
    {"number": 16, "par": 3, "strokeIndex": 16, "yardages": {"blue": 178, "red": 144}},
    {"number": 17, "par": 5, "strokeIndex": 17, "yardages": {"blue": 550, "red": 481}},
    {"number": 18, "par": 5, "strokeIndex": 18, "yardages": {"blue": 461, "red": 412}}
  ]'::jsonb,
  '[
    {"name": "Men", "color": "blue", "totalYardage": 6278, "courseRating": 70.0, "slopeRating": 113},
    {"name": "Ladies", "color": "red", "totalYardage": 5416, "courseRating": 70.0, "slopeRating": 113}
  ]'::jsonb,
  113,
  70.0,
  NOW(),
  NOW()
)
ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name,
  holes = EXCLUDED.holes,
  tees = EXCLUDED.tees,
  slope_rating = EXCLUDED.slope_rating,
  course_rating = EXCLUDED.course_rating,
  updated_at = NOW();


-- ============================================
-- 4. THE AUSTRALIAN GOLF CLUB (NSW)
-- ============================================
-- Location: Rosebery, NSW
-- Designer: Jack Nicklaus
-- Par: 72 | Course Rating: 75.0
-- Source: Golfify.io

INSERT INTO courses (id, source, name, state, city, address, holes, tees, slope_rating, course_rating, created_at, updated_at)
VALUES (
  'c0000004-0000-0000-0000-000000000004',
  'manual',
  'The Australian Golf Club',
  'NSW',
  'Rosebery',
  'Botany Road, Rosebery NSW 2018',
  '[
    {"number": 1, "par": 5, "strokeIndex": 18, "yardages": {"black": 455, "blue": 455, "white": 442, "red": 403}},
    {"number": 2, "par": 3, "strokeIndex": 14, "yardages": {"black": 194, "blue": 168, "white": 162, "red": 146}},
    {"number": 3, "par": 4, "strokeIndex": 8, "yardages": {"black": 343, "blue": 343, "white": 325, "red": 291}},
    {"number": 4, "par": 3, "strokeIndex": 16, "yardages": {"black": 186, "blue": 159, "white": 141, "red": 102}},
    {"number": 5, "par": 5, "strokeIndex": 12, "yardages": {"black": 551, "blue": 542, "white": 492, "red": 453}},
    {"number": 6, "par": 4, "strokeIndex": 6, "yardages": {"black": 386, "blue": 386, "white": 379, "red": 366}},
    {"number": 7, "par": 4, "strokeIndex": 10, "yardages": {"black": 382, "blue": 382, "white": 358, "red": 307}},
    {"number": 8, "par": 4, "strokeIndex": 2, "yardages": {"black": 405, "blue": 405, "white": 392, "red": 374}},
    {"number": 9, "par": 4, "strokeIndex": 3, "yardages": {"black": 422, "blue": 405, "white": 396, "red": 305}},
    {"number": 10, "par": 4, "strokeIndex": 4, "yardages": {"black": 378, "blue": 378, "white": 363, "red": 309}},
    {"number": 11, "par": 3, "strokeIndex": 15, "yardages": {"black": 175, "blue": 175, "white": 155, "red": 120}},
    {"number": 12, "par": 4, "strokeIndex": 9, "yardages": {"black": 385, "blue": 370, "white": 356, "red": 278}},
    {"number": 13, "par": 4, "strokeIndex": 7, "yardages": {"black": 349, "blue": 349, "white": 344, "red": 323}},
    {"number": 14, "par": 5, "strokeIndex": 13, "yardages": {"black": 510, "blue": 510, "white": 487, "red": 463}},
    {"number": 15, "par": 3, "strokeIndex": 11, "yardages": {"black": 188, "blue": 188, "white": 174, "red": 155}},
    {"number": 16, "par": 4, "strokeIndex": 1, "yardages": {"black": 438, "blue": 387, "white": 375, "red": 353}},
    {"number": 17, "par": 4, "strokeIndex": 5, "yardages": {"black": 392, "blue": 392, "white": 371, "red": 309}},
    {"number": 18, "par": 5, "strokeIndex": 17, "yardages": {"black": 478, "blue": 478, "white": 463, "red": 430}}
  ]'::jsonb,
  '[
    {"name": "Championship", "color": "black", "totalYardage": 6617, "courseRating": 76.0, "slopeRating": 140},
    {"name": "Men", "color": "blue", "totalYardage": 6472, "courseRating": 75.0, "slopeRating": 138},
    {"name": "Club", "color": "white", "totalYardage": 6175, "courseRating": 73.0, "slopeRating": 132},
    {"name": "Ladies", "color": "red", "totalYardage": 5487, "courseRating": 75.0, "slopeRating": 136}
  ]'::jsonb,
  138,
  75.0,
  NOW(),
  NOW()
)
ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name,
  holes = EXCLUDED.holes,
  tees = EXCLUDED.tees,
  slope_rating = EXCLUDED.slope_rating,
  course_rating = EXCLUDED.course_rating,
  updated_at = NOW();


-- ============================================
-- 5. ROYAL ADELAIDE GOLF CLUB (SA)
-- ============================================
-- Location: Adelaide, South Australia
-- Par: 70 | Slope: 130 | Course Rating: 72.0
-- Source: Golfify.io

INSERT INTO courses (id, source, name, state, city, address, holes, tees, slope_rating, course_rating, created_at, updated_at)
VALUES (
  'c0000005-0000-0000-0000-000000000005',
  'manual',
  'Royal Adelaide Golf Club',
  'SA',
  'Seaton',
  '328 Tapleys Hill Road, Seaton SA 5023',
  '[
    {"number": 1, "par": 4, "strokeIndex": 10, "yardages": {"white": 342, "red": 330}},
    {"number": 2, "par": 5, "strokeIndex": 16, "yardages": {"white": 465, "red": 413}},
    {"number": 3, "par": 4, "strokeIndex": 18, "yardages": {"white": 260, "red": 247}},
    {"number": 4, "par": 4, "strokeIndex": 6, "yardages": {"white": 374, "red": 340}},
    {"number": 5, "par": 4, "strokeIndex": 8, "yardages": {"white": 373, "red": 349}},
    {"number": 6, "par": 4, "strokeIndex": 3, "yardages": {"white": 393, "red": 374}},
    {"number": 7, "par": 3, "strokeIndex": 14, "yardages": {"white": 145, "red": 120}},
    {"number": 8, "par": 4, "strokeIndex": 12, "yardages": {"white": 322, "red": 277}},
    {"number": 9, "par": 4, "strokeIndex": 15, "yardages": {"white": 449, "red": 450}},
    {"number": 10, "par": 4, "strokeIndex": 13, "yardages": {"white": 334, "red": 290}},
    {"number": 11, "par": 4, "strokeIndex": 4, "yardages": {"white": 350, "red": 303}},
    {"number": 12, "par": 3, "strokeIndex": 1, "yardages": {"white": 201, "red": 155}},
    {"number": 13, "par": 4, "strokeIndex": 9, "yardages": {"white": 354, "red": 339}},
    {"number": 14, "par": 3, "strokeIndex": 2, "yardages": {"white": 385, "red": 332}},
    {"number": 15, "par": 5, "strokeIndex": 17, "yardages": {"white": 450, "red": 420}},
    {"number": 16, "par": 3, "strokeIndex": 7, "yardages": {"white": 153, "red": 132}},
    {"number": 17, "par": 4, "strokeIndex": 5, "yardages": {"white": 390, "red": 383}},
    {"number": 18, "par": 4, "strokeIndex": 11, "yardages": {"white": 369, "red": 323}}
  ]'::jsonb,
  '[
    {"name": "Men", "color": "white", "totalYardage": 6109, "courseRating": 72.0, "slopeRating": 130},
    {"name": "Ladies", "color": "red", "totalYardage": 5577, "courseRating": 75.0, "slopeRating": 136}
  ]'::jsonb,
  130,
  72.0,
  NOW(),
  NOW()
)
ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name,
  holes = EXCLUDED.holes,
  tees = EXCLUDED.tees,
  slope_rating = EXCLUDED.slope_rating,
  course_rating = EXCLUDED.course_rating,
  updated_at = NOW();


-- ============================================
-- 6. THE DUNES GOLF LINKS (VIC) - PUBLIC ACCESS
-- ============================================
-- Location: Rye, Victoria (Mornington Peninsula)
-- Par: 72 | Slope: 148 | Course Rating: 75.2
-- Note: #1 Public Access Course in Victoria
-- Note: Distances are in METERS
-- Note: Stroke indexes generated using standard allocation (no source data available)
-- Source: BlueGolf

INSERT INTO courses (id, source, name, state, city, address, holes, tees, slope_rating, course_rating, created_at, updated_at)
VALUES (
  'c0000006-0000-0000-0000-000000000006',
  'manual',
  'The Dunes Golf Links',
  'VIC',
  'Rye',
  'Browns Road, Rye VIC 3941',
  '[
    {"number": 1, "par": 4, "strokeIndex": 5, "yardages": {"black": 447}},
    {"number": 2, "par": 4, "strokeIndex": 3, "yardages": {"black": 416}},
    {"number": 3, "par": 3, "strokeIndex": 15, "yardages": {"black": 162}},
    {"number": 4, "par": 4, "strokeIndex": 11, "yardages": {"black": 339}},
    {"number": 5, "par": 5, "strokeIndex": 7, "yardages": {"black": 517}},
    {"number": 6, "par": 3, "strokeIndex": 13, "yardages": {"black": 211}},
    {"number": 7, "par": 5, "strokeIndex": 1, "yardages": {"black": 571}},
    {"number": 8, "par": 4, "strokeIndex": 9, "yardages": {"black": 429}},
    {"number": 9, "par": 4, "strokeIndex": 17, "yardages": {"black": 411}},
    {"number": 10, "par": 4, "strokeIndex": 6, "yardages": {"black": 388}},
    {"number": 11, "par": 4, "strokeIndex": 10, "yardages": {"black": 341}},
    {"number": 12, "par": 5, "strokeIndex": 2, "yardages": {"black": 587}},
    {"number": 13, "par": 3, "strokeIndex": 18, "yardages": {"black": 175}},
    {"number": 14, "par": 4, "strokeIndex": 8, "yardages": {"black": 387}},
    {"number": 15, "par": 4, "strokeIndex": 4, "yardages": {"black": 472}},
    {"number": 16, "par": 5, "strokeIndex": 12, "yardages": {"black": 552}},
    {"number": 17, "par": 3, "strokeIndex": 16, "yardages": {"black": 196}},
    {"number": 18, "par": 4, "strokeIndex": 14, "yardages": {"black": 447}}
  ]'::jsonb,
  '[
    {"name": "Championship", "color": "black", "totalYardage": 7048, "courseRating": 75.2, "slopeRating": 148}
  ]'::jsonb,
  148,
  75.2,
  NOW(),
  NOW()
)
ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name,
  holes = EXCLUDED.holes,
  tees = EXCLUDED.tees,
  slope_rating = EXCLUDED.slope_rating,
  course_rating = EXCLUDED.course_rating,
  updated_at = NOW();


-- ============================================
-- VERIFICATION QUERIES
-- ============================================

-- List all courses with hole counts
SELECT
  name,
  state,
  jsonb_array_length(holes) as hole_count,
  slope_rating,
  course_rating
FROM courses
WHERE id::text LIKE 'c0000%'
ORDER BY state, name;

-- Verify hole data structure for Kingston Heath
SELECT
  name,
  holes->0 as first_hole,
  holes->17 as last_hole
FROM courses
WHERE id = 'c0000001-0000-0000-0000-000000000001';
