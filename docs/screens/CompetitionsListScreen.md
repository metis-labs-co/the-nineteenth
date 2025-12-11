# CompetitionsListScreen

**File:** `src/screens/competitions/CompetitionsListScreen.tsx`

## Overview

List view of all competitions the user has created or joined. Features toggle between organized and joined competitions with quick actions to create or join new competitions.

## Features

- **Tab Toggle**: Switch between "My Comps" (organized) and "Joined" (participating)
- **Competition Cards**: Name, status, rounds count, player count, start date
- **Quick Actions**: Create and Join buttons in header
- **Role Display**: Shows if user is Organizer or Player
- **Status Badges**: Color-coded competition status
- **Pull-to-Refresh**: Refresh current tab's competitions

## Navigation

| Destination | Trigger | Condition |
|-------------|---------|-----------|
| `CreateCompetition` | "+ New" button | Always |
| `JoinCompetition` | "Join" button | Always |
| `CompetitionDetail` | Tap card | When user is organizer |
| `CompetitionDashboard` | Tap card | When user is player |

## Data Dependencies

### Hooks Used
- `useAuth()` - Get current user ID
- `useQuery()` - Fetch competitions (x2)
- `useSafeAreaInsets()` - Safe area handling

### Queries

**My Competitions (Organized)**
```typescript
// Fetches from competitions where organizer_id = user.id
// Includes rounds count and players count
```

**Joined Competitions**
```typescript
// Fetches from competition_players where player_id = user.id
// Joins to competitions, excludes where user is organizer
// Only status = 'accepted'
```

## Component Structure

```
CompetitionsListScreen
├── Header
│   ├── Title ("Competitions")
│   └── HeaderActions
│       ├── JoinButton (outlined)
│       └── CreateButton (primary)
├── TabContainer
│   ├── MyCompsTab (with count)
│   └── JoinedTab (with count)
└── ScrollView (with RefreshControl)
    ├── LoadingContainer (conditional)
    ├── EmptyState (conditional)
    └── CompetitionsList
        └── CompetitionCards
```

## State Management

| State | Type | Purpose |
|-------|------|---------|
| `activeTab` | `'my' \| 'joined'` | Current tab selection |

## Competition Data Type

```typescript
interface CompetitionItem {
  id: string;
  name: string;
  status: string;
  rounds: number;
  players: number;
  isOrganizer: boolean;
  startDate: string | null;
}
```

## Status Configuration

| Status | Color | Label |
|--------|-------|-------|
| `active` / `in-progress` | success | "Active" |
| `completed` | textSecondary | "Completed" |
| `upcoming` | info | "Upcoming" |
| `draft` | warning | "Draft" |

## Card Navigation Logic

```typescript
const handleViewCompetition = (competition) => {
  if (competition.isOrganizer) {
    navigation.navigate('CompetitionDetail', { id: competition.id });
  } else {
    navigation.navigate('CompetitionDashboard', { id: competition.id });
  }
};
```

## Empty States

### My Comps Tab
- Title: "No Competitions Created"
- Message: "Create your first competition to get started."
- Action: "Create Competition"

### Joined Tab
- Title: "No Competitions Joined"
- Message: "Join a competition using an invite code from an organizer."
- Action: "Join Competition"

## Date Formatting

Australian format:
```typescript
const formatDate = (dateString) => {
  return new Date(dateString).toLocaleDateString('en-AU', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
};
// Example: "7 Dec 2025"
```

## UI Components Used

- `View`, `ScrollView`, `TouchableOpacity`, `RefreshControl`, `ActivityIndicator`, `Pressable` - React Native core
- `Text` - React Native Paper
- `useSafeAreaInsets` - Safe area context
- `EmptyState` - Custom component

## Styling Highlights

- White header with border bottom
- Join button outlined with primary border
- Create button solid primary
- Segmented tab control with shadow on active
- Card with pressed state (gray50 background)
- Status badges with 20% opacity backgrounds
- Role text (Organizer/Player) in footer
- "View >" link in primary color

## Accessibility

- Join and Create buttons with roles and labels
- Tab buttons with roles and labels
- Competition cards with descriptive labels
