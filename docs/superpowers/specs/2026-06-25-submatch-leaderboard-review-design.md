# Per-Match Leaderboard for Sub-Match Rounds (Review Scorecard Screen)

**Date:** 2026-06-25
**Status:** Approved design — ready for implementation plan
**Branch:** `worktree-submatch-leaderboard`

## Problem

When scoring a round that is split into multiple **sub-matches**, the Review
Scorecard screen's **Leaderboard** tab does not show those matches. Depending on
the round type it shows the wrong thing or a collapsed aggregate:

- **Split 2v2 Alt Shot** (`team_format='alt-shot'`, `round_format='split'`) trips
  the `isScramble` flag and renders `ScrambleLeaderboardTab` — one wrong
  scramble-style team total, no sub-match awareness.
- **Singles Match Play** (`individual_match_play`: `game_type='match-play'`,
  `is_team_round=false`, `round_format='split'`, `sub_match_size=1`) falls through
  to `LeaderboardTabContent` and shows a plain **individual stroke leaderboard** —
  no match status at all.
- **Ryder-Cup Singles** (`ryder_cup_singles`: `team_format='match-play-team'`,
  `round_format='split'`, `sub_match_size=1`) trips `isMatchPlayTeam` and renders
  `MatchPlayLeaderboardTab`, which treats the round as **one combined
  team-vs-team match** (best contributor per hole) and ignores the per-player 1v1
  sub-matches entirely.
- **Best-ball / aggregate splits** render `LeaderboardTabContent`, which sums all
  sub-matches into a single team total (no per-match breakdown).

The **View Round** screen already has a rich per-sub-match display
(`SubMatchCard` + `PairsAggregateHeader` inside `SubMatchesTab.tsx`), but it reads
**saved** scorecards (`useRoundScorecards`) on a different screen — it can't show
the in-progress scores being entered in the Review flow.

### Routing today (`ReviewScorecardScreen/index.tsx` + `useReviewScorecardTabs`)

```
isScramble      → ScrambleLeaderboardTab      (includes alt-shot)
isMatchPlayTeam → MatchPlayLeaderboardTab     (team_format === 'match-play-team')
else            → LeaderboardTabContent       (Team/Individual; toggle only for best-ball/aggregate)
```

## Goal

For **any round that has sub-matches**, the Leaderboard tab shows **one row/card
per sub-match**, with the card style forking by **scoring model**:

- **Match-play sub-matches** (`game_type='match-play'`) → a **centered
  match-play row**: player/side names flanking a big bold status, leader-coloured.
- **Net / points sub-matches** (alt shot, aggregate, best-ball) → a **pair card**
  showing each pair's net (or stableford points) with a "Team A leads by N" line.

Plus, for team/competition rounds with multiple sub-matches, an **overall
Team A vs Team B header** tallying Ryder-cup points (1 / 0.5 / 0 per decided
sub-match).

### Confirmed decisions

- **Match-play row:** names flank a big bold **centered** status; in-progress
  shows `X UP` / `A/S`; a completed match shows the final golf margin (e.g.
  `3&2`). Status is coloured by the **leading side's team colour** (neutral when
  all square). Left name = `team_a` side, right name = `team_b` side.
- **Scope = rounds with sub-matches only.** Combined Team Match Play
  (`match-play-team`, `round_format='combined'`, no sub-matches), scramble,
  combined alt shot, and individual leaderboards are **untouched**.
- **Net/points cards** apply to all non-match-play splits: alt shot & aggregate
  show net totals ("leads by N"); best-ball shows stableford points
  ("leads by N pts").

### Non-goals

- No change to how scores are entered/stored, or to finalization logic.
- No change to combined Team Match Play, scramble, combined alt shot, or
  individual stroke/stableford leaderboards.
- No new Individual-view toggle inside the per-match tab (possible later
  enhancement; see Open items).

## Round taxonomy (in scope)

| Round | game_type | team_format | round_format | sub_match_size | Sub-match sides | Card style |
|-------|-----------|-------------|--------------|----------------|-----------------|-----------|
| Singles Match Play | match-play | null | split | 1 | 1 vs 1 | match-play row |
| Ryder-Cup Singles | match-play | match-play-team | split | 1 | 1 vs 1 | match-play row + overall |
| Split 2v2 Alt Shot | alt-shot | alt-shot | split | 2 | pair vs pair | net card + overall |
| Best-ball split | (stroke/stableford) | best-ball | split | 2 | pair vs pair | points card + overall |
| Aggregate split | (stroke) | aggregate | split | 2 | pair vs pair | net card + overall |

**Out of scope (unchanged):** combined Team Match Play, scramble, combined alt
shot, individual stroke/stableford/par.

## Scope gate

A round is "sub-match scored" when `roundDetails.round_format === 'split'`. The
new tab owns the `useSubMatches(roundId)` query; if it returns zero sub-matches
(mis-seeded round) it shows an empty state rather than crashing.

A new flag `isSubMatchRound` (= `round_format === 'split'`) is added to
`useReviewScorecardTabs` and routes to the new tab **ahead of** the `isScramble`
and `isMatchPlayTeam` branches so it wins for split alt shot and Ryder-Cup
singles:

```tsx
{activeTab === 'leaderboard' && isSubMatchRound && (
  <SubMatchLeaderboardTab ... />
)}
{activeTab === 'leaderboard' && !isSubMatchRound && isScramble && ( ... )}
{activeTab === 'leaderboard' && !isSubMatchRound && !isScramble && isMatchPlayTeam && ( ... )}
{activeTab === 'leaderboard' && !isSubMatchRound && !isScramble && !isMatchPlayTeam && ( ... )}
```

## Design

### 1. `SubMatchLeaderboardTab` (new)

Location: `src/screens/scoring/ReviewScorecardScreen/components/SubMatchLeaderboardTab.tsx`
(exported from the components `index`).

Props (mirroring the other leaderboard tabs):

- `roundId: string`, `competitionId?: string | null`
- `gameType: GameType`, `teamFormat?: TeamFormat | null`
- `holes: Hole[]`
- `getPlayerScore: (playerId, holeNumber) => HoleScore | MultiBallHoleScore | undefined`
- `selectedTeeData`, `handicapSource` (needed to compute per-player net / strokes
  received for match-play and net cards — same inputs the scorecard tabs use)
- `currentUserId?: string`
- `isRefreshing`, `onRefresh`, `bottomInset`

Behaviour:

1. `useSubMatches(roundId)` → ordered `SubMatch[]` (the match structure).
2. `useRoundTeams(competitionId, true, roundId)` → team names + colours
   (`teamColorByPlayer`, `labelForSide` semantics reused from `SubMatchesTab`).
3. Determine **scoring model** from `gameType`/`teamFormat`:
   `match-play` → match-play rows; `alt-shot`/`aggregate` → net cards; `best-ball`
   → points cards.
4. Render: optional overall header (when ≥2 teams) + one item per sub-match.
5. Loading + empty states (reuse `GolfBallLoader`, `EmptyState`).

### 2. Per-sub-match computation (one source of truth per model)

All numbers are computed **live** from in-progress `getPlayerScore`, but each
model **reuses the canonical util** so the live value matches the finalized
result (no parallel formulas that can drift).

- **Match play** (`determineHoleWinner` + `calculateMatchStatus`, or
  `calculateTeamMatchData` with single-member sides — plan picks the cleanest):
  for each hole compare the two sides' **net** strokes (using
  `getStrokesReceived(playerHandicap, hole.strokeIndex)`); accumulate
  up/down; produce `{ leader: 'a'|'b'|null, holesUp, statusText, isComplete,
  margin }`. `statusText` = `A/S` when level, `N UP` in progress, golf margin
  (`3&2`, `2 UP`) when mathematically decided/complete.
- **Alt shot net** (`computeAltShotTeamRoundScore`): build a synthetic
  `Scorecard` per pair from in-progress scores (both partners hold the identical
  shared ball score; read one per pair) and call the canonical function →
  `{ teamNet, holesCompleted }`. 50%-combined handicap, floored, capped at 18 —
  no per-hole reinvention. Lower net wins.
- **Aggregate net:** sum of each pair member's net total (reuse the
  `netTotalByPlayer` approach from `SubMatchesTab`). Lower wins.
- **Best-ball points:** sum of best stableford points per hole per side (reuse
  the `computeBestForSide` logic from `SubMatchesTab.bestBallData`). Higher wins.

A side with no usable scores yet → "not started" (dashes), contributes nothing to
the overall tally.

### 3. Match-play row (presentation)

```
  Sam  ●        2 UP        ●  Bob      (2 UP in Sam's team colour)
  Joe  ●        A/S         ●  Tim      (neutral)
  Amy  ●        3&2         ●  Lee      (final — Amy's team colour)
```

- Left name = `team_a_player_ids` side; right = `team_b_player_ids` side
  (joined names for the rare multi-player match-play side).
- Center: big, bold status. In-progress `N UP`/`A/S`; completed → final margin.
- Colour: leading side's team colour (`teamColorByPlayer`, fallback to two fixed
  accents — `colors.primary` / `colors.error` — for standalone singles with no
  teams). All-square → neutral `textSecondary`.
- "You" affordance: the current user's name is emphasised if present on a side.

### 4. Net / points pair card (presentation)

Per the approved mock (carried from the original alt-shot design):

```
┌─ Sub-Match 1 ───────────────┐
│ ● Team A (Sam & Bob)  net 34 │
│ ● Team B (Joe & Tim)  net 36 │
│        Team A leads by 2      │
└──────────────────────────────┘
```

- Pair row: team colour dot, pair label (`labelForSide` → real team name when
  both share a team, else "Team A"/"Team B"), and live net (or `N pts` for
  best-ball).
- Status line: lower net (or higher points) wins → "Team A leads by N" /
  "All square" / "Not started".

### 5. Overall header (team rounds)

Shown when `useRoundTeams` yields ≥2 teams (i.e. competition/team rounds;
standalone 2-player singles has none → header omitted).

- **Team A *X* – *Y* Team B**, each decided sub-match awarding **1 to the leader,
  0.5 each if level** (Ryder-cup, per the presets' `pair_points`/no-points
  rules). Undecided/unstarted sub-matches contribute 0.
- Visual style follows the existing `PairsAggregateHeader`.

### 6. Reuse vs. new code

`SubMatchCard`, `PairsAggregateHeader`, `labelForSide`, `formatStatus`,
`resultToColor` live **inside** `SubMatchesTab.tsx` (not exported) and are wired
to saved scorecards. Two presentational pieces are worth extracting into shared
components consumed by both the live tab and `SubMatchesTab`:

- `SubMatchNetCard` (net/points pair card) — preferred extraction from
  `SubMatchCard`'s presentation, leaving data/handicap logic out of the view.
- `MatchPlayMatchRow` (centered match-play row) — new; no clean equivalent today
  (the closest is `MatchPlayLeaderboard`, which is team-aggregate-shaped).

If extracting `SubMatchCard` cleanly would entangle the saved-scorecard wiring,
fall back to self-contained components inside `SubMatchLeaderboardTab` that
reproduce the layout, keeping the live and saved paths decoupled. The plan
decides per the actual coupling. Decoupling is the priority over DRY.

The **canonical computation utils** (`computeAltShotTeamRoundScore`,
`calculateMatchStatus`/`determineHoleWinner`/`calculateTeamMatchData`,
stableford/best-ball helpers, `getStrokesReceived`, `getTeamColorHex`) are reused
as-is — not reimplemented.

## Data flow

```
ReviewScorecardScreen
  useScoreReview ──► getPlayerScore (in-progress, zustand scorecardStore)
  useReviewScorecardTabs ──► isSubMatchRound, gameType, teamFormat, roundDetails
        │
        ▼ (leaderboard tab, isSubMatchRound)
  SubMatchLeaderboardTab
    useSubMatches(roundId) ─────────► [SubMatch] (match structure)
    useRoundTeams(compId, roundId) ─► team names + colours
    holes + getPlayerScore + tee/handicap
        ├─ match-play model ─► calculateMatchStatus  ─► MatchPlayMatchRow
        ├─ alt-shot/aggregate ─► net per pair        ─► SubMatchNetCard
        └─ best-ball ─► stableford points per side    ─► SubMatchNetCard (pts)
    ──► optional overall Ryder-cup header + per-sub-match items
```

## Error / edge handling

- **No sub-matches** on a split round: empty state, no crash.
- **Partial / no scores:** sides show "not started"; sub-match contributes 0 to
  the overall tally until decided.
- **Missing team rosters / colours:** fall back to "Team A"/"Team B" labels and
  fixed accent colours (mirrors `SubMatchCard`); standalone singles render fine
  without teams.
- **Offline:** reads only the in-progress store + already-cached
  sub-match/team queries; no new network dependency on the scoring path.
  Pull-to-refresh wired to `onRefresh`.
- **Multi-player match-play side** (defensive): join names; status logic unchanged.

## Testing

- **Unit — match-play status:** given holes + a `getPlayerScore` stub, status
  resolves to `A/S` / `N UP` / final margin correctly and matches the canonical
  match-play util; leader side is right; completed detection (dormie / decided)
  matches.
- **Unit — net/points:** per-pair alt-shot net matches
  `computeAltShotTeamRoundScore` on equivalent saved scorecards; aggregate sums
  pair nets; best-ball sums best stableford per hole; "leads by N" sign correct.
- **Unit — overall tally:** awards 1 / 0.5 / 0 across mixed decided/undecided
  sub-matches; omitted when <2 teams.
- **Component:** `SubMatchLeaderboardTab` renders one item per sub-match with the
  correct style per model (match-play row vs net card), correct labels/colours
  from stubs; empty state when no sub-matches.
- **Routing:** split alt shot → new tab (not scramble); singles match play → new
  tab (not individual leaderboard); Ryder-cup singles → new tab (not the combined
  MatchPlayLeaderboardTab); combined team match play / scramble / combined alt
  shot / individual all unchanged.
- Diff against the known-noisy jest baseline (≈243 pre-existing failures on main)
  rather than expecting a green suite.

## Open items for the plan

1. Match-play computation: reuse `calculateTeamMatchData` with single-member
   sides vs. `determineHoleWinner` + `calculateMatchStatus` directly — pick the
   path that best matches the saved/finalized result.
2. Extract shared `SubMatchNetCard` from `SubMatchCard` vs. self-contained card
   (§6), based on actual coupling to `SubMatchesTab`.
3. Synthetic-scorecard helper shape for alt-shot live net; whether to add a
   `computeAltShotPairLiveNet` wrapper in `teamScoring`.
4. Whether `isSubMatchRound` guards the older branches via reordered conditions
   or explicit `&& !isSubMatchRound` (§ scope gate).
5. Possible future: an Individual-net view toggle inside the per-match tab
   (deferred; not in this pass).
