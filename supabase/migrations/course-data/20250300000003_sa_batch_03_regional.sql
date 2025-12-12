-- SA Batch 3: Regional SA
-- 11 courses with full hole-by-hole data (18 holes each)
-- Source: golfify.io
-- Generated: 2025-12-11

-- ============================================================================
-- 1. TANUNDA PINES GOLF CLUB (Barossa Valley)
-- ============================================================================
INSERT INTO venues (id, source, name, state, city, address, phone, website, total_holes)
VALUES (
  'f2a3b4c5-d6e7-8901-abcd-500000000933',
  'manual',
  'Tanunda Pines Golf Club',
  'SA',
  'Rowland Flat',
  'Barossa Valley Way',
  NULL,
  'https://www.tanundapines.com.au',
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
  'f2a3b4c5-d6e7-8901-abcd-500000000933',
  'Tanunda Pines Golf Club',
  'Premier Barossa Valley parkland course established in 1938. Set among native pines in wine country.',
  128,
  72.0,
  '[
    {"hole": 1, "par": 4, "stroke_index": 18, "stroke_index_red": 9, "yards_blue": 276, "yards_red": 270},
    {"hole": 2, "par": 4, "stroke_index": 5, "stroke_index_red": 15, "yards_blue": 359, "yards_red": 383},
    {"hole": 3, "par": 4, "stroke_index": 12, "stroke_index_red": 5, "yards_blue": 332, "yards_red": 335},
    {"hole": 4, "par": 3, "stroke_index": 10, "stroke_index_red": 1, "yards_blue": 142, "yards_red": 419},
    {"hole": 5, "par": 4, "stroke_index": 8, "stroke_index_red": 3, "yards_blue": 368, "yards_red": 408},
    {"hole": 6, "par": 4, "stroke_index": 9, "stroke_index_red": 13, "yards_blue": 324, "yards_red": 160},
    {"hole": 7, "par": 4, "stroke_index": 7, "stroke_index_red": 11, "yards_blue": 362, "yards_red": 325},
    {"hole": 8, "par": 4, "stroke_index": 14, "stroke_index_red": 17, "yards_blue": 335, "yards_red": 107},
    {"hole": 9, "par": 5, "stroke_index": 11, "stroke_index_red": 7, "yards_blue": 492, "yards_red": 328},
    {"hole": 10, "par": 5, "stroke_index": 17, "stroke_index_red": 8, "yards_blue": 439, "yards_red": 287},
    {"hole": 11, "par": 3, "stroke_index": 3, "stroke_index_red": 16, "yards_blue": 194, "yards_red": 165},
    {"hole": 12, "par": 4, "stroke_index": 2, "stroke_index_red": 12, "yards_blue": 386, "yards_red": 264},
    {"hole": 13, "par": 3, "stroke_index": 6, "stroke_index_red": 10, "yards_blue": 179, "yards_red": 290},
    {"hole": 14, "par": 4, "stroke_index": 4, "stroke_index_red": 4, "yards_blue": 335, "yards_red": 335},
    {"hole": 15, "par": 5, "stroke_index": 15, "stroke_index_red": 2, "yards_blue": 444, "yards_red": 424},
    {"hole": 16, "par": 3, "stroke_index": 13, "stroke_index_red": 18, "yards_blue": 129, "yards_red": 120},
    {"hole": 17, "par": 4, "stroke_index": 1, "stroke_index_red": 6, "yards_blue": 382, "yards_red": 366},
    {"hole": 18, "par": 5, "stroke_index": 16, "stroke_index_red": 14, "yards_blue": 437, "yards_red": 375}
  ]'::jsonb,
  '[
    {"name": "Blue", "color": "blue", "gender": "mens", "rating": 72.0, "slope": 128, "par": 72, "yards": 5915},
    {"name": "Red", "color": "red", "gender": "ladies", "rating": 73.0, "slope": 124, "par": 74, "yards": 5361}
  ]'::jsonb
)
ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name,
  tees = EXCLUDED.tees,
  holes = EXCLUDED.holes,
  updated_at = NOW();

-- ============================================================================
-- 2. CLARE GOLF CLUB (Clare Valley)
-- ============================================================================
INSERT INTO venues (id, source, name, state, city, address, phone, website, total_holes)
VALUES (
  'f2a3b4c5-d6e7-8901-abcd-500000000934',
  'manual',
  'Clare Golf Club',
  'SA',
  'Clare',
  'Horrocks Highway',
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
  'f2a3b4c5-d6e7-8901-abcd-500000000934',
  'Clare Golf Club',
  'Historic parkland course in the Clare Valley wine region, established in 1908.',
  NULL,
  NULL,
  '[
    {"hole": 1, "par": 5, "stroke_index": 9, "par_red": 5, "stroke_index_red": 5, "yards_white": 485, "yards_red": 385},
    {"hole": 2, "par": 4, "stroke_index": 1, "par_red": 5, "stroke_index_red": 15, "yards_white": 420, "yards_red": 365},
    {"hole": 3, "par": 4, "stroke_index": 7, "par_red": 4, "stroke_index_red": 1, "yards_white": 385, "yards_red": 330},
    {"hole": 4, "par": 4, "stroke_index": 3, "par_red": 4, "stroke_index_red": 12, "yards_white": 395, "yards_red": 290},
    {"hole": 5, "par": 4, "stroke_index": 11, "par_red": 4, "stroke_index_red": 13, "yards_white": 350, "yards_red": 280},
    {"hole": 6, "par": 4, "stroke_index": 15, "par_red": 4, "stroke_index_red": 7, "yards_white": 320, "yards_red": 270},
    {"hole": 7, "par": 3, "stroke_index": 17, "par_red": 3, "stroke_index_red": 17, "yards_white": 150, "yards_red": 135},
    {"hole": 8, "par": 5, "stroke_index": 13, "par_red": 4, "stroke_index_red": 3, "yards_white": 460, "yards_red": 350},
    {"hole": 9, "par": 3, "stroke_index": 5, "par_red": 3, "stroke_index_red": 11, "yards_white": 185, "yards_red": 165},
    {"hole": 10, "par": 4, "stroke_index": 18, "par_red": 4, "stroke_index_red": 16, "yards_white": 305, "yards_red": 275},
    {"hole": 11, "par": 4, "stroke_index": 10, "par_red": 4, "stroke_index_red": 9, "yards_white": 360, "yards_red": 295},
    {"hole": 12, "par": 3, "stroke_index": 14, "par_red": 3, "stroke_index_red": 14, "yards_white": 175, "yards_red": 160},
    {"hole": 13, "par": 5, "stroke_index": 8, "par_red": 5, "stroke_index_red": 2, "yards_white": 485, "yards_red": 420},
    {"hole": 14, "par": 3, "stroke_index": 16, "par_red": 3, "stroke_index_red": 18, "yards_white": 165, "yards_red": 140},
    {"hole": 15, "par": 4, "stroke_index": 4, "par_red": 4, "stroke_index_red": 8, "yards_white": 390, "yards_red": 315},
    {"hole": 16, "par": 4, "stroke_index": 12, "par_red": 4, "stroke_index_red": 6, "yards_white": 345, "yards_red": 290},
    {"hole": 17, "par": 4, "stroke_index": 2, "par_red": 4, "stroke_index_red": 10, "yards_white": 415, "yards_red": 340},
    {"hole": 18, "par": 5, "stroke_index": 6, "par_red": 5, "stroke_index_red": 4, "yards_white": 485, "yards_red": 405}
  ]'::jsonb,
  '[
    {"name": "White", "color": "white", "gender": "mens", "rating": null, "slope": null, "par": 72, "yards": 6441},
    {"name": "Red", "color": "red", "gender": "ladies", "rating": null, "slope": null, "par": 74, "yards": 5142}
  ]'::jsonb
)
ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name,
  tees = EXCLUDED.tees,
  holes = EXCLUDED.holes,
  updated_at = NOW();

-- ============================================================================
-- 3. MOUNT GAMBIER GOLF CLUB (Limestone Coast)
-- ============================================================================
INSERT INTO venues (id, source, name, state, city, address, phone, website, total_holes)
VALUES (
  'f2a3b4c5-d6e7-8901-abcd-500000000935',
  'manual',
  'Mount Gambier Golf Club',
  'SA',
  'Mount Gambier',
  'Wireless Road',
  NULL,
  'https://www.mtgambiergolf.com.au',
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
  'f2a3b4c5-d6e7-8901-abcd-500000000935',
  'Mount Gambier Golf Club',
  'Premier Limestone Coast parkland course. Gateway to the Blue Lake region.',
  NULL,
  NULL,
  '[
    {"hole": 1, "par": 5, "stroke_index": 3, "stroke_index_red": 9, "yards_white": 448, "yards_red": 376},
    {"hole": 2, "par": 4, "stroke_index": 11, "stroke_index_red": 4, "yards_white": 379, "yards_red": 340},
    {"hole": 3, "par": 4, "stroke_index": 8, "stroke_index_red": 16, "yards_white": 347, "yards_red": 255},
    {"hole": 4, "par": 4, "stroke_index": 12, "stroke_index_red": 10, "yards_white": 360, "yards_red": 335},
    {"hole": 5, "par": 4, "stroke_index": 15, "stroke_index_red": 7, "yards_white": 315, "yards_red": 305},
    {"hole": 6, "par": 3, "stroke_index": 13, "stroke_index_red": 12, "yards_white": 150, "yards_red": 140},
    {"hole": 7, "par": 5, "stroke_index": 5, "stroke_index_red": 6, "yards_white": 500, "yards_red": 415},
    {"hole": 8, "par": 3, "stroke_index": 18, "stroke_index_red": 15, "yards_white": 150, "yards_red": 118},
    {"hole": 9, "par": 4, "stroke_index": 9, "stroke_index_red": 17, "yards_white": 342, "yards_red": 247},
    {"hole": 10, "par": 3, "stroke_index": 2, "stroke_index_red": 11, "yards_white": 160, "yards_red": 133},
    {"hole": 11, "par": 5, "stroke_index": 10, "stroke_index_red": 1, "yards_white": 463, "yards_red": 438},
    {"hole": 12, "par": 4, "stroke_index": 7, "stroke_index_red": 8, "yards_white": 328, "yards_red": 288},
    {"hole": 13, "par": 4, "stroke_index": 4, "stroke_index_red": 3, "yards_white": 360, "yards_red": 330},
    {"hole": 14, "par": 4, "stroke_index": 6, "stroke_index_red": 2, "yards_white": 338, "yards_red": 317},
    {"hole": 15, "par": 5, "stroke_index": 16, "stroke_index_red": 5, "yards_white": 444, "yards_red": 400},
    {"hole": 16, "par": 3, "stroke_index": 14, "stroke_index_red": 14, "yards_white": 155, "yards_red": 143},
    {"hole": 17, "par": 4, "stroke_index": 1, "stroke_index_red": 13, "yards_white": 393, "yards_red": 364},
    {"hole": 18, "par": 4, "stroke_index": 17, "stroke_index_red": 18, "yards_white": 296, "yards_red": 240}
  ]'::jsonb,
  '[
    {"name": "Men", "color": "white", "gender": "mens", "rating": null, "slope": null, "par": 72, "yards": 5928},
    {"name": "Ladies", "color": "red", "gender": "ladies", "rating": null, "slope": null, "par": 72, "yards": 5184}
  ]'::jsonb
)
ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name,
  tees = EXCLUDED.tees,
  holes = EXCLUDED.holes,
  updated_at = NOW();

-- ============================================================================
-- 4. MILLICENT GOLF CLUB (Limestone Coast)
-- ============================================================================
INSERT INTO venues (id, source, name, state, city, address, phone, website, total_holes)
VALUES (
  'f2a3b4c5-d6e7-8901-abcd-500000000936',
  'manual',
  'Millicent Golf Club',
  'SA',
  'Mount Burr',
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
  'f2a3b4c5-d6e7-8901-abcd-500000000936',
  'Millicent Golf Club',
  'Limestone Coast parkland course established in 1961.',
  121,
  71.0,
  '[
    {"hole": 1, "par": 5, "stroke_index": 6, "stroke_index_red": 11, "yards_white": 506, "yards_red": 441},
    {"hole": 2, "par": 4, "stroke_index": 16, "stroke_index_red": 5, "yards_white": 329, "yards_red": 316},
    {"hole": 3, "par": 3, "stroke_index": 10, "stroke_index_red": 15, "yards_white": 154, "yards_red": 140},
    {"hole": 4, "par": 4, "stroke_index": 2, "stroke_index_red": 1, "yards_white": 380, "yards_red": 338},
    {"hole": 5, "par": 3, "stroke_index": 18, "stroke_index_red": 17, "yards_white": 161, "yards_red": 152},
    {"hole": 6, "par": 4, "stroke_index": 14, "stroke_index_red": 3, "yards_white": 318, "yards_red": 294},
    {"hole": 7, "par": 5, "stroke_index": 8, "stroke_index_red": 13, "yards_white": 479, "yards_red": 413},
    {"hole": 8, "par": 4, "stroke_index": 4, "stroke_index_red": 7, "yards_white": 340, "yards_red": 280},
    {"hole": 9, "par": 4, "stroke_index": 12, "stroke_index_red": 9, "yards_white": 320, "yards_red": 298},
    {"hole": 10, "par": 5, "stroke_index": 17, "stroke_index_red": 12, "yards_white": 460, "yards_red": 423},
    {"hole": 11, "par": 4, "stroke_index": 3, "stroke_index_red": 6, "yards_white": 369, "yards_red": 278},
    {"hole": 12, "par": 4, "stroke_index": 9, "stroke_index_red": 10, "yards_white": 346, "yards_red": 282},
    {"hole": 13, "par": 3, "stroke_index": 15, "stroke_index_red": 14, "yards_white": 137, "yards_red": 132},
    {"hole": 14, "par": 5, "stroke_index": 11, "stroke_index_red": 4, "yards_white": 466, "yards_red": 403},
    {"hole": 15, "par": 4, "stroke_index": 1, "stroke_index_red": 2, "yards_white": 384, "yards_red": 345},
    {"hole": 16, "par": 4, "stroke_index": 13, "stroke_index_red": 16, "yards_white": 310, "yards_red": 256},
    {"hole": 17, "par": 3, "stroke_index": 7, "stroke_index_red": 18, "yards_white": 198, "yards_red": 161},
    {"hole": 18, "par": 4, "stroke_index": 5, "stroke_index_red": 8, "yards_white": 354, "yards_red": 305}
  ]'::jsonb,
  '[
    {"name": "White", "color": "white", "gender": "mens", "rating": 71.0, "slope": 121, "par": 72, "yards": 6011},
    {"name": "Red", "color": "red", "gender": "ladies", "rating": 72.0, "slope": 123, "par": 72, "yards": 5257}
  ]'::jsonb
)
ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name,
  tees = EXCLUDED.tees,
  holes = EXCLUDED.holes,
  updated_at = NOW();

-- ============================================================================
-- 5. NARACOORTE GOLF CLUB (Limestone Coast)
-- ============================================================================
INSERT INTO venues (id, source, name, state, city, address, phone, website, total_holes)
VALUES (
  'f2a3b4c5-d6e7-8901-abcd-500000000937',
  'manual',
  'Naracoorte Golf Club',
  'SA',
  'Naracoorte',
  'Golf Course Road',
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
  'f2a3b4c5-d6e7-8901-abcd-500000000937',
  'Naracoorte Golf Club',
  'Parkland course near the Naracoorte Caves World Heritage site. Open guest policy.',
  NULL,
  NULL,
  '[
    {"hole": 1, "par": 4, "stroke_index": 8, "stroke_index_purple": 4, "yards_white": 357, "yards_purple": 342},
    {"hole": 2, "par": 4, "stroke_index": 14, "stroke_index_purple": 10, "yards_white": 326, "yards_purple": 272},
    {"hole": 3, "par": 4, "stroke_index": 12, "stroke_index_purple": 12, "yards_white": 310, "yards_purple": 262},
    {"hole": 4, "par": 4, "stroke_index": 4, "stroke_index_purple": 8, "yards_white": 355, "yards_purple": 281},
    {"hole": 5, "par": 3, "stroke_index": 10, "stroke_index_purple": 16, "yards_white": 180, "yards_purple": 163},
    {"hole": 6, "par": 5, "stroke_index": 2, "stroke_index_purple": 6, "yards_white": 517, "yards_purple": 394},
    {"hole": 7, "par": 4, "stroke_index": 18, "stroke_index_purple": 18, "yards_white": 132, "yards_purple": 125},
    {"hole": 8, "par": 5, "stroke_index": 6, "stroke_index_purple": 2, "yards_white": 458, "yards_purple": 447},
    {"hole": 9, "par": 4, "stroke_index": 16, "stroke_index_purple": 14, "yards_white": 317, "yards_purple": 268},
    {"hole": 10, "par": 4, "stroke_index": 1, "stroke_index_purple": 1, "yards_white": 363, "yards_purple": 346},
    {"hole": 11, "par": 4, "stroke_index": 13, "stroke_index_purple": 11, "yards_white": 321, "yards_purple": 301},
    {"hole": 12, "par": 3, "stroke_index": 17, "stroke_index_purple": 15, "yards_white": 151, "yards_purple": 145},
    {"hole": 13, "par": 4, "stroke_index": 9, "stroke_index_purple": 3, "yards_white": 364, "yards_purple": 343},
    {"hole": 14, "par": 5, "stroke_index": 5, "stroke_index_purple": 9, "yards_white": 477, "yards_purple": 435},
    {"hole": 15, "par": 4, "stroke_index": 7, "stroke_index_purple": 5, "yards_white": 350, "yards_purple": 327},
    {"hole": 16, "par": 3, "stroke_index": 15, "stroke_index_purple": 17, "yards_white": 155, "yards_purple": 145},
    {"hole": 17, "par": 4, "stroke_index": 3, "stroke_index_purple": 7, "yards_white": 390, "yards_purple": 311},
    {"hole": 18, "par": 5, "stroke_index": 11, "stroke_index_purple": 13, "yards_white": 443, "yards_purple": 382}
  ]'::jsonb,
  '[
    {"name": "White", "color": "white", "gender": "mens", "rating": null, "slope": null, "par": 73, "yards": 5966},
    {"name": "Purple", "color": "purple", "gender": "ladies", "rating": null, "slope": null, "par": 73, "yards": 5289}
  ]'::jsonb
)
ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name,
  tees = EXCLUDED.tees,
  holes = EXCLUDED.holes,
  updated_at = NOW();

-- ============================================================================
-- 6. MURRAY BRIDGE GOLF CLUB (Murray River)
-- ============================================================================
INSERT INTO venues (id, source, name, state, city, address, phone, website, total_holes)
VALUES (
  'f2a3b4c5-d6e7-8901-abcd-500000000938',
  'manual',
  'Murray Bridge Golf Club',
  'SA',
  'Murray Bridge',
  'Adelaide Road',
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
  'f2a3b4c5-d6e7-8901-abcd-500000000938',
  'Murray Bridge Golf Club',
  'Murray River parkland course established in 1945.',
  115,
  68.0,
  '[
    {"hole": 1, "par": 4, "stroke_index": 6, "par_red": 4, "stroke_index_red": 5, "yards_blue": 357, "yards_red": 357},
    {"hole": 2, "par": 3, "stroke_index": 10, "par_red": 3, "stroke_index_red": 13, "yards_blue": 192, "yards_red": 174},
    {"hole": 3, "par": 4, "stroke_index": 2, "par_red": 5, "stroke_index_red": 11, "yards_blue": 390, "yards_red": 390},
    {"hole": 4, "par": 3, "stroke_index": 18, "par_red": 3, "stroke_index_red": 17, "yards_blue": 120, "yards_red": 120},
    {"hole": 5, "par": 4, "stroke_index": 4, "par_red": 4, "stroke_index_red": 1, "yards_blue": 366, "yards_red": 366},
    {"hole": 6, "par": 3, "stroke_index": 12, "par_red": 3, "stroke_index_red": 15, "yards_blue": 183, "yards_red": 147},
    {"hole": 7, "par": 4, "stroke_index": 8, "par_red": 4, "stroke_index_red": 3, "yards_blue": 352, "yards_red": 352},
    {"hole": 8, "par": 5, "stroke_index": 14, "par_red": 5, "stroke_index_red": 7, "yards_blue": 440, "yards_red": 421},
    {"hole": 9, "par": 4, "stroke_index": 16, "par_red": 4, "stroke_index_red": 9, "yards_blue": 282, "yards_red": 282},
    {"hole": 10, "par": 4, "stroke_index": 5, "par_red": 4, "stroke_index_red": 4, "yards_blue": 306, "yards_red": 306},
    {"hole": 11, "par": 3, "stroke_index": 17, "par_red": 3, "stroke_index_red": 18, "yards_blue": 123, "yards_red": 123},
    {"hole": 12, "par": 5, "stroke_index": 13, "par_red": 5, "stroke_index_red": 2, "yards_blue": 427, "yards_red": 427},
    {"hole": 13, "par": 4, "stroke_index": 1, "par_red": 5, "stroke_index_red": 6, "yards_blue": 400, "yards_red": 400},
    {"hole": 14, "par": 3, "stroke_index": 11, "par_red": 3, "stroke_index_red": 16, "yards_blue": 146, "yards_red": 133},
    {"hole": 15, "par": 4, "stroke_index": 15, "par_red": 4, "stroke_index_red": 14, "yards_blue": 256, "yards_red": 238},
    {"hole": 16, "par": 3, "stroke_index": 3, "par_red": 5, "stroke_index_red": 10, "yards_blue": 375, "yards_red": 375},
    {"hole": 17, "par": 4, "stroke_index": 9, "par_red": 3, "stroke_index_red": 12, "yards_blue": 155, "yards_red": 135},
    {"hole": 18, "par": 4, "stroke_index": 7, "par_red": 4, "stroke_index_red": 8, "yards_blue": 322, "yards_red": 295}
  ]'::jsonb,
  '[
    {"name": "Blue", "color": "blue", "gender": "mens", "rating": 68.0, "slope": 115, "par": 68, "yards": 5192},
    {"name": "Red", "color": "red", "gender": "ladies", "rating": 72.0, "slope": 127, "par": 71, "yards": 5041}
  ]'::jsonb
)
ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name,
  tees = EXCLUDED.tees,
  holes = EXCLUDED.holes,
  updated_at = NOW();

-- ============================================================================
-- 7. RENMARK GOLF CLUB (Riverland)
-- ============================================================================
INSERT INTO venues (id, source, name, state, city, address, phone, website, total_holes)
VALUES (
  'f2a3b4c5-d6e7-8901-abcd-500000000939',
  'manual',
  'Renmark Golf Club',
  'SA',
  'Renmark',
  'Sturt Highway',
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
  'f2a3b4c5-d6e7-8901-abcd-500000000939',
  'Renmark Golf Club',
  'Riverland parkland course established in 1963.',
  NULL,
  NULL,
  '[
    {"hole": 1, "par": 5, "stroke_index": 16, "yards_white": 437},
    {"hole": 2, "par": 3, "stroke_index": 8, "yards_white": 150},
    {"hole": 3, "par": 4, "stroke_index": 4, "yards_white": 348},
    {"hole": 4, "par": 4, "stroke_index": 13, "yards_white": 335},
    {"hole": 5, "par": 4, "stroke_index": 12, "yards_white": 329},
    {"hole": 6, "par": 5, "stroke_index": 7, "yards_white": 512},
    {"hole": 7, "par": 4, "stroke_index": 10, "yards_white": 344},
    {"hole": 8, "par": 4, "stroke_index": 2, "yards_white": 389},
    {"hole": 9, "par": 3, "stroke_index": 18, "yards_white": 131},
    {"hole": 10, "par": 4, "stroke_index": 3, "yards_white": 352},
    {"hole": 11, "par": 3, "stroke_index": 6, "yards_white": 193},
    {"hole": 12, "par": 5, "stroke_index": 17, "yards_white": 476},
    {"hole": 13, "par": 4, "stroke_index": 15, "yards_white": 322},
    {"hole": 14, "par": 4, "stroke_index": 5, "yards_white": 366},
    {"hole": 15, "par": 3, "stroke_index": 11, "yards_white": 155},
    {"hole": 16, "par": 4, "stroke_index": 9, "yards_white": 349},
    {"hole": 17, "par": 4, "stroke_index": 1, "yards_white": 404},
    {"hole": 18, "par": 5, "stroke_index": 14, "yards_white": 492}
  ]'::jsonb,
  '[
    {"name": "White", "color": "white", "gender": "mens", "rating": null, "slope": null, "par": 72, "yards": 6084}
  ]'::jsonb
)
ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name,
  tees = EXCLUDED.tees,
  holes = EXCLUDED.holes,
  updated_at = NOW();

-- ============================================================================
-- 8. PORT LINCOLN GOLF CLUB (Eyre Peninsula)
-- ============================================================================
INSERT INTO venues (id, source, name, state, city, address, phone, website, total_holes)
VALUES (
  'f2a3b4c5-d6e7-8901-abcd-500000000940',
  'manual',
  'Port Lincoln Golf Club',
  'SA',
  'Port Lincoln',
  'Flinders Highway',
  NULL,
  'https://www.portlincolngolf.com.au',
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
  'f2a3b4c5-d6e7-8901-abcd-500000000940',
  'Port Lincoln Golf Club',
  'Eyre Peninsula parkland course established in 1915. Open guest policy.',
  112,
  70.0,
  '[
    {"hole": 1, "par": 4, "stroke_index": 17, "yards_white": 290, "yards_red": 275},
    {"hole": 2, "par": 5, "stroke_index": 9, "yards_white": 525, "yards_red": 485},
    {"hole": 3, "par": 4, "stroke_index": 1, "yards_white": 390, "yards_red": 355},
    {"hole": 4, "par": 4, "stroke_index": 5, "yards_white": 370, "yards_red": 340},
    {"hole": 5, "par": 5, "stroke_index": 13, "yards_white": 455, "yards_red": 420},
    {"hole": 6, "par": 3, "stroke_index": 15, "yards_white": 155, "yards_red": 140},
    {"hole": 7, "par": 5, "stroke_index": 11, "yards_white": 485, "yards_red": 450},
    {"hole": 8, "par": 4, "stroke_index": 3, "yards_white": 375, "yards_red": 345},
    {"hole": 9, "par": 3, "stroke_index": 7, "yards_white": 175, "yards_red": 160},
    {"hole": 10, "par": 4, "stroke_index": 14, "yards_white": 335, "yards_red": 315},
    {"hole": 11, "par": 4, "stroke_index": 6, "yards_white": 360, "yards_red": 335},
    {"hole": 12, "par": 3, "stroke_index": 12, "yards_white": 160, "yards_red": 145},
    {"hole": 13, "par": 5, "stroke_index": 10, "yards_white": 460, "yards_red": 425},
    {"hole": 14, "par": 4, "stroke_index": 8, "yards_white": 330, "yards_red": 310},
    {"hole": 15, "par": 4, "stroke_index": 4, "yards_white": 315, "yards_red": 295},
    {"hole": 16, "par": 5, "stroke_index": 18, "yards_white": 460, "yards_red": 425},
    {"hole": 17, "par": 4, "stroke_index": 2, "yards_white": 325, "yards_red": 305},
    {"hole": 18, "par": 3, "stroke_index": 16, "yards_white": 140, "yards_red": 130}
  ]'::jsonb,
  '[
    {"name": "White", "color": "white", "gender": "mens", "rating": 70.0, "slope": 112, "par": 72, "yards": 5805},
    {"name": "Red", "color": "red", "gender": "ladies", "rating": 73.0, "slope": 115, "par": 72, "yards": 5310}
  ]'::jsonb
)
ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name,
  tees = EXCLUDED.tees,
  holes = EXCLUDED.holes,
  updated_at = NOW();

-- ============================================================================
-- 9. WHYALLA GOLF CLUB (Upper Spencer Gulf)
-- ============================================================================
INSERT INTO venues (id, source, name, state, city, address, phone, website, total_holes)
VALUES (
  'f2a3b4c5-d6e7-8901-abcd-500000000941',
  'manual',
  'Whyalla Golf Club',
  'SA',
  'Whyalla',
  'Lincoln Highway',
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
  'f2a3b4c5-d6e7-8901-abcd-500000000941',
  'Whyalla Golf Club',
  'Upper Spencer Gulf parkland course established in 1933.',
  NULL,
  NULL,
  '[
    {"hole": 1, "par": 5, "stroke_index": 4, "par_red": 5, "yards_blue": 513, "yards_red": 455},
    {"hole": 2, "par": 4, "stroke_index": 12, "par_red": 4, "yards_blue": 327, "yards_red": 290},
    {"hole": 3, "par": 4, "stroke_index": 6, "par_red": 4, "yards_blue": 375, "yards_red": 340},
    {"hole": 4, "par": 4, "stroke_index": 10, "par_red": 4, "yards_blue": 366, "yards_red": 330},
    {"hole": 5, "par": 4, "stroke_index": 2, "par_red": 4, "yards_blue": 365, "yards_red": 330},
    {"hole": 6, "par": 4, "stroke_index": 8, "par_red": 4, "yards_blue": 344, "yards_red": 310},
    {"hole": 7, "par": 3, "stroke_index": 18, "par_red": 3, "yards_blue": 121, "yards_red": 110},
    {"hole": 8, "par": 5, "stroke_index": 14, "par_red": 5, "yards_blue": 474, "yards_red": 425},
    {"hole": 9, "par": 3, "stroke_index": 16, "par_red": 3, "yards_blue": 162, "yards_red": 145},
    {"hole": 10, "par": 4, "stroke_index": 9, "par_red": 4, "yards_blue": 349, "yards_red": 315},
    {"hole": 11, "par": 4, "stroke_index": 15, "par_red": 4, "yards_blue": 317, "yards_red": 285},
    {"hole": 12, "par": 4, "stroke_index": 3, "par_red": 4, "yards_blue": 360, "yards_red": 325},
    {"hole": 13, "par": 3, "stroke_index": 7, "par_red": 3, "yards_blue": 174, "yards_red": 155},
    {"hole": 14, "par": 5, "stroke_index": 13, "par_red": 5, "yards_blue": 449, "yards_red": 405},
    {"hole": 15, "par": 4, "stroke_index": 5, "par_red": 4, "yards_blue": 361, "yards_red": 325},
    {"hole": 16, "par": 5, "stroke_index": 11, "par_red": 5, "yards_blue": 531, "yards_red": 480},
    {"hole": 17, "par": 4, "stroke_index": 1, "par_red": 4, "yards_blue": 355, "yards_red": 320},
    {"hole": 18, "par": 3, "stroke_index": 17, "par_red": 3, "yards_blue": 157, "yards_red": 142}
  ]'::jsonb,
  '[
    {"name": "Blue", "color": "blue", "gender": "mens", "rating": null, "slope": null, "par": 72, "yards": 6100},
    {"name": "Red", "color": "red", "gender": "ladies", "rating": null, "slope": null, "par": 73, "yards": 5387}
  ]'::jsonb
)
ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name,
  tees = EXCLUDED.tees,
  holes = EXCLUDED.holes,
  updated_at = NOW();

-- ============================================================================
-- 10. PORT AUGUSTA GOLF CLUB (Upper Spencer Gulf)
-- ============================================================================
INSERT INTO venues (id, source, name, state, city, address, phone, website, total_holes)
VALUES (
  'f2a3b4c5-d6e7-8901-abcd-500000000942',
  'manual',
  'Port Augusta Golf Club',
  'SA',
  'Port Augusta',
  'Stuart Highway',
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
  'f2a3b4c5-d6e7-8901-abcd-500000000942',
  'Port Augusta Golf Club',
  'Upper Spencer Gulf parkland course established in 1926. Gateway to the Outback.',
  116,
  69.4,
  '[
    {"hole": 1, "par": 4, "stroke_index": 10, "par_red": 4, "stroke_index_red": 1, "yards_yellow": 355, "yards_red": 330},
    {"hole": 2, "par": 5, "stroke_index": 2, "par_red": 5, "stroke_index_red": 5, "yards_yellow": 513, "yards_red": 432},
    {"hole": 3, "par": 3, "stroke_index": 18, "par_red": 3, "stroke_index_red": 17, "yards_yellow": 149, "yards_red": 139},
    {"hole": 4, "par": 3, "stroke_index": 14, "par_red": 3, "stroke_index_red": 15, "yards_yellow": 166, "yards_red": 148},
    {"hole": 5, "par": 4, "stroke_index": 8, "par_red": 4, "stroke_index_red": 3, "yards_yellow": 344, "yards_red": 337},
    {"hole": 6, "par": 4, "stroke_index": 4, "par_red": 5, "stroke_index_red": 13, "yards_yellow": 366, "yards_red": 366},
    {"hole": 7, "par": 4, "stroke_index": 16, "par_red": 4, "stroke_index_red": 11, "yards_yellow": 318, "yards_red": 314},
    {"hole": 8, "par": 4, "stroke_index": 6, "par_red": 4, "stroke_index_red": 7, "yards_yellow": 319, "yards_red": 319},
    {"hole": 9, "par": 4, "stroke_index": 12, "par_red": 4, "stroke_index_red": 9, "yards_yellow": 344, "yards_red": 304},
    {"hole": 10, "par": 3, "stroke_index": 7, "par_red": 3, "stroke_index_red": 6, "yards_yellow": 160, "yards_red": 155},
    {"hole": 11, "par": 3, "stroke_index": 17, "par_red": 3, "stroke_index_red": 18, "yards_yellow": 147, "yards_red": 128},
    {"hole": 12, "par": 4, "stroke_index": 15, "par_red": 4, "stroke_index_red": 12, "yards_yellow": 306, "yards_red": 300},
    {"hole": 13, "par": 4, "stroke_index": 11, "par_red": 4, "stroke_index_red": 10, "yards_yellow": 315, "yards_red": 305},
    {"hole": 14, "par": 4, "stroke_index": 3, "par_red": 5, "stroke_index_red": 14, "yards_yellow": 383, "yards_red": 383},
    {"hole": 15, "par": 4, "stroke_index": 9, "par_red": 4, "stroke_index_red": 8, "yards_yellow": 352, "yards_red": 307},
    {"hole": 16, "par": 4, "stroke_index": 1, "par_red": 4, "stroke_index_red": 16, "yards_yellow": 408, "yards_red": 308},
    {"hole": 17, "par": 4, "stroke_index": 13, "par_red": 5, "stroke_index_red": 4, "yards_yellow": 453, "yards_red": 398},
    {"hole": 18, "par": 4, "stroke_index": 5, "par_red": 4, "stroke_index_red": 2, "yards_yellow": 359, "yards_red": 301}
  ]'::jsonb,
  '[
    {"name": "Yellow", "color": "yellow", "gender": "mens", "rating": 69.4, "slope": 116, "par": 70, "yards": 5757},
    {"name": "Red", "color": "red", "gender": "ladies", "rating": 73.3, "slope": 120, "par": 72, "yards": 5274}
  ]'::jsonb
)
ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name,
  tees = EXCLUDED.tees,
  holes = EXCLUDED.holes,
  updated_at = NOW();

-- ============================================================================
-- 11. PORT PIRIE GOLF CLUB (Yorke Peninsula)
-- ============================================================================
INSERT INTO venues (id, source, name, state, city, address, phone, website, total_holes)
VALUES (
  'f2a3b4c5-d6e7-8901-abcd-500000000943',
  'manual',
  'Port Pirie Golf Club',
  'SA',
  'Risdon Park',
  'Golf Course Road',
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
  'f2a3b4c5-d6e7-8901-abcd-500000000943',
  'Port Pirie Golf Club',
  'Historic parkland course established in 1912. Mid-north gateway.',
  109,
  69.0,
  '[
    {"hole": 1, "par": 4, "stroke_index": 4, "yards_green": 348, "yards_red": 330},
    {"hole": 2, "par": 4, "stroke_index": 5, "yards_green": 346, "yards_red": 325},
    {"hole": 3, "par": 4, "stroke_index": 7, "yards_green": 370, "yards_red": 350},
    {"hole": 4, "par": 5, "stroke_index": 18, "yards_green": 428, "yards_red": 405},
    {"hole": 5, "par": 4, "stroke_index": 15, "yards_green": 251, "yards_red": 240},
    {"hole": 6, "par": 4, "stroke_index": 9, "yards_green": 335, "yards_red": 315},
    {"hole": 7, "par": 4, "stroke_index": 14, "yards_green": 331, "yards_red": 310},
    {"hole": 8, "par": 4, "stroke_index": 11, "yards_green": 309, "yards_red": 295},
    {"hole": 9, "par": 3, "stroke_index": 1, "yards_green": 202, "yards_red": 185},
    {"hole": 10, "par": 3, "stroke_index": 16, "yards_green": 151, "yards_red": 140},
    {"hole": 11, "par": 4, "stroke_index": 12, "yards_green": 356, "yards_red": 340},
    {"hole": 12, "par": 4, "stroke_index": 3, "yards_green": 367, "yards_red": 350},
    {"hole": 13, "par": 5, "stroke_index": 8, "yards_green": 491, "yards_red": 465},
    {"hole": 14, "par": 3, "stroke_index": 17, "yards_green": 104, "yards_red": 100},
    {"hole": 15, "par": 4, "stroke_index": 2, "yards_green": 351, "yards_red": 335},
    {"hole": 16, "par": 3, "stroke_index": 13, "yards_green": 158, "yards_red": 145},
    {"hole": 17, "par": 4, "stroke_index": 10, "yards_green": 359, "yards_red": 340},
    {"hole": 18, "par": 5, "stroke_index": 6, "yards_green": 478, "yards_red": 444}
  ]'::jsonb,
  '[
    {"name": "Green", "color": "green", "gender": "mens", "rating": 69.0, "slope": 109, "par": 71, "yards": 5735},
    {"name": "Red", "color": "red", "gender": "ladies", "rating": 73.0, "slope": 118, "par": 74, "yards": 5414}
  ]'::jsonb
)
ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name,
  tees = EXCLUDED.tees,
  holes = EXCLUDED.holes,
  updated_at = NOW();

-- ============================================================================
-- 12. KADINA GOLF CLUB (Yorke Peninsula)
-- ============================================================================
INSERT INTO venues (id, source, name, state, city, address, phone, website, total_holes)
VALUES (
  'f2a3b4c5-d6e7-8901-abcd-500000000944',
  'manual',
  'Kadina Golf Club',
  'SA',
  'Kadina',
  'Augusta Street',
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
  'f2a3b4c5-d6e7-8901-abcd-500000000944',
  'Kadina Golf Club',
  'Yorke Peninsula parkland course established in 1904. Copper Triangle region.',
  111,
  69.0,
  '[
    {"hole": 1, "par": 4, "stroke_index": 18, "yards_blue": 313, "yards_red": 280},
    {"hole": 2, "par": 4, "stroke_index": 6, "yards_blue": 343, "yards_red": 310},
    {"hole": 3, "par": 3, "stroke_index": 16, "yards_blue": 157, "yards_red": 140},
    {"hole": 4, "par": 4, "stroke_index": 1, "yards_blue": 396, "yards_red": 360},
    {"hole": 5, "par": 5, "stroke_index": 8, "yards_blue": 476, "yards_red": 430},
    {"hole": 6, "par": 3, "stroke_index": 14, "yards_blue": 170, "yards_red": 150},
    {"hole": 7, "par": 4, "stroke_index": 5, "yards_blue": 318, "yards_red": 290},
    {"hole": 8, "par": 4, "stroke_index": 3, "yards_blue": 352, "yards_red": 320},
    {"hole": 9, "par": 4, "stroke_index": 12, "yards_blue": 339, "yards_red": 305},
    {"hole": 10, "par": 5, "stroke_index": 15, "yards_blue": 430, "yards_red": 395},
    {"hole": 11, "par": 4, "stroke_index": 4, "yards_blue": 364, "yards_red": 330},
    {"hole": 12, "par": 4, "stroke_index": 10, "yards_blue": 323, "yards_red": 295},
    {"hole": 13, "par": 4, "stroke_index": 17, "yards_blue": 311, "yards_red": 280},
    {"hole": 14, "par": 3, "stroke_index": 9, "yards_blue": 155, "yards_red": 140},
    {"hole": 15, "par": 4, "stroke_index": 7, "yards_blue": 311, "yards_red": 285},
    {"hole": 16, "par": 5, "stroke_index": 11, "yards_blue": 436, "yards_red": 400},
    {"hole": 17, "par": 3, "stroke_index": 2, "yards_blue": 190, "yards_red": 165},
    {"hole": 18, "par": 5, "stroke_index": 13, "yards_blue": 467, "yards_red": 430}
  ]'::jsonb,
  '[
    {"name": "Blue", "color": "blue", "gender": "mens", "rating": 69.0, "slope": 111, "par": 72, "yards": 5851},
    {"name": "Red", "color": "red", "gender": "ladies", "rating": 71.0, "slope": 107, "par": 72, "yards": 5160}
  ]'::jsonb
)
ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name,
  tees = EXCLUDED.tees,
  holes = EXCLUDED.holes,
  updated_at = NOW();

-- ============================================================================
-- 13. WALLAROO GOLF CLUB (Yorke Peninsula)
-- ============================================================================
INSERT INTO venues (id, source, name, state, city, address, phone, website, total_holes)
VALUES (
  'f2a3b4c5-d6e7-8901-abcd-500000000945',
  'manual',
  'Wallaroo Golf Club',
  'SA',
  'Wallaroo',
  'Mines Road',
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
  'f2a3b4c5-d6e7-8901-abcd-500000000945',
  'Wallaroo Golf Club',
  'Yorke Peninsula coastal parkland course established in 1907. Open guest policy.',
  113,
  70.0,
  '[
    {"hole": 1, "par": 5, "stroke_index": 15, "yards_white": 519},
    {"hole": 2, "par": 4, "stroke_index": 1, "yards_white": 426},
    {"hole": 3, "par": 3, "stroke_index": 17, "yards_white": 133},
    {"hole": 4, "par": 4, "stroke_index": 7, "yards_white": 369},
    {"hole": 5, "par": 4, "stroke_index": 3, "yards_white": 404},
    {"hole": 6, "par": 3, "stroke_index": 11, "yards_white": 174},
    {"hole": 7, "par": 4, "stroke_index": 5, "yards_white": 349},
    {"hole": 8, "par": 4, "stroke_index": 9, "yards_white": 341},
    {"hole": 9, "par": 4, "stroke_index": 13, "yards_white": 351},
    {"hole": 10, "par": 4, "stroke_index": 8, "yards_white": 348},
    {"hole": 11, "par": 3, "stroke_index": 16, "yards_white": 166},
    {"hole": 12, "par": 4, "stroke_index": 6, "yards_white": 352},
    {"hole": 13, "par": 4, "stroke_index": 2, "yards_white": 387},
    {"hole": 14, "par": 4, "stroke_index": 18, "yards_white": 297},
    {"hole": 15, "par": 4, "stroke_index": 4, "yards_white": 346},
    {"hole": 16, "par": 5, "stroke_index": 12, "yards_white": 471},
    {"hole": 17, "par": 5, "stroke_index": 10, "yards_white": 524},
    {"hole": 18, "par": 4, "stroke_index": 14, "yards_white": 361}
  ]'::jsonb,
  '[
    {"name": "White", "color": "white", "gender": "mens", "rating": 70.0, "slope": 113, "par": 72, "yards": 6318}
  ]'::jsonb
)
ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name,
  tees = EXCLUDED.tees,
  holes = EXCLUDED.holes,
  updated_at = NOW();
