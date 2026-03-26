# Plan: Social Handicap Tracking

> **Last Updated:** 2026-01-24
> **Status:** ✅ Implementation Complete (Migration Applied)
>
> **Recent Changes:**
> - **2026-01-24: Feature complete** - All phases implemented, database migration applied
> - Fixed step ordering: Steps 1.4/1.5 now in correct order
> - Updated Step 1.5: handicap.types.ts already partially exported, just add new types
> - Removed over-engineered trend calculation (deferred)
> - Removed unused `calculateNetDoubleBogeyMax` function
> - Merged Steps 3.1/3.2 to fix circular dependency
> - Added explicit cache invalidation steps (3.1, 3.4)
> - Added Step 1.5 for type exports
> - Deferred Round List header badge (Step 6.5)
> - Improved error handling for missing course/club data
> - Updated index to be partial (filters on handicap_differential IS NOT NULL)

## Overview

Implement World Handicap System (WHS) handicap tracking to calculate and display a player's Social Handicap Index based on their last 20 rounds.

## Approach

1. Store handicap differential and daily handicap on each scorecard at submission time
2. Create utility functions for WHS calculations
3. Build a new Handicap History screen accessible from Profile menu
4. Display the best X of 20 rounds as "qualifying" rounds
5. Update player's handicap_index after each qualifying round syncs

## Key Decisions

| Decision | Choice | Rationale |
|----------|--------|-----------|
| Calculate when | At scorecard sync | Ensures historical accuracy with correct ratings |
| 18-hole only | Yes | Simpler, no 9-hole conversion needed |
| Backfill existing | No | Only new rounds will have differentials |
| PCC adjustment | Always 0 | Social rounds don't need weather adjustment |
| Store handicap_index on player | Yes | For profile display without recalculating |
| Store daily_handicap on scorecard | Yes | Snapshot strokes received for historical accuracy |
| Max handicap index | 54.0 | WHS maximum limit |
| Adjusted gross score | Use total gross (simplified) | Net Double Bogey adjustment skipped for social rounds |
| Trend calculation | Deferred | Nice-to-have, not MVP |

## Known Limitations

- **No Net Double Bogey adjustment**: WHS requires capping hole scores at net double bogey for handicap calculation. This implementation uses raw gross scores for simplicity. This may result in slightly higher differentials for rounds with blow-up holes.
- **No backfill**: Existing rounds before this feature will not have differentials calculated. Only new rounds will contribute to the Social Handicap Index.
- **18-hole only**: 9-hole rounds are not converted or included in handicap calculation.

## Prerequisites

- **Gender migration must be applied first**: `supabase/migrations/20260125000000_add_player_gender.sql`
  - The differential calculation uses gender for women's ratings selection
  - Verify with: `SELECT column_name FROM information_schema.columns WHERE table_name = 'players' AND column_name = 'gender'`

---

## Phase 1: Database & Types

### Step 1.1: Database Migration
**Status:** ✅ Complete (Migration Applied 2026-01-24)
**Type:** Manual

**Prompt:**
```
Create a database migration file at `supabase/migrations/20260125000001_handicap_differentials.sql`.

Add the following columns to the scorecards table:
- daily_handicap_used INTEGER - strokes received for this round (snapshot)
- handicap_differential NUMERIC(4,1) - the WHS score differential
- course_rating_used NUMERIC(4,1) - snapshot of course rating at time of round
- slope_rating_used INTEGER - snapshot of slope rating at time of round

Add the following columns to the players table:
- handicap_index NUMERIC(4,1) - calculated WHS handicap index (max 54.0)
- handicap_index_updated_at TIMESTAMPTZ - when index was last calculated

Create a partial index for efficient player handicap history queries:
CREATE INDEX idx_scorecards_player_handicap_history
  ON scorecards(player_id, submitted_at DESC)
  WHERE status IN ('completed', 'confirmed')
  AND handicap_differential IS NOT NULL;

This index is optimized for the exact query pattern in useHandicapHistory.

Add comments explaining each column's purpose.
```

**Deliverables:**
- [x] `supabase/migrations/20260125000001_handicap_differentials.sql`

**Dependencies:** Migration `20260125000000_add_player_gender.sql` must be applied first

---

### Step 1.2: Update Scorecard Types
**Status:** ✅ Complete
**Type:** Custom

**Prompt:**
```
Update `src/types/database/scorecard.types.ts` to add the new handicap fields to the Scorecard interface:

- daily_handicap_used: number | null - strokes received for this round (snapshot)
- handicap_differential: number | null - WHS score differential
- course_rating_used: number | null - snapshot of course rating
- slope_rating_used: number | null - snapshot of slope rating

These fields store the handicap data calculated at submission time. The daily_handicap_used
captures strokes received for historical accuracy (player's WHS Handicap Index may change later).
The differential is used for calculating the player's Social Handicap Index.
```

**Deliverables:**
- [x] Updated `src/types/database/scorecard.types.ts`

**Dependencies:** Step 1.1

---

### Step 1.3: Update Handicap Types
**Status:** ✅ Complete
**Type:** Custom

**Prompt:**
```
Update `src/types/handicap.types.ts` to add new types for handicap tracking:

1. ScoreDifferentialParams - Input for differential calculation:
   - adjustedGrossScore: number
   - courseRating: number
   - slopeRating: number

2. HandicapRound - A round in the handicap history:
   - scorecardId: string
   - roundId: string
   - roundDate: string
   - courseName: string
   - clubName: string
   - totalGross: number
   - dailyHandicapUsed: number (strokes received for this round)
   - handicapDifferential: number
   - courseRatingUsed: number
   - slopeRatingUsed: number
   - isQualifying: boolean (true if this round counts toward index)
   - roundNumber: number (1 = most recent, 20 = oldest)

3. HandicapSummary - Full handicap calculation result:
   - handicapIndex: number | null
   - totalRounds: number
   - qualifyingRoundsCount: number (how many rounds count: 1-8)
   - rounds: HandicapRound[]
   - lastUpdated: string | null
```

**Deliverables:**
- [x] Updated `src/types/handicap.types.ts`

**Dependencies:** None

---

### Step 1.4: Update Player Types
**Status:** ✅ Complete
**Type:** Custom

**Prompt:**
```
Update `src/types/database/player.types.ts` to add the new handicap index fields to the Player interface.

Add after the existing handicap fields (around line 26):
- handicap_index: number | null - calculated WHS Social Handicap Index
- handicap_index_updated_at: string | null - ISO timestamp when index was last calculated

Add JSDoc comment explaining the difference between:
- handicap: Player's WHS Handicap Index (manually entered or imported from national golf body)
- handicap_index: Calculated Social Handicap Index from last 20 rounds in this app
```

**Deliverables:**
- [x] Updated `src/types/database/player.types.ts`

**Dependencies:** Step 1.1

---

### Step 1.5: Export Handicap Types
**Status:** ✅ Complete
**Type:** Custom

**Prompt:**
```
Update `src/types/index.ts` to add the new handicap types to the existing export.

The file already exports DailyHandicapParams and DailyHandicapResult from handicap.types.ts:
  export type { DailyHandicapParams, DailyHandicapResult } from './handicap.types';

Update this line to also export the new types:
  export type {
    DailyHandicapParams,
    DailyHandicapResult,
    ScoreDifferentialParams,
    HandicapRound,
    HandicapSummary,
  } from './handicap.types';
```

**Deliverables:**
- [x] Updated `src/types/index.ts`

**Dependencies:** Step 1.3

---

## Phase 2: Calculation Utilities

### Step 2.1: Create Handicap Differential Utilities
**Status:** ✅ Complete
**Type:** Custom

**Prompt:**
```
Create `src/utils/handicapDifferential.ts` with the following functions:

1. calculateScoreDifferential(params: ScoreDifferentialParams): number
   - Formula: (113 / slopeRating) × (adjustedGrossScore - courseRating)
   - Returns differential rounded to 1 decimal place
   - Returns null if slopeRating <= 0 or courseRating <= 0 (invalid data, skip calculation)

2. calculateHandicapIndex(differentials: number[]): number | null
   - Takes array of differentials (most recent first)
   - Uses WHS counting table to determine how many to use:
     - 1-5 rounds: best 1
     - 6-8 rounds: best 2
     - 9-11 rounds: best 3
     - 12-14 rounds: best 4
     - 15-16 rounds: best 5
     - 17-18 rounds: best 6
     - 19 rounds: best 7
     - 20+ rounds: best 8
   - Formula: (sum of best X) / X × 0.96
   - Cap result at MAX_HANDICAP (54.0) from src/constants/scoring.ts
   - Returns null if no differentials

3. getQualifyingCount(totalRounds: number): number
   - Returns how many rounds count based on the counting table above

4. getRatingsForGender(tee, gender): { courseRating: number, slopeRating: number } | null
   - If gender is 'female' and women's ratings exist (womens_course_rating, womens_slope_rating), use those
   - Otherwise use men's ratings (course_rating, slope_rating)
   - Returns null if no valid ratings available (caller should skip differential calculation)

Use constants from src/constants/scoring.ts:
- STANDARD_SLOPE_RATING = 113
- MAX_HANDICAP = 54

Add comprehensive JSDoc comments explaining the WHS formulas.
```

**Deliverables:**
- [x] `src/utils/handicapDifferential.ts`

**Dependencies:** Step 1.3

---

### Step 2.2: Unit Tests for Differential Utilities
**Status:** ✅ Complete
**Type:** Custom

**Prompt:**
```
Create `src/__tests__/utils/handicapDifferential.test.ts` with tests for:

calculateScoreDifferential:
- Standard inputs (gross 85, CR 72.5, slope 125) → expect ~11.3
- Different slope ratings (100, 113, 145)
- Edge case: slope = 113 (neutral)
- Invalid case: slope <= 0 → returns null
- Invalid case: courseRating <= 0 → returns null

calculateHandicapIndex:
- 20 rounds with known values
- Fewer than 20 rounds (test counting table)
- Single round
- Empty array → null
- Verify 0.96 multiplier applied
- Verify capped at 54.0

getQualifyingCount:
- Test each tier of the counting table

getRatingsForGender:
- Male with both ratings available
- Female with women's ratings
- Female without women's ratings (fallback to men's)
- Missing ratings → returns null
```

**Deliverables:**
- [x] `src/__tests__/utils/handicapDifferential.test.ts`

**Dependencies:** Step 2.1

---

## Phase 3: Scorecard Submission Integration

### Step 3.1: Add Cache Invalidation Helper
**Status:** ✅ Complete
**Type:** Custom

**Prompt:**
```
Update `src/services/queryClient.ts` to add handicap cache invalidation helper.

Add the following function:

export function invalidateHandicapCache(playerId: string): void {
  queryClient.invalidateQueries({
    queryKey: ['handicap', 'history', playerId],
  });
}

This will be called after a scorecard with a differential is synced.
```

**Deliverables:**
- [x] Updated `src/services/queryClient.ts`

**Dependencies:** None

---

### Step 3.2: Update Scorecard Store and Sync Service
**Status:** ✅ Complete
**Type:** Custom

**Prompt:**
```
This step updates both the scorecard store (to attach metadata) and the sync service (to calculate differentials).
These changes are interdependent and must be done together.

PART A: Update scorecard types for sync metadata

Update `src/types/index.ts` (or appropriate location) to extend Scorecard type for sync:
Add optional fields for sync metadata:
- teeData?: Tee | null - selected tee with ratings
- playerGender?: 'male' | 'female' | null
- playerHandicap?: number | null
- coursePar?: number

PART B: Update scorecard store to attach metadata

Update `src/store/scorecardStore.ts`:
In the submitScorecards function (or wherever queueScorecardSync is called):

Before queuing each scorecard for sync, attach the metadata:
```typescript
const scorecardWithMeta = {
  ...scorecard,
  teeData: selectedTeeData, // from store state
  playerGender: player.gender,
  playerHandicap: player.handicap,
  coursePar: calculateCoursePar(selectedTeeData), // sum of hole pars
};
await queueScorecardSync(scorecardWithMeta, 'update');
```

The store already has selectedTeeData in state - ensure it's populated before scoring begins.

IMPORTANT: Verify player.gender is available in the scorecard's player object.
The round players data should include gender from the players table.
Check the existing data flow and add gender to player fetching if missing.

PART C: Update sync service to calculate differential

Modify `src/services/offline/sync.ts` in the syncScorecard function:

1. Import utilities:
   - calculateScoreDifferential, getRatingsForGender from '@/utils/handicapDifferential'
   - calculateGADailyHandicap from '@/utils/dailyHandicap'
   - invalidateHandicapCache from '@/services/queryClient'

2. Check if scorecard has teeData and playerGender attached.
   If not available, log a warning and set all handicap fields to null.

3. If teeData and playerGender are available, calculate:
   a. Get ratings: getRatingsForGender(scorecard.teeData, scorecard.playerGender)
      - If returns null (no valid ratings), skip calculation
   b. Calculate daily handicap: calculateGADailyHandicap({
        gaHandicap: scorecard.playerHandicap,
        slopeRating, courseRating, par, gender
      })
   c. Calculate differential: calculateScoreDifferential({
        adjustedGrossScore: scorecard.totalGross, // Simplified - no Net Double Bogey adjustment
        courseRating, slopeRating
      })
      - If returns null (invalid ratings), skip calculation

4. Add to scorecardData object:
   - daily_handicap_used: dailyHandicap or null
   - handicap_differential: differential or null
   - course_rating_used: courseRating or null
   - slope_rating_used: slopeRating or null

5. After successful sync, if differential was calculated:
   - Invalidate handicap history cache: invalidateHandicapCache(scorecard.playerId)

Handle errors gracefully - if calculation fails, still sync scorecard with null values.
Log warnings for missing data to help debug.
```

**Deliverables:**
- [x] Updated scorecard types (add sync metadata fields)
- [x] Updated `src/store/scorecardStore.ts`
- [x] Updated `src/services/offline/sync.ts`

**Dependencies:** Step 2.1, Step 3.1

---

### Step 3.3: Create Player Handicap Index Update Service
**Status:** ✅ Complete
**Type:** Custom

**Prompt:**
```
Create `src/services/handicap/updatePlayerHandicapIndex.ts` to recalculate and persist the player's handicap index.

This function should be called after a scorecard with a differential is successfully synced.

Function: updatePlayerHandicapIndex(playerId: string): Promise<void>

1. Fetch last 20 completed scorecards with differentials for this player:
   - Query scorecards table
   - Filter: player_id = playerId, status IN ('completed', 'confirmed'), handicap_differential IS NOT NULL
   - Order by submitted_at DESC
   - Limit 20

2. Extract differentials array from results

3. Calculate new handicap index using calculateHandicapIndex(differentials)

4. Update players table:
   ```sql
   UPDATE players
   SET handicap_index = <calculated>,
       handicap_index_updated_at = NOW()
   WHERE id = playerId
   ```

5. Invalidate player/auth caches so UI updates (see Step 3.4)

Handle errors gracefully - log but don't throw (non-critical operation).
```

**Deliverables:**
- [x] `src/services/handicap/updatePlayerHandicapIndex.ts`

**Dependencies:** Step 2.1

---

### Step 3.4: Add Player Profile Cache Invalidation
**Status:** ✅ Complete (included in Step 3.3)
**Type:** Custom

**Prompt:**
```
Update `src/services/handicap/updatePlayerHandicapIndex.ts` to invalidate player profile cache after updating.

After the database update succeeds, invalidate the relevant caches:

```typescript
import { queryClient } from '@/services/queryClient';

// After successful update:
// Invalidate player profile queries so UI reflects new handicap_index
queryClient.invalidateQueries({ queryKey: ['player', playerId] });
queryClient.invalidateQueries({ queryKey: ['players'] }); // In case of list queries
queryClient.invalidateQueries({ queryKey: ['auth', 'user'] }); // If user includes handicap_index
```

Check how the current user's player data is fetched in useAuth or usePlayer hooks,
and invalidate the appropriate query keys.
```

**Deliverables:**
- [x] Updated `src/services/handicap/updatePlayerHandicapIndex.ts` (cache invalidation included)

**Dependencies:** Step 3.3

---

### Step 3.5: Call Handicap Update After Sync
**Status:** ✅ Complete
**Type:** Custom

**Prompt:**
```
Update `src/services/offline/sync.ts` to call the handicap index update after successful scorecard sync.

In the syncScorecard function, after the successful Supabase upsert:

1. Import updatePlayerHandicapIndex from '@/services/handicap/updatePlayerHandicapIndex'

2. After successful sync, if handicap_differential was calculated:
   ```typescript
   if (scorecardData.handicap_differential !== null) {
     // Update player's handicap index in background (don't await)
     updatePlayerHandicapIndex(scorecard.playerId).catch((error) => {
       syncLogger.warn('Failed to update player handicap index', { error, playerId: scorecard.playerId });
     });
   }
   ```

This is a fire-and-forget call - we don't want to fail the sync if the index update fails.
```

**Deliverables:**
- [x] Updated `src/services/offline/sync.ts`

**Dependencies:** Step 3.3, Step 3.4

---

## Phase 4: Data Fetching

### Step 4.1: Create Handicap History Hook
**Status:** ✅ Complete
**Type:** Custom

**Prompt:**
```
Create `src/hooks/useHandicapHistory.ts` with a TanStack Query hook.

Query key: ['handicap', 'history', playerId]

Query function:
1. Fetch last 20 completed/confirmed scorecards for the player with differentials
2. Query with nested selects (verify join path in schema):
   ```typescript
   supabase
     .from('scorecards')
     .select(`
       id,
       player_id,
       round_id,
       total_gross,
       daily_handicap_used,
       handicap_differential,
       course_rating_used,
       slope_rating_used,
       submitted_at,
       rounds (
         id,
         date,
         courses (
           id,
           name,
           clubs (
             id,
             name
           )
         )
       )
     `)
     .eq('player_id', playerId)
     .in('status', ['completed', 'confirmed'])
     .not('handicap_differential', 'is', null)
     .order('submitted_at', { ascending: false })
     .limit(20)
   ```
   Note: Use LEFT JOINs (no !inner) to handle cases where course/club data may be missing.
   Verify the join path - rounds.course_id → courses.id, courses.club_id → clubs.id

3. Filter: status IN ('completed', 'confirmed') AND handicap_differential IS NOT NULL
4. Order by submitted_at DESC
5. Limit 20

Transform response:
1. Filter out any rows where rounds/courses data is null (defensive)
2. Extract differentials array
3. Calculate handicapIndex using calculateHandicapIndex
4. Determine qualifyingCount using getQualifyingCount
5. Mark which rounds are qualifying:
   - Sort differentials ascending
   - Rounds with differential <= threshold (qualifyingCount-th lowest) are qualifying
6. For rounds with missing course/club, use fallback text: "Unknown Course"

Return type: { data: HandicapSummary | undefined, isLoading, isError, error, refetch }

Options:
- staleTime: 5 * 60 * 1000 (5 minutes)
- enabled: !!playerId
- Handle errors gracefully (return empty state on error, don't throw)

Also export query keys factory:
export const handicapKeys = {
  all: ['handicap'] as const,
  history: (playerId: string) => [...handicapKeys.all, 'history', playerId] as const,
};
```

**Deliverables:**
- [x] `src/hooks/useHandicapHistory.ts`

**Dependencies:** Step 2.1, Step 1.5

---

### Step 4.2: Export Hook from Index
**Status:** ✅ Complete
**Type:** Custom

**Prompt:**
```
Update `src/hooks/index.ts` to export the new useHandicapHistory hook.

Add: export { useHandicapHistory, handicapKeys } from './useHandicapHistory';
```

**Deliverables:**
- [x] Updated `src/hooks/index.ts`

**Dependencies:** Step 4.1

---

## Phase 5: UI Components

### Step 5.1: Create Handicap History Screen
**Status:** ✅ Complete
**Type:** Command
**Command:** `/screen HandicapHistoryScreen`

**Prompt:**
```
Create Handicap History Screen at `src/screens/profile/HandicapHistoryScreen/index.tsx`.

This screen displays the player's last 20 rounds and their calculated handicap index.

Layout:
1. PageHeader with title "Handicap History" and back button
2. HandicapIndexCard component at top (see Step 5.2)
3. Section header: "Round History" with count "(X rounds)"
4. FlatList of rounds using HandicapRoundRow component (see Step 5.3)
5. RefreshControl for pull-to-refresh
6. EmptyHandicapState when no rounds (see Step 5.4)

States to handle:
- Loading: Show LoadingSpinner centered
- Error: Show error message with retry button (use existing ErrorState pattern if available)
- Empty: Show EmptyHandicapState
- Success: Show HandicapIndexCard + FlatList

Use useHandicapHistory hook with current user's ID from useAuth.

Implementation:
```typescript
const { user } = useAuth();
const { data: summary, isLoading, isError, refetch } = useHandicapHistory(user?.id);

if (isLoading) return <LoadingSpinner />;
if (isError) return <ErrorState message="Failed to load handicap history" onRetry={refetch} />;
if (!summary || summary.totalRounds === 0) return <EmptyHandicapState />;

return (
  <SafeAreaView>
    <PageHeader title="Handicap History" />
    <FlatList
      ListHeaderComponent={
        <HandicapIndexCard
          handicapIndex={summary.handicapIndex}
          totalRounds={summary.totalRounds}
          qualifyingCount={summary.qualifyingRoundsCount}
        />
      }
      data={summary.rounds}
      renderItem={({ item }) => <HandicapRoundRow round={item} />}
      keyExtractor={(item) => item.scorecardId}
      refreshControl={<RefreshControl refreshing={isLoading} onRefresh={refetch} />}
    />
  </SafeAreaView>
);
```

Follow existing screen patterns in the codebase for styling (useThemeColors, spacing constants).
```

**Deliverables:**
- [x] `src/screens/profile/HandicapHistoryScreen/index.tsx`

**Dependencies:** Step 4.1

---

### Step 5.2: Create HandicapIndexCard Component
**Status:** ✅ Complete
**Type:** Command
**Command:** `/component HandicapIndexCard`

**Prompt:**
```
Create `src/screens/profile/HandicapHistoryScreen/components/HandicapIndexCard.tsx`.

Props:
- handicapIndex: number | null
- totalRounds: number
- qualifyingCount: number

Display:
1. Label: "Social Handicap Index"
2. Large handicap index number (48pt font) or "—" if null
3. Stats row showing:
   - "Based on {totalRounds} rounds"
   - "Best {qualifyingCount} count"
4. Formula text below: "Best {qualifyingCount} of {totalRounds} × 0.96"
5. If totalRounds < 3, show hint: "Complete more rounds to improve accuracy"

Use surface background, xl borderRadius, md shadow. Follow existing card patterns.
```

**Deliverables:**
- [x] `src/screens/profile/HandicapHistoryScreen/components/HandicapIndexCard.tsx`

**Dependencies:** None

---

### Step 5.3: Create HandicapRoundRow Component
**Status:** ✅ Complete
**Type:** Command
**Command:** `/component HandicapRoundRow`

**Prompt:**
```
Create `src/screens/profile/HandicapHistoryScreen/components/HandicapRoundRow.tsx`.

Props:
- round: HandicapRound

Display as a horizontal row:
1. Left section:
   - Course name (bodyBold)
   - Date formatted (caption, textSecondary)
2. Center section:
   - Gross score number
   - "Gross" label below
   - Optional: Show daily handicap used in smaller text (e.g., "HC: 18")
3. Right section:
   - Differential with 1 decimal (e.g., "11.3")
   - Checkmark icon if isQualifying (primary color)
   - "Differential" label below

If isQualifying, add left border (3px primary color).

Use surface background, md borderRadius, sm marginBottom.
```

**Deliverables:**
- [x] `src/screens/profile/HandicapHistoryScreen/components/HandicapRoundRow.tsx`

**Dependencies:** Step 1.3

---

### Step 5.4: Create EmptyHandicapState Component
**Status:** ✅ Complete
**Type:** Command
**Command:** `/component EmptyHandicapState`

**Prompt:**
```
Create `src/screens/profile/HandicapHistoryScreen/components/EmptyHandicapState.tsx`.

Simple empty state component showing:
1. golf-tee or chart-line icon (64px, textTertiary)
2. Title: "No Handicap History"
3. Subtitle: "Complete rounds to start tracking your handicap"

Center everything vertically with flex: 1. Use existing EmptyState patterns from the codebase.
```

**Deliverables:**
- [x] `src/screens/profile/HandicapHistoryScreen/components/EmptyHandicapState.tsx`

**Dependencies:** None

---

### Step 5.5: Create Components Index
**Status:** ✅ Complete
**Type:** Custom

**Prompt:**
```
Create `src/screens/profile/HandicapHistoryScreen/components/index.ts` to export all components:

export { HandicapIndexCard } from './HandicapIndexCard';
export { HandicapRoundRow } from './HandicapRoundRow';
export { EmptyHandicapState } from './EmptyHandicapState';
```

**Deliverables:**
- [x] `src/screens/profile/HandicapHistoryScreen/components/index.ts`

**Dependencies:** Steps 5.2, 5.3, 5.4

---

## Phase 6: Navigation Integration

### Step 6.1: Add Navigation Types
**Status:** ✅ Complete
**Type:** Custom

**Prompt:**
```
Update `src/navigation/types.ts` to add the HandicapHistory route.

In RootStackParamList, add:
  HandicapHistory: undefined;
```

**Deliverables:**
- [x] Updated `src/navigation/types.ts`

**Dependencies:** None

---

### Step 6.2: Register Screen in Navigator
**Status:** ✅ Complete
**Type:** Custom

**Prompt:**
```
Update `src/navigation/RootNavigator.tsx` to register the HandicapHistory screen.

1. Import HandicapHistoryScreen from '@/screens/profile/HandicapHistoryScreen'
2. Add Stack.Screen:
   <Stack.Screen
     name="HandicapHistory"
     component={HandicapHistoryScreen}
     options={{ headerShown: false }}
   />

Place it near other profile-related screens.
```

**Deliverables:**
- [x] Updated `src/navigation/RootNavigator.tsx`

**Dependencies:** Step 5.1, Step 6.1

---

### Step 6.3: Add Profile Menu Item
**Status:** ✅ Complete
**Type:** Custom

**Prompt:**
```
Update `src/screens/profile/components/ProfileMenuSection.tsx` to add a Handicap History menu item.

1. Update the ProfileMenuSectionProps interface:
   Add: onHandicapHistory: () => void

2. Add prop to function signature:
   Add: onHandicapHistory,

3. Add MenuItemRow after "My Statistics":
   <MenuItemRow
     icon="chart-timeline-variant"
     title="Handicap History"
     onPress={onHandicapHistory}
     testID="menu-handicap-history"
   />

IMPORTANT: Search codebase for all usages of ProfileMenuSection component.
If used in multiple places, all callers must be updated to pass onHandicapHistory prop.
Use Grep to find: <ProfileMenuSection
```

**Deliverables:**
- [x] Updated `src/screens/profile/components/ProfileMenuSection.tsx`
- [x] Updated all callers of ProfileMenuSection (verify with grep)

**Dependencies:** None

---

### Step 6.4: Update Profile Screen
**Status:** ✅ Complete
**Type:** Custom

**Prompt:**
```
Update `src/screens/profile/ProfileScreen.tsx` to wire up the handicap history navigation.

1. Add handler:
   const handleHandicapHistory = useCallback(() => {
     navigation.navigate('HandicapHistory');
   }, [navigation]);

2. Pass to ProfileMenuSection:
   <ProfileMenuSection
     // ... existing props
     onHandicapHistory={handleHandicapHistory}
   />
```

**Deliverables:**
- [x] Updated `src/screens/profile/ProfileScreen.tsx`

**Dependencies:** Step 6.3

---

### Step 6.5: (DEFERRED) Add Tappable Handicap to Round List Header
**Status:** ⏳ Deferred
**Type:** Custom

**Note:** Deferred to reduce MVP scope. Profile menu provides single entry point.
Can be added in a future iteration if users want quicker access.

**Deliverables:** N/A

**Dependencies:** N/A

---

## Critical Files

### To Create
- `supabase/migrations/20260125000001_handicap_differentials.sql` - DB migration
- `src/utils/handicapDifferential.ts` - Calculation utilities
- `src/__tests__/utils/handicapDifferential.test.ts` - Unit tests
- `src/services/handicap/updatePlayerHandicapIndex.ts` - Player index update service
- `src/hooks/useHandicapHistory.ts` - Data fetching hook
- `src/screens/profile/HandicapHistoryScreen/index.tsx` - Main screen
- `src/screens/profile/HandicapHistoryScreen/components/HandicapIndexCard.tsx`
- `src/screens/profile/HandicapHistoryScreen/components/HandicapRoundRow.tsx`
- `src/screens/profile/HandicapHistoryScreen/components/EmptyHandicapState.tsx`
- `src/screens/profile/HandicapHistoryScreen/components/index.ts`

### To Modify
- `src/types/database/scorecard.types.ts` - Add differential fields + daily_handicap_used
- `src/types/database/player.types.ts` - Add handicap_index fields
- `src/types/handicap.types.ts` - Add new types
- `src/types/index.ts` - Export handicap types + add sync metadata fields to Scorecard
- `src/services/offline/sync.ts` - Calculate differential on sync + call index update
- `src/services/queryClient.ts` - Add invalidateHandicapCache function
- `src/store/scorecardStore.ts` - Pass tee/player data through sync
- `src/hooks/index.ts` - Export new hook
- `src/navigation/types.ts` - Add route type
- `src/navigation/RootNavigator.tsx` - Register screen
- `src/screens/profile/components/ProfileMenuSection.tsx` - Add menu item + update interface
- `src/screens/profile/ProfileScreen.tsx` - Wire up navigation

---

---

## Future Enhancements (Out of Scope)

These items are explicitly deferred and can be added in future iterations:

1. **Trend calculation** - Show improving/worsening/stable indicator on HandicapIndexCard
2. **Round List header badge** - Quick access to handicap from round list screen
3. **Net Double Bogey adjustment** - Cap hole scores at NDB for more accurate differentials
4. **9-hole round conversion** - Combine two 9-hole rounds into 18-hole equivalent
5. **RLS policies** - Add Row Level Security for handicap data (currently relies on player_id filter)

---

## Verification

### Prerequisites
- [ ] Gender migration applied: `SELECT column_name FROM information_schema.columns WHERE table_name = 'players' AND column_name = 'gender'`

### Database
- [ ] Run migration: `supabase db reset` or apply migration
- [ ] Verify scorecard columns: `SELECT column_name FROM information_schema.columns WHERE table_name = 'scorecards' AND column_name IN ('daily_handicap_used', 'handicap_differential', 'course_rating_used', 'slope_rating_used')`
- [ ] Verify player columns: `SELECT column_name FROM information_schema.columns WHERE table_name = 'players' AND column_name IN ('handicap_index', 'handicap_index_updated_at')`
- [ ] Verify index created: `SELECT indexname FROM pg_indexes WHERE tablename = 'scorecards' AND indexname = 'idx_scorecards_player_handicap_history'`

### Unit Tests
- [ ] Run tests: `pnpm test src/__tests__/utils/handicapDifferential.test.ts`
- [ ] All tests pass

### Integration Testing
- [ ] Start app: `npx expo start`
- [ ] Complete a round with tee selection
- [ ] Check database: scorecard should have all handicap fields populated:
  - daily_handicap_used (integer strokes received)
  - handicap_differential (decimal like 12.3)
  - course_rating_used (decimal like 72.5)
  - slope_rating_used (integer like 125)
- [ ] Check database: player.handicap_index updated after sync
- [ ] Navigate to Profile → Handicap History
- [ ] Verify HandicapIndexCard displays correctly with index value
- [ ] Verify rounds list with qualifying indicators (checkmarks, colored border)
- [ ] Pull-to-refresh works
- [ ] Cache invalidation: after completing another round, handicap history updates without app restart

### Edge Cases
- [ ] Test with 0 rounds (empty state shows)
- [ ] Test with 1-5 rounds (1 qualifying)
- [ ] Test with 6-8 rounds (2 qualifying)
- [ ] Test with 20+ rounds (8 qualifying, capped at 20)
- [ ] Test without tee selection (handicap fields null, no errors, warning logged)
- [ ] Test with missing course/club data (fallback text "Unknown Course")
- [ ] Test offline sync (differential calculated on reconnect)
