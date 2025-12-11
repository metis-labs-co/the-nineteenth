-- =====================================================
-- Migration: nsw_batch_07_regional_nsw_part2
-- Description: Add Regional NSW golf venues and courses (Part 2)
--              Blue Mountains, Central West, Riverina, Murray, New England, Snowy Mountains
-- Date: 2025-12-11
-- Batch: 7b of 7 (Regional NSW - Part 2)
-- =====================================================

-- =====================================================
-- BLUE MOUNTAINS REGION
-- =====================================================

-- Leura Golf Club (Established 1902)
INSERT INTO venues (id, source, name, state, city, address, phone, website, total_holes)
VALUES (
  'f2a3b4c5-d6e7-8901-abcd-400000000716',
  'manual',
  'Leura Golf Club',
  'NSW',
  'Leura',
  'Sublime Point Road, Leura NSW 2780',
  '+61 2 4782 5011',
  'https://www.leuragolf.com.au',
  18
)
ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name,
  address = EXCLUDED.address,
  phone = EXCLUDED.phone,
  website = EXCLUDED.website;

INSERT INTO courses (venue_id, name, description, slope_rating, course_rating, holes, tees)
VALUES (
  'f2a3b4c5-d6e7-8901-abcd-400000000716',
  'Leura',
  'Historic parkland course established 1902 in the Blue Mountains. Par 70 layout with six par 3s and three par 5s. Stunning mountain scenery with cool climate year-round.',
  120,
  70.0,
  '[
    {"number": 1, "par": 4, "strokeIndex": 6, "yardages": {"men": 273, "ladies": 268}},
    {"number": 2, "par": 3, "strokeIndex": 17, "yardages": {"men": 125, "ladies": 125}},
    {"number": 3, "par": 5, "strokeIndex": 7, "yardages": {"men": 441, "ladies": 424}},
    {"number": 4, "par": 5, "strokeIndex": 3, "yardages": {"men": 495, "ladies": 408}},
    {"number": 5, "par": 3, "strokeIndex": 11, "yardages": {"men": 195, "ladies": 190}},
    {"number": 6, "par": 5, "strokeIndex": 13, "yardages": {"men": 381, "ladies": 390}},
    {"number": 7, "par": 3, "strokeIndex": 18, "yardages": {"men": 131, "ladies": 129}},
    {"number": 8, "par": 4, "strokeIndex": 14, "yardages": {"men": 285, "ladies": 285}},
    {"number": 9, "par": 3, "strokeIndex": 15, "yardages": {"men": 162, "ladies": 157}},
    {"number": 10, "par": 4, "strokeIndex": 5, "yardages": {"men": 351, "ladies": 291}},
    {"number": 11, "par": 3, "strokeIndex": 8, "yardages": {"men": 200, "ladies": 176}},
    {"number": 12, "par": 5, "strokeIndex": 12, "yardages": {"men": 498, "ladies": 401}},
    {"number": 13, "par": 4, "strokeIndex": 9, "yardages": {"men": 355, "ladies": 279}},
    {"number": 14, "par": 4, "strokeIndex": 1, "yardages": {"men": 371, "ladies": 330}},
    {"number": 15, "par": 3, "strokeIndex": 16, "yardages": {"men": 136, "ladies": 128}},
    {"number": 16, "par": 5, "strokeIndex": 2, "yardages": {"men": 500, "ladies": 434}},
    {"number": 17, "par": 3, "strokeIndex": 4, "yardages": {"men": 171, "ladies": 125}},
    {"number": 18, "par": 4, "strokeIndex": 10, "yardages": {"men": 302, "ladies": 253}}
  ]'::jsonb,
  '[
    {"name": "Men", "color": "blue", "courseRating": 70.0, "slopeRating": 120, "totalYardage": 5372},
    {"name": "Ladies", "color": "red", "courseRating": 72.0, "slopeRating": 114, "totalYardage": 4793}
  ]'::jsonb
)
ON CONFLICT (venue_id, name) DO UPDATE SET
  description = EXCLUDED.description,
  slope_rating = EXCLUDED.slope_rating,
  course_rating = EXCLUDED.course_rating,
  holes = EXCLUDED.holes,
  tees = EXCLUDED.tees;

-- Springwood Country Club (Opened 1905)
INSERT INTO venues (id, source, name, state, city, address, phone, website, total_holes)
VALUES (
  'f2a3b4c5-d6e7-8901-abcd-400000000717',
  'manual',
  'Springwood Country Club',
  'NSW',
  'Springwood',
  'Hawkesbury Road, Springwood NSW 2777',
  '+61 2 4751 1144',
  'https://www.springwoodcc.com.au',
  18
)
ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name,
  address = EXCLUDED.address,
  phone = EXCLUDED.phone,
  website = EXCLUDED.website;

INSERT INTO courses (venue_id, name, description, slope_rating, course_rating, holes, tees)
VALUES (
  'f2a3b4c5-d6e7-8901-abcd-400000000717',
  'Springwood',
  'Parkland course opened 1905 at the gateway to the Blue Mountains. Par 69 layout with five par 3s. Tree-lined fairways and challenging undulating terrain.',
  126,
  69.0,
  '[
    {"number": 1, "par": 4, "strokeIndex": 2, "yardages": {"white": 399, "red": 397}},
    {"number": 2, "par": 5, "strokeIndex": 4, "yardages": {"white": 478, "red": 447}},
    {"number": 3, "par": 3, "strokeIndex": 8, "yardages": {"white": 173, "red": 157}},
    {"number": 4, "par": 4, "strokeIndex": 12, "yardages": {"white": 293, "red": 277}},
    {"number": 5, "par": 4, "strokeIndex": 6, "yardages": {"white": 375, "red": 355}},
    {"number": 6, "par": 3, "strokeIndex": 18, "yardages": {"white": 125, "red": 112}},
    {"number": 7, "par": 4, "strokeIndex": 10, "yardages": {"white": 359, "red": 348}},
    {"number": 8, "par": 3, "strokeIndex": 14, "yardages": {"white": 163, "red": 141}},
    {"number": 9, "par": 4, "strokeIndex": 16, "yardages": {"white": 275, "red": 259}},
    {"number": 10, "par": 4, "strokeIndex": 17, "yardages": {"white": 301, "red": 299}},
    {"number": 11, "par": 4, "strokeIndex": 9, "yardages": {"white": 325, "red": 309}},
    {"number": 12, "par": 4, "strokeIndex": 13, "yardages": {"white": 295, "red": 291}},
    {"number": 13, "par": 3, "strokeIndex": 3, "yardages": {"white": 199, "red": 195}},
    {"number": 14, "par": 4, "strokeIndex": 1, "yardages": {"white": 358, "red": 354}},
    {"number": 15, "par": 5, "strokeIndex": 11, "yardages": {"white": 468, "red": 444}},
    {"number": 16, "par": 4, "strokeIndex": 7, "yardages": {"white": 329, "red": 309}},
    {"number": 17, "par": 4, "strokeIndex": 5, "yardages": {"white": 327, "red": 266}},
    {"number": 18, "par": 3, "strokeIndex": 15, "yardages": {"white": 149, "red": 146}}
  ]'::jsonb,
  '[
    {"name": "White", "color": "white", "courseRating": 69.0, "slopeRating": 126, "totalYardage": 5391},
    {"name": "Red", "color": "red", "courseRating": 74.0, "slopeRating": 128, "totalYardage": 5106}
  ]'::jsonb
)
ON CONFLICT (venue_id, name) DO UPDATE SET
  description = EXCLUDED.description,
  slope_rating = EXCLUDED.slope_rating,
  course_rating = EXCLUDED.course_rating,
  holes = EXCLUDED.holes,
  tees = EXCLUDED.tees;

-- Blackheath Golf Club (Opened 1922)
INSERT INTO venues (id, source, name, state, city, address, phone, website, total_holes)
VALUES (
  'f2a3b4c5-d6e7-8901-abcd-400000000718',
  'manual',
  'Blackheath Golf Club',
  'NSW',
  'Blackheath',
  'Bundarra Road, Blackheath NSW 2785',
  '+61 2 4787 8406',
  'https://www.blackheathgolf.com.au',
  18
)
ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name,
  address = EXCLUDED.address,
  phone = EXCLUDED.phone,
  website = EXCLUDED.website;

INSERT INTO courses (venue_id, name, description, slope_rating, course_rating, holes, tees)
VALUES (
  'f2a3b4c5-d6e7-8901-abcd-400000000718',
  'Blackheath',
  'Mountain parkland course opened 1922 in the upper Blue Mountains. Par 69 layout with six par 3s and three par 5s. Cool highland climate with stunning views.',
  118,
  69.0,
  '[
    {"number": 1, "par": 5, "strokeIndex": 15, "yardages": {"men": 481, "women": 466}},
    {"number": 2, "par": 3, "strokeIndex": 8, "yardages": {"men": 157, "women": 150}},
    {"number": 3, "par": 4, "strokeIndex": 3, "yardages": {"men": 378, "women": 370}},
    {"number": 4, "par": 5, "strokeIndex": 17, "yardages": {"men": 450, "women": 382}},
    {"number": 5, "par": 3, "strokeIndex": 10, "yardages": {"men": 162, "women": 133}},
    {"number": 6, "par": 4, "strokeIndex": 6, "yardages": {"men": 365, "women": 362}},
    {"number": 7, "par": 3, "strokeIndex": 14, "yardages": {"men": 146, "women": 121}},
    {"number": 8, "par": 4, "strokeIndex": 12, "yardages": {"men": 320, "women": 307}},
    {"number": 9, "par": 4, "strokeIndex": 1, "yardages": {"men": 360, "women": 353}},
    {"number": 10, "par": 5, "strokeIndex": 16, "yardages": {"men": 439, "women": 435}},
    {"number": 11, "par": 4, "strokeIndex": 9, "yardages": {"men": 307, "women": 294}},
    {"number": 12, "par": 4, "strokeIndex": 13, "yardages": {"men": 308, "women": 285}},
    {"number": 13, "par": 3, "strokeIndex": 11, "yardages": {"men": 156, "women": 140}},
    {"number": 14, "par": 3, "strokeIndex": 4, "yardages": {"men": 190, "women": 175}},
    {"number": 15, "par": 4, "strokeIndex": 7, "yardages": {"men": 314, "women": 265}},
    {"number": 16, "par": 4, "strokeIndex": 2, "yardages": {"men": 351, "women": 306}},
    {"number": 17, "par": 3, "strokeIndex": 18, "yardages": {"men": 120, "women": 124}},
    {"number": 18, "par": 4, "strokeIndex": 5, "yardages": {"men": 345, "women": 307}}
  ]'::jsonb,
  '[
    {"name": "Men", "color": "blue", "courseRating": 69.0, "slopeRating": 118, "totalYardage": 5349},
    {"name": "Women", "color": "red", "courseRating": 70.0, "slopeRating": 116, "totalYardage": 4975}
  ]'::jsonb
)
ON CONFLICT (venue_id, name) DO UPDATE SET
  description = EXCLUDED.description,
  slope_rating = EXCLUDED.slope_rating,
  course_rating = EXCLUDED.course_rating,
  holes = EXCLUDED.holes,
  tees = EXCLUDED.tees;

-- Wentworth Falls Country Club
INSERT INTO venues (id, source, name, state, city, address, phone, website, total_holes)
VALUES (
  'f2a3b4c5-d6e7-8901-abcd-400000000719',
  'manual',
  'Wentworth Falls Country Club',
  'NSW',
  'Wentworth Falls',
  'Blaxland Road, Wentworth Falls NSW 2782',
  '+61 2 4757 1202',
  'https://www.wfcc.com.au',
  18
)
ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name,
  address = EXCLUDED.address,
  phone = EXCLUDED.phone,
  website = EXCLUDED.website;

INSERT INTO courses (venue_id, name, description, slope_rating, course_rating, holes, tees)
VALUES (
  'f2a3b4c5-d6e7-8901-abcd-400000000719',
  'Wentworth Falls',
  'Semi-private parkland course in the Blue Mountains. Par 70 layout with five par 3s and two par 5s. Mountain views and native bushland setting.',
  122,
  70.0,
  '[
    {"number": 1, "par": 4, "strokeIndex": 10, "yardages": {"men": 377, "ladies": 363}},
    {"number": 2, "par": 4, "strokeIndex": 5, "yardages": {"men": 368, "ladies": 363}},
    {"number": 3, "par": 5, "strokeIndex": 15, "yardages": {"men": 483, "ladies": 469}},
    {"number": 4, "par": 4, "strokeIndex": 8, "yardages": {"men": 339, "ladies": 335}},
    {"number": 5, "par": 3, "strokeIndex": 14, "yardages": {"men": 131, "ladies": 116}},
    {"number": 6, "par": 4, "strokeIndex": 18, "yardages": {"men": 287, "ladies": 268}},
    {"number": 7, "par": 4, "strokeIndex": 2, "yardages": {"men": 392, "ladies": 385}},
    {"number": 8, "par": 4, "strokeIndex": 6, "yardages": {"men": 379, "ladies": 303}},
    {"number": 9, "par": 3, "strokeIndex": 13, "yardages": {"men": 148, "ladies": 128}},
    {"number": 10, "par": 4, "strokeIndex": 3, "yardages": {"men": 359, "ladies": 305}},
    {"number": 11, "par": 3, "strokeIndex": 7, "yardages": {"men": 188, "ladies": 177}},
    {"number": 12, "par": 3, "strokeIndex": 12, "yardages": {"men": 148, "ladies": 141}},
    {"number": 13, "par": 4, "strokeIndex": 4, "yardages": {"men": 368, "ladies": 369}},
    {"number": 14, "par": 5, "strokeIndex": 16, "yardages": {"men": 445, "ladies": 416}},
    {"number": 15, "par": 3, "strokeIndex": 9, "yardages": {"men": 182, "ladies": 163}},
    {"number": 16, "par": 4, "strokeIndex": 1, "yardages": {"men": 408, "ladies": 394}},
    {"number": 17, "par": 5, "strokeIndex": 11, "yardages": {"men": 467, "ladies": 452}},
    {"number": 18, "par": 4, "strokeIndex": 17, "yardages": {"men": 270, "ladies": 227}}
  ]'::jsonb,
  '[
    {"name": "Men", "color": "blue", "courseRating": 70.0, "slopeRating": 122, "totalYardage": 5739},
    {"name": "Ladies", "color": "red", "courseRating": 74.0, "slopeRating": 124, "totalYardage": 5374}
  ]'::jsonb
)
ON CONFLICT (venue_id, name) DO UPDATE SET
  description = EXCLUDED.description,
  slope_rating = EXCLUDED.slope_rating,
  course_rating = EXCLUDED.course_rating,
  holes = EXCLUDED.holes,
  tees = EXCLUDED.tees;

-- =====================================================
-- CENTRAL WEST REGION
-- =====================================================

-- Bathurst Golf Club (Established 1894)
INSERT INTO venues (id, source, name, state, city, address, phone, website, total_holes)
VALUES (
  'f2a3b4c5-d6e7-8901-abcd-400000000720',
  'manual',
  'Bathurst Golf Club',
  'NSW',
  'Bathurst',
  'Sydney Road, Bathurst NSW 2795',
  '+61 2 6331 1729',
  'https://www.bathurstgolf.com.au',
  18
)
ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name,
  address = EXCLUDED.address,
  phone = EXCLUDED.phone,
  website = EXCLUDED.website;

INSERT INTO courses (venue_id, name, description, slope_rating, course_rating, holes, tees)
VALUES (
  'f2a3b4c5-d6e7-8901-abcd-400000000720',
  'Bathurst',
  'Historic parkland course established 1894 in regional NSW. Par 71 layout with three par 5s and four par 3s. Well-maintained with tree-lined fairways.',
  136,
  72.0,
  '[
    {"number": 1, "par": 4, "strokeIndex": 6, "yardages": {"blue": 368, "red": 294}},
    {"number": 2, "par": 5, "strokeIndex": 12, "yardages": {"blue": 462, "red": 389}},
    {"number": 3, "par": 4, "strokeIndex": 9, "yardages": {"blue": 392, "red": 372}},
    {"number": 4, "par": 4, "strokeIndex": 16, "yardages": {"blue": 299, "red": 202}},
    {"number": 5, "par": 3, "strokeIndex": 2, "yardages": {"blue": 190, "red": 140}},
    {"number": 6, "par": 4, "strokeIndex": 4, "yardages": {"blue": 386, "red": 356}},
    {"number": 7, "par": 4, "strokeIndex": 7, "yardages": {"blue": 377, "red": 269}},
    {"number": 8, "par": 3, "strokeIndex": 18, "yardages": {"blue": 125, "red": 109}},
    {"number": 9, "par": 5, "strokeIndex": 13, "yardages": {"blue": 504, "red": 460}},
    {"number": 10, "par": 4, "strokeIndex": 1, "yardages": {"blue": 407, "red": 384}},
    {"number": 11, "par": 4, "strokeIndex": 17, "yardages": {"blue": 306, "red": 267}},
    {"number": 12, "par": 4, "strokeIndex": 15, "yardages": {"blue": 316, "red": 296}},
    {"number": 13, "par": 3, "strokeIndex": 10, "yardages": {"blue": 158, "red": 121}},
    {"number": 14, "par": 4, "strokeIndex": 8, "yardages": {"blue": 326, "red": 295}},
    {"number": 15, "par": 5, "strokeIndex": 11, "yardages": {"blue": 525, "red": 435}},
    {"number": 16, "par": 3, "strokeIndex": 3, "yardages": {"blue": 191, "red": 159}},
    {"number": 17, "par": 4, "strokeIndex": 14, "yardages": {"blue": 342, "red": 335}},
    {"number": 18, "par": 4, "strokeIndex": 5, "yardages": {"blue": 391, "red": 356}}
  ]'::jsonb,
  '[
    {"name": "Blue", "color": "blue", "courseRating": 72.0, "slopeRating": 136, "totalYardage": 6065},
    {"name": "Red", "color": "red", "courseRating": 73.0, "slopeRating": 127, "totalYardage": 5239}
  ]'::jsonb
)
ON CONFLICT (venue_id, name) DO UPDATE SET
  description = EXCLUDED.description,
  slope_rating = EXCLUDED.slope_rating,
  course_rating = EXCLUDED.course_rating,
  holes = EXCLUDED.holes,
  tees = EXCLUDED.tees;

-- Mudgee Golf Club
INSERT INTO venues (id, source, name, state, city, address, phone, website, total_holes)
VALUES (
  'f2a3b4c5-d6e7-8901-abcd-400000000721',
  'manual',
  'Mudgee Golf Club',
  'NSW',
  'Mudgee',
  'Golf Links Road, Mudgee NSW 2850',
  '+61 2 6372 1488',
  'https://www.mudgeegolfclub.com.au',
  18
)
ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name,
  address = EXCLUDED.address,
  phone = EXCLUDED.phone,
  website = EXCLUDED.website;

INSERT INTO courses (venue_id, name, description, slope_rating, course_rating, holes, tees)
VALUES (
  'f2a3b4c5-d6e7-8901-abcd-400000000721',
  'Mudgee',
  'Parkland course in the heart of wine country. Par 71 layout with three par 5s and four par 3s. Well-maintained with scenic views of the surrounding vineyards.',
  123,
  72.0,
  '[
    {"number": 1, "par": 4, "strokeIndex": 16, "yardages": {"blue": 329}},
    {"number": 2, "par": 4, "strokeIndex": 8, "yardages": {"blue": 324}},
    {"number": 3, "par": 4, "strokeIndex": 18, "yardages": {"blue": 338}},
    {"number": 4, "par": 3, "strokeIndex": 14, "yardages": {"blue": 168}},
    {"number": 5, "par": 5, "strokeIndex": 12, "yardages": {"blue": 497}},
    {"number": 6, "par": 4, "strokeIndex": 2, "yardages": {"blue": 401}},
    {"number": 7, "par": 3, "strokeIndex": 6, "yardages": {"blue": 200}},
    {"number": 8, "par": 5, "strokeIndex": 10, "yardages": {"blue": 479}},
    {"number": 9, "par": 4, "strokeIndex": 4, "yardages": {"blue": 375}},
    {"number": 10, "par": 4, "strokeIndex": 9, "yardages": {"blue": 340}},
    {"number": 11, "par": 3, "strokeIndex": 15, "yardages": {"blue": 146}},
    {"number": 12, "par": 4, "strokeIndex": 1, "yardages": {"blue": 393}},
    {"number": 13, "par": 5, "strokeIndex": 5, "yardages": {"blue": 542}},
    {"number": 14, "par": 4, "strokeIndex": 13, "yardages": {"blue": 325}},
    {"number": 15, "par": 4, "strokeIndex": 11, "yardages": {"blue": 352}},
    {"number": 16, "par": 4, "strokeIndex": 7, "yardages": {"blue": 338}},
    {"number": 17, "par": 3, "strokeIndex": 17, "yardages": {"blue": 127}},
    {"number": 18, "par": 4, "strokeIndex": 3, "yardages": {"blue": 374}}
  ]'::jsonb,
  '[
    {"name": "Blue", "color": "blue", "courseRating": 72.0, "slopeRating": 123, "totalYardage": 6048}
  ]'::jsonb
)
ON CONFLICT (venue_id, name) DO UPDATE SET
  description = EXCLUDED.description,
  slope_rating = EXCLUDED.slope_rating,
  course_rating = EXCLUDED.course_rating,
  holes = EXCLUDED.holes,
  tees = EXCLUDED.tees;

-- =====================================================
-- RIVERINA REGION
-- =====================================================

-- Wagga Wagga Country Club
INSERT INTO venues (id, source, name, state, city, address, phone, website, total_holes)
VALUES (
  'f2a3b4c5-d6e7-8901-abcd-400000000722',
  'manual',
  'Wagga Wagga Country Club',
  'NSW',
  'Wagga Wagga',
  'Bourke Street, Wagga Wagga NSW 2650',
  '+61 2 6921 2964',
  'https://www.waggacountryclub.com.au',
  18
)
ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name,
  address = EXCLUDED.address,
  phone = EXCLUDED.phone,
  website = EXCLUDED.website;

INSERT INTO courses (venue_id, name, description, slope_rating, course_rating, holes, tees)
VALUES (
  'f2a3b4c5-d6e7-8901-abcd-400000000722',
  'Wagga Wagga',
  'Premier parkland course in the Riverina. Par 72 layout with four par 5s and four par 3s. Well-maintained with excellent playing surfaces year-round.',
  128,
  72.0,
  '[
    {"number": 1, "par": 4, "strokeIndex": 6, "yardages": {"blue": 376, "white": 364, "red": 343}},
    {"number": 2, "par": 3, "strokeIndex": 18, "yardages": {"blue": 123, "white": 117, "red": 117}},
    {"number": 3, "par": 5, "strokeIndex": 10, "yardages": {"blue": 472, "white": 456, "red": 407}},
    {"number": 4, "par": 4, "strokeIndex": 12, "yardages": {"blue": 340, "white": 328, "red": 335}},
    {"number": 5, "par": 4, "strokeIndex": 2, "yardages": {"blue": 400, "white": 379, "red": 395}},
    {"number": 6, "par": 5, "strokeIndex": 16, "yardages": {"blue": 457, "white": 444, "red": 392}},
    {"number": 7, "par": 3, "strokeIndex": 14, "yardages": {"blue": 147, "white": 139, "red": 103}},
    {"number": 8, "par": 4, "strokeIndex": 4, "yardages": {"blue": 355, "white": 344, "red": 299}},
    {"number": 9, "par": 4, "strokeIndex": 8, "yardages": {"blue": 307, "white": 299, "red": 302}},
    {"number": 10, "par": 3, "strokeIndex": 3, "yardages": {"blue": 213, "white": 195, "red": 179}},
    {"number": 11, "par": 4, "strokeIndex": 11, "yardages": {"blue": 312, "white": 300, "red": 274}},
    {"number": 12, "par": 5, "strokeIndex": 15, "yardages": {"blue": 482, "white": 454, "red": 421}},
    {"number": 13, "par": 4, "strokeIndex": 9, "yardages": {"blue": 375, "white": 357, "red": 310}},
    {"number": 14, "par": 3, "strokeIndex": 13, "yardages": {"blue": 154, "white": 135, "red": 120}},
    {"number": 15, "par": 5, "strokeIndex": 5, "yardages": {"blue": 505, "white": 490, "red": 407}},
    {"number": 16, "par": 5, "strokeIndex": 17, "yardages": {"blue": 477, "white": 466, "red": 431}},
    {"number": 17, "par": 4, "strokeIndex": 1, "yardages": {"blue": 379, "white": 354, "red": 323}},
    {"number": 18, "par": 3, "strokeIndex": 7, "yardages": {"blue": 180, "white": 167, "red": 147}}
  ]'::jsonb,
  '[
    {"name": "Blue", "color": "blue", "courseRating": 72.0, "slopeRating": 128, "totalYardage": 6054},
    {"name": "White", "color": "white", "courseRating": 71.0, "slopeRating": 126, "totalYardage": 5788},
    {"name": "Red", "color": "red", "courseRating": 73.0, "slopeRating": 127, "totalYardage": 5305}
  ]'::jsonb
)
ON CONFLICT (venue_id, name) DO UPDATE SET
  description = EXCLUDED.description,
  slope_rating = EXCLUDED.slope_rating,
  course_rating = EXCLUDED.course_rating,
  holes = EXCLUDED.holes,
  tees = EXCLUDED.tees;

-- Griffith Golf Club
INSERT INTO venues (id, source, name, state, city, address, phone, website, total_holes)
VALUES (
  'f2a3b4c5-d6e7-8901-abcd-400000000723',
  'manual',
  'Griffith Golf Club',
  'NSW',
  'Griffith',
  'Wyangan Avenue, Griffith NSW 2680',
  '+61 2 6962 1499',
  'https://www.griffithgolfclub.com.au',
  18
)
ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name,
  address = EXCLUDED.address,
  phone = EXCLUDED.phone,
  website = EXCLUDED.website;

INSERT INTO courses (venue_id, name, description, slope_rating, course_rating, holes, tees)
VALUES (
  'f2a3b4c5-d6e7-8901-abcd-400000000723',
  'Griffith',
  'Parkland course in the Murrumbidgee Irrigation Area. Par 71 layout with three par 5s and four par 3s. Tree-lined fairways and well-maintained greens.',
  122,
  71.0,
  '[
    {"number": 1, "par": 4, "strokeIndex": 14, "yardages": {"men": 325, "ladies": 302}},
    {"number": 2, "par": 4, "strokeIndex": 4, "yardages": {"men": 371, "ladies": 371}},
    {"number": 3, "par": 4, "strokeIndex": 6, "yardages": {"men": 342, "ladies": 309}},
    {"number": 4, "par": 3, "strokeIndex": 2, "yardages": {"men": 189, "ladies": 144}},
    {"number": 5, "par": 5, "strokeIndex": 10, "yardages": {"men": 493, "ladies": 422}},
    {"number": 6, "par": 4, "strokeIndex": 8, "yardages": {"men": 337, "ladies": 337}},
    {"number": 7, "par": 3, "strokeIndex": 18, "yardages": {"men": 141, "ladies": 135}},
    {"number": 8, "par": 4, "strokeIndex": 16, "yardages": {"men": 289, "ladies": 294}},
    {"number": 9, "par": 5, "strokeIndex": 12, "yardages": {"men": 481, "ladies": 412}},
    {"number": 10, "par": 4, "strokeIndex": 9, "yardages": {"men": 364, "ladies": 289}},
    {"number": 11, "par": 3, "strokeIndex": 11, "yardages": {"men": 173, "ladies": 125}},
    {"number": 12, "par": 4, "strokeIndex": 1, "yardages": {"men": 382, "ladies": 384}},
    {"number": 13, "par": 4, "strokeIndex": 3, "yardages": {"men": 372, "ladies": 338}},
    {"number": 14, "par": 4, "strokeIndex": 5, "yardages": {"men": 348, "ladies": 312}},
    {"number": 15, "par": 4, "strokeIndex": 17, "yardages": {"men": 281, "ladies": 258}},
    {"number": 16, "par": 3, "strokeIndex": 15, "yardages": {"men": 156, "ladies": 156}},
    {"number": 17, "par": 5, "strokeIndex": 13, "yardages": {"men": 493, "ladies": 425}},
    {"number": 18, "par": 4, "strokeIndex": 7, "yardages": {"men": 356, "ladies": 300}}
  ]'::jsonb,
  '[
    {"name": "Men", "color": "blue", "courseRating": 71.0, "slopeRating": 122, "totalYardage": 5893},
    {"name": "Ladies", "color": "red", "courseRating": 72.0, "slopeRating": 120, "totalYardage": 5313}
  ]'::jsonb
)
ON CONFLICT (venue_id, name) DO UPDATE SET
  description = EXCLUDED.description,
  slope_rating = EXCLUDED.slope_rating,
  course_rating = EXCLUDED.course_rating,
  holes = EXCLUDED.holes,
  tees = EXCLUDED.tees;

-- =====================================================
-- MURRAY REGION
-- =====================================================

-- Deniliquin Golf Club
INSERT INTO venues (id, source, name, state, city, address, phone, website, total_holes)
VALUES (
  'f2a3b4c5-d6e7-8901-abcd-400000000724',
  'manual',
  'Deniliquin Golf Club',
  'NSW',
  'Deniliquin',
  'Golf Club Road, Deniliquin NSW 2710',
  '+61 3 5881 2533',
  'https://www.denigolf.com.au',
  18
)
ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name,
  address = EXCLUDED.address,
  phone = EXCLUDED.phone,
  website = EXCLUDED.website;

INSERT INTO courses (venue_id, name, description, slope_rating, course_rating, holes, tees)
VALUES (
  'f2a3b4c5-d6e7-8901-abcd-400000000724',
  'Deniliquin',
  'Parkland course in the Murray region. Par 72 layout with four par 5s and six par 3s. River red gums line the fairways providing a unique outback feel.',
  125,
  71.0,
  '[
    {"number": 1, "par": 5, "strokeIndex": 18, "yardages": {"blue": 429, "red": 364}},
    {"number": 2, "par": 3, "strokeIndex": 2, "yardages": {"blue": 216, "red": 170}},
    {"number": 3, "par": 4, "strokeIndex": 12, "yardages": {"blue": 325, "red": 312}},
    {"number": 4, "par": 4, "strokeIndex": 8, "yardages": {"blue": 338, "red": 296}},
    {"number": 5, "par": 3, "strokeIndex": 14, "yardages": {"blue": 127, "red": 112}},
    {"number": 6, "par": 4, "strokeIndex": 4, "yardages": {"blue": 367, "red": 296}},
    {"number": 7, "par": 4, "strokeIndex": 6, "yardages": {"blue": 359, "red": 301}},
    {"number": 8, "par": 5, "strokeIndex": 16, "yardages": {"blue": 431, "red": 407}},
    {"number": 9, "par": 3, "strokeIndex": 10, "yardages": {"blue": 170, "red": 150}},
    {"number": 10, "par": 4, "strokeIndex": 1, "yardages": {"blue": 387, "red": 325}},
    {"number": 11, "par": 3, "strokeIndex": 9, "yardages": {"blue": 170, "red": 145}},
    {"number": 12, "par": 5, "strokeIndex": 5, "yardages": {"blue": 445, "red": 406}},
    {"number": 13, "par": 3, "strokeIndex": 7, "yardages": {"blue": 151, "red": 134}},
    {"number": 14, "par": 5, "strokeIndex": 11, "yardages": {"blue": 486, "red": 426}},
    {"number": 15, "par": 4, "strokeIndex": 3, "yardages": {"blue": 378, "red": 337}},
    {"number": 16, "par": 4, "strokeIndex": 15, "yardages": {"blue": 303, "red": 275}},
    {"number": 17, "par": 4, "strokeIndex": 13, "yardages": {"blue": 286, "red": 235}},
    {"number": 18, "par": 5, "strokeIndex": 17, "yardages": {"blue": 447, "red": 427}}
  ]'::jsonb,
  '[
    {"name": "Blue", "color": "blue", "courseRating": 71.0, "slopeRating": 125, "totalYardage": 5815},
    {"name": "Red", "color": "red", "courseRating": 73.0, "slopeRating": 120, "totalYardage": 5118}
  ]'::jsonb
)
ON CONFLICT (venue_id, name) DO UPDATE SET
  description = EXCLUDED.description,
  slope_rating = EXCLUDED.slope_rating,
  course_rating = EXCLUDED.course_rating,
  holes = EXCLUDED.holes,
  tees = EXCLUDED.tees;

-- =====================================================
-- NEW ENGLAND REGION
-- =====================================================

-- Tamworth Golf Club
INSERT INTO venues (id, source, name, state, city, address, phone, website, total_holes)
VALUES (
  'f2a3b4c5-d6e7-8901-abcd-400000000725',
  'manual',
  'Tamworth Golf Club',
  'NSW',
  'Tamworth',
  'Golf Course Road, Tamworth NSW 2340',
  '+61 2 6765 7655',
  'https://www.tamworthgolf.com.au',
  18
)
ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name,
  address = EXCLUDED.address,
  phone = EXCLUDED.phone,
  website = EXCLUDED.website;

INSERT INTO courses (venue_id, name, description, slope_rating, course_rating, holes, tees)
VALUES (
  'f2a3b4c5-d6e7-8901-abcd-400000000725',
  'Tamworth',
  'Premier parkland course in the New England region. Par 70 layout with two par 5s and five par 3s. Tree-lined fairways and excellent playing surfaces.',
  124,
  70.0,
  '[
    {"number": 1, "par": 5, "strokeIndex": 3, "yardages": {"red": 500, "ladies": 458}},
    {"number": 2, "par": 4, "strokeIndex": 5, "yardages": {"red": 356, "ladies": 326}},
    {"number": 3, "par": 3, "strokeIndex": 16, "yardages": {"red": 120, "ladies": 110}},
    {"number": 4, "par": 4, "strokeIndex": 7, "yardages": {"red": 344, "ladies": 315}},
    {"number": 5, "par": 3, "strokeIndex": 14, "yardages": {"red": 179, "ladies": 164}},
    {"number": 6, "par": 4, "strokeIndex": 9, "yardages": {"red": 340, "ladies": 311}},
    {"number": 7, "par": 4, "strokeIndex": 1, "yardages": {"red": 380, "ladies": 348}},
    {"number": 8, "par": 5, "strokeIndex": 11, "yardages": {"red": 466, "ladies": 427}},
    {"number": 9, "par": 3, "strokeIndex": 18, "yardages": {"red": 131, "ladies": 120}},
    {"number": 10, "par": 4, "strokeIndex": 17, "yardages": {"red": 333, "ladies": 305}},
    {"number": 11, "par": 4, "strokeIndex": 8, "yardages": {"red": 427, "ladies": 391}},
    {"number": 12, "par": 4, "strokeIndex": 4, "yardages": {"red": 344, "ladies": 315}},
    {"number": 13, "par": 3, "strokeIndex": 15, "yardages": {"red": 187, "ladies": 160}},
    {"number": 14, "par": 5, "strokeIndex": 6, "yardages": {"red": 427, "ladies": 391}},
    {"number": 15, "par": 4, "strokeIndex": 10, "yardages": {"red": 313, "ladies": 287}},
    {"number": 16, "par": 3, "strokeIndex": 13, "yardages": {"red": 149, "ladies": 137}},
    {"number": 17, "par": 4, "strokeIndex": 2, "yardages": {"red": 370, "ladies": 339}},
    {"number": 18, "par": 4, "strokeIndex": 12, "yardages": {"red": 444, "ladies": 406}}
  ]'::jsonb,
  '[
    {"name": "Red", "color": "red", "courseRating": 70.0, "slopeRating": 124, "totalYardage": 5810},
    {"name": "Ladies", "color": "yellow", "courseRating": 73.0, "slopeRating": 124, "totalYardage": 5310}
  ]'::jsonb
)
ON CONFLICT (venue_id, name) DO UPDATE SET
  description = EXCLUDED.description,
  slope_rating = EXCLUDED.slope_rating,
  course_rating = EXCLUDED.course_rating,
  holes = EXCLUDED.holes,
  tees = EXCLUDED.tees;

-- Armidale Golf Club (Established 1899)
INSERT INTO venues (id, source, name, state, city, address, phone, website, total_holes)
VALUES (
  'f2a3b4c5-d6e7-8901-abcd-400000000726',
  'manual',
  'Armidale Golf Club',
  'NSW',
  'West Armidale',
  'Golf Links Road, West Armidale NSW 2350',
  '+61 2 6772 3748',
  'https://www.armidalegolf.com.au',
  18
)
ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name,
  address = EXCLUDED.address,
  phone = EXCLUDED.phone,
  website = EXCLUDED.website;

INSERT INTO courses (venue_id, name, description, slope_rating, course_rating, holes, tees)
VALUES (
  'f2a3b4c5-d6e7-8901-abcd-400000000726',
  'Armidale',
  'Historic parkland course established 1899 on the New England Tablelands. Par 72 layout with four par 5s and five par 3s. Cool highland climate and scenic mountain views.',
  125,
  72.0,
  '[
    {"number": 1, "par": 4, "strokeIndex": 11, "yardages": {"white": 334, "red": 334}},
    {"number": 2, "par": 4, "strokeIndex": 5, "yardages": {"white": 385, "red": 320}},
    {"number": 3, "par": 4, "strokeIndex": 3, "yardages": {"white": 355, "red": 342}},
    {"number": 4, "par": 3, "strokeIndex": 17, "yardages": {"white": 150, "red": 135}},
    {"number": 5, "par": 5, "strokeIndex": 10, "yardages": {"white": 489, "red": 458}},
    {"number": 6, "par": 4, "strokeIndex": 14, "yardages": {"white": 325, "red": 313}},
    {"number": 7, "par": 3, "strokeIndex": 8, "yardages": {"white": 176, "red": 120}},
    {"number": 8, "par": 4, "strokeIndex": 2, "yardages": {"white": 415, "red": 372}},
    {"number": 9, "par": 5, "strokeIndex": 16, "yardages": {"white": 401, "red": 355}},
    {"number": 10, "par": 4, "strokeIndex": 9, "yardages": {"white": 348, "red": 313}},
    {"number": 11, "par": 3, "strokeIndex": 13, "yardages": {"white": 171, "red": 148}},
    {"number": 12, "par": 3, "strokeIndex": 6, "yardages": {"white": 188, "red": 175}},
    {"number": 13, "par": 5, "strokeIndex": 12, "yardages": {"white": 457, "red": 453}},
    {"number": 14, "par": 3, "strokeIndex": 4, "yardages": {"white": 146, "red": 115}},
    {"number": 15, "par": 5, "strokeIndex": 18, "yardages": {"white": 467, "red": 457}},
    {"number": 16, "par": 5, "strokeIndex": 15, "yardages": {"white": 424, "red": 366}},
    {"number": 17, "par": 4, "strokeIndex": 7, "yardages": {"white": 366, "red": 340}},
    {"number": 18, "par": 4, "strokeIndex": 1, "yardages": {"white": 398, "red": 335}}
  ]'::jsonb,
  '[
    {"name": "White", "color": "white", "courseRating": 72.0, "slopeRating": 125, "totalYardage": 5995},
    {"name": "Red", "color": "red", "courseRating": 73.0, "slopeRating": 124, "totalYardage": 5451}
  ]'::jsonb
)
ON CONFLICT (venue_id, name) DO UPDATE SET
  description = EXCLUDED.description,
  slope_rating = EXCLUDED.slope_rating,
  course_rating = EXCLUDED.course_rating,
  holes = EXCLUDED.holes,
  tees = EXCLUDED.tees;

-- =====================================================
-- SNOWY MOUNTAINS REGION
-- =====================================================

-- Cooma Golf Club
INSERT INTO venues (id, source, name, state, city, address, phone, website, total_holes)
VALUES (
  'f2a3b4c5-d6e7-8901-abcd-400000000727',
  'manual',
  'Cooma Golf Club',
  'NSW',
  'Cooma',
  'Golf Links Road, Cooma NSW 2630',
  '+61 2 6452 1072',
  'https://www.coomagolfclub.com.au',
  18
)
ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name,
  address = EXCLUDED.address,
  phone = EXCLUDED.phone,
  website = EXCLUDED.website;

INSERT INTO courses (venue_id, name, description, slope_rating, course_rating, holes, tees)
VALUES (
  'f2a3b4c5-d6e7-8901-abcd-400000000727',
  'Cooma',
  'Highland parkland course gateway to the Snowy Mountains. Par 72 layout with four par 5s and four par 3s. Cool alpine climate provides excellent summer playing conditions.',
  119,
  72.0,
  '[
    {"number": 1, "par": 4, "strokeIndex": 14, "yardages": {"blue": 290, "red": 257}},
    {"number": 2, "par": 4, "strokeIndex": 3, "yardages": {"blue": 389, "red": 334}},
    {"number": 3, "par": 5, "strokeIndex": 12, "yardages": {"blue": 443, "red": 443}},
    {"number": 4, "par": 3, "strokeIndex": 11, "yardages": {"blue": 220, "red": 174}},
    {"number": 5, "par": 4, "strokeIndex": 2, "yardages": {"blue": 387, "red": 387}},
    {"number": 6, "par": 4, "strokeIndex": 8, "yardages": {"blue": 339, "red": 260}},
    {"number": 7, "par": 4, "strokeIndex": 6, "yardages": {"blue": 344, "red": 344}},
    {"number": 8, "par": 5, "strokeIndex": 18, "yardages": {"blue": 452, "red": 381}},
    {"number": 9, "par": 3, "strokeIndex": 16, "yardages": {"blue": 148, "red": 148}},
    {"number": 10, "par": 4, "strokeIndex": 13, "yardages": {"blue": 334, "red": 323}},
    {"number": 11, "par": 3, "strokeIndex": 10, "yardages": {"blue": 178, "red": 128}},
    {"number": 12, "par": 4, "strokeIndex": 1, "yardages": {"blue": 369, "red": 286}},
    {"number": 13, "par": 4, "strokeIndex": 4, "yardages": {"blue": 353, "red": 333}},
    {"number": 14, "par": 5, "strokeIndex": 9, "yardages": {"blue": 491, "red": 435}},
    {"number": 15, "par": 4, "strokeIndex": 5, "yardages": {"blue": 373, "red": 297}},
    {"number": 16, "par": 5, "strokeIndex": 15, "yardages": {"blue": 462, "red": 436}},
    {"number": 17, "par": 3, "strokeIndex": 17, "yardages": {"blue": 133, "red": 133}},
    {"number": 18, "par": 4, "strokeIndex": 7, "yardages": {"blue": 316, "red": 312}}
  ]'::jsonb,
  '[
    {"name": "Blue", "color": "blue", "courseRating": 72.0, "slopeRating": 119, "totalYardage": 6021},
    {"name": "Red", "color": "red", "courseRating": 74.0, "slopeRating": 125, "totalYardage": 5411}
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
-- New Venues Added in Batch 7 (Parts 1 & 2): 27
--
-- Part 1 (Illawarra, South Coast, Southern Highlands):
--   - Wollongong Golf Club
--   - Kiama Golf Club
--   - Port Kembla Golf Club
--   - Narooma Golf Club
--   - Nowra Golf Club
--   - Bega Country Club
--   - Moruya Golf Club
--   - Tura Beach Country Club
--   - Tathra Beach Country Club
--   - Bermagui Country Club
--   - Bowral Golf Club
--   - Goulburn Golf Club
--   - Moss Vale Golf Club
--   - Highlands Golf Club
--   - Queanbeyan Golf Club
--
-- Part 2 (Blue Mountains, Central West, Riverina, Murray, New England, Snowy):
--   - Leura Golf Club
--   - Springwood Country Club
--   - Blackheath Golf Club
--   - Wentworth Falls Country Club
--   - Bathurst Golf Club
--   - Mudgee Golf Club
--   - Wagga Wagga Country Club
--   - Griffith Golf Club
--   - Deniliquin Golf Club
--   - Tamworth Golf Club
--   - Armidale Golf Club
--   - Cooma Golf Club
--
-- Total Courses with Full Hole Data: 27
-- =====================================================
