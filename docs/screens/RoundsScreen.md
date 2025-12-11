# RoundsScreen

**File:** `src/screens/rounds/RoundsScreen.tsx`

## Overview

Main tab screen for managing rounds to score. Shows active and historical rounds with a prominent "Score New Round" button. Supports both competition rounds and standalone practice rounds.

## Features

- **Score New Round Button**: Prominent CTA to start a new round
- **Tab Toggle**: Switch between Active and History views
- **Competition Rounds**: Rounds from competitions user has joined
- **Standalone Rounds**: User's own practice rounds
- **Status Badges**: Visual indicators for In Progress, Upcoming, Completed
- **Progress Tracking**: Shows holes completed for in-progress rounds
- **Pull-to-Refresh**: Refresh rounds list

## Navigation

| Destination | Trigger |
|-------------|---------|
| `Scorecard` | Tap any round card |

## Data Dependencies

### Hooks Used
- `useAuth()` - Get current user and player
- `useQuery()` - Fetch rounds data
- `useScorecardStore()` - Initialize new rounds

### Query Structure
Fetches two types of rounds:
1. **Competition Rounds**: Via `competition_players` joined with `competitions.rounds`
2. **Standalone Rounds**: Via `rounds` where `user_id` matches and `competition_id` is null

## Component Structure

```
RoundsScreen
├── SafeAreaView
│   └── ScrollView (with RefreshControl)
│       ├── Header ("Rounds")
│       ├── NewRoundButton
│       │   ├── IconContainer (plus icon)
│       │   ├── TextContainer (title + subtitle)
│       │   └── ChevronRight
│       └── Section
│           ├── TabContainer
│           │   ├── ActiveTab
│           │   └── HistoryTab
│           ├── SectionSubtitle
│           └── RoundsList or EmptyState
│               └── RoundCards
└── NewRoundBottomSheet (modal)
```

## State Management

| State | Type | Purpose |
|-------|------|---------|
| `isBottomSheetVisible` | `boolean` | New round modal visibility |
| `isStartingRound` | `boolean` | Round creation loading state |
| `selectedTab` | `'active' \| 'history'` | Current tab selection |

## Round Data Type

```typescript
interface RoundItem {
  id: string;
  roundNumber: number;
  totalRounds: number;
  gameType: string;
  status: string;
  date?: string;
  teeTime?: string;
  isStandalone: boolean;
  competition?: {
    id: string;
    name: string;
  };
  course: {
    id: string;
    name: string;
    city?: string;
    state?: string;
  };
  holesCompleted: number;
  totalHoles: number;
}
```

## Tab Behavior

### Active Tab
- Rounds with status !== 'completed'
- Sorted: In-progress first, then by date
- Subtitle: "Rounds that need scoring"

### History Tab
- Rounds with status === 'completed'
- Sorted: Most recent first by date
- Subtitle: "Completed rounds"

## Status Configuration

| Status | Background | Text Color |
|--------|------------|------------|
| `in-progress` | successLight | successDark |
| `upcoming` | gray200 | gray600 |
| `completed` | primaryLight | primaryDark |

## New Round Flow

1. User taps "Score New Round"
2. `NewRoundBottomSheet` opens
3. User selects course (step 1)
4. User selects partners (step 2)
5. `handleStartNewRound()` called:
   - Creates round in Supabase (standalone, no competition)
   - Initializes scorecard store
   - Navigates to Scorecard screen

## Game Type Formatting

| Value | Display |
|-------|---------|
| `stableford` | "Stableford" |
| `stroke` | "Stroke Play" |
| `match-play` | "Match Play" |
| `ambrose` | "Ambrose" |
| `best-ball` | "Best Ball" |

## Date Formatting

```typescript
const formatDate = (dateString?: string) => {
  return new Date(dateString).toLocaleDateString('en-AU', {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
  });
};
// Example: "Sat, 7 Dec"
```

## Round Card Features

- **Status Badge**: Color-coded status indicator
- **Round Pill**: "Round X of Y" (competition rounds only)
- **Competition Name**: Or "Practice Round" for standalone
- **Course Row**: Map pin icon + course name
- **Details Row**: Date/time + game type badge
- **Progress Bar**: Only for in-progress rounds

## Empty States

### No Active Rounds
- Golf icon in circle
- "No Active Rounds" title
- "Join a competition or start a new round..." message

### No Completed Rounds
- Golf icon in circle
- "No Completed Rounds" title
- "Complete some rounds to see your history" message

## UI Components Used

- `View`, `Text`, `ScrollView`, `RefreshControl`, `TouchableOpacity`, `Alert`, `Dimensions` - React Native core
- `SafeAreaView` - react-native-safe-area-context
- Tabler Icons: `IconPlus`, `IconChevronRight`, `IconGolf`, `IconMapPin`, `IconCalendar`
- `NewRoundBottomSheet` - Custom modal component

## Styling Highlights

- Primary color "Score New Round" button with shadow
- White icon container with 20% opacity background
- Tab toggle with segmented control style
- Active tab: white background with shadow
- Round cards with border and shadow
- Progress bar for in-progress rounds (success color fill)
- Game type badge with primary-lighter background

## Accessibility

- "Score new round" button with accessibility label
- Round cards with descriptive labels including action verb
- Touch targets meet minimum size requirements
