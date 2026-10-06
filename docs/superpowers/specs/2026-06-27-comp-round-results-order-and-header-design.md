# Competition Round Results — Order & Alt-Shot Header — Design

**Date:** 2026-06-27
**Status:** Approved (design), pending implementation plan
**Author:** Sam / Claude

## Problem

On the Competition Details → Leaderboard tab → "Round Results" list:

1. The in-progress **split alt-shot** round (rendered via `RoundSubMatchLeaderboard`) sits **first** in the list, above completed rounds, regardless of its round number.
2. That alt-shot entry has **no "Round N" header / format pill**, unlike every other round in the list.

## Root cause

In `src/components/leaderboard/LeaderboardTab.tsx` the Round Results section renders two separate maps in sequence: `inProgressRounds.map(...)` (line ~475) then `completedRounds.map(...)` (line ~521). Each list is sorted by `round_number`, but because in-progress renders entirely before completed, an in-progress round always appears above any completed round — so the alt-shot round (in-progress) leads the list.

The other rounds render a `LeaderboardHeader` (Round number title + format pill + date/course) **inside** `RoundLeaderboard` / `InProgressRoundLeaderboard`. `RoundSubMatchLeaderboard` renders only the bare sub-match cards, so the alt-shot entry has no header.

## Decision (user, 2026-06-27)

Render **all rounds in one list strictly ordered by `round_number`** regardless of status (completed R1 can sit above in-progress R2). Add the round header + format pill to the alt-shot entry.

## Design

Both changes are confined to `src/components/leaderboard/LeaderboardTab.tsx`.

### 1. Single round-number-ordered list

Replace the two sequential maps with one list that merges in-progress and completed rounds, tagged with status, sorted by `round_number`:

```tsx
const orderedRounds = useMemo(
  () => [
    ...inProgressRounds.map((round) => ({ round, inProgress: true })),
    ...completedRounds.map((round) => ({ round, inProgress: false })),
  ].sort((a, b) => a.round.round_number - b.round.round_number),
  [inProgressRounds, completedRounds]
);
```

Render one `orderedRounds.map(({ round, inProgress }) => ...)`. Per item, pick the component exactly as today, keyed off `inProgress`:
- `isSplitAltShotRound(round)` → `<LeaderboardHeader .../>` + `<RoundSubMatchLeaderboard .../>` (both statuses).
- else `inProgress` → `canRenderLive ? <InProgressRoundLeaderboard/> : <RoundLeaderboard autoRefresh/>`.
- else (completed) → `<RoundLeaderboard autoRefresh={false} .../>`.

No behaviour change to component selection — only the ordering (interleaved by number) and the alt-shot header. `inProgressRounds` / `completedRounds` memos stay (still used for the section's empty-state guards).

### 2. Alt-shot header + format pill

For the split alt-shot branch, render `LeaderboardHeader` above `RoundSubMatchLeaderboard`, sourced directly from the `round` (`RoundWithCourse`) object — all fields exist on the base `Round` type:

```tsx
<View key={round.id} style={styles.roundLeaderboardContainer}>
  <LeaderboardHeader
    roundNumber={round.round_number}
    gameType={round.game_type}
    isTeamRound={round.is_team_round}
    roundFormat={round.round_format}
    teamFormat={round.team_format}
    subMatchSize={round.sub_match_size}
    rulesOverride={round.rules_override}
    date={round.date ?? undefined}
    courseName={round.course?.name ?? undefined}
  />
  <RoundSubMatchLeaderboard roundId={round.id} competitionId={competitionId} currentUserId={currentUserId} />
</View>
```

`LeaderboardHeader` resolves the format pill via `inferPresetIdFromRound` → the alt-shot preset's `shortTitle`, matching the round picker. The header is added **only in `LeaderboardTab`** (the competition list), not inside `RoundSubMatchLeaderboard`, because the ViewRound tab already shows the screen's round header and must not get a duplicate.

## Non-goals

- No change to `RoundSubMatchLeaderboard`, `SubMatchLeaderboardTab`, the ViewRound tab, or the Review screen.
- No change to which leaderboard component renders for non-alt-shot rounds — only their ordering relative to in-progress/completed.
- No schema/data change.

## Testing

- Extend `LeaderboardTab.test.tsx`:
  - **Order:** given a completed R1 and an in-progress split alt-shot R2, assert R1's leaderboard renders before the alt-shot stub in the rendered tree (e.g. via `getAllByTestId` order, or that the alt-shot stub is not the first round entry). Reuse the file's existing round fixtures.
  - **Header:** assert the alt-shot round entry renders a "Round 2" header (the `LeaderboardHeader` text) alongside the `RoundSubMatchLeaderboard` stub.
- Existing `LeaderboardTab` tests stay green (the ~10 pre-existing baseline failures are unrelated).
- Manual QA (deferred): competition with a mid-list in-progress alt-shot round shows it in numeric position with a "Round N" + alt-shot pill header.

## Risks

- **Reordering affects all rounds**, not just alt-shot (intended per the decision). A completed earlier round now sits above an in-progress later round — verify this reads correctly on-device.
- `LeaderboardHeader`'s `date` expects an ISO string; `round.date` is `string | null` → pass `?? undefined`.
