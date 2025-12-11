/**
 * useCourseDetails - Hook for fetching single course with venue info
 *
 * Provides functionality for:
 * - Fetching a specific course by ID with its venue details
 * - Getting hole-by-hole breakdown
 * - Favorite status management
 */

import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/services/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { courseKeys } from '@/hooks/queryKeys';
import type { Course, Venue } from '@/types/database.types';

// =====================================================
// TYPES
// =====================================================

/**
 * Course with venue details and favorite status
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
  const { user } = useAuth();

  return useQuery({
    queryKey: courseKeys.detail(courseId),
    queryFn: async (): Promise<CourseWithVenueDetail | null> => {
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

      // Check if course is in user's favorites
      let isFavorite = false;
      if (user) {
        const { data: favorite, error: favError } = await supabase
          .from('favorite_courses')
          .select('id')
          .eq('player_id', user.id)
          .eq('course_id', courseId)
          .maybeSingle();

        if (!favError && favorite) {
          isFavorite = true;
        }
      }

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
        is_favorite: isFavorite,
      };
    },
    enabled: !!courseId,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
}

/**
 * Fetch courses by venue ID
 */
export function useCoursesByVenue(venueId: string) {
  const { user } = useAuth();

  return useQuery({
    queryKey: courseKeys.byVenue(venueId),
    queryFn: async () => {
      const { data: courses, error } = await supabase
        .from('courses')
        .select('*')
        .eq('venue_id', venueId)
        .order('name', { ascending: true });

      if (error) throw error;

      // Fetch user's favorite course IDs
      let favoriteIds: string[] = [];
      if (user) {
        const { data: favorites } = await supabase
          .from('favorite_courses')
          .select('course_id')
          .eq('player_id', user.id);

        if (favorites) {
          favoriteIds = favorites.map((f: { course_id: string }) => f.course_id);
        }
      }

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
          is_favorite: favoriteIds.includes(courseData.id as string),
        };
      });
    },
    enabled: !!venueId,
    staleTime: 5 * 60 * 1000,
  });
}

export default useCourseDetails;
