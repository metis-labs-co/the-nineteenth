# PlayerDetailScreen

**File:** `src/screens/player/PlayerDetailScreen.tsx`

## Overview

Displays comprehensive statistics and profile information for another player (friend). Features profile header, statistics overview, score distribution, best performances, and recent activity with comparison functionality.

## Features

- **Profile Header**: Avatar, name, email, handicap badge
- **Compare Stats Button**: Compare with current user
- **Overview Stats**: Rounds, competitions, wins, holes played
- **Averages Section**: Score per round, Stableford points, per hole
- **Score Distribution**: Visual bars for eagles through triple+
- **Best Performances**: Best gross score, best Stableford, birdie rate
- **Recent Activity**: Last 5 rounds with scores
- **Pull-to-Refresh**: Refresh statistics

## Navigation

| Destination | Trigger |
|-------------|---------|
| Previous screen | Back button |
| `CompareStats` | "Compare Stats" button |

## Route Parameters

```typescript
type Props = {
  route: {
    params: {
      id: string; // Player ID to view
    }
  }
}
```

## Data Dependencies

### Hooks Used
- `usePlayer(playerId)` - Fetch player profile
- `usePlayerStatistics(playerId)` - Fetch player stats
- `useAuth()` - Get current user for comparison

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
  bestRound: BestRound | null;
  bestStablefordRound: BestStablefordRound | null;
  recentRounds: RecentRound[];
}
```

## Component Structure

```
PlayerDetailScreen
├── SafeAreaView
│   ├── Header
│   │   ├── BackButton
│   │   ├── Title ("Player Profile")
│   │   └── HeaderSpacer
│   └── ScrollView (with RefreshControl)
│       ├── ProfileCard
│       │   ├── Avatar
│       │   ├── PlayerName
│       │   ├── PlayerEmail
│       │   ├── HandicapBadge
│       │   └── CompareStatsButton
│       ├── NoStatsMessage (conditional)
│       └── StatsSections (conditional)
│           ├── OverviewSection (StatCards)
│           ├── AveragesSection (StatCards)
│           ├── ScoreDistributionSection
│           │   └── ScoreDistributionBars
│           ├── BestPerformancesSection
│           │   └── PerformanceRows
│           └── RecentActivitySection
│               └── RecentRoundRows
```

## Internal Components

### StatCard
Memoized card displaying single statistic:
| Prop | Type | Description |
|------|------|-------------|
| `title` | `string` | Stat name |
| `value` | `string \| number` | Stat value |
| `subtitle` | `string?` | Additional context |
| `icon` | `string?` | Material Design icon |
| `iconColor` | `string` | Icon background tint |

### ScoreDistributionBar
Memoized bar chart row:
| Prop | Type | Description |
|------|------|-------------|
| `label` | `string` | Score type (Eagles, Birdies, etc.) |
| `count` | `number` | Number of occurrences |
| `total` | `number` | Total for percentage |
| `color` | `string` | Bar color |

### SectionHeader
Memoized section title with icon.

## Score Distribution Colors

| Score Type | Color Variable |
|------------|---------------|
| Eagles | `colors.eagle` |
| Birdies | `colors.birdie` |
| Pars | `colors.par` |
| Bogeys | `colors.bogey` |
| Double Bogeys | `colors.doubleBogey` |
| Triple+ | `colors.error` |

## Interactions

### Compare Stats
```typescript
const handleCompareStats = useCallback(() => {
  if (user?.id && playerId) {
    navigation.navigate('CompareStats', {
      playerId1: user.id,  // Current user
      playerId2: playerId, // Player being viewed
    });
  }
}, [navigation, user?.id, playerId]);
```

### Pull-to-Refresh
Refreshes both player profile and statistics queries.

## Date Formatting

Australian format (DD/MM/YYYY):
```typescript
const formatDate = (dateString: string) => {
  const date = new Date(dateString);
  return date.toLocaleDateString('en-AU', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  });
};
```

## Loading & Error States

### Loading
- Header shown
- Centered activity indicator
- "Loading player profile..." text

### Error / No Player
- Header shown
- Alert circle icon
- "Unable to load player" title
- Error message
- Retry button

### No Statistics
- Profile card shown
- Chart line icon
- "No statistics yet" title
- Message about completing rounds

## UI Components Used

- `View`, `Text`, `ScrollView`, `RefreshControl`, `TouchableOpacity`, `ActivityIndicator` - React Native core
- `SafeAreaView` - react-native-safe-area-context
- `Icon`, `Avatar` - React Native Paper

## Styling Highlights

- White profile card with centered content
- 80px avatar with primary background
- Handicap badge with primary-lighter background
- Compare button full-width primary color
- Stats grid with 50% width cards
- Distribution bars with min 2% width (visibility)
- Performance rows with icon containers
- Recent rounds with date, details, scores columns

## Accessibility

- Back button with role and label
- Compare Stats button with label and hint
- Retry button with descriptive label
- Touch targets minimum 44px
