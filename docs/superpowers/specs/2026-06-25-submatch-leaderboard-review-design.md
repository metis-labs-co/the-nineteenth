# Per-Sub-Match Leaderboard for Split Alt Shot (Review Scorecard Screen)

**Date:** 2026-06-25
**Status:** Approved design — ready for implementation plan
**Branch:** `worktree-submatch-leaderboard`

## Problem

When scoring a **split 2v2 Alt Shot (Foursomes)** competition round, the
Review Scorecard screen's **Leaderboard** tab does not show the sub-matches.
A split round (8 players → 2 sub-matches) is a series of pair-vs-pair
handicap-differential matches, but the leaderboard currently collapses each
4-player team into one number.

### Root cause

`ReviewScorecardScreen` chooses one of three leaderboard branches from flags
computed in `useReviewScorecardTabs`:

- `isScramble` → `ScrambleLeaderboardTab`
- `isMatchPlayTeam` (`team_format === 'match-play-team'`) → `MatchPlayLeaderboardTab`
- else → `LeaderboardTabContent` (Team/Individual toggle, only for `best-ball`/`aggregate`)

`isScramble` is defined to **include alt shot**:

```ts
// src/screens/scoring/ReviewScorecardScreen/hooks/useReviewScorecardTabs.ts
const isScramble =
  effectiveGameType === 'scramble' || roundDetails?.team_format === 'scramble'
  || effectiveGameType === 'alt-shot' || roundDetails?.team_format === 'alt-shot';
```

So a split alt-shot round renders `ScrambleLeaderboardTab`, which lumps each
team's 4 players into a single scramble-style team total (best-ball-per-hole) —
neither sub-match-aware nor the correct alt-shot net formula. There is no
per-match view here today.

The **View Round** screen already has a rich per-sub-match display
(`SubMatchCard` + `PairsAggregateHeader` inside `SubMatchesTab.tsx`), but it
reads **saved** scorecards (`useRoundScorecards`) and lives on a different
screen — it cannot show the in-progress scores being entered in the Review
flow.

## Goal

In the Review Scorecard screen's Leaderboard tab, for **split alt shot rounds
only**, replace the (incorrect) scramble team total with **one card per
sub-match**, each showing the two pairs, each pair's live net total, and the
current match status — plus an overall **Team A vs Team B** Ryder-cup point
tally at the top.

### Non-goals

- No change to scramble, best-ball, aggregate, match-play-team, combined alt
  shot, or individual leaderboards.
- No change to how alt-shot scores are entered or stored.
- No change to finalization / saved-result logic.
- Not generalising to all split team formats in this pass (best-ball split
  already aggregates sub-matches into team totals via `LeaderboardTabContent`);
  the new component is alt-shot-split-scoped, though built so it could be
  extended later.

## Scope / Gate

Applies when **all** are true:

- `roundDetails.team_format === 'alt-shot'`
- `roundDetails.round_format === 'split'`
- sub-matches exist for the round (`useSubMatches(roundId)` returns ≥ 1)

A new flag `isSplitAltShot` captures this. Combined alt shot
(`round_format === 'combined'`) and any non-alt-shot round are unaffected.

## Design

### 1. Routing (`ReviewScorecardScreen/index.tsx` + `useReviewScorecardTabs`)

- Add `isSplitAltShot` to the flags returned by `useReviewScorecardTabs`
  (alt-shot + split). Sub-match presence is checked inside the tab (it owns the
  `useSubMatches` query) to keep the hook free of extra fetches; an empty
  sub-match list falls back to an empty state.
- In `index.tsx`, add the leaderboard branch **before** the `isScramble` check
  so it takes precedence:

  ```tsx
  {activeTab === 'leaderboard' && isSplitAltShot && (
    <SubMatchLeaderboardTab ... />
  )}
  {activeTab === 'leaderboard' && !isSplitAltShot && isScramble && ( ... )}
  ```

  (Equivalent: add `&& !isSplitAltShot` to the existing scramble guard.)

### 2. New component: `SubMatchLeaderboardTab`

Location: `src/screens/scoring/ReviewScorecardScreen/components/SubMatchLeaderboardTab.tsx`
(exported from the components `index`).

Props (mirroring the other leaderboard tabs):

- `roundId: string`
- `competitionId?: string | null`
- `holes: Hole[]`
- `getPlayerScore: (playerId, holeNumber) => HoleScore | MultiBallHoleScore | undefined`
- `currentUserId?: string`
- `isRefreshing: boolean`, `onRefresh: () => void`, `bottomInset: number`

Behaviour:

- `useSubMatches(roundId)` for the pair structure; `useRoundTeams(competitionId, true, roundId)`
  for team names + colours (reuse `getTeamColorHex`, `labelForSide` semantics).
- For each sub-match, compute **each pair's live net** from in-progress scores.
- Render: an overall header + one card per sub-match. Loading and empty states
  handled (empty → reuse `EmptyState`).

### 3. Live net computation (consistency-critical)

Both partners in an alt-shot pair store the **identical shared ball score**
(`handleTeamScoreSelect` writes the same strokes to every member's scorecard),
so reading either partner via `getPlayerScore` yields the pair's gross.

To guarantee the live number **matches the finalized result**, reuse the
canonical `computeAltShotTeamRoundScore` (`src/utils/teamScoring/altShot.ts`)
rather than re-deriving a net formula that could drift. Approach: build a
**synthetic `Scorecard`** per pair from the in-progress scores (populate
`player_id`, `daily_handicap_used`/handicap, and a `scores` map assembled by
iterating `holes` and calling `getPlayerScore`), then call
`computeAltShotTeamRoundScore(syntheticScorecards, members)` to get
`{ teamGross, teamNet, holesCompleted, ... }`.

- A pair with no scores yet → treated as "no score" (status shows "Not started"
  / dashes), not net 0.
- Handicap allowance follows the canonical function (50% of combined handicaps,
  floored, capped at 18) — **do not** invent a per-hole allocation here.

The exact shape of the synthetic-scorecard helper (and whether to extract a
shared `computeAltShotPairLiveNet` util) is for the plan to finalise; the
constraint is: **one source of truth for alt-shot net**, reused live and at
finalization.

### 4. Sub-match card + overall header (presentation)

Per the approved mock:

```
┌─ Sub-Match 1 ───────────────┐
│ ● Team A (Sam & Bob)  net 34 │
│ ● Team B (Joe & Tim)  net 36 │
│        Team A leads by 2      │
└──────────────────────────────┘
```

- Each pair row: team colour dot, pair label (`labelForSide` → real team name
  when both players share a team, else "Team A"/"Team B"), and live net.
- Status line: **lower net wins**. "Team A leads by N", "Team B leads by N", or
  "All square". Before any scores: "Not started".
- Overall header (top): **Team A *X* – *Y* Team B**, where each decided
  sub-match awards **1 point to the leading pair, 0.5 each if level** (Ryder-cup
  scoring per the round preset's `pair_points: { win: 1, tie: 0.5, loss: 0 }`).
  Undecided/unstarted sub-matches contribute 0 until they have a net on both
  sides. Visual style follows the existing `PairsAggregateHeader`.

### 5. Reuse vs. new code

`SubMatchCard` and `PairsAggregateHeader` currently live **inside**
`SubMatchesTab.tsx` (not exported) and are wired to saved scorecards.

- **Preferred:** if the presentational card extracts cleanly (props: pair
  labels, dot colours, two net values, status text), lift it into a shared
  component (e.g. `src/components/rounds/SubMatchResultCard.tsx`) consumed by
  both the live tab and `SubMatchesTab`, with the data/handicap logic kept out
  of the presentational layer.
- **Fallback:** if extraction would entangle the saved-scorecard wiring, keep a
  self-contained card inside `SubMatchLeaderboardTab` that reproduces the
  layout, leaving the saved path untouched.

The plan picks one based on how cleanly `SubMatchCard`'s presentation separates
from its `SubMatchesTab` data dependencies. Decoupling the live and saved paths
is the priority.

## Data flow

```
ReviewScorecardScreen
  useScoreReview ──► getPlayerScore (in-progress, zustand scorecardStore)
  useReviewScorecardTabs ──► isSplitAltShot, roundDetails
        │
        ▼ (leaderboard tab, isSplitAltShot)
  SubMatchLeaderboardTab
    useSubMatches(roundId) ─────────► [SubMatch] (pair structure)
    useRoundTeams(compId, roundId) ─► team names + colours
    holes + getPlayerScore ─────────► synthetic Scorecards per pair
        └─► computeAltShotTeamRoundScore ─► per-pair { teamNet, holesCompleted }
    ──► overall Ryder-cup header + per-sub-match cards
```

## Error / edge handling

- **No sub-matches** (mis-seeded round): empty state, no crash.
- **Partial scores:** pairs with no usable score show "Not started"; a
  sub-match contributes 0 to the overall tally until both pairs have a net.
- **Missing team rosters / colours:** fall back to "Team A"/"Team B" labels and
  the legacy success/error dot colours (mirrors `SubMatchCard`).
- **Offline:** reads only in-progress store + already-cached sub-match/team
  queries; no new network dependency on the scoring path. Pull-to-refresh wired
  to `onRefresh` like the other tabs.

## Testing

- **Unit (net/status logic):** given holes + a `getPlayerScore` stub, the
  per-pair net matches `computeAltShotTeamRoundScore` on the equivalent saved
  scorecards; status string resolves correctly (A leads / B leads / all square /
  not started); overall tally awards 1 / 0.5 / 0 correctly across mixed states.
- **Component:** `SubMatchLeaderboardTab` renders one card per sub-match with
  correct labels and nets from a stubbed `getPlayerScore`; empty state when no
  sub-matches.
- **Routing:** a split alt-shot round renders `SubMatchLeaderboardTab`, not
  `ScrambleLeaderboardTab`; combined alt shot still renders the scramble tab;
  scramble/best-ball/match-play unaffected.
- Diff against the known-noisy jest baseline (≈243 pre-existing failures on
  main) rather than expecting a green suite.

## Open items for the plan

1. Extract a shared `SubMatchResultCard` vs. self-contained card (§5).
2. Exact synthetic-scorecard helper shape and whether to add a
   `computeAltShotPairLiveNet` wrapper in `teamScoring` (§3).
3. Whether `isSplitAltShot` also guards the existing scramble branch via
   `&& !isSplitAltShot` or via reordered conditions (§1).
