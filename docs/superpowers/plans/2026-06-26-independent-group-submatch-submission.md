# Independent Group & Sub-Match Submission Implementation Plan

> **STATUS (2026-06-26):** Tasks 1–2 are DONE and correct. Task 3's *source* was wrong
> (verified: team rounds load all 8 players into `groupScorecards`, not the group). The
> design was revised — see the spec's "REVISION (2026-06-26)" section. **Execute the
> "## Revised Tasks (v2)" section at the bottom; it supersedes Tasks 3–4 above.** Tasks 3–4
> below are retained only for history (Task 3 is already committed as `7d64c8cb` and will be
> corrected by Task V1).

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

---

# Revised Tasks (v2) — supersedes Tasks 3–4

**Why:** Verified that for `is_team_round` rounds, `useRoundData.ts:311-338` loads ALL team
members into `groupScorecards`, so the on-course group boundary is the user's **pairing**,
not `groupScorecards`. Three things couple the two groups: the readiness gate (Tasks 1–2
service layer is correct; only the call-site source was wrong), `submitScorecards`, and
`updateRoundStatus`. The store's existing `allowedPlayerIds` ("players this device is
responsible for") becomes the single group-scope source, driving all three.

## v2 Global Constraints (in addition to the original Global Constraints)

- **Group scope = the user's pairing, toggle-aware**, represented by store
  `allowedPlayerIds`. When the group-filter "show all" toggle is on, scope expands to the
  shown set. Source of truth at the scoring screen is `playersToRender`.
- **Round flips to `completed` only when every scorecard for the round is terminal**
  (`completed` or `confirmed`). Results still finalize incrementally per submit.
- **Backward compatible:** when `allowedPlayerIds` is empty, fall back to today's behaviour
  (whole field). Scoring-pairs, single-group, and standalone rounds behave exactly as now.
- Scorecard statuses: `'not-started' | 'in-progress' | 'completed' | 'confirmed'`. Terminal
  = `completed` or `confirmed`.

---

### Task V1: Make `allowedPlayerIds` the group scope and feed it to the readiness gate

Generalises the scoring screen's `allowedPlayerIds` population from sub-match-only to the
full effective scope, and switches the gate's source from `groupScorecards.keys()` to
`allowedPlayerIds`. This is what actually fixes the cross-group wait for plain team rounds.

**Files:**
- Modify: `src/screens/scoring/ScorecardEntryScreen/index.tsx:483-502` (the `allowedPlayerIds` effect)
- Modify: `src/screens/scoring/ReviewScorecardScreen/hooks/useScoreSubmission.ts:418` (gate source)

**Interfaces:**
- Consumes: `playersToRender: Player[]` (already computed at `ScorecardEntryScreen/index.tsx:437`); `setAllowedPlayers(playerIds: string[])`; `useScorecardStore.getState().allowedPlayerIds: string[]`.
- Produces: store `allowedPlayerIds` now reflects the toggle-aware on-course group (pairing) for team rounds, not just sub-matches.

- [ ] **Step 1: Generalise the `allowedPlayerIds` effect in ScorecardEntryScreen**

Replace the existing effect at `src/screens/scoring/ScorecardEntryScreen/index.tsx:483-502`
(the one guarded by `if (!activePlayerIds) return;`) with one that sets the scope from the
effective render set in ALL subset modes (scoring pairs, group filter, sub-match):

```tsx
  // Keep the store's `allowedPlayerIds` in sync with the players this device is
  // actually responsible for scoring — `playersToRender` already resolves the
  // effective scope (scoring-pair set, on-course group filter incl. its show-all
  // toggle, and/or sub-match scope). Driving the store from one place lets the
  // submission gate, submit, and round-completion all scope to the same group.
  useEffect(() => {
    if (!isInitialized || currentRoundId !== roundId) return;
    if (playersToRender.length === 0) return;
    const ids = playersToRender.map((p) => p.id);
    const current = useScorecardStore.getState().allowedPlayerIds;
    // Avoid redundant sets (prevents render loops).
    if (current.length === ids.length && current.every((id) => ids.includes(id))) return;
    setAllowedPlayers(ids);
  }, [isInitialized, currentRoundId, roundId, playersToRender, setAllowedPlayers]);
```

Notes for the implementer:
- `playersToRender` is defined just above (line ~437) — this effect must remain BELOW it.
- This supersedes the old sub-match-only effect; the sub-match case is still covered because
  `playersToRender` already equals the sub-match scope when a sub-match is active.
- Leave `useRoundData.ts:465`'s scoring-pairs population as-is; it agrees with
  `playersToRender` for the pairs case (redundant, harmless).

- [ ] **Step 2: Switch the gate source in useScoreSubmission**

In `src/screens/scoring/ReviewScorecardScreen/hooks/useScoreSubmission.ts`, replace the
group-ids derivation at line 418:

```tsx
        const groupPlayerIds = [...useScorecardStore.getState().groupScorecards.keys()];
```

with the `allowedPlayerIds`-first version (fall back to the full field when unset):

```tsx
        // Scope the readiness gate to the players this device is responsible for
        // (its on-course group / pair). `allowedPlayerIds` is set by the scoring
        // screen; fall back to the full field when it is empty (legacy behaviour).
        const { allowedPlayerIds: scopeIds, groupScorecards: scopeCards } =
          useScorecardStore.getState();
        const groupPlayerIds =
          scopeIds.length > 0 ? scopeIds : [...scopeCards.keys()];
```

- [ ] **Step 3: Type-check**

Run: `pnpm type-check 2>&1 | grep -E "ScorecardEntryScreen|useScoreSubmission" || echo "NO ERRORS in touched files"`
Expected: `NO ERRORS in touched files`.

- [ ] **Step 4: Commit**

```bash
git add src/screens/scoring/ScorecardEntryScreen/index.tsx src/screens/scoring/ReviewScorecardScreen/hooks/useScoreSubmission.ts
git commit -m "fix(scoring): scope submission gate to the on-course group via allowedPlayerIds

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>"
```

---

### Task V2: Scope `submitScorecards` to the group's players

So one group's submit only completes/syncs its own cards, never the other group's.

**Files:**
- Modify: `src/store/scorecardStore.ts:101` (interface), `:310-412` (`submitScorecards`)
- Modify: `src/screens/scoring/ReviewScorecardScreen/hooks/useScoreSubmission.ts` (call sites at lines 578, 785, 920 — pass scope)
- Test: `src/__tests__/store/scorecardStore.test.ts`

**Interfaces:**
- Produces: `submitScorecards: (options?: { bypassed?: boolean; playerIds?: string[] }) => Promise<void>`. When `playerIds` is provided and non-empty, only cards for those players are completed/synced; otherwise all cards (legacy).

Note: the existing interface at line 101 is `submitScorecards: () => Promise<void>;` but
the implementation is already called with `{ bypassed: true }` at useScoreSubmission.ts:785,
so the interface is out of sync. Bring the signature to
`(options?: { bypassed?: boolean; playerIds?: string[] }) => Promise<void>` and read both
fields inside.

- [ ] **Step 1: Write the failing test**

In `src/__tests__/store/scorecardStore.test.ts`, add a test that seeds `groupScorecards`
with two groups and asserts `submitScorecards({ playerIds })` only completes the passed
group. Use the file's existing store-setup/mocking patterns (read the top of the file and a
nearby `submitScorecards`/`saveScorecard` test first, and mirror them — saving/sync are
mocked there). The assertion that matters:

```ts
  it('only completes scorecards for the passed playerIds (group-scoped submit)', async () => {
    // Arrange: store initialised with 4 players (2 "groups" of 2), all in-progress,
    // each with a full set of scores (mirror existing tests' seeding helper).
    // Act:
    await useScorecardStore.getState().submitScorecards({ playerIds: [PLAYER_A, PLAYER_B] });
    // Assert:
    const cards = useScorecardStore.getState().groupScorecards;
    expect(cards.get(PLAYER_A)!.status).toBe('completed');
    expect(cards.get(PLAYER_B)!.status).toBe('completed');
    expect(cards.get(PLAYER_C)!.status).not.toBe('completed'); // other group untouched
    expect(cards.get(PLAYER_D)!.status).not.toBe('completed');
  });
```

If the existing tests use a different status field or seeding helper, match them exactly.

- [ ] **Step 2: Run the test to verify it fails**

Run: `pnpm test -- scorecardStore -t "group-scoped submit"`
Expected: FAIL — currently `submitScorecards` ignores `playerIds` and completes all four.

- [ ] **Step 3: Implement the scope in `submitScorecards`**

In `src/store/scorecardStore.ts`:

(a) Update the interface (line 101):

```ts
  submitScorecards: (options?: { bypassed?: boolean; playerIds?: string[] }) => Promise<void>;
```

(b) Update the implementation header (line 310) to accept options and compute the target
set. Change `submitScorecards: async () => {` to:

```ts
    submitScorecards: async (options) => {
      const { groupScorecards, currentRoundId, selectedTeeData, holes, gameType, nineType } = get();
      const scopeIds = options?.playerIds;
      const targetIds =
        scopeIds && scopeIds.length > 0 ? new Set(scopeIds) : null;
```

(c) In the submission loop (currently `for (const [playerId, scorecard] of newScorecards) {`
at line 353), skip players outside the scope. Insert as the first lines of the loop body:

```ts
        if (targetIds && !targetIds.has(playerId)) {
          continue; // group-scoped submit: leave other groups' cards untouched
        }
```

Leave the diagnostics loop (lines 332-344) and `newScorecards` map construction as-is; only
the write loop is scoped. The `set({ groupScorecards: newScorecards })` still writes back the
map (unchanged entries for skipped players).

- [ ] **Step 4: Run the test to verify it passes**

Run: `pnpm test -- scorecardStore -t "group-scoped submit"`
Expected: PASS. Then run the whole store file to check no regression:
Run: `pnpm test -- scorecardStore`
Expected: PASS (or only pre-existing baseline failures unrelated to this change).

- [ ] **Step 5: Pass the scope at the call sites**

In `src/screens/scoring/ReviewScorecardScreen/hooks/useScoreSubmission.ts`, compute the
scope once near the other store reads and pass it to the three `submitScorecards(...)` calls:

- Line ~578 `await submitScorecards();` → `await submitScorecards({ playerIds: submitScopeIds });`
- Line ~785 `await submitScorecards({ bypassed: true });` → `await submitScorecards({ bypassed: true, playerIds: submitScopeIds });`
- Line ~920 `await submitScorecards();` → `await submitScorecards({ playerIds: submitScopeIds });`

Where `submitScopeIds` is derived the same way as the gate scope. Add a small local helper at
the top of each callback (or a `useCallback`/inline const) — to avoid drift, define it inline
at each call site:

```tsx
        const { allowedPlayerIds: aIds, groupScorecards: gCards } = useScorecardStore.getState();
        const submitScopeIds = aIds.length > 0 ? aIds : [...gCards.keys()];
```

(When `allowedPlayerIds` is empty, `submitScopeIds` = whole field → legacy behaviour, so
single-group / standalone / scoring-pairs rounds are unaffected.)

- [ ] **Step 6: Type-check and commit**

Run: `pnpm type-check 2>&1 | grep -E "scorecardStore|useScoreSubmission" || echo "NO ERRORS in touched files"`
Expected: `NO ERRORS in touched files`.

```bash
git add src/store/scorecardStore.ts src/screens/scoring/ReviewScorecardScreen/hooks/useScoreSubmission.ts src/__tests__/store/scorecardStore.test.ts
git commit -m "fix(scoring): scope submitScorecards to the submitting group's players

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>"
```

---

### Task V3: Round completes only when every scorecard is terminal

So the first group's submit no longer flips the whole round to `completed`.

**Files:**
- Modify: `src/screens/scoring/ReviewScorecardScreen/hooks/useRoundFinalization.ts:11-62` (`updateRoundStatus`)
- Test: `src/__tests__/hooks/scorecard/useSubmitScorecard.test.tsx` (or a new focused test file `src/__tests__/hooks/scorecard/useRoundFinalization.test.ts` if the existing file's harness doesn't fit — check first and prefer extending the existing one).

**Interfaces:**
- `updateRoundStatus(roundId: string): Promise<void>` — signature unchanged. New behaviour:
  flips `rounds.status` to `'completed'` only when all of the round's scorecards are terminal
  (`completed`/`confirmed`) AND their count is at least the expected field size (distinct
  players across the round's pairings; if there are no pairings, the existing-scorecard count
  is used). Otherwise it leaves the round status untouched and returns.

- [ ] **Step 1: Write the failing test**

Add a test asserting that when not all scorecards are terminal, the round is NOT updated.
Mirror the supabase-mock style used in the chosen test file. The essential shape:

```ts
  it('does not flip the round to completed while a group is still in-progress', async () => {
    // scorecards for the round: 4 completed (group A) + 4 in-progress (group B)
    // pairings: 8 distinct players
    // Expect: the rounds.update({ status: 'completed' }) call is NOT made.
  });

  it('flips the round to completed once every scorecard is terminal', async () => {
    // scorecards: all 8 completed; pairings: 8 players
    // Expect: rounds.update({ status: 'completed' }) IS called.
  });
```

Implement the supabase mock so `.from('scorecards').select('status,player_id').eq('round_id', …)`
returns the seeded rows, `.from('pairings').select('player_ids').eq('round_id', …)` returns the
pairings, and `.from('rounds').update(...)` is a spy. Assert on the spy.

- [ ] **Step 2: Run the test to verify it fails**

Run: `pnpm test -- useRoundFinalization` (or the file you extended)
Expected: FAIL — current `updateRoundStatus` always calls `rounds.update({ status: 'completed' })`.

- [ ] **Step 3: Add the all-terminal guard to `updateRoundStatus`**

In `src/screens/scoring/ReviewScorecardScreen/hooks/useRoundFinalization.ts`, inside
`updateRoundStatus`, BEFORE the `rounds.update({ status: 'completed' })` block (line 36-38),
insert the guard:

```ts
      // Multi-group independence: only complete the ROUND once every scorecard is
      // terminal. The first group's submit must not flip the whole round, or the
      // other group could be locked out. Results still finalize incrementally.
      // eslint-disable-next-line @typescript-eslint/no-explicit-any -- generated-types workaround
      const { data: roundCards } = await (supabase as any)
        .from('scorecards')
        .select('status, player_id')
        .eq('round_id', roundId);

      const cards: { status: string }[] = roundCards ?? [];
      const TERMINAL = new Set(['completed', 'confirmed']);
      const terminalCount = cards.filter((c) => TERMINAL.has(c.status)).length;
      const allTerminal = cards.length > 0 && terminalCount === cards.length;

      // Expected field size = distinct players across the round's pairings.
      // eslint-disable-next-line @typescript-eslint/no-explicit-any -- generated-types workaround
      const { data: pairingRows } = await (supabase as any)
        .from('pairings')
        .select('player_ids')
        .eq('round_id', roundId);
      const expected = pairingRows
        ? new Set(
            (pairingRows as { player_ids: string[] }[]).flatMap((p) => p.player_ids ?? [])
          ).size
        : 0;
      const enoughCards = expected === 0 ? true : terminalCount >= expected;

      if (!allTerminal || !enoughCards) {
        submitLogger.info('Round not yet complete — leaving status unchanged', {
          roundId: roundId.substring(0, 8) + '...',
          terminalCount,
          totalCards: cards.length,
          expected,
        });
        return;
      }
```

This sits after the existing "fetch current round" logging block and before the update. The
rest of `updateRoundStatus` (the update + 0-rows check) is unchanged.

Backward compatibility: single-group / standalone rounds have all their cards terminal on
the one submit, and `terminalCount >= expected` (or `expected === 0`), so they complete as
today.

- [ ] **Step 4: Run the test to verify it passes**

Run: `pnpm test -- useRoundFinalization` (or the file you extended)
Expected: PASS (both new cases).

- [ ] **Step 5: Type-check and commit**

Run: `pnpm type-check 2>&1 | grep -E "useRoundFinalization" || echo "NO ERRORS in touched files"`
Expected: `NO ERRORS in touched files`.

```bash
git add src/screens/scoring/ReviewScorecardScreen/hooks/useRoundFinalization.ts src/__tests__/hooks/scorecard/
git commit -m "fix(scoring): complete the round only when every scorecard is terminal

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>"
```

---

### Task V4: Verify end-to-end and full suite

- [ ] **Step 1: Re-confirm sub-match path unaffected**

Run: `grep -rn "checkSubmissionReadiness\|submitScorecards" src/screens/scoring/MatchPlayScorecardScreen`
Expected: `MatchPlayScorecardScreen` still submits directly (no readiness gate); `submitScorecards()`
there is called with no args → whole-field legacy path, which for that screen is the 2-player
match — correct and unchanged.

- [ ] **Step 2: Run the full affected suites**

Run: `pnpm test -- scoreMismatchService scorecardStore useRoundFinalization useSubmitScorecard`
Expected: PASS, or only pre-existing baseline failures unrelated to these files (cross-check
project memory "Jest baseline noise").

- [ ] **Step 3: Type-check whole project (touched files clean)**

Run: `pnpm type-check 2>&1 | grep -E "ScorecardEntryScreen|useScoreSubmission|scorecardStore|useRoundFinalization|scoreMismatch/submission" || echo "NO ERRORS in touched files"`
Expected: `NO ERRORS in touched files`.

- [ ] **Step 4: Manual QA (deferred, tracked separately)**

Against the real shape (team round, 8-player field, 2 pairings of 4, one scorer per group):
1. Group A submits while Group B is mid-round → A passes the gate (no "waiting for other
   scorers"), only A's 4 cards become `completed`, round stays `in-progress`, A's results
   appear on the leaderboard.
2. Group B submits later → their 4 complete, round flips to `completed`.
3. Same-group double-scoring of one player → mismatch still surfaces and blocks (Tasks 1–2).
4. Scoring pairs enabled → only wait on your pair; another pair's mismatch doesn't block.
5. "Show all" then mark + submit another group → those cards are included in the submit.

## v2 Self-Review Notes

- **Coupling coverage:** gate → V1; submit → V2; round status → V3; verification → V4.
- **Single scope source:** `allowedPlayerIds` (set from `playersToRender` in V1) feeds both
  the gate (V1) and submit (V2); V3's completion guard is scope-independent (counts all
  scorecards). No drift between gate scope and submit scope.
- **Backward compatibility:** every change no-ops when `allowedPlayerIds` is empty / round is
  single-group / standalone / scoring-pairs. `submitScorecards`/`updateRoundStatus` keep their
  legacy behaviour in those cases.
- **Type consistency:** `submitScorecards` options type
  `{ bypassed?: boolean; playerIds?: string[] }` is used identically at the interface and all
  three call sites; `updateRoundStatus(roundId)` signature unchanged.

---

# Hardening Tasks (v3) — final-review follow-ups

Addresses the final whole-branch review. **I-1** (Important): scope silently reverts to
whole-field if `usePairings` is unresolved at submit. **M-5**: residual no-arg
`submitScorecards()` callers complete all cards. **M-7**: the scope-resolution crux is
untested by CI. (M-4 skipped — `useMismatchResolutionFlow` is export-only/unused. M-6
skipped — H1's pairing fallback mitigates the two-writer fragility.)

## v3 Global Constraints

- Backward compatible: single-group / standalone / scoring-pairs / 2-player match-play
  unaffected. Match-play screens (`MatchPlayScoringScreen`, `MatchPlayScorecardScreen`) keep
  their no-arg `submitScorecards()` (correct single 2-player context) — do NOT change them.
- `PairingWithPlayers` imports from `@/types` and has `playerIds: string[]`.

---

### Task H1: Robust, tested group-scope resolver (I-1 + M-7 + DRY)

Replace the four duplicated `allowedPlayerIds.length>0 ? … : groupScorecards.keys()`
derivations in `useScoreSubmission` with one resolver that falls back to the user's pairing
(not the whole field) when `allowedPlayerIds` is empty.

**Files:**
- Create: `src/screens/scoring/ReviewScorecardScreen/hooks/resolveGroupScope.ts`
- Test: `src/__tests__/screens/scoring/resolveGroupScope.test.ts`
- Modify: `src/screens/scoring/ReviewScorecardScreen/hooks/useScoreSubmission.ts` (gate ~421-423; submit sites ~584-585, ~793-794, ~930-931; add `usePairings`)

**Interfaces:**
- Produces: `resolveGroupScopeIds(params: { allowedPlayerIds: string[]; pairings: PairingWithPlayers[] | undefined; currentUserId: string | undefined; groupScorecardPlayerIds: string[] }): string[]`

- [ ] **Step 1: Write the failing test**

`src/__tests__/screens/scoring/resolveGroupScope.test.ts`:

```typescript
import { resolveGroupScopeIds } from '@/screens/scoring/ReviewScorecardScreen/hooks/resolveGroupScope';
import type { PairingWithPlayers } from '@/types';

const pairing = (id: string, playerIds: string[]): PairingWithPlayers =>
  ({ id, round_id: 'r', playerIds, players: [] } as unknown as PairingWithPlayers);

describe('resolveGroupScopeIds', () => {
  const base = {
    allowedPlayerIds: [] as string[],
    pairings: undefined as PairingWithPlayers[] | undefined,
    currentUserId: 'U' as string | undefined,
    groupScorecardPlayerIds: ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H'],
  };

  it('prefers allowedPlayerIds when present', () => {
    expect(resolveGroupScopeIds({ ...base, allowedPlayerIds: ['A', 'B'] })).toEqual(['A', 'B']);
  });

  it("falls back to the user's pairing when allowedPlayerIds is empty", () => {
    const pairings = [pairing('p1', ['A', 'B', 'U', 'D']), pairing('p2', ['E', 'F', 'G', 'H'])];
    expect(resolveGroupScopeIds({ ...base, pairings })).toEqual(['A', 'B', 'U', 'D']);
  });

  it('falls back to all scorecards when no pairing matches the user', () => {
    const pairings = [pairing('p1', ['A', 'B']), pairing('p2', ['E', 'F'])];
    expect(resolveGroupScopeIds({ ...base, pairings })).toEqual(base.groupScorecardPlayerIds);
  });

  it('falls back to all scorecards when pairings are unresolved', () => {
    expect(resolveGroupScopeIds({ ...base, pairings: undefined })).toEqual(base.groupScorecardPlayerIds);
  });
});
```

- [ ] **Step 2: Run to verify it fails**

Run: `pnpm test -- resolveGroupScope`
Expected: FAIL — module does not exist yet.

- [ ] **Step 3: Implement the resolver**

`src/screens/scoring/ReviewScorecardScreen/hooks/resolveGroupScope.ts`:

```typescript
import type { PairingWithPlayers } from '@/types';

/**
 * Resolve the players this device is responsible for submitting (its on-course
 * group / pair). Priority:
 *   1. allowedPlayerIds — set by the scoring screen (toggle-aware effective scope).
 *   2. the user's pairing — robust fallback when the scoring screen hasn't yet
 *      populated allowedPlayerIds (e.g. pairings just resolved). Prevents silently
 *      reverting to the whole field on a multi-group team round.
 *   3. all loaded scorecards — legacy whole-field (single group / standalone).
 */
export function resolveGroupScopeIds(params: {
  allowedPlayerIds: string[];
  pairings: PairingWithPlayers[] | undefined;
  currentUserId: string | undefined;
  groupScorecardPlayerIds: string[];
}): string[] {
  const { allowedPlayerIds, pairings, currentUserId, groupScorecardPlayerIds } = params;
  if (allowedPlayerIds.length > 0) return allowedPlayerIds;
  if (currentUserId && pairings) {
    const userPairing = pairings.find((p) => p.playerIds.includes(currentUserId));
    if (userPairing && userPairing.playerIds.length > 0) return userPairing.playerIds;
  }
  return groupScorecardPlayerIds;
}
```

- [ ] **Step 4: Run to verify it passes**

Run: `pnpm test -- resolveGroupScope`
Expected: PASS (4/4).

- [ ] **Step 5: Wire it into useScoreSubmission**

In `src/screens/scoring/ReviewScorecardScreen/hooks/useScoreSubmission.ts`:

(a) Add imports (with the other imports):

```typescript
import { usePairings } from '@/hooks/rounds';
import { resolveGroupScopeIds } from './resolveGroupScope';
```

(Check the correct export path for `usePairings` — it is defined in
`src/hooks/rounds/pairings.ts` and re-exported via `src/hooks/rounds/index.ts`; use
`@/hooks/rounds`.)

(b) Near the top of the hook body (after the params are destructured, alongside other
hook calls), add the pairings query and a single scope resolver:

```typescript
  const { data: roundPairings } = usePairings(currentRoundId ?? routeRoundId ?? undefined);

  const getGroupScopeIds = useCallback((): string[] => {
    const { allowedPlayerIds, groupScorecards } = useScorecardStore.getState();
    return resolveGroupScopeIds({
      allowedPlayerIds,
      pairings: roundPairings,
      currentUserId,
      groupScorecardPlayerIds: [...groupScorecards.keys()],
    });
  }, [roundPairings, currentUserId]);
```

(c) Replace the gate derivation (~lines 421-423):

```typescript
        const { allowedPlayerIds: scopeIds, groupScorecards: scopeCards } =
          useScorecardStore.getState();
        const groupPlayerIds =
          scopeIds.length > 0 ? scopeIds : [...scopeCards.keys()];
```

with:

```typescript
        const groupPlayerIds = getGroupScopeIds();
```

(d) Replace EACH of the three submit-site derivations (~584-585, ~793-794, ~930-931):

```typescript
        const { allowedPlayerIds: aIds, groupScorecards: gCards } = useScorecardStore.getState();
        const submitScopeIds = aIds.length > 0 ? aIds : [...gCards.keys()];
```

with:

```typescript
        const submitScopeIds = getGroupScopeIds();
```

(Leave the `submitScorecards({ ... playerIds: submitScopeIds })` calls themselves unchanged.)

- [ ] **Step 6: Type-check and commit**

Run: `pnpm type-check 2>&1 | grep -E "useScoreSubmission|resolveGroupScope" || echo "NO ERRORS in touched files"`
Expected: `NO ERRORS in touched files`.

```bash
git add src/screens/scoring/ReviewScorecardScreen/hooks/resolveGroupScope.ts src/__tests__/screens/scoring/resolveGroupScope.test.ts src/screens/scoring/ReviewScorecardScreen/hooks/useScoreSubmission.ts
git commit -m "fix(scoring): robust group-scope resolver with pairing fallback (I-1)

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>"
```

---

### Task H2: Scope the residual whole-field submit callers (M-5)

Two reachable no-arg `submitScorecards()` callers complete ALL cards. Scope them.
Do NOT touch the match-play callers (`MatchPlayScoringScreen:384`,
`MatchPlayScorecardScreen:225`) — their whole-field set IS the 2-player match.

**Files:**
- Modify: `src/screens/scoring/PlayerScorecardScreen/index.tsx:141`
- Modify: `src/screens/scoring/ScorecardEntryScreen/hooks/useScorecardSubmission.ts:74`

- [ ] **Step 1: Scope PlayerScorecardScreen to the viewed player**

`PlayerScorecardScreen/index.tsx` submits a single player's card (`playerId` from
`route.params`, in scope at line 49). Change line 141:

```typescript
      await submitScorecards();
```

to:

```typescript
      await submitScorecards({ playerIds: [playerId] });
```

- [ ] **Step 2: Scope useScorecardSubmission to the entry screen's group**

`ScorecardEntryScreen/hooks/useScorecardSubmission.ts` runs in the scoring screen, which
reliably sets `allowedPlayerIds`. Change line 74:

```typescript
      await submitScorecards();
```

to:

```typescript
      const { allowedPlayerIds, groupScorecards } = useScorecardStore.getState();
      const scopeIds = allowedPlayerIds.length > 0 ? allowedPlayerIds : [...groupScorecards.keys()];
      await submitScorecards({ playerIds: scopeIds });
```

Add `import { useScorecardStore } from '@/store/scorecardStore';` if not already imported in
that file (check first; it likely already imports it to get `submitScorecards`).

- [ ] **Step 3: Type-check and commit**

Run: `pnpm type-check 2>&1 | grep -E "PlayerScorecardScreen|useScorecardSubmission" || echo "NO ERRORS in touched files"`
Expected: `NO ERRORS in touched files`.

```bash
git add src/screens/scoring/PlayerScorecardScreen/index.tsx src/screens/scoring/ScorecardEntryScreen/hooks/useScorecardSubmission.ts
git commit -m "fix(scoring): scope residual whole-field scorecard submits (M-5)

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>"
```

---

### Task H3: Verify hardening

- [ ] **Step 1: Run affected suites**

Run: `pnpm test -- resolveGroupScope scoreMismatchService scorecardStore useRoundFinalization`
Expected: PASS.

- [ ] **Step 2: Type-check touched files**

Run: `pnpm type-check 2>&1 | grep -E "useScoreSubmission|resolveGroupScope|PlayerScorecardScreen|useScorecardSubmission" || echo "NO ERRORS in touched files"`
Expected: `NO ERRORS in touched files`.

- [ ] **Step 3: Confirm match-play untouched**

Run: `grep -n "submitScorecards()" src/screens/scoring/MatchPlayScoringScreen/index.tsx src/screens/scoring/MatchPlayScorecardScreen/index.tsx`
Expected: both still call no-arg `submitScorecards()` (intentionally unchanged).
