-- =====================================================
-- Push Notification Preferences
-- The Nineteenth - Golf Competition App
-- =====================================================
-- This migration adds push notification preference columns
-- to the players table, allowing users to control which
-- types of push notifications they receive.
-- =====================================================

-- =====================================================
-- ADD COLUMNS TO PLAYERS TABLE
-- =====================================================

-- Global push notification toggle
ALTER TABLE players
ADD COLUMN IF NOT EXISTS push_enabled BOOLEAN NOT NULL DEFAULT TRUE;

-- Category-specific toggles (only apply if push_enabled is TRUE)
ALTER TABLE players
ADD COLUMN IF NOT EXISTS push_competition_updates BOOLEAN NOT NULL DEFAULT TRUE;

ALTER TABLE players
ADD COLUMN IF NOT EXISTS push_friend_requests BOOLEAN NOT NULL DEFAULT TRUE;

ALTER TABLE players
ADD COLUMN IF NOT EXISTS push_scorecard_updates BOOLEAN NOT NULL DEFAULT TRUE;

-- =====================================================
-- COMMENTS
-- =====================================================

COMMENT ON COLUMN players.push_enabled IS 'Global toggle for all push notifications. When FALSE, no push notifications are sent regardless of category settings.';
COMMENT ON COLUMN players.push_competition_updates IS 'Toggle for competition-related notifications (new rounds, status changes, player added/joined).';
COMMENT ON COLUMN players.push_friend_requests IS 'Toggle for friend request notifications (received, accepted).';
COMMENT ON COLUMN players.push_scorecard_updates IS 'Toggle for scorecard notifications (scorecard submitted).';

-- =====================================================
-- HELPER FUNCTION: Get User Push Preferences
-- =====================================================
-- Returns the push notification preferences for a user.
-- Used by Edge Functions to check if a notification should be sent.

CREATE OR REPLACE FUNCTION get_user_push_preferences(p_user_id UUID)
RETURNS TABLE (
  push_enabled BOOLEAN,
  push_competition_updates BOOLEAN,
  push_friend_requests BOOLEAN,
  push_scorecard_updates BOOLEAN
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    p.push_enabled,
    p.push_competition_updates,
    p.push_friend_requests,
    p.push_scorecard_updates
  FROM players p
  WHERE p.id = p_user_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =====================================================
-- HELPER FUNCTION: Check If Push Should Be Sent
-- =====================================================
-- Convenience function that checks if a specific notification
-- type should be sent to a user based on their preferences.
-- Returns TRUE if the notification should be sent.

CREATE OR REPLACE FUNCTION should_send_push(
  p_user_id UUID,
  p_notification_type TEXT
)
RETURNS BOOLEAN AS $$
DECLARE
  v_push_enabled BOOLEAN;
  v_category_enabled BOOLEAN;
BEGIN
  -- Get the user's push preferences
  SELECT
    p.push_enabled,
    CASE
      -- Competition-related notifications
      WHEN p_notification_type IN (
        'competition_player_added',
        'competition_player_joined',
        'new_round_created',
        'competition_status_changed'
      ) THEN p.push_competition_updates

      -- Friend-related notifications
      WHEN p_notification_type IN (
        'friend_request_received',
        'friend_request_accepted'
      ) THEN p.push_friend_requests

      -- Scorecard-related notifications
      WHEN p_notification_type IN (
        'scorecard_submitted'
      ) THEN p.push_scorecard_updates

      -- Default to enabled for unknown types
      ELSE TRUE
    END
  INTO v_push_enabled, v_category_enabled
  FROM players p
  WHERE p.id = p_user_id;

  -- If user not found, don't send
  IF v_push_enabled IS NULL THEN
    RETURN FALSE;
  END IF;

  -- Both global and category must be enabled
  RETURN v_push_enabled AND v_category_enabled;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =====================================================
-- HELPER FUNCTION: Update Push Preferences
-- =====================================================
-- Updates push notification preferences for a user.
-- Returns the updated preferences.

CREATE OR REPLACE FUNCTION update_push_preferences(
  p_user_id UUID,
  p_push_enabled BOOLEAN DEFAULT NULL,
  p_push_competition_updates BOOLEAN DEFAULT NULL,
  p_push_friend_requests BOOLEAN DEFAULT NULL,
  p_push_scorecard_updates BOOLEAN DEFAULT NULL
)
RETURNS TABLE (
  push_enabled BOOLEAN,
  push_competition_updates BOOLEAN,
  push_friend_requests BOOLEAN,
  push_scorecard_updates BOOLEAN
) AS $$
BEGIN
  UPDATE players
  SET
    push_enabled = COALESCE(p_push_enabled, players.push_enabled),
    push_competition_updates = COALESCE(p_push_competition_updates, players.push_competition_updates),
    push_friend_requests = COALESCE(p_push_friend_requests, players.push_friend_requests),
    push_scorecard_updates = COALESCE(p_push_scorecard_updates, players.push_scorecard_updates),
    updated_at = NOW()
  WHERE id = p_user_id;

  RETURN QUERY
  SELECT
    p.push_enabled,
    p.push_competition_updates,
    p.push_friend_requests,
    p.push_scorecard_updates
  FROM players p
  WHERE p.id = p_user_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =====================================================
-- FUNCTION COMMENTS
-- =====================================================

COMMENT ON FUNCTION get_user_push_preferences IS 'Returns the push notification preferences for a user (all 4 boolean columns).';
COMMENT ON FUNCTION should_send_push IS 'Checks if a push notification of a given type should be sent to a user. Returns TRUE if global push is enabled AND the relevant category is enabled.';
COMMENT ON FUNCTION update_push_preferences IS 'Updates push notification preferences for a user. Only updates columns that are explicitly passed (non-NULL).';

-- =====================================================
-- INDEXES
-- =====================================================

-- Partial index for users with push enabled (for efficient querying when sending notifications)
CREATE INDEX IF NOT EXISTS idx_players_push_enabled
  ON players(id)
  WHERE push_enabled = TRUE;

-- =====================================================
-- MIGRATION COMPLETE
-- =====================================================
