-- =====================================================
-- Fix RLS Infinite Recursion
-- =====================================================
-- This migration fixes the infinite recursion issue in RLS policies
-- where competition_players was querying itself.
--
-- Solution: Create a SECURITY DEFINER function that bypasses RLS
-- to check competition membership, then use that in policies.
-- =====================================================

-- -----------------------------------------------------
-- Helper Function: Check if user is competition member
-- -----------------------------------------------------
-- This function runs with elevated privileges (bypasses RLS)
-- to check if a user is a member of a competition
CREATE OR REPLACE FUNCTION is_competition_member(comp_id UUID, user_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM competition_players
    WHERE competition_id = comp_id
    AND player_id = user_id
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

-- -----------------------------------------------------
-- Helper Function: Get user's competition IDs
-- -----------------------------------------------------
-- Returns all competition IDs the user is a member of
CREATE OR REPLACE FUNCTION get_user_competition_ids(user_id UUID)
RETURNS SETOF UUID AS $$
BEGIN
  RETURN QUERY
  SELECT competition_id FROM competition_players
  WHERE player_id = user_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

-- -----------------------------------------------------
-- Helper Function: Check if user is competition organizer
-- -----------------------------------------------------
CREATE OR REPLACE FUNCTION is_competition_organizer(comp_id UUID, user_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM competitions
    WHERE id = comp_id
    AND organizer_id = user_id
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

-- =====================================================
-- DROP OLD PROBLEMATIC POLICIES
-- =====================================================

-- Competition Players policies (these cause recursion)
DROP POLICY IF EXISTS "Players can view competition players" ON competition_players;
DROP POLICY IF EXISTS "Organizers can manage competition players" ON competition_players;
DROP POLICY IF EXISTS "Players can join competitions" ON competition_players;
DROP POLICY IF EXISTS "Players can update own competition status" ON competition_players;

-- Players policies (also had recursion issues)
DROP POLICY IF EXISTS "Users can view players in their competitions" ON players;

-- Competitions policies
DROP POLICY IF EXISTS "Players can view their competitions" ON competitions;

-- Rounds policies
DROP POLICY IF EXISTS "Players can view rounds in their competitions" ON rounds;
DROP POLICY IF EXISTS "Organizers can manage rounds in their competitions" ON rounds;

-- Pairings policies
DROP POLICY IF EXISTS "Players can view pairings in their rounds" ON pairings;
DROP POLICY IF EXISTS "Organizers can manage pairings" ON pairings;

-- Scorecards policies
DROP POLICY IF EXISTS "Players can view scorecards in their competitions" ON scorecards;
DROP POLICY IF EXISTS "Players can create scorecards for their rounds" ON scorecards;
DROP POLICY IF EXISTS "Players can update scorecards in their pairing" ON scorecards;
DROP POLICY IF EXISTS "Organizers can manage scorecards in their competitions" ON scorecards;

-- =====================================================
-- CREATE NEW NON-RECURSIVE POLICIES
-- =====================================================

-- -----------------------------------------------------
-- Competition Players Policies (FIXED)
-- -----------------------------------------------------

-- Players can view competition_players for competitions they belong to
CREATE POLICY "Players can view competition players"
  ON competition_players FOR SELECT
  USING (
    -- User is a member of this competition (use helper function)
    is_competition_member(competition_id, auth.uid())
    OR
    -- User is the organizer of this competition
    is_competition_organizer(competition_id, auth.uid())
  );

-- Organizers can manage (insert/update/delete) players in their competitions
CREATE POLICY "Organizers can manage competition players"
  ON competition_players FOR ALL
  USING (is_competition_organizer(competition_id, auth.uid()));

-- Players can join competitions (insert themselves)
CREATE POLICY "Players can join competitions"
  ON competition_players FOR INSERT
  WITH CHECK (player_id = auth.uid());

-- Players can update their own competition status
CREATE POLICY "Players can update own competition status"
  ON competition_players FOR UPDATE
  USING (player_id = auth.uid());

-- -----------------------------------------------------
-- Players Policies (FIXED)
-- -----------------------------------------------------

-- Players can view other players in their competitions
CREATE POLICY "Users can view players in their competitions"
  ON players FOR SELECT
  USING (
    -- User viewing their own profile
    auth.uid() = id
    OR
    -- User is in the same competition as this player
    EXISTS (
      SELECT 1 FROM get_user_competition_ids(auth.uid()) AS user_comps
      WHERE user_comps IN (
        SELECT competition_id FROM competition_players WHERE player_id = players.id
      )
    )
  );

-- -----------------------------------------------------
-- Competitions Policies (FIXED)
-- -----------------------------------------------------

-- Players can view competitions they're members of
CREATE POLICY "Players can view their competitions"
  ON competitions FOR SELECT
  USING (
    -- User is the organizer
    auth.uid() = organizer_id
    OR
    -- User is a member
    is_competition_member(id, auth.uid())
  );

-- -----------------------------------------------------
-- Rounds Policies (FIXED)
-- -----------------------------------------------------

-- Organizers can manage rounds in their competitions
CREATE POLICY "Organizers can manage rounds in their competitions"
  ON rounds FOR ALL
  USING (is_competition_organizer(competition_id, auth.uid()));

-- Players can view rounds in their competitions
CREATE POLICY "Players can view rounds in their competitions"
  ON rounds FOR SELECT
  USING (is_competition_member(competition_id, auth.uid()));

-- -----------------------------------------------------
-- Pairings Policies (FIXED)
-- -----------------------------------------------------

-- Organizers can manage pairings
CREATE POLICY "Organizers can manage pairings"
  ON pairings FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM rounds r
      WHERE r.id = round_id
      AND is_competition_organizer(r.competition_id, auth.uid())
    )
  );

-- Players can view pairings in their rounds
CREATE POLICY "Players can view pairings in their rounds"
  ON pairings FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM rounds r
      WHERE r.id = round_id
      AND is_competition_member(r.competition_id, auth.uid())
    )
  );

-- -----------------------------------------------------
-- Scorecards Policies (FIXED)
-- -----------------------------------------------------

-- Players can view scorecards in their competitions
CREATE POLICY "Players can view scorecards in their competitions"
  ON scorecards FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM rounds r
      WHERE r.id = round_id
      AND is_competition_member(r.competition_id, auth.uid())
    )
  );

-- Players can create scorecards for rounds they're in
CREATE POLICY "Players can create scorecards for their rounds"
  ON scorecards FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM rounds r
      WHERE r.id = round_id
      AND is_competition_member(r.competition_id, auth.uid())
    )
  );

-- Players can update scorecards (their own or in their pairing)
CREATE POLICY "Players can update scorecards in their pairing"
  ON scorecards FOR UPDATE
  USING (
    -- Player updating their own scorecard
    player_id = auth.uid()
    OR
    -- Player is in the same pairing as the scorecard owner
    EXISTS (
      SELECT 1 FROM pairings p
      WHERE p.round_id = scorecards.round_id
      AND auth.uid() = ANY(p.player_ids)
      AND scorecards.player_id = ANY(p.player_ids)
    )
  );

-- Organizers can manage all scorecards in their competitions
CREATE POLICY "Organizers can manage scorecards in their competitions"
  ON scorecards FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM rounds r
      WHERE r.id = round_id
      AND is_competition_organizer(r.competition_id, auth.uid())
    )
  );

-- =====================================================
-- GRANT EXECUTE ON HELPER FUNCTIONS
-- =====================================================
GRANT EXECUTE ON FUNCTION is_competition_member TO authenticated;
GRANT EXECUTE ON FUNCTION get_user_competition_ids TO authenticated;
GRANT EXECUTE ON FUNCTION is_competition_organizer TO authenticated;

-- =====================================================
-- MIGRATION COMPLETE
-- =====================================================
COMMENT ON FUNCTION is_competition_member IS 'Check if a user is a member of a competition (SECURITY DEFINER to bypass RLS)';
COMMENT ON FUNCTION get_user_competition_ids IS 'Get all competition IDs for a user (SECURITY DEFINER to bypass RLS)';
COMMENT ON FUNCTION is_competition_organizer IS 'Check if a user is the organizer of a competition';
