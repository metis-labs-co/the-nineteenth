-- QLD Batch 5: Sunshine Coast
-- 8 courses with full hole-by-hole data (18 holes each)
-- Source: golfify.io
-- Generated: 2025-12-11

-- ============================================================================
-- 1. PELICAN WATERS GOLF CLUB
-- ============================================================================
INSERT INTO venues (id, source, name, state, city, address, phone, website, total_holes)
VALUES (
  'f2a3b4c5-d6e7-8901-abcd-500000000861',
  'manual',
  'Pelican Waters Golf Club',
  'QLD',
  'Pelican Waters',
  'Pelican Waters Boulevard',
  NULL,
  'https://www.pelicanwatersgolf.com.au',
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
  'f2a3b4c5-d6e7-8901-abcd-500000000861',
  'Pelican Waters Golf Club',
  'Championship parkland course on the Sunshine Coast. Open guest policy.',
  NULL,
  73.0,
  '[
    {"hole": 1, "par": 4, "stroke_index": 1, "yards_black": 355, "yards_blue": 332, "yards_red": 313, "yards_yellow": 332},
    {"hole": 2, "par": 4, "stroke_index": 3, "yards_black": 311, "yards_blue": 302, "yards_red": 266, "yards_yellow": 271},
    {"hole": 3, "par": 5, "stroke_index": 5, "yards_black": 489, "yards_blue": 465, "yards_red": 414, "yards_yellow": 451},
    {"hole": 4, "par": 3, "stroke_index": 7, "yards_black": 185, "yards_blue": 156, "yards_red": 137, "yards_yellow": 150},
    {"hole": 5, "par": 4, "stroke_index": 9, "yards_black": 345, "yards_blue": 322, "yards_red": 296, "yards_yellow": 317},
    {"hole": 6, "par": 3, "stroke_index": 11, "yards_black": 152, "yards_blue": 149, "yards_red": 110, "yards_yellow": 133},
    {"hole": 7, "par": 4, "stroke_index": 13, "yards_black": 393, "yards_blue": 368, "yards_red": 326, "yards_yellow": 356},
    {"hole": 8, "par": 5, "stroke_index": 15, "yards_black": 512, "yards_blue": 484, "yards_red": 433, "yards_yellow": 433},
    {"hole": 9, "par": 4, "stroke_index": 17, "yards_black": 408, "yards_blue": 380, "yards_red": 353, "yards_yellow": 369},
    {"hole": 10, "par": 5, "stroke_index": 2, "yards_black": 500, "yards_blue": 461, "yards_red": 420, "yards_yellow": 461},
    {"hole": 11, "par": 3, "stroke_index": 4, "yards_black": 180, "yards_blue": 160, "yards_red": 125, "yards_yellow": 145},
    {"hole": 12, "par": 4, "stroke_index": 6, "yards_black": 309, "yards_blue": 279, "yards_red": 251, "yards_yellow": 273},
    {"hole": 13, "par": 4, "stroke_index": 8, "yards_black": 331, "yards_blue": 293, "yards_red": 252, "yards_yellow": 283},
    {"hole": 14, "par": 3, "stroke_index": 10, "yards_black": 158, "yards_blue": 149, "yards_red": 114, "yards_yellow": 138},
    {"hole": 15, "par": 4, "stroke_index": 12, "yards_black": 382, "yards_blue": 362, "yards_red": 302, "yards_yellow": 324},
    {"hole": 16, "par": 5, "stroke_index": 14, "yards_black": 485, "yards_blue": 456, "yards_red": 426, "yards_yellow": 445},
    {"hole": 17, "par": 4, "stroke_index": 16, "yards_black": 380, "yards_blue": 373, "yards_red": 317, "yards_yellow": 351},
    {"hole": 18, "par": 4, "stroke_index": 18, "yards_black": 417, "yards_blue": 390, "yards_red": 352, "yards_yellow": 375}
  ]'::jsonb,
  '[
    {"name": "Championship", "color": "black", "rating": 73.0, "slope": null, "yards": 6292},
    {"name": "Blue", "color": "blue", "rating": 71.0, "slope": null, "yards": 5881},
    {"name": "Red", "color": "red", "rating": 69.0, "slope": null, "yards": 5207},
    {"name": "Yellow", "color": "yellow", "rating": 73.0, "slope": null, "yards": 5607}
  ]'::jsonb
)
ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name,
  tees = EXCLUDED.tees,
  holes = EXCLUDED.holes,
  updated_at = NOW();

-- ============================================================================
-- 2. NOOSA SPRINGS GOLF & SPA RESORT
-- ============================================================================
INSERT INTO venues (id, source, name, state, city, address, phone, website, total_holes)
VALUES (
  'f2a3b4c5-d6e7-8901-abcd-500000000862',
  'manual',
  'Noosa Springs Golf & Spa Resort',
  'QLD',
  'Noosa Heads',
  'Links Drive',
  NULL,
  'https://www.noosasprings.com.au',
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
  'f2a3b4c5-d6e7-8901-abcd-500000000862',
  'Noosa Springs Golf Course',
  'Resort parkland course opened 1999. Premium Noosa resort destination.',
  120,
  72.0,
  '[
    {"hole": 1, "par": 4, "stroke_index": 10, "yards_white": 365, "yards_blue": 330, "yards_white_alt": 288, "yards_red": 365},
    {"hole": 2, "par": 4, "stroke_index": 6, "yards_white": 339, "yards_blue": 329, "yards_white_alt": 308, "yards_red": 308},
    {"hole": 3, "par": 5, "stroke_index": 11, "yards_white": 481, "yards_blue": 460, "yards_white_alt": 450, "yards_red": 424},
    {"hole": 4, "par": 3, "stroke_index": 17, "yards_white": 141, "yards_blue": 131, "yards_white_alt": 118, "yards_red": 110},
    {"hole": 5, "par": 4, "stroke_index": 8, "yards_white": 329, "yards_blue": 320, "yards_white_alt": 307, "yards_red": 262},
    {"hole": 6, "par": 4, "stroke_index": 12, "yards_white": 356, "yards_blue": 345, "yards_white_alt": 325, "yards_red": 305},
    {"hole": 7, "par": 4, "stroke_index": 1, "yards_white": 415, "yards_blue": 395, "yards_white_alt": 384, "yards_red": 312},
    {"hole": 8, "par": 3, "stroke_index": 16, "yards_white": 176, "yards_blue": 166, "yards_white_alt": 154, "yards_red": 134},
    {"hole": 9, "par": 5, "stroke_index": 4, "yards_white": 487, "yards_blue": 480, "yards_white_alt": 456, "yards_red": 392},
    {"hole": 10, "par": 4, "stroke_index": 13, "yards_white": 359, "yards_blue": 343, "yards_white_alt": 322, "yards_red": 291},
    {"hole": 11, "par": 4, "stroke_index": 18, "yards_white": 303, "yards_blue": 298, "yards_white_alt": 274, "yards_red": 245},
    {"hole": 12, "par": 4, "stroke_index": 3, "yards_white": 406, "yards_blue": 376, "yards_white_alt": 356, "yards_red": 326},
    {"hole": 13, "par": 3, "stroke_index": 15, "yards_white": 162, "yards_blue": 152, "yards_white_alt": 141, "yards_red": 125},
    {"hole": 14, "par": 4, "stroke_index": 7, "yards_white": 329, "yards_blue": 313, "yards_white_alt": 296, "yards_red": 269},
    {"hole": 15, "par": 5, "stroke_index": 2, "yards_white": 524, "yards_blue": 505, "yards_white_alt": 474, "yards_red": 422},
    {"hole": 16, "par": 3, "stroke_index": 14, "yards_white": 197, "yards_blue": 181, "yards_white_alt": 163, "yards_red": 137},
    {"hole": 17, "par": 4, "stroke_index": 5, "yards_white": 340, "yards_blue": 325, "yards_white_alt": 272, "yards_red": 246},
    {"hole": 18, "par": 5, "stroke_index": 9, "yards_white": 471, "yards_blue": 459, "yards_white_alt": 445, "yards_red": 408}
  ]'::jsonb,
  '[
    {"name": "White", "color": "white", "rating": 72.0, "slope": 120, "yards": 6180},
    {"name": "Blue", "color": "blue", "rating": 71.0, "slope": 126, "yards": 5908},
    {"name": "White (Alt)", "color": "white", "rating": 69.0, "slope": 120, "yards": 5533},
    {"name": "Red", "color": "red", "rating": 71.0, "slope": 126, "yards": 5081}
  ]'::jsonb
)
ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name,
  tees = EXCLUDED.tees,
  holes = EXCLUDED.holes,
  updated_at = NOW();

-- ============================================================================
-- 3. TWIN WATERS GOLF CLUB
-- ============================================================================
INSERT INTO venues (id, source, name, state, city, address, phone, website, total_holes)
VALUES (
  'f2a3b4c5-d6e7-8901-abcd-500000000863',
  'manual',
  'Twin Waters Golf Club',
  'QLD',
  'Twin Waters',
  'Ocean Drive',
  NULL,
  'https://www.twinwatersgolf.com.au',
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
  'f2a3b4c5-d6e7-8901-abcd-500000000863',
  'Twin Waters Golf Club',
  'Parkland course opened 1991. Public access Sunshine Coast course.',
  126,
  72.0,
  '[
    {"hole": 1, "par": 5, "stroke_index_blue": 11, "stroke_index_red": 3, "yards_blue": 502, "yards_white": 482, "yards_red": 447},
    {"hole": 2, "par": 3, "stroke_index_blue": 9, "stroke_index_red": 18, "yards_blue": 166, "yards_white": 143, "yards_red": 109},
    {"hole": 3, "par": 4, "stroke_index_blue": 5, "stroke_index_red": 9, "yards_blue": 398, "yards_white": 347, "yards_red": 325},
    {"hole": 4, "par": 5, "stroke_index_blue": 7, "stroke_index_red": 5, "yards_blue": 472, "yards_white": 466, "yards_red": 431},
    {"hole": 5, "par": 4, "stroke_index_blue": 17, "stroke_index_red": 15, "yards_blue": 324, "yards_white": 312, "yards_red": 284},
    {"hole": 6, "par": 4, "stroke_index_blue": 15, "stroke_index_red": 11, "yards_blue": 310, "yards_white": 285, "yards_red": 272},
    {"hole": 7, "par": 3, "stroke_index_blue": 13, "stroke_index_red": 13, "yards_blue": 150, "yards_white": 137, "yards_red": 137},
    {"hole": 8, "par": 4, "stroke_index_blue": 1, "stroke_index_red": 7, "yards_blue": 379, "yards_white": 363, "yards_red": 275},
    {"hole": 9, "par": 4, "stroke_index_blue": 3, "stroke_index_red": 1, "yards_blue": 388, "yards_white": 369, "yards_red": 343},
    {"hole": 10, "par": 4, "stroke_index_blue": 18, "stroke_index_red": 14, "yards_blue": 337, "yards_white": 332, "yards_red": 302},
    {"hole": 11, "par": 3, "stroke_index_blue": 8, "stroke_index_red": 16, "yards_blue": 169, "yards_white": 145, "yards_red": 132},
    {"hole": 12, "par": 4, "stroke_index_blue": 16, "stroke_index_red": 17, "yards_blue": 325, "yards_white": 311, "yards_red": 275},
    {"hole": 13, "par": 4, "stroke_index_blue": 10, "stroke_index_red": 6, "yards_blue": 365, "yards_white": 322, "yards_red": 316},
    {"hole": 14, "par": 5, "stroke_index_blue": 14, "stroke_index_red": 10, "yards_blue": 495, "yards_white": 480, "yards_red": 404},
    {"hole": 15, "par": 4, "stroke_index_blue": 6, "stroke_index_red": 4, "yards_blue": 362, "yards_white": 347, "yards_red": 327},
    {"hole": 16, "par": 4, "stroke_index_blue": 2, "stroke_index_red": 2, "yards_blue": 377, "yards_white": 362, "yards_red": 313},
    {"hole": 17, "par": 3, "stroke_index_blue": 4, "stroke_index_red": 12, "yards_blue": 202, "yards_white": 184, "yards_red": 158},
    {"hole": 18, "par": 5, "stroke_index_blue": 12, "stroke_index_red": 8, "yards_blue": 462, "yards_white": 448, "yards_red": 410}
  ]'::jsonb,
  '[
    {"name": "Blue", "color": "blue", "rating": 72.0, "slope": 126, "yards": 6183},
    {"name": "White", "color": "white", "rating": 70.0, "slope": 125, "yards": 5835},
    {"name": "Red", "color": "red", "rating": 73.0, "slope": 121, "yards": 5260}
  ]'::jsonb
)
ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name,
  tees = EXCLUDED.tees,
  holes = EXCLUDED.holes,
  updated_at = NOW();

-- ============================================================================
-- 4. HEADLAND GOLF CLUB
-- ============================================================================
INSERT INTO venues (id, source, name, state, city, address, phone, website, total_holes)
VALUES (
  'f2a3b4c5-d6e7-8901-abcd-500000000864',
  'manual',
  'Headland Golf Club',
  'QLD',
  'Buderim',
  'Golf Links Road',
  NULL,
  'https://www.headlandgolf.com.au',
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
  'f2a3b4c5-d6e7-8901-abcd-500000000864',
  'Headland Golf Club',
  'Parkland course opened 1955. Historic Sunshine Coast club in Buderim.',
  120,
  72.0,
  '[
    {"hole": 1, "par": 4, "stroke_index": 6, "yards_white": 373},
    {"hole": 2, "par": 5, "stroke_index": 16, "yards_white": 468},
    {"hole": 3, "par": 4, "stroke_index": 2, "yards_white": 373},
    {"hole": 4, "par": 4, "stroke_index": 4, "yards_white": 353},
    {"hole": 5, "par": 3, "stroke_index": 12, "yards_white": 156},
    {"hole": 6, "par": 4, "stroke_index": 14, "yards_white": 333},
    {"hole": 7, "par": 5, "stroke_index": 8, "yards_white": 529},
    {"hole": 8, "par": 3, "stroke_index": 10, "yards_white": 167},
    {"hole": 9, "par": 4, "stroke_index": 18, "yards_white": 329},
    {"hole": 10, "par": 5, "stroke_index": 9, "yards_white": 501},
    {"hole": 11, "par": 4, "stroke_index": 15, "yards_white": 265},
    {"hole": 12, "par": 4, "stroke_index": 7, "yards_white": 341},
    {"hole": 13, "par": 5, "stroke_index": 17, "yards_white": 480},
    {"hole": 14, "par": 3, "stroke_index": 11, "yards_white": 161},
    {"hole": 15, "par": 4, "stroke_index": 1, "yards_white": 403},
    {"hole": 16, "par": 4, "stroke_index": 3, "yards_white": 388},
    {"hole": 17, "par": 4, "stroke_index": 5, "yards_white": 341},
    {"hole": 18, "par": 3, "stroke_index": 13, "yards_white": 144}
  ]'::jsonb,
  '[
    {"name": "White", "color": "white", "rating": 72.0, "slope": 120, "yards": 6105}
  ]'::jsonb
)
ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name,
  tees = EXCLUDED.tees,
  holes = EXCLUDED.holes,
  updated_at = NOW();

-- ============================================================================
-- 5. CALOUNDRA GOLF CLUB
-- ============================================================================
INSERT INTO venues (id, source, name, state, city, address, phone, website, total_holes)
VALUES (
  'f2a3b4c5-d6e7-8901-abcd-500000000865',
  'manual',
  'Caloundra Golf Club',
  'QLD',
  'Caloundra',
  'Caloundra Road',
  NULL,
  'https://www.caloundragolf.com.au',
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
  'f2a3b4c5-d6e7-8901-abcd-500000000865',
  'Caloundra Golf Club',
  'Parkland course with open guest policy. Located in Caloundra on the Sunshine Coast.',
  126,
  72.0,
  '[
    {"hole": 1, "par": 4, "stroke_index": 11, "yards_black": 341, "yards_blue": 322, "yards_white": 313, "yards_green": 316, "yards_red": 312},
    {"hole": 2, "par": 3, "stroke_index": 15, "yards_black": 156, "yards_blue": 139, "yards_white": 126, "yards_green": 136, "yards_red": 125},
    {"hole": 3, "par": 4, "stroke_index": 1, "yards_black": 385, "yards_blue": 372, "yards_white": 338, "yards_green": 306, "yards_red": 303},
    {"hole": 4, "par": 5, "stroke_index": 13, "yards_black": 515, "yards_blue": 491, "yards_white": 471, "yards_green": 382, "yards_red": 380},
    {"hole": 5, "par": 5, "stroke_index": 5, "yards_black": 480, "yards_blue": 460, "yards_white": 444, "yards_green": 450, "yards_red": 443},
    {"hole": 6, "par": 3, "stroke_index": 17, "yards_black": 145, "yards_blue": 132, "yards_white": 110, "yards_green": 115, "yards_red": 107},
    {"hole": 7, "par": 4, "stroke_index": 7, "yards_black": 360, "yards_blue": 352, "yards_white": 344, "yards_green": 346, "yards_red": 343},
    {"hole": 8, "par": 4, "stroke_index": 3, "yards_black": 373, "yards_blue": 361, "yards_white": 325, "yards_green": 370, "yards_red": 324},
    {"hole": 9, "par": 3, "stroke_index": 9, "yards_black": 175, "yards_blue": 165, "yards_white": 150, "yards_green": 149, "yards_red": 134},
    {"hole": 10, "par": 5, "stroke_index": 18, "yards_black": 449, "yards_blue": 440, "yards_white": 437, "yards_green": 434, "yards_red": 430},
    {"hole": 11, "par": 3, "stroke_index": 16, "yards_black": 148, "yards_blue": 141, "yards_white": 123, "yards_green": 140, "yards_red": 130},
    {"hole": 12, "par": 4, "stroke_index": 6, "yards_black": 368, "yards_blue": 337, "yards_white": 321, "yards_green": 335, "yards_red": 320},
    {"hole": 13, "par": 4, "stroke_index": 14, "yards_black": 277, "yards_blue": 270, "yards_white": 261, "yards_green": 269, "yards_red": 265},
    {"hole": 14, "par": 5, "stroke_index": 10, "yards_black": 510, "yards_blue": 493, "yards_white": 480, "yards_green": 433, "yards_red": 429},
    {"hole": 15, "par": 3, "stroke_index": 12, "yards_black": 158, "yards_blue": 154, "yards_white": 151, "yards_green": 153, "yards_red": 150},
    {"hole": 16, "par": 4, "stroke_index": 8, "yards_black": 352, "yards_blue": 341, "yards_white": 331, "yards_green": 340, "yards_red": 330},
    {"hole": 17, "par": 4, "stroke_index": 4, "yards_black": 369, "yards_blue": 359, "yards_white": 325, "yards_green": 295, "yards_red": 289},
    {"hole": 18, "par": 4, "stroke_index": 2, "yards_black": 394, "yards_blue": 387, "yards_white": 374, "yards_green": 394, "yards_red": 386}
  ]'::jsonb,
  '[
    {"name": "Black", "color": "black", "rating": 72.0, "slope": 126, "yards": 5955},
    {"name": "Blue", "color": "blue", "rating": 70.0, "slope": 124, "yards": 5716},
    {"name": "White", "color": "white", "rating": 69.0, "slope": 120, "yards": 5424},
    {"name": "Green", "color": "green", "rating": 74.0, "slope": 128, "yards": 5363},
    {"name": "Red", "color": "red", "rating": 73.0, "slope": 126, "yards": 5200}
  ]'::jsonb
)
ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name,
  tees = EXCLUDED.tees,
  holes = EXCLUDED.holes,
  updated_at = NOW();

-- ============================================================================
-- 6. NAMBOUR GOLF CLUB
-- ============================================================================
INSERT INTO venues (id, source, name, state, city, address, phone, website, total_holes)
VALUES (
  'f2a3b4c5-d6e7-8901-abcd-500000000866',
  'manual',
  'Nambour Golf Club',
  'QLD',
  'Nambour',
  'Nambour Connection Road',
  NULL,
  'https://www.nambourgolf.com.au',
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
  'f2a3b4c5-d6e7-8901-abcd-500000000866',
  'Nambour Golf Club',
  'Historic parkland course opened 1926. Located in Nambour hinterland.',
  NULL,
  NULL,
  '[
    {"hole": 1, "par": 4, "stroke_index": 1, "yards_blue": 287, "yards_white": 277, "yards_red": 285},
    {"hole": 2, "par": 3, "stroke_index": 3, "yards_blue": 147, "yards_white": 138, "yards_red": 135},
    {"hole": 3, "par": 4, "stroke_index": 5, "yards_blue": 256, "yards_white": 348, "yards_red": 348},
    {"hole": 4, "par": 4, "stroke_index": 7, "yards_blue": 286, "yards_white": 366, "yards_red": 366},
    {"hole": 5, "par": 4, "stroke_index": 9, "yards_blue": 417, "yards_white": 406, "yards_red": 406},
    {"hole": 6, "par": 3, "stroke_index": 11, "yards_blue": 120, "yards_white": 85, "yards_red": 85},
    {"hole": 7, "par": 5, "stroke_index": 13, "yards_blue": 451, "yards_white": 431, "yards_red": 378},
    {"hole": 8, "par": 3, "stroke_index": 15, "yards_blue": 130, "yards_white": 125, "yards_red": 123},
    {"hole": 9, "par": 4, "stroke_index": 17, "yards_blue": 276, "yards_white": 270, "yards_red": 265},
    {"hole": 10, "par": 3, "stroke_index": 2, "yards_blue": 145, "yards_white": 145, "yards_red": 145},
    {"hole": 11, "par": 5, "stroke_index": 4, "yards_blue": 440, "yards_white": 424, "yards_red": 400},
    {"hole": 12, "par": 4, "stroke_index": 6, "yards_blue": 393, "yards_white": 388, "yards_red": 302},
    {"hole": 13, "par": 4, "stroke_index": 8, "yards_blue": 313, "yards_white": 294, "yards_red": 294},
    {"hole": 14, "par": 3, "stroke_index": 10, "yards_blue": 195, "yards_white": 175, "yards_red": 170},
    {"hole": 15, "par": 4, "stroke_index": 12, "yards_blue": 295, "yards_white": 295, "yards_red": 295},
    {"hole": 16, "par": 4, "stroke_index": 14, "yards_blue": 350, "yards_white": 342, "yards_red": 317},
    {"hole": 17, "par": 3, "stroke_index": 16, "yards_blue": 150, "yards_white": 140, "yards_red": 125},
    {"hole": 18, "par": 4, "stroke_index": 18, "yards_blue": 322, "yards_white": 280, "yards_red": 280}
  ]'::jsonb,
  '[
    {"name": "Blue", "color": "blue", "rating": null, "slope": null, "yards": 4973},
    {"name": "White", "color": "white", "rating": null, "slope": null, "yards": 4929},
    {"name": "Red", "color": "red", "rating": null, "slope": null, "yards": 4719}
  ]'::jsonb
)
ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name,
  tees = EXCLUDED.tees,
  holes = EXCLUDED.holes,
  updated_at = NOW();

-- ============================================================================
-- 7. COOROY GOLF CLUB
-- ============================================================================
INSERT INTO venues (id, source, name, state, city, address, phone, website, total_holes)
VALUES (
  'f2a3b4c5-d6e7-8901-abcd-500000000867',
  'manual',
  'Cooroy Golf Club',
  'QLD',
  'Cooroy',
  'Lake Macdonald Drive',
  NULL,
  'https://www.cooroygolf.com.au',
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
  'f2a3b4c5-d6e7-8901-abcd-500000000867',
  'Cooroy Golf Club',
  'Parkland course opened 1936. Open guest policy. Noosa hinterland location.',
  118,
  68.0,
  '[
    {"hole": 1, "par": 4, "stroke_index": 18, "yards_blue": 267, "yards_white": 266, "yards_red": 266, "yards_black": 259},
    {"hole": 2, "par": 4, "stroke_index": 6, "yards_blue": 358, "yards_white": 353, "yards_red": 353, "yards_black": 320},
    {"hole": 3, "par": 4, "stroke_index": 4, "yards_blue": 347, "yards_white": 334, "yards_red": 270, "yards_black": 261},
    {"hole": 4, "par": 3, "stroke_index": 10, "yards_blue": 176, "yards_white": 164, "yards_red": 160, "yards_black": 150},
    {"hole": 5, "par": 4, "stroke_index": 8, "yards_blue": 332, "yards_white": 326, "yards_red": 292, "yards_black": 290},
    {"hole": 6, "par": 3, "stroke_index": 14, "yards_blue": 173, "yards_white": 160, "yards_red": 155, "yards_black": 145},
    {"hole": 7, "par": 3, "stroke_index": 12, "yards_blue": 166, "yards_white": 155, "yards_red": 135, "yards_black": 125},
    {"hole": 8, "par": 4, "stroke_index": 16, "yards_blue": 269, "yards_white": 261, "yards_red": 266, "yards_black": 261},
    {"hole": 9, "par": 4, "stroke_index": 2, "yards_blue": 307, "yards_white": 297, "yards_red": 276, "yards_black": 276},
    {"hole": 10, "par": 3, "stroke_index": 9, "yards_blue": 164, "yards_white": 150, "yards_red": 146, "yards_black": 146},
    {"hole": 11, "par": 5, "stroke_index": 1, "yards_blue": 482, "yards_white": 474, "yards_red": 430, "yards_black": 421},
    {"hole": 12, "par": 3, "stroke_index": 17, "yards_blue": 139, "yards_white": 131, "yards_red": 108, "yards_black": 96},
    {"hole": 13, "par": 4, "stroke_index": 15, "yards_blue": 250, "yards_white": 244, "yards_red": 230, "yards_black": 230},
    {"hole": 14, "par": 5, "stroke_index": 7, "yards_blue": 505, "yards_white": 498, "yards_red": 461, "yards_black": 461},
    {"hole": 15, "par": 3, "stroke_index": 11, "yards_blue": 158, "yards_white": 146, "yards_red": 120, "yards_black": 119},
    {"hole": 16, "par": 5, "stroke_index": 13, "yards_blue": 465, "yards_white": 449, "yards_red": 415, "yards_black": 407},
    {"hole": 17, "par": 4, "stroke_index": 3, "yards_blue": 334, "yards_white": 322, "yards_red": 284, "yards_black": 275},
    {"hole": 18, "par": 5, "stroke_index": 5, "yards_blue": 467, "yards_white": 454, "yards_red": 389, "yards_black": 383}
  ]'::jsonb,
  '[
    {"name": "Blue", "color": "blue", "rating": 68.0, "slope": 118, "yards": 5359},
    {"name": "White", "color": "white", "rating": 67.0, "slope": 113, "yards": 5184},
    {"name": "Red", "color": "red", "rating": 70.0, "slope": 117, "yards": 4756},
    {"name": "Black", "color": "black", "rating": 70.0, "slope": 115, "yards": 4625}
  ]'::jsonb
)
ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name,
  tees = EXCLUDED.tees,
  holes = EXCLUDED.holes,
  updated_at = NOW();

-- ============================================================================
-- 8. BEERWAH GOLF CLUB
-- ============================================================================
INSERT INTO venues (id, source, name, state, city, address, phone, website, total_holes)
VALUES (
  'f2a3b4c5-d6e7-8901-abcd-500000000868',
  'manual',
  'Beerwah Golf Club',
  'QLD',
  'Beerwah',
  'Beerwah Street',
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
  'f2a3b4c5-d6e7-8901-abcd-500000000868',
  'Beerwah Golf Club',
  'Parkland course with open guest policy. Located in the Glass House Mountains region.',
  127,
  72.0,
  '[
    {"hole": 1, "par": 4, "stroke_index": 6, "yards_blue": 363, "yards_white": 348, "yards_gold": 338, "yards_red": 333},
    {"hole": 2, "par": 3, "stroke_index": 13, "yards_blue": 164, "yards_white": 153, "yards_gold": 144, "yards_red": 144},
    {"hole": 3, "par": 4, "stroke_index": 2, "yards_blue": 386, "yards_white": 372, "yards_gold": 329, "yards_red": 331},
    {"hole": 4, "par": 4, "stroke_index": 16, "yards_blue": 314, "yards_white": 304, "yards_gold": 289, "yards_red": 289},
    {"hole": 5, "par": 3, "stroke_index": 18, "yards_blue": 162, "yards_white": 135, "yards_gold": 125, "yards_red": 125},
    {"hole": 6, "par": 4, "stroke_index": 4, "yards_blue": 356, "yards_white": 343, "yards_gold": 330, "yards_red": 291},
    {"hole": 7, "par": 5, "stroke_index": 12, "yards_blue": 471, "yards_white": 463, "yards_gold": 428, "yards_red": 424},
    {"hole": 8, "par": 5, "stroke_index": 8, "yards_blue": 489, "yards_white": 475, "yards_gold": 437, "yards_red": 437},
    {"hole": 9, "par": 4, "stroke_index": 15, "yards_blue": 330, "yards_white": 330, "yards_gold": 265, "yards_red": 262},
    {"hole": 10, "par": 4, "stroke_index": 1, "yards_blue": 339, "yards_white": 329, "yards_gold": 323, "yards_red": 298},
    {"hole": 11, "par": 5, "stroke_index": 3, "yards_blue": 493, "yards_white": 486, "yards_gold": 460, "yards_red": 409},
    {"hole": 12, "par": 4, "stroke_index": 5, "yards_blue": 368, "yards_white": 353, "yards_gold": 309, "yards_red": 344},
    {"hole": 13, "par": 4, "stroke_index": 14, "yards_blue": 315, "yards_white": 305, "yards_gold": 294, "yards_red": 301},
    {"hole": 14, "par": 4, "stroke_index": 9, "yards_blue": 348, "yards_white": 338, "yards_gold": 308, "yards_red": 302},
    {"hole": 15, "par": 5, "stroke_index": 11, "yards_blue": 504, "yards_white": 494, "yards_gold": 467, "yards_red": 456},
    {"hole": 16, "par": 3, "stroke_index": 17, "yards_blue": 144, "yards_white": 134, "yards_gold": 119, "yards_red": 125},
    {"hole": 17, "par": 4, "stroke_index": 10, "yards_blue": 351, "yards_white": 343, "yards_gold": 338, "yards_red": 299},
    {"hole": 18, "par": 4, "stroke_index": 7, "yards_blue": 189, "yards_white": 182, "yards_gold": 182, "yards_red": 144}
  ]'::jsonb,
  '[
    {"name": "Blue", "color": "blue", "rating": 72.0, "slope": 127, "yards": 6086},
    {"name": "White", "color": "white", "rating": 71.0, "slope": 125, "yards": 5887},
    {"name": "Gold", "color": "gold", "rating": 69.0, "slope": 120, "yards": 5485},
    {"name": "Red", "color": "red", "rating": 74.0, "slope": 121, "yards": 5314}
  ]'::jsonb
)
ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name,
  tees = EXCLUDED.tees,
  holes = EXCLUDED.holes,
  updated_at = NOW();
