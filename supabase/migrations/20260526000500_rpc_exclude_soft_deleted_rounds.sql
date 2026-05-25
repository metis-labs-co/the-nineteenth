-- Migration: exclude soft-deleted rounds + scorecards from round-listing RPCs
-- Adds `AND <alias>.deleted_at IS NULL` to rounds and scorecards references in
-- the functions below. Bodies are reproduced verbatim from their latest prior
-- definitions; only the soft-delete filters are added.
--
-- Changed:   get_player_league_rounds
--              JOIN scorecards sc now also carries AND sc.deleted_at IS NULL
--              so a soft-deleted scorecard drops the entire row from the
--              player's league history (correct — soft_delete_round sets both
--              rounds.deleted_at AND scorecards.deleted_at simultaneously).
--              LEFT JOIN rounds r also carries AND r.deleted_at IS NULL
--              (previously added in this migration) to exclude soft-deleted
--              rounds from course-name / date lookups.
--
--            get_league_leaderboard_v2
--              player_rounds CTE WHERE clause now carries AND sc.deleted_at IS NULL
--              so soft-deleted scorecards are excluded from every downstream
--              aggregation (windowed, best_rounds, stats). This correctly drops
--              a soft-deleted round from league standings.
--              Body reproduced verbatim from 20260330100000_league_leaderboard_v2.sql;
--              ONLY the sc.deleted_at filter is added.
--
-- Unchanged (no rounds/scorecards reference needing update):
--   get_activity_feed        — body already contains r.deleted_at IS NULL
--                              (source: 20260521000200_activity_feed_rpc.sql)
--   get_round_feed_card      — body already contains r.deleted_at IS NULL
--                              (source: 20260521000200_activity_feed_rpc.sql)
--   get_eclectic_leaderboard — reads eclectic_best_scores + league_rounds only;
--                              eclectic_best_scores is a separate write-side
--                              aggregate; soft-delete follow-up is tracked
--                              separately (source: 20260301100000_league_types_expansion.sql)
--   get_my_leagues           — reads leagues + league_players only; no rounds
--                              reference (source: 20260325000000_league_visibility.sql)
--   get_public_leagues       — reads leagues + league_players only; no rounds
--                              reference (source: 20260325000000_league_visibility.sql)

-- =====================================================
-- get_player_league_rounds
-- Latest source: 20260510010000_get_player_league_rounds_rpc.sql
-- Change: added AND r.deleted_at IS NULL to the LEFT JOIN ON clause
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
  JOIN scorecards sc ON sc.id = lr.scorecard_id AND sc.deleted_at IS NULL
  LEFT JOIN rounds r ON r.id = sc.round_id AND r.deleted_at IS NULL
  LEFT JOIN courses c ON c.id = r.course_id
  WHERE lr.league_id = p_league_id
    AND lr.player_id = p_player_id
  ORDER BY lr.tagged_at DESC;
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER;

COMMENT ON FUNCTION get_player_league_rounds(UUID, UUID) IS
  'Returns a player''s tagged league rounds with scorecard, round date, and course name. SECURITY DEFINER bypasses rounds RLS so league members always see course names for tagged rounds; authorization enforced via is_league_member().';

GRANT EXECUTE ON FUNCTION get_player_league_rounds(UUID, UUID) TO authenticated;

-- =====================================================
-- get_league_leaderboard_v2
-- Latest source: 20260330100000_league_leaderboard_v2.sql
-- Change: added AND sc.deleted_at IS NULL to the player_rounds CTE WHERE clause
--         so soft-deleted scorecards are excluded from all downstream aggregation.
-- =====================================================
CREATE OR REPLACE FUNCTION get_league_leaderboard_v2(
  p_league_id UUID,
  p_sort_mode TEXT DEFAULT 'gross'
)
RETURNS TABLE (
  player_id UUID,
  name TEXT,
  photo_url TEXT,
  rounds_played INTEGER,
  rounds_counting INTEGER,
  avg_differential NUMERIC(4,1),
  best_differential NUMERIC(4,1),
  avg_handicap NUMERIC(4,1),
  rank INTEGER
) AS $$
DECLARE
  v_league_type TEXT;
  v_max_rounds INTEGER;
  v_counting_rounds INTEGER;
  v_window_size INTEGER;
  v_best_of INTEGER;
BEGIN
  -- Get league type and config
  SELECT l.league_type, l.max_rounds, l.counting_rounds
  INTO v_league_type, v_max_rounds, v_counting_rounds
  FROM leagues l
  WHERE l.id = p_league_id;

  -- Determine scoring window and best-of based on type
  CASE v_league_type
    WHEN 'round_limit' THEN
      v_window_size := v_max_rounds;
      v_best_of := COALESCE(v_counting_rounds, v_max_rounds);
    ELSE
      -- ongoing / season: standard WHS (best 8 of last 20)
      v_window_size := 20;
      v_best_of := 8;
  END CASE;

  RETURN QUERY
  WITH player_rounds AS (
    -- Get last N rounds per player, joining scorecards for handicap data
    SELECT
      lr.player_id,
      lr.handicap_differential,
      lr.handicap_differential - COALESCE(sc.ga_handicap_used, 0) AS net_differential,
      sc.ga_handicap_used,
      ROW_NUMBER() OVER (PARTITION BY lr.player_id ORDER BY lr.tagged_at DESC) AS rn
    FROM league_rounds lr
    JOIN scorecards sc ON sc.id = lr.scorecard_id
    WHERE lr.league_id = p_league_id
      AND sc.deleted_at IS NULL
  ),
  windowed AS (
    -- Only keep rounds within the scoring window
    SELECT * FROM player_rounds WHERE rn <= v_window_size
  ),
  best_rounds AS (
    -- Select best N rounds based on the active sort mode
    SELECT
      w.player_id,
      w.handicap_differential,
      w.net_differential,
      w.ga_handicap_used,
      ROW_NUMBER() OVER (
        PARTITION BY w.player_id
        ORDER BY
          CASE WHEN p_sort_mode = 'net' THEN w.net_differential
               ELSE w.handicap_differential END ASC
      ) AS best_rn
    FROM windowed w
  ),
  stats AS (
    SELECT
      br.player_id,
      COUNT(*) FILTER (WHERE best_rn <= v_best_of)::INTEGER AS rounds_counting,
      (SELECT COUNT(*)::INTEGER FROM windowed w2 WHERE w2.player_id = br.player_id) AS rounds_played,
      ROUND(AVG(
        CASE WHEN p_sort_mode = 'net' THEN br.net_differential
             ELSE br.handicap_differential END
      ) FILTER (WHERE best_rn <= v_best_of), 1) AS avg_differential,
      MIN(
        CASE WHEN p_sort_mode = 'net' THEN br.net_differential
             ELSE br.handicap_differential END
      ) FILTER (WHERE best_rn <= v_best_of) AS best_differential,
      ROUND(AVG(NULLIF(br.ga_handicap_used, 0)) FILTER (WHERE best_rn <= v_best_of), 1) AS avg_handicap
    FROM best_rounds br
    GROUP BY br.player_id
  )
  SELECT
    s.player_id,
    p.name,
    p.photo_url,
    s.rounds_played,
    s.rounds_counting,
    s.avg_differential,
    s.best_differential,
    s.avg_handicap,
    RANK() OVER (ORDER BY s.avg_differential ASC)::INTEGER AS rank
  FROM stats s
  JOIN players p ON p.id = s.player_id
  ORDER BY s.avg_differential ASC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION get_league_leaderboard_v2 IS 'Returns league leaderboard with gross or net differential ranking. Net mode subtracts handicap index (ga_handicap_used) from each round differential before best-N selection.';
