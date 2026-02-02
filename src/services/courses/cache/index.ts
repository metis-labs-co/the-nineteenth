/**
 * Cache Service Module Index
 *
 * Provides club and course caching functionality for GolfAPI.io data.
 *
 * This module is organized into:
 * - types.ts: Shared types and constants
 * - clubCacheService.ts: Club caching operations
 * - courseCacheService.ts: Course caching operations
 *
 * @example
 * ```tsx
 * // Import services
 * import { clubCacheService, courseCacheService } from '@/services/courses/cache';
 *
 * // Or import unified service
 * import { cacheService } from '@/services/courses/cache';
 * ```
 */

import { supabase } from '@/services/supabase/client';
import { clubCacheService, ClubCacheService } from './clubCacheService';
import { courseCacheService, CourseCacheService } from './courseCacheService';
import { CACHE_TTL_MS, type CacheStats } from './types';

// Re-export types
export type {
  CacheSearchParams,
  CacheSearchResult,
  ClubInsert,
  CourseInsert,
  CacheStats,
} from './types';

export { CACHE_TTL_DAYS, CACHE_TTL_MS } from './types';

// Re-export services
export { clubCacheService, ClubCacheService } from './clubCacheService';
export { courseCacheService, CourseCacheService } from './courseCacheService';

// =====================================================
// UNIFIED CACHE SERVICE
// =====================================================

/**
 * Unified Cache Service
 *
 * Provides a single interface to both club and course caching.
 * Useful for backward compatibility and convenience.
 */
class UnifiedCacheService {
  // Club methods (delegate to clubCacheService)
  cacheClub = clubCacheService.cacheClub.bind(clubCacheService);
  getCachedClubByGolfApiId = clubCacheService.getCachedClubByGolfApiId.bind(clubCacheService);
  getCachedClubById = clubCacheService.getCachedClubById.bind(clubCacheService);
  getCachedClubWithCourses = clubCacheService.getCachedClubWithCourses.bind(clubCacheService);
  searchCachedClubs = clubCacheService.searchCachedClubs.bind(clubCacheService);
  isClubCacheFresh = clubCacheService.isClubCacheFresh.bind(clubCacheService);
  getApiClubs = clubCacheService.getApiClubs.bind(clubCacheService);
  getStaleClubs = clubCacheService.getStaleClubs.bind(clubCacheService);
  deleteCachedClub = clubCacheService.deleteCachedClub.bind(clubCacheService);

  // Course methods (delegate to courseCacheService)
  cacheCourse = courseCacheService.cacheCourse.bind(courseCacheService);
  getCachedCourseByGolfApiId = courseCacheService.getCachedCourseByGolfApiId.bind(courseCacheService);
  getCachedCourse = courseCacheService.getCachedCourse.bind(courseCacheService);
  getCachedCourseWithClub = courseCacheService.getCachedCourseWithClub.bind(courseCacheService);
  getCoursesByClub = courseCacheService.getCoursesByClub.bind(courseCacheService);
  isCourseCacheFresh = courseCacheService.isCourseCacheFresh.bind(courseCacheService);
  deleteCachedCourse = courseCacheService.deleteCachedCourse.bind(courseCacheService);
  cacheCourses = courseCacheService.cacheCourses.bind(courseCacheService);

  /**
   * Get cache statistics
   */
  async getCacheStats(): Promise<CacheStats> {
    try {
      const cutoffDate = new Date(Date.now() - CACHE_TTL_MS).toISOString();

      // Get counts in parallel
      const [
        { count: totalClubs },
        { count: apiClubs },
        { count: manualClubs },
        { count: staleClubs },
        { count: totalCourses },
      ] = await Promise.all([
        supabase.from('clubs').select('*', { count: 'exact', head: true }),
        supabase.from('clubs').select('*', { count: 'exact', head: true }).eq('source', 'api'),
        supabase.from('clubs').select('*', { count: 'exact', head: true }).eq('source', 'manual'),
        supabase
          .from('clubs')
          .select('*', { count: 'exact', head: true })
          .eq('source', 'api')
          .lt('last_synced', cutoffDate),
        supabase.from('courses').select('*', { count: 'exact', head: true }),
      ]);

      const apiCount = apiClubs || 0;
      const staleCount = staleClubs || 0;

      return {
        totalClubs: totalClubs || 0,
        apiClubs: apiCount,
        manualClubs: manualClubs || 0,
        staleClubs: staleCount,
        freshClubs: apiCount - staleCount,
        totalCourses: totalCourses || 0,
      };
    } catch (error) {
      console.error('[CacheService] Get cache stats error:', error);
      return {
        totalClubs: 0,
        apiClubs: 0,
        manualClubs: 0,
        staleClubs: 0,
        freshClubs: 0,
        totalCourses: 0,
      };
    }
  }
}

/**
 * Unified cache service instance (backward compatible)
 */
export const cacheService = new UnifiedCacheService();

/**
 * Legacy export name for backward compatibility
 */
export const courseCacheServiceLegacy = cacheService;
