/**
 * useCourses - Hook for course data fetching and mutations
 *
 * Provides functionality for:
 * - Fetching all courses
 * - Searching courses by name/state
 * - Managing favorite courses
 * - Creating new courses (manual entry)
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/services/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { courseKeys } from '@/hooks/queryKeys';
import type { Course, AustralianState, FavoriteCourse } from '@/types/database.types';

// Types
export interface CourseWithFavorite extends Course {
  is_favorite: boolean;
}

export interface CreateCourseInput {
  name: string;
  state?: AustralianState | null;
  city?: string | null;
  address?: string | null;
}

// Type for favorite_courses table response
interface FavoriteCourseRow {
  course_id: string;
}

interface FavoriteWithCourse {
  course_id: string;
  courses: Course;
}

/**
 * Fetch all courses with favorite status
 */
export function useCourses() {
  const { user } = useAuth();

  return useQuery({
    queryKey: courseKeys.list(),
    queryFn: async (): Promise<CourseWithFavorite[]> => {
      // Fetch courses
      const { data: courses, error: coursesError } = await supabase
        .from('courses')
        .select('*')
        .order('name', { ascending: true });

      if (coursesError) throw coursesError;

      // Fetch user's favorites
      let favoriteIds: string[] = [];
      if (user) {
        const { data: favorites, error: favError } = await (supabase as any)
          .from('favorite_courses')
          .select('course_id')
          .eq('player_id', user.id);

        if (favError) {
          console.warn('Error fetching favorites:', favError);
        } else {
          favoriteIds = (favorites as FavoriteCourseRow[] | null)?.map((f) => f.course_id) ?? [];
        }
      }

      // Combine courses with favorite status
      return ((courses as Course[] | null) ?? []).map((course) => ({
        ...course,
        is_favorite: favoriteIds.includes(course.id),
      }));
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
}

/**
 * Search courses by name and optionally filter by state
 */
export function useSearchCourses(query: string, state?: AustralianState) {
  const { user } = useAuth();

  return useQuery({
    queryKey: courseKeys.apiSearch(query, state),
    queryFn: async (): Promise<CourseWithFavorite[]> => {
      let queryBuilder = supabase.from('courses').select('*');

      // Apply search filter (case-insensitive)
      if (query.length >= 2) {
        queryBuilder = queryBuilder.ilike('name', `%${query}%`);
      }

      // Apply state filter
      if (state) {
        queryBuilder = queryBuilder.eq('state', state);
      }

      const { data: courses, error } = await queryBuilder.order('name', {
        ascending: true,
      });

      if (error) throw error;

      // Fetch user's favorites
      let favoriteIds: string[] = [];
      if (user) {
        const { data: favorites } = await (supabase as any)
          .from('favorite_courses')
          .select('course_id')
          .eq('player_id', user.id);

        favoriteIds = (favorites as FavoriteCourseRow[] | null)?.map((f) => f.course_id) ?? [];
      }

      return ((courses as Course[] | null) ?? []).map((course) => ({
        ...course,
        is_favorite: favoriteIds.includes(course.id),
      }));
    },
    enabled: query.length >= 2 || !!state,
    staleTime: 2 * 60 * 1000, // 2 minutes
  });
}

/**
 * Fetch user's favorite courses
 */
export function useFavoriteCourses() {
  const { user } = useAuth();

  return useQuery({
    queryKey: courseKeys.favorites(),
    queryFn: async (): Promise<CourseWithFavorite[]> => {
      if (!user) return [];

      const { data, error } = await (supabase as any)
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
    staleTime: 5 * 60 * 1000,
  });
}

/**
 * Add course to favorites
 * Uses upsert to handle race conditions where favorite might already exist
 */
export function useAddFavorite() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (courseId: string) => {
      if (!user) throw new Error('Must be logged in to add favorites');

      // Use upsert to handle the case where favorite already exists
      const { error } = await (supabase as any)
        .from('favorite_courses')
        .upsert(
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
      // Invalidate relevant queries
      queryClient.invalidateQueries({ queryKey: courseKeys.all });
    },
  });
}

/**
 * Remove course from favorites
 */
export function useRemoveFavorite() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (courseId: string) => {
      if (!user) throw new Error('Must be logged in to remove favorites');

      const { error } = await (supabase as any)
        .from('favorite_courses')
        .delete()
        .eq('player_id', user.id)
        .eq('course_id', courseId);

      if (error) throw error;
      return courseId;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: courseKeys.all });
    },
  });
}

/**
 * Create a new course (manual entry)
 */
export function useCreateCourse() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: CreateCourseInput): Promise<Course> => {
      const { data, error } = await supabase
        .from('courses')
        .insert({
          name: input.name,
          state: input.state ?? null,
          city: input.city ?? null,
          address: input.address ?? null,
          source: 'manual' as const,
        } as any)
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
    staleTime: 10 * 60 * 1000, // 10 minutes
  });
}
