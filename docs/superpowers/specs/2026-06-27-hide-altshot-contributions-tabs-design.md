# Hide Contributions Tabs for Alt-Shot Rounds — Design

**Date:** 2026-06-27
**Status:** Approved (design), pending implementation plan
**Author:** Sam / Claude

## Problem

Alt-shot rounds show a **Contributions** tab on both the ViewRound screen and the Review
Scorecard screen. Alt-shot is treated as a scramble-family format, and the scramble branch in
each screen's tab hook pushes a Contributions tab unconditionally. For alt-shot the
contributions view isn't wanted, so the tab should be removed.

## Decision (user, 2026-06-27)

Remove the Contributions tab for **all** alt-shot rounds — combined *and* split — on **both**
screens. Real scramble and shamble rounds keep their Contributions tab.

Alt-shot detection (combined or split): `game_type === 'alt-shot' || team_format === 'alt-shot'`.

## Current state (verified)

- **ViewRound:** `useViewRoundTabs.ts:136` pushes `{ key: 'scrambleContributions', label: 'Contributions' }` inside `if (isScrambleRound)` (line 128). `isScrambleRound` (`useViewRoundDataFetch.ts:47`) includes alt-shot, so the tab shows for combined and split alt-shot. Rendered by `ScrambleContributionsTab` (`ViewRoundScreen/index.tsx:547`, gated `vm.activeTab === 'scrambleContributions' && vm.isScrambleRound`).
- **Review Scorecard:** `useReviewScorecardTabs.ts:118` pushes `{ key: 'contributions', label: 'Contributions' }` inside `if (isScramble)` (line 115). `isScramble` (line 47-48) includes alt-shot. Rendered by `ContributionsTabContent` (`ReviewScorecardScreen/index.tsx:428`).
- These are the only two Contributions tabs reaching alt-shot; the Ringer/Breakdown tab is for stroke-family rounds and is unaffected.

## Design

Gate each contributions push so it is skipped for alt-shot. Two independent units (one per
screen). Render blocks and the tab components are left unchanged — with the tab gone from the
list, `activeTab` can never be the contributions key for an alt-shot round, so the component
simply stops appearing for alt-shot while still working for real scramble.

### Unit A — Review Scorecard (`useReviewScorecardTabs.ts`)

The hook already has `effectiveGameType` and `roundDetails.team_format` locally. Add:

```ts
const isAltShot =
  effectiveGameType === 'alt-shot' || roundDetails?.team_format === 'alt-shot';
```

Change line 118 to:

```ts
if (!isAltShot) tabList.push({ key: 'contributions' as const, label: 'Contributions' });
```

Add `isAltShot` to the `useMemo` dependency array. Leaderboard + Scorecard tabs are unchanged
for alt-shot (only Contributions is removed). No threading — all inputs are local.

### Unit B — ViewRound (`useViewRoundTabs.ts` + flag threading)

`useViewRoundTabs` receives only boolean flags, and combined alt-shot is indistinguishable
from combined scramble via the current flags. Add a dedicated `isAltShotRound` flag:

1. `useViewRoundDataFetch.ts` (next to `isAltShotSplitRound`, ~line 61): derive and return
   `const isAltShotRound = round?.game_type === 'alt-shot' || round?.team_format === 'alt-shot';`
2. `useViewRoundScreen.ts`: destructure `isAltShotRound` (~line 52) and pass it into the
   `useViewRoundTabs({ ... })` call (~line 120).
3. `useViewRoundTabs.ts`: add `isAltShotRound: boolean;` to `UseViewRoundTabsParams`,
   destructure it, and gate line 136:

```ts
if (!isAltShotRound) {
  result.push({ key: 'scrambleContributions', label: 'Contributions' });
}
```

The `if (!isAltShotSplitRound)` block above it (which already suppresses Scorecard/Leaderboard
for split alt-shot) is unchanged. Combined alt-shot now also loses Contributions (it keeps its
Scorecard/Leaderboard, matching the user's "only remove Contributions" intent).

## Non-goals

- No change to real scramble/shamble rounds (they keep Contributions).
- No change to any other tab (Scorecard, Leaderboard, Sub-Matches, Stats, etc.).
- The `ScrambleContributionsTab` / `ContributionsTabContent` components are not deleted, and
  the render blocks that gate them are unchanged (they become unreachable for alt-shot only).
- No schema/data change.

## Testing

- **ViewRound (`useViewRoundTabs.test.ts`):** the two existing tests assert
  `scrambleContributions` is *kept* for split + combined alt-shot — flip them to assert it is
  *absent*, passing the new `isAltShotRound: true`. Add/keep a real-scramble case
  (`isAltShotRound: false`) asserting Contributions is still present. Add `isAltShotRound` to
  the params the test builds for the hook.
- **Review Scorecard (`useReviewScorecardTabs`):** add a focused `renderHook` test (new
  file) mocking the hook's data deps — `useRoundDetails`, `useStatsVisibilityWithTier`,
  `useActiveSkinsGameForRound`, `useWolfGameByRound`, `useShotLogByRound` — and assert no
  `contributions` tab for an alt-shot round, and (control) that a real scramble round still
  has it.
- Manual QA (deferred): alt-shot round on both screens shows no Contributions tab; a real
  scramble round still shows it.

## Affected files

- `src/screens/scoring/ReviewScorecardScreen/hooks/useReviewScorecardTabs.ts` (Unit A)
- `src/screens/rounds/ViewRoundScreen/hooks/useViewRoundDataFetch.ts`,
  `useViewRoundScreen.ts`, `hooks/useViewRoundTabs.ts` (Unit B)
- Tests: `useViewRoundTabs.test.ts` (edit), a new `useReviewScorecardTabs` test.

## Risks

- **Active-tab fallback:** if a user is viewing the Contributions tab when the round resolves
  as alt-shot, the tab key disappears from the list; the Tabs component should fall back to a
  valid tab. Verify on-device that no blank tab state results (low risk — the tab list is
  computed before the bar renders).
- Adding a required `isAltShotRound` param to `useViewRoundTabs` means the test params builder
  must include it; the production call site (`useViewRoundScreen`) always passes it.
