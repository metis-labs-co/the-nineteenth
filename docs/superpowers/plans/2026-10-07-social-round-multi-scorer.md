# Social Round Multi-Scorer Implementation Plan (rev. 3)

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** In social rounds, anyone in the round can score anyone. Each hole keeps its last edit, every phone converges live, and the "changed on another device" banner never appears.

**Architecture:**
- Every hole score carries an `editedAt` timestamp, stamped by the store.
- One pure `mergeScorecardScores(local, server)` decides each hole: the newer edit wins, and the same edit is never treated as a change.
- A second pure function, `applyRemoteScorecard(local, row)`, adds the rules about revisions and final (submitted) cards.
- The store applies remote rows only when `scoringMode === 'social'`. It receives them from four sources:
  1. upload conflicts, through a conflict resolver the store registers with the sync layer;
  2. realtime changes;
  3. `pullServerScorecards()`, used when a round opens and before submit.
- Totals always come from the canonical `calculatePlayerTotals`. There is no server change.

**Tech Stack:** Expo/React Native, TypeScript, Zustand, expo-sqlite, Supabase (Postgres RPC and Realtime), Jest.

**Spec:** `docs/superpowers/specs/2026-10-07-social-round-multi-scorer-design.md`. Read it first.

**Worktree:** `/Users/samkay/Documents/MetisCo/Dev/the-nineteenth-social-multi-scorer`, branch `feature/social-round-multi-scorer`. Run every command from there. If dependencies are missing, run `pnpm install --frozen-lockfile`. **Never symlink `node_modules`.**

**Resolved product question:** the Course screen's start button used to drop the wizard's round-type choice. It was fixed on main in 008f6bef ("Score a Round" now uses `useStartNewRound`, and `useStartSocialRound` is deleted). So a practice round started anywhere is a social round, and a handicap round is standard.

## Global Constraints

- **Definition of a social round:** `competition_id IS NULL` AND `handicap_source = 'none'` AND `scoring_pairs_required = false`. Anything unknown means `'standard'`.
- **Standard rounds behave exactly as today.** These are handicap, competition and scoring-pairs rounds. Every behaviour change is gated on `scoringMode === 'social'`. The one exception is the shared upload whitelist in Task 2: uploading more hole fields is harmless.
- **Never adopt a server revision without merging that server's holes into the same local card first.** An older row never lowers `serverRevision`.
- **No upload loops.** After applying a remote row, a card with nothing newer locally is saved **already synced** at the server revision in the same SQLite write (`saveScorecard(card, { syncedAtRevision })`). Neither the sync queue nor the fallback pass can re-upload it, even across a crash.
- **Never rewrite a queued row's data on retry.** Conflict retries run in memory. A newer tap may already be in the row.
- **Totals are always nine-aware.** Every `calculatePlayerTotals` call passes `nineType: state.nineType`, as `applyScoreUpdate` already does (the 9-hole daily-handicap fix, invariant I4).
- **`score_entries` stays single-writer.** The batched `syncScoreEntries` is its only writer (commit 5d21c6fa). Don't add `saveScoreEntry` calls anywhere.
- **Scoring math lives only in `calculatePlayerTotals`** (`src/store/utils/scorecardCalculations.ts`).
- **No Supabase migrations.** The local SQLite migration for `edited_at` is allowed.
- **Scoring guardrails (CLAUDE.md):** run the impact analysis before editing the store slices, and write characterization tests before changing behaviour.
- **Commits:** end every message with `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`.
- **Imports:** `@/services/offline/sync` resolves to the shim **file** `src/services/offline/sync.ts`. A new sync export must be added there **and** in `src/services/offline/sync/index.ts`.
- **Store test fixtures** (`src/__tests__/store/scorecardStore.test.ts`):
  - Names: `testRoundId`, `testPlayers` and `testHoles` (from `create18Holes()`).
  - `testPlayers[0].handicap` is 18. Hole 1 is par 4, stroke index 7.
  - Database helpers are **named imports** (`saveScorecard`, `saveHoleScore`, `markScorecardAsSynced`, …). There is no `database.` object.
  - `getStore()` is `useScorecardStore.getState()`.
- **Known failure:** `src/__tests__/services/sync/syncUtils.test.ts` already fails 4 tests on main (a daylight-saving date bug). Ignore it, but name it in reports.

## Deliberate deviations from the spec (agreed when planning)

1. **No local `scoring_mode` column.** `loadFromOffline` bails out without round metadata, and the network init it falls back to has the metadata. So the mode is always derivable from data the round fetches.
2. **Multi-ball holes are not stamped or merged.** Single-ball scores only are uploaded (`scorecardSync.ts` ~:154), so multi-ball holes never arrive from the server.
3. **The gate skip is an option on `checkSubmissionReadiness`.** The only social-relevant caller is `useScoreSubmission` (~:437). `useSubmissionReadiness` and `useMismatchResolutionFlow` are enabled only when scoring pairs are on, which never happens in a social round.
4. **"Already submitted" is a return value, not an error.** `submitScorecards` returns `{ alreadySubmitted: boolean }`. When it's true, the server's final cards are adopted and the caller's normal success navigation (to the round summary) applies. None of the 7 callers needs new error handling.
5. **One action, `pullServerScorecards()`, does merge-on-open and the pre-submit merge.** It's shared by `useRoundData`, `useMatchPlayData`, `TeamMatchPlayScoringScreen` and `submitScorecards`.
6. **Stat edits trigger a live sync in social rounds.** `updatePlayerHoleScore` and `updateShotContributions` don't queue a sync today. In social mode they queue the same debounced upload as strokes, so stat edits are live and their `editedAt` reaches other phones promptly.

## Accepted behaviour (state it; don't "fix" it)

- **A hole merges as one unit, so two phones editing the same hole in quick succession can lose one edit.** For example, phone B edits putts on a stale copy shortly after phone A changed the strokes. B's later edit wins and A's strokes change is lost. This follows from last-edit-wins per hole (spec D2).
- **"Last" is judged by each phone's clock.**
- **A participant with a pending invite can open the round and score it.** `useRoundPlayers` doesn't filter on invitation status, and the scorecard RLS allows any `round_players` participant to write. That's intended: it's what makes the takeover work.
- **Guests (placeholder players) merge like any other player.** They're ordinary `round_players` with scorecards.
- **"Round Complete" can't fire twice.** The trigger fires only on the transition to completed and has its own guard (Task 9, Step 4b).

## Review Focus

These are the conditions most likely to bite. Each has a pinned test in the task named.

1. **An echo of this phone's own upload**, with Postgres-reordered keys and the upload whitelist missing local-only fields. It must be a no-op: no field lost, no store churn, no re-upload. *Tasks 3 and 5a–5b.*
2. **Completed cards echoing between phones after a submit.** There must be no upload loop: synced is recorded, and nothing is queued or re-uploaded. *Tasks 5a–5b and Task 11.*
3. **This phone's own submit echoing back.** It must not raise "submitted on another phone". *Tasks 5a–5b and Task 9.*
4. **Retrying a submit after one that failed partway.** It must not report "already submitted", and it must not skip cards that never uploaded. *Task 9.*
5. **A conflict whose server row is older than this phone's revision, or belongs to another round.** It must decline, keeping today's behaviour, with no futile retry. *Task 6.*
6. **A tap landing while a conflict is being merged.** The newer queued edit must survive, never overwritten by the older merged snapshot. *Task 6 (no `updatePendingSyncData`) and the superseded-upload path.*
7. **A 9-hole social round merging a card.** Its totals must match local entry (nine-aware). *Task 5b.*
8. **Score entry and Review mounted at the same time.** Each needs its own realtime channel. *Task 7.*
9. **A weak signal at submit.** A failed pre-submit pull must not block the submit. *Task 9.*

---

## File structure

| File | Responsibility |
|---|---|
| `src/utils/scoringMode.ts` (new) | `ScoringMode` and `deriveScoringMode(round)`. The one place "social" is defined. |
| `src/services/offline/sync/mergeScorecardScores.ts` (new) | Pure per-hole last-edit-wins merge. |
| `src/store/remoteScorecardMerge.ts` (new) | Pure: apply a remote row to a local card (revision and final rules). |
| `src/services/offline/sync/syncOrchestrator.ts` | `setScorecardConflictResolver`, used in the queued and fallback conflict paths. |
| `src/services/offline/sync.ts`, `src/services/offline/sync/index.ts` | Re-export the resolver API. |
| `src/services/offline/sync/scorecardSync.ts` | Upload `editedAt`, `scoredBy`, `pickedUp` and `didNotAttempt` in `scoresForDb`. |
| `src/services/offline/schema/{migrations,tables}.ts`, `src/services/offline/types.ts`, `src/services/offline/dao/HoleScoreDAO.ts` | Local `edited_at` column. |
| `src/types/database/base.ts` | `HoleScore.editedAt`. |
| `src/store/scoreUpdateSlice.ts` | Stamp `editedAt`; social-mode live sync for stat edits. |
| `src/store/initializeRoundSlice.ts` | Thread `scoringMode`; derive it in `loadFromOffline`. |
| `src/store/scorecardStore.ts` | `scoringMode`, `submittedElsewhere`, `mergeRemoteScorecard`, `pullServerScorecards`, resolver registration, social submit. |
| `src/hooks/scorecard/useLiveScorecardMerge.ts` (new) | Realtime subscription that feeds `mergeRemoteScorecard`. |
| `src/hooks/scorecard/useSubmittedElsewhereRedirect.ts` (new) | Alert and redirect when another phone submits. |
| `src/hooks/scorecard/useRoundData.ts`, `useMatchPlayData.ts`, `useRoundMetadata.ts`; `src/types/supabase/roundQueries.ts` | Pass the mode to init; pull on open. |
| Start hooks (`useStartNewRound`, `useStartScheduledRound`), `TeamMatchPlayScoringScreen` | Pass the mode; Team Match Play pulls on open. |
| `src/services/scoreMismatch/submission.ts`, `ReviewScorecardScreen/hooks/useScoreSubmission.ts` | Skip the gate for social rounds. |
| The 4 scoring screens | Mount the live merge and the redirect. |
| `src/__tests__/mocks/stores/scorecardStore.mock.ts` | New fields in both the interface and the values. |
| `docs/guides/OFFLINE_ARCHITECTURE.md`, `CLAUDE.md` | Documentation. |

---

### Task 0: Sync with main, then guardrail preflight (no code)

- [ ] **Step 0: Bring the branch up to date.** Main has moved on since this plan was written, including 008f6bef, which deleted `useStartSocialRound`. Run `git merge main` in the worktree (there should be no conflicts, since the branch only adds docs), then `pnpm install --frozen-lockfile`. Re-check that the line numbers this plan cites still match. They're approximate; locate each edit by the code quoted in the plan.
- [ ] **Step 1: Run the impact analysis.** Dispatch the `scoring-impact-analyst` agent on these files and paste its blast-radius summary into your task report:
  - `src/store/scoreUpdateSlice.ts`
  - `src/store/scorecardStore.ts`
  - `src/store/initializeRoundSlice.ts`
  - `src/services/offline/sync/syncOrchestrator.ts`
  - `src/services/offline/sync/scorecardSync.ts`
  - `src/services/scoreMismatch/submission.ts`
  - `src/hooks/scorecard/useRoundData.ts`
  - `src/hooks/scorecard/useMatchPlayData.ts`

  Ask it to name **unprotected** behaviours that the tasks below change.
- [ ] **Step 2: Record the baseline.**
  ```bash
  pnpm test --silent 2>&1 | grep -E "^FAIL|^Tests:" | sort -u
  ```
  Expected: only `syncUtils.test.ts` fails (4 tests).

---

### Task 1: Characterization tests (lock today's behaviour)

**Files:**
- Modify: `src/__tests__/store/scorecardStore.test.ts`
- Modify: `src/__tests__/services/offline/sync.test.ts`

These tests must **pass on the unchanged code**.

- [ ] **Step 1: Add store characterization tests.** Add them next to `describe('initializeRound')` (~:261).

```ts
  describe('characterization: standard-round behaviour', () => {
    it('resetRound clears the round-scoped state', () => {
      useScorecardStore.setState({ currentRoundId: testRoundId, allowedPlayerIds: ['x'], failedSyncCount: 3 });
      getStore().resetRound();
      const s = getStore();
      expect(s.currentRoundId).toBeNull();
      expect(s.allowedPlayerIds).toEqual([]);
      expect(s.failedSyncCount).toBe(0);
      expect(s.groupScorecards.size).toBe(0);
    });

    it('setPlayerScore keeps existing putts and records the scorer', async () => {
      await getStore().initializeRound(testRoundId, testPlayers, testHoles, 'stroke');
      const playerId = testPlayers[0].id;
      await getStore().updatePlayerHoleScore(playerId, 1, { strokes: 4, putts: 2 });
      await getStore().setPlayerScore(playerId, 1, 5, 'scorer-1');
      const hole = getStore().groupScorecards.get(playerId)!.scores[1] as HoleScore;
      expect(hole).toMatchObject({ strokes: 5, putts: 2, scoredBy: 'scorer-1' });
    });

    it('updatePlayerHoleScore does not queue a live sync today', async () => {
      jest.useFakeTimers();
      await getStore().initializeRound(testRoundId, testPlayers, testHoles, 'stroke');
      (queueScorecardSync as jest.Mock).mockClear();
      await getStore().updatePlayerHoleScore(testPlayers[0].id, 1, { putts: 2 });
      jest.advanceTimersByTime(2500);
      expect(queueScorecardSync).not.toHaveBeenCalled();
      jest.useRealTimers();
    });
  });
```

  If `queueScorecardSync` isn't already imported from the mocked `@/services/offline/sync` (check the imports at :31-36), add it to that import.

- [ ] **Step 2: Add sync characterization tests.** In `sync.test.ts`, inside `describe('scorecard synced notifications')` (:406, where `successRpc` is defined), after the "when a newer edit arrives during the upload" block:

```ts
    describe('characterization: conflicts without a resolver', () => {
      it('retains a conflicted queued write as failed', async () => {
        (database.getPendingSyncs as jest.Mock).mockResolvedValue([createPendingSync({ id: 3 })]);
        (supabase.rpc as jest.Mock).mockResolvedValue({
          data: [{ applied: false, conflict: true, server_revision: 6, server_status: 'in-progress', server_scores: {} }],
          error: null,
        });

        await syncAll();

        expect(database.markPendingSyncFailed).toHaveBeenCalledWith(3, 1, expect.stringContaining('another device'));
        expect(database.removePendingSync).not.toHaveBeenCalled();
      });
    });

    it('uploads only the whitelisted hole fields today', async () => {
      const scorecard = createTestScorecard({
        status: 'in-progress',
        scores: { 1: { strokes: 4, scoredBy: 'u1', pickedUp: true } },
      });
      (database.getPendingSyncs as jest.Mock).mockResolvedValue([createPendingSync({ data: scorecard })]);
      (supabase.rpc as jest.Mock).mockResolvedValue(successRpc(1));

      await syncAll();

      const write = (supabase.rpc as jest.Mock).mock.calls.find(([fn]) => fn === 'write_scorecard_snapshot');
      expect(write[1].p_snapshot.scores['1']).not.toHaveProperty('scoredBy');
      expect(write[1].p_snapshot.scores['1']).not.toHaveProperty('pickedUp');
    });
```

  (`sync.test.ts` does use a `database` namespace import.) Task 2 flips the last test, on purpose.

- [ ] **Step 3: Run them and check they pass.**
  ```bash
  pnpm test --testPathPattern='(store/scorecardStore|services/offline/sync.test)'
  ```
  Expected: PASS. If a test fails, fix the test to describe what the code currently does.
- [ ] **Step 4: Commit.**
  ```bash
  git add src/__tests__ && git commit -m "test: characterize standard-round store and sync behaviour before social merge

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
  ```

---

### Task 2: Per-hole `editedAt` (stamp, persist, upload) and a fuller upload whitelist

**Files:**
- Modify: `src/types/database/base.ts` (`HoleScore` ~:82)
- Modify: `src/store/scoreUpdateSlice.ts` (`applyScoreUpdate` :35-71, and the `persistScorecardUpdate` calls at ~:155/204/248/302)
- Modify: `src/services/offline/schema/migrations.ts` (append v19), `src/services/offline/schema/tables.ts` (`hole_scores` CREATE ~:43-56), `src/services/offline/types.ts` (`HoleScoreRow` :39-52), `src/services/offline/dao/HoleScoreDAO.ts` (`saveHoleScore`, `getHoleScores`)
- Modify: `src/services/offline/sync/scorecardSync.ts` (`scoresForDb` :137-168)
- Test: `src/__tests__/store/scorecardStore.test.ts`, `src/__tests__/services/offline/sync.test.ts`

**Interfaces:**
- Produces: `HoleScore.editedAt?: string` (ISO 8601). Every store write through `applyScoreUpdate` sets it to `new Date().toISOString()`.

- [ ] **Step 1: Write the failing store tests.**

```ts
  describe('editedAt stamping', () => {
    beforeEach(() => {
      jest.useFakeTimers();
      jest.setSystemTime(new Date('2026-10-07T01:02:03.000Z'));
    });
    afterEach(() => jest.useRealTimers());

    const holeOf = (playerId: string) => getStore().groupScorecards.get(playerId)!.scores[1] as HoleScore;

    it.each([
      ['setPlayerScore', (id: string) => getStore().setPlayerScore(id, 1, 4, 'me')],
      ['updatePlayerHoleScore', (id: string) => getStore().updatePlayerHoleScore(id, 1, { putts: 2 })],
      ['updateShotContributions', (id: string) => getStore().updateShotContributions(id, 1, { teeShot: id })],
      ['updateLocalScore', (id: string) => getStore().updateLocalScore(testRoundId, id, 1, 5)],
    ])('%s stamps the hole with the edit time', async (_name, act) => {
      await getStore().initializeRound(testRoundId, testPlayers, testHoles, 'stroke');
      const id = testPlayers[0].id;
      await act(id);
      expect(holeOf(id).editedAt).toBe('2026-10-07T01:02:03.000Z');
    });

    it('persists the stamped hole to SQLite', async () => {
      await getStore().initializeRound(testRoundId, testPlayers, testHoles, 'stroke');
      await getStore().setPlayerScore(testPlayers[0].id, 1, 4, 'me');
      expect(saveHoleScore).toHaveBeenLastCalledWith(
        expect.any(String), 1, expect.objectContaining({ editedAt: '2026-10-07T01:02:03.000Z' }),
      );
    });
  });
```

- [ ] **Step 2: Run the tests and check they fail.**
  ```bash
  pnpm test --testPathPattern='store/scorecardStore' -t 'editedAt stamping'
  ```
  Expected: FAIL (`editedAt` is undefined).

- [ ] **Step 3: Implement.**
  - In `base.ts`, inside `HoleScore`, after `scoredBy`:
    ```ts
    /**
     * When this hole was last edited on the device that edited it (ISO 8601).
     * Social rounds merge per hole on it: the later edit wins. Absent on holes
     * written before 1.14.1, which then count as the oldest edit.
     */
    editedAt?: string;
    ```
  - In `scoreUpdateSlice.ts`, `applyScoreUpdate`, build the card from a stamped copy:
    ```ts
    const stampedHoleScore: HoleScore = { ...holeScore, editedAt: new Date().toISOString() };
    const updatedScorecard: Scorecard = {
      ...scorecard,
      scores: { ...scorecard.scores, [hole]: stampedHoleScore },
      updatedAt: new Date(),
    };
    ```
  - In each of the four `persistScorecardUpdate` calls, persist the stamped hole. Use `hole` or `holeNumber` to match the function:
    ```ts
    holeScore: { scorecardId: scorecard.id, holeNumber: hole, score: updatedScorecard.scores[hole] as HoleScore },
    ```
  - Run the tests and check they pass.

- [ ] **Step 4: Persist locally.**
  - `migrations.ts`, append:
    ```ts
    { version: 19, name: 'add_hole_score_edited_at', up: `ALTER TABLE hole_scores ADD COLUMN edited_at TEXT` },
    ```
  - `tables.ts`: add `edited_at TEXT,` after `shot_contributions TEXT,`. It's safe to have it in both places, because `runMigration` swallows duplicate-column errors.
  - `types.ts`, `HoleScoreRow`: add `edited_at: string | null;`.
  - `HoleScoreDAO.ts`, `saveHoleScore`:
    - In **both** INSERTs, add `edited_at` before `updated_at` and one more `?`.
    - Values: `null` for multi-ball, and `score.editedAt ?? null` for single-ball.
  - `getHoleScores`:
    - Add `'edited_at'` to the `Pick<…>` union and to the SELECT.
    - In the single-ball object, add `editedAt: row.edited_at ?? undefined,`.
  - Verify against real SQLite:
    ```bash
    sqlite3 :memory: "CREATE TABLE hole_scores (scorecard_id TEXT, hole_number INTEGER, shot_contributions TEXT); ALTER TABLE hole_scores ADD COLUMN edited_at TEXT; INSERT INTO hole_scores VALUES ('s',1,NULL,'2026-10-07T00:00:00.000Z'); SELECT edited_at FROM hole_scores;"
    ```
    Expected: `2026-10-07T00:00:00.000Z`.

- [ ] **Step 5: Widen the upload whitelist.** Other phones adopt the server's copy of a hole, so any field left off the upload is silently lost on those phones.
  - In `sync.test.ts`, rename the Task 1 test to `'uploads editedAt, scoredBy and pickup flags'`.
    - Its scores: `{ 1: { strokes: 4, scoredBy: 'u1', pickedUp: true, editedAt: '2026-10-07T00:00:00.000Z' }, 2: { strokes: 0, didNotAttempt: true } }`
    - Expected:
      ```ts
      expect(write[1].p_snapshot.scores['1']).toMatchObject({ scoredBy: 'u1', pickedUp: true, editedAt: '2026-10-07T00:00:00.000Z' });
      expect(write[1].p_snapshot.scores['2']).toMatchObject({ strokes: 0, didNotAttempt: true });
      ```
    - Run it and check it fails.
  - In `scorecardSync.ts`, add `editedAt?: string; scoredBy?: string; pickedUp?: boolean; didNotAttempt?: boolean;` to the value type. After `penalties`:
    ```ts
    ...(score.editedAt && { editedAt: score.editedAt }),
    ...(score.scoredBy && { scoredBy: score.scoredBy }),
    ...(score.pickedUp && { pickedUp: true }),
    ...(score.didNotAttempt && { didNotAttempt: true }),
    ```
  - Run it and check it passes.
  - Then confirm nothing on the server side rejects extra keys:
    ```bash
    grep -n "scores" supabase/migrations/20260714000000_scorecard_optimistic_concurrency.sql
    ```
    The RPC stores `p_snapshot->'scores'` as is. Report that.

- [ ] **Step 6: Run the checks.**
  ```bash
  pnpm type-check && pnpm test --testPathPattern='(golden|services/scoring|utils/(scoring|dailyHandicap|subMatches)|components/scorecard|store/scorecardStore|services/offline)'
  ```
- [ ] **Step 7: Commit.**
  ```bash
  git add -A src && git commit -m "feat(scoring): per-hole editedAt (stamp, persist, upload); upload scoredBy and pickup flags

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
  ```

---

### Task 3: `mergeScorecardScores` (pure)

**Files:**
- Create: `src/services/offline/sync/mergeScorecardScores.ts`
- Test: `src/__tests__/services/offline/mergeScorecardScores.test.ts`

**Interfaces:**
- Produces:
  ```ts
  export interface ScorecardScoresMerge {
    scores: Record<number, HoleScore | MultiBallHoleScore>;
    localChanged: boolean; // result differs from local on some hole
    localAhead: boolean;   // some local single-ball hole beats or is missing on the server
  }
  export function mergeScorecardScores(
    local: Record<number, HoleScore | MultiBallHoleScore>,
    server: Record<number | string, HoleScore> | null | undefined,
  ): ScorecardScoresMerge;
  ```

**Rules:**
- A hole only one side has is kept.
- **Same edit:** both sides have the same `editedAt`, or both are unstamped with equal strokes. The local copy is kept and nothing changes. The server copy can be missing local-only fields or have its JSON keys reordered.
- Otherwise the later `editedAt` wins, with a missing time counting as oldest. If neither is stamped and the strokes differ, the server wins.
- Holes are compared by **edit identity, never by `JSON.stringify`**.

- [ ] **Step 1: Write the failing tests.**

```ts
import { mergeScorecardScores } from '@/services/offline/sync/mergeScorecardScores';
import type { HoleScore } from '@/types';

const T1 = '2026-10-07T01:00:00.000Z';
const T2 = '2026-10-07T02:00:00.000Z';
const h = (strokes: number, editedAt?: string, extra: Partial<HoleScore> = {}): HoleScore =>
  ({ strokes, ...(editedAt && { editedAt }), ...extra });

describe('mergeScorecardScores', () => {
  it.each([
    // name, local, server, expected strokes per hole, localChanged, localAhead
    ['takes a hole only the server has', { 1: h(4, T1) }, { 2: h(5, T1) }, { 1: 4, 2: 5 }, true, true],
    ['keeps a hole only local has', { 1: h(4, T1) }, {}, { 1: 4 }, false, true],
    ['local newer wins', { 1: h(4, T2) }, { 1: h(6, T1) }, { 1: 4 }, false, true],
    ['server newer wins', { 1: h(4, T1) }, { 1: h(6, T2) }, { 1: 6 }, true, false],
    ['stamped beats unstamped (1.14.0) server', { 1: h(4, T1) }, { 1: h(6) }, { 1: 4 }, false, true],
    ['stamped server beats unstamped local', { 1: h(4) }, { 1: h(6, T1) }, { 1: 6 }, true, false],
    ['both unstamped, strokes differ: server wins', { 1: h(4) }, { 1: h(6) }, { 1: 6 }, true, false],
    ['both unstamped, strokes equal: same edit', { 1: h(4) }, { 1: h(4) }, { 1: 4 }, false, false],
    ['same editedAt: same edit, nothing changes', { 1: h(4, T1) }, { 1: h(4, T1) }, { 1: 4 }, false, false],
  ])('%s', (_name, local, server, expected, changed, ahead) => {
    const result = mergeScorecardScores(local, server);
    const strokes = Object.fromEntries(Object.entries(result.scores).map(([k, v]) => [Number(k), (v as HoleScore).strokes]));
    expect(strokes).toEqual(expected);
    expect(result.localChanged).toBe(changed);
    expect(result.localAhead).toBe(ahead);
  });

  it('an echo with reordered keys and missing local-only fields keeps the local hole intact', () => {
    const local = { 1: h(10, T1, { scoredBy: 'me', pickedUp: true, putts: 3 }) };
    const echo = { '1': { editedAt: T1, putts: 3, strokes: 10 } as HoleScore }; // jsonb order, no scoredBy/pickedUp
    const result = mergeScorecardScores(local, echo);
    expect(result.scores[1]).toBe(local[1]);
    expect(result).toMatchObject({ localChanged: false, localAhead: false });
  });

  it('moves a hole as one unit (putts travel with strokes)', () => {
    const result = mergeScorecardScores({ 1: h(4, T1, { putts: 1 }) }, { 1: h(6, T2, { putts: 3 }) });
    expect(result.scores[1]).toEqual({ strokes: 6, editedAt: T2, putts: 3 });
  });

  it('accepts string hole keys from the server JSON', () => {
    const result = mergeScorecardScores({}, { '3': h(5, T1) } as Record<string, HoleScore>);
    expect((result.scores[3] as HoleScore).strokes).toBe(5);
  });

  it('keeps a local multi-ball hole untouched', () => {
    const balls = { balls: [h(4, T1), h(5, T1)] };
    const result = mergeScorecardScores({ 1: balls }, null);
    expect(result.scores[1]).toBe(balls);
    expect(result.localAhead).toBe(false);
  });
});
```

- [ ] **Step 2: Run the tests and check they fail** (module not found).
- [ ] **Step 3: Implement.**

```ts
/**
 * Per-hole last-edit-wins merge for social rounds.
 *
 * Pure: decides which side's version of each hole to keep and nothing else.
 * Totals are recomputed by the store (calculatePlayerTotals). A hole moves as
 * one unit. Holes are compared by edit identity (editedAt, or strokes when
 * neither side is stamped), never structurally: the server copy has its JSON
 * keys reordered by Postgres and may lack local-only fields, so the same edit
 * must keep the richer local hole. Missing editedAt (pre-1.14.1) is the oldest
 * edit; two unstamped holes that differ resolve to the server's copy.
 */
import type { HoleScore, MultiBallHoleScore } from '@/types';
import { isSingleBallScore } from '@/types/database/base';

export interface ScorecardScoresMerge {
  scores: Record<number, HoleScore | MultiBallHoleScore>;
  /** The result differs from the local scores. */
  localChanged: boolean;
  /** Some local hole beats or is missing on the server: upload the result. */
  localAhead: boolean;
}

const editTime = (score: HoleScore): number =>
  score.editedAt ? Date.parse(score.editedAt) || 0 : 0;

const isSameEdit = (a: HoleScore, b: HoleScore): boolean =>
  a.editedAt || b.editedAt ? a.editedAt === b.editedAt : a.strokes === b.strokes;

export function mergeScorecardScores(
  local: Record<number, HoleScore | MultiBallHoleScore>,
  server: Record<number | string, HoleScore> | null | undefined,
): ScorecardScoresMerge {
  const scores: Record<number, HoleScore | MultiBallHoleScore> = { ...local };
  let localChanged = false;
  let localAhead = false;
  const serverHoles = new Set<number>();

  for (const [key, serverHole] of Object.entries(server ?? {})) {
    const hole = Number(key);
    if (!Number.isFinite(hole) || !serverHole || serverHole.strokes == null) continue;
    serverHoles.add(hole);
    const localHole = local[hole];

    if (!localHole) {
      scores[hole] = serverHole;
      localChanged = true;
      continue;
    }
    if (!isSingleBallScore(localHole)) continue; // multi-ball never syncs
    if (isSameEdit(localHole, serverHole)) continue;

    if (editTime(localHole) > editTime(serverHole)) {
      localAhead = true;
    } else {
      scores[hole] = serverHole;
      localChanged = true;
    }
  }

  for (const [key, localHole] of Object.entries(local)) {
    if (!serverHoles.has(Number(key)) && localHole && isSingleBallScore(localHole)) localAhead = true;
  }

  return { scores, localChanged, localAhead };
}
```

- [ ] **Step 4: Run the tests and check they pass** (14 tests).
- [ ] **Step 5: Commit.**
  ```bash
  git add src/services/offline/sync/mergeScorecardScores.ts src/__tests__/services/offline/mergeScorecardScores.test.ts
  git commit -m "feat(sync): pure per-hole last-edit-wins scorecard merge

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
  ```

---

### Task 4: Scoring mode (derive, store, thread through every init path)

**Files:**
- Create: `src/utils/scoringMode.ts`; Test: `src/__tests__/utils/scoringMode.test.ts`
- Modify:
  - `src/store/scorecardStore.ts`
  - `src/store/initializeRoundSlice.ts`
  - `src/types/supabase/roundQueries.ts`
  - `src/hooks/scorecard/useRoundMetadata.ts` (~:189)
  - `src/hooks/scorecard/useRoundData.ts` (:374)
  - `src/screens/rounds/RoundListScreen/hooks/useStartNewRound.ts` (:310)
  - `src/screens/rounds/ScheduledRoundScreen/hooks/useStartScheduledRound.ts` (:268)
  - `src/hooks/scorecard/useMatchPlayData.ts` (:288)
  - `src/screens/scoring/TeamMatchPlayScoringScreen/index.tsx` (:197)
  - `src/__tests__/mocks/stores/scorecardStore.mock.ts`
  - `src/__tests__/store/scorecardStore.test.ts` (Supabase mock: make the rounds row overridable)

**Interfaces:**
- Produces:
  ```ts
  export type ScoringMode = 'social' | 'standard';
  export function deriveScoringMode(round: {
    competition_id?: string | null;
    handicap_source?: string | null;
    scoring_pairs_required?: boolean | null;
  } | null | undefined): ScoringMode;
  ```
- Store: `scoringMode: ScoringMode`, defaulting to `'standard'`. `initializeRound(..., startHole?, scoringMode?)` is the new trailing parameter.

- [ ] **Step 1: Write the failing helper tests.**

```ts
import { deriveScoringMode } from '@/utils/scoringMode';

describe('deriveScoringMode', () => {
  const social = { competition_id: null, handicap_source: 'none', scoring_pairs_required: false };
  it.each([
    ['social round', social, 'social'],
    ['competition round', { ...social, competition_id: 'c1' }, 'standard'],
    ['handicap round (profile)', { ...social, handicap_source: 'profile' }, 'standard'],
    ['handicap round (NULL = profile)', { ...social, handicap_source: null }, 'standard'],
    ['scoring pairs', { ...social, scoring_pairs_required: true }, 'standard'],
    ['unknown competition', { handicap_source: 'none', scoring_pairs_required: false }, 'standard'],
    ['unknown pairs flag', { competition_id: null, handicap_source: 'none' }, 'standard'],
    ['no round', null, 'standard'],
  ])('%s → %s', (_n, round, expected) => {
    expect(deriveScoringMode(round as never)).toBe(expected);
  });
});
```

- [ ] **Step 2: Run the tests and check they fail. Then implement.**

```ts
/**
 * Scoring mode for a round. 'social' rounds let anyone score anyone, with a
 * per-hole last-edit-wins merge (docs/superpowers/specs/2026-10-07-social-round-multi-scorer-design.md).
 * Handicap, competition and scoring-pairs rounds are 'standard' and behave as
 * before. Anything unknown is 'standard'.
 */
export type ScoringMode = 'social' | 'standard';

export function deriveScoringMode(
  round:
    | { competition_id?: string | null; handicap_source?: string | null; scoring_pairs_required?: boolean | null }
    | null
    | undefined,
): ScoringMode {
  if (!round) return 'standard';
  return round.competition_id === null &&
    round.handicap_source === 'none' &&
    round.scoring_pairs_required === false
    ? 'social'
    : 'standard';
}
```

  Run the tests and check they pass.

- [ ] **Step 3: Make the store test's rounds row overridable.** In `scorecardStore.test.ts`'s `jest.mock('@/services/supabase/client')` (~:140):
  - Change `const roundsResult = {...}` to `let roundsResult: any = {...}`, with an eslint-disable comment like the neighbouring ones.
  - Add `__setRoundsResult: (r: any) => { roundsResult = r; }` to the returned object.
  - Destructure it next to `__setPlayersResult` (~:194).
  - In the file's top-level `beforeEach`, reset it to the original value. Keep a copy of the original object as `defaultRoundsResult` inside the factory and have `__setRoundsResult(null)` restore it.

- [ ] **Step 4: Write the failing store tests.**

```ts
  describe('scoringMode', () => {
    const initSocial = () =>
      getStore().initializeRound(testRoundId, testPlayers, testHoles, 'stroke', false, [], null, 'none', new Map(), 'full', 1, 'social');

    it('defaults to standard and is set by initializeRound', async () => {
      expect(getStore().scoringMode).toBe('standard');
      await initSocial();
      expect(getStore().scoringMode).toBe('social');
    });

    it('is cleared by resetRound', async () => {
      await initSocial();
      getStore().resetRound();
      expect(getStore().scoringMode).toBe('standard');
    });
  });
```

  Also add a test inside `describe('loadFromOffline')`:
  - Call `__setRoundsResult({ data: { game_type: 'stroke', handicap_source: 'none', nine_type: 'full', selected_tee: null, course_id: null, competition_id: null, scoring_pairs_required: false }, error: null })`.
  - Arrange cached scorecards the way the neighbouring successful-load test does.
  - Assert `getStore().scoringMode === 'social'`.

- [ ] **Step 5: Run the tests and check they fail. Then implement.**
  - `scorecardStore.ts`:
    - `import type { ScoringMode } from '@/utils/scoringMode';`
    - Add `scoringMode: ScoringMode;` to `ScorecardState`.
    - Add `startHole?: number, scoringMode?: ScoringMode` to the `initializeRound` interface.
    - Initial state and `resetRound`: `scoringMode: 'standard'`.
    - The wrapper (:211) passes `scoringMode` through as the last argument.
  - `initializeRoundSlice.ts`:
    - `initializeRound` gets the trailing parameter `scoringMode: ScoringMode = 'standard',`, and `scoringMode` goes in its success `set`.
    - In `loadFromOffline`, the select (:373) becomes `'game_type, handicap_source, nine_type, selected_tee, course_id, competition_id, scoring_pairs_required'`.
    - Add `let scoringMode: ScoringMode = 'standard';`, set it with `scoringMode = deriveScoringMode(roundData);` inside `if (roundData)`, and add it to the final `set`.

- [ ] **Step 6: Thread the mode through the callers.**
  - `roundQueries.ts`: add `competitionId: string | null;` to `RoundMetadata`. In `useRoundMetadata.ts`, add `competitionId: roundData.competition_id ?? null,`. Check that `ROUND_METADATA_SELECT` includes `competition_id`; it does at :121.
  - `useRoundData.ts` (:374), after `courseHook.startHole ?? 1,`:
    ```ts
    deriveScoringMode(metadata.data
      ? { competition_id: metadata.data.competitionId, handicap_source: metadata.data.handicapSource, scoring_pairs_required: metadata.data.scoringPairsRequired }
      : null),
    ```
  - `useStartNewRound.ts` (:310): append `, 1, deriveScoringMode({ competition_id: null, handicap_source: handicapSource ?? null, scoring_pairs_required: scoringPairsConfig?.enabled ?? false })`. Read :160-185 to confirm those variable names are in scope.
  - `useStartScheduledRound.ts` (:268): append `, 1, deriveScoringMode({ competition_id: round.competition_id ?? null, handicap_source: handicapSource ?? round.handicap_source ?? null, scoring_pairs_required: round.scoring_pairs_required ?? false })`. Confirm the `round` row fields at :90-170.
  - `useMatchPlayData.ts` (:288): append `, 1, deriveScoringMode(roundData)`. `roundData` comes from `useRoundDetails`, which selects `*`.
  - `TeamMatchPlayScoringScreen` (:197): fill the missing args with `new Map(), 'full', 1,` then `deriveScoringMode(roundData)`. Use the nine type the screen knows, if it has one in scope (grep `nineType` in the file).
  - `scorecardStore.mock.ts`: add `scoringMode: ScoringMode; submittedElsewhere: boolean; mergeRemoteScorecard; pullServerScorecards` to the `MockScorecardState` **interface**. Add the values `'standard'`, `false`, `jest.fn(() => Promise.resolve())` and `jest.fn(() => Promise.resolve())`.
- [ ] **Step 7: Run the checks.**
  ```bash
  pnpm type-check && pnpm test --testPathPattern='(store/scorecardStore|utils/scoringMode|hooks/scorecard|integration)'
  ```
- [ ] **Step 8: Commit.**
  ```bash
  git add -A src && git commit -m "feat(scoring): derive and thread a social/standard scoring mode

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
  ```

---

### Task 5a: Pure remote-row rules (`applyRemoteScorecard`)

**Files:**
- Create: `src/store/remoteScorecardMerge.ts`; Test: `src/__tests__/store/remoteScorecardMerge.test.ts`

Steps 1–2 below make up this task. Commit at the end of Step 2:
```bash
git add src/store/remoteScorecardMerge.ts src/__tests__/store/remoteScorecardMerge.test.ts
git commit -m "feat(scoring): pure remote scorecard row rules (revision, final, same-edit)

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

### Task 5b (follows 5a): Store applies remote rows (`mergeRemoteScorecard`, `pullServerScorecards`, synced in one write)

**Files:**
- Modify: `src/store/scorecardStore.ts`, `src/store/scorecardPersistence.ts` (`PersistOptions.scorecard.syncedAtRevision`), `src/services/offline/dao/ScorecardDAO.ts` (`saveScorecard` options)
- Modify (test mock): `src/__tests__/store/scorecardStore.test.ts`. Extend `makeChain` with `is: jest.fn(() => Promise.resolve(result))`, add a `scorecards` table branch backed by a mutable `scorecardsResult`, and add `__setScorecardsResult` with a reset in `beforeEach`.
- Test: `src/__tests__/store/scorecardStore.test.ts`

**Interfaces:**
- Produces (`remoteScorecardMerge.ts`):
  ```ts
  export interface RemoteScorecardRow { player_id: string; scores: Record<string, HoleScore> | null; revision: number; status: string; }
  export interface RemoteMergeResult {
    scorecard: Scorecard;  // next local card (totals NOT recomputed)
    changed: boolean;      // store/SQLite must be updated
    needsUpload: boolean;  // local holes are ahead: queue the debounced upload
    becameFinal: boolean;  // a non-final local card is now final from the server
  }
  export const isFinalStatus: (status: string | undefined) => boolean;
  export function applyRemoteScorecard(local: Scorecard, remote: RemoteScorecardRow): RemoteMergeResult;
  ```
- Store:
  ```ts
  mergeRemoteScorecard: (row: RemoteScorecardRow) => Promise<void>;
  pullServerScorecards: () => Promise<RemoteScorecardRow[]>;  // fetch + apply every card of currentRoundId; returns the rows
  submittedElsewhere: boolean;  // a remote row turned the last open group card final
  ```

**Rules** (all pinned below):
- An older row (`revision <` local) never lowers anything and is a no-op, unless it's final and the local card isn't. A final row always wins.
- If the local card is already final **and** `local.serverRevision >= remote.revision`, it's a no-op. That's the echo of this phone's own submit.
- A final row adopts the server card wholesale.
- After applying a row, if nothing local is ahead, the card is saved **already synced** at that revision in the same SQLite write (`saveScorecard(card, { syncedAtRevision })`). That way no sync pass, and no crash, can catch it in an unsynced state between two steps. Otherwise the debounced upload is queued, unless the caller passes `{ queueUpload: false }` (resolver and submit).
- Rows from realtime (`mergeRemoteScorecard`) are ignored while this phone is submitting, because submit does its own pull. `submittedElsewhere` is never set while submitting.

- [ ] **Step 1: Write the failing pure tests.**

```ts
import { applyRemoteScorecard } from '@/store/remoteScorecardMerge';
import type { Scorecard } from '@/types';

const T1 = '2026-10-07T01:00:00.000Z';
const T2 = '2026-10-07T02:00:00.000Z';
const card = (over: Partial<Scorecard> = {}): Scorecard => ({
  id: 'sc-1', roundId: 'r-1', playerId: 'p-1', scores: {}, totalGross: 0, totalNet: 0,
  status: 'in-progress', createdAt: new Date(0), updatedAt: new Date(0), serverRevision: 3, ...over,
});
const row = (over: object) => ({ player_id: 'p-1', scores: {}, revision: 5, status: 'in-progress', ...over });

describe('applyRemoteScorecard', () => {
  it('merges newer server holes and adopts the server revision', () => {
    const r = applyRemoteScorecard(card({ scores: { 1: { strokes: 4, editedAt: T1 } } }), row({ scores: { '1': { strokes: 6, editedAt: T2 } } }));
    expect(r.scorecard.scores[1]).toEqual({ strokes: 6, editedAt: T2 });
    expect(r.scorecard.serverRevision).toBe(5);
    expect(r).toMatchObject({ changed: true, needsUpload: false, becameFinal: false });
  });

  it("is a no-op for an echo of this phone's own upload", () => {
    const local = card({ scores: { 1: { strokes: 4, editedAt: T1, scoredBy: 'me' } }, serverRevision: 5 });
    const r = applyRemoteScorecard(local, row({ scores: { '1': { editedAt: T1, strokes: 4 } } }));
    expect(r).toMatchObject({ changed: false, needsUpload: false, becameFinal: false });
    expect(r.scorecard).toBe(local);
  });

  it('never lowers the revision for an out-of-order older row', () => {
    const local = card({ scores: { 1: { strokes: 4, editedAt: T2 } }, serverRevision: 7 });
    const r = applyRemoteScorecard(local, row({ scores: { '1': { strokes: 6, editedAt: T1 } }, revision: 5 }));
    expect(r.scorecard).toBe(local);
    expect(r.changed).toBe(false);
  });

  it('flags an upload when local holes are ahead', () => {
    const r = applyRemoteScorecard(card({ scores: { 2: { strokes: 5, editedAt: T2 } } }), row({ scores: { '1': { strokes: 6, editedAt: T1 } } }));
    expect(r).toMatchObject({ changed: true, needsUpload: true });
  });

  it('adopts a completed server card wholesale', () => {
    const r = applyRemoteScorecard(card({ scores: { 1: { strokes: 3, editedAt: T2 } } }), row({ scores: { '1': { strokes: 6, editedAt: T1 } }, revision: 9, status: 'completed' }));
    expect(r.scorecard).toMatchObject({ status: 'completed', serverRevision: 9 });
    expect(r.scorecard.scores[1]).toEqual({ strokes: 6, editedAt: T1 });
    expect(r).toMatchObject({ changed: true, needsUpload: false, becameFinal: true });
  });

  it("is a no-op for the echo of this phone's own submit", () => {
    const local = card({ status: 'completed', serverRevision: 9, scores: { 1: { strokes: 4, editedAt: T1 } } });
    const r = applyRemoteScorecard(local, row({ status: 'completed', revision: 9, scores: { '1': { strokes: 4, editedAt: T1 } } }));
    expect(r).toMatchObject({ changed: false, becameFinal: false });
  });

  it('merges into a locally-completed card that never reached the server (failed submit)', () => {
    const local = card({ status: 'completed', serverRevision: 3, scores: { 1: { strokes: 4, editedAt: T1 } } });
    const r = applyRemoteScorecard(local, row({ revision: 5, scores: { '2': { strokes: 5, editedAt: T2 } } }));
    expect(r.scorecard.status).toBe('completed');
    expect(r.scorecard.scores[2]).toEqual({ strokes: 5, editedAt: T2 });
    expect(r).toMatchObject({ changed: true, becameFinal: false });
  });
});
```

- [ ] **Step 2: Run the tests and check they fail. Then implement** `src/store/remoteScorecardMerge.ts`.

```ts
/**
 * Apply a server scorecard row to the local card for a social round.
 * Pure. The caller recomputes totals (calculatePlayerTotals) and persists.
 *
 * Revision rule: the server revision is adopted only together with that
 * server's holes, and an older row never lowers it. A final (submitted) row
 * wins over anything local; the echo of a card this phone already holds as
 * final at that revision is a no-op.
 */
import type { HoleScore, Scorecard } from '@/types';
import { mergeScorecardScores } from '@/services/offline/sync/mergeScorecardScores';

export interface RemoteScorecardRow {
  player_id: string;
  scores: Record<string, HoleScore> | null;
  revision: number;
  status: string;
}

export interface RemoteMergeResult {
  scorecard: Scorecard;
  changed: boolean;
  needsUpload: boolean;
  becameFinal: boolean;
}

export const isFinalStatus = (status: string | undefined): boolean =>
  status === 'completed' || status === 'confirmed';

const unchanged = (local: Scorecard): RemoteMergeResult =>
  ({ scorecard: local, changed: false, needsUpload: false, becameFinal: false });

export function applyRemoteScorecard(local: Scorecard, remote: RemoteScorecardRow): RemoteMergeResult {
  const localRevision = local.serverRevision ?? 0;
  const localFinal = isFinalStatus(local.status);

  if (isFinalStatus(remote.status)) {
    if (localFinal && localRevision >= remote.revision) return unchanged(local);
    const scores: Scorecard['scores'] = {};
    for (const [key, hole] of Object.entries(remote.scores ?? {})) {
      if (hole && hole.strokes != null) scores[Number(key)] = hole;
    }
    return {
      scorecard: {
        ...local,
        scores,
        status: remote.status as Scorecard['status'],
        serverRevision: Math.max(localRevision, remote.revision),
        updatedAt: new Date(),
      },
      changed: true,
      needsUpload: false,
      becameFinal: !localFinal,
    };
  }

  if (remote.revision < localRevision) return unchanged(local);

  const merge = mergeScorecardScores(local.scores, remote.scores);
  if (!merge.localChanged && remote.revision === localRevision) {
    return { ...unchanged(local), needsUpload: merge.localAhead };
  }
  return {
    scorecard: { ...local, scores: merge.scores, serverRevision: remote.revision, updatedAt: new Date() },
    changed: true,
    needsUpload: merge.localAhead,
    becameFinal: false,
  };
}
```

  Run the tests and check they pass.

- [ ] **Step 3: Write the failing store tests** (`scorecardStore.test.ts`).

```ts
  describe('applying remote rows (social)', () => {
    const T2 = '2099-01-01T00:00:00.000Z';
    const init = (mode: 'social' | 'standard' = 'social') =>
      getStore().initializeRound(testRoundId, testPlayers, testHoles, 'stroke', false, [], null, 'none', new Map(), 'full', 1, mode);

    beforeEach(() => jest.useFakeTimers());
    afterEach(() => jest.useRealTimers());

    it('merges a row and recomputes totals canonically (pickup = net double bogey)', async () => {
      await init();
      const p = testPlayers[0].id;
      await getStore().mergeRemoteScorecard({ player_id: p, scores: { '1': { strokes: 10, editedAt: T2 } }, revision: 2, status: 'in-progress' });
      const sc = getStore().groupScorecards.get(p)!;
      expect(sc.serverRevision).toBe(2);
      // handicapSource 'none' → base handicap 0 → 0 strokes; hole 1 is par 4 → pickup = 4 + 2 = 6
      expect(sc.totalGross).toBe(6);
    });

    it('records the card as synced and queues nothing when nothing local is ahead', async () => {
      await init();
      const p = testPlayers[0].id;
      (queueScorecardSync as jest.Mock).mockClear();
      await getStore().mergeRemoteScorecard({ player_id: p, scores: { '1': { strokes: 4, editedAt: T2 } }, revision: 2, status: 'in-progress' });
      jest.advanceTimersByTime(2500);
      expect(saveScorecard).toHaveBeenLastCalledWith(
        expect.objectContaining({ id: getStore().groupScorecards.get(p)!.id }),
        { syncedAtRevision: 2 },
      );
      expect(queueScorecardSync).not.toHaveBeenCalled();
    });

    it('queues an upload when local holes are ahead', async () => {
      await init();
      const p = testPlayers[0].id;
      await getStore().setPlayerScore(p, 2, 5, 'me');
      (queueScorecardSync as jest.Mock).mockClear();
      await getStore().mergeRemoteScorecard({ player_id: p, scores: { '1': { strokes: 4, editedAt: T2 } }, revision: 2, status: 'in-progress' });
      jest.advanceTimersByTime(2500);
      expect(queueScorecardSync).toHaveBeenCalled();
    });

    it('a completed echo arriving twice causes no upload loop', async () => {
      await init();
      const p = testPlayers[0].id;
      const final = { player_id: p, scores: { '1': { strokes: 4, editedAt: T2 } }, revision: 7, status: 'completed' };
      await getStore().mergeRemoteScorecard(final);
      (saveScorecard as jest.Mock).mockClear();
      (queueScorecardSync as jest.Mock).mockClear();
      await getStore().mergeRemoteScorecard(final);
      jest.advanceTimersByTime(2500);
      expect(saveScorecard).not.toHaveBeenCalled();
      expect(queueScorecardSync).not.toHaveBeenCalled();
    });

    it('sets submittedElsewhere once every group card became final remotely', async () => {
      await init();
      for (const player of testPlayers) {
        await getStore().mergeRemoteScorecard({ player_id: player.id, scores: {}, revision: 3, status: 'completed' });
      }
      expect(getStore().submittedElsewhere).toBe(true);
    });

    it('does nothing in a standard round', async () => {
      await init('standard');
      const p = testPlayers[0].id;
      await getStore().mergeRemoteScorecard({ player_id: p, scores: { '1': { strokes: 4, editedAt: T2 } }, revision: 2, status: 'in-progress' });
      expect(getStore().groupScorecards.get(p)!.scores[1]).toBeUndefined();
    });

    it('pullServerScorecards applies every server card of the round', async () => {
      await init();
      __setScorecardsResult({ data: testPlayers.map((pl) => ({ player_id: pl.id, scores: { '1': { strokes: 4, editedAt: T2 } }, revision: 2, status: 'in-progress' })), error: null });
      await getStore().pullServerScorecards();
      for (const pl of testPlayers) expect((getStore().groupScorecards.get(pl.id)!.scores[1] as HoleScore).strokes).toBe(4);
    });

    it('a 9-hole social round recomputes merged totals nine-aware', async () => {
      // Front-9 round, profile handicap 18 (testPlayers[0]): a 9-hole DHC is ~9, not ~18.
      await getStore().initializeRound(testRoundId, testPlayers, testHoles, 'stroke', false, [], null, 'profile', new Map(), 'front9', 1, 'social');
      const p = testPlayers[0].id;
      await getStore().mergeRemoteScorecard({ player_id: p, scores: { '1': { strokes: 5, editedAt: T2 } }, revision: 2, status: 'in-progress' });
      const viaMerge = getStore().groupScorecards.get(p)!.totalNet;
      // Same score entered locally goes through applyScoreUpdate (already nine-aware): totals must match.
      getStore().resetRound();
      await getStore().initializeRound(testRoundId, testPlayers, testHoles, 'stroke', false, [], null, 'profile', new Map(), 'front9', 1, 'social');
      await getStore().setPlayerScore(p, 1, 5, 'me');
      expect(viaMerge).toBe(getStore().groupScorecards.get(p)!.totalNet);
    });

    it('no echo after this phone submitted causes a write or "submitted elsewhere"', async () => {
      await init();
      const p = testPlayers[0].id;
      const sc = getStore().groupScorecards.get(p)!;
      useScorecardStore.setState({ groupScorecards: new Map([[p, { ...sc, status: 'completed', serverRevision: 5 }]]) });
      (saveScorecard as jest.Mock).mockClear();
      await getStore().mergeRemoteScorecard({ player_id: p, scores: {}, revision: 5, status: 'completed' }); // equal
      expect(saveScorecard).not.toHaveBeenCalled();
      await getStore().mergeRemoteScorecard({ player_id: p, scores: { '1': { strokes: 4 } }, revision: 6, status: 'completed' }); // newer final
      expect(saveScorecard).toHaveBeenCalledTimes(1);
      expect(getStore().submittedElsewhere).toBe(false); // was already final locally
    });
  });
```

  Add a guest to one test: `const guest = { ...testPlayers[2], id: 'guest-1', name: 'Guest', isPlaceholder: true }`, initialised alongside `testPlayers[0]`. Assert its row merges like any player. Guests are ordinary `round_players`, and `useRoundPlayers` doesn't filter them.

- [ ] **Step 4: Run the tests and check they fail. Then implement in `scorecardStore.ts`.**
  - Imports:
    ```ts
    import { supabase } from '@/services/supabase/client';
    import { applyRemoteScorecard, isFinalStatus, type RemoteScorecardRow } from './remoteScorecardMerge';
    import { debouncedQueueScorecardSync } from './scorecardSyncDebounce';
    ```
  - Add to `ScorecardState`: `submittedElsewhere: boolean;`, `mergeRemoteScorecard: (row: RemoteScorecardRow) => Promise<void>;`, `pullServerScorecards: () => Promise<RemoteScorecardRow[]>;`.
  - Initial state and `resetRound`: `submittedElsewhere: false`.
  - Inside the `create` callback, **above `initSyncListener`**:

```ts
  /** True while this phone runs submitScorecards; remote rows are ignored meanwhile (submit pulls itself). */
  let submitting = false;

  /** Apply a remote row to the loaded social round. Returns the resulting card, or null if not applicable. */
  const applyRemoteToStore = async (
    row: RemoteScorecardRow,
    opts: { queueUpload?: boolean } = {},
  ): Promise<Scorecard | null> => {
    // The resolver and submit paths upload the merged card themselves; queueing
    // a debounced upload as well would write the same content twice.
    const queueUpload = opts.queueUpload ?? true;
    const state = get();
    if (state.scoringMode !== 'social') return null;
    const local = state.groupScorecards.get(row.player_id);
    if (!local) return null;

    const result = applyRemoteScorecard(local, row);
    if (!result.changed) {
      if (result.needsUpload && queueUpload && !local.isStandalone) {
        debouncedQueueScorecardSync(local.id, () => get().groupScorecards.get(row.player_id));
      }
      return local;
    }

    const playerTee = state.playerTeeMap.get(row.player_id) ?? state.selectedTeeData;
    const totals = calculatePlayerTotals(result.scorecard, state.holes, state.gameType, {
      selectedTee: playerTee,
      handicapSource: state.handicapSource,
      nineType: state.nineType, // 9-hole rounds: nine-aware daily handicap (I4)
    });
    const next: Scorecard = { ...result.scorecard, totalGross: totals.gross, totalNet: totals.net, total_par_score: totals.parScore };

    const cards = new Map(get().groupScorecards);
    cards.set(row.player_id, next);
    const allFinal = [...cards.values()].every((c) => isFinalStatus(c.status));
    // Never while this phone submits: its own pull/echoes are not "another phone".
    set({ groupScorecards: cards, ...(result.becameFinal && allFinal && !submitting ? { submittedElsewhere: true } : {}) });

    // Nothing local is ahead → persist it as synced at the server revision in the
    // SAME write, so no sync pass (queue or completed-card fallback) can re-upload
    // it between two steps or after a crash — that would loop between phones.
    const syncedAtRevision =
      !result.needsUpload && next.serverRevision != null ? next.serverRevision : undefined;
    await persistScorecardUpdate({
      scorecard: { scorecardId: next.id, scorecard: next, syncedAtRevision },
      context: 'applyRemoteScorecard',
    });
    if (result.needsUpload && queueUpload && !next.isStandalone) {
      debouncedQueueScorecardSync(next.id, () => get().groupScorecards.get(row.player_id));
    }
    return next;
  };

  /** Fetch every server card of the current round. */
  const fetchServerScorecards = async (roundId: string): Promise<RemoteScorecardRow[]> => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any -- generated types workaround
    const { data, error } = await (supabase.from('scorecards') as any)
      .select('player_id, scores, revision, status')
      .eq('round_id', roundId)
      .is('deleted_at', null);
    if (error) throw new Error(`Could not fetch the latest scorecards: ${error.message}`);
    return (data ?? []) as RemoteScorecardRow[];
  };
```

  - Actions:

```ts
    mergeRemoteScorecard: async (row) => {
      if (submitting) return;
      await applyRemoteToStore(row);
    },

    pullServerScorecards: async () => {
      const { currentRoundId, scoringMode } = get();
      if (!currentRoundId || scoringMode !== 'social') return [];
      const rows = await fetchServerScorecards(currentRoundId);
      for (const row of rows) await applyRemoteToStore(row);
      return rows;
    },
```

  - **Synced in one write.**
    - `ScorecardDAO.saveScorecard(scorecard, options?: { syncedAtRevision?: number })`. In its INSERT:
      - `is_synced` becomes `options?.syncedAtRevision != null ? 1 : 0`;
      - `server_revision` becomes `options?.syncedAtRevision ?? scorecard.serverRevision ?? null`.
      - Every existing caller passes no options and behaves exactly as before.
    - `scorecardPersistence.ts`: add `syncedAtRevision?: number` to `PersistOptions.scorecard`, and pass it through as `saveScorecard(scorecard.scorecard, scorecard.syncedAtRevision != null ? { syncedAtRevision: scorecard.syncedAtRevision } : undefined)`.
    - **Check:** the existing `saveScorecard` assertions in the store tests use `toHaveBeenCalledWith(card)`. A second `undefined` argument would break them, so call it with one argument when there are no options.
    - Verify the SQL against real SQLite with `sqlite3 :memory:`, using an `INSERT OR REPLACE` with `is_synced` set to `1` and `0`.

- [ ] **Step 5: Run the tests and check they pass.**
  ```bash
  pnpm test --testPathPattern='store/(scorecardStore|remoteScorecardMerge)'
  ```
- [ ] **Step 6: Commit.**
  ```bash
  git add -A src && git commit -m "feat(scoring): apply remote scorecard rows in social rounds without upload loops

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
  ```

---

### Task 5c: Stat edits sync live in social rounds

**Files:** Modify `src/store/scoreUpdateSlice.ts`; Test `src/__tests__/store/scorecardStore.test.ts`

Today `updatePlayerHoleScore` and `updateShotContributions` never queue a sync. Live updates (spec D4) need putts, stats and contributions to reach the other phone with their `editedAt`.

- [ ] **Step 1: Write the failing test.**
  ```ts
  it('stat edits queue a live upload in a social round', async () => {
    jest.useFakeTimers();
    await getStore().initializeRound(testRoundId, testPlayers, testHoles, 'stroke', false, [], null, 'none', new Map(), 'full', 1, 'social');
    (queueScorecardSync as jest.Mock).mockClear();
    await getStore().updatePlayerHoleScore(testPlayers[0].id, 1, { putts: 2 });
    jest.advanceTimersByTime(2500);
    expect(queueScorecardSync).toHaveBeenCalled();
    jest.useRealTimers();
  });
  ```
  Task 1's characterization "updatePlayerHoleScore does not queue a live sync today" (a standard round) must keep passing.
- [ ] **Step 2: Run the test and check it fails. Then implement.**
  - Add `scoringMode: ScoringMode;` to the slice's local `StoreState` (import the type).
  - After `persistScorecardUpdate` in both functions:
    ```ts
    if (get().scoringMode === 'social' && get().currentRoundId && !scorecard.isStandalone) {
      debouncedQueueScorecardSync(scorecard.id, () => get().groupScorecards.get(playerId));
    }
    ```
  - Run the tests and check they pass.
- [ ] **Step 3: Commit.**
  ```bash
  git add -A src && git commit -m "feat(scoring): stat and contribution edits sync live in social rounds

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
  ```

---

### Task 6: Conflict resolver (background sync merges instead of failing)

**Files:**
- Modify: `src/services/offline/sync/syncOrchestrator.ts`, `src/services/offline/sync/index.ts`, `src/services/offline/sync.ts`, `src/store/scorecardStore.ts`
- Modify (test mock): in `scorecardStore.test.ts`'s `jest.mock('@/services/offline/sync')` (~:99), add `setScorecardConflictResolver: jest.fn((r) => { mockConflictResolver = r; })`, plus a top-level `let mockConflictResolver: ((...a: any[]) => Promise<unknown>) | null = null;`.
  - The store registers once per module (`initSyncListener` is guarded), so **don't** reset `mockConflictResolver` in `beforeEach`.
- Test: `src/__tests__/services/offline/sync.test.ts`, `src/__tests__/store/scorecardStore.test.ts`

**Interfaces:**
- Produces (`syncOrchestrator.ts`):
  ```ts
  export type ScorecardConflictResolution =
    | { kind: 'retry'; scorecard: Scorecard }  // merged snapshot at the server revision
    | { kind: 'final' }                         // server card is final: drop the queued write
    | null;                                     // not handled: keep today's behaviour
  export type ScorecardConflictResolver = (queued: Scorecard, conflict: ScorecardConflictError) => Promise<ScorecardConflictResolution>;
  export function setScorecardConflictResolver(resolver: ScorecardConflictResolver | null): void;
  ```

- [ ] **Step 1: Write the failing sync tests** (in `describe('scorecard synced notifications')`). Import `setScorecardConflictResolver` the same way the file imports `syncAll`. Add `afterEach(() => setScorecardConflictResolver(null));`.

```ts
    describe('conflict resolver', () => {
      const conflictRpc = (status = 'in-progress') => ({
        data: [{ applied: false, conflict: true, server_revision: 6, server_status: status, server_scores: { '1': { strokes: 5 } } }],
        error: null,
      });

      it('retries a resolved conflict once with the merged snapshot and keeps no failure', async () => {
        const scorecard = createTestScorecard({ status: 'in-progress' });
        (database.getPendingSyncs as jest.Mock).mockResolvedValue([createPendingSync({ id: 4, data: scorecard })]);
        (supabase.rpc as jest.Mock).mockResolvedValueOnce(conflictRpc()).mockResolvedValue(successRpc(7));
        setScorecardConflictResolver(jest.fn().mockResolvedValue({ kind: 'retry', scorecard: { ...scorecard, serverRevision: 6 } }));

        await syncAll();

        const writes = (supabase.rpc as jest.Mock).mock.calls.filter(([fn]) => fn === 'write_scorecard_snapshot');
        expect(writes).toHaveLength(2);
        expect(writes[1][1].p_expected_revision).toBe(6);
        expect(database.markPendingSyncFailed).not.toHaveBeenCalled();
        expect(database.removePendingSync).toHaveBeenCalledWith(4, 1);
        // the merged snapshot is never written back over the queue row
        expect(database.updatePendingSyncData).not.toHaveBeenCalled();
      });

      it('drops the queued write when the server card is final', async () => {
        (database.getPendingSyncs as jest.Mock).mockResolvedValue([createPendingSync({ id: 5 })]);
        (supabase.rpc as jest.Mock).mockResolvedValue(conflictRpc('completed'));
        setScorecardConflictResolver(jest.fn().mockResolvedValue({ kind: 'final' }));

        await syncAll();

        expect(database.discardPendingSync).toHaveBeenCalledWith(5);
        expect(database.markPendingSyncFailed).not.toHaveBeenCalled();
      });

      it("keeps today's behaviour when the resolver declines", async () => {
        (database.getPendingSyncs as jest.Mock).mockResolvedValue([createPendingSync({ id: 6 })]);
        (supabase.rpc as jest.Mock).mockResolvedValue(conflictRpc());
        setScorecardConflictResolver(jest.fn().mockResolvedValue(null));

        await syncAll();

        expect(database.markPendingSyncFailed).toHaveBeenCalledWith(6, 1, expect.any(String));
      });

      it('resolves fallback-path conflicts and records the retried write as synced', async () => {
        const scorecard = createTestScorecard();
        (database.getUnsyncedScorecards as jest.Mock).mockResolvedValue([scorecard]);
        (supabase.rpc as jest.Mock).mockResolvedValueOnce(conflictRpc()).mockResolvedValue(successRpc(7));
        setScorecardConflictResolver(jest.fn().mockResolvedValue({ kind: 'retry', scorecard: { ...scorecard, serverRevision: 6 } }));

        await syncAll();

        expect(database.markScorecardAsSynced).toHaveBeenCalledWith(scorecard.id, 7);
      });

      it('marks a fallback card synced when the server copy is final', async () => {
        const scorecard = createTestScorecard();
        (database.getUnsyncedScorecards as jest.Mock).mockResolvedValue([scorecard]);
        (supabase.rpc as jest.Mock).mockResolvedValue(conflictRpc('completed'));
        setScorecardConflictResolver(jest.fn().mockResolvedValue({ kind: 'final' }));

        await syncAll();

        expect(database.markScorecardAsSynced).toHaveBeenCalledWith(scorecard.id, 6);
      });
    });
```

- [ ] **Step 2: Run the tests and check they fail. Then implement in `syncOrchestrator.ts`.**
  - Near `subscribeScorecardSynced` (~:68), add the types from Interfaces and:

```ts
let conflictResolver: ScorecardConflictResolver | null = null;

/** Register who may merge a scorecard revision conflict (the store, for social rounds). */
export function setScorecardConflictResolver(resolver: ScorecardConflictResolver | null): void {
  conflictResolver = resolver;
}

async function resolveConflict(scorecard: Scorecard, error: ScorecardConflictError): Promise<ScorecardConflictResolution> {
  if (!conflictResolver) return null;
  try {
    return await conflictResolver(scorecard, error);
  } catch (resolverError) {
    syncLogger.warn('Scorecard conflict resolver failed', {
      error: resolverError instanceof Error ? resolverError.message : String(resolverError),
    });
    return null;
  }
}

/** The server copy is final (submitted): this queued edit is obsolete. */
class FinalScorecardError extends Error {
  constructor() {
    super('Scorecard already submitted on another device');
    this.name = 'FinalScorecardError';
  }
}
```

  - `attemptPendingSync` body: the resolver goes first, then the existing explicit-retry path, unchanged:

```ts
try {
  return await processPendingSync(sync);
} catch (error) {
  if (!(error instanceof ScorecardConflictError) || sync.type !== 'scorecard' || !sync.data) throw error;

  const resolution = await resolveConflict(sync.data, error);
  if (resolution?.kind === 'final') throw new FinalScorecardError();
  if (resolution?.kind === 'retry') {
    // Retry in memory only. Never write the merged snapshot back into the queue
    // row: a tap during the merge may already have queued a newer edit there,
    // and an unconditional row update would overwrite it. If a newer edit did
    // arrive, removePendingSync's revision check leaves it pending and the
    // superseded-upload path (9609f1ee) carries the confirmed revision forward.
    return await processPendingSync({ ...sync, data: resolution.scorecard });
  }

  if (!adoptServerRevisionOnConflict) throw error;
  if (!(await refreshQueuedRevision(sync, error))) throw error;
  syncLogger.warn('Retrying queued write against the server revision', { id: sync.id, serverRevision: error.serverRevision });
  return await processPendingSync(sync);
}
```

  - In the queued loop's `catch`, **before** the `ScorecardConflictError` branch:
    ```ts
    if (error instanceof FinalScorecardError) {
      await discardPendingSync(sync.id!);
      continue;
    }
    ```
  - In the fallback loop (~:355), replace `const result = await syncScorecard(scorecard);` with:

```ts
let result;
try {
  result = await syncScorecard(scorecard);
} catch (error) {
  if (!(error instanceof ScorecardConflictError)) throw error;
  const resolution = await resolveConflict(scorecard, error);
  if (resolution?.kind === 'final') {
    await markScorecardAsSynced(scorecard.id, error.serverRevision);
    continue;
  }
  if (resolution?.kind !== 'retry') throw error;
  result = await syncScorecard(resolution.scorecard);
}
```

  - Export `setScorecardConflictResolver`, `ScorecardConflictResolution` and `ScorecardConflictResolver` from `sync/index.ts` (orchestrator block) **and** from the `sync.ts` shim.
  - Run the tests and check they pass, including Task 1's no-resolver characterization.

- [ ] **Step 3: Write the failing store resolver tests.**

```ts
  describe('conflict resolver (store side)', () => {
    const ConflictError = () => jest.requireMock('@/services/offline/sync').ScorecardConflictError;
    const conflict = (status: string, scores: Record<string, unknown>, revision = 6) =>
      new (ConflictError())({ server_revision: revision, server_status: status, server_scores: scores });
    const init = (mode: 'social' | 'standard' = 'social') =>
      getStore().initializeRound(testRoundId, testPlayers, testHoles, 'stroke', false, [], null, 'none', new Map(), 'full', 1, mode);

    it('returns a merged retry snapshot for the loaded social round', async () => {
      await init();
      const queued = getStore().groupScorecards.get(testPlayers[0].id)!;
      const res = await mockConflictResolver!(queued, conflict('in-progress', { '2': { strokes: 5, editedAt: '2099-01-01T00:00:00.000Z' } }));
      expect(res).toMatchObject({ kind: 'retry' });
      expect((res as { scorecard: Scorecard }).scorecard.serverRevision).toBe(6);
      expect(getStore().groupScorecards.get(testPlayers[0].id)!.scores[2]).toBeDefined();
    });

    it('returns final for a completed server card', async () => {
      await init();
      const queued = getStore().groupScorecards.get(testPlayers[0].id)!;
      expect(await mockConflictResolver!(queued, conflict('completed', {}))).toEqual({ kind: 'final' });
    });

    it('declines a standard round, another round, or an older server row', async () => {
      await init('standard');
      const queued = getStore().groupScorecards.get(testPlayers[0].id)!;
      expect(await mockConflictResolver!(queued, conflict('in-progress', {}))).toBeNull();
      await init('social');
      const q2 = getStore().groupScorecards.get(testPlayers[0].id)!;
      expect(await mockConflictResolver!({ ...q2, roundId: 'other' }, conflict('in-progress', {}))).toBeNull();
      useScorecardStore.setState({ groupScorecards: new Map([[testPlayers[0].id, { ...q2, serverRevision: 9 }]]) });
      expect(await mockConflictResolver!(q2, conflict('in-progress', {}, 6))).toBeNull();
    });
  });
```

- [ ] **Step 4: Run the tests and check they fail. Then implement.** In `scorecardStore.ts` `initSyncListener`, after `subscribeScorecardSynced(...)`:

```ts
    // Social rounds merge revision conflicts per hole instead of retaining them
    // as failures. Anything else declines → today's behaviour.
    setScorecardConflictResolver(async (queued, conflict) => {
      const state = get();
      if (state.scoringMode !== 'social' || queued.roundId !== state.currentRoundId) return null;
      const next = await applyRemoteToStore(
        {
          player_id: queued.playerId,
          scores: conflict.serverScores as Record<string, HoleScore>,
          revision: conflict.serverRevision,
          status: conflict.serverStatus ?? 'in-progress',
        },
        { queueUpload: false }, // the drain retries immediately
      );
      if (!next) return null;
      if (isFinalStatus(next.status) && isFinalStatus(conflict.serverStatus ?? undefined)) return { kind: 'final' };
      // An older server row left the card untouched: retrying would conflict again.
      if (next.serverRevision !== conflict.serverRevision) return null;
      return { kind: 'retry', scorecard: { ...queued, scores: next.scores, totalGross: next.totalGross, totalNet: next.totalNet, total_par_score: next.total_par_score, serverRevision: next.serverRevision } };
    });
```

  Import `setScorecardConflictResolver` from `@/services/offline/sync`. The retry snapshot keeps the queued card's sync metadata (`status`, `syncHoles` and so on) and takes the merged scores and totals.
- [ ] **Step 5: Run the checks.**
  ```bash
  pnpm type-check && pnpm test --testPathPattern='(store/scorecardStore|services/offline)'
  ```
- [ ] **Step 6: Commit.**
  ```bash
  git add -A src && git commit -m "feat(sync): merge social-round revision conflicts instead of retaining failures

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
  ```

---

### Task 7: Live merge hook on the four scoring screens

**Files:**
- Create: `src/hooks/scorecard/useLiveScorecardMerge.ts`; Test: `src/__tests__/hooks/scorecard/useLiveScorecardMerge.test.tsx`
- Modify: `src/hooks/scorecard/index.ts`; `src/screens/scoring/{ScorecardEntryScreen,MatchPlayScoringScreen,TeamMatchPlayScoringScreen,ReviewScorecardScreen}/index.tsx`

**Interfaces:**
- Produces: `useLiveScorecardMerge(roundId: string | undefined): void`. It subscribes only when `scoringMode === 'social'`, and uses a channel name distinct from `useScorecardsRealtime`'s.

- [ ] **Step 1: Write the failing test.** No existing test mocks `supabase.channel`, so mock it here. `renderHook` from `@testing-library/react-native` is the project convention.

```tsx
import { renderHook } from '@testing-library/react-native';
import { useLiveScorecardMerge } from '@/hooks/scorecard/useLiveScorecardMerge';
import { useScorecardStore } from '@/store/scorecardStore';

let mockHandler: ((payload: { new: unknown }) => void) | null = null;
jest.mock('@/services/supabase/client', () => ({
  supabase: {
    channel: jest.fn(() => {
      const ch: Record<string, unknown> = {};
      ch.on = jest.fn((_e: unknown, _f: unknown, handler: (p: { new: unknown }) => void) => { mockHandler = handler; return ch; });
      ch.subscribe = jest.fn(() => ch);
      return ch;
    }),
    removeChannel: jest.fn(),
  },
}));

describe('useLiveScorecardMerge', () => {
  const merge = jest.fn(() => Promise.resolve());
  beforeEach(() => {
    mockHandler = null;
    merge.mockClear();
    useScorecardStore.setState({ mergeRemoteScorecard: merge } as never);
  });

  it('feeds realtime rows into the store in a social round', () => {
    useScorecardStore.setState({ scoringMode: 'social' } as never);
    renderHook(() => useLiveScorecardMerge('r-1'));
    mockHandler!({ new: { player_id: 'p', scores: {}, revision: 2, status: 'in-progress', round_id: 'r-1' } });
    expect(merge).toHaveBeenCalledWith({ player_id: 'p', scores: {}, revision: 2, status: 'in-progress' });
  });

  it('ignores malformed rows', () => {
    useScorecardStore.setState({ scoringMode: 'social' } as never);
    renderHook(() => useLiveScorecardMerge('r-1'));
    mockHandler!({ new: { player_id: 'p' } });
    expect(merge).not.toHaveBeenCalled();
  });

  it('does not subscribe in a standard round', () => {
    useScorecardStore.setState({ scoringMode: 'standard' } as never);
    renderHook(() => useLiveScorecardMerge('r-1'));
    expect(mockHandler).toBeNull();
  });

  it('gives two simultaneous mounts different channel names', () => {
    useScorecardStore.setState({ scoringMode: 'social' } as never);
    const { supabase } = jest.requireMock('@/services/supabase/client');
    (supabase.channel as jest.Mock).mockClear();
    renderHook(() => useLiveScorecardMerge('r-1'));
    renderHook(() => useLiveScorecardMerge('r-1'));
    const names = (supabase.channel as jest.Mock).mock.calls.map(([n]) => n);
    expect(new Set(names).size).toBe(2);
  });
});
```

- [ ] **Step 2: Run the test and check it fails. Then implement.**

```ts
/**
 * useLiveScorecardMerge — live per-hole merge for social rounds.
 *
 * Subscribes to scorecard changes for the round and merges each row into the
 * scorecard store (last edit wins per hole). A no-op outside social rounds.
 * Uses its own channel name so it coexists with useScorecardsRealtime.
 */
import { useEffect, useRef } from 'react';
import { supabase } from '@/services/supabase/client';
import { useScorecardStore } from '@/store/scorecardStore';
import type { RemoteScorecardRow } from '@/store/remoteScorecardMerge';

export function useLiveScorecardMerge(roundId: string | undefined): void {
  const isSocial = useScorecardStore((s) => s.scoringMode === 'social');
  // Score entry and Review are mounted at the same time; supabase-js reuses a
  // channel by name, so each mount needs its own name (and its own cleanup).
  const instanceId = useRef(Math.random().toString(36).slice(2)).current;

  useEffect(() => {
    if (!roundId || !isSocial) return;
    const channel = supabase
      .channel(`scorecards-merge:round:${roundId}:${instanceId}`)
      .on(
        // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Supabase realtime generics don't infer from string literals.
        'postgres_changes' as any,
        { event: '*', schema: 'public', table: 'scorecards', filter: `round_id=eq.${roundId}` },
        (payload: { new?: Partial<RemoteScorecardRow> }) => {
          const row = payload.new;
          if (!row?.player_id || typeof row.revision !== 'number' || !row.status) return;
          void useScorecardStore.getState().mergeRemoteScorecard({
            player_id: row.player_id,
            scores: row.scores ?? null,
            revision: row.revision,
            status: row.status,
          });
        },
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [roundId, isSocial, instanceId]);
}
```

  Export it from `src/hooks/scorecard/index.ts`. Run the test and check it passes.

- [ ] **Step 3: Mount the hook.** Add `useLiveScorecardMerge(roundId);` near the top of each screen, before any early return:
  - ScorecardEntryScreen: `roundId` at :74, first early return at :667.
  - MatchPlayScoringScreen: :50, first early return at :629.
  - TeamMatchPlayScoringScreen: :53, first early return at :695.
  - ReviewScorecardScreen: :97, first early return at :357. It already imports from `@/hooks/scorecard` at :26.
- [ ] **Step 4: Run the checks and commit.**
  ```bash
  pnpm type-check && pnpm test --testPathPattern='(hooks/scorecard|screens/scoring)'
  git add -A src && git commit -m "feat(scoring): live per-hole merge on social-round scoring screens

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
  ```

---

### Task 8: Merge on open (stroke, match play, team match play)

**Files:**
- Create: `src/hooks/scorecard/pullOnOpenIfSocial.ts`; Test: `src/__tests__/hooks/scorecard/pullOnOpenIfSocial.test.ts`
- Modify: `src/hooks/scorecard/useRoundData.ts` (hydrate ~:560-656), `src/hooks/scorecard/useMatchPlayData.ts` (hydrate ~:336-415), `src/screens/scoring/TeamMatchPlayScoringScreen/index.tsx` (init effect ~:190-205)

**Interfaces:**
- Produces: `pullOnOpenIfSocial(): Promise<boolean>`. Returns `true` when the store is in social mode, after pulling and merging every server card. Errors are logged, never thrown, so the screen still opens offline. Returns `false` for standard rounds, so the caller runs its existing hydrate.
- Consumes: `pullServerScorecards` (Task 5b).

This is the "friend opens the round" step of the dead-battery scenario, so it gets its own tested unit. All three open paths call it.

- [ ] **Step 1: Write the failing tests.**

```ts
import { pullOnOpenIfSocial } from '@/hooks/scorecard/pullOnOpenIfSocial';
import { useScorecardStore } from '@/store/scorecardStore';

describe('pullOnOpenIfSocial', () => {
  const pull = jest.fn(() => Promise.resolve([]));
  beforeEach(() => {
    pull.mockClear();
    useScorecardStore.setState({ pullServerScorecards: pull } as never);
  });

  it('pulls and reports handled in a social round', async () => {
    useScorecardStore.setState({ scoringMode: 'social' } as never);
    await expect(pullOnOpenIfSocial()).resolves.toBe(true);
    expect(pull).toHaveBeenCalledTimes(1);
  });

  it('leaves standard rounds to the existing hydrate', async () => {
    useScorecardStore.setState({ scoringMode: 'standard' } as never);
    await expect(pullOnOpenIfSocial()).resolves.toBe(false);
    expect(pull).not.toHaveBeenCalled();
  });

  it('never throws when the pull fails (opening offline)', async () => {
    useScorecardStore.setState({ scoringMode: 'social' } as never);
    pull.mockRejectedValueOnce(new Error('offline'));
    await expect(pullOnOpenIfSocial()).resolves.toBe(true);
  });
});
```

- [ ] **Step 2: Run the tests and check they fail. Then implement.**

```ts
/**
 * Merge-on-open for social rounds: pull every server card and merge it per
 * hole (last edit wins), even when this phone already has scores — that is
 * how a phone that was off picks up holes entered elsewhere. Returns false for
 * standard rounds so the caller keeps its existing hydrate.
 */
import { useScorecardStore } from '@/store/scorecardStore';
import { roundDataLogger } from '@/utils/debugLogger';

export async function pullOnOpenIfSocial(): Promise<boolean> {
  const store = useScorecardStore.getState();
  if (store.scoringMode !== 'social') return false;
  try {
    await store.pullServerScorecards();
  } catch (error) {
    roundDataLogger.warn('Social round pull on open failed', {
      error: error instanceof Error ? error.message : String(error),
    });
  }
  return true;
}
```

  Export it from `src/hooks/scorecard/index.ts`. Run the tests and check they pass.

- [ ] **Step 3: Call it from the three open paths.**
  - **`useRoundData` hydrate:** at the top of the `try` in `hydrateFromSupabase`, add `if (await pullOnOpenIfSocial()) return;`.
  - **`useMatchPlayData` hydrate:** the same line at the top of its `try`. Its standard path, which only fetches completed cards, stays unchanged.
  - **`TeamMatchPlayScoringScreen`:** it has no hydrate. In its init IIFE, after `loadFromOffline` succeeds or `initializeRound` completes, and only if `!cancelled`, run `await pullOnOpenIfSocial();`. Restructure `if (cancelled || loaded) return;` so it runs on both paths.
  - **Sequencing note:** `useRoundData` only calls `initializeRound` after `useRoundMetadata` has loaded, because it returns early while the hooks are loading (:250-257). So the mode is derived from real metadata, never from a loading state. The hydrate effect runs after `isInitialized`. Don't change that ordering.
- [ ] **Step 4: Run the checks and commit.**
  ```bash
  pnpm type-check && pnpm test --testPathPattern='(hooks/scorecard|store/scorecardStore|screens/scoring)'
  git add -A src && git commit -m "feat(scoring): merge server cards on open for social rounds (stroke, match play, team match play)

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
  ```

---

### Task 9: Submit (pull first, merge conflicts, skip the gate, handle "already submitted")

**Files:**
- Modify: `src/store/scorecardStore.ts` (`submitScorecards` :371-499 and the interface), `src/services/scoreMismatch/submission.ts` (:35-49), `src/screens/scoring/ReviewScorecardScreen/hooks/useScoreSubmission.ts` (~:437, and the main submit ~:593)
- Test: `src/__tests__/store/scorecardStore.test.ts`, `src/__tests__/services/scoreMismatch/scoreMismatchService.test.ts`

**Interfaces:**
- Produces:
  - `checkSubmissionReadiness(roundId, userId, scoringPairsEnabled, holeCount?, groupPlayerIds?, options?: { socialRound?: boolean })`
  - `submitScorecards(options?) => Promise<{ alreadySubmitted: boolean }>`. It used to return `Promise<void>`. Callers that `await` and ignore the result compile unchanged.

- [ ] **Step 1: Gate (TDD).** In `scoreMismatchService.test.ts` (multi-scorer block ~:1079; `ROUND_ID` and `PLAYER_A_ID` are at :42-43), reuse the setup of the neighbouring "blocks on unresolved mismatches" test:
  ```ts
  it('skips the multi-scorer gate for social rounds', async () => {
    const readiness = await checkSubmissionReadiness(ROUND_ID, PLAYER_A_ID, false, 18, undefined, { socialRound: true });
    expect(readiness).toEqual({ canSubmit: true });
  });
  ```
  Run it and check it fails. Then:
  - Add the parameter `options: { socialRound?: boolean } = {}`.
  - After the validation throw:
    ```ts
    // Social rounds: anyone may score, last edit wins — no multi-scorer gate.
    if (options.socialRound && !scoringPairsEnabled) return { canSubmit: true };
    ```
  - In `useScoreSubmission.ts` at the `checkSubmissionReadiness(` call, pass a sixth argument: `{ socialRound: useScorecardStore.getState().scoringMode === 'social' }`.
  - Run it and check it passes.

- [ ] **Step 2: Write the failing store submit tests.**

```ts
  describe('submitScorecards (social)', () => {
    const T2 = '2099-01-01T00:00:00.000Z';
    const init = () => getStore().initializeRound(testRoundId, testPlayers, testHoles, 'stroke', false, [], null, 'none', new Map(), 'full', 1, 'social');

    it('pulls and merges the server cards before submitting', async () => {
      await init();
      const p = testPlayers[0].id;
      __setScorecardsResult({ data: [{ player_id: p, scores: { '1': { strokes: 4, editedAt: T2 } }, revision: 2, status: 'in-progress' }], error: null });
      const result = await getStore().submitScorecards();
      const sent = (syncScorecard as jest.Mock).mock.calls.find(([sc]) => sc.playerId === p)[0];
      expect(sent.scores[1].strokes).toBe(4);
      expect(sent.serverRevision).toBe(2);
      expect(result).toEqual({ alreadySubmitted: false });
    });

    it('adopts the final cards and reports alreadySubmitted when the server cards are all final', async () => {
      await init();
      __setScorecardsResult({ data: testPlayers.map((pl) => ({ player_id: pl.id, scores: {}, revision: 3, status: 'completed' })), error: null });
      const result = await getStore().submitScorecards();
      expect(result).toEqual({ alreadySubmitted: true });
      expect(syncScorecard).not.toHaveBeenCalled();
      expect(getStore().submittedElsewhere).toBe(false); // the caller's success navigation handles it
    });

    it('a retry after a failed submit still submits (local completed ≠ server final)', async () => {
      await init();
      (syncScorecard as jest.Mock).mockRejectedValueOnce(new Error('network'));
      await expect(getStore().submitScorecards()).rejects.toThrow();
      __setScorecardsResult({ data: [], error: null });
      (syncScorecard as jest.Mock).mockClear();
      await expect(getStore().submitScorecards()).resolves.toEqual({ alreadySubmitted: false });
      expect(syncScorecard).toHaveBeenCalled();
    });

    it("ignores its own completed echoes while submitting (no 'submitted elsewhere')", async () => {
      await init();
      (syncScorecard as jest.Mock).mockImplementation(async (sc: Scorecard) => {
        await getStore().mergeRemoteScorecard({ player_id: sc.playerId, scores: {}, revision: 5, status: 'completed' });
        return { serverRevision: 5 };
      });
      await getStore().submitScorecards();
      expect(getStore().submittedElsewhere).toBe(false);
    });

    it('submits even when the pre-submit pull fails (weak signal)', async () => {
      await init();
      const { supabase } = jest.requireMock('@/services/supabase/client');
      (supabase.from as jest.Mock).mockImplementationOnce(() => { throw new Error('network'); });
      await expect(getStore().submitScorecards()).resolves.toEqual({ alreadySubmitted: false });
      expect(syncScorecard).toHaveBeenCalled();
    });

    it('a conflict during submit keeps the merged scores in the store', async () => {
      await init();
      const p = testPlayers[0].id;
      await getStore().setPlayerScore(p, 1, 4, 'me');
      const ConflictError = jest.requireMock('@/services/offline/sync').ScorecardConflictError;
      (syncScorecard as jest.Mock)
        .mockRejectedValueOnce(new ConflictError({ server_revision: 6, server_status: 'in-progress', server_scores: { '2': { strokes: 5, editedAt: T2 } } }))
        .mockResolvedValue({ serverRevision: 7 });
      await getStore().submitScorecards({ playerIds: [p] });
      const sc = getStore().groupScorecards.get(p)!;
      expect(sc.scores[2]).toEqual({ strokes: 5, editedAt: T2 });
      expect(sc.serverRevision).toBe(7);
    });
  });
```

  Also confirm the existing standard-round `describe('submitScorecards')` tests (~:1027) still pass unchanged.

- [ ] **Step 3: Run the tests and check they fail. Then implement `submitScorecards`.**
  - Change the interface return type to `Promise<{ alreadySubmitted: boolean }>`.
  - Restructure the action:

```ts
    submitScorecards: async (options) => {
      const initial = get();
      if (!initial.currentRoundId) {
        storeLogger.error('Cannot submit - no round ID set');
        throw new Error('No round ID set');
      }
      const currentRoundId = initial.currentRoundId;
      const social = initial.scoringMode === 'social';
      const scopeIds = options?.playerIds;
      const targetIds = scopeIds && scopeIds.length > 0 ? new Set(scopeIds) : null;
      const inScope = (playerId: string) => !targetIds || targetIds.has(playerId);

      submitting = true; // before the pull: our own pull/echoes must not raise "submitted elsewhere"
      try {
        // Social rounds: pull everyone's latest edits first. Cards the SERVER
        // already holds as final were submitted by another phone — adopt them.
        const serverFinalIds = new Set<string>();
        if (social && getIsOnline()) {
          // The pull is an optimisation (conflicts still merge), so a flaky
          // connection must not block a submit that standard rounds would allow.
          let rows: RemoteScorecardRow[] = [];
          try {
            rows = await get().pullServerScorecards();
          } catch (pullError) {
            storeLogger.warn('Pre-submit pull failed; submitting without it', {
              error: pullError instanceof Error ? pullError.message : String(pullError),
            });
          }
          for (const row of rows) if (isFinalStatus(row.status)) serverFinalIds.add(row.player_id);
          const scoped = [...get().groupScorecards.keys()].filter(inScope);
          if (scoped.length > 0 && scoped.every((id) => serverFinalIds.has(id))) {
            return { alreadySubmitted: true };
          }
        }

        const { groupScorecards, selectedTeeData, holes, gameType, nineType } = get();
        // … existing body from "storeLogger.info('Submitting scorecards'" through the
        //    end of the loop and the final set/logging, with the changes below …

        // Realtime rows are ignored while submitting; pick up anything that
        // arrived meanwhile (e.g. out-of-scope players). Still `submitting`, so
        // this can't raise "submitted elsewhere".
        if (social && getIsOnline()) await get().pullServerScorecards().catch(() => undefined);
        return { alreadySubmitted: false };
      } finally {
        submitting = false;
      }
    },
```

  - Changes inside the existing loop:
    - Skip cards the server already holds as final. Social only, so standard rounds are unaffected:
      ```ts
      if (!inScope(playerId) || serverFinalIds.has(playerId)) continue;
      ```
      This replaces the existing `targetIds` check.
    - In the conflict `catch`, keep the standard branch as the `else`:

```ts
              if (social) {
                const next = await applyRemoteToStore(
                  {
                    player_id: playerId,
                    scores: error.serverScores as Record<string, HoleScore>,
                    revision: error.serverRevision,
                    status: error.serverStatus ?? 'in-progress',
                  },
                  { queueUpload: false }, // submit uploads it right here
                );
                const merged = next ?? scorecard;
                if (isFinalStatus(error.serverStatus ?? undefined)) {
                  newScorecards.set(playerId, merged); // another phone submitted it first
                  successCount++;
                  continue;
                }
                updatedScorecard.scores = merged.scores;
                updatedScorecard.totalGross = merged.totalGross;
                updatedScorecard.totalNet = merged.totalNet;
                updatedScorecard.total_par_score = merged.total_par_score;
                result = await syncScorecard({ ...updatedScorecard, serverRevision: error.serverRevision });
              } else {
                // existing local-wins retry, unchanged
              }
```

    - `updatedScorecard` is declared `const` but is an object, so mutating its fields is fine. The existing lines after the retry (`updatedScorecard.serverRevision = result.serverRevision; newScorecards.set(playerId, updatedScorecard)`) then store the **merged** card.
    - The `continue` sits inside the per-player `try` inside the `for`; check that it compiles.
  - Leave the existing `if (errorCount > 0) throw …` in place, inside the `try`. The `finally` still clears `submitting`.

- [ ] **Step 4: Run the tests and check they pass.**
  ```bash
  pnpm test --testPathPattern='(store/scorecardStore|services/scoreMismatch)'
  ```
- [ ] **Step 4b: Verify the finishing side effects are safe on both phones (read, then decide).**
  - In `useScoreSubmission.ts`, the success path after `submitScorecards` runs:
    - `updateRoundStatus(roundId)` (~:598);
    - `finalizeRoundResults(roundId)` (~:607);
    - `checkRoundAchievements(roundId)`;
    - `finalizeSkinsForRound(roundId)` (~:658), plus the wolf equivalent if present.

    Locate each function's definition (`grep -rn "updateRoundStatus\|finalizeRoundResults\|finalizeSkinsForRound" src`) and read it.
  - **Rule:** if a function recomputes from server data and upserts, or is guarded so a second call does nothing harmful, it's **idempotent**. Then the `alreadySubmitted` path keeps running it, which also self-heals a round whose first submitter's finishing calls failed (for example after losing signal straight after submit). If it's **not** idempotent (it double-pays skins, duplicates rows, or double-awards achievements), skip it when `alreadySubmitted` is true.
  - Write the finding into the Step 6 commit message, one line per function.
  - **Already verified at planning time:** the "Round Complete" push can't fire twice. `trigger_notify_round_completed` fires only `WHEN (OLD.status IS DISTINCT FROM 'completed' AND NEW.status = 'completed')` (`20260301000000_league_notification_triggers.sql:690-694`), and the function has its own already-notified guard. The adopt and drop paths write nothing.
  - **Skins:** they're settled at submit from server cards, after the upload, so they see the merged final cards. Live skins standings come from store cards, so merges update them.

- [ ] **Step 5: Tell the user once (ReviewScorecard only).** In `useScoreSubmission.ts` at the main submit (~:593), capture the result:
  ```ts
  const { alreadySubmitted } = await submitScorecards({ playerIds: submitScopeIds });
  ```
  If it's true, show the hook's existing success or info feedback with the text "This round was already submitted on another phone". Find how the hook reports success (toast or `Alert`) and reuse it, then continue to the normal success navigation.
  - The other 6 callers need no change. They `await` and then navigate as on success, which is correct.
- [ ] **Step 6: Run the checks and commit.**
  ```bash
  pnpm type-check && pnpm test --testPathPattern='(store/scorecardStore|services/scoreMismatch|screens/scoring)'
  git add -A src && git commit -m "feat(scoring): social submit pulls first, merges conflicts, skips the gate, adopts a prior submit

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
  ```

---

### Task 10: "Submitted on another phone" redirect

**Files:**
- Create: `src/hooks/scorecard/useSubmittedElsewhereRedirect.ts`; Test: `src/__tests__/hooks/scorecard/useSubmittedElsewhereRedirect.test.tsx`
- Modify: the 4 screens; `src/hooks/scorecard/index.ts`

**Interfaces:**
- Produces: `useSubmittedElsewhereRedirect(roundId: string | undefined, competitionId?: string | null): void`.
- Consumes: `submittedElsewhere` (Task 5b), and `buildPostSubmitResetState(roundId, competitionId?)` (`src/navigation/postSubmitNavigation.ts:28`), which treats `'standalone'` and null as non-competition.

- [ ] **Step 1: Write the failing test.**

```tsx
import { renderHook, act } from '@testing-library/react-native';
import { Alert } from 'react-native';
import { useSubmittedElsewhereRedirect } from '@/hooks/scorecard/useSubmittedElsewhereRedirect';
import { useScorecardStore } from '@/store/scorecardStore';

const mockReset = jest.fn();
jest.mock('@react-navigation/native', () => ({ useNavigation: () => ({ reset: mockReset }) }));

describe('useSubmittedElsewhereRedirect', () => {
  beforeEach(() => {
    mockReset.mockClear();
    jest.spyOn(Alert, 'alert').mockImplementation((_t, _m, buttons) => buttons?.[0]?.onPress?.());
  });

  it('alerts once and resets to ViewRound when another phone submits', () => {
    useScorecardStore.setState({ submittedElsewhere: false } as never);
    renderHook(() => useSubmittedElsewhereRedirect('r-1', null));
    act(() => { useScorecardStore.setState({ submittedElsewhere: true } as never); });
    act(() => { useScorecardStore.setState({ submittedElsewhere: true } as never); });
    expect(Alert.alert).toHaveBeenCalledTimes(1);
    expect(mockReset).toHaveBeenCalledWith(expect.objectContaining({
      routes: expect.arrayContaining([expect.objectContaining({ name: 'ViewRound' })]),
    }));
  });
});
```

- [ ] **Step 2: Run the test and check it fails. Then implement.**

```ts
/**
 * When another phone submits a social round, its cards arrive as final via
 * the live merge (store.submittedElsewhere). Tell the user once and leave the
 * scoring flow for the round summary — local edits can no longer be saved.
 */
import { useEffect, useRef } from 'react';
import { Alert } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { useScorecardStore } from '@/store/scorecardStore';
import { buildPostSubmitResetState } from '@/navigation/postSubmitNavigation';

export function useSubmittedElsewhereRedirect(roundId: string | undefined, competitionId?: string | null): void {
  const navigation = useNavigation();
  const submittedElsewhere = useScorecardStore((s) => s.submittedElsewhere);
  const shownRef = useRef(false);

  useEffect(() => {
    if (!submittedElsewhere || !roundId || shownRef.current) return;
    shownRef.current = true;
    Alert.alert('Round submitted', 'This round was submitted on another phone.', [
      {
        text: 'View round',
        // eslint-disable-next-line @typescript-eslint/no-explicit-any -- reset state is typed for the root stack
        onPress: () => (navigation as any).reset(buildPostSubmitResetState(roundId, competitionId)),
      },
    ]);
  }, [submittedElsewhere, roundId, competitionId, navigation]);
}
```

  Export it, run the test and check it passes.

- [ ] **Step 3: Mount the hook.** Add `useSubmittedElsewhereRedirect(roundId, competitionId ?? null)` before any early return:
  - ScorecardEntryScreen: `competitionId` at :74.
  - MatchPlayScoringScreen: :50. It may be undefined, and the helper handles that.
  - TeamMatchPlayScoringScreen: **after** `competitionId` is derived at :86, still before the first early return at :695.
  - ReviewScorecardScreen: use its route or store `competitionId`. Grep the file; pass `null` if none is in scope.
- [ ] **Step 4: Run the checks and commit.**
  ```bash
  pnpm type-check && pnpm test --testPathPattern='(hooks/scorecard|screens/scoring)'
  git add -A src && git commit -m "feat(scoring): leave the scoring flow when another phone submits a social round

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
  ```

---

### Task 11: Dead-battery scenario with two phones through the real store

**Files:**
- Modify: `src/__tests__/store/scorecardStore.test.ts` (a new describe at the end)

This runs the **real** store code on **two phones**:
- **Phone B** is the file's normal store (`getStore()`).
- **Phone A** is a second, independent copy of the store module, loaded with `jest.isolateModules`.

Both share one fake server behind the mocked `syncScorecard` and Supabase `scorecards` select. The fake server enforces the RPC's revision and completed-is-final rules.

Coverage elsewhere: the queue-level drop of A's stale queued row (`discardPendingSync` on `kind: 'final'`) is pinned in Task 6's sync tests. This scenario pins everything else end to end.

- [ ] **Step 1: Write the scenario.**

```ts
  describe('scenario: phone A dies after 9 holes, phone B finishes and submits (social)', () => {
    const at = (m: number) => new Date(Date.UTC(2026, 9, 7, 1, m)).toISOString();
    type Row = { scores: Record<string, HoleScore>; revision: number; status: string };

    it('both phones end with the same final cards, no hole lost, no loop', async () => {
      const [sam, friend] = testPlayers;
      const guest = { ...testPlayers[2], id: 'guest-1', name: 'Guest', isPlaceholder: true };
      const players = [sam, friend, guest];
      const server = new Map<string, Row>(players.map((pl) => [pl.id, { scores: {}, revision: 0, status: 'in-progress' }]));
      const rows = () => [...server].map(([player_id, r]) => ({ player_id, ...r }));
      const write = (sc: Scorecard) => {
        const ConflictError = jest.requireMock('@/services/offline/sync').ScorecardConflictError;
        const row = server.get(sc.playerId)!;
        if ((sc.serverRevision ?? 0) !== row.revision || (row.status === 'completed' && sc.status !== 'completed')) {
          throw new ConflictError({ server_revision: row.revision, server_status: row.status, server_scores: row.scores });
        }
        const scores = Object.fromEntries(Object.entries(sc.scores).map(([k, v]) => [k, v as HoleScore]));
        server.set(sc.playerId, { scores, revision: row.revision + 1, status: sc.status });
        return { serverRevision: row.revision + 1 };
      };
      (syncScorecard as jest.Mock).mockImplementation(async (sc: Scorecard) => write(sc));
      const init = (store: typeof useScorecardStore) =>
        store.getState().initializeRound(testRoundId, players, testHoles, 'stroke', false, [], null, 'none', new Map(), 'full', 1, 'social');

      // ── Phone A: its own store instance. Scores holes 1–9 for everyone and uploads each card.
      let phoneA!: typeof useScorecardStore;
      jest.isolateModules(() => {
        phoneA = require('@/store/scorecardStore').useScorecardStore;
      });
      await init(phoneA);
      const resolverA = mockConflictResolver!; // A registered last
      for (let h = 1; h <= 9; h++) {
        for (const pl of players) await phoneA.getState().setPlayerScore(pl.id, h, 4, sam.id);
      }
      for (const pl of players) {
        const card = phoneA.getState().groupScorecards.get(pl.id)!;
        const { serverRevision } = write(card); // the drain A completed before its battery died
        phoneA.setState({ groupScorecards: new Map(phoneA.getState().groupScorecards).set(pl.id, { ...card, serverRevision }) });
      }
      // A's last edit never uploads.
      await phoneA.getState().setPlayerScore(sam.id, 9, 5, sam.id);

      // ── Phone B: opens the round, pulls, finishes 10–18 for everyone, submits.
      await init(useScorecardStore);
      __setScorecardsResult({ data: rows(), error: null });
      await getStore().pullServerScorecards();
      for (let h = 10; h <= 18; h++) {
        for (const pl of players) await getStore().setPlayerScore(pl.id, h, 3, friend.id);
      }
      __setScorecardsResult({ data: rows(), error: null });
      await expect(getStore().submitScorecards()).resolves.toEqual({ alreadySubmitted: false });

      for (const pl of players) {
        expect(server.get(pl.id)!.status).toBe('completed');
        expect(Object.keys(server.get(pl.id)!.scores)).toHaveLength(18);
      }
      expect((server.get(sam.id)!.scores['9'] as HoleScore).strokes).toBe(4); // submit is final

      // ── Phone A comes back. Its stale write for sam conflicts: the resolver says final.
      const staleA = phoneA.getState().groupScorecards.get(sam.id)!;
      const finalSam = server.get(sam.id)!;
      const ConflictError = jest.requireMock('@/services/offline/sync').ScorecardConflictError;
      await expect(
        resolverA(staleA, new ConflictError({ server_revision: finalSam.revision, server_status: 'completed', server_scores: finalSam.scores })),
      ).resolves.toEqual({ kind: 'final' });
      // The live merge brings A's other cards to final.
      for (const r of rows()) await phoneA.getState().mergeRemoteScorecard(r);

      // ── Both phones converge; A is told; nothing loops.
      for (const pl of players) {
        expect(phoneA.getState().groupScorecards.get(pl.id)!.scores).toEqual(getStore().groupScorecards.get(pl.id)!.scores);
      }
      expect(phoneA.getState().submittedElsewhere).toBe(true);
      expect(getStore().submittedElsewhere).toBe(false);
      (saveScorecard as jest.Mock).mockClear();
      (queueScorecardSync as jest.Mock).mockClear();
      for (const r of rows()) {
        await phoneA.getState().mergeRemoteScorecard(r);
        await getStore().mergeRemoteScorecard(r);
      }
      expect(saveScorecard).not.toHaveBeenCalled();
      expect(queueScorecardSync).not.toHaveBeenCalled();
    });
  });
```

  **Notes for the implementer:**
  - `jest.isolateModules` gives phone A its own store module. The mocked modules (`@/services/offline/sync`, `@/services/offline/database`, `@/services/supabase/client`) may be re-instantiated inside the isolated registry. If assertions on `saveScorecard` or `queueScorecardSync` miss phone A's calls, take those mocks from `jest.requireMock` inside the isolate block as well and assert on both.
  - `mockConflictResolver` is captured right after `init(phoneA)`, because the last store to register wins.
  - Phone A is never online when phone B pulls, so phone A's last edit (hole 9 = 5) is correctly lost: submitting is final.
  - If `testHoles` doesn't have 18 holes, use `testHoles.length`.

- [ ] **Step 2: Run it.**
  ```bash
  pnpm test --testPathPattern='store/scorecardStore' -t 'scenario'
  ```
  Expected: PASS. If it fails, fix the production code from Tasks 3, 5a, 5b, 6 or 9, unless the test contradicts the spec.
- [ ] **Step 3: Commit.**
  ```bash
  git add src/__tests__/store/scorecardStore.test.ts && git commit -m "test: two-phone dead-battery social round scenario through the real store

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
  ```

---

### Task 12: Docs and final verification

- [ ] **Step 1: Update `docs/guides/OFFLINE_ARCHITECTURE.md`.** Add a section "Scorecard revisions and social-round merging" covering:
  - **The write path:** `write_scorecard_snapshot`, with `p_expected_revision` and its conflict and status rules.
  - **Conflicts in standard rounds:** retained as failed rows, recovered at submit, by Retry, or from Developer → Retained Uploads.
  - **Superseded uploads:** a newer edit landing mid-upload keeps the confirmed revision (9609f1ee).
  - **Social rounds:**
    - each hole carries `editedAt`;
    - the merge and same-edit rules, and the revision-adoption rule;
    - "mark synced after merge" (no loops);
    - the merge points: conflict resolver, realtime, pull on open and before submit;
    - completed cards are final.
- [ ] **Step 2: Update `CLAUDE.md`.** In "Scoring changes (guardrails)" step 5, extend the scoring-subset command to:
  ```
  pnpm test --testPathPattern='(golden|services/scoring|utils/(scoring|dailyHandicap|subMatches)|components/scorecard|store/scorecardStore|services/offline|services/scoreMismatch)'
  ```
- [ ] **Step 3: Run the full verification.**
  ```bash
  pnpm type-check
  pnpm test --testPathPattern='(golden|services/scoring|utils/(scoring|dailyHandicap|subMatches)|components/scorecard|store/scorecardStore|services/offline|services/scoreMismatch)'
  pnpm test --silent 2>&1 | grep -E "^FAIL|^Tests:" | sort -u
  pnpm verify:gate
  ```
  Expected: everything passes except the known `syncUtils.test.ts` (4 tests). Report it by name.
- [ ] **Step 4: Commit.**
  ```bash
  git add docs/guides/OFFLINE_ARCHITECTURE.md CLAUDE.md && git commit -m "docs: document revision-checked sync and social-round merging

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
  ```
- [ ] **Step 5: Hand over for device QA.** Do not merge into main. Report the branch name and the on-device QA list from spec §8.
