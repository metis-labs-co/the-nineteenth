# Organiser Force-Submit (with DNF) + Re-open for Competition Rounds

**Date:** 2026-06-29
**Branch:** `feat/organiser-force-submit-round`
**Status:** Approved design — ready for implementation plan

## Problem

Today a competition round can only transition to `completed` when **every** player's
scorecard is terminal (`completed`/`confirmed`). The gate lives in
`finalizeRoundStatus()`. If a player abandons mid-round or never submits, the round is
stuck `in-progress`, the leaderboard never finalizes, and there is no organiser override.

Organisers need to **submit a round now**, regardless of scores, even when some players
have incomplete rounds — and to **undo** that if a player later finishes.

## Goals

1. An **organiser** (`competition.organizer_id === user.id`, or super admin) can
   force-submit a competition round while it is `in-progress`, even with incomplete cards.
2. Players whose scorecards are not `completed`/`confirmed` at submit time are **DNF**:
   - their partial scores are preserved untouched,
   - they receive **no competition position and no points**,
   - they appear in a separate "Did Not Finish" section on the final leaderboard.
3. The action is **reversible**: the organiser can **re-open** a completed round
   (status → `in-progress`); a DNF player can then finish and be brought back into the
   standings via normal submission / "recalculate results".

## Non-goals (v1)

- No new DNF/withdrawn database column or migration. DNF is **implicit** (a roster player
  with no result row). (Approach A — chosen.)
- Full sub-match handling for split match-play / alt-shot rounds. Those already have a
  per-sub-match **forfeit** flow that lets them complete; v1 relies on that rather than
  duplicating sub-match logic. The force-submit action is guarded so it behaves sensibly
  (or is hidden) on split rounds.
- No change to the normal player-submission auto-gate (`finalizeRoundStatus` stays as-is,
  so ordinary submissions still cannot finalize early).

## Key codebase facts (verified)

- **DNF is mostly free already.** `refinalizeRoundResults(roundId)` only reads scorecards
  with `status='completed'`, so incomplete players are already excluded from computed
  results. The only thing blocking a force-submit is the gate in `finalizeRoundStatus()`.
- **No re-open mechanism exists.** `rounds.status` is effectively write-once to
  `completed`. Re-open (`completed → in-progress`) is a new capability.
- **Permissions need no migration.** RLS policy `"Users can update rounds"`
  (`20260327000000_fix_standalone_round_visibility_and_notifications.sql`) already allows
  `UPDATE` on `rounds` (incl. `status`) when
  `competition_id IS NOT NULL AND competitions.organizer_id = auth.uid()`.
- **Competition status auto-cascades.** Trigger
  `trigger_sync_competition_status_on_round_update`
  (`20260119000000_sync_competition_status.sql`, `AFTER UPDATE OF status ON rounds`)
  re-derives `competitions.status` from its rounds. Force-submit may auto-complete the
  competition; re-open auto-reverts it to `in-progress`. No extra code needed.
- **Status values** (`src/types/database/enums.ts`): `RoundStatus = 'upcoming' |
  'in-progress' | 'completed'`. `ScorecardStatus = 'not-started' | 'in-progress' |
  'completed' | 'confirmed'`. Terminal scorecard states = `completed`/`confirmed`.
- **Round results writes** (`roundResultsService.saveRoundResults`) delete-then-insert by
  `is_team_result` flag — no upsert. Re-finalize after re-open naturally re-adds a
  previously-DNF player's row once their card is `completed`.

## Architecture

### 1. Service layer — `src/services/rounds/`

- **`forceFinalizeRound(roundId): Promise<void>`** (new file
  `forceFinalizeRound.ts`).
  - Guard: count scorecards with `status IN ('completed','confirmed')` for the round;
    if **zero**, throw a typed error (`NoCompletedScorecardsError` or similar) — there is
    nothing meaningful to finalize. Surface as a clear message in the UI.
  - Directly `UPDATE rounds SET status='completed' WHERE id=roundId` (bypassing the
    all-terminal gate). Mirror the existing direct-update pattern in
    `finalizeRoundStatus.ts` (select back `id, status`).
  - Call `refinalizeRoundResults(roundId)` — DNF players are excluded automatically.
- **`reopenRound(roundId): Promise<void>`** (new file `reopenRound.ts`).
  - `UPDATE rounds SET status='in-progress' WHERE id=roundId`. The status-sync trigger
    cascades the competition status back to `in-progress`.
  - Does **not** delete `round_results`; they are harmlessly replaced on the next
    finalize/recalculate.
- `finalizeRoundStatus()` is left untouched.

### 2. Hooks — `src/hooks/rounds/mutations.ts`

- **`useForceFinalizeRound()`** — wraps `forceFinalizeRound`; on success invalidates the
  round query, round leaderboard, round players, and parent competition queries
  (match the invalidation set used by `useRecalculateRoundResults`).
- **`useReopenRound()`** — wraps `reopenRound`; same invalidation set.
- Organiser gating is enforced server-side by RLS; the UI additionally hides the actions
  from non-organisers.

### 3. Leaderboard "Did Not Finish" section

- Extend `fetchRoundLeaderboard` (`src/hooks/rounds/leaderboard.ts`):
  - Also fetch the round roster (reuse the `round_players` / pairings logic already used
    by `useRoundPlayers`).
  - Compute `dnfEntries` = roster players who have **no individual result row** and are
    **not** covered by a team result row.
  - Add `dnfEntries` to the returned data object (and the hook's types).
- Render a **"Did Not Finish"** section in
  `src/components/leaderboard/RoundLeaderboard.tsx`, below the standings tables:
  - List name + optional holes-played count; **no** position/points.
  - Only render when `round.status === 'completed'` and `dnfEntries.length > 0`, so the
    live in-progress board is unaffected.
  - Theme via `useThemeColors()`; static tokens imported directly.

### 4. UI entry points (both) + confirmation

Organiser-only, status-gated actions in **two** places:

- **Round card / RoundsTab** (`src/components/competitions/detail/CompetitionRoundCard.tsx`
  / `RoundsTab.tsx`) — organiser-only action (overflow/menu or button):
  - `status === 'in-progress'` → **"Submit round now"**.
  - `status === 'completed'` → **"Re-open round"**.
- **RoundSettingsScreen** (`src/screens/rounds/RoundSettingsScreen.tsx`) — same two
  actions in an organiser section, reusing the existing `isOrganizer` memo.

Shared confirmation UI:

- **`ForceSubmitRoundDialog`** (new component): lists the incomplete players who **will be
  marked DNF** (name + holes played), warns that they get no position/points, and requires
  explicit confirm. Wrap in `<SystemModalTheme>` if presented as a modal/sheet per the
  styling rules.
- Re-open uses a simple confirm dialog (e.g. `Alert.alert` or the existing confirm
  pattern) explaining the round will return to in-progress.

### 5. Split / sub-match rounds (scope guard)

For rounds with `sub_matches` (split match-play / alt-shot), the existing per-sub-match
forfeit flow is the supported path to completion. The "Submit round now" action is hidden
(or disabled with a hint pointing to forfeit) for split rounds in v1.

## Data flow

Force-submit:
1. Organiser taps "Submit round now" → `ForceSubmitRoundDialog` shows incomplete players.
2. Confirm → `useForceFinalizeRound()` → `forceFinalizeRound(roundId)`:
   guard ≥1 completed card → set `rounds.status='completed'` → `refinalizeRoundResults`.
3. Status trigger may complete the competition.
4. Queries invalidated → leaderboard shows finishers + a DNF section.

Re-open:
1. Organiser taps "Re-open round" on a completed round → confirm.
2. `useReopenRound()` → `reopenRound(roundId)` sets `status='in-progress'`; trigger reverts
   competition status.
3. DNF player finishes; normal submission or `useRecalculateRoundResults` re-finalizes and
   their row returns to the standings.

## Error handling

- `forceFinalizeRound` throws a typed error when no completed scorecards exist; the dialog
  surfaces a friendly message ("At least one player must have a completed scorecard").
- RLS rejects non-organisers server-side (defence in depth); UI already hides the actions.
- Re-finalize errors are logged/swallowed by `refinalizeRoundResults` as today (won't crash
  the flow), but the mutation still invalidates queries so the UI reflects the new status.

## Testing

- **Unit (services):**
  - `forceFinalizeRound` sets status `completed` and calls `refinalizeRoundResults`.
  - `forceFinalizeRound` throws when zero completed/confirmed scorecards exist.
  - `reopenRound` sets status `in-progress`.
- **Unit (leaderboard):** `dnfEntries` = roster − (individual results ∪ team-covered
  players); empty when all finished.
- **Component:** `ForceSubmitRoundDialog` lists the correct incomplete players; force-submit
  and re-open actions render only for organisers and only for the matching status; hidden
  for split rounds.

## Files touched (anticipated)

- `src/services/rounds/forceFinalizeRound.ts` (new)
- `src/services/rounds/reopenRound.ts` (new)
- `src/hooks/rounds/mutations.ts` (add two hooks)
- `src/hooks/rounds/leaderboard.ts` (add `dnfEntries`)
- `src/components/leaderboard/RoundLeaderboard.tsx` (DNF section)
- `src/components/competitions/detail/CompetitionRoundCard.tsx` / `RoundsTab.tsx` (actions)
- `src/screens/rounds/RoundSettingsScreen.tsx` (actions)
- `src/components/.../ForceSubmitRoundDialog.tsx` (new)
- Tests alongside the above.

## Out-of-scope follow-ups

- Explicit DNF status column (Approach B) if a queryable DNF state is later needed.
- Full force-complete handling for split/sub-match rounds beyond the existing forfeit flow.
