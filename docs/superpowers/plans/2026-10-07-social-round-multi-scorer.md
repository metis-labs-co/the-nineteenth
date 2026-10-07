# Social Round Multi-Scorer Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** In social rounds, anyone in the round can score anyone. Each hole keeps its last edit, every phone converges live, and the "changed on another device" banner never appears.

**Architecture:**
- Every hole score carries an `editedAt` timestamp, stamped by the store.
- One pure `mergeScorecardScores(local, server)` decides each hole: the newer edit wins.
- The merge runs in four places, only when the store's `scoringMode === 'social'`:
  1. When an upload is rejected as a revision conflict. The store registers a conflict resolver with the sync layer.
  2. On realtime scorecard changes.
  3. When a round is opened (hydrate).
  4. Before submit.
- Totals are always recalculated by the store's canonical `calculatePlayerTotals`. There is no server change.

**Tech Stack:** Expo/React Native, TypeScript, Zustand, expo-sqlite, Supabase (Postgres RPC and Realtime), Jest.

**Spec:** `docs/superpowers/specs/2026-10-07-social-round-multi-scorer-design.md`. Read it first.

**Worktree:** `/Users/samkay/Documents/MetisCo/Dev/the-nineteenth-social-multi-scorer`, branch `feature/social-round-multi-scorer`. Run every command from there. Dependencies are already installed; if not, run `pnpm install --frozen-lockfile`. **Never symlink `node_modules`.**

## Global Constraints

- **Definition of a social round:** `competition_id IS NULL` AND `handicap_source = 'none'` AND `scoring_pairs_required = false`. Anything unknown means `'standard'`.
- **Standard rounds behave exactly as today.** These are handicap, competition and scoring-pairs rounds. Every behaviour change is gated on `scoringMode === 'social'`.
- **Never adopt a server revision without merging that server's holes into the same local card first.**
- **`score_entries` stays single-writer.** The batched `syncScoreEntries` is its only writer (commit 5d21c6fa). Do not add `saveScoreEntry` calls anywhere.
- **Scoring math lives only in `calculatePlayerTotals`** (`src/store/utils/scorecardCalculations.ts`). The merge never computes totals.
- **No Supabase migrations.** The local SQLite migration for `edited_at` is allowed.
- **Scoring guardrails (CLAUDE.md):** run the impact analysis before editing the store slices, and write characterization tests before changing behaviour.
- **Commits:** end every message with `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`.
- **Imports:** `@/services/offline/sync` resolves to the shim **file** `src/services/offline/sync.ts`. A new sync export must be added there **and** in `src/services/offline/sync/index.ts`.
- **Known failure:** `src/__tests__/services/sync/syncUtils.test.ts` already fails 4 tests on main (a daylight-saving date bug). Ignore it, but name it in reports.

## Deliberate deviations from the spec (agreed when planning)

1. **No local `scoring_mode` column (spec 5.2).** `loadFromOffline` already bails out when it can't fetch the round's metadata, and falls back to network init, which has the metadata. So the mode is always derivable from data the round fetches anyway. The plan derives it in both paths.
2. **Multi-ball holes are not stamped or merged.** `scoresForDb` uploads single-ball scores only (`scorecardSync.ts` ~:154), so multi-ball holes never arrive from the server. The merge keeps any hole that only one side has.
3. **The gate skip is done through an option on `checkSubmissionReadiness`.** The service stays testable, and `useScoreSubmission` passes the option.

## Review Focus

These are the conditions the spec implies that are most likely to bite. Each has a pinned test in the task named.

1. **An echo of this phone's own upload arrives through realtime.** The merge must be a no-op, with no re-upload and no revision regression. *Pinned in Task 5.*
2. **A realtime row with an older revision than the local card, arriving out of order.** It must never lower `serverRevision`. *Pinned in Task 5.*
3. **A conflict for a scorecard whose round isn't the loaded round** (the user navigated away). It must keep today's retained-failure behaviour. *Pinned in Task 6.*
4. **A server card already `completed` while this phone still has queued edits.** The queued row is dropped, with no banner and no retained failure. *Pinned in Task 6.*
5. **Holes from 1.14.0 with no `editedAt`.** They lose to any stamped edit; when both are unstamped, the server wins. *Pinned in Task 3.*

---

## File structure

| File | Responsibility |
|---|---|
| `src/utils/scoringMode.ts` (new) | `ScoringMode` type and `deriveScoringMode(round)`. The one place "social" is defined. |
| `src/services/offline/sync/mergeScorecardScores.ts` (new) | Pure per-hole last-edit-wins merge. |
| `src/services/offline/sync/syncOrchestrator.ts` | `setScorecardConflictResolver`, and calling it on conflicts in the queued and fallback paths. |
| `src/services/offline/sync.ts`, `src/services/offline/sync/index.ts` | Re-export the resolver API. |
| `src/services/offline/sync/scorecardSync.ts` | Upload `editedAt` in `scoresForDb`. |
| `src/services/offline/schema/migrations.ts`, `src/services/offline/dao/HoleScoreDAO.ts` | Local `edited_at` column read and write. |
| `src/types/database/base.ts` | `HoleScore.editedAt`. |
| `src/store/scoreUpdateSlice.ts` | Stamp `editedAt` in `applyScoreUpdate`. |
| `src/store/initializeRoundSlice.ts` | Thread `scoringMode`; derive it in `loadFromOffline`. |
| `src/store/scorecardStore.ts` | `scoringMode`, `submittedElsewhere`, `mergeRemoteScorecard`, resolver registration, submit-time merge. |
| `src/store/remoteScorecardMerge.ts` (new) | Pure helper: apply a remote row to a local card and return the next card plus flags. Keeps `scorecardStore.ts` from growing. |
| `src/hooks/scorecard/useLiveScorecardMerge.ts` (new) | Realtime subscription that feeds `mergeRemoteScorecard`. |
| `src/hooks/scorecard/useSubmittedElsewhereRedirect.ts` (new) | When another phone submits, show an alert and reset to ViewRound. |
| `src/hooks/scorecard/useRoundData.ts`, `useRoundMetadata.ts` | Pass the mode to init; merge on open for social rounds. |
| `src/types/supabase/roundQueries.ts` | `RoundMetadata.competitionId`. |
| Start hooks: `useStartNewRound.ts`, `useStartSocialRound.ts`, `useStartScheduledRound.ts`, `useMatchPlayData.ts`, `TeamMatchPlayScoringScreen/index.tsx` | Pass the mode to `initializeRound`. |
| `src/services/scoreMismatch/submission.ts`, `ReviewScorecardScreen/hooks/useScoreSubmission.ts` | Skip the multi-scorer gate for social rounds. |
| Screens: `ScorecardEntryScreen`, `MatchPlayScoringScreen`, `TeamMatchPlayScoringScreen`, `ReviewScorecardScreen` | Mount the live merge and the redirect hooks. |
| `src/__tests__/integration/socialMultiScorer.test.ts` (new) | Dead-battery scenario against a fake revision-enforcing server. |
| `docs/guides/OFFLINE_ARCHITECTURE.md`, `CLAUDE.md` | Documentation. |

---

### Task 0: Guardrail preflight (no code)

**Files:** none changed.

- [ ] **Step 1: Run the impact analysis.** Dispatch the `scoring-impact-analyst` agent on these files and paste its blast-radius summary into your task report:
  - `src/store/scoreUpdateSlice.ts`
  - `src/store/scorecardStore.ts`
  - `src/store/initializeRoundSlice.ts`
  - `src/services/offline/sync/syncOrchestrator.ts`
  - `src/services/offline/sync/scorecardSync.ts`
  - `src/services/scoreMismatch/submission.ts`
  - `src/hooks/scorecard/useRoundData.ts`

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

**Interfaces:** none.

These tests must **pass on the unchanged code**. They exist so later tasks can't silently change standard-round behaviour.

- [ ] **Step 1: Add store characterization tests.** Add them to `scorecardStore.test.ts`, inside the top-level describe and next to the existing `describe('initializeRound')` (~:261). Use the file's existing `testRoundId`, players and holes fixtures from the `beforeEach` at ~:226. Read that block first and reuse its variable names.

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

    it('setPlayerScore builds the hole from strokes, existing stats and scorer', async () => {
      // Arrange a round with one player via the file's normal initializeRound helper/fixture.
      await getStore().initializeRound(testRoundId, mockPlayers, mockHoles, 'stroke');
      const playerId = mockPlayers[0].id;
      await getStore().updatePlayerHoleScore(playerId, 1, { strokes: 4, putts: 2 });
      await getStore().setPlayerScore(playerId, 1, 5, 'scorer-1');
      const hole = getStore().groupScorecards.get(playerId)!.scores[1] as HoleScore;
      expect(hole.strokes).toBe(5);
      expect(hole.putts).toBe(2);
      expect(hole.scoredBy).toBe('scorer-1');
    });
  });
```

  If the fixture names differ (for example `players` or `holes`), rename to match the file. Don't create new fixtures.

- [ ] **Step 2: Add sync characterization tests.** Add them to `sync.test.ts`, inside the `describe` that defines `successRpc` (~:418), after the "when a newer edit arrives during the upload" block.

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

    it('uploads scores without an editedAt field today', async () => {
      const scorecard = createTestScorecard({ status: 'in-progress', scores: { 1: { strokes: 4 } } });
      (database.getPendingSyncs as jest.Mock).mockResolvedValue([createPendingSync({ data: scorecard })]);
      (supabase.rpc as jest.Mock).mockResolvedValue(successRpc(1));

      await syncAll();

      const write = (supabase.rpc as jest.Mock).mock.calls.find(([fn]) => fn === 'write_scorecard_snapshot');
      expect(write[1].p_snapshot.scores['1']).not.toHaveProperty('editedAt');
    });
```

  Task 2 flips the last test, on purpose.

- [ ] **Step 3: Run them and check they pass.**
  ```bash
  pnpm test --testPathPattern='(store/scorecardStore|services/offline/sync.test)'
  ```
  Expected: PASS. If one fails, the test is wrong, not the code. Fix the test to describe what the code currently does.
- [ ] **Step 4: Commit.**
  ```bash
  git add src/__tests__/store/scorecardStore.test.ts src/__tests__/services/offline/sync.test.ts
  git commit -m "test: characterize standard-round store and sync behaviour before social merge

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
  ```

---

### Task 2: Per-hole `editedAt` (stamp, persist, upload)

**Files:**
- Modify: `src/types/database/base.ts` (`HoleScore`, ~:82)
- Modify: `src/store/scoreUpdateSlice.ts` (`applyScoreUpdate` :35-71, and the four `persistScorecardUpdate` calls)
- Modify: `src/services/offline/schema/migrations.ts` (append version 19)
- Modify: `src/services/offline/schema/tables.ts` (add `edited_at TEXT` to `hole_scores` CREATE)
- Modify: `src/services/offline/dao/HoleScoreDAO.ts` (`saveHoleScore`, `getHoleScores`)
- Modify: `src/services/offline/sync/scorecardSync.ts` (`scoresForDb`, ~:137-168)
- Test: `src/__tests__/store/scorecardStore.test.ts`, `src/__tests__/services/offline/sync.test.ts`

**Interfaces:**
- Produces: `HoleScore.editedAt?: string` (ISO 8601). Every store write through `applyScoreUpdate` sets it to `new Date().toISOString()`.

- [ ] **Step 1: Write the failing store tests.** Add a `describe('editedAt stamping')` in `scorecardStore.test.ts`.

```ts
  describe('editedAt stamping', () => {
    beforeEach(() => {
      jest.useFakeTimers();
      jest.setSystemTime(new Date('2026-10-07T01:02:03.000Z'));
    });
    afterEach(() => jest.useRealTimers());

    const holeOf = (playerId: string) =>
      getStore().groupScorecards.get(playerId)!.scores[1] as HoleScore;

    it.each([
      ['setPlayerScore', (id: string) => getStore().setPlayerScore(id, 1, 4, 'me')],
      ['updatePlayerHoleScore', (id: string) => getStore().updatePlayerHoleScore(id, 1, { putts: 2 })],
      ['updateShotContributions', (id: string) => getStore().updateShotContributions(id, 1, { teeShot: id })],
      ['updateLocalScore', (id: string) => getStore().updateLocalScore(testRoundId, id, 1, 5)],
    ])('%s stamps the hole with the edit time', async (_name, act) => {
      await getStore().initializeRound(testRoundId, mockPlayers, mockHoles, 'stroke');
      const id = mockPlayers[0].id;
      await act(id);
      expect(holeOf(id).editedAt).toBe('2026-10-07T01:02:03.000Z');
    });

    it('persists the stamped hole to SQLite', async () => {
      await getStore().initializeRound(testRoundId, mockPlayers, mockHoles, 'stroke');
      const id = mockPlayers[0].id;
      await getStore().setPlayerScore(id, 1, 4, 'me');
      expect(database.saveHoleScore).toHaveBeenLastCalledWith(
        expect.any(String), 1, expect.objectContaining({ editedAt: '2026-10-07T01:02:03.000Z' }),
      );
    });
  });
```

  `HoleShotContributions` keys: check `src/types/database/base.ts` for the real key names (for example `teeShot` or `drive`) and use a valid one. `database` is the file's existing mocked import of `@/services/offline/database`. If it's imported under another name, use that.

- [ ] **Step 2: Run the tests and check they fail.**
  ```bash
  pnpm test --testPathPattern='store/scorecardStore' -t 'editedAt stamping'
  ```
  Expected: FAIL, because `editedAt` is undefined.

- [ ] **Step 3: Implement the type and the stamping.**

  In `src/types/database/base.ts`, inside `HoleScore`, after `scoredBy`:
  ```ts
  /**
   * When this hole was last edited on the device that edited it (ISO 8601).
   * Social rounds merge per hole on it: the later edit wins. Absent on holes
   * written before 1.14.1, which then count as the oldest edit.
   */
  editedAt?: string;
  ```

  In `src/store/scoreUpdateSlice.ts`, `applyScoreUpdate`, replace the `updatedScorecard` construction:
  ```ts
  const stampedHoleScore: HoleScore = { ...holeScore, editedAt: new Date().toISOString() };
  const updatedScorecard: Scorecard = {
    ...scorecard,
    scores: {
      ...scorecard.scores,
      [hole]: stampedHoleScore,
    },
    updatedAt: new Date(),
  };
  ```

  Then, in each of the four callers (`setPlayerScore` :152, `updatePlayerHoleScore` :199, `updateShotContributions` :243, `updateLocalScore` :298), persist the **stamped** hole. Change the `holeScore:` entry of `persistScorecardUpdate`, using `hole` or `holeNumber` to match the function:
  ```ts
  holeScore: { scorecardId: scorecard.id, holeNumber: hole, score: updatedScorecard.scores[hole] as HoleScore },
  ```

- [ ] **Step 4: Run the tests and check they pass.**
  ```bash
  pnpm test --testPathPattern='store/scorecardStore'
  ```
  Expected: PASS, including Task 1's characterization tests.

- [ ] **Step 5: Add local persistence of `edited_at`.**

  `migrations.ts`, append to `MIGRATIONS`:
  ```ts
  {
    version: 19,
    name: 'add_hole_score_edited_at',
    up: `ALTER TABLE hole_scores ADD COLUMN edited_at TEXT`,
  },
  ```

  `tables.ts`, in the `hole_scores` CREATE, add `edited_at TEXT,` after `shot_contributions TEXT,`.

  `HoleScoreDAO.ts`, `saveHoleScore`:
  - Add `edited_at` to the column list of **both** INSERT statements, before `updated_at`, and add one `?` to each VALUES list.
  - Values: the multi-ball branch passes `null`; the single-ball branch passes `score.editedAt ?? null`.

  `getHoleScores`:
  - Add `edited_at` to the row-type union and to the SELECT.
  - In the single-ball object, add `editedAt: row.edited_at ?? undefined,` next to `scoredBy`.

  Verify the SQL against real SQLite:
  ```bash
  sqlite3 :memory: "CREATE TABLE hole_scores (scorecard_id TEXT, hole_number INTEGER, shot_contributions TEXT); ALTER TABLE hole_scores ADD COLUMN edited_at TEXT; INSERT INTO hole_scores VALUES ('s',1,NULL,'2026-10-07T00:00:00.000Z'); SELECT edited_at FROM hole_scores;"
  ```
  Expected: `2026-10-07T00:00:00.000Z`.

- [ ] **Step 6: Upload `editedAt`.**
  - In `sync.test.ts`, rename the Task 1 test to `'uploads each hole with its editedAt'`. Change its scorecard scores to `{ 1: { strokes: 4, editedAt: '2026-10-07T00:00:00.000Z' } }` and its assertion to:
    ```ts
    expect(write[1].p_snapshot.scores['1'].editedAt).toBe('2026-10-07T00:00:00.000Z');
    ```
    Run it and check it fails.
  - Then, in `scorecardSync.ts`:
    - Add `editedAt?: string;` to the `scoresForDb` value type.
    - In the object literal, after `penalties`, add:
      ```ts
      ...(score.editedAt && { editedAt: score.editedAt }),
      ```
    - Run the test and check it passes.

- [ ] **Step 7: Run the scoring subset and the type-check.**
  ```bash
  pnpm type-check && pnpm test --testPathPattern='(golden|services/scoring|utils/(scoring|dailyHandicap|subMatches)|components/scorecard|store/scorecardStore|services/offline)'
  ```
  Expected: PASS.
- [ ] **Step 8: Commit.**
  ```bash
  git add -A src/types/database/base.ts src/store/scoreUpdateSlice.ts src/services/offline src/__tests__
  git commit -m "feat(scoring): stamp, persist and upload a per-hole editedAt

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
    localChanged: boolean;
    localAhead: boolean;
  }
  export function mergeScorecardScores(
    local: Record<number, HoleScore | MultiBallHoleScore>,
    server: Record<number | string, HoleScore> | null | undefined,
  ): ScorecardScoresMerge;
  ```
- Return values:
  - `localChanged`: true when the result differs from `local` on any hole.
  - `localAhead`: true when some local single-ball hole beats the server's version or is missing on the server, so the merged card must be uploaded.

- [ ] **Step 1: Write the failing table-driven tests.**

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
    ['both unstamped: server wins', { 1: h(4) }, { 1: h(6) }, { 1: 6 }, true, false],
    ['tie: server wins', { 1: h(4, T1) }, { 1: h(6, T1) }, { 1: 6 }, true, false],
    ['identical holes: nothing changes', { 1: h(4, T1) }, { 1: h(4, T1) }, { 1: 4 }, false, false],
  ])('%s', (_name, local, server, expected, changed, ahead) => {
    const result = mergeScorecardScores(local, server);
    const strokes = Object.fromEntries(
      Object.entries(result.scores).map(([k, v]) => [Number(k), (v as HoleScore).strokes]),
    );
    expect(strokes).toEqual(expected);
    expect(result.localChanged).toBe(changed);
    expect(result.localAhead).toBe(ahead);
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

- [ ] **Step 2: Run the tests and check they fail.**
  ```bash
  pnpm test --testPathPattern='mergeScorecardScores'
  ```
  Expected: FAIL (module not found).

- [ ] **Step 3: Implement.**

```ts
/**
 * Per-hole last-edit-wins merge for social rounds.
 *
 * Pure: decides which side's version of each hole to keep and nothing else.
 * Totals are recomputed by the store (calculatePlayerTotals). A hole moves as
 * one unit. A missing editedAt (holes written before 1.14.1) is the oldest
 * possible edit; ties go to the server, the shared copy.
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

const sameHole = (a: HoleScore, b: HoleScore): boolean =>
  JSON.stringify(a) === JSON.stringify(b);

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
    if (sameHole(localHole, serverHole)) continue;

    if (editTime(localHole) > editTime(serverHole)) {
      localAhead = true;
    } else {
      scores[hole] = serverHole;
      localChanged = true;
    }
  }

  for (const [key, localHole] of Object.entries(local)) {
    if (!serverHoles.has(Number(key)) && localHole && isSingleBallScore(localHole)) {
      localAhead = true;
    }
  }

  return { scores, localChanged, localAhead };
}
```

- [ ] **Step 4: Run the tests and check they pass.**
  ```bash
  pnpm test --testPathPattern='mergeScorecardScores'
  ```
  Expected: PASS (12 tests).
- [ ] **Step 5: Commit.**
  ```bash
  git add src/services/offline/sync/mergeScorecardScores.ts src/__tests__/services/offline/mergeScorecardScores.test.ts
  git commit -m "feat(sync): pure per-hole last-edit-wins scorecard merge

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
  ```

---

### Task 4: Scoring mode (derive, store, thread through every init path)

**Files:**
- Create: `src/utils/scoringMode.ts`
- Test: `src/__tests__/utils/scoringMode.test.ts`
- Modify:
  - `src/store/scorecardStore.ts` (state, interface `initializeRound`, wrapper :211-214, initial state, `resetRound`)
  - `src/store/initializeRoundSlice.ts` (`initializeRound` signature and `set`, `loadFromOffline` select :373 and `set` :465)
  - `src/types/supabase/roundQueries.ts` (`RoundMetadata`)
  - `src/hooks/scorecard/useRoundMetadata.ts` (:189)
  - `src/hooks/scorecard/useRoundData.ts` (:374)
  - `src/screens/rounds/RoundListScreen/hooks/useStartNewRound.ts` (:310)
  - `src/screens/rounds/ScheduledRoundScreen/hooks/useStartScheduledRound.ts` (:268)
  - `src/hooks/scorecard/useMatchPlayData.ts` (:288)
  - `src/screens/scoring/TeamMatchPlayScoringScreen/index.tsx` (:197)
  - `src/__tests__/mocks/stores/scorecardStore.mock.ts` (add `scoringMode: 'standard'`, `submittedElsewhere: false`, `mergeRemoteScorecard: jest.fn()`)

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
- Store: `scoringMode: ScoringMode`, defaulting to `'standard'`. `initializeRound(..., startHole?, scoringMode?: ScoringMode)` is the new trailing parameter.
- `useStartSocialRound` passes nothing. Its rounds have `handicap_source = NULL`, which means profile, so they are **standard** by definition. See the handoff note.

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

- [ ] **Step 2: Run the tests and check they fail.** Expected: module not found.
- [ ] **Step 3: Implement.**

```ts
/**
 * Scoring mode for a round. 'social' rounds let anyone score anyone, with a
 * per-hole last-edit-wins merge (docs/superpowers/specs/2026-10-07-social-round-multi-scorer-design.md).
 * Everything else — handicap, competition and scoring-pairs rounds — is
 * 'standard' and behaves as before. Anything unknown is 'standard'.
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

- [ ] **Step 4: Write the failing store tests.**

```ts
  describe('scoringMode', () => {
    it('defaults to standard and is set by initializeRound', async () => {
      expect(getStore().scoringMode).toBe('standard');
      await getStore().initializeRound(testRoundId, mockPlayers, mockHoles, 'stroke', false, [], null, 'none', new Map(), 'full', 1, 'social');
      expect(getStore().scoringMode).toBe('social');
    });

    it('is cleared by resetRound', async () => {
      await getStore().initializeRound(testRoundId, mockPlayers, mockHoles, 'stroke', false, [], null, 'none', new Map(), 'full', 1, 'social');
      getStore().resetRound();
      expect(getStore().scoringMode).toBe('standard');
    });
  });
```

  Also add a `loadFromOffline` case in the existing `describe('loadFromOffline')`. Use the existing supabase `rounds` mock row (~:140) and add `competition_id: null, handicap_source: 'none', scoring_pairs_required: false` to it for this one test. Copy how neighbouring tests override the mock. Assert `getStore().scoringMode === 'social'` after a successful load.

- [ ] **Step 5: Run the tests and check they fail.**
- [ ] **Step 6: Implement in the store and init slice.**
  - `scorecardStore.ts`:
    - `import type { ScoringMode } from '@/utils/scoringMode';`
    - Add `scoringMode: ScoringMode;` to `ScorecardState`, next to `allowedPlayerIds`.
    - Add `startHole?: number, scoringMode?: ScoringMode` to the `initializeRound` interface.
    - Initial state: `scoringMode: 'standard'`.
    - In `resetRound`'s `set`: `scoringMode: 'standard'`.
    - Wrapper:
      ```ts
      initializeRound: async (roundId, players, holes, gameType, isStandalone, allowedPlayerIds, selectedTeeData, handicapSource, playerTeeMap, nineType, startHole, scoringMode) => {
        await initSlice.initializeRound(set, initSyncListener, roundId, players, holes, gameType, isStandalone, allowedPlayerIds, selectedTeeData, handicapSource, playerTeeMap, nineType, startHole, scoringMode);
        await refreshRoundFailedSyncCount();
      },
      ```
  - `initializeRoundSlice.ts`:
    - In `initializeRound`, add the trailing parameter `scoringMode: ScoringMode = 'standard',` and include `scoringMode` in the success `set({...})`.
    - In `loadFromOffline`:
      - Change the metadata select to `'game_type, handicap_source, nine_type, selected_tee, course_id, competition_id, scoring_pairs_required'`.
      - Declare `let scoringMode: ScoringMode = 'standard';` next to `gameType`.
      - Inside `if (roundData)`, add `scoringMode = deriveScoringMode(roundData);`.
      - Add `scoringMode` to the final `set({...})`.

- [ ] **Step 7: Thread the mode through the callers.**
  - `roundQueries.ts`: add `competitionId: string | null;` to `RoundMetadata`. In `useRoundMetadata.ts` (:189), add `competitionId: roundData.competition_id ?? null,`.
  - `useRoundData.ts` (:374). Import `deriveScoringMode` and add a trailing argument after `courseHook.startHole ?? 1,`:
    ```ts
    deriveScoringMode(
      metadata.data
        ? { competition_id: metadata.data.competitionId, handicap_source: metadata.data.handicapSource, scoring_pairs_required: metadata.data.scoringPairsRequired }
        : null,
    ),
    ```
  - `useStartNewRound.ts` (:310). This hook inserts the round with `competition_id` null, `scoring_pairs_required: scoringPairsConfig?.enabled ?? false` and `handicap_source: handicapSource` (:175-182). Pass `1` as `startHole`, followed by:
    ```ts
    deriveScoringMode({ competition_id: null, handicap_source: handicapSource ?? null, scoring_pairs_required: scoringPairsConfig?.enabled ?? false })
    ```
    Check the variable names in scope at :310 and use them.
  - `useStartScheduledRound.ts` (:268): same as above, using its `round` row where possible:
    ```ts
    deriveScoringMode({ competition_id: round.competition_id ?? null, handicap_source: handicapSource ?? round.handicap_source ?? null, scoring_pairs_required: round.scoring_pairs_required ?? false })
    ```
    Pass `1` for `startHole` if that argument is currently omitted.
  - `useMatchPlayData.ts` (:288) and `TeamMatchPlayScoringScreen/index.tsx` (:197). `roundData` comes from `useRoundDetails`, which selects `*`. Fill the missing trailing args with their defaults: `new Map()`, `'full'` or the existing `roundNineType`, and `1`. Then pass `deriveScoringMode(roundData)`.
  - `useStartSocialRound.ts`: no change. Leave a one-line comment at :153:
    ```ts
    // handicap_source is left NULL (profile) → a handicap round → 'standard' scoring mode.
    ```
  - Update `src/__tests__/mocks/stores/scorecardStore.mock.ts` as listed under Files.

- [ ] **Step 8: Run the checks.**
  ```bash
  pnpm type-check && pnpm test --testPathPattern='(store/scorecardStore|utils/scoringMode|hooks/scorecard|integration)'
  ```
  Expected: PASS.
- [ ] **Step 9: Commit.**
  ```bash
  git add -A src && git commit -m "feat(scoring): derive and thread a social/standard scoring mode

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
  ```

---

### Task 5: `mergeRemoteScorecard` store action

**Files:**
- Create: `src/store/remoteScorecardMerge.ts`
- Modify: `src/store/scorecardStore.ts`
- Test: `src/__tests__/store/remoteScorecardMerge.test.ts`, `src/__tests__/store/scorecardStore.test.ts`

**Interfaces:**
- Consumes: `mergeScorecardScores` (Task 3), `calculatePlayerTotals`, `ScoringMode` (Task 4).
- Produces:
  ```ts
  // remoteScorecardMerge.ts
  export interface RemoteScorecardRow {
    player_id: string;
    scores: Record<string, HoleScore> | null;
    revision: number;
    status: string;
  }
  export interface RemoteMergeResult {
    scorecard: Scorecard;    // next local card (totals NOT yet recomputed)
    changed: boolean;        // store/SQLite must be updated
    needsUpload: boolean;    // queue the debounced upload
    final: boolean;          // server card is completed/confirmed (adopted wholesale)
  }
  export function applyRemoteScorecard(local: Scorecard, remote: RemoteScorecardRow): RemoteMergeResult;
  ```
- Store:
  ```ts
  mergeRemoteScorecard: (row: RemoteScorecardRow) => Promise<void>;
  submittedElsewhere: boolean; // true once every group card is final via a remote merge
  ```

- [ ] **Step 1: Write the failing pure tests** (`remoteScorecardMerge.test.ts`).

```ts
import { applyRemoteScorecard } from '@/store/remoteScorecardMerge';
import type { Scorecard } from '@/types';

const T1 = '2026-10-07T01:00:00.000Z';
const T2 = '2026-10-07T02:00:00.000Z';
const card = (over: Partial<Scorecard> = {}): Scorecard => ({
  id: 'sc-1', roundId: 'r-1', playerId: 'p-1', scores: {}, totalGross: 0, totalNet: 0,
  status: 'in-progress', createdAt: new Date(0), updatedAt: new Date(0), serverRevision: 3, ...over,
});

describe('applyRemoteScorecard', () => {
  it('merges newer server holes and adopts the server revision', () => {
    const r = applyRemoteScorecard(card({ scores: { 1: { strokes: 4, editedAt: T1 } } }),
      { player_id: 'p-1', scores: { '1': { strokes: 6, editedAt: T2 } }, revision: 5, status: 'in-progress' });
    expect(r.scorecard.scores[1]).toEqual({ strokes: 6, editedAt: T2 });
    expect(r.scorecard.serverRevision).toBe(5);
    expect(r).toMatchObject({ changed: true, needsUpload: false, final: false });
  });

  it('is a no-op for an echo of this phone\'s own upload', () => {
    const local = card({ scores: { 1: { strokes: 4, editedAt: T1 } }, serverRevision: 5 });
    const r = applyRemoteScorecard(local, { player_id: 'p-1', scores: { '1': { strokes: 4, editedAt: T1 } }, revision: 5, status: 'in-progress' });
    expect(r).toMatchObject({ changed: false, needsUpload: false, final: false });
  });

  it('never lowers the revision for an out-of-order older row', () => {
    const local = card({ scores: { 1: { strokes: 4, editedAt: T2 } }, serverRevision: 7 });
    const r = applyRemoteScorecard(local, { player_id: 'p-1', scores: { '1': { strokes: 6, editedAt: T1 } }, revision: 5, status: 'in-progress' });
    expect(r.scorecard.serverRevision).toBe(7);
    expect(r.changed).toBe(false);
  });

  it('flags an upload when local holes are ahead', () => {
    const r = applyRemoteScorecard(card({ scores: { 2: { strokes: 5, editedAt: T2 } } }),
      { player_id: 'p-1', scores: { '1': { strokes: 6, editedAt: T1 } }, revision: 5, status: 'in-progress' });
    expect(r).toMatchObject({ changed: true, needsUpload: true });
  });

  it('adopts a completed server card wholesale', () => {
    const r = applyRemoteScorecard(card({ scores: { 1: { strokes: 3, editedAt: T2 } } }),
      { player_id: 'p-1', scores: { '1': { strokes: 6, editedAt: T1 } }, revision: 9, status: 'completed' });
    expect(r.scorecard.scores[1]).toEqual({ strokes: 6, editedAt: T1 });
    expect(r.scorecard.status).toBe('completed');
    expect(r.scorecard.serverRevision).toBe(9);
    expect(r).toMatchObject({ changed: true, needsUpload: false, final: true });
  });
});
```

- [ ] **Step 2: Run the tests and check they fail.**
- [ ] **Step 3: Implement** `src/store/remoteScorecardMerge.ts`.

```ts
/**
 * Apply a server scorecard row to the local card for a social round.
 * Pure. The caller recomputes totals (calculatePlayerTotals) and persists.
 *
 * Revision rule: the server revision is adopted only together with that
 * server's holes; an older row never lowers it.
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
  final: boolean;
}

const FINAL_STATUSES = new Set(['completed', 'confirmed']);

export function applyRemoteScorecard(local: Scorecard, remote: RemoteScorecardRow): RemoteMergeResult {
  const localRevision = local.serverRevision ?? 0;

  if (FINAL_STATUSES.has(remote.status)) {
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
      final: true,
    };
  }

  if (remote.revision < localRevision) {
    return { scorecard: local, changed: false, needsUpload: false, final: false };
  }

  const merge = mergeScorecardScores(local.scores, remote.scores);
  const revisionMoved = remote.revision > localRevision;
  if (!merge.localChanged && !revisionMoved) {
    return { scorecard: local, changed: false, needsUpload: merge.localAhead, final: false };
  }
  return {
    scorecard: { ...local, scores: merge.scores, serverRevision: remote.revision, updatedAt: new Date() },
    changed: true,
    needsUpload: merge.localAhead,
    final: false,
  };
}
```

  Note: in the echo test, `revision === localRevision` and the holes are equal, so the result is unchanged. Run the pure tests and check they pass.

- [ ] **Step 4: Write the failing store tests** (in `scorecardStore.test.ts`).

```ts
  describe('mergeRemoteScorecard', () => {
    const T2 = '2099-01-01T00:00:00.000Z';
    const init = (mode: 'social' | 'standard') =>
      getStore().initializeRound(testRoundId, mockPlayers, mockHoles, 'stroke', false, [], null, 'none', new Map(), 'full', 1, mode);

    it('merges a remote row into the card and recomputes totals canonically (pickup = NDB)', async () => {
      await init('social');
      const p = mockPlayers[0].id;
      const hole1 = mockHoles[0]; // par/strokeIndex from the fixture
      await getStore().mergeRemoteScorecard({ player_id: p, scores: { [String(hole1.number)]: { strokes: 10, editedAt: T2 } }, revision: 2, status: 'in-progress' });
      const sc = getStore().groupScorecards.get(p)!;
      expect(sc.serverRevision).toBe(2);
      // handicapSource 'none' → 0 strokes received → pickup counts as par + 2
      expect(sc.totalGross).toBe(hole1.par + 2);
      expect(database.saveScorecard).toHaveBeenCalled();
    });

    it('does nothing in a standard round', async () => {
      await init('standard');
      const p = mockPlayers[0].id;
      await getStore().mergeRemoteScorecard({ player_id: p, scores: { '1': { strokes: 4, editedAt: T2 } }, revision: 2, status: 'in-progress' });
      expect(getStore().groupScorecards.get(p)!.scores[1]).toBeUndefined();
    });

    it('sets submittedElsewhere once every group card is final', async () => {
      await init('social');
      for (const player of mockPlayers) {
        await getStore().mergeRemoteScorecard({ player_id: player.id, scores: {}, revision: 3, status: 'completed' });
      }
      expect(getStore().submittedElsewhere).toBe(true);
    });
  });
```

  `calculatePlayerTotals` with `handicapSource: 'none'` uses a raw handicap of 0. If the fixture's player handicap leaks through, read `calculatePlayerTotals` (:30-62) and adjust the expected value **by hand derivation**, documented in a comment. Do not import the calculator into the test.

- [ ] **Step 5: Run the tests and check they fail.**
- [ ] **Step 6: Implement in `scorecardStore.ts`.**
  - Imports:
    ```ts
    import { applyRemoteScorecard, type RemoteScorecardRow } from './remoteScorecardMerge';
    import { debouncedQueueScorecardSync } from './scorecardSyncDebounce';
    ```
  - Add `submittedElsewhere: boolean;` and `mergeRemoteScorecard: (row: RemoteScorecardRow) => Promise<void>;` to `ScorecardState`.
  - Initial state and `resetRound`: `submittedElsewhere: false`.
  - Inside the `create` callback, before `return {`, add a helper so Task 6 can reuse it:
    ```ts
    /** Apply a remote row to the loaded social round. Returns the next card, or null. */
    const applyRemoteToStore = async (row: RemoteScorecardRow): Promise<Scorecard | null> => {
      const state = get();
      if (state.scoringMode !== 'social') return null;
      const local = state.groupScorecards.get(row.player_id);
      if (!local) return null;

      const result = applyRemoteScorecard(local, row);
      if (!result.changed) return local;

      const playerTee = state.playerTeeMap.get(row.player_id) ?? state.selectedTeeData;
      const totals = calculatePlayerTotals(result.scorecard, state.holes, state.gameType, {
        selectedTee: playerTee,
        handicapSource: state.handicapSource,
      });
      const next: Scorecard = {
        ...result.scorecard,
        totalGross: totals.gross,
        totalNet: totals.net,
        total_par_score: totals.parScore,
      };

      const cards = new Map(get().groupScorecards);
      cards.set(row.player_id, next);
      const allFinal = [...cards.values()].every((c) => c.status === 'completed' || c.status === 'confirmed');
      set({ groupScorecards: cards, ...(result.final && allFinal ? { submittedElsewhere: true } : {}) });

      await persistScorecardUpdate({ scorecard: { scorecardId: next.id, scorecard: next }, context: 'mergeRemoteScorecard' });
      if (result.needsUpload && !next.isStandalone) {
        debouncedQueueScorecardSync(next.id, () => get().groupScorecards.get(row.player_id));
      }
      return next;
    };
    ```
  - Action:
    ```ts
    mergeRemoteScorecard: async (row) => {
      await applyRemoteToStore(row);
    },
    ```

- [ ] **Step 7: Run the tests and check they pass.**
  ```bash
  pnpm test --testPathPattern='store/(scorecardStore|remoteScorecardMerge)'
  ```
- [ ] **Step 8: Commit.**
  ```bash
  git add -A src && git commit -m "feat(scoring): merge remote scorecard rows into social rounds

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
  ```

---

### Task 6: Conflict resolver (background sync merges instead of failing)

**Files:**
- Modify: `src/services/offline/sync/syncOrchestrator.ts`, `src/services/offline/sync/index.ts`, `src/services/offline/sync.ts`, `src/store/scorecardStore.ts`
- Modify (test mock): `src/__tests__/store/scorecardStore.test.ts` (its `jest.mock('@/services/offline/sync')` factory, ~:99): add `setScorecardConflictResolver: jest.fn((r) => { mockConflictResolver = r; })` and a top-level `let mockConflictResolver: ((...a: unknown[]) => unknown) | null = null;`
- Test: `src/__tests__/services/offline/sync.test.ts`, `src/__tests__/store/scorecardStore.test.ts`

**Interfaces:**
- Produces (`syncOrchestrator.ts`):
  ```ts
  export type ScorecardConflictResolution =
    | { kind: 'retry'; scorecard: Scorecard }  // merged snapshot at the server revision
    | { kind: 'final' }                         // server card is completed: drop the queued write
    | null;                                     // not handled: keep today's behaviour
  export type ScorecardConflictResolver = (
    queued: Scorecard,
    conflict: ScorecardConflictError,
  ) => Promise<ScorecardConflictResolution>;
  export function setScorecardConflictResolver(resolver: ScorecardConflictResolver | null): void;
  ```
- Consumes: `applyRemoteToStore` (Task 5).

- [ ] **Step 1: Write the failing sync tests.** Add them to `sync.test.ts` in the `successRpc` describe. Import `setScorecardConflictResolver` from the orchestrator module path that the file already imports `syncAll` from. Add `afterEach(() => setScorecardConflictResolver(null));`.

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
        const merged = { ...scorecard, serverRevision: 6 };
        setScorecardConflictResolver(jest.fn().mockResolvedValue({ kind: 'retry', scorecard: merged }));

        await syncAll();

        const writes = (supabase.rpc as jest.Mock).mock.calls.filter(([fn]) => fn === 'write_scorecard_snapshot');
        expect(writes).toHaveLength(2);
        expect(writes[1][1].p_expected_revision).toBe(6);
        expect(database.markPendingSyncFailed).not.toHaveBeenCalled();
        expect(database.removePendingSync).toHaveBeenCalledWith(4, 1);
      });

      it('drops the queued write when the server card is final', async () => {
        (database.getPendingSyncs as jest.Mock).mockResolvedValue([createPendingSync({ id: 5 })]);
        (supabase.rpc as jest.Mock).mockResolvedValue(conflictRpc('completed'));
        setScorecardConflictResolver(jest.fn().mockResolvedValue({ kind: 'final' }));

        await syncAll();

        expect(database.discardPendingSync).toHaveBeenCalledWith(5);
        expect(database.markPendingSyncFailed).not.toHaveBeenCalled();
      });

      it('keeps today\'s behaviour when the resolver declines', async () => {
        (database.getPendingSyncs as jest.Mock).mockResolvedValue([createPendingSync({ id: 6 })]);
        (supabase.rpc as jest.Mock).mockResolvedValue(conflictRpc());
        setScorecardConflictResolver(jest.fn().mockResolvedValue(null));

        await syncAll();

        expect(database.markPendingSyncFailed).toHaveBeenCalledWith(6, 1, expect.any(String));
      });

      it('resolves fallback-path conflicts too', async () => {
        const scorecard = createTestScorecard();
        (database.getUnsyncedScorecards as jest.Mock).mockResolvedValue([scorecard]);
        (supabase.rpc as jest.Mock).mockResolvedValueOnce(conflictRpc()).mockResolvedValue(successRpc(7));
        setScorecardConflictResolver(jest.fn().mockResolvedValue({ kind: 'retry', scorecard: { ...scorecard, serverRevision: 6 } }));

        await syncAll();

        expect(database.markScorecardAsSynced).toHaveBeenCalledWith(scorecard.id, 7);
      });
    });
```

  Check `discardPendingSync`'s real signature in `SyncQueueDAO.ts` (`discardPendingSync(id)`, or `(id, revision)`) and match it in both the test and the implementation.

- [ ] **Step 2: Run the tests and check they fail.**
- [ ] **Step 3: Implement in `syncOrchestrator.ts`.**
  - Near `subscribeScorecardSynced` (~:68), add the types from Interfaces and:
    ```ts
    let conflictResolver: ScorecardConflictResolver | null = null;

    /** Register who may merge a scorecard revision conflict (the store, for social rounds). */
    export function setScorecardConflictResolver(resolver: ScorecardConflictResolver | null): void {
      conflictResolver = resolver;
    }

    async function resolveConflict(
      scorecard: Scorecard,
      error: ScorecardConflictError,
    ): Promise<ScorecardConflictResolution> {
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
    ```
  - In `syncAll`'s `attemptPendingSync`, replace the body with this version. It tries the resolver first, then the existing explicit-retry path:
    ```ts
    try {
      return await processPendingSync(sync);
    } catch (error) {
      if (!(error instanceof ScorecardConflictError) || sync.type !== 'scorecard' || !sync.data) throw error;

      const resolution = await resolveConflict(sync.data, error);
      if (resolution?.kind === 'final') throw new FinalScorecardError();
      if (resolution?.kind === 'retry') {
        sync.data = resolution.scorecard;
        if (sync.id != null) await updatePendingSyncData(sync.id, sync.data);
        return await processPendingSync(sync);
      }

      if (!adoptServerRevisionOnConflict) throw error;
      if (!(await refreshQueuedRevision(sync, error))) throw error;
      syncLogger.warn('Retrying queued write against the server revision', {
        id: sync.id,
        serverRevision: error.serverRevision,
      });
      return await processPendingSync(sync);
    }
    ```
  - Define at module level:
    ```ts
    /** The server copy is final (submitted): this queued edit is obsolete. */
    class FinalScorecardError extends Error {
      constructor() {
        super('Scorecard already submitted on another device');
        this.name = 'FinalScorecardError';
      }
    }
    ```
  - In the queued loop's `catch`, before the `ScorecardConflictError` branch:
    ```ts
    if (error instanceof FinalScorecardError) {
      await discardPendingSync(sync.id!);
      continue;
    }
    ```
  - In the fallback loop (~:355), wrap `syncScorecard(scorecard)`:
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
    The existing `catch` below still handles anything rethrown.
  - Export `setScorecardConflictResolver` and the two types from `sync/index.ts` (orchestrator export block) and from the `sync.ts` shim.

- [ ] **Step 4: Run the sync tests and check they pass.**
  ```bash
  pnpm test --testPathPattern='services/offline'
  ```
  Expected: PASS, including Task 1's no-resolver characterization.

- [ ] **Step 5: Write the failing store resolver tests** (`scorecardStore.test.ts`).

```ts
  describe('conflict resolver (store side)', () => {
    const conflict = (status: string, scores: Record<string, unknown>) =>
      new (jest.requireMock('@/services/offline/sync').ScorecardConflictError)({ server_revision: 6, server_status: status, server_scores: scores });

    it('registers a resolver when the sync listener starts', async () => {
      await getStore().initializeRound(testRoundId, mockPlayers, mockHoles, 'stroke', false, [], null, 'none', new Map(), 'full', 1, 'social');
      expect(mockConflictResolver).toEqual(expect.any(Function));
    });

    it('returns a merged retry snapshot for the loaded social round', async () => {
      await getStore().initializeRound(testRoundId, mockPlayers, mockHoles, 'stroke', false, [], null, 'none', new Map(), 'full', 1, 'social');
      const queued = getStore().groupScorecards.get(mockPlayers[0].id)!;
      const res = await mockConflictResolver!(queued, conflict('in-progress', { '2': { strokes: 5, editedAt: '2099-01-01T00:00:00.000Z' } }));
      expect(res).toMatchObject({ kind: 'retry' });
      expect((res as { scorecard: Scorecard }).scorecard.serverRevision).toBe(6);
      expect(getStore().groupScorecards.get(mockPlayers[0].id)!.scores[2]).toBeDefined();
    });

    it('returns final for a completed server card', async () => {
      await getStore().initializeRound(testRoundId, mockPlayers, mockHoles, 'stroke', false, [], null, 'none', new Map(), 'full', 1, 'social');
      const queued = getStore().groupScorecards.get(mockPlayers[0].id)!;
      expect(await mockConflictResolver!(queued, conflict('completed', {}))).toEqual({ kind: 'final' });
    });

    it('declines a scorecard from another round, or a standard round', async () => {
      await getStore().initializeRound(testRoundId, mockPlayers, mockHoles, 'stroke', false, [], null, 'none', new Map(), 'full', 1, 'standard');
      const queued = getStore().groupScorecards.get(mockPlayers[0].id)!;
      expect(await mockConflictResolver!(queued, conflict('in-progress', {}))).toBeNull();
      expect(await mockConflictResolver!({ ...queued, roundId: 'other' }, conflict('in-progress', {}))).toBeNull();
    });
  });
```

- [ ] **Step 6: Run the tests and check they fail.**
- [ ] **Step 7: Implement in `scorecardStore.ts`.**
  - Import `setScorecardConflictResolver` from `@/services/offline/sync`.
  - In `initSyncListener`, after `subscribeScorecardSynced(...)`:
    ```ts
    // Social rounds merge revision conflicts per hole instead of retaining
    // them as failures. Standard rounds (and other rounds) decline → unchanged.
    setScorecardConflictResolver(async (queued, conflict) => {
      const state = get();
      if (state.scoringMode !== 'social' || queued.roundId !== state.currentRoundId) return null;
      const next = await applyRemoteToStore({
        player_id: queued.playerId,
        scores: conflict.serverScores as Record<string, HoleScore>,
        revision: conflict.serverRevision,
        status: conflict.serverStatus ?? 'in-progress',
      });
      if (!next) return null;
      if (next.status === 'completed' || next.status === 'confirmed') return { kind: 'final' };
      return { kind: 'retry', scorecard: { ...queued, ...next } };
    });
    ```
    Ordering: `applyRemoteToStore` is defined before `initSyncListener` runs, so place the helper above `initSyncListener` in the file.

- [ ] **Step 8: Run the tests and check they pass.**
  ```bash
  pnpm type-check && pnpm test --testPathPattern='(store/scorecardStore|services/offline)'
  ```
- [ ] **Step 9: Commit.**
  ```bash
  git add -A src && git commit -m "feat(sync): merge social-round revision conflicts instead of retaining failures

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
  ```

---

### Task 7: Live merge hook, mounted on the scoring screens

**Files:**
- Create: `src/hooks/scorecard/useLiveScorecardMerge.ts`
- Test: `src/__tests__/hooks/scorecard/useLiveScorecardMerge.test.tsx`
- Modify:
  - `src/hooks/scorecard/index.ts` (export)
  - `src/screens/scoring/ScorecardEntryScreen/index.tsx`
  - `src/screens/scoring/MatchPlayScoringScreen/index.tsx`
  - `src/screens/scoring/TeamMatchPlayScoringScreen/index.tsx`
  - `src/screens/scoring/ReviewScorecardScreen/index.tsx`

**Interfaces:**
- Produces: `useLiveScorecardMerge(roundId: string | undefined): void`. It reads `scoringMode` from the store itself and subscribes only when the mode is `'social'`.
- Consumes: the store's `mergeRemoteScorecard` (Task 5).

- [ ] **Step 1: Write the failing hook test.** Follow the mocking style of an existing realtime test. Search with `grep -rln "channel(" src/__tests__ src/hooks | grep test`, and if none exists, mock as shown.

```tsx
import { renderHook } from '@testing-library/react-native';
import { useLiveScorecardMerge } from '@/hooks/scorecard/useLiveScorecardMerge';
import { useScorecardStore } from '@/store/scorecardStore';

let mockHandler: ((payload: { new: unknown }) => void) | null = null;
const mockRemoveChannel = jest.fn();
jest.mock('@/services/supabase/client', () => ({
  supabase: {
    channel: jest.fn(() => ({
      on: jest.fn(function (this: unknown, _e: unknown, _f: unknown, handler: (p: { new: unknown }) => void) {
        mockHandler = handler;
        return this;
      }),
      subscribe: jest.fn(function (this: unknown) { return this; }),
    })),
    removeChannel: (...a: unknown[]) => mockRemoveChannel(...a),
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
    mockHandler!({ new: { player_id: 'p', scores: {}, revision: 2, status: 'in-progress' } });
    expect(merge).toHaveBeenCalledWith({ player_id: 'p', scores: {}, revision: 2, status: 'in-progress' });
  });

  it('does not subscribe in a standard round', () => {
    useScorecardStore.setState({ scoringMode: 'standard' } as never);
    renderHook(() => useLiveScorecardMerge('r-1'));
    expect(mockHandler).toBeNull();
  });
});
```

- [ ] **Step 2: Run the test and check it fails.**
- [ ] **Step 3: Implement.**

```ts
/**
 * useLiveScorecardMerge — live per-hole merge for social rounds.
 *
 * Subscribes to scorecard changes for the round and merges each row into the
 * scorecard store (last edit wins per hole). A no-op outside social rounds.
 * Uses its own channel name so it can coexist with useScorecardsRealtime.
 */
import { useEffect } from 'react';
import { supabase } from '@/services/supabase/client';
import { useScorecardStore } from '@/store/scorecardStore';
import type { RemoteScorecardRow } from '@/store/remoteScorecardMerge';

export function useLiveScorecardMerge(roundId: string | undefined): void {
  const isSocial = useScorecardStore((s) => s.scoringMode === 'social');

  useEffect(() => {
    if (!roundId || !isSocial) return;

    const channel = supabase
      .channel(`scorecards-merge:round:${roundId}`)
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
  }, [roundId, isSocial]);
}
```

  Export it from `src/hooks/scorecard/index.ts`. Run the test and check it passes.

- [ ] **Step 4: Mount the hook.** In each of the four screens, add `useLiveScorecardMerge(roundId);` next to the existing store or round hooks. The `roundId` variables are at: ScorecardEntryScreen :74, MatchPlayScoringScreen :50, TeamMatchPlayScoringScreen :53, ReviewScorecardScreen :97. Import from `@/hooks/scorecard`.
- [ ] **Step 5: Run the checks.**
  ```bash
  pnpm type-check && pnpm test --testPathPattern='(hooks/scorecard|screens/scoring)'
  ```
  Screen tests that mock `@/hooks/scorecard` may need `useLiveScorecardMerge: jest.fn()` added to their mock factory. Add it where a test fails with "is not a function".
- [ ] **Step 6: Commit.**
  ```bash
  git add -A src && git commit -m "feat(scoring): live per-hole merge on social-round scoring screens

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
  ```

---

### Task 8: Merge on open (hydrate)

**Files:**
- Modify: `src/hooks/scorecard/useRoundData.ts` (hydrate effect, ~:560-660)
- Test: `src/__tests__/store/scorecardStore.test.ts`. The merge logic is already covered by Task 5, and there's no `useRoundData` test harness, so the hook change stays a thin branch.

**Interfaces:** Consumes `mergeRemoteScorecard` (Task 5).

- [ ] **Step 1: Make the change.**
  - Add `revision` to the select, if it isn't already present (it is).
  - Inside the `for (const remote of remoteScorecards)` loop, before the `localHasScores` check, add:
    ```ts
    // Social rounds: merge every server card per hole (last edit wins), even
    // when this phone already has scores — that is how a phone that was off
    // picks up holes entered elsewhere.
    if (useScorecardStore.getState().scoringMode === 'social') {
      await useScorecardStore.getState().mergeRemoteScorecard({
        player_id: remote.player_id,
        scores: (remote.scores ?? null) as Record<string, HoleScore> | null,
        revision: remote.revision,
        status: remote.status,
      });
      continue;
    }
    ```
  - `mergeRemoteScorecard` sets the store itself, so the loop's `merged` flag only covers the standard path. That's fine.
- [ ] **Step 2: Run the checks.**
  ```bash
  pnpm type-check && pnpm test --testPathPattern='(hooks/scorecard|store/scorecardStore)'
  ```
  Expected: PASS.
- [ ] **Step 3: Commit.**
  ```bash
  git add src/hooks/scorecard/useRoundData.ts && git commit -m "feat(scoring): merge server cards on open for social rounds

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
  ```

---

### Task 9: Submit (pre-submit merge, conflict merge, gate skip)

**Files:**
- Modify: `src/store/scorecardStore.ts` (`submitScorecards`), `src/services/scoreMismatch/submission.ts`, `src/screens/scoring/ReviewScorecardScreen/hooks/useScoreSubmission.ts` (~:437)
- Test: `src/__tests__/store/scorecardStore.test.ts`, `src/__tests__/services/scoreMismatch/scoreMismatchService.test.ts`

**Interfaces:**
- Produces:
  - `checkSubmissionReadiness(roundId, userId, scoringPairsEnabled, holeCount?, groupPlayerIds?, options?: { socialRound?: boolean })`
  - `submitScorecards` throws `RoundAlreadySubmittedError` (exported from `scorecardStore.ts`) when every card turned out final on the server.

- [ ] **Step 1: Write the failing gate test** (`scoreMismatchService.test.ts`, next to the multi-scorer readiness tests ~:1081). Reuse that block's setup, where two scorers have entered disagreeing values:

```ts
    it('skips the multi-scorer gate for social rounds', async () => {
      // same arrangement as the neighbouring "blocks on unresolved mismatches" test
      const readiness = await checkSubmissionReadiness(ROUND_ID, PLAYER_A_ID, false, 18, undefined, { socialRound: true });
      expect(readiness).toEqual({ canSubmit: true });
    });
```

- [ ] **Step 2: Run the test and check it fails. Then implement.** In `submission.ts`, `checkSubmissionReadiness`:
  - Add the parameter `options: { socialRound?: boolean } = {}`.
  - After the validation `throw`, add:
    ```ts
    // Social rounds: anyone may score, last edit wins — no multi-scorer gate.
    // Scoring pairs never apply to a social round (see deriveScoringMode).
    if (options.socialRound && !scoringPairsEnabled) return { canSubmit: true };
    ```
  - In `useScoreSubmission.ts` at the `checkSubmissionReadiness(` call, add a sixth argument:
    ```ts
    { socialRound: useScorecardStore.getState().scoringMode === 'social' }
    ```
    Import the store if it isn't already imported.
  - Run the test and check it passes.

- [ ] **Step 3: Write the failing store submit tests.**

```ts
  describe('submitScorecards (social)', () => {
    const init = () => getStore().initializeRound(testRoundId, mockPlayers, mockHoles, 'stroke', false, [], null, 'none', new Map(), 'full', 1, 'social');

    it('merges the server cards before submitting', async () => {
      await init();
      const p = mockPlayers[0].id;
      mockServerScorecards([{ player_id: p, scores: { '1': { strokes: 4, editedAt: '2099-01-01T00:00:00.000Z' } }, revision: 2, status: 'in-progress' }]);
      await getStore().submitScorecards();
      const sent = (syncScorecard as jest.Mock).mock.calls.find(([sc]) => sc.playerId === p)[0];
      expect(sent.scores[1].strokes).toBe(4);
      expect(sent.serverRevision).toBe(2);
    });

    it('throws RoundAlreadySubmittedError when every card is already final', async () => {
      await init();
      mockServerScorecards(mockPlayers.map((pl) => ({ player_id: pl.id, scores: {}, revision: 3, status: 'completed' })));
      await expect(getStore().submitScorecards()).rejects.toBeInstanceOf(RoundAlreadySubmittedError);
      expect(syncScorecard).not.toHaveBeenCalled();
    });
  });
```

  `mockServerScorecards(rows)` is a test helper you add near the supabase mock. It makes `supabase.from('scorecards').select(...).eq(...).is(...)` resolve `{ data: rows, error: null }`. Extend the existing `jest.mock('@/services/supabase/client')` factory (~:140) with a `scorecards` branch backed by a mutable `let mockScorecardRows = []`. Read the factory first and follow its chaining style.

- [ ] **Step 4: Run the tests and check they fail. Then implement in `submitScorecards`.**
  - Export the error from `scorecardStore.ts`:
    ```ts
    /** Another phone submitted this social round first; its cards are final. */
    export class RoundAlreadySubmittedError extends Error {
      constructor() {
        super('This round was already submitted');
        this.name = 'RoundAlreadySubmittedError';
      }
    }
    ```
  - Add a helper above `return {`:
    ```ts
    /** Social rounds: pull every server card and merge it in before submitting. */
    const mergeServerCardsBeforeSubmit = async (roundId: string): Promise<void> => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any -- generated types workaround
      const { data, error } = await (supabase.from('scorecards') as any)
        .select('player_id, scores, revision, status')
        .eq('round_id', roundId)
        .is('deleted_at', null);
      if (error) throw new Error(`Could not fetch the latest scorecards: ${error.message}`);
      for (const row of (data ?? []) as RemoteScorecardRow[]) {
        await applyRemoteToStore(row);
      }
    };
    ```
    Import `supabase` from `@/services/supabase/client` if the store doesn't already.
  - At the start of `submitScorecards`, after the `!currentRoundId` throw:
    ```ts
    if (get().scoringMode === 'social' && getIsOnline()) {
      await mergeServerCardsBeforeSubmit(currentRoundId);
      const cards = [...get().groupScorecards.values()];
      if (cards.length > 0 && cards.every((c) => c.status === 'completed' || c.status === 'confirmed')) {
        throw new RoundAlreadySubmittedError();
      }
    }
    ```
  - Then change the destructure so that `groupScorecards` is read **after** this block. Move `const { groupScorecards, ... } = get();` below it.
  - In the loop, skip cards that are already final:
    ```ts
    if (scorecard.status === 'completed' || scorecard.status === 'confirmed') continue;
    ```
  - In the existing conflict `catch` (the local-wins retry), make the social path merge first:
    ```ts
    if (get().scoringMode === 'social') {
      const next = await applyRemoteToStore({
        player_id: playerId,
        scores: error.serverScores as Record<string, HoleScore>,
        revision: error.serverRevision,
        status: error.serverStatus ?? 'in-progress',
      });
      if (next && (next.status === 'completed' || next.status === 'confirmed')) {
        newScorecards.set(playerId, next);
        successCount++;
        continue;
      }
      result = await syncScorecard({ ...updatedScorecard, scores: next?.scores ?? updatedScorecard.scores, serverRevision: error.serverRevision });
    } else {
      // existing local-wins retry, unchanged
    }
    ```
    This `continue` sits inside the per-player `try`, which is inside the `for`. Check that it compiles and skips to the next player.
  - Run the tests and check they pass.

- [ ] **Step 5: Surface the error in the UI.** In `useScoreSubmission.ts`, where `submitScorecards` is awaited (:593, :814, :958), catch `RoundAlreadySubmittedError`:
  ```ts
  if (error instanceof RoundAlreadySubmittedError) {
    showAlert('Already submitted', 'This round was already submitted on another phone.');
    navigation.reset(buildPostSubmitResetState(roundId, competitionId));
    return;
  }
  ```
  Use the hook's existing alert helper; look for `Alert.alert` or `showAlert` in the file and match it. Do the same in `ScorecardEntryScreen/hooks/useScorecardSubmission.ts:77`, using that file's navigation and alert conventions.

- [ ] **Step 6: Run the checks.**
  ```bash
  pnpm type-check && pnpm test --testPathPattern='(store/scorecardStore|services/scoreMismatch|screens/scoring)'
  ```
- [ ] **Step 7: Commit.**
  ```bash
  git add -A src && git commit -m "feat(scoring): social submit merges first, skips the multi-scorer gate, adopts a prior submit

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
  ```

---

### Task 10: "Submitted on another phone" redirect

**Files:**
- Create: `src/hooks/scorecard/useSubmittedElsewhereRedirect.ts`
- Test: `src/__tests__/hooks/scorecard/useSubmittedElsewhereRedirect.test.tsx`
- Modify: the same 4 screens as Task 7, and `src/hooks/scorecard/index.ts`

**Interfaces:**
- Produces: `useSubmittedElsewhereRedirect(roundId: string | undefined, competitionId?: string | null): void`.
- Consumes: `submittedElsewhere` (Task 5), `buildPostSubmitResetState` (`src/navigation/postSubmitNavigation.ts`).

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

- [ ] **Step 3: Mount the hook.** In the 4 screens, next to `useLiveScorecardMerge(roundId)`, add `useSubmittedElsewhereRedirect(roundId, competitionId)`. TeamMatchPlay derives `competitionId` at :86; use `null` where no competitionId is in scope.
- [ ] **Step 4: Run the checks and commit.**
  ```bash
  pnpm type-check && pnpm test --testPathPattern='(hooks/scorecard|screens/scoring)'
  git add -A src && git commit -m "feat(scoring): leave the scoring flow when another phone submits a social round

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
  ```

---

### Task 11: End-to-end dead-battery scenario

**Files:**
- Create: `src/__tests__/integration/socialMultiScorer.test.ts`

**Interfaces:** Consumes `mergeScorecardScores` (Task 3) and `applyRemoteScorecard` (Task 5). The test exercises the pure layers against a fake server with real revision and status rules, which keeps it deterministic. The store and sync wiring are covered by Tasks 5, 6 and 9.

- [ ] **Step 1: Write the scenario test.**

```ts
import { applyRemoteScorecard, type RemoteScorecardRow } from '@/store/remoteScorecardMerge';
import type { HoleScore, Scorecard } from '@/types';

/** Minimal write_scorecard_snapshot: revision-checked, completed is final. */
class FakeServer {
  row: RemoteScorecardRow = { player_id: 'sam', scores: {}, revision: 0, status: 'in-progress' };
  write(expected: number, scores: Record<number, HoleScore>, status: string) {
    const stale = expected !== this.row.revision;
    const overFinal = this.row.status === 'completed' && status !== 'completed';
    if (stale || overFinal) return { applied: false as const, server: { ...this.row } };
    this.row = { ...this.row, scores: Object.fromEntries(Object.entries(scores).map(([k, v]) => [k, v])), revision: this.row.revision + 1, status };
    return { applied: true as const, revision: this.row.revision };
  }
}

const at = (minute: number) => new Date(Date.UTC(2026, 9, 7, 1, minute)).toISOString();
const phone = (): Scorecard => ({ id: 'sc', roundId: 'r', playerId: 'sam', scores: {}, totalGross: 0, totalNet: 0, status: 'in-progress', createdAt: new Date(0), updatedAt: new Date(0), serverRevision: 0 });

/** Upload with the app's rule: on conflict merge (social) and retry once. */
function upload(server: FakeServer, card: Scorecard, status = card.status): Scorecard {
  const first = server.write(card.serverRevision ?? 0, card.scores as Record<number, HoleScore>, status);
  if (first.applied) return { ...card, status, serverRevision: first.revision };
  const merged = applyRemoteScorecard(card, first.server);
  if (merged.final) return merged.scorecard;
  const retry = server.write(merged.scorecard.serverRevision ?? 0, merged.scorecard.scores as Record<number, HoleScore>, status);
  if (!retry.applied) throw new Error('retry conflicted');
  return { ...merged.scorecard, status, serverRevision: retry.revision };
}

describe('social round: phone dies after 9, friend finishes and submits', () => {
  it('ends with one complete card on both phones and loses no hole', () => {
    const server = new FakeServer();
    let a = phone();
    for (let hole = 1; hole <= 9; hole++) {
      a = { ...a, scores: { ...a.scores, [hole]: { strokes: 4, editedAt: at(hole) } } };
      a = upload(server, a);
    }
    // A's last edit (hole 9 changed to 5) never uploads: battery dies.
    const aOffline: Scorecard = { ...a, scores: { ...a.scores, 9: { strokes: 5, editedAt: at(9.5) } } };

    // B opens the round: merge on open.
    let b = applyRemoteScorecard(phone(), server.row).scorecard;
    for (let hole = 10; hole <= 18; hole++) {
      b = { ...b, scores: { ...b.scores, [hole]: { strokes: 3, editedAt: at(20 + hole) } } };
      b = upload(server, b);
    }
    b = upload(server, b, 'completed'); // B submits

    // A comes back with its stale copy and tries to upload.
    const aFinal = upload(server, aOffline);

    expect(server.row.status).toBe('completed');
    expect(Object.keys(server.row.scores ?? {})).toHaveLength(18);
    expect(aFinal.status).toBe('completed');
    expect(aFinal.scores).toEqual(b.scores);
    // Submitting is final: A's unsent hole-9 change is discarded.
    expect((server.row.scores!['9'] as HoleScore).strokes).toBe(4);
  });
});
```

- [ ] **Step 2: Run it.**
  ```bash
  pnpm test --testPathPattern='integration/socialMultiScorer'
  ```
  Expected: PASS. If it fails, fix the **production** code in Tasks 3 or 5, not this test, unless the test itself contradicts the spec.
- [ ] **Step 3: Commit.**
  ```bash
  git add src/__tests__/integration/socialMultiScorer.test.ts && git commit -m "test: dead-battery social round scenario against a revision-enforcing fake server

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
  ```

---

### Task 12: Docs and final verification

**Files:**
- Modify: `docs/guides/OFFLINE_ARCHITECTURE.md`, `CLAUDE.md` ("Scoring changes (guardrails)" step 5)

- [ ] **Step 1: Update `OFFLINE_ARCHITECTURE.md`.** Add a section "Scorecard revisions and social-round merging" covering:
  - **The write path:** `write_scorecard_snapshot`, with `p_expected_revision` and its conflict and status rules.
  - **Conflicts in standard rounds:** retained as failed rows, recovered at submit, by Retry, or from Developer → Retained Uploads.
  - **Superseded uploads:** a newer edit landing mid-upload keeps the confirmed revision (commit 9609f1ee).
  - **Social rounds:**
    - each hole carries `editedAt`;
    - the merge rule, including the revision-adoption rule;
    - the four merge points;
    - completed cards are final.
- [ ] **Step 2: Update `CLAUDE.md`.** Extend the scoring-subset command in guardrail step 5 to:
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
  Expected: everything passes except the known `syncUtils.test.ts` (4 tests). Report that suite by name.
- [ ] **Step 4: Commit.**
  ```bash
  git add docs/guides/OFFLINE_ARCHITECTURE.md CLAUDE.md && git commit -m "docs: document revision-checked sync and social-round merging

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
  ```
- [ ] **Step 5: Hand over for device QA.** Do not merge into main. Report the branch name and the on-device QA list from spec §8.
