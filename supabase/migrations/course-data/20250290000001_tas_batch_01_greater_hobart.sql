-- TAS Batch 1: Greater Hobart
-- 7 courses with full hole-by-hole data (18 holes each)
-- Source: golfify.io
-- Generated: 2025-12-11

-- ============================================================================
-- 1. ROYAL HOBART GOLF CLUB
-- ============================================================================
INSERT INTO venues (id, source, name, state, city, address, phone, website, total_holes)
VALUES (
  'f2a3b4c5-d6e7-8901-abcd-500000000900',
  'manual',
  'Royal Hobart Golf Club',
  'TAS',
  'Seven Mile Beach',
  '20 Regal Court',
  NULL,
  'https://www.royalhobartgolf.com.au',
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
  'f2a3b4c5-d6e7-8901-abcd-500000000900',
  'Royal Hobart Golf Club',
  'Tasmania',
  133,
  74.0,
  '[
    {"hole": 1, "par": 4, "stroke_index": 1, "par_red": 5, "stroke_index_red": 16, "yards_blue": 402, "yards_red": 391},
    {"hole": 2, "par": 4, "stroke_index": 8, "par_red": 4, "stroke_index_red": 6, "yards_blue": 331, "yards_red": 281},
    {"hole": 3, "par": 4, "stroke_index": 3, "par_red": 4, "stroke_index_red": 2, "yards_blue": 409, "yards_red": 329},
    {"hole": 4, "par": 3, "stroke_index": 10, "par_red": 3, "stroke_index_red": 18, "yards_blue": 154, "yards_red": 127},
    {"hole": 5, "par": 4, "stroke_index": 12, "par_red": 4, "stroke_index_red": 12, "yards_blue": 315, "yards_red": 256},
    {"hole": 6, "par": 5, "stroke_index": 17, "par_red": 5, "stroke_index_red": 8, "yards_blue": 436, "yards_red": 405},
    {"hole": 7, "par": 4, "stroke_index": 15, "par_red": 4, "stroke_index_red": 14, "yards_blue": 309, "yards_red": 297},
    {"hole": 8, "par": 3, "stroke_index": 5, "par_red": 3, "stroke_index_red": 10, "yards_blue": 173, "yards_red": 156},
    {"hole": 9, "par": 5, "stroke_index": 13, "par_red": 5, "stroke_index_red": 4, "yards_blue": 491, "yards_red": 429},
    {"hole": 10, "par": 4, "stroke_index": 6, "par_red": 4, "stroke_index_red": 3, "yards_blue": 384, "yards_red": 320},
    {"hole": 11, "par": 3, "stroke_index": 16, "par_red": 3, "stroke_index_red": 17, "yards_blue": 127, "yards_red": 112},
    {"hole": 12, "par": 5, "stroke_index": 18, "par_red": 5, "stroke_index_red": 11, "yards_blue": 445, "yards_red": 409},
    {"hole": 13, "par": 5, "stroke_index": 9, "par_red": 5, "stroke_index_red": 5, "yards_blue": 512, "yards_red": 426},
    {"hole": 14, "par": 4, "stroke_index": 2, "par_red": 4, "stroke_index_red": 1, "yards_blue": 393, "yards_red": 335},
    {"hole": 15, "par": 3, "stroke_index": 4, "par_red": 3, "stroke_index_red": 9, "yards_blue": 200, "yards_red": 182},
    {"hole": 16, "par": 4, "stroke_index": 7, "par_red": 4, "stroke_index_red": 7, "yards_blue": 362, "yards_red": 323},
    {"hole": 17, "par": 4, "stroke_index": 14, "par_red": 4, "stroke_index_red": 13, "yards_blue": 329, "yards_red": 227},
    {"hole": 18, "par": 4, "stroke_index": 11, "par_red": 4, "stroke_index_red": 15, "yards_blue": 359, "yards_red": 303}
  ]'::jsonb,
  '[
    {"name": "Blue", "color": "blue", "rating": 74.0, "slope": 133, "par": 72, "yards": 6131},
    {"name": "Red", "color": "red", "rating": 75.0, "slope": 126, "par": 73, "yards": 5308}
  ]'::jsonb
)
ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name,
  tees = EXCLUDED.tees,
  holes = EXCLUDED.holes,
  updated_at = NOW();

-- ============================================================================
-- 2. TASMANIA GOLF CLUB
-- ============================================================================
INSERT INTO venues (id, source, name, state, city, address, phone, website, total_holes)
VALUES (
  'f2a3b4c5-d6e7-8901-abcd-500000000901',
  'manual',
  'Tasmania Golf Club',
  'TAS',
  'Barilla Bay',
  'Tasman Highway',
  NULL,
  'https://www.tasmaniagolfclub.com.au',
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
  'f2a3b4c5-d6e7-8901-abcd-500000000901',
  'Tasmania Golf Club',
  'Top 100 Australian course opened in 1971. Championship parkland layout overlooking Barilla Bay.',
  129,
  73.0,
  '[
    {"hole": 1, "par": 4, "stroke_index": 18, "stroke_index_red": 16, "yards_blue": 292, "yards_red": 272},
    {"hole": 2, "par": 4, "stroke_index": 13, "par_red": 3, "stroke_index_red": 9, "yards_blue": 318, "yards_red": 300},
    {"hole": 3, "par": 5, "stroke_index": 12, "stroke_index_red": 4, "yards_blue": 526, "yards_red": 480},
    {"hole": 4, "par": 4, "stroke_index": 5, "stroke_index_red": 1, "yards_blue": 381, "yards_red": 352},
    {"hole": 5, "par": 3, "stroke_index": 4, "par_red": 5, "stroke_index_red": 17, "yards_blue": 195, "yards_red": 125},
    {"hole": 6, "par": 4, "stroke_index": 11, "stroke_index_red": 7, "yards_blue": 340, "yards_red": 318},
    {"hole": 7, "par": 4, "stroke_index": 10, "stroke_index_red": 6, "yards_blue": 370, "yards_red": 330},
    {"hole": 8, "par": 3, "stroke_index": 8, "par_red": 5, "stroke_index_red": 15, "yards_blue": 157, "yards_red": 111},
    {"hole": 9, "par": 4, "stroke_index": 1, "par_red": 3, "stroke_index_red": 12, "yards_blue": 423, "yards_red": 407},
    {"hole": 10, "par": 4, "stroke_index": 3, "stroke_index_red": 3, "yards_blue": 392, "yards_red": 350},
    {"hole": 11, "par": 3, "stroke_index": 16, "par_red": 4, "stroke_index_red": 18, "yards_blue": 121, "yards_red": 98},
    {"hole": 12, "par": 5, "stroke_index": 14, "stroke_index_red": 13, "yards_blue": 475, "yards_red": 409},
    {"hole": 13, "par": 4, "stroke_index": 2, "stroke_index_red": 14, "yards_blue": 383, "yards_red": 366},
    {"hole": 14, "par": 5, "stroke_index": 17, "par_red": 3, "stroke_index_red": 11, "yards_blue": 462, "yards_red": 424},
    {"hole": 15, "par": 4, "stroke_index": 15, "stroke_index_red": 10, "yards_blue": 296, "yards_red": 278},
    {"hole": 16, "par": 5, "stroke_index": 6, "par_red": 4, "stroke_index_red": 5, "yards_blue": 549, "yards_red": 454},
    {"hole": 17, "par": 3, "stroke_index": 7, "stroke_index_red": 2, "yards_blue": 355, "yards_red": 309},
    {"hole": 18, "par": 5, "stroke_index": 9, "par_red": 4, "stroke_index_red": 8, "yards_blue": 165, "yards_red": 149}
  ]'::jsonb,
  '[
    {"name": "Back", "color": "blue", "rating": 73.0, "slope": 129, "par": 73, "yards": 6200},
    {"name": "Forward", "color": "red", "rating": 75.0, "slope": 130, "par": 73, "yards": 5532}
  ]'::jsonb
)
ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name,
  tees = EXCLUDED.tees,
  holes = EXCLUDED.holes,
  updated_at = NOW();

-- ============================================================================
-- 3. KINGSTON BEACH GOLF CLUB
-- ============================================================================
INSERT INTO venues (id, source, name, state, city, address, phone, website, total_holes)
VALUES (
  'f2a3b4c5-d6e7-8901-abcd-500000000902',
  'manual',
  'Kingston Beach Golf Club',
  'TAS',
  'Kingston',
  '1 Channel Highway',
  NULL,
  'https://www.kingstonbeachgolf.com.au',
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
  'f2a3b4c5-d6e7-8901-abcd-500000000902',
  'Kingston Beach Golf Club',
  'Links-style coastal course established in 1922. Scenic layout with ocean views south of Hobart.',
  127,
  71.0,
  '[
    {"hole": 1, "par": 3, "stroke_index": 14, "stroke_index_yellow": 15, "yards_blue": 162, "yards_yellow": 161},
    {"hole": 2, "par": 4, "stroke_index": 16, "stroke_index_yellow": 14, "yards_blue": 311, "yards_yellow": 300},
    {"hole": 3, "par": 4, "stroke_index": 6, "stroke_index_yellow": 2, "yards_blue": 340, "yards_yellow": 332},
    {"hole": 4, "par": 4, "stroke_index": 13, "stroke_index_yellow": 9, "yards_blue": 322, "yards_yellow": 314},
    {"hole": 5, "par": 4, "stroke_index": 2, "stroke_index_yellow": 6, "yards_blue": 393, "yards_yellow": 385},
    {"hole": 6, "par": 5, "stroke_index": 10, "stroke_index_yellow": 7, "yards_blue": 488, "yards_yellow": 485},
    {"hole": 7, "par": 3, "stroke_index": 18, "stroke_index_yellow": 18, "yards_blue": 120, "yards_yellow": 119},
    {"hole": 8, "par": 3, "stroke_index": 4, "stroke_index_yellow": 11, "yards_blue": 207, "yards_yellow": 203},
    {"hole": 9, "par": 5, "stroke_index": 8, "stroke_index_yellow": 4, "yards_blue": 470, "yards_yellow": 460},
    {"hole": 10, "par": 4, "stroke_index": 11, "stroke_index_yellow": 13, "yards_blue": 336, "yards_yellow": 330},
    {"hole": 11, "par": 5, "stroke_index": 12, "stroke_index_yellow": 8, "yards_blue": 479, "yards_yellow": 470},
    {"hole": 12, "par": 4, "stroke_index": 9, "stroke_index_yellow": 3, "yards_blue": 309, "yards_yellow": 302},
    {"hole": 13, "par": 4, "stroke_index": 1, "stroke_index_yellow": 1, "yards_blue": 388, "yards_yellow": 378},
    {"hole": 14, "par": 4, "stroke_index": 3, "stroke_index_yellow": 12, "yards_blue": 374, "yards_yellow": 368},
    {"hole": 15, "par": 4, "stroke_index": 5, "stroke_index_yellow": 5, "yards_blue": 353, "yards_yellow": 343},
    {"hole": 16, "par": 3, "stroke_index": 7, "stroke_index_yellow": 16, "yards_blue": 153, "yards_yellow": 152},
    {"hole": 17, "par": 5, "stroke_index": 17, "stroke_index_yellow": 10, "yards_blue": 471, "yards_yellow": 461},
    {"hole": 18, "par": 3, "stroke_index": 15, "stroke_index_yellow": 17, "yards_blue": 127, "yards_yellow": 126}
  ]'::jsonb,
  '[
    {"name": "Blue", "color": "blue", "rating": 71.0, "slope": 127, "par": 71, "yards": 5803},
    {"name": "Yellow", "color": "yellow", "rating": 73.0, "slope": 124, "par": 71, "yards": 5689}
  ]'::jsonb
)
ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name,
  tees = EXCLUDED.tees,
  holes = EXCLUDED.holes,
  updated_at = NOW();

-- ============================================================================
-- 4. CLAREMONT GOLF CLUB
-- ============================================================================
INSERT INTO venues (id, source, name, state, city, address, phone, website, total_holes)
VALUES (
  'f2a3b4c5-d6e7-8901-abcd-500000000903',
  'manual',
  'Claremont Golf Club',
  'TAS',
  'Claremont',
  '1 Bournville Crescent',
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
  'f2a3b4c5-d6e7-8901-abcd-500000000903',
  'Claremont Golf Club',
  'Parkland course in northern Hobart established in 1973. Open guest policy.',
  NULL,
  NULL,
  '[
    {"hole": 1, "par": 5, "stroke_index": 18, "par_red": 5, "stroke_index_red": 7, "yards_blue": 448, "yards_red": 438},
    {"hole": 2, "par": 3, "stroke_index": 9, "par_red": 3, "stroke_index_red": 14, "yards_blue": 174, "yards_red": 147},
    {"hole": 3, "par": 5, "stroke_index": 15, "par_red": 5, "stroke_index_red": 12, "yards_blue": 457, "yards_red": 396},
    {"hole": 4, "par": 3, "stroke_index": 7, "par_red": 3, "stroke_index_red": 16, "yards_blue": 135, "yards_red": 115},
    {"hole": 5, "par": 4, "stroke_index": 1, "par_red": 5, "stroke_index_red": 9, "yards_blue": 410, "yards_red": 398},
    {"hole": 6, "par": 3, "stroke_index": 12, "par_red": 3, "stroke_index_red": 15, "yards_blue": 132, "yards_red": 117},
    {"hole": 7, "par": 4, "stroke_index": 3, "par_red": 5, "stroke_index_red": 8, "yards_blue": 413, "yards_red": 410},
    {"hole": 8, "par": 5, "stroke_index": 4, "par_red": 5, "stroke_index_red": 6, "yards_blue": 479, "yards_red": 404},
    {"hole": 9, "par": 4, "stroke_index": 14, "par_red": 4, "stroke_index_red": 17, "yards_blue": 326, "yards_red": 257},
    {"hole": 10, "par": 4, "stroke_index": 10, "par_red": 4, "stroke_index_red": 10, "yards_blue": 260, "yards_red": 258},
    {"hole": 11, "par": 3, "stroke_index": 17, "par_red": 3, "stroke_index_red": 18, "yards_blue": 119, "yards_red": 112},
    {"hole": 12, "par": 4, "stroke_index": 8, "par_red": 4, "stroke_index_red": 5, "yards_blue": 324, "yards_red": 300},
    {"hole": 13, "par": 4, "stroke_index": 5, "par_red": 4, "stroke_index_red": 2, "yards_blue": 322, "yards_red": 301},
    {"hole": 14, "par": 4, "stroke_index": 6, "par_red": 4, "stroke_index_red": 4, "yards_blue": 359, "yards_red": 340},
    {"hole": 15, "par": 3, "stroke_index": 11, "par_red": 3, "stroke_index_red": 13, "yards_blue": 174, "yards_red": 166},
    {"hole": 16, "par": 4, "stroke_index": 2, "par_red": 4, "stroke_index_red": 1, "yards_blue": 369, "yards_red": 358},
    {"hole": 17, "par": 5, "stroke_index": 13, "par_red": 5, "stroke_index_red": 3, "yards_blue": 447, "yards_red": 436},
    {"hole": 18, "par": 4, "stroke_index": 16, "par_red": 4, "stroke_index_red": 11, "yards_blue": 318, "yards_red": 305}
  ]'::jsonb,
  '[
    {"name": "Men", "color": "blue", "rating": null, "slope": null, "par": 71, "yards": 5666},
    {"name": "Women", "color": "red", "rating": null, "slope": null, "par": 73, "yards": 5258}
  ]'::jsonb
)
ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name,
  tees = EXCLUDED.tees,
  holes = EXCLUDED.holes,
  updated_at = NOW();

-- ============================================================================
-- 5. LLANHERNE GOLF CLUB
-- ============================================================================
INSERT INTO venues (id, source, name, state, city, address, phone, website, total_holes)
VALUES (
  'f2a3b4c5-d6e7-8901-abcd-500000000904',
  'manual',
  'Llanherne Golf Club',
  'TAS',
  'Seven Mile Beach',
  '132 Surf Road',
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
  'f2a3b4c5-d6e7-8901-abcd-500000000904',
  'Llanherne Golf Club',
  'Parkland course near Hobart Airport opened in 1994. Convenient location with open guest policy.',
  128,
  70.0,
  '[
    {"hole": 1, "par": 4, "stroke_index": 7, "yards_blue": 344, "yards_yellow": 329, "yards_red": 275},
    {"hole": 2, "par": 3, "stroke_index": 10, "yards_blue": 170, "yards_yellow": 154, "yards_red": 136},
    {"hole": 3, "par": 4, "stroke_index": 1, "yards_blue": 368, "yards_yellow": 362, "yards_red": 290},
    {"hole": 4, "par": 3, "stroke_index": 18, "yards_blue": 145, "yards_yellow": 134, "yards_red": 129},
    {"hole": 5, "par": 5, "stroke_index": 5, "yards_blue": 510, "yards_yellow": 496, "yards_red": 429},
    {"hole": 6, "par": 4, "stroke_index": 3, "yards_blue": 369, "yards_yellow": 365, "yards_red": 300},
    {"hole": 7, "par": 4, "stroke_index": 15, "yards_blue": 293, "yards_yellow": 284, "yards_red": 219},
    {"hole": 8, "par": 4, "stroke_index": 13, "yards_blue": 336, "yards_yellow": 327, "yards_red": 314},
    {"hole": 9, "par": 5, "stroke_index": 12, "yards_blue": 473, "yards_yellow": 464, "yards_red": 446},
    {"hole": 10, "par": 4, "stroke_index": 9, "yards_blue": 337, "yards_yellow": 329, "yards_red": 315},
    {"hole": 11, "par": 3, "stroke_index": 17, "yards_blue": 152, "yards_yellow": 149, "yards_red": 144},
    {"hole": 12, "par": 4, "stroke_index": 6, "yards_blue": 341, "yards_yellow": 335, "yards_red": 296},
    {"hole": 13, "par": 3, "stroke_index": 16, "yards_blue": 142, "yards_yellow": 137, "yards_red": 138},
    {"hole": 14, "par": 5, "stroke_index": 4, "yards_blue": 495, "yards_yellow": 465, "yards_red": 445},
    {"hole": 15, "par": 4, "stroke_index": 8, "yards_blue": 342, "yards_yellow": 334, "yards_red": 309},
    {"hole": 16, "par": 4, "stroke_index": 14, "yards_blue": 293, "yards_yellow": 288, "yards_red": 245},
    {"hole": 17, "par": 4, "stroke_index": 2, "yards_blue": 384, "yards_yellow": 376, "yards_red": 349},
    {"hole": 18, "par": 5, "stroke_index": 11, "yards_blue": 454, "yards_yellow": 440, "yards_red": 395}
  ]'::jsonb,
  '[
    {"name": "Blue", "color": "blue", "rating": null, "slope": null, "par": 72, "yards": 5948},
    {"name": "Yellow", "color": "yellow", "rating": 70.0, "slope": 128, "par": 72, "yards": 5768},
    {"name": "Red", "color": "red", "rating": 73.0, "slope": 124, "par": 72, "yards": 5174}
  ]'::jsonb
)
ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name,
  tees = EXCLUDED.tees,
  holes = EXCLUDED.holes,
  updated_at = NOW();

-- ============================================================================
-- 6. NORTH WEST BAY GOLF CLUB
-- ============================================================================
INSERT INTO venues (id, source, name, state, city, address, phone, website, total_holes)
VALUES (
  'f2a3b4c5-d6e7-8901-abcd-500000000905',
  'manual',
  'North West Bay Golf Club',
  'TAS',
  'Margate',
  'Channel Highway',
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
  'f2a3b4c5-d6e7-8901-abcd-500000000905',
  'North West Bay Golf Club',
  'Parkland course in the Channel region designed by A. Toogood. Opened in 1965 with scenic bay views.',
  NULL,
  NULL,
  '[
    {"hole": 1, "par": 4, "stroke_index": 15, "par_red": 4, "stroke_index_red": 16, "yards_white": 295, "yards_red": 293},
    {"hole": 2, "par": 4, "stroke_index": 5, "par_red": 4, "stroke_index_red": 4, "yards_white": 393, "yards_red": 390},
    {"hole": 3, "par": 4, "stroke_index": 9, "par_red": 4, "stroke_index_red": 8, "yards_white": 288, "yards_red": 276},
    {"hole": 4, "par": 4, "stroke_index": 3, "par_red": 5, "stroke_index_red": 14, "yards_white": 417, "yards_red": 405},
    {"hole": 5, "par": 4, "stroke_index": 14, "par_red": 4, "stroke_index_red": 10, "yards_white": 323, "yards_red": 322},
    {"hole": 6, "par": 4, "stroke_index": 1, "par_red": 4, "stroke_index_red": 2, "yards_white": 402, "yards_red": 341},
    {"hole": 7, "par": 3, "stroke_index": 13, "par_red": 3, "stroke_index_red": 18, "yards_white": 153, "yards_red": 137},
    {"hole": 8, "par": 5, "stroke_index": 11, "par_red": 5, "stroke_index_red": 6, "yards_white": 453, "yards_red": 386},
    {"hole": 9, "par": 4, "stroke_index": 17, "par_red": 3, "stroke_index_red": 12, "yards_white": 265, "yards_red": 160},
    {"hole": 10, "par": 3, "stroke_index": 2, "par_red": 3, "stroke_index_red": 17, "yards_white": 218, "yards_red": 140},
    {"hole": 11, "par": 4, "stroke_index": 4, "par_red": 4, "stroke_index_red": 5, "yards_white": 429, "yards_red": 358},
    {"hole": 12, "par": 4, "stroke_index": 6, "par_red": 4, "stroke_index_red": 9, "yards_white": 408, "yards_red": 339},
    {"hole": 13, "par": 4, "stroke_index": 12, "par_red": 4, "stroke_index_red": 3, "yards_white": 330, "yards_red": 320},
    {"hole": 14, "par": 3, "stroke_index": 8, "par_red": 3, "stroke_index_red": 11, "yards_white": 174, "yards_red": 154},
    {"hole": 15, "par": 5, "stroke_index": 7, "par_red": 5, "stroke_index_red": 7, "yards_white": 520, "yards_red": 402},
    {"hole": 16, "par": 4, "stroke_index": 10, "par_red": 4, "stroke_index_red": 15, "yards_white": 334, "yards_red": 237},
    {"hole": 17, "par": 4, "stroke_index": 18, "par_red": 4, "stroke_index_red": 13, "yards_white": 282, "yards_red": 278},
    {"hole": 18, "par": 5, "stroke_index": 16, "par_red": 5, "stroke_index_red": 1, "yards_white": 436, "yards_red": 374}
  ]'::jsonb,
  '[
    {"name": "White", "color": "white", "rating": null, "slope": null, "par": 72, "yards": 6120},
    {"name": "Red", "color": "red", "rating": null, "slope": null, "par": 72, "yards": 5312}
  ]'::jsonb
)
ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name,
  tees = EXCLUDED.tees,
  holes = EXCLUDED.holes,
  updated_at = NOW();

-- ============================================================================
-- 7. RATHO FARM GOLF LINKS
-- ============================================================================
INSERT INTO venues (id, source, name, state, city, address, phone, website, total_holes)
VALUES (
  'f2a3b4c5-d6e7-8901-abcd-500000000906',
  'manual',
  'Ratho Farm Golf Links',
  'TAS',
  'Bothwell',
  'Highland Lakes Road',
  NULL,
  'https://www.rathofarm.com',
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
  'f2a3b4c5-d6e7-8901-abcd-500000000906',
  'Ratho Farm Golf Links',
  'Oldest golf course in the Southern Hemisphere, established 1822. Historic links course with open guest policy.',
  NULL,
  NULL,
  '[
    {"hole": 1, "par": 3, "stroke_index": 9, "par_red": 3, "stroke_index_red": 18, "yards_white": 148, "yards_red": 110},
    {"hole": 2, "par": 3, "stroke_index": 12, "par_red": 3, "stroke_index_red": 15, "yards_white": 139, "yards_red": 137},
    {"hole": 3, "par": 5, "stroke_index": 4, "par_red": 5, "stroke_index_red": 1, "yards_white": 497, "yards_red": 435},
    {"hole": 4, "par": 3, "stroke_index": 3, "par_red": 4, "stroke_index_red": 6, "yards_white": 177, "yards_red": 177},
    {"hole": 5, "par": 4, "stroke_index": 8, "par_red": 4, "stroke_index_red": 8, "yards_white": 330, "yards_red": 243},
    {"hole": 6, "par": 4, "stroke_index": 13, "par_red": 4, "stroke_index_red": 11, "yards_white": 272, "yards_red": 208},
    {"hole": 7, "par": 3, "stroke_index": 17, "par_red": 3, "stroke_index_red": 17, "yards_white": 130, "yards_red": 130},
    {"hole": 8, "par": 3, "stroke_index": 1, "par_red": 3, "stroke_index_red": 5, "yards_white": 198, "yards_red": 174},
    {"hole": 9, "par": 4, "stroke_index": 18, "par_red": 4, "stroke_index_red": 13, "yards_white": 276, "yards_red": 233},
    {"hole": 10, "par": 4, "stroke_index": 2, "par_red": 5, "stroke_index_red": 2, "yards_white": 374, "yards_red": 368},
    {"hole": 11, "par": 4, "stroke_index": 7, "par_red": 4, "stroke_index_red": 3, "yards_white": 316, "yards_red": 316},
    {"hole": 12, "par": 4, "stroke_index": 6, "par_red": 4, "stroke_index_red": 4, "yards_white": 322, "yards_red": 307},
    {"hole": 13, "par": 4, "stroke_index": 16, "par_red": 3, "stroke_index_red": 10, "yards_white": 219, "yards_red": 120},
    {"hole": 14, "par": 5, "stroke_index": 14, "par_red": 5, "stroke_index_red": 7, "yards_white": 471, "yards_red": 372},
    {"hole": 15, "par": 5, "stroke_index": 11, "par_red": 5, "stroke_index_red": 12, "yards_white": 445, "yards_red": 302},
    {"hole": 16, "par": 4, "stroke_index": 15, "par_red": 4, "stroke_index_red": 14, "yards_white": 244, "yards_red": 244},
    {"hole": 17, "par": 3, "stroke_index": 10, "par_red": 3, "stroke_index_red": 9, "yards_white": 178, "yards_red": 124},
    {"hole": 18, "par": 5, "stroke_index": 5, "par_red": 5, "stroke_index_red": 16, "yards_white": 439, "yards_red": 409}
  ]'::jsonb,
  '[
    {"name": "Mens", "color": "white", "rating": null, "slope": null, "par": 70, "yards": 5175},
    {"name": "Ladies", "color": "red", "rating": null, "slope": null, "par": 71, "yards": 4409}
  ]'::jsonb
)
ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name,
  tees = EXCLUDED.tees,
  holes = EXCLUDED.holes,
  updated_at = NOW();
