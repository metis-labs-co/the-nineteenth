-- =====================================================
-- Under-13 Social Gating: enforcement across the social surfaces
-- The Nineteenth
-- =====================================================
-- INERT until age_gate_config.enforce flips to TRUE (see
-- 20260904000000_age_gate_schema.sql). social_enabled() returns TRUE for
-- everyone while the switch is off, so applying this changes nothing.
--
-- social_enabled() is applied to each policy and RPC INDIVIDUALLY and MUST NOT
-- be added to can_view_round(). That helper is shared with round-visibility
-- logic; gating it there would break scorecard visibility for every user.
--
-- Safe to re-run.
-- =====================================================

-- -----------------------------------------------------
-- Comments, photos, likes: read and write
-- -----------------------------------------------------
DROP POLICY IF EXISTS round_comments_select ON round_comments;
CREATE POLICY round_comments_select ON round_comments FOR SELECT
  TO authenticated
  USING (deleted_at IS NULL AND social_enabled() AND can_view_round(round_id));

DROP POLICY IF EXISTS round_comments_insert ON round_comments;
CREATE POLICY round_comments_insert ON round_comments FOR INSERT
  TO authenticated
  WITH CHECK (author_id = auth.uid() AND social_enabled() AND can_view_round(round_id));

DROP POLICY IF EXISTS round_photos_select ON round_photos;
CREATE POLICY round_photos_select ON round_photos FOR SELECT
  TO authenticated
  USING (deleted_at IS NULL AND social_enabled() AND can_view_round(round_id));

DROP POLICY IF EXISTS round_photos_insert ON round_photos;
CREATE POLICY round_photos_insert ON round_photos FOR INSERT
  TO authenticated
  WITH CHECK (uploader_id = auth.uid() AND social_enabled() AND can_view_round(round_id));

DROP POLICY IF EXISTS round_likes_select ON round_likes;
CREATE POLICY round_likes_select ON round_likes FOR SELECT
  TO authenticated
  USING (social_enabled() AND can_view_round(round_id));

DROP POLICY IF EXISTS round_likes_insert ON round_likes;
CREATE POLICY round_likes_insert ON round_likes FOR INSERT
  TO authenticated
  WITH CHECK (player_id = auth.uid() AND social_enabled() AND can_view_round(round_id));

DROP POLICY IF EXISTS round_comment_likes_select ON round_comment_likes;
CREATE POLICY round_comment_likes_select ON round_comment_likes FOR SELECT
  TO authenticated
  USING (social_enabled());

DROP POLICY IF EXISTS round_comment_likes_insert ON round_comment_likes;
CREATE POLICY round_comment_likes_insert ON round_comment_likes FOR INSERT
  TO authenticated
  WITH CHECK (player_id = auth.uid() AND social_enabled());

-- -----------------------------------------------------
-- Friend requests
-- -----------------------------------------------------
-- Existing friendships are deliberately RETAINED when a user is reclassified
-- (spec section 6.5) - only new ones are blocked, so this touches INSERT only.
DROP POLICY IF EXISTS "Users can send friend requests" ON friendships;
CREATE POLICY "Users can send friend requests" ON friendships FOR INSERT
  TO authenticated
  WITH CHECK (
    auth.uid() = requester_id
    AND social_enabled(requester_id)
    AND social_enabled(addressee_id)
  );

-- -----------------------------------------------------
-- Player search
-- -----------------------------------------------------
-- The players SELECT policy is a blanket "Authenticated users can search
-- players" USING (TRUE) that competitions, leaderboards and pairings all rely
-- on. Editing it would break unrelated reads, so search enforcement moves into
-- a dedicated RPC and the blanket policy is left alone.
--
-- Returns an explicit column list, NOT SETOF players: a SECURITY DEFINER
-- function bypasses RLS, so SELECT p.* would hand every caller each player's
-- email and phone. SearchResultCard renders only name, photo and handicap.
CREATE OR REPLACE FUNCTION search_players(p_query TEXT)
RETURNS TABLE (
  id        UUID,
  name      TEXT,
  photo_url TEXT,
  handicap  NUMERIC
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
  SELECT p.id, p.name::TEXT, p.photo_url::TEXT, p.handicap
  FROM players p
  WHERE social_enabled()                 -- the searcher must be eligible
    AND social_enabled(p.id)             -- under-13s are not discoverable
    AND p.id <> auth.uid()
    AND p.is_placeholder IS NOT TRUE
    AND p.name ILIKE '%' || p_query || '%'
  ORDER BY p.name
  LIMIT 25;
$$;

GRANT EXECUTE ON FUNCTION search_players(TEXT) TO authenticated;

-- -----------------------------------------------------
-- Activity feed
-- -----------------------------------------------------
-- Bodies reproduced verbatim from their latest definition
-- (20260616000000_activity_feed_course_id.sql). The ONLY change is one added
-- `AND social_enabled()` predicate in each WHERE clause. Return types are
-- unchanged, so CREATE OR REPLACE is sufficient - no DROP required.

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
    ), '[]'::jsonb),
    (SELECT COUNT(*) FROM round_likes rl WHERE rl.round_id = vr.id)::INT,
    (SELECT COUNT(*) FROM round_comments rc WHERE rc.round_id = vr.id AND rc.deleted_at IS NULL)::INT,
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
    ), '[]'::jsonb),
    (SELECT COUNT(*) FROM round_likes rl WHERE rl.round_id = r.id)::INT,
    (SELECT COUNT(*) FROM round_comments rc WHERE rc.round_id = r.id AND rc.deleted_at IS NULL)::INT,
    EXISTS (SELECT 1 FROM round_likes rl WHERE rl.round_id = r.id AND rl.player_id = auth.uid())
  FROM rounds r
  JOIN courses co ON co.id = r.course_id
  JOIN clubs cl ON cl.id = co.club_id
  WHERE r.id = p_round_id
    AND r.deleted_at IS NULL
    AND social_enabled()
    AND can_view_round(r.id);
$$;

-- -----------------------------------------------------
-- Global achievement leaderboard
-- -----------------------------------------------------
-- Body reproduced verbatim from its latest definition
-- (20251230000000_achievements.sql, second definition). The ONLY change is the
-- 'global' branch of the scope CASE, which now consults social_enabled().
-- 'friends' and 'competition' scopes are unchanged.

CREATE OR REPLACE FUNCTION get_achievement_leaderboard(
  p_scope TEXT,
  p_user_id UUID,
  p_competition_id UUID DEFAULT NULL,
  p_limit INTEGER DEFAULT 50
)
RETURNS TABLE (
  rank BIGINT,
  player_id UUID,
  name TEXT,
  photo_url TEXT,
  equipped_badge_id UUID,
  equipped_frame_id UUID,
  equipped_title_id UUID,
  total_points INTEGER,
  achievements_earned INTEGER,
  last_achievement_at TIMESTAMPTZ
) AS $$
BEGIN
  RETURN QUERY
  WITH leaderboard_base AS (
    SELECT
      p.id AS player_id,
      p.name,
      p.photo_url,
      p.equipped_badge_id,
      p.equipped_frame_id,
      p.equipped_title_id,
      COALESCE(SUM(ad.points), 0)::INTEGER AS total_points,
      COUNT(pa.id)::INTEGER AS achievements_earned,
      MAX(pa.earned_at) AS last_achievement_at
    FROM players p
    LEFT JOIN player_achievements pa ON p.id = pa.player_id
    LEFT JOIN achievement_definitions ad ON pa.achievement_id = ad.id
    WHERE p.is_placeholder = FALSE
    GROUP BY p.id, p.name, p.photo_url, p.equipped_badge_id, p.equipped_frame_id, p.equipped_title_id
  ),
  filtered AS (
    SELECT lb.*
    FROM leaderboard_base lb
    WHERE
      CASE p_scope
        -- Gated: restricted users get an empty global board. The 'friends'
        -- and 'competition' scopes are deliberately untouched.
        WHEN 'global' THEN social_enabled()
        WHEN 'friends' THEN
          lb.player_id = p_user_id OR
          lb.player_id IN (
            SELECT
              CASE
                WHEN requester_id = p_user_id THEN addressee_id
                ELSE requester_id
              END
            FROM friendships
            WHERE (requester_id = p_user_id OR addressee_id = p_user_id)
              AND status = 'accepted'
          )
        WHEN 'competition' THEN
          lb.player_id IN (
            SELECT cp.player_id
            FROM competition_players cp
            WHERE cp.competition_id = p_competition_id
              AND cp.status = 'accepted'
          )
        ELSE FALSE
      END
  )
  SELECT
    ROW_NUMBER() OVER (ORDER BY f.total_points DESC, f.achievements_earned DESC) AS rank,
    f.player_id,
    f.name,
    f.photo_url,
    f.equipped_badge_id,
    f.equipped_frame_id,
    f.equipped_title_id,
    f.total_points,
    f.achievements_earned,
    f.last_achievement_at
  FROM filtered f
  LIMIT p_limit;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
