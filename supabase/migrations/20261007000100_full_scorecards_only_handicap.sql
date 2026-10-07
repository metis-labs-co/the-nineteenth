-- Only full scorecards count toward the handicap (R13, R21, R22)
--
-- "Only full scorecards should contribute to the social index/handicap.
--  Part-filled quick score rounds should definitely not contribute." — Sam
--
-- The client gate (isCompleteForHandicap, src/utils/handicapEligibility.ts)
-- stops new app versions writing a differential for an incomplete card. Old
-- versions (1.14.x and earlier) still compute one — on submit, and
-- retroactively for any completed card with a NULL differential whenever Home
-- opens (handicapHistory.ts → recalculateScorecardDifferential →
-- updatePlayerHandicapIndex). This migration enforces the rule on the server
-- so no client version can put an incomplete card into the index:
--
--   1. scorecard_hole_has_strokes / scorecard_is_complete_for_handicap —
--      IMMUTABLE mirror of isCompleteForHandicap. Keep the two in step.
--   2. scorecard_eligible_for_differential(round_id, scores) — the single
--      eligibility decision both triggers share. The end-round-early migration
--      (20261007000200) CREATE OR REPLACEs it to add rounds.holes_played.
--   3. Trigger scorecards_full_card_differential (BEFORE INSERT OR UPDATE ON
--      scorecards): handicap_differential := NULL for an incomplete card.
--   4. Trigger handicap_combined_rounds_full_cards (BEFORE INSERT ON
--      handicap_combined_rounds): rejects a pair with an incomplete nine.
--   5. handicap_full_card_projected_index(player) — server mirror of
--      updatePlayerHandicapIndex (as precedent 20260629000000 did inline).
--   6. One-off data fix, handicap_full_card_data_fix(): records every
--      incomplete card that still carries a differential
--      (handicap_full_card_fix_audit), nulls it, records each affected
--      player's index (handicap_full_card_fix_player_audit) and recomputes
--      players.handicap_index — NULL when nothing qualifies. This must be
--      server-side: old clients never clear the index, and other players
--      read it (leaderboards, playing handicaps).
--
-- R22: competition rounds, and social rounds created before nine_type
-- existed, default to nine_type 'full'. A complete 9-hole card on a 9-hole
-- course in such a round is judged incomplete and loses its differential
-- (it rated a 9-hole score against 18-hole ratings). The rollout report
-- lists these separately.
--
-- Deliberately NOT done here (R21, R22):
--   * Existing handicap_combined_rounds / league_rounds rows built from an
--     incomplete card are listed by supabase/scripts/full_scorecards_only_report.sql
--     for review, not deleted.
--
-- Side effects of the data fix: the nulled rows' updated_at is bumped by
-- update_scorecards_updated_at (as in 20260629000000). No notification
-- trigger fires — they only react to a status change.
--
-- Locks: CREATE TRIGGER takes a SHARE ROW EXCLUSIVE lock on scorecards and
-- handicap_combined_rounds (app writes wait until COMMIT), and the data fix
-- row-locks every card it nulls. Apply at a quiet time.
--
-- Apply: psql "$DB_URL" -v ON_ERROR_STOP=1 --single-transaction -f <this file>
-- Dry run and report: see supabase/scripts/full_scorecards_only_report.sql.
-- Undo: see the commented UNDO block at the end of this file.

-- =====================================================
-- 1. Completeness predicate (mirror of isCompleteForHandicap)
-- =====================================================

-- One stored hole score carries a stroke count: a JSON number > 0,
-- {"strokes": n > 0}, or multi-ball {"balls": [...]} with any ball scored.
-- A pickup is strokes 10 (counts); did-not-attempt is strokes 0 (does not).
-- CASE (not AND/OR) keeps every ::NUMERIC cast behind its jsonb_typeof check.
CREATE OR REPLACE FUNCTION public.scorecard_hole_has_strokes(p_hole JSONB)
RETURNS BOOLEAN
LANGUAGE sql
IMMUTABLE
PARALLEL SAFE
AS $$
  SELECT CASE jsonb_typeof(p_hole)
    WHEN 'number' THEN (p_hole #>> '{}')::NUMERIC > 0
    WHEN 'object' THEN
      CASE
        WHEN jsonb_typeof(p_hole -> 'balls') = 'array' THEN EXISTS (
          SELECT 1
            FROM jsonb_array_elements(p_hole -> 'balls') AS b(ball)
           WHERE CASE jsonb_typeof(b.ball)
                   WHEN 'number' THEN (b.ball #>> '{}')::NUMERIC > 0
                   WHEN 'object' THEN
                     CASE WHEN jsonb_typeof(b.ball -> 'strokes') = 'number'
                          THEN (b.ball ->> 'strokes')::NUMERIC > 0
                          ELSE FALSE
                     END
                   ELSE FALSE
                 END
        )
        WHEN jsonb_typeof(p_hole -> 'strokes') = 'number'
          THEN (p_hole ->> 'strokes')::NUMERIC > 0
        ELSE FALSE
      END
    ELSE FALSE
  END;
$$;

COMMENT ON FUNCTION public.scorecard_hole_has_strokes(JSONB) IS
  'True when one scorecards.scores hole entry carries strokes > 0 (number, {strokes}, or multi-ball {balls} with any ball scored). Helper for scorecard_is_complete_for_handicap.';

-- A card is complete for handicap when every planned hole of its nine type
-- has strokes. No per-hole data at all (NULL, JSON null, non-object, {}) is a
-- legacy / multi-ball card and keeps the old gross-only rule (TRUE).
CREATE OR REPLACE FUNCTION public.scorecard_is_complete_for_handicap(
  p_scores JSONB,
  p_nine_type TEXT
)
RETURNS BOOLEAN
LANGUAGE sql
IMMUTABLE
PARALLEL SAFE
AS $$
  SELECT CASE
    WHEN p_scores IS NULL
      OR jsonb_typeof(p_scores) <> 'object'
      OR p_scores = '{}'::JSONB
      THEN TRUE
    ELSE NOT EXISTS (
      SELECT 1
        FROM generate_series(
               CASE p_nine_type WHEN 'back9' THEN 10 ELSE 1 END,
               CASE p_nine_type WHEN 'front9' THEN 9 ELSE 18 END
             ) AS h(hole)
       WHERE NOT public.scorecard_hole_has_strokes(p_scores -> h.hole::TEXT)
    )
  END;
$$;

COMMENT ON FUNCTION public.scorecard_is_complete_for_handicap(JSONB, TEXT) IS
  'Server mirror of isCompleteForHandicap (src/utils/handicapEligibility.ts): every hole of the nine type (full 1-18, front9 1-9, back9 10-18) has strokes > 0; no per-hole data ({} / NULL) counts as complete (legacy rule).';

-- =====================================================
-- 2. Shared eligibility decision (extension point)
-- =====================================================

-- Whether a card on this round may carry a handicap differential.
-- 20261007000200_end_round_early.sql replaces this to also require
-- rounds.holes_played IS NULL — both triggers pick that up unchanged.
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
BEGIN
  SELECT r.nine_type INTO v_nine_type FROM rounds r WHERE r.id = p_round_id;
  RETURN public.scorecard_is_complete_for_handicap(p_scores, COALESCE(v_nine_type, 'full'));
END;
$$;

REVOKE ALL ON FUNCTION public.scorecard_eligible_for_differential(UUID, JSONB) FROM PUBLIC, anon, authenticated;

COMMENT ON FUNCTION public.scorecard_eligible_for_differential(UUID, JSONB) IS
  'Single handicap-eligibility decision used by the scorecards_full_card_differential and handicap_combined_rounds_full_cards triggers. Replace this function (not the triggers) to add a rule.';

-- =====================================================
-- 3. scorecards: incomplete cards never keep a differential
-- =====================================================

-- SECURITY DEFINER so the rounds lookup is never hidden by RLS (a missed
-- lookup would judge a 9-hole card against 18 holes).
CREATE OR REPLACE FUNCTION public.scorecards_full_card_differential()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  IF NEW.handicap_differential IS NOT NULL
     AND NOT public.scorecard_eligible_for_differential(NEW.round_id, NEW.scores) THEN
    NEW.handicap_differential := NULL;
  END IF;
  RETURN NEW;
END;
$$;

REVOKE ALL ON FUNCTION public.scorecards_full_card_differential() FROM PUBLIC, anon, authenticated;

DROP TRIGGER IF EXISTS scorecards_full_card_differential ON public.scorecards;
CREATE TRIGGER scorecards_full_card_differential
  BEFORE INSERT OR UPDATE ON public.scorecards
  FOR EACH ROW
  EXECUTE FUNCTION public.scorecards_full_card_differential();

COMMENT ON FUNCTION public.scorecards_full_card_differential() IS
  'BEFORE INSERT OR UPDATE on scorecards: forces handicap_differential to NULL when scorecard_eligible_for_differential is false (incomplete card). Neutralises old clients that still compute one.';

-- =====================================================
-- 4. handicap_combined_rounds: both nines must be complete
-- =====================================================

CREATE OR REPLACE FUNCTION public.handicap_combined_rounds_full_cards()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_front_round UUID;
  v_front_scores JSONB;
  v_back_round UUID;
  v_back_scores JSONB;
BEGIN
  SELECT s.round_id, s.scores INTO v_front_round, v_front_scores
    FROM scorecards s WHERE s.id = NEW.front_scorecard_id;
  SELECT s.round_id, s.scores INTO v_back_round, v_back_scores
    FROM scorecards s WHERE s.id = NEW.back_scorecard_id;

  -- A missing card is left to the foreign keys to report.
  IF v_front_round IS NULL OR v_back_round IS NULL THEN
    RETURN NEW;
  END IF;

  IF NOT public.scorecard_eligible_for_differential(v_front_round, v_front_scores)
     OR NOT public.scorecard_eligible_for_differential(v_back_round, v_back_scores) THEN
    RAISE EXCEPTION 'Both nines must be fully scored to combine'
      USING ERRCODE = '22023';
  END IF;

  RETURN NEW;
END;
$$;

REVOKE ALL ON FUNCTION public.handicap_combined_rounds_full_cards() FROM PUBLIC, anon, authenticated;

DROP TRIGGER IF EXISTS handicap_combined_rounds_full_cards ON public.handicap_combined_rounds;
CREATE TRIGGER handicap_combined_rounds_full_cards
  BEFORE INSERT ON public.handicap_combined_rounds
  FOR EACH ROW
  EXECUTE FUNCTION public.handicap_combined_rounds_full_cards();

COMMENT ON FUNCTION public.handicap_combined_rounds_full_cards() IS
  'BEFORE INSERT on handicap_combined_rounds: rejects (22023) a pair when either source card is not eligible for a differential (scorecard_eligible_for_differential).';

-- =====================================================
-- 5. Projected index (server mirror of updatePlayerHandicapIndex)
-- =====================================================

-- Mirrors updatePlayerHandicapIndex + calculateHandicapIndex as A3-2 leaves
-- them: the 20 most recent qualifying 18-hole differentials (completed /
-- confirmed, round not deleted, nine_type 'full', not shared-ball, complete
-- card) plus the 20 most recent combined rounds, merged by date, most recent
-- 20, best-X-of-N (WHS table), x 0.96, capped at 54, 1 decimal. NULL when
-- nothing qualifies. Card dates use COALESCE(submitted_at, round date), as
-- 20260629000000 did. Keep in step with the TS.
CREATE OR REPLACE FUNCTION public.handicap_full_card_projected_index(p_player_id UUID)
RETURNS NUMERIC
LANGUAGE sql
STABLE
SET search_path = public, pg_temp
AS $$
  WITH card_diffs AS (
    SELECT s.handicap_differential AS differential,
           COALESCE(s.submitted_at, r.date::TIMESTAMPTZ) AS effective_date
      FROM scorecards s
      JOIN rounds r ON r.id = s.round_id
     WHERE s.player_id = p_player_id
       AND s.status IN ('completed', 'confirmed')
       AND s.handicap_differential IS NOT NULL
       AND r.deleted_at IS NULL
       AND r.nine_type = 'full'
       -- rounds.team_format is an enum: compare it as TEXT.
       AND NOT (COALESCE(r.game_type, '') IN ('scramble', 'alt-shot')
                OR COALESCE(r.team_format::TEXT, '') IN ('scramble', 'alt-shot'))
       AND scorecard_is_complete_for_handicap(s.scores, r.nine_type)
     ORDER BY 2 DESC
     LIMIT 20
  ),
  combined AS (
    SELECT hcr.handicap_differential AS differential,
           hcr.effective_date
      FROM handicap_combined_rounds hcr
     WHERE hcr.player_id = p_player_id
     ORDER BY hcr.effective_date DESC
     LIMIT 20
  ),
  recent20 AS (
    SELECT m.differential
      FROM (SELECT differential, effective_date FROM card_diffs
            UNION ALL
            SELECT differential, effective_date FROM combined) m
     ORDER BY m.effective_date DESC
     LIMIT 20
  ),
  qualifying AS (
    SELECT CASE
             WHEN COUNT(*) <= 5  THEN 1
             WHEN COUNT(*) <= 8  THEN 2
             WHEN COUNT(*) <= 11 THEN 3
             WHEN COUNT(*) <= 14 THEN 4
             WHEN COUNT(*) <= 16 THEN 5
             WHEN COUNT(*) <= 18 THEN 6
             WHEN COUNT(*)  = 19 THEN 7
             ELSE 8
           END AS count_to_use
      FROM recent20
  ),
  best AS (
    SELECT differential,
           ROW_NUMBER() OVER (ORDER BY differential ASC) AS brn
      FROM recent20
  )
  -- AVG over no rows is NULL, so a player with nothing qualifying gets NULL.
  SELECT ROUND(LEAST(AVG(b.differential) * 0.96, 54.0)::NUMERIC, 1)
    FROM best b
    CROSS JOIN qualifying q
   WHERE b.brn <= q.count_to_use;
$$;

REVOKE ALL ON FUNCTION public.handicap_full_card_projected_index(UUID) FROM PUBLIC, anon, authenticated;

COMMENT ON FUNCTION public.handicap_full_card_projected_index(UUID) IS
  'Server mirror of updatePlayerHandicapIndex (full scorecards only): the index the app would compute for this player; NULL when nothing qualifies. Used by handicap_full_card_data_fix and the rollout report.';

-- =====================================================
-- 6. One-off data fix (audited, re-runnable)
-- =====================================================

CREATE TABLE IF NOT EXISTS public.handicap_full_card_fix_audit (
  scorecard_id UUID PRIMARY KEY,           -- no FK: the audit outlives deleted cards
  player_id UUID NOT NULL,
  round_id UUID NOT NULL,
  nine_type TEXT NOT NULL,
  scorecard_status TEXT,
  old_differential NUMERIC(4,1) NOT NULL,
  -- Breakdown columns for the rollout report (R22), captured at fix time.
  is_competition BOOLEAN NOT NULL,
  course_hole_count INTEGER,
  game_type TEXT,
  team_format TEXT,                        -- rounds.team_format::TEXT
  round_created_at TIMESTAMPTZ,
  fixed_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

COMMENT ON TABLE public.handicap_full_card_fix_audit IS
  'Scorecards whose handicap_differential was nulled by 20261007000100 because the card was incomplete for its nine type. Read by supabase/scripts/full_scorecards_only_report.sql and the UNDO block. Not exposed to app users.';

ALTER TABLE public.handicap_full_card_fix_audit ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.handicap_full_card_fix_audit FROM anon, authenticated;

CREATE TABLE IF NOT EXISTS public.handicap_full_card_fix_player_audit (
  player_id UUID PRIMARY KEY,              -- no FK: the audit outlives deleted players
  old_handicap_index NUMERIC(4,1),         -- before the first fix run (kept on re-runs)
  new_handicap_index NUMERIC(4,1),         -- after the latest fix run
  recomputed_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

COMMENT ON TABLE public.handicap_full_card_fix_player_audit IS
  'players.handicap_index before/after 20261007000100 recomputed it for players who lost a differential. Read by the rollout report and the UNDO block. Not exposed to app users.';

ALTER TABLE public.handicap_full_card_fix_player_audit ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.handicap_full_card_fix_player_audit FROM anon, authenticated;

-- Records and nulls every incomplete card that still carries a differential,
-- then recomputes the index of every player who lost one. Only players
-- affected by THIS run are recomputed, so a re-run on clean data changes
-- nothing. The first recorded old index is kept on re-runs.
CREATE OR REPLACE FUNCTION public.handicap_full_card_data_fix()
RETURNS TABLE (cards_nulled INT, players_recomputed INT)
LANGUAGE plpgsql
SET search_path = public, pg_temp
AS $$
DECLARE
  v_cards INT;
  v_players UUID[];
  v_recomputed INT;
BEGIN
  -- a. Record every incomplete card that still carries a differential.
  INSERT INTO handicap_full_card_fix_audit
    (scorecard_id, player_id, round_id, nine_type, scorecard_status, old_differential,
     is_competition, course_hole_count, game_type, team_format, round_created_at)
  SELECT s.id, s.player_id, s.round_id, COALESCE(r.nine_type, 'full'), s.status, s.handicap_differential,
         r.competition_id IS NOT NULL,
         COALESCE(CASE WHEN jsonb_typeof(c.holes) = 'array' THEN jsonb_array_length(c.holes) END, c.num_holes),
         r.game_type,
         r.team_format::TEXT,
         r.created_at
    FROM scorecards s
    JOIN rounds r ON r.id = s.round_id
    LEFT JOIN courses c ON c.id = r.course_id
   WHERE s.handicap_differential IS NOT NULL
     AND NOT scorecard_is_complete_for_handicap(s.scores, COALESCE(r.nine_type, 'full'))
  ON CONFLICT (scorecard_id) DO NOTHING;

  -- b. Null them (the same predicate, so a card that has since become
  --    complete is never touched).
  WITH nulled AS (
    UPDATE scorecards s
       SET handicap_differential = NULL
      FROM rounds r
     WHERE r.id = s.round_id
       AND s.handicap_differential IS NOT NULL
       AND NOT scorecard_is_complete_for_handicap(s.scores, COALESCE(r.nine_type, 'full'))
    RETURNING s.player_id
  )
  SELECT COUNT(*)::INT, COALESCE(array_agg(DISTINCT player_id), '{}')
    INTO v_cards, v_players
    FROM nulled;

  -- c. Record each affected player's index before recomputing it.
  INSERT INTO handicap_full_card_fix_player_audit (player_id, old_handicap_index)
  SELECT p.id, p.handicap_index
    FROM players p
   WHERE p.id = ANY (v_players)
  ON CONFLICT (player_id) DO NOTHING;

  -- d. Recompute (NULL when nothing qualifies — old clients never clear it).
  UPDATE players p
     SET handicap_index = handicap_full_card_projected_index(p.id),
         handicap_index_updated_at = now()
   WHERE p.id = ANY (v_players);
  GET DIAGNOSTICS v_recomputed = ROW_COUNT;

  UPDATE handicap_full_card_fix_player_audit pa
     SET new_handicap_index = p.handicap_index,
         recomputed_at = now()
    FROM players p
   WHERE p.id = pa.player_id
     AND pa.player_id = ANY (v_players);

  RETURN QUERY SELECT v_cards, v_recomputed;
END;
$$;

REVOKE ALL ON FUNCTION public.handicap_full_card_data_fix() FROM PUBLIC, anon, authenticated;

COMMENT ON FUNCTION public.handicap_full_card_data_fix() IS
  'One-off R21 data fix: audits and nulls the differential of every incomplete card, then recomputes players.handicap_index (handicap_full_card_projected_index; NULL when nothing qualifies) for the players affected by this run. Re-runnable: a no-op on clean data.';

-- Run it once. psql prints the counts.
SELECT * FROM public.handicap_full_card_data_fix();

-- =====================================================
-- UNDO (manual — only on Sam's go; never part of a deploy)
-- =====================================================
-- Restores every nulled differential and every recomputed index from the
-- audit tables. A differential is restored only where it is still NULL, so a
-- card completed since keeps its new value. The guard trigger is disabled
-- around the restore (it would null the restored values) and re-enabled
-- afterwards; it then nulls them again on the card's next write. To remove
-- the guard for good, also DROP both triggers. ALTER TABLE ... DISABLE
-- TRIGGER takes an ACCESS EXCLUSIVE lock on scorecards: run at a quiet time.
--
-- psql "$DB_URL" -v ON_ERROR_STOP=1 <<'SQL'
-- BEGIN;
-- SET LOCAL lock_timeout = '5s';
-- ALTER TABLE public.scorecards DISABLE TRIGGER scorecards_full_card_differential;
-- UPDATE public.scorecards s
--    SET handicap_differential = a.old_differential
--   FROM public.handicap_full_card_fix_audit a
--  WHERE a.scorecard_id = s.id
--    AND s.handicap_differential IS NULL;
-- UPDATE public.players p
--    SET handicap_index = pa.old_handicap_index,
--        handicap_index_updated_at = now()
--   FROM public.handicap_full_card_fix_player_audit pa
--  WHERE pa.player_id = p.id;
-- ALTER TABLE public.scorecards ENABLE TRIGGER scorecards_full_card_differential;
-- -- Optional, to remove the guard entirely:
-- -- DROP TRIGGER IF EXISTS scorecards_full_card_differential ON public.scorecards;
-- -- DROP TRIGGER IF EXISTS handicap_combined_rounds_full_cards ON public.handicap_combined_rounds;
-- COMMIT;
-- SQL
