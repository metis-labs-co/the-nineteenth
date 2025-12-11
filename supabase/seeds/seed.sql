-- ============================================
-- DUMMY DATA FOR THE NINETEENTH GOLF APP
-- ============================================
-- Run this in Supabase SQL Editor
-- Note: You may need to disable RLS temporarily or run as service role
-- ============================================

-- First, let's generate some UUIDs for consistency
-- We'll use fixed UUIDs so relationships work properly

-- ============================================
-- 0. AUTH USERS - IMPORTANT NOTE
-- ============================================
-- DO NOT insert directly into auth.users via SQL!
-- Supabase Auth requires users to be created via its API.
--
-- To create test users:
-- 1. Go to Supabase Dashboard -> Authentication -> Users
-- 2. Click "Add User" -> "Create New User"
-- 3. Create users with these emails (password: password123):
--    - sam@example.com
--    - james@example.com
--    - david@example.com
--    - michael@example.com
--    - tom@example.com
--    - chris@example.com
--    - ben@example.com
--    - nick@example.com
--
-- After creating users in Dashboard, note their UUIDs and update
-- the player IDs below to match, OR use the trigger to auto-create
-- player profiles on signup.
--
-- For quick testing, just create ONE user via Dashboard and use
-- that to test the app flow.
-- ============================================


-- ============================================
-- 1. PLAYERS (8 players for a good competition)
-- ============================================

INSERT INTO players (id, name, email, phone, handicap, created_at, updated_at)
VALUES
  ('11111111-1111-1111-1111-111111111111', 'Sam Mitchell', 'sam@example.com', '0412345678', 12.5, NOW(), NOW()),
  ('22222222-2222-2222-2222-222222222222', 'James Wilson', 'james@example.com', '0423456789', 8.0, NOW(), NOW()),
  ('33333333-3333-3333-3333-333333333333', 'David Chen', 'david@example.com', '0434567890', 18.2, NOW(), NOW()),
  ('44444444-4444-4444-4444-444444444444', 'Michael Brown', 'michael@example.com', '0445678901', 24.0, NOW(), NOW()),
  ('55555555-5555-5555-5555-555555555555', 'Tom Anderson', 'tom@example.com', '0456789012', 15.3, NOW(), NOW()),
  ('66666666-6666-6666-6666-666666666666', 'Chris Taylor', 'chris@example.com', '0467890123', 10.8, NOW(), NOW()),
  ('77777777-7777-7777-7777-777777777777', 'Ben Roberts', 'ben@example.com', '0478901234', 20.5, NOW(), NOW()),
  ('88888888-8888-8888-8888-888888888888', 'Nick Thompson', 'nick@example.com', '0489012345', 6.2, NOW(), NOW())
ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name,
  email = EXCLUDED.email,
  handicap = EXCLUDED.handicap,
  updated_at = NOW();


-- ============================================
-- 2. COURSES (2 Australian courses)
-- ============================================

INSERT INTO courses (id, source, name, state, city, address, holes, slope_rating, course_rating, created_at, updated_at)
VALUES
  (
    'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
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
  ),
  (
    'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb',
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


-- ============================================
-- 3. COMPETITIONS (2 competitions)
-- ============================================

INSERT INTO competitions (id, name, description, start_date, end_date, handicap_system, visibility, invite_code, organizer_id, status, created_at, updated_at)
VALUES
  (
    'cccccccc-cccc-cccc-cccc-cccccccccccc',
    'Summer Classic 2025',
    'Annual summer golf competition at Royal Melbourne. 18 holes of Stableford fun!',
    '2025-01-15',
    '2025-01-15',
    'honor',
    'private',
    'SUMMER-2025',
    '11111111-1111-1111-1111-111111111111',
    'in-progress',
    NOW(),
    NOW()
  ),
  (
    'dddddddd-dddd-dddd-dddd-dddddddddddd',
    'Sydney Winter Cup',
    'Beat the winter blues with 18 holes at NSW Golf Club.',
    '2025-06-20',
    '2025-06-20',
    'honor',
    'private',
    'WINTER-2025',
    '22222222-2222-2222-2222-222222222222',
    'upcoming',
    NOW(),
    NOW()
  )
ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name,
  status = EXCLUDED.status,
  updated_at = NOW();


-- ============================================
-- 4. ROUNDS
-- ============================================

INSERT INTO rounds (id, competition_id, round_number, course_id, date, game_type, status, created_at, updated_at)
VALUES
  (
    'eeeeeeee-eeee-eeee-eeee-eeeeeeeeeeee',
    'cccccccc-cccc-cccc-cccc-cccccccccccc',
    1,
    'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
    '2025-01-15',
    'stableford',
    'in-progress',
    NOW(),
    NOW()
  ),
  (
    'ffffffff-ffff-ffff-ffff-ffffffffffff',
    'dddddddd-dddd-dddd-dddd-dddddddddddd',
    1,
    'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb',
    '2025-06-20',
    'stableford',
    'upcoming',
    NOW(),
    NOW()
  )
ON CONFLICT (id) DO UPDATE SET
  status = EXCLUDED.status,
  updated_at = NOW();


-- ============================================
-- 5. COMPETITION PLAYERS
-- ============================================

-- Summer Classic 2025 - All 8 players
INSERT INTO competition_players (competition_id, player_id, status, invited_at, responded_at)
VALUES
  ('cccccccc-cccc-cccc-cccc-cccccccccccc', '11111111-1111-1111-1111-111111111111', 'accepted', NOW(), NOW()),
  ('cccccccc-cccc-cccc-cccc-cccccccccccc', '22222222-2222-2222-2222-222222222222', 'accepted', NOW(), NOW()),
  ('cccccccc-cccc-cccc-cccc-cccccccccccc', '33333333-3333-3333-3333-333333333333', 'accepted', NOW(), NOW()),
  ('cccccccc-cccc-cccc-cccc-cccccccccccc', '44444444-4444-4444-4444-444444444444', 'accepted', NOW(), NOW()),
  ('cccccccc-cccc-cccc-cccc-cccccccccccc', '55555555-5555-5555-5555-555555555555', 'accepted', NOW(), NOW()),
  ('cccccccc-cccc-cccc-cccc-cccccccccccc', '66666666-6666-6666-6666-666666666666', 'accepted', NOW(), NOW()),
  ('cccccccc-cccc-cccc-cccc-cccccccccccc', '77777777-7777-7777-7777-777777777777', 'accepted', NOW(), NOW()),
  ('cccccccc-cccc-cccc-cccc-cccccccccccc', '88888888-8888-8888-8888-888888888888', 'accepted', NOW(), NOW())
ON CONFLICT (competition_id, player_id) DO UPDATE SET
  status = EXCLUDED.status,
  responded_at = NOW();

-- Sydney Winter Cup - 6 players
INSERT INTO competition_players (competition_id, player_id, status, invited_at, responded_at)
VALUES
  ('dddddddd-dddd-dddd-dddd-dddddddddddd', '22222222-2222-2222-2222-222222222222', 'accepted', NOW(), NOW()),
  ('dddddddd-dddd-dddd-dddd-dddddddddddd', '33333333-3333-3333-3333-333333333333', 'accepted', NOW(), NOW()),
  ('dddddddd-dddd-dddd-dddd-dddddddddddd', '55555555-5555-5555-5555-555555555555', 'accepted', NOW(), NOW()),
  ('dddddddd-dddd-dddd-dddd-dddddddddddd', '66666666-6666-6666-6666-666666666666', 'accepted', NOW(), NOW()),
  ('dddddddd-dddd-dddd-dddd-dddddddddddd', '77777777-7777-7777-7777-777777777777', 'invited', NOW(), NULL),
  ('dddddddd-dddd-dddd-dddd-dddddddddddd', '88888888-8888-8888-8888-888888888888', 'invited', NOW(), NULL)
ON CONFLICT (competition_id, player_id) DO UPDATE SET
  status = EXCLUDED.status;


-- ============================================
-- 6. PAIRINGS (2 groups of 4 for Summer Classic)
-- ============================================

INSERT INTO pairings (id, round_id, player_ids, tee_time, created_at, updated_at)
VALUES
  (
    '11111111-aaaa-aaaa-aaaa-111111111111',
    'eeeeeeee-eeee-eeee-eeee-eeeeeeeeeeee',
    ARRAY['11111111-1111-1111-1111-111111111111', '22222222-2222-2222-2222-222222222222', '33333333-3333-3333-3333-333333333333', '44444444-4444-4444-4444-444444444444']::UUID[],
    '07:30:00',
    NOW(),
    NOW()
  ),
  (
    '22222222-bbbb-bbbb-bbbb-222222222222',
    'eeeeeeee-eeee-eeee-eeee-eeeeeeeeeeee',
    ARRAY['55555555-5555-5555-5555-555555555555', '66666666-6666-6666-6666-666666666666', '77777777-7777-7777-7777-777777777777', '88888888-8888-8888-8888-888888888888']::UUID[],
    '07:40:00',
    NOW(),
    NOW()
  )
ON CONFLICT (id) DO UPDATE SET
  player_ids = EXCLUDED.player_ids,
  updated_at = NOW();


-- ============================================
-- 7. SCORECARDS (with realistic scores)
-- ============================================

-- Player 1: Sam Mitchell (HC 12.5) - Completed round, 36 points
INSERT INTO scorecards (id, round_id, player_id, scores, total_gross, total_net, total_points, status, submitted_at, submitted_by, created_at, updated_at)
VALUES (
  'a1111111-1111-1111-1111-111111111111',
  'eeeeeeee-eeee-eeee-eeee-eeeeeeeeeeee',
  '11111111-1111-1111-1111-111111111111',
  '{
    "1": {"strokes": 5, "putts": 2},
    "2": {"strokes": 6, "putts": 2},
    "3": {"strokes": 4, "putts": 2},
    "4": {"strokes": 5, "putts": 2},
    "5": {"strokes": 5, "putts": 2},
    "6": {"strokes": 3, "putts": 1},
    "7": {"strokes": 6, "putts": 2},
    "8": {"strokes": 5, "putts": 2},
    "9": {"strokes": 4, "putts": 2},
    "10": {"strokes": 5, "putts": 2},
    "11": {"strokes": 3, "putts": 2},
    "12": {"strokes": 6, "putts": 2},
    "13": {"strokes": 5, "putts": 2},
    "14": {"strokes": 4, "putts": 2},
    "15": {"strokes": 5, "putts": 2},
    "16": {"strokes": 3, "putts": 2},
    "17": {"strokes": 6, "putts": 2},
    "18": {"strokes": 5, "putts": 2}
  }'::jsonb,
  85,
  73,
  36,
  'completed',
  NOW() - INTERVAL '2 hours',
  '11111111-1111-1111-1111-111111111111',
  NOW(),
  NOW()
)
ON CONFLICT (id) DO UPDATE SET
  scores = EXCLUDED.scores,
  total_points = EXCLUDED.total_points,
  status = EXCLUDED.status,
  updated_at = NOW();

-- Player 2: James Wilson (HC 8.0) - Completed round, 38 points (leading!)
INSERT INTO scorecards (id, round_id, player_id, scores, total_gross, total_net, total_points, status, submitted_at, submitted_by, created_at, updated_at)
VALUES (
  'a2222222-2222-2222-2222-222222222222',
  'eeeeeeee-eeee-eeee-eeee-eeeeeeeeeeee',
  '22222222-2222-2222-2222-222222222222',
  '{
    "1": {"strokes": 4, "putts": 2},
    "2": {"strokes": 5, "putts": 2},
    "3": {"strokes": 3, "putts": 1},
    "4": {"strokes": 5, "putts": 2},
    "5": {"strokes": 4, "putts": 2},
    "6": {"strokes": 3, "putts": 2},
    "7": {"strokes": 5, "putts": 2},
    "8": {"strokes": 4, "putts": 2},
    "9": {"strokes": 4, "putts": 2},
    "10": {"strokes": 4, "putts": 2},
    "11": {"strokes": 3, "putts": 2},
    "12": {"strokes": 5, "putts": 2},
    "13": {"strokes": 4, "putts": 2},
    "14": {"strokes": 4, "putts": 2},
    "15": {"strokes": 4, "putts": 2},
    "16": {"strokes": 3, "putts": 2},
    "17": {"strokes": 5, "putts": 2},
    "18": {"strokes": 4, "putts": 2}
  }'::jsonb,
  73,
  65,
  38,
  'completed',
  NOW() - INTERVAL '2 hours',
  '22222222-2222-2222-2222-222222222222',
  NOW(),
  NOW()
)
ON CONFLICT (id) DO UPDATE SET
  scores = EXCLUDED.scores,
  total_points = EXCLUDED.total_points,
  status = EXCLUDED.status,
  updated_at = NOW();

-- Player 3: David Chen (HC 18.2) - Completed round, 34 points
INSERT INTO scorecards (id, round_id, player_id, scores, total_gross, total_net, total_points, status, submitted_at, submitted_by, created_at, updated_at)
VALUES (
  'a3333333-3333-3333-3333-333333333333',
  'eeeeeeee-eeee-eeee-eeee-eeeeeeeeeeee',
  '33333333-3333-3333-3333-333333333333',
  '{
    "1": {"strokes": 6, "putts": 2},
    "2": {"strokes": 7, "putts": 3},
    "3": {"strokes": 4, "putts": 2},
    "4": {"strokes": 6, "putts": 2},
    "5": {"strokes": 5, "putts": 2},
    "6": {"strokes": 4, "putts": 2},
    "7": {"strokes": 7, "putts": 2},
    "8": {"strokes": 5, "putts": 2},
    "9": {"strokes": 5, "putts": 2},
    "10": {"strokes": 5, "putts": 2},
    "11": {"strokes": 4, "putts": 2},
    "12": {"strokes": 7, "putts": 3},
    "13": {"strokes": 6, "putts": 2},
    "14": {"strokes": 5, "putts": 2},
    "15": {"strokes": 5, "putts": 2},
    "16": {"strokes": 4, "putts": 2},
    "17": {"strokes": 6, "putts": 2},
    "18": {"strokes": 5, "putts": 2}
  }'::jsonb,
  96,
  78,
  34,
  'completed',
  NOW() - INTERVAL '1 hour',
  '11111111-1111-1111-1111-111111111111',
  NOW(),
  NOW()
)
ON CONFLICT (id) DO UPDATE SET
  scores = EXCLUDED.scores,
  total_points = EXCLUDED.total_points,
  status = EXCLUDED.status,
  updated_at = NOW();

-- Player 4: Michael Brown (HC 24.0) - In progress, through 12 holes
INSERT INTO scorecards (id, round_id, player_id, scores, total_gross, total_net, total_points, status, submitted_at, submitted_by, created_at, updated_at)
VALUES (
  'a4444444-4444-4444-4444-444444444444',
  'eeeeeeee-eeee-eeee-eeee-eeeeeeeeeeee',
  '44444444-4444-4444-4444-444444444444',
  '{
    "1": {"strokes": 6, "putts": 2},
    "2": {"strokes": 7, "putts": 2},
    "3": {"strokes": 5, "putts": 2},
    "4": {"strokes": 7, "putts": 3},
    "5": {"strokes": 6, "putts": 2},
    "6": {"strokes": 4, "putts": 2},
    "7": {"strokes": 7, "putts": 2},
    "8": {"strokes": 6, "putts": 2},
    "9": {"strokes": 6, "putts": 2},
    "10": {"strokes": 6, "putts": 2},
    "11": {"strokes": 4, "putts": 2},
    "12": {"strokes": 7, "putts": 2}
  }'::jsonb,
  71,
  59,
  24,
  'in-progress',
  NULL,
  NULL,
  NOW(),
  NOW()
)
ON CONFLICT (id) DO UPDATE SET
  scores = EXCLUDED.scores,
  total_points = EXCLUDED.total_points,
  status = EXCLUDED.status,
  updated_at = NOW();

-- Player 5: Tom Anderson (HC 15.3) - Completed, 35 points
INSERT INTO scorecards (id, round_id, player_id, scores, total_gross, total_net, total_points, status, submitted_at, submitted_by, created_at, updated_at)
VALUES (
  'a5555555-5555-5555-5555-555555555555',
  'eeeeeeee-eeee-eeee-eeee-eeeeeeeeeeee',
  '55555555-5555-5555-5555-555555555555',
  '{
    "1": {"strokes": 5, "putts": 2},
    "2": {"strokes": 6, "putts": 2},
    "3": {"strokes": 4, "putts": 2},
    "4": {"strokes": 5, "putts": 2},
    "5": {"strokes": 5, "putts": 2},
    "6": {"strokes": 3, "putts": 2},
    "7": {"strokes": 6, "putts": 2},
    "8": {"strokes": 5, "putts": 2},
    "9": {"strokes": 5, "putts": 2},
    "10": {"strokes": 5, "putts": 2},
    "11": {"strokes": 3, "putts": 1},
    "12": {"strokes": 6, "putts": 2},
    "13": {"strokes": 5, "putts": 2},
    "14": {"strokes": 5, "putts": 2},
    "15": {"strokes": 5, "putts": 2},
    "16": {"strokes": 4, "putts": 2},
    "17": {"strokes": 6, "putts": 2},
    "18": {"strokes": 5, "putts": 2}
  }'::jsonb,
  88,
  73,
  35,
  'completed',
  NOW() - INTERVAL '90 minutes',
  '55555555-5555-5555-5555-555555555555',
  NOW(),
  NOW()
)
ON CONFLICT (id) DO UPDATE SET
  scores = EXCLUDED.scores,
  total_points = EXCLUDED.total_points,
  status = EXCLUDED.status,
  updated_at = NOW();

-- Player 6: Chris Taylor (HC 10.8) - Completed, 37 points
INSERT INTO scorecards (id, round_id, player_id, scores, total_gross, total_net, total_points, status, submitted_at, submitted_by, created_at, updated_at)
VALUES (
  'a6666666-6666-6666-6666-666666666666',
  'eeeeeeee-eeee-eeee-eeee-eeeeeeeeeeee',
  '66666666-6666-6666-6666-666666666666',
  '{
    "1": {"strokes": 5, "putts": 2},
    "2": {"strokes": 5, "putts": 2},
    "3": {"strokes": 3, "putts": 1},
    "4": {"strokes": 5, "putts": 2},
    "5": {"strokes": 4, "putts": 2},
    "6": {"strokes": 3, "putts": 2},
    "7": {"strokes": 6, "putts": 2},
    "8": {"strokes": 4, "putts": 2},
    "9": {"strokes": 4, "putts": 2},
    "10": {"strokes": 5, "putts": 2},
    "11": {"strokes": 3, "putts": 2},
    "12": {"strokes": 5, "putts": 2},
    "13": {"strokes": 5, "putts": 2},
    "14": {"strokes": 4, "putts": 2},
    "15": {"strokes": 4, "putts": 2},
    "16": {"strokes": 3, "putts": 2},
    "17": {"strokes": 5, "putts": 2},
    "18": {"strokes": 4, "putts": 2}
  }'::jsonb,
  77,
  66,
  37,
  'completed',
  NOW() - INTERVAL '90 minutes',
  '66666666-6666-6666-6666-666666666666',
  NOW(),
  NOW()
)
ON CONFLICT (id) DO UPDATE SET
  scores = EXCLUDED.scores,
  total_points = EXCLUDED.total_points,
  status = EXCLUDED.status,
  updated_at = NOW();

-- Player 7: Ben Roberts (HC 20.5) - In progress, through 15 holes
INSERT INTO scorecards (id, round_id, player_id, scores, total_gross, total_net, total_points, status, submitted_at, submitted_by, created_at, updated_at)
VALUES (
  'a7777777-7777-7777-7777-777777777777',
  'eeeeeeee-eeee-eeee-eeee-eeeeeeeeeeee',
  '77777777-7777-7777-7777-777777777777',
  '{
    "1": {"strokes": 6, "putts": 2},
    "2": {"strokes": 6, "putts": 2},
    "3": {"strokes": 4, "putts": 2},
    "4": {"strokes": 6, "putts": 2},
    "5": {"strokes": 5, "putts": 2},
    "6": {"strokes": 4, "putts": 2},
    "7": {"strokes": 7, "putts": 3},
    "8": {"strokes": 5, "putts": 2},
    "9": {"strokes": 5, "putts": 2},
    "10": {"strokes": 6, "putts": 2},
    "11": {"strokes": 4, "putts": 2},
    "12": {"strokes": 6, "putts": 2},
    "13": {"strokes": 6, "putts": 2},
    "14": {"strokes": 5, "putts": 2},
    "15": {"strokes": 5, "putts": 2}
  }'::jsonb,
  80,
  60,
  30,
  'in-progress',
  NULL,
  NULL,
  NOW(),
  NOW()
)
ON CONFLICT (id) DO UPDATE SET
  scores = EXCLUDED.scores,
  total_points = EXCLUDED.total_points,
  status = EXCLUDED.status,
  updated_at = NOW();

-- Player 8: Nick Thompson (HC 6.2) - Completed, 39 points (best round!)
INSERT INTO scorecards (id, round_id, player_id, scores, total_gross, total_net, total_points, status, submitted_at, submitted_by, created_at, updated_at)
VALUES (
  'a8888888-8888-8888-8888-888888888888',
  'eeeeeeee-eeee-eeee-eeee-eeeeeeeeeeee',
  '88888888-8888-8888-8888-888888888888',
  '{
    "1": {"strokes": 4, "putts": 2},
    "2": {"strokes": 5, "putts": 2},
    "3": {"strokes": 3, "putts": 1},
    "4": {"strokes": 4, "putts": 2},
    "5": {"strokes": 4, "putts": 2},
    "6": {"strokes": 3, "putts": 2},
    "7": {"strokes": 5, "putts": 2},
    "8": {"strokes": 4, "putts": 2},
    "9": {"strokes": 4, "putts": 2},
    "10": {"strokes": 4, "putts": 2},
    "11": {"strokes": 3, "putts": 1},
    "12": {"strokes": 5, "putts": 2},
    "13": {"strokes": 4, "putts": 2},
    "14": {"strokes": 4, "putts": 2},
    "15": {"strokes": 4, "putts": 2},
    "16": {"strokes": 3, "putts": 2},
    "17": {"strokes": 5, "putts": 2},
    "18": {"strokes": 4, "putts": 2}
  }'::jsonb,
  72,
  66,
  39,
  'completed',
  NOW() - INTERVAL '90 minutes',
  '88888888-8888-8888-8888-888888888888',
  NOW(),
  NOW()
)
ON CONFLICT (id) DO UPDATE SET
  scores = EXCLUDED.scores,
  total_points = EXCLUDED.total_points,
  status = EXCLUDED.status,
  updated_at = NOW();


-- ============================================
-- VERIFICATION QUERIES
-- ============================================

-- Check the leaderboard
SELECT
  p.name,
  p.handicap,
  s.total_gross,
  s.total_net,
  s.total_points,
  s.status
FROM scorecards s
JOIN players p ON p.id = s.player_id
WHERE s.round_id = 'eeeeeeee-eeee-eeee-eeee-eeeeeeeeeeee'
ORDER BY s.total_points DESC, s.total_net ASC;

-- Check competitions
SELECT name, invite_code, status FROM competitions;

-- Check players count per competition
SELECT
  c.name,
  COUNT(cp.player_id) as player_count
FROM competitions c
JOIN competition_players cp ON cp.competition_id = c.id
GROUP BY c.id, c.name;
