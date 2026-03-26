-- =====================================================
-- Fix Standalone Round Visibility & Notifications
-- The Nineteenth - Golf Competition App
-- =====================================================
-- This migration fixes 5 bugs discovered during real-world testing:
--
-- Bug 1: Friends can't see standalone rounds (RLS missing round_players check)
-- Bug 2: No push notification sent for social round invitations
-- Bug 3: Notification taps don't navigate (missing roundId in push data)
-- Bug 4: No round_completed notification for standalone rounds
-- Bug 5: social_round_invitation not categorised in should_send_push()
-- =====================================================

-- =====================================================
-- 1. HELPER FUNCTION: Check round_players without triggering RLS
-- =====================================================
-- round_players RLS references rounds, and rounds RLS now needs to
-- reference round_players. Using SECURITY DEFINER breaks the cycle
-- by bypassing RLS on round_players during the check.

CREATE OR REPLACE FUNCTION is_round_participant(p_round_id UUID, p_player_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM round_players rp
    WHERE rp.round_id = p_round_id
    AND rp.player_id = p_player_id
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION is_round_participant IS 'Check if a player is in round_players for a given round. SECURITY DEFINER to avoid circular RLS between rounds and round_players.';

-- =====================================================
-- 2. FIX ROUNDS RLS: Add round_players to SELECT policy
-- =====================================================
-- The "Users can view rounds" policy only checks user_id (owner) and
-- competition_players. Friends added via round_players can't see the round.

DROP POLICY IF EXISTS "Users can view rounds" ON rounds;

CREATE POLICY "Users can view rounds"
  ON rounds FOR SELECT
  USING (
    -- Standalone rounds: user owns it
    (user_id = auth.uid())
    OR
    -- Standalone rounds: user is a participant via round_players
    -- Uses SECURITY DEFINER function to avoid circular RLS recursion
    (competition_id IS NULL AND is_round_participant(rounds.id, auth.uid()))
    OR
    -- Competition rounds: user is in the competition
    (competition_id IS NOT NULL AND EXISTS (
      SELECT 1 FROM competition_players cp
      WHERE cp.competition_id = rounds.competition_id
      AND cp.player_id = auth.uid()
      AND cp.status = 'accepted'
    ))
    OR
    -- Competition rounds: user is the organizer
    (competition_id IS NOT NULL AND EXISTS (
      SELECT 1 FROM competitions c
      WHERE c.id = rounds.competition_id
      AND c.organizer_id = auth.uid()
    ))
  );

-- =====================================================
-- 3. FIX ROUNDS RLS: Add round_players to UPDATE policy
-- =====================================================
-- Participants need to update round status (e.g., completing a round)

DROP POLICY IF EXISTS "Users can update rounds" ON rounds;

CREATE POLICY "Users can update rounds"
  ON rounds FOR UPDATE
  USING (
    -- Standalone rounds: user owns it
    (user_id = auth.uid())
    OR
    -- Standalone rounds: user is a participant via round_players
    (competition_id IS NULL AND is_round_participant(rounds.id, auth.uid()))
    OR
    -- Competition rounds: user is the organizer
    (competition_id IS NOT NULL AND EXISTS (
      SELECT 1 FROM competitions c
      WHERE c.id = rounds.competition_id
      AND c.organizer_id = auth.uid()
    ))
  );

-- =====================================================
-- 3. ADD PUSH NOTIFICATION to social round invitation trigger
-- =====================================================
-- The trigger only called create_notification() but never
-- send_push_notification(). Every other trigger calls both.

CREATE OR REPLACE FUNCTION notify_round_player_invited()
RETURNS TRIGGER AS $$
DECLARE
  inviter_name TEXT;
  course_name TEXT;
  club_name TEXT;
  round_date DATE;
  round_game_type TEXT;
  round_owner_id UUID;
BEGIN
  -- Get round details (using 'clubs' table)
  SELECT
    r.user_id,
    r.date,
    r.game_type,
    c.name,
    cl.name
  INTO
    round_owner_id,
    round_date,
    round_game_type,
    course_name,
    club_name
  FROM rounds r
  JOIN courses c ON c.id = r.course_id
  JOIN clubs cl ON cl.id = c.club_id
  WHERE r.id = NEW.round_id;

  -- Don't notify if player is the round owner (added themselves)
  IF NEW.player_id = round_owner_id THEN
    RETURN NEW;
  END IF;

  -- Get inviter name (the round owner or added_by)
  SELECT name INTO inviter_name
  FROM players
  WHERE id = COALESCE(NEW.added_by, round_owner_id);

  -- Create in-app notification for the invited player
  PERFORM create_notification(
    NEW.player_id,
    'social_round_invitation',
    jsonb_build_object(
      'inviter_name', inviter_name,
      'course_name', course_name,
      'club_name', club_name,
      'venue_name', club_name,
      'date', round_date,
      'game_type', round_game_type
    ),
    NULL,  -- no competition_id
    NEW.round_id,
    COALESCE(NEW.added_by, round_owner_id),  -- player_id = inviter
    NULL   -- no friendship_id
  );

  -- Send push notification (previously missing!)
  PERFORM send_push_notification(
    NEW.player_id,
    'social_round_invitation',
    'Round Invitation',
    inviter_name || ' invited you to play at ' || COALESCE(club_name, course_name),
    jsonb_build_object(
      'type', 'social_round_invitation',
      'inviter_name', inviter_name,
      'course_name', course_name,
      'club_name', club_name,
      'venue_name', club_name,
      'date', round_date,
      'game_type', round_game_type,
      'roundId', NEW.round_id
    )
  );

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION notify_round_player_invited IS 'Sends in-app notification AND push notification when a player is invited to a social round.';

-- =====================================================
-- 4. ADD social_round_invitation to should_send_push()
-- =====================================================
-- social_round_invitation was falling through to ELSE TRUE (default).
-- Add it to the competition category so it respects push_competition_updates.

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
      -- Competition & round-related notifications
      WHEN p_notification_type IN (
        'competition_player_added',
        'competition_player_joined',
        'new_round_created',
        'competition_status_changed',
        'round_completed',
        'social_round_invitation'
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

      -- League-related notifications
      WHEN p_notification_type IN (
        'league_player_joined',
        'league_player_left',
        'league_player_removed',
        'league_round_tagged',
        'league_leaderboard_changed'
      ) THEN up.push_league_updates

      -- Partnership-related notifications (also league category)
      WHEN p_notification_type IN (
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
-- 5. EXTEND notify_round_completed() for standalone rounds
-- =====================================================
-- Previously: IF v_competition_id IS NULL THEN RETURN NEW;
-- Now: handle standalone rounds via round_players

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

-- =====================================================
-- MIGRATION COMPLETE
-- =====================================================
