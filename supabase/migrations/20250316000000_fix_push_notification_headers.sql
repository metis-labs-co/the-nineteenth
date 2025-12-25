-- =====================================================
-- Fix Push Notification Headers Bug
-- The Nineteenth - Golf Competition App
-- =====================================================
-- This migration fixes an issue where the send_push_notification
-- function fails with "operator does not exist: text ->> unknown"
-- when trying to parse request.headers in a trigger context.
--
-- The issue: In trigger context (not HTTP request), current_setting
-- for request.headers may not return valid JSON, causing the cast
-- and JSON extraction to fail.
--
-- The fix: Safely handle the request.headers fallback with proper
-- error handling and NULL checks.
-- =====================================================

-- Drop and recreate the function with fixed logic
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
  -- Get environment variables
  -- These are set automatically in Supabase hosted environments
  v_supabase_url := current_setting('app.settings.supabase_url', true);
  v_service_role_key := current_setting('app.settings.service_role_key', true);

  -- If settings not available, try vault secrets (Supabase hosted)
  IF v_supabase_url IS NULL OR v_supabase_url = '' THEN
    BEGIN
      SELECT decrypted_secret INTO v_supabase_url
      FROM vault.decrypted_secrets
      WHERE name = 'supabase_url'
      LIMIT 1;
    EXCEPTION WHEN OTHERS THEN
      -- Vault might not be accessible, continue
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
      -- Vault might not be accessible, continue
      NULL;
    END;
  END IF;

  -- If still no URL, try to get from request headers (only works during HTTP requests)
  -- Wrapped in exception handler to catch JSON parse errors
  IF v_supabase_url IS NULL OR v_supabase_url = '' THEN
    BEGIN
      v_headers_text := current_setting('request.headers', true);
      IF v_headers_text IS NOT NULL AND v_headers_text != '' AND v_headers_text LIKE '{%' THEN
        -- Only attempt JSON parsing if it looks like JSON
        v_supabase_url := 'https://' || (v_headers_text::json->>'host');
      END IF;
    EXCEPTION WHEN OTHERS THEN
      -- Failed to parse headers, skip this fallback
      RAISE WARNING 'send_push_notification: Failed to parse request.headers: %', SQLERRM;
    END;
  END IF;

  -- Build Edge Function URL
  v_edge_function_url := COALESCE(v_supabase_url, '') || '/functions/v1/send-push-notification';

  -- Build request body
  v_request_body := jsonb_build_object(
    'user_id', p_user_id::TEXT,
    'notification_type', p_notification_type,
    'title', p_title,
    'body', p_body,
    'data', p_data
  );

  -- Skip if we don't have the required config
  IF v_supabase_url IS NULL OR v_supabase_url = '' THEN
    RAISE WARNING 'send_push_notification: supabase_url not configured, skipping push';
    RETURN;
  END IF;

  IF v_service_role_key IS NULL OR v_service_role_key = '' THEN
    RAISE WARNING 'send_push_notification: service_role_key not configured, skipping push';
    RETURN;
  END IF;

  -- Make async HTTP POST request to Edge Function
  -- pg_net.http_post returns immediately, the request runs in background
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
    -- Log error but don't block the transaction
    RAISE WARNING 'send_push_notification failed: % - %', SQLSTATE, SQLERRM;
  END;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Re-grant permissions
GRANT EXECUTE ON FUNCTION send_push_notification TO authenticated;
GRANT EXECUTE ON FUNCTION send_push_notification TO service_role;

COMMENT ON FUNCTION send_push_notification IS
  'Sends push notification via Edge Function. Uses pg_net for async HTTP. Logs errors but never blocks.';

-- =====================================================
-- MIGRATION COMPLETE
-- =====================================================
