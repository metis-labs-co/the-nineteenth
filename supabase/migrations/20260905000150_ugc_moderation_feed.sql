-- =====================================================
-- UGC moderation: filter blocked and reported rows out of the feed RPCs
-- The Nineteenth
-- =====================================================
-- get_activity_feed and get_round_feed_card are SECURITY DEFINER, which
-- BYPASSES RLS. They read round_photos / round_comments / round_likes directly,
-- so the policies in 20260905000100 do not reach them: without this migration a
-- blocked user's photos still appear in your feed card and their comments and
-- likes still count toward the totals. Blocking would simply not work.
--
-- Bodies reproduced verbatim from 20260904000100_age_gate_policies.sql. The only
-- changes are the added is_blocked_pair() / is_reported_by_viewer() predicates.
--
-- Deliberately NOT filtered:
--   * participants - states who played the round, a fact rather than UGC.
--     Blanking a playing partner out of a scorecard would be wrong.
--   * viewer_has_liked - that is the viewer's OWN like. Do not "tidy" it by
--     adding a predicate.
--
-- Safe to re-run.
-- =====================================================

CREATE OR REPLACE FUNCTION get_activity_feed(
  p_limit  INT DEFAULT 20,
  p_before TIMESTAMPTZ DEFAULT NULL
)
RETURNS TABLE (
  round_id         UUID,
  competition_id   UUID,
  course_id        UUID,
  club_id          UUID,
  course_name      TEXT,
  club_name        TEXT,
  club_location    TEXT,
  round_date       DATE,
  game_type        TEXT,
  is_team_round    BOOLEAN,
  activity_at      TIMESTAMPTZ,
  participants     JSONB,
  photos           JSONB,
  like_count       INT,
  comment_count    INT,
  viewer_has_liked BOOLEAN
)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public, pg_temp AS $$
  WITH visible_rounds AS (
    SELECT r.id, r.competition_id, r.course_id, r.date, r.game_type, r.is_team_round,
           MAX(sc.submitted_at) AS activity_at
    FROM rounds r
    JOIN scorecards sc ON sc.round_id = r.id
      AND sc.deleted_at IS NULL
      AND sc.status IN ('completed', 'confirmed')
      AND sc.submitted_at IS NOT NULL
    WHERE r.status = 'completed'
      AND r.deleted_at IS NULL
      AND social_enabled()
      AND EXISTS (
        SELECT 1 FROM scorecards f
        WHERE f.round_id = r.id
          AND f.deleted_at IS NULL
          AND (f.player_id = auth.uid() OR is_friend(f.player_id))
      )
    GROUP BY r.id, r.competition_id, r.course_id, r.date, r.game_type, r.is_team_round
    HAVING (p_before IS NULL OR MAX(sc.submitted_at) < p_before)
    ORDER BY MAX(sc.submitted_at) DESC, r.id DESC
    LIMIT GREATEST(p_limit, 1)
  )
  SELECT
    vr.id,
    vr.competition_id,
    co.id,
    cl.id,
    co.name::TEXT,
    cl.name::TEXT,
    NULLIF(concat_ws(', ', cl.city, cl.state), '')::TEXT,
    vr.date,
    vr.game_type::TEXT,
    vr.is_team_round,
    vr.activity_at,
    COALESCE((
      SELECT jsonb_agg(jsonb_build_object(
               'player_id', p.id,
               'name', p.name,
               'photo_url', p.photo_url,
               'total_gross', sc.total_gross,
               'total_net', sc.total_net,
               'total_points', sc.total_points
             ) ORDER BY sc.total_points DESC NULLS LAST)
      FROM scorecards sc
      JOIN players p ON p.id = sc.player_id
      WHERE sc.round_id = vr.id
        AND sc.deleted_at IS NULL
        AND sc.status IN ('completed', 'confirmed')
    ), '[]'::jsonb),
    COALESCE((
      SELECT jsonb_agg(jsonb_build_object(
               'id', ph.id,
               'storage_path', ph.storage_path,
               'width', ph.width,
               'height', ph.height,
               'uploader_id', ph.uploader_id
             ) ORDER BY ph.created_at)
      FROM round_photos ph
      WHERE ph.round_id = vr.id AND ph.deleted_at IS NULL
        AND NOT is_blocked_pair(auth.uid(), ph.uploader_id)
        AND NOT is_reported_by_viewer('round_photo', ph.id)
    ), '[]'::jsonb),
    (SELECT COUNT(*) FROM round_likes rl
      WHERE rl.round_id = vr.id
        AND NOT is_blocked_pair(auth.uid(), rl.player_id))::INT,
    (SELECT COUNT(*) FROM round_comments rc
      WHERE rc.round_id = vr.id AND rc.deleted_at IS NULL
        AND NOT is_blocked_pair(auth.uid(), rc.author_id)
        AND NOT is_reported_by_viewer('round_comment', rc.id))::INT,
    EXISTS (SELECT 1 FROM round_likes rl WHERE rl.round_id = vr.id AND rl.player_id = auth.uid())
  FROM visible_rounds vr
  JOIN courses co ON co.id = vr.course_id
  JOIN clubs cl ON cl.id = co.club_id
  ORDER BY vr.activity_at DESC, vr.id DESC;
$$;

CREATE OR REPLACE FUNCTION get_round_feed_card(p_round_id UUID)
RETURNS TABLE (
  round_id         UUID,
  competition_id   UUID,
  course_id        UUID,
  club_id          UUID,
  course_name      TEXT,
  club_name        TEXT,
  club_location    TEXT,
  round_date       DATE,
  game_type        TEXT,
  is_team_round    BOOLEAN,
  activity_at      TIMESTAMPTZ,
  participants     JSONB,
  photos           JSONB,
  like_count       INT,
  comment_count    INT,
  viewer_has_liked BOOLEAN
)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public, pg_temp AS $$
  SELECT
    r.id,
    r.competition_id,
    co.id,
    cl.id,
    co.name::TEXT,
    cl.name::TEXT,
    NULLIF(concat_ws(', ', cl.city, cl.state), '')::TEXT,
    r.date,
    r.game_type::TEXT,
    r.is_team_round,
    (SELECT MAX(sc.submitted_at) FROM scorecards sc
       WHERE sc.round_id = r.id AND sc.deleted_at IS NULL),
    COALESCE((
      SELECT jsonb_agg(jsonb_build_object(
               'player_id', p.id,
               'name', p.name,
               'photo_url', p.photo_url,
               'total_gross', sc.total_gross,
               'total_net', sc.total_net,
               'total_points', sc.total_points
             ) ORDER BY sc.total_points DESC NULLS LAST)
      FROM scorecards sc
      JOIN players p ON p.id = sc.player_id
      WHERE sc.round_id = r.id
        AND sc.deleted_at IS NULL
        AND sc.status IN ('completed', 'confirmed')
    ), '[]'::jsonb),
    COALESCE((
      SELECT jsonb_agg(jsonb_build_object(
               'id', ph.id,
               'storage_path', ph.storage_path,
               'width', ph.width,
               'height', ph.height,
               'uploader_id', ph.uploader_id
             ) ORDER BY ph.created_at)
      FROM round_photos ph
      WHERE ph.round_id = r.id AND ph.deleted_at IS NULL
        AND NOT is_blocked_pair(auth.uid(), ph.uploader_id)
        AND NOT is_reported_by_viewer('round_photo', ph.id)
    ), '[]'::jsonb),
    (SELECT COUNT(*) FROM round_likes rl
      WHERE rl.round_id = r.id
        AND NOT is_blocked_pair(auth.uid(), rl.player_id))::INT,
    (SELECT COUNT(*) FROM round_comments rc
      WHERE rc.round_id = r.id AND rc.deleted_at IS NULL
        AND NOT is_blocked_pair(auth.uid(), rc.author_id)
        AND NOT is_reported_by_viewer('round_comment', rc.id))::INT,
    EXISTS (SELECT 1 FROM round_likes rl WHERE rl.round_id = r.id AND rl.player_id = auth.uid())
  FROM rounds r
  JOIN courses co ON co.id = r.course_id
  JOIN clubs cl ON cl.id = co.club_id
  WHERE r.id = p_round_id
    AND r.deleted_at IS NULL
    AND social_enabled()
    AND can_view_round(r.id);
$$;
