/**
 * Course Cache Service
 *
 * @deprecated This file re-exports from the new modular cache service.
 * Import directly from '@/services/courses/cache' for new code.
 *
 * @example
 * ```tsx
 * // Preferred: Import from new module
 * import { clubCacheService, courseCacheService, cacheService } from '@/services/courses/cache';
 *
 * // Legacy: Still works for backward compatibility
 * import { courseCacheService } from '@/services/courses/cacheService';
 * ```
 */

// Re-export types and constants from the new cache module
export {
  // Constants
  CACHE_TTL_DAYS,
  CACHE_TTL_MS,
  // Types
  type CacheSearchParams,
  type CacheSearchResult,
  type ClubInsert,
  type CourseInsert,
  type CacheStats,
} from './cache';

// Re-export the unified cacheService as courseCacheService for backward compatibility
// The original courseCacheService had both club and course methods
export { cacheService as courseCacheService } from './cache';

// Also export the class for testing (maps to the original CourseCacheService)
// Note: The original class had all methods, but we've split it into focused services
// For backward compatibility with tests that import the class, we export a type alias
export type { ClubCacheService as CourseCacheService } from './cache';
