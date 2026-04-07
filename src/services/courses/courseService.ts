/**
 * Unified Course Service
 *
 * Orchestrates GolfAPI.io calls and PostgreSQL caching for clubs, courses, tees, and coordinates.
 *
 * Features:
 * - Always search local cache first
 * - Fetch from API when enabled
 * - Graceful fallback to cache on API failure
 * - Import clubs with courses and tees
 * - Refresh stale course data
 *
 * Updated January 2026 for GolfAPI.io integration:
 * - Renamed venue → club throughout
 * - Courses now use club_id (not venue_id)
 * - Tees stored in separate table (not JSONB)
 * - Coordinates stored in separate table
 */

import { golfApiClient, RateLimitError, NetworkError } from '@/services/api/golfApiClient';
import { courseCacheService, CACHE_TTL_MS } from './cacheService';
import { teesService } from './teesService';
import { coordinatesService } from './coordinatesService';
import {
  transformApiClubResponse,
  transformApiCourseResponse,
  transformApiCoordinates,
  hasHoleData,
  hasTeeData,
} from '@/services/api/golfApiTransformers';
import {
  filterMultiNineCourses,
  getDisplayCourseName,
  getMultiNineTotalHoles,
} from '@/services/api/multiNineFilter';
import type {
  Club,
  Course,
  Tee,
  HoleCoordinate,
  ClubWithCourses,
} from '@/types/database.types';
import type { RegionFilter } from '@/types/database/enums';
import type { GolfApiSearchParams, GolfApiClubResponse } from '@/services/api/golfApiTypes';
import type { TeeInsert } from './teesService';
import type { HoleCoordinateInsert } from './coordinatesService';

// =====================================================
// TYPES
// =====================================================

/**
 * Search parameters for clubs/courses
 */
export interface CourseSearchParams {
  query?: string;
  state?: RegionFilter;
  city?: string;
  /** Country for API search (e.g. 'United Kingdom', 'Australia') */
  country?: string;
  limit?: number;
  offset?: number;
  /** Whether to search external API in addition to cache */
  searchApi?: boolean;
}

/**
 * Search result for clubs
 */
export interface CourseSearchResult {
  /** Clubs from local cache */
  cached: Club[];
  /** Clubs from API (transformed, not yet cached) */
  apiResults: Partial<Club>[];
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

/**
 * Result of importing a course from API
 */
export interface ImportCourseResult {
  club: Club;
  course: Course;
  tees: Tee[];
  /** Whether club was newly created or updated */
  clubCreated: boolean;
  /** Whether course was newly created or updated */
  courseCreated: boolean;
  /** Whether full hole data was imported */
  hasHoleData: boolean;
  /** Whether tee data was imported */
  hasTeeData: boolean;
  /** Number of GPS coordinates imported */
  coordinatesImported: number;
}

/**
 * Result of importing a club with all its courses
 */
export interface ImportClubResult {
  club: Club;
  courses: Course[];
  tees: Tee[];
  created: boolean;
}

/**
 * Course with full details including club, tees, and coordinates
 */
export interface CourseWithDetails extends Course {
  club: Club;
  tees_list: Tee[];
  coordinates?: HoleCoordinate[];
}

// =====================================================
// SERVICE
// =====================================================

/**
 * Unified Course Service
 * Orchestrates club, course, tee, and coordinate management
 */
class CourseService {
  /**
   * Search clubs from cache and optionally API
   *
   * @param params - Search parameters
   * @returns Combined search results
   */
  async searchCourses(params: CourseSearchParams): Promise<CourseSearchResult> {
    const {
      query,
      state,
      city,
      country,
      limit = 20,
      offset = 0,
      searchApi = false,
    } = params;

    // Always search cache first (now searches clubs table)
    const cacheResult = await courseCacheService.searchCachedClubs({
      query,
      state,
      city,
      limit,
      offset,
    });

    const result: CourseSearchResult = {
      cached: cacheResult.clubs,
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
        country,
      };

      const apiResults = await golfApiClient.searchClubs(apiParams);

      result.apiSearched = true;

      // Transform API results to Club format
      // Search results have a subset of club fields - cast to satisfy transformer
      const apiClubs = apiResults.map((clubResponse) => transformApiClubResponse(clubResponse as unknown as GolfApiClubResponse));

      // Filter out clubs already in cache (by golfapi_club_id)
      const cachedGolfApiIds = new Set(
        cacheResult.clubs.filter((c) => c.golfapi_club_id).map((c) => c.golfapi_club_id)
      );

      result.apiResults = apiClubs.filter(
        (c) => c.golfapi_club_id && !cachedGolfApiIds.has(c.golfapi_club_id)
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
   * Creates/updates club, course, and tees separately
   *
   * @param golfapiCourseId - The GolfAPI.io course identifier
   * @returns Imported course with club and tees
   */
  async importCourse(golfapiCourseId: string): Promise<ImportCourseResult> {
    // Check if course already cached
    const existingCourse = await courseCacheService.getCachedCourseByGolfApiId(golfapiCourseId);
    const courseCreated = !existingCourse;

    try {
      // Fetch course details from API (includes club info and tees)
      const courseResponse = await golfApiClient.getCourse(golfapiCourseId);

      // Transform API response
      const { course: courseData, tees: teesData, club: clubData } =
        transformApiCourseResponse(courseResponse);

      // Check if club already exists
      const existingClub = clubData.golfapi_club_id
        ? await courseCacheService.getCachedClubByGolfApiId(clubData.golfapi_club_id)
        : null;
      const clubCreated = !existingClub;

      // Cache club
      const club = await courseCacheService.cacheClub({
        name: clubData.name || 'Unknown Club',
        ...clubData,
      });

      // Cache course with club_id (apply multi-nine rename if applicable)
      const rawCourseName = courseData.name || 'Main Course';
      const course = await courseCacheService.cacheCourse({
        ...courseData,
        name: getDisplayCourseName(clubData.golfapi_club_id ?? null, golfapiCourseId, rawCourseName),
        club_id: club.id,
      });

      // Cache tees
      const tees = await teesService.cacheTees(
        course.id,
        teesData.map((t) => ({
          ...t,
          name: t.name || 'Default',
        })) as TeeInsert[]
      );

      // Import GPS coordinates (non-blocking - don't fail if coordinates unavailable)
      let coordinatesImported = 0;
      try {
        coordinatesImported = await this.importCoordinates(golfapiCourseId, course.id);
        if (coordinatesImported > 0) {
        }
      } catch (coordError) {
        console.warn('[CourseService] Failed to import coordinates (non-blocking):', coordError);
      }

      return {
        club,
        course,
        tees,
        clubCreated,
        courseCreated,
        hasHoleData: hasHoleData(courseData),
        hasTeeData: hasTeeData(teesData),
        coordinatesImported,
      };
    } catch (error) {
      // If API fails but we have cached data, return stale cache
      if (existingCourse) {
        console.warn('[CourseService] API fetch failed, returning cached data:', error);

        const club = await courseCacheService.getCachedClubById(existingCourse.club_id);
        const tees = await teesService.getTeesByCourse(existingCourse.id);

        if (!club) {
          throw new Error('Club not found for cached course');
        }

        return {
          club,
          course: existingCourse,
          tees,
          clubCreated: false,
          courseCreated: false,
          hasHoleData: hasHoleData(existingCourse),
          hasTeeData: tees.length > 0,
          coordinatesImported: 0,
        };
      }

      throw error;
    }
  }

  /**
   * Import a club with all its courses from API
   *
   * @param golfapiClubId - The GolfAPI.io club identifier
   * @returns Imported club with all courses and tees
   */
  async importClubWithCourses(golfapiClubId: string): Promise<ImportClubResult> {
    // Check if club already exists
    const existingClub = await courseCacheService.getCachedClubByGolfApiId(golfapiClubId);
    const created = !existingClub;

    try {
      // Fetch club from API (includes nested courses summary)
      const clubResponse = await golfApiClient.getClub(golfapiClubId);

      // Transform and cache club
      const clubData = transformApiClubResponse(clubResponse);

      // Fix total_holes for multi-nine clubs (e.g., 27 instead of 162)
      const multiNineHoles = getMultiNineTotalHoles(clubResponse.courses ?? []);
      if (multiNineHoles) {
        clubData.total_holes = multiNineHoles;
      }

      const club = await courseCacheService.cacheClub({
        name: clubData.name || 'Unknown Club',
        ...clubData,
      });

      const courses: Course[] = [];
      const allTees: Tee[] = [];

      // Filter multi-nine clubs to valid playable combinations only
      const allCourses = clubResponse.courses ?? [];
      const coursesToImport = filterMultiNineCourses(allCourses, golfapiClubId);

      // Import each course from the club
      if (coursesToImport.length > 0) {
        for (const courseSummary of coursesToImport) {
          try {
            // Fetch full course details
            const courseResponse = await golfApiClient.getCourse(courseSummary.courseID);

            // Transform course and tees
            const { course: courseData, tees: teesData } =
              transformApiCourseResponse(courseResponse);

            // Cache course (apply multi-nine rename if applicable)
            const rawName = courseData.name || courseSummary.courseName || 'Main Course';
            const course = await courseCacheService.cacheCourse({
              ...courseData,
              name: getDisplayCourseName(golfapiClubId, courseSummary.courseID, rawName),
              club_id: club.id,
            });

            courses.push(course);

            // Cache tees for this course
            const tees = await teesService.cacheTees(
              course.id,
              teesData.map((t) => ({
                ...t,
                name: t.name || 'Default',
              })) as TeeInsert[]
            );

            allTees.push(...tees);

            // Import GPS coordinates (non-blocking)
            try {
              const coordCount = await this.importCoordinates(courseSummary.courseID, course.id);
              // coordCount used for debugging only
            } catch (coordError) {
              console.warn('[CourseService] Failed to import coordinates for', course.name, coordError);
            }
          } catch (courseError) {
            console.warn(
              '[CourseService] Failed to import course:',
              courseSummary.courseName,
              courseError
            );
            // Continue with other courses
          }
        }
      }

      return {
        club,
        courses,
        tees: allTees,
        created,
      };
    } catch (error) {
      // If API fails but we have cached data, return stale cache
      if (existingClub) {
        console.warn('[CourseService] API fetch failed, returning cached data:', error);

        const courses = await courseCacheService.getCoursesByClub(existingClub.id);
        const allTees: Tee[] = [];

        for (const course of courses) {
          const tees = await teesService.getTeesByCourse(course.id);
          allTees.push(...tees);
        }

        return {
          club: existingClub,
          courses,
          tees: allTees,
          created: false,
        };
      }

      throw error;
    }
  }

  /**
   * Import a club from search result (basic info only)
   * Use when full course details aren't available yet
   *
   * @param partialClub - Partial club data from search
   * @returns Cached club
   */
  async importBasicClub(partialClub: Partial<Club>): Promise<Club> {
    return courseCacheService.cacheClub({
      name: partialClub.name || 'Unknown Club',
      ...partialClub,
    });
  }

  /**
   * Get course with full details including club, tees, and optionally coordinates
   *
   * @param courseId - Internal course ID
   * @param options - Fetch options
   * @returns Course with full details
   */
  async getCourseWithDetails(
    courseId: string,
    options: {
      forceRefresh?: boolean;
      includeCoordinates?: boolean;
    } = {}
  ): Promise<CourseWithDetails | null> {
    const { forceRefresh = false, includeCoordinates = false } = options;

    // Get cached course with club
    const courseWithClub = await courseCacheService.getCachedCourseWithClub(courseId);

    if (!courseWithClub) {
      return null;
    }

    // Get tees from separate table
    const tees = await teesService.getTeesByCourse(courseId);

    // Get coordinates if requested
    let coordinates: HoleCoordinate[] | undefined;
    if (includeCoordinates) {
      coordinates = await coordinatesService.getCoordinatesByCourse(courseId);
    }

    const result: CourseWithDetails = {
      ...courseWithClub,
      tees_list: tees,
      coordinates,
    };

    // Check if refresh needed
    const needsRefresh =
      forceRefresh ||
      (courseWithClub.club.source === 'api' &&
        (!courseWithClub.club.last_synced ||
          Date.now() - new Date(courseWithClub.club.last_synced).getTime() > CACHE_TTL_MS));

    if (!needsRefresh || !courseWithClub.golfapi_course_id) {
      return result;
    }

    // Try to refresh from API
    if (!golfApiClient.isAvailable()) {
      return result;
    }

    try {
      const importResult = await this.importCourse(courseWithClub.golfapi_course_id);

      // Optionally refresh coordinates
      if (includeCoordinates && courseWithClub.golfapi_course_id) {
        try {
          await this.importCoordinates(courseWithClub.golfapi_course_id, importResult.course.id);
          coordinates = await coordinatesService.getCoordinatesByCourse(courseId);
        } catch (coordError) {
          console.warn('[CourseService] Failed to refresh coordinates:', coordError);
        }
      }

      return {
        ...importResult.course,
        club: importResult.club,
        tees_list: importResult.tees,
        coordinates,
      };
    } catch (error) {
      console.warn('[CourseService] Failed to refresh course:', error);
      // Return stale cache on error
      return result;
    }
  }

  /**
   * Import coordinates for an existing course by its internal ID
   * Useful for backfilling coordinates for courses imported before coordinate support
   *
   * @param courseId - Internal course ID
   * @returns Number of coordinates imported, or -1 if course not found or no API ID
   */
  async importCoordinatesForExistingCourse(courseId: string): Promise<number> {
    // Get course to find its GolfAPI ID
    const course = await courseCacheService.getCachedCourse(courseId);

    if (!course) {
      console.warn('[CourseService] Course not found:', courseId);
      return -1;
    }

    if (!course.golfapi_course_id) {
      console.warn('[CourseService] Course has no GolfAPI ID:', course.name);
      return -1;
    }

    return this.importCoordinates(course.golfapi_course_id, courseId);
  }

  /**
   * Import coordinates for a course from API
   *
   * @param golfapiCourseId - The GolfAPI.io course identifier
   * @param courseId - Internal course ID
   * @returns Number of coordinates imported
   */
  async importCoordinates(golfapiCourseId: string, courseId: string): Promise<number> {
    try {
      const coordsResponse = await golfApiClient.getCoordinates(golfapiCourseId);

      if (!coordsResponse.coordinates || coordsResponse.coordinates.length === 0) {
        return 0;
      }

      // Transform and filter to essential coordinates
      const transformedCoords = transformApiCoordinates(coordsResponse);

      if (transformedCoords.length === 0) {
        return 0;
      }

      // Cache coordinates
      return coordinatesService.cacheCoordinates(courseId, transformedCoords as HoleCoordinateInsert[]);
    } catch (error) {
      console.warn('[CourseService] Failed to import coordinates:', error);
      return 0;
    }
  }

  /**
   * Refresh course data from API
   *
   * @param courseId - Internal course ID
   * @returns Updated course with details
   */
  async refreshCourseData(courseId: string): Promise<CourseWithDetails | null> {
    return this.getCourseWithDetails(courseId, { forceRefresh: true });
  }

  /**
   * Get club with all its courses
   *
   * @param clubId - Internal club ID
   * @returns Club with courses or null
   */
  async getClubWithCourses(clubId: string): Promise<ClubWithCourses | null> {
    return courseCacheService.getCachedClubWithCourses(clubId);
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
   * Refresh all stale clubs (background task)
   *
   * @param batchSize - Number of clubs to refresh per batch
   * @returns Number of clubs refreshed
   */
  async refreshStaleClubs(batchSize: number = 10): Promise<number> {
    if (!golfApiClient.isAvailable()) {
      return 0;
    }

    const staleClubs = await courseCacheService.getStaleClubs(batchSize);
    let refreshedCount = 0;

    for (const club of staleClubs) {
      if (!club.golfapi_club_id) {
        continue;
      }

      try {
        await this.importClubWithCourses(club.golfapi_club_id);
        refreshedCount++;
      } catch (error) {
        console.warn('[CourseService] Failed to refresh stale club:', club.name, error);
        // Continue with other clubs
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
