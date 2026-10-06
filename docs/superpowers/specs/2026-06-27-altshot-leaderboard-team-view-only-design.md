# Alt-Shot Round Leaderboard — Team View Only — Design

**Date:** 2026-06-27
**Status:** Approved (design), pending implementation plan
**Author:** Sam / Claude

## Problem

In the competition Leaderboard tab, the "Round Results" list renders under both the
**Individual** and **Team** view toggle states. The split alt-shot round renders
`RoundSubMatchLeaderboard`, which always shows the team sub-match leaderboard regardless of
the active view — so it appears in the **Individual** sub-tab too. Alt-shot (foursomes) is a
pure team format with no individual scoring, so it shouldn't be listed there.

## Decision (user, 2026-06-27)

In the Individual view, the alt-shot round is **skipped entirely** from the round list (no
header, no body). It still shows in the Team view.

## Design

Single change in `src/components/leaderboard/LeaderboardTab.tsx`. In the `orderedRounds.map`,
the `isSplitAltShotRound(round)` branch renders only when `effectiveView === 'team'`;
otherwise it returns `null` (the round is omitted from the list on the Individual view):

```tsx
if (isSplitAltShotRound(round)) {
  if (effectiveView !== 'team') return null;
  return (
    <View key={round.id} style={styles.roundLeaderboardContainer}>
      <LeaderboardHeader ... />
      <RoundSubMatchLeaderboard ... />
    </View>
  );
}
```

`effectiveView` is already in scope (`'individual' | 'team'`, forced to `'team'` for
scramble-only competitions). No other branch changes; non-alt-shot rounds (including other
team formats via `RoundLeaderboard`, which filters by `filterView={effectiveView}`) are
untouched.

## Non-goals

- No change to the overall Individual/Team standings aggregation (round_results based).
- No change to non-alt-shot rounds, the wrapper, ViewRound, or the Review screen.
- No change to whether the Individual view is offered for team competitions.
- No schema/data change.

## Edge

If a competition has *only* alt-shot rounds, the Individual view's "Round Results" section
header may render with no round entries beneath it. Acceptable per the "doesn't need to
appear" decision; not special-cased (mixed competitions fill the list with their other
rounds).

## Testing

- Extend `LeaderboardTab.test.tsx`:
  - **Team view:** alt-shot round renders its sub-match leaderboard (existing test already
    covers the team-default render).
  - **Individual view:** render with `defaultProps` forcing the Individual view and an
    in-progress split alt-shot round; assert its `submatch-leaderboard-<id>` stub is **not**
    present (`queryByTestId(...)` is null), while a non-alt-shot round in the same list still
    renders. Reuse the file's existing fixtures + the view-toggle/`teamMode` props the other
    tests use to land on the Individual view.
- Existing `LeaderboardTab` tests stay green (the ~10 pre-existing baseline failures are
  unrelated).
- Manual QA (deferred): switch the competition Leaderboard between Individual and Team — the
  alt-shot round appears only under Team.

## Risk

- Landing the test on the Individual view requires the right `teamMode`/`view` props; if the
  competition is team-mode the default view is `'team'`, so the test must explicitly select
  the Individual view the way the existing view-toggle tests do.
