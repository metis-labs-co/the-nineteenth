# Alt-Shot Round Leaderboard — Team View Only Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** In the competition Leaderboard tab's Round Results list, render the split alt-shot round's sub-match leaderboard only in the Team view; skip it entirely in the Individual view.

**Architecture:** One conditional in `LeaderboardTab.tsx`'s `orderedRounds.map`: the split alt-shot branch returns `null` when `effectiveView !== 'team'`.

**Tech Stack:** TypeScript, React Native, Jest + `@/__tests__/utils/renderHelpers`.

## Global Constraints

- **Single file:** only `src/components/leaderboard/LeaderboardTab.tsx` (+ its test). No data/schema change.
- Skip the alt-shot round **entirely** (no header, no body) on the Individual view; unchanged on the Team view.
- No change to non-alt-shot rounds, the overall standings, the wrapper, ViewRound, or the Review screen.
- `effectiveView` is `'individual' | 'team'`, already in scope; it is forced to `'team'` for scramble-only competitions (`isAllScrambleFormat`), so this only affects mixed competitions.

---

### Task 1: Gate the alt-shot round on the Team view

**Files:**
- Modify: `src/components/leaderboard/LeaderboardTab.tsx` (the `isSplitAltShotRound(round)` branch inside `orderedRounds.map`)
- Test: `src/components/leaderboard/LeaderboardTab.test.tsx`

**Interfaces:**
- Consumes (already in scope): `effectiveView: 'individual' | 'team'`, `isSplitAltShotRound`, `LeaderboardHeader`, `RoundSubMatchLeaderboard`. The test uses the controllable `selectedView?: LeaderboardView` prop on `LeaderboardTab` to force the active view.

- [ ] **Step 1: Write the failing tests**

In `src/components/leaderboard/LeaderboardTab.test.tsx`, add a `describe` block (after the "ordering and alt-shot header" block, before the file's final closing `});`). It uses a MIXED round set (a non-scramble round + the alt-shot round) so `isAllScrambleFormat` is false and the view is not force-forced to team:

```tsx
describe('Round Results — alt-shot round is Team-view only', () => {
  beforeEach(() => {
    mockUseCompetitionLeaderboard.mockReturnValue({
      data: [createIndividualEntry('p1', 'John', 15, 36, 1, 1)],
      teamData: [],
      isLoading: false,
      error: null,
    });
  });

  // Mixed competition: a completed non-scramble round + an in-progress split alt-shot round.
  const completedStrokeR1 = createMockRound({
    id: 'r1',
    round_number: 1,
    status: 'completed',
    game_type: 'stableford',
    team_format: null,
  });
  const altShotR2 = createMockRound({
    id: 'r2',
    round_number: 2,
    status: 'in-progress',
    round_format: 'split',
    game_type: 'alt-shot',
    team_format: 'alt-shot',
    is_team_round: true,
  });

  it('hides the alt-shot sub-match leaderboard on the Individual view (keeps other rounds)', () => {
    render(
      <LeaderboardTab
        {...defaultProps}
        teamMode="fixed"
        selectedView="individual"
        rounds={[altShotR2, completedStrokeR1]}
      />
    );
    expect(screen.queryByTestId('submatch-leaderboard-r2')).toBeNull();
    // the non-alt-shot round still appears in the individual round list
    expect(screen.getByTestId('round-leaderboard-1')).toBeTruthy();
  });

  it('shows the alt-shot sub-match leaderboard on the Team view', () => {
    render(
      <LeaderboardTab
        {...defaultProps}
        teamMode="fixed"
        selectedView="team"
        rounds={[altShotR2, completedStrokeR1]}
      />
    );
    expect(screen.getByTestId('submatch-leaderboard-r2')).toBeTruthy();
  });
});
```

If `defaultProps` does not already include `onViewChange` (the controlled toggle may expect it alongside `selectedView`), add `onViewChange={() => {}}` to both renders. Confirm `LeaderboardTab`'s props expose `selectedView?: LeaderboardView`; the component derives `view = selectedView ?? internalView`.

- [ ] **Step 2: Run the tests to verify they fail**

Run: `pnpm test -- LeaderboardTab -t "Team-view only"`
Expected: FAIL — the Individual-view test fails because the alt-shot round currently renders (`submatch-leaderboard-r2` IS present) regardless of view. (The Team-view test already passes.)

- [ ] **Step 3: Add the view gate**

In `src/components/leaderboard/LeaderboardTab.tsx`, inside `orderedRounds.map(({ round, inProgress }) => { ... })`, add a guard as the FIRST line of the `if (isSplitAltShotRound(round))` branch:

```tsx
            if (isSplitAltShotRound(round)) {
              // Alt-shot is a pure team format — only show its sub-match
              // leaderboard in the Team view; skip it in the Individual view.
              if (effectiveView !== 'team') return null;
              return (
                <View key={round.id} style={styles.roundLeaderboardContainer}>
                  <LeaderboardHeader
                    roundNumber={round.round_number}
                    gameType={gameType}
                    isTeamRound={round.is_team_round}
                    roundFormat={round.round_format}
                    teamFormat={round.team_format}
                    subMatchSize={round.sub_match_size}
                    rulesOverride={round.rules_override}
                    date={round.date ?? undefined}
                    courseName={round.course?.name ?? undefined}
                  />
                  <RoundSubMatchLeaderboard
                    roundId={round.id}
                    competitionId={competitionId}
                    currentUserId={currentUserId}
                  />
                </View>
              );
            }
```

(Only the `if (effectiveView !== 'team') return null;` line is new; the rest of the branch is unchanged.)

- [ ] **Step 4: Run the tests to verify they pass**

Run: `pnpm test -- LeaderboardTab -t "Team-view only"`
Expected: PASS (both: Individual hides, Team shows).

- [ ] **Step 5: Run the full LeaderboardTab suite (no regressions)**

Run: `pnpm test -- LeaderboardTab`
Expected: the new tests pass and the previously-passing tests still pass; the ~10 pre-existing baseline failures (`StablefordLeaderboardFull` undefined / `LeaderboardTable` highlighting) are unchanged — confirm the failure count did not increase.

- [ ] **Step 6: Type-check**

Run: `pnpm type-check 2>&1 | grep -E "LeaderboardTab" || echo "NO ERRORS in touched files"`
Expected: `NO ERRORS in touched files`.

- [ ] **Step 7: Commit**

```bash
git add src/components/leaderboard/LeaderboardTab.tsx src/components/leaderboard/LeaderboardTab.test.tsx
git commit -m "fix(leaderboard): show alt-shot round leaderboard only in Team view

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>"
```

## Self-Review Notes

- **Spec coverage:** the single conditional → Step 3; both view behaviours tested → Step 1 (Individual hides + other rounds remain; Team shows). Non-goals respected (only `LeaderboardTab.tsx` + test).
- **Test validity:** mixed round set keeps `isAllScrambleFormat` false so `effectiveView` follows `selectedView`; the Individual test would fail under the old code (alt-shot rendered in all views); the Team test guards against over-hiding.
- **No placeholders:** full conditional + both tests inline.
- **Edge:** an all-alt-shot/scramble competition is force-forced to Team view (`isAllScrambleFormat`), so `effectiveView` is always `'team'` there and the guard never hides anything — consistent with the spec's edge note.
