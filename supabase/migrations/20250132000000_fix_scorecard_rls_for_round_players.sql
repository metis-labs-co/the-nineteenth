-- =====================================================
-- Fix Scorecards RLS for Round Players
-- The Nineteenth - Golf Competition App
-- =====================================================
-- This migration updates the scorecards RLS policies to allow:
-- - Round owners to create/update scorecards for players in round_players
-- - Players in round_players to create/update scorecards for each other (group scoring)
-- =====================================================

-- Drop existing policies
DROP POLICY IF EXISTS "Users can view scorecards" ON scorecards;
DROP POLICY IF EXISTS "Users can create scorecards" ON scorecards;
DROP POLICY IF EXISTS "Users can update scorecards" ON scorecards;

-- =====================================================
-- SELECT Policy
-- =====================================================
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
    -- Scorecard for a player in the same round_players group (standalone round)
    EXISTS (
      SELECT 1 FROM round_players rp
      WHERE rp.round_id = scorecards.round_id
      AND rp.player_id = auth.uid()
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

-- =====================================================
-- INSERT Policy
-- =====================================================
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
    -- Own scorecard in a competition round
    (player_id = auth.uid() AND EXISTS (
      SELECT 1 FROM rounds r
      JOIN competition_players cp ON cp.competition_id = r.competition_id
      WHERE r.id = scorecards.round_id
      AND cp.player_id = auth.uid()
      AND cp.status = 'accepted'
    ))
    OR
    -- Scorecard for another player in round_players (standalone group scoring)
    -- User must be in the round_players AND creating scorecard for someone also in round_players
    (EXISTS (
      SELECT 1 FROM round_players rp1
      WHERE rp1.round_id = scorecards.round_id
      AND rp1.player_id = auth.uid()
    ) AND EXISTS (
      SELECT 1 FROM round_players rp2
      WHERE rp2.round_id = scorecards.round_id
      AND rp2.player_id = scorecards.player_id
    ))
    OR
    -- Scorecard for another player in same pairing (competition group scoring)
    EXISTS (
      SELECT 1 FROM pairings p
      WHERE p.round_id = scorecards.round_id
      AND auth.uid() = ANY(p.player_ids)
      AND scorecards.player_id = ANY(p.player_ids)
    )
    OR
    -- Organizer can create scorecards
    EXISTS (
      SELECT 1 FROM rounds r
      JOIN competitions c ON c.id = r.competition_id
      WHERE r.id = scorecards.round_id
      AND c.organizer_id = auth.uid()
    )
  );

-- =====================================================
-- UPDATE Policy
-- =====================================================
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
    -- Scorecard for another player in round_players (standalone group scoring)
    (EXISTS (
      SELECT 1 FROM round_players rp1
      WHERE rp1.round_id = scorecards.round_id
      AND rp1.player_id = auth.uid()
    ) AND EXISTS (
      SELECT 1 FROM round_players rp2
      WHERE rp2.round_id = scorecards.round_id
      AND rp2.player_id = scorecards.player_id
    ))
    OR
    -- Scorecard for player in same pairing (competition group scoring)
    EXISTS (
      SELECT 1 FROM pairings p
      WHERE p.round_id = scorecards.round_id
      AND auth.uid() = ANY(p.player_ids)
      AND scorecards.player_id = ANY(p.player_ids)
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

-- =====================================================
-- MIGRATION COMPLETE
-- =====================================================
