/**
 * Coordinates - Query Hooks
 *
 * TanStack Query hooks for fetching GPS coordinate data from the
 * hole_coordinates table. Used for GPS features like distance-to-pin,
 * course flyovers, and shot tracking.
 *
 * Hooks:
 * - useHoleCoordinates(courseId) - Get all coordinates for a course
 * - useHoleCoordinatesByHole(courseId, holeNumber) - Get coordinates for a specific hole
 * - useGreenCoordinate(courseId, holeNumber) - Get green center coordinate
 * - useTeeCoordinate(courseId, holeNumber) - Get tee back coordinate
 * - useCoordinateSummary(courseId) - Get coordinate coverage summary
 * - useHasCoordinates(courseId) - Check if course has GPS data
 * - useHasCompleteCoordinates(courseId) - Check if course has complete GPS data
 */

import { useQuery } from '@tanstack/react-query';
import { useMemo } from 'react';
import { supabase } from '@/services/supabase/client';
import { coordinateKeys } from '@/hooks/queryKeys';
import { CACHE_TIMES } from '@/constants/cacheConfig';
import {
  calculateDistance,
  groupCoordinatesByHole,
  getCoordinateByPoiType,
} from '@/services/courses/coordinatesService';
import type { HoleCoordinate } from '@/types/database.types';
import type {
  HoleCoordinateSet,
  CoordinatesByHole,
  HoleCoordinateSummary,
} from './types';

// =====================================================
// HELPER FUNCTIONS
// =====================================================

/**
 * Transform array of coordinates into HoleCoordinateSet
 */
function toCoordinateSet(
  holeNumber: number,
  coordinates: HoleCoordinate[]
): HoleCoordinateSet {
  return {
    hole_number: holeNumber,
    tee_front: getCoordinateByPoiType(coordinates, 'tee_front'),
    tee_back: getCoordinateByPoiType(coordinates, 'tee_back'),
    green_front: getCoordinateByPoiType(coordinates, 'green_front'),
    green_center: getCoordinateByPoiType(coordinates, 'green_center'),
    green_back: getCoordinateByPoiType(coordinates, 'green_back'),
  };
}

// =====================================================
// QUERY HOOKS
// =====================================================

/**
 * Fetch all coordinates for a course
 * Groups coordinates by hole number for easy access
 *
 * @param courseId - The course ID
 * @param options - Query options
 * @returns Query result with coordinates grouped by hole
 */
export function useHoleCoordinates(
  courseId: string,
  options?: { enabled?: boolean }
) {
  const query = useQuery({
    queryKey: coordinateKeys.byCourse(courseId),
    queryFn: async (): Promise<HoleCoordinate[]> => {
      const { data, error } = await supabase
        .from('hole_coordinates')
        .select('*')
        .eq('course_id', courseId)
        .order('hole_number', { ascending: true })
        .order('poi_type', { ascending: true });

      if (error) throw error;
      return (data as HoleCoordinate[]) ?? [];
    },
    enabled: options?.enabled ?? !!courseId,
    staleTime: CACHE_TIMES.STATIC,
  });

  // Group coordinates by hole for easier access
  const coordinatesByHole = useMemo(() => {
    if (!query.data) return undefined;

    const grouped = groupCoordinatesByHole(query.data);
    const result: CoordinatesByHole = {};

    for (const [holeStr, coords] of Object.entries(grouped)) {
      const holeNumber = parseInt(holeStr, 10);
      result[holeNumber] = toCoordinateSet(holeNumber, coords);
    }

    return result;
  }, [query.data]);

  return {
    ...query,
    data: query.data,
    coordinatesByHole,
  };
}

/**
 * Fetch coordinates for a specific hole
 * Returns a structured set with all POI types
 *
 * @param courseId - The course ID
 * @param holeNumber - The hole number (1-18)
 * @param options - Query options
 * @returns Query result with HoleCoordinateSet
 */
export function useHoleCoordinatesByHole(
  courseId: string,
  holeNumber: number,
  options?: { enabled?: boolean }
) {
  return useQuery({
    queryKey: coordinateKeys.byHole(courseId, holeNumber),
    queryFn: async (): Promise<HoleCoordinateSet> => {
      const { data, error } = await supabase
        .from('hole_coordinates')
        .select('*')
        .eq('course_id', courseId)
        .eq('hole_number', holeNumber)
        .order('poi_type', { ascending: true });

      if (error) throw error;
      return toCoordinateSet(holeNumber, (data as HoleCoordinate[]) ?? []);
    },
    enabled: options?.enabled ?? (!!courseId && holeNumber >= 1 && holeNumber <= 18),
    staleTime: CACHE_TIMES.STATIC,
  });
}

/**
 * Fetch green center coordinate for a hole
 * Used for distance-to-pin calculations
 *
 * @param courseId - The course ID
 * @param holeNumber - The hole number (1-18)
 * @param options - Query options
 * @returns Query result with HoleCoordinate or null
 */
export function useGreenCoordinate(
  courseId: string,
  holeNumber: number,
  options?: { enabled?: boolean }
) {
  return useQuery({
    queryKey: coordinateKeys.greenCenter(courseId, holeNumber),
    queryFn: async (): Promise<HoleCoordinate | null> => {
      const { data, error } = await supabase
        .from('hole_coordinates')
        .select('*')
        .eq('course_id', courseId)
        .eq('hole_number', holeNumber)
        .eq('poi_type', 'green_center')
        .single();

      if (error) {
        if (error.code === 'PGRST116') {
          // Not found
          return null;
        }
        throw error;
      }
      return data as HoleCoordinate;
    },
    enabled: options?.enabled ?? (!!courseId && holeNumber >= 1 && holeNumber <= 18),
    staleTime: CACHE_TIMES.STATIC,
  });
}

/**
 * Fetch tee back coordinate for a hole
 * Used for hole distance display
 *
 * @param courseId - The course ID
 * @param holeNumber - The hole number (1-18)
 * @param options - Query options
 * @returns Query result with HoleCoordinate or null
 */
export function useTeeCoordinate(
  courseId: string,
  holeNumber: number,
  options?: { enabled?: boolean }
) {
  return useQuery({
    queryKey: coordinateKeys.teeBack(courseId, holeNumber),
    queryFn: async (): Promise<HoleCoordinate | null> => {
      const { data, error } = await supabase
        .from('hole_coordinates')
        .select('*')
        .eq('course_id', courseId)
        .eq('hole_number', holeNumber)
        .eq('poi_type', 'tee_back')
        .single();

      if (error) {
        if (error.code === 'PGRST116') {
          // Not found
          return null;
        }
        throw error;
      }
      return data as HoleCoordinate;
    },
    enabled: options?.enabled ?? (!!courseId && holeNumber >= 1 && holeNumber <= 18),
    staleTime: CACHE_TIMES.STATIC,
  });
}

/**
 * Get coordinate coverage summary for a course
 * Shows which POI types are available for each hole
 *
 * @param courseId - The course ID
 * @param numHoles - Number of holes (default: 18)
 * @param options - Query options
 * @returns Query result with HoleCoordinateSummary[]
 */
export function useCoordinateSummary(
  courseId: string,
  numHoles: number = 18,
  options?: { enabled?: boolean }
) {
  const { data: coordinates, ...rest } = useHoleCoordinates(courseId, options);

  const summary = useMemo((): HoleCoordinateSummary[] => {
    if (!coordinates) return [];

    const grouped = groupCoordinatesByHole(coordinates);
    const summaries: HoleCoordinateSummary[] = [];

    for (let hole = 1; hole <= numHoles; hole++) {
      const holeCoords = grouped[hole] || [];

      const teeBack = getCoordinateByPoiType(holeCoords, 'tee_back');
      const greenCenter = getCoordinateByPoiType(holeCoords, 'green_center');

      let teeToGreenDistance: number | undefined;
      if (teeBack && greenCenter) {
        teeToGreenDistance = Math.round(
          calculateDistance(
            teeBack.latitude,
            teeBack.longitude,
            greenCenter.latitude,
            greenCenter.longitude
          )
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
  }, [coordinates, numHoles]);

  return {
    ...rest,
    data: summary,
  };
}

/**
 * Check if a course has any GPS coordinates
 *
 * @param courseId - The course ID
 * @param options - Query options
 * @returns Boolean indicating if course has coordinates
 */
export function useHasCoordinates(courseId: string, options?: { enabled?: boolean }) {
  return useQuery({
    queryKey: [...coordinateKeys.byCourse(courseId), 'exists'],
    queryFn: async (): Promise<boolean> => {
      const { count, error } = await supabase
        .from('hole_coordinates')
        .select('*', { count: 'exact', head: true })
        .eq('course_id', courseId);

      if (error) throw error;
      return (count ?? 0) > 0;
    },
    enabled: options?.enabled ?? !!courseId,
    staleTime: CACHE_TIMES.STATIC,
  });
}

/**
 * Check if a course has complete coordinates (essential POIs for all holes)
 *
 * @param courseId - The course ID
 * @param numHoles - Number of holes to check (default: 18)
 * @param options - Query options
 * @returns Boolean indicating if course has complete coordinates
 */
export function useHasCompleteCoordinates(
  courseId: string,
  numHoles: number = 18,
  options?: { enabled?: boolean }
) {
  const { data: summary, isLoading, error } = useCoordinateSummary(
    courseId,
    numHoles,
    options
  );

  const isComplete = useMemo(() => {
    if (!summary || summary.length === 0) return false;

    // Check if all holes have essential POIs (tee_back and green_center)
    return summary.every((hole) => hole.has_tee_back && hole.has_green_center);
  }, [summary]);

  return {
    data: isComplete,
    isLoading,
    error,
    summary,
  };
}
