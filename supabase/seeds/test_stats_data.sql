-- =====================================================
-- Test Data for Statistics Enhancement Testing
-- The Nineteenth - Golf Competition App
-- =====================================================
-- Creates rich scorecard data with GIR, putts, and fairway tracking
-- for testing Par Type Stats, Short Game (scrambling), and Putting Analysis
-- =====================================================

-- User IDs:
-- User 1 (Jordan Pro): ca7c2924-39e8-4b66-bbb8-d9699adb3d65
-- User 2 (Test Player): 5d7c1ffc-0ad4-486b-b069-d93d626c762f

-- Course IDs (Eastern Golf Club):
-- South/North Course: c1111111-1111-1111-1111-111111111111
-- North/East Course: c2222222-2222-2222-2222-222222222222
-- East/South Course: c3333333-3333-3333-3333-333333333333

-- Test Data IDs (all valid UUIDs):
-- Competition: eeee0001-0001-0001-0001-000000000001
-- Rounds: eeee0001-0001-0001-0001-000000000011 through ...15
-- Pairings: eeee0001-0001-0001-0001-000000000021 through ...25
-- Scorecards Jordan: eeee0001-0001-0001-0001-000000000031 through ...35
-- Scorecards Test: eeee0001-0001-0001-0001-000000000041 through ...45
-- Results: eeee0001-0001-0001-0001-000000000051 through ...60

-- =====================================================
-- STEP 0: Create Club and Courses (if not exists)
-- =====================================================

-- Create The Eastern Golf Club (venue/club)
INSERT INTO clubs (
  id, source, name, state, city, address, phone, website, total_holes, created_at, updated_at
) VALUES (
  'a1b2c3d4-e5f6-7890-abcd-ef1234567890',
  'manual',
  'The Eastern Golf Club',
  'VIC',
  'Doncaster East',
  '125 Victoria St, Doncaster East VIC 3109',
  '(03) 9842 5255',
  'https://www.easterngolfclub.com.au',
  27,
  NOW(),
  NOW()
) ON CONFLICT (id) DO NOTHING;

-- Create South/North Course
INSERT INTO courses (id, club_id, name, description, holes, created_at, updated_at) VALUES (
  'c1111111-1111-1111-1111-111111111111',
  'a1b2c3d4-e5f6-7890-abcd-ef1234567890',
  'South/North Course',
  'Starting on the South Nine, finishing on the North Nine.',
  '[
    {"number": 1,  "par": 4, "strokeIndex": 11, "yardages": {"blue": 296}},
    {"number": 2,  "par": 5, "strokeIndex": 5,  "yardages": {"blue": 478}},
    {"number": 3,  "par": 4, "strokeIndex": 1,  "yardages": {"blue": 418}},
    {"number": 4,  "par": 4, "strokeIndex": 7,  "yardages": {"blue": 357}},
    {"number": 5,  "par": 4, "strokeIndex": 13, "yardages": {"blue": 326}},
    {"number": 6,  "par": 3, "strokeIndex": 17, "yardages": {"blue": 152}},
    {"number": 7,  "par": 4, "strokeIndex": 3,  "yardages": {"blue": 364}},
    {"number": 8,  "par": 3, "strokeIndex": 15, "yardages": {"blue": 171}},
    {"number": 9,  "par": 5, "strokeIndex": 9,  "yardages": {"blue": 495}},
    {"number": 10, "par": 4, "strokeIndex": 8,  "yardages": {"blue": 386}},
    {"number": 11, "par": 5, "strokeIndex": 4,  "yardages": {"blue": 502}},
    {"number": 12, "par": 4, "strokeIndex": 2,  "yardages": {"blue": 394}},
    {"number": 13, "par": 3, "strokeIndex": 16, "yardages": {"blue": 176}},
    {"number": 14, "par": 5, "strokeIndex": 6,  "yardages": {"blue": 537}},
    {"number": 15, "par": 4, "strokeIndex": 12, "yardages": {"blue": 343}},
    {"number": 16, "par": 4, "strokeIndex": 10, "yardages": {"blue": 351}},
    {"number": 17, "par": 3, "strokeIndex": 18, "yardages": {"blue": 144}},
    {"number": 18, "par": 4, "strokeIndex": 14, "yardages": {"blue": 414}}
  ]'::jsonb,
  NOW(),
  NOW()
) ON CONFLICT (id) DO NOTHING;

-- Create North/East Course
INSERT INTO courses (id, club_id, name, description, holes, created_at, updated_at) VALUES (
  'c2222222-2222-2222-2222-222222222222',
  'a1b2c3d4-e5f6-7890-abcd-ef1234567890',
  'North/East Course',
  'Starting on the North Nine, finishing on the East Nine.',
  '[
    {"number": 1,  "par": 4, "strokeIndex": 8,  "yardages": {"blue": 386}},
    {"number": 2,  "par": 5, "strokeIndex": 4,  "yardages": {"blue": 502}},
    {"number": 3,  "par": 4, "strokeIndex": 2,  "yardages": {"blue": 394}},
    {"number": 4,  "par": 3, "strokeIndex": 16, "yardages": {"blue": 176}},
    {"number": 5,  "par": 5, "strokeIndex": 6,  "yardages": {"blue": 537}},
    {"number": 6,  "par": 4, "strokeIndex": 12, "yardages": {"blue": 343}},
    {"number": 7,  "par": 4, "strokeIndex": 10, "yardages": {"blue": 351}},
    {"number": 8,  "par": 3, "strokeIndex": 18, "yardages": {"blue": 144}},
    {"number": 9,  "par": 4, "strokeIndex": 14, "yardages": {"blue": 414}},
    {"number": 10, "par": 5, "strokeIndex": 5,  "yardages": {"blue": 467}},
    {"number": 11, "par": 4, "strokeIndex": 7,  "yardages": {"blue": 381}},
    {"number": 12, "par": 3, "strokeIndex": 17, "yardages": {"blue": 137}},
    {"number": 13, "par": 5, "strokeIndex": 3,  "yardages": {"blue": 503}},
    {"number": 14, "par": 4, "strokeIndex": 9,  "yardages": {"blue": 347}},
    {"number": 15, "par": 4, "strokeIndex": 13, "yardages": {"blue": 310}},
    {"number": 16, "par": 3, "strokeIndex": 15, "yardages": {"blue": 168}},
    {"number": 17, "par": 4, "strokeIndex": 1,  "yardages": {"blue": 386}},
    {"number": 18, "par": 4, "strokeIndex": 11, "yardages": {"blue": 316}}
  ]'::jsonb,
  NOW(),
  NOW()
) ON CONFLICT (id) DO NOTHING;

-- Create East/South Course
INSERT INTO courses (id, club_id, name, description, holes, created_at, updated_at) VALUES (
  'c3333333-3333-3333-3333-333333333333',
  'a1b2c3d4-e5f6-7890-abcd-ef1234567890',
  'East/South Course',
  'Starting on the East Nine, finishing on the South Nine.',
  '[
    {"number": 1,  "par": 5, "strokeIndex": 5,  "yardages": {"blue": 467}},
    {"number": 2,  "par": 4, "strokeIndex": 7,  "yardages": {"blue": 381}},
    {"number": 3,  "par": 3, "strokeIndex": 17, "yardages": {"blue": 137}},
    {"number": 4,  "par": 5, "strokeIndex": 3,  "yardages": {"blue": 503}},
    {"number": 5,  "par": 4, "strokeIndex": 9,  "yardages": {"blue": 347}},
    {"number": 6,  "par": 4, "strokeIndex": 13, "yardages": {"blue": 310}},
    {"number": 7,  "par": 3, "strokeIndex": 15, "yardages": {"blue": 168}},
    {"number": 8,  "par": 4, "strokeIndex": 1,  "yardages": {"blue": 386}},
    {"number": 9,  "par": 4, "strokeIndex": 11, "yardages": {"blue": 316}},
    {"number": 10, "par": 4, "strokeIndex": 10, "yardages": {"blue": 296}},
    {"number": 11, "par": 5, "strokeIndex": 4,  "yardages": {"blue": 478}},
    {"number": 12, "par": 4, "strokeIndex": 2,  "yardages": {"blue": 418}},
    {"number": 13, "par": 4, "strokeIndex": 8,  "yardages": {"blue": 357}},
    {"number": 14, "par": 4, "strokeIndex": 14, "yardages": {"blue": 326}},
    {"number": 15, "par": 3, "strokeIndex": 18, "yardages": {"blue": 152}},
    {"number": 16, "par": 4, "strokeIndex": 6,  "yardages": {"blue": 364}},
    {"number": 17, "par": 3, "strokeIndex": 16, "yardages": {"blue": 171}},
    {"number": 18, "par": 5, "strokeIndex": 12, "yardages": {"blue": 495}}
  ]'::jsonb,
  NOW(),
  NOW()
) ON CONFLICT (id) DO NOTHING;

-- =====================================================
-- STEP 1: Ensure Player Records Exist
-- =====================================================

-- Update/Insert player 1 (Jordan Pro)
INSERT INTO players (id, name, email, handicap, is_placeholder, created_at, updated_at)
VALUES (
  'ca7c2924-39e8-4b66-bbb8-d9699adb3d65',
  'Jordan Pro',
  'jordan@test.com',
  15.0,
  FALSE,
  NOW(),
  NOW()
) ON CONFLICT (id) DO UPDATE SET
  handicap = 15.0,
  updated_at = NOW();

-- Update/Insert player 2 (Test Player)
INSERT INTO players (id, name, email, handicap, is_placeholder, created_at, updated_at)
VALUES (
  '5d7c1ffc-0ad4-486b-b069-d93d626c762f',
  'Test Player',
  'test@test.com',
  22.0,
  FALSE,
  NOW(),
  NOW()
) ON CONFLICT (id) DO UPDATE SET
  handicap = 22.0,
  updated_at = NOW();

-- =====================================================
-- STEP 2: Create Competition for Stats Testing
-- =====================================================

INSERT INTO competitions (
  id, name, description, competition_type, start_date,
  handicap_system, organizer_id, status, invite_code,
  team_mode, team_size, point_system, created_at, updated_at
) VALUES (
  'eeee0001-0001-0001-0001-000000000001',
  'Stats Test Competition',
  'Competition for testing statistics features',
  'knockout',
  '2025-01-01',
  'honor',
  'ca7c2924-39e8-4b66-bbb8-d9699adb3d65',
  'in-progress',
  'STATS-TEST-001',
  'none',
  NULL,
  '{"type": "position", "rules": {"1": 10, "2": 8, "3": 6, "default": 1}, "matchPlay": {"win": 3, "draw": 1, "loss": 0}}'::jsonb,
  NOW(),
  NOW()
) ON CONFLICT (id) DO NOTHING;

-- Add both players to competition
INSERT INTO competition_players (competition_id, player_id, status, invited_at) VALUES
  ('eeee0001-0001-0001-0001-000000000001', 'ca7c2924-39e8-4b66-bbb8-d9699adb3d65', 'accepted', NOW()),
  ('eeee0001-0001-0001-0001-000000000001', '5d7c1ffc-0ad4-486b-b069-d93d626c762f', 'accepted', NOW())
ON CONFLICT DO NOTHING;

-- =====================================================
-- STEP 3: Create Rounds
-- =====================================================

-- Round 1: South/North Course
INSERT INTO rounds (id, competition_id, round_number, course_id, date, game_type, status, is_team_round, created_at, updated_at) VALUES
  ('eeee0001-0001-0001-0001-000000000011', 'eeee0001-0001-0001-0001-000000000001', 1, 'c1111111-1111-1111-1111-111111111111', '2025-01-07', 'stableford', 'completed', FALSE, NOW(), NOW())
ON CONFLICT (id) DO NOTHING;

-- Round 2: North/East Course
INSERT INTO rounds (id, competition_id, round_number, course_id, date, game_type, status, is_team_round, created_at, updated_at) VALUES
  ('eeee0001-0001-0001-0001-000000000012', 'eeee0001-0001-0001-0001-000000000001', 2, 'c2222222-2222-2222-2222-222222222222', '2025-01-14', 'stableford', 'completed', FALSE, NOW(), NOW())
ON CONFLICT (id) DO NOTHING;

-- Round 3: East/South Course
INSERT INTO rounds (id, competition_id, round_number, course_id, date, game_type, status, is_team_round, created_at, updated_at) VALUES
  ('eeee0001-0001-0001-0001-000000000013', 'eeee0001-0001-0001-0001-000000000001', 3, 'c3333333-3333-3333-3333-333333333333', '2025-01-21', 'stableford', 'completed', FALSE, NOW(), NOW())
ON CONFLICT (id) DO NOTHING;

-- Round 4: Back to South/North
INSERT INTO rounds (id, competition_id, round_number, course_id, date, game_type, status, is_team_round, created_at, updated_at) VALUES
  ('eeee0001-0001-0001-0001-000000000014', 'eeee0001-0001-0001-0001-000000000001', 4, 'c1111111-1111-1111-1111-111111111111', '2025-01-28', 'stableford', 'completed', FALSE, NOW(), NOW())
ON CONFLICT (id) DO NOTHING;

-- Round 5: North/East again
INSERT INTO rounds (id, competition_id, round_number, course_id, date, game_type, status, is_team_round, created_at, updated_at) VALUES
  ('eeee0001-0001-0001-0001-000000000015', 'eeee0001-0001-0001-0001-000000000001', 5, 'c2222222-2222-2222-2222-222222222222', '2025-02-04', 'stableford', 'completed', FALSE, NOW(), NOW())
ON CONFLICT (id) DO NOTHING;

-- =====================================================
-- STEP 4: Create Pairings
-- =====================================================

INSERT INTO pairings (id, round_id, player_ids, created_at, updated_at) VALUES
  ('eeee0001-0001-0001-0001-000000000021', 'eeee0001-0001-0001-0001-000000000011', ARRAY['ca7c2924-39e8-4b66-bbb8-d9699adb3d65', '5d7c1ffc-0ad4-486b-b069-d93d626c762f']::uuid[], NOW(), NOW()),
  ('eeee0001-0001-0001-0001-000000000022', 'eeee0001-0001-0001-0001-000000000012', ARRAY['ca7c2924-39e8-4b66-bbb8-d9699adb3d65', '5d7c1ffc-0ad4-486b-b069-d93d626c762f']::uuid[], NOW(), NOW()),
  ('eeee0001-0001-0001-0001-000000000023', 'eeee0001-0001-0001-0001-000000000013', ARRAY['ca7c2924-39e8-4b66-bbb8-d9699adb3d65', '5d7c1ffc-0ad4-486b-b069-d93d626c762f']::uuid[], NOW(), NOW()),
  ('eeee0001-0001-0001-0001-000000000024', 'eeee0001-0001-0001-0001-000000000014', ARRAY['ca7c2924-39e8-4b66-bbb8-d9699adb3d65', '5d7c1ffc-0ad4-486b-b069-d93d626c762f']::uuid[], NOW(), NOW()),
  ('eeee0001-0001-0001-0001-000000000025', 'eeee0001-0001-0001-0001-000000000015', ARRAY['ca7c2924-39e8-4b66-bbb8-d9699adb3d65', '5d7c1ffc-0ad4-486b-b069-d93d626c762f']::uuid[], NOW(), NOW())
ON CONFLICT (id) DO NOTHING;

-- =====================================================
-- STEP 5: SCORECARDS FOR JORDAN PRO (User 1)
-- =====================================================
-- This player has good GIR tracking and putting data
-- Handicap: 15, better player with good scrambling

-- Round 1 Scorecard - Jordan Pro (South/North Course)
-- Course Par: 4,5,4,4,4,3,4,3,5,4,5,4,3,5,4,4,3,4 = 72
INSERT INTO scorecards (id, round_id, player_id, scores, total_gross, total_net, total_points, status, submitted_at, created_at, updated_at) VALUES
  ('eeee0001-0001-0001-0001-000000000031', 'eeee0001-0001-0001-0001-000000000011', 'ca7c2924-39e8-4b66-bbb8-d9699adb3d65',
   '{
     "1":  {"strokes": 5, "putts": 2, "fairwayHit": true,  "greenInRegulation": false, "penalties": 0},
     "2":  {"strokes": 6, "putts": 2, "fairwayHit": true,  "greenInRegulation": true,  "penalties": 0},
     "3":  {"strokes": 5, "putts": 2, "fairwayHit": false, "greenInRegulation": false, "penalties": 0},
     "4":  {"strokes": 4, "putts": 1, "fairwayHit": true,  "greenInRegulation": true,  "penalties": 0},
     "5":  {"strokes": 5, "putts": 2, "fairwayHit": true,  "greenInRegulation": false, "penalties": 0},
     "6":  {"strokes": 3, "putts": 1, "greenInRegulation": true,  "penalties": 0},
     "7":  {"strokes": 4, "putts": 2, "fairwayHit": true,  "greenInRegulation": true,  "penalties": 0},
     "8":  {"strokes": 4, "putts": 2, "greenInRegulation": false, "penalties": 0},
     "9":  {"strokes": 5, "putts": 2, "fairwayHit": true,  "greenInRegulation": true,  "penalties": 0},
     "10": {"strokes": 4, "putts": 1, "fairwayHit": true,  "greenInRegulation": true,  "penalties": 0},
     "11": {"strokes": 6, "putts": 2, "fairwayHit": false, "greenInRegulation": false, "penalties": 0},
     "12": {"strokes": 5, "putts": 2, "fairwayHit": true,  "greenInRegulation": false, "penalties": 0},
     "13": {"strokes": 3, "putts": 1, "greenInRegulation": true,  "penalties": 0},
     "14": {"strokes": 5, "putts": 2, "fairwayHit": true,  "greenInRegulation": true,  "penalties": 0},
     "15": {"strokes": 5, "putts": 2, "fairwayHit": true,  "greenInRegulation": false, "penalties": 0},
     "16": {"strokes": 4, "putts": 2, "fairwayHit": false, "greenInRegulation": true,  "penalties": 0},
     "17": {"strokes": 4, "putts": 2, "greenInRegulation": false, "penalties": 0},
     "18": {"strokes": 5, "putts": 2, "fairwayHit": true,  "greenInRegulation": false, "penalties": 0}
   }'::jsonb,
   82, 67, 34, 'completed', NOW(), NOW(), NOW())
ON CONFLICT (id) DO NOTHING;

-- Round 2 Scorecard - Jordan Pro (North/East Course)
-- Course Par: 4,5,4,3,5,4,4,3,4,5,4,3,5,4,4,3,4,4 = 72
INSERT INTO scorecards (id, round_id, player_id, scores, total_gross, total_net, total_points, status, submitted_at, created_at, updated_at) VALUES
  ('eeee0001-0001-0001-0001-000000000032', 'eeee0001-0001-0001-0001-000000000012', 'ca7c2924-39e8-4b66-bbb8-d9699adb3d65',
   '{
     "1":  {"strokes": 4, "putts": 1, "fairwayHit": true,  "greenInRegulation": true,  "penalties": 0},
     "2":  {"strokes": 5, "putts": 2, "fairwayHit": true,  "greenInRegulation": true,  "penalties": 0},
     "3":  {"strokes": 5, "putts": 2, "fairwayHit": true,  "greenInRegulation": false, "penalties": 0},
     "4":  {"strokes": 3, "putts": 2, "greenInRegulation": true,  "penalties": 0},
     "5":  {"strokes": 6, "putts": 2, "fairwayHit": false, "greenInRegulation": false, "penalties": 0},
     "6":  {"strokes": 4, "putts": 1, "fairwayHit": true,  "greenInRegulation": true,  "penalties": 0},
     "7":  {"strokes": 5, "putts": 3, "fairwayHit": true,  "greenInRegulation": true,  "penalties": 0},
     "8":  {"strokes": 3, "putts": 1, "greenInRegulation": true,  "penalties": 0},
     "9":  {"strokes": 4, "putts": 2, "fairwayHit": true,  "greenInRegulation": true,  "penalties": 0},
     "10": {"strokes": 6, "putts": 2, "fairwayHit": true,  "greenInRegulation": false, "penalties": 0},
     "11": {"strokes": 4, "putts": 1, "fairwayHit": true,  "greenInRegulation": true,  "penalties": 0},
     "12": {"strokes": 4, "putts": 2, "greenInRegulation": false, "penalties": 0},
     "13": {"strokes": 5, "putts": 2, "fairwayHit": true,  "greenInRegulation": true,  "penalties": 0},
     "14": {"strokes": 5, "putts": 2, "fairwayHit": false, "greenInRegulation": false, "penalties": 0},
     "15": {"strokes": 4, "putts": 1, "fairwayHit": true,  "greenInRegulation": true,  "penalties": 0},
     "16": {"strokes": 3, "putts": 2, "greenInRegulation": true,  "penalties": 0},
     "17": {"strokes": 5, "putts": 2, "fairwayHit": true,  "greenInRegulation": false, "penalties": 0},
     "18": {"strokes": 5, "putts": 2, "fairwayHit": true,  "greenInRegulation": false, "penalties": 0}
   }'::jsonb,
   80, 65, 36, 'completed', NOW(), NOW(), NOW())
ON CONFLICT (id) DO NOTHING;

-- Round 3 Scorecard - Jordan Pro (East/South Course)
-- Course Par: 5,4,3,5,4,4,3,4,4,4,5,4,4,4,3,4,3,5 = 72
INSERT INTO scorecards (id, round_id, player_id, scores, total_gross, total_net, total_points, status, submitted_at, created_at, updated_at) VALUES
  ('eeee0001-0001-0001-0001-000000000033', 'eeee0001-0001-0001-0001-000000000013', 'ca7c2924-39e8-4b66-bbb8-d9699adb3d65',
   '{
     "1":  {"strokes": 5, "putts": 1, "fairwayHit": true,  "greenInRegulation": true,  "penalties": 0},
     "2":  {"strokes": 4, "putts": 2, "fairwayHit": true,  "greenInRegulation": true,  "penalties": 0},
     "3":  {"strokes": 3, "putts": 2, "greenInRegulation": true,  "penalties": 0},
     "4":  {"strokes": 6, "putts": 2, "fairwayHit": false, "greenInRegulation": false, "penalties": 0},
     "5":  {"strokes": 4, "putts": 1, "fairwayHit": true,  "greenInRegulation": true,  "penalties": 0},
     "6":  {"strokes": 5, "putts": 2, "fairwayHit": true,  "greenInRegulation": false, "penalties": 0},
     "7":  {"strokes": 4, "putts": 2, "greenInRegulation": false, "penalties": 0},
     "8":  {"strokes": 4, "putts": 1, "fairwayHit": true,  "greenInRegulation": true,  "penalties": 0},
     "9":  {"strokes": 5, "putts": 2, "fairwayHit": true,  "greenInRegulation": false, "penalties": 0},
     "10": {"strokes": 4, "putts": 2, "fairwayHit": true,  "greenInRegulation": true,  "penalties": 0},
     "11": {"strokes": 5, "putts": 2, "fairwayHit": true,  "greenInRegulation": true,  "penalties": 0},
     "12": {"strokes": 5, "putts": 2, "fairwayHit": false, "greenInRegulation": false, "penalties": 0},
     "13": {"strokes": 4, "putts": 1, "fairwayHit": true,  "greenInRegulation": true,  "penalties": 0},
     "14": {"strokes": 5, "putts": 3, "fairwayHit": true,  "greenInRegulation": true,  "penalties": 0},
     "15": {"strokes": 3, "putts": 1, "greenInRegulation": true,  "penalties": 0},
     "16": {"strokes": 4, "putts": 2, "fairwayHit": true,  "greenInRegulation": true,  "penalties": 0},
     "17": {"strokes": 4, "putts": 2, "greenInRegulation": false, "penalties": 0},
     "18": {"strokes": 6, "putts": 2, "fairwayHit": false, "greenInRegulation": false, "penalties": 0}
   }'::jsonb,
   80, 65, 36, 'completed', NOW(), NOW(), NOW())
ON CONFLICT (id) DO NOTHING;

-- Round 4 Scorecard - Jordan Pro (South/North Course)
INSERT INTO scorecards (id, round_id, player_id, scores, total_gross, total_net, total_points, status, submitted_at, created_at, updated_at) VALUES
  ('eeee0001-0001-0001-0001-000000000034', 'eeee0001-0001-0001-0001-000000000014', 'ca7c2924-39e8-4b66-bbb8-d9699adb3d65',
   '{
     "1":  {"strokes": 4, "putts": 2, "fairwayHit": true,  "greenInRegulation": true,  "penalties": 0},
     "2":  {"strokes": 5, "putts": 1, "fairwayHit": true,  "greenInRegulation": true,  "penalties": 0},
     "3":  {"strokes": 4, "putts": 2, "fairwayHit": true,  "greenInRegulation": true,  "penalties": 0},
     "4":  {"strokes": 5, "putts": 2, "fairwayHit": false, "greenInRegulation": false, "penalties": 0},
     "5":  {"strokes": 4, "putts": 1, "fairwayHit": true,  "greenInRegulation": true,  "penalties": 0},
     "6":  {"strokes": 2, "putts": 1, "greenInRegulation": true,  "penalties": 0},
     "7":  {"strokes": 5, "putts": 2, "fairwayHit": true,  "greenInRegulation": false, "penalties": 0},
     "8":  {"strokes": 3, "putts": 2, "greenInRegulation": true,  "penalties": 0},
     "9":  {"strokes": 5, "putts": 2, "fairwayHit": true,  "greenInRegulation": true,  "penalties": 0},
     "10": {"strokes": 5, "putts": 2, "fairwayHit": false, "greenInRegulation": false, "penalties": 0},
     "11": {"strokes": 5, "putts": 2, "fairwayHit": true,  "greenInRegulation": true,  "penalties": 0},
     "12": {"strokes": 4, "putts": 1, "fairwayHit": true,  "greenInRegulation": true,  "penalties": 0},
     "13": {"strokes": 3, "putts": 2, "greenInRegulation": true,  "penalties": 0},
     "14": {"strokes": 6, "putts": 2, "fairwayHit": true,  "greenInRegulation": false, "penalties": 0},
     "15": {"strokes": 4, "putts": 2, "fairwayHit": true,  "greenInRegulation": true,  "penalties": 0},
     "16": {"strokes": 4, "putts": 1, "fairwayHit": true,  "greenInRegulation": true,  "penalties": 0},
     "17": {"strokes": 3, "putts": 2, "greenInRegulation": true,  "penalties": 0},
     "18": {"strokes": 5, "putts": 2, "fairwayHit": true,  "greenInRegulation": false, "penalties": 0}
   }'::jsonb,
   76, 61, 40, 'completed', NOW(), NOW(), NOW())
ON CONFLICT (id) DO NOTHING;

-- Round 5 Scorecard - Jordan Pro (North/East Course)
INSERT INTO scorecards (id, round_id, player_id, scores, total_gross, total_net, total_points, status, submitted_at, created_at, updated_at) VALUES
  ('eeee0001-0001-0001-0001-000000000035', 'eeee0001-0001-0001-0001-000000000015', 'ca7c2924-39e8-4b66-bbb8-d9699adb3d65',
   '{
     "1":  {"strokes": 5, "putts": 2, "fairwayHit": true,  "greenInRegulation": false, "penalties": 0},
     "2":  {"strokes": 5, "putts": 1, "fairwayHit": true,  "greenInRegulation": true,  "penalties": 0},
     "3":  {"strokes": 4, "putts": 2, "fairwayHit": true,  "greenInRegulation": true,  "penalties": 0},
     "4":  {"strokes": 4, "putts": 2, "greenInRegulation": false, "penalties": 0},
     "5":  {"strokes": 5, "putts": 2, "fairwayHit": true,  "greenInRegulation": true,  "penalties": 0},
     "6":  {"strokes": 5, "putts": 2, "fairwayHit": false, "greenInRegulation": false, "penalties": 0},
     "7":  {"strokes": 4, "putts": 1, "fairwayHit": true,  "greenInRegulation": true,  "penalties": 0},
     "8":  {"strokes": 3, "putts": 1, "greenInRegulation": true,  "penalties": 0},
     "9":  {"strokes": 5, "putts": 2, "fairwayHit": true,  "greenInRegulation": false, "penalties": 0},
     "10": {"strokes": 5, "putts": 2, "fairwayHit": true,  "greenInRegulation": true,  "penalties": 0},
     "11": {"strokes": 5, "putts": 2, "fairwayHit": true,  "greenInRegulation": false, "penalties": 0},
     "12": {"strokes": 3, "putts": 1, "greenInRegulation": true,  "penalties": 0},
     "13": {"strokes": 6, "putts": 2, "fairwayHit": false, "greenInRegulation": false, "penalties": 0},
     "14": {"strokes": 4, "putts": 2, "fairwayHit": true,  "greenInRegulation": true,  "penalties": 0},
     "15": {"strokes": 5, "putts": 3, "fairwayHit": true,  "greenInRegulation": true,  "penalties": 0},
     "16": {"strokes": 3, "putts": 2, "greenInRegulation": true,  "penalties": 0},
     "17": {"strokes": 4, "putts": 1, "fairwayHit": true,  "greenInRegulation": true,  "penalties": 0},
     "18": {"strokes": 5, "putts": 2, "fairwayHit": true,  "greenInRegulation": false, "penalties": 0}
   }'::jsonb,
   80, 65, 36, 'completed', NOW(), NOW(), NOW())
ON CONFLICT (id) DO NOTHING;

-- =====================================================
-- STEP 6: SCORECARDS FOR TEST PLAYER (User 2)
-- =====================================================
-- Higher handicap player (22), more struggles, different stats pattern

-- Round 1 Scorecard - Test Player (South/North Course)
INSERT INTO scorecards (id, round_id, player_id, scores, total_gross, total_net, total_points, status, submitted_at, created_at, updated_at) VALUES
  ('eeee0001-0001-0001-0001-000000000041', 'eeee0001-0001-0001-0001-000000000011', '5d7c1ffc-0ad4-486b-b069-d93d626c762f',
   '{
     "1":  {"strokes": 6, "putts": 2, "fairwayHit": false, "greenInRegulation": false, "penalties": 0},
     "2":  {"strokes": 7, "putts": 3, "fairwayHit": true,  "greenInRegulation": false, "penalties": 0},
     "3":  {"strokes": 6, "putts": 2, "fairwayHit": true,  "greenInRegulation": false, "penalties": 0},
     "4":  {"strokes": 5, "putts": 2, "fairwayHit": true,  "greenInRegulation": true,  "penalties": 0},
     "5":  {"strokes": 5, "putts": 2, "fairwayHit": false, "greenInRegulation": false, "penalties": 0},
     "6":  {"strokes": 4, "putts": 2, "greenInRegulation": false, "penalties": 0},
     "7":  {"strokes": 5, "putts": 2, "fairwayHit": true,  "greenInRegulation": true,  "penalties": 0},
     "8":  {"strokes": 4, "putts": 2, "greenInRegulation": true,  "penalties": 0},
     "9":  {"strokes": 6, "putts": 2, "fairwayHit": false, "greenInRegulation": false, "penalties": 0},
     "10": {"strokes": 5, "putts": 2, "fairwayHit": true,  "greenInRegulation": true,  "penalties": 0},
     "11": {"strokes": 7, "putts": 3, "fairwayHit": true,  "greenInRegulation": false, "penalties": 0},
     "12": {"strokes": 5, "putts": 2, "fairwayHit": false, "greenInRegulation": false, "penalties": 0},
     "13": {"strokes": 4, "putts": 2, "greenInRegulation": true,  "penalties": 0},
     "14": {"strokes": 6, "putts": 2, "fairwayHit": true,  "greenInRegulation": false, "penalties": 0},
     "15": {"strokes": 5, "putts": 2, "fairwayHit": true,  "greenInRegulation": true,  "penalties": 0},
     "16": {"strokes": 5, "putts": 2, "fairwayHit": true,  "greenInRegulation": false, "penalties": 0},
     "17": {"strokes": 4, "putts": 2, "greenInRegulation": true,  "penalties": 0},
     "18": {"strokes": 6, "putts": 2, "fairwayHit": false, "greenInRegulation": false, "penalties": 0}
   }'::jsonb,
   95, 73, 30, 'completed', NOW(), NOW(), NOW())
ON CONFLICT (id) DO NOTHING;

-- Round 2 Scorecard - Test Player (North/East Course)
INSERT INTO scorecards (id, round_id, player_id, scores, total_gross, total_net, total_points, status, submitted_at, created_at, updated_at) VALUES
  ('eeee0001-0001-0001-0001-000000000042', 'eeee0001-0001-0001-0001-000000000012', '5d7c1ffc-0ad4-486b-b069-d93d626c762f',
   '{
     "1":  {"strokes": 5, "putts": 2, "fairwayHit": true,  "greenInRegulation": true,  "penalties": 0},
     "2":  {"strokes": 6, "putts": 2, "fairwayHit": true,  "greenInRegulation": false, "penalties": 0},
     "3":  {"strokes": 5, "putts": 2, "fairwayHit": false, "greenInRegulation": false, "penalties": 0},
     "4":  {"strokes": 4, "putts": 2, "greenInRegulation": true,  "penalties": 0},
     "5":  {"strokes": 7, "putts": 3, "fairwayHit": true,  "greenInRegulation": false, "penalties": 0},
     "6":  {"strokes": 5, "putts": 2, "fairwayHit": true,  "greenInRegulation": false, "penalties": 0},
     "7":  {"strokes": 5, "putts": 2, "fairwayHit": false, "greenInRegulation": true,  "penalties": 0},
     "8":  {"strokes": 4, "putts": 2, "greenInRegulation": true,  "penalties": 0},
     "9":  {"strokes": 5, "putts": 2, "fairwayHit": true,  "greenInRegulation": true,  "penalties": 0},
     "10": {"strokes": 6, "putts": 2, "fairwayHit": true,  "greenInRegulation": false, "penalties": 0},
     "11": {"strokes": 5, "putts": 2, "fairwayHit": true,  "greenInRegulation": true,  "penalties": 0},
     "12": {"strokes": 4, "putts": 2, "greenInRegulation": true,  "penalties": 0},
     "13": {"strokes": 6, "putts": 2, "fairwayHit": false, "greenInRegulation": false, "penalties": 0},
     "14": {"strokes": 5, "putts": 2, "fairwayHit": true,  "greenInRegulation": false, "penalties": 0},
     "15": {"strokes": 5, "putts": 3, "fairwayHit": true,  "greenInRegulation": true,  "penalties": 0},
     "16": {"strokes": 4, "putts": 2, "greenInRegulation": true,  "penalties": 0},
     "17": {"strokes": 6, "putts": 2, "fairwayHit": false, "greenInRegulation": false, "penalties": 0},
     "18": {"strokes": 5, "putts": 2, "fairwayHit": true,  "greenInRegulation": true,  "penalties": 0}
   }'::jsonb,
   92, 70, 32, 'completed', NOW(), NOW(), NOW())
ON CONFLICT (id) DO NOTHING;

-- Round 3 Scorecard - Test Player (East/South Course)
INSERT INTO scorecards (id, round_id, player_id, scores, total_gross, total_net, total_points, status, submitted_at, created_at, updated_at) VALUES
  ('eeee0001-0001-0001-0001-000000000043', 'eeee0001-0001-0001-0001-000000000013', '5d7c1ffc-0ad4-486b-b069-d93d626c762f',
   '{
     "1":  {"strokes": 6, "putts": 2, "fairwayHit": true,  "greenInRegulation": false, "penalties": 0},
     "2":  {"strokes": 5, "putts": 2, "fairwayHit": true,  "greenInRegulation": true,  "penalties": 0},
     "3":  {"strokes": 4, "putts": 2, "greenInRegulation": true,  "penalties": 0},
     "4":  {"strokes": 7, "putts": 2, "fairwayHit": false, "greenInRegulation": false, "penalties": 0},
     "5":  {"strokes": 5, "putts": 2, "fairwayHit": true,  "greenInRegulation": true,  "penalties": 0},
     "6":  {"strokes": 5, "putts": 2, "fairwayHit": true,  "greenInRegulation": false, "penalties": 0},
     "7":  {"strokes": 3, "putts": 1, "greenInRegulation": true,  "penalties": 0},
     "8":  {"strokes": 5, "putts": 2, "fairwayHit": false, "greenInRegulation": false, "penalties": 0},
     "9":  {"strokes": 5, "putts": 2, "fairwayHit": true,  "greenInRegulation": true,  "penalties": 0},
     "10": {"strokes": 5, "putts": 2, "fairwayHit": true,  "greenInRegulation": false, "penalties": 0},
     "11": {"strokes": 6, "putts": 2, "fairwayHit": false, "greenInRegulation": false, "penalties": 0},
     "12": {"strokes": 5, "putts": 2, "fairwayHit": true,  "greenInRegulation": false, "penalties": 0},
     "13": {"strokes": 5, "putts": 2, "fairwayHit": true,  "greenInRegulation": true,  "penalties": 0},
     "14": {"strokes": 5, "putts": 2, "fairwayHit": false, "greenInRegulation": true,  "penalties": 0},
     "15": {"strokes": 4, "putts": 2, "greenInRegulation": true,  "penalties": 0},
     "16": {"strokes": 5, "putts": 2, "fairwayHit": true,  "greenInRegulation": false, "penalties": 0},
     "17": {"strokes": 4, "putts": 2, "greenInRegulation": true,  "penalties": 0},
     "18": {"strokes": 7, "putts": 3, "fairwayHit": true,  "greenInRegulation": false, "penalties": 0}
   }'::jsonb,
   91, 69, 33, 'completed', NOW(), NOW(), NOW())
ON CONFLICT (id) DO NOTHING;

-- Round 4 Scorecard - Test Player (South/North Course)
INSERT INTO scorecards (id, round_id, player_id, scores, total_gross, total_net, total_points, status, submitted_at, created_at, updated_at) VALUES
  ('eeee0001-0001-0001-0001-000000000044', 'eeee0001-0001-0001-0001-000000000014', '5d7c1ffc-0ad4-486b-b069-d93d626c762f',
   '{
     "1":  {"strokes": 5, "putts": 2, "fairwayHit": true,  "greenInRegulation": true,  "penalties": 0},
     "2":  {"strokes": 6, "putts": 2, "fairwayHit": true,  "greenInRegulation": true,  "penalties": 0},
     "3":  {"strokes": 5, "putts": 2, "fairwayHit": true,  "greenInRegulation": false, "penalties": 0},
     "4":  {"strokes": 5, "putts": 2, "fairwayHit": false, "greenInRegulation": true,  "penalties": 0},
     "5":  {"strokes": 5, "putts": 2, "fairwayHit": true,  "greenInRegulation": true,  "penalties": 0},
     "6":  {"strokes": 4, "putts": 2, "greenInRegulation": true,  "penalties": 0},
     "7":  {"strokes": 5, "putts": 2, "fairwayHit": true,  "greenInRegulation": false, "penalties": 0},
     "8":  {"strokes": 4, "putts": 2, "greenInRegulation": true,  "penalties": 0},
     "9":  {"strokes": 6, "putts": 2, "fairwayHit": false, "greenInRegulation": false, "penalties": 0},
     "10": {"strokes": 5, "putts": 2, "fairwayHit": true,  "greenInRegulation": true,  "penalties": 0},
     "11": {"strokes": 6, "putts": 2, "fairwayHit": true,  "greenInRegulation": false, "penalties": 0},
     "12": {"strokes": 5, "putts": 2, "fairwayHit": true,  "greenInRegulation": false, "penalties": 0},
     "13": {"strokes": 3, "putts": 1, "greenInRegulation": true,  "penalties": 0},
     "14": {"strokes": 6, "putts": 2, "fairwayHit": true,  "greenInRegulation": false, "penalties": 0},
     "15": {"strokes": 5, "putts": 2, "fairwayHit": true,  "greenInRegulation": true,  "penalties": 0},
     "16": {"strokes": 5, "putts": 2, "fairwayHit": false, "greenInRegulation": false, "penalties": 0},
     "17": {"strokes": 4, "putts": 2, "greenInRegulation": true,  "penalties": 0},
     "18": {"strokes": 5, "putts": 2, "fairwayHit": true,  "greenInRegulation": true,  "penalties": 0}
   }'::jsonb,
   89, 67, 35, 'completed', NOW(), NOW(), NOW())
ON CONFLICT (id) DO NOTHING;

-- Round 5 Scorecard - Test Player (North/East Course)
INSERT INTO scorecards (id, round_id, player_id, scores, total_gross, total_net, total_points, status, submitted_at, created_at, updated_at) VALUES
  ('eeee0001-0001-0001-0001-000000000045', 'eeee0001-0001-0001-0001-000000000015', '5d7c1ffc-0ad4-486b-b069-d93d626c762f',
   '{
     "1":  {"strokes": 5, "putts": 2, "fairwayHit": true,  "greenInRegulation": true,  "penalties": 0},
     "2":  {"strokes": 7, "putts": 3, "fairwayHit": false, "greenInRegulation": false, "penalties": 0},
     "3":  {"strokes": 5, "putts": 2, "fairwayHit": true,  "greenInRegulation": false, "penalties": 0},
     "4":  {"strokes": 4, "putts": 2, "greenInRegulation": true,  "penalties": 0},
     "5":  {"strokes": 6, "putts": 2, "fairwayHit": true,  "greenInRegulation": false, "penalties": 0},
     "6":  {"strokes": 5, "putts": 2, "fairwayHit": true,  "greenInRegulation": true,  "penalties": 0},
     "7":  {"strokes": 5, "putts": 2, "fairwayHit": false, "greenInRegulation": false, "penalties": 0},
     "8":  {"strokes": 4, "putts": 2, "greenInRegulation": true,  "penalties": 0},
     "9":  {"strokes": 5, "putts": 2, "fairwayHit": true,  "greenInRegulation": true,  "penalties": 0},
     "10": {"strokes": 6, "putts": 2, "fairwayHit": true,  "greenInRegulation": false, "penalties": 0},
     "11": {"strokes": 5, "putts": 2, "fairwayHit": true,  "greenInRegulation": true,  "penalties": 0},
     "12": {"strokes": 4, "putts": 3, "greenInRegulation": true,  "penalties": 0},
     "13": {"strokes": 6, "putts": 2, "fairwayHit": false, "greenInRegulation": false, "penalties": 0},
     "14": {"strokes": 5, "putts": 2, "fairwayHit": true,  "greenInRegulation": true,  "penalties": 0},
     "15": {"strokes": 5, "putts": 2, "fairwayHit": true,  "greenInRegulation": false, "penalties": 0},
     "16": {"strokes": 3, "putts": 1, "greenInRegulation": true,  "penalties": 0},
     "17": {"strokes": 5, "putts": 2, "fairwayHit": true,  "greenInRegulation": false, "penalties": 0},
     "18": {"strokes": 5, "putts": 2, "fairwayHit": true,  "greenInRegulation": true,  "penalties": 0}
   }'::jsonb,
   90, 68, 34, 'completed', NOW(), NOW(), NOW())
ON CONFLICT (id) DO NOTHING;

-- =====================================================
-- STEP 7: Create Round Results
-- =====================================================

-- Round 1 Results
INSERT INTO round_results (id, round_id, player_id, raw_score, raw_result_data, position, competition_points, is_team_result, created_at, updated_at) VALUES
  ('eeee0001-0001-0001-0001-000000000051', 'eeee0001-0001-0001-0001-000000000011', 'ca7c2924-39e8-4b66-bbb8-d9699adb3d65', 34, '{"totalPoints": 34, "totalGross": 82, "totalNet": 67}'::jsonb, 1, 10, FALSE, NOW(), NOW()),
  ('eeee0001-0001-0001-0001-000000000052', 'eeee0001-0001-0001-0001-000000000011', '5d7c1ffc-0ad4-486b-b069-d93d626c762f', 30, '{"totalPoints": 30, "totalGross": 95, "totalNet": 73}'::jsonb, 2, 8, FALSE, NOW(), NOW())
ON CONFLICT (id) DO NOTHING;

-- Round 2 Results
INSERT INTO round_results (id, round_id, player_id, raw_score, raw_result_data, position, competition_points, is_team_result, created_at, updated_at) VALUES
  ('eeee0001-0001-0001-0001-000000000053', 'eeee0001-0001-0001-0001-000000000012', 'ca7c2924-39e8-4b66-bbb8-d9699adb3d65', 36, '{"totalPoints": 36, "totalGross": 80, "totalNet": 65}'::jsonb, 1, 10, FALSE, NOW(), NOW()),
  ('eeee0001-0001-0001-0001-000000000054', 'eeee0001-0001-0001-0001-000000000012', '5d7c1ffc-0ad4-486b-b069-d93d626c762f', 32, '{"totalPoints": 32, "totalGross": 92, "totalNet": 70}'::jsonb, 2, 8, FALSE, NOW(), NOW())
ON CONFLICT (id) DO NOTHING;

-- Round 3 Results
INSERT INTO round_results (id, round_id, player_id, raw_score, raw_result_data, position, competition_points, is_team_result, created_at, updated_at) VALUES
  ('eeee0001-0001-0001-0001-000000000055', 'eeee0001-0001-0001-0001-000000000013', 'ca7c2924-39e8-4b66-bbb8-d9699adb3d65', 36, '{"totalPoints": 36, "totalGross": 80, "totalNet": 65}'::jsonb, 1, 10, FALSE, NOW(), NOW()),
  ('eeee0001-0001-0001-0001-000000000056', 'eeee0001-0001-0001-0001-000000000013', '5d7c1ffc-0ad4-486b-b069-d93d626c762f', 33, '{"totalPoints": 33, "totalGross": 91, "totalNet": 69}'::jsonb, 2, 8, FALSE, NOW(), NOW())
ON CONFLICT (id) DO NOTHING;

-- Round 4 Results
INSERT INTO round_results (id, round_id, player_id, raw_score, raw_result_data, position, competition_points, is_team_result, created_at, updated_at) VALUES
  ('eeee0001-0001-0001-0001-000000000057', 'eeee0001-0001-0001-0001-000000000014', 'ca7c2924-39e8-4b66-bbb8-d9699adb3d65', 40, '{"totalPoints": 40, "totalGross": 76, "totalNet": 61}'::jsonb, 1, 10, FALSE, NOW(), NOW()),
  ('eeee0001-0001-0001-0001-000000000058', 'eeee0001-0001-0001-0001-000000000014', '5d7c1ffc-0ad4-486b-b069-d93d626c762f', 35, '{"totalPoints": 35, "totalGross": 89, "totalNet": 67}'::jsonb, 2, 8, FALSE, NOW(), NOW())
ON CONFLICT (id) DO NOTHING;

-- Round 5 Results
INSERT INTO round_results (id, round_id, player_id, raw_score, raw_result_data, position, competition_points, is_team_result, created_at, updated_at) VALUES
  ('eeee0001-0001-0001-0001-000000000059', 'eeee0001-0001-0001-0001-000000000015', 'ca7c2924-39e8-4b66-bbb8-d9699adb3d65', 36, '{"totalPoints": 36, "totalGross": 80, "totalNet": 65}'::jsonb, 1, 10, FALSE, NOW(), NOW()),
  ('eeee0001-0001-0001-0001-000000000060', 'eeee0001-0001-0001-0001-000000000015', '5d7c1ffc-0ad4-486b-b069-d93d626c762f', 34, '{"totalPoints": 34, "totalGross": 90, "totalNet": 68}'::jsonb, 2, 8, FALSE, NOW(), NOW())
ON CONFLICT (id) DO NOTHING;

-- =====================================================
-- VERIFICATION QUERIES
-- =====================================================

SELECT 'Test Data Summary' as info;

SELECT
  'Competition' as entity,
  COUNT(*) as count
FROM competitions
WHERE id = 'eeee0001-0001-0001-0001-000000000001'
UNION ALL
SELECT 'Rounds', COUNT(*) FROM rounds WHERE competition_id = 'eeee0001-0001-0001-0001-000000000001'
UNION ALL
SELECT 'Scorecards (Jordan)', COUNT(*) FROM scorecards WHERE player_id = 'ca7c2924-39e8-4b66-bbb8-d9699adb3d65' AND id::text LIKE 'eeee0001%'
UNION ALL
SELECT 'Scorecards (Test)', COUNT(*) FROM scorecards WHERE player_id = '5d7c1ffc-0ad4-486b-b069-d93d626c762f' AND id::text LIKE 'eeee0001%';

-- Quick stats verification
SELECT
  p.name,
  COUNT(DISTINCT s.id) as rounds_with_scorecards,
  AVG(s.total_gross) as avg_gross,
  AVG(s.total_points) as avg_points
FROM players p
JOIN scorecards s ON s.player_id = p.id
WHERE p.id IN ('ca7c2924-39e8-4b66-bbb8-d9699adb3d65', '5d7c1ffc-0ad4-486b-b069-d93d626c762f')
  AND s.id::text LIKE 'eeee0001%'
GROUP BY p.id, p.name;

SELECT 'Test data created successfully!' as status;
