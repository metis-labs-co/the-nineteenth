# Soft Delete for Rounds & Competitions — Design

**Date:** 2026-05-25
**Author:** Sam (with Claude)
**Status:** Approved — ready for implementation planning

## Goal

Make deleting **rounds** and **competitions** safe, reversible, consistent, and
stats-correct. Today's behaviour is inconsistent (competitions are softly deleted
two different ways; rounds are hard-deleted four different ways) and stats do not
reliably reflect deletions. This work is a single "deletes are correct &
recoverable" pass.

## Decisions (locked)

| Decision | Choice |
|---|---|
| Scope | **Full correctness pass** — rounds → soft delete, unify competition delete, make stats respect deletion |
| Recovery UX | **Undo toast only** (no persistent "recently deleted" screen) |
| Retention | **Auto-purge** soft-deleted rows after a grace period |
| Grace period | **90 days** (hardcoded with a clear comment) |
| Mechanism | **Approach A** — stamp `deleted_at` only on entity-level tables; leaves filtered via parent and physically removed at purge; skins/wolf aggregates kept correct by idempotent recompute-from-source |

## Current-state summary (why this is needed)

- **Competitions are already soft-deleted, but inconsistently:**
  - Settings screen → `soft_delete_competition` RPC (stamps the tree).
  - Competitions List screen → shallow `update({deleted_at})` on the competition
    row only; children left live.
  - The Settings confirm dialog claims "permanently removed… cannot be undone"
    (false — it is a soft delete).
  - `soft_delete_competition` is `SECURITY DEFINER` with **no authorization
    check** — any authenticated user can call it on any competition ID.
- **Rounds are hard-deleted** via four divergent paths; `rounds.deleted_at`
  exists (migration `20250137000000_soft_delete_support`) but is unused.
- **Latent bug:** `partnership_rounds.scorecard_1_id / scorecard_2_id` have no
  `ON DELETE` clause, so hard-deleting a round whose scorecard was tagged into a
  partnership league fails with an opaque FK error.
- **Stats:**
  - Player stats & handicap history are computed live from `scorecards`, so a
    *hard* round delete self-corrects them — but the *soft* competition delete
    does **not**, because the stats queries never filter `deleted_at`.
  - `skins_player_statistics` / `wolf_player_statistics` are persisted
    aggregates incremented on game completion with **no reversal on delete** —
    deleted rounds/comps leave lifetime totals permanently inflated.
  - `round-photos` storage objects are orphaned after deletion.

## Approach A (chosen mechanism)

Stamp `deleted_at` only on tables that are **queried independently**: `rounds`,
`competitions`, `scorecards`, `pairings`, `competition_players`, `teams`,
`scoring_pairs` (all already have the column). Leaf tables (`skins_games`,
`wolf_games`, their results/payouts, `score_entries`, `knockout_matches`, prize
pools, `round_players`, etc.) get **no** `deleted_at`: they become invisible
because every query reaches them through a soft-deleted parent, and they are
physically removed by FK cascade at the 90-day purge.

Skins/Wolf persisted aggregates are kept correct by **recomputing the affected
players from source** (joining games → `rounds` and filtering
`rounds.deleted_at IS NULL`), which is idempotent and therefore works equally for
delete and undo.

Rejected alternatives: **B** (add `deleted_at` to every table — ~15 columns,
filter everywhere, pointless since leaves are only read via parents) and **C**
(separate tombstone table — fights the existing `deleted_at` convention).

---

## Design

### Section 1 — Database: RPCs (core)

All `SECURITY DEFINER`, each with an explicit `auth.uid()` authorization check
and `GRANT EXECUTE ... TO authenticated`.

- **`soft_delete_round(p_round_id UUID) RETURNS BOOLEAN`** *(new)*
  - Authorize: caller is `rounds.user_id = auth.uid()` **or** the parent
    competition's organizer.
  - Stamp a single shared `v_now` `deleted_at` on the round and its `scorecards`,
    `pairings`, `scoring_pairs`.
  - Recompute skins/wolf aggregates for affected players (Section 1 recompute
    fns).
- **`soft_delete_competition(p_competition_id UUID)`** *(fix existing)*
  - Add the missing organizer authorization check.
  - Keep the existing tree-stamp (scorecards, pairings, scoring_pairs, rounds,
    competition_players, teams, competition).
  - Add skins/wolf aggregate recompute for affected players.
- **`restore_round(p_round_id UUID)` / `restore_competition(p_competition_id UUID)`** *(new)*
  - Same authorization checks as their delete counterparts.
  - Reverse, **scoped precisely**: clear `deleted_at` only on child rows whose
    `deleted_at = <parent's deletion timestamp>`, so a child independently
    soft-deleted earlier is not accidentally un-deleted.
  - Recompute aggregates.
- **`recompute_skins_player_statistics(p_player_ids UUID[])` /
  `recompute_wolf_player_statistics(p_player_ids UUID[])`** *(new)*
  - Reset-then-rebuild the given players' aggregate rows from `status =
    'completed'` games whose parent round has `deleted_at IS NULL` (join games →
    rounds). Idempotent. Serves both delete and restore.
  - Note: the existing `backfill_skins_player_statistics()` /
    `backfill_wolf_player_statistics()` take no args, recompute *all* players, do
    not exclude soft-deleted rounds, and only accumulate — they are unsuitable as
    the per-delete recompute and are left as-is (one-time backfill tools).

### Section 2 — Database: purge + FK fix

- **`purge_soft_deleted() RETURNS INTEGER`** *(new)*
  - Hard-`DELETE` competitions and standalone rounds where
    `deleted_at < now() - interval '90 days'` (90 hardcoded, commented). Purging
    a competition cascades its rounds; standalone rounds purge on their own
    timestamp.
  - FK `ON DELETE CASCADE` performs all physical leaf cleanup.
  - Delete the purged rounds' `round-photos` objects from `storage.objects`
    (closes the orphaned-file gap).
  - Scheduled **daily via pg_cron** (project already uses pg_cron —
    `20250120000000_pg_cron_deactivate_competitions.sql`).
- **FK fix:** alter `partnership_rounds.scorecard_1_id` and `scorecard_2_id` to
  `ON DELETE CASCADE` (mirrors `league_rounds.scorecard_id`) so the purge's hard
  delete does not fail.

### Section 3 — Client: consolidate delete paths

- **Rounds:** route the three *user-facing* delete paths through one
  `useDeleteRound` → `soft_delete_round`:
  - `src/screens/rounds/RoundSettingsScreen.tsx` (already uses the shared hook).
  - `src/screens/rounds/RoundListScreen/hooks/useRoundActions.ts` (replace the
    manual multi-step delete).
  - `src/screens/scoring/ScorecardEntryScreen/hooks/useScorecardSubmission.ts`.
  - Move offline-SQLite scorecard cleanup (`deleteScorecardsByRound`,
    `activeRoundSession.clear`) **into the shared hook** so every path clears
    local cache consistently.
  - **Out of scope (stays hard delete):** Path D — creation rollback
    (`useStartSocialRound`, `useStartNewRound`) and knockout-bracket regeneration
    (`services/api/knockout.ts`). These clean up just-created/regenerated rows,
    not user deletions.
- **Competitions:** both Settings and List screens call `useDeleteCompetition` →
  `soft_delete_competition`. Remove the shallow inline `update({deleted_at})` in
  `src/screens/competitions/hooks/useCompetitionsList.ts`.
- **Undo:** new `useRestoreRound` / `useRestoreCompetition` hooks → restore RPCs;
  re-invalidate the same caches the delete hooks invalidate.

### Section 4 — Client: undo toast + honest copy

- Extend `ToastContext` and `SimpleToastCard` with an optional
  `action: { label: string; onPress: () => void }` rendered as a trailing button;
  use a longer auto-dismiss (~6s) when an action is present.
- On delete success: show "Round deleted — **Undo**" / "Competition deleted —
  **Undo**". Undo calls the restore hook and re-invalidates queries.
- Fix the misleading `CompetitionSettingsScreen` confirm copy ("permanently
  removed… cannot be undone") to reflect recoverable soft delete (e.g. "Removed
  after 90 days — you can undo this").

### Section 5 — Read side: stats & lists respect deletion

- Add `deleted_at IS NULL` filters where deleted rows currently leak into reads:
  - `src/hooks/playerStatistics/queries.ts` (scorecards reads).
  - `src/hooks/.../courseQueries.ts` scorecards read.
  - handicap-history read (`src/hooks/player/handicapHistory.ts`).
  - league-standings / `league_rounds` reads (via scorecard/round `deleted_at`).
- **Sweep round list/detail queries app-wide** to filter `rounds.deleted_at IS
  NULL`: activity feed, home, profile, RoundList, CompetitionDetail rounds.
  Competitions already filter in most list queries; rounds need this. This is the
  broadest mechanical piece — enumerate every `from('rounds')` read during
  planning.
- Skins/Wolf aggregates need no read-side change — kept correct by the Section 1
  recompute.

### Section 6 — Verification

- `supabase/tests/soft_delete_verify.sql` (matching the existing
  `activity_feed_verify.sql` pattern):
  - soft-delete round → absent from lists, excluded from stats, skins/wolf totals
    fall; restore → returns, totals restored.
  - soft-delete competition → same tree behaviour; restore reverses.
  - back-dated `deleted_at` row → `purge_soft_deleted()` hard-deletes with full
    cascade.
  - round tagged into a partnership league → delete/purge no longer errors.
  - authorization: a non-owner/non-organizer call to each RPC is rejected.
- Device QA checklist: undo toast at each delete entry point (RoundSettings,
  RoundList swipe/menu, ScorecardEntry, CompetitionSettings, Competitions List),
  light/dark, offline cache cleared.

## Migration housekeeping

- New migration files dated after `20260525000000` (e.g. `20260526000000_*`).
- Every new function gets `GRANT EXECUTE ... TO authenticated` (and
  `service_role` where appropriate) — per project rule that auto-grants end
  2026-10-30.
- Mind the dev (`uoqofjwtdgdzhpwfzklo`) vs prod (`bvnxfhuvocxyilhlenka`)
  migration drift noted in project memory; apply/verify on dev first.

## Out of scope

- Persistent "recently deleted" / archive UI (undo toast only).
- Soft-deleting leaf tables individually (Approach A handles them via parent).
- Path D internal hard-deletes (creation rollback, knockout regeneration).
- Reworking the live player-stats computation beyond adding `deleted_at` filters.
- **Single-round by-id reads inside active flows** (scoring engine, finalization,
  offline sync, knockout regeneration, skins/wolf processors). These are
  intentionally left unfiltered: a soft-deleted round is unreachable from those
  flows (you cannot navigate to score/finalize it), and several are write or
  processing paths. Filtering them would add noise without closing a real leak.

## Risks / notes

- The Section 5 read-side sweep is broad; a missed `from('rounds')` read would
  leak a deleted round into one surface. Planning must enumerate them
  exhaustively.
- Recompute scoping: ensure affected-player sets are captured **before** stamping
  `deleted_at` (so the recompute can find the games' players), or derive players
  via the soft-deleted games join — pick one explicitly in implementation.
- pg_cron schedule must be idempotent and safe to run when there is nothing to
  purge.

## Implementation follow-ups (discovered during build)

These were surfaced by code review during implementation and are deliberately
deferred — they are out of scope for this change but should be tracked:

1. **Physical round-photo file cleanup.** `purge_soft_deleted()` does NOT delete
   the physical blobs from the `round-photos` storage bucket. A raw
   `DELETE FROM storage.objects` only removes the metadata row (never the backing
   file) and would lose the reference needed to find the orphan later, so the SQL
   purge intentionally leaves `storage.objects` intact. Real cleanup needs a
   Storage-API job (an Edge Function, invokable via `pg_net`) that scans for
   `round-photos` objects with no matching `round_photos` row and removes both the
   file and the row through the Storage service. (Note: today's pre-existing
   behaviour already orphaned these files, so this is no regression.)

2. **Eclectic league best-scores not reversed on delete.** `eclectic_best_scores`
   is a persisted per-hole aggregate (same class as skins/wolf stats) populated
   for eclectic-format leagues. `soft_delete_round` / `soft_delete_competition`
   do NOT recompute it, so a deleted round's hole bests can persist in the
   eclectic leaderboard. A `recompute_eclectic_best_scores(league_id, player_id)`
   wired into the delete/restore RPCs would close this, mirroring the skins/wolf
   recompute pattern. Affects only eclectic leagues.

3. **Embedded-aggregate count filters need dev verification.** The competition
   round-count badges filter soft-deleted rounds via PostgREST embedded-aggregate
   filters (`rounds:rounds(count)` + `.is('rounds.deleted_at', null)`). The
   top-level form (My competitions, grandfathering) is standard; the **nested**
   form on the Joined-competitions query
   (`.is('competition.rounds.deleted_at', null)`) is the highest-risk and must be
   verified on dev — if PostgREST silently ignores it, the Joined badge count
   stays inflated. Each site carries a `// NOTE: ... verify on dev ...` comment.
   Fallback: fetch unfiltered and subtract soft-deleted client-side, or use an RPC.

4. **Live DB verification pending.** The local Supabase stack would not start
   cleanly in the build environment (seed/achievement step errored), so the SQL
   migrations were schema-verified and peer-reviewed but not applied to a running
   DB. Apply the `20260526*` migrations to the dev project and run
   `supabase/tests/soft_delete_verify.sql`, plus confirm the partnership_rounds
   FK `confdeltype = 'c'` (cascade) and the embedded-count behaviour in item 3.
