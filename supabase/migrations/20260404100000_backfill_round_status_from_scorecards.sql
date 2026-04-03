-- Backfill: Update round status for rounds where all players have completed scorecards
-- but the round status was never updated (e.g. scored via Quick Score before status sync was added).

-- Step 1: Mark rounds as 'completed' where every competition player has a completed scorecard
UPDATE rounds r
SET status = 'completed'
WHERE r.status IN ('upcoming', 'in-progress')
  AND r.competition_id IS NOT NULL
  AND (
    SELECT COUNT(*)
    FROM competition_players cp
    WHERE cp.competition_id = r.competition_id
      AND cp.status = 'accepted'
  ) > 0
  AND (
    SELECT COUNT(*)
    FROM scorecards sc
    WHERE sc.round_id = r.id
      AND sc.status = 'completed'
  ) >= (
    SELECT COUNT(*)
    FROM competition_players cp
    WHERE cp.competition_id = r.competition_id
      AND cp.status = 'accepted'
  );

-- Step 2: Mark rounds as 'in-progress' where at least one scorecard exists but not all are complete
UPDATE rounds r
SET status = 'in-progress'
WHERE r.status = 'upcoming'
  AND r.competition_id IS NOT NULL
  AND EXISTS (
    SELECT 1
    FROM scorecards sc
    WHERE sc.round_id = r.id
      AND sc.status = 'completed'
  );
