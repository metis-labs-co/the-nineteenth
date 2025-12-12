-- QLD Batch 4: Gold Coast
-- 10 courses with full hole-by-hole data
-- Source: golfify.io
-- Generated: 2025-12-11

-- ============================================================================
-- 1. THE GLADES GOLF CLUB
-- ============================================================================
INSERT INTO venues (id, source, name, state, city, address, phone, website, total_holes)
VALUES (
  'f2a3b4c5-d6e7-8901-abcd-500000000851',
  'manual',
  'The Glades Golf Club',
  'QLD',
  'Robina',
  '1 Glades Drive',
  NULL,
  'https://www.thegladesgolfclub.com.au',
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
  'f2a3b4c5-d6e7-8901-abcd-500000000851',
  'The Glades Golf Club',
  'Championship parkland course opened 2000. Host of Australian PGA Championship. Located in Robina on the Gold Coast.',
  133,
  73.0,
  '[
    {"hole": 1, "par": 4, "stroke_index": 18, "yards_black": 328, "yards_white": 302, "yards_grey": 260},
    {"hole": 2, "par": 4, "stroke_index": 4, "yards_black": 403, "yards_white": 371, "yards_grey": 342},
    {"hole": 3, "par": 3, "stroke_index": 14, "yards_black": 178, "yards_white": 148, "yards_grey": 132},
    {"hole": 4, "par": 4, "stroke_index": 12, "yards_black": 332, "yards_white": 292, "yards_grey": 254},
    {"hole": 5, "par": 3, "stroke_index": 10, "yards_black": 173, "yards_white": 133, "yards_grey": 120},
    {"hole": 6, "par": 5, "stroke_index": 16, "yards_black": 470, "yards_white": 440, "yards_grey": 399},
    {"hole": 7, "par": 5, "stroke_index": 8, "yards_black": 526, "yards_white": 503, "yards_grey": 417},
    {"hole": 8, "par": 4, "stroke_index": 6, "yards_black": 389, "yards_white": 366, "yards_grey": 281},
    {"hole": 9, "par": 4, "stroke_index": 2, "yards_black": 398, "yards_white": 379, "yards_grey": 339},
    {"hole": 10, "par": 4, "stroke_index": 7, "yards_black": 355, "yards_white": 327, "yards_grey": 300},
    {"hole": 11, "par": 5, "stroke_index": 15, "yards_black": 480, "yards_white": 453, "yards_grey": 419},
    {"hole": 12, "par": 5, "stroke_index": 13, "yards_black": 492, "yards_white": 446, "yards_grey": 396},
    {"hole": 13, "par": 3, "stroke_index": 11, "yards_black": 206, "yards_white": 167, "yards_grey": 117},
    {"hole": 14, "par": 4, "stroke_index": 5, "yards_black": 403, "yards_white": 381, "yards_grey": 313},
    {"hole": 15, "par": 4, "stroke_index": 3, "yards_black": 428, "yards_white": 356, "yards_grey": 328},
    {"hole": 16, "par": 4, "stroke_index": 17, "yards_black": 306, "yards_white": 278, "yards_grey": 219},
    {"hole": 17, "par": 3, "stroke_index": 9, "yards_black": 147, "yards_white": 139, "yards_grey": 108},
    {"hole": 18, "par": 4, "stroke_index": 1, "yards_black": 417, "yards_white": 395, "yards_grey": 341}
  ]'::jsonb,
  '[
    {"name": "Black", "color": "black", "rating": 73.0, "slope": 133, "yards": 6431},
    {"name": "White", "color": "white", "rating": 70.0, "slope": 122, "yards": 5876},
    {"name": "Grey", "color": "grey", "rating": 71.0, "slope": 125, "yards": 5085}
  ]'::jsonb
)
ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name,
  tees = EXCLUDED.tees,
  holes = EXCLUDED.holes,
  updated_at = NOW();

-- ============================================================================
-- 2. LAKELANDS GOLF CLUB (Jack Nicklaus Design)
-- ============================================================================
INSERT INTO venues (id, source, name, state, city, address, phone, website, total_holes)
VALUES (
  'f2a3b4c5-d6e7-8901-abcd-500000000852',
  'manual',
  'Lakelands Golf Club',
  'QLD',
  'Merrimac',
  '100 Lakelands Drive',
  NULL,
  'https://www.lakelandsgolfclub.com.au',
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
  'f2a3b4c5-d6e7-8901-abcd-500000000852',
  'Lakelands Golf Club',
  'Jack Nicklaus designed championship course opened 1996. Open guest policy. One of Australia''s top public access courses.',
  138,
  74.1,
  '[
    {"hole": 1, "par": 4, "stroke_index_black": 5, "stroke_index_blue": 2, "stroke_index_white": 2, "stroke_index_red": 8, "stroke_index_yellow": 8, "yards_black": 392, "yards_blue": 373, "yards_white": 354, "yards_red": 316, "yards_yellow": 268},
    {"hole": 2, "par": 5, "stroke_index_black": 15, "stroke_index_blue": 18, "stroke_index_white": 18, "stroke_index_red": 14, "stroke_index_yellow": 14, "yards_black": 494, "yards_blue": 478, "yards_white": 462, "yards_red": 423, "yards_yellow": 401},
    {"hole": 3, "par": 3, "stroke_index_black": 16, "stroke_index_blue": 16, "stroke_index_white": 16, "stroke_index_red": 16, "stroke_index_yellow": 16, "yards_black": 161, "yards_blue": 145, "yards_white": 128, "yards_red": 121, "yards_yellow": 107},
    {"hole": 4, "par": 4, "stroke_index_black": 6, "stroke_index_blue": 4, "stroke_index_white": 4, "stroke_index_red": 3, "stroke_index_yellow": 3, "yards_black": 384, "yards_blue": 355, "yards_white": 327, "yards_red": 316, "yards_yellow": 282},
    {"hole": 5, "par": 5, "stroke_index_black": 14, "stroke_index_blue": 14, "stroke_index_white": 14, "stroke_index_red": 12, "stroke_index_yellow": 12, "yards_black": 503, "yards_blue": 481, "yards_white": 462, "yards_red": 422, "yards_yellow": 381},
    {"hole": 6, "par": 3, "stroke_index_black": 10, "stroke_index_blue": 10, "stroke_index_white": 10, "stroke_index_red": 18, "stroke_index_yellow": 18, "yards_black": 172, "yards_blue": 152, "yards_white": 136, "yards_red": 121, "yards_yellow": 91},
    {"hole": 7, "par": 4, "stroke_index_black": 12, "stroke_index_blue": 12, "stroke_index_white": 12, "stroke_index_red": 10, "stroke_index_yellow": 10, "yards_black": 347, "yards_blue": 332, "yards_white": 311, "yards_red": 291, "yards_yellow": 249},
    {"hole": 8, "par": 4, "stroke_index_black": 9, "stroke_index_blue": 6, "stroke_index_white": 6, "stroke_index_red": 7, "stroke_index_yellow": 7, "yards_black": 342, "yards_blue": 324, "yards_white": 309, "yards_red": 286, "yards_yellow": 236},
    {"hole": 9, "par": 4, "stroke_index_black": 11, "stroke_index_blue": 8, "stroke_index_white": 8, "stroke_index_red": 5, "stroke_index_yellow": 5, "yards_black": 366, "yards_blue": 350, "yards_white": 332, "yards_red": 297, "yards_yellow": 276},
    {"hole": 10, "par": 4, "stroke_index_black": 3, "stroke_index_blue": 5, "stroke_index_white": 5, "stroke_index_red": 4, "stroke_index_yellow": 4, "yards_black": 384, "yards_blue": 370, "yards_white": 347, "yards_red": 321, "yards_yellow": 265},
    {"hole": 11, "par": 5, "stroke_index_black": 13, "stroke_index_blue": 13, "stroke_index_white": 13, "stroke_index_red": 13, "stroke_index_yellow": 13, "yards_black": 498, "yards_blue": 481, "yards_white": 466, "yards_red": 436, "yards_yellow": 400},
    {"hole": 12, "par": 4, "stroke_index_black": 2, "stroke_index_blue": 3, "stroke_index_white": 3, "stroke_index_red": 6, "stroke_index_yellow": 6, "yards_black": 397, "yards_blue": 378, "yards_white": 363, "yards_red": 321, "yards_yellow": 282},
    {"hole": 13, "par": 4, "stroke_index_black": 7, "stroke_index_blue": 9, "stroke_index_white": 9, "stroke_index_red": 1, "stroke_index_yellow": 1, "yards_black": 401, "yards_blue": 384, "yards_white": 373, "yards_red": 339, "yards_yellow": 305},
    {"hole": 14, "par": 3, "stroke_index_black": 17, "stroke_index_blue": 15, "stroke_index_white": 15, "stroke_index_red": 17, "stroke_index_yellow": 17, "yards_black": 133, "yards_blue": 117, "yards_white": 101, "yards_red": 89, "yards_yellow": 72},
    {"hole": 15, "par": 4, "stroke_index_black": 8, "stroke_index_blue": 11, "stroke_index_white": 11, "stroke_index_red": 11, "stroke_index_yellow": 11, "yards_black": 396, "yards_blue": 374, "yards_white": 351, "yards_red": 310, "yards_yellow": 273},
    {"hole": 16, "par": 5, "stroke_index_black": 18, "stroke_index_blue": 17, "stroke_index_white": 17, "stroke_index_red": 15, "stroke_index_yellow": 15, "yards_black": 495, "yards_blue": 471, "yards_white": 455, "yards_red": 442, "yards_yellow": 380},
    {"hole": 17, "par": 3, "stroke_index_black": 4, "stroke_index_blue": 7, "stroke_index_white": 7, "stroke_index_red": 9, "stroke_index_yellow": 9, "yards_black": 210, "yards_blue": 188, "yards_white": 172, "yards_red": 156, "yards_yellow": 129},
    {"hole": 18, "par": 4, "stroke_index_black": 1, "stroke_index_blue": 1, "stroke_index_white": 1, "stroke_index_red": 2, "stroke_index_yellow": 2, "yards_black": 414, "yards_blue": 389, "yards_white": 365, "yards_red": 327, "yards_yellow": 288}
  ]'::jsonb,
  '[
    {"name": "Black", "color": "black", "rating": 74.1, "slope": 138, "yards": 6489},
    {"name": "Blue", "color": "blue", "rating": 72.0, "slope": 136, "yards": 6142},
    {"name": "White", "color": "white", "rating": 70.3, "slope": 132, "yards": 5814},
    {"name": "Red", "color": "red", "rating": 73.3, "slope": 129, "yards": 5334},
    {"name": "Yellow", "color": "yellow", "rating": 67.0, "slope": 120, "yards": 4685}
  ]'::jsonb
)
ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name,
  tees = EXCLUDED.tees,
  holes = EXCLUDED.holes,
  updated_at = NOW();

-- ============================================================================
-- 3. EMERALD LAKES GOLF CLUB (Graham Marsh Design)
-- ============================================================================
INSERT INTO venues (id, source, name, state, city, address, phone, website, total_holes)
VALUES (
  'f2a3b4c5-d6e7-8901-abcd-500000000853',
  'manual',
  'Emerald Lakes Golf Club',
  'QLD',
  'Carrara',
  'Nerang Broadbeach Road',
  NULL,
  'https://www.emeraldlakesgolf.com.au',
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
  'f2a3b4c5-d6e7-8901-abcd-500000000853',
  'Emerald Lakes Golf Club',
  'Graham Marsh designed parkland course opened 1995. Public access course with water features throughout.',
  117,
  69.0,
  '[
    {"hole": 1, "par": 4, "stroke_index_blue": 1, "stroke_index_white": 8, "stroke_index_red": 8, "yards_blue": 317, "yards_white": 304, "yards_red": 286},
    {"hole": 2, "par": 5, "stroke_index_blue": 3, "stroke_index_white": 14, "stroke_index_red": 10, "yards_blue": 440, "yards_white": 428, "yards_red": 397},
    {"hole": 3, "par": 3, "stroke_index_blue": 5, "stroke_index_white": 10, "stroke_index_red": 15, "yards_blue": 171, "yards_white": 150, "yards_red": 134},
    {"hole": 4, "par": 5, "stroke_index_blue": 7, "stroke_index_white": 6, "stroke_index_red": 5, "yards_blue": 447, "yards_white": 427, "yards_red": 398},
    {"hole": 5, "par": 3, "stroke_index_blue": 9, "stroke_index_white": 16, "stroke_index_red": 18, "yards_blue": 134, "yards_white": 123, "yards_red": 99},
    {"hole": 6, "par": 5, "stroke_index_blue": 11, "stroke_index_white": 2, "stroke_index_red": 2, "yards_blue": 451, "yards_white": 438, "yards_red": 413},
    {"hole": 7, "par": 4, "stroke_index_blue": 13, "stroke_index_white": 4, "stroke_index_red": 6, "yards_blue": 376, "yards_white": 358, "yards_red": 355},
    {"hole": 8, "par": 3, "stroke_index_blue": 15, "stroke_index_white": 12, "stroke_index_red": 17, "yards_blue": 134, "yards_white": 121, "yards_red": 101},
    {"hole": 9, "par": 4, "stroke_index_blue": 17, "stroke_index_white": 18, "stroke_index_red": 13, "yards_blue": 294, "yards_white": 277, "yards_red": 259},
    {"hole": 10, "par": 4, "stroke_index_blue": 2, "stroke_index_white": 15, "stroke_index_red": 14, "yards_blue": 305, "yards_white": 288, "yards_red": 264},
    {"hole": 11, "par": 4, "stroke_index_blue": 4, "stroke_index_white": 7, "stroke_index_red": 12, "yards_blue": 338, "yards_white": 284, "yards_red": 272},
    {"hole": 12, "par": 5, "stroke_index_blue": 6, "stroke_index_white": 3, "stroke_index_red": 1, "yards_blue": 491, "yards_white": 469, "yards_red": 443},
    {"hole": 13, "par": 3, "stroke_index_blue": 8, "stroke_index_white": 17, "stroke_index_red": 16, "yards_blue": 132, "yards_white": 122, "yards_red": 116},
    {"hole": 14, "par": 5, "stroke_index_blue": 10, "stroke_index_white": 5, "stroke_index_red": 3, "yards_blue": 471, "yards_white": 446, "yards_red": 415},
    {"hole": 15, "par": 4, "stroke_index_blue": 12, "stroke_index_white": 13, "stroke_index_red": 9, "yards_blue": 367, "yards_white": 346, "yards_red": 328},
    {"hole": 16, "par": 4, "stroke_index_blue": 14, "stroke_index_white": 1, "stroke_index_red": 7, "yards_blue": 385, "yards_white": 367, "yards_red": 324},
    {"hole": 17, "par": 3, "stroke_index_blue": 16, "stroke_index_white": 11, "stroke_index_red": 11, "yards_blue": 198, "yards_white": 178, "yards_red": 157},
    {"hole": 18, "par": 4, "stroke_index_blue": 18, "stroke_index_white": 9, "stroke_index_red": 4, "yards_blue": 356, "yards_white": 338, "yards_red": 325}
  ]'::jsonb,
  '[
    {"name": "Blue", "color": "blue", "rating": 69.0, "slope": 117, "yards": 5807},
    {"name": "White", "color": "white", "rating": 68.0, "slope": 113, "yards": 5464},
    {"name": "Red", "color": "red", "rating": 71.0, "slope": 118, "yards": 5086}
  ]'::jsonb
)
ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name,
  tees = EXCLUDED.tees,
  holes = EXCLUDED.holes,
  updated_at = NOW();

-- ============================================================================
-- 4. PALM MEADOWS GOLF COURSE
-- ============================================================================
INSERT INTO venues (id, source, name, state, city, address, phone, website, total_holes)
VALUES (
  'f2a3b4c5-d6e7-8901-abcd-500000000854',
  'manual',
  'Palm Meadows Golf Course',
  'QLD',
  'Carrara',
  'Palm Meadows Drive',
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
  'f2a3b4c5-d6e7-8901-abcd-500000000854',
  'Palm Meadows Golf Course',
  'Parkland course opened 1987. Public access Gold Coast course.',
  126,
  73.0,
  '[
    {"hole": 1, "par": 4, "stroke_index_blue": 5, "stroke_index_red": 10, "yards_blue": 353, "yards_red": 283},
    {"hole": 2, "par": 4, "stroke_index_blue": 15, "stroke_index_red": 8, "yards_blue": 331, "yards_red": 286},
    {"hole": 3, "par": 5, "stroke_index_blue": 17, "stroke_index_red": 6, "yards_blue": 486, "yards_red": 432},
    {"hole": 4, "par": 4, "stroke_index_blue": 1, "stroke_index_red": 2, "yards_blue": 392, "yards_red": 327},
    {"hole": 5, "par": 3, "stroke_index_blue": 11, "stroke_index_red": 18, "yards_blue": 167, "yards_red": 110},
    {"hole": 6, "par": 4, "stroke_index_blue": 7, "stroke_index_red": 14, "yards_blue": 367, "yards_red": 260},
    {"hole": 7, "par": 4, "stroke_index_blue": 3, "stroke_index_red": 4, "yards_blue": 401, "yards_red": 333},
    {"hole": 8, "par": 3, "stroke_index_blue": 9, "stroke_index_red": 16, "yards_blue": 179, "yards_red": 143},
    {"hole": 9, "par": 5, "stroke_index_blue": 13, "stroke_index_red": 12, "yards_blue": 480, "yards_red": 400},
    {"hole": 10, "par": 4, "stroke_index_blue": 6, "stroke_index_red": 3, "yards_blue": 382, "yards_red": 350},
    {"hole": 11, "par": 3, "stroke_index_blue": 16, "stroke_index_red": 11, "yards_blue": 161, "yards_red": 135},
    {"hole": 12, "par": 4, "stroke_index_blue": 4, "stroke_index_red": 13, "yards_blue": 379, "yards_red": 322},
    {"hole": 13, "par": 4, "stroke_index_blue": 18, "stroke_index_red": 15, "yards_blue": 331, "yards_red": 293},
    {"hole": 14, "par": 4, "stroke_index_blue": 12, "stroke_index_red": 9, "yards_blue": 360, "yards_red": 317},
    {"hole": 15, "par": 5, "stroke_index_blue": 14, "stroke_index_red": 7, "yards_blue": 475, "yards_red": 409},
    {"hole": 16, "par": 4, "stroke_index_blue": 2, "stroke_index_red": 5, "yards_blue": 387, "yards_red": 344},
    {"hole": 17, "par": 3, "stroke_index_blue": 10, "stroke_index_red": 17, "yards_blue": 165, "yards_red": 124},
    {"hole": 18, "par": 5, "stroke_index_blue": 8, "stroke_index_red": 1, "yards_blue": 523, "yards_red": 449}
  ]'::jsonb,
  '[
    {"name": "Blue", "color": "blue", "rating": 73.0, "slope": 126, "yards": 6319},
    {"name": "Red", "color": "red", "rating": 73.0, "slope": 120, "yards": 5317}
  ]'::jsonb
)
ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name,
  tees = EXCLUDED.tees,
  holes = EXCLUDED.holes,
  updated_at = NOW();

-- ============================================================================
-- 5. SURFERS PARADISE GOLF CLUB
-- ============================================================================
INSERT INTO venues (id, source, name, state, city, address, phone, website, total_holes)
VALUES (
  'f2a3b4c5-d6e7-8901-abcd-500000000855',
  'manual',
  'Surfers Paradise Golf Club',
  'QLD',
  'Clear Island Waters',
  'Dorado Drive',
  NULL,
  'https://www.surfersparadisegolf.com.au',
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
  'f2a3b4c5-d6e7-8901-abcd-500000000855',
  'Surfers Paradise Golf Club',
  'Parkland course opened 1967. Located at Clear Island Waters on the Gold Coast.',
  NULL,
  70.0,
  '[
    {"hole": 1, "par": 4, "stroke_index": 7, "yards_blue": 352, "yards_white": 312, "yards_red": 314},
    {"hole": 2, "par": 3, "stroke_index": 14, "yards_blue": 150, "yards_white": 126, "yards_red": 133},
    {"hole": 3, "par": 5, "stroke_index": 3, "yards_blue": 532, "yards_white": 518, "yards_red": 464},
    {"hole": 4, "par": 4, "stroke_index": 5, "yards_blue": 380, "yards_white": 352, "yards_red": 310},
    {"hole": 5, "par": 3, "stroke_index": 10, "yards_blue": 151, "yards_white": 135, "yards_red": 119},
    {"hole": 6, "par": 4, "stroke_index": 18, "yards_blue": 256, "yards_white": 237, "yards_red": 244},
    {"hole": 7, "par": 3, "stroke_index": 11, "yards_blue": 155, "yards_white": 133, "yards_red": 137},
    {"hole": 8, "par": 4, "stroke_index": 1, "yards_blue": 410, "yards_white": 383, "yards_red": 403},
    {"hole": 9, "par": 5, "stroke_index": 16, "yards_blue": 432, "yards_white": 418, "yards_red": 418},
    {"hole": 10, "par": 4, "stroke_index": 9, "yards_blue": 373, "yards_white": 344, "yards_red": 358},
    {"hole": 11, "par": 4, "stroke_index": 2, "yards_blue": 373, "yards_white": 345, "yards_red": 344},
    {"hole": 12, "par": 4, "stroke_index": 4, "yards_blue": 360, "yards_white": 323, "yards_red": 333},
    {"hole": 13, "par": 4, "stroke_index": 17, "yards_blue": 322, "yards_white": 265, "yards_red": 271},
    {"hole": 14, "par": 4, "stroke_index": 6, "yards_blue": 354, "yards_white": 314, "yards_red": 325},
    {"hole": 15, "par": 4, "stroke_index": 8, "yards_blue": 372, "yards_white": 337, "yards_red": 343},
    {"hole": 16, "par": 3, "stroke_index": 13, "yards_blue": 141, "yards_white": 120, "yards_red": 129},
    {"hole": 17, "par": 4, "stroke_index": 12, "yards_blue": 313, "yards_white": 263, "yards_red": 256},
    {"hole": 18, "par": 5, "stroke_index": 15, "yards_blue": 469, "yards_white": 436, "yards_red": 444}
  ]'::jsonb,
  '[
    {"name": "Blue", "color": "blue", "rating": 70.0, "slope": null, "yards": 5895},
    {"name": "White", "color": "white", "rating": 67.0, "slope": null, "yards": 5361},
    {"name": "Red", "color": "red", "rating": 73.0, "slope": null, "yards": 5345}
  ]'::jsonb
)
ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name,
  tees = EXCLUDED.tees,
  holes = EXCLUDED.holes,
  updated_at = NOW();

-- ============================================================================
-- 6. SOUTHPORT GOLF CLUB
-- ============================================================================
INSERT INTO venues (id, source, name, state, city, address, phone, website, total_holes)
VALUES (
  'f2a3b4c5-d6e7-8901-abcd-500000000856',
  'manual',
  'Southport Golf Club',
  'QLD',
  'Southport',
  'Slatyer Avenue',
  NULL,
  'https://www.southportgolfclub.com.au',
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
  'f2a3b4c5-d6e7-8901-abcd-500000000856',
  'Southport Golf Club',
  'Historic parkland course opened 1924. One of the oldest clubs on the Gold Coast.',
  NULL,
  NULL,
  '[
    {"hole": 1, "par_black": 5, "par_red": 5, "stroke_index_black": 18, "stroke_index_red": 10, "yards_black": 445, "yards_red": 427},
    {"hole": 2, "par_black": 3, "par_red": 3, "stroke_index_black": 10, "stroke_index_red": 14, "yards_black": 153, "yards_red": 117},
    {"hole": 3, "par_black": 4, "par_red": 4, "stroke_index_black": 4, "stroke_index_red": 6, "yards_black": 352, "yards_red": 285},
    {"hole": 4, "par_black": 4, "par_red": 4, "stroke_index_black": 6, "stroke_index_red": 8, "yards_black": 381, "yards_red": 320},
    {"hole": 5, "par_black": 5, "par_red": 5, "stroke_index_black": 14, "stroke_index_red": 12, "yards_black": 476, "yards_red": 434},
    {"hole": 6, "par_black": 4, "par_red": 4, "stroke_index_black": 8, "stroke_index_red": 4, "yards_black": 330, "yards_red": 316},
    {"hole": 7, "par_black": 3, "par_red": 3, "stroke_index_black": 16, "stroke_index_red": 16, "yards_black": 127, "yards_red": 117},
    {"hole": 8, "par_black": 5, "par_red": 5, "stroke_index_black": 12, "stroke_index_red": 2, "yards_black": 479, "yards_red": 437},
    {"hole": 9, "par_black": 4, "par_red": 5, "stroke_index_black": 2, "stroke_index_red": 18, "yards_black": 386, "yards_red": 376},
    {"hole": 10, "par_black": 4, "par_red": 4, "stroke_index_black": 17, "stroke_index_red": 13, "yards_black": 316, "yards_red": 292},
    {"hole": 11, "par_black": 4, "par_red": 4, "stroke_index_black": 5, "stroke_index_red": 5, "yards_black": 341, "yards_red": 330},
    {"hole": 12, "par_black": 3, "par_red": 3, "stroke_index_black": 7, "stroke_index_red": 9, "yards_black": 184, "yards_red": 157},
    {"hole": 13, "par_black": 5, "par_red": 5, "stroke_index_black": 9, "stroke_index_red": 3, "yards_black": 452, "yards_red": 414},
    {"hole": 14, "par_black": 3, "par_red": 3, "stroke_index_black": 11, "stroke_index_red": 15, "yards_black": 159, "yards_red": 130},
    {"hole": 15, "par_black": 4, "par_red": 4, "stroke_index_black": 13, "stroke_index_red": 7, "yards_black": 318, "yards_red": 303},
    {"hole": 16, "par_black": 3, "par_red": 3, "stroke_index_black": 15, "stroke_index_red": 17, "yards_black": 169, "yards_red": 139},
    {"hole": 17, "par_black": 4, "par_red": 5, "stroke_index_black": 1, "stroke_index_red": 11, "yards_black": 383, "yards_red": 368},
    {"hole": 18, "par_black": 4, "par_red": 4, "stroke_index_black": 3, "stroke_index_red": 1, "yards_black": 365, "yards_red": 350}
  ]'::jsonb,
  '[
    {"name": "Black", "color": "black", "rating": null, "slope": null, "yards": 5816},
    {"name": "Red", "color": "red", "rating": null, "slope": null, "yards": 5312}
  ]'::jsonb
)
ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name,
  tees = EXCLUDED.tees,
  holes = EXCLUDED.holes,
  updated_at = NOW();

-- ============================================================================
-- 7. PARKWOOD INTERNATIONAL GOLF COURSE
-- ============================================================================
INSERT INTO venues (id, source, name, state, city, address, phone, website, total_holes)
VALUES (
  'f2a3b4c5-d6e7-8901-abcd-500000000857',
  'manual',
  'Parkwood International Golf Course',
  'QLD',
  'Parkwood',
  'Napper Road',
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
  'f2a3b4c5-d6e7-8901-abcd-500000000857',
  'Parkwood International Golf Course',
  'Parkland course with open guest policy. Public access Gold Coast course.',
  119,
  70.0,
  '[
    {"hole": 1, "par": 4, "stroke_index_black": 10, "stroke_index_blue": 10, "stroke_index_white": 10, "stroke_index_red": 11, "yards_black": 326, "yards_blue": 309, "yards_white": 303, "yards_red": 285},
    {"hole": 2, "par": 3, "stroke_index_black": 16, "stroke_index_blue": 16, "stroke_index_white": 16, "stroke_index_red": 17, "yards_black": 137, "yards_blue": 120, "yards_white": 111, "yards_red": 104},
    {"hole": 3, "par": 4, "stroke_index_black": 4, "stroke_index_blue": 4, "stroke_index_white": 4, "stroke_index_red": 9, "yards_black": 390, "yards_blue": 343, "yards_white": 337, "yards_red": 300},
    {"hole": 4, "par": 3, "stroke_index_black": 12, "stroke_index_blue": 12, "stroke_index_white": 12, "stroke_index_red": 13, "yards_black": 127, "yards_blue": 111, "yards_white": 104, "yards_red": 98},
    {"hole": 5, "par": 4, "stroke_index_black": 6, "stroke_index_blue": 6, "stroke_index_white": 6, "stroke_index_red": 5, "yards_black": 375, "yards_blue": 359, "yards_white": 351, "yards_red": 335},
    {"hole": 6, "par": 4, "stroke_index_black": 18, "stroke_index_blue": 18, "stroke_index_white": 18, "stroke_index_red": 7, "yards_black": 301, "yards_blue": 289, "yards_white": 284, "yards_red": 266},
    {"hole": 7, "par": 3, "stroke_index_black": 14, "stroke_index_blue": 14, "stroke_index_white": 14, "stroke_index_red": 15, "yards_black": 141, "yards_blue": 139, "yards_white": 123, "yards_red": 107},
    {"hole": 8, "par": 4, "stroke_index_black": 2, "stroke_index_blue": 2, "stroke_index_white": 2, "stroke_index_red": 8, "yards_black": 398, "yards_blue": 321, "yards_white": 317, "yards_red": 315},
    {"hole": 9, "par": 5, "stroke_index_black": 8, "stroke_index_blue": 8, "stroke_index_white": 8, "stroke_index_red": 1, "yards_black": 452, "yards_blue": 445, "yards_white": 403, "yards_red": 399},
    {"hole": 10, "par": 4, "stroke_index_black": 13, "stroke_index_blue": 13, "stroke_index_white": 13, "stroke_index_red": 16, "yards_black": 308, "yards_blue": 303, "yards_white": 299, "yards_red": 280},
    {"hole": 11, "par": 3, "stroke_index_black": 11, "stroke_index_blue": 11, "stroke_index_white": 11, "stroke_index_red": 12, "yards_black": 160, "yards_blue": 154, "yards_white": 151, "yards_red": 148},
    {"hole": 12, "par": 5, "stroke_index_black": 15, "stroke_index_blue": 15, "stroke_index_white": 15, "stroke_index_red": 3, "yards_black": 460, "yards_blue": 420, "yards_white": 395, "yards_red": 390},
    {"hole": 13, "par": 4, "stroke_index_black": 17, "stroke_index_blue": 17, "stroke_index_white": 17, "stroke_index_red": 18, "yards_black": 260, "yards_blue": 251, "yards_white": 235, "yards_red": 225},
    {"hole": 14, "par": 4, "stroke_index_black": 5, "stroke_index_blue": 5, "stroke_index_white": 5, "stroke_index_red": 4, "yards_black": 357, "yards_blue": 349, "yards_white": 344, "yards_red": 335},
    {"hole": 15, "par": 4, "stroke_index_black": 1, "stroke_index_blue": 1, "stroke_index_white": 1, "stroke_index_red": 6, "yards_black": 399, "yards_blue": 383, "yards_white": 317, "yards_red": 310},
    {"hole": 16, "par": 3, "stroke_index_black": 7, "stroke_index_blue": 7, "stroke_index_white": 7, "stroke_index_red": 14, "yards_black": 172, "yards_blue": 162, "yards_white": 152, "yards_red": 127},
    {"hole": 17, "par": 4, "stroke_index_black": 3, "stroke_index_blue": 3, "stroke_index_white": 3, "stroke_index_red": 2, "yards_black": 379, "yards_blue": 349, "yards_white": 340, "yards_red": 306},
    {"hole": 18, "par": 5, "stroke_index_black": 9, "stroke_index_blue": 9, "stroke_index_white": 9, "stroke_index_red": 10, "yards_black": 457, "yards_blue": 441, "yards_white": 391, "yards_red": 365}
  ]'::jsonb,
  '[
    {"name": "Black", "color": "black", "rating": 70.0, "slope": 119, "yards": 5599},
    {"name": "Blue", "color": "blue", "rating": 68.0, "slope": 118, "yards": 5248},
    {"name": "White", "color": "white", "rating": 67.0, "slope": 113, "yards": 4957},
    {"name": "Red", "color": "red", "rating": 70.0, "slope": 118, "yards": 4695}
  ]'::jsonb
)
ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name,
  tees = EXCLUDED.tees,
  holes = EXCLUDED.holes,
  updated_at = NOW();

-- ============================================================================
-- 8. GOLD COAST BURLEIGH GOLF CLUB
-- ============================================================================
INSERT INTO venues (id, source, name, state, city, address, phone, website, total_holes)
VALUES (
  'f2a3b4c5-d6e7-8901-abcd-500000000858',
  'manual',
  'Gold Coast Burleigh Golf Club',
  'QLD',
  'Burleigh Waters',
  '2 Dorotea Court',
  NULL,
  'https://www.goldcoastburleighgolfclub.com.au',
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
  'f2a3b4c5-d6e7-8901-abcd-500000000858',
  'Gold Coast Burleigh Golf Club',
  'Parkland course opened 1950. Historic Gold Coast club in Burleigh Waters.',
  125,
  71.0,
  '[
    {"hole": 1, "par": 5, "stroke_index": 14, "yards_black": 472, "yards_blue": 472, "yards_white": 472, "yards_red": 444, "yards_yellow": 444},
    {"hole": 2, "par": 4, "stroke_index": 2, "yards_black": 394, "yards_blue": 394, "yards_white": 394, "yards_red": 339, "yards_yellow": 339},
    {"hole": 3, "par": 4, "stroke_index": 12, "yards_black": 282, "yards_blue": 282, "yards_white": 282, "yards_red": 252, "yards_yellow": 252},
    {"hole": 4, "par": 3, "stroke_index": 8, "yards_black": 182, "yards_blue": 182, "yards_white": 182, "yards_red": 156, "yards_yellow": 156},
    {"hole": 5, "par": 4, "stroke_index": 10, "yards_black": 321, "yards_blue": 321, "yards_white": 321, "yards_red": 294, "yards_yellow": 294},
    {"hole": 6, "par": 3, "stroke_index": 4, "yards_black": 194, "yards_blue": 194, "yards_white": 194, "yards_red": 204, "yards_yellow": 204},
    {"hole": 7, "par": 4, "stroke_index": 6, "yards_black": 372, "yards_blue": 372, "yards_white": 372, "yards_red": 356, "yards_yellow": 356},
    {"hole": 8, "par": 3, "stroke_index": 16, "yards_black": 141, "yards_blue": 141, "yards_white": 141, "yards_red": 121, "yards_yellow": 121},
    {"hole": 9, "par": 5, "stroke_index": 18, "yards_black": 465, "yards_blue": 465, "yards_white": 465, "yards_red": 425, "yards_yellow": 425},
    {"hole": 10, "par": 4, "stroke_index": 1, "yards_black": 418, "yards_blue": 418, "yards_white": 418, "yards_red": 430, "yards_yellow": 430},
    {"hole": 11, "par": 3, "stroke_index": 15, "yards_black": 162, "yards_blue": 162, "yards_white": 162, "yards_red": 129, "yards_yellow": 129},
    {"hole": 12, "par": 4, "stroke_index": 17, "yards_black": 317, "yards_blue": 317, "yards_white": 317, "yards_red": 298, "yards_yellow": 298},
    {"hole": 13, "par": 5, "stroke_index": 9, "yards_black": 512, "yards_blue": 512, "yards_white": 512, "yards_red": 453, "yards_yellow": 453},
    {"hole": 14, "par": 5, "stroke_index": 7, "yards_black": 488, "yards_blue": 488, "yards_white": 488, "yards_red": 399, "yards_yellow": 399},
    {"hole": 15, "par": 4, "stroke_index": 11, "yards_black": 344, "yards_blue": 344, "yards_white": 344, "yards_red": 325, "yards_yellow": 325},
    {"hole": 16, "par": 4, "stroke_index": 5, "yards_black": 345, "yards_blue": 345, "yards_white": 345, "yards_red": 282, "yards_yellow": 282},
    {"hole": 17, "par": 3, "stroke_index": 13, "yards_black": 158, "yards_blue": 158, "yards_white": 158, "yards_red": 126, "yards_yellow": 126},
    {"hole": 18, "par": 4, "stroke_index": 3, "yards_black": 368, "yards_blue": 368, "yards_white": 368, "yards_red": 309, "yards_yellow": 309}
  ]'::jsonb,
  '[
    {"name": "Black", "color": "black", "rating": 71.0, "slope": 125, "yards": 5935},
    {"name": "Blue", "color": "blue", "rating": 70.0, "slope": 122, "yards": 5935},
    {"name": "White", "color": "white", "rating": 69.0, "slope": 120, "yards": 5935},
    {"name": "Red", "color": "red", "rating": 74.0, "slope": 126, "yards": 5342},
    {"name": "Yellow", "color": "yellow", "rating": 72.0, "slope": null, "yards": 5342}
  ]'::jsonb
)
ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name,
  tees = EXCLUDED.tees,
  holes = EXCLUDED.holes,
  updated_at = NOW();

-- ============================================================================
-- 9. HELENSVALE GOLF CLUB
-- ============================================================================
INSERT INTO venues (id, source, name, state, city, address, phone, website, total_holes)
VALUES (
  'f2a3b4c5-d6e7-8901-abcd-500000000859',
  'manual',
  'Helensvale Golf Club',
  'QLD',
  'Helensvale',
  'Helensvale Road',
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
  'f2a3b4c5-d6e7-8901-abcd-500000000859',
  'Helensvale Golf Club',
  'Parkland course located in the northern Gold Coast suburb of Helensvale.',
  117,
  68.0,
  '[
    {"hole": 1, "par_blue": 5, "par_red": 5, "stroke_index_blue": 5, "stroke_index_red": 5, "yards_blue": 493, "yards_red": 369},
    {"hole": 2, "par_blue": 4, "par_red": 4, "stroke_index_blue": 7, "stroke_index_red": 8, "yards_blue": 321, "yards_red": 296},
    {"hole": 3, "par_blue": 4, "par_red": 4, "stroke_index_blue": 13, "stroke_index_red": 14, "yards_blue": 281, "yards_red": 237},
    {"hole": 4, "par_blue": 5, "par_red": 5, "stroke_index_blue": 9, "stroke_index_red": 1, "yards_blue": 463, "yards_red": 428},
    {"hole": 5, "par_blue": 3, "par_red": 3, "stroke_index_blue": 17, "stroke_index_red": 16, "yards_blue": 140, "yards_red": 130},
    {"hole": 6, "par_blue": 4, "par_red": 4, "stroke_index_blue": 11, "stroke_index_red": 7, "yards_blue": 300, "yards_red": 284},
    {"hole": 7, "par_blue": 4, "par_red": 4, "stroke_index_blue": 1, "stroke_index_red": 3, "yards_blue": 368, "yards_red": 350},
    {"hole": 8, "par_blue": 4, "par_red": 4, "stroke_index_blue": 15, "stroke_index_red": 11, "yards_blue": 301, "yards_red": 271},
    {"hole": 9, "par_blue": 4, "par_red": 5, "stroke_index_blue": 3, "stroke_index_red": 10, "yards_blue": 376, "yards_red": 363},
    {"hole": 10, "par_blue": 4, "par_red": 4, "stroke_index_blue": 4, "stroke_index_red": 2, "yards_blue": 366, "yards_red": 318},
    {"hole": 11, "par_blue": 3, "par_red": 3, "stroke_index_blue": 18, "stroke_index_red": 17, "yards_blue": 136, "yards_red": 132},
    {"hole": 12, "par_blue": 3, "par_red": 3, "stroke_index_blue": 10, "stroke_index_red": 13, "yards_blue": 157, "yards_red": 150},
    {"hole": 13, "par_blue": 4, "par_red": 4, "stroke_index_blue": 12, "stroke_index_red": 12, "yards_blue": 272, "yards_red": 272},
    {"hole": 14, "par_blue": 4, "par_red": 4, "stroke_index_blue": 14, "stroke_index_red": 9, "yards_blue": 281, "yards_red": 265},
    {"hole": 15, "par_blue": 4, "par_red": 4, "stroke_index_blue": 6, "stroke_index_red": 18, "yards_blue": 326, "yards_red": 253},
    {"hole": 16, "par_blue": 4, "par_red": 4, "stroke_index_blue": 16, "stroke_index_red": 4, "yards_blue": 275, "yards_red": 270},
    {"hole": 17, "par_blue": 3, "par_red": 3, "stroke_index_blue": 8, "stroke_index_red": 15, "yards_blue": 162, "yards_red": 160},
    {"hole": 18, "par_blue": 4, "par_red": 5, "stroke_index_blue": 2, "stroke_index_red": 6, "yards_blue": 381, "yards_red": 364}
  ]'::jsonb,
  '[
    {"name": "Blue", "color": "blue", "rating": 68.0, "slope": 117, "yards": 5399},
    {"name": "Red", "color": "red", "rating": 71.0, "slope": 126, "yards": 4912}
  ]'::jsonb
)
ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name,
  tees = EXCLUDED.tees,
  holes = EXCLUDED.holes,
  updated_at = NOW();

-- ============================================================================
-- 10. PALMER GOLD COAST (Palmer Colonial Golf Club)
-- ============================================================================
INSERT INTO venues (id, source, name, state, city, address, phone, website, total_holes)
VALUES (
  'f2a3b4c5-d6e7-8901-abcd-500000000860',
  'manual',
  'Palmer Gold Coast',
  'QLD',
  'Robina',
  'Robina Town Centre Drive',
  NULL,
  'https://www.palmergoldcoast.com.au',
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
  'f2a3b4c5-d6e7-8901-abcd-500000000860',
  'Palmer Gold Coast',
  'Graham Marsh/Ross Watson designed parkland course opened 1989. Located in Robina on the Gold Coast.',
  NULL,
  NULL,
  '[
    {"hole": 1, "par": 4, "stroke_index_blue": 7, "stroke_index_white": 7, "stroke_index_red": 12, "yards_blue": 364, "yards_white": 349, "yards_red": 304},
    {"hole": 2, "par": 4, "stroke_index_blue": 9, "stroke_index_white": 9, "stroke_index_red": 10, "yards_blue": 348, "yards_white": 312, "yards_red": 265},
    {"hole": 3, "par": 5, "stroke_index_blue": 5, "stroke_index_white": 5, "stroke_index_red": 2, "yards_blue": 548, "yards_white": 536, "yards_red": 470},
    {"hole": 4, "par": 3, "stroke_index_blue": 15, "stroke_index_white": 15, "stroke_index_red": 16, "yards_blue": 135, "yards_white": 114, "yards_red": 113},
    {"hole": 5, "par": 4, "stroke_index_blue": 13, "stroke_index_white": 13, "stroke_index_red": 14, "yards_blue": 357, "yards_white": 344, "yards_red": 298},
    {"hole": 6, "par": 4, "stroke_index_blue": 11, "stroke_index_white": 11, "stroke_index_red": 6, "yards_blue": 337, "yards_white": 321, "yards_red": 296},
    {"hole": 7, "par": 4, "stroke_index_blue": 3, "stroke_index_white": 3, "stroke_index_red": 8, "yards_blue": 358, "yards_white": 341, "yards_red": 289},
    {"hole": 8, "par": 3, "stroke_index_blue": 17, "stroke_index_white": 17, "stroke_index_red": 18, "yards_blue": 163, "yards_white": 155, "yards_red": 109},
    {"hole": 9, "par": 4, "stroke_index_blue": 1, "stroke_index_white": 1, "stroke_index_red": 4, "yards_blue": 390, "yards_white": 369, "yards_red": 301},
    {"hole": 10, "par": 4, "stroke_index_blue": 10, "stroke_index_white": 10, "stroke_index_red": 11, "yards_blue": 354, "yards_white": 332, "yards_red": 283},
    {"hole": 11, "par": 4, "stroke_index_blue": 4, "stroke_index_white": 4, "stroke_index_red": 9, "yards_blue": 359, "yards_white": 346, "yards_red": 317},
    {"hole": 12, "par": 3, "stroke_index_blue": 18, "stroke_index_white": 18, "stroke_index_red": 17, "yards_blue": 162, "yards_white": 137, "yards_red": 125},
    {"hole": 13, "par": 4, "stroke_index_blue": 16, "stroke_index_white": 16, "stroke_index_red": 13, "yards_blue": 348, "yards_white": 330, "yards_red": 259},
    {"hole": 14, "par": 4, "stroke_index_blue": 8, "stroke_index_white": 8, "stroke_index_red": 5, "yards_blue": 325, "yards_white": 308, "yards_red": 293},
    {"hole": 15, "par": 4, "stroke_index_blue": 2, "stroke_index_white": 2, "stroke_index_red": 3, "yards_blue": 386, "yards_white": 377, "yards_red": 305},
    {"hole": 16, "par": 5, "stroke_index_blue": 14, "stroke_index_white": 14, "stroke_index_red": 7, "yards_blue": 461, "yards_white": 444, "yards_red": 407},
    {"hole": 17, "par": 3, "stroke_index_blue": 12, "stroke_index_white": 12, "stroke_index_red": 15, "yards_blue": 169, "yards_white": 158, "yards_red": 128},
    {"hole": 18, "par": 5, "stroke_index_blue": 6, "stroke_index_white": 6, "stroke_index_red": 1, "yards_blue": 514, "yards_white": 504, "yards_red": 478}
  ]'::jsonb,
  '[
    {"name": "Blue", "color": "blue", "rating": null, "slope": null, "yards": 6078},
    {"name": "White", "color": "white", "rating": null, "slope": null, "yards": 5777},
    {"name": "Red", "color": "red", "rating": null, "slope": null, "yards": 5040}
  ]'::jsonb
)
ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name,
  tees = EXCLUDED.tees,
  holes = EXCLUDED.holes,
  updated_at = NOW();
