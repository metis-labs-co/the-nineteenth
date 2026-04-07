/**
 * Course Service - Sync/Refresh Operations
 *
 * Background refresh of stale course data from GolfAPI.io.
 */

import { golfApiClient } from '@/services/api/golfApiClient';
import { courseCacheService } from '../cacheService';
import { createModuleLogger } from '@/utils/debugLogger';
import type { CourseWithDetails } from './types';
import { getCourseWithDetails } from './lookup';
import { importClubWithCourses } from './import';

const logger = createModuleLogger('CourseService');

/**
 * Refresh course data from API
 *
 * @param courseId - Internal course ID
 * @returns Updated course with details
 */
export async function refreshCourseData(courseId: string): Promise<CourseWithDetails | null> {
  return getCourseWithDetails(courseId, { forceRefresh: true });
}

/**
 * Refresh all stale clubs (background task)
 *
 * @param batchSize - Number of clubs to refresh per batch
 * @returns Number of clubs refreshed
 */
export async function refreshStaleClubs(batchSize: number = 10): Promise<number> {
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
      await importClubWithCourses(club.golfapi_club_id);
      refreshedCount++;
    } catch (error) {
      logger.warn('Failed to refresh stale club', { name: club.name, error: error instanceof Error ? error.message : String(error) });
      // Continue with other clubs
    }
  }

  return refreshedCount;
}
