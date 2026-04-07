/**
 * Coordinates Service - Fetch Operations
 *
 * Query hole coordinate data from the hole_coordinates table.
 */

import { supabase } from '@/services/supabase/client';
import type { HoleCoordinate } from '@/types/database.types';
import type { PoiType } from '@/types/database/enums';
import { createModuleLogger } from '@/utils/debugLogger';

const logger = createModuleLogger('CoordinatesService');

/**
 * Get all coordinates for a course
 * Ordered by hole_number, poi_type
 *
 * @param courseId - UUID of the course
 * @returns Array of HoleCoordinate objects
 */
export async function getCoordinatesByCourse(courseId: string): Promise<HoleCoordinate[]> {
  try {
    const { data, error } = await supabase
      .from('hole_coordinates')
      .select('*')
      .eq('course_id', courseId)
      .order('hole_number', { ascending: true })
      .order('poi_type', { ascending: true });

    if (error) {
      logger.error('Error fetching coordinates by course', error.message);
      return [];
    }

    return (data as HoleCoordinate[]) || [];
  } catch (error) {
    logger.error('Exception fetching coordinates by course', error);
    return [];
  }
}

/**
 * Get coordinates for a specific hole
 * Returns all POIs for that hole (tee front/back, green front/center/back)
 *
 * @param courseId - UUID of the course
 * @param holeNumber - Hole number (1-18)
 * @returns Array of HoleCoordinate objects for the hole
 */
export async function getCoordinatesByHole(
  courseId: string,
  holeNumber: number
): Promise<HoleCoordinate[]> {
  try {
    const { data, error } = await supabase
      .from('hole_coordinates')
      .select('*')
      .eq('course_id', courseId)
      .eq('hole_number', holeNumber)
      .order('poi_type', { ascending: true });

    if (error) {
      logger.error('Error fetching coordinates by hole', error.message);
      return [];
    }

    return (data as HoleCoordinate[]) || [];
  } catch (error) {
    logger.error('Exception fetching coordinates by hole', error);
    return [];
  }
}

/**
 * Get green center coordinate for a hole
 * Used for distance-to-pin calculations
 *
 * @param courseId - UUID of the course
 * @param holeNumber - Hole number (1-18)
 * @returns HoleCoordinate or null if not found
 */
export async function getGreenCenter(
  courseId: string,
  holeNumber: number
): Promise<HoleCoordinate | null> {
  try {
    const { data, error } = await supabase
      .from('hole_coordinates')
      .select('*')
      .eq('course_id', courseId)
      .eq('hole_number', holeNumber)
      .eq('poi_type', 'green_center')
      .single();

    if (error) {
      if (error.code !== 'PGRST116') {
        // Not just "not found"
        logger.error('Error fetching green center', error.message);
      }
      return null;
    }

    return data as HoleCoordinate;
  } catch (error) {
    logger.error('Exception fetching green center', error);
    return null;
  }
}

/**
 * Get back tee coordinate for a hole
 * Used for hole length calculations
 *
 * @param courseId - UUID of the course
 * @param holeNumber - Hole number (1-18)
 * @returns HoleCoordinate or null if not found
 */
export async function getTeeBack(
  courseId: string,
  holeNumber: number
): Promise<HoleCoordinate | null> {
  try {
    const { data, error } = await supabase
      .from('hole_coordinates')
      .select('*')
      .eq('course_id', courseId)
      .eq('hole_number', holeNumber)
      .eq('poi_type', 'tee_back')
      .single();

    if (error) {
      if (error.code !== 'PGRST116') {
        // Not just "not found"
        logger.error('Error fetching tee back', error.message);
      }
      return null;
    }

    return data as HoleCoordinate;
  } catch (error) {
    logger.error('Exception fetching tee back', error);
    return null;
  }
}

/**
 * Get front tee coordinate for a hole
 *
 * @param courseId - UUID of the course
 * @param holeNumber - Hole number (1-18)
 * @returns HoleCoordinate or null if not found
 */
export async function getTeeFront(
  courseId: string,
  holeNumber: number
): Promise<HoleCoordinate | null> {
  try {
    const { data, error } = await supabase
      .from('hole_coordinates')
      .select('*')
      .eq('course_id', courseId)
      .eq('hole_number', holeNumber)
      .eq('poi_type', 'tee_front')
      .single();

    if (error) {
      if (error.code !== 'PGRST116') {
        logger.error('Error fetching tee front', error.message);
      }
      return null;
    }

    return data as HoleCoordinate;
  } catch (error) {
    logger.error('Exception fetching tee front', error);
    return null;
  }
}

/**
 * Get a single coordinate by course, hole, and POI type
 *
 * @param courseId - UUID of the course
 * @param holeNumber - Hole number (1-18)
 * @param poiType - Point of interest type
 * @returns HoleCoordinate or null if not found
 */
export async function getCoordinate(
  courseId: string,
  holeNumber: number,
  poiType: PoiType
): Promise<HoleCoordinate | null> {
  try {
    const { data, error } = await supabase
      .from('hole_coordinates')
      .select('*')
      .eq('course_id', courseId)
      .eq('hole_number', holeNumber)
      .eq('poi_type', poiType)
      .single();

    if (error) {
      if (error.code !== 'PGRST116') {
        logger.error('Error fetching coordinate', error.message);
      }
      return null;
    }

    return data as HoleCoordinate;
  } catch (error) {
    logger.error('Exception fetching coordinate', error);
    return null;
  }
}

/**
 * Count coordinates for a course
 *
 * @param courseId - UUID of the course
 * @returns Number of coordinates
 */
export async function countCoordinatesByCourse(courseId: string): Promise<number> {
  try {
    const { count, error } = await supabase
      .from('hole_coordinates')
      .select('*', { count: 'exact', head: true })
      .eq('course_id', courseId);

    if (error) {
      logger.error('Error counting coordinates', error.message);
      return 0;
    }

    return count || 0;
  } catch (error) {
    logger.error('Exception counting coordinates', error);
    return 0;
  }
}

/**
 * Check if a course has any GPS coordinates
 *
 * @param courseId - UUID of the course
 * @returns true if course has at least one coordinate
 */
export async function hasCoordinates(courseId: string): Promise<boolean> {
  const count = await countCoordinatesByCourse(courseId);
  return count > 0;
}
