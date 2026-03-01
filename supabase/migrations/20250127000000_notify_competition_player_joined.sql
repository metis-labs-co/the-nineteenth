-- =====================================================
-- Competition Player Joined Notification Trigger
-- The Nineteenth - Golf Competition App
-- =====================================================
-- This migration creates a trigger to notify the competition organizer
-- when a player joins their competition (via invite code).
--
-- Note: This is separate from notify_competition_player_added which
-- notifies the PLAYER when they are added by an admin. This trigger
-- notifies the ORGANIZER when a player joins on their own.
-- =====================================================

-- -----------------------------------------------------
-- Competition Player Joined Notification Trigger Function
-- -----------------------------------------------------
-- Sends notification to the competition organizer when a player joins
-- Only fires when:
--   1. A player joins a competition (INSERT on competition_players)
--   2. The joining player is not the organizer (no self-notification)
CREATE OR REPLACE FUNCTION notify_competition_player_joined()
RETURNS TRIGGER AS $$
DECLARE
  v_competition_name TEXT;
  v_organizer_id UUID;
  v_player_name TEXT;
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

    -- Create notification for the organizer
    PERFORM create_notification(
      v_organizer_id,                             -- p_user_id: the organizer receives notification
      'competition_player_joined'::TEXT,           -- p_type
      jsonb_build_object(
        'competition_name', v_competition_name,
        'player_name', v_player_name
      ),                                          -- p_data
      NEW.competition_id,                         -- p_competition_id
      NULL::UUID,                                 -- p_round_id
      NEW.player_id,                              -- p_player_id: the player who joined
      NULL::UUID                                  -- p_friendship_id
    );
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger that fires AFTER INSERT on competition_players
CREATE TRIGGER on_competition_player_joined
  AFTER INSERT ON competition_players
  FOR EACH ROW
  EXECUTE FUNCTION notify_competition_player_joined();

-- =====================================================
-- COMMENTS
-- =====================================================
COMMENT ON FUNCTION notify_competition_player_joined IS
  'Creates a notification for the competition organizer when a player joins their competition. Does not notify when organizer joins their own competition.';

-- =====================================================
-- MIGRATION COMPLETE
-- =====================================================
