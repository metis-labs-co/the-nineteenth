# Split Match-Play (1v1 Singles) Leaderboard Reuse — Design

**Date:** 2026-06-27
**Status:** Approved (design), pending implementation plan
**Author:** Sam / Claude

## Problem

Split match-play rounds (1v1 singles, e.g. Ryder-cup-style team match-play with 1v1
sub-matches) already show a custom match-play leaderboard on the **Review Scorecard** screen's
Leaderboard tab. The same live leaderboard should appear on the **ViewRound** screen and the
**competition** Leaderboard tab for these rounds (in-progress and completed).

## Verified data model

Prod (`Murray Winter Classic 2026`, round 6): `game_type = 'match-play'`,
`round_format = 'split'`, `is_team_round = true`, `team_format = 'match-play-team'`,
`sub_match_size = 1`, four 1v1 sub-matches. So a "1v1 singles" round is a **split match-play
round**, and the Review-screen leaderboard for it is already `SubMatchLeaderboardTab` (its
`resolveSubMatchModel` returns `'match-play'` → 1v1 match rows + Ryder-cup tally). The
reusable wrapper `RoundSubMatchLeaderboard` already renders this from a `roundId`.

This makes the feature a **gate-broadening** exercise — no component or Review-screen change.

Detection: a split match-play round is `round_format === 'split' && game_type === 'match-play'`.

## Decisions (user, 2026-06-27)

- **Competition:** show the leaderboard for split match-play rounds in the per-round list,
  **Team view only** (same as alt-shot — these are team match-play rounds).
- **ViewRound:** **replace the Match tab content** with this live sub-match leaderboard for
  split match-play rounds (rather than adding a separate tab). In-progress and completed.

## Design

### Unit A — `isSplitMatchPlayRound` helper

Add to `src/utils/roundFormat.ts` (next to `isSplitAltShotRound`):

```ts
export function isSplitMatchPlayRound(round: {
  round_format?: string | null;
  game_type?: string | null;
}): boolean {
  return round.round_format === 'split' && round.game_type === 'match-play';
}
```

### Unit B — Competition `LeaderboardTab.tsx`

Broaden the existing split-alt-shot branch (the one rendering `LeaderboardHeader` +
`RoundSubMatchLeaderboard`, with the `if (effectiveView !== 'team') return null` gate) to also
match split match-play rounds:

```ts
if (isSplitAltShotRound(round) || isSplitMatchPlayRound(round)) {
  if (effectiveView !== 'team') return null;
  return ( /* unchanged: LeaderboardHeader + RoundSubMatchLeaderboard */ );
}
```

Team-view-only, ordering, and the `LeaderboardHeader` (round number + match-play format pill)
are all inherited from the existing alt-shot branch. Import `isSplitMatchPlayRound`.

### Unit C — ViewRound Match tab content swap

In `ViewRoundScreen/index.tsx`, the Match-tab block (currently
`{vm.activeTab === 'match' && (vm.isMatchPlayRound || vm.isTeamMatchPlayRound) && (<MatchTab .../>)}`)
renders `RoundSubMatchLeaderboard` for split rounds, else the existing `MatchTab`:

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
    <MatchTab ...existing props unchanged... />
  )
)}
```

`RoundSubMatchLeaderboard` is already imported in this file; `insets` is already in scope
(both from the alt-shot work). Within this block `isMatchPlayRound || isTeamMatchPlayRound` is
already true, so `vm.isSplitRound` here means "split match-play". The hole-by-hole scorecard
remains available on the Scorecard tab; the Sub-Matches tab still shows the breakdown.

## Non-goals

- No change to the Review Scorecard screen (already renders this), `SubMatchLeaderboardTab`,
  `RoundSubMatchLeaderboard`, or the data layer.
- No change to non-split match-play (combined 1v1) rounds — they keep the existing `MatchTab`.
- No change to the Match tab label (stays "Match"; content is swapped for split rounds).
- No change to alt-shot behaviour.
- No schema/data change.

## Testing

- **Helper (`roundFormat.test.ts`):** `isSplitMatchPlayRound` true for split + match-play;
  false for combined match-play, split non-match-play, missing fields.
- **Competition (`LeaderboardTab.test.tsx`):** a split match-play round (round_format 'split',
  game_type 'match-play', is_team_round true) renders the `RoundSubMatchLeaderboard` stub in
  the **Team** view, and is hidden in the **Individual** view — mirror the existing alt-shot
  team-view tests (reuse fixtures + `selectedView`).
- **ViewRound:** type-check + manual QA (the Match-tab swap is screen-level JSX with no tab
  test). Manual: split match-play round → Match tab shows the live sub-match leaderboard
  (in-progress and completed); a non-split match-play round still shows the `MatchTab`.

## Affected files

- `src/utils/roundFormat.ts` (+ test) — Unit A.
- `src/components/leaderboard/LeaderboardTab.tsx` (+ test) — Unit B.
- `src/screens/rounds/ViewRoundScreen/index.tsx` — Unit C.

## Risks

- **Match-tab regression:** the swap must preserve the existing `MatchTab` for non-split
  match-play (the `vm.isSplitRound` ternary guards this). Verify a simple 1v1 (non-split)
  match still renders the scorecard/results table.
- **Team match-play render data:** `RoundSubMatchLeaderboard` → `SubMatchLeaderboardTab` calls
  `useRoundTeams(competitionId, true, roundId)`; team match-play rounds have teams, so player
  names resolve. (Already exercised by alt-shot split team rounds.)
