-- Add 'alt-shot' (foursomes) to the rounds.game_type check constraint.
ALTER TABLE rounds DROP CONSTRAINT IF EXISTS rounds_game_type_check;

ALTER TABLE rounds
ADD CONSTRAINT rounds_game_type_check
CHECK (game_type IN ('stroke', 'stableford', 'par', 'match-play', 'best-ball', 'scramble', 'shamble', 'alt-shot'));
