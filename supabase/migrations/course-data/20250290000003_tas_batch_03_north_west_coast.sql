-- TAS Batch 3: North West Coast
-- 4 courses with full hole-by-hole data (18 holes each)
-- Source: golfify.io
-- Generated: 2025-12-11

-- ============================================================================
-- 1. DEVONPORT GOLF CLUB
-- ============================================================================
INSERT INTO venues (id, source, name, state, city, address, phone, website, total_holes)
VALUES (
  'f2a3b4c5-d6e7-8901-abcd-500000000911',
  'manual',
  'Devonport Golf Club',
  'TAS',
  'Spreyton',
  '66 Woodrising Avenue',
  NULL,
  'https://www.devonportgolfclub.com.au',
  18
)
ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name,
  city = EXCLUDED.city,
  address = EXCLUDED.address,
  phone = EXCLUDED.phone,
  website = EXCLUDED.website;

INSERT INTO courses (venue_id, name, description, slope_rating, course_rating, holes, tees)
VALUES (
  'f2a3b4c5-d6e7-8901-abcd-500000000911',
  'Devonport Golf Club',
  'Premier parkland course in North-West Tasmania established 1921. Championship layout serving the Devonport region.',
  NULL,
  NULL,
  '[
    {"hole": 1, "par": 4, "stroke_index": 1, "par_red": 5, "stroke_index_red": 1, "yards_white": 386, "yards_red": 346},
    {"hole": 2, "par": 4, "stroke_index": 3, "stroke_index_red": 3, "yards_white": 335, "yards_red": 279},
    {"hole": 3, "par": 5, "stroke_index": 5, "stroke_index_red": 5, "yards_white": 457, "yards_red": 429},
    {"hole": 4, "par": 4, "stroke_index": 7, "stroke_index_red": 7, "yards_white": 353, "yards_red": 309},
    {"hole": 5, "par": 3, "stroke_index": 9, "stroke_index_red": 9, "yards_white": 170, "yards_red": 146},
    {"hole": 6, "par": 4, "stroke_index": 11, "par_red": 5, "stroke_index_red": 11, "yards_white": 404, "yards_red": 386},
    {"hole": 7, "par": 4, "stroke_index": 13, "stroke_index_red": 13, "yards_white": 337, "yards_red": 318},
    {"hole": 8, "par": 4, "stroke_index": 15, "stroke_index_red": 15, "yards_white": 372, "yards_red": 334},
    {"hole": 9, "par": 3, "stroke_index": 17, "stroke_index_red": 17, "yards_white": 136, "yards_red": 116},
    {"hole": 10, "par": 3, "stroke_index": 2, "stroke_index_red": 2, "yards_white": 156, "yards_red": 140},
    {"hole": 11, "par": 4, "stroke_index": 4, "par_red": 5, "stroke_index_red": 4, "yards_white": 384, "yards_red": 361},
    {"hole": 12, "par": 4, "stroke_index": 6, "stroke_index_red": 6, "yards_white": 332, "yards_red": 242},
    {"hole": 13, "par": 5, "stroke_index": 8, "stroke_index_red": 8, "yards_white": 424, "yards_red": 408},
    {"hole": 14, "par": 3, "stroke_index": 10, "stroke_index_red": 10, "yards_white": 199, "yards_red": 174},
    {"hole": 15, "par": 4, "stroke_index": 12, "par_red": 5, "stroke_index_red": 12, "yards_white": 386, "yards_red": 375},
    {"hole": 16, "par": 4, "stroke_index": 14, "stroke_index_red": 14, "yards_white": 356, "yards_red": 314},
    {"hole": 17, "par": 4, "stroke_index": 16, "stroke_index_red": 16, "yards_white": 349, "yards_red": 314},
    {"hole": 18, "par": 4, "stroke_index": 18, "stroke_index_red": 18, "yards_white": 364, "yards_red": 301}
  ]'::jsonb,
  '[
    {"name": "White", "color": "white", "rating": null, "slope": null, "par": 70, "yards": 5900},
    {"name": "Red", "color": "red", "rating": null, "slope": null, "par": 74, "yards": 5292}
  ]'::jsonb
)
ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name,
  tees = EXCLUDED.tees,
  holes = EXCLUDED.holes,
  updated_at = NOW();

-- ============================================================================
-- 2. ULVERSTONE GOLF CLUB
-- ============================================================================
INSERT INTO venues (id, source, name, state, city, address, phone, website, total_holes)
VALUES (
  'f2a3b4c5-d6e7-8901-abcd-500000000912',
  'manual',
  'Ulverstone Golf Club',
  'TAS',
  'Ulverstone',
  'Lobster Creek Road',
  NULL,
  NULL,
  18
)
ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name,
  city = EXCLUDED.city,
  address = EXCLUDED.address,
  phone = EXCLUDED.phone,
  website = EXCLUDED.website;

INSERT INTO courses (venue_id, name, description, slope_rating, course_rating, holes, tees)
VALUES (
  'f2a3b4c5-d6e7-8901-abcd-500000000912',
  'Ulverstone Golf Club',
  'Parkland course on Tasmania',
  NULL,
  NULL,
  '[
    {"hole": 1, "par": 5, "stroke_index": 16, "stroke_index_red": 18, "yards_blue": 440, "yards_red": 376},
    {"hole": 2, "par": 4, "stroke_index": 12, "stroke_index_red": 12, "yards_blue": 335, "yards_red": 295},
    {"hole": 3, "par": 4, "stroke_index": 11, "stroke_index_red": 13, "yards_blue": 330, "yards_red": 276},
    {"hole": 4, "par": 4, "stroke_index": 6, "stroke_index_red": 7, "yards_blue": 350, "yards_red": 305},
    {"hole": 5, "par": 3, "stroke_index": 14, "stroke_index_red": 15, "yards_blue": 158, "yards_red": 128},
    {"hole": 6, "par": 5, "stroke_index": 3, "stroke_index_red": 8, "yards_blue": 484, "yards_red": 370},
    {"hole": 7, "par": 4, "stroke_index": 2, "stroke_index_red": 2, "yards_blue": 370, "yards_red": 327},
    {"hole": 8, "par": 4, "stroke_index": 4, "stroke_index_red": 11, "yards_blue": 392, "yards_red": 312},
    {"hole": 9, "par": 3, "stroke_index": 18, "stroke_index_red": 17, "yards_blue": 130, "yards_red": 123},
    {"hole": 10, "par": 4, "stroke_index": 8, "par_red": 5, "stroke_index_red": 5, "yards_blue": 402, "yards_red": 383},
    {"hole": 11, "par": 5, "stroke_index": 9, "stroke_index_red": 6, "yards_blue": 505, "yards_red": 410},
    {"hole": 12, "par": 4, "stroke_index": 5, "stroke_index_red": 4, "yards_blue": 375, "yards_red": 323},
    {"hole": 13, "par": 3, "stroke_index": 15, "stroke_index_red": 16, "yards_blue": 151, "yards_red": 142},
    {"hole": 14, "par": 4, "stroke_index": 1, "stroke_index_red": 1, "yards_blue": 383, "yards_red": 340},
    {"hole": 15, "par": 4, "stroke_index": 10, "stroke_index_red": 3, "yards_blue": 360, "yards_red": 308},
    {"hole": 16, "par": 4, "stroke_index": 7, "stroke_index_red": 9, "yards_blue": 340, "yards_red": 291},
    {"hole": 17, "par": 5, "stroke_index": 13, "stroke_index_red": 10, "yards_blue": 463, "yards_red": 386},
    {"hole": 18, "par": 3, "stroke_index": 17, "stroke_index_red": 14, "yards_blue": 136, "yards_red": 131}
  ]'::jsonb,
  '[
    {"name": "Mens", "color": "blue", "rating": null, "slope": null, "par": 72, "yards": 6104},
    {"name": "Ladies", "color": "red", "rating": null, "slope": null, "par": 73, "yards": 5226}
  ]'::jsonb
)
ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name,
  tees = EXCLUDED.tees,
  holes = EXCLUDED.holes,
  updated_at = NOW();

-- ============================================================================
-- 3. BURNIE GOLF CLUB
-- ============================================================================
INSERT INTO venues (id, source, name, state, city, address, phone, website, total_holes)
VALUES (
  'f2a3b4c5-d6e7-8901-abcd-500000000913',
  'manual',
  'Burnie Golf Club',
  'TAS',
  'Camdale',
  '47-49 Scarfe Street',
  NULL,
  'https://www.burniegolfclub.com.au',
  18
)
ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name,
  city = EXCLUDED.city,
  address = EXCLUDED.address,
  phone = EXCLUDED.phone,
  website = EXCLUDED.website;

INSERT INTO courses (venue_id, name, description, slope_rating, course_rating, holes, tees)
VALUES (
  'f2a3b4c5-d6e7-8901-abcd-500000000913',
  'Burnie Golf Club',
  'Parkland course on Tasmania',
  121,
  71.0,
  '[
    {"hole": 1, "par": 4, "stroke_index": 13, "stroke_index_red": 5, "yards_white": 326, "yards_red": 319},
    {"hole": 2, "par": 4, "stroke_index": 11, "stroke_index_red": 3, "yards_white": 317, "yards_red": 296},
    {"hole": 3, "par": 5, "stroke_index": 6, "stroke_index_red": 10, "yards_white": 524, "yards_red": 401},
    {"hole": 4, "par": 3, "stroke_index": 2, "stroke_index_red": 16, "yards_white": 162, "yards_red": 126},
    {"hole": 5, "par": 4, "stroke_index": 10, "stroke_index_red": 14, "yards_white": 340, "yards_red": 270},
    {"hole": 6, "par": 3, "stroke_index": 18, "stroke_index_red": 17, "yards_white": 120, "yards_red": 121},
    {"hole": 7, "par": 5, "stroke_index": 5, "stroke_index_red": 1, "yards_white": 497, "yards_red": 434},
    {"hole": 8, "par": 4, "stroke_index": 8, "stroke_index_red": 4, "yards_white": 361, "yards_red": 312},
    {"hole": 9, "par": 4, "stroke_index": 12, "stroke_index_red": 9, "yards_white": 332, "yards_red": 270},
    {"hole": 10, "par": 4, "stroke_index": 16, "stroke_index_red": 8, "yards_white": 309, "yards_red": 303},
    {"hole": 11, "par": 4, "stroke_index": 9, "stroke_index_red": 6, "yards_white": 326, "yards_red": 289},
    {"hole": 12, "par": 5, "stroke_index": 3, "stroke_index_red": 7, "yards_white": 539, "yards_red": 428},
    {"hole": 13, "par": 3, "stroke_index": 1, "stroke_index_red": 15, "yards_white": 166, "yards_red": 129},
    {"hole": 14, "par": 4, "stroke_index": 15, "stroke_index_red": 13, "yards_white": 320, "yards_red": 276},
    {"hole": 15, "par": 3, "stroke_index": 17, "stroke_index_red": 18, "yards_white": 134, "yards_red": 103},
    {"hole": 16, "par": 5, "stroke_index": 7, "stroke_index_red": 2, "yards_white": 493, "yards_red": 403},
    {"hole": 17, "par": 4, "stroke_index": 4, "stroke_index_red": 11, "yards_white": 369, "yards_red": 286},
    {"hole": 18, "par": 4, "stroke_index": 14, "stroke_index_red": 12, "yards_white": 331, "yards_red": 256}
  ]'::jsonb,
  '[
    {"name": "Men", "color": "white", "rating": 71.0, "slope": 121, "par": 72, "yards": 5966},
    {"name": "Ladies", "color": "red", "rating": 71.0, "slope": 117, "par": 72, "yards": 5022}
  ]'::jsonb
)
ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name,
  tees = EXCLUDED.tees,
  holes = EXCLUDED.holes,
  updated_at = NOW();
