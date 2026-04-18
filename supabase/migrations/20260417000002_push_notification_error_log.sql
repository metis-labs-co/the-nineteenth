-- =====================================================
-- Push Notification Error Log
-- The Nineteenth - Golf Competition App
-- =====================================================
-- send_push_notification() previously failed silently via RAISE WARNING
-- when supabase_url / service_role_key were not configured, or when
-- net.http_post threw. That made trigger-driven pushes invisible to
-- debug without Dashboard log access. This migration:
--
--   1. Adds a push_notification_errors table for persistent failure logs
--   2. Rewrites send_push_notification() so every early-return / exception
--      also writes a row to that table (in addition to RAISE WARNING).
--
-- No behavioural change on the happy path. Triggers still call
-- send_push_notification() the same way.
-- =====================================================

-- 1. Error log table
CREATE TABLE IF NOT EXISTS push_notification_errors (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  user_id UUID,
  notification_type TEXT,
  reason TEXT NOT NULL,
  sqlstate TEXT,
  sqlerrm TEXT
);

CREATE INDEX IF NOT EXISTS idx_push_notification_errors_created_at
  ON push_notification_errors (created_at DESC);

CREATE INDEX IF NOT EXISTS idx_push_notification_errors_user
  ON push_notification_errors (user_id, created_at DESC);

ALTER TABLE push_notification_errors ENABLE ROW LEVEL SECURITY;

-- Only service_role can read (this is an operational log, not user-facing)
DROP POLICY IF EXISTS push_notification_errors_service_read ON push_notification_errors;
CREATE POLICY push_notification_errors_service_read
  ON push_notification_errors
  FOR SELECT
  TO service_role
  USING (TRUE);

COMMENT ON TABLE push_notification_errors IS
  'Operational log of failures inside send_push_notification(). Populated when config is missing or net.http_post throws.';

-- 2. Rewrite send_push_notification() with persistent error logging
CREATE OR REPLACE FUNCTION send_push_notification(
  p_user_id UUID,
  p_notification_type TEXT,
  p_title TEXT,
  p_body TEXT,
  p_data JSONB DEFAULT '{}'
)
RETURNS void AS $$
DECLARE
  v_supabase_url TEXT;
  v_service_role_key TEXT;
  v_edge_function_url TEXT;
  v_request_body JSONB;
  v_headers_text TEXT;
BEGIN
  v_supabase_url := current_setting('app.settings.supabase_url', true);
  v_service_role_key := current_setting('app.settings.service_role_key', true);

  IF v_supabase_url IS NULL OR v_supabase_url = '' THEN
    BEGIN
      SELECT decrypted_secret INTO v_supabase_url
      FROM vault.decrypted_secrets
      WHERE name = 'supabase_url'
      LIMIT 1;
    EXCEPTION WHEN OTHERS THEN
      NULL;
    END;
  END IF;

  IF v_service_role_key IS NULL OR v_service_role_key = '' THEN
    BEGIN
      SELECT decrypted_secret INTO v_service_role_key
      FROM vault.decrypted_secrets
      WHERE name = 'service_role_key'
      LIMIT 1;
    EXCEPTION WHEN OTHERS THEN
      NULL;
    END;
  END IF;

  IF v_supabase_url IS NULL OR v_supabase_url = '' THEN
    BEGIN
      v_headers_text := current_setting('request.headers', true);
      IF v_headers_text IS NOT NULL AND v_headers_text != '' AND v_headers_text LIKE '{%' THEN
        v_supabase_url := 'https://' || (v_headers_text::json->>'host');
      END IF;
    EXCEPTION WHEN OTHERS THEN
      RAISE WARNING 'send_push_notification: Failed to parse request.headers: %', SQLERRM;
    END;
  END IF;

  IF v_supabase_url IS NULL OR v_supabase_url = '' THEN
    RAISE WARNING 'send_push_notification: supabase_url not configured, skipping push';
    INSERT INTO push_notification_errors (user_id, notification_type, reason)
    VALUES (p_user_id, p_notification_type, 'supabase_url_not_configured');
    RETURN;
  END IF;

  IF v_service_role_key IS NULL OR v_service_role_key = '' THEN
    RAISE WARNING 'send_push_notification: service_role_key not configured, skipping push';
    INSERT INTO push_notification_errors (user_id, notification_type, reason)
    VALUES (p_user_id, p_notification_type, 'service_role_key_not_configured');
    RETURN;
  END IF;

  -- Deployed edge function name is 'test-notification' (renamed on Supabase).
  -- Keep this in sync if the function is ever redeployed under a new slug.
  v_edge_function_url := v_supabase_url || '/functions/v1/test-notification';

  v_request_body := jsonb_build_object(
    'user_id', p_user_id::TEXT,
    'notification_type', p_notification_type,
    'title', p_title,
    'body', p_body,
    'data', p_data
  );

  BEGIN
    PERFORM net.http_post(
      url := v_edge_function_url,
      headers := jsonb_build_object(
        'Content-Type', 'application/json',
        'Authorization', 'Bearer ' || v_service_role_key
      ),
      body := v_request_body,
      timeout_milliseconds := 5000
    );
  EXCEPTION WHEN OTHERS THEN
    RAISE WARNING 'send_push_notification failed: % - %', SQLSTATE, SQLERRM;
    INSERT INTO push_notification_errors (user_id, notification_type, reason, sqlstate, sqlerrm)
    VALUES (p_user_id, p_notification_type, 'http_post_exception', SQLSTATE, SQLERRM);
  END;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION send_push_notification TO authenticated;
GRANT EXECUTE ON FUNCTION send_push_notification TO service_role;

COMMENT ON FUNCTION send_push_notification IS
  'Sends push notification via Edge Function using pg_net. Logs failures to push_notification_errors and never blocks the caller transaction.';

-- =====================================================
-- MIGRATION COMPLETE
-- =====================================================
