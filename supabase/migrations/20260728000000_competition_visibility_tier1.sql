-- Phase 1B.2: enforce private competition rows and preserve invite-code join.

DROP POLICY IF EXISTS "Authenticated users can view competitions by invite code" ON competitions;

CREATE OR REPLACE FUNCTION lookup_competition_by_invite_code(p_code TEXT)
RETURNS TABLE (
  id UUID,
  name TEXT,
  description TEXT,
  start_date DATE,
  end_date DATE,
  handicap_system TEXT,
  status TEXT,
  organizer_id UUID,
  max_players INTEGER,
  lock_at_capacity BOOLEAN,
  player_count BIGINT
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
  SELECT
    c.id,
    c.name,
    c.description,
    c.start_date,
    c.end_date,
    c.handicap_system,
    c.status,
    c.organizer_id,
    c.max_players,
    c.lock_at_capacity,
    COUNT(cp.player_id) FILTER (WHERE cp.status = 'accepted') AS player_count
  FROM competitions c
  LEFT JOIN competition_players cp ON cp.competition_id = c.id
  WHERE auth.uid() IS NOT NULL
    AND UPPER(c.invite_code) = UPPER(TRIM(p_code))
    AND c.deleted_at IS NULL
  GROUP BY c.id
  LIMIT 1;
$$;

REVOKE ALL ON FUNCTION lookup_competition_by_invite_code(TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION lookup_competition_by_invite_code(TEXT) TO authenticated;

COMMENT ON FUNCTION lookup_competition_by_invite_code(TEXT) IS
  'Returns the minimal private competition preview required to join by invite code.';
