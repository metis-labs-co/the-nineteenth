-- =====================================================
-- Side Game & Prize Pool Notification Triggers
-- The Nineteenth - Golf Competition App
-- =====================================================
-- This migration adds:
-- 1. Five new notification types for skins, wolf, and prize pools
-- 2. New push preference column: push_side_game_updates
-- 3. Updated should_send_push() with side-game category
-- 4. Updated get_user_push_preferences() and update_push_preferences()
-- 5. Trigger: notify_skins_game_status_changed (AFTER UPDATE on skins_games)
-- 6. Trigger: notify_wolf_game_status_changed (AFTER UPDATE on wolf_games)
-- 7. Trigger: notify_prize_pool_settled (AFTER UPDATE on competition_prize_pools)
-- =====================================================

-- =====================================================
-- 1. UPDATE notifications TYPE CHECK CONSTRAINT
-- =====================================================

ALTER TABLE notifications DROP CONSTRAINT IF EXISTS notifications_type_check;
ALTER TABLE notifications ADD CONSTRAINT notifications_type_check CHECK (type IN (
  -- Competition types
  'competition_player_added',
  'competition_player_joined',
  'new_round_created',
  'competition_status_changed',
  'scorecard_submitted',
  -- Social types
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
  'partnership_round_tagged',
  -- Side-game & prize pool types (NEW)
  'skins_game_completed',
  'skins_game_cancelled',
  'wolf_game_completed',
  'wolf_game_cancelled',
  'prize_pool_settled'
));

-- =====================================================
-- 2. ADD push_side_game_updates COLUMN TO user_preferences
-- =====================================================

ALTER TABLE user_preferences ADD COLUMN IF NOT EXISTS
  push_side_game_updates BOOLEAN NOT NULL DEFAULT TRUE;

COMMENT ON COLUMN user_preferences.push_side_game_updates IS 'Toggle for skins, wolf, and prize pool push notifications.';

-- =====================================================
-- 3. UPDATE should_send_push() WITH SIDE-GAME CATEGORY
-- =====================================================
-- Rebuilt from latest version in 20260327000000 to preserve
-- social_round_invitation categorization and partnership split.

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

      -- Side-game & prize pool notifications (NEW)
      WHEN p_notification_type IN (
        'skins_game_completed',
        'skins_game_cancelled',
        'wolf_game_completed',
        'wolf_game_cancelled',
        'prize_pool_settled'
      ) THEN up.push_side_game_updates

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
-- 4. UPDATE get_user_push_preferences() WITH NEW COLUMN
-- =====================================================

DROP FUNCTION IF EXISTS get_user_push_preferences(UUID);

CREATE OR REPLACE FUNCTION get_user_push_preferences(p_user_id UUID)
RETURNS TABLE (
  push_enabled BOOLEAN,
  push_competition_updates BOOLEAN,
  push_friend_requests BOOLEAN,
  push_scorecard_updates BOOLEAN,
  push_league_updates BOOLEAN,
  push_side_game_updates BOOLEAN
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    up.push_enabled,
    up.push_competition_updates,
    up.push_friend_requests,
    up.push_scorecard_updates,
    up.push_league_updates,
    up.push_side_game_updates
  FROM user_preferences up
  WHERE up.user_id = p_user_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =====================================================
-- 5. UPDATE update_push_preferences() WITH NEW COLUMN
-- =====================================================

DROP FUNCTION IF EXISTS update_push_preferences(UUID, BOOLEAN, BOOLEAN, BOOLEAN, BOOLEAN, BOOLEAN);

CREATE OR REPLACE FUNCTION update_push_preferences(
  p_user_id UUID,
  p_push_enabled BOOLEAN DEFAULT NULL,
  p_push_competition_updates BOOLEAN DEFAULT NULL,
  p_push_friend_requests BOOLEAN DEFAULT NULL,
  p_push_scorecard_updates BOOLEAN DEFAULT NULL,
  p_push_league_updates BOOLEAN DEFAULT NULL,
  p_push_side_game_updates BOOLEAN DEFAULT NULL
)
RETURNS TABLE (
  push_enabled BOOLEAN,
  push_competition_updates BOOLEAN,
  push_friend_requests BOOLEAN,
  push_scorecard_updates BOOLEAN,
  push_league_updates BOOLEAN,
  push_side_game_updates BOOLEAN
) AS $$
BEGIN
  UPDATE user_preferences
  SET
    push_enabled = COALESCE(p_push_enabled, user_preferences.push_enabled),
    push_competition_updates = COALESCE(p_push_competition_updates, user_preferences.push_competition_updates),
    push_friend_requests = COALESCE(p_push_friend_requests, user_preferences.push_friend_requests),
    push_scorecard_updates = COALESCE(p_push_scorecard_updates, user_preferences.push_scorecard_updates),
    push_league_updates = COALESCE(p_push_league_updates, user_preferences.push_league_updates),
    push_side_game_updates = COALESCE(p_push_side_game_updates, user_preferences.push_side_game_updates),
    updated_at = NOW()
  WHERE user_id = p_user_id;

  RETURN QUERY
  SELECT
    up.push_enabled,
    up.push_competition_updates,
    up.push_friend_requests,
    up.push_scorecard_updates,
    up.push_league_updates,
    up.push_side_game_updates
  FROM user_preferences up
  WHERE up.user_id = p_user_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =====================================================
-- TRIGGER 1: notify_skins_game_status_changed
-- AFTER UPDATE on skins_games (status → completed or cancelled)
-- Notifies all participants with personalized payout data
-- =====================================================

CREATE OR REPLACE FUNCTION notify_skins_game_status_changed()
RETURNS TRIGGER AS $$
DECLARE
  v_notification_type TEXT;
  v_competition_id UUID;
  v_competition_name TEXT;
  v_round_number INTEGER;
  v_course_name TEXT;
  v_context_text TEXT;
  v_triggerer_id UUID;
  v_participant_id UUID;
  v_holes_won INTEGER;
  v_net_result DECIMAL(10,2);
  v_push_title TEXT;
  v_push_body TEXT;
  v_notification_id UUID;
BEGIN
  -- Determine notification type
  IF NEW.status = 'completed' THEN
    v_notification_type := 'skins_game_completed';
  ELSE
    v_notification_type := 'skins_game_cancelled';
  END IF;

  -- Get round context (competition may be NULL for standalone rounds)
  SELECT r.competition_id, r.round_number, c.name, co.name
  INTO v_competition_id, v_round_number, v_competition_name, v_course_name
  FROM rounds r
  LEFT JOIN competitions c ON c.id = r.competition_id
  LEFT JOIN courses co ON co.id = r.course_id
  WHERE r.id = NEW.round_id;

  -- Build context text: "Round 3 of Summer Cup" or "at Royal Melbourne"
  IF v_competition_name IS NOT NULL THEN
    v_context_text := 'Round ' || COALESCE(v_round_number::TEXT, '') || ' of ' || v_competition_name;
  ELSE
    v_context_text := COALESCE(v_course_name, 'your round');
  END IF;

  -- Identify the triggerer to skip notifying them
  v_triggerer_id := auth.uid();

  -- Loop through all participants
  FOR v_participant_id IN SELECT unnest(NEW.participant_ids)
  LOOP
    -- Skip the person who triggered the status change
    IF v_triggerer_id IS NOT NULL AND v_participant_id = v_triggerer_id THEN
      CONTINUE;
    END IF;

    -- Reset payout data
    v_holes_won := NULL;
    v_net_result := NULL;

    -- For completed games, look up personalized payout data
    IF NEW.status = 'completed' THEN
      SELECT sp.holes_won, sp.net_result
      INTO v_holes_won, v_net_result
      FROM skins_payouts sp
      WHERE sp.skins_game_id = NEW.id AND sp.player_id = v_participant_id;
    END IF;

    -- Build push message
    IF NEW.status = 'completed' THEN
      v_push_title := 'Skins Game Complete';
      IF v_holes_won IS NOT NULL AND v_net_result IS NOT NULL THEN
        v_push_body := 'Skins game completed for ' || v_context_text
          || '. You won ' || v_holes_won || ' holes ('
          || CASE WHEN v_net_result >= 0 THEN '+' ELSE '' END
          || '$' || to_char(ABS(v_net_result), 'FM999999990.00') || ')';
      ELSE
        v_push_body := 'Skins game completed for ' || v_context_text;
      END IF;
    ELSE
      v_push_title := 'Skins Game Cancelled';
      v_push_body := 'Skins game for ' || v_context_text || ' has been cancelled';
    END IF;

    -- Create in-app notification
    v_notification_id := create_notification(
      v_participant_id,
      v_notification_type,
      jsonb_build_object(
        'competition_name', v_competition_name,
        'round_number', v_round_number,
        'course_name', v_course_name,
        'skins_game_id', NEW.id,
        'holes_won', v_holes_won,
        'net_result', v_net_result,
        'currency', NEW.currency
      ),
      v_competition_id,     -- p_competition_id
      NEW.round_id,         -- p_round_id
      v_triggerer_id,       -- p_player_id (who triggered)
      NULL,                 -- p_friendship_id
      NULL                  -- p_league_id
    );

    -- Send push notification
    PERFORM send_push_notification(
      v_participant_id,
      v_notification_type,
      v_push_title,
      v_push_body,
      jsonb_build_object(
        'type', v_notification_type,
        'competitionId', v_competition_id,
        'roundId', NEW.round_id,
        'skins_game_id', NEW.id,
        'competition_name', v_competition_name,
        'round_number', v_round_number,
        'course_name', v_course_name,
        'holes_won', v_holes_won,
        'net_result', v_net_result,
        'currency', NEW.currency
      )
    );
  END LOOP;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trigger_notify_skins_game_status_changed ON skins_games;
CREATE TRIGGER trigger_notify_skins_game_status_changed
  AFTER UPDATE ON skins_games
  FOR EACH ROW
  WHEN (OLD.status IS DISTINCT FROM NEW.status AND NEW.status IN ('completed', 'cancelled'))
  EXECUTE FUNCTION notify_skins_game_status_changed();

-- =====================================================
-- TRIGGER 2: notify_wolf_game_status_changed
-- AFTER UPDATE on wolf_games (status → completed or cancelled)
-- Notifies all participants with personalized point/payout data
-- =====================================================

CREATE OR REPLACE FUNCTION notify_wolf_game_status_changed()
RETURNS TRIGGER AS $$
DECLARE
  v_notification_type TEXT;
  v_competition_id UUID;
  v_competition_name TEXT;
  v_round_number INTEGER;
  v_course_name TEXT;
  v_context_text TEXT;
  v_triggerer_id UUID;
  v_participant_id UUID;
  v_total_points INTEGER;
  v_net_result DECIMAL(10,2);
  v_push_title TEXT;
  v_push_body TEXT;
  v_notification_id UUID;
BEGIN
  -- Determine notification type
  IF NEW.status = 'completed' THEN
    v_notification_type := 'wolf_game_completed';
  ELSE
    v_notification_type := 'wolf_game_cancelled';
  END IF;

  -- Get round context
  SELECT r.competition_id, r.round_number, c.name, co.name
  INTO v_competition_id, v_round_number, v_competition_name, v_course_name
  FROM rounds r
  LEFT JOIN competitions c ON c.id = r.competition_id
  LEFT JOIN courses co ON co.id = r.course_id
  WHERE r.id = NEW.round_id;

  -- Build context text
  IF v_competition_name IS NOT NULL THEN
    v_context_text := 'Round ' || COALESCE(v_round_number::TEXT, '') || ' of ' || v_competition_name;
  ELSE
    v_context_text := COALESCE(v_course_name, 'your round');
  END IF;

  -- Identify the triggerer
  v_triggerer_id := auth.uid();

  -- Loop through all participants
  FOR v_participant_id IN SELECT unnest(NEW.participant_ids)
  LOOP
    -- Skip the triggerer
    IF v_triggerer_id IS NOT NULL AND v_participant_id = v_triggerer_id THEN
      CONTINUE;
    END IF;

    -- Reset payout data
    v_total_points := NULL;
    v_net_result := NULL;

    -- For completed games, look up personalized data
    IF NEW.status = 'completed' THEN
      SELECT wp.total_points, wp.net_result
      INTO v_total_points, v_net_result
      FROM wolf_payouts wp
      WHERE wp.wolf_game_id = NEW.id AND wp.player_id = v_participant_id;
    END IF;

    -- Build push message
    IF NEW.status = 'completed' THEN
      v_push_title := 'Wolf Game Complete';
      IF v_total_points IS NOT NULL THEN
        IF NEW.pot_enabled AND v_net_result IS NOT NULL THEN
          v_push_body := 'Wolf game completed for ' || v_context_text
            || '. You finished with ' || v_total_points || ' pts ('
            || CASE WHEN v_net_result >= 0 THEN '+' ELSE '' END
            || '$' || to_char(ABS(v_net_result), 'FM999999990.00') || ')';
        ELSE
          v_push_body := 'Wolf game completed for ' || v_context_text
            || '. You finished with ' || v_total_points || ' pts';
        END IF;
      ELSE
        v_push_body := 'Wolf game completed for ' || v_context_text;
      END IF;
    ELSE
      v_push_title := 'Wolf Game Cancelled';
      v_push_body := 'Wolf game for ' || v_context_text || ' has been cancelled';
    END IF;

    -- Create in-app notification
    v_notification_id := create_notification(
      v_participant_id,
      v_notification_type,
      jsonb_build_object(
        'competition_name', v_competition_name,
        'round_number', v_round_number,
        'course_name', v_course_name,
        'wolf_game_id', NEW.id,
        'total_points', v_total_points,
        'net_result', v_net_result,
        'pot_enabled', NEW.pot_enabled,
        'currency', NEW.currency
      ),
      v_competition_id,
      NEW.round_id,
      v_triggerer_id,
      NULL,
      NULL
    );

    -- Send push notification
    PERFORM send_push_notification(
      v_participant_id,
      v_notification_type,
      v_push_title,
      v_push_body,
      jsonb_build_object(
        'type', v_notification_type,
        'competitionId', v_competition_id,
        'roundId', NEW.round_id,
        'wolf_game_id', NEW.id,
        'competition_name', v_competition_name,
        'round_number', v_round_number,
        'course_name', v_course_name,
        'total_points', v_total_points,
        'net_result', v_net_result,
        'pot_enabled', NEW.pot_enabled,
        'currency', NEW.currency
      )
    );
  END LOOP;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trigger_notify_wolf_game_status_changed ON wolf_games;
CREATE TRIGGER trigger_notify_wolf_game_status_changed
  AFTER UPDATE ON wolf_games
  FOR EACH ROW
  WHEN (OLD.status IS DISTINCT FROM NEW.status AND NEW.status IN ('completed', 'cancelled'))
  EXECUTE FUNCTION notify_wolf_game_status_changed();

-- =====================================================
-- TRIGGER 3: notify_prize_pool_settled
-- AFTER UPDATE on competition_prize_pools (status → settled)
-- Notifies all competition players with placement data
-- =====================================================

CREATE OR REPLACE FUNCTION notify_prize_pool_settled()
RETURNS TRIGGER AS $$
DECLARE
  v_competition_name TEXT;
  v_triggerer_id UUID;
  player_record RECORD;
  v_position INTEGER;
  v_payout_amount DECIMAL(10,2);
  v_position_text TEXT;
  v_push_body TEXT;
  v_notification_id UUID;
BEGIN
  -- Get competition name
  SELECT c.name INTO v_competition_name
  FROM competitions c
  WHERE c.id = NEW.competition_id;

  v_triggerer_id := auth.uid();

  -- Notify all accepted competition players
  FOR player_record IN
    SELECT cp.player_id
    FROM competition_players cp
    WHERE cp.competition_id = NEW.competition_id
      AND cp.status = 'accepted'
  LOOP
    -- Skip the triggerer
    IF v_triggerer_id IS NOT NULL AND player_record.player_id = v_triggerer_id THEN
      CONTINUE;
    END IF;

    -- Look up this player's placement
    v_position := NULL;
    v_payout_amount := NULL;

    SELECT pp.position, pp.payout_amount
    INTO v_position, v_payout_amount
    FROM prize_pool_placements pp
    WHERE pp.pool_id = NEW.id AND pp.player_id = player_record.player_id;

    -- Build push message
    IF v_position IS NOT NULL AND v_payout_amount IS NOT NULL THEN
      -- Build ordinal position text (1st, 2nd, 3rd, 4th, etc.)
      v_position_text := v_position::TEXT ||
        CASE
          WHEN v_position % 100 IN (11, 12, 13) THEN 'th'
          WHEN v_position % 10 = 1 THEN 'st'
          WHEN v_position % 10 = 2 THEN 'nd'
          WHEN v_position % 10 = 3 THEN 'rd'
          ELSE 'th'
        END;

      v_push_body := 'Prize pool settled for ' || v_competition_name
        || '. You placed ' || v_position_text
        || ' and won $' || to_char(v_payout_amount, 'FM999999990.00');
    ELSE
      v_push_body := 'Prize pool for ' || v_competition_name || ' has been settled. Check the results!';
    END IF;

    -- Create in-app notification
    v_notification_id := create_notification(
      player_record.player_id,
      'prize_pool_settled',
      jsonb_build_object(
        'competition_name', v_competition_name,
        'position', v_position,
        'position_text', v_position_text,
        'payout_amount', v_payout_amount,
        'currency', NEW.currency
      ),
      NEW.competition_id,   -- p_competition_id
      NULL,                 -- p_round_id
      v_triggerer_id,       -- p_player_id
      NULL,                 -- p_friendship_id
      NULL                  -- p_league_id
    );

    -- Send push notification
    PERFORM send_push_notification(
      player_record.player_id,
      'prize_pool_settled',
      'Prize Pool Settled',
      v_push_body,
      jsonb_build_object(
        'type', 'prize_pool_settled',
        'competitionId', NEW.competition_id,
        'competition_name', v_competition_name,
        'position', v_position,
        'position_text', v_position_text,
        'payout_amount', v_payout_amount,
        'currency', NEW.currency
      )
    );
  END LOOP;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trigger_notify_prize_pool_settled ON competition_prize_pools;
CREATE TRIGGER trigger_notify_prize_pool_settled
  AFTER UPDATE ON competition_prize_pools
  FOR EACH ROW
  WHEN (OLD.status IS DISTINCT FROM 'settled' AND NEW.status = 'settled')
  EXECUTE FUNCTION notify_prize_pool_settled();

-- =====================================================
-- COMMENTS
-- =====================================================

COMMENT ON FUNCTION notify_skins_game_status_changed IS
  'Sends in-app notification and push to all participants when a skins game is completed or cancelled. Includes personalized payout data.';

COMMENT ON FUNCTION notify_wolf_game_status_changed IS
  'Sends in-app notification and push to all participants when a wolf game is completed or cancelled. Includes personalized point/payout data.';

COMMENT ON FUNCTION notify_prize_pool_settled IS
  'Sends in-app notification and push to all competition players when a prize pool is settled. Includes personalized placement and payout data.';

-- =====================================================
-- MIGRATION COMPLETE
-- =====================================================
