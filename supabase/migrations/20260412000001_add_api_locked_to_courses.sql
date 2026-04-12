-- Add api_locked flag to courses table
-- Prevents API sync from overwriting manually-curated course data
-- (e.g., The Eastern's reverse nine combinations and composite courses)

ALTER TABLE courses ADD COLUMN api_locked BOOLEAN NOT NULL DEFAULT false;

COMMENT ON COLUMN courses.api_locked IS
  'When true, prevents API sync from overwriting manually-curated course data';
