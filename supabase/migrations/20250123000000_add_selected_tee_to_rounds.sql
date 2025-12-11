-- Migration: Add selected_tee column to rounds table
-- This stores the selected tee box configuration for the round

-- Add selected_tee column to store the tee box used for this round
-- This is stored as JSONB to match the TeeBox interface structure:
-- { name: string, color: string, totalYardage: number, courseRating?: number, slopeRating?: number }
ALTER TABLE rounds ADD COLUMN IF NOT EXISTS selected_tee JSONB;

COMMENT ON COLUMN rounds.selected_tee IS 'Selected tee box configuration (JSON): name, color, totalYardage, courseRating, slopeRating';
