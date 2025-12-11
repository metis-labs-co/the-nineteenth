-- =====================================================
-- Dummy Data Script for Teams & Game Types Testing
-- The Nineteenth - Golf Competition App
-- =====================================================
-- This script creates test data for 3 users across multiple
-- competitions with various game types and team configurations.
-- =====================================================

-- User IDs provided
-- User 1: 41677ffc-f9c4-490b-bc39-1f7370b36c2b (Sam Player)
-- User 2: ca7c2924-39e8-4b66-bbb8-d9699adb3d65 (Jordan Pro)
-- User 3: 7ef2ab5a-6577-4102-8e97-98d1fd58cfe4 (Alex Golfer)

-- Existing Course IDs:
-- Kingston Heath: c0000001-0000-0000-0000-000000000001
-- Royal Melbourne: c0000002-0000-0000-0000-000000000002
-- Victoria GC: c0000003-0000-0000-0000-000000000003
-- The Australian: c0000004-0000-0000-0000-000000000004
-- Royal Adelaide: c0000005-0000-0000-0000-000000000005
-- The Dunes: c0000006-0000-0000-0000-000000000006
-- Eastern (South/North): c1111111-1111-1111-1111-111111111111
-- Eastern (North/East): c2222222-2222-2222-2222-222222222222
-- Eastern (East/South): c3333333-3333-3333-3333-333333333333

-- =====================================================
-- STEP 1: Update Players with Handicaps
-- =====================================================

UPDATE players SET handicap = 12.5 WHERE id = '41677ffc-f9c4-490b-bc39-1f7370b36c2b';
UPDATE players SET handicap = 18.2 WHERE id = 'ca7c2924-39e8-4b66-bbb8-d9699adb3d65';
UPDATE players SET handicap = 24.0 WHERE id = '7ef2ab5a-6577-4102-8e97-98d1fd58cfe4';

-- =====================================================
-- COMPETITION 1: Individual Stableford League (No Teams)
-- =====================================================
-- Classic individual competition with multiple rounds
-- Uses: Kingston Heath, Royal Melbourne, Victoria GC

INSERT INTO competitions (
  id, name, description, competition_type, start_date,
  handicap_system, organizer_id, status, invite_code,
  team_mode, team_size, point_system
) VALUES (
  'aaaa1111-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
  'Summer Stableford Series',
  'Weekly individual stableford competition - all welcome!',
  'league',
  '2025-01-01',
  'honor',
  '41677ffc-f9c4-490b-bc39-1f7370b36c2b',
  'in-progress',
  'STAB-001',
  'none',
  NULL,
  '{"type": "position", "rules": {"1": 10, "2": 8, "3": 6, "default": 1}, "matchPlay": {"win": 3, "draw": 1, "loss": 0}}'
);

-- Add all 3 players
INSERT INTO competition_players (competition_id, player_id, status) VALUES
  ('aaaa1111-aaaa-aaaa-aaaa-aaaaaaaaaaaa', '41677ffc-f9c4-490b-bc39-1f7370b36c2b', 'accepted'),
  ('aaaa1111-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'ca7c2924-39e8-4b66-bbb8-d9699adb3d65', 'accepted'),
  ('aaaa1111-aaaa-aaaa-aaaa-aaaaaaaaaaaa', '7ef2ab5a-6577-4102-8e97-98d1fd58cfe4', 'accepted');

-- Round 1: Stableford at Kingston Heath
INSERT INTO rounds (id, competition_id, round_number, course_id, date, game_type, status, is_team_round, team_format) VALUES
  ('aaaa1111-0001-0001-0001-000000000001', 'aaaa1111-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 1, 'c0000001-0000-0000-0000-000000000001', '2025-01-07', 'stableford', 'completed', FALSE, NULL);

-- Round 2: Stroke Play at Royal Melbourne
INSERT INTO rounds (id, competition_id, round_number, course_id, date, game_type, status, is_team_round, team_format) VALUES
  ('aaaa1111-0002-0002-0002-000000000002', 'aaaa1111-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 2, 'c0000002-0000-0000-0000-000000000002', '2025-01-14', 'stroke', 'completed', FALSE, NULL);

-- Round 3: Upcoming Stableford at Victoria GC
INSERT INTO rounds (id, competition_id, round_number, course_id, date, game_type, status, is_team_round, team_format) VALUES
  ('aaaa1111-0003-0003-0003-000000000003', 'aaaa1111-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 3, 'c0000003-0000-0000-0000-000000000003', '2025-01-21', 'stableford', 'upcoming', FALSE, NULL);

-- Pairings for completed rounds
INSERT INTO pairings (id, round_id, player_ids) VALUES
  ('aaaa1111-a001-a001-a001-aaaaaaaaa001', 'aaaa1111-0001-0001-0001-000000000001', ARRAY['41677ffc-f9c4-490b-bc39-1f7370b36c2b', 'ca7c2924-39e8-4b66-bbb8-d9699adb3d65', '7ef2ab5a-6577-4102-8e97-98d1fd58cfe4']::uuid[]),
  ('aaaa1111-a002-a002-a002-aaaaaaaaa002', 'aaaa1111-0002-0002-0002-000000000002', ARRAY['41677ffc-f9c4-490b-bc39-1f7370b36c2b', 'ca7c2924-39e8-4b66-bbb8-d9699adb3d65', '7ef2ab5a-6577-4102-8e97-98d1fd58cfe4']::uuid[]);

-- Scorecards for Round 1 (Stableford)
INSERT INTO scorecards (id, round_id, player_id, scores, total_gross, total_net, total_points, status, submitted_at) VALUES
  ('aaaa1111-0c01-0c01-0c01-0c0c0c0c0001', 'aaaa1111-0001-0001-0001-000000000001', '41677ffc-f9c4-490b-bc39-1f7370b36c2b',
   '{"1":{"strokes":5},"2":{"strokes":5},"3":{"strokes":3},"4":{"strokes":6},"5":{"strokes":5},"6":{"strokes":4},"7":{"strokes":3},"8":{"strokes":5},"9":{"strokes":6},"10":{"strokes":4},"11":{"strokes":5},"12":{"strokes":3},"13":{"strokes":6},"14":{"strokes":5},"15":{"strokes":4},"16":{"strokes":3},"17":{"strokes":5},"18":{"strokes":6}}'::jsonb,
   83, 71, 36, 'completed', NOW()),
  ('aaaa1111-0c02-0c02-0c02-0c0c0c0c0002', 'aaaa1111-0001-0001-0001-000000000001', 'ca7c2924-39e8-4b66-bbb8-d9699adb3d65',
   '{"1":{"strokes":6},"2":{"strokes":5},"3":{"strokes":4},"4":{"strokes":7},"5":{"strokes":5},"6":{"strokes":5},"7":{"strokes":4},"8":{"strokes":5},"9":{"strokes":6},"10":{"strokes":5},"11":{"strokes":5},"12":{"strokes":4},"13":{"strokes":6},"14":{"strokes":5},"15":{"strokes":5},"16":{"strokes":4},"17":{"strokes":5},"18":{"strokes":6}}'::jsonb,
   92, 74, 32, 'completed', NOW()),
  ('aaaa1111-0c03-0c03-0c03-0c0c0c0c0003', 'aaaa1111-0001-0001-0001-000000000001', '7ef2ab5a-6577-4102-8e97-98d1fd58cfe4',
   '{"1":{"strokes":6},"2":{"strokes":6},"3":{"strokes":4},"4":{"strokes":7},"5":{"strokes":6},"6":{"strokes":5},"7":{"strokes":4},"8":{"strokes":6},"9":{"strokes":7},"10":{"strokes":5},"11":{"strokes":6},"12":{"strokes":4},"13":{"strokes":7},"14":{"strokes":5},"15":{"strokes":5},"16":{"strokes":4},"17":{"strokes":6},"18":{"strokes":7}}'::jsonb,
   100, 76, 28, 'completed', NOW());

-- Round Results for Round 1
INSERT INTO round_results (id, round_id, player_id, raw_score, raw_result_data, position, competition_points, is_team_result) VALUES
  ('aaaa1111-0e01-0e01-0e01-0e0e0e0e0001', 'aaaa1111-0001-0001-0001-000000000001', '41677ffc-f9c4-490b-bc39-1f7370b36c2b', 36, '{"totalPoints": 36, "totalGross": 83}'::jsonb, 1, 10, FALSE),
  ('aaaa1111-0e02-0e02-0e02-0e0e0e0e0002', 'aaaa1111-0001-0001-0001-000000000001', 'ca7c2924-39e8-4b66-bbb8-d9699adb3d65', 32, '{"totalPoints": 32, "totalGross": 92}'::jsonb, 2, 8, FALSE),
  ('aaaa1111-0e03-0e03-0e03-0e0e0e0e0003', 'aaaa1111-0001-0001-0001-000000000001', '7ef2ab5a-6577-4102-8e97-98d1fd58cfe4', 28, '{"totalPoints": 28, "totalGross": 100}'::jsonb, 3, 6, FALSE);

-- Scorecards for Round 2 (Stroke)
INSERT INTO scorecards (id, round_id, player_id, scores, total_gross, total_net, total_points, status, submitted_at) VALUES
  ('aaaa2222-0c01-0c01-0c01-0c0c0c0c0001', 'aaaa1111-0002-0002-0002-000000000002', '41677ffc-f9c4-490b-bc39-1f7370b36c2b',
   '{"1":{"strokes":5},"2":{"strokes":4},"3":{"strokes":3},"4":{"strokes":5},"5":{"strokes":5},"6":{"strokes":4},"7":{"strokes":3},"8":{"strokes":4},"9":{"strokes":5},"10":{"strokes":4},"11":{"strokes":4},"12":{"strokes":3},"13":{"strokes":5},"14":{"strokes":4},"15":{"strokes":4},"16":{"strokes":3},"17":{"strokes":4},"18":{"strokes":5}}'::jsonb,
   74, 62, 0, 'completed', NOW()),
  ('aaaa2222-0c02-0c02-0c02-0c0c0c0c0002', 'aaaa1111-0002-0002-0002-000000000002', 'ca7c2924-39e8-4b66-bbb8-d9699adb3d65',
   '{"1":{"strokes":5},"2":{"strokes":5},"3":{"strokes":3},"4":{"strokes":6},"5":{"strokes":5},"6":{"strokes":5},"7":{"strokes":3},"8":{"strokes":5},"9":{"strokes":6},"10":{"strokes":5},"11":{"strokes":5},"12":{"strokes":3},"13":{"strokes":6},"14":{"strokes":5},"15":{"strokes":4},"16":{"strokes":3},"17":{"strokes":5},"18":{"strokes":6}}'::jsonb,
   85, 67, 0, 'completed', NOW()),
  ('aaaa2222-0c03-0c03-0c03-0c0c0c0c0003', 'aaaa1111-0002-0002-0002-000000000002', '7ef2ab5a-6577-4102-8e97-98d1fd58cfe4',
   '{"1":{"strokes":6},"2":{"strokes":5},"3":{"strokes":4},"4":{"strokes":6},"5":{"strokes":5},"6":{"strokes":5},"7":{"strokes":4},"8":{"strokes":5},"9":{"strokes":6},"10":{"strokes":5},"11":{"strokes":5},"12":{"strokes":4},"13":{"strokes":6},"14":{"strokes":5},"15":{"strokes":5},"16":{"strokes":3},"17":{"strokes":5},"18":{"strokes":6}}'::jsonb,
   90, 66, 0, 'completed', NOW());

-- Round Results for Round 2 (Stroke - lower net is better)
INSERT INTO round_results (id, round_id, player_id, raw_score, raw_result_data, position, competition_points, is_team_result) VALUES
  ('aaaa2222-0e01-0e01-0e01-0e0e0e0e0001', 'aaaa1111-0002-0002-0002-000000000002', '41677ffc-f9c4-490b-bc39-1f7370b36c2b', 62, '{"netScore": 62, "grossScore": 74}'::jsonb, 1, 10, FALSE),
  ('aaaa2222-0e02-0e02-0e02-0e0e0e0e0002', 'aaaa1111-0002-0002-0002-000000000002', '7ef2ab5a-6577-4102-8e97-98d1fd58cfe4', 66, '{"netScore": 66, "grossScore": 90}'::jsonb, 2, 8, FALSE),
  ('aaaa2222-0e03-0e03-0e03-0e0e0e0e0003', 'aaaa1111-0002-0002-0002-000000000002', 'ca7c2924-39e8-4b66-bbb8-d9699adb3d65', 67, '{"netScore": 67, "grossScore": 85}'::jsonb, 3, 6, FALSE);


-- =====================================================
-- COMPETITION 2: Match Play Championship (Individual)
-- =====================================================
-- Individual match play competition at The Australian

INSERT INTO competitions (
  id, name, description, competition_type, start_date, end_date,
  handicap_system, organizer_id, status, invite_code,
  team_mode, team_size, point_system
) VALUES (
  'bbbb2222-bbbb-bbbb-bbbb-bbbbbbbbbbbb',
  'Match Play Masters',
  'Head-to-head match play battles!',
  'event',
  '2025-02-01',
  '2025-02-28',
  'honor',
  'ca7c2924-39e8-4b66-bbb8-d9699adb3d65',
  'in-progress',
  'MATCH-002',
  'none',
  NULL,
  '{"type": "position", "rules": {"1": 10, "2": 8, "3": 6, "default": 1}, "matchPlay": {"win": 3, "draw": 1, "loss": 0}}'
);

-- Add all 3 players
INSERT INTO competition_players (competition_id, player_id, status) VALUES
  ('bbbb2222-bbbb-bbbb-bbbb-bbbbbbbbbbbb', '41677ffc-f9c4-490b-bc39-1f7370b36c2b', 'accepted'),
  ('bbbb2222-bbbb-bbbb-bbbb-bbbbbbbbbbbb', 'ca7c2924-39e8-4b66-bbb8-d9699adb3d65', 'accepted'),
  ('bbbb2222-bbbb-bbbb-bbbb-bbbbbbbbbbbb', '7ef2ab5a-6577-4102-8e97-98d1fd58cfe4', 'accepted');

-- Round 1: Match Play at The Australian (User 1 vs User 2)
INSERT INTO rounds (id, competition_id, round_number, course_id, date, game_type, status, is_team_round, team_format) VALUES
  ('bbbb2222-0001-0001-0001-000000000001', 'bbbb2222-bbbb-bbbb-bbbb-bbbbbbbbbbbb', 1, 'c0000004-0000-0000-0000-000000000004', '2025-02-05', 'match-play', 'completed', FALSE, NULL);

-- Match Play Results (User 1 beat User 2: 3&2)
INSERT INTO round_results (id, round_id, player_id, raw_score, raw_result_data, position, competition_points, is_team_result) VALUES
  ('bbbb2222-0e01-0e01-0e01-0e0e0e0e0001', 'bbbb2222-0001-0001-0001-000000000001', '41677ffc-f9c4-490b-bc39-1f7370b36c2b', 3,
   '{"opponentId": "ca7c2924-39e8-4b66-bbb8-d9699adb3d65", "matchResult": "win", "holesWon": 5, "holesLost": 2, "holesHalved": 9, "finalScore": "3&2"}'::jsonb,
   1, 3, FALSE),
  ('bbbb2222-0e02-0e02-0e02-0e0e0e0e0002', 'bbbb2222-0001-0001-0001-000000000001', 'ca7c2924-39e8-4b66-bbb8-d9699adb3d65', 0,
   '{"opponentId": "41677ffc-f9c4-490b-bc39-1f7370b36c2b", "matchResult": "loss", "holesWon": 2, "holesLost": 5, "holesHalved": 9, "finalScore": "3&2"}'::jsonb,
   2, 0, FALSE);

-- Round 2: Match Play at The Australian (User 2 vs User 3)
INSERT INTO rounds (id, competition_id, round_number, course_id, date, game_type, status, is_team_round, team_format) VALUES
  ('bbbb2222-0002-0002-0002-000000000002', 'bbbb2222-bbbb-bbbb-bbbb-bbbbbbbbbbbb', 2, 'c0000004-0000-0000-0000-000000000004', '2025-02-12', 'match-play', 'completed', FALSE, NULL);

-- Match Play Results (User 2 beat User 3: 2 up)
INSERT INTO round_results (id, round_id, player_id, raw_score, raw_result_data, position, competition_points, is_team_result) VALUES
  ('bbbb2222-0e03-0e03-0e03-0e0e0e0e0003', 'bbbb2222-0002-0002-0002-000000000002', 'ca7c2924-39e8-4b66-bbb8-d9699adb3d65', 3,
   '{"opponentId": "7ef2ab5a-6577-4102-8e97-98d1fd58cfe4", "matchResult": "win", "holesWon": 6, "holesLost": 4, "holesHalved": 8, "finalScore": "2 up"}'::jsonb,
   1, 3, FALSE),
  ('bbbb2222-0e04-0e04-0e04-0e0e0e0e0004', 'bbbb2222-0002-0002-0002-000000000002', '7ef2ab5a-6577-4102-8e97-98d1fd58cfe4', 0,
   '{"opponentId": "ca7c2924-39e8-4b66-bbb8-d9699adb3d65", "matchResult": "loss", "holesWon": 4, "holesLost": 6, "holesHalved": 8, "finalScore": "2 down"}'::jsonb,
   2, 0, FALSE);


-- =====================================================
-- COMPETITION 3: Team Challenge (Fixed Teams)
-- =====================================================
-- Fixed team competition with Best Ball and Scramble rounds
-- Uses Eastern Golf Club courses

INSERT INTO competitions (
  id, name, description, competition_type, start_date,
  handicap_system, organizer_id, status, invite_code,
  team_mode, team_size, point_system
) VALUES (
  'cccc3333-cccc-cccc-cccc-cccccccccccc',
  'Pairs Team Challenge',
  'Fixed teams compete across multiple formats!',
  'league',
  '2025-03-01',
  'honor',
  '7ef2ab5a-6577-4102-8e97-98d1fd58cfe4',
  'in-progress',
  'TEAM-003',
  'fixed',
  2,
  '{"type": "position", "rules": {"1": 10, "2": 8, "default": 2}, "matchPlay": {"win": 3, "draw": 1, "loss": 0}}'
);

-- Add all 3 players (one team will have 1 player for demo)
INSERT INTO competition_players (competition_id, player_id, status) VALUES
  ('cccc3333-cccc-cccc-cccc-cccccccccccc', '41677ffc-f9c4-490b-bc39-1f7370b36c2b', 'accepted'),
  ('cccc3333-cccc-cccc-cccc-cccccccccccc', 'ca7c2924-39e8-4b66-bbb8-d9699adb3d65', 'accepted'),
  ('cccc3333-cccc-cccc-cccc-cccccccccccc', '7ef2ab5a-6577-4102-8e97-98d1fd58cfe4', 'accepted');

-- Create Teams
INSERT INTO teams (id, competition_id, name) VALUES
  ('cccc3333-0a01-0a01-0a01-0a0a0a0a0001', 'cccc3333-cccc-cccc-cccc-cccccccccccc', 'Team Alpha'),
  ('cccc3333-0a02-0a02-0a02-0a0a0a0a0002', 'cccc3333-cccc-cccc-cccc-cccccccccccc', 'Team Beta');

-- Add Team Members (User 1 + User 2 = Team Alpha, User 3 = Team Beta solo for demo)
INSERT INTO team_members (team_id, player_id) VALUES
  ('cccc3333-0a01-0a01-0a01-0a0a0a0a0001', '41677ffc-f9c4-490b-bc39-1f7370b36c2b'),
  ('cccc3333-0a01-0a01-0a01-0a0a0a0a0001', 'ca7c2924-39e8-4b66-bbb8-d9699adb3d65'),
  ('cccc3333-0a02-0a02-0a02-0a0a0a0a0002', '7ef2ab5a-6577-4102-8e97-98d1fd58cfe4');

-- Round 1: Team Best Ball at Eastern (South/North)
INSERT INTO rounds (id, competition_id, round_number, course_id, date, game_type, status, is_team_round, team_format) VALUES
  ('cccc3333-0001-0001-0001-000000000001', 'cccc3333-cccc-cccc-cccc-cccccccccccc', 1, 'c1111111-1111-1111-1111-111111111111', '2025-03-05', 'stableford', 'completed', TRUE, 'best-ball');

-- Team Round Results for Best Ball
INSERT INTO round_results (id, round_id, team_id, raw_score, raw_result_data, position, competition_points, is_team_result) VALUES
  ('cccc3333-0e01-0e01-0e01-0e0e0e0e0001', 'cccc3333-0001-0001-0001-000000000001', 'cccc3333-0a01-0a01-0a01-0a0a0a0a0001', 42,
   '{"format": "best-ball", "totalPoints": 42, "memberScores": [{"playerId": "41677ffc-f9c4-490b-bc39-1f7370b36c2b", "points": 36}, {"playerId": "ca7c2924-39e8-4b66-bbb8-d9699adb3d65", "points": 32}]}'::jsonb,
   1, 10, TRUE),
  ('cccc3333-0e02-0e02-0e02-0e0e0e0e0002', 'cccc3333-0001-0001-0001-000000000001', 'cccc3333-0a02-0a02-0a02-0a0a0a0a0002', 28,
   '{"format": "best-ball", "totalPoints": 28, "memberScores": [{"playerId": "7ef2ab5a-6577-4102-8e97-98d1fd58cfe4", "points": 28}]}'::jsonb,
   2, 8, TRUE);

-- Round 2: Team Scramble at Eastern (North/East)
INSERT INTO rounds (id, competition_id, round_number, course_id, date, game_type, status, is_team_round, team_format) VALUES
  ('cccc3333-0002-0002-0002-000000000002', 'cccc3333-cccc-cccc-cccc-cccccccccccc', 2, 'c2222222-2222-2222-2222-222222222222', '2025-03-12', 'stroke', 'completed', TRUE, 'scramble');

-- Team Round Results for Scramble (lower gross is better)
INSERT INTO round_results (id, round_id, team_id, raw_score, raw_result_data, position, competition_points, is_team_result) VALUES
  ('cccc3333-0e03-0e03-0e03-0e0e0e0e0003', 'cccc3333-0002-0002-0002-000000000002', 'cccc3333-0a01-0a01-0a01-0a0a0a0a0001', 68,
   '{"format": "scramble", "grossScore": 68, "netScore": 60, "teamHandicap": 8}'::jsonb,
   1, 10, TRUE),
  ('cccc3333-0e04-0e04-0e04-0e0e0e0e0004', 'cccc3333-0002-0002-0002-000000000002', 'cccc3333-0a02-0a02-0a02-0a0a0a0a0002', 78,
   '{"format": "scramble", "grossScore": 78, "netScore": 66, "teamHandicap": 12}'::jsonb,
   2, 8, TRUE);

-- Round 3: Team Match Play at Eastern (East/South) - Upcoming
INSERT INTO rounds (id, competition_id, round_number, course_id, date, game_type, status, is_team_round, team_format) VALUES
  ('cccc3333-0003-0003-0003-000000000003', 'cccc3333-cccc-cccc-cccc-cccccccccccc', 3, 'c3333333-3333-3333-3333-333333333333', '2025-03-19', 'match-play', 'upcoming', TRUE, 'match-play-team');


-- =====================================================
-- COMPETITION 4: Mixed Format Cup (Per-Round Teams)
-- =====================================================
-- Teams can change each round - mixing individual and team rounds
-- Uses Royal Adelaide and The Dunes

INSERT INTO competitions (
  id, name, description, competition_type, start_date, end_date,
  handicap_system, organizer_id, status, invite_code,
  team_mode, team_size, point_system
) VALUES (
  'dddd4444-dddd-dddd-dddd-dddddddddddd',
  'Mixed Format Cup 2025',
  'Ultimate test - individual and team rounds with changing partners!',
  'event',
  '2025-04-01',
  '2025-04-30',
  'honor',
  '41677ffc-f9c4-490b-bc39-1f7370b36c2b',
  'upcoming',
  'MIX-004',
  'per-round',
  2,
  '{"type": "position", "rules": {"1": 15, "2": 12, "3": 10, "4": 8, "5": 6, "default": 2}, "matchPlay": {"win": 5, "draw": 2, "loss": 0}}'
);

-- Add all 3 players
INSERT INTO competition_players (competition_id, player_id, status) VALUES
  ('dddd4444-dddd-dddd-dddd-dddddddddddd', '41677ffc-f9c4-490b-bc39-1f7370b36c2b', 'accepted'),
  ('dddd4444-dddd-dddd-dddd-dddddddddddd', 'ca7c2924-39e8-4b66-bbb8-d9699adb3d65', 'accepted'),
  ('dddd4444-dddd-dddd-dddd-dddddddddddd', '7ef2ab5a-6577-4102-8e97-98d1fd58cfe4', 'accepted');

-- Round 1: Individual Stableford at Royal Adelaide (no teams)
INSERT INTO rounds (id, competition_id, round_number, course_id, date, game_type, status, is_team_round, team_format) VALUES
  ('dddd4444-0001-0001-0001-000000000001', 'dddd4444-dddd-dddd-dddd-dddddddddddd', 1, 'c0000005-0000-0000-0000-000000000005', '2025-04-05', 'stableford', 'upcoming', FALSE, NULL);

-- Round 2: Team Best Ball at The Dunes (teams formed for this round)
INSERT INTO rounds (id, competition_id, round_number, course_id, date, game_type, status, is_team_round, team_format) VALUES
  ('dddd4444-0002-0002-0002-000000000002', 'dddd4444-dddd-dddd-dddd-dddddddddddd', 2, 'c0000006-0000-0000-0000-000000000006', '2025-04-12', 'stableford', 'upcoming', TRUE, 'best-ball');

-- Round 3: Individual Match Play at Royal Adelaide
INSERT INTO rounds (id, competition_id, round_number, course_id, date, game_type, status, is_team_round, team_format) VALUES
  ('dddd4444-0003-0003-0003-000000000003', 'dddd4444-dddd-dddd-dddd-dddddddddddd', 3, 'c0000005-0000-0000-0000-000000000005', '2025-04-19', 'match-play', 'upcoming', FALSE, NULL);

-- Round 4: Team Scramble at The Dunes (different teams possible)
INSERT INTO rounds (id, competition_id, round_number, course_id, date, game_type, status, is_team_round, team_format) VALUES
  ('dddd4444-0004-0004-0004-000000000004', 'dddd4444-dddd-dddd-dddd-dddddddddddd', 4, 'c0000006-0000-0000-0000-000000000006', '2025-04-26', 'stroke', 'upcoming', TRUE, 'scramble');


-- =====================================================
-- VERIFICATION QUERIES
-- =====================================================

SELECT
  'Competitions' as entity,
  COUNT(*) as count
FROM competitions
WHERE id IN ('aaaa1111-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'bbbb2222-bbbb-bbbb-bbbb-bbbbbbbbbbbb', 'cccc3333-cccc-cccc-cccc-cccccccccccc', 'dddd4444-dddd-dddd-dddd-dddddddddddd')
UNION ALL
SELECT 'Rounds', COUNT(*) FROM rounds WHERE competition_id IN ('aaaa1111-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'bbbb2222-bbbb-bbbb-bbbb-bbbbbbbbbbbb', 'cccc3333-cccc-cccc-cccc-cccccccccccc', 'dddd4444-dddd-dddd-dddd-dddddddddddd')
UNION ALL
SELECT 'Teams', COUNT(*) FROM teams WHERE competition_id IN ('cccc3333-cccc-cccc-cccc-cccccccccccc', 'dddd4444-dddd-dddd-dddd-dddddddddddd')
UNION ALL
SELECT 'Team Members', COUNT(*) FROM team_members WHERE team_id IN (SELECT id FROM teams WHERE competition_id IN ('cccc3333-cccc-cccc-cccc-cccccccccccc', 'dddd4444-dddd-dddd-dddd-dddddddddddd'))
UNION ALL
SELECT 'Round Results', COUNT(*) FROM round_results WHERE round_id IN (SELECT id FROM rounds WHERE competition_id IN ('aaaa1111-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'bbbb2222-bbbb-bbbb-bbbb-bbbbbbbbbbbb', 'cccc3333-cccc-cccc-cccc-cccccccccccc'))
UNION ALL
SELECT 'Scorecards', COUNT(*) FROM scorecards WHERE round_id IN (SELECT id FROM rounds WHERE competition_id IN ('aaaa1111-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'bbbb2222-bbbb-bbbb-bbbb-bbbbbbbbbbbb'));
