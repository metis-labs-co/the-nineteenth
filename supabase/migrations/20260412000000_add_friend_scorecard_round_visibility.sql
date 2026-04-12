-- =====================================================
-- Add Friend Visibility to Scorecards & Rounds RLS
-- =====================================================
-- Bug: When viewing a friend's profile, stats show only rounds
-- from shared competitions/rounds because RLS has no friendship
-- check. Friends should be able to see all of each other's
-- scorecards and rounds for full statistics visibility.
--
-- Fix: Add an accepted-friendship condition to the SELECT
-- policies on both scorecards and rounds tables.
--
-- Privacy model:
--   Friends   → full scorecard/round visibility
--   Non-friends in shared rounds/competitions → unchanged
--   Strangers → no visibility (unchanged)
--   Unfriended → access revoked (status != 'accepted')
--
-- Performance: friendships table already has indexes on
-- requester_id, addressee_id, and a partial index on
-- (requester_id, addressee_id) WHERE status = 'accepted'.
-- =====================================================


-- =====================================================
-- 1. HELPER: Check friendship without triggering RLS cycles
-- =====================================================
-- Uses SECURITY DEFINER to avoid potential RLS recursion if
-- friendships ever gets RLS policies that reference these tables.

CREATE OR REPLACE FUNCTION is_friend(p_player_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM friendships f
    WHERE f.status = 'accepted'
    AND (
      (f.requester_id = auth.uid() AND f.addressee_id = p_player_id)
      OR (f.addressee_id = auth.uid() AND f.requester_id = p_player_id)
    )
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

COMMENT ON FUNCTION is_friend(UUID) IS 'Check if the current user has an accepted friendship with the given player. SECURITY DEFINER to avoid circular RLS.';


-- =====================================================
-- 2. HELPER: Check if a round has a scorecard for a friend
-- =====================================================
-- SECURITY DEFINER bypasses scorecards RLS, breaking the
-- rounds ↔ scorecards circular RLS dependency.

CREATE OR REPLACE FUNCTION round_has_friend_scorecard(p_round_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM scorecards sc
    WHERE sc.round_id = p_round_id
    AND is_friend(sc.player_id)
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

COMMENT ON FUNCTION round_has_friend_scorecard(UUID) IS 'Check if a round has a scorecard belonging to an accepted friend of the current user. SECURITY DEFINER to avoid circular RLS between rounds and scorecards.';


-- =====================================================
-- 3. UPDATE SCORECARDS SELECT POLICY
-- =====================================================
-- Adds: friend can view all scorecards of an accepted friend

DROP POLICY IF EXISTS "Users can view scorecards" ON scorecards;

CREATE POLICY "Users can view scorecards"
  ON scorecards FOR SELECT
  USING (
    -- Own scorecard
    (player_id = auth.uid())
    OR
    -- Scorecard in a standalone round the user owns
    EXISTS (
      SELECT 1 FROM rounds r
      WHERE r.id = scorecards.round_id
      AND r.user_id = auth.uid()
    )
    OR
    -- Scorecard for another player in the same standalone round (via round_players)
    EXISTS (
      SELECT 1 FROM round_players rp_self
      JOIN round_players rp_target ON rp_target.round_id = rp_self.round_id
      WHERE rp_self.round_id = scorecards.round_id
      AND rp_self.player_id = auth.uid()
      AND rp_target.player_id = scorecards.player_id
    )
    OR
    -- Scorecard in a competition the user is part of
    EXISTS (
      SELECT 1 FROM rounds r
      JOIN competition_players cp ON cp.competition_id = r.competition_id
      WHERE r.id = scorecards.round_id
      AND cp.player_id = auth.uid()
      AND cp.status = 'accepted'
    )
    OR
    -- User is the organizer of the competition
    EXISTS (
      SELECT 1 FROM rounds r
      JOIN competitions c ON c.id = r.competition_id
      WHERE r.id = scorecards.round_id
      AND c.organizer_id = auth.uid()
    )
    OR
    -- NEW: Scorecard belongs to an accepted friend
    is_friend(scorecards.player_id)
  );


-- =====================================================
-- 4. UPDATE ROUNDS SELECT POLICY
-- =====================================================
-- Adds: friend can view rounds that have a scorecard for a friend
-- Uses round_has_friend_scorecard() to avoid circular RLS

DROP POLICY IF EXISTS "Users can view rounds" ON rounds;

CREATE POLICY "Users can view rounds"
  ON rounds FOR SELECT
  USING (
    -- Standalone rounds: user owns it
    (user_id = auth.uid())
    OR
    -- Standalone rounds: user is a participant via round_players
    -- Uses SECURITY DEFINER function to avoid circular RLS recursion
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
    -- NEW: Round has a scorecard belonging to an accepted friend
    -- Uses SECURITY DEFINER function to avoid circular RLS between rounds ↔ scorecards
    round_has_friend_scorecard(rounds.id)
  );
