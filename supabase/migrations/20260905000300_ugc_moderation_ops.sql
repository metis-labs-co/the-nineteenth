-- supabase/migrations/20260905000300_ugc_moderation_ops.sql
-- Dashboard workflow for actioning reports. Safe to re-run.

-- Everything the operator needs to judge a report, in one place.
--
-- ⚠️ security_invoker = true is REQUIRED. Without it the view runs as its owner
-- and content_reports' RLS does not apply, exposing the entire moderation queue
-- - reporter names and reported content included - to every authenticated user.
-- It also trips this project's security linter, which already forced the same
-- fix on achievement_leaderboard (20260303000000) and the sand-save views.
-- The operator reads this through the service role, which is unaffected.
CREATE OR REPLACE VIEW pending_reports
WITH (security_invoker = true) AS
  SELECT
    cr.id,
    cr.created_at,
    cr.reason,
    cr.note,
    cr.content_type,
    cr.content_id,
    reporter.name AS reporter_name,
    author.name   AS author_name,
    CASE cr.content_type
      WHEN 'round_comment' THEN (SELECT rc.body FROM round_comments rc WHERE rc.id = cr.content_id)
      WHEN 'round_photo'   THEN (SELECT rp.storage_path FROM round_photos rp WHERE rp.id = cr.content_id)
      ELSE NULL
    END AS content_preview
  FROM content_reports cr
  LEFT JOIN players reporter ON reporter.id = cr.reporter_id
  LEFT JOIN players author   ON author.id = cr.author_id
  WHERE cr.status = 'open'
  ORDER BY cr.created_at DESC;

ALTER VIEW pending_reports SET (security_invoker = true);

-- Takedown reuses the existing deleted_at soft-delete: every read path already
-- filters on it, so removal needs no new query changes. The audit trail of who
-- removed what and why lives in content_reports.
CREATE OR REPLACE FUNCTION moderate_content(p_report_id UUID, p_action TEXT)
RETURNS VOID
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp
AS $$
DECLARE
  v_type TEXT;
  v_id   UUID;
BEGIN
  IF p_action NOT IN ('actioned', 'dismissed') THEN
    RAISE EXCEPTION 'Invalid action: %', p_action USING ERRCODE = '22023';
  END IF;

  SELECT content_type, content_id INTO v_type, v_id
  FROM content_reports WHERE id = p_report_id;

  IF v_type IS NULL THEN
    RAISE EXCEPTION 'No such report: %', p_report_id USING ERRCODE = '22023';
  END IF;

  IF p_action = 'actioned' THEN
    IF v_type = 'round_comment' THEN
      UPDATE round_comments SET deleted_at = NOW() WHERE id = v_id;
    ELSIF v_type = 'round_photo' THEN
      UPDATE round_photos SET deleted_at = NOW() WHERE id = v_id;
    END IF;
  END IF;

  UPDATE content_reports
     SET status = p_action, resolved_at = NOW()
   WHERE id = p_report_id;
END;
$$;

COMMENT ON FUNCTION moderate_content IS
  'Operator action from the Supabase dashboard:
     SELECT * FROM pending_reports;
     SELECT moderate_content(''<report-id>'', ''actioned'');';
