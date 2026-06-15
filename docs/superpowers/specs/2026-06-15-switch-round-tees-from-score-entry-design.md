# Switch Round Tees from the Score Entry Screen — Design

**Date:** 2026-06-15
**Status:** Approved (pending spec review)

## Goal

Let the round owner / competition organizer change a player's tee while on the
hole-by-hole score-entry screen (`ScorecardEntryScreen`, route `Scorecard`),
with **live** recalculation of net / Stableford and **persistence** so the
change survives reload and final submission.

## Decisions (from brainstorming)

- **Scope:** per-player tees (not a single whole-round tee).
- **Connectivity:** online-only is acceptable. The persistence write needs a
  connection; the action is disabled (with a hint) when offline.
- **Permissions:** round owner / competition organizer only.

## Existing architecture this builds on

- **Score-entry screen:** `src/screens/scoring/ScorecardEntryScreen/index.tsx`.
  Knows `isStandaloneRound` (`competitionId === 'standalone'`), `currentPlayers`,
  and the scorecard store. Header is `src/components/scorecard/RoundHeader.tsx`,
  which already shows the selected tee colour dot but has no actions menu.
- **Tee model (two levels):**
  - Round default: `rounds.selected_tee` (JSONB `TeeBox`).
  - Per-player override:
    - Standalone → `round_players.selected_tee`.
    - Competition → `competition_round_player_tees.selected_tee`
      (organizer-gated table; written via
      `competitionPlayersService.upsertRoundPlayerTee`).
  - Resolution helper: `src/utils/teeResolution.ts` `resolvePlayerTee()`.
- **Scorecard store (`src/store/scorecardStore.ts`):** holds `selectedTeeData`
  and `playerTeeMap`. `getPlayerTee(playerId)` returns
  `playerTeeMap.get(id) ?? selectedTeeData`. Score updates recompute totals via
  `calculatePlayerTotals` (`src/store/utils/scorecardCalculations.ts`), which
  derives WHS daily handicap from the tee's slope/CR. `submitScorecards`
  snapshots `getPlayerTee(playerId)` into each scorecard's `teeData`, and sync
  recalculates from that snapshot.
- **Post-round tee correction (reference UI):**
  `src/components/rounds/ViewRound/EditTeesSheet.tsx` — per-player tee pills,
  saves via `useUpdatePlayerTee()` (`src/hooks/rounds/mutations.ts`) which writes
  `round_players.selected_tee` then calls `recalculateScorecardDifferential`.
  Used only from `RoundSettingsScreen` (post-round, owner/organizer-gated).
- **Auto tee origins:** `src/hooks/useApplyAutoTeeOverrides.ts` already re-runs
  when the selected tee identity changes mid-round (keyed on tee id/colour), so
  updating the store tee also refreshes per-hole GPS distance origins.

## Constraints uncovered during exploration

1. **RLS on `round_players` (UPDATE):** the only UPDATE policy is
   `player_id = auth.uid()` (migration `20260612000000_scheduled_rounds.sql`).
   There is **no owner-can-update-participants** policy, so an owner editing
   *another* player's tee on a standalone round is silently a no-op today
   (Postgres RLS skips non-matching rows without erroring). This design adds a
   migration to fix it.
2. **Competition recalc gap:** `recalculateScorecardDifferential`
   (`src/services/handicap/recalculateScorecardDifferential.ts`) reads the
   per-player override **only from `round_players`**, never
   `competition_round_player_tees`. For the mid-round case this is harmless
   because the final scorecard is rebuilt from the store's tee snapshot at
   submit. Flagged as a known limitation; out of scope to fix here.
3. **Synthetic scorecard IDs in the store:** `initializeRoundSlice` builds
   scorecards with synthetic ids (`scorecard-{roundId}-{playerId}`), not server
   UUIDs. Server recalc needs the real `scorecards.id`, so the persistence
   mutation must look up the real scorecard (via `useRoundScorecards`) rather
   than use store ids.

## Approach

### 1. Entry point — header action (owner/organizer only)

- Add `useRoundDetails(roundId)` and `useCompetitionInfo(competitionId)` to
  `ScorecardEntryScreen` (lightweight, cached) and compute:

  ```
  canEditTees = isSuperAdmin
    || (isStandaloneRound && round?.user_id === user.id)
    || (!isStandaloneRound && competitionInfo?.organizer_id === user.id)
  ```

- Pass `canEditTees` + an `onChangeTeesPress` handler into `RoundHeader`. When
  true, render a `golf-tee` (or `cog`) icon in `renderRightContent()` that opens
  the sheet. The icon is **disabled with a hint toast** when `!isOnline`.

### 2. UI — `ChangeTeesSheet` (new) + shared `PlayerTeeRow`

- Extract the per-player tee-pill row currently inlined in `EditTeesSheet` into a
  shared presentational component `PlayerTeeRow`
  (`src/components/common/PlayerTeeRow/` or alongside `TeeSelector`):
  props `{ playerName, availableTees, selectedTee, onPick(tee), disabled }`.
- Refactor `EditTeesSheet` to render `PlayerTeeRow` (no behavioural change to the
  post-round path).
- New `ChangeTeesSheet` in `src/components/scorecard/` driven by the **store**:
  - Players from `currentPlayers` (real player ids).
  - Current effective tee per player from `getPlayerTee(playerId)`.
  - `availableTees` from `courseTees` (already on screen via `useRoundData`).
  - Local selection state; `Save` enabled only when something changed.
  - On save, for each changed player it calls the save handler (below) and, on
    success, the store action `setPlayerTee`.
- Wrap the sheet content per the modal-surface rule
  (`SystemModalTheme` is applied by `BottomSheet`; confirm the existing
  `BottomSheet` already handles solid surfaces — `EditTeesSheet` uses it).

### 3. Live store update — `setPlayerTee(playerId, tee)`

Add to `scorecardStore` (and a slice if appropriate):

- Set `playerTeeMap` = clone with `playerId -> tee`.
- Recompute that player's totals for already-entered holes via
  `calculatePlayerTotals(scorecard, holes, gameType, { selectedTee: tee, handicapSource })`
  and write back `totalGross / totalNet / total_par_score`.
- Persist the updated scorecard to SQLite (mirror the persistence used by
  score updates).
- Net effect: header tee dot, per-player net/Stableford, GPS auto-tee origins
  (via `useApplyAutoTeeOverrides` re-run), and the submit snapshot all reflect
  the new tee immediately.

### 4. Persistence mutation — `useSwitchPlayerTee`

New mutation hook (in `src/hooks/rounds/mutations.ts`) taking
`{ roundId, competitionId?, playerId, tee }`:

- **Standalone** → update `round_players.selected_tee` for `(round_id, player_id)`.
- **Competition** → `upsertRoundPlayerTee(roundId, playerId, tee)`
  (`competition_round_player_tees`).
- **Recalc (best-effort):** look up the player's real scorecard for the round
  (via the cached `useRoundScorecards` data or a direct query); if one exists
  with `total_gross > 0`, call `recalculateScorecardDifferential(scorecardId)`.
  Otherwise skip — mid-round with no completed scorecard has nothing to recalc,
  and the store snapshot drives the eventual submit.
- Invalidate `roundKeys.detail`, `scorecardKeys.list({ roundId })`,
  `leaderboardKeys.round(roundId)` (and competition leaderboard when applicable),
  matching `useUpdatePlayerTee`.

`ChangeTeesSheet` calls this hook per changed player, then `setPlayerTee` on
success. On error, surface a toast and leave the store unchanged for that player.

### 5. RLS migration — owner can update `round_players`

New migration adding an owner UPDATE policy on `round_players`, keeping the
existing self-update policy:

```sql
CREATE POLICY "Round owners can update their round_players"
  ON round_players FOR UPDATE
  USING (
    EXISTS (SELECT 1 FROM rounds r
            WHERE r.id = round_players.round_id AND r.user_id = auth.uid())
  )
  WITH CHECK (
    EXISTS (SELECT 1 FROM rounds r
            WHERE r.id = round_players.round_id AND r.user_id = auth.uid())
  );
```

Mirror the existing `rounds` owner-update pattern. (Deployment to staging/prod
is handled separately — migrations are not auto-applied.)

## Data flow (save)

```
ChangeTeesSheet.save
  ├─ for each changed (playerId, tee):
  │    ├─ useSwitchPlayerTee.mutateAsync({roundId, competitionId, playerId, tee})
  │    │     ├─ standalone:   UPDATE round_players.selected_tee   (owner RLS)
  │    │     └─ competition:  upsert competition_round_player_tees
  │    │     └─ if scorecard gross>0: recalculateScorecardDifferential
  │    └─ on success: store.setPlayerTee(playerId, tee)
  │           ├─ update playerTeeMap
  │           ├─ recompute that player's totals (live net/Stableford)
  │           └─ persist scorecard to SQLite
  └─ close sheet
        └─ RoundHeader tee dot + GPS auto-tee origins refresh from store
```

## Error handling

- Offline: action disabled with a hint; no write attempted.
- Mutation failure (RLS, network): toast; that player's store tee is left
  unchanged so live state stays consistent with the DB.
- Course has no tees: sheet shows the existing empty state (as `EditTeesSheet`
  does today).

## Testing

- **Unit — store:** `setPlayerTee` updates `playerTeeMap` and recomputes totals
  (Stableford points change when slope/CR change); SQLite persist called.
- **Unit — mutation:** branches standalone (`round_players`) vs competition
  (`competition_round_player_tees`); recalc invoked only when gross > 0.
- **Unit — permissions:** `canEditTees` true only for super admin / owner /
  organizer.
- **Manual:** switch a player's tee mid-round → net/Stableford and header dot
  update immediately; kill & reopen the round → persisted tee is reflected;
  submit → scorecard snapshots the new tee. Verify offline disables the action.

## Out of scope (YAGNI)

- Whole-round bulk tee change (per-player only).
- Offline queueing of the tee change.
- Fixing the competition server-side recalc to read
  `competition_round_player_tees` (flagged limitation).
- Changing the round default tee (`rounds.selected_tee`).

## Files touched (anticipated)

- `src/components/scorecard/RoundHeader.tsx` — add gated action icon.
- `src/components/scorecard/ChangeTeesSheet/` — new sheet.
- `src/components/common/PlayerTeeRow/` — extracted shared row.
- `src/components/rounds/ViewRound/EditTeesSheet.tsx` — use `PlayerTeeRow`.
- `src/screens/scoring/ScorecardEntryScreen/index.tsx` — wiring + permission gate.
- `src/store/scorecardStore.ts` (+ slice) — `setPlayerTee`.
- `src/hooks/rounds/mutations.ts` — `useSwitchPlayerTee`.
- `supabase/migrations/<ts>_round_players_owner_update.sql` — RLS policy.
