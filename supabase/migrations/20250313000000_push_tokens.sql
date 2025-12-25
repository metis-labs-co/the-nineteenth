-- =====================================================
-- Push Tokens Table
-- The Nineteenth - Golf Competition App
-- =====================================================
-- This migration creates the push notification token storage for:
-- - Expo push tokens per user/device
-- - Multi-device support
-- - Token lifecycle management (enable/disable)
-- =====================================================

-- =====================================================
-- TABLE: push_tokens
-- =====================================================

CREATE TABLE push_tokens (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- User relationship (multiple tokens per user for multi-device)
  user_id UUID NOT NULL REFERENCES players(id) ON DELETE CASCADE,

  -- Token data
  expo_token TEXT NOT NULL,
  device_id TEXT,           -- For identifying specific devices
  device_name TEXT,         -- Friendly device name (e.g., "Sam's iPhone")
  platform TEXT CHECK (platform IN ('ios', 'android')),
  app_version TEXT,         -- Track which app version registered this token

  -- Token status
  enabled BOOLEAN NOT NULL DEFAULT TRUE,

  -- Usage tracking
  last_used_at TIMESTAMPTZ,

  -- Timestamps
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  -- Each user can only have one entry per expo token
  CONSTRAINT push_tokens_user_token_unique UNIQUE (user_id, expo_token)
);

-- =====================================================
-- INDEXES
-- =====================================================

-- Index for querying by user_id (get all tokens for a user)
CREATE INDEX idx_push_tokens_user ON push_tokens(user_id);

-- Partial index for enabled tokens only (most common query pattern)
CREATE INDEX idx_push_tokens_enabled ON push_tokens(user_id) WHERE enabled = TRUE;

-- Index for token lookup (e.g., when disabling invalid tokens)
CREATE INDEX idx_push_tokens_token ON push_tokens(expo_token);

-- =====================================================
-- TRIGGER: Auto-update updated_at timestamp
-- =====================================================

-- Use existing trigger function (created in earlier migrations)
CREATE TRIGGER update_push_tokens_updated_at
  BEFORE UPDATE ON push_tokens
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- =====================================================
-- ROW LEVEL SECURITY
-- =====================================================

ALTER TABLE push_tokens ENABLE ROW LEVEL SECURITY;

-- Users can manage their own push tokens
CREATE POLICY "Users can manage their own push tokens"
  ON push_tokens FOR ALL
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- Service role has full access (for Edge Functions sending push notifications)
CREATE POLICY "Service role has full access to push tokens"
  ON push_tokens FOR ALL
  USING (auth.jwt()->>'role' = 'service_role');

-- =====================================================
-- HELPER FUNCTIONS
-- =====================================================

-- Get all enabled push tokens for a user
CREATE OR REPLACE FUNCTION get_user_push_tokens(p_user_id UUID)
RETURNS TABLE (
  expo_token TEXT,
  platform TEXT
) AS $$
BEGIN
  RETURN QUERY
  SELECT pt.expo_token, pt.platform
  FROM push_tokens pt
  WHERE pt.user_id = p_user_id
    AND pt.enabled = TRUE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Upsert (insert or update) a push token
CREATE OR REPLACE FUNCTION upsert_push_token(
  p_user_id UUID,
  p_token TEXT,
  p_device_id TEXT DEFAULT NULL,
  p_platform TEXT DEFAULT NULL,
  p_device_name TEXT DEFAULT NULL,
  p_app_version TEXT DEFAULT NULL
)
RETURNS UUID AS $$
DECLARE
  v_token_id UUID;
BEGIN
  INSERT INTO push_tokens (
    user_id,
    expo_token,
    device_id,
    device_name,
    platform,
    app_version,
    enabled,
    last_used_at
  )
  VALUES (
    p_user_id,
    p_token,
    p_device_id,
    p_device_name,
    p_platform,
    p_app_version,
    TRUE,
    NOW()
  )
  ON CONFLICT (user_id, expo_token)
  DO UPDATE SET
    device_id = COALESCE(EXCLUDED.device_id, push_tokens.device_id),
    device_name = COALESCE(EXCLUDED.device_name, push_tokens.device_name),
    platform = COALESCE(EXCLUDED.platform, push_tokens.platform),
    app_version = COALESCE(EXCLUDED.app_version, push_tokens.app_version),
    enabled = TRUE,  -- Re-enable if previously disabled
    last_used_at = NOW(),
    updated_at = NOW()
  RETURNING id INTO v_token_id;

  RETURN v_token_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Disable a push token (e.g., when Expo returns DeviceNotRegistered)
CREATE OR REPLACE FUNCTION disable_push_token(p_token TEXT)
RETURNS BOOLEAN AS $$
BEGIN
  UPDATE push_tokens
  SET enabled = FALSE, updated_at = NOW()
  WHERE expo_token = p_token;

  RETURN FOUND;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Get user IDs that have at least one enabled push token
CREATE OR REPLACE FUNCTION get_users_with_push_enabled(p_user_ids UUID[])
RETURNS TABLE (user_id UUID) AS $$
BEGIN
  RETURN QUERY
  SELECT DISTINCT pt.user_id
  FROM push_tokens pt
  WHERE pt.user_id = ANY(p_user_ids)
    AND pt.enabled = TRUE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =====================================================
-- COMMENTS
-- =====================================================

COMMENT ON TABLE push_tokens IS 'Expo push notification tokens for each user/device combination';
COMMENT ON COLUMN push_tokens.expo_token IS 'The Expo push token (ExponentPushToken[xxx])';
COMMENT ON COLUMN push_tokens.device_id IS 'Unique device identifier for multi-device support';
COMMENT ON COLUMN push_tokens.device_name IS 'User-friendly device name (e.g., iPhone 15 Pro)';
COMMENT ON COLUMN push_tokens.platform IS 'Platform: ios or android';
COMMENT ON COLUMN push_tokens.app_version IS 'App version that registered this token';
COMMENT ON COLUMN push_tokens.enabled IS 'Whether to send push notifications to this token';
COMMENT ON COLUMN push_tokens.last_used_at IS 'Last time this token was used or updated';

COMMENT ON FUNCTION get_user_push_tokens IS 'Get all enabled push tokens for a user';
COMMENT ON FUNCTION upsert_push_token IS 'Insert or update a push token, updating last_used_at';
COMMENT ON FUNCTION disable_push_token IS 'Disable a push token (for invalid/expired tokens)';
COMMENT ON FUNCTION get_users_with_push_enabled IS 'Filter user IDs to those with enabled push tokens';

-- =====================================================
-- MIGRATION COMPLETE
-- =====================================================
