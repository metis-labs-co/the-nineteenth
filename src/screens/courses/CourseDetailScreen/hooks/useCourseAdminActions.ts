/**
 * useCourseAdminActions - Super admin editing handlers for course, holes, and tees
 *
 * Encapsulates all admin-only mutation logic and editing state for the course detail screen.
 */

import { useCallback, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { useIsSuperAdmin } from '@/store/subscriptionStore';
import { useUpdateCourseHoles, useDeleteCourse } from '@/hooks';
import { useUpdateCourse } from '@/hooks/useUpdateCourse';
import { useUpdateTee } from '@/hooks/useTees';
import { supabase } from '@/services/supabase/client';
import { courseService } from '@/services/courses/courseService';
import { clubKeys, courseKeys, teeKeys } from '@/hooks/queryKeys';
import { resolveTeeYardageKey } from '@/utils/holeTransformers';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { RootStackParamList } from '@/navigation/types';
import type { Hole, TeeBox } from '@/types/database.types';
import type { Tee } from '@/types/database.types';
import type { DialogConfig } from '@/hooks/useConfirmationDialog';

interface CourseData {
  id: string;
  holes?: Hole[];
  golfapi_course_id?: string | null;
  teesFromTable?: Tee[];
  club?: { id: string } | null;
}

interface UseCourseAdminActionsOptions {
  course: CourseData | null | undefined;
  selectedTee: TeeBox | null;
  refetch: () => void;
  refetchCoords: () => void;
  navigation: NativeStackNavigationProp<RootStackParamList, 'Course'>;
  showAlert: (title: string, message: string) => void;
  showDialog: (config: Omit<DialogConfig, 'visible'>) => void;
  dismissDialog: () => void;
}

export function useCourseAdminActions({
  course,
  selectedTee,
  refetch,
  refetchCoords,
  navigation,
  showAlert,
  showDialog,
  dismissDialog,
}: UseCourseAdminActionsOptions) {
  const isSuperAdmin = useIsSuperAdmin();
  const queryClient = useQueryClient();

  // Editing state
  const [editingHole, setEditingHole] = useState<Hole | null>(null);
  const [isEditingCourse, setIsEditingCourse] = useState(false);
  const [editingTee, setEditingTee] = useState<Tee | null>(null);
  const [isRefreshingFromApi, setIsRefreshingFromApi] = useState(false);

  // Mutations
  const updateCourseHolesMutation = useUpdateCourseHoles();
  const updateCourseMutation = useUpdateCourse();
  const updateTeeMutation = useUpdateTee();
  const deleteCourseMutation = useDeleteCourse();

  // Hole editing
  const handleHolePress = useCallback(
    (hole: Hole) => {
      if (isSuperAdmin) {
        setEditingHole(hole);
      }
    },
    [isSuperAdmin]
  );

  const handleSaveHole = useCallback(
    async (updatedHole: Hole) => {
      if (!course?.holes) return;

      const updatedHoles = course.holes.map((h) =>
        h.number === updatedHole.number ? updatedHole : h
      );

      try {
        // Update the tees table FIRST if it has per-hole distance data.
        // This must happen before the JSONB save because the mutation's onSuccess
        // invalidates course queries and triggers a refetch — if tees aren't updated
        // yet, hydrateHolesWithTeeYardages overwrites the JSONB edits with stale data.
        if (course.teesFromTable && course.teesFromTable.length > 0 && updatedHole.yardages) {
          const lengthColumn = `length_hole_${updatedHole.number}`;

          for (const tee of course.teesFromTable) {
            const teeKey = resolveTeeYardageKey(tee.color, tee.name);
            const newDistance = updatedHole.yardages[teeKey];

            if (newDistance !== undefined) {
              await supabase
                .from('tees')
                .update({ [lengthColumn]: newDistance } as never)
                .eq('id', tee.id);
            }
          }
        }

        // Now save to courses.holes JSONB (triggers onSuccess → query invalidation → refetch)
        await updateCourseHolesMutation.mutateAsync({
          courseId: course.id,
          holes: updatedHoles,
        });

        setEditingHole(null);
      } catch {
        showAlert('Error', 'Failed to save hole data. Please try again.');
      }
    },
    [course, updateCourseHolesMutation, showAlert]
  );

  // Course editing
  const handleSaveCourse = useCallback(
    async (updates: { name: string; description: string; slope_rating: string; course_rating: string }) => {
      if (!course) return;
      try {
        await updateCourseMutation.mutateAsync({
          courseId: course.id,
          name: updates.name,
          description: updates.description || null,
          slope_rating: updates.slope_rating ? parseFloat(updates.slope_rating) : null,
          course_rating: updates.course_rating ? parseFloat(updates.course_rating) : null,
        });
        refetch();
        setIsEditingCourse(false);
      } catch {
        showAlert('Error', 'Failed to update course. Please try again.');
      }
    },
    [course, updateCourseMutation, refetch, showAlert]
  );

  // Tee editing
  const handleSaveTee = useCallback(
    async (teeId: string, updates: { name?: string; color?: string | null; slope?: number | null; course_rating?: number | null; slope_women?: number | null; course_rating_women?: number | null }) => {
      try {
        await updateTeeMutation.mutateAsync({ id: teeId, ...updates });
        refetch();
        setEditingTee(null);
      } catch {
        showAlert('Error', 'Failed to update tee. Please try again.');
      }
    },
    [updateTeeMutation, refetch, showAlert]
  );

  const handleTeeEditPress = useCallback(() => {
    if (!isSuperAdmin || !course?.teesFromTable || !selectedTee) return;
    const teeRecord = course.teesFromTable.find(
      (t) => t.name === selectedTee.name || t.color === selectedTee.color
    );
    if (teeRecord) setEditingTee(teeRecord);
  }, [isSuperAdmin, course?.teesFromTable, selectedTee]);

  // API refresh
  const handleRefreshFromApi = useCallback(async () => {
    if (isRefreshingFromApi) return;

    if (!course?.golfapi_course_id) {
      showAlert('Cannot Refresh', 'This course was not imported from the Golf API.');
      return;
    }

    setIsRefreshingFromApi(true);
    try {
      const result = await courseService.importCourse(course.golfapi_course_id);
      await refetch();
      await refetchCoords();

      // Invalidate parent list queries so course list and club detail screens pick up changes
      queryClient.invalidateQueries({ queryKey: courseKeys.lists() });
      queryClient.invalidateQueries({ queryKey: clubKeys.withCourses() });
      if (course.club?.id) {
        queryClient.invalidateQueries({ queryKey: clubKeys.detail(course.club.id) });
      }

      const messages = ['Course data refreshed from Golf API.'];
      if (result.coordinatesImported > 0) {
        messages.push(`GPS coordinates imported: ${result.coordinatesImported} points`);
      }

      showAlert('Success', messages.join('\n'));
    } catch (error) {
      console.error('[useCourseAdminActions] Failed to refresh from API:', error);
      showAlert('Error', 'Failed to refresh course data. Please try again.');
    } finally {
      setIsRefreshingFromApi(false);
    }
  }, [course?.golfapi_course_id, refetch, refetchCoords, isRefreshingFromApi, showAlert]);

  // Delete course
  const handleDeleteCourse = useCallback(() => {
    if (!course || course.golfapi_course_id) return;

    showDialog({
      title: 'Delete Course',
      message:
        'This course and its hole data will be permanently removed. Rounds that used this course will keep their scores but lose the course reference.',
      confirmLabel: 'Delete',
      confirmVariant: 'destructive',
      icon: 'trash-can-outline',
      onConfirm: () => {
        dismissDialog();
        deleteCourseMutation.mutate(
          { courseId: course.id, clubId: course.club?.id },
          {
            onSuccess: () => {
              navigation.goBack();
            },
            onError: (error) => {
              showAlert(
                'Error',
                error instanceof Error ? error.message : 'Failed to delete course'
              );
            },
          }
        );
      },
    });
  }, [course, showDialog, dismissDialog, deleteCourseMutation, navigation, showAlert]);

  return {
    isSuperAdmin,
    // Hole editing
    editingHole,
    setEditingHole,
    handleHolePress,
    handleSaveHole,
    updateCourseHolesMutation,
    // Course editing
    isEditingCourse,
    setIsEditingCourse,
    handleSaveCourse,
    updateCourseMutation,
    // Tee editing
    editingTee,
    setEditingTee,
    handleSaveTee,
    handleTeeEditPress,
    updateTeeMutation,
    // API refresh
    isRefreshingFromApi,
    handleRefreshFromApi,
    // Delete
    handleDeleteCourse,
  };
}
