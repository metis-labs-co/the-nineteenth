-- =====================================================
-- Update Competition Player Added Notification Trigger
-- The Nineteenth - Golf Competition App
-- =====================================================
-- This migration updates the competition player notification trigger to:
-- - Only fire when status = 'accepted' (not for all inserts)
-- - Use 'organizer_name' instead of 'added_by_name' in the data payload
-- =====================================================

-- Drop existing trigger first
DROP TRIGGER IF EXISTS trigger_notify_competition_player_added ON competition_players;

-- Drop and recreate the function with updated logic
DROP FUNCTION IF EXISTS notify_competition_player_added();

-- -----------------------------------------------------
-- Competition Player Added Notification Trigger
-- -----------------------------------------------------
-- Sends notification when a player is added to a competition
-- Only fires when:
--   1. A new row is inserted with status = 'accepted'
--   2. The player being added is not the organizer (no self-notification)
CREATE OR REPLACE FUNCTION notify_competition_player_added()
RETURNS TRIGGER AS $$
DECLARE
  v_competition_name TEXT;
  v_organizer_name TEXT;
  v_organizer_id UUID;
BEGIN
  -- Only process if the new row has status = 'accepted'
  IF NEW.status = 'accepted' THEN
    -- Get competition name and organizer_id from competitions table
    SELECT c.name, c.organizer_id
    INTO v_competition_name, v_organizer_id
    FROM competitions c
    WHERE c.id = NEW.competition_id;

    -- Get organizer name from players table
    SELECT p.name
    INTO v_organizer_name
    FROM players p
    WHERE p.id = v_organizer_id;

    -- Don't notify the organizer if they add themselves
    IF NEW.player_id != v_organizer_id THEN
      -- Create notification for the added player
      PERFORM create_notification(
        NEW.player_id,                              -- p_user_id: the player receiving notification
        'competition_player_added',                 -- p_type
        jsonb_build_object(
          'competition_name', v_competition_name,
          'organizer_name', v_organizer_name
        ),                                          -- p_data
        NEW.competition_id,                         -- p_competition_id
        NULL,                                       -- p_round_id
        v_organizer_id,                             -- p_player_id: the organizer who added them
        NULL                                        -- p_friendship_id
      );
    END IF;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger that fires AFTER INSERT on competition_players
-- Note: The WHEN clause filters at trigger level for efficiency
CREATE TRIGGER on_competition_player_added
  AFTER INSERT ON competition_players
  FOR EACH ROW
  WHEN (NEW.status = 'accepted')
  EXECUTE FUNCTION notify_competition_player_added();

-- =====================================================
-- COMMENTS
-- =====================================================
COMMENT ON FUNCTION notify_competition_player_added IS
  'Creates a notification when a player is added to a competition with accepted status. Does not notify organizers adding themselves.';

-- =====================================================
-- MIGRATION COMPLETE
-- =====================================================
