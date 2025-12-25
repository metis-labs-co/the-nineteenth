-- =====================================================
-- Notification Triggers with Push Notification Support
-- The Nineteenth - Golf Competition App
-- =====================================================
-- This migration updates all notification triggers to call the
-- send-push-notification Edge Function via pg_net.http_post().
--
-- Architecture:
--   1. Database trigger creates notification row (existing behavior)
--   2. Trigger also calls Edge Function asynchronously via pg_net
--   3. Edge Function handles push delivery via Expo Push API
--   4. Errors are logged but don't block the trigger
--
-- Note: pg_net is enabled by default on Supabase hosted projects.
-- For local development, you may need to enable it manually.
-- =====================================================

-- -----------------------------------------------------
-- Enable pg_net Extension (if not already enabled)
-- -----------------------------------------------------
-- pg_net provides async HTTP capabilities from within PostgreSQL
-- This is enabled by default on Supabase but we ensure it here
CREATE EXTENSION IF NOT EXISTS pg_net WITH SCHEMA extensions;

-- -----------------------------------------------------
-- Helper Function: Send Push Notification
-- -----------------------------------------------------
-- Calls the Edge Function asynchronously to send push notification
-- Uses pg_net.http_post for non-blocking HTTP requests
-- Logs errors but never blocks the calling transaction
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
BEGIN
  -- Get environment variables
  -- These are set automatically in Supabase hosted environments
  v_supabase_url := current_setting('app.settings.supabase_url', true);
  v_service_role_key := current_setting('app.settings.service_role_key', true);

  -- If settings not available, try vault secrets (Supabase hosted)
  IF v_supabase_url IS NULL OR v_supabase_url = '' THEN
    SELECT decrypted_secret INTO v_supabase_url
    FROM vault.decrypted_secrets
    WHERE name = 'supabase_url'
    LIMIT 1;
  END IF;

  IF v_service_role_key IS NULL OR v_service_role_key = '' THEN
    SELECT decrypted_secret INTO v_service_role_key
    FROM vault.decrypted_secrets
    WHERE name = 'service_role_key'
    LIMIT 1;
  END IF;

  -- If still no URL, use hardcoded fallback for Supabase project
  -- This gets replaced during deployment
  IF v_supabase_url IS NULL OR v_supabase_url = '' THEN
    v_supabase_url := 'https://' || current_setting('request.headers', true)::json->>'host';
    -- Extract just the project URL from the host header if available
    -- Fallback: must be set via vault or app settings in production
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

-- Grant execute permission to authenticated users (triggers run as definer)
GRANT EXECUTE ON FUNCTION send_push_notification TO authenticated;
GRANT EXECUTE ON FUNCTION send_push_notification TO service_role;

COMMENT ON FUNCTION send_push_notification IS
  'Sends push notification via Edge Function. Uses pg_net for async HTTP. Logs errors but never blocks.';

-- =====================================================
-- UPDATE NOTIFICATION TRIGGERS
-- =====================================================

-- -----------------------------------------------------
-- 1. Friend Request Notification Trigger
-- -----------------------------------------------------
-- Fires: AFTER INSERT on friendships (when status = 'pending')
-- Notifies: The addressee (recipient of friend request)
CREATE OR REPLACE FUNCTION notify_friend_request()
RETURNS TRIGGER AS $$
DECLARE
  requester_name TEXT;
  v_notification_id UUID;
BEGIN
  -- Only notify for new pending requests
  IF NEW.status = 'pending' THEN
    -- Get requester name
    SELECT name INTO requester_name
    FROM players
    WHERE id = NEW.requester_id;

    -- Create in-app notification for the addressee
    v_notification_id := create_notification(
      NEW.addressee_id,
      'friend_request_received',
      jsonb_build_object('requester_name', requester_name),
      NULL,
      NULL,
      NEW.requester_id,
      NEW.id
    );

    -- Send push notification asynchronously
    PERFORM send_push_notification(
      NEW.addressee_id,
      'friend_request_received',
      'New Friend Request',
      requester_name || ' sent you a friend request',
      jsonb_build_object(
        'requester_name', requester_name,
        'requester_id', NEW.requester_id,
        'friendship_id', NEW.id
      )
    );
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Recreate trigger (DROP first to handle idempotency)
DROP TRIGGER IF EXISTS trigger_notify_friend_request ON friendships;
CREATE TRIGGER trigger_notify_friend_request
  AFTER INSERT ON friendships
  FOR EACH ROW EXECUTE FUNCTION notify_friend_request();

-- -----------------------------------------------------
-- 2. Friend Request Accepted Notification Trigger
-- -----------------------------------------------------
-- Fires: AFTER UPDATE on friendships (when status changes to 'accepted')
-- Notifies: The requester (person who sent the original request)
CREATE OR REPLACE FUNCTION notify_friend_request_accepted()
RETURNS TRIGGER AS $$
DECLARE
  accepter_name TEXT;
  v_notification_id UUID;
BEGIN
  -- Only notify when status changes to accepted
  IF OLD.status = 'pending' AND NEW.status = 'accepted' THEN
    -- Get accepter name (the addressee)
    SELECT name INTO accepter_name
    FROM players
    WHERE id = NEW.addressee_id;

    -- Create in-app notification for the requester
    v_notification_id := create_notification(
      NEW.requester_id,
      'friend_request_accepted',
      jsonb_build_object('accepter_name', accepter_name),
      NULL,
      NULL,
      NEW.addressee_id,
      NEW.id
    );

    -- Send push notification asynchronously
    PERFORM send_push_notification(
      NEW.requester_id,
      'friend_request_accepted',
      'Friend Request Accepted',
      accepter_name || ' accepted your friend request',
      jsonb_build_object(
        'accepter_name', accepter_name,
        'accepter_id', NEW.addressee_id,
        'friendship_id', NEW.id
      )
    );
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Recreate trigger
DROP TRIGGER IF EXISTS trigger_notify_friend_request_accepted ON friendships;
CREATE TRIGGER trigger_notify_friend_request_accepted
  AFTER UPDATE ON friendships
  FOR EACH ROW EXECUTE FUNCTION notify_friend_request_accepted();

-- -----------------------------------------------------
-- 3. Competition Player Added Notification Trigger
-- -----------------------------------------------------
-- Fires: AFTER INSERT on competition_players
-- Notifies: The player who was added (not the organizer)
CREATE OR REPLACE FUNCTION notify_competition_player_added()
RETURNS TRIGGER AS $$
DECLARE
  comp_name TEXT;
  organizer_name TEXT;
  organizer_id UUID;
  v_notification_id UUID;
BEGIN
  -- Get competition details
  SELECT c.name, c.organizer_id, p.name
  INTO comp_name, organizer_id, organizer_name
  FROM competitions c
  JOIN players p ON p.id = c.organizer_id
  WHERE c.id = NEW.competition_id;

  -- Don't notify the organizer if they add themselves
  IF NEW.player_id != organizer_id THEN
    -- Create in-app notification for the added player
    v_notification_id := create_notification(
      NEW.player_id,
      'competition_player_added',
      jsonb_build_object(
        'competition_name', comp_name,
        'added_by_name', organizer_name
      ),
      NEW.competition_id,
      NULL,
      organizer_id,
      NULL
    );

    -- Send push notification asynchronously
    PERFORM send_push_notification(
      NEW.player_id,
      'competition_player_added',
      'Added to Competition',
      'You''ve been added to ' || comp_name,
      jsonb_build_object(
        'competition_name', comp_name,
        'competition_id', NEW.competition_id,
        'added_by_name', organizer_name,
        'added_by_id', organizer_id
      )
    );
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Recreate trigger
DROP TRIGGER IF EXISTS trigger_notify_competition_player_added ON competition_players;
CREATE TRIGGER trigger_notify_competition_player_added
  AFTER INSERT ON competition_players
  FOR EACH ROW EXECUTE FUNCTION notify_competition_player_added();

-- -----------------------------------------------------
-- 4. Competition Player Joined Notification Trigger
-- -----------------------------------------------------
-- Fires: AFTER INSERT on competition_players
-- Notifies: The competition organizer (when a player joins via invite code)
CREATE OR REPLACE FUNCTION notify_competition_player_joined()
RETURNS TRIGGER AS $$
DECLARE
  v_competition_name TEXT;
  v_organizer_id UUID;
  v_player_name TEXT;
  v_notification_id UUID;
BEGIN
  -- Get competition name and organizer_id from competitions table
  SELECT c.name, c.organizer_id
  INTO v_competition_name, v_organizer_id
  FROM competitions c
  WHERE c.id = NEW.competition_id;

  -- Don't notify if the organizer is joining their own competition
  IF NEW.player_id != v_organizer_id THEN
    -- Get the joining player's name from players table
    SELECT p.name
    INTO v_player_name
    FROM players p
    WHERE p.id = NEW.player_id;

    -- Create in-app notification for the organizer
    v_notification_id := create_notification(
      v_organizer_id,                             -- p_user_id: the organizer receives notification
      'competition_player_joined',                -- p_type
      jsonb_build_object(
        'competition_name', v_competition_name,
        'player_name', v_player_name
      ),                                          -- p_data
      NEW.competition_id,                         -- p_competition_id
      NULL,                                       -- p_round_id
      NEW.player_id,                              -- p_player_id: the player who joined
      NULL                                        -- p_friendship_id
    );

    -- Send push notification asynchronously
    PERFORM send_push_notification(
      v_organizer_id,
      'competition_player_joined',
      'Player Joined',
      v_player_name || ' joined ' || v_competition_name,
      jsonb_build_object(
        'competition_name', v_competition_name,
        'competition_id', NEW.competition_id,
        'player_name', v_player_name,
        'player_id', NEW.player_id
      )
    );
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Recreate trigger
DROP TRIGGER IF EXISTS on_competition_player_joined ON competition_players;
CREATE TRIGGER on_competition_player_joined
  AFTER INSERT ON competition_players
  FOR EACH ROW
  EXECUTE FUNCTION notify_competition_player_joined();

-- -----------------------------------------------------
-- 5. New Round Created Notification Trigger
-- -----------------------------------------------------
-- Fires: AFTER INSERT on rounds
-- Notifies: All accepted competition players (except organizer)
CREATE OR REPLACE FUNCTION notify_new_round_created()
RETURNS TRIGGER AS $$
DECLARE
  v_competition_name TEXT;
  v_organizer_id UUID;
  v_course_name TEXT;
  v_venue_name TEXT;
  v_display_name TEXT;
  player_record RECORD;
  v_notification_id UUID;
BEGIN
  -- Only notify for competition rounds (not standalone rounds)
  IF NEW.competition_id IS NOT NULL THEN
    -- Step 1: Get competition name and organizer_id
    SELECT c.name, c.organizer_id
    INTO v_competition_name, v_organizer_id
    FROM competitions c
    WHERE c.id = NEW.competition_id;

    -- Step 2: Get course name (via venue for better naming)
    IF NEW.course_id IS NOT NULL THEN
      SELECT
        co.name,
        v.name
      INTO v_course_name, v_venue_name
      FROM courses co
      JOIN venues v ON v.id = co.venue_id
      WHERE co.id = NEW.course_id;

      -- Use venue name as primary display, fallback to course name
      -- If venue and course have same name, just use venue name
      -- Otherwise show "Venue - Course" format for multi-course venues
      IF v_venue_name = v_course_name OR v_course_name IS NULL THEN
        v_display_name := v_venue_name;
      ELSE
        v_display_name := v_venue_name || ' - ' || v_course_name;
      END IF;
    ELSE
      v_display_name := 'TBD';
    END IF;

    -- Step 3: Loop through all accepted competition players (except organizer)
    FOR player_record IN
      SELECT cp.player_id
      FROM competition_players cp
      WHERE cp.competition_id = NEW.competition_id
        AND cp.status = 'accepted'
        AND cp.player_id != v_organizer_id
    LOOP
      -- Step 4: Create in-app notification for each player
      v_notification_id := create_notification(
        player_record.player_id,               -- p_user_id: player receiving notification
        'new_round_created',                   -- p_type
        jsonb_build_object(
          'competition_name', v_competition_name,
          'course_name', v_display_name,
          'round_number', NEW.round_number,
          'date', NEW.date
        ),                                     -- p_data
        NEW.competition_id,                    -- p_competition_id
        NEW.id,                                -- p_round_id
        v_organizer_id,                        -- p_player_id: the organizer who created the round
        NULL                                   -- p_friendship_id
      );

      -- Step 5: Send push notification asynchronously
      PERFORM send_push_notification(
        player_record.player_id,
        'new_round_created',
        'New Round Added',
        'Round ' || COALESCE(NEW.round_number::TEXT, '') || ' added to ' || v_competition_name,
        jsonb_build_object(
          'competition_name', v_competition_name,
          'competition_id', NEW.competition_id,
          'course_name', v_display_name,
          'round_id', NEW.id,
          'round_number', NEW.round_number,
          'date', NEW.date
        )
      );
    END LOOP;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Recreate trigger
DROP TRIGGER IF EXISTS on_round_created ON rounds;
CREATE TRIGGER on_round_created
  AFTER INSERT ON rounds
  FOR EACH ROW
  EXECUTE FUNCTION notify_new_round_created();

-- -----------------------------------------------------
-- 6. Scorecard Submitted Notification Trigger
-- -----------------------------------------------------
-- Fires: AFTER UPDATE on scorecards (when status changes to 'completed')
-- Notifies: The competition organizer
CREATE OR REPLACE FUNCTION notify_scorecard_submitted()
RETURNS TRIGGER AS $$
DECLARE
  v_competition_id UUID;
  v_competition_name TEXT;
  v_organizer_id UUID;
  v_round_number INTEGER;
  v_player_name TEXT;
  v_notification_id UUID;
BEGIN
  -- The trigger WHEN clause handles OLD.status != 'completed' AND NEW.status = 'completed'

  -- Step 1: Get round and competition info via JOIN
  SELECT
    c.id,
    c.name,
    c.organizer_id,
    r.round_number
  INTO
    v_competition_id,
    v_competition_name,
    v_organizer_id,
    v_round_number
  FROM rounds r
  JOIN competitions c ON c.id = r.competition_id
  WHERE r.id = NEW.round_id;

  -- If this is a standalone round (no competition), exit early
  IF v_competition_id IS NULL THEN
    RETURN NEW;
  END IF;

  -- Step 2: Get player name who submitted the scorecard
  SELECT p.name
  INTO v_player_name
  FROM players p
  WHERE p.id = NEW.player_id;

  -- Step 3: Only notify if the player is not the organizer
  IF NEW.player_id != v_organizer_id THEN
    -- Create in-app notification for the organizer
    v_notification_id := create_notification(
      v_organizer_id,                           -- p_user_id: organizer receives notification
      'scorecard_submitted',                    -- p_type
      jsonb_build_object(
        'competition_name', v_competition_name,
        'player_name', v_player_name,
        'round_number', v_round_number
      ),                                        -- p_data
      v_competition_id,                         -- p_competition_id
      NEW.round_id,                             -- p_round_id
      NEW.player_id,                            -- p_player_id: the player who submitted
      NULL                                      -- p_friendship_id
    );

    -- Send push notification asynchronously
    PERFORM send_push_notification(
      v_organizer_id,
      'scorecard_submitted',
      'Scorecard Submitted',
      v_player_name || ' submitted their scorecard for Round ' || COALESCE(v_round_number::TEXT, ''),
      jsonb_build_object(
        'competition_name', v_competition_name,
        'competition_id', v_competition_id,
        'player_name', v_player_name,
        'player_id', NEW.player_id,
        'round_id', NEW.round_id,
        'round_number', v_round_number
      )
    );
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Recreate trigger
DROP TRIGGER IF EXISTS on_scorecard_submitted ON scorecards;
CREATE TRIGGER on_scorecard_submitted
  AFTER UPDATE ON scorecards
  FOR EACH ROW
  WHEN (OLD.status IS DISTINCT FROM 'completed' AND NEW.status = 'completed')
  EXECUTE FUNCTION notify_scorecard_submitted();

-- -----------------------------------------------------
-- 7. Competition Status Changed Notification Trigger
-- -----------------------------------------------------
-- Fires: AFTER UPDATE on competitions (when status changes)
-- Notifies: All accepted competition players
CREATE OR REPLACE FUNCTION notify_competition_status_changed()
RETURNS TRIGGER AS $$
DECLARE
  player_record RECORD;
  v_notification_id UUID;
  v_status_display TEXT;
BEGIN
  -- Format status for display
  v_status_display := CASE NEW.status
    WHEN 'draft' THEN 'Draft'
    WHEN 'active' THEN 'Active'
    WHEN 'completed' THEN 'Completed'
    WHEN 'cancelled' THEN 'Cancelled'
    ELSE NEW.status
  END;

  -- Loop through all accepted players in the competition
  FOR player_record IN
    SELECT cp.player_id
    FROM competition_players cp
    WHERE cp.competition_id = NEW.id
      AND cp.status = 'accepted'
  LOOP
    -- Create in-app notification for each player
    v_notification_id := create_notification(
      player_record.player_id,                    -- p_user_id: player receiving notification
      'competition_status_changed',               -- p_type
      jsonb_build_object(
        'competition_name', NEW.name,
        'old_status', OLD.status,
        'new_status', NEW.status
      ),                                          -- p_data
      NEW.id,                                     -- p_competition_id
      NULL,                                       -- p_round_id
      NEW.organizer_id,                           -- p_player_id: the organizer who changed status
      NULL                                        -- p_friendship_id
    );

    -- Send push notification asynchronously
    PERFORM send_push_notification(
      player_record.player_id,
      'competition_status_changed',
      'Competition Update',
      NEW.name || ' is now ' || v_status_display,
      jsonb_build_object(
        'competition_name', NEW.name,
        'competition_id', NEW.id,
        'old_status', OLD.status,
        'new_status', NEW.status
      )
    );
  END LOOP;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Recreate trigger
DROP TRIGGER IF EXISTS on_competition_status_changed ON competitions;
CREATE TRIGGER on_competition_status_changed
  AFTER UPDATE ON competitions
  FOR EACH ROW
  WHEN (OLD.status IS DISTINCT FROM NEW.status)
  EXECUTE FUNCTION notify_competition_status_changed();

-- =====================================================
-- VAULT SECRETS SETUP (for local development)
-- =====================================================
-- In production (Supabase hosted), these are automatically available.
-- For local development, you'll need to set these via:
--
-- INSERT INTO vault.secrets (name, secret)
-- VALUES
--   ('supabase_url', 'http://localhost:54321'),
--   ('service_role_key', 'your-service-role-key');
--
-- Or via psql:
-- SELECT vault.create_secret('supabase_url', 'http://localhost:54321');
-- SELECT vault.create_secret('service_role_key', 'your-service-role-key');

-- =====================================================
-- COMMENTS
-- =====================================================
COMMENT ON FUNCTION notify_friend_request IS
  'Creates in-app notification and sends push when a friend request is received.';

COMMENT ON FUNCTION notify_friend_request_accepted IS
  'Creates in-app notification and sends push when a friend request is accepted.';

COMMENT ON FUNCTION notify_competition_player_added IS
  'Creates in-app notification and sends push when a player is added to a competition.';

COMMENT ON FUNCTION notify_competition_player_joined IS
  'Creates in-app notification and sends push when a player joins via invite code.';

COMMENT ON FUNCTION notify_new_round_created IS
  'Creates in-app notifications and sends push to all competition players when a round is created.';

COMMENT ON FUNCTION notify_scorecard_submitted IS
  'Creates in-app notification and sends push to organizer when a scorecard is submitted.';

COMMENT ON FUNCTION notify_competition_status_changed IS
  'Creates in-app notifications and sends push to all players when competition status changes.';

-- =====================================================
-- MIGRATION COMPLETE
-- =====================================================
