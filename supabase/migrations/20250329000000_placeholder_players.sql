-- =====================================================
-- Placeholder Players Schema Extension
-- The Nineteenth - Golf Competition App
-- =====================================================
-- This migration extends the players table to support
-- placeholder (guest) players that can be created without
-- an auth account and later linked to a real player.
--
-- Features:
-- - Placeholder players without auth accounts
-- - Creator tracking for placeholders
-- - Linking placeholders to real accounts
-- - Transfer of all history when linking
-- =====================================================

-- =====================================================
-- STEP 1: DROP EXISTING FK CONSTRAINT
-- =====================================================
-- The current players.id references auth.users(id), which
-- prevents creating players without an auth account.
-- We need to remove this constraint to allow placeholders.

-- First, drop the FK constraint that links players.id to auth.users(id)
-- This constraint prevents creating players without an auth account
-- Constraint might be named players_id_fkey or something with 'users' in the name
ALTER TABLE players DROP CONSTRAINT IF EXISTS players_id_fkey;

-- Also try dropping any FK referencing auth.users (handles various naming conventions)
DO $$
DECLARE
  r RECORD;
BEGIN
  FOR r IN
    SELECT tc.constraint_name
    FROM information_schema.table_constraints tc
    JOIN information_schema.constraint_column_usage ccu
      ON tc.constraint_name = ccu.constraint_name
      AND tc.table_schema = ccu.table_schema
    WHERE tc.table_name = 'players'
      AND tc.constraint_type = 'FOREIGN KEY'
      AND ccu.table_schema = 'auth'
      AND ccu.table_name = 'users'
  LOOP
    EXECUTE 'ALTER TABLE players DROP CONSTRAINT IF EXISTS ' || r.constraint_name;
  END LOOP;
END $$;

-- Also drop the primary key constraint that references auth.users
-- We need to recreate it without the FK reference
ALTER TABLE players DROP CONSTRAINT IF EXISTS players_pkey CASCADE;
ALTER TABLE players ADD PRIMARY KEY (id);

-- =====================================================
-- STEP 2: ADD NEW COLUMNS
-- =====================================================

-- Add placeholder-related columns
ALTER TABLE players
  ADD COLUMN IF NOT EXISTS is_placeholder BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS linked_player_id UUID REFERENCES players(id) ON DELETE SET NULL;

-- =====================================================
-- STEP 3: ADD CHECK CONSTRAINTS (idempotent)
-- =====================================================

-- Drop existing constraints first to make migration re-runnable
ALTER TABLE players DROP CONSTRAINT IF EXISTS chk_real_player_no_creator;
ALTER TABLE players DROP CONSTRAINT IF EXISTS chk_placeholder_has_creator;
ALTER TABLE players DROP CONSTRAINT IF EXISTS chk_only_placeholders_linkable;
ALTER TABLE players DROP CONSTRAINT IF EXISTS chk_no_self_link;

-- Constraint: Real players must NOT have a creator
-- (is_placeholder = FALSE means created_by should be NULL)
ALTER TABLE players
  ADD CONSTRAINT chk_real_player_no_creator
  CHECK (
    NOT (is_placeholder = FALSE AND created_by IS NOT NULL)
  );

-- Constraint: Placeholder players MUST have a creator
-- (is_placeholder = TRUE means created_by must be set)
ALTER TABLE players
  ADD CONSTRAINT chk_placeholder_has_creator
  CHECK (
    NOT (is_placeholder = TRUE AND created_by IS NULL)
  );

-- Constraint: Only placeholders can be linked
-- (linked_player_id only allowed when is_placeholder = TRUE)
ALTER TABLE players
  ADD CONSTRAINT chk_only_placeholders_linkable
  CHECK (
    linked_player_id IS NULL OR is_placeholder = TRUE
  );

-- Constraint: Cannot link to self
ALTER TABLE players
  ADD CONSTRAINT chk_no_self_link
  CHECK (id != linked_player_id);

-- =====================================================
-- STEP 4: CREATE INDEXES
-- =====================================================

-- Index for finding placeholders by creator
CREATE INDEX IF NOT EXISTS idx_players_created_by
  ON players(created_by)
  WHERE created_by IS NOT NULL;

-- Index for finding unlinked placeholders (for linking UI)
CREATE INDEX IF NOT EXISTS idx_players_unlinked_placeholders
  ON players(id)
  WHERE is_placeholder = TRUE AND linked_player_id IS NULL;

-- Index for finding linked placeholders (for audit/cleanup)
CREATE INDEX IF NOT EXISTS idx_players_linked_player
  ON players(linked_player_id)
  WHERE linked_player_id IS NOT NULL;

-- Index for filtering real vs placeholder players
CREATE INDEX IF NOT EXISTS idx_players_is_placeholder
  ON players(is_placeholder);

-- =====================================================
-- STEP 5: UPDATE RLS POLICIES
-- =====================================================

-- Drop existing player policies that need updating (idempotent)
DROP POLICY IF EXISTS "Users can view own player profile" ON players;
DROP POLICY IF EXISTS "Users can update own player profile" ON players;
DROP POLICY IF EXISTS "Users can insert own player profile" ON players;
DROP POLICY IF EXISTS "Users can view players in their competitions" ON players;
DROP POLICY IF EXISTS "Users can view own placeholders" ON players;
DROP POLICY IF EXISTS "Users can view friends" ON players;
DROP POLICY IF EXISTS "Users can create placeholders" ON players;
DROP POLICY IF EXISTS "Users can update own placeholders" ON players;
DROP POLICY IF EXISTS "Users can delete own placeholders" ON players;

-- -----------------------------------------------------
-- SELECT Policies
-- -----------------------------------------------------

-- Users can view their own profile
CREATE POLICY "Users can view own player profile"
  ON players FOR SELECT
  USING (auth.uid() = id);

-- Users can view placeholders they created
CREATE POLICY "Users can view own placeholders"
  ON players FOR SELECT
  USING (
    is_placeholder = TRUE
    AND created_by = auth.uid()
  );

-- Users can view players in their competitions (including placeholders)
CREATE POLICY "Users can view players in their competitions"
  ON players FOR SELECT
  USING (
    id IN (
      SELECT player_id FROM competition_players
      WHERE competition_id IN (
        SELECT competition_id FROM competition_players
        WHERE player_id = auth.uid()
      )
    )
  );

-- Users can view their friends (real players only)
CREATE POLICY "Users can view friends"
  ON players FOR SELECT
  USING (
    id IN (
      SELECT CASE
        WHEN requester_id = auth.uid() THEN addressee_id
        ELSE requester_id
      END
      FROM friendships
      WHERE (requester_id = auth.uid() OR addressee_id = auth.uid())
        AND status = 'accepted'
    )
  );

-- -----------------------------------------------------
-- INSERT Policies
-- -----------------------------------------------------

-- Users can insert their own profile (on signup)
CREATE POLICY "Users can insert own player profile"
  ON players FOR INSERT
  WITH CHECK (
    auth.uid() = id
    AND is_placeholder = FALSE
  );

-- Users can create placeholder players
CREATE POLICY "Users can create placeholders"
  ON players FOR INSERT
  WITH CHECK (
    is_placeholder = TRUE
    AND created_by = auth.uid()
  );

-- -----------------------------------------------------
-- UPDATE Policies
-- -----------------------------------------------------

-- Users can update their own profile
CREATE POLICY "Users can update own player profile"
  ON players FOR UPDATE
  USING (auth.uid() = id);

-- Users can update unlinked placeholders they created
CREATE POLICY "Users can update own placeholders"
  ON players FOR UPDATE
  USING (
    is_placeholder = TRUE
    AND created_by = auth.uid()
    AND linked_player_id IS NULL
  );

-- -----------------------------------------------------
-- DELETE Policies
-- -----------------------------------------------------

-- Users can delete unlinked placeholders they created
CREATE POLICY "Users can delete own placeholders"
  ON players FOR DELETE
  USING (
    is_placeholder = TRUE
    AND created_by = auth.uid()
    AND linked_player_id IS NULL
  );

-- =====================================================
-- STEP 6: HELPER FUNCTIONS
-- =====================================================

-- -----------------------------------------------------
-- Create Placeholder Player
-- -----------------------------------------------------
-- Creates a placeholder player with a generated email
-- Returns the new player's ID
CREATE OR REPLACE FUNCTION create_placeholder_player(
  p_name TEXT,
  p_handicap INTEGER DEFAULT NULL
)
RETURNS UUID AS $$
DECLARE
  v_player_id UUID;
  v_email TEXT;
BEGIN
  -- Generate a unique placeholder email
  v_player_id := gen_random_uuid();
  v_email := v_player_id || '@placeholder.local';

  -- Insert the placeholder player
  INSERT INTO players (
    id,
    name,
    email,
    handicap,
    is_placeholder,
    created_by,
    created_at,
    updated_at
  ) VALUES (
    v_player_id,
    p_name,
    v_email,
    p_handicap,
    TRUE,
    auth.uid(),
    NOW(),
    NOW()
  );

  RETURN v_player_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- -----------------------------------------------------
-- Link Placeholder Player to Real Player
-- -----------------------------------------------------
-- Transfers ALL history from placeholder to real player:
-- - competition_players entries
-- - scorecards
-- - pairings (updates player_ids array)
-- - friendships (if any existed)
-- - round_players (if exists)
-- Then marks the placeholder as linked
CREATE OR REPLACE FUNCTION link_placeholder_player(
  p_placeholder_id UUID,
  p_real_player_id UUID
)
RETURNS BOOLEAN AS $$
DECLARE
  v_placeholder RECORD;
  v_pairing RECORD;
BEGIN
  -- Verify placeholder exists and is unlinked
  SELECT * INTO v_placeholder
  FROM players
  WHERE id = p_placeholder_id
    AND is_placeholder = TRUE
    AND linked_player_id IS NULL
    AND created_by = auth.uid();

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Placeholder not found, already linked, or not owned by current user';
  END IF;

  -- Verify real player exists and is not a placeholder
  IF NOT EXISTS (
    SELECT 1 FROM players
    WHERE id = p_real_player_id
      AND is_placeholder = FALSE
  ) THEN
    RAISE EXCEPTION 'Real player not found or is also a placeholder';
  END IF;

  -- Prevent linking to self
  IF p_placeholder_id = p_real_player_id THEN
    RAISE EXCEPTION 'Cannot link placeholder to itself';
  END IF;

  -- Transfer competition_players entries
  -- Use ON CONFLICT to handle cases where real player is already in competition
  INSERT INTO competition_players (competition_id, player_id, status, invited_at, responded_at, created_at)
  SELECT competition_id, p_real_player_id, status, invited_at, responded_at, created_at
  FROM competition_players
  WHERE player_id = p_placeholder_id
  ON CONFLICT (competition_id, player_id) DO NOTHING;

  -- Delete the placeholder's competition_players entries
  DELETE FROM competition_players WHERE player_id = p_placeholder_id;

  -- Transfer scorecards
  -- If real player already has a scorecard for this round, keep theirs
  UPDATE scorecards
  SET player_id = p_real_player_id
  WHERE player_id = p_placeholder_id
    AND NOT EXISTS (
      SELECT 1 FROM scorecards s2
      WHERE s2.round_id = scorecards.round_id
        AND s2.player_id = p_real_player_id
    );

  -- Delete any remaining placeholder scorecards (duplicates)
  DELETE FROM scorecards WHERE player_id = p_placeholder_id;

  -- Transfer pairings (update player_ids arrays)
  FOR v_pairing IN
    SELECT id, player_ids
    FROM pairings
    WHERE p_placeholder_id = ANY(player_ids)
  LOOP
    -- Replace placeholder ID with real player ID in the array
    -- Only if real player is not already in this pairing
    IF NOT p_real_player_id = ANY(v_pairing.player_ids) THEN
      UPDATE pairings
      SET player_ids = array_replace(player_ids, p_placeholder_id, p_real_player_id)
      WHERE id = v_pairing.id;
    ELSE
      -- Remove placeholder from pairing (real player already there)
      UPDATE pairings
      SET player_ids = array_remove(player_ids, p_placeholder_id)
      WHERE id = v_pairing.id;
    END IF;
  END LOOP;

  -- Transfer round_players entries (if table exists)
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'round_players') THEN
    -- Insert for real player, ignore if already exists
    EXECUTE format('
      INSERT INTO round_players (round_id, player_id, handicap_at_time, created_at)
      SELECT round_id, $1, handicap_at_time, created_at
      FROM round_players
      WHERE player_id = $2
      ON CONFLICT (round_id, player_id) DO NOTHING
    ') USING p_real_player_id, p_placeholder_id;

    -- Delete placeholder entries
    EXECUTE format('DELETE FROM round_players WHERE player_id = $1') USING p_placeholder_id;
  END IF;

  -- Transfer scoring_pairs entries (if table exists)
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'scoring_pairs') THEN
    -- Update scorer_id
    EXECUTE format('
      UPDATE scoring_pairs
      SET scorer_id = $1
      WHERE scorer_id = $2
        AND NOT EXISTS (
          SELECT 1 FROM scoring_pairs sp2
          WHERE sp2.round_id = scoring_pairs.round_id
            AND sp2.scorer_id = $1
        )
    ') USING p_real_player_id, p_placeholder_id;

    -- Update player_id
    EXECUTE format('
      UPDATE scoring_pairs
      SET player_id = $1
      WHERE player_id = $2
        AND NOT EXISTS (
          SELECT 1 FROM scoring_pairs sp2
          WHERE sp2.round_id = scoring_pairs.round_id
            AND sp2.player_id = $1
        )
    ') USING p_real_player_id, p_placeholder_id;

    -- Delete any remaining placeholder entries
    EXECUTE format('DELETE FROM scoring_pairs WHERE scorer_id = $1 OR player_id = $1') USING p_placeholder_id;
  END IF;

  -- Mark placeholder as linked (don't delete, keep for audit trail)
  UPDATE players
  SET linked_player_id = p_real_player_id,
      updated_at = NOW()
  WHERE id = p_placeholder_id;

  RETURN TRUE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- -----------------------------------------------------
-- Get My Placeholder Players
-- -----------------------------------------------------
-- Returns unlinked placeholders created by the current user
CREATE OR REPLACE FUNCTION get_my_placeholder_players()
RETURNS TABLE (
  id UUID,
  name TEXT,
  email TEXT,
  handicap NUMERIC,
  created_at TIMESTAMPTZ,
  competitions_count BIGINT,
  scorecards_count BIGINT
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    p.id,
    p.name,
    p.email,
    p.handicap,
    p.created_at,
    (SELECT COUNT(*) FROM competition_players cp WHERE cp.player_id = p.id) AS competitions_count,
    (SELECT COUNT(*) FROM scorecards s WHERE s.player_id = p.id) AS scorecards_count
  FROM players p
  WHERE p.is_placeholder = TRUE
    AND p.created_by = auth.uid()
    AND p.linked_player_id IS NULL
  ORDER BY p.name;
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER;

-- -----------------------------------------------------
-- Search for Linkable Players
-- -----------------------------------------------------
-- Search for real players that could be linked to a placeholder
-- Excludes players who already have an account
CREATE OR REPLACE FUNCTION search_linkable_players(
  p_search_term TEXT,
  p_limit INTEGER DEFAULT 10
)
RETURNS TABLE (
  id UUID,
  name TEXT,
  email TEXT,
  handicap NUMERIC,
  photo_url TEXT
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    p.id,
    p.name,
    p.email,
    p.handicap,
    p.photo_url
  FROM players p
  WHERE p.is_placeholder = FALSE
    AND (
      p.name ILIKE '%' || p_search_term || '%'
      OR p.email ILIKE '%' || p_search_term || '%'
    )
  ORDER BY
    -- Prioritize exact matches
    CASE WHEN p.name ILIKE p_search_term THEN 0 ELSE 1 END,
    CASE WHEN p.email ILIKE p_search_term THEN 0 ELSE 1 END,
    p.name
  LIMIT p_limit;
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER;

-- =====================================================
-- STEP 7: GRANT PERMISSIONS
-- =====================================================

-- Grant execute on functions to authenticated users
GRANT EXECUTE ON FUNCTION create_placeholder_player(TEXT, INTEGER) TO authenticated;
GRANT EXECUTE ON FUNCTION link_placeholder_player(UUID, UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION get_my_placeholder_players() TO authenticated;
GRANT EXECUTE ON FUNCTION search_linkable_players(TEXT, INTEGER) TO authenticated;

-- =====================================================
-- MIGRATION COMPLETE
-- =====================================================

COMMENT ON COLUMN players.is_placeholder IS 'TRUE for guest/placeholder players without auth accounts';
COMMENT ON COLUMN players.created_by IS 'User who created this placeholder player (NULL for real players)';
COMMENT ON COLUMN players.linked_player_id IS 'Reference to the real player this placeholder was merged into';

COMMENT ON FUNCTION create_placeholder_player IS 'Create a placeholder player with auto-generated email';
COMMENT ON FUNCTION link_placeholder_player IS 'Transfer all history from placeholder to real player and mark as linked';
COMMENT ON FUNCTION get_my_placeholder_players IS 'Get unlinked placeholders created by current user';
COMMENT ON FUNCTION search_linkable_players IS 'Search for real players that can be linked to placeholders';
