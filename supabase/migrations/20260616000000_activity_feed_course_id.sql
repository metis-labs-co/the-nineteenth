-- =====================================================
-- Activity Feed RPCs: expose course_id + club_id
-- The Nineteenth - Golf Competition App
-- =====================================================
-- Adds course_id and club_id to get_activity_feed and get_round_feed_card
-- so the activity card can deep-link the course row to the Course detail
-- screen (navigate('Course', { courseId, clubId })).
--
-- Bodies reproduced verbatim from their latest prior definition
-- (20260521000200_activity_feed_rpc.sql; unchanged by
-- 20260526000500_rpc_exclude_soft_deleted_rounds.sql). ONLY the two new
-- output columns (course_id, club_id) are added.
-- =====================================================

-- Adding columns to a RETURNS TABLE signature changes the function's return
-- type, which CREATE OR REPLACE cannot do — drop the old definitions first.
-- Safe: these functions are only called from the client via rpc(); no policy,
-- view, or other function depends on them.

-- =====================================================
-- get_activity_feed
-- =====================================================
DROP FUNCTION IF EXISTS get_activity_feed(INT, TIMESTAMPTZ);

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
    ), '[]'::jsonb),
    (SELECT COUNT(*) FROM round_likes rl WHERE rl.round_id = vr.id)::INT,
    (SELECT COUNT(*) FROM round_comments rc WHERE rc.round_id = vr.id AND rc.deleted_at IS NULL)::INT,
    EXISTS (SELECT 1 FROM round_likes rl WHERE rl.round_id = vr.id AND rl.player_id = auth.uid())
  FROM visible_rounds vr
  JOIN courses co ON co.id = vr.course_id
  JOIN clubs cl ON cl.id = co.club_id
  ORDER BY vr.activity_at DESC, vr.id DESC;
$$;

COMMENT ON FUNCTION get_activity_feed(INT, TIMESTAMPTZ) IS
  'Keyset-paginated activity feed: completed rounds where the viewer or an accepted friend has a submitted scorecard. SECURITY DEFINER; self-authorizing via is_friend(). Cursor = activity_at (MAX submitted_at). Returns course_id/club_id for course deep-linking.';

GRANT EXECUTE ON FUNCTION get_activity_feed(INT, TIMESTAMPTZ) TO authenticated;

-- =====================================================
-- get_round_feed_card
-- =====================================================
DROP FUNCTION IF EXISTS get_round_feed_card(UUID);

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
    ), '[]'::jsonb),
    (SELECT COUNT(*) FROM round_likes rl WHERE rl.round_id = r.id)::INT,
    (SELECT COUNT(*) FROM round_comments rc WHERE rc.round_id = r.id AND rc.deleted_at IS NULL)::INT,
    EXISTS (SELECT 1 FROM round_likes rl WHERE rl.round_id = r.id AND rl.player_id = auth.uid())
  FROM rounds r
  JOIN courses co ON co.id = r.course_id
  JOIN clubs cl ON cl.id = co.club_id
  WHERE r.id = p_round_id
    AND r.deleted_at IS NULL
    AND can_view_round(r.id);
$$;

COMMENT ON FUNCTION get_round_feed_card(UUID) IS
  'Single-round activity card for round detail / notification deep links. SECURITY DEFINER; authorized via can_view_round(). Returns course_id/club_id for course deep-linking.';

GRANT EXECUTE ON FUNCTION get_round_feed_card(UUID) TO authenticated;
