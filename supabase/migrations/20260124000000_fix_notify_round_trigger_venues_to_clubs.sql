-- =====================================================
-- Fix notify_new_round_created() trigger - venues -> clubs
-- The Nineteenth - Golf Competition App
-- =====================================================
-- The venues table was renamed to clubs, but the trigger function
-- still references the old table name. This migration fixes that.
-- =====================================================

-- -----------------------------------------------------
-- Fix the notify_new_round_created function
-- -----------------------------------------------------
CREATE OR REPLACE FUNCTION notify_new_round_created()
RETURNS TRIGGER AS $$
DECLARE
  v_competition_name TEXT;
  v_organizer_id UUID;
  v_course_name TEXT;
  v_club_name TEXT;
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

    -- Step 2: Get course name (via club for better naming)
    IF NEW.course_id IS NOT NULL THEN
      SELECT
        co.name,
        cl.name
      INTO v_course_name, v_club_name
      FROM courses co
      LEFT JOIN clubs cl ON cl.id = co.club_id
      WHERE co.id = NEW.course_id;

      -- Use club name as primary display, fallback to course name
      -- If club and course have same name, just use club name
      -- Otherwise show "Club - Course" format for multi-course clubs
      IF v_club_name IS NULL THEN
        v_display_name := v_course_name;
      ELSIF v_club_name = v_course_name OR v_course_name IS NULL THEN
        v_display_name := v_club_name;
      ELSE
        v_display_name := v_club_name || ' - ' || v_course_name;
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

-- Comment
COMMENT ON FUNCTION notify_new_round_created IS
  'Creates in-app notifications and sends push to all competition players when a round is created. Fixed to use clubs table instead of deprecated venues.';
