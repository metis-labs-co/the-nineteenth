# Ringer Board (Best-of Composite) — Design

**Date:** 2026-06-06
**Status:** Approved (design), pending implementation plan
**Author:** Sam

## Summary

A **ringer board** for a competition: for each hole 1–18, take the best
Stableford points achieved across the qualifying rounds and stitch the 18 best
holes into one idealised composite ("dream") round. Two boards are produced:

- **Individual ringer** — every player's best-of composite across the event.
- **Team ringer** — each team's best-of composite across the event.

This was requested by an organiser for an upcoming competition.

## Context

The competition is **2 fixed teams of 4** (8 players) over **4 rounds**:

1. Stableford (individual)
2. Stableford **match play** — match decided on Stableford points; each player
   still records their own per-hole Stableford points
3. Best Ball 2v2 — Stableford points; 2v2 matchups decided by handicap *within*
   the round, but each player plays their own ball and records their own per-hole
   points
4. Scramble — **excluded** from the ringer

The team unit for the board is the **fixed team of 4**. The 2v2 grouping in the
Best Ball round is only a within-round matchup, not the board's team unit.

Because all three applicable rounds yield **per-hole Stableford points for every
individual player**, both boards reduce to a single operation: the max of
Stableford points per hole over a defined pool.

## Decisions (locked)

- **Best metric:** Stableford points (handicap-adjusted, common currency across
  all three rounds).
- **Qualifying rounds:** the 3 rounds that produce individual per-hole
  scorecards. The Scramble is naturally excluded because it produces a single
  team ball, not individual cards. No manual round selection needed.
- **Individual board:** for each player,
  `bestPoints[hole] = max(points on that hole across the 3 rounds)`; sum 18 → rank
  all 8 players.
- **Team board:** for each hole,
  `bestPoints[hole] = max(points over all 4 members × 3 rounds)` (up to 12 source
  values); sum 18 → compare the 2 teams.
- **Source tagging:** each ringer hole records its source — which round (and, for
  teams, which player) the best came from — for display.

## Approach

**Derived / computed** (chosen over persisted/materialized and minimal-list
alternatives). The ringer is computed on the fly from existing scorecards, like
the app's other leaderboards. **No database changes.** Recompute cost is trivial
for 8 players; the board updates live as scores sync and works offline against
cached scores.

## Components

### 1. Pure computation — `src/utils/scoring/ringer.ts`

A pure function `computeRingerBoard` taking the competition's scorecards + course
data (par / stroke index per hole) and returning both boards plus per-hole source
metadata.

- **Per-hole points:** reuse the existing Stableford engine
  (`calculateStablefordPointsNet`, `getStrokesReceived` in
  `src/services/scoring/engines/StablefordEngine.ts` / `src/utils/scoring.ts`)
  with each scorecard's stored handicap snapshot (`daily_handicap_used` etc.) and
  the hole's par / stroke index.
- **Individual:** per player, max points per hole across their played qualifying
  rounds.
- **Team:** per hole, max points over all 4 members × 3 rounds.
- Returns ranked individual entries, two team entries, and for each ringer hole a
  `{ points, sourceRoundId, sourcePlayerId }` record.

### 2. Data hook — `src/hooks/competitions/useRingerBoard.ts`

Fetches the competition's scorecards and course data via existing queries, calls
`computeRingerBoard`, returns both boards. Follows the existing
`useCompetitionLeaderboard` pattern (TanStack Query, query-key factory).

### 3. UI — `src/screens/competitions/RingerBoardScreen.tsx` + components

- **Individual / Teams** segmented toggle.
- **Ranked total list** at the top (player or team, ringer total).
- Tap a player/team → **composite 18-hole scorecard**: best points per hole, a
  small source tag (`R2` for individuals; `R1 · Sam` for teams), and the ringer
  total.
- Follows theming rules (`useThemeColors()`, static tokens). If reached via a
  modal presentation, wrap in `<SystemModalTheme>`.

### 4. Navigation

Add a route to the relevant navigator (`src/navigation/types.ts`). Two entry
points:

- A **tab** on the competition (alongside the existing leaderboard / rounds tabs).
- A **button / link** on the competition detail screen.

## Edge cases

- **Picked-up / unplayed hole** in a round → 0 points; simply won't win that hole.
- **Player missed a round** → only their played rounds are pooled.
- **Rounds in progress** → board is live and updates as scores sync; UI indicates
  which rounds are currently included.
- **Ties** → shared position, consistent with existing leaderboards.

## Testing

Unit tests on the pure util are the core (aligns with the 80%+ target on scoring
logic):

- Best-of selection per hole (individual).
- Team max across members × rounds.
- Missing / picked-up holes treated as 0.
- Scramble (no individual cards) excluded.
- Player who missed a round.
- Tie handling in rankings.

## Out of scope (YAGNI)

- Persisted/materialized ringer table.
- Manual round selection UI (auto-detection covers this competition).
- Ringer across multiple competitions / season-long.
