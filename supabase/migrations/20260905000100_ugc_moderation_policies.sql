-- supabase/migrations/20260905000100_ugc_moderation_policies.sql
-- Applies report/block visibility to the social tables.
--
-- ⚠️ Each policy below reproduces Part A's social_enabled() predicate. Removing
-- it would silently drop the under-13 gate. The composed rule is:
--   social_enabled() AND NOT blocked AND NOT reported-by-viewer
--
-- Safe to re-run.

DROP POLICY IF EXISTS round_comments_select ON round_comments;
CREATE POLICY round_comments_select ON round_comments FOR SELECT
  TO authenticated
  USING (
    deleted_at IS NULL
    AND social_enabled()
    AND can_view_round(round_id)
    AND NOT is_blocked_pair(auth.uid(), author_id)
    AND NOT is_reported_by_viewer('round_comment', round_comments.id)
  );

DROP POLICY IF EXISTS round_photos_select ON round_photos;
CREATE POLICY round_photos_select ON round_photos FOR SELECT
  TO authenticated
  USING (
    deleted_at IS NULL
    AND social_enabled()
    AND can_view_round(round_id)
    AND NOT is_blocked_pair(auth.uid(), uploader_id)
    AND NOT is_reported_by_viewer('round_photo', round_photos.id)
  );

DROP POLICY IF EXISTS round_likes_select ON round_likes;
CREATE POLICY round_likes_select ON round_likes FOR SELECT
  TO authenticated
  USING (
    social_enabled()
    AND can_view_round(round_id)
    AND NOT is_blocked_pair(auth.uid(), player_id)
  );

DROP POLICY IF EXISTS round_comment_likes_select ON round_comment_likes;
CREATE POLICY round_comment_likes_select ON round_comment_likes FOR SELECT
  TO authenticated
  USING (
    social_enabled()
    AND NOT is_blocked_pair(auth.uid(), player_id)
  );

-- Neither party can send the other a friend request.
DROP POLICY IF EXISTS "Users can send friend requests" ON friendships;
CREATE POLICY "Users can send friend requests" ON friendships FOR INSERT
  TO authenticated
  WITH CHECK (
    auth.uid() = requester_id
    AND social_enabled(requester_id)
    AND social_enabled(addressee_id)
    AND NOT is_blocked_pair(requester_id, addressee_id)
  );

-- Blocked users disappear from search. Reproduces Part A's definition with one
-- added predicate; the explicit column list stays (SECURITY DEFINER bypasses
-- RLS, so SELECT p.* would leak email and phone).
CREATE OR REPLACE FUNCTION search_players(p_query TEXT)
RETURNS TABLE (
  id        UUID,
  name      TEXT,
  photo_url TEXT,
  handicap  NUMERIC
)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public, pg_temp
AS $$
  SELECT p.id, p.name::TEXT, p.photo_url::TEXT, p.handicap
  FROM players p
  WHERE social_enabled()
    AND social_enabled(p.id)
    AND p.id <> auth.uid()
    AND p.is_placeholder IS NOT TRUE
    AND NOT is_blocked_pair(auth.uid(), p.id)
    AND p.name ILIKE '%' || p_query || '%'
  ORDER BY p.name
  LIMIT 25;
$$;
