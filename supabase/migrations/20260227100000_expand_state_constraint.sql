-- Remove clubs.state CHECK constraint entirely
-- Validation now handled at the application layer via src/constants/countries.ts
-- This allows adding new countries/regions without needing database migrations

ALTER TABLE clubs DROP CONSTRAINT IF EXISTS clubs_state_check;
