# Home Venue Feature - Implementation Progress

**Goal:** Refactored from "home course" to "home venue" - users save their home golf club (venue), not a specific course
**Status:** ✅ Complete - 100% (14/14 tasks)

---

## Overview

The Home Venue feature allows users to designate ONE venue (golf club) as their primary/home venue. This venue will:
- Display a home badge icon on venue cards
- Pre-fill the venue (and auto-select course for single-course venues) when creating rounds or competitions
- Show prominently on the user's profile
- Favorites remain at course level (independent of home venue)

### Key Concept Change
- **Before:** `players.home_course_id` → references `courses` table
- **After:** `players.home_venue_id` → references `venues` table

### Behaviour Changes
- Home badge shown on VenueCard (not CourseCard)
- Profile shows home venue name
- Pre-fill: Venue is pre-selected, user still picks which course for multi-course venues
- Favorites remain at course level (no change to favorites)

### Requirements (confirmed with user)
- For multi-course venues: pre-fill shows venue selected, user must pick course
- Favorites stay at course level (only home changes to venue)
- Confirmation dialog when replacing existing home venue
- Onboarding step updated to select venue

---

## Completed Tasks

### Task 1: Database Migration Update
**Status:** ✅ Complete
**File:** `supabase/migrations/20250317000000_home_course.sql`
- [x] Rename column `home_course_id` → `home_venue_id`
- [x] Change foreign key from `courses(id)` to `venues(id)`
- [x] Update index name

---

### Task 2: Update Player Type
**Status:** ✅ Complete
**File:** `src/types/database/player.types.ts`
- [x] Changed `home_course_id: string | null` → `home_venue_id: string | null`

---

### Task 3: Rename & Refactor useHomeCourse → useHomeVenue
**Status:** ✅ Complete
**File:** `src/hooks/useHomeVenue.ts` (new, replaced useHomeCourse.ts)
- [x] `useHomeCourse()` → `useHomeVenue()` - fetch venue with courses
- [x] `useSetHomeCourse()` → `useSetHomeVenue()` - set venue ID
- [x] `useClearHomeCourse()` → `useClearHomeVenue()`
- [x] Updated query key references
- [x] Returns `HomeVenueWithCourses` type (venue + nested courses)

---

### Task 4: Update Query Keys
**Status:** ✅ Complete
**File:** `src/hooks/queryKeys.ts`
- [x] Removed `homeCourse` from courseKeys
- [x] Added `homeVenue` to venueKeys

---

### Task 5: Update useVenues Hook
**Status:** ✅ Complete
**File:** `src/hooks/useVenues.ts`
- [x] Removed `is_home` from `CourseWithFavoriteStatus` interface
- [x] Added `is_home` to `VenueWithCourses` interface
- [x] Added `is_home` to `VenueCourseDisplayItem` interface
- [x] Updated `useVenuesWithCourses` to check `home_venue_id`
- [x] Updated `useSearchVenues` to check `home_venue_id`
- [x] Updated `useFavoriteCoursesWithVenues` to remove home checking
- [x] Updated `useVenueCourseDisplayItems` to include `is_home`

---

### Task 6: Update useCourseDetails Hook
**Status:** ✅ Complete
**File:** `src/hooks/useCourseDetails.ts`
- [x] Removed `is_home` from `CourseWithVenueDetail` interface
- [x] Removed home course checking logic

---

### Task 7: Update VenueCard Component
**Status:** ✅ Complete
**File:** `src/components/courses/VenueCard.tsx`
- [x] Added `isHomeVenue?: boolean` prop to CourseRow
- [x] Added home badge icon to single-course venue display
- [x] Added home badge icon to multi-course venue header
- [x] Added `homeBadge` styles

---

### Task 8: Update CourseCard Component
**Status:** ✅ Complete
**File:** `src/components/courses/CourseCard.tsx`
- [x] Removed `is_home` prop from `CourseWithFavorite` interface
- [x] Removed home badge UI
- [x] Removed `homeBadge` styles
- [x] Updated accessibility labels

---

### Task 9: Update CourseDetailScreen
**Status:** ✅ Complete
**File:** `src/screens/courses/CourseDetailScreen/index.tsx`
- [x] Import `useHomeVenue`, `useSetHomeVenue` (replaced course versions)
- [x] "Set as Home" button now sets the venue as home
- [x] Updated confirmation dialog text to reference venue
- [x] Check if course's venue is already home venue

---

### Task 10: Update ProfileScreen
**Status:** ✅ Complete
**File:** `src/screens/profile/ProfileScreen.tsx`
- [x] Import `useHomeVenue`
- [x] Display home venue name (not course)
- [x] Shows course count for multi-course venues
- [x] Navigate to venue detail on tap

---

### Task 11: Update Pre-fill Logic
**Status:** ✅ Complete
**Files:**
- `src/screens/rounds/CreateRoundBottomSheet/hooks/useCreateRoundWizard.ts`
- `src/components/competitionWizard/create/RoundDetailsStep/hooks/useRoundDetailsForm.ts`
- [x] Used `useHomeVenue()` instead of `useHomeCourse()`
- [x] Single-course venues: auto-select the only course
- [x] Multi-course venues: don't pre-fill course (user must pick)

---

### Task 12: Update Onboarding Step
**Status:** ✅ Complete
**Files:**
- `src/screens/onboarding/components/HomeVenueStep.tsx` (new, replaced HomeCourseStep.tsx)
- `src/screens/onboarding/OnboardingScreen.tsx`
- [x] Created new `HomeVenueStep` component
- [x] Changed UI to select venues (not courses)
- [x] Updated text: "Set Your Home Club"
- [x] Uses `useSetHomeVenue()` on completion
- [x] Deleted old `HomeCourseStep.tsx`
- [x] Updated `OnboardingScreen.tsx` import

---

### Task 13: Update Hook Exports
**Status:** ✅ Complete
**File:** `src/hooks/index.ts`
- [x] Removed `useHomeCourse`, `useSetHomeCourse`, `useClearHomeCourse`
- [x] Added `useHomeVenue`, `useSetHomeVenue`, `useClearHomeVenue`
- [x] Updated type exports (`HomeVenueWithCourses`)

---

### Task 14: Update Progress Document
**Status:** ✅ Complete
**File:** `docs/progress/HOME-VENUE-REFACTOR.md` (this file)
- [x] Documented the refactor changes

---

## Pre-fill Behaviour Detail

For round/competition creation when home venue is set:

**Single-course venue:**
- Auto-select the venue's only course
- Proceed to tee selection step

**Multi-course venue:**
- Don't pre-fill course
- User starts at course selection step
- User must select a course before proceeding

---

## Files Changed

### New Files
| File | Purpose |
|------|---------|
| `src/hooks/useHomeVenue.ts` | Home venue hooks |
| `src/screens/onboarding/components/HomeVenueStep.tsx` | Onboarding step for home venue |
| `docs/progress/HOME-VENUE-REFACTOR.md` | This progress tracking document |

### Modified Files
| File | Changes |
|------|---------|
| `supabase/migrations/20250317000000_home_course.sql` | Renamed column and FK |
| `src/types/database/player.types.ts` | `home_course_id` → `home_venue_id` |
| `src/hooks/queryKeys.ts` | Moved query key to venueKeys |
| `src/hooks/useVenues.ts` | `is_home` now at venue level |
| `src/hooks/useCourseDetails.ts` | Removed `is_home` |
| `src/hooks/index.ts` | Updated exports |
| `src/components/courses/VenueCard.tsx` | Added home badge |
| `src/components/courses/CourseCard.tsx` | Removed home badge |
| `src/screens/courses/CourseDetailScreen/index.tsx` | Sets venue as home |
| `src/screens/profile/ProfileScreen.tsx` | Shows home venue |
| `src/screens/rounds/CreateRoundBottomSheet/hooks/useCreateRoundWizard.ts` | Updated pre-fill logic |
| `src/components/competitionWizard/create/RoundDetailsStep/hooks/useRoundDetailsForm.ts` | Updated pre-fill logic |
| `src/screens/onboarding/OnboardingScreen.tsx` | Import HomeVenueStep |

### Deleted Files
| File | Reason |
|------|--------|
| `src/hooks/useHomeCourse.ts` | Replaced by useHomeVenue.ts |
| `src/screens/onboarding/components/HomeCourseStep.tsx` | Replaced by HomeVenueStep.tsx |

---

## Backward Compatibility

- Database migration handles column rename
- Existing `home_course_id` values will need to be migrated (see below)
- All existing functionality continues to work

### Data Migration Note
If there are existing users with `home_course_id` set, you may need to run a data migration to:
1. Find the venue for each home course
2. Set `home_venue_id` to that venue

This can be done with a SQL query:
```sql
UPDATE players p
SET home_venue_id = c.venue_id
FROM courses c
WHERE p.home_course_id = c.id
  AND p.home_course_id IS NOT NULL;
```

---

**Last Updated:** 2025-12-27
