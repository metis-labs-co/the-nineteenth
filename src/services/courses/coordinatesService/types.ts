/**
 * Coordinates Service Types
 *
 * Type definitions for the coordinates service.
 */

import type { HoleCoordinate } from '@/types/database.types';
import type { PoiType } from '@/types/database/enums';
import type { Database } from '@/types/supabase';

/**
 * Supabase database types for hole_coordinates table
 */
type HoleCoordinatesTable = Database['public']['Tables']['hole_coordinates'];
type _HoleCoordinateRow = HoleCoordinatesTable['Row'];
export type HoleCoordinateInsertDb = HoleCoordinatesTable['Insert'];

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
