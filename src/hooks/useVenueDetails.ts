/**
 * useVenueDetails - Hook for fetching single venue with its courses
 *
 * Provides functionality for:
 * - Fetching a specific venue by ID with all its courses
 * - Managing favorite status for courses at the venue (via useFavoriteCourses)
 */

import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/services/supabase/client';
import { venueKeys } from '@/hooks/queryKeys';
import { useFavoriteEnrichment } from '@/hooks/useFavoriteCourses';
import type { Venue, Course } from '@/types/database.types';
import type { CourseWithFavoriteStatus } from '@/hooks/useVenues';

// =====================================================
// TYPES
// =====================================================

/**
 * Venue with its courses and favorite status
 */
export interface VenueWithCoursesDetail extends Venue {
  courses: CourseWithFavoriteStatus[];
}

// =====================================================
// HOOKS
// =====================================================

/**
 * Fetch a single venue by ID with all its courses
 */
export function useVenueDetails(venueId: string) {
  const { isFavorite, isLoading: favoritesLoading } = useFavoriteEnrichment();

  const query = useQuery({
    queryKey: venueKeys.detail(venueId),
    queryFn: async (): Promise<Omit<VenueWithCoursesDetail, 'courses'> & { courses: Course[] } | null> => {
      // Fetch venue with its courses
      const { data: venue, error: venueError } = await supabase
        .from('venues')
        .select(
          `
          *,
          courses (*)
        `
        )
        .eq('id', venueId)
        .single();

      if (venueError) {
        if (venueError.code === 'PGRST116') {
          // No rows returned
          return null;
        }
        throw venueError;
      }

      if (!venue) return null;

      // Cast venue to any to avoid type issues with Supabase's dynamic select
      const venueData = venue as Record<string, unknown>;

      return {
        id: venueData.id as string,
        source: venueData.source as Venue['source'],
        api_id: venueData.api_id as string | null,
        name: venueData.name as string,
        state: venueData.state as Venue['state'],
        city: venueData.city as string | null,
        address: venueData.address as string | null,
        phone: venueData.phone as string | null,
        email: venueData.email as string | null,
        website: venueData.website as string | null,
        location: venueData.location as Venue['location'],
        total_holes: venueData.total_holes as number | null,
        last_synced: venueData.last_synced as string | null,
        created_at: venueData.created_at as string,
        updated_at: venueData.updated_at as string,
        courses: (venueData.courses ?? []) as Course[],
      };
    },
    enabled: !!venueId,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });

  // Transform courses to include favorite status from centralized hook
  const data = query.data
    ? {
        ...query.data,
        courses: query.data.courses.map((course: Course) => ({
          ...course,
          is_favorite: isFavorite(course.id),
        })),
      }
    : null;

  return {
    ...query,
    data,
    isLoading: query.isLoading || favoritesLoading,
  };
}

export default useVenueDetails;
