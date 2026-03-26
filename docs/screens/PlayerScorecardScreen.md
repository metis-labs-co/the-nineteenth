# PlayerScorecardScreen

**File:** `src/screens/scoring/PlayerScorecardScreen.tsx`

## Overview

Displays an individual player's detailed scorecard for a round. Shows all 18 holes in a comprehensive table format with score indicators, strokes received, Stableford points, and optional putts tracking. Features visual indicators for score types (birdie circles, bogey squares).

## Features

- **Full Scorecard Table**: All 18 holes with multiple data columns
- **Score Indicators**: Visual shapes for birdie/eagle (circles) and bogey/double+ (squares)
- **Strokes Received**: Shows handicap strokes per hole based on stroke index
- **Stableford Points**: Per-hole and cumulative points
- **Putts Tracking**: Optional putts column
- **Subtotals**: Front 9 (OUT) and Back 9 (IN) rows
- **Total Row**: Gross score with +/- par, total Stableford points
- **Pull-to-Refresh**: Refresh scorecard data

## Navigation

| Destination | Trigger |
|-------------|---------|
| Previous screen | Back button |

## Route Parameters

```typescript
type Props = {
  route: {
    params: {
      playerId: string; // Player to display
      roundId: string;  // Round context
    }
  }
}
```

## Data Dependencies

### Store Integration
Uses `useScorecardStore` (Zustand):

**State Values:**
- `currentPlayers` - Array of players in group
- `groupScorecards` - Map of player ID to scorecard
- `holes` - Course hole data
- `isLoading` - Loading state
- `isInitialized` - Initialization state

### Hooks Used
- `useSafeAreaInsets()` - Safe area handling

### Data Types
```typescript
interface PlayerStats {
  front9Gross: number;
  back9Gross: number;
  front9Stableford: number;
  back9Stableford: number;
  front9Putts: number;
  back9Putts: number;
  totalGross: number;
  totalStableford: number;
  totalPutts: number;
  totalPar: number;
  front9Par: number;
  back9Par: number;
}

interface HoleRowData {
  hole: Hole;
  strokes: number | undefined;
  putts: number | undefined;
  stablefordPoints: number;
  strokesReceived: number;
  isPickup: boolean;
}
```

## Component Structure

```
PlayerScorecardScreen
├── SafeAreaView
│   ├── Header
│   │   ├── BackButton (chevron + "Back")
│   │   ├── HeaderCenter
│   │   │   ├── PlayerName
│   │   │   └── Handicap ("HC: X")
│   │   └── HeaderSpacer
│   └── ScrollView (with RefreshControl)
│       └── ScorecardTable (Surface)
│           ├── HeaderRow
│           ├── Front9Rows (holes 1-9)
│           ├── OutRow (subtotal)
│           ├── Back9Rows (holes 10-18)
│           ├── InRow (subtotal)
│           └── TotalRow
```

## State Management

| State | Type | Purpose |
|-------|------|---------|
| `isRefreshing` | `boolean` | Pull-to-refresh state |

## Table Columns

| Column | Content | Width |
|--------|---------|-------|
| Hole | Hole number (1-18) | 1.2 flex |
| SI | Stroke Index | 1 flex |
| Par | Par value (3/4/5) | 1 flex |
| Shots | Strokes received | 1 flex |
| Score | Strokes with indicator | 1.4 flex |
| Pts | Stableford points | 1.1 flex |
| Putts | Putt count | 1.1 flex |

## Score Visualization

### Score Indicators
| Difference | Shape | Description |
|------------|-------|-------------|
| -3 or less | Double circle | Albatross or better |
| -2 | Double circle | Eagle |
| -1 | Circle | Birdie |
| 0 | No indicator | Par |
| +1 | Square | Bogey |
| +2 or more | Double square | Double bogey+ |
| 10+ | "P" in red | Pickup |

### Stableford Point Values
```typescript
function calculateStablefordPointsForHole(strokes, par, strokesReceived): number {
  const netStrokes = strokes - strokesReceived;
  const relativeToPar = netStrokes - par;

  if (relativeToPar <= -3) return 5; // Albatross+
  if (relativeToPar === -2) return 4; // Eagle
  if (relativeToPar === -1) return 3; // Birdie
  if (relativeToPar === 0) return 2;  // Par
  if (relativeToPar === 1) return 1;  // Bogey
  return 0; // Double bogey+
}
```

### Strokes Received Calculation
```typescript
function getStrokesReceived(handicap: number, strokeIndex: number): number {
  if (handicap <= 0) return 0;
  if (handicap >= strokeIndex) {
    const additional = Math.floor(handicap / 18);
    const remaining = handicap % 18;
    return additional + (remaining >= strokeIndex ? 1 : 0);
  }
  return 0;
}
```

## Default Holes

When no course data available, uses standard defaults:
- Pars: `[4, 4, 3, 5, 4, 4, 3, 4, 5, 4, 4, 3, 5, 4, 4, 3, 4, 5]`
- Stroke Indexes: `[7, 15, 11, 1, 5, 9, 17, 13, 3, 8, 16, 12, 2, 6, 10, 18, 14, 4]`

## Total Row Display

Gross score shows relative to par:
- Under par: Green, shows "-X"
- Even par: Gray, shows "E"
- Over par: Red, shows "+X"

Stableford total displayed in primary color cell with "pts" label.

## Loading & Error States

### Loading
- Centered activity indicator
- "Loading scorecard..." text

### Player Not Found
- Account question icon
- "Player Not Found" title
- Explanation text
- "Go Back" button

### No Scores
- Card text outline icon
- "No Scores Yet" title
- "[Player name] hasn't recorded any scores for this round yet."
- "Go Back" button

## UI Components Used

- `View`, `ScrollView`, `RefreshControl`, `TouchableOpacity`, `StyleSheet` - React Native core
- `Text`, `Surface`, `ActivityIndicator` - React Native Paper
- `SafeAreaView`, `useSafeAreaInsets` - react-native-safe-area-context
- `MaterialCommunityIcons` - Vector icons

## Styling Highlights

- Dark gray (gray800) header row
- Gray100 hole column background
- Gray50 for SI and Par columns
- Light primary tint for Shots column (strokes received)
- Score indicators with colored borders
- Gray200 subtotal rows
- Gray800 total row
- Primary color Stableford total cell
- Score colors: success (under par), error (over par)
- Pull-to-refresh with primary color

## Accessibility

- Back button with accessibility label and role
- Error state buttons with accessibility labels and roles
- RefreshControl with platform-appropriate styling

## Accessed From

- Single player rounds
- Clicking player name from ScorecardEntryScreen
- Clicking player name from QuickScorecardView
