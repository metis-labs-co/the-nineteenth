-- =====================================================
-- Migration: victoria_batch_03_melbourne_east
-- Description: Add Melbourne East and North East golf venues and courses
--              Part of Victorian golf course data collection
-- Date: 2025-12-10
-- Batch: 3 of 7 (Melbourne East & North East)
-- =====================================================

-- =====================================================
-- STEP 1: INSERT NEW VENUES
-- Using ON CONFLICT to handle re-runs safely
-- =====================================================

-- Box Hill Golf Club
INSERT INTO venues (id, source, name, state, city, address, phone, website, total_holes)
VALUES (
  'f1a2b3c4-d5e6-7890-abcd-300000000001',
  'manual',
  'Box Hill Golf Club',
  'VIC',
  'Box Hill',
  '202 Middleborough Road, Box Hill VIC 3128',
  '+61 3 9890 2653',
  'https://www.boxhillgolf.com.au',
  18
)
ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name,
  address = EXCLUDED.address,
  phone = EXCLUDED.phone,
  website = EXCLUDED.website;

-- Camberwell Golf Club (plays at Freeway Golf Course)
INSERT INTO venues (id, source, name, state, city, address, phone, website, total_holes)
VALUES (
  'f1a2b3c4-d5e6-7890-abcd-300000000002',
  'manual',
  'Freeway Golf Course',
  'VIC',
  'Balwyn North',
  'Columba Street, Balwyn North VIC 3104',
  '+61 3 9857 8598',
  'https://www.freewaygolf.com.au',
  18
)
ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name,
  address = EXCLUDED.address,
  phone = EXCLUDED.phone,
  website = EXCLUDED.website;

-- Chirnside Park Country Club
INSERT INTO venues (id, source, name, state, city, address, phone, website, total_holes)
VALUES (
  'f1a2b3c4-d5e6-7890-abcd-300000000003',
  'manual',
  'Chirnside Park Country Club',
  'VIC',
  'Chirnside Park',
  '68 Kingswood Drive, Chirnside Park VIC 3116',
  '+61 3 9727 2222',
  'https://www.chirnsideparkcc.com.au',
  18
)
ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name,
  address = EXCLUDED.address,
  phone = EXCLUDED.phone,
  website = EXCLUDED.website;

-- Gardiners Run Golf & Country Club
INSERT INTO venues (id, source, name, state, city, address, phone, website, total_holes)
VALUES (
  'f1a2b3c4-d5e6-7890-abcd-300000000004',
  'manual',
  'Gardiners Run Golf & Country Club',
  'VIC',
  'Lilydale',
  '132 Victoria Road, Lilydale VIC 3140',
  '+61 3 9739 7522',
  'https://www.gardinersrun.com.au',
  18
)
ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name,
  address = EXCLUDED.address,
  phone = EXCLUDED.phone,
  website = EXCLUDED.website;

-- Green Acres Golf Club
INSERT INTO venues (id, source, name, state, city, address, phone, website, total_holes)
VALUES (
  'f1a2b3c4-d5e6-7890-abcd-300000000005',
  'manual',
  'Green Acres Golf Club',
  'VIC',
  'Kew East',
  '51 Elm Grove, Kew East VIC 3102',
  '+61 3 9859 5522',
  'https://www.greenacresgolf.com.au',
  18
)
ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name,
  address = EXCLUDED.address,
  phone = EXCLUDED.phone,
  website = EXCLUDED.website;

-- Heritage Golf and Country Club
INSERT INTO venues (id, source, name, state, city, address, phone, website, total_holes)
VALUES (
  'f1a2b3c4-d5e6-7890-abcd-300000000006',
  'manual',
  'Heritage Golf and Country Club',
  'VIC',
  'Chirnside Park',
  '65-91 Heritage Boulevard, Chirnside Park VIC 3116',
  '+61 3 9760 7777',
  'https://www.heritagegolf.com.au',
  36
)
ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name,
  address = EXCLUDED.address,
  phone = EXCLUDED.phone,
  website = EXCLUDED.website,
  total_holes = EXCLUDED.total_holes;

-- Kew Golf Club
INSERT INTO venues (id, source, name, state, city, address, phone, website, total_holes)
VALUES (
  'f1a2b3c4-d5e6-7890-abcd-300000000007',
  'manual',
  'Kew Golf Club',
  'VIC',
  'Kew East',
  '120 Belford Road, Kew East VIC 3102',
  '+61 3 9859 6722',
  'https://www.kewgolfclub.com.au',
  18
)
ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name,
  address = EXCLUDED.address,
  phone = EXCLUDED.phone,
  website = EXCLUDED.website;

-- Yering Meadows Golf Club (formerly Croydon Golf Club)
INSERT INTO venues (id, source, name, state, city, address, phone, website, total_holes)
VALUES (
  'f1a2b3c4-d5e6-7890-abcd-300000000008',
  'manual',
  'Yering Meadows Golf Club',
  'VIC',
  'Yering',
  '75 Victoria Road, Yering VIC 3770',
  '+61 3 9739 0844',
  'https://www.yeringmeadows.com.au',
  27
)
ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name,
  address = EXCLUDED.address,
  phone = EXCLUDED.phone,
  website = EXCLUDED.website,
  total_holes = EXCLUDED.total_holes;

-- Heidelberg Golf Club
INSERT INTO venues (id, source, name, state, city, address, phone, website, total_holes)
VALUES (
  'f1a2b3c4-d5e6-7890-abcd-300000000009',
  'manual',
  'Heidelberg Golf Club',
  'VIC',
  'Lower Plenty',
  '31 Greensborough Road, Lower Plenty VIC 3093',
  '+61 3 9432 1127',
  'https://www.heidelberggolf.com.au',
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

-- BOX HILL GOLF CLUB
INSERT INTO courses (venue_id, name, description, slope_rating, course_rating, holes, tees)
VALUES (
  'f1a2b3c4-d5e6-7890-abcd-300000000001',
  'Box Hill',
  'Established private club in Melbourne''s eastern suburbs. Features a compact but challenging layout with four par 3s and four par 5s. The demanding 2nd hole is stroke index 1, while the short 9th offers birdie opportunities.',
  113,
  70.0,
  '[
    {"number": 1, "par": 4, "strokeIndex": 18, "yardages": {"white": 255}},
    {"number": 2, "par": 4, "strokeIndex": 1, "yardages": {"white": 423}},
    {"number": 3, "par": 4, "strokeIndex": 13, "yardages": {"white": 329}},
    {"number": 4, "par": 3, "strokeIndex": 2, "yardages": {"white": 190}},
    {"number": 5, "par": 5, "strokeIndex": 16, "yardages": {"white": 452}},
    {"number": 6, "par": 3, "strokeIndex": 11, "yardages": {"white": 152}},
    {"number": 7, "par": 5, "strokeIndex": 5, "yardages": {"white": 480}},
    {"number": 8, "par": 4, "strokeIndex": 17, "yardages": {"white": 283}},
    {"number": 9, "par": 3, "strokeIndex": 15, "yardages": {"white": 155}},
    {"number": 10, "par": 4, "strokeIndex": 14, "yardages": {"white": 317}},
    {"number": 11, "par": 3, "strokeIndex": 4, "yardages": {"white": 168}},
    {"number": 12, "par": 4, "strokeIndex": 3, "yardages": {"white": 363}},
    {"number": 13, "par": 5, "strokeIndex": 12, "yardages": {"white": 441}},
    {"number": 14, "par": 4, "strokeIndex": 6, "yardages": {"white": 316}},
    {"number": 15, "par": 4, "strokeIndex": 7, "yardages": {"white": 336}},
    {"number": 16, "par": 4, "strokeIndex": 10, "yardages": {"white": 330}},
    {"number": 17, "par": 3, "strokeIndex": 9, "yardages": {"white": 133}},
    {"number": 18, "par": 5, "strokeIndex": 8, "yardages": {"white": 446}}
  ]'::jsonb,
  '[
    {"name": "White", "color": "white", "courseRating": 70.0, "slopeRating": 113, "totalYardage": 5569}
  ]'::jsonb
)
ON CONFLICT (venue_id, name) DO UPDATE SET
  description = EXCLUDED.description,
  slope_rating = EXCLUDED.slope_rating,
  course_rating = EXCLUDED.course_rating,
  holes = EXCLUDED.holes,
  tees = EXCLUDED.tees;

-- FREEWAY GOLF COURSE (Camberwell Golf Club home course)
INSERT INTO courses (venue_id, name, description, slope_rating, course_rating, holes, tees)
VALUES (
  'f1a2b3c4-d5e6-7890-abcd-300000000002',
  'Freeway',
  'Public course on the banks of the Yarra River, home to Camberwell Golf Club since 1979. Features natural water hazards, strategic bunker placements, and a challenging layout despite shorter yardage. Par 67 layout tests accuracy over power.',
  111,
  67.0,
  '[
    {"number": 1, "par": 4, "strokeIndex": 8, "yardages": {"white": 320}},
    {"number": 2, "par": 3, "strokeIndex": 16, "yardages": {"white": 145}},
    {"number": 3, "par": 4, "strokeIndex": 4, "yardages": {"white": 345}},
    {"number": 4, "par": 4, "strokeIndex": 2, "yardages": {"white": 365}},
    {"number": 5, "par": 3, "strokeIndex": 14, "yardages": {"white": 135}},
    {"number": 6, "par": 4, "strokeIndex": 10, "yardages": {"white": 295}},
    {"number": 7, "par": 3, "strokeIndex": 18, "yardages": {"white": 125}},
    {"number": 8, "par": 4, "strokeIndex": 6, "yardages": {"white": 340}},
    {"number": 9, "par": 4, "strokeIndex": 12, "yardages": {"white": 285}},
    {"number": 10, "par": 4, "strokeIndex": 7, "yardages": {"white": 310}},
    {"number": 11, "par": 3, "strokeIndex": 15, "yardages": {"white": 155}},
    {"number": 12, "par": 4, "strokeIndex": 3, "yardages": {"white": 355}},
    {"number": 13, "par": 4, "strokeIndex": 1, "yardages": {"white": 375}},
    {"number": 14, "par": 3, "strokeIndex": 17, "yardages": {"white": 130}},
    {"number": 15, "par": 4, "strokeIndex": 5, "yardages": {"white": 350}},
    {"number": 16, "par": 4, "strokeIndex": 11, "yardages": {"white": 290}},
    {"number": 17, "par": 3, "strokeIndex": 13, "yardages": {"white": 165}},
    {"number": 18, "par": 4, "strokeIndex": 9, "yardages": {"white": 314}}
  ]'::jsonb,
  '[
    {"name": "White", "color": "white", "courseRating": 67.0, "slopeRating": 111, "totalYardage": 4799}
  ]'::jsonb
)
ON CONFLICT (venue_id, name) DO UPDATE SET
  description = EXCLUDED.description,
  slope_rating = EXCLUDED.slope_rating,
  course_rating = EXCLUDED.course_rating,
  holes = EXCLUDED.holes,
  tees = EXCLUDED.tees;

-- CHIRNSIDE PARK COUNTRY CLUB
INSERT INTO courses (venue_id, name, description, slope_rating, course_rating, holes, tees)
VALUES (
  'f1a2b3c4-d5e6-7890-abcd-300000000003',
  'Chirnside Park',
  'Private country club in the Yarra Valley foothills. Par 70 layout featuring five par 3s including three on the front nine. The challenging 16th at 450 yards is stroke index 1. Beautiful natural setting with valley views.',
  120,
  70.0,
  '[
    {"number": 1, "par": 4, "strokeIndex": 15, "yardages": {"white": 349}},
    {"number": 2, "par": 4, "strokeIndex": 3, "yardages": {"white": 360}},
    {"number": 3, "par": 3, "strokeIndex": 18, "yardages": {"white": 125}},
    {"number": 4, "par": 4, "strokeIndex": 6, "yardages": {"white": 349}},
    {"number": 5, "par": 5, "strokeIndex": 2, "yardages": {"white": 410}},
    {"number": 6, "par": 4, "strokeIndex": 11, "yardages": {"white": 372}},
    {"number": 7, "par": 5, "strokeIndex": 16, "yardages": {"white": 472}},
    {"number": 8, "par": 3, "strokeIndex": 9, "yardages": {"white": 142}},
    {"number": 9, "par": 3, "strokeIndex": 7, "yardages": {"white": 137}},
    {"number": 10, "par": 4, "strokeIndex": 14, "yardages": {"white": 382}},
    {"number": 11, "par": 4, "strokeIndex": 4, "yardages": {"white": 355}},
    {"number": 12, "par": 3, "strokeIndex": 13, "yardages": {"white": 180}},
    {"number": 13, "par": 4, "strokeIndex": 5, "yardages": {"white": 384}},
    {"number": 14, "par": 5, "strokeIndex": 10, "yardages": {"white": 512}},
    {"number": 15, "par": 4, "strokeIndex": 12, "yardages": {"white": 372}},
    {"number": 16, "par": 4, "strokeIndex": 1, "yardages": {"white": 450}},
    {"number": 17, "par": 3, "strokeIndex": 8, "yardages": {"white": 154}},
    {"number": 18, "par": 4, "strokeIndex": 17, "yardages": {"white": 256}}
  ]'::jsonb,
  '[
    {"name": "White", "color": "white", "courseRating": 70.0, "slopeRating": 120, "totalYardage": 5761}
  ]'::jsonb
)
ON CONFLICT (venue_id, name) DO UPDATE SET
  description = EXCLUDED.description,
  slope_rating = EXCLUDED.slope_rating,
  course_rating = EXCLUDED.course_rating,
  holes = EXCLUDED.holes,
  tees = EXCLUDED.tees;

-- GARDINERS RUN GOLF & COUNTRY CLUB
INSERT INTO courses (venue_id, name, description, slope_rating, course_rating, holes, tees)
VALUES (
  'f1a2b3c4-d5e6-7890-abcd-300000000004',
  'Gardiners Run',
  'Modern resort-style course designed by Phil Ryan of Pacific Coast Design (2014). Built in an old quarry with mounding and plantings separating holes. Features water hazards including a peninsula green on the finishing 18th hole. The 1st hole is rated stroke index 4 with an hourglass-shaped green.',
  125,
  72.0,
  '[
    {"number": 1, "par": 4, "strokeIndex": 4, "yardages": {"blue": 365, "red": 341}},
    {"number": 2, "par": 5, "strokeIndex": 9, "yardages": {"blue": 508, "red": 472}},
    {"number": 3, "par": 3, "strokeIndex": 10, "yardages": {"blue": 157, "red": 141}},
    {"number": 4, "par": 4, "strokeIndex": 1, "yardages": {"blue": 379, "red": 325}},
    {"number": 5, "par": 4, "strokeIndex": 18, "yardages": {"blue": 328, "red": 264}},
    {"number": 6, "par": 4, "strokeIndex": 11, "yardages": {"blue": 340, "red": 308}},
    {"number": 7, "par": 3, "strokeIndex": 6, "yardages": {"blue": 175, "red": 149}},
    {"number": 8, "par": 5, "strokeIndex": 15, "yardages": {"blue": 493, "red": 459}},
    {"number": 9, "par": 4, "strokeIndex": 13, "yardages": {"blue": 373, "red": 339}},
    {"number": 10, "par": 5, "strokeIndex": 7, "yardages": {"blue": 534, "red": 458}},
    {"number": 11, "par": 3, "strokeIndex": 8, "yardages": {"blue": 166, "red": 136}},
    {"number": 12, "par": 4, "strokeIndex": 3, "yardages": {"blue": 394, "red": 362}},
    {"number": 13, "par": 4, "strokeIndex": 16, "yardages": {"blue": 355, "red": 325}},
    {"number": 14, "par": 4, "strokeIndex": 5, "yardages": {"blue": 368, "red": 341}},
    {"number": 15, "par": 4, "strokeIndex": 17, "yardages": {"blue": 319, "red": 294}},
    {"number": 16, "par": 3, "strokeIndex": 14, "yardages": {"blue": 148, "red": 131}},
    {"number": 17, "par": 5, "strokeIndex": 12, "yardages": {"blue": 500, "red": 451}},
    {"number": 18, "par": 4, "strokeIndex": 2, "yardages": {"blue": 380, "red": 353}}
  ]'::jsonb,
  '[
    {"name": "Blue", "color": "blue", "courseRating": 72.0, "slopeRating": 125, "totalYardage": 6282},
    {"name": "Red", "color": "red", "courseRating": 73.0, "slopeRating": 122, "totalYardage": 5649}
  ]'::jsonb
)
ON CONFLICT (venue_id, name) DO UPDATE SET
  description = EXCLUDED.description,
  slope_rating = EXCLUDED.slope_rating,
  course_rating = EXCLUDED.course_rating,
  holes = EXCLUDED.holes,
  tees = EXCLUDED.tees;

-- GREEN ACRES GOLF CLUB
INSERT INTO courses (venue_id, name, description, slope_rating, course_rating, holes, tees)
VALUES (
  'f1a2b3c4-d5e6-7890-abcd-300000000005',
  'Green Acres',
  'Premier Yarra River course established in 1948, just 15 minutes from Melbourne CBD. Features tight tree-lined fairways with pure couch grass, challenging doglegs, and natural water hazards. The demanding 6th hole at 420 yards is stroke index 1. Bentgrass greens throughout.',
  128,
  71.0,
  '[
    {"number": 1, "par": 4, "strokeIndex": 10, "yardages": {"white": 318, "red": 305}},
    {"number": 2, "par": 4, "strokeIndex": 4, "yardages": {"white": 364, "red": 344}},
    {"number": 3, "par": 5, "strokeIndex": 16, "yardages": {"white": 460, "red": 388}},
    {"number": 4, "par": 3, "strokeIndex": 7, "yardages": {"white": 185, "red": 161}},
    {"number": 5, "par": 4, "strokeIndex": 12, "yardages": {"white": 350, "red": 266}},
    {"number": 6, "par": 4, "strokeIndex": 1, "yardages": {"white": 420, "red": 396}},
    {"number": 7, "par": 4, "strokeIndex": 8, "yardages": {"white": 306, "red": 299}},
    {"number": 8, "par": 5, "strokeIndex": 14, "yardages": {"white": 460, "red": 430}},
    {"number": 9, "par": 3, "strokeIndex": 18, "yardages": {"white": 112, "red": 100}},
    {"number": 10, "par": 4, "strokeIndex": 5, "yardages": {"white": 350, "red": 300}},
    {"number": 11, "par": 3, "strokeIndex": 9, "yardages": {"white": 153, "red": 136}},
    {"number": 12, "par": 4, "strokeIndex": 11, "yardages": {"white": 332, "red": 302}},
    {"number": 13, "par": 4, "strokeIndex": 3, "yardages": {"white": 378, "red": 353}},
    {"number": 14, "par": 5, "strokeIndex": 15, "yardages": {"white": 480, "red": 446}},
    {"number": 15, "par": 4, "strokeIndex": 2, "yardages": {"white": 407, "red": 349}},
    {"number": 16, "par": 4, "strokeIndex": 13, "yardages": {"white": 349, "red": 326}},
    {"number": 17, "par": 3, "strokeIndex": 6, "yardages": {"white": 180, "red": 130}},
    {"number": 18, "par": 4, "strokeIndex": 17, "yardages": {"white": 330, "red": 309}}
  ]'::jsonb,
  '[
    {"name": "White", "color": "white", "courseRating": 71.0, "slopeRating": 128, "totalYardage": 5934},
    {"name": "Red", "color": "red", "courseRating": 74.0, "slopeRating": 126, "totalYardage": 5340}
  ]'::jsonb
)
ON CONFLICT (venue_id, name) DO UPDATE SET
  description = EXCLUDED.description,
  slope_rating = EXCLUDED.slope_rating,
  course_rating = EXCLUDED.course_rating,
  holes = EXCLUDED.holes,
  tees = EXCLUDED.tees;

-- HERITAGE GOLF AND COUNTRY CLUB - HENLEY COURSE
INSERT INTO courses (venue_id, name, description, slope_rating, course_rating, holes, tees)
VALUES (
  'f1a2b3c4-d5e6-7890-abcd-300000000006',
  'Henley Course',
  'One of two championship courses at Heritage. The Henley features a more traditional parkland layout with mature trees and strategic bunkering. The challenging 9th hole at 371 yards is stroke index 1. Ranked among Australia''s Top 100 courses.',
  113,
  72.0,
  '[
    {"number": 1, "par": 4, "strokeIndex": 15, "yardages": {"blue": 339}},
    {"number": 2, "par": 5, "strokeIndex": 11, "yardages": {"blue": 445}},
    {"number": 3, "par": 4, "strokeIndex": 13, "yardages": {"blue": 273}},
    {"number": 4, "par": 3, "strokeIndex": 7, "yardages": {"blue": 170}},
    {"number": 5, "par": 4, "strokeIndex": 5, "yardages": {"blue": 357}},
    {"number": 6, "par": 5, "strokeIndex": 9, "yardages": {"blue": 483}},
    {"number": 7, "par": 4, "strokeIndex": 3, "yardages": {"blue": 347}},
    {"number": 8, "par": 3, "strokeIndex": 17, "yardages": {"blue": 118}},
    {"number": 9, "par": 4, "strokeIndex": 1, "yardages": {"blue": 371}},
    {"number": 10, "par": 4, "strokeIndex": 10, "yardages": {"blue": 346}},
    {"number": 11, "par": 4, "strokeIndex": 16, "yardages": {"blue": 290}},
    {"number": 12, "par": 3, "strokeIndex": 12, "yardages": {"blue": 143}},
    {"number": 13, "par": 5, "strokeIndex": 14, "yardages": {"blue": 470}},
    {"number": 14, "par": 4, "strokeIndex": 6, "yardages": {"blue": 348}},
    {"number": 15, "par": 3, "strokeIndex": 18, "yardages": {"blue": 123}},
    {"number": 16, "par": 4, "strokeIndex": 8, "yardages": {"blue": 447}},
    {"number": 17, "par": 5, "strokeIndex": 4, "yardages": {"blue": 503}},
    {"number": 18, "par": 4, "strokeIndex": 2, "yardages": {"blue": 393}}
  ]'::jsonb,
  '[
    {"name": "Blue", "color": "blue", "courseRating": 72.0, "slopeRating": 113, "totalYardage": 5966}
  ]'::jsonb
)
ON CONFLICT (venue_id, name) DO UPDATE SET
  description = EXCLUDED.description,
  slope_rating = EXCLUDED.slope_rating,
  course_rating = EXCLUDED.course_rating,
  holes = EXCLUDED.holes,
  tees = EXCLUDED.tees;

-- HERITAGE GOLF AND COUNTRY CLUB - ST JOHN COURSE
INSERT INTO courses (venue_id, name, description, slope_rating, course_rating, holes, tees)
VALUES (
  'f1a2b3c4-d5e6-7890-abcd-300000000006',
  'St John Course',
  'The second championship course at Heritage featuring a more modern design with water features and strategic challenges. The 18th at 415 yards is stroke index 1, providing a demanding finish. Ranked among Australia''s Top 100 courses.',
  113,
  72.0,
  '[
    {"number": 1, "par": 4, "strokeIndex": 18, "yardages": {"blue": 304}},
    {"number": 2, "par": 4, "strokeIndex": 2, "yardages": {"blue": 380}},
    {"number": 3, "par": 3, "strokeIndex": 16, "yardages": {"blue": 164}},
    {"number": 4, "par": 5, "strokeIndex": 12, "yardages": {"blue": 482}},
    {"number": 5, "par": 4, "strokeIndex": 3, "yardages": {"blue": 396}},
    {"number": 6, "par": 4, "strokeIndex": 14, "yardages": {"blue": 336}},
    {"number": 7, "par": 3, "strokeIndex": 10, "yardages": {"blue": 146}},
    {"number": 8, "par": 4, "strokeIndex": 5, "yardages": {"blue": 370}},
    {"number": 9, "par": 5, "strokeIndex": 8, "yardages": {"blue": 468}},
    {"number": 10, "par": 4, "strokeIndex": 6, "yardages": {"blue": 325}},
    {"number": 11, "par": 3, "strokeIndex": 7, "yardages": {"blue": 163}},
    {"number": 12, "par": 5, "strokeIndex": 15, "yardages": {"blue": 458}},
    {"number": 13, "par": 4, "strokeIndex": 13, "yardages": {"blue": 324}},
    {"number": 14, "par": 4, "strokeIndex": 9, "yardages": {"blue": 344}},
    {"number": 15, "par": 5, "strokeIndex": 17, "yardages": {"blue": 476}},
    {"number": 16, "par": 4, "strokeIndex": 4, "yardages": {"blue": 357}},
    {"number": 17, "par": 3, "strokeIndex": 11, "yardages": {"blue": 153}},
    {"number": 18, "par": 4, "strokeIndex": 1, "yardages": {"blue": 415}}
  ]'::jsonb,
  '[
    {"name": "Blue", "color": "blue", "courseRating": 72.0, "slopeRating": 113, "totalYardage": 6061}
  ]'::jsonb
)
ON CONFLICT (venue_id, name) DO UPDATE SET
  description = EXCLUDED.description,
  slope_rating = EXCLUDED.slope_rating,
  course_rating = EXCLUDED.course_rating,
  holes = EXCLUDED.holes,
  tees = EXCLUDED.tees;

-- KEW GOLF CLUB
INSERT INTO courses (venue_id, name, description, slope_rating, course_rating, holes, tees)
VALUES (
  'f1a2b3c4-d5e6-7890-abcd-300000000007',
  'Kew',
  'Historic club established in 1894, redesigned by Bob Green (1974) and Graeme Grant (2015). Features Santa Ana fairways and bentgrass greens. The 17th at 449 yards is stroke index 1, with the finishing 18th being a challenging par 3 at 179 yards. Grant rebuilt eight holes including the dramatic 12th, 14th, and 15th.',
  130,
  72.8,
  '[
    {"number": 1, "par": 4, "strokeIndex": 18, "yardages": {"blue": 299, "red": 270}},
    {"number": 2, "par": 4, "strokeIndex": 8, "yardages": {"blue": 396, "red": 365}},
    {"number": 3, "par": 4, "strokeIndex": 4, "yardages": {"blue": 414, "red": 380}},
    {"number": 4, "par": 3, "strokeIndex": 14, "yardages": {"blue": 158, "red": 140}},
    {"number": 5, "par": 5, "strokeIndex": 10, "yardages": {"blue": 556, "red": 490}},
    {"number": 6, "par": 4, "strokeIndex": 2, "yardages": {"blue": 440, "red": 400}},
    {"number": 7, "par": 5, "strokeIndex": 16, "yardages": {"blue": 499, "red": 455}},
    {"number": 8, "par": 4, "strokeIndex": 6, "yardages": {"blue": 409, "red": 375}},
    {"number": 9, "par": 4, "strokeIndex": 12, "yardages": {"blue": 363, "red": 330}},
    {"number": 10, "par": 4, "strokeIndex": 7, "yardages": {"blue": 395, "red": 360}},
    {"number": 11, "par": 3, "strokeIndex": 15, "yardages": {"blue": 167, "red": 145}},
    {"number": 12, "par": 5, "strokeIndex": 5, "yardages": {"blue": 518, "red": 470}},
    {"number": 13, "par": 4, "strokeIndex": 3, "yardages": {"blue": 413, "red": 380}},
    {"number": 14, "par": 3, "strokeIndex": 13, "yardages": {"blue": 188, "red": 160}},
    {"number": 15, "par": 4, "strokeIndex": 11, "yardages": {"blue": 394, "red": 360}},
    {"number": 16, "par": 5, "strokeIndex": 17, "yardages": {"blue": 493, "red": 450}},
    {"number": 17, "par": 4, "strokeIndex": 1, "yardages": {"blue": 449, "red": 410}},
    {"number": 18, "par": 3, "strokeIndex": 9, "yardages": {"blue": 179, "red": 160}}
  ]'::jsonb,
  '[
    {"name": "Blue", "color": "blue", "courseRating": 72.8, "slopeRating": 130, "totalYardage": 6730},
    {"name": "Red", "color": "red", "courseRating": 74.1, "slopeRating": 127, "totalYardage": 6100}
  ]'::jsonb
)
ON CONFLICT (venue_id, name) DO UPDATE SET
  description = EXCLUDED.description,
  slope_rating = EXCLUDED.slope_rating,
  course_rating = EXCLUDED.course_rating,
  holes = EXCLUDED.holes,
  tees = EXCLUDED.tees;

-- YERING MEADOWS GOLF CLUB - VALLEY COURSE
INSERT INTO courses (venue_id, name, description, slope_rating, course_rating, holes, tees)
VALUES (
  'f1a2b3c4-d5e6-7890-abcd-300000000008',
  'Valley Course',
  'Part of the stunning 27-hole Ross Watson designed complex in the Yarra Valley. The Valley Course combines with the Homestead and Nursery nines. Features Bent Grass greens and Legend Couch fairways. Redesigned touches by Michael Clayton in 2024. The 17th at 406 yards is stroke index 1.',
  125,
  72.0,
  '[
    {"number": 1, "par": 4, "strokeIndex": 8, "yardages": {"black": 504, "blue": 492, "red": 432}},
    {"number": 2, "par": 4, "strokeIndex": 4, "yardages": {"black": 391, "blue": 369, "red": 319}},
    {"number": 3, "par": 3, "strokeIndex": 14, "yardages": {"black": 169, "blue": 150, "red": 132}},
    {"number": 4, "par": 4, "strokeIndex": 6, "yardages": {"black": 540, "blue": 511, "red": 451}},
    {"number": 5, "par": 5, "strokeIndex": 11, "yardages": {"black": 333, "blue": 325, "red": 303}},
    {"number": 6, "par": 4, "strokeIndex": 17, "yardages": {"black": 298, "blue": 279, "red": 248}},
    {"number": 7, "par": 3, "strokeIndex": 15, "yardages": {"black": 171, "blue": 158, "red": 134}},
    {"number": 8, "par": 5, "strokeIndex": 9, "yardages": {"black": 403, "blue": 375, "red": 326}},
    {"number": 9, "par": 4, "strokeIndex": 2, "yardages": {"black": 380, "blue": 360, "red": 304}},
    {"number": 10, "par": 5, "strokeIndex": 12, "yardages": {"black": 358, "blue": 343, "red": 311}},
    {"number": 11, "par": 4, "strokeIndex": 13, "yardages": {"black": 332, "blue": 315, "red": 286}},
    {"number": 12, "par": 3, "strokeIndex": 3, "yardages": {"black": 419, "blue": 399, "red": 350}},
    {"number": 13, "par": 5, "strokeIndex": 18, "yardages": {"black": 130, "blue": 121, "red": 101}},
    {"number": 14, "par": 4, "strokeIndex": 7, "yardages": {"black": 500, "blue": 474, "red": 441}},
    {"number": 15, "par": 4, "strokeIndex": 16, "yardages": {"black": 328, "blue": 310, "red": 245}},
    {"number": 16, "par": 3, "strokeIndex": 10, "yardages": {"black": 170, "blue": 151, "red": 130}},
    {"number": 17, "par": 4, "strokeIndex": 1, "yardages": {"black": 418, "blue": 406, "red": 340}},
    {"number": 18, "par": 4, "strokeIndex": 5, "yardages": {"black": 492, "blue": 486, "red": 447}}
  ]'::jsonb,
  '[
    {"name": "Black", "color": "black", "courseRating": 74.0, "slopeRating": 130, "totalYardage": 6336},
    {"name": "Blue", "color": "blue", "courseRating": 72.0, "slopeRating": 125, "totalYardage": 6024},
    {"name": "Red", "color": "red", "courseRating": 73.0, "slopeRating": 122, "totalYardage": 5300}
  ]'::jsonb
)
ON CONFLICT (venue_id, name) DO UPDATE SET
  description = EXCLUDED.description,
  slope_rating = EXCLUDED.slope_rating,
  course_rating = EXCLUDED.course_rating,
  holes = EXCLUDED.holes,
  tees = EXCLUDED.tees;

-- HEIDELBERG GOLF CLUB
INSERT INTO courses (venue_id, name, description, slope_rating, course_rating, holes, tees)
VALUES (
  'f1a2b3c4-d5e6-7890-abcd-300000000009',
  'Heidelberg',
  'Parkland course established in 1928 in the scenic Lower Plenty area. Features a challenging layout with two par 5s including the demanding 9th at 505 yards. The 8th hole at 368 yards is stroke index 1. Beautiful natural setting in Melbourne''s north-east.',
  120,
  72.0,
  '[
    {"number": 1, "par": 4, "strokeIndex": 7, "yardages": {"white": 383}},
    {"number": 2, "par": 3, "strokeIndex": 5, "yardages": {"white": 165}},
    {"number": 3, "par": 4, "strokeIndex": 3, "yardages": {"white": 384}},
    {"number": 4, "par": 5, "strokeIndex": 13, "yardages": {"white": 466}},
    {"number": 5, "par": 4, "strokeIndex": 17, "yardages": {"white": 271}},
    {"number": 6, "par": 3, "strokeIndex": 11, "yardages": {"white": 153}},
    {"number": 7, "par": 4, "strokeIndex": 9, "yardages": {"white": 383}},
    {"number": 8, "par": 4, "strokeIndex": 1, "yardages": {"white": 368}},
    {"number": 9, "par": 5, "strokeIndex": 15, "yardages": {"white": 505}},
    {"number": 10, "par": 4, "strokeIndex": 8, "yardages": {"white": 365}},
    {"number": 11, "par": 3, "strokeIndex": 6, "yardages": {"white": 175}},
    {"number": 12, "par": 4, "strokeIndex": 4, "yardages": {"white": 395}},
    {"number": 13, "par": 5, "strokeIndex": 14, "yardages": {"white": 480}},
    {"number": 14, "par": 4, "strokeIndex": 18, "yardages": {"white": 285}},
    {"number": 15, "par": 3, "strokeIndex": 12, "yardages": {"white": 165}},
    {"number": 16, "par": 4, "strokeIndex": 10, "yardages": {"white": 370}},
    {"number": 17, "par": 4, "strokeIndex": 2, "yardages": {"white": 390}},
    {"number": 18, "par": 5, "strokeIndex": 16, "yardages": {"white": 475}}
  ]'::jsonb,
  '[
    {"name": "White", "color": "white", "courseRating": 72.0, "slopeRating": 120, "totalYardage": 6178}
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
-- This migration adds 9 new venues and 11 courses to the database
-- (Heritage has 2 courses, Yering Meadows has 27 holes but we add Valley Course)
-- Total new venues in VIC after this migration: 39
-- =====================================================
