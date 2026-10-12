# Round Options Menu (score entry) — Design

**Date:** 2026-10-12
**Status:** Approved in conversation, awaiting written-spec review
**Branch:** `feat/round-options-menu`

## Goal

While scoring a social or practice (standalone) round, the round owner can
fix the round without leaving score entry: change holes (full / front 9 /
back 9), add or remove players, set a player's handicap for this round,
change tees, rename the round, end it early, or delete it.

## Decisions (from brainstorming)

| # | Decision |
|---|---|
| D1 | Player editing = add and remove. Added players start with blank earlier holes; removing deletes their scorecard. No swap. |
| D2 | Player and handicap editing only for Stableford, Stroke Play and Par rounds with no Skins, Wolf, scoring pairs or multi-ball practice. Other rounds show the rows locked with a reason. |
| D3 | Round owner only (`rounds.user_id`). End round early keeps its current rule (owner or participant). |
| D4 | Menu also includes Change tees, End round early, Round name, Per-player handicap. |
| D5 | Approach A: edits are online-only (except End round early, which already works offline); other devices reconcile the roster live. |

## Scope

In: `ScorecardEntryScreen` for standalone rounds.

Out: competition rounds; `MatchPlayScoringScreen` and
`TeamMatchPlayScoringScreen` (their ⋮ keeps opening End round early
directly); offline queuing of structural edits; swapping a player's scores to
another player; team/side-game roster editing.

## 1. Entry point and menu

`RoundHeader` gains an optional `onMorePress` prop. When provided, the ⋮
opens it; otherwise the ⋮ keeps its current End-round-early behaviour. Only
`ScorecardEntryScreen` passes `onMorePress`, and only for standalone rounds.

New `RoundOptionsSheet` (`src/components/scorecard/RoundOptionsSheet/`),
a `BottomSheet` with icon + label rows, following the `PhotoSourceMenu`
row pattern. Presentational: it receives a row model and callbacks.

Row model is computed by a pure function `getRoundOptionsRows(input)` so the
visibility matrix is unit-testable:

| Row | Visible to | Locked when | Online only |
|---|---|---|---|
| Holes | owner | hidden if course has ≤ 9 holes; locked if `holes_played` set (ended early) | yes |
| Players | owner | format not stableford/stroke/par, or skins/wolf/scoring pairs on, or multi-ball | yes |
| Handicaps | owner | same as Players; hidden when `handicap_source = 'none'` or the `handicap_override` column is unavailable | yes |
| Change tees | owner | existing rules | yes |
| Round name | owner | — | yes |
| End round early | owner + participants | existing `useEndRoundEarly` gate | no |
| Delete round | owner | — | yes |

- Non-owners see only End round early.
- Online-only rows render disabled with the caption "Needs a connection"
  when offline.
- Locked rows render disabled with a one-line reason
  (e.g. "Not available with Skins or Wolf").
- The header tee-name tap for Change tees stays.

## 2. Players

`RoundPlayersSheet`: lists players (name, tee, round handicap). Every row
except the owner shows a remove action. "Add player" opens the existing
`FriendSelectorBottomSheet` (friends + Create Guest). Max 4 players.

### Add

1. Online check, then inside `withRoundScoringWrite(roundId)`:
   insert `round_players` (`invitation_status = 'accepted'`,
   `added_by = owner`, `selected_tee = null` → round default tee).
2. Store action `addPlayerToRound(player)` — generalised from
   `ensureTeamMemberScorecards` (`src/store/initializeRoundSlice.ts`):
   build the local card (`scorecard-${roundId}-${playerId}`), persist under
   `withRoundPersistence`, call `onLiveCardsReady`, append to
   `groupScorecards` and `currentPlayers`. `ensureTeamMemberScorecards` is
   refactored to call the same helper.
3. The server scorecard row is created on first sync by
   `write_scorecard_snapshot`, as today.
4. `allowedPlayerIds` (derived from `playersToRender`) includes the new
   player.

Notification: `trigger_notify_round_player_invited` fires on insert. Check
its copy; when the inserted row is `accepted` on an in-progress round, the
notification must read as "<owner> added you to a round at <course>", not
an invite. Guests have no user, so no notification.

### Remove

1. Confirm: "Remove <name>? Their scores for this round will be deleted."
2. Flush debounced writes (`flushPendingScorecardSyncs`) and drop that
   player's pending `scorecard` queue items.
3. New RPC `remove_round_player(p_round_id uuid, p_player_id uuid)`:
   - caller must be `rounds.user_id`; round must be standalone and not
     completed; player must not be the owner; player's card must not be
     submitted;
   - hard-deletes the player's `scorecards` row and dependent
     `score_entries`; deletes the `round_players` row; one transaction.
   - Hard delete is required: `unique_scorecard_per_player_round` is a full
     constraint, so a soft-deleted card would block re-adding; and a
     surviving `round_players` row would let any device re-insert the card.
4. Store action `removePlayerFromRound(playerId)`: delete local SQLite card
   + hole scores under `withRoundPersistence`, remove from
   `groupScorecards` / `currentPlayers`.

Guards: owner cannot be removed; at least one player remains; players with
a submitted card cannot be removed. Derived checks (scores-every-player,
submission readiness, end-early plan) recompute from the store.

## 3. Handicaps, holes, name, tees, delete

### Per-round handicap

- Migration: `round_players.handicap_override numeric(3,1) NULL`,
  `CHECK (handicap_override BETWEEN -5 AND 54)`. Owner UPDATE policy
  already exists.
- Single rule: `getBaseHandicap` (`src/utils/scorecardCalculations.ts`)
  returns the override when set, else current behaviour (profile /
  calculated). With `handicap_source = 'none'` it stays 0.
- Initialisation and the resume refresh in `initializeRoundSlice`
  (live-profile handicap overwrite for unsubmitted cards) apply the
  override on top, so edits survive app restarts.
- Store action `setPlayerHandicap(playerId, value | null)`, modelled on
  `setPlayerTee`: update `card.player.handicap`, recompute totals across all
  holes, persist, and queue the normal scorecard write.
- Submission snapshot (`ga_handicap_used` / `daily_handicap_used`) uses the
  effective handicap (it already reads `card.player.handicap`).
- UI: `RoundHandicapsSheet` lists players; tapping one opens the existing
  `HandicapEditSheet` (−5..54, one decimal) plus "Use profile handicap",
  which clears the override.
- Write order: server `round_players` update first, then
  `setPlayerHandicap`.

### Holes

Reuse `EditNineTypeSheet` logic with two changes for live use:

- The "will hide scored holes" warning reads the live store, not
  `useRoundScorecards`.
- On success, also call `metadata.refetch()` (from `useRoundMetadata`) so
  re-init doesn't use the stale `nineType` and trigger a second
  shape-mismatch reset.

Hidden-hole scores are kept (current behaviour). The scorecard shows a
spinner briefly while it re-initialises. Other devices adopt the new shape
through the existing `shape_changed` handling on sync.

### Round name

Reuse `EditRoundNameSheet` unchanged; the header title refreshes from the
invalidated `roundKeys.detail`.

### Tees

Existing `ChangeTeesSheet`, unchanged.

### Delete

1. Confirmation dialog (existing delete copy).
2. `flushPendingScorecardSyncs()`.
3. `soft_delete_round` via `useDeleteRound`.
4. On success: `activeRoundSession.clear()`, `resetRound()`, local cleanup
   via `deleteScorecardsByRound`, extended to also remove `type: 'round'`
   queue items keyed by `data.id`.
5. `navigation.goBack()`. The existing 6-second Undo toast stays.

## 4. Other devices, errors, testing, rollout

### Roster reconcile

New hook `useRoundRosterSync(roundId)` mounted by `ScorecardEntryScreen`
for standalone rounds:

- Triggers: realtime changes on `round_players` filtered by `round_id`
  (migration adds `round_players` to the `supabase_realtime` publication;
  existing SELECT RLS limits visibility), plus screen open/focus while
  online.
- Fetch accepted `round_players` (incl. `handicap_override`), diff against
  the store:
  - added → `addPlayerToRound`;
  - removed → drop that player's queued writes, `removePlayerFromRound`,
    toast "<name> was removed from the round";
  - override changed → `setPlayerHandicap`.
- Pure diff function `diffRoundRoster(serverRows, storePlayers)` for unit
  tests.

Sync safety net: in `syncOrchestrator`, a scorecard write that fails
(RLS 42501, or conflict with no live row) for a player no longer in
`round_players` is discarded instead of kept as a failed item, so the
"changes not uploaded" banner doesn't appear for removed players.

### Error handling

All online-only edits are server-first; on failure the store and SQLite are
untouched and a toast explains the failure. If the server add succeeds but
local card creation fails, the next roster reconcile creates it.

### Testing

Scoring guardrails apply (CLAUDE.md): read
`docs/guides/SCORING_ARCHITECTURE.md`, run `scoring-impact-analyst` on
`src/utils/scorecardCalculations.ts`, `src/store/initializeRoundSlice.ts`
and `src/store/scorecardStore.ts`, and add characterisation tests for any
unprotected behaviour before changing it.

- Unit: `getBaseHandicap` override; resume refresh respects override;
  `addPlayerToRound` / `removePlayerFromRound` / `setPlayerHandicap`;
  `diffRoundRoster`; `getRoundOptionsRows` matrix; sync safety net.
- Component: `RoundOptionsSheet`, `RoundPlayersSheet`,
  `RoundHandicapsSheet`.
- Run the scoring subset and `pnpm verify:gate`.
- Manual QA on two devices: add, remove, handicap edit, holes change and
  delete while both are scoring; offline greys out rows; non-owner sees only
  End round early.

### Rollout

One migration: `handicap_override` column, `remove_round_player` RPC,
`round_players` realtime publication, notification copy if needed. Deploy to
staging, then prod, before the client release. The client hides Handicaps
when the column is unavailable and Players' remove when the RPC is missing,
so an OTA on an un-migrated server degrades rather than breaks.
