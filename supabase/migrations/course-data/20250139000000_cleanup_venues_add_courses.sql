-- =====================================================
-- Migration: cleanup_venues_add_courses
-- Description: Remove duplicate venues, add course data for Victorian
--              sandbelt and peninsula courses
-- Date: 2025-01-39
-- =====================================================

-- =====================================================
-- STEP 1: REMOVE DUPLICATE VENUES
-- Keep the records with more complete data (created on 2025-12-10)
-- =====================================================

-- First, update any courses that reference the old duplicate venues
-- to point to the venue we're keeping

-- Kingston Heath: Keep cc879726-7081-472a-babc-dd18193085d5, delete aed4e88b-6355-4dc7-b7a5-59c61b31bcbb
UPDATE courses
SET venue_id = 'cc879726-7081-472a-babc-dd18193085d5'
WHERE venue_id = 'aed4e88b-6355-4dc7-b7a5-59c61b31bcbb';

DELETE FROM venues WHERE id = 'aed4e88b-6355-4dc7-b7a5-59c61b31bcbb';

-- Royal Melbourne: Keep 1de03386-c397-4410-a621-8a98252038f3, delete 4611aa43-3175-4d72-a02b-874c9813f758
UPDATE courses
SET venue_id = '1de03386-c397-4410-a621-8a98252038f3'
WHERE venue_id = '4611aa43-3175-4d72-a02b-874c9813f758';

DELETE FROM venues WHERE id = '4611aa43-3175-4d72-a02b-874c9813f758';

-- Victoria Golf Club: Keep edf4ab5a-a657-4fd5-8c7b-2258de02615f, delete 5bce474b-0fff-43a3-8fe7-12da88760115
UPDATE courses
SET venue_id = 'edf4ab5a-a657-4fd5-8c7b-2258de02615f'
WHERE venue_id = '5bce474b-0fff-43a3-8fe7-12da88760115';

DELETE FROM venues WHERE id = '5bce474b-0fff-43a3-8fe7-12da88760115';

-- The Australian Golf Club: Keep b9b81e2f-e9e9-4fb7-9523-ff5901de64f2, delete cb2ccf33-a039-4efb-bbb6-43cb57893f87
UPDATE courses
SET venue_id = 'b9b81e2f-e9e9-4fb7-9523-ff5901de64f2'
WHERE venue_id = 'cb2ccf33-a039-4efb-bbb6-43cb57893f87';

DELETE FROM venues WHERE id = 'cb2ccf33-a039-4efb-bbb6-43cb57893f87';

-- Royal Adelaide Golf Club: Keep d5a4accc-301f-4c5a-bdf5-1f823b657325, delete c904cec5-5182-486b-9f71-19565e98fc09
UPDATE courses
SET venue_id = 'd5a4accc-301f-4c5a-bdf5-1f823b657325'
WHERE venue_id = 'c904cec5-5182-486b-9f71-19565e98fc09';

DELETE FROM venues WHERE id = 'c904cec5-5182-486b-9f71-19565e98fc09';

-- The Dunes Golf Links: Keep d2241cc5-8c2f-4fbc-af1a-5ee995b6bcdd, delete de8d3bd4-94a5-4624-9136-4b8ec68db59d
UPDATE courses
SET venue_id = 'd2241cc5-8c2f-4fbc-af1a-5ee995b6bcdd'
WHERE venue_id = 'de8d3bd4-94a5-4624-9136-4b8ec68db59d';

DELETE FROM venues WHERE id = 'de8d3bd4-94a5-4624-9136-4b8ec68db59d';

-- =====================================================
-- STEP 2: INSERT COURSES WITH EXPLICIT VENUE IDs
-- Using ON CONFLICT to update if course already exists
-- =====================================================

-- ROYAL MELBOURNE WEST COURSE
INSERT INTO courses (venue_id, name, description, slope_rating, course_rating, holes, tees)
VALUES (
  '1de03386-c397-4410-a621-8a98252038f3',
  'West Course',
  'Ranked No. 1 in Australia and consistently in World Top 10. Features dramatic undulations, bold bunkering, native grasses framing each hole, and beautifully contoured greens. Designed by Dr. Alister MacKenzie.',
  135,
  74.0,
  '[
    {"number": 1, "par": 4, "strokeIndex": 7, "yardages": {"blue": 427, "white": 400, "red": 355}},
    {"number": 2, "par": 5, "strokeIndex": 13, "yardages": {"blue": 502, "white": 480, "red": 445}},
    {"number": 3, "par": 4, "strokeIndex": 1, "yardages": {"blue": 333, "white": 315, "red": 290}},
    {"number": 4, "par": 5, "strokeIndex": 11, "yardages": {"blue": 470, "white": 450, "red": 420}},
    {"number": 5, "par": 3, "strokeIndex": 15, "yardages": {"blue": 176, "white": 160, "red": 135}},
    {"number": 6, "par": 4, "strokeIndex": 3, "yardages": {"blue": 428, "white": 410, "red": 375}},
    {"number": 7, "par": 3, "strokeIndex": 17, "yardages": {"blue": 148, "white": 135, "red": 115}},
    {"number": 8, "par": 4, "strokeIndex": 9, "yardages": {"blue": 379, "white": 360, "red": 330}},
    {"number": 9, "par": 4, "strokeIndex": 5, "yardages": {"blue": 415, "white": 395, "red": 360}},
    {"number": 10, "par": 4, "strokeIndex": 8, "yardages": {"blue": 312, "white": 295, "red": 270}},
    {"number": 11, "par": 4, "strokeIndex": 4, "yardages": {"blue": 455, "white": 435, "red": 400}},
    {"number": 12, "par": 5, "strokeIndex": 14, "yardages": {"blue": 476, "white": 455, "red": 420}},
    {"number": 13, "par": 3, "strokeIndex": 18, "yardages": {"blue": 147, "white": 135, "red": 115}},
    {"number": 14, "par": 4, "strokeIndex": 10, "yardages": {"blue": 362, "white": 345, "red": 315}},
    {"number": 15, "par": 5, "strokeIndex": 12, "yardages": {"blue": 467, "white": 445, "red": 410}},
    {"number": 16, "par": 3, "strokeIndex": 16, "yardages": {"blue": 210, "white": 190, "red": 160}},
    {"number": 17, "par": 4, "strokeIndex": 2, "yardages": {"blue": 439, "white": 420, "red": 385}},
    {"number": 18, "par": 4, "strokeIndex": 6, "yardages": {"blue": 432, "white": 410, "red": 375}}
  ]'::jsonb,
  '[
    {"name": "Blue", "color": "blue", "courseRating": 74.0, "slopeRating": 135, "totalYardage": 6578},
    {"name": "White", "color": "white", "courseRating": 72.0, "slopeRating": 130, "totalYardage": 6235},
    {"name": "Red", "color": "red", "courseRating": 74.5, "slopeRating": 132, "totalYardage": 5675}
  ]'::jsonb
)
ON CONFLICT (venue_id, name) DO UPDATE SET
  description = EXCLUDED.description,
  slope_rating = EXCLUDED.slope_rating,
  course_rating = EXCLUDED.course_rating,
  holes = EXCLUDED.holes,
  tees = EXCLUDED.tees;

-- ROYAL MELBOURNE EAST COURSE
INSERT INTO courses (venue_id, name, description, slope_rating, course_rating, holes, tees)
VALUES (
  '1de03386-c397-4410-a621-8a98252038f3',
  'East Course',
  'World Top 100 course complementing the West with superb bunkering and smaller, beautifully constructed greens. Designed by Alex Russell.',
  138,
  75.5,
  '[
    {"number": 1, "par": 4, "strokeIndex": 11, "yardages": {"black": 405, "blue": 385, "red": 350}},
    {"number": 2, "par": 4, "strokeIndex": 5, "yardages": {"black": 442, "blue": 420, "red": 385}},
    {"number": 3, "par": 3, "strokeIndex": 15, "yardages": {"black": 165, "blue": 150, "red": 125}},
    {"number": 4, "par": 4, "strokeIndex": 1, "yardages": {"black": 468, "blue": 445, "red": 410}},
    {"number": 5, "par": 4, "strokeIndex": 7, "yardages": {"black": 395, "blue": 375, "red": 340}},
    {"number": 6, "par": 5, "strokeIndex": 13, "yardages": {"black": 545, "blue": 520, "red": 480}},
    {"number": 7, "par": 3, "strokeIndex": 17, "yardages": {"black": 185, "blue": 170, "red": 145}},
    {"number": 8, "par": 4, "strokeIndex": 3, "yardages": {"black": 425, "blue": 405, "red": 370}},
    {"number": 9, "par": 5, "strokeIndex": 9, "yardages": {"black": 520, "blue": 495, "red": 460}},
    {"number": 10, "par": 4, "strokeIndex": 10, "yardages": {"black": 410, "blue": 390, "red": 355}},
    {"number": 11, "par": 4, "strokeIndex": 4, "yardages": {"black": 455, "blue": 435, "red": 400}},
    {"number": 12, "par": 3, "strokeIndex": 16, "yardages": {"black": 175, "blue": 160, "red": 135}},
    {"number": 13, "par": 4, "strokeIndex": 8, "yardages": {"black": 400, "blue": 380, "red": 345}},
    {"number": 14, "par": 5, "strokeIndex": 12, "yardages": {"black": 560, "blue": 535, "red": 495}},
    {"number": 15, "par": 4, "strokeIndex": 2, "yardages": {"black": 460, "blue": 440, "red": 405}},
    {"number": 16, "par": 4, "strokeIndex": 6, "yardages": {"black": 420, "blue": 400, "red": 365}},
    {"number": 17, "par": 3, "strokeIndex": 18, "yardages": {"black": 155, "blue": 140, "red": 120}},
    {"number": 18, "par": 5, "strokeIndex": 14, "yardages": {"black": 535, "blue": 510, "red": 470}}
  ]'::jsonb,
  '[
    {"name": "Black", "color": "black", "courseRating": 75.5, "slopeRating": 138, "totalYardage": 6720},
    {"name": "Blue", "color": "blue", "courseRating": 73.5, "slopeRating": 133, "totalYardage": 6355},
    {"name": "Red", "color": "red", "courseRating": 75.0, "slopeRating": 135, "totalYardage": 5855}
  ]'::jsonb
)
ON CONFLICT (venue_id, name) DO UPDATE SET
  description = EXCLUDED.description,
  slope_rating = EXCLUDED.slope_rating,
  course_rating = EXCLUDED.course_rating,
  holes = EXCLUDED.holes,
  tees = EXCLUDED.tees;

-- KINGSTON HEATH
INSERT INTO courses (venue_id, name, description, slope_rating, course_rating, holes, tees)
VALUES (
  'cc879726-7081-472a-babc-dd18193085d5',
  'Kingston Heath',
  'Consistently ranked in top 3 courses in Australia and top 20 in the world. Features superb conditioning, incomparable MacKenzie bunkering, and unique 19th hole.',
  129,
  72.0,
  '[
    {"number": 1, "par": 4, "strokeIndex": 4, "yardages": {"white": 418, "red": 392}},
    {"number": 2, "par": 4, "strokeIndex": 8, "yardages": {"white": 351, "red": 297}},
    {"number": 3, "par": 4, "strokeIndex": 16, "yardages": {"white": 269, "red": 209}},
    {"number": 4, "par": 4, "strokeIndex": 15, "yardages": {"white": 357, "red": 323}},
    {"number": 5, "par": 3, "strokeIndex": 11, "yardages": {"white": 173, "red": 144}},
    {"number": 6, "par": 4, "strokeIndex": 2, "yardages": {"white": 393, "red": 349}},
    {"number": 7, "par": 5, "strokeIndex": 18, "yardages": {"white": 462, "red": 443}},
    {"number": 8, "par": 4, "strokeIndex": 7, "yardages": {"white": 398, "red": 319}},
    {"number": 9, "par": 4, "strokeIndex": 14, "yardages": {"white": 330, "red": 273}},
    {"number": 10, "par": 3, "strokeIndex": 17, "yardages": {"white": 127, "red": 99}},
    {"number": 11, "par": 4, "strokeIndex": 3, "yardages": {"white": 380, "red": 335}},
    {"number": 12, "par": 5, "strokeIndex": 9, "yardages": {"white": 509, "red": 444}},
    {"number": 13, "par": 4, "strokeIndex": 13, "yardages": {"white": 324, "red": 273}},
    {"number": 14, "par": 5, "strokeIndex": 10, "yardages": {"white": 516, "red": 430}},
    {"number": 15, "par": 3, "strokeIndex": 12, "yardages": {"white": 142, "red": 113}},
    {"number": 16, "par": 4, "strokeIndex": 1, "yardages": {"white": 391, "red": 341}},
    {"number": 17, "par": 4, "strokeIndex": 5, "yardages": {"white": 421, "red": 391}},
    {"number": 18, "par": 4, "strokeIndex": 6, "yardages": {"white": 391, "red": 324}}
  ]'::jsonb,
  '[
    {"name": "Men", "color": "white", "courseRating": 72.0, "slopeRating": 129, "totalYardage": 6352},
    {"name": "Ladies", "color": "red", "courseRating": 75.6, "slopeRating": 136, "totalYardage": 5499}
  ]'::jsonb
)
ON CONFLICT (venue_id, name) DO UPDATE SET
  description = EXCLUDED.description,
  slope_rating = EXCLUDED.slope_rating,
  course_rating = EXCLUDED.course_rating,
  holes = EXCLUDED.holes,
  tees = EXCLUDED.tees;

-- METROPOLITAN
INSERT INTO courses (venue_id, name, description, slope_rating, course_rating, holes, tees)
VALUES (
  '10b87d70-6674-4866-90f1-860640b2004d',
  'Metropolitan',
  'One of the finest championship courses in Australia. Greg Norman called the fairways the best he had played anywhere in the world.',
  133,
  73.0,
  '[
    {"number": 1, "par": 4, "strokeIndex": 9, "yardages": {"blue": 385, "white": 365, "red": 330}},
    {"number": 2, "par": 4, "strokeIndex": 3, "yardages": {"blue": 420, "white": 400, "red": 365}},
    {"number": 3, "par": 3, "strokeIndex": 15, "yardages": {"blue": 175, "white": 160, "red": 135}},
    {"number": 4, "par": 4, "strokeIndex": 1, "yardages": {"blue": 445, "white": 425, "red": 390}},
    {"number": 5, "par": 5, "strokeIndex": 11, "yardages": {"blue": 510, "white": 490, "red": 455}},
    {"number": 6, "par": 4, "strokeIndex": 7, "yardages": {"blue": 395, "white": 375, "red": 340}},
    {"number": 7, "par": 3, "strokeIndex": 17, "yardages": {"blue": 165, "white": 150, "red": 125}},
    {"number": 8, "par": 4, "strokeIndex": 5, "yardages": {"blue": 410, "white": 390, "red": 355}},
    {"number": 9, "par": 5, "strokeIndex": 13, "yardages": {"blue": 525, "white": 505, "red": 470}},
    {"number": 10, "par": 4, "strokeIndex": 10, "yardages": {"blue": 375, "white": 355, "red": 320}},
    {"number": 11, "par": 4, "strokeIndex": 4, "yardages": {"blue": 430, "white": 410, "red": 375}},
    {"number": 12, "par": 3, "strokeIndex": 16, "yardages": {"blue": 185, "white": 170, "red": 145}},
    {"number": 13, "par": 5, "strokeIndex": 12, "yardages": {"blue": 535, "white": 515, "red": 480}},
    {"number": 14, "par": 4, "strokeIndex": 2, "yardages": {"blue": 455, "white": 435, "red": 400}},
    {"number": 15, "par": 4, "strokeIndex": 8, "yardages": {"blue": 390, "white": 370, "red": 335}},
    {"number": 16, "par": 3, "strokeIndex": 18, "yardages": {"blue": 155, "white": 140, "red": 115}},
    {"number": 17, "par": 4, "strokeIndex": 6, "yardages": {"blue": 405, "white": 385, "red": 350}},
    {"number": 18, "par": 4, "strokeIndex": 14, "yardages": {"blue": 370, "white": 350, "red": 315}}
  ]'::jsonb,
  '[
    {"name": "Blue", "color": "blue", "courseRating": 73.0, "slopeRating": 133, "totalYardage": 6430},
    {"name": "White", "color": "white", "courseRating": 71.5, "slopeRating": 128, "totalYardage": 6090},
    {"name": "Red", "color": "red", "courseRating": 73.5, "slopeRating": 130, "totalYardage": 5600}
  ]'::jsonb
)
ON CONFLICT (venue_id, name) DO UPDATE SET
  description = EXCLUDED.description,
  slope_rating = EXCLUDED.slope_rating,
  course_rating = EXCLUDED.course_rating,
  holes = EXCLUDED.holes,
  tees = EXCLUDED.tees;

-- VICTORIA GOLF CLUB
INSERT INTO courses (venue_id, name, description, slope_rating, course_rating, holes, tees)
VALUES (
  'edf4ab5a-a657-4fd5-8c7b-2258de02615f',
  'Victoria',
  'Consistently ranked among Australia''s best. Features lightning-fast greens and some of the best bunkering in Australia. Home course of Peter Thomson.',
  132,
  71.1,
  '[
    {"number": 1, "par": 4, "strokeIndex": 15, "yardages": {"white": 233, "red": 210}},
    {"number": 2, "par": 4, "strokeIndex": 7, "yardages": {"white": 392, "red": 355}},
    {"number": 3, "par": 4, "strokeIndex": 3, "yardages": {"white": 401, "red": 365}},
    {"number": 4, "par": 3, "strokeIndex": 13, "yardages": {"white": 164, "red": 140}},
    {"number": 5, "par": 4, "strokeIndex": 5, "yardages": {"white": 398, "red": 360}},
    {"number": 6, "par": 4, "strokeIndex": 1, "yardages": {"white": 398, "red": 360}},
    {"number": 7, "par": 3, "strokeIndex": 9, "yardages": {"white": 165, "red": 140}},
    {"number": 8, "par": 5, "strokeIndex": 17, "yardages": {"white": 448, "red": 420}},
    {"number": 9, "par": 5, "strokeIndex": 11, "yardages": {"white": 559, "red": 510}},
    {"number": 10, "par": 4, "strokeIndex": 10, "yardages": {"white": 348, "red": 315}},
    {"number": 11, "par": 4, "strokeIndex": 6, "yardages": {"white": 370, "red": 335}},
    {"number": 12, "par": 4, "strokeIndex": 8, "yardages": {"white": 390, "red": 355}},
    {"number": 13, "par": 4, "strokeIndex": 2, "yardages": {"white": 392, "red": 355}},
    {"number": 14, "par": 3, "strokeIndex": 12, "yardages": {"white": 142, "red": 120}},
    {"number": 15, "par": 4, "strokeIndex": 16, "yardages": {"white": 289, "red": 260}},
    {"number": 16, "par": 3, "strokeIndex": 4, "yardages": {"white": 178, "red": 150}},
    {"number": 17, "par": 5, "strokeIndex": 14, "yardages": {"white": 550, "red": 505}},
    {"number": 18, "par": 5, "strokeIndex": 18, "yardages": {"white": 461, "red": 425}}
  ]'::jsonb,
  '[
    {"name": "Men", "color": "white", "courseRating": 71.1, "slopeRating": 132, "totalYardage": 6278},
    {"name": "Ladies", "color": "red", "courseRating": 74.0, "slopeRating": 130, "totalYardage": 5680}
  ]'::jsonb
)
ON CONFLICT (venue_id, name) DO UPDATE SET
  description = EXCLUDED.description,
  slope_rating = EXCLUDED.slope_rating,
  course_rating = EXCLUDED.course_rating,
  holes = EXCLUDED.holes,
  tees = EXCLUDED.tees;

-- PENINSULA KINGSWOOD NORTH COURSE
INSERT INTO courses (venue_id, name, description, slope_rating, course_rating, holes, tees)
VALUES (
  'ff5633c9-358f-4066-b2f7-a93cb2168599',
  'North Course',
  'Sandbelt course featuring excellent variety with elevation changes, irregular greens, heathland vegetation. Ranked among Australia''s Top 10.',
  134,
  73.3,
  '[
    {"number": 1, "par": 4, "strokeIndex": 11, "yardages": {"blue": 380, "white": 360, "red": 325}},
    {"number": 2, "par": 4, "strokeIndex": 5, "yardages": {"blue": 425, "white": 405, "red": 370}},
    {"number": 3, "par": 3, "strokeIndex": 17, "yardages": {"blue": 175, "white": 160, "red": 135}},
    {"number": 4, "par": 5, "strokeIndex": 7, "yardages": {"blue": 520, "white": 500, "red": 465}},
    {"number": 5, "par": 4, "strokeIndex": 1, "yardages": {"blue": 450, "white": 430, "red": 395}},
    {"number": 6, "par": 4, "strokeIndex": 13, "yardages": {"blue": 365, "white": 345, "red": 310}},
    {"number": 7, "par": 3, "strokeIndex": 15, "yardages": {"blue": 185, "white": 170, "red": 145}},
    {"number": 8, "par": 4, "strokeIndex": 3, "yardages": {"blue": 440, "white": 420, "red": 385}},
    {"number": 9, "par": 5, "strokeIndex": 9, "yardages": {"blue": 530, "white": 510, "red": 475}},
    {"number": 10, "par": 4, "strokeIndex": 12, "yardages": {"blue": 375, "white": 355, "red": 320}},
    {"number": 11, "par": 4, "strokeIndex": 4, "yardages": {"blue": 435, "white": 415, "red": 380}},
    {"number": 12, "par": 3, "strokeIndex": 16, "yardages": {"blue": 165, "white": 150, "red": 125}},
    {"number": 13, "par": 4, "strokeIndex": 8, "yardages": {"blue": 400, "white": 380, "red": 345}},
    {"number": 14, "par": 5, "strokeIndex": 10, "yardages": {"blue": 545, "white": 525, "red": 490}},
    {"number": 15, "par": 4, "strokeIndex": 2, "yardages": {"blue": 455, "white": 435, "red": 400}},
    {"number": 16, "par": 3, "strokeIndex": 18, "yardages": {"blue": 155, "white": 140, "red": 115}},
    {"number": 17, "par": 4, "strokeIndex": 6, "yardages": {"blue": 410, "white": 390, "red": 355}},
    {"number": 18, "par": 4, "strokeIndex": 14, "yardages": {"blue": 345, "white": 325, "red": 290}}
  ]'::jsonb,
  '[
    {"name": "Blue", "color": "blue", "courseRating": 73.3, "slopeRating": 134, "totalYardage": 6355},
    {"name": "White", "color": "white", "courseRating": 71.5, "slopeRating": 129, "totalYardage": 6015},
    {"name": "Red", "color": "red", "courseRating": 73.0, "slopeRating": 128, "totalYardage": 5525}
  ]'::jsonb
)
ON CONFLICT (venue_id, name) DO UPDATE SET
  description = EXCLUDED.description,
  slope_rating = EXCLUDED.slope_rating,
  course_rating = EXCLUDED.course_rating,
  holes = EXCLUDED.holes,
  tees = EXCLUDED.tees;

-- PENINSULA KINGSWOOD SOUTH COURSE
INSERT INTO courses (venue_id, name, description, slope_rating, course_rating, holes, tees)
VALUES (
  'ff5633c9-358f-4066-b2f7-a93cb2168599',
  'South Course',
  'Longer, flatter than North with stunning views. Creek lines and dry stone walls characterize the layout.',
  130,
  72.5,
  '[
    {"number": 1, "par": 4, "strokeIndex": 9, "yardages": {"blue": 390, "white": 370, "red": 335}},
    {"number": 2, "par": 5, "strokeIndex": 5, "yardages": {"blue": 535, "white": 515, "red": 480}},
    {"number": 3, "par": 4, "strokeIndex": 1, "yardages": {"blue": 445, "white": 425, "red": 390}},
    {"number": 4, "par": 3, "strokeIndex": 15, "yardages": {"blue": 175, "white": 160, "red": 135}},
    {"number": 5, "par": 4, "strokeIndex": 7, "yardages": {"blue": 405, "white": 385, "red": 350}},
    {"number": 6, "par": 4, "strokeIndex": 11, "yardages": {"blue": 375, "white": 355, "red": 320}},
    {"number": 7, "par": 3, "strokeIndex": 17, "yardages": {"blue": 165, "white": 150, "red": 125}},
    {"number": 8, "par": 5, "strokeIndex": 13, "yardages": {"blue": 510, "white": 490, "red": 455}},
    {"number": 9, "par": 4, "strokeIndex": 3, "yardages": {"blue": 430, "white": 410, "red": 375}},
    {"number": 10, "par": 4, "strokeIndex": 10, "yardages": {"blue": 385, "white": 365, "red": 330}},
    {"number": 11, "par": 4, "strokeIndex": 4, "yardages": {"blue": 425, "white": 405, "red": 370}},
    {"number": 12, "par": 3, "strokeIndex": 16, "yardages": {"blue": 180, "white": 165, "red": 140}},
    {"number": 13, "par": 5, "strokeIndex": 8, "yardages": {"blue": 520, "white": 500, "red": 465}},
    {"number": 14, "par": 4, "strokeIndex": 2, "yardages": {"blue": 455, "white": 435, "red": 400}},
    {"number": 15, "par": 4, "strokeIndex": 12, "yardages": {"blue": 370, "white": 350, "red": 315}},
    {"number": 16, "par": 3, "strokeIndex": 18, "yardages": {"blue": 155, "white": 140, "red": 115}},
    {"number": 17, "par": 4, "strokeIndex": 6, "yardages": {"blue": 400, "white": 380, "red": 345}},
    {"number": 18, "par": 5, "strokeIndex": 14, "yardages": {"blue": 480, "white": 460, "red": 425}}
  ]'::jsonb,
  '[
    {"name": "Blue", "color": "blue", "courseRating": 72.5, "slopeRating": 130, "totalYardage": 6200},
    {"name": "White", "color": "white", "courseRating": 70.5, "slopeRating": 125, "totalYardage": 5860},
    {"name": "Red", "color": "red", "courseRating": 72.0, "slopeRating": 124, "totalYardage": 5370}
  ]'::jsonb
)
ON CONFLICT (venue_id, name) DO UPDATE SET
  description = EXCLUDED.description,
  slope_rating = EXCLUDED.slope_rating,
  course_rating = EXCLUDED.course_rating,
  holes = EXCLUDED.holes,
  tees = EXCLUDED.tees;

-- YARRA YARRA
INSERT INTO courses (venue_id, name, description, slope_rating, course_rating, holes, tees)
VALUES (
  '56f4b07c-fd74-4c73-9451-cc5ee5256c2f',
  'Yarra Yarra',
  'Melbourne Sandbelt course with distinct shift between intimate front nine and roomier back nine. Large, fast, undulating greens. Restored by Tom Doak in 2017.',
  128,
  72.0,
  '[
    {"number": 1, "par": 4, "strokeIndex": 7, "yardages": {"white": 375, "red": 340}},
    {"number": 2, "par": 4, "strokeIndex": 3, "yardages": {"white": 410, "red": 375}},
    {"number": 3, "par": 3, "strokeIndex": 15, "yardages": {"white": 165, "red": 140}},
    {"number": 4, "par": 4, "strokeIndex": 1, "yardages": {"white": 435, "red": 400}},
    {"number": 5, "par": 5, "strokeIndex": 11, "yardages": {"white": 505, "red": 470}},
    {"number": 6, "par": 4, "strokeIndex": 9, "yardages": {"white": 365, "red": 330}},
    {"number": 7, "par": 3, "strokeIndex": 17, "yardages": {"white": 145, "red": 120}},
    {"number": 8, "par": 4, "strokeIndex": 5, "yardages": {"white": 395, "red": 360}},
    {"number": 9, "par": 5, "strokeIndex": 13, "yardages": {"white": 490, "red": 455}},
    {"number": 10, "par": 4, "strokeIndex": 8, "yardages": {"white": 380, "red": 345}},
    {"number": 11, "par": 4, "strokeIndex": 4, "yardages": {"white": 420, "red": 385}},
    {"number": 12, "par": 3, "strokeIndex": 16, "yardages": {"white": 175, "red": 150}},
    {"number": 13, "par": 5, "strokeIndex": 10, "yardages": {"white": 515, "red": 480}},
    {"number": 14, "par": 4, "strokeIndex": 2, "yardages": {"white": 445, "red": 410}},
    {"number": 15, "par": 4, "strokeIndex": 12, "yardages": {"white": 355, "red": 320}},
    {"number": 16, "par": 3, "strokeIndex": 18, "yardages": {"white": 155, "red": 130}},
    {"number": 17, "par": 4, "strokeIndex": 6, "yardages": {"white": 385, "red": 350}},
    {"number": 18, "par": 4, "strokeIndex": 14, "yardages": {"white": 340, "red": 305}}
  ]'::jsonb,
  '[
    {"name": "Men", "color": "white", "courseRating": 72.0, "slopeRating": 128, "totalYardage": 6055},
    {"name": "Ladies", "color": "red", "courseRating": 74.0, "slopeRating": 126, "totalYardage": 5565}
  ]'::jsonb
)
ON CONFLICT (venue_id, name) DO UPDATE SET
  description = EXCLUDED.description,
  slope_rating = EXCLUDED.slope_rating,
  course_rating = EXCLUDED.course_rating,
  holes = EXCLUDED.holes,
  tees = EXCLUDED.tees;

-- WOODLANDS
INSERT INTO courses (venue_id, name, description, slope_rating, course_rating, holes, tees)
VALUES (
  'e7b058a8-eb1b-4e7e-9149-c22137539668',
  'Woodlands',
  'Often called Melbourne''s most underrated course. Known for pure bent grass greens, strategic bunkering, excellent one-shotters.',
  133,
  72.0,
  '[
    {"number": 1, "par": 4, "strokeIndex": 9, "yardages": {"white": 355, "red": 320}},
    {"number": 2, "par": 4, "strokeIndex": 3, "yardages": {"white": 395, "red": 360}},
    {"number": 3, "par": 3, "strokeIndex": 15, "yardages": {"white": 155, "red": 130}},
    {"number": 4, "par": 4, "strokeIndex": 1, "yardages": {"white": 420, "red": 385}},
    {"number": 5, "par": 5, "strokeIndex": 11, "yardages": {"white": 485, "red": 450}},
    {"number": 6, "par": 4, "strokeIndex": 7, "yardages": {"white": 370, "red": 335}},
    {"number": 7, "par": 3, "strokeIndex": 17, "yardages": {"white": 140, "red": 115}},
    {"number": 8, "par": 4, "strokeIndex": 5, "yardages": {"white": 385, "red": 350}},
    {"number": 9, "par": 5, "strokeIndex": 13, "yardages": {"white": 470, "red": 435}},
    {"number": 10, "par": 4, "strokeIndex": 10, "yardages": {"white": 345, "red": 310}},
    {"number": 11, "par": 4, "strokeIndex": 4, "yardages": {"white": 405, "red": 370}},
    {"number": 12, "par": 3, "strokeIndex": 16, "yardages": {"white": 165, "red": 140}},
    {"number": 13, "par": 5, "strokeIndex": 12, "yardages": {"white": 495, "red": 460}},
    {"number": 14, "par": 4, "strokeIndex": 2, "yardages": {"white": 425, "red": 390}},
    {"number": 15, "par": 4, "strokeIndex": 8, "yardages": {"white": 360, "red": 325}},
    {"number": 16, "par": 3, "strokeIndex": 18, "yardages": {"white": 145, "red": 120}},
    {"number": 17, "par": 4, "strokeIndex": 6, "yardages": {"white": 380, "red": 345}},
    {"number": 18, "par": 4, "strokeIndex": 14, "yardages": {"white": 335, "red": 300}}
  ]'::jsonb,
  '[
    {"name": "Men", "color": "white", "courseRating": 72.0, "slopeRating": 133, "totalYardage": 6030},
    {"name": "Ladies", "color": "red", "courseRating": 74.0, "slopeRating": 130, "totalYardage": 5540}
  ]'::jsonb
)
ON CONFLICT (venue_id, name) DO UPDATE SET
  description = EXCLUDED.description,
  slope_rating = EXCLUDED.slope_rating,
  course_rating = EXCLUDED.course_rating,
  holes = EXCLUDED.holes,
  tees = EXCLUDED.tees;

-- BARWON HEADS
INSERT INTO courses (venue_id, name, description, slope_rating, course_rating, holes, tees)
VALUES (
  '1e03c167-663c-4222-94f2-3532c45ed11e',
  'Barwon Heads',
  'Classic links course on Bellarine Peninsula. Bouncy, firm and fast links turf with windswept greens. Crowned Best Golf Town in Australia.',
  125,
  71.8,
  '[
    {"number": 1, "par": 4, "strokeIndex": 5, "yardages": {"white": 385, "red": 350}},
    {"number": 2, "par": 4, "strokeIndex": 9, "yardages": {"white": 355, "red": 320}},
    {"number": 3, "par": 3, "strokeIndex": 17, "yardages": {"white": 150, "red": 125}},
    {"number": 4, "par": 5, "strokeIndex": 7, "yardages": {"white": 495, "red": 460}},
    {"number": 5, "par": 4, "strokeIndex": 1, "yardages": {"white": 415, "red": 380}},
    {"number": 6, "par": 4, "strokeIndex": 11, "yardages": {"white": 340, "red": 305}},
    {"number": 7, "par": 3, "strokeIndex": 15, "yardages": {"white": 165, "red": 140}},
    {"number": 8, "par": 4, "strokeIndex": 3, "yardages": {"white": 405, "red": 370}},
    {"number": 9, "par": 4, "strokeIndex": 13, "yardages": {"white": 330, "red": 295}},
    {"number": 10, "par": 4, "strokeIndex": 6, "yardages": {"white": 375, "red": 340}},
    {"number": 11, "par": 5, "strokeIndex": 10, "yardages": {"white": 480, "red": 445}},
    {"number": 12, "par": 3, "strokeIndex": 18, "yardages": {"white": 135, "red": 110}},
    {"number": 13, "par": 4, "strokeIndex": 4, "yardages": {"white": 400, "red": 365}},
    {"number": 14, "par": 4, "strokeIndex": 8, "yardages": {"white": 365, "red": 330}},
    {"number": 15, "par": 3, "strokeIndex": 16, "yardages": {"white": 155, "red": 130}},
    {"number": 16, "par": 5, "strokeIndex": 12, "yardages": {"white": 475, "red": 440}},
    {"number": 17, "par": 4, "strokeIndex": 2, "yardages": {"white": 420, "red": 385}},
    {"number": 18, "par": 4, "strokeIndex": 14, "yardages": {"white": 335, "red": 300}}
  ]'::jsonb,
  '[
    {"name": "Men", "color": "white", "courseRating": 71.8, "slopeRating": 125, "totalYardage": 6180},
    {"name": "Ladies", "color": "red", "courseRating": 73.5, "slopeRating": 123, "totalYardage": 5590}
  ]'::jsonb
)
ON CONFLICT (venue_id, name) DO UPDATE SET
  description = EXCLUDED.description,
  slope_rating = EXCLUDED.slope_rating,
  course_rating = EXCLUDED.course_rating,
  holes = EXCLUDED.holes,
  tees = EXCLUDED.tees;

-- THE DUNES GOLF LINKS
INSERT INTO courses (venue_id, name, description, slope_rating, course_rating, holes, tees)
VALUES (
  'd2241cc5-8c2f-4fbc-af1a-5ee995b6bcdd',
  'The Dunes Course',
  'Victoria''s #1 public access course. Authentic links golf with dramatic dune formations. Nick Faldo praised Hole 13; Tom Watson called Hole 17 exquisite.',
  148,
  74.5,
  '[
    {"number": 1, "par": 4, "strokeIndex": 11, "yardages": {"blue": 395, "white": 375, "red": 340}},
    {"number": 2, "par": 5, "strokeIndex": 5, "yardages": {"blue": 535, "white": 515, "red": 480}},
    {"number": 3, "par": 4, "strokeIndex": 1, "yardages": {"blue": 450, "white": 430, "red": 395}},
    {"number": 4, "par": 3, "strokeIndex": 15, "yardages": {"blue": 185, "white": 170, "red": 145}},
    {"number": 5, "par": 4, "strokeIndex": 7, "yardages": {"blue": 410, "white": 390, "red": 355}},
    {"number": 6, "par": 4, "strokeIndex": 13, "yardages": {"blue": 365, "white": 345, "red": 310}},
    {"number": 7, "par": 3, "strokeIndex": 17, "yardages": {"blue": 165, "white": 150, "red": 125}},
    {"number": 8, "par": 5, "strokeIndex": 9, "yardages": {"blue": 525, "white": 505, "red": 470}},
    {"number": 9, "par": 4, "strokeIndex": 3, "yardages": {"blue": 440, "white": 420, "red": 385}},
    {"number": 10, "par": 4, "strokeIndex": 12, "yardages": {"blue": 375, "white": 355, "red": 320}},
    {"number": 11, "par": 4, "strokeIndex": 4, "yardages": {"blue": 435, "white": 415, "red": 380}},
    {"number": 12, "par": 3, "strokeIndex": 16, "yardages": {"blue": 175, "white": 160, "red": 135}},
    {"number": 13, "par": 5, "strokeIndex": 8, "yardages": {"blue": 545, "white": 525, "red": 490}},
    {"number": 14, "par": 4, "strokeIndex": 2, "yardages": {"blue": 455, "white": 435, "red": 400}},
    {"number": 15, "par": 4, "strokeIndex": 10, "yardages": {"blue": 385, "white": 365, "red": 330}},
    {"number": 16, "par": 3, "strokeIndex": 18, "yardages": {"blue": 155, "white": 140, "red": 115}},
    {"number": 17, "par": 4, "strokeIndex": 6, "yardages": {"blue": 420, "white": 400, "red": 365}},
    {"number": 18, "par": 5, "strokeIndex": 14, "yardages": {"blue": 510, "white": 490, "red": 455}}
  ]'::jsonb,
  '[
    {"name": "Blue", "color": "blue", "courseRating": 74.5, "slopeRating": 148, "totalYardage": 6525},
    {"name": "White", "color": "white", "courseRating": 72.5, "slopeRating": 143, "totalYardage": 6185},
    {"name": "Red", "color": "red", "courseRating": 74.0, "slopeRating": 140, "totalYardage": 5695}
  ]'::jsonb
)
ON CONFLICT (venue_id, name) DO UPDATE SET
  description = EXCLUDED.description,
  slope_rating = EXCLUDED.slope_rating,
  course_rating = EXCLUDED.course_rating,
  holes = EXCLUDED.holes,
  tees = EXCLUDED.tees;

-- THE NATIONAL OLD COURSE
INSERT INTO courses (venue_id, name, description, slope_rating, course_rating, holes, tees)
VALUES (
  '73ee0ee0-3337-40eb-ba26-2404e566f2ad',
  'Old Course',
  'True test of golf with strategic ball positioning essential. Features large tiered greens, coastal views, extreme elevation changes.',
  135,
  72.0,
  '[
    {"number": 1, "par": 4, "strokeIndex": 9, "yardages": {"blue": 385, "white": 365, "red": 330}},
    {"number": 2, "par": 4, "strokeIndex": 3, "yardages": {"blue": 420, "white": 400, "red": 365}},
    {"number": 3, "par": 3, "strokeIndex": 15, "yardages": {"blue": 175, "white": 160, "red": 135}},
    {"number": 4, "par": 5, "strokeIndex": 7, "yardages": {"blue": 510, "white": 490, "red": 455}},
    {"number": 5, "par": 4, "strokeIndex": 1, "yardages": {"blue": 445, "white": 425, "red": 390}},
    {"number": 6, "par": 4, "strokeIndex": 11, "yardages": {"blue": 365, "white": 345, "red": 310}},
    {"number": 7, "par": 3, "strokeIndex": 17, "yardages": {"blue": 155, "white": 140, "red": 115}},
    {"number": 8, "par": 4, "strokeIndex": 5, "yardages": {"blue": 405, "white": 385, "red": 350}},
    {"number": 9, "par": 5, "strokeIndex": 13, "yardages": {"blue": 495, "white": 475, "red": 440}},
    {"number": 10, "par": 4, "strokeIndex": 10, "yardages": {"blue": 370, "white": 350, "red": 315}},
    {"number": 11, "par": 4, "strokeIndex": 4, "yardages": {"blue": 430, "white": 410, "red": 375}},
    {"number": 12, "par": 3, "strokeIndex": 16, "yardages": {"blue": 185, "white": 170, "red": 145}},
    {"number": 13, "par": 5, "strokeIndex": 8, "yardages": {"blue": 520, "white": 500, "red": 465}},
    {"number": 14, "par": 4, "strokeIndex": 2, "yardages": {"blue": 450, "white": 430, "red": 395}},
    {"number": 15, "par": 4, "strokeIndex": 12, "yardages": {"blue": 360, "white": 340, "red": 305}},
    {"number": 16, "par": 3, "strokeIndex": 18, "yardages": {"blue": 165, "white": 150, "red": 125}},
    {"number": 17, "par": 4, "strokeIndex": 6, "yardages": {"blue": 395, "white": 375, "red": 340}},
    {"number": 18, "par": 4, "strokeIndex": 14, "yardages": {"blue": 355, "white": 335, "red": 300}}
  ]'::jsonb,
  '[
    {"name": "Blue", "color": "blue", "courseRating": 72.0, "slopeRating": 135, "totalYardage": 6185},
    {"name": "White", "color": "white", "courseRating": 70.0, "slopeRating": 130, "totalYardage": 5845},
    {"name": "Red", "color": "red", "courseRating": 72.0, "slopeRating": 128, "totalYardage": 5355}
  ]'::jsonb
)
ON CONFLICT (venue_id, name) DO UPDATE SET
  description = EXCLUDED.description,
  slope_rating = EXCLUDED.slope_rating,
  course_rating = EXCLUDED.course_rating,
  holes = EXCLUDED.holes,
  tees = EXCLUDED.tees;

-- THE NATIONAL MOONAH COURSE
INSERT INTO courses (venue_id, name, description, slope_rating, course_rating, holes, tees)
VALUES (
  '73ee0ee0-3337-40eb-ba26-2404e566f2ad',
  'Moonah Course',
  'Built in spirit of traditional links on former cattle ranching land. Features rolling terrain, dramatic bunkering, Bass Strait views. Designed by Greg Norman.',
  140,
  73.6,
  '[
    {"number": 1, "par": 4, "strokeIndex": 7, "yardages": {"blue": 405, "white": 385, "red": 350}},
    {"number": 2, "par": 5, "strokeIndex": 11, "yardages": {"blue": 535, "white": 515, "red": 480}},
    {"number": 3, "par": 4, "strokeIndex": 1, "yardages": {"blue": 460, "white": 440, "red": 405}},
    {"number": 4, "par": 3, "strokeIndex": 15, "yardages": {"blue": 195, "white": 180, "red": 155}},
    {"number": 5, "par": 4, "strokeIndex": 5, "yardages": {"blue": 425, "white": 405, "red": 370}},
    {"number": 6, "par": 4, "strokeIndex": 9, "yardages": {"blue": 385, "white": 365, "red": 330}},
    {"number": 7, "par": 3, "strokeIndex": 17, "yardages": {"blue": 165, "white": 150, "red": 125}},
    {"number": 8, "par": 5, "strokeIndex": 13, "yardages": {"blue": 520, "white": 500, "red": 465}},
    {"number": 9, "par": 4, "strokeIndex": 3, "yardages": {"blue": 445, "white": 425, "red": 390}},
    {"number": 10, "par": 4, "strokeIndex": 8, "yardages": {"blue": 395, "white": 375, "red": 340}},
    {"number": 11, "par": 4, "strokeIndex": 4, "yardages": {"blue": 435, "white": 415, "red": 380}},
    {"number": 12, "par": 3, "strokeIndex": 16, "yardages": {"blue": 185, "white": 170, "red": 145}},
    {"number": 13, "par": 5, "strokeIndex": 10, "yardages": {"blue": 545, "white": 525, "red": 490}},
    {"number": 14, "par": 4, "strokeIndex": 2, "yardages": {"blue": 465, "white": 445, "red": 410}},
    {"number": 15, "par": 4, "strokeIndex": 12, "yardages": {"blue": 375, "white": 355, "red": 320}},
    {"number": 16, "par": 3, "strokeIndex": 18, "yardages": {"blue": 175, "white": 160, "red": 135}},
    {"number": 17, "par": 4, "strokeIndex": 6, "yardages": {"blue": 415, "white": 395, "red": 360}},
    {"number": 18, "par": 5, "strokeIndex": 14, "yardages": {"blue": 505, "white": 485, "red": 450}}
  ]'::jsonb,
  '[
    {"name": "Blue", "color": "blue", "courseRating": 73.6, "slopeRating": 140, "totalYardage": 6650},
    {"name": "White", "color": "white", "courseRating": 71.5, "slopeRating": 135, "totalYardage": 6290},
    {"name": "Red", "color": "red", "courseRating": 73.0, "slopeRating": 132, "totalYardage": 5800}
  ]'::jsonb
)
ON CONFLICT (venue_id, name) DO UPDATE SET
  description = EXCLUDED.description,
  slope_rating = EXCLUDED.slope_rating,
  course_rating = EXCLUDED.course_rating,
  holes = EXCLUDED.holes,
  tees = EXCLUDED.tees;

-- THE NATIONAL GUNNAMATTA COURSE
INSERT INTO courses (venue_id, name, description, slope_rating, course_rating, holes, tees)
VALUES (
  '73ee0ee0-3337-40eb-ba26-2404e566f2ad',
  'Gunnamatta Course',
  'Situated near Gunnamatta Beach, embracing natural cup and bowl undulations. Generous fairway width with imaginative green shapes. Designed by Tom Doak.',
  128,
  75.0,
  '[
    {"number": 1, "par": 4, "strokeIndex": 11, "yardages": {"blue": 400, "white": 380, "red": 345}},
    {"number": 2, "par": 5, "strokeIndex": 7, "yardages": {"blue": 545, "white": 525, "red": 490}},
    {"number": 3, "par": 4, "strokeIndex": 3, "yardages": {"blue": 445, "white": 425, "red": 390}},
    {"number": 4, "par": 3, "strokeIndex": 15, "yardages": {"blue": 195, "white": 180, "red": 155}},
    {"number": 5, "par": 4, "strokeIndex": 1, "yardages": {"blue": 470, "white": 450, "red": 415}},
    {"number": 6, "par": 4, "strokeIndex": 9, "yardages": {"blue": 390, "white": 370, "red": 335}},
    {"number": 7, "par": 3, "strokeIndex": 17, "yardages": {"blue": 175, "white": 160, "red": 135}},
    {"number": 8, "par": 5, "strokeIndex": 13, "yardages": {"blue": 530, "white": 510, "red": 475}},
    {"number": 9, "par": 4, "strokeIndex": 5, "yardages": {"blue": 430, "white": 410, "red": 375}},
    {"number": 10, "par": 4, "strokeIndex": 10, "yardages": {"blue": 385, "white": 365, "red": 330}},
    {"number": 11, "par": 4, "strokeIndex": 4, "yardages": {"blue": 450, "white": 430, "red": 395}},
    {"number": 12, "par": 3, "strokeIndex": 16, "yardages": {"blue": 200, "white": 185, "red": 160}},
    {"number": 13, "par": 5, "strokeIndex": 8, "yardages": {"blue": 555, "white": 535, "red": 500}},
    {"number": 14, "par": 4, "strokeIndex": 2, "yardages": {"blue": 465, "white": 445, "red": 410}},
    {"number": 15, "par": 4, "strokeIndex": 12, "yardages": {"blue": 380, "white": 360, "red": 325}},
    {"number": 16, "par": 3, "strokeIndex": 18, "yardages": {"blue": 185, "white": 170, "red": 145}},
    {"number": 17, "par": 4, "strokeIndex": 6, "yardages": {"blue": 425, "white": 405, "red": 370}},
    {"number": 18, "par": 5, "strokeIndex": 14, "yardages": {"blue": 520, "white": 500, "red": 465}}
  ]'::jsonb,
  '[
    {"name": "Blue", "color": "blue", "courseRating": 75.0, "slopeRating": 128, "totalYardage": 6745},
    {"name": "White", "color": "white", "courseRating": 73.0, "slopeRating": 123, "totalYardage": 6405},
    {"name": "Red", "color": "red", "courseRating": 74.5, "slopeRating": 120, "totalYardage": 5915}
  ]'::jsonb
)
ON CONFLICT (venue_id, name) DO UPDATE SET
  description = EXCLUDED.description,
  slope_rating = EXCLUDED.slope_rating,
  course_rating = EXCLUDED.course_rating,
  holes = EXCLUDED.holes,
  tees = EXCLUDED.tees;

-- MOONAH LINKS OPEN COURSE
INSERT INTO courses (venue_id, name, description, slope_rating, course_rating, holes, tees)
VALUES (
  'a92c529b-0ba5-41ea-85d4-83e992f60b71',
  'Open Course',
  'Only course in Australia designed specifically to host Australian Open. Stadium layout with spectator viewing platforms. Designed by Peter Thomson.',
  113,
  77.4,
  '[
    {"number": 1, "par": 4, "strokeIndex": 9, "yardages": {"black": 420, "white": 400, "red": 365}},
    {"number": 2, "par": 5, "strokeIndex": 5, "yardages": {"black": 565, "white": 545, "red": 510}},
    {"number": 3, "par": 4, "strokeIndex": 1, "yardages": {"black": 475, "white": 455, "red": 420}},
    {"number": 4, "par": 3, "strokeIndex": 15, "yardages": {"black": 195, "white": 180, "red": 155}},
    {"number": 5, "par": 4, "strokeIndex": 7, "yardages": {"black": 430, "white": 410, "red": 375}},
    {"number": 6, "par": 4, "strokeIndex": 11, "yardages": {"black": 395, "white": 375, "red": 340}},
    {"number": 7, "par": 3, "strokeIndex": 17, "yardages": {"black": 175, "white": 160, "red": 135}},
    {"number": 8, "par": 5, "strokeIndex": 13, "yardages": {"black": 545, "white": 525, "red": 490}},
    {"number": 9, "par": 4, "strokeIndex": 3, "yardages": {"black": 460, "white": 440, "red": 405}},
    {"number": 10, "par": 4, "strokeIndex": 10, "yardages": {"black": 405, "white": 385, "red": 350}},
    {"number": 11, "par": 4, "strokeIndex": 4, "yardages": {"black": 455, "white": 435, "red": 400}},
    {"number": 12, "par": 3, "strokeIndex": 16, "yardages": {"black": 210, "white": 195, "red": 170}},
    {"number": 13, "par": 5, "strokeIndex": 8, "yardages": {"black": 560, "white": 540, "red": 505}},
    {"number": 14, "par": 4, "strokeIndex": 2, "yardages": {"black": 480, "white": 460, "red": 425}},
    {"number": 15, "par": 4, "strokeIndex": 12, "yardages": {"black": 390, "white": 370, "red": 335}},
    {"number": 16, "par": 3, "strokeIndex": 18, "yardages": {"black": 185, "white": 170, "red": 145}},
    {"number": 17, "par": 4, "strokeIndex": 6, "yardages": {"black": 435, "white": 415, "red": 380}},
    {"number": 18, "par": 5, "strokeIndex": 14, "yardages": {"black": 535, "white": 515, "red": 480}}
  ]'::jsonb,
  '[
    {"name": "Black", "color": "black", "courseRating": 77.4, "slopeRating": 113, "totalYardage": 7315},
    {"name": "White", "color": "white", "courseRating": 75.0, "slopeRating": 108, "totalYardage": 6975},
    {"name": "Red", "color": "red", "courseRating": 76.5, "slopeRating": 105, "totalYardage": 6485}
  ]'::jsonb
)
ON CONFLICT (venue_id, name) DO UPDATE SET
  description = EXCLUDED.description,
  slope_rating = EXCLUDED.slope_rating,
  course_rating = EXCLUDED.course_rating,
  holes = EXCLUDED.holes,
  tees = EXCLUDED.tees;

-- MOONAH LINKS LEGENDS COURSE
INSERT INTO courses (venue_id, name, description, slope_rating, course_rating, holes, tees)
VALUES (
  'a92c529b-0ba5-41ea-85d4-83e992f60b71',
  'Legends Course',
  'More forgiving than Open Course, weaving through mature Moonah trees. Each hole named after a golfing legend. Designed by Ross Perrett and Peter Thomson.',
  141,
  74.1,
  '[
    {"number": 1, "par": 4, "strokeIndex": 7, "yardages": {"blue": 395, "white": 375, "red": 340}},
    {"number": 2, "par": 5, "strokeIndex": 11, "yardages": {"blue": 520, "white": 500, "red": 465}},
    {"number": 3, "par": 4, "strokeIndex": 3, "yardages": {"blue": 435, "white": 415, "red": 380}},
    {"number": 4, "par": 3, "strokeIndex": 15, "yardages": {"blue": 175, "white": 160, "red": 135}},
    {"number": 5, "par": 4, "strokeIndex": 5, "yardages": {"blue": 420, "white": 400, "red": 365}},
    {"number": 6, "par": 4, "strokeIndex": 9, "yardages": {"blue": 380, "white": 360, "red": 325}},
    {"number": 7, "par": 3, "strokeIndex": 17, "yardages": {"blue": 165, "white": 150, "red": 125}},
    {"number": 8, "par": 5, "strokeIndex": 13, "yardages": {"blue": 505, "white": 485, "red": 450}},
    {"number": 9, "par": 4, "strokeIndex": 1, "yardages": {"blue": 450, "white": 430, "red": 395}},
    {"number": 10, "par": 4, "strokeIndex": 8, "yardages": {"blue": 385, "white": 365, "red": 330}},
    {"number": 11, "par": 4, "strokeIndex": 4, "yardages": {"blue": 425, "white": 405, "red": 370}},
    {"number": 12, "par": 3, "strokeIndex": 16, "yardages": {"blue": 180, "white": 165, "red": 140}},
    {"number": 13, "par": 5, "strokeIndex": 10, "yardages": {"blue": 530, "white": 510, "red": 475}},
    {"number": 14, "par": 4, "strokeIndex": 2, "yardages": {"blue": 445, "white": 425, "red": 390}},
    {"number": 15, "par": 4, "strokeIndex": 12, "yardages": {"blue": 370, "white": 350, "red": 315}},
    {"number": 16, "par": 3, "strokeIndex": 18, "yardages": {"blue": 160, "white": 145, "red": 120}},
    {"number": 17, "par": 4, "strokeIndex": 6, "yardages": {"blue": 405, "white": 385, "red": 350}},
    {"number": 18, "par": 5, "strokeIndex": 14, "yardages": {"blue": 495, "white": 475, "red": 440}}
  ]'::jsonb,
  '[
    {"name": "Blue", "color": "blue", "courseRating": 74.1, "slopeRating": 141, "totalYardage": 6440},
    {"name": "White", "color": "white", "courseRating": 72.0, "slopeRating": 136, "totalYardage": 6100},
    {"name": "Red", "color": "red", "courseRating": 73.5, "slopeRating": 133, "totalYardage": 5610}
  ]'::jsonb
)
ON CONFLICT (venue_id, name) DO UPDATE SET
  description = EXCLUDED.description,
  slope_rating = EXCLUDED.slope_rating,
  course_rating = EXCLUDED.course_rating,
  holes = EXCLUDED.holes,
  tees = EXCLUDED.tees;

-- 13TH BEACH BEACH COURSE
INSERT INTO courses (venue_id, name, description, slope_rating, course_rating, holes, tees)
VALUES (
  'ea8a80e8-e302-4989-82d8-05fcf2076130',
  'Beach Course',
  'Links style course with arguably the best collection of Par 3s in Australia. Host of Victorian Open. Designed by Tony Cashmore.',
  136,
  73.0,
  '[
    {"number": 1, "par": 4, "strokeIndex": 9, "yardages": {"blue": 385, "white": 365, "red": 330}},
    {"number": 2, "par": 4, "strokeIndex": 3, "yardages": {"blue": 420, "white": 400, "red": 365}},
    {"number": 3, "par": 3, "strokeIndex": 15, "yardages": {"blue": 175, "white": 160, "red": 135}},
    {"number": 4, "par": 5, "strokeIndex": 7, "yardages": {"blue": 510, "white": 490, "red": 455}},
    {"number": 5, "par": 4, "strokeIndex": 1, "yardages": {"blue": 445, "white": 425, "red": 390}},
    {"number": 6, "par": 4, "strokeIndex": 11, "yardages": {"blue": 365, "white": 345, "red": 310}},
    {"number": 7, "par": 3, "strokeIndex": 17, "yardages": {"blue": 155, "white": 140, "red": 115}},
    {"number": 8, "par": 4, "strokeIndex": 5, "yardages": {"blue": 405, "white": 385, "red": 350}},
    {"number": 9, "par": 5, "strokeIndex": 13, "yardages": {"blue": 495, "white": 475, "red": 440}},
    {"number": 10, "par": 4, "strokeIndex": 10, "yardages": {"blue": 370, "white": 350, "red": 315}},
    {"number": 11, "par": 4, "strokeIndex": 4, "yardages": {"blue": 430, "white": 410, "red": 375}},
    {"number": 12, "par": 3, "strokeIndex": 16, "yardages": {"blue": 185, "white": 170, "red": 145}},
    {"number": 13, "par": 5, "strokeIndex": 8, "yardages": {"blue": 520, "white": 500, "red": 465}},
    {"number": 14, "par": 4, "strokeIndex": 2, "yardages": {"blue": 450, "white": 430, "red": 395}},
    {"number": 15, "par": 4, "strokeIndex": 12, "yardages": {"blue": 360, "white": 340, "red": 305}},
    {"number": 16, "par": 3, "strokeIndex": 18, "yardages": {"blue": 165, "white": 150, "red": 125}},
    {"number": 17, "par": 4, "strokeIndex": 6, "yardages": {"blue": 395, "white": 375, "red": 340}},
    {"number": 18, "par": 4, "strokeIndex": 14, "yardages": {"blue": 355, "white": 335, "red": 300}}
  ]'::jsonb,
  '[
    {"name": "Blue", "color": "blue", "courseRating": 73.0, "slopeRating": 136, "totalYardage": 6185},
    {"name": "White", "color": "white", "courseRating": 71.0, "slopeRating": 131, "totalYardage": 5845},
    {"name": "Red", "color": "red", "courseRating": 72.5, "slopeRating": 128, "totalYardage": 5355}
  ]'::jsonb
)
ON CONFLICT (venue_id, name) DO UPDATE SET
  description = EXCLUDED.description,
  slope_rating = EXCLUDED.slope_rating,
  course_rating = EXCLUDED.course_rating,
  holes = EXCLUDED.holes,
  tees = EXCLUDED.tees;

-- 13TH BEACH CREEK COURSE
INSERT INTO courses (venue_id, name, description, slope_rating, course_rating, holes, tees)
VALUES (
  'ea8a80e8-e302-4989-82d8-05fcf2076130',
  'Creek Course',
  'Parkland layout regularly compared to Melbourne''s best Sandbelt courses. Co-designed by Nick Faldo.',
  139,
  72.5,
  '[
    {"number": 1, "par": 4, "strokeIndex": 11, "yardages": {"blue": 375, "white": 355, "red": 320}},
    {"number": 2, "par": 4, "strokeIndex": 5, "yardages": {"blue": 415, "white": 395, "red": 360}},
    {"number": 3, "par": 3, "strokeIndex": 17, "yardages": {"blue": 165, "white": 150, "red": 125}},
    {"number": 4, "par": 5, "strokeIndex": 7, "yardages": {"blue": 505, "white": 485, "red": 450}},
    {"number": 5, "par": 4, "strokeIndex": 1, "yardages": {"blue": 440, "white": 420, "red": 385}},
    {"number": 6, "par": 4, "strokeIndex": 13, "yardages": {"blue": 355, "white": 335, "red": 300}},
    {"number": 7, "par": 3, "strokeIndex": 15, "yardages": {"blue": 175, "white": 160, "red": 135}},
    {"number": 8, "par": 4, "strokeIndex": 3, "yardages": {"blue": 425, "white": 405, "red": 370}},
    {"number": 9, "par": 5, "strokeIndex": 9, "yardages": {"blue": 510, "white": 490, "red": 455}},
    {"number": 10, "par": 4, "strokeIndex": 10, "yardages": {"blue": 365, "white": 345, "red": 310}},
    {"number": 11, "par": 4, "strokeIndex": 4, "yardages": {"blue": 420, "white": 400, "red": 365}},
    {"number": 12, "par": 3, "strokeIndex": 16, "yardages": {"blue": 180, "white": 165, "red": 140}},
    {"number": 13, "par": 5, "strokeIndex": 8, "yardages": {"blue": 515, "white": 495, "red": 460}},
    {"number": 14, "par": 4, "strokeIndex": 2, "yardages": {"blue": 445, "white": 425, "red": 390}},
    {"number": 15, "par": 4, "strokeIndex": 12, "yardages": {"blue": 355, "white": 335, "red": 300}},
    {"number": 16, "par": 3, "strokeIndex": 18, "yardages": {"blue": 155, "white": 140, "red": 115}},
    {"number": 17, "par": 4, "strokeIndex": 6, "yardages": {"blue": 390, "white": 370, "red": 335}},
    {"number": 18, "par": 4, "strokeIndex": 14, "yardages": {"blue": 345, "white": 325, "red": 290}}
  ]'::jsonb,
  '[
    {"name": "Blue", "color": "blue", "courseRating": 72.5, "slopeRating": 139, "totalYardage": 6135},
    {"name": "White", "color": "white", "courseRating": 70.5, "slopeRating": 134, "totalYardage": 5795},
    {"name": "Red", "color": "red", "courseRating": 72.0, "slopeRating": 131, "totalYardage": 5305}
  ]'::jsonb
)
ON CONFLICT (venue_id, name) DO UPDATE SET
  description = EXCLUDED.description,
  slope_rating = EXCLUDED.slope_rating,
  course_rating = EXCLUDED.course_rating,
  holes = EXCLUDED.holes,
  tees = EXCLUDED.tees;

-- ST ANDREWS BEACH
INSERT INTO courses (venue_id, name, description, slope_rating, course_rating, holes, tees)
VALUES (
  'fa8c08b8-29c4-4445-af04-3bb82b6c817c',
  'St Andrews Beach',
  'Tom Doak''s first Australian mainland design. #1 public access course on Australian mainland. Includes Australia''s longest par-4.',
  139,
  71.0,
  '[
    {"number": 1, "par": 4, "strokeIndex": 9, "yardages": {"blue": 395, "white": 375, "red": 340}},
    {"number": 2, "par": 5, "strokeIndex": 5, "yardages": {"blue": 530, "white": 510, "red": 475}},
    {"number": 3, "par": 4, "strokeIndex": 1, "yardages": {"blue": 470, "white": 450, "red": 415}},
    {"number": 4, "par": 3, "strokeIndex": 15, "yardages": {"blue": 175, "white": 160, "red": 135}},
    {"number": 5, "par": 4, "strokeIndex": 7, "yardages": {"blue": 415, "white": 395, "red": 360}},
    {"number": 6, "par": 4, "strokeIndex": 11, "yardages": {"blue": 365, "white": 345, "red": 310}},
    {"number": 7, "par": 3, "strokeIndex": 17, "yardages": {"blue": 155, "white": 140, "red": 115}},
    {"number": 8, "par": 5, "strokeIndex": 13, "yardages": {"blue": 515, "white": 495, "red": 460}},
    {"number": 9, "par": 4, "strokeIndex": 3, "yardages": {"blue": 445, "white": 425, "red": 390}},
    {"number": 10, "par": 4, "strokeIndex": 10, "yardages": {"blue": 380, "white": 360, "red": 325}},
    {"number": 11, "par": 3, "strokeIndex": 16, "yardages": {"blue": 185, "white": 170, "red": 145}},
    {"number": 12, "par": 5, "strokeIndex": 8, "yardages": {"blue": 525, "white": 505, "red": 470}},
    {"number": 13, "par": 4, "strokeIndex": 2, "yardages": {"blue": 455, "white": 435, "red": 400}},
    {"number": 14, "par": 4, "strokeIndex": 12, "yardages": {"blue": 370, "white": 350, "red": 315}},
    {"number": 15, "par": 3, "strokeIndex": 18, "yardages": {"blue": 165, "white": 150, "red": 125}},
    {"number": 16, "par": 4, "strokeIndex": 6, "yardages": {"blue": 405, "white": 385, "red": 350}},
    {"number": 17, "par": 4, "strokeIndex": 14, "yardages": {"blue": 350, "white": 330, "red": 295}},
    {"number": 18, "par": 4, "strokeIndex": 4, "yardages": {"blue": 430, "white": 410, "red": 375}}
  ]'::jsonb,
  '[
    {"name": "Blue", "color": "blue", "courseRating": 71.0, "slopeRating": 139, "totalYardage": 6330},
    {"name": "White", "color": "white", "courseRating": 69.0, "slopeRating": 134, "totalYardage": 5990},
    {"name": "Red", "color": "red", "courseRating": 70.5, "slopeRating": 131, "totalYardage": 5500}
  ]'::jsonb
)
ON CONFLICT (venue_id, name) DO UPDATE SET
  description = EXCLUDED.description,
  slope_rating = EXCLUDED.slope_rating,
  course_rating = EXCLUDED.course_rating,
  holes = EXCLUDED.holes,
  tees = EXCLUDED.tees;

-- =====================================================
-- STEP 3: UPDATE CURRENT-COURSES.JSON REFERENCE
-- Note: This is a reminder - the JSON file should be
-- regenerated from the database after running this migration
-- =====================================================

-- =====================================================
-- MIGRATION COMPLETE
-- =====================================================
