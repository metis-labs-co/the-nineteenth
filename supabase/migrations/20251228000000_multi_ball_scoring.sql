-- =====================================================
-- Multi-Ball Scoring Support for Solo Rounds
-- =====================================================
-- Enables solo round players to score multiple balls (2-4) per hole
-- for practice purposes. Feature gated to Social tier and above.

-- Add multi-ball configuration to rounds table
ALTER TABLE rounds
ADD COLUMN ball_count INTEGER DEFAULT 1;

-- Add constraint: ball_count must be between 1 and 4
ALTER TABLE rounds
ADD CONSTRAINT valid_ball_count CHECK (ball_count >= 1 AND ball_count <= 4);

-- Add per-ball totals to scorecards (JSONB for flexibility)
-- Format: { "1": { "gross": 85, "net": 72, "points": 36 }, "2": {...}, ... }
ALTER TABLE scorecards
ADD COLUMN ball_totals JSONB DEFAULT NULL;

-- Add comments for documentation
COMMENT ON COLUMN rounds.ball_count IS 'Number of balls scored per hole (1-4). Only applicable for solo rounds. Requires Social tier or higher for ball_count > 1.';
COMMENT ON COLUMN scorecards.ball_totals IS 'Per-ball totals for multi-ball rounds. Format: { "1": { "gross": number, "net": number, "points": number }, ... }. NULL for single-ball rounds.';

-- Create index for querying multi-ball rounds efficiently
CREATE INDEX idx_rounds_multi_ball ON rounds(ball_count) WHERE ball_count > 1;
