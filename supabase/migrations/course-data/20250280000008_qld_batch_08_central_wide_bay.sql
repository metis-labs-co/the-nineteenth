-- QLD Batch 8: Central & Wide Bay
-- 5 courses with full hole-by-hole data (18 holes each)
-- Source: golfify.io
-- Generated: 2025-12-11

-- ============================================================================
-- 1. HERVEY BAY GOLF CLUB
-- ============================================================================
INSERT INTO venues (id, source, name, state, city, address, phone, website, total_holes)
VALUES (
  'f2a3b4c5-d6e7-8901-abcd-500000000876',
  'manual',
  'Hervey Bay Golf Club',
  'QLD',
  'Pialba',
  'Tooth Street',
  '+61 7 4124 4544',
  'https://www.herveybaygolf.com.au',
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
  'f2a3b4c5-d6e7-8901-abcd-500000000876',
  'Hervey Bay Golf Club',
  'Parkland course established 1945. Open guest policy. Gateway to Fraser Island.',
  119,
  71.0,
  '[
    {"hole": 1, "par": 4, "stroke_index": 10, "yards_black": 316, "yards_blue": 304, "yards_white": 294, "yards_red": 294, "yards_yellow": 286},
    {"hole": 2, "par": 3, "stroke_index": 16, "yards_black": 150, "yards_blue": 143, "yards_white": 134, "yards_red": 134, "yards_yellow": 118},
    {"hole": 3, "par": 4, "stroke_index": 8, "yards_black": 344, "yards_blue": 337, "yards_white": 332, "yards_red": 332, "yards_yellow": 324},
    {"hole": 4, "par": 5, "stroke_index": 14, "yards_black": 469, "yards_blue": 458, "yards_white": 446, "yards_red": 410, "yards_yellow": 401},
    {"hole": 5, "par": 4, "stroke_index": 1, "yards_black": 394, "yards_blue": 381, "yards_white": 350, "yards_red": 350, "yards_yellow": 340},
    {"hole": 6, "par": 4, "stroke_index": 6, "yards_black": 352, "yards_blue": 332, "yards_white": 288, "yards_red": 288, "yards_yellow": 274},
    {"hole": 7, "par": 3, "stroke_index": 17, "yards_black": 154, "yards_blue": 146, "yards_white": 138, "yards_red": 138, "yards_yellow": 110},
    {"hole": 8, "par": 4, "stroke_index": 12, "yards_black": 306, "yards_blue": 295, "yards_white": 284, "yards_red": 284, "yards_yellow": 264},
    {"hole": 9, "par": 4, "stroke_index": 4, "yards_black": 386, "yards_blue": 378, "yards_white": 370, "yards_red": 370, "yards_yellow": 363},
    {"hole": 10, "par": 4, "stroke_index": 15, "yards_black": 350, "yards_blue": 342, "yards_white": 334, "yards_red": 334, "yards_yellow": 327},
    {"hole": 11, "par": 4, "stroke_index": 3, "yards_black": 377, "yards_blue": 360, "yards_white": 322, "yards_red": 302, "yards_yellow": 293},
    {"hole": 12, "par": 3, "stroke_index": 18, "yards_black": 125, "yards_blue": 114, "yards_white": 107, "yards_red": 107, "yards_yellow": 96},
    {"hole": 13, "par": 5, "stroke_index": 9, "yards_black": 537, "yards_blue": 523, "yards_white": 516, "yards_red": 424, "yards_yellow": 413},
    {"hole": 14, "par": 4, "stroke_index": 5, "yards_black": 377, "yards_blue": 368, "yards_white": 358, "yards_red": 358, "yards_yellow": 349},
    {"hole": 15, "par": 4, "stroke_index": 2, "yards_black": 395, "yards_blue": 385, "yards_white": 376, "yards_red": 376, "yards_yellow": 364},
    {"hole": 16, "par": 4, "stroke_index": 13, "yards_black": 315, "yards_blue": 296, "yards_white": 280, "yards_red": 280, "yards_yellow": 243},
    {"hole": 17, "par": 3, "stroke_index": 11, "yards_black": 193, "yards_blue": 172, "yards_white": 153, "yards_red": 153, "yards_yellow": 144},
    {"hole": 18, "par": 4, "stroke_index": 7, "yards_black": 357, "yards_blue": 345, "yards_white": 310, "yards_red": 310, "yards_yellow": 299}
  ]'::jsonb,
  '[
    {"name": "Black", "color": "black", "rating": 71.0, "slope": 119, "yards": 5897},
    {"name": "Blue", "color": "blue", "rating": 70.0, "slope": 118, "yards": 5679},
    {"name": "White", "color": "white", "rating": 68.0, "slope": 114, "yards": 5392},
    {"name": "Red", "color": "red", "rating": 73.0, "slope": 123, "yards": 5244},
    {"name": "Yellow", "color": "yellow", "rating": 72.0, "slope": 121, "yards": 5008}
  ]'::jsonb
)
ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name,
  tees = EXCLUDED.tees,
  holes = EXCLUDED.holes,
  updated_at = NOW();

-- ============================================================================
-- 2. CORAL COVE GOLF CLUB (Near Bundaberg)
-- ============================================================================
INSERT INTO venues (id, source, name, state, city, address, phone, website, total_holes)
VALUES (
  'f2a3b4c5-d6e7-8901-abcd-500000000877',
  'manual',
  'Coral Cove Golf Club',
  'QLD',
  'Coral Cove',
  '1 Pebble Beach Drive',
  NULL,
  'https://www.coralcovegolf.com.au',
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
  'f2a3b4c5-d6e7-8901-abcd-500000000877',
  'Coral Cove Golf Club',
  'Parkland course near Bundaberg. Features a par 6 hole. Open guest policy.',
  129,
  70.0,
  '[
    {"hole": 1, "par": 4, "stroke_index": 17, "yards_blue": 235, "yards_white": 235, "yards_red": 224},
    {"hole": 2, "par": 3, "stroke_index": 5, "yards_blue": 203, "yards_white": 168, "yards_red": 146},
    {"hole": 3, "par": 4, "stroke_index": 15, "yards_blue": 344, "yards_white": 295, "yards_red": 295},
    {"hole": 4, "par": 4, "stroke_index": 7, "yards_blue": 345, "yards_white": 312, "yards_red": 280},
    {"hole": 5, "par": 4, "stroke_index": 9, "yards_blue": 312, "yards_white": 275, "yards_red": 275},
    {"hole": 6, "par": 5, "stroke_index": 13, "yards_blue": 483, "yards_white": 443, "yards_red": 443},
    {"hole": 7, "par": 4, "stroke_index": 3, "yards_blue": 400, "yards_white": 334, "yards_red": 282},
    {"hole": 8, "par": 3, "stroke_index": 11, "yards_blue": 145, "yards_white": 145, "yards_red": 120},
    {"hole": 9, "par": 5, "stroke_index": 1, "yards_blue": 540, "yards_white": 540, "yards_red": 438},
    {"hole": 10, "par": 3, "stroke_index": 18, "yards_blue": 120, "yards_white": 120, "yards_red": 120},
    {"hole": 11, "par": 4, "stroke_index": 12, "yards_blue": 354, "yards_white": 354, "yards_red": 329},
    {"hole": 12, "par": 6, "stroke_index": 8, "yards_blue": 635, "yards_white": 600, "yards_red": 563},
    {"hole": 13, "par": 4, "stroke_index": 4, "yards_blue": 363, "yards_white": 332, "yards_red": 292},
    {"hole": 14, "par": 3, "stroke_index": 6, "yards_blue": 192, "yards_white": 156, "yards_red": 156},
    {"hole": 15, "par": 5, "stroke_index": 14, "yards_blue": 476, "yards_white": 468, "yards_red": 391},
    {"hole": 16, "par": 3, "stroke_index": 16, "yards_blue": 121, "yards_white": 109, "yards_red": 97},
    {"hole": 17, "par": 4, "stroke_index": 10, "yards_blue": 346, "yards_white": 335, "yards_red": 297},
    {"hole": 18, "par": 4, "stroke_index": 2, "yards_blue": 375, "yards_white": 375, "yards_red": 270}
  ]'::jsonb,
  '[
    {"name": "Championship", "color": "blue", "rating": 70.0, "slope": 129, "yards": 5989},
    {"name": "Mens", "color": "white", "rating": 68.0, "slope": 128, "yards": 5596},
    {"name": "Ladies", "color": "red", "rating": 71.0, "slope": 118, "yards": 5018}
  ]'::jsonb
)
ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name,
  tees = EXCLUDED.tees,
  holes = EXCLUDED.holes,
  updated_at = NOW();

-- ============================================================================
-- 3. EMU PARK GOLF CLUB (Near Rockhampton)
-- ============================================================================
INSERT INTO venues (id, source, name, state, city, address, phone, website, total_holes)
VALUES (
  'f2a3b4c5-d6e7-8901-abcd-500000000878',
  'manual',
  'Emu Park Golf Club',
  'QLD',
  'Emu Park',
  'Emu Park Road',
  '+61 7 4939 6804',
  'https://www.emuparkgolfclub.com.au',
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
  'f2a3b4c5-d6e7-8901-abcd-500000000878',
  'Emu Park Golf Club',
  'Parkland course on the Capricorn Coast near Rockhampton. Open guest policy.',
  125,
  70.0,
  '[
    {"hole": 1, "par": 4, "stroke_index": 11, "yards_blue": 366, "yards_white": 362, "yards_red": 348},
    {"hole": 2, "par": 4, "stroke_index": 7, "yards_blue": 292, "yards_white": 283, "yards_red": 283},
    {"hole": 3, "par": 3, "stroke_index": 12, "yards_blue": 163, "yards_white": 151, "yards_red": 123},
    {"hole": 4, "par": 4, "stroke_index": 15, "yards_blue": 305, "yards_white": 299, "yards_red": 255},
    {"hole": 5, "par": 5, "stroke_index": 5, "yards_blue": 449, "yards_white": 443, "yards_red": 413},
    {"hole": 6, "par": 4, "stroke_index": 17, "yards_blue": 283, "yards_white": 275, "yards_red": 269},
    {"hole": 7, "par": 4, "stroke_index": 6, "yards_blue": 316, "yards_white": 310, "yards_red": 271},
    {"hole": 8, "par": 4, "stroke_index": 4, "yards_blue": 332, "yards_white": 323, "yards_red": 289},
    {"hole": 9, "par": 3, "stroke_index": 9, "yards_blue": 152, "yards_white": 144, "yards_red": 143},
    {"hole": 10, "par": 4, "stroke_index": 16, "yards_blue": 274, "yards_white": 274, "yards_red": 268},
    {"hole": 11, "par": 4, "stroke_index": 18, "yards_blue": 379, "yards_white": 370, "yards_red": 349},
    {"hole": 12, "par": 4, "stroke_index": 2, "yards_blue": 298, "yards_white": 292, "yards_red": 282},
    {"hole": 13, "par": 5, "stroke_index": 3, "yards_blue": 469, "yards_white": 456, "yards_red": 352},
    {"hole": 14, "par": 4, "stroke_index": 1, "yards_blue": 271, "yards_white": 268, "yards_red": 265},
    {"hole": 15, "par": 3, "stroke_index": 10, "yards_blue": 154, "yards_white": 151, "yards_red": 112},
    {"hole": 16, "par": 4, "stroke_index": 8, "yards_blue": 294, "yards_white": 294, "yards_red": 289},
    {"hole": 17, "par": 5, "stroke_index": 13, "yards_blue": 517, "yards_white": 502, "yards_red": 438},
    {"hole": 18, "par": 4, "stroke_index": 14, "yards_blue": 401, "yards_white": 394, "yards_red": 388}
  ]'::jsonb,
  '[
    {"name": "Blue", "color": "blue", "rating": 70.0, "slope": 125, "yards": 5715},
    {"name": "White", "color": "white", "rating": 70.0, "slope": 124, "yards": 5591},
    {"name": "Red", "color": "red", "rating": 70.0, "slope": 115, "yards": 5137},
    {"name": "Red (Ladies)", "color": "red", "rating": 72.0, "slope": 119, "yards": 5137}
  ]'::jsonb
)
ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name,
  tees = EXCLUDED.tees,
  holes = EXCLUDED.holes,
  updated_at = NOW();

-- ============================================================================
-- 4. SARINA GOLF CLUB (Near Mackay)
-- ============================================================================
INSERT INTO venues (id, source, name, state, city, address, phone, website, total_holes)
VALUES (
  'f2a3b4c5-d6e7-8901-abcd-500000000879',
  'manual',
  'Sarina Golf Club',
  'QLD',
  'Sarina',
  'Golf Links Road',
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
  'f2a3b4c5-d6e7-8901-abcd-500000000879',
  'Sarina Golf Club',
  'Parkland course south of Mackay. Established 1934. Open guest policy.',
  113,
  NULL,
  '[
    {"hole": 1, "par": 4, "stroke_index": 11, "yards_blue": 295},
    {"hole": 2, "par": 4, "stroke_index": 14, "yards_blue": 331},
    {"hole": 3, "par": 4, "stroke_index": 9, "yards_blue": 329},
    {"hole": 4, "par": 4, "stroke_index": 4, "yards_blue": 364},
    {"hole": 5, "par": 5, "stroke_index": 7, "yards_blue": 489},
    {"hole": 6, "par": 3, "stroke_index": 17, "yards_blue": 149},
    {"hole": 7, "par": 5, "stroke_index": 2, "yards_blue": 488},
    {"hole": 8, "par": 4, "stroke_index": 3, "yards_blue": 421},
    {"hole": 9, "par": 3, "stroke_index": 16, "yards_blue": 154},
    {"hole": 10, "par": 4, "stroke_index": 18, "yards_blue": 306},
    {"hole": 11, "par": 4, "stroke_index": 6, "yards_blue": 322},
    {"hole": 12, "par": 3, "stroke_index": 15, "yards_blue": 129},
    {"hole": 13, "par": 4, "stroke_index": 1, "yards_blue": 401},
    {"hole": 14, "par": 5, "stroke_index": 13, "yards_blue": 433},
    {"hole": 15, "par": 4, "stroke_index": 5, "yards_blue": 402},
    {"hole": 16, "par": 3, "stroke_index": 10, "yards_blue": 176},
    {"hole": 17, "par": 4, "stroke_index": 12, "yards_blue": 290},
    {"hole": 18, "par": 4, "stroke_index": 8, "yards_blue": 346}
  ]'::jsonb,
  '[
    {"name": "Blue", "color": "blue", "rating": null, "slope": 113, "yards": 5825},
    {"name": "White", "color": "white", "rating": null, "slope": 110, "yards": 5400},
    {"name": "Red", "color": "red", "rating": null, "slope": 110, "yards": 5400}
  ]'::jsonb
)
ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name,
  tees = EXCLUDED.tees,
  holes = EXCLUDED.holes,
  updated_at = NOW();

-- ============================================================================
-- 5. MORANBAH GOLF CLUB (Bowen Basin)
-- ============================================================================
INSERT INTO venues (id, source, name, state, city, address, phone, website, total_holes)
VALUES (
  'f2a3b4c5-d6e7-8901-abcd-500000000880',
  'manual',
  'Moranbah Golf Club',
  'QLD',
  'Moranbah',
  'Leichhardt Drive',
  '+61 7 4941 7144',
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
  'f2a3b4c5-d6e7-8901-abcd-500000000880',
  'Moranbah Golf Club',
  'Parkland course in the Bowen Basin mining region. Central Queensland.',
  NULL,
  NULL,
  '[
    {"hole": 1, "par": 3, "stroke_index": 1, "yards_blue": 185},
    {"hole": 2, "par": 5, "stroke_index": 3, "yards_blue": 495},
    {"hole": 3, "par": 3, "stroke_index": 5, "yards_blue": 132},
    {"hole": 4, "par": 4, "stroke_index": 7, "yards_blue": 303},
    {"hole": 5, "par": 4, "stroke_index": 9, "yards_blue": 319},
    {"hole": 6, "par": 5, "stroke_index": 11, "yards_blue": 493},
    {"hole": 7, "par": 4, "stroke_index": 13, "yards_blue": 330},
    {"hole": 8, "par": 4, "stroke_index": 15, "yards_blue": 397},
    {"hole": 9, "par": 4, "stroke_index": 17, "yards_blue": 340},
    {"hole": 10, "par": 5, "stroke_index": 2, "yards_blue": 495},
    {"hole": 11, "par": 3, "stroke_index": 4, "yards_blue": 150},
    {"hole": 12, "par": 4, "stroke_index": 6, "yards_blue": 303},
    {"hole": 13, "par": 4, "stroke_index": 8, "yards_blue": 375},
    {"hole": 14, "par": 4, "stroke_index": 10, "yards_blue": 395},
    {"hole": 15, "par": 4, "stroke_index": 12, "yards_blue": 330},
    {"hole": 16, "par": 5, "stroke_index": 14, "yards_blue": 461},
    {"hole": 17, "par": 4, "stroke_index": 16, "yards_blue": 340},
    {"hole": 18, "par": 3, "stroke_index": 18, "yards_blue": 134}
  ]'::jsonb,
  '[
    {"name": "Mens", "color": "blue", "rating": null, "slope": null, "yards": 5977},
    {"name": "Ladies", "color": "white", "rating": null, "slope": null, "yards": 5246}
  ]'::jsonb
)
ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name,
  tees = EXCLUDED.tees,
  holes = EXCLUDED.holes,
  updated_at = NOW();
