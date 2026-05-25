-- =====================================================
-- Soft-Delete / Restore / Purge - verification script
-- =====================================================
-- Run AFTER applying migrations 20260526000000 – 000500:
--   20260526000000_soft_delete_recompute_stats.sql
--   20260526000100_soft_delete_round_rpcs.sql
--   20260526000200_competition_delete_rpcs.sql
--   20260526000300_partnership_rounds_fk_cascade.sql
--   20260526000400_purge_soft_deleted.sql
--   20260526000500_rpc_exclude_soft_deleted_rounds.sql
--
-- Run with: psql "$DB_URL" -f supabase/tests/soft_delete_verify.sql
--
-- NOTE: This script was authored without a live database.
-- All column names and constraints were verified from migration SQL files,
-- but first-run fixups may be needed (e.g. trigger side-effects, constraint
-- name drift). Treat it as a dev-only starting point.
--
-- Auth impersonation pattern (copied from existing project tests):
--   SET LOCAL role authenticated;
--   SET LOCAL request.jwt.claims = '{"sub":"<uuid>","role":"authenticated"}';
-- These are SQL-level commands; they are placed OUTSIDE DO $$ blocks.
-- Inside PL/pgSQL, use PERFORM set_config(...) instead.
-- =====================================================

BEGIN;

-- =====================================================
-- FIXTURE IDs  (deterministic, all within the test range)
-- =====================================================

-- ---- auth.users ----
INSERT INTO auth.users (id, email) VALUES
  ('aa000000-0000-0000-0000-000000000001', 'sd-verify-owner@example.com'),
  ('aa000000-0000-0000-0000-000000000002', 'sd-verify-other@example.com');

-- ---- players ----
INSERT INTO players (id, name, email) VALUES
  ('aa000000-0000-0000-0000-000000000001', 'SD Owner', 'sd-verify-owner@example.com'),
  ('aa000000-0000-0000-0000-000000000002', 'SD Other', 'sd-verify-other@example.com');

DO $$ BEGIN RAISE NOTICE 'Fixtures: auth.users + players seeded'; END $$;

-- =====================================================
-- TEST 1: Seed a standalone round + scorecard;
--         assert both exist with deleted_at IS NULL.
-- =====================================================

-- course_id is nullable since migration 20260109000000_allow_null_course_id.sql
INSERT INTO rounds (id, user_id, status)
  VALUES (
    'aa000000-0000-0000-0001-000000000000',
    'aa000000-0000-0000-0000-000000000001',
    'completed'
  );

INSERT INTO scorecards (id, round_id, player_id, status)
  VALUES (
    'aa000000-0000-0000-0001-000000000001',
    'aa000000-0000-0000-0001-000000000000',
    'aa000000-0000-0000-0000-000000000001',
    'completed'
  );

DO $$
DECLARE
  v_round_deleted_at TIMESTAMPTZ;
  v_sc_deleted_at    TIMESTAMPTZ;
BEGIN
  SELECT deleted_at INTO v_round_deleted_at
    FROM rounds WHERE id = 'aa000000-0000-0000-0001-000000000000';
  SELECT deleted_at INTO v_sc_deleted_at
    FROM scorecards WHERE id = 'aa000000-0000-0000-0001-000000000001';

  ASSERT v_round_deleted_at IS NULL,
    'Test 1 FAILED: new round should have deleted_at IS NULL';
  ASSERT v_sc_deleted_at IS NULL,
    'Test 1 FAILED: new scorecard should have deleted_at IS NULL';
  RAISE NOTICE 'Test 1 PASSED: standalone round + scorecard seeded with deleted_at IS NULL';
END $$;

-- =====================================================
-- TEST 2: soft_delete_round as the OWNER
--         → returns TRUE; round + scorecard get deleted_at stamped.
-- =====================================================

SET LOCAL role authenticated;
SET LOCAL request.jwt.claims = '{"sub":"aa000000-0000-0000-0000-000000000001","role":"authenticated"}';

DO $$
DECLARE
  v_result           BOOLEAN;
  v_round_deleted_at TIMESTAMPTZ;
  v_sc_deleted_at    TIMESTAMPTZ;
BEGIN
  SELECT soft_delete_round('aa000000-0000-0000-0001-000000000000') INTO v_result;
  ASSERT v_result = TRUE,
    'Test 2 FAILED: soft_delete_round should return TRUE for owner';

  SELECT deleted_at INTO v_round_deleted_at
    FROM rounds WHERE id = 'aa000000-0000-0000-0001-000000000000';
  SELECT deleted_at INTO v_sc_deleted_at
    FROM scorecards WHERE id = 'aa000000-0000-0000-0001-000000000001';

  ASSERT v_round_deleted_at IS NOT NULL,
    'Test 2 FAILED: round.deleted_at should be stamped after soft-delete';
  ASSERT v_sc_deleted_at IS NOT NULL,
    'Test 2 FAILED: scorecard.deleted_at should be stamped after soft-delete';
  RAISE NOTICE 'Test 2 PASSED: soft_delete_round (owner) stamps round + scorecard';
END $$;

RESET ROLE;

-- =====================================================
-- TEST 3: restore_round as the OWNER
--         → deleted_at back to NULL on round + scorecard.
-- =====================================================

SET LOCAL role authenticated;
SET LOCAL request.jwt.claims = '{"sub":"aa000000-0000-0000-0000-000000000001","role":"authenticated"}';

DO $$
DECLARE
  v_result           BOOLEAN;
  v_round_deleted_at TIMESTAMPTZ;
  v_sc_deleted_at    TIMESTAMPTZ;
BEGIN
  SELECT restore_round('aa000000-0000-0000-0001-000000000000') INTO v_result;
  ASSERT v_result = TRUE,
    'Test 3 FAILED: restore_round should return TRUE';

  SELECT deleted_at INTO v_round_deleted_at
    FROM rounds WHERE id = 'aa000000-0000-0000-0001-000000000000';
  SELECT deleted_at INTO v_sc_deleted_at
    FROM scorecards WHERE id = 'aa000000-0000-0000-0001-000000000001';

  ASSERT v_round_deleted_at IS NULL,
    'Test 3 FAILED: round.deleted_at should be NULL after restore';
  ASSERT v_sc_deleted_at IS NULL,
    'Test 3 FAILED: scorecard.deleted_at should be NULL after restore';
  RAISE NOTICE 'Test 3 PASSED: restore_round reverses soft-delete on round + scorecard';
END $$;

RESET ROLE;

-- =====================================================
-- TEST 4: Auth negative — a different user cannot soft-delete
--         the owner's standalone round; must raise SQLSTATE '42501'.
-- =====================================================

SET LOCAL role authenticated;
SET LOCAL request.jwt.claims = '{"sub":"aa000000-0000-0000-0000-000000000002","role":"authenticated"}';

DO $$
DECLARE
  v_raised BOOLEAN := FALSE;
BEGIN
  BEGIN
    PERFORM soft_delete_round('aa000000-0000-0000-0001-000000000000');
  EXCEPTION
    WHEN insufficient_privilege THEN
      -- SQLSTATE 42501 maps to insufficient_privilege in PL/pgSQL
      v_raised := TRUE;
    WHEN OTHERS THEN
      IF SQLSTATE = '42501' THEN
        v_raised := TRUE;
      ELSE
        RAISE EXCEPTION 'Test 4 FAILED: unexpected exception SQLSTATE=% SQLERRM=%',
          SQLSTATE, SQLERRM;
      END IF;
  END;

  ASSERT v_raised,
    'Test 4 FAILED: soft_delete_round by non-owner should raise SQLSTATE 42501 (insufficient_privilege)';
  RAISE NOTICE 'Test 4 PASSED: unauthorized soft_delete_round raises SQLSTATE 42501';
END $$;

RESET ROLE;

-- =====================================================
-- TEST 5: Skins statistics reversal
--         Seed a completed skins_game + skins_payout.
--         soft_delete_round → skins_player_statistics drops to 0.
--         restore_round → skins_player_statistics restored to 1 game.
-- =====================================================

INSERT INTO skins_games (
  id, round_id,
  participant_ids,
  pot_type, pot_value, currency, scoring_type,
  status,
  disclaimer_accepted_at, disclaimer_accepted_by,
  created_by, completed_at
) VALUES (
  'aa000000-0000-0000-0002-000000000000',
  'aa000000-0000-0000-0001-000000000000',
  ARRAY[
    'aa000000-0000-0000-0000-000000000001'::UUID,
    'aa000000-0000-0000-0000-000000000002'::UUID
  ],
  'per_hole', 5.00, 'AUD', 'gross',
  'completed',
  NOW(), 'aa000000-0000-0000-0000-000000000001',
  'aa000000-0000-0000-0000-000000000001',
  NOW()
);

INSERT INTO skins_payouts (
  id, skins_game_id, player_id,
  buy_in, total_winnings, net_result,
  holes_won, holes_tied, holes_lost
) VALUES (
  'aa000000-0000-0000-0002-000000000001',
  'aa000000-0000-0000-0002-000000000000',
  'aa000000-0000-0000-0000-000000000001',
  45.00, 90.00, 45.00,
  9, 0, 9
);

-- The skins_games trigger only fires on UPDATE (status transitions).
-- We INSERTed with status='completed', so manually seed the statistics row
-- using the SECURITY DEFINER recompute helper (callable from postgres role).
SELECT recompute_skins_player_statistics(
  ARRAY['aa000000-0000-0000-0000-000000000001'::UUID]
);

DO $$
DECLARE
  v_games_before   INTEGER;
BEGIN
  SELECT games_played INTO v_games_before FROM skins_player_statistics
    WHERE player_id = 'aa000000-0000-0000-0000-000000000001';

  ASSERT COALESCE(v_games_before, 0) = 1,
    'Test 5 setup FAILED: expected 1 games_played after recompute, got '
      || COALESCE(v_games_before::TEXT, 'NULL');
  RAISE NOTICE 'Test 5 setup OK: skins_player_statistics seeded with 1 game';
END $$;

-- Soft-delete the round as owner → recompute drops stats to 0.
SET LOCAL role authenticated;
SET LOCAL request.jwt.claims = '{"sub":"aa000000-0000-0000-0000-000000000001","role":"authenticated"}';

DO $$
DECLARE
  v_result       BOOLEAN;
  v_games_after  INTEGER;
BEGIN
  SELECT soft_delete_round('aa000000-0000-0000-0001-000000000000') INTO v_result;
  ASSERT v_result = TRUE, 'Test 5 FAILED: soft_delete_round returned FALSE';

  SELECT games_played INTO v_games_after FROM skins_player_statistics
    WHERE player_id = 'aa000000-0000-0000-0000-000000000001';

  ASSERT COALESCE(v_games_after, 0) = 0,
    'Test 5 FAILED: skins stats should be 0 after soft-delete, got '
      || COALESCE(v_games_after::TEXT, 'NULL (row deleted)');
  RAISE NOTICE 'Test 5a PASSED: skins_player_statistics drops to 0 after soft_delete_round';
END $$;

-- Restore the round → recompute brings stats back to 1.
DO $$
DECLARE
  v_result         BOOLEAN;
  v_games_restored INTEGER;
BEGIN
  SELECT restore_round('aa000000-0000-0000-0001-000000000000') INTO v_result;
  ASSERT v_result = TRUE, 'Test 5 FAILED: restore_round returned FALSE';

  SELECT games_played INTO v_games_restored FROM skins_player_statistics
    WHERE player_id = 'aa000000-0000-0000-0000-000000000001';

  ASSERT COALESCE(v_games_restored, 0) = 1,
    'Test 5 FAILED: skins stats should be restored to 1 after restore_round, got '
      || COALESCE(v_games_restored::TEXT, 'NULL');
  RAISE NOTICE 'Test 5b PASSED: skins_player_statistics restored to 1 after restore_round';
END $$;

RESET ROLE;

-- =====================================================
-- TEST 6: Competition soft-delete / restore / auth
-- =====================================================

-- Seed a competition owned by user 1.
INSERT INTO competitions (
  id, name, start_date,
  handicap_system, visibility, invite_code,
  organizer_id, status
) VALUES (
  'aa000000-0000-0000-0003-000000000000',
  'SD Verify Competition',
  CURRENT_DATE,
  'honor', 'private', 'SDVFY-99999',
  'aa000000-0000-0000-0000-000000000001',
  'upcoming'
);

-- A competition round linked to that competition.
INSERT INTO rounds (id, competition_id, round_number, status)
  VALUES (
    'aa000000-0000-0000-0003-000000000001',
    'aa000000-0000-0000-0003-000000000000',
    1,
    'completed'
  );

-- A scorecard for that competition round.
INSERT INTO scorecards (id, round_id, player_id, status)
  VALUES (
    'aa000000-0000-0000-0003-000000000002',
    'aa000000-0000-0000-0003-000000000001',
    'aa000000-0000-0000-0000-000000000001',
    'completed'
  );

-- 6a: non-organizer must get 42501.
SET LOCAL role authenticated;
SET LOCAL request.jwt.claims = '{"sub":"aa000000-0000-0000-0000-000000000002","role":"authenticated"}';

DO $$
DECLARE
  v_raised BOOLEAN := FALSE;
BEGIN
  BEGIN
    PERFORM soft_delete_competition('aa000000-0000-0000-0003-000000000000');
  EXCEPTION
    WHEN insufficient_privilege THEN
      v_raised := TRUE;
    WHEN OTHERS THEN
      IF SQLSTATE = '42501' THEN
        v_raised := TRUE;
      ELSE
        RAISE EXCEPTION 'Test 6a FAILED: unexpected SQLSTATE=% SQLERRM=%',
          SQLSTATE, SQLERRM;
      END IF;
  END;

  ASSERT v_raised,
    'Test 6a FAILED: non-organizer soft_delete_competition should raise 42501';
  RAISE NOTICE 'Test 6a PASSED: non-organizer soft_delete_competition raises 42501';
END $$;

RESET ROLE;

-- 6b: organizer soft_delete_competition → competition + round + scorecard stamped.
SET LOCAL role authenticated;
SET LOCAL request.jwt.claims = '{"sub":"aa000000-0000-0000-0000-000000000001","role":"authenticated"}';

DO $$
DECLARE
  v_result    BOOLEAN;
  v_comp_del  TIMESTAMPTZ;
  v_round_del TIMESTAMPTZ;
  v_sc_del    TIMESTAMPTZ;
BEGIN
  SELECT soft_delete_competition('aa000000-0000-0000-0003-000000000000') INTO v_result;
  ASSERT v_result = TRUE,
    'Test 6b FAILED: soft_delete_competition should return TRUE for organizer';

  SELECT deleted_at INTO v_comp_del
    FROM competitions WHERE id = 'aa000000-0000-0000-0003-000000000000';
  SELECT deleted_at INTO v_round_del
    FROM rounds WHERE id = 'aa000000-0000-0000-0003-000000000001';
  SELECT deleted_at INTO v_sc_del
    FROM scorecards WHERE id = 'aa000000-0000-0000-0003-000000000002';

  ASSERT v_comp_del  IS NOT NULL, 'Test 6b FAILED: competition.deleted_at not stamped';
  ASSERT v_round_del IS NOT NULL, 'Test 6b FAILED: round.deleted_at not stamped';
  ASSERT v_sc_del    IS NOT NULL, 'Test 6b FAILED: scorecard.deleted_at not stamped';
  RAISE NOTICE 'Test 6b PASSED: soft_delete_competition stamps competition + round + scorecard';
END $$;

-- 6c: restore_competition reverses the tree.
DO $$
DECLARE
  v_result    BOOLEAN;
  v_comp_del  TIMESTAMPTZ;
  v_round_del TIMESTAMPTZ;
  v_sc_del    TIMESTAMPTZ;
BEGIN
  SELECT restore_competition('aa000000-0000-0000-0003-000000000000') INTO v_result;
  ASSERT v_result = TRUE,
    'Test 6c FAILED: restore_competition should return TRUE';

  SELECT deleted_at INTO v_comp_del
    FROM competitions WHERE id = 'aa000000-0000-0000-0003-000000000000';
  SELECT deleted_at INTO v_round_del
    FROM rounds WHERE id = 'aa000000-0000-0000-0003-000000000001';
  SELECT deleted_at INTO v_sc_del
    FROM scorecards WHERE id = 'aa000000-0000-0000-0003-000000000002';

  ASSERT v_comp_del  IS NULL, 'Test 6c FAILED: competition.deleted_at should be NULL after restore';
  ASSERT v_round_del IS NULL, 'Test 6c FAILED: round.deleted_at should be NULL after restore';
  ASSERT v_sc_del    IS NULL, 'Test 6c FAILED: scorecard.deleted_at should be NULL after restore';
  RAISE NOTICE 'Test 6c PASSED: restore_competition reverses the full tree';
END $$;

RESET ROLE;

-- =====================================================
-- TEST 7: purge_soft_deleted removes rows older than 90 days;
--         recently-soft-deleted rows are preserved.
-- =====================================================

-- 91-day-old soft-deleted standalone round → purge should remove it.
INSERT INTO rounds (id, user_id, status, deleted_at, updated_at)
  VALUES (
    'aa000000-0000-0000-0004-000000000000',
    'aa000000-0000-0000-0000-000000000001',
    'completed',
    NOW() - INTERVAL '91 days',
    NOW() - INTERVAL '91 days'
  );

-- Recently soft-deleted standalone round → purge must leave it alone.
INSERT INTO rounds (id, user_id, status, deleted_at, updated_at)
  VALUES (
    'aa000000-0000-0000-0004-000000000001',
    'aa000000-0000-0000-0000-000000000001',
    'completed',
    NOW(),
    NOW()
  );

-- purge_soft_deleted is GRANT'd to service_role only.
-- In a psql session connected as postgres (superuser), we can call it directly.
DO $$
DECLARE
  v_old_count    INTEGER;
  v_recent_count INTEGER;
BEGIN
  -- Call purge; return value is number of competitions purged (0 here is fine).
  PERFORM purge_soft_deleted();

  SELECT COUNT(*) INTO v_old_count FROM rounds
    WHERE id = 'aa000000-0000-0000-0004-000000000000';
  SELECT COUNT(*) INTO v_recent_count FROM rounds
    WHERE id = 'aa000000-0000-0000-0004-000000000001';

  ASSERT v_old_count = 0,
    'Test 7 FAILED: 91-day-old soft-deleted round should be hard-deleted by purge';
  ASSERT v_recent_count = 1,
    'Test 7 FAILED: recently soft-deleted round should survive purge';
  RAISE NOTICE 'Test 7 PASSED: purge_soft_deleted hard-deletes >90d rows and preserves recent ones';
END $$;

-- =====================================================
-- TEST 8: partnership_rounds FK cascade — metadata check
--         (avoids needing full leagues + partnership fixtures)
-- =====================================================

DO $$
DECLARE
  v_confdeltype_1 CHAR(1);
  v_confdeltype_2 CHAR(1);
BEGIN
  SELECT confdeltype INTO v_confdeltype_1
    FROM pg_constraint
    WHERE conname = 'partnership_rounds_scorecard_1_id_fkey';

  SELECT confdeltype INTO v_confdeltype_2
    FROM pg_constraint
    WHERE conname = 'partnership_rounds_scorecard_2_id_fkey';

  ASSERT v_confdeltype_1 IS NOT NULL,
    'Test 8 FAILED: partnership_rounds_scorecard_1_id_fkey constraint not found — check actual constraint name';
  ASSERT v_confdeltype_1 = 'c',
    'Test 8 FAILED: partnership_rounds_scorecard_1_id_fkey should be ON DELETE CASCADE (confdeltype=''c''), got: '
      || v_confdeltype_1;

  ASSERT v_confdeltype_2 IS NOT NULL,
    'Test 8 FAILED: partnership_rounds_scorecard_2_id_fkey constraint not found — check actual constraint name';
  ASSERT v_confdeltype_2 = 'c',
    'Test 8 FAILED: partnership_rounds_scorecard_2_id_fkey should be ON DELETE CASCADE (confdeltype=''c''), got: '
      || v_confdeltype_2;

  RAISE NOTICE 'Test 8 PASSED: partnership_rounds scorecard FK constraints are ON DELETE CASCADE';
END $$;

-- =====================================================
-- Summary notice before rollback
-- =====================================================
DO $$
BEGIN
  RAISE NOTICE '============================================';
  RAISE NOTICE 'All soft-delete verification tests completed.';
  RAISE NOTICE 'Rolling back — no data will be persisted.';
  RAISE NOTICE '============================================';
END $$;

-- =====================================================
-- Clean up — ROLLBACK leaves the database unchanged.
-- =====================================================
ROLLBACK;
