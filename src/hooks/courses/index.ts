/**
 * Course Hooks - Module Index
 *
 * TanStack Query hooks for course data fetching, mutations, favorites,
 * and GolfAPI.io integration.
 *
 * ## Hook Responsibilities (Course Hook Architecture)
 *
 * ### QUERY HOOKS (queries.ts)
 * - `useCourses()` - List all courses with favorite status
 * - `useSearchCourses(query, state?)` - Search courses by name/state
 * - `useFavoriteCourses()` - User's favorite courses with full data
 * - `useCreateCourse()` - Create new course (manual entry)
 * - `useCourse(id)` - Single course by ID (deprecated, use useCourseDetails)
 * - `useCourseDetails(courseId, options?)` - Single course with club info and tees
 * - `useCoursesByClub(clubId)` - Courses by club ID (deprecated)
 *
 * ### MUTATION HOOKS (mutations.ts)
 * - `useDeleteCourse()` - Delete a manually-created course
 * - `useUpdateCourse()` - Update course metadata
 * - `useUpdateCourseHoles()` - Update course hole data
 *
 * ### FAVORITE HOOKS (favorites.ts)
 * - `useFavoriteCourseIds()` - User's favorite course IDs
 * - `useAddFavorite()` - Add course to favorites
 * - `useRemoveFavorite()` - Remove course from favorites
 * - `useToggleFavorite()` - Toggle favorite status
 * - `useIsFavorite(courseId)` - Check if course is favorited
 * - `useFavoriteEnrichment()` - Enrich course arrays with favorite status
 *
 * ### API HOOKS (apiCourses.ts)
 * - `useApiCourseSearch(query, state?, options?)` - Search via GolfAPI.io
 * - `useImportCourse(options?)` - Import course from API
 * - `useImportBasicClub(options?)` - Import basic club from search
 * - `useCourseWithDetails(courseId, options?)` - Course with auto-refresh
 * - `useRefreshCourseData()` - Manual refresh from API
 * - `useCacheStats()` - Cache statistics
 * - `useIsApiAvailable()` - Check API availability
 * - `useRefreshStaleCourses()` - Background stale refresh
 * - `useCombinedCourseSearch(query, state?, enableApi?)` - Combined search
 *
 * ### GOLF API SEARCH (golfApiSearch.ts)
 * - `useGolfApiSearch(query, state?, enabled?)` - Search GolfAPI.io for clubs
 * - `isGolfApiResult(item)` - Type guard for API results
 *
 * @example
 * ```tsx
 * // Import from the courses module
 * import { useCourseDetails, useUpdateCourse } from '@/hooks/courses';
 *
 * // Or import the entire module
 * import * as courses from '@/hooks/courses';
 * ```
 */

// Re-export query hooks and types
export {
  useCourses,
  useSearchCourses,
  useFavoriteCourses,
  useCreateCourse,
  useCourse,
  useCourseDetails,
  useCoursesByClub,
} from './queries';
export type {
  CourseWithFavorite,
  CreateCourseInput,
  UseCourseDetailsOptions,
  CourseWithDetails,
  CourseWithClubDetail,
} from './queries';

// Re-export mutation hooks and types
export {
  useDeleteCourse,
  useUpdateCourse,
  useUpdateCourseHoles,
} from './mutations';
export type {
  DeleteCourseInput,
  DeleteCourseResult,
  UpdateCourseInput,
  UpdateCourseHolesInput,
} from './mutations';

// Re-export favorite hooks and types
export {
  useFavoriteCourseIds,
  useAddFavorite,
  useRemoveFavorite,
  useToggleFavorite,
  useIsFavorite,
  useFavoriteEnrichment,
} from './favorites';
export type { CourseWithFavorite as FavoriteCourseWithFavorite } from './favorites';

// Re-export API hooks and types
export {
  useApiCourseSearch,
  useImportCourse,
  useImportBasicClub,
  useImportBasicCourse,
  useCourseWithDetails,
  useRefreshCourseData,
  useCacheStats,
  useIsApiAvailable,
  useRefreshStaleCourses,
  useCombinedCourseSearch,
} from './apiCourses';
export type {
  UseApiCourseSearchOptions,
  UseImportCourseOptions,
} from './apiCourses';

// Re-export GolfAPI search hooks and types
export {
  useGolfApiSearch,
  isGolfApiResult,
} from './golfApiSearch';
export type { GolfApiSearchResultItem } from './golfApiSearch';
