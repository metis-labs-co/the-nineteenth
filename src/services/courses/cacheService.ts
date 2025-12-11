/**
 * Course Cache Service
 *
 * Manages PostgreSQL caching of course data from GolfAPI.io.
 * Features:
 * - 30-day TTL for cached courses
 * - Upsert support (update existing or insert new)
 * - Search cached courses by name/state
 * - Stale data detection
 */

import { supabase } from '@/services/supabase/client';
import type { Course, LegacyCourse, AustralianState } from '@/types/database.types';

// =====================================================
// CONSTANTS
// =====================================================

/**
 * Cache TTL in days
 */
export const CACHE_TTL_DAYS = 30;

/**
 * Cache TTL in milliseconds
 */
export const CACHE_TTL_MS = CACHE_TTL_DAYS * 24 * 60 * 60 * 1000;

// =====================================================
// TYPES
// =====================================================

export interface CacheSearchParams {
  query?: string;
  state?: AustralianState;
  limit?: number;
  offset?: number;
}

export interface CacheSearchResult {
  courses: LegacyCourse[];
  total: number;
  hasMore: boolean;
}

// =====================================================
// CACHE SERVICE
// =====================================================

/**
 * Course Cache Service
 */
class CourseCacheService {
  /**
   * Check if a cached course is still fresh (within TTL)
   *
   * @param apiId - The external API identifier
   * @returns True if cache is fresh, false if stale or not found
   */
  async isCacheFresh(apiId: string): Promise<boolean> {
    try {
      const { data, error } = await supabase
        .from('courses')
        .select('last_synced')
        .eq('api_id', apiId)
        .single();

      if (error || !data) {
        return false;
      }

      const courseData = data as { last_synced: string | null };
      if (!courseData.last_synced) {
        return false;
      }

      const lastSynced = new Date(courseData.last_synced).getTime();
      const now = Date.now();

      return now - lastSynced < CACHE_TTL_MS;
    } catch {
      return false;
    }
  }

  /**
   * Get cached course by API ID
   *
   * @param apiId - The external API identifier
   * @returns Cached course or null if not found
   */
  async getCachedCourseByApiId(apiId: string): Promise<LegacyCourse | null> {
    try {
      const { data, error } = await supabase
        .from('courses')
        .select('*')
        .eq('api_id', apiId)
        .single();

      if (error || !data) {
        return null;
      }

      return data as LegacyCourse;
    } catch {
      return null;
    }
  }

  /**
   * Get cached course by internal ID
   *
   * @param id - The internal course ID
   * @returns Cached course or null if not found
   */
  async getCachedCourse(id: string): Promise<LegacyCourse | null> {
    try {
      const { data, error } = await supabase
        .from('courses')
        .select('*')
        .eq('id', id)
        .single();

      if (error || !data) {
        return null;
      }

      return data as LegacyCourse;
    } catch {
      return null;
    }
  }

  /**
   * Cache a course (insert or update)
   *
   * @param courseData - Partial course data to cache
   * @returns The cached course with generated ID
   */
  async cacheCourse(courseData: Partial<LegacyCourse>): Promise<LegacyCourse> {
    // Check if course already exists by api_id
    const existingCourse = courseData.api_id
      ? await this.getCachedCourseByApiId(courseData.api_id)
      : null;

    if (existingCourse) {
      // Update existing course
      const { data, error } = await (supabase as any)
        .from('courses')
        .update({
          ...courseData,
          last_synced: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .eq('id', existingCourse.id)
        .select()
        .single();

      if (error) {
        throw new Error(`Failed to update cached course: ${error.message}`);
      }

      return data as LegacyCourse;
    } else {
      // Insert new course
      const { data, error } = await supabase
        .from('courses')
        .insert({
          ...courseData,
          source: 'api',
          last_synced: new Date().toISOString(),
        } as any)
        .select()
        .single();

      if (error) {
        throw new Error(`Failed to cache course: ${error.message}`);
      }

      return data as LegacyCourse;
    }
  }

  /**
   * Bulk cache courses
   *
   * @param courses - Array of partial course data
   * @returns Array of cached courses
   */
  async cacheCourses(courses: Partial<LegacyCourse>[]): Promise<LegacyCourse[]> {
    const results: LegacyCourse[] = [];

    for (const course of courses) {
      try {
        const cached = await this.cacheCourse(course);
        results.push(cached);
      } catch (error) {
        console.warn('[CacheService] Failed to cache course:', course.name, error);
        // Continue with other courses
      }
    }

    return results;
  }

  /**
   * Search cached courses by name and/or state
   *
   * @param params - Search parameters
   * @returns Search results with pagination info
   */
  async searchCachedCourses(params: CacheSearchParams): Promise<CacheSearchResult> {
    const { query, state, limit = 20, offset = 0 } = params;

    try {
      let queryBuilder = supabase.from('courses').select('*', { count: 'exact' });

      // Apply search filter (case-insensitive)
      if (query && query.length >= 2) {
        queryBuilder = queryBuilder.ilike('name', `%${query}%`);
      }

      // Apply state filter
      if (state) {
        queryBuilder = queryBuilder.eq('state', state);
      }

      // Apply pagination
      queryBuilder = queryBuilder
        .order('name', { ascending: true })
        .range(offset, offset + limit - 1);

      const { data, error, count } = await queryBuilder;

      if (error) {
        throw new Error(`Failed to search cached courses: ${error.message}`);
      }

      const courses = (data as LegacyCourse[]) || [];
      const total = count || 0;

      return {
        courses,
        total,
        hasMore: offset + courses.length < total,
      };
    } catch (error) {
      console.error('[CacheService] Search error:', error);
      return {
        courses: [],
        total: 0,
        hasMore: false,
      };
    }
  }

  /**
   * Get all API-sourced courses
   *
   * @returns All courses from API source
   */
  async getApiCourses(): Promise<LegacyCourse[]> {
    try {
      const { data, error } = await supabase
        .from('courses')
        .select('*')
        .eq('source', 'api')
        .order('name', { ascending: true });

      if (error) {
        throw new Error(`Failed to get API courses: ${error.message}`);
      }

      return (data as LegacyCourse[]) || [];
    } catch (error) {
      console.error('[CacheService] Get API courses error:', error);
      return [];
    }
  }

  /**
   * Get stale courses (past TTL)
   *
   * @param limit - Maximum number of stale courses to return
   * @returns Array of stale courses
   */
  async getStaleCourses(limit: number = 50): Promise<LegacyCourse[]> {
    try {
      const cutoffDate = new Date(Date.now() - CACHE_TTL_MS).toISOString();

      const { data, error } = await supabase
        .from('courses')
        .select('*')
        .eq('source', 'api')
        .lt('last_synced', cutoffDate)
        .limit(limit)
        .order('last_synced', { ascending: true });

      if (error) {
        throw new Error(`Failed to get stale courses: ${error.message}`);
      }

      return (data as LegacyCourse[]) || [];
    } catch (error) {
      console.error('[CacheService] Get stale courses error:', error);
      return [];
    }
  }

  /**
   * Delete a cached course
   *
   * @param id - Course ID to delete
   */
  async deleteCachedCourse(id: string): Promise<void> {
    const { error } = await supabase.from('courses').delete().eq('id', id);

    if (error) {
      throw new Error(`Failed to delete cached course: ${error.message}`);
    }
  }

  /**
   * Get cache statistics
   */
  async getCacheStats(): Promise<{
    totalCourses: number;
    apiCourses: number;
    manualCourses: number;
    staleCourses: number;
    freshCourses: number;
  }> {
    try {
      const cutoffDate = new Date(Date.now() - CACHE_TTL_MS).toISOString();

      // Get counts in parallel
      const [
        { count: totalCourses },
        { count: apiCourses },
        { count: manualCourses },
        { count: staleCourses },
      ] = await Promise.all([
        supabase.from('courses').select('*', { count: 'exact', head: true }),
        supabase.from('courses').select('*', { count: 'exact', head: true }).eq('source', 'api'),
        supabase.from('courses').select('*', { count: 'exact', head: true }).eq('source', 'manual'),
        supabase
          .from('courses')
          .select('*', { count: 'exact', head: true })
          .eq('source', 'api')
          .lt('last_synced', cutoffDate),
      ]);

      const apiCount = apiCourses || 0;
      const staleCount = staleCourses || 0;

      return {
        totalCourses: totalCourses || 0,
        apiCourses: apiCount,
        manualCourses: manualCourses || 0,
        staleCourses: staleCount,
        freshCourses: apiCount - staleCount,
      };
    } catch (error) {
      console.error('[CacheService] Get cache stats error:', error);
      return {
        totalCourses: 0,
        apiCourses: 0,
        manualCourses: 0,
        staleCourses: 0,
        freshCourses: 0,
      };
    }
  }
}

// =====================================================
// SINGLETON EXPORT
// =====================================================

/**
 * Singleton cache service instance
 */
export const courseCacheService = new CourseCacheService();

/**
 * Export class for testing
 */
export { CourseCacheService };
