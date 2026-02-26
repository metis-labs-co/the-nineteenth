-- Add is_featured column to clubs table
-- Featured clubs appear in the default course list view for new users

ALTER TABLE clubs ADD COLUMN IF NOT EXISTS is_featured BOOLEAN NOT NULL DEFAULT false;

-- Partial index for efficient featured club queries
CREATE INDEX IF NOT EXISTS idx_clubs_featured ON clubs(is_featured) WHERE is_featured = true;
