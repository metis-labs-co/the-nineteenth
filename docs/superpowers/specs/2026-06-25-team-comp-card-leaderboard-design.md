# Team mini-leaderboard on the competition card

**Date:** 2026-06-25
**Branch:** `feat/team-comp-card-leaderboard`

## Goal

On the Compete screen → competition list, in-progress **fixed-team** competitions
show the *team* mini-leaderboard on the card instead of the individual one.
`per-round` and `none` competitions are unchanged (individual standings).

## Rationale

The card's `CompetitionMiniLeaderboard` currently calls
`useCompetitionLeaderboard(competitionId, { autoRefresh: false })`, which defaults
to `filter: 'all'` — a merged list of individuals **and** teams. For a team
competition that mix is noisy; the meaningful standing is the team table.

`useCompetitionLeaderboard` already supports `filter: 'teams'` (used by the full
LeaderboardTab), so no new data layer is required — only a flag threaded to the card
and a filter switch.

## Scope decision

Only `team_mode === 'fixed'` shows team standings. `per-round` comps have teams that
vary each round, so there is no single stable team standing to show on a compact card;
they keep the individual leaderboard.

## Changes

1. **`src/screens/compete/utils/groupCompetitions.ts`**
   - Add `teamMode?: TeamMode` to the `CompetitionItem` interface (import `TeamMode`
     from `@/types/database.types`). Kept **optional** so `CompetitionItem` stays
     mutually assignable with `CompetitionListCardData` (whose `teamMode` is also
     optional) — otherwise the generic `CompetitionListCard<T>` inference breaks the
     `onPress`/`onDelete` handler types. The hook always populates it.

2. **`src/screens/compete/hooks/useCompetitionGroups.ts`**
   - Add `team_mode` to the `select(...)` of both the organised and joined queries.
   - Add `team_mode` to the `CompetitionRow` / `JoinedCompetitionRow` interfaces.
   - Map `teamMode: comp.team_mode ?? 'none'` onto each `CompetitionItem`.

3. **`src/components/competitions/CompetitionListCard.tsx`**
   - Add optional `teamMode?: TeamMode` to `CompetitionListCardData`.
   - Derive `isFixedTeam = competition.teamMode === 'fixed'`.
   - Pass `isTeamComp={isFixedTeam}` to `<CompetitionMiniLeaderboard>`.

4. **`src/components/competitions/CompetitionMiniLeaderboard.tsx`**
   - Add `isTeamComp?: boolean` prop.
   - Select filter: `useCompetitionLeaderboard(id, { autoRefresh: false, filter: isTeamComp ? 'teams' : 'individuals' })`.

## Unchanged behaviour

- `isCurrentUserEntry` already matches teams via `teamMembers`, so the "You" row
  highlights the viewer's team automatically.
- "Pts" stat label, trophy/first-place styling, and the "render nothing until a round
  is played" behaviour are unchanged.
- The mini leaderboard only renders for in-progress comps (existing card gate).

## Edge cases

- Fixed-team comp where the viewer isn't on a team (e.g. organiser-only): shows the
  top-3 teams with no "You" row.
- `per-round` / `none`: individual leaderboard (no change).

## Testing

No meaningful unit test for the visual data swap. Verification is on-device QA:
- A fixed-team in-progress comp card shows team names + team points.
- An individual in-progress comp card is unchanged.
