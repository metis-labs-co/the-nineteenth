# Ringer Board — Teams Vertical List + Contributions — Design

**Date:** 2026-06-09
**Status:** Approved (design), pending implementation
**Builds on:** `docs/superpowers/specs/2026-06-06-ringer-board-design.md`

## Summary

Improve the Ringer Board **Teams sub-tab**:

1. Replace the horizontal scrolling grid with a **vertical 18-row list**, each row
   showing **Hole #**, **Par**, **Player** (the contributing member), **Points**
   (best Stableford on that hole), and **Shots** (the contributor's actual gross).
2. Add a **contributions mini-leaderboard** at the top of each expanded team: the
   team's members ranked by how many of the 18 holes they supplied the winning
   score for.

The **Individual sub-tab is unchanged** (keeps the horizontal `RingerScorecard`).

## Decisions (locked)

- Vertical list + contributions apply to **Teams only**.
- "Shots" = the contributing player's **gross strokes** on that hole, in the round
  the winning score came from.
- "Par" is its own **column** (not inline).
- Contributions mini-leaderboard = ranked member list at the **top** of the
  expanded team (e.g. `Sam 7 · Lee 6 · Pat 5`), highest first; ties listed
  together ordered by count then name.

## Data changes

Extend `RingerHole` (in `src/utils/ringer/types.ts`) with two fields:

- `par: number | null` — par of the hole in the source round (null when no score).
- `strokes: number | null` — the contributing player's gross strokes on that hole
  in the source round (null when no score).

`computeRingerBoard` (`src/utils/ringer/computeRingerBoard.ts`) populates these as it
selects the per-hole best. A small internal helper returns both points and strokes
for a player on a hole so the winner's strokes can be captured alongside its points;
`par` comes from the winning round's `Hole`. These fields are populated for both
individual and team entries (the Individual UI ignores them — harmless).

No DB or hook changes — the hook already supplies the scorecards + holes the util
needs.

## UI changes

- **Keep** `src/components/competitions/ringer/RingerScorecard.tsx` (horizontal) for
  the Individual tab.
- **New** `src/components/competitions/ringer/RingerTeamCard.tsx` — the expanded
  team body:
  - **Contributions row:** tally `entry.holes` by `sourcePlayerId`, resolve names
    via the existing `shortNameFor`, sort by count desc then name, render as a
    compact ranked list. Holes with `sourcePlayerId === null` don't count.
  - **Vertical table:** a header row (Hole · Par · Player · Pts · Shots) then one
    row per hole from `entry.holes`. No-score holes show `—` for player/shots and
    `0` points. Plus a footer/total row showing the team's ringer total.
  - Uses plain Views/`.map()` (no nested vertical scroll — it renders inside the
    competition screen's ScrollView). Theming via `useThemeColors()` + static
    tokens; accessibility labels per row.
- **`RingerBoard.tsx`** renders `RingerTeamCard` when `view === 'teams'` and
  `RingerScorecard` when `view === 'individuals'`.

## Edge cases

- **No-score hole** → `—` / 0 pts; excluded from contributions counts.
- **Pickup** → 0 points but the actual gross strokes still display.
- **Tie in contributions** → members with equal counts both shown, ordered by name.

## Testing

Extend `src/utils/ringer/computeRingerBoard.test.ts`:

- A winning hole carries the correct `par` and `strokes` from its source round.
- A no-score hole has `par: null`, `strokes: null`, `points: 0`.
- Team contribution tagging (`sourcePlayerId`) already tested; add an assertion
  that `strokes`/`par` reflect the winning member's card.

UI is verified by type-check + lint + manual smoke (the pure util holds the logic).

## Out of scope

- Changes to the Individual tab layout.
- Any new persisted data.
