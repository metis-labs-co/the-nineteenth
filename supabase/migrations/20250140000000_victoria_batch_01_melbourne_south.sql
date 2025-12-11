-- =====================================================
-- Migration: victoria_batch_01_melbourne_south
-- Description: Add Melbourne South golf venues and courses
--              Part of Victorian golf course data collection
-- Date: 2025-12-10
-- Batch: 1 of 7 (Melbourne Sandbelt & South)
-- =====================================================

-- =====================================================
-- STEP 1: INSERT NEW VENUES
-- Using ON CONFLICT to handle re-runs safely
-- =====================================================

-- Commonwealth Golf Club
INSERT INTO venues (id, source, name, state, city, address, phone, website, total_holes)
VALUES (
  'f1a2b3c4-d5e6-7890-abcd-100000000001',
  'manual',
  'Commonwealth Golf Club',
  'VIC',
  'Oakleigh South',
  'Glennie Avenue South, Oakleigh VIC 3167',
  '+61 3 9579 6744',
  'https://www.commonwealthgolf.com.au',
  18
)
ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name,
  address = EXCLUDED.address,
  phone = EXCLUDED.phone,
  website = EXCLUDED.website;

-- Huntingdale Golf Club
INSERT INTO venues (id, source, name, state, city, address, phone, website, total_holes)
VALUES (
  'f1a2b3c4-d5e6-7890-abcd-100000000002',
  'manual',
  'Huntingdale Golf Club',
  'VIC',
  'Oakleigh South',
  'Windsor Avenue, South Oakleigh VIC 3167',
  '+61 3 9579 3433',
  'https://www.huntingdalegolf.com.au',
  18
)
ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name,
  address = EXCLUDED.address,
  phone = EXCLUDED.phone,
  website = EXCLUDED.website;

-- Kingswood Golf Club
INSERT INTO venues (id, source, name, state, city, address, phone, website, total_holes)
VALUES (
  'f1a2b3c4-d5e6-7890-abcd-100000000003',
  'manual',
  'Kingswood Golf Club',
  'VIC',
  'Dingley Village',
  'Centre Dandenong Road, Dingley Village VIC 3172',
  '+61 3 9551 2044',
  'https://www.kingswoodgolf.com.au',
  18
)
ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name,
  address = EXCLUDED.address,
  phone = EXCLUDED.phone,
  website = EXCLUDED.website;

-- Keysborough Golf Club
INSERT INTO venues (id, source, name, state, city, address, phone, website, total_holes)
VALUES (
  'f1a2b3c4-d5e6-7890-abcd-100000000004',
  'manual',
  'Keysborough Golf Club',
  'VIC',
  'Keysborough',
  '55 Hutton Road, Keysborough VIC 3173',
  '+61 3 9798 6422',
  'https://www.keysboroughgolf.com.au',
  18
)
ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name,
  address = EXCLUDED.address,
  phone = EXCLUDED.phone,
  website = EXCLUDED.website;

-- Rossdale Golf Club
INSERT INTO venues (id, source, name, state, city, address, phone, website, total_holes)
VALUES (
  'f1a2b3c4-d5e6-7890-abcd-100000000005',
  'manual',
  'Rossdale Golf Club',
  'VIC',
  'Aspendale',
  'Station Street, Aspendale VIC 3195',
  '+61 3 9580 1262',
  'https://www.rossdalegolf.com.au',
  18
)
ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name,
  address = EXCLUDED.address,
  phone = EXCLUDED.phone,
  website = EXCLUDED.website;

-- Southern Golf Club
INSERT INTO venues (id, source, name, state, city, address, phone, website, total_holes)
VALUES (
  'f1a2b3c4-d5e6-7890-abcd-100000000006',
  'manual',
  'Southern Golf Club',
  'VIC',
  'Keysborough',
  'Lower Dandenong Road, Keysborough VIC 3173',
  '+61 3 9798 3111',
  'https://www.southerngolfclub.com.au',
  18
)
ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name,
  address = EXCLUDED.address,
  phone = EXCLUDED.phone,
  website = EXCLUDED.website;

-- Patterson River Golf Club
INSERT INTO venues (id, source, name, state, city, address, phone, website, total_holes)
VALUES (
  'f1a2b3c4-d5e6-7890-abcd-100000000007',
  'manual',
  'Patterson River Golf Club',
  'VIC',
  'Bonbeach',
  'McLeod Road, Bonbeach VIC 3196',
  '+61 3 9772 2255',
  'https://www.pattersonriver.com.au',
  18
)
ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name,
  address = EXCLUDED.address,
  phone = EXCLUDED.phone,
  website = EXCLUDED.website;

-- Cranbourne Golf Club
INSERT INTO venues (id, source, name, state, city, address, phone, website, total_holes)
VALUES (
  'f1a2b3c4-d5e6-7890-abcd-100000000008',
  'manual',
  'Cranbourne Golf Club',
  'VIC',
  'Cranbourne North',
  'Browns Road, Cranbourne VIC 3977',
  '+61 3 5996 1622',
  'https://www.cranbournegolf.com.au',
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

-- COMMONWEALTH GOLF CLUB
INSERT INTO courses (venue_id, name, description, slope_rating, course_rating, holes, tees)
VALUES (
  'f1a2b3c4-d5e6-7890-abcd-100000000001',
  'Commonwealth',
  'One of the eight clubs forming the famous Melbourne Sandbelt. Hosted seven Australian Opens, five Australian PGAs. Features superb conditioning and strategic bunkering.',
  131,
  73.0,
  '[
    {"number": 1, "par": 4, "strokeIndex": 9, "yardages": {"white": 331, "red": 282}},
    {"number": 2, "par": 5, "strokeIndex": 5, "yardages": {"white": 510, "red": 429}},
    {"number": 3, "par": 4, "strokeIndex": 3, "yardages": {"white": 427, "red": 347}},
    {"number": 4, "par": 4, "strokeIndex": 7, "yardages": {"white": 381, "red": 339}},
    {"number": 5, "par": 4, "strokeIndex": 11, "yardages": {"white": 411, "red": 318}},
    {"number": 6, "par": 5, "strokeIndex": 1, "yardages": {"white": 581, "red": 457}},
    {"number": 7, "par": 3, "strokeIndex": 15, "yardages": {"white": 199, "red": 153}},
    {"number": 8, "par": 4, "strokeIndex": 13, "yardages": {"white": 411, "red": 369}},
    {"number": 9, "par": 3, "strokeIndex": 17, "yardages": {"white": 145, "red": 118}},
    {"number": 10, "par": 5, "strokeIndex": 6, "yardages": {"white": 550, "red": 503}},
    {"number": 11, "par": 4, "strokeIndex": 8, "yardages": {"white": 408, "red": 352}},
    {"number": 12, "par": 4, "strokeIndex": 2, "yardages": {"white": 446, "red": 421}},
    {"number": 13, "par": 5, "strokeIndex": 10, "yardages": {"white": 486, "red": 442}},
    {"number": 14, "par": 4, "strokeIndex": 12, "yardages": {"white": 356, "red": 304}},
    {"number": 15, "par": 3, "strokeIndex": 16, "yardages": {"white": 161, "red": 122}},
    {"number": 16, "par": 4, "strokeIndex": 14, "yardages": {"white": 398, "red": 335}},
    {"number": 17, "par": 4, "strokeIndex": 18, "yardages": {"white": 336, "red": 313}},
    {"number": 18, "par": 4, "strokeIndex": 4, "yardages": {"white": 442, "red": 361}}
  ]'::jsonb,
  '[
    {"name": "White", "color": "white", "courseRating": 73.0, "slopeRating": 131, "totalYardage": 6979},
    {"name": "Red", "color": "red", "courseRating": 75.0, "slopeRating": 130, "totalYardage": 5965}
  ]'::jsonb
)
ON CONFLICT (venue_id, name) DO UPDATE SET
  description = EXCLUDED.description,
  slope_rating = EXCLUDED.slope_rating,
  course_rating = EXCLUDED.course_rating,
  holes = EXCLUDED.holes,
  tees = EXCLUDED.tees;

-- HUNTINGDALE GOLF CLUB
INSERT INTO courses (venue_id, name, description, slope_rating, course_rating, holes, tees)
VALUES (
  'f1a2b3c4-d5e6-7890-abcd-100000000002',
  'Huntingdale',
  'Home of the Australian Masters. Hosted some of the most famous names in international golf including Jack Nicklaus, Greg Norman, and Tiger Woods. Features superb conditioning and challenging greens.',
  138,
  72.0,
  '[
    {"number": 1, "par": 4, "strokeIndex": 5, "yardages": {"white": 391, "red": 378}},
    {"number": 2, "par": 4, "strokeIndex": 15, "yardages": {"white": 322, "red": 283}},
    {"number": 3, "par": 3, "strokeIndex": 10, "yardages": {"white": 169, "red": 124}},
    {"number": 4, "par": 4, "strokeIndex": 12, "yardages": {"white": 362, "red": 297}},
    {"number": 5, "par": 3, "strokeIndex": 3, "yardages": {"white": 193, "red": 150}},
    {"number": 6, "par": 5, "strokeIndex": 7, "yardages": {"white": 515, "red": 450}},
    {"number": 7, "par": 5, "strokeIndex": 17, "yardages": {"white": 490, "red": 434}},
    {"number": 8, "par": 4, "strokeIndex": 14, "yardages": {"white": 314, "red": 263}},
    {"number": 9, "par": 4, "strokeIndex": 8, "yardages": {"white": 378, "red": 351}},
    {"number": 10, "par": 5, "strokeIndex": 18, "yardages": {"white": 453, "red": 417}},
    {"number": 11, "par": 4, "strokeIndex": 2, "yardages": {"white": 400, "red": 339}},
    {"number": 12, "par": 3, "strokeIndex": 13, "yardages": {"white": 161, "red": 124}},
    {"number": 13, "par": 4, "strokeIndex": 11, "yardages": {"white": 318, "red": 259}},
    {"number": 14, "par": 5, "strokeIndex": 6, "yardages": {"white": 555, "red": 419}},
    {"number": 15, "par": 3, "strokeIndex": 16, "yardages": {"white": 141, "red": 110}},
    {"number": 16, "par": 4, "strokeIndex": 9, "yardages": {"white": 351, "red": 287}},
    {"number": 17, "par": 4, "strokeIndex": 4, "yardages": {"white": 425, "red": 412}},
    {"number": 18, "par": 4, "strokeIndex": 1, "yardages": {"white": 410, "red": 325}}
  ]'::jsonb,
  '[
    {"name": "White", "color": "white", "courseRating": 72.0, "slopeRating": 138, "totalYardage": 6348},
    {"name": "Red", "color": "red", "courseRating": 74.0, "slopeRating": 132, "totalYardage": 5422}
  ]'::jsonb
)
ON CONFLICT (venue_id, name) DO UPDATE SET
  description = EXCLUDED.description,
  slope_rating = EXCLUDED.slope_rating,
  course_rating = EXCLUDED.course_rating,
  holes = EXCLUDED.holes,
  tees = EXCLUDED.tees;

-- KINGSWOOD GOLF CLUB
INSERT INTO courses (venue_id, name, description, slope_rating, course_rating, holes, tees)
VALUES (
  'f1a2b3c4-d5e6-7890-abcd-100000000003',
  'Kingswood',
  'Known as the Melbourne Sandbelt''s best kept secret. A gently undulating championship golf course with pure couch fairways and great greens. Designed by Michael Wolveridge.',
  128,
  71.0,
  '[
    {"number": 1, "par": 4, "strokeIndex": 11, "yardages": {"back": 384, "middle": 368, "forward": 347}},
    {"number": 2, "par": 5, "strokeIndex": 7, "yardages": {"back": 566, "middle": 524, "forward": 475}},
    {"number": 3, "par": 3, "strokeIndex": 15, "yardages": {"back": 159, "middle": 138, "forward": 112}},
    {"number": 4, "par": 4, "strokeIndex": 5, "yardages": {"back": 426, "middle": 390, "forward": 342}},
    {"number": 5, "par": 3, "strokeIndex": 17, "yardages": {"back": 177, "middle": 136, "forward": 105}},
    {"number": 6, "par": 4, "strokeIndex": 3, "yardages": {"back": 450, "middle": 450, "forward": 394}},
    {"number": 7, "par": 4, "strokeIndex": 9, "yardages": {"back": 381, "middle": 358, "forward": 310}},
    {"number": 8, "par": 3, "strokeIndex": 13, "yardages": {"back": 181, "middle": 142, "forward": 119}},
    {"number": 9, "par": 4, "strokeIndex": 1, "yardages": {"back": 384, "middle": 349, "forward": 306}},
    {"number": 10, "par": 4, "strokeIndex": 14, "yardages": {"back": 334, "middle": 313, "forward": 203}},
    {"number": 11, "par": 5, "strokeIndex": 2, "yardages": {"back": 504, "middle": 475, "forward": 462}},
    {"number": 12, "par": 5, "strokeIndex": 4, "yardages": {"back": 568, "middle": 558, "forward": 500}},
    {"number": 13, "par": 4, "strokeIndex": 8, "yardages": {"back": 402, "middle": 387, "forward": 331}},
    {"number": 14, "par": 4, "strokeIndex": 6, "yardages": {"back": 435, "middle": 405, "forward": 366}},
    {"number": 15, "par": 4, "strokeIndex": 16, "yardages": {"back": 322, "middle": 313, "forward": 313}},
    {"number": 16, "par": 4, "strokeIndex": 12, "yardages": {"back": 332, "middle": 323, "forward": 297}},
    {"number": 17, "par": 3, "strokeIndex": 18, "yardages": {"back": 175, "middle": 136, "forward": 104}},
    {"number": 18, "par": 4, "strokeIndex": 10, "yardages": {"back": 411, "middle": 379, "forward": 338}}
  ]'::jsonb,
  '[
    {"name": "Back", "color": "blue", "courseRating": 71.0, "slopeRating": 128, "totalYardage": 6591},
    {"name": "Middle", "color": "white", "courseRating": 69.5, "slopeRating": 124, "totalYardage": 6144},
    {"name": "Forward", "color": "red", "courseRating": 72.0, "slopeRating": 126, "totalYardage": 5424}
  ]'::jsonb
)
ON CONFLICT (venue_id, name) DO UPDATE SET
  description = EXCLUDED.description,
  slope_rating = EXCLUDED.slope_rating,
  course_rating = EXCLUDED.course_rating,
  holes = EXCLUDED.holes,
  tees = EXCLUDED.tees;

-- KEYSBOROUGH GOLF CLUB
INSERT INTO courses (venue_id, name, description, slope_rating, course_rating, holes, tees)
VALUES (
  'f1a2b3c4-d5e6-7890-abcd-100000000004',
  'Keysborough',
  'Established in 1947, designed by Sam Berriman. Nestled amongst a refreshing sanctuary of lakes, magnificent trees and abundant bird life on 180 acres of natural bushland.',
  131,
  73.0,
  '[
    {"number": 1, "par": 5, "strokeIndex": 8, "yardages": {"white": 509, "red": 466}},
    {"number": 2, "par": 5, "strokeIndex": 6, "yardages": {"white": 498, "red": 463}},
    {"number": 3, "par": 3, "strokeIndex": 12, "yardages": {"white": 148, "red": 130}},
    {"number": 4, "par": 4, "strokeIndex": 2, "yardages": {"white": 366, "red": 315}},
    {"number": 5, "par": 4, "strokeIndex": 14, "yardages": {"white": 291, "red": 253}},
    {"number": 6, "par": 4, "strokeIndex": 10, "yardages": {"white": 347, "red": 307}},
    {"number": 7, "par": 5, "strokeIndex": 18, "yardages": {"white": 457, "red": 410}},
    {"number": 8, "par": 3, "strokeIndex": 16, "yardages": {"white": 136, "red": 117}},
    {"number": 9, "par": 4, "strokeIndex": 4, "yardages": {"white": 401, "red": 360}},
    {"number": 10, "par": 4, "strokeIndex": 17, "yardages": {"white": 306, "red": 261}},
    {"number": 11, "par": 4, "strokeIndex": 7, "yardages": {"white": 385, "red": 340}},
    {"number": 12, "par": 3, "strokeIndex": 11, "yardages": {"white": 177, "red": 155}},
    {"number": 13, "par": 4, "strokeIndex": 5, "yardages": {"white": 386, "red": 341}},
    {"number": 14, "par": 4, "strokeIndex": 1, "yardages": {"white": 320, "red": 285}},
    {"number": 15, "par": 3, "strokeIndex": 9, "yardages": {"white": 195, "red": 163}},
    {"number": 16, "par": 5, "strokeIndex": 15, "yardages": {"white": 448, "red": 399}},
    {"number": 17, "par": 5, "strokeIndex": 13, "yardages": {"white": 480, "red": 428}},
    {"number": 18, "par": 4, "strokeIndex": 3, "yardages": {"white": 413, "red": 361}}
  ]'::jsonb,
  '[
    {"name": "White", "color": "white", "courseRating": 73.0, "slopeRating": 131, "totalYardage": 6263},
    {"name": "Red", "color": "red", "courseRating": 74.0, "slopeRating": 131, "totalYardage": 5554}
  ]'::jsonb
)
ON CONFLICT (venue_id, name) DO UPDATE SET
  description = EXCLUDED.description,
  slope_rating = EXCLUDED.slope_rating,
  course_rating = EXCLUDED.course_rating,
  holes = EXCLUDED.holes,
  tees = EXCLUDED.tees;

-- ROSSDALE GOLF CLUB
INSERT INTO courses (venue_id, name, description, slope_rating, course_rating, holes, tees)
VALUES (
  'f1a2b3c4-d5e6-7890-abcd-100000000005',
  'Rossdale',
  'Picturesque bayside course weaving through corridors of pines, eucalyptus and coastal banksias. Twice hosted The Australian PGA in the 1960s. Originally designed by Ivo Whitten.',
  120,
  72.0,
  '[
    {"number": 1, "par": 5, "strokeIndex": 11, "yardages": {"white": 464, "red": 398}},
    {"number": 2, "par": 4, "strokeIndex": 9, "yardages": {"white": 306, "red": 294}},
    {"number": 3, "par": 3, "strokeIndex": 17, "yardages": {"white": 116, "red": 101}},
    {"number": 4, "par": 4, "strokeIndex": 1, "yardages": {"white": 405, "red": 362}},
    {"number": 5, "par": 5, "strokeIndex": 13, "yardages": {"white": 478, "red": 403}},
    {"number": 6, "par": 4, "strokeIndex": 3, "yardages": {"white": 457, "red": 310}},
    {"number": 7, "par": 4, "strokeIndex": 7, "yardages": {"white": 320, "red": 263}},
    {"number": 8, "par": 4, "strokeIndex": 16, "yardages": {"white": 307, "red": 280}},
    {"number": 9, "par": 3, "strokeIndex": 6, "yardages": {"white": 186, "red": 160}},
    {"number": 10, "par": 5, "strokeIndex": 18, "yardages": {"white": 242, "red": 218}},
    {"number": 11, "par": 4, "strokeIndex": 4, "yardages": {"white": 535, "red": 456}},
    {"number": 12, "par": 3, "strokeIndex": 15, "yardages": {"white": 142, "red": 121}},
    {"number": 13, "par": 4, "strokeIndex": 8, "yardages": {"white": 425, "red": 435}},
    {"number": 14, "par": 5, "strokeIndex": 5, "yardages": {"white": 382, "red": 357}},
    {"number": 15, "par": 4, "strokeIndex": 12, "yardages": {"white": 324, "red": 306}},
    {"number": 16, "par": 4, "strokeIndex": 14, "yardages": {"white": 165, "red": 144}},
    {"number": 17, "par": 4, "strokeIndex": 10, "yardages": {"white": 320, "red": 301}},
    {"number": 18, "par": 3, "strokeIndex": 2, "yardages": {"white": 389, "red": 369}}
  ]'::jsonb,
  '[
    {"name": "White", "color": "white", "courseRating": 72.0, "slopeRating": 120, "totalYardage": 5963},
    {"name": "Red", "color": "red", "courseRating": 73.4, "slopeRating": 123, "totalYardage": 5278}
  ]'::jsonb
)
ON CONFLICT (venue_id, name) DO UPDATE SET
  description = EXCLUDED.description,
  slope_rating = EXCLUDED.slope_rating,
  course_rating = EXCLUDED.course_rating,
  holes = EXCLUDED.holes,
  tees = EXCLUDED.tees;

-- SOUTHERN GOLF CLUB
INSERT INTO courses (venue_id, name, description, slope_rating, course_rating, holes, tees)
VALUES (
  'f1a2b3c4-d5e6-7890-abcd-100000000006',
  'Southern',
  'Once regarded as the hidden jewel of Melbourne''s Sandbelt region. Founded by public course golfers from Brighton in 1949. Modified by Peter Thomson, Mike Wolveridge, and Bob Shearer.',
  137,
  73.5,
  '[
    {"number": 1, "par": 4, "strokeIndex": 4, "yardages": {"blue": 426, "white": 390}},
    {"number": 2, "par": 4, "strokeIndex": 8, "yardages": {"blue": 376, "white": 344}},
    {"number": 3, "par": 3, "strokeIndex": 18, "yardages": {"blue": 138, "white": 127}},
    {"number": 4, "par": 5, "strokeIndex": 12, "yardages": {"blue": 562, "white": 514}},
    {"number": 5, "par": 4, "strokeIndex": 6, "yardages": {"blue": 371, "white": 340}},
    {"number": 6, "par": 3, "strokeIndex": 10, "yardages": {"blue": 192, "white": 176}},
    {"number": 7, "par": 5, "strokeIndex": 16, "yardages": {"blue": 548, "white": 502}},
    {"number": 8, "par": 4, "strokeIndex": 14, "yardages": {"blue": 340, "white": 311}},
    {"number": 9, "par": 4, "strokeIndex": 2, "yardages": {"blue": 451, "white": 413}},
    {"number": 10, "par": 4, "strokeIndex": 5, "yardages": {"blue": 420, "white": 385}},
    {"number": 11, "par": 5, "strokeIndex": 11, "yardages": {"blue": 518, "white": 474}},
    {"number": 12, "par": 3, "strokeIndex": 15, "yardages": {"blue": 169, "white": 155}},
    {"number": 13, "par": 4, "strokeIndex": 7, "yardages": {"blue": 447, "white": 409}},
    {"number": 14, "par": 4, "strokeIndex": 3, "yardages": {"blue": 451, "white": 413}},
    {"number": 15, "par": 4, "strokeIndex": 9, "yardages": {"blue": 347, "white": 318}},
    {"number": 16, "par": 3, "strokeIndex": 17, "yardages": {"blue": 145, "white": 133}},
    {"number": 17, "par": 5, "strokeIndex": 13, "yardages": {"blue": 543, "white": 497}},
    {"number": 18, "par": 4, "strokeIndex": 1, "yardages": {"blue": 393, "white": 360}}
  ]'::jsonb,
  '[
    {"name": "Blue", "color": "blue", "courseRating": 73.5, "slopeRating": 137, "totalYardage": 6837},
    {"name": "White", "color": "white", "courseRating": 71.5, "slopeRating": 132, "totalYardage": 6261}
  ]'::jsonb
)
ON CONFLICT (venue_id, name) DO UPDATE SET
  description = EXCLUDED.description,
  slope_rating = EXCLUDED.slope_rating,
  course_rating = EXCLUDED.course_rating,
  holes = EXCLUDED.holes,
  tees = EXCLUDED.tees;

-- PATTERSON RIVER GOLF CLUB
INSERT INTO courses (venue_id, name, description, slope_rating, course_rating, holes, tees)
VALUES (
  'f1a2b3c4-d5e6-7890-abcd-100000000007',
  'Patterson River',
  'Superb Sandbelt inspired golf course built around a 15-hectare lake system providing an attractive and natural setting with abundant bird life. Water comes into play at half the holes.',
  125,
  72.0,
  '[
    {"number": 1, "par": 4, "strokeIndex": 13, "yardages": {"blue": 339, "white": 314, "red": 285}},
    {"number": 2, "par": 3, "strokeIndex": 9, "yardages": {"blue": 166, "white": 140, "red": 115}},
    {"number": 3, "par": 4, "strokeIndex": 17, "yardages": {"blue": 307, "white": 287, "red": 260}},
    {"number": 4, "par": 5, "strokeIndex": 7, "yardages": {"blue": 516, "white": 487, "red": 447}},
    {"number": 5, "par": 4, "strokeIndex": 3, "yardages": {"blue": 376, "white": 352, "red": 335}},
    {"number": 6, "par": 5, "strokeIndex": 11, "yardages": {"blue": 481, "white": 453, "red": 425}},
    {"number": 7, "par": 3, "strokeIndex": 5, "yardages": {"blue": 157, "white": 137, "red": 121}},
    {"number": 8, "par": 4, "strokeIndex": 15, "yardages": {"blue": 308, "white": 287, "red": 255}},
    {"number": 9, "par": 5, "strokeIndex": 1, "yardages": {"blue": 403, "white": 375, "red": 341}},
    {"number": 10, "par": 4, "strokeIndex": 14, "yardages": {"blue": 502, "white": 472, "red": 450}},
    {"number": 11, "par": 3, "strokeIndex": 16, "yardages": {"blue": 313, "white": 288, "red": 270}},
    {"number": 12, "par": 4, "strokeIndex": 18, "yardages": {"blue": 132, "white": 130, "red": 104}},
    {"number": 13, "par": 4, "strokeIndex": 4, "yardages": {"blue": 352, "white": 317, "red": 280}},
    {"number": 14, "par": 4, "strokeIndex": 6, "yardages": {"blue": 377, "white": 334, "red": 308}},
    {"number": 15, "par": 3, "strokeIndex": 2, "yardages": {"blue": 423, "white": 360, "red": 328}},
    {"number": 16, "par": 4, "strokeIndex": 10, "yardages": {"blue": 164, "white": 150, "red": 135}},
    {"number": 17, "par": 4, "strokeIndex": 8, "yardages": {"blue": 374, "white": 333, "red": 340}},
    {"number": 18, "par": 5, "strokeIndex": 12, "yardages": {"blue": 507, "white": 443, "red": 411}}
  ]'::jsonb,
  '[
    {"name": "Blue", "color": "blue", "courseRating": 72.0, "slopeRating": 125, "totalYardage": 6197},
    {"name": "White", "color": "white", "courseRating": 70.0, "slopeRating": 120, "totalYardage": 5659},
    {"name": "Red", "color": "red", "courseRating": 71.5, "slopeRating": 122, "totalYardage": 5210}
  ]'::jsonb
)
ON CONFLICT (venue_id, name) DO UPDATE SET
  description = EXCLUDED.description,
  slope_rating = EXCLUDED.slope_rating,
  course_rating = EXCLUDED.course_rating,
  holes = EXCLUDED.holes,
  tees = EXCLUDED.tees;

-- CRANBOURNE GOLF CLUB
INSERT INTO courses (venue_id, name, description, slope_rating, course_rating, holes, tees)
VALUES (
  'f1a2b3c4-d5e6-7890-abcd-100000000008',
  'Cranbourne',
  'Consistently rated in the Top 100 Golf Courses in Australia. Designed by Sam Berriman (known for Huntingdale). Features excellent drainage on a sandy base, plays well all year round.',
  130,
  72.0,
  '[
    {"number": 1, "par": 5, "strokeIndex": 18, "yardages": {"white": 440, "red": 403}},
    {"number": 2, "par": 4, "strokeIndex": 8, "yardages": {"white": 404, "red": 335}},
    {"number": 3, "par": 3, "strokeIndex": 12, "yardages": {"white": 158, "red": 113}},
    {"number": 4, "par": 4, "strokeIndex": 3, "yardages": {"white": 304, "red": 272}},
    {"number": 5, "par": 5, "strokeIndex": 14, "yardages": {"white": 482, "red": 417}},
    {"number": 6, "par": 4, "strokeIndex": 6, "yardages": {"white": 412, "red": 313}},
    {"number": 7, "par": 4, "strokeIndex": 10, "yardages": {"white": 329, "red": 298}},
    {"number": 8, "par": 3, "strokeIndex": 1, "yardages": {"white": 151, "red": 126}},
    {"number": 9, "par": 4, "strokeIndex": 16, "yardages": {"white": 404, "red": 320}},
    {"number": 10, "par": 5, "strokeIndex": 5, "yardages": {"white": 472, "red": 393}},
    {"number": 11, "par": 4, "strokeIndex": 11, "yardages": {"white": 341, "red": 287}},
    {"number": 12, "par": 3, "strokeIndex": 2, "yardages": {"white": 201, "red": 158}},
    {"number": 13, "par": 5, "strokeIndex": 15, "yardages": {"white": 492, "red": 453}},
    {"number": 14, "par": 3, "strokeIndex": 4, "yardages": {"white": 165, "red": 114}},
    {"number": 15, "par": 4, "strokeIndex": 17, "yardages": {"white": 296, "red": 275}},
    {"number": 16, "par": 4, "strokeIndex": 9, "yardages": {"white": 352, "red": 286}},
    {"number": 17, "par": 4, "strokeIndex": 7, "yardages": {"white": 366, "red": 276}},
    {"number": 18, "par": 4, "strokeIndex": 13, "yardages": {"white": 425, "red": 360}}
  ]'::jsonb,
  '[
    {"name": "White", "color": "white", "courseRating": 72.0, "slopeRating": 130, "totalYardage": 6194},
    {"name": "Red", "color": "red", "courseRating": 73.0, "slopeRating": 128, "totalYardage": 5199}
  ]'::jsonb
)
ON CONFLICT (venue_id, name) DO UPDATE SET
  description = EXCLUDED.description,
  slope_rating = EXCLUDED.slope_rating,
  course_rating = EXCLUDED.course_rating,
  holes = EXCLUDED.holes,
  tees = EXCLUDED.tees;

-- =====================================================
-- STEP 3: Update tracking file note
-- This migration adds 8 new venues and 8 courses to the database
-- Total venues in VIC after this migration: 22
-- =====================================================
