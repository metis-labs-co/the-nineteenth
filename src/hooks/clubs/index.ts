/**
 * Club Hooks - Module Index
 *
 * TanStack Query hooks for club and course data fetching.
 *
 * ## Hook Responsibilities (Club/Course Hook Architecture)
 *
 * This module is part of a clear hook hierarchy for club/course data:
 *
 * ### CLUB HOOKS (this module)
 * - `useClubsWithCourses(state?)` - List all clubs with nested courses
 *   Use for: Course selection lists, club browsing, home club selection
 * - `useSearchClubs(query, state?)` - Search clubs by name
 *   Use for: Search functionality in course selection
 * - `useFavoriteCoursesWithClubs()` - User's favorite courses with club info
 *   Use for: Favorites section in course selection
 *
 * ### SINGLE CLUB HOOKS (useClubDetails.ts)
 * - `useClubDetails(clubId)` - Single club with all its courses
 *   Use for: Club detail screen, viewing all courses at a club
 *
 * ### COURSE HOOKS (useCourses.ts)
 * - `useCourses()` - List all courses (flat, without club nesting)
 *   Use for: Admin course management, flat course lists
 * - `useSearchCourses(query, state?)` - Search courses by name
 *   Use for: Course-only search (when club grouping not needed)
 *
 * ### SINGLE COURSE HOOKS (useCourseDetails.ts)
 * - `useCourseDetails(courseId)` - Single course with club info
 *   Use for: Course detail screen, scorecard setup
 *
 * ### MUTATION HOOKS
 * - `useCreateClub()` - Create new club
 * - `useCreateCourse()` - Create course at club
 * - `useCreateClubWithCourse()` - Create club + course together
 * - `useAddCourseFavorite/useRemoveCourseFavorite` - Manage favorites
 *
 * @example
 * ```tsx
 * // Import from the clubs module
 * import { useClubsWithCourses, useSearchClubs } from '@/hooks/clubs';
 *
 * // Or import the entire module
 * import * as clubs from '@/hooks/clubs';
 * ```
 */

// Re-export types
export type {
  CourseWithFavoriteStatus,
  ClubWithCourses,
  ClubCourseDisplayItem,
  CreateClubInput,
  CreateClubCourseInput,
  FavoriteCourseWithClub,
  SearchResultItem,
  // Internal types (exported for advanced use cases)
  SupabaseCourseWithTees,
  SupabaseClubWithCourses,
  SupabasePlayerHomeClub,
  SupabaseFavoriteCourseWithClub,
} from './types';

// Re-export helpers
export { mergeTees, isLocalClub, toClubCourseDisplayItem, sortHomeClubFirst, sortByDistance } from './helpers';

// Re-export query hooks
export {
  useClubsWithCourses,
  useSearchClubs,
  useClubCourseDisplayItems,
  useFavoriteCoursesWithClubs,
} from './queries';

// Re-export mutation hooks
// Note: useCreateCourse from clubs/mutations.ts (club-specific) is NOT re-exported here
// to avoid naming conflict with courses/useCreateCourse (manual entry).
// Import directly from '@/hooks/clubs/mutations' if you need the club-specific version.
export { useCreateClub, useCreateClubWithCourse, useDeleteClubIfEmpty } from './mutations';

// Re-export club details hook and types
export { useClubDetails } from './clubDetails';
export type { ClubWithCoursesDetail } from './clubDetails';

// Note: isGolfApiResult and GolfApiSearchResultItem are now in '@/hooks/courses'
// They were previously re-exported here for convenience but that caused duplicate export errors.

// Re-export favorite mutations from useFavoriteCourses with club-specific names
export {
  useAddFavorite as useAddCourseFavorite,
  useRemoveFavorite as useRemoveCourseFavorite,
} from '@/hooks/useFavoriteCourses';

// Re-export home club hooks
export { useHomeClub, useSetHomeClub, useClearHomeClub } from './homeClub';
export type { HomeClubWithCourses } from './homeClub';

// Re-export import club hooks
export { useImportClub } from './importClub';
export type { ImportClubResult } from './importClub';

// Re-export club sync hooks
export { useClubSync } from './clubSync';
export type { UseClubSyncResult } from './clubSync';
