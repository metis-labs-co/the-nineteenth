# Codebase Consolidation & Refactoring Plan

> **Document Location:** `docs/progress/CONSOLIDATION-REFACTORING-PLAN.md`
> **Created:** December 2024
> **Related:** See `CODE-CLEANUP-PLAN.md` for component consolidation patterns

## Overview

This plan addresses **code duplication**, **overlapping functionality**, and **scattered utilities** across the codebase. Organized into incremental PRs for safer, easier review.

**Scope:** Comprehensive (all findings from codebase review)
**Approach:** Incremental PRs, one per consolidation area

## Summary

| Category | Count | Priority | Est. Lines Saved |
|----------|-------|----------|------------------|
| Date/Time Formatting Duplication | 4 files | CRITICAL | ~150 |
| Scoring Utility Duplication | 3 files | HIGH | ~100 |
| Swipe Gesture Duplication | 3 files | HIGH | ~200 |
| Favorite Courses Logic | 4 files | HIGH | ~150 |
| Leaderboard Hooks Overlap | 3 files | HIGH | ~100 |
| Badge/Pill Components | 3 files | MEDIUM | ~250 |
| Card Container Pattern | 5 files | MEDIUM | ~1200 |
| Venue/Course Hooks | 4 files | MEDIUM | ~100 |
| Constants Centralization | 25+ files | MEDIUM | ~50 |
| Oversized Components | 5 files | MEDIUM | Variable |
| Selection Modal Pattern | 4 files | MEDIUM | ~400 |
| Team Services Overlap | 2 files | LOW | ~50 |
| Subscription Hooks | 3 files | LOW | ~30 |
| Offline Check Pattern | 8 files | LOW | ~40 |

---

## Phase 1: Critical Utility Consolidation

### 1.1 Consolidate Date/Time Formatting Functions

**Use Command:** `/refactor`

**Description:** Date/time formatting functions are duplicated in 4+ files with different signatures. Consolidate into single source of truth.

**Files to Modify:**
- `src/utils/formatting.ts` - Add missing functions
- `src/screens/admin/EditCompetitionScreen/utils/dateHelpers.ts` - DELETE
- `src/screens/admin/EditRoundScreen/utils/dateTimeHelpers.ts` - DELETE
- `src/screens/admin/AddRoundScreen/hooks/useAddRoundForm.ts` - Remove embedded functions

**Detailed Prompt:**
```
/refactor src/utils/formatting.ts

## Goal
Consolidate all date/time formatting functions into a single file. Currently duplicated across 4 files with different signatures.

## Current Duplication

### src/utils/formatting.ts (existing)
- formatDateAustralian(dateString: string | null): string
- formatTime(timeString: string | null): string | null
- formatDateWithWeekday(dateString: string | null): string
- formatTeeTime(timeString: string | null): string

### src/screens/admin/EditCompetitionScreen/utils/dateHelpers.ts (duplicate)
- parseAustralianDate(dateString: string): Date | null
- formatAustralianDate(date: Date | null): string
- parseISODate(dateString: string | null): Date | null

### src/screens/admin/EditRoundScreen/utils/dateTimeHelpers.ts (duplicate)
- parseAustralianDate(dateString: string): Date | null
- formatAustralianDate(date: Date): string
- formatTime(date: Date): string
- parseTime(timeString: string): Date | null
- parseISODate(dateString: string | null): Date | null

### src/screens/admin/AddRoundScreen/hooks/useAddRoundForm.ts (embedded)
- formatAustralianDate(date: Date): string
- formatTime(date: Date): string

## Tasks

1. Add to src/utils/formatting.ts:
   - parseAustralianDate(dateString: string): Date | null
   - parseISODate(dateString: string | null): Date | null
   - parseTime(timeString: string): Date | null
   - Update formatDateAustralian to accept Date | string | null
   - Update formatTime to accept Date | string | null

2. Update imports in:
   - src/screens/admin/EditCompetitionScreen/hooks/useEditCompetitionForm.ts
   - src/screens/admin/EditRoundScreen/hooks/useEditRoundData.ts
   - src/screens/admin/AddRoundScreen/hooks/useAddRoundForm.ts

3. Delete duplicate files:
   - src/screens/admin/EditCompetitionScreen/utils/dateHelpers.ts
   - src/screens/admin/EditRoundScreen/utils/dateTimeHelpers.ts

4. Run pnpm typecheck && pnpm lint && pnpm test

## Expected Outcome
- Single source of truth for date/time formatting in src/utils/formatting.ts
- ~150 lines of duplicate code removed
- All existing functionality preserved
```

**Status:** [x] Completed (December 2024)

**Completion Notes:**
- Added `parseAustralianDate`, `parseISODate`, `parseTime` functions to `src/utils/formatting.ts`
- Added `formatTimeHHMM` for Date → "HH:MM" format (distinct from display `formatTime`)
- Updated `formatDateAustralian` to accept `Date | string | null`
- Deleted `src/screens/admin/EditCompetitionScreen/utils/dateHelpers.ts`
- Deleted `src/screens/admin/EditRoundScreen/utils/dateTimeHelpers.ts`
- Updated imports in:
  - `useEditCompetitionForm.ts`
  - `useEditRoundForm.ts`
  - `useRoundSubmission.ts`
  - `useCompetitionSubmission.ts`
  - `useCompetitionValidation.ts`
  - `useAddRoundForm.ts`
  - `DateTimeSection.tsx`
- All typecheck and lint passes
- ~150 lines of duplicate code removed

---

### 1.2 Consolidate Scoring Utility Functions

**Use Command:** `/refactor`

**Description:** `calculateNetScore()` has two different function signatures in utils vs services. Establish single source of truth.

**Files to Modify:**
- `src/utils/scoring.ts` - Source of truth
- `src/services/scoring/utils/netScoreUtils.ts` - Import from utils
- `src/services/scoring/utils/handicapUtils.ts` - Import where overlapping

**Detailed Prompt:**
```
/refactor src/utils/scoring.ts

## Goal
Establish src/utils/scoring.ts as the canonical source for core scoring functions. Remove duplicates in service layer.

## Problem
calculateNetScore() has TWO different signatures:
- Utils: calculateNetScore(grossScore, playerHandicap, hole)
- Services: calculateNetScore(grossScore, strokesReceived)

Similarly, getStrokesReceived/calculateStrokesForHole are duplicated.

## Current Duplication

### src/utils/scoring.ts (canonical)
- getStrokesOnHole(playerHandicap: number, hole: Hole): number
- getStrokesReceived(handicap: number, strokeIndex: number): number
- calculateNetScore(grossScore: number, playerHandicap: number, hole: Hole): number
- calculateStablefordPoints(grossScore: number, playerHandicap: number, hole: Hole): number

### src/services/scoring/utils/handicapUtils.ts (duplicate)
- calculateStrokesForHole(playingHandicap: number, strokeIndex: number): number
  ^ Same as getStrokesReceived

### src/services/scoring/utils/netScoreUtils.ts (duplicate)
- calculateNetScore(grossScore: number, strokesReceived: number): number
  ^ Different signature - takes pre-calculated strokes

## Tasks

1. In src/utils/scoring.ts, add overloaded signature if needed:
   - Keep existing calculateNetScore(grossScore, handicap, hole)
   - Add calculateNetScoreFromStrokes(grossScore, strokesReceived) for service layer

2. Update src/services/scoring/utils/handicapUtils.ts:
   - Import getStrokesReceived from '@/utils/scoring'
   - Remove calculateStrokesForHole, create alias if needed for backward compat

3. Update src/services/scoring/utils/netScoreUtils.ts:
   - Import calculateNetScoreFromStrokes from '@/utils/scoring'
   - Remove duplicate calculateNetScore implementation

4. Update all imports throughout codebase

5. Run pnpm typecheck && pnpm test (especially scoring tests)

## Expected Outcome
- Single source of truth in src/utils/scoring.ts
- Clear function names (calculateNetScore vs calculateNetScoreFromStrokes)
- ~100 lines of duplicate code removed
```

**Status:** [x] Completed (December 2024)

**Completion Notes:**
- Added `calculateNetScoreFromStrokes(grossScore, strokesReceived)` to `src/utils/scoring.ts`
- Updated `src/services/scoring/utils/handicapUtils.ts`:
  - Made `calculateStrokesForHole` an alias for `getStrokesReceived` from `@/utils/scoring`
  - Added deprecation notice pointing to canonical function
- Updated `src/services/scoring/utils/netScoreUtils.ts`:
  - Made `calculateNetScore` an alias for `calculateNetScoreFromStrokes` from `@/utils/scoring`
  - Added deprecation notice pointing to canonical function
- All existing code continues to work (backward compatible via aliases)
- TypeScript type check passes
- Lint check passes
- ~30 lines of duplicate implementation code removed (functions now reference canonical source)
- Service layer engines (StablefordEngine, StrokePlayEngine, MatchPlayEngine, TeamScoringEngine) continue to work unchanged via the aliases

---

## Phase 2: Component Consolidation

### 2.1 Extract Shared Swipe Gesture Hook

**Use Command:** `/hook`

**Description:** Swipe-to-delete gesture logic duplicated in 3 components (~200 lines). Extract to shared hook.

**Files to Modify:**
- `src/components/common/hooks/useSwipeToDelete.ts` - CREATE
- `src/constants/gestures.ts` - CREATE
- `src/components/rounds/RoundListCard/useSwipeGesture.ts` - DELETE (moved)
- `src/components/competitions/CompetitionListCard.tsx` - Use shared hook
- `src/components/social/FriendCard.tsx` - Use shared hook

**Detailed Prompt:**
```
/hook useSwipeToDelete

## Goal
Extract the swipe-to-delete gesture logic that is duplicated across 3 components into a shared hook.

## Current Duplication

### src/components/rounds/RoundListCard/useSwipeGesture.ts (119 lines)
Already extracted as a hook - use as base.

### src/components/competitions/CompetitionListCard.tsx (lines 134-223)
Inline PanResponder with same logic (~90 lines):
- DELETE_BUTTON_WIDTH = 80
- SWIPE_THRESHOLD = 40
- Animated spring animations
- Overscroll resistance calculation

### src/components/social/FriendCard.tsx (lines 69-180)
Inline PanResponder with same logic (~112 lines):
- DELETE_BUTTON_WIDTH = 80
- SWIPE_THRESHOLD = 40
- Animated spring animations
- Same gesture calculations

## Tasks

1. Create src/constants/gestures.ts:
   export const SWIPE_GESTURE = {
     DELETE_BUTTON_WIDTH: 80,
     SWIPE_THRESHOLD: 40,
     ANIMATION_TENSION: 40,
     ANIMATION_FRICTION: 8,
   } as const;

2. Create src/components/common/hooks/useSwipeToDelete.ts:
   - Move logic from RoundListCard/useSwipeGesture.ts
   - Import constants from gestures.ts
   - Return: { panResponder, translateX, resetPosition }
   - Accept: { onDelete?: () => void, enabled?: boolean }

3. Update CompetitionListCard.tsx:
   - Remove inline PanResponder code (lines 134-223)
   - Import useSwipeToDelete
   - Connect to existing delete handler

4. Update FriendCard.tsx:
   - Remove inline PanResponder code (lines 69-180)
   - Import useSwipeToDelete
   - Connect to existing delete handler

5. Delete src/components/rounds/RoundListCard/useSwipeGesture.ts
   Update RoundListCard imports

6. Test swipe behavior on all 3 components

## Hook Interface
interface UseSwipeToDeleteOptions {
  onDelete?: () => void;
  enabled?: boolean;
  deleteButtonWidth?: number;
}

interface UseSwipeToDeleteReturn {
  panResponder: PanResponderInstance;
  translateX: Animated.Value;
  resetPosition: () => void;
  isOpen: boolean;
}

## Expected Outcome
- ~200 lines of duplicate code removed
- Single source for swipe gesture behavior
- Easier to update animation/behavior globally
```

**Status:** [x] Completed (December 2024)

**Completion Notes:**
- Created `src/constants/gestures.ts` with SWIPE_GESTURE constants
- Created `src/components/common/hooks/useSwipeToDelete.ts` as the shared hook
- Created `src/components/common/hooks/index.ts` for exports
- Updated `CompetitionListCard.tsx` - removed ~90 lines of inline PanResponder code
- Updated `FriendCard.tsx` - removed ~90 lines of inline PanResponder code
- Updated `RoundListCard.tsx` to import from shared hook
- Updated `RoundCardActions.tsx` to use SWIPE_GESTURE constant
- Deleted `src/components/rounds/RoundListCard/useSwipeGesture.ts`
- Updated index exports to remove old hook
- ~200 lines of duplicate code removed
- All three components now share consistent swipe behavior

---

### 2.2 Consolidate Favorite Courses Logic

**Use Command:** `/hook`

**Description:** Favorite course fetching and mutation logic duplicated in 4 hooks.

**Files to Modify:**
- `src/hooks/useFavoriteCourses.ts` - CREATE
- `src/hooks/useCourses.ts` - Use new hook
- `src/hooks/useVenues.ts` - Use new hook
- `src/hooks/useCourseDetails.ts` - Use new hook
- `src/hooks/useVenueDetails.ts` - Use new hook

**Detailed Prompt:**
```
/hook useFavoriteCourses

## Goal
Centralize favorite course logic that is duplicated in 4 hooks.

## Current Duplication (repeated 13+ times)
```typescript
let favoriteIds: string[] = [];
if (user) {
  const { data: favorites } = await supabase
    .from('favorite_courses')
    .select('course_id')
    .eq('player_id', user.id);

  if (favorites) {
    favoriteIds = favorites.map((f: { course_id: string }) => f.course_id);
  }
}
```

Also duplicate mutations:
- useAddFavorite() in useCourses.ts
- useRemoveFavorite() in useCourses.ts
- useAddCourseFavorite() in useVenues.ts (same logic, different name)
- useRemoveCourseFavorite() in useVenues.ts (same logic, different name)

## Tasks

1. Create src/hooks/useFavoriteCourses.ts:
```typescript
// Query: fetch user's favorite course IDs
export function useFavoriteCourseIds() {
  const { user } = useAuth();
  return useQuery({
    queryKey: favoriteKeys.list(user?.id),
    queryFn: async () => {
      if (!user) return [];
      const { data } = await supabase
        .from('favorite_courses')
        .select('course_id')
        .eq('player_id', user.id);
      return data?.map(f => f.course_id) ?? [];
    },
    enabled: !!user,
  });
}

// Mutation: add favorite
export function useAddFavorite() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (courseId: string) => {
      if (!user) throw new Error('Not authenticated');
      await supabase.from('favorite_courses').upsert({
        player_id: user.id,
        course_id: courseId,
      });
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: favoriteKeys.all }),
  });
}

// Mutation: remove favorite
export function useRemoveFavorite() { /* similar */ }

// Helper: check if course is favorite
export function useIsFavorite(courseId: string): boolean {
  const { data: favoriteIds } = useFavoriteCourseIds();
  return favoriteIds?.includes(courseId) ?? false;
}
```

2. Update src/hooks/queryKeys.ts:
   Add favoriteKeys section

3. Update src/hooks/useCourses.ts:
   - Import useFavoriteCourseIds from useFavoriteCourses
   - Remove duplicate useAddFavorite/useRemoveFavorite
   - Re-export from useFavoriteCourses for backward compat

4. Update src/hooks/useVenues.ts:
   - Import from useFavoriteCourses
   - Remove useAddCourseFavorite/useRemoveCourseFavorite
   - Create aliases for backward compat if needed

5. Update useCourseDetails.ts and useVenueDetails.ts:
   - Use useFavoriteCourseIds instead of inline fetching

## Expected Outcome
- Single source for favorite course logic
- ~150 lines of duplicate code removed
- Consistent behavior and caching
```

**Status:** [x] Completed (December 2024)

**Completion Notes:**
- Created `src/hooks/useFavoriteCourses.ts` with centralized favorite course logic:
  - `useFavoriteCourseIds()` - Query for user's favorite course IDs
  - `useAddFavorite()` - Mutation to add a course to favorites
  - `useRemoveFavorite()` - Mutation to remove a course from favorites
  - `useIsFavorite()` - Helper to check if a course is favorited
  - `useFavoriteEnrichment()` - Helper for enriching course arrays with is_favorite
  - `useToggleFavorite()` - Convenience mutation for toggling
- Added `favoriteKeys` to `src/hooks/queryKeys.ts`
- Updated `useCourses.ts`:
  - Now uses `useFavoriteEnrichment()` instead of inline favorite fetching
  - Re-exports `useAddFavorite` and `useRemoveFavorite` for backward compatibility
  - Removed ~40 lines of duplicate code
- Updated `useVenues.ts`:
  - Now uses `useFavoriteEnrichment()` instead of inline favorite fetching
  - Re-exports `useAddCourseFavorite` and `useRemoveCourseFavorite` as aliases
  - Removed ~65 lines of duplicate code
- Updated `useCourseDetails.ts`:
  - Now uses `useIsFavorite()` and `useFavoriteEnrichment()` instead of inline fetching
  - Removed ~20 lines of duplicate code
- Updated `useVenueDetails.ts`:
  - Now uses `useFavoriteEnrichment()` instead of inline fetching
  - Removed ~15 lines of duplicate code
- All typecheck and lint passes
- ~140 lines of duplicate favorite fetching/mutation code removed
- Consistent caching and invalidation across all hooks

---

### 2.3 Consolidate Leaderboard Hooks

**Use Command:** `/refactor`

**Description:** 3 leaderboard hooks with overlapping functionality.

**Files to Modify:**
- `src/hooks/useLeaderboard.ts` - Refactor to use useCompetitionLeaderboard
- `src/hooks/useCompetitionLeaderboard.ts` - Keep as primary
- `src/hooks/useRoundLeaderboard.ts` - Keep for round-specific

**Detailed Prompt:**
```
/refactor src/hooks/useLeaderboard.ts

## Goal
Consolidate leaderboard hooks to reduce overlap. useCompetitionLeaderboard is the more complete implementation.

## Current State

### useLeaderboard.ts
- Manual aggregation with Map
- Basic player score aggregation
- No team support

### useCompetitionLeaderboard.ts
- Uses utility function for aggregation
- Team support
- More filtering options
- Better structured

### useRoundLeaderboard.ts
- Round-specific data
- Format-specific (Stableford, Match Play, etc.)
- Keep separate

## Tasks

1. Review both useLeaderboard and useCompetitionLeaderboard for:
   - All use cases in the codebase (grep for imports)
   - Required return types
   - Any unique functionality

2. Refactor useLeaderboard.ts to be thin wrapper:
```typescript
export function useLeaderboard(competitionId: string, options?: LeaderboardOptions) {
  const { data, ...rest } = useCompetitionLeaderboard(competitionId, {
    ...options,
    // Map any legacy options
  });

  // Transform data if needed for backward compat
  return {
    data: data?.map(transformToLegacyFormat),
    ...rest,
  };
}
```

3. Update imports where useLeaderboard is preferred

4. Run tests to verify no regressions

## Expected Outcome
- Clear hook hierarchy
- useCompetitionLeaderboard as primary
- useLeaderboard as legacy wrapper
- ~100 lines of duplicate code removed
```

**Status:** [x] Completed (December 2024)

**Completion Notes:**
- Refactored `src/hooks/useLeaderboard.ts` from 246 lines to 73 lines
- Now wraps `useCompetitionLeaderboard` with `filter: 'individuals'`
- Added `transformToLegacyFormat()` function to convert new format to legacy `LeaderboardEntry`
- Maintains full backward compatibility:
  - Same `LeaderboardEntry` interface exported
  - Same hook signature and options
  - Same query behavior (auto-refresh, refetch)
- Added deprecation notices pointing to `useCompetitionLeaderboard` for new code
- Removed ~173 lines of duplicate code:
  - Manual Map-based aggregation
  - Direct Supabase queries for rounds/scorecards
  - Competition player fallback logic
- All 223 leaderboard-related tests pass
- Clear hook hierarchy established:
  - `useCompetitionLeaderboard` - Primary hook with team support, positions, filters
  - `useLeaderboard` - Legacy wrapper for backward compatibility
  - `useRoundLeaderboard` - Separate hook for round-specific format data

---

### 2.4 Create Unified Badge Component

**Use Command:** `/component`

**Description:** Pill, FilterPill, and StatusBadge have overlapping functionality.

**Files to Modify:**
- `src/components/common/Badge.tsx` - CREATE (unified base)
- `src/components/common/Pill.tsx` - Refactor to use Badge
- `src/components/common/FilterPill.tsx` - Refactor to use Badge
- `src/components/common/StatusBadge.tsx` - Refactor to use Badge

**Detailed Prompt:**
```
/component Badge

## Goal
Create unified Badge component that Pill, FilterPill, and StatusBadge can compose.

## Current Components

### Pill.tsx (258 lines)
- Non-interactive badge
- Multiple color variants (primary, secondary, success, warning, error, info)
- filled prop for solid vs outline
- size prop (small, medium)

### FilterPill.tsx (121 lines)
- Interactive toggle
- selected state
- onPress handler
- Limited variants

### StatusBadge.tsx (201 lines)
- Status-specific variants (draft, active, completed, cancelled, etc.)
- Maps status to colors
- Non-interactive

## Badge Base Component

### Props
interface BadgeProps {
  label: string;
  variant?: 'primary' | 'secondary' | 'success' | 'warning' | 'error' | 'info' | 'neutral';
  size?: 'small' | 'medium' | 'large';
  filled?: boolean;
  interactive?: boolean;
  selected?: boolean;
  onPress?: () => void;
  icon?: string;
  disabled?: boolean;
  testID?: string;
}

### Implementation
- Core rendering logic shared
- Variant colors defined in one place
- Interactive mode adds TouchableOpacity
- Selected state changes styling

### Refactoring Steps

1. Create src/components/common/Badge.tsx with full implementation

2. Refactor Pill.tsx:
```typescript
export function Pill({ label, variant, size, filled, ...props }: PillProps) {
  return (
    <Badge
      label={label}
      variant={variant}
      size={size}
      filled={filled}
      interactive={false}
      {...props}
    />
  );
}
```

3. Refactor FilterPill.tsx:
```typescript
export function FilterPill({ label, selected, onPress, ...props }: FilterPillProps) {
  return (
    <Badge
      label={label}
      interactive
      selected={selected}
      onPress={onPress}
      {...props}
    />
  );
}
```

4. Refactor StatusBadge.tsx:
```typescript
const STATUS_VARIANTS: Record<Status, BadgeVariant> = {
  draft: 'neutral',
  active: 'success',
  completed: 'primary',
  cancelled: 'error',
};

export function StatusBadge({ status }: StatusBadgeProps) {
  return (
    <Badge
      label={STATUS_LABELS[status]}
      variant={STATUS_VARIANTS[status]}
      filled
      size="small"
    />
  );
}
```

5. Update exports in index.ts

## Expected Outcome
- Single source for badge rendering
- ~250 lines of code consolidated
- Consistent styling across all badge types
```

**Status:** [x] Completed (December 2024)

**Completion Notes:**
- Created `src/components/common/Badge.tsx` as the unified base component (295 lines)
  - Supports all variants: default, primary, secondary, success, warning, error, info, neutral, birdie, par, bogey, doubleBogey
  - Supports sizes: sm, md, lg
  - Supports filled vs outline styles
  - Supports interactive mode with selected state
  - Supports optional icon prefix
  - Full accessibility support
- Refactored `Pill.tsx` from 258 lines to 114 lines
  - Now composes Badge with `interactive={false}`
  - All existing props preserved for backward compatibility
- Refactored `FilterPill.tsx` from 121 lines to 93 lines
  - Now composes Badge with `interactive={true}` and `selected` state
  - All existing props preserved for backward compatibility
- Refactored `StatusBadge.tsx` from 201 lines to 163 lines
  - Now composes Badge with status-to-variant mapping
  - Uses custom styling for sm border radius (vs pill shape)
  - All existing props preserved for backward compatibility
- Added Badge export to `src/components/common/index.ts`
- All typecheck and lint passes
- ~210 lines of duplicate code removed
- Single source for badge rendering logic
- Consistent styling across all badge types

---

### 2.5 Create Base Card Container Component

**Use Command:** `/component`

**Description:** 5 card components share similar structure/styling.

**Files to Modify:**
- `src/components/common/CardContainer.tsx` - CREATE
- `src/components/competitions/CompetitionListCard.tsx` - Use CardContainer
- `src/components/rounds/RoundListCard/RoundListCard.tsx` - Use CardContainer
- `src/components/social/PlayerCard.tsx` - Use CardContainer
- `src/components/teams/TeamCard.tsx` - Use CardContainer
- `src/components/competitionWizard/RoundCard.tsx` - Use CardContainer

**Detailed Prompt:**
```
/component CardContainer

## Goal
Extract shared card container structure from 5 card components.

## Current Pattern (duplicated in all 5 cards)
```tsx
<TouchableOpacity
  style={[
    styles.container,
    { backgroundColor: colors.surface, borderColor: colors.border },
  ]}
  onPress={onPress}
  disabled={!onPress}
  activeOpacity={0.7}
>
  {children}
</TouchableOpacity>

const styles = StyleSheet.create({
  container: {
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    padding: spacing.md,
    ...shadows.sm,
  },
});
```

## CardContainer Props
interface CardContainerProps {
  children: React.ReactNode;
  onPress?: () => void;
  onLongPress?: () => void;
  disabled?: boolean;
  style?: StyleProp<ViewStyle>;
  swipeable?: boolean;
  onDelete?: () => void;
  testID?: string;
  // Padding variants
  padding?: 'none' | 'sm' | 'md' | 'lg';
  // Border variants
  noBorder?: boolean;
  // Elevation variants
  elevated?: boolean;
}

## Implementation

1. Create src/components/common/CardContainer.tsx:
```typescript
export function CardContainer({
  children,
  onPress,
  onLongPress,
  disabled,
  style,
  swipeable,
  onDelete,
  padding = 'md',
  noBorder = false,
  elevated = true,
  testID,
}: CardContainerProps) {
  const colors = useThemeColors();
  const swipeGesture = useSwipeToDelete({
    onDelete,
    enabled: swipeable && !!onDelete,
  });

  const containerStyle = [
    styles.container,
    {
      backgroundColor: colors.surface,
      borderColor: noBorder ? 'transparent' : colors.border,
    },
    PADDING_STYLES[padding],
    elevated && shadows.sm,
    style,
  ];

  const content = (
    <TouchableOpacity
      style={containerStyle}
      onPress={onPress}
      onLongPress={onLongPress}
      disabled={disabled || !onPress}
      activeOpacity={0.7}
      testID={testID}
    >
      {children}
    </TouchableOpacity>
  );

  if (swipeable && onDelete) {
    return (
      <SwipeableWrapper {...swipeGesture}>
        {content}
        <DeleteButton onDelete={onDelete} />
      </SwipeableWrapper>
    );
  }

  return content;
}
```

2. Refactor each card component to use CardContainer:
```typescript
// Before (in CompetitionListCard)
<TouchableOpacity style={[styles.container, { ... }]} onPress={onPress}>
  <View>...</View>
</TouchableOpacity>

// After
<CardContainer onPress={onPress} swipeable onDelete={handleDelete}>
  <View>...</View>
</CardContainer>
```

3. Remove duplicate container styles from each card

## Expected Outcome
- Single container component for all cards
- ~1200 lines of duplicate styling removed
- Consistent card appearance and behavior
- Swipe-to-delete optional integration
```

**Status:** [x] Completed (December 2024)

**Completion Notes:**
- Created `src/components/common/CardContainer.tsx` as the shared card container component (253 lines)
  - Supports padding variants: 'none', 'sm', 'md', 'lg'
  - Supports noBorder and elevated props for styling flexibility
  - Integrated swipe-to-delete via `useSwipeToDelete` hook
  - Full accessibility support with labels and hints
  - Proper TypeScript types exported
- Refactored `CompetitionListCard.tsx` from 431 lines to 279 lines (~35% reduction)
  - Removed duplicate container styles and swipe logic
  - Uses CardContainer with swipeable prop
- Refactored `RoundListCard.tsx` from 172 lines to 132 lines (~23% reduction)
  - Removed duplicate container styles and swipe logic
  - Uses CardContainer with swipeable prop
- Refactored `PlayerCard.tsx` from 280 lines to 269 lines
  - Supports both 'card' and 'list-item' variants via CardContainer props
  - Uses noBorder and elevated=false for list-item variant
- Added CardContainer export to `src/components/common/index.ts`
- All typecheck and lint passes
- ~200 lines of duplicate container/swipe code removed
- Consistent card styling and behavior across 3 refactored components
- Note: TeamCard and RoundCard (competitionWizard) use React Native Paper Card component with different patterns, can be refactored in a future pass if needed

---

## Phase 3: Hook Consolidation

### 3.1 Consolidate Venue/Course Hooks

**Use Command:** `/refactor`

**Description:** 4 venue/course hooks with query duplication.

**Files to Modify:**
- `src/hooks/useVenues.ts` - Simplify
- `src/hooks/useVenueDetails.ts` - Consolidate with useCoursesByVenue
- `src/hooks/useCourses.ts` - Clarify scope
- `src/hooks/useCourseDetails.ts` - Merge course fetching

**Detailed Prompt:**
```
/refactor src/hooks/useVenues.ts

## Goal
Reduce duplication between venue and course hooks.

## Current Issues

### useVenues.ts
- useVenuesWithCourses() - Full venue query with nested courses
- useVenueCourseDisplayItems() - Thin wrapper that transforms data
  ^ These could be combined or one removed

### useVenueDetails.ts
- useVenueDetails() - Fetches venue with courses by ID
- Similar to useCoursesByVenue pattern

### useCourses.ts
- useCourse() - Single course fetch
- useCourses() - Multiple courses fetch
- useAddFavorite/useRemoveFavorite - Now in useFavoriteCourses

### useCourseDetails.ts
- useCourseDetails() - Course with venue join
- Similar to useCourse but different join

## Tasks

1. Analyze actual usage of each hook (grep for imports)

2. Define clear hook responsibilities:
   - useVenues: List venues (optionally with courses)
   - useVenueDetails: Single venue with full data
   - useCourses: List courses (without venue nesting)
   - useCourseDetails: Single course with venue info

3. Remove wrapper hooks that just transform data:
   - Inline transformation where used
   - Or keep but make clear it's a convenience wrapper

4. Ensure useVenueDetails vs useCoursesByVenue have clear distinction:
   - One returns venue-centric data
   - Other returns course-centric data

5. Update consuming components

## Expected Outcome
- Clear hook naming and responsibilities
- Reduced hook count or clear documentation
- ~100 lines of wrapper code removed
```

**Status:** [x] Completed (December 2024)

**Completion Notes:**
- Analyzed actual usage of all venue/course hooks across codebase
- Added comprehensive hook architecture documentation to `useVenues.ts` header
- Deprecated `useVenueCourseDisplayItems` with migration guidance
  - Updated `CreateRoundBottomSheet` to use `useVenuesWithCourses` directly
  - Inlined the transformation logic with helper function
- Deprecated `useCoursesByVenue` in `useCourseDetails.ts`
  - Not used anywhere (useVenueDetails returns courses already)
- Deprecated `useCourse` in `useCourses.ts`
  - Not used anywhere (useCourseDetails provides richer data)
- Clear hook responsibility documentation established:
  - `useVenuesWithCourses` - List venues with nested courses
  - `useVenueDetails` - Single venue with all courses
  - `useCourses` - Flat course list (admin use)
  - `useCourseDetails` - Single course with venue info
- ~30 lines of wrapper code marked as deprecated (kept for backward compatibility)
- No breaking changes (all deprecated hooks still functional)
- Build verified successful with Expo export

---

## Phase 4: Constants Centralization

### 4.1 Centralize Scoring Constants

**Use Command:** `/refactor`

**Description:** PICKUP_SCORE and other scoring constants scattered across files.

**Files to Modify:**
- `src/constants/scoring.ts` - CREATE
- `src/utils/scorecardLayout.ts` - Import from constants
- 24+ files using PICKUP_SCORE - Update imports

**Detailed Prompt:**
```
/refactor src/constants/scoring.ts

## Goal
Centralize scoring-related constants.

## Current State
PICKUP_SCORE = 10 defined in src/utils/scorecardLayout.ts but imported in 24+ files.

Other scoring constants scattered:
- MAX_STROKES_PER_HOLE (various locations)
- Stableford point values (hardcoded in scoring.ts)
- Stroke index ranges (hardcoded in various places)

## Tasks

1. Create src/constants/scoring.ts:
```typescript
/**
 * Score used when player picks up (max strokes for stableford)
 */
export const PICKUP_SCORE = 10;

/**
 * Maximum strokes per hole for any format
 */
export const MAX_STROKES_PER_HOLE = 10;

/**
 * Stableford point values relative to par
 */
export const STABLEFORD_POINTS = {
  ALBATROSS_OR_BETTER: 4,  // 3 under or better
  EAGLE: 3,                 // 2 under
  BIRDIE: 2,                // 1 under
  PAR: 1,                   // Even
  BOGEY: 0,                 // 1 over
  DOUBLE_OR_WORSE: 0,       // 2 over or worse
} as const;

/**
 * Hole-in-one detection
 */
export const HOLE_IN_ONE_SCORE = 1;

/**
 * Default handicap for new players
 */
export const DEFAULT_HANDICAP = 18;
```

2. Update src/utils/scorecardLayout.ts:
   - Remove PICKUP_SCORE definition
   - Import from constants

3. Search and replace all PICKUP_SCORE imports:
   grep -r "PICKUP_SCORE" src/
   - Update each file to import from '@/constants/scoring'

4. Update src/utils/scoring.ts to use STABLEFORD_POINTS constant

## Expected Outcome
- All scoring constants in one place
- Easy to find and modify
- ~50 lines of constant definitions consolidated
```

**Status:** [x] Completed (January 2025)

**Completion Notes:**
- Created `src/constants/scoring.ts` with centralized scoring constants:
  - `PICKUP_SCORE = 10` - Score used when player picks up
  - `MAX_STROKES_PER_HOLE = 10` - Maximum strokes per hole
  - `STABLEFORD_POINTS` - Object with point values for all score types (albatross, eagle, birdie, par, bogey, double+)
  - `HOLE_IN_ONE_SCORE = 1` - Hole-in-one detection
  - `DEFAULT_HANDICAP = 18` - Default handicap for new players
  - `MAX_HANDICAP = 54`, `MIN_HANDICAP = 0` - Handicap range
  - `HOLES_PER_ROUND = 18`, `HOLES_PER_HALF = 9` - Round structure
  - `STANDARD_SLOPE_RATING = 113` - USGA baseline slope rating
- Updated `src/utils/scorecardLayout.ts`:
  - Removed PICKUP_SCORE definition, re-exports from `@/constants/scoring`
- Updated `src/utils/scoring.ts`:
  - Imported STABLEFORD_POINTS, PICKUP_SCORE, STANDARD_SLOPE_RATING from constants
  - Refactored `calculateStablefordPoints()` to use STABLEFORD_POINTS constants
  - Refactored `calculateStablefordPointsNet()` to use STABLEFORD_POINTS constants
  - Refactored `calculatePlayingHandicap()` to use STANDARD_SLOPE_RATING
  - Refactored `calculateBestBallStablefordPoints()` to use PICKUP_SCORE
  - Refactored `calculateTeamMatchPlayHoleResult()` to use PICKUP_SCORE
- Updated 10+ files to import PICKUP_SCORE from `@/constants/scoring` instead of scorecardLayout.ts:
  - MultiBallScoreInput.tsx
  - TeamMatchPlayScoreView.tsx
  - TeamScoreCard.tsx
  - BestBallScoreView.tsx
  - QuickScorecardView.tsx
  - ScoreIndicator.tsx
  - PlayerScoreCard/usePlayerScoreCardLogic.ts
  - displayHelpers.ts
  - usePlayerScorecard.ts
- All 811 scoring-related tests pass
- Backward compatibility maintained via re-exports in scorecardLayout.ts and usePlayerScoreCardLogic.ts
- ~50 lines of scattered constant definitions consolidated into single source of truth

---

### 4.2 Consolidate formatGameType Functions

**Use Command:** `/refactor`

**Description:** `formatGameType()` scattered across 3 files with same logic.

**Files to Modify:**
- `src/constants/statusConfig.ts` - Keep as source
- `src/hooks/subscription/validators.ts` - Import from statusConfig
- `src/components/rounds/RoundListCard/types.ts` - Import from statusConfig

**Detailed Prompt:**
```
/refactor src/constants/statusConfig.ts

## Goal
Consolidate formatGameType function to single location.

## Current Duplication

### src/constants/statusConfig.ts
```typescript
export const GAME_TYPE_LABELS: Record<GameType, string> = {
  stableford: 'Stableford',
  stroke: 'Stroke Play',
  match_play: 'Match Play',
  best_ball: 'Best Ball',
  ambrose: 'Ambrose',
  skins: 'Skins',
};

export function getGameTypeLabel(gameType: GameType): string {
  return GAME_TYPE_LABELS[gameType] || gameType;
}
```

### src/hooks/subscription/validators.ts
```typescript
function formatGameType(gameType: GameType): string {
  const labels: Record<GameType, string> = {
    stableford: 'Stableford',
    stroke: 'Stroke Play',
    // ... same mapping
  };
  return labels[gameType] || gameType;
}
```

### src/components/rounds/RoundListCard/types.ts
```typescript
export const formatGameType = (gameType: GameType): string => {
  // Same implementation
};
```

## Tasks

1. Ensure src/constants/statusConfig.ts has complete GAME_TYPE_LABELS

2. Update src/hooks/subscription/validators.ts:
   - Import { getGameTypeLabel } from '@/constants/statusConfig'
   - Remove local formatGameType function
   - Use getGameTypeLabel instead

3. Update src/components/rounds/RoundListCard/types.ts:
   - Remove formatGameType export
   - Update imports in RoundListCard.tsx to use getGameTypeLabel

4. Search for any other formatGameType usages and update

## Expected Outcome
- Single source for game type labels
- Consistent naming across codebase
```

**Status:** [ ] Completed

---

## Phase 5: Split Oversized Components

### 5.1 Split TeeSelector Component

**Use Command:** `/refactor`

**Description:** TeeSelector (648 lines) handles 3 different layouts. Split into variants.

**Files to Create:**
- `src/components/common/TeeSelector/index.tsx` - Orchestrator
- `src/components/common/TeeSelector/TeeSelectorPills.tsx`
- `src/components/common/TeeSelector/TeeSelectorCards.tsx`
- `src/components/common/TeeSelector/TeeSelectorList.tsx`
- `src/components/common/TeeSelector/types.ts`

**Detailed Prompt:**
```
/refactor src/components/common/TeeSelector.tsx

## Goal
Split TeeSelector into focused sub-components by layout variant.

## Current Structure (648 lines)
The component handles 3 layouts:
- Pills variant (horizontal scrollable)
- Cards variant (grid layout)
- List variant (full-screen FlatList)

## New Structure
```
src/components/common/TeeSelector/
├── index.tsx              # Main export, routes to variant
├── TeeSelectorPills.tsx   # Pills layout
├── TeeSelectorCards.tsx   # Cards layout
├── TeeSelectorList.tsx    # List layout
├── types.ts               # Shared types
└── hooks/
    └── useTeeSelector.ts  # Shared logic
```

## Tasks

1. Create directory structure

2. Extract types.ts:
```typescript
export interface TeeSelectorProps {
  tees: Tee[];
  selectedTeeId?: string;
  onSelectTee: (tee: Tee) => void;
  variant?: 'pills' | 'cards' | 'list';
  disabled?: boolean;
}

export interface TeeItemProps {
  tee: Tee;
  selected: boolean;
  onSelect: () => void;
  disabled?: boolean;
}
```

3. Extract shared logic to useTeeSelector.ts:
   - Sorting logic
   - Selection handling
   - Accessibility labels

4. Create each variant component (100-150 lines each):
   - TeeSelectorPills: ScrollView with horizontal pills
   - TeeSelectorCards: Grid with 2-column cards
   - TeeSelectorList: FlatList with full rows

5. Update index.tsx to route to variants:
```typescript
export function TeeSelector({ variant = 'cards', ...props }: TeeSelectorProps) {
  switch (variant) {
    case 'pills':
      return <TeeSelectorPills {...props} />;
    case 'list':
      return <TeeSelectorList {...props} />;
    default:
      return <TeeSelectorCards {...props} />;
  }
}
```

6. Update imports in consuming files

## Expected Outcome
- Each variant < 200 lines
- Shared logic in hook
- Easier to maintain and test individually
```

**Status:** [x] Completed (January 2025)

**Completion Notes:**
- Created `src/components/common/TeeSelector/` directory structure:
  - `index.tsx` - Main router component (76 lines)
  - `TeeSelectorPills.tsx` - Horizontal pill variant (116 lines)
  - `TeeSelectorCards.tsx` - Grid card variant (113 lines)
  - `TeeSelectorList.tsx` - Full-screen list variant (193 lines)
  - `types.ts` - Shared type definitions (93 lines)
  - `hooks/useTeeSelector.ts` - Shared logic hook (125 lines)
- Original TeeSelector.tsx was 648 lines, now split into focused components:
  - Each variant component is under 200 lines
  - Shared logic extracted to `useTeeSelector` hook
- Updated `src/components/common/index.ts`:
  - Added exports for `TeeSelectorPills`, `TeeSelectorCards`, `TeeSelectorList`
  - Added export for `isTeeSelected` utility function
- Moved and updated test file to `TeeSelector/TeeSelector.test.tsx`
- Moved and updated stories file to `TeeSelector/TeeSelector.stories.tsx`
- All 54 existing tests pass
- No TypeScript errors related to TeeSelector
- Existing imports continue to work (backward compatible via index.tsx)
- Easier to maintain and test individual variants

---


### 5.2 ApiSearchModal Component (REMOVED)

**Status:** [x] REMOVED (January 2025)

**Description:** The ApiSearchModal component has been completely removed from the codebase as it is no longer needed.

**Files Deleted:**
- `src/components/courses/ApiSearchModal.tsx`
- `src/components/courses/ApiSearchModal.test.tsx`
- `src/components/courses/ApiSearchModal.stories.tsx`

**Files Updated:**
- `src/components/courses/index.ts` - Removed export
- `src/screens/courses/CourseListScreen.tsx` - Removed import and usage
- `src/components/courses/CourseListContent.tsx` - Removed related props

**Completion Notes:**
- Component was 628 lines but no longer serves any purpose
- All related state, handlers, and UI elements have been removed
- Documentation updated to reflect removal

---

## Phase 6: Extract Selection Modal Base

### 6.1 Create Generic SelectionModal

**Use Command:** `/component`

**Description:** 4 selection modals share similar structure.

**Files to Modify:**
- `src/components/common/SelectionModal.tsx` - CREATE
- Selection modals to refactor after creation

**Detailed Prompt:**
```
/component SelectionModal

## Goal
Create generic selection modal that can be composed for specific use cases.

## Common Pattern in 3 modals:
- CourseSelectionModal
- TeeSelectionModal
- MatchTypeModal

All have:
- Search/filter capability
- List of items
- Selection state
- Confirm/cancel actions

## SelectionModal Props
interface SelectionModalProps<T> {
  visible: boolean;
  onClose: () => void;
  onSelect: (item: T) => void;

  // Data
  items: T[];
  keyExtractor: (item: T) => string;
  renderItem: (item: T, selected: boolean) => React.ReactNode;

  // Search
  searchable?: boolean;
  searchPlaceholder?: string;
  filterFn?: (item: T, query: string) => boolean;

  // UI
  title: string;
  emptyMessage?: string;

  // Selection
  selectedKey?: string;
  multiSelect?: boolean;
}

## Implementation
```typescript
export function SelectionModal<T>({
  visible,
  onClose,
  onSelect,
  items,
  keyExtractor,
  renderItem,
  searchable,
  searchPlaceholder,
  filterFn,
  title,
  emptyMessage,
  selectedKey,
}: SelectionModalProps<T>) {
  const [query, setQuery] = useState('');

  const filteredItems = useMemo(() => {
    if (!query || !filterFn) return items;
    return items.filter(item => filterFn(item, query));
  }, [items, query, filterFn]);

  return (
    <BottomSheet visible={visible} onClose={onClose}>
      <BottomSheetHeader title={title} onClose={onClose} />

      {searchable && (
        <SearchBar
          value={query}
          onChangeText={setQuery}
          placeholder={searchPlaceholder}
        />
      )}

      <FlatList
        data={filteredItems}
        keyExtractor={keyExtractor}
        renderItem={({ item }) => (
          <TouchableOpacity onPress={() => onSelect(item)}>
            {renderItem(item, keyExtractor(item) === selectedKey)}
          </TouchableOpacity>
        )}
        ListEmptyComponent={
          <EmptyState message={emptyMessage || 'No items found'} />
        }
      />
    </BottomSheet>
  );
}
```

## Usage Example
```typescript
<SelectionModal
  visible={visible}
  onClose={close}
  onSelect={handleSelectCourse}
  items={courses}
  keyExtractor={c => c.id}
  renderItem={(course, selected) => (
    <CourseRow course={course} selected={selected} />
  )}
  searchable
  searchPlaceholder="Search courses..."
  filterFn={(c, q) => c.name.toLowerCase().includes(q.toLowerCase())}
  title="Select Course"
  selectedKey={selectedCourseId}
/>
```

## Expected Outcome
- Reusable selection modal pattern
- ~400 lines of duplicate code removed when refactoring existing modals
```

**Status:** [x] Completed (January 2025)

**Completion Notes:**
- Created `src/components/common/SelectionModal.tsx` as the generic selection modal component (473 lines)
  - Generic type support `<T>` for any data type
  - Searchable with custom `filterFn` support
  - Custom item rendering via `renderItem` prop
  - Loading and empty state handling
  - Single selection with `selectedKey` tracking
  - Optional header content slot
  - Configurable height
  - Full accessibility support with proper roles and states
- Created `SelectionItemRow` helper component for common use case:
  - Pre-built row with label, description, icon, and check mark
  - Disabled state support
- Added exports to `src/components/common/index.ts`:
  - `SelectionModal`, `SelectionItemRow` components
  - `SelectionModalProps`, `SelectionItemRowProps` types
- All TypeScript type checks pass
- All ESLint checks pass
- Ready for refactoring existing modals (CourseSelectionModal, TeeSelectionModal, MatchTypeModal)
- Expected ~400 lines of duplicate code to be removed when existing modals are refactored to use this component

---

## Phase 7: Service and Hook Cleanup (LOW Priority)

### 7.1 Consolidate Team Services

**Use Command:** `/refactor`

**Description:** Two team service files with overlapping CRUD.

**Files to Modify:**
- `src/services/api/teams.ts`
- `src/services/teams/teamService.ts`

**Detailed Prompt:**
```
/refactor src/services/teams/teamService.ts

## Goal
Review and consolidate team service files.

## Current State
Two files exist:
- src/services/api/teams.ts
- src/services/teams/teamService.ts

## Tasks

1. Analyze both files for:
   - Exported functions
   - Usage (grep for imports)
   - Overlap

2. Decide on consolidation:
   - If api/teams.ts is just REST wrappers: keep
   - If teamService.ts is business logic: keep
   - If overlap: merge into teamService.ts

3. Update imports throughout codebase

4. Delete unused file if applicable

## Expected Outcome
- Clear service structure
- No duplicate CRUD operations
```

**Status:** [x] Completed (January 2025)

**Completion Notes:**
- Analyzed both team service files:
  - `src/services/teams/teamService.ts` (614→697 lines) - The canonical team service, used by `useTeams.ts` hook
  - `src/services/api/teams.ts` (308 lines) - API layer exposed via `apiClient`, but **never actually called**
- Usage analysis revealed:
  - `apiClient.createTeam`, `apiClient.getTeams`, etc. are exposed but have **zero usages** in the codebase
  - All team operations use `@/services/teams` via the `useTeams.ts` hook
- Consolidation actions:
  - Added `addTeamMember(teamId, playerId)` to `teamService.ts` (unique function from api/teams.ts)
  - Added `removeTeamMember(teamId, playerId)` to `teamService.ts` (unique function from api/teams.ts)
  - Updated `teamService` singleton export to include new functions
  - Updated `src/services/teams/index.ts` to export new functions
  - Marked `src/services/api/teams.ts` as `@deprecated` with migration guidance
- Decision: Kept `api/teams.ts` for backward compatibility with `apiClient` (which is still used for competitions), but documented it as deprecated
- Clear service structure established:
  - `@/services/teams` - Canonical team service (use this)
  - `@/services/api/teams` - Deprecated, kept for apiClient backward compat
- ~50 lines of duplicate CRUD logic avoided by deprecating the unused file

---

### 7.2 Simplify Subscription Hooks

**Use Command:** `/refactor`

**Description:** Extra indirection layer in subscription helpers.

**Files to Modify:**
- `src/hooks/useSubscription.ts`
- `src/hooks/useSubscriptionHelpers.ts`

**Detailed Prompt:**
```
/refactor src/hooks/useSubscriptionHelpers.ts

## Goal
Review if useSubscriptionHelpers adds value or creates unnecessary indirection.

## Current State
useSubscriptionHelpers.ts provides:
- useCanCreateCompetition(currentCount)
- useCanCreateRound(currentCount)
- useIsFeatureAvailable(featureId)

These wrap useSubscription().checkFeature()

## Tasks

1. Analyze usage:
   - Are helpers used frequently enough to justify?
   - Could consumers call useSubscription directly?

2. If helpers provide value (convenient API):
   - Keep but document clearly
   - Consider moving into useSubscription.ts

3. If helpers are just indirection:
   - Inline at call sites
   - Delete useSubscriptionHelpers.ts

## Expected Outcome
- Clear subscription hook API
- No unnecessary wrappers
```

**Status:** [x] Completed (January 2025)

**Completion Notes:**
- Analyzed usage of subscription helper hooks across codebase:
  - `useCheckFeature` - 2 implementations existed (hook in useSubscriptionHelpers.ts + context in SubscriptionContext.tsx)
  - `useCanCreateCompetition` - Zero usages (never called)
  - `useCanAddRound` - Zero usages (never called)
  - `useCanAddPlayer` - Zero usages (never called)
  - `useCanAddFriend` - 1 usage in useFriends.ts
  - `useCanUseGameType` - Zero usages (never called)
  - `useCompetitionCount` - 1 usage in CreateCompetitionScreen.tsx (provides unique DB query value)
- Actions taken:
  - **Removed** unused helper hooks (useCheckFeature, useCanCreateCompetition, useCanAddRound, useCanAddPlayer, useCanAddFriend, useCanUseGameType)
  - **Kept** `useCompetitionCount` - provides unique value (fetches active competition count from DB)
  - **Inlined** `useCanAddFriend` call in useFriends.ts to use `useSubscription().checkFeature()` directly
  - Updated exports in `useSubscription.ts` and `hooks/index.ts`
  - Updated test file to reflect simplified API
- Result: ~70 lines of unnecessary indirection removed
- API now clearer: Use `useSubscription().checkFeature()` directly for feature checks, or `useCheckFeature()` from SubscriptionContext

---

### 7.3 Centralize Offline Check Pattern

**Use Command:** `/hook`

**Description:** `getIsOnline()` called independently in 8+ locations.

**Files to Modify:**
- `src/hooks/useOnlineStatus.ts` - CREATE or enhance
- Files calling getIsOnline() directly

**Detailed Prompt:**
```
/hook useOnlineStatus

## Goal
Centralize online status checking.

## Current State
getIsOnline() from NetInfo called directly in 8+ locations:
- src/hooks/scorecard/useSubmitScorecard.ts
- src/hooks/scorecard/useScorecards.ts
- src/hooks/scorecard/useOfflineSync.ts
- src/services/offline/sync.ts
- src/store/scorecardStore.ts
- (and more)

## Tasks

1. Create or enhance src/hooks/useOnlineStatus.ts:
```typescript
export function useOnlineStatus() {
  const [isOnline, setIsOnline] = useState(true);

  useEffect(() => {
    const unsubscribe = NetInfo.addEventListener(state => {
      setIsOnline(state.isConnected ?? true);
    });
    return unsubscribe;
  }, []);

  return isOnline;
}

// For non-hook contexts
export async function checkIsOnline(): Promise<boolean> {
  const state = await NetInfo.fetch();
  return state.isConnected ?? true;
}
```

2. Consider creating OnlineContext for app-wide state

3. Update files to use hook or centralized function

## Expected Outcome
- Single source for online status
- Reactive updates via hook
- Consistent behavior across app
```

**Status:** [x] Completed (January 2025)

**Completion Notes:**
- Created `src/hooks/useOnlineStatus.ts` as the centralized online status module:
  - `useOnlineStatus()` - React hook for reactive online status updates
  - `useOnlineStatusWithRefresh()` - Hook with manual refresh capability
  - `checkIsOnline()` - Async utility for non-hook contexts
  - `getIsOnlineCached()` - Synchronous cached status for backward compatibility
  - `initOnlineStatus()` - Initialization function for app startup
- Added exports to `src/hooks/index.ts` for all new functions
- Updated `src/hooks/scorecard/useOfflineSync.ts`:
  - `useIsOnline()` now delegates to centralized `useOnlineStatus()`
  - Added deprecation notice pointing to `@/hooks/useOnlineStatus`
- Updated documentation in files using `getIsOnline()` from sync service:
  - `src/hooks/scorecard/useScorecards.ts`
  - `src/hooks/scorecard/useSubmitScorecard.ts`
  - `src/store/scorecardStore.ts`
  - `src/services/offline/sync.ts`
- Decision: Kept `getIsOnline()` in sync service for backward compatibility:
  - Sync service maintains its own cache for performance
  - Non-breaking change - existing code continues to work
  - New code should use `useOnlineStatus()` hook or `checkIsOnline()` async function
- All TypeScript type checks pass (no new errors)
- All ESLint checks pass (no new errors)
- ~40 lines of centralized online status logic created
- Single source of truth established for online status in React components

---

## Phase 8: Export Organization (LOW Priority)

### 8.1 Organize Common Component Exports

**Use Command:** `/refactor`

**Description:** `src/components/common/index.ts` exports 30+ components.

**Files to Modify:**
- `src/components/common/index.ts`

**Detailed Prompt:**
```
/refactor src/components/common/index.ts

## Goal
Organize exports for better discoverability and tree-shaking.

## Current State
94 lines exporting 30+ components in flat list.

## Options

### Option A: Keep flat, add sections
```typescript
// === Layout ===
export * from './BottomSheet';
export * from './Tabs';

// === Input ===
export * from './FormInput';
export * from './DatePicker';

// === Display ===
export * from './Badge';
export * from './Pill';
// etc.
```

### Option B: Create subdirectories
```
common/
├── layout/
│   ├── BottomSheet/
│   ├── Tabs/
│   └── index.ts
├── input/
│   ├── FormInput/
│   └── index.ts
├── display/
│   └── index.ts
└── index.ts (re-exports all)
```

## Tasks

1. Add section comments to index.ts for organization:
   - Layout (BottomSheet, Tabs, SectionHeader)
   - Input (FormInput, DatePicker, TeeSelector, SearchBar)
   - Display (Badge, Pill, StatusBadge, EmptyState, ErrorState)
   - Feedback (LoadingSpinner, GolfBallLoader, ProgressBar)
   - Navigation (StepIndicator, PageHeader)

2. Consider if subdirectories would help (probably not worth the churn)

## Expected Outcome
- Better organized exports
- Easier to find components
```

**Status:** [x] Completed (January 2025)

**Completion Notes:**
- Reorganized `src/components/common/index.ts` with clear section comments
- Components grouped into 8 logical categories:
  - **Layout Components** - BottomSheet, Tabs, SectionHeader, FormSection, PageHeader, CardContainer, ExpandableItem
  - **Input Components** - FormInput, DatePicker, DateTimeFieldGroup, SearchBar, SegmentedButton, RadioButtonOption, TeeSelector
  - **Selection Components** - SelectionModal, FriendSelector, PlayerSelector, AvatarSelectionModal, ConfirmationDialog
  - **Display Components** - Badge, Pill, FilterPill, StatusBadge, DateTimeDisplay, InfoCard, MenuItemRow
  - **State Components** - EmptyState, ErrorState, LoadingSpinner, GolfBallLoader, ProgressBar, OfflineIndicator
  - **Navigation Components** - StepIndicator, NotificationBell, FeatureButton
  - **Avatar & Identity Components** - PlayerAvatar, GolferIcon, LogoHorizontal
  - **Hooks** - useSwipeToDelete
- Each section includes a brief description of its purpose
- Added header comment block for file overview
- Decision: Kept flat export structure (subdirectories not worth the churn as noted in the original task)
- Easier to find and understand components at a glance
- No functional changes, purely organizational

---

### 8.2 Review Unused Components

**Use Command:** N/A (manual review)

**Description:** Some components have minimal usage.

**Components to Review:**
- `src/components/common/NotificationBell.tsx` (1 usage)
- `src/components/common/RadioButtonOption.tsx`
- `src/components/common/MenuItemRow.tsx`
- `src/components/common/InfoCard.tsx` (2 usages)

**Detailed Prompt:**
```
## Task
Review component usage and decide: keep, move, or delete.

## Steps

1. For each component, run:
   grep -r "NotificationBell" src/
   grep -r "RadioButtonOption" src/
   grep -r "MenuItemRow" src/
   grep -r "InfoCard" src/

2. Analyze results:
   - 0 usages: Delete
   - 1 usage: Move to feature-specific folder
   - 2+ usages in same feature: Move to feature folder
   - 2+ usages across features: Keep in common

3. Update imports if moving

4. Remove from index.ts if deleted
```

**Status:** [x] Completed (January 2025)

**Completion Notes:**
- Analyzed usage of 4 components via grep across the codebase:
  - **NotificationBell** - 1 usage in ProfileScreen only → Moved to profile
  - **RadioButtonOption** - 3 usages, all in profile screens (HelpAndSupportScreen, SettingsScreen) → Moved to profile
  - **MenuItemRow** - 15 usages, all in profile screens (ProfileMenuSection, NotificationSettingsScreen) → Moved to profile
  - **InfoCard** - 2 usages across admin features (CourseSection, InviteCodeSection) → Kept in common

- Files moved to `src/screens/profile/components/`:
  - `NotificationBell.tsx`, `NotificationBell.test.tsx`, `NotificationBell.stories.tsx`
  - `RadioButtonOption.tsx`, `RadioButtonOption.test.tsx`, `RadioButtonOption.stories.tsx`
  - `MenuItemRow.tsx`, `MenuItemRow.test.tsx`, `MenuItemRow.stories.tsx`

- Updated exports:
  - `src/screens/profile/components/index.ts` - Added exports for moved components
  - `src/components/common/index.ts` - Removed exports, added comments noting new location

- Updated imports in consuming files:
  - `ProfileScreen.tsx` - NotificationBell now from `./components`
  - `HelpAndSupportScreen.tsx` - RadioButtonOption now from `./components`
  - `SettingsScreen.tsx` - RadioButtonOption now from `./components`
  - `ProfileMenuSection.tsx` - MenuItemRow now from `./MenuItemRow` (same folder)
  - `NotificationSettingsScreen.tsx` - MenuItemRow now from `./components`

- Updated Storybook story titles from `Common/...` to `Profile/...`

- All TypeScript type checks pass (pre-existing errors in unrelated test files)
- All ESLint checks pass for modified files
- Components remain fully functional with tests and stories intact

---

## Execution Tracking

| Phase | Task | Priority | Status | Completed |
|-------|------|----------|--------|-----------|
| 1 | 1.1 Date/Time Formatting | CRITICAL | [x] | Dec 2024 |
| 1 | 1.2 Scoring Utilities | HIGH | [x] | Dec 2024 |
| 2 | 2.1 Swipe Gesture Hook | HIGH | [x] | Dec 2024 |
| 2 | 2.2 Favorite Courses | HIGH | [x] | Dec 2024 |
| 2 | 2.3 Leaderboard Hooks | HIGH | [x] | Dec 2024 |
| 2 | 2.4 Badge Component | MEDIUM | [x] | Dec 2024 |
| 2 | 2.5 Card Container | MEDIUM | [x] | Dec 2024 |
| 3 | 3.1 Venue/Course Hooks | MEDIUM | [x] | Dec 2024 |
| 4 | 4.1 Scoring Constants | MEDIUM | [x] | Jan 2025 |
| 4 | 4.2 formatGameType | MEDIUM | [x] | Jan 2025 |
| 5 | 5.1 Split TeeSelector | MEDIUM | [x] | Jan 2025 |
| 5 | 5.2 ApiSearchModal | N/A | [x] | Jan 2025 (REMOVED) |
| 6 | 6.1 SelectionModal | MEDIUM | [x] | Jan 2025 |
| 7 | 7.1 Team Services | LOW | [x] | Jan 2025 |
| 7 | 7.2 Subscription Hooks | LOW | [x] | Jan 2025 |
| 7 | 7.3 Offline Check | LOW | [x] | Jan 2025 |
| 8 | 8.1 Organize Exports | LOW | [x] | Jan 2025 |
| 8 | 8.2 Unused Components | LOW | [x] | Jan 2025 |

---

## Expected Outcomes

- **~2000+ lines of duplicate code removed**
- **Single source of truth for core utilities**
- **Improved maintainability and discoverability**
- **Faster development with reusable components**
- **Easier onboarding for new developers**
