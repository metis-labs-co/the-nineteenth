# Match Play Difference-Handicap Unification — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make singles match play allocate handicap strokes with one shared "difference method" helper (lower-handicap player plays off scratch), so live scoring, the scorecard display, the scoring engine, and the round-list result always agree.

**Architecture:** Add a single pure helper `getMatchPlayStrokes(handicapA, handicapB, strokeIndex)` to `src/utils/scoring.ts`, built on the existing `getStrokesReceived` primitive. Refactor the four existing call sites to delegate to it. Two of those sites (live scoring hook + scorecard display) currently use the "full handicaps, compare net" method (Method A) and switch to the difference method (Method B); the other two (engine + round list) already implement Method B by hand and are refactored to the shared helper with no behaviour change.

**Tech Stack:** TypeScript, React Native, Jest, `@testing-library/react-native`.

## Global Constraints

- Package manager is **pnpm**. Run tests with `pnpm test` (Jest).
- Match play uses **100% handicap allowance** (`getHandicapAllowance('match-play') → 1.0`); handicaps are pre-rounded to integers upstream. Do not change allowance or rounding.
- Use the regular per-hole `strokeIndex`. There is **no** match-play-specific index available (`match_play_indexes` is always `null`); do not attempt to read it.
- Baseline note: the Jest suite has ~243 pre-existing failures on `main`. Evaluate test results as a **diff against baseline**, not absolute zero. New/changed test files below must pass on their own.
- Scope is **singles match play only**. Do not touch team match play (`src/utils/teamScoring/`, `TeamMatchPlayScoringScreen`).

---

### Task 1: Add the shared `getMatchPlayStrokes` helper (TDD)

**Files:**
- Modify: `src/utils/scoring.ts` (add function after `getStrokesReceived`, ends line 30)
- Test: `src/utils/scoring.test.ts` (add a new `describe` block)

**Interfaces:**
- Consumes: existing `getStrokesReceived(handicap: number, strokeIndex: number): number` from the same file.
- Produces: `getMatchPlayStrokes(handicapA: number, handicapB: number, strokeIndex: number): { a: number; b: number }` — strokes received by each player on the hole. Only the higher-handicap player receives strokes (the whole handicap difference, allocated by stroke index); equal handicaps yield `{ a: 0, b: 0 }`. Consumed by Tasks 2–5.

- [ ] **Step 1: Write the failing tests**

Add to the top import in `src/utils/scoring.test.ts` (it currently imports only `getEffectiveGrossStrokes`):

```typescript
import { getEffectiveGrossStrokes, getMatchPlayStrokes } from './scoring';
```

Append this `describe` block to `src/utils/scoring.test.ts`:

```typescript
describe('getMatchPlayStrokes', () => {
  it('gives no strokes to either player when handicaps are equal', () => {
    expect(getMatchPlayStrokes(12, 12, 1)).toEqual({ a: 0, b: 0 });
  });

  it('allocates the difference to the higher-handicap player on the lowest-SI holes', () => {
    // diff 5 -> a stroke on the 5 lowest stroke-index holes, none above
    expect(getMatchPlayStrokes(20, 15, 5)).toEqual({ a: 1, b: 0 });
    expect(getMatchPlayStrokes(20, 15, 6)).toEqual({ a: 0, b: 0 });
  });

  it('is symmetric — the higher handicap always receives, regardless of argument order', () => {
    expect(getMatchPlayStrokes(15, 20, 5)).toEqual({ a: 0, b: 1 });
  });

  it('gives a second stroke on the lowest-SI holes when the difference exceeds 18', () => {
    // diff 20 -> 1 stroke on every hole, a 2nd stroke on SI 1 and SI 2
    expect(getMatchPlayStrokes(25, 5, 2)).toEqual({ a: 2, b: 0 });
    expect(getMatchPlayStrokes(25, 5, 3)).toEqual({ a: 1, b: 0 });
  });

  it('allocates to the higher (less-minus) player for plus handicaps', () => {
    // -3 vs -5 -> difference 2, the -3 player receives on the 2 lowest-SI holes
    expect(getMatchPlayStrokes(-3, -5, 1)).toEqual({ a: 1, b: 0 });
    expect(getMatchPlayStrokes(-3, -5, 3)).toEqual({ a: 0, b: 0 });
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `pnpm test -- src/utils/scoring.test.ts`
Expected: FAIL — `getMatchPlayStrokes is not a function` (or a TypeScript "no exported member" error).

- [ ] **Step 3: Implement the helper**

In `src/utils/scoring.ts`, immediately after `getStrokesReceived` (after line 30), add:

```typescript
/**
 * Match-play per-hole stroke allocation (difference method).
 *
 * The lower-handicap player plays off scratch; the higher-handicap player
 * receives the whole handicap difference, allocated by stroke index using the
 * standard {@link getStrokesReceived} rule. Equal handicaps yield no strokes
 * either side. Uses the regular per-hole stroke index — no match-play-specific
 * index is available from our course data.
 *
 * @returns strokes received by each player on the hole (`{ a, b }`).
 */
export function getMatchPlayStrokes(
  handicapA: number,
  handicapB: number,
  strokeIndex: number
): { a: number; b: number } {
  const diff = Math.abs(handicapA - handicapB);
  const strokes = getStrokesReceived(diff, strokeIndex);
  if (handicapA > handicapB) return { a: strokes, b: 0 };
  if (handicapB > handicapA) return { a: 0, b: strokes };
  return { a: 0, b: 0 };
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `pnpm test -- src/utils/scoring.test.ts`
Expected: PASS (all `getMatchPlayStrokes` tests green; pre-existing `getEffectiveGrossStrokes` tests still green).

- [ ] **Step 5: Commit**

```bash
git add src/utils/scoring.ts src/utils/scoring.test.ts
git commit -m "feat(scoring): add getMatchPlayStrokes difference-method helper"
```

---

### Task 2: Switch the live scoring hook to the shared helper

**Files:**
- Modify: `src/hooks/scorecard/useMatchPlayScoring.ts` (import line 16; logic at lines 148–154)

**Interfaces:**
- Consumes: `getMatchPlayStrokes` (Task 1).
- Produces: no new exports; the hook's `holeResults` winners now reflect Method B.

This is a behaviour change: the live match status the player sees during scoring switches from full-handicap net comparison (Method A) to the difference method (Method B). Its winner logic is the pure twin of `calculateAllData` (Task 3), which carries the behavioural regression test in Task 6; this hook reads from the Zustand scorecard store, so it is verified structurally (it now calls the same shared helper) rather than with a store-seeded render test.

- [ ] **Step 1: Update the import**

In `src/hooks/scorecard/useMatchPlayScoring.ts`, change line 16 from:

```typescript
import { getStrokesReceived } from '@/utils/scoring';
```

to:

```typescript
import { getMatchPlayStrokes } from '@/utils/scoring';
```

- [ ] **Step 2: Replace the per-hole allocation**

Replace the `else` block body at lines 148–154:

```typescript
      } else {
        // Compare net scores so handicap strokes received on the hole decide the winner.
        const p1StrokesReceived = getStrokesReceived(player1Handicap, strokeIndex);
        const p2StrokesReceived = getStrokesReceived(player2Handicap, strokeIndex);
        const p1NetScore = p1Score !== null ? p1Score - p1StrokesReceived : null;
        const p2NetScore = p2Score !== null ? p2Score - p2StrokesReceived : null;
        winner = determineHoleWinner(p1NetScore, p2NetScore);
      }
```

with:

```typescript
      } else {
        // Difference method: the lower-handicap player plays off scratch and the
        // higher-handicap player receives the handicap difference on this hole.
        const { a: p1StrokesReceived, b: p2StrokesReceived } = getMatchPlayStrokes(
          player1Handicap,
          player2Handicap,
          strokeIndex
        );
        const p1NetScore = p1Score !== null ? p1Score - p1StrokesReceived : null;
        const p2NetScore = p2Score !== null ? p2Score - p2StrokesReceived : null;
        winner = determineHoleWinner(p1NetScore, p2NetScore);
      }
```

- [ ] **Step 3: Verify the file has no remaining `getStrokesReceived` reference**

Run: `grep -n "getStrokesReceived" src/hooks/scorecard/useMatchPlayScoring.ts`
Expected: no output (empty).

- [ ] **Step 4: Type-check**

Run: `pnpm type-check`
Expected: no new errors introduced by this file (compare against baseline if the project has pre-existing type errors).

- [ ] **Step 5: Commit**

```bash
git add src/hooks/scorecard/useMatchPlayScoring.ts
git commit -m "fix(match-play): score live match status off the handicap difference"
```

---

### Task 3: Switch the scorecard display to the shared helper (TDD)

**Files:**
- Modify: `src/components/scorecard/MatchPlayScorecardTable/utils.ts` (import line 7; logic at lines 57–58)
- Test: `src/components/scorecard/MatchPlayScorecardTable/utils.test.ts` (create)

**Interfaces:**
- Consumes: `getMatchPlayStrokes` (Task 1); existing exported `calculateAllData(holes, player1Id, player2Id, getPlayerScore, player1Handicap, player2Handicap): CalculatedData`.
- Produces: no new exports; `calculateAllData` hole winners now reflect Method B.

- [ ] **Step 1: Write the failing test**

Create `src/components/scorecard/MatchPlayScorecardTable/utils.test.ts`:

```typescript
import { calculateAllData } from './utils';
import type { Hole } from '@/types/database/base';

// Handicaps 20 and 15 on stroke-index-3: this is a case where the two methods
// diverge. Old method (each player's full handicap): both receive 1 stroke on
// SI 3, so with equal gross the hole is halved. New difference method: only the
// difference (5) is allocated, so on SI 3 the higher-handicap player (P1, 20)
// gets the stroke and wins the hole with equal gross.
describe('calculateAllData — difference-method allocation', () => {
  const holes: Hole[] = [{ number: 1, par: 4, strokeIndex: 3 }];

  const scores: Record<string, number> = { 'p1-1': 5, 'p2-1': 5 };
  const getPlayerScore = (playerId: string, holeNumber: number): number | undefined =>
    scores[`${playerId}-${holeNumber}`];

  it('gives the hole to the higher-handicap player on a divergence hole', () => {
    const data = calculateAllData(holes, 'p1', 'p2', getPlayerScore, 20, 15);
    expect(data.holeResults[1].winner).toBe('player1');
  });

  it('gives no strokes to either player when handicaps are equal (halved on equal gross)', () => {
    const data = calculateAllData(holes, 'p1', 'p2', getPlayerScore, 15, 15);
    expect(data.holeResults[1].winner).toBe('halved');
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `pnpm test -- src/components/scorecard/MatchPlayScorecardTable/utils.test.ts`
Expected: FAIL on the first case — winner is `'halved'` (old Method A) instead of `'player1'`.

- [ ] **Step 3: Update the import**

In `src/components/scorecard/MatchPlayScorecardTable/utils.ts`, change line 7 from:

```typescript
import { getStrokesReceived } from '@/utils/scoring';
```

to:

```typescript
import { getMatchPlayStrokes } from '@/utils/scoring';
```

- [ ] **Step 4: Replace the per-hole allocation**

Replace lines 57–58:

```typescript
    const p1Strokes = getStrokesReceived(player1Handicap, hole.strokeIndex);
    const p2Strokes = getStrokesReceived(player2Handicap, hole.strokeIndex);
```

with:

```typescript
    // Difference method: only the handicap difference is allocated, entirely to
    // the higher-handicap player, so the displayed shots match the match result.
    const { a: p1Strokes, b: p2Strokes } = getMatchPlayStrokes(
      player1Handicap,
      player2Handicap,
      hole.strokeIndex
    );
```

- [ ] **Step 5: Run the test to verify it passes**

Run: `pnpm test -- src/components/scorecard/MatchPlayScorecardTable/utils.test.ts`
Expected: PASS (both cases green).

- [ ] **Step 6: Commit**

```bash
git add src/components/scorecard/MatchPlayScorecardTable/utils.ts src/components/scorecard/MatchPlayScorecardTable/utils.test.ts
git commit -m "fix(match-play): display scorecard shots off the handicap difference"
```

---

### Task 4: Refactor the scoring engine to the shared helper (no behaviour change)

**Files:**
- Modify: `src/services/scoring/engines/MatchPlayEngine.ts` (imports near line 19; logic at lines 153–191)

**Interfaces:**
- Consumes: `getMatchPlayStrokes` (Task 1); existing `getPlayingHandicap`, `calculateNetScore`.
- Produces: no new exports; `calculateMatch` behaviour is unchanged.

This is a pure dedupe: the engine already allocates by handicap difference to the higher-handicap player. Replacing its hand-rolled block with `getMatchPlayStrokes` must not change results. The engine's existing tests are the guard.

- [ ] **Step 1: Add the import**

In `src/services/scoring/engines/MatchPlayEngine.ts`, add `getMatchPlayStrokes` to the imports. Find the existing import of `calculateStrokesForHole` (from `../utils/handicapUtils`) and add a named import from `@/utils/scoring`:

```typescript
import { getMatchPlayStrokes } from '@/utils/scoring';
```

(Place it alongside the other `@/`-alias or utils imports at the top of the file, following the existing import grouping.)

- [ ] **Step 2: Replace the per-hole allocation inside the hole loop**

Replace lines 176–191:

```typescript
      // Calculate strokes received on this hole
      let strokes1 = 0;
      let strokes2 = 0;

      if (handicapDiff > 0) {
        const receivingPlayer = player1GivesStrokes ? 2 : 1;
        const strokesReceived = calculateStrokesForHole(
          handicapDiff,
          hole.strokeIndex
        );

        if (receivingPlayer === 1) {
          strokes1 = strokesReceived;
        } else {
          strokes2 = strokesReceived;
        }
      }
```

with:

```typescript
      // Calculate strokes received on this hole (difference method — the
      // lower-handicap player plays off scratch).
      const { a: strokes1, b: strokes2 } = getMatchPlayStrokes(
        handicap1,
        handicap2,
        hole.strokeIndex
      );
```

- [ ] **Step 3: Remove the now-unused locals**

`handicapDiff` (line 154) and `player1GivesStrokes` (line 155) are no longer referenced after Step 2. Delete lines 153–155:

```typescript
    // In match play, difference in handicaps determines strokes given
    const handicapDiff = Math.abs(handicap1 - handicap2);
    const player1GivesStrokes = handicap1 < handicap2;
```

Then check whether `calculateStrokesForHole` is still used elsewhere in the file:

Run: `grep -n "calculateStrokesForHole" src/services/scoring/engines/MatchPlayEngine.ts`

If the only remaining hit is its `import`, remove that import specifier too (leave any other names in the same import statement intact).

- [ ] **Step 4: Type-check and run engine tests**

Run: `pnpm type-check`
Expected: no new errors (no unused-variable errors for `handicapDiff` / `player1GivesStrokes` / `calculateStrokesForHole`).

Run: `pnpm test -- MatchPlayEngine`
Expected: PASS — same results as before (behaviour unchanged). If no dedicated engine test file exists, this command reports "no tests found"; that is acceptable, the parity test in Task 6 covers the engine.

- [ ] **Step 5: Commit**

```bash
git add src/services/scoring/engines/MatchPlayEngine.ts
git commit -m "refactor(match-play): use shared getMatchPlayStrokes in engine"
```

---

### Task 5: Refactor the round-list result to the shared helper (no behaviour change)

**Files:**
- Modify: `src/screens/rounds/RoundListScreen/hooks/useRoundList.ts` (imports; `computeMatchPlayResult` at lines 896–935)

**Interfaces:**
- Consumes: `getMatchPlayStrokes` (Task 1).
- Produces: no new exports; `computeMatchPlayResult` behaviour is unchanged.

Pure dedupe, same as Task 4: `computeMatchPlayResult` already allocates the difference to the higher-DHC player.

- [ ] **Step 1: Ensure the import is present**

Confirm `useRoundList.ts` imports from `@/utils/scoring` (it already imports `getStrokesReceived`). Add `getMatchPlayStrokes` to that import; if `getStrokesReceived` becomes unused after Step 2, remove it from the specifier.

Run first: `grep -n "from '@/utils/scoring'" src/screens/rounds/RoundListScreen/hooks/useRoundList.ts`
Then edit that import line to include `getMatchPlayStrokes`.

- [ ] **Step 2: Replace the per-hole allocation**

Replace lines 929–935:

```typescript
    let strokes1 = 0;
    let strokes2 = 0;
    if (handicapDiff > 0) {
      const sr = getStrokesReceived(handicapDiff, hole.strokeIndex);
      if (player1GivesStrokes) strokes2 = sr;
      else strokes1 = sr;
    }
```

with:

```typescript
    // Difference method: the lower-DHC player plays off scratch and the
    // higher-DHC player receives the difference on this hole.
    const { a: strokes1, b: strokes2 } = getMatchPlayStrokes(
      dhc1,
      dhc2,
      hole.strokeIndex
    );
```

- [ ] **Step 3: Remove the now-unused locals**

`handicapDiff` (line 907) and `player1GivesStrokes` (line 908) are no longer referenced. Delete lines 907–908:

```typescript
  const handicapDiff = Math.abs(dhc1 - dhc2);
  const player1GivesStrokes = dhc1 < dhc2;
```

Then confirm `getStrokesReceived` is not used elsewhere in the file:

Run: `grep -n "getStrokesReceived" src/screens/rounds/RoundListScreen/hooks/useRoundList.ts`
If there are no remaining hits, remove `getStrokesReceived` from the `@/utils/scoring` import specifier.

- [ ] **Step 4: Type-check**

Run: `pnpm type-check`
Expected: no new errors (no unused-variable errors).

- [ ] **Step 5: Commit**

```bash
git add src/screens/rounds/RoundListScreen/hooks/useRoundList.ts
git commit -m "refactor(match-play): use shared getMatchPlayStrokes in round list result"
```

---

### Task 6: Cross-path regression test (display path vs engine)

**Files:**
- Test: `src/services/scoring/engines/MatchPlayEngine.matchParity.test.ts` (create)

**Interfaces:**
- Consumes: `calculateAllData` (display path, Task 3) and `MatchPlayEngine.calculateMatch` (Task 4).

This test locks in that the display path and the engine agree on hole winners for a divergence case, guarding against the two paths drifting apart again. Handicaps are chosen at standard slope/rating so the engine's playing-handicap conversion is an identity (`getPlayingHandicap` at slope 113, course rating = par returns the input handicap rounded), letting us feed the same integer handicaps to both paths.

- [ ] **Step 1: Confirm the playing-handicap identity assumption**

Run: `grep -n "STANDARD_SLOPE_RATING" src/constants/scoring.ts`
Expected: `STANDARD_SLOPE_RATING = 113` (used to confirm slope 113 is the neutral value). If the engine's `getPlayingHandicap` does not reduce to identity at slope 113 / course rating = par for these inputs, adjust the fixture handicaps in Step 2 so that the values passed to `calculateAllData` equal the playing handicaps the engine computes (read them from a one-off `console.log` if needed). Document the chosen values in the test comment.

- [ ] **Step 2: Write the parity test**

Create `src/services/scoring/engines/MatchPlayEngine.matchParity.test.ts`:

```typescript
import { MatchPlayEngine } from './MatchPlayEngine';
import { calculateAllData } from '@/components/scorecard/MatchPlayScorecardTable/utils';
import type { Hole } from '@/types/database/base';
import type { ScorecardWithHandicap, CourseHoleData } from '../types';

// Single divergence hole: P1 hcp 20, P2 hcp 15, SI 3, equal gross 5.
// Difference method gives P1 the stroke -> P1 wins the hole. Both the engine
// and the display path must agree.
const hole: Hole = { number: 1, par: 4, strokeIndex: 3 };
const holes: Hole[] = [hole];

// --- Display path ---
const scores: Record<string, number> = { 'p1-1': 5, 'p2-1': 5 };
const getPlayerScore = (playerId: string, holeNumber: number): number | undefined =>
  scores[`${playerId}-${holeNumber}`];

// --- Engine path (slope 113 / rating = par => playing handicap == input) ---
const makeScorecard = (handicap: number): ScorecardWithHandicap => ({
  handicap,
  scorecard: {
    // Only the fields the engine reads (scores keyed by hole number) matter.
    scores: { '1': { strokes: 5 } },
  } as unknown as ScorecardWithHandicap['scorecard'],
});

const courseData: CourseHoleData = {
  holes,
  par: 4,
  slopeRating: 113,
  courseRating: 4,
};

describe('match play parity — display path vs engine', () => {
  it('both give the divergence hole to the higher-handicap player', () => {
    const display = calculateAllData(holes, 'p1', 'p2', getPlayerScore, 20, 15);
    expect(display.holeResults[1].winner).toBe('player1');

    const engine = new MatchPlayEngine();
    const result = engine.calculateMatch(makeScorecard(20), makeScorecard(15), courseData);
    expect(result.holeResults[0].result).toBe('player1');
  });
});
```

- [ ] **Step 3: Run the test**

Run: `pnpm test -- MatchPlayEngine.matchParity`
Expected: PASS. If the engine result is `'player1'` but requires different fixture handicaps (per Step 1), update the display-path handicaps to match and keep both expectations at `'player1'`.

Note on construction: `MatchPlayEngine.calculateMatch` reads scores via `this.parseScores(player.scorecard.scores)` and each player's `handicap`; the fixture supplies exactly those. If `parseScores` requires a richer score shape than `{ strokes: number }`, inspect `parseScores` in `MatchPlayEngine.ts` and extend the fixture score objects to match its expected fields, keeping `strokes: 5` for both players.

- [ ] **Step 4: Commit**

```bash
git add src/services/scoring/engines/MatchPlayEngine.matchParity.test.ts
git commit -m "test(match-play): parity between display path and engine on divergence hole"
```

---

### Task 7: Full type-check and targeted test sweep

**Files:** none (verification only).

- [ ] **Step 1: Type-check the whole project**

Run: `pnpm type-check`
Expected: no new errors versus the `main` baseline.

- [ ] **Step 2: Run the touched test files together**

Run:
```bash
pnpm test -- src/utils/scoring.test.ts \
  src/components/scorecard/MatchPlayScorecardTable/utils.test.ts \
  src/services/scoring/engines/MatchPlayEngine.matchParity.test.ts \
  MatchPlayEngine MatchPlayScorecardTable
```
Expected: PASS for the new/changed files; any failures in pre-existing files must match the known baseline (see Global Constraints).

- [ ] **Step 3: Lint the changed files**

Run: `pnpm lint`
Expected: no new lint errors in the files touched by this plan.

- [ ] **Step 4: Final verification note**

Confirm in the working tree that only these files changed: `src/utils/scoring.ts`, `src/utils/scoring.test.ts`, `src/hooks/scorecard/useMatchPlayScoring.ts`, `src/components/scorecard/MatchPlayScorecardTable/utils.ts` (+ new test), `src/services/scoring/engines/MatchPlayEngine.ts`, `src/screens/rounds/RoundListScreen/hooks/useRoundList.ts`, and the new parity test.

Run: `git diff --name-only main...HEAD`

---

## Manual QA (post-implementation, on device)

Not automated — track as outstanding on-device QA (consistent with prior scoring changes):
1. Start a singles match-play round with two players of clearly different handicaps (e.g. 20 vs 8). Verify only the higher-handicap player shows shot dots, on their lowest-SI holes, and none for the lower player.
2. Play a hole where both make the same gross on one of the difference holes; verify the higher-handicap player wins it (previously halved).
3. Complete the round and confirm the live result, the review scorecard, and the round-list result pill all show the same winner and margin.
4. Sanity-check a round where both players have equal handicaps: no shots either side.

## Out of scope (follow-up)

Team match play (four-ball / foursomes) still uses full-handicap net comparison and is intentionally not changed here — it needs format-specific allocation conventions and its own plan.
