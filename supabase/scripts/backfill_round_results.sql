-- ============================================================
-- Backfill Round Results Script
-- ============================================================
-- This script populates the round_results table for all completed
-- rounds that don't have results yet.
--
-- Run this in the Supabase SQL Editor.
-- ============================================================

-- First, let's see what needs to be backfilled
SELECT
  r.id as round_id,
  r.game_type,
  c.name as competition_name,
  (SELECT COUNT(*) FROM scorecards sc WHERE sc.round_id = r.id AND sc.status = 'completed') as scorecard_count,
  (SELECT COUNT(*) FROM round_results rr WHERE rr.round_id = r.id) as existing_results
FROM rounds r
JOIN competitions c ON c.id = r.competition_id
WHERE r.status = 'completed'
ORDER BY r.created_at DESC;

-- ============================================================
-- BACKFILL QUERY
-- ============================================================
-- This inserts round_results for all completed rounds that don't have them

INSERT INTO round_results (
  round_id,
  player_id,
  team_id,
  is_team_result,
  raw_score,
  raw_result_data,
  position,
  competition_points,
  created_at,
  updated_at
)
SELECT
  sc.round_id,
  sc.player_id,
  NULL as team_id,
  false as is_team_result,
  -- raw_score: Use total_points for stableford, total_net for stroke
  CASE
    WHEN r.game_type = 'stableford' THEN COALESCE(sc.total_points, 0)
    WHEN r.game_type = 'stroke' THEN COALESCE(sc.total_net, 0)
    ELSE COALESCE(sc.total_points, sc.total_net, 0)
  END as raw_score,
  -- raw_result_data: Store game-type specific data
  CASE
    WHEN r.game_type = 'stableford' THEN jsonb_build_object('stableford_points', COALESCE(sc.total_points, 0))
    WHEN r.game_type = 'stroke' THEN jsonb_build_object('gross_score', COALESCE(sc.total_gross, 0), 'net_score', COALESCE(sc.total_net, 0))
    ELSE jsonb_build_object('stableford_points', COALESCE(sc.total_points, 0))
  END as raw_result_data,
  -- position: Calculate based on ranking within round
  (
    SELECT COUNT(*) + 1
    FROM scorecards sc2
    WHERE sc2.round_id = sc.round_id
      AND sc2.status = 'completed'
      AND (
        -- For stableford: higher is better
        (r.game_type = 'stableford' AND COALESCE(sc2.total_points, 0) > COALESCE(sc.total_points, 0))
        OR
        -- For stroke: lower is better
        (r.game_type = 'stroke' AND COALESCE(sc2.total_net, 0) < COALESCE(sc.total_net, 0))
        OR
        -- Default to stableford logic
        (r.game_type NOT IN ('stableford', 'stroke') AND COALESCE(sc2.total_points, 0) > COALESCE(sc.total_points, 0))
      )
  ) as position,
  -- competition_points: Standard point system based on position
  CASE (
    SELECT COUNT(*) + 1
    FROM scorecards sc2
    WHERE sc2.round_id = sc.round_id
      AND sc2.status = 'completed'
      AND (
        (r.game_type = 'stableford' AND COALESCE(sc2.total_points, 0) > COALESCE(sc.total_points, 0))
        OR
        (r.game_type = 'stroke' AND COALESCE(sc2.total_net, 0) < COALESCE(sc.total_net, 0))
        OR
        (r.game_type NOT IN ('stableford', 'stroke') AND COALESCE(sc2.total_points, 0) > COALESCE(sc.total_points, 0))
      )
  )
    WHEN 1 THEN 10
    WHEN 2 THEN 8
    WHEN 3 THEN 6
    WHEN 4 THEN 5
    WHEN 5 THEN 4
    WHEN 6 THEN 3
    WHEN 7 THEN 2
    WHEN 8 THEN 1
    ELSE 1
  END as competition_points,
  NOW() as created_at,
  NOW() as updated_at
FROM scorecards sc
JOIN rounds r ON r.id = sc.round_id
WHERE sc.status = 'completed'
  AND r.status = 'completed'
  -- Only insert if no round_results exist for this round/player combo
  AND NOT EXISTS (
    SELECT 1 FROM round_results rr
    WHERE rr.round_id = sc.round_id
      AND rr.player_id = sc.player_id
  );

-- ============================================================
-- VERIFY RESULTS
-- ============================================================
-- Check what was inserted

SELECT
  r.id as round_id,
  c.name as competition_name,
  rr.player_id,
  p.name as player_name,
  rr.position,
  rr.raw_score,
  rr.competition_points,
  rr.raw_result_data
FROM round_results rr
JOIN rounds r ON r.id = rr.round_id
JOIN competitions c ON c.id = r.competition_id
JOIN players p ON p.id = rr.player_id
ORDER BY r.created_at DESC, rr.position ASC;
