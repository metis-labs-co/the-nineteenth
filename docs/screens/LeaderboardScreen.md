# LeaderboardScreen

**File:** `src/screens/player/LeaderboardScreen.tsx`

## Overview

Displays the full competition leaderboard with Stableford points. Features a table layout with position, player name, handicap, and points columns, with special highlighting for the current user and tie handling.

## Features

- **Table Layout**: Position, Player, Handicap, Points columns
- **Tie Handling**: Same position numbers with "T" indicator
- **Current User Highlighting**: Highlighted row with "You" label
- **First Place**: Trophy icon and gold-tinted row
- **Pull-to-Refresh**: Manual refresh via pull or button
- **Rounds Played**: Shows count under player name

## Navigation

| Destination | Trigger |
|-------------|---------|
| Previous screen | "← Back" button |

## Route Parameters

```typescript
type Props = {
  route: {
    params: {
      competitionId: string;
    }
  }
}
```

## Data Dependencies

### Hooks Used
- `useLeaderboard(competitionId)` - Fetches leaderboard data
- `useAuth()` - Get current user for highlighting

### Leaderboard Entry Type
```typescript
interface LeaderboardEntry {
  playerId: string;
  playerName: string;
  handicap: number;
  totalPoints: number;
  roundsPlayed: number;
}
```

## Component Structure

```
LeaderboardScreen
├── SafeAreaView
│   ├── Header
│   │   ├── HeaderRow
│   │   │   ├── BackButton
│   │   │   └── RefreshButton
│   │   ├── HeaderTitle ("Leaderboard")
│   │   └── HeaderSubtitle ("Stableford Points")
│   └── ScrollView (with RefreshControl)
│       ├── TableHeader (#, Player, HC, Pts)
│       ├── TableRows (for each entry)
│       │   ├── PositionCell (trophy or number)
│       │   ├── PlayerCell (name + rounds)
│       │   ├── HandicapCell
│       │   └── PointsCell
│       └── LastUpdated hint
```

## State Management

Query states from React Query:
| Property | Purpose |
|----------|---------|
| `isLoading` | Initial load indicator |
| `error` | Error state |
| `isRefetching` | Pull-to-refresh indicator |

### Computed Positions
```typescript
const leaderboardWithPositions = useMemo(() => {
  const sorted = [...leaderboard].sort((a, b) => b.totalPoints - a.totalPoints);

  // Handle ties: same points get same position
  let currentPosition = 1;
  return sorted.map((entry, index) => {
    if (entry.totalPoints !== lastPoints) {
      currentPosition = index + 1;
    }
    return { ...entry, position: currentPosition, isTied: /* ... */ };
  });
}, [leaderboard]);
```

## Row Styling

| Condition | Background | Text Style |
|-----------|------------|------------|
| Current User | primaryLighter (30%) | Primary color, bold |
| First Place | warningLight (20%) | Gold accent |
| Normal | White | Default |

## Table Columns

| Column | Width | Alignment | Content |
|--------|-------|-----------|---------|
| Position (#) | 48px | Center | Number or 🏆 |
| Player | Flex | Left | Name + rounds played |
| Handicap (HC) | 48px | Center | Number |
| Points (Pts) | 56px | Right | Total points |

## Position Display

- **First Place**: Trophy emoji (🏆)
- **Ties**: Number with "T" suffix (e.g., "2T")
- **Others**: Plain number

## Current User Features

- Row highlighted with primary-lighter background
- Name replaced with "You"
- All text in primary color

## Loading & Error States

### Loading
- Header with back button shown
- Centered activity indicator
- "Loading leaderboard..." text

### Error
- Header shown
- Warning emoji icon
- "Unable to load leaderboard" title
- Error message
- Retry button

### Empty
- Header shown
- Chart emoji icon
- "No scores yet" title
- Message about scorecard submission

## UI Components Used

- `View`, `Text`, `ScrollView`, `RefreshControl`, `TouchableOpacity`, `ActivityIndicator` - React Native core
- `SafeAreaView` - react-native-safe-area-context

## Styling Highlights

- White header with border bottom
- Gray100 table header background
- Table rows with borderLight separators
- Minimum 64px row height for touch targets
- Primary color refresh button
- Gold (warningDark) points text for first place
- Pull-down hint at bottom

## Accessibility

- Back button with role and label
- Refresh button with role, label, and hint
- Table rows have descriptive accessibility labels
- Position, ties, name, handicap, and points announced
- "Pull down to refresh" hint text
