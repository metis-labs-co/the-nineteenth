/**
 * useCoordinateBackfill - Auto-backfill GPS coordinates for courses missing them
 *
 * When a course has a golfapi_course_id but no coordinates in the database,
 * this hook automatically fetches them from GolfAPI.io in the background.
 *
 * Behavior:
 * - Non-blocking: does not affect screen load or interrupt the user
 * - Idempotent: won't re-fetch if already attempted for this courseId this session
 * - Silent failure: logs warning on error, never shows error UI
 * - Cache-aware: invalidates React Query coordinate caches on success
 *
 * Pattern follows useClubSync for auto-sync-on-mount.
 *
 * Created March 2026 for featured course coordinate backfill.
 */

import { useEffect, useRef } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { coordinateKeys } from '@/hooks/queryKeys';
import { courseService } from '@/services/courses';
import { hasApiQuota } from '@/services/sync';
import { useHasCoordinates } from '@/hooks/useHoleCoordinates';

// =====================================================
// MODULE-LEVEL DEDUP
// =====================================================

/**
 * Tracks courseIds that have been attempted (success or failure) this session.
 * Prevents duplicate fetches when user navigates between screens for the same course.
 * Resets on app restart, which is intentional — allows retry on next launch.
 */
const attemptedCourseIds = new Set<string>();

// =====================================================
// TYPES
// =====================================================

export interface UseCoordinateBackfillResult {
  /** Whether a backfill fetch is currently in progress */
  isBackfilling: boolean;
  /** Whether backfill was attempted (regardless of outcome) */
  wasAttempted: boolean;
  /**
   * Manually trigger a backfill for the current courseId, bypassing the
   * auto-trigger guards. Use for explicit user actions (e.g. a "retry"
   * button when the auto-attempt has already run).
   */
  triggerBackfill: () => void;
}

// =====================================================
// HOOK
// =====================================================

/**
 * Auto-backfill missing GPS coordinates from GolfAPI.io
 *
 * Drop this into any screen that displays coordinate-dependent features.
 * When coordinates are missing, it fetches them in the background and
 * invalidates React Query caches so the UI updates seamlessly.
 *
 * @param courseId - Internal course UUID (optional — no-op if undefined)
 * @returns Backfill state
 *
 * @example
 * ```tsx
 * function CourseScreen({ courseId }: { courseId: string }) {
 *   const { data: coordSummary } = useCoordinateSummary(courseId);
 *   useCoordinateBackfill(courseId);
 *   // coordSummary updates automatically when backfill completes
 * }
 * ```
 */
export function useCoordinateBackfill(
  courseId?: string
): UseCoordinateBackfillResult {
  const queryClient = useQueryClient();

  // Track if we've already triggered for this mount
  const hasAttempted = useRef(false);

  // Check if course already has coordinates
  const { data: hasCoordinates, isLoading: isCheckingCoordinates } =
    useHasCoordinates(courseId ?? '', { enabled: !!courseId });

  // Mutation for importing coordinates
  const backfillMutation = useMutation({
    mutationFn: async (id: string) => {
      return courseService.importCoordinatesForExistingCourse(id);
    },
    onSuccess: (count, id) => {
      if (count > 0) {
        // Invalidate all coordinate queries for this course
        queryClient.invalidateQueries({
          queryKey: coordinateKeys.byCourse(id),
        });
      }
    },
    onSettled: (_data, _error, id) => {
      // Mark as attempted regardless of outcome
      attemptedCourseIds.add(id);
    },
    onError: (error) => {
      console.warn('[useCoordinateBackfill] Backfill failed:', error);
    },
  });

  // Auto-backfill on mount when coordinates are missing
  useEffect(() => {
    if (hasAttempted.current) return;
    if (!courseId) return;
    if (isCheckingCoordinates) return;
    if (hasCoordinates !== false) return;
    if (attemptedCourseIds.has(courseId)) return;
    if (backfillMutation.isPending) return;
    if (!hasApiQuota()) return;

    hasAttempted.current = true;
    backfillMutation.mutate(courseId);
  }, [courseId, hasCoordinates, isCheckingCoordinates, backfillMutation]);

  // Reset per-instance flag when courseId changes
  useEffect(() => {
    hasAttempted.current = false;
  }, [courseId]);

  return {
    isBackfilling: backfillMutation.isPending,
    wasAttempted: !!courseId && attemptedCourseIds.has(courseId),
    triggerBackfill: () => {
      if (!courseId) return;
      if (backfillMutation.isPending) return;
      if (!hasApiQuota()) return;
      backfillMutation.mutate(courseId);
    },
  };
}

export default useCoordinateBackfill;
