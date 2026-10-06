# Ryder-cup Team Standings — Design

**Date:** 2026-07-13
**Status:** Approved (design), pending implementation plan.

## Overview

Redesign the competition Leaderboard tab's **Team standings** into a Ryder-cup-style head-to-head scoreboard **when a competition has exactly two teams**: the two teams side by side in columns with their big accumulated competition-points numbers, tappable to expand a per-round breakdown shown in the same two-column format. Competitions with three or more teams keep today's ranked `TeamLeaderboardTable`.

This reuses the existing sub-match scoreboard aesthetic (`SubMatchOverallHeader` already renders "Team A  N — M  Team B" with team colours and big numbers) and the per-round breakdown data the team leaderboard already computes. No backend change, no new data fetching.

## Where it applies

- `LeaderboardTab` (`src/components/leaderboard/LeaderboardTab.tsx`), Team view only (`effectiveView === 'team'`).
- New component `TeamHeadToHeadCard` renders when `teamEntries.length === 2`; otherwise the existing `TeamLeaderboardTable` renders (unchanged). The mini-leaderboard on the Compete card and all other surfaces are out of scope.

## Collapsed layout (the scoreboard)

Two columns (left team / right team). Each column:
- Team colour accent (from the existing team colour lookup).
- Team name (bold), with a **"You" badge** when the current user is a member of that team.
- **Member names** on one line (e.g. "Sam W, Sam K, Arthur…", truncated).
- **Average handicap** (`avgHandicap.toFixed(1)`), as the current table shows.

Centre / prominent: each team's **accumulated competition points** (`totalPoints`) as a large number, with a centred separator ("64 — 64"). The **leading** team's number is emphasised (team colour / weight) and gets a **trophy**; an exact tie shows both level with no trophy.

The whole card is a single tap target that toggles the expanded breakdown (mirrors `TeamLeaderboardTable`'s expand interaction).

## Expanded layout (per-round breakdown, two columns)

Section titled "Round Breakdown". One row per round, ordered by **`display_order`** (positional). Each row:
- Centre: **R# · course name** — R# is the positional round number (`buildPositionalRoundNumbers`, consistent with the round-numbering fix already shipped); course name from the rounds list.
- Left: left team's competition points for that round; Right: right team's points for that round.
- The round's **winning side** (higher points that round) is highlighted in its team colour; an equal round shows both neutral.

Empty state: if no rounds have scored yet, show "No rounds played yet" (as the current breakdown does).

## Data flow

`LeaderboardTab` already builds the two `TeamLeaderboardEntry` objects via `toTeamLeaderboardEntries` — each carries `teamId`, `teamName`, `avgHandicap`, `totalPoints`, `members[]`, and a per-team `roundBreakdown[]` (`{ roundId, roundLabel, courseName?, position, points }`).

`TeamHeadToHeadCard` receives:
- the two `TeamLeaderboardEntry` objects (already sorted by points desc → left = leader),
- a **team-colour lookup** (`teamId → hex`), derived from the existing `useTeams(competitionId)` data already loaded in `LeaderboardTab` (via `getTeamColorHex`),
- `currentUserId` (for the "You" badge),
- the `rounds` list (for positional `R#` and course names).

It **merges the two teams' `roundBreakdown` by `roundId`** into aligned rows `{ roundId, roundLabel, courseName, pointsLeft, pointsRight }`, ordered by positional round number. A round present for one team but not the other shows `0` for the missing side.

## Components / boundaries

- **New:** `src/components/leaderboard/TeamHeadToHeadCard.tsx` — pure presentational; props are the two entries + colour lookup + currentUserId + rounds. Owns its own expand state. A small pure helper (co-located or in a `*.utils.ts`) merges the two `roundBreakdown[]` into aligned rows — unit-testable independently.
- **Modified:** `LeaderboardTab.tsx` — branch on `teamEntries.length === 2` to choose `TeamHeadToHeadCard` vs `TeamLeaderboardTable`; build and pass the team-colour lookup (from `useTeams`, already fetched for `playerTeamLookup`).
- **Unchanged:** `TeamLeaderboardTable` (still used for 3+ teams), all data hooks, `SubMatchOverallHeader` (referenced for style parity, not necessarily imported).

## Testing

Component test for `TeamHeadToHeadCard`:
- renders both team names, member names, avg HC, and both big totals;
- leader gets the trophy / emphasis; an exact tie shows level with no trophy;
- "You" badge appears on the current user's team column only;
- expanding shows the merged per-round rows in positional order with the round winner highlighted; a round scored by only one team shows `0` for the other;
- empty breakdown shows the empty state.

Unit test for the merge helper: two `roundBreakdown[]` with overlapping and non-overlapping rounds → correct aligned rows, positional ordering, `0` fill.

Integration (in `LeaderboardTab`, light): two-team competition renders `TeamHeadToHeadCard`; three-team competition renders `TeamLeaderboardTable`.

## Out of scope

- 3+-team head-to-head variants (kept as the existing list).
- Any change to how competition points are computed or to the individual standings.
- The Compete-card mini-leaderboard and non-competition surfaces.

## Decisions (confirmed with user)

- 2 teams → scoreboard; 3+ → existing `TeamLeaderboardTable`.
- Column content: member names + average handicap + leader trophy/highlight + "You" badge.
- Expanded breakdown per round: R# + course + each team's points, round winner highlighted.
