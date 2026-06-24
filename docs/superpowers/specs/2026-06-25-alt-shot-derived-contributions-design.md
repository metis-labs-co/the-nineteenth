# Alt-Shot Derived Contributions — Design

**Date:** 2026-06-25
**Status:** Approved (pending spec review)
**Author:** Sam + Claude

## Problem

When scoring an alternate-shot (foursomes / "alt shot") team round, the user currently
has to manually record per-hole **shot contributions** (which player hit the tee shot,
approach, putt, etc.) via the `ShotContributionSheet`. For an 8-man comp split into
2-player sub-matches, that's a lot of repetitive tapping.

In alternate shot, contributions are **fully deterministic**: the player who tees the
1st hole tees all odd holes, their partner tees all even holes, and within a hole the
partners alternate every stroke until the ball is holed. So once you know who hits the
first tee shot of the round and each hole's stroke count, every shot's owner (including
who putted) is derivable. The manual entry is redundant.

## Goal

Replace manual per-hole contribution entry for alt-shot rounds with a single one-time
choice — **who tees off first** — and derive all contribution stats from that plus each
hole's stroke count.

## Key constraint discovered

Alt-shot **scoring does not use contributions at all**:

- Combined finalization: `computeAltShotTeamRoundScore()` (gross + 50%-combined handicap).
- Split sub-match outcome: `resolveAltShotSubMatchOutcome()` in
  `src/services/rounds/pairPointsCalculation.ts` (gross differential only).

Contributions in alt-shot today feed **display/stats only**:

- The on-card per-player tally on `AltShotScoreCard` ("Alice 2 • Bob 2").
- The in-round contribution leaderboard (`useContributionData`).
- The competition contributions board (`computeContributions`, currently maps
  alt-shot → `'scramble'` format).

Therefore removing the manual UI carries **zero risk to scoring or sub-match results**.
This is purely a stats/UX simplification.

## Approach

### Persistence of "who tees first" — anchor on hole-1 `teeShot` (chosen option A)

The first-tee choice is stored in the existing `shotContributions.teeShot` slot on
**hole 1** of the team's ball (the first team member's scorecard for hole 1, per the
existing `getTeamShotContributions` mechanism in
`src/screens/scoring/ScorecardEntryScreen/components/ScorecardScoreContent.tsx:214`).

- No schema change; rides the existing scorecard sync path.
- Readable anywhere scorecards are loaded, including the competition contributions board.
- If hole-1 `teeShot` is unset (e.g. hole 1 not yet scored), fall back to the current
  member-order default (`members[0]` tees odd holes) so nothing blocks.

Rejected alternatives:
- **Dedicated per-team-per-round field:** cleaner conceptually but needs schema + store +
  query changes and a migration, with multiple pairs per split round — overkill for a
  single player-id.
- **Auto-populate all 4 slots, leave consumers unchanged:** the 4-slot model
  (`teeShot`, `secondShot`, `approach`, `putt`) cannot represent physical stroke counts
  (a par-4 holed in 4 strokes only fills 3 slots), so it would undercount exactly the
  "how many shots each player had" number we care about.

### Components

#### 1. New util: `src/utils/teamScoring/altShotContributions.ts`

Single source of truth for the alternation math. Pure functions, no UI/store deps.

```
altShotTeePlayer(firstTeeId, partnerId, holeNumber): string
  // firstTeeId tees odd holes; partnerId tees even holes.
  // holeNumber odd  -> firstTeeId
  // holeNumber even -> partnerId

deriveAltShotShotCounts(firstTeeId, partnerId, holeNumber, strokes):
  Record<playerId, { drives: number; approaches: number; putts: number; total: number }>
  // Strict alternation. teeP = altShotTeePlayer(...); otherP = the partner.
  // Stroke i (1-based) is hit by teeP when i is odd, otherP when i is even.
  // - drives: stroke 1 -> teeP (+1 drive, +1 total)
  // - putt:   stroke N (final) -> whoever hit it (+1 putt, +1 total), only when N >= 2
  // - approaches: strokes 2..N-1 -> alternating owner (+1 approach, +1 total each)
  // Edge cases:
  //   strokes <= 0 or null  -> all zeros (hole not scored yet)
  //   strokes == 1 (ace)    -> teeP { drives:1, approaches:0, putts:0, total:1 }
```

Per-player **total** equals their physical shot count: `teeP = ceil(N/2)`,
`partner = floor(N/2)`. The drives/approaches/putts split is the bucketed view the
leaderboards consume.

Bucketing note: `drives` = the tee stroke, `putts` = the final (holing) stroke,
`approaches` = everything between. This matches how the existing leaderboards bucket
the manual 4-slot data (`teeShot`→drives, `putt`→putts, middle→approaches), so the
derived numbers slot into the same display semantics.

#### 2. First-tee selector on `AltShotScoreCard` (hole 1 only)

- On **hole 1**, render a compact A/B player toggle: "Who tees off first? [Alice] [Bob]".
  Selecting writes hole-1 `teeShot` via the existing
  `onShotContributionsChange`/`updateShotContributions` path. Defaults to `members[0]`.
- On **holes 2–18**, no selector — keep the existing read-only "X tees this hole" hint,
  now driven by `altShotTeePlayer(firstTee, partner, hole)` instead of the hardcoded
  member-order rule.

#### 3. Remove `ShotContributionSheet` from the alt-shot card

- The manual shot-contribution sheet is no longer rendered for alt-shot.
- The on-card per-player tally is recomputed from the **derived** counts
  (`deriveAltShotShotCounts` for the current hole) instead of counting stored slots.
- Scramble / shamble / best-ball formats keep `ShotContributionSheet` unchanged — this
  change is alt-shot-only.

#### 4. Rewire the two stats consumers for alt-shot

Both already load scorecards, so they can read hole-1 `teeShot` + per-hole strokes and
call the util on the alt-shot branch (instead of slot-counting / the current
alt-shot→scramble mapping):

- In-round contribution leaderboard: `src/components/scorecard/ContributionLeaderboard/useContributionData.ts`
- Competition contributions board: `src/utils/contributions/computeContributions.ts`
  (and its caller `src/hooks/competitions/useCompetitionContributions.ts`)

### No scoring changes

Combined and split sub-match results already ignore contributions; win/loss is
unaffected.

## Data flow

```
User picks first tee (hole 1)
  -> hole-1 shotContributions.teeShot = playerId  (synced via scorecard path)

Per hole display / stats:
  firstTee = hole-1 teeShot (or members[0] fallback)
  partner  = the other member
  strokes  = team ball strokes for that hole
  -> altShotTeePlayer / deriveAltShotShotCounts
  -> on-card tally, in-round leaderboard, competition contributions board
```

## Testing

- **Unit tests for `altShotContributions.ts`** (the core risk): alternation correctness
  across odd/even holes, the tee rotation, and stroke-count edge cases (0/null, ace,
  par 3 with 2–4 strokes, par 5 with 5–7 strokes, even vs odd final stroke → correct
  putt owner). Assert per-player `total` equals `ceil/floor(N/2)`.
- **Component:** `AltShotScoreCard` shows the first-tee toggle only on hole 1; the
  derived tally matches stroke counts; `ShotContributionSheet` is not rendered.
- **Consumers:** spot-check that the in-round leaderboard and contributions board
  produce derived drives/approaches/putts for an alt-shot round with no stored
  contributions beyond hole-1 `teeShot`.
- Confirm scramble/shamble/best-ball contribution entry + stats are unchanged.

## Out of scope (YAGNI)

- Manual override of a hole's derived shots (alternation is fixed in real foursomes;
  penalties don't change it).
- A dedicated round-config field for first-tee.
- Backfilling/altering historical alt-shot rounds already scored with manual
  contributions (they keep their stored data; new rounds derive).

## Affected files (estimate)

| File | Change |
|------|--------|
| `src/utils/teamScoring/altShotContributions.ts` | **New** — derivation util |
| `src/utils/teamScoring/__tests__/altShotContributions.test.ts` | **New** — unit tests |
| `src/components/scorecard/AltShotScoreCard/AltShotScoreCard.tsx` | First-tee toggle (hole 1), derived tally, drop `ShotContributionSheet`, tee hint via util |
| `src/components/scorecard/ContributionLeaderboard/useContributionData.ts` | Alt-shot branch derives instead of slot-counting |
| `src/utils/contributions/computeContributions.ts` | Alt-shot derivation path (replace alt-shot→scramble slot-count) |
| `src/hooks/competitions/useCompetitionContributions.ts` | Feed first-tee + strokes to the alt-shot path |

No DB migration. No scoring-logic changes.
