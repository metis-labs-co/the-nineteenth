# Alt-Shot Stroke-Play Holes-Up Bonus — Design Spec

**Date:** 2026-06-22
**Status:** Approved (design), pending implementation plan
**Author:** Sam (with Claude)
**Follow-up to:** `2026-06-22-per-round-points-and-rules-config-design.md`

## Motivation

The per-round Points & Rules feature added a bonus point for the highest **combined
holes-up margin** across a split round's sub-matches. Its implementation reads
`sub_matches.final_differential`, which is populated **only** when sub-matches are
scored as hole-by-hole match play (the `TeamMatchPlayScoringScreen` path).

The driving competition's R2 ("Winter Cobram Classic 2026", foursomes) will be scored
as **alt-shot stroke play**, which never persists `final_differential` (it stays
`null`) — the sub-match result is decided by total net strokes. So today the bonus
contributes 0 for that round. This spec adds a holes-up margin derived from the
alt-shot stroke-play scores so the bonus works for it.

## Goal

Compute a per-round **combined holes-up margin** for alt-shot stroke-play sub-matches
(from the same one-ball scores) and feed it into the existing bonus, without changing
how the 1-pt-per-match result is decided.

## Non-goals (YAGNI)

- No change to the alt-shot match result (1 pt) — it stays decided by total net
  strokes (existing `resolveAltShotSubMatchOutcome`).
- No UI change (the bonus toggle already exists), no type change, no DB migration.
- No new bonus metric — this still serves the single `combined_match_margin` metric.
- The singles / true match-play bonus path (reads `final_differential`) is untouched.

## Design decisions (locked)

- **Bonus metric = per-hole holes-up.** Derive a match-play view from the alt-shot
  one-ball net scores: per hole the lower net wins the hole, equal halves; margin =
  (holes side A won − holes side B won), signed from side A's perspective.
- **Handicap basis = the existing alt-shot model.** Side handicaps via
  `calculateAltShotTeamHandicap` (50%-combined). The **rounded** difference is
  allocated to the higher-handicap side **per hole by stroke index** via
  `getStrokesReceived(diff, hole.strokeIndex)` — consistent with the stroke-play
  result's handicap basis, just allocated per hole instead of to the round total.
- **Combined margin / ties** unchanged from the existing bonus: signed margins sum
  across the round's sub-matches; higher net wins; exact tie → split (per the
  round's `bonus_points.tie`, default `split`).

## Architecture

### 1. Pure helper — `computeAltShotHolesUpMargin`

In `src/services/rounds/pairPointsCalculation.ts` (beside `resolveAltShotSubMatchOutcome`):

```ts
computeAltShotHolesUpMargin(params: {
  teamAPlayerIds: string[];
  teamBPlayerIds: string[];
  holes: Hole[];
  getGross: (playerId: string, hole: Hole) => number | null;
  dailyHandicaps: Map<string, number>;
}): number | null
```

- One-ball gross per side per hole (first partner with a recorded gross — same rule as
  the existing `sideOneBallGross`).
- `aHc`/`bHc` = `calculateAltShotTeamHandicap` for each side; `diff = Math.round(Math.abs(aHc - bHc))`;
  the higher-handicap side receives `getStrokesReceived(diff, hole.strokeIndex)` strokes
  on each hole, subtracted from its gross to get net.
- Per hole with both sides having a usable gross: lower net wins (+1 to that side),
  equal halves (0). Holes where either side has no gross are skipped.
- Returns `holesWonA − holesWonB` (signed, + = A ahead), or `null` if no hole was
  comparable (incomplete round → no bonus contribution).

Pure: no IO. Mirrors the existing alt-shot helpers' shape.

### 2. Wire into `finalizePairResults`

In the sub-match loop's bonus-margin accumulation (currently only reads
`sm.final_differential`), resolve the per-team margin in this priority:

1. **`typeof sm.final_differential === 'number'`** → magnitude signed by `outcome`
   (existing behaviour — true match-play scoring: singles R4, or alt-shot scored as
   match play).
2. **else if `gameType === 'alt-shot'`** and holes + one-ball gross are available →
   `margin = computeAltShotHolesUpMargin(...)`; when non-null, add `+margin` to
   `sideATeamId` and `−margin` to `sideBTeamId`.
3. **else** → contribute 0.

Holes are already fetched lazily for live outcome computation; ensure they are also
loaded when the bonus is enabled on an alt-shot round even if the sub-match outcome
was persisted (so a persisted-result alt-shot round still gets a margin). Reuse the
existing `getGross` closure and `dhcByPlayer` map already built in `finalizePairResults`.

The downstream award logic (`decideMarginBonus`), `competition_points` folding, and
leaderboard aggregation are unchanged.

### 3. Tests

- **Unit (`computeAltShotHolesUpMargin`):** A wins more holes (+margin); B wins more
  holes (−margin); halved holes contribute 0; a handicap stroke on a hole flips that
  hole's winner; incomplete (no usable holes) → null.
- **Integration (`finalizePairResults.test.ts`):** an alt-shot split round with
  scorecards and **no persisted `final_differential`**, bonus enabled → bonus awarded
  to the team with the higher combined net-holes margin; and a regression check that
  the persisted-`final_differential` path (singles match play) still behaves as before.

## Edge cases

- Halved holes contribute 0 to the margin.
- An all-square round (combined margin 0 across both sub-matches) → `decideMarginBonus`
  splits per the `tie` rule (default 0.5/0.5), same as the existing bonus.
- Incomplete sub-match (missing scores) → helper returns `null` → 0 contribution.

## Relevant existing code (reference)

- `src/services/rounds/pairPointsCalculation.ts` — `resolveAltShotSubMatchOutcome`,
  `sideOneBallGross`, `calculateAltShotTeamHandicap` usage.
- `src/services/rounds/finalizePairResults.ts` — bonus margin accumulation (added by
  the prior feature), `getGross` closure, `dhcByPlayer`, lazy holes fetch.
- `src/utils/teamScoring/altShot.ts` — `calculateAltShotTeamHandicap`.
- `src/utils/scoring` — `getStrokesReceived`.
- `src/services/rounds/marginBonus.ts` — `decideMarginBonus` (unchanged).
