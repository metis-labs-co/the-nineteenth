/**
 * useUpdateCourseHoles - Mutation hook for updating course holes
 *
 * Allows super admins to update hole data (par, stroke index, yardages)
 * for a course. Used by both ScorecardEntryScreen and CourseDetailScreen.
 */

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/services/supabase/client';
import { courseKeys, venueKeys } from '@/hooks/queryKeys';
import type { Hole } from '@/types/database/base';

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
    mutationFn: async ({ courseId, holes }: UpdateCourseHolesInput) => {
      // Use 'as any' for the table reference because Supabase generated types
      // may not include JSONB fields like 'holes' in the update type
      const { data, error } = await (supabase.from('courses') as any)
        .update({
          holes,
          updated_at: new Date().toISOString(),
        })
        .eq('id', courseId)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: (_, { courseId }) => {
      // Invalidate course-related queries to refresh UI
      queryClient.invalidateQueries({ queryKey: courseKeys.detail(courseId) });
      queryClient.invalidateQueries({ queryKey: courseKeys.all });
      queryClient.invalidateQueries({ queryKey: venueKeys.all });
    },
  });
}

export default useUpdateCourseHoles;
