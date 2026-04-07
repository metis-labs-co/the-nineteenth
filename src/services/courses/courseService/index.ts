/**
 * Course Service - Index Barrel
 *
 * Re-exports all course service modules and provides the same class-based
 * singleton API for backward compatibility.
 *
 * Modules:
 * - types: Type definitions
 * - search: Club/course search operations
 * - import: Import from GolfAPI.io to cache
 * - coordinates: GPS coordinate import
 * - lookup: Get course details, cache stats
 * - sync: Background refresh operations
 */

// Re-export types
export type {
  CourseSearchParams,
  CourseSearchResult,
  ImportCourseResult,
  ImportClubResult,
  CourseWithDetails,
} from './types';

// Re-export functions for direct use
export { searchCourses } from './search';
export { importCourse, importClubWithCourses, importBasicClub } from './import';
export { importCoordinates, importCoordinatesForExistingCourse } from './coordinates';
export { getCourseWithDetails, getClubWithCourses, isApiAvailable, getCacheStats } from './lookup';
export { refreshCourseData, refreshStaleClubs } from './sync';

// Import all functions for the class wrapper
import { searchCourses } from './search';
import { importCourse, importClubWithCourses, importBasicClub } from './import';
import { importCoordinates, importCoordinatesForExistingCourse } from './coordinates';
import { getCourseWithDetails, getClubWithCourses, isApiAvailable, getCacheStats } from './lookup';
import { refreshCourseData, refreshStaleClubs } from './sync';

import type { CourseSearchParams, CourseSearchResult, ImportCourseResult, ImportClubResult, CourseWithDetails } from './types';
import type { Club, ClubWithCourses } from '@/types/database.types';

// =====================================================
// CLASS WRAPPER (backward compatibility)
// =====================================================

/**
 * Unified Course Service
 * Orchestrates club, course, tee, and coordinate management
 *
 * This class delegates to the focused module functions.
 * New code can import functions directly from the submodules.
 */
class CourseService {
  async searchCourses(params: CourseSearchParams): Promise<CourseSearchResult> {
    return searchCourses(params);
  }

  async importCourse(golfapiCourseId: string): Promise<ImportCourseResult> {
    return importCourse(golfapiCourseId);
  }

  async importClubWithCourses(golfapiClubId: string): Promise<ImportClubResult> {
    return importClubWithCourses(golfapiClubId);
  }

  async importBasicClub(partialClub: Partial<Club>): Promise<Club> {
    return importBasicClub(partialClub);
  }

  async getCourseWithDetails(
    courseId: string,
    options: { forceRefresh?: boolean; includeCoordinates?: boolean } = {}
  ): Promise<CourseWithDetails | null> {
    return getCourseWithDetails(courseId, options);
  }

  async importCoordinatesForExistingCourse(courseId: string): Promise<number> {
    return importCoordinatesForExistingCourse(courseId);
  }

  async importCoordinates(golfapiCourseId: string, courseId: string): Promise<number> {
    return importCoordinates(golfapiCourseId, courseId);
  }

  async refreshCourseData(courseId: string): Promise<CourseWithDetails | null> {
    return refreshCourseData(courseId);
  }

  async getClubWithCourses(clubId: string): Promise<ClubWithCourses | null> {
    return getClubWithCourses(clubId);
  }

  isApiAvailable(): boolean {
    return isApiAvailable();
  }

  async getCacheStats() {
    return getCacheStats();
  }

  async refreshStaleClubs(batchSize: number = 10): Promise<number> {
    return refreshStaleClubs(batchSize);
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
