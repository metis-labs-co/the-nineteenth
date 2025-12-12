-- QLD Batch 7: Tropical North
-- 6 courses with full hole-by-hole data (18 holes each)
-- Source: golfify.io
-- Generated: 2025-12-11

-- ============================================================================
-- 1. MIRAGE COUNTRY CLUB (Port Douglas)
-- ============================================================================
INSERT INTO venues (id, source, name, state, city, address, phone, website, total_holes)
VALUES (
  'f2a3b4c5-d6e7-8901-abcd-500000000870',
  'manual',
  'Mirage Country Club',
  'QLD',
  'Port Douglas',
  'Port Douglas Road',
  NULL,
  'https://www.miragetropical.com.au',
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
  'f2a3b4c5-d6e7-8901-abcd-500000000870',
  'Mirage Country Club',
  'Championship parkland course in tropical Port Douglas. Premier North Queensland resort destination.',
  128,
  73.0,
  '[
    {"hole": 1, "par": 5, "stroke_index": 1, "yards_blue": 475, "yards_white": 465, "yards_red": 422},
    {"hole": 2, "par": 3, "stroke_index": 3, "yards_blue": 172, "yards_white": 154, "yards_red": 128},
    {"hole": 3, "par": 5, "stroke_index": 5, "yards_blue": 465, "yards_white": 455, "yards_red": 370},
    {"hole": 4, "par": 4, "stroke_index": 7, "yards_blue": 364, "yards_white": 335, "yards_red": 315},
    {"hole": 5, "par": 4, "stroke_index": 9, "yards_blue": 411, "yards_white": 383, "yards_red": 364},
    {"hole": 6, "par": 3, "stroke_index": 11, "yards_blue": 185, "yards_white": 174, "yards_red": 143},
    {"hole": 7, "par": 5, "stroke_index": 13, "yards_blue": 485, "yards_white": 460, "yards_red": 424},
    {"hole": 8, "par": 3, "stroke_index": 15, "yards_blue": 150, "yards_white": 133, "yards_red": 85},
    {"hole": 9, "par": 4, "stroke_index": 17, "yards_blue": 388, "yards_white": 369, "yards_red": 340},
    {"hole": 10, "par": 5, "stroke_index": 2, "yards_blue": 493, "yards_white": 456, "yards_red": 428},
    {"hole": 11, "par": 4, "stroke_index": 4, "yards_blue": 382, "yards_white": 349, "yards_red": 313},
    {"hole": 12, "par": 4, "stroke_index": 6, "yards_blue": 406, "yards_white": 361, "yards_red": 339},
    {"hole": 13, "par": 3, "stroke_index": 8, "yards_blue": 174, "yards_white": 162, "yards_red": 135},
    {"hole": 14, "par": 5, "stroke_index": 10, "yards_blue": 462, "yards_white": 444, "yards_red": 397},
    {"hole": 15, "par": 3, "stroke_index": 12, "yards_blue": 161, "yards_white": 140, "yards_red": 127},
    {"hole": 16, "par": 5, "stroke_index": 14, "yards_blue": 524, "yards_white": 470, "yards_red": 418},
    {"hole": 17, "par": 4, "stroke_index": 16, "yards_blue": 405, "yards_white": 365, "yards_red": 325},
    {"hole": 18, "par": 3, "stroke_index": 18, "yards_blue": 159, "yards_white": 147, "yards_red": 124}
  ]'::jsonb,
  '[
    {"name": "Tournament", "color": "blue", "rating": 73.0, "slope": 128, "yards": 6261},
    {"name": "Resort", "color": "white", "rating": 70.0, "slope": 125, "yards": 5822},
    {"name": "Ladies", "color": "red", "rating": 73.0, "slope": 127, "yards": 5197}
  ]'::jsonb
)
ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name,
  tees = EXCLUDED.tees,
  holes = EXCLUDED.holes,
  updated_at = NOW();

-- ============================================================================
-- 2. MOSSMAN GOLF CLUB
-- ============================================================================
INSERT INTO venues (id, source, name, state, city, address, phone, website, total_holes)
VALUES (
  'f2a3b4c5-d6e7-8901-abcd-500000000871',
  'manual',
  'Mossman Golf Club',
  'QLD',
  'Mossman',
  'Newell Beach Road',
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
  'f2a3b4c5-d6e7-8901-abcd-500000000871',
  'Mossman Golf Club',
  'Parkland course near Port Douglas. Members club with tropical setting.',
  122,
  71.0,
  '[
    {"hole": 1, "par": 4, "stroke_index": 3, "yards_blue": 406, "yards_white": 398, "yards_red": 332},
    {"hole": 2, "par": 4, "stroke_index": 8, "yards_blue": 358, "yards_white": 348, "yards_red": 311},
    {"hole": 3, "par": 4, "stroke_index": 1, "yards_blue": 405, "yards_white": 388, "yards_red": 375},
    {"hole": 4, "par": 5, "stroke_index": 14, "yards_blue": 451, "yards_white": 446, "yards_red": 386},
    {"hole": 5, "par": 4, "stroke_index": 5, "yards_blue": 375, "yards_white": 365, "yards_red": 354},
    {"hole": 6, "par": 3, "stroke_index": 16, "yards_blue": 132, "yards_white": 125, "yards_red": 130},
    {"hole": 7, "par": 5, "stroke_index": 11, "yards_blue": 438, "yards_white": 426, "yards_red": 385},
    {"hole": 8, "par": 3, "stroke_index": 18, "yards_blue": 123, "yards_white": 107, "yards_red": 105},
    {"hole": 9, "par": 5, "stroke_index": 13, "yards_blue": 439, "yards_white": 432, "yards_red": 433},
    {"hole": 10, "par": 3, "stroke_index": 17, "yards_blue": 131, "yards_white": 120, "yards_red": 130},
    {"hole": 11, "par": 5, "stroke_index": 12, "yards_blue": 468, "yards_white": 459, "yards_red": 401},
    {"hole": 12, "par": 4, "stroke_index": 2, "yards_blue": 383, "yards_white": 375, "yards_red": 319},
    {"hole": 13, "par": 3, "stroke_index": 15, "yards_blue": 142, "yards_white": 119, "yards_red": 133},
    {"hole": 14, "par": 4, "stroke_index": 4, "yards_blue": 344, "yards_white": 338, "yards_red": 327},
    {"hole": 15, "par": 4, "stroke_index": 6, "yards_blue": 333, "yards_white": 315, "yards_red": 312},
    {"hole": 16, "par": 4, "stroke_index": 9, "yards_blue": 303, "yards_white": 293, "yards_red": 299},
    {"hole": 17, "par": 3, "stroke_index": 7, "yards_blue": 175, "yards_white": 161, "yards_red": 154},
    {"hole": 18, "par": 5, "stroke_index": 10, "yards_blue": 473, "yards_white": 445, "yards_red": 435}
  ]'::jsonb,
  '[
    {"name": "Blue", "color": "blue", "rating": 71.0, "slope": 122, "yards": 5879},
    {"name": "White", "color": "white", "rating": 70.0, "slope": 118, "yards": 5660},
    {"name": "Red", "color": "red", "rating": 73.0, "slope": 124, "yards": 5321}
  ]'::jsonb
)
ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name,
  tees = EXCLUDED.tees,
  holes = EXCLUDED.holes,
  updated_at = NOW();

-- ============================================================================
-- 3. HAMILTON ISLAND GOLF CLUB (Dent Island)
-- ============================================================================
INSERT INTO venues (id, source, name, state, city, address, phone, website, total_holes)
VALUES (
  'f2a3b4c5-d6e7-8901-abcd-500000000872',
  'manual',
  'Hamilton Island Golf Club',
  'QLD',
  'Hamilton Island',
  'Dent Island',
  NULL,
  'https://www.hamiltonislandgolfclub.com.au',
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
  'f2a3b4c5-d6e7-8901-abcd-500000000872',
  'Hamilton Island Golf Club',
  'Peter Thomson designed championship course on Dent Island. Stunning Whitsunday views. Opened 2009.',
  NULL,
  NULL,
  '[
    {"hole": 1, "par": 4, "stroke_index": 17, "yards_blue": 369, "yards_white": 344, "yards_red": 309},
    {"hole": 2, "par": 4, "stroke_index": 11, "yards_blue": 379, "yards_white": 332, "yards_red": 307},
    {"hole": 3, "par": 4, "stroke_index": 1, "yards_blue": 318, "yards_white": 285, "yards_red": 239},
    {"hole": 4, "par": 3, "stroke_index": 3, "yards_blue": 175, "yards_white": 161, "yards_red": 110},
    {"hole": 5, "par": 5, "stroke_index": 7, "yards_blue": 446, "yards_white": 425, "yards_red": 367},
    {"hole": 6, "par": 5, "stroke_index": 15, "yards_blue": 507, "yards_white": 487, "yards_red": 455},
    {"hole": 7, "par": 3, "stroke_index": 13, "yards_blue": 150, "yards_white": 132, "yards_red": 112},
    {"hole": 8, "par": 4, "stroke_index": 5, "yards_blue": 332, "yards_white": 300, "yards_red": 252},
    {"hole": 9, "par": 4, "stroke_index": 9, "yards_blue": 379, "yards_white": 335, "yards_red": 297},
    {"hole": 10, "par": 4, "stroke_index": 12, "yards_blue": 342, "yards_white": 304, "yards_red": 267},
    {"hole": 11, "par": 5, "stroke_index": 2, "yards_blue": 537, "yards_white": 513, "yards_red": 436},
    {"hole": 12, "par": 4, "stroke_index": 8, "yards_blue": 321, "yards_white": 304, "yards_red": 278},
    {"hole": 13, "par": 4, "stroke_index": 16, "yards_blue": 378, "yards_white": 359, "yards_red": 334},
    {"hole": 14, "par": 3, "stroke_index": 18, "yards_blue": 150, "yards_white": 143, "yards_red": 113},
    {"hole": 15, "par": 4, "stroke_index": 10, "yards_blue": 387, "yards_white": 347, "yards_red": 314},
    {"hole": 16, "par": 3, "stroke_index": 14, "yards_blue": 160, "yards_white": 149, "yards_red": 133},
    {"hole": 17, "par": 4, "stroke_index": 6, "yards_blue": 382, "yards_white": 361, "yards_red": 295},
    {"hole": 18, "par": 4, "stroke_index": 4, "yards_blue": 428, "yards_white": 397, "yards_red": 367}
  ]'::jsonb,
  '[
    {"name": "Hoop Pine", "color": "blue", "rating": null, "slope": null, "yards": 6140},
    {"name": "Pandanas", "color": "white", "rating": null, "slope": null, "yards": 5678},
    {"name": "Grass Trees", "color": "red", "rating": null, "slope": null, "yards": 4985}
  ]'::jsonb
)
ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name,
  tees = EXCLUDED.tees,
  holes = EXCLUDED.holes,
  updated_at = NOW();

-- ============================================================================
-- 4. MAREEBA GOLF CLUB
-- ============================================================================
INSERT INTO venues (id, source, name, state, city, address, phone, website, total_holes)
VALUES (
  'f2a3b4c5-d6e7-8901-abcd-500000000873',
  'manual',
  'Mareeba Golf Club',
  'QLD',
  'Mareeba',
  '1 Hampe Street',
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
  'f2a3b4c5-d6e7-8901-abcd-500000000873',
  'Mareeba Golf Club',
  'Parkland course on the Atherton Tablelands. Established 1938.',
  NULL,
  72.0,
  '[
    {"hole": 1, "par": 5, "stroke_index": 1, "yards_white": 516, "yards_red": 516},
    {"hole": 2, "par": 4, "stroke_index": 3, "yards_white": 330, "yards_red": 330},
    {"hole": 3, "par": 4, "stroke_index": 5, "yards_white": 355, "yards_red": 365},
    {"hole": 4, "par": 3, "stroke_index": 7, "yards_white": 165, "yards_red": 165},
    {"hole": 5, "par": 5, "stroke_index": 9, "yards_white": 481, "yards_red": 481},
    {"hole": 6, "par": 4, "stroke_index": 11, "yards_white": 385, "yards_red": 385},
    {"hole": 7, "par": 4, "stroke_index": 13, "yards_white": 395, "yards_red": 395},
    {"hole": 8, "par": 3, "stroke_index": 15, "yards_white": 142, "yards_red": 142},
    {"hole": 9, "par": 4, "stroke_index": 17, "yards_white": 393, "yards_red": 393},
    {"hole": 10, "par": 4, "stroke_index": 2, "yards_white": 290, "yards_red": 290},
    {"hole": 11, "par": 3, "stroke_index": 4, "yards_white": 156, "yards_red": 156},
    {"hole": 12, "par": 4, "stroke_index": 6, "yards_white": 344, "yards_red": 344},
    {"hole": 13, "par": 3, "stroke_index": 8, "yards_white": 175, "yards_red": 175},
    {"hole": 14, "par": 4, "stroke_index": 10, "yards_white": 281, "yards_red": 281},
    {"hole": 15, "par": 4, "stroke_index": 12, "yards_white": 298, "yards_red": 298},
    {"hole": 16, "par": 5, "stroke_index": 14, "yards_white": 470, "yards_red": 470},
    {"hole": 17, "par": 4, "stroke_index": 16, "yards_white": 325, "yards_red": 325},
    {"hole": 18, "par": 5, "stroke_index": 18, "yards_white": 476, "yards_red": 476}
  ]'::jsonb,
  '[
    {"name": "Men", "color": "white", "rating": 72.0, "slope": null, "yards": 5977},
    {"name": "Women", "color": "red", "rating": null, "slope": null, "yards": 5987}
  ]'::jsonb
)
ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name,
  tees = EXCLUDED.tees,
  holes = EXCLUDED.holes,
  updated_at = NOW();

-- ============================================================================
-- 5. INGHAM GOLF CLUB
-- ============================================================================
INSERT INTO venues (id, source, name, state, city, address, phone, website, total_holes)
VALUES (
  'f2a3b4c5-d6e7-8901-abcd-500000000874',
  'manual',
  'Ingham Golf Club',
  'QLD',
  'Ingham',
  'Marina Parade',
  '+61 7 4776 5600',
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
  'f2a3b4c5-d6e7-8901-abcd-500000000874',
  'Ingham Golf Club',
  'Parkland course in the Herbert River region. Between Townsville and Cairns.',
  NULL,
  70.0,
  '[
    {"hole": 1, "par": 5, "stroke_index_men": 15, "stroke_index_ladies": 13, "yards_black": 507, "yards_red": 376},
    {"hole": 2, "par": 5, "stroke_index_men": 17, "stroke_index_ladies": 6, "yards_black": 436, "yards_red": 384},
    {"hole": 3, "par": 4, "stroke_index_men": 6, "stroke_index_ladies": 7, "yards_black": 355, "yards_red": 327},
    {"hole": 4, "par": 4, "stroke_index_men": 12, "stroke_index_ladies": 16, "yards_black": 273, "yards_red": 260},
    {"hole": 5, "par": 3, "stroke_index_men": 10, "stroke_index_ladies": 17, "yards_black": 150, "yards_red": 148},
    {"hole": 6, "par": 4, "stroke_index_men": 4, "stroke_index_ladies": 9, "yards_black": 371, "yards_red": 333},
    {"hole": 7, "par": 4, "stroke_index_men": 13, "stroke_index_ladies": 10, "yards_black": 289, "yards_red": 240},
    {"hole": 8, "par": 4, "stroke_index_men": 2, "stroke_index_ladies": 2, "yards_black": 329, "yards_red": 327},
    {"hole": 9, "par": 3, "stroke_index_men": 8, "stroke_index_ladies": 18, "yards_black": 168, "yards_red": 90},
    {"hole": 10, "par": 3, "stroke_index_men": 11, "stroke_index_ladies": 15, "yards_black": 150, "yards_red": 130},
    {"hole": 11, "par": 4, "stroke_index_men": 1, "stroke_index_ladies": 1, "yards_black": 371, "yards_red": 329},
    {"hole": 12, "par": 3, "stroke_index_men": 14, "stroke_index_ladies": 14, "yards_black": 155, "yards_red": 156},
    {"hole": 13, "par": 4, "stroke_index_men": 9, "stroke_index_ladies": 11, "yards_black": 329, "yards_red": 323},
    {"hole": 14, "par": 4, "stroke_index_men": 5, "stroke_index_ladies": 3, "yards_black": 301, "yards_red": 300},
    {"hole": 15, "par": 5, "stroke_index_men": 16, "stroke_index_ladies": 12, "yards_black": 507, "yards_red": 376},
    {"hole": 16, "par": 5, "stroke_index_men": 18, "stroke_index_ladies": 5, "yards_black": 436, "yards_red": 384},
    {"hole": 17, "par": 4, "stroke_index_men": 3, "stroke_index_ladies": 8, "yards_black": 355, "yards_red": 327},
    {"hole": 18, "par": 4, "stroke_index_men": 7, "stroke_index_ladies": 4, "yards_black": 325, "yards_red": 320}
  ]'::jsonb,
  '[
    {"name": "Men", "color": "black", "rating": 70.0, "slope": null, "yards": 5807},
    {"name": "Ladies", "color": "red", "rating": 72.0, "slope": null, "yards": 5130}
  ]'::jsonb
)
ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name,
  tees = EXCLUDED.tees,
  holes = EXCLUDED.holes,
  updated_at = NOW();

-- ============================================================================
-- 6. GORDONVALE GOLF CLUB
-- ============================================================================
INSERT INTO venues (id, source, name, state, city, address, phone, website, total_holes)
VALUES (
  'f2a3b4c5-d6e7-8901-abcd-500000000875',
  'manual',
  'Gordonvale Golf Club',
  'QLD',
  'Gordonvale',
  'George Street',
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
  'f2a3b4c5-d6e7-8901-abcd-500000000875',
  'Gordonvale Golf Club',
  'Parkland course south of Cairns. Open guest policy.',
  111,
  69.0,
  '[
    {"hole": 1, "par": 4, "stroke_index_white": 3, "stroke_index_red": 10, "par_white": 4, "par_red": 5, "yards_white": 400, "yards_red": 395},
    {"hole": 2, "par": 4, "stroke_index_white": 13, "stroke_index_red": 12, "yards_white": 300, "yards_red": 270},
    {"hole": 3, "par": 3, "stroke_index_white": 9, "stroke_index_red": 13, "yards_white": 175, "yards_red": 160},
    {"hole": 4, "par": 4, "stroke_index_white": 4, "stroke_index_red": 11, "yards_white": 320, "yards_red": 305},
    {"hole": 5, "par": 3, "stroke_index_white": 18, "stroke_index_red": 18, "yards_white": 110, "yards_red": 110},
    {"hole": 6, "par": 5, "stroke_index_white": 11, "stroke_index_red": 6, "yards_white": 525, "yards_red": 415},
    {"hole": 7, "par": 4, "stroke_index_white": 5, "stroke_index_red": 3, "yards_white": 325, "yards_red": 315},
    {"hole": 8, "par": 3, "stroke_index_white": 7, "stroke_index_red": 15, "yards_white": 160, "yards_red": 130},
    {"hole": 9, "par": 5, "stroke_index_white": 16, "stroke_index_red": 8, "yards_white": 445, "yards_red": 395},
    {"hole": 10, "par": 5, "stroke_index_white": 17, "stroke_index_red": 4, "yards_white": 460, "yards_red": 435},
    {"hole": 11, "par": 4, "stroke_index_white": 2, "stroke_index_red": 1, "par_white": 4, "par_red": 5, "yards_white": 410, "yards_red": 410},
    {"hole": 12, "par": 3, "stroke_index_white": 8, "stroke_index_red": 14, "yards_white": 160, "yards_red": 160},
    {"hole": 13, "par": 4, "stroke_index_white": 10, "stroke_index_red": 9, "yards_white": 275, "yards_red": 235},
    {"hole": 14, "par": 3, "stroke_index_white": 6, "stroke_index_red": 16, "yards_white": 180, "yards_red": 165},
    {"hole": 15, "par": 4, "stroke_index_white": 1, "stroke_index_red": 2, "yards_white": 425, "yards_red": 335},
    {"hole": 16, "par": 4, "stroke_index_white": 12, "stroke_index_red": 5, "yards_white": 315, "yards_red": 300},
    {"hole": 17, "par": 3, "stroke_index_white": 14, "stroke_index_red": 17, "yards_white": 150, "yards_red": 140},
    {"hole": 18, "par": 5, "stroke_index_white": 15, "stroke_index_red": 7, "yards_white": 440, "yards_red": 400}
  ]'::jsonb,
  '[
    {"name": "White", "color": "white", "rating": 69.0, "slope": 111, "yards": 5575},
    {"name": "Red", "color": "red", "rating": 71.0, "slope": 113, "yards": 5075}
  ]'::jsonb
)
ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name,
  tees = EXCLUDED.tees,
  holes = EXCLUDED.holes,
  updated_at = NOW();
