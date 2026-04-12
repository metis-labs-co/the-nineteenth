-- =====================================================
-- Fix: rounds RLS infinite recursion (42P17)
-- =====================================================
-- Migration 20260412000000 added round_has_friend_scorecard()
-- to the rounds SELECT policy. That helper queries scorecards,
-- whose RLS contains three direct references back to rounds
-- (EXISTS (SELECT 1 FROM rounds r WHERE ...) sub-selects from
-- migrations 20250114, 20250132, and 20260412). The rewriter
-- walks that cycle and raises 42P17 whenever any query touches
-- rounds (directly or via join).
--
-- Fix: switch the check to round_players, which has a much
-- thinner RLS policy (single sub-select) -- the same proven-safe
-- pattern as is_round_participant from 20260327000000.
--
-- Coverage preserved for standalone rounds: friends in
-- round_players for a given round cause that round to be
-- visible, so stats queries that join scorecards -> rounds
-- still resolve to visible rows.
-- =====================================================


-- -----------------------------------------------------
-- 1. New helper: queries round_players, not scorecards
-- -----------------------------------------------------
-- Matches the is_round_participant signature/attributes exactly.
-- SECURITY DEFINER so the round_players inner query doesn't
-- re-trigger rounds policy expansion.

CREATE OR REPLACE FUNCTION round_has_friend_player(p_round_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM round_players rp
    WHERE rp.round_id = p_round_id
    AND is_friend(rp.player_id)
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION round_has_friend_player(UUID) IS
  'Check if a round has an accepted friend among its round_players. SECURITY DEFINER and targets round_players (not scorecards) to avoid the rounds <-> scorecards RLS cycle that round_has_friend_scorecard hit.';


-- -----------------------------------------------------
-- 2. Replace the broken clause on rounds SELECT policy
-- -----------------------------------------------------

DROP POLICY IF EXISTS "Users can view rounds" ON rounds;

CREATE POLICY "Users can view rounds"
  ON rounds FOR SELECT
  USING (
    -- Standalone rounds: user owns it
    (user_id = auth.uid())
    OR
    -- Standalone rounds: user is a participant via round_players
    (competition_id IS NULL AND is_round_participant(rounds.id, auth.uid()))
    OR
    -- Competition rounds: user is in the competition
    (competition_id IS NOT NULL AND EXISTS (
      SELECT 1 FROM competition_players cp
      WHERE cp.competition_id = rounds.competition_id
      AND cp.player_id = auth.uid()
      AND cp.status = 'accepted'
    ))
    OR
    -- Competition rounds: user is the organizer
    (competition_id IS NOT NULL AND EXISTS (
      SELECT 1 FROM competitions c
      WHERE c.id = rounds.competition_id
      AND c.organizer_id = auth.uid()
    ))
    OR
    -- Friend visibility: round has an accepted friend as a round_players participant
    -- (Replaces round_has_friend_scorecard which triggered rounds <-> scorecards recursion.)
    round_has_friend_player(rounds.id)
  );


-- -----------------------------------------------------
-- 3. Drop the broken helper
-- -----------------------------------------------------
DROP FUNCTION IF EXISTS round_has_friend_scorecard(UUID);
