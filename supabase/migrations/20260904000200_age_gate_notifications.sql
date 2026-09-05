-- =====================================================
-- Under-13 Social Gating: social notifications
-- The Nineteenth
-- =====================================================
-- INERT until age_gate_config.enforce flips to TRUE.
--
-- Push is delivery, and Apple's requirement is that only age-appropriate UGC is
-- delivered. round_commented / round_also_commented / comment_liked all carry a
-- `comment_preview` field holding the comment body verbatim, so a restricted
-- user would otherwise receive user-generated text on their lock screen while
-- every in-app surface was gated. All four social notification types are
-- suppressed at the recipient.
--
-- Bodies reproduced verbatim from their latest definitions:
--   notify_round_liked      <- 20260521000300_activity_notifications.sql
--   notify_round_commented  <- 20260615010000_round_also_commented_notifications.sql
--   notify_comment_liked    <- 20260621000000_comment_likes.sql
-- The ONLY changes are the added social_enabled() guards.
--
-- Triggers are not recreated: CREATE OR REPLACE FUNCTION keeps the existing
-- trigger bindings intact.
--
-- Safe to re-run.
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
      -- Restricted recipients get no social notifications at all: the push
      -- body carries user-generated text, and push is delivery.
      AND social_enabled(participants.pid)
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
      -- comment_preview carries the comment body verbatim.
      AND social_enabled(participants.pid)
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
      -- v_participant_recipients is initialised to ARRAY[]::UUID[] (never NULL),
      -- so <> ALL(...) is TRUE (not NULL) when the participant loop fired zero times.
      AND rc.author_id <> ALL(v_participant_recipients)
      AND social_enabled(rc.author_id)
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

  -- Restricted recipients get no social notifications.
  IF NOT social_enabled(v_author_id) THEN
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
