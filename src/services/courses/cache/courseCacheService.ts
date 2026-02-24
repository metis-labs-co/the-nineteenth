/**
 * Course Cache Service
 *
 * Manages PostgreSQL caching of course data from GolfAPI.io.
 *
 * Features:
 * - 30-day TTL for cached data (uses parent club's last_synced)
 * - Course upsert support
 * - Stale data detection
 *
 * Note: Does NOT cache tees - use teesService.cacheTees() separately
 */

import { supabase } from '@/services/supabase/client';
import type { Club, Course, CourseWithClub } from '@/types/database.types';
import { clubCacheService } from './clubCacheService';
import {
  CACHE_TTL_MS,
  type CourseInsert,
  type CourseInsertDb,
  type CourseUpdateDb,
  type CourseRow,
  type ClubRow,
} from './types';

/**
 * Course Cache Service
 * Manages PostgreSQL caching of course data
 */
class CourseCacheService {
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
      let existingCourse = courseData.golfapi_course_id
        ? await this.getCachedCourseByGolfApiId(courseData.golfapi_course_id)
        : null;

      // Fallback: check by (club_id, name) to avoid unique constraint violation
      if (!existingCourse && courseData.club_id && courseData.name) {
        existingCourse = await this.getCachedCourseByClubAndName(courseData.club_id, courseData.name);
      }

      const now = new Date().toISOString();

      if (existingCourse) {
        // Update existing course
        // Note: num_holes is not stored in DB - computed from holes array length
        const updateData: CourseUpdateDb = {
          name: courseData.name,
          club_id: courseData.club_id,
          golfapi_course_id: courseData.golfapi_course_id,
          golfapi_long_course_id: courseData.golfapi_long_course_id,
          description: courseData.description,
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
        await clubCacheService.updateClubLastSynced(courseData.club_id);

        return data as Course;
      } else {
        // Insert new course
        // Note: num_holes is not stored in DB - computed from holes array length
        const insertData: CourseInsertDb = {
          name: courseData.name,
          club_id: courseData.club_id,
          golfapi_course_id: courseData.golfapi_course_id,
          golfapi_long_course_id: courseData.golfapi_long_course_id,
          description: courseData.description,
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
        await clubCacheService.updateClubLastSynced(courseData.club_id);

        return data as Course;
      }
    } catch (error) {
      console.error('[CourseCacheService] Error caching course:', error);
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
          console.error('[CourseCacheService] Error fetching course by GolfAPI ID:', error.message);
        }
        return null;
      }

      return data as Course;
    } catch (error) {
      console.error('[CourseCacheService] Exception fetching course by GolfAPI ID:', error);
      return null;
    }
  }

  /**
   * Get cached course by club ID and course name
   * Used as fallback to avoid unique constraint violations on (club_id, name)
   *
   * @param clubId - The club ID
   * @param name - The course name
   * @returns Cached course or null if not found
   */
  async getCachedCourseByClubAndName(clubId: string, name: string): Promise<Course | null> {
    try {
      const { data, error } = await supabase
        .from('courses')
        .select('*')
        .eq('club_id', clubId)
        .eq('name', name)
        .single();

      if (error) {
        if (error.code !== 'PGRST116') {
          console.error('[CourseCacheService] Error fetching course by club+name:', error.message);
        }
        return null;
      }

      return data as Course;
    } catch (error) {
      console.error('[CourseCacheService] Exception fetching course by club+name:', error);
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
      const { data, error } = await supabase.from('courses').select('*').eq('id', id).single();

      if (error) {
        if (error.code !== 'PGRST116') {
          console.error('[CourseCacheService] Error fetching course by ID:', error.message);
        }
        return null;
      }

      return data as Course;
    } catch (error) {
      console.error('[CourseCacheService] Exception fetching course by ID:', error);
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
          console.error('[CourseCacheService] Error fetching course with club:', error.message);
        }
        return null;
      }

      // Transform the nested club relation
      // Use unknown cast since Supabase Row types differ from application types
      const courseData = data as CourseRow & { club: ClubRow };
      return {
        ...courseData,
        club: courseData.club as unknown as Club,
      } as unknown as CourseWithClub;
    } catch (error) {
      console.error('[CourseCacheService] Exception fetching course with club:', error);
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
        console.error('[CourseCacheService] Error fetching courses by club:', error.message);
        return [];
      }

      return (data as Course[]) || [];
    } catch (error) {
      console.error('[CourseCacheService] Exception fetching courses by club:', error);
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
        console.warn('[CourseCacheService] Failed to cache course:', course.name, error);
        // Continue with other courses
      }
    }

    return results;
  }
}

// =====================================================
// SINGLETON EXPORT
// =====================================================

/**
 * Singleton course cache service instance
 */
export const courseCacheService = new CourseCacheService();

/**
 * Export class for testing
 */
export { CourseCacheService };
