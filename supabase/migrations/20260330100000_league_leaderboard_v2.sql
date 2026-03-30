-- League Leaderboard v2: Gross/Net sort mode support
--
-- Adds get_league_leaderboard_v2() which accepts a sort mode parameter:
--   'gross' (default) - ranks by raw WHS handicap differential (existing behavior)
--   'net'             - ranks by net differential (WHS differential minus handicap index at time of round)
--
-- The "best N" selection runs independently per mode, so a player's best 8 gross
-- rounds may differ from their best 8 net rounds.
--
-- Also returns avg_handicap: the average ga_handicap_used across counting rounds,
-- for display in the HC column.

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
