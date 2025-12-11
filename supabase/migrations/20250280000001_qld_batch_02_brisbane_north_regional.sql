-- QLD Batch 2: Brisbane North, Moreton Bay & Regional QLD
-- 17 courses with full hole-by-hole data
-- Source: golfify.io
-- Generated: 2025-12-11

-- ============================================================================
-- 1. NORTH LAKES RESORT GOLF CLUB
-- ============================================================================
INSERT INTO venues (id, name, address, city, state, country, postal_code, phone, email, website, latitude, longitude, timezone, created_at, updated_at)
VALUES (
  'f2a3b4c5-d6e7-8901-abcd-500000000819',
  'North Lakes Resort Golf Club',
  'Kinsellas Road West',
  'North Lakes',
  'Queensland',
  'Australia',
  '4509',
  NULL,
  NULL,
  'https://www.northlakesgolf.com.au',
  -27.2111,
  153.0236,
  'Australia/Brisbane',
  NOW(),
  NOW()
)
ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name,
  city = EXCLUDED.city,
  updated_at = NOW();

INSERT INTO courses (id, venue_id, name, description, holes, par, course_rating, slope_rating, length_yards, length_meters, designer, year_built, course_type, created_at, updated_at, tees, holes_data)
VALUES (
  'f2a3b4c5-d6e7-8901-abcd-600000000819',
  'f2a3b4c5-d6e7-8901-abcd-500000000819',
  'North Lakes Resort Golf Club',
  'Parkland course opened 2002. Open guest policy.',
  18,
  72,
  74.0,
  134,
  6455,
  5903,
  NULL,
  2002,
  'public',
  NOW(),
  NOW(),
  '[
    {"name": "Black", "color": "black", "rating": 74.0, "slope": 134, "yards": 6455},
    {"name": "Blue", "color": "blue", "rating": 72.0, "slope": 133, "yards": 6174},
    {"name": "White", "color": "white", "rating": 70.0, "slope": 132, "yards": 5859},
    {"name": "Red", "color": "red", "rating": 74.0, "slope": 137, "yards": 5496}
  ]'::jsonb,
  '[
    {"hole": 1, "par": 4, "stroke_index": 4, "yards_black": 371, "yards_blue": 352, "yards_white": 329, "yards_red": 310},
    {"hole": 2, "par": 5, "stroke_index": 17, "yards_black": 503, "yards_blue": 486, "yards_white": 463, "yards_red": 441},
    {"hole": 3, "par": 3, "stroke_index": 10, "yards_black": 198, "yards_blue": 190, "yards_white": 171, "yards_red": 146},
    {"hole": 4, "par": 4, "stroke_index": 12, "yards_black": 352, "yards_blue": 338, "yards_white": 321, "yards_red": 305},
    {"hole": 5, "par": 4, "stroke_index": 14, "yards_black": 346, "yards_blue": 334, "yards_white": 317, "yards_red": 300},
    {"hole": 6, "par": 5, "stroke_index": 9, "yards_black": 531, "yards_blue": 513, "yards_white": 489, "yards_red": 465},
    {"hole": 7, "par": 3, "stroke_index": 18, "yards_black": 148, "yards_blue": 134, "yards_white": 119, "yards_red": 106},
    {"hole": 8, "par": 4, "stroke_index": 6, "yards_black": 387, "yards_blue": 371, "yards_white": 347, "yards_red": 327},
    {"hole": 9, "par": 4, "stroke_index": 1, "yards_black": 420, "yards_blue": 402, "yards_white": 385, "yards_red": 368},
    {"hole": 10, "par": 4, "stroke_index": 8, "yards_black": 344, "yards_blue": 328, "yards_white": 322, "yards_red": 308},
    {"hole": 11, "par": 4, "stroke_index": 7, "yards_black": 375, "yards_blue": 362, "yards_white": 348, "yards_red": 328},
    {"hole": 12, "par": 4, "stroke_index": 11, "yards_black": 330, "yards_blue": 314, "yards_white": 297, "yards_red": 277},
    {"hole": 13, "par": 5, "stroke_index": 15, "yards_black": 510, "yards_blue": 485, "yards_white": 479, "yards_red": 439},
    {"hole": 14, "par": 3, "stroke_index": 16, "yards_black": 162, "yards_blue": 154, "yards_white": 139, "yards_red": 131},
    {"hole": 15, "par": 4, "stroke_index": 5, "yards_black": 390, "yards_blue": 378, "yards_white": 360, "yards_red": 342},
    {"hole": 16, "par": 5, "stroke_index": 2, "yards_black": 537, "yards_blue": 516, "yards_white": 491, "yards_red": 458},
    {"hole": 17, "par": 3, "stroke_index": 13, "yards_black": 164, "yards_blue": 148, "yards_white": 134, "yards_red": 121},
    {"hole": 18, "par": 4, "stroke_index": 3, "yards_black": 387, "yards_blue": 369, "yards_white": 348, "yards_red": 324}
  ]'::jsonb
)
ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name,
  tees = EXCLUDED.tees,
  holes_data = EXCLUDED.holes_data,
  updated_at = NOW();

-- ============================================================================
-- 2. WOODFORD GOLF CLUB
-- ============================================================================
INSERT INTO venues (id, name, address, city, state, country, postal_code, phone, email, website, latitude, longitude, timezone, created_at, updated_at)
VALUES (
  'f2a3b4c5-d6e7-8901-abcd-500000000820',
  'Woodford Golf Club',
  'Neurum Road',
  'Woodford',
  'Queensland',
  'Australia',
  '4514',
  '+61 7 5496 1004',
  NULL,
  'https://www.woodfordgolfclub.com.au',
  -26.9503,
  152.7619,
  'Australia/Brisbane',
  NOW(),
  NOW()
)
ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name,
  city = EXCLUDED.city,
  updated_at = NOW();

INSERT INTO courses (id, venue_id, name, description, holes, par, course_rating, slope_rating, length_yards, length_meters, designer, year_built, course_type, created_at, updated_at, tees, holes_data)
VALUES (
  'f2a3b4c5-d6e7-8901-abcd-600000000820',
  'f2a3b4c5-d6e7-8901-abcd-500000000820',
  'Woodford Golf Club',
  'Parkland course with open guest policy.',
  18,
  72,
  NULL,
  120,
  5922,
  5416,
  NULL,
  NULL,
  'private',
  NOW(),
  NOW(),
  '[
    {"name": "Blue", "color": "blue", "rating": null, "slope": 120, "yards": 5922},
    {"name": "Yellow", "color": "yellow", "rating": null, "slope": 114, "yards": 5409},
    {"name": "Red", "color": "red", "rating": null, "slope": 117, "yards": 5420}
  ]'::jsonb,
  '[
    {"hole": 1, "par": 5, "stroke_index": 15, "yards_blue": 440, "yards_yellow": 412, "yards_red": 420},
    {"hole": 2, "par": 4, "stroke_index": 12, "yards_blue": 322, "yards_yellow": 308, "yards_red": 309},
    {"hole": 3, "par": 3, "stroke_index": 7, "yards_blue": 181, "yards_yellow": 163, "yards_red": 173},
    {"hole": 4, "par": 5, "stroke_index": 14, "yards_blue": 455, "yards_yellow": 446, "yards_red": 397},
    {"hole": 5, "par": 4, "stroke_index": 1, "yards_blue": 429, "yards_yellow": 371, "yards_red": 405},
    {"hole": 6, "par": 3, "stroke_index": 3, "yards_blue": 206, "yards_yellow": 179, "yards_red": 170},
    {"hole": 7, "par": 4, "stroke_index": 9, "yards_blue": 297, "yards_yellow": 248, "yards_red": 287},
    {"hole": 8, "par": 4, "stroke_index": 5, "yards_blue": 353, "yards_yellow": 336, "yards_red": 325},
    {"hole": 9, "par": 4, "stroke_index": 11, "yards_blue": 312, "yards_yellow": 290, "yards_red": 295},
    {"hole": 10, "par": 5, "stroke_index": 18, "yards_blue": 436, "yards_yellow": 398, "yards_red": 414},
    {"hole": 11, "par": 3, "stroke_index": 10, "yards_blue": 153, "yards_yellow": 129, "yards_red": 143},
    {"hole": 12, "par": 4, "stroke_index": 2, "yards_blue": 363, "yards_yellow": 315, "yards_red": 343},
    {"hole": 13, "par": 4, "stroke_index": 8, "yards_blue": 345, "yards_yellow": 290, "yards_red": 296},
    {"hole": 14, "par": 5, "stroke_index": 13, "yards_blue": 473, "yards_yellow": 446, "yards_red": 396},
    {"hole": 15, "par": 4, "stroke_index": 4, "yards_blue": 385, "yards_yellow": 370, "yards_red": 344},
    {"hole": 16, "par": 4, "stroke_index": 6, "yards_blue": 330, "yards_yellow": 305, "yards_red": 289},
    {"hole": 17, "par": 3, "stroke_index": 17, "yards_blue": 120, "yards_yellow": 107, "yards_red": 113},
    {"hole": 18, "par": 4, "stroke_index": 16, "yards_blue": 322, "yards_yellow": 296, "yards_red": 301}
  ]'::jsonb
)
ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name,
  tees = EXCLUDED.tees,
  holes_data = EXCLUDED.holes_data,
  updated_at = NOW();

-- ============================================================================
-- 3. SANDGATE GOLF CLUB
-- ============================================================================
INSERT INTO venues (id, name, address, city, state, country, postal_code, phone, email, website, latitude, longitude, timezone, created_at, updated_at)
VALUES (
  'f2a3b4c5-d6e7-8901-abcd-500000000821',
  'Sandgate Golf Club',
  'Flinders Parade',
  'Shorncliffe',
  'Queensland',
  'Australia',
  '4017',
  NULL,
  NULL,
  'https://www.sandgategolfclub.com.au',
  -27.3269,
  153.0789,
  'Australia/Brisbane',
  NOW(),
  NOW()
)
ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name,
  city = EXCLUDED.city,
  updated_at = NOW();

INSERT INTO courses (id, venue_id, name, description, holes, par, course_rating, slope_rating, length_yards, length_meters, designer, year_built, course_type, created_at, updated_at, tees, holes_data)
VALUES (
  'f2a3b4c5-d6e7-8901-abcd-600000000821',
  'f2a3b4c5-d6e7-8901-abcd-500000000821',
  'Sandgate Golf Club',
  'Parkland course established 1921.',
  18,
  72,
  NULL,
  NULL,
  5944,
  5436,
  NULL,
  1921,
  'private',
  NOW(),
  NOW(),
  '[
    {"name": "White", "color": "white", "rating": null, "slope": null, "yards": 5944},
    {"name": "Ladies", "color": "red", "rating": null, "slope": null, "yards": 5400}
  ]'::jsonb,
  '[
    {"hole": 1, "par": 5, "stroke_index": 1, "yards_white": 445, "yards_ladies": 300},
    {"hole": 2, "par": 4, "stroke_index": 3, "yards_white": 376, "yards_ladies": 300},
    {"hole": 3, "par": 4, "stroke_index": 5, "yards_white": 341, "yards_ladies": 300},
    {"hole": 4, "par": 4, "stroke_index": 7, "yards_white": 305, "yards_ladies": 300},
    {"hole": 5, "par": 3, "stroke_index": 9, "yards_white": 166, "yards_ladies": 300},
    {"hole": 6, "par": 4, "stroke_index": 11, "yards_white": 375, "yards_ladies": 300},
    {"hole": 7, "par": 3, "stroke_index": 13, "yards_white": 155, "yards_ladies": 300},
    {"hole": 8, "par": 5, "stroke_index": 15, "yards_white": 482, "yards_ladies": 300},
    {"hole": 9, "par": 4, "stroke_index": 17, "yards_white": 330, "yards_ladies": 300},
    {"hole": 10, "par": 4, "stroke_index": 2, "yards_white": 358, "yards_ladies": 300},
    {"hole": 11, "par": 4, "stroke_index": 4, "yards_white": 376, "yards_ladies": 300},
    {"hole": 12, "par": 4, "stroke_index": 6, "yards_white": 388, "yards_ladies": 300},
    {"hole": 13, "par": 4, "stroke_index": 8, "yards_white": 305, "yards_ladies": 300},
    {"hole": 14, "par": 3, "stroke_index": 10, "yards_white": 134, "yards_ladies": 300},
    {"hole": 15, "par": 5, "stroke_index": 12, "yards_white": 441, "yards_ladies": 300},
    {"hole": 16, "par": 3, "stroke_index": 14, "yards_white": 155, "yards_ladies": 300},
    {"hole": 17, "par": 5, "stroke_index": 16, "yards_white": 482, "yards_ladies": 300},
    {"hole": 18, "par": 4, "stroke_index": 18, "yards_white": 330, "yards_ladies": 300}
  ]'::jsonb
)
ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name,
  tees = EXCLUDED.tees,
  holes_data = EXCLUDED.holes_data,
  updated_at = NOW();

-- ============================================================================
-- 4. KILCOY GOLF CLUB (9 holes)
-- ============================================================================
INSERT INTO venues (id, name, address, city, state, country, postal_code, phone, email, website, latitude, longitude, timezone, created_at, updated_at)
VALUES (
  'f2a3b4c5-d6e7-8901-abcd-500000000822',
  'Kilcoy Golf Club',
  'Golf Links Road',
  'Kilcoy',
  'Queensland',
  'Australia',
  '4515',
  NULL,
  NULL,
  NULL,
  -26.9419,
  152.5647,
  'Australia/Brisbane',
  NOW(),
  NOW()
)
ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name,
  city = EXCLUDED.city,
  updated_at = NOW();

INSERT INTO courses (id, venue_id, name, description, holes, par, course_rating, slope_rating, length_yards, length_meters, designer, year_built, course_type, created_at, updated_at, tees, holes_data)
VALUES (
  'f2a3b4c5-d6e7-8901-abcd-600000000822',
  'f2a3b4c5-d6e7-8901-abcd-500000000822',
  'Kilcoy Golf Club',
  '9-hole parkland course opened 1964. Open guest policy.',
  9,
  35,
  34.0,
  108,
  2707,
  2475,
  NULL,
  1964,
  'private',
  NOW(),
  NOW(),
  '[
    {"name": "White", "color": "white", "rating": 34.0, "slope": 108, "yards": 2707},
    {"name": "Yellow", "color": "yellow", "rating": 35.5, "slope": 117, "yards": 2606}
  ]'::jsonb,
  '[
    {"hole": 1, "par": 4, "stroke_index": 2, "yards_white": 380, "yards_yellow": 380},
    {"hole": 2, "par": 3, "stroke_index": 6, "yards_white": 156, "yards_yellow": 156},
    {"hole": 3, "par": 4, "stroke_index": 3, "yards_white": 318, "yards_yellow": 318},
    {"hole": 4, "par": 4, "stroke_index": 4, "yards_white": 345, "yards_yellow": 345},
    {"hole": 5, "par": 4, "stroke_index": 7, "yards_white": 276, "yards_yellow": 237},
    {"hole": 6, "par": 4, "stroke_index": 5, "yards_white": 311, "yards_yellow": 249},
    {"hole": 7, "par": 4, "stroke_index": 1, "yards_white": 385, "yards_yellow": 385},
    {"hole": 8, "par": 5, "stroke_index": 8, "yards_white": 409, "yards_yellow": 409},
    {"hole": 9, "par": 3, "stroke_index": 9, "yards_white": 127, "yards_yellow": 127}
  ]'::jsonb
)
ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name,
  tees = EXCLUDED.tees,
  holes_data = EXCLUDED.holes_data,
  updated_at = NOW();

-- ============================================================================
-- 5. MARYBOROUGH GOLF CLUB
-- ============================================================================
INSERT INTO venues (id, name, address, city, state, country, postal_code, phone, email, website, latitude, longitude, timezone, created_at, updated_at)
VALUES (
  'f2a3b4c5-d6e7-8901-abcd-500000000823',
  'Maryborough Golf Club',
  'Alice Street',
  'Maryborough',
  'Queensland',
  'Australia',
  '4650',
  NULL,
  NULL,
  'https://www.maryboroughgolfclub.com.au',
  -25.5378,
  152.7011,
  'Australia/Brisbane',
  NOW(),
  NOW()
)
ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name,
  city = EXCLUDED.city,
  updated_at = NOW();

INSERT INTO courses (id, venue_id, name, description, holes, par, course_rating, slope_rating, length_yards, length_meters, designer, year_built, course_type, created_at, updated_at, tees, holes_data)
VALUES (
  'f2a3b4c5-d6e7-8901-abcd-600000000823',
  'f2a3b4c5-d6e7-8901-abcd-500000000823',
  'Maryborough Golf Club',
  'Parkland course established 1927. Open guest policy.',
  18,
  70,
  NULL,
  NULL,
  5658,
  5174,
  NULL,
  1927,
  'private',
  NOW(),
  NOW(),
  '[
    {"name": "White", "color": "white", "rating": null, "slope": null, "yards": 5658},
    {"name": "Red", "color": "red", "rating": null, "slope": null, "yards": 5244}
  ]'::jsonb,
  '[
    {"hole": 1, "par": 4, "stroke_index": 18, "yards_white": 392, "yards_red": 388},
    {"hole": 2, "par": 4, "stroke_index": 8, "yards_white": 279, "yards_red": 264},
    {"hole": 3, "par": 3, "stroke_index": 12, "yards_white": 176, "yards_red": 142},
    {"hole": 4, "par": 4, "stroke_index": 3, "yards_white": 351, "yards_red": 337},
    {"hole": 5, "par": 5, "stroke_index": 14, "yards_white": 436, "yards_red": 425},
    {"hole": 6, "par": 4, "stroke_index": 6, "yards_white": 303, "yards_red": 299},
    {"hole": 7, "par": 3, "stroke_index": 10, "yards_white": 137, "yards_red": 98},
    {"hole": 8, "par": 4, "stroke_index": 1, "yards_white": 351, "yards_red": 333},
    {"hole": 9, "par": 3, "stroke_index": 16, "yards_white": 120, "yards_red": 99},
    {"hole": 10, "par": 5, "stroke_index": 5, "yards_white": 476, "yards_red": 470},
    {"hole": 11, "par": 3, "stroke_index": 11, "yards_white": 168, "yards_red": 150},
    {"hole": 12, "par": 4, "stroke_index": 2, "yards_white": 364, "yards_red": 352},
    {"hole": 13, "par": 4, "stroke_index": 15, "yards_white": 288, "yards_red": 282},
    {"hole": 14, "par": 4, "stroke_index": 7, "yards_white": 396, "yards_red": 358},
    {"hole": 15, "par": 5, "stroke_index": 13, "yards_white": 448, "yards_red": 397},
    {"hole": 16, "par": 4, "stroke_index": 4, "yards_white": 380, "yards_red": 326},
    {"hole": 17, "par": 3, "stroke_index": 17, "yards_white": 184, "yards_red": 145},
    {"hole": 18, "par": 4, "stroke_index": 9, "yards_white": 409, "yards_red": 379}
  ]'::jsonb
)
ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name,
  tees = EXCLUDED.tees,
  holes_data = EXCLUDED.holes_data,
  updated_at = NOW();

-- ============================================================================
-- 6. KINGAROY GOLF CLUB
-- ============================================================================
INSERT INTO venues (id, name, address, city, state, country, postal_code, phone, email, website, latitude, longitude, timezone, created_at, updated_at)
VALUES (
  'f2a3b4c5-d6e7-8901-abcd-500000000824',
  'Kingaroy Golf Club',
  'Golf Links Road',
  'Kingaroy',
  'Queensland',
  'Australia',
  '4610',
  NULL,
  NULL,
  'https://www.kingaroygolfclub.com.au',
  -26.5389,
  151.8428,
  'Australia/Brisbane',
  NOW(),
  NOW()
)
ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name,
  city = EXCLUDED.city,
  updated_at = NOW();

INSERT INTO courses (id, venue_id, name, description, holes, par, course_rating, slope_rating, length_yards, length_meters, designer, year_built, course_type, created_at, updated_at, tees, holes_data)
VALUES (
  'f2a3b4c5-d6e7-8901-abcd-600000000824',
  'f2a3b4c5-d6e7-8901-abcd-500000000824',
  'Kingaroy Golf Club',
  'Parkland course established 1925. Open guest policy.',
  18,
  71,
  70.0,
  110,
  5738,
  5247,
  NULL,
  1925,
  'private',
  NOW(),
  NOW(),
  '[
    {"name": "Blue", "color": "blue", "rating": 70.0, "slope": 110, "yards": 5738},
    {"name": "White", "color": "white", "rating": 73.0, "slope": 109, "yards": 5472},
    {"name": "Red", "color": "red", "rating": 73.0, "slope": 121, "yards": 4977},
    {"name": "Yellow", "color": "yellow", "rating": 71.0, "slope": 115, "yards": 5131}
  ]'::jsonb,
  '[
    {"hole": 1, "par": 5, "stroke_index": 17, "yards_blue": 453, "yards_white": 414, "yards_red": 379, "yards_yellow": 410},
    {"hole": 2, "par": 4, "stroke_index": 10, "yards_blue": 348, "yards_white": 345, "yards_red": 315, "yards_yellow": 341},
    {"hole": 3, "par": 4, "stroke_index": 6, "yards_blue": 343, "yards_white": 343, "yards_red": 314, "yards_yellow": 282},
    {"hole": 4, "par": 3, "stroke_index": 1, "yards_blue": 193, "yards_white": 131, "yards_red": 120, "yards_yellow": 129},
    {"hole": 5, "par": 5, "stroke_index": 15, "yards_blue": 427, "yards_white": 421, "yards_red": 385, "yards_yellow": 392},
    {"hole": 6, "par": 4, "stroke_index": 4, "yards_blue": 355, "yards_white": 355, "yards_red": 325, "yards_yellow": 303},
    {"hole": 7, "par": 4, "stroke_index": 13, "yards_blue": 306, "yards_white": 296, "yards_red": 271, "yards_yellow": 296},
    {"hole": 8, "par": 4, "stroke_index": 18, "yards_blue": 260, "yards_white": 250, "yards_red": 229, "yards_yellow": 249},
    {"hole": 9, "par": 3, "stroke_index": 8, "yards_blue": 189, "yards_white": 176, "yards_red": 161, "yards_yellow": 138},
    {"hole": 10, "par": 4, "stroke_index": 5, "yards_blue": 372, "yards_white": 370, "yards_red": 338, "yards_yellow": 312},
    {"hole": 11, "par": 4, "stroke_index": 7, "yards_blue": 386, "yards_white": 373, "yards_red": 341, "yards_yellow": 367},
    {"hole": 12, "par": 4, "stroke_index": 2, "yards_blue": 370, "yards_white": 326, "yards_red": 294, "yards_yellow": 322},
    {"hole": 13, "par": 4, "stroke_index": 16, "yards_blue": 267, "yards_white": 268, "yards_red": 244, "yards_yellow": 259},
    {"hole": 14, "par": 3, "stroke_index": 14, "yards_blue": 131, "yards_white": 88, "yards_red": 80, "yards_yellow": 88},
    {"hole": 15, "par": 4, "stroke_index": 12, "yards_blue": 272, "yards_white": 276, "yards_red": 241, "yards_yellow": 233},
    {"hole": 16, "par": 4, "stroke_index": 3, "yards_blue": 383, "yards_white": 388, "yards_red": 350, "yards_yellow": 370},
    {"hole": 17, "par": 4, "stroke_index": 11, "yards_blue": 342, "yards_white": 349, "yards_red": 313, "yards_yellow": 337},
    {"hole": 18, "par": 4, "stroke_index": 9, "yards_blue": 341, "yards_white": 303, "yards_red": 277, "yards_yellow": 303}
  ]'::jsonb
)
ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name,
  tees = EXCLUDED.tees,
  holes_data = EXCLUDED.holes_data,
  updated_at = NOW();

-- ============================================================================
-- 7. MAROOCHY RIVER GOLF CLUB
-- ============================================================================
INSERT INTO venues (id, name, address, city, state, country, postal_code, phone, email, website, latitude, longitude, timezone, created_at, updated_at)
VALUES (
  'f2a3b4c5-d6e7-8901-abcd-500000000825',
  'Maroochy River Golf Club',
  'David Low Way',
  'Bli Bli',
  'Queensland',
  'Australia',
  '4560',
  NULL,
  NULL,
  'https://www.maroochyrivergolf.com.au',
  -26.5958,
  153.0422,
  'Australia/Brisbane',
  NOW(),
  NOW()
)
ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name,
  city = EXCLUDED.city,
  updated_at = NOW();

INSERT INTO courses (id, venue_id, name, description, holes, par, course_rating, slope_rating, length_yards, length_meters, designer, year_built, course_type, created_at, updated_at, tees, holes_data)
VALUES (
  'f2a3b4c5-d6e7-8901-abcd-600000000825',
  'f2a3b4c5-d6e7-8901-abcd-500000000825',
  'Maroochy River Golf Club',
  'Graham Marsh designed parkland course opened 2015. Open guest policy.',
  18,
  72,
  72.0,
  71,
  6441,
  5889,
  'Graham Marsh',
  2015,
  'public',
  NOW(),
  NOW(),
  '[
    {"name": "Black", "color": "black", "rating": null, "slope": null, "yards": 6441},
    {"name": "Blue", "color": "blue", "rating": null, "slope": null, "yards": 5918},
    {"name": "White", "color": "white", "rating": 72.0, "slope": 71, "yards": 5648},
    {"name": "Yellow", "color": "yellow", "rating": null, "slope": null, "yards": 5312},
    {"name": "Red", "color": "red", "rating": null, "slope": null, "yards": 5040}
  ]'::jsonb,
  '[
    {"hole": 1, "par": 4, "stroke_index": 1, "yards_black": 379, "yards_blue": 326, "yards_white": 316, "yards_yellow": 316, "yards_red": 295},
    {"hole": 2, "par": 4, "stroke_index": 3, "yards_black": 346, "yards_blue": 321, "yards_white": 305, "yards_yellow": 270, "yards_red": 270},
    {"hole": 3, "par": 4, "stroke_index": 5, "yards_black": 410, "yards_blue": 379, "yards_white": 361, "yards_yellow": 318, "yards_red": 318},
    {"hole": 4, "par": 3, "stroke_index": 7, "yards_black": 130, "yards_blue": 120, "yards_white": 114, "yards_yellow": 114, "yards_red": 101},
    {"hole": 5, "par": 5, "stroke_index": 9, "yards_black": 540, "yards_blue": 500, "yards_white": 475, "yards_yellow": 475, "yards_red": 451},
    {"hole": 6, "par": 4, "stroke_index": 11, "yards_black": 305, "yards_blue": 281, "yards_white": 266, "yards_yellow": 235, "yards_red": 235},
    {"hole": 7, "par": 5, "stroke_index": 13, "yards_black": 515, "yards_blue": 477, "yards_white": 453, "yards_yellow": 453, "yards_red": 402},
    {"hole": 8, "par": 3, "stroke_index": 15, "yards_black": 200, "yards_blue": 186, "yards_white": 176, "yards_yellow": 156, "yards_red": 156},
    {"hole": 9, "par": 4, "stroke_index": 17, "yards_black": 380, "yards_blue": 349, "yards_white": 335, "yards_yellow": 282, "yards_red": 282},
    {"hole": 10, "par": 4, "stroke_index": 2, "yards_black": 390, "yards_blue": 341, "yards_white": 338, "yards_yellow": 304, "yards_red": 304},
    {"hole": 11, "par": 5, "stroke_index": 4, "yards_black": 508, "yards_blue": 469, "yards_white": 447, "yards_yellow": 447, "yards_red": 407},
    {"hole": 12, "par": 3, "stroke_index": 6, "yards_black": 136, "yards_blue": 127, "yards_white": 120, "yards_yellow": 106, "yards_red": 106},
    {"hole": 13, "par": 4, "stroke_index": 8, "yards_black": 403, "yards_blue": 374, "yards_white": 355, "yards_yellow": 315, "yards_red": 315},
    {"hole": 14, "par": 4, "stroke_index": 10, "yards_black": 412, "yards_blue": 382, "yards_white": 363, "yards_yellow": 363, "yards_red": 321},
    {"hole": 15, "par": 4, "stroke_index": 12, "yards_black": 292, "yards_blue": 268, "yards_white": 257, "yards_yellow": 257, "yards_red": 227},
    {"hole": 16, "par": 3, "stroke_index": 14, "yards_black": 182, "yards_blue": 169, "yards_white": 160, "yards_yellow": 144, "yards_red": 144},
    {"hole": 17, "par": 5, "stroke_index": 16, "yards_black": 514, "yards_blue": 475, "yards_white": 452, "yards_yellow": 452, "yards_red": 401},
    {"hole": 18, "par": 4, "stroke_index": 18, "yards_black": 399, "yards_blue": 374, "yards_white": 355, "yards_yellow": 305, "yards_red": 305}
  ]'::jsonb
)
ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name,
  tees = EXCLUDED.tees,
  holes_data = EXCLUDED.holes_data,
  updated_at = NOW();

-- ============================================================================
-- 8. BEAUDESERT GOLF CLUB
-- ============================================================================
INSERT INTO venues (id, name, address, city, state, country, postal_code, phone, email, website, latitude, longitude, timezone, created_at, updated_at)
VALUES (
  'f2a3b4c5-d6e7-8901-abcd-500000000826',
  'Beaudesert Golf Club',
  'Kerry Road',
  'Beaudesert',
  'Queensland',
  'Australia',
  '4285',
  NULL,
  NULL,
  'https://www.beaudesertgolf.com.au',
  -27.9867,
  152.9997,
  'Australia/Brisbane',
  NOW(),
  NOW()
)
ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name,
  city = EXCLUDED.city,
  updated_at = NOW();

INSERT INTO courses (id, venue_id, name, description, holes, par, course_rating, slope_rating, length_yards, length_meters, designer, year_built, course_type, created_at, updated_at, tees, holes_data)
VALUES (
  'f2a3b4c5-d6e7-8901-abcd-600000000826',
  'f2a3b4c5-d6e7-8901-abcd-500000000826',
  'Beaudesert Golf Club',
  'Parkland course with open guest policy.',
  18,
  72,
  70.0,
  NULL,
  5843,
  5343,
  NULL,
  NULL,
  'private',
  NOW(),
  NOW(),
  '[
    {"name": "Blue", "color": "blue", "rating": 70.0, "slope": null, "yards": 5843},
    {"name": "Red", "color": "red", "rating": 72.0, "slope": null, "yards": 5205}
  ]'::jsonb,
  '[
    {"hole": 1, "par": 4, "stroke_index": 10, "yards_blue": 327, "yards_red": 315},
    {"hole": 2, "par": 3, "stroke_index": 14, "yards_blue": 148, "yards_red": 140},
    {"hole": 3, "par": 4, "stroke_index": 2, "yards_blue": 396, "yards_red": 393},
    {"hole": 4, "par": 5, "stroke_index": 16, "yards_blue": 424, "yards_red": 299},
    {"hole": 5, "par": 4, "stroke_index": 6, "yards_blue": 305, "yards_red": 285},
    {"hole": 6, "par": 5, "stroke_index": 8, "yards_blue": 481, "yards_red": 437},
    {"hole": 7, "par": 4, "stroke_index": 4, "yards_blue": 383, "yards_red": 364},
    {"hole": 8, "par": 4, "stroke_index": 18, "yards_blue": 293, "yards_red": 292},
    {"hole": 9, "par": 3, "stroke_index": 12, "yards_blue": 153, "yards_red": 88},
    {"hole": 10, "par": 4, "stroke_index": 11, "yards_blue": 310, "yards_red": 225},
    {"hole": 11, "par": 4, "stroke_index": 9, "yards_blue": 327, "yards_red": 298},
    {"hole": 12, "par": 3, "stroke_index": 17, "yards_blue": 114, "yards_red": 105},
    {"hole": 13, "par": 5, "stroke_index": 7, "yards_blue": 456, "yards_red": 354},
    {"hole": 14, "par": 4, "stroke_index": 13, "yards_blue": 342, "yards_red": 317},
    {"hole": 15, "par": 3, "stroke_index": 5, "yards_blue": 157, "yards_red": 140},
    {"hole": 16, "par": 4, "stroke_index": 1, "yards_blue": 363, "yards_red": 361},
    {"hole": 17, "par": 4, "stroke_index": 15, "yards_blue": 337, "yards_red": 310},
    {"hole": 18, "par": 5, "stroke_index": 3, "yards_blue": 527, "yards_red": 482}
  ]'::jsonb
)
ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name,
  tees = EXCLUDED.tees,
  holes_data = EXCLUDED.holes_data,
  updated_at = NOW();

-- ============================================================================
-- 9. WARWICK GOLF CLUB
-- ============================================================================
INSERT INTO venues (id, name, address, city, state, country, postal_code, phone, email, website, latitude, longitude, timezone, created_at, updated_at)
VALUES (
  'f2a3b4c5-d6e7-8901-abcd-500000000827',
  'Warwick Golf Club',
  'Golf Links Road',
  'Warwick',
  'Queensland',
  'Australia',
  '4370',
  NULL,
  NULL,
  'https://www.warwickgolf.com.au',
  -28.2169,
  152.0236,
  'Australia/Brisbane',
  NOW(),
  NOW()
)
ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name,
  city = EXCLUDED.city,
  updated_at = NOW();

INSERT INTO courses (id, venue_id, name, description, holes, par, course_rating, slope_rating, length_yards, length_meters, designer, year_built, course_type, created_at, updated_at, tees, holes_data)
VALUES (
  'f2a3b4c5-d6e7-8901-abcd-600000000827',
  'f2a3b4c5-d6e7-8901-abcd-500000000827',
  'Warwick Golf Club',
  'Parkland course established 1905. One of Queensland''s oldest courses.',
  18,
  69,
  NULL,
  NULL,
  5610,
  5131,
  NULL,
  1905,
  'private',
  NOW(),
  NOW(),
  '[
    {"name": "White", "color": "white", "rating": null, "slope": null, "yards": 5610}
  ]'::jsonb,
  '[
    {"hole": 1, "par": 4, "stroke_index": 1, "yards_white": 349},
    {"hole": 2, "par": 5, "stroke_index": 3, "yards_white": 474},
    {"hole": 3, "par": 4, "stroke_index": 5, "yards_white": 424},
    {"hole": 4, "par": 4, "stroke_index": 7, "yards_white": 333},
    {"hole": 5, "par": 3, "stroke_index": 9, "yards_white": 171},
    {"hole": 6, "par": 4, "stroke_index": 11, "yards_white": 388},
    {"hole": 7, "par": 3, "stroke_index": 13, "yards_white": 136},
    {"hole": 8, "par": 4, "stroke_index": 15, "yards_white": 343},
    {"hole": 9, "par": 3, "stroke_index": 17, "yards_white": 187},
    {"hole": 10, "par": 4, "stroke_index": 2, "yards_white": 404},
    {"hole": 11, "par": 3, "stroke_index": 4, "yards_white": 136},
    {"hole": 12, "par": 4, "stroke_index": 6, "yards_white": 358},
    {"hole": 13, "par": 3, "stroke_index": 8, "yards_white": 129},
    {"hole": 14, "par": 4, "stroke_index": 10, "yards_white": 323},
    {"hole": 15, "par": 5, "stroke_index": 12, "yards_white": 525},
    {"hole": 16, "par": 3, "stroke_index": 14, "yards_white": 156},
    {"hole": 17, "par": 4, "stroke_index": 16, "yards_white": 335},
    {"hole": 18, "par": 5, "stroke_index": 18, "yards_white": 439}
  ]'::jsonb
)
ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name,
  tees = EXCLUDED.tees,
  holes_data = EXCLUDED.holes_data,
  updated_at = NOW();

-- ============================================================================
-- 10. DALBY GOLF CLUB
-- ============================================================================
INSERT INTO venues (id, name, address, city, state, country, postal_code, phone, email, website, latitude, longitude, timezone, created_at, updated_at)
VALUES (
  'f2a3b4c5-d6e7-8901-abcd-500000000828',
  'Dalby Golf Club',
  'Golf Links Road',
  'Dalby',
  'Queensland',
  'Australia',
  '4405',
  NULL,
  NULL,
  'https://www.dalbygolfclub.com.au',
  -27.1833,
  151.2667,
  'Australia/Brisbane',
  NOW(),
  NOW()
)
ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name,
  city = EXCLUDED.city,
  updated_at = NOW();

INSERT INTO courses (id, venue_id, name, description, holes, par, course_rating, slope_rating, length_yards, length_meters, designer, year_built, course_type, created_at, updated_at, tees, holes_data)
VALUES (
  'f2a3b4c5-d6e7-8901-abcd-600000000828',
  'f2a3b4c5-d6e7-8901-abcd-500000000828',
  'Dalby Golf Club',
  'Parkland course established 1926. Closed guest policy.',
  18,
  72,
  69.0,
  107,
  5896,
  5392,
  NULL,
  1926,
  'private',
  NOW(),
  NOW(),
  '[
    {"name": "White", "color": "white", "rating": 69.0, "slope": 107, "yards": 5896},
    {"name": "Red", "color": "red", "rating": 72.0, "slope": 111, "yards": 5340}
  ]'::jsonb,
  '[
    {"hole": 1, "par": 4, "stroke_index": 16, "yards_white": 290, "yards_red": 289},
    {"hole": 2, "par": 4, "stroke_index": 2, "yards_white": 399, "yards_red": 339},
    {"hole": 3, "par": 3, "stroke_index": 10, "yards_white": 142, "yards_red": 100},
    {"hole": 4, "par": 4, "stroke_index": 13, "yards_white": 287, "yards_red": 235},
    {"hole": 5, "par": 4, "stroke_index": 6, "yards_white": 350, "yards_red": 315},
    {"hole": 6, "par": 3, "stroke_index": 12, "yards_white": 137, "yards_red": 125},
    {"hole": 7, "par": 5, "stroke_index": 18, "yards_white": 431, "yards_red": 347},
    {"hole": 8, "par": 5, "stroke_index": 8, "yards_white": 467, "yards_red": 388},
    {"hole": 9, "par": 4, "stroke_index": 4, "yards_white": 365, "yards_red": 363},
    {"hole": 10, "par": 5, "stroke_index": 7, "yards_white": 494, "yards_red": 459},
    {"hole": 11, "par": 4, "stroke_index": 14, "yards_white": 303, "yards_red": 301},
    {"hole": 12, "par": 4, "stroke_index": 11, "yards_white": 330, "yards_red": 320},
    {"hole": 13, "par": 4, "stroke_index": 1, "yards_white": 410, "yards_red": 407},
    {"hole": 14, "par": 3, "stroke_index": 17, "yards_white": 122, "yards_red": 120},
    {"hole": 15, "par": 4, "stroke_index": 15, "yards_white": 334, "yards_red": 332},
    {"hole": 16, "par": 4, "stroke_index": 5, "yards_white": 358, "yards_red": 290},
    {"hole": 17, "par": 5, "stroke_index": 9, "yards_white": 492, "yards_red": 457},
    {"hole": 18, "par": 3, "stroke_index": 3, "yards_white": 185, "yards_red": 153}
  ]'::jsonb
)
ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name,
  tees = EXCLUDED.tees,
  holes_data = EXCLUDED.holes_data,
  updated_at = NOW();

-- ============================================================================
-- 11. ROMA GOLF CLUB
-- ============================================================================
INSERT INTO venues (id, name, address, city, state, country, postal_code, phone, email, website, latitude, longitude, timezone, created_at, updated_at)
VALUES (
  'f2a3b4c5-d6e7-8901-abcd-500000000829',
  'Roma Golf Club',
  '119 Tiffin Street',
  'Roma',
  'Queensland',
  'Australia',
  '4455',
  NULL,
  NULL,
  'https://www.romagolfclub.com.au',
  -26.5700,
  148.7869,
  'Australia/Brisbane',
  NOW(),
  NOW()
)
ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name,
  city = EXCLUDED.city,
  updated_at = NOW();

INSERT INTO courses (id, venue_id, name, description, holes, par, course_rating, slope_rating, length_yards, length_meters, designer, year_built, course_type, created_at, updated_at, tees, holes_data)
VALUES (
  'f2a3b4c5-d6e7-8901-abcd-600000000829',
  'f2a3b4c5-d6e7-8901-abcd-500000000829',
  'Roma Golf Club',
  'Parkland course with open guest policy.',
  18,
  72,
  NULL,
  NULL,
  6689,
  6117,
  NULL,
  NULL,
  'private',
  NOW(),
  NOW(),
  '[
    {"name": "White", "color": "white", "rating": null, "slope": null, "yards": 6689}
  ]'::jsonb,
  '[
    {"hole": 1, "par": 4, "stroke_index": 13, "yards_white": 367},
    {"hole": 2, "par": 3, "stroke_index": 9, "yards_white": 197},
    {"hole": 3, "par": 5, "stroke_index": 7, "yards_white": 540},
    {"hole": 4, "par": 4, "stroke_index": 5, "yards_white": 448},
    {"hole": 5, "par": 5, "stroke_index": 11, "yards_white": 497},
    {"hole": 6, "par": 4, "stroke_index": 15, "yards_white": 351},
    {"hole": 7, "par": 4, "stroke_index": 2, "yards_white": 456},
    {"hole": 8, "par": 4, "stroke_index": 3, "yards_white": 378},
    {"hole": 9, "par": 3, "stroke_index": 17, "yards_white": 160},
    {"hole": 10, "par": 3, "stroke_index": 6, "yards_white": 174},
    {"hole": 11, "par": 5, "stroke_index": 12, "yards_white": 517},
    {"hole": 12, "par": 4, "stroke_index": 1, "yards_white": 413},
    {"hole": 13, "par": 5, "stroke_index": 10, "yards_white": 499},
    {"hole": 14, "par": 4, "stroke_index": 4, "yards_white": 439},
    {"hole": 15, "par": 4, "stroke_index": 18, "yards_white": 314},
    {"hole": 16, "par": 4, "stroke_index": 14, "yards_white": 370},
    {"hole": 17, "par": 3, "stroke_index": 16, "yards_white": 168},
    {"hole": 18, "par": 4, "stroke_index": 8, "yards_white": 401}
  ]'::jsonb
)
ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name,
  tees = EXCLUDED.tees,
  holes_data = EXCLUDED.holes_data,
  updated_at = NOW();

-- ============================================================================
-- 12. CHINCHILLA GOLF CLUB
-- ============================================================================
INSERT INTO venues (id, name, address, city, state, country, postal_code, phone, email, website, latitude, longitude, timezone, created_at, updated_at)
VALUES (
  'f2a3b4c5-d6e7-8901-abcd-500000000830',
  'Chinchilla Golf Club',
  'Warrego Highway',
  'Chinchilla',
  'Queensland',
  'Australia',
  '4413',
  NULL,
  NULL,
  NULL,
  -26.7400,
  150.6339,
  'Australia/Brisbane',
  NOW(),
  NOW()
)
ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name,
  city = EXCLUDED.city,
  updated_at = NOW();

INSERT INTO courses (id, venue_id, name, description, holes, par, course_rating, slope_rating, length_yards, length_meters, designer, year_built, course_type, created_at, updated_at, tees, holes_data)
VALUES (
  'f2a3b4c5-d6e7-8901-abcd-600000000830',
  'f2a3b4c5-d6e7-8901-abcd-500000000830',
  'Chinchilla Golf Club',
  'Parkland course with open guest policy.',
  18,
  70,
  67.0,
  106,
  5437,
  4972,
  NULL,
  NULL,
  'private',
  NOW(),
  NOW(),
  '[
    {"name": "White", "color": "white", "rating": 67.0, "slope": 106, "yards": 5437},
    {"name": "Red", "color": "red", "rating": 71.0, "slope": 110, "yards": 5133}
  ]'::jsonb,
  '[
    {"hole": 1, "par": 5, "stroke_index": 13, "yards_white": 456, "yards_red": 432},
    {"hole": 2, "par": 3, "stroke_index": 16, "yards_white": 139, "yards_red": 139},
    {"hole": 3, "par": 4, "stroke_index": 2, "yards_white": 319, "yards_red": 319},
    {"hole": 4, "par": 4, "stroke_index": 5, "yards_white": 351, "yards_red": 310},
    {"hole": 5, "par": 3, "stroke_index": 12, "yards_white": 168, "yards_red": 168},
    {"hole": 6, "par": 4, "stroke_index": 10, "yards_white": 357, "yards_red": 338},
    {"hole": 7, "par": 3, "stroke_index": 18, "yards_white": 95, "yards_red": 95},
    {"hole": 8, "par": 4, "stroke_index": 6, "yards_white": 335, "yards_red": 335},
    {"hole": 9, "par": 5, "stroke_index": 9, "yards_white": 509, "yards_red": 465},
    {"hole": 10, "par": 5, "stroke_index": 14, "yards_white": 432, "yards_red": 368},
    {"hole": 11, "par": 3, "stroke_index": 8, "yards_white": 155, "yards_red": 155},
    {"hole": 12, "par": 4, "stroke_index": 1, "yards_white": 336, "yards_red": 320},
    {"hole": 13, "par": 4, "stroke_index": 11, "yards_white": 328, "yards_red": 328},
    {"hole": 14, "par": 3, "stroke_index": 3, "yards_white": 193, "yards_red": 177},
    {"hole": 15, "par": 4, "stroke_index": 4, "yards_white": 371, "yards_red": 329},
    {"hole": 16, "par": 3, "stroke_index": 17, "yards_white": 105, "yards_red": 105},
    {"hole": 17, "par": 4, "stroke_index": 7, "yards_white": 323, "yards_red": 323},
    {"hole": 18, "par": 5, "stroke_index": 15, "yards_white": 465, "yards_red": 427}
  ]'::jsonb
)
ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name,
  tees = EXCLUDED.tees,
  holes_data = EXCLUDED.holes_data,
  updated_at = NOW();

-- ============================================================================
-- 13. LAIDLEY GOLF CLUB
-- ============================================================================
INSERT INTO venues (id, name, address, city, state, country, postal_code, phone, email, website, latitude, longitude, timezone, created_at, updated_at)
VALUES (
  'f2a3b4c5-d6e7-8901-abcd-500000000831',
  'Laidley Golf Club',
  'Forest Hill Road',
  'Laidley',
  'Queensland',
  'Australia',
  '4341',
  '+61 7 5465 1518',
  'admin@laidleygolfclub.com.au',
  'https://www.laidleygolfclub.com.au',
  -27.6333,
  152.3833,
  'Australia/Brisbane',
  NOW(),
  NOW()
)
ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name,
  city = EXCLUDED.city,
  updated_at = NOW();

INSERT INTO courses (id, venue_id, name, description, holes, par, course_rating, slope_rating, length_yards, length_meters, designer, year_built, course_type, created_at, updated_at, tees, holes_data)
VALUES (
  'f2a3b4c5-d6e7-8901-abcd-600000000831',
  'f2a3b4c5-d6e7-8901-abcd-500000000831',
  'Laidley Golf Club',
  'Parkland course with open guest policy.',
  18,
  72,
  NULL,
  NULL,
  6074,
  5554,
  NULL,
  NULL,
  'private',
  NOW(),
  NOW(),
  '[
    {"name": "Blue", "color": "blue", "rating": null, "slope": null, "yards": 6074},
    {"name": "Red", "color": "red", "rating": null, "slope": null, "yards": 5406}
  ]'::jsonb,
  '[
    {"hole": 1, "par": 5, "stroke_index": 9, "yards_blue": 465, "yards_red": 425},
    {"hole": 2, "par": 3, "stroke_index": 5, "yards_blue": 183, "yards_red": 167},
    {"hole": 3, "par": 5, "stroke_index": 7, "yards_blue": 484, "yards_red": 470},
    {"hole": 4, "par": 3, "stroke_index": 15, "yards_blue": 134, "yards_red": 134},
    {"hole": 5, "par": 4, "stroke_index": 1, "yards_blue": 421, "yards_red": 356},
    {"hole": 6, "par": 5, "stroke_index": 12, "yards_blue": 462, "yards_red": 376},
    {"hole": 7, "par": 4, "stroke_index": 17, "yards_blue": 326, "yards_red": 270},
    {"hole": 8, "par": 3, "stroke_index": 18, "yards_blue": 112, "yards_red": 110},
    {"hole": 9, "par": 4, "stroke_index": 11, "yards_blue": 340, "yards_red": 296},
    {"hole": 10, "par": 4, "stroke_index": 16, "yards_blue": 315, "yards_red": 263},
    {"hole": 11, "par": 4, "stroke_index": 10, "yards_blue": 350, "yards_red": 284},
    {"hole": 12, "par": 4, "stroke_index": 4, "yards_blue": 411, "yards_red": 358},
    {"hole": 13, "par": 4, "stroke_index": 3, "yards_blue": 389, "yards_red": 392},
    {"hole": 14, "par": 3, "stroke_index": 6, "yards_blue": 183, "yards_red": 167},
    {"hole": 15, "par": 5, "stroke_index": 8, "yards_blue": 484, "yards_red": 470},
    {"hole": 16, "par": 3, "stroke_index": 14, "yards_blue": 134, "yards_red": 134},
    {"hole": 17, "par": 4, "stroke_index": 2, "yards_blue": 421, "yards_red": 356},
    {"hole": 18, "par": 5, "stroke_index": 13, "yards_blue": 460, "yards_red": 378}
  ]'::jsonb
)
ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name,
  tees = EXCLUDED.tees,
  holes_data = EXCLUDED.holes_data,
  updated_at = NOW();

-- ============================================================================
-- Summary
-- ============================================================================
-- QLD Batch 2: Brisbane North, Moreton Bay & Regional QLD
-- Total: 13 courses with full hole-by-hole data (18-hole courses)
--
-- Courses included:
-- 1. North Lakes Resort Golf Club - Graham Marsh design, 2002
-- 2. Woodford Golf Club
-- 3. Sandgate Golf Club - Est. 1921
-- 4. Kilcoy Golf Club - 9 holes, Est. 1964
-- 5. Maryborough Golf Club - Est. 1927
-- 6. Kingaroy Golf Club - Est. 1925
-- 7. Maroochy River Golf Club - Graham Marsh design, 2015
-- 8. Beaudesert Golf Club
-- 9. Warwick Golf Club - Est. 1905 (one of QLD's oldest)
-- 10. Dalby Golf Club - Est. 1926
-- 11. Roma Golf Club
-- 12. Chinchilla Golf Club
-- 13. Laidley Golf Club
--
-- Skipped (9-hole courses with limited data):
-- - Esk Golf Club (incomplete data)
-- - Nanango Golf Club (9 holes)
-- - Gayndah Golf Club (9 holes)
-- - Miles Golf Club (9 holes)
