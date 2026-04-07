/**
 * useCourses - Hook for course data fetching and mutations
 *
 * Provides functionality for:
 * - Fetching all courses
 * - Searching courses by name/state
 * - Managing favorite courses (via useFavoriteCourses)
 * - Creating new courses (manual entry)
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
  type CourseWithFavorite,
} from '@/hooks/useFavoriteCourses';
import type { Course, RegionFilter } from '@/types/database.types';

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
