-- =====================================================
-- Expanded Test Data Script
-- The Nineteenth - Golf Competition App
-- =====================================================
-- This script creates comprehensive test data with:
-- - 7 players with varied handicaps
-- - 6 competitions with different formats
-- - 26 rounds across various courses
-- - Teams for team-based competitions
-- - Scorecards and round results for completed rounds
-- =====================================================

-- =====================================================
-- Player UUIDs Reference
-- =====================================================
-- Player 1: 41677ffc-f9c4-490b-bc39-1f7370b36c2b (Sam - 12.5 hcp)
-- Player 2: ca7c2924-39e8-4b66-bbb8-d9699adb3d65 (Jordan - 18.2 hcp)
-- Player 3: 7ef2ab5a-6577-4102-8e97-98d1fd58cfe4 (Alex - 24.0 hcp)
-- Player 4: df045f29-718a-41b5-ac4a-9a8dbf26c6cb (Riley - 8.5 hcp)
-- Player 5: 25c171c8-c087-4d4a-b3be-545acdfe3f11 (Casey - 15.0 hcp)
-- Player 6: 74e84922-d5fc-4cdb-9835-251c31784309 (Morgan - 22.5 hcp)
-- Player 7: 5d7c1ffc-0ad4-486b-b069-d93d626c762f (Taylor - 28.0 hcp)

-- =====================================================
-- Course IDs Reference
-- =====================================================
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
-- STEP 1: Update Player Handicaps
-- =====================================================

UPDATE players SET handicap = 12.5 WHERE id = '41677ffc-f9c4-490b-bc39-1f7370b36c2b';
UPDATE players SET handicap = 18.2 WHERE id = 'ca7c2924-39e8-4b66-bbb8-d9699adb3d65';
UPDATE players SET handicap = 24.0 WHERE id = '7ef2ab5a-6577-4102-8e97-98d1fd58cfe4';
UPDATE players SET handicap = 8.5  WHERE id = 'df045f29-718a-41b5-ac4a-9a8dbf26c6cb';
UPDATE players SET handicap = 15.0 WHERE id = '25c171c8-c087-4d4a-b3be-545acdfe3f11';
UPDATE players SET handicap = 22.5 WHERE id = '74e84922-d5fc-4cdb-9835-251c31784309';
UPDATE players SET handicap = 28.0 WHERE id = '5d7c1ffc-0ad4-486b-b069-d93d626c762f';


-- =====================================================
-- COMPETITION 1: Summer Stableford League
-- =====================================================
-- Individual competition with all 7 players, 5 rounds
-- team_mode: none, game_type: stableford

INSERT INTO competitions (
  id, name, description, competition_type, start_date,
  handicap_system, organizer_id, status, invite_code,
  team_mode, team_size, point_system
) VALUES (
  '11111111-1111-1111-1111-111111111111',
  'Summer Stableford League',
  'Weekly individual stableford competition for the summer season. All handicaps welcome!',
  'league',
  '2025-01-06',
  'honor',
  '41677ffc-f9c4-490b-bc39-1f7370b36c2b',
  'in-progress',
  'SUMMER-01',
  'none',
  NULL,
  '{"type": "position", "rules": {"1": 10, "2": 8, "3": 6, "4": 5, "5": 4, "6": 3, "7": 2, "default": 1}, "matchPlay": {"win": 3, "draw": 1, "loss": 0}}'
);

-- Add all 7 players
INSERT INTO competition_players (competition_id, player_id, status) VALUES
  ('11111111-1111-1111-1111-111111111111', '41677ffc-f9c4-490b-bc39-1f7370b36c2b', 'accepted'),
  ('11111111-1111-1111-1111-111111111111', 'ca7c2924-39e8-4b66-bbb8-d9699adb3d65', 'accepted'),
  ('11111111-1111-1111-1111-111111111111', '7ef2ab5a-6577-4102-8e97-98d1fd58cfe4', 'accepted'),
  ('11111111-1111-1111-1111-111111111111', 'df045f29-718a-41b5-ac4a-9a8dbf26c6cb', 'accepted'),
  ('11111111-1111-1111-1111-111111111111', '25c171c8-c087-4d4a-b3be-545acdfe3f11', 'accepted'),
  ('11111111-1111-1111-1111-111111111111', '74e84922-d5fc-4cdb-9835-251c31784309', 'accepted'),
  ('11111111-1111-1111-1111-111111111111', '5d7c1ffc-0ad4-486b-b069-d93d626c762f', 'accepted');

-- Round 1: Kingston Heath - Completed (with scoring pairs - 4-some uses circular chain)
INSERT INTO rounds (id, competition_id, round_number, course_id, date, game_type, status, is_team_round, team_format, scoring_pairs_required) VALUES
  ('11111111-0001-0001-0001-000000000001', '11111111-1111-1111-1111-111111111111', 1, 'c0000001-0000-0000-0000-000000000001', '2025-01-06', 'stableford', 'completed', FALSE, NULL, TRUE);

-- Round 2: Royal Melbourne - Completed (with scoring pairs)
INSERT INTO rounds (id, competition_id, round_number, course_id, date, game_type, status, is_team_round, team_format, scoring_pairs_required) VALUES
  ('11111111-0002-0002-0002-000000000002', '11111111-1111-1111-1111-111111111111', 2, 'c0000002-0000-0000-0000-000000000002', '2025-01-13', 'stableford', 'completed', FALSE, NULL, TRUE);

-- Round 3: Victoria GC - Completed (no scoring pairs required)
INSERT INTO rounds (id, competition_id, round_number, course_id, date, game_type, status, is_team_round, team_format, scoring_pairs_required) VALUES
  ('11111111-0003-0003-0003-000000000003', '11111111-1111-1111-1111-111111111111', 3, 'c0000003-0000-0000-0000-000000000003', '2025-01-20', 'stableford', 'completed', FALSE, NULL, FALSE);

-- Round 4: Eastern (South/North) - In Progress (with scoring pairs)
INSERT INTO rounds (id, competition_id, round_number, course_id, date, game_type, status, is_team_round, team_format, scoring_pairs_required) VALUES
  ('11111111-0004-0004-0004-000000000004', '11111111-1111-1111-1111-111111111111', 4, 'c1111111-1111-1111-1111-111111111111', '2025-01-27', 'stableford', 'in-progress', FALSE, NULL, TRUE);

-- Round 5: The Dunes - Upcoming (with scoring pairs - will need to be set up)
INSERT INTO rounds (id, competition_id, round_number, course_id, date, game_type, status, is_team_round, team_format, scoring_pairs_required) VALUES
  ('11111111-0005-0005-0005-000000000005', '11111111-1111-1111-1111-111111111111', 5, 'c0000006-0000-0000-0000-000000000006', '2025-02-03', 'stableford', 'upcoming', FALSE, NULL, TRUE);

-- Pairings for Round 1 (4-some and 3-some)
INSERT INTO pairings (id, round_id, player_ids) VALUES
  ('11111111-a001-a001-a001-000000000001', '11111111-0001-0001-0001-000000000001',
   ARRAY['41677ffc-f9c4-490b-bc39-1f7370b36c2b', 'ca7c2924-39e8-4b66-bbb8-d9699adb3d65', 'df045f29-718a-41b5-ac4a-9a8dbf26c6cb', '25c171c8-c087-4d4a-b3be-545acdfe3f11']::uuid[]),
  ('11111111-a002-a002-a002-000000000002', '11111111-0001-0001-0001-000000000001',
   ARRAY['7ef2ab5a-6577-4102-8e97-98d1fd58cfe4', '74e84922-d5fc-4cdb-9835-251c31784309', '5d7c1ffc-0ad4-486b-b069-d93d626c762f']::uuid[]);

-- Pairings for Round 2
INSERT INTO pairings (id, round_id, player_ids) VALUES
  ('11111111-a003-a003-a003-000000000003', '11111111-0002-0002-0002-000000000002',
   ARRAY['df045f29-718a-41b5-ac4a-9a8dbf26c6cb', '41677ffc-f9c4-490b-bc39-1f7370b36c2b', '7ef2ab5a-6577-4102-8e97-98d1fd58cfe4', '5d7c1ffc-0ad4-486b-b069-d93d626c762f']::uuid[]),
  ('11111111-a004-a004-a004-000000000004', '11111111-0002-0002-0002-000000000002',
   ARRAY['ca7c2924-39e8-4b66-bbb8-d9699adb3d65', '25c171c8-c087-4d4a-b3be-545acdfe3f11', '74e84922-d5fc-4cdb-9835-251c31784309']::uuid[]);

-- Pairings for Round 3
INSERT INTO pairings (id, round_id, player_ids) VALUES
  ('11111111-a005-a005-a005-000000000005', '11111111-0003-0003-0003-000000000003',
   ARRAY['25c171c8-c087-4d4a-b3be-545acdfe3f11', 'df045f29-718a-41b5-ac4a-9a8dbf26c6cb', '74e84922-d5fc-4cdb-9835-251c31784309', 'ca7c2924-39e8-4b66-bbb8-d9699adb3d65']::uuid[]),
  ('11111111-a006-a006-a006-000000000006', '11111111-0003-0003-0003-000000000003',
   ARRAY['41677ffc-f9c4-490b-bc39-1f7370b36c2b', '7ef2ab5a-6577-4102-8e97-98d1fd58cfe4', '5d7c1ffc-0ad4-486b-b069-d93d626c762f']::uuid[]);

-- Scorecards for Round 1 (all 7 players)
INSERT INTO scorecards (id, round_id, player_id, scores, total_gross, total_net, total_points, status, submitted_at) VALUES
  ('11111111-b001-b001-b001-000000000001', '11111111-0001-0001-0001-000000000001', '41677ffc-f9c4-490b-bc39-1f7370b36c2b',
   '{"1":{"strokes":5},"2":{"strokes":4},"3":{"strokes":3},"4":{"strokes":5},"5":{"strokes":4},"6":{"strokes":4},"7":{"strokes":3},"8":{"strokes":5},"9":{"strokes":5},"10":{"strokes":4},"11":{"strokes":5},"12":{"strokes":3},"13":{"strokes":5},"14":{"strokes":4},"15":{"strokes":4},"16":{"strokes":3},"17":{"strokes":4},"18":{"strokes":5}}'::jsonb,
   75, 63, 38, 'completed', NOW()),
  ('11111111-b002-b002-b002-000000000002', '11111111-0001-0001-0001-000000000001', 'ca7c2924-39e8-4b66-bbb8-d9699adb3d65',
   '{"1":{"strokes":6},"2":{"strokes":5},"3":{"strokes":4},"4":{"strokes":6},"5":{"strokes":5},"6":{"strokes":5},"7":{"strokes":3},"8":{"strokes":5},"9":{"strokes":6},"10":{"strokes":5},"11":{"strokes":5},"12":{"strokes":4},"13":{"strokes":6},"14":{"strokes":5},"15":{"strokes":5},"16":{"strokes":4},"17":{"strokes":5},"18":{"strokes":6}}'::jsonb,
   90, 72, 34, 'completed', NOW()),
  ('11111111-b003-b003-b003-000000000003', '11111111-0001-0001-0001-000000000001', '7ef2ab5a-6577-4102-8e97-98d1fd58cfe4',
   '{"1":{"strokes":6},"2":{"strokes":6},"3":{"strokes":4},"4":{"strokes":7},"5":{"strokes":5},"6":{"strokes":5},"7":{"strokes":4},"8":{"strokes":6},"9":{"strokes":6},"10":{"strokes":5},"11":{"strokes":6},"12":{"strokes":4},"13":{"strokes":6},"14":{"strokes":5},"15":{"strokes":5},"16":{"strokes":4},"17":{"strokes":5},"18":{"strokes":6}}'::jsonb,
   95, 71, 35, 'completed', NOW()),
  ('11111111-b004-b004-b004-000000000004', '11111111-0001-0001-0001-000000000001', 'df045f29-718a-41b5-ac4a-9a8dbf26c6cb',
   '{"1":{"strokes":4},"2":{"strokes":4},"3":{"strokes":3},"4":{"strokes":5},"5":{"strokes":4},"6":{"strokes":4},"7":{"strokes":2},"8":{"strokes":4},"9":{"strokes":5},"10":{"strokes":4},"11":{"strokes":4},"12":{"strokes":3},"13":{"strokes":5},"14":{"strokes":4},"15":{"strokes":4},"16":{"strokes":3},"17":{"strokes":4},"18":{"strokes":4}}'::jsonb,
   70, 62, 40, 'completed', NOW()),
  ('11111111-b005-b005-b005-000000000005', '11111111-0001-0001-0001-000000000001', '25c171c8-c087-4d4a-b3be-545acdfe3f11',
   '{"1":{"strokes":5},"2":{"strokes":5},"3":{"strokes":3},"4":{"strokes":6},"5":{"strokes":4},"6":{"strokes":4},"7":{"strokes":3},"8":{"strokes":5},"9":{"strokes":5},"10":{"strokes":4},"11":{"strokes":5},"12":{"strokes":3},"13":{"strokes":5},"14":{"strokes":5},"15":{"strokes":4},"16":{"strokes":3},"17":{"strokes":5},"18":{"strokes":5}}'::jsonb,
   79, 64, 37, 'completed', NOW()),
  ('11111111-b006-b006-b006-000000000006', '11111111-0001-0001-0001-000000000001', '74e84922-d5fc-4cdb-9835-251c31784309',
   '{"1":{"strokes":7},"2":{"strokes":6},"3":{"strokes":4},"4":{"strokes":7},"5":{"strokes":5},"6":{"strokes":5},"7":{"strokes":4},"8":{"strokes":6},"9":{"strokes":7},"10":{"strokes":5},"11":{"strokes":6},"12":{"strokes":4},"13":{"strokes":7},"14":{"strokes":6},"15":{"strokes":5},"16":{"strokes":4},"17":{"strokes":6},"18":{"strokes":6}}'::jsonb,
   100, 78, 30, 'completed', NOW()),
  ('11111111-b007-b007-b007-000000000007', '11111111-0001-0001-0001-000000000001', '5d7c1ffc-0ad4-486b-b069-d93d626c762f',
   '{"1":{"strokes":7},"2":{"strokes":6},"3":{"strokes":5},"4":{"strokes":7},"5":{"strokes":6},"6":{"strokes":6},"7":{"strokes":4},"8":{"strokes":6},"9":{"strokes":7},"10":{"strokes":6},"11":{"strokes":6},"12":{"strokes":5},"13":{"strokes":7},"14":{"strokes":6},"15":{"strokes":6},"16":{"strokes":4},"17":{"strokes":6},"18":{"strokes":7}}'::jsonb,
   107, 79, 28, 'completed', NOW());

-- Round Results for Round 1
-- Note: raw_result_data uses snake_case keys to match RoundResultData type
INSERT INTO round_results (id, round_id, player_id, raw_score, raw_result_data, position, competition_points, is_team_result) VALUES
  ('11111111-cc01-cc01-cc01-000000000001', '11111111-0001-0001-0001-000000000001', 'df045f29-718a-41b5-ac4a-9a8dbf26c6cb', 40, '{"stableford_points": 40, "gross_score": 70}'::jsonb, 1, 10, FALSE),
  ('11111111-cc02-cc02-cc02-000000000002', '11111111-0001-0001-0001-000000000001', '41677ffc-f9c4-490b-bc39-1f7370b36c2b', 38, '{"stableford_points": 38, "gross_score": 75}'::jsonb, 2, 8, FALSE),
  ('11111111-cc03-cc03-cc03-000000000003', '11111111-0001-0001-0001-000000000001', '25c171c8-c087-4d4a-b3be-545acdfe3f11', 37, '{"stableford_points": 37, "gross_score": 79}'::jsonb, 3, 6, FALSE),
  ('11111111-cc04-cc04-cc04-000000000004', '11111111-0001-0001-0001-000000000001', '7ef2ab5a-6577-4102-8e97-98d1fd58cfe4', 35, '{"stableford_points": 35, "gross_score": 95}'::jsonb, 4, 5, FALSE),
  ('11111111-cc05-cc05-cc05-000000000005', '11111111-0001-0001-0001-000000000001', 'ca7c2924-39e8-4b66-bbb8-d9699adb3d65', 34, '{"stableford_points": 34, "gross_score": 90}'::jsonb, 5, 4, FALSE),
  ('11111111-cc06-cc06-cc06-000000000006', '11111111-0001-0001-0001-000000000001', '74e84922-d5fc-4cdb-9835-251c31784309', 30, '{"stableford_points": 30, "gross_score": 100}'::jsonb, 6, 3, FALSE),
  ('11111111-cc07-cc07-cc07-000000000007', '11111111-0001-0001-0001-000000000001', '5d7c1ffc-0ad4-486b-b069-d93d626c762f', 28, '{"stableford_points": 28, "gross_score": 107}'::jsonb, 7, 2, FALSE);

-- Scorecards for Round 2 (all 7 players)
INSERT INTO scorecards (id, round_id, player_id, scores, total_gross, total_net, total_points, status, submitted_at) VALUES
  ('11111111-b011-b011-b011-000000000011', '11111111-0002-0002-0002-000000000002', '41677ffc-f9c4-490b-bc39-1f7370b36c2b',
   '{"1":{"strokes":4},"2":{"strokes":5},"3":{"strokes":3},"4":{"strokes":5},"5":{"strokes":4},"6":{"strokes":4},"7":{"strokes":3},"8":{"strokes":4},"9":{"strokes":5},"10":{"strokes":4},"11":{"strokes":4},"12":{"strokes":3},"13":{"strokes":5},"14":{"strokes":4},"15":{"strokes":4},"16":{"strokes":3},"17":{"strokes":4},"18":{"strokes":4}}'::jsonb,
   72, 60, 41, 'completed', NOW()),
  ('11111111-b012-b012-b012-000000000012', '11111111-0002-0002-0002-000000000002', 'ca7c2924-39e8-4b66-bbb8-d9699adb3d65',
   '{"1":{"strokes":5},"2":{"strokes":5},"3":{"strokes":4},"4":{"strokes":6},"5":{"strokes":5},"6":{"strokes":4},"7":{"strokes":3},"8":{"strokes":5},"9":{"strokes":5},"10":{"strokes":4},"11":{"strokes":5},"12":{"strokes":3},"13":{"strokes":5},"14":{"strokes":5},"15":{"strokes":4},"16":{"strokes":3},"17":{"strokes":5},"18":{"strokes":5}}'::jsonb,
   81, 63, 38, 'completed', NOW()),
  ('11111111-b013-b013-b013-000000000013', '11111111-0002-0002-0002-000000000002', '7ef2ab5a-6577-4102-8e97-98d1fd58cfe4',
   '{"1":{"strokes":6},"2":{"strokes":5},"3":{"strokes":4},"4":{"strokes":6},"5":{"strokes":5},"6":{"strokes":5},"7":{"strokes":4},"8":{"strokes":5},"9":{"strokes":6},"10":{"strokes":5},"11":{"strokes":5},"12":{"strokes":4},"13":{"strokes":6},"14":{"strokes":5},"15":{"strokes":5},"16":{"strokes":3},"17":{"strokes":5},"18":{"strokes":6}}'::jsonb,
   90, 66, 36, 'completed', NOW()),
  ('11111111-b014-b014-b014-000000000014', '11111111-0002-0002-0002-000000000002', 'df045f29-718a-41b5-ac4a-9a8dbf26c6cb',
   '{"1":{"strokes":4},"2":{"strokes":4},"3":{"strokes":3},"4":{"strokes":5},"5":{"strokes":4},"6":{"strokes":5},"7":{"strokes":3},"8":{"strokes":4},"9":{"strokes":5},"10":{"strokes":4},"11":{"strokes":4},"12":{"strokes":3},"13":{"strokes":5},"14":{"strokes":4},"15":{"strokes":5},"16":{"strokes":3},"17":{"strokes":4},"18":{"strokes":5}}'::jsonb,
   74, 66, 36, 'completed', NOW()),
  ('11111111-b015-b015-b015-000000000015', '11111111-0002-0002-0002-000000000002', '25c171c8-c087-4d4a-b3be-545acdfe3f11',
   '{"1":{"strokes":5},"2":{"strokes":4},"3":{"strokes":3},"4":{"strokes":5},"5":{"strokes":4},"6":{"strokes":4},"7":{"strokes":3},"8":{"strokes":5},"9":{"strokes":5},"10":{"strokes":4},"11":{"strokes":4},"12":{"strokes":3},"13":{"strokes":5},"14":{"strokes":4},"15":{"strokes":4},"16":{"strokes":3},"17":{"strokes":4},"18":{"strokes":5}}'::jsonb,
   74, 59, 39, 'completed', NOW()),
  ('11111111-b016-b016-b016-000000000016', '11111111-0002-0002-0002-000000000002', '74e84922-d5fc-4cdb-9835-251c31784309',
   '{"1":{"strokes":6},"2":{"strokes":5},"3":{"strokes":4},"4":{"strokes":6},"5":{"strokes":5},"6":{"strokes":5},"7":{"strokes":4},"8":{"strokes":6},"9":{"strokes":6},"10":{"strokes":5},"11":{"strokes":5},"12":{"strokes":4},"13":{"strokes":6},"14":{"strokes":5},"15":{"strokes":5},"16":{"strokes":4},"17":{"strokes":5},"18":{"strokes":6}}'::jsonb,
   92, 70, 34, 'completed', NOW()),
  ('11111111-b017-b017-b017-000000000017', '11111111-0002-0002-0002-000000000002', '5d7c1ffc-0ad4-486b-b069-d93d626c762f',
   '{"1":{"strokes":6},"2":{"strokes":6},"3":{"strokes":4},"4":{"strokes":7},"5":{"strokes":5},"6":{"strokes":5},"7":{"strokes":4},"8":{"strokes":6},"9":{"strokes":6},"10":{"strokes":5},"11":{"strokes":6},"12":{"strokes":4},"13":{"strokes":6},"14":{"strokes":6},"15":{"strokes":5},"16":{"strokes":4},"17":{"strokes":6},"18":{"strokes":6}}'::jsonb,
   97, 69, 32, 'completed', NOW());

-- Round Results for Round 2
INSERT INTO round_results (id, round_id, player_id, raw_score, raw_result_data, position, competition_points, is_team_result) VALUES
  ('11111111-cc11-cc11-cc11-000000000011', '11111111-0002-0002-0002-000000000002', '41677ffc-f9c4-490b-bc39-1f7370b36c2b', 41, '{"stableford_points": 41, "gross_score": 72}'::jsonb, 1, 10, FALSE),
  ('11111111-cc12-cc12-cc12-000000000012', '11111111-0002-0002-0002-000000000002', '25c171c8-c087-4d4a-b3be-545acdfe3f11', 39, '{"stableford_points": 39, "gross_score": 74}'::jsonb, 2, 8, FALSE),
  ('11111111-cc13-cc13-cc13-000000000013', '11111111-0002-0002-0002-000000000002', 'ca7c2924-39e8-4b66-bbb8-d9699adb3d65', 38, '{"stableford_points": 38, "gross_score": 81}'::jsonb, 3, 6, FALSE),
  ('11111111-cc14-cc14-cc14-000000000014', '11111111-0002-0002-0002-000000000002', '7ef2ab5a-6577-4102-8e97-98d1fd58cfe4', 36, '{"stableford_points": 36, "gross_score": 90}'::jsonb, 4, 5, FALSE),
  ('11111111-cc15-cc15-cc15-000000000015', '11111111-0002-0002-0002-000000000002', 'df045f29-718a-41b5-ac4a-9a8dbf26c6cb', 36, '{"stableford_points": 36, "gross_score": 74}'::jsonb, 5, 4, FALSE),
  ('11111111-cc16-cc16-cc16-000000000016', '11111111-0002-0002-0002-000000000002', '74e84922-d5fc-4cdb-9835-251c31784309', 34, '{"stableford_points": 34, "gross_score": 92}'::jsonb, 6, 3, FALSE),
  ('11111111-cc17-cc17-cc17-000000000017', '11111111-0002-0002-0002-000000000002', '5d7c1ffc-0ad4-486b-b069-d93d626c762f', 32, '{"stableford_points": 32, "gross_score": 97}'::jsonb, 7, 2, FALSE);

-- Scorecards for Round 3 (all 7 players)
INSERT INTO scorecards (id, round_id, player_id, scores, total_gross, total_net, total_points, status, submitted_at) VALUES
  ('11111111-b021-b021-b021-000000000021', '11111111-0003-0003-0003-000000000003', '41677ffc-f9c4-490b-bc39-1f7370b36c2b',
   '{"1":{"strokes":5},"2":{"strokes":4},"3":{"strokes":3},"4":{"strokes":6},"5":{"strokes":4},"6":{"strokes":4},"7":{"strokes":3},"8":{"strokes":5},"9":{"strokes":5},"10":{"strokes":4},"11":{"strokes":5},"12":{"strokes":3},"13":{"strokes":5},"14":{"strokes":4},"15":{"strokes":4},"16":{"strokes":3},"17":{"strokes":5},"18":{"strokes":5}}'::jsonb,
   77, 65, 36, 'completed', NOW()),
  ('11111111-b022-b022-b022-000000000022', '11111111-0003-0003-0003-000000000003', 'ca7c2924-39e8-4b66-bbb8-d9699adb3d65',
   '{"1":{"strokes":5},"2":{"strokes":5},"3":{"strokes":3},"4":{"strokes":6},"5":{"strokes":5},"6":{"strokes":5},"7":{"strokes":3},"8":{"strokes":5},"9":{"strokes":5},"10":{"strokes":5},"11":{"strokes":5},"12":{"strokes":3},"13":{"strokes":6},"14":{"strokes":5},"15":{"strokes":4},"16":{"strokes":3},"17":{"strokes":5},"18":{"strokes":5}}'::jsonb,
   83, 65, 37, 'completed', NOW()),
  ('11111111-b023-b023-b023-000000000023', '11111111-0003-0003-0003-000000000003', '7ef2ab5a-6577-4102-8e97-98d1fd58cfe4',
   '{"1":{"strokes":6},"2":{"strokes":6},"3":{"strokes":4},"4":{"strokes":6},"5":{"strokes":5},"6":{"strokes":6},"7":{"strokes":4},"8":{"strokes":6},"9":{"strokes":6},"10":{"strokes":5},"11":{"strokes":6},"12":{"strokes":4},"13":{"strokes":6},"14":{"strokes":5},"15":{"strokes":5},"16":{"strokes":4},"17":{"strokes":6},"18":{"strokes":6}}'::jsonb,
   96, 72, 32, 'completed', NOW()),
  ('11111111-b024-b024-b024-000000000024', '11111111-0003-0003-0003-000000000003', 'df045f29-718a-41b5-ac4a-9a8dbf26c6cb',
   '{"1":{"strokes":4},"2":{"strokes":4},"3":{"strokes":2},"4":{"strokes":5},"5":{"strokes":4},"6":{"strokes":4},"7":{"strokes":3},"8":{"strokes":4},"9":{"strokes":4},"10":{"strokes":4},"11":{"strokes":4},"12":{"strokes":3},"13":{"strokes":4},"14":{"strokes":4},"15":{"strokes":4},"16":{"strokes":3},"17":{"strokes":4},"18":{"strokes":4}}'::jsonb,
   68, 60, 42, 'completed', NOW()),
  ('11111111-b025-b025-b025-000000000025', '11111111-0003-0003-0003-000000000003', '25c171c8-c087-4d4a-b3be-545acdfe3f11',
   '{"1":{"strokes":5},"2":{"strokes":5},"3":{"strokes":3},"4":{"strokes":5},"5":{"strokes":5},"6":{"strokes":4},"7":{"strokes":3},"8":{"strokes":5},"9":{"strokes":5},"10":{"strokes":5},"11":{"strokes":5},"12":{"strokes":3},"13":{"strokes":5},"14":{"strokes":5},"15":{"strokes":4},"16":{"strokes":3},"17":{"strokes":5},"18":{"strokes":5}}'::jsonb,
   80, 65, 36, 'completed', NOW()),
  ('11111111-b026-b026-b026-000000000026', '11111111-0003-0003-0003-000000000003', '74e84922-d5fc-4cdb-9835-251c31784309',
   '{"1":{"strokes":6},"2":{"strokes":5},"3":{"strokes":4},"4":{"strokes":7},"5":{"strokes":5},"6":{"strokes":5},"7":{"strokes":4},"8":{"strokes":6},"9":{"strokes":6},"10":{"strokes":5},"11":{"strokes":6},"12":{"strokes":4},"13":{"strokes":6},"14":{"strokes":5},"15":{"strokes":5},"16":{"strokes":4},"17":{"strokes":6},"18":{"strokes":6}}'::jsonb,
   95, 73, 31, 'completed', NOW()),
  ('11111111-b027-b027-b027-000000000027', '11111111-0003-0003-0003-000000000003', '5d7c1ffc-0ad4-486b-b069-d93d626c762f',
   '{"1":{"strokes":7},"2":{"strokes":6},"3":{"strokes":4},"4":{"strokes":7},"5":{"strokes":6},"6":{"strokes":5},"7":{"strokes":4},"8":{"strokes":6},"9":{"strokes":7},"10":{"strokes":6},"11":{"strokes":6},"12":{"strokes":4},"13":{"strokes":7},"14":{"strokes":5},"15":{"strokes":5},"16":{"strokes":4},"17":{"strokes":6},"18":{"strokes":6}}'::jsonb,
   101, 73, 30, 'completed', NOW());

-- Round Results for Round 3
INSERT INTO round_results (id, round_id, player_id, raw_score, raw_result_data, position, competition_points, is_team_result) VALUES
  ('11111111-cc21-cc21-cc21-000000000021', '11111111-0003-0003-0003-000000000003', 'df045f29-718a-41b5-ac4a-9a8dbf26c6cb', 42, '{"stableford_points": 42, "gross_score": 68}'::jsonb, 1, 10, FALSE),
  ('11111111-cc22-cc22-cc22-000000000022', '11111111-0003-0003-0003-000000000003', 'ca7c2924-39e8-4b66-bbb8-d9699adb3d65', 37, '{"stableford_points": 37, "gross_score": 83}'::jsonb, 2, 8, FALSE),
  ('11111111-cc23-cc23-cc23-000000000023', '11111111-0003-0003-0003-000000000003', '41677ffc-f9c4-490b-bc39-1f7370b36c2b', 36, '{"stableford_points": 36, "gross_score": 77}'::jsonb, 3, 6, FALSE),
  ('11111111-cc24-cc24-cc24-000000000024', '11111111-0003-0003-0003-000000000003', '25c171c8-c087-4d4a-b3be-545acdfe3f11', 36, '{"stableford_points": 36, "gross_score": 80}'::jsonb, 4, 5, FALSE),
  ('11111111-cc25-cc25-cc25-000000000025', '11111111-0003-0003-0003-000000000003', '7ef2ab5a-6577-4102-8e97-98d1fd58cfe4', 32, '{"stableford_points": 32, "gross_score": 96}'::jsonb, 5, 4, FALSE),
  ('11111111-cc26-cc26-cc26-000000000026', '11111111-0003-0003-0003-000000000003', '74e84922-d5fc-4cdb-9835-251c31784309', 31, '{"stableford_points": 31, "gross_score": 95}'::jsonb, 6, 3, FALSE),
  ('11111111-cc27-cc27-cc27-000000000027', '11111111-0003-0003-0003-000000000003', '5d7c1ffc-0ad4-486b-b069-d93d626c762f', 30, '{"stableford_points": 30, "gross_score": 101}'::jsonb, 7, 2, FALSE);


-- =====================================================
-- COMPETITION 2: Match Play Championship
-- =====================================================
-- Individual match play competition with 6 players
-- Knockout format: Quarter-finals, Semi-finals, Final

INSERT INTO competitions (
  id, name, description, competition_type, start_date, end_date,
  handicap_system, organizer_id, status, invite_code,
  team_mode, team_size, point_system
) VALUES (
  '22222222-2222-2222-2222-222222222222',
  'Match Play Championship',
  'Head-to-head knockout match play competition. May the best player win!',
  'event',
  '2025-02-01',
  '2025-02-28',
  'honor',
  'df045f29-718a-41b5-ac4a-9a8dbf26c6cb',
  'in-progress',
  'MATCH-01',
  'none',
  NULL,
  '{"type": "position", "rules": {"1": 10, "2": 8, "3": 6, "default": 1}, "matchPlay": {"win": 3, "draw": 1, "loss": 0}}'
);

-- Add 6 players (excluding Player 7)
INSERT INTO competition_players (competition_id, player_id, status) VALUES
  ('22222222-2222-2222-2222-222222222222', '41677ffc-f9c4-490b-bc39-1f7370b36c2b', 'accepted'),
  ('22222222-2222-2222-2222-222222222222', 'ca7c2924-39e8-4b66-bbb8-d9699adb3d65', 'accepted'),
  ('22222222-2222-2222-2222-222222222222', '7ef2ab5a-6577-4102-8e97-98d1fd58cfe4', 'accepted'),
  ('22222222-2222-2222-2222-222222222222', 'df045f29-718a-41b5-ac4a-9a8dbf26c6cb', 'accepted'),
  ('22222222-2222-2222-2222-222222222222', '25c171c8-c087-4d4a-b3be-545acdfe3f11', 'accepted'),
  ('22222222-2222-2222-2222-222222222222', '74e84922-d5fc-4cdb-9835-251c31784309', 'accepted');

-- QF Match 1: Player 4 (Riley) vs Player 1 (Sam) - Match play with reciprocal scoring
INSERT INTO rounds (id, competition_id, round_number, course_id, date, game_type, status, is_team_round, team_format, scoring_pairs_required) VALUES
  ('22222222-0001-0001-0001-000000000001', '22222222-2222-2222-2222-222222222222', 1, 'c0000004-0000-0000-0000-000000000004', '2025-02-05', 'match-play', 'completed', FALSE, NULL, TRUE);

-- QF Match 2: Player 2 (Jordan) vs Player 5 (Casey) - Match play with reciprocal scoring
INSERT INTO rounds (id, competition_id, round_number, course_id, date, game_type, status, is_team_round, team_format, scoring_pairs_required) VALUES
  ('22222222-0002-0002-0002-000000000002', '22222222-2222-2222-2222-222222222222', 2, 'c0000004-0000-0000-0000-000000000004', '2025-02-05', 'match-play', 'completed', FALSE, NULL, TRUE);

-- QF Match 3: Player 3 (Alex) vs Player 6 (Morgan) - Match play with reciprocal scoring
INSERT INTO rounds (id, competition_id, round_number, course_id, date, game_type, status, is_team_round, team_format, scoring_pairs_required) VALUES
  ('22222222-0003-0003-0003-000000000003', '22222222-2222-2222-2222-222222222222', 3, 'c0000004-0000-0000-0000-000000000004', '2025-02-06', 'match-play', 'completed', FALSE, NULL, TRUE);

-- SF Match: Player 4 vs Player 5 - Match play with reciprocal scoring
INSERT INTO rounds (id, competition_id, round_number, course_id, date, game_type, status, is_team_round, team_format, scoring_pairs_required) VALUES
  ('22222222-0004-0004-0004-000000000004', '22222222-2222-2222-2222-222222222222', 4, 'c0000004-0000-0000-0000-000000000004', '2025-02-12', 'match-play', 'completed', FALSE, NULL, TRUE);

-- Final: Player 4 vs Player 3 (upcoming) - Scoring pairs to be set up
INSERT INTO rounds (id, competition_id, round_number, course_id, date, game_type, status, is_team_round, team_format, scoring_pairs_required) VALUES
  ('22222222-0005-0005-0005-000000000005', '22222222-2222-2222-2222-222222222222', 5, 'c0000004-0000-0000-0000-000000000004', '2025-02-19', 'match-play', 'upcoming', FALSE, NULL, TRUE);

-- Match Play Results
-- Note: raw_result_data uses snake_case keys to match RoundResultData type
-- QF1: Player 4 (Riley) beats Player 1 (Sam) 3&2
INSERT INTO round_results (id, round_id, player_id, raw_score, raw_result_data, position, competition_points, is_team_result) VALUES
  ('22222222-cc01-cc01-cc01-000000000001', '22222222-0001-0001-0001-000000000001', 'df045f29-718a-41b5-ac4a-9a8dbf26c6cb', 3,
   '{"opponent_id": "41677ffc-f9c4-490b-bc39-1f7370b36c2b", "match_result": "win", "holes_won": 6, "holes_lost": 3, "holes_halved": 7, "final_margin": "3&2"}'::jsonb,
   1, 3, FALSE),
  ('22222222-cc02-cc02-cc02-000000000002', '22222222-0001-0001-0001-000000000001', '41677ffc-f9c4-490b-bc39-1f7370b36c2b', 0,
   '{"opponent_id": "df045f29-718a-41b5-ac4a-9a8dbf26c6cb", "match_result": "loss", "holes_won": 3, "holes_lost": 6, "holes_halved": 7, "final_margin": "3&2"}'::jsonb,
   2, 0, FALSE);

-- QF2: Player 5 (Casey) beats Player 2 (Jordan) 2 up
INSERT INTO round_results (id, round_id, player_id, raw_score, raw_result_data, position, competition_points, is_team_result) VALUES
  ('22222222-cc03-cc03-cc03-000000000003', '22222222-0002-0002-0002-000000000002', '25c171c8-c087-4d4a-b3be-545acdfe3f11', 3,
   '{"opponent_id": "ca7c2924-39e8-4b66-bbb8-d9699adb3d65", "match_result": "win", "holes_won": 7, "holes_lost": 5, "holes_halved": 6, "final_margin": "2 up"}'::jsonb,
   1, 3, FALSE),
  ('22222222-cc04-cc04-cc04-000000000004', '22222222-0002-0002-0002-000000000002', 'ca7c2924-39e8-4b66-bbb8-d9699adb3d65', 0,
   '{"opponent_id": "25c171c8-c087-4d4a-b3be-545acdfe3f11", "match_result": "loss", "holes_won": 5, "holes_lost": 7, "holes_halved": 6, "final_margin": "2 down"}'::jsonb,
   2, 0, FALSE);

-- QF3: Player 3 (Alex) beats Player 6 (Morgan) 1 up
INSERT INTO round_results (id, round_id, player_id, raw_score, raw_result_data, position, competition_points, is_team_result) VALUES
  ('22222222-cc05-cc05-cc05-000000000005', '22222222-0003-0003-0003-000000000003', '7ef2ab5a-6577-4102-8e97-98d1fd58cfe4', 3,
   '{"opponent_id": "74e84922-d5fc-4cdb-9835-251c31784309", "match_result": "win", "holes_won": 8, "holes_lost": 7, "holes_halved": 3, "final_margin": "1 up"}'::jsonb,
   1, 3, FALSE),
  ('22222222-cc06-cc06-cc06-000000000006', '22222222-0003-0003-0003-000000000003', '74e84922-d5fc-4cdb-9835-251c31784309', 0,
   '{"opponent_id": "7ef2ab5a-6577-4102-8e97-98d1fd58cfe4", "match_result": "loss", "holes_won": 7, "holes_lost": 8, "holes_halved": 3, "final_margin": "1 down"}'::jsonb,
   2, 0, FALSE);

-- SF: Player 4 (Riley) beats Player 5 (Casey) 4&3
INSERT INTO round_results (id, round_id, player_id, raw_score, raw_result_data, position, competition_points, is_team_result) VALUES
  ('22222222-cc07-cc07-cc07-000000000007', '22222222-0004-0004-0004-000000000004', 'df045f29-718a-41b5-ac4a-9a8dbf26c6cb', 3,
   '{"opponent_id": "25c171c8-c087-4d4a-b3be-545acdfe3f11", "match_result": "win", "holes_won": 8, "holes_lost": 4, "holes_halved": 3, "final_margin": "4&3"}'::jsonb,
   1, 3, FALSE),
  ('22222222-cc08-cc08-cc08-000000000008', '22222222-0004-0004-0004-000000000004', '25c171c8-c087-4d4a-b3be-545acdfe3f11', 0,
   '{"opponent_id": "df045f29-718a-41b5-ac4a-9a8dbf26c6cb", "match_result": "loss", "holes_won": 4, "holes_lost": 8, "holes_halved": 3, "final_margin": "4&3"}'::jsonb,
   2, 0, FALSE);


-- =====================================================
-- COMPETITION 3: Team Best Ball Series
-- =====================================================
-- Fixed teams of 2, best-ball format

INSERT INTO competitions (
  id, name, description, competition_type, start_date,
  handicap_system, organizer_id, status, invite_code,
  team_mode, team_size, point_system
) VALUES (
  '33333333-3333-3333-3333-333333333333',
  'Team Best Ball Series',
  'Pairs competition - best ball format. Choose your partner wisely!',
  'league',
  '2025-03-01',
  'honor',
  '25c171c8-c087-4d4a-b3be-545acdfe3f11',
  'in-progress',
  'TEAM-BB1',
  'fixed',
  2,
  '{"type": "position", "rules": {"1": 10, "2": 8, "3": 6, "default": 2}, "matchPlay": {"win": 3, "draw": 1, "loss": 0}}'
);

-- Add 6 players
INSERT INTO competition_players (competition_id, player_id, status) VALUES
  ('33333333-3333-3333-3333-333333333333', '41677ffc-f9c4-490b-bc39-1f7370b36c2b', 'accepted'),
  ('33333333-3333-3333-3333-333333333333', 'ca7c2924-39e8-4b66-bbb8-d9699adb3d65', 'accepted'),
  ('33333333-3333-3333-3333-333333333333', '7ef2ab5a-6577-4102-8e97-98d1fd58cfe4', 'accepted'),
  ('33333333-3333-3333-3333-333333333333', 'df045f29-718a-41b5-ac4a-9a8dbf26c6cb', 'accepted'),
  ('33333333-3333-3333-3333-333333333333', '25c171c8-c087-4d4a-b3be-545acdfe3f11', 'accepted'),
  ('33333333-3333-3333-3333-333333333333', '74e84922-d5fc-4cdb-9835-251c31784309', 'accepted');

-- Create 3 Teams of 2
INSERT INTO teams (id, competition_id, name) VALUES
  ('33333333-aa01-aa01-aa01-000000000001', '33333333-3333-3333-3333-333333333333', 'Team Eagle'),
  ('33333333-aa02-aa02-aa02-000000000002', '33333333-3333-3333-3333-333333333333', 'Team Birdie'),
  ('33333333-aa03-aa03-aa03-000000000003', '33333333-3333-3333-3333-333333333333', 'Team Par');

-- Team Eagle: Player 1 (Sam) + Player 4 (Riley) - Low handicaps
INSERT INTO team_members (team_id, player_id) VALUES
  ('33333333-aa01-aa01-aa01-000000000001', '41677ffc-f9c4-490b-bc39-1f7370b36c2b'),
  ('33333333-aa01-aa01-aa01-000000000001', 'df045f29-718a-41b5-ac4a-9a8dbf26c6cb');

-- Team Birdie: Player 2 (Jordan) + Player 5 (Casey) - Medium handicaps
INSERT INTO team_members (team_id, player_id) VALUES
  ('33333333-aa02-aa02-aa02-000000000002', 'ca7c2924-39e8-4b66-bbb8-d9699adb3d65'),
  ('33333333-aa02-aa02-aa02-000000000002', '25c171c8-c087-4d4a-b3be-545acdfe3f11');

-- Team Par: Player 3 (Alex) + Player 6 (Morgan) - Higher handicaps
INSERT INTO team_members (team_id, player_id) VALUES
  ('33333333-aa03-aa03-aa03-000000000003', '7ef2ab5a-6577-4102-8e97-98d1fd58cfe4'),
  ('33333333-aa03-aa03-aa03-000000000003', '74e84922-d5fc-4cdb-9835-251c31784309');

-- Round 1: Royal Adelaide - Completed (cross-team scoring - teams score opposing teams)
INSERT INTO rounds (id, competition_id, round_number, course_id, date, game_type, status, is_team_round, team_format, scoring_pairs_required) VALUES
  ('33333333-0001-0001-0001-000000000001', '33333333-3333-3333-3333-333333333333', 1, 'c0000005-0000-0000-0000-000000000005', '2025-03-05', 'stableford', 'completed', TRUE, 'best-ball', TRUE);

-- Round 2: Kingston Heath - Completed (cross-team scoring)
INSERT INTO rounds (id, competition_id, round_number, course_id, date, game_type, status, is_team_round, team_format, scoring_pairs_required) VALUES
  ('33333333-0002-0002-0002-000000000002', '33333333-3333-3333-3333-333333333333', 2, 'c0000001-0000-0000-0000-000000000001', '2025-03-12', 'stableford', 'completed', TRUE, 'best-ball', TRUE);

-- Round 3: Eastern (North/East) - In Progress (scoring pairs set up)
INSERT INTO rounds (id, competition_id, round_number, course_id, date, game_type, status, is_team_round, team_format, scoring_pairs_required) VALUES
  ('33333333-0003-0003-0003-000000000003', '33333333-3333-3333-3333-333333333333', 3, 'c2222222-2222-2222-2222-222222222222', '2025-03-19', 'stableford', 'in-progress', TRUE, 'best-ball', TRUE);

-- Round 4: The Dunes - Upcoming (scoring pairs not yet assigned)
INSERT INTO rounds (id, competition_id, round_number, course_id, date, game_type, status, is_team_round, team_format, scoring_pairs_required) VALUES
  ('33333333-0004-0004-0004-000000000004', '33333333-3333-3333-3333-333333333333', 4, 'c0000006-0000-0000-0000-000000000006', '2025-03-26', 'stableford', 'upcoming', TRUE, 'best-ball', TRUE);

-- Team Round Results for Round 1
-- Note: raw_result_data uses snake_case keys (team_score, stableford_points) to match RoundResultData type
INSERT INTO round_results (id, round_id, team_id, raw_score, raw_result_data, position, competition_points, is_team_result) VALUES
  ('33333333-cc01-cc01-cc01-000000000001', '33333333-0001-0001-0001-000000000001', '33333333-aa01-aa01-aa01-000000000001', 44,
   '{"team_score": 44, "stableford_points": 44, "format": "best-ball"}'::jsonb,
   1, 10, TRUE),
  ('33333333-cc02-cc02-cc02-000000000002', '33333333-0001-0001-0001-000000000001', '33333333-aa02-aa02-aa02-000000000002', 40,
   '{"team_score": 40, "stableford_points": 40, "format": "best-ball"}'::jsonb,
   2, 8, TRUE),
  ('33333333-cc03-cc03-cc03-000000000003', '33333333-0001-0001-0001-000000000001', '33333333-aa03-aa03-aa03-000000000003', 36,
   '{"team_score": 36, "stableford_points": 36, "format": "best-ball"}'::jsonb,
   3, 6, TRUE);

-- Team Round Results for Round 2
INSERT INTO round_results (id, round_id, team_id, raw_score, raw_result_data, position, competition_points, is_team_result) VALUES
  ('33333333-cc04-cc04-cc04-000000000004', '33333333-0002-0002-0002-000000000002', '33333333-aa02-aa02-aa02-000000000002', 43,
   '{"team_score": 43, "stableford_points": 43, "format": "best-ball"}'::jsonb,
   1, 10, TRUE),
  ('33333333-cc05-cc05-cc05-000000000005', '33333333-0002-0002-0002-000000000002', '33333333-aa01-aa01-aa01-000000000001', 42,
   '{"team_score": 42, "stableford_points": 42, "format": "best-ball"}'::jsonb,
   2, 8, TRUE),
  ('33333333-cc06-cc06-cc06-000000000006', '33333333-0002-0002-0002-000000000002', '33333333-aa03-aa03-aa03-000000000003', 38,
   '{"team_score": 38, "stableford_points": 38, "format": "best-ball"}'::jsonb,
   3, 6, TRUE);

-- Individual Round Results for Round 1 (for Individual Standings)
-- These track each player's individual contribution in the team best-ball format
INSERT INTO round_results (id, round_id, player_id, raw_score, raw_result_data, position, competition_points, is_team_result) VALUES
  -- Riley: 40 points - 1st place
  ('33333333-dd01-dd01-dd01-000000000001', '33333333-0001-0001-0001-000000000001', 'df045f29-718a-41b5-ac4a-9a8dbf26c6cb', 40,
   '{"stableford_points": 40, "gross_score": 68, "net_score": 60}'::jsonb,
   1, 10, FALSE),
  -- Sam: 38 points - 2nd place
  ('33333333-dd02-dd02-dd02-000000000002', '33333333-0001-0001-0001-000000000001', '41677ffc-f9c4-490b-bc39-1f7370b36c2b', 38,
   '{"stableford_points": 38, "gross_score": 73, "net_score": 61}'::jsonb,
   2, 8, FALSE),
  -- Casey: 37 points - 3rd place
  ('33333333-dd03-dd03-dd03-000000000003', '33333333-0001-0001-0001-000000000001', '25c171c8-c087-4d4a-b3be-545acdfe3f11', 37,
   '{"stableford_points": 37, "gross_score": 76, "net_score": 61}'::jsonb,
   3, 6, FALSE),
  -- Jordan: 35 points - 4th place
  ('33333333-dd04-dd04-dd04-000000000004', '33333333-0001-0001-0001-000000000001', 'ca7c2924-39e8-4b66-bbb8-d9699adb3d65', 35,
   '{"stableford_points": 35, "gross_score": 82, "net_score": 64}'::jsonb,
   4, 5, FALSE),
  -- Alex: 33 points - 5th place
  ('33333333-dd05-dd05-dd05-000000000005', '33333333-0001-0001-0001-000000000001', '7ef2ab5a-6577-4102-8e97-98d1fd58cfe4', 33,
   '{"stableford_points": 33, "gross_score": 90, "net_score": 66}'::jsonb,
   5, 4, FALSE),
  -- Morgan: 31 points - 6th place
  ('33333333-dd06-dd06-dd06-000000000006', '33333333-0001-0001-0001-000000000001', '74e84922-d5fc-4cdb-9835-251c31784309', 31,
   '{"stableford_points": 31, "gross_score": 94, "net_score": 72}'::jsonb,
   6, 3, FALSE);

-- Individual Round Results for Round 2 (for Individual Standings)
INSERT INTO round_results (id, round_id, player_id, raw_score, raw_result_data, position, competition_points, is_team_result) VALUES
  -- Jordan: 39 points - 1st place (tied)
  ('33333333-dd07-dd07-dd07-000000000007', '33333333-0002-0002-0002-000000000002', 'ca7c2924-39e8-4b66-bbb8-d9699adb3d65', 39,
   '{"stableford_points": 39, "gross_score": 77, "net_score": 59}'::jsonb,
   1, 10, FALSE),
  -- Riley: 39 points - 1st place (tied)
  ('33333333-dd08-dd08-dd08-000000000008', '33333333-0002-0002-0002-000000000002', 'df045f29-718a-41b5-ac4a-9a8dbf26c6cb', 39,
   '{"stableford_points": 39, "gross_score": 72, "net_score": 64}'::jsonb,
   1, 10, FALSE),
  -- Casey: 38 points - 3rd place
  ('33333333-dd09-dd09-dd09-000000000009', '33333333-0002-0002-0002-000000000002', '25c171c8-c087-4d4a-b3be-545acdfe3f11', 38,
   '{"stableford_points": 38, "gross_score": 74, "net_score": 59}'::jsonb,
   3, 6, FALSE),
  -- Sam: 36 points - 4th place
  ('33333333-dd10-dd10-dd10-000000000010', '33333333-0002-0002-0002-000000000002', '41677ffc-f9c4-490b-bc39-1f7370b36c2b', 36,
   '{"stableford_points": 36, "gross_score": 78, "net_score": 66}'::jsonb,
   4, 5, FALSE),
  -- Alex: 35 points - 5th place
  ('33333333-dd11-dd11-dd11-000000000011', '33333333-0002-0002-0002-000000000002', '7ef2ab5a-6577-4102-8e97-98d1fd58cfe4', 35,
   '{"stableford_points": 35, "gross_score": 87, "net_score": 63}'::jsonb,
   5, 4, FALSE),
  -- Morgan: 33 points - 6th place
  ('33333333-dd12-dd12-dd12-000000000012', '33333333-0002-0002-0002-000000000002', '74e84922-d5fc-4cdb-9835-251c31784309', 33,
   '{"stableford_points": 33, "gross_score": 91, "net_score": 69}'::jsonb,
   6, 3, FALSE);


-- =====================================================
-- SCORING PAIRS DATA
-- =====================================================
-- This section creates scoring pairs for rounds that have
-- scoring_pairs_required = TRUE. Demonstrates:
-- - Circular chains (4-some: A→B→C→D→A)
-- - Circular chains (3-some: A→B→C→A)
-- - Reciprocal pairs for match play (A↔B)
-- - Cross-team scoring for team competitions
-- =====================================================

-- -----------------------------------------------------
-- Competition 1: Summer Stableford League Scoring Pairs
-- -----------------------------------------------------

-- Round 1: Kingston Heath (7 players in 4-some + 3-some)
-- Pairing 1 (4-some): Sam→Jordan→Riley→Casey→Sam (circular)
-- Pairing 2 (3-some): Alex→Morgan→Taylor→Alex (circular)
INSERT INTO scoring_pairs (id, round_id, scorer_id, player_id) VALUES
  -- Pairing 1: 4-some circular chain
  ('11111111-d001-d001-d001-000000000001', '11111111-0001-0001-0001-000000000001', '41677ffc-f9c4-490b-bc39-1f7370b36c2b', 'ca7c2924-39e8-4b66-bbb8-d9699adb3d65'),  -- Sam scores Jordan
  ('11111111-d002-d002-d002-000000000002', '11111111-0001-0001-0001-000000000001', 'ca7c2924-39e8-4b66-bbb8-d9699adb3d65', 'df045f29-718a-41b5-ac4a-9a8dbf26c6cb'),  -- Jordan scores Riley
  ('11111111-d003-d003-d003-000000000003', '11111111-0001-0001-0001-000000000001', 'df045f29-718a-41b5-ac4a-9a8dbf26c6cb', '25c171c8-c087-4d4a-b3be-545acdfe3f11'),  -- Riley scores Casey
  ('11111111-d004-d004-d004-000000000004', '11111111-0001-0001-0001-000000000001', '25c171c8-c087-4d4a-b3be-545acdfe3f11', '41677ffc-f9c4-490b-bc39-1f7370b36c2b'),  -- Casey scores Sam
  -- Pairing 2: 3-some circular chain
  ('11111111-d005-d005-d005-000000000005', '11111111-0001-0001-0001-000000000001', '7ef2ab5a-6577-4102-8e97-98d1fd58cfe4', '74e84922-d5fc-4cdb-9835-251c31784309'),  -- Alex scores Morgan
  ('11111111-d006-d006-d006-000000000006', '11111111-0001-0001-0001-000000000001', '74e84922-d5fc-4cdb-9835-251c31784309', '5d7c1ffc-0ad4-486b-b069-d93d626c762f'),  -- Morgan scores Taylor
  ('11111111-d007-d007-d007-000000000007', '11111111-0001-0001-0001-000000000001', '5d7c1ffc-0ad4-486b-b069-d93d626c762f', '7ef2ab5a-6577-4102-8e97-98d1fd58cfe4');  -- Taylor scores Alex

-- Round 2: Royal Melbourne (different pairings)
-- Pairing 1 (4-some): Riley→Sam→Alex→Taylor→Riley (circular)
-- Pairing 2 (3-some): Jordan→Casey→Morgan→Jordan (circular)
INSERT INTO scoring_pairs (id, round_id, scorer_id, player_id) VALUES
  -- Pairing 1: 4-some circular chain
  ('11111111-d011-d011-d011-000000000011', '11111111-0002-0002-0002-000000000002', 'df045f29-718a-41b5-ac4a-9a8dbf26c6cb', '41677ffc-f9c4-490b-bc39-1f7370b36c2b'),  -- Riley scores Sam
  ('11111111-d012-d012-d012-000000000012', '11111111-0002-0002-0002-000000000002', '41677ffc-f9c4-490b-bc39-1f7370b36c2b', '7ef2ab5a-6577-4102-8e97-98d1fd58cfe4'),  -- Sam scores Alex
  ('11111111-d013-d013-d013-000000000013', '11111111-0002-0002-0002-000000000002', '7ef2ab5a-6577-4102-8e97-98d1fd58cfe4', '5d7c1ffc-0ad4-486b-b069-d93d626c762f'),  -- Alex scores Taylor
  ('11111111-d014-d014-d014-000000000014', '11111111-0002-0002-0002-000000000002', '5d7c1ffc-0ad4-486b-b069-d93d626c762f', 'df045f29-718a-41b5-ac4a-9a8dbf26c6cb'),  -- Taylor scores Riley
  -- Pairing 2: 3-some circular chain
  ('11111111-d015-d015-d015-000000000015', '11111111-0002-0002-0002-000000000002', 'ca7c2924-39e8-4b66-bbb8-d9699adb3d65', '25c171c8-c087-4d4a-b3be-545acdfe3f11'),  -- Jordan scores Casey
  ('11111111-d016-d016-d016-000000000016', '11111111-0002-0002-0002-000000000002', '25c171c8-c087-4d4a-b3be-545acdfe3f11', '74e84922-d5fc-4cdb-9835-251c31784309'),  -- Casey scores Morgan
  ('11111111-d017-d017-d017-000000000017', '11111111-0002-0002-0002-000000000002', '74e84922-d5fc-4cdb-9835-251c31784309', 'ca7c2924-39e8-4b66-bbb8-d9699adb3d65');  -- Morgan scores Jordan

-- Round 4: Eastern (In Progress) - scoring pairs already set up
-- Similar circular pattern
INSERT INTO scoring_pairs (id, round_id, scorer_id, player_id) VALUES
  ('11111111-d041-d041-d041-000000000041', '11111111-0004-0004-0004-000000000004', '41677ffc-f9c4-490b-bc39-1f7370b36c2b', 'df045f29-718a-41b5-ac4a-9a8dbf26c6cb'),  -- Sam scores Riley
  ('11111111-d042-d042-d042-000000000042', '11111111-0004-0004-0004-000000000004', 'df045f29-718a-41b5-ac4a-9a8dbf26c6cb', 'ca7c2924-39e8-4b66-bbb8-d9699adb3d65'),  -- Riley scores Jordan
  ('11111111-d043-d043-d043-000000000043', '11111111-0004-0004-0004-000000000004', 'ca7c2924-39e8-4b66-bbb8-d9699adb3d65', '7ef2ab5a-6577-4102-8e97-98d1fd58cfe4'),  -- Jordan scores Alex
  ('11111111-d044-d044-d044-000000000044', '11111111-0004-0004-0004-000000000004', '7ef2ab5a-6577-4102-8e97-98d1fd58cfe4', '25c171c8-c087-4d4a-b3be-545acdfe3f11'),  -- Alex scores Casey
  ('11111111-d045-d045-d045-000000000045', '11111111-0004-0004-0004-000000000004', '25c171c8-c087-4d4a-b3be-545acdfe3f11', '74e84922-d5fc-4cdb-9835-251c31784309'),  -- Casey scores Morgan
  ('11111111-d046-d046-d046-000000000046', '11111111-0004-0004-0004-000000000004', '74e84922-d5fc-4cdb-9835-251c31784309', '5d7c1ffc-0ad4-486b-b069-d93d626c762f'),  -- Morgan scores Taylor
  ('11111111-d047-d047-d047-000000000047', '11111111-0004-0004-0004-000000000004', '5d7c1ffc-0ad4-486b-b069-d93d626c762f', '41677ffc-f9c4-490b-bc39-1f7370b36c2b');  -- Taylor scores Sam

-- Note: Round 3 has scoring_pairs_required = FALSE, so no pairs needed
-- Note: Round 5 is upcoming - scoring pairs will be assigned before round starts

-- -----------------------------------------------------
-- Competition 2: Match Play Championship Scoring Pairs
-- -----------------------------------------------------
-- In match play, opponents score each other (reciprocal pairs)

-- QF Match 1: Riley vs Sam (reciprocal)
INSERT INTO scoring_pairs (id, round_id, scorer_id, player_id) VALUES
  ('22222222-d001-d001-d001-000000000001', '22222222-0001-0001-0001-000000000001', 'df045f29-718a-41b5-ac4a-9a8dbf26c6cb', '41677ffc-f9c4-490b-bc39-1f7370b36c2b'),  -- Riley scores Sam
  ('22222222-d002-d002-d002-000000000002', '22222222-0001-0001-0001-000000000001', '41677ffc-f9c4-490b-bc39-1f7370b36c2b', 'df045f29-718a-41b5-ac4a-9a8dbf26c6cb');  -- Sam scores Riley

-- QF Match 2: Jordan vs Casey (reciprocal)
INSERT INTO scoring_pairs (id, round_id, scorer_id, player_id) VALUES
  ('22222222-d003-d003-d003-000000000003', '22222222-0002-0002-0002-000000000002', 'ca7c2924-39e8-4b66-bbb8-d9699adb3d65', '25c171c8-c087-4d4a-b3be-545acdfe3f11'),  -- Jordan scores Casey
  ('22222222-d004-d004-d004-000000000004', '22222222-0002-0002-0002-000000000002', '25c171c8-c087-4d4a-b3be-545acdfe3f11', 'ca7c2924-39e8-4b66-bbb8-d9699adb3d65');  -- Casey scores Jordan

-- QF Match 3: Alex vs Morgan (reciprocal)
INSERT INTO scoring_pairs (id, round_id, scorer_id, player_id) VALUES
  ('22222222-d005-d005-d005-000000000005', '22222222-0003-0003-0003-000000000003', '7ef2ab5a-6577-4102-8e97-98d1fd58cfe4', '74e84922-d5fc-4cdb-9835-251c31784309'),  -- Alex scores Morgan
  ('22222222-d006-d006-d006-000000000006', '22222222-0003-0003-0003-000000000003', '74e84922-d5fc-4cdb-9835-251c31784309', '7ef2ab5a-6577-4102-8e97-98d1fd58cfe4');  -- Morgan scores Alex

-- SF Match: Riley vs Casey (reciprocal)
INSERT INTO scoring_pairs (id, round_id, scorer_id, player_id) VALUES
  ('22222222-d007-d007-d007-000000000007', '22222222-0004-0004-0004-000000000004', 'df045f29-718a-41b5-ac4a-9a8dbf26c6cb', '25c171c8-c087-4d4a-b3be-545acdfe3f11'),  -- Riley scores Casey
  ('22222222-d008-d008-d008-000000000008', '22222222-0004-0004-0004-000000000004', '25c171c8-c087-4d4a-b3be-545acdfe3f11', 'df045f29-718a-41b5-ac4a-9a8dbf26c6cb');  -- Casey scores Riley

-- Note: Final (Round 5) is upcoming - scoring pairs will be assigned

-- -----------------------------------------------------
-- Competition 3: Team Best Ball Series Scoring Pairs
-- -----------------------------------------------------
-- Cross-team scoring: players from one team score players from another team
-- Team Eagle: Sam (41677ffc...) + Riley (df045f29...)
-- Team Birdie: Jordan (ca7c2924...) + Casey (25c171c8...)
-- Team Par: Alex (7ef2ab5a...) + Morgan (74e84922...)

-- Round 1: Cross-team scoring pattern
-- Eagle members scored by Birdie members, Birdie by Par, Par by Eagle
INSERT INTO scoring_pairs (id, round_id, scorer_id, player_id) VALUES
  ('33333333-d001-d001-d001-000000000001', '33333333-0001-0001-0001-000000000001', 'ca7c2924-39e8-4b66-bbb8-d9699adb3d65', '41677ffc-f9c4-490b-bc39-1f7370b36c2b'),  -- Jordan (Birdie) scores Sam (Eagle)
  ('33333333-d002-d002-d002-000000000002', '33333333-0001-0001-0001-000000000001', '25c171c8-c087-4d4a-b3be-545acdfe3f11', 'df045f29-718a-41b5-ac4a-9a8dbf26c6cb'),  -- Casey (Birdie) scores Riley (Eagle)
  ('33333333-d003-d003-d003-000000000003', '33333333-0001-0001-0001-000000000001', '7ef2ab5a-6577-4102-8e97-98d1fd58cfe4', 'ca7c2924-39e8-4b66-bbb8-d9699adb3d65'),  -- Alex (Par) scores Jordan (Birdie)
  ('33333333-d004-d004-d004-000000000004', '33333333-0001-0001-0001-000000000001', '74e84922-d5fc-4cdb-9835-251c31784309', '25c171c8-c087-4d4a-b3be-545acdfe3f11'),  -- Morgan (Par) scores Casey (Birdie)
  ('33333333-d005-d005-d005-000000000005', '33333333-0001-0001-0001-000000000001', '41677ffc-f9c4-490b-bc39-1f7370b36c2b', '7ef2ab5a-6577-4102-8e97-98d1fd58cfe4'),  -- Sam (Eagle) scores Alex (Par)
  ('33333333-d006-d006-d006-000000000006', '33333333-0001-0001-0001-000000000001', 'df045f29-718a-41b5-ac4a-9a8dbf26c6cb', '74e84922-d5fc-4cdb-9835-251c31784309');  -- Riley (Eagle) scores Morgan (Par)

-- Round 2: Rotated cross-team scoring
INSERT INTO scoring_pairs (id, round_id, scorer_id, player_id) VALUES
  ('33333333-d011-d011-d011-000000000011', '33333333-0002-0002-0002-000000000002', '7ef2ab5a-6577-4102-8e97-98d1fd58cfe4', '41677ffc-f9c4-490b-bc39-1f7370b36c2b'),  -- Alex (Par) scores Sam (Eagle)
  ('33333333-d012-d012-d012-000000000012', '33333333-0002-0002-0002-000000000002', '74e84922-d5fc-4cdb-9835-251c31784309', 'df045f29-718a-41b5-ac4a-9a8dbf26c6cb'),  -- Morgan (Par) scores Riley (Eagle)
  ('33333333-d013-d013-d013-000000000013', '33333333-0002-0002-0002-000000000002', '41677ffc-f9c4-490b-bc39-1f7370b36c2b', 'ca7c2924-39e8-4b66-bbb8-d9699adb3d65'),  -- Sam (Eagle) scores Jordan (Birdie)
  ('33333333-d014-d014-d014-000000000014', '33333333-0002-0002-0002-000000000002', 'df045f29-718a-41b5-ac4a-9a8dbf26c6cb', '25c171c8-c087-4d4a-b3be-545acdfe3f11'),  -- Riley (Eagle) scores Casey (Birdie)
  ('33333333-d015-d015-d015-000000000015', '33333333-0002-0002-0002-000000000002', 'ca7c2924-39e8-4b66-bbb8-d9699adb3d65', '7ef2ab5a-6577-4102-8e97-98d1fd58cfe4'),  -- Jordan (Birdie) scores Alex (Par)
  ('33333333-d016-d016-d016-000000000016', '33333333-0002-0002-0002-000000000002', '25c171c8-c087-4d4a-b3be-545acdfe3f11', '74e84922-d5fc-4cdb-9835-251c31784309');  -- Casey (Birdie) scores Morgan (Par)

-- Round 3: In Progress - scoring pairs already assigned
INSERT INTO scoring_pairs (id, round_id, scorer_id, player_id) VALUES
  ('33333333-d021-d021-d021-000000000021', '33333333-0003-0003-0003-000000000003', '25c171c8-c087-4d4a-b3be-545acdfe3f11', '41677ffc-f9c4-490b-bc39-1f7370b36c2b'),  -- Casey scores Sam
  ('33333333-d022-d022-d022-000000000022', '33333333-0003-0003-0003-000000000003', 'ca7c2924-39e8-4b66-bbb8-d9699adb3d65', 'df045f29-718a-41b5-ac4a-9a8dbf26c6cb'),  -- Jordan scores Riley
  ('33333333-d023-d023-d023-000000000023', '33333333-0003-0003-0003-000000000003', '74e84922-d5fc-4cdb-9835-251c31784309', 'ca7c2924-39e8-4b66-bbb8-d9699adb3d65'),  -- Morgan scores Jordan
  ('33333333-d024-d024-d024-000000000024', '33333333-0003-0003-0003-000000000003', '7ef2ab5a-6577-4102-8e97-98d1fd58cfe4', '25c171c8-c087-4d4a-b3be-545acdfe3f11'),  -- Alex scores Casey
  ('33333333-d025-d025-d025-000000000025', '33333333-0003-0003-0003-000000000003', 'df045f29-718a-41b5-ac4a-9a8dbf26c6cb', '7ef2ab5a-6577-4102-8e97-98d1fd58cfe4'),  -- Riley scores Alex
  ('33333333-d026-d026-d026-000000000026', '33333333-0003-0003-0003-000000000003', '41677ffc-f9c4-490b-bc39-1f7370b36c2b', '74e84922-d5fc-4cdb-9835-251c31784309');  -- Sam scores Morgan

-- Note: Round 4 is upcoming - scoring pairs will be assigned before round starts


-- =====================================================
-- COMPETITION 2: Match Play Championship - PAIRINGS & SCORECARDS
-- =====================================================
-- Each match has 2 players playing head-to-head

-- Pairings for QF Match 1: Riley vs Sam
INSERT INTO pairings (id, round_id, player_ids) VALUES
  ('22222222-a001-a001-a001-000000000001', '22222222-0001-0001-0001-000000000001',
   ARRAY['df045f29-718a-41b5-ac4a-9a8dbf26c6cb', '41677ffc-f9c4-490b-bc39-1f7370b36c2b']::uuid[]);

-- Pairings for QF Match 2: Jordan vs Casey
INSERT INTO pairings (id, round_id, player_ids) VALUES
  ('22222222-a002-a002-a002-000000000002', '22222222-0002-0002-0002-000000000002',
   ARRAY['ca7c2924-39e8-4b66-bbb8-d9699adb3d65', '25c171c8-c087-4d4a-b3be-545acdfe3f11']::uuid[]);

-- Pairings for QF Match 3: Alex vs Morgan
INSERT INTO pairings (id, round_id, player_ids) VALUES
  ('22222222-a003-a003-a003-000000000003', '22222222-0003-0003-0003-000000000003',
   ARRAY['7ef2ab5a-6577-4102-8e97-98d1fd58cfe4', '74e84922-d5fc-4cdb-9835-251c31784309']::uuid[]);

-- Pairings for SF Match: Riley vs Casey
INSERT INTO pairings (id, round_id, player_ids) VALUES
  ('22222222-a004-a004-a004-000000000004', '22222222-0004-0004-0004-000000000004',
   ARRAY['df045f29-718a-41b5-ac4a-9a8dbf26c6cb', '25c171c8-c087-4d4a-b3be-545acdfe3f11']::uuid[]);

-- QF Match 1 Scorecards: Riley (winner 3&2) vs Sam
-- Match ended on hole 16 (3&2 means 3 up with 2 to play)
INSERT INTO scorecards (id, round_id, player_id, scores, total_gross, total_net, total_points, status, submitted_at) VALUES
  ('22222222-b001-b001-b001-000000000001', '22222222-0001-0001-0001-000000000001', 'df045f29-718a-41b5-ac4a-9a8dbf26c6cb',
   '{"1":{"strokes":4},"2":{"strokes":4},"3":{"strokes":3},"4":{"strokes":4},"5":{"strokes":4},"6":{"strokes":4},"7":{"strokes":3},"8":{"strokes":4},"9":{"strokes":4},"10":{"strokes":4},"11":{"strokes":4},"12":{"strokes":3},"13":{"strokes":4},"14":{"strokes":4},"15":{"strokes":4},"16":{"strokes":3},"17":{"strokes":0},"18":{"strokes":0}}'::jsonb,
   65, 57, NULL, 'completed', '2025-02-05 16:00:00'),
  ('22222222-b002-b002-b002-000000000002', '22222222-0001-0001-0001-000000000001', '41677ffc-f9c4-490b-bc39-1f7370b36c2b',
   '{"1":{"strokes":5},"2":{"strokes":4},"3":{"strokes":3},"4":{"strokes":5},"5":{"strokes":4},"6":{"strokes":4},"7":{"strokes":3},"8":{"strokes":5},"9":{"strokes":4},"10":{"strokes":4},"11":{"strokes":5},"12":{"strokes":3},"13":{"strokes":5},"14":{"strokes":4},"15":{"strokes":5},"16":{"strokes":4},"17":{"strokes":0},"18":{"strokes":0}}'::jsonb,
   71, 59, NULL, 'completed', '2025-02-05 16:00:00');

-- QF Match 2 Scorecards: Casey (winner 2 up) vs Jordan
INSERT INTO scorecards (id, round_id, player_id, scores, total_gross, total_net, total_points, status, submitted_at) VALUES
  ('22222222-b003-b003-b003-000000000003', '22222222-0002-0002-0002-000000000002', '25c171c8-c087-4d4a-b3be-545acdfe3f11',
   '{"1":{"strokes":4},"2":{"strokes":4},"3":{"strokes":3},"4":{"strokes":5},"5":{"strokes":4},"6":{"strokes":4},"7":{"strokes":3},"8":{"strokes":4},"9":{"strokes":5},"10":{"strokes":4},"11":{"strokes":4},"12":{"strokes":3},"13":{"strokes":5},"14":{"strokes":4},"15":{"strokes":4},"16":{"strokes":3},"17":{"strokes":4},"18":{"strokes":4}}'::jsonb,
   71, 56, NULL, 'completed', '2025-02-05 16:00:00'),
  ('22222222-b004-b004-b004-000000000004', '22222222-0002-0002-0002-000000000002', 'ca7c2924-39e8-4b66-bbb8-d9699adb3d65',
   '{"1":{"strokes":5},"2":{"strokes":5},"3":{"strokes":3},"4":{"strokes":5},"5":{"strokes":5},"6":{"strokes":4},"7":{"strokes":3},"8":{"strokes":5},"9":{"strokes":5},"10":{"strokes":5},"11":{"strokes":4},"12":{"strokes":4},"13":{"strokes":5},"14":{"strokes":5},"15":{"strokes":4},"16":{"strokes":4},"17":{"strokes":5},"18":{"strokes":5}}'::jsonb,
   81, 63, NULL, 'completed', '2025-02-05 16:00:00');

-- QF Match 3 Scorecards: Alex (winner 1 up) vs Morgan
INSERT INTO scorecards (id, round_id, player_id, scores, total_gross, total_net, total_points, status, submitted_at) VALUES
  ('22222222-b005-b005-b005-000000000005', '22222222-0003-0003-0003-000000000003', '7ef2ab5a-6577-4102-8e97-98d1fd58cfe4',
   '{"1":{"strokes":5},"2":{"strokes":5},"3":{"strokes":4},"4":{"strokes":5},"5":{"strokes":5},"6":{"strokes":5},"7":{"strokes":4},"8":{"strokes":5},"9":{"strokes":5},"10":{"strokes":5},"11":{"strokes":5},"12":{"strokes":4},"13":{"strokes":5},"14":{"strokes":5},"15":{"strokes":5},"16":{"strokes":4},"17":{"strokes":5},"18":{"strokes":4}}'::jsonb,
   85, 61, NULL, 'completed', '2025-02-06 16:00:00'),
  ('22222222-b006-b006-b006-000000000006', '22222222-0003-0003-0003-000000000003', '74e84922-d5fc-4cdb-9835-251c31784309',
   '{"1":{"strokes":6},"2":{"strokes":5},"3":{"strokes":4},"4":{"strokes":6},"5":{"strokes":5},"6":{"strokes":5},"7":{"strokes":4},"8":{"strokes":6},"9":{"strokes":5},"10":{"strokes":5},"11":{"strokes":6},"12":{"strokes":4},"13":{"strokes":6},"14":{"strokes":5},"15":{"strokes":5},"16":{"strokes":4},"17":{"strokes":5},"18":{"strokes":5}}'::jsonb,
   91, 69, NULL, 'completed', '2025-02-06 16:00:00');

-- SF Match Scorecards: Riley (winner 4&3) vs Casey
-- Match ended on hole 15 (4&3 means 4 up with 3 to play)
INSERT INTO scorecards (id, round_id, player_id, scores, total_gross, total_net, total_points, status, submitted_at) VALUES
  ('22222222-b007-b007-b007-000000000007', '22222222-0004-0004-0004-000000000004', 'df045f29-718a-41b5-ac4a-9a8dbf26c6cb',
   '{"1":{"strokes":4},"2":{"strokes":3},"3":{"strokes":3},"4":{"strokes":4},"5":{"strokes":4},"6":{"strokes":4},"7":{"strokes":3},"8":{"strokes":4},"9":{"strokes":4},"10":{"strokes":3},"11":{"strokes":4},"12":{"strokes":3},"13":{"strokes":4},"14":{"strokes":4},"15":{"strokes":3},"16":{"strokes":0},"17":{"strokes":0},"18":{"strokes":0}}'::jsonb,
   54, 46, NULL, 'completed', '2025-02-12 16:00:00'),
  ('22222222-b008-b008-b008-000000000008', '22222222-0004-0004-0004-000000000004', '25c171c8-c087-4d4a-b3be-545acdfe3f11',
   '{"1":{"strokes":5},"2":{"strokes":4},"3":{"strokes":3},"4":{"strokes":5},"5":{"strokes":5},"6":{"strokes":4},"7":{"strokes":4},"8":{"strokes":5},"9":{"strokes":5},"10":{"strokes":4},"11":{"strokes":5},"12":{"strokes":4},"13":{"strokes":5},"14":{"strokes":5},"15":{"strokes":4},"16":{"strokes":0},"17":{"strokes":0},"18":{"strokes":0}}'::jsonb,
   67, 52, NULL, 'completed', '2025-02-12 16:00:00');


-- =====================================================
-- COMPETITION 3: Team Best Ball Series - PAIRINGS & SCORECARDS
-- =====================================================
-- Teams of 2 playing best-ball format
-- Split into two 3-somes (one player from each team per group)

-- Pairings for Round 1 (Royal Adelaide) - Split into 2 groups of 3
INSERT INTO pairings (id, round_id, player_ids) VALUES
  ('33333333-a001-a001-a001-000000000001', '33333333-0001-0001-0001-000000000001',
   ARRAY['41677ffc-f9c4-490b-bc39-1f7370b36c2b', 'ca7c2924-39e8-4b66-bbb8-d9699adb3d65', '7ef2ab5a-6577-4102-8e97-98d1fd58cfe4']::uuid[]),
  ('33333333-a003-a003-a003-000000000003', '33333333-0001-0001-0001-000000000001',
   ARRAY['df045f29-718a-41b5-ac4a-9a8dbf26c6cb', '25c171c8-c087-4d4a-b3be-545acdfe3f11', '74e84922-d5fc-4cdb-9835-251c31784309']::uuid[]);

-- Pairings for Round 2 (Kingston Heath) - Split into 2 groups of 3
INSERT INTO pairings (id, round_id, player_ids) VALUES
  ('33333333-a002-a002-a002-000000000002', '33333333-0002-0002-0002-000000000002',
   ARRAY['41677ffc-f9c4-490b-bc39-1f7370b36c2b', 'ca7c2924-39e8-4b66-bbb8-d9699adb3d65', '7ef2ab5a-6577-4102-8e97-98d1fd58cfe4']::uuid[]),
  ('33333333-a004-a004-a004-000000000004', '33333333-0002-0002-0002-000000000002',
   ARRAY['df045f29-718a-41b5-ac4a-9a8dbf26c6cb', '25c171c8-c087-4d4a-b3be-545acdfe3f11', '74e84922-d5fc-4cdb-9835-251c31784309']::uuid[]);

-- Round 1 Scorecards (Royal Adelaide) - Team Eagle: Sam + Riley
INSERT INTO scorecards (id, round_id, player_id, scores, total_gross, total_net, total_points, status, submitted_at) VALUES
  ('33333333-b001-b001-b001-000000000001', '33333333-0001-0001-0001-000000000001', '41677ffc-f9c4-490b-bc39-1f7370b36c2b',
   '{"1":{"strokes":4},"2":{"strokes":4},"3":{"strokes":3},"4":{"strokes":5},"5":{"strokes":4},"6":{"strokes":4},"7":{"strokes":3},"8":{"strokes":4},"9":{"strokes":5},"10":{"strokes":4},"11":{"strokes":4},"12":{"strokes":3},"13":{"strokes":5},"14":{"strokes":4},"15":{"strokes":4},"16":{"strokes":3},"17":{"strokes":5},"18":{"strokes":5}}'::jsonb,
   73, 61, 38, 'completed', '2025-03-05 16:00:00'),
  ('33333333-b002-b002-b002-000000000002', '33333333-0001-0001-0001-000000000001', 'df045f29-718a-41b5-ac4a-9a8dbf26c6cb',
   '{"1":{"strokes":4},"2":{"strokes":4},"3":{"strokes":3},"4":{"strokes":4},"5":{"strokes":4},"6":{"strokes":4},"7":{"strokes":3},"8":{"strokes":4},"9":{"strokes":4},"10":{"strokes":4},"11":{"strokes":4},"12":{"strokes":3},"13":{"strokes":4},"14":{"strokes":4},"15":{"strokes":4},"16":{"strokes":3},"17":{"strokes":4},"18":{"strokes":4}}'::jsonb,
   68, 60, 40, 'completed', '2025-03-05 16:00:00');

-- Round 1 Scorecards - Team Birdie: Jordan + Casey
INSERT INTO scorecards (id, round_id, player_id, scores, total_gross, total_net, total_points, status, submitted_at) VALUES
  ('33333333-b003-b003-b003-000000000003', '33333333-0001-0001-0001-000000000001', 'ca7c2924-39e8-4b66-bbb8-d9699adb3d65',
   '{"1":{"strokes":5},"2":{"strokes":5},"3":{"strokes":4},"4":{"strokes":5},"5":{"strokes":5},"6":{"strokes":4},"7":{"strokes":3},"8":{"strokes":5},"9":{"strokes":5},"10":{"strokes":5},"11":{"strokes":5},"12":{"strokes":4},"13":{"strokes":5},"14":{"strokes":5},"15":{"strokes":4},"16":{"strokes":3},"17":{"strokes":5},"18":{"strokes":5}}'::jsonb,
   82, 64, 35, 'completed', '2025-03-05 16:00:00'),
  ('33333333-b004-b004-b004-000000000004', '33333333-0001-0001-0001-000000000001', '25c171c8-c087-4d4a-b3be-545acdfe3f11',
   '{"1":{"strokes":5},"2":{"strokes":4},"3":{"strokes":3},"4":{"strokes":5},"5":{"strokes":4},"6":{"strokes":4},"7":{"strokes":3},"8":{"strokes":5},"9":{"strokes":5},"10":{"strokes":4},"11":{"strokes":5},"12":{"strokes":3},"13":{"strokes":5},"14":{"strokes":4},"15":{"strokes":4},"16":{"strokes":3},"17":{"strokes":5},"18":{"strokes":5}}'::jsonb,
   76, 61, 37, 'completed', '2025-03-05 16:00:00');

-- Round 1 Scorecards - Team Par: Alex + Morgan
INSERT INTO scorecards (id, round_id, player_id, scores, total_gross, total_net, total_points, status, submitted_at) VALUES
  ('33333333-b005-b005-b005-000000000005', '33333333-0001-0001-0001-000000000001', '7ef2ab5a-6577-4102-8e97-98d1fd58cfe4',
   '{"1":{"strokes":6},"2":{"strokes":5},"3":{"strokes":4},"4":{"strokes":6},"5":{"strokes":5},"6":{"strokes":5},"7":{"strokes":4},"8":{"strokes":5},"9":{"strokes":6},"10":{"strokes":5},"11":{"strokes":5},"12":{"strokes":4},"13":{"strokes":6},"14":{"strokes":5},"15":{"strokes":5},"16":{"strokes":4},"17":{"strokes":5},"18":{"strokes":5}}'::jsonb,
   90, 66, 33, 'completed', '2025-03-05 16:00:00'),
  ('33333333-b006-b006-b006-000000000006', '33333333-0001-0001-0001-000000000001', '74e84922-d5fc-4cdb-9835-251c31784309',
   '{"1":{"strokes":6},"2":{"strokes":5},"3":{"strokes":4},"4":{"strokes":6},"5":{"strokes":5},"6":{"strokes":5},"7":{"strokes":4},"8":{"strokes":6},"9":{"strokes":6},"10":{"strokes":5},"11":{"strokes":6},"12":{"strokes":4},"13":{"strokes":6},"14":{"strokes":5},"15":{"strokes":5},"16":{"strokes":4},"17":{"strokes":6},"18":{"strokes":6}}'::jsonb,
   94, 72, 31, 'completed', '2025-03-05 16:00:00');

-- Round 2 Scorecards (Kingston Heath) - Team Eagle: Sam + Riley
INSERT INTO scorecards (id, round_id, player_id, scores, total_gross, total_net, total_points, status, submitted_at) VALUES
  ('33333333-b007-b007-b007-000000000007', '33333333-0002-0002-0002-000000000002', '41677ffc-f9c4-490b-bc39-1f7370b36c2b',
   '{"1":{"strokes":5},"2":{"strokes":4},"3":{"strokes":3},"4":{"strokes":5},"5":{"strokes":4},"6":{"strokes":5},"7":{"strokes":3},"8":{"strokes":5},"9":{"strokes":5},"10":{"strokes":4},"11":{"strokes":5},"12":{"strokes":3},"13":{"strokes":5},"14":{"strokes":4},"15":{"strokes":5},"16":{"strokes":3},"17":{"strokes":5},"18":{"strokes":5}}'::jsonb,
   78, 66, 36, 'completed', '2025-03-12 16:00:00'),
  ('33333333-b008-b008-b008-000000000008', '33333333-0002-0002-0002-000000000002', 'df045f29-718a-41b5-ac4a-9a8dbf26c6cb',
   '{"1":{"strokes":4},"2":{"strokes":4},"3":{"strokes":3},"4":{"strokes":5},"5":{"strokes":4},"6":{"strokes":4},"7":{"strokes":3},"8":{"strokes":4},"9":{"strokes":5},"10":{"strokes":4},"11":{"strokes":4},"12":{"strokes":3},"13":{"strokes":5},"14":{"strokes":4},"15":{"strokes":4},"16":{"strokes":3},"17":{"strokes":4},"18":{"strokes":5}}'::jsonb,
   72, 64, 39, 'completed', '2025-03-12 16:00:00');

-- Round 2 Scorecards - Team Birdie: Jordan + Casey
INSERT INTO scorecards (id, round_id, player_id, scores, total_gross, total_net, total_points, status, submitted_at) VALUES
  ('33333333-b009-b009-b009-000000000009', '33333333-0002-0002-0002-000000000002', 'ca7c2924-39e8-4b66-bbb8-d9699adb3d65',
   '{"1":{"strokes":5},"2":{"strokes":4},"3":{"strokes":3},"4":{"strokes":5},"5":{"strokes":4},"6":{"strokes":4},"7":{"strokes":3},"8":{"strokes":5},"9":{"strokes":5},"10":{"strokes":4},"11":{"strokes":5},"12":{"strokes":3},"13":{"strokes":5},"14":{"strokes":5},"15":{"strokes":4},"16":{"strokes":3},"17":{"strokes":5},"18":{"strokes":5}}'::jsonb,
   77, 59, 39, 'completed', '2025-03-12 16:00:00'),
  ('33333333-b010-b010-b010-000000000010', '33333333-0002-0002-0002-000000000002', '25c171c8-c087-4d4a-b3be-545acdfe3f11',
   '{"1":{"strokes":5},"2":{"strokes":4},"3":{"strokes":3},"4":{"strokes":5},"5":{"strokes":4},"6":{"strokes":4},"7":{"strokes":3},"8":{"strokes":4},"9":{"strokes":5},"10":{"strokes":4},"11":{"strokes":4},"12":{"strokes":3},"13":{"strokes":5},"14":{"strokes":4},"15":{"strokes":4},"16":{"strokes":3},"17":{"strokes":5},"18":{"strokes":5}}'::jsonb,
   74, 59, 38, 'completed', '2025-03-12 16:00:00');

-- Round 2 Scorecards - Team Par: Alex + Morgan
INSERT INTO scorecards (id, round_id, player_id, scores, total_gross, total_net, total_points, status, submitted_at) VALUES
  ('33333333-b011-b011-b011-000000000011', '33333333-0002-0002-0002-000000000002', '7ef2ab5a-6577-4102-8e97-98d1fd58cfe4',
   '{"1":{"strokes":6},"2":{"strokes":5},"3":{"strokes":4},"4":{"strokes":5},"5":{"strokes":5},"6":{"strokes":5},"7":{"strokes":4},"8":{"strokes":5},"9":{"strokes":5},"10":{"strokes":5},"11":{"strokes":5},"12":{"strokes":4},"13":{"strokes":5},"14":{"strokes":5},"15":{"strokes":5},"16":{"strokes":4},"17":{"strokes":5},"18":{"strokes":5}}'::jsonb,
   87, 63, 35, 'completed', '2025-03-12 16:00:00'),
  ('33333333-b012-b012-b012-000000000012', '33333333-0002-0002-0002-000000000002', '74e84922-d5fc-4cdb-9835-251c31784309',
   '{"1":{"strokes":6},"2":{"strokes":5},"3":{"strokes":4},"4":{"strokes":6},"5":{"strokes":5},"6":{"strokes":5},"7":{"strokes":4},"8":{"strokes":5},"9":{"strokes":6},"10":{"strokes":5},"11":{"strokes":5},"12":{"strokes":4},"13":{"strokes":6},"14":{"strokes":5},"15":{"strokes":5},"16":{"strokes":4},"17":{"strokes":5},"18":{"strokes":6}}'::jsonb,
   91, 69, 33, 'completed', '2025-03-12 16:00:00');


-- =====================================================
-- COMPETITION 4: Corporate Scramble Cup
-- =====================================================
-- Fixed teams of 3, scramble format (all completed)

INSERT INTO competitions (
  id, name, description, competition_type, start_date, end_date,
  handicap_system, organizer_id, status, invite_code,
  team_mode, team_size, point_system
) VALUES (
  '44444444-4444-4444-4444-444444444444',
  'Corporate Scramble Cup',
  'Team scramble competition - work together for the best score!',
  'event',
  '2024-11-01',
  '2024-11-30',
  'honor',
  '74e84922-d5fc-4cdb-9835-251c31784309',
  'completed',
  'CORP-001',
  'fixed',
  3,
  '{"type": "position", "rules": {"1": 15, "2": 10, "default": 5}, "matchPlay": {"win": 3, "draw": 1, "loss": 0}}'
);

-- Add 6 players
INSERT INTO competition_players (competition_id, player_id, status) VALUES
  ('44444444-4444-4444-4444-444444444444', '41677ffc-f9c4-490b-bc39-1f7370b36c2b', 'accepted'),
  ('44444444-4444-4444-4444-444444444444', 'ca7c2924-39e8-4b66-bbb8-d9699adb3d65', 'accepted'),
  ('44444444-4444-4444-4444-444444444444', '7ef2ab5a-6577-4102-8e97-98d1fd58cfe4', 'accepted'),
  ('44444444-4444-4444-4444-444444444444', 'df045f29-718a-41b5-ac4a-9a8dbf26c6cb', 'accepted'),
  ('44444444-4444-4444-4444-444444444444', '25c171c8-c087-4d4a-b3be-545acdfe3f11', 'accepted'),
  ('44444444-4444-4444-4444-444444444444', '74e84922-d5fc-4cdb-9835-251c31784309', 'accepted');

-- Create 2 Teams of 3
INSERT INTO teams (id, competition_id, name) VALUES
  ('44444444-aa01-aa01-aa01-000000000001', '44444444-4444-4444-4444-444444444444', 'The Eagles'),
  ('44444444-aa02-aa02-aa02-000000000002', '44444444-4444-4444-4444-444444444444', 'The Birdies');

-- The Eagles: Players 1, 2, 3
INSERT INTO team_members (team_id, player_id) VALUES
  ('44444444-aa01-aa01-aa01-000000000001', '41677ffc-f9c4-490b-bc39-1f7370b36c2b'),
  ('44444444-aa01-aa01-aa01-000000000001', 'ca7c2924-39e8-4b66-bbb8-d9699adb3d65'),
  ('44444444-aa01-aa01-aa01-000000000001', '7ef2ab5a-6577-4102-8e97-98d1fd58cfe4');

-- The Birdies: Players 4, 5, 6
INSERT INTO team_members (team_id, player_id) VALUES
  ('44444444-aa02-aa02-aa02-000000000002', 'df045f29-718a-41b5-ac4a-9a8dbf26c6cb'),
  ('44444444-aa02-aa02-aa02-000000000002', '25c171c8-c087-4d4a-b3be-545acdfe3f11'),
  ('44444444-aa02-aa02-aa02-000000000002', '74e84922-d5fc-4cdb-9835-251c31784309');

-- 3 Rounds - All Completed
INSERT INTO rounds (id, competition_id, round_number, course_id, date, game_type, status, is_team_round, team_format) VALUES
  ('44444444-0001-0001-0001-000000000001', '44444444-4444-4444-4444-444444444444', 1, 'c0000003-0000-0000-0000-000000000003', '2024-11-06', 'stroke', 'completed', TRUE, 'scramble'),
  ('44444444-0002-0002-0002-000000000002', '44444444-4444-4444-4444-444444444444', 2, 'c0000002-0000-0000-0000-000000000002', '2024-11-13', 'stroke', 'completed', TRUE, 'scramble'),
  ('44444444-0003-0003-0003-000000000003', '44444444-4444-4444-4444-444444444444', 3, 'c3333333-3333-3333-3333-333333333333', '2024-11-20', 'stroke', 'completed', TRUE, 'scramble');

-- Round 1 Results (lower gross is better for scramble)
-- Note: raw_result_data uses snake_case keys to match RoundResultData type
INSERT INTO round_results (id, round_id, team_id, raw_score, raw_result_data, position, competition_points, is_team_result) VALUES
  ('44444444-cc01-cc01-cc01-000000000001', '44444444-0001-0001-0001-000000000001', '44444444-aa02-aa02-aa02-000000000002', 62,
   '{"team_score": 62, "gross_score": 62, "net_score": 56, "format": "scramble"}'::jsonb,
   1, 15, TRUE),
  ('44444444-cc02-cc02-cc02-000000000002', '44444444-0001-0001-0001-000000000001', '44444444-aa01-aa01-aa01-000000000001', 65,
   '{"team_score": 65, "gross_score": 65, "net_score": 58, "format": "scramble"}'::jsonb,
   2, 10, TRUE);

-- Round 2 Results
INSERT INTO round_results (id, round_id, team_id, raw_score, raw_result_data, position, competition_points, is_team_result) VALUES
  ('44444444-cc03-cc03-cc03-000000000003', '44444444-0002-0002-0002-000000000002', '44444444-aa01-aa01-aa01-000000000001', 63,
   '{"team_score": 63, "gross_score": 63, "net_score": 56, "format": "scramble"}'::jsonb,
   1, 15, TRUE),
  ('44444444-cc04-cc04-cc04-000000000004', '44444444-0002-0002-0002-000000000002', '44444444-aa02-aa02-aa02-000000000002', 64,
   '{"team_score": 64, "gross_score": 64, "net_score": 58, "format": "scramble"}'::jsonb,
   2, 10, TRUE);

-- Round 3 Results
INSERT INTO round_results (id, round_id, team_id, raw_score, raw_result_data, position, competition_points, is_team_result) VALUES
  ('44444444-cc05-cc05-cc05-000000000005', '44444444-0003-0003-0003-000000000003', '44444444-aa02-aa02-aa02-000000000002', 61,
   '{"team_score": 61, "gross_score": 61, "net_score": 55, "format": "scramble"}'::jsonb,
   1, 15, TRUE),
  ('44444444-cc06-cc06-cc06-000000000006', '44444444-0003-0003-0003-000000000003', '44444444-aa01-aa01-aa01-000000000001', 66,
   '{"team_score": 66, "gross_score": 66, "net_score": 59, "format": "scramble"}'::jsonb,
   2, 10, TRUE);

-- =====================================================
-- CORPORATE SCRAMBLE CUP - PAIRINGS
-- =====================================================
-- Team scramble: all team members play together as one pairing

-- Pairings for Round 1 (Victoria GC)
INSERT INTO pairings (id, round_id, player_ids) VALUES
  ('44444444-a001-a001-a001-000000000001', '44444444-0001-0001-0001-000000000001',
   ARRAY['41677ffc-f9c4-490b-bc39-1f7370b36c2b', 'ca7c2924-39e8-4b66-bbb8-d9699adb3d65', '7ef2ab5a-6577-4102-8e97-98d1fd58cfe4']::uuid[]),
  ('44444444-a002-a002-a002-000000000002', '44444444-0001-0001-0001-000000000001',
   ARRAY['df045f29-718a-41b5-ac4a-9a8dbf26c6cb', '25c171c8-c087-4d4a-b3be-545acdfe3f11', '74e84922-d5fc-4cdb-9835-251c31784309']::uuid[]);

-- Pairings for Round 2 (Royal Melbourne)
INSERT INTO pairings (id, round_id, player_ids) VALUES
  ('44444444-a003-a003-a003-000000000003', '44444444-0002-0002-0002-000000000002',
   ARRAY['41677ffc-f9c4-490b-bc39-1f7370b36c2b', 'ca7c2924-39e8-4b66-bbb8-d9699adb3d65', '7ef2ab5a-6577-4102-8e97-98d1fd58cfe4']::uuid[]),
  ('44444444-a004-a004-a004-000000000004', '44444444-0002-0002-0002-000000000002',
   ARRAY['df045f29-718a-41b5-ac4a-9a8dbf26c6cb', '25c171c8-c087-4d4a-b3be-545acdfe3f11', '74e84922-d5fc-4cdb-9835-251c31784309']::uuid[]);

-- Pairings for Round 3 (Eastern East/South)
INSERT INTO pairings (id, round_id, player_ids) VALUES
  ('44444444-a005-a005-a005-000000000005', '44444444-0003-0003-0003-000000000003',
   ARRAY['41677ffc-f9c4-490b-bc39-1f7370b36c2b', 'ca7c2924-39e8-4b66-bbb8-d9699adb3d65', '7ef2ab5a-6577-4102-8e97-98d1fd58cfe4']::uuid[]),
  ('44444444-a006-a006-a006-000000000006', '44444444-0003-0003-0003-000000000003',
   ARRAY['df045f29-718a-41b5-ac4a-9a8dbf26c6cb', '25c171c8-c087-4d4a-b3be-545acdfe3f11', '74e84922-d5fc-4cdb-9835-251c31784309']::uuid[]);

-- =====================================================
-- CORPORATE SCRAMBLE CUP - SCORECARDS
-- =====================================================
-- In scramble format, all team members have the same scorecard (team score)
-- Each player gets their own scorecard entry with the team's scramble scores

-- Round 1 Scorecards (Victoria GC) - Team The Eagles (Sam, Jordan, Alex)
INSERT INTO scorecards (id, round_id, player_id, scores, total_gross, total_net, total_points, status, submitted_at) VALUES
  ('44444444-b001-b001-b001-000000000001', '44444444-0001-0001-0001-000000000001', '41677ffc-f9c4-490b-bc39-1f7370b36c2b',
   '{"1":{"strokes":4},"2":{"strokes":3},"3":{"strokes":3},"4":{"strokes":4},"5":{"strokes":4},"6":{"strokes":4},"7":{"strokes":3},"8":{"strokes":4},"9":{"strokes":4},"10":{"strokes":4},"11":{"strokes":3},"12":{"strokes":3},"13":{"strokes":4},"14":{"strokes":4},"15":{"strokes":4},"16":{"strokes":3},"17":{"strokes":4},"18":{"strokes":3}}'::jsonb,
   65, 58, NULL, 'completed', '2024-11-06 16:00:00'),
  ('44444444-b002-b002-b002-000000000002', '44444444-0001-0001-0001-000000000001', 'ca7c2924-39e8-4b66-bbb8-d9699adb3d65',
   '{"1":{"strokes":4},"2":{"strokes":3},"3":{"strokes":3},"4":{"strokes":4},"5":{"strokes":4},"6":{"strokes":4},"7":{"strokes":3},"8":{"strokes":4},"9":{"strokes":4},"10":{"strokes":4},"11":{"strokes":3},"12":{"strokes":3},"13":{"strokes":4},"14":{"strokes":4},"15":{"strokes":4},"16":{"strokes":3},"17":{"strokes":4},"18":{"strokes":3}}'::jsonb,
   65, 58, NULL, 'completed', '2024-11-06 16:00:00'),
  ('44444444-b003-b003-b003-000000000003', '44444444-0001-0001-0001-000000000001', '7ef2ab5a-6577-4102-8e97-98d1fd58cfe4',
   '{"1":{"strokes":4},"2":{"strokes":3},"3":{"strokes":3},"4":{"strokes":4},"5":{"strokes":4},"6":{"strokes":4},"7":{"strokes":3},"8":{"strokes":4},"9":{"strokes":4},"10":{"strokes":4},"11":{"strokes":3},"12":{"strokes":3},"13":{"strokes":4},"14":{"strokes":4},"15":{"strokes":4},"16":{"strokes":3},"17":{"strokes":4},"18":{"strokes":3}}'::jsonb,
   65, 58, NULL, 'completed', '2024-11-06 16:00:00');

-- Round 1 Scorecards - Team The Birdies (Riley, Casey, Morgan)
INSERT INTO scorecards (id, round_id, player_id, scores, total_gross, total_net, total_points, status, submitted_at) VALUES
  ('44444444-b004-b004-b004-000000000004', '44444444-0001-0001-0001-000000000001', 'df045f29-718a-41b5-ac4a-9a8dbf26c6cb',
   '{"1":{"strokes":3},"2":{"strokes":4},"3":{"strokes":3},"4":{"strokes":4},"5":{"strokes":3},"6":{"strokes":4},"7":{"strokes":3},"8":{"strokes":4},"9":{"strokes":4},"10":{"strokes":3},"11":{"strokes":4},"12":{"strokes":3},"13":{"strokes":4},"14":{"strokes":3},"15":{"strokes":4},"16":{"strokes":3},"17":{"strokes":3},"18":{"strokes":4}}'::jsonb,
   62, 56, NULL, 'completed', '2024-11-06 16:00:00'),
  ('44444444-b005-b005-b005-000000000005', '44444444-0001-0001-0001-000000000001', '25c171c8-c087-4d4a-b3be-545acdfe3f11',
   '{"1":{"strokes":3},"2":{"strokes":4},"3":{"strokes":3},"4":{"strokes":4},"5":{"strokes":3},"6":{"strokes":4},"7":{"strokes":3},"8":{"strokes":4},"9":{"strokes":4},"10":{"strokes":3},"11":{"strokes":4},"12":{"strokes":3},"13":{"strokes":4},"14":{"strokes":3},"15":{"strokes":4},"16":{"strokes":3},"17":{"strokes":3},"18":{"strokes":4}}'::jsonb,
   62, 56, NULL, 'completed', '2024-11-06 16:00:00'),
  ('44444444-b006-b006-b006-000000000006', '44444444-0001-0001-0001-000000000001', '74e84922-d5fc-4cdb-9835-251c31784309',
   '{"1":{"strokes":3},"2":{"strokes":4},"3":{"strokes":3},"4":{"strokes":4},"5":{"strokes":3},"6":{"strokes":4},"7":{"strokes":3},"8":{"strokes":4},"9":{"strokes":4},"10":{"strokes":3},"11":{"strokes":4},"12":{"strokes":3},"13":{"strokes":4},"14":{"strokes":3},"15":{"strokes":4},"16":{"strokes":3},"17":{"strokes":3},"18":{"strokes":4}}'::jsonb,
   62, 56, NULL, 'completed', '2024-11-06 16:00:00');

-- Round 2 Scorecards (Royal Melbourne) - Team The Eagles
INSERT INTO scorecards (id, round_id, player_id, scores, total_gross, total_net, total_points, status, submitted_at) VALUES
  ('44444444-b007-b007-b007-000000000007', '44444444-0002-0002-0002-000000000002', '41677ffc-f9c4-490b-bc39-1f7370b36c2b',
   '{"1":{"strokes":4},"2":{"strokes":3},"3":{"strokes":3},"4":{"strokes":4},"5":{"strokes":3},"6":{"strokes":4},"7":{"strokes":3},"8":{"strokes":4},"9":{"strokes":4},"10":{"strokes":4},"11":{"strokes":3},"12":{"strokes":3},"13":{"strokes":4},"14":{"strokes":4},"15":{"strokes":3},"16":{"strokes":3},"17":{"strokes":4},"18":{"strokes":4}}'::jsonb,
   63, 56, NULL, 'completed', '2024-11-13 16:00:00'),
  ('44444444-b008-b008-b008-000000000008', '44444444-0002-0002-0002-000000000002', 'ca7c2924-39e8-4b66-bbb8-d9699adb3d65',
   '{"1":{"strokes":4},"2":{"strokes":3},"3":{"strokes":3},"4":{"strokes":4},"5":{"strokes":3},"6":{"strokes":4},"7":{"strokes":3},"8":{"strokes":4},"9":{"strokes":4},"10":{"strokes":4},"11":{"strokes":3},"12":{"strokes":3},"13":{"strokes":4},"14":{"strokes":4},"15":{"strokes":3},"16":{"strokes":3},"17":{"strokes":4},"18":{"strokes":4}}'::jsonb,
   63, 56, NULL, 'completed', '2024-11-13 16:00:00'),
  ('44444444-b009-b009-b009-000000000009', '44444444-0002-0002-0002-000000000002', '7ef2ab5a-6577-4102-8e97-98d1fd58cfe4',
   '{"1":{"strokes":4},"2":{"strokes":3},"3":{"strokes":3},"4":{"strokes":4},"5":{"strokes":3},"6":{"strokes":4},"7":{"strokes":3},"8":{"strokes":4},"9":{"strokes":4},"10":{"strokes":4},"11":{"strokes":3},"12":{"strokes":3},"13":{"strokes":4},"14":{"strokes":4},"15":{"strokes":3},"16":{"strokes":3},"17":{"strokes":4},"18":{"strokes":4}}'::jsonb,
   63, 56, NULL, 'completed', '2024-11-13 16:00:00');

-- Round 2 Scorecards - Team The Birdies
INSERT INTO scorecards (id, round_id, player_id, scores, total_gross, total_net, total_points, status, submitted_at) VALUES
  ('44444444-b010-b010-b010-000000000010', '44444444-0002-0002-0002-000000000002', 'df045f29-718a-41b5-ac4a-9a8dbf26c6cb',
   '{"1":{"strokes":4},"2":{"strokes":4},"3":{"strokes":3},"4":{"strokes":4},"5":{"strokes":3},"6":{"strokes":4},"7":{"strokes":3},"8":{"strokes":4},"9":{"strokes":4},"10":{"strokes":4},"11":{"strokes":3},"12":{"strokes":3},"13":{"strokes":4},"14":{"strokes":4},"15":{"strokes":4},"16":{"strokes":3},"17":{"strokes":4},"18":{"strokes":4}}'::jsonb,
   64, 58, NULL, 'completed', '2024-11-13 16:00:00'),
  ('44444444-b011-b011-b011-000000000011', '44444444-0002-0002-0002-000000000002', '25c171c8-c087-4d4a-b3be-545acdfe3f11',
   '{"1":{"strokes":4},"2":{"strokes":4},"3":{"strokes":3},"4":{"strokes":4},"5":{"strokes":3},"6":{"strokes":4},"7":{"strokes":3},"8":{"strokes":4},"9":{"strokes":4},"10":{"strokes":4},"11":{"strokes":3},"12":{"strokes":3},"13":{"strokes":4},"14":{"strokes":4},"15":{"strokes":4},"16":{"strokes":3},"17":{"strokes":4},"18":{"strokes":4}}'::jsonb,
   64, 58, NULL, 'completed', '2024-11-13 16:00:00'),
  ('44444444-b012-b012-b012-000000000012', '44444444-0002-0002-0002-000000000002', '74e84922-d5fc-4cdb-9835-251c31784309',
   '{"1":{"strokes":4},"2":{"strokes":4},"3":{"strokes":3},"4":{"strokes":4},"5":{"strokes":3},"6":{"strokes":4},"7":{"strokes":3},"8":{"strokes":4},"9":{"strokes":4},"10":{"strokes":4},"11":{"strokes":3},"12":{"strokes":3},"13":{"strokes":4},"14":{"strokes":4},"15":{"strokes":4},"16":{"strokes":3},"17":{"strokes":4},"18":{"strokes":4}}'::jsonb,
   64, 58, NULL, 'completed', '2024-11-13 16:00:00');

-- Round 3 Scorecards (Eastern East/South) - Team The Eagles
INSERT INTO scorecards (id, round_id, player_id, scores, total_gross, total_net, total_points, status, submitted_at) VALUES
  ('44444444-b013-b013-b013-000000000013', '44444444-0003-0003-0003-000000000003', '41677ffc-f9c4-490b-bc39-1f7370b36c2b',
   '{"1":{"strokes":4},"2":{"strokes":4},"3":{"strokes":3},"4":{"strokes":5},"5":{"strokes":4},"6":{"strokes":4},"7":{"strokes":3},"8":{"strokes":4},"9":{"strokes":4},"10":{"strokes":4},"11":{"strokes":3},"12":{"strokes":3},"13":{"strokes":4},"14":{"strokes":4},"15":{"strokes":4},"16":{"strokes":3},"17":{"strokes":4},"18":{"strokes":4}}'::jsonb,
   66, 59, NULL, 'completed', '2024-11-20 16:00:00'),
  ('44444444-b014-b014-b014-000000000014', '44444444-0003-0003-0003-000000000003', 'ca7c2924-39e8-4b66-bbb8-d9699adb3d65',
   '{"1":{"strokes":4},"2":{"strokes":4},"3":{"strokes":3},"4":{"strokes":5},"5":{"strokes":4},"6":{"strokes":4},"7":{"strokes":3},"8":{"strokes":4},"9":{"strokes":4},"10":{"strokes":4},"11":{"strokes":3},"12":{"strokes":3},"13":{"strokes":4},"14":{"strokes":4},"15":{"strokes":4},"16":{"strokes":3},"17":{"strokes":4},"18":{"strokes":4}}'::jsonb,
   66, 59, NULL, 'completed', '2024-11-20 16:00:00'),
  ('44444444-b015-b015-b015-000000000015', '44444444-0003-0003-0003-000000000003', '7ef2ab5a-6577-4102-8e97-98d1fd58cfe4',
   '{"1":{"strokes":4},"2":{"strokes":4},"3":{"strokes":3},"4":{"strokes":5},"5":{"strokes":4},"6":{"strokes":4},"7":{"strokes":3},"8":{"strokes":4},"9":{"strokes":4},"10":{"strokes":4},"11":{"strokes":3},"12":{"strokes":3},"13":{"strokes":4},"14":{"strokes":4},"15":{"strokes":4},"16":{"strokes":3},"17":{"strokes":4},"18":{"strokes":4}}'::jsonb,
   66, 59, NULL, 'completed', '2024-11-20 16:00:00');

-- Round 3 Scorecards - Team The Birdies
INSERT INTO scorecards (id, round_id, player_id, scores, total_gross, total_net, total_points, status, submitted_at) VALUES
  ('44444444-b016-b016-b016-000000000016', '44444444-0003-0003-0003-000000000003', 'df045f29-718a-41b5-ac4a-9a8dbf26c6cb',
   '{"1":{"strokes":3},"2":{"strokes":4},"3":{"strokes":3},"4":{"strokes":4},"5":{"strokes":3},"6":{"strokes":4},"7":{"strokes":3},"8":{"strokes":3},"9":{"strokes":4},"10":{"strokes":3},"11":{"strokes":4},"12":{"strokes":3},"13":{"strokes":4},"14":{"strokes":3},"15":{"strokes":4},"16":{"strokes":3},"17":{"strokes":3},"18":{"strokes":3}}'::jsonb,
   61, 55, NULL, 'completed', '2024-11-20 16:00:00'),
  ('44444444-b017-b017-b017-000000000017', '44444444-0003-0003-0003-000000000003', '25c171c8-c087-4d4a-b3be-545acdfe3f11',
   '{"1":{"strokes":3},"2":{"strokes":4},"3":{"strokes":3},"4":{"strokes":4},"5":{"strokes":3},"6":{"strokes":4},"7":{"strokes":3},"8":{"strokes":3},"9":{"strokes":4},"10":{"strokes":3},"11":{"strokes":4},"12":{"strokes":3},"13":{"strokes":4},"14":{"strokes":3},"15":{"strokes":4},"16":{"strokes":3},"17":{"strokes":3},"18":{"strokes":3}}'::jsonb,
   61, 55, NULL, 'completed', '2024-11-20 16:00:00'),
  ('44444444-b018-b018-b018-000000000018', '44444444-0003-0003-0003-000000000003', '74e84922-d5fc-4cdb-9835-251c31784309',
   '{"1":{"strokes":3},"2":{"strokes":4},"3":{"strokes":3},"4":{"strokes":4},"5":{"strokes":3},"6":{"strokes":4},"7":{"strokes":3},"8":{"strokes":3},"9":{"strokes":4},"10":{"strokes":3},"11":{"strokes":4},"12":{"strokes":3},"13":{"strokes":4},"14":{"strokes":3},"15":{"strokes":4},"16":{"strokes":3},"17":{"strokes":3},"18":{"strokes":3}}'::jsonb,
   61, 55, NULL, 'completed', '2024-11-20 16:00:00');


-- =====================================================
-- COMPETITION 5: Mixed Format Masters
-- =====================================================
-- Per-round teams with alternating individual/team rounds (all upcoming)

INSERT INTO competitions (
  id, name, description, competition_type, start_date, end_date,
  handicap_system, organizer_id, status, invite_code,
  team_mode, team_size, point_system
) VALUES (
  '55555555-5555-5555-5555-555555555555',
  'Mixed Format Masters',
  'Ultimate test - alternating individual and team rounds with varying formats!',
  'event',
  '2025-04-01',
  '2025-04-30',
  'honor',
  '7ef2ab5a-6577-4102-8e97-98d1fd58cfe4',
  'upcoming',
  'MIXED-01',
  'per-round',
  2,
  '{"type": "position", "rules": {"1": 12, "2": 9, "3": 7, "4": 5, "5": 3, "default": 1}, "matchPlay": {"win": 5, "draw": 2, "loss": 0}}'
);

-- Add 6 players
INSERT INTO competition_players (competition_id, player_id, status) VALUES
  ('55555555-5555-5555-5555-555555555555', '41677ffc-f9c4-490b-bc39-1f7370b36c2b', 'accepted'),
  ('55555555-5555-5555-5555-555555555555', 'ca7c2924-39e8-4b66-bbb8-d9699adb3d65', 'accepted'),
  ('55555555-5555-5555-5555-555555555555', '7ef2ab5a-6577-4102-8e97-98d1fd58cfe4', 'accepted'),
  ('55555555-5555-5555-5555-555555555555', 'df045f29-718a-41b5-ac4a-9a8dbf26c6cb', 'accepted'),
  ('55555555-5555-5555-5555-555555555555', '25c171c8-c087-4d4a-b3be-545acdfe3f11', 'accepted'),
  ('55555555-5555-5555-5555-555555555555', '74e84922-d5fc-4cdb-9835-251c31784309', 'accepted');

-- Round 1: Individual Stableford - Upcoming
INSERT INTO rounds (id, competition_id, round_number, course_id, date, game_type, status, is_team_round, team_format) VALUES
  ('55555555-0001-0001-0001-000000000001', '55555555-5555-5555-5555-555555555555', 1, 'c0000001-0000-0000-0000-000000000001', '2025-04-05', 'stableford', 'upcoming', FALSE, NULL);

-- Round 2: Team Best Ball - Upcoming
INSERT INTO rounds (id, competition_id, round_number, course_id, date, game_type, status, is_team_round, team_format) VALUES
  ('55555555-0002-0002-0002-000000000002', '55555555-5555-5555-5555-555555555555', 2, 'c0000005-0000-0000-0000-000000000005', '2025-04-12', 'stableford', 'upcoming', TRUE, 'best-ball');

-- Round 3: Individual Match Play - Upcoming
INSERT INTO rounds (id, competition_id, round_number, course_id, date, game_type, status, is_team_round, team_format) VALUES
  ('55555555-0003-0003-0003-000000000003', '55555555-5555-5555-5555-555555555555', 3, 'c0000004-0000-0000-0000-000000000004', '2025-04-19', 'match-play', 'upcoming', FALSE, NULL);

-- Round 4: Team Scramble - Upcoming
INSERT INTO rounds (id, competition_id, round_number, course_id, date, game_type, status, is_team_round, team_format) VALUES
  ('55555555-0004-0004-0004-000000000004', '55555555-5555-5555-5555-555555555555', 4, 'c0000006-0000-0000-0000-000000000006', '2025-04-26', 'stroke', 'upcoming', TRUE, 'scramble');


-- =====================================================
-- COMPETITION 6: Weekend Warriors League
-- =====================================================
-- Individual stableford, fully completed with 6 rounds (5 players)

INSERT INTO competitions (
  id, name, description, competition_type, start_date, end_date,
  handicap_system, organizer_id, status, invite_code,
  team_mode, team_size, point_system
) VALUES (
  '66666666-6666-6666-6666-666666666666',
  'Weekend Warriors League',
  'A full season of weekend golf - completed league with full results!',
  'event',
  '2024-09-01',
  '2024-10-15',
  'honor',
  'ca7c2924-39e8-4b66-bbb8-d9699adb3d65',
  'completed',
  'WARRIORS',
  'none',
  NULL,
  '{"type": "position", "rules": {"1": 10, "2": 8, "3": 6, "4": 4, "5": 2, "default": 1}, "matchPlay": {"win": 3, "draw": 1, "loss": 0}}'
);

-- Add 5 players
INSERT INTO competition_players (competition_id, player_id, status) VALUES
  ('66666666-6666-6666-6666-666666666666', '41677ffc-f9c4-490b-bc39-1f7370b36c2b', 'accepted'),
  ('66666666-6666-6666-6666-666666666666', 'ca7c2924-39e8-4b66-bbb8-d9699adb3d65', 'accepted'),
  ('66666666-6666-6666-6666-666666666666', '7ef2ab5a-6577-4102-8e97-98d1fd58cfe4', 'accepted'),
  ('66666666-6666-6666-6666-666666666666', 'df045f29-718a-41b5-ac4a-9a8dbf26c6cb', 'accepted'),
  ('66666666-6666-6666-6666-666666666666', '25c171c8-c087-4d4a-b3be-545acdfe3f11', 'accepted');

-- 6 Rounds - All Completed
INSERT INTO rounds (id, competition_id, round_number, course_id, date, game_type, status, is_team_round, team_format) VALUES
  ('66666666-0001-0001-0001-000000000001', '66666666-6666-6666-6666-666666666666', 1, 'c0000001-0000-0000-0000-000000000001', '2024-09-07', 'stableford', 'completed', FALSE, NULL),
  ('66666666-0002-0002-0002-000000000002', '66666666-6666-6666-6666-666666666666', 2, 'c0000002-0000-0000-0000-000000000002', '2024-09-14', 'stableford', 'completed', FALSE, NULL),
  ('66666666-0003-0003-0003-000000000003', '66666666-6666-6666-6666-666666666666', 3, 'c0000003-0000-0000-0000-000000000003', '2024-09-21', 'stableford', 'completed', FALSE, NULL),
  ('66666666-0004-0004-0004-000000000004', '66666666-6666-6666-6666-666666666666', 4, 'c0000004-0000-0000-0000-000000000004', '2024-09-28', 'stableford', 'completed', FALSE, NULL),
  ('66666666-0005-0005-0005-000000000005', '66666666-6666-6666-6666-666666666666', 5, 'c0000005-0000-0000-0000-000000000005', '2024-10-05', 'stableford', 'completed', FALSE, NULL),
  ('66666666-0006-0006-0006-000000000006', '66666666-6666-6666-6666-666666666666', 6, 'c0000006-0000-0000-0000-000000000006', '2024-10-12', 'stableford', 'completed', FALSE, NULL);

-- Round Results for all 6 rounds (5 players each)
-- Note: raw_result_data uses snake_case keys to match RoundResultData type
-- Round 1
INSERT INTO round_results (id, round_id, player_id, raw_score, raw_result_data, position, competition_points, is_team_result) VALUES
  ('66666666-cc01-cc01-cc01-000000000001', '66666666-0001-0001-0001-000000000001', 'df045f29-718a-41b5-ac4a-9a8dbf26c6cb', 40, '{"stableford_points": 40}'::jsonb, 1, 10, FALSE),
  ('66666666-cc02-cc02-cc02-000000000002', '66666666-0001-0001-0001-000000000001', '41677ffc-f9c4-490b-bc39-1f7370b36c2b', 37, '{"stableford_points": 37}'::jsonb, 2, 8, FALSE),
  ('66666666-cc03-cc03-cc03-000000000003', '66666666-0001-0001-0001-000000000001', '25c171c8-c087-4d4a-b3be-545acdfe3f11', 36, '{"stableford_points": 36}'::jsonb, 3, 6, FALSE),
  ('66666666-cc04-cc04-cc04-000000000004', '66666666-0001-0001-0001-000000000001', 'ca7c2924-39e8-4b66-bbb8-d9699adb3d65', 34, '{"stableford_points": 34}'::jsonb, 4, 4, FALSE),
  ('66666666-cc05-cc05-cc05-000000000005', '66666666-0001-0001-0001-000000000001', '7ef2ab5a-6577-4102-8e97-98d1fd58cfe4', 32, '{"stableford_points": 32}'::jsonb, 5, 2, FALSE);

-- Round 2
INSERT INTO round_results (id, round_id, player_id, raw_score, raw_result_data, position, competition_points, is_team_result) VALUES
  ('66666666-cc06-cc06-cc06-000000000006', '66666666-0002-0002-0002-000000000002', '41677ffc-f9c4-490b-bc39-1f7370b36c2b', 39, '{"stableford_points": 39}'::jsonb, 1, 10, FALSE),
  ('66666666-cc07-cc07-cc07-000000000007', '66666666-0002-0002-0002-000000000002', 'df045f29-718a-41b5-ac4a-9a8dbf26c6cb', 38, '{"stableford_points": 38}'::jsonb, 2, 8, FALSE),
  ('66666666-cc08-cc08-cc08-000000000008', '66666666-0002-0002-0002-000000000002', 'ca7c2924-39e8-4b66-bbb8-d9699adb3d65', 36, '{"stableford_points": 36}'::jsonb, 3, 6, FALSE),
  ('66666666-cc09-cc09-cc09-000000000009', '66666666-0002-0002-0002-000000000002', '25c171c8-c087-4d4a-b3be-545acdfe3f11', 35, '{"stableford_points": 35}'::jsonb, 4, 4, FALSE),
  ('66666666-cc10-cc10-cc10-000000000010', '66666666-0002-0002-0002-000000000002', '7ef2ab5a-6577-4102-8e97-98d1fd58cfe4', 33, '{"stableford_points": 33}'::jsonb, 5, 2, FALSE);

-- Round 3
INSERT INTO round_results (id, round_id, player_id, raw_score, raw_result_data, position, competition_points, is_team_result) VALUES
  ('66666666-cc11-cc11-cc11-000000000011', '66666666-0003-0003-0003-000000000003', '25c171c8-c087-4d4a-b3be-545acdfe3f11', 41, '{"stableford_points": 41}'::jsonb, 1, 10, FALSE),
  ('66666666-cc12-cc12-cc12-000000000012', '66666666-0003-0003-0003-000000000003', 'df045f29-718a-41b5-ac4a-9a8dbf26c6cb', 39, '{"stableford_points": 39}'::jsonb, 2, 8, FALSE),
  ('66666666-cc13-cc13-cc13-000000000013', '66666666-0003-0003-0003-000000000003', '41677ffc-f9c4-490b-bc39-1f7370b36c2b', 37, '{"stableford_points": 37}'::jsonb, 3, 6, FALSE),
  ('66666666-cc14-cc14-cc14-000000000014', '66666666-0003-0003-0003-000000000003', '7ef2ab5a-6577-4102-8e97-98d1fd58cfe4', 35, '{"stableford_points": 35}'::jsonb, 4, 4, FALSE),
  ('66666666-cc15-cc15-cc15-000000000015', '66666666-0003-0003-0003-000000000003', 'ca7c2924-39e8-4b66-bbb8-d9699adb3d65', 33, '{"stableford_points": 33}'::jsonb, 5, 2, FALSE);

-- Round 4
INSERT INTO round_results (id, round_id, player_id, raw_score, raw_result_data, position, competition_points, is_team_result) VALUES
  ('66666666-cc16-cc16-cc16-000000000016', '66666666-0004-0004-0004-000000000004', 'df045f29-718a-41b5-ac4a-9a8dbf26c6cb', 42, '{"stableford_points": 42}'::jsonb, 1, 10, FALSE),
  ('66666666-cc17-cc17-cc17-000000000017', '66666666-0004-0004-0004-000000000004', 'ca7c2924-39e8-4b66-bbb8-d9699adb3d65', 38, '{"stableford_points": 38}'::jsonb, 2, 8, FALSE),
  ('66666666-cc18-cc18-cc18-000000000018', '66666666-0004-0004-0004-000000000004', '41677ffc-f9c4-490b-bc39-1f7370b36c2b', 36, '{"stableford_points": 36}'::jsonb, 3, 6, FALSE),
  ('66666666-cc19-cc19-cc19-000000000019', '66666666-0004-0004-0004-000000000004', '25c171c8-c087-4d4a-b3be-545acdfe3f11', 34, '{"stableford_points": 34}'::jsonb, 4, 4, FALSE),
  ('66666666-cc20-cc20-cc20-000000000020', '66666666-0004-0004-0004-000000000004', '7ef2ab5a-6577-4102-8e97-98d1fd58cfe4', 31, '{"stableford_points": 31}'::jsonb, 5, 2, FALSE);

-- Round 5
INSERT INTO round_results (id, round_id, player_id, raw_score, raw_result_data, position, competition_points, is_team_result) VALUES
  ('66666666-cc21-cc21-cc21-000000000021', '66666666-0005-0005-0005-000000000005', '41677ffc-f9c4-490b-bc39-1f7370b36c2b', 40, '{"stableford_points": 40}'::jsonb, 1, 10, FALSE),
  ('66666666-cc22-cc22-cc22-000000000022', '66666666-0005-0005-0005-000000000005', '25c171c8-c087-4d4a-b3be-545acdfe3f11', 38, '{"stableford_points": 38}'::jsonb, 2, 8, FALSE),
  ('66666666-cc23-cc23-cc23-000000000023', '66666666-0005-0005-0005-000000000005', 'df045f29-718a-41b5-ac4a-9a8dbf26c6cb', 37, '{"stableford_points": 37}'::jsonb, 3, 6, FALSE),
  ('66666666-cc24-cc24-cc24-000000000024', '66666666-0005-0005-0005-000000000005', 'ca7c2924-39e8-4b66-bbb8-d9699adb3d65', 35, '{"stableford_points": 35}'::jsonb, 4, 4, FALSE),
  ('66666666-cc25-cc25-cc25-000000000025', '66666666-0005-0005-0005-000000000005', '7ef2ab5a-6577-4102-8e97-98d1fd58cfe4', 32, '{"stableford_points": 32}'::jsonb, 5, 2, FALSE);

-- Round 6
INSERT INTO round_results (id, round_id, player_id, raw_score, raw_result_data, position, competition_points, is_team_result) VALUES
  ('66666666-cc26-cc26-cc26-000000000026', '66666666-0006-0006-0006-000000000006', 'df045f29-718a-41b5-ac4a-9a8dbf26c6cb', 41, '{"stableford_points": 41}'::jsonb, 1, 10, FALSE),
  ('66666666-cc27-cc27-cc27-000000000027', '66666666-0006-0006-0006-000000000006', '41677ffc-f9c4-490b-bc39-1f7370b36c2b', 39, '{"stableford_points": 39}'::jsonb, 2, 8, FALSE),
  ('66666666-cc28-cc28-cc28-000000000028', '66666666-0006-0006-0006-000000000006', '25c171c8-c087-4d4a-b3be-545acdfe3f11', 37, '{"stableford_points": 37}'::jsonb, 3, 6, FALSE),
  ('66666666-cc29-cc29-cc29-000000000029', '66666666-0006-0006-0006-000000000006', 'ca7c2924-39e8-4b66-bbb8-d9699adb3d65', 34, '{"stableford_points": 34}'::jsonb, 4, 4, FALSE),
  ('66666666-cc30-cc30-cc30-000000000030', '66666666-0006-0006-0006-000000000006', '7ef2ab5a-6577-4102-8e97-98d1fd58cfe4', 30, '{"stableford_points": 30}'::jsonb, 5, 2, FALSE);

-- =====================================================
-- WEEKEND WARRIORS LEAGUE - PAIRINGS
-- =====================================================
-- 5 players split into a 3-some and a 2-some for each round

-- Pairings for Round 1 (Kingston Heath)
INSERT INTO pairings (id, round_id, player_ids) VALUES
  ('66666666-a001-a001-a001-000000000001', '66666666-0001-0001-0001-000000000001',
   ARRAY['41677ffc-f9c4-490b-bc39-1f7370b36c2b', 'ca7c2924-39e8-4b66-bbb8-d9699adb3d65', 'df045f29-718a-41b5-ac4a-9a8dbf26c6cb']::uuid[]),
  ('66666666-a002-a002-a002-000000000002', '66666666-0001-0001-0001-000000000001',
   ARRAY['7ef2ab5a-6577-4102-8e97-98d1fd58cfe4', '25c171c8-c087-4d4a-b3be-545acdfe3f11']::uuid[]);

-- Pairings for Round 2 (Royal Melbourne)
INSERT INTO pairings (id, round_id, player_ids) VALUES
  ('66666666-a003-a003-a003-000000000003', '66666666-0002-0002-0002-000000000002',
   ARRAY['df045f29-718a-41b5-ac4a-9a8dbf26c6cb', '25c171c8-c087-4d4a-b3be-545acdfe3f11', 'ca7c2924-39e8-4b66-bbb8-d9699adb3d65']::uuid[]),
  ('66666666-a004-a004-a004-000000000004', '66666666-0002-0002-0002-000000000002',
   ARRAY['41677ffc-f9c4-490b-bc39-1f7370b36c2b', '7ef2ab5a-6577-4102-8e97-98d1fd58cfe4']::uuid[]);

-- Pairings for Round 3 (Victoria GC)
INSERT INTO pairings (id, round_id, player_ids) VALUES
  ('66666666-a005-a005-a005-000000000005', '66666666-0003-0003-0003-000000000003',
   ARRAY['25c171c8-c087-4d4a-b3be-545acdfe3f11', '41677ffc-f9c4-490b-bc39-1f7370b36c2b', '7ef2ab5a-6577-4102-8e97-98d1fd58cfe4']::uuid[]),
  ('66666666-a006-a006-a006-000000000006', '66666666-0003-0003-0003-000000000003',
   ARRAY['df045f29-718a-41b5-ac4a-9a8dbf26c6cb', 'ca7c2924-39e8-4b66-bbb8-d9699adb3d65']::uuid[]);

-- Pairings for Round 4 (The Australian)
INSERT INTO pairings (id, round_id, player_ids) VALUES
  ('66666666-a007-a007-a007-000000000007', '66666666-0004-0004-0004-000000000004',
   ARRAY['ca7c2924-39e8-4b66-bbb8-d9699adb3d65', 'df045f29-718a-41b5-ac4a-9a8dbf26c6cb', '25c171c8-c087-4d4a-b3be-545acdfe3f11']::uuid[]),
  ('66666666-a008-a008-a008-000000000008', '66666666-0004-0004-0004-000000000004',
   ARRAY['41677ffc-f9c4-490b-bc39-1f7370b36c2b', '7ef2ab5a-6577-4102-8e97-98d1fd58cfe4']::uuid[]);

-- Pairings for Round 5 (Royal Adelaide)
INSERT INTO pairings (id, round_id, player_ids) VALUES
  ('66666666-a009-a009-a009-000000000009', '66666666-0005-0005-0005-000000000005',
   ARRAY['41677ffc-f9c4-490b-bc39-1f7370b36c2b', '25c171c8-c087-4d4a-b3be-545acdfe3f11', 'df045f29-718a-41b5-ac4a-9a8dbf26c6cb']::uuid[]),
  ('66666666-a010-a010-a010-000000000010', '66666666-0005-0005-0005-000000000005',
   ARRAY['ca7c2924-39e8-4b66-bbb8-d9699adb3d65', '7ef2ab5a-6577-4102-8e97-98d1fd58cfe4']::uuid[]);

-- Pairings for Round 6 (The Dunes)
INSERT INTO pairings (id, round_id, player_ids) VALUES
  ('66666666-a011-a011-a011-000000000011', '66666666-0006-0006-0006-000000000006',
   ARRAY['df045f29-718a-41b5-ac4a-9a8dbf26c6cb', '41677ffc-f9c4-490b-bc39-1f7370b36c2b', 'ca7c2924-39e8-4b66-bbb8-d9699adb3d65']::uuid[]),
  ('66666666-a012-a012-a012-000000000012', '66666666-0006-0006-0006-000000000006',
   ARRAY['25c171c8-c087-4d4a-b3be-545acdfe3f11', '7ef2ab5a-6577-4102-8e97-98d1fd58cfe4']::uuid[]);

-- =====================================================
-- WEEKEND WARRIORS LEAGUE - SCORECARDS
-- =====================================================
-- Full hole-by-hole scores for all 6 rounds, 5 players each

-- Round 1 Scorecards (Kingston Heath)
INSERT INTO scorecards (id, round_id, player_id, scores, total_gross, total_net, total_points, status, submitted_at) VALUES
  ('66666666-b001-b001-b001-000000000001', '66666666-0001-0001-0001-000000000001', 'df045f29-718a-41b5-ac4a-9a8dbf26c6cb',
   '{"1":{"strokes":4},"2":{"strokes":4},"3":{"strokes":3},"4":{"strokes":5},"5":{"strokes":4},"6":{"strokes":4},"7":{"strokes":2},"8":{"strokes":4},"9":{"strokes":5},"10":{"strokes":4},"11":{"strokes":4},"12":{"strokes":3},"13":{"strokes":5},"14":{"strokes":4},"15":{"strokes":4},"16":{"strokes":3},"17":{"strokes":4},"18":{"strokes":4}}'::jsonb,
   70, 62, 40, 'completed', '2024-09-07 16:00:00'),
  ('66666666-b002-b002-b002-000000000002', '66666666-0001-0001-0001-000000000001', '41677ffc-f9c4-490b-bc39-1f7370b36c2b',
   '{"1":{"strokes":5},"2":{"strokes":4},"3":{"strokes":3},"4":{"strokes":5},"5":{"strokes":4},"6":{"strokes":4},"7":{"strokes":3},"8":{"strokes":5},"9":{"strokes":5},"10":{"strokes":4},"11":{"strokes":4},"12":{"strokes":3},"13":{"strokes":5},"14":{"strokes":4},"15":{"strokes":4},"16":{"strokes":3},"17":{"strokes":5},"18":{"strokes":5}}'::jsonb,
   75, 63, 37, 'completed', '2024-09-07 16:00:00'),
  ('66666666-b003-b003-b003-000000000003', '66666666-0001-0001-0001-000000000001', '25c171c8-c087-4d4a-b3be-545acdfe3f11',
   '{"1":{"strokes":5},"2":{"strokes":5},"3":{"strokes":3},"4":{"strokes":5},"5":{"strokes":4},"6":{"strokes":4},"7":{"strokes":3},"8":{"strokes":5},"9":{"strokes":5},"10":{"strokes":4},"11":{"strokes":5},"12":{"strokes":3},"13":{"strokes":5},"14":{"strokes":5},"15":{"strokes":4},"16":{"strokes":3},"17":{"strokes":5},"18":{"strokes":5}}'::jsonb,
   78, 63, 36, 'completed', '2024-09-07 16:00:00'),
  ('66666666-b004-b004-b004-000000000004', '66666666-0001-0001-0001-000000000001', 'ca7c2924-39e8-4b66-bbb8-d9699adb3d65',
   '{"1":{"strokes":5},"2":{"strokes":5},"3":{"strokes":4},"4":{"strokes":6},"5":{"strokes":5},"6":{"strokes":5},"7":{"strokes":3},"8":{"strokes":5},"9":{"strokes":5},"10":{"strokes":5},"11":{"strokes":5},"12":{"strokes":3},"13":{"strokes":6},"14":{"strokes":5},"15":{"strokes":4},"16":{"strokes":3},"17":{"strokes":5},"18":{"strokes":5}}'::jsonb,
   84, 66, 34, 'completed', '2024-09-07 16:00:00'),
  ('66666666-b005-b005-b005-000000000005', '66666666-0001-0001-0001-000000000001', '7ef2ab5a-6577-4102-8e97-98d1fd58cfe4',
   '{"1":{"strokes":6},"2":{"strokes":5},"3":{"strokes":4},"4":{"strokes":6},"5":{"strokes":5},"6":{"strokes":5},"7":{"strokes":4},"8":{"strokes":6},"9":{"strokes":6},"10":{"strokes":5},"11":{"strokes":5},"12":{"strokes":4},"13":{"strokes":6},"14":{"strokes":5},"15":{"strokes":5},"16":{"strokes":4},"17":{"strokes":5},"18":{"strokes":6}}'::jsonb,
   92, 68, 32, 'completed', '2024-09-07 16:00:00');

-- Round 2 Scorecards (Royal Melbourne)
INSERT INTO scorecards (id, round_id, player_id, scores, total_gross, total_net, total_points, status, submitted_at) VALUES
  ('66666666-b006-b006-b006-000000000006', '66666666-0002-0002-0002-000000000002', '41677ffc-f9c4-490b-bc39-1f7370b36c2b',
   '{"1":{"strokes":4},"2":{"strokes":4},"3":{"strokes":3},"4":{"strokes":5},"5":{"strokes":4},"6":{"strokes":4},"7":{"strokes":3},"8":{"strokes":4},"9":{"strokes":5},"10":{"strokes":4},"11":{"strokes":4},"12":{"strokes":3},"13":{"strokes":5},"14":{"strokes":4},"15":{"strokes":4},"16":{"strokes":3},"17":{"strokes":4},"18":{"strokes":4}}'::jsonb,
   71, 59, 39, 'completed', '2024-09-14 16:00:00'),
  ('66666666-b007-b007-b007-000000000007', '66666666-0002-0002-0002-000000000002', 'df045f29-718a-41b5-ac4a-9a8dbf26c6cb',
   '{"1":{"strokes":4},"2":{"strokes":4},"3":{"strokes":3},"4":{"strokes":5},"5":{"strokes":4},"6":{"strokes":4},"7":{"strokes":3},"8":{"strokes":4},"9":{"strokes":5},"10":{"strokes":4},"11":{"strokes":4},"12":{"strokes":3},"13":{"strokes":5},"14":{"strokes":4},"15":{"strokes":5},"16":{"strokes":3},"17":{"strokes":4},"18":{"strokes":5}}'::jsonb,
   73, 65, 38, 'completed', '2024-09-14 16:00:00'),
  ('66666666-b008-b008-b008-000000000008', '66666666-0002-0002-0002-000000000002', 'ca7c2924-39e8-4b66-bbb8-d9699adb3d65',
   '{"1":{"strokes":5},"2":{"strokes":5},"3":{"strokes":3},"4":{"strokes":5},"5":{"strokes":4},"6":{"strokes":4},"7":{"strokes":3},"8":{"strokes":5},"9":{"strokes":5},"10":{"strokes":5},"11":{"strokes":5},"12":{"strokes":3},"13":{"strokes":5},"14":{"strokes":5},"15":{"strokes":4},"16":{"strokes":3},"17":{"strokes":5},"18":{"strokes":5}}'::jsonb,
   79, 61, 36, 'completed', '2024-09-14 16:00:00'),
  ('66666666-b009-b009-b009-000000000009', '66666666-0002-0002-0002-000000000002', '25c171c8-c087-4d4a-b3be-545acdfe3f11',
   '{"1":{"strokes":5},"2":{"strokes":5},"3":{"strokes":3},"4":{"strokes":5},"5":{"strokes":4},"6":{"strokes":5},"7":{"strokes":3},"8":{"strokes":5},"9":{"strokes":5},"10":{"strokes":5},"11":{"strokes":5},"12":{"strokes":3},"13":{"strokes":5},"14":{"strokes":5},"15":{"strokes":4},"16":{"strokes":4},"17":{"strokes":5},"18":{"strokes":5}}'::jsonb,
   81, 66, 35, 'completed', '2024-09-14 16:00:00'),
  ('66666666-b010-b010-b010-000000000010', '66666666-0002-0002-0002-000000000002', '7ef2ab5a-6577-4102-8e97-98d1fd58cfe4',
   '{"1":{"strokes":6},"2":{"strokes":5},"3":{"strokes":4},"4":{"strokes":6},"5":{"strokes":5},"6":{"strokes":5},"7":{"strokes":4},"8":{"strokes":5},"9":{"strokes":6},"10":{"strokes":5},"11":{"strokes":6},"12":{"strokes":4},"13":{"strokes":6},"14":{"strokes":5},"15":{"strokes":5},"16":{"strokes":4},"17":{"strokes":5},"18":{"strokes":6}}'::jsonb,
   92, 68, 33, 'completed', '2024-09-14 16:00:00');

-- Round 3 Scorecards (Victoria GC)
INSERT INTO scorecards (id, round_id, player_id, scores, total_gross, total_net, total_points, status, submitted_at) VALUES
  ('66666666-b011-b011-b011-000000000011', '66666666-0003-0003-0003-000000000003', '25c171c8-c087-4d4a-b3be-545acdfe3f11',
   '{"1":{"strokes":4},"2":{"strokes":4},"3":{"strokes":3},"4":{"strokes":5},"5":{"strokes":4},"6":{"strokes":4},"7":{"strokes":3},"8":{"strokes":4},"9":{"strokes":5},"10":{"strokes":4},"11":{"strokes":4},"12":{"strokes":3},"13":{"strokes":5},"14":{"strokes":4},"15":{"strokes":4},"16":{"strokes":3},"17":{"strokes":4},"18":{"strokes":5}}'::jsonb,
   72, 57, 41, 'completed', '2024-09-21 16:00:00'),
  ('66666666-b012-b012-b012-000000000012', '66666666-0003-0003-0003-000000000003', 'df045f29-718a-41b5-ac4a-9a8dbf26c6cb',
   '{"1":{"strokes":4},"2":{"strokes":4},"3":{"strokes":3},"4":{"strokes":5},"5":{"strokes":4},"6":{"strokes":4},"7":{"strokes":3},"8":{"strokes":4},"9":{"strokes":5},"10":{"strokes":4},"11":{"strokes":4},"12":{"strokes":3},"13":{"strokes":5},"14":{"strokes":4},"15":{"strokes":4},"16":{"strokes":3},"17":{"strokes":5},"18":{"strokes":5}}'::jsonb,
   73, 65, 39, 'completed', '2024-09-21 16:00:00'),
  ('66666666-b013-b013-b013-000000000013', '66666666-0003-0003-0003-000000000003', '41677ffc-f9c4-490b-bc39-1f7370b36c2b',
   '{"1":{"strokes":5},"2":{"strokes":4},"3":{"strokes":3},"4":{"strokes":5},"5":{"strokes":4},"6":{"strokes":4},"7":{"strokes":3},"8":{"strokes":5},"9":{"strokes":5},"10":{"strokes":4},"11":{"strokes":5},"12":{"strokes":3},"13":{"strokes":5},"14":{"strokes":4},"15":{"strokes":4},"16":{"strokes":3},"17":{"strokes":5},"18":{"strokes":5}}'::jsonb,
   76, 64, 37, 'completed', '2024-09-21 16:00:00'),
  ('66666666-b014-b014-b014-000000000014', '66666666-0003-0003-0003-000000000003', '7ef2ab5a-6577-4102-8e97-98d1fd58cfe4',
   '{"1":{"strokes":5},"2":{"strokes":5},"3":{"strokes":4},"4":{"strokes":6},"5":{"strokes":5},"6":{"strokes":5},"7":{"strokes":4},"8":{"strokes":5},"9":{"strokes":5},"10":{"strokes":5},"11":{"strokes":5},"12":{"strokes":4},"13":{"strokes":6},"14":{"strokes":5},"15":{"strokes":5},"16":{"strokes":4},"17":{"strokes":5},"18":{"strokes":5}}'::jsonb,
   88, 64, 35, 'completed', '2024-09-21 16:00:00'),
  ('66666666-b015-b015-b015-000000000015', '66666666-0003-0003-0003-000000000003', 'ca7c2924-39e8-4b66-bbb8-d9699adb3d65',
   '{"1":{"strokes":5},"2":{"strokes":5},"3":{"strokes":4},"4":{"strokes":6},"5":{"strokes":5},"6":{"strokes":5},"7":{"strokes":4},"8":{"strokes":5},"9":{"strokes":5},"10":{"strokes":5},"11":{"strokes":5},"12":{"strokes":4},"13":{"strokes":6},"14":{"strokes":5},"15":{"strokes":5},"16":{"strokes":4},"17":{"strokes":5},"18":{"strokes":6}}'::jsonb,
   89, 71, 33, 'completed', '2024-09-21 16:00:00');

-- Round 4 Scorecards (The Australian)
INSERT INTO scorecards (id, round_id, player_id, scores, total_gross, total_net, total_points, status, submitted_at) VALUES
  ('66666666-b016-b016-b016-000000000016', '66666666-0004-0004-0004-000000000004', 'df045f29-718a-41b5-ac4a-9a8dbf26c6cb',
   '{"1":{"strokes":4},"2":{"strokes":4},"3":{"strokes":2},"4":{"strokes":5},"5":{"strokes":4},"6":{"strokes":4},"7":{"strokes":3},"8":{"strokes":4},"9":{"strokes":4},"10":{"strokes":4},"11":{"strokes":4},"12":{"strokes":3},"13":{"strokes":4},"14":{"strokes":4},"15":{"strokes":4},"16":{"strokes":3},"17":{"strokes":4},"18":{"strokes":4}}'::jsonb,
   68, 60, 42, 'completed', '2024-09-28 16:00:00'),
  ('66666666-b017-b017-b017-000000000017', '66666666-0004-0004-0004-000000000004', 'ca7c2924-39e8-4b66-bbb8-d9699adb3d65',
   '{"1":{"strokes":5},"2":{"strokes":5},"3":{"strokes":3},"4":{"strokes":5},"5":{"strokes":4},"6":{"strokes":4},"7":{"strokes":3},"8":{"strokes":5},"9":{"strokes":5},"10":{"strokes":4},"11":{"strokes":5},"12":{"strokes":3},"13":{"strokes":5},"14":{"strokes":5},"15":{"strokes":4},"16":{"strokes":3},"17":{"strokes":5},"18":{"strokes":5}}'::jsonb,
   78, 60, 38, 'completed', '2024-09-28 16:00:00'),
  ('66666666-b018-b018-b018-000000000018', '66666666-0004-0004-0004-000000000004', '41677ffc-f9c4-490b-bc39-1f7370b36c2b',
   '{"1":{"strokes":5},"2":{"strokes":4},"3":{"strokes":3},"4":{"strokes":5},"5":{"strokes":5},"6":{"strokes":4},"7":{"strokes":3},"8":{"strokes":5},"9":{"strokes":5},"10":{"strokes":4},"11":{"strokes":5},"12":{"strokes":3},"13":{"strokes":5},"14":{"strokes":5},"15":{"strokes":4},"16":{"strokes":3},"17":{"strokes":5},"18":{"strokes":5}}'::jsonb,
   78, 66, 36, 'completed', '2024-09-28 16:00:00'),
  ('66666666-b019-b019-b019-000000000019', '66666666-0004-0004-0004-000000000004', '25c171c8-c087-4d4a-b3be-545acdfe3f11',
   '{"1":{"strokes":5},"2":{"strokes":5},"3":{"strokes":3},"4":{"strokes":5},"5":{"strokes":5},"6":{"strokes":5},"7":{"strokes":3},"8":{"strokes":5},"9":{"strokes":5},"10":{"strokes":5},"11":{"strokes":5},"12":{"strokes":3},"13":{"strokes":5},"14":{"strokes":5},"15":{"strokes":5},"16":{"strokes":4},"17":{"strokes":5},"18":{"strokes":5}}'::jsonb,
   83, 68, 34, 'completed', '2024-09-28 16:00:00'),
  ('66666666-b020-b020-b020-000000000020', '66666666-0004-0004-0004-000000000004', '7ef2ab5a-6577-4102-8e97-98d1fd58cfe4',
   '{"1":{"strokes":6},"2":{"strokes":6},"3":{"strokes":4},"4":{"strokes":6},"5":{"strokes":5},"6":{"strokes":5},"7":{"strokes":4},"8":{"strokes":6},"9":{"strokes":6},"10":{"strokes":5},"11":{"strokes":6},"12":{"strokes":4},"13":{"strokes":6},"14":{"strokes":6},"15":{"strokes":5},"16":{"strokes":4},"17":{"strokes":6},"18":{"strokes":6}}'::jsonb,
   96, 72, 31, 'completed', '2024-09-28 16:00:00');

-- Round 5 Scorecards (Royal Adelaide)
INSERT INTO scorecards (id, round_id, player_id, scores, total_gross, total_net, total_points, status, submitted_at) VALUES
  ('66666666-b021-b021-b021-000000000021', '66666666-0005-0005-0005-000000000005', '41677ffc-f9c4-490b-bc39-1f7370b36c2b',
   '{"1":{"strokes":4},"2":{"strokes":4},"3":{"strokes":3},"4":{"strokes":5},"5":{"strokes":4},"6":{"strokes":4},"7":{"strokes":3},"8":{"strokes":4},"9":{"strokes":5},"10":{"strokes":4},"11":{"strokes":4},"12":{"strokes":3},"13":{"strokes":5},"14":{"strokes":4},"15":{"strokes":4},"16":{"strokes":3},"17":{"strokes":4},"18":{"strokes":4}}'::jsonb,
   71, 59, 40, 'completed', '2024-10-05 16:00:00'),
  ('66666666-b022-b022-b022-000000000022', '66666666-0005-0005-0005-000000000005', '25c171c8-c087-4d4a-b3be-545acdfe3f11',
   '{"1":{"strokes":4},"2":{"strokes":5},"3":{"strokes":3},"4":{"strokes":5},"5":{"strokes":4},"6":{"strokes":4},"7":{"strokes":3},"8":{"strokes":5},"9":{"strokes":5},"10":{"strokes":4},"11":{"strokes":5},"12":{"strokes":3},"13":{"strokes":5},"14":{"strokes":4},"15":{"strokes":4},"16":{"strokes":3},"17":{"strokes":5},"18":{"strokes":5}}'::jsonb,
   76, 61, 38, 'completed', '2024-10-05 16:00:00'),
  ('66666666-b023-b023-b023-000000000023', '66666666-0005-0005-0005-000000000005', 'df045f29-718a-41b5-ac4a-9a8dbf26c6cb',
   '{"1":{"strokes":4},"2":{"strokes":4},"3":{"strokes":3},"4":{"strokes":5},"5":{"strokes":4},"6":{"strokes":4},"7":{"strokes":3},"8":{"strokes":4},"9":{"strokes":5},"10":{"strokes":4},"11":{"strokes":4},"12":{"strokes":3},"13":{"strokes":5},"14":{"strokes":5},"15":{"strokes":4},"16":{"strokes":3},"17":{"strokes":5},"18":{"strokes":5}}'::jsonb,
   74, 66, 37, 'completed', '2024-10-05 16:00:00'),
  ('66666666-b024-b024-b024-000000000024', '66666666-0005-0005-0005-000000000005', 'ca7c2924-39e8-4b66-bbb8-d9699adb3d65',
   '{"1":{"strokes":5},"2":{"strokes":5},"3":{"strokes":4},"4":{"strokes":5},"5":{"strokes":5},"6":{"strokes":4},"7":{"strokes":3},"8":{"strokes":5},"9":{"strokes":5},"10":{"strokes":5},"11":{"strokes":5},"12":{"strokes":4},"13":{"strokes":5},"14":{"strokes":5},"15":{"strokes":5},"16":{"strokes":3},"17":{"strokes":5},"18":{"strokes":5}}'::jsonb,
   83, 65, 35, 'completed', '2024-10-05 16:00:00'),
  ('66666666-b025-b025-b025-000000000025', '66666666-0005-0005-0005-000000000005', '7ef2ab5a-6577-4102-8e97-98d1fd58cfe4',
   '{"1":{"strokes":6},"2":{"strokes":5},"3":{"strokes":4},"4":{"strokes":6},"5":{"strokes":5},"6":{"strokes":5},"7":{"strokes":4},"8":{"strokes":6},"9":{"strokes":6},"10":{"strokes":5},"11":{"strokes":6},"12":{"strokes":4},"13":{"strokes":6},"14":{"strokes":5},"15":{"strokes":5},"16":{"strokes":4},"17":{"strokes":6},"18":{"strokes":6}}'::jsonb,
   94, 70, 32, 'completed', '2024-10-05 16:00:00');

-- Round 6 Scorecards (The Dunes)
INSERT INTO scorecards (id, round_id, player_id, scores, total_gross, total_net, total_points, status, submitted_at) VALUES
  ('66666666-b026-b026-b026-000000000026', '66666666-0006-0006-0006-000000000006', 'df045f29-718a-41b5-ac4a-9a8dbf26c6cb',
   '{"1":{"strokes":4},"2":{"strokes":4},"3":{"strokes":3},"4":{"strokes":5},"5":{"strokes":4},"6":{"strokes":4},"7":{"strokes":2},"8":{"strokes":4},"9":{"strokes":5},"10":{"strokes":4},"11":{"strokes":4},"12":{"strokes":3},"13":{"strokes":4},"14":{"strokes":4},"15":{"strokes":4},"16":{"strokes":3},"17":{"strokes":4},"18":{"strokes":4}}'::jsonb,
   69, 61, 41, 'completed', '2024-10-12 16:00:00'),
  ('66666666-b027-b027-b027-000000000027', '66666666-0006-0006-0006-000000000006', '41677ffc-f9c4-490b-bc39-1f7370b36c2b',
   '{"1":{"strokes":4},"2":{"strokes":4},"3":{"strokes":3},"4":{"strokes":5},"5":{"strokes":4},"6":{"strokes":4},"7":{"strokes":3},"8":{"strokes":4},"9":{"strokes":5},"10":{"strokes":4},"11":{"strokes":4},"12":{"strokes":3},"13":{"strokes":5},"14":{"strokes":4},"15":{"strokes":4},"16":{"strokes":3},"17":{"strokes":4},"18":{"strokes":5}}'::jsonb,
   72, 60, 39, 'completed', '2024-10-12 16:00:00'),
  ('66666666-b028-b028-b028-000000000028', '66666666-0006-0006-0006-000000000006', '25c171c8-c087-4d4a-b3be-545acdfe3f11',
   '{"1":{"strokes":5},"2":{"strokes":4},"3":{"strokes":3},"4":{"strokes":5},"5":{"strokes":4},"6":{"strokes":4},"7":{"strokes":3},"8":{"strokes":5},"9":{"strokes":5},"10":{"strokes":4},"11":{"strokes":5},"12":{"strokes":3},"13":{"strokes":5},"14":{"strokes":4},"15":{"strokes":4},"16":{"strokes":3},"17":{"strokes":5},"18":{"strokes":5}}'::jsonb,
   76, 61, 37, 'completed', '2024-10-12 16:00:00'),
  ('66666666-b029-b029-b029-000000000029', '66666666-0006-0006-0006-000000000006', 'ca7c2924-39e8-4b66-bbb8-d9699adb3d65',
   '{"1":{"strokes":5},"2":{"strokes":5},"3":{"strokes":4},"4":{"strokes":6},"5":{"strokes":5},"6":{"strokes":5},"7":{"strokes":3},"8":{"strokes":5},"9":{"strokes":5},"10":{"strokes":5},"11":{"strokes":5},"12":{"strokes":4},"13":{"strokes":6},"14":{"strokes":5},"15":{"strokes":5},"16":{"strokes":3},"17":{"strokes":5},"18":{"strokes":5}}'::jsonb,
   86, 68, 34, 'completed', '2024-10-12 16:00:00'),
  ('66666666-b030-b030-b030-000000000030', '66666666-0006-0006-0006-000000000006', '7ef2ab5a-6577-4102-8e97-98d1fd58cfe4',
   '{"1":{"strokes":6},"2":{"strokes":6},"3":{"strokes":4},"4":{"strokes":7},"5":{"strokes":5},"6":{"strokes":6},"7":{"strokes":4},"8":{"strokes":6},"9":{"strokes":6},"10":{"strokes":6},"11":{"strokes":6},"12":{"strokes":4},"13":{"strokes":7},"14":{"strokes":5},"15":{"strokes":5},"16":{"strokes":4},"17":{"strokes":6},"18":{"strokes":6}}'::jsonb,
   99, 75, 30, 'completed', '2024-10-12 16:00:00');


-- =====================================================
-- VERIFICATION QUERIES
-- =====================================================

SELECT '=======================================' as separator;
SELECT 'EXPANDED TEST DATA - VERIFICATION' as header;
SELECT '=======================================' as separator;

SELECT
  'Competitions' as entity,
  COUNT(*) as count
FROM competitions
UNION ALL
SELECT 'Rounds', COUNT(*) FROM rounds
UNION ALL
SELECT 'Teams', COUNT(*) FROM teams
UNION ALL
SELECT 'Team Members', COUNT(*) FROM team_members
UNION ALL
SELECT 'Pairings', COUNT(*) FROM pairings
UNION ALL
SELECT 'Scorecards', COUNT(*) FROM scorecards
UNION ALL
SELECT 'Round Results', COUNT(*) FROM round_results
UNION ALL
SELECT 'Competition Players', COUNT(*) FROM competition_players
UNION ALL
SELECT 'Scoring Pairs', COUNT(*) FROM scoring_pairs;

SELECT '=======================================' as separator;
SELECT 'COMPETITIONS SUMMARY' as header;
SELECT '=======================================' as separator;

SELECT
  c.name,
  c.status,
  c.team_mode,
  COUNT(DISTINCT r.id) as rounds,
  COUNT(DISTINCT cp.player_id) as players
FROM competitions c
LEFT JOIN rounds r ON c.id = r.competition_id
LEFT JOIN competition_players cp ON c.id = cp.competition_id
GROUP BY c.id, c.name, c.status, c.team_mode
ORDER BY c.start_date;

SELECT '=======================================' as separator;
SELECT 'WEEKEND WARRIORS FINAL STANDINGS' as header;
SELECT '=======================================' as separator;

SELECT * FROM get_competition_individual_standings('66666666-6666-6666-6666-666666666666');

SELECT '=======================================' as separator;
SELECT 'SCORING PAIRS SUMMARY' as header;
SELECT '=======================================' as separator;

SELECT
  c.name as competition_name,
  r.round_number,
  r.status as round_status,
  r.scoring_pairs_required,
  COUNT(sp.id) as scoring_pairs_count
FROM competitions c
JOIN rounds r ON c.id = r.competition_id
LEFT JOIN scoring_pairs sp ON r.id = sp.round_id
WHERE r.scoring_pairs_required = TRUE
GROUP BY c.id, c.name, r.id, r.round_number, r.status, r.scoring_pairs_required
ORDER BY c.name, r.round_number;
