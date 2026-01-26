-- Add 'shamble' to team_format enum
-- Shamble: Best drive selected, then each player plays their own ball from there
-- Team score = sum of all individual Stableford points

ALTER TYPE team_format ADD VALUE IF NOT EXISTS 'shamble';
