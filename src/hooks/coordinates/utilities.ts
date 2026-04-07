/**
 * Coordinates - Utility Hooks
 *
 * Computed/utility hooks that build on top of the base query hooks
 * to provide distance calculations and derived data.
 *
 * Hooks:
 * - useDistanceToGreen(courseId, holeNumber, userLocation) - Calculate distance to green
 * - useHoleDistance(courseId, holeNumber) - Get tee-to-green distance
 * - useAllHoleDistances(courseId) - Get distances for all holes
 */

import { useMemo } from 'react';
import {
  calculateDistance,
  metersToYards,
} from '@/services/courses/coordinatesService';
import {
  useGreenCoordinate,
  useHoleCoordinatesByHole,
  useCoordinateSummary,
} from './queries';
import type { UserLocation, DistanceResult } from './types';

// =====================================================
// UTILITY HOOKS
// =====================================================

/**
 * Calculate distance from user location to green center
 * Returns distance in both meters and yards
 *
 * @param courseId - The course ID
 * @param holeNumber - The hole number (1-18)
 * @param userLocation - User's current GPS location
 * @param options - Query options
 * @returns Distance to green or null if unavailable
 */
export function useDistanceToGreen(
  courseId: string,
  holeNumber: number,
  userLocation?: UserLocation | null,
  options?: { enabled?: boolean }
) {
  const { data: greenCoord, isLoading, error } = useGreenCoordinate(
    courseId,
    holeNumber,
    options
  );

  const distance = useMemo((): DistanceResult | null => {
    if (!greenCoord || !userLocation) return null;

    const meters = calculateDistance(
      userLocation.latitude,
      userLocation.longitude,
      greenCoord.latitude,
      greenCoord.longitude
    );

    return {
      meters: Math.round(meters),
      yards: Math.round(metersToYards(meters)),
    };
  }, [greenCoord, userLocation]);

  return {
    data: distance,
    isLoading,
    error,
    greenCoordinate: greenCoord,
  };
}

/**
 * Get the tee-to-green distance for a hole
 * Calculates from tee_back to green_center
 *
 * @param courseId - The course ID
 * @param holeNumber - The hole number (1-18)
 * @param options - Query options
 * @returns Distance or null if coordinates unavailable
 */
export function useHoleDistance(
  courseId: string,
  holeNumber: number,
  options?: { enabled?: boolean }
) {
  const { data: coords, isLoading, error } = useHoleCoordinatesByHole(
    courseId,
    holeNumber,
    options
  );

  const distance = useMemo((): DistanceResult | null => {
    if (!coords?.tee_back || !coords?.green_center) return null;

    const meters = calculateDistance(
      coords.tee_back.latitude,
      coords.tee_back.longitude,
      coords.green_center.latitude,
      coords.green_center.longitude
    );

    return {
      meters: Math.round(meters),
      yards: Math.round(metersToYards(meters)),
    };
  }, [coords]);

  return {
    data: distance,
    isLoading,
    error,
    coordinates: coords,
  };
}

/**
 * Get distances for all holes on a course
 *
 * @param courseId - The course ID
 * @param numHoles - Number of holes (default: 18)
 * @param options - Query options
 * @returns Array of distances (null for holes without coordinates)
 */
export function useAllHoleDistances(
  courseId: string,
  numHoles: number = 18,
  options?: { enabled?: boolean }
) {
  const { data: summary, isLoading, error } = useCoordinateSummary(
    courseId,
    numHoles,
    options
  );

  const distances = useMemo((): (DistanceResult | null)[] => {
    if (!summary) return Array(numHoles).fill(null);

    return summary.map((hole) => {
      if (!hole.tee_to_green_distance) return null;

      return {
        meters: hole.tee_to_green_distance,
        yards: Math.round(metersToYards(hole.tee_to_green_distance)),
      };
    });
  }, [summary, numHoles]);

  return {
    data: distances,
    isLoading,
    error,
    summary,
  };
}
