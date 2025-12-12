-- =====================================================
-- Migration: victoria_batch_04_bellarine_geelong
-- Description: Add Bellarine Peninsula and Geelong golf venues and courses
--              Part of Victorian golf course data collection
-- Date: 2025-12-10
-- Batch: 4 of 7 (Bellarine & Geelong)
-- =====================================================

-- =====================================================
-- STEP 1: INSERT NEW VENUES
-- Using ON CONFLICT to handle re-runs safely
-- =====================================================

-- Anglesea Golf Club (Famous for kangaroos on course)
INSERT INTO venues (id, source, name, state, city, address, phone, website, total_holes)
VALUES (
  'f1a2b3c4-d5e6-7890-abcd-400000000001',
  'manual',
  'Anglesea Golf Club',
  'VIC',
  'Anglesea',
  '2 Golf Links Road, Anglesea VIC 3230',
  '+61 3 5263 1582',
  'https://www.angleseagolfclub.com.au',
  18
)
ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name,
  address = EXCLUDED.address,
  phone = EXCLUDED.phone,
  website = EXCLUDED.website;

-- Curlewis Golf Club (Top 100 ranked)
INSERT INTO venues (id, source, name, state, city, address, phone, website, total_holes)
VALUES (
  'f1a2b3c4-d5e6-7890-abcd-400000000002',
  'manual',
  'Curlewis Golf Club',
  'VIC',
  'Curlewis',
  '1285 Portarlington Road, Curlewis VIC 3222',
  '+61 3 5251 2848',
  'https://www.curlewisgolf.com.au',
  18
)
ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name,
  address = EXCLUDED.address,
  phone = EXCLUDED.phone,
  website = EXCLUDED.website;

-- Lonsdale Links Golf Club (Top 100 ranked, OCM redesign)
INSERT INTO venues (id, source, name, state, city, address, phone, website, total_holes)
VALUES (
  'f1a2b3c4-d5e6-7890-abcd-400000000003',
  'manual',
  'Lonsdale Links',
  'VIC',
  'Point Lonsdale',
  '2 Fellows Road, Point Lonsdale VIC 3225',
  '+61 3 5258 1004',
  'https://www.lonsdalelinks.com.au',
  18
)
ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name,
  address = EXCLUDED.address,
  phone = EXCLUDED.phone,
  website = EXCLUDED.website;

-- Torquay Golf Club (RACV Torquay)
INSERT INTO venues (id, source, name, state, city, address, phone, website, total_holes)
VALUES (
  'f1a2b3c4-d5e6-7890-abcd-400000000004',
  'manual',
  'Torquay Golf Club',
  'VIC',
  'Torquay',
  '1 Great Ocean Road, Jan Juc VIC 3228',
  '+61 3 5261 5544',
  'https://www.torquaygolfclub.com.au',
  18
)
ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name,
  address = EXCLUDED.address,
  phone = EXCLUDED.phone,
  website = EXCLUDED.website;

-- Geelong Golf Club (Oldest club in Victoria, est. 1892)
INSERT INTO venues (id, source, name, state, city, address, phone, website, total_holes)
VALUES (
  'f1a2b3c4-d5e6-7890-abcd-400000000005',
  'manual',
  'Geelong Golf Club',
  'VIC',
  'Geelong',
  '374 Myers Street, Geelong VIC 3220',
  '+61 3 4210 1010',
  'https://www.geelonggolf.com.au',
  18
)
ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name,
  address = EXCLUDED.address,
  phone = EXCLUDED.phone,
  website = EXCLUDED.website;

-- Ocean Grove Golf Club
INSERT INTO venues (id, source, name, state, city, address, phone, website, total_holes)
VALUES (
  'f1a2b3c4-d5e6-7890-abcd-400000000006',
  'manual',
  'Ocean Grove Golf Club',
  'VIC',
  'Ocean Grove',
  '1 Guthridge Street, Ocean Grove VIC 3226',
  '+61 3 5256 2795',
  'https://www.oceangrovegc.com.au',
  18
)
ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name,
  address = EXCLUDED.address,
  phone = EXCLUDED.phone,
  website = EXCLUDED.website;

-- Clifton Springs Golf Club
INSERT INTO venues (id, source, name, state, city, address, phone, website, total_holes)
VALUES (
  'f1a2b3c4-d5e6-7890-abcd-400000000007',
  'manual',
  'Clifton Springs Golf Club',
  'VIC',
  'Clifton Springs',
  'Jetty Road, Clifton Springs VIC 3222',
  '+61 3 5251 2907',
  'https://www.cliftonspringsgolfclub.com.au',
  18
)
ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name,
  address = EXCLUDED.address,
  phone = EXCLUDED.phone,
  website = EXCLUDED.website;

-- Queenscliff Golf Club
INSERT INTO venues (id, source, name, state, city, address, phone, website, total_holes)
VALUES (
  'f1a2b3c4-d5e6-7890-abcd-400000000008',
  'manual',
  'Queenscliff Golf Club',
  'VIC',
  'Queenscliff',
  'Swan Island, Queenscliff VIC 3225',
  '+61 3 5258 1951',
  'https://www.queenscliffgolf.com.au',
  18
)
ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name,
  address = EXCLUDED.address,
  phone = EXCLUDED.phone,
  website = EXCLUDED.website;

-- Portarlington Golf Club
INSERT INTO venues (id, source, name, state, city, address, phone, website, total_holes)
VALUES (
  'f1a2b3c4-d5e6-7890-abcd-400000000009',
  'manual',
  'Portarlington Golf Club',
  'VIC',
  'Portarlington',
  '130 Hood Road, Portarlington VIC 3223',
  '+61 3 5259 2492',
  'https://port.golf',
  18
)
ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name,
  address = EXCLUDED.address,
  phone = EXCLUDED.phone,
  website = EXCLUDED.website;

-- =====================================================
-- STEP 2: INSERT COURSES WITH FULL HOLE DATA
-- =====================================================

-- ANGLESEA GOLF CLUB
-- Famous for kangaroos on course, Par 73 layout
INSERT INTO courses (venue_id, name, description, slope_rating, course_rating, holes, tees)
VALUES (
  'f1a2b3c4-d5e6-7890-abcd-400000000001',
  'Anglesea',
  'Iconic Australian course famous for its resident kangaroos. Challenging Par 73 layout featuring three par 5s on each nine. The 577-yard 2nd hole is a true test. Beautiful coastal setting on the Great Ocean Road with stunning bushland surrounds.',
  125,
  73.0,
  '[
    {"number": 1, "par": 5, "strokeIndex": 11, "yardages": {"white": 475, "red": 453}},
    {"number": 2, "par": 5, "strokeIndex": 1, "yardages": {"white": 577, "red": 477}},
    {"number": 3, "par": 3, "strokeIndex": 15, "yardages": {"white": 174, "red": 139}},
    {"number": 4, "par": 4, "strokeIndex": 3, "yardages": {"white": 407, "red": 328}},
    {"number": 5, "par": 4, "strokeIndex": 7, "yardages": {"white": 372, "red": 304}},
    {"number": 6, "par": 3, "strokeIndex": 5, "yardages": {"white": 192, "red": 157}},
    {"number": 7, "par": 4, "strokeIndex": 13, "yardages": {"white": 330, "red": 293}},
    {"number": 8, "par": 5, "strokeIndex": 9, "yardages": {"white": 493, "red": 456}},
    {"number": 9, "par": 4, "strokeIndex": 17, "yardages": {"white": 366, "red": 339}},
    {"number": 10, "par": 4, "strokeIndex": 14, "yardages": {"white": 319, "red": 305}},
    {"number": 11, "par": 4, "strokeIndex": 8, "yardages": {"white": 365, "red": 357}},
    {"number": 12, "par": 5, "strokeIndex": 10, "yardages": {"white": 519, "red": 452}},
    {"number": 13, "par": 3, "strokeIndex": 18, "yardages": {"white": 140, "red": 125}},
    {"number": 14, "par": 4, "strokeIndex": 2, "yardages": {"white": 446, "red": 364}},
    {"number": 15, "par": 4, "strokeIndex": 6, "yardages": {"white": 381, "red": 318}},
    {"number": 16, "par": 3, "strokeIndex": 16, "yardages": {"white": 137, "red": 121}},
    {"number": 17, "par": 4, "strokeIndex": 4, "yardages": {"white": 400, "red": 373}},
    {"number": 18, "par": 5, "strokeIndex": 12, "yardages": {"white": 498, "red": 424}}
  ]'::jsonb,
  '[
    {"name": "White", "color": "white", "courseRating": 73.0, "slopeRating": 125, "totalYardage": 6591},
    {"name": "Red", "color": "red", "courseRating": 74.0, "slopeRating": 122, "totalYardage": 5785}
  ]'::jsonb
)
ON CONFLICT (venue_id, name) DO UPDATE SET
  description = EXCLUDED.description,
  slope_rating = EXCLUDED.slope_rating,
  course_rating = EXCLUDED.course_rating,
  holes = EXCLUDED.holes,
  tees = EXCLUDED.tees;

-- CURLEWIS GOLF CLUB
-- Top 100 ranked public access course
INSERT INTO courses (venue_id, name, description, slope_rating, course_rating, holes, tees)
VALUES (
  'f1a2b3c4-d5e6-7890-abcd-400000000002',
  'Curlewis',
  'Top 100 ranked public access course on the Bellarine Peninsula. Challenging layout with water hazards and strategic bunkering. The 6th hole at 520 yards is stroke index 5, and the 15th at 400 yards is stroke index 1. Outstanding conditioning year-round.',
  127,
  72.0,
  '[
    {"number": 1, "par": 5, "strokeIndex": 14, "yardages": {"white": 448, "red": 354}},
    {"number": 2, "par": 4, "strokeIndex": 12, "yardages": {"white": 333, "red": 279}},
    {"number": 3, "par": 4, "strokeIndex": 17, "yardages": {"white": 308, "red": 300}},
    {"number": 4, "par": 3, "strokeIndex": 2, "yardages": {"white": 174, "red": 130}},
    {"number": 5, "par": 4, "strokeIndex": 15, "yardages": {"white": 341, "red": 324}},
    {"number": 6, "par": 5, "strokeIndex": 5, "yardages": {"white": 520, "red": 440}},
    {"number": 7, "par": 4, "strokeIndex": 4, "yardages": {"white": 379, "red": 360}},
    {"number": 8, "par": 3, "strokeIndex": 10, "yardages": {"white": 139, "red": 120}},
    {"number": 9, "par": 4, "strokeIndex": 11, "yardages": {"white": 347, "red": 330}},
    {"number": 10, "par": 4, "strokeIndex": 13, "yardages": {"white": 338, "red": 267}},
    {"number": 11, "par": 4, "strokeIndex": 9, "yardages": {"white": 361, "red": 309}},
    {"number": 12, "par": 5, "strokeIndex": 8, "yardages": {"white": 513, "red": 440}},
    {"number": 13, "par": 3, "strokeIndex": 3, "yardages": {"white": 201, "red": 136}},
    {"number": 14, "par": 5, "strokeIndex": 18, "yardages": {"white": 484, "red": 422}},
    {"number": 15, "par": 4, "strokeIndex": 1, "yardages": {"white": 400, "red": 382}},
    {"number": 16, "par": 4, "strokeIndex": 7, "yardages": {"white": 367, "red": 300}},
    {"number": 17, "par": 3, "strokeIndex": 16, "yardages": {"white": 138, "red": 116}},
    {"number": 18, "par": 4, "strokeIndex": 6, "yardages": {"white": 315, "red": 275}}
  ]'::jsonb,
  '[
    {"name": "White", "color": "white", "courseRating": 72.0, "slopeRating": 127, "totalYardage": 6106},
    {"name": "Red", "color": "red", "courseRating": 73.0, "slopeRating": 124, "totalYardage": 5284}
  ]'::jsonb
)
ON CONFLICT (venue_id, name) DO UPDATE SET
  description = EXCLUDED.description,
  slope_rating = EXCLUDED.slope_rating,
  course_rating = EXCLUDED.course_rating,
  holes = EXCLUDED.holes,
  tees = EXCLUDED.tees;

-- LONSDALE LINKS
-- Top 100 ranked, OCM redesign with template holes
INSERT INTO courses (venue_id, name, description, slope_rating, course_rating, holes, tees)
VALUES (
  'f1a2b3c4-d5e6-7890-abcd-400000000003',
  'Lonsdale Links',
  'Recently redesigned by Ogilvy Clayton Mead (2020), this links course features template holes inspired by Charles Blair Macdonald including the Alps, Biarritz, Redan, and Punchbowl. Ranked #16 in Australia''s Top 100. The 579-yard 3rd (stroke index 1) and 622-yard 13th are exceptional par 5s.',
  125,
  70.0,
  '[
    {"number": 1, "par": 4, "strokeIndex": 12, "yardages": {"white": 365}},
    {"number": 2, "par": 3, "strokeIndex": 9, "yardages": {"white": 196}},
    {"number": 3, "par": 5, "strokeIndex": 1, "yardages": {"white": 579}},
    {"number": 4, "par": 4, "strokeIndex": 16, "yardages": {"white": 322}},
    {"number": 5, "par": 4, "strokeIndex": 7, "yardages": {"white": 400}},
    {"number": 6, "par": 3, "strokeIndex": 14, "yardages": {"white": 203}},
    {"number": 7, "par": 3, "strokeIndex": 17, "yardages": {"white": 155}},
    {"number": 8, "par": 4, "strokeIndex": 4, "yardages": {"white": 454}},
    {"number": 9, "par": 4, "strokeIndex": 11, "yardages": {"white": 329}},
    {"number": 10, "par": 4, "strokeIndex": 10, "yardages": {"white": 412}},
    {"number": 11, "par": 5, "strokeIndex": 13, "yardages": {"white": 538}},
    {"number": 12, "par": 3, "strokeIndex": 8, "yardages": {"white": 203}},
    {"number": 13, "par": 5, "strokeIndex": 6, "yardages": {"white": 622}},
    {"number": 14, "par": 3, "strokeIndex": 18, "yardages": {"white": 155}},
    {"number": 15, "par": 4, "strokeIndex": 5, "yardages": {"white": 436}},
    {"number": 16, "par": 4, "strokeIndex": 15, "yardages": {"white": 329}},
    {"number": 17, "par": 4, "strokeIndex": 2, "yardages": {"white": 460}},
    {"number": 18, "par": 4, "strokeIndex": 3, "yardages": {"white": 418}}
  ]'::jsonb,
  '[
    {"name": "White", "color": "white", "courseRating": 70.0, "slopeRating": 125, "totalYardage": 6576}
  ]'::jsonb
)
ON CONFLICT (venue_id, name) DO UPDATE SET
  description = EXCLUDED.description,
  slope_rating = EXCLUDED.slope_rating,
  course_rating = EXCLUDED.course_rating,
  holes = EXCLUDED.holes,
  tees = EXCLUDED.tees;

-- TORQUAY GOLF CLUB (RACV Torquay)
-- Ogilvy Clayton designed links-style course
INSERT INTO courses (venue_id, name, description, slope_rating, course_rating, holes, tees)
VALUES (
  'f1a2b3c4-d5e6-7890-abcd-400000000004',
  'Torquay',
  'Premium links-style course designed by Ogilvy Clayton at the start of the Great Ocean Road. Features wide couch fairways, undulating greens, and challenging fescue roughs with stunning ocean views. The 6th at 433 yards is stroke index 1. Exceptional conditioning year-round.',
  130,
  72.0,
  '[
    {"number": 1, "par": 5, "strokeIndex": 12, "yardages": {"blue": 476, "red": 464}},
    {"number": 2, "par": 4, "strokeIndex": 16, "yardages": {"blue": 299, "red": 276}},
    {"number": 3, "par": 3, "strokeIndex": 17, "yardages": {"blue": 161, "red": 144}},
    {"number": 4, "par": 5, "strokeIndex": 9, "yardages": {"blue": 505, "red": 474}},
    {"number": 5, "par": 4, "strokeIndex": 5, "yardages": {"blue": 433, "red": 389}},
    {"number": 6, "par": 4, "strokeIndex": 1, "yardages": {"blue": 433, "red": 418}},
    {"number": 7, "par": 3, "strokeIndex": 8, "yardages": {"blue": 201, "red": 176}},
    {"number": 8, "par": 4, "strokeIndex": 3, "yardages": {"blue": 416, "red": 355}},
    {"number": 9, "par": 4, "strokeIndex": 13, "yardages": {"blue": 324, "red": 301}},
    {"number": 10, "par": 3, "strokeIndex": 14, "yardages": {"blue": 150, "red": 142}},
    {"number": 11, "par": 4, "strokeIndex": 4, "yardages": {"blue": 405, "red": 354}},
    {"number": 12, "par": 5, "strokeIndex": 10, "yardages": {"blue": 522, "red": 469}},
    {"number": 13, "par": 4, "strokeIndex": 6, "yardages": {"blue": 388, "red": 379}},
    {"number": 14, "par": 4, "strokeIndex": 18, "yardages": {"blue": 325, "red": 283}},
    {"number": 15, "par": 4, "strokeIndex": 7, "yardages": {"blue": 394, "red": 338}},
    {"number": 16, "par": 4, "strokeIndex": 2, "yardages": {"blue": 419, "red": 326}},
    {"number": 17, "par": 3, "strokeIndex": 15, "yardages": {"blue": 129, "red": 117}},
    {"number": 18, "par": 5, "strokeIndex": 11, "yardages": {"blue": 490, "red": 468}}
  ]'::jsonb,
  '[
    {"name": "Blue", "color": "blue", "courseRating": 72.0, "slopeRating": 130, "totalYardage": 6470},
    {"name": "Red", "color": "red", "courseRating": 74.0, "slopeRating": 127, "totalYardage": 5873}
  ]'::jsonb
)
ON CONFLICT (venue_id, name) DO UPDATE SET
  description = EXCLUDED.description,
  slope_rating = EXCLUDED.slope_rating,
  course_rating = EXCLUDED.course_rating,
  holes = EXCLUDED.holes,
  tees = EXCLUDED.tees;

-- GEELONG GOLF CLUB
-- Oldest club in Victoria (1892), parkland course
INSERT INTO courses (venue_id, name, description, slope_rating, course_rating, holes, tees)
VALUES (
  'f1a2b3c4-d5e6-7890-abcd-400000000005',
  'Geelong',
  'Victoria''s oldest golf club, founded in 1892. Classic parkland layout featuring tight tree-lined fairways. The 8th hole at 141 yards is stroke index 1. Features four par 3s, one par 5, and four short par 4s on the front nine with challenging greens throughout.',
  120,
  70.0,
  '[
    {"number": 1, "par": 4, "strokeIndex": 18, "yardages": {"black": 290, "white": 280, "blue": 286, "red": 278}},
    {"number": 2, "par": 4, "strokeIndex": 8, "yardages": {"black": 365, "white": 350, "blue": 358, "red": 360}},
    {"number": 3, "par": 4, "strokeIndex": 12, "yardages": {"black": 279, "white": 270, "blue": 275, "red": 229}},
    {"number": 4, "par": 3, "strokeIndex": 3, "yardages": {"black": 197, "white": 190, "blue": 193, "red": 138}},
    {"number": 5, "par": 4, "strokeIndex": 14, "yardages": {"black": 462, "white": 450, "blue": 453, "red": 418}},
    {"number": 6, "par": 4, "strokeIndex": 6, "yardages": {"black": 323, "white": 300, "blue": 300, "red": 273}},
    {"number": 7, "par": 5, "strokeIndex": 10, "yardages": {"black": 503, "white": 490, "blue": 498, "red": 460}},
    {"number": 8, "par": 3, "strokeIndex": 1, "yardages": {"black": 141, "white": 130, "blue": 137, "red": 120}},
    {"number": 9, "par": 4, "strokeIndex": 16, "yardages": {"black": 303, "white": 300, "blue": 301, "red": 290}},
    {"number": 10, "par": 4, "strokeIndex": 17, "yardages": {"black": 290, "white": 280, "blue": 286, "red": 278}},
    {"number": 11, "par": 4, "strokeIndex": 7, "yardages": {"black": 365, "white": 350, "blue": 358, "red": 360}},
    {"number": 12, "par": 4, "strokeIndex": 11, "yardages": {"black": 279, "white": 270, "blue": 275, "red": 229}},
    {"number": 13, "par": 3, "strokeIndex": 2, "yardages": {"black": 197, "white": 190, "blue": 193, "red": 138}},
    {"number": 14, "par": 4, "strokeIndex": 13, "yardages": {"black": 462, "white": 450, "blue": 453, "red": 418}},
    {"number": 15, "par": 4, "strokeIndex": 5, "yardages": {"black": 323, "white": 300, "blue": 300, "red": 273}},
    {"number": 16, "par": 5, "strokeIndex": 9, "yardages": {"black": 503, "white": 490, "blue": 498, "red": 460}},
    {"number": 17, "par": 3, "strokeIndex": 4, "yardages": {"black": 141, "white": 130, "blue": 137, "red": 120}},
    {"number": 18, "par": 4, "strokeIndex": 15, "yardages": {"black": 303, "white": 300, "blue": 301, "red": 290}}
  ]'::jsonb,
  '[
    {"name": "Black", "color": "black", "courseRating": 70.0, "slopeRating": 120, "totalYardage": 5726},
    {"name": "White", "color": "white", "courseRating": 72.0, "slopeRating": 118, "totalYardage": 5520},
    {"name": "Blue", "color": "blue", "courseRating": 68.5, "slopeRating": 115, "totalYardage": 5602},
    {"name": "Red", "color": "red", "courseRating": 72.0, "slopeRating": 112, "totalYardage": 5132}
  ]'::jsonb
)
ON CONFLICT (venue_id, name) DO UPDATE SET
  description = EXCLUDED.description,
  slope_rating = EXCLUDED.slope_rating,
  course_rating = EXCLUDED.course_rating,
  holes = EXCLUDED.holes,
  tees = EXCLUDED.tees;

-- OCEAN GROVE GOLF CLUB
-- Unique 18-tee, 12-green layout with double greens
INSERT INTO courses (venue_id, name, description, slope_rating, course_rating, holes, tees)
VALUES (
  'f1a2b3c4-d5e6-7890-abcd-400000000006',
  'Ocean Grove',
  'Unique course featuring 18 tees and 12 greens including 2 double greens. Located on the Bellarine Peninsula across from Barwon Heads. Water carries and challenging greens throughout. The 14th at 312 yards is stroke index 1. Built in 1985 with natural bushland setting.',
  123,
  69.5,
  '[
    {"number": 1, "par": 3, "strokeIndex": 17, "yardages": {"blue": 130}},
    {"number": 2, "par": 5, "strokeIndex": 9, "yardages": {"blue": 429}},
    {"number": 3, "par": 4, "strokeIndex": 15, "yardages": {"blue": 352}},
    {"number": 4, "par": 4, "strokeIndex": 4, "yardages": {"blue": 376}},
    {"number": 5, "par": 4, "strokeIndex": 13, "yardages": {"blue": 342}},
    {"number": 6, "par": 4, "strokeIndex": 7, "yardages": {"blue": 246}},
    {"number": 7, "par": 4, "strokeIndex": 12, "yardages": {"blue": 365}},
    {"number": 8, "par": 5, "strokeIndex": 10, "yardages": {"blue": 486}},
    {"number": 9, "par": 4, "strokeIndex": 3, "yardages": {"blue": 368}},
    {"number": 10, "par": 3, "strokeIndex": 18, "yardages": {"blue": 121}},
    {"number": 11, "par": 5, "strokeIndex": 6, "yardages": {"blue": 444}},
    {"number": 12, "par": 4, "strokeIndex": 14, "yardages": {"blue": 351}},
    {"number": 13, "par": 4, "strokeIndex": 5, "yardages": {"blue": 376}},
    {"number": 14, "par": 4, "strokeIndex": 1, "yardages": {"blue": 312}},
    {"number": 15, "par": 3, "strokeIndex": 16, "yardages": {"blue": 178}},
    {"number": 16, "par": 4, "strokeIndex": 11, "yardages": {"blue": 369}},
    {"number": 17, "par": 5, "strokeIndex": 8, "yardages": {"blue": 481}},
    {"number": 18, "par": 4, "strokeIndex": 2, "yardages": {"blue": 371}}
  ]'::jsonb,
  '[
    {"name": "Blue", "color": "blue", "courseRating": 69.5, "slopeRating": 123, "totalYardage": 6097}
  ]'::jsonb
)
ON CONFLICT (venue_id, name) DO UPDATE SET
  description = EXCLUDED.description,
  slope_rating = EXCLUDED.slope_rating,
  course_rating = EXCLUDED.course_rating,
  holes = EXCLUDED.holes,
  tees = EXCLUDED.tees;

-- CLIFTON SPRINGS GOLF CLUB
-- Spectacular views across Corio Bay to the You Yangs
INSERT INTO courses (venue_id, name, description, slope_rating, course_rating, holes, tees)
VALUES (
  'f1a2b3c4-d5e6-7890-abcd-400000000007',
  'Clifton Springs',
  'Scenic course near Drysdale with spectacular views across Corio Bay to the You Yangs. Features couch fairways, gentle undulations, and coastal breezes. The 3rd at 444 yards is stroke index 1, and the challenging 10th par 5 plays 524 yards. Just one hour from Melbourne.',
  120,
  70.0,
  '[
    {"number": 1, "par": 4, "strokeIndex": 3, "yardages": {"white": 395, "red": 345}},
    {"number": 2, "par": 4, "strokeIndex": 17, "yardages": {"white": 299, "red": 290}},
    {"number": 3, "par": 4, "strokeIndex": 1, "yardages": {"white": 444, "red": 375}},
    {"number": 4, "par": 4, "strokeIndex": 11, "yardages": {"white": 371, "red": 354}},
    {"number": 5, "par": 4, "strokeIndex": 5, "yardages": {"white": 388, "red": 372}},
    {"number": 6, "par": 3, "strokeIndex": 13, "yardages": {"white": 155, "red": 118}},
    {"number": 7, "par": 4, "strokeIndex": 9, "yardages": {"white": 392, "red": 367}},
    {"number": 8, "par": 4, "strokeIndex": 15, "yardages": {"white": 352, "red": 335}},
    {"number": 9, "par": 3, "strokeIndex": 7, "yardages": {"white": 190, "red": 150}},
    {"number": 10, "par": 5, "strokeIndex": 8, "yardages": {"white": 524, "red": 488}},
    {"number": 11, "par": 3, "strokeIndex": 12, "yardages": {"white": 172, "red": 142}},
    {"number": 12, "par": 4, "strokeIndex": 16, "yardages": {"white": 328, "red": 323}},
    {"number": 13, "par": 5, "strokeIndex": 14, "yardages": {"white": 522, "red": 471}},
    {"number": 14, "par": 4, "strokeIndex": 2, "yardages": {"white": 379, "red": 342}},
    {"number": 15, "par": 4, "strokeIndex": 18, "yardages": {"white": 337, "red": 330}},
    {"number": 16, "par": 5, "strokeIndex": 4, "yardages": {"white": 530, "red": 426}},
    {"number": 17, "par": 3, "strokeIndex": 10, "yardages": {"white": 177, "red": 143}},
    {"number": 18, "par": 4, "strokeIndex": 6, "yardages": {"white": 360, "red": 321}}
  ]'::jsonb,
  '[
    {"name": "White", "color": "white", "courseRating": 70.0, "slopeRating": 120, "totalYardage": 6315},
    {"name": "Red", "color": "red", "courseRating": 72.0, "slopeRating": 117, "totalYardage": 5692}
  ]'::jsonb
)
ON CONFLICT (venue_id, name) DO UPDATE SET
  description = EXCLUDED.description,
  slope_rating = EXCLUDED.slope_rating,
  course_rating = EXCLUDED.course_rating,
  holes = EXCLUDED.holes,
  tees = EXCLUDED.tees;

-- QUEENSCLIFF GOLF CLUB
-- Located on Swan Island with two returning nines
INSERT INTO courses (venue_id, name, description, slope_rating, course_rating, holes, tees)
VALUES (
  'f1a2b3c4-d5e6-7890-abcd-400000000008',
  'Queenscliff',
  'Beautiful parkland course on Swan Island with two returning nines. Features back-to-back par 5s at 11th and 12th offering birdie opportunities. The 6th at 387 yards is stroke index 1. Tough closing sequence from the 15th. Nearly 5,900 yards from the back markers.',
  132,
  71.0,
  '[
    {"number": 1, "par": 4, "strokeIndex": 18, "yardages": {"black": 281, "blue": 281}},
    {"number": 2, "par": 5, "strokeIndex": 7, "yardages": {"black": 441, "blue": 288}},
    {"number": 3, "par": 3, "strokeIndex": 14, "yardages": {"black": 158, "blue": 158}},
    {"number": 4, "par": 4, "strokeIndex": 5, "yardages": {"black": 331, "blue": 331}},
    {"number": 5, "par": 4, "strokeIndex": 12, "yardages": {"black": 331, "blue": 331}},
    {"number": 6, "par": 4, "strokeIndex": 1, "yardages": {"black": 387, "blue": 387}},
    {"number": 7, "par": 4, "strokeIndex": 16, "yardages": {"black": 279, "blue": 279}},
    {"number": 8, "par": 4, "strokeIndex": 13, "yardages": {"black": 338, "blue": 338}},
    {"number": 9, "par": 3, "strokeIndex": 17, "yardages": {"black": 138, "blue": 138}},
    {"number": 10, "par": 4, "strokeIndex": 9, "yardages": {"black": 356, "blue": 356}},
    {"number": 11, "par": 5, "strokeIndex": 10, "yardages": {"black": 494, "blue": 494}},
    {"number": 12, "par": 5, "strokeIndex": 6, "yardages": {"black": 473, "blue": 473}},
    {"number": 13, "par": 4, "strokeIndex": 11, "yardages": {"black": 330, "blue": 330}},
    {"number": 14, "par": 3, "strokeIndex": 2, "yardages": {"black": 176, "blue": 176}},
    {"number": 15, "par": 4, "strokeIndex": 3, "yardages": {"black": 342, "blue": 342}},
    {"number": 16, "par": 4, "strokeIndex": 4, "yardages": {"black": 355, "blue": 355}},
    {"number": 17, "par": 4, "strokeIndex": 15, "yardages": {"black": 302, "blue": 302}},
    {"number": 18, "par": 4, "strokeIndex": 8, "yardages": {"black": 361, "blue": 361}}
  ]'::jsonb,
  '[
    {"name": "Black", "color": "black", "courseRating": 71.0, "slopeRating": 132, "totalYardage": 5873},
    {"name": "Blue", "color": "blue", "courseRating": 70.0, "slopeRating": 131, "totalYardage": 5720}
  ]'::jsonb
)
ON CONFLICT (venue_id, name) DO UPDATE SET
  description = EXCLUDED.description,
  slope_rating = EXCLUDED.slope_rating,
  course_rating = EXCLUDED.course_rating,
  holes = EXCLUDED.holes,
  tees = EXCLUDED.tees;

-- PORTARLINGTON GOLF CLUB
-- Tony Cashmore designed, ranked #63 public access nationally
INSERT INTO courses (venue_id, name, description, slope_rating, course_rating, holes, tees)
VALUES (
  'f1a2b3c4-d5e6-7890-abcd-400000000009',
  'Portarlington',
  'Award-winning Tony Cashmore designed course on the Bellarine Peninsula. Ranked #63 public access course nationally. Features bent grass greens, tree-lined fairways, and excellent year-round conditioning. The 14th at 442 yards is stroke index 1. Established in 1909, current location since 1937.',
  126,
  72.0,
  '[
    {"number": 1, "par": 4, "strokeIndex": 12, "yardages": {"black": 382, "blue": 348}},
    {"number": 2, "par": 3, "strokeIndex": 6, "yardages": {"black": 212, "blue": 190}},
    {"number": 3, "par": 4, "strokeIndex": 4, "yardages": {"black": 439, "blue": 424}},
    {"number": 4, "par": 4, "strokeIndex": 18, "yardages": {"black": 424, "blue": 392}},
    {"number": 5, "par": 3, "strokeIndex": 2, "yardages": {"black": 197, "blue": 125}},
    {"number": 6, "par": 5, "strokeIndex": 10, "yardages": {"black": 586, "blue": 450}},
    {"number": 7, "par": 4, "strokeIndex": 16, "yardages": {"black": 425, "blue": 378}},
    {"number": 8, "par": 4, "strokeIndex": 8, "yardages": {"black": 395, "blue": 341}},
    {"number": 9, "par": 5, "strokeIndex": 14, "yardages": {"black": 529, "blue": 529}},
    {"number": 10, "par": 4, "strokeIndex": 3, "yardages": {"black": 443, "blue": 386}},
    {"number": 11, "par": 5, "strokeIndex": 13, "yardages": {"black": 578, "blue": 550}},
    {"number": 12, "par": 4, "strokeIndex": 9, "yardages": {"black": 395, "blue": 362}},
    {"number": 13, "par": 4, "strokeIndex": 5, "yardages": {"black": 289, "blue": 289}},
    {"number": 14, "par": 4, "strokeIndex": 1, "yardages": {"black": 484, "blue": 478}},
    {"number": 15, "par": 4, "strokeIndex": 15, "yardages": {"black": 461, "blue": 371}},
    {"number": 16, "par": 4, "strokeIndex": 7, "yardages": {"black": 385, "blue": 347}},
    {"number": 17, "par": 3, "strokeIndex": 11, "yardages": {"black": 186, "blue": 138}},
    {"number": 18, "par": 4, "strokeIndex": 17, "yardages": {"black": 381, "blue": 363}}
  ]'::jsonb,
  '[
    {"name": "Black", "color": "black", "courseRating": 72.0, "slopeRating": 126, "totalYardage": 7191},
    {"name": "Blue", "color": "blue", "courseRating": 70.0, "slopeRating": 122, "totalYardage": 6461}
  ]'::jsonb
)
ON CONFLICT (venue_id, name) DO UPDATE SET
  description = EXCLUDED.description,
  slope_rating = EXCLUDED.slope_rating,
  course_rating = EXCLUDED.course_rating,
  holes = EXCLUDED.holes,
  tees = EXCLUDED.tees;

-- =====================================================
-- STEP 3: UPDATE EXISTING PARTIAL DATA
-- Update 13th Beach and Barwon Heads with complete hole data
-- =====================================================

-- Note: 13th Beach (ea8a80e8-e302-4989-82d8-05fcf2076130) and
-- Barwon Heads (1e03c167-663c-4222-94f2-3532c45ed11e) already have
-- course entries from previous migrations. Their hole data can be
-- updated in a separate migration if needed.

-- =====================================================
-- STEP 4: Migration Summary
-- This migration adds 9 new venues and 9 courses to the database
-- Bellarine/Surf Coast region coverage significantly improved
-- =====================================================
