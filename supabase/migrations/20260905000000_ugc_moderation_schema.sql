-- supabase/migrations/20260905000000_ugc_moderation_schema.sql
-- UGC moderation: reports and blocks (App Review Guideline 1.2).
-- Safe to re-run.

CREATE TABLE IF NOT EXISTS content_reports (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  reporter_id  UUID NOT NULL REFERENCES players(id) ON DELETE CASCADE,
  content_type TEXT NOT NULL CHECK (content_type IN ('round_comment', 'round_photo', 'player')),
  content_id   UUID NOT NULL,
  -- Denormalised so a takedown decision survives the author deleting their account.
  author_id    UUID REFERENCES players(id) ON DELETE SET NULL,
  reason       TEXT NOT NULL CHECK (reason IN ('offensive', 'harassment', 'spam', 'nudity', 'other')),
  note         TEXT CHECK (note IS NULL OR char_length(note) <= 500),
  status       TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'actioned', 'dismissed')),
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  resolved_at  TIMESTAMPTZ,
  -- Makes reporting idempotent: a user cannot inflate a count by tapping twice.
  CONSTRAINT content_reports_once_per_reporter UNIQUE (reporter_id, content_type, content_id)
);

CREATE INDEX IF NOT EXISTS idx_content_reports_open
  ON content_reports (created_at DESC) WHERE status = 'open';
CREATE INDEX IF NOT EXISTS idx_content_reports_by_reporter
  ON content_reports (reporter_id, content_type, content_id);

CREATE TABLE IF NOT EXISTS user_blocks (
  blocker_id UUID NOT NULL REFERENCES players(id) ON DELETE CASCADE,
  blocked_id UUID NOT NULL REFERENCES players(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (blocker_id, blocked_id),
  CONSTRAINT user_blocks_no_self CHECK (blocker_id <> blocked_id)
);

CREATE INDEX IF NOT EXISTS idx_user_blocks_blocked ON user_blocks (blocked_id);

ALTER TABLE content_reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_blocks     ENABLE ROW LEVEL SECURITY;

-- Reporters see and create only their own reports. Nobody reads anyone else's:
-- the operator works through the dashboard with the service role.
DROP POLICY IF EXISTS content_reports_select_own ON content_reports;
CREATE POLICY content_reports_select_own ON content_reports FOR SELECT
  TO authenticated USING (reporter_id = auth.uid());

DROP POLICY IF EXISTS content_reports_insert_own ON content_reports;
CREATE POLICY content_reports_insert_own ON content_reports FOR INSERT
  TO authenticated WITH CHECK (reporter_id = auth.uid());

DROP POLICY IF EXISTS user_blocks_select_own ON user_blocks;
CREATE POLICY user_blocks_select_own ON user_blocks FOR SELECT
  TO authenticated USING (blocker_id = auth.uid());

DROP POLICY IF EXISTS user_blocks_delete_own ON user_blocks;
CREATE POLICY user_blocks_delete_own ON user_blocks FOR DELETE
  TO authenticated USING (blocker_id = auth.uid());

-- Blocking is symmetric in effect: neither party sees the other.
CREATE OR REPLACE FUNCTION is_blocked_pair(a UUID, b UUID)
RETURNS BOOLEAN
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public, pg_temp
AS $$
  SELECT EXISTS (
    SELECT 1 FROM user_blocks
    WHERE (blocker_id = a AND blocked_id = b)
       OR (blocker_id = b AND blocked_id = a)
  );
$$;

-- Reporting hides content from the reporter. This is a SECURITY DEFINER helper
-- rather than an inline NOT EXISTS in each policy, matching can_view_round(),
-- social_enabled() and is_blocked_pair(). That is not stylistic: nesting RLS
-- evaluation of one table inside another table's policy is how this repo got
-- its rounds <-> scorecards recursion bug (see 20250111000000_fix_rls_recursion
-- and the warning in 20260521000000).
CREATE OR REPLACE FUNCTION is_reported_by_viewer(p_type TEXT, p_id UUID)
RETURNS BOOLEAN
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public, pg_temp
AS $$
  SELECT EXISTS (
    SELECT 1 FROM content_reports
    WHERE reporter_id = auth.uid()
      AND content_type = p_type
      AND content_id = p_id
  );
$$;

COMMENT ON FUNCTION is_blocked_pair IS
  'True when either user has blocked the other. Applied per policy.
   NEVER call this from can_view_round() - that helper is shared with round
   visibility logic and gating it there breaks scorecard access.';

-- Blocking must also sever the friendship, or the blocked user keeps round
-- visibility through is_friend() and keeps appearing in the activity feed.
CREATE OR REPLACE FUNCTION block_user(p_blocked UUID)
RETURNS VOID
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp
AS $$
BEGIN
  IF p_blocked = auth.uid() THEN
    RAISE EXCEPTION 'Cannot block yourself' USING ERRCODE = '22023';
  END IF;

  INSERT INTO user_blocks (blocker_id, blocked_id)
  VALUES (auth.uid(), p_blocked)
  ON CONFLICT DO NOTHING;

  DELETE FROM friendships
  WHERE (requester_id = auth.uid() AND addressee_id = p_blocked)
     OR (requester_id = p_blocked AND addressee_id = auth.uid());
END;
$$;

CREATE OR REPLACE FUNCTION report_content(
  p_content_type TEXT,
  p_content_id   UUID,
  p_author       UUID,
  p_reason       TEXT,
  p_note         TEXT DEFAULT NULL
)
RETURNS UUID
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp
AS $$
DECLARE
  v_id UUID;
BEGIN
  INSERT INTO content_reports (reporter_id, content_type, content_id, author_id, reason, note)
  VALUES (auth.uid(), p_content_type, p_content_id, p_author, p_reason, p_note)
  ON CONFLICT ON CONSTRAINT content_reports_once_per_reporter DO NOTHING
  RETURNING id INTO v_id;

  -- On a duplicate report return the EXISTING id rather than NULL, so a
  -- double-tap stays idempotent without looking like a failure to the caller.
  IF v_id IS NULL THEN
    SELECT id INTO v_id FROM content_reports
    WHERE reporter_id = auth.uid()
      AND content_type = p_content_type
      AND content_id = p_content_id;
  END IF;

  RETURN v_id;
END;
$$;

GRANT EXECUTE ON FUNCTION is_blocked_pair(UUID, UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION is_reported_by_viewer(TEXT, UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION block_user(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION report_content(TEXT, UUID, UUID, TEXT, TEXT) TO authenticated;
