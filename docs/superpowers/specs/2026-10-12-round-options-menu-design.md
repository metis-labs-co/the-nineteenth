# Round Options Menu (score entry) — Design

**Date:** 2026-10-12 (rev 2, after code review)
**Status:** Awaiting written-spec review
**Branch:** `feat/round-options-menu`

## Goal

While scoring a social or practice (standalone) round, the round owner can
fix the round without leaving score entry: change holes (full / front 9 /
back 9), add or remove players, change tees, end the round early, or delete
it.

## Decisions

| # | Decision |
|---|---|
| D1 | Player editing = add and remove. Added players start with blank earlier holes; removing deletes their scorecard. No swap. |
| D2 | Player editing only for Stableford, Stroke Play and Par rounds with no Skins, Wolf, scoring pairs or multi-ball practice. Other rounds show the row locked with a reason. |
| D3 | New actions (Holes, Players, Delete) are round owner only (`rounds.user_id`). Change tees and End round early keep their existing permission rules. |
| D4 | Approach A: edits are online-only (End round early keeps working offline); other devices reconcile the roster. |
| D5 | Late joiners must back-fill: no special casing of earlier holes. End round early and submission stay blocked until every player has a score (or pickup) on the holes they require, and say why. |
| D6 | Delete syncs pending scores first and keeps the Undo toast. |
| D7 | Deferred to phase 2 (separate spec): per-round handicap overrides. Cut: Round name row (rename stays in Round Settings; the name isn't shown in score entry). |

## Scope

In: `ScorecardEntryScreen` for standalone rounds (`competitionId === 'standalone'`).

Out: competition rounds; `MatchPlayScoringScreen` / `TeamMatchPlayScoringScreen`
(unchanged); offline queuing of structural edits; swapping scores between
players; team or side-game roster editing; per-round handicaps; rename.

Naming note: `Scorecard.isStandalone` means "local-only card"
(`syncOrchestrator.ts`), not "non-competition round". This feature never
sets it.

## 1. Entry point and menu

`RoundHeader` gains an optional `onMorePress` prop. The ⋮ renders when
`onMorePress` is passed **or** when the existing
`canEndRoundEarly && onEndRoundEarlyPress` holds; `onMorePress` wins when
both are present.

`ScorecardEntryScreen` passes `onMorePress` only when the current user is the
round owner. Non-owners keep today's behaviour (⋮ opens End round early
directly), so nobody sees a one-row sheet.

New `RoundOptionsSheet` (`src/components/scorecard/RoundOptionsSheet/`): a
`BottomSheet` with icon + label rows in the `PhotoSourceMenu` row style.
Presentational; rows come from a pure `getRoundOptionsRows(input)`:

| Row | Locked when (reason shown) | Online only |
|---|---|---|
| Holes | hidden on ≤ 9-hole courses; locked when `holes_played` is set or a local end-early is pending ("Round has been ended") | yes |
| Players | format not stableford/stroke/par, or skins/wolf/scoring pairs/multi-ball ("Not available for this format"); `holes_played` set or end-early pending ("Round has been ended"); any card submitted ("Scores have been submitted") | yes |
| Change tees | existing `canChangeTees` rule | yes |
| End round early | existing `useEndRoundEarly` gate; when unavailable because a player is missing scores, show "Needs scores for <name> on holes 1–N" | no |
| Delete round | — | yes |

Online-only rows render disabled with "Needs a connection" when offline.
The header tee-name tap for Change tees stays.

## 2. Players

### Sheet

`RoundPlayersSheet` lists players (name, tee). Every row except the owner's
has a remove action. "Add player" opens a picker built on
`FriendSelectorBottomSheet`. Its host state (friends, search, placeholders,
Add Guest modal, auto-add of a just-created guest) currently lives in
`PartnersStep`; extract it into a reusable hook used by both. The picker
excludes current players and allows at most `preset max players − current
count` (Stableford/Stroke/Par standalone max is 4 in `roundPresets.ts`; read
it from the preset). New players use the round's default tee; change it
afterwards with Change tees.

### Server functions (one migration)

Both functions are SECURITY DEFINER with pinned `search_path`, take
`SELECT … FROM rounds WHERE id = p_round_id FOR UPDATE` (same locking as
`end_round_early`) and reject unless: caller is `rounds.user_id`; round is
standalone, not deleted, not completed; `holes_played IS NULL`; no scorecard
in the round is submitted.

- `add_round_player(p_round_id, p_player_id)`: rejects if the player is
  already in the round or the preset cap is reached; inserts `round_players`
  (`invitation_status = 'accepted'`, `added_by = auth.uid()`).
- `remove_round_player(p_round_id, p_player_id)`: rejects removing the
  owner; deletes by `(round_id, player_id)` from `score_entries`,
  `score_mismatches`, `score_submission_status`, `scorecards` (hard delete —
  `unique_scorecard_per_player_round` is a full constraint, so a soft-deleted
  card would block re-adding), then `round_players` (a surviving row would
  let any device re-insert the card). Single transaction.

Notification trigger `trigger_notify_round_player_invited`: today it says
"invited you to play" for every insert and does not skip placeholder
players. Change it so that an `accepted` insert on an in-progress round reads
"<owner> added you to a round at <course>", and placeholder players (no auth
user) never get a notification.

### Add (client)

Inside one `withRoundScoringWrite(roundId)` block (no `manualSync` inside —
it is non-reentrant):

1. `add_round_player` RPC.
2. `ensureTeamMemberScorecards([player])` (`initializeRoundSlice.ts`) —
   already idempotent, creates and persists the local card, calls
   `onLiveCardsReady`, appends to `groupScorecards` / `currentPlayers`. Reused
   as-is (it isn't team-specific despite the name).

Then `refetchPlayers()` (see §3) and broadcast `roster_changed` (§4). The
server scorecard row appears on the new card's first sync, as today.
`allowedPlayerIds` is derived from `playersToRender`, which must include the
new player.

### Remove (client)

1. Confirm: "Remove <name>? Their scores for this round will be deleted."
2. Inside one `withRoundScoringWrite(roundId)` block:
   - new `cancelPendingScorecardSync(scorecardId)` in
     `scorecardSyncDebounce.ts` (cancel that card's debounce timer only —
     `flushPendingScorecardSyncs` cancels every timer and must not be used);
   - remove that card's pending `scorecard` queue items;
   - `remove_round_player` RPC;
   - store action `removePlayerFromRound(playerId)`: `deleteScorecard` (local
     card + hole scores) under `withRoundPersistence`, remove from
     `groupScorecards` / `currentPlayers`.
3. `refetchPlayers()` and broadcast `roster_changed`.

If the RPC fails, nothing local changes (the cancelled debounce is re-armed by
re-queuing the card's current state).

## 3. Holes, tees, delete

### Holes

Reuse the `EditNineTypeSheet` mutation with these changes for live use:

- The "will hide scored holes" warning reads the live store, not
  `useRoundScorecards`.
- `useRoundData` exposes `refetchMetadata()` and `refetchPlayers()`
  (`useRoundMetadata` / `useRoundPlayers` state is internal today; only
  `retryFetch` is exposed). After saving: `refetchPlayers()` and
  `refetchMetadata()` complete **before** `resetRound()`, so re-init never
  runs with a stale `nineType` (second shape-mismatch reset) or a stale
  roster (which `initializeRound` would write over SQLite cards).
- Broadcast `roster_changed` so peers refetch.

Hidden-hole scores are kept (current behaviour); a brief spinner shows while
the scorecard re-initialises. Peers adopt the new shape through the existing
`round_shape_changed` handling. Add a test that a **nine_type-only** change
(no `holes_played`) is adopted by `repairWithinBoundary` /
`createRoundScoringContext`, since those were built for `holes_played`.

### Tees

Existing `ChangeTeesSheet`, unchanged.

### Delete

Reuse `useScorecardSubmission.handleDeleteRound` / `performDelete` (already
in score entry, currently unused).

1. Confirmation dialog. Fix the copy: it says "cannot be undone", which
   contradicts the Undo toast — use "Delete this round? You can undo for a
   few seconds afterwards."
2. Sync the round's pending scores first (cancel debounce timers by
   re-queuing their current state, then run the round's sync) with a 5 s
   timeout. If it doesn't finish, ask "Some scores haven't uploaded. Delete
   anyway?" — if yes, Undo will restore only what reached the server.
3. `useDeleteRound` (`soft_delete_round`). `deleteRound` already calls
   `deleteScorecardsByRound`; extend that to also remove `type: 'round'`
   queue items keyed by `data.id` (finalize / end-early intents), and run it
   under `withRoundPersistence`.
4. `activeRoundSession.clear()`, `resetRound()`, broadcast `round_deleted`,
   `navigation.goBack()`. The existing 6 s Undo toast stays.

## 4. Other devices

Realtime Postgres changes can't be used: on RLS tables DELETE payloads carry
only the primary key (no `round_id` filter), and a removed player loses
SELECT on `round_players` entirely.

### Triggers

New hook `useRoundRosterSync(roundId)`, mounted by `ScorecardEntryScreen` for
standalone rounds, refetches the roster when:

- a Broadcast message (`roster_changed` / `round_deleted`) arrives on channel
  `round:{roundId}` (the owner sends it after Add, Remove, Holes, Delete);
- the screen opens or regains focus while online;
- a scorecard upload for this round fails with RLS `42501` or a conflict with
  no live server row.

### Reconcile

Fetch: the round (`deleted_at`, `holes_played`, `nine_type`) and its
`round_players` rows, with the **same filter `useRoundPlayers` uses** (no
status filter — after start, standalone rows are all accepted).

Pure `reconcileRoster(serverState, storePlayers, currentUserId, ownerId)`
returns one of:

- `ignore` — fetch errored, or the list is empty, or it lacks the owner.
  Never apply removals from a doubtful read.
- `exit_removed` — the current user isn't in the list.
- `exit_deleted` — the round is deleted or not visible.
- `apply { added, removed }`.

Actions:

- `apply`: inside `withRoundScoringWrite`, for added players call
  `ensureTeamMemberScorecards`; for removed players cancel their debounce,
  drop their queued writes, `removePlayerFromRound`, and toast "<name> was
  removed from the round". This is a discard after a **confirmed** server
  read with the caller still a participant, so it doesn't break the
  "conflicts are never silently dropped" invariant (OFFLINE_ARCHITECTURE.md);
  both upload paths (queue and unsynced-SQLite fallback) are covered because
  the local card is deleted.
- `exit_removed` / `exit_deleted`: inside `withRoundScoringWrite`, clear this
  round's local cards and queue items, `activeRoundSession.clear()`,
  `resetRound()`, leave the screen, toast "You were removed from this round"
  / "This round was deleted".

Sequence guard: each reconcile records a sequence number at fetch time;
results from a fetch that started before the device's latest local roster
edit are dropped, so a slow fetch can't re-add a player the owner just
removed.

A participant who loses SELECT can't receive Broadcast on a private channel
either; the channel is public-by-round-id (no data in the payload beyond the
event name), and the upload-failure trigger is the backstop.

## 5. Errors

All online-only edits are server-first; on failure the store and SQLite are
untouched and a toast explains the failure. If the server add succeeds but
local card creation fails, the next reconcile creates it.

## 6. Testing

Scoring guardrails apply (CLAUDE.md): read
`docs/guides/SCORING_ARCHITECTURE.md`, run `scoring-impact-analyst` on
`src/store/initializeRoundSlice.ts`, `src/store/scorecardStore.ts` and
`src/hooks/scorecard/useRoundData.ts`, and add characterisation tests for
unprotected behaviour before changing it.

- Unit: `getRoundOptionsRows` matrix; `reconcileRoster` (incl. `ignore`
  cases, self-removed, deleted, sequence guard); `removePlayerFromRound`;
  `ensureTeamMemberScorecards` for a standalone add; `cancelPendingScorecardSync`;
  `deleteScorecardsByRound` removing `type: 'round'` items; nine_type-only
  shape adoption; End round early lock reason for a late joiner.
- SQL: `add_round_player` / `remove_round_player` permission and guard
  cases, cascade of `score_entries` / `score_mismatches` /
  `score_submission_status`, re-add after remove.
- Component: `RoundOptionsSheet`, `RoundPlayersSheet`, `RoundHeader` ⋮
  visibility.
- Run the scoring subset and `pnpm verify:gate`.
- Manual QA on two devices: add, remove (including removing the other
  device's user), holes change and delete while both are scoring; offline
  greys out rows; non-owner ⋮ still opens End round early.

## 7. Rollout

One migration: `add_round_player`, `remove_round_player`, notification
trigger change. Deploy to staging, then prod, before the client release
(no runtime probing for an un-migrated server).

## Phase 2 (separate spec)

Per-round handicap overrides. Review findings to carry forward: the override
must flow through `Player` → every `getBaseHandicap` caller
(`store/utils/scorecardCalculations.ts`, `roundScoringContext.ts`,
`playingHandicap.ts`, `ScrollableCells.tsx`, `usePlayerScorecard.ts`) and
both `'profile'` and `'calculated'` sources; a local SQLite column; the
resume refresh; a standalone-specific `round_players` select (the current one
is shared with competitions); only the editing device queues the write;
in-progress views outside score entry; a trigger so only the owner can set
it; and protecting real players' Social Handicap history (limit to guests and
the owner, or exclude overridden cards from differentials).
