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
**Status:** ⏳ Pending
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

**Deliverables:**
- [ ] `src/services/sync/index.ts` created
- [ ] Exports: `isClubStale`, `isCourseStale`, `hasApiQuota`, `STALE_DAYS`

**Dependencies:** None
**Notes:** This is the foundation for all sync decisions.

---

## Phase 2: Club Sync Hook

### Step 2.1: Create useClubSync Hook
**Status:** ⏳ Pending
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

**Deliverables:**
- [ ] `src/hooks/useClubSync.ts` created
- [ ] Hook handles stale detection and auto-sync
- [ ] Non-blocking (user sees cached data immediately)

**Dependencies:** Step 1.1
**Notes:** This hook will be used in ClubScreen for auto-refresh on view.

---

### Step 2.2: Export Hook from Index
**Status:** ⏳ Pending
**Type:** Custom
**Command:** N/A

**Prompt:**
```
Add export for useClubSync to src/hooks/index.ts:

export { useClubSync } from './useClubSync';

Place it alphabetically with other exports.
```

**Deliverables:**
- [ ] `useClubSync` exported from `src/hooks/index.ts`

**Dependencies:** Step 2.1
**Notes:** Standard hook export pattern.

---

## Phase 3: Search Integration

### Step 3.1: Add Sync Detection to useSearchClubs
**Status:** ⏳ Pending
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

**Deliverables:**
- [ ] useSearchClubs detects stale local clubs in search results
- [ ] Stale clubs are queued for background refresh
- [ ] Sync is non-blocking and quota-aware

**Dependencies:** Step 1.1
**Notes:** This enables sync-on-search behavior.

---

## Phase 4: Club Screen Integration

### Step 4.1: Add useClubSync to ClubScreen
**Status:** ⏳ Pending
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

**Deliverables:**
- [ ] ClubScreen uses useClubSync for auto-refresh
- [ ] Sync status visible to users
- [ ] Optional manual refresh button

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
- [ ] isClubStale returns true for clubs with old last_synced
- [ ] isClubStale returns false for clubs without golfapi_club_id
- [ ] hasApiQuota correctly checks golfApiClient.apiRequestsLeft

### Integration Tests
- [ ] Search for a stale club, verify background refresh triggers
- [ ] Navigate to stale club detail, verify auto-refresh
- [ ] Verify quota exhaustion gracefully skips sync

### Manual Testing
- [ ] Find a club in DB with old last_synced timestamp
- [ ] Search for it, confirm data updates after a moment
- [ ] View club detail, confirm "Updating..." indicator shows briefly
- [ ] Test with network disabled - should show cached data without errors

### Type Check
- [ ] Run `pnpm type-check` - no new TypeScript errors
