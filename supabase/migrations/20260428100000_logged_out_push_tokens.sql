-- =====================================================
-- Logged-Out Push Tokens
-- The Nineteenth - Golf Competition App
-- =====================================================
-- Enables push notification delivery to devices whose user has
-- logged out by:
-- - Decoupling push_tokens.user_id from the device (now nullable)
-- - Recording the prior user (last_user_id) for re-engagement /
--   invite matching after logout
-- - Letting each device opt in to specific logged-out push classes
--   via device_push_intent
-- - Adding RPCs to detach a token, query devices by intent or by
--   email, and let users update their own intent settings
--
-- Existing dispatch paths (get_user_push_tokens, should_send_push,
-- disable_push_token, every notification trigger) are unchanged.
-- This migration ships as a dormant change until client + Edge
-- Function changes wire up the new dispatch classes in a follow-up.
-- =====================================================

-- =====================================================
-- DEDUPLICATE: collapse duplicate (user_id, expo_token) rows
-- =====================================================
-- UNIQUE(expo_token) cannot be added while duplicate rows exist.
-- Historically (UNIQUE(user_id, expo_token)) two users could share
-- one expo_token by sequentially signing in on the same device.
-- For each duplicated expo_token, keep the most-recently-used row
-- (last_used_at, then updated_at, then created_at) and drop the
-- rest. The "winner" represents the device's current state; the
-- other rows are historical artefacts of the old per-user model.

DELETE FROM push_tokens
WHERE id IN (
  SELECT id FROM (
    SELECT id,
           ROW_NUMBER() OVER (
             PARTITION BY expo_token
             ORDER BY last_used_at DESC NULLS LAST,
                      updated_at DESC,
                      created_at DESC
           ) AS rn
    FROM push_tokens
  ) ranked
  WHERE rn > 1
);

-- Safety net: if anything still slipped through (concurrent insert
-- during migration, etc.), fail loudly rather than corrupt state.
DO $$
DECLARE
  v_dup_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO v_dup_count
  FROM (
    SELECT 1
    FROM push_tokens
    GROUP BY expo_token
    HAVING COUNT(*) > 1
  ) dups;

  IF v_dup_count > 0 THEN
    RAISE EXCEPTION 'push_tokens still has % expo_token(s) with duplicate rows after dedup; aborting before UNIQUE(expo_token)', v_dup_count;
  END IF;
END $$;

-- =====================================================
-- SCHEMA: nullable user_id, last_user_id, device_push_intent
-- =====================================================

ALTER TABLE push_tokens
  ALTER COLUMN user_id DROP NOT NULL,
  ADD COLUMN last_user_id UUID REFERENCES players(id) ON DELETE SET NULL,
  ADD COLUMN device_push_intent TEXT[] NOT NULL
    DEFAULT ARRAY['re_engagement','pre_signup_invite']::TEXT[];

COMMENT ON COLUMN push_tokens.user_id IS 'Currently signed-in user on this device, or NULL when the device is logged out';
COMMENT ON COLUMN push_tokens.last_user_id IS 'Most recent user signed in on this device; preserved across logout for prior-user dispatch and invite email matching';
COMMENT ON COLUMN push_tokens.device_push_intent IS 'Logged-out push classes this device opts into. Subset of: re_engagement, pre_signup_invite, prior_user. prior_user is opt-in due to privacy risk.';

-- Backfill last_user_id for existing rows so re-engagement and
-- invite dispatch can target devices that have already registered.
UPDATE push_tokens
SET last_user_id = user_id
WHERE last_user_id IS NULL AND user_id IS NOT NULL;

-- =====================================================
-- CONSTRAINT + INDEX SWAP
-- =====================================================

ALTER TABLE push_tokens
  DROP CONSTRAINT push_tokens_user_token_unique;

ALTER TABLE push_tokens
  ADD CONSTRAINT push_tokens_expo_token_unique UNIQUE (expo_token);

DROP INDEX IF EXISTS idx_push_tokens_user;
CREATE INDEX idx_push_tokens_user
  ON push_tokens(user_id)
  WHERE user_id IS NOT NULL;

CREATE INDEX idx_push_tokens_last_user
  ON push_tokens(last_user_id)
  WHERE last_user_id IS NOT NULL;

-- =====================================================
-- RLS: extend self-management to detached rows
-- =====================================================
-- A user who logged out should still be able to read/manage their
-- detached row (user_id IS NULL but last_user_id matches). Service
-- role policy is unchanged.

DROP POLICY "Users can manage their own push tokens" ON push_tokens;

CREATE POLICY "Users can manage their own push tokens"
  ON push_tokens FOR ALL
  USING (
    user_id = auth.uid()
    OR (user_id IS NULL AND last_user_id = auth.uid())
  )
  WITH CHECK (
    user_id = auth.uid()
    OR (user_id IS NULL AND last_user_id = auth.uid())
  );

-- =====================================================
-- FUNCTION: upsert_push_token (rewritten)
-- =====================================================
-- Same parameter list as before, so client callers are unaffected.
-- ON CONFLICT now keys on expo_token alone: one row per device,
-- user_id swaps to whoever just signed in, last_user_id tracks the
-- prior user for logged-out dispatch.

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
    last_user_id,
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
    p_user_id,
    p_token,
    p_device_id,
    p_device_name,
    p_platform,
    p_app_version,
    TRUE,
    NOW()
  )
  ON CONFLICT (expo_token)
  DO UPDATE SET
    user_id = p_user_id,
    last_user_id = p_user_id,
    device_id = COALESCE(EXCLUDED.device_id, push_tokens.device_id),
    device_name = COALESCE(EXCLUDED.device_name, push_tokens.device_name),
    platform = COALESCE(EXCLUDED.platform, push_tokens.platform),
    app_version = COALESCE(EXCLUDED.app_version, push_tokens.app_version),
    enabled = TRUE,
    last_used_at = NOW(),
    updated_at = NOW()
  RETURNING id INTO v_token_id;

  RETURN v_token_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION upsert_push_token IS 'Insert or update a push token. One row per expo_token; user_id holds the signed-in user, last_user_id is preserved for logged-out dispatch.';

-- =====================================================
-- FUNCTION: detach_push_token
-- =====================================================
-- Replaces disable_push_token in the logout flow. Keeps the row
-- and enabled = TRUE so the device can still receive opted-in
-- logged-out pushes; clears user_id so user-targeted dispatch
-- naturally skips it.

CREATE OR REPLACE FUNCTION detach_push_token(p_token TEXT)
RETURNS BOOLEAN AS $$
BEGIN
  UPDATE push_tokens
  SET
    last_user_id = COALESCE(user_id, last_user_id),
    user_id = NULL,
    updated_at = NOW()
  WHERE expo_token = p_token;

  RETURN FOUND;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION detach_push_token IS 'Detach a push token from its current user on logout, preserving last_user_id for re-engagement and invite dispatch.';

-- =====================================================
-- FUNCTION: get_device_tokens_by_intent
-- =====================================================
-- Returns enabled, currently-detached tokens whose device opts in
-- to the given intent. Used for re_engagement broadcast dispatch
-- from Edge Functions.

CREATE OR REPLACE FUNCTION get_device_tokens_by_intent(p_intent TEXT)
RETURNS TABLE (
  expo_token TEXT,
  platform TEXT,
  last_user_id UUID
) AS $$
BEGIN
  RETURN QUERY
  SELECT pt.expo_token, pt.platform, pt.last_user_id
  FROM push_tokens pt
  WHERE pt.user_id IS NULL
    AND pt.enabled = TRUE
    AND p_intent = ANY(pt.device_push_intent);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION get_device_tokens_by_intent IS 'List enabled, logged-out push tokens that opt in to the given device-broadcast intent.';

-- =====================================================
-- FUNCTION: get_last_user_tokens
-- =====================================================
-- Used for prior-user pushes after logout. Returns enabled,
-- detached tokens whose last_user_id matches and which opt in to
-- 'prior_user'. Enforces a 14-day grace window so stale
-- detachments don't keep receiving the prior user's notifications
-- indefinitely.

CREATE OR REPLACE FUNCTION get_last_user_tokens(p_last_user_id UUID)
RETURNS TABLE (
  expo_token TEXT,
  platform TEXT
) AS $$
BEGIN
  RETURN QUERY
  SELECT pt.expo_token, pt.platform
  FROM push_tokens pt
  WHERE pt.user_id IS NULL
    AND pt.last_user_id = p_last_user_id
    AND pt.enabled = TRUE
    AND 'prior_user' = ANY(pt.device_push_intent)
    AND pt.updated_at > NOW() - INTERVAL '14 days';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION get_last_user_tokens IS 'List logged-out tokens that opt in to prior-user pushes, within a 14-day grace window from logout.';

-- =====================================================
-- FUNCTION: get_tokens_for_email
-- =====================================================
-- Used for pre-signup invitation pushes. Resolves an email to
-- detached tokens via the prior user on each device. Match is
-- case-insensitive against players.email (UNIQUE NOT NULL).

CREATE OR REPLACE FUNCTION get_tokens_for_email(p_email TEXT)
RETURNS TABLE (
  expo_token TEXT,
  platform TEXT,
  last_user_id UUID
) AS $$
BEGIN
  RETURN QUERY
  SELECT pt.expo_token, pt.platform, pt.last_user_id
  FROM push_tokens pt
  JOIN players p ON p.id = pt.last_user_id
  WHERE pt.user_id IS NULL
    AND pt.enabled = TRUE
    AND 'pre_signup_invite' = ANY(pt.device_push_intent)
    AND LOWER(p.email) = LOWER(p_email);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION get_tokens_for_email IS 'Resolve an email to detached push tokens via the prior user on each device, for pre-signup invitation dispatch.';

-- =====================================================
-- FUNCTION: update_device_push_intent
-- =====================================================
-- Called from the Settings UI to opt a device in/out of specific
-- logged-out push classes. Caller must own the row (either
-- currently signed in on it, or the prior user of a detached row).

CREATE OR REPLACE FUNCTION update_device_push_intent(
  p_token TEXT,
  p_intents TEXT[]
)
RETURNS BOOLEAN AS $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM unnest(p_intents) AS intent
    WHERE intent NOT IN ('re_engagement', 'pre_signup_invite', 'prior_user')
  ) THEN
    RAISE EXCEPTION 'Invalid device_push_intent value; allowed: re_engagement, pre_signup_invite, prior_user';
  END IF;

  UPDATE push_tokens
  SET device_push_intent = p_intents,
      updated_at = NOW()
  WHERE expo_token = p_token
    AND (
      user_id = auth.uid()
      OR (user_id IS NULL AND last_user_id = auth.uid())
    );

  RETURN FOUND;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION update_device_push_intent IS 'Update which logged-out push classes a device opts into. Caller must own the token row.';

-- =====================================================
-- MIGRATION COMPLETE
-- =====================================================
