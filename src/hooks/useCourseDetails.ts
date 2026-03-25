/**
 * useCourseDetails - Hook for fetching single course with club info
 *
 * Provides functionality for:
 * - Fetching a specific course by ID with its club details
 * - Optionally fetching tees from the tees table
 * - Getting hole-by-hole breakdown
 * - Favorite status management (via useFavoriteCourses)
 *
 * Updated January 2026 for tees table migration
 */

import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/services/supabase/client';
import { courseKeys } from '@/hooks/queryKeys';
import { useFavoriteEnrichment, useIsFavorite } from '@/hooks/useFavoriteCourses';
import { parseAndTransformHoles } from '@/utils/holeTransformers';
import type { Course, Club, Tee } from '@/types/database.types';

// =====================================================
// TYPES
// =====================================================

/**
 * Options for useCourseDetails hook
 */
export interface UseCourseDetailsOptions {
  /** Include tees from the tees table (default: false for backward compatibility) */
  includeTees?: boolean;
  /** Enable/disable the query */
  enabled?: boolean;
}

/**
 * Course with club details, tees from table, and favorite status
 * Note: Home status is now at club level, use useHomeClub() to check
 */
export interface CourseWithDetails extends Course {
  club: Club;
  venue: Club; // @deprecated - use club
  is_favorite: boolean;
  /** Tees from the tees table (only populated if includeTees: true) */
  teesFromTable?: Tee[];
}

/**
 * @deprecated Use CourseWithDetails instead
 */
export interface CourseWithClubDetail extends Course {
  club: Club;
  venue: Club; // @deprecated - use club
  is_favorite: boolean;
}

/**
 * @deprecated Use CourseWithDetails instead
 */
export type CourseWithVenueDetail = CourseWithClubDetail;

// =====================================================
// HOOKS
// =====================================================

/**
 * Fetch a single course by ID with its club
 *
 * @param courseId - The course ID to fetch
 * @param options - Query options
 * @param options.includeTees - If true, also fetch tees from the tees table
 * @param options.enabled - Enable/disable the query
 *
 * @example
 * // Basic usage
 * const { data: course } = useCourseDetails(courseId);
 *
 * @example
 * // With tees from table
 * const { data: course } = useCourseDetails(courseId, { includeTees: true });
 * // Access tees: course.teesFromTable
 */
export function useCourseDetails(courseId: string, options?: UseCourseDetailsOptions) {
  const { includeTees = false, enabled = true } = options ?? {};
  const isFavorite = useIsFavorite(courseId);

  const query = useQuery({
    queryKey: includeTees
      ? [...courseKeys.detail(courseId), 'with-tees']
      : courseKeys.detail(courseId),
    queryFn: async (): Promise<Omit<CourseWithDetails, 'is_favorite'> | null> => {
      // Fetch course with its club
      const { data: course, error: courseError } = await supabase
        .from('courses')
        .select(
          `
          *,
          club:club_id (*)
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

      // Fetch tees from the tees table if requested
      let teesFromTable: Tee[] | undefined;
      if (includeTees) {
        const { data: teesData, error: teesError } = await supabase
          .from('tees')
          .select('*')
          .eq('course_id', courseId)
          .order('slope', { ascending: false, nullsFirst: false });

        if (teesError) {
          // Non-fatal - log but don't throw
          console.warn('Failed to fetch tees:', teesError);
        } else {
          teesFromTable = (teesData as Tee[]) ?? [];
        }
      }

      // Cast course to any to avoid type issues with Supabase's dynamic select
      const courseData = course as Record<string, unknown>;
      const clubData = courseData.club as Club;

      // Debug: log raw holes data type from Supabase
      console.log('[useCourseDetails] Raw holes data:', {
        type: typeof courseData.holes,
        isArray: Array.isArray(courseData.holes),
        isNull: courseData.holes === null,
        isUndefined: courseData.holes === undefined,
        sample: typeof courseData.holes === 'string' ? courseData.holes.slice(0, 100) : Array.isArray(courseData.holes) ? `array[${courseData.holes.length}]` : String(courseData.holes),
      });

      const parsedHoles = parseAndTransformHoles(courseData.holes as unknown[] | string | null);
      console.log('[useCourseDetails] Parsed holes:', { length: parsedHoles.length, isArray: Array.isArray(parsedHoles) });

      return {
        id: courseData.id as string,
        club_id: courseData.club_id as string,
        golfapi_course_id: (courseData.golfapi_course_id as string | null) ?? null,
        golfapi_long_course_id: (courseData.golfapi_long_course_id as string | null) ?? null,
        name: courseData.name as string,
        description: courseData.description as string | null,
        num_holes: (courseData.num_holes as number) ?? 18,
        measure_unit: courseData.measure_unit as Course['measure_unit'],
        holes: parsedHoles,
        holes_women: courseData.holes_women as Course['holes_women'],
        match_play_indexes: courseData.match_play_indexes as Course['match_play_indexes'],
        tees: courseData.tees as Course['tees'],
        tees_migrated: courseData.tees_migrated as boolean | null,
        slope_rating: courseData.slope_rating as number | null,
        course_rating: courseData.course_rating as number | null,
        golfapi_updated_at: courseData.golfapi_updated_at as string | null,
        created_at: courseData.created_at as string,
        updated_at: courseData.updated_at as string,
        club: clubData,
        venue: clubData, // @deprecated - use club
        teesFromTable,
      };
    },
    enabled: enabled && !!courseId,
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
 * Fetch courses by club ID
 *
 * @deprecated Use useClubDetails() instead which returns courses as part of
 * the club data. This hook duplicates functionality and is not used anywhere
 * in the codebase.
 */
export function useCoursesByClub(clubId: string) {
  const { isFavorite, isLoading: favoritesLoading } = useFavoriteEnrichment();

  const query = useQuery({
    queryKey: courseKeys.byClub(clubId),
    queryFn: async () => {
      const { data: courses, error } = await supabase
        .from('courses')
        .select('*')
        .eq('club_id', clubId)
        .order('name', { ascending: true });

      if (error) throw error;

      return (courses ?? []).map((course) => {
        const courseData = course as Record<string, unknown>;
        return {
          id: courseData.id as string,
          club_id: courseData.club_id as string,
          golfapi_course_id: courseData.golfapi_course_id as string | null,
          golfapi_long_course_id: courseData.golfapi_long_course_id as string | null,
          name: courseData.name as string,
          description: courseData.description as string | null,
          num_holes: (courseData.num_holes as number) ?? 18,
          measure_unit: courseData.measure_unit as Course['measure_unit'],
          holes: parseAndTransformHoles(courseData.holes as unknown[] | string | null),
          holes_women: courseData.holes_women as Course['holes_women'],
          match_play_indexes: courseData.match_play_indexes as Course['match_play_indexes'],
          tees: courseData.tees as Course['tees'],
          tees_migrated: courseData.tees_migrated as boolean | null,
          slope_rating: courseData.slope_rating as number | null,
          course_rating: courseData.course_rating as number | null,
          golfapi_updated_at: courseData.golfapi_updated_at as string | null,
          created_at: courseData.created_at as string,
          updated_at: courseData.updated_at as string,
        };
      });
    },
    enabled: !!clubId,
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

/**
 * @deprecated Use useCoursesByClub instead
 */
export const useCoursesByVenue = useCoursesByClub;

export default useCourseDetails;
