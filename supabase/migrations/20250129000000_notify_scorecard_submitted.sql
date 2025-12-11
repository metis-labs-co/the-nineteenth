-- =====================================================
-- Scorecard Submitted Notification Trigger
-- The Nineteenth - Golf Competition App
-- =====================================================
-- This migration creates a trigger to notify the competition organizer
-- when a player completes and submits their scorecard.
--
-- Fires: AFTER UPDATE on scorecards
-- Condition: OLD.status != 'completed' AND NEW.status = 'completed'
-- Logic:
--   1. Get round and competition info via JOIN
--   2. Get player name who submitted
--   3. If player_id != organizer_id, notify organizer
-- =====================================================

-- -----------------------------------------------------
-- Scorecard Submitted Notification Trigger Function
-- -----------------------------------------------------
-- Sends notification to the competition organizer when a player
-- submits their completed scorecard
CREATE OR REPLACE FUNCTION notify_scorecard_submitted()
RETURNS TRIGGER AS $$
DECLARE
  v_competition_id UUID;
  v_competition_name TEXT;
  v_organizer_id UUID;
  v_round_number INTEGER;
  v_player_name TEXT;
BEGIN
  -- Only process when status changes to 'completed'
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
    -- Create notification for the organizer
    PERFORM create_notification(
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
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- -----------------------------------------------------
-- Create Trigger with WHEN Clause
-- -----------------------------------------------------
-- Fires AFTER UPDATE on scorecards
-- Only when status changes from non-completed to completed
CREATE TRIGGER on_scorecard_submitted
  AFTER UPDATE ON scorecards
  FOR EACH ROW
  WHEN (OLD.status IS DISTINCT FROM 'completed' AND NEW.status = 'completed')
  EXECUTE FUNCTION notify_scorecard_submitted();

-- =====================================================
-- COMMENTS
-- =====================================================
COMMENT ON FUNCTION notify_scorecard_submitted IS
  'Creates a notification for the competition organizer when a player submits their completed scorecard. Does not notify when organizer submits their own scorecard. Only fires for competition rounds (not standalone rounds).';

-- =====================================================
-- MIGRATION COMPLETE
-- =====================================================
