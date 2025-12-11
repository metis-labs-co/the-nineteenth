-- Migration: Add Golf ID and handicap tracking fields
-- Purpose: Enable player self-lookup verification from Golf Australia app

-- Add new columns to players table
ALTER TABLE players
  ADD COLUMN golf_id TEXT,
  ADD COLUMN handicap_updated_at TIMESTAMPTZ;

-- Add check constraint for Golf ID format (exactly 10 digits)
ALTER TABLE players
  ADD CONSTRAINT golf_id_format CHECK (
    golf_id IS NULL OR golf_id ~ '^[0-9]{10}$'
  );

-- Create partial index for Golf ID lookups (only indexes non-null values)
CREATE INDEX idx_players_golf_id ON players(golf_id) WHERE golf_id IS NOT NULL;

-- Update existing players: set handicap_updated_at to created_at where handicap exists
UPDATE players
SET handicap_updated_at = created_at
WHERE handicap IS NOT NULL AND handicap > 0;

-- Add comment for documentation
COMMENT ON COLUMN players.golf_id IS '10-digit Golf Australia ID (formerly GOLF Link number)';
COMMENT ON COLUMN players.handicap_updated_at IS 'Timestamp when handicap was last updated by the player';
