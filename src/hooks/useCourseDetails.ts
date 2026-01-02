/**
 * useCourseDetails - Hook for fetching single course with venue info
 *
 * Provides functionality for:
 * - Fetching a specific course by ID with its venue details
 * - Getting hole-by-hole breakdown
 * - Favorite status management (via useFavoriteCourses)
 */

import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/services/supabase/client';
import { courseKeys } from '@/hooks/queryKeys';
import { useFavoriteEnrichment, useIsFavorite } from '@/hooks/useFavoriteCourses';
import type { Course, Venue } from '@/types/database.types';

// =====================================================
// TYPES
// =====================================================

/**
 * Course with venue details and favorite status
 * Note: Home status is now at venue level, use useHomeVenue() to check
 */
export interface CourseWithVenueDetail extends Course {
  venue: Venue;
  is_favorite: boolean;
}

// =====================================================
// HOOKS
// =====================================================

/**
 * Fetch a single course by ID with its venue
 */
export function useCourseDetails(courseId: string) {
  const isFavorite = useIsFavorite(courseId);

  const query = useQuery({
    queryKey: courseKeys.detail(courseId),
    queryFn: async (): Promise<Omit<CourseWithVenueDetail, 'is_favorite'> | null> => {
      // Fetch course with its venue
      const { data: course, error: courseError } = await supabase
        .from('courses')
        .select(
          `
          *,
          venue:venue_id (*)
        `
        )
        .eq('id', courseId)
        .single();

      if (courseError) {
        if (courseError.code === 'PGRST116') {
          // No rows returned
          return null;
        }
        throw courseError;
      }

      if (!course) return null;

      // Cast course to any to avoid type issues with Supabase's dynamic select
      const courseData = course as Record<string, unknown>;

      return {
        id: courseData.id as string,
        venue_id: courseData.venue_id as string,
        name: courseData.name as string,
        description: courseData.description as string | null,
        holes: courseData.holes as Course['holes'],
        tees: courseData.tees as Course['tees'],
        slope_rating: courseData.slope_rating as number | null,
        course_rating: courseData.course_rating as number | null,
        created_at: courseData.created_at as string,
        updated_at: courseData.updated_at as string,
        venue: courseData.venue as Venue,
      };
    },
    enabled: !!courseId,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });

  // Add favorite status from centralized hook
  const data = query.data
    ? {
        ...query.data,
        is_favorite: isFavorite,
      }
    : null;

  return {
    ...query,
    data,
  };
}

/**
 * Fetch courses by venue ID
 *
 * @deprecated Use useVenueDetails() instead which returns courses as part of
 * the venue data. This hook duplicates functionality and is not used anywhere
 * in the codebase.
 */
export function useCoursesByVenue(venueId: string) {
  const { isFavorite, isLoading: favoritesLoading } = useFavoriteEnrichment();

  const query = useQuery({
    queryKey: courseKeys.byVenue(venueId),
    queryFn: async () => {
      const { data: courses, error } = await supabase
        .from('courses')
        .select('*')
        .eq('venue_id', venueId)
        .order('name', { ascending: true });

      if (error) throw error;

      return (courses ?? []).map((course) => {
        const courseData = course as Record<string, unknown>;
        return {
          id: courseData.id as string,
          venue_id: courseData.venue_id as string,
          name: courseData.name as string,
          description: courseData.description as string | null,
          holes: courseData.holes as Course['holes'],
          tees: courseData.tees as Course['tees'],
          slope_rating: courseData.slope_rating as number | null,
          course_rating: courseData.course_rating as number | null,
          created_at: courseData.created_at as string,
          updated_at: courseData.updated_at as string,
        };
      });
    },
    enabled: !!venueId,
    staleTime: 5 * 60 * 1000,
  });

  // Add favorite status from centralized hook
  const data = query.data?.map((course) => ({
    ...course,
    is_favorite: isFavorite(course.id),
  }));

  return {
    ...query,
    data,
    isLoading: query.isLoading || favoritesLoading,
  };
}

export default useCourseDetails;
