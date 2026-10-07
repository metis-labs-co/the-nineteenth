# Social Round Multi-Scorer — Design

**Date:** 2026-10-07
**Status:** Approved in conversation; awaiting written-spec review
**Supersedes:** branch `worktree-live-multi-scorer-rounds` (built 2026-06-15/16, never merged). Its reconciler and conflicts UI are not used.

## 1. Goal

In a **social round**, anyone in the round can score anyone, at any time, from their own phone.

> I score 9 holes, then my phone runs out of battery. My friend opens the round and completes the scoring for both of us.

**Success looks like this:**
- No hole is ever lost, whatever order the phones sync in.
- Every phone converges on the same card, live, within seconds while online.
- Social rounds never show the "changed on another device" banner.
- Behaviour is unchanged for scoring-pairs, handicap and competition rounds.

## 2. Decisions (from the owner)

| # | Decision |
|---|---|
| D1 | **Scope: social rounds only.** Scoring-pairs rounds keep today's behaviour: you score only your assigned pair. Handicap rounds and competition rounds are unchanged for now. |
| D2 | **Last edit wins** per hole when two phones edit the same hole. No conflict flag and no resolution step. |
| D3 | **Submit:** anyone can submit, and it finishes the round for everyone. The submitting phone pulls in everyone's latest edits first. Submitting is final. |
| D4 | **Live updates:** an edit on one phone appears on the others within seconds while online. |
| D5 | **Approach:** merge per hole on the phone, on top of the existing revision-checked sync. No server merge, and no rebuilding cards from `score_entries`. |

## 3. Definitions

A **social round** satisfies all of the following:
- `rounds.competition_id IS NULL`
- `rounds.handicap_source = 'none'` (the UI shows this as "Practice Round", or "Match" with 2+ players)
- `rounds.scoring_pairs_required = false`

If any of these is unknown, the round is treated as **standard** (today's behaviour). The two modes are a single store value, `scoringMode: 'social' | 'standard'`, derived in exactly one helper, `deriveScoringMode(round)`.

## 4. Current behaviour, and why it fails

These are all on `main` as of 8ca6daec.
- **Whole-card writes.** The `write_scorecard_snapshot` RPC (migration `20260714000000`) replaces the entire `scores` JSON. It rejects a write whose expected revision is stale.
- **Background conflicts stick.** A conflict is retained as a failed upload (`syncOrchestrator.ts`, queued and fallback paths), which raises the RoundHeader banner. Only submit or an explicit Retry adopts the server revision, and that path lets the local copy win.
- **Hydrate skips cards with local scores.** On open, `useRoundData.ts` (~:595) skips any card that has local scores. A phone that already scored never picks up another phone's edits.
- **The submit gate blocks takeover.** `checkMultiScorerReadiness` (`services/scoreMismatch/submission.ts`) runs for every round without scoring pairs. It blocks on pending mismatches and waits until every scorer has completed every player they started. The friend in the goal scenario can never submit.
- **Realtime only refreshes leaderboards.** `useScorecardsRealtime` invalidates React Query caches. It never updates the score-entry store.
- **Permissions already allow takeover.** The scorecards INSERT and UPDATE policies (migration `20260427110000`) let any participant in a standalone round write another participant's card via `round_players`. No backend change is needed for takeover.

## 5. Design

### 5.1 Data: per-hole edit time

- **New field.** `HoleScore` gains `editedAt?: string`, an ISO-8601 time from the phone's clock.
- **Who stamps it.** The store stamps `editedAt` whenever any part of a hole changes. Every score-entry path goes through these store actions:
  - `setPlayerScore`
  - `updatePlayerHoleScore` (putts, fairway, green, penalties and other stats)
  - `updateShotContributions`
  - `setMultiBallScore` and `updateMultiBallStats`
  - `updateLocalScore`
  This covers match play, team formats, the watch bridge and HoleMapScreen, because they all call these actions.
- **Local storage.** Add an `edited_at TEXT` column to `hole_scores` through a local SQLite migration (`schema/migrations.ts`). Read and write it in `HoleScoreDAO`. The existing `updated_at` is rewritten on every save, so it can't stand in.
- **Server storage.** The sync whitelist that builds `scoresForDb` (`scorecardSync.ts` ~:137) includes `editedAt`. It lands in the existing `scores` JSONB, so no server migration is needed.
- **Hydrate.** Converting server scores to store scores (`useRoundData.ts`) preserves `editedAt`.
- **All round types.** The field is stamped in every round type because it's harmless. Only social rounds use it.
- **No deletion markers.** The app has no "clear a score" action.

### 5.2 Scoring mode

- **The field.** Add `scoringMode` to `ScorecardState`. It defaults to `'standard'` and is cleared by `resetRound`.
- **Setting it.** It's set from `deriveScoringMode(round)` everywhere a round initialises:
  - `initializeRound` takes it as a trailing parameter. The callers are `useRoundData`, `useMatchPlayData`, `TeamMatchPlayScoringScreen`, `useStartNewRound`, `useStartSocialRound` and `useStartScheduledRound`. Each already has the round row, or is creating it.
  - `loadFromOffline` adds `competition_id` and `scoring_pairs_required` to its existing metadata select.
- **Persistence.** The mode is saved on the local `scorecards` rows in a new column, `scoring_mode TEXT DEFAULT 'standard'`. An offline resume restores it, and the fetched metadata wins when it's available.

### 5.3 Merge function

`mergeScorecardScores(local, server)` lives in `src/services/offline/sync/mergeScorecardScores.ts`. It's pure and does no scoring maths.

```ts
mergeScorecardScores(
  local: Record<number, HoleScore>,
  server: Record<number, HoleScore>,
): { scores: Record<number, HoleScore>; localChanged: boolean; localAhead: boolean }
```

**Rules, applied per hole:**
- If only one side has the hole, keep it.
- If both have it, the later `editedAt` wins. A missing `editedAt` counts as the oldest possible edit. A tie keeps the server's copy.
- A hole moves as one unit: strokes, putts, stats and contributions come from the same side.

**Return values:**
- `localChanged`: whether the result differs from `local`, so the store needs to update.
- `localAhead`: whether any local hole beat the server, so the merged card must be uploaded.

**Totals.** The store recalculates them from the merged scores with `calculatePlayerTotals` (`store/utils/scorecardCalculations.ts`). That keeps pickups, daily handicap and points in one canonical place. Cards stay presentational.

**Revision rule (invariant).** A phone adopts a server revision **only together with** merging that server's holes into the same local card. It never raises an expected revision on its own, because that would overwrite newer server holes.

### 5.4 Store integration

- `mergeRemoteScorecard(row: { player_id, scores, revision, status })`:
  - It's a no-op unless `scoringMode === 'social'`.
  - It merges the row into the matching local card, recalculates totals, persists to SQLite and sets `serverRevision = row.revision`.
  - If `localAhead`, it queues the usual debounced upload.
  - If `row.status` is `completed` or `confirmed`, it adopts the server card wholesale. See 5.7.
- **Conflict resolver.** The store registers it with the sync layer through `setScorecardConflictResolver(fn)`, the same inversion as `subscribeScorecardSynced`. The services layer never imports the store.
  - Given `(queuedScorecard, conflict)`, it merges the conflict's server scores into the store's own card exactly as `mergeRemoteScorecard` does: recalculated totals, persisted, revision adopted. It then returns that merged card as the snapshot to retry at `conflict.serverRevision`.
  - It returns `null` when the card's round isn't the loaded social round.

### 5.5 Where the merge runs (social rounds only)

1. **Upload conflict (background).** On a `ScorecardConflictError`, `syncAll` asks the resolver. Both the queued path and the unsynced-scorecards fallback do this.
   - The error already carries `serverScores` and `serverRevision`.
   - A merged snapshot is written back to the queued row and retried **once**. On success, the drain records it like any other success: it removes the row and notifies the store.
   - If the resolver returns `null`, today's retained-failure behaviour stays. The round heals when it's next opened (path 3).
2. **Live.** A new hook, `useLiveScorecardMerge(roundId, enabled)`, is mounted on every screen that edits or reviews a social round's cards when the mode is `'social'`: `ScorecardEntryScreen`, `MatchPlayScoringScreen`, `TeamMatchPlayScoringScreen` and `ReviewScorecardScreen`.
   - It subscribes to `postgres_changes` on `scorecards` for the round and calls `mergeRemoteScorecard(payload.new)`.
   - A phone's own upload echoing back is an idempotent no-op.
3. **Open.** In social mode, `useRoundData`'s hydrate merges each server card into the local card instead of skipping cards that have local scores.
4. **Submit.** Before completing cards, the store fetches the round's scorecards and merges them, then runs the existing submit loop.
   - In social mode, a conflict during submit uses the resolver instead of today's local-wins self-heal.

### 5.6 Submit gate

`checkSubmissionReadiness` returns `{ canSubmit: true }` immediately for social rounds. The caller passes the scoring mode. Rounds with scoring pairs, handicap rounds and competition rounds keep the existing gates.

### 5.7 After submit, offline, and errors

**After submit:**
- Other phones receive the completed cards through the live merge. The score-entry screen becomes read-only and offers the round summary.
- Unsent local edits for a completed card are discarded. Submitting is final (D3).
- The RPC refuses an in-progress write over a completed card. The resolver treats a completed server card as final: it adopts it and drops the queued row quietly, with no retained failure.
- A phone that submits after another phone has already submitted adopts the final card and shows "This round was already submitted".

**Offline:** edits queue exactly as today. Merging happens when the phone reconnects (paths 1 and 3). If two phones submit offline, the first to reach the server completes the round and the other adopts it.

**Banners:** in social rounds, revision conflicts are always merged, so they never surface. Real failures still raise the banner: no signal for a long time, a permission (RLS) rejection, or a server error.

**Unchanged:**
- `score_entries` still upload in the single batched write (contention fix 5d21c6fa). Social rounds don't use them.
- A phone on 1.14.0 keeps today's behaviour. Its edits merge in on 1.14.1 phones, treated as oldest.

## 6. Non-goals

- Competition rounds, handicap rounds and scoring-pairs rounds. Their behaviour is unchanged.
- Any conflict-resolution UI or reconciler. The old branch's ConflictsSheet and reconcile are dropped.
- Server-side merging, or any server migration.
- Clearing or deleting a hole score.
- Restoring the post-submit RLS lock on scorecards UPDATE. Migration `20260427110000` recreated the policy without the `status <> 'completed'` guard from `20260425000000`. App writes are still guarded by the RPC. This is tracked separately.

## 7. Testing

All tests use literal, hand-derived expectations.

1. **`mergeScorecardScores` (table-driven):**
   - only local; only server
   - local newer; server newer
   - missing `editedAt` against a present one; both missing
   - a tie goes to the server
   - a whole hole moves as a unit
   - the `localChanged` and `localAhead` flags
2. **Store (`scorecardStore.test.ts`):**
   - Characterization tests first: lock the key sets of `initializeRound`, `loadFromOffline` and `resetRound`.
   - Each of the 5 write actions stamps `editedAt`.
   - `scoringMode` is set, restored and reset.
   - `mergeRemoteScorecard` recalculates totals canonically (a pickup counts as NDB). It adopts the revision only with a merge, adopts a completed card wholesale, and is a no-op in standard mode.
3. **Sync (`sync.test.ts`):**
   - A social conflict calls the resolver, retries once with the server revision, leaves no failed row and notifies the store.
   - A resolver returning `null` keeps today's behaviour (characterization).
   - A completed server card drops the queued row.
   - The fallback path behaves the same way.
   - Standard rounds are unchanged (characterization).
   - `scoresForDb` includes `editedAt`.
4. **Submit and open:**
   - Social rounds skip `checkMultiScorerReadiness`. Scoring pairs, handicap and competition rounds still run their gates.
   - Social hydrate merges into a card that has local scores. Standard hydrate still skips it.
5. **End-to-end scenario test:** a fake server enforces `write_scorecard_snapshot` revision and status semantics.
   - Phone A scores holes 1–9, then goes silent.
   - Phone B opens the round, merges, scores 10–18 for both players and submits.
   - Phone A returns with its stale copy.
   - Expected: both phones hold the same final 18-hole cards, no hole is lost, and A's queued upload is dropped without a retained failure.
6. **Guardrails** (the change touches `scorecardStore`, `scoreUpdateSlice` and `initializeRoundSlice`):
   - Run the `scoring-impact-analyst` on the final file list before editing.
   - Write characterization tests before changing behaviour.
   - Run the scoring subset, the store and sync suites, the full suite and `pnpm verify:gate`.

## 8. On-device QA (two phones on 1.14.1)

1. **Dead-battery handover:** phone A scores holes 1–9 and turns flight mode on. Phone B finishes and submits. Phone A reconnects and shows the final card with no banner.
2. **Same hole, both phones:** the latest edit shows on both within seconds.
3. **Offline edits** on one phone, then reconnecting: both phones converge.
4. **Submit during an edit:** phone A submits while phone B is mid-edit. B becomes read-only, and B's unsent edits are discarded.
5. **Handicap round on two phones:** behaves exactly as today.
6. **Mixed versions:** one phone on 1.14.0 and one on 1.14.1, in a social round.

## 9. Documentation

- Update `docs/guides/OFFLINE_ARCHITECTURE.md`. Describe the revision-checked sync and conflict handling, which the code review found undocumented. Add the social-round merge.
- Extend the CLAUDE.md scoring-test command, or add a sync-test command, so it covers `store/scorecardStore`, `services/offline/sync` and `services/scoreMismatch`.

## 10. Rollout

- Client-only, with no server change. It can ship in any store build.
- 1.14.1 can ship with or without it, depending on QA timing. The two fixes already merged (b3c7cd37 and 8ca6daec) don't depend on it.
- Delete the superseded `worktree-live-multi-scorer-rounds` branch and worktree once this spec is approved.

## 11. Risks

- **Clock skew:** "last edit" is judged by each phone's clock. Two edits to the same hole a few seconds apart on skewed clocks may resolve the "wrong" way. This is accepted (D2).
- **Resolver unavailable:** a conflict for a round that isn't loaded in the store falls back to a retained failure until the round is next opened.
- **Realtime payload:** whole-card rows arrive on every write. This is acceptable at social-round sizes, which are 2–4 cards.
