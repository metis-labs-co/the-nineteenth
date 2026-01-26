-- ============================================
-- SEED DATA FOR USER: ca7c2924-39e8-4b66-bbb8-d9699adb3d65
-- ============================================
-- Creates comprehensive test data including:
-- - Player profile with handicap
-- - Friend players for competitions
-- - Multiple competitions with different game types
-- - Standalone rounds in all game types
-- - Completed scorecards with handicap snapshots
--
-- Uses existing courses from database (no new courses/clubs created)
-- ============================================

-- Course IDs (existing in database):
-- Main Course:      c735fbc0-1d38-4b4b-808d-d184c36b392d (Par 72)
-- Settlers Run:     54ecbd4c-deba-46f7-ab29-e6a4e3895fa7 (Par 72, slope 140)
-- Eastern:          a9868535-5d03-4c6e-8e69-9d849eafcdf1 (Par 70)
-- Club Mandalay:    86ef89f0-d13b-4bd2-ab3c-41f74f08f265 (Par 72, slope 131)
-- Shepparton:       c74219d7-1be4-488d-abe1-13863b3941f6 (Par 72)
-- The Beach:        55d81445-9734-4fe6-afe6-5e29771ece7b (Par 72, slope 138, rating 72)
-- The Creek:        3ab72d12-37d8-4b70-80ec-c8fa1e87d3fe (Par 72, slope 138, rating 72)

-- UUID Key (all valid hex format - only 0-9, a-f allowed):
-- Friends/Players: e0000001-... through e0000007-...
-- Competitions:    d0000001-... through d0000003-...
-- Rounds:          a0000001-... through a1000006-...
-- Scorecards:      b0000001-... through b1000005-...
-- Pairings:        c0000001-... through c0000004-...

-- ============================================
-- 1. MAIN USER PLAYER PROFILE
-- ============================================

INSERT INTO players (id, name, email, phone, handicap, gender, handicap_index, created_at, updated_at)
VALUES (
  'ca7c2924-39e8-4b66-bbb8-d9699adb3d65',
  'Test User',
  'testuser@example.com',
  '0400000000',
  14.5,
  'male',
  14.2,
  NOW(),
  NOW()
)
ON CONFLICT (id) DO UPDATE SET
  handicap = EXCLUDED.handicap,
  gender = EXCLUDED.gender,
  handicap_index = EXCLUDED.handicap_index,
  updated_at = NOW();


-- ============================================
-- 2. FRIEND PLAYERS (for competitions)
-- ============================================

INSERT INTO players (id, name, email, phone, handicap, gender, is_placeholder, created_by, created_at, updated_at)
VALUES
  ('e0000001-0000-0000-0000-000000000001', 'Jake Wilson', 'jake.wilson@example.com', '0411111111', 8.2, 'male', TRUE, 'ca7c2924-39e8-4b66-bbb8-d9699adb3d65', NOW(), NOW()),
  ('e0000002-0000-0000-0000-000000000002', 'Mike Chen', 'mike.chen@example.com', '0422222222', 18.5, 'male', TRUE, 'ca7c2924-39e8-4b66-bbb8-d9699adb3d65', NOW(), NOW()),
  ('e0000003-0000-0000-0000-000000000003', 'Sarah Thompson', 'sarah.t@example.com', '0433333333', 22.0, 'female', TRUE, 'ca7c2924-39e8-4b66-bbb8-d9699adb3d65', NOW(), NOW()),
  ('e0000004-0000-0000-0000-000000000004', 'Tom Anderson', 'tom.a@example.com', '0444444444', 12.0, 'male', TRUE, 'ca7c2924-39e8-4b66-bbb8-d9699adb3d65', NOW(), NOW()),
  ('e0000005-0000-0000-0000-000000000005', 'Chris Taylor', 'chris.t@example.com', '0455555555', 6.5, 'male', TRUE, 'ca7c2924-39e8-4b66-bbb8-d9699adb3d65', NOW(), NOW()),
  ('e0000006-0000-0000-0000-000000000006', 'Emma Roberts', 'emma.r@example.com', '0466666666', 28.0, 'female', TRUE, 'ca7c2924-39e8-4b66-bbb8-d9699adb3d65', NOW(), NOW()),
  ('e0000007-0000-0000-0000-000000000007', 'Ben Mitchell', 'ben.m@example.com', '0477777777', 16.0, 'male', TRUE, 'ca7c2924-39e8-4b66-bbb8-d9699adb3d65', NOW(), NOW())
ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name,
  handicap = EXCLUDED.handicap,
  gender = EXCLUDED.gender,
  updated_at = NOW();


-- ============================================
-- 3. COMPETITION 1: Summer Series League (Multi-round, Various Game Types)
-- ============================================

INSERT INTO competitions (id, name, description, competition_type, start_date, end_date, handicap_system, visibility, invite_code, organizer_id, status, team_mode, created_at, updated_at)
VALUES (
  'd0000001-0000-0000-0000-000000000001',
  'Summer Series 2025',
  'A multi-round league competition featuring different formats each week. Stableford, Stroke Play, and Best Ball!',
  'league',
  '2025-11-01',
  '2025-12-15',
  'honor',
  'private',
  'SUMMER25',
  'ca7c2924-39e8-4b66-bbb8-d9699adb3d65',
  'completed',
  'none',
  NOW(),
  NOW()
)
ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name,
  status = EXCLUDED.status,
  updated_at = NOW();

-- Competition 1 Players
INSERT INTO competition_players (competition_id, player_id, status, invited_at, responded_at)
VALUES
  ('d0000001-0000-0000-0000-000000000001', 'ca7c2924-39e8-4b66-bbb8-d9699adb3d65', 'accepted', NOW(), NOW()),
  ('d0000001-0000-0000-0000-000000000001', 'e0000001-0000-0000-0000-000000000001', 'accepted', NOW(), NOW()),
  ('d0000001-0000-0000-0000-000000000001', 'e0000002-0000-0000-0000-000000000002', 'accepted', NOW(), NOW()),
  ('d0000001-0000-0000-0000-000000000001', 'e0000003-0000-0000-0000-000000000003', 'accepted', NOW(), NOW()),
  ('d0000001-0000-0000-0000-000000000001', 'e0000004-0000-0000-0000-000000000004', 'accepted', NOW(), NOW()),
  ('d0000001-0000-0000-0000-000000000001', 'e0000005-0000-0000-0000-000000000005', 'accepted', NOW(), NOW())
ON CONFLICT (competition_id, player_id) DO UPDATE SET
  status = EXCLUDED.status;

-- Competition 1 Round 1: Stableford at Settlers Run
INSERT INTO rounds (id, competition_id, round_number, course_id, date, game_type, status, created_at, updated_at)
VALUES (
  'a0000001-0000-0000-0000-000000000001',
  'd0000001-0000-0000-0000-000000000001',
  1,
  '54ecbd4c-deba-46f7-ab29-e6a4e3895fa7',  -- Settlers Run
  '2025-11-01',
  'stableford',
  'completed',
  NOW(),
  NOW()
)
ON CONFLICT (id) DO UPDATE SET status = EXCLUDED.status, updated_at = NOW();

-- Competition 1 Round 2: Stroke Play at The Beach
INSERT INTO rounds (id, competition_id, round_number, course_id, date, game_type, status, created_at, updated_at)
VALUES (
  'a0000002-0000-0000-0000-000000000002',
  'd0000001-0000-0000-0000-000000000001',
  2,
  '55d81445-9734-4fe6-afe6-5e29771ece7b',  -- The Beach
  '2025-11-15',
  'stroke',
  'completed',
  NOW(),
  NOW()
)
ON CONFLICT (id) DO UPDATE SET status = EXCLUDED.status, updated_at = NOW();

-- Competition 1 Round 3: Best Ball (Teams) at Eastern
INSERT INTO rounds (id, competition_id, round_number, course_id, date, game_type, is_team_round, team_format, status, created_at, updated_at)
VALUES (
  'a0000003-0000-0000-0000-000000000003',
  'd0000001-0000-0000-0000-000000000001',
  3,
  'a9868535-5d03-4c6e-8e69-9d849eafcdf1',  -- Eastern
  '2025-12-01',
  'best-ball',
  TRUE,
  'best-ball',
  'completed',
  NOW(),
  NOW()
)
ON CONFLICT (id) DO UPDATE SET status = EXCLUDED.status, updated_at = NOW();


-- ============================================
-- 4. COMPETITION 2: Team Championship (Scramble + Shamble)
-- ============================================

INSERT INTO competitions (id, name, description, competition_type, start_date, end_date, handicap_system, visibility, invite_code, organizer_id, status, team_mode, team_size, created_at, updated_at)
VALUES (
  'd0000002-0000-0000-0000-000000000002',
  'Team Championship 2025',
  'Two-day team event featuring Scramble and Shamble formats!',
  'event',
  '2025-10-15',
  '2025-10-16',
  'honor',
  'private',
  'TEAM2025',
  'ca7c2924-39e8-4b66-bbb8-d9699adb3d65',
  'completed',
  'fixed',
  2,
  NOW(),
  NOW()
)
ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name,
  status = EXCLUDED.status,
  updated_at = NOW();

-- Competition 2 Players
INSERT INTO competition_players (competition_id, player_id, status, invited_at, responded_at)
VALUES
  ('d0000002-0000-0000-0000-000000000002', 'ca7c2924-39e8-4b66-bbb8-d9699adb3d65', 'accepted', NOW(), NOW()),
  ('d0000002-0000-0000-0000-000000000002', 'e0000001-0000-0000-0000-000000000001', 'accepted', NOW(), NOW()),
  ('d0000002-0000-0000-0000-000000000002', 'e0000004-0000-0000-0000-000000000004', 'accepted', NOW(), NOW()),
  ('d0000002-0000-0000-0000-000000000002', 'e0000005-0000-0000-0000-000000000005', 'accepted', NOW(), NOW())
ON CONFLICT (competition_id, player_id) DO UPDATE SET
  status = EXCLUDED.status;

-- Competition 2 Round 1: Scramble at Club Mandalay
INSERT INTO rounds (id, competition_id, round_number, course_id, date, game_type, is_team_round, team_format, status, created_at, updated_at)
VALUES (
  'a0000004-0000-0000-0000-000000000004',
  'd0000002-0000-0000-0000-000000000002',
  1,
  '86ef89f0-d13b-4bd2-ab3c-41f74f08f265',  -- Club Mandalay
  '2025-10-15',
  'scramble',
  TRUE,
  'scramble',
  'completed',
  NOW(),
  NOW()
)
ON CONFLICT (id) DO UPDATE SET status = EXCLUDED.status, updated_at = NOW();

-- Competition 2 Round 2: Shamble at Shepparton
INSERT INTO rounds (id, competition_id, round_number, course_id, date, game_type, is_team_round, team_format, status, created_at, updated_at)
VALUES (
  'a0000005-0000-0000-0000-000000000005',
  'd0000002-0000-0000-0000-000000000002',
  2,
  'c74219d7-1be4-488d-abe1-13863b3941f6',  -- Shepparton
  '2025-10-16',
  'shamble',
  TRUE,
  'shamble',
  'completed',
  NOW(),
  NOW()
)
ON CONFLICT (id) DO UPDATE SET status = EXCLUDED.status, updated_at = NOW();


-- ============================================
-- 5. COMPETITION 3: Match Play Championship
-- ============================================

INSERT INTO competitions (id, name, description, competition_type, start_date, end_date, handicap_system, visibility, invite_code, organizer_id, status, team_mode, created_at, updated_at)
VALUES (
  'd0000003-0000-0000-0000-000000000003',
  'Match Play Championship',
  'Head-to-head match play knockout format',
  'event',
  '2025-09-20',
  '2025-09-20',
  'honor',
  'private',
  'MATCH25',
  'ca7c2924-39e8-4b66-bbb8-d9699adb3d65',
  'completed',
  'none',
  NOW(),
  NOW()
)
ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name,
  status = EXCLUDED.status,
  updated_at = NOW();

-- Competition 3 Players
INSERT INTO competition_players (competition_id, player_id, status, invited_at, responded_at)
VALUES
  ('d0000003-0000-0000-0000-000000000003', 'ca7c2924-39e8-4b66-bbb8-d9699adb3d65', 'accepted', NOW(), NOW()),
  ('d0000003-0000-0000-0000-000000000003', 'e0000001-0000-0000-0000-000000000001', 'accepted', NOW(), NOW())
ON CONFLICT (competition_id, player_id) DO UPDATE SET
  status = EXCLUDED.status;

-- Competition 3 Round 1: Match Play at The Creek
INSERT INTO rounds (id, competition_id, round_number, course_id, date, game_type, status, created_at, updated_at)
VALUES (
  'a0000006-0000-0000-0000-000000000006',
  'd0000003-0000-0000-0000-000000000003',
  1,
  '3ab72d12-37d8-4b70-80ec-c8fa1e87d3fe',  -- The Creek
  '2025-09-20',
  'match-play',
  'completed',
  NOW(),
  NOW()
)
ON CONFLICT (id) DO UPDATE SET status = EXCLUDED.status, updated_at = NOW();


-- ============================================
-- 6. STANDALONE ROUNDS (All Game Types)
-- ============================================

-- Standalone Round 1: Stableford at Settlers Run
INSERT INTO rounds (id, user_id, course_id, date, game_type, status, created_at, updated_at)
VALUES (
  'a1000001-0000-0000-0000-000000000001',
  'ca7c2924-39e8-4b66-bbb8-d9699adb3d65',
  '54ecbd4c-deba-46f7-ab29-e6a4e3895fa7',  -- Settlers Run
  '2025-08-10',
  'stableford',
  'completed',
  NOW(),
  NOW()
)
ON CONFLICT (id) DO UPDATE SET status = EXCLUDED.status, updated_at = NOW();

-- Standalone Round 2: Stroke Play at The Beach
INSERT INTO rounds (id, user_id, course_id, date, game_type, status, created_at, updated_at)
VALUES (
  'a1000002-0000-0000-0000-000000000002',
  'ca7c2924-39e8-4b66-bbb8-d9699adb3d65',
  '55d81445-9734-4fe6-afe6-5e29771ece7b',  -- The Beach
  '2025-08-17',
  'stroke',
  'completed',
  NOW(),
  NOW()
)
ON CONFLICT (id) DO UPDATE SET status = EXCLUDED.status, updated_at = NOW();

-- Standalone Round 3: Best Ball (2-person) at Eastern
INSERT INTO rounds (id, user_id, course_id, date, game_type, is_team_round, team_format, status, created_at, updated_at)
VALUES (
  'a1000003-0000-0000-0000-000000000003',
  'ca7c2924-39e8-4b66-bbb8-d9699adb3d65',
  'a9868535-5d03-4c6e-8e69-9d849eafcdf1',  -- Eastern
  '2025-08-24',
  'best-ball',
  TRUE,
  'best-ball',
  'completed',
  NOW(),
  NOW()
)
ON CONFLICT (id) DO UPDATE SET status = EXCLUDED.status, updated_at = NOW();

-- Standalone Round 4: Scramble at Club Mandalay
INSERT INTO rounds (id, user_id, course_id, date, game_type, is_team_round, team_format, status, created_at, updated_at)
VALUES (
  'a1000004-0000-0000-0000-000000000004',
  'ca7c2924-39e8-4b66-bbb8-d9699adb3d65',
  '86ef89f0-d13b-4bd2-ab3c-41f74f08f265',  -- Club Mandalay
  '2025-09-01',
  'scramble',
  TRUE,
  'scramble',
  'completed',
  NOW(),
  NOW()
)
ON CONFLICT (id) DO UPDATE SET status = EXCLUDED.status, updated_at = NOW();

-- Standalone Round 5: Match Play at Shepparton
INSERT INTO rounds (id, user_id, course_id, date, game_type, status, created_at, updated_at)
VALUES (
  'a1000005-0000-0000-0000-000000000005',
  'ca7c2924-39e8-4b66-bbb8-d9699adb3d65',
  'c74219d7-1be4-488d-abe1-13863b3941f6',  -- Shepparton
  '2025-09-08',
  'match-play',
  'completed',
  NOW(),
  NOW()
)
ON CONFLICT (id) DO UPDATE SET status = EXCLUDED.status, updated_at = NOW();

-- Standalone Round 6: Shamble at The Creek
INSERT INTO rounds (id, user_id, course_id, date, game_type, is_team_round, team_format, status, created_at, updated_at)
VALUES (
  'a1000006-0000-0000-0000-000000000006',
  'ca7c2924-39e8-4b66-bbb8-d9699adb3d65',
  '3ab72d12-37d8-4b70-80ec-c8fa1e87d3fe',  -- The Creek
  '2025-09-15',
  'shamble',
  TRUE,
  'shamble',
  'completed',
  NOW(),
  NOW()
)
ON CONFLICT (id) DO UPDATE SET status = EXCLUDED.status, updated_at = NOW();

-- Round players for standalone rounds
INSERT INTO round_players (id, round_id, player_id, added_by, created_at)
VALUES
  -- Stableford round
  (gen_random_uuid(), 'a1000001-0000-0000-0000-000000000001', 'ca7c2924-39e8-4b66-bbb8-d9699adb3d65', NULL, NOW()),
  (gen_random_uuid(), 'a1000001-0000-0000-0000-000000000001', 'e0000001-0000-0000-0000-000000000001', 'ca7c2924-39e8-4b66-bbb8-d9699adb3d65', NOW()),
  -- Stroke round
  (gen_random_uuid(), 'a1000002-0000-0000-0000-000000000002', 'ca7c2924-39e8-4b66-bbb8-d9699adb3d65', NULL, NOW()),
  (gen_random_uuid(), 'a1000002-0000-0000-0000-000000000002', 'e0000002-0000-0000-0000-000000000002', 'ca7c2924-39e8-4b66-bbb8-d9699adb3d65', NOW()),
  -- Best Ball round
  (gen_random_uuid(), 'a1000003-0000-0000-0000-000000000003', 'ca7c2924-39e8-4b66-bbb8-d9699adb3d65', NULL, NOW()),
  (gen_random_uuid(), 'a1000003-0000-0000-0000-000000000003', 'e0000004-0000-0000-0000-000000000004', 'ca7c2924-39e8-4b66-bbb8-d9699adb3d65', NOW()),
  -- Scramble round
  (gen_random_uuid(), 'a1000004-0000-0000-0000-000000000004', 'ca7c2924-39e8-4b66-bbb8-d9699adb3d65', NULL, NOW()),
  (gen_random_uuid(), 'a1000004-0000-0000-0000-000000000004', 'e0000005-0000-0000-0000-000000000005', 'ca7c2924-39e8-4b66-bbb8-d9699adb3d65', NOW()),
  -- Match Play round
  (gen_random_uuid(), 'a1000005-0000-0000-0000-000000000005', 'ca7c2924-39e8-4b66-bbb8-d9699adb3d65', NULL, NOW()),
  (gen_random_uuid(), 'a1000005-0000-0000-0000-000000000005', 'e0000001-0000-0000-0000-000000000001', 'ca7c2924-39e8-4b66-bbb8-d9699adb3d65', NOW()),
  -- Shamble round
  (gen_random_uuid(), 'a1000006-0000-0000-0000-000000000006', 'ca7c2924-39e8-4b66-bbb8-d9699adb3d65', NULL, NOW()),
  (gen_random_uuid(), 'a1000006-0000-0000-0000-000000000006', 'e0000007-0000-0000-0000-000000000007', 'ca7c2924-39e8-4b66-bbb8-d9699adb3d65', NOW())
ON CONFLICT DO NOTHING;


-- ============================================
-- 7. SCORECARDS - Competition 1 Round 1 (Stableford at Settlers Run)
-- ============================================

-- Main user scorecard - Stableford Round 1 (36 points, solid round)
INSERT INTO scorecards (id, round_id, player_id, scores, total_gross, total_net, total_points, status, submitted_at, submitted_by, ga_handicap_used, daily_handicap_used, handicap_differential, course_rating_used, slope_rating_used, synced_at, created_at, updated_at)
VALUES (
  'b0000001-0000-0000-0000-000000000001',
  'a0000001-0000-0000-0000-000000000001',
  'ca7c2924-39e8-4b66-bbb8-d9699adb3d65',
  '{
    "1": {"strokes": 6, "putts": 2},
    "2": {"strokes": 4, "putts": 2},
    "3": {"strokes": 5, "putts": 2},
    "4": {"strokes": 5, "putts": 2},
    "5": {"strokes": 5, "putts": 2},
    "6": {"strokes": 5, "putts": 2},
    "7": {"strokes": 5, "putts": 2},
    "8": {"strokes": 4, "putts": 2},
    "9": {"strokes": 6, "putts": 2},
    "10": {"strokes": 5, "putts": 2},
    "11": {"strokes": 3, "putts": 1},
    "12": {"strokes": 5, "putts": 2},
    "13": {"strokes": 5, "putts": 2},
    "14": {"strokes": 5, "putts": 2},
    "15": {"strokes": 5, "putts": 2},
    "16": {"strokes": 6, "putts": 2},
    "17": {"strokes": 5, "putts": 2},
    "18": {"strokes": 5, "putts": 2}
  }'::jsonb,
  89,
  73,
  36,
  'completed',
  '2025-11-01 14:30:00',
  'ca7c2924-39e8-4b66-bbb8-d9699adb3d65',
  14.5,
  16,
  13.5,
  72.0,
  140,
  '2025-11-01 14:35:00',
  NOW(),
  NOW()
)
ON CONFLICT (id) DO UPDATE SET
  scores = EXCLUDED.scores,
  total_points = EXCLUDED.total_points,
  ga_handicap_used = EXCLUDED.ga_handicap_used,
  daily_handicap_used = EXCLUDED.daily_handicap_used,
  handicap_differential = EXCLUDED.handicap_differential,
  updated_at = NOW();

-- Jake Wilson (low handicapper) - 38 points
INSERT INTO scorecards (id, round_id, player_id, scores, total_gross, total_net, total_points, status, submitted_at, submitted_by, ga_handicap_used, daily_handicap_used, handicap_differential, course_rating_used, slope_rating_used, synced_at, created_at, updated_at)
VALUES (
  'b0000002-0000-0000-0000-000000000002',
  'a0000001-0000-0000-0000-000000000001',
  'e0000001-0000-0000-0000-000000000001',
  '{
    "1": {"strokes": 5, "putts": 2},
    "2": {"strokes": 3, "putts": 1},
    "3": {"strokes": 4, "putts": 2},
    "4": {"strokes": 4, "putts": 2},
    "5": {"strokes": 4, "putts": 2},
    "6": {"strokes": 4, "putts": 2},
    "7": {"strokes": 4, "putts": 2},
    "8": {"strokes": 3, "putts": 1},
    "9": {"strokes": 5, "putts": 2},
    "10": {"strokes": 4, "putts": 2},
    "11": {"strokes": 3, "putts": 1},
    "12": {"strokes": 4, "putts": 2},
    "13": {"strokes": 4, "putts": 2},
    "14": {"strokes": 4, "putts": 2},
    "15": {"strokes": 4, "putts": 2},
    "16": {"strokes": 5, "putts": 2},
    "17": {"strokes": 4, "putts": 2},
    "18": {"strokes": 5, "putts": 2}
  }'::jsonb,
  73,
  65,
  38,
  'completed',
  '2025-11-01 14:25:00',
  'e0000001-0000-0000-0000-000000000001',
  8.2,
  9,
  0.8,
  72.0,
  140,
  '2025-11-01 14:30:00',
  NOW(),
  NOW()
)
ON CONFLICT (id) DO UPDATE SET scores = EXCLUDED.scores, total_points = EXCLUDED.total_points, updated_at = NOW();

-- Mike Chen (higher handicapper) - 34 points
INSERT INTO scorecards (id, round_id, player_id, scores, total_gross, total_net, total_points, status, submitted_at, submitted_by, ga_handicap_used, daily_handicap_used, handicap_differential, course_rating_used, slope_rating_used, synced_at, created_at, updated_at)
VALUES (
  'b0000003-0000-0000-0000-000000000003',
  'a0000001-0000-0000-0000-000000000001',
  'e0000002-0000-0000-0000-000000000002',
  '{
    "1": {"strokes": 7, "putts": 2},
    "2": {"strokes": 4, "putts": 2},
    "3": {"strokes": 6, "putts": 2},
    "4": {"strokes": 6, "putts": 2},
    "5": {"strokes": 5, "putts": 2},
    "6": {"strokes": 6, "putts": 2},
    "7": {"strokes": 6, "putts": 3},
    "8": {"strokes": 4, "putts": 2},
    "9": {"strokes": 7, "putts": 2},
    "10": {"strokes": 5, "putts": 2},
    "11": {"strokes": 4, "putts": 2},
    "12": {"strokes": 5, "putts": 2},
    "13": {"strokes": 6, "putts": 2},
    "14": {"strokes": 5, "putts": 2},
    "15": {"strokes": 6, "putts": 2},
    "16": {"strokes": 7, "putts": 3},
    "17": {"strokes": 5, "putts": 2},
    "18": {"strokes": 6, "putts": 2}
  }'::jsonb,
  100,
  79,
  34,
  'completed',
  '2025-11-01 14:40:00',
  'e0000002-0000-0000-0000-000000000002',
  18.5,
  21,
  22.4,
  72.0,
  140,
  '2025-11-01 14:45:00',
  NOW(),
  NOW()
)
ON CONFLICT (id) DO UPDATE SET scores = EXCLUDED.scores, total_points = EXCLUDED.total_points, updated_at = NOW();


-- ============================================
-- 8. SCORECARDS - Competition 1 Round 2 (Stroke Play at The Beach)
-- ============================================

-- Main user - 84 gross (solid)
INSERT INTO scorecards (id, round_id, player_id, scores, total_gross, total_net, total_points, status, submitted_at, submitted_by, ga_handicap_used, daily_handicap_used, handicap_differential, course_rating_used, slope_rating_used, synced_at, created_at, updated_at)
VALUES (
  'b0000004-0000-0000-0000-000000000004',
  'a0000002-0000-0000-0000-000000000002',
  'ca7c2924-39e8-4b66-bbb8-d9699adb3d65',
  '{
    "1": {"strokes": 5, "putts": 2},
    "2": {"strokes": 5, "putts": 2},
    "3": {"strokes": 4, "putts": 2},
    "4": {"strokes": 6, "putts": 2},
    "5": {"strokes": 4, "putts": 2},
    "6": {"strokes": 6, "putts": 2},
    "7": {"strokes": 4, "putts": 2},
    "8": {"strokes": 5, "putts": 2},
    "9": {"strokes": 5, "putts": 2},
    "10": {"strokes": 5, "putts": 2},
    "11": {"strokes": 6, "putts": 2},
    "12": {"strokes": 4, "putts": 2},
    "13": {"strokes": 4, "putts": 2},
    "14": {"strokes": 6, "putts": 2},
    "15": {"strokes": 5, "putts": 2},
    "16": {"strokes": 3, "putts": 1},
    "17": {"strokes": 4, "putts": 2},
    "18": {"strokes": 4, "putts": 2}
  }'::jsonb,
  85,
  69,
  0,
  'completed',
  '2025-11-15 15:00:00',
  'ca7c2924-39e8-4b66-bbb8-d9699adb3d65',
  14.5,
  16,
  10.5,
  72.0,
  138,
  '2025-11-15 15:05:00',
  NOW(),
  NOW()
)
ON CONFLICT (id) DO UPDATE SET scores = EXCLUDED.scores, total_gross = EXCLUDED.total_gross, updated_at = NOW();

-- Jake Wilson - 74 gross (excellent)
INSERT INTO scorecards (id, round_id, player_id, scores, total_gross, total_net, total_points, status, submitted_at, submitted_by, ga_handicap_used, daily_handicap_used, handicap_differential, course_rating_used, slope_rating_used, synced_at, created_at, updated_at)
VALUES (
  'b0000005-0000-0000-0000-000000000005',
  'a0000002-0000-0000-0000-000000000002',
  'e0000001-0000-0000-0000-000000000001',
  '{
    "1": {"strokes": 4, "putts": 2},
    "2": {"strokes": 4, "putts": 2},
    "3": {"strokes": 3, "putts": 1},
    "4": {"strokes": 5, "putts": 2},
    "5": {"strokes": 4, "putts": 2},
    "6": {"strokes": 5, "putts": 2},
    "7": {"strokes": 3, "putts": 1},
    "8": {"strokes": 4, "putts": 2},
    "9": {"strokes": 4, "putts": 2},
    "10": {"strokes": 4, "putts": 2},
    "11": {"strokes": 5, "putts": 2},
    "12": {"strokes": 3, "putts": 1},
    "13": {"strokes": 4, "putts": 2},
    "14": {"strokes": 5, "putts": 2},
    "15": {"strokes": 4, "putts": 2},
    "16": {"strokes": 3, "putts": 1},
    "17": {"strokes": 5, "putts": 2},
    "18": {"strokes": 4, "putts": 2}
  }'::jsonb,
  73,
  64,
  0,
  'completed',
  '2025-11-15 14:55:00',
  'e0000001-0000-0000-0000-000000000001',
  8.2,
  9,
  0.8,
  72.0,
  138,
  '2025-11-15 15:00:00',
  NOW(),
  NOW()
)
ON CONFLICT (id) DO UPDATE SET scores = EXCLUDED.scores, total_gross = EXCLUDED.total_gross, updated_at = NOW();


-- ============================================
-- 9. SCORECARDS - Standalone Rounds
-- ============================================

-- Standalone Stableford at Settlers Run - Main user 37 points (great round!)
INSERT INTO scorecards (id, round_id, player_id, scores, total_gross, total_net, total_points, status, submitted_at, submitted_by, ga_handicap_used, daily_handicap_used, handicap_differential, course_rating_used, slope_rating_used, synced_at, created_at, updated_at)
VALUES (
  'b1000001-0000-0000-0000-000000000001',
  'a1000001-0000-0000-0000-000000000001',
  'ca7c2924-39e8-4b66-bbb8-d9699adb3d65',
  '{
    "1": {"strokes": 6, "putts": 2},
    "2": {"strokes": 3, "putts": 1},
    "3": {"strokes": 5, "putts": 2},
    "4": {"strokes": 5, "putts": 2},
    "5": {"strokes": 4, "putts": 2},
    "6": {"strokes": 5, "putts": 2},
    "7": {"strokes": 5, "putts": 2},
    "8": {"strokes": 3, "putts": 1},
    "9": {"strokes": 6, "putts": 2},
    "10": {"strokes": 4, "putts": 2},
    "11": {"strokes": 4, "putts": 2},
    "12": {"strokes": 5, "putts": 2},
    "13": {"strokes": 4, "putts": 2},
    "14": {"strokes": 5, "putts": 2},
    "15": {"strokes": 4, "putts": 2},
    "16": {"strokes": 6, "putts": 2},
    "17": {"strokes": 5, "putts": 2},
    "18": {"strokes": 5, "putts": 2}
  }'::jsonb,
  84,
  68,
  37,
  'completed',
  '2025-08-10 14:00:00',
  'ca7c2924-39e8-4b66-bbb8-d9699adb3d65',
  14.5,
  16,
  9.7,
  72.0,
  140,
  '2025-08-10 14:05:00',
  NOW(),
  NOW()
)
ON CONFLICT (id) DO UPDATE SET scores = EXCLUDED.scores, total_points = EXCLUDED.total_points, updated_at = NOW();

-- Standalone Stroke at The Beach - Main user 82 gross
INSERT INTO scorecards (id, round_id, player_id, scores, total_gross, total_net, total_points, status, submitted_at, submitted_by, ga_handicap_used, daily_handicap_used, handicap_differential, course_rating_used, slope_rating_used, synced_at, created_at, updated_at)
VALUES (
  'b1000002-0000-0000-0000-000000000002',
  'a1000002-0000-0000-0000-000000000002',
  'ca7c2924-39e8-4b66-bbb8-d9699adb3d65',
  '{
    "1": {"strokes": 4, "putts": 2},
    "2": {"strokes": 5, "putts": 2},
    "3": {"strokes": 3, "putts": 1},
    "4": {"strokes": 6, "putts": 2},
    "5": {"strokes": 4, "putts": 2},
    "6": {"strokes": 5, "putts": 2},
    "7": {"strokes": 4, "putts": 2},
    "8": {"strokes": 5, "putts": 2},
    "9": {"strokes": 5, "putts": 2},
    "10": {"strokes": 4, "putts": 2},
    "11": {"strokes": 5, "putts": 2},
    "12": {"strokes": 4, "putts": 2},
    "13": {"strokes": 5, "putts": 2},
    "14": {"strokes": 5, "putts": 2},
    "15": {"strokes": 4, "putts": 2},
    "16": {"strokes": 3, "putts": 1},
    "17": {"strokes": 5, "putts": 2},
    "18": {"strokes": 4, "putts": 2}
  }'::jsonb,
  80,
  64,
  0,
  'completed',
  '2025-08-17 15:30:00',
  'ca7c2924-39e8-4b66-bbb8-d9699adb3d65',
  14.5,
  16,
  6.5,
  72.0,
  138,
  '2025-08-17 15:35:00',
  NOW(),
  NOW()
)
ON CONFLICT (id) DO UPDATE SET scores = EXCLUDED.scores, total_gross = EXCLUDED.total_gross, updated_at = NOW();

-- Standalone Match Play at Shepparton - Main user (won 3&2)
INSERT INTO scorecards (id, round_id, player_id, scores, total_gross, total_net, total_points, status, submitted_at, submitted_by, ga_handicap_used, daily_handicap_used, handicap_differential, course_rating_used, slope_rating_used, synced_at, created_at, updated_at)
VALUES (
  'b1000005-0000-0000-0000-000000000005',
  'a1000005-0000-0000-0000-000000000005',
  'ca7c2924-39e8-4b66-bbb8-d9699adb3d65',
  '{
    "1": {"strokes": 6, "putts": 2},
    "2": {"strokes": 4, "putts": 2},
    "3": {"strokes": 6, "putts": 2},
    "4": {"strokes": 5, "putts": 2},
    "5": {"strokes": 4, "putts": 2},
    "6": {"strokes": 5, "putts": 2},
    "7": {"strokes": 5, "putts": 2},
    "8": {"strokes": 5, "putts": 2},
    "9": {"strokes": 6, "putts": 2},
    "10": {"strokes": 5, "putts": 2},
    "11": {"strokes": 5, "putts": 2},
    "12": {"strokes": 4, "putts": 2},
    "13": {"strokes": 5, "putts": 2},
    "14": {"strokes": 5, "putts": 2},
    "15": {"strokes": 4, "putts": 2},
    "16": {"strokes": 6, "putts": 2}
  }'::jsonb,
  80,
  64,
  3,
  'completed',
  '2025-09-08 14:00:00',
  'ca7c2924-39e8-4b66-bbb8-d9699adb3d65',
  14.5,
  16,
  6.4,
  72.0,
  130,
  '2025-09-08 14:05:00',
  NOW(),
  NOW()
)
ON CONFLICT (id) DO UPDATE SET scores = EXCLUDED.scores, total_gross = EXCLUDED.total_gross, updated_at = NOW();


-- ============================================
-- 10. PAIRINGS FOR COMPETITION ROUNDS
-- ============================================

-- Competition 1 Round 1 Pairings
INSERT INTO pairings (id, round_id, player_ids, tee_time, created_at, updated_at)
VALUES
  ('c0000001-0000-0000-0000-000000000001', 'a0000001-0000-0000-0000-000000000001',
   ARRAY['ca7c2924-39e8-4b66-bbb8-d9699adb3d65', 'e0000001-0000-0000-0000-000000000001', 'e0000002-0000-0000-0000-000000000002']::UUID[],
   '07:30:00', NOW(), NOW()),
  ('c0000002-0000-0000-0000-000000000002', 'a0000001-0000-0000-0000-000000000001',
   ARRAY['e0000003-0000-0000-0000-000000000003', 'e0000004-0000-0000-0000-000000000004', 'e0000005-0000-0000-0000-000000000005']::UUID[],
   '07:40:00', NOW(), NOW())
ON CONFLICT (id) DO UPDATE SET player_ids = EXCLUDED.player_ids, updated_at = NOW();

-- Competition 1 Round 2 Pairings
INSERT INTO pairings (id, round_id, player_ids, tee_time, created_at, updated_at)
VALUES
  ('c0000003-0000-0000-0000-000000000003', 'a0000002-0000-0000-0000-000000000002',
   ARRAY['ca7c2924-39e8-4b66-bbb8-d9699adb3d65', 'e0000001-0000-0000-0000-000000000001', 'e0000004-0000-0000-0000-000000000004']::UUID[],
   '08:00:00', NOW(), NOW()),
  ('c0000004-0000-0000-0000-000000000004', 'a0000002-0000-0000-0000-000000000002',
   ARRAY['e0000002-0000-0000-0000-000000000002', 'e0000003-0000-0000-0000-000000000003', 'e0000005-0000-0000-0000-000000000005']::UUID[],
   '08:10:00', NOW(), NOW())
ON CONFLICT (id) DO UPDATE SET player_ids = EXCLUDED.player_ids, updated_at = NOW();


-- ============================================
-- VERIFICATION QUERIES
-- ============================================

-- Check rounds by game type for main user
SELECT
  r.game_type,
  r.is_team_round,
  r.team_format,
  r.date,
  r.status,
  c.name as competition_name
FROM rounds r
LEFT JOIN competitions c ON c.id = r.competition_id
WHERE r.user_id = 'ca7c2924-39e8-4b66-bbb8-d9699adb3d65'
   OR r.competition_id IN (
     SELECT competition_id FROM competition_players
     WHERE player_id = 'ca7c2924-39e8-4b66-bbb8-d9699adb3d65'
   )
ORDER BY r.date DESC;

-- Check scorecards with handicap snapshots
SELECT
  r.game_type,
  r.date,
  s.total_gross,
  s.total_points,
  s.ga_handicap_used,
  s.daily_handicap_used,
  s.handicap_differential
FROM scorecards s
JOIN rounds r ON r.id = s.round_id
WHERE s.player_id = 'ca7c2924-39e8-4b66-bbb8-d9699adb3d65'
ORDER BY r.date DESC;

-- Summary
SELECT
  'Competitions' as type, COUNT(*) as count
FROM competitions
WHERE organizer_id = 'ca7c2924-39e8-4b66-bbb8-d9699adb3d65'
UNION ALL
SELECT
  'Rounds (standalone + comp)', COUNT(*)
FROM rounds
WHERE user_id = 'ca7c2924-39e8-4b66-bbb8-d9699adb3d65'
   OR competition_id IN (
     SELECT competition_id FROM competition_players
     WHERE player_id = 'ca7c2924-39e8-4b66-bbb8-d9699adb3d65'
   )
UNION ALL
SELECT
  'Scorecards', COUNT(*)
FROM scorecards
WHERE player_id = 'ca7c2924-39e8-4b66-bbb8-d9699adb3d65';
