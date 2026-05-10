-- =====================================================
-- RPC: get_player_league_rounds
-- =====================================================
-- Returns a player's tagged league rounds with full scorecard,
-- round, and course details for the LeaguePlayerRoundsModal.
--
-- Why an RPC: the previous client-side approach used two queries
-- (league_rounds + scorecards via PostgREST nested join, then a
-- direct rounds + courses query). The second query is subject to
-- the rounds RLS policy, which only grants visibility to the round
-- owner, competition members, organizers, or friends via the
-- round_players table. League membership alone does not grant
-- access to rounds, so course_name silently fell back to
-- "Unknown Course" whenever the viewer wasn't a participant or
-- friend (via round_players) of the round owner.
--
-- Migration 20260417000000 attempted to fix this with a permissive
-- "League members can view tagged rounds" policy + helper, but
-- that approach is fragile (every future RLS change risks
-- regressing the join). This RPC bypasses RLS via SECURITY DEFINER
-- and enforces authorization with is_league_member() so league
-- members can always see course names for rounds tagged to their
-- league, regardless of the rounds RLS shape.
-- =====================================================

CREATE OR REPLACE FUNCTION get_player_league_rounds(
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
  date_played DATE
) AS $$
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
    r.date AS date_played
  FROM league_rounds lr
  JOIN scorecards sc ON sc.id = lr.scorecard_id
  LEFT JOIN rounds r ON r.id = sc.round_id
  LEFT JOIN courses c ON c.id = r.course_id
  WHERE lr.league_id = p_league_id
    AND lr.player_id = p_player_id
  ORDER BY lr.tagged_at DESC;
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER;

COMMENT ON FUNCTION get_player_league_rounds(UUID, UUID) IS
  'Returns a player''s tagged league rounds with scorecard, round date, and course name. SECURITY DEFINER bypasses rounds RLS so league members always see course names for tagged rounds; authorization enforced via is_league_member().';

GRANT EXECUTE ON FUNCTION get_player_league_rounds(UUID, UUID) TO authenticated;
