# ReviewScorecardScreen

**File:** `src/screens/player/ReviewScorecardScreen.tsx`

## Overview

Full scorecard table view showing all 18 holes for all players in the group. Features score visualization with birdie/bogey indicators, subtotals, totals, and online/offline submission capabilities.

## Features

- **Scorecard Table**: Horizontal scrolling table with all holes
- **Score Indicators**: Circles for birdies/eagles, squares for bogeys
- **Subtotals**: Front 9 (OUT) and Back 9 (IN) rows
- **Totals**: Gross, Net, and Stableford points
- **Offline Support**: Saves locally when offline, syncs when online
- **Edit Access**: Return to scoring to modify entries
- **Offline Indicator**: Shows sync status and pending count

## Navigation

| Destination | Trigger | Condition |
|-------------|---------|-----------|
| Previous (Scoring) | Back button or "Edit Scores" | Always |
| `Leaderboard` | Successful submission | When competitionId exists |
| Home | Successful submission | When no competitionId |

## Route Parameters

```typescript
type Props = {
  route: {
    params: {
      holes?: Hole[]; // Optional hole data
      competitionId?: string; // For navigation after submit
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

**Actions:**
- `submitScorecards()` - Submit all scores
- `resetRound()` - Clear store after submission

### Hooks Used
- `useNetInfo()` - Network connectivity status
- `useSafeAreaInsets()` - Safe area handling

## Component Structure

```
ReviewScorecardScreen
├── SafeAreaView
│   ├── Header
│   │   ├── BackButton (chevron + "Scoring")
│   │   ├── Title ("Scorecard")
│   │   └── HeaderSpacer
│   ├── OfflineIndicator (component)
│   └── ScrollView (vertical + RefreshControl)
│       └── ScorecardTable (horizontal scroll)
│           ├── HeaderRow (Hole | SI | Par | Players...)
│           ├── Front9Rows (holes 1-9)
│           ├── OutRow (subtotal)
│           ├── Back9Rows (holes 10-18)
│           ├── InRow (subtotal)
│           ├── GrossRow
│           ├── NetRow
│           └── StablefordRow
├── ActionBar (Surface)
│   ├── EditButton (outlined)
│   └── SubmitButton (contained)
```

## State Management

| State | Type | Purpose |
|-------|------|---------|
| `isSubmitting` | `boolean` | Submission loading state |
| `isRefreshing` | `boolean` | Pull-to-refresh state |
| `pendingSyncs` | `number` | Count of pending offline syncs |
| `syncError` | `string \| null` | Last sync error message |

## Score Visualization

### Score Indicators
| Difference | Shape | Color |
|------------|-------|-------|
| -3 or less | Double circle | eagle |
| -2 | Double circle | eagle |
| -1 (Birdie) | Circle | birdie |
| 0 (Par) | None | par |
| +1 (Bogey) | Square | bogey |
| +2+ (Double+) | Double square | doubleBogey |
| 10+ (Pickup) | "P" | error |

### Helper Functions
```typescript
function calculateStablefordPoints(strokes, par, strokesReceived): number
function getStrokesReceived(handicap, strokeIndex): number
function getScoreColor(strokes, par): string
```

## Table Columns

| Column | Width | Content |
|--------|-------|---------|
| Hole | 44px | Hole number |
| SI | 36px | Stroke Index |
| Par | 44px | Par value |
| Player | 72px each | Score with indicator |

## Submission Flow

### Online Submission
1. User taps "Submit All Scores"
2. Confirmation alert shows
3. `submitScorecards()` called
4. On success: Alert shown, navigate to Leaderboard
5. On error: Alert with error message

### Offline Submission
1. User taps "Save Offline"
2. Confirmation alert mentions offline status
3. Scores saved locally
4. Success alert with "saved locally" message
5. Navigate to Leaderboard (scores sync when online)

## Offline Status Handling

```typescript
const getOfflineStatus = () => {
  if (syncError) return 'error';
  if (isSubmitting) return 'syncing';
  if (!isOnline) return 'offline';
  return 'online';
};
```

## Loading & Empty States

### Loading (no players)
- Centered activity indicator
- "Loading scorecard..." text

### Empty (no scores)
- "No Scores Recorded" title
- Message about entering scores
- "Enter Scores" button

## UI Components Used

- `View`, `ScrollView`, `RefreshControl`, `Alert`, `TouchableOpacity` - React Native core
- `Text`, `Button`, `ActivityIndicator`, `Surface` - React Native Paper
- `SafeAreaView` - react-native-safe-area-context
- `MaterialCommunityIcons` - Vector icons
- `OfflineIndicator` - Custom component

## Styling Highlights

- Dark gray header row (gray800)
- Alternating column backgrounds
- Score cells with colored borders for indicators
- Subtotal rows in gray200
- Total rows in gray800 (dark)
- Stableford row in primary color
- Action bar fixed at bottom with shadow
- Edit button outlined, Submit button success green

## Accessibility

- Back button with role and label
- Edit and Submit buttons with labels and hints
- Submit hint changes based on online status
