-- =====================================================
-- Migration: victoria_batch_07_regional_all_other
-- Description: Add Regional Victoria golf venues and courses
--              (Ballarat, Bendigo, Goulburn, Western, North East, Mallee)
--              Part of Victorian golf course data collection
-- Date: 2025-12-10
-- Batch: 7 of 7 (Regional All Other)
-- =====================================================

-- =====================================================
-- STEP 1: INSERT NEW VENUES
-- Using ON CONFLICT to handle re-runs safely
-- =====================================================

-- BALLARAT GOLF CLUB
INSERT INTO venues (id, source, name, state, city, address, phone, website, total_holes)
VALUES (
  'f1a2b3c4-d5e6-7890-abcd-700000000001',
  'manual',
  'Ballarat Golf Club',
  'VIC',
  'Alfredton',
  'Sturt Street, Alfredton VIC 3350',
  '+61 3 5334 1023',
  'https://www.ballaratgolf.com.au',
  18
)
ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name,
  address = EXCLUDED.address,
  phone = EXCLUDED.phone,
  website = EXCLUDED.website;

-- BENDIGO GOLF CLUB
INSERT INTO venues (id, source, name, state, city, address, phone, website, total_holes)
VALUES (
  'f1a2b3c4-d5e6-7890-abcd-700000000002',
  'manual',
  'Bendigo Golf Club',
  'VIC',
  'Epsom',
  'Golf Course Road, Epsom VIC 3551',
  '+61 3 5448 4878',
  'https://www.bendigogolf.com.au',
  18
)
ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name,
  address = EXCLUDED.address,
  phone = EXCLUDED.phone,
  website = EXCLUDED.website;

-- CATHEDRAL LODGE AND GOLF CLUB (Greg Norman design)
INSERT INTO venues (id, source, name, state, city, address, phone, website, total_holes)
VALUES (
  'f1a2b3c4-d5e6-7890-abcd-700000000003',
  'manual',
  'Cathedral Lodge and Golf Club',
  'VIC',
  'Thornton',
  '82 Rollasons Road, Thornton VIC 3712',
  '+61 3 5773 4444',
  'https://www.cathedralgc.com.au',
  18
)
ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name,
  address = EXCLUDED.address,
  phone = EXCLUDED.phone,
  website = EXCLUDED.website;

-- PORT FAIRY GOLF LINKS (Top 100 ranked)
INSERT INTO venues (id, source, name, state, city, address, phone, website, total_holes)
VALUES (
  'f1a2b3c4-d5e6-7890-abcd-700000000004',
  'manual',
  'Port Fairy Golf Links',
  'VIC',
  'Port Fairy',
  'Beach Road, Port Fairy VIC 3284',
  '+61 3 5568 1654',
  'https://www.portfairygolf.com.au',
  18
)
ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name,
  address = EXCLUDED.address,
  phone = EXCLUDED.phone,
  website = EXCLUDED.website;

-- SHEPPARTON GOLF CLUB
INSERT INTO venues (id, source, name, state, city, address, phone, website, total_holes)
VALUES (
  'f1a2b3c4-d5e6-7890-abcd-700000000005',
  'manual',
  'Shepparton Golf Club',
  'VIC',
  'Shepparton',
  'Golf Drive, Shepparton VIC 3630',
  '+61 3 5821 2751',
  'https://www.sheppartongolf.com.au',
  18
)
ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name,
  address = EXCLUDED.address,
  phone = EXCLUDED.phone,
  website = EXCLUDED.website;

-- WANGARATTA GOLF CLUB
INSERT INTO venues (id, source, name, state, city, address, phone, website, total_holes)
VALUES (
  'f1a2b3c4-d5e6-7890-abcd-700000000006',
  'manual',
  'Wangaratta Golf Club',
  'VIC',
  'Wangaratta',
  'Yarrawonga Road, Wangaratta VIC 3677',
  '+61 3 5721 3352',
  'https://www.wangarattagolf.com.au',
  18
)
ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name,
  address = EXCLUDED.address,
  phone = EXCLUDED.phone,
  website = EXCLUDED.website;

-- WARRNAMBOOL GOLF CLUB
INSERT INTO venues (id, source, name, state, city, address, phone, website, total_holes)
VALUES (
  'f1a2b3c4-d5e6-7890-abcd-700000000007',
  'manual',
  'Warrnambool Golf Club',
  'VIC',
  'Warrnambool',
  'Younger Street, Warrnambool VIC 3280',
  '+61 3 5562 2108',
  'https://www.warrnambool.golf',
  18
)
ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name,
  address = EXCLUDED.address,
  phone = EXCLUDED.phone,
  website = EXCLUDED.website;

-- MILDURA GOLF RESORT
INSERT INTO venues (id, source, name, state, city, address, phone, website, total_holes)
VALUES (
  'f1a2b3c4-d5e6-7890-abcd-700000000008',
  'manual',
  'Mildura Golf Resort',
  'VIC',
  'Mildura',
  'Twelfth Street Extension, Mildura VIC 3500',
  '+61 3 5023 3359',
  'https://www.milduragolfresort.com.au',
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

-- BALLARAT GOLF CLUB
INSERT INTO courses (venue_id, name, description, slope_rating, course_rating, holes, tees)
VALUES (
  'f1a2b3c4-d5e6-7890-abcd-700000000001',
  'Ballarat',
  'Premier regional course in Victoria''s goldfields. The challenging 14th at 420 yards is stroke index 1, with the 5th at 417 yards being stroke index 2. Features mature tree-lined fairways and excellent putting surfaces. Three tee options for all abilities.',
  120,
  72.0,
  '[
    {"number": 1, "par": 4, "strokeIndex": 8, "yardages": {"black": 369, "blue": 342, "red": 304}},
    {"number": 2, "par": 5, "strokeIndex": 10, "yardages": {"black": 502, "blue": 478, "red": 437}},
    {"number": 3, "par": 4, "strokeIndex": 16, "yardages": {"black": 319, "blue": 283, "red": 248}},
    {"number": 4, "par": 4, "strokeIndex": 12, "yardages": {"black": 319, "blue": 315, "red": 281}},
    {"number": 5, "par": 4, "strokeIndex": 2, "yardages": {"black": 417, "blue": 389, "red": 346}},
    {"number": 6, "par": 3, "strokeIndex": 6, "yardages": {"black": 197, "blue": 180, "red": 153}},
    {"number": 7, "par": 5, "strokeIndex": 14, "yardages": {"black": 493, "blue": 465, "red": 428}},
    {"number": 8, "par": 3, "strokeIndex": 18, "yardages": {"black": 141, "blue": 124, "red": 101}},
    {"number": 9, "par": 4, "strokeIndex": 4, "yardages": {"black": 387, "blue": 360, "red": 326}},
    {"number": 10, "par": 5, "strokeIndex": 7, "yardages": {"black": 471, "blue": 456, "red": 411}},
    {"number": 11, "par": 3, "strokeIndex": 13, "yardages": {"black": 164, "blue": 151, "red": 127}},
    {"number": 12, "par": 4, "strokeIndex": 15, "yardages": {"black": 301, "blue": 282, "red": 265}},
    {"number": 13, "par": 5, "strokeIndex": 9, "yardages": {"black": 536, "blue": 497, "red": 460}},
    {"number": 14, "par": 4, "strokeIndex": 1, "yardages": {"black": 420, "blue": 387, "red": 344}},
    {"number": 15, "par": 4, "strokeIndex": 3, "yardages": {"black": 364, "blue": 338, "red": 308}},
    {"number": 16, "par": 4, "strokeIndex": 11, "yardages": {"black": 320, "blue": 290, "red": 266}},
    {"number": 17, "par": 3, "strokeIndex": 17, "yardages": {"black": 142, "blue": 127, "red": 104}},
    {"number": 18, "par": 4, "strokeIndex": 5, "yardages": {"black": 380, "blue": 352, "red": 329}}
  ]'::jsonb,
  '[
    {"name": "Black", "color": "black", "courseRating": 72.0, "slopeRating": 120, "totalYardage": 6242},
    {"name": "Blue", "color": "blue", "courseRating": 70.0, "slopeRating": 117, "totalYardage": 5816},
    {"name": "Red", "color": "red", "courseRating": 72.0, "slopeRating": 120, "totalYardage": 5238}
  ]'::jsonb
)
ON CONFLICT (venue_id, name) DO UPDATE SET
  description = EXCLUDED.description,
  slope_rating = EXCLUDED.slope_rating,
  course_rating = EXCLUDED.course_rating,
  holes = EXCLUDED.holes,
  tees = EXCLUDED.tees;

-- BENDIGO GOLF CLUB
INSERT INTO courses (venue_id, name, description, slope_rating, course_rating, holes, tees)
VALUES (
  'f1a2b3c4-d5e6-7890-abcd-700000000002',
  'Bendigo',
  'Championship course in central Victoria''s goldfields region. The demanding 3rd at 440 yards is stroke index 1, with the 1st also at 440 yards being stroke index 2. Long par 4s dominate this challenging layout with five par 4s over 390 yards.',
  113,
  72.0,
  '[
    {"number": 1, "par": 4, "strokeIndex": 2, "yardages": {"blue": 440, "red": 437}},
    {"number": 2, "par": 4, "strokeIndex": 12, "yardages": {"blue": 342, "red": 316}},
    {"number": 3, "par": 4, "strokeIndex": 1, "yardages": {"blue": 440, "red": 416}},
    {"number": 4, "par": 4, "strokeIndex": 6, "yardages": {"blue": 395, "red": 347}},
    {"number": 5, "par": 3, "strokeIndex": 11, "yardages": {"blue": 202, "red": 180}},
    {"number": 6, "par": 5, "strokeIndex": 15, "yardages": {"blue": 492, "red": 432}},
    {"number": 7, "par": 4, "strokeIndex": 5, "yardages": {"blue": 397, "red": 355}},
    {"number": 8, "par": 4, "strokeIndex": 3, "yardages": {"blue": 369, "red": 334}},
    {"number": 9, "par": 4, "strokeIndex": 9, "yardages": {"blue": 411, "red": 342}},
    {"number": 10, "par": 4, "strokeIndex": 8, "yardages": {"blue": 394, "red": 383}},
    {"number": 11, "par": 4, "strokeIndex": 10, "yardages": {"blue": 359, "red": 334}},
    {"number": 12, "par": 3, "strokeIndex": 16, "yardages": {"blue": 165, "red": 164}},
    {"number": 13, "par": 5, "strokeIndex": 13, "yardages": {"blue": 513, "red": 448}},
    {"number": 14, "par": 4, "strokeIndex": 17, "yardages": {"blue": 318, "red": 295}},
    {"number": 15, "par": 4, "strokeIndex": 4, "yardages": {"blue": 399, "red": 312}},
    {"number": 16, "par": 4, "strokeIndex": 14, "yardages": {"blue": 308, "red": 153}},
    {"number": 17, "par": 3, "strokeIndex": 18, "yardages": {"blue": 153, "red": 120}},
    {"number": 18, "par": 5, "strokeIndex": 7, "yardages": {"blue": 509, "red": 484}}
  ]'::jsonb,
  '[
    {"name": "Blue", "color": "blue", "courseRating": 72.0, "slopeRating": 113, "totalYardage": 6606},
    {"name": "Red", "color": "red", "courseRating": 73.0, "slopeRating": 113, "totalYardage": 5852}
  ]'::jsonb
)
ON CONFLICT (venue_id, name) DO UPDATE SET
  description = EXCLUDED.description,
  slope_rating = EXCLUDED.slope_rating,
  course_rating = EXCLUDED.course_rating,
  holes = EXCLUDED.holes,
  tees = EXCLUDED.tees;

-- CATHEDRAL LODGE AND GOLF CLUB
-- Greg Norman design (2017), exclusive private club
INSERT INTO courses (venue_id, name, description, slope_rating, course_rating, holes, tees)
VALUES (
  'f1a2b3c4-d5e6-7890-abcd-700000000003',
  'Cathedral Lodge',
  'Exclusive Greg Norman designed championship course opened 2017 on the Goulburn River near Alexandra. Fewer than 200 members. The 7th at 478 yards is stroke index 1, with the 18th par 5 at 609 yards being stroke index 2. Features rolling hills, water hazards, and heavily bunkered greens.',
  138,
  72.0,
  '[
    {"number": 1, "par": 4, "strokeIndex": 17, "yardages": {"black": 338, "blue": 338}},
    {"number": 2, "par": 3, "strokeIndex": 3, "yardages": {"black": 217, "blue": 176}},
    {"number": 3, "par": 4, "strokeIndex": 9, "yardages": {"black": 440, "blue": 399}},
    {"number": 4, "par": 3, "strokeIndex": 15, "yardages": {"black": 153, "blue": 147}},
    {"number": 5, "par": 4, "strokeIndex": 13, "yardages": {"black": 306, "blue": 306}},
    {"number": 6, "par": 5, "strokeIndex": 5, "yardages": {"black": 620, "blue": 620}},
    {"number": 7, "par": 4, "strokeIndex": 1, "yardages": {"black": 478, "blue": 467}},
    {"number": 8, "par": 5, "strokeIndex": 11, "yardages": {"black": 582, "blue": 554}},
    {"number": 9, "par": 3, "strokeIndex": 7, "yardages": {"black": 219, "blue": 219}},
    {"number": 10, "par": 4, "strokeIndex": 16, "yardages": {"black": 368, "blue": 368}},
    {"number": 11, "par": 5, "strokeIndex": 12, "yardages": {"black": 545, "blue": 502}},
    {"number": 12, "par": 4, "strokeIndex": 18, "yardages": {"black": 315, "blue": 315}},
    {"number": 13, "par": 4, "strokeIndex": 8, "yardages": {"black": 419, "blue": 380}},
    {"number": 14, "par": 5, "strokeIndex": 6, "yardages": {"black": 592, "blue": 592}},
    {"number": 15, "par": 3, "strokeIndex": 14, "yardages": {"black": 151, "blue": 151}},
    {"number": 16, "par": 4, "strokeIndex": 10, "yardages": {"black": 418, "blue": 418}},
    {"number": 17, "par": 3, "strokeIndex": 4, "yardages": {"black": 188, "blue": 188}},
    {"number": 18, "par": 5, "strokeIndex": 2, "yardages": {"black": 609, "blue": 567}}
  ]'::jsonb,
  '[
    {"name": "Black", "color": "black", "courseRating": 74.0, "slopeRating": 138, "totalYardage": 6958},
    {"name": "Blue", "color": "blue", "courseRating": 72.0, "slopeRating": 132, "totalYardage": 6707}
  ]'::jsonb
)
ON CONFLICT (venue_id, name) DO UPDATE SET
  description = EXCLUDED.description,
  slope_rating = EXCLUDED.slope_rating,
  course_rating = EXCLUDED.course_rating,
  holes = EXCLUDED.holes,
  tees = EXCLUDED.tees;

-- PORT FAIRY GOLF LINKS
-- Top 100 ranked natural links course, OCM design
INSERT INTO courses (venue_id, name, description, slope_rating, course_rating, holes, tees)
VALUES (
  'f1a2b3c4-d5e6-7890-abcd-700000000004',
  'Port Fairy Links',
  'Classic Top 100 ranked natural links through unspoilt sand dunes with spectacular Southern Ocean views. Redesigned by Ogilvy Clayton Cocking Mead. The 14th at 446 yards is stroke index 1 and voted best 14th in Australia. The 7th at 404 yards is stroke index 2.',
  124,
  72.0,
  '[
    {"number": 1, "par": 5, "strokeIndex": 13, "yardages": {"blue": 506, "yellow": 462}},
    {"number": 2, "par": 4, "strokeIndex": 12, "yardages": {"blue": 357, "yellow": 245}},
    {"number": 3, "par": 4, "strokeIndex": 16, "yardages": {"blue": 333, "yellow": 254}},
    {"number": 4, "par": 3, "strokeIndex": 10, "yardages": {"blue": 183, "yellow": 157}},
    {"number": 5, "par": 5, "strokeIndex": 14, "yardages": {"blue": 490, "yellow": 442}},
    {"number": 6, "par": 4, "strokeIndex": 8, "yardages": {"blue": 358, "yellow": 294}},
    {"number": 7, "par": 4, "strokeIndex": 2, "yardages": {"blue": 404, "yellow": 352}},
    {"number": 8, "par": 3, "strokeIndex": 15, "yardages": {"blue": 133, "yellow": 130}},
    {"number": 9, "par": 4, "strokeIndex": 7, "yardages": {"blue": 388, "yellow": 378}},
    {"number": 10, "par": 4, "strokeIndex": 9, "yardages": {"blue": 350, "yellow": 308}},
    {"number": 11, "par": 3, "strokeIndex": 11, "yardages": {"blue": 154, "yellow": 131}},
    {"number": 12, "par": 5, "strokeIndex": 17, "yardages": {"blue": 509, "yellow": 423}},
    {"number": 13, "par": 4, "strokeIndex": 18, "yardages": {"blue": 304, "yellow": 292}},
    {"number": 14, "par": 4, "strokeIndex": 1, "yardages": {"blue": 446, "yellow": 366}},
    {"number": 15, "par": 3, "strokeIndex": 6, "yardages": {"blue": 195, "yellow": 153}},
    {"number": 16, "par": 4, "strokeIndex": 4, "yardages": {"blue": 399, "yellow": 355}},
    {"number": 17, "par": 4, "strokeIndex": 3, "yardages": {"blue": 401, "yellow": 354}},
    {"number": 18, "par": 5, "strokeIndex": 5, "yardages": {"blue": 529, "yellow": 438}}
  ]'::jsonb,
  '[
    {"name": "Blue", "color": "blue", "courseRating": 72.0, "slopeRating": 124, "totalYardage": 6439},
    {"name": "Yellow", "color": "yellow", "courseRating": 72.0, "slopeRating": 119, "totalYardage": 5534}
  ]'::jsonb
)
ON CONFLICT (venue_id, name) DO UPDATE SET
  description = EXCLUDED.description,
  slope_rating = EXCLUDED.slope_rating,
  course_rating = EXCLUDED.course_rating,
  holes = EXCLUDED.holes,
  tees = EXCLUDED.tees;

-- SHEPPARTON GOLF CLUB
INSERT INTO courses (venue_id, name, description, slope_rating, course_rating, holes, tees)
VALUES (
  'f1a2b3c4-d5e6-7890-abcd-700000000005',
  'Shepparton',
  'Premier Goulburn Valley course with challenging layout. The 10th at 415 yards is stroke index 1, with the 4th at 379 yards being stroke index 2. Features three par 5s on the front nine for early scoring opportunities. Well-conditioned regional championship course.',
  118,
  72.0,
  '[
    {"number": 1, "par": 5, "strokeIndex": 16, "yardages": {"blue": 451}},
    {"number": 2, "par": 3, "strokeIndex": 18, "yardages": {"blue": 142}},
    {"number": 3, "par": 5, "strokeIndex": 8, "yardages": {"blue": 505}},
    {"number": 4, "par": 4, "strokeIndex": 2, "yardages": {"blue": 379}},
    {"number": 5, "par": 3, "strokeIndex": 14, "yardages": {"blue": 162}},
    {"number": 6, "par": 4, "strokeIndex": 12, "yardages": {"blue": 306}},
    {"number": 7, "par": 4, "strokeIndex": 4, "yardages": {"blue": 345}},
    {"number": 8, "par": 4, "strokeIndex": 10, "yardages": {"blue": 326}},
    {"number": 9, "par": 5, "strokeIndex": 6, "yardages": {"blue": 486}},
    {"number": 10, "par": 4, "strokeIndex": 1, "yardages": {"blue": 415}},
    {"number": 11, "par": 4, "strokeIndex": 15, "yardages": {"blue": 338}},
    {"number": 12, "par": 3, "strokeIndex": 13, "yardages": {"blue": 155}},
    {"number": 13, "par": 4, "strokeIndex": 3, "yardages": {"blue": 371}},
    {"number": 14, "par": 4, "strokeIndex": 5, "yardages": {"blue": 351}},
    {"number": 15, "par": 4, "strokeIndex": 9, "yardages": {"blue": 333}},
    {"number": 16, "par": 5, "strokeIndex": 17, "yardages": {"blue": 447}},
    {"number": 17, "par": 3, "strokeIndex": 7, "yardages": {"blue": 172}},
    {"number": 18, "par": 4, "strokeIndex": 11, "yardages": {"blue": 352}}
  ]'::jsonb,
  '[
    {"name": "Blue", "color": "blue", "courseRating": 72.0, "slopeRating": 118, "totalYardage": 6036}
  ]'::jsonb
)
ON CONFLICT (venue_id, name) DO UPDATE SET
  description = EXCLUDED.description,
  slope_rating = EXCLUDED.slope_rating,
  course_rating = EXCLUDED.course_rating,
  holes = EXCLUDED.holes,
  tees = EXCLUDED.tees;

-- WANGARATTA GOLF CLUB
INSERT INTO courses (venue_id, name, description, slope_rating, course_rating, holes, tees)
VALUES (
  'f1a2b3c4-d5e6-7890-abcd-700000000006',
  'Wangaratta',
  'Gentle undulating par 69 course set on historic Waldara Homestead grounds (built 1886). The 12th at 423 yards is stroke index 1, with the 14th par 5 at 561 yards being stroke index 3. Features five par 3s making accuracy key. Excellent value at $25 for 18 holes.',
  120,
  70.5,
  '[
    {"number": 1, "par": 4, "strokeIndex": 17, "yardages": {"blue": 279}},
    {"number": 2, "par": 4, "strokeIndex": 12, "yardages": {"blue": 324}},
    {"number": 3, "par": 4, "strokeIndex": 6, "yardages": {"blue": 313}},
    {"number": 4, "par": 3, "strokeIndex": 10, "yardages": {"blue": 185}},
    {"number": 5, "par": 4, "strokeIndex": 2, "yardages": {"blue": 416}},
    {"number": 6, "par": 4, "strokeIndex": 4, "yardages": {"blue": 387}},
    {"number": 7, "par": 3, "strokeIndex": 7, "yardages": {"blue": 178}},
    {"number": 8, "par": 4, "strokeIndex": 11, "yardages": {"blue": 371}},
    {"number": 9, "par": 3, "strokeIndex": 18, "yardages": {"blue": 136}},
    {"number": 10, "par": 5, "strokeIndex": 15, "yardages": {"blue": 488}},
    {"number": 11, "par": 3, "strokeIndex": 13, "yardages": {"blue": 132}},
    {"number": 12, "par": 4, "strokeIndex": 1, "yardages": {"blue": 423}},
    {"number": 13, "par": 3, "strokeIndex": 16, "yardages": {"blue": 110}},
    {"number": 14, "par": 5, "strokeIndex": 3, "yardages": {"blue": 561}},
    {"number": 15, "par": 4, "strokeIndex": 5, "yardages": {"blue": 381}},
    {"number": 16, "par": 3, "strokeIndex": 8, "yardages": {"blue": 173}},
    {"number": 17, "par": 5, "strokeIndex": 14, "yardages": {"blue": 486}},
    {"number": 18, "par": 4, "strokeIndex": 9, "yardages": {"blue": 357}}
  ]'::jsonb,
  '[
    {"name": "Blue", "color": "blue", "courseRating": 70.5, "slopeRating": 120, "totalYardage": 5700}
  ]'::jsonb
)
ON CONFLICT (venue_id, name) DO UPDATE SET
  description = EXCLUDED.description,
  slope_rating = EXCLUDED.slope_rating,
  course_rating = EXCLUDED.course_rating,
  holes = EXCLUDED.holes,
  tees = EXCLUDED.tees;

-- WARRNAMBOOL GOLF CLUB
INSERT INTO courses (venue_id, name, description, slope_rating, course_rating, holes, tees)
VALUES (
  'f1a2b3c4-d5e6-7890-abcd-700000000007',
  'Warrnambool',
  'Premier Great Ocean Road course with excellent conditioning. The challenging 10th par 5 at 618 yards is stroke index 1, with the 11th at 439 yards being stroke index 2. Features three long par 5s on the back nine. Two tee options available.',
  120,
  72.0,
  '[
    {"number": 1, "par": 5, "strokeIndex": 14, "yardages": {"mens": 519, "womens": 502}},
    {"number": 2, "par": 3, "strokeIndex": 5, "yardages": {"mens": 205, "womens": 135}},
    {"number": 3, "par": 4, "strokeIndex": 3, "yardages": {"mens": 392, "womens": 352}},
    {"number": 4, "par": 4, "strokeIndex": 11, "yardages": {"mens": 327, "womens": 305}},
    {"number": 5, "par": 4, "strokeIndex": 6, "yardages": {"mens": 378, "womens": 351}},
    {"number": 6, "par": 4, "strokeIndex": 7, "yardages": {"mens": 360, "womens": 343}},
    {"number": 7, "par": 4, "strokeIndex": 9, "yardages": {"mens": 352, "womens": 334}},
    {"number": 8, "par": 4, "strokeIndex": 15, "yardages": {"mens": 256, "womens": 241}},
    {"number": 9, "par": 3, "strokeIndex": 18, "yardages": {"mens": 135, "womens": 118}},
    {"number": 10, "par": 5, "strokeIndex": 1, "yardages": {"mens": 618, "womens": 592}},
    {"number": 11, "par": 4, "strokeIndex": 2, "yardages": {"mens": 439, "womens": 404}},
    {"number": 12, "par": 4, "strokeIndex": 16, "yardages": {"mens": 341, "womens": 329}},
    {"number": 13, "par": 3, "strokeIndex": 13, "yardages": {"mens": 126, "womens": 113}},
    {"number": 14, "par": 4, "strokeIndex": 4, "yardages": {"mens": 350, "womens": 339}},
    {"number": 15, "par": 3, "strokeIndex": 8, "yardages": {"mens": 176, "womens": 163}},
    {"number": 16, "par": 4, "strokeIndex": 17, "yardages": {"mens": 325, "womens": 317}},
    {"number": 17, "par": 5, "strokeIndex": 12, "yardages": {"mens": 553, "womens": 494}},
    {"number": 18, "par": 5, "strokeIndex": 10, "yardages": {"mens": 506, "womens": 463}}
  ]'::jsonb,
  '[
    {"name": "Mens", "color": "white", "courseRating": 72.0, "slopeRating": 120, "totalYardage": 6358},
    {"name": "Womens", "color": "red", "courseRating": 74.0, "slopeRating": 125, "totalYardage": 5895}
  ]'::jsonb
)
ON CONFLICT (venue_id, name) DO UPDATE SET
  description = EXCLUDED.description,
  slope_rating = EXCLUDED.slope_rating,
  course_rating = EXCLUDED.course_rating,
  holes = EXCLUDED.holes,
  tees = EXCLUDED.tees;

-- MILDURA GOLF RESORT
INSERT INTO courses (venue_id, name, description, slope_rating, course_rating, holes, tees)
VALUES (
  'f1a2b3c4-d5e6-7890-abcd-700000000008',
  'Mildura',
  'Premier Mallee region course with excellent resort facilities. The challenging 15th at 467 yards is stroke index 1, with the 5th at 440 yards being stroke index 2. Par 71 layout with strong finish. Three tee options for all abilities.',
  120,
  71.0,
  '[
    {"number": 1, "par": 4, "strokeIndex": 17, "yardages": {"blue": 330, "white": 318, "red": 268}},
    {"number": 2, "par": 3, "strokeIndex": 9, "yardages": {"blue": 186, "white": 175, "red": 128}},
    {"number": 3, "par": 5, "strokeIndex": 11, "yardages": {"blue": 514, "white": 499, "red": 423}},
    {"number": 4, "par": 4, "strokeIndex": 16, "yardages": {"blue": 313, "white": 302, "red": 280}},
    {"number": 5, "par": 4, "strokeIndex": 2, "yardages": {"blue": 440, "white": 429, "red": 357}},
    {"number": 6, "par": 4, "strokeIndex": 15, "yardages": {"blue": 320, "white": 308, "red": 288}},
    {"number": 7, "par": 4, "strokeIndex": 13, "yardages": {"blue": 363, "white": 346, "red": 315}},
    {"number": 8, "par": 4, "strokeIndex": 7, "yardages": {"blue": 382, "white": 371, "red": 341}},
    {"number": 9, "par": 4, "strokeIndex": 4, "yardages": {"blue": 407, "white": 396, "red": 329}},
    {"number": 10, "par": 4, "strokeIndex": 18, "yardages": {"blue": 307, "white": 296, "red": 236}},
    {"number": 11, "par": 5, "strokeIndex": 10, "yardages": {"blue": 547, "white": 534, "red": 448}},
    {"number": 12, "par": 3, "strokeIndex": 14, "yardages": {"blue": 152, "white": 143, "red": 124}},
    {"number": 13, "par": 4, "strokeIndex": 6, "yardages": {"blue": 411, "white": 400, "red": 378}},
    {"number": 14, "par": 4, "strokeIndex": 3, "yardages": {"blue": 416, "white": 405, "red": 405}},
    {"number": 15, "par": 4, "strokeIndex": 1, "yardages": {"blue": 467, "white": 439, "red": 378}},
    {"number": 16, "par": 4, "strokeIndex": 12, "yardages": {"blue": 341, "white": 318, "red": 268}},
    {"number": 17, "par": 4, "strokeIndex": 8, "yardages": {"blue": 408, "white": 400, "red": 408}},
    {"number": 18, "par": 3, "strokeIndex": 5, "yardages": {"blue": 226, "white": 217, "red": 189}}
  ]'::jsonb,
  '[
    {"name": "Blue", "color": "blue", "courseRating": 71.0, "slopeRating": 120, "totalYardage": 6530},
    {"name": "White", "color": "white", "courseRating": 70.0, "slopeRating": 117, "totalYardage": 6296},
    {"name": "Red", "color": "red", "courseRating": 72.0, "slopeRating": 122, "totalYardage": 5563}
  ]'::jsonb
)
ON CONFLICT (venue_id, name) DO UPDATE SET
  description = EXCLUDED.description,
  slope_rating = EXCLUDED.slope_rating,
  course_rating = EXCLUDED.course_rating,
  holes = EXCLUDED.holes,
  tees = EXCLUDED.tees;

-- =====================================================
-- STEP 3: Migration Summary
-- This migration adds 8 new venues and 8 courses to the database:
-- - Ballarat Golf Club (Goldfields region)
-- - Bendigo Golf Club (Goldfields region)
-- - Cathedral Lodge and Golf Club (Goulburn region, Greg Norman design)
-- - Port Fairy Golf Links (Western region, Top 100)
-- - Shepparton Golf Club (Goulburn region)
-- - Wangaratta Golf Club (North East region)
-- - Warrnambool Golf Club (Western region)
-- - Mildura Golf Resort (Mallee region)
-- Regional Victoria coverage significantly improved
-- =====================================================
