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
-- 3. RLS: ACCEPTED PLAYERS CAN UPDATE (START) THE ROUND
-- =====================================================
-- Standalone rounds can be started (status: upcoming -> in_progress) by any
-- accepted player, not just the owner. The existing "Users can update rounds"
-- policy covers the owner via user_id = auth.uid(); this separate policy
-- extends the privilege to accepted invitees.

DROP POLICY IF EXISTS "Accepted players can update standalone rounds" ON rounds;
CREATE POLICY "Accepted players can update standalone rounds"
  ON rounds FOR UPDATE
  USING (
    competition_id IS NULL
    AND EXISTS (
      SELECT 1 FROM round_players rp
      WHERE rp.round_id = rounds.id
        AND rp.player_id = auth.uid()
        AND rp.invitation_status = 'accepted'
    )
  );

-- =====================================================
-- 4. RLS: CO-PLAYER VISIBILITY FOR ACCEPTED INVITEES
-- =====================================================
-- NOTE: invitee SELECT on the rounds row is already covered by the
-- "Users can view rounds" policy via is_round_participant()
-- (20260412010000_fix_rounds_friend_visibility_recursion.sql) — any
-- round_players row grants visibility regardless of invitation_status.

-- Allow round_players to see co-players in rounds they've accepted
DROP POLICY IF EXISTS "Accepted players can see co-players in their rounds" ON round_players;
CREATE POLICY "Accepted players can see co-players in their rounds"
  ON round_players FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM round_players my_row
      WHERE my_row.round_id = round_players.round_id
        AND my_row.player_id = auth.uid()
        AND my_row.invitation_status = 'accepted'
    )
  );

-- =====================================================
-- 5. EXTEND notifications TYPE CHECK CONSTRAINT
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
-- 6. TRIGGER: NOTIFY ORGANIZER WHEN INVITEE DECLINES
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
-- 7. TRIGGER: NOTIFY INVITEES WHEN UPCOMING ROUND IS CANCELLED
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
      OLD.id,                             -- p_round_id
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
        'roundId',      OLD.id,
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
-- MIGRATION COMPLETE
-- =====================================================
