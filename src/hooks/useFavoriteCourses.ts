/**
 * useFavoriteCourses - Centralized hook for favorite course management
 *
 * Provides:
 * - useFavoriteCourseIds() - Query for user's favorite course IDs
 * - useAddFavorite() - Mutation to add a course to favorites
 * - useRemoveFavorite() - Mutation to remove a course from favorites
 * - useIsFavorite() - Helper to check if a course is favorited
 * - useEnrichWithFavorites() - Helper to add is_favorite to course arrays
 *
 * This hook consolidates favorite course logic that was previously
 * duplicated across useCourses, useVenues, useCourseDetails, and useVenueDetails.
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/services/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { favoriteKeys, courseKeys, venueKeys } from '@/hooks/queryKeys';
import type { Course } from '@/types/database.types';

// =====================================================
// TYPES
// =====================================================

/**
 * Row type for favorite_courses table
 */
interface FavoriteCourseRow {
  course_id: string;
}

/**
 * Course with favorite status enrichment
 */
export interface CourseWithFavorite extends Course {
  is_favorite: boolean;
}

// =====================================================
// QUERY HOOKS
// =====================================================

/**
 * Fetch user's favorite course IDs
 *
 * Returns an array of course IDs that the user has favorited.
 * Returns empty array if user is not authenticated.
 *
 * @example
 * const { data: favoriteIds } = useFavoriteCourseIds();
 * const isFavorite = favoriteIds?.includes(courseId);
 */
export function useFavoriteCourseIds() {
  const { user } = useAuth();

  return useQuery({
    queryKey: favoriteKeys.list(user?.id),
    queryFn: async (): Promise<string[]> => {
      if (!user) return [];

      const { data: favorites, error } = await supabase
        .from('favorite_courses')
        .select('course_id')
        .eq('player_id', user.id);

      if (error) {
        console.warn('Error fetching favorite courses:', error);
        return [];
      }

      return (favorites as FavoriteCourseRow[] | null)?.map((f) => f.course_id) ?? [];
    },
    enabled: !!user,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
}

// =====================================================
// MUTATION HOOKS
// =====================================================

/**
 * Add a course to favorites
 *
 * Uses upsert to handle race conditions where favorite might already exist.
 *
 * @example
 * const addFavorite = useAddFavorite();
 * addFavorite.mutate(courseId);
 */
export function useAddFavorite() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (courseId: string) => {
      if (!user) throw new Error('Must be logged in to add favorites');

      // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Supabase generated types workaround
      const { error } = await (supabase as any).from('favorite_courses').upsert(
        {
          player_id: user.id,
          course_id: courseId,
        },
        {
          onConflict: 'player_id,course_id',
          ignoreDuplicates: true,
        }
      );

      if (error) throw error;
      return courseId;
    },
    onSuccess: () => {
      // Invalidate all favorite-related queries
      queryClient.invalidateQueries({ queryKey: favoriteKeys.all });
      // Also invalidate course and venue queries that include favorite status
      queryClient.invalidateQueries({ queryKey: courseKeys.all });
      queryClient.invalidateQueries({ queryKey: venueKeys.all });
    },
  });
}

/**
 * Remove a course from favorites
 *
 * @example
 * const removeFavorite = useRemoveFavorite();
 * removeFavorite.mutate(courseId);
 */
export function useRemoveFavorite() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (courseId: string) => {
      if (!user) throw new Error('Must be logged in to remove favorites');

      const { error } = await supabase
        .from('favorite_courses')
        .delete()
        .eq('player_id', user.id)
        .eq('course_id', courseId);

      if (error) throw error;
      return courseId;
    },
    onSuccess: () => {
      // Invalidate all favorite-related queries
      queryClient.invalidateQueries({ queryKey: favoriteKeys.all });
      // Also invalidate course and venue queries that include favorite status
      queryClient.invalidateQueries({ queryKey: courseKeys.all });
      queryClient.invalidateQueries({ queryKey: venueKeys.all });
    },
  });
}

/**
 * Toggle a course's favorite status
 *
 * Convenience mutation that adds or removes based on current state.
 *
 * @example
 * const toggleFavorite = useToggleFavorite();
 * toggleFavorite.mutate({ courseId, isFavorite: true }); // Will remove
 * toggleFavorite.mutate({ courseId, isFavorite: false }); // Will add
 */
export function useToggleFavorite() {
  const addFavorite = useAddFavorite();
  const removeFavorite = useRemoveFavorite();

  return useMutation({
    mutationFn: async ({ courseId, isFavorite }: { courseId: string; isFavorite: boolean }) => {
      if (isFavorite) {
        return removeFavorite.mutateAsync(courseId);
      } else {
        return addFavorite.mutateAsync(courseId);
      }
    },
  });
}

// =====================================================
// HELPER HOOKS
// =====================================================

/**
 * Check if a specific course is favorited
 *
 * @example
 * const isFavorite = useIsFavorite(courseId);
 */
export function useIsFavorite(courseId: string): boolean {
  const { data: favoriteIds } = useFavoriteCourseIds();
  return favoriteIds?.includes(courseId) ?? false;
}

/**
 * Hook to get favorite IDs for enriching course data
 *
 * Returns a Set for O(1) lookup performance and a helper function.
 *
 * @example
 * const { favoriteIds, isFavorite, enrichCourses } = useFavoriteEnrichment();
 * const enrichedCourses = enrichCourses(courses);
 */
export function useFavoriteEnrichment() {
  const { data: favoriteIds = [], isLoading, error } = useFavoriteCourseIds();
  const favoriteSet = new Set(favoriteIds);

  const isFavorite = (courseId: string): boolean => {
    return favoriteSet.has(courseId);
  };

  const enrichCourses = <T extends { id: string }>(
    courses: T[]
  ): (T & { is_favorite: boolean })[] => {
    return courses.map((course) => ({
      ...course,
      is_favorite: favoriteSet.has(course.id),
    }));
  };

  return {
    favoriteIds,
    favoriteSet,
    isFavorite,
    enrichCourses,
    isLoading,
    error,
  };
}
