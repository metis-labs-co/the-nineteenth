-- =====================================================
-- Activity Feed — Likes, Comments, Photos
-- The Nineteenth - Golf Competition App
-- =====================================================
-- Adds the social layer on top of completed rounds:
--   - round_likes     : one like per (round, player)
--   - round_comments  : flat comments on a round (soft delete)
--   - round_photos    : shared per-round photo album (soft delete)
--   - can_view_round() / is_round_participant_any() visibility helpers
--
-- Visibility model mirrors the Activity feed inclusion rule: a user
-- can see a round's social content if they own it, participate in it
-- (round_players or a scorecard), are a member/organizer of its
-- competition, OR an accepted friend of theirs has a scorecard in it.
--
-- can_view_round() is SECURITY DEFINER (bypasses RLS) and is referenced
-- ONLY by the new tables' policies — never by the rounds/scorecards
-- policies — so it cannot reintroduce the rounds <-> scorecards RLS
-- cycle that 20260412010000 fixed.
-- =====================================================

-- =====================================================
-- 1. VISIBILITY HELPERS (SECURITY DEFINER)
-- =====================================================

-- Can the current user see this round (and therefore its social content)?
CREATE OR REPLACE FUNCTION can_view_round(p_round_id UUID)
RETURNS BOOLEAN
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public, pg_temp AS $$
  SELECT EXISTS (
    SELECT 1 FROM rounds r
    WHERE r.id = p_round_id
      AND r.deleted_at IS NULL
      AND (
        -- Owner of a standalone round
        r.user_id = auth.uid()
        -- Participant via round_players (standalone)
        OR is_round_participant(r.id, auth.uid())
        -- Competition member
        OR (r.competition_id IS NOT NULL AND EXISTS (
              SELECT 1 FROM competition_players cp
              WHERE cp.competition_id = r.competition_id
                AND cp.player_id = auth.uid()
                AND cp.status = 'accepted'))
        -- Competition organizer
        OR (r.competition_id IS NOT NULL AND EXISTS (
              SELECT 1 FROM competitions c
              WHERE c.id = r.competition_id
                AND c.organizer_id = auth.uid()))
        -- Friend among round_players (standalone)
        OR round_has_friend_player(r.id)
        -- Self or accepted friend has a scorecard (covers competition/league rounds)
        OR EXISTS (
              SELECT 1 FROM scorecards sc
              WHERE sc.round_id = r.id
                AND sc.deleted_at IS NULL
                AND (sc.player_id = auth.uid() OR is_friend(sc.player_id)))
      )
  );
$$;

COMMENT ON FUNCTION can_view_round(UUID) IS
  'True if the current user may see a round''s social content (likes/comments/photos). SECURITY DEFINER; referenced only by activity-feed table policies to avoid the rounds<->scorecards RLS cycle.';

-- Is a player a participant of a round (any round type)?
CREATE OR REPLACE FUNCTION is_round_participant_any(p_round_id UUID, p_player_id UUID)
RETURNS BOOLEAN
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public, pg_temp AS $$
  SELECT EXISTS (SELECT 1 FROM round_players rp
                 WHERE rp.round_id = p_round_id AND rp.player_id = p_player_id)
      OR EXISTS (SELECT 1 FROM scorecards sc
                 WHERE sc.round_id = p_round_id AND sc.player_id = p_player_id
                   AND sc.deleted_at IS NULL)
      OR EXISTS (SELECT 1 FROM rounds r
                 WHERE r.id = p_round_id AND r.user_id = p_player_id);
$$;

COMMENT ON FUNCTION is_round_participant_any(UUID, UUID) IS
  'True if a player participates in a round via round_players, a scorecard, or ownership. Covers standalone and competition rounds. SECURITY DEFINER.';

-- =====================================================
-- 2. round_likes
-- =====================================================

CREATE TABLE round_likes (
  round_id   UUID NOT NULL REFERENCES rounds(id) ON DELETE CASCADE,
  player_id  UUID NOT NULL REFERENCES players(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (round_id, player_id)
);

CREATE INDEX idx_round_likes_round ON round_likes(round_id);

ALTER TABLE round_likes ENABLE ROW LEVEL SECURITY;

CREATE POLICY round_likes_select ON round_likes FOR SELECT
  USING (can_view_round(round_id));

CREATE POLICY round_likes_insert ON round_likes FOR INSERT
  WITH CHECK (player_id = auth.uid() AND can_view_round(round_id));

CREATE POLICY round_likes_delete ON round_likes FOR DELETE
  USING (player_id = auth.uid());

-- =====================================================
-- 3. round_comments
-- =====================================================

CREATE TABLE round_comments (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  round_id   UUID NOT NULL REFERENCES rounds(id) ON DELETE CASCADE,
  author_id  UUID NOT NULL REFERENCES players(id) ON DELETE CASCADE,
  body       TEXT NOT NULL CHECK (char_length(body) BETWEEN 1 AND 2000),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_at TIMESTAMPTZ
);

CREATE INDEX idx_round_comments_round
  ON round_comments(round_id, created_at)
  WHERE deleted_at IS NULL;

CREATE TRIGGER trigger_round_comments_updated_at
  BEFORE UPDATE ON round_comments
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

ALTER TABLE round_comments ENABLE ROW LEVEL SECURITY;

CREATE POLICY round_comments_select ON round_comments FOR SELECT
  USING (deleted_at IS NULL AND can_view_round(round_id));

CREATE POLICY round_comments_insert ON round_comments FOR INSERT
  WITH CHECK (author_id = auth.uid() AND can_view_round(round_id));

-- Author can edit / soft-delete their own comment
CREATE POLICY round_comments_update ON round_comments FOR UPDATE
  USING (author_id = auth.uid())
  WITH CHECK (author_id = auth.uid());

-- =====================================================
-- 4. round_photos
-- =====================================================

CREATE TABLE round_photos (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  round_id     UUID NOT NULL REFERENCES rounds(id) ON DELETE CASCADE,
  uploader_id  UUID NOT NULL REFERENCES players(id) ON DELETE CASCADE,
  storage_path TEXT NOT NULL,
  width        INTEGER,
  height       INTEGER,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_at   TIMESTAMPTZ,
  CONSTRAINT round_photos_storage_path_unique UNIQUE (storage_path)
);

CREATE INDEX idx_round_photos_round
  ON round_photos(round_id, created_at)
  WHERE deleted_at IS NULL;

ALTER TABLE round_photos ENABLE ROW LEVEL SECURITY;

CREATE POLICY round_photos_select ON round_photos FOR SELECT
  USING (deleted_at IS NULL AND can_view_round(round_id));

-- Only round participants can add photos to the shared album
CREATE POLICY round_photos_insert ON round_photos FOR INSERT
  WITH CHECK (uploader_id = auth.uid()
              AND is_round_participant_any(round_id, auth.uid()));

-- Uploader can edit / soft-delete their own photo
CREATE POLICY round_photos_update ON round_photos FOR UPDATE
  USING (uploader_id = auth.uid())
  WITH CHECK (uploader_id = auth.uid());

-- =====================================================
-- 5. GRANTS
-- =====================================================
-- Project rule: explicitly grant on new tables (auto-grants being retired).

GRANT SELECT, INSERT, DELETE ON round_likes TO authenticated;
GRANT SELECT, INSERT, UPDATE ON round_comments TO authenticated;
GRANT SELECT, INSERT, UPDATE ON round_photos TO authenticated;
GRANT ALL ON round_likes TO service_role;
GRANT ALL ON round_comments TO service_role;
GRANT ALL ON round_photos TO service_role;

-- =====================================================
-- COMMENTS
-- =====================================================

COMMENT ON TABLE round_likes IS 'One like per (round, player) for the activity feed.';
COMMENT ON TABLE round_comments IS 'Flat comments on a round for the activity feed. Soft-deleted via deleted_at.';
COMMENT ON TABLE round_photos IS 'Shared per-round photo album. Any participant may upload. storage_path is the object key in the private round-photos bucket. Soft-deleted via deleted_at.';
