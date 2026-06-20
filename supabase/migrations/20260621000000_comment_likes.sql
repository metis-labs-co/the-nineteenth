-- =====================================================
-- Comment likes + comment_liked notification
-- The Nineteenth - Golf Competition App
-- =====================================================
-- Adds round_comment_likes (one like per comment per player), its RLS, and a
-- trigger that notifies a comment's author when an accepted friend likes it.
-- Mirrors round_likes / notify_round_liked. comment_liked is added to
-- should_send_push()'s social-activity branch so it respects push_social_activity
-- (consistent with round_liked / round_commented / round_also_commented).
-- =====================================================

-- -----------------------------------------------------
-- 1. TABLE + RLS
-- -----------------------------------------------------
CREATE TABLE round_comment_likes (
  comment_id UUID NOT NULL REFERENCES round_comments(id) ON DELETE CASCADE,
  player_id  UUID NOT NULL REFERENCES players(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (comment_id, player_id)
);

CREATE INDEX idx_round_comment_likes_comment ON round_comment_likes(comment_id);

ALTER TABLE round_comment_likes ENABLE ROW LEVEL SECURITY;

-- Visible when the comment's round is visible (reuses can_view_round, the same
-- definer helper round_likes / round_comments policies use).
CREATE POLICY round_comment_likes_select ON round_comment_likes FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM round_comments c
    WHERE c.id = comment_id AND c.deleted_at IS NULL AND can_view_round(c.round_id)
  ));

CREATE POLICY round_comment_likes_insert ON round_comment_likes FOR INSERT
  WITH CHECK (player_id = auth.uid() AND EXISTS (
    SELECT 1 FROM round_comments c
    WHERE c.id = comment_id AND c.deleted_at IS NULL AND can_view_round(c.round_id)
  ));

CREATE POLICY round_comment_likes_delete ON round_comment_likes FOR DELETE
  USING (player_id = auth.uid());

GRANT SELECT, INSERT, DELETE ON round_comment_likes TO authenticated;
GRANT ALL ON round_comment_likes TO service_role;

COMMENT ON TABLE round_comment_likes IS 'One like per (comment, player) for activity-feed comments.';

-- -----------------------------------------------------
-- 2. EXTEND notifications TYPE CHECK CONSTRAINT
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
  'round_also_commented',
  'comment_liked'
));

-- -----------------------------------------------------
-- 3. COMMENT-LIKE NOTIFICATION TRIGGER
-- -----------------------------------------------------
CREATE OR REPLACE FUNCTION notify_comment_liked()
RETURNS TRIGGER AS $$
DECLARE
  v_round_id    UUID;
  v_author_id   UUID;
  v_body        TEXT;
  v_actor_name  TEXT;
  v_course_name TEXT;
BEGIN
  SELECT rc.round_id, rc.author_id, rc.body
    INTO v_round_id, v_author_id, v_body
  FROM round_comments rc
  WHERE rc.id = NEW.comment_id;

  -- Comment gone, or a self-like: nothing to notify.
  IF v_author_id IS NULL OR v_author_id = NEW.player_id THEN
    RETURN NEW;
  END IF;

  -- Friend gate: only notify when liker and author are accepted friends
  -- (checked against NEW.player_id directly so it also works for seeded inserts).
  IF NOT EXISTS (
    SELECT 1 FROM friendships f
    WHERE f.status = 'accepted'
      AND ((f.requester_id = NEW.player_id AND f.addressee_id = v_author_id)
        OR (f.addressee_id = NEW.player_id AND f.requester_id = v_author_id))
  ) THEN
    RETURN NEW;
  END IF;

  SELECT name INTO v_actor_name FROM players WHERE id = NEW.player_id;

  SELECT c.name INTO v_course_name
  FROM rounds r
  JOIN courses c ON c.id = r.course_id
  WHERE r.id = v_round_id;

  PERFORM create_notification(
    v_author_id,
    'comment_liked',
    jsonb_build_object(
      'actor_name', v_actor_name,
      'course_name', v_course_name,
      'comment_preview', left(v_body, 80)
    ),
    NULL,           -- competition_id
    v_round_id,     -- round_id
    NEW.player_id,  -- player_id (actor)
    NULL,           -- friendship_id
    NULL            -- league_id
  );

  PERFORM send_push_notification(
    v_author_id,
    'comment_liked',
    'New like',
    v_actor_name || ' liked your comment' || COALESCE(' on a round at ' || v_course_name, ''),
    jsonb_build_object(
      'type', 'comment_liked',
      'roundId', v_round_id,
      'actor_name', v_actor_name,
      'course_name', v_course_name,
      'comment_preview', left(v_body, 80)
    )
  );

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION notify_comment_liked IS 'Notifies a comment author when an accepted friend likes their comment.';

DROP TRIGGER IF EXISTS trigger_notify_comment_liked ON round_comment_likes;
CREATE TRIGGER trigger_notify_comment_liked
  AFTER INSERT ON round_comment_likes
  FOR EACH ROW EXECUTE FUNCTION notify_comment_liked();

-- -----------------------------------------------------
-- 4. EXTEND should_send_push() — gate comment_liked on push_social_activity
-- -----------------------------------------------------
-- Reproduces the full function from 20260615020000_social_activity_push_preference.sql
-- verbatim, with only 'comment_liked' added to the social-activity IN (...) list.
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
        'social_round_invitation',
        'social_round_response'
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

      -- Side-game & prize pool notifications
      WHEN p_notification_type IN (
        'skins_game_completed',
        'skins_game_cancelled',
        'wolf_game_completed',
        'wolf_game_cancelled',
        'prize_pool_settled'
      ) THEN up.push_side_game_updates

      -- Tee-time reminder
      WHEN p_notification_type = 'tee_time_reminder'
        THEN up.push_round_reminders

      -- Social activity (likes & comments on rounds, and comment likes)
      WHEN p_notification_type IN (
        'round_liked',
        'round_commented',
        'round_also_commented',
        'comment_liked'
      ) THEN up.push_social_activity

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
