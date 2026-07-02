# Match Play — Unify on Difference-Handicap Allocation (Method B)

**Date:** 2026-07-02
**Status:** Approved (design)
**Scope:** Singles match play only. Team match play (four-ball / foursomes) is out of scope, flagged as a follow-up.

## Problem

Singles match play has **two divergent implementations** of per-hole handicap-stroke allocation that can disagree on who wins a hole:

- **Method A — full handicaps, compare net.** Each player receives strokes off their *own* full playing handicap; net scores are compared per hole. Drives the **live scoring status and the scorecard the player sees**.
  - `src/hooks/scorecard/useMatchPlayScoring.ts:150`
  - `src/components/scorecard/MatchPlayScorecardTable/utils.ts:57`
- **Method B — difference handicaps, lower plays off scratch.** Only the difference between the two handicaps is allocated, entirely to the higher-handicap player, on the receiver's lowest stroke-index holes. Lower-handicap player gets 0 shots. Drives the **`MatchPlayEngine` result and the round-list summary pill**.
  - `src/services/scoring/engines/MatchPlayEngine.ts:153`
  - `src/screens/rounds/RoundListScreen/hooks/useRoundList.ts:896`

These diverge because `getStrokesReceived(A, si) - getStrokesReceived(B, si)` is not always equal to `getStrokesReceived(A - B, si)` (they differ when handicaps are large or straddle the 18-hole boundary). The result: the shots shown on a player's live scorecard can imply a different hole winner than the final "3&2"-style result computed by the engine.

## Decision

Standardise on **Method B** (difference handicaps, lower plays off scratch) — the traditional, correct match-play convention. The live scoring path (currently Method A) changes to match the engine.

**Stroke index:** use the regular per-hole `strokeIndex`. A `match_play_indexes` field is scaffolded in the schema/types but is never populated — GolfAPI.io does not provide it (`golfApiTransformers.ts:346` hard-codes `null`) and no code reads it. No match-play-specific index is available, so SI is correct and unchanged.

**Allowance:** unchanged. Match play uses 100% of the daily handicap (`getHandicapAllowance('match-play') → 1.0`). Handicaps remain pre-rounded to integers upstream.

## Design

### Single source of truth

Extract the Method B per-hole allocation into one helper so the four call sites cannot drift again.

Proposed location: alongside the existing primitive in `src/utils/scoring.ts` (co-located with `getStrokesReceived`), or a small dedicated module if that file is already large — decided at implementation time following the surrounding conventions.

```ts
/**
 * Match-play per-hole stroke allocation (difference method).
 * Lower-handicap player plays off scratch; the higher-handicap player
 * receives the whole handicap difference, allocated by stroke index.
 * Uses the regular per-hole stroke index (no match-play index is available).
 */
export function getMatchPlayStrokes(
  handicapA: number,
  handicapB: number,
  strokeIndex: number
): { a: number; b: number } {
  const diff = Math.abs(handicapA - handicapB);
  const strokes = getStrokesReceived(diff, strokeIndex); // existing primitive
  if (handicapA > handicapB) return { a: strokes, b: 0 };
  if (handicapB > handicapA) return { a: 0, b: strokes };
  return { a: 0, b: 0 };
}
```

### Call-site changes

1. **`src/hooks/scorecard/useMatchPlayScoring.ts:150`** — replace the two independent `getStrokesReceived(playerHandicap, si)` calls with a single `getMatchPlayStrokes(p1, p2, si)` call; compute net from the returned per-player strokes; keep the existing `determineHoleWinner` comparison.
2. **`src/components/scorecard/MatchPlayScorecardTable/utils.ts:57`** — same substitution so the rendered scorecard (net scores and shot dots) reflects Method B.
3. **`src/services/scoring/engines/MatchPlayEngine.ts:153`** — refactor to call `getMatchPlayStrokes` (behaviour unchanged; dedupe only).
4. **`src/screens/rounds/RoundListScreen/hooks/useRoundList.ts:896`** (`computeMatchPlayResult`) — refactor to call `getMatchPlayStrokes` using each scorecard's persisted `daily_handicap_used` (behaviour unchanged; dedupe only).

### Data flow (unchanged shape)

playing/daily handicap (100% allowance, rounded) → `getMatchPlayStrokes(hcpA, hcpB, strokeIndex)` → per-player strokes on the hole → net = gross − strokes → `determineHoleWinner` / match status. Same for live scoring, scorecard display, engine, and round-list result.

### Post-implementation note (5th call site found in review)

The final whole-branch review found a fifth call site the plan missed: the live scoring **screen** `src/screens/scoring/MatchPlayScoringScreen/index.tsx` renders its own per-hole "+N SHOTS" figure. Two defects there: it used the old full-handicap method for the shots, and it fed the `useMatchPlayScoring` hook **raw** handicaps while every other path uses the **playing/daily** handicap. Fixed together — the playing-handicap computation was moved above the hook so both the hook (hole winners / match status) and the shots display use the same playing handicaps via `getMatchPlayStrokes`. This also aligns the live match status with the engine/scorecard/round-list, which all use playing/daily handicaps.

## User-visible change

On a player's live scorecard and post-round scorecard, the **lower-handicap player now shows no shots**; only the handicap *difference* is dotted onto the higher-handicap player's lowest-SI holes. Hole winners shown live now always agree with the final result chip.

## Error handling / edge cases

- Equal handicaps → 0/0 (no shots either side). The `getStrokesReceived` guard is applied to the *difference*, so it zeroes only when the difference is 0 (equal handicaps). Two plus-handicap (negative) players with a difference still allocate correctly to the higher (less-minus) player.
- Difference exactly 0 → 0/0.
- Difference > 18 → base `floor(diff/18)` stroke on every hole plus a second stroke on the lowest-SI holes, handled by the existing primitive.
- Missing score on a hole → winner is `null`/unresolved, as today (`determineHoleWinner` unchanged).

## Testing

Unit tests on `getMatchPlayStrokes`:
- Equal handicaps → `{ a: 0, b: 0 }`.
- A > B by n (n ≤ 18) → A receives 1 shot on each of the n lowest-SI holes, B receives 0; symmetric when B > A.
- Difference > 18 → 2 shots on the lowest-SI holes, 1 elsewhere; lower player always 0.
- Handicap ≤ 0 inputs → 0/0.

Regression test: for a representative scorecard, assert the **live path** (`useMatchPlayScoring` / scorecard utils) and the **engine** (`MatchPlayEngine`) now produce identical per-hole winners and the same overall result. This test is the guard against the two paths drifting again.

Baseline note: the Jest suite has ~243 pre-existing failures on `main`; new/changed tests are evaluated as a diff against that baseline.

## Out of scope (follow-up)

Team match play (four-ball / foursomes) also uses full-handicap net comparison today (`src/utils/teamScoring/matchPlay.ts:256`, `calculateMatchPlayHoleResultWithHandicaps`). Unifying it is a separate piece of work because team formats use format-specific conventions (four-ball typically allocates relative to the lowest handicap in the group; foursomes uses combined/half handicaps) rather than a two-player difference. Tracked as a follow-up, not changed here.
