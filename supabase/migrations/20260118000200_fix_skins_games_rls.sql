-- =====================================================
-- Migration: Fix skins_games RLS policies for INSERT
-- =====================================================
-- The original policies used FOR ALL with only USING clauses.
-- PostgreSQL RLS requires WITH CHECK for INSERT operations.
-- This migration fixes the policies to allow proper inserts.
-- =====================================================

-- ============================================================================
-- STEP 1: Drop existing policies
-- ============================================================================

DROP POLICY IF EXISTS "Participants can view their skins games" ON skins_games;
DROP POLICY IF EXISTS "Creators can manage their skins games" ON skins_games;
DROP POLICY IF EXISTS "Round organizers can manage skins games" ON skins_games;

-- ============================================================================
-- STEP 2: Recreate policies with proper WITH CHECK clauses
-- ============================================================================

-- Participants can view games they're part of (SELECT only - no change needed)
CREATE POLICY "Participants can view their skins games"
  ON skins_games FOR SELECT
  USING (auth.uid() = ANY(participant_ids));

-- Creators can manage their games
-- USING: for SELECT, UPDATE, DELETE - check existing created_by
-- WITH CHECK: for INSERT, UPDATE - allow if user is setting themselves as creator
CREATE POLICY "Creators can manage their skins games"
  ON skins_games FOR ALL
  USING (created_by = auth.uid())
  WITH CHECK (created_by = auth.uid());

-- Round organizers can manage skins games in their rounds
-- USING: for existing row checks (SELECT, UPDATE, DELETE)
-- WITH CHECK: for new row validation (INSERT, UPDATE)
CREATE POLICY "Round organizers can manage skins games"
  ON skins_games FOR ALL
  USING (
    round_id IN (
      SELECT r.id FROM rounds r
      WHERE r.competition_id IN (
        SELECT c.id FROM competitions c
        WHERE c.organizer_id = auth.uid()
      )
      OR r.user_id = auth.uid()
    )
  )
  WITH CHECK (
    round_id IN (
      SELECT r.id FROM rounds r
      WHERE r.competition_id IN (
        SELECT c.id FROM competitions c
        WHERE c.organizer_id = auth.uid()
      )
      OR r.user_id = auth.uid()
    )
  );

-- ============================================================================
-- MIGRATION COMPLETE
-- ============================================================================
