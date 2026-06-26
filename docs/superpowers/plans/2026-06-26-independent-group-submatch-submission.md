# Independent Group & Sub-Match Submission Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Let each on-course group (and each sub-match) submit its own scorecards without waiting on other groups, while preserving same-group / same-pair score reconciliation.

**Architecture:** The block is purely in the submission-readiness gate (`src/services/scoreMismatch/submission.ts`), which queries the whole round and treats every scorer as relevant to every submitter. We thread the submitting device's group player-id set down into the gate and scope both the mismatch block and the "wait for other scorers" check to that set. Scorers who share no players with the submitter (other groups) are ignored. No schema, finalization, or leaderboard changes.

**Tech Stack:** TypeScript, React Native, Zustand (`scorecardStore`), Supabase, Jest.

## Global Constraints

- **No DB migration / schema change** — JS-only change, ships via OTA.
- **Backward compatible:** `groupPlayerIds` is an optional trailing parameter; when omitted or empty, behaviour is identical to today (round-wide). All existing `checkSubmissionReadiness(...)` call sites and tests must continue to pass unchanged.
- **Preserve same-group reconciliation:** two devices scoring the *same* player must still surface mismatches and block until resolved.
- **Scoring-pairs behaviour unchanged:** you still only score / wait on yourself + your assigned pair.
- Follow existing module patterns in `src/services/scoreMismatch/`; logger is `createModuleLogger('ScoreMismatchService')`.

---

## File Structure

- `src/services/scoreMismatch/submission.ts` — add `groupPlayerIds?: string[]` param to `checkSubmissionReadiness`, `checkPairsReadiness`, `checkMultiScorerReadiness`; add a small `filterMismatchesToPlayers` helper; scope both readiness paths.
- `src/screens/scoring/ReviewScorecardScreen/hooks/useScoreSubmission.ts` — read the current group's player ids from the scorecard store and pass them into `checkSubmissionReadiness`.
- `src/__tests__/services/scoreMismatch/scoreMismatchService.test.ts` — new tests for group-scoped readiness (multi-scorer + pairs).

---

### Task 1: Scope the multi-scorer readiness path to the submitting group

**Files:**
- Modify: `src/services/scoreMismatch/submission.ts:34-145`
- Test: `src/__tests__/services/scoreMismatch/scoreMismatchService.test.ts` (new tests appended inside the existing `describe('checkSubmissionReadiness() - multi-scorer (no pairs)', ...)` block, around line 1186)

**Interfaces:**
- Consumes: `getRoundScoreEntries(roundId)` → `ScoreEntry[]`; `createMismatchRecords(roundId)`; `getPendingMismatches(roundId)` → `ScoreMismatch[]`; `fetchPlayerName(scorerId)` (module-local).
- Produces:
  - `checkSubmissionReadiness(roundId: string, userId: string, scoringPairsEnabled: boolean, holeCount?: number, groupPlayerIds?: string[]): Promise<SubmissionReadiness>`
  - `checkMultiScorerReadiness(roundId: string, userId: string, holeCount: number, groupPlayerIds?: string[]): Promise<SubmissionReadiness>` (module-local)
  - `filterMismatchesToPlayers(mismatches: ScoreMismatch[], groupPlayerIds?: string[]): ScoreMismatch[]` (module-local)

- [ ] **Step 1: Write the failing tests**

Append these three tests inside the existing `describe('checkSubmissionReadiness() - multi-scorer (no pairs)', () => { ... })` block in `src/__tests__/services/scoreMismatch/scoreMismatchService.test.ts` (just before its closing `});` at ~line 1186). The block already declares `const PLAYER_C_ID = '550e8400-e29b-41d4-a716-446655440003';`. Add a fourth id at the top of the block:

```typescript
    const PLAYER_D_ID = '550e8400-e29b-41d4-a716-446655440004';

    // Helper: build a round-entries + mismatches mock for these tests.
    const mockEntriesAndMismatches = (
      entries: ScoreEntry[],
      mismatches: ScoreMismatch[] = []
    ) => {
      (supabase.from as jest.Mock).mockImplementation((tableName: string) => ({
        select: jest.fn().mockReturnThis(),
        upsert: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        order: jest.fn().mockReturnThis(),
        single: jest.fn(() => Promise.resolve({ data: { name: 'Player' }, error: null })),
        then: jest.fn((resolve: (v: unknown) => unknown) => {
          if (tableName === 'score_mismatches') return resolve({ data: mismatches, error: null });
          if (tableName === 'score_entries') return resolve({ data: entries, error: null });
          return resolve({ data: [], error: null });
        }),
      }));
    };

    it('lets group 1 submit while group 2 is mid-entry (scoped to groupPlayerIds)', async () => {
      // Group 1 (players A,B) co-scored by A and B, both complete & agreeing.
      // Group 2 (players C,D) scored by C, only 3 holes done — must be ignored.
      const entries: ScoreEntry[] = [
        ...Array.from({ length: 18 }, (_, i) =>
          createScoreEntry({ player_id: PLAYER_A_ID, hole_number: i + 1, scorer_id: PLAYER_A_ID, strokes: 4 })
        ),
        ...Array.from({ length: 18 }, (_, i) =>
          createScoreEntry({ player_id: PLAYER_B_ID, hole_number: i + 1, scorer_id: PLAYER_A_ID, strokes: 4 })
        ),
        ...Array.from({ length: 18 }, (_, i) =>
          createScoreEntry({ player_id: PLAYER_A_ID, hole_number: i + 1, scorer_id: PLAYER_B_ID, strokes: 4 })
        ),
        ...Array.from({ length: 18 }, (_, i) =>
          createScoreEntry({ player_id: PLAYER_B_ID, hole_number: i + 1, scorer_id: PLAYER_B_ID, strokes: 4 })
        ),
        ...Array.from({ length: 3 }, (_, i) =>
          createScoreEntry({ player_id: PLAYER_C_ID, hole_number: i + 1, scorer_id: PLAYER_C_ID, strokes: 5 })
        ),
        ...Array.from({ length: 3 }, (_, i) =>
          createScoreEntry({ player_id: PLAYER_D_ID, hole_number: i + 1, scorer_id: PLAYER_C_ID, strokes: 5 })
        ),
      ];
      mockEntriesAndMismatches(entries, []);

      const result = await checkSubmissionReadiness(
        ROUND_ID, PLAYER_A_ID, false, 18, [PLAYER_A_ID, PLAYER_B_ID]
      );

      expect(result).toEqual({ canSubmit: true });
    });

    it('still waits for a co-scorer of the SAME group who is incomplete', async () => {
      // Group 1 (players A,B). A complete for both; B started player A but only hole 1.
      const entries: ScoreEntry[] = [
        ...Array.from({ length: 18 }, (_, i) =>
          createScoreEntry({ player_id: PLAYER_A_ID, hole_number: i + 1, scorer_id: PLAYER_A_ID, strokes: 4 })
        ),
        ...Array.from({ length: 18 }, (_, i) =>
          createScoreEntry({ player_id: PLAYER_B_ID, hole_number: i + 1, scorer_id: PLAYER_A_ID, strokes: 4 })
        ),
        createScoreEntry({ player_id: PLAYER_A_ID, hole_number: 1, scorer_id: PLAYER_B_ID, strokes: 4 }),
      ];
      mockEntriesAndMismatches(entries, []);

      const result = await checkSubmissionReadiness(
        ROUND_ID, PLAYER_A_ID, false, 18, [PLAYER_A_ID, PLAYER_B_ID]
      );

      expect(result.canSubmit).toBe(false);
      expect(result.reason).toBe('waiting_for_other_scorers');
      expect(result.incompleteScorers?.map((s) => s.scorerId)).toEqual([PLAYER_B_ID]);
    });

    it('blocks on a same-group mismatch but ignores another group’s mismatch', async () => {
      // Two scorers in group 1 so the gate engages; mismatches on both groups.
      const entries: ScoreEntry[] = [
        ...Array.from({ length: 18 }, (_, i) =>
          createScoreEntry({ player_id: PLAYER_A_ID, hole_number: i + 1, scorer_id: PLAYER_A_ID, strokes: 4 })
        ),
        ...Array.from({ length: 18 }, (_, i) =>
          createScoreEntry({ player_id: PLAYER_A_ID, hole_number: i + 1, scorer_id: PLAYER_B_ID, strokes: 4 })
        ),
      ];
      const mismatches = [
        createMismatchRecord({ id: 'mm-group1', player_id: PLAYER_A_ID, hole_number: 1 }),
        createMismatchRecord({ id: 'mm-group2', player_id: PLAYER_C_ID, hole_number: 1 }),
      ];
      mockEntriesAndMismatches(entries, mismatches);

      const result = await checkSubmissionReadiness(
        ROUND_ID, PLAYER_A_ID, false, 18, [PLAYER_A_ID, PLAYER_B_ID]
      );

      expect(result.canSubmit).toBe(false);
      expect(result.reason).toBe('unresolved_mismatches');
      expect(result.mismatchCount).toBe(1); // only the group-1 mismatch counts
    });
```

- [ ] **Step 2: Run the new tests to verify they fail**

Run: `pnpm test -- scoreMismatchService -t "groupPlayerIds|SAME group|another group"`
Expected: FAIL — the first test fails because the unscoped gate currently waits on scorer C (`waiting_for_other_scorers`); the third fails because `mismatchCount` is 2, not 1. (`checkSubmissionReadiness` currently ignores the 5th argument.)

- [ ] **Step 3: Add the param and scoping logic to `submission.ts`**

In `src/services/scoreMismatch/submission.ts`:

(a) Add a `ScoreMismatch` import to the existing type import block (lines 12-17), so it reads:

```typescript
import type {
  ScoreSubmissionStatus,
  SubmissionReadiness,
  PartnerProgress,
  IncompleteScorer,
  ScoreMismatch,
} from './types';
```

(b) Replace `checkSubmissionReadiness` (lines 34-47) with the version that accepts and forwards `groupPlayerIds`:

```typescript
export async function checkSubmissionReadiness(
  roundId: string,
  userId: string,
  scoringPairsEnabled: boolean,
  holeCount: number = 18,
  groupPlayerIds?: string[]
): Promise<SubmissionReadiness> {
  if (!roundId || !userId) {
    throw createError('Round ID and User ID are required', 'VALIDATION');
  }

  return scoringPairsEnabled
    ? checkPairsReadiness(roundId, userId, holeCount, groupPlayerIds)
    : checkMultiScorerReadiness(roundId, userId, holeCount, groupPlayerIds);
}

/**
 * Restrict mismatches to the players the submitting device is responsible for
 * (its on-course group). When no group is supplied, returns them unchanged
 * (legacy round-wide behaviour).
 */
function filterMismatchesToPlayers(
  mismatches: ScoreMismatch[],
  groupPlayerIds?: string[]
): ScoreMismatch[] {
  if (!groupPlayerIds || groupPlayerIds.length === 0) return mismatches;
  const groupSet = new Set(groupPlayerIds);
  return mismatches.filter((m) => groupSet.has(m.player_id));
}
```

(c) Replace `checkMultiScorerReadiness` (lines 92-145) with the scoped version:

```typescript
async function checkMultiScorerReadiness(
  roundId: string,
  userId: string,
  holeCount: number,
  groupPlayerIds?: string[]
): Promise<SubmissionReadiness> {
  const allEntries = await getRoundScoreEntries(roundId);

  // Scope to the players this device is submitting (its group). With no group
  // supplied, fall back to round-wide (legacy behaviour).
  const groupSet =
    groupPlayerIds && groupPlayerIds.length > 0 ? new Set(groupPlayerIds) : null;
  const entries = groupSet
    ? allEntries.filter((e) => groupSet.has(e.player_id))
    : allEntries;

  const distinctScorers = new Set(entries.map((e) => e.scorer_id));

  // Only one scorer (or none) has touched THIS group's players → no gate.
  // A different group's scorers never appear here, so they can't block us.
  if (distinctScorers.size <= 1) {
    return { canSubmit: true };
  }

  // Detection stays round-wide (it only ever finds same-player conflicts), but
  // the BLOCK is scoped to this group's players.
  await createMismatchRecords(roundId);
  const pendingMismatches = filterMismatchesToPlayers(
    await getPendingMismatches(roundId),
    groupPlayerIds
  );
  if (pendingMismatches.length > 0) {
    return {
      canSubmit: false,
      reason: 'unresolved_mismatches',
      mismatchCount: pendingMismatches.length,
    };
  }

  // For each other scorer who touched this group, expected entries =
  // holeCount × distinct group-players they've started scoring.
  const otherScorerIds = [...distinctScorers].filter((id) => id !== userId);
  const incompleteScorers: IncompleteScorer[] = [];

  for (const scorerId of otherScorerIds) {
    const scorerEntries = entries.filter((e) => e.scorer_id === scorerId);
    const distinctPlayers = new Set(scorerEntries.map((e) => e.player_id));
    const expected = distinctPlayers.size * holeCount;

    if (scorerEntries.length < expected) {
      incompleteScorers.push({
        scorerId,
        scorerName: await fetchPlayerName(scorerId),
        progress: { completed: scorerEntries.length, total: expected },
      });
    }
  }

  if (incompleteScorers.length > 0) {
    return {
      canSubmit: false,
      reason: 'waiting_for_other_scorers',
      incompleteScorers,
    };
  }

  return { canSubmit: true };
}
```

- [ ] **Step 4: Run the new + existing multi-scorer tests to verify they pass**

Run: `pnpm test -- scoreMismatchService -t "multi-scorer|groupPlayerIds|SAME group|another group"`
Expected: PASS — all multi-scorer tests (existing round-wide ones still pass because they pass no `groupPlayerIds`, plus the three new scoped tests).

- [ ] **Step 5: Commit**

```bash
git add src/services/scoreMismatch/submission.ts src/__tests__/services/scoreMismatch/scoreMismatchService.test.ts
git commit -m "fix(scoring): scope multi-scorer submission gate to the submitting group

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>"
```

---

### Task 2: Scope the scoring-pairs readiness path to the pair

**Files:**
- Modify: `src/services/scoreMismatch/submission.ts:49-77`
- Test: `src/__tests__/services/scoreMismatch/scoreMismatchService.test.ts` (new tests appended inside `describe('checkSubmissionReadiness()', ...)` near line 1030)

**Interfaces:**
- Consumes: `getPendingMismatches(roundId)`, `getPartnerProgress(roundId, userId, holeCount)`, `filterMismatchesToPlayers` (from Task 1).
- Produces: `checkPairsReadiness(roundId: string, userId: string, holeCount: number, groupPlayerIds?: string[]): Promise<SubmissionReadiness>` (module-local).

- [ ] **Step 1: Write the failing tests**

Append these two tests inside the existing `describe('checkSubmissionReadiness()', () => { ... })` block (the pairs-focused block starting at line 899), just before its closing `});` (~line 1030):

```typescript
    it('pairs: ignores another group’s pending mismatch (scoped to the pair)', async () => {
      // Mismatch belongs to PLAYER_C_ID (another group). Our pair is A + B.
      // No scorer assigned to A (PGRST116) → partner treated complete.
      const otherGroupMismatch = [
        createMismatchRecord({ id: 'mm-other', player_id: '550e8400-e29b-41d4-a716-446655440003', hole_number: 1 }),
      ];
      (supabase.from as jest.Mock).mockImplementation((tableName: string) => ({
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        order: jest.fn().mockReturnThis(),
        single: jest.fn(() => Promise.resolve({ data: null, error: { code: 'PGRST116' } })),
        then: jest.fn((resolve: (v: unknown) => unknown) => {
          if (tableName === 'score_mismatches') return resolve({ data: otherGroupMismatch, error: null });
          return resolve({ data: [], error: null });
        }),
      }));

      const result = await checkSubmissionReadiness(
        ROUND_ID, PLAYER_A_ID, true, 18, [PLAYER_A_ID, PLAYER_B_ID]
      );

      expect(result.canSubmit).toBe(true);
    });

    it('pairs: still blocks on our own pair’s pending mismatch', async () => {
      const ourMismatch = [
        createMismatchRecord({ id: 'mm-ours', player_id: PLAYER_A_ID, hole_number: 1 }),
      ];
      (supabase.from as jest.Mock).mockImplementation((tableName: string) => ({
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        order: jest.fn().mockReturnThis(),
        single: jest.fn(() => Promise.resolve({ data: null, error: { code: 'PGRST116' } })),
        then: jest.fn((resolve: (v: unknown) => unknown) => {
          if (tableName === 'score_mismatches') return resolve({ data: ourMismatch, error: null });
          return resolve({ data: [], error: null });
        }),
      }));

      const result = await checkSubmissionReadiness(
        ROUND_ID, PLAYER_A_ID, true, 18, [PLAYER_A_ID, PLAYER_B_ID]
      );

      expect(result.canSubmit).toBe(false);
      expect(result.reason).toBe('unresolved_mismatches');
      expect(result.mismatchCount).toBe(1);
    });
```

- [ ] **Step 2: Run the new tests to verify the first one fails**

Run: `pnpm test -- scoreMismatchService -t "pairs: ignores|pairs: still blocks"`
Expected: FAIL — "pairs: ignores another group's pending mismatch" currently returns `canSubmit: false` because `checkPairsReadiness` blocks on any round-wide mismatch. (The second test already passes.)

- [ ] **Step 3: Scope `checkPairsReadiness`**

In `src/services/scoreMismatch/submission.ts`, replace `checkPairsReadiness` (lines 49-77):

```typescript
async function checkPairsReadiness(
  roundId: string,
  userId: string,
  holeCount: number,
  groupPlayerIds?: string[]
): Promise<SubmissionReadiness> {
  // Check for pending mismatches first — scoped to this pair's players so a
  // different pair's unresolved mismatch can't block us.
  const pendingMismatches = filterMismatchesToPlayers(
    await getPendingMismatches(roundId),
    groupPlayerIds
  );
  if (pendingMismatches.length > 0) {
    return {
      canSubmit: false,
      reason: 'unresolved_mismatches',
      mismatchCount: pendingMismatches.length,
    };
  }

  // Check partner progress
  const partnerProgress = await getPartnerProgress(roundId, userId, holeCount);

  if (!partnerProgress.complete) {
    return {
      canSubmit: false,
      reason: 'waiting_for_partner',
      partnerName: partnerProgress.partnerName,
      partnerProgress: partnerProgress.progress,
    };
  }

  return { canSubmit: true };
}
```

- [ ] **Step 4: Run the pairs tests to verify they pass**

Run: `pnpm test -- scoreMismatchService -t "pairs|Submission Readiness"`
Expected: PASS — both new pairs tests and all pre-existing pairs tests (which pass no `groupPlayerIds`, so behaviour is unchanged).

- [ ] **Step 5: Commit**

```bash
git add src/services/scoreMismatch/submission.ts src/__tests__/services/scoreMismatch/scoreMismatchService.test.ts
git commit -m "fix(scoring): scope scoring-pairs submission gate to the pair

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>"
```

---

### Task 3: Pass the current group's player ids from the submit screen

**Files:**
- Modify: `src/screens/scoring/ReviewScorecardScreen/hooks/useScoreSubmission.ts:414-422`

**Interfaces:**
- Consumes: `useScorecardStore.getState().groupScorecards` (a `Map<string, Scorecard>` keyed by player id — already used elsewhere in this hook at line 268); `checkSubmissionReadiness(...groupPlayerIds)` from Task 1.
- Produces: no new exports — wires the call site.

- [ ] **Step 1: Read the current group player ids and pass them in**

In `src/screens/scoring/ReviewScorecardScreen/hooks/useScoreSubmission.ts`, inside `handleSubmit`, locate the readiness call (lines 414-422):

```typescript
    if (currentUserId && roundId && isOnline) {
      try {
        submitLogger.info('Checking submission readiness', { scoringPairsEnabled });
        const readiness = await checkSubmissionReadiness(
          roundId,
          currentUserId,
          scoringPairsEnabled,
          holeCount,
        );
```

Replace it with a version that derives the group player ids from the store and passes them as the 5th argument:

```typescript
    if (currentUserId && roundId && isOnline) {
      try {
        // Players this device is submitting (its on-course group / pair). Used
        // to scope the readiness gate so different groups submit independently.
        const groupPlayerIds = [...useScorecardStore.getState().groupScorecards.keys()];
        submitLogger.info('Checking submission readiness', {
          scoringPairsEnabled,
          groupPlayerCount: groupPlayerIds.length,
        });
        const readiness = await checkSubmissionReadiness(
          roundId,
          currentUserId,
          scoringPairsEnabled,
          holeCount,
          groupPlayerIds,
        );
```

(`useScorecardStore` is already imported at line 36 and accessed via `.getState()` at line 269, so no new import is needed.)

- [ ] **Step 2: Type-check the change**

Run: `pnpm type-check`
Expected: No new errors introduced by `useScoreSubmission.ts` or `submission.ts`. (Compare against the known baseline; pre-existing errors elsewhere are out of scope — see project memory "Jest baseline noise".)

- [ ] **Step 3: Commit**

```bash
git add src/screens/scoring/ReviewScorecardScreen/hooks/useScoreSubmission.ts
git commit -m "fix(scoring): pass current group player ids into submission gate

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>"
```

---

### Task 4: Verify sub-match / split-round path and run the full gate suite

This task adds no new production behaviour; it verifies the sub-match requirement and guards against regressions. A sub-match's players are a subset of a group, so scoping the gate to that subset already makes each sub-match independently submittable — but we must confirm which screen split rounds use.

**Files:**
- Read-only verification across `src/screens/scoring/MatchPlayScorecardScreen/` and `src/screens/scoring/ReviewScorecardScreen/`.

- [ ] **Step 1: Confirm how split / sub-match rounds submit**

Run: `grep -rn "checkSubmissionReadiness\|submitScorecards\|groupScorecards" src/screens/scoring/MatchPlayScorecardScreen src/screens/scoring/ReviewScorecardScreen`

Expected outcome to confirm and note in the commit message / PR:
- `MatchPlayScorecardScreen` submits directly via `submitScorecards()` with **no** `checkSubmissionReadiness` call → sub-matches scored there are already independent.
- If a split/sub-match round routes through `ReviewScorecardScreen`, its `groupScorecards` holds only that sub-match's players, so the Task 3 wiring scopes the gate to those players → independent. Confirm `groupScorecards` is populated per sub-match (initialized with only the sub-match's players) and not the full round.

If the grep shows a split round going through `ReviewScorecardScreen` with the **full round's** players in `groupScorecards` (not just the sub-match's), STOP and report — the scoping unit would be wrong and the design needs revisiting before proceeding.

- [ ] **Step 2: Run the full score-mismatch suite**

Run: `pnpm test -- scoreMismatchService`
Expected: PASS — entire file green (existing + new tests).

- [ ] **Step 3: Run the broader scoring test surface to check for regressions**

Run: `pnpm test -- scoreMismatch submission useScoreSubmission`
Expected: PASS, or only pre-existing baseline failures unrelated to this change (cross-check against project memory "Jest baseline noise"). No new failures attributable to `submission.ts` / `useScoreSubmission.ts`.

- [ ] **Step 4: Commit verification note (if any docs updated)**

If Step 1 surfaced anything worth recording, append a short "Verification" note to the design spec and commit:

```bash
git add docs/superpowers/specs/2026-06-26-independent-group-submatch-submission-design.md
git commit -m "docs(scoring): record sub-match submission verification

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>"
```

Otherwise skip this step.

---

## Manual QA (deferred, tracked separately per project norms)

On-device, against staging:
1. Team comp, 2 groups of 4, one device per group. Group A finishes and submits while Group B is mid-round → Group A submits with no "waiting for other scorers" dialog; Group A's results appear on the leaderboard.
2. Group B finishes later and submits independently → full leaderboard.
3. Within one group, two devices score the same player differently → mismatch surfaces and blocks until resolved (same-group recon preserved).
4. Split round with sub-matches → each sub-match submits as its own players finish, without waiting on other sub-matches.
5. Scoring pairs enabled → you only wait on your assigned pair; another pair's mismatch does not block you.

## Self-Review Notes

- **Spec coverage:** Goal 1 (independent groups) → Task 1 + Task 3. Goal 2 (independent sub-matches) → Task 4 verification (falls out of Task 1/3 scoping). Goal 3 (same-group recon) → Task 1 test "still waits for a co-scorer of the SAME group". Goal 4 (pairs unchanged + scoped) → Task 2. Non-goals (no migration, no finalization change) respected.
- **Backward compatibility:** `groupPlayerIds` is optional and trailing; `filterMismatchesToPlayers` and the multi-scorer scope both no-op when it's absent/empty, so all existing tests/call sites are unaffected.
- **Type consistency:** `groupPlayerIds?: string[]` is used identically across `checkSubmissionReadiness`, `checkPairsReadiness`, `checkMultiScorerReadiness`, and `filterMismatchesToPlayers`. `ScoreMismatch` import added in Task 1.
