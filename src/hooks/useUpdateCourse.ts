/**
 * useUpdateCourse - Mutation hook for updating course metadata
 *
 * Allows super admins to update course fields (name, description, ratings).
 * Used by EditCourseBottomSheet on CourseDetailScreen.
 */

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/services/supabase/client';
import { courseKeys, venueKeys } from '@/hooks/queryKeys';
import type { Course } from '@/types/database.types';

export interface UpdateCourseInput {
  courseId: string;
  name?: string;
  description?: string | null;
  slope_rating?: number | null;
  course_rating?: number | null;
}

export function useUpdateCourse() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ courseId, ...updates }: UpdateCourseInput): Promise<Course> => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Supabase generated types restriction workaround
      const { data, error } = await (supabase as any)
        .from('courses')
        .update({
          ...updates,
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
      queryClient.invalidateQueries({ queryKey: courseKeys.detail(courseId) });
      queryClient.invalidateQueries({ queryKey: courseKeys.all });
      queryClient.invalidateQueries({ queryKey: venueKeys.all });
    },
  });
}
