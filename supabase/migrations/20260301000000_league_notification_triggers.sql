-- =====================================================
-- League Notification Triggers + Round Completion
-- The Nineteenth - Golf Competition App
-- =====================================================
-- This migration adds:
-- 1. league_id column on notifications
-- 2. New notification types for leagues
-- 3. push_league_updates preference
-- 4. removed_by on league_players (voluntary vs admin removal)
-- 5. completion_notified on rounds (race condition guard)
-- 6. Trigger functions for league + round_completed notifications
-- =====================================================

-- =====================================================
-- 1a. ADD league_id COLUMN TO notifications
-- =====================================================

ALTER TABLE notifications ADD COLUMN IF NOT EXISTS league_id UUID REFERENCES leagues(id) ON DELETE CASCADE;
CREATE INDEX IF NOT EXISTS idx_notifications_league ON notifications(league_id) WHERE league_id IS NOT NULL;

-- =====================================================
-- 1b. UPDATE notifications TYPE CHECK CONSTRAINT
-- =====================================================

ALTER TABLE notifications DROP CONSTRAINT IF EXISTS notifications_type_check;
ALTER TABLE notifications ADD CONSTRAINT notifications_type_check CHECK (type IN (
  -- Existing types
  'competition_player_added',
  'competition_player_joined',
  'new_round_created',
  'competition_status_changed',
  'scorecard_submitted',
  'friend_request_received',
  'friend_request_accepted',
  'social_round_invitation',
  -- New league types
  'league_player_joined',
  'league_player_left',
  'league_player_removed',
  'league_round_tagged',
  'league_leaderboard_changed',
  -- New gap type
  'round_completed'
));

-- =====================================================
-- 1c. EXTEND create_notification() WITH league_id
-- =====================================================

-- Drop old 7-param overload to avoid ambiguous function resolution
DROP FUNCTION IF EXISTS create_notification(UUID, TEXT, JSONB, UUID, UUID, UUID, UUID);

CREATE OR REPLACE FUNCTION create_notification(
  p_user_id UUID,
  p_type TEXT,
  p_data JSONB DEFAULT '{}',
  p_competition_id UUID DEFAULT NULL,
  p_round_id UUID DEFAULT NULL,
  p_player_id UUID DEFAULT NULL,
  p_friendship_id UUID DEFAULT NULL,
  p_league_id UUID DEFAULT NULL
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
    friendship_id,
    league_id
  ) VALUES (
    p_user_id,
    p_type,
    p_data,
    p_competition_id,
    p_round_id,
    p_player_id,
    p_friendship_id,
    p_league_id
  )
  RETURNING id INTO new_id;

  RETURN new_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =====================================================
-- 1d. ADD removed_by TO league_players
-- =====================================================

ALTER TABLE league_players ADD COLUMN removed_by UUID REFERENCES players(id);

COMMENT ON COLUMN league_players.removed_by IS 'Player who initiated removal. If removed_by = player_id then voluntary leave, otherwise admin removal.';

-- =====================================================
-- 1e. ADD push_league_updates TO user_preferences
-- =====================================================

ALTER TABLE user_preferences ADD COLUMN push_league_updates BOOLEAN NOT NULL DEFAULT TRUE;

COMMENT ON COLUMN user_preferences.push_league_updates IS 'Toggle for league-related push notifications (joins, round tags, leaderboard changes)';

-- =====================================================
-- 1f. UPDATE should_send_push() WITH LEAGUE + ROUND_COMPLETED MAPPING
-- =====================================================

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
      -- Competition-related notifications
      WHEN p_notification_type IN (
        'competition_player_added',
        'competition_player_joined',
        'new_round_created',
        'competition_status_changed',
        'round_completed'
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
-- 1g. UPDATE PUSH PREFERENCE FUNCTIONS
-- =====================================================

-- Drop and recreate get_user_push_preferences with league column
DROP FUNCTION IF EXISTS get_user_push_preferences(UUID);

CREATE OR REPLACE FUNCTION get_user_push_preferences(p_user_id UUID)
RETURNS TABLE (
  push_enabled BOOLEAN,
  push_competition_updates BOOLEAN,
  push_friend_requests BOOLEAN,
  push_scorecard_updates BOOLEAN,
  push_league_updates BOOLEAN
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    up.push_enabled,
    up.push_competition_updates,
    up.push_friend_requests,
    up.push_scorecard_updates,
    up.push_league_updates
  FROM user_preferences up
  WHERE up.user_id = p_user_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Drop and recreate update_push_preferences with league column
DROP FUNCTION IF EXISTS update_push_preferences(UUID, BOOLEAN, BOOLEAN, BOOLEAN, BOOLEAN);

CREATE OR REPLACE FUNCTION update_push_preferences(
  p_user_id UUID,
  p_push_enabled BOOLEAN DEFAULT NULL,
  p_push_competition_updates BOOLEAN DEFAULT NULL,
  p_push_friend_requests BOOLEAN DEFAULT NULL,
  p_push_scorecard_updates BOOLEAN DEFAULT NULL,
  p_push_league_updates BOOLEAN DEFAULT NULL
)
RETURNS TABLE (
  push_enabled BOOLEAN,
  push_competition_updates BOOLEAN,
  push_friend_requests BOOLEAN,
  push_scorecard_updates BOOLEAN,
  push_league_updates BOOLEAN
) AS $$
BEGIN
  UPDATE user_preferences
  SET
    push_enabled = COALESCE(p_push_enabled, user_preferences.push_enabled),
    push_competition_updates = COALESCE(p_push_competition_updates, user_preferences.push_competition_updates),
    push_friend_requests = COALESCE(p_push_friend_requests, user_preferences.push_friend_requests),
    push_scorecard_updates = COALESCE(p_push_scorecard_updates, user_preferences.push_scorecard_updates),
    push_league_updates = COALESCE(p_push_league_updates, user_preferences.push_league_updates),
    updated_at = NOW()
  WHERE user_id = p_user_id;

  RETURN QUERY
  SELECT
    up.push_enabled,
    up.push_competition_updates,
    up.push_friend_requests,
    up.push_scorecard_updates,
    up.push_league_updates
  FROM user_preferences up
  WHERE up.user_id = p_user_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =====================================================
-- 1h. ADD completion_notified TO rounds
-- =====================================================

ALTER TABLE rounds ADD COLUMN completion_notified BOOLEAN NOT NULL DEFAULT FALSE;

COMMENT ON COLUMN rounds.completion_notified IS 'Guard flag to prevent duplicate round_completed notifications from race conditions.';

-- =====================================================
-- TRIGGER 1: notify_league_player_joined
-- AFTER INSERT on league_players WHERE status='accepted'
-- Notifies league creator when a player joins
-- =====================================================

CREATE OR REPLACE FUNCTION notify_league_player_joined()
RETURNS TRIGGER AS $$
DECLARE
  v_league_name TEXT;
  v_creator_id UUID;
  v_player_name TEXT;
  v_notification_id UUID;
BEGIN
  -- Only notify for accepted players
  IF NEW.status != 'accepted' THEN
    RETURN NEW;
  END IF;

  -- Get league info
  SELECT l.name, l.created_by
  INTO v_league_name, v_creator_id
  FROM leagues l
  WHERE l.id = NEW.league_id;

  -- Don't notify if creator joins their own league
  IF NEW.player_id = v_creator_id THEN
    RETURN NEW;
  END IF;

  -- Get joining player's name
  SELECT p.name INTO v_player_name
  FROM players p
  WHERE p.id = NEW.player_id;

  -- Create in-app notification for creator
  v_notification_id := create_notification(
    v_creator_id,
    'league_player_joined',
    jsonb_build_object(
      'league_name', v_league_name,
      'player_name', v_player_name
    ),
    NULL,                -- p_competition_id
    NULL,                -- p_round_id
    NEW.player_id,       -- p_player_id
    NULL,                -- p_friendship_id
    NEW.league_id        -- p_league_id
  );

  -- Send push notification
  PERFORM send_push_notification(
    v_creator_id,
    'league_player_joined',
    'Player Joined League',
    v_player_name || ' joined ' || v_league_name,
    jsonb_build_object(
      'league_name', v_league_name,
      'league_id', NEW.league_id,
      'player_name', v_player_name,
      'player_id', NEW.player_id
    )
  );

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trigger_notify_league_player_joined ON league_players;
CREATE TRIGGER trigger_notify_league_player_joined
  AFTER INSERT ON league_players
  FOR EACH ROW EXECUTE FUNCTION notify_league_player_joined();

-- =====================================================
-- TRIGGER 2: notify_league_player_status_changed
-- AFTER UPDATE on league_players WHERE status='removed'
-- Distinguishes voluntary leave vs admin removal via removed_by
-- =====================================================

CREATE OR REPLACE FUNCTION notify_league_player_status_changed()
RETURNS TRIGGER AS $$
DECLARE
  v_league_name TEXT;
  v_creator_id UUID;
  v_player_name TEXT;
  v_notification_id UUID;
BEGIN
  -- Only fire when status changes to 'removed'
  IF NEW.status != 'removed' OR OLD.status = 'removed' THEN
    RETURN NEW;
  END IF;

  -- Get league info
  SELECT l.name, l.created_by
  INTO v_league_name, v_creator_id
  FROM leagues l
  WHERE l.id = NEW.league_id;

  -- Get player name
  SELECT p.name INTO v_player_name
  FROM players p
  WHERE p.id = NEW.player_id;

  -- Check if voluntary leave (removed_by = player_id) or admin removal
  IF NEW.removed_by IS NOT NULL AND NEW.removed_by = NEW.player_id THEN
    -- Voluntary leave → notify creator
    v_notification_id := create_notification(
      v_creator_id,
      'league_player_left',
      jsonb_build_object(
        'league_name', v_league_name,
        'player_name', v_player_name
      ),
      NULL, NULL,
      NEW.player_id,
      NULL,
      NEW.league_id
    );

    PERFORM send_push_notification(
      v_creator_id,
      'league_player_left',
      'Player Left League',
      v_player_name || ' left ' || v_league_name,
      jsonb_build_object(
        'league_name', v_league_name,
        'league_id', NEW.league_id,
        'player_name', v_player_name,
        'player_id', NEW.player_id
      )
    );
  ELSE
    -- Admin removal → notify removed player
    v_notification_id := create_notification(
      NEW.player_id,
      'league_player_removed',
      jsonb_build_object(
        'league_name', v_league_name
      ),
      NULL, NULL,
      v_creator_id,
      NULL,
      NEW.league_id
    );

    PERFORM send_push_notification(
      NEW.player_id,
      'league_player_removed',
      'Removed from League',
      'You were removed from ' || v_league_name,
      jsonb_build_object(
        'league_name', v_league_name,
        'league_id', NEW.league_id
      )
    );
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trigger_notify_league_player_status_changed ON league_players;
CREATE TRIGGER trigger_notify_league_player_status_changed
  AFTER UPDATE ON league_players
  FOR EACH ROW
  WHEN (OLD.status IS DISTINCT FROM NEW.status)
  EXECUTE FUNCTION notify_league_player_status_changed();

-- =====================================================
-- TRIGGER 3: notify_league_round_tagged
-- AFTER INSERT on league_rounds
-- Notifies all other league members + detects leaderboard changes
-- =====================================================

CREATE OR REPLACE FUNCTION notify_league_round_tagged()
RETURNS TRIGGER AS $$
DECLARE
  v_league_name TEXT;
  v_player_name TEXT;
  v_diff_text TEXT;
  v_notification_id UUID;
  player_record RECORD;
  -- Leaderboard change detection
  old_record RECORD;
  new_record RECORD;
  v_old_rank INTEGER;
  v_new_rank INTEGER;
  v_direction TEXT;
BEGIN
  -- Get league name
  SELECT l.name INTO v_league_name
  FROM leagues l
  WHERE l.id = NEW.league_id;

  -- Get player name
  SELECT p.name INTO v_player_name
  FROM players p
  WHERE p.id = NEW.player_id;

  -- Format differential for display
  v_diff_text := NEW.handicap_differential::TEXT;

  -- Notify all other accepted league members about the tagged round
  FOR player_record IN
    SELECT lp.player_id
    FROM league_players lp
    WHERE lp.league_id = NEW.league_id
      AND lp.status = 'accepted'
      AND lp.player_id != NEW.player_id
  LOOP
    v_notification_id := create_notification(
      player_record.player_id,
      'league_round_tagged',
      jsonb_build_object(
        'league_name', v_league_name,
        'player_name', v_player_name,
        'handicap_differential', v_diff_text
      ),
      NULL, NULL,
      NEW.player_id,
      NULL,
      NEW.league_id
    );

    PERFORM send_push_notification(
      player_record.player_id,
      'league_round_tagged',
      'Round Tagged',
      v_player_name || ' tagged a round to ' || v_league_name || ' (' || v_diff_text || ')',
      jsonb_build_object(
        'league_name', v_league_name,
        'league_id', NEW.league_id,
        'player_name', v_player_name,
        'player_id', NEW.player_id,
        'handicap_differential', v_diff_text
      )
    );
  END LOOP;

  -- =====================================================
  -- LEADERBOARD CHANGE DETECTION
  -- Compare ranks before and after the new round
  -- =====================================================

  -- Build "old" leaderboard (excluding the new round)
  -- and "new" leaderboard (including it), then compare
  FOR new_record IN
    SELECT * FROM get_league_leaderboard(NEW.league_id)
  LOOP
    -- Find this player's rank in old leaderboard (excluding NEW.id)
    v_old_rank := NULL;

    SELECT sub.rank INTO v_old_rank
    FROM (
      WITH player_rounds AS (
        SELECT
          lr.player_id,
          lr.handicap_differential,
          ROW_NUMBER() OVER (PARTITION BY lr.player_id ORDER BY lr.tagged_at DESC) AS rn
        FROM league_rounds lr
        WHERE lr.league_id = NEW.league_id
          AND lr.id != NEW.id
      ),
      windowed AS (
        SELECT * FROM player_rounds WHERE rn <= 20
      ),
      best_rounds AS (
        SELECT
          w.player_id,
          w.handicap_differential,
          ROW_NUMBER() OVER (PARTITION BY w.player_id ORDER BY w.handicap_differential ASC) AS best_rn
        FROM windowed w
      ),
      stats AS (
        SELECT
          br.player_id,
          ROUND(AVG(br.handicap_differential) FILTER (WHERE best_rn <= 8), 1) AS avg_diff
        FROM best_rounds br
        GROUP BY br.player_id
      )
      SELECT
        s.player_id,
        RANK() OVER (ORDER BY s.avg_diff ASC)::INTEGER AS rank
      FROM stats s
    ) sub
    WHERE sub.player_id = new_record.player_id;

    -- If player was not on old leaderboard (new to league), skip
    IF v_old_rank IS NULL THEN
      CONTINUE;
    END IF;

    v_new_rank := new_record.rank;

    -- Only notify if rank changed
    IF v_old_rank != v_new_rank THEN
      IF v_new_rank < v_old_rank THEN
        v_direction := 'up';
      ELSE
        v_direction := 'down';
      END IF;

      v_notification_id := create_notification(
        new_record.player_id,
        'league_leaderboard_changed',
        jsonb_build_object(
          'league_name', v_league_name,
          'old_rank', v_old_rank,
          'new_rank', v_new_rank,
          'direction', v_direction
        ),
        NULL, NULL, NULL, NULL,
        NEW.league_id
      );

      PERFORM send_push_notification(
        new_record.player_id,
        'league_leaderboard_changed',
        'Ranking Changed',
        CASE v_direction
          WHEN 'up' THEN 'You moved up to #' || v_new_rank || ' in ' || v_league_name
          ELSE 'You moved down to #' || v_new_rank || ' in ' || v_league_name
        END,
        jsonb_build_object(
          'league_name', v_league_name,
          'league_id', NEW.league_id,
          'old_rank', v_old_rank,
          'new_rank', v_new_rank,
          'direction', v_direction
        )
      );
    END IF;
  END LOOP;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trigger_notify_league_round_tagged ON league_rounds;
CREATE TRIGGER trigger_notify_league_round_tagged
  AFTER INSERT ON league_rounds
  FOR EACH ROW EXECUTE FUNCTION notify_league_round_tagged();

-- =====================================================
-- TRIGGER 4: notify_round_completed
-- AFTER UPDATE on scorecards WHERE status='completed'
-- Fires when ALL scorecards for a round are completed
-- Uses completion_notified flag to prevent duplicate notifications
-- =====================================================

CREATE OR REPLACE FUNCTION notify_round_completed()
RETURNS TRIGGER AS $$
DECLARE
  v_round_id UUID;
  v_competition_id UUID;
  v_competition_name TEXT;
  v_round_number INTEGER;
  v_total_scorecards INTEGER;
  v_completed_scorecards INTEGER;
  v_updated_id UUID;
  player_record RECORD;
  v_notification_id UUID;
BEGIN
  v_round_id := NEW.round_id;

  -- Get round info
  SELECT r.competition_id, r.round_number
  INTO v_competition_id, v_round_number
  FROM rounds r
  WHERE r.id = v_round_id;

  -- Only for competition rounds
  IF v_competition_id IS NULL THEN
    RETURN NEW;
  END IF;

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

DROP TRIGGER IF EXISTS trigger_notify_round_completed ON scorecards;
CREATE TRIGGER trigger_notify_round_completed
  AFTER UPDATE ON scorecards
  FOR EACH ROW
  WHEN (OLD.status IS DISTINCT FROM 'completed' AND NEW.status = 'completed')
  EXECUTE FUNCTION notify_round_completed();

-- =====================================================
-- COMMENTS
-- =====================================================

COMMENT ON FUNCTION notify_league_player_joined IS
  'Creates in-app notification and sends push when a player joins a league.';

COMMENT ON FUNCTION notify_league_player_status_changed IS
  'Creates in-app notification and sends push when a player leaves or is removed from a league.';

COMMENT ON FUNCTION notify_league_round_tagged IS
  'Creates in-app notifications for league members when a round is tagged, and detects leaderboard rank changes.';

COMMENT ON FUNCTION notify_round_completed IS
  'Creates in-app notification and sends push to all competition players when all scorecards are submitted for a round.';

-- =====================================================
-- MIGRATION COMPLETE
-- =====================================================
