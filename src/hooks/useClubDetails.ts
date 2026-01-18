/**
 * useClubDetails - Hook for fetching single club with its courses
 *
 * Provides functionality for:
 * - Fetching a specific club by ID with all its courses
 * - Managing favorite status for courses at the club (via useFavoriteCourses)
 */

import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/services/supabase/client';
import { clubKeys } from '@/hooks/queryKeys';
import { useFavoriteEnrichment } from '@/hooks/useFavoriteCourses';
import type { Club, Course } from '@/types/database.types';
import type { CourseWithFavoriteStatus } from '@/hooks/useClubs';

// =====================================================
// TYPES
// =====================================================

/**
 * Club with its courses and favorite status
 */
export interface ClubWithCoursesDetail extends Club {
  courses: CourseWithFavoriteStatus[];
}

/**
 * @deprecated Use ClubWithCoursesDetail instead
 */
export type VenueWithCoursesDetail = ClubWithCoursesDetail;

// =====================================================
// HOOKS
// =====================================================

/**
 * Fetch a single club by ID with all its courses
 */
export function useClubDetails(clubId: string) {
  const { isFavorite, isLoading: favoritesLoading } = useFavoriteEnrichment();

  const query = useQuery({
    queryKey: clubKeys.detail(clubId),
    queryFn: async (): Promise<Omit<ClubWithCoursesDetail, 'courses'> & { courses: Course[] } | null> => {
      // Fetch club with its courses
      const { data: club, error: clubError } = await supabase
        .from('clubs')
        .select(
          `
          *,
          courses (*)
        `
        )
        .eq('id', clubId)
        .single();

      if (clubError) {
        if (clubError.code === 'PGRST116') {
          // No rows returned
          return null;
        }
        throw clubError;
      }

      if (!club) return null;

      // Cast club to any to avoid type issues with Supabase's dynamic select
      const clubData = club as Record<string, unknown>;

      return {
        id: clubData.id as string,
        source: clubData.source as Club['source'],
        golfapi_club_id: clubData.golfapi_club_id as string | null,
        name: clubData.name as string,
        state: clubData.state as Club['state'],
        country: clubData.country as string,
        city: clubData.city as string | null,
        postal_code: clubData.postal_code as string | null,
        continent: clubData.continent as string | null,
        address: clubData.address as string | null,
        phone: clubData.phone as string | null,
        email: clubData.email as string | null,
        website: clubData.website as string | null,
        latitude: clubData.latitude as number | null,
        longitude: clubData.longitude as number | null,
        location: clubData.location as Club['location'],
        total_holes: clubData.total_holes as number | null,
        last_synced: clubData.last_synced as string | null,
        created_at: clubData.created_at as string,
        updated_at: clubData.updated_at as string,
        courses: (clubData.courses ?? []) as Course[],
      };
    },
    enabled: !!clubId,
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

/**
 * @deprecated Use useClubDetails instead
 */
export const useVenueDetails = useClubDetails;

export default useClubDetails;
