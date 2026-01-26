-- Add GA handicap snapshot to scorecards
-- Stores the player's GA handicap at the time of round completion
-- This is the input handicap value, while daily_handicap_used is the calculated strokes received

ALTER TABLE scorecards
ADD COLUMN ga_handicap_used NUMERIC(4,1);

-- Add comment for documentation
COMMENT ON COLUMN scorecards.ga_handicap_used IS 'Player GA handicap at time of round (input value for daily handicap calculation)';
