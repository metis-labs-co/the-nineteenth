-- =====================================================
-- Activity Feed Notifications — likes & comments
-- The Nineteenth - Golf Competition App
-- =====================================================
-- Adds 'round_liked' and 'round_commented' notification types and
-- triggers on round_likes / round_comments.
--
-- Recipients: round participants (scorecard submitters + round_players
-- + round owner) who are accepted friends of the actor, excluding the
-- actor. Friendship is checked against the actor (NEW.player_id /
-- NEW.author_id) directly rather than auth.uid(), so it also works for
-- service-role / seeded inserts.
--
-- These types are not added to should_send_push()'s category CASE, so
-- they fall through to ELSE TRUE: pushes respect the master push_enabled
-- toggle. (A dedicated "social activity" push preference is a follow-up.)
-- =====================================================

-- =====================================================
-- 1. EXTEND notifications TYPE CHECK CONSTRAINT
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
  -- Side-game & prize pool types
  'skins_game_completed',
  'skins_game_cancelled',
  'wolf_game_completed',
  'wolf_game_cancelled',
  'prize_pool_settled',
  -- Tee-time reminder
  'tee_time_reminder',
  -- Activity feed (NEW)
  'round_liked',
  'round_commented'
));

-- =====================================================
-- 2. LIKE NOTIFICATION TRIGGER
-- =====================================================
CREATE OR REPLACE FUNCTION notify_round_liked()
RETURNS TRIGGER AS $$
DECLARE
  v_actor_name  TEXT;
  v_course_name TEXT;
  rec           RECORD;
BEGIN
  SELECT name INTO v_actor_name FROM players WHERE id = NEW.player_id;

  SELECT c.name INTO v_course_name
  FROM rounds r
  JOIN courses c ON c.id = r.course_id
  WHERE r.id = NEW.round_id;

  FOR rec IN
    SELECT DISTINCT participants.pid
    FROM (
      SELECT sc.player_id AS pid FROM scorecards sc
        WHERE sc.round_id = NEW.round_id AND sc.deleted_at IS NULL
      UNION
      SELECT rp.player_id FROM round_players rp WHERE rp.round_id = NEW.round_id
      UNION
      SELECT r.user_id FROM rounds r WHERE r.id = NEW.round_id AND r.user_id IS NOT NULL
    ) participants
    WHERE participants.pid <> NEW.player_id
      AND EXISTS (
        SELECT 1 FROM friendships f
        WHERE f.status = 'accepted'
          AND ((f.requester_id = NEW.player_id AND f.addressee_id = participants.pid)
            OR (f.addressee_id = NEW.player_id AND f.requester_id = participants.pid))
      )
  LOOP
    PERFORM create_notification(
      rec.pid,
      'round_liked',
      jsonb_build_object('actor_name', v_actor_name, 'course_name', v_course_name),
      NULL,            -- competition_id
      NEW.round_id,    -- round_id
      NEW.player_id,   -- player_id (actor)
      NULL,            -- friendship_id
      NULL             -- league_id
    );

    PERFORM send_push_notification(
      rec.pid,
      'round_liked',
      'New like',
      v_actor_name || ' liked your round' || COALESCE(' at ' || v_course_name, ''),
      jsonb_build_object(
        'type', 'round_liked',
        'roundId', NEW.round_id,
        'actor_name', v_actor_name,
        'course_name', v_course_name
      )
    );
  END LOOP;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION notify_round_liked IS 'Notifies round participants who are accepted friends of the liker when a round is liked.';

DROP TRIGGER IF EXISTS trigger_notify_round_liked ON round_likes;
CREATE TRIGGER trigger_notify_round_liked
  AFTER INSERT ON round_likes
  FOR EACH ROW EXECUTE FUNCTION notify_round_liked();

-- =====================================================
-- 3. COMMENT NOTIFICATION TRIGGER
-- =====================================================
CREATE OR REPLACE FUNCTION notify_round_commented()
RETURNS TRIGGER AS $$
DECLARE
  v_actor_name  TEXT;
  v_course_name TEXT;
  rec           RECORD;
BEGIN
  SELECT name INTO v_actor_name FROM players WHERE id = NEW.author_id;

  SELECT c.name INTO v_course_name
  FROM rounds r
  JOIN courses c ON c.id = r.course_id
  WHERE r.id = NEW.round_id;

  FOR rec IN
    SELECT DISTINCT participants.pid
    FROM (
      SELECT sc.player_id AS pid FROM scorecards sc
        WHERE sc.round_id = NEW.round_id AND sc.deleted_at IS NULL
      UNION
      SELECT rp.player_id FROM round_players rp WHERE rp.round_id = NEW.round_id
      UNION
      SELECT r.user_id FROM rounds r WHERE r.id = NEW.round_id AND r.user_id IS NOT NULL
    ) participants
    WHERE participants.pid <> NEW.author_id
      AND EXISTS (
        SELECT 1 FROM friendships f
        WHERE f.status = 'accepted'
          AND ((f.requester_id = NEW.author_id AND f.addressee_id = participants.pid)
            OR (f.addressee_id = NEW.author_id AND f.requester_id = participants.pid))
      )
  LOOP
    PERFORM create_notification(
      rec.pid,
      'round_commented',
      jsonb_build_object(
        'actor_name', v_actor_name,
        'course_name', v_course_name,
        'comment_preview', left(NEW.body, 80)
      ),
      NULL,            -- competition_id
      NEW.round_id,    -- round_id
      NEW.author_id,   -- player_id (actor)
      NULL,            -- friendship_id
      NULL             -- league_id
    );

    PERFORM send_push_notification(
      rec.pid,
      'round_commented',
      'New comment',
      v_actor_name || ' commented on your round' || COALESCE(' at ' || v_course_name, ''),
      jsonb_build_object(
        'type', 'round_commented',
        'roundId', NEW.round_id,
        'actor_name', v_actor_name,
        'course_name', v_course_name,
        'comment_preview', left(NEW.body, 80)
      )
    );
  END LOOP;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION notify_round_commented IS 'Notifies round participants who are accepted friends of the commenter when a round is commented on.';

DROP TRIGGER IF EXISTS trigger_notify_round_commented ON round_comments;
CREATE TRIGGER trigger_notify_round_commented
  AFTER INSERT ON round_comments
  FOR EACH ROW EXECUTE FUNCTION notify_round_commented();
