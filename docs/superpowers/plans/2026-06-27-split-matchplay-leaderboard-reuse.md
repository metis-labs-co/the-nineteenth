# Split Match-Play (1v1 Singles) Leaderboard Reuse Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Show the existing live sub-match leaderboard for split match-play (1v1 singles) rounds in two more places — replacing the ViewRound Match-tab content, and in the competition Leaderboard tab (Team view) — for in-progress and completed rounds.

**Architecture:** Pure gate-broadening. The reusable `RoundSubMatchLeaderboard` (already on ViewRound + competition for alt-shot) renders any split sub-match round. Add an `isSplitMatchPlayRound` helper and broaden the competition gate; swap the ViewRound Match-tab content to the wrapper for split rounds.

**Tech Stack:** TypeScript, React Native, Jest + `@/__tests__/utils/renderHelpers`.

## Global Constraints

- Split match-play detection: `round_format === 'split' && game_type === 'match-play'`.
- Competition: Team view only (same as alt-shot — inherits the existing `effectiveView !== 'team'` gate).
- ViewRound: replace the Match-tab CONTENT for split rounds; keep `MatchTab` for non-split match-play. Don't change the tab list or label.
- No change to the Review screen, `SubMatchLeaderboardTab`, `RoundSubMatchLeaderboard`, the data layer, or alt-shot behaviour. No schema change.

---

### Task 1: `isSplitMatchPlayRound` helper + competition gate

**Files:**
- Modify: `src/utils/roundFormat.ts` (add helper)
- Test: `src/__tests__/utils/roundFormat.test.ts` (add cases)
- Modify: `src/components/leaderboard/LeaderboardTab.tsx` (import + broaden the branch at ~line 490)
- Test: `src/components/leaderboard/LeaderboardTab.test.tsx` (add a match-play team-view test)

**Interfaces:**
- Produces: `isSplitMatchPlayRound(round: { round_format?: string | null; game_type?: string | null }): boolean`.

- [ ] **Step 1: Write the failing helper tests**

In `src/__tests__/utils/roundFormat.test.ts`, add (after the existing `isSplitAltShotRound` describe; update the import line to also import `isSplitMatchPlayRound`):

```ts
describe('isSplitMatchPlayRound', () => {
  it('true for split + match-play', () => {
    expect(isSplitMatchPlayRound({ round_format: 'split', game_type: 'match-play' })).toBe(true);
  });
  it('false for combined match-play', () => {
    expect(isSplitMatchPlayRound({ round_format: 'combined', game_type: 'match-play' })).toBe(false);
  });
  it('false for split non-match-play', () => {
    expect(isSplitMatchPlayRound({ round_format: 'split', game_type: 'alt-shot' })).toBe(false);
  });
  it('false for missing fields', () => {
    expect(isSplitMatchPlayRound({})).toBe(false);
  });
});
```

- [ ] **Step 2: Run to verify it fails**

Run: `pnpm test -- roundFormat`
Expected: FAIL — `isSplitMatchPlayRound` is not exported.

- [ ] **Step 3: Implement the helper**

In `src/utils/roundFormat.ts`, add below `isSplitAltShotRound`:

```ts
/**
 * True when a round is a split match-play round (1v1 singles / Ryder-cup-style
 * sub-matches). Gates the sub-match leaderboard on ViewRound and the competition.
 */
export function isSplitMatchPlayRound(round: {
  round_format?: string | null;
  game_type?: string | null;
}): boolean {
  return round.round_format === 'split' && round.game_type === 'match-play';
}
```

- [ ] **Step 4: Run to verify the helper tests pass**

Run: `pnpm test -- roundFormat`
Expected: PASS (existing alt-shot cases + 4 new match-play cases).

- [ ] **Step 5: Write the failing competition test**

In `src/components/leaderboard/LeaderboardTab.test.tsx`, add a describe block (after the existing `'Round Results — alt-shot round is Team-view only'` block, before the file's final closing `});`). It mirrors the alt-shot team-view tests with a match-play round:

```tsx
describe('Round Results — split match-play leaderboard (Team-view only)', () => {
  beforeEach(() => {
    mockUseCompetitionLeaderboard.mockReturnValue({
      data: [createIndividualEntry('p1', 'John', 15, 36, 1, 1)],
      teamData: [],
      isLoading: false,
      error: null,
    });
  });

  const completedStrokeR1 = createMockRound({
    id: 'r1', round_number: 1, status: 'completed', game_type: 'stableford', team_format: null,
  });
  const matchPlayR2 = createMockRound({
    id: 'r2', round_number: 2, status: 'in-progress',
    round_format: 'split', game_type: 'match-play', team_format: 'match-play-team', is_team_round: true,
  });

  it('renders the sub-match leaderboard for a split match-play round in the Team view', () => {
    render(
      <LeaderboardTab {...defaultProps} teamMode="fixed" selectedView="team" onViewChange={() => {}} rounds={[matchPlayR2, completedStrokeR1]} />
    );
    expect(screen.getByTestId('submatch-leaderboard-r2')).toBeTruthy();
  });

  it('hides the split match-play leaderboard in the Individual view (keeps other rounds)', () => {
    render(
      <LeaderboardTab {...defaultProps} teamMode="fixed" selectedView="individual" onViewChange={() => {}} rounds={[matchPlayR2, completedStrokeR1]} />
    );
    expect(screen.queryByTestId('submatch-leaderboard-r2')).toBeNull();
    expect(screen.getByTestId('round-leaderboard-1')).toBeTruthy();
  });
});
```

- [ ] **Step 6: Run to verify the competition test fails**

Run: `pnpm test -- LeaderboardTab -t "split match-play leaderboard"`
Expected: FAIL — the Team-view test fails because a split match-play round currently falls to `RoundLeaderboard` (no `submatch-leaderboard-r2`).

- [ ] **Step 7: Broaden the competition gate**

In `src/components/leaderboard/LeaderboardTab.tsx`:
- Update the import (line ~26): `import { isSplitAltShotRound, isSplitMatchPlayRound } from '@/utils/roundFormat';`
- Change the branch condition (~line 490) from:
```tsx
            if (isSplitAltShotRound(round)) {
```
to:
```tsx
            if (isSplitAltShotRound(round) || isSplitMatchPlayRound(round)) {
```
(The body — the `if (effectiveView !== 'team') return null;` gate, `LeaderboardHeader`, and `RoundSubMatchLeaderboard` — is unchanged.)

- [ ] **Step 8: Run both suites to verify they pass**

Run: `pnpm test -- roundFormat LeaderboardTab`
Expected: the new match-play tests pass; the existing alt-shot + ordering tests still pass; the ~10 pre-existing `LeaderboardTab` baseline failures are unchanged.

- [ ] **Step 9: Type-check and commit**

Run: `pnpm type-check 2>&1 | grep -E "roundFormat|LeaderboardTab" || echo "NO ERRORS in touched files"`
Expected: `NO ERRORS in touched files`.

```bash
git add src/utils/roundFormat.ts src/__tests__/utils/roundFormat.test.ts src/components/leaderboard/LeaderboardTab.tsx src/components/leaderboard/LeaderboardTab.test.tsx
git commit -m "feat(leaderboard): show split match-play leaderboard in competition (Team view)

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>"
```

---

### Task 2: ViewRound — swap Match-tab content for split match-play

**Files:**
- Modify: `src/screens/rounds/ViewRoundScreen/index.tsx` (the `activeTab === 'match'` block, ~line 393)

**Interfaces:**
- Consumes: `RoundSubMatchLeaderboard` (already imported, line 56); `vm.isSplitRound`, `vm.competitionId`, `vm.user`, `vm.isRefreshing`, `vm.handleRefresh`, `insets` (all already in scope from the alt-shot work).

- [ ] **Step 1: Swap the Match-tab content for split rounds**

In `src/screens/rounds/ViewRoundScreen/index.tsx`, replace the Match-tab block (~line 393):

```tsx
        {vm.activeTab === 'match' && (vm.isMatchPlayRound || vm.isTeamMatchPlayRound) && (
          <MatchTab
            isMatchPlayRound={vm.isMatchPlayRound}
            isTeamMatchPlayRound={vm.isTeamMatchPlayRound}
            matchPlayPlayers={vm.matchPlayPlayers}
            holes={round.course?.holes || null}
            getPlayerScore={vm.getPlayerScore}
            matchPlayData={vm.matchPlayData}
            currentUserId={vm.user?.id}
            roundStatus={round.status}
            isTeamRound={round.is_team_round || false}
            isSplitRound={vm.isSplitRound}
            roundId={round.id}
            startHole={round.course?.start_hole ?? 1}
          />
        )}
```

with:

```tsx
        {vm.activeTab === 'match' && (vm.isMatchPlayRound || vm.isTeamMatchPlayRound) && (
          vm.isSplitRound ? (
            <RoundSubMatchLeaderboard
              roundId={round.id}
              competitionId={vm.competitionId ?? null}
              currentUserId={vm.user?.id}
              isRefreshing={vm.isRefreshing}
              onRefresh={vm.handleRefresh}
              bottomInset={insets.bottom}
            />
          ) : (
            <MatchTab
              isMatchPlayRound={vm.isMatchPlayRound}
              isTeamMatchPlayRound={vm.isTeamMatchPlayRound}
              matchPlayPlayers={vm.matchPlayPlayers}
              holes={round.course?.holes || null}
              getPlayerScore={vm.getPlayerScore}
              matchPlayData={vm.matchPlayData}
              currentUserId={vm.user?.id}
              roundStatus={round.status}
              isTeamRound={round.is_team_round || false}
              isSplitRound={vm.isSplitRound}
              roundId={round.id}
              startHole={round.course?.start_hole ?? 1}
            />
          )
        )}
```

(Within this block `isMatchPlayRound || isTeamMatchPlayRound` is already true, so `vm.isSplitRound` means a split match-play round. Confirm `insets`, `RoundSubMatchLeaderboard`, and all `vm.*` fields used are already present in the file before editing — they are, from the alt-shot Leaderboard tab work.)

- [ ] **Step 2: Type-check**

Run: `pnpm type-check 2>&1 | grep -E "ViewRoundScreen/index" || echo "NO ERRORS in touched files"`
Expected: `NO ERRORS in touched files`.

- [ ] **Step 3: Run any ViewRound tests (no tab-list change expected)**

Run: `pnpm test -- ViewRound useViewRoundTabs`
Expected: PASS, or only pre-existing baseline failures unrelated to this change (the tab list is unchanged — only the Match-tab body swaps).

- [ ] **Step 4: Commit**

```bash
git add src/screens/rounds/ViewRoundScreen/index.tsx
git commit -m "feat(rounds): show live sub-match leaderboard in Match tab for split match-play

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>"
```

---

### Task 3: Verify

- [ ] **Step 1: Run all affected suites**

Run: `pnpm test -- roundFormat LeaderboardTab useViewRoundTabs`
Expected: PASS (or only pre-existing baseline failures unrelated to these files).

- [ ] **Step 2: Type-check the touched surface**

Run: `pnpm type-check 2>&1 | grep -E "roundFormat|LeaderboardTab|ViewRoundScreen/index" || echo "NO ERRORS in touched files"`
Expected: `NO ERRORS in touched files`.

- [ ] **Step 3: Manual QA (deferred)**

Split match-play (1v1 singles) round:
1. ViewRound → **Match** tab shows the live sub-match leaderboard (1v1 match rows + Ryder tally) in-progress and after completion.
2. Competition Leaderboard → the round shows the sub-match leaderboard in the **Team** view; hidden in the **Individual** view.
3. A non-split match-play round (combined 1v1) still shows the existing `MatchTab` scorecard/results.
4. Alt-shot rounds unchanged; Review screen unchanged.

## Self-Review Notes

- **Spec coverage:** helper → Task 1 Steps 1-4; competition gate (Team-view-only, inherited) → Task 1 Steps 5-7; ViewRound Match-tab swap → Task 2; verify → Task 3.
- **Type consistency:** `isSplitMatchPlayRound(round: { round_format?, game_type? })` signature identical in helper, test, and the `LeaderboardTab` call. `RoundSubMatchLeaderboard` props match its existing interface.
- **Backward compatibility:** competition branch body unchanged (only the `if` condition widened); ViewRound keeps `MatchTab` for non-split; alt-shot path untouched (the `isSplitAltShotRound` half of the `||` still fires first for alt-shot).
- **No placeholders:** full helper, gate edit, ViewRound swap, and tests inline.
