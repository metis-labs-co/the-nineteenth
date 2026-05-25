# Soft Delete for Rounds & Competitions — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make deleting rounds and competitions soft, reversible (undo toast), consistent across all entry points, stats-correct, and auto-purged after 90 days.

**Architecture:** Approach A — stamp `deleted_at` only on entity-level tables (`rounds`, `competitions`, `scorecards`, `pairings`, `competition_players`, `teams`, `scoring_pairs`); leaf tables stay live and are physically removed by FK cascade at the 90-day purge. Skins/Wolf persisted aggregates are kept correct by idempotent recompute-from-source RPCs. All delete/restore is funnelled through `SECURITY DEFINER` RPCs with `auth.uid()` authorization checks. The client routes every delete path through one mutation hook and surfaces an Undo toast.

**Tech Stack:** Supabase/PostgreSQL (SQL migrations, pg_cron), React Native + TypeScript, TanStack Query, supabase-js.

**Spec:** `docs/superpowers/specs/2026-05-25-soft-delete-rounds-competitions-design.md`

**Conventions for this plan:**
- New migration files are dated after the current latest (`20260525000000`). Use the `20260526000000`+ prefixes assigned per task.
- Every new function gets `GRANT EXECUTE` per project rule (auto-grants end 2026-10-30).
- Apply/verify on the **dev** Supabase project (`uoqofjwtdgdzhpwfzklo`) first; the CLI is linked to **prod** (`bvnxfhuvocxyilhlenka`) — watch migration-body drift (project memory).
- Client verification gate for every client task: `pnpm type-check` then `pnpm lint`.

---

## Phase 1 — Database: recompute, soft-delete & restore RPCs

### Task 1: Skins/Wolf aggregate recompute functions

**Files:**
- Create: `supabase/migrations/20260526000000_soft_delete_recompute_stats.sql`

These reset-then-rebuild the given players' aggregate rows from completed games whose parent round is **not** soft-deleted. Idempotent — used by both delete and restore. Column lists, source columns, and ordering mirror the existing `backfill_skins_player_statistics()` / `backfill_wolf_player_statistics()` exactly (so streaks compute correctly), differing only by (a) scoping to `p_player_ids`, (b) `DELETE` of existing rows first, and (c) the `rounds.deleted_at IS NULL` join filter.

- [ ] **Step 1: Write the migration**

```sql
-- Migration: recompute scoped skins/wolf player statistics (soft-delete aware)
-- These DELETE the given players' aggregate rows, then rebuild from completed
-- games whose parent round has deleted_at IS NULL. Idempotent: safe for both
-- soft-delete and restore. Internal helpers, called from the soft-delete /
-- restore RPCs (which run SECURITY DEFINER), plus service_role for manual ops.

-- ---------- SKINS ----------
CREATE OR REPLACE FUNCTION recompute_skins_player_statistics(p_player_ids UUID[])
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_player_id UUID;
  v_payout RECORD;
  v_games INTEGER; v_wins INTEGER; v_holes_played INTEGER; v_holes_won INTEGER;
  v_holes_tied INTEGER; v_buy_ins DECIMAL(12,2); v_winnings DECIMAL(12,2);
  v_net DECIMAL(12,2); v_streak INTEGER; v_longest INTEGER; v_last TIMESTAMPTZ;
  v_is_win BOOLEAN; v_count INTEGER := 0;
BEGIN
  IF p_player_ids IS NULL OR array_length(p_player_ids, 1) IS NULL THEN
    RETURN 0;
  END IF;

  DELETE FROM skins_player_statistics WHERE player_id = ANY(p_player_ids);

  FOREACH v_player_id IN ARRAY p_player_ids LOOP
    v_games := 0; v_wins := 0; v_holes_played := 0; v_holes_won := 0;
    v_holes_tied := 0; v_buy_ins := 0; v_winnings := 0; v_net := 0;
    v_streak := 0; v_longest := 0; v_last := NULL;

    FOR v_payout IN
      SELECT sp.holes_won, sp.holes_tied, sp.holes_lost, sp.buy_in,
             sp.total_winnings, sp.net_result, sg.completed_at AS game_completed_at
      FROM skins_payouts sp
      JOIN skins_games sg ON sg.id = sp.skins_game_id
      JOIN rounds r ON r.id = sg.round_id
      WHERE sp.player_id = v_player_id
        AND sg.status = 'completed'
        AND r.deleted_at IS NULL
      ORDER BY sg.completed_at ASC
    LOOP
      v_is_win := v_payout.net_result > 0;
      v_games := v_games + 1;
      IF v_is_win THEN
        v_wins := v_wins + 1;
        v_streak := v_streak + 1;
        v_longest := GREATEST(v_longest, v_streak);
      ELSE
        v_streak := 0;
      END IF;
      v_holes_played := v_holes_played + (v_payout.holes_won + v_payout.holes_tied + v_payout.holes_lost);
      v_holes_won := v_holes_won + v_payout.holes_won;
      v_holes_tied := v_holes_tied + v_payout.holes_tied;
      v_buy_ins := v_buy_ins + v_payout.buy_in;
      v_winnings := v_winnings + v_payout.total_winnings;
      v_net := v_net + v_payout.net_result;
      v_last := v_payout.game_completed_at;
    END LOOP;

    IF v_games > 0 THEN
      INSERT INTO skins_player_statistics (
        player_id, games_played, games_won, total_holes_played, total_holes_won,
        total_holes_tied, total_buy_ins, total_winnings, total_net_result,
        current_win_streak, longest_win_streak, win_rate, hole_win_rate, last_game_at
      ) VALUES (
        v_player_id, v_games, v_wins, v_holes_played, v_holes_won,
        v_holes_tied, v_buy_ins, v_winnings, v_net,
        v_streak, v_longest,
        ROUND((v_wins::DECIMAL / v_games) * 100, 2),
        CASE WHEN v_holes_played > 0
             THEN ROUND((v_holes_won::DECIMAL / v_holes_played) * 100, 2)
             ELSE NULL END,
        v_last
      );
      v_count := v_count + 1;
    END IF;
  END LOOP;

  RETURN v_count;
END;
$$;

-- ---------- WOLF ----------
CREATE OR REPLACE FUNCTION recompute_wolf_player_statistics(p_player_ids UUID[])
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_player_id UUID;
  v_payout RECORD;
  v_total_holes INTEGER; v_holes_as_wolf INTEGER;
  v_games INTEGER; v_wins INTEGER; v_points INTEGER; v_holes_played INTEGER;
  v_holes_wolf INTEGER; v_winnings DECIMAL(12,2); v_net DECIMAL(12,2);
  v_streak INTEGER; v_longest INTEGER; v_last TIMESTAMPTZ;
  v_is_win BOOLEAN; v_count INTEGER := 0;
BEGIN
  IF p_player_ids IS NULL OR array_length(p_player_ids, 1) IS NULL THEN
    RETURN 0;
  END IF;

  DELETE FROM wolf_player_statistics WHERE player_id = ANY(p_player_ids);

  FOREACH v_player_id IN ARRAY p_player_ids LOOP
    v_games := 0; v_wins := 0; v_points := 0; v_holes_played := 0;
    v_holes_wolf := 0; v_winnings := 0; v_net := 0;
    v_streak := 0; v_longest := 0; v_last := NULL;

    FOR v_payout IN
      SELECT wp.total_points, wp.total_winnings, wp.net_result,
             wg.id AS game_id, wg.completed_at AS game_completed_at
      FROM wolf_payouts wp
      JOIN wolf_games wg ON wg.id = wp.wolf_game_id
      JOIN rounds r ON r.id = wg.round_id
      WHERE wp.player_id = v_player_id
        AND wg.status = 'completed'
        AND r.deleted_at IS NULL
      ORDER BY wg.completed_at ASC
    LOOP
      SELECT COUNT(*) INTO v_total_holes
      FROM wolf_hole_decisions
      WHERE wolf_game_id = v_payout.game_id AND calculated_at IS NOT NULL;

      SELECT COUNT(*) INTO v_holes_as_wolf
      FROM wolf_hole_decisions
      WHERE wolf_game_id = v_payout.game_id AND wolf_id = v_player_id;

      v_is_win := v_payout.net_result > 0;
      v_games := v_games + 1;
      IF v_is_win THEN
        v_wins := v_wins + 1;
        v_streak := v_streak + 1;
        v_longest := GREATEST(v_longest, v_streak);
      ELSE
        v_streak := 0;
      END IF;
      v_points := v_points + v_payout.total_points;
      v_holes_played := v_holes_played + v_total_holes;
      v_holes_wolf := v_holes_wolf + v_holes_as_wolf;
      v_winnings := v_winnings + v_payout.total_winnings;
      v_net := v_net + v_payout.net_result;
      v_last := v_payout.game_completed_at;
    END LOOP;

    IF v_games > 0 THEN
      INSERT INTO wolf_player_statistics (
        player_id, games_played, games_won, total_points_earned,
        total_holes_played, total_holes_as_wolf, total_winnings, total_net_result,
        current_win_streak, longest_win_streak, win_rate, last_game_at
      ) VALUES (
        v_player_id, v_games, v_wins, v_points,
        v_holes_played, v_holes_wolf, v_winnings, v_net,
        v_streak, v_longest,
        ROUND((v_wins::DECIMAL / v_games) * 100, 2),
        v_last
      );
      v_count := v_count + 1;
    END IF;
  END LOOP;

  RETURN v_count;
END;
$$;

GRANT EXECUTE ON FUNCTION recompute_skins_player_statistics(UUID[]) TO service_role;
GRANT EXECUTE ON FUNCTION recompute_wolf_player_statistics(UUID[]) TO service_role;

COMMENT ON FUNCTION recompute_skins_player_statistics(UUID[]) IS
  'Reset + rebuild skins aggregate rows for the given players from completed games whose round is not soft-deleted. Idempotent.';
COMMENT ON FUNCTION recompute_wolf_player_statistics(UUID[]) IS
  'Reset + rebuild wolf aggregate rows for the given players from completed games whose round is not soft-deleted. Idempotent.';
```

- [ ] **Step 2: Apply locally and confirm functions exist**

Run: `supabase db reset` (applies all migrations against the local stack)
Expected: completes without error. Then:
Run: `supabase db reset && psql "$LOCAL_DB_URL" -c "\df recompute_*_player_statistics"`
Expected: both functions listed.

> If a local stack isn't available, apply to the **dev** project: `supabase db push` after confirming linkage, per project memory. Verify in the dashboard SQL editor.

- [ ] **Step 3: Commit**

```bash
git add supabase/migrations/20260526000000_soft_delete_recompute_stats.sql
git commit -m "feat(db): scoped soft-delete-aware skins/wolf stat recompute fns"
```

---

### Task 2: `soft_delete_round` and `restore_round` RPCs

**Files:**
- Create: `supabase/migrations/20260526000100_soft_delete_round_rpcs.sql`

Authorization: caller must be the round owner (`rounds.user_id = auth.uid()`) or the parent competition's organizer (`competitions.organizer_id = auth.uid()`). Affected skins/wolf players are captured **before** stamping `deleted_at`. `updated_at` is set on the same children the existing `soft_delete_competition` touches.

- [ ] **Step 1: Write the migration**

```sql
-- Migration: soft_delete_round / restore_round
-- Soft-deletes a round + its scorecards/pairings/scoring_pairs by stamping a
-- single shared deleted_at, then recomputes skins/wolf aggregates for affected
-- players. restore_round reverses it, only un-stamping children that share the
-- round's deletion timestamp.

CREATE OR REPLACE FUNCTION soft_delete_round(p_round_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_now TIMESTAMPTZ := NOW();
  v_user UUID := auth.uid();
  v_owner UUID;
  v_competition_id UUID;
  v_organizer UUID;
  v_authorized BOOLEAN := FALSE;
  v_skins_players UUID[];
  v_wolf_players UUID[];
BEGIN
  SELECT user_id, competition_id INTO v_owner, v_competition_id
  FROM rounds WHERE id = p_round_id AND deleted_at IS NULL;
  IF NOT FOUND THEN
    RETURN FALSE; -- already deleted or does not exist
  END IF;

  IF v_owner IS NOT NULL AND v_owner = v_user THEN
    v_authorized := TRUE;
  ELSIF v_competition_id IS NOT NULL THEN
    SELECT organizer_id INTO v_organizer FROM competitions WHERE id = v_competition_id;
    v_authorized := (v_organizer = v_user);
  END IF;
  IF NOT v_authorized THEN
    RAISE EXCEPTION 'Not authorized to delete round %', p_round_id USING ERRCODE = '42501';
  END IF;

  -- Capture affected players BEFORE stamping deleted_at.
  SELECT ARRAY(
    SELECT DISTINCT sp.player_id FROM skins_payouts sp
    JOIN skins_games sg ON sg.id = sp.skins_game_id
    WHERE sg.round_id = p_round_id
  ) INTO v_skins_players;
  SELECT ARRAY(
    SELECT DISTINCT wp.player_id FROM wolf_payouts wp
    JOIN wolf_games wg ON wg.id = wp.wolf_game_id
    WHERE wg.round_id = p_round_id
  ) INTO v_wolf_players;

  UPDATE scorecards   SET deleted_at = v_now, updated_at = v_now WHERE round_id = p_round_id AND deleted_at IS NULL;
  UPDATE pairings     SET deleted_at = v_now, updated_at = v_now WHERE round_id = p_round_id AND deleted_at IS NULL;
  UPDATE scoring_pairs SET deleted_at = v_now, updated_at = v_now WHERE round_id = p_round_id AND deleted_at IS NULL;
  UPDATE rounds       SET deleted_at = v_now, updated_at = v_now WHERE id = p_round_id;

  PERFORM recompute_skins_player_statistics(v_skins_players);
  PERFORM recompute_wolf_player_statistics(v_wolf_players);

  RETURN TRUE;
END;
$$;

CREATE OR REPLACE FUNCTION restore_round(p_round_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_user UUID := auth.uid();
  v_owner UUID;
  v_competition_id UUID;
  v_organizer UUID;
  v_authorized BOOLEAN := FALSE;
  v_deleted_at TIMESTAMPTZ;
  v_skins_players UUID[];
  v_wolf_players UUID[];
BEGIN
  SELECT user_id, competition_id, deleted_at
    INTO v_owner, v_competition_id, v_deleted_at
  FROM rounds WHERE id = p_round_id;
  IF NOT FOUND OR v_deleted_at IS NULL THEN
    RETURN FALSE; -- nothing to restore
  END IF;

  IF v_owner IS NOT NULL AND v_owner = v_user THEN
    v_authorized := TRUE;
  ELSIF v_competition_id IS NOT NULL THEN
    SELECT organizer_id INTO v_organizer FROM competitions WHERE id = v_competition_id;
    v_authorized := (v_organizer = v_user);
  END IF;
  IF NOT v_authorized THEN
    RAISE EXCEPTION 'Not authorized to restore round %', p_round_id USING ERRCODE = '42501';
  END IF;

  -- Restore the round + only the children stamped at the same timestamp.
  UPDATE rounds       SET deleted_at = NULL, updated_at = NOW() WHERE id = p_round_id;
  UPDATE scorecards   SET deleted_at = NULL, updated_at = NOW() WHERE round_id = p_round_id AND deleted_at = v_deleted_at;
  UPDATE pairings     SET deleted_at = NULL, updated_at = NOW() WHERE round_id = p_round_id AND deleted_at = v_deleted_at;
  UPDATE scoring_pairs SET deleted_at = NULL, updated_at = NOW() WHERE round_id = p_round_id AND deleted_at = v_deleted_at;

  -- Recompute now that the round is live again.
  SELECT ARRAY(
    SELECT DISTINCT sp.player_id FROM skins_payouts sp
    JOIN skins_games sg ON sg.id = sp.skins_game_id
    WHERE sg.round_id = p_round_id
  ) INTO v_skins_players;
  SELECT ARRAY(
    SELECT DISTINCT wp.player_id FROM wolf_payouts wp
    JOIN wolf_games wg ON wg.id = wp.wolf_game_id
    WHERE wg.round_id = p_round_id
  ) INTO v_wolf_players;

  PERFORM recompute_skins_player_statistics(v_skins_players);
  PERFORM recompute_wolf_player_statistics(v_wolf_players);

  RETURN TRUE;
END;
$$;

GRANT EXECUTE ON FUNCTION soft_delete_round(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION restore_round(UUID) TO authenticated;

COMMENT ON FUNCTION soft_delete_round(UUID) IS 'Soft-delete a round (owner or competition organizer only) + recompute skins/wolf stats.';
COMMENT ON FUNCTION restore_round(UUID) IS 'Restore a soft-deleted round + its same-timestamp children + recompute stats.';
```

- [ ] **Step 2: Apply and smoke-test authorization + round-trip**

Run: `supabase db reset`
Expected: succeeds. Then in the SQL editor / psql, as a non-owner the call must raise `42501`; as owner it returns `true` and `SELECT deleted_at FROM rounds WHERE id = ...` is non-null; `restore_round` returns it to null. (The full assertions live in the Task 14 verify script — this is a quick sanity check.)

- [ ] **Step 3: Commit**

```bash
git add supabase/migrations/20260526000100_soft_delete_round_rpcs.sql
git commit -m "feat(db): soft_delete_round + restore_round RPCs with auth + stat recompute"
```

---

### Task 3: Fix `soft_delete_competition` + add `restore_competition`

**Files:**
- Create: `supabase/migrations/20260526000200_competition_delete_rpcs.sql`

`CREATE OR REPLACE` the existing `soft_delete_competition` to add the missing organizer authorization check and the skins/wolf recompute; add `restore_competition`. Keep the existing tree-stamp behaviour (scorecards → pairings → scoring_pairs → rounds → competition_players → teams → competition).

- [ ] **Step 1: Write the migration**

```sql
-- Migration: harden soft_delete_competition (auth + stat recompute) and add restore_competition

CREATE OR REPLACE FUNCTION soft_delete_competition(p_competition_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_now TIMESTAMPTZ := NOW();
  v_round_ids UUID[];
  v_organizer UUID;
  v_skins_players UUID[];
  v_wolf_players UUID[];
BEGIN
  SELECT organizer_id INTO v_organizer
  FROM competitions WHERE id = p_competition_id AND deleted_at IS NULL;
  IF NOT FOUND THEN
    RETURN FALSE;
  END IF;
  IF v_organizer <> auth.uid() THEN
    RAISE EXCEPTION 'Not authorized to delete competition %', p_competition_id USING ERRCODE = '42501';
  END IF;

  SELECT ARRAY_AGG(id) INTO v_round_ids
  FROM rounds WHERE competition_id = p_competition_id AND deleted_at IS NULL;

  -- Capture affected players across all of this competition's rounds' games.
  SELECT ARRAY(
    SELECT DISTINCT sp.player_id FROM skins_payouts sp
    JOIN skins_games sg ON sg.id = sp.skins_game_id
    WHERE sg.round_id = ANY(COALESCE(v_round_ids, ARRAY[]::UUID[]))
  ) INTO v_skins_players;
  SELECT ARRAY(
    SELECT DISTINCT wp.player_id FROM wolf_payouts wp
    JOIN wolf_games wg ON wg.id = wp.wolf_game_id
    WHERE wg.round_id = ANY(COALESCE(v_round_ids, ARRAY[]::UUID[]))
  ) INTO v_wolf_players;

  IF v_round_ids IS NOT NULL AND array_length(v_round_ids, 1) > 0 THEN
    UPDATE scorecards    SET deleted_at = v_now, updated_at = v_now WHERE round_id = ANY(v_round_ids) AND deleted_at IS NULL;
    UPDATE pairings      SET deleted_at = v_now, updated_at = v_now WHERE round_id = ANY(v_round_ids) AND deleted_at IS NULL;
    UPDATE scoring_pairs SET deleted_at = v_now, updated_at = v_now WHERE round_id = ANY(v_round_ids) AND deleted_at IS NULL;
  END IF;

  UPDATE rounds SET deleted_at = v_now, updated_at = v_now
  WHERE competition_id = p_competition_id AND deleted_at IS NULL;

  UPDATE competition_players SET deleted_at = v_now
  WHERE competition_id = p_competition_id AND deleted_at IS NULL;

  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'teams') THEN
    EXECUTE format('UPDATE teams SET deleted_at = $1, updated_at = $1 WHERE competition_id = $2 AND deleted_at IS NULL')
      USING v_now, p_competition_id;
  END IF;

  UPDATE competitions SET deleted_at = v_now, updated_at = v_now
  WHERE id = p_competition_id AND deleted_at IS NULL;

  PERFORM recompute_skins_player_statistics(v_skins_players);
  PERFORM recompute_wolf_player_statistics(v_wolf_players);

  RETURN TRUE;
END;
$$;

CREATE OR REPLACE FUNCTION restore_competition(p_competition_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_deleted_at TIMESTAMPTZ;
  v_organizer UUID;
  v_round_ids UUID[];
  v_skins_players UUID[];
  v_wolf_players UUID[];
BEGIN
  SELECT organizer_id, deleted_at INTO v_organizer, v_deleted_at
  FROM competitions WHERE id = p_competition_id;
  IF NOT FOUND OR v_deleted_at IS NULL THEN
    RETURN FALSE;
  END IF;
  IF v_organizer <> auth.uid() THEN
    RAISE EXCEPTION 'Not authorized to restore competition %', p_competition_id USING ERRCODE = '42501';
  END IF;

  SELECT ARRAY_AGG(id) INTO v_round_ids
  FROM rounds WHERE competition_id = p_competition_id AND deleted_at = v_deleted_at;

  UPDATE competitions SET deleted_at = NULL, updated_at = NOW() WHERE id = p_competition_id;
  UPDATE competition_players SET deleted_at = NULL WHERE competition_id = p_competition_id AND deleted_at = v_deleted_at;
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'teams') THEN
    EXECUTE format('UPDATE teams SET deleted_at = NULL, updated_at = NOW() WHERE competition_id = $1 AND deleted_at = $2')
      USING p_competition_id, v_deleted_at;
  END IF;
  UPDATE rounds SET deleted_at = NULL, updated_at = NOW() WHERE competition_id = p_competition_id AND deleted_at = v_deleted_at;

  IF v_round_ids IS NOT NULL AND array_length(v_round_ids, 1) > 0 THEN
    UPDATE scorecards    SET deleted_at = NULL, updated_at = NOW() WHERE round_id = ANY(v_round_ids) AND deleted_at = v_deleted_at;
    UPDATE pairings      SET deleted_at = NULL, updated_at = NOW() WHERE round_id = ANY(v_round_ids) AND deleted_at = v_deleted_at;
    UPDATE scoring_pairs SET deleted_at = NULL, updated_at = NOW() WHERE round_id = ANY(v_round_ids) AND deleted_at = v_deleted_at;
  END IF;

  SELECT ARRAY(
    SELECT DISTINCT sp.player_id FROM skins_payouts sp
    JOIN skins_games sg ON sg.id = sp.skins_game_id
    WHERE sg.round_id = ANY(COALESCE(v_round_ids, ARRAY[]::UUID[]))
  ) INTO v_skins_players;
  SELECT ARRAY(
    SELECT DISTINCT wp.player_id FROM wolf_payouts wp
    JOIN wolf_games wg ON wg.id = wp.wolf_game_id
    WHERE wg.round_id = ANY(COALESCE(v_round_ids, ARRAY[]::UUID[]))
  ) INTO v_wolf_players;

  PERFORM recompute_skins_player_statistics(v_skins_players);
  PERFORM recompute_wolf_player_statistics(v_wolf_players);

  RETURN TRUE;
END;
$$;

GRANT EXECUTE ON FUNCTION soft_delete_competition(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION restore_competition(UUID) TO authenticated;

COMMENT ON FUNCTION soft_delete_competition(UUID) IS 'Soft-delete a competition tree (organizer only) + recompute skins/wolf stats.';
COMMENT ON FUNCTION restore_competition(UUID) IS 'Restore a soft-deleted competition tree (same-timestamp rows) + recompute stats.';
```

- [ ] **Step 2: Apply and sanity-check**

Run: `supabase db reset`
Expected: succeeds; non-organizer call raises `42501`; organizer round-trip flips `deleted_at` on the competition and its rounds and back.

- [ ] **Step 3: Commit**

```bash
git add supabase/migrations/20260526000200_competition_delete_rpcs.sql
git commit -m "feat(db): harden soft_delete_competition (auth+stats) + restore_competition"
```

---

## Phase 2 — Database: FK fix, purge job, storage cleanup

### Task 4: Partnership-rounds FK fix (unblock hard purge)

**Files:**
- Create: `supabase/migrations/20260526000300_partnership_rounds_fk_cascade.sql`

`partnership_rounds.scorecard_1_id / scorecard_2_id` currently have no `ON DELETE` clause (default `NO ACTION`), which would make the purge's hard `DELETE` of a round (→ its scorecards) fail. Convert to `ON DELETE CASCADE`, mirroring `league_rounds.scorecard_id`. Constraint names follow the Postgres `<table>_<column>_fkey` convention (the originals are unnamed).

- [ ] **Step 1: Write the migration**

```sql
-- Migration: partnership_rounds scorecard FKs -> ON DELETE CASCADE
-- Without this, hard-deleting a round whose scorecards were tagged into a
-- partnership league fails (blocking the 90-day purge). Mirrors league_rounds.

ALTER TABLE partnership_rounds
  DROP CONSTRAINT IF EXISTS partnership_rounds_scorecard_1_id_fkey,
  ADD CONSTRAINT partnership_rounds_scorecard_1_id_fkey
    FOREIGN KEY (scorecard_1_id) REFERENCES scorecards(id) ON DELETE CASCADE;

ALTER TABLE partnership_rounds
  DROP CONSTRAINT IF EXISTS partnership_rounds_scorecard_2_id_fkey,
  ADD CONSTRAINT partnership_rounds_scorecard_2_id_fkey
    FOREIGN KEY (scorecard_2_id) REFERENCES scorecards(id) ON DELETE CASCADE;
```

- [ ] **Step 2: Verify the constraint names matched**

Run: `supabase db reset`
Expected: succeeds (no "constraint does not exist" — `DROP ... IF EXISTS` tolerates a name miss, so also confirm the new CASCADE is present):
Run: `psql "$LOCAL_DB_URL" -c "SELECT conname, confdeltype FROM pg_constraint WHERE conrelid='partnership_rounds'::regclass AND contype='f';"`
Expected: `partnership_rounds_scorecard_1_id_fkey` and `_scorecard_2_id_fkey` show `confdeltype = c` (cascade). If a name didn't match (still `a`/no-action), look up the real `conname` from that query and redo the DROP with the actual name.

- [ ] **Step 3: Commit**

```bash
git add supabase/migrations/20260526000300_partnership_rounds_fk_cascade.sql
git commit -m "fix(db): partnership_rounds scorecard FKs ON DELETE CASCADE"
```

---

### Task 5: `purge_soft_deleted()` + pg_cron schedule + storage cleanup

**Files:**
- Create: `supabase/migrations/20260526000400_purge_soft_deleted.sql`

Hard-deletes competitions and standalone rounds whose `deleted_at` is older than 90 days. Deletes the affected rounds' `round-photos` storage objects **before** the rows cascade away. Scheduled daily via pg_cron, mirroring `20250120000000_pg_cron_deactivate_competitions.sql`.

- [ ] **Step 1: Write the migration**

```sql
-- Migration: 90-day purge of soft-deleted rounds/competitions + storage cleanup + cron

CREATE OR REPLACE FUNCTION purge_soft_deleted()
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_cutoff TIMESTAMPTZ := NOW() - INTERVAL '90 days';  -- grace period (90 days)
  v_round_ids UUID[];
  v_comp_count INTEGER := 0;
BEGIN
  -- Every round about to disappear: standalone rounds past cutoff, plus rounds
  -- under a competition past cutoff (whose cascade will remove them).
  SELECT ARRAY(
    SELECT id FROM rounds WHERE deleted_at IS NOT NULL AND deleted_at < v_cutoff
    UNION
    SELECT r.id FROM rounds r
    JOIN competitions c ON c.id = r.competition_id
    WHERE c.deleted_at IS NOT NULL AND c.deleted_at < v_cutoff
  ) INTO v_round_ids;

  -- Remove storage objects first (round_photos rows cascade-delete with the round).
  IF array_length(v_round_ids, 1) > 0 THEN
    DELETE FROM storage.objects
    WHERE bucket_id = 'round-photos'
      AND name IN (SELECT storage_path FROM round_photos WHERE round_id = ANY(v_round_ids));
  END IF;

  -- Hard delete competitions (cascades their rounds + full tree).
  WITH del AS (
    DELETE FROM competitions
    WHERE deleted_at IS NOT NULL AND deleted_at < v_cutoff
    RETURNING id
  )
  SELECT count(*) INTO v_comp_count FROM del;

  -- Hard delete standalone rounds past cutoff (cascades their tree).
  DELETE FROM rounds WHERE deleted_at IS NOT NULL AND deleted_at < v_cutoff;

  RETURN v_comp_count;
END;
$$;

-- service_role only; never callable by app clients.
REVOKE ALL ON FUNCTION purge_soft_deleted() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION purge_soft_deleted() TO service_role;

COMMENT ON FUNCTION purge_soft_deleted() IS
  'Hard-deletes rounds/competitions soft-deleted >90 days ago (+ their round-photos storage objects). Run daily by pg_cron.';

-- Schedule daily at 16:00 UTC (mirrors deactivate-expired-competitions pattern).
SELECT cron.schedule(
  'purge-soft-deleted',
  '0 16 * * *',
  $$SELECT purge_soft_deleted()$$
);
```

- [ ] **Step 2: Verify purge with a back-dated row**

Run: `supabase db reset`, then in psql against a seeded standalone round:
```sql
UPDATE rounds SET deleted_at = NOW() - INTERVAL '91 days' WHERE id = '<seed-round-id>';
SELECT purge_soft_deleted();
SELECT count(*) FROM rounds WHERE id = '<seed-round-id>';  -- expect 0
```
Expected: the round (and its cascade tree) is gone; a round soft-deleted "today" survives. Also confirm the cron job registered:
Run: `psql "$LOCAL_DB_URL" -c "SELECT jobname FROM cron.job WHERE jobname='purge-soft-deleted';"`
Expected: one row.

- [ ] **Step 3: Commit**

```bash
git add supabase/migrations/20260526000400_purge_soft_deleted.sql
git commit -m "feat(db): 90-day purge_soft_deleted job + round-photos storage cleanup"
```

---

## Phase 3 — Database: server-side RPC read filters

The activity feed and league leaderboards list rounds **inside SQL RPCs**, so the client cannot filter them — their definitions must exclude `deleted_at`.

### Task 6: Add `deleted_at IS NULL` to round-listing RPCs

**Files:**
- Read: `supabase/migrations/20260521000200_activity_feed_rpc.sql` (functions `get_activity_feed`, `get_round_feed_card`)
- Read: the league leaderboard/feed function migrations defining `get_league_leaderboard_v2`, `get_eclectic_leaderboard`, `get_player_league_rounds`, `get_my_leagues`, `get_public_leagues`
- Create: `supabase/migrations/20260526000500_rpc_exclude_soft_deleted_rounds.sql`

- [ ] **Step 1: Locate the round references in each RPC**

Run: `grep -rln "get_activity_feed\|get_round_feed_card\|get_league_leaderboard_v2\|get_eclectic_leaderboard\|get_player_league_rounds\|get_my_leagues\|get_public_leagues" supabase/migrations`
Then read each matched migration and identify every `FROM rounds`/`JOIN rounds` (and any scorecards→rounds join) inside those function bodies.

- [ ] **Step 2: Write a migration that `CREATE OR REPLACE`s each affected function**

For each function, copy its **latest** definition verbatim from the source migration and add `AND r.deleted_at IS NULL` (using whatever alias the function gives the `rounds` table) to every round-touching `WHERE`/`JOIN ... ON`. Put all the replacements in `20260526000500_rpc_exclude_soft_deleted_rounds.sql`. Preserve each function's existing `SECURITY DEFINER`, `GRANT`, and signature exactly.

Example shape (activity feed):
```sql
CREATE OR REPLACE FUNCTION get_activity_feed(/* exact original signature */)
RETURNS /* original */
LANGUAGE sql STABLE SECURITY DEFINER
AS $$
  -- original body, with each rounds reference gaining:  AND r.deleted_at IS NULL
$$;
-- re-apply the original GRANT EXECUTE ... line(s)
```

> Because these are full-body copies, this task must be done by reading the real source — do not hand-write the bodies from memory.

- [ ] **Step 3: Apply and verify a deleted round drops out of the feed**

Run: `supabase db reset`, then with two friended seed users where user B has a completed round:
```sql
SELECT count(*) FROM get_activity_feed(/* as user A */);          -- note N
SELECT soft_delete_round('<user-B-round-id>');                    -- as user B (or set deleted_at directly)
SELECT count(*) FROM get_activity_feed(/* as user A */);          -- expect N-1
```
Expected: the deleted round disappears from the feed and from `get_round_feed_card`.

- [ ] **Step 4: Commit**

```bash
git add supabase/migrations/20260526000500_rpc_exclude_soft_deleted_rounds.sql
git commit -m "fix(db): exclude soft-deleted rounds from activity feed + league RPCs"
```

---

## Phase 4 — Client: toast Undo action support

### Task 7: Add `action` to the simple toast

**Files:**
- Modify: `src/context/ToastContext.tsx` (`SimpleToastItem` ~lines 51-56)
- Modify: `src/components/common/Toast/UnifiedToastDisplay.tsx` (simple-variant case ~lines 120-130)
- Modify: `src/components/common/Toast/variants/SimpleToastCard.tsx`

- [ ] **Step 1: Add the `action` field to `SimpleToastItem`**

In `src/context/ToastContext.tsx`, extend the interface:
```typescript
export interface SimpleToastItem extends BaseToastItem {
  variant: SimpleToastVariant;
  title: string;
  message?: string;
  icon?: string;
  action?: { label: string; onPress: () => void };
}
```

- [ ] **Step 2: Thread `action` + `onDismiss` through `UnifiedToastDisplay`**

In the `'success' | 'error' | 'info'` case of `renderVariant`, pass the new props:
```tsx
case 'success':
case 'error':
case 'info':
  return (
    <SimpleToastCard
      variant={toast.variant}
      title={toast.title}
      message={toast.message}
      icon={toast.icon}
      action={toast.action}
      onDismiss={dismissToast}
    />
  );
```

- [ ] **Step 3: Render the action button in `SimpleToastCard`**

Add the props and a trailing `TouchableOpacity` (mirror the interactive pattern from `NotificationToastCard`). On press, run the action then dismiss:
```tsx
import { StyleSheet, View, TouchableOpacity } from 'react-native';
// ...
interface SimpleToastCardProps {
  variant: SimpleToastVariant;
  title: string;
  message?: string;
  icon?: string;
  action?: { label: string; onPress: () => void };
  onDismiss?: () => void;
}
// inside the component, after the <View style={styles.content}> block:
{action && (
  <TouchableOpacity
    style={styles.actionButton}
    onPress={() => { action.onPress(); onDismiss?.(); }}
    accessibilityRole="button"
    accessibilityLabel={action.label}
    hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
  >
    <Text style={[styles.actionLabel, { color: iconColor }]}>{action.label}</Text>
  </TouchableOpacity>
)}
```
Add styles:
```typescript
actionButton: {
  marginLeft: spacing.sm,
  paddingHorizontal: spacing.sm,
  paddingVertical: spacing.xs,
},
actionLabel: {
  ...typography.smallBold,
},
```

- [ ] **Step 4: Verify build**

Run: `pnpm type-check && pnpm lint`
Expected: no errors.

- [ ] **Step 5: Commit**

```bash
git add src/context/ToastContext.tsx src/components/common/Toast/UnifiedToastDisplay.tsx src/components/common/Toast/variants/SimpleToastCard.tsx
git commit -m "feat(toast): optional action button on simple toast (for Undo)"
```

---

## Phase 5 — Client: round delete consolidation + Undo

### Task 8: Route `useDeleteRound` through the RPC + add `useRestoreRound`, local-cache cleanup, Undo toast

**Files:**
- Modify: `src/hooks/rounds/mutations.ts` (`deleteRound` ~59-78, `useDeleteRound` ~119-171)

- [ ] **Step 1: Replace the hard-delete service with the RPC and clear local cache**

Replace the `deleteRound` function body:
```typescript
import { deleteScorecardsByRound } from '@/services/offline/database';
// ...
async function deleteRound(roundId: string): Promise<DeleteRoundResult> {
  const { error } = await supabase.rpc('soft_delete_round' as never, {
    p_round_id: roundId,
  } as never);
  if (error) {
    console.error('[deleteRound] Failed to soft-delete round:', error);
    throw new Error(`Failed to delete round: ${error.message}`);
  }
  // Clear locally-cached scorecards so offline reads don't resurrect them.
  try {
    await deleteScorecardsByRound(roundId);
  } catch (e) {
    console.warn('[deleteRound] local scorecard cleanup failed (non-fatal):', e);
  }
  return { success: true, roundId };
}

async function restoreRound(roundId: string): Promise<DeleteRoundResult> {
  const { error } = await supabase.rpc('restore_round' as never, {
    p_round_id: roundId,
  } as never);
  if (error) {
    console.error('[restoreRound] Failed to restore round:', error);
    throw new Error(`Failed to restore round: ${error.message}`);
  }
  return { success: true, roundId };
}
```
(Update the JSDoc above `deleteRound` to say "soft-delete via `soft_delete_round` RPC; recoverable for 90 days" rather than the cascade list.)

- [ ] **Step 2: Add the Undo toast + `useRestoreRound` hook**

Add a shared invalidation helper and the restore hook; show an Undo toast in `useDeleteRound`'s `onSuccess`:
```typescript
import { useToast } from '@/context/ToastContext';

function invalidateRoundCaches(
  queryClient: ReturnType<typeof useQueryClient>,
  variables: DeleteRoundInput,
) {
  queryClient.invalidateQueries({ queryKey: scorecardKeys.list({ roundId: variables.roundId }) });
  queryClient.invalidateQueries({ queryKey: skinsKeys.gamesByRound(variables.roundId) });
  if (variables.competitionId) {
    queryClient.invalidateQueries({ queryKey: roundKeys.list(variables.competitionId) });
    queryClient.invalidateQueries({ queryKey: competitionKeys.detail(variables.competitionId) });
    queryClient.invalidateQueries({ queryKey: skinsKeys.all });
  }
  queryClient.invalidateQueries({ queryKey: roundKeys.lists() });
}

export function useRestoreRound() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: DeleteRoundInput) => restoreRound(input.roundId),
    onSuccess: (_, variables) => invalidateRoundCaches(queryClient, variables),
    onError: (error) => console.error('[useRestoreRound] Failed:', error),
  });
}
```
In `useDeleteRound`, capture `useToast` and the restore mutation, and in `onSuccess` (after the existing `removeQueries` + invalidations, which can now call `invalidateRoundCaches`) show:
```typescript
const { showToast } = useToast();
const restore = useRestoreRound();
// ...inside onSuccess(_, variables):
showToast({
  variant: 'success',
  title: 'Round deleted',
  autoDismissMs: 6000,
  action: { label: 'Undo', onPress: () => restore.mutate(variables) },
});
```

- [ ] **Step 3: Verify build**

Run: `pnpm type-check && pnpm lint`
Expected: no errors.

- [ ] **Step 4: Commit**

```bash
git add src/hooks/rounds/mutations.ts
git commit -m "feat(rounds): soft-delete via RPC + restore + Undo toast + local cleanup"
```

---

### Task 9: Convert RoundList manual delete to the shared hook

**Files:**
- Modify: `src/screens/rounds/RoundListScreen/hooks/useRoundActions.ts` (delete mutation ~33-71)

- [ ] **Step 1: Replace the inline mutation with `useDeleteRound`**

Remove the manual `deleteRoundMutation` (the `round_players`/`scoring_pairs`/`scorecards`/`rounds` deletes) and use the shared hook. The RPC enforces ownership/organizer auth, so the `.eq('user_id', ...)` gate is no longer needed:
```typescript
import { useDeleteRound } from '@/hooks/rounds/mutations';
// ...
const { user } = useAuth();
const queryClient = useQueryClient();
const { dialogConfig, showAlert, dismissDialog } = useConfirmationDialog();
const deleteRoundMutation = useDeleteRound();
```
Update `handleConfirmDelete` to pass the input shape and keep the error alert:
```typescript
const handleConfirmDelete = useCallback(() => {
  if (roundToDelete) {
    deleteRoundMutation.mutate(
      { roundId: roundToDelete.id, competitionId: roundToDelete.competition?.id },
      {
        onError: () => showAlert('Error', 'Failed to delete round. Please try again.'),
      },
    );
    setDeleteDialogVisible(false);
    setRoundToDelete(null);
  }
}, [roundToDelete, deleteRoundMutation, showAlert]);
```
Keep `isDeleting: deleteRoundMutation.isPending`. Remove the now-unused `supabase`, `skinsKeys`, `prizePoolKeys` imports if nothing else uses them (let lint guide you).

- [ ] **Step 2: Verify build**

Run: `pnpm type-check && pnpm lint`
Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add src/screens/rounds/RoundListScreen/hooks/useRoundActions.ts
git commit -m "refactor(rounds): RoundList delete uses shared soft-delete hook"
```

---

### Task 10: Convert ScorecardEntry delete to the shared hook

**Files:**
- Modify: `src/screens/scoring/ScorecardEntryScreen/hooks/useScorecardSubmission.ts` (`performDelete` ~115-133)

> Note: `handleDeleteRound` from this hook may currently have no live consumer (flagged in investigation). Convert it anyway so the path is correct if/when wired; do not add new wiring.

- [ ] **Step 1: Replace the hard delete with the shared hook, keep session/store cleanup**

```typescript
import { useDeleteRound } from '@/hooks/rounds/mutations';
// inside the hook:
const deleteRoundMutation = useDeleteRound();

const performDelete = useCallback(async () => {
  try {
    await deleteRoundMutation.mutateAsync({ roundId });
    await activeRoundSession.clear();
    resetRound();
    navigation.goBack();
  } catch (error) {
    console.error('[ScorecardEntryScreen] Error deleting round:', error);
    showAlert('Error', 'Failed to delete round. Please try again.');
  }
}, [roundId, deleteRoundMutation, navigation, resetRound, showAlert]);
```
The shared hook now owns the Supabase RPC call and `deleteScorecardsByRound`, so remove the direct `supabase.from('rounds').delete()` and the `deleteScorecardsByRound` call here (drop those imports if unused). Keep `activeRoundSession.clear()` + `resetRound()` (UI/session concerns).

- [ ] **Step 2: Verify build**

Run: `pnpm type-check && pnpm lint`
Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add src/screens/scoring/ScorecardEntryScreen/hooks/useScorecardSubmission.ts
git commit -m "refactor(scoring): ScorecardEntry delete uses shared soft-delete hook"
```

---

## Phase 6 — Client: competition delete consolidation + Undo + copy

### Task 11: Competitions List uses the RPC + Undo

**Files:**
- Modify: `src/screens/competitions/hooks/useCompetitionsList.ts` (`handleConfirmDelete` ~359-390)

- [ ] **Step 1: Replace the inline `update({deleted_at})` with the RPC + Undo toast**

```typescript
import { useToast } from '@/context/ToastContext';
// ...
const { showToast } = useToast();

const handleConfirmDelete = useCallback(async () => {
  if (!competitionToDelete || !user?.id) return;
  const target = competitionToDelete;
  setIsDeleting(true);
  try {
    const { error } = await supabase.rpc('soft_delete_competition' as never, {
      p_competition_id: target.id,
    } as never);
    if (error) {
      console.error('Error deleting competition:', error);
      setIsDeleting(false);
      return;
    }
    setDeleteDialogVisible(false);
    setCompetitionToDelete(null);
    refetchMy();
    showToast({
      variant: 'success',
      title: 'Competition deleted',
      autoDismissMs: 6000,
      action: {
        label: 'Undo',
        onPress: async () => {
          const { error: restoreError } = await supabase.rpc('restore_competition' as never, {
            p_competition_id: target.id,
          } as never);
          if (restoreError) console.error('Error restoring competition:', restoreError);
          refetchMy();
        },
      },
    });
  } catch (err) {
    console.error('Error deleting competition:', err);
  } finally {
    setIsDeleting(false);
  }
}, [competitionToDelete, user?.id, refetchMy, showToast]);
```

- [ ] **Step 2: Verify build**

Run: `pnpm type-check && pnpm lint`
Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add src/screens/competitions/hooks/useCompetitionsList.ts
git commit -m "refactor(competitions): list delete uses soft_delete_competition RPC + Undo"
```

---

### Task 12: Competition Settings — Undo toast + honest copy

**Files:**
- Modify: `src/screens/competitions/CompetitionDetailScreen/hooks/useDeleteCompetition.ts`
- Modify: `src/screens/competitions/CompetitionSettingsScreen/index.tsx` (hint ~459-462, dialog ~466-477)

- [ ] **Step 1: Add an Undo toast to `useDeleteCompetition`**

After the successful RPC + invalidations (before `onDeleted()`), show the toast:
```typescript
import { useToast } from '@/context/ToastContext';
// inside the hook:
const { showToast } = useToast();
// in the success path, after invalidateQueries and before onDeleted():
showToast({
  variant: 'success',
  title: 'Competition deleted',
  autoDismissMs: 6000,
  action: {
    label: 'Undo',
    onPress: async () => {
      const { error: restoreError } = await supabase.rpc('restore_competition' as never, {
        p_competition_id: id,
      } as never);
      if (restoreError) console.error('Error restoring competition:', restoreError);
      queryClient.invalidateQueries({ queryKey: ['myCompetitions'] });
      queryClient.invalidateQueries({ queryKey: ['joinedCompetitions'] });
    },
  },
});
```
> Note: this screen calls `onDeleted()` → `navigation.popToTop()`, so the Undo toast appears over the destination screen (toast is global). That's fine.

- [ ] **Step 2: Fix the misleading copy**

In `CompetitionSettingsScreen/index.tsx`, replace the hint text (~459-462):
```tsx
<Text style={[styles.deleteHint, { color: colors.textSecondary }]}>
  The competition is hidden immediately and permanently removed after 90 days.
  You can undo straight after deleting.
</Text>
```
and the dialog `message` (~469):
```tsx
message="Delete this competition? It's hidden right away and permanently removed after 90 days. You can undo immediately after."
```

- [ ] **Step 3: Verify build**

Run: `pnpm type-check && pnpm lint`
Expected: no errors.

- [ ] **Step 4: Commit**

```bash
git add src/screens/competitions/CompetitionDetailScreen/hooks/useDeleteCompetition.ts src/screens/competitions/CompetitionSettingsScreen/index.tsx
git commit -m "feat(competitions): settings delete Undo toast + accurate copy"
```

---

## Phase 7 — Client: read-side filters (stats & lists respect deletion)

Each edit below is a **single filter addition**. For direct `from('rounds')` reads, add `.is('deleted_at', null)`. For nested embeds, add an embedded-resource filter on the alias used in the select (e.g. `rounds!inner(...)` → `.is('rounds.deleted_at', null)`; `round:rounds!inner(...)` → `.is('round.deleted_at', null)`). Re-run `pnpm type-check && pnpm lint` after each task.

### Task 13a: High-priority user-facing list/detail reads

**Files & exact edits:**
- [ ] `src/hooks/home/useUpcomingRounds.ts:98` — add `.is('deleted_at', null)` to the rounds query.
- [ ] `src/hooks/home/useInProgressRounds.ts:58` — add `.is('deleted_at', null)`.
- [ ] `src/screens/rounds/RoundListScreen/hooks/useRoundList.ts:127` — add `.is('deleted_at', null)` (owned standalone rounds list).
- [ ] `src/screens/rounds/RoundListScreen/hooks/useRoundList.ts:223` — embed: add `.is('round.deleted_at', null)` (rounds the user was added to; base table `round_players`, alias `round`).
- [ ] `src/hooks/rounds/queries.ts:83` (`fetchRoundDetails`) — add `.is('deleted_at', null)` (View Round detail).
- [ ] `src/hooks/rounds/leaderboard.ts:119` — add `.is('deleted_at', null)` (round leaderboard).
- [ ] `src/hooks/competitions/queries.ts:228` (competition detail rounds list) — add `.is('deleted_at', null)`.
- [ ] `src/components/competitions/CompetitionFirstRoundLine.tsx:46` — add `.is('deleted_at', null)`.
- [ ] `src/screens/competitions/CompetitionSettingsScreen/hooks/useCompetitionData.ts:55` — add `.is('deleted_at', null)`.

- [ ] **Verify:** `pnpm type-check && pnpm lint` → no errors.
- [ ] **Commit:** `git commit -am "fix(reads): exclude soft-deleted rounds from home/round/competition lists"`

### Task 13b: Statistics & handicap reads

**Files & exact edits** (all are scorecards→rounds embeds; add `.is('rounds.deleted_at', null)` unless the alias differs):
- [ ] `src/hooks/playerStatistics/queries.ts:105` — embed alias `rounds!inner` → `.is('rounds.deleted_at', null)`.
- [ ] `src/hooks/playerStatistics/queries.ts:550` — `.is('rounds.deleted_at', null)`.
- [ ] `src/hooks/playerStatistics/courseQueries.ts:67` — `.is('rounds.deleted_at', null)`.
- [ ] `src/hooks/competitionStatistics/queries.ts:114` — `.is('rounds.deleted_at', null)`.
- [ ] `src/hooks/competitionStatistics/queries.ts:90` (direct `from('rounds')`) — `.is('deleted_at', null)`.
- [ ] `src/hooks/player/handicapHistory.ts:104` — `.is('rounds.deleted_at', null)`.
- [ ] `src/hooks/player/handicapHistory.ts:159` — `.is('rounds.deleted_at', null)`.
- [ ] `src/services/handicap/loadCombinedAndPairs.ts:207` — `.is('rounds.deleted_at', null)`.
- [ ] `src/services/handicap/updatePlayerHandicapIndex.ts:42` — `.is('rounds.deleted_at', null)`.
- [ ] `src/hooks/friends/queries.ts:369` — embed alias `round:rounds!inner` → `.is('round.deleted_at', null)` (friend stats).

- [ ] **Verify:** `pnpm type-check && pnpm lint` → no errors.
- [ ] **Commit:** `git commit -am "fix(reads): exclude soft-deleted rounds from player/course/competition/handicap stats"`

### Task 13c: Subscription/limit counts, league tagging, per-club & per-comp counts

**Files & exact edits:**
- [ ] `src/screens/rounds/RoundListScreen/hooks/useRoundList.ts:60` — count via `rounds!inner` → `.is('rounds.deleted_at', null)`.
- [ ] `src/screens/subscription/useSubscriptionState.ts:243` — count via `rounds!inner` → `.is('rounds.deleted_at', null)`.
- [ ] `src/services/api/leagues/queries.ts:233` (`getEligibleScorecards`) — `.is('rounds.deleted_at', null)`.
- [ ] `src/screens/leagues/TagPartnershipRoundScreen.tsx:88` — `.is('rounds.deleted_at', null)`.
- [ ] `src/hooks/queries/usePerClubStats.ts:91` — embed `rounds(...)` from `shot_log` → `.is('rounds.deleted_at', null)`.
- [ ] Embedded `rounds:rounds(count)` badges — `src/screens/competitions/hooks/useCompetitionsList.ts:88` and `:151`, `src/services/subscription/grandfathering.ts:266` and `:406`: add an embedded count filter so soft-deleted rounds don't inflate the badge. Use the PostgREST embedded filter on the embed: `.is('rounds.deleted_at', null)`. **Verify in Task 14** that the count actually drops; if PostgREST does not filter an embedded aggregate this way, fall back to changing the embed to `rounds:rounds!inner(count)` — accept that competitions with zero live rounds then need a separate handling, or leave these four as a known minor cosmetic inflation (document the decision in the commit message).

- [ ] **Verify:** `pnpm type-check && pnpm lint` → no errors.
- [ ] **Commit:** `git commit -am "fix(reads): exclude soft-deleted rounds from limit counts, league tagging, club/comp counts"`

### Task 13d: Out-of-scope by-id reads (document only)

Single-round by-id reads inside active flows (scoring engine, finalization, sync, knockout regeneration, skins/wolf processors — items A5, A12–A23, A26–A42, B15, and scorecard-sync reads) are **not** filtered: a soft-deleted round is unreachable from those flows (you cannot navigate to score/finalize it), and several are write/processing paths. No code change.

- [ ] **Step 1:** Add a short comment block to the spec's "Out of scope" section confirming these by-id reads are intentionally unfiltered, then commit the doc: `git commit -am "docs: note by-id round reads intentionally unfiltered"`.

---

## Phase 8 — Verification

### Task 14: SQL verification script

**Files:**
- Create: `supabase/tests/soft_delete_verify.sql`

Model on the existing `supabase/tests/activity_feed_verify.sql`. Use a transaction that sets up fixtures, runs assertions via `DO $$ ... ASSERT ... $$`, and `ROLLBACK`s.

- [ ] **Step 1: Write the verify script** covering:
  - `soft_delete_round` as owner → round + scorecards have non-null `deleted_at`; `get_activity_feed` no longer returns it; player stats query (with the new `deleted_at` filter) excludes its scorecard.
  - `soft_delete_round` as a non-owner/non-organizer → raises SQLSTATE `42501`.
  - `restore_round` → `deleted_at` back to NULL on round + same-timestamp children.
  - Skins/Wolf: seed a completed skins game + payouts on a round; assert `skins_player_statistics` totals; `soft_delete_round` → totals drop; `restore_round` → totals return (idempotent recompute).
  - `soft_delete_competition` as organizer stamps the tree; as non-organizer raises `42501`; `restore_competition` reverses.
  - Back-dated `deleted_at` (NOW() - 91 days) + `purge_soft_deleted()` → round/competition rows gone (cascade), and a `< 90 day` row survives.
  - A round whose scorecard is referenced by a `partnership_rounds` row: `purge_soft_deleted()` succeeds (no FK error) and removes the `partnership_rounds` row via cascade.

- [ ] **Step 2: Run it**

Run: `psql "$LOCAL_DB_URL" -f supabase/tests/soft_delete_verify.sql`
Expected: all `ASSERT`s pass; final `ROLLBACK`; no `ERROR` except the intentional `42501` checks (which the script should catch via `EXCEPTION WHEN insufficient_privilege`).

- [ ] **Step 3: Commit**

```bash
git add supabase/tests/soft_delete_verify.sql
git commit -m "test(db): soft-delete/restore/purge verification script"
```

### Task 15: Device QA checklist (manual)

- [ ] Round delete from **RoundSettings**, **RoundList swipe/menu**, **ScorecardEntry** → round vanishes from lists; "Round deleted — Undo" toast appears; Undo restores it (reappears after refetch). Light + dark.
- [ ] Competition delete from **Settings** and **Competitions List** → vanishes; Undo restores. Copy reads as recoverable (no "cannot be undone").
- [ ] Player stats / handicap history / friend stats exclude a deleted round; skins/wolf lifetime totals drop after deleting a round with a completed side-game and return on Undo.
- [ ] Activity feed (home carousel + Activity tab) drops a friend's deleted round.
- [ ] Offline: delete a round, confirm it doesn't resurrect from local SQLite on next open.

---

## Self-Review notes (addressed)

- **Spec coverage:** Sections 1–6 of the spec map to Phases 1–8. RPC read filters (spec §5 "RPC-backed feeds") are Phase 3 (server-side) + Phase 7 (client). Orphaned storage cleanup (spec §current-state) is in Task 5. Misleading copy (spec §4) is Task 12.
- **Type consistency:** RPC names `soft_delete_round`, `restore_round`, `soft_delete_competition`, `restore_competition`, `recompute_skins_player_statistics`, `recompute_wolf_player_statistics`, `purge_soft_deleted` are used identically across DB and client tasks. Client param keys are `p_round_id` / `p_competition_id` throughout.
- **Known risk carried forward:** the embedded `rounds(count)` filter (Task 13c) has a PostgREST uncertainty — Task 14 verifies it and Task 13c documents the fallback.
