-- Migration: Allow standalone rounds (rounds without a competition)
-- This enables users to track personal/practice rounds that sync to the cloud

-- ============================================================================
-- STEP 1: Modify rounds table to allow NULL competition_id
-- ============================================================================

-- Add user_id column for standalone rounds (to track ownership)
ALTER TABLE rounds ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id);

-- Make competition_id nullable
ALTER TABLE rounds ALTER COLUMN competition_id DROP NOT NULL;

-- Add constraint: standalone rounds MUST have user_id, competition rounds don't need it
ALTER TABLE rounds ADD CONSTRAINT rounds_ownership_check
  CHECK (
    (competition_id IS NOT NULL) OR (user_id IS NOT NULL)
  );

-- Add index for user's standalone rounds
CREATE INDEX IF NOT EXISTS idx_rounds_user_id ON rounds(user_id) WHERE user_id IS NOT NULL;

-- ============================================================================
-- STEP 2: Update RLS policies for rounds table
-- ============================================================================

-- Drop existing policies that assume competition_id is always present
DROP POLICY IF EXISTS "Users can view rounds in their competitions" ON rounds;
DROP POLICY IF EXISTS "Organizers can manage rounds" ON rounds;

-- New policy: Users can view rounds in their competitions OR their own standalone rounds
CREATE POLICY "Users can view rounds"
  ON rounds FOR SELECT
  USING (
    -- Standalone rounds: user owns it
    (user_id = auth.uid())
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
  );

-- New policy: Users can create standalone rounds for themselves
CREATE POLICY "Users can create standalone rounds"
  ON rounds FOR INSERT
  WITH CHECK (
    -- Standalone rounds: user_id must match auth user
    (competition_id IS NULL AND user_id = auth.uid())
    OR
    -- Competition rounds: must be organizer
    (competition_id IS NOT NULL AND EXISTS (
      SELECT 1 FROM competitions c
      WHERE c.id = rounds.competition_id
      AND c.organizer_id = auth.uid()
    ))
  );

-- New policy: Users can update their standalone rounds, organizers can update competition rounds
CREATE POLICY "Users can update rounds"
  ON rounds FOR UPDATE
  USING (
    -- Standalone rounds: user owns it
    (user_id = auth.uid())
    OR
    -- Competition rounds: user is the organizer
    (competition_id IS NOT NULL AND EXISTS (
      SELECT 1 FROM competitions c
      WHERE c.id = rounds.competition_id
      AND c.organizer_id = auth.uid()
    ))
  );

-- New policy: Users can delete their standalone rounds, organizers can delete competition rounds
CREATE POLICY "Users can delete rounds"
  ON rounds FOR DELETE
  USING (
    -- Standalone rounds: user owns it
    (user_id = auth.uid())
    OR
    -- Competition rounds: user is the organizer
    (competition_id IS NOT NULL AND EXISTS (
      SELECT 1 FROM competitions c
      WHERE c.id = rounds.competition_id
      AND c.organizer_id = auth.uid()
    ))
  );

-- ============================================================================
-- STEP 3: Update scorecards RLS to allow scoring standalone rounds
-- ============================================================================

-- Drop existing policies
DROP POLICY IF EXISTS "Users can view scorecards in their competitions" ON scorecards;
DROP POLICY IF EXISTS "Users can create scorecards" ON scorecards;
DROP POLICY IF EXISTS "Users can update scorecards" ON scorecards;

-- New policy: Users can view scorecards for their rounds
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

-- New policy: Users can create scorecards for their rounds
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
    -- Scorecard for another player in same pairing (group scoring)
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

-- New policy: Users can update scorecards
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
    -- Scorecard for player in same pairing (group scoring)
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

-- ============================================================================
-- STEP 4: Add helpful comments
-- ============================================================================

COMMENT ON COLUMN rounds.user_id IS 'Owner of standalone rounds (NULL for competition rounds)';
COMMENT ON COLUMN rounds.competition_id IS 'Parent competition (NULL for standalone rounds)';
