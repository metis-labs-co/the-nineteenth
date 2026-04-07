/**
 * useTees - Hooks for tee data fetching and mutations
 *
 * Provides React Query hooks for the tees table.
 * Tees are stored in a separate table (not JSONB in courses).
 *
 * ## Hook Overview
 *
 * ### Query Hooks
 * - `useTeesByCourse(courseId)` - Get all tees for a course
 * - `useTeeById(teeId)` - Get single tee by ID
 * - `useTeesWithCourse(courseId)` - Get tees with parent course info
 *
 * ### Mutation Hooks
 * - `useCreateTee()` - Create a new tee
 * - `useUpdateTee()` - Update an existing tee
 * - `useDeleteTee()` - Delete a tee
 *
 * Added January 2026 for GolfAPI.io integration
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/services/supabase/client';
import { teeKeys, courseKeys } from '@/hooks/queryKeys';
import { CACHE_TIMES } from '@/constants/cacheConfig';
import type { Tee, Course } from '@/types/database.types';

// =====================================================
// TYPES
// =====================================================

/**
 * Tee with parent course info
 */
export interface TeeWithCourse extends Tee {
  course: Course;
}

/**
 * Input for creating a new tee
 */
export interface CreateTeeInput {
  course_id: string;
  name: string;
  color?: string | null;
  golfapi_tee_id?: string | null;
  slope?: number | null;
  course_rating?: number | null;
  slope_front9?: number | null;
  slope_back9?: number | null;
  course_rating_front9?: number | null;
  course_rating_back9?: number | null;
  slope_women?: number | null;
  course_rating_women?: number | null;
  slope_women_front9?: number | null;
  slope_women_back9?: number | null;
  course_rating_women_front9?: number | null;
  course_rating_women_back9?: number | null;
  measure_unit?: string | null;
}

/**
 * Input for updating a tee
 */
export interface UpdateTeeInput {
  id: string;
  name?: string;
  color?: string | null;
  slope?: number | null;
  course_rating?: number | null;
  slope_front9?: number | null;
  slope_back9?: number | null;
  course_rating_front9?: number | null;
  course_rating_back9?: number | null;
  slope_women?: number | null;
  course_rating_women?: number | null;
  slope_women_front9?: number | null;
  slope_women_back9?: number | null;
  course_rating_women_front9?: number | null;
  course_rating_women_back9?: number | null;
  measure_unit?: string | null;
}

// =====================================================
// QUERY HOOKS
// =====================================================

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

// =====================================================
// MUTATION HOOKS
// =====================================================

/**
 * Create a new tee
 * Invalidates teeKeys.byCourse for the course
 */
export function useCreateTee() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: CreateTeeInput): Promise<Tee> => {
      const { data, error } = await supabase
        .from('tees')
        .insert({
          course_id: input.course_id,
          name: input.name,
          color: input.color ?? null,
          golfapi_tee_id: input.golfapi_tee_id ?? null,
          slope: input.slope ?? null,
          course_rating: input.course_rating ?? null,
          slope_front9: input.slope_front9 ?? null,
          slope_back9: input.slope_back9 ?? null,
          course_rating_front9: input.course_rating_front9 ?? null,
          course_rating_back9: input.course_rating_back9 ?? null,
          slope_women: input.slope_women ?? null,
          course_rating_women: input.course_rating_women ?? null,
          slope_women_front9: input.slope_women_front9 ?? null,
          slope_women_back9: input.slope_women_back9 ?? null,
          course_rating_women_front9: input.course_rating_women_front9 ?? null,
          course_rating_women_back9: input.course_rating_women_back9 ?? null,
          measure_unit: input.measure_unit ?? null,
        } as never)
        .select()
        .single();

      if (error) throw error;
      if (!data) throw new Error('No data returned from insert');
      return data as Tee;
    },
    onSuccess: (data) => {
      // Invalidate course's tees list
      queryClient.invalidateQueries({ queryKey: teeKeys.byCourse(data.course_id) });
      queryClient.invalidateQueries({ queryKey: teeKeys.withCourse(data.course_id) });
      // Also invalidate course details (in case tee count is displayed)
      queryClient.invalidateQueries({ queryKey: courseKeys.detail(data.course_id) });
    },
  });
}

/**
 * Update an existing tee
 * Invalidates teeKeys.byCourse and teeKeys.detail
 */
export function useUpdateTee() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: UpdateTeeInput): Promise<Tee> => {
      const { id, ...updateData } = input;

      const { data, error } = await supabase
        .from('tees')
        .update(updateData as never)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      if (!data) throw new Error('No data returned from update');
      return data as Tee;
    },
    onSuccess: (data) => {
      // Invalidate tee detail
      queryClient.invalidateQueries({ queryKey: teeKeys.detail(data.id) });
      // Invalidate course's tees list
      queryClient.invalidateQueries({ queryKey: teeKeys.byCourse(data.course_id) });
      queryClient.invalidateQueries({ queryKey: teeKeys.withCourse(data.course_id) });
      // Also invalidate course details so CourseDetailScreen refreshes
      queryClient.invalidateQueries({ queryKey: courseKeys.detail(data.course_id) });
    },
  });
}

/**
 * Delete a tee
 * Invalidates teeKeys.byCourse
 */
export function useDeleteTee() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      teeId,
      courseId: _courseId,
    }: {
      teeId: string;
      courseId: string;
    }): Promise<void> => {
      const { error } = await supabase.from('tees').delete().eq('id', teeId);

      if (error) throw error;
    },
    onSuccess: (_, variables) => {
      // Invalidate course's tees list
      queryClient.invalidateQueries({ queryKey: teeKeys.byCourse(variables.courseId) });
      queryClient.invalidateQueries({ queryKey: teeKeys.withCourse(variables.courseId) });
      // Invalidate tee detail (will now return null)
      queryClient.invalidateQueries({ queryKey: teeKeys.detail(variables.teeId) });
      // Also invalidate course details
      queryClient.invalidateQueries({ queryKey: courseKeys.detail(variables.courseId) });
    },
  });
}

/**
 * Bulk create tees for a course
 * Useful when importing course data from API
 */
export function useBulkCreateTees() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      courseId,
      tees,
    }: {
      courseId: string;
      tees: Omit<CreateTeeInput, 'course_id'>[];
    }): Promise<Tee[]> => {
      const teesToInsert = tees.map((tee) => ({
        course_id: courseId,
        name: tee.name,
        color: tee.color ?? null,
        golfapi_tee_id: tee.golfapi_tee_id ?? null,
        slope: tee.slope ?? null,
        course_rating: tee.course_rating ?? null,
        slope_front9: tee.slope_front9 ?? null,
        slope_back9: tee.slope_back9 ?? null,
        course_rating_front9: tee.course_rating_front9 ?? null,
        course_rating_back9: tee.course_rating_back9 ?? null,
        slope_women: tee.slope_women ?? null,
        course_rating_women: tee.course_rating_women ?? null,
        slope_women_front9: tee.slope_women_front9 ?? null,
        slope_women_back9: tee.slope_women_back9 ?? null,
        course_rating_women_front9: tee.course_rating_women_front9 ?? null,
        course_rating_women_back9: tee.course_rating_women_back9 ?? null,
        measure_unit: tee.measure_unit ?? null,
      }));

      const { data, error } = await supabase
        .from('tees')
        .insert(teesToInsert as never)
        .select();

      if (error) throw error;
      return (data as Tee[]) ?? [];
    },
    onSuccess: (_, variables) => {
      // Invalidate course's tees list
      queryClient.invalidateQueries({ queryKey: teeKeys.byCourse(variables.courseId) });
      queryClient.invalidateQueries({ queryKey: teeKeys.withCourse(variables.courseId) });
      // Also invalidate course details
      queryClient.invalidateQueries({ queryKey: courseKeys.detail(variables.courseId) });
    },
  });
}
