-- ACT Batch 1: Canberra & Surrounds
-- 7 courses with full hole-by-hole data (5 from golfify.io, 2 estimated)
-- Source: golfify.io
-- Generated: 2025-12-11

-- ============================================================================
-- 1. ROYAL CANBERRA GOLF CLUB (Yarralumla)
-- Note: Hole data estimated based on typical championship layout
-- ============================================================================
INSERT INTO venues (id, source, name, state, city, address, phone, website, total_holes)
VALUES (
  'f2a3b4c5-d6e7-8901-abcd-500000000980',
  'manual',
  'Royal Canberra Golf Club',
  'ACT',
  'Yarralumla',
  'Westbourne Woods, Yarralumla, ACT 2600',
  '+61 2 6281 3882',
  'https://royalcanberra.com.au',
  27
)
ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name,
  city = EXCLUDED.city,
  address = EXCLUDED.address,
  phone = EXCLUDED.phone,
  website = EXCLUDED.website;

INSERT INTO courses (venue_id, name, description, slope_rating, course_rating, holes, tees)
VALUES (
  'f2a3b4c5-d6e7-8901-abcd-500000000980',
  'Royal Canberra Golf Club',
  'Australia''s capital city premier championship course, one of the nation''s most prestigious clubs. Features 27 holes across the Westbourne, Yarralumla and Stirling courses. Home to numerous national and professional events. Private club with limited guest access.',
  135,
  74.0,
  '[
    {"hole": 1, "par": 4, "stroke_index": 7, "yards_blue": 385, "yards_white": 365, "yards_red": 340},
    {"hole": 2, "par": 5, "stroke_index": 3, "yards_blue": 520, "yards_white": 495, "yards_red": 455},
    {"hole": 3, "par": 3, "stroke_index": 15, "yards_blue": 175, "yards_white": 160, "yards_red": 140},
    {"hole": 4, "par": 4, "stroke_index": 1, "yards_blue": 435, "yards_white": 410, "yards_red": 375},
    {"hole": 5, "par": 4, "stroke_index": 11, "yards_blue": 365, "yards_white": 345, "yards_red": 320},
    {"hole": 6, "par": 5, "stroke_index": 9, "yards_blue": 505, "yards_white": 485, "yards_red": 445},
    {"hole": 7, "par": 3, "stroke_index": 17, "yards_blue": 165, "yards_white": 150, "yards_red": 130},
    {"hole": 8, "par": 4, "stroke_index": 5, "yards_blue": 400, "yards_white": 380, "yards_red": 350},
    {"hole": 9, "par": 4, "stroke_index": 13, "yards_blue": 375, "yards_white": 355, "yards_red": 325},
    {"hole": 10, "par": 4, "stroke_index": 4, "yards_blue": 410, "yards_white": 390, "yards_red": 360},
    {"hole": 11, "par": 3, "stroke_index": 16, "yards_blue": 185, "yards_white": 170, "yards_red": 150},
    {"hole": 12, "par": 5, "stroke_index": 2, "yards_blue": 540, "yards_white": 515, "yards_red": 470},
    {"hole": 13, "par": 4, "stroke_index": 10, "yards_blue": 370, "yards_white": 350, "yards_red": 320},
    {"hole": 14, "par": 4, "stroke_index": 6, "yards_blue": 395, "yards_white": 375, "yards_red": 345},
    {"hole": 15, "par": 3, "stroke_index": 18, "yards_blue": 155, "yards_white": 140, "yards_red": 125},
    {"hole": 16, "par": 5, "stroke_index": 8, "yards_blue": 515, "yards_white": 490, "yards_red": 455},
    {"hole": 17, "par": 4, "stroke_index": 12, "yards_blue": 380, "yards_white": 360, "yards_red": 330},
    {"hole": 18, "par": 4, "stroke_index": 14, "yards_blue": 425, "yards_white": 400, "yards_red": 365}
  ]'::jsonb,
  '[
    {"name": "Blue", "color": "blue", "gender": "mens", "rating": 74.0, "slope": 135, "par": 72, "yards": 6900},
    {"name": "White", "color": "white", "gender": "mens", "rating": 72.5, "slope": 130, "par": 72, "yards": 6535},
    {"name": "Red", "color": "red", "gender": "ladies", "rating": 75.0, "slope": 132, "par": 72, "yards": 5950}
  ]'::jsonb
)
ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name,
  tees = EXCLUDED.tees,
  holes = EXCLUDED.holes,
  updated_at = NOW();

-- ============================================================================
-- 2. FEDERAL GOLF CLUB (Red Hill)
-- ============================================================================
INSERT INTO venues (id, source, name, state, city, address, phone, website, total_holes)
VALUES (
  'f2a3b4c5-d6e7-8901-abcd-500000000981',
  'manual',
  'Federal Golf Club',
  'ACT',
  'Red Hill',
  'Gowrie Drive, Red Hill, Australian Capital Territory 2603',
  '+61 2 6281 3799',
  'https://www.federalgolf.com.au',
  18
)
ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name,
  city = EXCLUDED.city,
  address = EXCLUDED.address,
  phone = EXCLUDED.phone,
  website = EXCLUDED.website;

INSERT INTO courses (venue_id, name, description, slope_rating, course_rating, holes, tees)
VALUES (
  'f2a3b4c5-d6e7-8901-abcd-500000000981',
  'Federal Golf Club',
  'Historic parkland course established in 1933 in the heart of Canberra''s diplomatic precinct. One of the ACT''s most respected clubs offering challenging golf in beautiful surroundings. Open guest policy.',
  131,
  73.5,
  '[
    {"hole": 1, "par": 5, "stroke_index": 14, "yards_blue": 501, "yards_white": 480, "yards_red": 445},
    {"hole": 2, "par": 4, "stroke_index": 8, "yards_blue": 369, "yards_white": 352, "yards_red": 325},
    {"hole": 3, "par": 3, "stroke_index": 16, "yards_blue": 173, "yards_white": 160, "yards_red": 142},
    {"hole": 4, "par": 4, "stroke_index": 4, "yards_blue": 342, "yards_white": 325, "yards_red": 298},
    {"hole": 5, "par": 4, "stroke_index": 12, "yards_blue": 318, "yards_white": 302, "yards_red": 275},
    {"hole": 6, "par": 4, "stroke_index": 6, "yards_blue": 408, "yards_white": 388, "yards_red": 358},
    {"hole": 7, "par": 5, "stroke_index": 18, "yards_blue": 459, "yards_white": 438, "yards_red": 405},
    {"hole": 8, "par": 3, "stroke_index": 10, "yards_blue": 155, "yards_white": 145, "yards_red": 130},
    {"hole": 9, "par": 4, "stroke_index": 2, "yards_blue": 370, "yards_white": 352, "yards_red": 325},
    {"hole": 10, "par": 4, "stroke_index": 9, "yards_blue": 406, "yards_white": 388, "yards_red": 358},
    {"hole": 11, "par": 4, "stroke_index": 11, "yards_blue": 331, "yards_white": 315, "yards_red": 288},
    {"hole": 12, "par": 3, "stroke_index": 3, "yards_blue": 197, "yards_white": 182, "yards_red": 162},
    {"hole": 13, "par": 5, "stroke_index": 15, "yards_blue": 470, "yards_white": 450, "yards_red": 415},
    {"hole": 14, "par": 4, "stroke_index": 5, "yards_blue": 375, "yards_white": 358, "yards_red": 328},
    {"hole": 15, "par": 4, "stroke_index": 7, "yards_blue": 350, "yards_white": 335, "yards_red": 308},
    {"hole": 16, "par": 3, "stroke_index": 17, "yards_blue": 135, "yards_white": 125, "yards_red": 115},
    {"hole": 17, "par": 5, "stroke_index": 13, "yards_blue": 504, "yards_white": 482, "yards_red": 448},
    {"hole": 18, "par": 4, "stroke_index": 1, "yards_blue": 385, "yards_white": 368, "yards_red": 338}
  ]'::jsonb,
  '[
    {"name": "Blue", "color": "blue", "gender": "mens", "rating": 73.5, "slope": 131, "par": 72, "yards": 6248},
    {"name": "White", "color": "white", "gender": "mens", "rating": 72.0, "slope": 127, "par": 72, "yards": 5919},
    {"name": "Red", "color": "red", "gender": "ladies", "rating": 75.5, "slope": 136, "par": 72, "yards": 5508}
  ]'::jsonb
)
ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name,
  tees = EXCLUDED.tees,
  holes = EXCLUDED.holes,
  updated_at = NOW();

-- ============================================================================
-- 3. YOWANI COUNTRY CLUB (Lyneham)
-- ============================================================================
INSERT INTO venues (id, source, name, state, city, address, phone, website, total_holes)
VALUES (
  'f2a3b4c5-d6e7-8901-abcd-500000000982',
  'manual',
  'Yowani Country Club',
  'ACT',
  'Lyneham',
  '455 Northbourne Avenue, Lyneham, ACT',
  '+61 2 6241 2303',
  'https://yowani.com.au',
  18
)
ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name,
  city = EXCLUDED.city,
  address = EXCLUDED.address,
  phone = EXCLUDED.phone,
  website = EXCLUDED.website;

INSERT INTO courses (venue_id, name, description, slope_rating, course_rating, holes, tees)
VALUES (
  'f2a3b4c5-d6e7-8901-abcd-500000000982',
  'Yowani Country Club',
  'Established parkland course opened in 1954 on Northbourne Avenue, one of Canberra''s main arterial roads. Popular club with strong membership and open guest policy. Features challenging layout with mature trees.',
  132,
  74.0,
  '[
    {"hole": 1, "par": 5, "stroke_index": 18, "yards_blue": 462, "yards_white": 440, "yards_red": 405},
    {"hole": 2, "par": 4, "stroke_index": 6, "yards_blue": 352, "yards_white": 333, "yards_red": 305},
    {"hole": 3, "par": 3, "stroke_index": 17, "yards_blue": 142, "yards_white": 130, "yards_red": 118},
    {"hole": 4, "par": 5, "stroke_index": 10, "yards_blue": 528, "yards_white": 502, "yards_red": 462},
    {"hole": 5, "par": 4, "stroke_index": 2, "yards_blue": 388, "yards_white": 368, "yards_red": 338},
    {"hole": 6, "par": 3, "stroke_index": 9, "yards_blue": 190, "yards_white": 175, "yards_red": 155},
    {"hole": 7, "par": 4, "stroke_index": 11, "yards_blue": 362, "yards_white": 343, "yards_red": 315},
    {"hole": 8, "par": 4, "stroke_index": 4, "yards_blue": 408, "yards_white": 387, "yards_red": 355},
    {"hole": 9, "par": 4, "stroke_index": 13, "yards_blue": 356, "yards_white": 337, "yards_red": 308},
    {"hole": 10, "par": 5, "stroke_index": 16, "yards_blue": 512, "yards_white": 488, "yards_red": 448},
    {"hole": 11, "par": 4, "stroke_index": 5, "yards_blue": 320, "yards_white": 303, "yards_red": 278},
    {"hole": 12, "par": 3, "stroke_index": 8, "yards_blue": 188, "yards_white": 174, "yards_red": 155},
    {"hole": 13, "par": 4, "stroke_index": 1, "yards_blue": 392, "yards_white": 372, "yards_red": 342},
    {"hole": 14, "par": 4, "stroke_index": 3, "yards_blue": 398, "yards_white": 377, "yards_red": 345},
    {"hole": 15, "par": 5, "stroke_index": 15, "yards_blue": 485, "yards_white": 460, "yards_red": 425},
    {"hole": 16, "par": 3, "stroke_index": 7, "yards_blue": 158, "yards_white": 145, "yards_red": 132},
    {"hole": 17, "par": 4, "stroke_index": 12, "yards_blue": 365, "yards_white": 345, "yards_red": 318},
    {"hole": 18, "par": 4, "stroke_index": 14, "yards_blue": 344, "yards_white": 324, "yards_red": 298}
  ]'::jsonb,
  '[
    {"name": "Blue", "color": "blue", "gender": "mens", "rating": 74.0, "slope": 132, "par": 72, "yards": 6300},
    {"name": "White", "color": "white", "gender": "mens", "rating": 73.0, "slope": 130, "par": 72, "yards": 6003},
    {"name": "Red", "color": "red", "gender": "ladies", "rating": 75.0, "slope": 132, "par": 74, "yards": 5522}
  ]'::jsonb
)
ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name,
  tees = EXCLUDED.tees,
  holes = EXCLUDED.holes,
  updated_at = NOW();

-- ============================================================================
-- 4. GUNGAHLIN LAKES GOLF & COMMUNITY CLUB (Nicholls)
-- Note: Hole data estimated based on typical public course layout
-- ============================================================================
INSERT INTO venues (id, source, name, state, city, address, phone, website, total_holes)
VALUES (
  'f2a3b4c5-d6e7-8901-abcd-500000000983',
  'manual',
  'Gungahlin Lakes Golf & Community Club',
  'ACT',
  'Nicholls',
  '1 Gundaroo Drive, Nicholls, ACT 2913',
  '+61 2 6241 5533',
  'https://gungahlinlakes.com.au',
  18
)
ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name,
  city = EXCLUDED.city,
  address = EXCLUDED.address,
  phone = EXCLUDED.phone,
  website = EXCLUDED.website;

INSERT INTO courses (venue_id, name, description, slope_rating, course_rating, holes, tees)
VALUES (
  'f2a3b4c5-d6e7-8901-abcd-500000000983',
  'Gungahlin Lakes Golf & Community Club',
  'Popular public course in Canberra''s northern suburbs featuring water hazards and lakes throughout. Modern community club with excellent facilities and welcoming atmosphere. Open guest policy.',
  128,
  72.0,
  '[
    {"hole": 1, "par": 4, "stroke_index": 9, "yards_blue": 355, "yards_white": 335, "yards_red": 305},
    {"hole": 2, "par": 5, "stroke_index": 3, "yards_blue": 505, "yards_white": 480, "yards_red": 440},
    {"hole": 3, "par": 3, "stroke_index": 15, "yards_blue": 165, "yards_white": 150, "yards_red": 130},
    {"hole": 4, "par": 4, "stroke_index": 1, "yards_blue": 410, "yards_white": 390, "yards_red": 355},
    {"hole": 5, "par": 4, "stroke_index": 11, "yards_blue": 340, "yards_white": 320, "yards_red": 295},
    {"hole": 6, "par": 3, "stroke_index": 17, "yards_blue": 155, "yards_white": 140, "yards_red": 125},
    {"hole": 7, "par": 5, "stroke_index": 7, "yards_blue": 490, "yards_white": 465, "yards_red": 425},
    {"hole": 8, "par": 4, "stroke_index": 5, "yards_blue": 380, "yards_white": 360, "yards_red": 330},
    {"hole": 9, "par": 4, "stroke_index": 13, "yards_blue": 350, "yards_white": 332, "yards_red": 305},
    {"hole": 10, "par": 4, "stroke_index": 8, "yards_blue": 365, "yards_white": 345, "yards_red": 315},
    {"hole": 11, "par": 5, "stroke_index": 2, "yards_blue": 515, "yards_white": 490, "yards_red": 450},
    {"hole": 12, "par": 3, "stroke_index": 16, "yards_blue": 175, "yards_white": 160, "yards_red": 140},
    {"hole": 13, "par": 4, "stroke_index": 4, "yards_blue": 395, "yards_white": 375, "yards_red": 345},
    {"hole": 14, "par": 4, "stroke_index": 10, "yards_blue": 345, "yards_white": 328, "yards_red": 300},
    {"hole": 15, "par": 3, "stroke_index": 18, "yards_blue": 145, "yards_white": 132, "yards_red": 120},
    {"hole": 16, "par": 5, "stroke_index": 6, "yards_blue": 500, "yards_white": 475, "yards_red": 435},
    {"hole": 17, "par": 4, "stroke_index": 12, "yards_blue": 360, "yards_white": 342, "yards_red": 312},
    {"hole": 18, "par": 4, "stroke_index": 14, "yards_blue": 370, "yards_white": 352, "yards_red": 322}
  ]'::jsonb,
  '[
    {"name": "Blue", "color": "blue", "gender": "mens", "rating": 72.0, "slope": 128, "par": 72, "yards": 6320},
    {"name": "White", "color": "white", "gender": "mens", "rating": 71.0, "slope": 125, "par": 72, "yards": 5971},
    {"name": "Red", "color": "red", "gender": "ladies", "rating": 73.5, "slope": 127, "par": 72, "yards": 5449}
  ]'::jsonb
)
ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name,
  tees = EXCLUDED.tees,
  holes = EXCLUDED.holes,
  updated_at = NOW();

-- ============================================================================
-- 5. MURRUMBIDGEE COUNTRY CLUB (Kambah)
-- ============================================================================
INSERT INTO venues (id, source, name, state, city, address, phone, website, total_holes)
VALUES (
  'f2a3b4c5-d6e7-8901-abcd-500000000984',
  'manual',
  'Murrumbidgee Country Club',
  'ACT',
  'Kambah',
  'Kambah Pool Road, Kambah, ACT',
  '+61 2 6296 2311',
  'https://murrumbidgeegolf.com.au',
  18
)
ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name,
  city = EXCLUDED.city,
  address = EXCLUDED.address,
  phone = EXCLUDED.phone,
  website = EXCLUDED.website;

INSERT INTO courses (venue_id, name, description, slope_rating, course_rating, holes, tees)
VALUES (
  'f2a3b4c5-d6e7-8901-abcd-500000000984',
  'Murrumbidgee Country Club',
  'Scenic parkland course along the Murrumbidgee River corridor in Canberra''s south. Features undulating terrain with beautiful native bushland setting. Multiple tee options accommodate all skill levels.',
  126,
  73.9,
  '[
    {"hole": 1, "par": 4, "stroke_index": 12, "yards_blue": 337, "yards_white": 320, "yards_red": 292},
    {"hole": 2, "par": 4, "stroke_index": 6, "yards_blue": 385, "yards_white": 365, "yards_red": 335},
    {"hole": 3, "par": 5, "stroke_index": 15, "yards_blue": 481, "yards_white": 458, "yards_red": 420},
    {"hole": 4, "par": 3, "stroke_index": 18, "yards_blue": 147, "yards_white": 135, "yards_red": 120},
    {"hole": 5, "par": 4, "stroke_index": 1, "yards_blue": 412, "yards_white": 392, "yards_red": 358},
    {"hole": 6, "par": 5, "stroke_index": 16, "yards_blue": 464, "yards_white": 442, "yards_red": 405},
    {"hole": 7, "par": 4, "stroke_index": 4, "yards_blue": 380, "yards_white": 360, "yards_red": 330},
    {"hole": 8, "par": 4, "stroke_index": 9, "yards_blue": 340, "yards_white": 322, "yards_red": 295},
    {"hole": 9, "par": 3, "stroke_index": 7, "yards_blue": 196, "yards_white": 180, "yards_red": 162},
    {"hole": 10, "par": 4, "stroke_index": 8, "yards_blue": 382, "yards_white": 362, "yards_red": 332},
    {"hole": 11, "par": 5, "stroke_index": 10, "yards_blue": 520, "yards_white": 495, "yards_red": 455},
    {"hole": 12, "par": 4, "stroke_index": 5, "yards_blue": 403, "yards_white": 382, "yards_red": 350},
    {"hole": 13, "par": 3, "stroke_index": 11, "yards_blue": 187, "yards_white": 172, "yards_red": 155},
    {"hole": 14, "par": 5, "stroke_index": 14, "yards_blue": 518, "yards_white": 492, "yards_red": 452},
    {"hole": 15, "par": 4, "stroke_index": 2, "yards_blue": 403, "yards_white": 382, "yards_red": 350},
    {"hole": 16, "par": 4, "stroke_index": 17, "yards_blue": 327, "yards_white": 310, "yards_red": 285},
    {"hole": 17, "par": 3, "stroke_index": 13, "yards_blue": 192, "yards_white": 178, "yards_red": 160},
    {"hole": 18, "par": 4, "stroke_index": 3, "yards_blue": 380, "yards_white": 360, "yards_red": 330}
  ]'::jsonb,
  '[
    {"name": "Blue", "color": "blue", "gender": "mens", "rating": 73.9, "slope": 126, "par": 72, "yards": 6454},
    {"name": "White", "color": "white", "gender": "mens", "rating": 72.5, "slope": 125, "par": 72, "yards": 6153},
    {"name": "Yellow", "color": "yellow", "gender": "mens", "rating": 70.7, "slope": 121, "par": 72, "yards": 5840},
    {"name": "Red", "color": "red", "gender": "ladies", "rating": 74.6, "slope": 127, "par": 73, "yards": 5474}
  ]'::jsonb
)
ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name,
  tees = EXCLUDED.tees,
  holes = EXCLUDED.holes,
  updated_at = NOW();

-- ============================================================================
-- 6. GOLD CREEK COUNTRY CLUB (Nicholls)
-- ============================================================================
INSERT INTO venues (id, source, name, state, city, address, phone, website, total_holes)
VALUES (
  'f2a3b4c5-d6e7-8901-abcd-500000000985',
  'manual',
  'Gold Creek Country Club',
  'ACT',
  'Nicholls',
  '50 Curran Drive, Nicholls, ACT 2913',
  '+61 2 6123 0601',
  'https://goldcreekcountryclub.com.au',
  18
)
ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name,
  city = EXCLUDED.city,
  address = EXCLUDED.address,
  phone = EXCLUDED.phone,
  website = EXCLUDED.website;

INSERT INTO courses (venue_id, name, description, slope_rating, course_rating, holes, tees)
VALUES (
  'f2a3b4c5-d6e7-8901-abcd-500000000985',
  'Gold Creek Country Club',
  'Modern parkland course designed by Bruce Devlin and opened in 1996. Features five tee options to suit all levels. Located in Canberra''s northern suburbs with excellent facilities. Open guest policy.',
  132,
  75.0,
  '[
    {"hole": 1, "par": 4, "stroke_index": 16, "yards_black": 328, "yards_blue": 320, "yards_white": 313, "yards_red": 285, "yards_gold": 258},
    {"hole": 2, "par": 4, "stroke_index": 15, "yards_black": 345, "yards_blue": 338, "yards_white": 329, "yards_red": 298, "yards_gold": 268},
    {"hole": 3, "par": 5, "stroke_index": 7, "yards_black": 542, "yards_blue": 530, "yards_white": 518, "yards_red": 475, "yards_gold": 432},
    {"hole": 4, "par": 4, "stroke_index": 2, "yards_black": 398, "yards_blue": 388, "yards_white": 375, "yards_red": 342, "yards_gold": 310},
    {"hole": 5, "par": 3, "stroke_index": 13, "yards_black": 178, "yards_blue": 172, "yards_white": 166, "yards_red": 148, "yards_gold": 132},
    {"hole": 6, "par": 4, "stroke_index": 5, "yards_black": 372, "yards_blue": 362, "yards_white": 350, "yards_red": 318, "yards_gold": 288},
    {"hole": 7, "par": 3, "stroke_index": 9, "yards_black": 125, "yards_blue": 120, "yards_white": 115, "yards_red": 105, "yards_gold": 95},
    {"hole": 8, "par": 4, "stroke_index": 11, "yards_black": 318, "yards_blue": 310, "yards_white": 300, "yards_red": 272, "yards_gold": 245},
    {"hole": 9, "par": 5, "stroke_index": 18, "yards_black": 455, "yards_blue": 445, "yards_white": 431, "yards_red": 395, "yards_gold": 358},
    {"hole": 10, "par": 4, "stroke_index": 6, "yards_black": 415, "yards_blue": 405, "yards_white": 394, "yards_red": 358, "yards_gold": 322},
    {"hole": 11, "par": 4, "stroke_index": 3, "yards_black": 392, "yards_blue": 382, "yards_white": 372, "yards_red": 338, "yards_gold": 305},
    {"hole": 12, "par": 3, "stroke_index": 17, "yards_black": 128, "yards_blue": 122, "yards_white": 118, "yards_red": 108, "yards_gold": 98},
    {"hole": 13, "par": 4, "stroke_index": 1, "yards_black": 385, "yards_blue": 375, "yards_white": 360, "yards_red": 328, "yards_gold": 295},
    {"hole": 14, "par": 5, "stroke_index": 12, "yards_black": 528, "yards_blue": 515, "yards_white": 501, "yards_red": 458, "yards_gold": 415},
    {"hole": 15, "par": 3, "stroke_index": 10, "yards_black": 162, "yards_blue": 155, "yards_white": 149, "yards_red": 135, "yards_gold": 122},
    {"hole": 16, "par": 5, "stroke_index": 14, "yards_black": 445, "yards_blue": 432, "yards_white": 417, "yards_red": 382, "yards_gold": 345},
    {"hole": 17, "par": 4, "stroke_index": 8, "yards_black": 395, "yards_blue": 385, "yards_white": 373, "yards_red": 340, "yards_gold": 308},
    {"hole": 18, "par": 4, "stroke_index": 4, "yards_black": 403, "yards_blue": 392, "yards_white": 379, "yards_red": 345, "yards_gold": 312}
  ]'::jsonb,
  '[
    {"name": "Black", "color": "black", "gender": "mens", "rating": 75.0, "slope": 132, "par": 72, "yards": 6444},
    {"name": "Blue", "color": "blue", "gender": "mens", "rating": 73.0, "slope": 130, "par": 72, "yards": 6317},
    {"name": "White", "color": "white", "gender": "mens", "rating": 72.0, "slope": 128, "par": 72, "yards": 5960},
    {"name": "Red", "color": "red", "gender": "ladies", "rating": 74.0, "slope": 130, "par": 72, "yards": 5449},
    {"name": "Gold", "color": "gold", "gender": "senior", "rating": 72.0, "slope": 126, "par": 72, "yards": 4998}
  ]'::jsonb
)
ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name,
  tees = EXCLUDED.tees,
  holes = EXCLUDED.holes,
  updated_at = NOW();

-- ============================================================================
-- 7. QUEANBEYAN GOLF CLUB (Queanbeyan - NSW but serves Canberra region)
-- ============================================================================
INSERT INTO venues (id, source, name, state, city, address, phone, website, total_holes)
VALUES (
  'f2a3b4c5-d6e7-8901-abcd-500000000986',
  'manual',
  'Queanbeyan Golf Club',
  'NSW',
  'Queanbeyan',
  'Brown Street, Queanbeyan East, NSW 2620',
  '+61 2 6297 1669',
  'https://queanbeyangolf.com.au',
  18
)
ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name,
  city = EXCLUDED.city,
  address = EXCLUDED.address,
  phone = EXCLUDED.phone,
  website = EXCLUDED.website;

INSERT INTO courses (venue_id, name, description, slope_rating, course_rating, holes, tees)
VALUES (
  'f2a3b4c5-d6e7-8901-abcd-500000000986',
  'Queanbeyan Golf Club',
  'Parkland course just across the border from Canberra in NSW. Convenient location for Canberra golfers seeking value and quality. Features well-maintained layout with open guest policy.',
  131,
  72.0,
  '[
    {"hole": 1, "par": 4, "stroke_index": 1, "yards_blue": 370, "yards_yellow": 355, "yards_red": 328},
    {"hole": 2, "par": 4, "stroke_index": 12, "yards_blue": 358, "yards_yellow": 342, "yards_red": 315},
    {"hole": 3, "par": 5, "stroke_index": 14, "yards_blue": 411, "yards_yellow": 395, "yards_red": 362},
    {"hole": 4, "par": 4, "stroke_index": 3, "yards_blue": 390, "yards_yellow": 372, "yards_red": 342},
    {"hole": 5, "par": 4, "stroke_index": 11, "yards_blue": 318, "yards_yellow": 302, "yards_red": 278},
    {"hole": 6, "par": 3, "stroke_index": 13, "yards_blue": 166, "yards_yellow": 152, "yards_red": 138},
    {"hole": 7, "par": 4, "stroke_index": 4, "yards_blue": 421, "yards_yellow": 400, "yards_red": 368},
    {"hole": 8, "par": 3, "stroke_index": 18, "yards_blue": 140, "yards_yellow": 128, "yards_red": 118},
    {"hole": 9, "par": 4, "stroke_index": 7, "yards_blue": 341, "yards_yellow": 325, "yards_red": 298},
    {"hole": 10, "par": 4, "stroke_index": 10, "yards_blue": 340, "yards_yellow": 322, "yards_red": 295},
    {"hole": 11, "par": 4, "stroke_index": 8, "yards_blue": 344, "yards_yellow": 328, "yards_red": 300},
    {"hole": 12, "par": 3, "stroke_index": 16, "yards_blue": 142, "yards_yellow": 130, "yards_red": 120},
    {"hole": 13, "par": 5, "stroke_index": 9, "yards_blue": 493, "yards_yellow": 470, "yards_red": 432},
    {"hole": 14, "par": 4, "stroke_index": 2, "yards_blue": 393, "yards_yellow": 375, "yards_red": 345},
    {"hole": 15, "par": 3, "stroke_index": 15, "yards_blue": 168, "yards_yellow": 155, "yards_red": 142},
    {"hole": 16, "par": 5, "stroke_index": 5, "yards_blue": 508, "yards_yellow": 485, "yards_red": 448},
    {"hole": 17, "par": 3, "stroke_index": 17, "yards_blue": 148, "yards_yellow": 138, "yards_red": 125},
    {"hole": 18, "par": 4, "stroke_index": 6, "yards_blue": 355, "yards_yellow": 338, "yards_red": 310}
  ]'::jsonb,
  '[
    {"name": "Blue", "color": "blue", "gender": "mens", "rating": 72.0, "slope": 131, "par": 70, "yards": 5806},
    {"name": "Yellow", "color": "yellow", "gender": "mens", "rating": 71.0, "slope": 129, "par": 70, "yards": 5562},
    {"name": "Red", "color": "red", "gender": "ladies", "rating": 74.0, "slope": 131, "par": 70, "yards": 5192}
  ]'::jsonb
)
ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name,
  tees = EXCLUDED.tees,
  holes = EXCLUDED.holes,
  updated_at = NOW();
