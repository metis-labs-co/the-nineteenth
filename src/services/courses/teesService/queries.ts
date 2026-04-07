/**
 * Tees Service - Query Operations
 *
 * Fetch tee data from the tees table.
 */

import { supabase } from '@/services/supabase/client';
import type { Tee } from '@/types/database.types';
import { createModuleLogger } from '@/utils/debugLogger';

const logger = createModuleLogger('TeesService');

/**
 * Get all tees for a course
 * Ordered by slope descending (longer/harder tees first)
 *
 * @param courseId - UUID of the course
 * @returns Array of Tee objects
 */
export async function getTeesByCourse(courseId: string): Promise<Tee[]> {
  try {
    const { data, error } = await supabase
      .from('tees')
      .select('*')
      .eq('course_id', courseId)
      .order('slope', { ascending: false, nullsFirst: false });

    if (error) {
      logger.error('Error fetching tees by course', error.message);
      return [];
    }

    return (data as Tee[]) || [];
  } catch (error) {
    logger.error('Exception fetching tees by course', error);
    return [];
  }
}

/**
 * Get a single tee by ID
 *
 * @param teeId - UUID of the tee
 * @returns Tee object or null if not found
 */
export async function getTeeById(teeId: string): Promise<Tee | null> {
  try {
    const { data, error } = await supabase
      .from('tees')
      .select('*')
      .eq('id', teeId)
      .single();

    if (error) {
      if (error.code !== 'PGRST116') {
        // Not just "not found"
        logger.error('Error fetching tee by ID', error.message);
      }
      return null;
    }

    return data as Tee;
  } catch (error) {
    logger.error('Exception fetching tee by ID', error);
    return null;
  }
}

/**
 * Get a tee by GolfAPI.io tee ID
 * Used for deduplication during import
 *
 * @param golfapiTeeId - GolfAPI.io TeeID
 * @returns Tee object or null if not found
 */
export async function getTeeByGolfApiId(golfapiTeeId: string): Promise<Tee | null> {
  try {
    const { data, error } = await supabase
      .from('tees')
      .select('*')
      .eq('golfapi_tee_id', golfapiTeeId)
      .single();

    if (error) {
      if (error.code !== 'PGRST116') {
        // Not just "not found"
        logger.error('Error fetching tee by GolfAPI ID', error.message);
      }
      return null;
    }

    return data as Tee;
  } catch (error) {
    logger.error('Exception fetching tee by GolfAPI ID', error);
    return null;
  }
}

/**
 * Get multiple tees by GolfAPI.io tee IDs
 * Used for batch deduplication during import
 *
 * @param golfapiTeeIds - Array of GolfAPI.io TeeIDs
 * @returns Map of golfapi_tee_id -> Tee
 */
export async function getTeesByGolfApiIds(golfapiTeeIds: string[]): Promise<Map<string, Tee>> {
  try {
    if (golfapiTeeIds.length === 0) {
      return new Map();
    }

    const { data, error } = await supabase
      .from('tees')
      .select('*')
      .in('golfapi_tee_id', golfapiTeeIds);

    if (error) {
      logger.error('Error fetching tees by GolfAPI IDs', error.message);
      return new Map();
    }

    const tees = (data as Tee[]) || [];
    const map = new Map<string, Tee>();
    for (const tee of tees) {
      if (tee.golfapi_tee_id) {
        map.set(tee.golfapi_tee_id, tee);
      }
    }
    return map;
  } catch (error) {
    logger.error('Exception fetching tees by GolfAPI IDs', error);
    return new Map();
  }
}

/**
 * Count tees for a course
 *
 * @param courseId - UUID of the course
 * @returns Number of tees
 */
export async function countTeesByCourse(courseId: string): Promise<number> {
  try {
    const { count, error } = await supabase
      .from('tees')
      .select('*', { count: 'exact', head: true })
      .eq('course_id', courseId);

    if (error) {
      logger.error('Error counting tees', error.message);
      return 0;
    }

    return count || 0;
  } catch (error) {
    logger.error('Exception counting tees', error);
    return 0;
  }
}

/**
 * Get tees with complete data (has ratings and lengths)
 *
 * @param courseId - UUID of the course
 * @returns Array of tees with complete data
 */
export async function getCompleteTees(courseId: string): Promise<Tee[]> {
  try {
    const { data, error } = await supabase
      .from('tees')
      .select('*')
      .eq('course_id', courseId)
      .not('slope', 'is', null)
      .not('course_rating', 'is', null)
      .order('slope', { ascending: false });

    if (error) {
      logger.error('Error fetching complete tees', error.message);
      return [];
    }

    return (data as Tee[]) || [];
  } catch (error) {
    logger.error('Exception fetching complete tees', error);
    return [];
  }
}

/**
 * Get the default tee for a course (first by slope)
 *
 * @param courseId - UUID of the course
 * @returns Default tee or null
 */
export async function getDefaultTee(courseId: string): Promise<Tee | null> {
  try {
    const { data, error } = await supabase
      .from('tees')
      .select('*')
      .eq('course_id', courseId)
      .order('slope', { ascending: false, nullsFirst: false })
      .limit(1)
      .single();

    if (error) {
      if (error.code !== 'PGRST116') {
        logger.error('Error fetching default tee', error.message);
      }
      return null;
    }

    return data as Tee;
  } catch (error) {
    logger.error('Exception fetching default tee', error);
    return null;
  }
}

/**
 * Delete all tees for a course
 * Used when refreshing course data from API
 *
 * @param courseId - UUID of the course
 */
export async function deleteTeesByCourse(courseId: string): Promise<void> {
  try {
    const { error } = await supabase.from('tees').delete().eq('course_id', courseId);

    if (error) {
      throw new Error(`Failed to delete tees for course: ${error.message}`);
    }
  } catch (error) {
    logger.error('Error deleting tees by course', error);
    throw error;
  }
}

/**
 * Delete a single tee by ID
 *
 * @param teeId - UUID of the tee
 */
export async function deleteTee(teeId: string): Promise<void> {
  try {
    const { error } = await supabase.from('tees').delete().eq('id', teeId);

    if (error) {
      throw new Error(`Failed to delete tee: ${error.message}`);
    }
  } catch (error) {
    logger.error('Error deleting tee', error);
    throw error;
  }
}
