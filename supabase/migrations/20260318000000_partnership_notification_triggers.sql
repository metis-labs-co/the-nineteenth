-- =====================================================
-- Partnership Notification Triggers
-- The Nineteenth - Golf Competition App
-- =====================================================
-- This migration adds:
-- 1. New notification types for partnership events
-- 2. Updated should_send_push() mapping
-- 3. Trigger: notify_partnership_created (AFTER INSERT on league_partnerships)
-- 4. Trigger: notify_partnership_round_tagged (AFTER INSERT on partnership_rounds)
-- =====================================================

-- =====================================================
-- 1. UPDATE notifications TYPE CHECK CONSTRAINT
-- =====================================================

ALTER TABLE notifications DROP CONSTRAINT IF EXISTS notifications_type_check;
ALTER TABLE notifications ADD CONSTRAINT notifications_type_check CHECK (type IN (
  -- Existing types
  'competition_player_added',
  'competition_player_joined',
  'new_round_created',
  'competition_status_changed',
  'scorecard_submitted',
  'friend_request_received',
  'friend_request_accepted',
  'social_round_invitation',
  -- League types
  'league_player_joined',
  'league_player_left',
  'league_player_removed',
  'league_round_tagged',
  'league_leaderboard_changed',
  'round_completed',
  -- Partnership types
  'partnership_created',
  'partnership_round_tagged'
));

-- =====================================================
-- 2. UPDATE should_send_push() WITH PARTNERSHIP MAPPING
-- =====================================================

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
      -- Competition-related notifications
      WHEN p_notification_type IN (
        'competition_player_added',
        'competition_player_joined',
        'new_round_created',
        'competition_status_changed',
        'round_completed'
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

      -- League-related notifications (includes partnership events)
      WHEN p_notification_type IN (
        'league_player_joined',
        'league_player_left',
        'league_player_removed',
        'league_round_tagged',
        'league_leaderboard_changed',
        'partnership_created',
        'partnership_round_tagged'
      ) THEN up.push_league_updates

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
-- TRIGGER 1: notify_partnership_created
-- AFTER INSERT on league_partnerships
-- Notifies the other partner (the one who didn't initiate)
-- =====================================================

CREATE OR REPLACE FUNCTION notify_partnership_created()
RETURNS TRIGGER AS $$
DECLARE
  v_league_name TEXT;
  v_initiator_id UUID;
  v_other_id UUID;
  v_initiator_name TEXT;
  v_notification_id UUID;
BEGIN
  -- Get league name
  SELECT l.name INTO v_league_name
  FROM leagues l
  WHERE l.id = NEW.league_id;

  -- Determine who initiated: the current authenticated user
  v_initiator_id := auth.uid();

  -- Determine the other partner
  IF v_initiator_id = NEW.player_1_id THEN
    v_other_id := NEW.player_2_id;
  ELSE
    v_other_id := NEW.player_1_id;
  END IF;

  -- Get initiator name
  SELECT p.name INTO v_initiator_name
  FROM players p
  WHERE p.id = v_initiator_id;

  -- Create in-app notification for the other partner
  v_notification_id := create_notification(
    v_other_id,
    'partnership_created',
    jsonb_build_object(
      'league_name', v_league_name,
      'partner_name', v_initiator_name,
      'partnership_name', NEW.name
    ),
    NULL,                -- p_competition_id
    NULL,                -- p_round_id
    v_initiator_id,      -- p_player_id
    NULL,                -- p_friendship_id
    NEW.league_id        -- p_league_id
  );

  -- Send push notification
  PERFORM send_push_notification(
    v_other_id,
    'partnership_created',
    'Partnership Created',
    v_initiator_name || ' created a partnership with you in ' || v_league_name,
    jsonb_build_object(
      'league_name', v_league_name,
      'league_id', NEW.league_id,
      'partner_name', v_initiator_name,
      'partnership_id', NEW.id
    )
  );

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trigger_notify_partnership_created ON league_partnerships;
CREATE TRIGGER trigger_notify_partnership_created
  AFTER INSERT ON league_partnerships
  FOR EACH ROW EXECUTE FUNCTION notify_partnership_created();

-- =====================================================
-- TRIGGER 2: notify_partnership_round_tagged
-- AFTER INSERT on partnership_rounds
-- Notifies the other partner (the one who didn't tag)
-- =====================================================

CREATE OR REPLACE FUNCTION notify_partnership_round_tagged()
RETURNS TRIGGER AS $$
DECLARE
  v_league_name TEXT;
  v_tagger_id UUID;
  v_other_id UUID;
  v_tagger_name TEXT;
  v_partnership_name TEXT;
  v_diff_text TEXT;
  v_notification_id UUID;
BEGIN
  -- Get league name
  SELECT l.name INTO v_league_name
  FROM leagues l
  WHERE l.id = NEW.league_id;

  -- The tagger is the current authenticated user
  v_tagger_id := auth.uid();

  -- Get partnership name and determine the other partner
  SELECT lp.name,
    CASE WHEN v_tagger_id = lp.player_1_id THEN lp.player_2_id ELSE lp.player_1_id END
  INTO v_partnership_name, v_other_id
  FROM league_partnerships lp
  WHERE lp.id = NEW.partnership_id;

  -- Get tagger name
  SELECT p.name INTO v_tagger_name
  FROM players p
  WHERE p.id = v_tagger_id;

  -- Format differential for display
  v_diff_text := NEW.target_differential::TEXT;

  -- Create in-app notification for the other partner
  v_notification_id := create_notification(
    v_other_id,
    'partnership_round_tagged',
    jsonb_build_object(
      'league_name', v_league_name,
      'player_name', v_tagger_name,
      'partnership_name', v_partnership_name,
      'course_name', NEW.course_name,
      'target_differential', v_diff_text
    ),
    NULL,                -- p_competition_id
    NULL,                -- p_round_id
    v_tagger_id,         -- p_player_id
    NULL,                -- p_friendship_id
    NEW.league_id        -- p_league_id
  );

  -- Send push notification
  PERFORM send_push_notification(
    v_other_id,
    'partnership_round_tagged',
    'Partnership Round Tagged',
    v_tagger_name || ' tagged a round to ' || v_league_name || ' (' || v_diff_text || ')',
    jsonb_build_object(
      'league_name', v_league_name,
      'league_id', NEW.league_id,
      'player_name', v_tagger_name,
      'partnership_id', NEW.partnership_id,
      'course_name', NEW.course_name,
      'target_differential', v_diff_text
    )
  );

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trigger_notify_partnership_round_tagged ON partnership_rounds;
CREATE TRIGGER trigger_notify_partnership_round_tagged
  AFTER INSERT ON partnership_rounds
  FOR EACH ROW EXECUTE FUNCTION notify_partnership_round_tagged();

-- =====================================================
-- COMMENTS
-- =====================================================

COMMENT ON FUNCTION notify_partnership_created IS
  'Creates in-app notification and sends push when a partnership is formed, notifying the other partner.';

COMMENT ON FUNCTION notify_partnership_round_tagged IS
  'Creates in-app notification and sends push when a round is tagged to a partnership, notifying the other partner.';

-- =====================================================
-- MIGRATION COMPLETE
-- =====================================================
