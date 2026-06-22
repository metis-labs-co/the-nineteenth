# Team Leaderboard Points-to-Win Overview (+ sheet padding fix) — Design Spec

**Date:** 2026-06-23
**Status:** Approved (design), pending implementation plan
**Related:** `2026-06-22-per-round-points-and-rules-config-design.md`, `2026-06-23-points-config-in-sheet-design.md`

## Motivation

1. In the Points Config sheet, the "{total} points available · first to {toWin} wins"
   summary line sits flush under the sheet's "Points & Rules" title — the `plain`
   variant of `PointsConfigSection` has no top padding.
2. The team leaderboard doesn't surface the points target. For a Ryder-cup-style
   per-round team competition, viewers want to see how many points win it.

## Goals

1. Fix the top padding of the summary line in the Points Config sheet.
2. Add a **points-to-win overview banner** to the **team** leaderboard view showing
   "First to {toWin} points wins · {total} points available".

## Non-goals (YAGNI)

- No per-team "needs M more" breakdown; no leader-remaining calculation (a static
  target banner only).
- No data-model, type, or migration changes. Reuse `summarizeCompetition`.
- General-rules competitions are out of scope (no per-round points target).

## Design decisions (locked)

- **Banner content:** "First to {toWin} points wins" + subtext "{total} points
  available" — same wording/source as the sheet summary.
- **Visibility:** only the **team** leaderboard view, only when the competition is
  **team-based** (`team_mode !== 'none'`) **and** `per_round_rules_enabled === true`.
  Visible to all users.
- **Padding fix:** add `paddingTop: spacing.md` to the `plain` style in
  `PointsConfigSection` (the `card` variant is untouched).

## Architecture

### Part 1 — Sheet summary padding (`PointsConfigSection.tsx`)

Add `paddingTop: spacing.md` to `styles.plain`. One-line change; only affects the
sheet-embedded (`plain`) rendering.

### Part 2 — `TeamPointsToWinBanner`

New presentational component
`src/components/leaderboard/TeamPointsToWinBanner.tsx`:
- Props: `{ total: number; toWin: number }`. Pure — no data fetching.
- Renders a compact callout (icon + "First to {toWin} points wins" + subtext
  "{total} points available"), styled with `useThemeColors()` + tokens to sit above
  the team standings card (match the leaderboard card surface / a subtle
  primary-tinted callout). Paper `Text`/`Icon`.

### Part 3 — Wire it into `LeaderboardTab`

- Add a new prop `perRoundRulesEnabled: boolean` to `LeaderboardTabProps`
  (it already has `teamMode` and `rounds`).
- When the effective view is `team`, the comp is team-based (`teamMode !== 'none'`),
  and `perRoundRulesEnabled` is true, compute `{ total, toWin } =
  summarizeCompetition(rounds, { membersPerTeam })` and render
  `<TeamPointsToWinBanner total={total} toWin={toWin} />` directly above the
  `TeamLeaderboardTable`.
- `membersPerTeam` is derived from team data already available in `LeaderboardTab`
  (the team standings' member counts, max; fallback `1`) — consistent with how the
  Points Config sheet derives it.

### Part 4 — Thread the prop from the detail screen

In `src/screens/competitions/CompetitionDetailScreen/index.tsx`, pass
`perRoundRulesEnabled={competition.per_round_rules_enabled ?? false}` to
`<LeaderboardTab>` (the `competition` object is in scope at the call site).

## Testing

- `TeamPointsToWinBanner` is a tiny pure presentational component; a render test is
  optional. The `summarizeCompetition` math is already covered.
- Verification: type-check + manual:
  - Per-round team comp → team leaderboard view shows the banner with the correct
    "first to N · X available" (matching the Points Config sheet).
  - Individual view, or general-rules comp, or non-team comp → no banner.
  - Points Config sheet summary now has comfortable spacing under the title.

## Relevant existing code (reference)

- `src/components/competitions/detail/sections/PointsConfigSection.tsx` — `styles.plain`.
- `src/components/leaderboard/LeaderboardTab.tsx` — `LeaderboardTabProps`, the
  team-view branch rendering `TeamLeaderboardTable`, `useTeams` import, `hasTeams`.
- `src/components/leaderboard/TeamLeaderboardTable.tsx` — the standings card the banner sits above.
- `src/utils/competitionPoints/roundPointsSummary.ts` — `summarizeCompetition`.
- `src/screens/competitions/CompetitionDetailScreen/index.tsx` (~line 509) — `<LeaderboardTab>` call site.
- `src/components/competitions/detail/sections/MiniLeaderboardSection.tsx` / `src/components/subscription/InfoBanner.tsx` — banner styling patterns to match.
