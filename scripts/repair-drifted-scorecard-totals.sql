-- =============================================================================
-- Repair drifted scorecard totals
-- =============================================================================
-- SQL equivalent of scripts/repair-drifted-scorecard-totals.mjs.
--
-- Root cause: `applyResolvedScoreToScorecard` (and its caller `applyBypassScores`
-- in the multi-scorer mismatch flow) historically wrote the updated `scores`
-- JSONB without recomputing totals. That left scorecards with stale
-- total_gross / total_net / total_points while the scorecard view live-sums
-- from the scores JSON and shows the correct values. The round list and any
-- consumer reading stored totals drifted.
--
-- For every completed/confirmed scorecard this block:
--   1. Live-sums `total_gross` from the scores JSONB (single-ball only).
--   2. For stableford rounds, recomputes `total_points` using the scorecard's
--      `daily_handicap_used` + the course hole par/strokeIndex.
--   3. Derives `total_net = total_gross - daily_handicap_used` (when DHC set).
--   4. Writes the fix ONLY when `total_gross` itself has drifted — net/points
--      drift without gross drift is intentionally out of scope (that would
--      imply the DHC was changed elsewhere, which is a different bug class).
--
-- Usage
-- -----
-- Preview first (nothing commits until you decide):
--
--   BEGIN;
--   \i scripts/repair-drifted-scorecard-totals.sql
--   -- inspect the NOTICE output, sanity check a few rows:
--   SELECT id, round_id, total_gross, total_net, total_points
--     FROM scorecards WHERE id = '<id-from-notice>';
--   ROLLBACK;  -- or COMMIT;
--
-- To scope to a single round or player, uncomment the filters in the FOR loop
-- below before running.
--
-- Delete this script after the sweep is complete.
-- =============================================================================

DO $$
DECLARE
  PICKUP_SCORE CONSTANT int := 10;

  sc_row   RECORD;
  h_row    RECORD;
  live_gross  int;
  live_points int;
  new_net     int;

  hole_key text;
  hole_obj jsonb;
  strokes  int;
  sr       int;     -- strokes received on this hole
  net      int;
  rel      int;
  pts      int;

  dhc int;
  checked int := 0;
  fixed   int := 0;
  skipped_clean int := 0;
  skipped_net_only int := 0;
BEGIN
  FOR sc_row IN
    SELECT s.id,
           s.round_id,
           s.player_id,
           s.scores,
           s.total_gross,
           s.total_net,
           s.total_points,
           s.daily_handicap_used,
           r.game_type,
           c.holes
      FROM scorecards s
      JOIN rounds    r ON r.id = s.round_id
      JOIN courses   c ON c.id = r.course_id
     WHERE s.status IN ('completed', 'confirmed')
       AND s.scores IS NOT NULL
    -- Uncomment to scope:
    --   AND s.round_id  = '<round-uuid>'::uuid
    --   AND s.player_id = '<player-uuid>'::uuid
     ORDER BY s.updated_at DESC
  LOOP
    checked := checked + 1;

    -- -------------------------------------------------------------------------
    -- 1. Live-sum total_gross from the scores JSONB (single-ball only)
    -- -------------------------------------------------------------------------
    SELECT COALESCE(SUM((v->>'strokes')::int), 0)
      INTO live_gross
      FROM jsonb_each(sc_row.scores) AS e(k, v)
     WHERE jsonb_typeof(v) = 'object'
       AND v ? 'strokes'
       AND jsonb_typeof(v->'strokes') = 'number'
       AND (v->>'strokes')::int > 0;

    -- Skip clean rows
    IF live_gross = sc_row.total_gross THEN
      skipped_clean := skipped_clean + 1;
      CONTINUE;
    END IF;

    -- -------------------------------------------------------------------------
    -- 2. Recompute stableford points when applicable
    -- -------------------------------------------------------------------------
    live_points := NULL;
    dhc := sc_row.daily_handicap_used;

    IF sc_row.game_type = 'stableford'
       AND dhc IS NOT NULL
       AND sc_row.holes IS NOT NULL
       AND jsonb_typeof(sc_row.holes) = 'array'
    THEN
      live_points := 0;

      FOR h_row IN
        SELECT (h->>'number')::int      AS number,
               (h->>'par')::int         AS par,
               (h->>'strokeIndex')::int AS stroke_index
          FROM jsonb_array_elements(sc_row.holes) AS h
      LOOP
        hole_key := h_row.number::text;

        IF sc_row.scores ? hole_key THEN
          hole_obj := sc_row.scores -> hole_key;

          IF jsonb_typeof(hole_obj) = 'object'
             AND hole_obj ? 'strokes'
             AND jsonb_typeof(hole_obj->'strokes') = 'number'
          THEN
            strokes := (hole_obj->>'strokes')::int;

            IF strokes > 0 AND strokes < PICKUP_SCORE THEN
              -- Mirror getStrokesReceived() in src/utils/scoring.ts:23
              IF dhc <= 0 THEN
                sr := 0;
              ELSE
                sr := (dhc / 18)
                    + CASE WHEN h_row.stroke_index <= (dhc % 18) THEN 1 ELSE 0 END;
              END IF;

              net := strokes - sr;
              rel := net - h_row.par;

              -- Mirror calculateStablefordPointsNet() in src/utils/scoring.ts
              pts := CASE
                WHEN rel <= -3 THEN 5
                WHEN rel  = -2 THEN 4
                WHEN rel  = -1 THEN 3
                WHEN rel  =  0 THEN 2
                WHEN rel  =  1 THEN 1
                ELSE 0
              END;

              live_points := live_points + pts;
            END IF;
          END IF;
        END IF;
      END LOOP;
    END IF;

    -- -------------------------------------------------------------------------
    -- 3. Apply the fix. Only gross-drift triggers a write; net and points are
    --    recomputed as a consequence.
    -- -------------------------------------------------------------------------
    IF dhc IS NOT NULL THEN
      new_net := live_gross - dhc;
    ELSE
      new_net := sc_row.total_net;  -- leave as-is when DHC absent
    END IF;

    UPDATE scorecards
       SET total_gross  = live_gross,
           total_net    = new_net,
           total_points = COALESCE(live_points, total_points),
           updated_at   = NOW()
     WHERE id = sc_row.id;

    fixed := fixed + 1;

    RAISE NOTICE
      'Fixed % round=% | gross %->%  net %->%  pts %->%  (%)',
      sc_row.id,
      sc_row.round_id,
      sc_row.total_gross,  live_gross,
      sc_row.total_net,    new_net,
      sc_row.total_points, COALESCE(live_points, sc_row.total_points),
      sc_row.game_type;
  END LOOP;

  RAISE NOTICE '';
  RAISE NOTICE '=== Summary ===';
  RAISE NOTICE '  Checked:     %', checked;
  RAISE NOTICE '  Fixed:       %', fixed;
  RAISE NOTICE '  Clean:       %', skipped_clean;
  RAISE NOTICE '  Skipped net-only drift: %', skipped_net_only;
END $$;
