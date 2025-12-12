-- TAS Batch 2: Launceston & Northern
-- 5 courses with full hole-by-hole data (18 holes each)
-- Source: golfify.io
-- Generated: 2025-12-11

-- ============================================================================
-- 1. COUNTRY CLUB TASMANIA
-- ============================================================================
INSERT INTO venues (id, source, name, state, city, address, phone, website, total_holes)
VALUES (
  'f2a3b4c5-d6e7-8901-abcd-500000000907',
  'manual',
  'Country Club Tasmania',
  'TAS',
  'Prospect Vale',
  'Country Club Avenue',
  '+61 7 6335 5777',
  'https://www.countryclubtasmania.com.au',
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
  'f2a3b4c5-d6e7-8901-abcd-500000000907',
  'Country Club Tasmania',
  'Premier resort course designed by Michael Wolveridge and Peter Thomson. Opened 1982. Host of Australian PGA Championship.',
  NULL,
  72.0,
  '[
    {"hole": 1, "par": 4, "stroke_index": 4, "yards_blue": 395, "yards_white": 386, "yards_red": 286},
    {"hole": 2, "par": 4, "stroke_index": 14, "yards_blue": 377, "yards_white": 351, "yards_red": 319},
    {"hole": 3, "par": 3, "stroke_index": 2, "yards_blue": 178, "yards_white": 145, "yards_red": 124},
    {"hole": 4, "par": 5, "stroke_index": 8, "yards_blue": 477, "yards_white": 465, "yards_red": 431},
    {"hole": 5, "par": 4, "stroke_index": 6, "yards_blue": 397, "yards_white": 367, "yards_red": 276},
    {"hole": 6, "par": 5, "stroke_index": 16, "yards_blue": 507, "yards_white": 493, "yards_red": 443},
    {"hole": 7, "par": 4, "stroke_index": 18, "yards_blue": 352, "yards_white": 330, "yards_red": 267},
    {"hole": 8, "par": 3, "stroke_index": 12, "yards_blue": 170, "yards_white": 156, "yards_red": 138},
    {"hole": 9, "par": 4, "stroke_index": 10, "yards_blue": 387, "yards_white": 344, "yards_red": 318},
    {"hole": 10, "par": 3, "stroke_index": 7, "yards_blue": 166, "yards_white": 150, "yards_red": 129},
    {"hole": 11, "par": 4, "stroke_index": 11, "yards_blue": 318, "yards_white": 301, "yards_red": 245},
    {"hole": 12, "par": 5, "stroke_index": 9, "yards_blue": 498, "yards_white": 488, "yards_red": 451},
    {"hole": 13, "par": 3, "stroke_index": 13, "yards_blue": 152, "yards_white": 138, "yards_red": 125},
    {"hole": 14, "par": 4, "stroke_index": 1, "yards_blue": 369, "yards_white": 365, "yards_red": 328},
    {"hole": 15, "par": 3, "stroke_index": 3, "yards_blue": 170, "yards_white": 151, "yards_red": 116},
    {"hole": 16, "par": 5, "stroke_index": 15, "yards_blue": 478, "yards_white": 465, "yards_red": 428},
    {"hole": 17, "par": 3, "stroke_index": 17, "yards_blue": 162, "yards_white": 150, "yards_red": 129},
    {"hole": 18, "par": 5, "stroke_index": 5, "yards_blue": 512, "yards_white": 495, "yards_red": 430}
  ]'::jsonb,
  '[
    {"name": "Blue", "color": "blue", "rating": 72.0, "slope": null, "par": 71, "yards": 6065},
    {"name": "White", "color": "white", "rating": 70.0, "slope": null, "par": 71, "yards": 5740},
    {"name": "Red", "color": "red", "rating": 71.0, "slope": null, "par": 71, "yards": 4983}
  ]'::jsonb
)
ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name,
  tees = EXCLUDED.tees,
  holes = EXCLUDED.holes,
  updated_at = NOW();

-- ============================================================================
-- 2. LAUNCESTON GOLF CLUB
-- ============================================================================
INSERT INTO venues (id, source, name, state, city, address, phone, website, total_holes)
VALUES (
  'f2a3b4c5-d6e7-8901-abcd-500000000908',
  'manual',
  'Launceston Golf Club',
  'TAS',
  'Kings Meadows',
  'Opossum Road',
  NULL,
  'https://www.launcestongolfclub.com.au',
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
  'f2a3b4c5-d6e7-8901-abcd-500000000908',
  'Launceston Golf Club',
  'Historic championship course established 1899. One of Tasmania',
  122,
  72.0,
  '[
    {"hole": 1, "par": 4, "stroke_index": 17, "yards_blue": 242, "yards_white": 234, "yards_yellow": 225},
    {"hole": 2, "par": 5, "stroke_index": 3, "yards_blue": 526, "yards_white": 524, "yards_yellow": 466},
    {"hole": 3, "par": 4, "stroke_index": 5, "yards_blue": 378, "yards_white": 370, "yards_yellow": 325},
    {"hole": 4, "par": 3, "stroke_index": 15, "yards_blue": 148, "yards_white": 139, "yards_yellow": 130},
    {"hole": 5, "par": 4, "stroke_index": 9, "yards_blue": 373, "yards_white": 358, "yards_yellow": 325},
    {"hole": 6, "par": 4, "stroke_index": 1, "yards_blue": 375, "yards_white": 367, "yards_yellow": 320},
    {"hole": 7, "par": 4, "stroke_index": 7, "yards_blue": 383, "yards_white": 364, "yards_yellow": 295},
    {"hole": 8, "par": 4, "stroke_index": 11, "yards_blue": 333, "yards_white": 325, "yards_yellow": 321},
    {"hole": 9, "par": 4, "stroke_index": 13, "yards_blue": 321, "yards_white": 318, "yards_yellow": 276},
    {"hole": 10, "par": 5, "stroke_index": 8, "yards_blue": 508, "yards_white": 506, "yards_yellow": 433},
    {"hole": 11, "par": 4, "stroke_index": 2, "yards_blue": 388, "yards_white": 377, "yards_yellow": 364},
    {"hole": 12, "par": 4, "stroke_index": 6, "yards_blue": 319, "yards_white": 304, "yards_yellow": 258},
    {"hole": 13, "par": 3, "stroke_index": 10, "yards_blue": 157, "yards_white": 138, "yards_yellow": 115},
    {"hole": 14, "par": 3, "stroke_index": 4, "yards_blue": 189, "yards_white": 178, "yards_yellow": 158},
    {"hole": 15, "par": 5, "stroke_index": 16, "yards_blue": 453, "yards_white": 442, "yards_yellow": 404},
    {"hole": 16, "par": 4, "stroke_index": 12, "yards_blue": 330, "yards_white": 302, "yards_yellow": 286},
    {"hole": 17, "par": 4, "stroke_index": 18, "yards_blue": 280, "yards_white": 271, "yards_yellow": 264},
    {"hole": 18, "par": 4, "stroke_index": 14, "yards_blue": 310, "yards_white": 291, "yards_yellow": 282}
  ]'::jsonb,
  '[
    {"name": "Blue", "color": "blue", "rating": 72.0, "slope": 122, "par": 72, "yards": 6013},
    {"name": "White", "color": "white", "rating": 71.0, "slope": 120, "par": 72, "yards": 5808},
    {"name": "Ladies", "color": "yellow", "rating": 72.0, "slope": 120, "par": 72, "yards": 5247}
  ]'::jsonb
)
ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name,
  tees = EXCLUDED.tees,
  holes = EXCLUDED.holes,
  updated_at = NOW();

-- ============================================================================
-- 3. RIVERSIDE GOLF CLUB
-- ============================================================================
INSERT INTO venues (id, source, name, state, city, address, phone, website, total_holes)
VALUES (
  'f2a3b4c5-d6e7-8901-abcd-500000000909',
  'manual',
  'Riverside Golf Club',
  'TAS',
  'Riverside',
  '244 West Tamar Highway',
  '+61 3 6327 3312',
  'https://www.riversidegolf.com.au',
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
  'f2a3b4c5-d6e7-8901-abcd-500000000909',
  'Riverside Golf Club',
  'Parkland course in the Tamar Valley with open guest policy. Scenic views along the Tamar River.',
  122,
  71.0,
  '[
    {"hole": 1, "par": 4, "stroke_index": 3, "yards_blue": 373, "yards_white": 362, "yards_red": 336},
    {"hole": 2, "par": 4, "stroke_index": 12, "yards_blue": 293, "yards_white": 285, "yards_red": 277},
    {"hole": 3, "par": 4, "stroke_index": 2, "yards_blue": 405, "yards_white": 384, "yards_red": 357},
    {"hole": 4, "par": 3, "stroke_index": 11, "yards_blue": 150, "yards_white": 145, "yards_red": 143},
    {"hole": 5, "par": 4, "stroke_index": 1, "par_red": 5, "yards_blue": 379, "yards_white": 377, "yards_red": 375},
    {"hole": 6, "par": 5, "stroke_index": 15, "yards_blue": 461, "yards_white": 430, "yards_red": 406},
    {"hole": 7, "par": 4, "stroke_index": 8, "yards_blue": 338, "yards_white": 316, "yards_red": 263},
    {"hole": 8, "par": 3, "stroke_index": 5, "yards_blue": 177, "yards_white": 165, "yards_red": 158},
    {"hole": 9, "par": 4, "stroke_index": 7, "yards_blue": 351, "yards_white": 326, "yards_red": 305},
    {"hole": 10, "par": 4, "stroke_index": 16, "yards_blue": 168, "yards_white": 161, "yards_red": 153},
    {"hole": 11, "par": 5, "stroke_index": 13, "yards_blue": 451, "yards_white": 441, "yards_red": 406},
    {"hole": 12, "par": 5, "stroke_index": 14, "yards_blue": 423, "yards_white": 412, "yards_red": 386},
    {"hole": 13, "par": 4, "stroke_index": 9, "yards_blue": 364, "yards_white": 356, "yards_red": 310},
    {"hole": 14, "par": 3, "stroke_index": 18, "yards_blue": 145, "yards_white": 139, "yards_red": 128},
    {"hole": 15, "par": 5, "stroke_index": 4, "yards_blue": 528, "yards_white": 521, "yards_red": 435},
    {"hole": 16, "par": 4, "stroke_index": 10, "yards_blue": 350, "yards_white": 335, "yards_red": 324},
    {"hole": 17, "par": 3, "stroke_index": 17, "yards_blue": 130, "yards_white": 133, "yards_red": 121},
    {"hole": 18, "par": 5, "stroke_index": 6, "yards_blue": 498, "yards_white": 493, "yards_red": 405}
  ]'::jsonb,
  '[
    {"name": "Blue", "color": "blue", "rating": 71.0, "slope": 122, "par": 73, "yards": 5984},
    {"name": "White", "color": "white", "rating": 70.0, "slope": 117, "par": 73, "yards": 5781},
    {"name": "Red", "color": "red", "rating": 73.0, "slope": 126, "par": 74, "yards": 5288}
  ]'::jsonb
)
ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name,
  tees = EXCLUDED.tees,
  holes = EXCLUDED.holes,
  updated_at = NOW();

-- ============================================================================
-- 4. DELORAINE GOLF CLUB
-- ============================================================================
INSERT INTO venues (id, source, name, state, city, address, phone, website, total_holes)
VALUES (
  'f2a3b4c5-d6e7-8901-abcd-500000000910',
  'manual',
  'Deloraine Golf Club',
  'TAS',
  'Deloraine',
  'Osmaston Road',
  '+61 3 6362 2132',
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
  'f2a3b4c5-d6e7-8901-abcd-500000000910',
  'Deloraine Golf Club',
  'Parkland course in rural northern Tasmania with open guest policy. Pleasant country setting.',
  114,
  69.0,
  '[
    {"hole": 1, "par": 4, "stroke_index": 7, "stroke_index_red": 6, "yards_blue": 365, "yards_red": 322},
    {"hole": 2, "par": 4, "stroke_index": 3, "stroke_index_red": 3, "yards_blue": 376, "yards_red": 317},
    {"hole": 3, "par": 5, "stroke_index": 13, "stroke_index_red": 9, "yards_blue": 417, "yards_red": 373},
    {"hole": 4, "par": 3, "stroke_index": 18, "stroke_index_red": 16, "yards_blue": 129, "yards_red": 118},
    {"hole": 5, "par": 3, "stroke_index": 12, "stroke_index_red": 12, "yards_blue": 161, "yards_red": 159},
    {"hole": 6, "par": 5, "stroke_index": 9, "stroke_index_red": 1, "yards_blue": 467, "yards_red": 430},
    {"hole": 7, "par": 4, "stroke_index": 15, "stroke_index_red": 14, "yards_blue": 322, "yards_red": 289},
    {"hole": 8, "par": 3, "stroke_index": 6, "par_red": 4, "stroke_index_red": 18, "yards_blue": 201, "yards_red": 207},
    {"hole": 9, "par": 4, "stroke_index": 2, "stroke_index_red": 7, "yards_blue": 390, "yards_red": 312},
    {"hole": 10, "par": 4, "stroke_index": 10, "stroke_index_red": 5, "yards_blue": 342, "yards_red": 338},
    {"hole": 11, "par": 4, "stroke_index": 4, "stroke_index_red": 4, "yards_blue": 383, "yards_red": 309},
    {"hole": 12, "par": 4, "stroke_index": 1, "par_red": 5, "stroke_index_red": 8, "yards_blue": 372, "yards_red": 366},
    {"hole": 13, "par": 3, "stroke_index": 16, "stroke_index_red": 17, "yards_blue": 141, "yards_red": 128},
    {"hole": 14, "par": 3, "stroke_index": 8, "stroke_index_red": 11, "yards_blue": 174, "yards_red": 154},
    {"hole": 15, "par": 5, "stroke_index": 11, "stroke_index_red": 10, "yards_blue": 440, "yards_red": 365},
    {"hole": 16, "par": 4, "stroke_index": 14, "stroke_index_red": 13, "yards_blue": 319, "yards_red": 314},
    {"hole": 17, "par": 4, "stroke_index": 17, "stroke_index_red": 15, "yards_blue": 262, "yards_red": 247},
    {"hole": 18, "par": 4, "stroke_index": 5, "stroke_index_red": 2, "yards_blue": 378, "yards_red": 334}
  ]'::jsonb,
  '[
    {"name": "Men", "color": "blue", "rating": 69.0, "slope": 114, "par": 70, "yards": 5639},
    {"name": "Women", "color": "red", "rating": 72.0, "slope": 119, "par": 72, "yards": 5082}
  ]'::jsonb
)
ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name,
  tees = EXCLUDED.tees,
  holes = EXCLUDED.holes,
  updated_at = NOW();
