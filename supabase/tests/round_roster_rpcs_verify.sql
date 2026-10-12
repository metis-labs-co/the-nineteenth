-- =====================================================
-- Round roster RPCs - verification script
-- =====================================================
-- Run AFTER applying 20261012000000_round_roster_rpcs.sql (and the
-- end_round_early migrations 20261007000100/200/300, which step 8 needs).
-- Human recipe, never run during authoring (staging only, never the prod-linked CLI):
--   psql "$STAGING_DB_URL" -v ON_ERROR_STOP=1 <<'SQL'
--   SET default_transaction_read_only = off;
--   show transaction_read_only; -- must print off
--   \i supabase/tests/round_roster_rpcs_verify.sql
--   SQL
-- This file contains BEGIN ... ROLLBACK. A failed ASSERT aborts the script.
--
-- Authored without database access. Column names were verified from migration
-- SQL (round_players.added_by/invitation_status/responded_at, score_entries,
-- score_mismatches.self_scorer_id/partner_scorer_id, score_submission_status.
-- partner_id, shot_log, user_blocks.blocker_id/blocked_id). First-run fixups may
-- still be needed (NOT NULL columns on score_mismatches/score_submission_status,
-- trigger side-effects).
--
-- Fixture players (all UUIDs are placeholders, prefix ab000000):
--   ..01 O owner, ..02 F friend, ..03 G guest (placeholder created by O),
--   ..04 X outsider (blocked by O in 3c), ..05 Y, ..06 Z fillers.
-- Rounds: R ..0001 main, R2 ..0002 normal-invite regression, R3 ..0003 ended,
--         R4 ..0004 submitted card, R5 ..0005 full.
-- =====================================================

BEGIN;

INSERT INTO auth.users (id, email) VALUES
  ('ab000000-0000-0000-0000-000000000001', 'rr-verify-owner@example.com'),
  ('ab000000-0000-0000-0000-000000000002', 'rr-verify-friend@example.com'),
  ('ab000000-0000-0000-0000-000000000004', 'rr-verify-outsider@example.com'),
  ('ab000000-0000-0000-0000-000000000005', 'rr-verify-y@example.com'),
  ('ab000000-0000-0000-0000-000000000006', 'rr-verify-z@example.com');

INSERT INTO players (id, name, email) VALUES
  ('ab000000-0000-0000-0000-000000000001', 'RR Owner', 'rr-verify-owner@example.com'),
  ('ab000000-0000-0000-0000-000000000002', 'RR Friend', 'rr-verify-friend@example.com'),
  ('ab000000-0000-0000-0000-000000000004', 'RR Outsider', 'rr-verify-outsider@example.com'),
  ('ab000000-0000-0000-0000-000000000005', 'RR Y', 'rr-verify-y@example.com'),
  ('ab000000-0000-0000-0000-000000000006', 'RR Z', 'rr-verify-z@example.com')
ON CONFLICT (id) DO NOTHING;
-- Guest (placeholder) player: no auth user.
INSERT INTO players (id, name, is_placeholder, created_by)
  VALUES ('ab000000-0000-0000-0000-000000000003', 'RR Guest', TRUE, 'ab000000-0000-0000-0000-000000000001')
ON CONFLICT (id) DO NOTHING;

INSERT INTO clubs (id, source, name)
  VALUES ('ab000000-0000-0000-0005-000000000001', 'manual', 'RR Verify Club');
INSERT INTO courses (id, club_id, name)
  VALUES ('ab000000-0000-0000-0006-000000000001', 'ab000000-0000-0000-0005-000000000001', 'RR Verify Course');

-- Standalone in-progress rounds owned by O (course set so the invite trigger's
-- rounds/courses/clubs join resolves).
INSERT INTO rounds (id, user_id, course_id, status) VALUES
  ('ab000000-0000-0000-0001-000000000001',  'ab000000-0000-0000-0000-000000000001', 'ab000000-0000-0000-0006-000000000001', 'in-progress'),
  ('ab000000-0000-0000-0001-000000000002', 'ab000000-0000-0000-0000-000000000001', 'ab000000-0000-0000-0006-000000000001', 'in-progress'),
  ('ab000000-0000-0000-0001-000000000003', 'ab000000-0000-0000-0000-000000000001', 'ab000000-0000-0000-0006-000000000001', 'in-progress'),
  ('ab000000-0000-0000-0001-000000000004', 'ab000000-0000-0000-0000-000000000001', 'ab000000-0000-0000-0006-000000000001', 'in-progress'),
  ('ab000000-0000-0000-0001-000000000005', 'ab000000-0000-0000-0000-000000000001', 'ab000000-0000-0000-0006-000000000001', 'in-progress');
INSERT INTO round_players (round_id, player_id, invitation_status) VALUES
  ('ab000000-0000-0000-0001-000000000001',  'ab000000-0000-0000-0000-000000000001', 'accepted'),
  ('ab000000-0000-0000-0001-000000000002', 'ab000000-0000-0000-0000-000000000001', 'accepted'),
  ('ab000000-0000-0000-0001-000000000003', 'ab000000-0000-0000-0000-000000000001', 'accepted'),
  ('ab000000-0000-0000-0001-000000000004', 'ab000000-0000-0000-0000-000000000001', 'accepted'),
  ('ab000000-0000-0000-0001-000000000005', 'ab000000-0000-0000-0000-000000000001', 'accepted');

SET LOCAL role authenticated;

-- 1. Outsider cannot add.
SET LOCAL request.jwt.claims = '{"sub":"ab000000-0000-0000-0000-000000000004","role":"authenticated"}';

-- Test 1
DO $$
DECLARE v_hint TEXT; v_raised BOOLEAN := FALSE;
BEGIN
  BEGIN
    PERFORM add_round_player('ab000000-0000-0000-0001-000000000001', 'ab000000-0000-0000-0000-000000000002');
  EXCEPTION WHEN insufficient_privilege THEN
    v_raised := TRUE;
    GET STACKED DIAGNOSTICS v_hint = PG_EXCEPTION_HINT;
  END;
  ASSERT v_raised, 'Test 1: expected an exception';
  ASSERT v_hint = 'not_owner', 'Test 1: expected hint not_owner, got ' || COALESCE(v_hint, '<null>');
END $$;

-- 2. Owner adds F; row is accepted.
SET LOCAL request.jwt.claims = '{"sub":"ab000000-0000-0000-0000-000000000001","role":"authenticated"}';
SELECT add_round_player('ab000000-0000-0000-0001-000000000001', 'ab000000-0000-0000-0000-000000000002');
DO $$ BEGIN
  ASSERT (SELECT invitation_status FROM round_players WHERE round_id='ab000000-0000-0000-0001-000000000001' AND player_id='ab000000-0000-0000-0000-000000000002') = 'accepted', 'F accepted';
  ASSERT (SELECT added_by FROM round_players WHERE round_id='ab000000-0000-0000-0001-000000000001' AND player_id='ab000000-0000-0000-0000-000000000002') = 'ab000000-0000-0000-0000-000000000001', 'added_by is owner';
  ASSERT (SELECT responded_at FROM round_players WHERE round_id='ab000000-0000-0000-0001-000000000001' AND player_id='ab000000-0000-0000-0000-000000000002') IS NOT NULL, 'responded_at set';
END $$;

-- 3. Notification for F has added_mid_round = true.
DO $$ BEGIN
  ASSERT (SELECT (data->>'added_mid_round')::BOOLEAN FROM notifications
           WHERE user_id='ab000000-0000-0000-0000-000000000002' AND round_id='ab000000-0000-0000-0001-000000000001' AND type='social_round_invitation'
           ORDER BY created_at DESC LIMIT 1), 'F notified as added';
END $$;

-- 3b. Regression: a plain INSERT (how round creation adds partners, also
--     accepted + in-progress) still produces added_mid_round = false.
RESET ROLE;
INSERT INTO round_players (round_id, player_id, added_by, invitation_status) VALUES ('ab000000-0000-0000-0001-000000000002', 'ab000000-0000-0000-0000-000000000002', 'ab000000-0000-0000-0000-000000000001', 'accepted');
DO $$ BEGIN
  ASSERT NOT (SELECT (data->>'added_mid_round')::BOOLEAN FROM notifications
               WHERE user_id='ab000000-0000-0000-0000-000000000002' AND round_id='ab000000-0000-0000-0001-000000000002' AND type='social_round_invitation' LIMIT 1), 'normal invite unchanged';
END $$;

-- 3c. Blocked pair rejected (O blocks X as fixture admin first).
INSERT INTO user_blocks (blocker_id, blocked_id) VALUES ('ab000000-0000-0000-0000-000000000001', 'ab000000-0000-0000-0000-000000000004');
SET LOCAL role authenticated;
SET LOCAL request.jwt.claims = '{"sub":"ab000000-0000-0000-0000-000000000001","role":"authenticated"}';

-- Test 3c
DO $$
DECLARE v_hint TEXT; v_raised BOOLEAN := FALSE;
BEGIN
  BEGIN
    PERFORM add_round_player('ab000000-0000-0000-0001-000000000001', 'ab000000-0000-0000-0000-000000000004');
  EXCEPTION WHEN insufficient_privilege THEN
    v_raised := TRUE;
    GET STACKED DIAGNOSTICS v_hint = PG_EXCEPTION_HINT;
  END;
  ASSERT v_raised, 'Test 3c: expected an exception';
  ASSERT v_hint = 'player_blocked', 'Test 3c: expected hint player_blocked, got ' || COALESCE(v_hint, '<null>');
END $$;

-- 4. Duplicate add rejected.

-- Test 4
DO $$
DECLARE v_hint TEXT; v_raised BOOLEAN := FALSE;
BEGIN
  BEGIN
    PERFORM add_round_player('ab000000-0000-0000-0001-000000000001', 'ab000000-0000-0000-0000-000000000002');
  EXCEPTION WHEN unique_violation THEN
    v_raised := TRUE;
    GET STACKED DIAGNOSTICS v_hint = PG_EXCEPTION_HINT;
  END;
  ASSERT v_raised, 'Test 4: expected an exception';
  ASSERT v_hint = 'player_already_in_round', 'Test 4: expected hint player_already_in_round, got ' || COALESCE(v_hint, '<null>');
END $$;

-- 4b. Guest (placeholder) can be added.
SELECT add_round_player('ab000000-0000-0000-0001-000000000001', 'ab000000-0000-0000-0000-000000000003');
DO $$ BEGIN
  ASSERT EXISTS (SELECT 1 FROM round_players WHERE round_id='ab000000-0000-0000-0001-000000000001' AND player_id='ab000000-0000-0000-0000-000000000003'), 'guest added';
END $$;
SELECT remove_round_player('ab000000-0000-0000-0001-000000000001', 'ab000000-0000-0000-0000-000000000003');

-- 5. Remove F deletes card, entries, mismatches, status, shot_log and round_players.
--    Insert one row of each for F as the fixture admin.
RESET ROLE;
INSERT INTO scorecards (id, round_id, player_id, status, scores, total_gross)
  VALUES ('ab000000-0000-0000-0007-000000000001', 'ab000000-0000-0000-0001-000000000001', 'ab000000-0000-0000-0000-000000000002', 'in-progress', '{}'::JSONB, 0);
INSERT INTO score_entries (round_id, player_id, hole_number, scorer_id, strokes)
  VALUES ('ab000000-0000-0000-0001-000000000001', 'ab000000-0000-0000-0000-000000000002', 1, 'ab000000-0000-0000-0000-000000000002', 4),
         ('ab000000-0000-0000-0001-000000000001', 'ab000000-0000-0000-0000-000000000001', 1, 'ab000000-0000-0000-0000-000000000002', 5);   -- F as scorer of another player
INSERT INTO score_mismatches (round_id, player_id, hole_number, self_score, partner_score,
                              self_scorer_id, partner_scorer_id, entries, status)
  VALUES ('ab000000-0000-0000-0001-000000000001', 'ab000000-0000-0000-0000-000000000001', 1, 4, 5, 'ab000000-0000-0000-0000-000000000001', 'ab000000-0000-0000-0000-000000000002',
          '[{"scorer_id":"ab000000-0000-0000-0000-000000000001","strokes":4},{"scorer_id":"ab000000-0000-0000-0000-000000000002","strokes":5}]'::JSONB, 'pending');
INSERT INTO score_submission_status (round_id, player_id, partner_id)
  VALUES ('ab000000-0000-0000-0001-000000000001', 'ab000000-0000-0000-0000-000000000001', 'ab000000-0000-0000-0000-000000000002');
INSERT INTO shot_log (round_id, hole_number, player_id, sequence, latitude, longitude)
  VALUES ('ab000000-0000-0000-0001-000000000001', 1, 'ab000000-0000-0000-0000-000000000002', 1, -37.9500000, 144.9500000);
SET LOCAL role authenticated;
SET LOCAL request.jwt.claims = '{"sub":"ab000000-0000-0000-0000-000000000001","role":"authenticated"}';
SELECT remove_round_player('ab000000-0000-0000-0001-000000000001', 'ab000000-0000-0000-0000-000000000002');
DO $$ BEGIN
  ASSERT NOT EXISTS (SELECT 1 FROM scorecards WHERE round_id='ab000000-0000-0000-0001-000000000001' AND player_id='ab000000-0000-0000-0000-000000000002'), 'card gone';
  ASSERT NOT EXISTS (SELECT 1 FROM score_entries WHERE round_id='ab000000-0000-0000-0001-000000000001' AND (player_id='ab000000-0000-0000-0000-000000000002' OR scorer_id='ab000000-0000-0000-0000-000000000002')), 'entries gone';
  ASSERT NOT EXISTS (SELECT 1 FROM score_mismatches WHERE round_id='ab000000-0000-0000-0001-000000000001' AND (player_id='ab000000-0000-0000-0000-000000000002' OR self_scorer_id='ab000000-0000-0000-0000-000000000002' OR partner_scorer_id='ab000000-0000-0000-0000-000000000002')), 'mismatches gone';
  ASSERT NOT EXISTS (SELECT 1 FROM score_submission_status WHERE round_id='ab000000-0000-0000-0001-000000000001' AND (player_id='ab000000-0000-0000-0000-000000000002' OR partner_id='ab000000-0000-0000-0000-000000000002')), 'status gone';
  ASSERT NOT EXISTS (SELECT 1 FROM shot_log WHERE round_id='ab000000-0000-0000-0001-000000000001' AND player_id='ab000000-0000-0000-0000-000000000002'), 'shots gone';
  ASSERT NOT EXISTS (SELECT 1 FROM round_players WHERE round_id='ab000000-0000-0000-0001-000000000001' AND player_id='ab000000-0000-0000-0000-000000000002'), 'row gone';
END $$;

-- Test 5b
DO $$
DECLARE v_hint TEXT; v_raised BOOLEAN := FALSE;
BEGIN
  BEGIN
    PERFORM remove_round_player('ab000000-0000-0000-0001-000000000001', 'ab000000-0000-0000-0000-000000000002');
  EXCEPTION WHEN no_data_found THEN
    v_raised := TRUE;
    GET STACKED DIAGNOSTICS v_hint = PG_EXCEPTION_HINT;
  END;
  ASSERT v_raised, 'Test 5b: expected an exception';
  ASSERT v_hint = 'player_not_in_round', 'Test 5b: expected hint player_not_in_round, got ' || COALESCE(v_hint, '<null>');
END $$;

-- 6. Re-add after remove works (hard-deleted card does not block).
SELECT add_round_player('ab000000-0000-0000-0001-000000000001', 'ab000000-0000-0000-0000-000000000002');

-- 7. Owner cannot remove self.

-- Test 7
DO $$
DECLARE v_hint TEXT; v_raised BOOLEAN := FALSE;
BEGIN
  BEGIN
    PERFORM remove_round_player('ab000000-0000-0000-0001-000000000001', 'ab000000-0000-0000-0000-000000000001');
  EXCEPTION WHEN invalid_parameter_value THEN
    v_raised := TRUE;
    GET STACKED DIAGNOSTICS v_hint = PG_EXCEPTION_HINT;
  END;
  ASSERT v_raised, 'Test 7: expected an exception';
  ASSERT v_hint = 'cannot_remove_owner', 'Test 7: expected hint cannot_remove_owner, got ' || COALESCE(v_hint, '<null>');
END $$;

-- 8. Ended round rejects both: score hole 1 for O and F on R3, then end after 1 hole.
RESET ROLE;
INSERT INTO round_players (round_id, player_id, invitation_status) VALUES ('ab000000-0000-0000-0001-000000000003', 'ab000000-0000-0000-0000-000000000002', 'accepted');
INSERT INTO scorecards (id, round_id, player_id, status, scores, total_gross) VALUES
  ('ab000000-0000-0000-0007-000000000002', 'ab000000-0000-0000-0001-000000000003', 'ab000000-0000-0000-0000-000000000001', 'in-progress', '{"1":{"strokes":4}}'::JSONB, 4),
  ('ab000000-0000-0000-0007-000000000003', 'ab000000-0000-0000-0001-000000000003', 'ab000000-0000-0000-0000-000000000002', 'in-progress', '{"1":{"strokes":5}}'::JSONB, 5);
INSERT INTO score_entries (round_id, player_id, hole_number, scorer_id, strokes) VALUES
  ('ab000000-0000-0000-0001-000000000003', 'ab000000-0000-0000-0000-000000000001', 1, 'ab000000-0000-0000-0000-000000000001', 4),
  ('ab000000-0000-0000-0001-000000000003', 'ab000000-0000-0000-0000-000000000002', 1, 'ab000000-0000-0000-0000-000000000001', 5);
SET LOCAL role authenticated;
SET LOCAL request.jwt.claims = '{"sub":"ab000000-0000-0000-0000-000000000001","role":"authenticated"}';
SELECT end_round_early('ab000000-0000-0000-0001-000000000003', 1);

-- Test 8a
DO $$
DECLARE v_hint TEXT; v_raised BOOLEAN := FALSE;
BEGIN
  BEGIN
    PERFORM add_round_player('ab000000-0000-0000-0001-000000000003', 'ab000000-0000-0000-0000-000000000005');
  EXCEPTION WHEN invalid_parameter_value THEN
    v_raised := TRUE;
    GET STACKED DIAGNOSTICS v_hint = PG_EXCEPTION_HINT;
  END;
  ASSERT v_raised, 'Test 8a: expected an exception';
  ASSERT v_hint = 'round_ended', 'Test 8a: expected hint round_ended, got ' || COALESCE(v_hint, '<null>');
END $$;


-- Test 8b
DO $$
DECLARE v_hint TEXT; v_raised BOOLEAN := FALSE;
BEGIN
  BEGIN
    PERFORM remove_round_player('ab000000-0000-0000-0001-000000000003', 'ab000000-0000-0000-0000-000000000002');
  EXCEPTION WHEN invalid_parameter_value THEN
    v_raised := TRUE;
    GET STACKED DIAGNOSTICS v_hint = PG_EXCEPTION_HINT;
  END;
  ASSERT v_raised, 'Test 8b: expected an exception';
  ASSERT v_hint = 'round_ended', 'Test 8b: expected hint round_ended, got ' || COALESCE(v_hint, '<null>');
END $$;

-- 9. Submitted card rejects both.
RESET ROLE;
INSERT INTO round_players (round_id, player_id, invitation_status) VALUES ('ab000000-0000-0000-0001-000000000004', 'ab000000-0000-0000-0000-000000000002', 'accepted');
INSERT INTO scorecards (id, round_id, player_id, status, scores, total_gross) VALUES
  ('ab000000-0000-0000-0007-000000000004', 'ab000000-0000-0000-0001-000000000004', 'ab000000-0000-0000-0000-000000000002', 'completed', '{}'::JSONB, 72);
SET LOCAL role authenticated;
SET LOCAL request.jwt.claims = '{"sub":"ab000000-0000-0000-0000-000000000001","role":"authenticated"}';

-- Test 9a
DO $$
DECLARE v_hint TEXT; v_raised BOOLEAN := FALSE;
BEGIN
  BEGIN
    PERFORM add_round_player('ab000000-0000-0000-0001-000000000004', 'ab000000-0000-0000-0000-000000000005');
  EXCEPTION WHEN invalid_parameter_value THEN
    v_raised := TRUE;
    GET STACKED DIAGNOSTICS v_hint = PG_EXCEPTION_HINT;
  END;
  ASSERT v_raised, 'Test 9a: expected an exception';
  ASSERT v_hint = 'round_has_submitted_scorecards', 'Test 9a: expected hint round_has_submitted_scorecards, got ' || COALESCE(v_hint, '<null>');
END $$;


-- Test 9b
DO $$
DECLARE v_hint TEXT; v_raised BOOLEAN := FALSE;
BEGIN
  BEGIN
    PERFORM remove_round_player('ab000000-0000-0000-0001-000000000004', 'ab000000-0000-0000-0000-000000000002');
  EXCEPTION WHEN invalid_parameter_value THEN
    v_raised := TRUE;
    GET STACKED DIAGNOSTICS v_hint = PG_EXCEPTION_HINT;
  END;
  ASSERT v_raised, 'Test 9b: expected an exception';
  ASSERT v_hint = 'round_has_submitted_scorecards', 'Test 9b: expected hint round_has_submitted_scorecards, got ' || COALESCE(v_hint, '<null>');
END $$;

-- 10. Fifth player rejected with round_full (R5: O + F + G + Y = 4).
RESET ROLE;
INSERT INTO round_players (round_id, player_id, invitation_status) VALUES
  ('ab000000-0000-0000-0001-000000000005', 'ab000000-0000-0000-0000-000000000002', 'accepted'), ('ab000000-0000-0000-0001-000000000005', 'ab000000-0000-0000-0000-000000000003', 'accepted'), ('ab000000-0000-0000-0001-000000000005', 'ab000000-0000-0000-0000-000000000005', 'accepted');
SET LOCAL role authenticated;
SET LOCAL request.jwt.claims = '{"sub":"ab000000-0000-0000-0000-000000000001","role":"authenticated"}';

-- Test 10
DO $$
DECLARE v_hint TEXT; v_raised BOOLEAN := FALSE;
BEGIN
  BEGIN
    PERFORM add_round_player('ab000000-0000-0000-0001-000000000005', 'ab000000-0000-0000-0000-000000000006');
  EXCEPTION WHEN invalid_parameter_value THEN
    v_raised := TRUE;
    GET STACKED DIAGNOSTICS v_hint = PG_EXCEPTION_HINT;
  END;
  ASSERT v_raised, 'Test 10: expected an exception';
  ASSERT v_hint = 'round_full', 'Test 10: expected hint round_full, got ' || COALESCE(v_hint, '<null>');
END $$;

ROLLBACK;
