-- =====================================================
-- Fix New Round Created Notification Trigger
-- The Nineteenth - Golf Competition App
-- =====================================================
-- This migration fixes the notify_new_round_created trigger to:
-- 1. Use venue name instead of course name (more meaningful)
-- 2. Handle NULL course_id gracefully
-- 3. Only notify accepted competition players (not organizer)
-- =====================================================

-- Drop existing trigger first
DROP TRIGGER IF EXISTS trigger_notify_new_round_created ON rounds;

-- Drop and recreate the function with updated logic
DROP FUNCTION IF EXISTS notify_new_round_created();

-- -----------------------------------------------------
-- New Round Created Notification Trigger Function
-- -----------------------------------------------------
-- Sends notification to all competition players when a new round is created
-- Fires AFTER INSERT on rounds table
-- Logic:
--   1. Get competition name and organizer_id from competitions table
--   2. Get course name from courses table (via venue for meaningful name)
--   3. Loop through all competition_players where status = 'accepted' AND player_id != organizer_id
--   4. For each, create notification with type 'new_round_created'
CREATE OR REPLACE FUNCTION notify_new_round_created()
RETURNS TRIGGER AS $$
DECLARE
  v_competition_name TEXT;
  v_organizer_id UUID;
  v_course_name TEXT;
  v_venue_name TEXT;
  v_display_name TEXT;
  player_record RECORD;
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
      -- Step 4: Create notification for each player
      PERFORM create_notification(
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
    END LOOP;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger that fires AFTER INSERT on rounds
CREATE TRIGGER on_round_created
  AFTER INSERT ON rounds
  FOR EACH ROW
  EXECUTE FUNCTION notify_new_round_created();

-- =====================================================
-- COMMENTS
-- =====================================================
COMMENT ON FUNCTION notify_new_round_created IS
  'Creates notifications for all accepted competition players when a new round is created. Excludes the organizer. Uses venue name for course display.';

-- =====================================================
-- MIGRATION COMPLETE
-- =====================================================
