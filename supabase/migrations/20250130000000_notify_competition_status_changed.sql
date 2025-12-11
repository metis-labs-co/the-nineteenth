-- =====================================================
-- Competition Status Changed Notification Trigger
-- The Nineteenth - Golf Competition App
-- =====================================================
-- This migration creates a trigger to notify all competition players
-- when the competition status changes (e.g., draft → active → completed).
--
-- Fires: AFTER UPDATE on competitions
-- Condition: OLD.status IS DISTINCT FROM NEW.status
-- Logic:
--   1. Loop through all competition_players with status = 'accepted'
--   2. Create notification for each player with type 'competition_status_changed'
--   3. Include competition_name, old_status, new_status in data payload
-- =====================================================

-- -----------------------------------------------------
-- Competition Status Changed Notification Trigger Function
-- -----------------------------------------------------
-- Sends notification to all accepted competition players when
-- the competition status changes
CREATE OR REPLACE FUNCTION notify_competition_status_changed()
RETURNS TRIGGER AS $$
DECLARE
  player_record RECORD;
BEGIN
  -- Loop through all accepted players in the competition
  FOR player_record IN
    SELECT cp.player_id
    FROM competition_players cp
    WHERE cp.competition_id = NEW.id
      AND cp.status = 'accepted'
  LOOP
    -- Create notification for each player
    PERFORM create_notification(
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
  END LOOP;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- -----------------------------------------------------
-- Create Trigger with WHEN Clause
-- -----------------------------------------------------
-- Fires AFTER UPDATE on competitions
-- Only when status actually changes (handles NULL safely)
CREATE TRIGGER on_competition_status_changed
  AFTER UPDATE ON competitions
  FOR EACH ROW
  WHEN (OLD.status IS DISTINCT FROM NEW.status)
  EXECUTE FUNCTION notify_competition_status_changed();

-- =====================================================
-- COMMENTS
-- =====================================================
COMMENT ON FUNCTION notify_competition_status_changed IS
  'Creates notifications for all accepted competition players when the competition status changes. Includes old and new status in the notification data.';

-- =====================================================
-- MIGRATION COMPLETE
-- =====================================================
