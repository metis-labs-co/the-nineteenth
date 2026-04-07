/**
 * Tee Query Hooks
 *
 * TanStack Query hooks for fetching tee data.
 *
 * ### Query Hooks
 * - `useTeesByCourse(courseId)` - Get all tees for a course
 * - `useTeeById(teeId)` - Get single tee by ID
 * - `useTeesWithCourse(courseId)` - Get tees with parent course info
 * - `useDefaultTee(courseId)` - Get default/recommended tee for a course
 * - `useTeesByGender(courseId, gender)` - Get tees filtered by gender
 *
 * Added January 2026 for GolfAPI.io integration
 */

import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/services/supabase/client';
import { teeKeys } from '@/hooks/queryKeys';
import { CACHE_TIMES } from '@/constants/cacheConfig';
import type { Tee, Course } from '@/types/database.types';
import type { TeeWithCourse } from './types';

/**
 * Fetch all tees for a course
 * Ordered by slope rating (descending) for typical display order
 *
 * @param courseId - The course ID
 * @param options - Query options
 * @returns Query result with Tee[]
 */
export function useTeesByCourse(
  courseId: string,
  options?: { enabled?: boolean }
) {
  return useQuery({
    queryKey: teeKeys.byCourse(courseId),
    queryFn: async (): Promise<Tee[]> => {
      const { data, error } = await supabase
        .from('tees')
        .select('*')
        .eq('course_id', courseId)
        .order('slope', { ascending: false, nullsFirst: false });

      if (error) throw error;
      return (data as Tee[]) ?? [];
    },
    enabled: options?.enabled ?? !!courseId,
    staleTime: CACHE_TIMES.STANDARD,
  });
}

/**
 * Fetch a single tee by ID
 *
 * @param teeId - The tee ID
 * @param options - Query options
 * @returns Query result with Tee | null
 */
export function useTeeById(teeId: string, options?: { enabled?: boolean }) {
  return useQuery({
    queryKey: teeKeys.detail(teeId),
    queryFn: async (): Promise<Tee | null> => {
      const { data, error } = await supabase
        .from('tees')
        .select('*')
        .eq('id', teeId)
        .single();

      if (error) {
        if (error.code === 'PGRST116') {
          // Not found
          return null;
        }
        throw error;
      }
      return data as Tee;
    },
    enabled: options?.enabled ?? !!teeId,
    staleTime: CACHE_TIMES.STANDARD,
  });
}

/**
 * Fetch tees with parent course info
 * Useful for tee selection UI where course context is needed
 *
 * @param courseId - The course ID
 * @param options - Query options
 * @returns Query result with TeeWithCourse[]
 */
export function useTeesWithCourse(
  courseId: string,
  options?: { enabled?: boolean }
) {
  return useQuery({
    queryKey: teeKeys.withCourse(courseId),
    queryFn: async (): Promise<TeeWithCourse[]> => {
      const { data, error } = await supabase
        .from('tees')
        .select(
          `
          *,
          course:course_id (*)
        `
        )
        .eq('course_id', courseId)
        .order('slope', { ascending: false, nullsFirst: false });

      if (error) throw error;

      // Transform the nested course relation
      return ((data as (Tee & { course: Course })[]) ?? []).map((tee) => ({
        ...tee,
        course: tee.course,
      }));
    },
    enabled: options?.enabled ?? !!courseId,
    staleTime: CACHE_TIMES.STANDARD,
  });
}

/**
 * Get the default/recommended tee for a course
 * Returns the tee with the highest slope rating (typically the most challenging)
 *
 * @param courseId - The course ID
 * @param options - Query options
 * @returns Query result with Tee | null
 */
export function useDefaultTee(courseId: string, options?: { enabled?: boolean }) {
  const { data: tees, ...rest } = useTeesByCourse(courseId, options);

  // Return the first tee (already sorted by slope desc)
  const defaultTee = tees?.[0] ?? null;

  return {
    ...rest,
    data: defaultTee,
  };
}

/**
 * Get tees filtered by gender
 *
 * @param courseId - The course ID
 * @param gender - Gender filter ('men', 'women', 'unisex')
 * @param options - Query options
 * @returns Query result with Tee[]
 */
export function useTeesByGender(
  courseId: string,
  gender: 'men' | 'women' | 'unisex',
  options?: { enabled?: boolean }
) {
  const { data: tees, ...rest } = useTeesByCourse(courseId, options);

  // Filter by gender based on available ratings
  // Tees with women's ratings are for women, tees with men's ratings are for men
  // Tees with both or neither are unisex
  const filteredTees =
    tees?.filter((tee) => {
      const hasMenRatings = tee.slope != null || tee.course_rating != null;
      const hasWomenRatings = tee.slope_women != null || tee.course_rating_women != null;
      const teeGender = hasMenRatings && hasWomenRatings ? 'unisex'
        : hasWomenRatings ? 'women'
        : hasMenRatings ? 'men'
        : 'unisex';
      return teeGender === gender || teeGender === 'unisex';
    }) ?? [];

  return {
    ...rest,
    data: filteredTees,
  };
}
