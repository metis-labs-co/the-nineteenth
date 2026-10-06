# Team (Four-Ball Best-Ball) Match Play — Relative-to-Lowest Handicap Allocation

**Date:** 2026-07-03
**Status:** Approved (design)
**Scope:** Four-ball best-ball match play only. Foursomes/alt-shot is out of scope (separate combined-handicap model; does not route through the team match-play scorer).
**Follow-up to:** `2026-07-02-match-play-difference-handicaps-design.md` (singles match play).

## Problem

Four-ball best-ball match play is the only format that routes through `TeamMatchPlayScoringScreen` (`game_type = 'match-play'` + a team config with ≥2 teams; routing in `src/services/rounds/roundSession.ts:248-280`). Today it allocates strokes off **each player's own full playing handicap** and takes each team's **best net** ball:

- Live scoring: `src/screens/scoring/TeamMatchPlayScoringScreen/hooks/useTeamMatchPlayScores.ts` — `findBestNetContributor` calls `getStrokesReceived(member.handicap, hole.strokeIndex)`; per-player stroke dots via `getPlayerStrokesReceivedForHole`.
- Scorecard table: `src/components/scorecard/TeamMatchPlayScorecardTable/utils.ts` — `findBestContributor` calls `getStrokesReceived(member.handicap, hole.strokeIndex)` (a second, independent copy of the same net-best-ball rule).
- Finalize + leaderboards: `src/services/rounds/finalizeTeamMatchPlayRound.ts` and `src/screens/scoring/ReviewScorecardScreen/utils/subMatchLeaderboard.ts` — same rule using each scorecard's stored `daily_handicap_used`.

Allocating off each player's full handicap is not the standard four-ball convention and is inconsistent with the singles path, which now allocates relative to the lower player (difference method). It over-allocates strokes: the lowest-handicap player still receives strokes rather than playing off scratch.

## Decision

Standardise four-ball best-ball match play on **relative-to-lowest** allocation, the four-ball analog of the singles difference method:

Among **all players in the match** (both teams), the lowest playing handicap plays off scratch. Every other player receives `getStrokesReceived(playerHandicap − lowestHandicap, strokeIndex)` — their difference from the lowest, allocated by stroke index. Then, unchanged, each team's **best net** ball (gross − strokesReceived) wins the hole; ties are halved. The hole-winner and match-status logic are untouched.

**Allowance:** unchanged at **100%** of daily handicap. The screen continues to compute playing handicaps with `gameType: 'match-play'` (`getHandicapAllowance('match-play') → 1.0`). This is an allocation-only change; the 85% `best-ball` allowance is deliberately **not** applied.

**Stroke index:** the regular per-hole `strokeIndex` (no match-play index exists in our course data).

**Reference set:** the lowest handicap is taken across **all players in the match** — both teams — not per team. For split sub-matches the match is the sub-match's two sides (`activeSubMatch.team_a_player_ids` / `team_b_player_ids`). The lowest is constant across holes for a given match.

## Design

### Single source of truth

A team analog of the singles `getMatchPlayStrokes`, added to `src/utils/scoring.ts` (co-located with `getStrokesReceived` / `getMatchPlayStrokes`):

```ts
/**
 * Four-ball match-play per-hole stroke allocation (relative-to-lowest method).
 * Among all players in the match, the lowest playing handicap plays off
 * scratch; every other player receives the difference from that lowest
 * handicap, allocated by stroke index. Uses the regular per-hole stroke index.
 * @returns strokes received on the hole, keyed by playerId.
 */
export function getFourBallStrokes(
  players: { playerId: string; handicap: number }[],
  strokeIndex: number
): Map<string, number> {
  const result = new Map<string, number>();
  if (players.length === 0) return result;
  const lowest = Math.min(...players.map((p) => p.handicap));
  for (const p of players) {
    result.set(p.playerId, getStrokesReceived(p.handicap - lowest, strokeIndex));
  }
  return result;
}
```

Notes:
- Built on the existing `getStrokesReceived` (which already guards `handicap ≤ 0 → 0`, so the lowest player and any tie for lowest yield 0).
- The caller assembles the players list from **both** teams' members with their playing handicaps, and calls once per hole (or precomputes the lowest once and calls per player — an implementation detail pinned in the plan; the rule lives in this one function).

### Consistency property (degeneracy to singles)

For a match with exactly two players (one per side — e.g. split Ryder-cup singles routed through this screen), relative-to-lowest reduces to: the lower handicap → 0, the higher → `getStrokesReceived(high − low, si)`. This is byte-identical to the singles `getMatchPlayStrokes` result. The plan will include a test asserting this equivalence so team and singles cannot drift.

### Call-site changes (all currently use each player's full handicap)

1. **`useTeamMatchPlayScores.ts`** — `findBestNetContributor` and `getPlayerStrokesReceivedForHole` compute per-player strokes via `getFourBallStrokes` over both teams' members instead of `getStrokesReceived(member.handicap, …)`. Best-net comparison and `resolveTeamHoleWinner` / `determineTeamHoleWinner` unchanged.
2. **`TeamMatchPlayScorecardTable/utils.ts`** — `findBestContributor` / `calculateTeamMatchData` use `getFourBallStrokes` over both teams' members. `determineHoleWinner` unchanged.
3. **`finalizeTeamMatchPlayRound.ts`** and the **team four-ball match-play read path in `subMatchLeaderboard.ts`** — build the players list from both sides' `daily_handicap_used` and allocate via `getFourBallStrokes`. Net best-ball result / margin logic unchanged. (The plan will pin the exact function/branch in `subMatchLeaderboard.ts` that serves four-ball match play, distinct from the alt-shot/aggregate branches which stay out of scope.)

### Data flow (unchanged shape)

playing/daily handicap (100% allowance) → `getFourBallStrokes(allMatchPlayers, strokeIndex)` → per-player strokes → net = gross − strokes → team best net → hole winner → match status. Same for live scoring, scorecard display, and finalize/leaderboard.

## User-visible change

On `TeamScorePanel` (and the scorecard table), the **lowest-handicap player in the match now shows no stroke dots**; the other players show only their difference from the lowest. Team totals and the winner/match-status displays are otherwise unchanged.

## Error handling / edge cases

- One player is the sole lowest → that player 0; others by difference.
- Tie for lowest handicap → all tied-lowest players 0 (`getStrokesReceived` guard on a 0/negative difference).
- Difference > 18 → base `floor(diff/18)` stroke on every hole plus a second stroke on the lowest-SI holes (handled by the primitive).
- Missing/absent player handicap → treated as it is today (member excluded / no score); `getFourBallStrokes` only receives players that are actually in the match. Pickups/concessions are unchanged (handled outside allocation).
- Empty players list → empty map (no crash).

## Testing

Unit tests on `getFourBallStrokes`:
- Lowest player → 0; others → `getStrokesReceived(diff, si)` on the correct SI holes.
- Tie for lowest → both 0.
- Difference > 18 → second stroke on lowest-SI holes for the affected player.
- Two-player match → equivalent to `getMatchPlayStrokes` (degeneracy to singles) for a range of handicaps/stroke indexes.
- Empty list → empty map.

Parity/regression test: for a representative four-ball match, assert the **live hook path** (`useTeamMatchPlayScores` allocation) and the **scorecard-table path** (`calculateTeamMatchData`) produce identical per-hole winners under the new method, and that a chosen divergence case (where full-handicap best-net and relative best-net disagree) resolves to the relative-method winner.

Baseline note: the Jest suite has ~243 pre-existing failures on `main`; new/changed tests are evaluated as a diff against that baseline.

## Out of scope (follow-up / unchanged)

- Foursomes / alt-shot (`teamScoring/altShot.ts`, the alt-shot/aggregate branches of `subMatchLeaderboard.ts`) — separate combined-handicap model, not match play.
- The dead `src/utils/teamScoring/matchPlay.ts` helpers are not consumed by the team path; leave them unless a task naturally removes them.
- Collapsing the two duplicate best-ball implementations (`findBestNetContributor` vs `findBestContributor`) into a single shared function beyond sharing `getFourBallStrokes` — larger refactor, not required here.
