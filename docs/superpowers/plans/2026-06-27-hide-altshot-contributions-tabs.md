# Hide Contributions Tabs for Alt-Shot Rounds Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Remove the Contributions tab for all alt-shot rounds (combined + split) on both the ViewRound and Review Scorecard screens, while real scramble/shamble rounds keep it.

**Architecture:** Gate each screen's contributions-tab push behind an alt-shot check. Review Scorecard computes the check locally; ViewRound needs a new `isAltShotRound` flag threaded from `useViewRoundDataFetch` → `useViewRoundScreen` → `useViewRoundTabs`.

**Tech Stack:** TypeScript, React Native, Jest + `@testing-library/react-native` (`renderHook`).

## Global Constraints

- Alt-shot detection (combined or split): `game_type === 'alt-shot' || team_format === 'alt-shot'`.
- Only the Contributions tab is removed for alt-shot — Scorecard, Leaderboard, Sub-Matches, etc. are unchanged.
- Real scramble and shamble rounds keep their Contributions tab.
- Tab components (`ScrambleContributionsTab`, `ContributionsTabContent`) and their render-block guards are NOT changed — they just become unreachable for alt-shot.
- No schema/data change.

---

### Task 1: ViewRound — hide `scrambleContributions` for alt-shot

**Files:**
- Modify: `src/screens/rounds/ViewRoundScreen/hooks/useViewRoundDataFetch.ts` (derive + return `isAltShotRound`)
- Modify: `src/screens/rounds/ViewRoundScreen/useViewRoundScreen.ts` (destructure + pass `isAltShotRound`)
- Modify: `src/screens/rounds/ViewRoundScreen/hooks/useViewRoundTabs.ts` (param + gate)
- Test: `src/screens/rounds/ViewRoundScreen/hooks/useViewRoundTabs.test.ts`

**Interfaces:**
- Produces: `useViewRoundDataFetch` returns `isAltShotRound: boolean`; `useViewRoundTabs` params gain `isAltShotRound: boolean`.

- [ ] **Step 1: Update the failing tests**

In `src/screens/rounds/ViewRoundScreen/hooks/useViewRoundTabs.test.ts`, replace the two existing tests so they assert Contributions is **absent** for alt-shot, and add a real-scramble control. Replace the whole `describe('useViewRoundTabs — split alt-shot', ...)` block with:

```ts
describe('useViewRoundTabs — alt-shot hides Contributions', () => {
  it('suppresses Scorecard/Leaderboard AND Contributions for split alt-shot', () => {
    const { result } = renderHook(() =>
      useViewRoundTabs({ ...base, isScrambleRound: true, isAltShotSplitRound: true, isAltShotRound: true } as never)
    );
    const keys = result.current.map((t: { key: string }) => t.key);
    expect(keys).toContain('subMatches');
    expect(keys).not.toContain('scrambleContributions');
    expect(keys).not.toContain('scrambleTeamScore');
    expect(keys).not.toContain('scrambleLeaderboard');
  });

  it('hides Contributions for combined alt-shot but keeps Scorecard/Leaderboard', () => {
    const { result } = renderHook(() =>
      useViewRoundTabs({ ...base, isSplitRound: false, isScrambleRound: true, isAltShotSplitRound: false, isAltShotRound: true } as never)
    );
    const keys = result.current.map((t: { key: string }) => t.key);
    expect(keys).toContain('scrambleTeamScore');
    expect(keys).toContain('scrambleLeaderboard');
    expect(keys).not.toContain('scrambleContributions');
  });

  it('keeps all three scramble tabs (incl. Contributions) for a real scramble round', () => {
    const { result } = renderHook(() =>
      useViewRoundTabs({ ...base, isSplitRound: false, isScrambleRound: true, isAltShotSplitRound: false, isAltShotRound: false } as never)
    );
    const keys = result.current.map((t: { key: string }) => t.key);
    expect(keys).toContain('scrambleTeamScore');
    expect(keys).toContain('scrambleLeaderboard');
    expect(keys).toContain('scrambleContributions');
  });
});
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `pnpm test -- useViewRoundTabs`
Expected: FAIL — the alt-shot cases still contain `scrambleContributions` (the hook ignores `isAltShotRound` today and pushes it unconditionally in the scramble block).

- [ ] **Step 3: Derive + return `isAltShotRound` in `useViewRoundDataFetch.ts`**

Next to the existing `isAltShotSplitRound` derivation (~line 61), add:

```ts
  const isAltShotRound =
    round?.game_type === 'alt-shot' || round?.team_format === 'alt-shot';
```

In the hook's `return { ... }` (~line 87), add `isAltShotRound,` near `isAltShotSplitRound,` (~line 102).

- [ ] **Step 4: Thread it through `useViewRoundScreen.ts`**

In the destructure of `useViewRoundDataFetch`'s result (~line 52, the line listing `isAltShotSplitRound`), add `isAltShotRound`. In the `useViewRoundTabs({ ... })` call (~line 115-120, where `isAltShotSplitRound` is passed), add `isAltShotRound,`.

- [ ] **Step 5: Add the param + gate in `useViewRoundTabs.ts`**

In `UseViewRoundTabsParams`, add (next to the other flags):

```ts
  /** True for any alt-shot round (combined or split). Hides the Contributions tab. */
  isAltShotRound: boolean;
```

Add `isAltShotRound` to the hook's destructured params. Then in the `if (isScrambleRound)` block, gate the contributions push (currently `result.push({ key: 'scrambleContributions', label: 'Contributions' });`):

```ts
    if (isScrambleRound) {
      if (!isAltShotSplitRound) {
        result.push({ key: 'scrambleTeamScore', label: 'Scorecard' });
        result.push({ key: 'scrambleLeaderboard', label: 'Leaderboard' });
      }
      if (!isAltShotRound) {
        result.push({ key: 'scrambleContributions', label: 'Contributions' });
      }
      // ...any remaining lines in this block unchanged...
    }
```

Add `isAltShotRound` to the `useMemo` dependency array of the tabs memo (alongside `isScrambleRound`/`isAltShotSplitRound`).

- [ ] **Step 6: Run the tests to verify they pass**

Run: `pnpm test -- useViewRoundTabs`
Expected: PASS (split alt-shot + combined alt-shot omit Contributions; real scramble keeps it).

- [ ] **Step 7: Type-check**

Run: `pnpm type-check 2>&1 | grep -E "useViewRoundTabs|useViewRoundDataFetch|useViewRoundScreen" || echo "NO ERRORS in touched files"`
Expected: `NO ERRORS in touched files`.

- [ ] **Step 8: Commit**

```bash
git add src/screens/rounds/ViewRoundScreen/hooks/useViewRoundDataFetch.ts src/screens/rounds/ViewRoundScreen/useViewRoundScreen.ts src/screens/rounds/ViewRoundScreen/hooks/useViewRoundTabs.ts src/screens/rounds/ViewRoundScreen/hooks/useViewRoundTabs.test.ts
git commit -m "fix(rounds): hide Contributions tab for alt-shot rounds on ViewRound

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>"
```

---

### Task 2: Review Scorecard — hide `contributions` for alt-shot

**Files:**
- Modify: `src/screens/scoring/ReviewScorecardScreen/hooks/useReviewScorecardTabs.ts:115-118`
- Test: `src/screens/scoring/ReviewScorecardScreen/hooks/useReviewScorecardTabs.test.ts` (new)

**Interfaces:**
- Consumes: existing locals `effectiveGameType`, `roundDetails`. No new exports; the hook's return (`{ tabs, ... }`) is unchanged in shape.

- [ ] **Step 1: Write the failing test**

Create `src/screens/scoring/ReviewScorecardScreen/hooks/useReviewScorecardTabs.test.ts`:

```ts
import { renderHook } from '@testing-library/react-native';
import { useReviewScorecardTabs } from './useReviewScorecardTabs';
import { useRoundDetails } from '@/hooks/useRoundDetails';

jest.mock('@/hooks/useRoundDetails', () => ({ useRoundDetails: jest.fn() }));
jest.mock('@/hooks/useStatsVisibilityWithTier', () => ({
  useStatsVisibilityWithTier: () => ({
    showPutts: false, showFairwayHit: false, showGreenInRegulation: false,
    showBunkerShots: false, showHazards: false,
  }),
}));
jest.mock('@/hooks/useSkins', () => ({ useActiveSkinsGameForRound: () => ({ data: null }) }));
jest.mock('@/hooks/wolf', () => ({ useWolfGameByRound: () => ({ data: null }) }));
jest.mock('@/hooks/shots', () => ({ useShotLogByRound: () => ({ data: [] }) }));

const mockUseRoundDetails = useRoundDetails as jest.Mock;

describe('useReviewScorecardTabs — alt-shot hides Contributions', () => {
  it('omits Contributions for an alt-shot round (keeps Leaderboard + Scorecard)', () => {
    mockUseRoundDetails.mockReturnValue({
      data: { game_type: 'alt-shot', team_format: 'alt-shot', round_format: 'combined', scoring_pairs_required: false },
    });
    const { result } = renderHook(() =>
      useReviewScorecardTabs({ roundId: 'r1', storeGameType: 'alt-shot', playerCount: 4 })
    );
    const keys = result.current.tabs.map((t: { key: string }) => t.key);
    expect(keys).toContain('leaderboard');
    expect(keys).toContain('scorecard');
    expect(keys).not.toContain('contributions');
  });

  it('keeps Contributions for a real scramble round', () => {
    mockUseRoundDetails.mockReturnValue({
      data: { game_type: 'scramble', team_format: 'scramble', round_format: 'combined', scoring_pairs_required: false },
    });
    const { result } = renderHook(() =>
      useReviewScorecardTabs({ roundId: 'r1', storeGameType: 'scramble', playerCount: 4 })
    );
    const keys = result.current.tabs.map((t: { key: string }) => t.key);
    expect(keys).toContain('contributions');
  });
});
```

- [ ] **Step 2: Run the test to verify the alt-shot case fails**

Run: `pnpm test -- useReviewScorecardTabs`
Expected: FAIL — "omits Contributions for an alt-shot round" fails because the hook currently pushes `contributions` for alt-shot. (If `renderHook` needs a provider wrapper that these mocks don't satisfy, wrap with the repo's render helper — but the mocks return plain data so a bare `renderHook` should work.)

- [ ] **Step 3: Add the `isAltShot` gate**

In `src/screens/scoring/ReviewScorecardScreen/hooks/useReviewScorecardTabs.ts`, after the `isScramble` definition (~line 48), add:

```ts
  const isAltShot =
    effectiveGameType === 'alt-shot' || roundDetails?.team_format === 'alt-shot';
```

Change line 118 (the scramble-block contributions push) to:

```ts
      if (!isAltShot) tabList.push({ key: 'contributions' as const, label: 'Contributions' });
```

Add `isAltShot` to the `useMemo` dependency array of the `tabs` memo (the one starting ~line 112; it already lists `isScramble`, `isShamble`, etc.).

- [ ] **Step 4: Run the test to verify it passes**

Run: `pnpm test -- useReviewScorecardTabs`
Expected: PASS (alt-shot omits Contributions; scramble keeps it).

- [ ] **Step 5: Type-check**

Run: `pnpm type-check 2>&1 | grep -E "useReviewScorecardTabs" || echo "NO ERRORS in touched files"`
Expected: `NO ERRORS in touched files`.

- [ ] **Step 6: Commit**

```bash
git add src/screens/scoring/ReviewScorecardScreen/hooks/useReviewScorecardTabs.ts src/screens/scoring/ReviewScorecardScreen/hooks/useReviewScorecardTabs.test.ts
git commit -m "fix(scoring): hide Contributions tab for alt-shot rounds on Review screen

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>"
```

---

### Task 3: Verify

- [ ] **Step 1: Run both tab suites**

Run: `pnpm test -- useViewRoundTabs useReviewScorecardTabs`
Expected: PASS.

- [ ] **Step 2: Type-check the touched surface**

Run: `pnpm type-check 2>&1 | grep -E "useViewRoundTabs|useViewRoundDataFetch|useViewRoundScreen|useReviewScorecardTabs" || echo "NO ERRORS in touched files"`
Expected: `NO ERRORS in touched files`.

- [ ] **Step 3: Manual QA (deferred)**

Alt-shot round (combined and split): no Contributions tab on ViewRound or Review Scorecard. A real scramble round still shows Contributions on both. Confirm switching away from a (now-removed) Contributions tab doesn't leave a blank state.

## Self-Review Notes

- **Spec coverage:** Unit A (Review) → Task 2; Unit B (ViewRound flag + gate) → Task 1; verify → Task 3.
- **Type consistency:** `isAltShotRound: boolean` is added to `useViewRoundDataFetch`'s return, threaded in `useViewRoundScreen`, and declared on `UseViewRoundTabsParams`; the test passes it via the `as never` cast. `isAltShot` (Review) is local to `useReviewScorecardTabs`.
- **No placeholders:** full gate code + both test files inline.
- **Backward compat:** real scramble/shamble unaffected (the gate only suppresses when alt-shot); other tabs untouched; render blocks/components unchanged.
