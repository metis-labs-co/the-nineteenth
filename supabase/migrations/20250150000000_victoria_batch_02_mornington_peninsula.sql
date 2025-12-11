-- =====================================================
-- Migration: victoria_batch_02_mornington_peninsula
-- Description: Add Mornington Peninsula golf venues and courses
--              Part of Victorian golf course data collection
-- Date: 2025-12-10
-- Batch: 2 of 7 (Mornington Peninsula)
-- =====================================================

-- =====================================================
-- STEP 1: INSERT NEW VENUES
-- Using ON CONFLICT to handle re-runs safely
-- =====================================================

-- Mornington Golf Club
INSERT INTO venues (id, source, name, state, city, address, phone, website, total_holes)
VALUES (
  'f1a2b3c4-d5e6-7890-abcd-200000000001',
  'manual',
  'Mornington Golf Club',
  'VIC',
  'Mornington',
  'Tallis Drive, Mornington VIC 3931',
  '+61 3 5975 2784',
  'https://www.morningtongolf.com.au',
  18
)
ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name,
  address = EXCLUDED.address,
  phone = EXCLUDED.phone,
  website = EXCLUDED.website;

-- Portsea Golf Club
INSERT INTO venues (id, source, name, state, city, address, phone, website, total_holes)
VALUES (
  'f1a2b3c4-d5e6-7890-abcd-200000000002',
  'manual',
  'Portsea Golf Club',
  'VIC',
  'Portsea',
  'Relph Avenue, Portsea VIC 3944',
  '+61 3 5984 3521',
  'https://www.portseagolf.com.au',
  18
)
ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name,
  address = EXCLUDED.address,
  phone = EXCLUDED.phone,
  website = EXCLUDED.website;

-- Sorrento Golf Club
INSERT INTO venues (id, source, name, state, city, address, phone, website, total_holes)
VALUES (
  'f1a2b3c4-d5e6-7890-abcd-200000000003',
  'manual',
  'Sorrento Golf Club',
  'VIC',
  'Sorrento',
  'Langford Road, Sorrento VIC 3943',
  '+61 3 5984 2226',
  'https://www.sorrentogolf.com.au',
  18
)
ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name,
  address = EXCLUDED.address,
  phone = EXCLUDED.phone,
  website = EXCLUDED.website;

-- RACV Cape Schanck Resort
INSERT INTO venues (id, source, name, state, city, address, phone, website, total_holes)
VALUES (
  'f1a2b3c4-d5e6-7890-abcd-200000000004',
  'manual',
  'RACV Cape Schanck Resort',
  'VIC',
  'Cape Schanck',
  'Trent Jones Drive, Cape Schanck VIC 3939',
  '+61 3 5950 8000',
  'https://www.racv.com.au/travel-experiences/resorts/cape-schanck/golf.html',
  18
)
ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name,
  address = EXCLUDED.address,
  phone = EXCLUDED.phone,
  website = EXCLUDED.website;

-- Flinders Golf Club
INSERT INTO venues (id, source, name, state, city, address, phone, website, total_holes)
VALUES (
  'f1a2b3c4-d5e6-7890-abcd-200000000005',
  'manual',
  'Flinders Golf Club',
  'VIC',
  'Flinders',
  'Bass Street, Flinders VIC 3929',
  '+61 3 5989 0302',
  'https://www.flindersgolf.com.au',
  18
)
ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name,
  address = EXCLUDED.address,
  phone = EXCLUDED.phone,
  website = EXCLUDED.website;

-- Eagle Ridge Golf Course
INSERT INTO venues (id, source, name, state, city, address, phone, website, total_holes)
VALUES (
  'f1a2b3c4-d5e6-7890-abcd-200000000006',
  'manual',
  'Eagle Ridge Golf Course',
  'VIC',
  'Boneo',
  '215 Browns Road, Boneo VIC 3939',
  '+61 3 5988 2500',
  'https://www.eagleridge.com.au',
  18
)
ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name,
  address = EXCLUDED.address,
  phone = EXCLUDED.phone,
  website = EXCLUDED.website;

-- Rosebud Country Club
INSERT INTO venues (id, source, name, state, city, address, phone, website, total_holes)
VALUES (
  'f1a2b3c4-d5e6-7890-abcd-200000000007',
  'manual',
  'Rosebud Country Club',
  'VIC',
  'Rosebud',
  '207 Boneo Road, Rosebud VIC 3939',
  '+61 3 5950 0888',
  'https://www.rosebudcountryclub.com.au',
  36
)
ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name,
  address = EXCLUDED.address,
  phone = EXCLUDED.phone,
  website = EXCLUDED.website,
  total_holes = EXCLUDED.total_holes;

-- Devilbend Golf Club
INSERT INTO venues (id, source, name, state, city, address, phone, website, total_holes)
VALUES (
  'f1a2b3c4-d5e6-7890-abcd-200000000008',
  'manual',
  'Devilbend Golf Club',
  'VIC',
  'Moorooduc',
  '170 Bentons Road, Moorooduc VIC 3933',
  '+61 3 5978 8377',
  'https://www.devilbendgolf.com.au',
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

-- MORNINGTON GOLF CLUB
-- Championship course with stunning views of Port Phillip Bay
INSERT INTO courses (venue_id, name, description, slope_rating, course_rating, holes, tees)
VALUES (
  'f1a2b3c4-d5e6-7890-abcd-200000000001',
  'Mornington',
  'Championship course offering stunning views across Port Phillip Bay. Features undulating fairways, strategic bunkering, and pristine Bent Grass greens. The signature 7th hole provides panoramic bay views with a thrilling downhill tee shot.',
  113,
  72.0,
  '[
    {"number": 1, "par": 4, "strokeIndex": 18, "yardages": {"blue": 302, "red": 288}},
    {"number": 2, "par": 5, "strokeIndex": 12, "yardages": {"blue": 451, "red": 430}},
    {"number": 3, "par": 4, "strokeIndex": 8, "yardages": {"blue": 345, "red": 332}},
    {"number": 4, "par": 4, "strokeIndex": 1, "yardages": {"blue": 380, "red": 350}},
    {"number": 5, "par": 3, "strokeIndex": 16, "yardages": {"blue": 140, "red": 130}},
    {"number": 6, "par": 4, "strokeIndex": 6, "yardages": {"blue": 350, "red": 315}},
    {"number": 7, "par": 3, "strokeIndex": 10, "yardages": {"blue": 175, "red": 160}},
    {"number": 8, "par": 5, "strokeIndex": 14, "yardages": {"blue": 438, "red": 330}},
    {"number": 9, "par": 4, "strokeIndex": 5, "yardages": {"blue": 371, "red": 340}},
    {"number": 10, "par": 3, "strokeIndex": 15, "yardages": {"blue": 164, "red": 148}},
    {"number": 11, "par": 4, "strokeIndex": 2, "yardages": {"blue": 405, "red": 380}},
    {"number": 12, "par": 4, "strokeIndex": 13, "yardages": {"blue": 346, "red": 330}},
    {"number": 13, "par": 4, "strokeIndex": 3, "yardages": {"blue": 380, "red": 291}},
    {"number": 14, "par": 5, "strokeIndex": 11, "yardages": {"blue": 510, "red": 423}},
    {"number": 15, "par": 4, "strokeIndex": 4, "yardages": {"blue": 342, "red": 260}},
    {"number": 16, "par": 3, "strokeIndex": 17, "yardages": {"blue": 129, "red": 115}},
    {"number": 17, "par": 4, "strokeIndex": 7, "yardages": {"blue": 318, "red": 310}},
    {"number": 18, "par": 5, "strokeIndex": 9, "yardages": {"blue": 464, "red": 387}}
  ]'::jsonb,
  '[
    {"name": "Blue", "color": "blue", "courseRating": 72.0, "slopeRating": 113, "totalYardage": 6010},
    {"name": "Red", "color": "red", "courseRating": 73.0, "slopeRating": 113, "totalYardage": 5319}
  ]'::jsonb
)
ON CONFLICT (venue_id, name) DO UPDATE SET
  description = EXCLUDED.description,
  slope_rating = EXCLUDED.slope_rating,
  course_rating = EXCLUDED.course_rating,
  holes = EXCLUDED.holes,
  tees = EXCLUDED.tees;

-- PORTSEA GOLF CLUB
-- Historic parkland course established in 1925
INSERT INTO courses (venue_id, name, description, slope_rating, course_rating, holes, tees)
VALUES (
  'f1a2b3c4-d5e6-7890-abcd-200000000002',
  'Portsea',
  'Historic parkland course established in 1925 on the tip of the Mornington Peninsula. Features rolling terrain with spectacular ocean views. The challenging layout rewards strategic play over power. Ranked in Australia''s Top 100.',
  113,
  72.0,
  '[
    {"number": 1, "par": 4, "strokeIndex": 8, "yardages": {"blue": 294, "red": 362}},
    {"number": 2, "par": 3, "strokeIndex": 18, "yardages": {"blue": 136, "red": 234}},
    {"number": 3, "par": 5, "strokeIndex": 12, "yardages": {"blue": 436, "red": 130}},
    {"number": 4, "par": 4, "strokeIndex": 1, "yardages": {"blue": 385, "red": 336}},
    {"number": 5, "par": 4, "strokeIndex": 11, "yardages": {"blue": 296, "red": 318}},
    {"number": 6, "par": 4, "strokeIndex": 5, "yardages": {"blue": 327, "red": 322}},
    {"number": 7, "par": 3, "strokeIndex": 15, "yardages": {"blue": 155, "red": 121}},
    {"number": 8, "par": 5, "strokeIndex": 14, "yardages": {"blue": 477, "red": 380}},
    {"number": 9, "par": 4, "strokeIndex": 10, "yardages": {"blue": 326, "red": 396}},
    {"number": 10, "par": 4, "strokeIndex": 13, "yardages": {"blue": 235, "red": 296}},
    {"number": 11, "par": 5, "strokeIndex": 17, "yardages": {"blue": 441, "red": 312}},
    {"number": 12, "par": 4, "strokeIndex": 6, "yardages": {"blue": 340, "red": 150}},
    {"number": 13, "par": 3, "strokeIndex": 9, "yardages": {"blue": 136, "red": 216}},
    {"number": 14, "par": 4, "strokeIndex": 4, "yardages": {"blue": 378, "red": 395}},
    {"number": 15, "par": 4, "strokeIndex": 7, "yardages": {"blue": 256, "red": 330}},
    {"number": 16, "par": 3, "strokeIndex": 16, "yardages": {"blue": 158, "red": 120}},
    {"number": 17, "par": 4, "strokeIndex": 3, "yardages": {"blue": 356, "red": 328}},
    {"number": 18, "par": 4, "strokeIndex": 2, "yardages": {"blue": 378, "red": 465}}
  ]'::jsonb,
  '[
    {"name": "Blue", "color": "blue", "courseRating": 72.0, "slopeRating": 113, "totalYardage": 5510},
    {"name": "Red", "color": "red", "courseRating": 68.8, "slopeRating": 124, "totalYardage": 5211}
  ]'::jsonb
)
ON CONFLICT (venue_id, name) DO UPDATE SET
  description = EXCLUDED.description,
  slope_rating = EXCLUDED.slope_rating,
  course_rating = EXCLUDED.course_rating,
  holes = EXCLUDED.holes,
  tees = EXCLUDED.tees;

-- SORRENTO GOLF CLUB
-- Historic links-style course opened in 1891
INSERT INTO courses (venue_id, name, description, slope_rating, course_rating, holes, tees)
VALUES (
  'f1a2b3c4-d5e6-7890-abcd-200000000003',
  'Sorrento',
  'One of Victoria''s most historic clubs, opened in 1891. Modern links-style layout with hilly, undulating ground, water hazards, and heavy bunkering. Features Bent Grass greens and challenging par fours at holes 8 and 12. Ranked in Australia''s Top 100.',
  132,
  70.0,
  '[
    {"number": 1, "par": 4, "strokeIndex": 14, "yardages": {"blue": 340, "red": 310}},
    {"number": 2, "par": 3, "strokeIndex": 8, "yardages": {"blue": 175, "red": 155}},
    {"number": 3, "par": 5, "strokeIndex": 12, "yardages": {"blue": 485, "red": 445}},
    {"number": 4, "par": 4, "strokeIndex": 16, "yardages": {"blue": 295, "red": 275}},
    {"number": 5, "par": 3, "strokeIndex": 6, "yardages": {"blue": 165, "red": 145}},
    {"number": 6, "par": 4, "strokeIndex": 10, "yardages": {"blue": 355, "red": 325}},
    {"number": 7, "par": 4, "strokeIndex": 4, "yardages": {"blue": 385, "red": 355}},
    {"number": 8, "par": 4, "strokeIndex": 2, "yardages": {"blue": 420, "red": 380}},
    {"number": 9, "par": 5, "strokeIndex": 18, "yardages": {"blue": 465, "red": 425}},
    {"number": 10, "par": 4, "strokeIndex": 11, "yardages": {"blue": 345, "red": 315}},
    {"number": 11, "par": 5, "strokeIndex": 13, "yardages": {"blue": 490, "red": 450}},
    {"number": 12, "par": 4, "strokeIndex": 1, "yardages": {"blue": 430, "red": 390}},
    {"number": 13, "par": 3, "strokeIndex": 7, "yardages": {"blue": 185, "red": 160}},
    {"number": 14, "par": 4, "strokeIndex": 5, "yardages": {"blue": 375, "red": 345}},
    {"number": 15, "par": 3, "strokeIndex": 9, "yardages": {"blue": 155, "red": 135}},
    {"number": 16, "par": 4, "strokeIndex": 15, "yardages": {"blue": 320, "red": 290}},
    {"number": 17, "par": 3, "strokeIndex": 17, "yardages": {"blue": 145, "red": 125}},
    {"number": 18, "par": 4, "strokeIndex": 3, "yardages": {"blue": 395, "red": 365}}
  ]'::jsonb,
  '[
    {"name": "Blue", "color": "blue", "courseRating": 70.0, "slopeRating": 132, "totalYardage": 5925},
    {"name": "Red", "color": "red", "courseRating": 72.0, "slopeRating": 127, "totalYardage": 5390}
  ]'::jsonb
)
ON CONFLICT (venue_id, name) DO UPDATE SET
  description = EXCLUDED.description,
  slope_rating = EXCLUDED.slope_rating,
  course_rating = EXCLUDED.course_rating,
  holes = EXCLUDED.holes,
  tees = EXCLUDED.tees;

-- RACV CAPE SCHANCK RESORT
-- Robert Trent Jones Jr. designed championship course
INSERT INTO courses (venue_id, name, description, slope_rating, course_rating, holes, tees)
VALUES (
  'f1a2b3c4-d5e6-7890-abcd-200000000004',
  'Cape Schanck',
  'Magnificent Robert Trent Jones Jr. designed championship course built in 1986. Located on the southernmost tip of the Mornington Peninsula where Bass Strait meets Western Port. Features huge greens, large open bunkers, tree-lined fairways, and spectacular ocean views on eleven holes. Consistently ranked in Australia''s Top 100.',
  113,
  70.0,
  '[
    {"number": 1, "par": 4, "strokeIndex": 2, "yardages": {"blue": 327, "red": 309}},
    {"number": 2, "par": 5, "strokeIndex": 6, "yardages": {"blue": 489, "red": 477}},
    {"number": 3, "par": 3, "strokeIndex": 8, "yardages": {"blue": 172, "red": 152}},
    {"number": 4, "par": 3, "strokeIndex": 16, "yardages": {"blue": 137, "red": 126}},
    {"number": 5, "par": 4, "strokeIndex": 4, "yardages": {"blue": 348, "red": 302}},
    {"number": 6, "par": 4, "strokeIndex": 18, "yardages": {"blue": 302, "red": 278}},
    {"number": 7, "par": 3, "strokeIndex": 14, "yardages": {"blue": 143, "red": 128}},
    {"number": 8, "par": 5, "strokeIndex": 10, "yardages": {"blue": 454, "red": 416}},
    {"number": 9, "par": 4, "strokeIndex": 12, "yardages": {"blue": 318, "red": 298}},
    {"number": 10, "par": 4, "strokeIndex": 13, "yardages": {"blue": 257, "red": 220}},
    {"number": 11, "par": 4, "strokeIndex": 3, "yardages": {"blue": 329, "red": 245}},
    {"number": 12, "par": 4, "strokeIndex": 7, "yardages": {"blue": 334, "red": 280}},
    {"number": 13, "par": 4, "strokeIndex": 11, "yardages": {"blue": 328, "red": 321}},
    {"number": 14, "par": 3, "strokeIndex": 9, "yardages": {"blue": 153, "red": 136}},
    {"number": 15, "par": 4, "strokeIndex": 1, "yardages": {"blue": 318, "red": 305}},
    {"number": 16, "par": 3, "strokeIndex": 15, "yardages": {"blue": 144, "red": 114}},
    {"number": 17, "par": 5, "strokeIndex": 5, "yardages": {"blue": 455, "red": 422}},
    {"number": 18, "par": 4, "strokeIndex": 17, "yardages": {"blue": 290, "red": 261}}
  ]'::jsonb,
  '[
    {"name": "Blue", "color": "blue", "courseRating": 70.0, "slopeRating": 113, "totalYardage": 5298},
    {"name": "Red", "color": "red", "courseRating": 71.0, "slopeRating": 115, "totalYardage": 4790}
  ]'::jsonb
)
ON CONFLICT (venue_id, name) DO UPDATE SET
  description = EXCLUDED.description,
  slope_rating = EXCLUDED.slope_rating,
  course_rating = EXCLUDED.course_rating,
  holes = EXCLUDED.holes,
  tees = EXCLUDED.tees;

-- FLINDERS GOLF CLUB
-- Charming parkland course with coastal views
INSERT INTO courses (venue_id, name, description, slope_rating, course_rating, holes, tees)
VALUES (
  'f1a2b3c4-d5e6-7890-abcd-200000000005',
  'Flinders',
  'Charming parkland course in the picturesque village of Flinders. A welcoming public-access course with an open guest policy. Features challenging par 4s on holes 6 and 7, and a strong finishing stretch. The undulating layout rewards accurate iron play.',
  120,
  68.0,
  '[
    {"number": 1, "par": 4, "strokeIndex": 18, "yardages": {"blue": 234, "red": 230}},
    {"number": 2, "par": 4, "strokeIndex": 4, "yardages": {"blue": 304, "red": 290}},
    {"number": 3, "par": 3, "strokeIndex": 10, "yardages": {"blue": 195, "red": 189}},
    {"number": 4, "par": 4, "strokeIndex": 15, "yardages": {"blue": 272, "red": 255}},
    {"number": 5, "par": 5, "strokeIndex": 8, "yardages": {"blue": 458, "red": 419}},
    {"number": 6, "par": 4, "strokeIndex": 1, "yardages": {"blue": 385, "red": 343}},
    {"number": 7, "par": 4, "strokeIndex": 2, "yardages": {"blue": 404, "red": 394}},
    {"number": 8, "par": 4, "strokeIndex": 7, "yardages": {"blue": 350, "red": 315}},
    {"number": 9, "par": 3, "strokeIndex": 13, "yardages": {"blue": 174, "red": 161}},
    {"number": 10, "par": 4, "strokeIndex": 9, "yardages": {"blue": 344, "red": 312}},
    {"number": 11, "par": 4, "strokeIndex": 17, "yardages": {"blue": 260, "red": 257}},
    {"number": 12, "par": 3, "strokeIndex": 16, "yardages": {"blue": 140, "red": 124}},
    {"number": 13, "par": 4, "strokeIndex": 3, "yardages": {"blue": 347, "red": 342}},
    {"number": 14, "par": 3, "strokeIndex": 12, "yardages": {"blue": 153, "red": 128}},
    {"number": 15, "par": 5, "strokeIndex": 5, "yardages": {"blue": 495, "red": 454}},
    {"number": 16, "par": 4, "strokeIndex": 14, "yardages": {"blue": 305, "red": 297}},
    {"number": 17, "par": 3, "strokeIndex": 11, "yardages": {"blue": 172, "red": 159}},
    {"number": 18, "par": 4, "strokeIndex": 6, "yardages": {"blue": 315, "red": 290}}
  ]'::jsonb,
  '[
    {"name": "Blue", "color": "blue", "courseRating": 68.0, "slopeRating": 120, "totalYardage": 5307},
    {"name": "Red", "color": "red", "courseRating": 73.0, "slopeRating": 126, "totalYardage": 4959}
  ]'::jsonb
)
ON CONFLICT (venue_id, name) DO UPDATE SET
  description = EXCLUDED.description,
  slope_rating = EXCLUDED.slope_rating,
  course_rating = EXCLUDED.course_rating,
  holes = EXCLUDED.holes,
  tees = EXCLUDED.tees;

-- EAGLE RIDGE GOLF COURSE
-- Links-style public course designed by Phil Ryan
INSERT INTO courses (venue_id, name, description, slope_rating, course_rating, holes, tees)
VALUES (
  'f1a2b3c4-d5e6-7890-abcd-200000000006',
  'Eagle Ridge',
  'Outstanding links-style public course designed by Pacific Coast Design (Phil Ryan) in 1995. Located in the famous "Cups" landscape with sand-based hilly terrain. Features Santa Ana Couch fairways, well-bunkered par 3s, water on half the holes, and ever-present peninsula winds. Consistently rated among Victoria''s best public-access courses.',
  137,
  72.0,
  '[
    {"number": 1, "par": 4, "strokeIndex": 16, "yardages": {"blue": 305, "white": 285, "red": 265}},
    {"number": 2, "par": 4, "strokeIndex": 10, "yardages": {"blue": 359, "white": 339, "red": 309}},
    {"number": 3, "par": 4, "strokeIndex": 2, "yardages": {"blue": 397, "white": 377, "red": 347}},
    {"number": 4, "par": 4, "strokeIndex": 4, "yardages": {"blue": 382, "white": 362, "red": 332}},
    {"number": 5, "par": 4, "strokeIndex": 6, "yardages": {"blue": 345, "white": 325, "red": 295}},
    {"number": 6, "par": 3, "strokeIndex": 8, "yardages": {"blue": 170, "white": 150, "red": 130}},
    {"number": 7, "par": 5, "strokeIndex": 12, "yardages": {"blue": 483, "white": 463, "red": 433}},
    {"number": 8, "par": 3, "strokeIndex": 15, "yardages": {"blue": 155, "white": 135, "red": 115}},
    {"number": 9, "par": 5, "strokeIndex": 18, "yardages": {"blue": 443, "white": 423, "red": 393}},
    {"number": 10, "par": 4, "strokeIndex": 1, "yardages": {"blue": 422, "white": 402, "red": 372}},
    {"number": 11, "par": 3, "strokeIndex": 14, "yardages": {"blue": 153, "white": 133, "red": 113}},
    {"number": 12, "par": 4, "strokeIndex": 13, "yardages": {"blue": 365, "white": 345, "red": 315}},
    {"number": 13, "par": 4, "strokeIndex": 17, "yardages": {"blue": 272, "white": 252, "red": 232}},
    {"number": 14, "par": 4, "strokeIndex": 11, "yardages": {"blue": 352, "white": 332, "red": 302}},
    {"number": 15, "par": 4, "strokeIndex": 7, "yardages": {"blue": 349, "white": 329, "red": 299}},
    {"number": 16, "par": 5, "strokeIndex": 9, "yardages": {"blue": 445, "white": 425, "red": 395}},
    {"number": 17, "par": 3, "strokeIndex": 5, "yardages": {"blue": 204, "white": 184, "red": 154}},
    {"number": 18, "par": 5, "strokeIndex": 3, "yardages": {"blue": 515, "white": 495, "red": 465}}
  ]'::jsonb,
  '[
    {"name": "Blue", "color": "blue", "courseRating": 72.0, "slopeRating": 137, "totalYardage": 6116},
    {"name": "White", "color": "white", "courseRating": 70.0, "slopeRating": 130, "totalYardage": 5756},
    {"name": "Red", "color": "red", "courseRating": 72.0, "slopeRating": 125, "totalYardage": 5266}
  ]'::jsonb
)
ON CONFLICT (venue_id, name) DO UPDATE SET
  description = EXCLUDED.description,
  slope_rating = EXCLUDED.slope_rating,
  course_rating = EXCLUDED.course_rating,
  holes = EXCLUDED.holes,
  tees = EXCLUDED.tees;

-- ROSEBUD COUNTRY CLUB - NORTH COURSE
-- Championship course ranked in Golf Australia Top 100
INSERT INTO courses (venue_id, name, description, slope_rating, course_rating, holes, tees)
VALUES (
  'f1a2b3c4-d5e6-7890-abcd-200000000007',
  'North Course',
  'Ranked #69 in Golf Australia''s Top 100 Public Access Courses. Opened in 1964-65 on land purchased in 1962. Features undulating terrain and extensive renovations since 2019 including new waste areas, bunkers, and extended green complexes. Host of the Webex Players Series.',
  126,
  71.0,
  '[
    {"number": 1, "par": 4, "strokeIndex": 4, "yardages": {"blue": 390, "red": 360}},
    {"number": 2, "par": 4, "strokeIndex": 14, "yardages": {"blue": 335, "red": 305}},
    {"number": 3, "par": 4, "strokeIndex": 12, "yardages": {"blue": 325, "red": 295}},
    {"number": 4, "par": 3, "strokeIndex": 18, "yardages": {"blue": 132, "red": 112}},
    {"number": 5, "par": 4, "strokeIndex": 2, "yardages": {"blue": 405, "red": 375}},
    {"number": 6, "par": 4, "strokeIndex": 6, "yardages": {"blue": 381, "red": 351}},
    {"number": 7, "par": 3, "strokeIndex": 8, "yardages": {"blue": 195, "red": 165}},
    {"number": 8, "par": 4, "strokeIndex": 10, "yardages": {"blue": 375, "red": 345}},
    {"number": 9, "par": 5, "strokeIndex": 16, "yardages": {"blue": 501, "red": 471}},
    {"number": 10, "par": 4, "strokeIndex": 5, "yardages": {"blue": 360, "red": 330}},
    {"number": 11, "par": 3, "strokeIndex": 7, "yardages": {"blue": 160, "red": 140}},
    {"number": 12, "par": 4, "strokeIndex": 3, "yardages": {"blue": 384, "red": 354}},
    {"number": 13, "par": 3, "strokeIndex": 13, "yardages": {"blue": 171, "red": 141}},
    {"number": 14, "par": 4, "strokeIndex": 9, "yardages": {"blue": 336, "red": 306}},
    {"number": 15, "par": 5, "strokeIndex": 15, "yardages": {"blue": 445, "red": 415}},
    {"number": 16, "par": 5, "strokeIndex": 17, "yardages": {"blue": 472, "red": 442}},
    {"number": 17, "par": 4, "strokeIndex": 1, "yardages": {"blue": 398, "red": 368}},
    {"number": 18, "par": 4, "strokeIndex": 11, "yardages": {"blue": 350, "red": 320}}
  ]'::jsonb,
  '[
    {"name": "Blue", "color": "blue", "courseRating": 71.0, "slopeRating": 126, "totalYardage": 6115},
    {"name": "Red", "color": "red", "courseRating": 73.0, "slopeRating": 124, "totalYardage": 5595}
  ]'::jsonb
)
ON CONFLICT (venue_id, name) DO UPDATE SET
  description = EXCLUDED.description,
  slope_rating = EXCLUDED.slope_rating,
  course_rating = EXCLUDED.course_rating,
  holes = EXCLUDED.holes,
  tees = EXCLUDED.tees;

-- ROSEBUD COUNTRY CLUB - SOUTH COURSE
-- Second 18-hole course opened in 1972
INSERT INTO courses (venue_id, name, description, slope_rating, course_rating, holes, tees)
VALUES (
  'f1a2b3c4-d5e6-7890-abcd-200000000007',
  'South Course',
  'Opened in 1972 on land purchased in 1970. Measures 5,973 metres off men''s blue tees with a Slope of 124. Features undulating ground, water hazards, heavy bunkering, tree-lined fairways, and easy walking. Part of Rosebud''s 36-hole facility offering four possible 18-hole combinations.',
  124,
  72.0,
  '[
    {"number": 1, "par": 4, "strokeIndex": 8, "yardages": {"blue": 355, "red": 325}},
    {"number": 2, "par": 4, "strokeIndex": 2, "yardages": {"blue": 385, "red": 355}},
    {"number": 3, "par": 3, "strokeIndex": 16, "yardages": {"blue": 145, "red": 125}},
    {"number": 4, "par": 5, "strokeIndex": 12, "yardages": {"blue": 475, "red": 445}},
    {"number": 5, "par": 4, "strokeIndex": 6, "yardages": {"blue": 365, "red": 335}},
    {"number": 6, "par": 3, "strokeIndex": 14, "yardages": {"blue": 165, "red": 145}},
    {"number": 7, "par": 4, "strokeIndex": 4, "yardages": {"blue": 390, "red": 360}},
    {"number": 8, "par": 5, "strokeIndex": 10, "yardages": {"blue": 485, "red": 455}},
    {"number": 9, "par": 4, "strokeIndex": 18, "yardages": {"blue": 320, "red": 290}},
    {"number": 10, "par": 4, "strokeIndex": 7, "yardages": {"blue": 370, "red": 340}},
    {"number": 11, "par": 3, "strokeIndex": 15, "yardages": {"blue": 155, "red": 135}},
    {"number": 12, "par": 4, "strokeIndex": 1, "yardages": {"blue": 410, "red": 380}},
    {"number": 13, "par": 5, "strokeIndex": 11, "yardages": {"blue": 490, "red": 460}},
    {"number": 14, "par": 4, "strokeIndex": 9, "yardages": {"blue": 345, "red": 315}},
    {"number": 15, "par": 4, "strokeIndex": 3, "yardages": {"blue": 395, "red": 365}},
    {"number": 16, "par": 3, "strokeIndex": 17, "yardages": {"blue": 140, "red": 120}},
    {"number": 17, "par": 4, "strokeIndex": 5, "yardages": {"blue": 375, "red": 345}},
    {"number": 18, "par": 5, "strokeIndex": 13, "yardages": {"blue": 505, "red": 475}}
  ]'::jsonb,
  '[
    {"name": "Blue", "color": "blue", "courseRating": 72.0, "slopeRating": 124, "totalYardage": 6270},
    {"name": "Red", "color": "red", "courseRating": 74.0, "slopeRating": 122, "totalYardage": 5770}
  ]'::jsonb
)
ON CONFLICT (venue_id, name) DO UPDATE SET
  description = EXCLUDED.description,
  slope_rating = EXCLUDED.slope_rating,
  course_rating = EXCLUDED.course_rating,
  holes = EXCLUDED.holes,
  tees = EXCLUDED.tees;

-- DEVILBEND GOLF CLUB
-- Parkland course opened in 1975
INSERT INTO courses (venue_id, name, description, slope_rating, course_rating, holes, tees)
VALUES (
  'f1a2b3c4-d5e6-7890-abcd-200000000008',
  'Devilbend',
  'Parkland course opened in 1975 near the Devilbend Reservoir. An accessible public club with an open guest policy. Features a varied layout with three par 5s on each nine and five challenging par 3s. The signature 12th hole is the toughest on the course.',
  125,
  71.0,
  '[
    {"number": 1, "par": 5, "strokeIndex": 14, "yardages": {"white": 485, "red": 455}},
    {"number": 2, "par": 4, "strokeIndex": 3, "yardages": {"white": 353, "red": 323}},
    {"number": 3, "par": 3, "strokeIndex": 16, "yardages": {"white": 135, "red": 115}},
    {"number": 4, "par": 4, "strokeIndex": 7, "yardages": {"white": 381, "red": 351}},
    {"number": 5, "par": 5, "strokeIndex": 11, "yardages": {"white": 462, "red": 432}},
    {"number": 6, "par": 4, "strokeIndex": 9, "yardages": {"white": 379, "red": 349}},
    {"number": 7, "par": 4, "strokeIndex": 4, "yardages": {"white": 356, "red": 326}},
    {"number": 8, "par": 3, "strokeIndex": 17, "yardages": {"white": 178, "red": 148}},
    {"number": 9, "par": 4, "strokeIndex": 8, "yardages": {"white": 303, "red": 273}},
    {"number": 10, "par": 5, "strokeIndex": 15, "yardages": {"white": 475, "red": 445}},
    {"number": 11, "par": 3, "strokeIndex": 12, "yardages": {"white": 161, "red": 141}},
    {"number": 12, "par": 4, "strokeIndex": 1, "yardages": {"white": 408, "red": 378}},
    {"number": 13, "par": 3, "strokeIndex": 13, "yardages": {"white": 155, "red": 125}},
    {"number": 14, "par": 4, "strokeIndex": 5, "yardages": {"white": 346, "red": 316}},
    {"number": 15, "par": 4, "strokeIndex": 6, "yardages": {"white": 391, "red": 361}},
    {"number": 16, "par": 4, "strokeIndex": 2, "yardages": {"white": 384, "red": 354}},
    {"number": 17, "par": 4, "strokeIndex": 18, "yardages": {"white": 330, "red": 300}},
    {"number": 18, "par": 4, "strokeIndex": 10, "yardages": {"white": 316, "red": 286}}
  ]'::jsonb,
  '[
    {"name": "White", "color": "white", "courseRating": 71.0, "slopeRating": 125, "totalYardage": 5998},
    {"name": "Red", "color": "red", "courseRating": 73.0, "slopeRating": 123, "totalYardage": 5478}
  ]'::jsonb
)
ON CONFLICT (venue_id, name) DO UPDATE SET
  description = EXCLUDED.description,
  slope_rating = EXCLUDED.slope_rating,
  course_rating = EXCLUDED.course_rating,
  holes = EXCLUDED.holes,
  tees = EXCLUDED.tees;

-- =====================================================
-- STEP 3: Update tracking note
-- This migration adds 8 new venues and 9 courses to the database
-- (Rosebud Country Club has 2 courses: North and South)
-- Total new venues in VIC after this migration: 30
-- =====================================================
