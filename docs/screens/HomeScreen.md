# HomeScreen

**File:** `src/screens/HomeScreen.tsx`

## Overview

The HomeScreen is the main landing screen of the app, providing role-based access to different features through a tabbed interface.

## Features

- **Tab Navigation**: Two tabs - "Admin Setup" and "Player Scoring"
- **Admin Tab**: Create new competitions and view recently organized competitions
- **Player Tab**: View joined competitions and join new ones via invite code
- **Pull-to-refresh**: Refresh competition data

## Navigation

| Destination | Trigger | Tab |
|-------------|---------|-----|
| `CreateCompetition` | "Get Started" button | Admin |
| `CompetitionDetail` | Tap competition card | Admin |
| `CompetitionDashboard` | Tap competition card | Player |
| `JoinCompetition` | "Enter Invite Code" button | Player |

## Data Dependencies

### Hooks Used
- `useAuth()` - Get current user ID
- `useQuery` - Fetch competitions data

### Queries
1. **recentCompetitions** (Admin tab)
   - Fetches competitions where `organizer_id` matches current user
   - Orders by `created_at` descending
   - Limits to 10 results

2. **myCompetitions** (Player tab)
   - Fetches competitions where user is a player with `status: 'accepted'`
   - Excludes competitions where user is organizer

## Component Structure

```
HomeScreen
├── Header ("Welcome")
├── TabSelector (Admin Setup | Player Scoring)
└── TabContent
    ├── AdminTabContent
    │   ├── CreateCompetitionCard (CTA)
    │   └── RecentCompetitionsSection
    │       └── CompetitionCard (list)
    └── PlayerTabContent
        ├── MyCompetitionsSection
        │   └── ActiveCompetitionCard (list)
        └── InviteCodeSection (CTA)
```

## State Management

| State | Type | Purpose |
|-------|------|---------|
| `activeTab` | `'admin' \| 'player'` | Current selected tab |

## Interactions

### Admin Tab
1. **Create Competition**: Navigates to 4-step wizard
2. **View Competition**: Opens admin CompetitionDetail screen

### Player Tab
1. **View Competition**: Opens player CompetitionDashboard
2. **Join Competition**: Navigates to JoinCompetitionScreen

## UI Components Used
- `SafeAreaView` - Safe area handling
- `ScrollView` with `RefreshControl` - Pull-to-refresh
- `TouchableOpacity` - Pressable elements
- Custom styled cards with shadows

## Accessibility
- Tab buttons have `accessibilityRole="tab"` and proper labels
- All interactive elements have accessibility hints
- Minimum touch target of 44px
