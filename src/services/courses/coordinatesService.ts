/**
 * Coordinates Service
 *
 * Manages hole coordinate data from the hole_coordinates table.
 * Enables GPS features like distance-to-pin, course flyovers, shot tracking.
 *
 * Features:
 * - CRUD operations for hole coordinates
 * - Upsert support for caching from GolfAPI.io
 * - Distance calculation between points (Haversine formula)
 * - Completeness checking for course coordinates
 *
 * Added January 2026 for GolfAPI.io integration
 */

import { supabase } from '@/services/supabase/client';
import type { PostgrestError } from '@supabase/supabase-js';
import type { HoleCoordinate } from '@/types/database.types';
import type { PoiType } from '@/types/database/enums';
import type { Database } from '@/types/supabase';
import {
  calculateCoordinateDistance,
  groupCoordinatesByHole,
  getCoordinateByPoiType,
} from '@/utils/gpsCalculations';

// Re-export GPS calculation utilities for backward compatibility
export {
  EARTH_RADIUS_METERS,
  toRadians,
  calculateDistance,
  calculateCoordinateDistance,
  metersToYards,
  yardsToMeters,
  groupCoordinatesByHole,
  getCoordinateByPoiType,
  type HoleCoordinatesByHole,
} from '@/utils/gpsCalculations';

// =====================================================
// TYPES
// =====================================================

/**
 * Supabase database types for hole_coordinates table
 */
type HoleCoordinatesTable = Database['public']['Tables']['hole_coordinates'];
type _HoleCoordinateRow = HoleCoordinatesTable['Row'];
type HoleCoordinateInsertDb = HoleCoordinatesTable['Insert'];

/**
 * Partial coordinate data for caching/upserting
 */
export type HoleCoordinateInsert = Omit<Partial<HoleCoordinate>, 'id' | 'created_at'> & {
  course_id: string;
  hole_number: number;
  poi_type: PoiType;
  latitude: number;
  longitude: number;
};

// HoleCoordinatesByHole type now imported from @/utils/gpsCalculations

/**
 * Coordinate summary for a hole
 */
export interface HoleCoordinateSummary {
  hole_number: number;
  has_tee_front: boolean;
  has_tee_back: boolean;
  has_green_front: boolean;
  has_green_center: boolean;
  has_green_back: boolean;
  tee_to_green_distance?: number; // meters
}

// =====================================================
// CONSTANTS
// =====================================================

/**
 * Essential POI types for basic course data
 * At minimum, we need tee_back and green_center for distance calculations
 */
export const ESSENTIAL_POI_TYPES: PoiType[] = ['tee_back', 'green_center'];

/**
 * All POI types in order of importance
 */
export const ALL_POI_TYPES: PoiType[] = [
  'tee_front',
  'tee_back',
  'green_front',
  'green_center',
  'green_back',
];

// =====================================================
// COORDINATES SERVICE
// =====================================================

/**
 * Coordinates Service
 * Manages hole coordinate data from the hole_coordinates table
 */
class CoordinatesService {
  /**
   * Get all coordinates for a course
   * Ordered by hole_number, poi_type
   *
   * @param courseId - UUID of the course
   * @returns Array of HoleCoordinate objects
   */
  async getCoordinatesByCourse(courseId: string): Promise<HoleCoordinate[]> {
    try {
      const { data, error } = await supabase
        .from('hole_coordinates')
        .select('*')
        .eq('course_id', courseId)
        .order('hole_number', { ascending: true })
        .order('poi_type', { ascending: true });

      if (error) {
        console.error(
          '[CoordinatesService] Error fetching coordinates by course:',
          error.message
        );
        return [];
      }

      return (data as HoleCoordinate[]) || [];
    } catch (error) {
      console.error(
        '[CoordinatesService] Exception fetching coordinates by course:',
        error
      );
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
  async getCoordinatesByHole(
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
        console.error(
          '[CoordinatesService] Error fetching coordinates by hole:',
          error.message
        );
        return [];
      }

      return (data as HoleCoordinate[]) || [];
    } catch (error) {
      console.error(
        '[CoordinatesService] Exception fetching coordinates by hole:',
        error
      );
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
  async getGreenCenter(
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
          console.error(
            '[CoordinatesService] Error fetching green center:',
            error.message
          );
        }
        return null;
      }

      return data as HoleCoordinate;
    } catch (error) {
      console.error('[CoordinatesService] Exception fetching green center:', error);
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
  async getTeeBack(
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
          console.error('[CoordinatesService] Error fetching tee back:', error.message);
        }
        return null;
      }

      return data as HoleCoordinate;
    } catch (error) {
      console.error('[CoordinatesService] Exception fetching tee back:', error);
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
  async getTeeFront(
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
          console.error('[CoordinatesService] Error fetching tee front:', error.message);
        }
        return null;
      }

      return data as HoleCoordinate;
    } catch (error) {
      console.error('[CoordinatesService] Exception fetching tee front:', error);
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
  async getCoordinate(
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
          console.error('[CoordinatesService] Error fetching coordinate:', error.message);
        }
        return null;
      }

      return data as HoleCoordinate;
    } catch (error) {
      console.error('[CoordinatesService] Exception fetching coordinate:', error);
      return null;
    }
  }

  /**
   * Cache (upsert) coordinates for a course
   * Uses ON CONFLICT on (course_id, hole_number, poi_type) unique constraint
   *
   * @param courseId - UUID of the course
   * @param coordinates - Array of coordinate data to cache
   * @returns Number of coordinates cached
   */
  async cacheCoordinates(
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
        console.error('[CoordinatesService] Error caching coordinates:', error.message);
        return 0;
      }

      return data?.length || 0;
    } catch (error) {
      console.error('[CoordinatesService] Exception caching coordinates:', error);
      return 0;
    }
  }

  /**
   * Delete all coordinates for a course
   * Used when refreshing course data from API
   *
   * @param courseId - UUID of the course
   */
  async deleteCoordinatesByCourse(courseId: string): Promise<void> {
    try {
      const { error } = await supabase
        .from('hole_coordinates')
        .delete()
        .eq('course_id', courseId);

      if (error) {
        throw new Error(`Failed to delete coordinates for course: ${error.message}`);
      }
    } catch (error) {
      console.error('[CoordinatesService] Error deleting coordinates by course:', error);
      throw error;
    }
  }

  /**
   * Delete coordinates for a specific hole
   *
   * @param courseId - UUID of the course
   * @param holeNumber - Hole number (1-18)
   */
  async deleteCoordinatesByHole(courseId: string, holeNumber: number): Promise<void> {
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
      console.error('[CoordinatesService] Error deleting coordinates by hole:', error);
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
  async hasCompleteCoordinates(courseId: string, numHoles: number = 18): Promise<boolean> {
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
        console.error(
          '[CoordinatesService] Error checking complete coordinates:',
          error.message
        );
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
      console.error(
        '[CoordinatesService] Exception checking complete coordinates:',
        error
      );
      return false;
    }
  }

  /**
   * Get coordinate coverage summary for a course
   * Returns which POI types are available for each hole
   *
   * @param courseId - UUID of the course
   * @param numHoles - Number of holes (9 or 18)
   * @returns Array of hole summaries
   */
  async getCoordinateSummary(
    courseId: string,
    numHoles: number = 18
  ): Promise<HoleCoordinateSummary[]> {
    try {
      const coordinates = await this.getCoordinatesByCourse(courseId);
      const byHole = groupCoordinatesByHole(coordinates);

      const summaries: HoleCoordinateSummary[] = [];

      for (let hole = 1; hole <= numHoles; hole++) {
        const holeCoords = byHole[hole] || [];

        const teeBack = getCoordinateByPoiType(holeCoords, 'tee_back');
        const greenCenter = getCoordinateByPoiType(holeCoords, 'green_center');

        let teeToGreenDistance: number | undefined;
        if (teeBack && greenCenter) {
          teeToGreenDistance = Math.round(
            calculateCoordinateDistance(teeBack, greenCenter)
          );
        }

        summaries.push({
          hole_number: hole,
          has_tee_front: holeCoords.some((c) => c.poi_type === 'tee_front'),
          has_tee_back: !!teeBack,
          has_green_front: holeCoords.some((c) => c.poi_type === 'green_front'),
          has_green_center: !!greenCenter,
          has_green_back: holeCoords.some((c) => c.poi_type === 'green_back'),
          tee_to_green_distance: teeToGreenDistance,
        });
      }

      return summaries;
    } catch (error) {
      console.error('[CoordinatesService] Exception getting coordinate summary:', error);
      return [];
    }
  }

  /**
   * Calculate hole distance from tee_back to green_center
   *
   * @param courseId - UUID of the course
   * @param holeNumber - Hole number (1-18)
   * @returns Distance in meters, or null if coordinates not available
   */
  async calculateHoleDistance(
    courseId: string,
    holeNumber: number
  ): Promise<number | null> {
    try {
      const [teeBack, greenCenter] = await Promise.all([
        this.getTeeBack(courseId, holeNumber),
        this.getGreenCenter(courseId, holeNumber),
      ]);

      if (!teeBack || !greenCenter) {
        return null;
      }

      return Math.round(calculateCoordinateDistance(teeBack, greenCenter));
    } catch (error) {
      console.error('[CoordinatesService] Exception calculating hole distance:', error);
      return null;
    }
  }

  /**
   * Calculate all hole distances for a course
   *
   * @param courseId - UUID of the course
   * @param numHoles - Number of holes (9 or 18)
   * @returns Array of distances in meters (null for holes without coordinates)
   */
  async calculateAllHoleDistances(
    courseId: string,
    numHoles: number = 18
  ): Promise<(number | null)[]> {
    try {
      const coordinates = await this.getCoordinatesByCourse(courseId);
      const byHole = groupCoordinatesByHole(coordinates);

      const distances: (number | null)[] = [];

      for (let hole = 1; hole <= numHoles; hole++) {
        const holeCoords = byHole[hole] || [];
        const teeBack = getCoordinateByPoiType(holeCoords, 'tee_back');
        const greenCenter = getCoordinateByPoiType(holeCoords, 'green_center');

        if (teeBack && greenCenter) {
          distances.push(Math.round(calculateCoordinateDistance(teeBack, greenCenter)));
        } else {
          distances.push(null);
        }
      }

      return distances;
    } catch (error) {
      console.error('[CoordinatesService] Exception calculating hole distances:', error);
      return Array(numHoles).fill(null);
    }
  }

  /**
   * Count coordinates for a course
   *
   * @param courseId - UUID of the course
   * @returns Number of coordinates
   */
  async countCoordinatesByCourse(courseId: string): Promise<number> {
    try {
      const { count, error } = await supabase
        .from('hole_coordinates')
        .select('*', { count: 'exact', head: true })
        .eq('course_id', courseId);

      if (error) {
        console.error('[CoordinatesService] Error counting coordinates:', error.message);
        return 0;
      }

      return count || 0;
    } catch (error) {
      console.error('[CoordinatesService] Exception counting coordinates:', error);
      return 0;
    }
  }

  /**
   * Check if a course has any GPS coordinates
   *
   * @param courseId - UUID of the course
   * @returns true if course has at least one coordinate
   */
  async hasCoordinates(courseId: string): Promise<boolean> {
    const count = await this.countCoordinatesByCourse(courseId);
    return count > 0;
  }
}

// =====================================================
// SINGLETON EXPORT
// =====================================================

/**
 * Singleton coordinates service instance
 */
export const coordinatesService = new CoordinatesService();

/**
 * Export class for testing
 */
export { CoordinatesService };
