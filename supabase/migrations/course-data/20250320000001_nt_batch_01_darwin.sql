-- NT Batch 1: Darwin & Top End
-- 5 courses with full hole-by-hole data
-- Source: golfify.io
-- Generated: 2025-12-11

-- ============================================================================
-- 1. DARWIN GOLF CLUB (Marrara)
-- ============================================================================
INSERT INTO venues (id, source, name, state, city, address, phone, website, total_holes)
VALUES (
  'f2a3b4c5-d6e7-8901-abcd-500000000970',
  'manual',
  'Darwin Golf Club',
  'NT',
  'Darwin',
  'Links Road, Marrara, Northern Territory 812',
  '+61 8 8927 1322',
  'https://darwingolfclub.com.au',
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
  'f2a3b4c5-d6e7-8901-abcd-500000000970',
  'Darwin Golf Club',
  'Premier parkland course in the Top End designed by Michael Wolveridge and opened in 1974. The territory''s flagship course offering challenging tropical golf. Open guest policy.',
  119,
  72.0,
  '[
    {"hole": 1, "par": 5, "stroke_index": 16, "stroke_index_red": 12, "yards_white": 466, "yards_red": 400},
    {"hole": 2, "par": 4, "stroke_index": 14, "yards_white": 362, "yards_red": 326},
    {"hole": 3, "par": 4, "stroke_index": 9, "yards_white": 385, "yards_red": 345},
    {"hole": 4, "par": 4, "stroke_index": 5, "yards_white": 380, "yards_red": 342},
    {"hole": 5, "par": 3, "stroke_index": 18, "stroke_index_red": 16, "yards_white": 148, "yards_red": 138},
    {"hole": 6, "par": 4, "stroke_index": 12, "stroke_index_red": 13, "yards_white": 355, "yards_red": 320},
    {"hole": 7, "par": 5, "stroke_index": 6, "stroke_index_red": 3, "yards_white": 490, "yards_red": 438},
    {"hole": 8, "par": 3, "stroke_index": 13, "stroke_index_red": 18, "yards_white": 155, "yards_red": 142},
    {"hole": 9, "par": 4, "stroke_index": 3, "stroke_index_red": 7, "yards_white": 394, "yards_red": 342},
    {"hole": 10, "par": 4, "stroke_index": 4, "stroke_index_red": 6, "yards_white": 355, "yards_red": 311},
    {"hole": 11, "par": 3, "stroke_index": 17, "yards_white": 165, "yards_red": 145},
    {"hole": 12, "par": 4, "stroke_index": 7, "stroke_index_red": 10, "yards_white": 382, "yards_red": 334},
    {"hole": 13, "par": 4, "stroke_index": 8, "yards_white": 370, "yards_red": 328},
    {"hole": 14, "par": 5, "stroke_index": 1, "yards_white": 478, "yards_red": 428},
    {"hole": 15, "par": 4, "stroke_index": 15, "stroke_index_red": 11, "yards_white": 320, "yards_red": 298},
    {"hole": 16, "par": 3, "stroke_index": 10, "stroke_index_red": 15, "yards_white": 168, "yards_red": 152},
    {"hole": 17, "par": 4, "stroke_index": 2, "yards_white": 413, "yards_red": 362},
    {"hole": 18, "par": 5, "stroke_index": 11, "stroke_index_red": 4, "yards_white": 478, "yards_red": 422}
  ]'::jsonb,
  '[
    {"name": "White", "color": "white", "gender": "mens", "rating": 72.0, "slope": 119, "par": 72, "yards": 6064},
    {"name": "Red", "color": "red", "gender": "ladies", "rating": 73.0, "slope": 119, "par": 72, "yards": 5273}
  ]'::jsonb
)
ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name,
  tees = EXCLUDED.tees,
  holes = EXCLUDED.holes,
  updated_at = NOW();

-- ============================================================================
-- 2. PALMERSTON GOLF & COUNTRY CLUB (Palmerston)
-- ============================================================================
INSERT INTO venues (id, source, name, state, city, address, phone, website, total_holes)
VALUES (
  'f2a3b4c5-d6e7-8901-abcd-500000000971',
  'manual',
  'Palmerston Golf & Country Club',
  'NT',
  'Palmerston',
  'University Avenue & Dwyer Circuit, Driver, Northern Territory',
  '+61 8 8932 1324',
  'https://palmerstongolfcourse.com.au',
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
  'f2a3b4c5-d6e7-8901-abcd-500000000971',
  'Palmerston Golf & Country Club',
  'Modern parkland course opened in 2004 in the growing satellite city of Palmerston. Features well-maintained tropical layout with open guest policy.',
  125,
  71.0,
  '[
    {"hole": 1, "par": 4, "stroke_index": 9, "yards_blue": 329, "yards_red": 290},
    {"hole": 2, "par": 4, "stroke_index": 3, "yards_blue": 375, "yards_red": 335},
    {"hole": 3, "par": 3, "stroke_index": 15, "yards_blue": 165, "yards_red": 142},
    {"hole": 4, "par": 5, "stroke_index": 1, "yards_blue": 529, "yards_red": 472},
    {"hole": 5, "par": 4, "stroke_index": 7, "yards_blue": 350, "yards_red": 312},
    {"hole": 6, "par": 4, "stroke_index": 11, "yards_blue": 328, "yards_red": 295},
    {"hole": 7, "par": 3, "stroke_index": 17, "yards_blue": 148, "yards_red": 130},
    {"hole": 8, "par": 5, "stroke_index": 5, "yards_blue": 485, "yards_red": 438},
    {"hole": 9, "par": 4, "stroke_index": 13, "yards_blue": 342, "yards_red": 308},
    {"hole": 10, "par": 3, "stroke_index": 18, "yards_blue": 158, "yards_red": 138},
    {"hole": 11, "par": 4, "stroke_index": 4, "yards_blue": 360, "yards_red": 322},
    {"hole": 12, "par": 5, "stroke_index": 2, "yards_blue": 518, "yards_red": 468},
    {"hole": 13, "par": 4, "stroke_index": 8, "yards_blue": 345, "yards_red": 310},
    {"hole": 14, "par": 3, "stroke_index": 16, "yards_blue": 162, "yards_red": 140},
    {"hole": 15, "par": 4, "stroke_index": 10, "yards_blue": 335, "yards_red": 298},
    {"hole": 16, "par": 4, "stroke_index": 6, "yards_blue": 355, "yards_red": 318},
    {"hole": 17, "par": 5, "stroke_index": 12, "yards_blue": 468, "yards_red": 420},
    {"hole": 18, "par": 4, "stroke_index": 14, "yards_blue": 349, "yards_red": 312}
  ]'::jsonb,
  '[
    {"name": "Blue", "color": "blue", "gender": "mens", "rating": 71.0, "slope": 125, "par": 71, "yards": 6001},
    {"name": "Red", "color": "red", "gender": "ladies", "rating": 72.0, "slope": 123, "par": 72, "yards": 5288}
  ]'::jsonb
)
ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name,
  tees = EXCLUDED.tees,
  holes = EXCLUDED.holes,
  updated_at = NOW();

-- ============================================================================
-- 3. GARDENS PARK GOLF LINKS (Darwin - The Gardens)
-- ============================================================================
INSERT INTO venues (id, source, name, state, city, address, phone, website, total_holes)
VALUES (
  'f2a3b4c5-d6e7-8901-abcd-500000000972',
  'manual',
  'Gardens Park Golf Links',
  'NT',
  'Darwin',
  '1 Chin Quan Road, The Gardens, Northern Territory 821',
  '+61 8 8981 6365',
  'https://gardensparkgolflinks.com.au',
  9
)
ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name,
  city = EXCLUDED.city,
  address = EXCLUDED.address,
  phone = EXCLUDED.phone,
  website = EXCLUDED.website;

INSERT INTO courses (venue_id, name, description, slope_rating, course_rating, holes, tees)
VALUES (
  'f2a3b4c5-d6e7-8901-abcd-500000000972',
  'Gardens Park Golf Links',
  'Compact 9-hole parkland course in Darwin''s Gardens suburb. Features motor carts, pull carts, club rentals, driving range, chipping green, practice bunker, putting green, pro shop and restaurant. Open guest policy.',
  103,
  31.5,
  '[
    {"hole": 1, "par": 3, "stroke_index": 4, "yards_blue": 164, "yards_red": 153},
    {"hole": 2, "par": 4, "stroke_index": 1, "yards_blue": 394, "yards_red": 366},
    {"hole": 3, "par": 4, "stroke_index": 3, "yards_blue": 317, "yards_red": 258},
    {"hole": 4, "par": 5, "stroke_index": 6, "yards_blue": 492, "yards_red": 443},
    {"hole": 5, "par": 4, "stroke_index": 9, "yards_blue": 235, "yards_red": 197},
    {"hole": 6, "par": 4, "stroke_index": 7, "yards_blue": 284, "yards_red": 186},
    {"hole": 7, "par": 4, "stroke_index": 8, "yards_blue": 219, "yards_red": 217},
    {"hole": 8, "par": 3, "stroke_index": 2, "yards_blue": 178, "yards_red": 175},
    {"hole": 9, "par": 3, "stroke_index": 5, "yards_blue": 177, "yards_red": 153}
  ]'::jsonb,
  '[
    {"name": "Blue", "color": "blue", "gender": "mens", "rating": 31.5, "slope": 103, "par": 34, "yards": 2460},
    {"name": "Red", "color": "red", "gender": "ladies", "rating": 32.5, "slope": 96, "par": 36, "yards": 2148}
  ]'::jsonb
)
ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name,
  tees = EXCLUDED.tees,
  holes = EXCLUDED.holes,
  updated_at = NOW();

-- ============================================================================
-- 4. ALICE SPRINGS GOLF CLUB (Alice Springs)
-- ============================================================================
INSERT INTO venues (id, source, name, state, city, address, phone, website, total_holes)
VALUES (
  'f2a3b4c5-d6e7-8901-abcd-500000000973',
  'manual',
  'Alice Springs Golf Club',
  'NT',
  'Alice Springs',
  'Cromwell Drive, Alice Springs, Northern Territory 871',
  '+61 8 8952 1921',
  'https://alicespringsgolfclub.com.au',
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
  'f2a3b4c5-d6e7-8901-abcd-500000000973',
  'Alice Springs Golf Club',
  'Desert oasis parkland course designed by Michael Wolveridge and opened in 1985. The Red Centre''s premier golfing destination offering unique outback golf experience surrounded by stunning desert landscape.',
  125,
  72.0,
  '[
    {"hole": 1, "par": 4, "stroke_index": 1, "yards_blue": 337, "yards_red": 295},
    {"hole": 2, "par": 4, "stroke_index": 3, "yards_blue": 404, "yards_red": 358},
    {"hole": 3, "par": 3, "stroke_index": 5, "yards_blue": 171, "yards_red": 148},
    {"hole": 4, "par": 5, "stroke_index": 7, "yards_blue": 491, "yards_red": 438},
    {"hole": 5, "par": 3, "stroke_index": 9, "yards_blue": 124, "yards_red": 110},
    {"hole": 6, "par": 5, "stroke_index": 11, "yards_blue": 492, "yards_red": 445},
    {"hole": 7, "par": 4, "stroke_index": 13, "yards_blue": 356, "yards_red": 318},
    {"hole": 8, "par": 4, "stroke_index": 15, "yards_blue": 386, "yards_red": 345},
    {"hole": 9, "par": 4, "stroke_index": 17, "yards_blue": 309, "yards_red": 278},
    {"hole": 10, "par": 5, "stroke_index": 2, "yards_blue": 491, "yards_red": 442},
    {"hole": 11, "par": 4, "stroke_index": 4, "yards_blue": 357, "yards_red": 318},
    {"hole": 12, "par": 3, "stroke_index": 6, "yards_blue": 191, "yards_red": 165},
    {"hole": 13, "par": 4, "stroke_index": 8, "yards_blue": 378, "yards_red": 338},
    {"hole": 14, "par": 5, "stroke_index": 10, "yards_blue": 500, "yards_red": 450},
    {"hole": 15, "par": 3, "stroke_index": 12, "yards_blue": 171, "yards_red": 148},
    {"hole": 16, "par": 4, "stroke_index": 14, "yards_blue": 365, "yards_red": 325},
    {"hole": 17, "par": 4, "stroke_index": 16, "yards_blue": 327, "yards_red": 295},
    {"hole": 18, "par": 4, "stroke_index": 18, "yards_blue": 346, "yards_red": 310}
  ]'::jsonb,
  '[
    {"name": "Blue", "color": "blue", "gender": "mens", "rating": 72.0, "slope": 125, "par": 72, "yards": 6196},
    {"name": "Red", "color": "red", "gender": "ladies", "rating": 73.0, "slope": 123, "par": 73, "yards": 5316}
  ]'::jsonb
)
ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name,
  tees = EXCLUDED.tees,
  holes = EXCLUDED.holes,
  updated_at = NOW();

-- ============================================================================
-- 5. HUMPTY DOO & RURAL AREA GOLF CLUB (Humpty Doo)
-- ============================================================================
INSERT INTO venues (id, source, name, state, city, address, phone, website, total_holes)
VALUES (
  'f2a3b4c5-d6e7-8901-abcd-500000000974',
  'manual',
  'Humpty Doo & Rural Area Golf Club',
  'NT',
  'Humpty Doo',
  '565 Pioneer Drive, Humpty Doo, Northern Territory 836',
  '+61 8 8988 1118',
  'https://humptydoogolfclub.com.au',
  9
)
ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name,
  city = EXCLUDED.city,
  address = EXCLUDED.address,
  phone = EXCLUDED.phone,
  website = EXCLUDED.website;

INSERT INTO courses (venue_id, name, description, slope_rating, course_rating, holes, tees)
VALUES (
  'f2a3b4c5-d6e7-8901-abcd-500000000974',
  'Humpty Doo & Rural Area Golf Club',
  'Friendly rural 9-hole parkland course in the Top End''s Humpty Doo rural area. Features motor carts, pull carts, driving range, practice bunker, putting green, chipping green and dining facilities. Open guest policy.',
  113,
  34.5,
  '[
    {"hole": 1, "par": 5, "stroke_index": 6, "yards_blue": 456, "yards_red": 420},
    {"hole": 2, "par": 3, "stroke_index": 8, "yards_blue": 129, "yards_red": 115},
    {"hole": 3, "par": 4, "stroke_index": 2, "yards_blue": 347, "yards_red": 310},
    {"hole": 4, "par": 4, "stroke_index": 3, "yards_blue": 372, "yards_red": 335},
    {"hole": 5, "par": 4, "stroke_index": 4, "yards_blue": 349, "yards_red": 312},
    {"hole": 6, "par": 3, "stroke_index": 1, "yards_blue": 172, "yards_red": 152},
    {"hole": 7, "par": 4, "stroke_index": 7, "yards_blue": 321, "yards_red": 288},
    {"hole": 8, "par": 4, "stroke_index": 9, "yards_blue": 310, "yards_red": 278},
    {"hole": 9, "par": 5, "stroke_index": 5, "yards_blue": 442, "yards_red": 398}
  ]'::jsonb,
  '[
    {"name": "Blue", "color": "blue", "gender": "mens", "rating": 34.5, "slope": 113, "par": 36, "yards": 2898},
    {"name": "Red", "color": "red", "gender": "ladies", "rating": 36.0, "slope": 117, "par": 36, "yards": 2699}
  ]'::jsonb
)
ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name,
  tees = EXCLUDED.tees,
  holes = EXCLUDED.holes,
  updated_at = NOW();
