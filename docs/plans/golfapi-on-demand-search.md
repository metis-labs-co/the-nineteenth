# Plan: On-Demand Course Fetching from GolfAPI.io

## Overview
Add GolfAPI.io search fallback to CourseListScreen so users can find and import courses not yet in the local database. Courses are imported transparently when selected, and the database grows organically based on user demand.

## Approach
- Search local Supabase DB first
- If few/no results, also search GolfAPI.io API
- Merge results seamlessly (no visual distinction)
- When user selects an API result, import it behind the scenes before navigating
- Database grows organically based on user demand

## Key Decisions

| Decision | Choice | Rationale |
|----------|--------|-----------|
| API trigger | Search when local results < 3 | Avoid unnecessary API calls |
| Visual distinction | None | User requested same appearance |
| Import timing | On selection | Seamless UX, course cached for future |
| Coordinates | Skip on import | Saves API calls; can be fetched on-demand when user visits course detail screen for GPS distance features |
| Debouncing | 300ms delay | Prevents excessive API calls during typing |
| Scope | CourseListScreen first | Other selection flows (competition wizard, round creation) can be added in Phase 5 |

---

## Phase 1: Create Search Hooks

### Step 1.1: Create useGolfApiSearch Hook
**Status:** ✅ Complete
**Type:** Custom

**Prompt:**
```
Create a new hook `useGolfApiSearch` in `src/hooks/useGolfApiSearch.ts` that:

1. Takes parameters: `searchQuery: string`, `state?: AustralianState`, `enabled?: boolean`

2. Uses React Query to fetch from GolfAPI.io:
   - Call `golfApiClient.searchClubs({ query, country: 'Australia', state })`
   - Only run when `enabled` is true and `searchQuery.length >= 3`
   - Cache results for 5 minutes (staleTime)

3. Transform results to match local ClubWithCourses shape as closely as possible:
   - Map `clubID` → temporary `id` (prefixed like `golfapi_${clubID}`)
   - Map `clubName` → `name`
   - Set `source: 'golfapi'` to identify API results
   - Include original `clubID` as `golfapi_club_id`

4. Return: `{ data, isLoading, error }`

Reference:
- GolfAPI client: `src/services/api/golfApiClient.ts`
- GolfAPI types: `src/services/api/golfApiTypes.ts`
- Existing hook pattern: `src/hooks/useClubs.ts`
```

**Deliverables:**
- [x] `src/hooks/useGolfApiSearch.ts`

**Dependencies:** None

---

### Step 1.2: Update useSearchClubs to Merge API Results
**Status:** ✅ Complete
**Type:** Custom

**Prompt:**
```
Update `useSearchClubs` in `src/hooks/useClubs.ts` to:

1. Import and use `useGolfApiSearch` hook from '@/hooks/useGolfApiSearch'

2. Add debounced search query state to prevent excessive API calls:
   ```typescript
   const [debouncedQuery, setDebouncedQuery] = useState(searchQuery);

   useEffect(() => {
     const timer = setTimeout(() => setDebouncedQuery(searchQuery), 300);
     return () => clearTimeout(timer);
   }, [searchQuery]);
   ```

3. Enable API search only when:
   - Local search has finished loading
   - Local results count is < 3
   - Debounced search query is at least 3 characters

4. Merge results using useMemo:
   ```typescript
   const mergedResults = useMemo(() => {
     const localResults = data ?? [];
     if (!apiResults?.length) return localResults;

     // Get golfapi_club_ids already in local DB
     const localGolfApiIds = new Set(
       localResults
         .filter((c) => c.golfapi_club_id)
         .map((c) => c.golfapi_club_id)
     );

     // Filter out API results already imported
     const newApiResults = apiResults.filter(
       (r) => !localGolfApiIds.has(r.golfapi_club_id)
     );

     return [...localResults, ...newApiResults];
   }, [data, apiResults]);
   ```

5. Add return values:
   - `isSearchingApi: boolean` - API search in progress
   - `apiSearchEnabled: boolean` - Whether API search was triggered

6. Export union type and type guard:
   ```typescript
   export type SearchResultItem = ClubWithCourses | GolfApiSearchResultItem;

   export function isLocalClub(item: SearchResultItem): item is ClubWithCourses {
     return !('source' in item) || item.source !== 'golfapi';
   }
   ```

Current useSearchClubs location: lines 232-309 in src/hooks/useClubs.ts
```

**Deliverables:**
- [x] Updated `src/hooks/useClubs.ts` with:
  - Debounced API search
  - Merged results with deduplication
  - `SearchResultItem` type export
  - `isLocalClub` type guard export
  - `isSearchingApi` return value

**Dependencies:** Step 1.1

---

## Phase 2: Create Import Hook

### Step 2.1: Create useImportClub Hook
**Status:** ✅ Complete
**Type:** Custom

**Prompt:**
```
Create a mutation hook `useImportClub` in `src/hooks/useImportClub.ts` that:

1. Import dependencies:
   - `useMutation`, `useQueryClient` from '@tanstack/react-query'
   - `courseService` from '@/services/courses/courseService'
   - `clubKeys`, `courseKeys` from '@/hooks/queryKeys'

2. Create the hook:
   ```typescript
   export function useImportClub() {
     const queryClient = useQueryClient();

     return useMutation({
       mutationFn: async (golfapiClubId: string) => {
         return courseService.importClubWithCourses(golfapiClubId);
       },
       onSuccess: () => {
         queryClient.invalidateQueries({ queryKey: clubKeys.all });
         queryClient.invalidateQueries({ queryKey: courseKeys.all });
       },
     });
   }
   ```

3. Export the hook and its return type

Reference:
- Course service: `src/services/courses/courseService.ts` (importClubWithCourses method)
- Query keys: `src/hooks/queryKeys.ts`
- Similar mutation pattern: `src/hooks/useClubs.ts` (useCreateClub)
```

**Deliverables:**
- [x] `src/hooks/useImportClub.ts`

**Dependencies:** None

---

## Phase 3: Update UI Components

### Step 3.1: Update ClubCard for API Results and Import Loading
**Status:** ✅ Complete
**Type:** Custom

**Prompt:**
```
Update `src/components/courses/ClubCard.tsx` to handle API results (not yet imported) and import loading state:

1. Update ClubCardProps interface:
   ```typescript
   interface ClubCardProps {
     item: ClubCourseDisplayItem | GolfApiSearchResultItem;  // Accept both types
     // ... existing props
     isImporting?: boolean;  // New: show loading during import
   }
   ```

2. Add type check at component start:
   ```typescript
   const isApiResult = 'source' in item && item.source === 'golfapi';
   ```

3. Handle API results (which have empty courses array):

   For single-course detection, check `is_multi_course` flag instead of courses.length:
   ```typescript
   // API results: use is_multi_course flag (courses array is empty until imported)
   // Local results: use actual courses array
   const isSingleCourse = isApiResult
     ? !item.is_multi_course
     : item.type === 'single-course';
   ```

4. For API results in single-course mode, render a simplified card:
   ```typescript
   if (isApiResult && isSingleCourse) {
     return (
       <View style={[styles.cardContainer, { backgroundColor: colors.surface }]}>
         <TouchableOpacity
           style={styles.courseRow}
           onPress={() => onClubPress?.(item as unknown as Club)}
           disabled={isImporting}
           activeOpacity={0.7}
         >
           <View style={styles.courseRowContent}>
             <View style={[styles.iconContainer, { backgroundColor: colors.primaryLighter }]}>
               <Icon source="golf" size={24} color={colors.primary} />
             </View>
             <View style={styles.courseInfo}>
               <Text style={[styles.courseName, { color: colors.textPrimary }]} numberOfLines={1}>
                 {item.name}
               </Text>
               <Text style={[styles.clubSubtitle, { color: colors.textSecondary }]} numberOfLines={1}>
                 {[item.city, item.state].filter(Boolean).join(', ')}
               </Text>
             </View>
             <View style={styles.courseActions}>
               {isImporting ? (
                 <ActivityIndicator size="small" color={colors.primary} />
               ) : selectionMode ? (
                 <Icon source="chevron-right" size={24} color={colors.gray400} />
               ) : null}
             </View>
           </View>
         </TouchableOpacity>
       </View>
     );
   }
   ```

5. Update CourseRow component to accept `isImporting` prop:
   - Add to CourseRowProps: `isImporting?: boolean`
   - Pass through from ClubCard
   - In CourseRow, show ActivityIndicator instead of chevron when isImporting

6. Import ActivityIndicator from 'react-native-paper'

Reference: Current ClubCard structure at `src/components/courses/ClubCard.tsx`
- CourseRow handles single-course display (lines 67-200)
- ClubCard handles multi-course display (lines 206-365)
```

**Deliverables:**
- [x] Updated `src/components/courses/ClubCard.tsx` with:
  - Support for `GolfApiSearchResultItem` type
  - `isImporting` prop
  - Simplified API result rendering (no courses yet)
  - Loading indicator during import

**Dependencies:** None

---

### Step 3.2: Update CourseListContent for Loading States
**Status:** ✅ Complete
**Type:** Custom

**Prompt:**
```
Update `src/components/courses/CourseListContent.tsx` to:

1. Import types:
   ```typescript
   import type { SearchResultItem } from '@/hooks/useClubs';
   import { isGolfApiResult } from '@/hooks/useGolfApiSearch';
   ```

2. Update props interface:
   ```typescript
   interface CourseListContentProps {
     // Update items type to accept mixed results
     items: SearchResultItem[];
     // ... existing props
     isSearchingApi?: boolean;
     importingClubId?: string | null;
   }
   ```

3. When rendering ClubCard components, pass the `isImporting` prop:
   ```typescript
   const getImportingState = (item: SearchResultItem) => {
     if (isGolfApiResult(item)) {
       return importingClubId === item.golfapi_club_id;
     }
     return false;
   };

   // In render:
   <ClubCard
     item={item}
     isImporting={getImportingState(item)}
     // ... other props
   />
   ```

4. At the bottom of the list (ListFooterComponent), show API search indicator:
   ```typescript
   ListFooterComponent={isSearchingApi ? (
     <View style={styles.apiSearchingContainer}>
       <ActivityIndicator size="small" color={colors.primary} />
       <Text style={[styles.apiSearchingText, { color: colors.textSecondary }]}>
         Searching more courses...
       </Text>
     </View>
   ) : null}
   ```

5. Add styles:
   ```typescript
   apiSearchingContainer: {
     flexDirection: 'row',
     alignItems: 'center',
     justifyContent: 'center',
     padding: spacing.lg,
     gap: spacing.sm,
   },
   apiSearchingText: {
     ...typography.small,
   },
   ```

Reference: `src/components/courses/CourseListContent.tsx`
```

**Deliverables:**
- [x] Updated `src/components/courses/CourseListContent.tsx` with:
  - Updated props for mixed result types
  - `isSearchingApi` loading indicator
  - `importingClubId` prop for per-card loading state

**Dependencies:** Step 3.1

---

### Step 3.3: Update CourseListScreen with API Search and Import
**Status:** ✅ Complete
**Type:** Custom

**Prompt:**
```
Update `src/screens/courses/CourseListScreen.tsx` to:

1. Import new hooks, types, and toast:
   ```typescript
   import { useImportClub } from '@/hooks/useImportClub';
   import { isGolfApiResult } from '@/hooks/useGolfApiSearch';
   import type { SearchResultItem } from '@/hooks/useClubs';
   import { useToast } from '@/context/ToastContext';  // or your toast hook
   ```

2. Add state for import loading:
   ```typescript
   const [importingClubId, setImportingClubId] = useState<string | null>(null);
   ```

3. Initialize hooks:
   ```typescript
   const importClub = useImportClub();
   const { showToast } = useToast();
   ```

4. Get `isSearchingApi` from useSearchClubs (added in Step 1.2)

5. Update `handleClubPress` to handle API results:
   ```typescript
   const handleClubPress = useCallback(async (item: SearchResultItem | Club) => {
     // Check if this is an API result (not yet in DB)
     if (isGolfApiResult(item)) {
       setImportingClubId(item.golfapi_club_id);
       try {
         const result = await importClub.mutateAsync(item.golfapi_club_id);
         // Navigate to the newly imported club
         navigation.navigate('Club', { clubId: result.club.id });
       } catch (error) {
         console.error('Failed to import club:', error);
         showToast({
           type: 'error',
           message: 'Failed to import course. Please try again.',
         });
       } finally {
         setImportingClubId(null);
       }
     } else {
       // Already in DB - navigate directly
       navigation.navigate('Club', { clubId: item.id });
     }
   }, [importClub, navigation, showToast]);
   ```

6. Pass new props to CourseListContent:
   ```typescript
   <CourseListContent
     // ... existing props
     isSearchingApi={isSearchingApi}
     importingClubId={importingClubId}
   />
   ```

Reference: `src/screens/courses/CourseListScreen.tsx`
```

**Deliverables:**
- [x] Updated `src/screens/courses/CourseListScreen.tsx` with:
  - Import handling with loading state
  - Error alert on import failure (using React Native Alert)
  - Pass-through of API search and import state to content component

**Dependencies:** Step 1.2, Step 2.1, Step 3.2

---

### Step 3.4: Add Error Toast Component (if not exists)
**Status:** ⏭️ Skipped (using React Native Alert instead)
**Type:** Custom

**Prompt:**
```
Check if a toast/snackbar system exists in the codebase. If not, create one:

1. Check for existing toast implementation:
   - Look for `ToastContext`, `SnackbarContext`, or similar in `src/context/`
   - Check if react-native-paper Snackbar is already set up

2. If toast system exists:
   - Document how to use it in Step 3.3
   - Skip creating new implementation

3. If no toast system exists, create a simple one:

   Create `src/context/ToastContext.tsx`:
   ```typescript
   import React, { createContext, useContext, useState, useCallback } from 'react';
   import { Snackbar } from 'react-native-paper';
   import { useThemeColors } from './ThemeContext';

   interface ToastOptions {
     message: string;
     type?: 'info' | 'success' | 'error' | 'warning';
     duration?: number;
   }

   interface ToastContextValue {
     showToast: (options: ToastOptions) => void;
   }

   const ToastContext = createContext<ToastContextValue | null>(null);

   export function ToastProvider({ children }: { children: React.ReactNode }) {
     const colors = useThemeColors();
     const [visible, setVisible] = useState(false);
     const [options, setOptions] = useState<ToastOptions>({ message: '' });

     const showToast = useCallback((opts: ToastOptions) => {
       setOptions(opts);
       setVisible(true);
     }, []);

     const getBackgroundColor = () => {
       switch (options.type) {
         case 'error': return colors.error;
         case 'success': return colors.success;
         case 'warning': return colors.warning;
         default: return colors.gray800;
       }
     };

     return (
       <ToastContext.Provider value={{ showToast }}>
         {children}
         <Snackbar
           visible={visible}
           onDismiss={() => setVisible(false)}
           duration={options.duration ?? 3000}
           style={{ backgroundColor: getBackgroundColor() }}
         >
           {options.message}
         </Snackbar>
       </ToastContext.Provider>
     );
   }

   export function useToast() {
     const context = useContext(ToastContext);
     if (!context) throw new Error('useToast must be used within ToastProvider');
     return context;
   }
   ```

4. Wrap app with ToastProvider in App.tsx (inside ThemeProvider, PaperProvider)

Reference:
- Check `src/context/` for existing implementations
- React Native Paper Snackbar: https://callstack.github.io/react-native-paper/snackbar.html
```

**Deliverables:**
- [ ] Toast/snackbar system available for error feedback
- [ ] Document location of toast implementation

**Dependencies:** None

---

## Phase 4: Exports and Cleanup

### Step 4.1: Update Hook Exports
**Status:** ✅ Complete
**Type:** Custom

**Prompt:**
```
Update `src/hooks/index.ts` to export the new hooks and types:

Add these exports:
```typescript
// GolfAPI search
export { useGolfApiSearch, isGolfApiResult } from './useGolfApiSearch';
export type { GolfApiSearchResultItem } from './useGolfApiSearch';

// Club import
export { useImportClub } from './useImportClub';

// Also ensure these are exported from useClubs:
export type { SearchResultItem } from './useClubs';
export { isLocalClub } from './useClubs';
```

Reference: `src/hooks/index.ts`
```

**Deliverables:**
- [x] Updated `src/hooks/index.ts` with all new exports

**Dependencies:** Step 1.1, Step 1.2, Step 2.1

---

## Phase 5: Other Course Selection Flows (Future Enhancement)

> **Note:** This phase extends API search to other course selection entry points.
> Can be deferred until Phase 1-4 is validated in CourseListScreen.

### Step 5.1: Update AddRoundScreen CourseSelectionModal
**Status:** ⏳ Pending (Deferred)
**Type:** Custom

**Prompt:**
```
Update `src/screens/admin/AddRoundScreen/components/CourseSelectionModal.tsx` to support API fallback:

Current state: Uses `useCourses` and `useSearchCourses` (course-level, not club-level)

Options:
1. Refactor to use club-based search (useSearchClubs) like CourseListScreen
2. Create parallel `useSearchCoursesWithApi` hook that merges API results

Recommended: Option 1 - Refactor to use ClubCard and club-based search for consistency

Implementation:
1. Replace `useCourses`/`useSearchCourses` with `useSearchClubs`
2. Use ClubCard component instead of custom course cards
3. Add import handling similar to CourseListScreen
4. When user selects a course from multi-course club, import and navigate to course selection

Reference:
- Current implementation: `src/screens/admin/AddRoundScreen/components/CourseSelectionModal.tsx`
- Target pattern: `src/screens/courses/CourseListScreen.tsx` (after Phase 3)
```

**Deliverables:**
- [ ] Updated AddRoundScreen CourseSelectionModal with API fallback

**Dependencies:** Phase 1-4 complete

---

### Step 5.2: Update Competition Wizard CourseSelectionModal
**Status:** ⏳ Pending (Deferred)
**Type:** Custom

**Prompt:**
```
Update `src/components/competitionWizard/create/RoundDetailsStep/components/CourseSelectionModal.tsx`:

Same approach as Step 5.1 - refactor to use club-based search with ClubCard.

Reference:
- Current implementation: `src/components/competitionWizard/create/RoundDetailsStep/components/CourseSelectionModal.tsx`
```

**Deliverables:**
- [ ] Updated Competition Wizard CourseSelectionModal with API fallback

**Dependencies:** Step 5.1

---

### Step 5.3: Update CreateRoundBottomSheet CourseSelectionStep
**Status:** ⏳ Pending (Deferred)
**Type:** Custom

**Prompt:**
```
Update `src/screens/rounds/CreateRoundBottomSheet/steps/CourseSelectionStep.tsx`:

Same approach as Step 5.1 - refactor to use club-based search with ClubCard.

Reference:
- Current implementation: `src/screens/rounds/CreateRoundBottomSheet/steps/CourseSelectionStep.tsx`
```

**Deliverables:**
- [ ] Updated CreateRoundBottomSheet CourseSelectionStep with API fallback

**Dependencies:** Step 5.1

---

### Step 5.4: Update Home Club Selection Flows
**Status:** ⏳ Pending (Deferred)
**Type:** Custom

**Prompt:**
```
Update home club selection to use search with API fallback:

**Files to update:**
1. `src/screens/onboarding/components/HomeClubStep.tsx` - Onboarding home club selection
2. `src/screens/profile/components/HomeClubModal.tsx` - Profile home club change

**Current state:**
- Both components use `useClubsWithCourses()` to list all clubs
- No search functionality - users scroll through full list
- If user's club not in DB, they cannot select it

**Implementation:**
1. Add SearchBar component to both screens
2. Replace `useClubsWithCourses()` with `useSearchClubs(searchQuery, state)`
3. API fallback will automatically work (from Step 1.2)
4. Add import handling similar to CourseListScreen (from Step 3.3)
5. When user selects API result:
   - Import club via `useImportClub()`
   - Set as home club after import completes

**Why this matters:**
- Onboarding is first impression - users expect to find their home club
- Profile change is common operation
- Without API fallback, users with unlisted clubs have poor experience

Reference:
- HomeClubStep: `src/screens/onboarding/components/HomeClubStep.tsx`
- HomeClubModal: `src/screens/profile/components/HomeClubModal.tsx`
- Pattern to follow: `src/screens/courses/CourseListScreen.tsx` (after Phase 3)
```

**Deliverables:**
- [ ] Updated `src/screens/onboarding/components/HomeClubStep.tsx` with search and API fallback
- [ ] Updated `src/screens/profile/components/HomeClubModal.tsx` with search and API fallback

**Dependencies:** Step 5.1

---

## Phase 6: Testing

### Step 6.1: Unit Tests for Search Hook
**Status:** ✅ Complete (2026-01-18)
**Type:** Custom

**Completed:**
- Created comprehensive test suite with 28 test cases
- Tests cover: query validation, enabled state, result transformation, API availability, quota checks, error handling, state filter, type guards, and cache behavior
- All tests passing

**Prompt:**
```
Create tests for useGolfApiSearch hook in `src/__tests__/hooks/useGolfApiSearch.test.tsx`:

Test cases:
1. Should not fetch when query < 3 characters
2. Should not fetch when enabled=false
3. Should transform API results correctly
4. Should return empty array on API error (graceful degradation)
5. Should return empty array when API not available
6. Should return empty array when quota exhausted
7. Should cache results for 5 minutes

Use @testing-library/react-hooks and mock golfApiClient

Reference:
- Hook: `src/hooks/useGolfApiSearch.ts`
- Similar test patterns in `src/__tests__/hooks/`
```

**Deliverables:**
- [x] `src/__tests__/hooks/useGolfApiSearch.test.tsx`

**Dependencies:** Step 1.1

---

### Step 6.2: Unit Tests for Merge Logic
**Status:** ✅ Complete (2026-01-18)
**Type:** Custom

**Completed:**
- Created comprehensive test suite with 18 test cases
- Tests cover: local-only search, API fallback triggers, deduplication, result ordering, debouncing, type guards, API search status, empty results, state filter
- All tests passing

**Prompt:**
```
Create tests for the merge logic in useSearchClubs in `src/__tests__/hooks/useSearchClubs.test.tsx`:

Test cases:
1. Should return only local results when API disabled
2. Should return only local results when local count >= 3
3. Should merge API results when local count < 3
4. Should deduplicate by golfapi_club_id
5. Should debounce API calls (300ms)
6. Should preserve local results order (local first, then API)
7. isLocalClub type guard should correctly identify result types

Reference:
- Hook: `src/hooks/useClubs.ts` (useSearchClubs function)
```

**Deliverables:**
- [x] `src/__tests__/hooks/useSearchClubs.test.tsx`

**Dependencies:** Step 1.2

---

### Step 6.3: Integration Test for Import Flow
**Status:** ✅ Complete (2026-01-18)
**Type:** Custom

**Completed:**
- Created integration test suite with 7 test cases
- Tests cover: successful import flow (navigation, local DB update), failed import flow (error alert, stays on screen), loading state, local vs API results navigation, API search indicator
- All tests passing

**Prompt:**
```
Create integration test for the full import flow in `src/__tests__/integration/courseImport.test.tsx`:

Test cases:
1. Search returns API result → tap → import succeeds → navigates to Club
2. Search returns API result → tap → import fails → shows error toast → stays on screen
3. Import in progress → card shows loading indicator
4. Import succeeds → subsequent search shows club from local DB

Mock:
- golfApiClient
- courseService.importClubWithCourses
- navigation

Reference:
- CourseListScreen: `src/screens/courses/CourseListScreen.tsx`
```

**Deliverables:**
- [x] `src/__tests__/integration/courseImport.test.tsx`

**Dependencies:** Phase 3 complete

---

## Critical Files

### To Create
- `src/hooks/useGolfApiSearch.ts` - GolfAPI.io search hook ✅ Created
- `src/hooks/useImportClub.ts` - Club import mutation hook ✅ Created
- `src/context/ToastContext.tsx` - Toast/snackbar for error feedback ⏭️ Skipped (using Alert instead)
- `src/__tests__/hooks/useGolfApiSearch.test.tsx` - Search hook tests ✅ Created
- `src/__tests__/hooks/useSearchClubs.test.tsx` - Merge logic tests ✅ Created
- `src/__tests__/integration/courseImport.test.tsx` - Import flow tests ✅ Created

### To Modify
- `src/hooks/useClubs.ts` - Add API fallback, debouncing, type exports to useSearchClubs ✅ Updated
- `src/hooks/index.ts` - Export new hooks and types ✅ Updated
- `src/screens/courses/CourseListScreen.tsx` - Handle API results and import ✅ Updated
- `src/components/courses/CourseListContent.tsx` - Loading states, mixed types ✅ Updated
- `src/components/courses/ClubCard.tsx` - API result display, import loading indicator ✅ Updated

### To Modify (Phase 5 - Deferred)
- `src/screens/admin/AddRoundScreen/components/CourseSelectionModal.tsx`
- `src/components/competitionWizard/create/RoundDetailsStep/components/CourseSelectionModal.tsx`
- `src/screens/rounds/CreateRoundBottomSheet/steps/CourseSelectionStep.tsx`
- `src/screens/onboarding/components/HomeClubStep.tsx`
- `src/screens/profile/components/HomeClubModal.tsx`

---

## Verification

After completing Phases 1-4:

### Functional Tests
- [ ] Search for a club NOT in the database (e.g., "Royal Melbourne")
- [ ] Verify API results appear in search results (looking the same as local)
- [ ] Verify "Searching more courses..." indicator appears during API search
- [ ] Tap on an API result → loading spinner appears on that card
- [ ] After import completes → navigates to Club screen with full data
- [ ] Search again → club now appears from local DB (no duplicate, no API call)

### Error Handling
- [ ] Disable network → search only shows local results (graceful degradation)
- [ ] Mock API failure → error toast appears, stays on search screen
- [ ] Mock quota exhaustion → no API results, no error (silent fallback)

### Performance
- [ ] Type quickly → verify debounce prevents excessive API calls (check console)
- [ ] Check API quota via `golfApiClient.getRemainingRequests()`

### Code Quality
- [x] Run TypeScript check: `pnpm type-check` (Fixed 2026-01-18: Type errors in plan-related test files resolved)
- [x] Run linter: `pnpm lint` (Warnings only, no errors)
- [x] Run tests: `pnpm test` (53 tests passing for useGolfApiSearch, useSearchClubs, courseImport)

---

## Notes

### Offline Behavior
When offline, `golfApiClient.isAvailable()` returns false (checks for API key config). The hook gracefully returns empty results. Network connectivity is not explicitly checked - API errors are caught and logged.

### Quota Management
The hook checks `golfApiClient.hasQuota(1)` before making requests. When quota is low, search silently skips API (returns empty). Consider adding user-visible indicator if this becomes a UX issue.

### Import State Persistence
`importingClubId` is component state. If user navigates away mid-import:
- Import continues in background
- Loading state is lost
- This is acceptable for MVP; can add global mutation tracking later if needed

### Coordinate Import
Coordinates are intentionally skipped during club import to save API calls. They can be fetched on-demand when:
1. User visits course detail screen
2. GPS distance features are needed
3. Background refresh runs on stale courses
