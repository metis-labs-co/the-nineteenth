-- Migration: Add soft delete support
-- Description: Adds deleted_at columns to competitions and related tables for soft delete functionality
-- Author: Claude
-- Date: 2025-01-10

-- ============================================================================
-- SOFT DELETE COLUMNS
-- ============================================================================

-- Add deleted_at to competitions table
ALTER TABLE competitions
ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ DEFAULT NULL;

-- Add deleted_at to rounds table
ALTER TABLE rounds
ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ DEFAULT NULL;

-- Add deleted_at to scorecards table
ALTER TABLE scorecards
ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ DEFAULT NULL;

-- Add deleted_at to pairings table
ALTER TABLE pairings
ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ DEFAULT NULL;

-- Add deleted_at to competition_players table
ALTER TABLE competition_players
ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ DEFAULT NULL;

-- Add deleted_at to teams table (if exists)
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'teams') THEN
    ALTER TABLE teams ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ DEFAULT NULL;
  END IF;
END $$;

-- Add deleted_at to scoring_pairs table
ALTER TABLE scoring_pairs
ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ DEFAULT NULL;

-- ============================================================================
-- INDEXES FOR SOFT DELETE QUERIES
-- ============================================================================

-- Index for filtering non-deleted competitions
CREATE INDEX IF NOT EXISTS idx_competitions_deleted_at
ON competitions (deleted_at)
WHERE deleted_at IS NULL;

-- Index for filtering non-deleted rounds
CREATE INDEX IF NOT EXISTS idx_rounds_deleted_at
ON rounds (deleted_at)
WHERE deleted_at IS NULL;

-- Index for filtering non-deleted scorecards
CREATE INDEX IF NOT EXISTS idx_scorecards_deleted_at
ON scorecards (deleted_at)
WHERE deleted_at IS NULL;

-- Index for filtering non-deleted pairings
CREATE INDEX IF NOT EXISTS idx_pairings_deleted_at
ON pairings (deleted_at)
WHERE deleted_at IS NULL;

-- Index for filtering non-deleted competition_players
CREATE INDEX IF NOT EXISTS idx_competition_players_deleted_at
ON competition_players (deleted_at)
WHERE deleted_at IS NULL;

-- Index for filtering non-deleted scoring_pairs
CREATE INDEX IF NOT EXISTS idx_scoring_pairs_deleted_at
ON scoring_pairs (deleted_at)
WHERE deleted_at IS NULL;

-- ============================================================================
-- SOFT DELETE FUNCTION FOR COMPETITIONS
-- ============================================================================

-- Function to soft delete a competition and all related data
CREATE OR REPLACE FUNCTION soft_delete_competition(p_competition_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_now TIMESTAMPTZ := NOW();
  v_round_ids UUID[];
BEGIN
  -- Get all round IDs for this competition
  SELECT ARRAY_AGG(id) INTO v_round_ids
  FROM rounds
  WHERE competition_id = p_competition_id
    AND deleted_at IS NULL;

  -- Soft delete scorecards for all rounds
  IF v_round_ids IS NOT NULL AND array_length(v_round_ids, 1) > 0 THEN
    UPDATE scorecards
    SET deleted_at = v_now, updated_at = v_now
    WHERE round_id = ANY(v_round_ids)
      AND deleted_at IS NULL;

    -- Soft delete pairings for all rounds
    UPDATE pairings
    SET deleted_at = v_now, updated_at = v_now
    WHERE round_id = ANY(v_round_ids)
      AND deleted_at IS NULL;

    -- Soft delete scoring_pairs for all rounds
    UPDATE scoring_pairs
    SET deleted_at = v_now, updated_at = v_now
    WHERE round_id = ANY(v_round_ids)
      AND deleted_at IS NULL;
  END IF;

  -- Soft delete rounds
  UPDATE rounds
  SET deleted_at = v_now, updated_at = v_now
  WHERE competition_id = p_competition_id
    AND deleted_at IS NULL;

  -- Soft delete competition_players
  UPDATE competition_players
  SET deleted_at = v_now
  WHERE competition_id = p_competition_id
    AND deleted_at IS NULL;

  -- Soft delete teams (if table exists)
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'teams') THEN
    EXECUTE format('
      UPDATE teams
      SET deleted_at = $1, updated_at = $1
      WHERE competition_id = $2
        AND deleted_at IS NULL
    ') USING v_now, p_competition_id;
  END IF;

  -- Soft delete the competition itself
  UPDATE competitions
  SET deleted_at = v_now, updated_at = v_now
  WHERE id = p_competition_id
    AND deleted_at IS NULL;

  RETURN TRUE;
END;
$$;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION soft_delete_competition(UUID) TO authenticated;

-- ============================================================================
-- COMMENTS
-- ============================================================================

COMMENT ON COLUMN competitions.deleted_at IS 'Soft delete timestamp. NULL means not deleted.';
COMMENT ON COLUMN rounds.deleted_at IS 'Soft delete timestamp. NULL means not deleted.';
COMMENT ON COLUMN scorecards.deleted_at IS 'Soft delete timestamp. NULL means not deleted.';
COMMENT ON COLUMN pairings.deleted_at IS 'Soft delete timestamp. NULL means not deleted.';
COMMENT ON COLUMN competition_players.deleted_at IS 'Soft delete timestamp. NULL means not deleted.';
COMMENT ON COLUMN scoring_pairs.deleted_at IS 'Soft delete timestamp. NULL means not deleted.';

COMMENT ON FUNCTION soft_delete_competition(UUID) IS 'Soft deletes a competition and all related data (rounds, scorecards, pairings, teams, competition_players, scoring_pairs)';
