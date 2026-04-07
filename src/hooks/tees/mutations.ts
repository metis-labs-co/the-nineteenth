/**
 * Tee Mutation Hooks
 *
 * TanStack Query mutation hooks for creating, updating, and deleting tees.
 *
 * ### Mutation Hooks
 * - `useCreateTee()` - Create a new tee
 * - `useUpdateTee()` - Update an existing tee
 * - `useDeleteTee()` - Delete a tee
 * - `useBulkCreateTees()` - Bulk create tees for a course (API import)
 *
 * Added January 2026 for GolfAPI.io integration
 */

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/services/supabase/client';
import { teeKeys, courseKeys } from '@/hooks/queryKeys';
import type { Tee } from '@/types/database.types';
import type { CreateTeeInput, UpdateTeeInput } from './types';

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
