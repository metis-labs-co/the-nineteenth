/**
 * useUpdateCourseHoles - Mutation hook for updating course holes
 *
 * Allows super admins to update hole data (par, stroke index, yardages)
 * for a course. Used by both ScorecardEntryScreen and CourseDetailScreen.
 */

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/services/supabase/client';
import { courseKeys, clubKeys } from '@/hooks/queryKeys';
import type { Hole } from '@/types/database/base';
import type { Course } from '@/types/database.types';

// =====================================================
// TYPES
// =====================================================

export interface UpdateCourseHolesInput {
  courseId: string;
  holes: Hole[];
}

// =====================================================
// MUTATION HOOK
// =====================================================

/**
 * Mutation hook to update course holes
 *
 * Updates the holes JSONB array for a course.
 * Invalidates course queries on success to refresh UI.
 *
 * @example
 * const updateHoles = useUpdateCourseHoles();
 *
 * // Update a single hole's par
 * const updatedHoles = holes.map(h =>
 *   h.number === 5 ? { ...h, par: 4 } : h
 * );
 * await updateHoles.mutateAsync({ courseId, holes: updatedHoles });
 */
export function useUpdateCourseHoles() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ courseId, holes }: UpdateCourseHolesInput): Promise<Course> => {
      // Type assertion needed because Supabase generated types may not include
      // JSONB fields like 'holes' in the update type
      // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Supabase generated types restriction workaround
      const { data, error } = await (supabase as any)
        .from('courses')
        .update({
          holes,
          updated_at: new Date().toISOString(),
        })
        .eq('id', courseId)
        .select()
        .single();

      if (error) throw error;
      if (!data) throw new Error('No data returned from update');
      return data;
    },
    onSuccess: (_, { courseId }) => {
      // Invalidate course-related queries to refresh UI
      queryClient.invalidateQueries({ queryKey: courseKeys.detail(courseId) });
      queryClient.invalidateQueries({ queryKey: courseKeys.all });
      queryClient.invalidateQueries({ queryKey: clubKeys.all });
    },
  });
}

export default useUpdateCourseHoles;
