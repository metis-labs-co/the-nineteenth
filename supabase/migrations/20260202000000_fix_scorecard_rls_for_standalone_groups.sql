-- Migration: Fix scorecards RLS for standalone round group scoring
-- Issue: Users cannot create scorecards for other players in standalone rounds
--        because they aren't linked via competition_players or pairings
-- Solution: Add check for round_players table for standalone rounds

-- ============================================================================
-- STEP 1: Drop existing scorecard policies
-- ============================================================================

DROP POLICY IF EXISTS "Users can view scorecards" ON scorecards;
DROP POLICY IF EXISTS "Users can create scorecards" ON scorecards;
DROP POLICY IF EXISTS "Users can update scorecards" ON scorecards;
DROP POLICY IF EXISTS "Users can delete scorecards" ON scorecards;

-- ============================================================================
-- STEP 2: Create updated policies with round_players support
-- ============================================================================

-- SELECT: Users can view scorecards they're associated with
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
  );

-- INSERT: Users can create scorecards for themselves or others in their round/competition
CREATE POLICY "Users can create scorecards"
  ON scorecards FOR INSERT
  WITH CHECK (
    -- Own scorecard in a standalone round the user owns
    (player_id = auth.uid() AND EXISTS (
      SELECT 1 FROM rounds r
      WHERE r.id = scorecards.round_id
      AND r.user_id = auth.uid()
    ))
    OR
    -- Scorecard for ANY player in a standalone round the user owns
    -- (Round owner can create scorecards for all players in their round)
    EXISTS (
      SELECT 1 FROM rounds r
      JOIN round_players rp ON rp.round_id = r.id
      WHERE r.id = scorecards.round_id
      AND r.user_id = auth.uid()
      AND r.competition_id IS NULL
      AND rp.player_id = scorecards.player_id
    )
    OR
    -- Scorecard for another player in the same standalone round (via round_players)
    -- User must be a participant in the round
    EXISTS (
      SELECT 1 FROM round_players rp_self
      JOIN round_players rp_target ON rp_target.round_id = rp_self.round_id
      WHERE rp_self.round_id = scorecards.round_id
      AND rp_self.player_id = auth.uid()
      AND rp_target.player_id = scorecards.player_id
    )
    OR
    -- Own scorecard in a competition round where user is a member
    (player_id = auth.uid() AND EXISTS (
      SELECT 1 FROM rounds r
      JOIN competition_players cp ON cp.competition_id = r.competition_id
      WHERE r.id = scorecards.round_id
      AND cp.player_id = auth.uid()
      AND cp.status = 'accepted'
    ))
    OR
    -- Scorecard for another player in same pairing (group scoring with pairings)
    EXISTS (
      SELECT 1 FROM pairings p
      WHERE p.round_id = scorecards.round_id
      AND auth.uid() = ANY(p.player_ids)
      AND scorecards.player_id = ANY(p.player_ids)
    )
    OR
    -- Scorecard for any player in the same competition (group scoring without pairings)
    EXISTS (
      SELECT 1 FROM rounds r
      JOIN competition_players cp_self ON cp_self.competition_id = r.competition_id
      JOIN competition_players cp_target ON cp_target.competition_id = r.competition_id
      WHERE r.id = scorecards.round_id
      AND cp_self.player_id = auth.uid()
      AND cp_self.status = 'accepted'
      AND cp_target.player_id = scorecards.player_id
      AND cp_target.status = 'accepted'
    )
    OR
    -- Organizer can create scorecards for any player in their competition
    EXISTS (
      SELECT 1 FROM rounds r
      JOIN competitions c ON c.id = r.competition_id
      WHERE r.id = scorecards.round_id
      AND c.organizer_id = auth.uid()
    )
  );

-- UPDATE: Users can update scorecards they have access to
CREATE POLICY "Users can update scorecards"
  ON scorecards FOR UPDATE
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
    -- Scorecard for player in same pairing (group scoring with pairings)
    EXISTS (
      SELECT 1 FROM pairings p
      WHERE p.round_id = scorecards.round_id
      AND auth.uid() = ANY(p.player_ids)
      AND scorecards.player_id = ANY(p.player_ids)
    )
    OR
    -- Scorecard for any player in the same competition (group scoring without pairings)
    EXISTS (
      SELECT 1 FROM rounds r
      JOIN competition_players cp_self ON cp_self.competition_id = r.competition_id
      JOIN competition_players cp_target ON cp_target.competition_id = r.competition_id
      WHERE r.id = scorecards.round_id
      AND cp_self.player_id = auth.uid()
      AND cp_self.status = 'accepted'
      AND cp_target.player_id = scorecards.player_id
      AND cp_target.status = 'accepted'
    )
    OR
    -- Organizer can update scorecards
    EXISTS (
      SELECT 1 FROM rounds r
      JOIN competitions c ON c.id = r.competition_id
      WHERE r.id = scorecards.round_id
      AND c.organizer_id = auth.uid()
    )
  );

-- DELETE: Users can delete scorecards they own or manage
CREATE POLICY "Users can delete scorecards"
  ON scorecards FOR DELETE
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
    -- Organizer can delete scorecards
    EXISTS (
      SELECT 1 FROM rounds r
      JOIN competitions c ON c.id = r.competition_id
      WHERE r.id = scorecards.round_id
      AND c.organizer_id = auth.uid()
    )
  );
