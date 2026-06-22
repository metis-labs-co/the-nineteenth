# Per-Round Points & Rules Configuration — Design Spec

**Date:** 2026-06-22
**Status:** Approved (design), pending implementation plan
**Author:** Sam (with Claude)

## Motivation

Competitions with `per_round_rules_enabled = true` (e.g. Ryder-cup-style events)
store each round's points in `rounds.rules_override` (JSONB). Today there is **no
in-app UI to view or edit those per-round points after a round is created** — the
only way to change them is hand-editing JSON in the database. There is also **no
concept of a bonus point** anywhere in the scoring system.

The driving real-world case is the prod competition **"Winter Cobram Classic 2026"**
(`56f37146-4b91-4813-8ebf-3a8105eed1c6`), Australia vs England, 2 teams of 4, four
rounds, target 13 points / first to 7:

| Round (DB round_number) | Format | Desired points |
|---|---|---|
| R1 (#2) Team Stableford best 3 of 4 | `stableford` / aggregate | **0** — dinner side-bet, winner shown but no standings points |
| R2 (#4) Foursomes 2v2 alt-shot (2 sub-matches) | `alt-shot` / split | **1 pt/match (×2) + 1 bonus** for highest combined holes-up margin |
| R3 (#5) Team Scramble 4v4 | `scramble` / combined | **2 pts** to winning team (already correct) |
| R4 (#6) Singles match play (4 sub-matches) | `match-play` / split | **2 pts/match (×4) = 8** |

Current prod config yields only 10 points (R1=2, R2=2, R3=2, R4=4). The three gaps:
void R1, double R4, add the R2 bonus.

## Goals

1. Let the organiser view and edit per-round points from the **Competition Detail
   screen** (single source of truth, custom or standard).
2. Support **voiding** a round's points while still computing/showing its winner.
3. Support a **bonus point** for the highest combined holes-up margin across a
   split round's sub-matches.

## Non-goals (YAGNI)

- Editing structural round format post-creation (best-N-of-M, alt-shot, sub-match
  size, game type). Out of scope — risky and unnecessary for these cases.
- A generic bonus-metric framework. The only bonus metric in v1 is
  `combined_match_margin`.

## Design decisions (locked)

- **R1 void semantics:** Show the round winner, award 0 points. Implemented as
  `team_points: {win:0, tie:0, loss:0}` with `contributes_to_team_leaderboard: true`.
- **Bonus metric:** Net holes up — signed sum of each team's `final_differential`
  across the round's sub-matches. Higher net total wins the bonus.
- **Bonus tie:** Split the bonus 0.5 each (mirrors halved-match `tie` points).

## Architecture

### 1. UI — `PointsConfigSection` (Competition Detail → Details tab)

Rendered after the existing `SettingsSection` in
`src/components/competitions/detail/DetailsTab.tsx`. New component under
`src/components/competitions/detail/sections/` (and exported from its `index.ts`).

**Read-only for everyone who can see the competition:**
- Summary header: total points available (sum of each round's max points) and
  "first to N wins" where `N = floor(total/2) + 1`.
- Per-round list, each row plain-English with a **Standard / Custom** badge:
  - R1 — "Dinner bet · 0 points"
  - R2 — "1 pt per match (×2) · +1 bonus: combined margin"
  - R3 — "2 pts to winning team"
  - R4 — "2 pts per match (×4)"
- When `per_round_rules_enabled = false`, show the competition-level `point_system`
  as a read-only info card instead (so the section is always authoritative).

**Organiser only:** each round row is tappable → opens `EditRoundPointsSheet`.

### 2. `EditRoundPointsSheet`

New sheet under `src/components/competitions/detail/sections/sheets/`. Adapts to the
round's points model:

- **Team-points rounds** (stableford, scramble): Win / Tie / Loss number inputs +
  a **"Void points (side bet)"** quick toggle → sets `0/0/0`, keeps the round on
  the leaderboard.
- **Pair-points rounds** (alt-shot, match-play): Win / Tie / Loss **per match**
  inputs.
- **Bonus section** (only for split match-play / alt-shot rounds): toggle
  "Bonus point for combined holes-up margin", points value (default 1), tie handling
  (default `split`).
- Advanced: "Contributes to team leaderboard" toggle.
- "Reset to standard" restores the round's template default from
  `src/constants/roundTemplates.ts`.

### 3. Data model — no DB migration

`rules_override` is already JSONB. Extend the TypeScript type `RoundRulesOverride`
(`src/types/database/roundRules.types.ts`):

```ts
bonus_points?: {
  enabled: boolean;
  metric: 'combined_match_margin'; // only option for v1
  points: number;                  // default 1
  tie: 'split' | 'void' | 'carry'; // default 'split'
};
```

Bonus audit detail (winning team, per-team net margins) is written into the existing
`round_results.raw_result_data` JSONB. **No schema migration required.**

### 4. Mutation + recalculation

- New hook `useUpdateRoundRules(roundId)` (under `src/hooks/rounds/`) → writes
  `rounds.rules_override`; invalidates round detail, competition detail, and
  competition leaderboard queries.
- On save, if the round already has results, re-run the existing
  `refinalizeRoundResults()` so points update immediately. That path is already
  idempotent (it backs the existing "Recalculate Results" action on
  `RoundSettingsScreen`).

### 5. Bonus computation — `finalizePairResults()`

In `src/services/rounds/finalizePairResults.ts`, after pair points accumulate, if
`rules_override.bonus_points?.enabled`:

1. Sum each team's **signed** `final_differential` across the round's sub-matches
   (net holes up; positive = side A ahead).
2. Higher net → award `points`; exact tie → apply `tie` rule (default split 0.5).
3. Add the award to that team's `competition_points`; write `{ bonus, team_margins }`
   into `raw_result_data`.

The competition leaderboard already sums `competition_points`
(`src/utils/competitionPoints/aggregation.ts`), so the bonus flows through with **no
leaderboard changes**.

### 6. Access & gating

- **Viewing** the info sheet: anyone who can see the competition.
- **Editing**: organiser only, gated behind the existing `advanced_round_rules`
  Premium feature (super admin bypasses) — consistent with current per-round rules
  treatment. Saved overrides always apply even after a downgrade.

## Known implementation risk

Live-computed sub-match outcomes (when `sub_matches.result` /
`final_differential` are not persisted) currently return only win/loss/halved, not
the signed margin. The bonus needs the signed differential, so finalization must
thread `final_differential` through the live-compute path
(`resolveAltShotSubMatchOutcome` / `resolveSubMatchOutcomeFromScores` in
`finalizePairResults.ts`). Low risk but it is the one place with real new logic
beyond plumbing.

## Suggested build order

1. `PointsConfigSection` read-only view (info sheet for standard + custom).
2. `EditRoundPointsSheet` + `useUpdateRoundRules` + recalculation — solves **R1 void**
   and **R4 doubling**.
3. `bonus_points` type + bonus UI + `finalizePairResults` computation — solves **R2 bonus**.

## Applying to the live prod competition

Once shipped, the organiser fixes Winter Cobram Classic 2026 entirely through the app:
void R1, set R4 pair_points win to 2, enable the R2 bonus. No manual DB edits.

## Relevant existing code (reference)

- Detail screen / tabs: `src/screens/competitions/CompetitionDetailScreen/index.tsx`,
  `src/components/competitions/detail/DetailsTab.tsx`,
  `src/components/competitions/detail/sections/SettingsSection.tsx`
- Types: `src/types/database/roundRules.types.ts`,
  `src/types/database/competition.types.ts`, `src/types/database/round.types.ts`
- Templates: `src/constants/roundTemplates.ts`
- Finalization: `src/services/rounds/refinalizeRoundResults.ts`,
  `finalizePairResults.ts`, `finalizeTeamMatchPlayRound.ts`, `finalizeTeamResults.ts`,
  `roundResultsService.ts`
- Leaderboard aggregation: `src/hooks/competitions/leaderboard.ts`,
  `src/utils/competitionPoints/aggregation.ts`
- Sub-match schema: `supabase/migrations/20260422100000_round_sub_matches.sql`
- Margin calc: `src/utils/teamScoring/matchPlay.ts`
