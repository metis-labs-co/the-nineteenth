# Team Best Ball — Score Entry & Leaderboard Improvements

**Status:** Design
**Date:** 2026-04-28
**Author:** Sam (with Claude)

## Background

Team best-ball rounds use compact `BestBallScoreView` cards on the score-entry screen — one row per player with small +/- buttons and a "BEST" badge on the lowest net score. This works for a quick-look "everyone scoring everyone" view, but it has two gaps:

1. **Stats are unreachable.** The compact row has no entry point for putts, FIR, GIR, bunkers, or hazards. A player whose tier supports detailed stats can't record them on best-ball rounds.
2. **Scoring-pair rounds are over-constrained.** When scoring pairs is on, the user is only entering scores for two players (their own pair) and could comfortably use the full per-player Stableford UI — they don't need the dense 4-row team layout.

The leaderboard story is also fragmented for team-stroke rounds (`team_format` ∈ `best-ball` | `aggregate`):

- **Review Scorecard → Leaderboard tab**: shows individual standings only — no team view at all.
- **View Round → Leaderboard tab**: shows individual standings.
- **View Round → Teams tab**: shows team rosters + team handicap aggregates + team leaderboard.

The same team data is split across two tabs on View Round, while Review Scorecard has no team view at all. After this change, both screens get one Leaderboard tab that toggles between Individual and Team. The Teams tab disappears.

## Goals

1. Allow detailed stats entry on best-ball rounds when scoring pairs is off.
2. Use the full Stableford per-player UI on best-ball rounds when scoring pairs is on, with a team-points header to keep the format context.
3. Surface both individual and team leaderboards on a single Leaderboard tab on Review Scorecard and View Round.
4. Remove the now-redundant Teams tab from View Round.

## Non-goals

- No change to scramble, shamble, or match-play-team scoring or leaderboards. They have their own dedicated tabs.
- No change to skins, wolf, or payouts surfaces.
- No change to `useTeamScoring` aggregation logic — best-ball still selects the lowest net score per hole.
- No new database columns or migrations.

## Architecture

### Score Entry — routing change

`src/screens/scoring/ScorecardEntryScreen/components/ScorecardScoreContent.tsx`

The existing `if (isTeamRound && teamFormat === 'best-ball' && teams.length > 0)` branch (around line 377) splits into two sub-branches based on `scoringPairsEnabled`:

```
if (isTeamRound && teamFormat === 'best-ball' && teams.length > 0) {
  if (scoringPairsEnabled) {
    // Render: <BestBallTeamHeader /> per team + Stableford <PlayerScoreCard /> per player in the pair
  } else {
    // Render: existing <BestBallScoreView /> per team, with a stats action wired in
  }
}
```

#### Scoring pairs ON branch

For each team:

1. **`BestBallTeamHeader`** (new component, `src/components/scorecard/BestBallTeamHeader.tsx`):
   - Team name + member handicaps in a header strip.
   - "Team Pts" running total to date (sum of best-of-two stableford points across completed holes).
   - Current-hole best-ball indicator: which player's score is currently the team's best for this hole, and the points value. If the hole isn't fully scored yet, render `—`.
2. Below the header, render the same `PlayerScoreCard` used by individual Stableford rounds, one per **team member**. Members in `playersToScore` are interactive; non-pair members render with `disabled={true}` (existing prop on `PlayerScoreCard` — see line 82 of `src/components/scorecard/PlayerScoreCard/PlayerScoreCard.tsx`). This preserves visibility of the other pair's scores so the "best ball" context is still visible.

The `PlayerScoreCard` is the same component used in the default Stableford branch at the bottom of `ScorecardScoreContent.tsx` — it already supports `runningTotalPoints`, `showPointsPreview`, `onDetailedStatsPress`, `teamName`, and the per-player handicap display map. No changes needed to `PlayerScoreCard`.

The team running total displayed in `BestBallTeamHeader` is computed by walking each completed hole, calling `calculateStablefordPoints` per team member, and taking the maximum. This logic already exists inside `BestBallScoreView`'s `useMemo` — extract it into a small util `getBestBallTeamPoints(team, holes, getPlayerScore)` in `src/utils/teamScoring/calculations.ts` (which already houses related helpers).

#### Scoring pairs OFF branch

`BestBallScoreView` is updated, not replaced:

- Add an optional **stats action** to each player row — a small icon-only button (chart-line icon, 32x32, ghost-style) placed in the row's `compactControls` cluster, before the points display.
- When tapped, it calls a new prop `onPlayerStatsPress(playerId)` passed down from `ScorecardScoreContent.tsx`.
- `ScorecardScoreContent` already exposes `onDetailedStatsPress` for individual stableford rounds — wire the same `setDetailedStatsPlayerId` setter through. The existing `DetailedStatsSheet` is rendered at the screen level (in `ScorecardEntryScreen/index.tsx` around line 716) and will work without modification.
- The stats action is hidden if no stats fields are visible for the user's tier (i.e., `useStatsVisibilityWithTier` returns all-false). The existing `statsVisibility` flow is already plumbed to `ScorecardScoreContent`; pass an `anyStatsVisible` boolean prop to `BestBallScoreView`.

The compact +/- score controls and "BEST" highlight stay exactly as they are.

### Leaderboard toggle — shared component

A new shared component `src/components/leaderboard/IndividualTeamToggle.tsx` exposes:

```ts
interface IndividualTeamToggleProps {
  view: 'individual' | 'team';
  onChange: (view: 'individual' | 'team') => void;
}
```

It's a thin wrapper around the existing segmented-control pattern used elsewhere in the app (e.g., `RoundTypeSheet`, scramble team selector). Rendered inline at the top of the Leaderboard tab content.

#### Review Scorecard

`src/screens/scoring/ReviewScorecardScreen/components/LeaderboardTabContent.tsx`

- Add `teams` and `teamFormat` props (passed from `ReviewScorecardScreen`).
- When `teamFormat === 'best-ball' || teamFormat === 'aggregate'`:
  - Render `IndividualTeamToggle` at the top.
  - **Individual** view: existing format-specific leaderboard (`StablefordLeaderboardFull` / `StrokePlayLeaderboardFull` / `ParLeaderboardFull`).
  - **Team** view: extract the team-card-rendering body of `TeamLeaderboardTab` into a new presentational component `TeamLeaderboardView` (`src/components/leaderboard/TeamLeaderboardView.tsx`) that takes `teamEntries`, `teamFormat`, `currentUserId` props and a loading/empty state. Both `TeamLeaderboardTab` (in the about-to-be-deleted Teams tab) and `LeaderboardTabContent` use it.
- Default view: `team` for team-stroke rounds. The toggle state lives in local component state — no need to persist across navigations.
- Tab key stays `leaderboard` — no addition to `useReviewScorecardTabs.ts`.

`useRoundLeaderboard(roundId)` (the source for `TeamLeaderboardTab`) is already a TanStack Query hook and will be called in parallel with the existing scorecard data fetch. No store changes.

#### View Round

`src/screens/rounds/ViewRoundScreen/index.tsx` and `tabs/StrokePlayLeaderboardTab.tsx`

- Promote `StrokePlayLeaderboardTab` to handle the toggle internally, or wrap it in a new `IndividualTeamLeaderboardTab` parent. Choose the wrapper approach so `StrokePlayLeaderboardTab` stays a focused individual-only view (used today for non-team stroke rounds).
- New tab component `src/screens/rounds/ViewRoundScreen/tabs/IndividualTeamLeaderboardTab.tsx`:
  - Renders the toggle + dispatches between the individual leaderboard (existing component) and `TeamLeaderboardView`.
  - Same default-to-team behavior.
- `index.tsx`: when `vm.activeTab === 'leaderboard'`, branch on `teamFormat` — render the new wrapper for `best-ball` / `aggregate`, otherwise render the existing `StrokePlayLeaderboardTab`.

`useViewRoundTabs.ts` already pushes a `leaderboard` tab for stroke / stableford / par rounds (line 95); best-ball/aggregate rounds qualify because their `gameType` is one of those. No tab list change needed.

### Teams tab removal

`src/screens/rounds/ViewRoundScreen/`:

- Delete `tabs/TeamsTab.tsx`.
- Delete the `'teams'` branch in `index.tsx` (around line 322).
- Remove the `'teams'` key from `TabKey` type and from the tab list in `useViewRoundTabs.ts` (lines 103–109).
- The `TeamMatchPointsLeaderboard` helper inside `TeamsTab.tsx` is only used there — gone with the tab.

`src/components/rounds/ViewRound/RoundDetailsTab/components/TeamsSection.tsx` becomes dead code. Per the file's own comment ("Replaces the old round-Details TeamsSection so team rosters live in exactly one place") it has no other consumers — confirm with a grep at implementation time and delete.

The Groups / Sub-Matches tab already shows each player's team label inline, so roster information remains accessible for every team-format round.

### TeamLeaderboardTab → TeamLeaderboardView

`src/screens/rounds/ViewRoundScreen/tabs/TeamLeaderboardTab.tsx` becomes obsolete:

- Its rendering body moves to `TeamLeaderboardView` (presentational).
- The data-fetching wrapper (the `useRoundLeaderboard` call + loading/empty branching) is small enough that both the View Round wrapper and the Review Scorecard wrapper call `useRoundLeaderboard` directly and pass `teamEntries` into `TeamLeaderboardView`. Delete `TeamLeaderboardTab.tsx`.

## Data flow

Nothing new flows through the database. All changes are local to the score-entry/review/view-round screens:

```
useRoundLeaderboard(roundId)
  └─ TeamLeaderboardView (used by both Review Scorecard and View Round)

useStatsVisibilityWithTier
  └─ ScorecardScoreContent
       └─ BestBallScoreView (shows/hides stats action)

useTeamScoring (existing)
  └─ playerScoresMap, getTeamScore — already drives BestBallScoreView and the new BestBallTeamHeader
```

The new `getBestBallTeamPoints` util reuses the same `calculateStablefordPoints` already imported by `BestBallScoreView`.

## Components touched

### New
- `src/components/scorecard/BestBallTeamHeader.tsx` — team name + running team points + current-hole best-ball indicator.
- `src/components/leaderboard/IndividualTeamToggle.tsx` — segmented control.
- `src/components/leaderboard/TeamLeaderboardView.tsx` — extracted team-card rendering body.
- `src/screens/rounds/ViewRoundScreen/tabs/IndividualTeamLeaderboardTab.tsx` — wraps individual + team views with toggle.
- `getBestBallTeamPoints` util in `src/utils/teamScoring/calculations.ts`.

### Modified
- `src/components/scorecard/BestBallScoreView.tsx` — add `onPlayerStatsPress` prop and stats action button per row; gate via `anyStatsVisible`.
- `src/screens/scoring/ScorecardEntryScreen/components/ScorecardScoreContent.tsx` — split the best-ball branch on `scoringPairsEnabled`; pass stats handler through.
- `src/screens/scoring/ReviewScorecardScreen/components/LeaderboardTabContent.tsx` — accept `teamFormat`, render toggle for team-stroke.
- `src/screens/scoring/ReviewScorecardScreen/index.tsx` — pass `teamFormat` to `LeaderboardTabContent`.
- `src/screens/rounds/ViewRoundScreen/index.tsx` — branch the leaderboard tab between individual-only and toggle wrapper based on `teamFormat`.
- `src/screens/rounds/ViewRoundScreen/hooks/useViewRoundTabs.ts` — drop `'teams'` from the tab list.
- `src/screens/rounds/ViewRoundScreen/types.ts` — drop `'teams'` from `TabKey`.

### Deleted
- `src/screens/rounds/ViewRoundScreen/tabs/TeamsTab.tsx`.
- `src/screens/rounds/ViewRoundScreen/tabs/TeamLeaderboardTab.tsx` (logic absorbed into `TeamLeaderboardView`).
- `src/components/rounds/ViewRound/RoundDetailsTab/components/TeamsSection.tsx` (after grep confirms no other consumers).

## Edge cases

- **Best-ball + scoring pairs on, user not in a team** (e.g., super admin viewing): `playersToScore` will be the pair anyway via the existing `useRoundData` resolution. The Stableford-card branch still works; the `BestBallTeamHeader` renders for both teams; only the user's pair's cards are interactive.
- **Best-ball + tier without stats**: `BestBallScoreView` hides the stats action. No empty button.
- **Aggregate format**: identical to best-ball for leaderboard purposes — the toggle Team view shows aggregate net via the same `TeamLeaderboardView` which already handles both formats.
- **Score entry for aggregate rounds**: out of scope for this change. Aggregate rounds already use `PlayerScoreCard` (no team-format-specific UI) — the per-player Stableford branch in `ScorecardScoreContent` handles them. No change needed.
- **Solo round (1 player) flagged as best-ball**: not a real case in practice (best-ball requires ≥2 teammates), but `playerCount === 1` skips the leaderboard tab via existing `isSoloRound` guards on both screens.
- **Missing `useRoundLeaderboard` data on Review Scorecard**: when offline pre-sync, the team query may return empty. `TeamLeaderboardView` shows the existing "No Team Scores Yet" empty state.
- **Default view persistence**: toggle state is local-only. Switching tabs and returning resets to Team. Acceptable for v1; revisit if users complain.

## Testing

### Unit
- `getBestBallTeamPoints` — covers all-incomplete, partially complete, and fully scored teams.
- `BestBallTeamHeader` — renders running total, current-hole best player, and `—` placeholder.
- `BestBallScoreView` — stats button visible when `anyStatsVisible`, hidden otherwise; `onPlayerStatsPress` invoked with correct id.

### Integration
- `ScorecardScoreContent` — best-ball + scoring pairs ON renders Stableford cards; best-ball + scoring pairs OFF renders compact view with stats button.
- `LeaderboardTabContent` (Review Scorecard) — toggle present for `team_format = 'best-ball' | 'aggregate'`, absent otherwise.
- `IndividualTeamLeaderboardTab` (View Round) — same.

### Manual
- Score a 2v2 best-ball round with scoring pairs on; verify the Stableford UI, team-points header running total, and best-ball highlight on the current hole.
- Score a 2v2 best-ball round with scoring pairs off; tap the stats action; verify the bottom sheet opens for the right player.
- Open both leaderboard surfaces; toggle between Individual and Team; verify default is Team.
- Confirm the View Round screen no longer has a Teams tab.
- Confirm the Groups/Sub-Matches tab still labels each player with their team.

## Rollout

Single PR. No feature flag needed — the changes are scoped to team-stroke rounds and don't affect other formats. No data migrations.
