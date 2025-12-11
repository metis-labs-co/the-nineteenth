-- =====================================================
-- Allow Player Search for Friends Feature
-- =====================================================
-- This migration adds RLS policies to allow authenticated users
-- to search for other players when adding friends.
--
-- The current policies only allow viewing players in the same
-- competition, which prevents the friend search from working.
-- =====================================================

-- -----------------------------------------------------
-- Option 1: Simple Policy - Allow all authenticated users to view basic player info
-- -----------------------------------------------------
-- This is the simplest solution but exposes all player data to all users

-- Drop existing restrictive policies first (we'll keep the own profile ones)
-- Note: We keep "Users can view own player profile" from the original migration

-- Add a policy that allows authenticated users to search for any player
-- This enables the friend search functionality
CREATE POLICY "Authenticated users can search players"
  ON players FOR SELECT
  TO authenticated
  USING (true);

-- Note: This may conflict with existing policies. Supabase uses OR logic
-- between policies, so this will allow access even if other policies would deny it.

-- =====================================================
-- ALTERNATIVE: If you want to limit searchable fields, use a SECURITY DEFINER function
-- =====================================================
-- Uncomment below if you prefer a more restrictive approach that only
-- exposes limited fields during search

/*
-- Create a function to search players with limited fields
CREATE OR REPLACE FUNCTION search_players_for_friends(
  search_query TEXT,
  current_user_id UUID
)
RETURNS TABLE (
  id UUID,
  name TEXT,
  email TEXT,
  handicap NUMERIC,
  photo_url TEXT,
  is_friend BOOLEAN,
  has_pending_request BOOLEAN,
  request_direction TEXT
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    p.id,
    p.name,
    p.email,
    p.handicap,
    p.photo_url,
    COALESCE(f_accepted.id IS NOT NULL, false) AS is_friend,
    COALESCE(f_pending.id IS NOT NULL, false) AS has_pending_request,
    CASE
      WHEN f_pending.requester_id = current_user_id THEN 'sent'
      WHEN f_pending.addressee_id = current_user_id THEN 'received'
      ELSE NULL
    END AS request_direction
  FROM players p
  LEFT JOIN friendships f_accepted ON (
    (f_accepted.requester_id = current_user_id AND f_accepted.addressee_id = p.id)
    OR (f_accepted.addressee_id = current_user_id AND f_accepted.requester_id = p.id)
  ) AND f_accepted.status = 'accepted'
  LEFT JOIN friendships f_pending ON (
    (f_pending.requester_id = current_user_id AND f_pending.addressee_id = p.id)
    OR (f_pending.addressee_id = current_user_id AND f_pending.requester_id = p.id)
  ) AND f_pending.status = 'pending'
  WHERE p.id != current_user_id
    AND p.name ILIKE '%' || search_query || '%'
  LIMIT 20;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION search_players_for_friends TO authenticated;
*/

-- =====================================================
-- MIGRATION COMPLETE
-- =====================================================
COMMENT ON POLICY "Authenticated users can search players" ON players
  IS 'Allows any authenticated user to view player profiles for friend search functionality';
