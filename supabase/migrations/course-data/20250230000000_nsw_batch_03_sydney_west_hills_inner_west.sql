-- =====================================================
-- Migration: nsw_batch_03_sydney_west_hills_inner_west
-- Description: Add Sydney West, Hills District & Inner West golf venues and courses
--              Part of NSW golf course data collection
-- Date: 2025-12-10
-- Batch: 3 of 7 (Sydney West, Hills District & Inner West)
-- =====================================================

-- =====================================================
-- STEP 1: INSERT NEW VENUES
-- Using ON CONFLICT to handle re-runs safely
-- =====================================================

-- Castle Hill Country Club
INSERT INTO venues (id, source, name, state, city, address, phone, website, total_holes)
VALUES (
  'f2a3b4c5-d6e7-8901-abcd-200000000201',
  'manual',
  'Castle Hill Country Club',
  'NSW',
  'Baulkham Hills',
  'McLean Street, Baulkham Hills NSW 2153',
  '+61 2 9634 2422',
  'https://www.castlehillcountryclub.com.au',
  18
)
ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name,
  address = EXCLUDED.address,
  phone = EXCLUDED.phone,
  website = EXCLUDED.website;

-- Muirfield Golf Club
INSERT INTO venues (id, source, name, state, city, address, phone, website, total_holes)
VALUES (
  'f2a3b4c5-d6e7-8901-abcd-200000000202',
  'manual',
  'Muirfield Golf Club',
  'NSW',
  'North Rocks',
  'Barclay Road, North Rocks NSW 2151',
  '+61 2 9871 1388',
  'https://www.muirfieldgolf.com.au',
  18
)
ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name,
  address = EXCLUDED.address,
  phone = EXCLUDED.phone,
  website = EXCLUDED.website;

-- Twin Creeks Golf & Country Club
INSERT INTO venues (id, source, name, state, city, address, phone, website, total_holes)
VALUES (
  'f2a3b4c5-d6e7-8901-abcd-200000000203',
  'manual',
  'Twin Creeks Golf & Country Club',
  'NSW',
  'Luddenham',
  '2-8 Twin Creeks Drive, Luddenham NSW 2745',
  '+61 2 4773 4000',
  'https://www.twincreeksgolf.com.au',
  18
)
ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name,
  address = EXCLUDED.address,
  phone = EXCLUDED.phone,
  website = EXCLUDED.website;

-- Stonecutters Ridge Golf Club
INSERT INTO venues (id, source, name, state, city, address, phone, website, total_holes)
VALUES (
  'f2a3b4c5-d6e7-8901-abcd-200000000204',
  'manual',
  'Stonecutters Ridge Golf Club',
  'NSW',
  'Colebee',
  '86 Stonecutters Drive, Colebee NSW 2761',
  '+61 2 9626 5555',
  'https://www.stonecuttersgc.com.au',
  18
)
ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name,
  address = EXCLUDED.address,
  phone = EXCLUDED.phone,
  website = EXCLUDED.website;

-- Riverside Oaks Golf Resort
INSERT INTO venues (id, source, name, state, city, address, phone, website, total_holes)
VALUES (
  'f2a3b4c5-d6e7-8901-abcd-200000000205',
  'manual',
  'Riverside Oaks Golf Resort',
  'NSW',
  'Cattai',
  '74 O''Briens Road, Cattai NSW 2756',
  '+61 2 4560 3299',
  'https://www.riversideoaks.com.au',
  36
)
ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name,
  address = EXCLUDED.address,
  phone = EXCLUDED.phone,
  website = EXCLUDED.website;

-- Lynwood Country Club
INSERT INTO venues (id, source, name, state, city, address, phone, website, total_holes)
VALUES (
  'f2a3b4c5-d6e7-8901-abcd-200000000206',
  'manual',
  'Lynwood Country Club',
  'NSW',
  'Pitt Town',
  '4 Pitt Town Bottoms Road, Pitt Town NSW 2756',
  '+61 2 4572 5455',
  'https://www.lynwoodcc.com.au',
  18
)
ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name,
  address = EXCLUDED.address,
  phone = EXCLUDED.phone,
  website = EXCLUDED.website;

-- Oatlands Golf Club
INSERT INTO venues (id, source, name, state, city, address, phone, website, total_holes)
VALUES (
  'f2a3b4c5-d6e7-8901-abcd-200000000207',
  'manual',
  'Oatlands Golf Club',
  'NSW',
  'Oatlands',
  'Bettington Road, Oatlands NSW 2117',
  '+61 2 9630 1535',
  'https://www.oatlandsgolf.com.au',
  18
)
ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name,
  address = EXCLUDED.address,
  phone = EXCLUDED.phone,
  website = EXCLUDED.website;

-- Penrith Golf & Recreation Club
INSERT INTO venues (id, source, name, state, city, address, phone, website, total_holes)
VALUES (
  'f2a3b4c5-d6e7-8901-abcd-200000000208',
  'manual',
  'Penrith Golf & Recreation Club',
  'NSW',
  'Penrith',
  'Boundary Road, Penrith NSW 2750',
  '+61 2 4721 4069',
  'https://www.penrithgolf.com.au',
  18
)
ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name,
  address = EXCLUDED.address,
  phone = EXCLUDED.phone,
  website = EXCLUDED.website;

-- Leonay Golf Club
INSERT INTO venues (id, source, name, state, city, address, phone, website, total_holes)
VALUES (
  'f2a3b4c5-d6e7-8901-abcd-200000000209',
  'manual',
  'Leonay Golf Club',
  'NSW',
  'Leonay',
  'High Street, Leonay NSW 2750',
  '+61 2 4735 1229',
  'https://www.leonaygolf.com.au',
  18
)
ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name,
  address = EXCLUDED.address,
  phone = EXCLUDED.phone,
  website = EXCLUDED.website;

-- Strathfield Golf Club
INSERT INTO venues (id, source, name, state, city, address, phone, website, total_holes)
VALUES (
  'f2a3b4c5-d6e7-8901-abcd-200000000210',
  'manual',
  'Strathfield Golf Club',
  'NSW',
  'Strathfield',
  '52 Weeroona Road, Strathfield NSW 2135',
  '+61 2 9764 1830',
  'https://www.strathfieldgolf.com.au',
  18
)
ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name,
  address = EXCLUDED.address,
  phone = EXCLUDED.phone,
  website = EXCLUDED.website;

-- Massey Park Golf Club
INSERT INTO venues (id, source, name, state, city, address, phone, website, total_holes)
VALUES (
  'f2a3b4c5-d6e7-8901-abcd-200000000211',
  'manual',
  'Massey Park Golf Club',
  'NSW',
  'Concord',
  'Ian Parade, Concord NSW 2137',
  '+61 2 9743 0297',
  'https://www.masseypark.com.au',
  18
)
ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name,
  address = EXCLUDED.address,
  phone = EXCLUDED.phone,
  website = EXCLUDED.website;

-- Glenmore Heritage Valley Golf Club
INSERT INTO venues (id, source, name, state, city, address, phone, website, total_holes)
VALUES (
  'f2a3b4c5-d6e7-8901-abcd-200000000212',
  'manual',
  'Glenmore Heritage Valley Golf Club',
  'NSW',
  'Mulgoa',
  '690 Mulgoa Road, Mulgoa NSW 2745',
  '+61 2 4773 4400',
  'https://www.glenmoregolf.com.au',
  27
)
ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name,
  address = EXCLUDED.address,
  phone = EXCLUDED.phone,
  website = EXCLUDED.website;

-- =====================================================
-- STEP 2: INSERT COURSES WITH FULL HOLE DATA
-- =====================================================

-- CASTLE HILL COUNTRY CLUB
INSERT INTO courses (venue_id, name, description, slope_rating, course_rating, holes, tees)
VALUES (
  'f2a3b4c5-d6e7-8901-abcd-200000000201',
  'Castle Hill',
  'One of Sydney''s leading private clubs, recognised in Australia''s Top 100 courses for years. Parkland course opened in 1950 featuring well-bunkered holes, strategic water hazards, and tree-lined fairways.',
  128,
  72.0,
  '[
    {"number": 1, "par": 5, "strokeIndex": 15, "yardages": {"blue": 467, "white": 451, "red": 428}},
    {"number": 2, "par": 3, "strokeIndex": 4, "yardages": {"blue": 159, "white": 150, "red": 133}},
    {"number": 3, "par": 4, "strokeIndex": 1, "yardages": {"blue": 377, "white": 377, "red": 310}},
    {"number": 4, "par": 3, "strokeIndex": 18, "yardages": {"blue": 127, "white": 113, "red": 112}},
    {"number": 5, "par": 5, "strokeIndex": 11, "yardages": {"blue": 464, "white": 464, "red": 409}},
    {"number": 6, "par": 4, "strokeIndex": 17, "yardages": {"blue": 276, "white": 261, "red": 251}},
    {"number": 7, "par": 4, "strokeIndex": 9, "yardages": {"blue": 356, "white": 340, "red": 323}},
    {"number": 8, "par": 4, "strokeIndex": 13, "yardages": {"blue": 338, "white": 316, "red": 291}},
    {"number": 9, "par": 4, "strokeIndex": 6, "yardages": {"blue": 365, "white": 365, "red": 327}},
    {"number": 10, "par": 4, "strokeIndex": 3, "yardages": {"blue": 393, "white": 373, "red": 391}},
    {"number": 11, "par": 3, "strokeIndex": 5, "yardages": {"blue": 167, "white": 147, "red": 128}},
    {"number": 12, "par": 4, "strokeIndex": 14, "yardages": {"blue": 307, "white": 282, "red": 277}},
    {"number": 13, "par": 4, "strokeIndex": 2, "yardages": {"blue": 368, "white": 348, "red": 368}},
    {"number": 14, "par": 4, "strokeIndex": 7, "yardages": {"blue": 375, "white": 351, "red": 337}},
    {"number": 15, "par": 5, "strokeIndex": 10, "yardages": {"blue": 487, "white": 475, "red": 422}},
    {"number": 16, "par": 4, "strokeIndex": 16, "yardages": {"blue": 289, "white": 267, "red": 275}},
    {"number": 17, "par": 3, "strokeIndex": 12, "yardages": {"blue": 138, "white": 129, "red": 108}},
    {"number": 18, "par": 5, "strokeIndex": 8, "yardages": {"blue": 502, "white": 489, "red": 451}}
  ]'::jsonb,
  '[
    {"name": "Blue", "color": "blue", "courseRating": 72.0, "slopeRating": 128, "totalYardage": 5955},
    {"name": "White", "color": "white", "courseRating": 71.0, "slopeRating": 126, "totalYardage": 5698},
    {"name": "Red", "color": "red", "courseRating": 74.0, "slopeRating": 132, "totalYardage": 5341}
  ]'::jsonb
)
ON CONFLICT (venue_id, name) DO UPDATE SET
  description = EXCLUDED.description,
  slope_rating = EXCLUDED.slope_rating,
  course_rating = EXCLUDED.course_rating,
  holes = EXCLUDED.holes,
  tees = EXCLUDED.tees;

-- MUIRFIELD GOLF CLUB
INSERT INTO courses (venue_id, name, description, slope_rating, course_rating, holes, tees)
VALUES (
  'f2a3b4c5-d6e7-8901-abcd-200000000202',
  'Muirfield',
  'Incorporated in 1953, Muirfield offers a unique par 69 layout for men (par 72 for women). Well-bunkered holes range from short par threes to reachable par fives across hilly terrain.',
  120,
  70.0,
  '[
    {"number": 1, "par": 5, "strokeIndex": 1, "yardages": {"mens": 485, "womens": 465}},
    {"number": 2, "par": 3, "strokeIndex": 3, "yardages": {"mens": 147, "womens": 120}},
    {"number": 3, "par": 4, "strokeIndex": 5, "yardages": {"mens": 320, "womens": 288}},
    {"number": 4, "par": 4, "strokeIndex": 7, "yardages": {"mens": 330, "womens": 291}},
    {"number": 5, "par": 4, "strokeIndex": 9, "yardages": {"mens": 415, "womens": 383}},
    {"number": 6, "par": 3, "strokeIndex": 11, "yardages": {"mens": 150, "womens": 127}},
    {"number": 7, "par": 4, "strokeIndex": 13, "yardages": {"mens": 374, "womens": 343}},
    {"number": 8, "par": 4, "strokeIndex": 15, "yardages": {"mens": 353, "womens": 326}},
    {"number": 9, "par": 3, "strokeIndex": 17, "yardages": {"mens": 154, "womens": 117}},
    {"number": 10, "par": 4, "strokeIndex": 2, "yardages": {"mens": 379, "womens": 360}},
    {"number": 11, "par": 3, "strokeIndex": 4, "yardages": {"mens": 201, "womens": 165}},
    {"number": 12, "par": 4, "strokeIndex": 6, "yardages": {"mens": 420, "womens": 380}},
    {"number": 13, "par": 5, "strokeIndex": 8, "yardages": {"mens": 470, "womens": 458}},
    {"number": 14, "par": 4, "strokeIndex": 10, "yardages": {"mens": 284, "womens": 247}},
    {"number": 15, "par": 3, "strokeIndex": 12, "yardages": {"mens": 175, "womens": 155}},
    {"number": 16, "par": 4, "strokeIndex": 14, "yardages": {"mens": 400, "womens": 374}},
    {"number": 17, "par": 4, "strokeIndex": 16, "yardages": {"mens": 297, "womens": 287}},
    {"number": 18, "par": 4, "strokeIndex": 18, "yardages": {"mens": 290, "womens": 275}}
  ]'::jsonb,
  '[
    {"name": "Mens", "color": "white", "courseRating": 70.0, "slopeRating": 120, "totalYardage": 5644},
    {"name": "Womens", "color": "red", "courseRating": 73.0, "slopeRating": 125, "totalYardage": 5161}
  ]'::jsonb
)
ON CONFLICT (venue_id, name) DO UPDATE SET
  description = EXCLUDED.description,
  slope_rating = EXCLUDED.slope_rating,
  course_rating = EXCLUDED.course_rating,
  holes = EXCLUDED.holes,
  tees = EXCLUDED.tees;

-- TWIN CREEKS GOLF & COUNTRY CLUB
INSERT INTO courses (venue_id, name, description, slope_rating, course_rating, holes, tees)
VALUES (
  'f2a3b4c5-d6e7-8901-abcd-200000000203',
  'Twin Creeks',
  'Graham Marsh designed championship course opened in 2006, ranked in Australia''s Top 100. Home of the 2017-2019 NSW Open Championships. Features 86 bunkers covering 2.5 hectares of sand, Bent grass greens and Legends couch fairways.',
  132,
  74.0,
  '[
    {"number": 1, "par": 4, "strokeIndex": 5, "yardages": {"black": 359, "gold": 340, "silver": 320, "jade": 264}},
    {"number": 2, "par": 3, "strokeIndex": 11, "yardages": {"black": 144, "gold": 134, "silver": 130, "jade": 113}},
    {"number": 3, "par": 4, "strokeIndex": 17, "yardages": {"black": 302, "gold": 282, "silver": 266, "jade": 244}},
    {"number": 4, "par": 4, "strokeIndex": 3, "yardages": {"black": 395, "gold": 376, "silver": 358, "jade": 338}},
    {"number": 5, "par": 5, "strokeIndex": 15, "yardages": {"black": 513, "gold": 489, "silver": 476, "jade": 454}},
    {"number": 6, "par": 3, "strokeIndex": 9, "yardages": {"black": 186, "gold": 160, "silver": 148, "jade": 129}},
    {"number": 7, "par": 4, "strokeIndex": 13, "yardages": {"black": 346, "gold": 325, "silver": 311, "jade": 297}},
    {"number": 8, "par": 4, "strokeIndex": 1, "yardages": {"black": 411, "gold": 396, "silver": 375, "jade": 353}},
    {"number": 9, "par": 5, "strokeIndex": 7, "yardages": {"black": 545, "gold": 528, "silver": 504, "jade": 442}},
    {"number": 10, "par": 4, "strokeIndex": 6, "yardages": {"black": 371, "gold": 357, "silver": 331, "jade": 311}},
    {"number": 11, "par": 5, "strokeIndex": 16, "yardages": {"black": 521, "gold": 498, "silver": 482, "jade": 458}},
    {"number": 12, "par": 4, "strokeIndex": 18, "yardages": {"black": 309, "gold": 289, "silver": 280, "jade": 261}},
    {"number": 13, "par": 4, "strokeIndex": 8, "yardages": {"black": 356, "gold": 344, "silver": 317, "jade": 299}},
    {"number": 14, "par": 3, "strokeIndex": 14, "yardages": {"black": 179, "gold": 175, "silver": 155, "jade": 137}},
    {"number": 15, "par": 5, "strokeIndex": 10, "yardages": {"black": 525, "gold": 515, "silver": 464, "jade": 443}},
    {"number": 16, "par": 4, "strokeIndex": 2, "yardages": {"black": 417, "gold": 404, "silver": 382, "jade": 353}},
    {"number": 17, "par": 3, "strokeIndex": 12, "yardages": {"black": 163, "gold": 147, "silver": 138, "jade": 123}},
    {"number": 18, "par": 4, "strokeIndex": 4, "yardages": {"black": 402, "gold": 388, "silver": 371, "jade": 344}}
  ]'::jsonb,
  '[
    {"name": "Black", "color": "black", "courseRating": 74.0, "slopeRating": 132, "totalYardage": 6444},
    {"name": "Gold", "color": "gold", "courseRating": 72.0, "slopeRating": 130, "totalYardage": 6147},
    {"name": "Silver", "color": "white", "courseRating": 70.0, "slopeRating": 128, "totalYardage": 5808},
    {"name": "Jade", "color": "red", "courseRating": 74.0, "slopeRating": 136, "totalYardage": 5363}
  ]'::jsonb
)
ON CONFLICT (venue_id, name) DO UPDATE SET
  description = EXCLUDED.description,
  slope_rating = EXCLUDED.slope_rating,
  course_rating = EXCLUDED.course_rating,
  holes = EXCLUDED.holes,
  tees = EXCLUDED.tees;

-- STONECUTTERS RIDGE GOLF CLUB
INSERT INTO courses (venue_id, name, description, slope_rating, course_rating, holes, tees)
VALUES (
  'f2a3b4c5-d6e7-8901-abcd-200000000204',
  'Stonecutters Ridge',
  'Sydney''s first Greg Norman designed course, opened August 2012. Hosted 2014-2016 NSW Open Championships. Features intimidating bunkers, challenging greens and impressive water features along Eastern Creek. Par 71 layout on former chicken farm.',
  134,
  73.0,
  '[
    {"number": 1, "par": 5, "strokeIndex": 12, "yardages": {"blue": 520, "white": 504, "gold": 464, "red": 443}},
    {"number": 2, "par": 4, "strokeIndex": 10, "yardages": {"blue": 398, "white": 366, "gold": 340, "red": 332}},
    {"number": 3, "par": 4, "strokeIndex": 2, "yardages": {"blue": 388, "white": 356, "gold": 333, "red": 324}},
    {"number": 4, "par": 4, "strokeIndex": 14, "yardages": {"blue": 343, "white": 339, "gold": 314, "red": 295}},
    {"number": 5, "par": 4, "strokeIndex": 18, "yardages": {"blue": 320, "white": 310, "gold": 290, "red": 285}},
    {"number": 6, "par": 3, "strokeIndex": 4, "yardages": {"blue": 176, "white": 146, "gold": 137, "red": 110}},
    {"number": 7, "par": 4, "strokeIndex": 16, "yardages": {"blue": 322, "white": 312, "gold": 284, "red": 248}},
    {"number": 8, "par": 4, "strokeIndex": 8, "yardages": {"blue": 394, "white": 384, "gold": 354, "red": 345}},
    {"number": 9, "par": 4, "strokeIndex": 6, "yardages": {"blue": 388, "white": 381, "gold": 345, "red": 317}},
    {"number": 10, "par": 5, "strokeIndex": 9, "yardages": {"blue": 508, "white": 479, "gold": 452, "red": 426}},
    {"number": 11, "par": 3, "strokeIndex": 11, "yardages": {"blue": 148, "white": 137, "gold": 127, "red": 122}},
    {"number": 12, "par": 4, "strokeIndex": 3, "yardages": {"blue": 386, "white": 374, "gold": 348, "red": 338}},
    {"number": 13, "par": 4, "strokeIndex": 7, "yardages": {"blue": 355, "white": 350, "gold": 331, "red": 320}},
    {"number": 14, "par": 4, "strokeIndex": 15, "yardages": {"blue": 370, "white": 345, "gold": 326, "red": 308}},
    {"number": 15, "par": 5, "strokeIndex": 17, "yardages": {"blue": 494, "white": 472, "gold": 439, "red": 409}},
    {"number": 16, "par": 3, "strokeIndex": 1, "yardages": {"blue": 181, "white": 159, "gold": 152, "red": 111}},
    {"number": 17, "par": 3, "strokeIndex": 13, "yardages": {"blue": 151, "white": 144, "gold": 120, "red": 115}},
    {"number": 18, "par": 4, "strokeIndex": 5, "yardages": {"blue": 415, "white": 400, "gold": 350, "red": 335}}
  ]'::jsonb,
  '[
    {"name": "Blue", "color": "blue", "courseRating": 73.0, "slopeRating": 134, "totalYardage": 6257},
    {"name": "White", "color": "white", "courseRating": 72.0, "slopeRating": 127, "totalYardage": 5958},
    {"name": "Gold", "color": "gold", "courseRating": 69.0, "slopeRating": 126, "totalYardage": 5506},
    {"name": "Red", "color": "red", "courseRating": 73.0, "slopeRating": 126, "totalYardage": 5183}
  ]'::jsonb
)
ON CONFLICT (venue_id, name) DO UPDATE SET
  description = EXCLUDED.description,
  slope_rating = EXCLUDED.slope_rating,
  course_rating = EXCLUDED.course_rating,
  holes = EXCLUDED.holes,
  tees = EXCLUDED.tees;

-- RIVERSIDE OAKS GOLF RESORT - BUNGOOL COURSE
INSERT INTO courses (venue_id, name, description, slope_rating, course_rating, holes, tees)
VALUES (
  'f2a3b4c5-d6e7-8901-abcd-200000000205',
  'Bungool',
  'Bob Harrison designed course opened in 2014. Part of Sydney''s only 36-hole golf resort, both courses featured in Australia''s Top 100. Features Bent grass greens and Couch grass fairways with challenging water hazards.',
  122,
  71.0,
  '[
    {"number": 1, "par": 4, "strokeIndex": 12, "yardages": {"black": 359, "blue": 476, "red": 281}},
    {"number": 2, "par": 4, "strokeIndex": 2, "yardages": {"black": 427, "blue": 362, "red": 281}},
    {"number": 3, "par": 4, "strokeIndex": 4, "yardages": {"black": 321, "blue": 360, "red": 262}},
    {"number": 4, "par": 3, "strokeIndex": 11, "yardages": {"black": 353, "blue": 165, "red": 295}},
    {"number": 5, "par": 5, "strokeIndex": 18, "yardages": {"black": 482, "blue": 261, "red": 426}},
    {"number": 6, "par": 3, "strokeIndex": 3, "yardages": {"black": 195, "blue": 407, "red": 108}},
    {"number": 7, "par": 4, "strokeIndex": 7, "yardages": {"black": 312, "blue": 333, "red": 245}},
    {"number": 8, "par": 5, "strokeIndex": 17, "yardages": {"black": 486, "blue": 159, "red": 357}},
    {"number": 9, "par": 4, "strokeIndex": 15, "yardages": {"black": 350, "blue": 460, "red": 254}},
    {"number": 10, "par": 5, "strokeIndex": 16, "yardages": {"black": 499, "blue": 419, "red": 432}},
    {"number": 11, "par": 4, "strokeIndex": 13, "yardages": {"black": 278, "blue": 121, "red": 200}},
    {"number": 12, "par": 4, "strokeIndex": 14, "yardages": {"black": 404, "blue": 436, "red": 305}},
    {"number": 13, "par": 4, "strokeIndex": 9, "yardages": {"black": 405, "blue": 326, "red": 331}},
    {"number": 14, "par": 3, "strokeIndex": 10, "yardages": {"black": 415, "blue": 136, "red": 343}},
    {"number": 15, "par": 3, "strokeIndex": 1, "yardages": {"black": 148, "blue": 388, "red": 121}},
    {"number": 16, "par": 4, "strokeIndex": 8, "yardages": {"black": 324, "blue": 332, "red": 252}},
    {"number": 17, "par": 3, "strokeIndex": 6, "yardages": {"black": 153, "blue": 350, "red": 106}},
    {"number": 18, "par": 4, "strokeIndex": 5, "yardages": {"black": 371, "blue": 362, "red": 294}}
  ]'::jsonb,
  '[
    {"name": "Black", "color": "black", "courseRating": 73.0, "slopeRating": 110, "totalYardage": 6282},
    {"name": "Blue", "color": "blue", "courseRating": 71.0, "slopeRating": 122, "totalYardage": 5853},
    {"name": "Red", "color": "red", "courseRating": 70.0, "slopeRating": 116, "totalYardage": 4893}
  ]'::jsonb
)
ON CONFLICT (venue_id, name) DO UPDATE SET
  description = EXCLUDED.description,
  slope_rating = EXCLUDED.slope_rating,
  course_rating = EXCLUDED.course_rating,
  holes = EXCLUDED.holes,
  tees = EXCLUDED.tees;

-- LYNWOOD COUNTRY CLUB
INSERT INTO courses (venue_id, name, description, slope_rating, course_rating, holes, tees)
VALUES (
  'f2a3b4c5-d6e7-8901-abcd-200000000206',
  'Lynwood',
  'Graham Papworth designed links-style course opened in 2009, set on 230 undulating acres. Features water coming into play at almost every hole, panoramic Blue Mountains views. Despite generous fairways, direction and position are key to scoring.',
  126,
  73.0,
  '[
    {"number": 1, "par": 5, "strokeIndex": 1, "yardages": {"black": 539, "blue": 533, "white": 517, "yellow": 495, "red": 446}},
    {"number": 2, "par": 4, "strokeIndex": 3, "yardages": {"black": 343, "blue": 338, "white": 327, "yellow": 315, "red": 307}},
    {"number": 3, "par": 3, "strokeIndex": 5, "yardages": {"black": 133, "blue": 127, "white": 119, "yellow": 111, "red": 103}},
    {"number": 4, "par": 4, "strokeIndex": 7, "yardages": {"black": 318, "blue": 312, "white": 300, "yellow": 287, "red": 282}},
    {"number": 5, "par": 4, "strokeIndex": 9, "yardages": {"black": 403, "blue": 392, "white": 383, "yellow": 373, "red": 339}},
    {"number": 6, "par": 4, "strokeIndex": 11, "yardages": {"black": 337, "blue": 332, "white": 323, "yellow": 315, "red": 294}},
    {"number": 7, "par": 4, "strokeIndex": 13, "yardages": {"black": 390, "blue": 385, "white": 370, "yellow": 356, "red": 330}},
    {"number": 8, "par": 4, "strokeIndex": 15, "yardages": {"black": 403, "blue": 393, "white": 380, "yellow": 365, "red": 334}},
    {"number": 9, "par": 3, "strokeIndex": 17, "yardages": {"black": 154, "blue": 142, "white": 132, "yellow": 124, "red": 109}},
    {"number": 10, "par": 4, "strokeIndex": 2, "yardages": {"black": 352, "blue": 349, "white": 341, "yellow": 324, "red": 280}},
    {"number": 11, "par": 4, "strokeIndex": 4, "yardages": {"black": 328, "blue": 323, "white": 311, "yellow": 302, "red": 270}},
    {"number": 12, "par": 5, "strokeIndex": 6, "yardages": {"black": 506, "blue": 491, "white": 480, "yellow": 469, "red": 414}},
    {"number": 13, "par": 4, "strokeIndex": 8, "yardages": {"black": 378, "blue": 373, "white": 360, "yellow": 337, "red": 306}},
    {"number": 14, "par": 3, "strokeIndex": 10, "yardages": {"black": 158, "blue": 154, "white": 150, "yellow": 138, "red": 129}},
    {"number": 15, "par": 4, "strokeIndex": 12, "yardages": {"black": 360, "blue": 355, "white": 342, "yellow": 336, "red": 320}},
    {"number": 16, "par": 5, "strokeIndex": 14, "yardages": {"black": 529, "blue": 524, "white": 506, "yellow": 474, "red": 421}},
    {"number": 17, "par": 3, "strokeIndex": 16, "yardages": {"black": 174, "blue": 168, "white": 157, "yellow": 138, "red": 121}},
    {"number": 18, "par": 4, "strokeIndex": 18, "yardages": {"black": 429, "blue": 427, "white": 402, "yellow": 380, "red": 359}}
  ]'::jsonb,
  '[
    {"name": "Black", "color": "black", "courseRating": 73.0, "slopeRating": 126, "totalYardage": 6234},
    {"name": "Blue", "color": "blue", "courseRating": 73.0, "slopeRating": 125, "totalYardage": 6118},
    {"name": "White", "color": "white", "courseRating": 72.0, "slopeRating": 124, "totalYardage": 5900},
    {"name": "Yellow", "color": "yellow", "courseRating": 70.0, "slopeRating": 121, "totalYardage": 5639},
    {"name": "Red", "color": "red", "courseRating": 73.0, "slopeRating": 121, "totalYardage": 5164}
  ]'::jsonb
)
ON CONFLICT (venue_id, name) DO UPDATE SET
  description = EXCLUDED.description,
  slope_rating = EXCLUDED.slope_rating,
  course_rating = EXCLUDED.course_rating,
  holes = EXCLUDED.holes,
  tees = EXCLUDED.tees;

-- OATLANDS GOLF CLUB
INSERT INTO courses (venue_id, name, description, slope_rating, course_rating, holes, tees)
VALUES (
  'f2a3b4c5-d6e7-8901-abcd-200000000207',
  'Oatlands',
  'Parkland course opened in 1931. Par 70 for men (73 for ladies) featuring tree-lined fairways, strategic bunkering, and water hazards. Easy walking layout in Sydney''s Hills District.',
  120,
  70.0,
  '[
    {"number": 1, "par": 4, "strokeIndex": 1, "yardages": {"mens": 324, "womens": 316}},
    {"number": 2, "par": 3, "strokeIndex": 3, "yardages": {"mens": 209, "womens": 166}},
    {"number": 3, "par": 4, "strokeIndex": 5, "yardages": {"mens": 359, "womens": 347}},
    {"number": 4, "par": 4, "strokeIndex": 7, "yardages": {"mens": 379, "womens": 380}},
    {"number": 5, "par": 3, "strokeIndex": 9, "yardages": {"mens": 168, "womens": 114}},
    {"number": 6, "par": 4, "strokeIndex": 11, "yardages": {"mens": 405, "womens": 401}},
    {"number": 7, "par": 4, "strokeIndex": 13, "yardages": {"mens": 285, "womens": 264}},
    {"number": 8, "par": 5, "strokeIndex": 15, "yardages": {"mens": 486, "womens": 475}},
    {"number": 9, "par": 3, "strokeIndex": 17, "yardages": {"mens": 147, "womens": 97}},
    {"number": 10, "par": 4, "strokeIndex": 2, "yardages": {"mens": 310, "womens": 305}},
    {"number": 11, "par": 4, "strokeIndex": 4, "yardages": {"mens": 326, "womens": 310}},
    {"number": 12, "par": 3, "strokeIndex": 6, "yardages": {"mens": 184, "womens": 187}},
    {"number": 13, "par": 5, "strokeIndex": 8, "yardages": {"mens": 471, "womens": 458}},
    {"number": 14, "par": 4, "strokeIndex": 10, "yardages": {"mens": 378, "womens": 345}},
    {"number": 15, "par": 5, "strokeIndex": 12, "yardages": {"mens": 515, "womens": 450}},
    {"number": 16, "par": 4, "strokeIndex": 14, "yardages": {"mens": 293, "womens": 274}},
    {"number": 17, "par": 4, "strokeIndex": 16, "yardages": {"mens": 385, "womens": 365}},
    {"number": 18, "par": 3, "strokeIndex": 18, "yardages": {"mens": 124, "womens": 114}}
  ]'::jsonb,
  '[
    {"name": "Mens", "color": "white", "courseRating": 70.0, "slopeRating": 120, "totalYardage": 5748},
    {"name": "Womens", "color": "red", "courseRating": 73.0, "slopeRating": 125, "totalYardage": 5368}
  ]'::jsonb
)
ON CONFLICT (venue_id, name) DO UPDATE SET
  description = EXCLUDED.description,
  slope_rating = EXCLUDED.slope_rating,
  course_rating = EXCLUDED.course_rating,
  holes = EXCLUDED.holes,
  tees = EXCLUDED.tees;

-- PENRITH GOLF & RECREATION CLUB
INSERT INTO courses (venue_id, name, description, slope_rating, course_rating, holes, tees)
VALUES (
  'f2a3b4c5-d6e7-8901-abcd-200000000208',
  'Penrith',
  'Championship course opened in 1997, located just 6km from Penrith CBD. Features immaculate pure couch fairways and bent/poa mix greens. Public access course with challenging layout.',
  112,
  70.0,
  '[
    {"number": 1, "par": 5, "strokeIndex": 8, "yardages": {"social": 518, "red": 482}},
    {"number": 2, "par": 4, "strokeIndex": 6, "yardages": {"social": 374, "red": 312}},
    {"number": 3, "par": 3, "strokeIndex": 18, "yardages": {"social": 146, "red": 126}},
    {"number": 4, "par": 4, "strokeIndex": 13, "yardages": {"social": 329, "red": 303}},
    {"number": 5, "par": 4, "strokeIndex": 12, "yardages": {"social": 361, "red": 287}},
    {"number": 6, "par": 5, "strokeIndex": 9, "yardages": {"social": 522, "red": 481}},
    {"number": 7, "par": 3, "strokeIndex": 16, "yardages": {"social": 147, "red": 119}},
    {"number": 8, "par": 4, "strokeIndex": 10, "yardages": {"social": 333, "red": 311}},
    {"number": 9, "par": 4, "strokeIndex": 1, "yardages": {"social": 423, "red": 403}},
    {"number": 10, "par": 4, "strokeIndex": 5, "yardages": {"social": 390, "red": 358}},
    {"number": 11, "par": 3, "strokeIndex": 3, "yardages": {"social": 199, "red": 117}},
    {"number": 12, "par": 5, "strokeIndex": 7, "yardages": {"social": 503, "red": 419}},
    {"number": 13, "par": 4, "strokeIndex": 2, "yardages": {"social": 403, "red": 380}},
    {"number": 14, "par": 4, "strokeIndex": 15, "yardages": {"social": 297, "red": 237}},
    {"number": 15, "par": 3, "strokeIndex": 14, "yardages": {"social": 162, "red": 116}},
    {"number": 16, "par": 4, "strokeIndex": 4, "yardages": {"social": 393, "red": 376}},
    {"number": 17, "par": 5, "strokeIndex": 17, "yardages": {"social": 477, "red": 370}},
    {"number": 18, "par": 4, "strokeIndex": 11, "yardages": {"social": 342, "red": 317}}
  ]'::jsonb,
  '[
    {"name": "Social", "color": "yellow", "courseRating": 70.0, "slopeRating": 112, "totalYardage": 6319},
    {"name": "Red", "color": "red", "courseRating": 75.0, "slopeRating": 133, "totalYardage": 5514}
  ]'::jsonb
)
ON CONFLICT (venue_id, name) DO UPDATE SET
  description = EXCLUDED.description,
  slope_rating = EXCLUDED.slope_rating,
  course_rating = EXCLUDED.course_rating,
  holes = EXCLUDED.holes,
  tees = EXCLUDED.tees;

-- LEONAY GOLF CLUB
INSERT INTO courses (venue_id, name, description, slope_rating, course_rating, holes, tees)
VALUES (
  'f2a3b4c5-d6e7-8901-abcd-200000000209',
  'Leonay',
  'Scenic parkland course in Sydney''s west featuring tight fairways and undulating greens. Par 67 layout for men (70 for ladies) with challenging par 3s and reachable par 5s. Great views of the Blue Mountains.',
  113,
  67.0,
  '[
    {"number": 1, "par": 4, "strokeIndex": 14, "yardages": {"blue": 268, "red": 279}},
    {"number": 2, "par": 3, "strokeIndex": 16, "yardages": {"blue": 132, "red": 136}},
    {"number": 3, "par": 4, "strokeIndex": 1, "yardages": {"blue": 373, "red": 384}},
    {"number": 4, "par": 4, "strokeIndex": 13, "yardages": {"blue": 301, "red": 320}},
    {"number": 5, "par": 4, "strokeIndex": 4, "yardages": {"blue": 332, "red": 353}},
    {"number": 6, "par": 3, "strokeIndex": 8, "yardages": {"blue": 186, "red": 180}},
    {"number": 7, "par": 4, "strokeIndex": 7, "yardages": {"blue": 345, "red": 346}},
    {"number": 8, "par": 4, "strokeIndex": 5, "yardages": {"blue": 347, "red": 373}},
    {"number": 9, "par": 3, "strokeIndex": 10, "yardages": {"blue": 185, "red": 183}},
    {"number": 10, "par": 3, "strokeIndex": 11, "yardages": {"blue": 163, "red": 176}},
    {"number": 11, "par": 5, "strokeIndex": 12, "yardages": {"blue": 457, "red": 481}},
    {"number": 12, "par": 4, "strokeIndex": 2, "yardages": {"blue": 381, "red": 409}},
    {"number": 13, "par": 3, "strokeIndex": 17, "yardages": {"blue": 153, "red": 135}},
    {"number": 14, "par": 3, "strokeIndex": 18, "yardages": {"blue": 109, "red": 104}},
    {"number": 15, "par": 4, "strokeIndex": 15, "yardages": {"blue": 290, "red": 309}},
    {"number": 16, "par": 5, "strokeIndex": 6, "yardages": {"blue": 454, "red": 478}},
    {"number": 17, "par": 4, "strokeIndex": 3, "yardages": {"blue": 352, "red": 377}},
    {"number": 18, "par": 3, "strokeIndex": 9, "yardages": {"blue": 195, "red": 199}}
  ]'::jsonb,
  '[
    {"name": "Blue", "color": "blue", "courseRating": 67.0, "slopeRating": 113, "totalYardage": 5023},
    {"name": "Red", "color": "red", "courseRating": 69.0, "slopeRating": 118, "totalYardage": 5222}
  ]'::jsonb
)
ON CONFLICT (venue_id, name) DO UPDATE SET
  description = EXCLUDED.description,
  slope_rating = EXCLUDED.slope_rating,
  course_rating = EXCLUDED.course_rating,
  holes = EXCLUDED.holes,
  tees = EXCLUDED.tees;

-- STRATHFIELD GOLF CLUB
INSERT INTO courses (venue_id, name, description, slope_rating, course_rating, holes, tees)
VALUES (
  'f2a3b4c5-d6e7-8901-abcd-200000000210',
  'Strathfield',
  'Historic private club established in 1898, recently redeveloped (James Wilcher 2018, Graham Papworth 1994). Located in the heart of Sydney metropolitan area, this attractive par 71 layout features tree-lined fairways and strategic bunkering.',
  112,
  71.0,
  '[
    {"number": 1, "par": 4, "strokeIndex": 1, "yardages": {"black": 317, "red": 290}},
    {"number": 2, "par": 3, "strokeIndex": 3, "yardages": {"black": 137, "red": 123}},
    {"number": 3, "par": 5, "strokeIndex": 5, "yardages": {"black": 460, "red": 405}},
    {"number": 4, "par": 4, "strokeIndex": 7, "yardages": {"black": 404, "red": 366}},
    {"number": 5, "par": 3, "strokeIndex": 9, "yardages": {"black": 114, "red": 100}},
    {"number": 6, "par": 4, "strokeIndex": 11, "yardages": {"black": 335, "red": 308}},
    {"number": 7, "par": 3, "strokeIndex": 13, "yardages": {"black": 164, "red": 138}},
    {"number": 8, "par": 5, "strokeIndex": 15, "yardages": {"black": 471, "red": 441}},
    {"number": 9, "par": 5, "strokeIndex": 17, "yardages": {"black": 499, "red": 424}},
    {"number": 10, "par": 5, "strokeIndex": 2, "yardages": {"black": 476, "red": 459}},
    {"number": 11, "par": 4, "strokeIndex": 4, "yardages": {"black": 315, "red": 303}},
    {"number": 12, "par": 3, "strokeIndex": 6, "yardages": {"black": 175, "red": 131}},
    {"number": 13, "par": 4, "strokeIndex": 8, "yardages": {"black": 369, "red": 308}},
    {"number": 14, "par": 4, "strokeIndex": 10, "yardages": {"black": 350, "red": 311}},
    {"number": 15, "par": 3, "strokeIndex": 12, "yardages": {"black": 188, "red": 153}},
    {"number": 16, "par": 4, "strokeIndex": 14, "yardages": {"black": 375, "red": 315}},
    {"number": 17, "par": 4, "strokeIndex": 16, "yardages": {"black": 357, "red": 318}},
    {"number": 18, "par": 4, "strokeIndex": 18, "yardages": {"black": 376, "red": 367}}
  ]'::jsonb,
  '[
    {"name": "Black", "color": "black", "courseRating": 71.0, "slopeRating": 112, "totalYardage": 5882},
    {"name": "Red", "color": "red", "courseRating": 73.0, "slopeRating": 130, "totalYardage": 5260}
  ]'::jsonb
)
ON CONFLICT (venue_id, name) DO UPDATE SET
  description = EXCLUDED.description,
  slope_rating = EXCLUDED.slope_rating,
  course_rating = EXCLUDED.course_rating,
  holes = EXCLUDED.holes,
  tees = EXCLUDED.tees;

-- MASSEY PARK GOLF CLUB
INSERT INTO courses (venue_id, name, description, slope_rating, course_rating, holes, tees)
VALUES (
  'f2a3b4c5-d6e7-8901-abcd-200000000211',
  'Massey Park',
  'Public parkland course opened in 1953, minutes from Sydney Olympic Park and 20 minutes from CBD. Par 66 layout under 5000m but tree-lined fairways and strategic bunkering provide an enjoyable test. Relatively flat and easy to walk.',
  113,
  66.0,
  '[
    {"number": 1, "par": 4, "strokeIndex": 1, "yardages": {"blue": 410, "red": 390}},
    {"number": 2, "par": 3, "strokeIndex": 5, "yardages": {"blue": 163, "red": 158}},
    {"number": 3, "par": 4, "strokeIndex": 16, "yardages": {"blue": 254, "red": 248}},
    {"number": 4, "par": 4, "strokeIndex": 10, "yardages": {"blue": 247, "red": 246}},
    {"number": 5, "par": 5, "strokeIndex": 4, "yardages": {"blue": 458, "red": 450}},
    {"number": 6, "par": 3, "strokeIndex": 13, "yardages": {"blue": 144, "red": 125}},
    {"number": 7, "par": 4, "strokeIndex": 18, "yardages": {"blue": 303, "red": 298}},
    {"number": 8, "par": 4, "strokeIndex": 11, "yardages": {"blue": 294, "red": 266}},
    {"number": 9, "par": 3, "strokeIndex": 8, "yardages": {"blue": 156, "red": 150}},
    {"number": 10, "par": 4, "strokeIndex": 15, "yardages": {"blue": 302, "red": 292}},
    {"number": 11, "par": 3, "strokeIndex": 7, "yardages": {"blue": 141, "red": 136}},
    {"number": 12, "par": 3, "strokeIndex": 3, "yardages": {"blue": 205, "red": 195}},
    {"number": 13, "par": 4, "strokeIndex": 17, "yardages": {"blue": 262, "red": 256}},
    {"number": 14, "par": 3, "strokeIndex": 9, "yardages": {"blue": 168, "red": 160}},
    {"number": 15, "par": 3, "strokeIndex": 6, "yardages": {"blue": 120, "red": 118}},
    {"number": 16, "par": 4, "strokeIndex": 14, "yardages": {"blue": 261, "red": 256}},
    {"number": 17, "par": 4, "strokeIndex": 12, "yardages": {"blue": 267, "red": 257}},
    {"number": 18, "par": 4, "strokeIndex": 2, "yardages": {"blue": 370, "red": 365}}
  ]'::jsonb,
  '[
    {"name": "Blue", "color": "blue", "courseRating": 66.0, "slopeRating": 113, "totalYardage": 4525},
    {"name": "Red", "color": "red", "courseRating": 68.0, "slopeRating": 125, "totalYardage": 4366}
  ]'::jsonb
)
ON CONFLICT (venue_id, name) DO UPDATE SET
  description = EXCLUDED.description,
  slope_rating = EXCLUDED.slope_rating,
  course_rating = EXCLUDED.course_rating,
  holes = EXCLUDED.holes,
  tees = EXCLUDED.tees;

-- =====================================================
-- STEP 3: UPDATE EXISTING VENUE (CONCORD GOLF CLUB)
-- Add course data to existing venue
-- =====================================================

-- CONCORD GOLF CLUB (existing venue)
INSERT INTO courses (venue_id, name, description, slope_rating, course_rating, holes, tees)
VALUES (
  '9799506a-6d98-4a16-94ee-a39ad567648a',
  'Concord',
  'One of Australia''s oldest and most prestigious clubs, founded in 1899. Completely renovated by Tom Doak in 2017-2018, with Brian Slawnik overseeing the work. Features challenging greens, strategic bunkering, and tree-lined parkland setting.',
  128,
  73.0,
  '[
    {"number": 1, "par": 4, "strokeIndex": 17, "yardages": {"members": 297, "women": 282}},
    {"number": 2, "par": 4, "strokeIndex": 11, "yardages": {"members": 356, "women": 327}},
    {"number": 3, "par": 4, "strokeIndex": 1, "yardages": {"members": 366, "women": 284}},
    {"number": 4, "par": 3, "strokeIndex": 15, "yardages": {"members": 162, "women": 124}},
    {"number": 5, "par": 4, "strokeIndex": 7, "yardages": {"members": 304, "women": 233}},
    {"number": 6, "par": 3, "strokeIndex": 4, "yardages": {"members": 184, "women": 136}},
    {"number": 7, "par": 4, "strokeIndex": 13, "yardages": {"members": 381, "women": 356}},
    {"number": 8, "par": 5, "strokeIndex": 10, "yardages": {"members": 485, "women": 404}},
    {"number": 9, "par": 4, "strokeIndex": 5, "yardages": {"members": 369, "women": 277}},
    {"number": 10, "par": 4, "strokeIndex": 8, "yardages": {"members": 378, "women": 343}},
    {"number": 11, "par": 5, "strokeIndex": 12, "yardages": {"members": 471, "women": 437}},
    {"number": 12, "par": 4, "strokeIndex": 6, "yardages": {"members": 384, "women": 358}},
    {"number": 13, "par": 4, "strokeIndex": 16, "yardages": {"members": 266, "women": 245}},
    {"number": 14, "par": 3, "strokeIndex": 18, "yardages": {"members": 134, "women": 110}},
    {"number": 15, "par": 5, "strokeIndex": 9, "yardages": {"members": 480, "women": 432}},
    {"number": 16, "par": 3, "strokeIndex": 14, "yardages": {"members": 156, "women": 121}},
    {"number": 17, "par": 4, "strokeIndex": 2, "yardages": {"members": 404, "women": 380}},
    {"number": 18, "par": 4, "strokeIndex": 3, "yardages": {"members": 374, "women": 336}}
  ]'::jsonb,
  '[
    {"name": "Members", "color": "blue", "courseRating": 73.0, "slopeRating": 128, "totalYardage": 5951},
    {"name": "Women", "color": "red", "courseRating": 75.0, "slopeRating": 136, "totalYardage": 5185}
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
-- New Venues Added: 12
--   - Castle Hill Country Club (Top 100)
--   - Muirfield Golf Club
--   - Twin Creeks Golf & Country Club (Top 100, NSW Open 2017-2019)
--   - Stonecutters Ridge Golf Club (Greg Norman design, NSW Open 2014-2016)
--   - Riverside Oaks Golf Resort (36 holes, Top 100)
--   - Lynwood Country Club
--   - Oatlands Golf Club
--   - Penrith Golf & Recreation Club
--   - Leonay Golf Club
--   - Strathfield Golf Club
--   - Massey Park Golf Club
--   - Glenmore Heritage Valley Golf Club (venue only)
--
-- Existing Venues Updated: 1
--   - Concord Golf Club (Tom Doak renovation)
--
-- Total Courses with Full Hole Data: 12
-- =====================================================
