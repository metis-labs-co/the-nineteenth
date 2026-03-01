-- Fix get_league_leaderboard to use correct players table columns
-- players table has "name" and "photo_url", not "first_name"/"last_name"/"avatar_url"

DROP FUNCTION IF EXISTS get_league_leaderboard(UUID);

CREATE OR REPLACE FUNCTION get_league_leaderboard(p_league_id UUID)
RETURNS TABLE (
  player_id UUID,
  name TEXT,
  photo_url TEXT,
  rounds_played INTEGER,
  rounds_counting INTEGER,
  avg_differential NUMERIC(4,1),
  best_differential NUMERIC(4,1),
  rank INTEGER
) AS $$
BEGIN
  RETURN QUERY
  WITH player_rounds AS (
    SELECT
      lr.player_id,
      lr.handicap_differential,
      ROW_NUMBER() OVER (PARTITION BY lr.player_id ORDER BY lr.tagged_at DESC) AS rn
    FROM league_rounds lr
    WHERE lr.league_id = p_league_id
  ),
  windowed AS (
    SELECT * FROM player_rounds WHERE rn <= 20
  ),
  best_rounds AS (
    SELECT
      w.player_id,
      w.handicap_differential,
      ROW_NUMBER() OVER (PARTITION BY w.player_id ORDER BY w.handicap_differential ASC) AS best_rn
    FROM windowed w
  ),
  stats AS (
    SELECT
      br.player_id,
      COUNT(*) FILTER (WHERE best_rn <= 8)::INTEGER AS rounds_counting,
      (SELECT COUNT(*)::INTEGER FROM windowed w2 WHERE w2.player_id = br.player_id) AS rounds_played,
      ROUND(AVG(br.handicap_differential) FILTER (WHERE best_rn <= 8), 1) AS avg_differential,
      MIN(br.handicap_differential) AS best_differential
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
    RANK() OVER (ORDER BY s.avg_differential ASC)::INTEGER AS rank
  FROM stats s
  JOIN players p ON p.id = s.player_id
  ORDER BY s.avg_differential ASC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
