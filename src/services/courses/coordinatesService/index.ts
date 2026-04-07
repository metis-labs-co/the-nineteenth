/**
 * Coordinates Service - Index Barrel
 *
 * Re-exports all coordinates service modules and provides the same class-based
 * singleton API for backward compatibility.
 *
 * Modules:
 * - types: Type definitions
 * - constants: POI type constants
 * - fetch: Query operations (get coordinates)
 * - cache: Upsert/delete operations
 * - transform: Distance calculations and summaries
 */

// Re-export types
export type {
  HoleCoordinateInsert,
  HoleCoordinateInsertDb,
  HoleCoordinateSummary,
} from './types';

// Re-export constants
export { ESSENTIAL_POI_TYPES, ALL_POI_TYPES } from './constants';

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

// Re-export functions for direct use
export {
  getCoordinatesByCourse,
  getCoordinatesByHole,
  getGreenCenter,
  getTeeBack,
  getTeeFront,
  getCoordinate,
  countCoordinatesByCourse,
  hasCoordinates,
} from './fetch';
export {
  cacheCoordinates,
  deleteCoordinatesByCourse,
  deleteCoordinatesByHole,
  hasCompleteCoordinates,
} from './cache';
export {
  getCoordinateSummary,
  calculateHoleDistance,
  calculateAllHoleDistances,
} from './transform';

// Import all functions for the class wrapper
import {
  getCoordinatesByCourse,
  getCoordinatesByHole,
  getGreenCenter,
  getTeeBack,
  getTeeFront,
  getCoordinate,
  countCoordinatesByCourse,
  hasCoordinates,
} from './fetch';
import {
  cacheCoordinates,
  deleteCoordinatesByCourse,
  deleteCoordinatesByHole,
  hasCompleteCoordinates,
} from './cache';
import {
  getCoordinateSummary,
  calculateHoleDistance,
  calculateAllHoleDistances,
} from './transform';

import type { HoleCoordinate } from '@/types/database.types';
import type { PoiType } from '@/types/database/enums';
import type { HoleCoordinateInsert, HoleCoordinateSummary } from './types';

// =====================================================
// CLASS WRAPPER (backward compatibility)
// =====================================================

/**
 * Coordinates Service
 * Manages hole coordinate data from the hole_coordinates table
 *
 * This class delegates to the focused module functions.
 * New code can import functions directly from the submodules.
 */
class CoordinatesService {
  async getCoordinatesByCourse(courseId: string): Promise<HoleCoordinate[]> {
    return getCoordinatesByCourse(courseId);
  }

  async getCoordinatesByHole(courseId: string, holeNumber: number): Promise<HoleCoordinate[]> {
    return getCoordinatesByHole(courseId, holeNumber);
  }

  async getGreenCenter(courseId: string, holeNumber: number): Promise<HoleCoordinate | null> {
    return getGreenCenter(courseId, holeNumber);
  }

  async getTeeBack(courseId: string, holeNumber: number): Promise<HoleCoordinate | null> {
    return getTeeBack(courseId, holeNumber);
  }

  async getTeeFront(courseId: string, holeNumber: number): Promise<HoleCoordinate | null> {
    return getTeeFront(courseId, holeNumber);
  }

  async getCoordinate(courseId: string, holeNumber: number, poiType: PoiType): Promise<HoleCoordinate | null> {
    return getCoordinate(courseId, holeNumber, poiType);
  }

  async cacheCoordinates(courseId: string, coordinates: HoleCoordinateInsert[]): Promise<number> {
    return cacheCoordinates(courseId, coordinates);
  }

  async deleteCoordinatesByCourse(courseId: string): Promise<void> {
    return deleteCoordinatesByCourse(courseId);
  }

  async deleteCoordinatesByHole(courseId: string, holeNumber: number): Promise<void> {
    return deleteCoordinatesByHole(courseId, holeNumber);
  }

  async hasCompleteCoordinates(courseId: string, numHoles: number = 18): Promise<boolean> {
    return hasCompleteCoordinates(courseId, numHoles);
  }

  async getCoordinateSummary(courseId: string, numHoles: number = 18): Promise<HoleCoordinateSummary[]> {
    return getCoordinateSummary(courseId, numHoles);
  }

  async calculateHoleDistance(courseId: string, holeNumber: number): Promise<number | null> {
    return calculateHoleDistance(courseId, holeNumber);
  }

  async calculateAllHoleDistances(courseId: string, numHoles: number = 18): Promise<(number | null)[]> {
    return calculateAllHoleDistances(courseId, numHoles);
  }

  async countCoordinatesByCourse(courseId: string): Promise<number> {
    return countCoordinatesByCourse(courseId);
  }

  async hasCoordinates(courseId: string): Promise<boolean> {
    return hasCoordinates(courseId);
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
