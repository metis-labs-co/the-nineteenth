-- Migration: Add handicap_source to competitions
-- Allows organizers to choose which handicap value to use for daily handicap calculations:
-- - 'profile': Use player's manually entered GA handicap (players.handicap)
-- - 'calculated': Use player's Social Handicap Index from app rounds (players.handicap_index)
-- - 'none': No handicap adjustments (gross scoring only)

-- Create enum type for handicap source
CREATE TYPE handicap_source AS ENUM ('profile', 'calculated', 'none');

-- Add column to competitions table with default 'profile' for backward compatibility
ALTER TABLE competitions
ADD COLUMN handicap_source handicap_source NOT NULL DEFAULT 'profile';

-- Add helpful comment
COMMENT ON COLUMN competitions.handicap_source IS
  'Source for daily handicap calculation: profile (GA handicap), calculated (Social Handicap Index from app), none (no adjustments)';
