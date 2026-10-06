# Round Format Pill in Points & Rules Rows — Design Spec

**Date:** 2026-06-23
**Status:** Approved (design), pending implementation plan
**Related:** `2026-06-23-points-config-in-sheet-design.md`

## Motivation

In the Points & Rules sheet (`PointsConfigSection` rows), each round shows its
`name` + points detail. Unnamed rounds fall back to a bare "Round" (so two unnamed
rounds read identically), and there's no indication of each round's format. The
organiser asked to add a round-format pill (and number the unnamed-round fallback).

## Goals

1. Add a **format pill** to each round row showing the round's format (e.g.
   "1v1 Singles Match Play", "2v2 Alt Shot (Foursomes)", "4v4 Team Scramble",
   "Team Stableford — Best 3 of 4").
2. Number the unnamed-round fallback: "Round 3", "Round 4" instead of bare "Round".

## Non-goals (YAGNI)

- No data-model, type, or migration changes.
- No change to the points math, the edit flow, or the leaderboard banner.
- Don't rename existing rounds; the pill is additive.

## Design decisions (locked)

- **Format label source = same as the round cards** for consistent wording:
  `inferPresetIdFromRound(round)` → `ROUND_PRESETS[presetId]?.title`, falling back to
  `GAME_TYPE_LABELS[round.game_type]` (the exact derivation in
  `CompetitionRoundCard`).
- **Pill component** = the existing `Pill` from `@/components/common`, small size,
  rendered in the row's left column **directly under the round name**, above the
  points detail line.
- **Numbered fallback:** when a round has no name, the row title is "Round {N}"
  (N = its position in the list, matching how the detail screen numbers rounds).

## Architecture

### 1. `roundPointsSummary.ts` — empty title when no name

`summarizeRoundPoints` currently sets `const title = round.name?.trim() || 'Round';`.
Change the fallback to an **empty string** (`round.name?.trim() || ''`) so the
component supplies the numbered fallback. (`summarizeCompetition`'s `total`/`toWin`
are unaffected; the leaderboard banner ignores `perRound` titles.)

### 2. `PointsConfigSection.tsx` — render the pill + numbered title

- Imports: `inferPresetIdFromRound`, `ROUND_PRESETS` from `@/constants/roundPresets`;
  `GAME_TYPE_LABELS` from `../types`; `Pill` from `@/components/common`.
- Build a `roundsById` map from the `rounds` prop. For each summary row, find the
  round and derive `formatLabel` via the locked derivation above.
- Row left column becomes:
  1. Title — `r.title?.trim() ? r.title : \`Round ${idx + 1}\`` (numbered fallback).
  2. `<Pill label={formatLabel} size="sm" />` (small, subtle).
  3. The existing points detail `Text`.
- The right column (Custom chip + chevron) is unchanged.

## Testing

- Add a unit assertion in `roundPointsSummary.test.ts` that a no-name round yields
  `title === ''` (so the component numbers it). The pill rendering is verified by
  type-check + manual.
- Manual: open the Points & Rules sheet on a per-round comp → each row shows a format
  pill under the name; unnamed rounds read "Round 3" / "Round 4" with their format
  pill (Scramble / Match Play).

## Relevant existing code (reference)

- `src/components/competitions/detail/sections/PointsConfigSection.tsx` — the rows.
- `src/components/competitions/detail/CompetitionRoundCard.tsx:135-148` — the label derivation to mirror.
- `src/constants/roundPresets.ts` — `inferPresetIdFromRound`, `ROUND_PRESETS`.
- `src/components/competitions/detail/types.ts` — `GAME_TYPE_LABELS`.
- `src/components/common` — `Pill`.
- `src/utils/competitionPoints/roundPointsSummary.ts` — `summarizeRoundPoints` title.
