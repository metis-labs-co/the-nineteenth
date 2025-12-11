-- =====================================================
-- Notifications Schema
-- The Nineteenth - Golf Competition App
-- =====================================================
-- This migration adds in-app notifications:
-- - Notifications table for user alerts
-- - RLS policies for secure access
-- - Indexes for efficient queries
-- - Realtime enabled for instant updates
-- =====================================================

-- -----------------------------------------------------
-- Notifications Table
-- -----------------------------------------------------
-- Stores in-app notifications for users
-- Supports various notification types with flexible payload
CREATE TABLE notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Recipient (the user receiving the notification)
  user_id UUID NOT NULL REFERENCES players(id) ON DELETE CASCADE,

  -- Notification type with CHECK constraint
  type TEXT NOT NULL CHECK (type IN (
    'competition_player_added',      -- Admin added player to competition
    'competition_player_joined',     -- Player joined via invite code
    'new_round_created',             -- New round added to competition
    'competition_status_changed',    -- Competition status changed (started, completed, etc.)
    'scorecard_submitted',           -- Scorecard submitted for a round
    'friend_request_received',       -- Someone sent a friend request
    'friend_request_accepted'        -- Friend request was accepted
  )),

  -- Flexible payload for notification-specific data
  -- Examples:
  --   competition_player_added: { "added_by_name": "John", "competition_name": "Summer Series" }
  --   friend_request_received: { "requester_name": "Jane" }
  --   scorecard_submitted: { "player_name": "Mike", "round_date": "2025-01-15" }
  data JSONB NOT NULL DEFAULT '{}',

  -- Related entities (nullable - not all notifications have all relations)
  competition_id UUID REFERENCES competitions(id) ON DELETE CASCADE,
  round_id UUID REFERENCES rounds(id) ON DELETE CASCADE,
  player_id UUID REFERENCES players(id) ON DELETE CASCADE,  -- Sender/related player
  friendship_id UUID REFERENCES friendships(id) ON DELETE CASCADE,

  -- Read status
  is_read BOOLEAN NOT NULL DEFAULT FALSE,
  read_at TIMESTAMPTZ,

  -- Metadata
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- =====================================================
-- INDEXES
-- =====================================================

-- Primary lookup: get notifications for a user
CREATE INDEX idx_notifications_user ON notifications(user_id);

-- Efficient unread count and filtering
CREATE INDEX idx_notifications_user_unread ON notifications(user_id) WHERE is_read = FALSE;

-- Ordered listing (most recent first)
CREATE INDEX idx_notifications_created ON notifications(user_id, created_at DESC);

-- =====================================================
-- ROW LEVEL SECURITY (RLS) POLICIES
-- =====================================================

-- Enable RLS
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

-- Users can only view their own notifications
CREATE POLICY "Users can view own notifications"
  ON notifications FOR SELECT
  USING (auth.uid() = user_id);

-- Users can only update their own notifications (mark as read)
CREATE POLICY "Users can update own notifications"
  ON notifications FOR UPDATE
  USING (auth.uid() = user_id);

-- Users can only delete their own notifications
CREATE POLICY "Users can delete own notifications"
  ON notifications FOR DELETE
  USING (auth.uid() = user_id);

-- Service role or triggers can insert notifications for any user
-- No INSERT policy for users - notifications are created by the system
-- INSERT is allowed via service_role or triggers only

-- =====================================================
-- REALTIME
-- =====================================================

-- Enable realtime for instant notification delivery
ALTER PUBLICATION supabase_realtime ADD TABLE notifications;

-- =====================================================
-- HELPER FUNCTIONS
-- =====================================================

-- -----------------------------------------------------
-- Get Unread Notification Count
-- -----------------------------------------------------
-- Returns count of unread notifications for a user
CREATE OR REPLACE FUNCTION get_unread_notification_count(p_user_id UUID)
RETURNS INTEGER AS $$
BEGIN
  RETURN (
    SELECT COUNT(*)::INTEGER
    FROM notifications
    WHERE user_id = p_user_id
      AND is_read = FALSE
  );
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER;

-- -----------------------------------------------------
-- Mark All Notifications as Read
-- -----------------------------------------------------
-- Marks all notifications for a user as read
CREATE OR REPLACE FUNCTION mark_all_notifications_read(p_user_id UUID)
RETURNS INTEGER AS $$
DECLARE
  updated_count INTEGER;
BEGIN
  UPDATE notifications
  SET is_read = TRUE, read_at = NOW()
  WHERE user_id = p_user_id
    AND is_read = FALSE;

  GET DIAGNOSTICS updated_count = ROW_COUNT;
  RETURN updated_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- -----------------------------------------------------
-- Create Notification (Internal helper)
-- -----------------------------------------------------
-- Creates a notification for a user (used by triggers/functions)
CREATE OR REPLACE FUNCTION create_notification(
  p_user_id UUID,
  p_type TEXT,
  p_data JSONB DEFAULT '{}',
  p_competition_id UUID DEFAULT NULL,
  p_round_id UUID DEFAULT NULL,
  p_player_id UUID DEFAULT NULL,
  p_friendship_id UUID DEFAULT NULL
)
RETURNS UUID AS $$
DECLARE
  new_id UUID;
BEGIN
  INSERT INTO notifications (
    user_id,
    type,
    data,
    competition_id,
    round_id,
    player_id,
    friendship_id
  ) VALUES (
    p_user_id,
    p_type,
    p_data,
    p_competition_id,
    p_round_id,
    p_player_id,
    p_friendship_id
  )
  RETURNING id INTO new_id;

  RETURN new_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =====================================================
-- NOTIFICATION TRIGGERS
-- =====================================================

-- -----------------------------------------------------
-- Friend Request Notification Trigger
-- -----------------------------------------------------
-- Sends notification when a friend request is created
CREATE OR REPLACE FUNCTION notify_friend_request()
RETURNS TRIGGER AS $$
DECLARE
  requester_name TEXT;
BEGIN
  -- Only notify for new pending requests
  IF NEW.status = 'pending' THEN
    -- Get requester name
    SELECT name INTO requester_name
    FROM players
    WHERE id = NEW.requester_id;

    -- Create notification for the addressee
    PERFORM create_notification(
      NEW.addressee_id,
      'friend_request_received',
      jsonb_build_object('requester_name', requester_name),
      NULL,
      NULL,
      NEW.requester_id,
      NEW.id
    );
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER trigger_notify_friend_request
  AFTER INSERT ON friendships
  FOR EACH ROW EXECUTE FUNCTION notify_friend_request();

-- -----------------------------------------------------
-- Friend Request Accepted Notification Trigger
-- -----------------------------------------------------
-- Sends notification when a friend request is accepted
CREATE OR REPLACE FUNCTION notify_friend_request_accepted()
RETURNS TRIGGER AS $$
DECLARE
  accepter_name TEXT;
BEGIN
  -- Only notify when status changes to accepted
  IF OLD.status = 'pending' AND NEW.status = 'accepted' THEN
    -- Get accepter name (the addressee)
    SELECT name INTO accepter_name
    FROM players
    WHERE id = NEW.addressee_id;

    -- Create notification for the requester
    PERFORM create_notification(
      NEW.requester_id,
      'friend_request_accepted',
      jsonb_build_object('accepter_name', accepter_name),
      NULL,
      NULL,
      NEW.addressee_id,
      NEW.id
    );
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER trigger_notify_friend_request_accepted
  AFTER UPDATE ON friendships
  FOR EACH ROW EXECUTE FUNCTION notify_friend_request_accepted();

-- -----------------------------------------------------
-- Competition Player Added Notification Trigger
-- -----------------------------------------------------
-- Sends notification when a player is added to a competition
CREATE OR REPLACE FUNCTION notify_competition_player_added()
RETURNS TRIGGER AS $$
DECLARE
  comp_name TEXT;
  organizer_name TEXT;
  organizer_id UUID;
BEGIN
  -- Get competition details
  SELECT c.name, c.organizer_id, p.name
  INTO comp_name, organizer_id, organizer_name
  FROM competitions c
  JOIN players p ON p.id = c.organizer_id
  WHERE c.id = NEW.competition_id;

  -- Don't notify the organizer if they add themselves
  IF NEW.player_id != organizer_id THEN
    -- Create notification for the added player
    PERFORM create_notification(
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
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER trigger_notify_competition_player_added
  AFTER INSERT ON competition_players
  FOR EACH ROW EXECUTE FUNCTION notify_competition_player_added();

-- -----------------------------------------------------
-- New Round Created Notification Trigger
-- -----------------------------------------------------
-- Sends notification to all competition players when a new round is created
CREATE OR REPLACE FUNCTION notify_new_round_created()
RETURNS TRIGGER AS $$
DECLARE
  comp_name TEXT;
  organizer_id UUID;
  course_name TEXT;
  player_record RECORD;
BEGIN
  -- Only notify for competition rounds (not standalone)
  IF NEW.competition_id IS NOT NULL THEN
    -- Get competition and course details
    SELECT c.name, c.organizer_id, co.name
    INTO comp_name, organizer_id, course_name
    FROM competitions c
    JOIN courses co ON co.id = NEW.course_id
    WHERE c.id = NEW.competition_id;

    -- Notify all players in the competition (except organizer)
    FOR player_record IN
      SELECT player_id FROM competition_players
      WHERE competition_id = NEW.competition_id
        AND player_id != organizer_id
        AND status = 'accepted'
    LOOP
      PERFORM create_notification(
        player_record.player_id,
        'new_round_created',
        jsonb_build_object(
          'competition_name', comp_name,
          'course_name', course_name,
          'round_number', NEW.round_number,
          'date', NEW.date
        ),
        NEW.competition_id,
        NEW.id,
        organizer_id,
        NULL
      );
    END LOOP;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER trigger_notify_new_round_created
  AFTER INSERT ON rounds
  FOR EACH ROW EXECUTE FUNCTION notify_new_round_created();

-- =====================================================
-- COMMENTS
-- =====================================================

COMMENT ON TABLE notifications IS 'In-app notifications for users (friend requests, competition updates, etc.)';
COMMENT ON COLUMN notifications.type IS 'Notification type: competition_player_added, competition_player_joined, new_round_created, competition_status_changed, scorecard_submitted, friend_request_received, friend_request_accepted';
COMMENT ON COLUMN notifications.data IS 'Flexible JSONB payload with notification-specific data';
COMMENT ON COLUMN notifications.player_id IS 'Related player (sender/actor) - distinct from user_id (recipient)';
COMMENT ON FUNCTION get_unread_notification_count IS 'Get count of unread notifications for a user';
COMMENT ON FUNCTION mark_all_notifications_read IS 'Mark all notifications as read for a user';
COMMENT ON FUNCTION create_notification IS 'Internal helper to create notifications (used by triggers)';

-- =====================================================
-- MIGRATION COMPLETE
-- =====================================================
