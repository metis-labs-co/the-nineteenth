-- Scheduled social rounds: invitation tracking + start permissions
-- Spec: docs/superpowers/specs/2026-06-12-scheduled-rounds-format-first-wizard-design.md

-- =====================================================
-- 1. INVITATION TRACKING
-- =====================================================
-- Default 'accepted' keeps every existing code path
-- (play-now rounds, competition rounds, backfill) valid without touching
-- inserts; the scheduled flow sets 'pending' explicitly for invitees.

ALTER TABLE round_players
  ADD COLUMN IF NOT EXISTS invitation_status text NOT NULL DEFAULT 'accepted'
    CHECK (invitation_status IN ('pending', 'accepted', 'declined')),
  ADD COLUMN IF NOT EXISTS responded_at timestamptz;

COMMENT ON COLUMN round_players.invitation_status IS 'Invitation state: accepted (default for play-now), pending (awaiting response), declined';
COMMENT ON COLUMN round_players.responded_at IS 'Timestamp when the invitee accepted or declined; NULL until response';

-- =====================================================
-- 2. RLS: INVITEES CAN RESPOND TO THEIR OWN INVITATION
-- =====================================================

DROP POLICY IF EXISTS "Players can respond to their round invitation" ON round_players;
CREATE POLICY "Players can respond to their round invitation"
  ON round_players FOR UPDATE
  USING (player_id = auth.uid())
  WITH CHECK (player_id = auth.uid());

-- =====================================================
-- 3. HELPER: ACCEPTED-PARTICIPANT CHECK (NON-RECURSIVE)
-- =====================================================
-- RECURSION HAZARD (42P17): A round_players SELECT/UPDATE policy that
-- references round_players in its own USING subquery makes Postgres
-- re-expand the same policy while evaluating it -> infinite policy
-- recursion that aborts EVERY query touching round_players.
--
-- The established fix in this repo is a SECURITY DEFINER helper that
-- runs the round_players lookup with RLS bypassed, so the policy never
-- re-enters itself. This mirrors is_round_participant
-- (20260327000000_fix_standalone_round_visibility_and_notifications.sql)
-- which was introduced to break exactly this kind of cycle, and is the
-- same proven-safe pattern cited in
-- 20260412010000_fix_rounds_friend_visibility_recursion.sql.

CREATE OR REPLACE FUNCTION is_accepted_round_participant(p_round_id UUID, p_player_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM round_players rp
    WHERE rp.round_id = p_round_id
      AND rp.player_id = p_player_id
      AND rp.invitation_status = 'accepted'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION is_accepted_round_participant(UUID, UUID) IS
  'Check if a player is an ACCEPTED participant in a round. SECURITY DEFINER so the round_players lookup bypasses RLS and never re-enters the round_players policy that calls it (avoids 42P17 recursion). Same pattern as is_round_participant (20260327000000) / 20260412010000.';

-- =====================================================
-- 4. RLS: ACCEPTED PLAYERS CAN UPDATE (START) THE ROUND
-- =====================================================
-- Standalone rounds can be started (status: upcoming -> in_progress) by any
-- accepted player, not just the owner. The existing "Users can update rounds"
-- policy covers the owner via user_id = auth.uid(); this separate policy
-- extends the privilege to accepted invitees. Uses the SECURITY DEFINER
-- helper for the round_players lookup (provably non-recursive, consistent
-- with the co-player SELECT policy below).

DROP POLICY IF EXISTS "Accepted players can update standalone rounds" ON rounds;
CREATE POLICY "Accepted players can update standalone rounds"
  ON rounds FOR UPDATE
  USING (
    competition_id IS NULL
    AND is_accepted_round_participant(rounds.id, auth.uid())
  );

-- =====================================================
-- 4b. VANDALISM HARDENING: PROTECT OWNERSHIP FIELDS
-- =====================================================
-- The UPDATE policy above lets any accepted invitee write the standalone
-- round row, which (without this guard) includes columns that are NOT theirs
-- to change: user_id (ownership), competition_id (attaching/detaching the
-- round from a competition), and deleted_at (soft-delete — confirmed the real
-- soft-delete column via 20250137000000_soft_delete_support.sql and
-- 20260526000100_soft_delete_round_rpcs.sql). A BEFORE UPDATE trigger pins
-- those fields for non-owner authenticated writers on standalone rounds.
--
-- Owner (auth.uid() = OLD.user_id) and service-role/trigger writers
-- (auth.uid() IS NULL) are exempt, so soft_delete_round() / restore_round()
-- and competition flows keep working.

CREATE OR REPLACE FUNCTION protect_round_ownership_fields()
RETURNS TRIGGER AS $$
BEGIN
  -- Only constrain authenticated non-owner writers on standalone rounds.
  -- Service-role / triggers (auth.uid() IS NULL) and the owner are exempt.
  IF OLD.competition_id IS NULL
     AND auth.uid() IS NOT NULL
     AND auth.uid() IS DISTINCT FROM OLD.user_id THEN
    IF NEW.user_id IS DISTINCT FROM OLD.user_id
       OR NEW.competition_id IS DISTINCT FROM OLD.competition_id
       OR NEW.deleted_at IS DISTINCT FROM OLD.deleted_at THEN
      RAISE EXCEPTION 'Only the round owner can change ownership, competition link, or deletion state';
    END IF;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION protect_round_ownership_fields IS
  'BEFORE UPDATE guard on rounds: blocks accepted-invitee writers from changing user_id / competition_id / deleted_at on standalone rounds. Owner and service-role (auth.uid() IS NULL) writers are exempt.';

DROP TRIGGER IF EXISTS trigger_protect_round_ownership_fields ON rounds;
CREATE TRIGGER trigger_protect_round_ownership_fields
  BEFORE UPDATE ON rounds
  FOR EACH ROW EXECUTE FUNCTION protect_round_ownership_fields();

-- =====================================================
-- 5. RLS: CO-PLAYER VISIBILITY FOR ACCEPTED INVITEES
-- =====================================================
-- NOTE: invitee SELECT on the rounds row is already covered by the
-- "Users can view rounds" policy via is_round_participant()
-- (20260412010000_fix_rounds_friend_visibility_recursion.sql) — any
-- round_players row grants visibility regardless of invitation_status.
--
-- This policy lets an accepted player see the OTHER round_players rows in
-- the same round. It MUST go through the SECURITY DEFINER helper: a direct
-- "EXISTS (SELECT 1 FROM round_players ...)" subquery here self-references
-- round_players and triggers 42P17 (see hazard note above).

DROP POLICY IF EXISTS "Accepted players can see co-players in their rounds" ON round_players;
CREATE POLICY "Accepted players can see co-players in their rounds"
  ON round_players FOR SELECT
  USING (
    is_accepted_round_participant(round_players.round_id, auth.uid())
  );

-- =====================================================
-- 6. EXTEND notifications TYPE CHECK CONSTRAINT
-- =====================================================
-- Pattern: drop + recreate including ALL currently-allowed types + 'social_round_response'.
-- Source: 20260521000300_activity_notifications.sql (most recent constraint definition).

ALTER TABLE notifications DROP CONSTRAINT IF EXISTS notifications_type_check;
ALTER TABLE notifications ADD CONSTRAINT notifications_type_check CHECK (type IN (
  -- Competition types
  'competition_player_added',
  'competition_player_joined',
  'new_round_created',
  'competition_status_changed',
  'scorecard_submitted',
  -- Social types
  'friend_request_received',
  'friend_request_accepted',
  'social_round_invitation',
  'social_round_response',     -- NEW: decline or other response from invitee
  -- League types
  'league_player_joined',
  'league_player_left',
  'league_player_removed',
  'league_round_tagged',
  'league_leaderboard_changed',
  'round_completed',
  -- Partnership types
  'partnership_created',
  'partnership_round_tagged',
  -- Side-game & prize pool types
  'skins_game_completed',
  'skins_game_cancelled',
  'wolf_game_completed',
  'wolf_game_cancelled',
  'prize_pool_settled',
  -- Tee-time reminder
  'tee_time_reminder',
  -- Activity feed
  'round_liked',
  'round_commented'
));

-- =====================================================
-- 7. EXTEND should_send_push() WITH 'social_round_response'
-- =====================================================
-- Without this, 'social_round_response' falls through to the ELSE TRUE
-- default in should_send_push(), bypassing the user's push preferences.
-- It belongs in the same category as 'social_round_invitation'
-- (push_competition_updates). Rebuilt verbatim from the latest definition
-- (20260422000000_tee_time_reminders.sql) with ONLY 'social_round_response'
-- added — every other branch is preserved unchanged.

CREATE OR REPLACE FUNCTION should_send_push(
  p_user_id UUID,
  p_notification_type TEXT
)
RETURNS BOOLEAN AS $$
DECLARE
  v_push_enabled BOOLEAN;
  v_category_enabled BOOLEAN;
BEGIN
  SELECT
    up.push_enabled,
    CASE
      -- Competition & round-related notifications
      WHEN p_notification_type IN (
        'competition_player_added',
        'competition_player_joined',
        'new_round_created',
        'competition_status_changed',
        'round_completed',
        'social_round_invitation',
        'social_round_response'
      ) THEN up.push_competition_updates

      -- Friend-related notifications
      WHEN p_notification_type IN (
        'friend_request_received',
        'friend_request_accepted'
      ) THEN up.push_friend_requests

      -- Scorecard-related notifications
      WHEN p_notification_type IN (
        'scorecard_submitted'
      ) THEN up.push_scorecard_updates

      -- League-related notifications
      WHEN p_notification_type IN (
        'league_player_joined',
        'league_player_left',
        'league_player_removed',
        'league_round_tagged',
        'league_leaderboard_changed'
      ) THEN up.push_league_updates

      -- Partnership-related notifications (also league category)
      WHEN p_notification_type IN (
        'partnership_created',
        'partnership_round_tagged'
      ) THEN up.push_league_updates

      -- Side-game & prize pool notifications
      WHEN p_notification_type IN (
        'skins_game_completed',
        'skins_game_cancelled',
        'wolf_game_completed',
        'wolf_game_cancelled',
        'prize_pool_settled'
      ) THEN up.push_side_game_updates

      -- Tee-time reminder
      WHEN p_notification_type = 'tee_time_reminder'
        THEN up.push_round_reminders

      -- Default to enabled for unknown types
      ELSE TRUE
    END
  INTO v_push_enabled, v_category_enabled
  FROM user_preferences up
  WHERE up.user_id = p_user_id;

  IF v_push_enabled IS NULL THEN
    RETURN FALSE;
  END IF;

  RETURN v_push_enabled AND v_category_enabled;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =====================================================
-- 8. TRIGGER: NOTIFY ORGANIZER WHEN INVITEE DECLINES
-- =====================================================
-- Fires AFTER UPDATE on round_players when invitation_status transitions
-- to 'declined'. Notifies the round owner (skips if owner is the decliner
-- or if the round has no owner — neither should happen in practice).
-- Uses the same SECURITY DEFINER + clubs join convention as
-- notify_round_player_invited() (20260118000100_fix_round_player_notification_trigger.sql).

CREATE OR REPLACE FUNCTION notify_round_invitation_declined()
RETURNS TRIGGER AS $$
DECLARE
  v_round_owner_id  UUID;
  v_course_name     TEXT;
  v_decliner_name   TEXT;
  v_round_date      DATE;
BEGIN
  -- Only fire when the status is freshly set to 'declined'
  IF NEW.invitation_status <> 'declined' OR OLD.invitation_status = 'declined' THEN
    RETURN NEW;
  END IF;

  -- Fetch round owner, course name, and date
  SELECT
    r.user_id,
    r.date,
    c.name
  INTO
    v_round_owner_id,
    v_round_date,
    v_course_name
  FROM rounds r
  JOIN courses c ON c.id = r.course_id
  WHERE r.id = NEW.round_id;

  -- Skip if there's no owner (shouldn't happen) or if owner is the decliner
  IF v_round_owner_id IS NULL OR v_round_owner_id = NEW.player_id THEN
    RETURN NEW;
  END IF;

  -- Get decliner's display name
  SELECT name INTO v_decliner_name
  FROM players
  WHERE id = NEW.player_id;

  -- Notify the organizer
  PERFORM create_notification(
    v_round_owner_id,                     -- p_user_id  (organizer)
    'social_round_response',              -- p_type
    jsonb_build_object(
      'decliner_name',  v_decliner_name,
      'course_name',    v_course_name,
      'date',           v_round_date,
      'player_id',      NEW.player_id
    ),
    NULL,                                 -- p_competition_id
    NEW.round_id,                         -- p_round_id
    NEW.player_id,                        -- p_player_id  (decliner)
    NULL,                                 -- p_friendship_id
    NULL                                  -- p_league_id
  );

  PERFORM send_push_notification(
    v_round_owner_id,
    'social_round_response',
    'Invitation declined',
    v_decliner_name || ' can''t make your round at ' || COALESCE(v_course_name, 'your course'),
    jsonb_build_object(
      'type',           'social_round_response',
      'roundId',        NEW.round_id,
      'decliner_name',  v_decliner_name,
      'course_name',    v_course_name,
      'date',           v_round_date
    )
  );

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION notify_round_invitation_declined IS
  'Notifies the round organiser when an invited player declines a scheduled standalone round.';

DROP TRIGGER IF EXISTS trigger_notify_round_invitation_declined ON round_players;
CREATE TRIGGER trigger_notify_round_invitation_declined
  AFTER UPDATE ON round_players
  FOR EACH ROW EXECUTE FUNCTION notify_round_invitation_declined();

-- =====================================================
-- 9. TRIGGER: NOTIFY INVITEES WHEN UPCOMING ROUND IS CANCELLED
-- =====================================================
-- BEFORE DELETE on rounds: when a standalone upcoming round is deleted,
-- notify every pending/accepted player who is NOT the owner.
-- Returns OLD to allow the delete to proceed.

CREATE OR REPLACE FUNCTION notify_scheduled_round_cancelled()
RETURNS TRIGGER AS $$
DECLARE
  v_course_name TEXT;
  rec           RECORD;
BEGIN
  -- Only fire for upcoming standalone rounds
  IF OLD.status <> 'upcoming' OR OLD.competition_id IS NOT NULL THEN
    RETURN OLD;
  END IF;

  -- Fetch course name
  SELECT c.name INTO v_course_name
  FROM courses c
  WHERE c.id = OLD.course_id;

  -- Notify all non-owner players who haven't declined
  FOR rec IN
    SELECT rp.player_id
    FROM round_players rp
    WHERE rp.round_id = OLD.id
      AND rp.player_id <> OLD.user_id          -- exclude the owner
      AND rp.invitation_status <> 'declined'   -- skip already-declined players
  LOOP
    PERFORM create_notification(
      rec.player_id,                      -- p_user_id
      'social_round_response',            -- p_type
      jsonb_build_object(
        'course_name',  v_course_name,
        'date',         OLD.date,
        'cancelled',    true
      ),
      NULL,                               -- p_competition_id
      -- p_round_id MUST be NULL: notifications.round_id is a FK to rounds
      -- with ON DELETE CASCADE, so linking to the round being deleted would
      -- wipe this notification in the same statement that creates it.
      NULL,                               -- p_round_id
      OLD.user_id,                        -- p_player_id  (organizer who cancelled)
      NULL,                               -- p_friendship_id
      NULL                                -- p_league_id
    );

    PERFORM send_push_notification(
      rec.player_id,
      'social_round_response',
      'Round cancelled',
      'Your round at ' || COALESCE(v_course_name, 'the course') || ' on ' || to_char(OLD.date, 'DD Mon YYYY') || ' has been cancelled',
      jsonb_build_object(
        'type',         'social_round_response',
        -- No roundId: the round no longer exists, so there is nothing to
        -- deep-link to. Clients fall back to their default notification route.
        'course_name',  v_course_name,
        'date',         OLD.date,
        'cancelled',    true
      )
    );
  END LOOP;

  RETURN OLD;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION notify_scheduled_round_cancelled IS
  'Notifies invited players when an upcoming standalone round is cancelled (deleted).';

DROP TRIGGER IF EXISTS trigger_notify_scheduled_round_cancelled ON rounds;
CREATE TRIGGER trigger_notify_scheduled_round_cancelled
  BEFORE DELETE ON rounds
  FOR EACH ROW EXECUTE FUNCTION notify_scheduled_round_cancelled();

-- =====================================================
-- THREAT MODEL NOTES (ACCEPTED RESIDUAL RISK)
-- =====================================================
-- The following are KNOWN and intentionally accepted for the scheduled
-- social-round flow. Invitees are semi-trusted: the owner explicitly chose
-- to invite them, so a small amount of self-service latitude is by design.
--
-- (a) Self-accept: an invitee can flip their own row to 'accepted' (the
--     "Players can respond to their round invitation" policy is keyed on
--     player_id = auth.uid()). Acceptable — they were invited, and accepting
--     only grants the round visibility/start access the owner intended.
--
-- (b) Decline re-fires organiser notification: the decline trigger has no
--     rate limit, so toggling accepted<->declined can re-notify the organiser
--     each transition. Acceptable for a handful of invited partners; not a
--     spam vector at this trust level.
--
-- (c) Self-data row UPDATE: the row-level "Players can respond..." policy lets
--     a player freely change their OWN selected_tee / responded_at /
--     invitation_status. This is their own data; ownership-sensitive ROUNDS
--     columns are separately protected by protect_round_ownership_fields().
--
-- Explicitly mitigated (NOT residual): cross-row ownership vandalism on the
-- rounds table (user_id / competition_id / deleted_at) is blocked by the
-- protect_round_ownership_fields() BEFORE UPDATE trigger; round_players policy
-- recursion (42P17) is eliminated via the is_accepted_round_participant
-- SECURITY DEFINER helper.

-- =====================================================
-- MIGRATION COMPLETE
-- =====================================================
