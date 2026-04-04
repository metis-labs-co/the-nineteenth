-- Backfill round_results for Winter Cobram Classic round
-- Round ID: 038dca84-3afd-4043-95af-1b2e9b301a91
-- Game type: Stableford (raw_score = total_points, higher is better)
--
-- The round was scored via Quick Score wizard but finalizeRound() silently failed,
-- leaving the round_results table empty and the leaderboard showing no data.

-- Clear any partial results first
DELETE FROM round_results
WHERE round_id = '038dca84-3afd-4043-95af-1b2e9b301a91';

-- Insert round_results from completed scorecards with position-based competition points
WITH round_info AS (
  SELECT r.id AS round_id, r.competition_id, r.game_type,
         c.point_system
  FROM rounds r
  JOIN competitions c ON c.id = r.competition_id
  WHERE r.id = '038dca84-3afd-4043-95af-1b2e9b301a91'
),
ranked_scorecards AS (
  SELECT
    sc.player_id,
    sc.total_points,
    sc.total_gross,
    sc.total_net,
    DENSE_RANK() OVER (ORDER BY sc.total_points DESC) AS position
  FROM scorecards sc
  WHERE sc.round_id = '038dca84-3afd-4043-95af-1b2e9b301a91'
    AND sc.status IN ('completed', 'confirmed')
),
-- Calculate competition points per position from the competition's point_system
-- For tied players: average the points across the positions they occupy
position_points AS (
  SELECT
    rs.*,
    COUNT(*) OVER (PARTITION BY rs.position) AS tie_count,
    -- Generate the occupied positions for this tie group
    -- e.g. position=2 with 2 tied players occupies positions 2 and 3
    ROW_NUMBER() OVER (ORDER BY rs.total_points DESC) AS absolute_rank
  FROM ranked_scorecards rs
),
points_lookup AS (
  SELECT
    pp.*,
    ri.point_system,
    -- Look up points for the absolute rank position
    -- point_system->'rules' has keys like "1", "2", etc.
    COALESCE(
      (ri.point_system->'rules'->>pp.absolute_rank::text)::numeric,
      (ri.point_system->'rules'->>'default')::numeric,
      0
    ) AS raw_points
  FROM position_points pp
  CROSS JOIN round_info ri
),
-- Average points across tied players at the same position
averaged_points AS (
  SELECT
    pl.player_id,
    pl.total_points,
    pl.total_gross,
    pl.total_net,
    pl.position,
    ROUND(AVG(pl.raw_points) OVER (PARTITION BY pl.position), 2) AS competition_points
  FROM points_lookup pl
)
INSERT INTO round_results (round_id, player_id, raw_score, raw_result_data, position, competition_points, is_team_result)
SELECT
  '038dca84-3afd-4043-95af-1b2e9b301a91',
  ap.player_id,
  ap.total_points,
  jsonb_build_object('stableford_points', ap.total_points),
  ap.position,
  ap.competition_points,
  false
FROM averaged_points ap
ON CONFLICT (round_id, player_id) WHERE player_id IS NOT NULL
DO UPDATE SET
  raw_score = EXCLUDED.raw_score,
  raw_result_data = EXCLUDED.raw_result_data,
  position = EXCLUDED.position,
  competition_points = EXCLUDED.competition_points,
  updated_at = NOW();
