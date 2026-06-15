# Player Contributions — Design Spec

**Date:** 2026-06-15
**Status:** Approved (design) — pending implementation plan
**Author:** Sam (with Claude)

## Summary

Add a **"player contributions"** view to the Competition Detail screen that tells a
*Team MVP / pull-your-weight* story: within team-format rounds, who carried their team.
Each format reports its own natural contribution metric, normalized to a headline
**contribution %** so players are comparable across formats and across rounds.

The view is delivered as a **unified per-hole "Breakdown" tab** that absorbs the
existing Ringer tab into a segmented control:

- **Ringer** (existing — individual best-of across rounds)
- **Team Ringer** (existing — team best-of across rounds)
- **Contributions** (new — within-round, share-of-team)

Segments appear only when their underlying data exists, which also fixes an existing
wart: the Ringer tab currently disappears on all-scramble competitions.

## Goals

- Surface, per team-format round, how much each player contributed to their team.
- Roll those up into a competition-wide "MVP" leaderboard (average contribution %).
- Reuse existing scoring utilities and the existing `ContributionLeaderboard` UI.
- Degrade gracefully when the data needed for a metric wasn't captured.

## Non-Goals (v1)

- No new persisted columns or migrations — everything is computed from existing
  scorecards + shot contributions.
- No contributions for individual formats (stroke, stableford, par, match play) —
  those are solo scores with no team to contribute to.
- No cross-competition / season-long aggregation.
- No changes to how scores or shot contributions are *entered*.

## Placement & Tab Behavior

The Competition Detail tab bar (`src/screens/competitions/CompetitionDetailScreen/index.tsx`,
tab visibility logic ~lines 228–243) currently hides **Stats** and **Ringer** when all
rounds are scramble. We reframe the **Ringer** tab as a **"Breakdown"** tab containing a
segmented control.

**Segment visibility rules:**

| Segment | Shown when |
|---|---|
| Ringer (individual) | ≥1 non-scramble round with individual scorecards |
| Team Ringer | ≥1 non-scramble round **and** competition has teams |
| Contributions | ≥1 team-format round (best-ball, scramble, shamble, aggregate) |

**Tab visibility:** the Breakdown tab shows if **any** segment is available (i.e. there is
at least one scored round of any kind). This means a scramble-only competition now shows
the tab (Contributions segment only) instead of hiding it.

The default selected segment is the first available in the order above.

## Contribution Metrics Per Format

All formats are computed from the round's existing data and normalized to a
**contribution %** = a player's share of their team's total contribution for that round.
The player(s) with the highest % get the 👑 MVP marker.

### Best Ball — "holes won for the team"

- For each hole, determine which team member's score was the one the team counted, using
  the round's scoring basis: **Stableford points** for stableford rounds, **net score**
  for stroke rounds, **par-game score** for par rounds (mirrors `getGroupHoleScore` in
  `src/utils/teamScoring/calculations.ts`).
- A player's raw contribution = count of holes they won. Contribution % = holes won /
  holes scored by the team.
- **Ties:** when two+ members tie for best on a hole, credit each tied member **0.5**
  (split), rather than the existing engine's "first wins" behavior. This keeps the MVP
  fair and the percentages meaningful. Implemented as a dedicated contributions calc
  (the live-leaderboard `getBestBallHoleContribution` returns a single contributor and is
  left unchanged).
- **Always computable** — no optional input required.

### Scramble — "shots used"

- Source: `HoleScore.shotContributions` (`teeShot`, `secondShot`, `approach`, `putt`),
  stored as `shot_contributions` JSON on the scorecard.
- Raw contribution = number of shot slots attributed to a player across all holes.
  Contribution % = player's shots / total attributed shots.
- Breakdown chips by shot type (drives / approaches / putts), reusing the existing
  `ContributionLeaderboard` + `useContributionData`
  (`src/components/scorecard/ContributionLeaderboard/`).
- **Optional input:** shot contributions are not mandatory to complete a round. If a round
  has no (or partial) shot data, see "Graceful degradation."

### Shamble — composite

- Shamble produces individual scorecards per player **plus** a `teeShot` contribution
  (which drive was used).
- Raw contribution combines two parts, each normalized then averaged:
  1. **Drives used** — count of holes where this player's drive was selected
     (`shotContributions.teeShot`), as a share of holes.
  2. **Holes won** — best-ball-style holes won on own-ball play (same logic as Best Ball).
- Contribution % = average of the two shares. Breakdown shows both ("drives used" +
  "holes won").
- **Partially optional:** the "holes won" half is always computable; the "drives used"
  half depends on `teeShot` being recorded. If drives weren't tracked, fall back to
  holes-won only and note it.

### Aggregate / Team Stableford — "share of points"

- Every member's score always counts toward the team total. Per-player contribution is
  available via `contributedByPlayer` / `contributedScore` in `buildLiveTeamEntries`
  (`src/utils/teamScoring/calculations.ts` ~lines 413–435).
- Raw contribution = player's accumulated points/score. Contribution % = player's points /
  team total points.
- No "carried" story (everyone always contributes), but it still shows who scored most.
- **Always computable.**

## Granularity & Rollup

- **Per-round, grouped by team:** one card per team-format round, each team's members
  ranked by within-team contribution %, with the format-native breakdown.
- **Competition-wide MVP rollup (top):** a team-size-normalized **"pull your weight" index**.
  Each player's per-round within-team share is multiplied by their team size (× number of
  players), so the metric is comparable across teams of different sizes — a player on a
  2-person team and one on a 4-person team are each measured against their own team's equal
  split. A team's per-round indices average to 1.0 by construction. A player's MVP score is
  the mean of these indices across the team rounds they played; highest = Competition MVP (👑).
  - **1.0× = pulled their weight; >1× = carried the team; <1× = carried by teammates.**
  - Displayed as a multiplier (e.g. "1.6×"); rollup bars are scaled relative to the leader.
  - Rounds excluded for missing data (see below) do not count toward any player's average.
  - A player is averaged only over rounds they participated in.
  - Rationale: a raw average of within-team shares would bias the headline toward players on
    smaller teams (who naturally hold a larger share); normalizing removes that bias and
    matches the "pull your weight" intent.

## Graceful Degradation

- **Scramble with no shot data:** the round card shows
  "⚠ Shot contributions weren't tracked for this round — excluded from MVP," and the round
  is omitted from the rollup average.
- **Shamble with no drive data:** fall back to holes-won-only contribution and label it.
- **Partial shot data** (some holes tracked): compute from what exists; optionally note
  coverage (e.g. "tracked on 12 of 18 holes"). v1 may keep this simple and just compute
  from available holes.
- Best Ball / Aggregate never hit these states (always computable).

## UI / Layout

Phone-width, matching the approved mock:

- **Rollup card** (top): themed accent surface, "Competition MVP" label with round count,
  ranked rows of avatar + name + horizontal % bar + % value, 👑 on the leader.
- **Per-round cards:** collapsed by default showing the top contributors; tap to expand
  full team-by-team breakdown. Header shows round label + format; subtitle shows team name
  + metric name. Scramble/shamble rows show shot-type chips.
- **Not-tracked card:** dimmed, with the warning line; no expansion.

Follow project styling rules: `useThemeColors()` for colors, static tokens
(`spacing`, `typography`, `borderRadius`, `shadows`) imported directly,
`TouchableOpacity` for tappable rows (not Paper `Button`). If any of this is presented in
a modal/sheet context, wrap in `<SystemModalTheme>` (not expected here — it's an in-tab
view).

## Data & Computation Architecture

- **New hook** `useCompetitionContributions(competitionId)` (in
  `src/hooks/competitions/`), modeled on `useRingerBoard`:
  - Fetches the competition's rounds, completed/confirmed scorecards per team-format round,
    round holes, and competition teams (`getCompetitionTeams`).
  - Delegates to a **new pure util** `computeContributions(...)` (in
    `src/utils/contributions/`) that returns a typed board: per-round entries (grouped by
    team, per-format metric + breakdown) and the comp-wide rollup.
- **Reuse:**
  - `getGroupHoleScore` / best-ball + aggregate logic in `src/utils/teamScoring/calculations.ts`
    for determining counted scores and per-player accumulation.
  - `ContributionLeaderboard` + `useContributionData` for scramble/shamble shot displays.
  - Stableford points helper (`src/utils/scoring.ts`) / `holeStablefordPoints`.
- **Types** in `src/utils/contributions/types.ts`: `ContributionsBoard`,
  `RoundContribution`, `TeamContribution`, `PlayerContribution`, `ContributionBreakdown`,
  plus a per-format discriminator.

## Testing

- Pure-util tests for `computeContributions` covering each format:
  - Best Ball: holes-won counts, tie-splitting (0.5 each), net vs stableford basis.
  - Scramble: shot-slot counting, breakdown by type, empty/partial shot data.
  - Shamble: composite of drives + holes won; drives-missing fallback.
  - Aggregate: share-of-points sums to 100%.
  - Rollup: averaging across rounds, excluding not-tracked rounds, partial participation.
- Component tests for the Contributions segment: rollup rendering, per-round expand,
  not-tracked state, MVP badge placement.
- Follow the project's TYPES → (no Zod needed, read-only) → util → hook → component → tab
  wiring order. Diff test results against the known Jest baseline (~243 pre-existing
  failures on main).

## Open Questions / Risks

- **Tie handling** chosen as 0.5 split for Best Ball/Shamble — confirm this reads well in
  the UI (a player could show "10.5 holes").
- **Scramble data coverage** is the biggest real-world risk: if groups routinely skip shot
  tracking, the Contributions segment will frequently be empty for scramble. Acceptable for
  v1 (graceful degradation), but worth watching — a future nudge to encourage tracking
  could help.
- **Ringer tab rename** to "Breakdown": confirm the label. Alternatives: keep "Ringer" as
  the tab name with Contributions as a segment, or call the tab "Per-Hole."
