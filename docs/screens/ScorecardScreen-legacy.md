# ScorecardScreen (Legacy/Example)

**File:** `src/screens/player/scorecard.tsx`

## Overview

**Note:** This is a legacy/example screen demonstrating how to use the Zustand store and TypeScript types. The production scorecard entry is handled by `ScorecardEntryScreen.tsx`.

A simpler scorecard entry screen showing basic score input for all players on a single hole at a time with progress tracking and quick navigation.

## Features

- **Progress Bar**: Visual progress through 18 holes
- **Hole Info Display**: Current hole number, par, and stroke index
- **Player Cards**: Score display and input buttons per player
- **Score Input**: Tap buttons 1-8 for stroke count
- **Quick Navigation**: Horizontal scroll to jump to any hole
- **Previous/Next Navigation**: Move between holes
- **Submit Button**: Appears on hole 18

## Props

```typescript
interface ScorecardScreenProps {
  roundId: string;
  players: Player[];
  holes: Hole[];
}
```

## Data Dependencies

### Store Integration
Uses `useScorecardStore` (Zustand):

**State Values:**
- `currentHole` - Current hole number (1-18)
- `groupScorecards` - Map of player ID to scorecard

**Actions:**
- `initializeScorecard(roundId, players)` - Setup scorecard
- `setCurrentHole(holeNumber)` - Navigate to hole
- `setPlayerScore(playerId, holeNumber, score)` - Record score
- `getPlayerScore(playerId, holeNumber)` - Retrieve score
- `isHoleComplete(holeNumber)` - Check completion status
- `submitScorecard()` - Submit all scores

## Component Structure

```
ScorecardScreen
├── SafeAreaView
│   ├── ProgressContainer
│   │   ├── ProgressBar (with fill)
│   │   └── ProgressText ("Hole X of 18 • Y complete")
│   ├── HoleHeader
│   │   ├── HoleNumber
│   │   └── HolePar ("Par X • Index Y")
│   ├── PlayersContainer (ScrollView)
│   │   ├── PlayerCards
│   │   │   ├── PlayerHeader (name, handicap, score display)
│   │   │   └── ScoreButtons (1-8)
│   │   └── QuickNavContainer
│   │       ├── QuickNavTitle
│   │       └── QuickNav (horizontal scroll)
│   └── NavigationContainer
│       ├── PreviousButton
│       └── NextButton / SubmitButton
```

## State Management

| State | Type | Purpose |
|-------|------|---------|
| `isSubmitting` | `boolean` | Submit loading state |

## Score Input

Score buttons 1-8 available for each player. Tapping a button:
1. Creates `HoleScore` object with strokes only
2. Calls `setPlayerScore(playerId, currentHole, score)`
3. Active button highlighted with primary color

## Navigation Flow

- **Previous**: Decrements hole (disabled on hole 1)
- **Next**: Increments hole (shown on holes 1-17)
- **Review & Submit**: Shows on hole 18, calls `submitScorecard()`

## Quick Navigation

Horizontal scroll showing all 18 holes:
- Current hole: Primary border with light background
- Completed holes: Success border with checkmark
- Incomplete holes: Default styling

## Progress Calculation

```typescript
const completedHoles = holes.filter((hole) => isHoleComplete(hole.number)).length;
const progress = (completedHoles / 18) * 100;
```

## Loading State

Shows centered `ActivityIndicator` when `currentHoleData` is undefined.

## UI Components Used

- `View`, `Text`, `ScrollView`, `TouchableOpacity`, `SafeAreaView`, `ActivityIndicator`, `StyleSheet` - React Native core

## Styling Highlights

- Progress bar with primary color fill
- Large hole number in h1 typography
- Player cards with border and shadow
- Score buttons in row with equal sizing
- Active score button highlighted primary
- Quick nav buttons show completion state
- Bottom navigation with two button layout
- Success green for final submit button

## Differences from Production Screen

| Feature | This Screen | ScorecardEntryScreen |
|---------|-------------|----------------------|
| Score buttons | 1-8 only | 1-9+ with picker mode |
| Optional fields | None | Putts, FIR, GIR |
| Group view | Basic cards | Quick scorecard view |
| Navigation | Basic prev/next | Multi-mode navigation |
| Offline | Basic | Full offline support |
| Review | Direct submit | Review screen flow |

## Purpose

This file serves as:
1. Example implementation for developers
2. Reference for Zustand store usage
3. TypeScript type demonstration
4. Simpler alternative for basic use cases
