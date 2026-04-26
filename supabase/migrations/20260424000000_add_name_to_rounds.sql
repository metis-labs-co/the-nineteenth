-- Add optional name column to rounds.
-- NULL falls back to derived titles in the UI (e.g. "Round 1", "Practice Round").
ALTER TABLE public.rounds
  ADD COLUMN IF NOT EXISTS name TEXT;

COMMENT ON COLUMN public.rounds.name IS 'Optional user-defined name. NULL falls back to derived titles (Round N, Practice Round, etc.).';
