# ScorecardEntryScreen

**File:** `src/screens/scoring/ScorecardEntryScreen.tsx`

## Overview

Offline-first scoring interface for 18-hole rounds. Allows players to enter scores for their entire group hole-by-hole with auto-save to SQLite and sync to Supabase when online.

## Features

- **Current Hole Display**: Par, stroke index, and yardage info
- **Multi-Player Scoring**: Score entry for all players in group
- **Hole Navigation**: Previous/Next buttons for hole traversal
- **Quick Scorecard View**: Mini-scorecard for jumping to any hole
- **Offline Support**: Auto-save to SQLite, sync when online
- **Progress Tracking**: Visual completion indicators
- **Animated Sync Line**: Visual feedback during sync operations

## Navigation

| Destination | Trigger | Condition |
|-------------|---------|-----------|
| Previous screen | Back button | Always |
| `PlayerScorecard` | Tap player card | View individual scorecard |
| `ReviewScorecard` | "View Full Scorecard" or "Review & Submit" | After hole 18 or anytime |

## Route Parameters

```typescript
type Props = {
  route: {
    params: {
      roundId: string;
      competitionId: string; // or 'standalone' for non-competition rounds
    }
  }
}
```

## Data Dependencies

### Store Integration
Uses `useScorecardStore` (Zustand) for all scorecard state:

**State Values:**
- `currentRoundId` - Active round ID
- `currentHole` - Current hole number (1-18)
- `currentPlayers` - Array of players in group
- `holes` - Hole data (par, stroke index, yardage)
- `groupScorecards` - All player scores
- `isLoading`, `isInitialized`, `isOnline`, `isSyncing`
- `pendingSyncCount` - Unsaved changes count
- `syncError` - Last sync error

**Actions:**
- `initializeRound()` - Set up new round with players and holes
- `loadFromOffline()` - Load existing scores from SQLite
- `setCurrentHole()` - Navigate to hole
- `setPlayerScore()` - Set strokes for player/hole
- `updatePlayerHoleScore()` - Update additional stats
- `submitScorecards()` - Final submission
- `resetRound()` - Clear all state

### Hooks Used
- `useOfflineSync()` - Sync status and trigger
- `useScorecardStore()` - All scorecard state
- `useSafeAreaInsets()` - Safe area handling

## Component Structure

```
ScorecardEntryScreen
├── SafeAreaView
│   ├── Header
│   │   ├── BackButton (IconButton)
│   │   ├── HeaderCenter (title + course name)
│   │   └── DeleteButton (standalone only)
│   ├── SyncLineContainer (animated, when syncing)
│   └── ContentArea
│       ├── HoleHeader (component)
│       └── ScrollView
│           ├── PlayerScoreCards (for each player)
│           └── QuickScorecardView (component)
├── NavigationContainer
│   ├── ViewScorecardRow
│   │   └── "View Full Scorecard" link
│   └── NavButtonsRow
│       ├── PreviousButton
│       └── NextHoleButton or ReviewSubmitButton
```

## State Management

| State | Type | Purpose |
|-------|------|---------|
| `isSubmitting` | `boolean` | Submit loading state |
| `fetchError` | `string \| null` | Data loading error |
| `courseName` | `string \| null` | Course name for header |
| `isDeleting` | `boolean` | Delete loading state |
| `syncLineAnim` | `Animated.Value` | Sync line animation |

## Initialization Flow

1. Check if store already initialized for this round
2. If different round, reset store first
3. Try to load from offline SQLite
4. If not found, fetch from Supabase:
   - Competition players
   - Round with course data
   - Transform to internal types
5. Initialize round with data

## Score Entry Flow

1. User selects score on `PlayerScoreCard`
2. `handleScoreSelect` called with playerId and strokes
3. `setPlayerScore` updates store and SQLite
4. Pending sync count increments
5. Background sync saves to Supabase when online

## Navigation Behavior

### Previous Hole
- Disabled on hole 1
- Decrements `currentHole`

### Next Hole / Submit
- Holes 1-17: "Next Hole" advances to next hole
- Hole 18: "Review & Submit" shows confirmation
  - If incomplete: Alert asking to submit anyway
  - Navigates to `ReviewScorecard`

### Back Navigation
- Warns if pending sync count > 0
- Triggers sync before leaving
- Handles Android back button

## Standalone Rounds

When `competitionId === 'standalone'`:
- Shows delete button in header
- Delete clears Supabase round
- Cleans up local SQLite data
- Resets store

## External Components Used

- `PlayerScoreCard` - Individual player score entry
- `QuickScorecardView` - Mini scorecard for hole jumping
- `HoleHeader` - Displays current hole info

## Default Holes Fallback

If course has no hole data:
```typescript
const DEFAULT_HOLES: Hole[] = Array.from({ length: 18 }, (_, i) => ({
  number: i + 1,
  par: [4, 3, 5, 4, 4, 3, 4, 5, 4, ...][i],
  strokeIndex: [7, 15, 1, 11, ...][i],
  yardages: { white: 350 + i * 15 },
}));
```

## Sync Animation

Animated line that sweeps across screen during sync:
```typescript
Animated.loop(
  Animated.sequence([
    Animated.timing(syncLineAnim, { toValue: 1, duration: 1000 }),
    Animated.timing(syncLineAnim, { toValue: 0, duration: 0 }),
  ])
)
```

## Loading & Error States

### Loading
- Centered activity indicator
- "Loading scorecard..." text

### Fetch Error
- "Unable to Load Scorecard" title
- Error message
- Go Back and Retry buttons

### Hole Data Error
- "Failed to load hole data" message
- Go Back button

## UI Components Used

- `View`, `ScrollView`, `Alert`, `BackHandler`, `Animated` - React Native core
- `Text`, `Button`, `ActivityIndicator`, `IconButton` - React Native Paper
- `SafeAreaView` - react-native-safe-area-context

## Styling Highlights

- Surface background header with border
- Centered header title with course subtitle
- Animated sync line (primary color) over gray background
- Navigation container with surface background and shadow
- "View Full Scorecard" as underlined text link
- Primary "Next Hole" button, success "Review & Submit"
- Delete button in error color (standalone only)

## Accessibility

- Back button via IconButton
- Delete button with accessibility label
- Player cards are interactive
- Navigation buttons properly labeled
