-- Migration: Allow rounds to be created without a course (placeholder rounds)
-- This enables the simplified wizard flow where users can create competitions
-- with blank rounds and configure them later in the competition details screen.

-- Drop the NOT NULL constraint on course_id
ALTER TABLE rounds ALTER COLUMN course_id DROP NOT NULL;

-- Add comment explaining the nullable field
COMMENT ON COLUMN rounds.course_id IS 'Reference to course. NULL means round is not yet configured with a course and cannot be started until one is selected.';

-- Add a function to check if a round is fully configured (has course)
CREATE OR REPLACE FUNCTION is_round_configured(round_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM rounds r
    WHERE r.id = round_id
    AND r.course_id IS NOT NULL
  );
END;
$$ LANGUAGE plpgsql STABLE;

-- Add comment
COMMENT ON FUNCTION is_round_configured(UUID) IS 'Check if a round has been fully configured with a course. Returns false for placeholder rounds.';
