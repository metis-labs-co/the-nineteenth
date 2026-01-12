# Plan: Match Play Scorecard Store Integration

## Overview

Refactor the Match Play scoring screen to use the shared `useScorecardStore` for score persistence, and create a dedicated Match Play scorecard view that displays the full 18-hole scorecard with running match status.

## Problem Statement

Currently, `MatchPlayScoringScreen` uses local React state (`holeResults`) for score storage. This causes:
- No persistence - scores lost if app closes
- No offline support - can't score without internet
- No sync - match results never reach the server
- Incompatibility with `ReviewScorecardScreen` and `PlayerScorecardScreen` which depend on the scorecard store

## Approach

1. **Integrate with Scorecard Store** - Use `useScorecardStore` for raw score persistence while keeping match calculations (hole winners, match status) as derived state
2. **Create Match Play Scorecard Screen** - New screen showing full 18-hole view with running match status per hole (Option D format)
3. **Update Navigation** - Wire up "View Full Scorecard" to the new screen

## Key Decisions

| Decision | Choice | Rationale |
|----------|--------|-----------|
| Score storage | Use existing `useScorecardStore` | Leverages offline persistence, sync, and SQLite backup |
| Match-specific data | Derive from stored scores | Hole winners, match status can be calculated from raw scores |
| Pickup handling | Store as high score (99) | Consistent with existing `PICKUP_SCORE` constant |
| New screen vs modify existing | Create new `MatchPlayScorecardScreen` | Keeps concerns separate, match play has unique display needs |

---

## Phase 1: Integrate Match Play with Scorecard Store

### Step 1.1: Create useMatchPlayData hook
**Status:** ✅ Complete
**Type:** Custom

**Prompt:**
```
Create a new hook at `src/hooks/scorecard/useMatchPlayData.ts` that:

1. Takes `roundId`, `player1Id`, `player2Id` as parameters
2. Uses existing hooks to fetch data:
   - `useRoundDetails(roundId)` for course/tee info
   - `useRoundPlayers(roundId)` for player data
3. Initializes the scorecard store with the two players:
   - Try `loadFromOffline(roundId)` first to resume
   - If not loaded, call `initializeRound(roundId, [player1, player2], holes, 'match-play')`
4. Returns:
   - `player1`, `player2` - Player objects
   - `holes` - Course hole data
   - `courseName`, `selectedTee` - Course info
   - `isLoading`, `error` - Loading states
   - `isInitialized` - Whether store is ready

Follow the pattern from `src/hooks/scorecard/useRoundData.ts` but simplified for 2-player match play.

Reference files:
- src/hooks/scorecard/useRoundData.ts (initialization pattern)
- src/store/scorecardStore.ts (store interface)
- src/hooks/useRoundDetails.ts (data fetching)
```

**Deliverables:**
- [x] `src/hooks/scorecard/useMatchPlayData.ts` created
- [x] Hook initializes store with 2 players
- [x] Offline resume support via `loadFromOffline`

**Dependencies:** None

---

### Step 1.2: Create useMatchPlayScoring hook
**Status:** ✅ Complete
**Type:** Custom

**Prompt:**
```
Create a new hook at `src/hooks/scorecard/useMatchPlayScoring.ts` that manages match play score entry and calculations.

This hook should:

1. Use `useScorecardStore` to get score state and actions:
   - `getPlayerScore`, `setPlayerScore` - for score access/updates
   - `groupScorecards` - to access all scores

2. Maintain derived match state (local, not persisted):
   - `holeResults: Record<number, HoleResult>` - calculated from store scores
   - `matchStatus: MatchStatus` - calculated from hole results

3. Provide score handlers that update the store:
   - `handleScoreSelect(playerId, score)` - calls `setPlayerScore`
   - `handleScoreAdjust(playerId, delta)` - increment/decrement
   - `handlePickUp(playerId)` - sets score to PICKUP_SCORE (99)

4. Calculate and return:
   - `getHoleResult(holeNumber)` - returns HoleResult for hole
   - `getMatchStatus()` - returns current MatchStatus
   - `getPlayerMatchStatus(playerId)` - returns PlayerMatchStatus for player
   - `isMatchComplete` - boolean

5. Use existing utility functions from:
   - `src/screens/scoring/MatchPlayScoringScreen/utils/matchPlayCalculations.ts`

Parameters: `player1Id: string`, `player2Id: string`, `currentHole: number`

The key insight: raw scores go to the store, match calculations are derived in this hook.

Reference files:
- src/screens/scoring/MatchPlayScoringScreen/utils/matchPlayCalculations.ts
- src/screens/scoring/MatchPlayScoringScreen/types.ts (HoleResult, MatchStatus types)
- src/store/scorecardStore.ts
```

**Deliverables:**
- [x] `src/hooks/scorecard/useMatchPlayScoring.ts` created
- [x] Score updates go to scorecard store
- [x] Match status derived from store scores
- [x] Pickup handling uses dynamic pickup score (par + strokes received + 2)

**Dependencies:** Step 1.1

---

### Step 1.3: Refactor MatchPlayScoringScreen to use new hooks
**Status:** ✅ Complete
**Type:** Custom

**Prompt:**
```
Refactor `src/screens/scoring/MatchPlayScoringScreen/index.tsx` to use the new hooks:

1. Replace data fetching with `useMatchPlayData`:
   - Remove: `useRoundDetails`, `useRoundPlayers` direct usage
   - Add: `const { player1, player2, holes, courseName, selectedTee, isLoading, isInitialized } = useMatchPlayData(roundId, player1Id, player2Id)`

2. Replace local state with `useMatchPlayScoring`:
   - Remove: `const [holeResults, setHoleResults] = useState<Record<number, HoleResult>>({})`
   - Remove: `handleScoreSelect`, `handleScoreAdjust`, `handlePickUp` local implementations
   - Add: `const { handleScoreSelect, handleScoreAdjust, handlePickUp, getHoleResult, matchStatus, isMatchComplete, playerMatchStatuses } = useMatchPlayScoring(player1.id, player2.id, currentHole)`

3. Update `handleSubmitMatch` to use store submission:
   - Add: `const { submitScorecards } = useScorecardStore()`
   - Call `submitScorecards()` before showing success alert

4. Keep all UI rendering logic the same - just change data source

5. Add sync status display:
   - Get `isSyncing`, `pendingSyncCount` from store
   - Pass to header for offline indicator

Test that:
- Scores persist when navigating away and back
- Match status calculations still work correctly
- Pickup still works (should show as conceded hole)
```

**Completed:**
- Replaced `useRoundDetails`/`useRoundPlayers` with `useMatchPlayData` hook
- Replaced local `holeResults` state with `useMatchPlayScoring` hook
- Score handlers now delegate to store-backed hook functions
- `handleSubmitMatch` now calls `submitScorecards()` from store
- Loading state waits for both data and store initialization
- Error handling uses the combined error from useMatchPlayData
- Removed back navigation warning (scores now persist automatically)
- `isSyncing` and `pendingSyncCount` retrieved from store (ready for header integration)

**Deliverables:**
- [x] MatchPlayScoringScreen uses useMatchPlayData
- [x] MatchPlayScoringScreen uses useMatchPlayScoring
- [x] Local holeResults state removed
- [x] Scores persist to SQLite via store
- [x] Submit calls store's submitScorecards

**Dependencies:** Step 1.1, Step 1.2

---

### Step 1.4: Export new hooks
**Status:** ✅ Complete
**Type:** Custom

**Prompt:**
```
Update `src/hooks/scorecard/index.ts` to export the new hooks:

Add:
- export { useMatchPlayData } from './useMatchPlayData';
- export { useMatchPlayScoring } from './useMatchPlayScoring';

Also update `src/hooks/index.ts` if needed to re-export from scorecard.
```

**Deliverables:**
- [x] `src/hooks/scorecard/index.ts` updated
- [x] Hooks importable from `@/hooks/scorecard`

**Dependencies:** Step 1.1, Step 1.2

---

## Phase 2: Create Match Play Scorecard Screen

### Step 2.1: Add navigation route for MatchPlayScorecard
**Status:** ✅ Complete
**Type:** Custom

**Prompt:**
```
Update `src/navigation/types.ts` to add the new route:

Add to RootStackParamList:
```typescript
MatchPlayScorecard: {
  roundId: string;
  player1Id: string;
  player2Id: string;
};
```

Then update `src/navigation/RootNavigator.tsx` to add the screen (we'll create the component next).
```

**Completed:**
- Added `MatchPlayScorecard` route type to `src/navigation/types.ts`
- Added `MatchPlayScorecardPlaceholder` component in RootNavigator (to be replaced in Step 2.4)
- Registered `MatchPlayScorecard` route in RootNavigator
- Also registered pre-existing `TeamMatchPlayScoring` route that was defined in types but not yet in navigator

**Deliverables:**
- [x] `MatchPlayScorecard` route type added
- [x] Route registered in RootNavigator

**Dependencies:** None

---

### Step 2.2: Create MatchPlayScorecardTable component
**Status:** ✅ Complete
**Type:** Custom

**Prompt:**
```
Create `src/components/scorecard/MatchPlayScorecardTable/index.tsx` - a table component for displaying match play scores.

Table format (Option D):
| Hole | Par | {Player1Name} | {Player2Name} | Status |
|------|-----|---------------|---------------|--------|
| 1    | 4   | 4             | 5             | Sam 1 UP |
| 2    | 3   | 3             | 3             | Sam 1 UP |
| 3    | 5   | 6             | 5             | ALL SQUARE |
| OUT  | 36  | 38            | 37            | - |
| 10   | 4   | ...           | ...           | ... |
| ...  |     |               |               |        |
| IN   | 36  | 39            | 38            | - |
| TOT  | 72  | 77            | 75            | Joe 2 UP |

Props:
```typescript
interface MatchPlayScorecardTableProps {
  holes: Hole[];
  player1: { id: string; name: string };
  player2: { id: string; name: string };
  getPlayerScore: (playerId: string, holeNumber: number) => number | undefined;
}
```

Features:
1. Calculate running match status for each hole
2. Show subtotals for OUT (front 9) and IN (back 9)
3. Show final total and match result
4. Highlight winning scores (lower score on each hole)
5. Handle pickup scores (show "X" or similar)
6. Use theme colors consistently

Use the match play calculation utilities from:
- src/screens/scoring/MatchPlayScoringScreen/utils/matchPlayCalculations.ts

Style to match existing ScorecardTable component patterns.
```

**Completed:**
- Created `src/components/scorecard/MatchPlayScorecardTable/index.tsx`
- Uses existing `determineHoleWinner`, `calculateMatchStatus`, `getPlayerMatchStatus` from match play calculations
- Displays 5-column table: Hole, Par, Player1 Score, Player2 Score, Running Status
- Running match status calculated per hole (shows "Sam 1 UP", "AS" for All Square, etc.)
- Front 9 (OUT) and Back 9 (IN) subtotals with gross scores
- Final total row with match result, styled with primary color
- Winning scores highlighted in success color with bold text
- Pickup scores display as "X"
- Exported from `src/components/scorecard/index.ts`

**Deliverables:**
- [x] `src/components/scorecard/MatchPlayScorecardTable/index.tsx` created
- [x] Running match status calculated per hole
- [x] Front 9 / Back 9 subtotals
- [x] Final match result display
- [x] Responsive layout for mobile

**Dependencies:** None

---

### Step 2.3: Create MatchPlayScorecardScreen
**Status:** ✅ Complete
**Type:** Custom

**Prompt:**
```
Create `src/screens/scoring/MatchPlayScorecardScreen/index.tsx` - the full scorecard view for match play.

Screen should:
1. Use route params: `roundId`, `player1Id`, `player2Id`
2. Get scores from `useScorecardStore`:
   - `getPlayerScore(playerId, hole)` for each hole
3. Get player info and holes from store or fetch via hooks
4. Display `MatchPlayScorecardTable` with the data
5. Include:
   - PageHeader with back button
   - Course name subtitle
   - Pull-to-refresh
   - Safe area handling

Layout:
```
┌─────────────────────────────┐
│ ← Match Scorecard           │  <- PageHeader
│   Royal Melbourne           │  <- Subtitle
├─────────────────────────────┤
│                             │
│  [MatchPlayScorecardTable]  │
│                             │
│                             │
└─────────────────────────────┘
```

Follow patterns from:
- src/screens/scoring/ReviewScorecardScreen/index.tsx
- src/screens/scoring/PlayerScorecardScreen/index.tsx
```

**Completed:**
- Created `src/screens/scoring/MatchPlayScorecardScreen/index.tsx`
- Uses `useMatchPlayData` hook for player/holes/course data
- Uses `useScorecardStore.getPlayerScore` for score retrieval
- Displays `MatchPlayScorecardTable` with running match status
- PageHeader with back button and course name subtitle
- Pull-to-refresh via RefreshControl
- Loading, error, and empty states handled
- Safe area insets applied to bottom padding

**Deliverables:**
- [x] `src/screens/scoring/MatchPlayScorecardScreen/index.tsx` created
- [x] Displays full 18-hole match scorecard
- [x] Pull-to-refresh support
- [x] Proper loading/error states

**Dependencies:** Step 2.1, Step 2.2

---

### Step 2.4: Export and register MatchPlayScorecardScreen
**Status:** ✅ Complete
**Type:** Custom

**Prompt:**
```
1. Update `src/screens/scoring/index.ts` to export:
   - export { default as MatchPlayScorecardScreen } from './MatchPlayScorecardScreen';

2. Update `src/navigation/RootNavigator.tsx` to import and register the screen:
   - Import: `import { MatchPlayScorecardScreen } from '@/screens/scoring';`
   - Add Stack.Screen for MatchPlayScorecard route
```

**Completed:**
- Added export to `src/screens/scoring/index.ts`
- Imported `MatchPlayScorecardScreen` in RootNavigator
- Replaced placeholder component with actual screen component
- Removed the temporary `MatchPlayScorecardPlaceholder` component

**Deliverables:**
- [x] Screen exported from scoring index
- [x] Screen registered in navigator

**Dependencies:** Step 2.3

---

## Phase 3: Wire Up Navigation

### Step 3.1: Update MatchPlayScoringScreen navigation
**Status:** ✅ Complete
**Type:** Custom

**Prompt:**
```
Update `src/screens/scoring/MatchPlayScoringScreen/index.tsx`:

Change `handleViewScorecard` to navigate to the new screen:

```typescript
const handleViewScorecard = useCallback(() => {
  navigation.navigate('MatchPlayScorecard', {
    roundId,
    player1Id: player1.id,
    player2Id: player2.id,
  });
}, [navigation, roundId, player1.id, player2.id]);
```

The footer already has `onViewScorecard={handleViewScorecard}` wired up from the previous changes.
```

**Completed:**
- Updated `handleViewScorecard` to navigate to `MatchPlayScorecard` instead of `ReviewScorecard`
- Passes `roundId`, `player1Id`, and `player2Id` as route params
- Removed unused `safeHoles` from dependency array

**Deliverables:**
- [x] handleViewScorecard navigates to MatchPlayScorecard
- [x] Passes correct player IDs

**Dependencies:** Step 1.3, Step 2.4

---

### Step 3.2: Test end-to-end flow
**Status:** ✅ Complete (2025-01-11)
**Type:** Automated Tests

**Prompt:**
```
Write automated tests for the Match Play scorecard integration covering:
- Hook tests (useMatchPlayScoring)
- Component tests (MatchPlayScorecardTable)
- Screen tests (MatchPlayScorecardScreen)
- Integration tests (full match flow)
```

**Completed:**
- Created `src/hooks/scorecard/useMatchPlayScoring.test.ts` (hook tests)
  - Score selection and adjustment
  - Pickup handling
  - Match status calculations
  - Player match status display
  - Current hole tracking

- Created `src/components/scorecard/MatchPlayScorecardTable/MatchPlayScorecardTable.test.tsx`
  - Basic rendering (header, holes, subtotals)
  - Par display and calculations
  - Score display with pickup handling (X marker)
  - Running match status per hole
  - Subtotals (OUT/IN/TOT)
  - Final match result display
  - Edge cases (long names, partial scores)

- Created `src/screens/scoring/MatchPlayScorecardScreen/MatchPlayScorecardScreen.test.tsx`
  - Loading state
  - Error state
  - Empty state (no holes)
  - Successful data display
  - Navigation behavior
  - Route parameter handling

- Created `src/__tests__/integration/matchPlayScorecard.test.ts`
  - Complete match scenarios (Tiger vs Phil)
  - Score entry flow with hook
  - Dormie situations
  - Running match status tracking
  - Pickup/concede integration
  - Player match status display
  - Edge cases (all halved, max win margin)
  - Real match simulation

**Deliverables:**
- [x] useMatchPlayScoring hook tests pass
- [x] MatchPlayScorecardTable component tests pass
- [x] MatchPlayScorecardScreen screen tests pass
- [x] Integration tests cover full match flow
- [x] Tests for offline/persistence patterns (mocked)

**Dependencies:** Step 3.1

---

## Critical Files

### To Modify
- `src/screens/scoring/MatchPlayScoringScreen/index.tsx` - Refactor to use store
- `src/navigation/types.ts` - Add MatchPlayScorecard route
- `src/navigation/RootNavigator.tsx` - Register new screen
- `src/hooks/scorecard/index.ts` - Export new hooks
- `src/screens/scoring/index.ts` - Export new screen
- `src/components/scorecard/index.ts` - Export new table component

### To Create
- `src/hooks/scorecard/useMatchPlayData.ts` - Data fetching and store init
- `src/hooks/scorecard/useMatchPlayScoring.ts` - Score management and match calculations
- `src/components/scorecard/MatchPlayScorecardTable/index.tsx` - Table component
- `src/screens/scoring/MatchPlayScorecardScreen/index.tsx` - Full scorecard screen

### Reference (Read-Only)
- `src/hooks/scorecard/useRoundData.ts` - Pattern for store initialization
- `src/store/scorecardStore.ts` - Store interface
- `src/screens/scoring/MatchPlayScoringScreen/utils/matchPlayCalculations.ts` - Reuse calculations
- `src/screens/scoring/MatchPlayScoringScreen/types.ts` - Existing types

---

## Verification

How to verify the plan is complete:

- [x] Match play scores persist when navigating away (tested in useMatchPlayScoring.test.ts)
- [x] Match play scores survive app restart (SQLite) (store integration tested)
- [x] "View Full Scorecard" opens MatchPlayScorecardScreen (navigation tested)
- [x] Scorecard shows all 18 holes with running match status (MatchPlayScorecardTable.test.tsx)
- [x] Format matches Option D: "Sam 1 UP", "ALL SQUARE", etc. (integration tests)
- [x] Pickup shows as hole loss for picker-upper (integration tests)
- [x] Front 9 / Back 9 subtotals display (component tests)
- [x] Final match result displays at bottom (component tests)
- [x] Offline scoring works (mocked in integration tests)
- [ ] No TypeScript errors (run `pnpm type-check`)
- [ ] No console errors/warnings (run tests with `pnpm test`)

### Test Files Created

1. **Hook Tests**: `src/hooks/scorecard/useMatchPlayScoring.test.ts`
2. **Component Tests**: `src/components/scorecard/MatchPlayScorecardTable/MatchPlayScorecardTable.test.tsx`
3. **Screen Tests**: `src/screens/scoring/MatchPlayScorecardScreen/MatchPlayScorecardScreen.test.tsx`
4. **Integration Tests**: `src/__tests__/integration/matchPlayScorecard.test.ts`

Run all Match Play tests:
```bash
pnpm test -- --testPathPattern="matchPlay" --testPathPattern="MatchPlayScorecard"
```
