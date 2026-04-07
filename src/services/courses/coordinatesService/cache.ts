/**
 * Coordinates Service - Cache Operations
 *
 * Upsert and delete coordinate data in the hole_coordinates table.
 */

import { supabase } from '@/services/supabase/client';
import type { PostgrestError } from '@supabase/supabase-js';
import type { HoleCoordinate } from '@/types/database.types';
import { createModuleLogger } from '@/utils/debugLogger';
import type { HoleCoordinateInsert, HoleCoordinateInsertDb } from './types';
import { ESSENTIAL_POI_TYPES } from './constants';

const logger = createModuleLogger('CoordinatesService');

/**
 * Cache (upsert) coordinates for a course
 * Uses ON CONFLICT on (course_id, hole_number, poi_type) unique constraint
 *
 * @param courseId - UUID of the course
 * @param coordinates - Array of coordinate data to cache
 * @returns Number of coordinates cached
 */
export async function cacheCoordinates(
  courseId: string,
  coordinates: HoleCoordinateInsert[]
): Promise<number> {
  if (coordinates.length === 0) {
    return 0;
  }

  try {
    // Prepare coordinates with course_id, deduplicating by (hole_number, poi_type)
    // to avoid "ON CONFLICT DO UPDATE cannot affect row a second time" errors
    // (e.g. GolfAPI returns both location=1 and location=2 tees that map to tee_front)
    const deduped = new Map<string, HoleCoordinateInsertDb>();
    for (const coord of coordinates) {
      const key = `${coord.hole_number}:${coord.poi_type}`;
      deduped.set(key, {
        course_id: courseId,
        hole_number: coord.hole_number,
        poi_type: coord.poi_type,
        latitude: coord.latitude,
        longitude: coord.longitude,
        side_of_fairway: coord.side_of_fairway || null,
      });
    }
    const coordsToUpsert = Array.from(deduped.values());

    // Use upsert with ON CONFLICT
    const { data, error } = await supabase
      .from('hole_coordinates')
      .upsert(coordsToUpsert as unknown as never, {
        onConflict: 'course_id,hole_number,poi_type',
        ignoreDuplicates: false,
      })
      .select();

    if (error) {
      logger.error('Error caching coordinates', error.message);
      return 0;
    }

    return data?.length || 0;
  } catch (error) {
    logger.error('Exception caching coordinates', error);
    return 0;
  }
}

/**
 * Delete all coordinates for a course
 * Used when refreshing course data from API
 *
 * @param courseId - UUID of the course
 */
export async function deleteCoordinatesByCourse(courseId: string): Promise<void> {
  try {
    const { error } = await supabase
      .from('hole_coordinates')
      .delete()
      .eq('course_id', courseId);

    if (error) {
      throw new Error(`Failed to delete coordinates for course: ${error.message}`);
    }
  } catch (error) {
    logger.error('Error deleting coordinates by course', error);
    throw error;
  }
}

/**
 * Delete coordinates for a specific hole
 *
 * @param courseId - UUID of the course
 * @param holeNumber - Hole number (1-18)
 */
export async function deleteCoordinatesByHole(courseId: string, holeNumber: number): Promise<void> {
  try {
    const { error } = await supabase
      .from('hole_coordinates')
      .delete()
      .eq('course_id', courseId)
      .eq('hole_number', holeNumber);

    if (error) {
      throw new Error(`Failed to delete coordinates for hole: ${error.message}`);
    }
  } catch (error) {
    logger.error('Error deleting coordinates by hole', error);
    throw error;
  }
}

/**
 * Check if course has complete coordinates for all holes
 * At minimum: tee_back and green_center for each hole
 *
 * @param courseId - UUID of the course
 * @param numHoles - Number of holes (9 or 18)
 * @returns true if course has essential coordinates for all holes
 */
export async function hasCompleteCoordinates(courseId: string, numHoles: number = 18): Promise<boolean> {
  try {
    // Count essential POI types per hole
    const { data, error } = await supabase
      .from('hole_coordinates')
      .select('hole_number, poi_type')
      .eq('course_id', courseId)
      .in('poi_type', ESSENTIAL_POI_TYPES as string[]) as {
        data: { hole_number: number; poi_type: string }[] | null;
        error: PostgrestError | null;
      };

    if (error) {
      logger.error('Error checking complete coordinates', error.message);
      return false;
    }

    if (!data || data.length === 0) {
      return false;
    }

    // Group by hole and check each has both essential types
    const byHole = new Map<number, Set<string>>();
    for (const coord of data) {
      if (!byHole.has(coord.hole_number)) {
        byHole.set(coord.hole_number, new Set());
      }
      byHole.get(coord.hole_number)!.add(coord.poi_type);
    }

    // Check all holes have essential POIs
    for (let hole = 1; hole <= numHoles; hole++) {
      const poiTypes = byHole.get(hole);
      if (!poiTypes) {
        return false;
      }
      for (const essentialPoi of ESSENTIAL_POI_TYPES) {
        if (!poiTypes.has(essentialPoi)) {
          return false;
        }
      }
    }

    return true;
  } catch (error) {
    logger.error('Exception checking complete coordinates', error);
    return false;
  }
}
