# CompetitionDetailScreen

**File:** `src/screens/competitions/CompetitionDetailScreen/index.tsx`

## Overview

Admin view for managing a competition. Displays competition information, rounds with scoring availability, and quick access to leaderboards. Organizers can edit competition details and start scoring for available rounds.

## Features

- **Competition Overview**: Name, description, dates, handicap system, player count
- **Invite Code Display**: Prominent invite code for sharing
- **Rounds Management**: List with status badges and availability indicators
- **Sequential Round Unlocking**: Rounds unlock when previous rounds complete
- **Pull-to-Refresh**: Refresh competition data
- **Edit Access**: Edit button for organizers only

## Navigation

| Destination | Trigger | Condition |
|-------------|---------|-----------|
| Previous screen | Back button | Always |
| `EditCompetition` | Edit (pencil) button | Organizer only |
| `Leaderboard` | "Leaderboard" button | Always |
| `Scorecard` | Tap available round | Round is available |
| `ReviewScorecard` | Tap completed round | Round is completed |

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
- `useCompetitionDetails(id)` - Custom hook wrapping React Query
- `useAuth()` - Get current user for organizer check
- `useSafeAreaInsets()` - Safe area handling

### Query Structure
```typescript
interface CompetitionData {
  competition: Competition;
  rounds: RoundWithCourse[];
  playerCount: number;
}
```

### Data Fetching
Fetches from three Supabase tables:
1. `competitions` - Competition details
2. `rounds` with `courses` join - Rounds with course info
3. `competition_players` - Player count (accepted only)

## Component Structure

```
CompetitionDetailScreen
├── Header (custom)
│   ├── BackButton (IconButton)
│   ├── Title ("Competition Details")
│   └── EditButton (IconButton) or Spacer
├── ScrollView (with RefreshControl)
│   ├── HeaderCard
│   │   ├── CompetitionName
│   │   ├── Description (optional)
│   │   ├── InfoGrid (start date, end date, handicap, players)
│   │   └── InviteCodeContainer
│   ├── ActionsRow
│   │   └── LeaderboardButton
│   └── RoundsSection
│       ├── SectionTitle ("Rounds")
│       └── RoundsList or EmptyCard
│           └── RoundListItem (for each round)
```

## State Management

State managed by React Query:
| Property | Purpose |
|----------|---------|
| `isLoading` | Initial load indicator |
| `error` | Error state |
| `isRefetching` | Pull-to-refresh indicator |
| `refetch` | Refresh function |

### Computed Values
```typescript
const isOrganizer = useMemo(() => {
  return competitionData.competition.organizer_id === user?.id;
}, [competitionData, user]);
```

## Round Availability Logic

```typescript
function isRoundAvailableForScoring(round, allRounds): boolean {
  const previousRounds = allRounds.filter(r => r.round_number < round.round_number);

  // First round is always available
  if (previousRounds.length === 0) return true;

  // Check if all previous rounds are completed
  return previousRounds.every(r => r.status === 'completed');
}
```

## Round Status Configuration

| Status | Label | Background | Text Color |
|--------|-------|------------|------------|
| `upcoming` | "Upcoming" | infoLight | infoDark |
| `in-progress` | "In Progress" | successLight | successDark |
| `completed` | "Completed" | gray200 | gray700 |

## Handicap System Labels

| Value | Display |
|-------|---------|
| `honor` | "Honor System" |
| `whs` | "WHS" |
| `gross-only` | "Gross Only" |

## RoundListItem Component

Internal component for rendering each round:

| Prop | Type | Description |
|------|------|-------------|
| `round` | `RoundWithCourse` | Round data with course |
| `isAvailable` | `boolean` | Can scoring start |
| `isCompleted` | `boolean` | Round finished |
| `statusConfig` | Object | Styling config |
| `onStartRound` | `(id) => void` | Start scoring handler |
| `onViewScorecard` | `(id) => void` | View scorecard handler |

### Round Item Behavior
- **Completed**: Navigates to ReviewScorecard
- **Available**: Navigates to Scorecard
- **Locked**: Shows "Complete previous rounds to unlock"

## UI Components Used

- `View`, `ScrollView`, `RefreshControl`, `Pressable` - React Native core
- `Text`, `Card`, `Button`, `ActivityIndicator`, `IconButton` - React Native Paper
- `useSafeAreaInsets` - Safe area handling

## Date Formatting

Australian format (DD/MM/YYYY):
```typescript
function formatDateAustralian(dateString: string | null): string {
  // Returns "DD/MM/YYYY" or "Date TBD"
}
```

## Loading & Error States

### Loading
- Centered activity indicator
- "Loading competition..." text

### Error
- Large exclamation icon
- "Unable to load competition" title
- Error message or "Competition not found"
- Retry button

## Empty Rounds State

When no rounds exist:
- "18" as visual icon
- "No rounds yet" title
- Context-aware message:
  - Organizer: "Add a round to get started..."
  - Player: "The organizer hasn't added any rounds yet."

## Styling Highlights

- Surface background with shadow on header
- Card-based layout with rounded corners
- Invite code in highlighted container
- Round numbers in circular primary-light badges
- Status badges with color-coded backgrounds
- Locked rounds show 60% opacity
- Chevron for available rounds, dash for locked

## Accessibility

- Back and edit buttons have proper labels
- Round items have descriptive accessibility labels including:
  - Round number and course name
  - Current status
  - Availability state
- Accessibility hints for tap actions
- Disabled state communicated
