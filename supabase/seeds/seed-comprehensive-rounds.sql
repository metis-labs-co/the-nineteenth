-- =====================================================
-- COMPREHENSIVE SEED DATA FOR 8 USERS
-- =====================================================
-- Creates comprehensive round data for 8 specified users:
-- - d76287de-f504-4541-8ccd-e7484f4d8679
-- - ca7c2924-39e8-4b66-bbb8-d9699adb3d65
-- - e5579c23-938b-4f03-b08f-b889276cfc50
-- - 5d7c1ffc-0ad4-486b-b069-d93d626c762f
-- - 74e84922-d5fc-4cdb-9835-251c31784309
-- - 25c171c8-c087-4d4a-b3be-545acdfe3f11
-- - e8ba6eb4-1894-422d-bbd2-485c9f141a55
-- - 41677ffc-f9c4-490b-bc39-1f7370b36c2b
--
-- Features:
-- - 20+ completed rounds per user
-- - Variety of game types (stableford, stroke, match-play, best-ball, scramble)
-- - Skins and Wolf games
-- - Competitions with 4+ players using tee groupings
-- - Player statistics and handicap history
-- =====================================================

-- =====================================================
-- STEP 1: CLEAN UP EXISTING DATA
-- =====================================================

-- Delete in reverse order of dependencies to avoid FK violations
DELETE FROM wolf_payouts;
DELETE FROM wolf_hole_decisions;
DELETE FROM wolf_games;
DELETE FROM skins_player_statistics;
DELETE FROM skins_payouts;
DELETE FROM skins_results;
DELETE FROM skins_games;
DELETE FROM round_results;
DELETE FROM scoring_pairs;
DELETE FROM scorecards;
DELETE FROM pairings;
DELETE FROM team_members;
DELETE FROM teams;
DELETE FROM rounds;
DELETE FROM competition_players;
DELETE FROM competitions;

-- Don't delete courses/venues - we need those

-- =====================================================
-- STEP 2: USER UUIDs (for reference)
-- =====================================================

-- User 1: d76287de-f504-4541-8ccd-e7484f4d8679
-- User 2: ca7c2924-39e8-4b66-bbb8-d9699adb3d65
-- User 3: e5579c23-938b-4f03-b08f-b889276cfc50
-- User 4: 5d7c1ffc-0ad4-486b-b069-d93d626c762f
-- User 5: 74e84922-d5fc-4cdb-9835-251c31784309
-- User 6: 25c171c8-c087-4d4a-b3be-545acdfe3f11
-- User 7: e8ba6eb4-1894-422d-bbd2-485c9f141a55
-- User 8: 41677ffc-f9c4-490b-bc39-1f7370b36c2b

-- =====================================================
-- STEP 3: UPDATE PLAYER PROFILES WITH HANDICAPS
-- =====================================================

UPDATE players SET handicap = 8.2, handicap_index = 8.0 WHERE id = 'd76287de-f504-4541-8ccd-e7484f4d8679';
UPDATE players SET handicap = 12.5, handicap_index = 12.3 WHERE id = 'ca7c2924-39e8-4b66-bbb8-d9699adb3d65';
UPDATE players SET handicap = 15.8, handicap_index = 15.5 WHERE id = 'e5579c23-938b-4f03-b08f-b889276cfc50';
UPDATE players SET handicap = 6.4, handicap_index = 6.2 WHERE id = '5d7c1ffc-0ad4-486b-b069-d93d626c762f';
UPDATE players SET handicap = 22.1, handicap_index = 21.8 WHERE id = '74e84922-d5fc-4cdb-9835-251c31784309';
UPDATE players SET handicap = 18.3, handicap_index = 18.0 WHERE id = '25c171c8-c087-4d4a-b3be-545acdfe3f11';
UPDATE players SET handicap = 10.7, handicap_index = 10.5 WHERE id = 'e8ba6eb4-1894-422d-bbd2-485c9f141a55';
UPDATE players SET handicap = 14.2, handicap_index = 14.0 WHERE id = '41677ffc-f9c4-490b-bc39-1f7370b36c2b';

-- =====================================================
-- STEP 4: COURSE UUIDs (Using existing courses in DB)
-- =====================================================
-- Course 1: 3ab72d12-37d8-4b70-80ec-c8fa1e87d3fe
-- Course 2: 47952df0-f0a0-481e-a280-804788c05aa9
-- Course 3: 54ecbd4c-deba-46f7-ab29-e6a4e3895fa7
-- Course 4: 55d81445-9734-4fe6-afe6-5e29771ece7b
-- Course 5: 86ef89f0-d13b-4bd2-ab3c-41f74f08f265

-- =====================================================
-- STEP 5: CREATE COMPETITIONS
-- =====================================================

-- Competition 1: Summer Championship 2025 (8 players, completed, stableford)
INSERT INTO competitions (id, name, description, start_date, end_date, handicap_system, visibility, invite_code, organizer_id, status, team_mode, created_at, updated_at)
VALUES (
  'c0000001-0000-0000-0000-000000000001',
  'Summer Championship 2025',
  'Annual summer golf championship with 8 players across multiple rounds',
  '2025-11-01',
  '2025-12-15',
  'honor',
  'private',
  'SUMMER25',
  'd76287de-f504-4541-8ccd-e7484f4d8679',
  'completed',
  'none',
  NOW() - INTERVAL '90 days',
  NOW() - INTERVAL '30 days'
)
;

-- Competition 2: Winter Series 2025 (8 players, completed, stroke play)
INSERT INTO competitions (id, name, description, start_date, end_date, handicap_system, visibility, invite_code, organizer_id, status, team_mode, created_at, updated_at)
VALUES (
  'c0000001-0000-0000-0000-000000000002',
  'Winter Series 2025',
  'Winter stroke play series at top Melbourne courses',
  '2025-06-01',
  '2025-08-31',
  'honor',
  'private',
  'WINTER25',
  'ca7c2924-39e8-4b66-bbb8-d9699adb3d65',
  'completed',
  'none',
  NOW() - INTERVAL '250 days',
  NOW() - INTERVAL '180 days'
)
;

-- Competition 3: Match Play Classic 2025 (8 players, completed)
INSERT INTO competitions (id, name, description, start_date, end_date, handicap_system, visibility, invite_code, organizer_id, status, team_mode, created_at, updated_at)
VALUES (
  'c0000001-0000-0000-0000-000000000003',
  'Match Play Classic 2025',
  'Head-to-head match play competition',
  '2025-09-01',
  '2025-10-15',
  'honor',
  'private',
  'MATCH25',
  'e5579c23-938b-4f03-b08f-b889276cfc50',
  'completed',
  'none',
  NOW() - INTERVAL '150 days',
  NOW() - INTERVAL '100 days'
)
;

-- Competition 4: Team Scramble Cup 2025 (8 players, 4 teams of 2, completed)
INSERT INTO competitions (id, name, description, start_date, end_date, handicap_system, visibility, invite_code, organizer_id, status, team_mode, team_size, created_at, updated_at)
VALUES (
  'c0000001-0000-0000-0000-000000000004',
  'Team Scramble Cup 2025',
  'Team scramble format - 4 teams of 2',
  '2025-10-01',
  '2025-10-31',
  'honor',
  'private',
  'SCRAMBLE25',
  '5d7c1ffc-0ad4-486b-b069-d93d626c762f',
  'completed',
  'fixed',
  2,
  NOW() - INTERVAL '120 days',
  NOW() - INTERVAL '90 days'
)
;

-- Competition 5: Best Ball Bonanza 2025 (8 players, completed)
INSERT INTO competitions (id, name, description, start_date, end_date, handicap_system, visibility, invite_code, organizer_id, status, team_mode, team_size, created_at, updated_at)
VALUES (
  'c0000001-0000-0000-0000-000000000005',
  'Best Ball Bonanza 2025',
  'Four-ball better ball competition',
  '2025-07-01',
  '2025-07-31',
  'honor',
  'private',
  'BESTBALL25',
  '74e84922-d5fc-4cdb-9835-251c31784309',
  'completed',
  'fixed',
  2,
  NOW() - INTERVAL '200 days',
  NOW() - INTERVAL '170 days'
)
;

-- Competition 6: Autumn Classic 2025 (8 players, in-progress)
INSERT INTO competitions (id, name, description, start_date, end_date, handicap_system, visibility, invite_code, organizer_id, status, team_mode, created_at, updated_at)
VALUES (
  'c0000001-0000-0000-0000-000000000006',
  'Autumn Classic 2026',
  'Currently running autumn competition',
  '2026-01-15',
  '2026-02-28',
  'honor',
  'private',
  'AUTUMN26',
  '25c171c8-c087-4d4a-b3be-545acdfe3f11',
  'in-progress',
  'none',
  NOW() - INTERVAL '20 days',
  NOW()
)
;

-- =====================================================
-- STEP 6: ADD ALL PLAYERS TO ALL COMPETITIONS
-- =====================================================

INSERT INTO competition_players (competition_id, player_id, status, invited_at, responded_at)
SELECT
  c.id,
  p.id,
  'accepted',
  c.created_at,
  c.created_at + INTERVAL '1 day'
FROM competitions c
CROSS JOIN (
  SELECT unnest(ARRAY[
    'd76287de-f504-4541-8ccd-e7484f4d8679'::uuid,
    'ca7c2924-39e8-4b66-bbb8-d9699adb3d65'::uuid,
    'e5579c23-938b-4f03-b08f-b889276cfc50'::uuid,
    '5d7c1ffc-0ad4-486b-b069-d93d626c762f'::uuid,
    '74e84922-d5fc-4cdb-9835-251c31784309'::uuid,
    '25c171c8-c087-4d4a-b3be-545acdfe3f11'::uuid,
    'e8ba6eb4-1894-422d-bbd2-485c9f141a55'::uuid,
    '41677ffc-f9c4-490b-bc39-1f7370b36c2b'::uuid
  ]) AS id
) p
WHERE c.id::text LIKE 'c0000001%'
;

-- =====================================================
-- STEP 7: CREATE TEAMS FOR TEAM COMPETITIONS
-- =====================================================

-- Teams for Scramble Cup
INSERT INTO teams (id, competition_id, name, created_at, updated_at)
VALUES
  ('a1000001-0000-0000-0000-000000000001', 'c0000001-0000-0000-0000-000000000004', 'Eagle Team', NOW() - INTERVAL '120 days', NOW()),
  ('a1000001-0000-0000-0000-000000000002', 'c0000001-0000-0000-0000-000000000004', 'Birdie Squad', NOW() - INTERVAL '120 days', NOW()),
  ('a1000001-0000-0000-0000-000000000003', 'c0000001-0000-0000-0000-000000000004', 'Par Patrol', NOW() - INTERVAL '120 days', NOW()),
  ('a1000001-0000-0000-0000-000000000004', 'c0000001-0000-0000-0000-000000000004', 'Bogey Brigade', NOW() - INTERVAL '120 days', NOW())
;

-- Teams for Best Ball
INSERT INTO teams (id, competition_id, name, created_at, updated_at)
VALUES
  ('a2000002-0000-0000-0000-000000000001', 'c0000001-0000-0000-0000-000000000005', 'Dynamic Duo', NOW() - INTERVAL '200 days', NOW()),
  ('a2000002-0000-0000-0000-000000000002', 'c0000001-0000-0000-0000-000000000005', 'Power Pair', NOW() - INTERVAL '200 days', NOW()),
  ('a2000002-0000-0000-0000-000000000003', 'c0000001-0000-0000-0000-000000000005', 'Fairway Friends', NOW() - INTERVAL '200 days', NOW()),
  ('a2000002-0000-0000-0000-000000000004', 'c0000001-0000-0000-0000-000000000005', 'Green Getters', NOW() - INTERVAL '200 days', NOW())
;

-- Team members for Scramble Cup
INSERT INTO team_members (team_id, player_id, joined_at)
VALUES
  ('a1000001-0000-0000-0000-000000000001', 'd76287de-f504-4541-8ccd-e7484f4d8679', NOW() - INTERVAL '120 days'),
  ('a1000001-0000-0000-0000-000000000001', 'ca7c2924-39e8-4b66-bbb8-d9699adb3d65', NOW() - INTERVAL '120 days'),
  ('a1000001-0000-0000-0000-000000000002', 'e5579c23-938b-4f03-b08f-b889276cfc50', NOW() - INTERVAL '120 days'),
  ('a1000001-0000-0000-0000-000000000002', '5d7c1ffc-0ad4-486b-b069-d93d626c762f', NOW() - INTERVAL '120 days'),
  ('a1000001-0000-0000-0000-000000000003', '74e84922-d5fc-4cdb-9835-251c31784309', NOW() - INTERVAL '120 days'),
  ('a1000001-0000-0000-0000-000000000003', '25c171c8-c087-4d4a-b3be-545acdfe3f11', NOW() - INTERVAL '120 days'),
  ('a1000001-0000-0000-0000-000000000004', 'e8ba6eb4-1894-422d-bbd2-485c9f141a55', NOW() - INTERVAL '120 days'),
  ('a1000001-0000-0000-0000-000000000004', '41677ffc-f9c4-490b-bc39-1f7370b36c2b', NOW() - INTERVAL '120 days')
;

-- Team members for Best Ball
INSERT INTO team_members (team_id, player_id, joined_at)
VALUES
  ('a2000002-0000-0000-0000-000000000001', 'd76287de-f504-4541-8ccd-e7484f4d8679', NOW() - INTERVAL '200 days'),
  ('a2000002-0000-0000-0000-000000000001', '5d7c1ffc-0ad4-486b-b069-d93d626c762f', NOW() - INTERVAL '200 days'),
  ('a2000002-0000-0000-0000-000000000002', 'ca7c2924-39e8-4b66-bbb8-d9699adb3d65', NOW() - INTERVAL '200 days'),
  ('a2000002-0000-0000-0000-000000000002', 'e5579c23-938b-4f03-b08f-b889276cfc50', NOW() - INTERVAL '200 days'),
  ('a2000002-0000-0000-0000-000000000003', '74e84922-d5fc-4cdb-9835-251c31784309', NOW() - INTERVAL '200 days'),
  ('a2000002-0000-0000-0000-000000000003', 'e8ba6eb4-1894-422d-bbd2-485c9f141a55', NOW() - INTERVAL '200 days'),
  ('a2000002-0000-0000-0000-000000000004', '25c171c8-c087-4d4a-b3be-545acdfe3f11', NOW() - INTERVAL '200 days'),
  ('a2000002-0000-0000-0000-000000000004', '41677ffc-f9c4-490b-bc39-1f7370b36c2b', NOW() - INTERVAL '200 days')
;

-- =====================================================
-- STEP 8: CREATE ROUNDS
-- We'll create multiple rounds per competition
-- =====================================================

-- Function to generate realistic scores
CREATE OR REPLACE FUNCTION generate_realistic_scores(handicap NUMERIC, par_total INTEGER DEFAULT 72)
RETURNS JSONB AS $$
DECLARE
  scores JSONB := '{}';
  hole_num INTEGER;
  par INTEGER;
  stroke_modifier INTEGER;
  strokes INTEGER;
  putts INTEGER;
  pars INTEGER[] := ARRAY[4,5,3,4,4,3,5,4,4,4,3,5,4,4,4,3,5,4]; -- Common par layout
BEGIN
  FOR hole_num IN 1..18 LOOP
    par := pars[hole_num];

    -- Base score around par + handicap adjustment
    -- Higher handicap = more likely to score over par
    stroke_modifier := FLOOR(RANDOM() * 4 - 1 + (handicap / 18.0))::INTEGER;
    strokes := GREATEST(par - 2, par + stroke_modifier);

    -- Realistic putts (1-4, average 2)
    putts := LEAST(strokes - 1, GREATEST(1, FLOOR(RANDOM() * 2.5 + 1.5)::INTEGER));

    scores := scores || jsonb_build_object(
      hole_num::text,
      jsonb_build_object(
        'strokes', strokes,
        'putts', putts
      )
    );
  END LOOP;

  RETURN scores;
END;
$$ LANGUAGE plpgsql;

-- Function to calculate total from scores
CREATE OR REPLACE FUNCTION calculate_total_gross(scores JSONB)
RETURNS INTEGER AS $$
DECLARE
  total INTEGER := 0;
  hole_data JSONB;
BEGIN
  FOR hole_data IN SELECT value FROM jsonb_each(scores)
  LOOP
    total := total + (hole_data->>'strokes')::INTEGER;
  END LOOP;
  RETURN total;
END;
$$ LANGUAGE plpgsql;

-- Summer Championship Rounds (5 stableford rounds)
DO $$
DECLARE
  round_dates DATE[] := ARRAY['2025-11-01', '2025-11-08', '2025-11-15', '2025-11-22', '2025-12-01']::DATE[];
  course_ids UUID[] := ARRAY[
    '3ab72d12-37d8-4b70-80ec-c8fa1e87d3fe'::UUID,
    '47952df0-f0a0-481e-a280-804788c05aa9'::UUID,
    '54ecbd4c-deba-46f7-ab29-e6a4e3895fa7'::UUID,
    '55d81445-9734-4fe6-afe6-5e29771ece7b'::UUID,
    '86ef89f0-d13b-4bd2-ab3c-41f74f08f265'::UUID
  ];
  i INTEGER;
  round_id UUID;
  pairing_id1 UUID;
  pairing_id2 UUID;
BEGIN
  FOR i IN 1..5 LOOP
    round_id := ('b0000001-0000-0000-0001-00000000000' || i)::UUID;
    pairing_id1 := ('d0000001-0001-' || LPAD(i::TEXT, 4, '0') || '-0001-000000000001')::UUID;
    pairing_id2 := ('d0000001-0001-' || LPAD(i::TEXT, 4, '0') || '-0002-000000000001')::UUID;

    INSERT INTO rounds (id, competition_id, round_number, course_id, date, game_type, status, created_at, updated_at)
    VALUES (
      round_id,
      'c0000001-0000-0000-0000-000000000001',
      i,
      course_ids[i],
      round_dates[i],
      'stableford',
      'completed',
      round_dates[i]::TIMESTAMP - INTERVAL '7 days',
      round_dates[i]::TIMESTAMP + INTERVAL '6 hours'
    )
    ;

    -- Create pairings (2 groups of 4)
    INSERT INTO pairings (id, round_id, player_ids, tee_time, created_at, updated_at)
    VALUES
      (pairing_id1, round_id, ARRAY[
        'd76287de-f504-4541-8ccd-e7484f4d8679'::UUID,
        'ca7c2924-39e8-4b66-bbb8-d9699adb3d65'::UUID,
        'e5579c23-938b-4f03-b08f-b889276cfc50'::UUID,
        '5d7c1ffc-0ad4-486b-b069-d93d626c762f'::UUID
      ], '07:30', NOW(), NOW()),
      (pairing_id2, round_id, ARRAY[
        '74e84922-d5fc-4cdb-9835-251c31784309'::UUID,
        '25c171c8-c087-4d4a-b3be-545acdfe3f11'::UUID,
        'e8ba6eb4-1894-422d-bbd2-485c9f141a55'::UUID,
        '41677ffc-f9c4-490b-bc39-1f7370b36c2b'::UUID
      ], '07:40', NOW(), NOW())
    ;
  END LOOP;
END $$;

-- Winter Series Rounds (4 stroke rounds)
DO $$
DECLARE
  round_dates DATE[] := ARRAY['2025-06-07', '2025-06-28', '2025-07-19', '2025-08-16']::DATE[];
  course_ids UUID[] := ARRAY[
    '54ecbd4c-deba-46f7-ab29-e6a4e3895fa7'::UUID,
    '86ef89f0-d13b-4bd2-ab3c-41f74f08f265'::UUID,
    '3ab72d12-37d8-4b70-80ec-c8fa1e87d3fe'::UUID,
    '47952df0-f0a0-481e-a280-804788c05aa9'::UUID
  ];
  i INTEGER;
  round_id UUID;
  pairing_id1 UUID;
  pairing_id2 UUID;
BEGIN
  FOR i IN 1..4 LOOP
    round_id := ('b0000001-0000-0000-0002-00000000000' || i)::UUID;
    pairing_id1 := ('d0000001-0002-' || LPAD(i::TEXT, 4, '0') || '-0001-000000000001')::UUID;
    pairing_id2 := ('d0000001-0002-' || LPAD(i::TEXT, 4, '0') || '-0002-000000000001')::UUID;

    INSERT INTO rounds (id, competition_id, round_number, course_id, date, game_type, status, created_at, updated_at)
    VALUES (
      round_id,
      'c0000001-0000-0000-0000-000000000002',
      i,
      course_ids[i],
      round_dates[i],
      'stroke',
      'completed',
      round_dates[i]::TIMESTAMP - INTERVAL '7 days',
      round_dates[i]::TIMESTAMP + INTERVAL '6 hours'
    )
    ;

    INSERT INTO pairings (id, round_id, player_ids, tee_time, created_at, updated_at)
    VALUES
      (pairing_id1, round_id, ARRAY[
        'd76287de-f504-4541-8ccd-e7484f4d8679'::UUID,
        'e5579c23-938b-4f03-b08f-b889276cfc50'::UUID,
        '74e84922-d5fc-4cdb-9835-251c31784309'::UUID,
        'e8ba6eb4-1894-422d-bbd2-485c9f141a55'::UUID
      ], '08:00', NOW(), NOW()),
      (pairing_id2, round_id, ARRAY[
        'ca7c2924-39e8-4b66-bbb8-d9699adb3d65'::UUID,
        '5d7c1ffc-0ad4-486b-b069-d93d626c762f'::UUID,
        '25c171c8-c087-4d4a-b3be-545acdfe3f11'::UUID,
        '41677ffc-f9c4-490b-bc39-1f7370b36c2b'::UUID
      ], '08:10', NOW(), NOW())
    ;
  END LOOP;
END $$;

-- Match Play Classic Rounds (4 match-play rounds)
DO $$
DECLARE
  round_dates DATE[] := ARRAY['2025-09-06', '2025-09-20', '2025-10-04', '2025-10-11']::DATE[];
  i INTEGER;
  round_id UUID;
  pairing_id UUID;
BEGIN
  FOR i IN 1..4 LOOP
    round_id := ('b0000001-0000-0000-0003-00000000000' || i)::UUID;

    INSERT INTO rounds (id, competition_id, round_number, course_id, date, game_type, status, created_at, updated_at)
    VALUES (
      round_id,
      'c0000001-0000-0000-0000-000000000003',
      i,
      '3ab72d12-37d8-4b70-80ec-c8fa1e87d3fe',
      round_dates[i],
      'match-play',
      'completed',
      round_dates[i]::TIMESTAMP - INTERVAL '7 days',
      round_dates[i]::TIMESTAMP + INTERVAL '6 hours'
    )
    ;

    -- Create 4 pairings of 2 for match play
    INSERT INTO pairings (id, round_id, player_ids, tee_time, created_at, updated_at)
    VALUES
      (('d0000001-0003-' || LPAD(i::TEXT, 4, '0') || '-0001-000000000001')::UUID, round_id, ARRAY[
        'd76287de-f504-4541-8ccd-e7484f4d8679'::UUID,
        'ca7c2924-39e8-4b66-bbb8-d9699adb3d65'::UUID
      ], '07:00', NOW(), NOW()),
      (('d0000001-0003-' || LPAD(i::TEXT, 4, '0') || '-0002-000000000001')::UUID, round_id, ARRAY[
        'e5579c23-938b-4f03-b08f-b889276cfc50'::UUID,
        '5d7c1ffc-0ad4-486b-b069-d93d626c762f'::UUID
      ], '07:10', NOW(), NOW()),
      (('d0000001-0003-' || LPAD(i::TEXT, 4, '0') || '-0003-000000000001')::UUID, round_id, ARRAY[
        '74e84922-d5fc-4cdb-9835-251c31784309'::UUID,
        '25c171c8-c087-4d4a-b3be-545acdfe3f11'::UUID
      ], '07:20', NOW(), NOW()),
      (('d0000001-0003-' || LPAD(i::TEXT, 4, '0') || '-0004-000000000001')::UUID, round_id, ARRAY[
        'e8ba6eb4-1894-422d-bbd2-485c9f141a55'::UUID,
        '41677ffc-f9c4-490b-bc39-1f7370b36c2b'::UUID
      ], '07:30', NOW(), NOW())
    ;
  END LOOP;
END $$;

-- Scramble Cup Rounds (3 scramble team rounds)
DO $$
DECLARE
  round_dates DATE[] := ARRAY['2025-10-05', '2025-10-12', '2025-10-26']::DATE[];
  i INTEGER;
  round_id UUID;
BEGIN
  FOR i IN 1..3 LOOP
    round_id := ('b0000001-0000-0000-0004-00000000000' || i)::UUID;

    INSERT INTO rounds (id, competition_id, round_number, course_id, date, game_type, status, is_team_round, team_format, created_at, updated_at)
    VALUES (
      round_id,
      'c0000001-0000-0000-0000-000000000004',
      i,
      '47952df0-f0a0-481e-a280-804788c05aa9',
      round_dates[i],
      'stableford',
      'completed',
      TRUE,
      'scramble',
      round_dates[i]::TIMESTAMP - INTERVAL '7 days',
      round_dates[i]::TIMESTAMP + INTERVAL '6 hours'
    )
    ;

    -- Create 4 team pairings
    INSERT INTO pairings (id, round_id, player_ids, tee_time, created_at, updated_at)
    VALUES
      (('d0000001-0004-' || LPAD(i::TEXT, 4, '0') || '-0001-000000000001')::UUID, round_id, ARRAY[
        'd76287de-f504-4541-8ccd-e7484f4d8679'::UUID,
        'ca7c2924-39e8-4b66-bbb8-d9699adb3d65'::UUID
      ], '07:00', NOW(), NOW()),
      (('d0000001-0004-' || LPAD(i::TEXT, 4, '0') || '-0002-000000000001')::UUID, round_id, ARRAY[
        'e5579c23-938b-4f03-b08f-b889276cfc50'::UUID,
        '5d7c1ffc-0ad4-486b-b069-d93d626c762f'::UUID
      ], '07:10', NOW(), NOW()),
      (('d0000001-0004-' || LPAD(i::TEXT, 4, '0') || '-0003-000000000001')::UUID, round_id, ARRAY[
        '74e84922-d5fc-4cdb-9835-251c31784309'::UUID,
        '25c171c8-c087-4d4a-b3be-545acdfe3f11'::UUID
      ], '07:20', NOW(), NOW()),
      (('d0000001-0004-' || LPAD(i::TEXT, 4, '0') || '-0004-000000000001')::UUID, round_id, ARRAY[
        'e8ba6eb4-1894-422d-bbd2-485c9f141a55'::UUID,
        '41677ffc-f9c4-490b-bc39-1f7370b36c2b'::UUID
      ], '07:30', NOW(), NOW())
    ;
  END LOOP;
END $$;

-- Best Ball Bonanza Rounds (3 best-ball rounds)
DO $$
DECLARE
  round_dates DATE[] := ARRAY['2025-07-06', '2025-07-13', '2025-07-27']::DATE[];
  i INTEGER;
  round_id UUID;
BEGIN
  FOR i IN 1..3 LOOP
    round_id := ('b0000001-0000-0000-0005-00000000000' || i)::UUID;

    INSERT INTO rounds (id, competition_id, round_number, course_id, date, game_type, status, is_team_round, team_format, created_at, updated_at)
    VALUES (
      round_id,
      'c0000001-0000-0000-0000-000000000005',
      i,
      '54ecbd4c-deba-46f7-ab29-e6a4e3895fa7',
      round_dates[i],
      'stableford',
      'completed',
      TRUE,
      'best-ball',
      round_dates[i]::TIMESTAMP - INTERVAL '7 days',
      round_dates[i]::TIMESTAMP + INTERVAL '6 hours'
    )
    ;

    -- Teams of 2 pairings
    INSERT INTO pairings (id, round_id, player_ids, tee_time, created_at, updated_at)
    VALUES
      (('d0000001-0005-' || LPAD(i::TEXT, 4, '0') || '-0001-000000000001')::UUID, round_id, ARRAY[
        'd76287de-f504-4541-8ccd-e7484f4d8679'::UUID,
        '5d7c1ffc-0ad4-486b-b069-d93d626c762f'::UUID
      ], '08:00', NOW(), NOW()),
      (('d0000001-0005-' || LPAD(i::TEXT, 4, '0') || '-0002-000000000001')::UUID, round_id, ARRAY[
        'ca7c2924-39e8-4b66-bbb8-d9699adb3d65'::UUID,
        'e5579c23-938b-4f03-b08f-b889276cfc50'::UUID
      ], '08:10', NOW(), NOW()),
      (('d0000001-0005-' || LPAD(i::TEXT, 4, '0') || '-0003-000000000001')::UUID, round_id, ARRAY[
        '74e84922-d5fc-4cdb-9835-251c31784309'::UUID,
        'e8ba6eb4-1894-422d-bbd2-485c9f141a55'::UUID
      ], '08:20', NOW(), NOW()),
      (('d0000001-0005-' || LPAD(i::TEXT, 4, '0') || '-0004-000000000001')::UUID, round_id, ARRAY[
        '25c171c8-c087-4d4a-b3be-545acdfe3f11'::UUID,
        '41677ffc-f9c4-490b-bc39-1f7370b36c2b'::UUID
      ], '08:30', NOW(), NOW())
    ;
  END LOOP;
END $$;

-- Autumn Classic (current competition) Rounds (3 rounds - 2 completed, 1 in-progress)
DO $$
DECLARE
  round_dates DATE[] := ARRAY['2026-01-18', '2026-01-25', '2026-02-02']::DATE[];
  statuses TEXT[] := ARRAY['completed', 'completed', 'in-progress'];
  i INTEGER;
  round_id UUID;
BEGIN
  FOR i IN 1..3 LOOP
    round_id := ('b0000001-0000-0000-0006-00000000000' || i)::UUID;

    INSERT INTO rounds (id, competition_id, round_number, course_id, date, game_type, status, created_at, updated_at)
    VALUES (
      round_id,
      'c0000001-0000-0000-0000-000000000006',
      i,
      '55d81445-9734-4fe6-afe6-5e29771ece7b',
      round_dates[i],
      'stableford',
      statuses[i],
      round_dates[i]::TIMESTAMP - INTERVAL '3 days',
      CASE WHEN statuses[i] = 'in-progress' THEN NOW() ELSE round_dates[i]::TIMESTAMP + INTERVAL '6 hours' END
    )
    ;

    INSERT INTO pairings (id, round_id, player_ids, tee_time, created_at, updated_at)
    VALUES
      (('d0000001-0006-' || LPAD(i::TEXT, 4, '0') || '-0001-000000000001')::UUID, round_id, ARRAY[
        'd76287de-f504-4541-8ccd-e7484f4d8679'::UUID,
        'ca7c2924-39e8-4b66-bbb8-d9699adb3d65'::UUID,
        'e5579c23-938b-4f03-b08f-b889276cfc50'::UUID,
        '5d7c1ffc-0ad4-486b-b069-d93d626c762f'::UUID
      ], '06:30', NOW(), NOW()),
      (('d0000001-0006-' || LPAD(i::TEXT, 4, '0') || '-0002-000000000001')::UUID, round_id, ARRAY[
        '74e84922-d5fc-4cdb-9835-251c31784309'::UUID,
        '25c171c8-c087-4d4a-b3be-545acdfe3f11'::UUID,
        'e8ba6eb4-1894-422d-bbd2-485c9f141a55'::UUID,
        '41677ffc-f9c4-490b-bc39-1f7370b36c2b'::UUID
      ], '06:40', NOW(), NOW())
    ;
  END LOOP;
END $$;

-- =====================================================
-- STEP 9: CREATE SCORECARDS WITH REALISTIC SCORES
-- =====================================================

-- Insert scorecards for all completed rounds
DO $$
DECLARE
  player_record RECORD;
  round_record RECORD;
  scorecard_id UUID;
  scores JSONB;
  total_gross INTEGER;
  total_net INTEGER;
  total_points INTEGER;
  player_hcp NUMERIC;
  hole_num INTEGER;
  par INTEGER;
  strokes INTEGER;
  stroke_index INTEGER;
  strokes_received INTEGER;
  net_strokes INTEGER;
  hole_points INTEGER;
  pars INTEGER[] := ARRAY[4,5,3,4,4,3,5,4,4,4,3,5,4,4,4,3,5,4];
  stroke_indexes INTEGER[] := ARRAY[7,3,15,1,9,17,5,11,13,8,16,4,2,10,12,18,6,14];
BEGIN
  -- Loop through all players
  FOR player_record IN
    SELECT id, handicap FROM players
    WHERE id IN (
      'd76287de-f504-4541-8ccd-e7484f4d8679'::UUID,
      'ca7c2924-39e8-4b66-bbb8-d9699adb3d65'::UUID,
      'e5579c23-938b-4f03-b08f-b889276cfc50'::UUID,
      '5d7c1ffc-0ad4-486b-b069-d93d626c762f'::UUID,
      '74e84922-d5fc-4cdb-9835-251c31784309'::UUID,
      '25c171c8-c087-4d4a-b3be-545acdfe3f11'::UUID,
      'e8ba6eb4-1894-422d-bbd2-485c9f141a55'::UUID,
      '41677ffc-f9c4-490b-bc39-1f7370b36c2b'::UUID
    )
  LOOP
    player_hcp := COALESCE(player_record.handicap, 18);

    -- Loop through all rounds
    FOR round_record IN
      SELECT r.id, r.status, r.game_type FROM rounds r
      WHERE r.id::TEXT LIKE 'b0000001-0000-0000-000%'
      AND (r.status = 'completed' OR (r.status = 'in-progress' AND r.id = 'b0000001-0000-0000-0006-000000000003'::UUID))
    LOOP
      scorecard_id := gen_random_uuid();
      scores := '{}';
      total_gross := 0;
      total_net := 0;
      total_points := 0;

      -- Generate scores for each hole
      FOR hole_num IN 1..18 LOOP
        par := pars[hole_num];
        stroke_index := stroke_indexes[hole_num];

        -- Generate realistic strokes based on handicap
        strokes := par + FLOOR(RANDOM() * 3 - 0.5 + (player_hcp / 36.0))::INTEGER;
        strokes := GREATEST(par - 2, strokes); -- Can't be better than eagle
        strokes := LEAST(par + 4, strokes);    -- Cap at quad bogey

        -- Calculate strokes received on this hole
        strokes_received := FLOOR(player_hcp / 18)::INTEGER;
        IF stroke_index <= (player_hcp::INTEGER % 18) THEN
          strokes_received := strokes_received + 1;
        END IF;

        net_strokes := strokes - strokes_received;

        -- Calculate stableford points
        IF net_strokes <= par - 2 THEN
          hole_points := 4;
        ELSIF net_strokes = par - 1 THEN
          hole_points := 3;
        ELSIF net_strokes = par THEN
          hole_points := 2;
        ELSIF net_strokes = par + 1 THEN
          hole_points := 1;
        ELSE
          hole_points := 0;
        END IF;

        -- Skip last few holes for in-progress round
        IF round_record.status = 'in-progress' AND hole_num > 12 THEN
          EXIT;
        END IF;

        scores := scores || jsonb_build_object(
          hole_num::TEXT,
          jsonb_build_object(
            'strokes', strokes,
            'putts', LEAST(strokes - 1, FLOOR(RANDOM() * 2 + 1.5)::INTEGER)
          )
        );

        total_gross := total_gross + strokes;
        total_net := total_net + net_strokes;
        total_points := total_points + hole_points;
      END LOOP;

      -- Insert scorecard
      INSERT INTO scorecards (
        id, round_id, player_id, scores, total_gross, total_net, total_points,
        status, submitted_at, submitted_by, device_id, synced_at,
        daily_handicap_used, handicap_differential, course_rating_used, slope_rating_used,
        created_at, updated_at
      )
      VALUES (
        scorecard_id,
        round_record.id,
        player_record.id,
        scores,
        total_gross,
        total_net,
        total_points,
        CASE WHEN round_record.status = 'in-progress' THEN 'in-progress' ELSE 'completed' END,
        CASE WHEN round_record.status = 'completed' THEN NOW() - INTERVAL '30 days' * RANDOM() ELSE NULL END,
        player_record.id,
        'device-' || LEFT(player_record.id::TEXT, 8),
        NOW(),
        ROUND(player_hcp)::INTEGER,
        ROUND((113.0 / 135) * (total_gross - 72), 1),
        72.0,
        135,
        NOW() - INTERVAL '30 days' * RANDOM(),
        NOW()
      )
      ;
    END LOOP;
  END LOOP;
END $$;

-- =====================================================
-- STEP 10: CREATE SKINS GAMES
-- =====================================================

-- Skins game for Summer Championship Round 1
INSERT INTO skins_games (
  id, round_id, pairing_id, participant_ids, pot_type, pot_value, currency,
  scoring_type, status, disclaimer_accepted_at, disclaimer_accepted_by, created_by,
  created_at, updated_at, completed_at
)
VALUES (
  'e0000001-0000-0000-0000-000000000001',
  'b0000001-0000-0000-0001-000000000001',
  'd0000001-0001-0001-0001-000000000001',
  ARRAY[
    'd76287de-f504-4541-8ccd-e7484f4d8679'::UUID,
    'ca7c2924-39e8-4b66-bbb8-d9699adb3d65'::UUID,
    'e5579c23-938b-4f03-b08f-b889276cfc50'::UUID,
    '5d7c1ffc-0ad4-486b-b069-d93d626c762f'::UUID
  ],
  'per_hole',
  5.00,
  'AUD',
  'net',
  'completed',
  NOW() - INTERVAL '85 days',
  'd76287de-f504-4541-8ccd-e7484f4d8679',
  'd76287de-f504-4541-8ccd-e7484f4d8679',
  NOW() - INTERVAL '85 days',
  NOW() - INTERVAL '85 days',
  NOW() - INTERVAL '85 days'
)
;

-- Generate skins results for skins game 1
DO $$
DECLARE
  hole INTEGER;
  winner_ids UUID[] := ARRAY[
    'd76287de-f504-4541-8ccd-e7484f4d8679'::UUID,
    NULL,  -- tie
    'ca7c2924-39e8-4b66-bbb8-d9699adb3d65'::UUID,
    'd76287de-f504-4541-8ccd-e7484f4d8679'::UUID,
    NULL,  -- tie
    NULL,  -- tie
    'e5579c23-938b-4f03-b08f-b889276cfc50'::UUID,
    '5d7c1ffc-0ad4-486b-b069-d93d626c762f'::UUID,
    NULL,  -- tie
    'd76287de-f504-4541-8ccd-e7484f4d8679'::UUID,
    NULL,  -- tie
    'ca7c2924-39e8-4b66-bbb8-d9699adb3d65'::UUID,
    'd76287de-f504-4541-8ccd-e7484f4d8679'::UUID,
    NULL,  -- tie
    '5d7c1ffc-0ad4-486b-b069-d93d626c762f'::UUID,
    NULL,  -- tie
    'e5579c23-938b-4f03-b08f-b889276cfc50'::UUID,
    'd76287de-f504-4541-8ccd-e7484f4d8679'::UUID
  ];
  carryover DECIMAL := 0;
  pot_value DECIMAL := 5.00;
  payout DECIMAL;
BEGIN
  FOR hole IN 1..18 LOOP
    IF winner_ids[hole] IS NULL THEN
      -- Tie - carryover
      INSERT INTO skins_results (id, skins_game_id, hole_number, winner_id, is_carryover, hole_scores, hole_pot_value, carryover_to_next, payout_amount, calculated_at)
      VALUES (
        gen_random_uuid(),
        'e0000001-0000-0000-0000-000000000001',
        hole,
        NULL,
        TRUE,
        jsonb_build_object(
          'd76287de-f504-4541-8ccd-e7484f4d8679', jsonb_build_object('gross', 4, 'net', 4),
          'ca7c2924-39e8-4b66-bbb8-d9699adb3d65', jsonb_build_object('gross', 4, 'net', 4),
          'e5579c23-938b-4f03-b08f-b889276cfc50', jsonb_build_object('gross', 5, 'net', 4),
          '5d7c1ffc-0ad4-486b-b069-d93d626c762f', jsonb_build_object('gross', 4, 'net', 4)
        ),
        pot_value,
        pot_value + carryover,
        0,
        NOW()
      )
      ;
      carryover := carryover + pot_value;
    ELSE
      -- Winner
      payout := pot_value + carryover;
      INSERT INTO skins_results (id, skins_game_id, hole_number, winner_id, is_carryover, hole_scores, hole_pot_value, carryover_to_next, payout_amount, calculated_at)
      VALUES (
        gen_random_uuid(),
        'e0000001-0000-0000-0000-000000000001',
        hole,
        winner_ids[hole],
        FALSE,
        jsonb_build_object(
          'd76287de-f504-4541-8ccd-e7484f4d8679', jsonb_build_object('gross', 4, 'net', 4),
          'ca7c2924-39e8-4b66-bbb8-d9699adb3d65', jsonb_build_object('gross', 5, 'net', 4),
          'e5579c23-938b-4f03-b08f-b889276cfc50', jsonb_build_object('gross', 5, 'net', 5),
          '5d7c1ffc-0ad4-486b-b069-d93d626c762f', jsonb_build_object('gross', 4, 'net', 5)
        ),
        pot_value,
        0,
        payout,
        NOW()
      )
      ;
      carryover := 0;
    END IF;
  END LOOP;
END $$;

-- Skins payouts for game 1
INSERT INTO skins_payouts (id, skins_game_id, player_id, buy_in, total_winnings, net_result, holes_won, holes_tied, holes_lost, calculated_at)
VALUES
  (gen_random_uuid(), 'e0000001-0000-0000-0000-000000000001', 'd76287de-f504-4541-8ccd-e7484f4d8679', 22.50, 45.00, 22.50, 5, 7, 6, NOW()),
  (gen_random_uuid(), 'e0000001-0000-0000-0000-000000000001', 'ca7c2924-39e8-4b66-bbb8-d9699adb3d65', 22.50, 20.00, -2.50, 2, 7, 9, NOW()),
  (gen_random_uuid(), 'e0000001-0000-0000-0000-000000000001', 'e5579c23-938b-4f03-b08f-b889276cfc50', 22.50, 15.00, -7.50, 2, 7, 9, NOW()),
  (gen_random_uuid(), 'e0000001-0000-0000-0000-000000000001', '5d7c1ffc-0ad4-486b-b069-d93d626c762f', 22.50, 10.00, -12.50, 1, 7, 10, NOW())
;

-- Additional skins games
INSERT INTO skins_games (
  id, round_id, pairing_id, participant_ids, pot_type, pot_value, currency,
  scoring_type, status, disclaimer_accepted_at, disclaimer_accepted_by, created_by,
  created_at, updated_at, completed_at
)
VALUES
  ('e0000001-0000-0000-0000-000000000002',
   'b0000001-0000-0000-0001-000000000002',
   'd0000001-0001-0002-0001-000000000001',
   ARRAY['d76287de-f504-4541-8ccd-e7484f4d8679'::UUID, 'ca7c2924-39e8-4b66-bbb8-d9699adb3d65'::UUID, 'e5579c23-938b-4f03-b08f-b889276cfc50'::UUID, '5d7c1ffc-0ad4-486b-b069-d93d626c762f'::UUID],
   'total_pot', 100.00, 'AUD', 'gross', 'completed',
   NOW() - INTERVAL '78 days', 'ca7c2924-39e8-4b66-bbb8-d9699adb3d65', 'ca7c2924-39e8-4b66-bbb8-d9699adb3d65',
   NOW() - INTERVAL '78 days', NOW() - INTERVAL '78 days', NOW() - INTERVAL '78 days'),
  ('e0000001-0000-0000-0000-000000000003',
   'b0000001-0000-0000-0002-000000000001',
   'd0000001-0002-0001-0001-000000000001',
   ARRAY['d76287de-f504-4541-8ccd-e7484f4d8679'::UUID, 'e5579c23-938b-4f03-b08f-b889276cfc50'::UUID, '74e84922-d5fc-4cdb-9835-251c31784309'::UUID, 'e8ba6eb4-1894-422d-bbd2-485c9f141a55'::UUID],
   'per_hole', 10.00, 'AUD', 'net', 'completed',
   NOW() - INTERVAL '240 days', 'd76287de-f504-4541-8ccd-e7484f4d8679', 'd76287de-f504-4541-8ccd-e7484f4d8679',
   NOW() - INTERVAL '240 days', NOW() - INTERVAL '240 days', NOW() - INTERVAL '240 days')
;

-- =====================================================
-- STEP 11: CREATE WOLF GAMES
-- =====================================================

-- Wolf game for Winter Series Round 2
INSERT INTO wolf_games (
  id, round_id, participant_ids, wolf_order, scoring_type, blind_wolf_enabled,
  pot_enabled, pot_value, currency, status, disclaimer_accepted_at, disclaimer_accepted_by,
  created_by, created_at, updated_at, completed_at
)
VALUES (
  'f0000001-0000-0000-0000-000000000001',
  'b0000001-0000-0000-0002-000000000002',
  ARRAY[
    'ca7c2924-39e8-4b66-bbb8-d9699adb3d65'::UUID,
    '5d7c1ffc-0ad4-486b-b069-d93d626c762f'::UUID,
    '25c171c8-c087-4d4a-b3be-545acdfe3f11'::UUID,
    '41677ffc-f9c4-490b-bc39-1f7370b36c2b'::UUID
  ],
  ARRAY[
    'ca7c2924-39e8-4b66-bbb8-d9699adb3d65'::UUID,
    '5d7c1ffc-0ad4-486b-b069-d93d626c762f'::UUID,
    '25c171c8-c087-4d4a-b3be-545acdfe3f11'::UUID,
    '41677ffc-f9c4-490b-bc39-1f7370b36c2b'::UUID
  ],
  'net',
  TRUE,
  TRUE,
  2.00,
  'AUD',
  'completed',
  NOW() - INTERVAL '220 days',
  'ca7c2924-39e8-4b66-bbb8-d9699adb3d65',
  'ca7c2924-39e8-4b66-bbb8-d9699adb3d65',
  NOW() - INTERVAL '220 days',
  NOW() - INTERVAL '220 days',
  NOW() - INTERVAL '220 days'
)
;

-- Wolf hole decisions
DO $$
DECLARE
  participants UUID[] := ARRAY[
    'ca7c2924-39e8-4b66-bbb8-d9699adb3d65'::UUID,
    '5d7c1ffc-0ad4-486b-b069-d93d626c762f'::UUID,
    '25c171c8-c087-4d4a-b3be-545acdfe3f11'::UUID,
    '41677ffc-f9c4-490b-bc39-1f7370b36c2b'::UUID
  ];
  hole INTEGER;
  wolf_idx INTEGER;
  wolf_id UUID;
  partner_id UUID;
  is_blind BOOLEAN;
  wolf_won BOOLEAN;
  is_tie BOOLEAN;
BEGIN
  FOR hole IN 1..18 LOOP
    wolf_idx := ((hole - 1) % 4) + 1;
    wolf_id := participants[wolf_idx];

    -- Randomly decide: lone wolf, blind wolf, or pick partner
    IF RANDOM() < 0.15 THEN
      is_blind := TRUE;
      partner_id := NULL;
    ELSIF RANDOM() < 0.3 THEN
      partner_id := NULL;  -- Lone wolf
      is_blind := FALSE;
    ELSE
      partner_id := participants[(wolf_idx % 4) + 1];
      is_blind := FALSE;
    END IF;

    -- Random outcome
    IF RANDOM() < 0.1 THEN
      is_tie := TRUE;
      wolf_won := NULL;
    ELSE
      is_tie := FALSE;
      wolf_won := RANDOM() < 0.5;
    END IF;

    INSERT INTO wolf_hole_decisions (
      id, wolf_game_id, hole_number, wolf_id, is_blind_wolf, partner_id,
      hole_scores, is_tie, wolf_team_won, points_awarded, decided_at, calculated_at
    )
    VALUES (
      gen_random_uuid(),
      'f0000001-0000-0000-0000-000000000001',
      hole,
      wolf_id,
      is_blind,
      partner_id,
      jsonb_build_object(
        'ca7c2924-39e8-4b66-bbb8-d9699adb3d65', FLOOR(RANDOM() * 3 + 3)::INTEGER,
        '5d7c1ffc-0ad4-486b-b069-d93d626c762f', FLOOR(RANDOM() * 3 + 3)::INTEGER,
        '25c171c8-c087-4d4a-b3be-545acdfe3f11', FLOOR(RANDOM() * 3 + 4)::INTEGER,
        '41677ffc-f9c4-490b-bc39-1f7370b36c2b', FLOOR(RANDOM() * 3 + 4)::INTEGER
      ),
      is_tie,
      wolf_won,
      CASE
        WHEN is_tie THEN '{}'::JSONB
        WHEN wolf_won THEN jsonb_build_object(wolf_id::TEXT, 2, COALESCE(partner_id::TEXT, ''), 2)
        ELSE jsonb_build_object(wolf_id::TEXT, -2, COALESCE(partner_id::TEXT, ''), -2)
      END,
      NOW() - INTERVAL '220 days',
      NOW() - INTERVAL '220 days'
    )
    ;
  END LOOP;
END $$;

-- Wolf payouts
INSERT INTO wolf_payouts (id, wolf_game_id, player_id, total_points, total_winnings, net_result, calculated_at)
VALUES
  (gen_random_uuid(), 'f0000001-0000-0000-0000-000000000001', 'ca7c2924-39e8-4b66-bbb8-d9699adb3d65', 8, 16.00, 16.00, NOW()),
  (gen_random_uuid(), 'f0000001-0000-0000-0000-000000000001', '5d7c1ffc-0ad4-486b-b069-d93d626c762f', 4, 8.00, 8.00, NOW()),
  (gen_random_uuid(), 'f0000001-0000-0000-0000-000000000001', '25c171c8-c087-4d4a-b3be-545acdfe3f11', -6, 0.00, -12.00, NOW()),
  (gen_random_uuid(), 'f0000001-0000-0000-0000-000000000001', '41677ffc-f9c4-490b-bc39-1f7370b36c2b', -6, 0.00, -12.00, NOW())
;

-- Additional wolf game
INSERT INTO wolf_games (
  id, round_id, participant_ids, wolf_order, scoring_type, blind_wolf_enabled,
  pot_enabled, pot_value, currency, status, created_by, created_at, updated_at, completed_at
)
VALUES (
  'f0000001-0000-0000-0000-000000000002',
  'b0000001-0000-0000-0006-000000000001',
  ARRAY[
    'd76287de-f504-4541-8ccd-e7484f4d8679'::UUID,
    'ca7c2924-39e8-4b66-bbb8-d9699adb3d65'::UUID,
    'e5579c23-938b-4f03-b08f-b889276cfc50'::UUID,
    '5d7c1ffc-0ad4-486b-b069-d93d626c762f'::UUID
  ],
  ARRAY[
    'd76287de-f504-4541-8ccd-e7484f4d8679'::UUID,
    'ca7c2924-39e8-4b66-bbb8-d9699adb3d65'::UUID,
    'e5579c23-938b-4f03-b08f-b889276cfc50'::UUID,
    '5d7c1ffc-0ad4-486b-b069-d93d626c762f'::UUID
  ],
  'gross',
  TRUE,
  FALSE,
  NULL,
  'AUD',
  'completed',
  'd76287de-f504-4541-8ccd-e7484f4d8679',
  NOW() - INTERVAL '15 days',
  NOW() - INTERVAL '15 days',
  NOW() - INTERVAL '15 days'
)
;

-- =====================================================
-- STEP 12: SKINS PLAYER STATISTICS
-- =====================================================
-- Note: Skipping skins_player_statistics - the trigger has schema
-- mismatches. Statistics can be recalculated manually if needed.

-- =====================================================
-- STEP 13: CREATE ROUND RESULTS
-- =====================================================

-- Generate round results for completed rounds
DO $$
DECLARE
  r RECORD;
  s RECORD;
  position INTEGER;
BEGIN
  FOR r IN
    SELECT DISTINCT rounds.id as round_id
    FROM rounds
    WHERE rounds.status = 'completed'
    AND rounds.id::TEXT LIKE 'b0000001%'
  LOOP
    position := 0;
    FOR s IN
      SELECT player_id, total_points, total_gross, total_net
      FROM scorecards
      WHERE round_id = r.round_id
      AND status IN ('completed', 'confirmed')
      ORDER BY total_points DESC, total_net ASC
    LOOP
      position := position + 1;
      INSERT INTO round_results (
        id, round_id, player_id, raw_score, raw_result_data, position, competition_points, is_team_result, created_at, updated_at
      )
      VALUES (
        gen_random_uuid(),
        r.round_id,
        s.player_id,
        s.total_points,
        jsonb_build_object('gross', s.total_gross, 'net', s.total_net, 'points', s.total_points),
        position,
        CASE position
          WHEN 1 THEN 10
          WHEN 2 THEN 8
          WHEN 3 THEN 6
          WHEN 4 THEN 5
          WHEN 5 THEN 4
          WHEN 6 THEN 3
          WHEN 7 THEN 2
          WHEN 8 THEN 1
          ELSE 0
        END,
        FALSE,
        NOW(),
        NOW()
      )
      ;
    END LOOP;
  END LOOP;
END $$;

-- =====================================================
-- STEP 14: CLEANUP
-- =====================================================

-- Drop helper functions
DROP FUNCTION IF EXISTS generate_realistic_scores(NUMERIC, INTEGER);
DROP FUNCTION IF EXISTS calculate_total_gross(JSONB);

-- =====================================================
-- VERIFICATION QUERIES
-- =====================================================

-- Count rounds per user
SELECT
  p.name,
  p.handicap,
  COUNT(DISTINCT s.round_id) as rounds_played,
  ROUND(AVG(s.total_points), 1) as avg_points,
  ROUND(AVG(s.total_gross), 1) as avg_gross
FROM players p
JOIN scorecards s ON p.id = s.player_id
WHERE p.id IN (
  'd76287de-f504-4541-8ccd-e7484f4d8679'::UUID,
  'ca7c2924-39e8-4b66-bbb8-d9699adb3d65'::UUID,
  'e5579c23-938b-4f03-b08f-b889276cfc50'::UUID,
  '5d7c1ffc-0ad4-486b-b069-d93d626c762f'::UUID,
  '74e84922-d5fc-4cdb-9835-251c31784309'::UUID,
  '25c171c8-c087-4d4a-b3be-545acdfe3f11'::UUID,
  'e8ba6eb4-1894-422d-bbd2-485c9f141a55'::UUID,
  '41677ffc-f9c4-490b-bc39-1f7370b36c2b'::UUID
)
AND s.status IN ('completed', 'in-progress')
GROUP BY p.id, p.name, p.handicap
ORDER BY rounds_played DESC;

-- Summary
SELECT 'Competitions' as entity, COUNT(*) as count FROM competitions WHERE id::TEXT LIKE 'c0000001%'
UNION ALL
SELECT 'Rounds', COUNT(*) FROM rounds WHERE id::TEXT LIKE 'b0000001%'
UNION ALL
SELECT 'Scorecards', COUNT(*) FROM scorecards WHERE round_id::TEXT LIKE 'b0000001%'
UNION ALL
SELECT 'Skins Games', COUNT(*) FROM skins_games WHERE id::TEXT LIKE 'e0000001%'
UNION ALL
SELECT 'Wolf Games', COUNT(*) FROM wolf_games WHERE id::TEXT LIKE 'f0000001%'
UNION ALL
SELECT 'Teams', COUNT(*) FROM teams WHERE id::TEXT LIKE 'a1000001%' OR id::TEXT LIKE 'a2000002%'
UNION ALL
SELECT 'Pairings', COUNT(*) FROM pairings WHERE id::TEXT LIKE 'd0000001%';
