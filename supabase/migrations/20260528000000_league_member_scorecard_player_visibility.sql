-- Migration: let league members view scorecards + players of tagged league rounds
--
-- Problem: 20260417000000_league_tagged_rounds_visibility added the
-- SECURITY DEFINER helper is_league_tagged_round(round_id, user_id) and a
-- permissive SELECT policy ON rounds, so a league member can open another
-- player's tagged round. But no matching visibility was added to scorecards
-- or round_players. Result: when viewing another player's league round
-- (reached via the league leaderboard player sheet), the round shell loads
-- but the Scorecard/Stats tabs and the Details-tab players section are empty
-- because those table SELECTs return zero rows for the viewer.
--
-- Fix: add `OR is_league_tagged_round(<table>.round_id, auth.uid())` to the
-- SELECT policies on scorecards and round_players. is_league_tagged_round is
-- SECURITY DEFINER (reads scorecards/league_rounds/league_players, never
-- round_players), so there is no RLS recursion. Authorization is unchanged:
-- the helper only returns true for accepted members of a league the round is
-- tagged to.
--
-- Bodies below are reproduced verbatim from their latest prior definitions;
-- ONLY the league-tagged branch is added.
--   scorecards   SELECT — last set in 20260427110000_relax_competition_players_status_in_rls
--   round_players SELECT — last set in 20250131000000_round_players_and_notifications

-- ============================================================================
-- scorecards: SELECT
-- ============================================================================

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
    -- NEW: Scorecard belongs to a round tagged to a league the user is in
    is_league_tagged_round(scorecards.round_id, auth.uid())
  );

-- ============================================================================
-- round_players: SELECT
-- ============================================================================

DROP POLICY IF EXISTS "Users can view round_players" ON round_players;

CREATE POLICY "Users can view round_players"
  ON round_players FOR SELECT
  USING (
    -- Player is the record owner (self)
    player_id = auth.uid()
    OR
    -- Player added this person
    added_by = auth.uid()
    OR
    -- Player owns the round
    EXISTS (
      SELECT 1 FROM rounds r
      WHERE r.id = round_players.round_id
      AND r.user_id = auth.uid()
    )
    OR
    -- NEW: Round is tagged to a league the user is in
    is_league_tagged_round(round_players.round_id, auth.uid())
  );
