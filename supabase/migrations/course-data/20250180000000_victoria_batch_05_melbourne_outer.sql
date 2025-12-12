-- =====================================================
-- Migration: victoria_batch_05_melbourne_outer
-- Description: Add Melbourne Outer (South East, North, West) golf venues and courses
--              Part of Victorian golf course data collection
-- Date: 2025-12-10
-- Batch: 5 of 7 (Melbourne Outer)
-- =====================================================

-- =====================================================
-- STEP 1: INSERT NEW VENUES
-- Using ON CONFLICT to handle re-runs safely
-- =====================================================

-- Sandhurst Club (36 holes - Champions and North courses)
INSERT INTO venues (id, source, name, state, city, address, phone, website, total_holes)
VALUES (
  'f1a2b3c4-d5e6-7890-abcd-500000000001',
  'manual',
  'Sandhurst Club',
  'VIC',
  'Sandhurst',
  '300 Doyles Road, Sandhurst VIC 3977',
  '+61 3 9747 9600',
  'https://www.sandhurst.com.au',
  36
)
ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name,
  address = EXCLUDED.address,
  phone = EXCLUDED.phone,
  website = EXCLUDED.website,
  total_holes = EXCLUDED.total_holes;

-- Spring Valley Golf Club (Top 100 ranked)
INSERT INTO venues (id, source, name, state, city, address, phone, website, total_holes)
VALUES (
  'f1a2b3c4-d5e6-7890-abcd-500000000002',
  'manual',
  'Spring Valley Golf Club',
  'VIC',
  'Clayton',
  '390 Princes Highway, Clayton VIC 3168',
  '+61 3 9544 0766',
  'https://www.springvalleygolf.com.au',
  18
)
ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name,
  address = EXCLUDED.address,
  phone = EXCLUDED.phone,
  website = EXCLUDED.website;

-- Settlers Run Golf & Country Club (Greg Norman design)
INSERT INTO venues (id, source, name, state, city, address, phone, website, total_holes)
VALUES (
  'f1a2b3c4-d5e6-7890-abcd-500000000003',
  'manual',
  'Settlers Run Golf & Country Club',
  'VIC',
  'Botanic Ridge',
  '1 Settlers Run, Botanic Ridge VIC 3977',
  '+61 3 5971 0900',
  'https://www.settlersrungcc.com.au',
  18
)
ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name,
  address = EXCLUDED.address,
  phone = EXCLUDED.phone,
  website = EXCLUDED.website;

-- Sanctuary Lakes Golf Club (Top 100 ranked)
INSERT INTO venues (id, source, name, state, city, address, phone, website, total_holes)
VALUES (
  'f1a2b3c4-d5e6-7890-abcd-500000000004',
  'manual',
  'Sanctuary Lakes Golf Club',
  'VIC',
  'Point Cook',
  '100 Greg Norman Drive, Sanctuary Lakes VIC 3030',
  '+61 3 9395 5666',
  'https://www.sanctuarylakesgolf.com.au',
  18
)
ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name,
  address = EXCLUDED.address,
  phone = EXCLUDED.phone,
  website = EXCLUDED.website;

-- Eynesbury Golf (Graham Marsh design)
INSERT INTO venues (id, source, name, state, city, address, phone, website, total_holes)
VALUES (
  'f1a2b3c4-d5e6-7890-abcd-500000000005',
  'manual',
  'Eynesbury Golf',
  'VIC',
  'Eynesbury',
  '487 Eynesbury Road, Eynesbury VIC 3338',
  '+61 3 9977 6900',
  'https://www.eynesburygolf.com.au',
  18
)
ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name,
  address = EXCLUDED.address,
  phone = EXCLUDED.phone,
  website = EXCLUDED.website;

-- Growling Frog Golf Course
INSERT INTO venues (id, source, name, state, city, address, phone, website, total_holes)
VALUES (
  'f1a2b3c4-d5e6-7890-abcd-500000000006',
  'manual',
  'Growling Frog Golf Course',
  'VIC',
  'Yan Yean',
  '1910 Donnybrook Road, Yan Yean VIC 3755',
  '+61 3 9717 4444',
  'https://www.growlingfrog.com.au',
  18
)
ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name,
  address = EXCLUDED.address,
  phone = EXCLUDED.phone,
  website = EXCLUDED.website;

-- Glen Waverley Golf Club
INSERT INTO venues (id, source, name, state, city, address, phone, website, total_holes)
VALUES (
  'f1a2b3c4-d5e6-7890-abcd-500000000007',
  'manual',
  'Glen Waverley Golf Club',
  'VIC',
  'Glen Waverley',
  '915 Waverley Road, Glen Waverley VIC 3150',
  '+61 3 9560 6060',
  'https://www.glenwaverleygolfclub.com.au',
  18
)
ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name,
  address = EXCLUDED.address,
  phone = EXCLUDED.phone,
  website = EXCLUDED.website;

-- Ranfurlie Golf Club (OCM design, Top 100)
INSERT INTO venues (id, source, name, state, city, address, phone, website, total_holes)
VALUES (
  'f1a2b3c4-d5e6-7890-abcd-500000000008',
  'manual',
  'Ranfurlie Golf Club',
  'VIC',
  'Cranbourne West',
  '825 Cranbourne-Frankston Road, Cranbourne West VIC 3977',
  '+61 3 9788 8288',
  'https://www.ranfurlie.com.au',
  18
)
ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name,
  address = EXCLUDED.address,
  phone = EXCLUDED.phone,
  website = EXCLUDED.website;

-- Beaconhills Country Golf Club
INSERT INTO venues (id, source, name, state, city, address, phone, website, total_holes)
VALUES (
  'f1a2b3c4-d5e6-7890-abcd-500000000009',
  'manual',
  'Beaconhills Country Golf Club',
  'VIC',
  'Upper Beaconsfield',
  'Stoney Creek Road, Upper Beaconsfield VIC 3808',
  '+61 3 5945 9210',
  'https://www.beaconhillsgolf.com.au',
  27
)
ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name,
  address = EXCLUDED.address,
  phone = EXCLUDED.phone,
  website = EXCLUDED.website,
  total_holes = EXCLUDED.total_holes;

-- =====================================================
-- STEP 2: INSERT COURSES WITH FULL HOLE DATA
-- =====================================================

-- SANDHURST CLUB - NORTH COURSE
INSERT INTO courses (venue_id, name, description, slope_rating, course_rating, holes, tees)
VALUES (
  'f1a2b3c4-d5e6-7890-abcd-500000000001',
  'North Course',
  'Championship course at Sandhurst Club featuring water hazards and strategic bunkering. The challenging 6th at 418 yards is stroke index 1, while the 12th at 391 yards is stroke index 2. Features four par 5s and four par 3s with excellent conditioning year-round.',
  125,
  72.0,
  '[
    {"number": 1, "par": 4, "strokeIndex": 17, "yardages": {"black": 366, "blue": 318, "white": 305, "red": 292}},
    {"number": 2, "par": 4, "strokeIndex": 5, "yardages": {"black": 406, "blue": 393, "white": 380, "red": 335}},
    {"number": 3, "par": 3, "strokeIndex": 15, "yardages": {"black": 181, "blue": 162, "white": 153, "red": 131}},
    {"number": 4, "par": 5, "strokeIndex": 11, "yardages": {"black": 517, "blue": 497, "white": 485, "red": 417}},
    {"number": 5, "par": 4, "strokeIndex": 3, "yardages": {"black": 388, "blue": 370, "white": 341, "red": 316}},
    {"number": 6, "par": 4, "strokeIndex": 1, "yardages": {"black": 418, "blue": 385, "white": 372, "red": 344}},
    {"number": 7, "par": 4, "strokeIndex": 7, "yardages": {"black": 374, "blue": 347, "white": 335, "red": 305}},
    {"number": 8, "par": 3, "strokeIndex": 13, "yardages": {"black": 173, "blue": 159, "white": 151, "red": 141}},
    {"number": 9, "par": 5, "strokeIndex": 9, "yardages": {"black": 512, "blue": 487, "white": 479, "red": 451}},
    {"number": 10, "par": 4, "strokeIndex": 6, "yardages": {"black": 375, "blue": 357, "white": 345, "red": 317}},
    {"number": 11, "par": 5, "strokeIndex": 12, "yardages": {"black": 497, "blue": 482, "white": 458, "red": 424}},
    {"number": 12, "par": 4, "strokeIndex": 2, "yardages": {"black": 391, "blue": 375, "white": 365, "red": 330}},
    {"number": 13, "par": 3, "strokeIndex": 18, "yardages": {"black": 137, "blue": 128, "white": 112, "red": 104}},
    {"number": 14, "par": 4, "strokeIndex": 14, "yardages": {"black": 321, "blue": 277, "white": 270, "red": 224}},
    {"number": 15, "par": 3, "strokeIndex": 8, "yardages": {"black": 178, "blue": 171, "white": 165, "red": 152}},
    {"number": 16, "par": 4, "strokeIndex": 16, "yardages": {"black": 324, "blue": 305, "white": 298, "red": 255}},
    {"number": 17, "par": 5, "strokeIndex": 10, "yardages": {"black": 528, "blue": 515, "white": 493, "red": 450}},
    {"number": 18, "par": 4, "strokeIndex": 4, "yardages": {"black": 392, "blue": 361, "white": 349, "red": 317}}
  ]'::jsonb,
  '[
    {"name": "Black", "color": "black", "courseRating": 72.0, "slopeRating": 125, "totalYardage": 6478},
    {"name": "Blue", "color": "blue", "courseRating": 70.5, "slopeRating": 122, "totalYardage": 6089},
    {"name": "White", "color": "white", "courseRating": 69.5, "slopeRating": 119, "totalYardage": 5856},
    {"name": "Red", "color": "red", "courseRating": 70.0, "slopeRating": 116, "totalYardage": 5305}
  ]'::jsonb
)
ON CONFLICT (venue_id, name) DO UPDATE SET
  description = EXCLUDED.description,
  slope_rating = EXCLUDED.slope_rating,
  course_rating = EXCLUDED.course_rating,
  holes = EXCLUDED.holes,
  tees = EXCLUDED.tees;

-- SANDHURST CLUB - CHAMPIONS COURSE
INSERT INTO courses (venue_id, name, description, slope_rating, course_rating, holes, tees)
VALUES (
  'f1a2b3c4-d5e6-7890-abcd-500000000001',
  'Champions Course',
  'The second 18-hole championship layout at Sandhurst. Features strategic risk-reward holes with the 9th at 414 yards being stroke index 1. Four par 5s and four par 3s provide variety. The 15th is stroke index 2 at 355 yards.',
  120,
  72.0,
  '[
    {"number": 1, "par": 4, "strokeIndex": 5, "yardages": {"blue": 345, "white": 321, "red": 272}},
    {"number": 2, "par": 4, "strokeIndex": 15, "yardages": {"blue": 337, "white": 304, "red": 246}},
    {"number": 3, "par": 5, "strokeIndex": 11, "yardages": {"blue": 504, "white": 450, "red": 389}},
    {"number": 4, "par": 4, "strokeIndex": 17, "yardages": {"blue": 336, "white": 294, "red": 358}},
    {"number": 5, "par": 5, "strokeIndex": 9, "yardages": {"blue": 488, "white": 455, "red": 405}},
    {"number": 6, "par": 3, "strokeIndex": 3, "yardages": {"blue": 179, "white": 151, "red": 121}},
    {"number": 7, "par": 4, "strokeIndex": 13, "yardages": {"blue": 350, "white": 331, "red": 295}},
    {"number": 8, "par": 3, "strokeIndex": 7, "yardages": {"blue": 180, "white": 161, "red": 140}},
    {"number": 9, "par": 4, "strokeIndex": 1, "yardages": {"blue": 414, "white": 389, "red": 353}},
    {"number": 10, "par": 5, "strokeIndex": 8, "yardages": {"blue": 502, "white": 477, "red": 419}},
    {"number": 11, "par": 3, "strokeIndex": 16, "yardages": {"blue": 138, "white": 117, "red": 87}},
    {"number": 12, "par": 5, "strokeIndex": 18, "yardages": {"blue": 488, "white": 445, "red": 390}},
    {"number": 13, "par": 4, "strokeIndex": 6, "yardages": {"blue": 360, "white": 330, "red": 279}},
    {"number": 14, "par": 4, "strokeIndex": 10, "yardages": {"blue": 341, "white": 318, "red": 265}},
    {"number": 15, "par": 4, "strokeIndex": 2, "yardages": {"blue": 355, "white": 330, "red": 290}},
    {"number": 16, "par": 3, "strokeIndex": 14, "yardages": {"blue": 167, "white": 138, "red": 101}},
    {"number": 17, "par": 4, "strokeIndex": 12, "yardages": {"blue": 332, "white": 301, "red": 264}},
    {"number": 18, "par": 4, "strokeIndex": 4, "yardages": {"blue": 424, "white": 395, "red": 350}}
  ]'::jsonb,
  '[
    {"name": "Blue", "color": "blue", "courseRating": 72.0, "slopeRating": 120, "totalYardage": 6240},
    {"name": "White", "color": "white", "courseRating": 69.5, "slopeRating": 117, "totalYardage": 5707},
    {"name": "Red", "color": "red", "courseRating": 70.0, "slopeRating": 114, "totalYardage": 5024}
  ]'::jsonb
)
ON CONFLICT (venue_id, name) DO UPDATE SET
  description = EXCLUDED.description,
  slope_rating = EXCLUDED.slope_rating,
  course_rating = EXCLUDED.course_rating,
  holes = EXCLUDED.holes,
  tees = EXCLUDED.tees;

-- SPRING VALLEY GOLF CLUB
-- Top 100 ranked, challenging championship layout
INSERT INTO courses (venue_id, name, description, slope_rating, course_rating, holes, tees)
VALUES (
  'f1a2b3c4-d5e6-7890-abcd-500000000002',
  'Spring Valley',
  'Top 100 ranked championship course featuring tight tree-lined fairways and challenging greens. The demanding 10th at 466 yards is stroke index 1, while the finishing 18th par 5 at 629 yards provides a spectacular finish. One of Melbourne''s premier private clubs.',
  130,
  73.2,
  '[
    {"number": 1, "par": 4, "strokeIndex": 12, "yardages": {"black": 426, "blue": 367, "white": 354, "red": 308}},
    {"number": 2, "par": 3, "strokeIndex": 18, "yardages": {"black": 202, "blue": 177, "white": 153, "red": 137}},
    {"number": 3, "par": 4, "strokeIndex": 6, "yardages": {"black": 417, "blue": 379, "white": 367, "red": 323}},
    {"number": 4, "par": 4, "strokeIndex": 16, "yardages": {"black": 360, "blue": 329, "white": 322, "red": 233}},
    {"number": 5, "par": 5, "strokeIndex": 8, "yardages": {"black": 520, "blue": 475, "white": 463, "red": 421}},
    {"number": 6, "par": 4, "strokeIndex": 14, "yardages": {"black": 376, "blue": 350, "white": 343, "red": 310}},
    {"number": 7, "par": 3, "strokeIndex": 10, "yardages": {"black": 228, "blue": 212, "white": 197, "red": 136}},
    {"number": 8, "par": 4, "strokeIndex": 2, "yardages": {"black": 421, "blue": 401, "white": 392, "red": 325}},
    {"number": 9, "par": 5, "strokeIndex": 4, "yardages": {"black": 552, "blue": 527, "white": 514, "red": 434}},
    {"number": 10, "par": 4, "strokeIndex": 1, "yardages": {"black": 466, "blue": 436, "white": 421, "red": 361}},
    {"number": 11, "par": 4, "strokeIndex": 17, "yardages": {"black": 353, "blue": 300, "white": 272, "red": 234}},
    {"number": 12, "par": 4, "strokeIndex": 7, "yardages": {"black": 427, "blue": 391, "white": 381, "red": 332}},
    {"number": 13, "par": 3, "strokeIndex": 15, "yardages": {"black": 202, "blue": 171, "white": 157, "red": 123}},
    {"number": 14, "par": 4, "strokeIndex": 13, "yardages": {"black": 392, "blue": 333, "white": 318, "red": 223}},
    {"number": 15, "par": 4, "strokeIndex": 11, "yardages": {"black": 410, "blue": 351, "white": 340, "red": 282}},
    {"number": 16, "par": 5, "strokeIndex": 5, "yardages": {"black": 581, "blue": 531, "white": 494, "red": 452}},
    {"number": 17, "par": 3, "strokeIndex": 9, "yardages": {"black": 218, "blue": 197, "white": 178, "red": 99}},
    {"number": 18, "par": 5, "strokeIndex": 3, "yardages": {"black": 629, "blue": 532, "white": 525, "red": 423}}
  ]'::jsonb,
  '[
    {"name": "Black", "color": "black", "courseRating": 73.2, "slopeRating": 130, "totalYardage": 7180},
    {"name": "Blue", "color": "blue", "courseRating": 70.2, "slopeRating": 128, "totalYardage": 6459},
    {"name": "White", "color": "white", "courseRating": 68.8, "slopeRating": 118, "totalYardage": 6191},
    {"name": "Red", "color": "red", "courseRating": 68.7, "slopeRating": 119, "totalYardage": 5156}
  ]'::jsonb
)
ON CONFLICT (venue_id, name) DO UPDATE SET
  description = EXCLUDED.description,
  slope_rating = EXCLUDED.slope_rating,
  course_rating = EXCLUDED.course_rating,
  holes = EXCLUDED.holes,
  tees = EXCLUDED.tees;

-- SETTLERS RUN GOLF & COUNTRY CLUB
-- Greg Norman design inspired by MacKenzie
INSERT INTO courses (venue_id, name, description, slope_rating, course_rating, holes, tees)
VALUES (
  'f1a2b3c4-d5e6-7890-abcd-500000000003',
  'Settlers Run',
  'Greg Norman designed championship course opened in 2007, inspired by Alister MacKenzie''s work at Royal Melbourne. Features natural wetlands and rolling landscapes. The 14th at 431 yards is stroke index 1. Ranked #86 nationally by Australian Golf Digest.',
  128,
  72.0,
  '[
    {"number": 1, "par": 5, "strokeIndex": 2, "yardages": {"black": 531, "gold": 493, "silver": 484, "jade": 457}},
    {"number": 2, "par": 3, "strokeIndex": 11, "yardages": {"black": 173, "gold": 156, "silver": 149, "jade": 119}},
    {"number": 3, "par": 4, "strokeIndex": 5, "yardages": {"black": 429, "gold": 361, "silver": 342, "jade": 296}},
    {"number": 4, "par": 4, "strokeIndex": 16, "yardages": {"black": 332, "gold": 317, "silver": 309, "jade": 270}},
    {"number": 5, "par": 4, "strokeIndex": 14, "yardages": {"black": 348, "gold": 330, "silver": 321, "jade": 289}},
    {"number": 6, "par": 4, "strokeIndex": 13, "yardages": {"black": 376, "gold": 348, "silver": 330, "jade": 296}},
    {"number": 7, "par": 4, "strokeIndex": 8, "yardages": {"black": 375, "gold": 342, "silver": 316, "jade": 286}},
    {"number": 8, "par": 3, "strokeIndex": 7, "yardages": {"black": 176, "gold": 173, "silver": 160, "jade": 122}},
    {"number": 9, "par": 5, "strokeIndex": 6, "yardages": {"black": 531, "gold": 481, "silver": 459, "jade": 413}},
    {"number": 10, "par": 4, "strokeIndex": 10, "yardages": {"black": 381, "gold": 348, "silver": 328, "jade": 311}},
    {"number": 11, "par": 3, "strokeIndex": 17, "yardages": {"black": 149, "gold": 128, "silver": 120, "jade": 87}},
    {"number": 12, "par": 4, "strokeIndex": 9, "yardages": {"black": 373, "gold": 339, "silver": 312, "jade": 284}},
    {"number": 13, "par": 4, "strokeIndex": 18, "yardages": {"black": 331, "gold": 306, "silver": 291, "jade": 244}},
    {"number": 14, "par": 4, "strokeIndex": 1, "yardages": {"black": 431, "gold": 389, "silver": 369, "jade": 340}},
    {"number": 15, "par": 4, "strokeIndex": 4, "yardages": {"black": 419, "gold": 381, "silver": 372, "jade": 327}},
    {"number": 16, "par": 5, "strokeIndex": 12, "yardages": {"black": 517, "gold": 474, "silver": 453, "jade": 417}},
    {"number": 17, "par": 4, "strokeIndex": 15, "yardages": {"black": 303, "gold": 277, "silver": 268, "jade": 247}},
    {"number": 18, "par": 4, "strokeIndex": 3, "yardages": {"black": 402, "gold": 384, "silver": 366, "jade": 311}}
  ]'::jsonb,
  '[
    {"name": "Black", "color": "black", "courseRating": 72.0, "slopeRating": 128, "totalYardage": 6877},
    {"name": "Gold", "color": "gold", "courseRating": 70.0, "slopeRating": 124, "totalYardage": 6027},
    {"name": "Silver", "color": "white", "courseRating": 69.0, "slopeRating": 120, "totalYardage": 5749},
    {"name": "Jade", "color": "red", "courseRating": 68.0, "slopeRating": 116, "totalYardage": 5116}
  ]'::jsonb
)
ON CONFLICT (venue_id, name) DO UPDATE SET
  description = EXCLUDED.description,
  slope_rating = EXCLUDED.slope_rating,
  course_rating = EXCLUDED.course_rating,
  holes = EXCLUDED.holes,
  tees = EXCLUDED.tees;

-- SANCTUARY LAKES GOLF CLUB
-- Top 100 ranked Greg Norman design
INSERT INTO courses (venue_id, name, description, slope_rating, course_rating, holes, tees)
VALUES (
  'f1a2b3c4-d5e6-7890-abcd-500000000004',
  'Sanctuary Lakes',
  'Top 100 ranked Greg Norman designed championship course. Features extensive water hazards and strategic bunkering. The 18th at 414 yards is stroke index 1, with the 13th at 405 yards being stroke index 2. Excellent practice facilities and modern clubhouse.',
  113,
  75.0,
  '[
    {"number": 1, "par": 4, "strokeIndex": 7, "yardages": {"black": 379, "blue": 370, "white": 348, "pink": 325, "red": 325}},
    {"number": 2, "par": 3, "strokeIndex": 10, "yardages": {"black": 155, "blue": 146, "white": 121, "pink": 121, "red": 94}},
    {"number": 3, "par": 4, "strokeIndex": 13, "yardages": {"black": 342, "blue": 304, "white": 294, "pink": 268, "red": 268}},
    {"number": 4, "par": 5, "strokeIndex": 5, "yardages": {"black": 500, "blue": 485, "white": 480, "pink": 432, "red": 432}},
    {"number": 5, "par": 4, "strokeIndex": 14, "yardages": {"black": 393, "blue": 363, "white": 320, "pink": 320, "red": 312}},
    {"number": 6, "par": 3, "strokeIndex": 16, "yardages": {"black": 156, "blue": 148, "white": 136, "pink": 136, "red": 115}},
    {"number": 7, "par": 4, "strokeIndex": 15, "yardages": {"black": 367, "blue": 347, "white": 324, "pink": 298, "red": 298}},
    {"number": 8, "par": 5, "strokeIndex": 4, "yardages": {"black": 535, "blue": 510, "white": 482, "pink": 482, "red": 451}},
    {"number": 9, "par": 4, "strokeIndex": 11, "yardages": {"black": 364, "blue": 356, "white": 330, "pink": 310, "red": 310}},
    {"number": 10, "par": 4, "strokeIndex": 9, "yardages": {"black": 389, "blue": 370, "white": 343, "pink": 317, "red": 317}},
    {"number": 11, "par": 3, "strokeIndex": 12, "yardages": {"black": 169, "blue": 161, "white": 142, "pink": 142, "red": 125}},
    {"number": 12, "par": 5, "strokeIndex": 17, "yardages": {"black": 517, "blue": 486, "white": 477, "pink": 455, "red": 455}},
    {"number": 13, "par": 4, "strokeIndex": 2, "yardages": {"black": 405, "blue": 383, "white": 376, "pink": 337, "red": 337}},
    {"number": 14, "par": 4, "strokeIndex": 6, "yardages": {"black": 364, "blue": 356, "white": 327, "pink": 296, "red": 296}},
    {"number": 15, "par": 4, "strokeIndex": 18, "yardages": {"black": 315, "blue": 308, "white": 284, "pink": 284, "red": 273}},
    {"number": 16, "par": 5, "strokeIndex": 3, "yardages": {"black": 523, "blue": 513, "white": 491, "pink": 466, "red": 466}},
    {"number": 17, "par": 3, "strokeIndex": 8, "yardages": {"black": 202, "blue": 192, "white": 155, "pink": 155, "red": 135}},
    {"number": 18, "par": 4, "strokeIndex": 1, "yardages": {"black": 414, "blue": 386, "white": 346, "pink": 304, "red": 304}}
  ]'::jsonb,
  '[
    {"name": "Black", "color": "black", "courseRating": 75.0, "slopeRating": 113, "totalYardage": 6489},
    {"name": "Blue", "color": "blue", "courseRating": 73.0, "slopeRating": 113, "totalYardage": 6184},
    {"name": "White", "color": "white", "courseRating": 70.0, "slopeRating": 113, "totalYardage": 5776},
    {"name": "Pink", "color": "pink", "courseRating": 75.0, "slopeRating": 113, "totalYardage": 5448},
    {"name": "Red", "color": "red", "courseRating": 74.0, "slopeRating": 113, "totalYardage": 5313}
  ]'::jsonb
)
ON CONFLICT (venue_id, name) DO UPDATE SET
  description = EXCLUDED.description,
  slope_rating = EXCLUDED.slope_rating,
  course_rating = EXCLUDED.course_rating,
  holes = EXCLUDED.holes,
  tees = EXCLUDED.tees;

-- EYNESBURY GOLF
-- Graham Marsh design, highly rated
INSERT INTO courses (venue_id, name, description, slope_rating, course_rating, holes, tees)
VALUES (
  'f1a2b3c4-d5e6-7890-abcd-500000000005',
  'Eynesbury',
  'Graham Marsh designed championship course opened in 2007 with slope rating of 142 - one of Victoria''s most challenging. The 4th at 460 yards is stroke index 1, with water mid-fairway and sand guarding the approach. The signature 16th is a risk-reward par 5 at 537 yards.',
  142,
  72.0,
  '[
    {"number": 1, "par": 4, "strokeIndex": 17, "yardages": {"black": 353}},
    {"number": 2, "par": 4, "strokeIndex": 13, "yardages": {"black": 349}},
    {"number": 3, "par": 3, "strokeIndex": 9, "yardages": {"black": 177}},
    {"number": 4, "par": 4, "strokeIndex": 1, "yardages": {"black": 460}},
    {"number": 5, "par": 5, "strokeIndex": 7, "yardages": {"black": 517}},
    {"number": 6, "par": 4, "strokeIndex": 5, "yardages": {"black": 390}},
    {"number": 7, "par": 5, "strokeIndex": 11, "yardages": {"black": 494}},
    {"number": 8, "par": 3, "strokeIndex": 15, "yardages": {"black": 160}},
    {"number": 9, "par": 4, "strokeIndex": 3, "yardages": {"black": 413}},
    {"number": 10, "par": 5, "strokeIndex": 6, "yardages": {"black": 527}},
    {"number": 11, "par": 3, "strokeIndex": 12, "yardages": {"black": 188}},
    {"number": 12, "par": 4, "strokeIndex": 14, "yardages": {"black": 348}},
    {"number": 13, "par": 4, "strokeIndex": 18, "yardages": {"black": 312}},
    {"number": 14, "par": 4, "strokeIndex": 2, "yardages": {"black": 420}},
    {"number": 15, "par": 3, "strokeIndex": 10, "yardages": {"black": 181}},
    {"number": 16, "par": 5, "strokeIndex": 8, "yardages": {"black": 537}},
    {"number": 17, "par": 4, "strokeIndex": 16, "yardages": {"black": 348}},
    {"number": 18, "par": 4, "strokeIndex": 4, "yardages": {"black": 403}}
  ]'::jsonb,
  '[
    {"name": "Black", "color": "black", "courseRating": 72.0, "slopeRating": 142, "totalYardage": 6577}
  ]'::jsonb
)
ON CONFLICT (venue_id, name) DO UPDATE SET
  description = EXCLUDED.description,
  slope_rating = EXCLUDED.slope_rating,
  course_rating = EXCLUDED.course_rating,
  holes = EXCLUDED.holes,
  tees = EXCLUDED.tees;

-- GROWLING FROG GOLF COURSE
-- Public course in Melbourne North
INSERT INTO courses (venue_id, name, description, slope_rating, course_rating, holes, tees)
VALUES (
  'f1a2b3c4-d5e6-7890-abcd-500000000006',
  'Growling Frog',
  'Popular public course in Melbourne''s northern growth corridor. The challenging 18th at 400 yards is stroke index 1, while the 6th at 421 yards is stroke index 2. Features three par 5s on each nine with well-conditioned fairways throughout.',
  113,
  72.0,
  '[
    {"number": 1, "par": 4, "strokeIndex": 16, "yardages": {"white": 330, "red": 288}},
    {"number": 2, "par": 3, "strokeIndex": 12, "yardages": {"white": 161, "red": 137}},
    {"number": 3, "par": 5, "strokeIndex": 13, "yardages": {"white": 482, "red": 420}},
    {"number": 4, "par": 4, "strokeIndex": 7, "yardages": {"white": 349, "red": 301}},
    {"number": 5, "par": 3, "strokeIndex": 18, "yardages": {"white": 135, "red": 110}},
    {"number": 6, "par": 4, "strokeIndex": 2, "yardages": {"white": 421, "red": 362}},
    {"number": 7, "par": 4, "strokeIndex": 14, "yardages": {"white": 331, "red": 300}},
    {"number": 8, "par": 5, "strokeIndex": 4, "yardages": {"white": 506, "red": 440}},
    {"number": 9, "par": 4, "strokeIndex": 6, "yardages": {"white": 346, "red": 304}},
    {"number": 10, "par": 4, "strokeIndex": 5, "yardages": {"white": 360, "red": 313}},
    {"number": 11, "par": 5, "strokeIndex": 9, "yardages": {"white": 488, "red": 432}},
    {"number": 12, "par": 3, "strokeIndex": 8, "yardages": {"white": 164, "red": 135}},
    {"number": 13, "par": 4, "strokeIndex": 15, "yardages": {"white": 350, "red": 308}},
    {"number": 14, "par": 4, "strokeIndex": 11, "yardages": {"white": 331, "red": 297}},
    {"number": 15, "par": 5, "strokeIndex": 3, "yardages": {"white": 511, "red": 432}},
    {"number": 16, "par": 3, "strokeIndex": 10, "yardages": {"white": 188, "red": 145}},
    {"number": 17, "par": 4, "strokeIndex": 17, "yardages": {"white": 332, "red": 284}},
    {"number": 18, "par": 4, "strokeIndex": 1, "yardages": {"white": 400, "red": 320}}
  ]'::jsonb,
  '[
    {"name": "White", "color": "white", "courseRating": 72.0, "slopeRating": 113, "totalYardage": 6185},
    {"name": "Red", "color": "red", "courseRating": 72.0, "slopeRating": 110, "totalYardage": 5328}
  ]'::jsonb
)
ON CONFLICT (venue_id, name) DO UPDATE SET
  description = EXCLUDED.description,
  slope_rating = EXCLUDED.slope_rating,
  course_rating = EXCLUDED.course_rating,
  holes = EXCLUDED.holes,
  tees = EXCLUDED.tees;

-- GLEN WAVERLEY GOLF CLUB
-- Par 68 layout on public course
INSERT INTO courses (venue_id, name, description, slope_rating, course_rating, holes, tees)
VALUES (
  'f1a2b3c4-d5e6-7890-abcd-500000000007',
  'Glen Waverley',
  'Established in 1967, this Par 68 layout demands accuracy over power. Tight tree-lined fairways with bouncy conditions mean a long iron off the tee is often the smart play. The 3rd at 146 yards is stroke index 1 despite being a par 3. Five par 3s and two par 5s.',
  121,
  67.0,
  '[
    {"number": 1, "par": 4, "strokeIndex": 9, "yardages": {"blue": 337}},
    {"number": 2, "par": 4, "strokeIndex": 17, "yardages": {"blue": 351}},
    {"number": 3, "par": 3, "strokeIndex": 1, "yardages": {"blue": 146}},
    {"number": 4, "par": 4, "strokeIndex": 3, "yardages": {"blue": 425}},
    {"number": 5, "par": 4, "strokeIndex": 5, "yardages": {"blue": 426}},
    {"number": 6, "par": 5, "strokeIndex": 13, "yardages": {"blue": 481}},
    {"number": 7, "par": 3, "strokeIndex": 11, "yardages": {"blue": 152}},
    {"number": 8, "par": 4, "strokeIndex": 15, "yardages": {"blue": 375}},
    {"number": 9, "par": 4, "strokeIndex": 7, "yardages": {"blue": 449}},
    {"number": 10, "par": 3, "strokeIndex": 16, "yardages": {"blue": 188}},
    {"number": 11, "par": 4, "strokeIndex": 12, "yardages": {"blue": 363}},
    {"number": 12, "par": 3, "strokeIndex": 18, "yardages": {"blue": 148}},
    {"number": 13, "par": 4, "strokeIndex": 2, "yardages": {"blue": 310}},
    {"number": 14, "par": 4, "strokeIndex": 8, "yardages": {"blue": 330}},
    {"number": 15, "par": 4, "strokeIndex": 4, "yardages": {"blue": 314}},
    {"number": 16, "par": 4, "strokeIndex": 6, "yardages": {"blue": 311}},
    {"number": 17, "par": 4, "strokeIndex": 14, "yardages": {"blue": 336}},
    {"number": 18, "par": 3, "strokeIndex": 10, "yardages": {"blue": 174}}
  ]'::jsonb,
  '[
    {"name": "Blue", "color": "blue", "courseRating": 67.0, "slopeRating": 121, "totalYardage": 5616}
  ]'::jsonb
)
ON CONFLICT (venue_id, name) DO UPDATE SET
  description = EXCLUDED.description,
  slope_rating = EXCLUDED.slope_rating,
  course_rating = EXCLUDED.course_rating,
  holes = EXCLUDED.holes,
  tees = EXCLUDED.tees;

-- RANFURLIE GOLF CLUB
-- OCM design, Top 100 ranked (#62)
INSERT INTO courses (venue_id, name, description, slope_rating, course_rating, holes, tees)
VALUES (
  'f1a2b3c4-d5e6-7890-abcd-500000000008',
  'Ranfurlie',
  'Redesigned by Ogilvy Clayton Mead (2017), ranked #62 in Australia. Original design by Michael Clayton (2002). Features the acclaimed 299-yard 16th, considered one of Australia''s best short holes. The 5th at 458 yards is stroke index 1. Strong par 5s at 2nd and 8th on the front nine.',
  128,
  72.0,
  '[
    {"number": 1, "par": 4, "strokeIndex": 15, "yardages": {"black": 352, "white": 340, "yellow": 329, "red": 329}},
    {"number": 2, "par": 5, "strokeIndex": 12, "yardages": {"black": 580, "white": 557, "yellow": 548, "red": 546}},
    {"number": 3, "par": 3, "strokeIndex": 10, "yardages": {"black": 220, "white": 196, "yellow": 177, "red": 171}},
    {"number": 4, "par": 4, "strokeIndex": 7, "yardages": {"black": 445, "white": 419, "yellow": 394, "red": 374}},
    {"number": 5, "par": 4, "strokeIndex": 1, "yardages": {"black": 458, "white": 440, "yellow": 429, "red": 393}},
    {"number": 6, "par": 4, "strokeIndex": 4, "yardages": {"black": 501, "white": 477, "yellow": 468, "red": 438}},
    {"number": 7, "par": 3, "strokeIndex": 17, "yardages": {"black": 153, "white": 140, "yellow": 131, "red": 115}},
    {"number": 8, "par": 5, "strokeIndex": 16, "yardages": {"black": 560, "white": 545, "yellow": 536, "red": 487}},
    {"number": 9, "par": 3, "strokeIndex": 6, "yardages": {"black": 208, "white": 187, "yellow": 179, "red": 150}},
    {"number": 10, "par": 5, "strokeIndex": 9, "yardages": {"black": 643, "white": 626, "yellow": 595, "red": 571}},
    {"number": 11, "par": 3, "strokeIndex": 11, "yardages": {"black": 212, "white": 195, "yellow": 183, "red": 150}},
    {"number": 12, "par": 4, "strokeIndex": 14, "yardages": {"black": 412, "white": 383, "yellow": 374, "red": 357}},
    {"number": 13, "par": 4, "strokeIndex": 5, "yardages": {"black": 475, "white": 458, "yellow": 451, "red": 415}},
    {"number": 14, "par": 4, "strokeIndex": 3, "yardages": {"black": 484, "white": 462, "yellow": 451, "red": 381}},
    {"number": 15, "par": 3, "strokeIndex": 13, "yardages": {"black": 178, "white": 165, "yellow": 156, "red": 149}},
    {"number": 16, "par": 4, "strokeIndex": 18, "yardages": {"black": 325, "white": 314, "yellow": 305, "red": 259}},
    {"number": 17, "par": 4, "strokeIndex": 2, "yardages": {"black": 487, "white": 478, "yellow": 431, "red": 421}},
    {"number": 18, "par": 5, "strokeIndex": 8, "yardages": {"black": 609, "white": 588, "yellow": 555, "red": 489}}
  ]'::jsonb,
  '[
    {"name": "Black", "color": "black", "courseRating": 74.0, "slopeRating": 132, "totalYardage": 7302},
    {"name": "White", "color": "white", "courseRating": 72.0, "slopeRating": 128, "totalYardage": 6970},
    {"name": "Yellow", "color": "yellow", "courseRating": 70.5, "slopeRating": 124, "totalYardage": 6692},
    {"name": "Red", "color": "red", "courseRating": 72.0, "slopeRating": 120, "totalYardage": 6195}
  ]'::jsonb
)
ON CONFLICT (venue_id, name) DO UPDATE SET
  description = EXCLUDED.description,
  slope_rating = EXCLUDED.slope_rating,
  course_rating = EXCLUDED.course_rating,
  holes = EXCLUDED.holes,
  tees = EXCLUDED.tees;

-- BEACONHILLS COUNTRY GOLF CLUB
-- 27 holes in bushland setting
INSERT INTO courses (venue_id, name, description, slope_rating, course_rating, holes, tees)
VALUES (
  'f1a2b3c4-d5e6-7890-abcd-500000000009',
  'Beaconhills',
  'Picturesque 27-hole facility on the edge of the Dandenong Ranges. Originally designed by Dick & Rowley Banks (1947). The 12th at 416 yards is stroke index 1. Features rolling hills, iconic lakes, and a famous kangaroo population. Par 71 layout with five par 3s.',
  120,
  70.2,
  '[
    {"number": 1, "par": 4, "strokeIndex": 8, "yardages": {"blue": 401}},
    {"number": 2, "par": 3, "strokeIndex": 6, "yardages": {"blue": 223}},
    {"number": 3, "par": 5, "strokeIndex": 18, "yardages": {"blue": 488}},
    {"number": 4, "par": 5, "strokeIndex": 4, "yardages": {"blue": 536}},
    {"number": 5, "par": 4, "strokeIndex": 10, "yardages": {"blue": 346}},
    {"number": 6, "par": 3, "strokeIndex": 17, "yardages": {"blue": 141}},
    {"number": 7, "par": 4, "strokeIndex": 2, "yardages": {"blue": 391}},
    {"number": 8, "par": 4, "strokeIndex": 7, "yardages": {"blue": 375}},
    {"number": 9, "par": 4, "strokeIndex": 14, "yardages": {"blue": 345}},
    {"number": 10, "par": 5, "strokeIndex": 12, "yardages": {"blue": 531}},
    {"number": 11, "par": 3, "strokeIndex": 9, "yardages": {"blue": 201}},
    {"number": 12, "par": 4, "strokeIndex": 1, "yardages": {"blue": 416}},
    {"number": 13, "par": 3, "strokeIndex": 13, "yardages": {"blue": 170}},
    {"number": 14, "par": 5, "strokeIndex": 15, "yardages": {"blue": 492}},
    {"number": 15, "par": 3, "strokeIndex": 16, "yardages": {"blue": 152}},
    {"number": 16, "par": 4, "strokeIndex": 3, "yardages": {"blue": 363}},
    {"number": 17, "par": 4, "strokeIndex": 5, "yardages": {"blue": 381}},
    {"number": 18, "par": 4, "strokeIndex": 11, "yardages": {"blue": 339}}
  ]'::jsonb,
  '[
    {"name": "Blue", "color": "blue", "courseRating": 70.2, "slopeRating": 120, "totalYardage": 6291}
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
-- This migration adds 9 new venues and 10 courses to the database
-- (Sandhurst has 2 courses: North and Champions)
-- Melbourne Outer coverage significantly improved
-- =====================================================
