-- =====================================================
-- Auto-Create Player Profile on Signup
-- =====================================================
-- This migration adds a trigger that automatically creates a player
-- profile when a new user signs up via Supabase Auth.
-- This solves the RLS timing issue where auth.uid() isn't set
-- during the immediate post-signup insert.
-- =====================================================

-- -----------------------------------------------------
-- Function: Handle New User Signup
-- -----------------------------------------------------
-- This function runs AFTER a new user is created in auth.users
-- It creates a corresponding player profile in the players table
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.players (id, email, name, phone, handicap)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'name', split_part(NEW.email, '@', 1)),
    NEW.raw_user_meta_data->>'phone',
    COALESCE((NEW.raw_user_meta_data->>'handicap')::numeric, 0)
  )
  ON CONFLICT (id) DO NOTHING; -- Ignore if profile already exists

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- -----------------------------------------------------
-- Trigger: On Auth User Created
-- -----------------------------------------------------
-- Drop existing trigger if it exists
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

-- Create the trigger
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- =====================================================
-- MIGRATION COMPLETE
-- =====================================================
COMMENT ON FUNCTION public.handle_new_user IS 'Automatically creates a player profile when a new user signs up';
