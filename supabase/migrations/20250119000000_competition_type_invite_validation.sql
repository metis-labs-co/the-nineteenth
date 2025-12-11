-- =====================================================
-- Competition Type & Invite Code Validation
-- =====================================================
-- This migration adds:
-- 1. competition_type field (league vs event)
-- 2. Partial unique index for invite codes (only active competitions)
-- 3. Auto-deactivation function for expired event competitions
-- =====================================================

-- -----------------------------------------------------
-- 1. Add competition_type column
-- -----------------------------------------------------
-- 'league' = ongoing competition, no end date required
-- 'event' = fixed-term competition, requires end_date, auto-deactivates
ALTER TABLE competitions
ADD COLUMN competition_type TEXT NOT NULL DEFAULT 'league'
CHECK (competition_type IN ('league', 'event'));

-- Add constraint: event competitions must have an end_date
ALTER TABLE competitions
ADD CONSTRAINT event_requires_end_date
CHECK (
  competition_type = 'league'
  OR (competition_type = 'event' AND end_date IS NOT NULL)
);

-- -----------------------------------------------------
-- 2. Update invite code uniqueness
-- -----------------------------------------------------
-- Drop the existing unique constraint on invite_code
ALTER TABLE competitions
DROP CONSTRAINT IF EXISTS competitions_invite_code_key;

-- Drop the existing index if it exists
DROP INDEX IF EXISTS idx_competitions_invite_code;

-- Create partial unique index: invite codes only need to be unique
-- among active competitions (not completed or cancelled)
CREATE UNIQUE INDEX idx_competitions_invite_code_active
ON competitions (invite_code)
WHERE status NOT IN ('completed', 'cancelled');

-- Also create a regular index for lookups (non-unique, covers all records)
CREATE INDEX idx_competitions_invite_code_lookup
ON competitions (invite_code);

-- -----------------------------------------------------
-- 3. Update invite code generation trigger
-- -----------------------------------------------------
-- Only check for collisions against active competitions
CREATE OR REPLACE FUNCTION generate_invite_code()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.invite_code IS NULL THEN
    -- Generate format: COMP-12345 (5 random digits)
    NEW.invite_code := 'COMP-' || LPAD(FLOOR(RANDOM() * 100000)::TEXT, 5, '0');

    -- Ensure uniqueness among ACTIVE competitions only (retry if collision)
    WHILE EXISTS (
      SELECT 1 FROM competitions
      WHERE invite_code = NEW.invite_code
      AND status NOT IN ('completed', 'cancelled')
    ) LOOP
      NEW.invite_code := 'COMP-' || LPAD(FLOOR(RANDOM() * 100000)::TEXT, 5, '0');
    END LOOP;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- -----------------------------------------------------
-- 4. Function to deactivate expired event competitions
-- -----------------------------------------------------
-- This function marks event competitions as 'completed' when their
-- end_date has passed (at midnight)
CREATE OR REPLACE FUNCTION deactivate_expired_competitions()
RETURNS INTEGER AS $$
DECLARE
  affected_count INTEGER;
BEGIN
  UPDATE competitions
  SET status = 'completed'
  WHERE competition_type = 'event'
    AND end_date < CURRENT_DATE
    AND status NOT IN ('completed', 'cancelled');

  GET DIAGNOSTICS affected_count = ROW_COUNT;
  RETURN affected_count;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION deactivate_expired_competitions IS
'Marks event-type competitions as completed when end_date passes. Call via pg_cron or app-level scheduled job.';

-- -----------------------------------------------------
-- 5. Function to validate invite code for joining
-- -----------------------------------------------------
-- Returns the competition if the invite code is valid and competition is active
CREATE OR REPLACE FUNCTION get_competition_by_invite_code(code TEXT)
RETURNS TABLE (
  id UUID,
  name TEXT,
  description TEXT,
  start_date DATE,
  end_date DATE,
  competition_type TEXT,
  handicap_system TEXT,
  status TEXT,
  organizer_id UUID
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    c.id,
    c.name,
    c.description,
    c.start_date,
    c.end_date,
    c.competition_type,
    c.handicap_system,
    c.status,
    c.organizer_id
  FROM competitions c
  WHERE c.invite_code = code
    AND c.status NOT IN ('completed', 'cancelled');
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER;

COMMENT ON FUNCTION get_competition_by_invite_code IS
'Lookup a competition by invite code. Only returns active competitions (not completed/cancelled).';

-- -----------------------------------------------------
-- 6. Add index for competition type queries
-- -----------------------------------------------------
CREATE INDEX idx_competitions_type ON competitions(competition_type);
CREATE INDEX idx_competitions_end_date ON competitions(end_date) WHERE end_date IS NOT NULL;

-- -----------------------------------------------------
-- Comments
-- -----------------------------------------------------
COMMENT ON COLUMN competitions.competition_type IS
'Type of competition: league (ongoing, no end date) or event (fixed-term, auto-deactivates after end_date)';

-- =====================================================
-- MIGRATION COMPLETE
-- =====================================================
