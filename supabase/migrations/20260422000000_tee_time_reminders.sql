-- =====================================================
-- Tee-Time Reminder Push Notifications
-- The Nineteenth - Golf Competition App
-- =====================================================
-- This migration adds:
--   1. 'tee_time_reminder' notification type (CHECK constraint update)
--   2. push_round_reminders preference column on user_preferences
--   3. courses.timezone (IANA), backfilled from state
--   4. tee_time_reminder_sent tracking table (idempotency)
--   5. Extended should_send_push()       (new category branch)
--   6. Extended get_user_push_preferences() + update_push_preferences()
--   7. send_tee_time_reminders() function
--   8. pg_cron job: 'send-tee-time-reminders' (runs every 5 min)
--
-- Runtime assumptions:
--   - pg_cron extension already enabled
--     (see 20250120000000_pg_cron_deactivate_competitions.sql)
--   - pg_net extension already enabled + send_push_notification() exists
--     (see 20250315000000_notification_triggers_push.sql)
--   - create_notification() exists
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
  -- Side-game & prize pool types
  'skins_game_completed',
  'skins_game_cancelled',
  'wolf_game_completed',
  'wolf_game_cancelled',
  'prize_pool_settled',
  -- Tee-time reminder (NEW)
  'tee_time_reminder'
));

-- =====================================================
-- 2. ADD push_round_reminders COLUMN TO user_preferences
-- =====================================================

ALTER TABLE user_preferences
  ADD COLUMN IF NOT EXISTS push_round_reminders BOOLEAN NOT NULL DEFAULT TRUE;

COMMENT ON COLUMN user_preferences.push_round_reminders IS
  'Toggle for tee-time reminder push notifications (30 min before a round).';

-- =====================================================
-- 3. ADD timezone COLUMN TO courses
-- =====================================================
-- Stored as IANA timezone string (e.g. 'Australia/Sydney').
-- Needed because rounds.tee_time is a plain TIME; we must know
-- the local clock reference to compute the UTC instant.
--
-- Backfill via courses.club_id -> clubs.state (state was moved to
-- clubs/venues in 20250121000000_venues_courses_refactor.sql and
-- the table was renamed in 20260117122305_rename_venues_to_clubs.sql).
-- The state CHECK constraint was removed in 20260227100000, so state
-- may be NULL or any string — we fall through to Australia/Sydney.

ALTER TABLE courses
  ADD COLUMN IF NOT EXISTS timezone TEXT;

UPDATE courses c
SET timezone = CASE cl.state
  WHEN 'VIC' THEN 'Australia/Melbourne'
  WHEN 'NSW' THEN 'Australia/Sydney'
  WHEN 'ACT' THEN 'Australia/Sydney'
  WHEN 'QLD' THEN 'Australia/Brisbane'
  WHEN 'SA'  THEN 'Australia/Adelaide'
  WHEN 'WA'  THEN 'Australia/Perth'
  WHEN 'TAS' THEN 'Australia/Hobart'
  WHEN 'NT'  THEN 'Australia/Darwin'
  ELSE 'Australia/Sydney'
END
FROM clubs cl
WHERE c.club_id = cl.id
  AND c.timezone IS NULL;

-- Catch any orphaned courses (no matching club row or NULL club_id)
UPDATE courses SET timezone = 'Australia/Sydney' WHERE timezone IS NULL;

ALTER TABLE courses ALTER COLUMN timezone SET DEFAULT 'Australia/Sydney';
ALTER TABLE courses ALTER COLUMN timezone SET NOT NULL;

COMMENT ON COLUMN courses.timezone IS
  'IANA timezone identifier used to interpret rounds.tee_time and pairings.tee_time.';

-- =====================================================
-- 4. IDEMPOTENCY TRACKER TABLE
-- =====================================================
-- One row per (round, player) that has received a reminder.
-- Prevents duplicates across cron overlaps, retries, or manual replays.

CREATE TABLE IF NOT EXISTS tee_time_reminder_sent (
  round_id UUID NOT NULL REFERENCES rounds(id) ON DELETE CASCADE,
  player_id UUID NOT NULL REFERENCES players(id) ON DELETE CASCADE,
  sent_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (round_id, player_id)
);

CREATE INDEX IF NOT EXISTS idx_tee_time_reminder_sent_at
  ON tee_time_reminder_sent(sent_at);

COMMENT ON TABLE tee_time_reminder_sent IS
  'Tracks which (round, player) pairs have been sent a 30-min tee-time reminder.';

-- =====================================================
-- 5. EXTEND should_send_push() WITH tee_time_reminder BRANCH
-- =====================================================
-- Rebuilt from the latest version in 20260329000000 to preserve
-- all existing category mappings.

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

      -- Side-game & prize pool notifications
      WHEN p_notification_type IN (
        'skins_game_completed',
        'skins_game_cancelled',
        'wolf_game_completed',
        'wolf_game_cancelled',
        'prize_pool_settled'
      ) THEN up.push_side_game_updates

      -- Tee-time reminder (NEW)
      WHEN p_notification_type = 'tee_time_reminder'
        THEN up.push_round_reminders

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
-- 6. EXTEND get_user_push_preferences() + update_push_preferences()
-- =====================================================

DROP FUNCTION IF EXISTS get_user_push_preferences(UUID);

CREATE OR REPLACE FUNCTION get_user_push_preferences(p_user_id UUID)
RETURNS TABLE (
  push_enabled BOOLEAN,
  push_competition_updates BOOLEAN,
  push_friend_requests BOOLEAN,
  push_scorecard_updates BOOLEAN,
  push_league_updates BOOLEAN,
  push_side_game_updates BOOLEAN,
  push_round_reminders BOOLEAN
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    up.push_enabled,
    up.push_competition_updates,
    up.push_friend_requests,
    up.push_scorecard_updates,
    up.push_league_updates,
    up.push_side_game_updates,
    up.push_round_reminders
  FROM user_preferences up
  WHERE up.user_id = p_user_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP FUNCTION IF EXISTS update_push_preferences(UUID, BOOLEAN, BOOLEAN, BOOLEAN, BOOLEAN, BOOLEAN, BOOLEAN);

CREATE OR REPLACE FUNCTION update_push_preferences(
  p_user_id UUID,
  p_push_enabled BOOLEAN DEFAULT NULL,
  p_push_competition_updates BOOLEAN DEFAULT NULL,
  p_push_friend_requests BOOLEAN DEFAULT NULL,
  p_push_scorecard_updates BOOLEAN DEFAULT NULL,
  p_push_league_updates BOOLEAN DEFAULT NULL,
  p_push_side_game_updates BOOLEAN DEFAULT NULL,
  p_push_round_reminders BOOLEAN DEFAULT NULL
)
RETURNS TABLE (
  push_enabled BOOLEAN,
  push_competition_updates BOOLEAN,
  push_friend_requests BOOLEAN,
  push_scorecard_updates BOOLEAN,
  push_league_updates BOOLEAN,
  push_side_game_updates BOOLEAN,
  push_round_reminders BOOLEAN
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
    push_round_reminders = COALESCE(p_push_round_reminders, user_preferences.push_round_reminders),
    updated_at = NOW()
  WHERE user_id = p_user_id;

  RETURN QUERY
  SELECT
    up.push_enabled,
    up.push_competition_updates,
    up.push_friend_requests,
    up.push_scorecard_updates,
    up.push_league_updates,
    up.push_side_game_updates,
    up.push_round_reminders
  FROM user_preferences up
  WHERE up.user_id = p_user_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =====================================================
-- 7. send_tee_time_reminders() FUNCTION
-- =====================================================
-- Finds rounds whose tee time (in course-local timezone) falls
-- 25-35 min from now and have not yet been reminded. Covers:
--   - Competition rounds: iterates pairings.player_ids, uses
--     pairings.tee_time with fallback to rounds.tee_time
--   - Standalone rounds: iterates round_players, uses rounds.tee_time
--
-- Creates an in-app notification AND dispatches a push per player.
-- Records the (round, player) pair in tee_time_reminder_sent to
-- guarantee idempotency across cron overlaps.

CREATE OR REPLACE FUNCTION send_tee_time_reminders()
RETURNS void AS $$
DECLARE
  target RECORD;
  v_tee_time_local TIMESTAMP;
  v_push_title TEXT;
  v_push_body TEXT;
  v_notification_id UUID;
BEGIN
  FOR target IN
    WITH candidate_rounds AS (
      SELECT
        r.id                                      AS round_id,
        r.competition_id,
        r.round_number,
        r.date,
        r.tee_time                                AS round_tee_time,
        c.id                                      AS course_id,
        c.name                                    AS course_name,
        c.timezone                                AS tz,
        comp.name                                 AS competition_name
      FROM rounds r
      JOIN courses c ON c.id = r.course_id
      LEFT JOIN competitions comp ON comp.id = r.competition_id
      WHERE r.status = 'upcoming'
        AND r.date IS NOT NULL
        -- Narrow to rounds scheduled within ~2 day window of now (handles tz drift)
        AND r.date BETWEEN (now() AT TIME ZONE 'UTC')::date - 1
                       AND (now() AT TIME ZONE 'UTC')::date + 1
    ),
    -- Competition rounds: one row per (pairing, player)
    competition_targets AS (
      SELECT
        cr.round_id,
        cr.competition_id,
        cr.competition_name,
        cr.round_number,
        cr.course_name,
        cr.tz,
        unnest(p.player_ids)                                        AS player_id,
        COALESCE(p.tee_time, cr.round_tee_time)                     AS tee_time_local_part,
        (cr.date::timestamp + COALESCE(p.tee_time, cr.round_tee_time))
          AT TIME ZONE cr.tz                                        AS tee_at_utc
      FROM candidate_rounds cr
      JOIN pairings p ON p.round_id = cr.round_id
      WHERE cr.competition_id IS NOT NULL
        AND COALESCE(p.tee_time, cr.round_tee_time) IS NOT NULL
    ),
    -- Standalone rounds: one row per round_players entry
    standalone_targets AS (
      SELECT
        cr.round_id,
        cr.competition_id,
        cr.competition_name,
        cr.round_number,
        cr.course_name,
        cr.tz,
        rp.player_id,
        cr.round_tee_time                                           AS tee_time_local_part,
        (cr.date::timestamp + cr.round_tee_time)
          AT TIME ZONE cr.tz                                        AS tee_at_utc
      FROM candidate_rounds cr
      JOIN round_players rp ON rp.round_id = cr.round_id
      WHERE cr.competition_id IS NULL
        AND cr.round_tee_time IS NOT NULL
    ),
    all_targets AS (
      SELECT * FROM competition_targets
      UNION ALL
      SELECT * FROM standalone_targets
    )
    SELECT t.*
    FROM all_targets t
    LEFT JOIN tee_time_reminder_sent s
      ON s.round_id = t.round_id AND s.player_id = t.player_id
    WHERE s.round_id IS NULL
      AND t.tee_at_utc BETWEEN now() + interval '25 minutes'
                           AND now() + interval '35 minutes'
  LOOP
    -- Local wall-clock time for display (e.g. 08:45 AM)
    v_tee_time_local := target.tee_at_utc AT TIME ZONE target.tz;

    v_push_title := 'Tee time in 30 min';

    IF target.competition_name IS NOT NULL THEN
      v_push_body := target.competition_name
        || ' at ' || target.course_name
        || ' · ' || to_char(v_tee_time_local, 'HH12:MI AM');
    ELSE
      v_push_body := target.course_name
        || ' · ' || to_char(v_tee_time_local, 'HH12:MI AM');
    END IF;

    -- Create in-app notification (appears in notifications list)
    v_notification_id := create_notification(
      target.player_id,
      'tee_time_reminder',
      jsonb_build_object(
        'competition_name', target.competition_name,
        'round_number',     target.round_number,
        'course_name',      target.course_name,
        'tee_time_local',   to_char(v_tee_time_local, 'HH12:MI AM'),
        'tee_time_utc',     target.tee_at_utc
      ),
      target.competition_id,  -- p_competition_id (NULL for standalone)
      target.round_id,        -- p_round_id
      NULL,                   -- p_player_id (no triggerer; system-generated)
      NULL,                   -- p_friendship_id
      NULL                    -- p_league_id
    );

    -- Dispatch push (edge function filters on should_send_push)
    PERFORM send_push_notification(
      target.player_id,
      'tee_time_reminder',
      v_push_title,
      v_push_body,
      jsonb_build_object(
        'type',            'tee_time_reminder',
        'roundId',         target.round_id,
        'competitionId',   target.competition_id,
        'courseName',      target.course_name,
        'competitionName', target.competition_name,
        'roundNumber',     target.round_number,
        'teeTime',         target.tee_at_utc,
        'teeTimeLocal',    to_char(v_tee_time_local, 'HH12:MI AM')
      )
    );

    -- Mark as sent (idempotency)
    INSERT INTO tee_time_reminder_sent (round_id, player_id)
    VALUES (target.round_id, target.player_id)
    ON CONFLICT DO NOTHING;
  END LOOP;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION send_tee_time_reminders IS
  'Sends a 30-min tee-time reminder push + in-app notification to each player with a round teeing off in the next 25-35 min. Idempotent via tee_time_reminder_sent.';

-- =====================================================
-- 8. SCHEDULE pg_cron JOB
-- =====================================================
-- Runs every 5 minutes. The 25-35 min window guarantees each
-- round is caught by at least one run even with small cron jitter.

SELECT cron.schedule(
  'send-tee-time-reminders',
  '*/5 * * * *',
  $$SELECT send_tee_time_reminders()$$
);

-- =====================================================
-- Verification & Management Queries (for reference)
-- =====================================================
--
-- View all scheduled jobs:
--   SELECT * FROM cron.job;
--
-- View job run history:
--   SELECT * FROM cron.job_run_details
--     WHERE jobname = 'send-tee-time-reminders'
--     ORDER BY start_time DESC LIMIT 10;
--
-- Manually run the reminder sweep:
--   SELECT send_tee_time_reminders();
--
-- Unschedule:
--   SELECT cron.unschedule('send-tee-time-reminders');
--
-- =====================================================
-- MIGRATION COMPLETE
-- =====================================================
