-- =====================================================
-- "Also commented" activity notifications
-- The Nineteenth - Golf Competition App
-- =====================================================
-- Adds the 'round_also_commented' notification type and extends
-- notify_round_commented() so that prior commenters on a round who are NOT
-- round participants are notified when a new comment is added.
--
-- Recipients (round_also_commented): distinct prior commenters on the round
-- (deleted_at IS NULL), excluding the new comment, the actor, and anyone
-- already notified as a participant (round_commented) for this comment. No
-- friendship filter — they already share the comment thread.
--
-- One notification per person per comment: a participant-friend who also
-- commented earlier receives only the round_commented notification.
--
-- round_also_commented is not added to should_send_push()'s category CASE, so
-- pushes fall through to ELSE TRUE and respect only the master push_enabled
-- toggle, identical to round_commented / round_liked.
-- =====================================================

-- -----------------------------------------------------
-- 1. EXTEND notifications TYPE CHECK CONSTRAINT
-- -----------------------------------------------------
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
  'social_round_response',
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
  -- Activity feed
  'round_liked',
  'round_commented',
  'round_also_commented'
));

-- -----------------------------------------------------
-- 2. REWRITE COMMENT NOTIFICATION TRIGGER FUNCTION
-- -----------------------------------------------------
CREATE OR REPLACE FUNCTION notify_round_commented()
RETURNS TRIGGER AS $$
DECLARE
  v_actor_name             TEXT;
  v_course_name            TEXT;
  v_participant_recipients UUID[] := ARRAY[]::UUID[];
  rec                      RECORD;
BEGIN
  SELECT name INTO v_actor_name FROM players WHERE id = NEW.author_id;

  SELECT c.name INTO v_course_name
  FROM rounds r
  JOIN courses c ON c.id = r.course_id
  WHERE r.id = NEW.round_id;

  -- 2a. Participants who are accepted friends of the commenter (unchanged behaviour)
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
    v_participant_recipients := array_append(v_participant_recipients, rec.pid);

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

  -- 2b. Prior commenters not already notified as participants
  FOR rec IN
    SELECT DISTINCT rc.author_id AS pid
    FROM round_comments rc
    WHERE rc.round_id = NEW.round_id
      AND rc.deleted_at IS NULL
      AND rc.id <> NEW.id
      AND rc.author_id <> NEW.author_id
      AND rc.author_id <> ALL(v_participant_recipients)
  LOOP
    PERFORM create_notification(
      rec.pid,
      'round_also_commented',
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
      'round_also_commented',
      'New comment',
      v_actor_name || ' also commented on a round' || COALESCE(' at ' || v_course_name, ''),
      jsonb_build_object(
        'type', 'round_also_commented',
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

COMMENT ON FUNCTION notify_round_commented IS
  'Notifies participant-friends (round_commented) and prior commenters (round_also_commented) when a round is commented on. One notification per person per comment.';
