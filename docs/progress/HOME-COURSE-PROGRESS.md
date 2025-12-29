# Home Course Feature - Implementation Progress

**Goal:** Add functionality to mark a single course as "home" - user can only have one home course at a time
**Status:** ✅ Complete - 100% (10/10 tasks)

---

## Overview

The Home Course feature allows users to designate ONE course as their primary/home course. This course will:
- Be automatically added to favourites when set as home
- Display a home badge icon on course cards
- Pre-fill as the default course when creating rounds or competitions
- Show prominently on the user's profile

### Requirements (confirmed with user)
- Home course must also be a favourite (auto-add when set)
- Display in profile AND pre-fill as default in round/competition creation
- Home icon badge on course cards
- Confirmation dialog when replacing existing home course
- British spelling ("favourite") to match codebase

---

## Sprint 1: Database & Types

### Task 1: Database Migration
**Status:** ✅ Complete
**Implemented in:** `supabase/migrations/20250317000000_home_course.sql`
**Deliverables:**
- [x] Add `home_course_id` column to `players` table
- [x] Add foreign key constraint to `courses(id)` with `ON DELETE SET NULL`
- [x] Add index for efficient queries

**Dependencies:** None

---

### Task 2: Update Player Type
**Status:** ✅ Complete
**Implemented in:** `src/types/database/player.types.ts`
**Deliverables:**
- [x] Add `home_course_id: string | null` to `Player` interface

**Dependencies:** Task 1

---

## Sprint 2: Hooks

### Task 3: Add Query Keys
**Status:** ✅ Complete
**Implemented in:** `src/hooks/queryKeys.ts`
**Deliverables:**
- [x] Add `homeCourse: (playerId: string) => [...]` to courseKeys

**Dependencies:** None

---

### Task 4: Create useHomeCourse Hook
**Status:** ✅ Complete
**Implemented in:** `src/hooks/useHomeCourse.ts`
**Deliverables:**
- [x] `useHomeCourse()` - Query hook to fetch home course with venue details
- [x] `useSetHomeCourse()` - Mutation (auto-adds to favourites, updates player)
- [x] `useClearHomeCourse()` - Mutation to clear home course
- [x] Proper cache invalidation (player, courses, venues)
- [x] Export from `src/hooks/index.ts`

**Dependencies:** Task 2, Task 3

---

### Task 5: Update Venue Hooks
**Status:** ✅ Complete
**Implemented in:** `src/hooks/useVenues.ts`
**Deliverables:**
- [x] Add `is_home: boolean` to `CourseWithFavoriteStatus` interface
- [x] Update `useVenuesWithCourses` to include home status
- [x] Update `useSearchVenues` to include home status
- [x] Update `useFavoriteCoursesWithVenues` to include home status

**Dependencies:** Task 2

---

## Sprint 3: UI Components

### Task 6: Update CourseCard Component
**Status:** ✅ Complete
**Implemented in:** `src/components/courses/CourseCard.tsx`
**Deliverables:**
- [x] Add `is_home?: boolean` to `CourseWithFavorite` interface
- [x] Add home badge icon next to course name (20x20 circle with home icon)
- [x] Add styles for badge (`courseNameRow`, `homeBadge`)
- [x] Update accessibility labels

**Dependencies:** Task 5

---

### Task 7: Update CourseDetailScreen
**Status:** ✅ Complete
**Implemented in:** `src/screens/courses/CourseDetailScreen/index.tsx`
**Deliverables:**
- [x] Import `useHomeCourse`, `useSetHomeCourse`
- [x] Import `ConfirmationDialog`
- [x] Add home course state (`showHomeConfirmDialog`, `isSettingHome`)
- [x] Add "Set as Home" button in header (next to favourite button)
- [x] Add handler for setting home course with confirmation logic
- [x] Add the ConfirmationDialog component

**Dependencies:** Task 4, Task 5

---

### Task 8: Update ProfileScreen
**Status:** ✅ Complete
**Implemented in:** `src/screens/profile/ProfileScreen.tsx`
**Deliverables:**
- [x] Import and use `useHomeCourse`
- [x] Add home course card section after user info
- [x] If set: Show home icon, course name, venue name, chevron to navigate
- [x] If not set: Show empty state "Home Course - Not set"
- [x] Navigation to CourseDetailScreen on press

**Dependencies:** Task 4

---

## Sprint 4: Pre-fill Integration

### Task 9: Pre-fill in Round & Competition Creation
**Status:** ✅ Complete
**Implemented in:**
- `src/screens/rounds/CreateRoundBottomSheet/hooks/useCreateRoundWizard.ts`
- `src/components/competitionWizard/create/RoundDetailsStep/hooks/useRoundDetailsForm.ts`
**Deliverables:**
- [x] Import `useHomeCourse` in useCreateRoundWizard
- [x] Update initial course logic: `initialCourse || homeCourse || null`
- [x] Import `useHomeCourse` in useRoundDetailsForm
- [x] Update to pre-fill new rounds with home course

**Dependencies:** Task 4

---

## Sprint 5: Onboarding Integration

### Task 10: Add Home Course Onboarding Step
**Status:** ✅ Complete
**Implemented in:**
- `src/screens/onboarding/components/HomeCourseStep.tsx` (new)
- `src/screens/onboarding/components/HandicapCaptureStep.tsx` (modified)
- `src/screens/onboarding/OnboardingScreen.tsx` (modified)
**Deliverables:**
- [x] Create `HomeCourseStep` component with course selection modal
- [x] Add "Maybe later" skip option
- [x] Update `HandicapCaptureStep` to navigate to next step (not complete)
- [x] Add `HomeCourseStep` to STEPS array as final step
- [x] Set home course on completion (uses `useSetHomeCourse` hook)

**Dependencies:** Task 4

---

## Progress Summary

### Completion Statistics
- **Total Tasks:** 10
- **Completed:** 10 ✅ (100%)
- **In Progress:** 0 🔄 (0%)
- **Not Started:** 0 ⬜ (0%)

### Sprint Progress

**Sprint 1: Database & Types** ✅ Complete
- ✅ Task 1: Database Migration
- ✅ Task 2: Update Player Type

**Sprint 2: Hooks** ✅ Complete
- ✅ Task 3: Add Query Keys
- ✅ Task 4: Create useHomeCourse Hook
- ✅ Task 5: Update Venue Hooks

**Sprint 3: UI Components** ✅ Complete
- ✅ Task 6: Update CourseCard Component
- ✅ Task 7: Update CourseDetailScreen
- ✅ Task 8: Update ProfileScreen

**Sprint 4: Pre-fill Integration** ✅ Complete
- ✅ Task 9: Pre-fill in Round & Competition Creation

**Sprint 5: Onboarding Integration** ✅ Complete
- ✅ Task 10: Add Home Course Onboarding Step

---

## Critical Files

### New Files
| File | Purpose |
|------|---------|
| `supabase/migrations/20250317000000_home_course.sql` | Database migration |
| `src/hooks/useHomeCourse.ts` | Home course hooks |
| `src/screens/onboarding/components/HomeCourseStep.tsx` | Onboarding step for home course |
| `docs/progress/HOME-COURSE-PROGRESS.md` | Progress tracking |

### Modified Files
| File | Changes |
|------|---------|
| `src/types/database/player.types.ts` | Add `home_course_id` field |
| `src/hooks/queryKeys.ts` | Add home course query key |
| `src/hooks/useVenues.ts` | Add `is_home` to course status |
| `src/hooks/useCourseDetails.ts` | Add `is_home` to `CourseWithVenueDetail` |
| `src/hooks/index.ts` | Export new hooks |
| `src/components/courses/CourseCard.tsx` | Add home badge UI |
| `src/screens/courses/CourseDetailScreen/index.tsx` | Add "Set as Home" action |
| `src/screens/profile/ProfileScreen.tsx` | Add home course section |
| `src/screens/rounds/CreateRoundBottomSheet/hooks/useCreateRoundWizard.ts` | Pre-fill home course |
| `src/components/competitionWizard/create/RoundDetailsStep/hooks/useRoundDetailsForm.ts` | Pre-fill home course |
| `src/screens/onboarding/OnboardingScreen.tsx` | Add HomeCourseStep to STEPS array |
| `src/screens/onboarding/components/HandicapCaptureStep.tsx` | Change to onNext (not final step) |

---

## Edge Cases to Handle
- User with no home course (null state - graceful empty UI)
- Home course deleted from database (`ON DELETE SET NULL` handles this)
- Setting home course that's already a favourite (upsert handles gracefully)
- Confirmation dialog when replacing existing home course
- Onboarding skip (user can skip home course step with "Maybe later")
- No courses available during onboarding (empty state shown in modal)

---

## Backward Compatibility
- `home_course_id` defaults to `NULL` - existing players unaffected
- All existing functionality continues to work
- Home course is entirely opt-in

---

## Type Safety Notes

All home course related files have been verified to pass TypeScript checks:
- `src/hooks/useHomeCourse.ts` - Uses `(supabase as any)` for player updates (database types not yet generated)
- `src/hooks/useCourseDetails.ts` - Added `is_home` to `CourseWithVenueDetail` interface
- `src/hooks/useVenues.ts` - Uses `(supabase as any)` for player home course queries
- `src/components/courses/CourseCard.tsx` - No errors
- `src/screens/courses/CourseDetailScreen/index.tsx` - No errors
- `src/screens/profile/ProfileScreen.tsx` - No errors
- `src/screens/rounds/CreateRoundBottomSheet/hooks/useCreateRoundWizard.ts` - No errors
- `src/components/competitionWizard/create/RoundDetailsStep/hooks/useRoundDetailsForm.ts` - No errors
- `src/screens/onboarding/OnboardingScreen.tsx` - No errors
- `src/screens/onboarding/components/HomeCourseStep.tsx` - No errors
- `src/screens/onboarding/components/HandicapCaptureStep.tsx` - No errors

**Note:** After running the database migration, regenerate Supabase types to remove the need for `(supabase as any)` casts.

---

**Last Updated:** 2025-12-27
