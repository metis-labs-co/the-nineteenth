-- Gate competition round-complete notifications on the organizer-controlled
-- emission flag. Based on the latest standalone-aware function body from
-- 20260327000000_fix_standalone_round_visibility_and_notifications.sql.

CREATE OR REPLACE FUNCTION notify_round_completed()
RETURNS TRIGGER AS $$
DECLARE
  v_round_id UUID;
  v_competition_id UUID;
  v_competition_name TEXT;
  v_round_number INTEGER;
  v_round_owner_id UUID;
  v_course_name TEXT;
  v_total_scorecards INTEGER;
  v_completed_scorecards INTEGER;
  v_updated_id UUID;
  player_record RECORD;
  v_notification_id UUID;
BEGIN
  v_round_id := NEW.round_id;

  -- Get round info
  SELECT r.competition_id, r.round_number, r.user_id
  INTO v_competition_id, v_round_number, v_round_owner_id
  FROM rounds r
  WHERE r.id = v_round_id;

  -- =====================================================
  -- STANDALONE ROUNDS (competition_id IS NULL)
  -- =====================================================
  IF v_competition_id IS NULL THEN
    -- Count total vs completed scorecards for this round
    SELECT
      COUNT(*)::INTEGER,
      COUNT(*) FILTER (WHERE s.status IN ('completed', 'confirmed'))::INTEGER
    INTO v_total_scorecards, v_completed_scorecards
    FROM scorecards s
    WHERE s.round_id = v_round_id;

    -- All scorecards must be completed
    IF v_completed_scorecards < v_total_scorecards OR v_total_scorecards = 0 THEN
      RETURN NEW;
    END IF;

    -- Atomic check-and-set to prevent race conditions
    UPDATE rounds
    SET completion_notified = TRUE
    WHERE id = v_round_id AND completion_notified = FALSE
    RETURNING id INTO v_updated_id;

    -- If another trigger already set the flag, exit
    IF v_updated_id IS NULL THEN
      RETURN NEW;
    END IF;

    -- Get course name for notification
    SELECT c.name INTO v_course_name
    FROM rounds r
    JOIN courses c ON c.id = r.course_id
    WHERE r.id = v_round_id;

    -- Notify all players in round_players
    FOR player_record IN
      SELECT rp.player_id
      FROM round_players rp
      WHERE rp.round_id = v_round_id
    LOOP
      v_notification_id := create_notification(
        player_record.player_id,
        'round_completed',
        jsonb_build_object(
          'course_name', COALESCE(v_course_name, 'Unknown Course'),
          'round_number', v_round_number
        ),
        NULL,           -- no competition_id
        v_round_id,
        NULL,           -- no player_id
        NULL,           -- no friendship_id
        NULL            -- no league_id
      );

      PERFORM send_push_notification(
        player_record.player_id,
        'round_completed',
        'Round Complete',
        'Your round' || COALESCE(' at ' || v_course_name, '') || ' has been completed',
        jsonb_build_object(
          'type', 'round_completed',
          'course_name', COALESCE(v_course_name, 'Unknown Course'),
          'roundId', v_round_id,
          'round_number', v_round_number
        )
      );
    END LOOP;

    RETURN NEW;
  END IF;

  -- =====================================================
  -- COMPETITION ROUNDS (existing logic, unchanged)
  -- =====================================================

  -- Count total vs completed scorecards for this round
  SELECT
    COUNT(*)::INTEGER,
    COUNT(*) FILTER (WHERE s.status IN ('completed', 'confirmed'))::INTEGER
  INTO v_total_scorecards, v_completed_scorecards
  FROM scorecards s
  WHERE s.round_id = v_round_id;

  -- All scorecards must be completed
  IF v_completed_scorecards < v_total_scorecards OR v_total_scorecards = 0 THEN
    RETURN NEW;
  END IF;

  -- Atomic check-and-set to prevent race conditions
  UPDATE rounds
  SET completion_notified = TRUE
  WHERE id = v_round_id AND completion_notified = FALSE
  RETURNING id INTO v_updated_id;

  -- If another trigger already set the flag, exit
  IF v_updated_id IS NULL THEN
    RETURN NEW;
  END IF;

  -- Consume the completion event but emit neither channel when disabled.
  -- This is intentionally after the atomic claim so the event cannot re-fire.
  IF EXISTS (
    SELECT 1
    FROM competitions c
    WHERE c.id = v_competition_id
      AND c.results_summary_enabled = FALSE
  ) THEN
    RETURN NEW;
  END IF;

  -- Get competition name
  SELECT c.name INTO v_competition_name
  FROM competitions c
  WHERE c.id = v_competition_id;

  -- Notify all competition players
  FOR player_record IN
    SELECT cp.player_id
    FROM competition_players cp
    WHERE cp.competition_id = v_competition_id
      AND cp.status = 'accepted'
  LOOP
    v_notification_id := create_notification(
      player_record.player_id,
      'round_completed',
      jsonb_build_object(
        'competition_name', v_competition_name,
        'round_number', v_round_number
      ),
      v_competition_id,
      v_round_id,
      NULL,
      NULL,
      NULL
    );

    PERFORM send_push_notification(
      player_record.player_id,
      'round_completed',
      'Round Complete',
      'All scorecards submitted for Round ' || COALESCE(v_round_number::TEXT, '') || ' of ' || v_competition_name,
      jsonb_build_object(
        'competition_name', v_competition_name,
        'competition_id', v_competition_id,
        'round_id', v_round_id,
        'round_number', v_round_number
      )
    );
  END LOOP;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION notify_round_completed IS 'Creates in-app notification and sends push to all players when all scorecards are submitted for a round. Supports both competition and standalone rounds.';
