/**
 * Coordinates - Type Definitions
 *
 * Type definitions for GPS coordinate hooks.
 * Used for distance-to-pin, course flyovers, shot tracking.
 */

import type { HoleCoordinate } from '@/types/database.types';

/**
 * Set of coordinates for a single hole
 */
export interface HoleCoordinateSet {
  hole_number: number;
  tee_front?: HoleCoordinate;
  tee_back?: HoleCoordinate;
  green_front?: HoleCoordinate;
  green_center?: HoleCoordinate;
  green_back?: HoleCoordinate;
}

/**
 * Coordinates grouped by hole number
 */
export interface CoordinatesByHole {
  [holeNumber: number]: HoleCoordinateSet;
}

/**
 * User location for distance calculations
 */
export interface UserLocation {
  latitude: number;
  longitude: number;
}

/**
 * Distance result with multiple units
 */
export interface DistanceResult {
  meters: number;
  yards: number;
}

/**
 * Summary of coordinate coverage for a hole
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
