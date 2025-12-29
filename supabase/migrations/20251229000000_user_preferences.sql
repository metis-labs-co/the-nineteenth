-- =====================================================
-- User Preferences Table
-- The Nineteenth - Golf Competition App
-- =====================================================
-- This migration creates a dedicated user_preferences table
-- to centralize all user settings and preferences.
--
-- Benefits:
-- - Syncs preferences across devices (vs local AsyncStorage)
-- - Separates preferences from core profile data
-- - Extensible via custom_settings JSONB column
-- - Auto-creates on new player registration
-- =====================================================

-- =====================================================
-- CREATE USER_PREFERENCES TABLE
-- =====================================================

CREATE TABLE user_preferences (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL UNIQUE REFERENCES players(id) ON DELETE CASCADE,

  -- =====================================================
  -- Display & UI Preferences
  -- =====================================================
  -- Theme mode: 'light', 'dark', or 'system' (follow device setting)
  theme_mode TEXT NOT NULL DEFAULT 'system'
    CHECK (theme_mode IN ('light', 'dark', 'system')),

  -- Distance units for course yardages
  distance_unit TEXT NOT NULL DEFAULT 'metres'
    CHECK (distance_unit IN ('yards', 'metres')),

  -- =====================================================
  -- Scoring Entry Display Preferences
  -- =====================================================
  -- Toggle visibility of optional scoring fields during round entry
  show_putts BOOLEAN NOT NULL DEFAULT TRUE,
  show_fairway_hit BOOLEAN NOT NULL DEFAULT FALSE,
  show_gir BOOLEAN NOT NULL DEFAULT FALSE,

  -- =====================================================
  -- Push Notification Preferences
  -- =====================================================
  -- Global toggle - when FALSE, no push notifications are sent
  push_enabled BOOLEAN NOT NULL DEFAULT TRUE,

  -- Category-specific toggles (only apply if push_enabled is TRUE)
  push_competition_updates BOOLEAN NOT NULL DEFAULT TRUE,
  push_friend_requests BOOLEAN NOT NULL DEFAULT TRUE,
  push_scorecard_updates BOOLEAN NOT NULL DEFAULT TRUE,

  -- =====================================================
  -- Round Timer Preferences
  -- =====================================================
  round_timer_enabled BOOLEAN NOT NULL DEFAULT FALSE,

  -- =====================================================
  -- Developer/Debug Settings
  -- =====================================================
  debug_mode_enabled BOOLEAN NOT NULL DEFAULT FALSE,

  -- =====================================================
  -- Flexible Extension Column
  -- =====================================================
  -- For future preferences without schema changes
  -- Example: { "preferred_tee": "blue", "locale": "en-AU" }
  custom_settings JSONB NOT NULL DEFAULT '{}',

  -- =====================================================
  -- Metadata
  -- =====================================================
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- =====================================================
-- INDEXES
-- =====================================================

-- Primary lookup by user
CREATE INDEX idx_user_preferences_user_id ON user_preferences(user_id);

-- Partial index for users with push enabled (for efficient notification queries)
CREATE INDEX idx_user_preferences_push_enabled
  ON user_preferences(user_id)
  WHERE push_enabled = TRUE;

-- =====================================================
-- AUTO-CREATE PREFERENCES ON NEW PLAYER
-- =====================================================

CREATE OR REPLACE FUNCTION create_user_preferences()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO user_preferences (user_id)
  VALUES (NEW.id)
  ON CONFLICT (user_id) DO NOTHING;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER trigger_create_user_preferences
  AFTER INSERT ON players
  FOR EACH ROW EXECUTE FUNCTION create_user_preferences();

-- =====================================================
-- AUTO-UPDATE updated_at TRIGGER
-- =====================================================

CREATE TRIGGER update_user_preferences_updated_at
  BEFORE UPDATE ON user_preferences
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- =====================================================
-- MIGRATE EXISTING DATA FROM PLAYERS TABLE
-- =====================================================

-- Create preferences for all existing players
INSERT INTO user_preferences (user_id, push_enabled, push_competition_updates, push_friend_requests, push_scorecard_updates)
SELECT
  id,
  COALESCE(push_enabled, TRUE),
  COALESCE(push_competition_updates, TRUE),
  COALESCE(push_friend_requests, TRUE),
  COALESCE(push_scorecard_updates, TRUE)
FROM players
ON CONFLICT (user_id) DO NOTHING;

-- =====================================================
-- UPDATE HELPER FUNCTIONS TO USE NEW TABLE
-- =====================================================

-- Drop old function first to replace return type
DROP FUNCTION IF EXISTS get_user_push_preferences(UUID);

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
    up.push_enabled,
    up.push_competition_updates,
    up.push_friend_requests,
    up.push_scorecard_updates
  FROM user_preferences up
  WHERE up.user_id = p_user_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Updated should_send_push to use user_preferences table
CREATE OR REPLACE FUNCTION should_send_push(
  p_user_id UUID,
  p_notification_type TEXT
)
RETURNS BOOLEAN AS $$
DECLARE
  v_push_enabled BOOLEAN;
  v_category_enabled BOOLEAN;
BEGIN
  -- Get the user's push preferences from user_preferences table
  SELECT
    up.push_enabled,
    CASE
      -- Competition-related notifications
      WHEN p_notification_type IN (
        'competition_player_added',
        'competition_player_joined',
        'new_round_created',
        'competition_status_changed'
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

      -- Default to enabled for unknown types
      ELSE TRUE
    END
  INTO v_push_enabled, v_category_enabled
  FROM user_preferences up
  WHERE up.user_id = p_user_id;

  -- If user not found, don't send
  IF v_push_enabled IS NULL THEN
    RETURN FALSE;
  END IF;

  -- Both global and category must be enabled
  RETURN v_push_enabled AND v_category_enabled;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Updated update_push_preferences to use user_preferences table
DROP FUNCTION IF EXISTS update_push_preferences(UUID, BOOLEAN, BOOLEAN, BOOLEAN, BOOLEAN);

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
  UPDATE user_preferences
  SET
    push_enabled = COALESCE(p_push_enabled, user_preferences.push_enabled),
    push_competition_updates = COALESCE(p_push_competition_updates, user_preferences.push_competition_updates),
    push_friend_requests = COALESCE(p_push_friend_requests, user_preferences.push_friend_requests),
    push_scorecard_updates = COALESCE(p_push_scorecard_updates, user_preferences.push_scorecard_updates),
    updated_at = NOW()
  WHERE user_id = p_user_id;

  RETURN QUERY
  SELECT
    up.push_enabled,
    up.push_competition_updates,
    up.push_friend_requests,
    up.push_scorecard_updates
  FROM user_preferences up
  WHERE up.user_id = p_user_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =====================================================
-- NEW HELPER FUNCTIONS FOR ALL PREFERENCES
-- =====================================================

-- Get all user preferences
CREATE OR REPLACE FUNCTION get_user_preferences(p_user_id UUID)
RETURNS TABLE (
  theme_mode TEXT,
  distance_unit TEXT,
  show_putts BOOLEAN,
  show_fairway_hit BOOLEAN,
  show_gir BOOLEAN,
  push_enabled BOOLEAN,
  push_competition_updates BOOLEAN,
  push_friend_requests BOOLEAN,
  push_scorecard_updates BOOLEAN,
  round_timer_enabled BOOLEAN,
  debug_mode_enabled BOOLEAN,
  custom_settings JSONB
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    up.theme_mode,
    up.distance_unit,
    up.show_putts,
    up.show_fairway_hit,
    up.show_gir,
    up.push_enabled,
    up.push_competition_updates,
    up.push_friend_requests,
    up.push_scorecard_updates,
    up.round_timer_enabled,
    up.debug_mode_enabled,
    up.custom_settings
  FROM user_preferences up
  WHERE up.user_id = p_user_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Update user preferences (partial update)
CREATE OR REPLACE FUNCTION update_user_preferences(
  p_user_id UUID,
  p_theme_mode TEXT DEFAULT NULL,
  p_distance_unit TEXT DEFAULT NULL,
  p_show_putts BOOLEAN DEFAULT NULL,
  p_show_fairway_hit BOOLEAN DEFAULT NULL,
  p_show_gir BOOLEAN DEFAULT NULL,
  p_push_enabled BOOLEAN DEFAULT NULL,
  p_push_competition_updates BOOLEAN DEFAULT NULL,
  p_push_friend_requests BOOLEAN DEFAULT NULL,
  p_push_scorecard_updates BOOLEAN DEFAULT NULL,
  p_round_timer_enabled BOOLEAN DEFAULT NULL,
  p_debug_mode_enabled BOOLEAN DEFAULT NULL,
  p_custom_settings JSONB DEFAULT NULL
)
RETURNS TABLE (
  theme_mode TEXT,
  distance_unit TEXT,
  show_putts BOOLEAN,
  show_fairway_hit BOOLEAN,
  show_gir BOOLEAN,
  push_enabled BOOLEAN,
  push_competition_updates BOOLEAN,
  push_friend_requests BOOLEAN,
  push_scorecard_updates BOOLEAN,
  round_timer_enabled BOOLEAN,
  debug_mode_enabled BOOLEAN,
  custom_settings JSONB
) AS $$
BEGIN
  UPDATE user_preferences up
  SET
    theme_mode = COALESCE(p_theme_mode, up.theme_mode),
    distance_unit = COALESCE(p_distance_unit, up.distance_unit),
    show_putts = COALESCE(p_show_putts, up.show_putts),
    show_fairway_hit = COALESCE(p_show_fairway_hit, up.show_fairway_hit),
    show_gir = COALESCE(p_show_gir, up.show_gir),
    push_enabled = COALESCE(p_push_enabled, up.push_enabled),
    push_competition_updates = COALESCE(p_push_competition_updates, up.push_competition_updates),
    push_friend_requests = COALESCE(p_push_friend_requests, up.push_friend_requests),
    push_scorecard_updates = COALESCE(p_push_scorecard_updates, up.push_scorecard_updates),
    round_timer_enabled = COALESCE(p_round_timer_enabled, up.round_timer_enabled),
    debug_mode_enabled = COALESCE(p_debug_mode_enabled, up.debug_mode_enabled),
    custom_settings = COALESCE(p_custom_settings, up.custom_settings),
    updated_at = NOW()
  WHERE up.user_id = p_user_id;

  RETURN QUERY
  SELECT
    upd.theme_mode,
    upd.distance_unit,
    upd.show_putts,
    upd.show_fairway_hit,
    upd.show_gir,
    upd.push_enabled,
    upd.push_competition_updates,
    upd.push_friend_requests,
    upd.push_scorecard_updates,
    upd.round_timer_enabled,
    upd.debug_mode_enabled,
    upd.custom_settings
  FROM user_preferences upd
  WHERE upd.user_id = p_user_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =====================================================
-- ROW LEVEL SECURITY
-- =====================================================

ALTER TABLE user_preferences ENABLE ROW LEVEL SECURITY;

-- Users can view their own preferences
CREATE POLICY "Users can view own preferences"
  ON user_preferences FOR SELECT
  USING (auth.uid() = user_id);

-- Users can update their own preferences
CREATE POLICY "Users can update own preferences"
  ON user_preferences FOR UPDATE
  USING (auth.uid() = user_id);

-- Users can insert their own preferences (edge case: trigger usually handles this)
CREATE POLICY "Users can insert own preferences"
  ON user_preferences FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- =====================================================
-- DROP OLD COLUMNS FROM PLAYERS TABLE
-- =====================================================
-- Note: We keep the old columns for now for backward compatibility
-- In a future migration, after all client code is updated, run:
--
-- ALTER TABLE players DROP COLUMN IF EXISTS push_enabled;
-- ALTER TABLE players DROP COLUMN IF EXISTS push_competition_updates;
-- ALTER TABLE players DROP COLUMN IF EXISTS push_friend_requests;
-- ALTER TABLE players DROP COLUMN IF EXISTS push_scorecard_updates;
-- DROP INDEX IF EXISTS idx_players_push_enabled;
--
-- For now, we leave them to avoid breaking existing queries during transition.

-- =====================================================
-- COMMENTS
-- =====================================================

COMMENT ON TABLE user_preferences IS 'User preferences and settings, synced across devices. One row per user.';

COMMENT ON COLUMN user_preferences.theme_mode IS 'UI theme preference: light, dark, or system (follow device setting)';
COMMENT ON COLUMN user_preferences.distance_unit IS 'Distance units for course yardages: metres (default for AU) or yards';
COMMENT ON COLUMN user_preferences.show_putts IS 'Show putts input field during scorecard entry';
COMMENT ON COLUMN user_preferences.show_fairway_hit IS 'Show fairway hit (FIR) toggle during scorecard entry';
COMMENT ON COLUMN user_preferences.show_gir IS 'Show greens in regulation (GIR) toggle during scorecard entry';
COMMENT ON COLUMN user_preferences.push_enabled IS 'Global toggle for all push notifications. When FALSE, no push notifications are sent.';
COMMENT ON COLUMN user_preferences.push_competition_updates IS 'Toggle for competition-related push notifications (new rounds, status changes, player added/joined)';
COMMENT ON COLUMN user_preferences.push_friend_requests IS 'Toggle for friend request push notifications (received, accepted)';
COMMENT ON COLUMN user_preferences.push_scorecard_updates IS 'Toggle for scorecard push notifications (scorecard submitted)';
COMMENT ON COLUMN user_preferences.round_timer_enabled IS 'Enable round timer feature during active rounds';
COMMENT ON COLUMN user_preferences.debug_mode_enabled IS 'Developer debug mode toggle';
COMMENT ON COLUMN user_preferences.custom_settings IS 'Flexible JSONB for future preferences without schema changes';

COMMENT ON FUNCTION get_user_preferences IS 'Returns all preferences for a user';
COMMENT ON FUNCTION update_user_preferences IS 'Updates user preferences. Only updates columns that are explicitly passed (non-NULL).';
COMMENT ON FUNCTION create_user_preferences IS 'Trigger function to auto-create preferences when a new player is inserted';

-- =====================================================
-- MIGRATION COMPLETE
-- =====================================================
