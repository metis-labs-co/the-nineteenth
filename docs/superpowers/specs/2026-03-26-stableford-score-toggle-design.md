# Stableford Score Display Toggle

## Problem

When viewing the scorecard review screen during a Stableford round, the scorecard only shows stroke counts per hole for each player. Users want to quickly see Stableford points per hole without mental math. The bottom "Pts" row shows total points, but there's no per-hole points view.

## Solution

Add a segmented control ("Strokes" | "Points") above the `ScorecardTable` on the `ReviewScorecardScreen`. When toggled to "Points", hole cells and subtotal rows display Stableford points instead of stroke counts. The control only appears for Stableford game types.

## Scope

- **In scope**: `ReviewScorecardScreen` only (active scoring flow → "View Full Scorecard")
- **Out of scope**: `RoundScorecardTab` (used in `ViewRoundScreen` for completed rounds) also renders `ScorecardTable` but is not affected. The new `scoreDisplayMode` prop is optional, so it defaults to strokes. Adding the toggle to `RoundScorecardTab` can be a follow-up if desired.

## Design Decisions

- **Segmented control** over toggle switch — two equal modes are better represented as a segmented choice than an on/off toggle
- **Local state** (not persisted) — default to "Strokes" each time the screen opens; no need to remember preference across sessions
- **Net-based color mapping** — in points mode, pass **net strokes** (`strokes - strokesReceived`) to `getScoreColor` and `getScoreBackgroundColor` so colors match the points value. A net par (2 pts) shows par coloring regardless of gross score. This is more intuitive than using gross strokes for coloring.
- **Compact display style** for points — use `getScoreBackgroundColor` for background pills (like the existing compact ScoreIndicator) to visually distinguish points mode from strokes mode
- **Only for Stableford** — the toggle is hidden for stroke play, par, match play, and team formats
- **Solo round**: When `scoreDisplayMode === 'points'`, hide the `SoloStableford*` column to avoid redundancy (points would show in main column and in the separate Pts column)

## Behavior

### Strokes Mode (Default)
- Current behavior, unchanged
- ScoreIndicator with circles/squares (bordered display)
- OUT/IN subtotals show gross strokes
- Bottom rows: Gross, Net, Pts (unchanged)

### Points Mode
- Hole cells show Stableford points (0–5) with colored background pills
- Colors derived from **net strokes vs par** (e.g., net par → par color for the "2" displayed)
- Pickup holes (strokes >= `PICKUP_SCORE`): show "0" with double-bogey color — the existing `getScoreColor`/`getScoreBackgroundColor` naturally produce this since any pickup is well over double bogey
- Multi-ball scores (`MultiBallHoleScore`): show "-" — use the same `isSingleBallScore` guard already in the existing code. If strokes is undefined, render "-".
- No-score holes: show "-"
- OUT/IN subtotals show Stableford point subtotals (`front9Stableford` / `back9Stableford` from `PlayerStats`)
- Bottom rows: Gross, Net, Pts — unchanged in both modes

### Visibility Rules
- Segmented control only renders when `gameType === 'stableford'`
- For all other game types, no toggle is shown — behavior is unchanged

## Files to Modify

### 1. `src/screens/scoring/ReviewScorecardScreen/index.tsx`
- Add `scoreDisplayMode` state: `useState<'strokes' | 'points'>('strokes')`
- Render segmented control between tabs and ScrollView (or at top of ScrollView) when `effectiveGameType === 'stableford'`
- Pass `scoreDisplayMode` to `ScorecardTable`

### 2. `src/components/scorecard/ScorecardTable/types.ts`
- Add `scoreDisplayMode?: 'strokes' | 'points'` to `ScorecardTableProps`

### 3. `src/components/scorecard/ScorecardTable/ScorecardTable.tsx`
- Accept `scoreDisplayMode` prop
- Pass it through to `ScrollableHoleCells` and `ScrollableSubtotalCells` in **both** render paths (the `needsHorizontalScroll` branch and the non-scroll branch)
- When `scoreDisplayMode === 'points'` and `showSoloStableford` is true, suppress the `SoloStableford*` cells to avoid redundancy

### 4. `src/components/scorecard/ScorecardTable/cells/ScrollableCells.tsx`
- **`ScrollableHoleCells`**: When `scoreDisplayMode === 'points'` and `gameType === 'stableford'`:
  - Use the existing pattern: `const strokes = score && isSingleBallScore(score) ? score.strokes : undefined;`
  - If strokes is undefined or 0, render "-"
  - Calculate `strokesReceived` via `getStrokesReceived(handicap, hole.strokeIndex)`
  - Calculate `netStrokes = strokes - strokesReceived`
  - Calculate points via `calculateStablefordPointsNet(strokes, hole.par, strokesReceived)`
  - Get colors using **net strokes**: `getScoreColor(netStrokes, hole.par, colors)` for text, `getScoreBackgroundColor(netStrokes, hole.par, colors)` for background
  - Render a compact pill with the points value
- **`ScrollableSubtotalCells`**: When `scoreDisplayMode === 'points'` and `gameType === 'stableford'`, show `front9Stableford` / `back9Stableford` from `playerStats` instead of gross strokes

### Segmented Control Implementation
Build inline in `ReviewScorecardScreen` as a simple two-button row:
- Container: `flexDirection: 'row'`, `backgroundColor: colors.surfaceVariant`, `borderRadius: borderRadius.lg`, `padding: 3`
- Active segment: `backgroundColor: colors.primary`, `borderRadius: borderRadius.md`
- Inactive segment: transparent background
- Text: `typography.small` + `fontWeight: '600'` for active, `fontWeight: '500'` for inactive
- Active text: `color: colors.textOnColored`, inactive text: `color: colors.textSecondary`
- Accessibility: `accessibilityRole="button"`, `accessibilityState={{ selected: true/false }}`, `testID="score-display-strokes"` / `testID="score-display-points"`

### Existing Functions to Reuse
- `calculateStablefordPointsNet(strokes, par, strokesReceived)` — from `src/utils/scoring.ts`
- `getStrokesReceived(handicap, strokeIndex)` — from `src/utils/scoring.ts`
- `getScoreColor(score, par, colors)` — from `src/utils/scoring.ts`
- `getScoreBackgroundColor(score, par, colors)` — from `src/utils/displayHelpers.ts`
- `isSingleBallScore(score)` — from `src/types/database.types.ts`
- `PlayerStats.front9Stableford` / `back9Stableford` — already calculated by `calculatePlayerStats`

## Verification

1. Navigate to score entry for a Stableford round with 2+ players
2. Enter some scores, then tap "View Full Scorecard"
3. Verify segmented control appears with "Strokes" selected by default
4. Tap "Points" — hole cells switch to colored point pills, subtotals show point sums
5. Tap "Strokes" — reverts to normal ScoreIndicator display
6. Verify the toggle does NOT appear for stroke play or par rounds
7. Test with a solo round — verify SoloStableford column is hidden when "Points" is active (avoids redundancy), and shows normally when "Strokes" is active
8. Test offline — toggle should work with locally cached data
9. Test with a player receiving strokes on a hole — verify that a gross bogey with 1 stroke received shows 2 pts in par coloring (not bogey coloring)
10. Test with 4 players (horizontal scroll layout) — verify toggle works in both the scroll and non-scroll layout paths
