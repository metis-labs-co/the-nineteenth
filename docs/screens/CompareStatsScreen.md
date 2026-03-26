# CompareStatsScreen

**File:** `src/screens/social/CompareStatsScreen.tsx`

## Overview

Side-by-side statistics comparison between two players. Features visual comparisons with color-coded indicators showing which player performs better in each category.

## Features

- **Player Headers**: Avatars, names, handicaps with "VS" divider
- **Overview Comparison**: Rounds, competitions, wins, holes
- **Averages Comparison**: Score, points, per hole, par-or-better %
- **Score Distribution**: Bar chart comparison by score type
- **Best Performances**: Lowest score, highest Stableford, birdie rate
- **Color Coding**: Green (better), Red (worse), Gray (same)
- **Legend**: Explains color meanings

## Navigation

| Destination | Trigger |
|-------------|---------|
| Previous screen | Back button |

## Route Parameters

```typescript
type Props = {
  route: {
    params: {
      playerId1: string; // Current user
      playerId2: string; // Friend to compare
    }
  }
}
```

## Data Dependencies

### Hooks Used
- `usePlayer(playerId)` - Fetch player profile (x2)
- `usePlayerStatistics(playerId)` - Fetch player stats (x2)

### Statistics Data Type
```typescript
interface PlayerStatistics {
  roundsPlayed: number;
  competitionsEntered: number;
  competitionsWon: number;
  holesPlayed: number;
  averageGrossScore: number | null;
  averageStablefordPoints: number | null;
  averageScorePerHole: number;
  parOrBetterPercentage: number;
  birdieOrBetterPercentage: number;
  scoreDistribution: ScoreDistribution;
  totalScoreDistribution: number;
  lowestGrossScore: number | null;
  highestStablefordPoints: number | null;
}
```

## Component Structure

```
CompareStatsScreen
├── SafeAreaView
│   ├── Header
│   │   ├── BackButton
│   │   ├── Title ("Compare Stats")
│   │   └── HeaderSpacer
│   └── ScrollView
│       ├── PlayersCard
│       │   ├── PlayerHeader (You)
│       │   ├── VsDivider
│       │   └── PlayerHeader (Friend)
│       ├── NoStatsCard (conditional)
│       ├── OverviewSection
│       │   └── ComparisonRows (4 rows)
│       ├── AveragesSection
│       │   └── ComparisonRows (4 rows)
│       ├── DistributionSection
│       │   └── DistributionComparisons (5 rows)
│       ├── BestPerformancesSection
│       │   └── ComparisonRows (3 rows)
│       └── LegendCard
```

## Internal Components

### PlayerHeader
Displays player info with avatar, name, and handicap.

### ComparisonRow
Three-column row: Value1 | Label + Diff | Value2
| Prop | Type | Description |
|------|------|-------------|
| `label` | `string` | Stat name |
| `value1` | `number \| string` | Player 1 value |
| `value2` | `number \| string` | Player 2 value |
| `diff` | `number?` | Difference (player1 - player2) |
| `higherIsBetter` | `boolean` | Determines color coding |
| `suffix` | `string` | Unit suffix (e.g., "%") |
| `decimals` | `number` | Decimal places |

### DistributionComparison
Mirrored bar chart row with percentages:
| Prop | Type | Description |
|------|------|-------------|
| `label` | `string` | Score type |
| `count1` / `count2` | `number` | Raw counts |
| `total1` / `total2` | `number` | Totals for percentage |
| `color` | `string` | Bar fill color |

## Comparison Logic

### Color Helper
```typescript
function getComparisonColor(diff: number, higherIsBetter: boolean): string {
  if (diff === 0) return colors.textSecondary;
  const isBetter = higherIsBetter ? diff > 0 : diff < 0;
  return isBetter ? colors.success : colors.error;
}
```

### Difference Formatting
```typescript
function formatDiff(diff: number, decimals: number): string {
  if (diff === 0) return '-';
  const formatted = decimals > 0 ? diff.toFixed(decimals) : Math.round(diff);
  return diff > 0 ? `+${formatted}` : formatted;
}
```

## Stat Comparisons

| Stat | Higher is Better |
|------|------------------|
| Rounds Played | Yes |
| Competitions | Yes |
| Wins | Yes |
| Holes Played | Yes |
| Avg Score | **No** (lower is better) |
| Avg Points | Yes |
| Per Hole | **No** (lower is better) |
| Par or Better % | Yes |
| Best Score | **No** (lower is better) |
| Best Stableford | Yes |
| Birdie Rate | Yes |

## Score Distribution Colors

| Type | Color |
|------|-------|
| Eagles | colors.eagle |
| Birdies | colors.birdie |
| Pars | colors.par |
| Bogeys | colors.bogey |
| Double+ | colors.doubleBogey |

## No Stats Warning

Shows when one or both players have no rounds:
- Warning icon
- Context-specific message
- Light warning background

## Legend Card

Explains color coding:
- Green dot: "Better than opponent"
- Red dot: "Worse than opponent"
- Gray dot: "Same as opponent"

## Loading & Error States

### Loading
- Header shown
- Centered activity indicator
- "Loading comparison..." text

### Error (Players not found)
- Alert circle icon
- "Unable to load players" title
- Error message
- "Go Back" button

## UI Components Used

- `View`, `Text`, `ScrollView`, `TouchableOpacity`, `ActivityIndicator` - React Native core
- `SafeAreaView` - react-native-safe-area-context
- `Icon`, `Avatar` - React Native Paper

## Styling Highlights

- White players card with VS divider
- Gray50 legend card
- Distribution bars grow from center outward
- Comparison values in h4 typography
- Diff text below labels
- Success/error colors for better/worse
- Cards with shadows
