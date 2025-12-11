-- ============================================
-- SEED DATA FOR SAM ADDISON-KAY
-- ============================================
-- This script creates test data for the existing user:
-- Name: Sam Addison-Kay
-- UUID: ca7c2924-39e8-4b66-bbb8-d9699adb3d65
--
-- Run this in Supabase SQL Editor (Dashboard > SQL Editor)
-- This will work with RLS enabled for Sam's auth session
-- ============================================

-- Use consistent UUIDs for easy reference
-- Sam's UUID (already exists in auth.users and players)
-- ca7c2924-39e8-4b66-bbb8-d9699adb3d65

-- ============================================
-- 1. UPDATE SAM'S PLAYER PROFILE (if needed)
-- ============================================
UPDATE players
SET
  handicap = 10.2,
  updated_at = NOW()
WHERE id = 'ca7c2924-39e8-4b66-bbb8-d9699adb3d65';

-- ============================================
-- 2. COURSES (3 Australian courses)
-- ============================================

-- Course 1: Royal Melbourne (VIC)
INSERT INTO courses (id, source, name, state, city, address, holes, slope_rating, course_rating, created_at, updated_at)
VALUES (
  '10000000-0000-0000-0000-000000000001',
  'manual',
  'Royal Melbourne Golf Club',
  'VIC',
  'Black Rock',
  '359 Cheltenham Rd, Black Rock VIC 3193',
  '[
    {"number": 1, "par": 4, "strokeIndex": 7, "yardages": {"blue": 425, "white": 400, "red": 350}},
    {"number": 2, "par": 5, "strokeIndex": 3, "yardages": {"blue": 530, "white": 505, "red": 460}},
    {"number": 3, "par": 3, "strokeIndex": 15, "yardages": {"blue": 175, "white": 160, "red": 140}},
    {"number": 4, "par": 4, "strokeIndex": 1, "yardages": {"blue": 450, "white": 425, "red": 380}},
    {"number": 5, "par": 4, "strokeIndex": 9, "yardages": {"blue": 390, "white": 370, "red": 330}},
    {"number": 6, "par": 3, "strokeIndex": 17, "yardages": {"blue": 155, "white": 140, "red": 120}},
    {"number": 7, "par": 5, "strokeIndex": 5, "yardages": {"blue": 555, "white": 530, "red": 485}},
    {"number": 8, "par": 4, "strokeIndex": 11, "yardages": {"blue": 380, "white": 360, "red": 320}},
    {"number": 9, "par": 4, "strokeIndex": 13, "yardages": {"blue": 400, "white": 380, "red": 340}},
    {"number": 10, "par": 4, "strokeIndex": 8, "yardages": {"blue": 415, "white": 395, "red": 355}},
    {"number": 11, "par": 3, "strokeIndex": 16, "yardages": {"blue": 165, "white": 150, "red": 130}},
    {"number": 12, "par": 5, "strokeIndex": 4, "yardages": {"blue": 545, "white": 520, "red": 475}},
    {"number": 13, "par": 4, "strokeIndex": 2, "yardages": {"blue": 440, "white": 415, "red": 370}},
    {"number": 14, "par": 4, "strokeIndex": 10, "yardages": {"blue": 385, "white": 365, "red": 325}},
    {"number": 15, "par": 4, "strokeIndex": 12, "yardages": {"blue": 395, "white": 375, "red": 335}},
    {"number": 16, "par": 3, "strokeIndex": 18, "yardages": {"blue": 145, "white": 130, "red": 110}},
    {"number": 17, "par": 5, "strokeIndex": 6, "yardages": {"blue": 520, "white": 495, "red": 450}},
    {"number": 18, "par": 4, "strokeIndex": 14, "yardages": {"blue": 410, "white": 390, "red": 350}}
  ]'::jsonb,
  135,
  72.5,
  NOW(),
  NOW()
)
ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name,
  holes = EXCLUDED.holes,
  updated_at = NOW();

-- Course 2: New South Wales Golf Club (NSW)
INSERT INTO courses (id, source, name, state, city, address, holes, slope_rating, course_rating, created_at, updated_at)
VALUES (
  '10000000-0000-0000-0000-000000000002',
  'manual',
  'New South Wales Golf Club',
  'NSW',
  'La Perouse',
  'Henry Head, La Perouse NSW 2036',
  '[
    {"number": 1, "par": 4, "strokeIndex": 11, "yardages": {"blue": 365, "white": 345, "red": 310}},
    {"number": 2, "par": 4, "strokeIndex": 5, "yardages": {"blue": 415, "white": 395, "red": 355}},
    {"number": 3, "par": 3, "strokeIndex": 17, "yardages": {"blue": 160, "white": 145, "red": 125}},
    {"number": 4, "par": 4, "strokeIndex": 3, "yardages": {"blue": 435, "white": 410, "red": 370}},
    {"number": 5, "par": 5, "strokeIndex": 7, "yardages": {"blue": 510, "white": 485, "red": 445}},
    {"number": 6, "par": 3, "strokeIndex": 13, "yardages": {"blue": 185, "white": 170, "red": 150}},
    {"number": 7, "par": 4, "strokeIndex": 1, "yardages": {"blue": 455, "white": 430, "red": 390}},
    {"number": 8, "par": 4, "strokeIndex": 9, "yardages": {"blue": 380, "white": 360, "red": 325}},
    {"number": 9, "par": 5, "strokeIndex": 15, "yardages": {"blue": 495, "white": 470, "red": 430}},
    {"number": 10, "par": 4, "strokeIndex": 6, "yardages": {"blue": 400, "white": 380, "red": 345}},
    {"number": 11, "par": 4, "strokeIndex": 2, "yardages": {"blue": 445, "white": 420, "red": 380}},
    {"number": 12, "par": 3, "strokeIndex": 18, "yardages": {"blue": 140, "white": 125, "red": 110}},
    {"number": 13, "par": 5, "strokeIndex": 10, "yardages": {"blue": 535, "white": 510, "red": 465}},
    {"number": 14, "par": 4, "strokeIndex": 4, "yardages": {"blue": 420, "white": 400, "red": 360}},
    {"number": 15, "par": 4, "strokeIndex": 8, "yardages": {"blue": 390, "white": 370, "red": 335}},
    {"number": 16, "par": 3, "strokeIndex": 16, "yardages": {"blue": 170, "white": 155, "red": 135}},
    {"number": 17, "par": 4, "strokeIndex": 12, "yardages": {"blue": 375, "white": 355, "red": 320}},
    {"number": 18, "par": 5, "strokeIndex": 14, "yardages": {"blue": 525, "white": 500, "red": 460}}
  ]'::jsonb,
  138,
  73.2,
  NOW(),
  NOW()
)
ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name,
  holes = EXCLUDED.holes,
  updated_at = NOW();

-- Course 3: Kingston Heath (VIC)
INSERT INTO courses (id, source, name, state, city, address, holes, slope_rating, course_rating, created_at, updated_at)
VALUES (
  '10000000-0000-0000-0000-000000000003',
  'manual',
  'Kingston Heath Golf Club',
  'VIC',
  'Cheltenham',
  '204 Kingston Rd, Heatherton VIC 3202',
  '[
    {"number": 1, "par": 4, "strokeIndex": 5, "yardages": {"blue": 410, "white": 385, "red": 345}},
    {"number": 2, "par": 4, "strokeIndex": 9, "yardages": {"blue": 375, "white": 355, "red": 320}},
    {"number": 3, "par": 5, "strokeIndex": 1, "yardages": {"blue": 545, "white": 520, "red": 475}},
    {"number": 4, "par": 3, "strokeIndex": 15, "yardages": {"blue": 165, "white": 150, "red": 130}},
    {"number": 5, "par": 4, "strokeIndex": 7, "yardages": {"blue": 420, "white": 400, "red": 360}},
    {"number": 6, "par": 4, "strokeIndex": 3, "yardages": {"blue": 435, "white": 410, "red": 370}},
    {"number": 7, "par": 3, "strokeIndex": 17, "yardages": {"blue": 155, "white": 140, "red": 120}},
    {"number": 8, "par": 5, "strokeIndex": 11, "yardages": {"blue": 510, "white": 485, "red": 440}},
    {"number": 9, "par": 4, "strokeIndex": 13, "yardages": {"blue": 385, "white": 365, "red": 330}},
    {"number": 10, "par": 4, "strokeIndex": 6, "yardages": {"blue": 405, "white": 385, "red": 350}},
    {"number": 11, "par": 4, "strokeIndex": 4, "yardages": {"blue": 430, "white": 405, "red": 365}},
    {"number": 12, "par": 3, "strokeIndex": 16, "yardages": {"blue": 175, "white": 160, "red": 140}},
    {"number": 13, "par": 4, "strokeIndex": 2, "yardages": {"blue": 445, "white": 420, "red": 380}},
    {"number": 14, "par": 5, "strokeIndex": 10, "yardages": {"blue": 525, "white": 500, "red": 455}},
    {"number": 15, "par": 3, "strokeIndex": 18, "yardages": {"blue": 145, "white": 130, "red": 115}},
    {"number": 16, "par": 4, "strokeIndex": 8, "yardages": {"blue": 395, "white": 375, "red": 340}},
    {"number": 17, "par": 4, "strokeIndex": 12, "yardages": {"blue": 380, "white": 360, "red": 325}},
    {"number": 18, "par": 4, "strokeIndex": 14, "yardages": {"blue": 400, "white": 380, "red": 345}}
  ]'::jsonb,
  132,
  72.0,
  NOW(),
  NOW()
)
ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name,
  holes = EXCLUDED.holes,
  updated_at = NOW();

-- ============================================
-- 3. COMPETITIONS (3 competitions at different stages)
-- ============================================

-- Competition 1: COMPLETED - Summer Classic 2024
INSERT INTO competitions (id, name, description, start_date, end_date, handicap_system, visibility, invite_code, organizer_id, status, created_at, updated_at)
VALUES (
  '20000000-0000-0000-0000-000000000001',
  'Summer Classic 2024',
  'Annual summer golf competition at Royal Melbourne. A great day out with friends!',
  '2024-11-15',
  '2024-11-15',
  'honor',
  'private',
  'SUMMER24',
  'ca7c2924-39e8-4b66-bbb8-d9699adb3d65',
  'completed',
  NOW() - INTERVAL '30 days',
  NOW() - INTERVAL '22 days'
)
ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name,
  status = EXCLUDED.status,
  updated_at = NOW();

-- Competition 2: IN-PROGRESS - Sydney Open 2024
INSERT INTO competitions (id, name, description, start_date, end_date, handicap_system, visibility, invite_code, organizer_id, status, created_at, updated_at)
VALUES (
  '20000000-0000-0000-0000-000000000002',
  'Sydney Coastal Challenge',
  'Beautiful round at NSW Golf Club overlooking the ocean. Currently in progress!',
  CURRENT_DATE,
  CURRENT_DATE,
  'honor',
  'private',
  'SYDNEY24',
  'ca7c2924-39e8-4b66-bbb8-d9699adb3d65',
  'in-progress',
  NOW() - INTERVAL '7 days',
  NOW()
)
ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name,
  status = EXCLUDED.status,
  start_date = CURRENT_DATE,
  updated_at = NOW();

-- Competition 3: UPCOMING - Kingston Heath Classic
INSERT INTO competitions (id, name, description, start_date, end_date, handicap_system, visibility, invite_code, organizer_id, status, created_at, updated_at)
VALUES (
  '20000000-0000-0000-0000-000000000003',
  'Kingston Heath Classic',
  'Looking forward to tackling one of Australia''s finest courses next weekend!',
  CURRENT_DATE + INTERVAL '7 days',
  CURRENT_DATE + INTERVAL '7 days',
  'honor',
  'private',
  'KINGSTON',
  'ca7c2924-39e8-4b66-bbb8-d9699adb3d65',
  'upcoming',
  NOW() - INTERVAL '3 days',
  NOW()
)
ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name,
  status = EXCLUDED.status,
  start_date = CURRENT_DATE + INTERVAL '7 days',
  updated_at = NOW();

-- ============================================
-- 4. ROUNDS
-- ============================================

-- Round 1: Summer Classic (COMPLETED)
INSERT INTO rounds (id, competition_id, round_number, course_id, date, game_type, status, created_at, updated_at)
VALUES (
  '30000000-0000-0000-0000-000000000001',
  '20000000-0000-0000-0000-000000000001',
  1,
  '10000000-0000-0000-0000-000000000001', -- Royal Melbourne
  '2024-11-15',
  'stableford',
  'completed',
  NOW() - INTERVAL '30 days',
  NOW() - INTERVAL '22 days'
)
ON CONFLICT (id) DO UPDATE SET
  status = EXCLUDED.status,
  updated_at = NOW();

-- Round 2: Sydney Coastal (IN-PROGRESS)
INSERT INTO rounds (id, competition_id, round_number, course_id, date, game_type, status, created_at, updated_at)
VALUES (
  '30000000-0000-0000-0000-000000000002',
  '20000000-0000-0000-0000-000000000002',
  1,
  '10000000-0000-0000-0000-000000000002', -- NSW Golf Club
  CURRENT_DATE,
  'stableford',
  'in-progress',
  NOW() - INTERVAL '7 days',
  NOW()
)
ON CONFLICT (id) DO UPDATE SET
  status = EXCLUDED.status,
  date = CURRENT_DATE,
  updated_at = NOW();

-- Round 3: Kingston Heath (UPCOMING)
INSERT INTO rounds (id, competition_id, round_number, course_id, date, game_type, status, created_at, updated_at)
VALUES (
  '30000000-0000-0000-0000-000000000003',
  '20000000-0000-0000-0000-000000000003',
  1,
  '10000000-0000-0000-0000-000000000003', -- Kingston Heath
  CURRENT_DATE + INTERVAL '7 days',
  'stableford',
  'upcoming',
  NOW() - INTERVAL '3 days',
  NOW()
)
ON CONFLICT (id) DO UPDATE SET
  status = EXCLUDED.status,
  date = CURRENT_DATE + INTERVAL '7 days',
  updated_at = NOW();

-- ============================================
-- 5. COMPETITION PLAYERS (Add Sam to all competitions)
-- ============================================

INSERT INTO competition_players (competition_id, player_id, status, invited_at, responded_at)
VALUES
  ('20000000-0000-0000-0000-000000000001', 'ca7c2924-39e8-4b66-bbb8-d9699adb3d65', 'accepted', NOW() - INTERVAL '30 days', NOW() - INTERVAL '30 days'),
  ('20000000-0000-0000-0000-000000000002', 'ca7c2924-39e8-4b66-bbb8-d9699adb3d65', 'accepted', NOW() - INTERVAL '7 days', NOW() - INTERVAL '7 days'),
  ('20000000-0000-0000-0000-000000000003', 'ca7c2924-39e8-4b66-bbb8-d9699adb3d65', 'accepted', NOW() - INTERVAL '3 days', NOW() - INTERVAL '3 days')
ON CONFLICT (competition_id, player_id) DO UPDATE SET
  status = EXCLUDED.status,
  responded_at = NOW();

-- ============================================
-- 6. SCORECARDS
-- ============================================

-- Scorecard 1: Summer Classic - COMPLETED (Great round! 38 points)
INSERT INTO scorecards (id, round_id, player_id, scores, total_gross, total_net, total_points, status, submitted_at, submitted_by, created_at, updated_at)
VALUES (
  '40000000-0000-0000-0000-000000000001',
  '30000000-0000-0000-0000-000000000001',
  'ca7c2924-39e8-4b66-bbb8-d9699adb3d65',
  '{
    "1": {"strokes": 5, "putts": 2},
    "2": {"strokes": 6, "putts": 2},
    "3": {"strokes": 3, "putts": 1},
    "4": {"strokes": 5, "putts": 2},
    "5": {"strokes": 4, "putts": 2},
    "6": {"strokes": 3, "putts": 2},
    "7": {"strokes": 6, "putts": 2},
    "8": {"strokes": 5, "putts": 2},
    "9": {"strokes": 4, "putts": 2},
    "10": {"strokes": 5, "putts": 2},
    "11": {"strokes": 3, "putts": 1},
    "12": {"strokes": 6, "putts": 2},
    "13": {"strokes": 5, "putts": 2},
    "14": {"strokes": 4, "putts": 2},
    "15": {"strokes": 5, "putts": 2},
    "16": {"strokes": 3, "putts": 2},
    "17": {"strokes": 6, "putts": 2},
    "18": {"strokes": 4, "putts": 2}
  }'::jsonb,
  82,
  68,
  38,
  'completed',
  NOW() - INTERVAL '22 days',
  'ca7c2924-39e8-4b66-bbb8-d9699adb3d65',
  NOW() - INTERVAL '22 days',
  NOW() - INTERVAL '22 days'
)
ON CONFLICT (id) DO UPDATE SET
  scores = EXCLUDED.scores,
  total_gross = EXCLUDED.total_gross,
  total_net = EXCLUDED.total_net,
  total_points = EXCLUDED.total_points,
  status = EXCLUDED.status,
  updated_at = NOW();

-- Scorecard 2: Sydney Coastal - IN-PROGRESS (Through 12 holes, 26 points so far)
INSERT INTO scorecards (id, round_id, player_id, scores, total_gross, total_net, total_points, status, submitted_at, submitted_by, created_at, updated_at)
VALUES (
  '40000000-0000-0000-0000-000000000002',
  '30000000-0000-0000-0000-000000000002',
  'ca7c2924-39e8-4b66-bbb8-d9699adb3d65',
  '{
    "1": {"strokes": 5, "putts": 2},
    "2": {"strokes": 5, "putts": 2},
    "3": {"strokes": 4, "putts": 2},
    "4": {"strokes": 5, "putts": 2},
    "5": {"strokes": 6, "putts": 2},
    "6": {"strokes": 3, "putts": 1},
    "7": {"strokes": 5, "putts": 2},
    "8": {"strokes": 4, "putts": 2},
    "9": {"strokes": 6, "putts": 2},
    "10": {"strokes": 5, "putts": 2},
    "11": {"strokes": 5, "putts": 2},
    "12": {"strokes": 3, "putts": 1}
  }'::jsonb,
  56,
  48,
  26,
  'in-progress',
  NULL,
  NULL,
  NOW() - INTERVAL '4 hours',
  NOW()
)
ON CONFLICT (id) DO UPDATE SET
  scores = EXCLUDED.scores,
  total_gross = EXCLUDED.total_gross,
  total_net = EXCLUDED.total_net,
  total_points = EXCLUDED.total_points,
  status = EXCLUDED.status,
  updated_at = NOW();

-- Scorecard 3: Kingston Heath - NOT STARTED (upcoming)
INSERT INTO scorecards (id, round_id, player_id, scores, total_gross, total_net, total_points, status, submitted_at, submitted_by, created_at, updated_at)
VALUES (
  '40000000-0000-0000-0000-000000000003',
  '30000000-0000-0000-0000-000000000003',
  'ca7c2924-39e8-4b66-bbb8-d9699adb3d65',
  '{}'::jsonb,
  0,
  0,
  0,
  'not-started',
  NULL,
  NULL,
  NOW(),
  NOW()
)
ON CONFLICT (id) DO UPDATE SET
  status = EXCLUDED.status,
  updated_at = NOW();

-- ============================================
-- VERIFICATION QUERIES
-- ============================================

-- Check Sam's player profile
SELECT id, name, email, handicap FROM players
WHERE id = 'ca7c2924-39e8-4b66-bbb8-d9699adb3d65';

-- Check all competitions Sam is organizing
SELECT c.id, c.name, c.status, c.invite_code, c.start_date
FROM competitions c
WHERE c.organizer_id = 'ca7c2924-39e8-4b66-bbb8-d9699adb3d65'
ORDER BY c.start_date DESC;

-- Check Sam's scorecards with round and competition info
SELECT
  c.name as competition,
  r.date,
  co.name as course,
  s.total_points,
  s.total_gross,
  s.status as scorecard_status,
  jsonb_object_keys(s.scores) as holes_played
FROM scorecards s
JOIN rounds r ON s.round_id = r.id
JOIN competitions c ON r.competition_id = c.id
JOIN courses co ON r.course_id = co.id
WHERE s.player_id = 'ca7c2924-39e8-4b66-bbb8-d9699adb3d65';

-- Summary
SELECT
  'Courses' as entity, COUNT(*) as count FROM courses WHERE id::text LIKE '10000000%'
UNION ALL
SELECT 'Competitions', COUNT(*) FROM competitions WHERE organizer_id = 'ca7c2924-39e8-4b66-bbb8-d9699adb3d65'
UNION ALL
SELECT 'Rounds', COUNT(*) FROM rounds WHERE id::text LIKE '30000000%'
UNION ALL
SELECT 'Scorecards', COUNT(*) FROM scorecards WHERE player_id = 'ca7c2924-39e8-4b66-bbb8-d9699adb3d65';
