-- Migration: Internationalize handicap terminology
-- Replaces Australia-specific 'golf-australia' with international 'whs' (World Handicap System)
-- Relaxes golf_id format to support international golf body IDs

-- 1. Drop the CHECK constraint first so we can update values
ALTER TABLE competitions DROP CONSTRAINT IF EXISTS competitions_handicap_system_check;

-- 2. Update handicap_system values from 'golf-australia' to 'whs'
UPDATE competitions SET handicap_system = 'whs' WHERE handicap_system = 'golf-australia';

-- 3. Recreate the CHECK constraint with the new value
ALTER TABLE competitions ADD CONSTRAINT competitions_handicap_system_check
  CHECK (handicap_system IN ('honor', 'whs', 'gross-only'));

-- 3. Relax golf_id format constraint (was 10-digit numeric, now 4-15 alphanumeric)
ALTER TABLE players DROP CONSTRAINT IF EXISTS golf_id_format;
ALTER TABLE players ADD CONSTRAINT golf_id_format CHECK (
  golf_id IS NULL OR golf_id ~ '^[A-Za-z0-9]{4,15}$'
);

-- 4. Update column comments to remove Australia-specific references
COMMENT ON COLUMN players.golf_id IS 'National golf body ID (e.g., Golf Australia, England Golf, USGA)';
COMMENT ON COLUMN players.handicap_updated_at IS 'Timestamp when handicap was last updated by the player';
