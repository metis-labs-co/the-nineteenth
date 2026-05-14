-- =====================================================
-- Add country column to players
-- =====================================================
-- Stores ISO-3166 alpha-2 country code (e.g. 'AU', 'GB', 'US').
-- Captured at signup from the device region via expo-localization.
-- Used for analytics during multi-country rollout.
-- =====================================================

ALTER TABLE players
  ADD COLUMN IF NOT EXISTS country TEXT;

ALTER TABLE players
  DROP CONSTRAINT IF EXISTS players_country_format_check;

ALTER TABLE players
  ADD CONSTRAINT players_country_format_check
    CHECK (country IS NULL OR country ~ '^[A-Z]{2}$');

COMMENT ON COLUMN players.country IS
  'ISO-3166 alpha-2 country code captured from device region at signup. Used for analytics.';

-- -----------------------------------------------------
-- Backfill from home club, else default to AU
-- -----------------------------------------------------
-- Most existing users joined when the app was AU-only, and clubs.country
-- defaults to 'Australia'. Map the few known long-form country names to
-- alpha-2; anything else falls back to AU.
UPDATE players p
SET country = CASE
    WHEN c.country IS NULL THEN 'AU'
    WHEN c.country ILIKE 'Australia' THEN 'AU'
    WHEN c.country ILIKE 'United Kingdom' OR c.country ILIKE 'UK' OR c.country ILIKE 'Great Britain' THEN 'GB'
    WHEN c.country ILIKE 'United States' OR c.country ILIKE 'USA' OR c.country ILIKE 'US' THEN 'US'
    WHEN c.country ILIKE 'New Zealand' THEN 'NZ'
    ELSE 'AU'
  END
FROM (SELECT id, country FROM clubs) c
WHERE p.country IS NULL
  AND p.home_club_id = c.id;

UPDATE players
SET country = 'AU'
WHERE country IS NULL;

-- -----------------------------------------------------
-- Update auth trigger to read country from metadata
-- -----------------------------------------------------
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.players (id, email, name, phone, handicap, country)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(
      NEW.raw_user_meta_data->>'name',
      split_part(NEW.email, '@', 1),
      'Player'
    ),
    NEW.raw_user_meta_data->>'phone',
    COALESCE((NEW.raw_user_meta_data->>'handicap')::numeric, 0),
    COALESCE(UPPER(NEW.raw_user_meta_data->>'country'), 'AU')
  )
  ON CONFLICT (id) DO UPDATE SET
    email = EXCLUDED.email,
    name = CASE
      WHEN players.name IS NULL OR players.name = '' THEN EXCLUDED.name
      ELSE players.name
    END,
    country = COALESCE(players.country, EXCLUDED.country);

  RETURN NEW;
EXCEPTION WHEN OTHERS THEN
  RAISE WARNING 'handle_new_user trigger failed for user %: %', NEW.id, SQLERRM;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION public.handle_new_user IS
  'Automatically creates or updates a player profile when a new user signs up. Captures country from raw_user_meta_data (set by client from expo-localization).';
