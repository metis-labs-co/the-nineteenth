# Competition Round Results — Order & Alt-Shot Header Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** In the competition Leaderboard tab's "Round Results" list, render all rounds in strict round-number order regardless of status, and give the split alt-shot entry the same "Round N" + format-pill header the other rounds have.

**Architecture:** Both changes are in `src/components/leaderboard/LeaderboardTab.tsx`. Merge the two status-separated round maps into one `orderedRounds` list sorted by `round_number` (component selection per round unchanged), and render `LeaderboardHeader` above `RoundSubMatchLeaderboard` for split alt-shot rounds.

**Tech Stack:** TypeScript, React Native, Jest + `@/__tests__/utils/renderHelpers`.

## Global Constraints

- **Single file:** only `src/components/leaderboard/LeaderboardTab.tsx` (+ its test) changes. No change to `RoundSubMatchLeaderboard`, `SubMatchLeaderboardTab`, ViewRound, or the Review screen. No schema/data change.
- **Strict round-number order** across all statuses (completed R1 may sit above in-progress R2).
- **Component selection unchanged:** split alt-shot → `RoundSubMatchLeaderboard`; in-progress non-alt-shot → `canRenderLive ? InProgressRoundLeaderboard : RoundLeaderboard` (`autoRefresh`); completed → `RoundLeaderboard` (`autoRefresh={false}`).
- **Header only here** (competition list), never inside `RoundSubMatchLeaderboard` (ViewRound already has the screen's round header).
- All header fields exist on the base `Round` type: `round_number`, `game_type`, `is_team_round`, `team_format`, `round_format`, `sub_match_size`, `rules_override`, `date` (`string | null`), `course.name`.

---

### Task 1: Order rounds by number + add alt-shot header

**Files:**
- Modify: `src/components/leaderboard/LeaderboardTab.tsx` (round-results memo + render section, ~lines 285-291 and ~461-545; add `LeaderboardHeader` import)
- Test: `src/components/leaderboard/LeaderboardTab.test.tsx` (add a header mock + two tests)

**Interfaces:**
- Consumes (all already in scope in this file): `inProgressRounds`, `completedRounds`, `isSplitAltShotRound`, `RoundSubMatchLeaderboard`, `RoundLeaderboard`, `InProgressRoundLeaderboard`, `IN_PROGRESS_SUPPORTED_GAME_TYPES`, `competitionId`, `currentUserId`, `autoRefresh`, `effectiveView`, `hasTeams`, `playerTeamLookup`, `styles`, `GameType`.
- Produces: a single `orderedRounds: { round: RoundWithCourse; inProgress: boolean }[]` memo, sorted by `round.round_number`.

- [ ] **Step 1: Write the failing tests**

In `src/components/leaderboard/LeaderboardTab.test.tsx`:

(a) Add a `LeaderboardHeader` mock next to the existing `RoundSubMatchLeaderboard` mock (after line ~140):

```tsx
// Mock LeaderboardHeader (assert round number + that the alt-shot entry gets a header)
jest.mock('./LeaderboardHeader', () => {
  const { View, Text } = require('react-native');
  return {
    LeaderboardHeader: ({ roundNumber }: { roundNumber: number }) => (
      <View testID={`lb-header-${roundNumber}`}><Text>Round {roundNumber}</Text></View>
    ),
  };
});
```

(b) Add a new `describe` block (place after the existing round-leaderboard tests, before the file's final closing `});`):

```tsx
describe('Round Results — ordering and alt-shot header', () => {
  beforeEach(() => {
    mockUseCompetitionLeaderboard.mockReturnValue({
      data: [createIndividualEntry('p1', 'John', 15, 36, 1, 1)],
      teamData: [],
      isLoading: false,
      error: null,
    });
  });

  const completedR1 = createMockRound({ id: 'r1', round_number: 1, status: 'completed' });
  const altShotR2 = createMockRound({
    id: 'r2',
    round_number: 2,
    status: 'in-progress',
    round_format: 'split',
    game_type: 'alt-shot',
    team_format: 'alt-shot',
    is_team_round: true,
  });

  it('orders rounds by round number across statuses (completed R1 before in-progress alt-shot R2)', () => {
    // Pass out of order (alt-shot first) to prove sorting, not input order.
    render(<LeaderboardTab {...defaultProps} rounds={[altShotR2, completedR1]} />);
    const json = JSON.stringify(screen.toJSON());
    const r1Index = json.indexOf('round-leaderboard-1');     // completed R1 (RoundLeaderboard mock, testID by round_number)
    const r2Index = json.indexOf('submatch-leaderboard-r2'); // in-progress alt-shot R2 (RoundSubMatchLeaderboard mock, testID by id)
    expect(r1Index).toBeGreaterThan(-1);
    expect(r2Index).toBeGreaterThan(-1);
    expect(r1Index).toBeLessThan(r2Index);
  });

  it('renders a Round header + format pill for the split alt-shot round', () => {
    render(<LeaderboardTab {...defaultProps} rounds={[altShotR2]} />);
    expect(screen.getByTestId('lb-header-2')).toBeTruthy();
    expect(screen.getByTestId('submatch-leaderboard-r2')).toBeTruthy();
  });
});
```

(If `defaultProps` or `createMockRound`/`createIndividualEntry` differ in name/shape, use the file's actual helpers — they are defined near the top of this test file.)

- [ ] **Step 2: Run the tests to verify they fail**

Run: `pnpm test -- LeaderboardTab -t "ordering and alt-shot header"`
Expected: FAIL —
- the ordering test fails because the in-progress alt-shot round currently renders before the completed round (`r2Index < r1Index`);
- the header test fails because `lb-header-2` is not rendered (no header today).

- [ ] **Step 3: Add the `orderedRounds` memo**

In `src/components/leaderboard/LeaderboardTab.tsx`, immediately after the existing `inProgressRounds` `useMemo` (~line 285-291), add:

```tsx
  // Single round-number-ordered list across statuses, so rounds render in
  // numeric order regardless of in-progress/completed (the per-round component
  // is still chosen by `inProgress`). Keeps `inProgressRounds`/`completedRounds`
  // (used by the section empty-state guards).
  const orderedRounds = useMemo(
    () => [
      ...inProgressRounds.map((round) => ({ round, inProgress: true })),
      ...completedRounds.map((round) => ({ round, inProgress: false })),
    ].sort((a, b) => a.round.round_number - b.round.round_number),
    [inProgressRounds, completedRounds]
  );
```

- [ ] **Step 4: Add the `LeaderboardHeader` import**

Near the other local imports at the top of `LeaderboardTab.tsx` (the `RoundLeaderboard` import is at line ~21):

```tsx
import { LeaderboardHeader } from './LeaderboardHeader';
```

- [ ] **Step 5: Replace the two round maps with one ordered map**

Replace the entire block from the in-progress comment + `{inProgressRounds.map((round) => { ... })}` through the end of `{completedRounds.map((round) => ( ... ))}` (currently ~lines 469-544) with a single map over `orderedRounds`:

```tsx
          {/* All rounds in round-number order. In-progress individual formats
              render a live leaderboard derived from scorecards (round_results
              is only populated on submission); split alt-shot renders the live
              sub-match leaderboard with its own header; everything else reads
              round_results via RoundLeaderboard. */}
          {orderedRounds.map(({ round, inProgress }) => {
            const gameType = round.game_type as GameType;

            if (isSplitAltShotRound(round)) {
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

            if (inProgress) {
              const canRenderLive =
                !round.is_team_round && IN_PROGRESS_SUPPORTED_GAME_TYPES.has(gameType);
              return (
                <View key={round.id} style={styles.roundLeaderboardContainer}>
                  {canRenderLive ? (
                    <InProgressRoundLeaderboard
                      roundId={round.id}
                      gameType={gameType}
                      roundNumber={round.round_number}
                      courseName={round.course?.name ?? undefined}
                      currentUserId={currentUserId}
                      testID={`round-leaderboard-${round.round_number}-live`}
                    />
                  ) : (
                    <RoundLeaderboard
                      roundId={round.id}
                      gameType={gameType}
                      isTeamRound={round.is_team_round || false}
                      currentUserId={currentUserId}
                      autoRefresh={autoRefresh}
                      filterView={effectiveView}
                      playerTeamLookup={
                        effectiveView === 'individual' && hasTeams ? playerTeamLookup : undefined
                      }
                      testID={`round-leaderboard-${round.round_number}`}
                    />
                  )}
                </View>
              );
            }

            return (
              <View key={round.id} style={styles.roundLeaderboardContainer}>
                <RoundLeaderboard
                  roundId={round.id}
                  gameType={gameType}
                  isTeamRound={round.is_team_round || false}
                  currentUserId={currentUserId}
                  autoRefresh={false}
                  filterView={effectiveView}
                  playerTeamLookup={
                    effectiveView === 'individual' && hasTeams ? playerTeamLookup : undefined
                  }
                  testID={`round-leaderboard-${round.round_number}`}
                />
              </View>
            );
          })}
```

(The section's outer guard `{(completedRounds.length > 0 || inProgressRounds.length > 0) && (...)}` and the two empty-state blocks below stay unchanged.)

- [ ] **Step 6: Run the tests to verify they pass**

Run: `pnpm test -- LeaderboardTab -t "ordering and alt-shot header"`
Expected: PASS (both new tests).

- [ ] **Step 7: Run the full LeaderboardTab suite (no regressions)**

Run: `pnpm test -- LeaderboardTab`
Expected: the new tests pass and all previously-passing tests still pass. (The ~10 pre-existing baseline failures — `StablefordLeaderboardFull` undefined in `InProgressRoundLeaderboard` and `LeaderboardTable` highlighting — are unrelated; confirm the count of failures did not increase.)

- [ ] **Step 8: Type-check**

Run: `pnpm type-check 2>&1 | grep -E "LeaderboardTab" || echo "NO ERRORS in touched files"`
Expected: `NO ERRORS in touched files`.

- [ ] **Step 9: Commit**

```bash
git add src/components/leaderboard/LeaderboardTab.tsx src/components/leaderboard/LeaderboardTab.test.tsx
git commit -m "fix(leaderboard): order comp Round Results by round number + alt-shot header

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>"
```

## Self-Review Notes

- **Spec coverage:** ordering (single sorted list) → Steps 3+5; alt-shot header → Steps 4+5; both tested → Step 1. Non-goals respected (only `LeaderboardTab.tsx` + its test).
- **Component selection unchanged:** the three branches reproduce today's exact components/props (`autoRefresh` true for in-progress non-live, false for completed; `canRenderLive` gate intact). Only ordering + the alt-shot header differ.
- **No placeholders:** full render block and both tests are inline.
- **Type consistency:** `orderedRounds` items are `{ round, inProgress }`; the map destructures the same; `LeaderboardHeader` props match its interface (`roundNumber, gameType, isTeamRound, roundFormat, teamFormat, subMatchSize, rulesOverride, date, courseName`); `date={round.date ?? undefined}` satisfies the `date?: string` prop.
