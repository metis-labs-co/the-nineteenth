/**
 * Course Cache Service
 *
 * Manages PostgreSQL caching of club and course data from GolfAPI.io.
 *
 * Features:
 * - 30-day TTL for cached data
 * - Club and course upsert support
 * - Search cached clubs by name/state/city
 * - Stale data detection
 *
 * Updated January 2026 for GolfAPI.io integration:
 * - Renamed venue → club throughout
 * - Added club caching methods
 * - Course caching now uses club_id (not venue_id)
 * - Tees caching delegated to teesService (not stored in course JSONB)
 */

import { supabase } from '@/services/supabase/client';
import type { Club, Course, CourseWithClub, ClubWithCourses } from '@/types/database.types';
import type { AustralianState } from '@/types/database/enums';
import type { Database } from '@/types/supabase';

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

/**
 * Supabase database types
 */
type ClubsTable = Database['public']['Tables']['clubs'];
type ClubRow = ClubsTable['Row'];
type ClubInsertDb = ClubsTable['Insert'];
type ClubUpdateDb = ClubsTable['Update'];

type CoursesTable = Database['public']['Tables']['courses'];
type CourseRow = CoursesTable['Row'];
type CourseInsertDb = CoursesTable['Insert'];
type CourseUpdateDb = CoursesTable['Update'];

/**
 * Search parameters for clubs
 */
export interface CacheSearchParams {
  query?: string;
  state?: AustralianState;
  city?: string;
  limit?: number;
  offset?: number;
}

/**
 * Search result for clubs
 */
export interface CacheSearchResult {
  clubs: Club[];
  total: number;
  hasMore: boolean;
}

/**
 * Partial club data for caching
 */
export type ClubInsert = Omit<Partial<Club>, 'id' | 'created_at' | 'updated_at'> & {
  name: string;
};

/**
 * Partial course data for caching
 */
export type CourseInsert = Omit<Partial<Course>, 'id' | 'created_at' | 'updated_at'> & {
  club_id: string;
  name: string;
};

// =====================================================
// CACHE SERVICE
// =====================================================

/**
 * Course Cache Service
 * Manages PostgreSQL caching of club and course data
 */
class CourseCacheService {
  // =====================================================
  // CLUB METHODS
  // =====================================================

  /**
   * Cache a club (insert or update)
   * Matches by golfapi_club_id if provided, otherwise inserts new
   *
   * @param clubData - Partial club data to cache
   * @returns The cached club with generated ID
   */
  async cacheClub(clubData: ClubInsert): Promise<Club> {
    try {
      // Check if club already exists by golfapi_club_id
      const existingClub = clubData.golfapi_club_id
        ? await this.getCachedClubByGolfApiId(clubData.golfapi_club_id)
        : null;

      const now = new Date().toISOString();

      if (existingClub) {
        // Update existing club
        const updateData: ClubUpdateDb = {
          name: clubData.name,
          golfapi_club_id: clubData.golfapi_club_id,
          address: clubData.address,
          city: clubData.city,
          postal_code: clubData.postal_code,
          state: clubData.state,
          country: clubData.country || 'Australia',
          continent: clubData.continent,
          latitude: clubData.latitude,
          longitude: clubData.longitude,
          phone: clubData.phone,
          email: clubData.email,
          website: clubData.website,
          total_holes: clubData.total_holes,
          source: clubData.source || 'api',
          last_synced: now,
          updated_at: now,
        };

        const { data, error } = await supabase
          .from('clubs')
          .update(updateData as unknown as never)
          .eq('id', existingClub.id)
          .select()
          .single();

        if (error) {
          throw new Error(`Failed to update cached club: ${error.message}`);
        }

        return data as Club;
      } else {
        // Insert new club
        const insertData: ClubInsertDb = {
          name: clubData.name,
          golfapi_club_id: clubData.golfapi_club_id,
          address: clubData.address,
          city: clubData.city,
          postal_code: clubData.postal_code,
          state: clubData.state,
          country: clubData.country || 'Australia',
          continent: clubData.continent,
          latitude: clubData.latitude,
          longitude: clubData.longitude,
          phone: clubData.phone,
          email: clubData.email,
          website: clubData.website,
          total_holes: clubData.total_holes,
          source: clubData.source || 'api',
          last_synced: now,
        };

        const { data, error } = await supabase
          .from('clubs')
          .insert(insertData as unknown as never)
          .select()
          .single();

        if (error) {
          throw new Error(`Failed to cache club: ${error.message}`);
        }

        return data as Club;
      }
    } catch (error) {
      console.error('[CacheService] Error caching club:', error);
      throw error;
    }
  }

  /**
   * Get cached club by GolfAPI.io club ID
   *
   * @param golfapiClubId - The GolfAPI.io ClubID
   * @returns Cached club or null if not found
   */
  async getCachedClubByGolfApiId(golfapiClubId: string): Promise<Club | null> {
    try {
      const { data, error } = await supabase
        .from('clubs')
        .select('*')
        .eq('golfapi_club_id', golfapiClubId)
        .single();

      if (error) {
        if (error.code !== 'PGRST116') {
          // Not just "not found"
          console.error('[CacheService] Error fetching club by GolfAPI ID:', error.message);
        }
        return null;
      }

      return data as Club;
    } catch (error) {
      console.error('[CacheService] Exception fetching club by GolfAPI ID:', error);
      return null;
    }
  }

  /**
   * Get cached club by internal ID
   *
   * @param id - The internal club ID
   * @returns Cached club or null if not found
   */
  async getCachedClubById(id: string): Promise<Club | null> {
    try {
      const { data, error } = await supabase
        .from('clubs')
        .select('*')
        .eq('id', id)
        .single();

      if (error) {
        if (error.code !== 'PGRST116') {
          console.error('[CacheService] Error fetching club by ID:', error.message);
        }
        return null;
      }

      return data as Club;
    } catch (error) {
      console.error('[CacheService] Exception fetching club by ID:', error);
      return null;
    }
  }

  /**
   * Get cached club with its courses
   *
   * @param id - The internal club ID
   * @returns Club with courses or null if not found
   */
  async getCachedClubWithCourses(id: string): Promise<ClubWithCourses | null> {
    try {
      const { data, error } = await supabase
        .from('clubs')
        .select(
          `
          *,
          courses (*)
        `
        )
        .eq('id', id)
        .single();

      if (error) {
        if (error.code !== 'PGRST116') {
          console.error('[CacheService] Error fetching club with courses:', error.message);
        }
        return null;
      }

      return data as ClubWithCourses;
    } catch (error) {
      console.error('[CacheService] Exception fetching club with courses:', error);
      return null;
    }
  }

  /**
   * Search cached clubs by name, state, and/or city
   *
   * @param params - Search parameters
   * @returns Search results with pagination info
   */
  async searchCachedClubs(params: CacheSearchParams): Promise<CacheSearchResult> {
    const { query, state, city, limit = 20, offset = 0 } = params;

    try {
      let queryBuilder = supabase.from('clubs').select('*', { count: 'exact' });

      // Apply search filter (case-insensitive)
      if (query && query.length >= 2) {
        queryBuilder = queryBuilder.ilike('name', `%${query}%`);
      }

      // Apply state filter
      if (state) {
        queryBuilder = queryBuilder.eq('state', state);
      }

      // Apply city filter
      if (city) {
        queryBuilder = queryBuilder.ilike('city', `%${city}%`);
      }

      // Apply pagination
      queryBuilder = queryBuilder
        .order('name', { ascending: true })
        .range(offset, offset + limit - 1);

      const { data, error, count } = await queryBuilder;

      if (error) {
        throw new Error(`Failed to search cached clubs: ${error.message}`);
      }

      const clubs = (data as Club[]) || [];
      const total = count || 0;

      return {
        clubs,
        total,
        hasMore: offset + clubs.length < total,
      };
    } catch (error) {
      console.error('[CacheService] Search clubs error:', error);
      return {
        clubs: [],
        total: 0,
        hasMore: false,
      };
    }
  }

  /**
   * Check if a cached club is still fresh (within TTL)
   *
   * @param golfapiClubId - The GolfAPI.io ClubID
   * @returns True if cache is fresh, false if stale or not found
   */
  async isClubCacheFresh(golfapiClubId: string): Promise<boolean> {
    try {
      const { data, error } = await supabase
        .from('clubs')
        .select('last_synced')
        .eq('golfapi_club_id', golfapiClubId)
        .single();

      if (error || !data) {
        return false;
      }

      const clubData = data as { last_synced: string | null };
      if (!clubData.last_synced) {
        return false;
      }

      const lastSynced = new Date(clubData.last_synced).getTime();
      const now = Date.now();

      return now - lastSynced < CACHE_TTL_MS;
    } catch {
      return false;
    }
  }

  /**
   * Get all API-sourced clubs
   *
   * @returns All clubs from API source
   */
  async getApiClubs(): Promise<Club[]> {
    try {
      const { data, error } = await supabase
        .from('clubs')
        .select('*')
        .eq('source', 'api')
        .order('name', { ascending: true });

      if (error) {
        throw new Error(`Failed to get API clubs: ${error.message}`);
      }

      return (data as Club[]) || [];
    } catch (error) {
      console.error('[CacheService] Get API clubs error:', error);
      return [];
    }
  }

  /**
   * Get stale clubs (past TTL)
   *
   * @param limit - Maximum number of stale clubs to return
   * @returns Array of stale clubs
   */
  async getStaleClubs(limit: number = 50): Promise<Club[]> {
    try {
      const cutoffDate = new Date(Date.now() - CACHE_TTL_MS).toISOString();

      const { data, error } = await supabase
        .from('clubs')
        .select('*')
        .eq('source', 'api')
        .lt('last_synced', cutoffDate)
        .limit(limit)
        .order('last_synced', { ascending: true });

      if (error) {
        throw new Error(`Failed to get stale clubs: ${error.message}`);
      }

      return (data as Club[]) || [];
    } catch (error) {
      console.error('[CacheService] Get stale clubs error:', error);
      return [];
    }
  }

  /**
   * Delete a cached club (and its courses via cascade)
   *
   * @param id - Club ID to delete
   */
  async deleteCachedClub(id: string): Promise<void> {
    const { error } = await supabase.from('clubs').delete().eq('id', id);

    if (error) {
      throw new Error(`Failed to delete cached club: ${error.message}`);
    }
  }

  // =====================================================
  // COURSE METHODS
  // =====================================================

  /**
   * Cache a course (insert or update)
   * Matches by golfapi_course_id if provided, otherwise inserts new
   *
   * Note: Does NOT cache tees - use teesService.cacheTees() separately
   *
   * @param courseData - Partial course data to cache
   * @returns The cached course with generated ID
   */
  async cacheCourse(courseData: CourseInsert): Promise<Course> {
    try {
      // Check if course already exists by golfapi_course_id
      const existingCourse = courseData.golfapi_course_id
        ? await this.getCachedCourseByGolfApiId(courseData.golfapi_course_id)
        : null;

      const now = new Date().toISOString();

      if (existingCourse) {
        // Update existing course
        const updateData: CourseUpdateDb = {
          name: courseData.name,
          club_id: courseData.club_id,
          golfapi_course_id: courseData.golfapi_course_id,
          golfapi_long_course_id: courseData.golfapi_long_course_id,
          description: courseData.description,
          num_holes: courseData.num_holes || 18,
          measure_unit: courseData.measure_unit,
          holes: courseData.holes as unknown as never,
          holes_women: courseData.holes_women as unknown as never,
          match_play_indexes: courseData.match_play_indexes as unknown as never,
          slope_rating: courseData.slope_rating,
          course_rating: courseData.course_rating,
          golfapi_updated_at: courseData.golfapi_updated_at,
          updated_at: now,
        };

        const { data, error } = await supabase
          .from('courses')
          .update(updateData as unknown as never)
          .eq('id', existingCourse.id)
          .select()
          .single();

        if (error) {
          throw new Error(`Failed to update cached course: ${error.message}`);
        }

        // Update last_synced on parent club
        await this.updateClubLastSynced(courseData.club_id);

        return data as Course;
      } else {
        // Insert new course
        const insertData: CourseInsertDb = {
          name: courseData.name,
          club_id: courseData.club_id,
          golfapi_course_id: courseData.golfapi_course_id,
          golfapi_long_course_id: courseData.golfapi_long_course_id,
          description: courseData.description,
          num_holes: courseData.num_holes || 18,
          measure_unit: courseData.measure_unit,
          holes: courseData.holes as unknown as never,
          holes_women: courseData.holes_women as unknown as never,
          match_play_indexes: courseData.match_play_indexes as unknown as never,
          slope_rating: courseData.slope_rating,
          course_rating: courseData.course_rating,
          golfapi_updated_at: courseData.golfapi_updated_at,
        };

        const { data, error } = await supabase
          .from('courses')
          .insert(insertData as unknown as never)
          .select()
          .single();

        if (error) {
          throw new Error(`Failed to cache course: ${error.message}`);
        }

        // Update last_synced on parent club
        await this.updateClubLastSynced(courseData.club_id);

        return data as Course;
      }
    } catch (error) {
      console.error('[CacheService] Error caching course:', error);
      throw error;
    }
  }

  /**
   * Get cached course by GolfAPI.io course ID
   *
   * @param golfapiCourseId - The GolfAPI.io CourseID
   * @returns Cached course or null if not found
   */
  async getCachedCourseByGolfApiId(golfapiCourseId: string): Promise<Course | null> {
    try {
      const { data, error } = await supabase
        .from('courses')
        .select('*')
        .eq('golfapi_course_id', golfapiCourseId)
        .single();

      if (error) {
        if (error.code !== 'PGRST116') {
          console.error('[CacheService] Error fetching course by GolfAPI ID:', error.message);
        }
        return null;
      }

      return data as Course;
    } catch (error) {
      console.error('[CacheService] Exception fetching course by GolfAPI ID:', error);
      return null;
    }
  }

  /**
   * Get cached course by internal ID
   *
   * @param id - The internal course ID
   * @returns Cached course or null if not found
   */
  async getCachedCourse(id: string): Promise<Course | null> {
    try {
      const { data, error } = await supabase
        .from('courses')
        .select('*')
        .eq('id', id)
        .single();

      if (error) {
        if (error.code !== 'PGRST116') {
          console.error('[CacheService] Error fetching course by ID:', error.message);
        }
        return null;
      }

      return data as Course;
    } catch (error) {
      console.error('[CacheService] Exception fetching course by ID:', error);
      return null;
    }
  }

  /**
   * Get cached course with its parent club
   *
   * @param id - The internal course ID
   * @returns Course with club or null if not found
   */
  async getCachedCourseWithClub(id: string): Promise<CourseWithClub | null> {
    try {
      const { data, error } = await supabase
        .from('courses')
        .select(
          `
          *,
          club:clubs (*)
        `
        )
        .eq('id', id)
        .single();

      if (error) {
        if (error.code !== 'PGRST116') {
          console.error('[CacheService] Error fetching course with club:', error.message);
        }
        return null;
      }

      // Transform the nested club relation
      const courseData = data as CourseRow & { club: ClubRow };
      return {
        ...courseData,
        club: courseData.club as Club,
      } as CourseWithClub;
    } catch (error) {
      console.error('[CacheService] Exception fetching course with club:', error);
      return null;
    }
  }

  /**
   * Get courses by club ID
   *
   * @param clubId - The club ID
   * @returns Array of courses for the club
   */
  async getCoursesByClub(clubId: string): Promise<Course[]> {
    try {
      const { data, error } = await supabase
        .from('courses')
        .select('*')
        .eq('club_id', clubId)
        .order('name', { ascending: true });

      if (error) {
        console.error('[CacheService] Error fetching courses by club:', error.message);
        return [];
      }

      return (data as Course[]) || [];
    } catch (error) {
      console.error('[CacheService] Exception fetching courses by club:', error);
      return [];
    }
  }

  /**
   * Check if a cached course is still fresh (within TTL)
   * Uses parent club's last_synced timestamp
   *
   * @param golfapiCourseId - The GolfAPI.io CourseID
   * @returns True if cache is fresh, false if stale or not found
   */
  async isCourseCacheFresh(golfapiCourseId: string): Promise<boolean> {
    try {
      const { data, error } = await supabase
        .from('courses')
        .select(
          `
          golfapi_updated_at,
          club:clubs (last_synced)
        `
        )
        .eq('golfapi_course_id', golfapiCourseId)
        .single();

      if (error || !data) {
        return false;
      }

      const courseData = data as {
        golfapi_updated_at: string | null;
        club: { last_synced: string | null };
      };

      const lastSynced = courseData.club?.last_synced;
      if (!lastSynced) {
        return false;
      }

      const syncedTime = new Date(lastSynced).getTime();
      const now = Date.now();

      return now - syncedTime < CACHE_TTL_MS;
    } catch {
      return false;
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
   * Bulk cache courses for a club
   *
   * @param clubId - The club ID
   * @param courses - Array of partial course data
   * @returns Array of cached courses
   */
  async cacheCourses(clubId: string, courses: Omit<CourseInsert, 'club_id'>[]): Promise<Course[]> {
    const results: Course[] = [];

    for (const course of courses) {
      try {
        const cached = await this.cacheCourse({
          ...course,
          club_id: clubId,
        });
        results.push(cached);
      } catch (error) {
        console.warn('[CacheService] Failed to cache course:', course.name, error);
        // Continue with other courses
      }
    }

    return results;
  }

  // =====================================================
  // HELPER METHODS
  // =====================================================

  /**
   * Update last_synced timestamp on a club
   *
   * @param clubId - The club ID
   */
  private async updateClubLastSynced(clubId: string): Promise<void> {
    try {
      const { error } = await supabase
        .from('clubs')
        .update({ last_synced: new Date().toISOString() } as unknown as never)
        .eq('id', clubId);

      if (error) {
        console.warn('[CacheService] Failed to update club last_synced:', error.message);
      }
    } catch (error) {
      console.warn('[CacheService] Exception updating club last_synced:', error);
    }
  }

  /**
   * Get cache statistics
   */
  async getCacheStats(): Promise<{
    totalClubs: number;
    apiClubs: number;
    manualClubs: number;
    staleClubs: number;
    freshClubs: number;
    totalCourses: number;
  }> {
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
