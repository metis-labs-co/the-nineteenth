/**
 * Course Hooks - Query Hooks
 *
 * TanStack Query hooks for fetching course data.
 *
 * Hooks:
 * - useCourses: Fetch all courses with favorite status
 * - useSearchCourses: Search courses by name/state
 * - useFavoriteCourses: Fetch user's favorite courses
 * - useCreateCourse: Create a new course (manual entry)
 * - useCourse: Get single course by ID (deprecated)
 * - useCourseDetails: Fetch single course with club info and tees
 * - useCoursesByClub: Fetch courses by club ID (deprecated)
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/services/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { courseKeys } from '@/hooks/queryKeys';
import { CACHE_TIMES } from '@/constants/cacheConfig';
import {
  useFavoriteEnrichment,
  useAddFavorite,
  useRemoveFavorite,
  useIsFavorite,
  type CourseWithFavorite,
} from './favorites';
import { parseAndTransformHoles } from '@/utils/holeTransformers';
import type { Course, Club, Tee, RegionFilter } from '@/types/database.types';

// =====================================================
// TYPES (from useCourses)
// =====================================================

// Re-export types and mutations for backward compatibility
export type { CourseWithFavorite };
export { useAddFavorite, useRemoveFavorite };

export interface CreateCourseInput {
  name: string;
  state?: RegionFilter | null;
  city?: string | null;
  address?: string | null;
}

interface FavoriteWithCourse {
  course_id: string;
  courses: Course;
}

// =====================================================
// TYPES (from useCourseDetails)
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
  is_favorite: boolean;
  /** Tees from the tees table (only populated if includeTees: true) */
  teesFromTable?: Tee[];
}

/**
 * @deprecated Use CourseWithDetails instead
 */
export interface CourseWithClubDetail extends Course {
  club: Club;
  is_favorite: boolean;
}

// =====================================================
// HOOKS (from useCourses)
// =====================================================

/**
 * Fetch all courses with favorite status
 */
export function useCourses() {
  const { enrichCourses, isLoading: favoritesLoading } = useFavoriteEnrichment();

  const query = useQuery({
    queryKey: courseKeys.list(),
    queryFn: async (): Promise<Course[]> => {
      const { data: courses, error: coursesError } = await supabase
        .from('courses')
        .select('*')
        .order('name', { ascending: true });

      if (coursesError) throw coursesError;

      return (courses as Course[] | null) ?? [];
    },
    staleTime: CACHE_TIMES.STANDARD,
  });

  // Enrich courses with favorite status
  const enrichedData = query.data ? enrichCourses(query.data) : undefined;

  return {
    ...query,
    data: enrichedData,
    // Include favorites loading in overall loading state
    isLoading: query.isLoading || favoritesLoading,
  };
}

/**
 * Search courses by name and optionally filter by state
 */
export function useSearchCourses(searchQuery: string, state?: RegionFilter) {
  const { enrichCourses, isLoading: favoritesLoading } = useFavoriteEnrichment();

  const query = useQuery({
    queryKey: courseKeys.apiSearch(searchQuery, state),
    queryFn: async (): Promise<Course[]> => {
      let queryBuilder = supabase.from('courses').select('*');

      // Apply search filter (case-insensitive)
      if (searchQuery.length >= 2) {
        queryBuilder = queryBuilder.ilike('name', `%${searchQuery}%`);
      }

      // Apply state filter
      if (state) {
        queryBuilder = queryBuilder.eq('state', state);
      }

      const { data: courses, error } = await queryBuilder.order('name', {
        ascending: true,
      });

      if (error) throw error;

      return (courses as Course[] | null) ?? [];
    },
    enabled: searchQuery.length >= 2 || !!state,
    staleTime: CACHE_TIMES.MODERATE,
  });

  // Enrich courses with favorite status
  const enrichedData = query.data ? enrichCourses(query.data) : undefined;

  return {
    ...query,
    data: enrichedData,
    isLoading: query.isLoading || favoritesLoading,
  };
}

/**
 * Fetch user's favorite courses with full course data
 */
export function useFavoriteCourses() {
  const { user } = useAuth();

  return useQuery({
    queryKey: courseKeys.favorites(),
    queryFn: async (): Promise<CourseWithFavorite[]> => {
      if (!user) return [];

      const { data, error } = await supabase
        .from('favorite_courses')
        .select(
          `
          course_id,
          courses:course_id (*)
        `
        )
        .eq('player_id', user.id);

      if (error) throw error;

      return ((data as FavoriteWithCourse[] | null) ?? [])
        .map((item) => ({
          ...item.courses,
          is_favorite: true,
        }))
        .filter((course) => course.id);
    },
    enabled: !!user,
    staleTime: CACHE_TIMES.STANDARD,
  });
}

/**
 * Create a new course (manual entry)
 */
export function useCreateCourse() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: CreateCourseInput): Promise<Course> => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Supabase generated types workaround
      const { data, error } = await (supabase as any)
        .from('courses')
        .insert({
          name: input.name,
          state: input.state ?? null,
          city: input.city ?? null,
          address: input.address ?? null,
          source: 'manual' as const,
        })
        .select()
        .single();

      if (error) throw error;
      return data as Course;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: courseKeys.all });
    },
  });
}

/**
 * Get single course by ID
 *
 * @deprecated Use useCourseDetails() instead which returns the course with
 * its venue information and favorite status. This hook returns basic course
 * data only and is not used anywhere in the codebase.
 */
export function useCourse(id: string | undefined) {
  return useQuery({
    queryKey: courseKeys.detail(id ?? ''),
    queryFn: async (): Promise<Course | null> => {
      if (!id) return null;

      const { data, error } = await supabase
        .from('courses')
        .select('*')
        .eq('id', id)
        .single();

      if (error) throw error;
      return data as Course;
    },
    enabled: !!id,
    staleTime: CACHE_TIMES.LONG,
  });
}

// =====================================================
// HOOKS (from useCourseDetails)
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

      const parsedHoles = parseAndTransformHoles(courseData.holes as unknown[] | string | null);

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
        api_locked: (courseData.api_locked as boolean) ?? false,
        golfapi_updated_at: courseData.golfapi_updated_at as string | null,
        created_at: courseData.created_at as string,
        updated_at: courseData.updated_at as string,
        club: clubData,
        teesFromTable,
      };
    },
    enabled: enabled && !!courseId,
    staleTime: CACHE_TIMES.STANDARD,
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
    staleTime: CACHE_TIMES.STANDARD,
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
