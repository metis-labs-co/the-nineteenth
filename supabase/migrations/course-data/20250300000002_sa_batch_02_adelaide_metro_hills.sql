-- SA Batch 2: Adelaide Metro & Hills
-- 6 courses with full hole-by-hole data (18 holes each)
-- Source: golfify.io
-- Generated: 2025-12-11

-- ============================================================================
-- 1. TEA TREE GULLY GOLF CLUB
-- ============================================================================
INSERT INTO venues (id, source, name, state, city, address, phone, website, total_holes)
VALUES (
  'f2a3b4c5-d6e7-8901-abcd-500000000925',
  'manual',
  'Tea Tree Gully Golf Club',
  'SA',
  'Fairview Park',
  'Yatala Vale Road',
  NULL,
  'https://www.ttggc.com.au',
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
  'f2a3b4c5-d6e7-8901-abcd-500000000925',
  'Tea Tree Gully Golf Club',
  'Popular parkland course in Adelaide',
  131,
  71.0,
  '[
    {"hole": 1, "par": 4, "stroke_index": 9, "par_red": 4, "yards_white": 310, "yards_red": 305},
    {"hole": 2, "par": 3, "stroke_index": 18, "par_red": 3, "yards_white": 145, "yards_red": 140},
    {"hole": 3, "par": 3, "stroke_index": 3, "par_red": 5, "yards_white": 185, "yards_red": 180},
    {"hole": 4, "par": 4, "stroke_index": 1, "par_red": 5, "yards_white": 420, "yards_red": 415},
    {"hole": 5, "par": 4, "stroke_index": 7, "par_red": 4, "yards_white": 360, "yards_red": 355},
    {"hole": 6, "par": 4, "stroke_index": 5, "par_red": 4, "yards_white": 385, "yards_red": 380},
    {"hole": 7, "par": 4, "stroke_index": 12, "par_red": 4, "yards_white": 330, "yards_red": 325},
    {"hole": 8, "par": 3, "stroke_index": 16, "par_red": 3, "yards_white": 150, "yards_red": 146},
    {"hole": 9, "par": 5, "stroke_index": 14, "par_red": 4, "yards_white": 390, "yards_red": 400},
    {"hole": 10, "par": 4, "stroke_index": 2, "par_red": 5, "yards_white": 415, "yards_red": 410},
    {"hole": 11, "par": 5, "stroke_index": 15, "par_red": 5, "yards_white": 465, "yards_red": 420},
    {"hole": 12, "par": 5, "stroke_index": 17, "par_red": 5, "yards_white": 445, "yards_red": 385},
    {"hole": 13, "par": 3, "stroke_index": 13, "par_red": 3, "yards_white": 165, "yards_red": 145},
    {"hole": 14, "par": 4, "stroke_index": 11, "par_red": 4, "yards_white": 340, "yards_red": 325},
    {"hole": 15, "par": 4, "stroke_index": 6, "par_red": 4, "yards_white": 375, "yards_red": 365},
    {"hole": 16, "par": 4, "stroke_index": 10, "par_red": 4, "yards_white": 345, "yards_red": 310},
    {"hole": 17, "par": 4, "stroke_index": 4, "par_red": 4, "yards_white": 378, "yards_red": 314},
    {"hole": 18, "par": 4, "stroke_index": 8, "par_red": 4, "yards_white": 310, "yards_red": 290}
  ]'::jsonb,
  '[
    {"name": "White", "color": "white", "gender": "mens", "rating": 71.0, "slope": 131, "par": 71, "yards": 5913},
    {"name": "Red", "color": "red", "gender": "ladies", "rating": null, "slope": null, "par": 74, "yards": 5410}
  ]'::jsonb
)
ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name,
  tees = EXCLUDED.tees,
  holes = EXCLUDED.holes,
  updated_at = NOW();

-- ============================================================================
-- 2. BLACKWOOD GOLF CLUB
-- ============================================================================
INSERT INTO venues (id, source, name, state, city, address, phone, website, total_holes)
VALUES (
  'f2a3b4c5-d6e7-8901-abcd-500000000926',
  'manual',
  'Blackwood Golf Club',
  'SA',
  'Blackwood',
  'Coromandel Parade',
  NULL,
  'https://www.blackwoodgolf.com.au',
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
  'f2a3b4c5-d6e7-8901-abcd-500000000926',
  'Blackwood Golf Club',
  'Adelaide Hills parkland course opened in 1980. Challenging layout with elevation changes.',
  128,
  72.0,
  '[
    {"hole": 1, "par": 4, "stroke_index": 3, "par_red": 4, "stroke_index_red": 2, "yards_blue": 406, "yards_red": 350},
    {"hole": 2, "par": 5, "stroke_index": 9, "par_red": 5, "stroke_index_red": 8, "yards_blue": 476, "yards_red": 398},
    {"hole": 3, "par": 3, "stroke_index": 7, "par_red": 3, "stroke_index_red": 14, "yards_blue": 178, "yards_red": 154},
    {"hole": 4, "par": 4, "stroke_index": 5, "par_red": 4, "stroke_index_red": 6, "yards_blue": 354, "yards_red": 328},
    {"hole": 5, "par": 4, "stroke_index": 1, "par_red": 5, "stroke_index_red": 16, "yards_blue": 416, "yards_red": 396},
    {"hole": 6, "par": 4, "stroke_index": 13, "par_red": 4, "stroke_index_red": 12, "yards_blue": 297, "yards_red": 276},
    {"hole": 7, "par": 5, "stroke_index": 11, "par_red": 5, "stroke_index_red": 4, "yards_blue": 451, "yards_red": 414},
    {"hole": 8, "par": 3, "stroke_index": 15, "par_red": 3, "stroke_index_red": 18, "yards_blue": 139, "yards_red": 127},
    {"hole": 9, "par": 4, "stroke_index": 17, "par_red": 4, "stroke_index_red": 10, "yards_blue": 280, "yards_red": 267},
    {"hole": 10, "par": 4, "stroke_index": 8, "par_red": 4, "stroke_index_red": 3, "yards_blue": 388, "yards_red": 353},
    {"hole": 11, "par": 3, "stroke_index": 16, "par_red": 3, "stroke_index_red": 15, "yards_blue": 139, "yards_red": 119},
    {"hole": 12, "par": 4, "stroke_index": 4, "par_red": 5, "stroke_index_red": 7, "yards_blue": 410, "yards_red": 385},
    {"hole": 13, "par": 4, "stroke_index": 18, "par_red": 4, "stroke_index_red": 13, "yards_blue": 272, "yards_red": 245},
    {"hole": 14, "par": 3, "stroke_index": 12, "par_red": 3, "stroke_index_red": 17, "yards_blue": 189, "yards_red": 169},
    {"hole": 15, "par": 5, "stroke_index": 10, "par_red": 5, "stroke_index_red": 5, "yards_blue": 475, "yards_red": 405},
    {"hole": 16, "par": 4, "stroke_index": 2, "par_red": 4, "stroke_index_red": 9, "yards_blue": 398, "yards_red": 327},
    {"hole": 17, "par": 4, "stroke_index": 6, "par_red": 4, "stroke_index_red": 1, "yards_blue": 353, "yards_red": 326},
    {"hole": 18, "par": 5, "stroke_index": 14, "par_red": 5, "stroke_index_red": 11, "yards_blue": 486, "yards_red": 417}
  ]'::jsonb,
  '[
    {"name": "Blue", "color": "blue", "gender": "mens", "rating": 72.0, "slope": 128, "par": 72, "yards": 6107},
    {"name": "Red", "color": "red", "gender": "ladies", "rating": 75.0, "slope": 129, "par": 74, "yards": 5456}
  ]'::jsonb
)
ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name,
  tees = EXCLUDED.tees,
  holes = EXCLUDED.holes,
  updated_at = NOW();

-- ============================================================================
-- 3. MOUNT OSMOND GOLF CLUB
-- ============================================================================
INSERT INTO venues (id, source, name, state, city, address, phone, website, total_holes)
VALUES (
  'f2a3b4c5-d6e7-8901-abcd-500000000927',
  'manual',
  'Mount Osmond Golf Club',
  'SA',
  'Mount Osmond',
  'Mount Osmond Road',
  NULL,
  'https://www.mosmond.com.au',
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
  'f2a3b4c5-d6e7-8901-abcd-500000000927',
  'Mount Osmond Golf Club',
  'Historic Adelaide Hills course opened in 1927. Spectacular panoramic views of Adelaide from the highest golf course in the region.',
  NULL,
  NULL,
  '[
    {"hole": 1, "par": 4, "stroke_index": 2, "yards_blue": 379, "yards_white": 375},
    {"hole": 2, "par": 3, "stroke_index": 13, "yards_blue": 168, "yards_white": 150},
    {"hole": 3, "par": 4, "stroke_index": 17, "yards_blue": 434, "yards_white": 418},
    {"hole": 4, "par": 3, "stroke_index": 11, "yards_blue": 162, "yards_white": 126},
    {"hole": 5, "par": 4, "stroke_index": 9, "yards_blue": 340, "yards_white": 310},
    {"hole": 6, "par": 5, "stroke_index": 3, "yards_blue": 473, "yards_white": 326},
    {"hole": 7, "par": 4, "stroke_index": 15, "yards_blue": 265, "yards_white": 195},
    {"hole": 8, "par": 4, "stroke_index": 5, "yards_blue": 343, "yards_white": 280},
    {"hole": 9, "par": 4, "stroke_index": 7, "yards_blue": 369, "yards_white": 286},
    {"hole": 10, "par": 4, "stroke_index": 1, "yards_blue": 405, "yards_white": 308},
    {"hole": 11, "par": 3, "stroke_index": 14, "yards_blue": 150, "yards_white": 142},
    {"hole": 12, "par": 4, "stroke_index": 8, "yards_blue": 330, "yards_white": 321},
    {"hole": 13, "par": 3, "stroke_index": 10, "yards_blue": 163, "yards_white": 127},
    {"hole": 14, "par": 5, "stroke_index": 18, "yards_blue": 430, "yards_white": 366},
    {"hole": 15, "par": 4, "stroke_index": 4, "yards_blue": 363, "yards_white": 322},
    {"hole": 16, "par": 3, "stroke_index": 16, "yards_blue": 132, "yards_white": 111},
    {"hole": 17, "par": 4, "stroke_index": 6, "yards_blue": 320, "yards_white": 240},
    {"hole": 18, "par": 5, "stroke_index": 12, "yards_blue": 472, "yards_white": 396}
  ]'::jsonb,
  '[
    {"name": "Blue", "color": "blue", "gender": "mens", "rating": null, "slope": null, "par": 70, "yards": 5698},
    {"name": "White", "color": "white", "gender": "mens", "rating": null, "slope": null, "par": 70, "yards": 4799}
  ]'::jsonb
)
ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name,
  tees = EXCLUDED.tees,
  holes = EXCLUDED.holes,
  updated_at = NOW();

-- ============================================================================
-- 4. WILLUNGA GOLF CLUB
-- ============================================================================
INSERT INTO venues (id, source, name, state, city, address, phone, website, total_holes)
VALUES (
  'f2a3b4c5-d6e7-8901-abcd-500000000928',
  'manual',
  'Willunga Golf Club',
  'SA',
  'Willunga',
  'Aldinga Road',
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
  'f2a3b4c5-d6e7-8901-abcd-500000000928',
  'Willunga Golf Club',
  'Parkland course in the Fleurieu Peninsula wine region south of Adelaide.',
  113,
  68.0,
  '[
    {"hole": 1, "par": 4, "stroke_index": 1, "yards_blue": 391, "yards_yellow": 369, "yards_red": 359},
    {"hole": 2, "par": 4, "stroke_index": 3, "yards_blue": 260, "yards_yellow": 249, "yards_red": 243},
    {"hole": 3, "par": 3, "stroke_index": 5, "yards_blue": 142, "yards_yellow": 133, "yards_red": 130},
    {"hole": 4, "par": 5, "stroke_index": 7, "yards_blue": 456, "yards_yellow": 437, "yards_red": 408},
    {"hole": 5, "par": 3, "stroke_index": 9, "yards_blue": 112, "yards_yellow": 99, "yards_red": 94},
    {"hole": 6, "par": 4, "stroke_index": 11, "yards_blue": 330, "yards_yellow": 285, "yards_red": 273},
    {"hole": 7, "par": 4, "stroke_index": 13, "yards_blue": 379, "yards_yellow": 359, "yards_red": 350},
    {"hole": 8, "par": 4, "stroke_index": 15, "yards_blue": 341, "yards_yellow": 332, "yards_red": 327},
    {"hole": 9, "par": 5, "stroke_index": 17, "yards_blue": 476, "yards_yellow": 467, "yards_red": 446},
    {"hole": 10, "par": 4, "stroke_index": 2, "yards_blue": 337, "yards_yellow": 325, "yards_red": 321},
    {"hole": 11, "par": 4, "stroke_index": 4, "yards_blue": 322, "yards_yellow": 305, "yards_red": 301},
    {"hole": 12, "par": 3, "stroke_index": 6, "yards_blue": 126, "yards_yellow": 114, "yards_red": 107},
    {"hole": 13, "par": 4, "stroke_index": 8, "yards_blue": 337, "yards_yellow": 275, "yards_red": 309},
    {"hole": 14, "par": 3, "stroke_index": 10, "yards_blue": 133, "yards_yellow": 119, "yards_red": 115},
    {"hole": 15, "par": 4, "stroke_index": 12, "yards_blue": 361, "yards_yellow": 341, "yards_red": 361},
    {"hole": 16, "par": 3, "stroke_index": 14, "yards_blue": 139, "yards_yellow": 129, "yards_red": 125},
    {"hole": 17, "par": 5, "stroke_index": 16, "yards_blue": 548, "yards_yellow": 535, "yards_red": 465},
    {"hole": 18, "par": 4, "stroke_index": 18, "yards_blue": 336, "yards_yellow": 328, "yards_red": 324}
  ]'::jsonb,
  '[
    {"name": "Blue", "color": "blue", "gender": "mens", "rating": 68.0, "slope": 113, "par": 70, "yards": 5526},
    {"name": "Yellow", "color": "yellow", "gender": "mens", "rating": 69.0, "slope": 113, "par": 70, "yards": 5201},
    {"name": "Red", "color": "red", "gender": "ladies", "rating": null, "slope": null, "par": 70, "yards": 5058}
  ]'::jsonb
)
ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name,
  tees = EXCLUDED.tees,
  holes = EXCLUDED.holes,
  updated_at = NOW();

-- ============================================================================
-- 5. ECHUNGA GOLF CLUB
-- ============================================================================
INSERT INTO venues (id, source, name, state, city, address, phone, website, total_holes)
VALUES (
  'f2a3b4c5-d6e7-8901-abcd-500000000929',
  'manual',
  'Echunga Golf Club',
  'SA',
  'Echunga',
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
  'f2a3b4c5-d6e7-8901-abcd-500000000929',
  'Echunga Golf Club',
  'Scenic Adelaide Hills parkland course established in 1950. Open guest policy.',
  NULL,
  NULL,
  '[
    {"hole": 1, "par": 4, "stroke_index": 1, "yards_white": 378, "yards_red": 355},
    {"hole": 2, "par": 3, "stroke_index": 16, "yards_white": 125, "yards_red": 115},
    {"hole": 3, "par": 4, "stroke_index": 7, "yards_white": 313, "yards_red": 295},
    {"hole": 4, "par": 4, "stroke_index": 9, "yards_white": 315, "yards_red": 295},
    {"hole": 5, "par": 4, "stroke_index": 4, "yards_white": 353, "yards_red": 340},
    {"hole": 6, "par": 5, "stroke_index": 3, "yards_white": 488, "yards_red": 465},
    {"hole": 7, "par": 3, "stroke_index": 13, "yards_white": 174, "yards_red": 160},
    {"hole": 8, "par": 4, "stroke_index": 6, "yards_white": 339, "yards_red": 320},
    {"hole": 9, "par": 4, "stroke_index": 11, "yards_white": 360, "yards_red": 340},
    {"hole": 10, "par": 4, "stroke_index": 10, "yards_white": 266, "yards_red": 250},
    {"hole": 11, "par": 4, "stroke_index": 12, "yards_white": 329, "yards_red": 310},
    {"hole": 12, "par": 4, "stroke_index": 2, "yards_white": 369, "yards_red": 355},
    {"hole": 13, "par": 4, "stroke_index": 14, "yards_white": 284, "yards_red": 270},
    {"hole": 14, "par": 5, "stroke_index": 17, "yards_white": 432, "yards_red": 415},
    {"hole": 15, "par": 4, "stroke_index": 15, "yards_white": 292, "yards_red": 280},
    {"hole": 16, "par": 4, "stroke_index": 5, "yards_white": 314, "yards_red": 298},
    {"hole": 17, "par": 3, "stroke_index": 8, "yards_white": 180, "yards_red": 165},
    {"hole": 18, "par": 3, "stroke_index": 18, "yards_white": 147, "yards_red": 136}
  ]'::jsonb,
  '[
    {"name": "White", "color": "white", "gender": "mens", "rating": null, "slope": null, "par": 70, "yards": 5458},
    {"name": "Red", "color": "red", "gender": "ladies", "rating": null, "slope": null, "par": 71, "yards": 5084}
  ]'::jsonb
)
ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name,
  tees = EXCLUDED.tees,
  holes = EXCLUDED.holes,
  updated_at = NOW();

-- ============================================================================
-- 6. THAXTED PARK GOLF CLUB
-- ============================================================================
INSERT INTO venues (id, source, name, state, city, address, phone, website, total_holes)
VALUES (
  'f2a3b4c5-d6e7-8901-abcd-500000000930',
  'manual',
  'Thaxted Park Golf Club',
  'SA',
  'Woodcroft',
  'Bains Road',
  NULL,
  'https://www.thaxtedpark.com.au',
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
  'f2a3b4c5-d6e7-8901-abcd-500000000930',
  'Thaxted Park Golf Club',
  'Parkland course in Adelaide',
  NULL,
  NULL,
  '[
    {"hole": 1, "par": 5, "stroke_index": 14, "par_black": 5, "stroke_index_black": 1, "yards_green": 462, "yards_black": 453},
    {"hole": 2, "par": 4, "stroke_index": 4, "par_black": 4, "stroke_index_black": 3, "yards_green": 356, "yards_black": 297},
    {"hole": 3, "par": 4, "stroke_index": 10, "par_black": 4, "stroke_index_black": 9, "yards_green": 366, "yards_black": 350},
    {"hole": 4, "par": 4, "stroke_index": 12, "par_black": 4, "stroke_index_black": 11, "yards_green": 305, "yards_black": 296},
    {"hole": 5, "par": 4, "stroke_index": 6, "par_black": 4, "stroke_index_black": 7, "yards_green": 376, "yards_black": 350},
    {"hole": 6, "par": 3, "stroke_index": 16, "par_black": 3, "stroke_index_black": 16, "yards_green": 147, "yards_black": 141},
    {"hole": 7, "par": 5, "stroke_index": 8, "par_black": 5, "stroke_index_black": 5, "yards_green": 466, "yards_black": 392},
    {"hole": 8, "par": 3, "stroke_index": 18, "par_black": 3, "stroke_index_black": 18, "yards_green": 142, "yards_black": 142},
    {"hole": 9, "par": 4, "stroke_index": 2, "par_black": 5, "stroke_index_black": 14, "yards_green": 402, "yards_black": 397},
    {"hole": 10, "par": 5, "stroke_index": 9, "par_black": 5, "stroke_index_black": 2, "yards_green": 470, "yards_black": 410},
    {"hole": 11, "par": 3, "stroke_index": 5, "par_black": 3, "stroke_index_black": 13, "yards_green": 170, "yards_black": 145},
    {"hole": 12, "par": 4, "stroke_index": 15, "par_black": 4, "stroke_index_black": 12, "yards_green": 315, "yards_black": 312},
    {"hole": 13, "par": 4, "stroke_index": 11, "par_black": 4, "stroke_index_black": 15, "yards_green": 267, "yards_black": 230},
    {"hole": 14, "par": 5, "stroke_index": 7, "par_black": 5, "stroke_index_black": 6, "yards_green": 512, "yards_black": 416},
    {"hole": 15, "par": 3, "stroke_index": 17, "par_black": 3, "stroke_index_black": 17, "yards_green": 106, "yards_black": 106},
    {"hole": 16, "par": 4, "stroke_index": 3, "par_black": 4, "stroke_index_black": 8, "yards_green": 380, "yards_black": 292},
    {"hole": 17, "par": 4, "stroke_index": 13, "par_black": 4, "stroke_index_black": 10, "yards_green": 316, "yards_black": 273},
    {"hole": 18, "par": 4, "stroke_index": 1, "par_black": 5, "stroke_index_black": 4, "yards_green": 394, "yards_black": 383}
  ]'::jsonb,
  '[
    {"name": "Green", "color": "green", "gender": "mens", "rating": null, "slope": null, "par": 72, "yards": 5952},
    {"name": "Black", "color": "black", "gender": "ladies", "rating": null, "slope": null, "par": 74, "yards": 5385}
  ]'::jsonb
)
ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name,
  tees = EXCLUDED.tees,
  holes = EXCLUDED.holes,
  updated_at = NOW();

-- ============================================================================
-- 7. VICTOR HARBOR GOLF CLUB
-- ============================================================================
INSERT INTO venues (id, source, name, state, city, address, phone, website, total_holes)
VALUES (
  'f2a3b4c5-d6e7-8901-abcd-500000000931',
  'manual',
  'Victor Harbor Golf Club',
  'SA',
  'Victor Harbor',
  'Inman Valley Road',
  '+61 (08) 8552 1713',
  'https://www.victorharborgolf.com.au',
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
  'f2a3b4c5-d6e7-8901-abcd-500000000931',
  'Victor Harbor Golf Club',
  'Scenic parkland course on the Fleurieu Peninsula with coastal views.',
  129,
  72.0,
  '[
    {"hole": 1, "par": 4, "stroke_index": 5, "par_red": 4, "stroke_index_red": 17, "yards_blue": 355, "yards_red": 320},
    {"hole": 2, "par": 4, "stroke_index": 10, "par_red": 4, "stroke_index_red": 12, "yards_blue": 325, "yards_red": 290},
    {"hole": 3, "par": 3, "stroke_index": 15, "par_red": 3, "stroke_index_red": 13, "yards_blue": 165, "yards_red": 150},
    {"hole": 4, "par": 5, "stroke_index": 11, "par_red": 5, "stroke_index_red": 10, "yards_blue": 475, "yards_red": 435},
    {"hole": 5, "par": 4, "stroke_index": 7, "par_red": 4, "stroke_index_red": 6, "yards_blue": 370, "yards_red": 330},
    {"hole": 6, "par": 5, "stroke_index": 13, "par_red": 5, "stroke_index_red": 8, "yards_blue": 480, "yards_red": 420},
    {"hole": 7, "par": 3, "stroke_index": 18, "par_red": 3, "stroke_index_red": 15, "yards_blue": 140, "yards_red": 125},
    {"hole": 8, "par": 4, "stroke_index": 3, "par_red": 4, "stroke_index_red": 4, "yards_blue": 385, "yards_red": 350},
    {"hole": 9, "par": 4, "stroke_index": 1, "par_red": 4, "stroke_index_red": 1, "yards_blue": 397, "yards_red": 360},
    {"hole": 10, "par": 3, "stroke_index": 4, "par_red": 3, "stroke_index_red": 16, "yards_blue": 180, "yards_red": 165},
    {"hole": 11, "par": 4, "stroke_index": 9, "par_red": 4, "stroke_index_red": 9, "yards_blue": 350, "yards_red": 315},
    {"hole": 12, "par": 5, "stroke_index": 2, "par_red": 5, "stroke_index_red": 2, "yards_blue": 510, "yards_red": 460},
    {"hole": 13, "par": 5, "stroke_index": 17, "par_red": 5, "stroke_index_red": 3, "yards_blue": 465, "yards_red": 425},
    {"hole": 14, "par": 3, "stroke_index": 16, "par_red": 3, "stroke_index_red": 18, "yards_blue": 155, "yards_red": 140},
    {"hole": 15, "par": 4, "stroke_index": 14, "par_red": 4, "stroke_index_red": 5, "yards_blue": 340, "yards_red": 305},
    {"hole": 16, "par": 4, "stroke_index": 6, "par_red": 4, "stroke_index_red": 7, "yards_blue": 365, "yards_red": 325},
    {"hole": 17, "par": 4, "stroke_index": 8, "par_red": 4, "stroke_index_red": 11, "yards_blue": 345, "yards_red": 310},
    {"hole": 18, "par": 4, "stroke_index": 12, "par_red": 4, "stroke_index_red": 14, "yards_blue": 360, "yards_red": 326}
  ]'::jsonb,
  '[
    {"name": "Blue", "color": "blue", "gender": "mens", "rating": 72.0, "slope": 129, "par": 72, "yards": 5962},
    {"name": "Red", "color": "red", "gender": "ladies", "rating": 75.0, "slope": 129, "par": 73, "yards": 5351}
  ]'::jsonb
)
ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name,
  tees = EXCLUDED.tees,
  holes = EXCLUDED.holes,
  updated_at = NOW();

-- ============================================================================
-- 8. LINKS LADY BAY
-- ============================================================================
INSERT INTO venues (id, source, name, state, city, address, phone, website, total_holes)
VALUES (
  'f2a3b4c5-d6e7-8901-abcd-500000000932',
  'manual',
  'Links Lady Bay',
  'SA',
  'Normanville',
  'Jetty Road',
  NULL,
  'https://www.linksladybay.com.au',
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
  'f2a3b4c5-d6e7-8901-abcd-500000000932',
  'Links Lady Bay',
  'Championship links-style resort course opened in 1998. One of South Australia',
  140,
  74.0,
  '[
    {"hole": 1, "par": 4, "stroke_index": 17, "par_red": 4, "stroke_index_red": 17, "yards_blue": 356, "yards_white": 334, "yards_red": 303},
    {"hole": 2, "par": 4, "stroke_index": 6, "par_red": 4, "stroke_index_red": 8, "yards_blue": 377, "yards_white": 351, "yards_red": 333},
    {"hole": 3, "par": 5, "stroke_index": 10, "par_red": 5, "stroke_index_red": 4, "yards_blue": 515, "yards_white": 485, "yards_red": 448},
    {"hole": 4, "par": 4, "stroke_index": 15, "par_red": 4, "stroke_index_red": 9, "yards_blue": 339, "yards_white": 321, "yards_red": 292},
    {"hole": 5, "par": 4, "stroke_index": 3, "par_red": 5, "stroke_index_red": 12, "yards_blue": 428, "yards_white": 414, "yards_red": 428},
    {"hole": 6, "par": 3, "stroke_index": 14, "par_red": 3, "stroke_index_red": 15, "yards_blue": 155, "yards_white": 147, "yards_red": 128},
    {"hole": 7, "par": 5, "stroke_index": 12, "par_red": 5, "stroke_index_red": 2, "yards_blue": 509, "yards_white": 488, "yards_red": 449},
    {"hole": 8, "par": 3, "stroke_index": 8, "par_red": 3, "stroke_index_red": 13, "yards_blue": 175, "yards_white": 160, "yards_red": 131},
    {"hole": 9, "par": 4, "stroke_index": 2, "par_red": 4, "stroke_index_red": 6, "yards_blue": 406, "yards_white": 372, "yards_red": 313},
    {"hole": 10, "par": 4, "stroke_index": 13, "par_red": 4, "stroke_index_red": 10, "yards_blue": 330, "yards_white": 330, "yards_red": 273},
    {"hole": 11, "par": 4, "stroke_index": 5, "par_red": 4, "stroke_index_red": 7, "yards_blue": 373, "yards_white": 359, "yards_red": 334},
    {"hole": 12, "par": 4, "stroke_index": 1, "par_red": 4, "stroke_index_red": 3, "yards_blue": 425, "yards_white": 390, "yards_red": 338},
    {"hole": 13, "par": 4, "stroke_index": 16, "par_red": 4, "stroke_index_red": 16, "yards_blue": 299, "yards_white": 276, "yards_red": 226},
    {"hole": 14, "par": 4, "stroke_index": 4, "par_red": 4, "stroke_index_red": 5, "yards_blue": 355, "yards_white": 328, "yards_red": 273},
    {"hole": 15, "par": 3, "stroke_index": 18, "par_red": 3, "stroke_index_red": 18, "yards_blue": 126, "yards_white": 126, "yards_red": 96},
    {"hole": 16, "par": 5, "stroke_index": 11, "par_red": 5, "stroke_index_red": 11, "yards_blue": 526, "yards_white": 495, "yards_red": 420},
    {"hole": 17, "par": 3, "stroke_index": 7, "par_red": 3, "stroke_index_red": 14, "yards_blue": 197, "yards_white": 167, "yards_red": 136},
    {"hole": 18, "par": 5, "stroke_index": 9, "par_red": 5, "stroke_index_red": 1, "yards_blue": 509, "yards_white": 477, "yards_red": 424}
  ]'::jsonb,
  '[
    {"name": "Blue", "color": "blue", "gender": "mens", "rating": 74.0, "slope": 140, "par": 72, "yards": 6400},
    {"name": "White", "color": "white", "gender": "mens", "rating": 73.0, "slope": 139, "par": 72, "yards": 6020},
    {"name": "Red", "color": "red", "gender": "ladies", "rating": 75.0, "slope": 131, "par": 73, "yards": 5345}
  ]'::jsonb
)
ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name,
  tees = EXCLUDED.tees,
  holes = EXCLUDED.holes,
  updated_at = NOW();
