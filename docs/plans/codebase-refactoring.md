# Plan: Codebase Refactoring - Consolidate Redundant Code

## Overview

Comprehensive refactoring to eliminate redundant code, split large files, and consolidate duplicate components across the codebase (339,143 lines across 130 screens, 222 components).

**Scope:**
- 6 large hook files to split (~5,800 lines)
- 3 duplicate components to consolidate
- 4 duplicate utility functions to extract
- 1 redundant hook to remove
- Service layer cleanup

---

## Approach

1. **Phase 1 (Quick Wins)**: Low-risk changes - extract duplicates, remove unused exports
2. **Phase 2 (Hook Splitting)**: Split massive hooks into focused modules with backward-compatible re-exports
3. **Phase 3 (Component Consolidation)**: Merge duplicate ScoringPairsSection components
4. **Phase 4 (Service Layer)**: Split large service files, standardize error handling
5. **Phase 5 (Polish)**: Create shared hook patterns, extract inline screen logic

## Key Decisions

| Decision | Choice | Rationale |
|----------|--------|-----------|
| Hook structure | Folder with index.ts re-exports | Backward compatibility - existing imports continue to work |
| ScoringPairsSection | Variant prop pattern | Single component with `variant: 'edit' | 'create' | 'view'` reduces duplication |
| Error handling | Centralized AppError class | Consistent error handling across services |
| Utility extraction | `src/utils/` directory | Single source of truth for shared functions |

---

## Phase 1: Quick Wins (Low Risk)

### Step 1.1: Extract `teeToTeeBox()` to Shared Utility
**Status:** ⏳ Pending
**Type:** Custom
**Command:** N/A

**Prompt:**
```
Extract the duplicated `teeToTeeBox()` function into a shared utility.

The function is currently duplicated in 4 locations with identical implementations:
- src/hooks/useRoundDetails.ts:21
- src/hooks/useClubs.ts:65
- src/screens/admin/EditRoundScreen/hooks/useEditRoundData.ts:12
- src/screens/courses/CourseDetailScreen/index.tsx:57

Tasks:
1. Create `src/utils/teeTransformers.ts` with:
   - Import Tee and TeeBox types from appropriate locations
   - Export `teeToTeeBox(tee: Tee): TeeBox` function
   - Export `teesToTeeBoxes(tees: Tee[]): TeeBox[]` helper for arrays
   - Add JSDoc documentation

2. Update all 4 files to:
   - Import `teeToTeeBox` from '@/utils/teeTransformers'
   - Remove the local function definition
   - Keep existing usage unchanged

3. Export from `src/utils/index.ts` if that file exists

Reference implementation from src/hooks/useRoundDetails.ts:21:
```typescript
function teeToTeeBox(tee: Tee): TeeBox {
  return {
    name: tee.name,
    color: tee.color ?? tee.name.toLowerCase(),
    slope_rating: tee.slope_rating,
    course_rating: tee.course_rating,
    holes: tee.holes || [],
  };
}
```
```

**Deliverables:**
- [ ] `src/utils/teeTransformers.ts` created with `teeToTeeBox` and `teesToTeeBoxes`
- [ ] `src/hooks/useRoundDetails.ts` updated to use shared util
- [ ] `src/hooks/useClubs.ts` updated to use shared util
- [ ] `src/screens/admin/EditRoundScreen/hooks/useEditRoundData.ts` updated
- [ ] `src/screens/courses/CourseDetailScreen/index.tsx` updated
- [ ] TypeScript compiles without errors (`pnpm type-check`)

**Dependencies:** None
**Notes:** This is a pure extraction - no logic changes, just consolidation.

---

### Step 1.2: Remove Deprecated `useLeaderboard` Hook
**Status:** ⏳ Pending
**Type:** Custom
**Command:** N/A

**Prompt:**
```
Remove the deprecated `useLeaderboard` hook and migrate its single usage.

The hook `src/hooks/useLeaderboard.ts` (74 lines) is already marked @deprecated and only wraps `useCompetitionLeaderboard`. It has a single usage location.

Tasks:
1. Update `src/screens/competitions/LeaderboardScreen.tsx`:
   - Change import from `useLeaderboard` to `useCompetitionLeaderboard`
   - Update the hook call: `useCompetitionLeaderboard(competitionId, { filter: 'individuals' })`
   - Update the data mapping to handle the new response format:
     - Old: `playerId` → New: `participantId`
     - Old: `playerName` → New: `participantName`
     - Handle `handicap ?? 0` for nullable handicap

2. Delete `src/hooks/useLeaderboard.ts`

3. Update `src/hooks/index.ts`:
   - Remove line 156: `export { useLeaderboard } from './useLeaderboard';`
   - Remove line 157: `export type { LeaderboardEntry } from './useLeaderboard';`

4. Handle test file `src/__tests__/hooks/useLeaderboard.test.tsx`:
   - Either delete it (if testing deprecated code)
   - Or convert to test `useCompetitionLeaderboard` with `filter: 'individuals'`

Current usage in LeaderboardScreen.tsx:45:
```typescript
const { data: leaderboard, isLoading, error, refetch } = useLeaderboard(competitionId);
```

Should become:
```typescript
const { data: leaderboard, isLoading, error, refetch } = useCompetitionLeaderboard(competitionId, {
  filter: 'individuals',
});
// Map if needed: leaderboard already has same data, just different field names
```
```

**Deliverables:**
- [ ] `src/screens/competitions/LeaderboardScreen.tsx` migrated to `useCompetitionLeaderboard`
- [ ] `src/hooks/useLeaderboard.ts` deleted
- [ ] `src/hooks/index.ts` exports removed
- [ ] Test file handled (deleted or converted)
- [ ] TypeScript compiles without errors
- [ ] Leaderboard screen still works (manual test)

**Dependencies:** None
**Notes:** The transformation from CompetitionLeaderboardEntry to LeaderboardEntry is already in the deprecated hook - may need to inline that logic or update component to use new field names directly.

---

### Step 1.3: Remove Unused SelectionModal Export
**Status:** ⏳ Pending
**Type:** Custom
**Command:** N/A

**Prompt:**
```
Remove the unused SelectionModal export from common components index.

The generic `SelectionModal` component is exported but never directly imported anywhere.
Only specialized variants (CourseSelectionModal, TeeSelectionModal, AvatarSelectionModal) are actually used.

Tasks:
1. Check `src/components/common/index.ts` for SelectionModal export
2. Remove the export line for SelectionModal (keep the file, just don't export it)
3. Verify no files import SelectionModal directly using grep

Verification command:
```bash
grep -r "from.*common.*SelectionModal" src/
grep -r "import.*SelectionModal.*from" src/
```

If any imports are found, those files need to be updated to use specialized variants or the component needs to stay exported.
```

**Deliverables:**
- [ ] `SelectionModal` removed from `src/components/common/index.ts` exports
- [ ] Verified no direct imports exist
- [ ] TypeScript compiles without errors

**Dependencies:** None
**Notes:** The component file stays - we're just not exporting it from the barrel file.

---

## Phase 2: Hook Splitting (High Impact)

### Step 2.1: Split `useSkins.ts` into Focused Modules
**Status:** ⏳ Pending
**Type:** Command
**Command:** `/split-hook src/hooks/useSkins.ts`

**Prompt:**
```
Split the massive useSkins.ts hook (2,367 lines, 19+ exported functions) into focused modules.

Current file: src/hooks/useSkins.ts

Target structure:
```
src/hooks/skins/
├── index.ts           # Re-exports everything for backward compatibility
├── types.ts           # SkinsServiceError, ProcessSkinsHoleInput, etc.
├── helpers.ts         # createError, any shared helpers
├── queries.ts         # useSkinsGame, useSkinsGamesByRound, useSkinsResults, useSkinsPayouts, useSkinsSummary
├── mutations.ts       # useCreateSkinsGame, useProcessSkinsHole, useFinalizeSkinsGame, useCancelSkinsGame
├── utilities.ts       # useCanUseSkins, useActiveSkinsGameForRound
└── statistics.ts      # useSkinsStatistics, useSkinsLeaderboard, useSkinsPlayerStatistics, etc.
```

Guidelines:
1. Create folder `src/hooks/skins/`
2. Move types and interfaces to `types.ts`
3. Move helper functions (like `createError`) to `helpers.ts`
4. Group hooks by purpose:
   - Query hooks (read data) → `queries.ts`
   - Mutation hooks (write data) → `mutations.ts`
   - Utility hooks (checks, state) → `utilities.ts`
   - Statistics hooks → `statistics.ts`
5. Create `index.ts` that re-exports everything:
   ```typescript
   export * from './types';
   export * from './queries';
   export * from './mutations';
   export * from './utilities';
   export * from './statistics';
   ```
6. Update `src/hooks/index.ts` to export from `./skins` instead of `./useSkins`
7. Keep the old `useSkins.ts` file temporarily as a re-export for any direct imports

After splitting, each file should be under 500 lines.
```

**Deliverables:**
- [ ] `src/hooks/skins/` directory created
- [ ] `src/hooks/skins/types.ts` with all type definitions
- [ ] `src/hooks/skins/helpers.ts` with shared helper functions
- [ ] `src/hooks/skins/queries.ts` with query hooks
- [ ] `src/hooks/skins/mutations.ts` with mutation hooks
- [ ] `src/hooks/skins/utilities.ts` with utility hooks
- [ ] `src/hooks/skins/statistics.ts` with statistics hooks
- [ ] `src/hooks/skins/index.ts` with re-exports
- [ ] `src/hooks/index.ts` updated
- [ ] All existing imports still work (backward compatible)
- [ ] TypeScript compiles without errors

**Dependencies:** None
**Notes:** This is the largest hook file. Take care to maintain all exports for backward compatibility.

---

### Step 2.2: Split `usePrizePool.ts` into Focused Modules
**Status:** ⏳ Pending
**Type:** Command
**Command:** `/split-hook src/hooks/usePrizePool.ts`

**Prompt:**
```
Split usePrizePool.ts (1,241 lines) into focused query and mutation modules.

Current file: src/hooks/usePrizePool.ts

Target structure:
```
src/hooks/prizePool/
├── index.ts           # Re-exports everything
├── types.ts           # PrizePoolError, input types, etc.
├── queries.ts         # usePrizePool, usePrizePoolByCompetition, usePrizePoolAllocations, etc.
└── mutations.ts       # useCreatePrizePool, useUpdatePrizePool, useAllocateFunds, etc.
```

Guidelines:
1. Identify all query hooks (use `useQuery`) → `queries.ts`
2. Identify all mutation hooks (use `useMutation`) → `mutations.ts`
3. Extract types to `types.ts`
4. Create backward-compatible `index.ts`
5. Update `src/hooks/index.ts`
```

**Deliverables:**
- [ ] `src/hooks/prizePool/` directory created
- [ ] `src/hooks/prizePool/types.ts` created
- [ ] `src/hooks/prizePool/queries.ts` created
- [ ] `src/hooks/prizePool/mutations.ts` created
- [ ] `src/hooks/prizePool/index.ts` created
- [ ] All existing imports still work
- [ ] TypeScript compiles without errors

**Dependencies:** Step 2.1 (establish pattern first)
**Notes:** Follow the same pattern established in Step 2.1.

---

### Step 2.3: Split `usePlayerStatistics.ts` into Focused Modules
**Status:** ⏳ Pending
**Type:** Command
**Command:** `/split-hook src/hooks/usePlayerStatistics.ts`

**Prompt:**
```
Split usePlayerStatistics.ts (802 lines) into focused modules by domain.

Current file: src/hooks/usePlayerStatistics.ts

Target structure:
```
src/hooks/playerStatistics/
├── index.ts           # Re-exports everything
├── types.ts           # Statistics types
├── queries.ts         # usePlayerStats, usePlayerRoundStats
├── rankings.ts        # usePlayerRankings, useLeaderboardPosition
└── trends.ts          # usePlayerTrends, useStatsTrend, usePerformanceOverTime
```

Guidelines:
1. Group by domain: raw stats, rankings/comparisons, trends/history
2. Keep transformation logic with the hooks that use it
3. Extract shared types to `types.ts`
```

**Deliverables:**
- [ ] `src/hooks/playerStatistics/` directory created
- [ ] Hooks organized by domain
- [ ] All existing imports still work
- [ ] TypeScript compiles without errors

**Dependencies:** Step 2.1 (establish pattern first)

---

### Step 2.4: Split `useClubs.ts` into Focused Modules
**Status:** ⏳ Pending
**Type:** Command
**Command:** `/split-hook src/hooks/useClubs.ts`

**Prompt:**
```
Split useClubs.ts (761 lines) into focused modules by concern.

Current file: src/hooks/useClubs.ts

Target structure:
```
src/hooks/clubs/
├── index.ts           # Re-exports everything
├── types.ts           # Club-related types
├── queries.ts         # useClubsWithCourses, useClubById, useSearchClubs
├── mutations.ts       # useUpdateClub, useRefreshClub
├── favorites.ts       # useFavoriteClub, useUnfavoriteClub, useIsFavorite
└── homeClub.ts        # useHomeClub, useSetHomeClub
```

NOTE: The `teeToTeeBox` function should have been extracted in Step 1.1.
If not, extract it as part of this step to src/utils/teeTransformers.ts.

Guidelines:
1. Query hooks for fetching clubs → `queries.ts`
2. Mutation hooks for modifying clubs → `mutations.ts`
3. Favorite-related hooks → `favorites.ts`
4. Home club specific logic → `homeClub.ts`
```

**Deliverables:**
- [ ] `src/hooks/clubs/` directory created
- [ ] Hooks organized by concern
- [ ] `teeToTeeBox` moved to shared util (if not done in 1.1)
- [ ] All existing imports still work
- [ ] TypeScript compiles without errors

**Dependencies:** Step 1.1 (teeToTeeBox extraction)

---

### Step 2.5: Extract Formatters from `useRoundLeaderboard.ts`
**Status:** ⏳ Pending
**Type:** Custom
**Command:** N/A

**Prompt:**
```
Extract formatting logic from useRoundLeaderboard.ts (625 lines) to a shared utility.

Current file: src/hooks/useRoundLeaderboard.ts

The hook contains ~250+ lines of formatting/transformation logic that should be in utilities.

Tasks:
1. Identify all formatting/transformation functions in the file
2. Create `src/utils/roundLeaderboardFormatters.ts` with:
   - Game-type-specific formatters (Stableford, Stroke Play, Match Play, etc.)
   - Position assignment logic
   - Tie-breaking logic
   - Team member resolution
3. Update `useRoundLeaderboard.ts` to import from the new utility
4. The hook should focus on:
   - Data fetching with useQuery
   - Calling formatters
   - Returning formatted data

The hook file should be under 200 lines after extraction.
```

**Deliverables:**
- [ ] `src/utils/roundLeaderboardFormatters.ts` created
- [ ] All formatting logic extracted
- [ ] `useRoundLeaderboard.ts` simplified to ~200 lines
- [ ] TypeScript compiles without errors
- [ ] Leaderboard displays correctly (manual test)

**Dependencies:** None
**Notes:** Unlike other hooks, this one doesn't need a folder structure - just extract utilities.

---

### Step 2.6: Split `usePushNotifications.ts` into Focused Modules
**Status:** ⏳ Pending
**Type:** Command
**Command:** `/split-hook src/hooks/usePushNotifications.ts`

**Prompt:**
```
Split usePushNotifications.ts (716 lines) into focused modules by responsibility.

Current file: src/hooks/usePushNotifications.ts

Target structure:
```
src/hooks/pushNotifications/
├── index.ts           # Re-exports everything
├── types.ts           # Notification types, token types
├── setup.ts           # usePushNotificationSetup, useRegisterForPush
├── permissions.ts     # useNotificationPermissions, useRequestPermissions
├── token.ts           # usePushToken, useUpdatePushToken
└── handlers.ts        # useNotificationHandler, useNotificationResponse
```

Guidelines:
1. Setup/registration → `setup.ts`
2. Permission checking/requesting → `permissions.ts`
3. Token management → `token.ts`
4. Event handlers → `handlers.ts`
```

**Deliverables:**
- [ ] `src/hooks/pushNotifications/` directory created
- [ ] Hooks organized by responsibility
- [ ] All existing imports still work
- [ ] TypeScript compiles without errors

**Dependencies:** Step 2.1 (establish pattern first)

---

## Phase 3: Component Consolidation

### Step 3.1: Analyze ScoringPairsSection Variants
**Status:** ⏳ Pending
**Type:** Custom
**Command:** N/A

**Prompt:**
```
Analyze the three ScoringPairsSection components to design a unified interface.

Files to analyze:
1. src/screens/admin/EditRoundScreen/components/ScoringPairsSection.tsx (212 lines)
2. src/screens/admin/AddRoundScreen/components/ScoringPairsSection.tsx (164 lines)
3. src/components/rounds/ViewRound/RoundDetailsTab/components/ScoringPairsSection.tsx (437 lines)

For each file, document:
1. Props interface
2. Internal state
3. Key functionality
4. UI elements rendered
5. Premium feature gating logic

Create a design document with:
- Unified props interface that supports all three variants
- Variant-specific behavior mapping
- Shared vs variant-specific UI elements
- Migration plan for each existing component
```

**Deliverables:**
- [ ] Analysis document created (can be in this file as notes or separate)
- [ ] Unified props interface designed
- [ ] Migration approach documented

**Dependencies:** None
**Notes:** This is analysis only - implementation is Step 3.2.

---

### Step 3.2: Create Unified ScoringPairsSection Component
**Status:** ⏳ Pending
**Type:** Command
**Command:** `/consolidate src/components/scoring/ScoringPairsSection.tsx`

**Prompt:**
```
Create a unified ScoringPairsSection component that replaces three duplicates.

Create: src/components/scoring/ScoringPairsSection.tsx

Requirements:
1. Support three variants via prop: `variant: 'edit' | 'create' | 'view'`
2. Consolidate shared functionality:
   - Premium feature toggle (scoring pairs enabled/disabled)
   - Info messages about the feature
   - Team match play detection
3. Variant-specific behavior:
   - 'create': Shows toggle, info message, team match play warning
   - 'edit': Shows toggle, shuffle button, handles premium states
   - 'view': Shows actual scoring pairs list, reciprocal vs circular patterns, loading state

Props interface (suggested):
```typescript
interface ScoringPairsSectionProps {
  variant: 'edit' | 'create' | 'view';

  // Common props
  roundId?: string;
  enabled: boolean;
  onToggle?: (enabled: boolean) => void;
  isPremium?: boolean;

  // Edit variant
  onShuffle?: () => void;

  // View variant
  scoringPairs?: ScoringPair[];
  isLoading?: boolean;
  patternType?: 'reciprocal' | 'circular';

  // Create variant
  isTeamMatchPlay?: boolean;
}
```

After creating, update:
1. src/screens/admin/EditRoundScreen/components/ - import from shared
2. src/screens/admin/AddRoundScreen/components/ - import from shared
3. src/components/rounds/ViewRound/RoundDetailsTab/components/ - import from shared

Delete the duplicate files after migration is complete and tested.
```

**Deliverables:**
- [ ] `src/components/scoring/ScoringPairsSection.tsx` created
- [ ] All three variant behaviors supported
- [ ] EditRoundScreen updated to use shared component
- [ ] AddRoundScreen updated to use shared component
- [ ] ViewRound updated to use shared component
- [ ] Duplicate files deleted
- [ ] TypeScript compiles without errors
- [ ] All three screens work correctly (manual test)

**Dependencies:** Step 3.1 (analysis)

---

## Phase 4: Service Layer Cleanup

### Step 4.1: Split `cacheService.ts` into Club and Course Caches
**Status:** ⏳ Pending
**Type:** Command
**Command:** `/split-service src/services/courses/cacheService.ts`

**Prompt:**
```
Split cacheService.ts (827 lines) into focused club and course cache services.

Current file: src/services/courses/cacheService.ts

Target structure:
```
src/services/courses/
├── cacheService.ts       # Keep as re-export for backward compatibility
├── clubCacheService.ts   # Club caching: getClub, cacheClub, invalidateClub, etc.
└── courseCacheService.ts # Course caching: getCourse, cacheCourse, invalidateCourse, etc.
```

Guidelines:
1. Identify club-specific caching functions → `clubCacheService.ts`
2. Identify course-specific caching functions → `courseCacheService.ts`
3. Keep shared utilities (like TTL checking) in a shared location or duplicate minimally
4. Update `cacheService.ts` to re-export from both new files
```

**Deliverables:**
- [ ] `src/services/courses/clubCacheService.ts` created
- [ ] `src/services/courses/courseCacheService.ts` created
- [ ] `src/services/courses/cacheService.ts` updated as re-export
- [ ] All existing imports still work
- [ ] TypeScript compiles without errors

**Dependencies:** Phase 2 complete (establish patterns)

---

### Step 4.2: Extract GPS Calculations from `coordinatesService.ts`
**Status:** ⏳ Pending
**Type:** Custom
**Command:** N/A

**Prompt:**
```
Extract GPS calculation functions from coordinatesService.ts (740 lines) to utilities.

Current file: src/services/courses/coordinatesService.ts

Tasks:
1. Identify pure calculation functions (distance, bearing, etc.)
2. Create `src/utils/gpsCalculations.ts` with:
   - Distance calculations (Haversine formula)
   - Bearing calculations
   - Coordinate transformations
   - Any other pure math functions
3. Update `coordinatesService.ts` to import from the utility
4. The service should focus on:
   - Fetching coordinates from database
   - Caching coordinate data
   - Coordinate CRUD operations
```

**Deliverables:**
- [ ] `src/utils/gpsCalculations.ts` created
- [ ] Pure calculation functions extracted
- [ ] `coordinatesService.ts` simplified
- [ ] TypeScript compiles without errors

**Dependencies:** None

---

### Step 4.3: Split `sync.ts` into Orchestrator and Strategies
**Status:** ⏳ Pending
**Type:** Command
**Command:** `/split-service src/services/offline/sync.ts`

**Prompt:**
```
Split sync.ts (684 lines) into focused offline sync modules.

Current file: src/services/offline/sync.ts

Target structure:
```
src/services/offline/
├── sync.ts              # Keep as re-export for backward compatibility
├── syncOrchestrator.ts  # Main sync logic, coordinates sync operations
├── syncRetry.ts         # Retry strategy, backoff logic, max attempts
└── networkState.ts      # Network monitoring, online/offline detection
```

Guidelines:
1. Main sync coordination → `syncOrchestrator.ts`
2. Retry logic and backoff → `syncRetry.ts`
3. Network state management → `networkState.ts`
4. Keep `sync.ts` as backward-compatible re-export
```

**Deliverables:**
- [ ] `src/services/offline/syncOrchestrator.ts` created
- [ ] `src/services/offline/syncRetry.ts` created
- [ ] `src/services/offline/networkState.ts` created
- [ ] `src/services/offline/sync.ts` updated as re-export
- [ ] All existing imports still work
- [ ] TypeScript compiles without errors
- [ ] Offline sync still works (manual test)

**Dependencies:** None

---

### Step 4.4: Create Standardized AppError Class
**Status:** ⏳ Pending
**Type:** Custom
**Command:** N/A

**Prompt:**
```
Create a standardized error class for consistent error handling across services.

Create: src/services/errors/AppError.ts

Requirements:
1. Create AppError class extending Error:
   ```typescript
   export type ErrorCode =
     | 'NOT_FOUND'
     | 'VALIDATION'
     | 'DATABASE'
     | 'PERMISSION'
     | 'NETWORK'
     | 'TIMEOUT'
     | 'UNKNOWN';

   export class AppError extends Error {
     code: ErrorCode;
     originalError?: Error;

     constructor(message: string, code: ErrorCode, originalError?: Error) {
       super(message);
       this.name = 'AppError';
       this.code = code;
       this.originalError = originalError;
     }

     static fromError(error: unknown, code: ErrorCode = 'UNKNOWN'): AppError {
       if (error instanceof AppError) return error;
       if (error instanceof Error) return new AppError(error.message, code, error);
       return new AppError(String(error), code);
     }
   }
   ```

2. Create helper functions:
   - `isAppError(error: unknown): error is AppError`
   - `createError(message: string, code: ErrorCode): AppError`

3. Export from `src/services/errors/index.ts`

4. Document migration path for services currently throwing raw errors

Note: Hooks already use a similar pattern (`createError` in useSkins.ts) - this standardizes it.
```

**Deliverables:**
- [ ] `src/services/errors/AppError.ts` created
- [ ] `src/services/errors/index.ts` created
- [ ] Helper functions implemented
- [ ] TypeScript compiles without errors

**Dependencies:** None
**Notes:** This creates the foundation. Migrating existing services to use it is a separate effort.

---

## Phase 5: Polish

### Step 5.1: Create `useDebouncedValue` Hook
**Status:** ⏳ Pending
**Type:** Custom
**Command:** N/A

**Prompt:**
```
Create a reusable debounce hook for search and input patterns.

The debounce pattern is repeated in multiple places (e.g., useSearchClubs with 300ms debounce).

Create: src/hooks/useDebouncedValue.ts

```typescript
import { useState, useEffect } from 'react';

/**
 * Debounces a value by the specified delay
 * @param value - The value to debounce
 * @param delay - Delay in milliseconds (default: 300)
 * @returns The debounced value
 */
export function useDebouncedValue<T>(value: T, delay: number = 300): T {
  const [debouncedValue, setDebouncedValue] = useState<T>(value);

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedValue(value), delay);
    return () => clearTimeout(timer);
  }, [value, delay]);

  return debouncedValue;
}
```

Export from src/hooks/index.ts
```

**Deliverables:**
- [ ] `src/hooks/useDebouncedValue.ts` created
- [ ] Exported from `src/hooks/index.ts`
- [ ] TypeScript compiles without errors

**Dependencies:** None
**Notes:** After creating, existing debounce implementations can be migrated in a follow-up.

---

### Step 5.2: Create Generic `useEntity` Hook Factory
**Status:** ⏳ Pending
**Type:** Custom
**Command:** N/A

**Prompt:**
```
Create a generic hook factory for single entity fetching (repeated in 15+ hooks).

The pattern is repeated across: usePlayer, useTeeById, useGreenCoordinate, useTeeCoordinate, useCourseDetails, etc.

Create: src/hooks/useEntity.ts

```typescript
import { useQuery, UseQueryOptions } from '@tanstack/react-query';
import { supabase } from '@/services/supabase/client';

type SupabaseTable = 'players' | 'tees' | 'courses' | 'clubs' | 'competitions' | 'rounds' | /* ... */;

interface UseEntityOptions<T> extends Omit<UseQueryOptions<T | null, Error>, 'queryKey' | 'queryFn'> {
  select?: string;
}

/**
 * Generic hook for fetching a single entity by ID
 *
 * @example
 * const { data: player } = useEntity('players', playerId);
 * const { data: course } = useEntity('courses', courseId, { select: '*, club(*)' });
 */
export function useEntity<T>(
  table: SupabaseTable,
  id: string | undefined,
  options?: UseEntityOptions<T>
) {
  const { select = '*', ...queryOptions } = options ?? {};

  return useQuery({
    queryKey: [table, 'detail', id],
    queryFn: async () => {
      if (!id) return null;

      const { data, error } = await supabase
        .from(table)
        .select(select)
        .eq('id', id)
        .single();

      if (error && error.code === 'PGRST116') return null; // Not found
      if (error) throw error;
      return data as T;
    },
    enabled: !!id,
    staleTime: 5 * 60 * 1000, // 5 minutes
    ...queryOptions,
  });
}
```

Export from src/hooks/index.ts
```

**Deliverables:**
- [ ] `src/hooks/useEntity.ts` created
- [ ] Exported from `src/hooks/index.ts`
- [ ] TypeScript compiles without errors

**Dependencies:** None
**Notes:** This is a foundation - migrating existing hooks to use it is optional/follow-up work.

---

### Step 5.3: Extract Inline Data Fetching from CompetitionDetailScreen
**Status:** ⏳ Pending
**Type:** Custom
**Command:** N/A

**Prompt:**
```
Extract inline data fetching from CompetitionDetailScreen to a dedicated hook.

Current: src/screens/competitions/CompetitionDetailScreen.tsx has inline async function `fetchCompetitionDetails()` at line 56-155.

Tasks:
1. Create `src/hooks/useCompetitionDetails.ts` with:
   - The data fetching logic from the screen
   - Proper React Query integration
   - Type definitions for the composite data

2. Update CompetitionDetailScreen.tsx to:
   - Import and use the new hook
   - Remove inline fetching logic

The screen should focus on rendering, the hook should handle data.
```

**Deliverables:**
- [ ] `src/hooks/useCompetitionDetails.ts` created
- [ ] `CompetitionDetailScreen.tsx` simplified
- [ ] TypeScript compiles without errors
- [ ] Competition detail screen works correctly (manual test)

**Dependencies:** Phase 2 complete

---

### Step 5.4: Extract Inline Hook from ViewRoundScreen
**Status:** ⏳ Pending
**Type:** Custom
**Command:** N/A

**Prompt:**
```
Extract inline useCompetitionInfo hook from ViewRoundScreen to a dedicated file.

Current: src/screens/rounds/ViewRoundScreen.tsx has inline hook definition `useCompetitionInfo()` at lines 83-100.

Tasks:
1. Create `src/hooks/useCompetitionInfo.ts` with:
   - The hook logic from the screen
   - Proper exports and types

2. Update ViewRoundScreen.tsx to:
   - Import the hook from the new file
   - Remove inline hook definition
```

**Deliverables:**
- [ ] `src/hooks/useCompetitionInfo.ts` created
- [ ] `ViewRoundScreen.tsx` simplified
- [ ] TypeScript compiles without errors
- [ ] View round screen works correctly (manual test)

**Dependencies:** None

---

## Critical Files

### To Create
| File | Description |
|------|-------------|
| `src/utils/teeTransformers.ts` | Shared tee transformation utilities |
| `src/utils/roundLeaderboardFormatters.ts` | Leaderboard formatting logic |
| `src/utils/gpsCalculations.ts` | GPS distance/bearing calculations |
| `src/hooks/skins/` | Split skins hooks directory |
| `src/hooks/prizePool/` | Split prize pool hooks directory |
| `src/hooks/playerStatistics/` | Split player statistics hooks directory |
| `src/hooks/clubs/` | Split clubs hooks directory |
| `src/hooks/pushNotifications/` | Split push notification hooks directory |
| `src/hooks/useDebouncedValue.ts` | Shared debounce hook |
| `src/hooks/useEntity.ts` | Generic entity fetching hook |
| `src/hooks/useCompetitionDetails.ts` | Extracted competition details hook |
| `src/hooks/useCompetitionInfo.ts` | Extracted competition info hook |
| `src/components/scoring/ScoringPairsSection.tsx` | Unified scoring pairs component |
| `src/services/courses/clubCacheService.ts` | Club-specific caching |
| `src/services/courses/courseCacheService.ts` | Course-specific caching |
| `src/services/offline/syncOrchestrator.ts` | Main sync logic |
| `src/services/offline/syncRetry.ts` | Retry strategy |
| `src/services/offline/networkState.ts` | Network monitoring |
| `src/services/errors/AppError.ts` | Standardized error class |

### To Delete
| File | Reason |
|------|--------|
| `src/hooks/useLeaderboard.ts` | Deprecated wrapper, single usage migrated |
| `src/screens/admin/EditRoundScreen/components/ScoringPairsSection.tsx` | Consolidated |
| `src/screens/admin/AddRoundScreen/components/ScoringPairsSection.tsx` | Consolidated |
| `src/components/rounds/ViewRound/RoundDetailsTab/components/ScoringPairsSection.tsx` | Consolidated |

### To Modify (Major)
| File | Changes |
|------|---------|
| `src/hooks/useRoundDetails.ts` | Remove duplicate `teeToTeeBox()` |
| `src/hooks/useClubs.ts` | Split into folder, remove duplicate |
| `src/hooks/useSkins.ts` | Split into folder |
| `src/hooks/usePrizePool.ts` | Split into folder |
| `src/hooks/usePlayerStatistics.ts` | Split into folder |
| `src/hooks/usePushNotifications.ts` | Split into folder |
| `src/hooks/useRoundLeaderboard.ts` | Extract formatters |
| `src/hooks/index.ts` | Update exports |
| `src/screens/competitions/LeaderboardScreen.tsx` | Migrate from useLeaderboard |
| `src/screens/competitions/CompetitionDetailScreen.tsx` | Extract inline fetching |
| `src/screens/rounds/ViewRoundScreen.tsx` | Extract inline hook |
| `src/services/courses/cacheService.ts` | Split into club/course |
| `src/services/courses/coordinatesService.ts` | Extract GPS calcs |
| `src/services/offline/sync.ts` | Split into modules |

---

## Verification

After each phase:
1. `pnpm type-check` - TypeScript compiles without errors
2. `pnpm lint` - No linting errors
3. `pnpm test` - All tests pass
4. Manual testing of affected screens in Expo

### Phase-specific verification:
- **Phase 1**: Leaderboard screen displays correctly
- **Phase 2**: All screens using split hooks still work
- **Phase 3**: EditRound, AddRound, and ViewRound scoring pairs work
- **Phase 4**: Offline sync works, course caching works
- **Phase 5**: Competition detail and round detail screens work

---

## Execution Notes

1. **Backward Compatibility**: All splits use re-exports so existing imports continue to work
2. **Incremental**: Each step can be committed independently
3. **Reversible**: If issues arise, changes can be reverted per-step
4. **Testing**: Run type-check after each step to catch issues early
