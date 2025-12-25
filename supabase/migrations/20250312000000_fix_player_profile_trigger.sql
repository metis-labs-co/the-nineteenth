-- =====================================================
-- Fix Player Profile Trigger and Backfill Missing Players
-- =====================================================
-- This migration:
-- 1. Recreates the handle_new_user trigger function with better error handling
-- 2. Backfills any auth.users who are missing player profiles
-- 3. Ensures the trigger is properly attached to auth.users
--
-- Root cause: The on_auth_user_created trigger was not executing or failing
-- silently, causing new users to not have player profiles created.
-- =====================================================

-- -----------------------------------------------------
-- Step 1: Recreate the trigger function with error handling
-- -----------------------------------------------------
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  -- Create player profile for new user
  -- Uses COALESCE to provide sensible defaults for missing metadata
  INSERT INTO public.players (id, email, name, phone, handicap)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(
      NEW.raw_user_meta_data->>'name',
      split_part(NEW.email, '@', 1),
      'Player'
    ),
    NEW.raw_user_meta_data->>'phone',
    COALESCE((NEW.raw_user_meta_data->>'handicap')::numeric, 0)
  )
  ON CONFLICT (id) DO UPDATE SET
    -- Update email if it changed (in case of email update in auth)
    email = EXCLUDED.email,
    -- Only update name if current name is null/empty
    name = CASE
      WHEN players.name IS NULL OR players.name = '' THEN EXCLUDED.name
      ELSE players.name
    END;

  RETURN NEW;
EXCEPTION WHEN OTHERS THEN
  -- Log the error but don't fail the auth transaction
  RAISE WARNING 'handle_new_user trigger failed for user %: %', NEW.id, SQLERRM;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Add comment to function
COMMENT ON FUNCTION public.handle_new_user IS
  'Automatically creates or updates a player profile when a new user signs up. Includes error handling to prevent auth failures.';

-- -----------------------------------------------------
-- Step 2: Ensure trigger is properly attached
-- -----------------------------------------------------
-- Drop existing trigger first (idempotent)
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

-- Recreate the trigger
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- -----------------------------------------------------
-- Step 3: Backfill missing player profiles
-- -----------------------------------------------------
-- Create profiles for any auth.users who are missing from the players table
-- This fixes existing users who were affected by the broken trigger
INSERT INTO public.players (id, email, name, handicap)
SELECT
  u.id,
  u.email,
  COALESCE(
    u.raw_user_meta_data->>'name',
    split_part(u.email, '@', 1),
    'Player'
  ),
  COALESCE((u.raw_user_meta_data->>'handicap')::numeric, 0)
FROM auth.users u
WHERE NOT EXISTS (
  SELECT 1 FROM public.players p WHERE p.id = u.id
)
ON CONFLICT (id) DO NOTHING;

-- -----------------------------------------------------
-- Step 4: Grant necessary permissions
-- -----------------------------------------------------
-- Ensure the authenticated role can insert their own player profile
-- This is a fallback for the app-level ensurePlayerProfile function
GRANT INSERT, UPDATE ON public.players TO authenticated;

-- =====================================================
-- MIGRATION COMPLETE
-- =====================================================
