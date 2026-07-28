-- Phase 1B.3: per-competition gate for placeholder/guest players.

ALTER TABLE competitions
  ADD COLUMN allow_guests BOOLEAN NOT NULL DEFAULT TRUE;

COMMENT ON COLUMN competitions.allow_guests IS
  'Whether organisers may add placeholder guest players. Disabling does not remove existing guests.';
