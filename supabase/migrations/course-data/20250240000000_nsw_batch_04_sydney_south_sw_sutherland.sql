-- =====================================================
-- Migration: nsw_batch_04_sydney_south_sw_sutherland
-- Description: Add Sydney South, South West & Sutherland golf venues and courses
--              Part of NSW golf course data collection
-- Date: 2025-12-10
-- Batch: 4 of 7 (Sydney South, South West & Sutherland)
-- =====================================================

-- =====================================================
-- STEP 1: INSERT NEW VENUES
-- Using ON CONFLICT to handle re-runs safely
-- =====================================================

-- Liverpool Golf Club (Oak Point)
INSERT INTO venues (id, source, name, state, city, address, phone, website, total_holes)
VALUES (
  'f2a3b4c5-d6e7-8901-abcd-200000000301',
  'manual',
  'Liverpool Golf Club',
  'NSW',
  'Lansvale',
  '198-228 Hollywood Drive, Lansvale NSW 2166',
  '+61 2 9727 2422',
  'https://www.liverpoolgolf.com.au',
  18
)
ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name,
  address = EXCLUDED.address,
  phone = EXCLUDED.phone,
  website = EXCLUDED.website;

-- Camden Golf Club
INSERT INTO venues (id, source, name, state, city, address, phone, website, total_holes)
VALUES (
  'f2a3b4c5-d6e7-8901-abcd-200000000302',
  'manual',
  'Camden Golf Club',
  'NSW',
  'Narellan',
  '50 Lodges Road, Narellan NSW 2567',
  '+61 2 4646 1144',
  'https://www.camdengolf.com.au',
  18
)
ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name,
  address = EXCLUDED.address,
  phone = EXCLUDED.phone,
  website = EXCLUDED.website;

-- Cronulla Golf Club
INSERT INTO venues (id, source, name, state, city, address, phone, website, total_holes)
VALUES (
  'f2a3b4c5-d6e7-8901-abcd-200000000303',
  'manual',
  'Cronulla Golf Club',
  'NSW',
  'Cronulla',
  'Cronulla Park, Cronulla NSW 2230',
  '+61 2 9523 1122',
  'https://www.cronullagolf.com.au',
  18
)
ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name,
  address = EXCLUDED.address,
  phone = EXCLUDED.phone,
  website = EXCLUDED.website;

-- Kogarah Golf Club
INSERT INTO venues (id, source, name, state, city, address, phone, website, total_holes)
VALUES (
  'f2a3b4c5-d6e7-8901-abcd-200000000304',
  'manual',
  'Kogarah Golf Club',
  'NSW',
  'Arncliffe',
  '19 Marsh Street, Arncliffe NSW 2205',
  '+61 2 9567 0334',
  'https://www.kogarahgolfclub.com.au',
  18
)
ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name,
  address = EXCLUDED.address,
  phone = EXCLUDED.phone,
  website = EXCLUDED.website;

-- Georges River Golf Course
INSERT INTO venues (id, source, name, state, city, address, phone, website, total_holes)
VALUES (
  'f2a3b4c5-d6e7-8901-abcd-200000000305',
  'manual',
  'Georges River Golf Course',
  'NSW',
  'Georges Hall',
  '255-284 Henry Lawson Drive, Georges Hall NSW 2198',
  '+61 2 9724 1615',
  'https://www.georgesrivergolf.com.au',
  18
)
ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name,
  address = EXCLUDED.address,
  phone = EXCLUDED.phone,
  website = EXCLUDED.website;

-- Campbelltown Golf Club
INSERT INTO venues (id, source, name, state, city, address, phone, website, total_holes)
VALUES (
  'f2a3b4c5-d6e7-8901-abcd-200000000306',
  'manual',
  'Campbelltown Golf Club',
  'NSW',
  'Glen Alpine',
  '1 Golf Course Drive, Glen Alpine NSW 2560',
  '+61 2 4625 1442',
  'https://www.campbelltowngolf.com.au',
  18
)
ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name,
  address = EXCLUDED.address,
  phone = EXCLUDED.phone,
  website = EXCLUDED.website;

-- Woolooware Golf Club
INSERT INTO venues (id, source, name, state, city, address, phone, website, total_holes)
VALUES (
  'f2a3b4c5-d6e7-8901-abcd-200000000307',
  'manual',
  'Woolooware Golf Club',
  'NSW',
  'Woolooware',
  'Burraneer Bay Road, Woolooware NSW 2230',
  '+61 2 9527 3788',
  'https://www.wooloowaregolfclub.com.au',
  18
)
ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name,
  address = EXCLUDED.address,
  phone = EXCLUDED.phone,
  website = EXCLUDED.website;

-- Kareela Golf Club
INSERT INTO venues (id, source, name, state, city, address, phone, website, total_holes)
VALUES (
  'f2a3b4c5-d6e7-8901-abcd-200000000308',
  'manual',
  'Kareela Golf Club',
  'NSW',
  'Kareela',
  '1 Bates Drive, Kareela NSW 2232',
  '+61 2 9521 6279',
  'https://www.kareelagolfclub.com.au',
  18
)
ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name,
  address = EXCLUDED.address,
  phone = EXCLUDED.phone,
  website = EXCLUDED.website;

-- Bankstown Golf Club
INSERT INTO venues (id, source, name, state, city, address, phone, website, total_holes)
VALUES (
  'f2a3b4c5-d6e7-8901-abcd-200000000309',
  'manual',
  'Bankstown Golf Club',
  'NSW',
  'Milperra',
  '70 Ashford Avenue, Milperra NSW 2214',
  '+61 2 9774 1658',
  'https://www.bankstowngolf.com.au',
  18
)
ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name,
  address = EXCLUDED.address,
  phone = EXCLUDED.phone,
  website = EXCLUDED.website;

-- Camden Lakeside Golf Club
INSERT INTO venues (id, source, name, state, city, address, phone, website, total_holes)
VALUES (
  'f2a3b4c5-d6e7-8901-abcd-200000000310',
  'manual',
  'Camden Lakeside Golf Club',
  'NSW',
  'Catherine Field',
  '50 Raby Road, Catherine Field NSW 2171',
  '+61 2 9606 4333',
  'https://www.lakesidegolf.com.au',
  18
)
ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name,
  address = EXCLUDED.address,
  phone = EXCLUDED.phone,
  website = EXCLUDED.website;

-- Hurstville Golf Course
INSERT INTO venues (id, source, name, state, city, address, phone, website, total_holes)
VALUES (
  'f2a3b4c5-d6e7-8901-abcd-200000000311',
  'manual',
  'Hurstville Golf Club',
  'NSW',
  'Peakhurst',
  'Lorraine Street, Peakhurst NSW 2210',
  '+61 2 9153 7500',
  'https://www.hurstvillegolfclub.com.au',
  18
)
ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name,
  address = EXCLUDED.address,
  phone = EXCLUDED.phone,
  website = EXCLUDED.website;

-- Beverley Park Golf Club
INSERT INTO venues (id, source, name, state, city, address, phone, website, total_holes)
VALUES (
  'f2a3b4c5-d6e7-8901-abcd-200000000312',
  'manual',
  'Beverley Park Golf Club',
  'NSW',
  'Beverly Park',
  '87A Jubilee Avenue, Beverly Park NSW 2217',
  '+61 2 9579 1212',
  'https://www.bpgc.com.au',
  18
)
ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name,
  address = EXCLUDED.address,
  phone = EXCLUDED.phone,
  website = EXCLUDED.website;

-- Ryde-Parramatta Golf Club
INSERT INTO venues (id, source, name, state, city, address, phone, website, total_holes)
VALUES (
  'f2a3b4c5-d6e7-8901-abcd-200000000313',
  'manual',
  'Ryde-Parramatta Golf Club',
  'NSW',
  'West Ryde',
  '1156 Victoria Road, West Ryde NSW 2114',
  '+61 2 9874 1133',
  'https://www.rydeparramatta.com.au',
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

-- LIVERPOOL GOLF CLUB (OAK POINT)
INSERT INTO courses (venue_id, name, description, slope_rating, course_rating, holes, tees)
VALUES (
  'f2a3b4c5-d6e7-8901-abcd-200000000301',
  'Oak Point',
  'Private 18-hole parkland course built in 1971 featuring heavily bunkered, tree-lined fairways with water hazards. Easy walking with well-maintained conditions.',
  139,
  72.0,
  '[
    {"number": 1, "par": 4, "strokeIndex": 11, "yardages": {"blue": 350, "orange": 335, "red": 305}},
    {"number": 2, "par": 4, "strokeIndex": 5, "yardages": {"blue": 385, "orange": 370, "red": 340}},
    {"number": 3, "par": 3, "strokeIndex": 15, "yardages": {"blue": 165, "orange": 155, "red": 140}},
    {"number": 4, "par": 5, "strokeIndex": 1, "yardages": {"blue": 510, "orange": 490, "red": 460}},
    {"number": 5, "par": 4, "strokeIndex": 7, "yardages": {"blue": 380, "orange": 365, "red": 335}},
    {"number": 6, "par": 4, "strokeIndex": 9, "yardages": {"blue": 345, "orange": 330, "red": 305}},
    {"number": 7, "par": 3, "strokeIndex": 17, "yardages": {"blue": 145, "orange": 135, "red": 120}},
    {"number": 8, "par": 5, "strokeIndex": 3, "yardages": {"blue": 505, "orange": 485, "red": 455}},
    {"number": 9, "par": 4, "strokeIndex": 13, "yardages": {"blue": 340, "orange": 325, "red": 300}},
    {"number": 10, "par": 4, "strokeIndex": 4, "yardages": {"blue": 395, "orange": 380, "red": 350}},
    {"number": 11, "par": 3, "strokeIndex": 16, "yardages": {"blue": 160, "orange": 150, "red": 135}},
    {"number": 12, "par": 4, "strokeIndex": 10, "yardages": {"blue": 355, "orange": 340, "red": 315}},
    {"number": 13, "par": 5, "strokeIndex": 2, "yardages": {"blue": 520, "orange": 500, "red": 470}},
    {"number": 14, "par": 4, "strokeIndex": 8, "yardages": {"blue": 370, "orange": 355, "red": 325}},
    {"number": 15, "par": 3, "strokeIndex": 14, "yardages": {"blue": 175, "orange": 160, "red": 145}},
    {"number": 16, "par": 4, "strokeIndex": 6, "yardages": {"blue": 385, "orange": 370, "red": 340}},
    {"number": 17, "par": 4, "strokeIndex": 12, "yardages": {"blue": 350, "orange": 335, "red": 310}},
    {"number": 18, "par": 5, "strokeIndex": 18, "yardages": {"blue": 485, "orange": 465, "red": 435}}
  ]'::jsonb,
  '[
    {"name": "Blue", "color": "blue", "courseRating": 72.0, "slopeRating": 139, "totalYardage": 6312},
    {"name": "Orange", "color": "orange", "courseRating": 72.0, "slopeRating": 133, "totalYardage": 6055},
    {"name": "Red", "color": "red", "courseRating": 74.0, "slopeRating": 134, "totalYardage": 5476}
  ]'::jsonb
)
ON CONFLICT (venue_id, name) DO UPDATE SET
  description = EXCLUDED.description,
  slope_rating = EXCLUDED.slope_rating,
  course_rating = EXCLUDED.course_rating,
  holes = EXCLUDED.holes,
  tees = EXCLUDED.tees;

-- CAMDEN GOLF CLUB
INSERT INTO courses (venue_id, name, description, slope_rating, course_rating, holes, tees)
VALUES (
  'f2a3b4c5-d6e7-8901-abcd-200000000302',
  'Camden',
  'Eric Apperly designed parkland course built in 1933. Par 71 layout with bent grass greens and couch grass fairways, featuring multiple tee options for all skill levels.',
  117,
  70.0,
  '[
    {"number": 1, "par": 4, "strokeIndex": 10, "yardages": {"black": 355, "blue": 336, "white": 307, "red": 313}},
    {"number": 2, "par": 4, "strokeIndex": 12, "yardages": {"black": 288, "blue": 282, "white": 264, "red": 290}},
    {"number": 3, "par": 3, "strokeIndex": 9, "yardages": {"black": 156, "blue": 152, "white": 147, "red": 150}},
    {"number": 4, "par": 5, "strokeIndex": 7, "yardages": {"black": 520, "blue": 509, "white": 488, "red": 493}},
    {"number": 5, "par": 4, "strokeIndex": 3, "yardages": {"black": 362, "blue": 343, "white": 282, "red": 316}},
    {"number": 6, "par": 3, "strokeIndex": 17, "yardages": {"black": 153, "blue": 139, "white": 131, "red": 135}},
    {"number": 7, "par": 4, "strokeIndex": 5, "yardages": {"black": 388, "blue": 363, "white": 360, "red": 370}},
    {"number": 8, "par": 5, "strokeIndex": 14, "yardages": {"black": 462, "blue": 449, "white": 456, "red": 399}},
    {"number": 9, "par": 4, "strokeIndex": 16, "yardages": {"black": 259, "blue": 253, "white": 175, "red": 241}},
    {"number": 10, "par": 4, "strokeIndex": 8, "yardages": {"black": 351, "blue": 339, "white": 325, "red": 330}},
    {"number": 11, "par": 4, "strokeIndex": 6, "yardages": {"black": 351, "blue": 345, "white": 345, "red": 348}},
    {"number": 12, "par": 3, "strokeIndex": 18, "yardages": {"black": 224, "blue": 209, "white": 258, "red": 261}},
    {"number": 13, "par": 4, "strokeIndex": 2, "yardages": {"black": 341, "blue": 337, "white": 293, "red": 292}},
    {"number": 14, "par": 4, "strokeIndex": 4, "yardages": {"black": 371, "blue": 361, "white": 335, "red": 359}},
    {"number": 15, "par": 4, "strokeIndex": 11, "yardages": {"black": 380, "blue": 369, "white": 331, "red": 330}},
    {"number": 16, "par": 3, "strokeIndex": 15, "yardages": {"black": 159, "blue": 153, "white": 142, "red": 99}},
    {"number": 17, "par": 5, "strokeIndex": 13, "yardages": {"black": 494, "blue": 484, "white": 404, "red": 408}},
    {"number": 18, "par": 4, "strokeIndex": 1, "yardages": {"black": 249, "blue": 245, "white": 236, "red": 240}}
  ]'::jsonb,
  '[
    {"name": "Black", "color": "black", "courseRating": 70.0, "slopeRating": 120, "totalYardage": 5863},
    {"name": "Blue", "color": "blue", "courseRating": 69.0, "slopeRating": 118, "totalYardage": 5668},
    {"name": "White", "color": "white", "courseRating": 70.0, "slopeRating": 117, "totalYardage": 5279},
    {"name": "Red", "color": "red", "courseRating": 73.0, "slopeRating": 125, "totalYardage": 5374}
  ]'::jsonb
)
ON CONFLICT (venue_id, name) DO UPDATE SET
  description = EXCLUDED.description,
  slope_rating = EXCLUDED.slope_rating,
  course_rating = EXCLUDED.course_rating,
  holes = EXCLUDED.holes,
  tees = EXCLUDED.tees;

-- CRONULLA GOLF CLUB
INSERT INTO courses (venue_id, name, description, slope_rating, course_rating, holes, tees)
VALUES (
  'f2a3b4c5-d6e7-8901-abcd-200000000303',
  'Cronulla',
  'Private members-only parkland course opened in 1923 in Sydney''s beachside Sutherland Shire. Tree-lined fairways, water hazards and plenty of bunkers provide a challenging round.',
  126,
  70.0,
  '[
    {"number": 1, "par": 4, "strokeIndex": 10, "yardages": {"white": 326, "red": 300}},
    {"number": 2, "par": 4, "strokeIndex": 12, "yardages": {"white": 330, "red": 300}},
    {"number": 3, "par": 5, "strokeIndex": 8, "yardages": {"white": 476, "red": 445}},
    {"number": 4, "par": 4, "strokeIndex": 4, "yardages": {"white": 387, "red": 360}},
    {"number": 5, "par": 3, "strokeIndex": 17, "yardages": {"white": 142, "red": 130}},
    {"number": 6, "par": 4, "strokeIndex": 16, "yardages": {"white": 277, "red": 260}},
    {"number": 7, "par": 3, "strokeIndex": 18, "yardages": {"white": 126, "red": 115}},
    {"number": 8, "par": 4, "strokeIndex": 3, "yardages": {"white": 375, "red": 350}},
    {"number": 9, "par": 4, "strokeIndex": 6, "yardages": {"white": 342, "red": 320}},
    {"number": 10, "par": 4, "strokeIndex": 1, "yardages": {"white": 387, "red": 365}},
    {"number": 11, "par": 4, "strokeIndex": 11, "yardages": {"white": 357, "red": 335}},
    {"number": 12, "par": 4, "strokeIndex": 13, "yardages": {"white": 353, "red": 330}},
    {"number": 13, "par": 4, "strokeIndex": 5, "yardages": {"white": 371, "red": 350}},
    {"number": 14, "par": 4, "strokeIndex": 2, "yardages": {"white": 364, "red": 340}},
    {"number": 15, "par": 3, "strokeIndex": 9, "yardages": {"white": 185, "red": 170}},
    {"number": 16, "par": 5, "strokeIndex": 15, "yardages": {"white": 469, "red": 445}},
    {"number": 17, "par": 4, "strokeIndex": 7, "yardages": {"white": 327, "red": 305}},
    {"number": 18, "par": 3, "strokeIndex": 14, "yardages": {"white": 149, "red": 135}}
  ]'::jsonb,
  '[
    {"name": "White", "color": "white", "courseRating": 70.0, "slopeRating": 126, "totalYardage": 5743},
    {"name": "Red", "color": "red", "courseRating": 72.0, "slopeRating": 128, "totalYardage": 5355}
  ]'::jsonb
)
ON CONFLICT (venue_id, name) DO UPDATE SET
  description = EXCLUDED.description,
  slope_rating = EXCLUDED.slope_rating,
  course_rating = EXCLUDED.course_rating,
  holes = EXCLUDED.holes,
  tees = EXCLUDED.tees;

-- KOGARAH GOLF CLUB
INSERT INTO courses (venue_id, name, description, slope_rating, course_rating, holes, tees)
VALUES (
  'f2a3b4c5-d6e7-8901-abcd-200000000304',
  'Kogarah',
  'Championship parkland course established in 1928, located only 15 minutes from Sydney CBD and 2 minutes from the airport. Features bent grass greens and kikuyu fairways. Welcomes social golfers seven days per week.',
  128,
  72.0,
  '[
    {"number": 1, "par": 4, "strokeIndex": 8, "yardages": {"blue": 332, "red": 342}},
    {"number": 2, "par": 4, "strokeIndex": 17, "yardages": {"blue": 381, "red": 369}},
    {"number": 3, "par": 5, "strokeIndex": 7, "yardages": {"blue": 411, "red": 364}},
    {"number": 4, "par": 4, "strokeIndex": 11, "yardages": {"blue": 343, "red": 324}},
    {"number": 5, "par": 3, "strokeIndex": 16, "yardages": {"blue": 139, "red": 155}},
    {"number": 6, "par": 3, "strokeIndex": 6, "yardages": {"blue": 130, "red": 137}},
    {"number": 7, "par": 4, "strokeIndex": 15, "yardages": {"blue": 338, "red": 290}},
    {"number": 8, "par": 3, "strokeIndex": 1, "yardages": {"blue": 131, "red": 93}},
    {"number": 9, "par": 4, "strokeIndex": 12, "yardages": {"blue": 381, "red": 343}},
    {"number": 10, "par": 3, "strokeIndex": 10, "yardages": {"blue": 181, "red": 150}},
    {"number": 11, "par": 4, "strokeIndex": 13, "yardages": {"blue": 278, "red": 343}},
    {"number": 12, "par": 3, "strokeIndex": 4, "yardages": {"blue": 135, "red": 125}},
    {"number": 13, "par": 3, "strokeIndex": 18, "yardages": {"blue": 177, "red": 164}},
    {"number": 14, "par": 4, "strokeIndex": 5, "yardages": {"blue": 330, "red": 273}},
    {"number": 15, "par": 4, "strokeIndex": 9, "yardages": {"blue": 373, "red": 362}},
    {"number": 16, "par": 4, "strokeIndex": 2, "yardages": {"blue": 363, "red": 311}},
    {"number": 17, "par": 5, "strokeIndex": 14, "yardages": {"blue": 466, "red": 426}},
    {"number": 18, "par": 4, "strokeIndex": 3, "yardages": {"blue": 355, "red": 345}}
  ]'::jsonb,
  '[
    {"name": "Blue", "color": "blue", "courseRating": 72.0, "slopeRating": 128, "totalYardage": 5244},
    {"name": "Red", "color": "red", "courseRating": 71.0, "slopeRating": 125, "totalYardage": 4916}
  ]'::jsonb
)
ON CONFLICT (venue_id, name) DO UPDATE SET
  description = EXCLUDED.description,
  slope_rating = EXCLUDED.slope_rating,
  course_rating = EXCLUDED.course_rating,
  holes = EXCLUDED.holes,
  tees = EXCLUDED.tees;

-- GEORGES RIVER GOLF COURSE
INSERT INTO courses (venue_id, name, description, slope_rating, course_rating, holes, tees)
VALUES (
  'f2a3b4c5-d6e7-8901-abcd-200000000305',
  'Georges River',
  'Public 18-hole parkland course built in 1939 on Henry Lawson Drive. Features open fairways with a range of par 3s, 4s and 5s that challenge long hitters. Includes a 7-day-a-week driving range.',
  116,
  69.0,
  '[
    {"number": 1, "par": 4, "strokeIndex": 1, "yardages": {"blue": 375, "white": 353, "red": 335}},
    {"number": 2, "par": 4, "strokeIndex": 5, "yardages": {"blue": 379, "white": 339, "red": 327}},
    {"number": 3, "par": 3, "strokeIndex": 16, "yardages": {"blue": 132, "white": 126, "red": 121}},
    {"number": 4, "par": 5, "strokeIndex": 8, "yardages": {"blue": 510, "white": 480, "red": 358}},
    {"number": 5, "par": 3, "strokeIndex": 10, "yardages": {"blue": 191, "white": 147, "red": 174}},
    {"number": 6, "par": 5, "strokeIndex": 13, "yardages": {"blue": 465, "white": 425, "red": 385}},
    {"number": 7, "par": 5, "strokeIndex": 18, "yardages": {"blue": 408, "white": 399, "red": 391}},
    {"number": 8, "par": 4, "strokeIndex": 4, "yardages": {"blue": 367, "white": 338, "red": 294}},
    {"number": 9, "par": 3, "strokeIndex": 15, "yardages": {"blue": 147, "white": 128, "red": 117}},
    {"number": 10, "par": 4, "strokeIndex": 3, "yardages": {"blue": 382, "white": 339, "red": 322}},
    {"number": 11, "par": 4, "strokeIndex": 7, "yardages": {"blue": 339, "white": 314, "red": 299}},
    {"number": 12, "par": 3, "strokeIndex": 9, "yardages": {"blue": 174, "white": 152, "red": 144}},
    {"number": 13, "par": 4, "strokeIndex": 6, "yardages": {"blue": 378, "white": 361, "red": 333}},
    {"number": 14, "par": 3, "strokeIndex": 17, "yardages": {"blue": 169, "white": 159, "red": 147}},
    {"number": 15, "par": 4, "strokeIndex": 14, "yardages": {"blue": 287, "white": 283, "red": 277}},
    {"number": 16, "par": 3, "strokeIndex": 12, "yardages": {"blue": 153, "white": 141, "red": 103}},
    {"number": 17, "par": 5, "strokeIndex": 11, "yardages": {"blue": 446, "white": 426, "red": 406}},
    {"number": 18, "par": 4, "strokeIndex": 2, "yardages": {"blue": 390, "white": 379, "red": 371}}
  ]'::jsonb,
  '[
    {"name": "Blue", "color": "blue", "courseRating": 69.0, "slopeRating": 116, "totalYardage": 5692},
    {"name": "White", "color": "white", "courseRating": 67.0, "slopeRating": 115, "totalYardage": 5289},
    {"name": "Red", "color": "red", "courseRating": 71.0, "slopeRating": 119, "totalYardage": 4904}
  ]'::jsonb
)
ON CONFLICT (venue_id, name) DO UPDATE SET
  description = EXCLUDED.description,
  slope_rating = EXCLUDED.slope_rating,
  course_rating = EXCLUDED.course_rating,
  holes = EXCLUDED.holes,
  tees = EXCLUDED.tees;

-- CAMPBELLTOWN GOLF CLUB
INSERT INTO courses (venue_id, name, description, slope_rating, course_rating, holes, tees)
VALUES (
  'f2a3b4c5-d6e7-8901-abcd-200000000306',
  'Campbelltown',
  'Bob Harrison designed 18-hole championship course winding over hilly terrain. Features heavy bunkering, tree-lined fairways, and a picturesque lake on the challenging final hole.',
  126,
  70.0,
  '[
    {"number": 1, "par": 4, "strokeIndex": 9, "yardages": {"comp": 314, "forward": 275}},
    {"number": 2, "par": 4, "strokeIndex": 3, "yardages": {"comp": 381, "forward": 350}},
    {"number": 3, "par": 5, "strokeIndex": 13, "yardages": {"comp": 480, "forward": 448}},
    {"number": 4, "par": 3, "strokeIndex": 15, "yardages": {"comp": 127, "forward": 95}},
    {"number": 5, "par": 4, "strokeIndex": 4, "yardages": {"comp": 353, "forward": 306}},
    {"number": 6, "par": 3, "strokeIndex": 17, "yardages": {"comp": 151, "forward": 132}},
    {"number": 7, "par": 5, "strokeIndex": 5, "yardages": {"comp": 478, "forward": 429}},
    {"number": 8, "par": 4, "strokeIndex": 6, "yardages": {"comp": 332, "forward": 305}},
    {"number": 9, "par": 4, "strokeIndex": 8, "yardages": {"comp": 351, "forward": 332}},
    {"number": 10, "par": 4, "strokeIndex": 12, "yardages": {"comp": 327, "forward": 313}},
    {"number": 11, "par": 4, "strokeIndex": 2, "yardages": {"comp": 387, "forward": 375}},
    {"number": 12, "par": 3, "strokeIndex": 11, "yardages": {"comp": 157, "forward": 124}},
    {"number": 13, "par": 5, "strokeIndex": 14, "yardages": {"comp": 452, "forward": 433}},
    {"number": 14, "par": 3, "strokeIndex": 16, "yardages": {"comp": 132, "forward": 110}},
    {"number": 15, "par": 4, "strokeIndex": 10, "yardages": {"comp": 331, "forward": 305}},
    {"number": 16, "par": 4, "strokeIndex": 18, "yardages": {"comp": 300, "forward": 310}},
    {"number": 17, "par": 3, "strokeIndex": 7, "yardages": {"comp": 187, "forward": 168}},
    {"number": 18, "par": 4, "strokeIndex": 1, "yardages": {"comp": 369, "forward": 295}}
  ]'::jsonb,
  '[
    {"name": "Competition", "color": "black", "courseRating": 70.0, "slopeRating": 126, "totalYardage": 5609},
    {"name": "Forward", "color": "red", "courseRating": 68.0, "slopeRating": 104, "totalYardage": 5105}
  ]'::jsonb
)
ON CONFLICT (venue_id, name) DO UPDATE SET
  description = EXCLUDED.description,
  slope_rating = EXCLUDED.slope_rating,
  course_rating = EXCLUDED.course_rating,
  holes = EXCLUDED.holes,
  tees = EXCLUDED.tees;

-- WOOLOOWARE GOLF CLUB
INSERT INTO courses (venue_id, name, description, slope_rating, course_rating, holes, tees)
VALUES (
  'f2a3b4c5-d6e7-8901-abcd-200000000307',
  'Woolooware',
  'Public 18-hole parkland course opened in 1955 in the Sutherland Shire. Tranquil journey through tall gums, melaleucas and indigenous plants. Subtle mounding and bunkering provides character for all skill levels.',
  129,
  67.0,
  '[
    {"number": 1, "par": 4, "strokeIndex": 1, "yardages": {"white": 375, "red": 383}},
    {"number": 2, "par": 4, "strokeIndex": 5, "yardages": {"white": 359, "red": 382}},
    {"number": 3, "par": 3, "strokeIndex": 15, "yardages": {"white": 145, "red": 339}},
    {"number": 4, "par": 3, "strokeIndex": 18, "yardages": {"white": 136, "red": 145}},
    {"number": 5, "par": 4, "strokeIndex": 10, "yardages": {"white": 295, "red": 314}},
    {"number": 6, "par": 4, "strokeIndex": 13, "yardages": {"white": 277, "red": 287}},
    {"number": 7, "par": 4, "strokeIndex": 7, "yardages": {"white": 307, "red": 325}},
    {"number": 8, "par": 5, "strokeIndex": 6, "yardages": {"white": 467, "red": 412}},
    {"number": 9, "par": 3, "strokeIndex": 16, "yardages": {"white": 162, "red": 174}},
    {"number": 10, "par": 3, "strokeIndex": 17, "yardages": {"white": 150, "red": 160}},
    {"number": 11, "par": 4, "strokeIndex": 9, "yardages": {"white": 294, "red": 290}},
    {"number": 12, "par": 5, "strokeIndex": 2, "yardages": {"white": 472, "red": 431}},
    {"number": 13, "par": 4, "strokeIndex": 4, "yardages": {"white": 342, "red": 365}},
    {"number": 14, "par": 5, "strokeIndex": 11, "yardages": {"white": 440, "red": 438}},
    {"number": 15, "par": 4, "strokeIndex": 8, "yardages": {"white": 337, "red": 340}},
    {"number": 16, "par": 3, "strokeIndex": 14, "yardages": {"white": 117, "red": 109}},
    {"number": 17, "par": 3, "strokeIndex": 12, "yardages": {"white": 170, "red": 163}},
    {"number": 18, "par": 4, "strokeIndex": 3, "yardages": {"white": 335, "red": 340}}
  ]'::jsonb,
  '[
    {"name": "White", "color": "white", "courseRating": 67.0, "slopeRating": 129, "totalYardage": 5180},
    {"name": "Red", "color": "red", "courseRating": 75.0, "slopeRating": 128, "totalYardage": 5397}
  ]'::jsonb
)
ON CONFLICT (venue_id, name) DO UPDATE SET
  description = EXCLUDED.description,
  slope_rating = EXCLUDED.slope_rating,
  course_rating = EXCLUDED.course_rating,
  holes = EXCLUDED.holes,
  tees = EXCLUDED.tees;

-- KAREELA GOLF CLUB
INSERT INTO courses (venue_id, name, description, slope_rating, course_rating, holes, tees)
VALUES (
  'f2a3b4c5-d6e7-8901-abcd-200000000308',
  'Kareela',
  'Public 18-hole championship course opened in 1970 in the Sutherland Shire. Beautiful natural setting with challenging risk-reward holes. NSW Golf rated Group 3 course with par 65 layout.',
  121,
  64.0,
  '[
    {"number": 1, "par": 3, "strokeIndex": 10, "yardages": {"blue": 162, "red": 158}},
    {"number": 2, "par": 3, "strokeIndex": 9, "yardages": {"blue": 158, "red": 148}},
    {"number": 3, "par": 4, "strokeIndex": 7, "yardages": {"blue": 317, "red": 315}},
    {"number": 4, "par": 4, "strokeIndex": 4, "yardages": {"blue": 328, "red": 322}},
    {"number": 5, "par": 4, "strokeIndex": 8, "yardages": {"blue": 351, "red": 318}},
    {"number": 6, "par": 4, "strokeIndex": 6, "yardages": {"blue": 292, "red": 290}},
    {"number": 7, "par": 4, "strokeIndex": 17, "yardages": {"blue": 279, "red": 275}},
    {"number": 8, "par": 3, "strokeIndex": 15, "yardages": {"blue": 122, "red": 122}},
    {"number": 9, "par": 3, "strokeIndex": 16, "yardages": {"blue": 125, "red": 122}},
    {"number": 10, "par": 3, "strokeIndex": 2, "yardages": {"blue": 204, "red": 202}},
    {"number": 11, "par": 4, "strokeIndex": 1, "yardages": {"blue": 345, "red": 335}},
    {"number": 12, "par": 3, "strokeIndex": 12, "yardages": {"blue": 161, "red": 160}},
    {"number": 13, "par": 5, "strokeIndex": 13, "yardages": {"blue": 460, "red": 441}},
    {"number": 14, "par": 4, "strokeIndex": 14, "yardages": {"blue": 318, "red": 331}},
    {"number": 15, "par": 4, "strokeIndex": 11, "yardages": {"blue": 301, "red": 290}},
    {"number": 16, "par": 4, "strokeIndex": 5, "yardages": {"blue": 358, "red": 351}},
    {"number": 17, "par": 3, "strokeIndex": 3, "yardages": {"blue": 176, "red": 162}},
    {"number": 18, "par": 3, "strokeIndex": 18, "yardages": {"blue": 110, "red": 110}}
  ]'::jsonb,
  '[
    {"name": "Blue", "color": "blue", "courseRating": 64.0, "slopeRating": 121, "totalYardage": 4567},
    {"name": "Red", "color": "red", "courseRating": 66.0, "slopeRating": 115, "totalYardage": 4452}
  ]'::jsonb
)
ON CONFLICT (venue_id, name) DO UPDATE SET
  description = EXCLUDED.description,
  slope_rating = EXCLUDED.slope_rating,
  course_rating = EXCLUDED.course_rating,
  holes = EXCLUDED.holes,
  tees = EXCLUDED.tees;

-- BANKSTOWN GOLF CLUB
INSERT INTO courses (venue_id, name, description, slope_rating, course_rating, holes, tees)
VALUES (
  'f2a3b4c5-d6e7-8901-abcd-200000000309',
  'Bankstown',
  'Challenging par 71 course in Sydney''s inner-west, opened in 1928. Originally designed by members. Features tight, heavily tree-lined fairways placing premium on driving accuracy. Kikuyu fairways with wintergrass/bentgrass greens.',
  122,
  70.0,
  '[
    {"number": 1, "par": 4, "strokeIndex": 1, "yardages": {"blue": 372, "white": 360, "red": 340}},
    {"number": 2, "par": 3, "strokeIndex": 13, "yardages": {"blue": 136, "white": 130, "red": 120}},
    {"number": 3, "par": 5, "strokeIndex": 18, "yardages": {"blue": 412, "white": 400, "red": 385}},
    {"number": 4, "par": 3, "strokeIndex": 14, "yardages": {"blue": 143, "white": 135, "red": 125}},
    {"number": 5, "par": 5, "strokeIndex": 6, "yardages": {"blue": 462, "white": 450, "red": 430}},
    {"number": 6, "par": 3, "strokeIndex": 15, "yardages": {"blue": 140, "white": 130, "red": 120}},
    {"number": 7, "par": 4, "strokeIndex": 4, "yardages": {"blue": 347, "white": 335, "red": 320}},
    {"number": 8, "par": 4, "strokeIndex": 10, "yardages": {"blue": 317, "white": 305, "red": 290}},
    {"number": 9, "par": 4, "strokeIndex": 8, "yardages": {"blue": 307, "white": 295, "red": 280}},
    {"number": 10, "par": 4, "strokeIndex": 12, "yardages": {"blue": 357, "white": 345, "red": 330}},
    {"number": 11, "par": 5, "strokeIndex": 9, "yardages": {"blue": 472, "white": 460, "red": 445}},
    {"number": 12, "par": 3, "strokeIndex": 16, "yardages": {"blue": 125, "white": 115, "red": 105}},
    {"number": 13, "par": 4, "strokeIndex": 3, "yardages": {"blue": 352, "white": 340, "red": 325}},
    {"number": 14, "par": 4, "strokeIndex": 5, "yardages": {"blue": 305, "white": 295, "red": 280}},
    {"number": 15, "par": 5, "strokeIndex": 17, "yardages": {"blue": 455, "white": 445, "red": 430}},
    {"number": 16, "par": 3, "strokeIndex": 2, "yardages": {"blue": 165, "white": 155, "red": 145}},
    {"number": 17, "par": 4, "strokeIndex": 11, "yardages": {"blue": 365, "white": 355, "red": 340}},
    {"number": 18, "par": 4, "strokeIndex": 7, "yardages": {"blue": 359, "white": 345, "red": 330}}
  ]'::jsonb,
  '[
    {"name": "Blue", "color": "blue", "courseRating": 70.0, "slopeRating": 122, "totalYardage": 5591},
    {"name": "White", "color": "white", "courseRating": 69.0, "slopeRating": 120, "totalYardage": 5395},
    {"name": "Red", "color": "red", "courseRating": 72.0, "slopeRating": 128, "totalYardage": 5140}
  ]'::jsonb
)
ON CONFLICT (venue_id, name) DO UPDATE SET
  description = EXCLUDED.description,
  slope_rating = EXCLUDED.slope_rating,
  course_rating = EXCLUDED.course_rating,
  holes = EXCLUDED.holes,
  tees = EXCLUDED.tees;

-- CAMDEN LAKESIDE GOLF CLUB
INSERT INTO courses (venue_id, name, description, slope_rating, course_rating, holes, tees)
VALUES (
  'f2a3b4c5-d6e7-8901-abcd-200000000310',
  'Camden Lakeside',
  'Peter Thomson/Michael Wolveridge/Ross Perrett designed links-style course opened in 1993. Only Sydney course designed by 5x British Open winner Thomson. T1 bent grass greens. Ranked one of Sydney''s top 5 courses and #16 in NSW.',
  130,
  73.0,
  '[
    {"number": 1, "par": 4, "strokeIndex": 16, "yardages": {"tiger": 365, "championship": 341, "mens": 310, "ladies": 280}},
    {"number": 2, "par": 5, "strokeIndex": 12, "yardages": {"tiger": 498, "championship": 498, "mens": 472, "ladies": 434}},
    {"number": 3, "par": 3, "strokeIndex": 18, "yardages": {"tiger": 155, "championship": 155, "mens": 132, "ladies": 103}},
    {"number": 4, "par": 4, "strokeIndex": 2, "yardages": {"tiger": 409, "championship": 386, "mens": 355, "ladies": 333}},
    {"number": 5, "par": 5, "strokeIndex": 14, "yardages": {"tiger": 534, "championship": 534, "mens": 502, "ladies": 460}},
    {"number": 6, "par": 4, "strokeIndex": 8, "yardages": {"tiger": 382, "championship": 358, "mens": 331, "ladies": 309}},
    {"number": 7, "par": 4, "strokeIndex": 4, "yardages": {"tiger": 394, "championship": 378, "mens": 358, "ladies": 335}},
    {"number": 8, "par": 4, "strokeIndex": 10, "yardages": {"tiger": 361, "championship": 361, "mens": 340, "ladies": 320}},
    {"number": 9, "par": 3, "strokeIndex": 6, "yardages": {"tiger": 180, "championship": 180, "mens": 153, "ladies": 126}},
    {"number": 10, "par": 4, "strokeIndex": 7, "yardages": {"tiger": 321, "championship": 321, "mens": 307, "ladies": 280}},
    {"number": 11, "par": 5, "strokeIndex": 9, "yardages": {"tiger": 497, "championship": 497, "mens": 453, "ladies": 409}},
    {"number": 12, "par": 4, "strokeIndex": 13, "yardages": {"tiger": 342, "championship": 342, "mens": 312, "ladies": 281}},
    {"number": 13, "par": 5, "strokeIndex": 17, "yardages": {"tiger": 467, "championship": 467, "mens": 444, "ladies": 420}},
    {"number": 14, "par": 3, "strokeIndex": 15, "yardages": {"tiger": 163, "championship": 163, "mens": 141, "ladies": 118}},
    {"number": 15, "par": 4, "strokeIndex": 5, "yardages": {"tiger": 348, "championship": 348, "mens": 317, "ladies": 293}},
    {"number": 16, "par": 3, "strokeIndex": 11, "yardages": {"tiger": 151, "championship": 151, "mens": 126, "ladies": 102}},
    {"number": 17, "par": 4, "strokeIndex": 1, "yardages": {"tiger": 429, "championship": 429, "mens": 390, "ladies": 352}},
    {"number": 18, "par": 4, "strokeIndex": 3, "yardages": {"tiger": 404, "championship": 379, "mens": 348, "ladies": 318}}
  ]'::jsonb,
  '[
    {"name": "Tiger", "color": "black", "courseRating": 74.0, "slopeRating": 135, "totalYardage": 6400},
    {"name": "Championship", "color": "blue", "courseRating": 73.0, "slopeRating": 130, "totalYardage": 6288},
    {"name": "Mens", "color": "white", "courseRating": 70.0, "slopeRating": 125, "totalYardage": 5791},
    {"name": "Ladies", "color": "red", "courseRating": 73.0, "slopeRating": 128, "totalYardage": 5273}
  ]'::jsonb
)
ON CONFLICT (venue_id, name) DO UPDATE SET
  description = EXCLUDED.description,
  slope_rating = EXCLUDED.slope_rating,
  course_rating = EXCLUDED.course_rating,
  holes = EXCLUDED.holes,
  tees = EXCLUDED.tees;

-- HURSTVILLE GOLF CLUB
INSERT INTO courses (venue_id, name, description, slope_rating, course_rating, holes, tees)
VALUES (
  'f2a3b4c5-d6e7-8901-abcd-200000000311',
  'Hurstville',
  'James Wilcher designed public course opened in 2005, one of Sydney''s newer clubs. Gender-neutral club welcoming both women and men in all competitions. Par 70 layout.',
  117,
  68.0,
  '[
    {"number": 1, "par": 4, "strokeIndex": 15, "yardages": {"white": 275, "red": 280}},
    {"number": 2, "par": 3, "strokeIndex": 18, "yardages": {"white": 114, "red": 98}},
    {"number": 3, "par": 5, "strokeIndex": 10, "yardages": {"white": 429, "red": 420}},
    {"number": 4, "par": 3, "strokeIndex": 5, "yardages": {"white": 150, "red": 141}},
    {"number": 5, "par": 4, "strokeIndex": 8, "yardages": {"white": 281, "red": 280}},
    {"number": 6, "par": 4, "strokeIndex": 2, "yardages": {"white": 370, "red": 365}},
    {"number": 7, "par": 5, "strokeIndex": 11, "yardages": {"white": 438, "red": 390}},
    {"number": 8, "par": 5, "strokeIndex": 3, "yardages": {"white": 488, "red": 475}},
    {"number": 9, "par": 4, "strokeIndex": 6, "yardages": {"white": 264, "red": 314}},
    {"number": 10, "par": 4, "strokeIndex": 12, "yardages": {"white": 257, "red": 260}},
    {"number": 11, "par": 3, "strokeIndex": 17, "yardages": {"white": 130, "red": 121}},
    {"number": 12, "par": 3, "strokeIndex": 13, "yardages": {"white": 128, "red": 123}},
    {"number": 13, "par": 4, "strokeIndex": 7, "yardages": {"white": 336, "red": 358}},
    {"number": 14, "par": 4, "strokeIndex": 9, "yardages": {"white": 282, "red": 115}},
    {"number": 15, "par": 5, "strokeIndex": 4, "yardages": {"white": 488, "red": 420}},
    {"number": 16, "par": 3, "strokeIndex": 16, "yardages": {"white": 105, "red": 102}},
    {"number": 17, "par": 4, "strokeIndex": 1, "yardages": {"white": 370, "red": 362}},
    {"number": 18, "par": 3, "strokeIndex": 14, "yardages": {"white": 145, "red": 113}}
  ]'::jsonb,
  '[
    {"name": "White", "color": "white", "courseRating": 68.0, "slopeRating": 117, "totalYardage": 5050},
    {"name": "Red", "color": "red", "courseRating": 68.0, "slopeRating": 116, "totalYardage": 4737}
  ]'::jsonb
)
ON CONFLICT (venue_id, name) DO UPDATE SET
  description = EXCLUDED.description,
  slope_rating = EXCLUDED.slope_rating,
  course_rating = EXCLUDED.course_rating,
  holes = EXCLUDED.holes,
  tees = EXCLUDED.tees;

-- BEVERLEY PARK GOLF CLUB
INSERT INTO courses (venue_id, name, description, slope_rating, course_rating, holes, tees)
VALUES (
  'f2a3b4c5-d6e7-8901-abcd-200000000312',
  'Beverley Park',
  'Historic public course opened in 1941 beside Kogarah Bay. Known as "The PARk". Has produced world-renowned golfers including Bruce Crampton, Bruce Devlin, and Greg Norman (who worked there as trainee pro). Easy walk, great for all skill levels.',
  121,
  68.0,
  '[
    {"number": 1, "par": 5, "strokeIndex": 12, "yardages": {"white": 454}},
    {"number": 2, "par": 4, "strokeIndex": 4, "yardages": {"white": 349}},
    {"number": 3, "par": 3, "strokeIndex": 15, "yardages": {"white": 135}},
    {"number": 4, "par": 4, "strokeIndex": 14, "yardages": {"white": 327}},
    {"number": 5, "par": 4, "strokeIndex": 9, "yardages": {"white": 328}},
    {"number": 6, "par": 4, "strokeIndex": 10, "yardages": {"white": 314}},
    {"number": 7, "par": 4, "strokeIndex": 3, "yardages": {"white": 345}},
    {"number": 8, "par": 4, "strokeIndex": 8, "yardages": {"white": 357}},
    {"number": 9, "par": 4, "strokeIndex": 5, "yardages": {"white": 350}},
    {"number": 10, "par": 4, "strokeIndex": 11, "yardages": {"white": 280}},
    {"number": 11, "par": 3, "strokeIndex": 7, "yardages": {"white": 138}},
    {"number": 12, "par": 5, "strokeIndex": 2, "yardages": {"white": 472}},
    {"number": 13, "par": 3, "strokeIndex": 16, "yardages": {"white": 112}},
    {"number": 14, "par": 4, "strokeIndex": 13, "yardages": {"white": 310}},
    {"number": 15, "par": 4, "strokeIndex": 17, "yardages": {"white": 286}},
    {"number": 16, "par": 4, "strokeIndex": 1, "yardages": {"white": 352}},
    {"number": 17, "par": 3, "strokeIndex": 6, "yardages": {"white": 143}},
    {"number": 18, "par": 4, "strokeIndex": 18, "yardages": {"white": 262}}
  ]'::jsonb,
  '[
    {"name": "White", "color": "white", "courseRating": 68.0, "slopeRating": 121, "totalYardage": 5314}
  ]'::jsonb
)
ON CONFLICT (venue_id, name) DO UPDATE SET
  description = EXCLUDED.description,
  slope_rating = EXCLUDED.slope_rating,
  course_rating = EXCLUDED.course_rating,
  holes = EXCLUDED.holes,
  tees = EXCLUDED.tees;

-- RYDE-PARRAMATTA GOLF CLUB
INSERT INTO courses (venue_id, name, description, slope_rating, course_rating, holes, tees)
VALUES (
  'f2a3b4c5-d6e7-8901-abcd-200000000313',
  'Ryde-Parramatta',
  'One of Sydney''s leading private clubs, built in 1926 with multi-million dollar Ross Watson redevelopment. Championship par 71 course with Australian eucalypts, grevilleas and banksias lining the gently undulating fairways.',
  136,
  72.0,
  '[
    {"number": 1, "par": 4, "strokeIndex": 3, "yardages": {"blue": 368, "white": 354, "red": 332}},
    {"number": 2, "par": 4, "strokeIndex": 10, "yardages": {"blue": 357, "white": 348, "red": 329}},
    {"number": 3, "par": 4, "strokeIndex": 12, "yardages": {"blue": 302, "white": 294, "red": 275}},
    {"number": 4, "par": 3, "strokeIndex": 16, "yardages": {"blue": 168, "white": 142, "red": 151}},
    {"number": 5, "par": 5, "strokeIndex": 18, "yardages": {"blue": 452, "white": 447, "red": 378}},
    {"number": 6, "par": 4, "strokeIndex": 5, "yardages": {"blue": 380, "white": 373, "red": 365}},
    {"number": 7, "par": 3, "strokeIndex": 14, "yardages": {"blue": 141, "white": 134, "red": 117}},
    {"number": 8, "par": 4, "strokeIndex": 8, "yardages": {"blue": 347, "white": 296, "red": 294}},
    {"number": 9, "par": 4, "strokeIndex": 1, "yardages": {"blue": 391, "white": 383, "red": 349}},
    {"number": 10, "par": 4, "strokeIndex": 2, "yardages": {"blue": 394, "white": 354, "red": 389}},
    {"number": 11, "par": 5, "strokeIndex": 4, "yardages": {"blue": 538, "white": 529, "red": 432}},
    {"number": 12, "par": 3, "strokeIndex": 17, "yardages": {"blue": 147, "white": 137, "red": 132}},
    {"number": 13, "par": 4, "strokeIndex": 9, "yardages": {"blue": 325, "white": 319, "red": 310}},
    {"number": 14, "par": 4, "strokeIndex": 13, "yardages": {"blue": 354, "white": 340, "red": 273}},
    {"number": 15, "par": 4, "strokeIndex": 15, "yardages": {"blue": 320, "white": 313, "red": 254}},
    {"number": 16, "par": 4, "strokeIndex": 11, "yardages": {"blue": 351, "white": 342, "red": 335}},
    {"number": 17, "par": 3, "strokeIndex": 6, "yardages": {"blue": 168, "white": 144, "red": 132}},
    {"number": 18, "par": 5, "strokeIndex": 7, "yardages": {"blue": 542, "white": 524, "red": 478}}
  ]'::jsonb,
  '[
    {"name": "Blue", "color": "blue", "courseRating": 72.0, "slopeRating": 136, "totalYardage": 6045},
    {"name": "White", "color": "white", "courseRating": 71.0, "slopeRating": 134, "totalYardage": 5773},
    {"name": "Red", "color": "red", "courseRating": 75.0, "slopeRating": 131, "totalYardage": 5325}
  ]'::jsonb
)
ON CONFLICT (venue_id, name) DO UPDATE SET
  description = EXCLUDED.description,
  slope_rating = EXCLUDED.slope_rating,
  course_rating = EXCLUDED.course_rating,
  holes = EXCLUDED.holes,
  tees = EXCLUDED.tees;

-- =====================================================
-- STEP 3: UPDATE EXISTING VENUES
-- Add course data to existing venues in database
-- =====================================================

-- THE AUSTRALIAN GOLF CLUB (existing venue)
INSERT INTO courses (venue_id, name, description, slope_rating, course_rating, holes, tees)
VALUES (
  'b9b81e2f-e9e9-4fb7-9523-ff5901de64f2',
  'The Australian',
  'Australia''s oldest golf club (founded 1882), located in Rosebery. Redesigned by Jack Nicklaus (1977) with Prosper Ellis, Jay Morrish. Ranked #9 in Australia. Has hosted 22 Australian Opens including 2023 (won by Joaquin Niemann).',
  132,
  76.0,
  '[
    {"number": 1, "par": 5, "strokeIndex": 18, "yardages": {"black": 455, "blue": 455, "white": 442, "red": 403}},
    {"number": 2, "par": 3, "strokeIndex": 14, "yardages": {"black": 194, "blue": 168, "white": 162, "red": 146}},
    {"number": 3, "par": 4, "strokeIndex": 8, "yardages": {"black": 343, "blue": 343, "white": 325, "red": 291}},
    {"number": 4, "par": 3, "strokeIndex": 16, "yardages": {"black": 186, "blue": 159, "white": 141, "red": 102}},
    {"number": 5, "par": 5, "strokeIndex": 12, "yardages": {"black": 551, "blue": 542, "white": 492, "red": 453}},
    {"number": 6, "par": 4, "strokeIndex": 6, "yardages": {"black": 386, "blue": 386, "white": 379, "red": 366}},
    {"number": 7, "par": 4, "strokeIndex": 10, "yardages": {"black": 382, "blue": 382, "white": 358, "red": 307}},
    {"number": 8, "par": 4, "strokeIndex": 2, "yardages": {"black": 405, "blue": 405, "white": 392, "red": 374}},
    {"number": 9, "par": 4, "strokeIndex": 3, "yardages": {"black": 422, "blue": 405, "white": 396, "red": 305}},
    {"number": 10, "par": 4, "strokeIndex": 4, "yardages": {"black": 378, "blue": 378, "white": 363, "red": 309}},
    {"number": 11, "par": 3, "strokeIndex": 15, "yardages": {"black": 175, "blue": 175, "white": 155, "red": 120}},
    {"number": 12, "par": 4, "strokeIndex": 9, "yardages": {"black": 385, "blue": 370, "white": 356, "red": 278}},
    {"number": 13, "par": 4, "strokeIndex": 7, "yardages": {"black": 349, "blue": 349, "white": 344, "red": 323}},
    {"number": 14, "par": 5, "strokeIndex": 13, "yardages": {"black": 510, "blue": 510, "white": 487, "red": 463}},
    {"number": 15, "par": 3, "strokeIndex": 11, "yardages": {"black": 188, "blue": 188, "white": 174, "red": 155}},
    {"number": 16, "par": 4, "strokeIndex": 1, "yardages": {"black": 438, "blue": 387, "white": 375, "red": 353}},
    {"number": 17, "par": 4, "strokeIndex": 5, "yardages": {"black": 392, "blue": 392, "white": 371, "red": 309}},
    {"number": 18, "par": 5, "strokeIndex": 17, "yardages": {"black": 478, "blue": 478, "white": 463, "red": 430}}
  ]'::jsonb,
  '[
    {"name": "Black", "color": "black", "courseRating": 76.0, "slopeRating": 140, "totalYardage": 6617},
    {"name": "Blue", "color": "blue", "courseRating": 75.0, "slopeRating": 138, "totalYardage": 6472},
    {"name": "White", "color": "white", "courseRating": 73.0, "slopeRating": 132, "totalYardage": 6175},
    {"name": "Red", "color": "red", "courseRating": 75.0, "slopeRating": 130, "totalYardage": 5487}
  ]'::jsonb
)
ON CONFLICT (venue_id, name) DO UPDATE SET
  description = EXCLUDED.description,
  slope_rating = EXCLUDED.slope_rating,
  course_rating = EXCLUDED.course_rating,
  holes = EXCLUDED.holes,
  tees = EXCLUDED.tees;

-- THE ROYAL SYDNEY GOLF CLUB (existing venue)
-- Note: Championship course data - golfify.io 404 error, using web search data
INSERT INTO courses (venue_id, name, description, slope_rating, course_rating, holes, tees)
VALUES (
  'f1e927f5-29e2-4cf4-8b80-e49fed5c4a95',
  'Championship',
  'World-famous Championship Course at one of Australia''s foremost sporting and social clubs, founded in 1893. Located in Rose Bay on Sydney Harbour. Presents a challenge to professional and amateur alike.',
  135,
  74.2,
  '[]'::jsonb,
  '[
    {"name": "Championship", "color": "blue", "courseRating": 74.2, "slopeRating": 135, "totalYardage": 6938}
  ]'::jsonb
)
ON CONFLICT (venue_id, name) DO UPDATE SET
  description = EXCLUDED.description,
  slope_rating = EXCLUDED.slope_rating,
  course_rating = EXCLUDED.course_rating,
  tees = EXCLUDED.tees;

-- =====================================================
-- SUMMARY
-- =====================================================
-- New Venues Added: 13
--   - Liverpool Golf Club (Oak Point)
--   - Camden Golf Club
--   - Cronulla Golf Club
--   - Kogarah Golf Club
--   - Georges River Golf Course
--   - Campbelltown Golf Club
--   - Woolooware Golf Club
--   - Kareela Golf Club
--   - Bankstown Golf Club
--   - Camden Lakeside Golf Club (Peter Thomson design, Top 5 Sydney)
--   - Hurstville Golf Club
--   - Beverley Park Golf Club (Norman's early career)
--   - Ryde-Parramatta Golf Club (Ross Watson design)
--
-- Existing Venues Updated: 2
--   - The Australian Golf Club (#9 in Australia, 22 Australian Opens)
--   - The Royal Sydney Golf Club (partial data - venue only)
--
-- Total Courses with Full Hole Data: 14
-- =====================================================
