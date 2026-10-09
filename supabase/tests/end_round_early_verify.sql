-- =====================================================
-- End round early - verification script
-- =====================================================
-- Run AFTER applying 20261007000100_full_scorecards_only_handicap.sql and
-- 20261007000200_end_round_early.sql and
-- 20261007000300_guard_round_scoring_writes.sql (shape-aware fixtures):
-- Known pooler port 6543; human recipe, never run during authoring:
--   psql "$DB_URL" -v ON_ERROR_STOP=1 <<'SQL'
--   SET default_transaction_read_only = off;
--   show transaction_read_only; -- must print off
--   \i supabase/tests/end_round_early_verify.sql
--   SQL
-- This file contains BEGIN ... ROLLBACK.
--
-- Authored without database access; all SQL execution is deferred to B11.
-- The two-session checks at the end are staging instructions, not executed here.
-- No single-session test claims to verify round_scorecards_busy or lock waits.
--
-- Everything runs in ONE transaction that is ROLLED BACK at the end.
-- A failed ASSERT aborts the script (ON_ERROR_STOP) with the test's message.
--
-- NOTE: column names were verified from the migration SQL (rounds,
-- round_players.invitation_status, scorecards, skins_games/skins_results,
-- wolf_games/wolf_hole_decisions, score_entries, score_mismatches, shot_log,
-- handicap_combined_rounds, clubs/courses, competitions). First-run fixups
-- may still be needed (trigger side-effects, constraint drift). Dev/staging
-- only.
--
-- Auth impersonation pattern (as in soft_delete_verify.sql):
--   SET LOCAL role authenticated;
--   SET LOCAL request.jwt.claims = '{"sub":"<uuid>","role":"authenticated"}';
-- =====================================================

BEGIN;

-- Snapshot all affected rows, including every stored combination field. These
-- temporary objects disappear with ROLLBACK and are used only as the fixture
-- administrator, outside the authenticated-role blocks.
CREATE FUNCTION pg_temp.end_round_state(p_round_id UUID)
RETURNS JSONB
LANGUAGE sql
STABLE
AS $$
  SELECT jsonb_build_object(
    'round', (SELECT to_jsonb(r) FROM rounds r WHERE r.id = p_round_id),
    'cards', (SELECT COALESCE(jsonb_agg(to_jsonb(sc) ORDER BY sc.id), '[]'::JSONB)
                FROM scorecards sc WHERE sc.round_id = p_round_id),
    'skins', (SELECT COALESCE(jsonb_agg(to_jsonb(sr) ORDER BY sr.id), '[]'::JSONB)
                FROM skins_results sr JOIN skins_games sg ON sg.id = sr.skins_game_id
               WHERE sg.round_id = p_round_id),
    'wolf', (SELECT COALESCE(jsonb_agg(to_jsonb(wd) ORDER BY wd.id), '[]'::JSONB)
               FROM wolf_hole_decisions wd JOIN wolf_games wg ON wg.id = wd.wolf_game_id
              WHERE wg.round_id = p_round_id),
    'entries', (SELECT COALESCE(jsonb_agg(to_jsonb(se) ORDER BY se.id), '[]'::JSONB)
                  FROM score_entries se WHERE se.round_id = p_round_id),
    'mismatches', (SELECT COALESCE(jsonb_agg(to_jsonb(sm) ORDER BY sm.id), '[]'::JSONB)
                     FROM score_mismatches sm WHERE sm.round_id = p_round_id),
    'shots', (SELECT COALESCE(jsonb_agg(to_jsonb(sl) ORDER BY sl.id), '[]'::JSONB)
                FROM shot_log sl WHERE sl.round_id = p_round_id),
    'combinations', (SELECT COALESCE(jsonb_agg(to_jsonb(hcr) ORDER BY hcr.id), '[]'::JSONB)
                       FROM handicap_combined_rounds hcr
                      WHERE EXISTS (SELECT 1 FROM scorecards sc
                                     WHERE sc.round_id = p_round_id
                                       AND sc.id IN (hcr.front_scorecard_id, hcr.back_scorecard_id)))
  );
$$;
CREATE TEMP TABLE end_round_before (round_id UUID PRIMARY KEY, state JSONB NOT NULL) ON COMMIT DROP;

-- =====================================================
-- FIXTURES
-- =====================================================
-- Players: ..01 owner, ..02 mate (accepted), ..03 declined invitee,
--          ..04 outsider, ..05 pending invitee.
INSERT INTO auth.users (id, email) VALUES
  ('ee000000-0000-0000-0000-000000000001', 'ere-verify-owner@example.com'),
  ('ee000000-0000-0000-0000-000000000002', 'ere-verify-mate@example.com'),
  ('ee000000-0000-0000-0000-000000000003', 'ere-verify-declined@example.com'),
  ('ee000000-0000-0000-0000-000000000004', 'ere-verify-outsider@example.com'),
  ('ee000000-0000-0000-0000-000000000005', 'ere-verify-pending@example.com');

INSERT INTO players (id, name, email) VALUES
  ('ee000000-0000-0000-0000-000000000001', 'ERE Owner', 'ere-verify-owner@example.com'),
  ('ee000000-0000-0000-0000-000000000002', 'ERE Mate', 'ere-verify-mate@example.com'),
  ('ee000000-0000-0000-0000-000000000003', 'ERE Declined', 'ere-verify-declined@example.com'),
  ('ee000000-0000-0000-0000-000000000004', 'ERE Outsider', 'ere-verify-outsider@example.com'),
  ('ee000000-0000-0000-0000-000000000005', 'ERE Pending', 'ere-verify-pending@example.com')
ON CONFLICT (id) DO NOTHING;

-- Club + course (handicap_combined_rounds.course_id is NOT NULL).
INSERT INTO clubs (id, source, name)
  VALUES ('ee000000-0000-0000-0005-000000000001', 'manual', 'ERE Verify Club');
INSERT INTO courses (id, club_id, name)
  VALUES ('ee000000-0000-0000-0006-000000000001', 'ee000000-0000-0000-0005-000000000001', 'ERE Verify Course');

-- R1: back-9 standalone round, in progress (course_id nullable since
-- 20260109000000). Mate is accepted; ..03 declined; ..05 pending.
INSERT INTO rounds (id, user_id, status, nine_type) VALUES
  ('ee000000-0000-0000-0001-000000000001', 'ee000000-0000-0000-0000-000000000001', 'in-progress', 'back9');
INSERT INTO round_players (round_id, player_id, invitation_status) VALUES
  ('ee000000-0000-0000-0001-000000000001', 'ee000000-0000-0000-0000-000000000001', 'accepted'),
  ('ee000000-0000-0000-0001-000000000001', 'ee000000-0000-0000-0000-000000000002', 'accepted'),
  ('ee000000-0000-0000-0001-000000000001', 'ee000000-0000-0000-0000-000000000003', 'declined'),
  ('ee000000-0000-0000-0001-000000000001', 'ee000000-0000-0000-0000-000000000005', 'pending');

-- R1 skins: results for holes 10-18.
INSERT INTO skins_games (
  id, round_id, participant_ids, pot_type, pot_value, scoring_type,
  disclaimer_accepted_at, disclaimer_accepted_by, created_by
) VALUES (
  'ee000000-0000-0000-0002-000000000001',
  'ee000000-0000-0000-0001-000000000001',
  ARRAY['ee000000-0000-0000-0000-000000000001'::UUID, 'ee000000-0000-0000-0000-000000000002'::UUID],
  'per_hole', 5.00, 'gross',
  NOW(), 'ee000000-0000-0000-0000-000000000001', 'ee000000-0000-0000-0000-000000000001'
);
INSERT INTO skins_results (skins_game_id, hole_number, is_carryover, hole_scores, hole_pot_value)
SELECT 'ee000000-0000-0000-0002-000000000001', h, TRUE, '{}'::JSONB, 5.00
FROM generate_series(10, 18) AS h;

-- R1 wolf: decisions for holes 10-18 (wolf needs 3-4 participants).
INSERT INTO wolf_games (id, round_id, participant_ids, wolf_order, created_by) VALUES (
  'ee000000-0000-0000-0003-000000000001',
  'ee000000-0000-0000-0001-000000000001',
  ARRAY['ee000000-0000-0000-0000-000000000001'::UUID, 'ee000000-0000-0000-0000-000000000002'::UUID, 'ee000000-0000-0000-0000-000000000005'::UUID],
  ARRAY['ee000000-0000-0000-0000-000000000001'::UUID, 'ee000000-0000-0000-0000-000000000002'::UUID, 'ee000000-0000-0000-0000-000000000005'::UUID],
  'ee000000-0000-0000-0000-000000000001'
);
INSERT INTO wolf_hole_decisions (wolf_game_id, hole_number, wolf_id)
SELECT 'ee000000-0000-0000-0003-000000000001', h, 'ee000000-0000-0000-0000-000000000001'
FROM generate_series(10, 18) AS h;

-- R1 score entries, holes 10-18.
INSERT INTO score_entries (round_id, player_id, hole_number, scorer_id, strokes)
SELECT 'ee000000-0000-0000-0001-000000000001', 'ee000000-0000-0000-0000-000000000001', h,
       'ee000000-0000-0000-0000-000000000001', 4
FROM generate_series(10, 18) AS h;

-- R1 pending score mismatches, holes 10-18 (N-way `entries` shape; the
-- legacy self/partner columns are nullable since 20260425000000).
INSERT INTO score_mismatches (round_id, player_id, hole_number, entries, status)
SELECT 'ee000000-0000-0000-0001-000000000001', 'ee000000-0000-0000-0000-000000000001', h,
       '[{"scorer_id":"ee000000-0000-0000-0000-000000000001","strokes":4},{"scorer_id":"ee000000-0000-0000-0000-000000000002","strokes":5}]'::JSONB,
       'pending'
FROM generate_series(10, 18) AS h;

-- R1 shot log: one shot per hole, holes 10-18 (no course ⇒ the bunker
-- trigger is a no-op).
INSERT INTO shot_log (round_id, hole_number, player_id, sequence, latitude, longitude)
SELECT 'ee000000-0000-0000-0001-000000000001', h, 'ee000000-0000-0000-0000-000000000001', 1,
       -37.9500000, 144.9500000
FROM generate_series(10, 18) AS h;

-- R1 scorecards, both with a differential before the end:
--   SC1 owner: complete back 9 (holes 10-18) - kept by A7's rule;
--   SC2 mate:  no per-hole data ({}) - legacy, kept by A7's rule.
INSERT INTO scorecards (id, round_id, player_id, status, scores, total_gross, handicap_differential)
SELECT 'ee000000-0000-0000-0007-000000000001', 'ee000000-0000-0000-0001-000000000001',
       'ee000000-0000-0000-0000-000000000001', 'in-progress',
       jsonb_object_agg(h::TEXT, jsonb_build_object('strokes', 4)), 36, 12.3
FROM generate_series(10, 18) AS h;
INSERT INTO scorecards (id, round_id, player_id, status, scores, total_gross, handicap_differential) VALUES
  ('ee000000-0000-0000-0007-000000000002', 'ee000000-0000-0000-0001-000000000001',
   'ee000000-0000-0000-0000-000000000002', 'in-progress', '{}'::JSONB, 40, 15.0);

-- R2: full standalone round, in progress. ..03 declined, ..05 pending.
INSERT INTO rounds (id, user_id, status, nine_type) VALUES
  ('ee000000-0000-0000-0001-000000000002', 'ee000000-0000-0000-0000-000000000001', 'in-progress', 'full');
INSERT INTO round_players (round_id, player_id, invitation_status) VALUES
  ('ee000000-0000-0000-0001-000000000002', 'ee000000-0000-0000-0000-000000000001', 'accepted'),
  ('ee000000-0000-0000-0001-000000000002', 'ee000000-0000-0000-0000-000000000003', 'declined'),
  ('ee000000-0000-0000-0001-000000000002', 'ee000000-0000-0000-0000-000000000005', 'pending');

-- R3: a competition round (must be rejected). competition_type defaults to
-- 'event', which needs an end_date (event_requires_end_date,
-- 20260228300000_rename_league_to_knockout.sql).
INSERT INTO competitions (
  id, name, start_date, end_date, handicap_system, visibility, invite_code, organizer_id, status
) VALUES (
  'ee000000-0000-0000-0004-000000000001', 'ERE Verify Competition', CURRENT_DATE, CURRENT_DATE,
  'honor', 'private', 'EREVFY-0001', 'ee000000-0000-0000-0000-000000000001', 'upcoming'
);
INSERT INTO rounds (id, competition_id, round_number, status) VALUES
  ('ee000000-0000-0000-0001-000000000003', 'ee000000-0000-0000-0004-000000000001', 1, 'in-progress');

-- R4: completed full round already ended after 6. Construct through the
-- normal lifecycle: unended cards -> end -> shape-aware submit -> completion.
-- No unbound INSERT into an already-ended round or disabled trigger is used.
INSERT INTO rounds (id, user_id, status, nine_type) VALUES
  ('ee000000-0000-0000-0001-000000000004', 'ee000000-0000-0000-0000-000000000001', 'in-progress', 'full');
INSERT INTO scorecards (id, round_id, player_id, status, scores, total_gross) VALUES
  ('ee000000-0000-0000-0007-000000000004', 'ee000000-0000-0000-0001-000000000004',
   'ee000000-0000-0000-0000-000000000001', 'in-progress', '{}'::JSONB, 24),
  ('ee000000-0000-0000-0007-000000000006', 'ee000000-0000-0000-0001-000000000004',
   'ee000000-0000-0000-0000-000000000002', 'in-progress', '{}'::JSONB, 26);
DO $$
DECLARE v_write RECORD;
BEGIN
  PERFORM set_config('request.jwt.claims', '{"sub":"ee000000-0000-0000-0000-000000000001","role":"authenticated"}', true);
  PERFORM end_round_early('ee000000-0000-0000-0001-000000000004', 6);
  SELECT * INTO v_write FROM write_scorecard_snapshot(
    'ee000000-0000-0000-0001-000000000004', 'ee000000-0000-0000-0000-000000000001', 1,
    '{"scores":{},"total_gross":24,"status":"completed","expected_round_shape":{"nine_type":"full","holes_played":6}}');
  ASSERT v_write.applied AND NOT v_write.conflict, 'R4 completed fixture submission failed';
  SELECT * INTO v_write FROM write_scorecard_snapshot(
    'ee000000-0000-0000-0001-000000000004', 'ee000000-0000-0000-0000-000000000002', 1,
    '{"scores":{},"total_gross":26,"status":"confirmed","expected_round_shape":{"nine_type":"full","holes_played":6}}');
  ASSERT v_write.applied AND NOT v_write.conflict, 'R4 confirmed fixture submission failed';
END $$;
UPDATE rounds SET status = 'completed'
 WHERE id = 'ee000000-0000-0000-0001-000000000004';

-- R5: completed full round, never ended early.
INSERT INTO rounds (id, user_id, status, nine_type) VALUES
  ('ee000000-0000-0000-0001-000000000005', 'ee000000-0000-0000-0000-000000000001', 'completed', 'full');

-- R6: soft-deleted standalone round.
INSERT INTO rounds (id, user_id, status, nine_type, deleted_at) VALUES
  ('ee000000-0000-0000-0001-000000000006', 'ee000000-0000-0000-0000-000000000001', 'in-progress', 'full', NOW());

-- R9: standalone round that hasn't started (status upcoming).
INSERT INTO rounds (id, user_id, status, nine_type) VALUES
  ('ee000000-0000-0000-0001-000000000009', 'ee000000-0000-0000-0000-000000000001', 'upcoming', 'full');

-- R7: completed front 9 with a complete card (combine partner).
-- R8: completed back 9, NOT ended, with a complete card (positive control).
INSERT INTO rounds (id, user_id, status, nine_type) VALUES
  ('ee000000-0000-0000-0001-000000000007', 'ee000000-0000-0000-0000-000000000001', 'completed', 'front9'),
  ('ee000000-0000-0000-0001-000000000008', 'ee000000-0000-0000-0000-000000000001', 'completed', 'back9');
INSERT INTO scorecards (id, round_id, player_id, status, scores, total_gross, handicap_differential)
SELECT 'ee000000-0000-0000-0007-000000000007', 'ee000000-0000-0000-0001-000000000007',
       'ee000000-0000-0000-0000-000000000001', 'completed',
       jsonb_object_agg(h::TEXT, jsonb_build_object('strokes', 5)), 45, 5.0
FROM generate_series(1, 9) AS h;
INSERT INTO scorecards (id, round_id, player_id, status, scores, total_gross, handicap_differential)
SELECT 'ee000000-0000-0000-0007-000000000008', 'ee000000-0000-0000-0001-000000000008',
       'ee000000-0000-0000-0000-000000000001', 'confirmed',
       jsonb_object_agg(h::TEXT, jsonb_build_object('strokes', 5)), 45, 6.0
FROM generate_series(10, 18) AS h;

DO $$
DECLARE
  v_sc1 NUMERIC;
  v_sc2 NUMERIC;
BEGIN
  SELECT handicap_differential INTO v_sc1 FROM scorecards WHERE id = 'ee000000-0000-0000-0007-000000000001';
  SELECT handicap_differential INTO v_sc2 FROM scorecards WHERE id = 'ee000000-0000-0000-0007-000000000002';
  ASSERT v_sc1 = 12.3 AND v_sc2 = 15.0,
    'Fixture FAILED: R1 cards should keep their differential before the end (A7 rule), got '
    || COALESCE(v_sc1::TEXT, 'NULL') || ' / ' || COALESCE(v_sc2::TEXT, 'NULL');
  RAISE NOTICE 'Fixtures seeded';
END $$;

-- =====================================================
-- TEST 1: an accepted participant (not the owner) ends the back-9 round
--         after 6. Last played hole = 9 + 6 = 15 (Review Focus #2): rows
--         for holes 16-18 are deleted, rows for 10-15 are kept, score keys
--         16-18 are stripped from the cards (revision and totals untouched),
--         and the round's differentials are nulled.
-- =====================================================
SET LOCAL role authenticated;
SET LOCAL request.jwt.claims = '{"sub":"ee000000-0000-0000-0000-000000000002","role":"authenticated"}';

DO $$ BEGIN
  PERFORM end_round_early('ee000000-0000-0000-0001-000000000001', 6);
END $$;

RESET ROLE;

DO $$
DECLARE
  v_holes        SMALLINT;
  v_nine         TEXT;
  v_skins        INT;
  v_skins_max    INT;
  v_wolf         INT;
  v_wolf_max     INT;
  v_entries      INT;
  v_entry_max    INT;
  v_mismatches   INT;
  v_mismatch_max INT;
  v_shots        INT;
  v_shot_max     INT;
  v_diffs        INT;
  v_sc1_keys     TEXT[];
  v_sc1_revision BIGINT;
  v_sc1_gross    INT;
  v_sc2_scores   JSONB;
BEGIN
  SELECT holes_played, nine_type INTO v_holes, v_nine
    FROM rounds WHERE id = 'ee000000-0000-0000-0001-000000000001';
  SELECT COUNT(*), MAX(hole_number) INTO v_skins, v_skins_max
    FROM skins_results WHERE skins_game_id = 'ee000000-0000-0000-0002-000000000001';
  SELECT COUNT(*), MAX(hole_number) INTO v_wolf, v_wolf_max
    FROM wolf_hole_decisions WHERE wolf_game_id = 'ee000000-0000-0000-0003-000000000001';
  SELECT COUNT(*), MAX(hole_number) INTO v_entries, v_entry_max
    FROM score_entries WHERE round_id = 'ee000000-0000-0000-0001-000000000001';
  SELECT COUNT(*), MAX(hole_number) INTO v_mismatches, v_mismatch_max
    FROM score_mismatches WHERE round_id = 'ee000000-0000-0000-0001-000000000001';
  SELECT COUNT(*), MAX(hole_number) INTO v_shots, v_shot_max
    FROM shot_log WHERE round_id = 'ee000000-0000-0000-0001-000000000001';
  SELECT COUNT(*) INTO v_diffs
    FROM scorecards
   WHERE round_id = 'ee000000-0000-0000-0001-000000000001'
     AND handicap_differential IS NOT NULL;

  ASSERT v_holes = 6, 'Test 1 FAILED: holes_played should be 6, got ' || COALESCE(v_holes::TEXT, 'NULL');
  ASSERT v_nine = 'back9', 'Test 1 FAILED: nine_type should stay back9, got ' || v_nine;
  ASSERT v_skins = 6 AND v_skins_max = 15,
    'Test 1 FAILED: expected skins results for holes 10-15 only, got ' || v_skins || ' rows, max ' || v_skins_max;
  ASSERT v_wolf = 6 AND v_wolf_max = 15, 'Test 1 FAILED: wolf should retain six holes through 15, max ' || COALESCE(v_wolf_max::TEXT, 'NULL');
  ASSERT v_entries = 6 AND v_entry_max = 15, 'Test 1 FAILED: score_entries should retain six holes through 15, max ' || COALESCE(v_entry_max::TEXT, 'NULL');
  ASSERT v_mismatches = 6 AND v_mismatch_max = 15, 'Test 1 FAILED: score_mismatches should retain six holes through 15, max ' || COALESCE(v_mismatch_max::TEXT, 'NULL');
  ASSERT v_shots = 6 AND v_shot_max = 15,
    'Test 1 FAILED: expected shot_log for holes 10-15 only, got ' || v_shots || ' rows, max ' || COALESCE(v_shot_max::TEXT, 'NULL');
  ASSERT v_diffs = 0, 'Test 1 FAILED: the round''s differentials should be NULL, ' || v_diffs || ' remain';

  -- Score keys after hole 15 are stripped; revision and totals are not
  -- touched (totals are client-owned; a revision bump would turn the ending
  -- device's next snapshot into a false conflict).
  SELECT ARRAY(SELECT k FROM jsonb_object_keys(scores) AS k ORDER BY k::INT), revision, total_gross
    INTO v_sc1_keys, v_sc1_revision, v_sc1_gross
    FROM scorecards WHERE id = 'ee000000-0000-0000-0007-000000000001';
  SELECT scores INTO v_sc2_scores FROM scorecards WHERE id = 'ee000000-0000-0000-0007-000000000002';
  ASSERT v_sc1_keys = ARRAY['10', '11', '12', '13', '14', '15'],
    'Test 1 FAILED: SC1 should keep score keys 10-15 only, got ' || array_to_string(v_sc1_keys, ',');
  ASSERT v_sc1_revision = 1, 'Test 1 FAILED: revision must not be bumped, got ' || v_sc1_revision;
  ASSERT v_sc1_gross = 36, 'Test 1 FAILED: totals are client-owned and must not change, got ' || v_sc1_gross;
  ASSERT v_sc2_scores = '{}'::JSONB, 'Test 1 FAILED: a {} card should stay {}, got ' || v_sc2_scores::TEXT;

  -- The RPC turns the guard's flag back off after its UPDATE.
  ASSERT COALESCE(current_setting('app.ending_round', true), '') <> 'on',
    'Test 1 FAILED: app.ending_round should be off after end_round_early returns';
  RAISE NOTICE 'Test 1 PASSED: back-9 ended after 6 trims holes 16-18, strips their scores and nulls the differentials';
END $$;

-- =====================================================
-- TEST 2: ended rounds never regain differentials for complete planned
--         input, retained scores, {} cards or newly created cards. C3 now
--         refuses old unbound writes before A7; valid shape-aware patches
--         still exercise A7's ended eligibility nulling.
-- =====================================================
DO $$
DECLARE
  v_complete JSONB;
  v_card UUID;
  v_before JSONB;
  v_raised BOOLEAN;
  v_hint TEXT;
  v_write RECORD;
  v_diffs INT;
BEGIN
  SELECT jsonb_object_agg(h::TEXT, jsonb_build_object('strokes', 4)) INTO v_complete
    FROM generate_series(10, 18) h;
  -- Equivalent to the old complete-card regression without restoring illegal
  -- keys: the same full planned payload is independently complete for back9,
  -- but the shared round-aware eligibility helper refuses it because of N6.
  ASSERT public.scorecard_is_complete_for_handicap(v_complete, 'back9'),
    'Test 2 FAILED: complete planned back9 input must pass the completeness gate';
  ASSERT NOT public.scorecard_eligible_for_differential(
    'ee000000-0000-0000-0001-000000000001', v_complete),
    'Test 2 FAILED: ended round must exclude even complete planned input';
  v_before := pg_temp.end_round_state('ee000000-0000-0000-0001-000000000001');
  v_raised := FALSE;
  BEGIN
    UPDATE scorecards SET scores = v_complete
     WHERE id = 'ee000000-0000-0000-0007-000000000001';
  EXCEPTION WHEN invalid_parameter_value THEN
    v_raised := TRUE;
    GET STACKED DIAGNOSTICS v_hint = PG_EXCEPTION_HINT;
  END;
  ASSERT v_raised AND v_hint = 'round_score_out_of_play',
    'Test 2 FAILED: old complete payload must be rejected without restoring keys';
  ASSERT pg_temp.end_round_state('ee000000-0000-0000-0001-000000000001') = v_before,
    'Test 2 FAILED: rejected old complete payload changed state';

  FOREACH v_card IN ARRAY ARRAY[
    'ee000000-0000-0000-0007-000000000001'::UUID,
    'ee000000-0000-0000-0007-000000000002'::UUID
  ] LOOP
    v_raised := FALSE;
    v_hint := NULL;
    BEGIN
      UPDATE scorecards SET handicap_differential = 9.9 WHERE id = v_card;
    EXCEPTION WHEN invalid_parameter_value THEN
      v_raised := TRUE;
      GET STACKED DIAGNOSTICS v_hint = PG_EXCEPTION_HINT;
    END;
    ASSERT v_raised AND v_hint = 'round_shape_changed',
      'Test 2 FAILED: old unbound differential write must be rejected';
    ASSERT write_scorecard_handicap_patch(v_card,
      '{"handicap_differential":9.9,"course_rating_used":null,"slope_rating_used":null,"daily_handicap_used":null,"ga_handicap_used":null,"expected_round_shape":{"nine_type":"back9","holes_played":6}}'),
      'Test 2 FAILED: valid shape-aware differential patch must apply';
    ASSERT (SELECT handicap_differential IS NULL FROM scorecards WHERE id = v_card),
      'Test 2 FAILED: retained and {} cards must keep NULL after valid patch';
  END LOOP;
  v_raised := FALSE;
  v_hint := NULL;
  BEGIN
    INSERT INTO scorecards (id, round_id, player_id, status, scores, total_gross, handicap_differential) VALUES
      ('ee000000-0000-0000-0007-000000000005', 'ee000000-0000-0000-0001-000000000001',
       'ee000000-0000-0000-0000-000000000005', 'completed', '{}'::JSONB, 30, 1.0);
  EXCEPTION WHEN invalid_parameter_value THEN
    v_raised := TRUE;
    GET STACKED DIAGNOSTICS v_hint = PG_EXCEPTION_HINT;
  END;
  ASSERT v_raised AND v_hint = 'round_shape_changed',
    'Test 2 FAILED: new ended card cannot be created by an unbound old client';
  -- A generated UUID replaces the old fixed SC5 ID; no later case references
  -- that ID. Round/player, {}, completed status, gross30 and NULL outcome match.
  SELECT * INTO v_write FROM write_scorecard_snapshot(
    'ee000000-0000-0000-0001-000000000001', 'ee000000-0000-0000-0000-000000000005', NULL,
    '{"scores":{},"total_gross":30,"status":"completed","handicap_differential":1.0,"expected_round_shape":{"nine_type":"back9","holes_played":6}}');
  ASSERT v_write.applied AND NOT v_write.conflict, 'Test 2 FAILED: new shape-aware card must apply';
  SELECT COUNT(*) INTO v_diffs FROM scorecards
   WHERE round_id = 'ee000000-0000-0000-0001-000000000001' AND handicap_differential IS NOT NULL;
  ASSERT v_diffs = 0, 'Test 2 FAILED: ended round must never regain a differential';
  RAISE NOTICE 'Test 2 PASSED: complete input is ineligible, stale writes refused, valid existing/new writes stay NULL';
END $$;

-- =====================================================
-- TEST 3: a card from an ended round can't be combined; a complete,
--         not-ended completed/confirmed pair can (positive control).
-- =====================================================
DO $$
DECLARE
  v_raised BOOLEAN := FALSE;
  v_count  INT;
BEGIN
  BEGIN
    INSERT INTO handicap_combined_rounds (
      player_id, front_scorecard_id, back_scorecard_id, course_id,
      combined_gross, handicap_differential, course_rating_used, slope_rating_used, effective_date
    ) VALUES (
      'ee000000-0000-0000-0000-000000000001',
      'ee000000-0000-0000-0007-000000000007', 'ee000000-0000-0000-0007-000000000001',
      'ee000000-0000-0000-0006-000000000001',
      81, 10.0, 72.0, 125, NOW()
    );
  -- A7's handicap_combined_rounds_full_cards raises 22023
  -- 'Both nines must be fully scored to combine' (via the replaced
  -- scorecard_eligible_for_differential helper).
  EXCEPTION WHEN SQLSTATE '22023' THEN
    v_raised := TRUE;
    RAISE NOTICE 'Test 3: ended-early combine rejected with SQLSTATE % (%)', SQLSTATE, SQLERRM;
  END;
  ASSERT v_raised, 'Test 3 FAILED: combining a card from an ended round should raise';

  INSERT INTO handicap_combined_rounds (
    player_id, front_scorecard_id, back_scorecard_id, course_id,
    combined_gross, handicap_differential, course_rating_used, slope_rating_used, effective_date
  ) VALUES (
    'ee000000-0000-0000-0000-000000000001',
    'ee000000-0000-0000-0007-000000000007', 'ee000000-0000-0000-0007-000000000008',
    'ee000000-0000-0000-0006-000000000001',
    90, 11.0, 72.0, 125, NOW()
  );
  SELECT COUNT(*) INTO v_count
    FROM handicap_combined_rounds
   WHERE front_scorecard_id = 'ee000000-0000-0000-0007-000000000007';
  ASSERT v_count = 1, 'Test 3 FAILED: the complete, not-ended completed/confirmed pair should combine';
  RAISE NOTICE 'Test 3 PASSED: ended-early cards are not combinable';
END $$;

-- =====================================================
-- TEST 4: retry with the same N (queued item after an online call, or a
--         second phone ending at the same hole) is a no-op success even
--         after completed/confirmed cards on a still-in-progress round.
-- =====================================================
DO $$
DECLARE v_write RECORD; v_scores JSONB;
BEGIN
  SELECT scores INTO v_scores FROM scorecards
   WHERE id = 'ee000000-0000-0000-0007-000000000001';
  SELECT * INTO v_write FROM write_scorecard_snapshot(
    'ee000000-0000-0000-0001-000000000001', 'ee000000-0000-0000-0000-000000000001', 1,
    jsonb_build_object('scores', v_scores, 'total_gross', 24, 'status', 'completed',
      'expected_round_shape', jsonb_build_object('nine_type', 'back9', 'holes_played', 6)));
  ASSERT v_write.applied AND NOT v_write.conflict, 'Test 4 completed fixture submission failed';
  SELECT * INTO v_write FROM write_scorecard_snapshot(
    'ee000000-0000-0000-0001-000000000001', 'ee000000-0000-0000-0000-000000000002', 1,
    '{"scores":{},"total_gross":40,"status":"confirmed","expected_round_shape":{"nine_type":"back9","holes_played":6}}');
  ASSERT v_write.applied AND NOT v_write.conflict, 'Test 4 confirmed fixture submission failed';
END $$;
-- The later out-of-play side-game row is the no-retrim sentinel; C3's Test 2
-- now proves old complete score JSON is rejected instead of storing it.
-- Complete state comparison below still includes every card field/revision.
INSERT INTO skins_results (skins_game_id, hole_number, is_carryover, hole_scores, hole_pot_value)
VALUES ('ee000000-0000-0000-0002-000000000001', 18, TRUE, '{}'::JSONB, 5.00);
DO $$ BEGIN
  ASSERT (SELECT status = 'in-progress' FROM rounds
           WHERE id = 'ee000000-0000-0000-0001-000000000001'),
    'Test 4 FAILED: fixture must remain in progress after card submission';
END $$;
INSERT INTO end_round_before VALUES (
  'ee000000-0000-0000-0001-000000000001',
  pg_temp.end_round_state('ee000000-0000-0000-0001-000000000001')
);
SET LOCAL role authenticated;
SET LOCAL request.jwt.claims = '{"sub":"ee000000-0000-0000-0000-000000000001","role":"authenticated"}';

DO $$ BEGIN
  PERFORM end_round_early('ee000000-0000-0000-0001-000000000001', 6);
END $$;

RESET ROLE;

DO $$
DECLARE
  v_holes SMALLINT;
  v_skins INT;
BEGIN
  SELECT holes_played INTO v_holes FROM rounds WHERE id = 'ee000000-0000-0000-0001-000000000001';
  SELECT COUNT(*) INTO v_skins FROM skins_results WHERE skins_game_id = 'ee000000-0000-0000-0002-000000000001';
  ASSERT v_holes = 6 AND v_skins = 7, 'Test 4 FAILED: same-N retry changed state';
  ASSERT pg_temp.end_round_state('ee000000-0000-0000-0001-000000000001') =
    (SELECT state FROM end_round_before WHERE round_id = 'ee000000-0000-0000-0001-000000000001'),
    'Test 4 FAILED: retry after submission changed round, cards, side-game rows or combinations';
  RAISE NOTICE 'Test 4 PASSED: same-N retry is a no-op';
END $$;

-- =====================================================
-- TEST 5: a different N (phone B ending after 8) is refused with 22023,
--         HINT round_already_ended and DETAIL = the server's N. The first
--         end stands (Review Focus #3).
-- =====================================================
SET LOCAL role authenticated;
SET LOCAL request.jwt.claims = '{"sub":"ee000000-0000-0000-0000-000000000001","role":"authenticated"}';

DO $$
DECLARE
  v_raised BOOLEAN := FALSE;
  v_hint   TEXT;
  v_detail TEXT;
BEGIN
  BEGIN
    PERFORM end_round_early('ee000000-0000-0000-0001-000000000001', 8);
  EXCEPTION WHEN invalid_parameter_value THEN
    v_raised := TRUE;
    GET STACKED DIAGNOSTICS v_hint = PG_EXCEPTION_HINT, v_detail = PG_EXCEPTION_DETAIL;
  END;
  ASSERT v_raised, 'Test 5 FAILED: a different N should raise 22023';
  ASSERT v_hint = 'round_already_ended', 'Test 5 FAILED: HINT should be round_already_ended, got ' || COALESCE(v_hint, 'NULL');
  ASSERT v_detail = '6', 'Test 5 FAILED: DETAIL should carry the server N 6, got ' || COALESCE(v_detail, 'NULL');
END $$;

RESET ROLE;

DO $$
DECLARE
  v_holes SMALLINT;
BEGIN
  SELECT holes_played INTO v_holes FROM rounds WHERE id = 'ee000000-0000-0000-0001-000000000001';
  ASSERT v_holes = 6, 'Test 5 FAILED: holes_played should still be 6, got ' || COALESCE(v_holes::TEXT, 'NULL');
  RAISE NOTICE 'Test 5 PASSED: different N is a conflict; first end wins';
END $$;

-- =====================================================
-- TEST 6: a declined invitee and a pending invitee are rejected (42501),
--         even though both have a round_players row.
-- =====================================================
SET LOCAL role authenticated;
SET LOCAL request.jwt.claims = '{"sub":"ee000000-0000-0000-0000-000000000003","role":"authenticated"}';

DO $$
DECLARE
  v_raised BOOLEAN := FALSE;
BEGIN
  BEGIN
    PERFORM end_round_early('ee000000-0000-0000-0001-000000000002', 5);
  EXCEPTION WHEN insufficient_privilege THEN
    v_raised := TRUE;
  END;
  ASSERT v_raised, 'Test 6 FAILED: a declined invitee should get SQLSTATE 42501';
END $$;

SET LOCAL request.jwt.claims = '{"sub":"ee000000-0000-0000-0000-000000000005","role":"authenticated"}';

DO $$
DECLARE
  v_raised BOOLEAN := FALSE;
BEGIN
  BEGIN
    PERFORM end_round_early('ee000000-0000-0000-0001-000000000002', 5);
  EXCEPTION WHEN insufficient_privilege THEN
    v_raised := TRUE;
  END;
  ASSERT v_raised, 'Test 6 FAILED: a pending invitee should get SQLSTATE 42501';
END $$;

RESET ROLE;

DO $$
DECLARE
  v_holes SMALLINT;
BEGIN
  SELECT holes_played INTO v_holes FROM rounds WHERE id = 'ee000000-0000-0000-0001-000000000002';
  ASSERT v_holes IS NULL, 'Test 6 FAILED: R2 should not be ended';
  RAISE NOTICE 'Test 6 PASSED: declined and pending invitees are rejected';
END $$;

-- =====================================================
-- TEST 7: an outsider (no round_players row) and an unauthenticated call
--         are rejected (42501).
-- =====================================================
SET LOCAL role authenticated;
SET LOCAL request.jwt.claims = '{"sub":"ee000000-0000-0000-0000-000000000004","role":"authenticated"}';

DO $$
DECLARE
  v_raised BOOLEAN := FALSE;
BEGIN
  BEGIN
    PERFORM end_round_early('ee000000-0000-0000-0001-000000000002', 5);
  EXCEPTION WHEN insufficient_privilege THEN
    v_raised := TRUE;
  END;
  ASSERT v_raised, 'Test 7 FAILED: an outsider should get SQLSTATE 42501';
END $$;

SET LOCAL request.jwt.claims = '{"role":"authenticated"}';

DO $$
DECLARE
  v_raised BOOLEAN := FALSE;
BEGIN
  BEGIN
    PERFORM end_round_early('ee000000-0000-0000-0001-000000000002', 5);
  EXCEPTION WHEN insufficient_privilege THEN
    v_raised := TRUE;
  END;
  ASSERT v_raised, 'Test 7 FAILED: a call without a user should get SQLSTATE 42501';
  RAISE NOTICE 'Test 7 PASSED: outsider and unauthenticated calls are rejected';
END $$;

RESET ROLE;

-- =====================================================
-- TEST 8: N must be 1..planned-1 (HINT invalid_holes_played).
-- =====================================================
SET LOCAL role authenticated;
SET LOCAL request.jwt.claims = '{"sub":"ee000000-0000-0000-0000-000000000001","role":"authenticated"}';

DO $$
DECLARE
  v_n      INT;
  v_raised BOOLEAN;
  v_hint   TEXT;
BEGIN
  FOREACH v_n IN ARRAY ARRAY[0, 18, 19] LOOP
    v_raised := FALSE;
    BEGIN
      PERFORM end_round_early('ee000000-0000-0000-0001-000000000002', v_n);
    EXCEPTION WHEN invalid_parameter_value THEN
      v_raised := TRUE;
      GET STACKED DIAGNOSTICS v_hint = PG_EXCEPTION_HINT;
    END;
    ASSERT v_raised AND v_hint = 'invalid_holes_played',
      'Test 8 FAILED: holes_played ' || v_n || ' on a full round should raise 22023 invalid_holes_played';
  END LOOP;

  v_raised := FALSE;
  BEGIN
    PERFORM end_round_early('ee000000-0000-0000-0001-000000000002', NULL);
  EXCEPTION WHEN invalid_parameter_value THEN
    v_raised := TRUE;
  END;
  ASSERT v_raised, 'Test 8 FAILED: a NULL holes_played should raise 22023';
  RAISE NOTICE 'Test 8 PASSED: out-of-range holes_played is rejected';
END $$;

RESET ROLE;

-- =====================================================
-- TEST 9: rounds that are not in progress. Completed and already ended at
--         the same N ⇒ no-op success; a different N ⇒ 22023
--         round_already_ended; completed, never ended ⇒ 22023
--         round_completed; upcoming ⇒ 22023 round_not_in_progress.
-- =====================================================
INSERT INTO end_round_before VALUES (
  'ee000000-0000-0000-0001-000000000004',
  pg_temp.end_round_state('ee000000-0000-0000-0001-000000000004')
);
SET LOCAL role authenticated;
SET LOCAL request.jwt.claims = '{"sub":"ee000000-0000-0000-0000-000000000001","role":"authenticated"}';

DO $$
DECLARE
  v_raised BOOLEAN := FALSE;
  v_hint   TEXT;
BEGIN
  PERFORM end_round_early('ee000000-0000-0000-0001-000000000004', 6);

  BEGIN
    PERFORM end_round_early('ee000000-0000-0000-0001-000000000004', 7);
  EXCEPTION WHEN invalid_parameter_value THEN
    v_raised := TRUE;
    GET STACKED DIAGNOSTICS v_hint = PG_EXCEPTION_HINT;
  END;
  ASSERT v_raised AND v_hint = 'round_already_ended',
    'Test 9 FAILED: completed round ended at 6, called with 7, should raise round_already_ended';

  v_raised := FALSE;
  v_hint := NULL;
  BEGIN
    PERFORM end_round_early('ee000000-0000-0000-0001-000000000005', 6);
  EXCEPTION WHEN invalid_parameter_value THEN
    v_raised := TRUE;
    GET STACKED DIAGNOSTICS v_hint = PG_EXCEPTION_HINT;
  END;
  ASSERT v_raised AND v_hint = 'round_completed',
    'Test 9 FAILED: a completed, never-ended round should raise round_completed';

  v_raised := FALSE;
  v_hint := NULL;
  BEGIN
    PERFORM end_round_early('ee000000-0000-0000-0001-000000000009', 6);
  EXCEPTION WHEN invalid_parameter_value THEN
    v_raised := TRUE;
    GET STACKED DIAGNOSTICS v_hint = PG_EXCEPTION_HINT;
  END;
  ASSERT v_raised AND v_hint = 'round_not_in_progress',
    'Test 9 FAILED: an upcoming round should raise round_not_in_progress, got ' || COALESCE(v_hint, 'NULL');
END $$;

RESET ROLE;

DO $$
DECLARE
  v_r4 SMALLINT;
  v_r5 SMALLINT;
  v_r9 SMALLINT;
BEGIN
  SELECT holes_played INTO v_r4 FROM rounds WHERE id = 'ee000000-0000-0000-0001-000000000004';
  SELECT holes_played INTO v_r5 FROM rounds WHERE id = 'ee000000-0000-0000-0001-000000000005';
  SELECT holes_played INTO v_r9 FROM rounds WHERE id = 'ee000000-0000-0000-0001-000000000009';
  ASSERT v_r4 = 6 AND v_r5 IS NULL AND v_r9 IS NULL, 'Test 9 FAILED: rounds that are not in progress changed';
  ASSERT pg_temp.end_round_state('ee000000-0000-0000-0001-000000000004') =
    (SELECT state FROM end_round_before WHERE round_id = 'ee000000-0000-0000-0001-000000000004'),
    'Test 9 FAILED: same-N completed-round retry changed submitted cards or other state';
  RAISE NOTICE 'Test 9 PASSED: completed and upcoming rounds are guarded';
END $$;

-- =====================================================
-- TEST 10: competition rounds are rejected (42501), even for the
--          organiser; a deleted or missing round is P0002.
-- =====================================================
SET LOCAL role authenticated;
SET LOCAL request.jwt.claims = '{"sub":"ee000000-0000-0000-0000-000000000001","role":"authenticated"}';

DO $$
DECLARE
  v_raised BOOLEAN := FALSE;
BEGIN
  BEGIN
    PERFORM end_round_early('ee000000-0000-0000-0001-000000000003', 6);
  EXCEPTION WHEN insufficient_privilege THEN
    v_raised := TRUE;
  END;
  ASSERT v_raised, 'Test 10 FAILED: a competition round should raise 42501';

  v_raised := FALSE;
  BEGIN
    PERFORM end_round_early('ee000000-0000-0000-0001-000000000006', 6);
  EXCEPTION WHEN no_data_found THEN
    v_raised := TRUE;
  END;
  ASSERT v_raised, 'Test 10 FAILED: a soft-deleted round should raise P0002';

  v_raised := FALSE;
  BEGIN
    PERFORM end_round_early('ee000000-0000-0000-0001-0000000000ff', 6);
  EXCEPTION WHEN no_data_found THEN
    v_raised := TRUE;
  END;
  ASSERT v_raised, 'Test 10 FAILED: a missing round should raise P0002';
  RAISE NOTICE 'Test 10 PASSED: competition, deleted and missing rounds are rejected';
END $$;

RESET ROLE;

-- =====================================================
-- TEST 11: the CHECK constraint (standalone only; 1 <= N < planned).
--          Direct writes need the guard's flag (Test 13 covers the guard).
-- =====================================================
DO $$
DECLARE
  v_case   TEXT;
  v_raised BOOLEAN;
BEGIN
  PERFORM set_config('app.ending_round', 'on', true);
  FOREACH v_case IN ARRAY ARRAY['full-18', 'full-0', 'back9-9', 'competition-3'] LOOP
    v_raised := FALSE;
    BEGIN
      IF v_case = 'full-18' THEN
        UPDATE rounds SET holes_played = 18 WHERE id = 'ee000000-0000-0000-0001-000000000002';
      ELSIF v_case = 'full-0' THEN
        UPDATE rounds SET holes_played = 0 WHERE id = 'ee000000-0000-0000-0001-000000000002';
      ELSIF v_case = 'back9-9' THEN
        UPDATE rounds SET holes_played = 9 WHERE id = 'ee000000-0000-0000-0001-000000000001';
      ELSE
        UPDATE rounds SET holes_played = 3 WHERE id = 'ee000000-0000-0000-0001-000000000003';
      END IF;
    EXCEPTION WHEN check_violation THEN
      v_raised := TRUE;
    END;
    ASSERT v_raised, 'Test 11 FAILED: CHECK should reject case ' || v_case;
  END LOOP;
  PERFORM set_config('app.ending_round', 'off', true);
  RAISE NOTICE 'Test 11 PASSED: rounds_holes_played_check enforces the range and standalone-only';
END $$;

-- =====================================================
-- TEST 12: feed/RPC catalog, A7 triggers and the additional submission
--          guard, function attributes, pinned paths and denied helper execution.
-- =====================================================
DO $$
DECLARE
  v_count INT;
  v_function OID;
  v_role TEXT;
BEGIN
  SELECT COUNT(*) INTO v_count
    FROM pg_proc
   WHERE pronamespace = 'public'::regnamespace
     AND proname IN ('get_activity_feed', 'get_round_feed_card')
     AND 'holes_played' = ANY (proargnames)
     AND 'nine_type' = ANY (proargnames);
  ASSERT v_count = 2, 'Test 12 FAILED: expected 2 feed functions with the new columns, got ' || v_count;

  SELECT COUNT(*) INTO v_count FROM pg_proc WHERE pronamespace = 'public'::regnamespace AND proname = 'end_round_early';
  ASSERT v_count = 1, 'Test 12 FAILED: expected one end_round_early overload, got ' || v_count;
  ASSERT (SELECT pronargs = 2 FROM pg_proc WHERE oid = 'public.end_round_early(uuid, integer)'::regprocedure),
    'Test 12 FAILED: end_round_early must have exactly two arguments';
  ASSERT has_function_privilege('authenticated', 'end_round_early(uuid, integer)', 'EXECUTE'),
    'Test 12 FAILED: authenticated must be able to execute end_round_early';

  -- B1a-1 replaced A7's shared helper (not the triggers).
  ASSERT position('holes_played' IN pg_get_functiondef('public.scorecard_eligible_for_differential(uuid, jsonb)'::regprocedure)) > 0,
    'Test 12 FAILED: scorecard_eligible_for_differential should check rounds.holes_played';
  SELECT COUNT(*) INTO v_count
    FROM pg_trigger
   WHERE tgname IN ('scorecards_full_card_differential', 'handicap_combined_rounds_full_cards')
     AND NOT tgisinternal;
  ASSERT v_count = 2, 'Test 12 FAILED: expected A7''s two triggers, got ' || v_count;

  -- search_path pinned with pg_temp last on the definer RPC and the helper.
  SELECT COUNT(*) INTO v_count
    FROM pg_proc
   WHERE oid IN ('public.end_round_early(uuid, integer)'::regprocedure,
                 'public.scorecard_eligible_for_differential(uuid, jsonb)'::regprocedure)
     AND 'search_path=public, pg_temp' = ANY (proconfig);
  ASSERT v_count = 2, 'Test 12 FAILED: expected search_path=public, pg_temp on 2 functions, got ' || v_count;

  SELECT COUNT(*) INTO v_count
    FROM pg_trigger
   WHERE tgname = 'trigger_guard_rounds_holes_played'
     AND tgrelid = 'public.rounds'::regclass
     AND NOT tgisinternal;
  ASSERT v_count = 1, 'Test 12 FAILED: expected the holes_played guard trigger on rounds, got ' || v_count;
  SELECT COUNT(*) INTO v_count FROM pg_trigger
   WHERE tgname = 'handicap_combined_rounds_submitted_cards'
     AND tgrelid = 'public.handicap_combined_rounds'::regclass
     AND tgfoid = 'public.guard_handicap_combined_round_submission()'::regprocedure
     AND tgtype = 7 AND tgenabled = 'O' AND NOT tgisinternal;
  ASSERT v_count = 1, 'Test 12 FAILED: expected the enabled BEFORE INSERT ROW submission guard';
  ASSERT (SELECT provolatile = 'v' AND prosecdef
                 AND 'search_path=public, pg_temp' = ANY(proconfig)
            FROM pg_proc WHERE oid = 'public.guard_handicap_combined_round_submission()'::regprocedure),
    'Test 12 FAILED: submission guard must be VOLATILE, SECURITY DEFINER with fixed search_path';
  ASSERT (SELECT prosecdef FROM pg_proc WHERE oid = 'public.end_round_early(uuid, integer)'::regprocedure),
    'Test 12 FAILED: end_round_early must be SECURITY DEFINER';
  ASSERT (SELECT 'search_path=public, pg_temp' = ANY(proconfig) FROM pg_proc
           WHERE oid = 'public.guard_rounds_holes_played()'::regprocedure),
    'Test 12 FAILED: rounds guard must have fixed search_path';

  -- PUBLIC is ACL grantee 0, not a role accepted by has_function_privilege.
  -- Check its ACL explicitly, then check effective privileges for client roles.
  FOR v_function IN SELECT unnest(ARRAY[
    'public.scorecard_eligible_for_differential(uuid, jsonb)'::regprocedure::OID,
    'public.scorecards_full_card_differential()'::regprocedure::OID,
    'public.handicap_combined_rounds_full_cards()'::regprocedure::OID,
    'public.guard_handicap_combined_round_submission()'::regprocedure::OID
  ]) LOOP
    ASSERT NOT EXISTS (
      SELECT 1 FROM pg_proc p,
        LATERAL aclexplode(COALESCE(p.proacl, acldefault('f', p.proowner))) acl
       WHERE p.oid = v_function AND acl.grantee = 0 AND acl.privilege_type = 'EXECUTE'
    ), 'Test 12 FAILED: PUBLIC must not execute helper ' || v_function::regprocedure::TEXT;
    FOREACH v_role IN ARRAY ARRAY['anon', 'authenticated'] LOOP
      ASSERT NOT has_function_privilege(v_role, v_function, 'EXECUTE'),
        'Test 12 FAILED: ' || v_role || ' must not execute helper ' || v_function::regprocedure::TEXT;
    END LOOP;
  END LOOP;
  RAISE NOTICE 'Test 12 PASSED: catalog is as expected';
END $$;

-- =====================================================
-- TEST 13: holes_played is RPC-only, and nine_type is frozen once it is
--          set. Direct writes by the owner (RLS allows the row) and by a
--          superuser are refused with 42501; a nine_type change on a round
--          that wasn't ended still works (positive control).
-- =====================================================
SET LOCAL role authenticated;
SET LOCAL request.jwt.claims = '{"sub":"ee000000-0000-0000-0000-000000000001","role":"authenticated"}';

DO $$
DECLARE
  v_case   TEXT;
  v_raised BOOLEAN;
BEGIN
  ASSERT COALESCE(current_setting('app.ending_round', true), '') <> 'on',
    'Test 13 FAILED: app.ending_round should be off before the guard checks';

  FOREACH v_case IN ARRAY ARRAY['set', 'change', 'clear', 'nine_type'] LOOP
    v_raised := FALSE;
    BEGIN
      IF v_case = 'set' THEN
        -- R2: full, in progress, never ended.
        UPDATE rounds SET holes_played = 5 WHERE id = 'ee000000-0000-0000-0001-000000000002';
      ELSIF v_case = 'change' THEN
        -- R1: back 9, ended after 6.
        UPDATE rounds SET holes_played = 7 WHERE id = 'ee000000-0000-0000-0001-000000000001';
      ELSIF v_case = 'clear' THEN
        UPDATE rounds SET holes_played = NULL WHERE id = 'ee000000-0000-0000-0001-000000000001';
      ELSE
        UPDATE rounds SET nine_type = 'front9' WHERE id = 'ee000000-0000-0000-0001-000000000001';
      END IF;
    EXCEPTION WHEN insufficient_privilege THEN
      v_raised := TRUE;
    END;
    ASSERT v_raised, 'Test 13 FAILED: the owner''s direct write should raise 42501 (case ' || v_case || ')';
  END LOOP;

  -- Positive control: R2 was never ended, so its nine type can change.
  UPDATE rounds SET nine_type = 'front9' WHERE id = 'ee000000-0000-0000-0001-000000000002';
END $$;

RESET ROLE;

DO $$
DECLARE
  v_raised BOOLEAN := FALSE;
  v_r1     SMALLINT;
  v_r1nine TEXT;
  v_r2     SMALLINT;
  v_r2nine TEXT;
BEGIN
  -- No service-role exemption: without the flag even a superuser is refused.
  BEGIN
    UPDATE rounds SET holes_played = 3 WHERE id = 'ee000000-0000-0000-0001-000000000002';
  EXCEPTION WHEN insufficient_privilege THEN
    v_raised := TRUE;
  END;
  ASSERT v_raised, 'Test 13 FAILED: a superuser write without app.ending_round should raise 42501';

  SELECT holes_played, nine_type INTO v_r1, v_r1nine FROM rounds WHERE id = 'ee000000-0000-0000-0001-000000000001';
  SELECT holes_played, nine_type INTO v_r2, v_r2nine FROM rounds WHERE id = 'ee000000-0000-0000-0001-000000000002';
  ASSERT v_r1 = 6 AND v_r1nine = 'back9', 'Test 13 FAILED: R1 should still be back9 ended after 6';
  ASSERT v_r2 IS NULL AND v_r2nine = 'front9', 'Test 13 FAILED: R2 should be front9 (positive control) and not ended';
  RAISE NOTICE 'Test 13 PASSED: holes_played is RPC-only and nine_type is frozen once ended';
END $$;

-- =====================================================
-- TEST 14: separately refuse completed and confirmed scorecards while
--          the round is still in progress. Every trimmed table has rows
--          past N and the complete card has a non-null differential.
-- =====================================================
INSERT INTO rounds (id, user_id, status, nine_type) VALUES
  ('ee000000-0000-0000-0001-000000000010', 'ee000000-0000-0000-0000-000000000001', 'in-progress', 'back9'),
  ('ee000000-0000-0000-0001-000000000011', 'ee000000-0000-0000-0000-000000000001', 'in-progress', 'back9');

INSERT INTO scorecards (id, round_id, player_id, status, scores, total_gross, handicap_differential)
SELECT f.card_id, f.round_id, 'ee000000-0000-0000-0000-000000000001', f.status,
       (SELECT jsonb_object_agg(h::TEXT, jsonb_build_object('strokes', 4)) FROM generate_series(10, 18) h),
       36, 12.3
  FROM (VALUES
    ('ee000000-0000-0000-0007-000000000010'::UUID, 'ee000000-0000-0000-0001-000000000010'::UUID, 'completed'),
    ('ee000000-0000-0000-0007-000000000011'::UUID, 'ee000000-0000-0000-0001-000000000011'::UUID, 'confirmed')
  ) f(card_id, round_id, status);

-- Match R1's known-valid side-game shapes; each refusal must preserve all
-- nine rows of each type, not just its round marker and scorecard payload.
DO $$
DECLARE
  v_suffix TEXT;
  v_round UUID;
  v_skins UUID;
  v_wolf UUID;
BEGIN
  FOREACH v_suffix IN ARRAY ARRAY['000000000010', '000000000011'] LOOP
    v_round := ('ee000000-0000-0000-0001-' || v_suffix)::UUID;
    v_skins := ('ee000000-0000-0000-0002-' || v_suffix)::UUID;
    v_wolf := ('ee000000-0000-0000-0003-' || v_suffix)::UUID;
    INSERT INTO skins_games (
      id, round_id, participant_ids, pot_type, pot_value, scoring_type,
      disclaimer_accepted_at, disclaimer_accepted_by, created_by
    ) SELECT v_skins, v_round, participant_ids, pot_type, pot_value, scoring_type,
             disclaimer_accepted_at, disclaimer_accepted_by, created_by
        FROM skins_games WHERE id = 'ee000000-0000-0000-0002-000000000001';
    INSERT INTO skins_results (skins_game_id, hole_number, is_carryover, hole_scores, hole_pot_value)
      SELECT v_skins, h, TRUE, '{}'::JSONB, 5.00 FROM generate_series(10, 18) h;
    INSERT INTO wolf_games (id, round_id, participant_ids, wolf_order, created_by)
      SELECT v_wolf, v_round, participant_ids, wolf_order, created_by
        FROM wolf_games WHERE id = 'ee000000-0000-0000-0003-000000000001';
    INSERT INTO wolf_hole_decisions (wolf_game_id, hole_number, wolf_id)
      SELECT v_wolf, h, 'ee000000-0000-0000-0000-000000000001' FROM generate_series(10, 18) h;
    INSERT INTO score_entries (round_id, player_id, hole_number, scorer_id, strokes)
      SELECT v_round, 'ee000000-0000-0000-0000-000000000001', h,
             'ee000000-0000-0000-0000-000000000001', 4 FROM generate_series(10, 18) h;
    INSERT INTO score_mismatches (round_id, player_id, hole_number, entries, status)
      SELECT v_round, 'ee000000-0000-0000-0000-000000000001', hole_number, entries, status
        FROM score_mismatches WHERE round_id = 'ee000000-0000-0000-0001-000000000001';
    -- R1 was already trimmed; explicitly seed the tail to detect deletion.
    INSERT INTO score_mismatches (round_id, player_id, hole_number, entries, status)
      SELECT v_round, 'ee000000-0000-0000-0000-000000000001', h,
             '[{"scorer_id":"ee000000-0000-0000-0000-000000000001","strokes":4},{"scorer_id":"ee000000-0000-0000-0000-000000000002","strokes":5}]'::JSONB,
             'pending' FROM generate_series(16, 18) h;
    INSERT INTO shot_log (round_id, hole_number, player_id, sequence, latitude, longitude)
      SELECT v_round, h, 'ee000000-0000-0000-0000-000000000001', 1, -37.9500000, 144.9500000
        FROM generate_series(10, 18) h;
    ASSERT (SELECT status = 'in-progress' AND holes_played IS NULL FROM rounds WHERE id = v_round),
      'Test 14 FAILED: round must be in progress and never ended';
    ASSERT (SELECT handicap_differential = 12.3 FROM scorecards WHERE round_id = v_round),
      'Test 14 FAILED: submitted fixture must have a differential before refusal';
    INSERT INTO end_round_before VALUES (v_round, pg_temp.end_round_state(v_round));
  END LOOP;
END $$;

SET LOCAL role authenticated;
SET LOCAL request.jwt.claims = '{"sub":"ee000000-0000-0000-0000-000000000001","role":"authenticated"}';
DO $$
DECLARE
  v_round UUID;
  v_raised BOOLEAN;
  v_hint TEXT;
BEGIN
  FOREACH v_round IN ARRAY ARRAY[
    'ee000000-0000-0000-0001-000000000010'::UUID,
    'ee000000-0000-0000-0001-000000000011'::UUID
  ] LOOP
    v_raised := FALSE;
    v_hint := NULL;
    BEGIN
      PERFORM end_round_early(v_round, 6);
    EXCEPTION WHEN invalid_parameter_value THEN
      v_raised := TRUE;
      GET STACKED DIAGNOSTICS v_hint = PG_EXCEPTION_HINT;
    END;
    ASSERT v_raised AND v_hint = 'round_has_submitted_scorecards',
      'Test 14 FAILED: submitted card must raise 22023 / round_has_submitted_scorecards, got ' || COALESCE(v_hint, 'NULL');
  END LOOP;
END $$;
RESET ROLE;
DO $$
DECLARE
  v_round UUID;
BEGIN
  FOREACH v_round IN ARRAY ARRAY[
    'ee000000-0000-0000-0001-000000000010'::UUID,
    'ee000000-0000-0000-0001-000000000011'::UUID
  ] LOOP
    ASSERT pg_temp.end_round_state(v_round) = (SELECT state FROM end_round_before WHERE round_id = v_round),
      'Test 14 FAILED: submitted-card refusal changed round, scores, side-game rows or differential';
  END LOOP;
  RAISE NOTICE 'Test 14 PASSED: completed and confirmed cards independently refuse ending without effects';
END $$;

-- =====================================================
-- TEST 15: preserve existing combination history. The valid pair from
--          Test 3 is made representative of legacy pre-correction history
--          by reverting its source rounds/cards to in-progress. Check both
--          front and back references, isolating the combined-card hint from
--          the earlier submitted check.
-- =====================================================
UPDATE rounds SET status = 'in-progress'
 WHERE id IN ('ee000000-0000-0000-0001-000000000007', 'ee000000-0000-0000-0001-000000000008');
UPDATE scorecards SET status = 'in-progress'
 WHERE id IN ('ee000000-0000-0000-0007-000000000007', 'ee000000-0000-0000-0007-000000000008');
INSERT INTO end_round_before
SELECT id, pg_temp.end_round_state(id) FROM rounds
 WHERE id IN ('ee000000-0000-0000-0001-000000000007', 'ee000000-0000-0000-0001-000000000008');
SET LOCAL role authenticated;
SET LOCAL request.jwt.claims = '{"sub":"ee000000-0000-0000-0000-000000000001","role":"authenticated"}';
DO $$
DECLARE
  v_round UUID;
  v_raised BOOLEAN;
  v_hint TEXT;
BEGIN
  FOREACH v_round IN ARRAY ARRAY[
    'ee000000-0000-0000-0001-000000000007'::UUID,
    'ee000000-0000-0000-0001-000000000008'::UUID
  ] LOOP
    v_raised := FALSE;
    v_hint := NULL;
    BEGIN
      PERFORM end_round_early(v_round, 6);
    EXCEPTION WHEN invalid_parameter_value THEN
      v_raised := TRUE;
      GET STACKED DIAGNOSTICS v_hint = PG_EXCEPTION_HINT;
    END;
    ASSERT v_raised AND v_hint = 'round_has_combined_scorecards',
      'Test 15 FAILED: either legacy combination reference must raise 22023 / round_has_combined_scorecards';
  END LOOP;
END $$;
RESET ROLE;
DO $$
DECLARE
  v_round UUID;
BEGIN
  FOREACH v_round IN ARRAY ARRAY[
    'ee000000-0000-0000-0001-000000000007'::UUID,
    'ee000000-0000-0000-0001-000000000008'::UUID
  ] LOOP
    ASSERT (SELECT jsonb_array_length(state->'combinations') = 1 FROM end_round_before WHERE round_id = v_round),
      'Test 15 FAILED: fixture must reference one stored combination';
    ASSERT pg_temp.end_round_state(v_round) = (SELECT state FROM end_round_before WHERE round_id = v_round),
      'Test 15 FAILED: existing combination or source round/card data changed';
  END LOOP;
  RAISE NOTICE 'Test 15 PASSED: existing combination and both source cards/rounds are preserved';
END $$;

-- =====================================================
-- TEST 16: complete per-hole payloads pass A7, but a direct INSERT with
--          either an in-progress front or an in-progress back must reach
--          and fail the new submission guard (verify its exact message).
-- =====================================================
INSERT INTO rounds (id, user_id, status, nine_type) VALUES
  ('ee000000-0000-0000-0001-000000000012', 'ee000000-0000-0000-0000-000000000001', 'completed', 'front9'),
  ('ee000000-0000-0000-0001-000000000013', 'ee000000-0000-0000-0000-000000000001', 'completed', 'back9');
INSERT INTO scorecards (id, round_id, player_id, status, scores, total_gross, handicap_differential)
SELECT 'ee000000-0000-0000-0007-000000000012', 'ee000000-0000-0000-0001-000000000012',
       'ee000000-0000-0000-0000-000000000001', 'in-progress',
       jsonb_object_agg(h::TEXT, jsonb_build_object('strokes', 5)), 45, 5.0
  FROM generate_series(1, 9) h;
INSERT INTO scorecards (id, round_id, player_id, status, scores, total_gross, handicap_differential)
SELECT 'ee000000-0000-0000-0007-000000000013', 'ee000000-0000-0000-0001-000000000013',
       'ee000000-0000-0000-0000-000000000001', 'confirmed',
       jsonb_object_agg(h::TEXT, jsonb_build_object('strokes', 5)), 45, 6.0
  FROM generate_series(10, 18) h;
DO $$
DECLARE
  v_case TEXT;
  v_raised BOOLEAN;
  v_message TEXT;
BEGIN
  FOREACH v_case IN ARRAY ARRAY['front', 'back'] LOOP
    IF v_case = 'back' THEN
      UPDATE scorecards SET status = 'confirmed' WHERE id = 'ee000000-0000-0000-0007-000000000012';
      UPDATE scorecards SET status = 'in-progress' WHERE id = 'ee000000-0000-0000-0007-000000000013';
    END IF;
    ASSERT (SELECT bool_and(public.scorecard_eligible_for_differential(round_id, scores))
              FROM scorecards WHERE id IN ('ee000000-0000-0000-0007-000000000012', 'ee000000-0000-0000-0007-000000000013')),
      'Test 16 FAILED: both complete fixtures must pass A7 eligibility before submission guard';
    v_raised := FALSE;
    v_message := NULL;
    BEGIN
      INSERT INTO handicap_combined_rounds (
        player_id, front_scorecard_id, back_scorecard_id, course_id,
        combined_gross, handicap_differential, course_rating_used, slope_rating_used, effective_date
      ) VALUES (
        'ee000000-0000-0000-0000-000000000001',
        'ee000000-0000-0000-0007-000000000012', 'ee000000-0000-0000-0007-000000000013',
        'ee000000-0000-0000-0006-000000000001', 90, 11.0, 72.0, 125, NOW()
      );
    EXCEPTION WHEN invalid_parameter_value THEN
      v_raised := TRUE;
      GET STACKED DIAGNOSTICS v_message = MESSAGE_TEXT;
    END;
    ASSERT v_raised AND v_message = 'Both nines must be submitted and eligible for handicap to combine',
      'Test 16 FAILED: in-progress ' || v_case || ' must raise 22023 from the new guard';
  END LOOP;
  ASSERT NOT EXISTS (SELECT 1 FROM handicap_combined_rounds
                     WHERE front_scorecard_id = 'ee000000-0000-0000-0007-000000000012'),
    'Test 16 FAILED: rejected INSERT must not store a combination';
  RAISE NOTICE 'Test 16 PASSED: in-progress front and back cards cannot be combined directly';
END $$;

DO $$
BEGIN
  RAISE NOTICE '============================================';
  RAISE NOTICE 'All end-round-early verification tests completed.';
  RAISE NOTICE 'Rolling back. No data will be persisted.';
  RAISE NOTICE '============================================';
END $$;

ROLLBACK;

-- =====================================================
-- STAGING TWO-SESSION CHECKS -- B11 rollout ONLY, not run by this file.
-- No database execution is authorized during B1a implementation. Busy-card
-- refusal and concurrency behavior remain UNVERIFIED until these checks run.
-- Use isolated disposable staging fixtures with committed seed data so both
-- sessions can see them; this file's rolled-back fixtures are not visible to
-- a second session. Use separate transactions at READ COMMITTED, separate
-- connections, ON_ERROR_STOP and verbose error output (SQLSTATE plus HINT).
-- Snapshot complete round/card rows, all five trimmed tables and every field
-- of each existing combination before each case; compare after each refusal.
-- Run expected errors under SAVEPOINTs, then ROLLBACK TO SAVEPOINT so the
-- independent transaction can still inspect state. Record actual errors and
-- elapsed time; never infer a busy-card pass from a single-session test.
--
-- 1. Busy card / submission order:
--    A: BEGIN; SELECT the target scorecard FOR UPDATE (or start its real
--       submission UPDATE); leave the transaction open.
--    B: BEGIN; call end_round_early(target_round, valid_N) as its owner.
--       Expect immediate 22023 / round_scorecards_busy, no deadlock and no
--       state changes. Roll back B's failed call to its SAVEPOINT.
--    A: COMMIT or ROLLBACK. Retry B: success only if still eligible; if the
--       card was submitted, expect round_has_submitted_scorecards.
--    Repeat using the real submission path: B first locks the target round
--    FOR UPDATE in its open transaction. A then submits the final remaining
--    card so notify_round_completed waits on B's round lock while holding
--    the card lock. B calls end_round_early and must receive the busy hint;
--    roll back B's whole transaction to release its earlier round lock, then
--    let A finish. Use a fixture with completion_notified = FALSE and all
--    other cards submitted so the actual notification UPDATE is reached.
--
-- 2. End acquires locks first:
--    Seed and COMMIT disposable fixtures: a completed/confirmed target card
--    with complete per-hole scores and no holes_played marker, plus a complete
--    completed/confirmed companion for the other nine. Both must be eligible,
--    belong to the same player/course and be unused by any stored combination.
--    Keep the target round in-progress with another in-progress scorecard;
--    no other card on that round may be completed/confirmed. Snapshot the
--    cards, round, affected rows and existing unrelated combination history.
--    A: BEGIN as the privileged fixture administrator; set owner JWT claims
--       for the RPC. Directly UPDATE only the target card status to
--       in-progress, then call end_round_early(target_round, valid_N).
--       Before COMMIT, MUST directly UPDATE that target card back to its
--       original completed/confirmed status. Keep A's transaction open;
--       its end marker and card changes are uncommitted and locks retained.
--       These fixture-only direct status updates bypass the normal monotonic
--       write_scorecard_snapshot path to isolate the fresh-read invariant;
--       use only disposable staging data, never an ordinary app submission.
--    B: BEGIN; SAVEPOINT combine_attempt; INSERT the target/companion pair.
--       B's old committed view has submitted status AND full eligibility, so
--       stale-state validation would succeed. A7 passes on that old view;
--       confirm the new guard waits on FOR SHARE for A's card lock.
--    A: COMMIT only after confirming B waits and the target status was restored.
--    B: Must re-read the committed early-end state and reject SQLSTATE 22023
--       with the exact message:
--       'Both nines must be submitted and eligible for handicap to combine'.
--       Both cards now have submitted status;
--       the target fails handicap eligibility after the end. Any other error,
--       an INSERT success or merely observing 22023 does not pass this check.
--       ROLLBACK TO SAVEPOINT combine_attempt; verify no pair was stored,
--       holes_played = valid_N, the submitted target remains trimmed with a
--       NULL differential, the other target-round card remains in-progress,
--       and the companion/existing combination history match their snapshots.
--       ROLLBACK B; record results and clean up the committed disposable
--       fixtures after A's committed state and history have been verified.
--
-- 3. Combination acquires locks first:
--    A: BEGIN; INSERT a valid completed/confirmed eligible pair whose target
--       round remains in-progress; leave the transaction open.
--    B: BEGIN; end the referenced round. Expect immediate 22023 /
--       round_scorecards_busy because A retains the shared card locks.
--    A: COMMIT. Retry B after rolling back its failed call to a SAVEPOINT;
--       expect round_has_submitted_scorecards. For the isolated combined-card
--       hint, prepare legacy history by reverting the target card to
--       in-progress after A commits, then retry and expect
--       round_has_combined_scorecards. The stored combination stays intact.
--
-- 4. Existing history:
--    Snapshot a committed pair, its source cards/differentials and rounds.
--    Attempt the forbidden end; verify the entire pair, differentials,
--    per-hole scores, side-game rows and round data remain unchanged.
--    Record results in B11 rollout notes. Clean up only the isolated staging
--    fixtures, including any deliberately committed concurrency fixtures.
-- =====================================================
