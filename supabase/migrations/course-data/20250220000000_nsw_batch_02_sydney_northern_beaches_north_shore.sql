-- =====================================================
-- Migration: nsw_batch_02_sydney_northern_beaches_north_shore
-- Description: Add Sydney Northern Beaches & North Shore golf venues and courses
--              Part of NSW golf course data collection
-- Date: 2025-12-10
-- Batch: 2 of 7 (Sydney Northern Beaches & North Shore)
-- =====================================================

-- =====================================================
-- STEP 1: INSERT NEW VENUES
-- Using ON CONFLICT to handle re-runs safely
-- =====================================================

-- Avondale Golf Club
INSERT INTO venues (id, source, name, state, city, address, phone, website, total_holes)
VALUES (
  'f2a3b4c5-d6e7-8901-abcd-200000000101',
  'manual',
  'Avondale Golf Club',
  'NSW',
  'Pymble',
  'Avon Road, Pymble NSW 2073',
  '+61 2 9449 6455',
  'https://www.avondalegolfclub.com.au',
  18
)
ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name,
  address = EXCLUDED.address,
  phone = EXCLUDED.phone,
  website = EXCLUDED.website;

-- Pennant Hills Golf Club
INSERT INTO venues (id, source, name, state, city, address, phone, website, total_holes)
VALUES (
  'f2a3b4c5-d6e7-8901-abcd-200000000102',
  'manual',
  'Pennant Hills Golf Club',
  'NSW',
  'Beecroft',
  'Copeland Road, Beecroft NSW 2119',
  '+61 2 8860 5800',
  'https://www.pennanthillsgolfclub.com.au',
  18
)
ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name,
  address = EXCLUDED.address,
  phone = EXCLUDED.phone,
  website = EXCLUDED.website;

-- Manly Golf Club
INSERT INTO venues (id, source, name, state, city, address, phone, website, total_holes)
VALUES (
  'f2a3b4c5-d6e7-8901-abcd-200000000103',
  'manual',
  'Manly Golf Club',
  'NSW',
  'Manly',
  'Balgowlah Road, Balgowlah NSW 2093',
  '+61 2 9907 1733',
  'https://www.manlygolf.com.au',
  18
)
ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name,
  address = EXCLUDED.address,
  phone = EXCLUDED.phone,
  website = EXCLUDED.website;

-- Long Reef Golf Club
INSERT INTO venues (id, source, name, state, city, address, phone, website, total_holes)
VALUES (
  'f2a3b4c5-d6e7-8901-abcd-200000000104',
  'manual',
  'Long Reef Golf Club',
  'NSW',
  'Collaroy',
  'Anzac Avenue, Collaroy NSW 2097',
  '+61 2 9982 2943',
  'https://www.longreefgolfclub.com.au',
  18
)
ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name,
  address = EXCLUDED.address,
  phone = EXCLUDED.phone,
  website = EXCLUDED.website;

-- Terrey Hills Golf & Country Club
INSERT INTO venues (id, source, name, state, city, address, phone, website, total_holes)
VALUES (
  'f2a3b4c5-d6e7-8901-abcd-200000000105',
  'manual',
  'Terrey Hills Golf & Country Club',
  'NSW',
  'Terrey Hills',
  'Booralie Road, Terrey Hills NSW 2084',
  '+61 2 9450 1600',
  'https://www.terreyhillsgolf.com.au',
  18
)
ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name,
  address = EXCLUDED.address,
  phone = EXCLUDED.phone,
  website = EXCLUDED.website;

-- Monash Country Club
INSERT INTO venues (id, source, name, state, city, address, phone, website, total_holes)
VALUES (
  'f2a3b4c5-d6e7-8901-abcd-200000000106',
  'manual',
  'Monash Country Club',
  'NSW',
  'Ingleside',
  'Powderworks Road, Ingleside NSW 2101',
  '+61 2 9979 7166',
  'https://www.monashcc.com.au',
  18
)
ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name,
  address = EXCLUDED.address,
  phone = EXCLUDED.phone,
  website = EXCLUDED.website;

-- Killara Golf Club
INSERT INTO venues (id, source, name, state, city, address, phone, website, total_holes)
VALUES (
  'f2a3b4c5-d6e7-8901-abcd-200000000107',
  'manual',
  'Killara Golf Club',
  'NSW',
  'Killara',
  '556 Pacific Highway, Killara NSW 2071',
  '+61 2 9498 2758',
  'https://www.kgc.com.au',
  18
)
ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name,
  address = EXCLUDED.address,
  phone = EXCLUDED.phone,
  website = EXCLUDED.website;

-- Roseville Golf Club
INSERT INTO venues (id, source, name, state, city, address, phone, website, total_holes)
VALUES (
  'f2a3b4c5-d6e7-8901-abcd-200000000108',
  'manual',
  'Roseville Golf Club',
  'NSW',
  'Roseville',
  '4 Links Avenue, Roseville NSW 2069',
  '+61 2 9419 2115',
  'https://www.rosevillegolf.com.au',
  18
)
ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name,
  address = EXCLUDED.address,
  phone = EXCLUDED.phone,
  website = EXCLUDED.website;

-- Mona Vale Golf Club
INSERT INTO venues (id, source, name, state, city, address, phone, website, total_holes)
VALUES (
  'f2a3b4c5-d6e7-8901-abcd-200000000109',
  'manual',
  'Mona Vale Golf Club',
  'NSW',
  'Mona Vale',
  'Golf Avenue, Mona Vale NSW 2103',
  '+61 2 9999 4622',
  'https://www.monavalegolf.com.au',
  18
)
ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name,
  address = EXCLUDED.address,
  phone = EXCLUDED.phone,
  website = EXCLUDED.website;

-- Warringah Golf Club
INSERT INTO venues (id, source, name, state, city, address, phone, website, total_holes)
VALUES (
  'f2a3b4c5-d6e7-8901-abcd-200000000110',
  'manual',
  'Warringah Golf Club',
  'NSW',
  'North Manly',
  '292 Condamine Street, North Manly NSW 2100',
  '+61 2 9905 4028',
  'https://www.warringahgolfclub.com.au',
  18
)
ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name,
  address = EXCLUDED.address,
  phone = EXCLUDED.phone,
  website = EXCLUDED.website;

-- Elanora Country Club
INSERT INTO venues (id, source, name, state, city, address, phone, website, total_holes)
VALUES (
  'f2a3b4c5-d6e7-8901-abcd-200000000111',
  'manual',
  'Elanora Country Club',
  'NSW',
  'Elanora Heights',
  'Elanora Road, Elanora Heights NSW 2101',
  '+61 2 9913 7336',
  'https://www.elanoracc.com.au',
  18
)
ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name,
  address = EXCLUDED.address,
  phone = EXCLUDED.phone,
  website = EXCLUDED.website;

-- Wakehurst Golf Club
INSERT INTO venues (id, source, name, state, city, address, phone, website, total_holes)
VALUES (
  'f2a3b4c5-d6e7-8901-abcd-200000000112',
  'manual',
  'Wakehurst Golf Club',
  'NSW',
  'North Narrabeen',
  'Wakehurst Parkway, North Narrabeen NSW 2101',
  '+61 2 9913 7766',
  'https://www.wakehurstgolf.com.au',
  18
)
ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name,
  address = EXCLUDED.address,
  phone = EXCLUDED.phone,
  website = EXCLUDED.website;

-- Cromer Golf Club
INSERT INTO venues (id, source, name, state, city, address, phone, website, total_holes)
VALUES (
  'f2a3b4c5-d6e7-8901-abcd-200000000113',
  'manual',
  'Cromer Golf Club',
  'NSW',
  'Cromer',
  'South Creek Road, Cromer NSW 2099',
  '+61 2 9981 4122',
  'https://www.cromergolf.com.au',
  18
)
ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name,
  address = EXCLUDED.address,
  phone = EXCLUDED.phone,
  website = EXCLUDED.website;

-- Bayview Golf Club
INSERT INTO venues (id, source, name, state, city, address, phone, website, total_holes)
VALUES (
  'f2a3b4c5-d6e7-8901-abcd-200000000114',
  'manual',
  'Bayview Golf Club',
  'NSW',
  'Bayview',
  'Cabbage Tree Road, Bayview NSW 2104',
  '+61 2 9979 1472',
  'https://www.bayviewgolf.com.au',
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

-- AVONDALE GOLF CLUB
INSERT INTO courses (venue_id, name, description, slope_rating, course_rating, holes, tees)
VALUES (
  'f2a3b4c5-d6e7-8901-abcd-200000000101',
  'Avondale',
  'Top 100 ranked course designed by Eric Apperly in 1926, later upgraded by Ross Watson and Craig Parry. Spread over 200 acres adjoining Pymble Ladies College, this secluded parkland gem is also a Certified Audubon Sanctuary.',
  132,
  71.5,
  '[
    {"number": 1, "par": 4, "strokeIndex": 1, "yardages": {"black": 320, "white": 306, "red": 292}},
    {"number": 2, "par": 3, "strokeIndex": 3, "yardages": {"black": 157, "white": 140, "red": 130}},
    {"number": 3, "par": 5, "strokeIndex": 5, "yardages": {"black": 572, "white": 520, "red": 500}},
    {"number": 4, "par": 3, "strokeIndex": 7, "yardages": {"black": 170, "white": 154, "red": 150}},
    {"number": 5, "par": 4, "strokeIndex": 9, "yardages": {"black": 375, "white": 354, "red": 335}},
    {"number": 6, "par": 4, "strokeIndex": 11, "yardages": {"black": 351, "white": 341, "red": 293}},
    {"number": 7, "par": 5, "strokeIndex": 13, "yardages": {"black": 492, "white": 473, "red": 467}},
    {"number": 8, "par": 3, "strokeIndex": 15, "yardages": {"black": 173, "white": 154, "red": 121}},
    {"number": 9, "par": 5, "strokeIndex": 17, "yardages": {"black": 489, "white": 460, "red": 379}},
    {"number": 10, "par": 4, "strokeIndex": 2, "yardages": {"black": 338, "white": 330, "red": 320}},
    {"number": 11, "par": 3, "strokeIndex": 4, "yardages": {"black": 193, "white": 167, "red": 141}},
    {"number": 12, "par": 4, "strokeIndex": 6, "yardages": {"black": 384, "white": 323, "red": 309}},
    {"number": 13, "par": 4, "strokeIndex": 8, "yardages": {"black": 347, "white": 340, "red": 333}},
    {"number": 14, "par": 5, "strokeIndex": 10, "yardages": {"black": 489, "white": 471, "red": 455}},
    {"number": 15, "par": 3, "strokeIndex": 12, "yardages": {"black": 148, "white": 136, "red": 111}},
    {"number": 16, "par": 4, "strokeIndex": 14, "yardages": {"black": 458, "white": 420, "red": 401}},
    {"number": 17, "par": 4, "strokeIndex": 16, "yardages": {"black": 303, "white": 273, "red": 261}},
    {"number": 18, "par": 4, "strokeIndex": 18, "yardages": {"black": 410, "white": 382, "red": 297}}
  ]'::jsonb,
  '[
    {"name": "Black", "color": "black", "courseRating": 71.5, "slopeRating": 132, "totalYardage": 6169},
    {"name": "White", "color": "white", "courseRating": 70.0, "slopeRating": 123, "totalYardage": 5744},
    {"name": "Red", "color": "red", "courseRating": 73.0, "slopeRating": 128, "totalYardage": 5295}
  ]'::jsonb
)
ON CONFLICT (venue_id, name) DO UPDATE SET
  description = EXCLUDED.description,
  slope_rating = EXCLUDED.slope_rating,
  course_rating = EXCLUDED.course_rating,
  holes = EXCLUDED.holes,
  tees = EXCLUDED.tees;

-- PENNANT HILLS GOLF CLUB
INSERT INTO courses (venue_id, name, description, slope_rating, course_rating, holes, tees)
VALUES (
  'f2a3b4c5-d6e7-8901-abcd-200000000102',
  'Pennant Hills',
  'Historic championship course designed by James Wilcher in 1923. One of the oldest golf clubs in Sydney, hosting NSW Men''s and Ladies Amateur Championships. Features hilly terrain with tree-lined fairways and strategic water hazards.',
  125,
  71.0,
  '[
    {"number": 1, "par": 5, "strokeIndex": 9, "yardages": {"blue": 457, "white": 450, "red": 443}},
    {"number": 2, "par": 4, "strokeIndex": 3, "yardages": {"blue": 372, "white": 361, "red": 285}},
    {"number": 3, "par": 5, "strokeIndex": 13, "yardages": {"blue": 466, "white": 458, "red": 431}},
    {"number": 4, "par": 3, "strokeIndex": 15, "yardages": {"blue": 175, "white": 162, "red": 154}},
    {"number": 5, "par": 5, "strokeIndex": 11, "yardages": {"blue": 515, "white": 500, "red": 464}},
    {"number": 6, "par": 3, "strokeIndex": 5, "yardages": {"blue": 188, "white": 170, "red": 152}},
    {"number": 7, "par": 4, "strokeIndex": 1, "yardages": {"blue": 400, "white": 394, "red": 391}},
    {"number": 8, "par": 4, "strokeIndex": 7, "yardages": {"blue": 372, "white": 347, "red": 332}},
    {"number": 9, "par": 3, "strokeIndex": 18, "yardages": {"blue": 134, "white": 117, "red": 100}},
    {"number": 10, "par": 4, "strokeIndex": 2, "yardages": {"blue": 381, "white": 375, "red": 334}},
    {"number": 11, "par": 4, "strokeIndex": 4, "yardages": {"blue": 377, "white": 368, "red": 372}},
    {"number": 12, "par": 5, "strokeIndex": 17, "yardages": {"blue": 420, "white": 414, "red": 408}},
    {"number": 13, "par": 4, "strokeIndex": 6, "yardages": {"blue": 350, "white": 345, "red": 288}},
    {"number": 14, "par": 3, "strokeIndex": 14, "yardages": {"blue": 152, "white": 148, "red": 134}},
    {"number": 15, "par": 4, "strokeIndex": 16, "yardages": {"blue": 286, "white": 282, "red": 277}},
    {"number": 16, "par": 4, "strokeIndex": 12, "yardages": {"blue": 344, "white": 326, "red": 322}},
    {"number": 17, "par": 4, "strokeIndex": 8, "yardages": {"blue": 348, "white": 340, "red": 319}},
    {"number": 18, "par": 3, "strokeIndex": 10, "yardages": {"blue": 167, "white": 152, "red": 124}}
  ]'::jsonb,
  '[
    {"name": "Blue", "color": "blue", "courseRating": 71.0, "slopeRating": 125, "totalYardage": 5904},
    {"name": "White", "color": "white", "courseRating": 71.0, "slopeRating": 119, "totalYardage": 5709},
    {"name": "Red", "color": "red", "courseRating": 73.0, "slopeRating": 100, "totalYardage": 5330}
  ]'::jsonb
)
ON CONFLICT (venue_id, name) DO UPDATE SET
  description = EXCLUDED.description,
  slope_rating = EXCLUDED.slope_rating,
  course_rating = EXCLUDED.course_rating,
  holes = EXCLUDED.holes,
  tees = EXCLUDED.tees;

-- MANLY GOLF CLUB
INSERT INTO courses (venue_id, name, description, slope_rating, course_rating, holes, tees)
VALUES (
  'f2a3b4c5-d6e7-8901-abcd-200000000103',
  'Manly',
  'One of Sydney''s original golf clubs founded in 1903, blocks from Manly Beach. Redesigned by Peter Thomson and Ross Perrett in 2012, now ranked among Australia''s Top 100. Jack Nicklaus holds the course record (62, 1971 NSW Open), Greg Norman shot 64 in 1978.',
  131,
  71.0,
  '[
    {"number": 1, "par": 4, "strokeIndex": 14, "yardages": {"blue": 329, "white": 312, "red": 305, "yellow": 294}},
    {"number": 2, "par": 5, "strokeIndex": 4, "yardages": {"blue": 505, "white": 490, "red": 478, "yellow": 412}},
    {"number": 3, "par": 5, "strokeIndex": 10, "yardages": {"blue": 461, "white": 445, "red": 412, "yellow": 348}},
    {"number": 4, "par": 3, "strokeIndex": 12, "yardages": {"blue": 157, "white": 141, "red": 123, "yellow": 118}},
    {"number": 5, "par": 4, "strokeIndex": 5, "yardages": {"blue": 376, "white": 357, "red": 339, "yellow": 286}},
    {"number": 6, "par": 4, "strokeIndex": 1, "yardages": {"blue": 388, "white": 370, "red": 338, "yellow": 289}},
    {"number": 7, "par": 3, "strokeIndex": 18, "yardages": {"blue": 143, "white": 130, "red": 113, "yellow": 105}},
    {"number": 8, "par": 4, "strokeIndex": 3, "yardages": {"blue": 351, "white": 332, "red": 308, "yellow": 226}},
    {"number": 9, "par": 4, "strokeIndex": 16, "yardages": {"blue": 268, "white": 248, "red": 236, "yellow": 219}},
    {"number": 10, "par": 4, "strokeIndex": 15, "yardages": {"blue": 317, "white": 317, "red": 286, "yellow": 273}},
    {"number": 11, "par": 3, "strokeIndex": 9, "yardages": {"blue": 170, "white": 150, "red": 130, "yellow": 130}},
    {"number": 12, "par": 4, "strokeIndex": 2, "yardages": {"blue": 380, "white": 362, "red": 335, "yellow": 260}},
    {"number": 13, "par": 4, "strokeIndex": 8, "yardages": {"blue": 330, "white": 310, "red": 294, "yellow": 236}},
    {"number": 14, "par": 4, "strokeIndex": 6, "yardages": {"blue": 378, "white": 355, "red": 339, "yellow": 315}},
    {"number": 15, "par": 3, "strokeIndex": 17, "yardages": {"blue": 127, "white": 108, "red": 104, "yellow": 90}},
    {"number": 16, "par": 4, "strokeIndex": 7, "yardages": {"blue": 368, "white": 368, "red": 331, "yellow": 329}},
    {"number": 17, "par": 5, "strokeIndex": 13, "yardages": {"blue": 509, "white": 488, "red": 460, "yellow": 385}},
    {"number": 18, "par": 4, "strokeIndex": 11, "yardages": {"blue": 328, "white": 310, "red": 290, "yellow": 283}}
  ]'::jsonb,
  '[
    {"name": "Blue", "color": "blue", "courseRating": 71.0, "slopeRating": 131, "totalYardage": 5885},
    {"name": "White", "color": "white", "courseRating": 71.0, "slopeRating": 131, "totalYardage": 5593},
    {"name": "Red", "color": "red", "courseRating": 73.0, "slopeRating": 130, "totalYardage": 5221},
    {"name": "Yellow", "color": "yellow", "courseRating": 68.0, "slopeRating": 118, "totalYardage": 4598}
  ]'::jsonb
)
ON CONFLICT (venue_id, name) DO UPDATE SET
  description = EXCLUDED.description,
  slope_rating = EXCLUDED.slope_rating,
  course_rating = EXCLUDED.course_rating,
  holes = EXCLUDED.holes,
  tees = EXCLUDED.tees;

-- LONG REEF GOLF CLUB
INSERT INTO courses (venue_id, name, description, slope_rating, course_rating, holes, tees)
VALUES (
  'f2a3b4c5-d6e7-8901-abcd-200000000104',
  'Long Reef',
  'Distinctive links-style public course built in 1921, redesigned by Peter Thomson in 1994. Breathtaking ocean views from every tee and green, stretching from Manly to the Central Coast. Features Poa Annua greens and Kikuyu fairways that drain well in wet weather.',
  133,
  73.0,
  '[
    {"number": 1, "par": 5, "strokeIndex": 6, "yardages": {"black": 450, "blue": 441, "white": 430, "gold": 422, "red": 433}},
    {"number": 2, "par": 3, "strokeIndex": 11, "yardages": {"black": 152, "blue": 139, "white": 125, "gold": 111, "red": 134}},
    {"number": 3, "par": 4, "strokeIndex": 15, "yardages": {"black": 315, "blue": 303, "white": 285, "gold": 255, "red": 261}},
    {"number": 4, "par": 4, "strokeIndex": 8, "yardages": {"black": 393, "blue": 382, "white": 377, "gold": 323, "red": 366}},
    {"number": 5, "par": 4, "strokeIndex": 7, "yardages": {"black": 352, "blue": 341, "white": 325, "gold": 287, "red": 292}},
    {"number": 6, "par": 4, "strokeIndex": 17, "yardages": {"black": 271, "blue": 263, "white": 247, "gold": 233, "red": 257}},
    {"number": 7, "par": 3, "strokeIndex": 3, "yardages": {"black": 178, "blue": 173, "white": 160, "gold": 112, "red": 120}},
    {"number": 8, "par": 4, "strokeIndex": 16, "yardages": {"black": 298, "blue": 292, "white": 282, "gold": 273, "red": 286}},
    {"number": 9, "par": 5, "strokeIndex": 18, "yardages": {"black": 444, "blue": 438, "white": 429, "gold": 384, "red": 426}},
    {"number": 10, "par": 3, "strokeIndex": 1, "yardages": {"black": 217, "blue": 208, "white": 167, "gold": 152, "red": 169}},
    {"number": 11, "par": 4, "strokeIndex": 14, "yardages": {"black": 374, "blue": 367, "white": 345, "gold": 336, "red": 358}},
    {"number": 12, "par": 4, "strokeIndex": 12, "yardages": {"black": 347, "blue": 330, "white": 321, "gold": 278, "red": 302}},
    {"number": 13, "par": 3, "strokeIndex": 10, "yardages": {"black": 138, "blue": 129, "white": 112, "gold": 93, "red": 99}},
    {"number": 14, "par": 4, "strokeIndex": 9, "yardages": {"black": 390, "blue": 385, "white": 385, "gold": 377, "red": 372}},
    {"number": 15, "par": 5, "strokeIndex": 13, "yardages": {"black": 462, "blue": 454, "white": 427, "gold": 360, "red": 372}},
    {"number": 16, "par": 4, "strokeIndex": 4, "yardages": {"black": 415, "blue": 399, "white": 387, "gold": 367, "red": 404}},
    {"number": 17, "par": 4, "strokeIndex": 2, "yardages": {"black": 400, "blue": 391, "white": 369, "gold": 314, "red": 340}},
    {"number": 18, "par": 4, "strokeIndex": 5, "yardages": {"black": 359, "blue": 347, "white": 325, "gold": 266, "red": 312}}
  ]'::jsonb,
  '[
    {"name": "Black", "color": "black", "courseRating": 73.0, "slopeRating": 133, "totalYardage": 5955},
    {"name": "Blue", "color": "blue", "courseRating": 72.0, "slopeRating": 130, "totalYardage": 5782},
    {"name": "White", "color": "white", "courseRating": 71.0, "slopeRating": 129, "totalYardage": 5498},
    {"name": "Gold", "color": "gold", "courseRating": 68.0, "slopeRating": 120, "totalYardage": 4943},
    {"name": "Red", "color": "red", "courseRating": 73.0, "slopeRating": 134, "totalYardage": 5303}
  ]'::jsonb
)
ON CONFLICT (venue_id, name) DO UPDATE SET
  description = EXCLUDED.description,
  slope_rating = EXCLUDED.slope_rating,
  course_rating = EXCLUDED.course_rating,
  holes = EXCLUDED.holes,
  tees = EXCLUDED.tees;

-- TERREY HILLS GOLF & COUNTRY CLUB
INSERT INTO courses (venue_id, name, description, slope_rating, course_rating, holes, tees)
VALUES (
  'f2a3b4c5-d6e7-8901-abcd-200000000105',
  'Terrey Hills',
  'Graham Marsh designed championship course opened in 1994, voted one of Sydney''s best by Golf Digest. Set within Ku-ring-gai Chase National Park with beautiful conditioning. Private club limited to 750 members.',
  136,
  75.0,
  '[
    {"number": 1, "par": 5, "strokeIndex": 18, "yardages": {"black": 492, "blue": 472, "white": 445, "yellow": 382}},
    {"number": 2, "par": 4, "strokeIndex": 16, "yardages": {"black": 345, "blue": 326, "white": 315, "yellow": 271}},
    {"number": 3, "par": 4, "strokeIndex": 10, "yardages": {"black": 383, "blue": 366, "white": 339, "yellow": 295}},
    {"number": 4, "par": 3, "strokeIndex": 14, "yardages": {"black": 155, "blue": 140, "white": 125, "yellow": 104}},
    {"number": 5, "par": 4, "strokeIndex": 4, "yardages": {"black": 401, "blue": 377, "white": 338, "yellow": 301}},
    {"number": 6, "par": 3, "strokeIndex": 8, "yardages": {"black": 187, "blue": 169, "white": 154, "yellow": 135}},
    {"number": 7, "par": 4, "strokeIndex": 2, "yardages": {"black": 390, "blue": 376, "white": 347, "yellow": 312}},
    {"number": 8, "par": 4, "strokeIndex": 12, "yardages": {"black": 349, "blue": 332, "white": 322, "yellow": 290}},
    {"number": 9, "par": 5, "strokeIndex": 6, "yardages": {"black": 513, "blue": 495, "white": 477, "yellow": 445}},
    {"number": 10, "par": 4, "strokeIndex": 5, "yardages": {"black": 389, "blue": 365, "white": 343, "yellow": 307}},
    {"number": 11, "par": 4, "strokeIndex": 7, "yardages": {"black": 393, "blue": 374, "white": 356, "yellow": 336}},
    {"number": 12, "par": 3, "strokeIndex": 15, "yardages": {"black": 155, "blue": 134, "white": 122, "yellow": 106}},
    {"number": 13, "par": 4, "strokeIndex": 3, "yardages": {"black": 391, "blue": 369, "white": 358, "yellow": 319}},
    {"number": 14, "par": 5, "strokeIndex": 9, "yardages": {"black": 510, "blue": 493, "white": 473, "yellow": 411}},
    {"number": 15, "par": 3, "strokeIndex": 13, "yardages": {"black": 176, "blue": 160, "white": 145, "yellow": 124}},
    {"number": 16, "par": 5, "strokeIndex": 17, "yardages": {"black": 495, "blue": 469, "white": 446, "yellow": 411}},
    {"number": 17, "par": 4, "strokeIndex": 1, "yardages": {"black": 403, "blue": 377, "white": 357, "yellow": 326}},
    {"number": 18, "par": 4, "strokeIndex": 11, "yardages": {"black": 372, "blue": 357, "white": 311, "yellow": 327}}
  ]'::jsonb,
  '[
    {"name": "Black", "color": "black", "courseRating": 75.0, "slopeRating": 136, "totalYardage": 6499},
    {"name": "Blue", "color": "blue", "courseRating": 73.0, "slopeRating": 134, "totalYardage": 6151},
    {"name": "White", "color": "white", "courseRating": 71.0, "slopeRating": 131, "totalYardage": 5773},
    {"name": "Yellow", "color": "yellow", "courseRating": 73.0, "slopeRating": 130, "totalYardage": 5202}
  ]'::jsonb
)
ON CONFLICT (venue_id, name) DO UPDATE SET
  description = EXCLUDED.description,
  slope_rating = EXCLUDED.slope_rating,
  course_rating = EXCLUDED.course_rating,
  holes = EXCLUDED.holes,
  tees = EXCLUDED.tees;

-- MONASH COUNTRY CLUB
INSERT INTO courses (venue_id, name, description, slope_rating, course_rating, holes, tees)
VALUES (
  'f2a3b4c5-d6e7-8901-abcd-200000000106',
  'Monash',
  'Premier private parkland course established in 1950, high on the hills above Narrabeen with panoramic Pacific Ocean views. Redesigned by James Wilcher (2017) and Bob Harrison. One of Sydney''s leading Group 1 clubs with arguably the best practice facilities.',
  140,
  73.0,
  '[
    {"number": 1, "par": 5, "strokeIndex": 12, "yardages": {"mens": 519, "womens": 440}},
    {"number": 2, "par": 4, "strokeIndex": 4, "yardages": {"mens": 354, "womens": 261}},
    {"number": 3, "par": 3, "strokeIndex": 16, "yardages": {"mens": 146, "womens": 111}},
    {"number": 4, "par": 4, "strokeIndex": 2, "yardages": {"mens": 365, "womens": 347}},
    {"number": 5, "par": 3, "strokeIndex": 10, "yardages": {"mens": 162, "womens": 134}},
    {"number": 6, "par": 4, "strokeIndex": 8, "yardages": {"mens": 363, "womens": 320}},
    {"number": 7, "par": 4, "strokeIndex": 6, "yardages": {"mens": 378, "womens": 336}},
    {"number": 8, "par": 4, "strokeIndex": 18, "yardages": {"mens": 267, "womens": 260}},
    {"number": 9, "par": 5, "strokeIndex": 14, "yardages": {"mens": 486, "womens": 411}},
    {"number": 10, "par": 5, "strokeIndex": 11, "yardages": {"mens": 500, "womens": 435}},
    {"number": 11, "par": 4, "strokeIndex": 1, "yardages": {"mens": 386, "womens": 365}},
    {"number": 12, "par": 4, "strokeIndex": 7, "yardages": {"mens": 345, "womens": 315}},
    {"number": 13, "par": 4, "strokeIndex": 13, "yardages": {"mens": 315, "womens": 292}},
    {"number": 14, "par": 3, "strokeIndex": 5, "yardages": {"mens": 194, "womens": 138}},
    {"number": 15, "par": 5, "strokeIndex": 9, "yardages": {"mens": 493, "womens": 388}},
    {"number": 16, "par": 4, "strokeIndex": 3, "yardages": {"mens": 374, "womens": 348}},
    {"number": 17, "par": 3, "strokeIndex": 17, "yardages": {"mens": 132, "womens": 118}},
    {"number": 18, "par": 4, "strokeIndex": 15, "yardages": {"mens": 311, "womens": 257}}
  ]'::jsonb,
  '[
    {"name": "Mens", "color": "blue", "courseRating": 73.0, "slopeRating": 140, "totalYardage": 6090},
    {"name": "Womens", "color": "red", "courseRating": 71.0, "slopeRating": 135, "totalYardage": 5276}
  ]'::jsonb
)
ON CONFLICT (venue_id, name) DO UPDATE SET
  description = EXCLUDED.description,
  slope_rating = EXCLUDED.slope_rating,
  course_rating = EXCLUDED.course_rating,
  holes = EXCLUDED.holes,
  tees = EXCLUDED.tees;

-- KILLARA GOLF CLUB
INSERT INTO courses (venue_id, name, description, slope_rating, course_rating, holes, tees)
VALUES (
  'f2a3b4c5-d6e7-8901-abcd-200000000107',
  'Killara',
  'Established in 1899, one of Sydney''s premier private clubs. Ranked #73 in Australia''s Top 100 (Golf Digest 2024). Recently renovated by Harley Kruse with rebuilt bunkers, tees, greens, and reopened corridors. Features tree-lined undulating fairways with views to the Blue Mountains.',
  130,
  72.0,
  '[
    {"number": 1, "par": 5, "strokeIndex": 14, "yardages": {"blue": 512, "white": 487, "red": 504}},
    {"number": 2, "par": 3, "strokeIndex": 8, "yardages": {"blue": 175, "white": 160, "red": 130}},
    {"number": 3, "par": 4, "strokeIndex": 11, "yardages": {"blue": 325, "white": 320, "red": 271}},
    {"number": 4, "par": 4, "strokeIndex": 10, "yardages": {"blue": 372, "white": 355, "red": 342}},
    {"number": 5, "par": 4, "strokeIndex": 2, "yardages": {"blue": 371, "white": 362, "red": 371}},
    {"number": 6, "par": 4, "strokeIndex": 12, "yardages": {"blue": 349, "white": 335, "red": 323}},
    {"number": 7, "par": 4, "strokeIndex": 7, "yardages": {"blue": 339, "white": 324, "red": 270}},
    {"number": 8, "par": 3, "strokeIndex": 3, "yardages": {"blue": 198, "white": 181, "red": 150}},
    {"number": 9, "par": 5, "strokeIndex": 17, "yardages": {"blue": 432, "white": 416, "red": 424}},
    {"number": 10, "par": 5, "strokeIndex": 16, "yardages": {"blue": 435, "white": 427, "red": 413}},
    {"number": 11, "par": 3, "strokeIndex": 18, "yardages": {"blue": 128, "white": 118, "red": 110}},
    {"number": 12, "par": 4, "strokeIndex": 6, "yardages": {"blue": 368, "white": 348, "red": 316}},
    {"number": 13, "par": 5, "strokeIndex": 13, "yardages": {"blue": 472, "white": 460, "red": 432}},
    {"number": 14, "par": 4, "strokeIndex": 15, "yardages": {"blue": 297, "white": 278, "red": 258}},
    {"number": 15, "par": 4, "strokeIndex": 5, "yardages": {"blue": 373, "white": 358, "red": 287}},
    {"number": 16, "par": 4, "strokeIndex": 1, "yardages": {"blue": 405, "white": 392, "red": 396}},
    {"number": 17, "par": 3, "strokeIndex": 9, "yardages": {"blue": 168, "white": 157, "red": 124}},
    {"number": 18, "par": 4, "strokeIndex": 4, "yardages": {"blue": 361, "white": 336, "red": 310}}
  ]'::jsonb,
  '[
    {"name": "Blue", "color": "blue", "courseRating": 72.0, "slopeRating": 130, "totalYardage": 6080},
    {"name": "White", "color": "white", "courseRating": 71.0, "slopeRating": 126, "totalYardage": 5814},
    {"name": "Red", "color": "red", "courseRating": 73.0, "slopeRating": 128, "totalYardage": 5431}
  ]'::jsonb
)
ON CONFLICT (venue_id, name) DO UPDATE SET
  description = EXCLUDED.description,
  slope_rating = EXCLUDED.slope_rating,
  course_rating = EXCLUDED.course_rating,
  holes = EXCLUDED.holes,
  tees = EXCLUDED.tees;

-- ROSEVILLE GOLF CLUB
INSERT INTO courses (venue_id, name, description, slope_rating, course_rating, holes, tees)
VALUES (
  'f2a3b4c5-d6e7-8901-abcd-200000000108',
  'Roseville',
  'Unique par 67 course formed in 1923, winding through an ancient sandstone escarpment overlooking native bushland and Middle Harbour valleys. James Wilcher reconstructed five holes in recent upgrades. Features Bent grass greens and Kikuyu fairways.',
  118,
  67.0,
  '[
    {"number": 1, "par": 4, "strokeIndex": 1, "yardages": {"mens": 355, "womens": 349}},
    {"number": 2, "par": 3, "strokeIndex": 3, "yardages": {"mens": 219, "womens": 205}},
    {"number": 3, "par": 3, "strokeIndex": 5, "yardages": {"mens": 179, "womens": 175}},
    {"number": 4, "par": 3, "strokeIndex": 7, "yardages": {"mens": 155, "womens": 133}},
    {"number": 5, "par": 3, "strokeIndex": 9, "yardages": {"mens": 160, "womens": 96}},
    {"number": 6, "par": 4, "strokeIndex": 11, "yardages": {"mens": 284, "womens": 270}},
    {"number": 7, "par": 4, "strokeIndex": 13, "yardages": {"mens": 343, "womens": 326}},
    {"number": 8, "par": 3, "strokeIndex": 15, "yardages": {"mens": 132, "womens": 124}},
    {"number": 9, "par": 3, "strokeIndex": 17, "yardages": {"mens": 182, "womens": 172}},
    {"number": 10, "par": 4, "strokeIndex": 2, "yardages": {"mens": 265, "womens": 258}},
    {"number": 11, "par": 4, "strokeIndex": 4, "yardages": {"mens": 296, "womens": 273}},
    {"number": 12, "par": 3, "strokeIndex": 6, "yardages": {"mens": 193, "womens": 97}},
    {"number": 13, "par": 4, "strokeIndex": 8, "yardages": {"mens": 256, "womens": 246}},
    {"number": 14, "par": 5, "strokeIndex": 10, "yardages": {"mens": 427, "womens": 421}},
    {"number": 15, "par": 3, "strokeIndex": 12, "yardages": {"mens": 134, "womens": 126}},
    {"number": 16, "par": 5, "strokeIndex": 14, "yardages": {"mens": 494, "womens": 459}},
    {"number": 17, "par": 4, "strokeIndex": 16, "yardages": {"mens": 316, "womens": 299}},
    {"number": 18, "par": 5, "strokeIndex": 18, "yardages": {"mens": 450, "womens": 438}}
  ]'::jsonb,
  '[
    {"name": "Mens", "color": "blue", "courseRating": 67.0, "slopeRating": 118, "totalYardage": 4840},
    {"name": "Womens", "color": "red", "courseRating": 70.3, "slopeRating": 125, "totalYardage": 4467}
  ]'::jsonb
)
ON CONFLICT (venue_id, name) DO UPDATE SET
  description = EXCLUDED.description,
  slope_rating = EXCLUDED.slope_rating,
  course_rating = EXCLUDED.course_rating,
  holes = EXCLUDED.holes,
  tees = EXCLUDED.tees;

-- MONA VALE GOLF CLUB
INSERT INTO courses (venue_id, name, description, slope_rating, course_rating, holes, tees)
VALUES (
  'f2a3b4c5-d6e7-8901-abcd-200000000109',
  'Mona Vale',
  'Beachside public course established in 1927 in the heart of Sydney''s Northern Beaches. Par 72 layout with six par 5s and four par 3s. Holes 16 and 17 are considered standout holes. Tree-lined fairways require accuracy.',
  135,
  72.0,
  '[
    {"number": 1, "par": 5, "strokeIndex": 9, "yardages": {"mens": 485, "womens": 376}},
    {"number": 2, "par": 3, "strokeIndex": 10, "yardages": {"mens": 172, "womens": 146}},
    {"number": 3, "par": 5, "strokeIndex": 16, "yardages": {"mens": 458, "womens": 413}},
    {"number": 4, "par": 4, "strokeIndex": 13, "yardages": {"mens": 336, "womens": 300}},
    {"number": 5, "par": 5, "strokeIndex": 6, "yardages": {"mens": 505, "womens": 385}},
    {"number": 6, "par": 3, "strokeIndex": 4, "yardages": {"mens": 177, "womens": 158}},
    {"number": 7, "par": 4, "strokeIndex": 12, "yardages": {"mens": 310, "womens": 299}},
    {"number": 8, "par": 3, "strokeIndex": 14, "yardages": {"mens": 170, "womens": 136}},
    {"number": 9, "par": 4, "strokeIndex": 2, "yardages": {"mens": 364, "womens": 358}},
    {"number": 10, "par": 4, "strokeIndex": 11, "yardages": {"mens": 323, "womens": 279}},
    {"number": 11, "par": 5, "strokeIndex": 8, "yardages": {"mens": 480, "womens": 443}},
    {"number": 12, "par": 4, "strokeIndex": 7, "yardages": {"mens": 329, "womens": 309}},
    {"number": 13, "par": 5, "strokeIndex": 15, "yardages": {"mens": 470, "womens": 430}},
    {"number": 14, "par": 3, "strokeIndex": 17, "yardages": {"mens": 134, "womens": 109}},
    {"number": 15, "par": 4, "strokeIndex": 1, "yardages": {"mens": 408, "womens": 379}},
    {"number": 16, "par": 3, "strokeIndex": 18, "yardages": {"mens": 133, "womens": 109}},
    {"number": 17, "par": 4, "strokeIndex": 5, "yardages": {"mens": 373, "womens": 314}},
    {"number": 18, "par": 4, "strokeIndex": 3, "yardages": {"mens": 378, "womens": 330}}
  ]'::jsonb,
  '[
    {"name": "Mens", "color": "white", "courseRating": 72.0, "slopeRating": 135, "totalYardage": 6005},
    {"name": "Womens", "color": "red", "courseRating": 73.0, "slopeRating": 130, "totalYardage": 5273}
  ]'::jsonb
)
ON CONFLICT (venue_id, name) DO UPDATE SET
  description = EXCLUDED.description,
  slope_rating = EXCLUDED.slope_rating,
  course_rating = EXCLUDED.course_rating,
  holes = EXCLUDED.holes,
  tees = EXCLUDED.tees;

-- WARRINGAH GOLF CLUB
INSERT INTO courses (venue_id, name, description, slope_rating, course_rating, holes, tees)
VALUES (
  'f2a3b4c5-d6e7-8901-abcd-200000000110',
  'Warringah',
  'Popular public parklands course established in 1935, 15 minutes from Sydney CBD and 5 minutes from Manly and Freshwater beaches. Par 70 layout providing a fair test for all standards of golfers.',
  118,
  68.0,
  '[
    {"number": 1, "par": 4, "strokeIndex": 15, "yardages": {"blue": 276, "red": 270}},
    {"number": 2, "par": 4, "strokeIndex": 1, "yardages": {"blue": 397, "red": 405}},
    {"number": 3, "par": 5, "strokeIndex": 5, "yardages": {"blue": 475, "red": 475}},
    {"number": 4, "par": 4, "strokeIndex": 10, "yardages": {"blue": 310, "red": 315}},
    {"number": 5, "par": 3, "strokeIndex": 16, "yardages": {"blue": 135, "red": 137}},
    {"number": 6, "par": 5, "strokeIndex": 7, "yardages": {"blue": 445, "red": 415}},
    {"number": 7, "par": 4, "strokeIndex": 13, "yardages": {"blue": 230, "red": 187}},
    {"number": 8, "par": 3, "strokeIndex": 4, "yardages": {"blue": 195, "red": 203}},
    {"number": 9, "par": 4, "strokeIndex": 11, "yardages": {"blue": 302, "red": 302}},
    {"number": 10, "par": 5, "strokeIndex": 8, "yardages": {"blue": 411, "red": 419}},
    {"number": 11, "par": 4, "strokeIndex": 9, "yardages": {"blue": 255, "red": 262}},
    {"number": 12, "par": 3, "strokeIndex": 18, "yardages": {"blue": 117, "red": 116}},
    {"number": 13, "par": 4, "strokeIndex": 6, "yardages": {"blue": 340, "red": 340}},
    {"number": 14, "par": 3, "strokeIndex": 17, "yardages": {"blue": 116, "red": 122}},
    {"number": 15, "par": 4, "strokeIndex": 3, "yardages": {"blue": 361, "red": 449}},
    {"number": 16, "par": 4, "strokeIndex": 14, "yardages": {"blue": 232, "red": 246}},
    {"number": 17, "par": 3, "strokeIndex": 12, "yardages": {"blue": 140, "red": 140}},
    {"number": 18, "par": 4, "strokeIndex": 2, "yardages": {"blue": 351, "red": 371}}
  ]'::jsonb,
  '[
    {"name": "Blue", "color": "blue", "courseRating": 68.0, "slopeRating": 118, "totalYardage": 5088},
    {"name": "Red", "color": "red", "courseRating": 73.0, "slopeRating": 129, "totalYardage": 5174}
  ]'::jsonb
)
ON CONFLICT (venue_id, name) DO UPDATE SET
  description = EXCLUDED.description,
  slope_rating = EXCLUDED.slope_rating,
  course_rating = EXCLUDED.course_rating,
  holes = EXCLUDED.holes,
  tees = EXCLUDED.tees;

-- ELANORA COUNTRY CLUB
INSERT INTO courses (venue_id, name, description, slope_rating, course_rating, holes, tees)
VALUES (
  'f2a3b4c5-d6e7-8901-abcd-200000000111',
  'Narrabeen',
  'Top-50 ranked course formed in 1928 within Ku-ring-gai Chase and Garigal National Parks. Dan Soutar carved nine fairways through classic bushland, later upgraded by James Wilcher transforming it into a Top 100 mainstay. Ranked #45 in Australia (2022).',
  133,
  73.6,
  '[
    {"number": 1, "par": 4, "strokeIndex": 4, "yardages": {"mens": 353, "womens": 308}},
    {"number": 2, "par": 5, "strokeIndex": 6, "yardages": {"mens": 534, "womens": 413}},
    {"number": 3, "par": 4, "strokeIndex": 18, "yardages": {"mens": 281, "womens": 254}},
    {"number": 4, "par": 4, "strokeIndex": 14, "yardages": {"mens": 390, "womens": 337}},
    {"number": 5, "par": 3, "strokeIndex": 12, "yardages": {"mens": 173, "womens": 118}},
    {"number": 6, "par": 5, "strokeIndex": 2, "yardages": {"mens": 513, "womens": 393}},
    {"number": 7, "par": 3, "strokeIndex": 8, "yardages": {"mens": 194, "womens": 136}},
    {"number": 8, "par": 4, "strokeIndex": 16, "yardages": {"mens": 285, "womens": 277}},
    {"number": 9, "par": 4, "strokeIndex": 10, "yardages": {"mens": 368, "womens": 360}},
    {"number": 10, "par": 4, "strokeIndex": 9, "yardages": {"mens": 398, "womens": 344}},
    {"number": 11, "par": 5, "strokeIndex": 11, "yardages": {"mens": 496, "womens": 427}},
    {"number": 12, "par": 3, "strokeIndex": 17, "yardages": {"mens": 159, "womens": 149}},
    {"number": 13, "par": 4, "strokeIndex": 13, "yardages": {"mens": 283, "womens": 262}},
    {"number": 14, "par": 4, "strokeIndex": 7, "yardages": {"mens": 401, "womens": 331}},
    {"number": 15, "par": 4, "strokeIndex": 1, "yardages": {"mens": 386, "womens": 348}},
    {"number": 16, "par": 5, "strokeIndex": 5, "yardages": {"mens": 354, "womens": 422}},
    {"number": 17, "par": 3, "strokeIndex": 15, "yardages": {"mens": 122, "womens": 109}},
    {"number": 18, "par": 4, "strokeIndex": 3, "yardages": {"mens": 394, "womens": 344}}
  ]'::jsonb,
  '[
    {"name": "Mens", "color": "white", "courseRating": 73.6, "slopeRating": 133, "totalYardage": 6084},
    {"name": "Womens", "color": "red", "courseRating": 72.0, "slopeRating": 128, "totalYardage": 5332}
  ]'::jsonb
)
ON CONFLICT (venue_id, name) DO UPDATE SET
  description = EXCLUDED.description,
  slope_rating = EXCLUDED.slope_rating,
  course_rating = EXCLUDED.course_rating,
  holes = EXCLUDED.holes,
  tees = EXCLUDED.tees;

-- =====================================================
-- SUMMARY
-- =====================================================
-- New Venues Added: 14
--   - Avondale Golf Club (Top 100)
--   - Pennant Hills Golf Club
--   - Manly Golf Club (Top 100)
--   - Long Reef Golf Club
--   - Terrey Hills Golf & Country Club
--   - Monash Country Club
--   - Killara Golf Club (Top 100)
--   - Roseville Golf Club
--   - Mona Vale Golf Club
--   - Warringah Golf Club
--   - Elanora Country Club (Top 50)
--   - Wakehurst Golf Club (venue only)
--   - Cromer Golf Club (venue only)
--   - Bayview Golf Club (venue only)
--
-- Total Courses with Full Hole Data: 11
-- =====================================================
