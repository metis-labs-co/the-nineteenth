-- =====================================================
-- Clear backfilled players.country values
-- =====================================================
-- The previous migration (20260515000000) backfilled every existing player
-- to 'AU' (or a mapped home-club country). That value is a guess, not a
-- real device capture, and pollutes analytics.
--
-- Reset all existing rows to NULL, and adjust the auth trigger so it no
-- longer defaults to 'AU' — the column only gets populated when the client
-- explicitly supplies country in raw_user_meta_data (set from
-- expo-localization at signup) or via the on-login backfill.
--
-- Safe to run because no production client builds capture country yet —
-- every non-NULL value currently in the table is from the backfill.
-- =====================================================

UPDATE players SET country = NULL;

-- -----------------------------------------------------
-- Trigger: no longer defaults to 'AU'
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
    UPPER(NULLIF(NEW.raw_user_meta_data->>'country', ''))
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
  'Creates or updates a player profile when a new user signs up. Captures country from raw_user_meta_data (set by client from expo-localization). Leaves country NULL if not provided — the client backfills it on login.';
