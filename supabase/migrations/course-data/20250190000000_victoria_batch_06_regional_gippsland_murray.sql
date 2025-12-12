-- =====================================================
-- Migration: victoria_batch_06_regional_gippsland_murray
-- Description: Add Regional Gippsland & Murray golf venues and courses
--              Part of Victorian golf course data collection
-- Date: 2025-12-10
-- Batch: 6 of 7 (Regional Gippsland & Murray)
-- =====================================================

-- =====================================================
-- STEP 1: INSERT NEW VENUES
-- Using ON CONFLICT to handle re-runs safely
-- =====================================================

-- BLACK BULL GOLF COURSE (Top 100 ranked)
INSERT INTO venues (id, source, name, state, city, address, phone, website, total_holes)
VALUES (
  'f1a2b3c4-d5e6-7890-abcd-600000000001',
  'manual',
  'Black Bull Golf Course',
  'VIC',
  'Yarrawonga',
  '1535 Murray Valley Highway, Yarrawonga VIC 3730',
  '+61 3 5744 3277',
  'https://www.blackbullgolf.com.au',
  18
)
ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name,
  address = EXCLUDED.address,
  phone = EXCLUDED.phone,
  website = EXCLUDED.website;

-- COBRAM BAROOGA GOLF CLUB (36 holes - Old and West courses)
INSERT INTO venues (id, source, name, state, city, address, phone, website, total_holes)
VALUES (
  'f1a2b3c4-d5e6-7890-abcd-600000000002',
  'manual',
  'Cobram Barooga Golf Club',
  'NSW',
  'Barooga',
  'Golf Course Road, Barooga NSW 2644',
  '+61 3 5873 4220',
  'https://www.cbgc.com.au',
  36
)
ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name,
  address = EXCLUDED.address,
  phone = EXCLUDED.phone,
  website = EXCLUDED.website,
  total_holes = EXCLUDED.total_holes;

-- RICH RIVER GOLF CLUB RESORT (36 holes - East and West courses)
INSERT INTO venues (id, source, name, state, city, address, phone, website, total_holes)
VALUES (
  'f1a2b3c4-d5e6-7890-abcd-600000000003',
  'manual',
  'Rich River Golf Club Resort',
  'NSW',
  'Moama',
  '24 Lane Street, Moama NSW 2731',
  '+61 3 5481 3333',
  'https://www.richriver.com.au',
  36
)
ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name,
  address = EXCLUDED.address,
  phone = EXCLUDED.phone,
  website = EXCLUDED.website,
  total_holes = EXCLUDED.total_holes;

-- YARRAWONGA MULWALA GOLF CLUB RESORT (45 holes - Murray and Lake courses)
INSERT INTO venues (id, source, name, state, city, address, phone, website, total_holes)
VALUES (
  'f1a2b3c4-d5e6-7890-abcd-600000000004',
  'manual',
  'Yarrawonga Mulwala Golf Club Resort',
  'NSW',
  'Mulwala',
  '75 Hume Street, Mulwala NSW 2647',
  '+61 3 5744 1911',
  'https://www.yarragolf.com.au',
  45
)
ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name,
  address = EXCLUDED.address,
  phone = EXCLUDED.phone,
  website = EXCLUDED.website,
  total_holes = EXCLUDED.total_holes;

-- BAIRNSDALE GOLF CLUB
INSERT INTO venues (id, source, name, state, city, address, phone, website, total_holes)
VALUES (
  'f1a2b3c4-d5e6-7890-abcd-600000000005',
  'manual',
  'Bairnsdale Golf Club',
  'VIC',
  'Eagle Point',
  '2A Eagle Point Road, Eagle Point VIC 3878',
  '+61 3 5156 6252',
  'https://www.bairnsdalegolf.com.au',
  18
)
ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name,
  address = EXCLUDED.address,
  phone = EXCLUDED.phone,
  website = EXCLUDED.website;

-- SALE GOLF CLUB
INSERT INTO venues (id, source, name, state, city, address, phone, website, total_holes)
VALUES (
  'f1a2b3c4-d5e6-7890-abcd-600000000006',
  'manual',
  'Sale Golf Club',
  'VIC',
  'Sale',
  '1285 Princes Highway, Sale VIC 3850',
  '+61 3 5144 2063',
  'https://www.salegolfclub.com.au',
  18
)
ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name,
  address = EXCLUDED.address,
  phone = EXCLUDED.phone,
  website = EXCLUDED.website;

-- TRARALGON GOLF CLUB
INSERT INTO venues (id, source, name, state, city, address, phone, website, total_holes)
VALUES (
  'f1a2b3c4-d5e6-7890-abcd-600000000007',
  'manual',
  'Traralgon Golf Club',
  'VIC',
  'Traralgon',
  'Golf Links Road, Traralgon VIC 3844',
  '+61 3 5174 6752',
  'https://www.traralgongolfclub.com.au',
  18
)
ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name,
  address = EXCLUDED.address,
  phone = EXCLUDED.phone,
  website = EXCLUDED.website;

-- LAKES ENTRANCE GOLF CLUB
INSERT INTO venues (id, source, name, state, city, address, phone, website, total_holes)
VALUES (
  'f1a2b3c4-d5e6-7890-abcd-600000000008',
  'manual',
  'Lakes Entrance Golf Club',
  'VIC',
  'Lakes Entrance',
  'Golf Links Road, Lakes Entrance VIC 3909',
  '+61 3 5155 1697',
  'https://www.lakesentrancegolf.com.au',
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

-- BLACK BULL GOLF COURSE
-- Top 100 ranked, championship layout
INSERT INTO courses (venue_id, name, description, slope_rating, course_rating, holes, tees)
VALUES (
  'f1a2b3c4-d5e6-7890-abcd-600000000001',
  'Black Bull',
  'Top 100 ranked championship course in the Murray Valley. The challenging 18th at 450 yards is stroke index 1, with the demanding 10th par 5 at 586 yards being stroke index 3. Seven different tee options cater to all abilities. Features water hazards and strategic bunkering throughout.',
  130,
  74.7,
  '[
    {"number": 1, "par": 4, "strokeIndex": 2, "yardages": {"back": 444, "bull": 418, "comboM": 418, "ranch": 402, "hayfield": 364, "comboW": 364, "corral": 317}},
    {"number": 2, "par": 3, "strokeIndex": 4, "yardages": {"back": 215, "bull": 185, "comboM": 185, "ranch": 175, "hayfield": 133, "comboW": 133, "corral": 110}},
    {"number": 3, "par": 5, "strokeIndex": 18, "yardages": {"back": 520, "bull": 493, "comboM": 479, "ranch": 479, "hayfield": 427, "comboW": 427, "corral": 373}},
    {"number": 4, "par": 4, "strokeIndex": 12, "yardages": {"back": 452, "bull": 418, "comboM": 403, "ranch": 403, "hayfield": 363, "comboW": 318, "corral": 318}},
    {"number": 5, "par": 4, "strokeIndex": 14, "yardages": {"back": 346, "bull": 337, "comboM": 320, "ranch": 320, "hayfield": 299, "comboW": 233, "corral": 233}},
    {"number": 6, "par": 4, "strokeIndex": 6, "yardages": {"back": 438, "bull": 414, "comboM": 396, "ranch": 396, "hayfield": 330, "comboW": 330, "corral": 309}},
    {"number": 7, "par": 5, "strokeIndex": 16, "yardages": {"back": 570, "bull": 543, "comboM": 512, "ranch": 512, "hayfield": 453, "comboW": 453, "corral": 400}},
    {"number": 8, "par": 3, "strokeIndex": 10, "yardages": {"back": 230, "bull": 212, "comboM": 199, "ranch": 199, "hayfield": 148, "comboW": 148, "corral": 139}},
    {"number": 9, "par": 4, "strokeIndex": 8, "yardages": {"back": 425, "bull": 402, "comboM": 402, "ranch": 385, "hayfield": 342, "comboW": 308, "corral": 308}},
    {"number": 10, "par": 5, "strokeIndex": 3, "yardages": {"back": 586, "bull": 568, "comboM": 568, "ranch": 538, "hayfield": 460, "comboW": 460, "corral": 437}},
    {"number": 11, "par": 3, "strokeIndex": 9, "yardages": {"back": 179, "bull": 149, "comboM": 149, "ranch": 146, "hayfield": 131, "comboW": 109, "corral": 109}},
    {"number": 12, "par": 4, "strokeIndex": 7, "yardages": {"back": 407, "bull": 378, "comboM": 378, "ranch": 362, "hayfield": 336, "comboW": 336, "corral": 298}},
    {"number": 13, "par": 4, "strokeIndex": 13, "yardages": {"back": 417, "bull": 392, "comboM": 392, "ranch": 358, "hayfield": 324, "comboW": 324, "corral": 290}},
    {"number": 14, "par": 4, "strokeIndex": 11, "yardages": {"back": 405, "bull": 358, "comboM": 358, "ranch": 312, "hayfield": 297, "comboW": 253, "corral": 253}},
    {"number": 15, "par": 5, "strokeIndex": 17, "yardages": {"back": 525, "bull": 481, "comboM": 468, "ranch": 468, "hayfield": 402, "comboW": 402, "corral": 376}},
    {"number": 16, "par": 3, "strokeIndex": 5, "yardages": {"back": 250, "bull": 235, "comboM": 221, "ranch": 221, "hayfield": 205, "comboW": 168, "corral": 168}},
    {"number": 17, "par": 4, "strokeIndex": 15, "yardages": {"back": 350, "bull": 336, "comboM": 304, "ranch": 304, "hayfield": 288, "comboW": 277, "corral": 277}},
    {"number": 18, "par": 4, "strokeIndex": 1, "yardages": {"back": 450, "bull": 426, "comboM": 426, "ranch": 409, "hayfield": 359, "comboW": 304, "corral": 304}}
  ]'::jsonb,
  '[
    {"name": "Back", "color": "black", "courseRating": 74.7, "slopeRating": 130, "totalYardage": 7209},
    {"name": "Bull", "color": "blue", "courseRating": 72.1, "slopeRating": 126, "totalYardage": 6745},
    {"name": "Combo (M)", "color": "white", "courseRating": 71.3, "slopeRating": 125, "totalYardage": 6578},
    {"name": "Ranch", "color": "gold", "courseRating": 70.2, "slopeRating": 124, "totalYardage": 6389},
    {"name": "Hayfield", "color": "yellow", "courseRating": 67.0, "slopeRating": 116, "totalYardage": 5661},
    {"name": "Combo (W)", "color": "pink", "courseRating": 70.8, "slopeRating": 129, "totalYardage": 5347},
    {"name": "Corral", "color": "red", "courseRating": 68.6, "slopeRating": 121, "totalYardage": 5019}
  ]'::jsonb
)
ON CONFLICT (venue_id, name) DO UPDATE SET
  description = EXCLUDED.description,
  slope_rating = EXCLUDED.slope_rating,
  course_rating = EXCLUDED.course_rating,
  holes = EXCLUDED.holes,
  tees = EXCLUDED.tees;

-- COBRAM BAROOGA - OLD COURSE
-- Top 100 ranked, designed by H. Vernon Morcom (1955)
INSERT INTO courses (venue_id, name, description, slope_rating, course_rating, holes, tees)
VALUES (
  'f1a2b3c4-d5e6-7890-abcd-600000000002',
  'Old Course',
  'Top 100 ranked course designed by H. Vernon Morcom (1955), established in 1928. Not long by modern standards but clever design and narrow fairways provide a good test. The 8th at 451m is stroke index 1, with the 2nd at 422m being stroke index 2. Well-conditioned parkland layout.',
  121,
  72.0,
  '[
    {"number": 1, "par": 5, "strokeIndex": 13, "yardages": {"blue": 560, "white": 540, "red": 478}},
    {"number": 2, "par": 4, "strokeIndex": 2, "yardages": {"blue": 462, "white": 452, "red": 305}},
    {"number": 3, "par": 3, "strokeIndex": 6, "yardages": {"blue": 230, "white": 217, "red": 193}},
    {"number": 4, "par": 4, "strokeIndex": 4, "yardages": {"blue": 442, "white": 410, "red": 380}},
    {"number": 5, "par": 3, "strokeIndex": 15, "yardages": {"blue": 155, "white": 132, "red": 126}},
    {"number": 6, "par": 5, "strokeIndex": 9, "yardages": {"blue": 561, "white": 549, "red": 509}},
    {"number": 7, "par": 4, "strokeIndex": 3, "yardages": {"blue": 445, "white": 436, "red": 429}},
    {"number": 8, "par": 4, "strokeIndex": 1, "yardages": {"blue": 493, "white": 449, "red": 408}},
    {"number": 9, "par": 3, "strokeIndex": 17, "yardages": {"blue": 174, "white": 159, "red": 154}},
    {"number": 10, "par": 5, "strokeIndex": 14, "yardages": {"blue": 597, "white": 534, "red": 498}},
    {"number": 11, "par": 4, "strokeIndex": 5, "yardages": {"blue": 436, "white": 406, "red": 343}},
    {"number": 12, "par": 4, "strokeIndex": 7, "yardages": {"blue": 427, "white": 420, "red": 396}},
    {"number": 13, "par": 4, "strokeIndex": 12, "yardages": {"blue": 385, "white": 376, "red": 359}},
    {"number": 14, "par": 3, "strokeIndex": 16, "yardages": {"blue": 183, "white": 167, "red": 144}},
    {"number": 15, "par": 5, "strokeIndex": 8, "yardages": {"blue": 570, "white": 560, "red": 478}},
    {"number": 16, "par": 4, "strokeIndex": 18, "yardages": {"blue": 278, "white": 264, "red": 215}},
    {"number": 17, "par": 4, "strokeIndex": 10, "yardages": {"blue": 426, "white": 413, "red": 369}},
    {"number": 18, "par": 4, "strokeIndex": 11, "yardages": {"blue": 391, "white": 376, "red": 371}}
  ]'::jsonb,
  '[
    {"name": "Blue", "color": "blue", "courseRating": 72.0, "slopeRating": 121, "totalYardage": 7215},
    {"name": "White", "color": "white", "courseRating": 70.5, "slopeRating": 118, "totalYardage": 6860},
    {"name": "Red", "color": "red", "courseRating": 72.0, "slopeRating": 126, "totalYardage": 6155}
  ]'::jsonb
)
ON CONFLICT (venue_id, name) DO UPDATE SET
  description = EXCLUDED.description,
  slope_rating = EXCLUDED.slope_rating,
  course_rating = EXCLUDED.course_rating,
  holes = EXCLUDED.holes,
  tees = EXCLUDED.tees;

-- COBRAM BAROOGA - WEST COURSE
-- Built 1983, championship layout
INSERT INTO courses (venue_id, name, description, slope_rating, course_rating, holes, tees)
VALUES (
  'f1a2b3c4-d5e6-7890-abcd-600000000002',
  'West Course',
  'Championship layout built in 1983. The demanding 4th par 5 at 530m is stroke index 1, with the 11th par 5 at 547m being stroke index 2. Features wide fairways with strategic bunkering. Four tee options for all abilities.',
  125,
  72.0,
  '[
    {"number": 1, "par": 5, "strokeIndex": 13, "yardages": {"blue": 535, "red": 508}},
    {"number": 2, "par": 4, "strokeIndex": 5, "yardages": {"blue": 442, "red": 376}},
    {"number": 3, "par": 4, "strokeIndex": 9, "yardages": {"blue": 491, "red": 397}},
    {"number": 4, "par": 5, "strokeIndex": 1, "yardages": {"blue": 580, "red": 508}},
    {"number": 5, "par": 3, "strokeIndex": 7, "yardages": {"blue": 193, "red": 130}},
    {"number": 6, "par": 4, "strokeIndex": 11, "yardages": {"blue": 415, "red": 386}},
    {"number": 7, "par": 4, "strokeIndex": 3, "yardages": {"blue": 431, "red": 396}},
    {"number": 8, "par": 3, "strokeIndex": 15, "yardages": {"blue": 222, "red": 181}},
    {"number": 9, "par": 4, "strokeIndex": 17, "yardages": {"blue": 477, "red": 330}},
    {"number": 10, "par": 4, "strokeIndex": 16, "yardages": {"blue": 395, "red": 356}},
    {"number": 11, "par": 5, "strokeIndex": 2, "yardages": {"blue": 598, "red": 490}},
    {"number": 12, "par": 4, "strokeIndex": 10, "yardages": {"blue": 455, "red": 388}},
    {"number": 13, "par": 3, "strokeIndex": 12, "yardages": {"blue": 191, "red": 150}},
    {"number": 14, "par": 5, "strokeIndex": 4, "yardages": {"blue": 575, "red": 514}},
    {"number": 15, "par": 4, "strokeIndex": 14, "yardages": {"blue": 443, "red": 366}},
    {"number": 16, "par": 3, "strokeIndex": 8, "yardages": {"blue": 216, "red": 167}},
    {"number": 17, "par": 4, "strokeIndex": 6, "yardages": {"blue": 413, "red": 335}},
    {"number": 18, "par": 4, "strokeIndex": 18, "yardages": {"blue": 451, "red": 395}}
  ]'::jsonb,
  '[
    {"name": "Blue", "color": "blue", "courseRating": 72.0, "slopeRating": 125, "totalYardage": 7523},
    {"name": "Red", "color": "red", "courseRating": 73.0, "slopeRating": 140, "totalYardage": 6373}
  ]'::jsonb
)
ON CONFLICT (venue_id, name) DO UPDATE SET
  description = EXCLUDED.description,
  slope_rating = EXCLUDED.slope_rating,
  course_rating = EXCLUDED.course_rating,
  holes = EXCLUDED.holes,
  tees = EXCLUDED.tees;

-- RICH RIVER - EAST COURSE
-- Peter Thomson/Mike Wolveridge design (1998), links style
INSERT INTO courses (venue_id, name, description, slope_rating, course_rating, holes, tees)
VALUES (
  'f1a2b3c4-d5e6-7890-abcd-600000000003',
  'East Course',
  'Links style course redesigned by Peter Thomson and Mike Wolveridge in 1998. Original layout from 1907. The 2nd at 448m is stroke index 1, with the demanding 12th at 426m being stroke index 2. Water comes into play on several holes.',
  122,
  72.0,
  '[
    {"number": 1, "par": 5, "strokeIndex": 9, "yardages": {"blue": 641, "red": 544}},
    {"number": 2, "par": 4, "strokeIndex": 1, "yardages": {"blue": 490, "red": 342}},
    {"number": 3, "par": 3, "strokeIndex": 11, "yardages": {"blue": 220, "red": 177}},
    {"number": 4, "par": 4, "strokeIndex": 17, "yardages": {"blue": 376, "red": 299}},
    {"number": 5, "par": 5, "strokeIndex": 15, "yardages": {"blue": 579, "red": 522}},
    {"number": 6, "par": 4, "strokeIndex": 7, "yardages": {"blue": 431, "red": 368}},
    {"number": 7, "par": 4, "strokeIndex": 5, "yardages": {"blue": 405, "red": 364}},
    {"number": 8, "par": 3, "strokeIndex": 13, "yardages": {"blue": 173, "red": 132}},
    {"number": 9, "par": 4, "strokeIndex": 3, "yardages": {"blue": 463, "red": 415}},
    {"number": 10, "par": 4, "strokeIndex": 16, "yardages": {"blue": 390, "red": 367}},
    {"number": 11, "par": 5, "strokeIndex": 18, "yardages": {"blue": 533, "red": 481}},
    {"number": 12, "par": 4, "strokeIndex": 2, "yardages": {"blue": 466, "red": 391}},
    {"number": 13, "par": 3, "strokeIndex": 4, "yardages": {"blue": 232, "red": 183}},
    {"number": 14, "par": 4, "strokeIndex": 6, "yardages": {"blue": 414, "red": 353}},
    {"number": 15, "par": 4, "strokeIndex": 12, "yardages": {"blue": 432, "red": 356}},
    {"number": 16, "par": 3, "strokeIndex": 14, "yardages": {"blue": 172, "red": 137}},
    {"number": 17, "par": 4, "strokeIndex": 8, "yardages": {"blue": 414, "red": 359}},
    {"number": 18, "par": 5, "strokeIndex": 10, "yardages": {"blue": 636, "red": 524}}
  ]'::jsonb,
  '[
    {"name": "Blue", "color": "blue", "courseRating": 72.0, "slopeRating": 122, "totalYardage": 7467},
    {"name": "Red", "color": "red", "courseRating": 73.0, "slopeRating": 130, "totalYardage": 6314}
  ]'::jsonb
)
ON CONFLICT (venue_id, name) DO UPDATE SET
  description = EXCLUDED.description,
  slope_rating = EXCLUDED.slope_rating,
  course_rating = EXCLUDED.course_rating,
  holes = EXCLUDED.holes,
  tees = EXCLUDED.tees;

-- RICH RIVER - WEST COURSE
-- Built 1979, Ted Parslow/Peter Thomson design
INSERT INTO courses (venue_id, name, description, slope_rating, course_rating, holes, tees)
VALUES (
  'f1a2b3c4-d5e6-7890-abcd-600000000003',
  'West Course',
  'Tighter layout than the East, designed by Ted Parslow and Peter Thomson, built 1979. Host to many professional events. The 5th at 431m is stroke index 1, with the 2nd at 417m being stroke index 2. Tree-lined fairways and elevated greens make scoring tough.',
  123,
  71.0,
  '[
    {"number": 1, "par": 4, "strokeIndex": 5, "yardages": {"black": 427, "white": 409, "blue": 402, "red": 406}},
    {"number": 2, "par": 4, "strokeIndex": 2, "yardages": {"black": 456, "white": 436, "blue": 423, "red": 417}},
    {"number": 3, "par": 4, "strokeIndex": 6, "yardages": {"black": 446, "white": 419, "blue": 415, "red": 359}},
    {"number": 4, "par": 3, "strokeIndex": 18, "yardages": {"black": 165, "white": 150, "blue": 141, "red": 139}},
    {"number": 5, "par": 4, "strokeIndex": 1, "yardages": {"black": 471, "white": 453, "blue": 453, "red": 490}},
    {"number": 6, "par": 5, "strokeIndex": 15, "yardages": {"black": 545, "white": 529, "blue": 478, "red": 493}},
    {"number": 7, "par": 4, "strokeIndex": 10, "yardages": {"black": 423, "white": 413, "blue": 407, "red": 349}},
    {"number": 8, "par": 3, "strokeIndex": 8, "yardages": {"black": 212, "white": 195, "blue": 172, "red": 167}},
    {"number": 9, "par": 4, "strokeIndex": 7, "yardages": {"black": 426, "white": 417, "blue": 393, "red": 388}},
    {"number": 10, "par": 4, "strokeIndex": 17, "yardages": {"black": 352, "white": 347, "blue": 335, "red": 325}},
    {"number": 11, "par": 4, "strokeIndex": 12, "yardages": {"black": 388, "white": 379, "blue": 363, "red": 359}},
    {"number": 12, "par": 4, "strokeIndex": 13, "yardages": {"black": 336, "white": 330, "blue": 321, "red": 245}},
    {"number": 13, "par": 4, "strokeIndex": 9, "yardages": {"black": 400, "white": 376, "blue": 376, "red": 373}},
    {"number": 14, "par": 4, "strokeIndex": 3, "yardages": {"black": 477, "white": 449, "blue": 432, "red": 425}},
    {"number": 15, "par": 4, "strokeIndex": 16, "yardages": {"black": 347, "white": 327, "blue": 293, "red": 314}},
    {"number": 16, "par": 3, "strokeIndex": 11, "yardages": {"black": 164, "white": 152, "blue": 144, "red": 138}},
    {"number": 17, "par": 5, "strokeIndex": 4, "yardages": {"black": 575, "white": 553, "blue": 545, "red": 485}},
    {"number": 18, "par": 4, "strokeIndex": 14, "yardages": {"black": 444, "white": 424, "blue": 379, "red": 376}}
  ]'::jsonb,
  '[
    {"name": "Black", "color": "black", "courseRating": 71.0, "slopeRating": 123, "totalYardage": 7054},
    {"name": "White", "color": "white", "courseRating": 70.0, "slopeRating": 120, "totalYardage": 6758},
    {"name": "Blue", "color": "blue", "courseRating": 69.0, "slopeRating": 117, "totalYardage": 6471},
    {"name": "Red", "color": "red", "courseRating": 72.0, "slopeRating": 125, "totalYardage": 6248}
  ]'::jsonb
)
ON CONFLICT (venue_id, name) DO UPDATE SET
  description = EXCLUDED.description,
  slope_rating = EXCLUDED.slope_rating,
  course_rating = EXCLUDED.course_rating,
  holes = EXCLUDED.holes,
  tees = EXCLUDED.tees;

-- YARRAWONGA MULWALA - MURRAY COURSE
-- Peter Thomson/Mike Wolveridge design (1986)
INSERT INTO courses (venue_id, name, description, slope_rating, course_rating, holes, tees)
VALUES (
  'f1a2b3c4-d5e6-7890-abcd-600000000004',
  'Murray Course',
  'Peter Thomson and Mike Wolveridge championship design opened November 1986. Part of Australia''s largest 45-hole public golf facility. The demanding 16th par 5 at 521 yards is stroke index 1. Features towering river gums and sandy river flats with numerous water hazards.',
  132,
  72.0,
  '[
    {"number": 1, "par": 4, "strokeIndex": 6, "yardages": {"white": 341, "red": 294}},
    {"number": 2, "par": 3, "strokeIndex": 18, "yardages": {"white": 148, "red": 125}},
    {"number": 3, "par": 4, "strokeIndex": 13, "yardages": {"white": 352, "red": 287}},
    {"number": 4, "par": 4, "strokeIndex": 4, "yardages": {"white": 347, "red": 296}},
    {"number": 5, "par": 5, "strokeIndex": 9, "yardages": {"white": 470, "red": 407}},
    {"number": 6, "par": 4, "strokeIndex": 3, "yardages": {"white": 382, "red": 336}},
    {"number": 7, "par": 4, "strokeIndex": 16, "yardages": {"white": 335, "red": 283}},
    {"number": 8, "par": 3, "strokeIndex": 12, "yardages": {"white": 188, "red": 120}},
    {"number": 9, "par": 5, "strokeIndex": 7, "yardages": {"white": 523, "red": 467}},
    {"number": 10, "par": 3, "strokeIndex": 14, "yardages": {"white": 157, "red": 130}},
    {"number": 11, "par": 5, "strokeIndex": 15, "yardages": {"white": 484, "red": 413}},
    {"number": 12, "par": 4, "strokeIndex": 2, "yardages": {"white": 358, "red": 292}},
    {"number": 13, "par": 3, "strokeIndex": 8, "yardages": {"white": 184, "red": 148}},
    {"number": 14, "par": 5, "strokeIndex": 10, "yardages": {"white": 487, "red": 418}},
    {"number": 15, "par": 4, "strokeIndex": 11, "yardages": {"white": 338, "red": 306}},
    {"number": 16, "par": 5, "strokeIndex": 1, "yardages": {"white": 521, "red": 463}},
    {"number": 17, "par": 3, "strokeIndex": 17, "yardages": {"white": 125, "red": 93}},
    {"number": 18, "par": 4, "strokeIndex": 5, "yardages": {"white": 355, "red": 319}}
  ]'::jsonb,
  '[
    {"name": "White", "color": "white", "courseRating": 72.0, "slopeRating": 132, "totalYardage": 6095},
    {"name": "Red", "color": "red", "courseRating": 73.0, "slopeRating": 134, "totalYardage": 5197}
  ]'::jsonb
)
ON CONFLICT (venue_id, name) DO UPDATE SET
  description = EXCLUDED.description,
  slope_rating = EXCLUDED.slope_rating,
  course_rating = EXCLUDED.course_rating,
  holes = EXCLUDED.holes,
  tees = EXCLUDED.tees;

-- YARRAWONGA MULWALA - LAKE COURSE
INSERT INTO courses (venue_id, name, description, slope_rating, course_rating, holes, tees)
VALUES (
  'f1a2b3c4-d5e6-7890-abcd-600000000004',
  'Lake Course',
  'Parkland style course at Yarrawonga Mulwala Golf Club Resort. The 6th at 381 yards is stroke index 1, with the challenging 17th at 366 yards being stroke index 3. Shorter but more strategic than the Murray course with tighter fairways.',
  126,
  72.0,
  '[
    {"number": 1, "par": 4, "strokeIndex": 11, "yardages": {"white": 335, "red": 302}},
    {"number": 2, "par": 3, "strokeIndex": 13, "yardages": {"white": 151, "red": 120}},
    {"number": 3, "par": 4, "strokeIndex": 7, "yardages": {"white": 359, "red": 323}},
    {"number": 4, "par": 4, "strokeIndex": 9, "yardages": {"white": 334, "red": 264}},
    {"number": 5, "par": 5, "strokeIndex": 15, "yardages": {"white": 464, "red": 417}},
    {"number": 6, "par": 4, "strokeIndex": 1, "yardages": {"white": 381, "red": 360}},
    {"number": 7, "par": 3, "strokeIndex": 16, "yardages": {"white": 119, "red": 107}},
    {"number": 8, "par": 4, "strokeIndex": 14, "yardages": {"white": 283, "red": 248}},
    {"number": 9, "par": 5, "strokeIndex": 17, "yardages": {"white": 432, "red": 403}},
    {"number": 10, "par": 4, "strokeIndex": 2, "yardages": {"white": 374, "red": 302}},
    {"number": 11, "par": 4, "strokeIndex": 5, "yardages": {"white": 346, "red": 302}},
    {"number": 12, "par": 3, "strokeIndex": 8, "yardages": {"white": 173, "red": 133}},
    {"number": 13, "par": 5, "strokeIndex": 4, "yardages": {"white": 531, "red": 406}},
    {"number": 14, "par": 3, "strokeIndex": 10, "yardages": {"white": 156, "red": 109}},
    {"number": 15, "par": 4, "strokeIndex": 12, "yardages": {"white": 322, "red": 285}},
    {"number": 16, "par": 4, "strokeIndex": 6, "yardages": {"white": 375, "red": 348}},
    {"number": 17, "par": 4, "strokeIndex": 3, "yardages": {"white": 366, "red": 324}},
    {"number": 18, "par": 5, "strokeIndex": 18, "yardages": {"white": 456, "red": 405}}
  ]'::jsonb,
  '[
    {"name": "White", "color": "white", "courseRating": 72.0, "slopeRating": 126, "totalYardage": 5957},
    {"name": "Red", "color": "red", "courseRating": 73.0, "slopeRating": 141, "totalYardage": 5158}
  ]'::jsonb
)
ON CONFLICT (venue_id, name) DO UPDATE SET
  description = EXCLUDED.description,
  slope_rating = EXCLUDED.slope_rating,
  course_rating = EXCLUDED.course_rating,
  holes = EXCLUDED.holes,
  tees = EXCLUDED.tees;

-- BAIRNSDALE GOLF CLUB
INSERT INTO courses (venue_id, name, description, slope_rating, course_rating, holes, tees)
VALUES (
  'f1a2b3c4-d5e6-7890-abcd-600000000005',
  'Bairnsdale',
  'Premier East Gippsland course at Eagle Point. The challenging 16th at 454 yards is stroke index 1, with the 6th at 453 yards being stroke index 2. Features parkland and coastal influences with well-bunkered greens throughout.',
  125,
  71.0,
  '[
    {"number": 1, "par": 4, "strokeIndex": 6, "yardages": {"mens": 383, "ladies": 335}},
    {"number": 2, "par": 4, "strokeIndex": 12, "yardages": {"mens": 352, "ladies": 303}},
    {"number": 3, "par": 5, "strokeIndex": 10, "yardages": {"mens": 537, "ladies": 465}},
    {"number": 4, "par": 3, "strokeIndex": 16, "yardages": {"mens": 147, "ladies": 137}},
    {"number": 5, "par": 4, "strokeIndex": 18, "yardages": {"mens": 338, "ladies": 324}},
    {"number": 6, "par": 4, "strokeIndex": 2, "yardages": {"mens": 453, "ladies": 442}},
    {"number": 7, "par": 4, "strokeIndex": 4, "yardages": {"mens": 422, "ladies": 365}},
    {"number": 8, "par": 3, "strokeIndex": 14, "yardages": {"mens": 172, "ladies": 130}},
    {"number": 9, "par": 4, "strokeIndex": 8, "yardages": {"mens": 381, "ladies": 326}},
    {"number": 10, "par": 4, "strokeIndex": 13, "yardages": {"mens": 349, "ladies": 303}},
    {"number": 11, "par": 3, "strokeIndex": 17, "yardages": {"mens": 157, "ladies": 116}},
    {"number": 12, "par": 4, "strokeIndex": 3, "yardages": {"mens": 441, "ladies": 404}},
    {"number": 13, "par": 5, "strokeIndex": 11, "yardages": {"mens": 550, "ladies": 471}},
    {"number": 14, "par": 4, "strokeIndex": 5, "yardages": {"mens": 384, "ladies": 285}},
    {"number": 15, "par": 4, "strokeIndex": 9, "yardages": {"mens": 376, "ladies": 328}},
    {"number": 16, "par": 4, "strokeIndex": 1, "yardages": {"mens": 454, "ladies": 432}},
    {"number": 17, "par": 3, "strokeIndex": 7, "yardages": {"mens": 213, "ladies": 160}},
    {"number": 18, "par": 5, "strokeIndex": 15, "yardages": {"mens": 490, "ladies": 390}}
  ]'::jsonb,
  '[
    {"name": "Mens", "color": "white", "courseRating": 71.0, "slopeRating": 125, "totalYardage": 6599},
    {"name": "Ladies", "color": "red", "courseRating": 73.0, "slopeRating": 128, "totalYardage": 5716}
  ]'::jsonb
)
ON CONFLICT (venue_id, name) DO UPDATE SET
  description = EXCLUDED.description,
  slope_rating = EXCLUDED.slope_rating,
  course_rating = EXCLUDED.course_rating,
  holes = EXCLUDED.holes,
  tees = EXCLUDED.tees;

-- SALE GOLF CLUB
INSERT INTO courses (venue_id, name, description, slope_rating, course_rating, holes, tees)
VALUES (
  'f1a2b3c4-d5e6-7890-abcd-600000000006',
  'Sale',
  'Par 70 layout in central Gippsland. The 12th at 430 yards is stroke index 1, with the demanding 2nd at 435 yards being stroke index 2. Three tee options with good variety of hole lengths. Well-maintained parkland course.',
  120,
  70.0,
  '[
    {"number": 1, "par": 5, "strokeIndex": 14, "yardages": {"white": 502, "yellow": 486, "red": 421}},
    {"number": 2, "par": 4, "strokeIndex": 2, "yardages": {"white": 435, "yellow": 423, "red": 413}},
    {"number": 3, "par": 3, "strokeIndex": 10, "yardages": {"white": 201, "yellow": 186, "red": 165}},
    {"number": 4, "par": 4, "strokeIndex": 12, "yardages": {"white": 302, "yellow": 297, "red": 281}},
    {"number": 5, "par": 4, "strokeIndex": 4, "yardages": {"white": 438, "yellow": 431, "red": 425}},
    {"number": 6, "par": 4, "strokeIndex": 8, "yardages": {"white": 384, "yellow": 327, "red": 314}},
    {"number": 7, "par": 4, "strokeIndex": 18, "yardages": {"white": 335, "yellow": 318, "red": 279}},
    {"number": 8, "par": 4, "strokeIndex": 16, "yardages": {"white": 309, "yellow": 292, "red": 281}},
    {"number": 9, "par": 4, "strokeIndex": 6, "yardages": {"white": 426, "yellow": 381, "red": 335}},
    {"number": 10, "par": 4, "strokeIndex": 5, "yardages": {"white": 417, "yellow": 392, "red": 347}},
    {"number": 11, "par": 3, "strokeIndex": 15, "yardages": {"white": 154, "yellow": 144, "red": 134}},
    {"number": 12, "par": 4, "strokeIndex": 1, "yardages": {"white": 430, "yellow": 380, "red": 369}},
    {"number": 13, "par": 4, "strokeIndex": 3, "yardages": {"white": 373, "yellow": 362, "red": 304}},
    {"number": 14, "par": 3, "strokeIndex": 17, "yardages": {"white": 168, "yellow": 160, "red": 147}},
    {"number": 15, "par": 4, "strokeIndex": 9, "yardages": {"white": 384, "yellow": 355, "red": 343}},
    {"number": 16, "par": 5, "strokeIndex": 11, "yardages": {"white": 555, "yellow": 538, "red": 499}},
    {"number": 17, "par": 3, "strokeIndex": 13, "yardages": {"white": 116, "yellow": 112, "red": 109}},
    {"number": 18, "par": 4, "strokeIndex": 7, "yardages": {"white": 372, "yellow": 360, "red": 322}}
  ]'::jsonb,
  '[
    {"name": "White", "color": "white", "courseRating": 70.0, "slopeRating": 120, "totalYardage": 6301},
    {"name": "Yellow", "color": "yellow", "courseRating": 68.5, "slopeRating": 116, "totalYardage": 5944},
    {"name": "Red", "color": "red", "courseRating": 72.0, "slopeRating": 122, "totalYardage": 5488}
  ]'::jsonb
)
ON CONFLICT (venue_id, name) DO UPDATE SET
  description = EXCLUDED.description,
  slope_rating = EXCLUDED.slope_rating,
  course_rating = EXCLUDED.course_rating,
  holes = EXCLUDED.holes,
  tees = EXCLUDED.tees;

-- TRARALGON GOLF CLUB
INSERT INTO courses (venue_id, name, description, slope_rating, course_rating, holes, tees)
VALUES (
  'f1a2b3c4-d5e6-7890-abcd-600000000007',
  'Traralgon',
  'Traditional parkland course in central Gippsland. The long 7th par 5 at 532 yards is stroke index 1, with the 14th at 367 yards being stroke index 2. Features three par 5s on the front nine for scoring opportunities.',
  118,
  72.0,
  '[
    {"number": 1, "par": 4, "strokeIndex": 11, "yardages": {"black": 352}},
    {"number": 2, "par": 5, "strokeIndex": 5, "yardages": {"black": 478}},
    {"number": 3, "par": 4, "strokeIndex": 8, "yardages": {"black": 346}},
    {"number": 4, "par": 4, "strokeIndex": 16, "yardages": {"black": 298}},
    {"number": 5, "par": 3, "strokeIndex": 17, "yardages": {"black": 133}},
    {"number": 6, "par": 5, "strokeIndex": 15, "yardages": {"black": 444}},
    {"number": 7, "par": 5, "strokeIndex": 1, "yardages": {"black": 532}},
    {"number": 8, "par": 3, "strokeIndex": 14, "yardages": {"black": 165}},
    {"number": 9, "par": 4, "strokeIndex": 13, "yardages": {"black": 318}},
    {"number": 10, "par": 3, "strokeIndex": 7, "yardages": {"black": 206}},
    {"number": 11, "par": 4, "strokeIndex": 4, "yardages": {"black": 377}},
    {"number": 12, "par": 4, "strokeIndex": 12, "yardages": {"black": 305}},
    {"number": 13, "par": 4, "strokeIndex": 6, "yardages": {"black": 332}},
    {"number": 14, "par": 4, "strokeIndex": 2, "yardages": {"black": 367}},
    {"number": 15, "par": 3, "strokeIndex": 9, "yardages": {"black": 151}},
    {"number": 16, "par": 5, "strokeIndex": 18, "yardages": {"black": 454}},
    {"number": 17, "par": 4, "strokeIndex": 3, "yardages": {"black": 365}},
    {"number": 18, "par": 4, "strokeIndex": 10, "yardages": {"black": 316}}
  ]'::jsonb,
  '[
    {"name": "Black", "color": "black", "courseRating": 72.0, "slopeRating": 118, "totalYardage": 5939}
  ]'::jsonb
)
ON CONFLICT (venue_id, name) DO UPDATE SET
  description = EXCLUDED.description,
  slope_rating = EXCLUDED.slope_rating,
  course_rating = EXCLUDED.course_rating,
  holes = EXCLUDED.holes,
  tees = EXCLUDED.tees;

-- LAKES ENTRANCE GOLF CLUB
-- Designed by H. Vernon Morcom (1958), Ted Parslow and Geoff Parslow
INSERT INTO courses (venue_id, name, description, slope_rating, course_rating, holes, tees)
VALUES (
  'f1a2b3c4-d5e6-7890-abcd-600000000008',
  'Lakes Entrance',
  'Established 1926, redesigned by H. Vernon Morcom, Ted Parslow and Geoff Parslow (1958). The 7th at 457 yards is stroke index 1, with the 12th at 449 yards being stroke index 2. Features stunning views of the Gippsland Lakes. Four tee options.',
  129,
  72.7,
  '[
    {"number": 1, "par": 4, "strokeIndex": 5, "yardages": {"blue": 410, "white": 396, "yellow": 340, "red": 331}},
    {"number": 2, "par": 4, "strokeIndex": 7, "yardages": {"blue": 417, "white": 414, "yellow": 354, "red": 349}},
    {"number": 3, "par": 3, "strokeIndex": 17, "yardages": {"blue": 176, "white": 172, "yellow": 156, "red": 153}},
    {"number": 4, "par": 4, "strokeIndex": 3, "yardages": {"blue": 435, "white": 428, "yellow": 337, "red": 332}},
    {"number": 5, "par": 5, "strokeIndex": 9, "yardages": {"blue": 509, "white": 501, "yellow": 460, "red": 448}},
    {"number": 6, "par": 3, "strokeIndex": 11, "yardages": {"blue": 201, "white": 177, "yellow": 171, "red": 164}},
    {"number": 7, "par": 4, "strokeIndex": 1, "yardages": {"blue": 457, "white": 449, "yellow": 442, "red": 452}},
    {"number": 8, "par": 4, "strokeIndex": 15, "yardages": {"blue": 307, "white": 294, "yellow": 287, "red": 285}},
    {"number": 9, "par": 5, "strokeIndex": 13, "yardages": {"blue": 502, "white": 486, "yellow": 397, "red": 389}},
    {"number": 10, "par": 4, "strokeIndex": 6, "yardages": {"blue": 386, "white": 376, "yellow": 347, "red": 338}},
    {"number": 11, "par": 3, "strokeIndex": 16, "yardages": {"blue": 177, "white": 168, "yellow": 137, "red": 130}},
    {"number": 12, "par": 4, "strokeIndex": 2, "yardages": {"blue": 449, "white": 443, "yellow": 420, "red": 416}},
    {"number": 13, "par": 5, "strokeIndex": 8, "yardages": {"blue": 501, "white": 491, "yellow": 393, "red": 386}},
    {"number": 14, "par": 5, "strokeIndex": 4, "yardages": {"blue": 557, "white": 548, "yellow": 440, "red": 432}},
    {"number": 15, "par": 3, "strokeIndex": 18, "yardages": {"blue": 150, "white": 135, "yellow": 109, "red": 102}},
    {"number": 16, "par": 4, "strokeIndex": 12, "yardages": {"blue": 358, "white": 342, "yellow": 325, "red": 302}},
    {"number": 17, "par": 4, "strokeIndex": 14, "yardages": {"blue": 335, "white": 331, "yellow": 328, "red": 323}},
    {"number": 18, "par": 4, "strokeIndex": 10, "yardages": {"blue": 349, "white": 339, "yellow": 336, "red": 331}}
  ]'::jsonb,
  '[
    {"name": "Blue", "color": "blue", "courseRating": 72.7, "slopeRating": 129, "totalYardage": 6676},
    {"name": "White", "color": "white", "courseRating": 71.8, "slopeRating": 125, "totalYardage": 6490},
    {"name": "Yellow", "color": "yellow", "courseRating": 67.9, "slopeRating": 116, "totalYardage": 5779},
    {"name": "Red", "color": "red", "courseRating": 73.1, "slopeRating": 123, "totalYardage": 5663}
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
-- This migration adds 8 new venues and 12 courses to the database:
-- - Black Bull Golf Course (1 course)
-- - Cobram Barooga Golf Club (2 courses: Old, West)
-- - Rich River Golf Club Resort (2 courses: East, West)
-- - Yarrawonga Mulwala Golf Club Resort (2 courses: Murray, Lake)
-- - Bairnsdale Golf Club (1 course)
-- - Sale Golf Club (1 course)
-- - Traralgon Golf Club (1 course)
-- - Lakes Entrance Golf Club (1 course)
-- Regional Gippsland & Murray coverage significantly improved
-- =====================================================
