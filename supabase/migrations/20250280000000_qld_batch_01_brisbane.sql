-- QLD Batch 1: Brisbane Premium & Surrounds
-- 18 courses with full hole-by-hole data
-- Source: golfify.io
-- Generated: 2025-12-11

-- ============================================================================
-- 1. ROYAL QUEENSLAND GOLF CLUB
-- ============================================================================
INSERT INTO venues (id, name, address, city, state, country, postal_code, phone, email, website, latitude, longitude, timezone, created_at, updated_at)
VALUES (
  'f2a3b4c5-d6e7-8901-abcd-500000000801',
  'Royal Queensland Golf Club',
  'Curtin Avenue West',
  'Eagle Farm',
  'Queensland',
  'Australia',
  '4009',
  NULL,
  NULL,
  'https://www.royalqueenslandgolf.com.au',
  -27.4325,
  153.0689,
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
  'f2a3b4c5-d6e7-8901-abcd-600000000801',
  'f2a3b4c5-d6e7-8901-abcd-500000000801',
  'Royal Queensland Golf Club',
  'Top 10 Australian course, Queensland''s premier club. Opened 1921, parkland style layout.',
  18,
  72,
  74.0,
  127,
  6443,
  5891,
  NULL,
  1921,
  'private',
  NOW(),
  NOW(),
  '[
    {"name": "Black", "color": "black", "rating": 74.0, "slope": 127, "yards": 6443},
    {"name": "Blue", "color": "blue", "rating": 73.0, "slope": 126, "yards": 6196},
    {"name": "Red", "color": "red", "rating": 73.0, "slope": 126, "yards": 5381}
  ]'::jsonb,
  '[
    {"hole": 1, "par": 4, "stroke_index": 5, "yards_black": 364, "yards_blue": 355, "yards_red": 315},
    {"hole": 2, "par": 4, "stroke_index": 17, "yards_black": 314, "yards_blue": 292, "yards_red": 257},
    {"hole": 3, "par": 4, "stroke_index": 3, "yards_black": 405, "yards_blue": 405, "yards_red": 365},
    {"hole": 4, "par": 3, "stroke_index": 11, "yards_black": 160, "yards_blue": 160, "yards_red": 137},
    {"hole": 5, "par": 4, "stroke_index": 1, "yards_black": 421, "yards_blue": 405, "yards_red": 318},
    {"hole": 6, "par": 4, "stroke_index": 9, "yards_black": 353, "yards_blue": 343, "yards_red": 315},
    {"hole": 7, "par": 5, "stroke_index": 13, "yards_black": 519, "yards_blue": 512, "yards_red": 439},
    {"hole": 8, "par": 3, "stroke_index": 7, "yards_black": 202, "yards_blue": 180, "yards_red": 208},
    {"hole": 9, "par": 5, "stroke_index": 15, "yards_black": 525, "yards_blue": 479, "yards_red": 398},
    {"hole": 10, "par": 5, "stroke_index": 18, "yards_black": 463, "yards_blue": 458, "yards_red": 405},
    {"hole": 11, "par": 3, "stroke_index": 8, "yards_black": 167, "yards_blue": 156, "yards_red": 115},
    {"hole": 12, "par": 4, "stroke_index": 12, "yards_black": 292, "yards_blue": 292, "yards_red": 260},
    {"hole": 13, "par": 4, "stroke_index": 4, "yards_black": 402, "yards_blue": 370, "yards_red": 292},
    {"hole": 14, "par": 4, "stroke_index": 16, "yards_black": 456, "yards_blue": 456, "yards_red": 344},
    {"hole": 15, "par": 5, "stroke_index": 6, "yards_black": 496, "yards_blue": 480, "yards_red": 452},
    {"hole": 16, "par": 4, "stroke_index": 10, "yards_black": 350, "yards_blue": 340, "yards_red": 327},
    {"hole": 17, "par": 3, "stroke_index": 14, "yards_black": 125, "yards_blue": 125, "yards_red": 100},
    {"hole": 18, "par": 4, "stroke_index": 2, "yards_black": 429, "yards_blue": 388, "yards_red": 334}
  ]'::jsonb
)
ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name,
  tees = EXCLUDED.tees,
  holes_data = EXCLUDED.holes_data,
  updated_at = NOW();

-- ============================================================================
-- 2. BRISBANE GOLF CLUB
-- ============================================================================
INSERT INTO venues (id, name, address, city, state, country, postal_code, phone, email, website, latitude, longitude, timezone, created_at, updated_at)
VALUES (
  'f2a3b4c5-d6e7-8901-abcd-500000000802',
  'Brisbane Golf Club',
  '597 Fairfield Road',
  'Yeerongpilly',
  'Queensland',
  'Australia',
  '4105',
  NULL,
  NULL,
  'https://www.brisbanegolfclub.com.au',
  -27.5200,
  153.0100,
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
  'f2a3b4c5-d6e7-8901-abcd-600000000802',
  'f2a3b4c5-d6e7-8901-abcd-500000000802',
  'Brisbane Golf Club',
  'Historic Brisbane course established 1896. Parkland style with open guest policy.',
  18,
  71,
  NULL,
  NULL,
  6665,
  6095,
  NULL,
  1896,
  'private',
  NOW(),
  NOW(),
  '[
    {"name": "Blue", "color": "blue", "rating": null, "slope": null, "yards": 6665},
    {"name": "White", "color": "white", "rating": null, "slope": null, "yards": 6442},
    {"name": "Red", "color": "red", "rating": null, "slope": null, "yards": 5722}
  ]'::jsonb,
  '[
    {"hole": 1, "par": 5, "stroke_index": 18, "yards_blue": 462, "yards_white": 460, "yards_red": 431},
    {"hole": 2, "par": 4, "stroke_index": 6, "yards_blue": 391, "yards_white": 387, "yards_red": 387},
    {"hole": 3, "par": 4, "stroke_index": 4, "yards_blue": 383, "yards_white": 379, "yards_red": 387},
    {"hole": 4, "par": 3, "stroke_index": 12, "yards_blue": 185, "yards_white": 177, "yards_red": 136},
    {"hole": 5, "par": 4, "stroke_index": 1, "yards_blue": 433, "yards_white": 422, "yards_red": 247},
    {"hole": 6, "par": 4, "stroke_index": 10, "yards_blue": 354, "yards_white": 342, "yards_red": 284},
    {"hole": 7, "par": 3, "stroke_index": 14, "yards_blue": 157, "yards_white": 144, "yards_red": 137},
    {"hole": 8, "par": 4, "stroke_index": 8, "yards_blue": 376, "yards_white": 363, "yards_red": 355},
    {"hole": 9, "par": 5, "stroke_index": 16, "yards_blue": 486, "yards_white": 474, "yards_red": 421},
    {"hole": 10, "par": 4, "stroke_index": 5, "yards_blue": 438, "yards_white": 412, "yards_red": 379},
    {"hole": 11, "par": 3, "stroke_index": 15, "yards_blue": 217, "yards_white": 208, "yards_red": 184},
    {"hole": 12, "par": 5, "stroke_index": 11, "yards_blue": 547, "yards_white": 516, "yards_red": 454},
    {"hole": 13, "par": 3, "stroke_index": 7, "yards_blue": 196, "yards_white": 188, "yards_red": 143},
    {"hole": 14, "par": 4, "stroke_index": 3, "yards_blue": 396, "yards_white": 368, "yards_red": 347},
    {"hole": 15, "par": 4, "stroke_index": 13, "yards_blue": 334, "yards_white": 318, "yards_red": 289},
    {"hole": 16, "par": 5, "stroke_index": 2, "yards_blue": 571, "yards_white": 555, "yards_red": 458},
    {"hole": 17, "par": 4, "stroke_index": 9, "yards_blue": 394, "yards_white": 386, "yards_red": 343},
    {"hole": 18, "par": 4, "stroke_index": 17, "yards_blue": 345, "yards_white": 343, "yards_red": 340}
  ]'::jsonb
)
ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name,
  tees = EXCLUDED.tees,
  holes_data = EXCLUDED.holes_data,
  updated_at = NOW();

-- ============================================================================
-- 3. BROOKWATER GOLF & COUNTRY CLUB
-- ============================================================================
INSERT INTO venues (id, name, address, city, state, country, postal_code, phone, email, website, latitude, longitude, timezone, created_at, updated_at)
VALUES (
  'f2a3b4c5-d6e7-8901-abcd-500000000803',
  'Brookwater Golf & Country Club',
  '1 Tournament Drive',
  'Brookwater',
  'Queensland',
  'Australia',
  '4300',
  NULL,
  NULL,
  'https://www.brookwatergolf.com.au',
  -27.6534,
  152.9132,
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
  'f2a3b4c5-d6e7-8901-abcd-600000000803',
  'f2a3b4c5-d6e7-8901-abcd-500000000803',
  'Brookwater Golf & Country Club',
  'Greg Norman design, Top 30 Australian course. Opened 2002, parkland style.',
  18,
  72,
  75.0,
  144,
  6492,
  5937,
  'Greg Norman',
  2002,
  'private',
  NOW(),
  NOW(),
  '[
    {"name": "Black", "color": "black", "rating": 75.0, "slope": 144, "yards": 6492},
    {"name": "Gold", "color": "gold", "rating": 73.0, "slope": 141, "yards": 6104},
    {"name": "Silver", "color": "white", "rating": 70.0, "slope": 137, "yards": 5675},
    {"name": "Jade", "color": "green", "rating": 74.0, "slope": 139, "yards": 5276}
  ]'::jsonb,
  '[
    {"hole": 1, "par": 4, "stroke_index": 4, "yards_black": 380, "yards_gold": 351, "yards_silver": 314, "yards_jade": 314},
    {"hole": 2, "par": 4, "stroke_index": 2, "yards_black": 406, "yards_gold": 377, "yards_silver": 343, "yards_jade": 343},
    {"hole": 3, "par": 4, "stroke_index": 10, "yards_black": 358, "yards_gold": 336, "yards_silver": 318, "yards_jade": 282},
    {"hole": 4, "par": 5, "stroke_index": 6, "yards_black": 551, "yards_gold": 529, "yards_silver": 499, "yards_jade": 477},
    {"hole": 5, "par": 3, "stroke_index": 14, "yards_black": 167, "yards_gold": 155, "yards_silver": 138, "yards_jade": 110},
    {"hole": 6, "par": 4, "stroke_index": 8, "yards_black": 395, "yards_gold": 375, "yards_silver": 339, "yards_jade": 339},
    {"hole": 7, "par": 3, "stroke_index": 12, "yards_black": 195, "yards_gold": 164, "yards_silver": 132, "yards_jade": 132},
    {"hole": 8, "par": 5, "stroke_index": 18, "yards_black": 527, "yards_gold": 499, "yards_silver": 456, "yards_jade": 456},
    {"hole": 9, "par": 4, "stroke_index": 16, "yards_black": 322, "yards_gold": 301, "yards_silver": 301, "yards_jade": 201},
    {"hole": 10, "par": 4, "stroke_index": 5, "yards_black": 347, "yards_gold": 327, "yards_silver": 308, "yards_jade": 308},
    {"hole": 11, "par": 4, "stroke_index": 11, "yards_black": 351, "yards_gold": 325, "yards_silver": 302, "yards_jade": 302},
    {"hole": 12, "par": 4, "stroke_index": 9, "yards_black": 342, "yards_gold": 325, "yards_silver": 305, "yards_jade": 267},
    {"hole": 13, "par": 5, "stroke_index": 7, "yards_black": 551, "yards_gold": 533, "yards_silver": 493, "yards_jade": 478},
    {"hole": 14, "par": 3, "stroke_index": 17, "yards_black": 149, "yards_gold": 146, "yards_silver": 131, "yards_jade": 131},
    {"hole": 15, "par": 4, "stroke_index": 3, "yards_black": 399, "yards_gold": 374, "yards_silver": 356, "yards_jade": 316},
    {"hole": 16, "par": 3, "stroke_index": 15, "yards_black": 173, "yards_gold": 149, "yards_silver": 130, "yards_jade": 106},
    {"hole": 17, "par": 5, "stroke_index": 13, "yards_black": 483, "yards_gold": 460, "yards_silver": 427, "yards_jade": 407},
    {"hole": 18, "par": 4, "stroke_index": 1, "yards_black": 396, "yards_gold": 378, "yards_silver": 383, "yards_jade": 307}
  ]'::jsonb
)
ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name,
  tees = EXCLUDED.tees,
  holes_data = EXCLUDED.holes_data,
  updated_at = NOW();

-- ============================================================================
-- 4. GAILES GOLF CLUB
-- ============================================================================
INSERT INTO venues (id, name, address, city, state, country, postal_code, phone, email, website, latitude, longitude, timezone, created_at, updated_at)
VALUES (
  'f2a3b4c5-d6e7-8901-abcd-500000000804',
  'Gailes Golf Club',
  'Gailes Road',
  'Wacol',
  'Queensland',
  'Australia',
  '4076',
  NULL,
  NULL,
  'https://www.gailesgolfclub.com.au',
  -27.5856,
  152.9383,
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
  'f2a3b4c5-d6e7-8901-abcd-600000000804',
  'f2a3b4c5-d6e7-8901-abcd-500000000804',
  'Gailes Golf Club',
  'Championship course established 1924. Parkland style layout.',
  18,
  73,
  72.5,
  127,
  6254,
  5720,
  NULL,
  1924,
  'private',
  NOW(),
  NOW(),
  '[
    {"name": "Black", "color": "black", "rating": 72.5, "slope": 127, "yards": 6254},
    {"name": "Blue", "color": "blue", "rating": 71.8, "slope": 126, "yards": 6151},
    {"name": "White", "color": "white", "rating": 71.1, "slope": 124, "yards": 6044},
    {"name": "Red", "color": "red", "rating": 73.2, "slope": 128, "yards": 5375}
  ]'::jsonb,
  '[
    {"hole": 1, "par": 5, "stroke_index": 15, "yards_black": 482, "yards_blue": 474, "yards_white": 465, "yards_red": 455},
    {"hole": 2, "par": 5, "stroke_index": 14, "yards_black": 466, "yards_blue": 454, "yards_white": 448, "yards_red": 307},
    {"hole": 3, "par": 3, "stroke_index": 10, "yards_black": 176, "yards_blue": 169, "yards_white": 147, "yards_red": 123},
    {"hole": 4, "par": 4, "stroke_index": 18, "yards_black": 238, "yards_blue": 234, "yards_white": 230, "yards_red": 219},
    {"hole": 5, "par": 4, "stroke_index": 6, "yards_black": 370, "yards_blue": 364, "yards_white": 358, "yards_red": 345},
    {"hole": 6, "par": 3, "stroke_index": 8, "yards_black": 201, "yards_blue": 193, "yards_white": 167, "yards_red": 153},
    {"hole": 7, "par": 4, "stroke_index": 3, "yards_black": 392, "yards_blue": 385, "yards_white": 379, "yards_red": 357},
    {"hole": 8, "par": 4, "stroke_index": 4, "yards_black": 358, "yards_blue": 348, "yards_white": 340, "yards_red": 326},
    {"hole": 9, "par": 5, "stroke_index": 12, "yards_black": 503, "yards_blue": 497, "yards_white": 493, "yards_red": 428},
    {"hole": 10, "par": 4, "stroke_index": 2, "yards_black": 384, "yards_blue": 380, "yards_white": 377, "yards_red": 315},
    {"hole": 11, "par": 4, "stroke_index": 13, "yards_black": 329, "yards_blue": 324, "yards_white": 317, "yards_red": 275},
    {"hole": 12, "par": 3, "stroke_index": 11, "yards_black": 134, "yards_blue": 126, "yards_white": 177, "yards_red": 108},
    {"hole": 13, "par": 4, "stroke_index": 5, "yards_black": 351, "yards_blue": 345, "yards_white": 333, "yards_red": 320},
    {"hole": 14, "par": 4, "stroke_index": 9, "yards_black": 343, "yards_blue": 343, "yards_white": 336, "yards_red": 278},
    {"hole": 15, "par": 4, "stroke_index": 1, "yards_black": 403, "yards_blue": 403, "yards_white": 390, "yards_red": 384},
    {"hole": 16, "par": 4, "stroke_index": 7, "yards_black": 367, "yards_blue": 367, "yards_white": 353, "yards_red": 334},
    {"hole": 17, "par": 4, "stroke_index": 17, "yards_black": 276, "yards_blue": 268, "yards_white": 260, "yards_red": 251},
    {"hole": 18, "par": 5, "stroke_index": 16, "yards_black": 481, "yards_blue": 477, "yards_white": 474, "yards_red": 397}
  ]'::jsonb
)
ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name,
  tees = EXCLUDED.tees,
  holes_data = EXCLUDED.holes_data,
  updated_at = NOW();

-- ============================================================================
-- 5. ASHGROVE GOLF CLUB
-- ============================================================================
INSERT INTO venues (id, name, address, city, state, country, postal_code, phone, email, website, latitude, longitude, timezone, created_at, updated_at)
VALUES (
  'f2a3b4c5-d6e7-8901-abcd-500000000805',
  'Ashgrove Golf Club',
  'Waterworks Road',
  'The Gap',
  'Queensland',
  'Australia',
  '4061',
  NULL,
  NULL,
  'https://www.ashgrovegolfclub.com.au',
  -27.4427,
  152.9374,
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
  'f2a3b4c5-d6e7-8901-abcd-600000000805',
  'f2a3b4c5-d6e7-8901-abcd-500000000805',
  'Ashgrove Golf Club',
  'Parkland course designed by Stan Francis, opened 1939.',
  18,
  67,
  66.0,
  124,
  4481,
  4098,
  'Stan Francis',
  1939,
  'private',
  NOW(),
  NOW(),
  '[
    {"name": "Blue", "color": "blue", "rating": 66.0, "slope": 124, "yards": 4481},
    {"name": "Red", "color": "red", "rating": 68.0, "slope": null, "yards": 4481}
  ]'::jsonb,
  '[
    {"hole": 1, "par": 4, "stroke_index": 1, "yards_blue": 390, "yards_red": 390},
    {"hole": 2, "par": 4, "stroke_index": 14, "yards_blue": 292, "yards_red": 292},
    {"hole": 3, "par": 3, "stroke_index": 5, "yards_blue": 160, "yards_red": 160},
    {"hole": 4, "par": 5, "stroke_index": 17, "yards_blue": 432, "yards_red": 432},
    {"hole": 5, "par": 4, "stroke_index": 11, "yards_blue": 285, "yards_red": 285},
    {"hole": 6, "par": 3, "stroke_index": 10, "yards_blue": 100, "yards_red": 100},
    {"hole": 7, "par": 4, "stroke_index": 16, "yards_blue": 237, "yards_red": 237},
    {"hole": 8, "par": 3, "stroke_index": 8, "yards_blue": 140, "yards_red": 140},
    {"hole": 9, "par": 3, "stroke_index": 15, "yards_blue": 135, "yards_red": 135},
    {"hole": 10, "par": 3, "stroke_index": 2, "yards_blue": 147, "yards_red": 147},
    {"hole": 11, "par": 4, "stroke_index": 7, "yards_blue": 315, "yards_red": 315},
    {"hole": 12, "par": 4, "stroke_index": 3, "yards_blue": 303, "yards_red": 303},
    {"hole": 13, "par": 3, "stroke_index": 4, "yards_blue": 142, "yards_red": 142},
    {"hole": 14, "par": 5, "stroke_index": 9, "yards_blue": 421, "yards_red": 421},
    {"hole": 15, "par": 4, "stroke_index": 12, "yards_blue": 322, "yards_red": 322},
    {"hole": 16, "par": 4, "stroke_index": 6, "yards_blue": 323, "yards_red": 323},
    {"hole": 17, "par": 3, "stroke_index": 13, "yards_blue": 101, "yards_red": 101},
    {"hole": 18, "par": 4, "stroke_index": 18, "yards_blue": 236, "yards_red": 236}
  ]'::jsonb
)
ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name,
  tees = EXCLUDED.tees,
  holes_data = EXCLUDED.holes_data,
  updated_at = NOW();

-- ============================================================================
-- 6. WYNNUM GOLF CLUB
-- ============================================================================
INSERT INTO venues (id, name, address, city, state, country, postal_code, phone, email, website, latitude, longitude, timezone, created_at, updated_at)
VALUES (
  'f2a3b4c5-d6e7-8901-abcd-500000000806',
  'Wynnum Golf Club',
  '64 Stradbroke Avenue',
  'Wynnum',
  'Queensland',
  'Australia',
  '4178',
  '+61 7 3396 9000',
  'admin@wynnumgolf.com',
  'https://www.wynnumgolf.com',
  -27.4558,
  153.1704,
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
  'f2a3b4c5-d6e7-8901-abcd-600000000806',
  'f2a3b4c5-d6e7-8901-abcd-500000000806',
  'Wynnum Golf Club',
  'Bayside parkland course established 1922. Open guest policy.',
  18,
  70,
  68.0,
  121,
  5353,
  4895,
  NULL,
  1922,
  'private',
  NOW(),
  NOW(),
  '[
    {"name": "Blue", "color": "blue", "rating": 68.0, "slope": 121, "yards": 5353},
    {"name": "Red", "color": "red", "rating": 72.0, "slope": 124, "yards": 5137}
  ]'::jsonb,
  '[
    {"hole": 1, "par": 4, "stroke_index": 18, "yards_blue": 261, "yards_red": 261},
    {"hole": 2, "par": 5, "stroke_index": 9, "yards_blue": 466, "yards_red": 456},
    {"hole": 3, "par": 4, "stroke_index": 6, "yards_blue": 350, "yards_red": 331},
    {"hole": 4, "par": 4, "stroke_index": 1, "yards_blue": 412, "yards_red": 401},
    {"hole": 5, "par": 3, "stroke_index": 5, "yards_blue": 166, "yards_red": 136},
    {"hole": 6, "par": 3, "stroke_index": 16, "yards_blue": 111, "yards_red": 108},
    {"hole": 7, "par": 4, "stroke_index": 12, "yards_blue": 304, "yards_red": 297},
    {"hole": 8, "par": 4, "stroke_index": 14, "yards_blue": 297, "yards_red": 288},
    {"hole": 9, "par": 3, "stroke_index": 7, "yards_blue": 156, "yards_red": 144},
    {"hole": 10, "par": 4, "stroke_index": 11, "yards_blue": 272, "yards_red": 260},
    {"hole": 11, "par": 4, "stroke_index": 2, "yards_blue": 406, "yards_red": 394},
    {"hole": 12, "par": 5, "stroke_index": 17, "yards_blue": 433, "yards_red": 423},
    {"hole": 13, "par": 5, "stroke_index": 8, "yards_blue": 466, "yards_red": 460},
    {"hole": 14, "par": 4, "stroke_index": 13, "yards_blue": 266, "yards_red": 262},
    {"hole": 15, "par": 3, "stroke_index": 4, "yards_blue": 182, "yards_red": 180},
    {"hole": 16, "par": 3, "stroke_index": 15, "yards_blue": 124, "yards_red": 115},
    {"hole": 17, "par": 4, "stroke_index": 3, "yards_blue": 366, "yards_red": 311},
    {"hole": 18, "par": 4, "stroke_index": 10, "yards_blue": 315, "yards_red": 310}
  ]'::jsonb
)
ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name,
  tees = EXCLUDED.tees,
  holes_data = EXCLUDED.holes_data,
  updated_at = NOW();

-- ============================================================================
-- 7. ST LUCIA GOLF LINKS
-- ============================================================================
INSERT INTO venues (id, name, address, city, state, country, postal_code, phone, email, website, latitude, longitude, timezone, created_at, updated_at)
VALUES (
  'f2a3b4c5-d6e7-8901-abcd-500000000807',
  'St Lucia Golf Links',
  'Carawa Street',
  'St Lucia',
  'Queensland',
  'Australia',
  '4067',
  NULL,
  NULL,
  'https://www.stluciagolf.com.au',
  -27.5048,
  153.0012,
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
  'f2a3b4c5-d6e7-8901-abcd-600000000807',
  'f2a3b4c5-d6e7-8901-abcd-500000000807',
  'St Lucia Golf Links',
  'Public course near University of Queensland. Opened 1985, parkland style.',
  18,
  68,
  68.0,
  114,
  4691,
  4290,
  NULL,
  1985,
  'public',
  NOW(),
  NOW(),
  '[
    {"name": "Mens", "color": "white", "rating": 68.0, "slope": 114, "yards": 4691},
    {"name": "Ladies", "color": "red", "rating": 68.0, "slope": 114, "yards": 4354}
  ]'::jsonb,
  '[
    {"hole": 1, "par": 4, "stroke_index": 3, "yards_mens": 386, "yards_ladies": 376},
    {"hole": 2, "par": 3, "stroke_index": 16, "yards_mens": 152, "yards_ladies": 141},
    {"hole": 3, "par": 4, "stroke_index": 18, "yards_mens": 251, "yards_ladies": 146},
    {"hole": 4, "par": 4, "stroke_index": 17, "yards_mens": 301, "yards_ladies": 274},
    {"hole": 5, "par": 4, "stroke_index": 7, "yards_mens": 309, "yards_ladies": 289},
    {"hole": 6, "par": 5, "stroke_index": 8, "yards_mens": 437, "yards_ladies": 429},
    {"hole": 7, "par": 4, "stroke_index": 10, "yards_mens": 300, "yards_ladies": 223},
    {"hole": 8, "par": 3, "stroke_index": 13, "yards_mens": 122, "yards_ladies": 116},
    {"hole": 9, "par": 3, "stroke_index": 2, "yards_mens": 150, "yards_ladies": 247},
    {"hole": 10, "par": 4, "stroke_index": 1, "yards_mens": 395, "yards_ladies": 373},
    {"hole": 11, "par": 3, "stroke_index": 11, "yards_mens": 166, "yards_ladies": 148},
    {"hole": 12, "par": 4, "stroke_index": 5, "yards_mens": 375, "yards_ladies": 307},
    {"hole": 13, "par": 4, "stroke_index": 12, "yards_mens": 313, "yards_ladies": 257},
    {"hole": 14, "par": 4, "stroke_index": 4, "yards_mens": 371, "yards_ladies": 358},
    {"hole": 15, "par": 4, "stroke_index": 6, "yards_mens": 379, "yards_ladies": 362},
    {"hole": 16, "par": 3, "stroke_index": 9, "yards_mens": 163, "yards_ladies": 153},
    {"hole": 17, "par": 4, "stroke_index": 15, "yards_mens": 319, "yards_ladies": 306},
    {"hole": 18, "par": 4, "stroke_index": 14, "yards_mens": 302, "yards_ladies": 249}
  ]'::jsonb
)
ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name,
  tees = EXCLUDED.tees,
  holes_data = EXCLUDED.holes_data,
  updated_at = NOW();

-- ============================================================================
-- 8. CARBROOK GOLF CLUB
-- ============================================================================
INSERT INTO venues (id, name, address, city, state, country, postal_code, phone, email, website, latitude, longitude, timezone, created_at, updated_at)
VALUES (
  'f2a3b4c5-d6e7-8901-abcd-500000000808',
  'Carbrook Golf Club',
  'Boundary Road',
  'Carbrook',
  'Queensland',
  'Australia',
  '4130',
  NULL,
  NULL,
  'https://www.carbrookgolf.com.au',
  -27.6887,
  153.2442,
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
  'f2a3b4c5-d6e7-8901-abcd-600000000808',
  'f2a3b4c5-d6e7-8901-abcd-500000000808',
  'Carbrook Golf Club',
  'Famous for bull sharks in the lake. Parkland course opened 1978.',
  18,
  71,
  72.0,
  125,
  6146,
  5621,
  NULL,
  1978,
  'private',
  NOW(),
  NOW(),
  '[
    {"name": "Blue", "color": "blue", "rating": 72.0, "slope": 125, "yards": 6146},
    {"name": "White", "color": "white", "rating": 70.0, "slope": 122, "yards": 5849},
    {"name": "Red", "color": "red", "rating": 73.0, "slope": 127, "yards": 5400}
  ]'::jsonb,
  '[
    {"hole": 1, "par": 4, "stroke_index": 12, "yards_blue": 313, "yards_white": 290, "yards_red": 280},
    {"hole": 2, "par": 3, "stroke_index": 17, "yards_blue": 150, "yards_white": 145, "yards_red": 140},
    {"hole": 3, "par": 4, "stroke_index": 6, "yards_blue": 365, "yards_white": 348, "yards_red": 315},
    {"hole": 4, "par": 5, "stroke_index": 15, "yards_blue": 461, "yards_white": 450, "yards_red": 401},
    {"hole": 5, "par": 4, "stroke_index": 3, "yards_blue": 394, "yards_white": 375, "yards_red": 335},
    {"hole": 6, "par": 4, "stroke_index": 9, "yards_blue": 387, "yards_white": 358, "yards_red": 330},
    {"hole": 7, "par": 3, "stroke_index": 18, "yards_blue": 122, "yards_white": 112, "yards_red": 106},
    {"hole": 8, "par": 5, "stroke_index": 14, "yards_blue": 485, "yards_white": 479, "yards_red": 465},
    {"hole": 9, "par": 4, "stroke_index": 7, "yards_blue": 357, "yards_white": 339, "yards_red": 325},
    {"hole": 10, "par": 4, "stroke_index": 13, "yards_blue": 339, "yards_white": 324, "yards_red": 300},
    {"hole": 11, "par": 3, "stroke_index": 11, "yards_blue": 160, "yards_white": 148, "yards_red": 130},
    {"hole": 12, "par": 4, "stroke_index": 1, "yards_blue": 425, "yards_white": 416, "yards_red": 408},
    {"hole": 13, "par": 4, "stroke_index": 2, "yards_blue": 398, "yards_white": 386, "yards_red": 357},
    {"hole": 14, "par": 3, "stroke_index": 16, "yards_blue": 169, "yards_white": 160, "yards_red": 115},
    {"hole": 15, "par": 4, "stroke_index": 8, "yards_blue": 333, "yards_white": 327, "yards_red": 303},
    {"hole": 16, "par": 5, "stroke_index": 10, "yards_blue": 512, "yards_white": 480, "yards_red": 449},
    {"hole": 17, "par": 4, "stroke_index": 4, "yards_blue": 385, "yards_white": 344, "yards_red": 315},
    {"hole": 18, "par": 4, "stroke_index": 5, "yards_blue": 391, "yards_white": 368, "yards_red": 326}
  ]'::jsonb
)
ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name,
  tees = EXCLUDED.tees,
  holes_data = EXCLUDED.holes_data,
  updated_at = NOW();

-- ============================================================================
-- 9. OXLEY GOLF CLUB
-- ============================================================================
INSERT INTO venues (id, name, address, city, state, country, postal_code, phone, email, website, latitude, longitude, timezone, created_at, updated_at)
VALUES (
  'f2a3b4c5-d6e7-8901-abcd-500000000809',
  'Oxley Golf Club',
  '290 Boundary Road',
  'Oxley',
  'Queensland',
  'Australia',
  '4075',
  NULL,
  NULL,
  'https://www.oxleygolfclub.com.au',
  -27.5526,
  152.9833,
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
  'f2a3b4c5-d6e7-8901-abcd-600000000809',
  'f2a3b4c5-d6e7-8901-abcd-500000000809',
  'Oxley Golf Club',
  'Parkland course established 1928.',
  18,
  72,
  72.5,
  124,
  6240,
  5706,
  NULL,
  1928,
  'private',
  NOW(),
  NOW(),
  '[
    {"name": "Black", "color": "black", "rating": 72.5, "slope": 124, "yards": 6240},
    {"name": "Blue", "color": "blue", "rating": 71.5, "slope": 123, "yards": 6089},
    {"name": "White", "color": "white", "rating": 70.0, "slope": 72, "yards": 5822},
    {"name": "Red", "color": "red", "rating": 73.5, "slope": 124, "yards": 5380},
    {"name": "Yellow", "color": "yellow", "rating": 73.0, "slope": 123, "yards": 5263}
  ]'::jsonb,
  '[
    {"hole": 1, "par": 4, "stroke_index": 7, "yards_black": 350, "yards_blue": 347, "yards_white": 343, "yards_red": 343, "yards_yellow": 338},
    {"hole": 2, "par": 5, "stroke_index": 16, "yards_black": 453, "yards_blue": 443, "yards_white": 438, "yards_red": 423, "yards_yellow": 378},
    {"hole": 3, "par": 3, "stroke_index": 6, "yards_black": 175, "yards_blue": 163, "yards_white": 153, "yards_red": 153, "yards_yellow": 140},
    {"hole": 4, "par": 4, "stroke_index": 3, "yards_black": 390, "yards_blue": 380, "yards_white": 365, "yards_red": 356, "yards_yellow": 352},
    {"hole": 5, "par": 3, "stroke_index": 13, "yards_black": 161, "yards_blue": 154, "yards_white": 144, "yards_red": 154, "yards_yellow": 144},
    {"hole": 6, "par": 4, "stroke_index": 15, "yards_black": 295, "yards_blue": 290, "yards_white": 284, "yards_red": 284, "yards_yellow": 275},
    {"hole": 7, "par": 5, "stroke_index": 12, "yards_black": 471, "yards_blue": 463, "yards_white": 383, "yards_red": 386, "yards_yellow": 380},
    {"hole": 8, "par": 4, "stroke_index": 4, "yards_black": 378, "yards_blue": 373, "yards_white": 356, "yards_red": 276, "yards_yellow": 276},
    {"hole": 9, "par": 3, "stroke_index": 18, "yards_black": 128, "yards_blue": 123, "yards_white": 116, "yards_red": 116, "yards_yellow": 116},
    {"hole": 10, "par": 4, "stroke_index": 14, "yards_black": 336, "yards_blue": 331, "yards_white": 326, "yards_red": 331, "yards_yellow": 326},
    {"hole": 11, "par": 5, "stroke_index": 17, "yards_black": 463, "yards_blue": 449, "yards_white": 434, "yards_red": 370, "yards_yellow": 370},
    {"hole": 12, "par": 5, "stroke_index": 10, "yards_black": 551, "yards_blue": 541, "yards_white": 520, "yards_red": 467, "yards_yellow": 467},
    {"hole": 13, "par": 3, "stroke_index": 5, "yards_black": 208, "yards_blue": 202, "yards_white": 195, "yards_red": 147, "yards_yellow": 144},
    {"hole": 14, "par": 4, "stroke_index": 9, "yards_black": 355, "yards_blue": 349, "yards_white": 315, "yards_red": 296, "yards_yellow": 292},
    {"hole": 15, "par": 4, "stroke_index": 2, "yards_black": 397, "yards_blue": 390, "yards_white": 380, "yards_red": 353, "yards_yellow": 349},
    {"hole": 16, "par": 4, "stroke_index": 1, "yards_black": 410, "yards_blue": 400, "yards_white": 390, "yards_red": 332, "yards_yellow": 327},
    {"hole": 17, "par": 4, "stroke_index": 11, "yards_black": 354, "yards_blue": 348, "yards_white": 340, "yards_red": 318, "yards_yellow": 318},
    {"hole": 18, "par": 4, "stroke_index": 8, "yards_black": 365, "yards_blue": 343, "yards_white": 340, "yards_red": 275, "yards_yellow": 271}
  ]'::jsonb
)
ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name,
  tees = EXCLUDED.tees,
  holes_data = EXCLUDED.holes_data,
  updated_at = NOW();

-- ============================================================================
-- 10. WANTIMA COUNTRY CLUB
-- ============================================================================
INSERT INTO venues (id, name, address, city, state, country, postal_code, phone, email, website, latitude, longitude, timezone, created_at, updated_at)
VALUES (
  'f2a3b4c5-d6e7-8901-abcd-500000000810',
  'Wantima Country Club',
  'Wantima Golf Course Road',
  'Brendale',
  'Queensland',
  'Australia',
  '4500',
  NULL,
  NULL,
  'https://www.wantimacountryclub.com.au',
  -27.3103,
  152.9872,
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
  'f2a3b4c5-d6e7-8901-abcd-600000000810',
  'f2a3b4c5-d6e7-8901-abcd-500000000810',
  'Wantima Country Club',
  'Parkland course established 1969.',
  18,
  70,
  70.0,
  125,
  5833,
  5334,
  NULL,
  1969,
  'private',
  NOW(),
  NOW(),
  '[
    {"name": "Blue", "color": "blue", "rating": 70.0, "slope": 125, "yards": 5833},
    {"name": "White", "color": "white", "rating": 69.0, "slope": 120, "yards": 5566},
    {"name": "Yellow", "color": "yellow", "rating": 68.0, "slope": 119, "yards": 5404},
    {"name": "Red", "color": "red", "rating": 72.0, "slope": 123, "yards": 5171}
  ]'::jsonb,
  '[
    {"hole": 1, "par": 4, "stroke_index": 3, "yards_blue": 390, "yards_white": 372, "yards_yellow": 369, "yards_red": 369},
    {"hole": 2, "par": 4, "stroke_index": 15, "yards_blue": 325, "yards_white": 319, "yards_yellow": 314, "yards_red": 274},
    {"hole": 3, "par": 4, "stroke_index": 13, "yards_blue": 339, "yards_white": 333, "yards_yellow": 331, "yards_red": 305},
    {"hole": 4, "par": 4, "stroke_index": 11, "yards_blue": 319, "yards_white": 283, "yards_yellow": 269, "yards_red": 269},
    {"hole": 5, "par": 3, "stroke_index": 17, "yards_blue": 160, "yards_white": 152, "yards_yellow": 147, "yards_red": 140},
    {"hole": 6, "par": 4, "stroke_index": 1, "yards_blue": 395, "yards_white": 390, "yards_yellow": 372, "yards_red": 378},
    {"hole": 7, "par": 4, "stroke_index": 9, "yards_blue": 334, "yards_white": 314, "yards_yellow": 303, "yards_red": 281},
    {"hole": 8, "par": 4, "stroke_index": 5, "yards_blue": 390, "yards_white": 354, "yards_yellow": 351, "yards_red": 346},
    {"hole": 9, "par": 4, "stroke_index": 7, "yards_blue": 359, "yards_white": 352, "yards_yellow": 342, "yards_red": 347},
    {"hole": 10, "par": 3, "stroke_index": 16, "yards_blue": 124, "yards_white": 115, "yards_yellow": 105, "yards_red": 93},
    {"hole": 11, "par": 4, "stroke_index": 4, "yards_blue": 390, "yards_white": 384, "yards_yellow": 366, "yards_red": 336},
    {"hole": 12, "par": 3, "stroke_index": 14, "yards_blue": 162, "yards_white": 139, "yards_yellow": 130, "yards_red": 121},
    {"hole": 13, "par": 5, "stroke_index": 8, "yards_blue": 450, "yards_white": 442, "yards_yellow": 435, "yards_red": 395},
    {"hole": 14, "par": 4, "stroke_index": 2, "yards_blue": 400, "yards_white": 367, "yards_yellow": 362, "yards_red": 341},
    {"hole": 15, "par": 5, "stroke_index": 12, "yards_blue": 458, "yards_white": 452, "yards_yellow": 446, "yards_red": 446},
    {"hole": 16, "par": 3, "stroke_index": 10, "yards_blue": 172, "yards_white": 165, "yards_yellow": 144, "yards_red": 160},
    {"hole": 17, "par": 4, "stroke_index": 18, "yards_blue": 295, "yards_white": 269, "yards_yellow": 261, "yards_red": 231},
    {"hole": 18, "par": 4, "stroke_index": 6, "yards_blue": 371, "yards_white": 364, "yards_yellow": 357, "yards_red": 339}
  ]'::jsonb
)
ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name,
  tees = EXCLUDED.tees,
  holes_data = EXCLUDED.holes_data,
  updated_at = NOW();

-- ============================================================================
-- 11. WOLSTON PARK GOLF CLUB
-- ============================================================================
INSERT INTO venues (id, name, address, city, state, country, postal_code, phone, email, website, latitude, longitude, timezone, created_at, updated_at)
VALUES (
  'f2a3b4c5-d6e7-8901-abcd-500000000811',
  'Wolston Park Golf Club',
  'Grindle Road',
  'Wacol',
  'Queensland',
  'Australia',
  '4076',
  NULL,
  NULL,
  'https://www.wolstonparkgolf.com.au',
  -27.5872,
  152.9267,
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
  'f2a3b4c5-d6e7-8901-abcd-600000000811',
  'f2a3b4c5-d6e7-8901-abcd-500000000811',
  'Wolston Park Golf Club',
  'Parkland course. Closed guest policy.',
  18,
  67,
  65.0,
  117,
  4869,
  4452,
  NULL,
  NULL,
  'private',
  NOW(),
  NOW(),
  '[
    {"name": "Black", "color": "black", "rating": null, "slope": null, "yards": 4869},
    {"name": "Blue", "color": "blue", "rating": 65.0, "slope": 117, "yards": 4751},
    {"name": "Red", "color": "red", "rating": 68.0, "slope": 115, "yards": 4578},
    {"name": "Yellow", "color": "yellow", "rating": 64.0, "slope": 103, "yards": 4470}
  ]'::jsonb,
  '[
    {"hole": 1, "par": 4, "stroke_index": 18, "yards_black": 316, "yards_blue": 313, "yards_red": 313, "yards_yellow": 305},
    {"hole": 2, "par": 4, "stroke_index": 14, "yards_black": 284, "yards_blue": 272, "yards_red": 274, "yards_yellow": 269},
    {"hole": 3, "par": 3, "stroke_index": 6, "yards_black": 176, "yards_blue": 171, "yards_red": 171, "yards_yellow": 166},
    {"hole": 4, "par": 5, "stroke_index": 4, "yards_black": 481, "yards_blue": 477, "yards_red": 477, "yards_yellow": 475},
    {"hole": 5, "par": 3, "stroke_index": 2, "yards_black": 178, "yards_blue": 175, "yards_red": 171, "yards_yellow": 159},
    {"hole": 6, "par": 4, "stroke_index": 8, "yards_black": 336, "yards_blue": 330, "yards_red": 309, "yards_yellow": 308},
    {"hole": 7, "par": 5, "stroke_index": 10, "yards_black": 452, "yards_blue": 438, "yards_red": 387, "yards_yellow": 387},
    {"hole": 8, "par": 3, "stroke_index": 12, "yards_black": 128, "yards_blue": 123, "yards_red": 123, "yards_yellow": 116},
    {"hole": 9, "par": 4, "stroke_index": 16, "yards_black": 260, "yards_blue": 256, "yards_red": 256, "yards_yellow": 249},
    {"hole": 10, "par": 3, "stroke_index": 17, "yards_black": 110, "yards_blue": 105, "yards_red": 105, "yards_yellow": 99},
    {"hole": 11, "par": 4, "stroke_index": 11, "yards_black": 283, "yards_blue": 273, "yards_red": 262, "yards_yellow": 262},
    {"hole": 12, "par": 4, "stroke_index": 5, "yards_black": 335, "yards_blue": 329, "yards_red": 280, "yards_yellow": 268},
    {"hole": 13, "par": 3, "stroke_index": 15, "yards_black": 134, "yards_blue": 124, "yards_red": 84, "yards_yellow": 111},
    {"hole": 14, "par": 3, "stroke_index": 13, "yards_black": 138, "yards_blue": 132, "yards_red": 132, "yards_yellow": 123},
    {"hole": 15, "par": 4, "stroke_index": 9, "yards_black": 320, "yards_blue": 317, "yards_red": 317, "yards_yellow": 306},
    {"hole": 16, "par": 3, "stroke_index": 7, "yards_black": 164, "yards_blue": 159, "yards_red": 159, "yards_yellow": 156},
    {"hole": 17, "par": 4, "stroke_index": 1, "yards_black": 407, "yards_blue": 396, "yards_red": 392, "yards_yellow": 363},
    {"hole": 18, "par": 4, "stroke_index": 3, "yards_black": 367, "yards_blue": 361, "yards_red": 366, "yards_yellow": 348}
  ]'::jsonb
)
ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name,
  tees = EXCLUDED.tees,
  holes_data = EXCLUDED.holes_data,
  updated_at = NOW();

-- ============================================================================
-- 12. REDCLIFFE GOLF CLUB
-- ============================================================================
INSERT INTO venues (id, name, address, city, state, country, postal_code, phone, email, website, latitude, longitude, timezone, created_at, updated_at)
VALUES (
  'f2a3b4c5-d6e7-8901-abcd-500000000812',
  'Redcliffe Golf Club',
  'Hornibrook Esplanade',
  'Clontarf',
  'Queensland',
  'Australia',
  '4019',
  NULL,
  NULL,
  'https://www.redcliffegolf.com.au',
  -27.2506,
  153.0753,
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
  'f2a3b4c5-d6e7-8901-abcd-600000000812',
  'f2a3b4c5-d6e7-8901-abcd-500000000812',
  'Redcliffe Golf Club',
  'Coastal parkland course established 1935. Open guest policy.',
  18,
  71,
  72.0,
  123,
  6099,
  5577,
  NULL,
  1935,
  'private',
  NOW(),
  NOW(),
  '[
    {"name": "Blue", "color": "blue", "rating": 72.0, "slope": 123, "yards": 6099},
    {"name": "White", "color": "white", "rating": 71.0, "slope": 121, "yards": 5937},
    {"name": "Red", "color": "red", "rating": 74.0, "slope": 123, "yards": 5433}
  ]'::jsonb,
  '[
    {"hole": 1, "par": 4, "stroke_index": 16, "yards_blue": 342, "yards_white": 333, "yards_red": 326},
    {"hole": 2, "par": 3, "stroke_index": 8, "yards_blue": 176, "yards_white": 169, "yards_red": 160},
    {"hole": 3, "par": 4, "stroke_index": 11, "yards_blue": 357, "yards_white": 344, "yards_red": 316},
    {"hole": 4, "par": 5, "stroke_index": 18, "yards_blue": 436, "yards_white": 436, "yards_red": 418},
    {"hole": 5, "par": 4, "stroke_index": 9, "yards_blue": 364, "yards_white": 355, "yards_red": 354},
    {"hole": 6, "par": 4, "stroke_index": 5, "yards_blue": 388, "yards_white": 379, "yards_red": 317},
    {"hole": 7, "par": 3, "stroke_index": 4, "yards_blue": 207, "yards_white": 193, "yards_red": 182},
    {"hole": 8, "par": 4, "stroke_index": 14, "yards_blue": 319, "yards_white": 310, "yards_red": 286},
    {"hole": 9, "par": 4, "stroke_index": 1, "yards_blue": 417, "yards_white": 409, "yards_red": 414},
    {"hole": 10, "par": 5, "stroke_index": 15, "yards_blue": 471, "yards_white": 464, "yards_red": 404},
    {"hole": 11, "par": 3, "stroke_index": 10, "yards_blue": 154, "yards_white": 146, "yards_red": 151},
    {"hole": 12, "par": 4, "stroke_index": 3, "yards_blue": 422, "yards_white": 417, "yards_red": 405},
    {"hole": 13, "par": 3, "stroke_index": 17, "yards_blue": 134, "yards_white": 125, "yards_red": 114},
    {"hole": 14, "par": 4, "stroke_index": 13, "yards_blue": 295, "yards_white": 287, "yards_red": 288},
    {"hole": 15, "par": 4, "stroke_index": 7, "yards_blue": 358, "yards_white": 351, "yards_red": 310},
    {"hole": 16, "par": 5, "stroke_index": 12, "yards_blue": 506, "yards_white": 483, "yards_red": 401},
    {"hole": 17, "par": 4, "stroke_index": 6, "yards_blue": 367, "yards_white": 359, "yards_red": 291},
    {"hole": 18, "par": 4, "stroke_index": 2, "yards_blue": 386, "yards_white": 377, "yards_red": 296}
  ]'::jsonb
)
ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name,
  tees = EXCLUDED.tees,
  holes_data = EXCLUDED.holes_data,
  updated_at = NOW();

-- ============================================================================
-- 13. IPSWICH GOLF CLUB
-- ============================================================================
INSERT INTO venues (id, name, address, city, state, country, postal_code, phone, email, website, latitude, longitude, timezone, created_at, updated_at)
VALUES (
  'f2a3b4c5-d6e7-8901-abcd-500000000813',
  'Ipswich Golf Club',
  'Leichhardt Street',
  'Leichhardt',
  'Queensland',
  'Australia',
  '4305',
  NULL,
  NULL,
  'https://www.ipswichgolfclub.com.au',
  -27.6144,
  152.7517,
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
  'f2a3b4c5-d6e7-8901-abcd-600000000813',
  'f2a3b4c5-d6e7-8901-abcd-500000000813',
  'Ipswich Golf Club',
  'Historic Ipswich course established 1897. Designed by Wayne Grady. Parkland style.',
  18,
  72,
  72.0,
  126,
  5890,
  5386,
  'Wayne Grady',
  1897,
  'private',
  NOW(),
  NOW(),
  '[
    {"name": "Black", "color": "black", "rating": 72.0, "slope": 126, "yards": 5890},
    {"name": "Blue", "color": "blue", "rating": 71.0, "slope": 122, "yards": 5715},
    {"name": "White", "color": "white", "rating": 70.0, "slope": 120, "yards": 5558},
    {"name": "Red", "color": "red", "rating": 73.0, "slope": 131, "yards": 5353},
    {"name": "Yellow", "color": "yellow", "rating": 70.0, "slope": 124, "yards": 4807}
  ]'::jsonb,
  '[
    {"hole": 1, "par": 4, "stroke_index": 15, "yards_black": 338, "yards_blue": 338, "yards_white": 320, "yards_red": 338, "yards_yellow": 296},
    {"hole": 2, "par": 5, "stroke_index": 7, "yards_black": 533, "yards_blue": 490, "yards_white": 490, "yards_red": 459, "yards_yellow": 459},
    {"hole": 3, "par": 3, "stroke_index": 5, "yards_black": 181, "yards_blue": 167, "yards_white": 167, "yards_red": 156, "yards_yellow": 156},
    {"hole": 4, "par": 4, "stroke_index": 1, "yards_black": 389, "yards_blue": 361, "yards_white": 361, "yards_red": 298, "yards_yellow": 298},
    {"hole": 5, "par": 3, "stroke_index": 11, "yards_black": 150, "yards_blue": 131, "yards_white": 131, "yards_red": 128, "yards_yellow": 107},
    {"hole": 6, "par": 4, "stroke_index": 13, "yards_black": 322, "yards_blue": 322, "yards_white": 301, "yards_red": 301, "yards_yellow": 201},
    {"hole": 7, "par": 4, "stroke_index": 3, "yards_black": 376, "yards_blue": 376, "yards_white": 376, "yards_red": 279, "yards_yellow": 279},
    {"hole": 8, "par": 5, "stroke_index": 17, "yards_black": 461, "yards_blue": 453, "yards_white": 453, "yards_red": 449, "yards_yellow": 426},
    {"hole": 9, "par": 4, "stroke_index": 9, "yards_black": 302, "yards_blue": 302, "yards_white": 279, "yards_red": 279, "yards_yellow": 230},
    {"hole": 10, "par": 3, "stroke_index": 4, "yards_black": 145, "yards_blue": 145, "yards_white": 123, "yards_red": 123, "yards_yellow": 92},
    {"hole": 11, "par": 4, "stroke_index": 2, "yards_black": 365, "yards_blue": 365, "yards_white": 334, "yards_red": 334, "yards_yellow": 314},
    {"hole": 12, "par": 4, "stroke_index": 10, "yards_black": 349, "yards_blue": 349, "yards_white": 327, "yards_red": 327, "yards_yellow": 301},
    {"hole": 13, "par": 5, "stroke_index": 18, "yards_black": 466, "yards_blue": 442, "yards_white": 442, "yards_red": 438, "yards_yellow": 378},
    {"hole": 14, "par": 3, "stroke_index": 16, "yards_black": 149, "yards_blue": 125, "yards_white": 125, "yards_red": 125, "yards_yellow": 123},
    {"hole": 15, "par": 4, "stroke_index": 8, "yards_black": 330, "yards_blue": 325, "yards_white": 325, "yards_red": 322, "yards_yellow": 236},
    {"hole": 16, "par": 5, "stroke_index": 12, "yards_black": 458, "yards_blue": 458, "yards_white": 458, "yards_red": 437, "yards_yellow": 437},
    {"hole": 17, "par": 4, "stroke_index": 14, "yards_black": 254, "yards_blue": 254, "yards_white": 244, "yards_red": 254, "yards_yellow": 220},
    {"hole": 18, "par": 4, "stroke_index": 6, "yards_black": 322, "yards_blue": 312, "yards_white": 302, "yards_red": 306, "yards_yellow": 254}
  ]'::jsonb
)
ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name,
  tees = EXCLUDED.tees,
  holes_data = EXCLUDED.holes_data,
  updated_at = NOW();

-- ============================================================================
-- 14. BRIBIE ISLAND GOLF CLUB
-- ============================================================================
INSERT INTO venues (id, name, address, city, state, country, postal_code, phone, email, website, latitude, longitude, timezone, created_at, updated_at)
VALUES (
  'f2a3b4c5-d6e7-8901-abcd-500000000814',
  'Bribie Island Golf Club',
  'Links Court',
  'Woorim',
  'Queensland',
  'Australia',
  '4507',
  NULL,
  NULL,
  'https://www.bribieislandgolf.com.au',
  -27.0711,
  153.1858,
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
  'f2a3b4c5-d6e7-8901-abcd-600000000814',
  'f2a3b4c5-d6e7-8901-abcd-500000000814',
  'Bribie Island Golf Club',
  'Island parkland course opened 1969. Open guest policy.',
  18,
  72,
  72.0,
  130,
  6202,
  5672,
  NULL,
  1969,
  'private',
  NOW(),
  NOW(),
  '[
    {"name": "Championship", "color": "blue", "rating": 72.0, "slope": 130, "yards": 6202},
    {"name": "White", "color": "white", "rating": 71.0, "slope": 123, "yards": 5959},
    {"name": "Ladies", "color": "red", "rating": 74.0, "slope": 127, "yards": 5536}
  ]'::jsonb,
  '[
    {"hole": 1, "par": 4, "stroke_index": 6, "yards_championship": 349, "yards_white": 339, "yards_ladies": 304},
    {"hole": 2, "par": 4, "stroke_index": 2, "yards_championship": 407, "yards_white": 399, "yards_ladies": 400},
    {"hole": 3, "par": 5, "stroke_index": 17, "yards_championship": 448, "yards_white": 436, "yards_ladies": 410},
    {"hole": 4, "par": 3, "stroke_index": 15, "yards_championship": 165, "yards_white": 144, "yards_ladies": 132},
    {"hole": 5, "par": 5, "stroke_index": 9, "yards_championship": 497, "yards_white": 471, "yards_ladies": 461},
    {"hole": 6, "par": 4, "stroke_index": 12, "yards_championship": 319, "yards_white": 313, "yards_ladies": 295},
    {"hole": 7, "par": 3, "stroke_index": 18, "yards_championship": 148, "yards_white": 137, "yards_ladies": 130},
    {"hole": 8, "par": 4, "stroke_index": 13, "yards_championship": 343, "yards_white": 325, "yards_ladies": 317},
    {"hole": 9, "par": 4, "stroke_index": 3, "yards_championship": 373, "yards_white": 364, "yards_ladies": 322},
    {"hole": 10, "par": 4, "stroke_index": 1, "yards_championship": 424, "yards_white": 402, "yards_ladies": 403},
    {"hole": 11, "par": 4, "stroke_index": 7, "yards_championship": 402, "yards_white": 387, "yards_ladies": 286},
    {"hole": 12, "par": 5, "stroke_index": 11, "yards_championship": 475, "yards_white": 470, "yards_ladies": 445},
    {"hole": 13, "par": 4, "stroke_index": 8, "yards_championship": 366, "yards_white": 356, "yards_ladies": 345},
    {"hole": 14, "par": 3, "stroke_index": 16, "yards_championship": 169, "yards_white": 156, "yards_ladies": 130},
    {"hole": 15, "par": 4, "stroke_index": 10, "yards_championship": 329, "yards_white": 305, "yards_ladies": 275},
    {"hole": 16, "par": 3, "stroke_index": 14, "yards_championship": 172, "yards_white": 157, "yards_ladies": 136},
    {"hole": 17, "par": 5, "stroke_index": 5, "yards_championship": 481, "yards_white": 474, "yards_ladies": 441},
    {"hole": 18, "par": 4, "stroke_index": 4, "yards_championship": 335, "yards_white": 324, "yards_ladies": 304}
  ]'::jsonb
)
ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name,
  tees = EXCLUDED.tees,
  holes_data = EXCLUDED.holes_data,
  updated_at = NOW();

-- ============================================================================
-- 15. REDLAND BAY GOLF CLUB
-- ============================================================================
INSERT INTO venues (id, name, address, city, state, country, postal_code, phone, email, website, latitude, longitude, timezone, created_at, updated_at)
VALUES (
  'f2a3b4c5-d6e7-8901-abcd-500000000815',
  'Redland Bay Golf Club',
  'Colburn Avenue',
  'Redland Bay',
  'Queensland',
  'Australia',
  '4165',
  NULL,
  NULL,
  'https://www.redlandbaygolf.com.au',
  -27.6164,
  153.2914,
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
  'f2a3b4c5-d6e7-8901-abcd-600000000815',
  'f2a3b4c5-d6e7-8901-abcd-500000000815',
  'Redland Bay Golf Club',
  'Bayside parkland course established 1934. Open guest policy.',
  18,
  72,
  NULL,
  NULL,
  5976,
  5464,
  NULL,
  1934,
  'private',
  NOW(),
  NOW(),
  '[
    {"name": "White", "color": "white", "rating": null, "slope": null, "yards": 5976},
    {"name": "Red", "color": "red", "rating": null, "slope": null, "yards": 5192}
  ]'::jsonb,
  '[
    {"hole": 1, "par": 4, "stroke_index": 2, "yards_white": 391, "yards_red": 332},
    {"hole": 2, "par": 4, "stroke_index": 4, "yards_white": 375, "yards_red": 360},
    {"hole": 3, "par": 5, "stroke_index": 16, "yards_white": 468, "yards_red": 420},
    {"hole": 4, "par": 3, "stroke_index": 10, "yards_white": 177, "yards_red": 141},
    {"hole": 5, "par": 4, "stroke_index": 14, "yards_white": 343, "yards_red": 309},
    {"hole": 6, "par": 3, "stroke_index": 18, "yards_white": 140, "yards_red": 111},
    {"hole": 7, "par": 4, "stroke_index": 12, "yards_white": 295, "yards_red": 274},
    {"hole": 8, "par": 4, "stroke_index": 6, "yards_white": 319, "yards_red": 261},
    {"hole": 9, "par": 5, "stroke_index": 8, "yards_white": 478, "yards_red": 416},
    {"hole": 10, "par": 4, "stroke_index": 3, "yards_white": 380, "yards_red": 322},
    {"hole": 11, "par": 4, "stroke_index": 13, "yards_white": 318, "yards_red": 301},
    {"hole": 12, "par": 4, "stroke_index": 7, "yards_white": 348, "yards_red": 316},
    {"hole": 13, "par": 3, "stroke_index": 5, "yards_white": 198, "yards_red": 159},
    {"hole": 14, "par": 5, "stroke_index": 1, "yards_white": 508, "yards_red": 405},
    {"hole": 15, "par": 4, "stroke_index": 11, "yards_white": 290, "yards_red": 240},
    {"hole": 16, "par": 3, "stroke_index": 15, "yards_white": 156, "yards_red": 121},
    {"hole": 17, "par": 4, "stroke_index": 9, "yards_white": 323, "yards_red": 302},
    {"hole": 18, "par": 5, "stroke_index": 17, "yards_white": 469, "yards_red": 402}
  ]'::jsonb
)
ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name,
  tees = EXCLUDED.tees,
  holes_data = EXCLUDED.holes_data,
  updated_at = NOW();

-- ============================================================================
-- 16. WINDAROO LAKES GOLF CLUB
-- ============================================================================
INSERT INTO venues (id, name, address, city, state, country, postal_code, phone, email, website, latitude, longitude, timezone, created_at, updated_at)
VALUES (
  'f2a3b4c5-d6e7-8901-abcd-500000000816',
  'Windaroo Lakes Golf Club',
  'Beaudesert-Beenleigh Road',
  'Windaroo',
  'Queensland',
  'Australia',
  '4207',
  '+61 7 3804 0655',
  'info@windaroolakes.com.au',
  'https://www.windaroolakes.com.au',
  -27.7325,
  153.1581,
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
  'f2a3b4c5-d6e7-8901-abcd-600000000816',
  'f2a3b4c5-d6e7-8901-abcd-500000000816',
  'Windaroo Lakes Golf Club',
  'Parkland course with open guest policy.',
  18,
  72,
  NULL,
  NULL,
  6264,
  5729,
  NULL,
  NULL,
  'public',
  NOW(),
  NOW(),
  '[
    {"name": "Blue", "color": "blue", "rating": null, "slope": null, "yards": 6264},
    {"name": "White", "color": "white", "rating": null, "slope": null, "yards": 5917},
    {"name": "Red", "color": "red", "rating": null, "slope": null, "yards": 5320}
  ]'::jsonb,
  '[
    {"hole": 1, "par": 5, "stroke_index": 18, "yards_blue": 505, "yards_white": 488, "yards_red": 395},
    {"hole": 2, "par": 4, "stroke_index": 8, "yards_blue": 394, "yards_white": 381, "yards_red": 368},
    {"hole": 3, "par": 5, "stroke_index": 12, "yards_blue": 447, "yards_white": 430, "yards_red": 395},
    {"hole": 4, "par": 4, "stroke_index": 3, "yards_blue": 372, "yards_white": 337, "yards_red": 327},
    {"hole": 5, "par": 3, "stroke_index": 14, "yards_blue": 190, "yards_white": 166, "yards_red": 143},
    {"hole": 6, "par": 4, "stroke_index": 6, "yards_blue": 279, "yards_white": 267, "yards_red": 254},
    {"hole": 7, "par": 3, "stroke_index": 10, "yards_blue": 166, "yards_white": 151, "yards_red": 131},
    {"hole": 8, "par": 4, "stroke_index": 1, "yards_blue": 355, "yards_white": 336, "yards_red": 312},
    {"hole": 9, "par": 4, "stroke_index": 16, "yards_blue": 341, "yards_white": 315, "yards_red": 301},
    {"hole": 10, "par": 4, "stroke_index": 5, "yards_blue": 396, "yards_white": 375, "yards_red": 348},
    {"hole": 11, "par": 3, "stroke_index": 11, "yards_blue": 154, "yards_white": 154, "yards_red": 115},
    {"hole": 12, "par": 5, "stroke_index": 2, "yards_blue": 479, "yards_white": 451, "yards_red": 419},
    {"hole": 13, "par": 5, "stroke_index": 15, "yards_blue": 528, "yards_white": 503, "yards_red": 421},
    {"hole": 14, "par": 4, "stroke_index": 7, "yards_blue": 339, "yards_white": 322, "yards_red": 283},
    {"hole": 15, "par": 3, "stroke_index": 13, "yards_blue": 165, "yards_white": 140, "yards_red": 101},
    {"hole": 16, "par": 4, "stroke_index": 4, "yards_blue": 402, "yards_white": 373, "yards_red": 380},
    {"hole": 17, "par": 4, "stroke_index": 17, "yards_blue": 376, "yards_white": 370, "yards_red": 322},
    {"hole": 18, "par": 4, "stroke_index": 9, "yards_blue": 376, "yards_white": 358, "yards_red": 305}
  ]'::jsonb
)
ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name,
  tees = EXCLUDED.tees,
  holes_data = EXCLUDED.holes_data,
  updated_at = NOW();

-- ============================================================================
-- 17. PINE RIVERS GOLF CLUB
-- ============================================================================
INSERT INTO venues (id, name, address, city, state, country, postal_code, phone, email, website, latitude, longitude, timezone, created_at, updated_at)
VALUES (
  'f2a3b4c5-d6e7-8901-abcd-500000000817',
  'Pine Rivers Golf Club',
  '245 Narangba Road',
  'Kurwongbah',
  'Queensland',
  'Australia',
  '4503',
  NULL,
  NULL,
  'https://www.pineriversgolf.com.au',
  -27.2628,
  152.9492,
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
  'f2a3b4c5-d6e7-8901-abcd-600000000817',
  'f2a3b4c5-d6e7-8901-abcd-500000000817',
  'Pine Rivers Golf Club',
  'Parkland course with open guest policy.',
  18,
  70,
  69.0,
  129,
  5474,
  5005,
  NULL,
  NULL,
  'private',
  NOW(),
  NOW(),
  '[
    {"name": "Blue", "color": "blue", "rating": 69.0, "slope": 129, "yards": 5474},
    {"name": "White", "color": "white", "rating": 68.0, "slope": 126, "yards": 5290},
    {"name": "Red", "color": "red", "rating": 67.0, "slope": 121, "yards": 5090}
  ]'::jsonb,
  '[
    {"hole": 1, "par": 3, "stroke_index": 18, "yards_blue": 120, "yards_white": 115, "yards_red": 110},
    {"hole": 2, "par": 4, "stroke_index": 4, "yards_blue": 350, "yards_white": 345, "yards_red": 338},
    {"hole": 3, "par": 4, "stroke_index": 10, "yards_blue": 279, "yards_white": 276, "yards_red": 276},
    {"hole": 4, "par": 4, "stroke_index": 16, "yards_blue": 270, "yards_white": 262, "yards_red": 258},
    {"hole": 5, "par": 3, "stroke_index": 12, "yards_blue": 159, "yards_white": 145, "yards_red": 117},
    {"hole": 6, "par": 4, "stroke_index": 2, "yards_blue": 424, "yards_white": 402, "yards_red": 395},
    {"hole": 7, "par": 4, "stroke_index": 6, "yards_blue": 308, "yards_white": 304, "yards_red": 300},
    {"hole": 8, "par": 4, "stroke_index": 8, "yards_blue": 308, "yards_white": 275, "yards_red": 245},
    {"hole": 9, "par": 4, "stroke_index": 14, "yards_blue": 322, "yards_white": 315, "yards_red": 307},
    {"hole": 10, "par": 4, "stroke_index": 17, "yards_blue": 303, "yards_white": 300, "yards_red": 292},
    {"hole": 11, "par": 4, "stroke_index": 1, "yards_blue": 331, "yards_white": 318, "yards_red": 296},
    {"hole": 12, "par": 5, "stroke_index": 7, "yards_blue": 486, "yards_white": 482, "yards_red": 482},
    {"hole": 13, "par": 4, "stroke_index": 5, "yards_blue": 375, "yards_white": 350, "yards_red": 325},
    {"hole": 14, "par": 3, "stroke_index": 11, "yards_blue": 156, "yards_white": 145, "yards_red": 132},
    {"hole": 15, "par": 5, "stroke_index": 15, "yards_blue": 441, "yards_white": 437, "yards_red": 424},
    {"hole": 16, "par": 4, "stroke_index": 9, "yards_blue": 363, "yards_white": 353, "yards_red": 349},
    {"hole": 17, "par": 3, "stroke_index": 3, "yards_blue": 195, "yards_white": 185, "yards_red": 165},
    {"hole": 18, "par": 4, "stroke_index": 13, "yards_blue": 284, "yards_white": 281, "yards_red": 279}
  ]'::jsonb
)
ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name,
  tees = EXCLUDED.tees,
  holes_data = EXCLUDED.holes_data,
  updated_at = NOW();

-- ============================================================================
-- 18. CABOOLTURE GOLF CLUB
-- ============================================================================
INSERT INTO venues (id, name, address, city, state, country, postal_code, phone, email, website, latitude, longitude, timezone, created_at, updated_at)
VALUES (
  'f2a3b4c5-d6e7-8901-abcd-500000000818',
  'Caboolture Golf Club',
  'Lesley Avenue',
  'Caboolture',
  'Queensland',
  'Australia',
  '4510',
  '+61 7 5495 1452',
  NULL,
  'https://www.caboolturegolf.com.au',
  -27.0708,
  152.9614,
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
  'f2a3b4c5-d6e7-8901-abcd-600000000818',
  'f2a3b4c5-d6e7-8901-abcd-500000000818',
  'Caboolture Golf Club',
  'Parkland course with open guest policy.',
  18,
  71,
  71.0,
  124,
  6059,
  5540,
  NULL,
  NULL,
  'private',
  NOW(),
  NOW(),
  '[
    {"name": "White", "color": "white", "rating": 71.0, "slope": 124, "yards": 6059},
    {"name": "Red", "color": "red", "rating": 74.0, "slope": 124, "yards": 5164}
  ]'::jsonb,
  '[
    {"hole": 1, "par": 4, "stroke_index": 6, "yards_white": 377, "yards_red": 327},
    {"hole": 2, "par": 4, "stroke_index": 2, "yards_white": 388, "yards_red": 381},
    {"hole": 3, "par": 5, "stroke_index": 16, "yards_white": 487, "yards_red": 456},
    {"hole": 4, "par": 3, "stroke_index": 12, "yards_white": 169, "yards_red": 159},
    {"hole": 5, "par": 4, "stroke_index": 4, "yards_white": 356, "yards_red": 330},
    {"hole": 6, "par": 4, "stroke_index": 10, "yards_white": 370, "yards_red": 356},
    {"hole": 7, "par": 4, "stroke_index": 14, "yards_white": 323, "yards_red": 288},
    {"hole": 8, "par": 3, "stroke_index": 18, "yards_white": 136, "yards_red": 127},
    {"hole": 9, "par": 5, "stroke_index": 8, "yards_white": 509, "yards_red": 436},
    {"hole": 10, "par": 4, "stroke_index": 3, "yards_white": 368, "yards_red": 338},
    {"hole": 11, "par": 4, "stroke_index": 11, "yards_white": 328, "yards_red": 232},
    {"hole": 12, "par": 3, "stroke_index": 7, "yards_white": 181, "yards_red": 133},
    {"hole": 13, "par": 4, "stroke_index": 1, "yards_white": 444, "yards_red": 328},
    {"hole": 14, "par": 3, "stroke_index": 9, "yards_white": 183, "yards_red": 141},
    {"hole": 15, "par": 5, "stroke_index": 5, "yards_white": 507, "yards_red": 285},
    {"hole": 16, "par": 4, "stroke_index": 15, "yards_white": 337, "yards_red": 320},
    {"hole": 17, "par": 5, "stroke_index": 13, "yards_white": 470, "yards_red": 412},
    {"hole": 18, "par": 3, "stroke_index": 17, "yards_white": 126, "yards_red": 115}
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
-- QLD Batch 1: Brisbane Premium & Surrounds
-- Total: 18 courses with full hole-by-hole data
--
-- Courses included:
-- 1. Royal Queensland Golf Club (Eagle Farm) - Top 10 Australian
-- 2. Brisbane Golf Club (Yeerongpilly) - Est. 1896
-- 3. Brookwater Golf & Country Club - Greg Norman design
-- 4. Gailes Golf Club (Wacol) - Championship course
-- 5. Ashgrove Golf Club (The Gap)
-- 6. Wynnum Golf Club - Bayside
-- 7. St Lucia Golf Links - Public
-- 8. Carbrook Golf Club - Famous bull sharks
-- 9. Oxley Golf Club
-- 10. Wantima Country Club (Brendale)
-- 11. Wolston Park Golf Club (Wacol)
-- 12. Redcliffe Golf Club (Clontarf) - Coastal
-- 13. Ipswich Golf Club - Est. 1897
-- 14. Bribie Island Golf Club - Island course
-- 15. Redland Bay Golf Club - Bayside
-- 16. Windaroo Lakes Golf Club - Public
-- 17. Pine Rivers Golf Club (Kurwongbah)
-- 18. Caboolture Golf Club
