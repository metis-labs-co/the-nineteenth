-- =====================================================
-- Full-scorecards-only handicap (R21, R22) — rollout report
-- =====================================================
-- Read-only. It reads objects that 20261007000100_full_scorecards_only_handicap.sql
-- creates (the audit tables and handicap_full_card_projected_index), so the
-- "before" report is a DRY RUN: apply the migration inside a transaction,
-- run this report, then ROLL BACK. Nothing is kept.
--
-- DRY RUN (the "before" numbers):
--   psql "$DB_URL" -p 6543 -v ON_ERROR_STOP=1 <<'SQL'
--   SET default_transaction_read_only = off;
--   show transaction_read_only; -- must print off before BEGIN
--   BEGIN;
--   SET LOCAL lock_timeout = '5s';
--   \i supabase/migrations/20261007000100_full_scorecards_only_handicap.sql
--   \i supabase/scripts/full_scorecards_only_report.sql
--   ROLLBACK;
--   SQL
--
--   * SET before BEGIN: pooler sessions default to read-only; the dry run
--     must write (then roll back). Known pooler access uses port 6543.
--   * Locks: the dry run takes the same locks as the real migration
--     (SHARE ROW EXCLUSIVE on scorecards and handicap_combined_rounds from
--     CREATE TRIGGER, plus row locks on every card it nulls) until ROLLBACK.
--     App writes to scorecards wait meanwhile. Run at a quiet time;
--     lock_timeout makes it fail fast instead of queueing behind traffic.
--   * Order: local → staging (or a prod snapshot restored locally) → prod.
--     Then a go/no-go with Sam on sections 1-3 before applying for real.
--   * If B1/C3 are already present, include their migrations in that order
--     after A7 and before this report, even for a rolled-back rehearsal.
--     A7 replaces B1's eligibility helper; B1 replaces C3's guarded end RPC.
--
-- AFTER applying (verify, then re-run days later to watch for drift):
--   psql "$DB_URL" -p 6543 -v ON_ERROR_STOP=1 -f supabase/scripts/full_scorecards_only_report.sql
--
-- Optional: -v nine_type_cutoff=YYYY-MM-DD — the date 20260330000001 (the
-- nine_type column) reached this environment. Rounds created before it are
-- "legacy" in section 1d. Defaults to the migration's date.
-- =====================================================

\if :{?nine_type_cutoff}
\else
  \set nine_type_cutoff '2026-03-30'
\endif

\echo '== 1. Cards whose differential the data fix removed (before = these, after = section 2) =='
SELECT COUNT(*)                                                     AS cards_fixed,
       COUNT(DISTINCT player_id)                                    AS players_affected,
       COUNT(*) FILTER (WHERE nine_type = 'full')                   AS planned_eighteen,
       COUNT(*) FILTER (WHERE nine_type <> 'full')                  AS planned_nine,
       COUNT(*) FILTER (WHERE scorecard_status IN ('completed', 'confirmed')) AS completed_cards,
       MIN(old_differential)                                        AS lowest_removed_differential,
       MAX(old_differential)                                        AS highest_removed_differential
  FROM public.handicap_full_card_fix_audit;

\echo '== 1a. By round kind: competition vs standalone =='
SELECT CASE WHEN is_competition THEN 'competition' ELSE 'standalone' END AS round_kind,
       COUNT(*)                  AS cards,
       COUNT(DISTINCT player_id) AS players
  FROM public.handicap_full_card_fix_audit
 GROUP BY 1
 ORDER BY 1;

\echo '== 1b. By planned nine and course hole count =='
SELECT nine_type,
       course_hole_count,
       COUNT(*)                  AS cards,
       COUNT(DISTINCT player_id) AS players
  FROM public.handicap_full_card_fix_audit
 GROUP BY 1, 2
 ORDER BY 1, 2;

\echo '== 1c. R22: 9-hole courses on nine_type = full rounds (listed separately) =='
SELECT a.scorecard_id,
       pl.name                   AS player,
       co.name                   AS course,
       a.course_hole_count,
       CASE WHEN a.is_competition THEN 'competition' ELSE 'standalone' END AS round_kind,
       (a.round_created_at < :'nine_type_cutoff'::TIMESTAMPTZ) AS legacy_round,
       r.date                    AS round_date,
       a.old_differential
  FROM public.handicap_full_card_fix_audit a
  LEFT JOIN public.players pl ON pl.id = a.player_id
  LEFT JOIN public.rounds r ON r.id = a.round_id
  LEFT JOIN public.courses co ON co.id = r.course_id
 WHERE a.nine_type = 'full'
   AND a.course_hole_count <= 9
 ORDER BY a.is_competition DESC, r.date DESC NULLS LAST;

\echo '== 1d. Legacy rounds (created before nine_type existed; cutoff:' :nine_type_cutoff ') =='
SELECT (round_created_at < :'nine_type_cutoff'::TIMESTAMPTZ) AS legacy_round,
       COUNT(*)                  AS cards,
       COUNT(DISTINCT player_id) AS players
  FROM public.handicap_full_card_fix_audit
 GROUP BY 1
 ORDER BY 1;

\echo '== 1e. By game type / team format =='
SELECT COALESCE(game_type, '(none)')   AS game_type,
       COALESCE(team_format, '(none)') AS team_format,   -- stored as TEXT
       COUNT(*)                  AS cards,
       COUNT(DISTINCT player_id) AS players
  FROM public.handicap_full_card_fix_audit
 GROUP BY 1, 2
 ORDER BY 3 DESC, 1, 2;

\echo '== 2. Incomplete cards still carrying a differential (expected 0) =='
SELECT COUNT(*)                    AS incomplete_cards_with_differential,
       COUNT(DISTINCT s.player_id) AS players
  FROM public.scorecards s
  JOIN public.rounds r ON r.id = s.round_id
 WHERE s.handicap_differential IS NOT NULL
   AND NOT public.scorecard_is_complete_for_handicap(s.scores, COALESCE(r.nine_type, 'full'));

\echo '== 3a. Recomputed players: index movement summary =='
SELECT COUNT(*) AS players_recomputed,
       COUNT(*) FILTER (WHERE old_handicap_index IS NOT NULL AND new_handicap_index IS NOT NULL
                          AND ABS(new_handicap_index - old_handicap_index) > 2.0) AS players_moving_more_than_2,
       COUNT(*) FILTER (WHERE old_handicap_index IS NOT NULL AND new_handicap_index IS NULL)
                                                    AS players_index_cleared,
       COUNT(*) FILTER (WHERE old_handicap_index IS NOT DISTINCT FROM new_handicap_index)
                                                    AS players_unchanged
  FROM public.handicap_full_card_fix_player_audit;

\echo '== 3b. Recomputed players (largest movement first) =='
SELECT pa.player_id,
       pl.name,
       pa.old_handicap_index,
       pa.new_handicap_index,
       pa.new_handicap_index - pa.old_handicap_index AS delta,
       (SELECT COUNT(*) FROM public.handicap_full_card_fix_audit a WHERE a.player_id = pa.player_id) AS cards_removed,
       CASE
         WHEN pa.old_handicap_index IS NOT NULL AND pa.new_handicap_index IS NULL
           THEN 'cleared: no qualifying rounds left'
         WHEN ABS(pa.new_handicap_index - pa.old_handicap_index) > 2.0
           THEN 'moves > 2.0'
         ELSE ''
       END AS flag
  FROM public.handicap_full_card_fix_player_audit pa
  LEFT JOIN public.players pl ON pl.id = pa.player_id
 ORDER BY ABS(COALESCE(pa.new_handicap_index, 0) - COALESCE(pa.old_handicap_index, 0)) DESC, pl.name;

\echo '== 3c. Drift: stored index differs from the projection now (expected 0 right after; later rows come from new rounds) =='
SELECT pa.player_id,
       pl.name,
       pl.handicap_index                                       AS stored_index,
       public.handicap_full_card_projected_index(pa.player_id) AS projected_now
  FROM public.handicap_full_card_fix_player_audit pa
  JOIN public.players pl ON pl.id = pa.player_id
 WHERE pl.handicap_index IS DISTINCT FROM public.handicap_full_card_projected_index(pa.player_id);

\echo '== 4. Combined 18s built from an incomplete nine (R22: left as is; review only) =='
SELECT hcr.id                    AS combined_round_id,
       pl.name                   AS player,
       hcr.handicap_differential,
       hcr.effective_date,
       public.scorecard_is_complete_for_handicap(fs.scores, COALESCE(fr.nine_type, 'full')) AS front_complete,
       public.scorecard_is_complete_for_handicap(bs.scores, COALESCE(br.nine_type, 'full')) AS back_complete,
       hcr.front_scorecard_id,
       hcr.back_scorecard_id
  FROM public.handicap_combined_rounds hcr
  JOIN public.players pl ON pl.id = hcr.player_id
  JOIN public.scorecards fs ON fs.id = hcr.front_scorecard_id
  JOIN public.rounds fr ON fr.id = fs.round_id
  JOIN public.scorecards bs ON bs.id = hcr.back_scorecard_id
  JOIN public.rounds br ON br.id = bs.round_id
 WHERE NOT public.scorecard_is_complete_for_handicap(fs.scores, COALESCE(fr.nine_type, 'full'))
    OR NOT public.scorecard_is_complete_for_handicap(bs.scores, COALESCE(br.nine_type, 'full'))
 ORDER BY hcr.effective_date DESC;

\echo '== 5. League rounds tagged from an incomplete card (review; not deleted) =='
SELECT lr.id                     AS league_round_id,
       lg.name                   AS league,
       pl.name                   AS player,
       lr.handicap_differential,
       lr.tagged_at,
       lr.scorecard_id
  FROM public.league_rounds lr
  JOIN public.leagues lg ON lg.id = lr.league_id
  JOIN public.players pl ON pl.id = lr.player_id
  JOIN public.scorecards s ON s.id = lr.scorecard_id
  JOIN public.rounds r ON r.id = s.round_id
 WHERE NOT public.scorecard_is_complete_for_handicap(s.scores, COALESCE(r.nine_type, 'full'))
 ORDER BY lr.tagged_at DESC;
