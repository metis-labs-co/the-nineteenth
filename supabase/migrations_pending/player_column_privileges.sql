-- =====================================================
-- Player privacy: column-level read lock on players
-- =====================================================
-- HELD BACK. Do not move into supabase/migrations until the app release that
-- stops using select('*') on players (feat/player-privacy) is the force-update
-- minimum. Installed builds before that release read players with select('*')
-- and will fail with "permission denied" once this is applied.
-- Release steps: supabase/migrations_pending/README.md.
--
-- Other users' rows stay visible (RLS "Authenticated users can search players"
-- is unchanged) but only these columns can be read directly. Private columns
-- (email, phone, golf_id, country, age_status, age_source, age_resolved_at,
-- push_*) are only reachable through SECURITY DEFINER functions such as
-- get_my_player() (20261008000000_player_privacy_rpcs.sql).
--
-- gender stays readable: playing partners' daily handicaps depend on it.
-- Keep the list in sync with PUBLIC_PLAYER_COLUMNS in
-- src/services/api/playerColumns.ts.

REVOKE SELECT ON players FROM anon, authenticated;

GRANT SELECT (
  id,
  name,
  photo_url,
  handicap,
  handicap_updated_at,
  handicap_index,
  handicap_index_updated_at,
  home_club_id,
  gender,
  equipped_badge_id,
  equipped_frame_id,
  equipped_title_id,
  is_placeholder,
  created_by,
  linked_player_id,
  created_at,
  updated_at
) ON players TO authenticated;

COMMENT ON TABLE players IS
  'Player profiles. Clients can read only public columns (column grants); own private columns via get_my_player().';
