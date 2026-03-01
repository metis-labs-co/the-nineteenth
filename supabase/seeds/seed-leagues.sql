-- =====================================================
-- SEED: LEAGUES, STANDALONE ROUNDS & TAGGED ROUNDS
-- =====================================================
-- For 6 test users:
--   U1: e8ba6eb4-1894-422d-bbd2-485c9f141a55
--   U2: 0bfbb37e-3daa-47ee-a9bd-df30b1ac0930
--   U3: e5579c23-938b-4f03-b08f-b889276cfc50
--   U4: ca7c2924-39e8-4b66-bbb8-d9699adb3d65
--   U5: 25c171c8-c087-4d4a-b3be-545acdfe3f11
--   U6: 9f76496a-36bd-417a-bbb2-0c0d450a557b
--
-- Creates:
--   - 3 leagues (2 active, 1 archived)
--   - 6 standalone rounds per user (4 completed, 2 in-progress)
--   - Scorecards with handicap differentials from real course data
--   - Tagged rounds for each user in the leagues
--
-- Uses 11 real GolfAPI-imported course IDs with dynamic
-- hole data and tee ratings lookup.
-- =====================================================

-- =====================================================
-- STEP 0: CLEAN UP ALL EXISTING DATA FOR SEED USERS
-- =====================================================
-- Remove ALL data for the 6 test users, not just seed-prefixed data.
DO $$
DECLARE
  seed_users UUID[] := ARRAY[
    'e8ba6eb4-1894-422d-bbd2-485c9f141a55'::UUID,
    '0bfbb37e-3daa-47ee-a9bd-df30b1ac0930'::UUID,
    'e5579c23-938b-4f03-b08f-b889276cfc50'::UUID,
    'ca7c2924-39e8-4b66-bbb8-d9699adb3d65'::UUID,
    '25c171c8-c087-4d4a-b3be-545acdfe3f11'::UUID,
    '9f76496a-36bd-417a-bbb2-0c0d450a557b'::UUID
  ];
BEGIN
  -- League data
  DELETE FROM league_rounds WHERE player_id = ANY(seed_users);
  DELETE FROM league_players WHERE player_id = ANY(seed_users);
  DELETE FROM leagues WHERE created_by = ANY(seed_users);

  -- Skins/wolf data (skins_results linked via skins_game_id, not round_id)
  DELETE FROM skins_payouts WHERE player_id = ANY(seed_users);
  DELETE FROM skins_player_statistics WHERE player_id = ANY(seed_users);
  DELETE FROM skins_results WHERE skins_game_id IN (
    SELECT id FROM skins_games WHERE round_id IN (SELECT id FROM rounds WHERE user_id = ANY(seed_users))
  );
  DELETE FROM skins_games WHERE round_id IN (SELECT id FROM rounds WHERE user_id = ANY(seed_users));

  -- Scoring data (score_entries, score_mismatches, score_submission_status cascade from scorecards)
  DELETE FROM scorecards WHERE player_id = ANY(seed_users);
  DELETE FROM scoring_pairs WHERE scorer_id = ANY(seed_users) OR player_id = ANY(seed_users);

  -- Pairings & round results
  DELETE FROM pairings WHERE round_id IN (SELECT id FROM rounds WHERE user_id = ANY(seed_users));
  DELETE FROM round_results WHERE player_id = ANY(seed_users);

  -- Competition data
  DELETE FROM competition_players WHERE player_id = ANY(seed_users);

  -- Rounds (standalone and competition)
  DELETE FROM rounds WHERE user_id = ANY(seed_users);

  -- Competitions created by these users
  DELETE FROM competitions WHERE organizer_id = ANY(seed_users);

  -- Achievements & cosmetics
  DELETE FROM player_achievements WHERE player_id = ANY(seed_users);
  DELETE FROM achievement_progress WHERE player_id = ANY(seed_users);
  DELETE FROM player_cosmetics WHERE player_id = ANY(seed_users);

  -- Notifications & preferences
  DELETE FROM notifications WHERE user_id = ANY(seed_users) OR player_id = ANY(seed_users);
  DELETE FROM push_tokens WHERE user_id = ANY(seed_users);
  DELETE FROM user_preferences WHERE user_id = ANY(seed_users);

  RAISE NOTICE 'Cleaned up all data for 6 seed users';
END $$;

-- =====================================================
-- STEP 1: USER ALIASES & ENSURE PLAYER PROFILES
-- =====================================================
-- Users:
--   U1: e8ba6eb4-1894-422d-bbd2-485c9f141a55 (hcp 10.7)
--   U2: 0bfbb37e-3daa-47ee-a9bd-df30b1ac0930 (hcp 16.0)
--   U3: e5579c23-938b-4f03-b08f-b889276cfc50 (hcp 15.8)
--   U4: ca7c2924-39e8-4b66-bbb8-d9699adb3d65 (hcp 12.5)
--   U5: 25c171c8-c087-4d4a-b3be-545acdfe3f11 (hcp 18.3)
--   U6: 9f76496a-36bd-417a-bbb2-0c0d450a557b (hcp 20.0)
--
-- 11 Real courses (GolfAPI-imported):
--   C01: 01454eb2-24c5-4cb2-8bc7-e6a33c36b6f9
--   C02: 065d1f2b-e201-4e56-b0cb-5fc0ed16f440
--   C03: 0a074956-a253-47ed-8ba0-e83c85baf921
--   C04: 1cb4edad-d348-40b2-a9b3-82f5c396497a
--   C05: 2c09bc09-0cd9-4cf1-a73c-f83350f97a2a
--   C06: 55c4d696-d162-4fe2-8002-bfab679d704b
--   C07: 54ecbd4c-deba-46f7-ab29-e6a4e3895fa7
--   C08: 8db3fae9-6ce7-4b83-837f-df92064edba0
--   C09: 81651e1c-b851-459f-ba4a-3ceecd081b30
--   C10: 7d30f5cb-b70d-4458-a182-32dce726089c
--   C11: 74ca722b-3d50-483d-ab44-0e3a75e24c44

-- Ensure U2 and U6 have player profiles (they may not exist yet)
INSERT INTO players (id, name, email, handicap, handicap_index)
VALUES
  ('0bfbb37e-3daa-47ee-a9bd-df30b1ac0930', 'Jake Williams', 'jake@test.com', 16.0, 15.7),
  ('9f76496a-36bd-417a-bbb2-0c0d450a557b', 'Ryan Park', 'ryan@test.com', 20.0, 19.6)
ON CONFLICT (id) DO UPDATE SET
  handicap = EXCLUDED.handicap,
  handicap_index = EXCLUDED.handicap_index;

-- =====================================================
-- STEP 2: CREATE STANDALONE ROUNDS WITH REAL COURSE DATA
-- =====================================================
-- Each user gets 6 standalone rounds:
--   - 4 completed (with handicap_differential, eligible for leagues)
--   - 2 in-progress (not eligible)
-- Rounds spread across Jan-Feb 2026 at real courses.
-- Hole pars/stroke indexes read dynamically from courses.holes JSONB.
-- Slope/course ratings read from tees table (fallback to courses columns).

DO $$
DECLARE
  user_ids UUID[] := ARRAY[
    'e8ba6eb4-1894-422d-bbd2-485c9f141a55'::UUID,
    '0bfbb37e-3daa-47ee-a9bd-df30b1ac0930'::UUID,
    'e5579c23-938b-4f03-b08f-b889276cfc50'::UUID,
    'ca7c2924-39e8-4b66-bbb8-d9699adb3d65'::UUID,
    '25c171c8-c087-4d4a-b3be-545acdfe3f11'::UUID,
    '9f76496a-36bd-417a-bbb2-0c0d450a557b'::UUID
  ];
  handicaps NUMERIC[] := ARRAY[10.7, 16.0, 15.8, 12.5, 18.3, 20.0];

  course_ids UUID[] := ARRAY[
    '01454eb2-24c5-4cb2-8bc7-e6a33c36b6f9'::UUID,
    '065d1f2b-e201-4e56-b0cb-5fc0ed16f440'::UUID,
    '0a074956-a253-47ed-8ba0-e83c85baf921'::UUID,
    '1cb4edad-d348-40b2-a9b3-82f5c396497a'::UUID,
    '2c09bc09-0cd9-4cf1-a73c-f83350f97a2a'::UUID,
    '55c4d696-d162-4fe2-8002-bfab679d704b'::UUID,
    '54ecbd4c-deba-46f7-ab29-e6a4e3895fa7'::UUID,
    '8db3fae9-6ce7-4b83-837f-df92064edba0'::UUID,
    '81651e1c-b851-459f-ba4a-3ceecd081b30'::UUID,
    '7d30f5cb-b70d-4458-a182-32dce726089c'::UUID,
    '74ca722b-3d50-483d-ab44-0e3a75e24c44'::UUID
  ];

  game_types TEXT[] := ARRAY['stableford', 'stroke', 'stableford', 'stableford', 'stroke', 'stableford'];
  round_dates DATE[] := ARRAY[
    '2026-01-05'::DATE, '2026-01-12'::DATE, '2026-01-19'::DATE,
    '2026-01-26'::DATE, '2026-02-09'::DATE, '2026-02-16'::DATE
  ];
  -- Rounds 1-4 completed, 5-6 in-progress
  round_statuses TEXT[] := ARRAY['completed', 'completed', 'completed', 'completed', 'in-progress', 'in-progress'];

  u INTEGER;
  r INTEGER;
  user_id UUID;
  player_hcp NUMERIC;
  v_round_id UUID;
  scorecard_id UUID;
  course_idx INTEGER;

  -- Course data (looked up dynamically)
  v_course_id UUID;
  v_holes_json JSONB;
  v_slope INTEGER;
  v_course_rating NUMERIC;
  v_tee_rec RECORD;
  v_course_rec RECORD;

  -- Score generation vars
  scores JSONB;
  hole_num INTEGER;
  par INTEGER;
  strokes INTEGER;
  putts INTEGER;
  stroke_index INTEGER;
  strokes_received INTEGER;
  net_strokes INTEGER;
  hole_points INTEGER;
  total_gross INTEGER;
  total_net INTEGER;
  total_points INTEGER;
  diff NUMERIC;
  holes_to_score INTEGER;
  hole_element JSONB;

  -- Fallback pars/stroke indexes if course has no holes JSONB
  fallback_pars INTEGER[] := ARRAY[4,5,3,4,4,3,5,4,4,4,3,5,4,4,4,3,5,4];
  fallback_sis INTEGER[] := ARRAY[7,3,15,1,9,17,5,11,13,8,16,4,2,10,12,18,6,14];
BEGIN
  FOR u IN 1..6 LOOP
    user_id := user_ids[u];
    player_hcp := handicaps[u];

    FOR r IN 1..6 LOOP
      -- Deterministic round ID: bbbbb001-0000-0000-{user_idx}{round_idx}--
      v_round_id := ('bbbbb001-0000-0000-' || LPAD(u::TEXT, 4, '0') || '-00000000000' || r)::UUID;
      scorecard_id := gen_random_uuid();

      -- Rotate through 11 courses
      course_idx := ((u + r - 2) % 11) + 1;
      v_course_id := course_ids[course_idx];

      -- -----------------------------------------------
      -- Look up real hole data from courses.holes JSONB
      -- -----------------------------------------------
      SELECT c.holes, c.slope_rating, c.course_rating
      INTO v_course_rec
      FROM courses c
      WHERE c.id = v_course_id;

      v_holes_json := v_course_rec.holes;

      -- -----------------------------------------------
      -- Look up tee ratings: pick first men's tee with valid slope+course_rating
      -- -----------------------------------------------
      v_slope := NULL;
      v_course_rating := NULL;

      SELECT t.slope, t.course_rating
      INTO v_tee_rec
      FROM tees t
      WHERE t.course_id = v_course_id
        AND t.slope IS NOT NULL
        AND t.course_rating IS NOT NULL
      ORDER BY t.name ASC
      LIMIT 1;

      IF FOUND THEN
        v_slope := v_tee_rec.slope;
        v_course_rating := v_tee_rec.course_rating;
      END IF;

      -- Fall back to legacy course-level ratings
      IF v_slope IS NULL THEN
        v_slope := COALESCE(v_course_rec.slope_rating, 125);
      END IF;
      IF v_course_rating IS NULL THEN
        v_course_rating := COALESCE(v_course_rec.course_rating, 72.0);
      END IF;

      -- Create the standalone round
      INSERT INTO rounds (
        id, competition_id, user_id, round_number, course_id, date,
        game_type, status, created_at, updated_at
      )
      VALUES (
        v_round_id,
        NULL, -- standalone
        user_id,
        1,
        v_course_id,
        round_dates[r],
        game_types[r],
        round_statuses[r],
        round_dates[r]::TIMESTAMP - INTERVAL '1 day',
        round_dates[r]::TIMESTAMP + INTERVAL '5 hours'
      );

      -- Generate scorecard with realistic scores
      scores := '{}';
      total_gross := 0;
      total_net := 0;
      total_points := 0;

      -- In-progress rounds: only 12 holes scored
      IF round_statuses[r] = 'in-progress' THEN
        holes_to_score := 12;
      ELSE
        holes_to_score := 18;
      END IF;

      FOR hole_num IN 1..holes_to_score LOOP
        -- Try to read par and strokeIndex from real course JSONB
        par := NULL;
        stroke_index := NULL;

        IF v_holes_json IS NOT NULL AND jsonb_typeof(v_holes_json) = 'array' AND jsonb_array_length(v_holes_json) >= hole_num THEN
          hole_element := v_holes_json->(hole_num - 1);
          par := (hole_element->>'par')::INTEGER;
          stroke_index := (hole_element->>'strokeIndex')::INTEGER;
        END IF;

        -- Fallback to hardcoded values if course data missing
        IF par IS NULL THEN
          par := fallback_pars[hole_num];
        END IF;
        IF stroke_index IS NULL THEN
          stroke_index := fallback_sis[hole_num];
        END IF;

        -- Realistic strokes based on handicap (deterministic seed + small variation)
        strokes := par + FLOOR(RANDOM() * 3 - 0.5 + (player_hcp / 36.0))::INTEGER;
        strokes := GREATEST(par - 2, strokes);
        strokes := LEAST(par + 4, strokes);

        -- Strokes received
        strokes_received := FLOOR(player_hcp / 18)::INTEGER;
        IF stroke_index <= (player_hcp::INTEGER % 18) THEN
          strokes_received := strokes_received + 1;
        END IF;
        net_strokes := strokes - strokes_received;

        -- Stableford points
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

        putts := LEAST(strokes - 1, GREATEST(1, FLOOR(RANDOM() * 2 + 1.5)::INTEGER));

        scores := scores || jsonb_build_object(
          hole_num::TEXT,
          jsonb_build_object('strokes', strokes, 'putts', putts)
        );

        total_gross := total_gross + strokes;
        total_net := total_net + net_strokes;
        total_points := total_points + hole_points;
      END LOOP;

      -- Calculate handicap differential (only for completed 18-hole rounds)
      IF round_statuses[r] = 'completed' THEN
        diff := ROUND((113.0 / v_slope) * (total_gross - v_course_rating), 1);
      ELSE
        diff := NULL;
      END IF;

      INSERT INTO scorecards (
        id, round_id, player_id, scores, total_gross, total_net, total_points,
        status, submitted_at, submitted_by, device_id, synced_at,
        ga_handicap_used, daily_handicap_used, handicap_differential,
        course_rating_used, slope_rating_used,
        created_at, updated_at
      )
      VALUES (
        scorecard_id,
        v_round_id,
        user_id,
        scores,
        total_gross,
        total_net,
        total_points,
        CASE WHEN round_statuses[r] = 'completed' THEN 'completed' ELSE 'in-progress' END,
        CASE WHEN round_statuses[r] = 'completed' THEN round_dates[r]::TIMESTAMP + INTERVAL '5 hours' ELSE NULL END,
        CASE WHEN round_statuses[r] = 'completed' THEN user_id ELSE NULL END,
        'device-' || LEFT(user_id::TEXT, 8),
        NOW(),
        player_hcp,
        ROUND(player_hcp)::INTEGER,
        diff,
        v_course_rating,
        v_slope,
        round_dates[r]::TIMESTAMP - INTERVAL '1 day',
        NOW()
      );
    END LOOP;
  END LOOP;
END $$;

-- =====================================================
-- STEP 3: CREATE LEAGUES
-- =====================================================

-- League 1: Active, created by U1, all 6 users are members
INSERT INTO leagues (id, name, description, created_by, invite_code, league_type, status, created_at, updated_at)
VALUES (
  'aaaaa001-0000-0000-0000-000000000001',
  'Melbourne Sandbelt League',
  'Weekly rounds across Melbourne''s best sandbelt courses. Best 8 of 20 differentials count.',
  'e8ba6eb4-1894-422d-bbd2-485c9f141a55',
  'LGE-MSL01',
  'ongoing',
  'active',
  '2026-01-01T08:00:00Z',
  '2026-01-01T08:00:00Z'
);

-- League 2: Active, created by U4, 4 users are members
INSERT INTO leagues (id, name, description, created_by, invite_code, league_type, status, created_at, updated_at)
VALUES (
  'aaaaa001-0000-0000-0000-000000000002',
  'Weekend Warriors',
  'Casual league for the Saturday crew',
  'ca7c2924-39e8-4b66-bbb8-d9699adb3d65',
  'LGE-WW002',
  'ongoing',
  'active',
  '2026-01-10T09:00:00Z',
  '2026-01-10T09:00:00Z'
);

-- League 3: Archived, created by U3
INSERT INTO leagues (id, name, description, created_by, invite_code, league_type, status, created_at, updated_at)
VALUES (
  'aaaaa001-0000-0000-0000-000000000003',
  '2025 Summer Series',
  'Completed summer league - great season everyone!',
  'e5579c23-938b-4f03-b08f-b889276cfc50',
  'LGE-SS025',
  'ongoing',
  'archived',
  '2025-11-01T08:00:00Z',
  '2026-01-15T08:00:00Z'
);

-- =====================================================
-- STEP 4: ADD PLAYERS TO LEAGUES
-- =====================================================

-- League 1: All 6 users
INSERT INTO league_players (league_id, player_id, status, joined_at, created_at)
VALUES
  ('aaaaa001-0000-0000-0000-000000000001', 'e8ba6eb4-1894-422d-bbd2-485c9f141a55', 'accepted', '2026-01-01T08:00:00Z', '2026-01-01T08:00:00Z'),
  ('aaaaa001-0000-0000-0000-000000000001', '0bfbb37e-3daa-47ee-a9bd-df30b1ac0930', 'accepted', '2026-01-02T10:00:00Z', '2026-01-02T10:00:00Z'),
  ('aaaaa001-0000-0000-0000-000000000001', 'e5579c23-938b-4f03-b08f-b889276cfc50', 'accepted', '2026-01-02T14:00:00Z', '2026-01-02T14:00:00Z'),
  ('aaaaa001-0000-0000-0000-000000000001', 'ca7c2924-39e8-4b66-bbb8-d9699adb3d65', 'accepted', '2026-01-03T09:00:00Z', '2026-01-03T09:00:00Z'),
  ('aaaaa001-0000-0000-0000-000000000001', '25c171c8-c087-4d4a-b3be-545acdfe3f11', 'accepted', '2026-01-03T11:00:00Z', '2026-01-03T11:00:00Z'),
  ('aaaaa001-0000-0000-0000-000000000001', '9f76496a-36bd-417a-bbb2-0c0d450a557b', 'accepted', '2026-01-04T08:00:00Z', '2026-01-04T08:00:00Z');

-- League 2: U4 (creator), U1, U2, U5
INSERT INTO league_players (league_id, player_id, status, joined_at, created_at)
VALUES
  ('aaaaa001-0000-0000-0000-000000000002', 'ca7c2924-39e8-4b66-bbb8-d9699adb3d65', 'accepted', '2026-01-10T09:00:00Z', '2026-01-10T09:00:00Z'),
  ('aaaaa001-0000-0000-0000-000000000002', 'e8ba6eb4-1894-422d-bbd2-485c9f141a55', 'accepted', '2026-01-10T10:00:00Z', '2026-01-10T10:00:00Z'),
  ('aaaaa001-0000-0000-0000-000000000002', '0bfbb37e-3daa-47ee-a9bd-df30b1ac0930', 'accepted', '2026-01-11T08:00:00Z', '2026-01-11T08:00:00Z'),
  ('aaaaa001-0000-0000-0000-000000000002', '25c171c8-c087-4d4a-b3be-545acdfe3f11', 'accepted', '2026-01-12T09:00:00Z', '2026-01-12T09:00:00Z');

-- League 3 (archived): U3 (creator), U1, U4, U6
INSERT INTO league_players (league_id, player_id, status, joined_at, created_at)
VALUES
  ('aaaaa001-0000-0000-0000-000000000003', 'e5579c23-938b-4f03-b08f-b889276cfc50', 'accepted', '2025-11-01T08:00:00Z', '2025-11-01T08:00:00Z'),
  ('aaaaa001-0000-0000-0000-000000000003', 'e8ba6eb4-1894-422d-bbd2-485c9f141a55', 'accepted', '2025-11-01T10:00:00Z', '2025-11-01T10:00:00Z'),
  ('aaaaa001-0000-0000-0000-000000000003', 'ca7c2924-39e8-4b66-bbb8-d9699adb3d65', 'accepted', '2025-11-02T08:00:00Z', '2025-11-02T08:00:00Z'),
  ('aaaaa001-0000-0000-0000-000000000003', '9f76496a-36bd-417a-bbb2-0c0d450a557b', 'accepted', '2025-11-03T08:00:00Z', '2025-11-03T08:00:00Z');

-- =====================================================
-- STEP 5: TAG COMPLETED ROUNDS TO LEAGUES
-- =====================================================
-- Tag each user's completed standalone rounds to the leagues they belong to.
-- Only completed scorecards (rounds 1-4) have handicap_differential and are eligible.

DO $$
DECLARE
  -- League 1 members: all 6 users
  -- League 2 members: U1, U2, U4, U5
  -- League 3 members: U1, U3, U4, U6

  user_ids UUID[] := ARRAY[
    'e8ba6eb4-1894-422d-bbd2-485c9f141a55'::UUID,
    '0bfbb37e-3daa-47ee-a9bd-df30b1ac0930'::UUID,
    'e5579c23-938b-4f03-b08f-b889276cfc50'::UUID,
    'ca7c2924-39e8-4b66-bbb8-d9699adb3d65'::UUID,
    '25c171c8-c087-4d4a-b3be-545acdfe3f11'::UUID,
    '9f76496a-36bd-417a-bbb2-0c0d450a557b'::UUID
  ];

  -- Which rounds each user tags to League 1 (all users, rounds 1-3)
  league1_rounds INTEGER[] := ARRAY[1, 2, 3];
  -- Which rounds each user tags to League 2 (U1,U2,U4,U5, rounds 2-4)
  league2_rounds INTEGER[] := ARRAY[2, 3, 4];
  -- Which rounds each user tags to League 3 (U1,U3,U4,U6, rounds 1-2)
  league3_rounds INTEGER[] := ARRAY[1, 2];

  league2_members UUID[] := ARRAY[
    'e8ba6eb4-1894-422d-bbd2-485c9f141a55'::UUID,
    '0bfbb37e-3daa-47ee-a9bd-df30b1ac0930'::UUID,
    'ca7c2924-39e8-4b66-bbb8-d9699adb3d65'::UUID,
    '25c171c8-c087-4d4a-b3be-545acdfe3f11'::UUID
  ];
  league3_members UUID[] := ARRAY[
    'e8ba6eb4-1894-422d-bbd2-485c9f141a55'::UUID,
    'e5579c23-938b-4f03-b08f-b889276cfc50'::UUID,
    'ca7c2924-39e8-4b66-bbb8-d9699adb3d65'::UUID,
    '9f76496a-36bd-417a-bbb2-0c0d450a557b'::UUID
  ];

  u INTEGER;
  r INTEGER;
  user_idx INTEGER;
  v_round_id UUID;
  sc RECORD;
BEGIN
  -- League 1: all 6 users tag rounds 1-3
  FOR u IN 1..6 LOOP
    FOREACH r IN ARRAY league1_rounds LOOP
      v_round_id := ('bbbbb001-0000-0000-' || LPAD(u::TEXT, 4, '0') || '-00000000000' || r)::UUID;

      SELECT s.id, s.handicap_differential INTO sc
      FROM scorecards s
      WHERE s.round_id = v_round_id AND s.player_id = user_ids[u]
      AND s.handicap_differential IS NOT NULL;

      IF FOUND THEN
        INSERT INTO league_rounds (league_id, scorecard_id, player_id, handicap_differential, tagged_at, created_at)
        VALUES (
          'aaaaa001-0000-0000-0000-000000000001',
          sc.id,
          user_ids[u],
          sc.handicap_differential,
          NOW() - INTERVAL '1 day' * (4 - r),
          NOW() - INTERVAL '1 day' * (4 - r)
        );
      END IF;
    END LOOP;
  END LOOP;

  -- League 2: U1,U2,U4,U5 tag rounds 2-4
  FOR u IN 1..4 LOOP
    -- Map to user index in user_ids array
    SELECT array_position(user_ids, league2_members[u]) INTO user_idx;

    FOREACH r IN ARRAY league2_rounds LOOP
      v_round_id := ('bbbbb001-0000-0000-' || LPAD(user_idx::TEXT, 4, '0') || '-00000000000' || r)::UUID;

      SELECT s.id, s.handicap_differential INTO sc
      FROM scorecards s
      WHERE s.round_id = v_round_id AND s.player_id = league2_members[u]
      AND s.handicap_differential IS NOT NULL;

      IF FOUND THEN
        INSERT INTO league_rounds (league_id, scorecard_id, player_id, handicap_differential, tagged_at, created_at)
        VALUES (
          'aaaaa001-0000-0000-0000-000000000002',
          sc.id,
          league2_members[u],
          sc.handicap_differential,
          NOW() - INTERVAL '1 day' * (5 - r),
          NOW() - INTERVAL '1 day' * (5 - r)
        );
      END IF;
    END LOOP;
  END LOOP;

  -- League 3 (archived): U1,U3,U4,U6 tag rounds 1-2
  FOR u IN 1..4 LOOP
    SELECT array_position(user_ids, league3_members[u]) INTO user_idx;

    FOREACH r IN ARRAY league3_rounds LOOP
      v_round_id := ('bbbbb001-0000-0000-' || LPAD(user_idx::TEXT, 4, '0') || '-00000000000' || r)::UUID;

      SELECT s.id, s.handicap_differential INTO sc
      FROM scorecards s
      WHERE s.round_id = v_round_id AND s.player_id = league3_members[u]
      AND s.handicap_differential IS NOT NULL;

      IF FOUND THEN
        INSERT INTO league_rounds (league_id, scorecard_id, player_id, handicap_differential, tagged_at, created_at)
        VALUES (
          'aaaaa001-0000-0000-0000-000000000003',
          sc.id,
          league3_members[u],
          sc.handicap_differential,
          '2025-12-01T08:00:00Z'::TIMESTAMPTZ + INTERVAL '1 day' * r,
          '2025-12-01T08:00:00Z'::TIMESTAMPTZ + INTERVAL '1 day' * r
        );
      END IF;
    END LOOP;
  END LOOP;
END $$;

-- =====================================================
-- VERIFICATION QUERIES (run to check the seed worked)
-- =====================================================

-- League summary
SELECT l.name, l.status, l.invite_code,
  (SELECT COUNT(*) FROM league_players lp WHERE lp.league_id = l.id AND lp.status = 'accepted') AS player_count,
  (SELECT COUNT(*) FROM league_rounds lr WHERE lr.league_id = l.id) AS tagged_rounds
FROM leagues l
WHERE l.id::text LIKE 'aaaaa001%'
ORDER BY l.created_at;

-- Standalone rounds per user (with course names)
SELECT p.name, p.handicap,
  COUNT(*) FILTER (WHERE s.status = 'completed') AS completed_rounds,
  COUNT(*) FILTER (WHERE s.status = 'in-progress') AS in_progress_rounds,
  COUNT(*) FILTER (WHERE s.handicap_differential IS NOT NULL) AS eligible_for_leagues,
  ROUND(AVG(s.handicap_differential) FILTER (WHERE s.handicap_differential IS NOT NULL), 1) AS avg_diff
FROM scorecards s
JOIN players p ON p.id = s.player_id
JOIN rounds r ON r.id = s.round_id
WHERE r.id::text LIKE 'bbbbb001%'
GROUP BY p.id, p.name, p.handicap
ORDER BY p.name;

-- Course usage across rounds (verify real courses are used)
SELECT c.name AS course_name, COUNT(*) AS rounds_played
FROM rounds r
JOIN courses c ON c.id = r.course_id
WHERE r.id::text LIKE 'bbbbb001%'
GROUP BY c.id, c.name
ORDER BY rounds_played DESC, c.name;

-- Leaderboard check for League 1
SELECT * FROM get_league_leaderboard('aaaaa001-0000-0000-0000-000000000001'::UUID);
