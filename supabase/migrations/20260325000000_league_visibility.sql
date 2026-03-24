-- Migration: League Visibility (Public/Private) & Browse
-- Description: Add is_public column to leagues, update RLS to restrict visibility,
-- and add RPCs for invite code lookup, user's leagues, and public league browsing.

-- =============================================================================
-- a) Add is_public column (defaults FALSE so existing leagues stay private)
-- =============================================================================
ALTER TABLE leagues ADD COLUMN is_public BOOLEAN NOT NULL DEFAULT FALSE;

CREATE INDEX idx_leagues_is_public ON leagues(is_public) WHERE status = 'active' AND is_public = TRUE;

-- =============================================================================
-- b) Replace leagues_select RLS policy
-- =============================================================================
DROP POLICY IF EXISTS leagues_select ON leagues;

CREATE POLICY leagues_select ON leagues FOR SELECT TO authenticated
  USING (
    auth.uid() = created_by
    OR is_league_member(id, auth.uid())
    OR (is_public = TRUE AND status = 'active')
  );

-- =============================================================================
-- c) SECURITY DEFINER function for invite code lookup
--    Bypasses RLS so non-members can find private leagues by invite code.
-- =============================================================================
CREATE OR REPLACE FUNCTION lookup_league_by_invite_code(p_invite_code TEXT)
RETURNS SETOF leagues AS $$
  SELECT * FROM leagues
  WHERE invite_code = UPPER(TRIM(p_invite_code)) AND status = 'active'
  LIMIT 1;
$$ LANGUAGE sql STABLE SECURITY DEFINER;

-- =============================================================================
-- d) RPC for user's own leagues (creator or accepted member)
-- =============================================================================
CREATE OR REPLACE FUNCTION get_my_leagues()
RETURNS SETOF leagues AS $$
  SELECT l.* FROM leagues l
  WHERE l.created_by = auth.uid()
    OR EXISTS (
      SELECT 1 FROM league_players lp
      WHERE lp.league_id = l.id AND lp.player_id = auth.uid() AND lp.status = 'accepted'
    )
  ORDER BY l.created_at DESC;
$$ LANGUAGE sql STABLE;

-- =============================================================================
-- e) RPC for public league browsing (includes player count)
-- =============================================================================
CREATE OR REPLACE FUNCTION get_public_leagues(
  p_search TEXT DEFAULT NULL,
  p_limit INTEGER DEFAULT 50
)
RETURNS TABLE (
  id UUID, name TEXT, description TEXT, created_by UUID,
  league_type TEXT, status TEXT, is_public BOOLEAN,
  created_at TIMESTAMPTZ, updated_at TIMESTAMPTZ,
  player_count BIGINT
) AS $$
  SELECT l.id, l.name, l.description, l.created_by,
    l.league_type, l.status, l.is_public, l.created_at, l.updated_at,
    COUNT(lp.player_id) FILTER (WHERE lp.status = 'accepted') AS player_count
  FROM leagues l
  LEFT JOIN league_players lp ON lp.league_id = l.id
  WHERE l.is_public = TRUE AND l.status = 'active'
    AND (p_search IS NULL OR l.name ILIKE '%' || p_search || '%')
  GROUP BY l.id
  ORDER BY player_count DESC, l.created_at DESC
  LIMIT p_limit;
$$ LANGUAGE sql STABLE;
