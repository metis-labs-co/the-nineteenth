-- =====================================================
-- Player Profile Auto-Creation Trigger
-- =====================================================
-- Automatically creates a player profile when a new user signs up
-- This ensures the players table is always in sync with auth.users
--
-- Note: This is OPTIONAL. The useAuth hook handles player creation
-- manually if this trigger is not set up.
-- =====================================================

-- Function to auto-create player profile on user signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.players (id, email, name, phone, handicap)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'name', ''),
    COALESCE(NEW.raw_user_meta_data->>'phone', NULL),
    COALESCE((NEW.raw_user_meta_data->>'handicap')::NUMERIC, 0)
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to run after user signup
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();

-- =====================================================
-- NOTES
-- =====================================================
--
-- This trigger extracts user metadata passed during signup:
--
-- supabase.auth.signUp({
--   email: 'user@example.com',
--   password: 'password',
--   options: {
--     data: {
--       name: 'John Doe',        // -> players.name
--       phone: '+61412345678',   // -> players.phone
--       handicap: 12.5           // -> players.handicap
--     }
--   }
-- })
--
-- The trigger automatically:
-- 1. Creates a row in public.players with the same ID as auth.users
-- 2. Extracts metadata from raw_user_meta_data
-- 3. Sets defaults if fields are missing
--
-- Benefits:
-- - Ensures data consistency
-- - Removes manual player creation from signup hook
-- - Prevents race conditions
-- - Cleaner separation of concerns
--
-- If you use this trigger, you can simplify the signupMutation in
-- src/hooks/useAuth.ts by removing the manual player insert.
-- =====================================================
