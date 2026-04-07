/**
 * Coordinates Service - Transform/Calculation Operations
 *
 * Distance calculations and coordinate summary/analysis functions.
 */

import {
  calculateCoordinateDistance,
  groupCoordinatesByHole,
  getCoordinateByPoiType,
} from '@/utils/gpsCalculations';
import { createModuleLogger } from '@/utils/debugLogger';
import type { HoleCoordinateSummary } from './types';
import { getCoordinatesByCourse, getTeeBack, getGreenCenter } from './fetch';

const logger = createModuleLogger('CoordinatesService');

/**
 * Get coordinate coverage summary for a course
 * Returns which POI types are available for each hole
 *
 * @param courseId - UUID of the course
 * @param numHoles - Number of holes (9 or 18)
 * @returns Array of hole summaries
 */
export async function getCoordinateSummary(
  courseId: string,
  numHoles: number = 18
): Promise<HoleCoordinateSummary[]> {
  try {
    const coordinates = await getCoordinatesByCourse(courseId);
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
    logger.error('Exception getting coordinate summary', error);
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
export async function calculateHoleDistance(
  courseId: string,
  holeNumber: number
): Promise<number | null> {
  try {
    const [teeBack, greenCenter] = await Promise.all([
      getTeeBack(courseId, holeNumber),
      getGreenCenter(courseId, holeNumber),
    ]);

    if (!teeBack || !greenCenter) {
      return null;
    }

    return Math.round(calculateCoordinateDistance(teeBack, greenCenter));
  } catch (error) {
    logger.error('Exception calculating hole distance', error);
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
export async function calculateAllHoleDistances(
  courseId: string,
  numHoles: number = 18
): Promise<(number | null)[]> {
  try {
    const coordinates = await getCoordinatesByCourse(courseId);
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
    logger.error('Exception calculating hole distances', error);
    return Array(numHoles).fill(null);
  }
}
