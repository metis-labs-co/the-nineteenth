/**
 * useImportClub - Hook for importing clubs from GolfAPI.io
 *
 * Used when a user selects a search result that is from the API (not yet in local DB).
 * Imports the club with all its courses and tees, then invalidates relevant queries.
 */

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { courseService, type ImportClubResult } from '@/services/courses';
import { clubKeys, courseKeys } from '@/hooks/queryKeys';

/**
 * Mutation hook for importing a club from GolfAPI.io
 *
 * @example
 * ```tsx
 * const importClub = useImportClub();
 *
 * const handleSelectApiResult = async (item: GolfApiSearchResultItem) => {
 *   try {
 *     const result = await importClub.mutateAsync(item.golfapi_club_id);
 *     navigation.navigate('Club', { clubId: result.club.id });
 *   } catch (error) {
 *     showToast({ type: 'error', message: 'Failed to import course' });
 *   }
 * };
 * ```
 */
export function useImportClub() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (golfapiClubId: string): Promise<ImportClubResult> => {
      return courseService.importClubWithCourses(golfapiClubId);
    },
    onSuccess: () => {
      // Invalidate club and course queries so lists refresh with the new data
      queryClient.invalidateQueries({ queryKey: clubKeys.all });
      queryClient.invalidateQueries({ queryKey: courseKeys.all });
    },
  });
}

// Re-export the result type for convenience
export type { ImportClubResult };
