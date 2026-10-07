-- =====================================================
-- Player privacy: RPCs (safe to deploy before the app update)
-- =====================================================
-- 1. Global achievement leaderboard: players who are not the viewer or an
--    accepted friend get a stable pseudonym, no photo, no cosmetics and an
--    opaque player_id, so real identities never leave the server.
-- 2. get_my_player(): the caller's own full players row (incl. private
--    columns), for when column-level grants hide them from direct selects
--    (supabase/migrations_pending/player_column_privileges.sql).
-- 3. Close RPCs that leaked other players' emails or push tokens.
--
-- Everything here is backward compatible with installed app builds.

-- -----------------------------------------------------
-- Pseudonym salt (never readable by clients)
-- -----------------------------------------------------
-- Without a secret salt anyone holding player ids could recompute the
-- pseudonyms and unmask the board.
CREATE TABLE IF NOT EXISTS app_private_settings (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE app_private_settings ENABLE ROW LEVEL SECURITY;
-- No policies: only SECURITY DEFINER functions and service_role read it.
REVOKE ALL ON app_private_settings FROM PUBLIC, anon, authenticated;

INSERT INTO app_private_settings (key, value)
VALUES ('leaderboard_pseudonym_salt', gen_random_uuid()::text || gen_random_uuid()::text)
ON CONFLICT (key) DO NOTHING;

COMMENT ON TABLE app_private_settings IS
  'Server-only secrets (e.g. leaderboard pseudonym salt). RLS on, no policies, no client grants.';

-- -----------------------------------------------------
-- leaderboard_pseudonym(player_id)
-- -----------------------------------------------------
-- Stable golf-themed name, e.g. "Swift Albatross 42". Same player, same name.
CREATE OR REPLACE FUNCTION leaderboard_pseudonym(p_player_id UUID)
RETURNS TEXT
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
  WITH h AS (
    SELECT md5(
      p_player_id::text ||
      COALESCE((SELECT value FROM app_private_settings WHERE key = 'leaderboard_pseudonym_salt'), '')
    ) AS digest
  ),
  words AS (
    SELECT
      ARRAY[
        'Swift', 'Lucky', 'Steady', 'Bold', 'Calm', 'Crafty', 'Daring', 'Eager',
        'Fearless', 'Gentle', 'Happy', 'Jolly', 'Keen', 'Lively', 'Mighty', 'Nimble',
        'Plucky', 'Quiet', 'Rapid', 'Sunny', 'Brave', 'Clever', 'Breezy', 'Dapper',
        'Golden', 'Hearty', 'Jaunty', 'Mellow', 'Nifty', 'Rugged', 'Sly', 'Zesty'
      ] AS adjectives,
      ARRAY[
        'Albatross', 'Birdie', 'Eagle', 'Condor', 'Bogey', 'Fairway', 'Bunker', 'Divot',
        'Mulligan', 'Wedge', 'Driver', 'Putter', 'Niblick', 'Mashie', 'Caddie', 'Tee',
        'Links', 'Dogleg', 'Flagstick', 'Approach', 'Chip', 'Lob', 'Fade', 'Draw',
        'Hybrid', 'Spoon', 'Brassie', 'Ace', 'Stymie', 'Gimme', 'Green', 'Rough'
      ] AS nouns
  )
  SELECT
    words.adjectives[1 + ('x' || substr(h.digest, 1, 4))::bit(16)::int % array_length(words.adjectives, 1)]
    || ' ' ||
    words.nouns[1 + ('x' || substr(h.digest, 5, 4))::bit(16)::int % array_length(words.nouns, 1)]
    || ' ' ||
    (1 + ('x' || substr(h.digest, 9, 4))::bit(16)::int % 99)::text
  FROM h, words;
$$;

REVOKE ALL ON FUNCTION leaderboard_pseudonym(UUID) FROM PUBLIC, anon, authenticated;

COMMENT ON FUNCTION leaderboard_pseudonym(UUID) IS
  'Stable salted pseudonym for anonymised leaderboard rows. Internal only.';

-- -----------------------------------------------------
-- get_achievement_leaderboard
-- -----------------------------------------------------
-- Changes from 20260904000100:
--   * Scope is resolved from auth.uid(); p_user_id is kept only so installed
--     app builds can keep calling the same signature, and is ignored.
--   * Rows for anyone other than the viewer or an accepted friend are
--     anonymised (pseudonym, no photo/cosmetics, opaque player_id).
--   * Competition scope requires the viewer to be a member or the organiser.
--   * New is_anonymous column.
--   * Blocked pairs are excluded; under-13 / restricted players are not
--     listed on the global board.
--   * Pinned search_path.
DROP FUNCTION IF EXISTS get_achievement_leaderboard(TEXT, UUID, UUID, INTEGER);

CREATE FUNCTION get_achievement_leaderboard(
  p_scope TEXT,
  p_user_id UUID DEFAULT NULL,
  p_competition_id UUID DEFAULT NULL,
  p_limit INTEGER DEFAULT 50
)
RETURNS TABLE (
  rank BIGINT,
  player_id UUID,
  name TEXT,
  photo_url TEXT,
  equipped_badge_id UUID,
  equipped_frame_id UUID,
  equipped_title_id UUID,
  total_points INTEGER,
  achievements_earned INTEGER,
  last_achievement_at TIMESTAMPTZ,
  is_anonymous BOOLEAN
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_viewer UUID := auth.uid();
BEGIN
  IF v_viewer IS NULL THEN
    RETURN;
  END IF;

  RETURN QUERY
  WITH viewer_friends AS (
    SELECT CASE WHEN f.requester_id = v_viewer THEN f.addressee_id ELSE f.requester_id END AS friend_id
    FROM friendships f
    WHERE (f.requester_id = v_viewer OR f.addressee_id = v_viewer)
      AND f.status = 'accepted'
  ),
  leaderboard_base AS (
    SELECT
      p.id AS base_player_id,
      p.name AS base_name,
      p.photo_url AS base_photo_url,
      p.equipped_badge_id AS base_badge_id,
      p.equipped_frame_id AS base_frame_id,
      p.equipped_title_id AS base_title_id,
      COALESCE(SUM(ad.points), 0)::INTEGER AS base_total_points,
      COUNT(pa.id)::INTEGER AS base_achievements_earned,
      MAX(pa.earned_at) AS base_last_achievement_at
    FROM players p
    LEFT JOIN player_achievements pa ON p.id = pa.player_id
    LEFT JOIN achievement_definitions ad ON pa.achievement_id = ad.id
    WHERE p.is_placeholder = FALSE
    GROUP BY p.id, p.name, p.photo_url, p.equipped_badge_id, p.equipped_frame_id, p.equipped_title_id
  ),
  filtered AS (
    SELECT
      lb.*,
      (lb.base_player_id = v_viewer
        OR lb.base_player_id IN (SELECT vf.friend_id FROM viewer_friends vf)) AS known
    FROM leaderboard_base lb
    WHERE
      CASE p_scope
        -- Restricted users get an empty global board, and restricted players
        -- are never listed on it.
        WHEN 'global' THEN social_enabled()
          AND (lb.base_player_id = v_viewer OR social_enabled(lb.base_player_id))
          AND NOT is_blocked_pair(v_viewer, lb.base_player_id)
        WHEN 'friends' THEN
          lb.base_player_id = v_viewer
          OR lb.base_player_id IN (SELECT vf.friend_id FROM viewer_friends vf)
        -- Only members or the organiser of that competition can see its board.
        WHEN 'competition' THEN
          lb.base_player_id IN (
            SELECT cp.player_id
            FROM competition_players cp
            WHERE cp.competition_id = p_competition_id
              AND cp.status = 'accepted'
          )
          AND (
            EXISTS (
              SELECT 1 FROM competition_players me
              WHERE me.competition_id = p_competition_id
                AND me.player_id = v_viewer
                AND me.status = 'accepted'
            )
            OR EXISTS (
              SELECT 1 FROM competitions c
              WHERE c.id = p_competition_id AND c.organizer_id = v_viewer
            )
          )
        ELSE FALSE
      END
  )
  SELECT
    ROW_NUMBER() OVER (ORDER BY f.base_total_points DESC, f.base_achievements_earned DESC) AS rank,
    -- Anonymous rows get an opaque stable id (no players row has it) rather
    -- than NULL, so installed builds that key rows by player_id keep working.
    CASE WHEN f.known OR p_scope = 'competition' THEN f.base_player_id
         ELSE md5('anon:' || f.base_player_id::text || COALESCE(
           (SELECT s.value FROM app_private_settings s WHERE s.key = 'leaderboard_pseudonym_salt'), ''))::uuid
    END,
    CASE WHEN f.known OR p_scope = 'competition' THEN f.base_name
         ELSE leaderboard_pseudonym(f.base_player_id) END,
    CASE WHEN f.known OR p_scope = 'competition' THEN f.base_photo_url END,
    CASE WHEN f.known OR p_scope = 'competition' THEN f.base_badge_id END,
    CASE WHEN f.known OR p_scope = 'competition' THEN f.base_frame_id END,
    CASE WHEN f.known OR p_scope = 'competition' THEN f.base_title_id END,
    f.base_total_points,
    f.base_achievements_earned,
    f.base_last_achievement_at,
    NOT (f.known OR p_scope = 'competition')
  FROM filtered f
  ORDER BY 1
  LIMIT p_limit;
END;
$$;

REVOKE ALL ON FUNCTION get_achievement_leaderboard(TEXT, UUID, UUID, INTEGER) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION get_achievement_leaderboard(TEXT, UUID, UUID, INTEGER) TO authenticated;

COMMENT ON FUNCTION get_achievement_leaderboard(TEXT, UUID, UUID, INTEGER) IS
  'Achievement leaderboard (global/friends/competition) for auth.uid(). Global rows for non-friends are anonymised; p_user_id is ignored (kept for old clients).';

-- -----------------------------------------------------
-- get_my_player(): caller's own full row
-- -----------------------------------------------------
CREATE OR REPLACE FUNCTION get_my_player()
RETURNS SETOF players
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
  SELECT * FROM players WHERE id = auth.uid();
$$;

REVOKE ALL ON FUNCTION get_my_player() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION get_my_player() TO authenticated;

COMMENT ON FUNCTION get_my_player() IS
  'The signed-in player''s own row including private columns (email, phone, age, push prefs).';

-- -----------------------------------------------------
-- Close leaking RPCs
-- -----------------------------------------------------
-- get_friends / get_pending_friend_requests took any user id and returned
-- friends' emails. Nothing calls them (the app reads friendships directly).
DROP FUNCTION IF EXISTS get_friends(UUID);
DROP FUNCTION IF EXISTS get_pending_friend_requests(UUID);

-- search_linkable_players searched and returned emails. No client calls it;
-- keep it (name search only, no email) for compatibility.
DROP FUNCTION IF EXISTS search_linkable_players(TEXT, INTEGER);

CREATE FUNCTION search_linkable_players(
  p_search_term TEXT,
  p_limit INTEGER DEFAULT 10
)
RETURNS TABLE (
  id UUID,
  name TEXT,
  handicap NUMERIC,
  photo_url TEXT
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  RETURN QUERY
  SELECT p.id, p.name, p.handicap, p.photo_url
  FROM players p
  WHERE p.is_placeholder = FALSE
    AND p.name ILIKE '%' || p_search_term || '%'
  ORDER BY
    CASE WHEN p.name ILIKE p_search_term THEN 0 ELSE 1 END,
    p.name
  LIMIT p_limit;
END;
$$;

REVOKE ALL ON FUNCTION search_linkable_players(TEXT, INTEGER) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION search_linkable_players(TEXT, INTEGER) TO authenticated;

-- get_tokens_for_email: email-existence oracle that also returned push
-- tokens, executable by anyone. Server-side use only.
REVOKE ALL ON FUNCTION get_tokens_for_email(TEXT) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION get_tokens_for_email(TEXT) TO service_role;
