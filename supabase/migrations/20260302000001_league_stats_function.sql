-- =====================================================
-- League Stats RPC Function
-- The Nineteenth - Golf Competition App
-- =====================================================
-- Returns aggregate statistics for a league, including:
-- - Overview stats (total rounds, active players, avg differential, courses)
-- - Current user's personal stats
-- - User's differential history for trend chart
-- - Course breakdown (top 5 by times played)
-- - League records (best differential, lowest gross, most rounds, most improved)
-- - Raw score data for client-side score distribution calculation
-- =====================================================

CREATE OR REPLACE FUNCTION get_league_stats(p_league_id UUID, p_user_id UUID)
RETURNS JSON AS $$
DECLARE
  v_result JSON;
BEGIN
  -- Membership check
  IF NOT is_league_member(p_league_id, p_user_id) THEN
    RAISE EXCEPTION 'Not a member of this league';
  END IF;

  WITH
  -- All league rounds with joined scorecard + round data
  all_rounds AS (
    SELECT
      lr.player_id,
      lr.handicap_differential,
      lr.tagged_at,
      lr.scorecard_id,
      sc.total_gross,
      sc.scores AS scorecard_scores,
      r.date AS date_played,
      c.name AS course_name,
      r.course_id,
      p.name AS player_name
    FROM league_rounds lr
    JOIN scorecards sc ON sc.id = lr.scorecard_id
    JOIN rounds r ON r.id = sc.round_id
    LEFT JOIN courses c ON c.id = r.course_id
    JOIN players p ON p.id = lr.player_id
    WHERE lr.league_id = p_league_id
  ),

  -- Overview aggregates
  overview AS (
    SELECT
      COUNT(*)::INTEGER AS total_rounds,
      COUNT(DISTINCT player_id)::INTEGER AS active_players,
      ROUND(AVG(handicap_differential), 1) AS league_avg_differential,
      MIN(handicap_differential) AS league_best_differential,
      COUNT(DISTINCT course_name)::INTEGER AS courses_played
    FROM all_rounds
  ),

  -- Current user stats
  my_stats AS (
    SELECT
      COUNT(*)::INTEGER AS my_rounds_count,
      ROUND(AVG(handicap_differential), 1) AS my_avg_differential,
      MIN(handicap_differential) AS my_best_differential,
      ROUND(AVG(total_gross), 0) AS my_avg_gross
    FROM all_rounds
    WHERE player_id = p_user_id
  ),

  -- User differential history (ordered by date for trend chart)
  my_diffs AS (
    SELECT json_agg(
      json_build_object(
        'differential', handicap_differential,
        'date_played', date_played,
        'course_name', course_name
      ) ORDER BY COALESCE(date_played, tagged_at::date) ASC
    ) AS data
    FROM all_rounds
    WHERE player_id = p_user_id
  ),

  -- Course stats (top 5 by times played)
  course_agg AS (
    SELECT json_agg(row_to_json(cs) ORDER BY cs.times_played DESC) AS data
    FROM (
      SELECT
        course_name,
        COUNT(*)::INTEGER AS times_played,
        ROUND(AVG(total_gross), 0)::INTEGER AS avg_gross,
        MIN(total_gross)::INTEGER AS best_gross
      FROM all_rounds
      WHERE course_name IS NOT NULL
      GROUP BY course_name
      ORDER BY COUNT(*) DESC
      LIMIT 5
    ) cs
  ),

  -- Records
  best_diff_record AS (
    SELECT
      handicap_differential AS value,
      player_name,
      date_played AS date
    FROM all_rounds
    ORDER BY handicap_differential ASC
    LIMIT 1
  ),

  lowest_gross_record AS (
    SELECT
      total_gross AS value,
      player_name,
      date_played AS date,
      course_name AS course
    FROM all_rounds
    WHERE total_gross IS NOT NULL AND total_gross > 0
    ORDER BY total_gross ASC
    LIMIT 1
  ),

  most_rounds_record AS (
    SELECT
      COUNT(*)::INTEGER AS count,
      player_name
    FROM all_rounds
    GROUP BY player_id, player_name
    ORDER BY COUNT(*) DESC
    LIMIT 1
  ),

  -- Most improved: avg of first 3 diffs - avg of last 3 diffs (requires 6+ rounds)
  improvement_calc AS (
    SELECT
      player_id,
      player_name,
      ROUND(
        AVG(handicap_differential) FILTER (WHERE rn_asc <= 3) -
        AVG(handicap_differential) FILTER (WHERE rn_desc <= 3),
        1
      ) AS improvement
    FROM (
      SELECT
        player_id,
        player_name,
        handicap_differential,
        ROW_NUMBER() OVER (PARTITION BY player_id ORDER BY COALESCE(date_played, tagged_at::date) ASC) AS rn_asc,
        ROW_NUMBER() OVER (PARTITION BY player_id ORDER BY COALESCE(date_played, tagged_at::date) DESC) AS rn_desc,
        COUNT(*) OVER (PARTITION BY player_id) AS total_rounds
      FROM all_rounds
    ) sub
    WHERE total_rounds >= 6
    GROUP BY player_id, player_name
    HAVING
      AVG(handicap_differential) FILTER (WHERE rn_asc <= 3) -
      AVG(handicap_differential) FILTER (WHERE rn_desc <= 3) > 0
    ORDER BY improvement DESC
    LIMIT 1
  ),

  records AS (
    SELECT json_build_object(
      'best_differential', (SELECT CASE WHEN EXISTS (SELECT 1 FROM best_diff_record) THEN
        (SELECT json_build_object('value', value, 'player_name', player_name, 'date', date) FROM best_diff_record)
        ELSE NULL END),
      'lowest_gross', (SELECT CASE WHEN EXISTS (SELECT 1 FROM lowest_gross_record) THEN
        (SELECT json_build_object('value', value, 'player_name', player_name, 'date', date, 'course', course) FROM lowest_gross_record)
        ELSE NULL END),
      'most_rounds', (SELECT CASE WHEN EXISTS (SELECT 1 FROM most_rounds_record) THEN
        (SELECT json_build_object('count', count, 'player_name', player_name) FROM most_rounds_record)
        ELSE NULL END),
      'most_improved', (SELECT CASE WHEN EXISTS (SELECT 1 FROM improvement_calc) THEN
        (SELECT json_build_object('improvement', improvement, 'player_name', player_name) FROM improvement_calc)
        ELSE NULL END)
    ) AS data
  ),

  -- Score data for client-side distribution (scorecard scores + course holes)
  score_data AS (
    SELECT json_agg(
      json_build_object(
        'scores', ar.scorecard_scores,
        'holes', (
          SELECT json_agg(
            json_build_object('number', (elem->>'number')::INTEGER, 'par', (elem->>'par')::INTEGER)
            ORDER BY (elem->>'number')::INTEGER
          )
          FROM courses c2
          CROSS JOIN LATERAL jsonb_array_elements(
            CASE WHEN c2.holes IS NOT NULL AND jsonb_typeof(c2.holes) = 'array'
                 THEN c2.holes ELSE '[]'::jsonb END
          ) AS elem
          WHERE c2.id = ar.course_id
        )
      )
    ) AS data
    FROM all_rounds ar
    WHERE ar.scorecard_scores IS NOT NULL
      AND ar.course_id IS NOT NULL
  )

  SELECT json_build_object(
    'total_rounds', COALESCE((SELECT total_rounds FROM overview), 0),
    'active_players', COALESCE((SELECT active_players FROM overview), 0),
    'league_avg_differential', (SELECT league_avg_differential FROM overview),
    'league_best_differential', (SELECT league_best_differential FROM overview),
    'courses_played', COALESCE((SELECT courses_played FROM overview), 0),
    'my_rounds_count', COALESCE((SELECT my_rounds_count FROM my_stats), 0),
    'my_avg_differential', (SELECT my_avg_differential FROM my_stats),
    'my_best_differential', (SELECT my_best_differential FROM my_stats),
    'my_avg_gross', (SELECT my_avg_gross FROM my_stats),
    'my_differentials', COALESCE((SELECT data FROM my_diffs), '[]'::json),
    'course_stats', COALESCE((SELECT data FROM course_agg), '[]'::json),
    'records', (SELECT data FROM records),
    'score_data', (SELECT data FROM score_data)
  ) INTO v_result;

  RETURN v_result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
