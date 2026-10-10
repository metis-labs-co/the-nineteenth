-- =====================================================
-- get_player_league_rounds: add competition_id
-- =====================================================
-- Latest source: 20260526000500_rpc_exclude_soft_deleted_rounds.sql.
-- Change: returns r.competition_id so the league player-rounds sheet can open
-- a competition round with its competition (ViewRound treats a missing
-- competitionId as a standalone round). Also pins search_path.
-- The return type changes, so the function is dropped and recreated.
-- Clients before this change ignore the extra column; the new client falls
-- back to no competition id when it's absent.

DROP FUNCTION IF EXISTS get_player_league_rounds(UUID, UUID);

CREATE FUNCTION get_player_league_rounds(
  p_league_id UUID,
  p_player_id UUID
)
RETURNS TABLE (
  id UUID,
  scorecard_id UUID,
  round_id UUID,
  handicap_differential NUMERIC(4,1),
  tagged_at TIMESTAMPTZ,
  total_gross INTEGER,
  course_rating_used NUMERIC(4,1),
  slope_rating_used INTEGER,
  daily_handicap_used INTEGER,
  course_name TEXT,
  date_played DATE,
  competition_id UUID
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  IF NOT is_league_member(p_league_id, auth.uid()) THEN
    RAISE EXCEPTION 'Not authorized to view league rounds'
      USING ERRCODE = '42501';
  END IF;

  RETURN QUERY
  SELECT
    lr.id,
    lr.scorecard_id,
    sc.round_id,
    lr.handicap_differential,
    lr.tagged_at,
    COALESCE(sc.total_gross, 0) AS total_gross,
    sc.course_rating_used,
    sc.slope_rating_used,
    sc.daily_handicap_used,
    COALESCE(c.name, 'Unknown Course')::TEXT AS course_name,
    r.date AS date_played,
    r.competition_id
  FROM league_rounds lr
  JOIN scorecards sc ON sc.id = lr.scorecard_id AND sc.deleted_at IS NULL
  LEFT JOIN rounds r ON r.id = sc.round_id AND r.deleted_at IS NULL
  LEFT JOIN courses c ON c.id = r.course_id
  WHERE lr.league_id = p_league_id
    AND lr.player_id = p_player_id
  ORDER BY lr.tagged_at DESC;
END;
$$;

GRANT EXECUTE ON FUNCTION get_player_league_rounds(UUID, UUID) TO authenticated;

COMMENT ON FUNCTION get_player_league_rounds(UUID, UUID) IS
  'Returns a player''s tagged league rounds with scorecard, round date, course name and competition id. SECURITY DEFINER bypasses rounds RLS so league members always see course names for tagged rounds; authorization enforced via is_league_member().';
