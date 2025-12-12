-- WA Batch 3: South West WA
-- 3 courses with full hole-by-hole data (18 holes each)
-- Source: golfify.io
-- Generated: 2025-12-11

-- ============================================================================
-- 1. BUNBURY GOLF CLUB (Eaton)
-- ============================================================================
INSERT INTO venues (id, source, name, state, city, address, phone, website, total_holes)
VALUES (
  'f2a3b4c5-d6e7-8901-abcd-500000000957',
  'manual',
  'Bunbury Golf Club',
  'WA',
  'Eaton',
  '1 Lucy Victoria Avenue, Eaton',
  NULL,
  'https://www.bunburygolfclub.com.au',
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
  'f2a3b4c5-d6e7-8901-abcd-500000000957',
  'Bunbury Golf Club',
  'Premier South West parkland course established in 1948. Home of the South West Open. Often called the ''Lake Karrinyup of the South'' with slightly undulating couch fairways, slick bent greens and roaming kangaroos.',
  NULL,
  NULL,
  '[
    {"hole": 1, "par": 3, "stroke_index": 10, "stroke_index_red": 15, "yards_white": 163, "yards_red": 161},
    {"hole": 2, "par": 5, "stroke_index": 18, "stroke_index_red": 11, "yards_white": 457, "yards_red": 410},
    {"hole": 3, "par": 4, "stroke_index": 6, "stroke_index_red": 14, "yards_white": 349, "yards_red": 247},
    {"hole": 4, "par": 4, "stroke_index": 8, "stroke_index_red": 5, "yards_white": 322, "yards_red": 318},
    {"hole": 5, "par": 4, "stroke_index": 4, "stroke_index_red": 4, "yards_white": 378, "yards_red": 308},
    {"hole": 6, "par": 4, "stroke_index": 2, "stroke_index_red": 2, "yards_white": 371, "yards_red": 333},
    {"hole": 7, "par": 5, "stroke_index": 14, "stroke_index_red": 10, "yards_white": 488, "yards_red": 427},
    {"hole": 8, "par": 3, "stroke_index": 12, "stroke_index_red": 16, "yards_white": 171, "yards_red": 136},
    {"hole": 9, "par": 4, "stroke_index": 16, "stroke_index_red": 8, "yards_white": 329, "yards_red": 305},
    {"hole": 10, "par": 3, "stroke_index": 17, "stroke_index_red": 17, "yards_white": 124, "yards_red": 118},
    {"hole": 11, "par": 5, "stroke_index": 15, "stroke_index_red": 12, "yards_white": 485, "yards_red": 400},
    {"hole": 12, "par": 4, "stroke_index": 13, "stroke_index_red": 6, "yards_white": 309, "yards_red": 307},
    {"hole": 13, "par": 4, "stroke_index": 5, "stroke_index_red": 3, "yards_white": 341, "yards_red": 309},
    {"hole": 14, "par": 4, "stroke_index": 3, "stroke_index_red": 7, "yards_white": 390, "yards_red": 311},
    {"hole": 15, "par": 4, "stroke_index": 1, "stroke_index_red": 1, "yards_white": 395, "yards_red": 350},
    {"hole": 16, "par": 3, "stroke_index": 7, "stroke_index_red": 18, "yards_white": 172, "yards_red": 122},
    {"hole": 17, "par": 5, "stroke_index": 11, "stroke_index_red": 13, "yards_white": 491, "yards_red": 403},
    {"hole": 18, "par": 4, "stroke_index": 9, "stroke_index_red": 9, "yards_white": 336, "yards_red": 279}
  ]'::jsonb,
  '[
    {"name": "White", "color": "white", "gender": "mens", "rating": null, "slope": null, "par": 72, "yards": 6071},
    {"name": "Red", "color": "red", "gender": "ladies", "rating": null, "slope": null, "par": 72, "yards": 5244}
  ]'::jsonb
)
ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name,
  tees = EXCLUDED.tees,
  holes = EXCLUDED.holes,
  updated_at = NOW();

-- ============================================================================
-- 2. MARGARET RIVER GOLF CLUB (Margaret River)
-- ============================================================================
INSERT INTO venues (id, source, name, state, city, address, phone, website, total_holes)
VALUES (
  'f2a3b4c5-d6e7-8901-abcd-500000000958',
  'manual',
  'Margaret River Golf Club',
  'WA',
  'Margaret River',
  'Wallcliffe Road, Margaret River',
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
  'f2a3b4c5-d6e7-8901-abcd-500000000958',
  'Margaret River Golf Club',
  'Wine region parkland course established in 1950. Located in the heart of the Margaret River wine region, offering a relaxed golf experience surrounded by natural bushland.',
  NULL,
  71.0,
  '[
    {"hole": 1, "par": 4, "stroke_index": 10, "yards_white": 326},
    {"hole": 2, "par": 5, "stroke_index": 4, "yards_white": 486},
    {"hole": 3, "par": 4, "stroke_index": 6, "yards_white": 361},
    {"hole": 4, "par": 3, "stroke_index": 16, "yards_white": 182},
    {"hole": 5, "par": 4, "stroke_index": 2, "yards_white": 389},
    {"hole": 6, "par": 4, "stroke_index": 14, "yards_white": 297},
    {"hole": 7, "par": 5, "stroke_index": 8, "yards_white": 454},
    {"hole": 8, "par": 3, "stroke_index": 18, "yards_white": 142},
    {"hole": 9, "par": 4, "stroke_index": 12, "yards_white": 396},
    {"hole": 10, "par": 4, "stroke_index": 11, "yards_white": 316},
    {"hole": 11, "par": 4, "stroke_index": 3, "yards_white": 381},
    {"hole": 12, "par": 3, "stroke_index": 15, "yards_white": 185},
    {"hole": 13, "par": 5, "stroke_index": 5, "yards_white": 467},
    {"hole": 14, "par": 5, "stroke_index": 1, "yards_white": 503},
    {"hole": 15, "par": 3, "stroke_index": 17, "yards_white": 128},
    {"hole": 16, "par": 4, "stroke_index": 7, "yards_white": 384},
    {"hole": 17, "par": 4, "stroke_index": 13, "yards_white": 291},
    {"hole": 18, "par": 4, "stroke_index": 9, "yards_white": 404}
  ]'::jsonb,
  '[
    {"name": "White", "color": "white", "gender": "mens", "rating": 71.0, "slope": null, "par": 72, "yards": 6092}
  ]'::jsonb
)
ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name,
  tees = EXCLUDED.tees,
  holes = EXCLUDED.holes,
  updated_at = NOW();

-- ============================================================================
-- 3. ALBANY GOLF CLUB (Albany)
-- ============================================================================
INSERT INTO venues (id, source, name, state, city, address, phone, website, total_holes)
VALUES (
  'f2a3b4c5-d6e7-8901-abcd-500000000959',
  'manual',
  'Albany Golf Club',
  'WA',
  'Albany',
  '1 Barry Court, Middleton Beach',
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
  'f2a3b4c5-d6e7-8901-abcd-500000000959',
  'Albany Golf Club',
  'Historic Great Southern parkland course established in 1898 - the oldest golf club in Western Australia. Situated at Middleton Beach with stunning coastal views. Albany was the first settlement in WA and the club has a proud 125+ year history.',
  NULL,
  72.0,
  '[
    {"hole": 1, "par": 4, "stroke_index": 4, "stroke_index_white": 1, "stroke_index_red": 6, "yards_blue": 355, "yards_white": 336, "yards_red": 295},
    {"hole": 2, "par": 4, "stroke_index": 1, "stroke_index_white": 10, "stroke_index_red": 1, "yards_blue": 398, "yards_white": 331, "yards_red": 339},
    {"hole": 3, "par": 4, "stroke_index": 17, "stroke_index_white": 15, "stroke_index_red": 10, "yards_blue": 292, "yards_white": 283, "yards_red": 291},
    {"hole": 4, "par": 5, "stroke_index": 12, "stroke_index_white": 12, "stroke_index_red": 14, "yards_blue": 496, "yards_white": 496, "yards_red": 407},
    {"hole": 5, "par": 4, "stroke_index": 10, "stroke_index_white": 8, "stroke_index_red": 9, "yards_blue": 327, "yards_white": 324, "yards_red": 295},
    {"hole": 6, "par": 3, "stroke_index": 8, "stroke_index_white": 13, "stroke_index_red": 16, "yards_blue": 171, "yards_white": 149, "yards_red": 153},
    {"hole": 7, "par": 4, "stroke_index": 6, "stroke_index_white": 6, "stroke_index_red": 12, "yards_blue": 343, "yards_white": 345, "yards_red": 297},
    {"hole": 8, "par": 3, "stroke_index": 15, "stroke_index_white": 17, "stroke_index_red": 17, "yards_blue": 134, "yards_white": 134, "yards_red": 134},
    {"hole": 9, "par": 5, "stroke_index": 13, "stroke_index_white": 3, "stroke_index_red": 4, "yards_blue": 493, "yards_white": 483, "yards_red": 414},
    {"hole": 10, "par": 3, "stroke_index": 9, "stroke_index_white": 5, "stroke_index_red": 13, "yards_blue": 163, "yards_white": 164, "yards_red": 142},
    {"hole": 11, "par": 5, "stroke_index": 11, "stroke_index_white": 11, "stroke_index_red": 5, "yards_blue": 472, "yards_white": 437, "yards_red": 404},
    {"hole": 12, "par": 4, "stroke_index": 5, "stroke_index_white": 2, "stroke_index_red": 3, "yards_blue": 342, "yards_white": 326, "yards_red": 317},
    {"hole": 13, "par": 4, "stroke_index": 2, "stroke_index_white": 9, "stroke_index_red": 15, "yards_blue": 400, "yards_white": 335, "yards_red": 298},
    {"hole": 14, "par": 3, "stroke_index": 18, "stroke_index_white": 18, "stroke_index_red": 18, "yards_blue": 126, "yards_white": 126, "yards_red": 118},
    {"hole": 15, "par": 4, "stroke_index": 16, "stroke_index_white": 14, "stroke_index_red": 8, "yards_blue": 312, "yards_white": 314, "yards_red": 310},
    {"hole": 16, "par": 5, "stroke_index": 14, "stroke_index_white": 16, "stroke_index_red": 7, "yards_blue": 496, "yards_white": 407, "yards_red": 426},
    {"hole": 17, "par": 4, "stroke_index": 7, "stroke_index_white": 4, "stroke_index_red": 11, "yards_blue": 358, "yards_white": 357, "yards_red": 310},
    {"hole": 18, "par": 4, "stroke_index": 3, "stroke_index_white": 7, "stroke_index_red": 2, "yards_blue": 390, "yards_white": 337, "yards_red": 339}
  ]'::jsonb,
  '[
    {"name": "Blue", "color": "blue", "gender": "mens", "rating": 72.0, "slope": null, "par": 72, "yards": 6068},
    {"name": "White", "color": "white", "gender": "mens", "rating": 70.0, "slope": null, "par": 72, "yards": 5684},
    {"name": "Red", "color": "red", "gender": "ladies", "rating": 73.0, "slope": null, "par": 72, "yards": 5289}
  ]'::jsonb
)
ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name,
  tees = EXCLUDED.tees,
  holes = EXCLUDED.holes,
  updated_at = NOW();
