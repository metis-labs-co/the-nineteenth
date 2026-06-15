-- =====================================================
-- Social Activity push preference
-- The Nineteenth - Golf Competition App
-- =====================================================
-- Adds push_social_activity to user_preferences and routes the activity-feed
-- notification types (round_liked / round_commented / round_also_commented)
-- through it in should_send_push(). Previously these fell through to ELSE TRUE
-- (master push_enabled only). Default TRUE → opt-out, behaviour unchanged until
-- a user turns it off. Also threads the column through the two preference RPCs
-- to keep them complete (the client uses direct table access, not these RPCs).
-- =====================================================

-- -----------------------------------------------------
-- 1. COLUMN
-- -----------------------------------------------------
ALTER TABLE user_preferences
  ADD COLUMN IF NOT EXISTS push_social_activity BOOLEAN NOT NULL DEFAULT TRUE;

COMMENT ON COLUMN user_preferences.push_social_activity IS
  'Toggle for social activity push notifications (likes & comments on rounds)';

-- -----------------------------------------------------
-- 2. should_send_push() — add social activity branch
-- -----------------------------------------------------
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

      -- Social activity (likes & comments on rounds)
      WHEN p_notification_type IN (
        'round_liked',
        'round_commented',
        'round_also_commented'
      ) THEN up.push_social_activity

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

-- -----------------------------------------------------
-- 3. get_user_push_preferences() — add column
-- -----------------------------------------------------
DROP FUNCTION IF EXISTS get_user_push_preferences(UUID);

CREATE OR REPLACE FUNCTION get_user_push_preferences(p_user_id UUID)
RETURNS TABLE (
  push_enabled BOOLEAN,
  push_competition_updates BOOLEAN,
  push_friend_requests BOOLEAN,
  push_scorecard_updates BOOLEAN,
  push_league_updates BOOLEAN,
  push_side_game_updates BOOLEAN,
  push_round_reminders BOOLEAN,
  push_social_activity BOOLEAN
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    up.push_enabled,
    up.push_competition_updates,
    up.push_friend_requests,
    up.push_scorecard_updates,
    up.push_league_updates,
    up.push_side_game_updates,
    up.push_round_reminders,
    up.push_social_activity
  FROM user_preferences up
  WHERE up.user_id = p_user_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- -----------------------------------------------------
-- 4. update_push_preferences() — add param + column
-- -----------------------------------------------------
-- Drop the currently-deployed 7-BOOLEAN signature (from 20260422) before
-- recreating with 8 BOOLEANs — without this, CREATE OR REPLACE would leave a
-- stale overload and ambiguous-call errors. Second line is belt-and-suspenders
-- for the older 6-BOOLEAN form (already removed by 20260422; IF EXISTS no-ops).
DROP FUNCTION IF EXISTS update_push_preferences(UUID, BOOLEAN, BOOLEAN, BOOLEAN, BOOLEAN, BOOLEAN, BOOLEAN, BOOLEAN);
DROP FUNCTION IF EXISTS update_push_preferences(UUID, BOOLEAN, BOOLEAN, BOOLEAN, BOOLEAN, BOOLEAN, BOOLEAN);

CREATE OR REPLACE FUNCTION update_push_preferences(
  p_user_id UUID,
  p_push_enabled BOOLEAN DEFAULT NULL,
  p_push_competition_updates BOOLEAN DEFAULT NULL,
  p_push_friend_requests BOOLEAN DEFAULT NULL,
  p_push_scorecard_updates BOOLEAN DEFAULT NULL,
  p_push_league_updates BOOLEAN DEFAULT NULL,
  p_push_side_game_updates BOOLEAN DEFAULT NULL,
  p_push_round_reminders BOOLEAN DEFAULT NULL,
  p_push_social_activity BOOLEAN DEFAULT NULL
)
RETURNS TABLE (
  push_enabled BOOLEAN,
  push_competition_updates BOOLEAN,
  push_friend_requests BOOLEAN,
  push_scorecard_updates BOOLEAN,
  push_league_updates BOOLEAN,
  push_side_game_updates BOOLEAN,
  push_round_reminders BOOLEAN,
  push_social_activity BOOLEAN
) AS $$
BEGIN
  UPDATE user_preferences
  SET
    push_enabled = COALESCE(p_push_enabled, user_preferences.push_enabled),
    push_competition_updates = COALESCE(p_push_competition_updates, user_preferences.push_competition_updates),
    push_friend_requests = COALESCE(p_push_friend_requests, user_preferences.push_friend_requests),
    push_scorecard_updates = COALESCE(p_push_scorecard_updates, user_preferences.push_scorecard_updates),
    push_league_updates = COALESCE(p_push_league_updates, user_preferences.push_league_updates),
    push_side_game_updates = COALESCE(p_push_side_game_updates, user_preferences.push_side_game_updates),
    push_round_reminders = COALESCE(p_push_round_reminders, user_preferences.push_round_reminders),
    push_social_activity = COALESCE(p_push_social_activity, user_preferences.push_social_activity),
    updated_at = NOW()
  WHERE user_id = p_user_id;

  RETURN QUERY
  SELECT
    up.push_enabled,
    up.push_competition_updates,
    up.push_friend_requests,
    up.push_scorecard_updates,
    up.push_league_updates,
    up.push_side_game_updates,
    up.push_round_reminders,
    up.push_social_activity
  FROM user_preferences up
  WHERE up.user_id = p_user_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
