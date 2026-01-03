-- =============================================================================
-- Migration: Fix create_placeholder_player handicap parameter type
-- =============================================================================
--
-- Problem: The create_placeholder_player function accepts p_handicap as INTEGER,
-- but the players.handicap column is NUMERIC and the frontend sends decimal values.
-- This causes "invalid input syntax" errors when creating guest players with
-- decimal handicaps (e.g., 18.4).
--
-- Solution: Change the parameter type from INTEGER to NUMERIC to match the
-- database column type and support decimal handicaps.
-- =============================================================================

-- Drop the old function (need to specify old signature)
DROP FUNCTION IF EXISTS create_placeholder_player(TEXT, INTEGER);

-- Recreate with NUMERIC parameter type
CREATE OR REPLACE FUNCTION create_placeholder_player(
  p_name TEXT,
  p_handicap NUMERIC DEFAULT NULL
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

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION create_placeholder_player(TEXT, NUMERIC) TO authenticated;

-- Add comment
COMMENT ON FUNCTION create_placeholder_player IS 'Create a placeholder player with auto-generated email. Supports decimal handicaps.';
