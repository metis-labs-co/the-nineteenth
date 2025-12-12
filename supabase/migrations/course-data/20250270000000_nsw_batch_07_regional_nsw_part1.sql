-- =====================================================
-- Migration: nsw_batch_07_regional_nsw_part1
-- Description: Add Regional NSW golf venues and courses (Part 1)
--              Illawarra, South Coast, Southern Highlands
-- Date: 2025-12-11
-- Batch: 7a of 7 (Regional NSW - Part 1)
-- =====================================================

-- =====================================================
-- ILLAWARRA REGION
-- =====================================================

-- Wollongong Golf Club (Ross Watson design, 1897)
INSERT INTO venues (id, source, name, state, city, address, phone, website, total_holes)
VALUES (
  'f2a3b4c5-d6e7-8901-abcd-400000000701',
  'manual',
  'Wollongong Golf Club',
  'NSW',
  'Wollongong',
  'Corrimal Street, Wollongong NSW 2500',
  '+61 2 4228 3811',
  'https://www.wollongonggolf.com.au',
  18
)
ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name,
  address = EXCLUDED.address,
  phone = EXCLUDED.phone,
  website = EXCLUDED.website;

INSERT INTO courses (venue_id, name, description, slope_rating, course_rating, holes, tees)
VALUES (
  'f2a3b4c5-d6e7-8901-abcd-400000000701',
  'Wollongong',
  'Historic links-style course designed by Ross Watson, opened in 1897. Par 70 layout featuring five par 3s and five par 5s. Ocean views and coastal breezes make this a challenging round.',
  125,
  70.0,
  '[
    {"number": 1, "par": 5, "strokeIndex": 1, "yardages": {"black": 472}},
    {"number": 2, "par": 4, "strokeIndex": 3, "yardages": {"black": 349}},
    {"number": 3, "par": 3, "strokeIndex": 5, "yardages": {"black": 209}},
    {"number": 4, "par": 4, "strokeIndex": 7, "yardages": {"black": 288}},
    {"number": 5, "par": 3, "strokeIndex": 9, "yardages": {"black": 162}},
    {"number": 6, "par": 4, "strokeIndex": 11, "yardages": {"black": 330}},
    {"number": 7, "par": 4, "strokeIndex": 13, "yardages": {"black": 380}},
    {"number": 8, "par": 3, "strokeIndex": 15, "yardages": {"black": 168}},
    {"number": 9, "par": 5, "strokeIndex": 17, "yardages": {"black": 455}},
    {"number": 10, "par": 3, "strokeIndex": 2, "yardages": {"black": 132}},
    {"number": 11, "par": 4, "strokeIndex": 4, "yardages": {"black": 259}},
    {"number": 12, "par": 3, "strokeIndex": 6, "yardages": {"black": 174}},
    {"number": 13, "par": 4, "strokeIndex": 8, "yardages": {"black": 420}},
    {"number": 14, "par": 5, "strokeIndex": 10, "yardages": {"black": 519}},
    {"number": 15, "par": 4, "strokeIndex": 12, "yardages": {"black": 343}},
    {"number": 16, "par": 4, "strokeIndex": 14, "yardages": {"black": 393}},
    {"number": 17, "par": 3, "strokeIndex": 16, "yardages": {"black": 130}},
    {"number": 18, "par": 5, "strokeIndex": 18, "yardages": {"black": 508}}
  ]'::jsonb,
  '[
    {"name": "Black", "color": "black", "courseRating": 70.0, "slopeRating": 125, "totalYardage": 5691}
  ]'::jsonb
)
ON CONFLICT (venue_id, name) DO UPDATE SET
  description = EXCLUDED.description,
  slope_rating = EXCLUDED.slope_rating,
  course_rating = EXCLUDED.course_rating,
  holes = EXCLUDED.holes,
  tees = EXCLUDED.tees;

-- Kiama Golf Club
INSERT INTO venues (id, source, name, state, city, address, phone, website, total_holes)
VALUES (
  'f2a3b4c5-d6e7-8901-abcd-400000000702',
  'manual',
  'Kiama Golf Club',
  'NSW',
  'Kiama Downs',
  'Princes Highway, Kiama Downs NSW 2533',
  '+61 2 4237 5153',
  'https://www.kiamagolf.com.au',
  18
)
ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name,
  address = EXCLUDED.address,
  phone = EXCLUDED.phone,
  website = EXCLUDED.website;

INSERT INTO courses (venue_id, name, description, slope_rating, course_rating, holes, tees)
VALUES (
  'f2a3b4c5-d6e7-8901-abcd-400000000702',
  'Kiama',
  'Parkland course near the scenic South Coast. Par 69 layout with seven par 3s. Open to visitors with stunning views of the escarpment.',
  120,
  65.0,
  '[
    {"number": 1, "par": 4, "strokeIndex": 2, "yardages": {"white": 393, "red": 347}},
    {"number": 2, "par": 4, "strokeIndex": 11, "yardages": {"white": 289, "red": 244}},
    {"number": 3, "par": 4, "strokeIndex": 13, "yardages": {"white": 298, "red": 262}},
    {"number": 4, "par": 3, "strokeIndex": 18, "yardages": {"white": 137, "red": 124}},
    {"number": 5, "par": 4, "strokeIndex": 3, "yardages": {"white": 372, "red": 328}},
    {"number": 6, "par": 3, "strokeIndex": 17, "yardages": {"white": 143, "red": 130}},
    {"number": 7, "par": 5, "strokeIndex": 5, "yardages": {"white": 499, "red": 432}},
    {"number": 8, "par": 4, "strokeIndex": 10, "yardages": {"white": 301, "red": 276}},
    {"number": 9, "par": 3, "strokeIndex": 7, "yardages": {"white": 175, "red": 152}},
    {"number": 10, "par": 4, "strokeIndex": 9, "yardages": {"white": 278, "red": 249}},
    {"number": 11, "par": 3, "strokeIndex": 16, "yardages": {"white": 144, "red": 135}},
    {"number": 12, "par": 5, "strokeIndex": 4, "yardages": {"white": 521, "red": 457}},
    {"number": 13, "par": 3, "strokeIndex": 12, "yardages": {"white": 185, "red": 166}},
    {"number": 14, "par": 3, "strokeIndex": 15, "yardages": {"white": 149, "red": 141}},
    {"number": 15, "par": 4, "strokeIndex": 1, "yardages": {"white": 400, "red": 362}},
    {"number": 16, "par": 3, "strokeIndex": 14, "yardages": {"white": 152, "red": 145}},
    {"number": 17, "par": 3, "strokeIndex": 8, "yardages": {"white": 195, "red": 173}},
    {"number": 18, "par": 4, "strokeIndex": 6, "yardages": {"white": 337, "red": 295}}
  ]'::jsonb,
  '[
    {"name": "White", "color": "white", "courseRating": 65.0, "slopeRating": 120, "totalYardage": 4968},
    {"name": "Red", "color": "red", "courseRating": 65.0, "slopeRating": 118, "totalYardage": 4418}
  ]'::jsonb
)
ON CONFLICT (venue_id, name) DO UPDATE SET
  description = EXCLUDED.description,
  slope_rating = EXCLUDED.slope_rating,
  course_rating = EXCLUDED.course_rating,
  holes = EXCLUDED.holes,
  tees = EXCLUDED.tees;

-- Port Kembla Golf Club
INSERT INTO venues (id, source, name, state, city, address, phone, website, total_holes)
VALUES (
  'f2a3b4c5-d6e7-8901-abcd-400000000703',
  'manual',
  'Port Kembla Golf Club',
  'NSW',
  'Primbee',
  'Primbee Road, Primbee NSW 2502',
  '+61 2 4274 1339',
  'https://www.portkemblagolf.com.au',
  18
)
ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name,
  address = EXCLUDED.address,
  phone = EXCLUDED.phone,
  website = EXCLUDED.website;

INSERT INTO courses (venue_id, name, description, slope_rating, course_rating, holes, tees)
VALUES (
  'f2a3b4c5-d6e7-8901-abcd-400000000703',
  'Port Kembla',
  'Parkland course near Lake Illawarra. Par 72 layout with four par 5s per nine. Well-maintained fairways and challenging bunkered greens.',
  120,
  71.0,
  '[
    {"number": 1, "par": 4, "strokeIndex": 18, "yardages": {"white": 343, "red": 325}},
    {"number": 2, "par": 4, "strokeIndex": 8, "yardages": {"white": 348, "red": 285}},
    {"number": 3, "par": 3, "strokeIndex": 12, "yardages": {"white": 175, "red": 149}},
    {"number": 4, "par": 4, "strokeIndex": 3, "yardages": {"white": 420, "red": 410}},
    {"number": 5, "par": 5, "strokeIndex": 14, "yardages": {"white": 513, "red": 442}},
    {"number": 6, "par": 4, "strokeIndex": 6, "yardages": {"white": 332, "red": 292}},
    {"number": 7, "par": 4, "strokeIndex": 10, "yardages": {"white": 276, "red": 261}},
    {"number": 8, "par": 3, "strokeIndex": 1, "yardages": {"white": 129, "red": 109}},
    {"number": 9, "par": 5, "strokeIndex": 16, "yardages": {"white": 514, "red": 424}},
    {"number": 10, "par": 4, "strokeIndex": 5, "yardages": {"white": 324, "red": 290}},
    {"number": 11, "par": 4, "strokeIndex": 11, "yardages": {"white": 365, "red": 320}},
    {"number": 12, "par": 3, "strokeIndex": 2, "yardages": {"white": 154, "red": 143}},
    {"number": 13, "par": 4, "strokeIndex": 15, "yardages": {"white": 408, "red": 301}},
    {"number": 14, "par": 5, "strokeIndex": 7, "yardages": {"white": 510, "red": 441}},
    {"number": 15, "par": 3, "strokeIndex": 13, "yardages": {"white": 180, "red": 129}},
    {"number": 16, "par": 4, "strokeIndex": 4, "yardages": {"white": 323, "red": 272}},
    {"number": 17, "par": 4, "strokeIndex": 17, "yardages": {"white": 367, "red": 367}},
    {"number": 18, "par": 5, "strokeIndex": 9, "yardages": {"white": 482, "red": 425}}
  ]'::jsonb,
  '[
    {"name": "White", "color": "white", "courseRating": 71.0, "slopeRating": 120, "totalYardage": 6163},
    {"name": "Red", "color": "red", "courseRating": 74.0, "slopeRating": 126, "totalYardage": 5385}
  ]'::jsonb
)
ON CONFLICT (venue_id, name) DO UPDATE SET
  description = EXCLUDED.description,
  slope_rating = EXCLUDED.slope_rating,
  course_rating = EXCLUDED.course_rating,
  holes = EXCLUDED.holes,
  tees = EXCLUDED.tees;

-- =====================================================
-- SOUTH COAST REGION
-- =====================================================

-- Narooma Golf Club
INSERT INTO venues (id, source, name, state, city, address, phone, website, total_holes)
VALUES (
  'f2a3b4c5-d6e7-8901-abcd-400000000704',
  'manual',
  'Narooma Golf Club',
  'NSW',
  'Narooma',
  'Ballingalla Street, Narooma NSW 2546',
  '+61 2 4476 2522',
  'https://www.naroomagolfclub.com.au',
  18
)
ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name,
  address = EXCLUDED.address,
  phone = EXCLUDED.phone,
  website = EXCLUDED.website;

INSERT INTO courses (venue_id, name, description, slope_rating, course_rating, holes, tees)
VALUES (
  'f2a3b4c5-d6e7-8901-abcd-400000000704',
  'Narooma',
  'Parkland course with stunning coastal views on the Sapphire Coast. Par 72 layout featuring four par 5s. Known for its pristine fairways and welcoming atmosphere.',
  125,
  72.0,
  '[
    {"number": 1, "par": 4, "strokeIndex": 18, "yardages": {"blue": 398, "white": 393, "red": 358}},
    {"number": 2, "par": 4, "strokeIndex": 8, "yardages": {"blue": 330, "white": 330, "red": 247}},
    {"number": 3, "par": 3, "strokeIndex": 12, "yardages": {"blue": 141, "white": 132, "red": 109}},
    {"number": 4, "par": 4, "strokeIndex": 3, "yardages": {"blue": 368, "white": 360, "red": 313}},
    {"number": 5, "par": 5, "strokeIndex": 14, "yardages": {"blue": 458, "white": 448, "red": 436}},
    {"number": 6, "par": 4, "strokeIndex": 6, "yardages": {"blue": 311, "white": 301, "red": 291}},
    {"number": 7, "par": 4, "strokeIndex": 10, "yardages": {"blue": 424, "white": 416, "red": 389}},
    {"number": 8, "par": 4, "strokeIndex": 1, "yardages": {"blue": 317, "white": 308, "red": 226}},
    {"number": 9, "par": 3, "strokeIndex": 16, "yardages": {"blue": 193, "white": 184, "red": 144}},
    {"number": 10, "par": 4, "strokeIndex": 5, "yardages": {"blue": 320, "white": 310, "red": 250}},
    {"number": 11, "par": 5, "strokeIndex": 11, "yardages": {"blue": 460, "white": 448, "red": 402}},
    {"number": 12, "par": 4, "strokeIndex": 2, "yardages": {"blue": 333, "white": 323, "red": 280}},
    {"number": 13, "par": 4, "strokeIndex": 15, "yardages": {"blue": 369, "white": 360, "red": 319}},
    {"number": 14, "par": 3, "strokeIndex": 7, "yardages": {"blue": 169, "white": 162, "red": 160}},
    {"number": 15, "par": 4, "strokeIndex": 13, "yardages": {"blue": 344, "white": 325, "red": 296}},
    {"number": 16, "par": 5, "strokeIndex": 4, "yardages": {"blue": 427, "white": 424, "red": 401}},
    {"number": 17, "par": 3, "strokeIndex": 17, "yardages": {"blue": 129, "white": 121, "red": 120}},
    {"number": 18, "par": 5, "strokeIndex": 9, "yardages": {"blue": 450, "white": 445, "red": 411}}
  ]'::jsonb,
  '[
    {"name": "Blue", "color": "blue", "courseRating": 72.0, "slopeRating": 125, "totalYardage": 5941},
    {"name": "White", "color": "white", "courseRating": 71.0, "slopeRating": 123, "totalYardage": 5790},
    {"name": "Red", "color": "red", "courseRating": 72.0, "slopeRating": 124, "totalYardage": 5152}
  ]'::jsonb
)
ON CONFLICT (venue_id, name) DO UPDATE SET
  description = EXCLUDED.description,
  slope_rating = EXCLUDED.slope_rating,
  course_rating = EXCLUDED.course_rating,
  holes = EXCLUDED.holes,
  tees = EXCLUDED.tees;

-- Nowra Golf Club
INSERT INTO venues (id, source, name, state, city, address, phone, website, total_holes)
VALUES (
  'f2a3b4c5-d6e7-8901-abcd-400000000705',
  'manual',
  'Nowra Golf Club',
  'NSW',
  'North Nowra',
  'Hawthorn Avenue, North Nowra NSW 2541',
  '+61 2 4421 2677',
  'https://www.nowragolfclub.com.au',
  18
)
ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name,
  address = EXCLUDED.address,
  phone = EXCLUDED.phone,
  website = EXCLUDED.website;

INSERT INTO courses (venue_id, name, description, slope_rating, course_rating, holes, tees)
VALUES (
  'f2a3b4c5-d6e7-8901-abcd-400000000705',
  'Nowra',
  'Parkland course in the Shoalhaven region. Par 68 layout with only one par 5 and five par 3s. Short but challenging with tight fairways.',
  124,
  67.0,
  '[
    {"number": 1, "par": 4, "strokeIndex": 7, "yardages": {"blue": 330, "red": 327}},
    {"number": 2, "par": 4, "strokeIndex": 9, "yardages": {"blue": 303, "red": 303}},
    {"number": 3, "par": 4, "strokeIndex": 15, "yardages": {"blue": 295, "red": 295}},
    {"number": 4, "par": 3, "strokeIndex": 10, "yardages": {"blue": 141, "red": 131}},
    {"number": 5, "par": 4, "strokeIndex": 4, "yardages": {"blue": 337, "red": 336}},
    {"number": 6, "par": 4, "strokeIndex": 2, "yardages": {"blue": 361, "red": 361}},
    {"number": 7, "par": 4, "strokeIndex": 17, "yardages": {"blue": 302, "red": 300}},
    {"number": 8, "par": 3, "strokeIndex": 18, "yardages": {"blue": 101, "red": 101}},
    {"number": 9, "par": 4, "strokeIndex": 12, "yardages": {"blue": 331, "red": 331}},
    {"number": 10, "par": 4, "strokeIndex": 14, "yardages": {"blue": 307, "red": 301}},
    {"number": 11, "par": 4, "strokeIndex": 11, "yardages": {"blue": 310, "red": 310}},
    {"number": 12, "par": 3, "strokeIndex": 6, "yardages": {"blue": 170, "red": 167}},
    {"number": 13, "par": 4, "strokeIndex": 16, "yardages": {"blue": 289, "red": 281}},
    {"number": 14, "par": 5, "strokeIndex": 8, "yardages": {"blue": 495, "red": 422}},
    {"number": 15, "par": 4, "strokeIndex": 1, "yardages": {"blue": 408, "red": 406}},
    {"number": 16, "par": 3, "strokeIndex": 13, "yardages": {"blue": 153, "red": 147}},
    {"number": 17, "par": 3, "strokeIndex": 3, "yardages": {"blue": 202, "red": 200}},
    {"number": 18, "par": 4, "strokeIndex": 5, "yardages": {"blue": 331, "red": 331}}
  ]'::jsonb,
  '[
    {"name": "Blue", "color": "blue", "courseRating": 67.0, "slopeRating": 124, "totalYardage": 5166},
    {"name": "Red", "color": "red", "courseRating": 73.0, "slopeRating": 129, "totalYardage": 5050}
  ]'::jsonb
)
ON CONFLICT (venue_id, name) DO UPDATE SET
  description = EXCLUDED.description,
  slope_rating = EXCLUDED.slope_rating,
  course_rating = EXCLUDED.course_rating,
  holes = EXCLUDED.holes,
  tees = EXCLUDED.tees;

-- Bega Country Club
INSERT INTO venues (id, source, name, state, city, address, phone, website, total_holes)
VALUES (
  'f2a3b4c5-d6e7-8901-abcd-400000000706',
  'manual',
  'Bega Country Club',
  'NSW',
  'Bega',
  'Kirkland Avenue, Bega NSW 2550',
  '+61 2 6492 2187',
  'https://www.begacountryclub.com.au',
  18
)
ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name,
  address = EXCLUDED.address,
  phone = EXCLUDED.phone,
  website = EXCLUDED.website;

INSERT INTO courses (venue_id, name, description, slope_rating, course_rating, holes, tees)
VALUES (
  'f2a3b4c5-d6e7-8901-abcd-400000000706',
  'Bega',
  'Parkland course opened in 1969 in the Bega Valley. Par 72 layout with four par 5s and five par 3s. Well-maintained with tree-lined fairways.',
  125,
  70.2,
  '[
    {"number": 1, "par": 5, "strokeIndex": 8, "yardages": {"blue": 459, "white": 447, "red": 459, "yellow": 447}},
    {"number": 2, "par": 4, "strokeIndex": 3, "yardages": {"blue": 354, "white": 319, "red": 319, "yellow": 309}},
    {"number": 3, "par": 5, "strokeIndex": 16, "yardages": {"blue": 426, "white": 379, "red": 406, "yellow": 364}},
    {"number": 4, "par": 4, "strokeIndex": 1, "yardages": {"blue": 408, "white": 369, "red": 364, "yellow": 352}},
    {"number": 5, "par": 4, "strokeIndex": 7, "yardages": {"blue": 347, "white": 328, "red": 278, "yellow": 271}},
    {"number": 6, "par": 4, "strokeIndex": 10, "yardages": {"blue": 304, "white": 293, "red": 302, "yellow": 293}},
    {"number": 7, "par": 3, "strokeIndex": 9, "yardages": {"blue": 182, "white": 160, "red": 140, "yellow": 140}},
    {"number": 8, "par": 4, "strokeIndex": 2, "yardages": {"blue": 373, "white": 302, "red": 302, "yellow": 294}},
    {"number": 9, "par": 3, "strokeIndex": 11, "yardages": {"blue": 176, "white": 155, "red": 136, "yellow": 129}},
    {"number": 10, "par": 4, "strokeIndex": 17, "yardages": {"blue": 311, "white": 307, "red": 311, "yellow": 303}},
    {"number": 11, "par": 4, "strokeIndex": 18, "yardages": {"blue": 420, "white": 417, "red": 278, "yellow": 271}},
    {"number": 12, "par": 3, "strokeIndex": 14, "yardages": {"blue": 142, "white": 129, "red": 134, "yellow": 124}},
    {"number": 13, "par": 4, "strokeIndex": 4, "yardages": {"blue": 369, "white": 360, "red": 293, "yellow": 247}},
    {"number": 14, "par": 5, "strokeIndex": 5, "yardages": {"blue": 442, "white": 432, "red": 392, "yellow": 383}},
    {"number": 15, "par": 3, "strokeIndex": 6, "yardages": {"blue": 173, "white": 165, "red": 119, "yellow": 119}},
    {"number": 16, "par": 5, "strokeIndex": 15, "yardages": {"blue": 446, "white": 432, "red": 441, "yellow": 421}},
    {"number": 17, "par": 4, "strokeIndex": 13, "yardages": {"blue": 301, "white": 298, "red": 295, "yellow": 287}},
    {"number": 18, "par": 3, "strokeIndex": 12, "yardages": {"blue": 180, "white": 149, "red": 163, "yellow": 153}}
  ]'::jsonb,
  '[
    {"name": "Blue", "color": "blue", "courseRating": 72.0, "slopeRating": 128, "totalYardage": 5813},
    {"name": "White", "color": "white", "courseRating": 70.2, "slopeRating": 125, "totalYardage": 5441},
    {"name": "Red", "color": "red", "courseRating": 71.0, "slopeRating": 124, "totalYardage": 5132},
    {"name": "Yellow", "color": "yellow", "courseRating": 69.0, "slopeRating": 122, "totalYardage": 4907}
  ]'::jsonb
)
ON CONFLICT (venue_id, name) DO UPDATE SET
  description = EXCLUDED.description,
  slope_rating = EXCLUDED.slope_rating,
  course_rating = EXCLUDED.course_rating,
  holes = EXCLUDED.holes,
  tees = EXCLUDED.tees;

-- Moruya Golf Club
INSERT INTO venues (id, source, name, state, city, address, phone, website, total_holes)
VALUES (
  'f2a3b4c5-d6e7-8901-abcd-400000000707',
  'manual',
  'Moruya Golf Club',
  'NSW',
  'Moruya',
  'Church Street, Moruya NSW 2537',
  '+61 2 4474 2266',
  'https://www.moruyagolf.com.au',
  18
)
ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name,
  address = EXCLUDED.address,
  phone = EXCLUDED.phone,
  website = EXCLUDED.website;

INSERT INTO courses (venue_id, name, description, slope_rating, course_rating, holes, tees)
VALUES (
  'f2a3b4c5-d6e7-8901-abcd-400000000707',
  'Moruya',
  'Parkland course on the Eurobodalla coast. Par 71 layout with five tee options. Tree-lined fairways and well-bunkered greens provide a good challenge.',
  122,
  71.0,
  '[
    {"number": 1, "par": 5, "strokeIndex": 5, "yardages": {"blue": 485, "white": 466, "black": 424}},
    {"number": 2, "par": 4, "strokeIndex": 7, "yardages": {"blue": 349, "white": 333, "black": 303}},
    {"number": 3, "par": 4, "strokeIndex": 1, "yardages": {"blue": 387, "white": 382, "black": 336}},
    {"number": 4, "par": 4, "strokeIndex": 11, "yardages": {"blue": 295, "white": 284, "black": 270}},
    {"number": 5, "par": 3, "strokeIndex": 18, "yardages": {"blue": 122, "white": 110, "black": 96}},
    {"number": 6, "par": 3, "strokeIndex": 15, "yardages": {"blue": 178, "white": 164, "black": 120}},
    {"number": 7, "par": 4, "strokeIndex": 3, "yardages": {"blue": 350, "white": 333, "black": 257}},
    {"number": 8, "par": 5, "strokeIndex": 13, "yardages": {"blue": 468, "white": 443, "black": 405}},
    {"number": 9, "par": 4, "strokeIndex": 9, "yardages": {"blue": 370, "white": 366, "black": 305}},
    {"number": 10, "par": 3, "strokeIndex": 16, "yardages": {"blue": 123, "white": 119, "black": 106}},
    {"number": 11, "par": 4, "strokeIndex": 4, "yardages": {"blue": 349, "white": 338, "black": 318}},
    {"number": 12, "par": 3, "strokeIndex": 14, "yardages": {"blue": 158, "white": 148, "black": 110}},
    {"number": 13, "par": 4, "strokeIndex": 17, "yardages": {"blue": 292, "white": 285, "black": 277}},
    {"number": 14, "par": 4, "strokeIndex": 10, "yardages": {"blue": 318, "white": 312, "black": 278}},
    {"number": 15, "par": 4, "strokeIndex": 6, "yardages": {"blue": 319, "white": 313, "black": 297}},
    {"number": 16, "par": 5, "strokeIndex": 12, "yardages": {"blue": 448, "white": 436, "black": 396}},
    {"number": 17, "par": 4, "strokeIndex": 2, "yardages": {"blue": 385, "white": 375, "black": 366}},
    {"number": 18, "par": 4, "strokeIndex": 8, "yardages": {"blue": 338, "white": 334, "black": 275}}
  ]'::jsonb,
  '[
    {"name": "Blue", "color": "blue", "courseRating": 71.0, "slopeRating": 122, "totalYardage": 5734},
    {"name": "White", "color": "white", "courseRating": 70.0, "slopeRating": 120, "totalYardage": 5541},
    {"name": "Black", "color": "black", "courseRating": 68.0, "slopeRating": 116, "totalYardage": 4939}
  ]'::jsonb
)
ON CONFLICT (venue_id, name) DO UPDATE SET
  description = EXCLUDED.description,
  slope_rating = EXCLUDED.slope_rating,
  course_rating = EXCLUDED.course_rating,
  holes = EXCLUDED.holes,
  tees = EXCLUDED.tees;

-- Tura Beach Country Club
INSERT INTO venues (id, source, name, state, city, address, phone, website, total_holes)
VALUES (
  'f2a3b4c5-d6e7-8901-abcd-400000000708',
  'manual',
  'Tura Beach Country Club',
  'NSW',
  'Tura Beach',
  'The Fairway, Tura Beach NSW 2548',
  '+61 2 6495 9002',
  'https://www.turabeachcc.com.au',
  18
)
ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name,
  address = EXCLUDED.address,
  phone = EXCLUDED.phone,
  website = EXCLUDED.website;

INSERT INTO courses (venue_id, name, description, slope_rating, course_rating, holes, tees)
VALUES (
  'f2a3b4c5-d6e7-8901-abcd-400000000708',
  'Tura Beach',
  'Parkland course designed by Michael Wolveridge, opened 1982. Par 73 layout with six par 5s. Stunning coastal setting near Merimbula.',
  124,
  71.0,
  '[
    {"number": 1, "par": 4, "strokeIndex": 6, "yardages": {"men": 336, "ladies": 277}},
    {"number": 2, "par": 5, "strokeIndex": 14, "yardages": {"men": 467, "ladies": 413}},
    {"number": 3, "par": 3, "strokeIndex": 8, "yardages": {"men": 181, "ladies": 123}},
    {"number": 4, "par": 5, "strokeIndex": 12, "yardages": {"men": 474, "ladies": 410}},
    {"number": 5, "par": 3, "strokeIndex": 4, "yardages": {"men": 181, "ladies": 157}},
    {"number": 6, "par": 5, "strokeIndex": 10, "yardages": {"men": 470, "ladies": 421}},
    {"number": 7, "par": 4, "strokeIndex": 2, "yardages": {"men": 368, "ladies": 328}},
    {"number": 8, "par": 4, "strokeIndex": 16, "yardages": {"men": 304, "ladies": 273}},
    {"number": 9, "par": 3, "strokeIndex": 18, "yardages": {"men": 151, "ladies": 122}},
    {"number": 10, "par": 4, "strokeIndex": 3, "yardages": {"men": 361, "ladies": 305}},
    {"number": 11, "par": 5, "strokeIndex": 9, "yardages": {"men": 470, "ladies": 416}},
    {"number": 12, "par": 4, "strokeIndex": 11, "yardages": {"men": 339, "ladies": 299}},
    {"number": 13, "par": 3, "strokeIndex": 13, "yardages": {"men": 163, "ladies": 107}},
    {"number": 14, "par": 4, "strokeIndex": 1, "yardages": {"men": 377, "ladies": 325}},
    {"number": 15, "par": 4, "strokeIndex": 5, "yardages": {"men": 320, "ladies": 300}},
    {"number": 16, "par": 5, "strokeIndex": 17, "yardages": {"men": 463, "ladies": 449}},
    {"number": 17, "par": 3, "strokeIndex": 7, "yardages": {"men": 166, "ladies": 132}},
    {"number": 18, "par": 5, "strokeIndex": 15, "yardages": {"men": 425, "ladies": 382}}
  ]'::jsonb,
  '[
    {"name": "Men", "color": "blue", "courseRating": 71.0, "slopeRating": 124, "totalYardage": 6016},
    {"name": "Ladies", "color": "red", "courseRating": 73.0, "slopeRating": 126, "totalYardage": 5239}
  ]'::jsonb
)
ON CONFLICT (venue_id, name) DO UPDATE SET
  description = EXCLUDED.description,
  slope_rating = EXCLUDED.slope_rating,
  course_rating = EXCLUDED.course_rating,
  holes = EXCLUDED.holes,
  tees = EXCLUDED.tees;

-- Tathra Beach Country Club
INSERT INTO venues (id, source, name, state, city, address, phone, website, total_holes)
VALUES (
  'f2a3b4c5-d6e7-8901-abcd-400000000709',
  'manual',
  'Tathra Beach Country Club',
  'NSW',
  'Tathra',
  'Andy Poole Drive, Tathra NSW 2550',
  '+61 2 6494 1302',
  'https://www.tathrabeachcc.com.au',
  18
)
ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name,
  address = EXCLUDED.address,
  phone = EXCLUDED.phone,
  website = EXCLUDED.website;

INSERT INTO courses (venue_id, name, description, slope_rating, course_rating, holes, tees)
VALUES (
  'f2a3b4c5-d6e7-8901-abcd-400000000709',
  'Tathra Beach',
  'Parkland course on the Sapphire Coast. Par 71 layout with ocean glimpses and native bushland. Well-maintained greens and challenging layout.',
  124,
  71.0,
  '[
    {"number": 1, "par": 4, "strokeIndex": 10, "yardages": {"blue": 340, "yellow": 338, "red": 358}},
    {"number": 2, "par": 5, "strokeIndex": 3, "yardages": {"blue": 501, "yellow": 465, "red": 321}},
    {"number": 3, "par": 3, "strokeIndex": 12, "yardages": {"blue": 168, "yellow": 162, "red": 152}},
    {"number": 4, "par": 4, "strokeIndex": 17, "yardages": {"blue": 328, "yellow": 279, "red": 305}},
    {"number": 5, "par": 4, "strokeIndex": 1, "yardages": {"blue": 385, "yellow": 382, "red": 349}},
    {"number": 6, "par": 4, "strokeIndex": 5, "yardages": {"blue": 370, "yellow": 362, "red": 314}},
    {"number": 7, "par": 5, "strokeIndex": 16, "yardages": {"blue": 448, "yellow": 414, "red": 122}},
    {"number": 8, "par": 4, "strokeIndex": 7, "yardages": {"blue": 330, "yellow": 279, "red": 283}},
    {"number": 9, "par": 3, "strokeIndex": 13, "yardages": {"blue": 153, "yellow": 150, "red": 390}},
    {"number": 10, "par": 4, "strokeIndex": 6, "yardages": {"blue": 348, "yellow": 339, "red": 404}},
    {"number": 11, "par": 5, "strokeIndex": 11, "yardages": {"blue": 470, "yellow": 324, "red": 344}},
    {"number": 12, "par": 3, "strokeIndex": 15, "yardages": {"blue": 158, "yellow": 155, "red": 110}},
    {"number": 13, "par": 4, "strokeIndex": 14, "yardages": {"blue": 346, "yellow": 301, "red": 290}},
    {"number": 14, "par": 3, "strokeIndex": 18, "yardages": {"blue": 143, "yellow": 136, "red": 321}},
    {"number": 15, "par": 5, "strokeIndex": 9, "yardages": {"blue": 487, "yellow": 382, "red": 319}},
    {"number": 16, "par": 4, "strokeIndex": 2, "yardages": {"blue": 380, "yellow": 380, "red": 138}},
    {"number": 17, "par": 4, "strokeIndex": 4, "yardages": {"blue": 367, "yellow": 357, "red": 418}},
    {"number": 18, "par": 3, "strokeIndex": 8, "yardages": {"blue": 159, "yellow": 118, "red": 299}}
  ]'::jsonb,
  '[
    {"name": "Blue", "color": "blue", "courseRating": 71.0, "slopeRating": 124, "totalYardage": 5881},
    {"name": "Yellow", "color": "yellow", "courseRating": 74.0, "slopeRating": 130, "totalYardage": 5323},
    {"name": "Red", "color": "red", "courseRating": 72.0, "slopeRating": 109, "totalYardage": 5237}
  ]'::jsonb
)
ON CONFLICT (venue_id, name) DO UPDATE SET
  description = EXCLUDED.description,
  slope_rating = EXCLUDED.slope_rating,
  course_rating = EXCLUDED.course_rating,
  holes = EXCLUDED.holes,
  tees = EXCLUDED.tees;

-- Bermagui Country Club
INSERT INTO venues (id, source, name, state, city, address, phone, website, total_holes)
VALUES (
  'f2a3b4c5-d6e7-8901-abcd-400000000710',
  'manual',
  'Bermagui Country Club',
  'NSW',
  'Bermagui',
  'Tuross Street, Bermagui NSW 2546',
  '+61 2 6493 4358',
  'https://www.bermaguicountryclub.com.au',
  18
)
ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name,
  address = EXCLUDED.address,
  phone = EXCLUDED.phone,
  website = EXCLUDED.website;

INSERT INTO courses (venue_id, name, description, slope_rating, course_rating, holes, tees)
VALUES (
  'f2a3b4c5-d6e7-8901-abcd-400000000710',
  'Bermagui',
  'Parkland course opened in 1891, one of the oldest in the region. Par 72 layout with stunning coastal scenery. Features mature trees and well-maintained fairways.',
  122,
  72.0,
  '[
    {"number": 1, "par": 4, "strokeIndex": 1, "yardages": {"blue": 397, "white": 330}},
    {"number": 2, "par": 5, "strokeIndex": 3, "yardages": {"blue": 437, "white": 397}},
    {"number": 3, "par": 4, "strokeIndex": 5, "yardages": {"blue": 375, "white": 335}},
    {"number": 4, "par": 4, "strokeIndex": 7, "yardages": {"blue": 387, "white": 350}},
    {"number": 5, "par": 4, "strokeIndex": 9, "yardages": {"blue": 361, "white": 325}},
    {"number": 6, "par": 3, "strokeIndex": 11, "yardages": {"blue": 178, "white": 135}},
    {"number": 7, "par": 4, "strokeIndex": 13, "yardages": {"blue": 387, "white": 275}},
    {"number": 8, "par": 3, "strokeIndex": 15, "yardages": {"blue": 177, "white": 130}},
    {"number": 9, "par": 5, "strokeIndex": 17, "yardages": {"blue": 437, "white": 404}},
    {"number": 10, "par": 4, "strokeIndex": 2, "yardages": {"blue": 349, "white": 324}},
    {"number": 11, "par": 3, "strokeIndex": 4, "yardages": {"blue": 141, "white": 120}},
    {"number": 12, "par": 4, "strokeIndex": 6, "yardages": {"blue": 379, "white": 371}},
    {"number": 13, "par": 4, "strokeIndex": 8, "yardages": {"blue": 352, "white": 293}},
    {"number": 14, "par": 4, "strokeIndex": 10, "yardages": {"blue": 330, "white": 291}},
    {"number": 15, "par": 3, "strokeIndex": 12, "yardages": {"blue": 164, "white": 152}},
    {"number": 16, "par": 5, "strokeIndex": 14, "yardages": {"blue": 471, "white": 408}},
    {"number": 17, "par": 4, "strokeIndex": 16, "yardages": {"blue": 316, "white": 309}},
    {"number": 18, "par": 5, "strokeIndex": 18, "yardages": {"blue": 447, "white": 381}}
  ]'::jsonb,
  '[
    {"name": "Blue", "color": "blue", "courseRating": 72.0, "slopeRating": 122, "totalYardage": 6085},
    {"name": "White", "color": "white", "courseRating": 73.0, "slopeRating": 124, "totalYardage": 5330}
  ]'::jsonb
)
ON CONFLICT (venue_id, name) DO UPDATE SET
  description = EXCLUDED.description,
  slope_rating = EXCLUDED.slope_rating,
  course_rating = EXCLUDED.course_rating,
  holes = EXCLUDED.holes,
  tees = EXCLUDED.tees;

-- =====================================================
-- SOUTHERN HIGHLANDS REGION
-- =====================================================

-- Bowral Golf Club (Established 1901)
INSERT INTO venues (id, source, name, state, city, address, phone, website, total_holes)
VALUES (
  'f2a3b4c5-d6e7-8901-abcd-400000000711',
  'manual',
  'Bowral Golf Club',
  'NSW',
  'Bowral',
  'Kangaloon Road, Bowral NSW 2576',
  '+61 2 4861 1042',
  'https://www.bowralgolf.com.au',
  18
)
ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name,
  address = EXCLUDED.address,
  phone = EXCLUDED.phone,
  website = EXCLUDED.website;

INSERT INTO courses (venue_id, name, description, slope_rating, course_rating, holes, tees)
VALUES (
  'f2a3b4c5-d6e7-8901-abcd-400000000711',
  'Bowral',
  'Historic parkland course established 1901 in the Southern Highlands. Par 69 layout featuring five par 3s and one par 5. Cooler highland climate provides excellent playing conditions.',
  118,
  69.0,
  '[
    {"number": 1, "par": 4, "strokeIndex": 17, "yardages": {"blue": 314, "white": 307, "red": 304}},
    {"number": 2, "par": 4, "strokeIndex": 7, "yardages": {"blue": 348, "white": 306, "red": 328}},
    {"number": 3, "par": 4, "strokeIndex": 5, "yardages": {"blue": 363, "white": 357, "red": 359}},
    {"number": 4, "par": 3, "strokeIndex": 3, "yardages": {"blue": 200, "white": 193, "red": 143}},
    {"number": 5, "par": 4, "strokeIndex": 1, "yardages": {"blue": 393, "white": 390, "red": 393}},
    {"number": 6, "par": 3, "strokeIndex": 9, "yardages": {"blue": 174, "white": 168, "red": 142}},
    {"number": 7, "par": 4, "strokeIndex": 15, "yardages": {"blue": 306, "white": 295, "red": 299}},
    {"number": 8, "par": 5, "strokeIndex": 11, "yardages": {"blue": 499, "white": 495, "red": 460}},
    {"number": 9, "par": 4, "strokeIndex": 13, "yardages": {"blue": 328, "white": 300, "red": 316}},
    {"number": 10, "par": 5, "strokeIndex": 12, "yardages": {"blue": 425, "white": 420, "red": 414}},
    {"number": 11, "par": 3, "strokeIndex": 8, "yardages": {"blue": 152, "white": 140, "red": 145}},
    {"number": 12, "par": 3, "strokeIndex": 6, "yardages": {"blue": 189, "white": 179, "red": 187}},
    {"number": 13, "par": 4, "strokeIndex": 18, "yardages": {"blue": 258, "white": 244, "red": 258}},
    {"number": 14, "par": 3, "strokeIndex": 14, "yardages": {"blue": 129, "white": 105, "red": 107}},
    {"number": 15, "par": 4, "strokeIndex": 16, "yardages": {"blue": 269, "white": 175, "red": 180}},
    {"number": 16, "par": 4, "strokeIndex": 10, "yardages": {"blue": 289, "white": 279, "red": 279}},
    {"number": 17, "par": 4, "strokeIndex": 4, "yardages": {"blue": 362, "white": 360, "red": 362}},
    {"number": 18, "par": 4, "strokeIndex": 2, "yardages": {"blue": 408, "white": 378, "red": 398}}
  ]'::jsonb,
  '[
    {"name": "Blue", "color": "blue", "courseRating": 69.0, "slopeRating": 118, "totalYardage": 5406},
    {"name": "White", "color": "white", "courseRating": 68.0, "slopeRating": 116, "totalYardage": 5091},
    {"name": "Red", "color": "red", "courseRating": 70.0, "slopeRating": 120, "totalYardage": 5074}
  ]'::jsonb
)
ON CONFLICT (venue_id, name) DO UPDATE SET
  description = EXCLUDED.description,
  slope_rating = EXCLUDED.slope_rating,
  course_rating = EXCLUDED.course_rating,
  holes = EXCLUDED.holes,
  tees = EXCLUDED.tees;

-- Goulburn Golf Club (Opened 1974)
INSERT INTO venues (id, source, name, state, city, address, phone, website, total_holes)
VALUES (
  'f2a3b4c5-d6e7-8901-abcd-400000000712',
  'manual',
  'Goulburn Golf Club',
  'NSW',
  'Goulburn',
  'Blackshaw Road, Goulburn NSW 2580',
  '+61 2 4821 3488',
  'https://www.goulburngolf.com.au',
  18
)
ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name,
  address = EXCLUDED.address,
  phone = EXCLUDED.phone,
  website = EXCLUDED.website;

INSERT INTO courses (venue_id, name, description, slope_rating, course_rating, holes, tees)
VALUES (
  'f2a3b4c5-d6e7-8901-abcd-400000000712',
  'Goulburn',
  'Parkland course opened 1974 in the historic city of Goulburn. Par 71 layout with four par 5s and five par 3s. Well-maintained with challenging greens.',
  117,
  70.0,
  '[
    {"number": 1, "par": 4, "strokeIndex": 14, "yardages": {"white": 305, "red": 283}},
    {"number": 2, "par": 5, "strokeIndex": 18, "yardages": {"white": 440, "red": 420}},
    {"number": 3, "par": 5, "strokeIndex": 8, "yardages": {"white": 495, "red": 392}},
    {"number": 4, "par": 4, "strokeIndex": 16, "yardages": {"white": 269, "red": 163}},
    {"number": 5, "par": 3, "strokeIndex": 6, "yardages": {"white": 188, "red": 227}},
    {"number": 6, "par": 4, "strokeIndex": 4, "yardages": {"white": 380, "red": 293}},
    {"number": 7, "par": 4, "strokeIndex": 2, "yardages": {"white": 400, "red": 320}},
    {"number": 8, "par": 3, "strokeIndex": 12, "yardages": {"white": 136, "red": 89}},
    {"number": 9, "par": 4, "strokeIndex": 10, "yardages": {"white": 305, "red": 305}},
    {"number": 10, "par": 4, "strokeIndex": 9, "yardages": {"white": 343, "red": 306}},
    {"number": 11, "par": 3, "strokeIndex": 13, "yardages": {"white": 160, "red": 102}},
    {"number": 12, "par": 5, "strokeIndex": 11, "yardages": {"white": 497, "red": 417}},
    {"number": 13, "par": 4, "strokeIndex": 7, "yardages": {"white": 320, "red": 311}},
    {"number": 14, "par": 4, "strokeIndex": 3, "yardages": {"white": 369, "red": 295}},
    {"number": 15, "par": 3, "strokeIndex": 15, "yardages": {"white": 138, "red": 124}},
    {"number": 16, "par": 5, "strokeIndex": 17, "yardages": {"white": 425, "red": 415}},
    {"number": 17, "par": 3, "strokeIndex": 5, "yardages": {"white": 198, "red": 132}},
    {"number": 18, "par": 4, "strokeIndex": 1, "yardages": {"white": 425, "red": 414}}
  ]'::jsonb,
  '[
    {"name": "White", "color": "white", "courseRating": 70.0, "slopeRating": 117, "totalYardage": 5793},
    {"name": "Red", "color": "red", "courseRating": 72.0, "slopeRating": 118, "totalYardage": 5008}
  ]'::jsonb
)
ON CONFLICT (venue_id, name) DO UPDATE SET
  description = EXCLUDED.description,
  slope_rating = EXCLUDED.slope_rating,
  course_rating = EXCLUDED.course_rating,
  holes = EXCLUDED.holes,
  tees = EXCLUDED.tees;

-- Moss Vale Golf Club (Established 1902)
INSERT INTO venues (id, source, name, state, city, address, phone, website, total_holes)
VALUES (
  'f2a3b4c5-d6e7-8901-abcd-400000000713',
  'manual',
  'Moss Vale Golf Club',
  'NSW',
  'Moss Vale',
  'Arthur Street, Moss Vale NSW 2577',
  '+61 2 4868 1503',
  'https://www.mossvalegolf.com.au',
  18
)
ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name,
  address = EXCLUDED.address,
  phone = EXCLUDED.phone,
  website = EXCLUDED.website;

INSERT INTO courses (venue_id, name, description, slope_rating, course_rating, holes, tees)
VALUES (
  'f2a3b4c5-d6e7-8901-abcd-400000000713',
  'Moss Vale',
  'Historic parkland course established 1902 in the Southern Highlands. Par 71 layout with three par 5s and four par 3s. Cooler highland climate provides year-round playing conditions.',
  128,
  71.0,
  '[
    {"number": 1, "par": 4, "strokeIndex": 6, "yardages": {"blue": 334, "red": 321}},
    {"number": 2, "par": 3, "strokeIndex": 11, "yardages": {"blue": 142, "red": 127}},
    {"number": 3, "par": 4, "strokeIndex": 8, "yardages": {"blue": 286, "red": 281}},
    {"number": 4, "par": 5, "strokeIndex": 13, "yardages": {"blue": 468, "red": 455}},
    {"number": 5, "par": 4, "strokeIndex": 5, "yardages": {"blue": 364, "red": 355}},
    {"number": 6, "par": 3, "strokeIndex": 9, "yardages": {"blue": 155, "red": 127}},
    {"number": 7, "par": 5, "strokeIndex": 16, "yardages": {"blue": 466, "red": 425}},
    {"number": 8, "par": 4, "strokeIndex": 3, "yardages": {"blue": 376, "red": 321}},
    {"number": 9, "par": 4, "strokeIndex": 14, "yardages": {"blue": 310, "red": 298}},
    {"number": 10, "par": 4, "strokeIndex": 15, "yardages": {"blue": 308, "red": 301}},
    {"number": 11, "par": 3, "strokeIndex": 18, "yardages": {"blue": 123, "red": 107}},
    {"number": 12, "par": 4, "strokeIndex": 12, "yardages": {"blue": 324, "red": 293}},
    {"number": 13, "par": 4, "strokeIndex": 17, "yardages": {"blue": 308, "red": 303}},
    {"number": 14, "par": 4, "strokeIndex": 2, "yardages": {"blue": 362, "red": 322}},
    {"number": 15, "par": 4, "strokeIndex": 4, "yardages": {"blue": 402, "red": 387}},
    {"number": 16, "par": 3, "strokeIndex": 7, "yardages": {"blue": 198, "red": 160}},
    {"number": 17, "par": 5, "strokeIndex": 10, "yardages": {"blue": 500, "red": 407}},
    {"number": 18, "par": 4, "strokeIndex": 1, "yardages": {"blue": 379, "red": 310}}
  ]'::jsonb,
  '[
    {"name": "Blue", "color": "blue", "courseRating": 71.0, "slopeRating": 128, "totalYardage": 5805},
    {"name": "Red", "color": "red", "courseRating": 73.0, "slopeRating": 126, "totalYardage": 5300}
  ]'::jsonb
)
ON CONFLICT (venue_id, name) DO UPDATE SET
  description = EXCLUDED.description,
  slope_rating = EXCLUDED.slope_rating,
  course_rating = EXCLUDED.course_rating,
  holes = EXCLUDED.holes,
  tees = EXCLUDED.tees;

-- Highlands Golf Club (Mittagong)
INSERT INTO venues (id, source, name, state, city, address, phone, website, total_holes)
VALUES (
  'f2a3b4c5-d6e7-8901-abcd-400000000714',
  'manual',
  'Highlands Golf Club',
  'NSW',
  'Mittagong',
  'Old Hume Highway, Mittagong NSW 2575',
  '+61 2 4871 1175',
  'https://www.highlandsgolf.com.au',
  18
)
ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name,
  address = EXCLUDED.address,
  phone = EXCLUDED.phone,
  website = EXCLUDED.website;

INSERT INTO courses (venue_id, name, description, slope_rating, course_rating, holes, tees)
VALUES (
  'f2a3b4c5-d6e7-8901-abcd-400000000714',
  'Highlands',
  'Private parkland course in the Southern Highlands. Par 70 layout with three par 5s and five par 3s. Scenic mountain setting with well-maintained fairways.',
  119,
  70.0,
  '[
    {"number": 1, "par": 4, "strokeIndex": 5, "yardages": {"blue": 317, "yellow": 263}},
    {"number": 2, "par": 5, "strokeIndex": 7, "yardages": {"blue": 520, "yellow": 427}},
    {"number": 3, "par": 4, "strokeIndex": 12, "yardages": {"blue": 334, "yellow": 266}},
    {"number": 4, "par": 3, "strokeIndex": 11, "yardages": {"blue": 176, "yellow": 167}},
    {"number": 5, "par": 5, "strokeIndex": 17, "yardages": {"blue": 465, "yellow": 452}},
    {"number": 6, "par": 4, "strokeIndex": 1, "yardages": {"blue": 353, "yellow": 285}},
    {"number": 7, "par": 4, "strokeIndex": 13, "yardages": {"blue": 220, "yellow": 172}},
    {"number": 8, "par": 4, "strokeIndex": 3, "yardages": {"blue": 369, "yellow": 340}},
    {"number": 9, "par": 4, "strokeIndex": 6, "yardages": {"blue": 374, "yellow": 302}},
    {"number": 10, "par": 4, "strokeIndex": 16, "yardages": {"blue": 262, "yellow": 257}},
    {"number": 11, "par": 4, "strokeIndex": 4, "yardages": {"blue": 302, "yellow": 250}},
    {"number": 12, "par": 3, "strokeIndex": 9, "yardages": {"blue": 143, "yellow": 133}},
    {"number": 13, "par": 4, "strokeIndex": 8, "yardages": {"blue": 324, "yellow": 320}},
    {"number": 14, "par": 5, "strokeIndex": 15, "yardages": {"blue": 429, "yellow": 368}},
    {"number": 15, "par": 3, "strokeIndex": 10, "yardages": {"blue": 138, "yellow": 123}},
    {"number": 16, "par": 4, "strokeIndex": 14, "yardages": {"blue": 327, "yellow": 322}},
    {"number": 17, "par": 3, "strokeIndex": 2, "yardages": {"blue": 204, "yellow": 204}},
    {"number": 18, "par": 3, "strokeIndex": 18, "yardages": {"blue": 99, "yellow": 93}}
  ]'::jsonb,
  '[
    {"name": "Blue", "color": "blue", "courseRating": 70.0, "slopeRating": 69, "totalYardage": 5356},
    {"name": "Yellow", "color": "yellow", "courseRating": 73.0, "slopeRating": 119, "totalYardage": 4744}
  ]'::jsonb
)
ON CONFLICT (venue_id, name) DO UPDATE SET
  description = EXCLUDED.description,
  slope_rating = EXCLUDED.slope_rating,
  course_rating = EXCLUDED.course_rating,
  holes = EXCLUDED.holes,
  tees = EXCLUDED.tees;

-- Queanbeyan Golf Club (Near Canberra)
INSERT INTO venues (id, source, name, state, city, address, phone, website, total_holes)
VALUES (
  'f2a3b4c5-d6e7-8901-abcd-400000000715',
  'manual',
  'Queanbeyan Golf Club',
  'NSW',
  'Queanbeyan East',
  'Yass Road, Queanbeyan East NSW 2620',
  '+61 2 6297 1449',
  'https://www.qgc.net.au',
  18
)
ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name,
  address = EXCLUDED.address,
  phone = EXCLUDED.phone,
  website = EXCLUDED.website;

INSERT INTO courses (venue_id, name, description, slope_rating, course_rating, holes, tees)
VALUES (
  'f2a3b4c5-d6e7-8901-abcd-400000000715',
  'Queanbeyan',
  'Parkland course near Canberra. Par 70 layout with three par 5s and five par 3s. Tree-lined fairways and undulating terrain provide a challenging round.',
  131,
  72.0,
  '[
    {"number": 1, "par": 4, "strokeIndex": 1, "yardages": {"blue": 370, "yellow": 361, "red": 268}},
    {"number": 2, "par": 4, "strokeIndex": 12, "yardages": {"blue": 358, "yellow": 350, "red": 333}},
    {"number": 3, "par": 5, "strokeIndex": 14, "yardages": {"blue": 411, "yellow": 405, "red": 385}},
    {"number": 4, "par": 4, "strokeIndex": 3, "yardages": {"blue": 390, "yellow": 375, "red": 384}},
    {"number": 5, "par": 4, "strokeIndex": 11, "yardages": {"blue": 318, "yellow": 300, "red": 306}},
    {"number": 6, "par": 3, "strokeIndex": 13, "yardages": {"blue": 166, "yellow": 150, "red": 160}},
    {"number": 7, "par": 4, "strokeIndex": 4, "yardages": {"blue": 421, "yellow": 411, "red": 405}},
    {"number": 8, "par": 3, "strokeIndex": 18, "yardages": {"blue": 140, "yellow": 132, "red": 125}},
    {"number": 9, "par": 4, "strokeIndex": 7, "yardages": {"blue": 341, "yellow": 318, "red": 308}},
    {"number": 10, "par": 4, "strokeIndex": 10, "yardages": {"blue": 340, "yellow": 332, "red": 328}},
    {"number": 11, "par": 4, "strokeIndex": 8, "yardages": {"blue": 344, "yellow": 339, "red": 291}},
    {"number": 12, "par": 3, "strokeIndex": 16, "yardages": {"blue": 142, "yellow": 129, "red": 121}},
    {"number": 13, "par": 5, "strokeIndex": 9, "yardages": {"blue": 493, "yellow": 478, "red": 432}},
    {"number": 14, "par": 4, "strokeIndex": 2, "yardages": {"blue": 393, "yellow": 346, "red": 330}},
    {"number": 15, "par": 3, "strokeIndex": 15, "yardages": {"blue": 168, "yellow": 163, "red": 145}},
    {"number": 16, "par": 5, "strokeIndex": 5, "yardages": {"blue": 508, "yellow": 502, "red": 404}},
    {"number": 17, "par": 3, "strokeIndex": 17, "yardages": {"blue": 148, "yellow": 138, "red": 130}},
    {"number": 18, "par": 4, "strokeIndex": 6, "yardages": {"blue": 355, "yellow": 333, "red": 337}}
  ]'::jsonb,
  '[
    {"name": "Blue", "color": "blue", "courseRating": 72.0, "slopeRating": 131, "totalYardage": 5806},
    {"name": "Yellow", "color": "yellow", "courseRating": 71.0, "slopeRating": 129, "totalYardage": 5562},
    {"name": "Red", "color": "red", "courseRating": 74.0, "slopeRating": 131, "totalYardage": 5192}
  ]'::jsonb
)
ON CONFLICT (venue_id, name) DO UPDATE SET
  description = EXCLUDED.description,
  slope_rating = EXCLUDED.slope_rating,
  course_rating = EXCLUDED.course_rating,
  holes = EXCLUDED.holes,
  tees = EXCLUDED.tees;
