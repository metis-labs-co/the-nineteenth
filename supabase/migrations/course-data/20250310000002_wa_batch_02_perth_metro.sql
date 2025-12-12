-- WA Batch 2: Perth Metro & Northern Suburbs
-- 7 courses with full hole-by-hole data
-- Source: golfify.io
-- Generated: 2025-12-11

-- ============================================================================
-- 1. WANNEROO GOLF CLUB (Neerabup)
-- ============================================================================
INSERT INTO venues (id, source, name, state, city, address, phone, website, total_holes)
VALUES (
  'f2a3b4c5-d6e7-8901-abcd-500000000951',
  'manual',
  'Wanneroo Golf Club',
  'WA',
  'Neerabup',
  'Flynn Drive, Neerabup',
  '+61 8 9405 3677',
  'https://www.wgc.net.au',
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
  'f2a3b4c5-d6e7-8901-abcd-500000000951',
  'Wanneroo Golf Club',
  'Northern suburbs parkland course established in 1973. Open guest policy with well-maintained fairways and greens.',
  113,
  72.6,
  '[
    {"hole": 1, "par": 4, "stroke_index": 12, "par_red": 4, "stroke_index_red": 14, "yards_white": 337, "yards_red": 300},
    {"hole": 2, "par": 5, "stroke_index": 17, "par_red": 5, "stroke_index_red": 3, "yards_white": 449, "yards_red": 415},
    {"hole": 3, "par": 4, "stroke_index": 13, "par_red": 4, "stroke_index_red": 16, "yards_white": 312, "yards_red": 250},
    {"hole": 4, "par": 3, "stroke_index": 10, "par_red": 3, "stroke_index_red": 13, "yards_white": 187, "yards_red": 160},
    {"hole": 5, "par": 4, "stroke_index": 5, "par_red": 4, "stroke_index_red": 2, "yards_white": 362, "yards_red": 330},
    {"hole": 6, "par": 4, "stroke_index": 2, "par_red": 4, "stroke_index_red": 1, "yards_white": 402, "yards_red": 350},
    {"hole": 7, "par": 4, "stroke_index": 4, "par_red": 4, "stroke_index_red": 9, "yards_white": 387, "yards_red": 295},
    {"hole": 8, "par": 3, "stroke_index": 15, "par_red": 3, "stroke_index_red": 17, "yards_white": 145, "yards_red": 110},
    {"hole": 9, "par": 5, "stroke_index": 7, "par_red": 5, "stroke_index_red": 12, "yards_white": 506, "yards_red": 415},
    {"hole": 10, "par": 5, "stroke_index": 18, "par_red": 5, "stroke_index_red": 5, "yards_white": 435, "yards_red": 405},
    {"hole": 11, "par": 3, "stroke_index": 14, "par_red": 3, "stroke_index_red": 18, "yards_white": 151, "yards_red": 120},
    {"hole": 12, "par": 4, "stroke_index": 3, "par_red": 4, "stroke_index_red": 10, "yards_white": 401, "yards_red": 307},
    {"hole": 13, "par": 4, "stroke_index": 1, "par_red": 5, "stroke_index_red": 11, "yards_white": 406, "yards_red": 400},
    {"hole": 14, "par": 4, "stroke_index": 8, "par_red": 4, "stroke_index_red": 6, "yards_white": 348, "yards_red": 305},
    {"hole": 15, "par": 3, "stroke_index": 16, "par_red": 3, "stroke_index_red": 15, "yards_white": 152, "yards_red": 131},
    {"hole": 16, "par": 5, "stroke_index": 11, "par_red": 5, "stroke_index_red": 4, "yards_white": 497, "yards_red": 455},
    {"hole": 17, "par": 4, "stroke_index": 9, "par_red": 4, "stroke_index_red": 7, "yards_white": 360, "yards_red": 300},
    {"hole": 18, "par": 4, "stroke_index": 6, "par_red": 4, "stroke_index_red": 8, "yards_white": 380, "yards_red": 325}
  ]'::jsonb,
  '[
    {"name": "White", "color": "white", "gender": "mens", "rating": 72.6, "slope": 113, "par": 72, "yards": 6217},
    {"name": "Ladies", "color": "red", "gender": "ladies", "rating": 73.0, "slope": 113, "par": 73, "yards": 5373}
  ]'::jsonb
)
ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name,
  tees = EXCLUDED.tees,
  holes = EXCLUDED.holes,
  updated_at = NOW();

-- ============================================================================
-- 2. WEMBLEY GOLF COMPLEX - OLD COURSE (Wembley Downs)
-- ============================================================================
INSERT INTO venues (id, source, name, state, city, address, phone, website, total_holes)
VALUES (
  'f2a3b4c5-d6e7-8901-abcd-500000000952',
  'manual',
  'Wembley Golf Complex',
  'WA',
  'Wembley Downs',
  '200 The Boulevard, Wembley Downs',
  NULL,
  'https://www.wembleygolf.com.au',
  36
)
ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name,
  city = EXCLUDED.city,
  address = EXCLUDED.address,
  phone = EXCLUDED.phone,
  website = EXCLUDED.website;

INSERT INTO courses (venue_id, name, description, slope_rating, course_rating, holes, tees)
VALUES (
  'f2a3b4c5-d6e7-8901-abcd-500000000952',
  'Wembley Golf Complex - Old Course',
  'Historic Perth public course established in 1932. Popular municipal course with two 18-hole layouts. Open to all players.',
  116,
  69.0,
  '[
    {"hole": 1, "par": 5, "stroke_index": 7, "stroke_index_white": 8, "yards_green": 432, "yards_white": 417},
    {"hole": 2, "par": 3, "stroke_index": 17, "stroke_index_white": 18, "yards_green": 141, "yards_white": 112},
    {"hole": 3, "par": 4, "stroke_index": 4, "stroke_index_white": 11, "yards_green": 339, "yards_white": 294},
    {"hole": 4, "par": 5, "stroke_index": 10, "stroke_index_white": 3, "yards_green": 441, "yards_white": 430},
    {"hole": 5, "par": 4, "stroke_index": 1, "stroke_index_white": 4, "yards_green": 399, "yards_white": 348},
    {"hole": 6, "par": 3, "stroke_index": 15, "stroke_index_white": 16, "yards_green": 135, "yards_white": 122},
    {"hole": 7, "par": 4, "stroke_index": 8, "stroke_index_white": 7, "yards_green": 308, "yards_white": 300},
    {"hole": 8, "par": 4, "stroke_index": 6, "stroke_index_white": 5, "yards_green": 318, "yards_white": 303},
    {"hole": 9, "par": 4, "stroke_index": 16, "stroke_index_white": 12, "yards_green": 256, "yards_white": 249},
    {"hole": 10, "par": 4, "stroke_index": 11, "stroke_index_white": 14, "yards_green": 287, "yards_white": 267},
    {"hole": 11, "par": 5, "stroke_index": 12, "stroke_index_white": 9, "yards_green": 423, "yards_white": 402},
    {"hole": 12, "par": 4, "stroke_index": 3, "stroke_index_white": 2, "yards_green": 366, "yards_white": 344},
    {"hole": 13, "par": 3, "stroke_index": 13, "stroke_index_white": 15, "yards_green": 156, "yards_white": 136},
    {"hole": 14, "par": 4, "stroke_index": 5, "stroke_index_white": 10, "yards_green": 297, "yards_white": 283},
    {"hole": 15, "par": 4, "stroke_index": 14, "stroke_index_white": 13, "yards_green": 254, "yards_white": 241},
    {"hole": 16, "par": 3, "stroke_index": 18, "stroke_index_white": 17, "yards_green": 127, "yards_white": 119},
    {"hole": 17, "par": 5, "stroke_index": 9, "stroke_index_white": 6, "yards_green": 407, "yards_white": 392},
    {"hole": 18, "par": 4, "stroke_index": 2, "stroke_index_white": 1, "yards_green": 336, "yards_white": 323}
  ]'::jsonb,
  '[
    {"name": "Green", "color": "green", "gender": "mens", "rating": 69.0, "slope": 116, "par": 72, "yards": 5422},
    {"name": "White", "color": "white", "gender": "mens", "rating": 72.0, "slope": 113, "par": 72, "yards": 5082}
  ]'::jsonb
)
ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name,
  tees = EXCLUDED.tees,
  holes = EXCLUDED.holes,
  updated_at = NOW();

-- ============================================================================
-- 3. WEMBLEY GOLF COMPLEX - TUART COURSE (Wembley Downs)
-- ============================================================================
INSERT INTO courses (venue_id, name, description, slope_rating, course_rating, holes, tees)
VALUES (
  'f2a3b4c5-d6e7-8901-abcd-500000000952',
  'Wembley Golf Complex - Tuart Course',
  'Companion course to the Old Course at Wembley Golf Complex. Established 1932, offering a shorter but still challenging layout for all handicaps.',
  112,
  67.0,
  '[
    {"hole": 1, "par": 4, "stroke_index": 4, "stroke_index_white": 8, "yards_green": 320, "yards_white": 300},
    {"hole": 2, "par": 4, "stroke_index": 5, "stroke_index_white": 4, "yards_green": 310, "yards_white": 302},
    {"hole": 3, "par": 3, "stroke_index": 18, "stroke_index_white": 18, "yards_green": 123, "yards_white": 100},
    {"hole": 4, "par": 5, "stroke_index": 1, "stroke_index_white": 1, "yards_green": 452, "yards_white": 447},
    {"hole": 5, "par": 4, "stroke_index": 7, "stroke_index_white": 7, "yards_green": 301, "yards_white": 290},
    {"hole": 6, "par": 3, "stroke_index": 16, "stroke_index_white": 17, "yards_green": 145, "yards_white": 114},
    {"hole": 7, "par": 4, "stroke_index": 12, "stroke_index_white": 10, "yards_green": 240, "yards_white": 220},
    {"hole": 8, "par": 4, "stroke_index": 10, "stroke_index_white": 12, "yards_green": 320, "yards_white": 279},
    {"hole": 9, "par": 4, "stroke_index": 11, "stroke_index_white": 5, "yards_green": 296, "yards_white": 280},
    {"hole": 10, "par": 4, "stroke_index": 14, "stroke_index_white": 13, "yards_green": 278, "yards_white": 245},
    {"hole": 11, "par": 4, "stroke_index": 2, "stroke_index_white": 2, "yards_green": 351, "yards_white": 340},
    {"hole": 12, "par": 3, "stroke_index": 13, "stroke_index_white": 15, "yards_green": 158, "yards_white": 150},
    {"hole": 13, "par": 4, "stroke_index": 6, "stroke_index_white": 3, "yards_green": 318, "yards_white": 310},
    {"hole": 14, "par": 4, "stroke_index": 3, "stroke_index_white": 11, "yards_green": 300, "yards_white": 266},
    {"hole": 15, "par": 5, "stroke_index": 15, "stroke_index_white": 14, "yards_green": 440, "yards_white": 413},
    {"hole": 16, "par": 4, "stroke_index": 9, "stroke_index_white": 9, "yards_green": 265, "yards_white": 245},
    {"hole": 17, "par": 4, "stroke_index": 8, "stroke_index_white": 6, "yards_green": 293, "yards_white": 232},
    {"hole": 18, "par": 3, "stroke_index": 17, "stroke_index_white": 16, "yards_green": 110, "yards_white": 100}
  ]'::jsonb,
  '[
    {"name": "Green", "color": "green", "gender": "mens", "rating": 67.0, "slope": 112, "par": 70, "yards": 5020},
    {"name": "White", "color": "white", "gender": "mens", "rating": 70.0, "slope": 113, "par": 70, "yards": 4633}
  ]'::jsonb
)
ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name,
  tees = EXCLUDED.tees,
  holes = EXCLUDED.holes,
  updated_at = NOW();

-- ============================================================================
-- 4. GOSNELLS GOLF CLUB (Gosnells)
-- ============================================================================
INSERT INTO venues (id, source, name, state, city, address, phone, website, total_holes)
VALUES (
  'f2a3b4c5-d6e7-8901-abcd-500000000953',
  'manual',
  'Gosnells Golf Club',
  'WA',
  'Gosnells',
  'Warton Road, Gosnells',
  '+61 8 9455 1983',
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
  'f2a3b4c5-d6e7-8901-abcd-500000000953',
  'Gosnells Golf Club',
  'South-eastern suburbs parkland course established in 1962. Open guest policy with well-maintained greens.',
  121,
  70.0,
  '[
    {"hole": 1, "par": 4, "stroke_index": 18, "par_red": 4, "stroke_index_red": 18, "yards_blue": 279, "yards_red": 245},
    {"hole": 2, "par": 5, "stroke_index": 14, "par_red": 5, "stroke_index_red": 10, "yards_blue": 473, "yards_red": 438},
    {"hole": 3, "par": 4, "stroke_index": 2, "par_red": 5, "stroke_index_red": 16, "yards_blue": 353, "yards_red": 366},
    {"hole": 4, "par": 3, "stroke_index": 16, "par_red": 3, "stroke_index_red": 15, "yards_blue": 119, "yards_red": 119},
    {"hole": 5, "par": 4, "stroke_index": 8, "par_red": 4, "stroke_index_red": 8, "yards_blue": 322, "yards_red": 310},
    {"hole": 6, "par": 4, "stroke_index": 10, "par_red": 4, "stroke_index_red": 5, "yards_blue": 340, "yards_red": 300},
    {"hole": 7, "par": 3, "stroke_index": 12, "par_red": 3, "stroke_index_red": 12, "yards_blue": 169, "yards_red": 152},
    {"hole": 8, "par": 4, "stroke_index": 4, "par_red": 4, "stroke_index_red": 2, "yards_blue": 371, "yards_red": 353},
    {"hole": 9, "par": 3, "stroke_index": 6, "par_red": 3, "stroke_index_red": 14, "yards_blue": 153, "yards_red": 102},
    {"hole": 10, "par": 4, "stroke_index": 5, "par_red": 5, "stroke_index_red": 13, "yards_blue": 398, "yards_red": 395},
    {"hole": 11, "par": 3, "stroke_index": 15, "par_red": 3, "stroke_index_red": 17, "yards_blue": 154, "yards_red": 121},
    {"hole": 12, "par": 4, "stroke_index": 1, "par_red": 4, "stroke_index_red": 6, "yards_blue": 385, "yards_red": 324},
    {"hole": 13, "par": 5, "stroke_index": 17, "par_red": 5, "stroke_index_red": 3, "yards_blue": 486, "yards_red": 463},
    {"hole": 14, "par": 3, "stroke_index": 13, "par_red": 3, "stroke_index_red": 11, "yards_blue": 164, "yards_red": 118},
    {"hole": 15, "par": 4, "stroke_index": 3, "par_red": 4, "stroke_index_red": 4, "yards_blue": 375, "yards_red": 341},
    {"hole": 16, "par": 4, "stroke_index": 11, "par_red": 4, "stroke_index_red": 9, "yards_blue": 340, "yards_red": 308},
    {"hole": 17, "par": 4, "stroke_index": 7, "par_red": 4, "stroke_index_red": 7, "yards_blue": 330, "yards_red": 314},
    {"hole": 18, "par": 5, "stroke_index": 9, "par_red": 5, "stroke_index_red": 1, "yards_blue": 471, "yards_red": 429}
  ]'::jsonb,
  '[
    {"name": "Blue", "color": "blue", "gender": "mens", "rating": 70.0, "slope": 121, "par": 70, "yards": 5682},
    {"name": "Red", "color": "red", "gender": "ladies", "rating": 74.0, "slope": 113, "par": 72, "yards": 5198}
  ]'::jsonb
)
ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name,
  tees = EXCLUDED.tees,
  holes = EXCLUDED.holes,
  updated_at = NOW();

-- ============================================================================
-- 5. MARANGAROO GOLF COURSE (Marangaroo)
-- ============================================================================
INSERT INTO venues (id, source, name, state, city, address, phone, website, total_holes)
VALUES (
  'f2a3b4c5-d6e7-8901-abcd-500000000954',
  'manual',
  'Marangaroo Golf Course',
  'WA',
  'Marangaroo',
  'Aylesford Drive, Marangaroo',
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
  'f2a3b4c5-d6e7-8901-abcd-500000000954',
  'Marangaroo Golf Course',
  'Northern suburbs parkland course designed by Murray Dawson, opened in 1988. Public course with open guest policy.',
  NULL,
  NULL,
  '[
    {"hole": 1, "par": 4, "stroke_index": 2, "stroke_index_red": 4, "yards_white": 361, "yards_red": 335},
    {"hole": 2, "par": 4, "stroke_index": 4, "stroke_index_red": 6, "yards_white": 363, "yards_red": 320},
    {"hole": 3, "par": 4, "stroke_index": 17, "stroke_index_red": 16, "yards_white": 286, "yards_red": 236},
    {"hole": 4, "par": 3, "stroke_index": 15, "stroke_index_red": 17, "yards_white": 152, "yards_red": 129},
    {"hole": 5, "par": 5, "stroke_index": 14, "stroke_index_red": 10, "yards_white": 429, "yards_red": 391},
    {"hole": 6, "par": 3, "stroke_index": 11, "stroke_index_red": 14, "yards_white": 168, "yards_red": 144},
    {"hole": 7, "par": 4, "stroke_index": 9, "stroke_index_red": 8, "yards_white": 275, "yards_red": 248},
    {"hole": 8, "par": 4, "stroke_index": 1, "stroke_index_red": 1, "yards_white": 371, "yards_red": 351},
    {"hole": 9, "par": 5, "stroke_index": 13, "stroke_index_red": 11, "yards_white": 419, "yards_red": 398},
    {"hole": 10, "par": 4, "stroke_index": 16, "stroke_index_red": 13, "yards_white": 293, "yards_red": 264},
    {"hole": 11, "par": 5, "stroke_index": 12, "stroke_index_red": 12, "yards_white": 422, "yards_red": 380},
    {"hole": 12, "par": 3, "stroke_index": 10, "stroke_index_red": 15, "yards_white": 160, "yards_red": 134},
    {"hole": 13, "par": 4, "stroke_index": 3, "stroke_index_red": 7, "yards_white": 338, "yards_red": 284},
    {"hole": 14, "par": 4, "stroke_index": 5, "stroke_index_red": 9, "yards_white": 338, "yards_red": 301},
    {"hole": 15, "par": 4, "stroke_index": 7, "stroke_index_red": 2, "yards_white": 333, "yards_red": 297},
    {"hole": 16, "par": 3, "stroke_index": 18, "stroke_index_red": 18, "yards_white": 136, "yards_red": 108},
    {"hole": 17, "par": 5, "stroke_index": 6, "stroke_index_red": 5, "yards_white": 428, "yards_red": 403},
    {"hole": 18, "par": 4, "stroke_index": 8, "stroke_index_red": 3, "yards_white": 345, "yards_red": 310}
  ]'::jsonb,
  '[
    {"name": "White", "color": "white", "gender": "mens", "rating": null, "slope": null, "par": 72, "yards": 5617},
    {"name": "Red", "color": "red", "gender": "ladies", "rating": null, "slope": null, "par": 72, "yards": 5033}
  ]'::jsonb
)
ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name,
  tees = EXCLUDED.tees,
  holes = EXCLUDED.holes,
  updated_at = NOW();

-- ============================================================================
-- 6. MARRI PARK GOLF COURSE (Casuarina)
-- ============================================================================
INSERT INTO venues (id, source, name, state, city, address, phone, website, total_holes)
VALUES (
  'f2a3b4c5-d6e7-8901-abcd-500000000955',
  'manual',
  'Marri Park Golf Course',
  'WA',
  'Casuarina',
  'Thomas Road, Casuarina',
  '+61 8 9573 1288',
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
  'f2a3b4c5-d6e7-8901-abcd-500000000955',
  'Marri Park Golf Course',
  'Parkland course south of Perth established in 1969. Open guest policy with three tee options.',
  113,
  71.0,
  '[
    {"hole": 1, "par": 5, "stroke_index": 8, "stroke_index_red": 10, "yards_blue": 465, "yards_yellow": 443, "yards_red": 416},
    {"hole": 2, "par": 4, "stroke_index": 4, "yards_blue": 368, "yards_yellow": 350, "yards_red": 330},
    {"hole": 3, "par": 4, "stroke_index": 10, "stroke_index_red": 6, "yards_blue": 316, "yards_yellow": 300, "yards_red": 288},
    {"hole": 4, "par": 3, "stroke_index": 16, "yards_blue": 140, "yards_yellow": 126, "yards_red": 115},
    {"hole": 5, "par": 4, "stroke_index": 14, "yards_blue": 303, "yards_yellow": 275, "yards_red": 261},
    {"hole": 6, "par": 4, "stroke_index": 12, "yards_blue": 301, "yards_yellow": 283, "yards_red": 264},
    {"hole": 7, "par": 4, "stroke_index": 2, "yards_blue": 403, "yards_yellow": 381, "yards_red": 349},
    {"hole": 8, "par": 3, "stroke_index": 18, "yards_blue": 142, "yards_yellow": 134, "yards_red": 125},
    {"hole": 9, "par": 5, "stroke_index": 6, "stroke_index_red": 8, "yards_blue": 508, "yards_yellow": 462, "yards_red": 434},
    {"hole": 10, "par": 4, "stroke_index": 3, "stroke_index_red": 5, "yards_blue": 365, "yards_yellow": 346, "yards_red": 327},
    {"hole": 11, "par": 4, "stroke_index": 1, "yards_blue": 408, "yards_yellow": 391, "yards_red": 370},
    {"hole": 12, "par": 5, "stroke_index": 7, "stroke_index_red": 9, "yards_blue": 476, "yards_yellow": 461, "yards_red": 446},
    {"hole": 13, "par": 4, "stroke_index": 17, "stroke_index_red": 15, "yards_blue": 297, "yards_yellow": 285, "yards_red": 271},
    {"hole": 14, "par": 3, "stroke_index": 13, "yards_blue": 160, "yards_yellow": 150, "yards_red": 137},
    {"hole": 15, "par": 4, "stroke_index": 5, "stroke_index_red": 3, "yards_blue": 371, "yards_yellow": 356, "yards_red": 330},
    {"hole": 16, "par": 5, "stroke_index": 11, "yards_blue": 458, "yards_yellow": 435, "yards_red": 419},
    {"hole": 17, "par": 3, "stroke_index": 15, "stroke_index_red": 17, "yards_blue": 164, "yards_yellow": 154, "yards_red": 149},
    {"hole": 18, "par": 4, "stroke_index": 9, "stroke_index_red": 7, "yards_blue": 360, "yards_yellow": 334, "yards_red": 310}
  ]'::jsonb,
  '[
    {"name": "Blue", "color": "blue", "gender": "mens", "rating": 71.0, "slope": 113, "par": 72, "yards": 6005},
    {"name": "Yellow", "color": "yellow", "gender": "mens", "rating": 71.0, "slope": 113, "par": 72, "yards": 5666},
    {"name": "Red", "color": "red", "gender": "ladies", "rating": 72.0, "slope": 113, "par": 72, "yards": 5341}
  ]'::jsonb
)
ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name,
  tees = EXCLUDED.tees,
  holes = EXCLUDED.holes,
  updated_at = NOW();

-- ============================================================================
-- 7. MAYLANDS PENINSULA GOLF COURSE (Maylands)
-- ============================================================================
INSERT INTO venues (id, source, name, state, city, address, phone, website, total_holes)
VALUES (
  'f2a3b4c5-d6e7-8901-abcd-500000000956',
  'manual',
  'Maylands Peninsula Golf Course',
  'WA',
  'Maylands',
  'Swanbank Road, Maylands',
  '+61 8 9370 3211',
  'https://www.maylandsgolf.com.au',
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
  'f2a3b4c5-d6e7-8901-abcd-500000000956',
  'Maylands Peninsula Golf Course',
  'Inner city Perth public course established in 1994. Located on Swan River peninsula with scenic water views.',
  111,
  69.0,
  '[
    {"hole": 1, "par": 5, "stroke_index": 10, "yards_white": 457},
    {"hole": 2, "par": 4, "stroke_index": 13, "yards_white": 316},
    {"hole": 3, "par": 4, "stroke_index": 6, "yards_white": 358},
    {"hole": 4, "par": 5, "stroke_index": 16, "yards_white": 444},
    {"hole": 5, "par": 3, "stroke_index": 14, "yards_white": 154},
    {"hole": 6, "par": 4, "stroke_index": 8, "yards_white": 341},
    {"hole": 7, "par": 4, "stroke_index": 3, "yards_white": 349},
    {"hole": 8, "par": 3, "stroke_index": 12, "yards_white": 142},
    {"hole": 9, "par": 3, "stroke_index": 4, "yards_white": 178},
    {"hole": 10, "par": 4, "stroke_index": 2, "yards_white": 362},
    {"hole": 11, "par": 4, "stroke_index": 17, "yards_white": 286},
    {"hole": 12, "par": 4, "stroke_index": 1, "yards_white": 359},
    {"hole": 13, "par": 3, "stroke_index": 9, "yards_white": 155},
    {"hole": 14, "par": 5, "stroke_index": 7, "yards_white": 427},
    {"hole": 15, "par": 4, "stroke_index": 5, "yards_white": 363},
    {"hole": 16, "par": 3, "stroke_index": 15, "yards_white": 161},
    {"hole": 17, "par": 4, "stroke_index": 11, "yards_white": 339},
    {"hole": 18, "par": 5, "stroke_index": 18, "yards_white": 425}
  ]'::jsonb,
  '[
    {"name": "White", "color": "white", "gender": "mens", "rating": 69.0, "slope": 111, "par": 71, "yards": 5616}
  ]'::jsonb
)
ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name,
  tees = EXCLUDED.tees,
  holes = EXCLUDED.holes,
  updated_at = NOW();
