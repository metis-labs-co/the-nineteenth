# MyStatisticsScreen

**File:** `src/screens/profile/MyStatisticsScreen.tsx`

## Overview

Comprehensive statistics dashboard for the current user's golf performance. Displays rounds played, scoring averages, score distribution, best performances, favourite course, recent activity, and courses played history.

## Features

- **Overview Stats**: Rounds, competitions entered, wins, holes played
- **Averages**: Score per round, Stableford points, per hole, par-or-better %
- **Score Distribution**: Visual bars for eagles through triple+
- **Best Performances**: Best gross score, best Stableford, birdie rate
- **Favourite Course**: Most played course with stats
- **Recent Activity**: Last 5 rounds with details
- **Courses Played**: Top 5 courses with play count and averages
- **Pull-to-Refresh**: Refresh all statistics

## Navigation

| Destination | Trigger |
|-------------|---------|
| Previous screen | "← Back" button |

## Data Dependencies

### Hooks Used
- `useAuth()` - Get current user ID
- `usePlayerStatistics(userId)` - Fetch statistics data

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
  favouriteCourse: FavouriteCourse | null;
  recentRounds: RecentRound[];
  courseStats: CourseStats[];
}
```

## Component Structure

```
MyStatisticsScreen
├── SafeAreaView
│   ├── Header
│   │   ├── HeaderRow
│   │   │   ├── BackButton ("← Back")
│   │   │   └── RefreshButton
│   │   ├── HeaderTitle ("My Statistics")
│   │   └── HeaderSubtitle
│   └── ScrollView (with RefreshControl)
│       ├── OverviewSection
│       │   └── StatsGrid (4 StatCards)
│       ├── AveragesSection
│       │   └── StatsGrid (4 StatCards)
│       ├── ScoreDistributionSection
│       │   └── DistributionCard (6 bars)
│       ├── BestPerformancesSection
│       │   └── PerformanceCard (3 rows)
│       ├── FavouriteCourseSection (conditional)
│       │   └── CourseCard
│       ├── RecentActivitySection (conditional)
│       │   └── RecentCard (5 rows)
│       └── CoursesPlayedSection (conditional)
│           └── CoursesListCard (5 rows)
```

## Internal Components

### StatCard
Memoized statistics card:
| Prop | Type | Description |
|------|------|-------------|
| `title` | `string` | Stat label |
| `value` | `string \| number` | Main value |
| `subtitle` | `string?` | Context text |
| `icon` | `string?` | Material icon |
| `iconColor` | `string` | Icon background tint |

### ScoreDistributionBar
Memoized horizontal bar:
| Prop | Type | Description |
|------|------|-------------|
| `label` | `string` | Score type name |
| `count` | `number` | Occurrences |
| `total` | `number` | Total for percentage |
| `color` | `string` | Bar fill color |

### SectionHeader
Memoized section title with optional icon.

## Sections Detail

### Overview (4 cards in 2x2 grid)
| Stat | Icon | Color |
|------|------|-------|
| Rounds Played | flag-checkered | primary |
| Competitions | trophy-outline | warning |
| Wins | trophy | success |
| Holes Played | golf-tee | info |

### Averages (4 cards in 2x2 grid)
| Stat | Icon | Color |
|------|------|-------|
| Avg Score | counter | primary |
| Avg Points | star | warning |
| Per Hole | target | info |
| Par or Better | check-circle | success |

### Score Distribution (6 bars)
| Label | Color |
|-------|-------|
| Eagles | colors.eagle |
| Birdies | colors.birdie |
| Pars | colors.par |
| Bogeys | colors.bogey |
| Double Bogeys | colors.doubleBogey |
| Triple+ | colors.error |

### Best Performances (3 rows)
- **Best Gross Score**: Trophy icon (success), course name, date
- **Best Stableford**: Star icon (warning), points, course, date
- **Birdie Rate**: Bird icon (birdie), percentage, total count

### Favourite Course
- Golf icon with course name
- Three stat columns: Rounds | Avg Score | Best
- Vertical dividers between stats

### Recent Activity (5 rows)
- Date | Course + Competition | Gross + Points

### Courses Played (5 rows)
- Course name | Times played | Average score

## Date Formatting

Australian format (DD/MM/YYYY):
```typescript
const formatDate = (dateString: string) => {
  return new Date(dateString).toLocaleDateString('en-AU', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  });
};
```

## Loading & Error States

### Loading
- Header with back button
- Centered activity indicator
- "Loading your statistics..." text

### Error
- Header with back button
- Warning emoji
- "Unable to load statistics" title
- Error message
- Retry button

### Empty (No Rounds)
- Header with back button
- Chart emoji (📊)
- "No statistics yet" title
- Message about completing rounds

## UI Components Used

- `View`, `Text`, `ScrollView`, `RefreshControl`, `TouchableOpacity`, `ActivityIndicator` - React Native core
- `SafeAreaView` - react-native-safe-area-context
- `Icon` - React Native Paper

## Styling Highlights

- White header with border bottom
- Back and Refresh buttons in primary color
- Stats grid with 50% width cards
- Cards with white background and shadows
- Distribution bars with min 2% width
- Performance icons in circular containers
- Favourite course with stat dividers
- Recent/courses rows with bottom borders
- Last row in lists has no bottom border

## Accessibility

- Back button with role and label
- Refresh button with role and label (disabled state)
- Retry button with descriptive label
- Touch targets meet minimum size
