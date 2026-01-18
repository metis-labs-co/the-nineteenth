# Plan: GolfAPI.io Course Data Sync

## Overview
Keep local database courses (300+) in sync with GolfAPI.io as the source of truth. When users search or view clubs, detect stale data and refresh automatically.

## Approach
Opportunistic sync strategy - refresh data at natural user touchpoints:
- **On Search**: When local club matches API result and is stale, queue background refresh
- **On View**: When viewing club detail with stale data, auto-refresh silently

## Key Decisions

| Decision | Choice | Rationale |
|----------|--------|-----------|
| Scope | Core only | Sync on search + auto-refresh on view. No background batch sync. |
| Legacy clubs | Ignore | Only clubs with `golfapi_club_id` will sync. Legacy/manual clubs unchanged. |
| Conflicts | API always wins | No manual override tracking. Simpler implementation. |
| TTL | 30 days | Match existing cache service TTL. |
| Quota handling | Skip if low | Use cached data when quota exhausted. |

---

## Phase 1: Sync Service

### Step 1.1: Create Sync Utilities
**Status:** ✅ Complete (2026-01-18)
**Type:** Custom
**Command:** N/A

**Prompt:**
```
Create a new sync service at src/services/sync/index.ts with the following utilities:

1. isClubStale(club: Club): boolean
   - Return false if no golfapi_club_id (can't sync)
   - Return true if last_synced is null (never synced)
   - Return true if last_synced > 30 days ago
   - Otherwise return false

2. isCourseStale(course: Course): boolean
   - Return true if golfapi_updated_at is null
   - Return true if golfapi_updated_at > 30 days ago
   - Otherwise return false

3. hasApiQuota(required?: number): boolean
   - Import golfApiClient from @/services/api/golfApiClient
   - Check golfApiClient.apiRequestsLeft against required (default 1)
   - Return true if enough quota, false otherwise

4. Export STALE_DAYS = 30 constant

Use existing type imports from @/types/database.types for Club and Course.
Follow existing service patterns in src/services/courses/.
```

**Completed:**
- `src/services/sync/index.ts` created
- Exports: `isClubStale`, `isCourseStale`, `hasApiQuota`, `STALE_DAYS`
- Added bonus utilities: `getClubSyncAgeDays`, `getCourseSyncAgeDays`, `canSyncClub`

**Deliverables:**
- [x] `src/services/sync/index.ts` created
- [x] Exports: `isClubStale`, `isCourseStale`, `hasApiQuota`, `STALE_DAYS`

**Dependencies:** None
**Notes:** This is the foundation for all sync decisions.

---

## Phase 2: Club Sync Hook

### Step 2.1: Create useClubSync Hook
**Status:** ✅ Complete (2026-01-18)
**Type:** Custom
**Command:** N/A

**Prompt:**
```
Create a new hook at src/hooks/useClubSync.ts for syncing individual clubs:

Requirements:
1. Accept clubId: string parameter
2. Use useClubDetails to get current club data
3. Check if club is stale using isClubStale from @/services/sync
4. Check if we have API quota using hasApiQuota

Implement sync mutation:
- Use useMutation from @tanstack/react-query
- Call courseService.importClubWithCourses(club.golfapi_club_id) for refresh
- On success: invalidate clubKeys.detail(clubId) and clubKeys.all
- On error: log silently, don't throw (graceful degradation)

Auto-sync on mount:
- Use useEffect to check staleness on mount
- If stale and has quota, trigger mutation (fire-and-forget)
- Add ref to prevent duplicate syncs during same mount cycle

Return interface:
{
  isSyncing: boolean,
  lastSynced: Date | null,
  forceSync: () => void,
  syncError: Error | null
}

Reference patterns from:
- src/hooks/useImportClub.ts for mutation patterns
- src/hooks/useClubDetails.ts for club data fetching
- src/hooks/queryKeys.ts for cache keys
```

**Completed:**
- `src/hooks/useClubSync.ts` created with full implementation
- Returns extended interface including `canSync` and `isStale` for UI convenience
- Auto-syncs on mount when club is stale and quota is available
- Resets auto-sync flag when clubId changes (for navigation between clubs)

**Deliverables:**
- [x] `src/hooks/useClubSync.ts` created
- [x] Hook handles stale detection and auto-sync
- [x] Non-blocking (user sees cached data immediately)

**Dependencies:** Step 1.1
**Notes:** This hook will be used in ClubScreen for auto-refresh on view.

---

### Step 2.2: Export Hook from Index
**Status:** ✅ Complete (2026-01-18)
**Type:** Custom
**Command:** N/A

**Prompt:**
```
Add export for useClubSync to src/hooks/index.ts:

export { useClubSync } from './useClubSync';

Place it alphabetically with other exports.
```

**Completed:**
- Added export for `useClubSync` hook
- Added export for `UseClubSyncResult` type
- Placed near `useImportClub` (related functionality)

**Deliverables:**
- [x] `useClubSync` exported from `src/hooks/index.ts`

**Dependencies:** Step 2.1
**Notes:** Standard hook export pattern.

---

## Phase 3: Search Integration

### Step 3.1: Add Sync Detection to useSearchClubs
**Status:** ✅ Complete (2026-01-18)
**Type:** Custom
**Command:** N/A

**Prompt:**
```
Modify src/hooks/useClubs.ts to add stale detection to useSearchClubs.

Find the useSearchClubs hook (around line 200+). After the mergedResults logic:

1. Import isClubStale and hasApiQuota from @/services/sync
2. Import courseService from @/services/courses/courseService
3. Add a useEffect that:
   - Runs when mergedResults changes
   - Filters local clubs (not API results) that:
     a. Have a golfapi_club_id
     b. Are stale (isClubStale returns true)
   - For each stale club (up to 3 to avoid quota drain):
     - Check hasApiQuota() before each refresh
     - Call courseService.importClubWithCourses(club.golfapi_club_id)
     - Fire and forget (don't await, don't block UI)
   - Use a ref to track which clubs we've already queued for refresh this session

4. Add a useMemo or flag to indicate if any local results are stale:
   hasStaleResults: boolean

The sync should be:
- Non-blocking (fire and forget)
- Quota-aware (skip if no quota)
- Deduplicated (don't sync same club twice per session)
- Limited (max 3 clubs per search to conserve quota)

Reference existing patterns in useSearchClubs for React Query usage.
```

**Completed:**
- Added imports for `isClubStale`, `hasApiQuota` from sync service
- Added import for `courseService` from courses service
- Added `syncedClubsRef` to track clubs already queued for refresh
- Added `useEffect` to detect and refresh stale clubs (max 3, quota-aware, non-blocking)
- Added `hasStaleResults` flag to return value for UI indicators
- Error handling removes from synced set to allow retry

**Deliverables:**
- [x] useSearchClubs detects stale local clubs in search results
- [x] Stale clubs are queued for background refresh
- [x] Sync is non-blocking and quota-aware

**Dependencies:** Step 1.1
**Notes:** This enables sync-on-search behavior.

---

## Phase 4: Club Screen Integration

### Step 4.1: Add useClubSync to ClubScreen
**Status:** ✅ Complete (2026-01-18)
**Type:** Custom
**Command:** N/A

**Prompt:**
```
Modify src/screens/courses/ClubScreen.tsx to use the new useClubSync hook:

1. Import useClubSync from @/hooks/useClubSync

2. After the existing useClubDetails hook call, add:
   const { isSyncing, lastSynced, forceSync } = useClubSync(clubId);

3. Update the existing sync status display (around line 51-77 where formatLastSynced and getSourceInfo are defined):
   - The screen already displays source info and last_synced
   - Add a subtle "Updating..." indicator when isSyncing is true
   - Could be a small ActivityIndicator next to the last synced date

4. Optional: Add a "Refresh" button/icon that calls forceSync()
   - Only show if club has golfapi_club_id (can sync)
   - Disable while isSyncing

The integration should be minimal - the hook handles all the sync logic.
ClubScreen just needs to show the sync status to users.
```

**Completed:**
- Added `useClubSync` import and hook call after `useClubDetails`
- Added "Updating..." indicator with ActivityIndicator in Data Source section header
- Updated "Last Updated" to "Last Synced" with refresh button
- Refresh button only shows when `canSync` is true (club has golfapi_club_id)
- Refresh button disabled while syncing
- Fixed TypeScript error: changed `golfapi_updated_at` to `last_synced` (correct Club field)
- Added styles for `syncIndicator`, `syncText`, `lastSyncedRow`, `refreshButton`

**Deliverables:**
- [x] ClubScreen uses useClubSync for auto-refresh
- [x] Sync status visible to users
- [x] Optional manual refresh button

**Dependencies:** Step 2.1
**Notes:** ClubScreen already has infrastructure for displaying source/sync info.

---

## Critical Files

### To Create
- `src/services/sync/index.ts` - Sync utilities (staleness detection, quota check)
- `src/hooks/useClubSync.ts` - Club sync hook

### To Modify
- `src/hooks/useClubs.ts` - Add stale detection to useSearchClubs
- `src/hooks/index.ts` - Export useClubSync
- `src/screens/courses/ClubScreen.tsx` - Use useClubSync for auto-refresh

---

## Verification

How to verify the plan is complete:

### Unit Tests
- [x] isClubStale returns true for clubs with old last_synced ✅
- [x] isClubStale returns false for clubs without golfapi_club_id ✅
- [x] hasApiQuota correctly checks golfApiClient.apiRequestsLeft ✅

**Test File:** `src/__tests__/services/sync/syncUtils.test.ts` (43 tests passing)
**Completed:** 2026-01-18

### Integration Tests
- [ ] Search for a stale club, verify background refresh triggers
- [ ] Navigate to stale club detail, verify auto-refresh
- [ ] Verify quota exhaustion gracefully skips sync

### Manual Testing
- [ ] Find a club in DB with old last_synced timestamp
- [ ] Search for it, confirm data updates after a moment
- [ ] View club detail, confirm "Updating..." indicator shows briefly
- [ ] Test with network disabled - should show cached data without errors

---

## Manual Testing Instructions

### Prerequisites

1. **Start the app** in development mode:
   ```bash
   npx expo start
   ```

2. **Open React Native debugger** or use console logs to observe sync behavior

3. **Have access to Supabase Dashboard** or a database client to modify test data

---

### Test 1: Auto-Sync on Club Detail View

**Goal:** Verify that viewing a stale club triggers automatic background refresh

**Setup:**
1. Open Supabase Dashboard → Table Editor → `clubs`
2. Find a club with a `golfapi_club_id` (API-sourced club)
3. Update its `last_synced` to 45 days ago:
   ```sql
   UPDATE clubs
   SET last_synced = NOW() - INTERVAL '45 days'
   WHERE golfapi_club_id IS NOT NULL
   LIMIT 1;
   ```
4. Note the club name for later

**Test Steps:**
1. Open the app and navigate to the Courses tab
2. Search for the club you modified (or browse to find it)
3. Tap on the club to open ClubScreen

**Expected Results:**
- [ ] Club detail loads immediately with cached data
- [ ] "Updating..." indicator appears briefly in the Data Source section
- [ ] After a moment, the "Last Synced" date updates to today
- [ ] No error messages or crashes
- [ ] Console shows sync mutation firing (if debugger attached)

---

### Test 2: Background Sync on Search

**Goal:** Verify that searching for stale clubs queues background refresh

**Setup:**
1. In Supabase, set multiple clubs to stale:
   ```sql
   UPDATE clubs
   SET last_synced = NOW() - INTERVAL '45 days'
   WHERE golfapi_club_id IS NOT NULL
   LIMIT 5;
   ```

**Test Steps:**
1. Open the app and navigate to the Courses tab
2. Type a search query that matches the stale clubs (e.g., "Golf")
3. Observe the search results

**Expected Results:**
- [ ] Search results appear immediately from local cache
- [ ] In console/debugger, you should see up to 3 clubs being queued for sync
- [ ] No UI blocking or loading spinners during background sync
- [ ] If you search again after a few seconds, `hasStaleResults` should be false

---

### Test 3: Manual Refresh Button

**Goal:** Verify the manual refresh button works correctly

**Setup:**
1. Navigate to any club with a `golfapi_club_id`

**Test Steps:**
1. Open a club detail screen (ClubScreen)
2. Scroll to the Data Source section
3. Tap the refresh icon button next to "Last Synced"

**Expected Results:**
- [ ] Refresh button is visible for API-sourced clubs
- [ ] Refresh button is NOT visible for manual clubs (no golfapi_club_id)
- [ ] Tapping refresh shows "Updating..." indicator
- [ ] Refresh button is disabled while syncing
- [ ] "Last Synced" date updates after sync completes

---

### Test 4: Fresh Club Does Not Sync

**Goal:** Verify that recently synced clubs don't trigger unnecessary syncs

**Setup:**
1. In Supabase, ensure a club has recent `last_synced`:
   ```sql
   UPDATE clubs
   SET last_synced = NOW()
   WHERE golfapi_club_id IS NOT NULL
   LIMIT 1;
   ```

**Test Steps:**
1. Navigate to the club you just updated
2. Open the club detail screen

**Expected Results:**
- [ ] No "Updating..." indicator appears
- [ ] No sync network request in console/debugger
- [ ] Club displays normally with cached data

---

### Test 5: Quota Exhaustion Handling

**Goal:** Verify graceful degradation when API quota is exhausted

**Setup:**
This is difficult to test without actually exhausting quota. Options:
- A) Temporarily modify `hasApiQuota` to always return `false`
- B) Wait until quota is actually low/exhausted

**Mock Approach (recommended for testing):**
1. Temporarily edit `src/services/sync/index.ts`:
   ```typescript
   export function hasApiQuota(required: number = 1): boolean {
     return false; // Force no quota for testing
   }
   ```

**Test Steps:**
1. Navigate to a stale club
2. Observe behavior

**Expected Results:**
- [ ] Club loads with cached data (no errors)
- [ ] No sync attempt is made (check console)
- [ ] No error messages shown to user
- [ ] App continues to function normally

**Cleanup:** Revert the mock change after testing

---

### Test 6: Offline Behavior

**Goal:** Verify app works offline with cached data

**Setup:**
1. First, visit several clubs while online to populate cache
2. Enable Airplane Mode on device/simulator

**Test Steps:**
1. With network disabled, navigate to the Courses tab
2. Search for a previously viewed club
3. Open the club detail screen

**Expected Results:**
- [ ] Previously cached clubs appear in search results
- [ ] Club detail screen loads with cached data
- [ ] No crash or error when sync fails due to network
- [ ] "Updating..." may appear briefly but fails silently
- [ ] User can continue browsing cached data

---

### Test 7: Manual Club Not Synced

**Goal:** Verify manual clubs (no golfapi_club_id) are not affected by sync

**Setup:**
1. Create or find a manual club:
   ```sql
   SELECT id, name, golfapi_club_id, source
   FROM clubs
   WHERE golfapi_club_id IS NULL
   LIMIT 1;
   ```

**Test Steps:**
1. Navigate to the manual club's detail screen
2. Check the Data Source section

**Expected Results:**
- [ ] No "Updating..." indicator appears
- [ ] No refresh button visible
- [ ] Source shows "Manually Added" (not "GolfAPI.io")
- [ ] No sync attempts in console

---

### Test 8: Sync Deduplication in Search

**Goal:** Verify the same club isn't synced multiple times per session

**Setup:**
1. Set one club to stale in Supabase

**Test Steps:**
1. Search for the stale club → observe sync triggered
2. Clear search and search again for the same club
3. Repeat 2-3 times

**Expected Results:**
- [ ] First search triggers sync for the stale club
- [ ] Subsequent searches do NOT trigger additional syncs
- [ ] `syncedClubsRef` prevents duplicate sync attempts
- [ ] Only 1 network request for that club (check Network tab)

---

### Debugging Tips

**Enable verbose logging:**
- GolfAPI client logs are enabled in `__DEV__` mode
- Look for `[GolfAPI]` prefixed console messages

**Check sync state:**
- Add a temporary `console.log` in `useClubSync.ts` to log `isStale`, `canSync`, `isSyncing`

**Monitor network:**
- Use React Native Debugger or Flipper to monitor network requests
- Look for requests to `golfapi.io/api/v2.3/clubs/`

**Database queries:**
```sql
-- Find all stale clubs (>30 days since sync)
SELECT id, name, last_synced,
       EXTRACT(DAY FROM NOW() - last_synced) as days_since_sync
FROM clubs
WHERE golfapi_club_id IS NOT NULL
  AND last_synced < NOW() - INTERVAL '30 days'
ORDER BY last_synced ASC;

-- Find clubs that have never been synced
SELECT id, name, golfapi_club_id, last_synced
FROM clubs
WHERE golfapi_club_id IS NOT NULL
  AND last_synced IS NULL;

-- Reset a club to stale for testing
UPDATE clubs
SET last_synced = NOW() - INTERVAL '45 days'
WHERE id = 'YOUR-CLUB-UUID';
```

---

### Test Completion Checklist

After completing all tests, mark them off:

| Test | Status | Notes |
|------|--------|-------|
| 1. Auto-Sync on Club Detail | ⬜ | |
| 2. Background Sync on Search | ⬜ | |
| 3. Manual Refresh Button | ⬜ | |
| 4. Fresh Club No Sync | ⬜ | |
| 5. Quota Exhaustion | ⬜ | |
| 6. Offline Behavior | ⬜ | |
| 7. Manual Club Not Synced | ⬜ | |
| 8. Sync Deduplication | ⬜ | |

### Type Check
- [x] Run `pnpm type-check` - no new TypeScript errors ✅ (2026-01-18)
  - Verified: No TypeScript errors in sync-related files (src/services/sync/, src/hooks/useClubSync.ts, useClubs.ts, ClubScreen.tsx)
  - Note: Pre-existing errors exist in other files, unrelated to this plan
