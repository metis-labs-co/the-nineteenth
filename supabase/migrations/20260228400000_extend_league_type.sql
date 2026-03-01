-- Extend league_type to support 'season' and 'round_limit' types
-- Only runs if the leagues table and league_type column exist

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'leagues' AND column_name = 'league_type'
  ) THEN
    -- Drop any existing check constraint on league_type
    -- PostgreSQL auto-names inline CHECK constraints as {table}_{column}_check
    EXECUTE 'ALTER TABLE leagues DROP CONSTRAINT IF EXISTS leagues_league_type_check';

    -- Add updated constraint with new types
    EXECUTE 'ALTER TABLE leagues ADD CONSTRAINT leagues_league_type_check
      CHECK (league_type IN (''ongoing'', ''season'', ''round_limit''))';
  END IF;
END $$;
