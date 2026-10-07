/**
 * Player column lists
 *
 * Other users' `players` rows may only be read through PUBLIC_PLAYER_COLUMNS.
 * Private fields (email, phone, golf_id, country, age_*, push_*) are readable
 * only for your own row, via the `get_my_player` RPC (see fetchMyPlayer in
 * hooks/auth/utils.ts).
 *
 * The server enforces the same split with column-level grants
 * (supabase/migrations_pending/player_column_privileges.sql). Never use
 * select('*') or players(*) on `players`: once those grants are live it fails
 * with a permission error.
 *
 * `gender` stays public because the daily handicap of playing partners
 * depends on it (consistency factor and women's tee ratings).
 */

/**
 * Comma-separated list for `.select()` and embedded `players(...)` selects.
 * Kept as a string literal so supabase-js can still infer row types; build
 * embeds with a const template, e.g. `players!player_id(${PUBLIC_PLAYER_COLUMNS})` as const.
 */
export const PUBLIC_PLAYER_COLUMNS =
  'id, name, photo_url, handicap, handicap_updated_at, handicap_index, handicap_index_updated_at, home_club_id, gender, equipped_badge_id, equipped_frame_id, equipped_title_id, is_placeholder, created_by, linked_player_id, created_at, updated_at' as const;

export const PUBLIC_PLAYER_COLUMN_LIST = PUBLIC_PLAYER_COLUMNS.split(', ');
