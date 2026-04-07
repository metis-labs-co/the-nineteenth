/**
 * Course Service Types
 *
 * Type definitions for the unified course service.
 */

import type {
  Club,
  Course,
  Tee,
  HoleCoordinate,
} from '@/types/database.types';
import type { RegionFilter } from '@/types/database/enums';

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
