-- Migration: Rename competition_type 'league' to 'knockout'
-- Knockout = bracket-style elimination competition (end date optional)
-- Event = fixed-term competition (end date required)

-- Drop old constraints first (they only allow 'league'/'event')
ALTER TABLE competitions DROP CONSTRAINT IF EXISTS competitions_competition_type_check;
ALTER TABLE competitions DROP CONSTRAINT IF EXISTS event_requires_end_date;

-- Update existing data
UPDATE competitions SET competition_type = 'knockout' WHERE competition_type = 'league';

-- Change default from 'league' to 'event'
ALTER TABLE competitions ALTER COLUMN competition_type SET DEFAULT 'event';

-- Add new constraints
ALTER TABLE competitions ADD CONSTRAINT competitions_competition_type_check
  CHECK (competition_type IN ('knockout', 'event'));

ALTER TABLE competitions ADD CONSTRAINT event_requires_end_date
  CHECK (
    competition_type = 'knockout'
    OR (competition_type = 'event' AND end_date IS NOT NULL)
  );
