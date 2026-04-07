/**
 * Course Service - Lookup Operations
 *
 * Get course details, club data, and cache statistics.
 */

import { golfApiClient } from '@/services/api/golfApiClient';
import { courseCacheService, CACHE_TTL_MS } from '../cacheService';
import { teesService } from '../teesService';
import { coordinatesService } from '../coordinatesService';
import type { HoleCoordinate, ClubWithCourses } from '@/types/database.types';
import { createModuleLogger } from '@/utils/debugLogger';
import type { CourseWithDetails } from './types';
import { importCourse } from './import';
import { importCoordinates } from './coordinates';

const logger = createModuleLogger('CourseService');

/**
 * Get course with full details including club, tees, and optionally coordinates
 *
 * @param courseId - Internal course ID
 * @param options - Fetch options
 * @returns Course with full details
 */
export async function getCourseWithDetails(
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
    const importResult = await importCourse(courseWithClub.golfapi_course_id);

    // Optionally refresh coordinates
    if (includeCoordinates && courseWithClub.golfapi_course_id) {
      try {
        await importCoordinates(courseWithClub.golfapi_course_id, importResult.course.id);
        coordinates = await coordinatesService.getCoordinatesByCourse(courseId);
      } catch (coordError) {
        logger.warn('Failed to refresh coordinates', { error: coordError instanceof Error ? coordError.message : String(coordError) });
      }
    }

    return {
      ...importResult.course,
      club: importResult.club,
      tees_list: importResult.tees,
      coordinates,
    };
  } catch (error) {
    logger.warn('Failed to refresh course', { error: error instanceof Error ? error.message : String(error) });
    // Return stale cache on error
    return result;
  }
}

/**
 * Get club with all its courses
 *
 * @param clubId - Internal club ID
 * @returns Club with courses or null
 */
export async function getClubWithCourses(clubId: string): Promise<ClubWithCourses | null> {
  return courseCacheService.getCachedClubWithCourses(clubId);
}

/**
 * Check if API is available
 */
export function isApiAvailable(): boolean {
  return golfApiClient.isAvailable();
}

/**
 * Get cache statistics
 */
export async function getCacheStats() {
  return courseCacheService.getCacheStats();
}
