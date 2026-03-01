/**
 * useApiCourses - Hooks for GolfAPI.io integration
 *
 * React Query hooks for:
 * - Searching courses via API
 * - Importing courses from API to local cache
 * - Getting courses with auto-refresh
 * - Manual refresh of course data
 * - Cache statistics
 */

import { useQuery, useMutation, useQueryClient, UseQueryOptions } from '@tanstack/react-query';
import { courseKeys } from './queryKeys';
import { courseService, type CourseSearchResult, type CourseWithDetails } from '@/services/courses/courseService';
import type { Course, Club, RegionFilter } from '@/types/database.types';

// =====================================================
// TYPES
// =====================================================

export interface UseApiCourseSearchOptions {
  /** Enable/disable the query */
  enabled?: boolean;
  /** Stale time in milliseconds */
  staleTime?: number;
  /** Whether to search external API (default: false) */
  searchApi?: boolean;
}

export interface UseImportCourseOptions {
  /** Callback on successful import */
  onSuccess?: (course: Course) => void;
  /** Callback on error */
  onError?: (error: Error) => void;
}

// =====================================================
// HOOKS
// =====================================================

/**
 * Search courses from cache and optionally external API
 *
 * @param query - Search query string
 * @param state - Optional Australian state filter
 * @param options - Query options
 */
export function useApiCourseSearch(
  query: string,
  state?: RegionFilter,
  options: UseApiCourseSearchOptions = {}
) {
  const { enabled = true, staleTime = 2 * 60 * 1000, searchApi = false } = options;

  return useQuery({
    queryKey: courseKeys.apiSearch(query, state),
    queryFn: async (): Promise<CourseSearchResult> => {
      return courseService.searchCourses({
        query,
        state,
        searchApi,
      });
    },
    enabled: enabled && query.length >= 2,
    staleTime,
    // Don't refetch on window focus for API searches
    refetchOnWindowFocus: false,
  });
}

/**
 * Import a course from GolfAPI.io to local cache
 */
export function useImportCourse(options: UseImportCourseOptions = {}) {
  const queryClient = useQueryClient();
  const { onSuccess, onError } = options;

  return useMutation({
    mutationFn: async ({
      apiCourseId,
    }: {
      apiCourseId: string;
      clubId?: string;
    }) => {
      const result = await courseService.importCourse(apiCourseId);
      return result.course;
    },
    onSuccess: (course) => {
      // Invalidate all course queries to refresh lists
      queryClient.invalidateQueries({ queryKey: courseKeys.all });
      onSuccess?.(course);
    },
    onError: (error: Error) => {
      onError?.(error);
    },
  });
}

/**
 * Import a basic course from search result (without full details)
 */
export function useImportBasicClub(options: { onSuccess?: (club: Club) => void; onError?: (error: Error) => void } = {}) {
  const queryClient = useQueryClient();
  const { onSuccess, onError } = options;

  return useMutation({
    mutationFn: async (partialClub: Partial<Club>) => {
      return courseService.importBasicClub(partialClub);
    },
    onSuccess: (club) => {
      queryClient.invalidateQueries({ queryKey: courseKeys.all });
      onSuccess?.(club);
    },
    onError: (error: Error) => {
      onError?.(error);
    },
  });
}

/**
 * @deprecated Use useImportBasicClub instead
 */
export const useImportBasicCourse = useImportBasicClub;

/**
 * Get a course with optional auto-refresh from API
 *
 * @param courseId - Internal course ID
 * @param options - Query options
 */
export function useCourseWithDetails(
  courseId: string | undefined,
  options: Partial<UseQueryOptions<CourseWithDetails | null, Error>> = {}
) {
  return useQuery({
    queryKey: courseKeys.detailWithApi(courseId ?? ''),
    queryFn: async (): Promise<CourseWithDetails | null> => {
      if (!courseId) return null;
      return courseService.getCourseWithDetails(courseId);
    },
    enabled: !!courseId,
    staleTime: 10 * 60 * 1000, // 10 minutes
    ...options,
  });
}

/**
 * Manually refresh course data from API
 */
export function useRefreshCourseData() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (courseId: string) => {
      const course = await courseService.refreshCourseData(courseId);
      if (!course) {
        throw new Error('Course not found');
      }
      return course;
    },
    onSuccess: (course) => {
      // Update the specific course query
      queryClient.setQueryData(courseKeys.detail(course.id), course);
      queryClient.setQueryData(courseKeys.detailWithApi(course.id), course);
      // Invalidate list queries
      queryClient.invalidateQueries({ queryKey: courseKeys.lists() });
    },
  });
}

/**
 * Get cache statistics
 */
export function useCacheStats() {
  return useQuery({
    queryKey: courseKeys.cacheStats(),
    queryFn: () => courseService.getCacheStats(),
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
}

/**
 * Check if GolfAPI.io is available
 */
export function useIsApiAvailable() {
  return courseService.isApiAvailable();
}

/**
 * Refresh stale courses in background
 */
export function useRefreshStaleCourses() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (batchSize: number = 10) => {
      return courseService.refreshStaleClubs(batchSize);
    },
    onSuccess: () => {
      // Invalidate all course queries
      queryClient.invalidateQueries({ queryKey: courseKeys.all });
    },
  });
}

// =====================================================
// COMBINED SEARCH HOOK
// =====================================================

/**
 * Combined hook for searching courses with both cache and API
 * Provides a unified interface for the CoursesScreen
 *
 * @param query - Search query string
 * @param state - Optional Australian state filter
 * @param enableApiSearch - Whether to search external API
 */
export function useCombinedCourseSearch(
  query: string,
  state?: RegionFilter,
  enableApiSearch: boolean = false
) {
  const searchResult = useApiCourseSearch(query, state, {
    searchApi: enableApiSearch,
    enabled: query.length >= 2 || !!state,
  });

  return {
    // All courses (cached + API results)
    courses: [
      ...(searchResult.data?.cached ?? []),
      // Map API results to include temporary flag
      ...(searchResult.data?.apiResults ?? []).map((c) => ({
        ...c,
        id: c.golfapi_club_id || '', // Use golfapi_club_id as temporary id
        _isApiResult: true, // Flag for UI to show import button
      })),
    ] as (Course & { _isApiResult?: boolean })[],
    // Separate cached courses
    cachedCourses: searchResult.data?.cached ?? [],
    // Separate API results (not yet imported)
    apiResults: searchResult.data?.apiResults ?? [],
    // Loading state
    isLoading: searchResult.isLoading,
    // Fetching state (for refetch indicator)
    isFetching: searchResult.isFetching,
    // Error state
    error: searchResult.error,
    // API-specific error
    apiError: searchResult.data?.apiError,
    // Whether API was searched
    apiSearched: searchResult.data?.apiSearched ?? false,
    // Refetch function
    refetch: searchResult.refetch,
    // Total cached count
    cachedTotal: searchResult.data?.cachedTotal ?? 0,
    // Has more cached results
    hasMoreCached: searchResult.data?.hasMoreCached ?? false,
  };
}
