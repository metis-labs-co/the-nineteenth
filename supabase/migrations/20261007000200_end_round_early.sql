-- =====================================================
-- End a social round early
-- The Nineteenth
-- =====================================================
-- 1. rounds.holes_played: how many holes, counted from the round's first
--    hole, were played when a standalone round was ended early.
--    NULL = played as planned. A back-9 round ended after 6 = holes 10-15.
--    CHECK: only standalone rounds, and 1 <= N < planned holes.
-- 2. end_round_early(p_round_id, p_holes_played): SECURITY DEFINER. Called
--    by the client at confirm time (online), or by the queued 'end_early'
--    round sync item (offline). Sets holes_played, trims side-game and
--    multi-scorer rows after the last played hole, strips those holes from
--    the round's scorecards.scores, and nulls the round's handicap
--    differentials. skins_results can only be deleted by the skins-game
--    creator under RLS, so a participant ending the round needs the
--    definer's rights.
--    Error contract (the client maps these; it never retries them):
--      42501  not authenticated / competition round / not the owner or an
--             ACCEPTED round participant
--      P0002  round missing or soft-deleted
--      22023  HINT 'invalid_holes_played'  N outside 1..planned-1
--             HINT 'round_already_ended'   holes_played already set to a
--                                          different N (DETAIL = that N)
--             HINT 'round_completed'       round completed, never ended
--             HINT 'round_not_in_progress' round not started (upcoming)
--             HINT 'round_scorecards_busy' a scorecard is being changed
--             HINT 'round_has_submitted_scorecards' a card is submitted
--             HINT 'round_has_combined_scorecards' a card is already combined
--    The same N again is a no-op success (idempotent retries), whatever the
--    round's status.
--    Before changing anything, locks every round scorecard without waiting
--    and rejects submitted cards or existing combinations. Existing combined
--    handicap history is preserved rather than deleted or invalidated.
--    scorecards.revision is NOT bumped and totals are NOT recomputed: totals
--    are client-owned, and the ending device's next write_scorecard_snapshot
--    (same stripped scores, the revision it already holds) must apply
--    cleanly instead of raising a false "changed on another device" conflict.
-- 2b. guard_rounds_holes_played (BEFORE UPDATE on rounds): holes_played can
--    only change inside end_round_early (transaction-local flag
--    app.ending_round = 'on'), and nine_type can't change once it is set.
-- 3. Extends the "only full scorecards count" rule from
--    20261007000100_full_scorecards_only_handicap.sql by replacing its shared
--    helper scorecard_eligible_for_differential(round_id, scores): a round
--    with holes_played set never yields a differential (even for {} /
--    multi-ball cards) and its cards can't be combined. Both A7 triggers pick
--    this up unchanged. This also neutralises old clients (1.14.x) that
--    recalculate null differentials on Home.
-- 3b. A separate combination guard locks both cards FOR SHARE, then checks
--    fresh submission/eligibility state. This serializes combination inserts
--    with ending, including callers that passed A7's earlier validation.
-- 4. get_activity_feed / get_round_feed_card also return holes_played and
--    nine_type, for the "Ended after N of M" label on the feed card.
--
-- DEPLOY ORDER: after 20260905000150 (UGC feed) and 20261007000100 (A7);
-- staging, then prod, BEFORE the app build that selects rounds.holes_played.
-- NEVER re-apply 20261007000100 after this file: it redefines
-- scorecard_eligible_for_differential without the holes_played rule. If A7
-- must be re-applied, re-apply this file then 20261007000300 straight after it.
-- C3 must follow this file: this file replaces its guarded end RPC.
-- Manual apply (known pooler port 6543; dry run: ROLLBACK instead of COMMIT):
-- psql "$DB_URL" -p 6543 -v ON_ERROR_STOP=1 <<'SQL'
-- SET default_transaction_read_only = off;
-- show transaction_read_only; -- must print off before BEGIN
-- BEGIN;
-- \i supabase/migrations/20261007000200_end_round_early.sql
-- COMMIT;
-- SQL
-- =====================================================

-- Fail fast if A7's completeness functions are missing.
DO $$
BEGIN
  IF to_regprocedure('public.scorecard_is_complete_for_handicap(jsonb, text)') IS NULL
     OR to_regprocedure('public.scorecard_eligible_for_differential(uuid, jsonb)') IS NULL THEN
    RAISE EXCEPTION 'Apply 20261007000100_full_scorecards_only_handicap.sql before 20261007000200_end_round_early.sql';
  END IF;
END $$;

-- =====================================================
-- 1. rounds.holes_played
-- =====================================================
ALTER TABLE rounds ADD COLUMN IF NOT EXISTS holes_played SMALLINT;

DO $$ BEGIN
  ALTER TABLE rounds ADD CONSTRAINT rounds_holes_played_check
    CHECK (
      holes_played IS NULL
      OR (
        competition_id IS NULL
        AND holes_played > 0
        AND holes_played < CASE nine_type WHEN 'full' THEN 18 ELSE 9 END
      )
    );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

COMMENT ON COLUMN rounds.holes_played IS
  'Holes played when a standalone round was ended early, counted from the round''s first hole (back9 + 6 = holes 10-15). NULL = played as planned. Written only by end_round_early(). A round with holes_played set never counts toward the handicap index.';

-- =====================================================
-- 2. end_round_early
-- =====================================================
-- The plan-v1 draft had a 3-argument signature (a front-9 conversion flag).
-- It was never deployed; drop it defensively so only the 2-argument
-- function exists.
DROP FUNCTION IF EXISTS end_round_early(UUID, INT, BOOLEAN);

CREATE OR REPLACE FUNCTION end_round_early(
  p_round_id UUID,
  p_holes_played INT
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_user UUID := auth.uid();
  v_owner UUID;
  v_competition_id UUID;
  v_nine_type TEXT;
  v_status TEXT;
  v_existing SMALLINT;
  v_planned INT;
  v_last_hole INT;
BEGIN
  IF v_user IS NULL THEN
    RAISE EXCEPTION 'Not authenticated' USING ERRCODE = '42501';
  END IF;

  SELECT user_id, competition_id, nine_type, status, holes_played
    INTO v_owner, v_competition_id, v_nine_type, v_status, v_existing
  FROM rounds
  WHERE id = p_round_id AND deleted_at IS NULL
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Round % not found', p_round_id USING ERRCODE = 'P0002';
  END IF;

  IF v_competition_id IS NOT NULL THEN
    RAISE EXCEPTION 'Only social rounds can be ended early' USING ERRCODE = '42501';
  END IF;

  -- The owner, or an ACCEPTED participant. is_round_participant would also
  -- let pending and declined invitees in.
  IF v_owner IS DISTINCT FROM v_user
     AND NOT is_accepted_round_participant(p_round_id, v_user) THEN
    RAISE EXCEPTION 'Not authorized to end round %', p_round_id USING ERRCODE = '42501';
  END IF;

  v_planned := CASE WHEN v_nine_type = 'full' THEN 18 ELSE 9 END;
  IF p_holes_played IS NULL OR p_holes_played < 1 OR p_holes_played >= v_planned THEN
    RAISE EXCEPTION 'holes_played must be between 1 and % for a % round (got %)',
      v_planned - 1, v_nine_type, p_holes_played
      USING ERRCODE = '22023', HINT = 'invalid_holes_played';
  END IF;

  IF v_existing IS NOT NULL THEN
    IF v_existing = p_holes_played THEN
      -- Retry of a call that already landed (queued item, double tap,
      -- second device ending at the same hole): no-op success, any status.
      RETURN;
    END IF;
    -- First end wins. The client adopts the server's N from DETAIL.
    RAISE EXCEPTION 'Round % was already ended after % holes', p_round_id, v_existing
      USING ERRCODE = '22023', DETAIL = v_existing::TEXT, HINT = 'round_already_ended';
  END IF;

  -- Only a round being played can be ended (the same-N retry above already
  -- returned, so a queued retry after completion still succeeds).
  IF v_status IS DISTINCT FROM 'in-progress' THEN
    IF v_status = 'completed' THEN
      RAISE EXCEPTION 'Round % is already completed', p_round_id
        USING ERRCODE = '22023', HINT = 'round_completed';
    END IF;
    RAISE EXCEPTION 'Round % is not in progress (status %)', p_round_id, v_status
      USING ERRCODE = '22023', HINT = 'round_not_in_progress';
  END IF;

  -- Submission holds a scorecard lock before notify_round_completed can
  -- update the round. We already hold the round lock, so NOWAIT avoids that
  -- opposite lock order becoming a deadlock. No writes precede these checks.
  BEGIN
    PERFORM sc.id
      FROM public.scorecards sc
     WHERE sc.round_id = p_round_id
     ORDER BY sc.id
     FOR UPDATE NOWAIT;
  EXCEPTION WHEN lock_not_available THEN
    RAISE EXCEPTION 'Round scores are changing; try ending the round again'
      USING ERRCODE = '22023', HINT = 'round_scorecards_busy';
  END;

  -- Fresh statements after locking see submissions/combinations that
  -- committed before the locks were acquired. Keep existing history intact.
  IF EXISTS (
    SELECT 1 FROM public.scorecards sc
     WHERE sc.round_id = p_round_id
       AND sc.status IN ('completed', 'confirmed')
  ) THEN
    RAISE EXCEPTION 'A round with submitted scorecards cannot be ended early'
      USING ERRCODE = '22023', HINT = 'round_has_submitted_scorecards';
  END IF;

  IF EXISTS (
    SELECT 1
      FROM public.handicap_combined_rounds hcr
      JOIN public.scorecards sc
        ON sc.id = hcr.front_scorecard_id OR sc.id = hcr.back_scorecard_id
     WHERE sc.round_id = p_round_id
  ) THEN
    RAISE EXCEPTION 'A round with combined scorecards cannot be ended early'
      USING ERRCODE = '22023', HINT = 'round_has_combined_scorecards';
  END IF;

  v_last_hole := (CASE WHEN v_nine_type = 'back9' THEN 9 ELSE 0 END) + p_holes_played;

  -- guard_rounds_holes_played (below) refuses any holes_played change unless
  -- this transaction-local flag is on. Set it around this one UPDATE only.
  PERFORM set_config('app.ending_round', 'on', true);
  UPDATE rounds
     SET holes_played = p_holes_played, updated_at = NOW()
   WHERE id = p_round_id;
  PERFORM set_config('app.ending_round', 'off', true);

  -- Rows for holes after the last played hole.
  DELETE FROM skins_results sr
   USING skins_games sg
   WHERE sr.skins_game_id = sg.id
     AND sg.round_id = p_round_id
     AND sr.hole_number > v_last_hole;

  DELETE FROM wolf_hole_decisions wd
   USING wolf_games wg
   WHERE wd.wolf_game_id = wg.id
     AND wg.round_id = p_round_id
     AND wd.hole_number > v_last_hole;

  DELETE FROM score_entries se
   WHERE se.round_id = p_round_id
     AND se.hole_number > v_last_hole;

  -- A pending mismatch on a removed hole would block multi-scorer submission
  -- readiness on another phone.
  DELETE FROM score_mismatches sm
   WHERE sm.round_id = p_round_id
     AND sm.hole_number > v_last_hole;

  -- shot_log feeds the v_sand_saves views; shots on unplayed holes must go.
  DELETE FROM shot_log sl
   WHERE sl.round_id = p_round_id
     AND sl.hole_number > v_last_hole;

  -- Score keys after the last played hole ('16', '17', '18' for a back 9
  -- ended after 6). Non-numeric keys and {} cards are left alone.
  -- Deliberately NOT touched: revision (only write_scorecard_snapshot bumps
  -- it; bumping it here would turn the ending device's own follow-up
  -- snapshot into a stale write and a false "changed on another device"
  -- conflict) and the totals (client-owned; that snapshot carries them,
  -- recomputed over the holes played).
  UPDATE scorecards sc
     SET scores = (
           SELECT COALESCE(jsonb_object_agg(e.key, e.value), '{}'::JSONB)
             FROM jsonb_each(sc.scores) AS e
            WHERE CASE WHEN e.key ~ '^[0-9]{1,3}$' THEN e.key::INT <= v_last_hole ELSE TRUE END
         )
   WHERE sc.round_id = p_round_id
     AND jsonb_typeof(sc.scores) = 'object'
     AND EXISTS (
           SELECT 1
             FROM jsonb_object_keys(sc.scores) AS k
            WHERE CASE WHEN k ~ '^[0-9]{1,3}$' THEN k::INT > v_last_hole ELSE FALSE END
         );

  -- No handicap impact at all (R13). A7's scorecards trigger (via the helper
  -- replaced in section 3) keeps it NULL on every later write.
  UPDATE scorecards
     SET handicap_differential = NULL
   WHERE round_id = p_round_id
     AND handicap_differential IS NOT NULL;
END;
$$;

REVOKE ALL ON FUNCTION end_round_early(UUID, INT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION end_round_early(UUID, INT) TO authenticated;

COMMENT ON FUNCTION end_round_early(UUID, INT) IS
  'End an in-progress standalone round early (owner or accepted participant). Locks all round scorecards NOWAIT and refuses submitted or combined cards before any writes, preserving combination history. Sets holes_played = N; deletes skins_results / wolf_hole_decisions / score_entries / score_mismatches / shot_log after the last played hole; strips those hole keys from the round''s scorecards.scores (revision and totals untouched: totals are client-owned); nulls the round''s handicap differentials. Same N again = no-op, any status. Errors: 42501 auth/competition, P0002 missing/deleted, 22023 with HINT invalid_holes_played | round_already_ended (DETAIL = existing N) | round_completed | round_not_in_progress | round_scorecards_busy | round_has_submitted_scorecards | round_has_combined_scorecards. SECURITY DEFINER (skins_results RLS is creator-only).';

-- =====================================================
-- 2b. holes_played is written only by end_round_early
-- =====================================================
-- "Users can update rounds" / "Accepted players can update standalone
-- rounds" let the owner and accepted invitees UPDATE the row, and
-- protect_round_ownership_fields pins only user_id / competition_id /
-- deleted_at. A direct write of holes_played would skip the trims (or clear
-- an end), and changing nine_type after an end would move the played holes.
-- No service-role exemption: an admin fix runs
--   SELECT set_config('app.ending_round', 'on', true);
-- in the same transaction first. The flag is transaction-local, so it never
-- leaks across pooled connections, and clients can't set it through
-- PostgREST.

CREATE OR REPLACE FUNCTION public.guard_rounds_holes_played()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public, pg_temp
AS $$
BEGIN
  IF NEW.holes_played IS DISTINCT FROM OLD.holes_played
     AND COALESCE(current_setting('app.ending_round', true), '') <> 'on' THEN
    RAISE EXCEPTION 'rounds.holes_played can only be changed by end_round_early()'
      USING ERRCODE = '42501';
  END IF;
  IF OLD.holes_played IS NOT NULL AND NEW.nine_type IS DISTINCT FROM OLD.nine_type THEN
    RAISE EXCEPTION 'The nine type of a round that was ended early cannot change'
      USING ERRCODE = '42501';
  END IF;
  RETURN NEW;
END;
$$;

COMMENT ON FUNCTION public.guard_rounds_holes_played() IS
  'BEFORE UPDATE guard on rounds: holes_played changes only inside end_round_early (transaction-local app.ending_round = on); nine_type is frozen once holes_played is set. Raises 42501.';

DROP TRIGGER IF EXISTS trigger_guard_rounds_holes_played ON rounds;
CREATE TRIGGER trigger_guard_rounds_holes_played
  BEFORE UPDATE ON rounds
  FOR EACH ROW EXECUTE FUNCTION public.guard_rounds_holes_played();

-- =====================================================
-- 3. Extend the "only full scorecards count" rule (A7)
-- =====================================================
-- A7's two triggers (scorecards_full_card_differential on scorecards,
-- handicap_combined_rounds_full_cards on handicap_combined_rounds) both
-- delegate to scorecard_eligible_for_differential(round_id, scores). Replacing
-- only that helper extends both triggers; the trigger functions, their RAISE
-- text ('Both nines must be fully scored to combine') and ERRCODE (22023) are
-- untouched. The one change: a round with holes_played set is never eligible,
-- even for a card with no per-hole data ({} legacy / multi-ball).
-- CREATE OR REPLACE keeps A7's REVOKE on this function. Re-applying A7's
-- migration after this one would undo this replacement (see DEPLOY ORDER).

CREATE OR REPLACE FUNCTION public.scorecard_eligible_for_differential(
  p_round_id UUID,
  p_scores JSONB
)
RETURNS BOOLEAN
LANGUAGE plpgsql
STABLE
SET search_path = public, pg_temp
AS $$
DECLARE
  v_nine_type TEXT;
  v_holes_played SMALLINT;
BEGIN
  SELECT r.nine_type, r.holes_played
    INTO v_nine_type, v_holes_played
    FROM rounds r
   WHERE r.id = p_round_id;
  RETURN v_holes_played IS NULL
     AND public.scorecard_is_complete_for_handicap(p_scores, COALESCE(v_nine_type, 'full'));
END;
$$;

COMMENT ON FUNCTION public.scorecard_eligible_for_differential(UUID, JSONB) IS
  'Single handicap-eligibility decision used by the scorecards_full_card_differential and handicap_combined_rounds_full_cards triggers: the round was not ended early (holes_played IS NULL) and the card is complete for its nine type. Replace this function (not the triggers) to add a rule.';

-- No data fix is needed here: holes_played is a new column, so no existing
-- card belongs to an ended-early round. A7 nulls existing incomplete cards.

-- =====================================================
-- 3b. Serialize new combinations with submission and ending
-- =====================================================
-- A7's existing completeness trigger remains unchanged. This additional
-- trigger runs after it (alphabetical trigger order), takes shared locks in
-- id order, then rechecks in a fresh statement. A7 may have validated before
-- an end committed while this INSERT waited for a card lock. VOLATILE gives
-- the post-lock statements fresh snapshots at READ COMMITTED.
CREATE OR REPLACE FUNCTION public.guard_handicap_combined_round_submission()
RETURNS TRIGGER
LANGUAGE plpgsql
VOLATILE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_front_status TEXT;
  v_front_round UUID;
  v_front_scores JSONB;
  v_back_status TEXT;
  v_back_round UUID;
  v_back_scores JSONB;
BEGIN
  PERFORM sc.id
    FROM public.scorecards sc
   WHERE sc.id IN (NEW.front_scorecard_id, NEW.back_scorecard_id)
   ORDER BY sc.id
   FOR SHARE;

  -- Do not combine this read with the locking statement: after a wait,
  -- eligibility must be evaluated against the newly committed round state.
  SELECT f.status, f.round_id, f.scores, b.status, b.round_id, b.scores
    INTO v_front_status, v_front_round, v_front_scores,
         v_back_status, v_back_round, v_back_scores
    FROM public.scorecards f
    JOIN public.scorecards b ON b.id = NEW.back_scorecard_id
   WHERE f.id = NEW.front_scorecard_id;

  -- As in A7, missing cards are left to the foreign keys to report.
  IF NOT FOUND THEN
    RETURN NEW;
  END IF;

  IF v_front_status IS NULL OR v_front_status NOT IN ('completed', 'confirmed')
     OR v_back_status IS NULL OR v_back_status NOT IN ('completed', 'confirmed')
     OR NOT public.scorecard_eligible_for_differential(v_front_round, v_front_scores)
     OR NOT public.scorecard_eligible_for_differential(v_back_round, v_back_scores) THEN
    RAISE EXCEPTION 'Both nines must be submitted and eligible for handicap to combine'
      USING ERRCODE = '22023';
  END IF;

  RETURN NEW;
END;
$$;

REVOKE ALL ON FUNCTION public.guard_handicap_combined_round_submission() FROM PUBLIC, anon, authenticated;

COMMENT ON FUNCTION public.guard_handicap_combined_round_submission() IS
  'BEFORE INSERT guard: locks both scorecards FOR SHARE in id order, then checks fresh submitted status and handicap eligibility; serializes combination inserts with ending a round without altering stored combinations. Missing cards are left to the foreign keys. Raises 22023.';

DROP TRIGGER IF EXISTS handicap_combined_rounds_submitted_cards ON public.handicap_combined_rounds;
CREATE TRIGGER handicap_combined_rounds_submitted_cards
  BEFORE INSERT ON public.handicap_combined_rounds
  FOR EACH ROW EXECUTE FUNCTION public.guard_handicap_combined_round_submission();

-- =====================================================
-- 4. Activity feed RPCs: add holes_played + nine_type
-- =====================================================
-- Bodies reproduced verbatim from 20260905000150_ugc_moderation_feed.sql.
-- The ONLY change is two output columns appended at the end of RETURNS
-- TABLE and of each SELECT list (plus the CTE's SELECT/GROUP BY). Adding
-- columns changes the return type, which CREATE OR REPLACE cannot do, so
-- drop first (precedent: 20260616000000_activity_feed_course_id.sql). Safe:
-- these functions are only called from the client via rpc(); no policy,
-- view or function depends on them.

DROP FUNCTION IF EXISTS get_activity_feed(INT, TIMESTAMPTZ);

CREATE OR REPLACE FUNCTION get_activity_feed(
  p_limit  INT DEFAULT 20,
  p_before TIMESTAMPTZ DEFAULT NULL
)
RETURNS TABLE (
  round_id         UUID,
  competition_id   UUID,
  course_id        UUID,
  club_id          UUID,
  course_name      TEXT,
  club_name        TEXT,
  club_location    TEXT,
  round_date       DATE,
  game_type        TEXT,
  is_team_round    BOOLEAN,
  activity_at      TIMESTAMPTZ,
  participants     JSONB,
  photos           JSONB,
  like_count       INT,
  comment_count    INT,
  viewer_has_liked BOOLEAN,
  holes_played     INT,
  nine_type        TEXT
)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public, pg_temp AS $$
  WITH visible_rounds AS (
    SELECT r.id, r.competition_id, r.course_id, r.date, r.game_type, r.is_team_round,
           r.holes_played, r.nine_type,
           MAX(sc.submitted_at) AS activity_at
    FROM rounds r
    JOIN scorecards sc ON sc.round_id = r.id
      AND sc.deleted_at IS NULL
      AND sc.status IN ('completed', 'confirmed')
      AND sc.submitted_at IS NOT NULL
    WHERE r.status = 'completed'
      AND r.deleted_at IS NULL
      AND social_enabled()
      AND EXISTS (
        SELECT 1 FROM scorecards f
        WHERE f.round_id = r.id
          AND f.deleted_at IS NULL
          AND (f.player_id = auth.uid() OR is_friend(f.player_id))
      )
    GROUP BY r.id, r.competition_id, r.course_id, r.date, r.game_type, r.is_team_round,
             r.holes_played, r.nine_type
    HAVING (p_before IS NULL OR MAX(sc.submitted_at) < p_before)
    ORDER BY MAX(sc.submitted_at) DESC, r.id DESC
    LIMIT GREATEST(p_limit, 1)
  )
  SELECT
    vr.id,
    vr.competition_id,
    co.id,
    cl.id,
    co.name::TEXT,
    cl.name::TEXT,
    NULLIF(concat_ws(', ', cl.city, cl.state), '')::TEXT,
    vr.date,
    vr.game_type::TEXT,
    vr.is_team_round,
    vr.activity_at,
    COALESCE((
      SELECT jsonb_agg(jsonb_build_object(
               'player_id', p.id,
               'name', p.name,
               'photo_url', p.photo_url,
               'total_gross', sc.total_gross,
               'total_net', sc.total_net,
               'total_points', sc.total_points
             ) ORDER BY sc.total_points DESC NULLS LAST)
      FROM scorecards sc
      JOIN players p ON p.id = sc.player_id
      WHERE sc.round_id = vr.id
        AND sc.deleted_at IS NULL
        AND sc.status IN ('completed', 'confirmed')
    ), '[]'::jsonb),
    COALESCE((
      SELECT jsonb_agg(jsonb_build_object(
               'id', ph.id,
               'storage_path', ph.storage_path,
               'width', ph.width,
               'height', ph.height,
               'uploader_id', ph.uploader_id
             ) ORDER BY ph.created_at)
      FROM round_photos ph
      WHERE ph.round_id = vr.id AND ph.deleted_at IS NULL
        AND NOT is_blocked_pair(auth.uid(), ph.uploader_id)
        AND NOT is_reported_by_viewer('round_photo', ph.id)
    ), '[]'::jsonb),
    (SELECT COUNT(*) FROM round_likes rl
      WHERE rl.round_id = vr.id
        AND NOT is_blocked_pair(auth.uid(), rl.player_id))::INT,
    (SELECT COUNT(*) FROM round_comments rc
      WHERE rc.round_id = vr.id AND rc.deleted_at IS NULL
        AND NOT is_blocked_pair(auth.uid(), rc.author_id)
        AND NOT is_reported_by_viewer('round_comment', rc.id))::INT,
    EXISTS (SELECT 1 FROM round_likes rl WHERE rl.round_id = vr.id AND rl.player_id = auth.uid()),
    vr.holes_played::INT,
    vr.nine_type::TEXT
  FROM visible_rounds vr
  JOIN courses co ON co.id = vr.course_id
  JOIN clubs cl ON cl.id = co.club_id
  ORDER BY vr.activity_at DESC, vr.id DESC;
$$;

COMMENT ON FUNCTION get_activity_feed(INT, TIMESTAMPTZ) IS
  'Keyset-paginated activity feed: completed rounds where the viewer or an accepted friend has a submitted scorecard. SECURITY DEFINER; self-authorizing via is_friend(). Cursor = activity_at (MAX submitted_at). Returns course_id/club_id for course deep-linking and holes_played/nine_type for the "Ended after N of M" label.';

GRANT EXECUTE ON FUNCTION get_activity_feed(INT, TIMESTAMPTZ) TO authenticated;

DROP FUNCTION IF EXISTS get_round_feed_card(UUID);

CREATE OR REPLACE FUNCTION get_round_feed_card(p_round_id UUID)
RETURNS TABLE (
  round_id         UUID,
  competition_id   UUID,
  course_id        UUID,
  club_id          UUID,
  course_name      TEXT,
  club_name        TEXT,
  club_location    TEXT,
  round_date       DATE,
  game_type        TEXT,
  is_team_round    BOOLEAN,
  activity_at      TIMESTAMPTZ,
  participants     JSONB,
  photos           JSONB,
  like_count       INT,
  comment_count    INT,
  viewer_has_liked BOOLEAN,
  holes_played     INT,
  nine_type        TEXT
)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public, pg_temp AS $$
  SELECT
    r.id,
    r.competition_id,
    co.id,
    cl.id,
    co.name::TEXT,
    cl.name::TEXT,
    NULLIF(concat_ws(', ', cl.city, cl.state), '')::TEXT,
    r.date,
    r.game_type::TEXT,
    r.is_team_round,
    (SELECT MAX(sc.submitted_at) FROM scorecards sc
       WHERE sc.round_id = r.id AND sc.deleted_at IS NULL),
    COALESCE((
      SELECT jsonb_agg(jsonb_build_object(
               'player_id', p.id,
               'name', p.name,
               'photo_url', p.photo_url,
               'total_gross', sc.total_gross,
               'total_net', sc.total_net,
               'total_points', sc.total_points
             ) ORDER BY sc.total_points DESC NULLS LAST)
      FROM scorecards sc
      JOIN players p ON p.id = sc.player_id
      WHERE sc.round_id = r.id
        AND sc.deleted_at IS NULL
        AND sc.status IN ('completed', 'confirmed')
    ), '[]'::jsonb),
    COALESCE((
      SELECT jsonb_agg(jsonb_build_object(
               'id', ph.id,
               'storage_path', ph.storage_path,
               'width', ph.width,
               'height', ph.height,
               'uploader_id', ph.uploader_id
             ) ORDER BY ph.created_at)
      FROM round_photos ph
      WHERE ph.round_id = r.id AND ph.deleted_at IS NULL
        AND NOT is_blocked_pair(auth.uid(), ph.uploader_id)
        AND NOT is_reported_by_viewer('round_photo', ph.id)
    ), '[]'::jsonb),
    (SELECT COUNT(*) FROM round_likes rl
      WHERE rl.round_id = r.id
        AND NOT is_blocked_pair(auth.uid(), rl.player_id))::INT,
    (SELECT COUNT(*) FROM round_comments rc
      WHERE rc.round_id = r.id AND rc.deleted_at IS NULL
        AND NOT is_blocked_pair(auth.uid(), rc.author_id)
        AND NOT is_reported_by_viewer('round_comment', rc.id))::INT,
    EXISTS (SELECT 1 FROM round_likes rl WHERE rl.round_id = r.id AND rl.player_id = auth.uid()),
    r.holes_played::INT,
    r.nine_type::TEXT
  FROM rounds r
  JOIN courses co ON co.id = r.course_id
  JOIN clubs cl ON cl.id = co.club_id
  WHERE r.id = p_round_id
    AND r.deleted_at IS NULL
    AND social_enabled()
    AND can_view_round(r.id);
$$;

COMMENT ON FUNCTION get_round_feed_card(UUID) IS
  'Single-round activity card for round detail / notification deep links. SECURITY DEFINER; authorized via can_view_round(). Returns course_id/club_id for course deep-linking and holes_played/nine_type for the "Ended after N of M" label.';

GRANT EXECUTE ON FUNCTION get_round_feed_card(UUID) TO authenticated;
