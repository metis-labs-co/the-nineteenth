-- QLD Batch 3: Brisbane South/Logan & Regional QLD (Central, North, Wide Bay)
-- 20 courses with full hole-by-hole data
-- Source: golfify.io
-- Generated: 2025-12-11

-- ============================================================================
-- 1. BOONAH GOLF CLUB
-- ============================================================================
INSERT INTO venues (id, name, address, city, state, country, postal_code, phone, email, website, latitude, longitude, timezone, created_at, updated_at)
VALUES (
  'f2a3b4c5-d6e7-8901-abcd-500000000832',
  'Boonah Golf Club',
  'Golf Links Road',
  'Boonah',
  'Queensland',
  'Australia',
  '4310',
  NULL,
  NULL,
  NULL,
  -27.9989,
  152.6847,
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
  'f2a3b4c5-d6e7-8901-abcd-600000000832',
  'f2a3b4c5-d6e7-8901-abcd-500000000832',
  'Boonah Golf Club',
  'Parkland course in Scenic Rim region.',
  18,
  72,
  NULL,
  NULL,
  6137,
  5612,
  NULL,
  NULL,
  'private',
  NOW(),
  NOW(),
  '[
    {"name": "Yellow", "color": "yellow", "rating": null, "slope": null, "yards": 6137},
    {"name": "Red", "color": "red", "rating": null, "slope": null, "yards": 5372}
  ]'::jsonb,
  '[
    {"hole": 1, "par": 4, "stroke_index": 14, "yards_yellow": 334, "yards_red": 294},
    {"hole": 2, "par": 4, "stroke_index": 2, "yards_yellow": 379, "yards_red": 322},
    {"hole": 3, "par": 5, "stroke_index": 13, "yards_yellow": 476, "yards_red": 416},
    {"hole": 4, "par": 3, "stroke_index": 11, "yards_yellow": 153, "yards_red": 105},
    {"hole": 5, "par": 4, "stroke_index": 4, "yards_yellow": 373, "yards_red": 335},
    {"hole": 6, "par": 5, "stroke_index": 16, "yards_yellow": 483, "yards_red": 425},
    {"hole": 7, "par": 4, "stroke_index": 9, "yards_yellow": 363, "yards_red": 303},
    {"hole": 8, "par": 3, "stroke_index": 8, "yards_yellow": 175, "yards_red": 159},
    {"hole": 9, "par": 4, "stroke_index": 12, "yards_yellow": 325, "yards_red": 321},
    {"hole": 10, "par": 4, "stroke_index": 10, "yards_yellow": 349, "yards_red": 294},
    {"hole": 11, "par": 4, "stroke_index": 7, "yards_yellow": 355, "yards_red": 349},
    {"hole": 12, "par": 5, "stroke_index": 5, "yards_yellow": 509, "yards_red": 416},
    {"hole": 13, "par": 3, "stroke_index": 17, "yards_yellow": 137, "yards_red": 119},
    {"hole": 14, "par": 4, "stroke_index": 1, "yards_yellow": 402, "yards_red": 335},
    {"hole": 15, "par": 5, "stroke_index": 18, "yards_yellow": 468, "yards_red": 425},
    {"hole": 16, "par": 4, "stroke_index": 15, "yards_yellow": 337, "yards_red": 303},
    {"hole": 17, "par": 3, "stroke_index": 3, "yards_yellow": 194, "yards_red": 142},
    {"hole": 18, "par": 4, "stroke_index": 6, "yards_yellow": 325, "yards_red": 309}
  ]'::jsonb
)
ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name,
  tees = EXCLUDED.tees,
  holes_data = EXCLUDED.holes_data,
  updated_at = NOW();

-- ============================================================================
-- 2. GOONDIWINDI GOLF CLUB
-- ============================================================================
INSERT INTO venues (id, name, address, city, state, country, postal_code, phone, email, website, latitude, longitude, timezone, created_at, updated_at)
VALUES (
  'f2a3b4c5-d6e7-8901-abcd-500000000833',
  'Goondiwindi Golf Club',
  'Golf Links Road',
  'Goondiwindi',
  'Queensland',
  'Australia',
  '4390',
  NULL,
  NULL,
  NULL,
  -28.5500,
  150.3100,
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
  'f2a3b4c5-d6e7-8901-abcd-600000000833',
  'f2a3b4c5-d6e7-8901-abcd-500000000833',
  'Goondiwindi Golf Club',
  'Parkland course on Queensland/NSW border. Open guest policy.',
  18,
  71,
  70.0,
  113,
  5499,
  5029,
  NULL,
  NULL,
  'private',
  NOW(),
  NOW(),
  '[
    {"name": "Black", "color": "black", "rating": 70.0, "slope": 113, "yards": 5499},
    {"name": "Red", "color": "red", "rating": null, "slope": null, "yards": 5412}
  ]'::jsonb,
  '[
    {"hole": 1, "par": 4, "stroke_index": 16, "yards_black": 285, "yards_red": 275},
    {"hole": 2, "par": 3, "stroke_index": 2, "yards_black": 190, "yards_red": 154},
    {"hole": 3, "par": 5, "stroke_index": 14, "yards_black": 407, "yards_red": 395},
    {"hole": 4, "par": 4, "stroke_index": 18, "yards_black": 294, "yards_red": 278},
    {"hole": 5, "par": 5, "stroke_index": 10, "yards_black": 452, "yards_red": 436},
    {"hole": 6, "par": 3, "stroke_index": 12, "yards_black": 157, "yards_red": 158},
    {"hole": 7, "par": 4, "stroke_index": 6, "yards_black": 302, "yards_red": 324},
    {"hole": 8, "par": 4, "stroke_index": 4, "yards_black": 375, "yards_red": 363},
    {"hole": 9, "par": 4, "stroke_index": 8, "yards_black": 313, "yards_red": 307},
    {"hole": 10, "par": 3, "stroke_index": 7, "yards_black": 148, "yards_red": 162},
    {"hole": 11, "par": 4, "stroke_index": 5, "yards_black": 326, "yards_red": 350},
    {"hole": 12, "par": 5, "stroke_index": 15, "yards_black": 431, "yards_red": 423},
    {"hole": 13, "par": 4, "stroke_index": 1, "yards_black": 387, "yards_red": 359},
    {"hole": 14, "par": 4, "stroke_index": 3, "yards_black": 368, "yards_red": 394},
    {"hole": 15, "par": 3, "stroke_index": 17, "yards_black": 124, "yards_red": 124},
    {"hole": 16, "par": 4, "stroke_index": 9, "yards_black": 370, "yards_red": 353},
    {"hole": 17, "par": 5, "stroke_index": 11, "yards_black": 439, "yards_red": 417},
    {"hole": 18, "par": 3, "stroke_index": 13, "yards_black": 131, "yards_red": 140}
  ]'::jsonb
)
ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name,
  tees = EXCLUDED.tees,
  holes_data = EXCLUDED.holes_data,
  updated_at = NOW();

-- ============================================================================
-- 3. CLIFTON GOLF CLUB
-- ============================================================================
INSERT INTO venues (id, name, address, city, state, country, postal_code, phone, email, website, latitude, longitude, timezone, created_at, updated_at)
VALUES (
  'f2a3b4c5-d6e7-8901-abcd-500000000834',
  'Clifton Golf Club',
  'Golf Links Road',
  'Clifton',
  'Queensland',
  'Australia',
  '4361',
  NULL,
  NULL,
  NULL,
  -27.9333,
  151.9000,
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
  'f2a3b4c5-d6e7-8901-abcd-600000000834',
  'f2a3b4c5-d6e7-8901-abcd-500000000834',
  'Clifton Golf Club',
  'Ross Watson designed parkland course opened 1954. Open guest policy.',
  18,
  71,
  NULL,
  NULL,
  5436,
  4971,
  'Ross Watson',
  1954,
  'private',
  NOW(),
  NOW(),
  '[
    {"name": "White", "color": "white", "rating": null, "slope": null, "yards": 5436},
    {"name": "Red", "color": "red", "rating": null, "slope": null, "yards": 5197}
  ]'::jsonb,
  '[
    {"hole": 1, "par": 5, "stroke_index": 1, "yards_white": 485, "yards_red": 393},
    {"hole": 2, "par": 5, "stroke_index": 3, "yards_white": 470, "yards_red": 426},
    {"hole": 3, "par": 4, "stroke_index": 5, "yards_white": 306, "yards_red": 306},
    {"hole": 4, "par": 3, "stroke_index": 7, "yards_white": 138, "yards_red": 138},
    {"hole": 5, "par": 4, "stroke_index": 9, "yards_white": 336, "yards_red": 336},
    {"hole": 6, "par": 4, "stroke_index": 11, "yards_white": 292, "yards_red": 292},
    {"hole": 7, "par": 4, "stroke_index": 13, "yards_white": 297, "yards_red": 297},
    {"hole": 8, "par": 4, "stroke_index": 15, "yards_white": 296, "yards_red": 296},
    {"hole": 9, "par": 3, "stroke_index": 17, "yards_white": 171, "yards_red": 171},
    {"hole": 10, "par": 5, "stroke_index": 2, "yards_white": 485, "yards_red": 393},
    {"hole": 11, "par": 4, "stroke_index": 4, "yards_white": 410, "yards_red": 410},
    {"hole": 12, "par": 4, "stroke_index": 6, "yards_white": 306, "yards_red": 306},
    {"hole": 13, "par": 3, "stroke_index": 8, "yards_white": 138, "yards_red": 138},
    {"hole": 14, "par": 4, "stroke_index": 10, "yards_white": 346, "yards_red": 335},
    {"hole": 15, "par": 4, "stroke_index": 12, "yards_white": 247, "yards_red": 247},
    {"hole": 16, "par": 4, "stroke_index": 14, "yards_white": 297, "yards_red": 297},
    {"hole": 17, "par": 4, "stroke_index": 16, "yards_white": 296, "yards_red": 296},
    {"hole": 18, "par": 3, "stroke_index": 18, "yards_white": 120, "yards_red": 120}
  ]'::jsonb
)
ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name,
  tees = EXCLUDED.tees,
  holes_data = EXCLUDED.holes_data,
  updated_at = NOW();

-- ============================================================================
-- 4. OAKEY GOLF CLUB
-- ============================================================================
INSERT INTO venues (id, name, address, city, state, country, postal_code, phone, email, website, latitude, longitude, timezone, created_at, updated_at)
VALUES (
  'f2a3b4c5-d6e7-8901-abcd-500000000835',
  'Oakey Golf Club',
  '290 Boundary Road',
  'Oakey',
  'Queensland',
  'Australia',
  '4401',
  NULL,
  NULL,
  NULL,
  -27.4333,
  151.7167,
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
  'f2a3b4c5-d6e7-8901-abcd-600000000835',
  'f2a3b4c5-d6e7-8901-abcd-500000000835',
  'Oakey Golf Club',
  'Parkland course opened 1963. Members only (closed guest policy).',
  18,
  71,
  68.0,
  NULL,
  5679,
  5193,
  NULL,
  1963,
  'private',
  NOW(),
  NOW(),
  '[
    {"name": "White", "color": "white", "rating": 68.0, "slope": null, "yards": 5679},
    {"name": "Red", "color": "red", "rating": 71.0, "slope": null, "yards": 5212}
  ]'::jsonb,
  '[
    {"hole": 1, "par": 4, "stroke_index": 10, "yards_white": 314, "yards_red": 314},
    {"hole": 2, "par": 4, "stroke_index": 1, "yards_white": 400, "yards_red": 400},
    {"hole": 3, "par": 3, "stroke_index": 17, "yards_white": 103, "yards_red": 103},
    {"hole": 4, "par": 5, "stroke_index": 11, "yards_white": 474, "yards_red": 390},
    {"hole": 5, "par": 3, "stroke_index": 2, "yards_white": 220, "yards_red": 220},
    {"hole": 6, "par": 4, "stroke_index": 14, "yards_white": 308, "yards_red": 264},
    {"hole": 7, "par": 4, "stroke_index": 7, "yards_white": 312, "yards_red": 274},
    {"hole": 8, "par": 3, "stroke_index": 12, "yards_white": 160, "yards_red": 160},
    {"hole": 9, "par": 5, "stroke_index": 5, "yards_white": 521, "yards_red": 440},
    {"hole": 10, "par": 4, "stroke_index": 3, "yards_white": 341, "yards_red": 341},
    {"hole": 11, "par": 4, "stroke_index": 16, "yards_white": 330, "yards_red": 330},
    {"hole": 12, "par": 3, "stroke_index": 9, "yards_white": 135, "yards_red": 135},
    {"hole": 13, "par": 5, "stroke_index": 13, "yards_white": 483, "yards_red": 405},
    {"hole": 14, "par": 3, "stroke_index": 6, "yards_white": 180, "yards_red": 180},
    {"hole": 15, "par": 4, "stroke_index": 15, "yards_white": 308, "yards_red": 264},
    {"hole": 16, "par": 4, "stroke_index": 8, "yards_white": 340, "yards_red": 340},
    {"hole": 17, "par": 4, "stroke_index": 18, "yards_white": 230, "yards_red": 230},
    {"hole": 18, "par": 5, "stroke_index": 4, "yards_white": 520, "yards_red": 422}
  ]'::jsonb
)
ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name,
  tees = EXCLUDED.tees,
  holes_data = EXCLUDED.holes_data,
  updated_at = NOW();

-- ============================================================================
-- 5. BILOELA GOLF CLUB
-- ============================================================================
INSERT INTO venues (id, name, address, city, state, country, postal_code, phone, email, website, latitude, longitude, timezone, created_at, updated_at)
VALUES (
  'f2a3b4c5-d6e7-8901-abcd-500000000836',
  'Biloela Golf Club',
  'Valentine Plains Road',
  'Biloela',
  'Queensland',
  'Australia',
  '4715',
  '+61 7 4992 1860',
  'biloelagolfclub@bigpond.com',
  NULL,
  -24.4000,
  150.5167,
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
  'f2a3b4c5-d6e7-8901-abcd-600000000836',
  'f2a3b4c5-d6e7-8901-abcd-500000000836',
  'Biloela Golf Club',
  'Ross Watson designed parkland course. Open guest policy.',
  18,
  72,
  69.0,
  108,
  6028,
  5512,
  'Ross Watson',
  NULL,
  'private',
  NOW(),
  NOW(),
  '[
    {"name": "Blue", "color": "blue", "rating": 69.0, "slope": 108, "yards": 6028},
    {"name": "Yellow", "color": "yellow", "rating": 70.0, "slope": 106, "yards": 5243}
  ]'::jsonb,
  '[
    {"hole": 1, "par": 4, "stroke_index": 7, "yards_blue": 340, "yards_yellow": 246},
    {"hole": 2, "par": 3, "stroke_index": 15, "yards_blue": 140, "yards_yellow": 140},
    {"hole": 3, "par": 4, "stroke_index": 10, "yards_blue": 341, "yards_yellow": 341},
    {"hole": 4, "par": 5, "stroke_index": 16, "yards_blue": 467, "yards_yellow": 365},
    {"hole": 5, "par": 4, "stroke_index": 1, "yards_blue": 407, "yards_yellow": 407},
    {"hole": 6, "par": 4, "stroke_index": 6, "yards_blue": 354, "yards_yellow": 292},
    {"hole": 7, "par": 4, "stroke_index": 3, "yards_blue": 373, "yards_yellow": 319},
    {"hole": 8, "par": 3, "stroke_index": 9, "yards_blue": 120, "yards_yellow": 89},
    {"hole": 9, "par": 5, "stroke_index": 14, "yards_blue": 489, "yards_yellow": 407},
    {"hole": 10, "par": 5, "stroke_index": 2, "yards_blue": 542, "yards_yellow": 437},
    {"hole": 11, "par": 3, "stroke_index": 5, "yards_blue": 183, "yards_yellow": 160},
    {"hole": 12, "par": 4, "stroke_index": 18, "yards_blue": 284, "yards_yellow": 244},
    {"hole": 13, "par": 3, "stroke_index": 8, "yards_blue": 165, "yards_yellow": 165},
    {"hole": 14, "par": 5, "stroke_index": 4, "yards_blue": 519, "yards_yellow": 432},
    {"hole": 15, "par": 4, "stroke_index": 12, "yards_blue": 340, "yards_yellow": 340},
    {"hole": 16, "par": 3, "stroke_index": 13, "yards_blue": 159, "yards_yellow": 159},
    {"hole": 17, "par": 4, "stroke_index": 11, "yards_blue": 338, "yards_yellow": 270},
    {"hole": 18, "par": 5, "stroke_index": 17, "yards_blue": 467, "yards_yellow": 430}
  ]'::jsonb
)
ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name,
  tees = EXCLUDED.tees,
  holes_data = EXCLUDED.holes_data,
  updated_at = NOW();

-- ============================================================================
-- 6. EMERALD GOLF CLUB
-- ============================================================================
INSERT INTO venues (id, name, address, city, state, country, postal_code, phone, email, website, latitude, longitude, timezone, created_at, updated_at)
VALUES (
  'f2a3b4c5-d6e7-8901-abcd-500000000837',
  'Emerald Golf Club',
  'Theresa Street',
  'Emerald',
  'Queensland',
  'Australia',
  '4720',
  '+61 7 4982 1274',
  'admin@emeraldgolfclub.net.au',
  NULL,
  -23.5167,
  148.1667,
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
  'f2a3b4c5-d6e7-8901-abcd-600000000837',
  'f2a3b4c5-d6e7-8901-abcd-500000000837',
  'Emerald Golf Club',
  'Parkland course in Central Highlands. Open guest policy.',
  18,
  70,
  NULL,
  NULL,
  5793,
  5297,
  NULL,
  NULL,
  'private',
  NOW(),
  NOW(),
  '[
    {"name": "White", "color": "white", "rating": null, "slope": null, "yards": 5793},
    {"name": "Red", "color": "red", "rating": null, "slope": null, "yards": 5278}
  ]'::jsonb,
  '[
    {"hole": 1, "par": 4, "stroke_index": 1, "yards_white": 322, "yards_red": 316},
    {"hole": 2, "par": 4, "stroke_index": 3, "yards_white": 301, "yards_red": 296},
    {"hole": 3, "par": 4, "stroke_index": 5, "yards_white": 343, "yards_red": 240},
    {"hole": 4, "par": 4, "stroke_index": 7, "yards_white": 388, "yards_red": 340},
    {"hole": 5, "par": 3, "stroke_index": 9, "yards_white": 158, "yards_red": 147},
    {"hole": 6, "par": 5, "stroke_index": 11, "yards_white": 525, "yards_red": 476},
    {"hole": 7, "par": 4, "stroke_index": 13, "yards_white": 261, "yards_red": 251},
    {"hole": 8, "par": 4, "stroke_index": 15, "yards_white": 404, "yards_red": 399},
    {"hole": 9, "par": 3, "stroke_index": 17, "yards_white": 156, "yards_red": 114},
    {"hole": 10, "par": 4, "stroke_index": 2, "yards_white": 374, "yards_red": 357},
    {"hole": 11, "par": 4, "stroke_index": 4, "yards_white": 363, "yards_red": 351},
    {"hole": 12, "par": 3, "stroke_index": 6, "yards_white": 200, "yards_red": 166},
    {"hole": 13, "par": 5, "stroke_index": 8, "yards_white": 538, "yards_red": 473},
    {"hole": 14, "par": 4, "stroke_index": 10, "yards_white": 315, "yards_red": 316},
    {"hole": 15, "par": 3, "stroke_index": 12, "yards_white": 116, "yards_red": 112},
    {"hole": 16, "par": 5, "stroke_index": 14, "yards_white": 441, "yards_red": 370},
    {"hole": 17, "par": 3, "stroke_index": 16, "yards_white": 172, "yards_red": 169},
    {"hole": 18, "par": 4, "stroke_index": 18, "yards_white": 416, "yards_red": 385}
  ]'::jsonb
)
ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name,
  tees = EXCLUDED.tees,
  holes_data = EXCLUDED.holes_data,
  updated_at = NOW();

-- ============================================================================
-- 7. LONGREACH GOLF CLUB
-- ============================================================================
INSERT INTO venues (id, name, address, city, state, country, postal_code, phone, email, website, latitude, longitude, timezone, created_at, updated_at)
VALUES (
  'f2a3b4c5-d6e7-8901-abcd-500000000838',
  'Longreach Golf Club',
  'Cramsie Road',
  'Longreach',
  'Queensland',
  'Australia',
  '4730',
  NULL,
  NULL,
  NULL,
  -23.4333,
  144.2500,
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
  'f2a3b4c5-d6e7-8901-abcd-600000000838',
  'f2a3b4c5-d6e7-8901-abcd-500000000838',
  'Longreach Golf Club',
  'Outback Queensland parkland course. Open guest policy.',
  18,
  71,
  NULL,
  NULL,
  5764,
  5271,
  NULL,
  NULL,
  'private',
  NOW(),
  NOW(),
  '[
    {"name": "White", "color": "white", "rating": null, "slope": null, "yards": 5764},
    {"name": "Red", "color": "red", "rating": null, "slope": null, "yards": 5048}
  ]'::jsonb,
  '[
    {"hole": 1, "par": 4, "stroke_index": 15, "yards_white": 279, "yards_red": 263},
    {"hole": 2, "par": 4, "stroke_index": 8, "yards_white": 306, "yards_red": 270},
    {"hole": 3, "par": 5, "stroke_index": 14, "yards_white": 465, "yards_red": 435},
    {"hole": 4, "par": 4, "stroke_index": 5, "yards_white": 349, "yards_red": 275},
    {"hole": 5, "par": 4, "stroke_index": 10, "yards_white": 311, "yards_red": 246},
    {"hole": 6, "par": 4, "stroke_index": 3, "yards_white": 364, "yards_red": 347},
    {"hole": 7, "par": 3, "stroke_index": 17, "yards_white": 177, "yards_red": 160},
    {"hole": 8, "par": 5, "stroke_index": 12, "yards_white": 483, "yards_red": 454},
    {"hole": 9, "par": 3, "stroke_index": 4, "yards_white": 179, "yards_red": 145},
    {"hole": 10, "par": 4, "stroke_index": 16, "yards_white": 289, "yards_red": 256},
    {"hole": 11, "par": 4, "stroke_index": 6, "yards_white": 316, "yards_red": 288},
    {"hole": 12, "par": 4, "stroke_index": 1, "yards_white": 411, "yards_red": 359},
    {"hole": 13, "par": 4, "stroke_index": 11, "yards_white": 310, "yards_red": 296},
    {"hole": 14, "par": 4, "stroke_index": 7, "yards_white": 318, "yards_red": 255},
    {"hole": 15, "par": 4, "stroke_index": 2, "yards_white": 379, "yards_red": 351},
    {"hole": 16, "par": 3, "stroke_index": 9, "yards_white": 196, "yards_red": 156},
    {"hole": 17, "par": 5, "stroke_index": 13, "yards_white": 474, "yards_red": 374},
    {"hole": 18, "par": 3, "stroke_index": 18, "yards_white": 158, "yards_red": 118}
  ]'::jsonb
)
ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name,
  tees = EXCLUDED.tees,
  holes_data = EXCLUDED.holes_data,
  updated_at = NOW();

-- ============================================================================
-- 8. ROCKHAMPTON GOLF CLUB
-- ============================================================================
INSERT INTO venues (id, name, address, city, state, country, postal_code, phone, email, website, latitude, longitude, timezone, created_at, updated_at)
VALUES (
  'f2a3b4c5-d6e7-8901-abcd-500000000839',
  'Rockhampton Golf Club',
  'Ann Street',
  'Rockhampton',
  'Queensland',
  'Australia',
  '4700',
  NULL,
  NULL,
  NULL,
  -23.3783,
  150.5100,
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
  'f2a3b4c5-d6e7-8901-abcd-600000000839',
  'f2a3b4c5-d6e7-8901-abcd-500000000839',
  'Rockhampton Golf Club',
  'Premier Central Queensland parkland course. Open guest policy.',
  18,
  72,
  NULL,
  NULL,
  6177,
  5648,
  NULL,
  NULL,
  'private',
  NOW(),
  NOW(),
  '[
    {"name": "White", "color": "white", "rating": null, "slope": null, "yards": 6177},
    {"name": "Red", "color": "red", "rating": null, "slope": null, "yards": 5319}
  ]'::jsonb,
  '[
    {"hole": 1, "par": 5, "stroke_index": 3, "yards_white": 537, "yards_red": 498},
    {"hole": 2, "par": 3, "stroke_index": 18, "yards_white": 127, "yards_red": 106},
    {"hole": 3, "par": 4, "stroke_index": 9, "yards_white": 391, "yards_red": 327},
    {"hole": 4, "par": 4, "stroke_index": 11, "yards_white": 368, "yards_red": 305},
    {"hole": 5, "par": 5, "stroke_index": 4, "yards_white": 538, "yards_red": 476},
    {"hole": 6, "par": 4, "stroke_index": 7, "yards_white": 380, "yards_red": 332},
    {"hole": 7, "par": 3, "stroke_index": 5, "yards_white": 206, "yards_red": 143},
    {"hole": 8, "par": 4, "stroke_index": 15, "yards_white": 298, "yards_red": 259},
    {"hole": 9, "par": 4, "stroke_index": 13, "yards_white": 316, "yards_red": 307},
    {"hole": 10, "par": 5, "stroke_index": 17, "yards_white": 438, "yards_red": 322},
    {"hole": 11, "par": 3, "stroke_index": 12, "yards_white": 167, "yards_red": 153},
    {"hole": 12, "par": 4, "stroke_index": 8, "yards_white": 355, "yards_red": 305},
    {"hole": 13, "par": 4, "stroke_index": 14, "yards_white": 328, "yards_red": 277},
    {"hole": 14, "par": 4, "stroke_index": 6, "yards_white": 360, "yards_red": 305},
    {"hole": 15, "par": 4, "stroke_index": 2, "yards_white": 381, "yards_red": 366},
    {"hole": 16, "par": 5, "stroke_index": 1, "yards_white": 538, "yards_red": 459},
    {"hole": 17, "par": 4, "stroke_index": 16, "yards_white": 285, "yards_red": 258},
    {"hole": 18, "par": 3, "stroke_index": 10, "yards_white": 164, "yards_red": 121}
  ]'::jsonb
)
ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name,
  tees = EXCLUDED.tees,
  holes_data = EXCLUDED.holes_data,
  updated_at = NOW();

-- ============================================================================
-- 9. BUNDABERG GOLF CLUB
-- ============================================================================
INSERT INTO venues (id, name, address, city, state, country, postal_code, phone, email, website, latitude, longitude, timezone, created_at, updated_at)
VALUES (
  'f2a3b4c5-d6e7-8901-abcd-500000000840',
  'Bundaberg Golf Club',
  'One Mile Road',
  'Bundaberg',
  'Queensland',
  'Australia',
  '4670',
  '+61 7 4152 6765',
  'bundabergproshop@bigpond.com',
  NULL,
  -24.8667,
  152.3500,
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
  'f2a3b4c5-d6e7-8901-abcd-600000000840',
  'f2a3b4c5-d6e7-8901-abcd-500000000840',
  'Bundaberg Golf Club',
  'Wide Bay region parkland course. Open guest policy.',
  18,
  71,
  69.0,
  71,
  5872,
  5369,
  NULL,
  NULL,
  'private',
  NOW(),
  NOW(),
  '[
    {"name": "White", "color": "white", "rating": 69.0, "slope": 71, "yards": 5872},
    {"name": "Red", "color": "red", "rating": null, "slope": null, "yards": 5267}
  ]'::jsonb,
  '[
    {"hole": 1, "par": 4, "stroke_index": 1, "yards_white": 395, "yards_red": 374},
    {"hole": 2, "par": 3, "stroke_index": 5, "yards_white": 145, "yards_red": 111},
    {"hole": 3, "par": 5, "stroke_index": 16, "yards_white": 457, "yards_red": 416},
    {"hole": 4, "par": 3, "stroke_index": 14, "yards_white": 155, "yards_red": 125},
    {"hole": 5, "par": 4, "stroke_index": 8, "yards_white": 329, "yards_red": 319},
    {"hole": 6, "par": 4, "stroke_index": 9, "yards_white": 357, "yards_red": 298},
    {"hole": 7, "par": 4, "stroke_index": 11, "yards_white": 349, "yards_red": 323},
    {"hole": 8, "par": 3, "stroke_index": 13, "yards_white": 136, "yards_red": 127},
    {"hole": 9, "par": 5, "stroke_index": 18, "yards_white": 466, "yards_red": 421},
    {"hole": 10, "par": 4, "stroke_index": 2, "yards_white": 378, "yards_red": 365},
    {"hole": 11, "par": 4, "stroke_index": 3, "yards_white": 354, "yards_red": 288},
    {"hole": 12, "par": 5, "stroke_index": 15, "yards_white": 477, "yards_red": 464},
    {"hole": 13, "par": 4, "stroke_index": 10, "yards_white": 332, "yards_red": 308},
    {"hole": 14, "par": 3, "stroke_index": 17, "yards_white": 141, "yards_red": 121},
    {"hole": 15, "par": 4, "stroke_index": 7, "yards_white": 354, "yards_red": 312},
    {"hole": 16, "par": 4, "stroke_index": 6, "yards_white": 385, "yards_red": 320},
    {"hole": 17, "par": 3, "stroke_index": 4, "yards_white": 180, "yards_red": 157},
    {"hole": 18, "par": 5, "stroke_index": 12, "yards_white": 482, "yards_red": 418}
  ]'::jsonb
)
ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name,
  tees = EXCLUDED.tees,
  holes_data = EXCLUDED.holes_data,
  updated_at = NOW();

-- ============================================================================
-- 10. BARGARA GOLF CLUB
-- ============================================================================
INSERT INTO venues (id, name, address, city, state, country, postal_code, phone, email, website, latitude, longitude, timezone, created_at, updated_at)
VALUES (
  'f2a3b4c5-d6e7-8901-abcd-500000000841',
  'Bargara Golf Club',
  '120 Miller Street',
  'Bargara',
  'Queensland',
  'Australia',
  '4670',
  '+61 7 4159 2221',
  'clubmanager@bargaragolfclub.com.au',
  NULL,
  -24.8167,
  152.4667,
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
  'f2a3b4c5-d6e7-8901-abcd-600000000841',
  'f2a3b4c5-d6e7-8901-abcd-500000000841',
  'Bargara Golf Club',
  'Coastal parkland course near Bundaberg. Open guest policy.',
  18,
  72,
  70.0,
  127,
  5817,
  5319,
  NULL,
  NULL,
  'private',
  NOW(),
  NOW(),
  '[
    {"name": "White", "color": "white", "rating": 70.0, "slope": 127, "yards": 5817},
    {"name": "Red", "color": "red", "rating": 72.0, "slope": 113, "yards": 5276}
  ]'::jsonb,
  '[
    {"hole": 1, "par": 4, "stroke_index": 5, "yards_white": 355, "yards_red": 308},
    {"hole": 2, "par": 4, "stroke_index": 16, "yards_white": 274, "yards_red": 270},
    {"hole": 3, "par": 3, "stroke_index": 10, "yards_white": 159, "yards_red": 155},
    {"hole": 4, "par": 4, "stroke_index": 14, "yards_white": 303, "yards_red": 265},
    {"hole": 5, "par": 3, "stroke_index": 12, "yards_white": 143, "yards_red": 123},
    {"hole": 6, "par": 5, "stroke_index": 7, "yards_white": 515, "yards_red": 416},
    {"hole": 7, "par": 4, "stroke_index": 3, "yards_white": 394, "yards_red": 330},
    {"hole": 8, "par": 4, "stroke_index": 18, "yards_white": 270, "yards_red": 265},
    {"hole": 9, "par": 5, "stroke_index": 1, "yards_white": 387, "yards_red": 381},
    {"hole": 10, "par": 4, "stroke_index": 15, "yards_white": 284, "yards_red": 284},
    {"hole": 11, "par": 4, "stroke_index": 2, "yards_white": 410, "yards_red": 338},
    {"hole": 12, "par": 5, "stroke_index": 13, "yards_white": 423, "yards_red": 413},
    {"hole": 13, "par": 4, "stroke_index": 17, "yards_white": 249, "yards_red": 245},
    {"hole": 14, "par": 4, "stroke_index": 4, "yards_white": 372, "yards_red": 349},
    {"hole": 15, "par": 3, "stroke_index": 11, "yards_white": 144, "yards_red": 125},
    {"hole": 16, "par": 4, "stroke_index": 6, "yards_white": 326, "yards_red": 300},
    {"hole": 17, "par": 4, "stroke_index": 8, "yards_white": 342, "yards_red": 298},
    {"hole": 18, "par": 4, "stroke_index": 9, "yards_white": 467, "yards_red": 411}
  ]'::jsonb
)
ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name,
  tees = EXCLUDED.tees,
  holes_data = EXCLUDED.holes_data,
  updated_at = NOW();

-- ============================================================================
-- 11. GLADSTONE GOLF CLUB
-- ============================================================================
INSERT INTO venues (id, name, address, city, state, country, postal_code, phone, email, website, latitude, longitude, timezone, created_at, updated_at)
VALUES (
  'f2a3b4c5-d6e7-8901-abcd-500000000842',
  'Gladstone Golf Club',
  'Sun Valley Road',
  'Gladstone',
  'Queensland',
  'Australia',
  '4680',
  NULL,
  NULL,
  NULL,
  -23.8500,
  151.2500,
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
  'f2a3b4c5-d6e7-8901-abcd-600000000842',
  'f2a3b4c5-d6e7-8901-abcd-500000000842',
  'Gladstone Golf Club',
  'Parkland course in Central Queensland industrial city. Open guest policy.',
  18,
  70,
  70.0,
  104,
  5533,
  5060,
  NULL,
  NULL,
  'private',
  NOW(),
  NOW(),
  '[
    {"name": "Blue", "color": "blue", "rating": 70.0, "slope": 104, "yards": 5533},
    {"name": "Yellow", "color": "yellow", "rating": 71.0, "slope": 107, "yards": 5137}
  ]'::jsonb,
  '[
    {"hole": 1, "par": 4, "stroke_index": 16, "yards_blue": 326, "yards_yellow": 316},
    {"hole": 2, "par": 5, "stroke_index": 9, "yards_blue": 491, "yards_yellow": 489},
    {"hole": 3, "par": 3, "stroke_index": 14, "yards_blue": 120, "yards_yellow": 102},
    {"hole": 4, "par": 4, "stroke_index": 11, "yards_blue": 284, "yards_yellow": 280},
    {"hole": 5, "par": 3, "stroke_index": 18, "yards_blue": 173, "yards_yellow": 176},
    {"hole": 6, "par": 4, "stroke_index": 8, "yards_blue": 344, "yards_yellow": 338},
    {"hole": 7, "par": 3, "stroke_index": 10, "yards_blue": 181, "yards_yellow": 183},
    {"hole": 8, "par": 4, "stroke_index": 7, "yards_blue": 363, "yards_yellow": 353},
    {"hole": 9, "par": 4, "stroke_index": 6, "yards_blue": 300, "yards_yellow": 293},
    {"hole": 10, "par": 4, "stroke_index": 3, "yards_blue": 361, "yards_yellow": 256},
    {"hole": 11, "par": 3, "stroke_index": 4, "yards_blue": 189, "yards_yellow": 175},
    {"hole": 12, "par": 4, "stroke_index": 12, "yards_blue": 315, "yards_yellow": 246},
    {"hole": 13, "par": 4, "stroke_index": 5, "yards_blue": 283, "yards_yellow": 279},
    {"hole": 14, "par": 5, "stroke_index": 13, "yards_blue": 450, "yards_yellow": 436},
    {"hole": 15, "par": 3, "stroke_index": 17, "yards_blue": 139, "yards_yellow": 120},
    {"hole": 16, "par": 4, "stroke_index": 1, "yards_blue": 397, "yards_yellow": 400},
    {"hole": 17, "par": 4, "stroke_index": 2, "yards_blue": 370, "yards_yellow": 303},
    {"hole": 18, "par": 5, "stroke_index": 15, "yards_blue": 447, "yards_yellow": 392}
  ]'::jsonb
)
ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name,
  tees = EXCLUDED.tees,
  holes_data = EXCLUDED.holes_data,
  updated_at = NOW();

-- ============================================================================
-- 12. MACKAY GOLF CLUB
-- ============================================================================
INSERT INTO venues (id, name, address, city, state, country, postal_code, phone, email, website, latitude, longitude, timezone, created_at, updated_at)
VALUES (
  'f2a3b4c5-d6e7-8901-abcd-500000000843',
  'Mackay Golf Club',
  'Bucasia Road',
  'Mt Pleasant',
  'Queensland',
  'Australia',
  '4740',
  NULL,
  NULL,
  NULL,
  -21.1333,
  149.1667,
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
  'f2a3b4c5-d6e7-8901-abcd-600000000843',
  'f2a3b4c5-d6e7-8901-abcd-500000000843',
  'Mackay Golf Club',
  'Parkland course established 1926. Open guest policy.',
  18,
  71,
  70.0,
  126,
  5777,
  5283,
  NULL,
  1926,
  'private',
  NOW(),
  NOW(),
  '[
    {"name": "Blue", "color": "blue", "rating": 70.0, "slope": 126, "yards": 5777},
    {"name": "Red", "color": "red", "rating": 73.0, "slope": 129, "yards": 5270}
  ]'::jsonb,
  '[
    {"hole": 1, "par": 5, "stroke_index": 13, "yards_blue": 452, "yards_red": 437},
    {"hole": 2, "par": 3, "stroke_index": 8, "yards_blue": 175, "yards_red": 140},
    {"hole": 3, "par": 4, "stroke_index": 1, "yards_blue": 405, "yards_red": 347},
    {"hole": 4, "par": 4, "stroke_index": 9, "yards_blue": 332, "yards_red": 309},
    {"hole": 5, "par": 3, "stroke_index": 5, "yards_blue": 189, "yards_red": 166},
    {"hole": 6, "par": 3, "stroke_index": 18, "yards_blue": 117, "yards_red": 109},
    {"hole": 7, "par": 4, "stroke_index": 12, "yards_blue": 332, "yards_red": 315},
    {"hole": 8, "par": 4, "stroke_index": 3, "yards_blue": 375, "yards_red": 321},
    {"hole": 9, "par": 5, "stroke_index": 11, "yards_blue": 448, "yards_red": 443},
    {"hole": 10, "par": 5, "stroke_index": 17, "yards_blue": 458, "yards_red": 444},
    {"hole": 11, "par": 4, "stroke_index": 7, "yards_blue": 357, "yards_red": 299},
    {"hole": 12, "par": 4, "stroke_index": 2, "yards_blue": 383, "yards_red": 367},
    {"hole": 13, "par": 4, "stroke_index": 15, "yards_blue": 296, "yards_red": 286},
    {"hole": 14, "par": 3, "stroke_index": 10, "yards_blue": 169, "yards_red": 147},
    {"hole": 15, "par": 4, "stroke_index": 4, "yards_blue": 339, "yards_red": 313},
    {"hole": 16, "par": 4, "stroke_index": 16, "yards_blue": 301, "yards_red": 296},
    {"hole": 17, "par": 3, "stroke_index": 14, "yards_blue": 129, "yards_red": 121},
    {"hole": 18, "par": 5, "stroke_index": 6, "yards_blue": 520, "yards_red": 410}
  ]'::jsonb
)
ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name,
  tees = EXCLUDED.tees,
  holes_data = EXCLUDED.holes_data,
  updated_at = NOW();

-- ============================================================================
-- 13. CAIRNS GOLF CLUB
-- ============================================================================
INSERT INTO venues (id, name, address, city, state, country, postal_code, phone, email, website, latitude, longitude, timezone, created_at, updated_at)
VALUES (
  'f2a3b4c5-d6e7-8901-abcd-500000000844',
  'Cairns Golf Club',
  'Little Street',
  'Earlville',
  'Queensland',
  'Australia',
  '4870',
  NULL,
  NULL,
  NULL,
  -16.9500,
  145.7333,
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
  'f2a3b4c5-d6e7-8901-abcd-600000000844',
  'f2a3b4c5-d6e7-8901-abcd-500000000844',
  'Cairns Golf Club',
  'Tropical North Queensland parkland course established 1930. Open guest policy.',
  18,
  72,
  75.0,
  126,
  6109,
  5586,
  NULL,
  1930,
  'private',
  NOW(),
  NOW(),
  '[
    {"name": "Blue", "color": "blue", "rating": null, "slope": null, "yards": 6109},
    {"name": "White", "color": "white", "rating": 75.0, "slope": 126, "yards": 5864},
    {"name": "Red", "color": "red", "rating": null, "slope": null, "yards": 5653}
  ]'::jsonb,
  '[
    {"hole": 1, "par": 4, "stroke_index": 14, "yards_blue": 278, "yards_white": 273, "yards_red": 273},
    {"hole": 2, "par": 4, "stroke_index": 12, "yards_blue": 325, "yards_white": 314, "yards_red": 314},
    {"hole": 3, "par": 4, "stroke_index": 10, "yards_blue": 348, "yards_white": 340, "yards_red": 310},
    {"hole": 4, "par": 4, "stroke_index": 1, "yards_blue": 385, "yards_white": 373, "yards_red": 352},
    {"hole": 5, "par": 3, "stroke_index": 3, "yards_blue": 208, "yards_white": 195, "yards_red": 125},
    {"hole": 6, "par": 5, "stroke_index": 18, "yards_blue": 471, "yards_white": 462, "yards_red": 433},
    {"hole": 7, "par": 4, "stroke_index": 5, "yards_blue": 379, "yards_white": 368, "yards_red": 434},
    {"hole": 8, "par": 3, "stroke_index": 16, "yards_blue": 140, "yards_white": 123, "yards_red": 113},
    {"hole": 9, "par": 4, "stroke_index": 7, "yards_blue": 364, "yards_white": 343, "yards_red": 350},
    {"hole": 10, "par": 4, "stroke_index": 6, "yards_blue": 365, "yards_white": 359, "yards_red": 343},
    {"hole": 11, "par": 3, "stroke_index": 9, "yards_blue": 151, "yards_white": 151, "yards_red": 134},
    {"hole": 12, "par": 5, "stroke_index": 13, "yards_blue": 487, "yards_white": 406, "yards_red": 406},
    {"hole": 13, "par": 5, "stroke_index": 17, "yards_blue": 482, "yards_white": 463, "yards_red": 444},
    {"hole": 14, "par": 4, "stroke_index": 4, "yards_blue": 328, "yards_white": 321, "yards_red": 317},
    {"hole": 15, "par": 4, "stroke_index": 2, "yards_blue": 404, "yards_white": 404, "yards_red": 400},
    {"hole": 16, "par": 4, "stroke_index": 11, "yards_blue": 355, "yards_white": 346, "yards_red": 323},
    {"hole": 17, "par": 3, "stroke_index": 8, "yards_blue": 172, "yards_white": 161, "yards_red": 152},
    {"hole": 18, "par": 5, "stroke_index": 15, "yards_blue": 467, "yards_white": 462, "yards_red": 430}
  ]'::jsonb
)
ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name,
  tees = EXCLUDED.tees,
  holes_data = EXCLUDED.holes_data,
  updated_at = NOW();

-- ============================================================================
-- 14. PARADISE PALMS GOLF COURSE
-- ============================================================================
INSERT INTO venues (id, name, address, city, state, country, postal_code, phone, email, website, latitude, longitude, timezone, created_at, updated_at)
VALUES (
  'f2a3b4c5-d6e7-8901-abcd-500000000845',
  'Paradise Palms Golf Course',
  'Paradise Palms Drive',
  'Clifton Beach',
  'Queensland',
  'Australia',
  '4879',
  NULL,
  NULL,
  NULL,
  -16.7667,
  145.6833,
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
  'f2a3b4c5-d6e7-8901-abcd-600000000845',
  'f2a3b4c5-d6e7-8901-abcd-500000000845',
  'Paradise Palms Golf Course',
  'Graham Marsh designed resort course opened 1990. Top tropical course in Far North Queensland. Open guest policy.',
  18,
  72,
  NULL,
  NULL,
  6394,
  5847,
  'Graham Marsh',
  1990,
  'resort',
  NOW(),
  NOW(),
  '[
    {"name": "Blue", "color": "blue", "rating": null, "slope": null, "yards": 6394},
    {"name": "White", "color": "white", "rating": null, "slope": null, "yards": 6014},
    {"name": "Red", "color": "red", "rating": null, "slope": null, "yards": 5149}
  ]'::jsonb,
  '[
    {"hole": 1, "par": 5, "stroke_index": 5, "yards_blue": 516, "yards_white": 481, "yards_red": 410},
    {"hole": 2, "par": 4, "stroke_index": 15, "yards_blue": 368, "yards_white": 347, "yards_red": 295},
    {"hole": 3, "par": 4, "stroke_index": 17, "yards_blue": 347, "yards_white": 326, "yards_red": 277},
    {"hole": 4, "par": 3, "stroke_index": 9, "yards_blue": 162, "yards_white": 147, "yards_red": 120},
    {"hole": 5, "par": 4, "stroke_index": 3, "yards_blue": 388, "yards_white": 367, "yards_red": 310},
    {"hole": 6, "par": 4, "stroke_index": 1, "yards_blue": 394, "yards_white": 372, "yards_red": 315},
    {"hole": 7, "par": 3, "stroke_index": 7, "yards_blue": 182, "yards_white": 164, "yards_red": 135},
    {"hole": 8, "par": 5, "stroke_index": 13, "yards_blue": 488, "yards_white": 459, "yards_red": 395},
    {"hole": 9, "par": 4, "stroke_index": 11, "yards_blue": 383, "yards_white": 361, "yards_red": 305},
    {"hole": 10, "par": 5, "stroke_index": 10, "yards_blue": 506, "yards_white": 476, "yards_red": 410},
    {"hole": 11, "par": 4, "stroke_index": 2, "yards_blue": 387, "yards_white": 365, "yards_red": 310},
    {"hole": 12, "par": 3, "stroke_index": 14, "yards_blue": 173, "yards_white": 156, "yards_red": 130},
    {"hole": 13, "par": 4, "stroke_index": 4, "yards_blue": 411, "yards_white": 388, "yards_red": 330},
    {"hole": 14, "par": 4, "stroke_index": 8, "yards_blue": 331, "yards_white": 311, "yards_red": 265},
    {"hole": 15, "par": 4, "stroke_index": 16, "yards_blue": 367, "yards_white": 346, "yards_red": 295},
    {"hole": 16, "par": 3, "stroke_index": 12, "yards_blue": 149, "yards_white": 135, "yards_red": 112},
    {"hole": 17, "par": 4, "stroke_index": 6, "yards_blue": 368, "yards_white": 347, "yards_red": 295},
    {"hole": 18, "par": 5, "stroke_index": 18, "yards_blue": 474, "yards_white": 466, "yards_red": 440}
  ]'::jsonb
)
ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name,
  tees = EXCLUDED.tees,
  holes_data = EXCLUDED.holes_data,
  updated_at = NOW();

-- ============================================================================
-- 15. TOWNSVILLE GOLF CLUB
-- ============================================================================
INSERT INTO venues (id, name, address, city, state, country, postal_code, phone, email, website, latitude, longitude, timezone, created_at, updated_at)
VALUES (
  'f2a3b4c5-d6e7-8901-abcd-500000000846',
  'Townsville Golf Club',
  'Fulham Road',
  'Rosslea',
  'Queensland',
  'Australia',
  '4812',
  NULL,
  NULL,
  NULL,
  -19.3000,
  146.8167,
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
  'f2a3b4c5-d6e7-8901-abcd-600000000846',
  'f2a3b4c5-d6e7-8901-abcd-500000000846',
  'Townsville Golf Club',
  'Premier North Queensland parkland course established 1924. Four tee configurations.',
  18,
  71,
  71.0,
  126,
  5850,
  5349,
  NULL,
  1924,
  'private',
  NOW(),
  NOW(),
  '[
    {"name": "Blue", "color": "blue", "rating": 71.0, "slope": 126, "yards": 5850},
    {"name": "White", "color": "white", "rating": 71.0, "slope": 118, "yards": 5473},
    {"name": "Yellow", "color": "yellow", "rating": 71.0, "slope": 100, "yards": 4710},
    {"name": "Green", "color": "green", "rating": 71.0, "slope": 110, "yards": 4906}
  ]'::jsonb,
  '[
    {"hole": 1, "par": 5, "stroke_index": 9, "yards_blue": 506, "yards_white": 504, "yards_yellow": 436, "yards_green": 446},
    {"hole": 2, "par": 3, "stroke_index": 8, "yards_blue": 143, "yards_white": 122, "yards_yellow": 89, "yards_green": 106},
    {"hole": 3, "par": 3, "stroke_index": 7, "yards_blue": 177, "yards_white": 151, "yards_yellow": 177, "yards_green": 130},
    {"hole": 4, "par": 4, "stroke_index": 18, "yards_blue": 267, "yards_white": 246, "yards_yellow": 218, "yards_green": 238},
    {"hole": 5, "par": 4, "stroke_index": 11, "yards_blue": 321, "yards_white": 293, "yards_yellow": 257, "yards_green": 277},
    {"hole": 6, "par": 4, "stroke_index": 15, "yards_blue": 329, "yards_white": 304, "yards_yellow": 267, "yards_green": 279},
    {"hole": 7, "par": 4, "stroke_index": 3, "yards_blue": 367, "yards_white": 316, "yards_yellow": 256, "yards_green": 271},
    {"hole": 8, "par": 4, "stroke_index": 12, "yards_blue": 387, "yards_white": 363, "yards_yellow": 300, "yards_green": 309},
    {"hole": 9, "par": 4, "stroke_index": 4, "yards_blue": 318, "yards_white": 279, "yards_yellow": 247, "yards_green": 263},
    {"hole": 10, "par": 4, "stroke_index": 14, "yards_blue": 288, "yards_white": 272, "yards_yellow": 207, "yards_green": 253},
    {"hole": 11, "par": 4, "stroke_index": 6, "yards_blue": 361, "yards_white": 343, "yards_yellow": 296, "yards_green": 316},
    {"hole": 12, "par": 4, "stroke_index": 5, "yards_blue": 375, "yards_white": 352, "yards_yellow": 317, "yards_green": 323},
    {"hole": 13, "par": 4, "stroke_index": 2, "yards_blue": 365, "yards_white": 360, "yards_yellow": 304, "yards_green": 314},
    {"hole": 14, "par": 5, "stroke_index": 13, "yards_blue": 503, "yards_white": 483, "yards_yellow": 430, "yards_green": 439},
    {"hole": 15, "par": 3, "stroke_index": 16, "yards_blue": 138, "yards_white": 126, "yards_yellow": 113, "yards_green": 124},
    {"hole": 16, "par": 5, "stroke_index": 17, "yards_blue": 480, "yards_white": 474, "yards_yellow": 412, "yards_green": 422},
    {"hole": 17, "par": 4, "stroke_index": 10, "yards_blue": 347, "yards_white": 325, "yards_yellow": 279, "yards_green": 291},
    {"hole": 18, "par": 3, "stroke_index": 1, "yards_blue": 178, "yards_white": 160, "yards_yellow": 105, "yards_green": 105}
  ]'::jsonb
)
ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name,
  tees = EXCLUDED.tees,
  holes_data = EXCLUDED.holes_data,
  updated_at = NOW();

-- ============================================================================
-- 16. ATHERTON GOLF CLUB
-- ============================================================================
INSERT INTO venues (id, name, address, city, state, country, postal_code, phone, email, website, latitude, longitude, timezone, created_at, updated_at)
VALUES (
  'f2a3b4c5-d6e7-8901-abcd-500000000847',
  'Atherton Golf Club',
  'Golf Links Road',
  'Atherton',
  'Queensland',
  'Australia',
  '4883',
  '+61 7 4091 1283',
  'athertongolf@bigpond.com',
  NULL,
  -17.2667,
  145.4833,
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
  'f2a3b4c5-d6e7-8901-abcd-600000000847',
  'f2a3b4c5-d6e7-8901-abcd-500000000847',
  'Atherton Golf Club',
  'Atherton Tablelands parkland course established 1925. Members only.',
  18,
  70,
  NULL,
  NULL,
  5528,
  5055,
  NULL,
  1925,
  'private',
  NOW(),
  NOW(),
  '[
    {"name": "Blue", "color": "blue", "rating": null, "slope": null, "yards": 5528},
    {"name": "Red", "color": "red", "rating": null, "slope": null, "yards": 4983}
  ]'::jsonb,
  '[
    {"hole": 1, "par": 4, "stroke_index": 14, "yards_blue": 313, "yards_red": 305},
    {"hole": 2, "par": 5, "stroke_index": 18, "yards_blue": 449, "yards_red": 393},
    {"hole": 3, "par": 3, "stroke_index": 6, "yards_blue": 168, "yards_red": 134},
    {"hole": 4, "par": 4, "stroke_index": 2, "yards_blue": 422, "yards_red": 376},
    {"hole": 5, "par": 4, "stroke_index": 4, "yards_blue": 359, "yards_red": 323},
    {"hole": 6, "par": 4, "stroke_index": 12, "yards_blue": 362, "yards_red": 312},
    {"hole": 7, "par": 4, "stroke_index": 8, "yards_blue": 358, "yards_red": 318},
    {"hole": 8, "par": 4, "stroke_index": 10, "yards_blue": 334, "yards_red": 328},
    {"hole": 9, "par": 4, "stroke_index": 16, "yards_blue": 271, "yards_red": 268},
    {"hole": 10, "par": 4, "stroke_index": 7, "yards_blue": 276, "yards_red": 242},
    {"hole": 11, "par": 3, "stroke_index": 17, "yards_blue": 106, "yards_red": 106},
    {"hole": 12, "par": 4, "stroke_index": 11, "yards_blue": 289, "yards_red": 220},
    {"hole": 13, "par": 3, "stroke_index": 15, "yards_blue": 153, "yards_red": 147},
    {"hole": 14, "par": 4, "stroke_index": 1, "yards_blue": 416, "yards_red": 382},
    {"hole": 15, "par": 4, "stroke_index": 3, "yards_blue": 294, "yards_red": 288},
    {"hole": 16, "par": 4, "stroke_index": 13, "yards_blue": 315, "yards_red": 265},
    {"hole": 17, "par": 5, "stroke_index": 9, "yards_blue": 495, "yards_red": 433},
    {"hole": 18, "par": 3, "stroke_index": 5, "yards_blue": 148, "yards_red": 143}
  ]'::jsonb
)
ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name,
  tees = EXCLUDED.tees,
  holes_data = EXCLUDED.holes_data,
  updated_at = NOW();

-- ============================================================================
-- 17. INNISFAIL GOLF CLUB
-- ============================================================================
INSERT INTO venues (id, name, address, city, state, country, postal_code, phone, email, website, latitude, longitude, timezone, created_at, updated_at)
VALUES (
  'f2a3b4c5-d6e7-8901-abcd-500000000848',
  'Innisfail Golf Club',
  'Flying Fish Point Road',
  'Innisfail',
  'Queensland',
  'Australia',
  '4860',
  NULL,
  NULL,
  NULL,
  -17.5333,
  146.0333,
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
  'f2a3b4c5-d6e7-8901-abcd-600000000848',
  'f2a3b4c5-d6e7-8901-abcd-500000000848',
  'Innisfail Golf Club',
  'Far North Queensland parkland course established 1925. Open guest policy.',
  18,
  70,
  69.0,
  108,
  5538,
  5064,
  NULL,
  1925,
  'private',
  NOW(),
  NOW(),
  '[
    {"name": "Blue", "color": "blue", "rating": 69.0, "slope": 108, "yards": 5538},
    {"name": "Red", "color": "red", "rating": 71.0, "slope": 113, "yards": 4959}
  ]'::jsonb,
  '[
    {"hole": 1, "par": 4, "stroke_index": 4, "yards_blue": 344, "yards_red": 301},
    {"hole": 2, "par": 3, "stroke_index": 18, "yards_blue": 119, "yards_red": 85},
    {"hole": 3, "par": 4, "stroke_index": 13, "yards_blue": 316, "yards_red": 270},
    {"hole": 4, "par": 4, "stroke_index": 11, "yards_blue": 319, "yards_red": 309},
    {"hole": 5, "par": 4, "stroke_index": 1, "yards_blue": 372, "yards_red": 317},
    {"hole": 6, "par": 5, "stroke_index": 14, "yards_blue": 465, "yards_red": 461},
    {"hole": 7, "par": 3, "stroke_index": 8, "yards_blue": 155, "yards_red": 172},
    {"hole": 8, "par": 4, "stroke_index": 9, "yards_blue": 290, "yards_red": 221},
    {"hole": 9, "par": 4, "stroke_index": 6, "yards_blue": 357, "yards_red": 346},
    {"hole": 10, "par": 4, "stroke_index": 3, "yards_blue": 359, "yards_red": 344},
    {"hole": 11, "par": 3, "stroke_index": 17, "yards_blue": 130, "yards_red": 105},
    {"hole": 12, "par": 4, "stroke_index": 10, "yards_blue": 330, "yards_red": 280},
    {"hole": 13, "par": 4, "stroke_index": 2, "yards_blue": 359, "yards_red": 312},
    {"hole": 14, "par": 4, "stroke_index": 12, "yards_blue": 332, "yards_red": 309},
    {"hole": 15, "par": 5, "stroke_index": 15, "yards_blue": 460, "yards_red": 433},
    {"hole": 16, "par": 3, "stroke_index": 7, "yards_blue": 190, "yards_red": 156},
    {"hole": 17, "par": 4, "stroke_index": 16, "yards_blue": 272, "yards_red": 221},
    {"hole": 18, "par": 4, "stroke_index": 5, "yards_blue": 369, "yards_red": 317}
  ]'::jsonb
)
ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name,
  tees = EXCLUDED.tees,
  holes_data = EXCLUDED.holes_data,
  updated_at = NOW();

-- ============================================================================
-- 18. AYR GOLF CLUB
-- ============================================================================
INSERT INTO venues (id, name, address, city, state, country, postal_code, phone, email, website, latitude, longitude, timezone, created_at, updated_at)
VALUES (
  'f2a3b4c5-d6e7-8901-abcd-500000000849',
  'Ayr Golf Club',
  'Edward Street',
  'Ayr',
  'Queensland',
  'Australia',
  '4807',
  NULL,
  NULL,
  NULL,
  -19.5833,
  147.4000,
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
  'f2a3b4c5-d6e7-8901-abcd-600000000849',
  'f2a3b4c5-d6e7-8901-abcd-500000000849',
  'Ayr Golf Club',
  'Burdekin region parkland course. Open guest policy.',
  18,
  71,
  70.0,
  NULL,
  5861,
  5359,
  NULL,
  NULL,
  'private',
  NOW(),
  NOW(),
  '[
    {"name": "Black", "color": "black", "rating": 70.0, "slope": null, "yards": 5861},
    {"name": "Red", "color": "red", "rating": 70.0, "slope": null, "yards": 5148}
  ]'::jsonb,
  '[
    {"hole": 1, "par": 4, "stroke_index": 1, "yards_black": 369, "yards_red": 330},
    {"hole": 2, "par": 4, "stroke_index": 3, "yards_black": 338, "yards_red": 315},
    {"hole": 3, "par": 3, "stroke_index": 5, "yards_black": 155, "yards_red": 99},
    {"hole": 4, "par": 5, "stroke_index": 7, "yards_black": 500, "yards_red": 423},
    {"hole": 5, "par": 3, "stroke_index": 9, "yards_black": 133, "yards_red": 102},
    {"hole": 6, "par": 5, "stroke_index": 11, "yards_black": 453, "yards_red": 405},
    {"hole": 7, "par": 4, "stroke_index": 13, "yards_black": 305, "yards_red": 287},
    {"hole": 8, "par": 4, "stroke_index": 15, "yards_black": 378, "yards_red": 379},
    {"hole": 9, "par": 3, "stroke_index": 17, "yards_black": 150, "yards_red": 121},
    {"hole": 10, "par": 4, "stroke_index": 2, "yards_black": 354, "yards_red": 337},
    {"hole": 11, "par": 3, "stroke_index": 4, "yards_black": 193, "yards_red": 153},
    {"hole": 12, "par": 4, "stroke_index": 6, "yards_black": 373, "yards_red": 333},
    {"hole": 13, "par": 5, "stroke_index": 8, "yards_black": 487, "yards_red": 418},
    {"hole": 14, "par": 5, "stroke_index": 10, "yards_black": 505, "yards_red": 429},
    {"hole": 15, "par": 4, "stroke_index": 12, "yards_black": 277, "yards_red": 224},
    {"hole": 16, "par": 4, "stroke_index": 14, "yards_black": 355, "yards_red": 289},
    {"hole": 17, "par": 3, "stroke_index": 16, "yards_black": 158, "yards_red": 135},
    {"hole": 18, "par": 4, "stroke_index": 18, "yards_black": 378, "yards_red": 369}
  ]'::jsonb
)
ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name,
  tees = EXCLUDED.tees,
  holes_data = EXCLUDED.holes_data,
  updated_at = NOW();

-- ============================================================================
-- 19. PROSERPINE GOLF CLUB
-- ============================================================================
INSERT INTO venues (id, name, address, city, state, country, postal_code, phone, email, website, latitude, longitude, timezone, created_at, updated_at)
VALUES (
  'f2a3b4c5-d6e7-8901-abcd-500000000850',
  'Proserpine Golf Club',
  'Golf Links Road',
  'Proserpine',
  'Queensland',
  'Australia',
  '4800',
  NULL,
  NULL,
  NULL,
  -20.4000,
  148.5833,
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
  'f2a3b4c5-d6e7-8901-abcd-600000000850',
  'f2a3b4c5-d6e7-8901-abcd-500000000850',
  'Proserpine Golf Club',
  'Whitsunday region parkland course opened 1952. Open guest policy.',
  18,
  71,
  NULL,
  NULL,
  5781,
  5286,
  NULL,
  1952,
  'private',
  NOW(),
  NOW(),
  '[
    {"name": "White", "color": "white", "rating": null, "slope": null, "yards": 5781},
    {"name": "Red", "color": "red", "rating": null, "slope": null, "yards": 5498}
  ]'::jsonb,
  '[
    {"hole": 1, "par": 4, "stroke_index": 16, "yards_white": 283, "yards_red": 283},
    {"hole": 2, "par": 4, "stroke_index": 14, "yards_white": 245, "yards_red": 245},
    {"hole": 3, "par": 4, "stroke_index": 5, "yards_white": 320, "yards_red": 320},
    {"hole": 4, "par": 5, "stroke_index": 18, "yards_white": 448, "yards_red": 448},
    {"hole": 5, "par": 4, "stroke_index": 7, "yards_white": 346, "yards_red": 346},
    {"hole": 6, "par": 4, "stroke_index": 11, "yards_white": 343, "yards_red": 309},
    {"hole": 7, "par": 4, "stroke_index": 3, "yards_white": 375, "yards_red": 326},
    {"hole": 8, "par": 4, "stroke_index": 4, "yards_white": 328, "yards_red": 328},
    {"hole": 9, "par": 3, "stroke_index": 10, "yards_white": 186, "yards_red": 186},
    {"hole": 10, "par": 4, "stroke_index": 13, "yards_white": 317, "yards_red": 317},
    {"hole": 11, "par": 4, "stroke_index": 6, "yards_white": 386, "yards_red": 321},
    {"hole": 12, "par": 5, "stroke_index": 9, "yards_white": 516, "yards_red": 422},
    {"hole": 13, "par": 3, "stroke_index": 12, "yards_white": 133, "yards_red": 111},
    {"hole": 14, "par": 4, "stroke_index": 1, "yards_white": 382, "yards_red": 382},
    {"hole": 15, "par": 4, "stroke_index": 8, "yards_white": 346, "yards_red": 346},
    {"hole": 16, "par": 3, "stroke_index": 15, "yards_white": 153, "yards_red": 134},
    {"hole": 17, "par": 4, "stroke_index": 2, "yards_white": 392, "yards_red": 392},
    {"hole": 18, "par": 4, "stroke_index": 17, "yards_white": 282, "yards_red": 282}
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
-- QLD Batch 3: Brisbane South/Logan & Regional QLD (Central, North, Wide Bay)
-- Total: 19 courses with full hole-by-hole data
--
-- Courses included:
-- 1. Boonah Golf Club - Scenic Rim
-- 2. Goondiwindi Golf Club - QLD/NSW border
-- 3. Clifton Golf Club - Ross Watson design, Est. 1954
-- 4. Oakey Golf Club - Est. 1963
-- 5. Biloela Golf Club - Ross Watson design
-- 6. Emerald Golf Club - Central Highlands
-- 7. Longreach Golf Club - Outback Queensland
-- 8. Rockhampton Golf Club - Central Queensland
-- 9. Bundaberg Golf Club - Wide Bay
-- 10. Bargara Golf Club - Coastal Wide Bay
-- 11. Gladstone Golf Club - Central Queensland
-- 12. Mackay Golf Club - Est. 1926
-- 13. Cairns Golf Club - Est. 1930
-- 14. Paradise Palms Golf Course - Graham Marsh design, Est. 1990
-- 15. Townsville Golf Club - Est. 1924
-- 16. Atherton Golf Club - Est. 1925, Tablelands
-- 17. Innisfail Golf Club - Est. 1925
-- 18. Ayr Golf Club - Burdekin region
-- 19. Proserpine Golf Club - Est. 1952, Whitsundays
--
-- Skipped (limited/placeholder data):
-- - Barcaldine Golf Club (all 300 yard holes)
-- - Mount Isa Golf Club (all 300 yard holes)
-- - Charters Towers Golf Club (all 300 yard holes)
-- - Pittsworth Golf Club (9 holes)
-- - Bowen Golf Club (9 holes)
-- - Clermont Golf Club (9 holes)
