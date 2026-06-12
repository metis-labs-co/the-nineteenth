-- ============================================================
-- Verification script: 20260612000000_scheduled_rounds.sql
-- Run against STAGING (read-only checks first, then smoke test)
-- Usage: psql "$STAGING_DB_URL" -f scripts/verify-scheduled-rounds-migration.sql
-- ============================================================

-- ============================================================
-- SECTION 1: SCHEMA CHECKS (read-only, safe on any env)
-- ============================================================

-- 1a. Columns added to round_players
SELECT
  column_name,
  data_type,
  column_default,
  is_nullable
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name   = 'round_players'
  AND column_name IN ('invitation_status', 'responded_at')
ORDER BY column_name;
-- Expect: 2 rows
--   invitation_status | text      | 'accepted'::text | NO
--   responded_at      | timestamp | (null)           | YES

-- 1b. Check constraint on invitation_status
SELECT
  conname,
  pg_get_constraintdef(oid) AS definition
FROM pg_constraint
WHERE conrelid = 'round_players'::regclass
  AND contype = 'c'
  AND conname LIKE '%invitation_status%';
-- Expect: 1 row with (invitation_status IN ('pending','accepted','declined'))

-- 1c. RLS policies on round_players
SELECT policyname, cmd, qual
FROM pg_policies
WHERE schemaname = 'public'
  AND tablename  = 'round_players'
  AND policyname IN (
    'Players can respond to their round invitation',
    'Accepted players can see co-players in their rounds'
  )
ORDER BY policyname;
-- Expect: 2 rows

-- 1d. RLS policies on rounds
SELECT policyname, cmd
FROM pg_policies
WHERE schemaname = 'public'
  AND tablename  = 'rounds'
  AND policyname IN (
    'Accepted players can update standalone rounds'
  )
ORDER BY policyname;
-- Expect: 1 row
-- NOTE: "Invited players can view their standalone rounds" was removed — SELECT
-- access for invitees is already granted by the "Users can view rounds" policy
-- via is_round_participant() (20260412010000_fix_rounds_friend_visibility_recursion.sql).

-- 1e. Notification type constraint includes new type
SELECT pg_get_constraintdef(oid) AS definition
FROM pg_constraint
WHERE conrelid = 'notifications'::regclass
  AND conname  = 'notifications_type_check';
-- Expect: definition includes 'social_round_response'

-- 1f. Trigger functions + RLS/guard helper functions exist
SELECT
  routine_name,
  routine_type
FROM information_schema.routines
WHERE routine_schema = 'public'
  AND routine_name IN (
    'notify_round_invitation_declined',
    'notify_scheduled_round_cancelled',
    'is_accepted_round_participant',     -- NEW: non-recursive RLS helper (Fix 1)
    'protect_round_ownership_fields'     -- NEW: ownership-guard trigger fn (Fix 2)
  )
ORDER BY routine_name;
-- Expect: 4 rows, all FUNCTION

-- 1f-i. is_accepted_round_participant is SECURITY DEFINER (required to break 42P17)
SELECT
  p.proname,
  p.prosecdef AS security_definer
FROM pg_proc p
JOIN pg_namespace n ON n.oid = p.pronamespace
WHERE n.nspname = 'public'
  AND p.proname = 'is_accepted_round_participant';
-- Expect: 1 row with security_definer = t

-- 1g. Triggers are attached
SELECT
  trigger_name,
  event_object_table,
  event_manipulation,
  action_timing
FROM information_schema.triggers
WHERE trigger_schema = 'public'
  AND trigger_name IN (
    'trigger_notify_round_invitation_declined',
    'trigger_notify_scheduled_round_cancelled',
    'trigger_protect_round_ownership_fields'   -- NEW: ownership guard (Fix 2)
  )
ORDER BY trigger_name;
-- Expect:
--   trigger_notify_round_invitation_declined | round_players | UPDATE | AFTER
--   trigger_notify_scheduled_round_cancelled | rounds        | DELETE | BEFORE
--   trigger_protect_round_ownership_fields   | rounds        | UPDATE | BEFORE
-- NOTE: information_schema.triggers lists one row per timing/event; the
-- protect/declined triggers appear once each (single UPDATE event).

-- ============================================================
-- SECTION 2: TRANSACTIONAL SMOKE TEST
-- Rolls back everything — safe to run repeatedly on staging.
-- Requires at least one existing course+club row to satisfy FKs.
-- ============================================================

BEGIN;

  -- ── Setup: resolve a real course_id we can borrow ──────────────────────────
  DO $$
  DECLARE
    v_course_id     UUID;
    v_round_id      UUID;
    v_organiser_id  UUID;
    v_invitee_id    UUID;
    v_notif_count   INT;
    v_cancel_count  INT;
  BEGIN

    -- Grab any existing course (migration adds no new course data)
    SELECT id INTO v_course_id FROM courses LIMIT 1;
    IF v_course_id IS NULL THEN
      RAISE EXCEPTION 'No courses found — seed at least one course before running this script';
    END IF;

    -- Use two existing players (players.id is a FK to auth.users, so we cannot insert disposable rows)
    SELECT id INTO v_organiser_id FROM players ORDER BY created_at LIMIT 1;
    SELECT id INTO v_invitee_id   FROM players WHERE id <> v_organiser_id ORDER BY created_at LIMIT 1;
    IF v_organiser_id IS NULL OR v_invitee_id IS NULL THEN
      RAISE EXCEPTION 'Smoke test needs at least 2 existing players in the database';
    END IF;

    -- Create an upcoming standalone round
    INSERT INTO rounds (id, user_id, course_id, date, status, game_type)
    VALUES (
      gen_random_uuid(),
      v_organiser_id,
      v_course_id,
      CURRENT_DATE + 7,
      'upcoming',
      'stableford'
    )
    RETURNING id INTO v_round_id;

    -- Add organiser and invitee to round_players
    INSERT INTO round_players (round_id, player_id, added_by, invitation_status)
    VALUES
      (v_round_id, v_organiser_id, NULL,            'accepted'),  -- owner
      (v_round_id, v_invitee_id,   v_organiser_id,  'pending');   -- invitee

    -- ── Test A: Invitee declines → organiser gets a notification ───────────────

    UPDATE round_players
    SET invitation_status = 'declined', responded_at = NOW()
    WHERE round_id = v_round_id AND player_id = v_invitee_id;

    SELECT COUNT(*) INTO v_notif_count
    FROM notifications
    WHERE user_id  = v_organiser_id
      AND type     = 'social_round_response'
      AND round_id = v_round_id
      AND (data->>'player_id') = v_invitee_id::text;

    IF v_notif_count <> 1 THEN
      RAISE EXCEPTION 'Test A FAILED: expected 1 decline notification for organiser, got %', v_notif_count;
    END IF;
    RAISE NOTICE 'Test A PASSED: decline notification sent to organiser';

    -- ── Test B: Reset invitee to accepted, delete round → cancel notification ──

    UPDATE round_players
    SET invitation_status = 'accepted', responded_at = NULL
    WHERE round_id = v_round_id AND player_id = v_invitee_id;

    DELETE FROM rounds WHERE id = v_round_id;

    -- Cancel notifications go to v_invitee_id (not the owner)
    SELECT COUNT(*) INTO v_cancel_count
    FROM notifications
    WHERE user_id  = v_invitee_id
      AND type     = 'social_round_response'
      AND round_id = v_round_id
      AND (data->>'cancelled')::boolean = true;

    IF v_cancel_count <> 1 THEN
      RAISE EXCEPTION 'Test B FAILED: expected 1 cancellation notification for invitee, got %', v_cancel_count;
    END IF;
    RAISE NOTICE 'Test B PASSED: cancellation notification sent to invitee';

    -- ── Test C: Declined invitee should NOT receive cancellation ───────────────
    -- Re-create round, add an already-declined invitee, then delete

    INSERT INTO rounds (id, user_id, course_id, date, status, game_type)
    VALUES (
      gen_random_uuid(),
      v_organiser_id,
      v_course_id,
      CURRENT_DATE + 14,
      'upcoming',
      'stableford'
    )
    RETURNING id INTO v_round_id;

    INSERT INTO round_players (round_id, player_id, added_by, invitation_status)
    VALUES
      (v_round_id, v_organiser_id, NULL,           'accepted'),
      (v_round_id, v_invitee_id,   v_organiser_id, 'declined');

    DELETE FROM rounds WHERE id = v_round_id;

    SELECT COUNT(*) INTO v_cancel_count
    FROM notifications
    WHERE user_id  = v_invitee_id
      AND type     = 'social_round_response'
      AND (data->>'cancelled')::boolean = true
      AND round_id = v_round_id;

    IF v_cancel_count <> 0 THEN
      RAISE EXCEPTION 'Test C FAILED: declined invitee should not receive cancellation, got %', v_cancel_count;
    END IF;
    RAISE NOTICE 'Test C PASSED: declined invitee correctly excluded from cancellation';

    -- ── Test D setup: a live round with an ACCEPTED invitee ────────────────────
    -- Left in place (NOT deleted) so the role-switched recursion check below can
    -- query it. Ids are stashed in a temp table because the role-switched SQL
    -- runs outside this DO block's variable scope.
    INSERT INTO rounds (id, user_id, course_id, date, status, game_type)
    VALUES (
      gen_random_uuid(),
      v_organiser_id,
      v_course_id,
      CURRENT_DATE + 21,
      'upcoming',
      'stableford'
    )
    RETURNING id INTO v_round_id;

    INSERT INTO round_players (round_id, player_id, added_by, invitation_status)
    VALUES
      (v_round_id, v_organiser_id, NULL,           'accepted'),
      (v_round_id, v_invitee_id,   v_organiser_id, 'accepted');

    CREATE TEMP TABLE _verify_rls_ctx (round_id UUID, invitee_id UUID) ON COMMIT DROP;
    INSERT INTO _verify_rls_ctx VALUES (v_round_id, v_invitee_id);

    RAISE NOTICE 'Test D setup complete: live round + accepted invitee staged for RLS check';

    RAISE NOTICE 'All DO-block smoke tests PASSED';
  END;
  $$;

  -- ── Test D: RLS recursion smoke check (42P17 regression guard) ──────────────
  -- Exercise the round_players policies AS THE INVITEE (a non-owner). Before
  -- Fix 1, the "Accepted players can see co-players in their rounds" policy
  -- self-referenced round_players and raised 42P17 on ANY round_players query.
  -- We assert the SELECT simply does NOT error.
  --
  -- Supabase derives auth.uid() from request.jwt.claims->>'sub'. We set the
  -- GUC as a JSON string and switch to the 'authenticated' role so RLS applies
  -- (the role-bypassing table owner / postgres skips RLS entirely).
  -- Best-effort: GUC handling can differ by Supabase/PostgREST version; if the
  -- claim shape is wrong auth.uid() just returns NULL (0 rows), still proving
  -- the policy expansion itself does not recurse.
  DO $$
  DECLARE
    v_round_id   UUID;
    v_invitee_id UUID;
    v_count      INT;
  BEGIN
    SELECT round_id, invitee_id INTO v_round_id, v_invitee_id FROM _verify_rls_ctx;

    -- Apply the invitee's identity for the duration of this transaction.
    PERFORM set_config('request.jwt.claims',
                       json_build_object('sub', v_invitee_id::text)::text,
                       true);  -- is_local = true → scoped to this transaction
    EXECUTE format('SET LOCAL role authenticated');

    -- The load-bearing assertion: this must NOT raise 42P17.
    EXECUTE format(
      'SELECT count(*) FROM round_players WHERE round_id = %L',
      v_round_id
    ) INTO v_count;

    RAISE NOTICE 'Test D PASSED: round_players SELECT as invitee did not recurse (rows visible: %)', v_count;
  END;
  $$;

  -- Always drop back to the superuser/owner role before rollback.
  RESET ROLE;

  SELECT 'All smoke tests PASSED (Tests A–D)' AS result;

ROLLBACK;

-- ============================================================
-- SECTION 3: QUICK SANITY — existing play-now rows unaffected
-- ============================================================

-- All existing round_players rows should have invitation_status = 'accepted' (the default).
SELECT
  COUNT(*) FILTER (WHERE invitation_status = 'accepted')  AS accepted_count,
  COUNT(*) FILTER (WHERE invitation_status <> 'accepted') AS non_accepted_count
FROM round_players;
-- Expect: non_accepted_count = 0 (all backfill rows got the default)
