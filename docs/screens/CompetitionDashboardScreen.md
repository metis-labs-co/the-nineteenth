# CompetitionDashboardScreen

**File:** `src/screens/player/CompetitionDashboardScreen.tsx`

## Overview

Player's main view of a competition they've joined. Displays competition overview, current standing, round details with scoring access, and leaderboard preview.

## Features

- **Competition Header**: Name, dates, description, status, player count
- **Current Standing**: Position and points display (when available)
- **Round Card**: Current round with Start Round/View Scorecard actions
- **Leaderboard Preview**: Top 3 players + current player (if not in top 3)
- **Pull-to-Refresh**: Refresh competition data and leaderboard
- **Empty States**: Contextual messages when no rounds or scores

## Navigation

| Destination | Trigger |
|-------------|---------|
| Previous screen | Back button |
| `Scorecard` | "Start Round" on available round |
| `ReviewScorecard` | "View Scorecard" on completed round |
| `Leaderboard` | "View Full Leaderboard" button |

## Route Parameters

```typescript
type Props = {
  route: {
    params: {
      id: string; // Competition ID
    }
  }
}
```

## Data Dependencies

### Hooks Used
- `useCompetitionDetails(id)` - Fetches competition, rounds, player count
- `useLeaderboard(competitionId)` - Fetches leaderboard data
- `useSafeAreaInsets()` - Safe area handling

### Query Structure
```typescript
interface CompetitionData {
  competition: Competition;
  rounds: RoundWithCourse[];
  playerCount: number;
}
```

## Component Structure

```
CompetitionDashboardScreen
├── Header (custom)
│   ├── BackButton (IconButton)
│   ├── Title ("Competition")
│   └── HeaderSpacer
└── ScrollView (with RefreshControl)
    ├── CompetitionHeaderCard (component)
    ├── CurrentStandingCard (conditional)
    │   ├── Label ("Your Current Standing")
    │   └── StandingRow
    │       ├── Position (with ordinal: 1st, 2nd)
    │       └── Points
    ├── CurrentRoundSection
    │   ├── SectionTitle ("Current Round")
    │   └── RoundCard (component) or EmptyCard
    └── LeaderboardSection
        ├── SectionTitle ("Leaderboard")
        ├── LeaderboardCard or EmptyCard
        │   └── LeaderboardRow (for each entry)
        │       ├── Position or Trophy
        │       ├── PlayerInfo (name, handicap)
        │       └── Points
        └── ViewFullLeaderboardButton (conditional)
```

## State Management

Query states from React Query:
| Property | Purpose |
|----------|---------|
| `isLoadingCompetition` | Initial competition load |
| `isLoadingLeaderboard` | Initial leaderboard load |
| `isRefetchingCompetition` | Pull-to-refresh competition |
| `isRefetchingLeaderboard` | Pull-to-refresh leaderboard |

### Computed Values

**Current Standing**
```typescript
function getCurrentPlayerStanding(leaderboard, currentPlayerId) {
  // Returns { position: number, points: number } or null
  // Handles tie positions
}
```

**Leaderboard Preview**
```typescript
const leaderboardPreview = useMemo(() => {
  const top3 = sorted.slice(0, 3);
  // If current player not in top 3, add them with gap indicator
  return [...top3, currentPlayer];
}, [leaderboard, currentPlayerId]);
```

## Position Formatting

Ordinal suffixes (1st, 2nd, 3rd, etc.):
```typescript
function formatPosition(position: number): string {
  const suffixes = ['th', 'st', 'nd', 'rd'];
  const v = position % 100;
  return position + (suffixes[(v - 20) % 10] || suffixes[v] || suffixes[0]);
}
```

## Leaderboard Row Features

- Trophy icon (🏆) for 1st place
- Numeric position for others
- "You" label for current player
- Current player row highlighted with primary-lighter background
- Gap indicator (• • •) when current player not in top 3
- Handicap displayed below name
- Points right-aligned

## Interactions

### Pull-to-Refresh
```typescript
const handleRefresh = useCallback(() => {
  refetchCompetition();
  refetchLeaderboard();
}, [refetchCompetition, refetchLeaderboard]);
```

### Round Actions
- **Available rounds**: Navigate to `Scorecard` with roundId and competitionId
- **Completed rounds**: Navigate to `ReviewScorecard` with roundId

### View Leaderboard
Navigate to full `Leaderboard` screen with competitionId

## External Components Used

- `CompetitionHeaderCard` - Displays competition info
- `RoundCard` - Displays round with actions

## UI Components Used

- `View`, `ScrollView`, `RefreshControl`, `Pressable` - React Native core
- `Text`, `Card`, `Button`, `ActivityIndicator`, `Divider`, `IconButton` - React Native Paper
- `useSafeAreaInsets` - Safe area handling

## Loading & Error States

### Loading
- Centered activity indicator
- "Loading competition..." text

### Error
- Warning emoji icon
- "Unable to load competition" title
- Error message or "Competition not found"
- Retry button

## Empty States

### No Rounds
- Golf flag emoji (⛳)
- "No rounds yet" title
- "The organizer hasn't added any rounds..."

### No Scores
- Chart emoji (📊)
- "No scores yet" title
- "Complete a round to see the leaderboard."

## Styling Highlights

- Surface header with shadow
- Current standing card with primary-lighter background
- Standing row with vertical divider
- Leaderboard rows with padding and borders
- Current player row with highlight and negative margin for full-width
- View Full Leaderboard as outlined button
- Empty state cards with centered content

## Accessibility

- Back button with proper label
- Leaderboard rows have descriptive accessibility labels
- View Full Leaderboard button has label and hint
- Position and points announced together
- "You" used instead of player name for current user
