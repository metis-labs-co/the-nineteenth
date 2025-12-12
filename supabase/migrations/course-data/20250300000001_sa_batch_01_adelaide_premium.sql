-- SA Batch 1: Adelaide Premium
-- 5 courses with full hole-by-hole data (18 holes each)
-- Source: golfify.io
-- Generated: 2025-12-11

-- ============================================================================
-- 1. ROYAL ADELAIDE GOLF CLUB
-- ============================================================================
INSERT INTO venues (id, source, name, state, city, address, phone, website, total_holes)
VALUES (
  'f2a3b4c5-d6e7-8901-abcd-500000000920',
  'manual',
  'Royal Adelaide Golf Club',
  'SA',
  'Seaton',
  'Tapleys Hill Road',
  NULL,
  'https://www.royaladelaidegolf.com.au',
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
  'f2a3b4c5-d6e7-8901-abcd-500000000920',
  'Royal Adelaide Golf Club',
  'Premier South Australian golf club. Top 10 Australian course featuring classic sandbelt-style layout. Multiple Australian Open host.',
  130,
  72.0,
  '[
    {"hole": 1, "par": 4, "stroke_index": 10, "yards_white": 342},
    {"hole": 2, "par": 5, "stroke_index": 16, "yards_white": 465},
    {"hole": 3, "par": 4, "stroke_index": 18, "yards_white": 260},
    {"hole": 4, "par": 4, "stroke_index": 6, "yards_white": 374},
    {"hole": 5, "par": 4, "stroke_index": 8, "yards_white": 373},
    {"hole": 6, "par": 4, "stroke_index": 3, "yards_white": 393},
    {"hole": 7, "par": 3, "stroke_index": 14, "yards_white": 145},
    {"hole": 8, "par": 4, "stroke_index": 12, "yards_white": 322},
    {"hole": 9, "par": 4, "stroke_index": 15, "yards_white": 449},
    {"hole": 10, "par": 4, "stroke_index": 13, "yards_white": 334},
    {"hole": 11, "par": 4, "stroke_index": 4, "yards_white": 350},
    {"hole": 12, "par": 3, "stroke_index": 1, "yards_white": 201},
    {"hole": 13, "par": 4, "stroke_index": 9, "yards_white": 354},
    {"hole": 14, "par": 3, "stroke_index": 2, "yards_white": 385},
    {"hole": 15, "par": 5, "stroke_index": 17, "yards_white": 450},
    {"hole": 16, "par": 3, "stroke_index": 7, "yards_white": 153},
    {"hole": 17, "par": 4, "stroke_index": 5, "yards_white": 390},
    {"hole": 18, "par": 4, "stroke_index": 11, "yards_white": 369}
  ]'::jsonb,
  '[
    {"name": "White", "color": "white", "gender": "mens", "rating": 72.0, "slope": 130, "par": 70, "yards": 6109},
    {"name": "White", "color": "white", "gender": "ladies", "rating": 79.0, "slope": 147, "par": 70, "yards": 6109},
    {"name": "Ladies", "color": "red", "gender": "ladies", "rating": 75.0, "slope": 136, "par": 73, "yards": 5547},
    {"name": "Red", "color": "red", "gender": "mens", "rating": null, "slope": null, "par": 73, "yards": 5577}
  ]'::jsonb
)
ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name,
  tees = EXCLUDED.tees,
  holes = EXCLUDED.holes,
  updated_at = NOW();

-- ============================================================================
-- 2. KOOYONGA GOLF CLUB
-- ============================================================================
INSERT INTO venues (id, source, name, state, city, address, phone, website, total_holes)
VALUES (
  'f2a3b4c5-d6e7-8901-abcd-500000000921',
  'manual',
  'Kooyonga Golf Club',
  'SA',
  'Lockleys',
  'May Terrace',
  NULL,
  'https://www.kooyonga.com.au',
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
  'f2a3b4c5-d6e7-8901-abcd-500000000921',
  'Kooyonga Golf Club',
  'Premier Adelaide parkland course opened in 1924. Multiple Australian Open host. Top 20 Australian course.',
  137,
  72.0,
  '[
    {"hole": 1, "par": 5, "stroke_index": 10, "yards_white": 489, "yards_blue": 510},
    {"hole": 2, "par": 5, "stroke_index": 15, "yards_white": 448, "yards_blue": 462},
    {"hole": 3, "par": 3, "stroke_index": 4, "yards_white": 152, "yards_blue": 163},
    {"hole": 4, "par": 4, "stroke_index": 12, "yards_white": 354, "yards_blue": 365},
    {"hole": 5, "par": 4, "stroke_index": 18, "yards_white": 290, "yards_blue": 298},
    {"hole": 6, "par": 4, "stroke_index": 6, "yards_white": 360, "yards_blue": 378},
    {"hole": 7, "par": 3, "stroke_index": 14, "yards_white": 144, "yards_blue": 159},
    {"hole": 8, "par": 4, "stroke_index": 1, "yards_white": 376, "yards_blue": 398},
    {"hole": 9, "par": 5, "stroke_index": 16, "yards_white": 450, "yards_blue": 468},
    {"hole": 10, "par": 4, "stroke_index": 2, "yards_white": 391, "yards_blue": 410},
    {"hole": 11, "par": 4, "stroke_index": 13, "yards_white": 336, "yards_blue": 348},
    {"hole": 12, "par": 4, "stroke_index": 5, "yards_white": 348, "yards_blue": 362},
    {"hole": 13, "par": 4, "stroke_index": 7, "yards_white": 379, "yards_blue": 395},
    {"hole": 14, "par": 3, "stroke_index": 17, "yards_white": 136, "yards_blue": 148},
    {"hole": 15, "par": 3, "stroke_index": 3, "yards_white": 184, "yards_blue": 196},
    {"hole": 16, "par": 5, "stroke_index": 11, "yards_white": 497, "yards_blue": 520},
    {"hole": 17, "par": 4, "stroke_index": 8, "yards_white": 343, "yards_blue": 358},
    {"hole": 18, "par": 4, "stroke_index": 9, "yards_white": 335, "yards_blue": 350}
  ]'::jsonb,
  '[
    {"name": "Blue", "color": "blue", "gender": "mens", "rating": 73.0, "slope": 139, "par": 72, "yards": 6178},
    {"name": "Blue", "color": "blue", "gender": "ladies", "rating": 80.0, "slope": 150, "par": 74, "yards": 6180},
    {"name": "White", "color": "white", "gender": "mens", "rating": 72.0, "slope": 137, "par": 72, "yards": 6012},
    {"name": "Red", "color": "red", "gender": "ladies", "rating": 76.0, "slope": 137, "par": 74, "yards": 5484}
  ]'::jsonb
)
ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name,
  tees = EXCLUDED.tees,
  holes = EXCLUDED.holes,
  updated_at = NOW();

-- ============================================================================
-- 3. GLENELG GOLF CLUB
-- ============================================================================
INSERT INTO venues (id, source, name, state, city, address, phone, website, total_holes)
VALUES (
  'f2a3b4c5-d6e7-8901-abcd-500000000922',
  'manual',
  'Glenelg Golf Club',
  'SA',
  'Novar Gardens',
  'James Melrose Road',
  NULL,
  'https://www.glenelggolf.com.au',
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
  'f2a3b4c5-d6e7-8901-abcd-500000000922',
  'Glenelg Golf Club',
  'Historic Adelaide parkland course established in 1927. Classic sandbelt-style layout near the coast.',
  129,
  70.0,
  '[
    {"hole": 1, "par": 4, "stroke_index": 17, "par_black": 4, "stroke_index_black": 16, "par_red": 4, "stroke_index_red": 1, "yards_white": 301, "yards_black": 301, "yards_red": 289},
    {"hole": 2, "par": 4, "stroke_index": 2, "par_black": 4, "stroke_index_black": 1, "par_red": 5, "stroke_index_red": 3, "yards_white": 418, "yards_black": 410, "yards_red": 410},
    {"hole": 3, "par": 3, "stroke_index": 12, "par_black": 3, "stroke_index_black": 7, "par_red": 3, "stroke_index_red": 5, "yards_white": 176, "yards_black": 178, "yards_red": 140},
    {"hole": 4, "par": 3, "stroke_index": 4, "par_black": 4, "stroke_index_black": 15, "par_red": 4, "stroke_index_red": 7, "yards_white": 112, "yards_black": 296, "yards_red": 275},
    {"hole": 5, "par": 4, "stroke_index": 16, "par_black": 5, "stroke_index_black": 14, "par_red": 5, "stroke_index_red": 9, "yards_white": 490, "yards_black": 490, "yards_red": 443},
    {"hole": 6, "par": 5, "stroke_index": 14, "par_black": 4, "stroke_index_black": 3, "par_red": 5, "stroke_index_red": 11, "yards_white": 430, "yards_black": 400, "yards_red": 400},
    {"hole": 7, "par": 4, "stroke_index": 1, "par_black": 4, "stroke_index_black": 8, "par_red": 4, "stroke_index_red": 13, "yards_white": 394, "yards_black": 394, "yards_red": 349},
    {"hole": 8, "par": 4, "stroke_index": 9, "par_black": 4, "stroke_index_black": 4, "par_red": 5, "stroke_index_red": 15, "yards_white": 407, "yards_black": 384, "yards_red": 370},
    {"hole": 9, "par": 4, "stroke_index": 6, "par_black": 4, "stroke_index_black": 9, "par_red": 4, "stroke_index_red": 17, "yards_white": 376, "yards_black": 376, "yards_red": 310},
    {"hole": 10, "par": 4, "stroke_index": 10, "par_black": 4, "stroke_index_black": 10, "par_red": 4, "stroke_index_red": 2, "yards_white": 382, "yards_black": 366, "yards_red": 325},
    {"hole": 11, "par": 3, "stroke_index": 7, "par_black": 3, "stroke_index_black": 2, "par_red": 3, "stroke_index_red": 4, "yards_white": 168, "yards_black": 168, "yards_red": 135},
    {"hole": 12, "par": 4, "stroke_index": 18, "par_black": 5, "stroke_index_black": 18, "par_red": 5, "stroke_index_red": 6, "yards_white": 350, "yards_black": 460, "yards_red": 430},
    {"hole": 13, "par": 4, "stroke_index": 5, "par_black": 4, "stroke_index_black": 11, "par_red": 4, "stroke_index_red": 8, "yards_white": 369, "yards_black": 349, "yards_red": 318},
    {"hole": 14, "par": 3, "stroke_index": 15, "par_black": 3, "stroke_index_black": 17, "par_red": 3, "stroke_index_red": 10, "yards_white": 164, "yards_black": 164, "yards_red": 121},
    {"hole": 15, "par": 4, "stroke_index": 8, "par_black": 4, "stroke_index_black": 6, "par_red": 4, "stroke_index_red": 12, "yards_white": 365, "yards_black": 347, "yards_red": 324},
    {"hole": 16, "par": 3, "stroke_index": 13, "par_black": 3, "stroke_index_black": 12, "par_red": 3, "stroke_index_red": 14, "yards_white": 144, "yards_black": 144, "yards_red": 120},
    {"hole": 17, "par": 4, "stroke_index": 3, "par_black": 4, "stroke_index_black": 5, "par_red": 4, "stroke_index_red": 16, "yards_white": 117, "yards_black": 368, "yards_red": 340},
    {"hole": 18, "par": 5, "stroke_index": 11, "par_black": 5, "stroke_index_black": 13, "par_red": 5, "stroke_index_red": 18, "yards_white": 496, "yards_black": 496, "yards_red": 430}
  ]'::jsonb,
  '[
    {"name": "White", "color": "white", "gender": "mens", "rating": 70.0, "slope": 129, "par": 69, "yards": 5659},
    {"name": "Black", "color": "black", "gender": "mens", "rating": null, "slope": null, "par": 71, "yards": 6091},
    {"name": "Red", "color": "red", "gender": "ladies", "rating": null, "slope": null, "par": 74, "yards": 5529}
  ]'::jsonb
)
ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name,
  tees = EXCLUDED.tees,
  holes = EXCLUDED.holes,
  updated_at = NOW();

-- ============================================================================
-- 4. THE GRANGE GOLF CLUB - EAST COURSE
-- ============================================================================
INSERT INTO venues (id, source, name, state, city, address, phone, website, total_holes)
VALUES (
  'f2a3b4c5-d6e7-8901-abcd-500000000923',
  'manual',
  'The Grange Golf Club',
  'SA',
  'Grange',
  'White Sands Drive',
  NULL,
  'https://www.thegrangegolf.com.au',
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
  'f2a3b4c5-d6e7-8901-abcd-500000000923',
  'The Grange Golf Club - East Course',
  'Championship course designed by Greg Norman, opened in 1967. Host of ISPS Handa Women',
  132,
  73.0,
  '[
    {"hole": 1, "par": 4, "stroke_index": 10, "stroke_index_red": 16, "yards_blue": 351, "yards_red": 284},
    {"hole": 2, "par": 4, "stroke_index": 6, "stroke_index_red": 6, "yards_blue": 338, "yards_red": 318},
    {"hole": 3, "par": 3, "stroke_index": 18, "stroke_index_red": 18, "yards_blue": 140, "yards_red": 102},
    {"hole": 4, "par": 4, "stroke_index": 12, "stroke_index_red": 8, "yards_blue": 276, "yards_red": 260},
    {"hole": 5, "par": 3, "stroke_index": 8, "stroke_index_red": 14, "yards_blue": 155, "yards_red": 122},
    {"hole": 6, "par": 4, "stroke_index": 4, "stroke_index_red": 2, "yards_blue": 337, "yards_red": 316},
    {"hole": 7, "par": 5, "stroke_index": 16, "stroke_index_red": 10, "yards_blue": 463, "yards_red": 424},
    {"hole": 8, "par": 4, "stroke_index": 2, "stroke_index_red": 4, "yards_blue": 385, "yards_red": 312},
    {"hole": 9, "par": 5, "stroke_index": 14, "stroke_index_red": 12, "yards_blue": 456, "yards_red": 411},
    {"hole": 10, "par": 4, "stroke_index": 3, "stroke_index_red": 5, "yards_blue": 375, "yards_red": 337},
    {"hole": 11, "par": 4, "stroke_index": 7, "stroke_index_red": 9, "yards_blue": 343, "yards_red": 312},
    {"hole": 12, "par": 3, "stroke_index": 13, "stroke_index_red": 15, "yards_blue": 177, "yards_red": 163},
    {"hole": 13, "par": 4, "stroke_index": 11, "stroke_index_red": 3, "yards_blue": 320, "yards_red": 303},
    {"hole": 14, "par": 4, "stroke_index": 1, "stroke_index_red": 7, "yards_blue": 353, "yards_red": 323},
    {"hole": 15, "par": 3, "stroke_index": 17, "stroke_index_red": 17, "yards_blue": 111, "yards_red": 108},
    {"hole": 16, "par": 5, "stroke_index": 15, "stroke_index_red": 13, "yards_blue": 460, "yards_red": 415},
    {"hole": 17, "par": 4, "stroke_index": 5, "stroke_index_red": 11, "yards_blue": 395, "yards_red": 322},
    {"hole": 18, "par": 5, "stroke_index": 9, "stroke_index_red": 1, "yards_blue": 474, "yards_red": 446}
  ]'::jsonb,
  '[
    {"name": "Blue", "color": "blue", "gender": "mens", "rating": 73.0, "slope": 132, "par": 72, "yards": 5909},
    {"name": "Ladies", "color": "red", "gender": "ladies", "rating": null, "slope": null, "par": 72, "yards": 5278}
  ]'::jsonb
)
ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name,
  tees = EXCLUDED.tees,
  holes = EXCLUDED.holes,
  updated_at = NOW();

-- ============================================================================
-- 5. THE GRANGE GOLF CLUB - WEST COURSE
-- ============================================================================
INSERT INTO courses (venue_id, name, description, slope_rating, course_rating, holes, tees)
VALUES (
  'f2a3b4c5-d6e7-8901-abcd-500000000923',
  'The Grange Golf Club - West Course',
  'Classic parkland course designed by Michael Clayton, opened in 1927. The original course at The Grange.',
  126,
  71.0,
  '[
    {"hole": 1, "par": 5, "stroke_index": 12, "par_red": 5, "stroke_index_red": 8, "yards_white": 445, "yards_red": 434},
    {"hole": 2, "par": 4, "stroke_index": 8, "par_red": 4, "stroke_index_red": 10, "yards_white": 314, "yards_red": 293},
    {"hole": 3, "par": 4, "stroke_index": 4, "par_red": 4, "stroke_index_red": 6, "yards_white": 392, "yards_red": 348},
    {"hole": 4, "par": 3, "stroke_index": 16, "par_red": 3, "stroke_index_red": 16, "yards_white": 150, "yards_red": 143},
    {"hole": 5, "par": 5, "stroke_index": 14, "par_red": 5, "stroke_index_red": 12, "yards_white": 463, "yards_red": 440},
    {"hole": 6, "par": 4, "stroke_index": 2, "par_red": 5, "stroke_index_red": 18, "yards_white": 392, "yards_red": 370},
    {"hole": 7, "par": 4, "stroke_index": 10, "par_red": 4, "stroke_index_red": 2, "yards_white": 294, "yards_red": 284},
    {"hole": 8, "par": 3, "stroke_index": 18, "par_red": 3, "stroke_index_red": 14, "yards_white": 120, "yards_red": 95},
    {"hole": 9, "par": 4, "stroke_index": 6, "par_red": 4, "stroke_index_red": 4, "yards_white": 362, "yards_red": 345},
    {"hole": 10, "par": 5, "stroke_index": 13, "par_red": 5, "stroke_index_red": 7, "yards_white": 462, "yards_red": 443},
    {"hole": 11, "par": 4, "stroke_index": 11, "par_red": 4, "stroke_index_red": 1, "yards_white": 339, "yards_red": 318},
    {"hole": 12, "par": 3, "stroke_index": 5, "par_red": 3, "stroke_index_red": 9, "yards_white": 149, "yards_red": 140},
    {"hole": 13, "par": 5, "stroke_index": 15, "par_red": 5, "stroke_index_red": 11, "yards_white": 467, "yards_red": 422},
    {"hole": 14, "par": 3, "stroke_index": 17, "par_red": 3, "stroke_index_red": 15, "yards_white": 142, "yards_red": 130},
    {"hole": 15, "par": 4, "stroke_index": 9, "par_red": 4, "stroke_index_red": 3, "yards_white": 359, "yards_red": 343},
    {"hole": 16, "par": 4, "stroke_index": 1, "par_red": 4, "stroke_index_red": 17, "yards_white": 375, "yards_red": 365},
    {"hole": 17, "par": 4, "stroke_index": 3, "par_red": 4, "stroke_index_red": 5, "yards_white": 378, "yards_red": 321},
    {"hole": 18, "par": 4, "stroke_index": 7, "par_red": 4, "stroke_index_red": 13, "yards_white": 331, "yards_red": 293}
  ]'::jsonb,
  '[
    {"name": "White", "color": "white", "gender": "mens", "rating": 71.0, "slope": 126, "par": 72, "yards": 5934},
    {"name": "Red", "color": "red", "gender": "ladies", "rating": null, "slope": null, "par": 74, "yards": 5527}
  ]'::jsonb
)
ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name,
  tees = EXCLUDED.tees,
  holes = EXCLUDED.holes,
  updated_at = NOW();
