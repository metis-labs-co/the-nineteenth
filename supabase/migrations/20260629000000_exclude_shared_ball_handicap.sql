-- Exclude shared-ball team rounds (scramble, alt-shot) from handicap records
--
-- Scramble and alt-shot (foursomes) are "shared-ball" formats: the team plays
-- a single ball, so a player's scorecard total_gross is the TEAM's score, not
-- their own play. These rounds were incorrectly assigned a handicap_differential
-- at sync time, which polluted the WHS handicap history and inflated/skewed the
-- computed handicap index. Own-ball team formats (best-ball, shamble, aggregate,
-- team match play) produce a genuine individual gross and are left untouched.
--
-- This migration:
--   1. Nulls handicap_differential on every scorecard belonging to a
--      scramble/alt-shot round. handicap_differential IS NOT NULL is the gate
--      the app uses to include a round in both handicap history and the index,
--      so nulling it removes those rounds from handicap entirely.
--   2. Recomputes player.handicap_index for every affected player from their
--      remaining eligible differentials, mirroring calculateHandicapIndex()
--      (src/utils/handicapDifferential.ts): most recent 20 eligible 18-hole
--      differentials plus combined 9+9 rounds, best-X-of-N per the WHS counting
--      table, average x 0.96, capped at 54, rounded to 1 decimal. Affected
--      players left with no eligible differentials have their index cleared.
--
-- Player statistics are computed live by the client (no stored aggregate),
-- so fixing the stats query is sufficient — no stats backfill is required.

-- 1a. Capture the set of affected players BEFORE nulling so we can recompute
--     their indexes afterwards (a plain session-scoped temp table — persists
--     across statements and is independent of how the migration runner wraps
--     transactions).
CREATE TEMP TABLE _shared_ball_affected_players AS
SELECT DISTINCT s.player_id
FROM scorecards s
JOIN rounds r ON r.id = s.round_id
WHERE s.handicap_differential IS NOT NULL
  AND (
    r.game_type IN ('scramble', 'alt-shot')
    OR r.team_format IN ('scramble', 'alt-shot')
  );

-- 1b. Null the differentials on shared-ball scorecards.
UPDATE scorecards s
SET handicap_differential = NULL
FROM rounds r
WHERE r.id = s.round_id
  AND s.handicap_differential IS NOT NULL
  AND (
    r.game_type IN ('scramble', 'alt-shot')
    OR r.team_format IN ('scramble', 'alt-shot')
  );

-- 2. Recompute handicap_index for affected players from the corrected data.
WITH eligible AS (
  -- 18-hole scorecard differentials (now excludes the nulled shared-ball rows)
  SELECT s.player_id,
         s.handicap_differential AS differential,
         COALESCE(s.submitted_at, r.date::timestamptz) AS effective_date
  FROM scorecards s
  JOIN rounds r ON r.id = s.round_id
  WHERE s.player_id IN (SELECT player_id FROM _shared_ball_affected_players)
    AND s.status IN ('completed', 'confirmed')
    AND s.handicap_differential IS NOT NULL
    AND r.deleted_at IS NULL
    AND r.nine_type = 'full'
  UNION ALL
  -- Combined 9+9 rounds carry their own pre-computed differential
  SELECT hcr.player_id,
         hcr.handicap_differential AS differential,
         hcr.effective_date
  FROM handicap_combined_rounds hcr
  WHERE hcr.player_id IN (SELECT player_id FROM _shared_ball_affected_players)
),
recent20 AS (
  -- Most recent 20 differentials per player (matches the TS .slice(0, 20))
  SELECT player_id, differential
  FROM (
    SELECT player_id, differential,
           ROW_NUMBER() OVER (PARTITION BY player_id ORDER BY effective_date DESC) AS rn
    FROM eligible
  ) ranked
  WHERE rn <= 20
),
counts AS (
  SELECT player_id, COUNT(*) AS n
  FROM recent20
  GROUP BY player_id
),
qualifying AS (
  -- WHS counting table: how many of the best differentials feed the index
  SELECT player_id,
         CASE
           WHEN n <= 5  THEN 1
           WHEN n <= 8  THEN 2
           WHEN n <= 11 THEN 3
           WHEN n <= 14 THEN 4
           WHEN n <= 16 THEN 5
           WHEN n <= 18 THEN 6
           WHEN n  = 19 THEN 7
           ELSE 8
         END AS count_to_use
  FROM counts
),
best AS (
  -- Rank each player's recent-20 differentials best (lowest) first
  SELECT player_id, differential,
         ROW_NUMBER() OVER (PARTITION BY player_id ORDER BY differential ASC) AS brn
  FROM recent20
),
index_calc AS (
  -- Average the best count_to_use differentials, x 0.96, cap 54, 1 decimal
  SELECT q.player_id,
         ROUND(LEAST(AVG(b.differential) * 0.96, 54.0)::numeric, 1) AS new_index
  FROM qualifying q
  JOIN best b ON b.player_id = q.player_id AND b.brn <= q.count_to_use
  GROUP BY q.player_id
)
UPDATE players p
SET handicap_index = ic.new_index,  -- NULL when no eligible rows remain
    handicap_index_updated_at = now()
FROM _shared_ball_affected_players ap
LEFT JOIN index_calc ic ON ic.player_id = ap.player_id
WHERE p.id = ap.player_id;

DROP TABLE _shared_ball_affected_players;
