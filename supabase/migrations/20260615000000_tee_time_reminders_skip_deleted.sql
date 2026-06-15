-- Migration: tee-time reminders must skip soft-deleted rounds
--
-- send_tee_time_reminders() selected candidate rounds on `r.status = 'upcoming'`
-- only. soft_delete_round() stamps `deleted_at` but intentionally leaves
-- `status = 'upcoming'`, so a soft-deleted scheduled round kept matching the
-- cron query and still fired a tee-time reminder push + in-app notification to
-- a round the user had already deleted.
--
-- Fix: filter `r.deleted_at IS NULL` in the candidate_rounds CTE, matching the
-- `deleted_at IS NULL` filtering the rest of the codebase already applies. This
-- is the lowest-risk, query-level fix; the function is otherwise unchanged.

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
        AND r.deleted_at IS NULL
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
  'Sends a 30-min tee-time reminder push + in-app notification to each player with a round teeing off in the next 25-35 min. Skips soft-deleted rounds (deleted_at IS NULL). Idempotent via tee_time_reminder_sent.';
