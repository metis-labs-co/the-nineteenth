-- =====================================================
-- Seed Data: The Eastern Golf Club
-- =====================================================
-- 27-hole venue with 3 nines: South, North, East
-- Creates 3 playable 18-hole course combinations:
--   1. South/North Course
--   2. North/East Course
--   3. East/South Course
--
-- Data sourced from: https://www.easterngolfclub.com.au
-- =====================================================

-- =====================================================
-- STEP 1: CREATE THE VENUE
-- =====================================================

INSERT INTO venues (
  id,
  source,
  name,
  state,
  city,
  address,
  phone,
  website,
  total_holes,
  created_at,
  updated_at
) VALUES (
  'a1b2c3d4-e5f6-7890-abcd-ef1234567890', -- Fixed UUID for reference
  'manual',
  'The Eastern Golf Club',
  'VIC',
  'Doncaster East',
  '125 Victoria St, Doncaster East VIC 3109',
  '(03) 9842 5255',
  'https://www.easterngolfclub.com.au',
  27,
  NOW(),
  NOW()
);

-- =====================================================
-- STEP 2: CREATE THE THREE 18-HOLE COURSE COMBINATIONS
-- =====================================================

-- -----------------------------------------------------
-- South/North Course (South Nine + North Nine)
-- -----------------------------------------------------
INSERT INTO courses (
  id,
  venue_id,
  name,
  description,
  holes,
  slope_rating,
  course_rating,
  created_at,
  updated_at
) VALUES (
  'c1111111-1111-1111-1111-111111111111',
  'a1b2c3d4-e5f6-7890-abcd-ef1234567890',
  'South/North Course',
  'Starting on the South Nine, finishing on the North Nine. The original championship layout.',
  '[
    {"number": 1,  "par": 4, "strokeIndex": 11, "yardages": {"blue": 296}},
    {"number": 2,  "par": 5, "strokeIndex": 5,  "yardages": {"blue": 478}},
    {"number": 3,  "par": 4, "strokeIndex": 1,  "yardages": {"blue": 418}},
    {"number": 4,  "par": 4, "strokeIndex": 7,  "yardages": {"blue": 357}},
    {"number": 5,  "par": 4, "strokeIndex": 13, "yardages": {"blue": 326}},
    {"number": 6,  "par": 3, "strokeIndex": 17, "yardages": {"blue": 152}},
    {"number": 7,  "par": 4, "strokeIndex": 3,  "yardages": {"blue": 364}},
    {"number": 8,  "par": 3, "strokeIndex": 15, "yardages": {"blue": 171}},
    {"number": 9,  "par": 5, "strokeIndex": 9,  "yardages": {"blue": 495}},
    {"number": 10, "par": 4, "strokeIndex": 8,  "yardages": {"blue": 386}},
    {"number": 11, "par": 5, "strokeIndex": 4,  "yardages": {"blue": 502}},
    {"number": 12, "par": 4, "strokeIndex": 2,  "yardages": {"blue": 394}},
    {"number": 13, "par": 3, "strokeIndex": 16, "yardages": {"blue": 176}},
    {"number": 14, "par": 5, "strokeIndex": 6,  "yardages": {"blue": 537}},
    {"number": 15, "par": 4, "strokeIndex": 12, "yardages": {"blue": 343}},
    {"number": 16, "par": 4, "strokeIndex": 10, "yardages": {"blue": 351}},
    {"number": 17, "par": 3, "strokeIndex": 18, "yardages": {"blue": 144}},
    {"number": 18, "par": 4, "strokeIndex": 14, "yardages": {"blue": 414}}
  ]'::jsonb,
  NULL, -- Update with actual slope rating
  NULL, -- Update with actual course rating
  NOW(),
  NOW()
);

-- -----------------------------------------------------
-- North/East Course (North Nine + East Nine)
-- -----------------------------------------------------
INSERT INTO courses (
  id,
  venue_id,
  name,
  description,
  holes,
  slope_rating,
  course_rating,
  created_at,
  updated_at
) VALUES (
  'c2222222-2222-2222-2222-222222222222',
  'a1b2c3d4-e5f6-7890-abcd-ef1234567890',
  'North/East Course',
  'Starting on the North Nine, finishing on the East Nine.',
  '[
    {"number": 1,  "par": 4, "strokeIndex": 8,  "yardages": {"blue": 386}},
    {"number": 2,  "par": 5, "strokeIndex": 4,  "yardages": {"blue": 502}},
    {"number": 3,  "par": 4, "strokeIndex": 2,  "yardages": {"blue": 394}},
    {"number": 4,  "par": 3, "strokeIndex": 16, "yardages": {"blue": 176}},
    {"number": 5,  "par": 5, "strokeIndex": 6,  "yardages": {"blue": 537}},
    {"number": 6,  "par": 4, "strokeIndex": 12, "yardages": {"blue": 343}},
    {"number": 7,  "par": 4, "strokeIndex": 10, "yardages": {"blue": 351}},
    {"number": 8,  "par": 3, "strokeIndex": 18, "yardages": {"blue": 144}},
    {"number": 9,  "par": 4, "strokeIndex": 14, "yardages": {"blue": 414}},
    {"number": 10, "par": 5, "strokeIndex": 5,  "yardages": {"blue": 467}},
    {"number": 11, "par": 4, "strokeIndex": 7,  "yardages": {"blue": 381}},
    {"number": 12, "par": 3, "strokeIndex": 17, "yardages": {"blue": 137}},
    {"number": 13, "par": 5, "strokeIndex": 3,  "yardages": {"blue": 503}},
    {"number": 14, "par": 4, "strokeIndex": 9,  "yardages": {"blue": 347}},
    {"number": 15, "par": 4, "strokeIndex": 13, "yardages": {"blue": 310}},
    {"number": 16, "par": 3, "strokeIndex": 15, "yardages": {"blue": 168}},
    {"number": 17, "par": 4, "strokeIndex": 1,  "yardages": {"blue": 386}},
    {"number": 18, "par": 4, "strokeIndex": 11, "yardages": {"blue": 316}}
  ]'::jsonb,
  NULL,
  NULL,
  NOW(),
  NOW()
);

-- -----------------------------------------------------
-- East/South Course (East Nine + South Nine)
-- -----------------------------------------------------
INSERT INTO courses (
  id,
  venue_id,
  name,
  description,
  holes,
  slope_rating,
  course_rating,
  created_at,
  updated_at
) VALUES (
  'c3333333-3333-3333-3333-333333333333',
  'a1b2c3d4-e5f6-7890-abcd-ef1234567890',
  'East/South Course',
  'Starting on the East Nine, finishing on the South Nine.',
  '[
    {"number": 1,  "par": 5, "strokeIndex": 5,  "yardages": {"blue": 467}},
    {"number": 2,  "par": 4, "strokeIndex": 7,  "yardages": {"blue": 381}},
    {"number": 3,  "par": 3, "strokeIndex": 17, "yardages": {"blue": 137}},
    {"number": 4,  "par": 5, "strokeIndex": 3,  "yardages": {"blue": 503}},
    {"number": 5,  "par": 4, "strokeIndex": 9,  "yardages": {"blue": 347}},
    {"number": 6,  "par": 4, "strokeIndex": 13, "yardages": {"blue": 310}},
    {"number": 7,  "par": 3, "strokeIndex": 15, "yardages": {"blue": 168}},
    {"number": 8,  "par": 4, "strokeIndex": 1,  "yardages": {"blue": 386}},
    {"number": 9,  "par": 4, "strokeIndex": 11, "yardages": {"blue": 316}},
    {"number": 10, "par": 4, "strokeIndex": 10, "yardages": {"blue": 296}},
    {"number": 11, "par": 5, "strokeIndex": 4,  "yardages": {"blue": 478}},
    {"number": 12, "par": 4, "strokeIndex": 2,  "yardages": {"blue": 418}},
    {"number": 13, "par": 4, "strokeIndex": 8,  "yardages": {"blue": 357}},
    {"number": 14, "par": 4, "strokeIndex": 14, "yardages": {"blue": 326}},
    {"number": 15, "par": 3, "strokeIndex": 18, "yardages": {"blue": 152}},
    {"number": 16, "par": 4, "strokeIndex": 6,  "yardages": {"blue": 364}},
    {"number": 17, "par": 3, "strokeIndex": 16, "yardages": {"blue": 171}},
    {"number": 18, "par": 5, "strokeIndex": 12, "yardages": {"blue": 495}}
  ]'::jsonb,
  NULL,
  NULL,
  NOW(),
  NOW()
);

-- =====================================================
-- VERIFICATION QUERIES
-- =====================================================

-- Check the venue was created
-- SELECT * FROM venues WHERE name = 'The Eastern Golf Club';

-- Check all courses at the venue
-- SELECT id, name, description FROM courses WHERE venue_id = 'a1b2c3d4-e5f6-7890-abcd-ef1234567890';

-- Check hole details for South/North course
-- SELECT name, jsonb_array_length(holes) as hole_count FROM courses WHERE venue_id = 'a1b2c3d4-e5f6-7890-abcd-ef1234567890';

-- =====================================================
-- NOTES
-- =====================================================
--
-- 1. STROKE INDEXES: The stroke indexes in this script are estimates.
--    You should update them with the actual stroke indexes from the
--    club's scorecards for each course combination.
--
-- 2. YARDAGES: Only blue tee distances are included (from website).
--    Add other tees (black, white, red) when available:
--    "yardages": {"black": 320, "blue": 296, "white": 280, "red": 250}
--
-- 3. SLOPE/COURSE RATING: Set to NULL - update with actual ratings
--    from the club for each course combination.
--
-- 4. GPS COORDINATES: Add location to venue if needed:
--    UPDATE venues
--    SET location = ST_SetSRID(ST_MakePoint(145.1494, -37.7756), 4326)::geography
--    WHERE id = 'a1b2c3d4-e5f6-7890-abcd-ef1234567890';
--
-- =====================================================
