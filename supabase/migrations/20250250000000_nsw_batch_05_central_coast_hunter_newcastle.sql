-- =====================================================
-- Migration: nsw_batch_05_central_coast_hunter_newcastle
-- Description: Add Central Coast, Hunter Valley & Newcastle golf venues and courses
--              Part of NSW golf course data collection
-- Date: 2025-12-10
-- Batch: 5 of 7 (Central Coast, Hunter Valley & Newcastle)
-- =====================================================

-- =====================================================
-- STEP 1: INSERT NEW VENUES
-- Using ON CONFLICT to handle re-runs safely
-- =====================================================

-- The Vintage Golf Club (Hunter Valley)
INSERT INTO venues (id, source, name, state, city, address, phone, website, total_holes)
VALUES (
  'f2a3b4c5-d6e7-8901-abcd-200000000401',
  'manual',
  'The Vintage Golf Club',
  'NSW',
  'Rothbury',
  'Vintage Drive, Rothbury NSW 2320',
  '+61 2 4998 7777',
  'https://www.thevintage.com.au',
  18
)
ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name,
  address = EXCLUDED.address,
  phone = EXCLUDED.phone,
  website = EXCLUDED.website;

-- Cypress Lakes Golf & Country Club (Hunter Valley)
INSERT INTO venues (id, source, name, state, city, address, phone, website, total_holes)
VALUES (
  'f2a3b4c5-d6e7-8901-abcd-200000000402',
  'manual',
  'Cypress Lakes Golf & Country Club',
  'NSW',
  'Pokolbin',
  'Corner McDonalds & Thompsons Road, Pokolbin NSW 2320',
  '+61 2 4993 1800',
  'https://www.cypresslakes.com.au',
  18
)
ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name,
  address = EXCLUDED.address,
  phone = EXCLUDED.phone,
  website = EXCLUDED.website;

-- Horizons Golf Resort (Port Stephens)
INSERT INTO venues (id, source, name, state, city, address, phone, website, total_holes)
VALUES (
  'f2a3b4c5-d6e7-8901-abcd-200000000403',
  'manual',
  'Horizons Golf Resort',
  'NSW',
  'Salamander Bay',
  'Horizons Drive, Salamander Bay NSW 2317',
  '+61 2 4982 7922',
  'https://www.horizons.com.au',
  18
)
ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name,
  address = EXCLUDED.address,
  phone = EXCLUDED.phone,
  website = EXCLUDED.website;

-- Maitland Golf Club
INSERT INTO venues (id, source, name, state, city, address, phone, website, total_holes)
VALUES (
  'f2a3b4c5-d6e7-8901-abcd-200000000404',
  'manual',
  'Maitland Golf Club',
  'NSW',
  'East Maitland',
  '3 Bell Street, East Maitland NSW 2323',
  '+61 2 4933 7512',
  'https://www.maitlandgolf.com.au',
  18
)
ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name,
  address = EXCLUDED.address,
  phone = EXCLUDED.phone,
  website = EXCLUDED.website;

-- Charlestown Golf Club
INSERT INTO venues (id, source, name, state, city, address, phone, website, total_holes)
VALUES (
  'f2a3b4c5-d6e7-8901-abcd-200000000405',
  'manual',
  'Charlestown Golf Club',
  'NSW',
  'Hillsborough',
  '1A Barker Avenue, Hillsborough NSW 2290',
  '+61 2 4943 1066',
  'https://www.charlestowngolf.com.au',
  18
)
ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name,
  address = EXCLUDED.address,
  phone = EXCLUDED.phone,
  website = EXCLUDED.website;

-- Gosford Golf Club (Central Coast)
INSERT INTO venues (id, source, name, state, city, address, phone, website, total_holes)
VALUES (
  'f2a3b4c5-d6e7-8901-abcd-200000000406',
  'manual',
  'Gosford Golf Club',
  'NSW',
  'Gosford',
  '22 Racecourse Road, Gosford NSW 2250',
  '+61 2 4325 1063',
  'https://www.gosfordgolfclub.com.au',
  18
)
ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name,
  address = EXCLUDED.address,
  phone = EXCLUDED.phone,
  website = EXCLUDED.website;

-- Shelly Beach Golf Club (Central Coast)
INSERT INTO venues (id, source, name, state, city, address, phone, website, total_holes)
VALUES (
  'f2a3b4c5-d6e7-8901-abcd-200000000407',
  'manual',
  'Shelly Beach Golf Club',
  'NSW',
  'Shelly Beach',
  'Shelly Beach Road, Shelly Beach NSW 2261',
  '+61 2 4332 1127',
  'https://www.shellybeachgolfclub.com.au',
  18
)
ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name,
  address = EXCLUDED.address,
  phone = EXCLUDED.phone,
  website = EXCLUDED.website;

-- Muswellbrook Golf Club (Hunter Valley)
INSERT INTO venues (id, source, name, state, city, address, phone, website, total_holes)
VALUES (
  'f2a3b4c5-d6e7-8901-abcd-200000000408',
  'manual',
  'Muswellbrook Golf Club',
  'NSW',
  'Muswellbrook',
  '3 Bell Street, Muswellbrook NSW 2333',
  '+61 2 6543 2187',
  'https://www.muswellbrookgolf.com.au',
  18
)
ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name,
  address = EXCLUDED.address,
  phone = EXCLUDED.phone,
  website = EXCLUDED.website;

-- Wyong Golf Club (Central Coast)
INSERT INTO venues (id, source, name, state, city, address, phone, website, total_holes)
VALUES (
  'f2a3b4c5-d6e7-8901-abcd-200000000409',
  'manual',
  'Wyong Golf Club',
  'NSW',
  'Wyong',
  '319 Pacific Highway, Wyong NSW 2259',
  '+61 2 4352 1361',
  'https://www.wyonggolfclub.com.au',
  18
)
ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name,
  address = EXCLUDED.address,
  phone = EXCLUDED.phone,
  website = EXCLUDED.website;

-- Toukley Golf Club (Central Coast)
INSERT INTO venues (id, source, name, state, city, address, phone, website, total_holes)
VALUES (
  'f2a3b4c5-d6e7-8901-abcd-200000000410',
  'manual',
  'Toukley Golf Club',
  'NSW',
  'Toukley',
  'Key Street, Toukley NSW 2263',
  '+61 2 4396 4466',
  'https://www.toukleygolfclub.com.au',
  18
)
ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name,
  address = EXCLUDED.address,
  phone = EXCLUDED.phone,
  website = EXCLUDED.website;

-- Kooindah Waters Golf Club (Central Coast)
INSERT INTO venues (id, source, name, state, city, address, phone, website, total_holes)
VALUES (
  'f2a3b4c5-d6e7-8901-abcd-200000000411',
  'manual',
  'Kooindah Waters Golf Club',
  'NSW',
  'Wyong',
  '40 Kooindah Boulevard, Wyong NSW 2259',
  '+61 2 4351 0700',
  'https://www.kooindahwatersgolf.com.au',
  18
)
ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name,
  address = EXCLUDED.address,
  phone = EXCLUDED.phone,
  website = EXCLUDED.website;

-- Pacific Dunes Golf Club (Port Stephens)
INSERT INTO venues (id, source, name, state, city, address, phone, website, total_holes)
VALUES (
  'f2a3b4c5-d6e7-8901-abcd-200000000412',
  'manual',
  'Pacific Dunes Golf Club',
  'NSW',
  'Medowie',
  'Championship Drive, Medowie NSW 2318',
  '+61 2 4916 0500',
  'https://www.pacificdunes.com.au',
  18
)
ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name,
  address = EXCLUDED.address,
  phone = EXCLUDED.phone,
  website = EXCLUDED.website;

-- Hunter Valley Golf & Country Club
INSERT INTO venues (id, source, name, state, city, address, phone, website, total_holes)
VALUES (
  'f2a3b4c5-d6e7-8901-abcd-200000000413',
  'manual',
  'Hunter Valley Golf & Country Club',
  'NSW',
  'Lovedale',
  '430 Wine Country Drive, Lovedale NSW 2325',
  '+61 2 4991 4777',
  'https://www.huntervalleygolf.com.au',
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

-- THE VINTAGE GOLF CLUB (Greg Norman design, Top 100 #31)
INSERT INTO courses (venue_id, name, description, slope_rating, course_rating, holes, tees)
VALUES (
  'f2a3b4c5-d6e7-8901-abcd-200000000401',
  'The Vintage',
  'Greg Norman designed championship course in the Hunter Valley wine country. Ranked #31 in Australian Top 100 (2024). Features water hazards, rugged bunkers, and lush green fairways winding through vineyards.',
  147,
  74.0,
  '[
    {"number": 1, "par": 4, "strokeIndex": 16, "yardages": {"black": 331, "gold": 303, "red": 281, "green": 231}},
    {"number": 2, "par": 4, "strokeIndex": 9, "yardages": {"black": 356, "gold": 324, "red": 298, "green": 298}},
    {"number": 3, "par": 4, "strokeIndex": 1, "yardages": {"black": 398, "gold": 370, "red": 305, "green": 305}},
    {"number": 4, "par": 4, "strokeIndex": 11, "yardages": {"black": 336, "gold": 326, "red": 236, "green": 236}},
    {"number": 5, "par": 3, "strokeIndex": 15, "yardages": {"black": 153, "gold": 131, "red": 108, "green": 97}},
    {"number": 6, "par": 4, "strokeIndex": 4, "yardages": {"black": 417, "gold": 401, "red": 338, "green": 338}},
    {"number": 7, "par": 5, "strokeIndex": 18, "yardages": {"black": 507, "gold": 479, "red": 459, "green": 459}},
    {"number": 8, "par": 3, "strokeIndex": 5, "yardages": {"black": 194, "gold": 165, "red": 139, "green": 139}},
    {"number": 9, "par": 4, "strokeIndex": 2, "yardages": {"black": 406, "gold": 385, "red": 328, "green": 308}},
    {"number": 10, "par": 5, "strokeIndex": 7, "yardages": {"black": 552, "gold": 511, "red": 477, "green": 477}},
    {"number": 11, "par": 4, "strokeIndex": 10, "yardages": {"black": 401, "gold": 387, "red": 345, "green": 345}},
    {"number": 12, "par": 3, "strokeIndex": 14, "yardages": {"black": 171, "gold": 161, "red": 140, "green": 140}},
    {"number": 13, "par": 4, "strokeIndex": 13, "yardages": {"black": 313, "gold": 294, "red": 247, "green": 190}},
    {"number": 14, "par": 5, "strokeIndex": 12, "yardages": {"black": 478, "gold": 443, "red": 416, "green": 416}},
    {"number": 15, "par": 4, "strokeIndex": 17, "yardages": {"black": 336, "gold": 296, "red": 261, "green": 261}},
    {"number": 16, "par": 4, "strokeIndex": 6, "yardages": {"black": 399, "gold": 390, "red": 341, "green": 341}},
    {"number": 17, "par": 3, "strokeIndex": 8, "yardages": {"black": 182, "gold": 153, "red": 130, "green": 130}},
    {"number": 18, "par": 4, "strokeIndex": 3, "yardages": {"black": 380, "gold": 361, "red": 336, "green": 291}}
  ]'::jsonb,
  '[
    {"name": "Black", "color": "black", "courseRating": 74.0, "slopeRating": 147, "totalYardage": 6310},
    {"name": "Gold", "color": "gold", "courseRating": 72.0, "slopeRating": 140, "totalYardage": 5880},
    {"name": "Red", "color": "red", "courseRating": 73.0, "slopeRating": 135, "totalYardage": 5185},
    {"name": "Green", "color": "green", "courseRating": 70.0, "slopeRating": 125, "totalYardage": 5002}
  ]'::jsonb
)
ON CONFLICT (venue_id, name) DO UPDATE SET
  description = EXCLUDED.description,
  slope_rating = EXCLUDED.slope_rating,
  course_rating = EXCLUDED.course_rating,
  holes = EXCLUDED.holes,
  tees = EXCLUDED.tees;

-- CYPRESS LAKES GOLF & COUNTRY CLUB (Steve Smyers design, Top 100 Public #66)
INSERT INTO courses (venue_id, name, description, slope_rating, course_rating, holes, tees)
VALUES (
  'f2a3b4c5-d6e7-8901-abcd-200000000402',
  'Cypress Lakes',
  'Steve Smyers designed championship course opened in 1992 - his first Australian design. First nine is tree-lined with sloping fairways, back nine is links-flavored. 60 bunkers provide challenge. Ranked #66 Top Public Course (2021).',
  133,
  71.9,
  '[
    {"number": 1, "par": 4, "strokeIndex": 14, "yardages": {"blue": 320, "white": 307, "gold": 279, "red": 262}},
    {"number": 2, "par": 4, "strokeIndex": 5, "yardages": {"blue": 403, "white": 366, "gold": 340, "red": 305}},
    {"number": 3, "par": 4, "strokeIndex": 10, "yardages": {"blue": 376, "white": 351, "gold": 314, "red": 280}},
    {"number": 4, "par": 5, "strokeIndex": 9, "yardages": {"blue": 563, "white": 527, "gold": 493, "red": 464}},
    {"number": 5, "par": 3, "strokeIndex": 18, "yardages": {"blue": 139, "white": 118, "gold": 100, "red": 80}},
    {"number": 6, "par": 5, "strokeIndex": 12, "yardages": {"blue": 525, "white": 500, "gold": 481, "red": 437}},
    {"number": 7, "par": 3, "strokeIndex": 3, "yardages": {"blue": 226, "white": 190, "gold": 154, "red": 98}},
    {"number": 8, "par": 4, "strokeIndex": 2, "yardages": {"blue": 403, "white": 371, "gold": 339, "red": 307}},
    {"number": 9, "par": 4, "strokeIndex": 15, "yardages": {"blue": 316, "white": 309, "gold": 292, "red": 276}},
    {"number": 10, "par": 4, "strokeIndex": 7, "yardages": {"blue": 416, "white": 377, "gold": 367, "red": 303}},
    {"number": 11, "par": 4, "strokeIndex": 17, "yardages": {"blue": 361, "white": 343, "gold": 321, "red": 289}},
    {"number": 12, "par": 3, "strokeIndex": 13, "yardages": {"blue": 157, "white": 128, "gold": 122, "red": 112}},
    {"number": 13, "par": 4, "strokeIndex": 1, "yardages": {"blue": 448, "white": 413, "gold": 389, "red": 344}},
    {"number": 14, "par": 5, "strokeIndex": 8, "yardages": {"blue": 540, "white": 524, "gold": 489, "red": 447}},
    {"number": 15, "par": 4, "strokeIndex": 16, "yardages": {"blue": 311, "white": 298, "gold": 291, "red": 270}},
    {"number": 16, "par": 4, "strokeIndex": 11, "yardages": {"blue": 359, "white": 337, "gold": 324, "red": 300}},
    {"number": 17, "par": 3, "strokeIndex": 6, "yardages": {"blue": 224, "white": 184, "gold": 154, "red": 122}},
    {"number": 18, "par": 4, "strokeIndex": 4, "yardages": {"blue": 436, "white": 408, "gold": 370, "red": 335}}
  ]'::jsonb,
  '[
    {"name": "Blue", "color": "blue", "courseRating": 71.9, "slopeRating": 133, "totalYardage": 6523},
    {"name": "White", "color": "white", "courseRating": 69.5, "slopeRating": 132, "totalYardage": 6051},
    {"name": "Gold", "color": "gold", "courseRating": 67.1, "slopeRating": 123, "totalYardage": 5619},
    {"name": "Red", "color": "red", "courseRating": 68.4, "slopeRating": 120, "totalYardage": 5031}
  ]'::jsonb
)
ON CONFLICT (venue_id, name) DO UPDATE SET
  description = EXCLUDED.description,
  slope_rating = EXCLUDED.slope_rating,
  course_rating = EXCLUDED.course_rating,
  holes = EXCLUDED.holes,
  tees = EXCLUDED.tees;

-- HORIZONS GOLF RESORT (Graham Marsh/Ross Watson design, Top 100)
INSERT INTO courses (venue_id, name, description, slope_rating, course_rating, holes, tees)
VALUES (
  'f2a3b4c5-d6e7-8901-abcd-200000000403',
  'Horizons',
  'Award-winning championship course designed by Graham Marsh and Ross Watson (1992). Features 18 magnificent holes with bent grass greens considered among the best in NSW. Recognized in Golf Australia Top 100.',
  118,
  72.0,
  '[
    {"number": 1, "par": 4, "strokeIndex": 6, "yardages": {"blue": 390, "white": 380, "red": 339, "yellow": 313}},
    {"number": 2, "par": 4, "strokeIndex": 2, "yardages": {"blue": 379, "white": 360, "red": 353, "yellow": 323}},
    {"number": 3, "par": 5, "strokeIndex": 12, "yardages": {"blue": 479, "white": 457, "red": 453, "yellow": 241}},
    {"number": 4, "par": 3, "strokeIndex": 16, "yardages": {"blue": 144, "white": 137, "red": 111, "yellow": 387}},
    {"number": 5, "par": 4, "strokeIndex": 14, "yardages": {"blue": 371, "white": 358, "red": 304, "yellow": 241}},
    {"number": 6, "par": 3, "strokeIndex": 10, "yardages": {"blue": 160, "white": 137, "red": 115, "yellow": 131}},
    {"number": 7, "par": 5, "strokeIndex": 4, "yardages": {"blue": 498, "white": 483, "red": 433, "yellow": 312}},
    {"number": 8, "par": 4, "strokeIndex": 8, "yardages": {"blue": 347, "white": 329, "red": 309, "yellow": 121}},
    {"number": 9, "par": 4, "strokeIndex": 18, "yardages": {"blue": 307, "white": 298, "red": 293, "yellow": 424}},
    {"number": 10, "par": 4, "strokeIndex": 3, "yardages": {"blue": 389, "white": 371, "red": 353, "yellow": 309}},
    {"number": 11, "par": 4, "strokeIndex": 5, "yardages": {"blue": 383, "white": 374, "red": 375, "yellow": 306}},
    {"number": 12, "par": 4, "strokeIndex": 11, "yardages": {"blue": 344, "white": 326, "red": 302, "yellow": 400}},
    {"number": 13, "par": 5, "strokeIndex": 13, "yardages": {"blue": 472, "white": 457, "red": 429, "yellow": 110}},
    {"number": 14, "par": 4, "strokeIndex": 1, "yardages": {"blue": 322, "white": 304, "red": 289, "yellow": 303}},
    {"number": 15, "par": 3, "strokeIndex": 9, "yardages": {"blue": 180, "white": 165, "red": 131, "yellow": 114}},
    {"number": 16, "par": 4, "strokeIndex": 17, "yardages": {"blue": 379, "white": 369, "red": 313, "yellow": 432}},
    {"number": 17, "par": 3, "strokeIndex": 7, "yardages": {"blue": 153, "white": 139, "red": 120, "yellow": 275}},
    {"number": 18, "par": 5, "strokeIndex": 15, "yardages": {"blue": 495, "white": 476, "red": 425, "yellow": 263}}
  ]'::jsonb,
  '[
    {"name": "Blue", "color": "blue", "courseRating": 72.0, "slopeRating": 139, "totalYardage": 6192},
    {"name": "White", "color": "white", "courseRating": 71.0, "slopeRating": 135, "totalYardage": 5920},
    {"name": "Red", "color": "red", "courseRating": 72.0, "slopeRating": 128, "totalYardage": 5447},
    {"name": "Yellow", "color": "yellow", "courseRating": 68.0, "slopeRating": 118, "totalYardage": 5005}
  ]'::jsonb
)
ON CONFLICT (venue_id, name) DO UPDATE SET
  description = EXCLUDED.description,
  slope_rating = EXCLUDED.slope_rating,
  course_rating = EXCLUDED.course_rating,
  holes = EXCLUDED.holes,
  tees = EXCLUDED.tees;

-- MAITLAND GOLF CLUB
INSERT INTO courses (venue_id, name, description, slope_rating, course_rating, holes, tees)
VALUES (
  'f2a3b4c5-d6e7-8901-abcd-200000000404',
  'Maitland',
  'Gently undulating 18-hole parkland course. Water comes into play on many holes, particularly on the back nine. Haven for wildlife, challenging for serious golfers yet enjoyable for those seeking exercise.',
  113,
  71.0,
  '[
    {"number": 1, "par": 4, "strokeIndex": 8, "yardages": {"black": 357, "red": 338}},
    {"number": 2, "par": 4, "strokeIndex": 1, "yardages": {"black": 418, "red": 415}},
    {"number": 3, "par": 3, "strokeIndex": 7, "yardages": {"black": 180, "red": 177}},
    {"number": 4, "par": 5, "strokeIndex": 13, "yardages": {"black": 464, "red": 418}},
    {"number": 5, "par": 3, "strokeIndex": 12, "yardages": {"black": 143, "red": 139}},
    {"number": 6, "par": 4, "strokeIndex": 16, "yardages": {"black": 304, "red": 293}},
    {"number": 7, "par": 5, "strokeIndex": 11, "yardages": {"black": 465, "red": 374}},
    {"number": 8, "par": 4, "strokeIndex": 4, "yardages": {"black": 308, "red": 199}},
    {"number": 9, "par": 4, "strokeIndex": 5, "yardages": {"black": 348, "red": 332}},
    {"number": 10, "par": 4, "strokeIndex": 9, "yardages": {"black": 326, "red": 319}},
    {"number": 11, "par": 3, "strokeIndex": 6, "yardages": {"black": 169, "red": 156}},
    {"number": 12, "par": 4, "strokeIndex": 10, "yardages": {"black": 335, "red": 312}},
    {"number": 13, "par": 3, "strokeIndex": 15, "yardages": {"black": 116, "red": 101}},
    {"number": 14, "par": 5, "strokeIndex": 14, "yardages": {"black": 464, "red": 400}},
    {"number": 15, "par": 5, "strokeIndex": 18, "yardages": {"black": 432, "red": 364}},
    {"number": 16, "par": 4, "strokeIndex": 2, "yardages": {"black": 367, "red": 343}},
    {"number": 17, "par": 3, "strokeIndex": 17, "yardages": {"black": 146, "red": 134}},
    {"number": 18, "par": 4, "strokeIndex": 3, "yardages": {"black": 366, "red": 328}}
  ]'::jsonb,
  '[
    {"name": "Black", "color": "black", "courseRating": 71.0, "slopeRating": 113, "totalYardage": 5708},
    {"name": "Red", "color": "red", "courseRating": 72.0, "slopeRating": 113, "totalYardage": 5142}
  ]'::jsonb
)
ON CONFLICT (venue_id, name) DO UPDATE SET
  description = EXCLUDED.description,
  slope_rating = EXCLUDED.slope_rating,
  course_rating = EXCLUDED.course_rating,
  holes = EXCLUDED.holes,
  tees = EXCLUDED.tees;

-- CHARLESTOWN GOLF CLUB
INSERT INTO courses (venue_id, name, description, slope_rating, course_rating, holes, tees)
VALUES (
  'f2a3b4c5-d6e7-8901-abcd-200000000405',
  'Charlestown',
  'Par 72 championship course built in 1971, located in the heart of Newcastle and Lake Macquarie region. Features some hills, water hazards, heavy bunkering and tree-lined fairways.',
  136,
  72.0,
  '[
    {"number": 1, "par": 4, "strokeIndex": 17, "yardages": {"blue": 346, "red": 339, "yellow": 275}},
    {"number": 2, "par": 3, "strokeIndex": 8, "yardages": {"blue": 138, "red": 120, "yellow": 127}},
    {"number": 3, "par": 5, "strokeIndex": 14, "yardages": {"blue": 470, "red": 408, "yellow": 453}},
    {"number": 4, "par": 5, "strokeIndex": 18, "yardages": {"blue": 463, "red": 432, "yellow": 442}},
    {"number": 5, "par": 4, "strokeIndex": 4, "yardages": {"blue": 372, "red": 313, "yellow": 354}},
    {"number": 6, "par": 3, "strokeIndex": 5, "yardages": {"blue": 179, "red": 167, "yellow": 169}},
    {"number": 7, "par": 4, "strokeIndex": 9, "yardages": {"blue": 328, "red": 295, "yellow": 301}},
    {"number": 8, "par": 4, "strokeIndex": 11, "yardages": {"blue": 329, "red": 305, "yellow": 310}},
    {"number": 9, "par": 4, "strokeIndex": 12, "yardages": {"blue": 290, "red": 264, "yellow": 279}},
    {"number": 10, "par": 4, "strokeIndex": 16, "yardages": {"blue": 341, "red": 265, "yellow": 156}},
    {"number": 11, "par": 4, "strokeIndex": 2, "yardages": {"blue": 414, "red": 329, "yellow": 320}},
    {"number": 12, "par": 3, "strokeIndex": 3, "yardages": {"blue": 205, "red": 165, "yellow": 379}},
    {"number": 13, "par": 4, "strokeIndex": 6, "yardages": {"blue": 365, "red": 320, "yellow": 185}},
    {"number": 14, "par": 4, "strokeIndex": 15, "yardages": {"blue": 344, "red": 303, "yellow": 349}},
    {"number": 15, "par": 5, "strokeIndex": 13, "yardages": {"blue": 536, "red": 425, "yellow": 316}},
    {"number": 16, "par": 3, "strokeIndex": 7, "yardages": {"blue": 145, "red": 118, "yellow": 478}},
    {"number": 17, "par": 4, "strokeIndex": 1, "yardages": {"blue": 401, "red": 315, "yellow": 360}},
    {"number": 18, "par": 5, "strokeIndex": 10, "yardages": {"blue": 525, "red": 409, "yellow": 504}}
  ]'::jsonb,
  '[
    {"name": "Blue", "color": "blue", "courseRating": 72.0, "slopeRating": 136, "totalYardage": 6191},
    {"name": "Red", "color": "red", "courseRating": 72.0, "slopeRating": 128, "totalYardage": 5292},
    {"name": "Yellow", "color": "yellow", "courseRating": 71.0, "slopeRating": 130, "totalYardage": 5757}
  ]'::jsonb
)
ON CONFLICT (venue_id, name) DO UPDATE SET
  description = EXCLUDED.description,
  slope_rating = EXCLUDED.slope_rating,
  course_rating = EXCLUDED.course_rating,
  holes = EXCLUDED.holes,
  tees = EXCLUDED.tees;

-- GOSFORD GOLF CLUB (Central Coast oldest course)
INSERT INTO courses (venue_id, name, description, slope_rating, course_rating, holes, tees)
VALUES (
  'f2a3b4c5-d6e7-8901-abcd-200000000406',
  'Gosford',
  'The oldest golf course on the Central Coast with first rounds played in 1928. Par 71 layout nestled between Narara Creek and Gosford CBD with sweeping mountain views. Tree-lined fairways with water on half a dozen holes.',
  122,
  70.0,
  '[
    {"number": 1, "par": 4, "strokeIndex": 12, "yardages": {"blue": 291, "red": 286}},
    {"number": 2, "par": 5, "strokeIndex": 17, "yardages": {"blue": 456, "red": 421}},
    {"number": 3, "par": 4, "strokeIndex": 4, "yardages": {"blue": 376, "red": 329}},
    {"number": 4, "par": 4, "strokeIndex": 10, "yardages": {"blue": 335, "red": 322}},
    {"number": 5, "par": 3, "strokeIndex": 15, "yardages": {"blue": 170, "red": 148}},
    {"number": 6, "par": 4, "strokeIndex": 6, "yardages": {"blue": 385, "red": 372}},
    {"number": 7, "par": 4, "strokeIndex": 8, "yardages": {"blue": 348, "red": 323}},
    {"number": 8, "par": 3, "strokeIndex": 11, "yardages": {"blue": 174, "red": 136}},
    {"number": 9, "par": 4, "strokeIndex": 3, "yardages": {"blue": 389, "red": 327}},
    {"number": 10, "par": 5, "strokeIndex": 9, "yardages": {"blue": 448, "red": 414}},
    {"number": 11, "par": 4, "strokeIndex": 1, "yardages": {"blue": 370, "red": 360}},
    {"number": 12, "par": 3, "strokeIndex": 18, "yardages": {"blue": 158, "red": 148}},
    {"number": 13, "par": 4, "strokeIndex": 5, "yardages": {"blue": 372, "red": 340}},
    {"number": 14, "par": 3, "strokeIndex": 16, "yardages": {"blue": 142, "red": 123}},
    {"number": 15, "par": 4, "strokeIndex": 14, "yardages": {"blue": 310, "red": 260}},
    {"number": 16, "par": 4, "strokeIndex": 13, "yardages": {"blue": 307, "red": 295}},
    {"number": 17, "par": 4, "strokeIndex": 2, "yardages": {"blue": 351, "red": 320}},
    {"number": 18, "par": 5, "strokeIndex": 7, "yardages": {"blue": 422, "red": 384}}
  ]'::jsonb,
  '[
    {"name": "Blue", "color": "blue", "courseRating": 70.0, "slopeRating": 122, "totalYardage": 5804},
    {"name": "Red", "color": "red", "courseRating": 73.0, "slopeRating": 126, "totalYardage": 5308}
  ]'::jsonb
)
ON CONFLICT (venue_id, name) DO UPDATE SET
  description = EXCLUDED.description,
  slope_rating = EXCLUDED.slope_rating,
  course_rating = EXCLUDED.course_rating,
  holes = EXCLUDED.holes,
  tees = EXCLUDED.tees;

-- SHELLY BEACH GOLF CLUB (Ross Watson design)
INSERT INTO courses (venue_id, name, description, slope_rating, course_rating, holes, tees)
VALUES (
  'f2a3b4c5-d6e7-8901-abcd-200000000407',
  'Shelly Beach',
  'Ross Watson designed course opened 1957 (club founded 1929). One of the most scenic courses on the eastern seaboard, rolling over gently undulating land overlooking Shelly Beach. Formerly Tuggerah Lakes Golf Club.',
  125,
  71.0,
  '[
    {"number": 1, "par": 5, "strokeIndex": 12, "yardages": {"blue": 504, "white": 429}},
    {"number": 2, "par": 4, "strokeIndex": 1, "yardages": {"blue": 395, "white": 386}},
    {"number": 3, "par": 4, "strokeIndex": 6, "yardages": {"blue": 380, "white": 335}},
    {"number": 4, "par": 3, "strokeIndex": 15, "yardages": {"blue": 133, "white": 127}},
    {"number": 5, "par": 4, "strokeIndex": 9, "yardages": {"blue": 361, "white": 330}},
    {"number": 6, "par": 4, "strokeIndex": 11, "yardages": {"blue": 333, "white": 300}},
    {"number": 7, "par": 4, "strokeIndex": 4, "yardages": {"blue": 363, "white": 295}},
    {"number": 8, "par": 4, "strokeIndex": 7, "yardages": {"blue": 360, "white": 305}},
    {"number": 9, "par": 3, "strokeIndex": 14, "yardages": {"blue": 160, "white": 424}},
    {"number": 10, "par": 3, "strokeIndex": 17, "yardages": {"blue": 120, "white": 110}},
    {"number": 11, "par": 4, "strokeIndex": 3, "yardages": {"blue": 393, "white": 379}},
    {"number": 12, "par": 4, "strokeIndex": 2, "yardages": {"blue": 402, "white": 300}},
    {"number": 13, "par": 3, "strokeIndex": 8, "yardages": {"blue": 150, "white": 145}},
    {"number": 14, "par": 4, "strokeIndex": 5, "yardages": {"blue": 396, "white": 370}},
    {"number": 15, "par": 5, "strokeIndex": 18, "yardages": {"blue": 401, "white": 390}},
    {"number": 16, "par": 4, "strokeIndex": 13, "yardages": {"blue": 315, "white": 320}},
    {"number": 17, "par": 4, "strokeIndex": 16, "yardages": {"blue": 309, "white": 309}},
    {"number": 18, "par": 5, "strokeIndex": 10, "yardages": {"blue": 534, "white": 136}}
  ]'::jsonb,
  '[
    {"name": "Blue", "color": "blue", "courseRating": 71.0, "slopeRating": 125, "totalYardage": 6009},
    {"name": "White", "color": "white", "courseRating": 74.0, "slopeRating": 130, "totalYardage": 5390}
  ]'::jsonb
)
ON CONFLICT (venue_id, name) DO UPDATE SET
  description = EXCLUDED.description,
  slope_rating = EXCLUDED.slope_rating,
  course_rating = EXCLUDED.course_rating,
  holes = EXCLUDED.holes,
  tees = EXCLUDED.tees;

-- MUSWELLBROOK GOLF CLUB (James Wilcher/Prosper Ellis design)
INSERT INTO courses (venue_id, name, description, slope_rating, course_rating, holes, tees)
VALUES (
  'f2a3b4c5-d6e7-8901-abcd-200000000408',
  'Muswellbrook',
  'Challenging Par 72 layout established 1910, redesigned by James Wilcher and Prosper Ellis (1964). Features eight water carries across Muscle Creek which meanders through the course. Bent grass greens, kikuyu fairways.',
  128,
  71.0,
  '[
    {"number": 1, "par": 4, "strokeIndex": 7, "yardages": {"blue": 336, "red": 336}},
    {"number": 2, "par": 4, "strokeIndex": 3, "yardages": {"blue": 354, "red": 308}},
    {"number": 3, "par": 5, "strokeIndex": 5, "yardages": {"blue": 506, "red": 437}},
    {"number": 4, "par": 4, "strokeIndex": 17, "yardages": {"blue": 301, "red": 315}},
    {"number": 5, "par": 3, "strokeIndex": 15, "yardages": {"blue": 120, "red": 118}},
    {"number": 6, "par": 4, "strokeIndex": 13, "yardages": {"blue": 344, "red": 180}},
    {"number": 7, "par": 4, "strokeIndex": 1, "yardages": {"blue": 400, "red": 400}},
    {"number": 8, "par": 3, "strokeIndex": 11, "yardages": {"blue": 144, "red": 117}},
    {"number": 9, "par": 5, "strokeIndex": 9, "yardages": {"blue": 520, "red": 471}},
    {"number": 10, "par": 5, "strokeIndex": 10, "yardages": {"blue": 503, "red": 430}},
    {"number": 11, "par": 3, "strokeIndex": 14, "yardages": {"blue": 125, "red": 121}},
    {"number": 12, "par": 4, "strokeIndex": 8, "yardages": {"blue": 320, "red": 257}},
    {"number": 13, "par": 4, "strokeIndex": 2, "yardages": {"blue": 358, "red": 258}},
    {"number": 14, "par": 3, "strokeIndex": 4, "yardages": {"blue": 183, "red": 137}},
    {"number": 15, "par": 5, "strokeIndex": 16, "yardages": {"blue": 445, "red": 412}},
    {"number": 16, "par": 4, "strokeIndex": 12, "yardages": {"blue": 324, "red": 328}},
    {"number": 17, "par": 3, "strokeIndex": 18, "yardages": {"blue": 106, "red": 105}},
    {"number": 18, "par": 5, "strokeIndex": 6, "yardages": {"blue": 535, "red": 437}}
  ]'::jsonb,
  '[
    {"name": "Blue", "color": "blue", "courseRating": 71.0, "slopeRating": 128, "totalYardage": 5924},
    {"name": "Red", "color": "red", "courseRating": 72.0, "slopeRating": 125, "totalYardage": 5167}
  ]'::jsonb
)
ON CONFLICT (venue_id, name) DO UPDATE SET
  description = EXCLUDED.description,
  slope_rating = EXCLUDED.slope_rating,
  course_rating = EXCLUDED.course_rating,
  holes = EXCLUDED.holes,
  tees = EXCLUDED.tees;

-- WYONG GOLF CLUB
INSERT INTO courses (venue_id, name, description, slope_rating, course_rating, holes, tees)
VALUES (
  'f2a3b4c5-d6e7-8901-abcd-200000000409',
  'Wyong',
  'Established 1923 on 65 acres of pristine Central Coast land. Par 71 layout featuring heavy bunkering, flat terrain with tree-lined fairways, water hazards, and easy walking. 15 minutes from M1 Pacific Motorway.',
  123,
  71.0,
  '[
    {"number": 1, "par": 4, "strokeIndex": 11, "yardages": {"white": 363, "red": 358}},
    {"number": 2, "par": 4, "strokeIndex": 3, "yardages": {"white": 385, "red": 344}},
    {"number": 3, "par": 5, "strokeIndex": 15, "yardages": {"white": 467, "red": 382}},
    {"number": 4, "par": 3, "strokeIndex": 18, "yardages": {"white": 155, "red": 147}},
    {"number": 5, "par": 5, "strokeIndex": 8, "yardages": {"white": 453, "red": 410}},
    {"number": 6, "par": 4, "strokeIndex": 10, "yardages": {"white": 335, "red": 284}},
    {"number": 7, "par": 4, "strokeIndex": 7, "yardages": {"white": 365, "red": 321}},
    {"number": 8, "par": 4, "strokeIndex": 13, "yardages": {"white": 333, "red": 283}},
    {"number": 9, "par": 3, "strokeIndex": 5, "yardages": {"white": 185, "red": 170}},
    {"number": 10, "par": 5, "strokeIndex": 9, "yardages": {"white": 531, "red": 443}},
    {"number": 11, "par": 4, "strokeIndex": 4, "yardages": {"white": 389, "red": 350}},
    {"number": 12, "par": 4, "strokeIndex": 1, "yardages": {"white": 390, "red": 383}},
    {"number": 13, "par": 3, "strokeIndex": 16, "yardages": {"white": 147, "red": 112}},
    {"number": 14, "par": 4, "strokeIndex": 6, "yardages": {"white": 354, "red": 299}},
    {"number": 15, "par": 3, "strokeIndex": 12, "yardages": {"white": 157, "red": 123}},
    {"number": 16, "par": 5, "strokeIndex": 14, "yardages": {"white": 475, "red": 430}},
    {"number": 17, "par": 3, "strokeIndex": 17, "yardages": {"white": 139, "red": 121}},
    {"number": 18, "par": 4, "strokeIndex": 2, "yardages": {"white": 472, "red": 435}}
  ]'::jsonb,
  '[
    {"name": "White", "color": "white", "courseRating": 71.0, "slopeRating": 123, "totalYardage": 6095},
    {"name": "Red", "color": "red", "courseRating": 73.0, "slopeRating": 130, "totalYardage": 5395}
  ]'::jsonb
)
ON CONFLICT (venue_id, name) DO UPDATE SET
  description = EXCLUDED.description,
  slope_rating = EXCLUDED.slope_rating,
  course_rating = EXCLUDED.course_rating,
  holes = EXCLUDED.holes,
  tees = EXCLUDED.tees;

-- TOUKLEY GOLF CLUB
INSERT INTO courses (venue_id, name, description, slope_rating, course_rating, holes, tees)
VALUES (
  'f2a3b4c5-d6e7-8901-abcd-200000000410',
  'Toukley',
  'Friendliest club on the Central Coast, opened 1971 on bushland jutting into Budgewoi Lake. Unique layout: front nine tree-flanked, back nine links-style open to wind. Home to magnificent eagle breeding site.',
  125,
  72.0,
  '[
    {"number": 1, "par": 5, "strokeIndex": 11, "yardages": {"blue": 475, "white": 466, "red": 456}},
    {"number": 2, "par": 4, "strokeIndex": 3, "yardages": {"blue": 395, "white": 371, "red": 332}},
    {"number": 3, "par": 4, "strokeIndex": 13, "yardages": {"blue": 295, "white": 262, "red": 279}},
    {"number": 4, "par": 5, "strokeIndex": 17, "yardages": {"blue": 460, "white": 431, "red": 434}},
    {"number": 5, "par": 4, "strokeIndex": 7, "yardages": {"blue": 378, "white": 355, "red": 302}},
    {"number": 6, "par": 3, "strokeIndex": 9, "yardages": {"blue": 179, "white": 156, "red": 152}},
    {"number": 7, "par": 4, "strokeIndex": 5, "yardages": {"blue": 384, "white": 354, "red": 287}},
    {"number": 8, "par": 3, "strokeIndex": 15, "yardages": {"blue": 135, "white": 116, "red": 119}},
    {"number": 9, "par": 4, "strokeIndex": 1, "yardages": {"blue": 381, "white": 363, "red": 370}},
    {"number": 10, "par": 4, "strokeIndex": 10, "yardages": {"blue": 350, "white": 330, "red": 349}},
    {"number": 11, "par": 4, "strokeIndex": 14, "yardages": {"blue": 330, "white": 303, "red": 311}},
    {"number": 12, "par": 5, "strokeIndex": 12, "yardages": {"blue": 482, "white": 460, "red": 418}},
    {"number": 13, "par": 3, "strokeIndex": 16, "yardages": {"blue": 150, "white": 135, "red": 131}},
    {"number": 14, "par": 4, "strokeIndex": 8, "yardages": {"blue": 362, "white": 333, "red": 332}},
    {"number": 15, "par": 5, "strokeIndex": 2, "yardages": {"blue": 532, "white": 527, "red": 475}},
    {"number": 16, "par": 4, "strokeIndex": 18, "yardages": {"blue": 288, "white": 266, "red": 269}},
    {"number": 17, "par": 3, "strokeIndex": 6, "yardages": {"blue": 196, "white": 173, "red": 167}},
    {"number": 18, "par": 4, "strokeIndex": 4, "yardages": {"blue": 370, "white": 354, "red": 377}}
  ]'::jsonb,
  '[
    {"name": "Blue", "color": "blue", "courseRating": 72.0, "slopeRating": 130, "totalYardage": 6142},
    {"name": "White", "color": "white", "courseRating": 71.0, "slopeRating": 125, "totalYardage": 5755},
    {"name": "Red", "color": "red", "courseRating": 74.0, "slopeRating": 128, "totalYardage": 5560}
  ]'::jsonb
)
ON CONFLICT (venue_id, name) DO UPDATE SET
  description = EXCLUDED.description,
  slope_rating = EXCLUDED.slope_rating,
  course_rating = EXCLUDED.course_rating,
  holes = EXCLUDED.holes,
  tees = EXCLUDED.tees;

-- KOOINDAH WATERS GOLF CLUB (Ross Watson/Craig Parry design, Top 100)
INSERT INTO courses (venue_id, name, description, slope_rating, course_rating, holes, tees)
VALUES (
  'f2a3b4c5-d6e7-8901-abcd-200000000411',
  'Kooindah Waters',
  'Ross Watson and Craig Parry designed championship course. Ranked Top 100 in Australia. Features water on every hole and 84 bunkers (some with railway sleeper walls). Couch fairways and superb bent grass greens.',
  139,
  72.0,
  '[
    {"number": 1, "par": 5, "strokeIndex": 13, "yardages": {"black": 463, "white": 422, "green": 386}},
    {"number": 2, "par": 3, "strokeIndex": 7, "yardages": {"black": 149, "white": 134, "green": 103}},
    {"number": 3, "par": 4, "strokeIndex": 4, "yardages": {"black": 387, "white": 365, "green": 353}},
    {"number": 4, "par": 3, "strokeIndex": 17, "yardages": {"black": 161, "white": 142, "green": 114}},
    {"number": 5, "par": 5, "strokeIndex": 10, "yardages": {"black": 478, "white": 457, "green": 401}},
    {"number": 6, "par": 3, "strokeIndex": 18, "yardages": {"black": 141, "white": 126, "green": 100}},
    {"number": 7, "par": 4, "strokeIndex": 16, "yardages": {"black": 344, "white": 400, "green": 302}},
    {"number": 8, "par": 5, "strokeIndex": 3, "yardages": {"black": 475, "white": 460, "green": 402}},
    {"number": 9, "par": 4, "strokeIndex": 2, "yardages": {"black": 354, "white": 323, "green": 289}},
    {"number": 10, "par": 5, "strokeIndex": 11, "yardages": {"black": 500, "white": 461, "green": 410}},
    {"number": 11, "par": 4, "strokeIndex": 9, "yardages": {"black": 363, "white": 351, "green": 286}},
    {"number": 12, "par": 3, "strokeIndex": 15, "yardages": {"black": 176, "white": 147, "green": 122}},
    {"number": 13, "par": 4, "strokeIndex": 6, "yardages": {"black": 368, "white": 353, "green": 298}},
    {"number": 14, "par": 4, "strokeIndex": 12, "yardages": {"black": 298, "white": 285, "green": 252}},
    {"number": 15, "par": 5, "strokeIndex": 5, "yardages": {"black": 536, "white": 513, "green": 452}},
    {"number": 16, "par": 4, "strokeIndex": 8, "yardages": {"black": 367, "white": 347, "green": 269}},
    {"number": 17, "par": 3, "strokeIndex": 14, "yardages": {"black": 126, "white": 116, "green": 79}},
    {"number": 18, "par": 4, "strokeIndex": 1, "yardages": {"black": 397, "white": 382, "green": 337}}
  ]'::jsonb,
  '[
    {"name": "Black", "color": "black", "courseRating": 72.0, "slopeRating": 143, "totalYardage": 6083},
    {"name": "White", "color": "white", "courseRating": 72.0, "slopeRating": 139, "totalYardage": 5784},
    {"name": "Green", "color": "green", "courseRating": 72.0, "slopeRating": 118, "totalYardage": 4955}
  ]'::jsonb
)
ON CONFLICT (venue_id, name) DO UPDATE SET
  description = EXCLUDED.description,
  slope_rating = EXCLUDED.slope_rating,
  course_rating = EXCLUDED.course_rating,
  holes = EXCLUDED.holes,
  tees = EXCLUDED.tees;

-- PACIFIC DUNES GOLF CLUB (James Wilcher design, #26 Golf Australia)
INSERT INTO courses (venue_id, name, description, slope_rating, course_rating, holes, tees)
VALUES (
  'f2a3b4c5-d6e7-8901-abcd-200000000412',
  'Pacific Dunes',
  'James Wilcher designed championship course (2005). Ranked #26 by Golf Australia. Santa Ana couch fairways and pure bentgrass greens. Opening nine through native woodland, back nine features stunning wetland landscapes.',
  134,
  73.0,
  '[
    {"number": 1, "par": 4, "strokeIndex": 18, "yardages": {"black": 361, "blue": 305, "red": 285}},
    {"number": 2, "par": 4, "strokeIndex": 11, "yardages": {"black": 405, "blue": 339, "red": 301}},
    {"number": 3, "par": 4, "strokeIndex": 16, "yardages": {"black": 324, "blue": 278, "red": 253}},
    {"number": 4, "par": 5, "strokeIndex": 8, "yardages": {"black": 560, "blue": 486, "red": 414}},
    {"number": 5, "par": 3, "strokeIndex": 9, "yardages": {"black": 199, "blue": 150, "red": 127}},
    {"number": 6, "par": 5, "strokeIndex": 5, "yardages": {"black": 605, "blue": 527, "red": 486}},
    {"number": 7, "par": 4, "strokeIndex": 2, "yardages": {"black": 445, "blue": 386, "red": 343}},
    {"number": 8, "par": 3, "strokeIndex": 14, "yardages": {"black": 210, "blue": 181, "red": 137}},
    {"number": 9, "par": 4, "strokeIndex": 4, "yardages": {"black": 439, "blue": 120, "red": 328}},
    {"number": 10, "par": 4, "strokeIndex": 17, "yardages": {"black": 313, "blue": 268, "red": 228}},
    {"number": 11, "par": 5, "strokeIndex": 12, "yardages": {"black": 525, "blue": 464, "red": 424}},
    {"number": 12, "par": 4, "strokeIndex": 3, "yardages": {"black": 422, "blue": 370, "red": 347}},
    {"number": 13, "par": 4, "strokeIndex": 1, "yardages": {"black": 427, "blue": 369, "red": 343}},
    {"number": 14, "par": 3, "strokeIndex": 13, "yardages": {"black": 194, "blue": 141, "red": 129}},
    {"number": 15, "par": 4, "strokeIndex": 15, "yardages": {"black": 389, "blue": 330, "red": 306}},
    {"number": 16, "par": 4, "strokeIndex": 6, "yardages": {"black": 416, "blue": 356, "red": 316}},
    {"number": 17, "par": 3, "strokeIndex": 10, "yardages": {"black": 220, "blue": 185, "red": 417}},
    {"number": 18, "par": 5, "strokeIndex": 7, "yardages": {"black": 529, "blue": 461, "red": 435}}
  ]'::jsonb,
  '[
    {"name": "Black", "color": "black", "courseRating": 75.0, "slopeRating": 140, "totalYardage": 6983},
    {"name": "Blue", "color": "blue", "courseRating": 73.0, "slopeRating": 134, "totalYardage": 5716},
    {"name": "Red", "color": "red", "courseRating": 73.0, "slopeRating": 135, "totalYardage": 5619}
  ]'::jsonb
)
ON CONFLICT (venue_id, name) DO UPDATE SET
  description = EXCLUDED.description,
  slope_rating = EXCLUDED.slope_rating,
  course_rating = EXCLUDED.course_rating,
  holes = EXCLUDED.holes,
  tees = EXCLUDED.tees;

-- HUNTER VALLEY GOLF & COUNTRY CLUB
INSERT INTO courses (venue_id, name, description, slope_rating, course_rating, holes, tees)
VALUES (
  'f2a3b4c5-d6e7-8901-abcd-200000000413',
  'Hunter Valley',
  'Spectacular championship Par 71 course set amongst Hunter Valley''s famous vineyards. Features expansive lake, rolling hills and tree-lined fairways. Located within Crowne Plaza Hunter Valley.',
  128,
  71.0,
  '[
    {"number": 1, "par": 4, "strokeIndex": 14, "yardages": {"blue": 296, "white": 295, "red": 280}},
    {"number": 2, "par": 4, "strokeIndex": 16, "yardages": {"blue": 294, "white": 276, "red": 257}},
    {"number": 3, "par": 3, "strokeIndex": 18, "yardages": {"blue": 111, "white": 104, "red": 94}},
    {"number": 4, "par": 3, "strokeIndex": 7, "yardages": {"blue": 167, "white": 147, "red": 142}},
    {"number": 5, "par": 4, "strokeIndex": 10, "yardages": {"blue": 400, "white": 366, "red": 300}},
    {"number": 6, "par": 4, "strokeIndex": 4, "yardages": {"blue": 346, "white": 322, "red": 299}},
    {"number": 7, "par": 4, "strokeIndex": 1, "yardages": {"blue": 392, "white": 380, "red": 359}},
    {"number": 8, "par": 3, "strokeIndex": 3, "yardages": {"blue": 207, "white": 197, "red": 183}},
    {"number": 9, "par": 5, "strokeIndex": 5, "yardages": {"blue": 515, "white": 489, "red": 457}},
    {"number": 10, "par": 3, "strokeIndex": 6, "yardages": {"blue": 176, "white": 150, "red": 139}},
    {"number": 11, "par": 4, "strokeIndex": 17, "yardages": {"blue": 262, "white": 240, "red": 240}},
    {"number": 12, "par": 4, "strokeIndex": 8, "yardages": {"blue": 328, "white": 303, "red": 291}},
    {"number": 13, "par": 4, "strokeIndex": 2, "yardages": {"blue": 399, "white": 374, "red": 359}},
    {"number": 14, "par": 5, "strokeIndex": 13, "yardages": {"blue": 502, "white": 485, "red": 461}},
    {"number": 15, "par": 4, "strokeIndex": 11, "yardages": {"blue": 330, "white": 306, "red": 285}},
    {"number": 16, "par": 5, "strokeIndex": 15, "yardages": {"blue": 436, "white": 425, "red": 376}},
    {"number": 17, "par": 3, "strokeIndex": 9, "yardages": {"blue": 159, "white": 130, "red": 123}},
    {"number": 18, "par": 5, "strokeIndex": 12, "yardages": {"blue": 454, "white": 408, "red": 362}}
  ]'::jsonb,
  '[
    {"name": "Blue", "color": "blue", "courseRating": 71.0, "slopeRating": 128, "totalYardage": 5774},
    {"name": "White", "color": "white", "courseRating": 69.0, "slopeRating": 126, "totalYardage": 5397},
    {"name": "Red", "color": "red", "courseRating": 72.0, "slopeRating": 128, "totalYardage": 5007}
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

-- NEWCASTLE GOLF CLUB (existing venue - Fern Bay)
INSERT INTO courses (venue_id, name, description, slope_rating, course_rating, holes, tees)
VALUES (
  '42b7eabc-c9a0-46be-9b42-699b5390d35d',
  'Newcastle',
  'Eric Apperly designed parkland course opened 1935 at Fern Bay. Par 72 championship layout with driving range, putting green, motor carts, pro shop, golf lessons, restaurant and changing rooms.',
  136,
  76.0,
  '[
    {"number": 1, "par": 4, "strokeIndex": 6, "yardages": {"blue": 376, "red": 317}},
    {"number": 2, "par": 4, "strokeIndex": 10, "yardages": {"blue": 361, "red": 328}},
    {"number": 3, "par": 3, "strokeIndex": 2, "yardages": {"blue": 217, "red": 217}},
    {"number": 4, "par": 5, "strokeIndex": 18, "yardages": {"blue": 414, "red": 414}},
    {"number": 5, "par": 4, "strokeIndex": 4, "yardages": {"blue": 368, "red": 325}},
    {"number": 6, "par": 4, "strokeIndex": 8, "yardages": {"blue": 367, "red": 306}},
    {"number": 7, "par": 3, "strokeIndex": 16, "yardages": {"blue": 148, "red": 128}},
    {"number": 8, "par": 4, "strokeIndex": 12, "yardages": {"blue": 325, "red": 272}},
    {"number": 9, "par": 5, "strokeIndex": 14, "yardages": {"blue": 473, "red": 419}},
    {"number": 10, "par": 5, "strokeIndex": 11, "yardages": {"blue": 485, "red": 439}},
    {"number": 11, "par": 4, "strokeIndex": 17, "yardages": {"blue": 326, "red": 315}},
    {"number": 12, "par": 3, "strokeIndex": 13, "yardages": {"blue": 173, "red": 130}},
    {"number": 13, "par": 5, "strokeIndex": 15, "yardages": {"blue": 445, "red": 315}},
    {"number": 14, "par": 4, "strokeIndex": 3, "yardages": {"blue": 391, "red": 382}},
    {"number": 15, "par": 4, "strokeIndex": 5, "yardages": {"blue": 382, "red": 271}},
    {"number": 16, "par": 3, "strokeIndex": 7, "yardages": {"blue": 212, "red": 150}},
    {"number": 17, "par": 4, "strokeIndex": 1, "yardages": {"blue": 385, "red": 307}},
    {"number": 18, "par": 4, "strokeIndex": 9, "yardages": {"blue": 352, "red": 299}}
  ]'::jsonb,
  '[
    {"name": "Blue", "color": "blue", "courseRating": 76.0, "slopeRating": 136, "totalYardage": 6200},
    {"name": "Red", "color": "red", "courseRating": 73.0, "slopeRating": 121, "totalYardage": 5334}
  ]'::jsonb
)
ON CONFLICT (venue_id, name) DO UPDATE SET
  description = EXCLUDED.description,
  slope_rating = EXCLUDED.slope_rating,
  course_rating = EXCLUDED.course_rating,
  holes = EXCLUDED.holes,
  tees = EXCLUDED.tees;

-- MAGENTA SHORES GOLF & COUNTRY CLUB (existing venue)
INSERT INTO courses (venue_id, name, description, slope_rating, course_rating, holes, tees)
VALUES (
  '621196e0-156a-47a3-877e-a50676f2d713',
  'Magenta Shores',
  'Ross Watson designed links-style resort course (2006). Ranked #33 in Golf Australia Top 100. Private course with magnificent ocean views from front 9, back 9 adjacent to rainforest and National Parks. Sand-based course playable in most weather.',
  142,
  73.0,
  '[]'::jsonb,
  '[
    {"name": "Championship", "color": "blue", "courseRating": 73.0, "slopeRating": 142, "totalYardage": 6057}
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
--   - The Vintage Golf Club (Greg Norman design, Top 100 #31)
--   - Cypress Lakes Golf & Country Club (Steve Smyers, Top 100 Public #66)
--   - Horizons Golf Resort (Graham Marsh/Ross Watson, Top 100)
--   - Maitland Golf Club
--   - Charlestown Golf Club
--   - Gosford Golf Club (Central Coast oldest, 1928)
--   - Shelly Beach Golf Club (Ross Watson)
--   - Muswellbrook Golf Club
--   - Wyong Golf Club
--   - Toukley Golf Club
--   - Kooindah Waters Golf Club (Top 100, Ross Watson/Craig Parry)
--   - Pacific Dunes Golf Club (#26 Golf Australia, James Wilcher)
--   - Hunter Valley Golf & Country Club
--
-- Existing Venues Updated: 2
--   - Newcastle Golf Club (Fern Bay) - FULL DATA
--   - Magenta Shores Golf & Country Club - PARTIAL (ratings only)
--
-- Total Courses with Full Hole Data: 14
-- =====================================================
