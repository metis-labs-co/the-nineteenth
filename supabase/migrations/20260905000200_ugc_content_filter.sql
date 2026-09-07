-- supabase/migrations/20260905000200_ugc_content_filter.sql
-- Server-side backstop for the comment content filter.
--
-- ⚠️ The term list here MUST match BLOCKED_TERMS in src/utils/contentFilter.ts.
-- This trigger is the enforcement (a modified client can skip the TS check);
-- the TS check exists so an honest user is stopped before they post rather than
-- getting a database error. Update both together or the filter is inconsistent.
--
-- Safe to re-run.

CREATE OR REPLACE FUNCTION contains_blocked_terms(p_text TEXT)
RETURNS BOOLEAN
LANGUAGE sql IMMUTABLE
AS $$
  SELECT p_text ~* '\m(slur_example)\M';
$$;

CREATE OR REPLACE FUNCTION reject_blocked_comment()
RETURNS TRIGGER
LANGUAGE plpgsql SET search_path = public, pg_temp
AS $$
BEGIN
  IF contains_blocked_terms(NEW.body) THEN
    RAISE EXCEPTION 'Comment contains content that is not allowed'
      USING ERRCODE = '22023';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS reject_blocked_comment_before_insert ON round_comments;
CREATE TRIGGER reject_blocked_comment_before_insert
  BEFORE INSERT OR UPDATE OF body ON round_comments
  FOR EACH ROW EXECUTE FUNCTION reject_blocked_comment();
