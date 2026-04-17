-- =====================================================
-- Allow league members to view rounds tagged to their league
-- =====================================================
-- Problem: When a round is created by an admin via the quick add wizard,
-- other league members (including the player themselves) cannot see the
-- round data through nested joins because the rounds RLS only allows
-- access to the round creator (user_id = auth.uid()).
--
-- Fix: Add a SECURITY DEFINER helper that checks if a round is tagged
-- to a league the viewer belongs to, then add it as a permissive SELECT
-- policy on the rounds table. SECURITY DEFINER avoids RLS recursion
-- between rounds <-> scorecards.
-- =====================================================

-- Helper function: checks if a round is tagged to a league the user belongs to
CREATE OR REPLACE FUNCTION is_league_tagged_round(p_round_id UUID, p_user_id UUID)
RETURNS BOOLEAN AS $$
  SELECT EXISTS (
    SELECT 1
    FROM scorecards sc
    JOIN league_rounds lr ON lr.scorecard_id = sc.id
    JOIN league_players lp ON lp.league_id = lr.league_id
    WHERE sc.round_id = p_round_id
      AND lp.player_id = p_user_id
      AND lp.status = 'accepted'
  );
$$ LANGUAGE sql STABLE SECURITY DEFINER;

COMMENT ON FUNCTION is_league_tagged_round(UUID, UUID) IS
  'Check if a round is tagged to a league where the given user is an accepted member. SECURITY DEFINER to avoid RLS recursion with scorecards.';

-- Add permissive SELECT policy for league-tagged rounds
CREATE POLICY "League members can view tagged rounds"
  ON rounds FOR SELECT
  USING (is_league_tagged_round(rounds.id, auth.uid()));
