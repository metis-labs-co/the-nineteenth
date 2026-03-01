-- =====================================================
-- SEED: KNOCKOUT TOURNAMENT BRACKET DATA
-- =====================================================
-- Creates a complete 8-player knockout tournament with:
--   - Main bracket (single elimination): QFs, SFs, Final
--   - Full consolation bracket: Con R1, Con R2, Con Final
--   - Mixed match statuses for UI testing
--
-- Player IDs (seeded by handicap):
--   Seed 1: df045f29-718a-41b5-ac4a-9a8dbf26c6cb (Riley, 8.5 hcp)
--   Seed 2: 41677ffc-f9c4-490b-bc39-1f7370b36c2b (Sam, 12.5 hcp)
--   Seed 3: 25c171c8-c087-4d4a-b3be-545acdfe3f11 (Tom, 15.0 hcp)
--   Seed 4: 0bfbb37e-3daa-47ee-a9bd-df30b1ac0930 (Jake, 16.0 hcp)
--   Seed 5: 9f76496a-36bd-417a-bbb2-0c0d450a557b (Ryan, 20.0 hcp)
--   Seed 6: 74e84922-d5fc-4cdb-9835-251c31784309 (Morgan, 22.5 hcp)
--   Sam K: e8ba6eb4-1894-422d-bbd2-485c9f141a55 (Sam K, 10.7 hcp)
--   Seed 8: 5d7c1ffc-0ad4-486b-b069-d93d626c762f (Taylor, 28.0 hcp)
--
-- Course IDs (from test_data.sql):
--   Kingston Heath: a9868535-5d03-4c6e-8e69-9d849eafcdf1
--   Royal Melbourne: 54ecbd4c-deba-46f7-ab29-e6a4e3895fa7
--   Victoria GC:    e12e2d7f-31f4-4d6a-9446-4d992672e9d9
--
-- Creates:
--   - 1 knockout competition (organizer: Sam)
--   - 8 competition_players
--   - 3 rounds (one per match day)
--   - 12 pairings (one per match)
--   - 12 knockout_matches (7 main + 5 consolation)
--
-- Bracket state:
--   Main: QFs completed, SFs completed, Final in_progress
--   Consolation: R1 completed, R2 completed, Final ready
-- =====================================================


-- =====================================================
-- STEP 0: CLEAN UP EXISTING SEED DATA
-- =====================================================

DO $$
DECLARE
  v_comp_id UUID := 'ffff0001-0001-0001-0001-000000000001';
BEGIN
  -- Delete knockout matches first (references rounds, pairings)
  DELETE FROM knockout_matches WHERE competition_id = v_comp_id;
  -- Delete pairings (references rounds)
  DELETE FROM pairings WHERE round_id IN (
    SELECT id FROM rounds WHERE competition_id = v_comp_id
  );
  -- Delete rounds
  DELETE FROM rounds WHERE competition_id = v_comp_id;
  -- Delete competition players
  DELETE FROM competition_players WHERE competition_id = v_comp_id;
  -- Delete competition
  DELETE FROM competitions WHERE id = v_comp_id;
END $$;


-- =====================================================
-- STEP 1: COMPETITION
-- =====================================================

INSERT INTO competitions (
  id, name, description, competition_type, start_date,
  handicap_system, organizer_id, status, invite_code,
  team_mode, knockout_config
) VALUES (
  'ffff0001-0001-0001-0001-000000000001',
  'Summer Knockout Championship',
  'An 8-player single-elimination knockout with full consolation bracket. Match play format across Melbourne''s best courses.',
  'knockout',
  '2026-02-07'::DATE,
  'honor',
  '41677ffc-f9c4-490b-bc39-1f7370b36c2b', -- Sam is organizer
  'in-progress',
  'KO-SUM26',
  'none',
  '{"playerCount": 8, "seedingMethod": "handicap", "bracketGenerated": true}'::JSONB
)
ON CONFLICT (id) DO NOTHING;


-- =====================================================
-- STEP 2: COMPETITION PLAYERS (8 players)
-- =====================================================

INSERT INTO competition_players (competition_id, player_id, status) VALUES
  ('ffff0001-0001-0001-0001-000000000001', 'df045f29-718a-41b5-ac4a-9a8dbf26c6cb', 'accepted'), -- Riley (seed 1)
  ('ffff0001-0001-0001-0001-000000000001', '41677ffc-f9c4-490b-bc39-1f7370b36c2b', 'accepted'), -- Sam (seed 2)
  ('ffff0001-0001-0001-0001-000000000001', '25c171c8-c087-4d4a-b3be-545acdfe3f11', 'accepted'), -- Tom (seed 3)
  ('ffff0001-0001-0001-0001-000000000001', '0bfbb37e-3daa-47ee-a9bd-df30b1ac0930', 'accepted'), -- Jake (seed 4)
  ('ffff0001-0001-0001-0001-000000000001', '9f76496a-36bd-417a-bbb2-0c0d450a557b', 'accepted'), -- Ryan (seed 5)
  ('ffff0001-0001-0001-0001-000000000001', '74e84922-d5fc-4cdb-9835-251c31784309', 'accepted'), -- Morgan (seed 6)
  ('ffff0001-0001-0001-0001-000000000001', 'e8ba6eb4-1894-422d-bbd2-485c9f141a55', 'accepted'), -- Sam K
  ('ffff0001-0001-0001-0001-000000000001', '5d7c1ffc-0ad4-486b-b069-d93d626c762f', 'accepted')  -- Taylor (seed 8)
ON CONFLICT DO NOTHING;


-- =====================================================
-- STEP 3: ROUNDS (3 match days)
-- =====================================================
-- Round 1: Quarter Finals + Consolation R1
-- Round 2: Semi Finals + Consolation R2
-- Round 3: Final + Consolation Final

INSERT INTO rounds (id, competition_id, round_number, course_id, date, game_type, status, is_team_round, team_format) VALUES
  (
    'ffff0001-0001-0001-0001-000000000011',
    'ffff0001-0001-0001-0001-000000000001',
    1,
    'a9868535-5d03-4c6e-8e69-9d849eafcdf1', -- Kingston Heath
    '2026-02-07'::DATE,
    'match-play',
    'completed',
    FALSE,
    NULL
  ),
  (
    'ffff0001-0001-0001-0001-000000000012',
    'ffff0001-0001-0001-0001-000000000001',
    2,
    '54ecbd4c-deba-46f7-ab29-e6a4e3895fa7', -- Royal Melbourne
    '2026-02-14'::DATE,
    'match-play',
    'completed',
    FALSE,
    NULL
  ),
  (
    'ffff0001-0001-0001-0001-000000000013',
    'ffff0001-0001-0001-0001-000000000001',
    3,
    'e12e2d7f-31f4-4d6a-9446-4d992672e9d9', -- Victoria GC
    '2026-02-21'::DATE,
    'match-play',
    'in-progress',
    FALSE,
    NULL
  )
ON CONFLICT (id) DO NOTHING;


-- =====================================================
-- STEP 4: PAIRINGS (one per match)
-- =====================================================
-- Main bracket pairings

INSERT INTO pairings (id, round_id, player_ids) VALUES
  -- QF pairings (Round 1)
  ('ffff0001-0001-0001-0001-000000000021', 'ffff0001-0001-0001-0001-000000000011',
   ARRAY['df045f29-718a-41b5-ac4a-9a8dbf26c6cb', '5d7c1ffc-0ad4-486b-b069-d93d626c762f']::uuid[]),  -- QF0: Riley vs Taylor
  ('ffff0001-0001-0001-0001-000000000022', 'ffff0001-0001-0001-0001-000000000011',
   ARRAY['0bfbb37e-3daa-47ee-a9bd-df30b1ac0930', '9f76496a-36bd-417a-bbb2-0c0d450a557b']::uuid[]),  -- QF1: Jake vs Ryan
  ('ffff0001-0001-0001-0001-000000000023', 'ffff0001-0001-0001-0001-000000000011',
   ARRAY['41677ffc-f9c4-490b-bc39-1f7370b36c2b', 'e8ba6eb4-1894-422d-bbd2-485c9f141a55']::uuid[]),  -- QF2: Sam vs Sam K
  ('ffff0001-0001-0001-0001-000000000024', 'ffff0001-0001-0001-0001-000000000011',
   ARRAY['25c171c8-c087-4d4a-b3be-545acdfe3f11', '74e84922-d5fc-4cdb-9835-251c31784309']::uuid[]),  -- QF3: Tom vs Morgan

  -- SF pairings (Round 2)
  ('ffff0001-0001-0001-0001-000000000025', 'ffff0001-0001-0001-0001-000000000012',
   ARRAY['df045f29-718a-41b5-ac4a-9a8dbf26c6cb', '0bfbb37e-3daa-47ee-a9bd-df30b1ac0930']::uuid[]),  -- SF0: Riley vs Jake
  ('ffff0001-0001-0001-0001-000000000026', 'ffff0001-0001-0001-0001-000000000012',
   ARRAY['41677ffc-f9c4-490b-bc39-1f7370b36c2b', '25c171c8-c087-4d4a-b3be-545acdfe3f11']::uuid[]),  -- SF1: Sam vs Tom

  -- Final pairing (Round 3)
  ('ffff0001-0001-0001-0001-000000000027', 'ffff0001-0001-0001-0001-000000000013',
   ARRAY['df045f29-718a-41b5-ac4a-9a8dbf26c6cb', '41677ffc-f9c4-490b-bc39-1f7370b36c2b']::uuid[]),  -- Final: Riley vs Sam

  -- Consolation R1 pairings (Round 1)
  ('ffff0001-0001-0001-0001-000000000031', 'ffff0001-0001-0001-0001-000000000011',
   ARRAY['5d7c1ffc-0ad4-486b-b069-d93d626c762f', '9f76496a-36bd-417a-bbb2-0c0d450a557b']::uuid[]),  -- Con R1-0: Taylor vs Ryan
  ('ffff0001-0001-0001-0001-000000000032', 'ffff0001-0001-0001-0001-000000000011',
   ARRAY['e8ba6eb4-1894-422d-bbd2-485c9f141a55', '74e84922-d5fc-4cdb-9835-251c31784309']::uuid[]),  -- Con R1-1: Sam K vs Morgan

  -- Consolation R2 pairings (Round 2)
  ('ffff0001-0001-0001-0001-000000000033', 'ffff0001-0001-0001-0001-000000000012',
   ARRAY['0bfbb37e-3daa-47ee-a9bd-df30b1ac0930', '9f76496a-36bd-417a-bbb2-0c0d450a557b']::uuid[]),  -- Con R2-0: Jake vs Ryan
  ('ffff0001-0001-0001-0001-000000000034', 'ffff0001-0001-0001-0001-000000000012',
   ARRAY['25c171c8-c087-4d4a-b3be-545acdfe3f11', '74e84922-d5fc-4cdb-9835-251c31784309']::uuid[]),  -- Con R2-1: Tom vs Morgan

  -- Consolation Final pairing (Round 3)
  ('ffff0001-0001-0001-0001-000000000035', 'ffff0001-0001-0001-0001-000000000013',
   ARRAY['0bfbb37e-3daa-47ee-a9bd-df30b1ac0930', '25c171c8-c087-4d4a-b3be-545acdfe3f11']::uuid[])   -- Con Final: Jake vs Tom
ON CONFLICT (id) DO NOTHING;


-- =====================================================
-- STEP 5: KNOCKOUT MATCHES - MAIN BRACKET
-- =====================================================
-- Standard 8-player seeding: 1v8, 4v5, 2v7, 3v6
-- Scores are match-play holes up (winner) vs 0 (loser)
--
-- Bracket flow:
--   QF0 (1v8) ──┐
--                ├── SF0 ──┐
--   QF1 (4v5) ──┘         │
--                          ├── FINAL
--   QF2 (2v7) ──┐         │
--                ├── SF1 ──┘
--   QF3 (3v6) ──┘

-- We need to insert matches in reverse dependency order (later stages first)
-- so that next_match_id and consolation_match_id references exist.

-- Insert Final first (no next_match)
INSERT INTO knockout_matches (
  id, competition_id, round_id, bracket_type, bracket_position, stage,
  player1_id, player2_id, seed1, seed2,
  winner_id, loser_id, player1_score, player2_score,
  next_match_id, next_match_slot,
  consolation_match_id, consolation_match_slot,
  status, pairing_id
) VALUES (
  'ffff0001-0001-0001-0001-000000000107', -- M-FINAL
  'ffff0001-0001-0001-0001-000000000001',
  'ffff0001-0001-0001-0001-000000000013', -- Round 3
  'main', 0, 2,
  'df045f29-718a-41b5-ac4a-9a8dbf26c6cb', -- Riley (from SF0)
  '41677ffc-f9c4-490b-bc39-1f7370b36c2b', -- Sam (from SF1)
  NULL, NULL,
  NULL, NULL, NULL, NULL,       -- in_progress: no winner yet
  NULL, NULL,                   -- no next match (this IS the final)
  NULL, NULL,                   -- no consolation routing for final
  'in_progress',
  'ffff0001-0001-0001-0001-000000000027'
);

-- Insert Consolation Final (no next_match)
INSERT INTO knockout_matches (
  id, competition_id, round_id, bracket_type, bracket_position, stage,
  player1_id, player2_id, seed1, seed2,
  winner_id, loser_id, player1_score, player2_score,
  next_match_id, next_match_slot,
  consolation_match_id, consolation_match_slot,
  status, pairing_id
) VALUES (
  'ffff0001-0001-0001-0001-000000000205', -- C-FINAL
  'ffff0001-0001-0001-0001-000000000001',
  'ffff0001-0001-0001-0001-000000000013', -- Round 3
  'consolation', 0, 3,
  '0bfbb37e-3daa-47ee-a9bd-df30b1ac0930', -- Jake (from Con R2-0)
  '25c171c8-c087-4d4a-b3be-545acdfe3f11', -- Tom (from Con R2-1)
  NULL, NULL,
  NULL, NULL, NULL, NULL,       -- ready: no winner yet
  NULL, NULL,                   -- no next match (consolation final)
  NULL, NULL,
  'ready',
  'ffff0001-0001-0001-0001-000000000035'
);

-- Insert Consolation R2 matches (next → Con Final)
INSERT INTO knockout_matches (
  id, competition_id, round_id, bracket_type, bracket_position, stage,
  player1_id, player2_id, seed1, seed2,
  winner_id, loser_id, player1_score, player2_score,
  next_match_id, next_match_slot,
  consolation_match_id, consolation_match_slot,
  status, pairing_id
) VALUES
(
  'ffff0001-0001-0001-0001-000000000203', -- C-R2-0
  'ffff0001-0001-0001-0001-000000000001',
  'ffff0001-0001-0001-0001-000000000012', -- Round 2
  'consolation', 0, 2,
  '0bfbb37e-3daa-47ee-a9bd-df30b1ac0930', -- Jake (SF0 loser, slot 1)
  '9f76496a-36bd-417a-bbb2-0c0d450a557b', -- Ryan (Con R1-0 winner, slot 2)
  NULL, NULL,
  '0bfbb37e-3daa-47ee-a9bd-df30b1ac0930', -- Jake wins
  '9f76496a-36bd-417a-bbb2-0c0d450a557b', -- Ryan loses
  2, 0,                                     -- Jake 2 up
  'ffff0001-0001-0001-0001-000000000205', 1, -- winner → Con Final slot 1
  NULL, NULL,
  'completed',
  'ffff0001-0001-0001-0001-000000000033'
),
(
  'ffff0001-0001-0001-0001-000000000204', -- C-R2-1
  'ffff0001-0001-0001-0001-000000000001',
  'ffff0001-0001-0001-0001-000000000012', -- Round 2
  'consolation', 1, 2,
  '25c171c8-c087-4d4a-b3be-545acdfe3f11', -- Tom (SF1 loser, slot 1)
  '74e84922-d5fc-4cdb-9835-251c31784309', -- Morgan (Con R1-1 winner, slot 2)
  NULL, NULL,
  '25c171c8-c087-4d4a-b3be-545acdfe3f11', -- Tom wins
  '74e84922-d5fc-4cdb-9835-251c31784309', -- Morgan loses
  3, 0,                                     -- Tom 3&1
  'ffff0001-0001-0001-0001-000000000205', 2, -- winner → Con Final slot 2
  NULL, NULL,
  'completed',
  'ffff0001-0001-0001-0001-000000000034'
);

-- Insert Consolation R1 matches (next → Con R2)
INSERT INTO knockout_matches (
  id, competition_id, round_id, bracket_type, bracket_position, stage,
  player1_id, player2_id, seed1, seed2,
  winner_id, loser_id, player1_score, player2_score,
  next_match_id, next_match_slot,
  consolation_match_id, consolation_match_slot,
  status, pairing_id
) VALUES
(
  'ffff0001-0001-0001-0001-000000000201', -- C-R1-0
  'ffff0001-0001-0001-0001-000000000001',
  'ffff0001-0001-0001-0001-000000000011', -- Round 1
  'consolation', 0, 1,
  '5d7c1ffc-0ad4-486b-b069-d93d626c762f', -- Taylor (QF0 loser, slot 1)
  '9f76496a-36bd-417a-bbb2-0c0d450a557b', -- Ryan (QF1 loser, slot 2)
  NULL, NULL,
  '9f76496a-36bd-417a-bbb2-0c0d450a557b', -- Ryan wins
  '5d7c1ffc-0ad4-486b-b069-d93d626c762f', -- Taylor loses
  0, 2,                                     -- Ryan 2&1
  'ffff0001-0001-0001-0001-000000000203', 2, -- winner → Con R2-0 slot 2
  NULL, NULL,
  'completed',
  'ffff0001-0001-0001-0001-000000000031'
),
(
  'ffff0001-0001-0001-0001-000000000202', -- C-R1-1
  'ffff0001-0001-0001-0001-000000000001',
  'ffff0001-0001-0001-0001-000000000011', -- Round 1
  'consolation', 1, 1,
  'e8ba6eb4-1894-422d-bbd2-485c9f141a55', -- Sam K (QF2 loser, slot 1)
  '74e84922-d5fc-4cdb-9835-251c31784309', -- Morgan (QF3 loser, slot 2)
  NULL, NULL,
  '74e84922-d5fc-4cdb-9835-251c31784309', -- Morgan wins
  'e8ba6eb4-1894-422d-bbd2-485c9f141a55', -- Sam K loses
  0, 3,                                     -- Morgan 3&2
  'ffff0001-0001-0001-0001-000000000204', 2, -- winner → Con R2-1 slot 2
  NULL, NULL,
  'completed',
  'ffff0001-0001-0001-0001-000000000032'
);

-- Insert Semi Finals (next → Final, loser → Con R2)
INSERT INTO knockout_matches (
  id, competition_id, round_id, bracket_type, bracket_position, stage,
  player1_id, player2_id, seed1, seed2,
  winner_id, loser_id, player1_score, player2_score,
  next_match_id, next_match_slot,
  consolation_match_id, consolation_match_slot,
  status, pairing_id
) VALUES
(
  'ffff0001-0001-0001-0001-000000000105', -- M-SF0
  'ffff0001-0001-0001-0001-000000000001',
  'ffff0001-0001-0001-0001-000000000012', -- Round 2
  'main', 0, 1,
  'df045f29-718a-41b5-ac4a-9a8dbf26c6cb', -- Riley (from QF0)
  '0bfbb37e-3daa-47ee-a9bd-df30b1ac0930', -- Jake (from QF1)
  1, 4,                                     -- seeds
  'df045f29-718a-41b5-ac4a-9a8dbf26c6cb', -- Riley wins
  '0bfbb37e-3daa-47ee-a9bd-df30b1ac0930', -- Jake loses
  3, 0,                                     -- Riley 3&1
  'ffff0001-0001-0001-0001-000000000107', 1, -- winner → Final slot 1
  'ffff0001-0001-0001-0001-000000000203', 1, -- loser → Con R2-0 slot 1
  'completed',
  'ffff0001-0001-0001-0001-000000000025'
),
(
  'ffff0001-0001-0001-0001-000000000106', -- M-SF1
  'ffff0001-0001-0001-0001-000000000001',
  'ffff0001-0001-0001-0001-000000000012', -- Round 2
  'main', 1, 1,
  '41677ffc-f9c4-490b-bc39-1f7370b36c2b', -- Sam (from QF2)
  '25c171c8-c087-4d4a-b3be-545acdfe3f11', -- Tom (from QF3)
  2, 3,                                     -- seeds
  '41677ffc-f9c4-490b-bc39-1f7370b36c2b', -- Sam wins
  '25c171c8-c087-4d4a-b3be-545acdfe3f11', -- Tom loses
  1, 0,                                     -- Sam 1 up (close match!)
  'ffff0001-0001-0001-0001-000000000107', 2, -- winner → Final slot 2
  'ffff0001-0001-0001-0001-000000000204', 1, -- loser → Con R2-1 slot 1
  'completed',
  'ffff0001-0001-0001-0001-000000000026'
);

-- Insert Quarter Finals (next → SFs, loser → Con R1)
INSERT INTO knockout_matches (
  id, competition_id, round_id, bracket_type, bracket_position, stage,
  player1_id, player2_id, seed1, seed2,
  winner_id, loser_id, player1_score, player2_score,
  next_match_id, next_match_slot,
  consolation_match_id, consolation_match_slot,
  status, pairing_id
) VALUES
(
  'ffff0001-0001-0001-0001-000000000101', -- M-QF0: Seed 1 vs Seed 8
  'ffff0001-0001-0001-0001-000000000001',
  'ffff0001-0001-0001-0001-000000000011', -- Round 1
  'main', 0, 0,
  'df045f29-718a-41b5-ac4a-9a8dbf26c6cb', -- Riley (seed 1)
  '5d7c1ffc-0ad4-486b-b069-d93d626c762f', -- Taylor (seed 8)
  1, 8,
  'df045f29-718a-41b5-ac4a-9a8dbf26c6cb', -- Riley wins
  '5d7c1ffc-0ad4-486b-b069-d93d626c762f', -- Taylor loses
  4, 0,                                     -- Riley 4&3
  'ffff0001-0001-0001-0001-000000000105', 1, -- winner → SF0 slot 1
  'ffff0001-0001-0001-0001-000000000201', 1, -- loser → Con R1-0 slot 1
  'completed',
  'ffff0001-0001-0001-0001-000000000021'
),
(
  'ffff0001-0001-0001-0001-000000000102', -- M-QF1: Seed 4 vs Seed 5
  'ffff0001-0001-0001-0001-000000000001',
  'ffff0001-0001-0001-0001-000000000011', -- Round 1
  'main', 1, 0,
  '0bfbb37e-3daa-47ee-a9bd-df30b1ac0930', -- Jake (seed 4)
  '9f76496a-36bd-417a-bbb2-0c0d450a557b', -- Ryan (seed 5)
  4, 5,
  '0bfbb37e-3daa-47ee-a9bd-df30b1ac0930', -- Jake wins
  '9f76496a-36bd-417a-bbb2-0c0d450a557b', -- Ryan loses
  2, 0,                                     -- Jake 2&1
  'ffff0001-0001-0001-0001-000000000105', 2, -- winner → SF0 slot 2
  'ffff0001-0001-0001-0001-000000000201', 2, -- loser → Con R1-0 slot 2
  'completed',
  'ffff0001-0001-0001-0001-000000000022'
),
(
  'ffff0001-0001-0001-0001-000000000103', -- M-QF2: Seed 2 vs Sam K
  'ffff0001-0001-0001-0001-000000000001',
  'ffff0001-0001-0001-0001-000000000011', -- Round 1
  'main', 2, 0,
  '41677ffc-f9c4-490b-bc39-1f7370b36c2b', -- Sam (seed 2)
  'e8ba6eb4-1894-422d-bbd2-485c9f141a55', -- Sam K
  2, 7,
  '41677ffc-f9c4-490b-bc39-1f7370b36c2b', -- Sam wins
  'e8ba6eb4-1894-422d-bbd2-485c9f141a55', -- Sam K loses
  5, 0,                                     -- Sam 5&3
  'ffff0001-0001-0001-0001-000000000106', 1, -- winner → SF1 slot 1
  'ffff0001-0001-0001-0001-000000000202', 1, -- loser → Con R1-1 slot 1
  'completed',
  'ffff0001-0001-0001-0001-000000000023'
),
(
  'ffff0001-0001-0001-0001-000000000104', -- M-QF3: Seed 3 vs Seed 6
  'ffff0001-0001-0001-0001-000000000001',
  'ffff0001-0001-0001-0001-000000000011', -- Round 1
  'main', 3, 0,
  '25c171c8-c087-4d4a-b3be-545acdfe3f11', -- Tom (seed 3)
  '74e84922-d5fc-4cdb-9835-251c31784309', -- Morgan (seed 6)
  3, 6,
  '25c171c8-c087-4d4a-b3be-545acdfe3f11', -- Tom wins
  '74e84922-d5fc-4cdb-9835-251c31784309', -- Morgan loses
  2, 0,                                     -- Tom 2 up
  'ffff0001-0001-0001-0001-000000000106', 2, -- winner → SF1 slot 2
  'ffff0001-0001-0001-0001-000000000202', 2, -- loser → Con R1-1 slot 2
  'completed',
  'ffff0001-0001-0001-0001-000000000024'
);


-- =====================================================
-- VERIFICATION QUERIES
-- =====================================================

-- Overall match summary
SELECT
  bracket_type,
  stage,
  bracket_position AS pos,
  status,
  p1.name AS player1,
  km.seed1,
  p2.name AS player2,
  km.seed2,
  km.player1_score AS p1_score,
  km.player2_score AS p2_score,
  w.name AS winner
FROM knockout_matches km
LEFT JOIN players p1 ON km.player1_id = p1.id
LEFT JOIN players p2 ON km.player2_id = p2.id
LEFT JOIN players w  ON km.winner_id = w.id
WHERE km.competition_id = 'ffff0001-0001-0001-0001-000000000001'
ORDER BY bracket_type, stage, bracket_position;

-- Match counts by bracket and status
SELECT
  bracket_type,
  status,
  COUNT(*) AS match_count
FROM knockout_matches
WHERE competition_id = 'ffff0001-0001-0001-0001-000000000001'
GROUP BY bracket_type, status
ORDER BY bracket_type, status;

-- Competition summary
SELECT
  c.name AS competition,
  c.competition_type,
  c.status,
  c.knockout_config,
  COUNT(DISTINCT cp.player_id) AS players,
  COUNT(DISTINCT r.id) AS rounds,
  COUNT(DISTINCT km.id) AS matches
FROM competitions c
LEFT JOIN competition_players cp ON cp.competition_id = c.id
LEFT JOIN rounds r ON r.competition_id = c.id
LEFT JOIN knockout_matches km ON km.competition_id = c.id
WHERE c.id = 'ffff0001-0001-0001-0001-000000000001'
GROUP BY c.id;
