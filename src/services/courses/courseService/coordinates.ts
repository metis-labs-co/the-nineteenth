/**
 * Course Service - Coordinate Import Operations
 *
 * Import and manage GPS coordinates from GolfAPI.io.
 */

import { golfApiClient } from '@/services/api/golfApiClient';
import { courseCacheService } from '../cacheService';
import { coordinatesService } from '../coordinatesService';
import { transformApiCoordinates } from '@/services/api/golfApiTransformers';
import { createModuleLogger } from '@/utils/debugLogger';
import type { HoleCoordinateInsert } from '../coordinatesService';

const logger = createModuleLogger('CourseService');

/**
 * Import coordinates for a course from API
 *
 * @param golfapiCourseId - The GolfAPI.io course identifier
 * @param courseId - Internal course ID
 * @returns Number of coordinates imported
 */
export async function importCoordinates(golfapiCourseId: string, courseId: string): Promise<number> {
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
    logger.warn('Failed to import coordinates', { error: error instanceof Error ? error.message : String(error) });
    return 0;
  }
}

/**
 * Import coordinates for an existing course by its internal ID
 * Useful for backfilling coordinates for courses imported before coordinate support
 *
 * @param courseId - Internal course ID
 * @returns Number of coordinates imported, or -1 if course not found or no API ID
 */
export async function importCoordinatesForExistingCourse(courseId: string): Promise<number> {
  // Get course to find its GolfAPI ID
  const course = await courseCacheService.getCachedCourse(courseId);

  if (!course) {
    logger.warn('Course not found', { courseId });
    return -1;
  }

  if (!course.golfapi_course_id) {
    logger.warn('Course has no GolfAPI ID', { name: course.name });
    return -1;
  }

  return importCoordinates(course.golfapi_course_id, courseId);
}
