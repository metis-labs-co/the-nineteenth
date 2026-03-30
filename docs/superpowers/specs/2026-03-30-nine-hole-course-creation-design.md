# Design: 9-Hole Course Creation (Super Admin)

## Problem

The database supports 9-hole courses (`CHECK (num_holes IN (9, 18))`) but the UI always creates 18-hole courses. Super admins need to create 9-hole courses in two places:
1. The AddCourseModal (club details screen) — super admin only
2. The build-as-you-play inline course creation during round setup — super admin only

## Scope

- Super admin gating on both entry points
- 9/18 toggle in AddCourseModal and build-as-you-play inline form
- Pass `num_holes` through course creation services
- When a 9-hole course is created via build-as-you-play, auto-select `'front9'` for NineType

## Changes

### 1. AddCourseModal — 9/18 Toggle

**File:** `src/components/courses/AddCourseModal/index.tsx` + step components

Add a "Number of Holes" toggle (9 / 18) to Step 2 (CourseTeesStep) below the course name input. Default: 18.

When 9 is selected:
- HoleDataStep (Step 3) renders 9 hole rows instead of 18
- The wizard submission passes `num_holes: 9` to the course insert
- `total_holes` on the club set to 9

The AddCourseModal itself is already super admin only (gated by `useIsSuperAdmin` in the parent). Confirm this gating is in place.

### 2. Build-as-You-Play — 9/18 Toggle

**File:** `src/screens/rounds/CreateRoundBottomSheet/index.tsx` (inline course creation section)

When a super admin creates a new club/course inline during round setup, add a 9/18 toggle to the inline course creation form. Only shown when `isSuperAdmin` is true.

When 9 is selected:
- `PLACEHOLDER_HOLES` in `useStartNewRound.ts` generates 9 holes instead of 18
- Course created with `num_holes: 9`
- NineType auto-selects `'front9'` (a 9-hole course is always played as front 9)

When 18 is selected (default): existing behavior unchanged.

### 3. Course Creation Service — Pass num_holes

**Files:**
- `src/hooks/clubs/mutations.ts` — `useCreateCourse` and `useCreateClubWithCourse`
- `src/hooks/clubs/types.ts` — `CreateClubCourseInput`

Add `num_holes?: number` to `CreateClubCourseInput`. Both mutation hooks pass it through to the Supabase insert:

```typescript
num_holes: input.num_holes ?? (input.holes?.length <= 9 ? 9 : 18),
```

Falls back to inferring from holes array length.

### 4. PLACEHOLDER_HOLES for 9 Holes

**File:** `src/screens/rounds/RoundListScreen/hooks/useStartNewRound.ts`

The existing `PLACEHOLDER_HOLES` constant is always 18. Add a function:

```typescript
function createPlaceholderHoles(count: number): Hole[] {
  return Array.from({ length: count }, (_, i) => ({
    number: (i + 1) as Hole['number'],
    par: 4 as const,
    strokeIndex: i + 1,
  }));
}
```

When `isBuildAsYouPlay`, use `createPlaceholderHoles(numHoles)` where `numHoles` comes from the course creation form (9 or 18).

## What's NOT Changing

- Regular users always get 18-hole courses (no 9/18 toggle shown)
- Existing courses unaffected
- The NineType wizard step still appears for all users (choosing to play front/back 9 at an 18-hole course is separate from creating a 9-hole course)
- GolfAPI-imported courses retain their actual hole counts
