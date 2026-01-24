-- Migration: handicap_differentials
-- Description: Add handicap differential tracking to scorecards and handicap index to players
-- Date: 2026-01-25
-- Dependencies: 20260125000000_add_player_gender.sql must be applied first

-- =====================================================
-- ADD HANDICAP TRACKING COLUMNS TO SCORECARDS TABLE
-- =====================================================

-- Daily handicap used: strokes received for this round (snapshot at submission time)
-- This captures the daily handicap calculated from the player's GA handicap at the time
-- of the round, ensuring historical accuracy even if the player's handicap changes later.
ALTER TABLE scorecards
ADD COLUMN daily_handicap_used INTEGER;

COMMENT ON COLUMN scorecards.daily_handicap_used IS 'Strokes received for this round (snapshot at submission). Calculated from player GA handicap using WHS formula.';

-- Handicap differential: the WHS score differential for this round
-- Formula: (113 / slope_rating) × (adjusted_gross_score - course_rating)
-- Used to calculate the player's Social Handicap Index from their last 20 rounds.
ALTER TABLE scorecards
ADD COLUMN handicap_differential NUMERIC(4,1);

COMMENT ON COLUMN scorecards.handicap_differential IS 'WHS handicap differential for this round. Formula: (113/slope) × (gross - course_rating). Rounded to 1 decimal.';

-- Course rating used: snapshot of the course rating at time of round
-- Stored to ensure historical accuracy and for verification purposes.
ALTER TABLE scorecards
ADD COLUMN course_rating_used NUMERIC(4,1);

COMMENT ON COLUMN scorecards.course_rating_used IS 'Course rating used for differential calculation (snapshot). From tee selection at round time.';

-- Slope rating used: snapshot of the slope rating at time of round
-- Stored to ensure historical accuracy and for verification purposes.
ALTER TABLE scorecards
ADD COLUMN slope_rating_used INTEGER;

COMMENT ON COLUMN scorecards.slope_rating_used IS 'Slope rating used for differential calculation (snapshot). From tee selection at round time.';

-- =====================================================
-- ADD HANDICAP INDEX COLUMNS TO PLAYERS TABLE
-- =====================================================

-- Handicap index: calculated WHS Social Handicap Index
-- This is calculated from the player's best X of their last 20 rounds in this app.
-- Different from their GA handicap which is manually entered or imported.
-- Maximum value is 54.0 per WHS rules.
ALTER TABLE players
ADD COLUMN handicap_index NUMERIC(4,1);

COMMENT ON COLUMN players.handicap_index IS 'Calculated Social Handicap Index from last 20 rounds in this app. Different from GA handicap. Max 54.0.';

-- Handicap index updated at: timestamp when the index was last calculated
-- Used for display purposes and to know when the index was last recalculated.
ALTER TABLE players
ADD COLUMN handicap_index_updated_at TIMESTAMPTZ;

COMMENT ON COLUMN players.handicap_index_updated_at IS 'Timestamp when handicap_index was last calculated/updated.';

-- =====================================================
-- CREATE INDEX FOR EFFICIENT HANDICAP HISTORY QUERIES
-- =====================================================

-- Partial index for fetching player's handicap history
-- Optimized for the exact query pattern used in useHandicapHistory hook:
-- - Filter by player_id
-- - Filter by status IN ('completed', 'confirmed')
-- - Filter by handicap_differential IS NOT NULL
-- - Order by submitted_at DESC
-- - Limit 20
CREATE INDEX idx_scorecards_player_handicap_history
  ON scorecards(player_id, submitted_at DESC)
  WHERE status IN ('completed', 'confirmed')
  AND handicap_differential IS NOT NULL;

COMMENT ON INDEX idx_scorecards_player_handicap_history IS 'Partial index for efficient handicap history queries. Filters on status and non-null differential.';
