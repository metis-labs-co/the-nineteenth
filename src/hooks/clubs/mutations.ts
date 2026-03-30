/**
 * Club Hooks - Mutation Hooks
 *
 * TanStack Query mutation hooks for modifying club and course data.
 *
 * Hooks:
 * - useCreateClub: Create a new club
 * - useCreateCourse: Create a course at a club
 * - useCreateClubWithCourse: Create club and course together
 * - useDeleteClubIfEmpty: Delete a club only if it has zero courses
 */

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/services/supabase/client';
import { clubKeys, courseKeys } from '@/hooks/queryKeys';
import type { Club, Course } from '@/types/database.types';
import type { CreateClubInput, CreateClubCourseInput } from './types';

// =====================================================
// MUTATION HOOKS
// =====================================================

/**
 * Create a new club
 */
export function useCreateClub() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: CreateClubInput): Promise<Club> => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Supabase generated types restriction workaround
      const { data, error } = await (supabase as any)
        .from('clubs')
        .insert({
          name: input.name,
          state: input.state ?? null,
          city: input.city ?? null,
          address: input.address ?? null,
          total_holes: input.total_holes ?? 18,
          source: 'manual',
        })
        .select()
        .single();

      if (error) throw error;
      if (!data) throw new Error('No data returned from insert');
      return data as Club;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: clubKeys.all });
    },
  });
}

/**
 * Create a new course at a club
 */
export function useCreateCourse() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: CreateClubCourseInput): Promise<Course> => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Supabase generated types restriction workaround
      const { data, error } = await (supabase as any)
        .from('courses')
        .insert({
          club_id: input.club_id,
          name: input.name,
          description: input.description ?? null,
          holes: input.holes ?? [],
          tees: input.tees ?? null,
          slope_rating: input.slope_rating ?? null,
          course_rating: input.course_rating ?? null,
          num_holes: input.num_holes ?? 18,
        })
        .select()
        .single();

      if (error) throw error;
      if (!data) throw new Error('No data returned from insert');
      return data as Course;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: clubKeys.all });
      queryClient.invalidateQueries({ queryKey: courseKeys.all });
    },
  });
}

/**
 * Create club and course together (convenience hook)
 * Useful for manual entry where you want to create both at once
 */
export function useCreateClubWithCourse() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: {
      club: CreateClubInput;
      course?: Partial<CreateClubCourseInput>;
    }): Promise<{ club: Club; course: Course }> => {
      // Create club first
      // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Supabase generated types restriction workaround
      const { data: club, error: clubError } = await (supabase as any)
        .from('clubs')
        .insert({
          name: input.club.name,
          state: input.club.state ?? null,
          city: input.club.city ?? null,
          address: input.club.address ?? null,
          total_holes: input.club.total_holes ?? 18,
          source: 'manual',
        })
        .select()
        .single();

      if (clubError) throw clubError;
      if (!club) throw new Error('No club data returned from insert');

      // Create default course at club
      const courseName = input.course?.name || input.club.name;
      // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Supabase generated types restriction workaround
      const { data: course, error: courseError } = await (supabase as any)
        .from('courses')
        .insert({
          club_id: club.id,
          name: courseName,
          description: input.course?.description ?? null,
          holes: input.course?.holes ?? [],
          tees: input.course?.tees ?? null,
          slope_rating: input.course?.slope_rating ?? null,
          course_rating: input.course?.course_rating ?? null,
          num_holes: input.course?.num_holes ?? 18,
        })
        .select()
        .single();

      if (courseError) throw courseError;
      if (!course) throw new Error('No course data returned from insert');

      return { club: club as Club, course: course as Course };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: clubKeys.all });
      queryClient.invalidateQueries({ queryKey: courseKeys.all });
    },
  });
}

/**
 * Delete a club only if it has zero remaining courses
 * Used for orphan club cleanup after course deletion
 */
export function useDeleteClubIfEmpty() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (clubId: string): Promise<{ deleted: boolean }> => {
      // Check if club has any remaining courses
      // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Supabase generated types restriction workaround
      const { count, error: countError } = await (supabase as any)
        .from('courses')
        .select('id', { count: 'exact', head: true })
        .eq('club_id', clubId);

      if (countError) {
        throw new Error(`Failed to check courses: ${countError.message}`);
      }

      if (count > 0) {
        return { deleted: false };
      }

      // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Supabase generated types restriction workaround
      const { error: deleteError } = await (supabase as any)
        .from('clubs')
        .delete()
        .eq('id', clubId);

      if (deleteError) {
        throw new Error(`Failed to delete club: ${deleteError.message}`);
      }

      return { deleted: true };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: clubKeys.all });
    },
  });
}
