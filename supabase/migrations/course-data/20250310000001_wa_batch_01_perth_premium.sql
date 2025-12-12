-- WA Batch 1: Perth Premium
-- 5 courses with full hole-by-hole data (18 holes each)
-- Source: golfify.io
-- Generated: 2025-12-11

-- ============================================================================
-- 1. JOONDALUP COUNTRY CLUB - QUARRY/LAKE (Perth North)
-- ============================================================================
INSERT INTO venues (id, source, name, state, city, address, phone, website, total_holes)
VALUES (
  'f2a3b4c5-d6e7-8901-abcd-500000000946',
  'manual',
  'Joondalup Country Club',
  'WA',
  'Connolly',
  'Country Club Boulevard, Connolly',
  '+61 8 9400 8888',
  'https://www.joondalupresort.com.au',
  27
)
ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name,
  city = EXCLUDED.city,
  address = EXCLUDED.address,
  phone = EXCLUDED.phone,
  website = EXCLUDED.website;

INSERT INTO courses (venue_id, name, description, slope_rating, course_rating, holes, tees)
VALUES (
  'f2a3b4c5-d6e7-8901-abcd-500000000946',
  'Joondalup Country Club - Quarry/Lake',
  'Robert Trent Jones Jr designed championship course featuring 27 holes in three nines (Quarry, Lake, Dune). Home of the ISPS Handa World Super 6 Perth. One of Western Australia''s premier resort courses.',
  NULL,
  NULL,
  '[
    {"hole": 1, "par": 4, "stroke_index": 1, "yards_black": 368, "yards_blue": 346, "yards_white": 325, "yards_red": 297},
    {"hole": 2, "par": 4, "stroke_index": 2, "yards_black": 370, "yards_blue": 340, "yards_white": 313, "yards_red": 298},
    {"hole": 3, "par": 3, "stroke_index": 9, "yards_black": 136, "yards_blue": 125, "yards_white": 117, "yards_red": 101},
    {"hole": 4, "par": 5, "stroke_index": 7, "yards_black": 475, "yards_blue": 455, "yards_white": 423, "yards_red": 392},
    {"hole": 5, "par": 4, "stroke_index": 5, "yards_black": 370, "yards_blue": 353, "yards_white": 333, "yards_red": 327},
    {"hole": 6, "par": 4, "stroke_index": 6, "yards_black": 363, "yards_blue": 328, "yards_white": 318, "yards_red": 235},
    {"hole": 7, "par": 3, "stroke_index": 4, "yards_black": 203, "yards_blue": 172, "yards_white": 160, "yards_red": 134},
    {"hole": 8, "par": 5, "stroke_index": 8, "yards_black": 483, "yards_blue": 447, "yards_white": 402, "yards_red": 419},
    {"hole": 9, "par": 4, "stroke_index": 3, "yards_black": 390, "yards_blue": 369, "yards_white": 342, "yards_red": 312},
    {"hole": 10, "par": 4, "stroke_index": 2, "yards_black": 366, "yards_blue": 311, "yards_white": 267, "yards_red": 387},
    {"hole": 11, "par": 4, "stroke_index": 9, "yards_black": 274, "yards_blue": 260, "yards_white": 239, "yards_red": 302},
    {"hole": 12, "par": 3, "stroke_index": 7, "yards_black": 135, "yards_blue": 134, "yards_white": 101, "yards_red": 154},
    {"hole": 13, "par": 5, "stroke_index": 8, "yards_black": 458, "yards_blue": 435, "yards_white": 425, "yards_red": 482},
    {"hole": 14, "par": 4, "stroke_index": 4, "yards_black": 371, "yards_blue": 328, "yards_white": 291, "yards_red": 385},
    {"hole": 15, "par": 4, "stroke_index": 6, "yards_black": 279, "yards_blue": 263, "yards_white": 243, "yards_red": 306},
    {"hole": 16, "par": 4, "stroke_index": 1, "yards_black": 398, "yards_blue": 360, "yards_white": 336, "yards_red": 415},
    {"hole": 17, "par": 3, "stroke_index": 3, "yards_black": 164, "yards_blue": 138, "yards_white": 111, "yards_red": 197},
    {"hole": 18, "par": 5, "stroke_index": 5, "yards_black": 467, "yards_blue": 423, "yards_white": 420, "yards_red": 487}
  ]'::jsonb,
  '[
    {"name": "Black", "color": "black", "gender": "mens", "rating": null, "slope": null, "par": 72, "yards": 6070},
    {"name": "Blue", "color": "blue", "gender": "mens", "rating": null, "slope": null, "par": 72, "yards": 5587},
    {"name": "White", "color": "white", "gender": "mens", "rating": null, "slope": null, "par": 72, "yards": 5166},
    {"name": "Red", "color": "red", "gender": "ladies", "rating": null, "slope": null, "par": 72, "yards": 5630}
  ]'::jsonb
)
ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name,
  tees = EXCLUDED.tees,
  holes = EXCLUDED.holes,
  updated_at = NOW();

-- ============================================================================
-- 2. LINKS KENNEDY BAY GOLF CLUB (Port Kennedy)
-- ============================================================================
INSERT INTO venues (id, source, name, state, city, address, phone, website, total_holes)
VALUES (
  'f2a3b4c5-d6e7-8901-abcd-500000000947',
  'manual',
  'Links Kennedy Bay Golf Club',
  'WA',
  'Port Kennedy',
  'Port Kennedy Drive, Port Kennedy',
  NULL,
  'https://www.kennedybay.com.au',
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
  'f2a3b4c5-d6e7-8901-abcd-500000000947',
  'Links Kennedy Bay Golf Club',
  'Opened in 2000, this links-style course is consistently rated among Western Australia''s finest public access courses. Features dramatic coastal dunes and challenging seaside holes.',
  140,
  74.0,
  '[
    {"hole": 1, "par": 4, "stroke_index": 9, "yards_black": 366, "yards_blue": 345, "yards_white": 332, "yards_red": 303},
    {"hole": 2, "par": 4, "stroke_index": 7, "yards_black": 354, "yards_blue": 348, "yards_white": 329, "yards_red": 302},
    {"hole": 3, "par": 3, "stroke_index": 15, "yards_black": 162, "yards_blue": 157, "yards_white": 141, "yards_red": 111},
    {"hole": 4, "par": 5, "stroke_index": 11, "yards_black": 520, "yards_blue": 497, "yards_white": 471, "yards_red": 438},
    {"hole": 5, "par": 4, "stroke_index": 3, "yards_black": 419, "yards_blue": 412, "yards_white": 385, "yards_red": 357},
    {"hole": 6, "par": 3, "stroke_index": 5, "yards_black": 195, "yards_blue": 179, "yards_white": 175, "yards_red": 149},
    {"hole": 7, "par": 4, "stroke_index": 13, "yards_black": 285, "yards_blue": 278, "yards_white": 261, "yards_red": 239},
    {"hole": 8, "par": 5, "stroke_index": 17, "yards_black": 495, "yards_blue": 472, "yards_white": 448, "yards_red": 408},
    {"hole": 9, "par": 4, "stroke_index": 1, "yards_black": 407, "yards_blue": 400, "yards_white": 373, "yards_red": 335},
    {"hole": 10, "par": 4, "stroke_index": 6, "yards_black": 390, "yards_blue": 370, "yards_white": 366, "yards_red": 338},
    {"hole": 11, "par": 4, "stroke_index": 4, "yards_black": 405, "yards_blue": 392, "yards_white": 372, "yards_red": 341},
    {"hole": 12, "par": 4, "stroke_index": 18, "yards_black": 330, "yards_blue": 309, "yards_white": 294, "yards_red": 254},
    {"hole": 13, "par": 5, "stroke_index": 8, "yards_black": 508, "yards_blue": 493, "yards_white": 479, "yards_red": 443},
    {"hole": 14, "par": 3, "stroke_index": 16, "yards_black": 172, "yards_blue": 154, "yards_white": 144, "yards_red": 115},
    {"hole": 15, "par": 4, "stroke_index": 12, "yards_black": 382, "yards_blue": 362, "yards_white": 345, "yards_red": 314},
    {"hole": 16, "par": 3, "stroke_index": 14, "yards_black": 138, "yards_blue": 125, "yards_white": 120, "yards_red": 106},
    {"hole": 17, "par": 5, "stroke_index": 10, "yards_black": 498, "yards_blue": 481, "yards_white": 453, "yards_red": 410},
    {"hole": 18, "par": 4, "stroke_index": 2, "yards_black": 394, "yards_blue": 370, "yards_white": 363, "yards_red": 335}
  ]'::jsonb,
  '[
    {"name": "Black", "color": "black", "gender": "mens", "rating": 76.0, "slope": 145, "par": 72, "yards": 6420},
    {"name": "Blue", "color": "blue", "gender": "mens", "rating": 74.0, "slope": 140, "par": 72, "yards": 6144},
    {"name": "White", "color": "white", "gender": "mens", "rating": 72.0, "slope": 135, "par": 72, "yards": 5851},
    {"name": "Red", "color": "red", "gender": "ladies", "rating": 73.0, "slope": 135, "par": 72, "yards": 5298}
  ]'::jsonb
)
ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name,
  tees = EXCLUDED.tees,
  holes = EXCLUDED.holes,
  updated_at = NOW();

-- ============================================================================
-- 3. MOUNT LAWLEY GOLF CLUB (Inglewood)
-- ============================================================================
INSERT INTO venues (id, source, name, state, city, address, phone, website, total_holes)
VALUES (
  'f2a3b4c5-d6e7-8901-abcd-500000000948',
  'manual',
  'Mount Lawley Golf Club',
  'WA',
  'Inglewood',
  'Walter Road, Inglewood',
  NULL,
  'https://www.mountlawleygc.com.au',
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
  'f2a3b4c5-d6e7-8901-abcd-500000000948',
  'Mount Lawley Golf Club',
  'Classic Perth parkland course established in 1928. One of Western Australia''s most prestigious private clubs with a rich tournament history.',
  73,
  72.0,
  '[
    {"hole": 1, "par": 4, "stroke_index": 5, "yards_black": 369, "yards_blue": 363, "yards_red": 324},
    {"hole": 2, "par": 4, "stroke_index": 4, "yards_black": 383, "yards_blue": 372, "yards_red": 377},
    {"hole": 3, "par": 5, "stroke_index": 14, "yards_black": 482, "yards_blue": 474, "yards_red": 431},
    {"hole": 4, "par": 4, "stroke_index": 2, "yards_black": 407, "yards_blue": 397, "yards_red": 332},
    {"hole": 5, "par": 4, "stroke_index": 11, "yards_black": 355, "yards_blue": 346, "yards_red": 334},
    {"hole": 6, "par": 3, "stroke_index": 15, "yards_black": 143, "yards_blue": 133, "yards_red": 122},
    {"hole": 7, "par": 4, "stroke_index": 12, "yards_black": 360, "yards_blue": 350, "yards_red": 343},
    {"hole": 8, "par": 3, "stroke_index": 7, "yards_black": 198, "yards_blue": 188, "yards_red": 145},
    {"hole": 9, "par": 5, "stroke_index": 9, "yards_black": 500, "yards_blue": 489, "yards_red": 433},
    {"hole": 10, "par": 4, "stroke_index": 13, "yards_black": 313, "yards_blue": 303, "yards_red": 301},
    {"hole": 11, "par": 4, "stroke_index": 1, "yards_black": 409, "yards_blue": 398, "yards_red": 395},
    {"hole": 12, "par": 4, "stroke_index": 3, "yards_black": 382, "yards_blue": 371, "yards_red": 324},
    {"hole": 13, "par": 3, "stroke_index": 18, "yards_black": 132, "yards_blue": 122, "yards_red": 102},
    {"hole": 14, "par": 5, "stroke_index": 6, "yards_black": 506, "yards_blue": 496, "yards_red": 451},
    {"hole": 15, "par": 3, "stroke_index": 8, "yards_black": 178, "yards_blue": 172, "yards_red": 156},
    {"hole": 16, "par": 4, "stroke_index": 16, "yards_black": 275, "yards_blue": 265, "yards_red": 238},
    {"hole": 17, "par": 5, "stroke_index": 17, "yards_black": 480, "yards_blue": 472, "yards_red": 415},
    {"hole": 18, "par": 4, "stroke_index": 10, "yards_black": 341, "yards_blue": 331, "yards_red": 297}
  ]'::jsonb,
  '[
    {"name": "Championship", "color": "black", "gender": "mens", "rating": 72.0, "slope": 73, "par": 72, "yards": 6213},
    {"name": "Mens", "color": "blue", "gender": "mens", "rating": 72.0, "slope": 72, "par": 72, "yards": 6042},
    {"name": "Ladies", "color": "red", "gender": "ladies", "rating": 74.0, "slope": null, "par": 72, "yards": 5520}
  ]'::jsonb
)
ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name,
  tees = EXCLUDED.tees,
  holes = EXCLUDED.holes,
  updated_at = NOW();

-- ============================================================================
-- 4. WESTERN AUSTRALIAN GOLF CLUB (Yokine)
-- ============================================================================
INSERT INTO venues (id, source, name, state, city, address, phone, website, total_holes)
VALUES (
  'f2a3b4c5-d6e7-8901-abcd-500000000949',
  'manual',
  'Western Australian Golf Club',
  'WA',
  'Yokine',
  'Hayes Avenue, Yokine',
  '+61 8 9349 1113',
  'https://www.wagolfclub.com.au',
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
  'f2a3b4c5-d6e7-8901-abcd-500000000949',
  'Western Australian Golf Club',
  'Historic Perth parkland course established in 1928. One of WA''s leading private clubs featuring classic design and excellent conditioning.',
  113,
  70.0,
  '[
    {"hole": 1, "par": 3, "stroke_index": 3, "stroke_index_red": 18, "yards_white": 210, "yards_red": 206},
    {"hole": 2, "par": 4, "stroke_index": 1, "stroke_index_red": 1, "yards_white": 401, "yards_red": 350},
    {"hole": 3, "par": 4, "stroke_index": 6, "stroke_index_red": 5, "yards_white": 344, "yards_red": 297},
    {"hole": 4, "par": 4, "stroke_index": 11, "stroke_index_red": 6, "yards_white": 317, "yards_red": 305},
    {"hole": 5, "par": 3, "stroke_index": 16, "stroke_index_red": 14, "yards_white": 144, "yards_red": 130},
    {"hole": 6, "par": 5, "stroke_index": 14, "stroke_index_red": 8, "yards_white": 493, "yards_red": 440},
    {"hole": 7, "par": 4, "stroke_index": 5, "stroke_index_red": 3, "yards_white": 413, "yards_red": 330},
    {"hole": 8, "par": 5, "stroke_index": 15, "stroke_index_red": 11, "yards_white": 462, "yards_red": 420},
    {"hole": 9, "par": 3, "stroke_index": 9, "stroke_index_red": 16, "yards_white": 176, "yards_red": 110},
    {"hole": 10, "par": 4, "stroke_index": 8, "stroke_index_red": 2, "yards_white": 324, "yards_red": 295},
    {"hole": 11, "par": 3, "stroke_index": 7, "stroke_index_red": 7, "yards_white": 170, "yards_red": 151},
    {"hole": 12, "par": 4, "stroke_index": 18, "stroke_index_red": 15, "yards_white": 288, "yards_red": 283},
    {"hole": 13, "par": 4, "stroke_index": 2, "stroke_index_red": 12, "yards_white": 378, "yards_red": 375},
    {"hole": 14, "par": 4, "stroke_index": 17, "stroke_index_red": 10, "yards_white": 311, "yards_red": 297},
    {"hole": 15, "par": 4, "stroke_index": 13, "stroke_index_red": 4, "yards_white": 321, "yards_red": 292},
    {"hole": 16, "par": 3, "stroke_index": 10, "stroke_index_red": 17, "yards_white": 157, "yards_red": 101},
    {"hole": 17, "par": 4, "stroke_index": 4, "stroke_index_red": 13, "yards_white": 438, "yards_red": 433},
    {"hole": 18, "par": 5, "stroke_index": 12, "stroke_index_red": 9, "yards_white": 453, "yards_red": 391}
  ]'::jsonb,
  '[
    {"name": "White", "color": "white", "gender": "mens", "rating": 70.0, "slope": 113, "par": 70, "yards": 5800},
    {"name": "Ladies", "color": "red", "gender": "ladies", "rating": 73.0, "slope": 113, "par": 73, "yards": 5206}
  ]'::jsonb
)
ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name,
  tees = EXCLUDED.tees,
  holes = EXCLUDED.holes,
  updated_at = NOW();

-- ============================================================================
-- 5. THE CUT GOLF COURSE (Dawesville/Mandurah)
-- ============================================================================
INSERT INTO venues (id, source, name, state, city, address, phone, website, total_holes)
VALUES (
  'f2a3b4c5-d6e7-8901-abcd-500000000950',
  'manual',
  'The Cut Golf Course',
  'WA',
  'Dawesville',
  'Country Club Drive, Dawesville',
  NULL,
  'https://www.thecutgolfcourse.com.au',
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
  'f2a3b4c5-d6e7-8901-abcd-500000000950',
  'The Cut Golf Course',
  'Opened in 2005, this links-style championship course is consistently ranked among Australia''s top public access courses. Features spectacular ocean views and challenging coastal conditions south of Perth near Mandurah.',
  127,
  73.0,
  '[
    {"hole": 1, "par": 4, "stroke_index": 4, "stroke_index_red": 3, "yards_black": 356, "yards_blue": 344, "yards_white": 325, "yards_red": 300},
    {"hole": 2, "par": 4, "stroke_index": 10, "stroke_index_red": 13, "yards_black": 352, "yards_blue": 325, "yards_white": 306, "yards_red": 263},
    {"hole": 3, "par": 4, "stroke_index": 18, "stroke_index_red": 17, "yards_black": 298, "yards_blue": 291, "yards_white": 280, "yards_red": 233},
    {"hole": 4, "par": 3, "stroke_index": 16, "stroke_index_red": 15, "yards_black": 179, "yards_blue": 156, "yards_white": 143, "yards_red": 130},
    {"hole": 5, "par": 5, "stroke_index": 14, "stroke_index_red": 5, "yards_black": 508, "yards_blue": 480, "yards_white": 465, "yards_red": 431},
    {"hole": 6, "par": 4, "stroke_index": 12, "stroke_index_red": 11, "yards_black": 327, "yards_blue": 314, "yards_white": 300, "yards_red": 288},
    {"hole": 7, "par": 4, "stroke_index": 6, "stroke_index_red": 9, "yards_black": 353, "yards_blue": 339, "yards_white": 302, "yards_red": 278},
    {"hole": 8, "par": 4, "stroke_index": 2, "stroke_index_red": 1, "yards_black": 438, "yards_blue": 421, "yards_white": 394, "yards_red": 346},
    {"hole": 9, "par": 4, "stroke_index": 8, "stroke_index_red": 7, "yards_black": 388, "yards_blue": 370, "yards_white": 348, "yards_red": 314},
    {"hole": 10, "par": 4, "stroke_index": 5, "stroke_index_red": 6, "yards_black": 419, "yards_blue": 394, "yards_white": 375, "yards_red": 353},
    {"hole": 11, "par": 4, "stroke_index": 11, "stroke_index_red": 14, "yards_black": 317, "yards_blue": 296, "yards_white": 273, "yards_red": 255},
    {"hole": 12, "par": 4, "stroke_index": 3, "stroke_index_red": 8, "yards_black": 400, "yards_blue": 381, "yards_white": 367, "yards_red": 314},
    {"hole": 13, "par": 3, "stroke_index": 9, "stroke_index_red": 12, "yards_black": 194, "yards_blue": 177, "yards_white": 163, "yards_red": 148},
    {"hole": 14, "par": 4, "stroke_index": 1, "stroke_index_red": 4, "yards_black": 412, "yards_blue": 390, "yards_white": 353, "yards_red": 332},
    {"hole": 15, "par": 5, "stroke_index": 17, "stroke_index_red": 10, "yards_black": 475, "yards_blue": 472, "yards_white": 447, "yards_red": 429},
    {"hole": 16, "par": 3, "stroke_index": 13, "stroke_index_red": 18, "yards_black": 134, "yards_blue": 130, "yards_white": 114, "yards_red": 98},
    {"hole": 17, "par": 4, "stroke_index": 15, "stroke_index_red": 16, "yards_black": 293, "yards_blue": 281, "yards_white": 274, "yards_red": 225},
    {"hole": 18, "par": 5, "stroke_index": 7, "stroke_index_red": 2, "yards_black": 552, "yards_blue": 516, "yards_white": 497, "yards_red": 472}
  ]'::jsonb,
  '[
    {"name": "Black", "color": "black", "gender": "mens", "rating": 75.0, "slope": null, "par": 72, "yards": 6395},
    {"name": "Blue", "color": "blue", "gender": "mens", "rating": 73.0, "slope": 127, "par": 72, "yards": 6077},
    {"name": "White", "color": "white", "gender": "mens", "rating": 71.0, "slope": 125, "par": 72, "yards": 5726},
    {"name": "Red", "color": "red", "gender": "ladies", "rating": 74.0, "slope": null, "par": 72, "yards": 5209}
  ]'::jsonb
)
ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name,
  tees = EXCLUDED.tees,
  holes = EXCLUDED.holes,
  updated_at = NOW();
