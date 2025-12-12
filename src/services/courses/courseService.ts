/**
 * Unified Course Service
 *
 * Orchestrates GolfAPI.io calls and PostgreSQL caching.
 * Features:
 * - Always search local cache first
 * - Fetch from API when enabled
 * - Graceful fallback to cache on API failure
 * - Import courses with full details
 * - Refresh stale course data
 */

import { golfApiClient, RateLimitError, NetworkError } from '@/services/api/golfApiClient';
import { courseCacheService, CACHE_TTL_MS } from './cacheService';
import {
  transformClubToCourse,
  transformCourseDetail,
  hasHoleData,
} from '@/services/api/golfApiTransformers';
import type { LegacyCourse, AustralianState } from '@/types/database.types';
import type { GolfApiSearchParams } from '@/services/api/golfApiTypes';

// =====================================================
// TYPES
// =====================================================

export interface CourseSearchParams {
  query?: string;
  state?: AustralianState;
  limit?: number;
  offset?: number;
  /** Whether to search external API in addition to cache */
  searchApi?: boolean;
}

export interface CourseSearchResult {
  /** Courses from local cache */
  cached: LegacyCourse[];
  /** Courses from API (transformed, not yet cached) */
  apiResults: Partial<LegacyCourse>[];
  /** Whether results came primarily from cache */
  fromCache: boolean;
  /** Whether API was searched */
  apiSearched: boolean;
  /** Error if API search failed */
  apiError?: string;
  /** Total count from cache */
  cachedTotal: number;
  /** Has more cached results */
  hasMoreCached: boolean;
}

export interface ImportCourseResult {
  course: LegacyCourse;
  /** Whether course was newly created or updated */
  created: boolean;
  /** Whether full hole data was imported */
  hasHoleData: boolean;
}

// =====================================================
// SERVICE
// =====================================================

/**
 * Unified Course Service
 */
class CourseService {
  /**
   * Search courses from cache and optionally API
   *
   * @param params - Search parameters
   * @returns Combined search results
   */
  async searchCourses(params: CourseSearchParams): Promise<CourseSearchResult> {
    const {
      query,
      state,
      limit = 20,
      offset = 0,
      searchApi = false,
    } = params;

    // Always search cache first
    const cacheResult = await courseCacheService.searchCachedCourses({
      query,
      state,
      limit,
      offset,
    });

    const result: CourseSearchResult = {
      cached: cacheResult.courses,
      apiResults: [],
      fromCache: true,
      apiSearched: false,
      cachedTotal: cacheResult.total,
      hasMoreCached: cacheResult.hasMore,
    };

    // If API search is disabled or not available, return cache only
    if (!searchApi || !golfApiClient.isAvailable()) {
      return result;
    }

    // Try API search
    try {
      const apiParams: GolfApiSearchParams = {
        query,
        state,
        country: 'AU',
        limit,
        offset,
      };

      const apiResponse = await golfApiClient.searchClubs(apiParams);

      result.apiSearched = true;

      // Transform API results
      const apiCourses = apiResponse.data.map(transformClubToCourse);

      // Filter out courses already in cache (by api_id)
      const cachedApiIds = new Set(
        cacheResult.courses.filter((c) => c.api_id).map((c) => c.api_id)
      );

      result.apiResults = apiCourses.filter(
        (c) => c.api_id && !cachedApiIds.has(c.api_id)
      );

      result.fromCache = false;
    } catch (error) {
      result.apiSearched = true;

      if (error instanceof RateLimitError) {
        result.apiError = `Rate limit exceeded. Try again in ${error.retryAfter} seconds.`;
      } else if (error instanceof NetworkError) {
        result.apiError = 'Network error. Showing cached results.';
      } else {
        result.apiError = 'API search failed. Showing cached results.';
      }

      console.warn('[CourseService] API search failed:', error);
    }

    return result;
  }

  /**
   * Import a course from API to local cache
   *
   * @param apiCourseId - The API course identifier
   * @param clubId - The API club identifier
   * @returns Imported course with full details
   */
  async importCourse(apiCourseId: string, clubId: string): Promise<ImportCourseResult> {
    // Check if already cached
    const existingCourse = await courseCacheService.getCachedCourseByApiId(apiCourseId);
    const created = !existingCourse;

    try {
      // Fetch club info
      const club = await golfApiClient.getClub(clubId);

      // Fetch course details with holes/tees
      const courseDetails = await golfApiClient.getCourseDetails(apiCourseId);

      // Transform to app format
      const transformedCourse = transformCourseDetail(club, courseDetails);

      // Cache the course
      const cachedCourse = await courseCacheService.cacheCourse(transformedCourse);

      return {
        course: cachedCourse,
        created,
        hasHoleData: hasHoleData(transformedCourse),
      };
    } catch (error) {
      // If API fails but we have cached data, return stale cache
      if (existingCourse) {
        console.warn('[CourseService] API fetch failed, returning cached data:', error);
        return {
          course: existingCourse,
          created: false,
          hasHoleData: hasHoleData(existingCourse),
        };
      }

      throw error;
    }
  }

  /**
   * Import a course from search result (basic info only)
   * Use when full course details aren't available yet
   *
   * @param partialCourse - Partial course data from search
   * @returns Cached course
   */
  async importBasicCourse(partialCourse: Partial<LegacyCourse>): Promise<LegacyCourse> {
    return courseCacheService.cacheCourse(partialCourse);
  }

  /**
   * Get course with optional refresh from API
   *
   * @param courseId - Internal course ID
   * @param forceRefresh - Force refresh from API even if cache is fresh
   * @returns Course data
   */
  async getCourseWithDetails(
    courseId: string,
    forceRefresh: boolean = false
  ): Promise<LegacyCourse | null> {
    // Get cached course
    const cachedCourse = await courseCacheService.getCachedCourse(courseId);

    if (!cachedCourse) {
      return null;
    }

    // If manual course, return as-is
    if (cachedCourse.source === 'manual') {
      return cachedCourse;
    }

    // Check if refresh needed
    const needsRefresh =
      forceRefresh ||
      !cachedCourse.last_synced ||
      Date.now() - new Date(cachedCourse.last_synced).getTime() > CACHE_TTL_MS;

    if (!needsRefresh || !cachedCourse.api_id) {
      return cachedCourse;
    }

    // Try to refresh from API
    if (!golfApiClient.isAvailable()) {
      return cachedCourse;
    }

    try {
      const courseDetails = await golfApiClient.getCourseDetails(cachedCourse.api_id);

      // Get club info for full transformation
      // Note: We'd need the club ID, which we may not have stored
      // For now, just update hole/tee data
      const updatedCourse = await courseCacheService.cacheCourse({
        ...cachedCourse,
        holes: courseDetails.holes?.map((h) => ({
          number: h.number as 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10 | 11 | 12 | 13 | 14 | 15 | 16 | 17 | 18,
          par: h.par,
          strokeIndex: h.strokeIndex,
          yardages: h.yardages?.reduce((acc, y) => {
            acc[y.teeName?.toLowerCase() || y.teeId] = y.yards;
            return acc;
          }, {} as Record<string, number>),
        })) ?? cachedCourse.holes,
        tees: courseDetails.tees?.map((t) => ({
          name: t.name,
          color: t.color,
          totalYardage: t.totalYardage,
          courseRating: t.courseRating,
          slopeRating: t.slopeRating,
        })) ?? cachedCourse.tees,
        slope_rating: courseDetails.slopeRating ?? cachedCourse.slope_rating,
        course_rating: courseDetails.courseRating ?? cachedCourse.course_rating,
        last_synced: new Date().toISOString(),
      });

      return updatedCourse;
    } catch (error) {
      console.warn('[CourseService] Failed to refresh course:', error);
      // Return stale cache on error
      return cachedCourse;
    }
  }

  /**
   * Refresh course data from API
   *
   * @param courseId - Internal course ID
   * @returns Updated course
   */
  async refreshCourseData(courseId: string): Promise<LegacyCourse | null> {
    return this.getCourseWithDetails(courseId, true);
  }

  /**
   * Check if API is available
   */
  isApiAvailable(): boolean {
    return golfApiClient.isAvailable();
  }

  /**
   * Get cache statistics
   */
  async getCacheStats() {
    return courseCacheService.getCacheStats();
  }

  /**
   * Refresh all stale courses (background task)
   *
   * @param batchSize - Number of courses to refresh per batch
   * @returns Number of courses refreshed
   */
  async refreshStaleCourses(batchSize: number = 10): Promise<number> {
    if (!golfApiClient.isAvailable()) {
      return 0;
    }

    const staleCourses = await courseCacheService.getStaleCourses(batchSize);
    let refreshedCount = 0;

    for (const course of staleCourses) {
      try {
        await this.refreshCourseData(course.id);
        refreshedCount++;
      } catch (error) {
        console.warn('[CourseService] Failed to refresh stale course:', course.name, error);
        // Continue with other courses
      }
    }

    return refreshedCount;
  }
}

// =====================================================
// SINGLETON EXPORT
// =====================================================

/**
 * Singleton course service instance
 */
export const courseService = new CourseService();

/**
 * Export class for testing
 */
export { CourseService };
