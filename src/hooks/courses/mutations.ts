/**
 * Course Hooks - Mutation Hooks
 *
 * TanStack Query mutation hooks for modifying course data.
 *
 * Hooks:
 * - useDeleteCourse: Delete a manually-created course
 * - useUpdateCourse: Update course metadata
 * - useUpdateCourseHoles: Update course hole data
 */

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/services/supabase/client';
import { courseKeys, clubKeys, favoriteKeys, teeKeys, coordinateKeys } from '@/hooks/queryKeys';
import type { Hole } from '@/types/database/base';
import type { Course } from '@/types/database.types';

// =====================================================
// TYPES (from useDeleteCourse)
// =====================================================

export interface DeleteCourseInput {
  /** The course ID to delete */
  courseId: string;
  /** The club ID this course belongs to (for orphan club cleanup) */
  clubId?: string;
}

export interface DeleteCourseResult {
  success: boolean;
  courseId: string;
  /** Whether the parent club was also deleted (had no other courses) */
  clubDeleted: boolean;
}

// =====================================================
// TYPES (from useUpdateCourse)
// =====================================================

export interface UpdateCourseInput {
  courseId: string;
  name?: string;
  description?: string | null;
  slope_rating?: number | null;
  course_rating?: number | null;
}

// =====================================================
// TYPES (from useUpdateCourseHoles)
// =====================================================

export interface UpdateCourseHolesInput {
  courseId: string;
  holes: Hole[];
}

// =====================================================
// SERVICE FUNCTION (from useDeleteCourse)
// =====================================================

/**
 * Delete a manually-created course and its associated data
 *
 * Deletion order:
 * 1. hole_coordinates (FK to courses)
 * 2. tees (FK to courses)
 * 3. course_favorites (FK to courses)
 * 4. courses (rounds get course_id = NULL via ON DELETE SET NULL)
 * 5. If club has no other courses, delete the orphan club
 */
async function deleteCourse(
  courseId: string,
  clubId?: string
): Promise<DeleteCourseResult> {
  // Step 1: Delete hole coordinates
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { error: coordError } = await (supabase as any)
    .from('hole_coordinates')
    .delete()
    .eq('course_id', courseId);

  if (coordError) {
    console.warn('[deleteCourse] Failed to delete hole_coordinates:', coordError);
    // Continue - these may not exist
  }

  // Step 2: Delete tees
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { error: teeError } = await (supabase as any)
    .from('tees')
    .delete()
    .eq('course_id', courseId);

  if (teeError) {
    console.warn('[deleteCourse] Failed to delete tees:', teeError);
  }

  // Step 3: Delete course favorites
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { error: favError } = await (supabase as any)
    .from('course_favorites')
    .delete()
    .eq('course_id', courseId);

  if (favError) {
    console.warn('[deleteCourse] Failed to delete course_favorites:', favError);
  }

  // Step 4: Delete the course itself
  const { error: courseError } = await supabase
    .from('courses')
    .delete()
    .eq('id', courseId);

  if (courseError) {
    console.error('[deleteCourse] Failed to delete course:', courseError);
    throw new Error(`Failed to delete course: ${courseError.message}`);
  }

  // Step 5: Check if the parent club has any remaining courses; if not, delete it
  let clubDeleted = false;
  if (clubId) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { count, error: countError } = await (supabase as any)
      .from('courses')
      .select('id', { count: 'exact', head: true })
      .eq('club_id', clubId);

    if (countError) {
      console.warn('[deleteCourse] Failed to check remaining courses:', countError);
    } else if (count === 0) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { error: clubError } = await (supabase as any)
        .from('clubs')
        .delete()
        .eq('id', clubId);

      if (clubError) {
        console.warn('[deleteCourse] Failed to delete orphan club:', clubError);
      } else {
        clubDeleted = true;
      }
    }
  }

  return {
    success: true,
    courseId,
    clubDeleted,
  };
}

// =====================================================
// HOOKS
// =====================================================

/**
 * Mutation hook to delete a manually-created course
 *
 * Handles deletion and cache invalidation for courses and related data.
 *
 * @example
 * ```tsx
 * const { mutate: deleteCourse, isPending } = useDeleteCourse();
 *
 * const handleDelete = () => {
 *   deleteCourse(
 *     { courseId: course.id, clubId: course.club?.id },
 *     {
 *       onSuccess: () => navigation.goBack(),
 *       onError: (error) => showAlert('Error', error.message),
 *     }
 *   );
 * };
 * ```
 */
export function useDeleteCourse() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: DeleteCourseInput): Promise<DeleteCourseResult> => {
      return deleteCourse(input.courseId, input.clubId);
    },

    onSuccess: (_, variables) => {
      // Remove the specific course from cache
      queryClient.removeQueries({
        queryKey: courseKeys.detail(variables.courseId),
      });

      // Invalidate course lists
      queryClient.invalidateQueries({
        queryKey: courseKeys.all,
      });

      // Invalidate favorites (course may have been a favorite)
      queryClient.invalidateQueries({
        queryKey: favoriteKeys.all,
      });

      // Invalidate tees for this course
      if (variables.courseId) {
        queryClient.removeQueries({
          queryKey: teeKeys.byCourse(variables.courseId),
        });
        queryClient.removeQueries({
          queryKey: coordinateKeys.byCourse(variables.courseId),
        });
      }

      // Invalidate club queries (club list may change if club was also deleted)
      queryClient.invalidateQueries({
        queryKey: clubKeys.all,
      });
    },

    onError: (error) => {
      console.error('[useDeleteCourse] Failed to delete course:', error);
    },
  });
}

/**
 * Mutation hook for updating course metadata
 *
 * Allows super admins to update course fields (name, description, ratings).
 * Used by EditCourseBottomSheet on CourseDetailScreen.
 */
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
      queryClient.invalidateQueries({ queryKey: clubKeys.all });
    },
  });
}

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
