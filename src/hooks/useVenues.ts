/**
 * useVenues - Hook for venue and course data fetching
 *
 * Provides functionality for:
 * - Fetching all venues with their courses (for hybrid list display)
 * - Searching venues by name/state
 * - Creating new venues
 * - Managing favorite courses (at venue level display)
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/services/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { venueKeys, courseKeys } from '@/hooks/queryKeys';
import type { Venue, Course, AustralianState } from '@/types/database.types';

// =====================================================
// TYPES
// =====================================================

/**
 * Course with favorite status
 */
export interface CourseWithFavoriteStatus extends Course {
  is_favorite: boolean;
}

/**
 * Venue with its courses and metadata for UI display
 */
export interface VenueWithCourses extends Venue {
  courses: CourseWithFavoriteStatus[];
  course_count: number;
  is_multi_course: boolean; // true if venue has 2+ courses
  is_home: boolean; // true if this is user's home venue
}

/**
 * Display item for hybrid list - either a single course or an expandable venue group
 */
export interface VenueCourseDisplayItem {
  type: 'single-course' | 'multi-course-venue';
  venue: Venue;
  courses: CourseWithFavoriteStatus[];
  is_home?: boolean; // true if this venue is the user's home venue, defaults to false
  // For single-course venues, this is the one course
  // For multi-course venues, these are all courses at the venue
}

export interface CreateVenueInput {
  name: string;
  state?: AustralianState | null;
  city?: string | null;
  address?: string | null;
  total_holes?: number | null;
}

export interface CreateCourseInput {
  venue_id: string;
  name: string;
  description?: string | null;
  holes?: Course['holes'];
  tees?: Course['tees'];
  slope_rating?: number | null;
  course_rating?: number | null;
}

// =====================================================
// FETCH HOOKS
// =====================================================

/**
 * Fetch all venues with their courses
 * Returns data structured for hybrid list display
 */
export function useVenuesWithCourses(state?: AustralianState) {
  const { user } = useAuth();

  return useQuery({
    queryKey: venueKeys.withCoursesFiltered({ state }),
    queryFn: async (): Promise<VenueWithCourses[]> => {
      // Fetch venues with their courses
      let query = supabase
        .from('venues')
        .select(`
          *,
          courses!inner (*)
        `)
        .order('name', { ascending: true });

      if (state) {
        query = query.eq('state', state);
      }

      const { data: venues, error: venuesError } = await query;

      if (venuesError) throw venuesError;

      // Fetch user's favorite course IDs and home venue ID
      let favoriteIds: string[] = [];
      let homeVenueId: string | null = null;
      if (user) {
        // Fetch favorites
        const { data: favorites, error: favError } = await supabase
          .from('favorite_courses')
          .select('course_id')
          .eq('player_id', user.id);

        if (!favError && favorites) {
          favoriteIds = favorites.map((f: { course_id: string }) => f.course_id);
        }

        // Fetch player's home venue ID
        const { data: player } = await (supabase as any)
          .from('players')
          .select('home_venue_id')
          .eq('id', user.id)
          .single();

        homeVenueId = player?.home_venue_id ?? null;
      }

      // Transform to VenueWithCourses
      return (venues ?? []).map((venue: any) => {
        const courses = (venue.courses ?? []).map((course: Course) => ({
          ...course,
          is_favorite: favoriteIds.includes(course.id),
        }));

        return {
          ...venue,
          courses,
          course_count: courses.length,
          is_multi_course: courses.length > 1,
          is_home: venue.id === homeVenueId,
        };
      });
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
}

/**
 * Search venues by name
 */
export function useSearchVenues(query: string, state?: AustralianState) {
  const { user } = useAuth();

  return useQuery({
    queryKey: venueKeys.withCoursesFiltered({ search: query, state }),
    queryFn: async (): Promise<VenueWithCourses[]> => {
      let queryBuilder = supabase
        .from('venues')
        .select(`
          *,
          courses!inner (*)
        `);

      // Apply search filter (case-insensitive)
      if (query.length >= 2) {
        queryBuilder = queryBuilder.ilike('name', `%${query}%`);
      }

      // Apply state filter
      if (state) {
        queryBuilder = queryBuilder.eq('state', state);
      }

      const { data: venues, error } = await queryBuilder.order('name', {
        ascending: true,
      });

      if (error) throw error;

      // Fetch user's favorite course IDs and home venue ID
      let favoriteIds: string[] = [];
      let homeVenueId: string | null = null;
      if (user) {
        // Fetch favorites
        const { data: favorites } = await supabase
          .from('favorite_courses')
          .select('course_id')
          .eq('player_id', user.id);

        if (favorites) {
          favoriteIds = favorites.map((f: { course_id: string }) => f.course_id);
        }

        // Fetch player's home venue ID
        const { data: player } = await (supabase as any)
          .from('players')
          .select('home_venue_id')
          .eq('id', user.id)
          .single();

        homeVenueId = player?.home_venue_id ?? null;
      }

      // Transform to VenueWithCourses
      return (venues ?? []).map((venue: any) => {
        const courses = (venue.courses ?? []).map((course: Course) => ({
          ...course,
          is_favorite: favoriteIds.includes(course.id),
        }));

        return {
          ...venue,
          courses,
          course_count: courses.length,
          is_multi_course: courses.length > 1,
          is_home: venue.id === homeVenueId,
        };
      });
    },
    enabled: query.length >= 2 || !!state,
    staleTime: 2 * 60 * 1000, // 2 minutes
  });
}

/**
 * Get display items for hybrid list
 * - Single-course venues: show course directly with venue as subtitle
 * - Multi-course venues: show as expandable venue with nested courses
 */
export function useVenueCourseDisplayItems(state?: AustralianState) {
  const { data: venues, ...rest } = useVenuesWithCourses(state);

  const displayItems: VenueCourseDisplayItem[] = (venues ?? []).map((venue) => ({
    type: venue.is_multi_course ? 'multi-course-venue' : 'single-course',
    venue: {
      id: venue.id,
      source: venue.source,
      api_id: venue.api_id,
      name: venue.name,
      state: venue.state,
      city: venue.city,
      address: venue.address,
      phone: venue.phone,
      email: venue.email,
      website: venue.website,
      location: venue.location,
      total_holes: venue.total_holes,
      last_synced: venue.last_synced,
      created_at: venue.created_at,
      updated_at: venue.updated_at,
    },
    courses: venue.courses,
    is_home: venue.is_home,
  }));

  return { data: displayItems, ...rest };
}

/**
 * Get favorite courses with venue info
 */
export function useFavoriteCoursesWithVenues() {
  const { user } = useAuth();

  return useQuery({
    queryKey: courseKeys.favorites(),
    queryFn: async (): Promise<(CourseWithFavoriteStatus & { venue: Venue })[]> => {
      if (!user) return [];

      // Fetch favorites with course and venue data
      const { data, error } = await supabase
        .from('favorite_courses')
        .select(`
          course_id,
          courses:course_id (
            *,
            venue:venue_id (*)
          )
        `)
        .eq('player_id', user.id);

      if (error) throw error;

      return (data ?? [])
        .map((item: any) => ({
          ...item.courses,
          venue: item.courses.venue,
          is_favorite: true,
        }))
        .filter((course: any) => course.id);
    },
    enabled: !!user,
    staleTime: 5 * 60 * 1000,
  });
}

// =====================================================
// MUTATION HOOKS
// =====================================================

/**
 * Create a new venue
 */
export function useCreateVenue() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: CreateVenueInput): Promise<Venue> => {
      const { data, error } = await (supabase as any)
        .from('venues')
        .insert({
          name: input.name,
          state: input.state ?? null,
          city: input.city ?? null,
          address: input.address ?? null,
          total_holes: input.total_holes ?? 18,
          source: 'manual' as const,
        })
        .select()
        .single();

      if (error) throw error;
      return data as Venue;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: venueKeys.all });
    },
  });
}

/**
 * Create a new course at a venue
 */
export function useCreateCourse() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: CreateCourseInput): Promise<Course> => {
      const { data, error } = await (supabase as any)
        .from('courses')
        .insert({
          venue_id: input.venue_id,
          name: input.name,
          description: input.description ?? null,
          holes: input.holes ?? [],
          tees: input.tees ?? null,
          slope_rating: input.slope_rating ?? null,
          course_rating: input.course_rating ?? null,
        })
        .select()
        .single();

      if (error) throw error;
      return data as Course;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: venueKeys.all });
      queryClient.invalidateQueries({ queryKey: courseKeys.all });
    },
  });
}

/**
 * Create venue and course together (convenience hook)
 * Useful for manual entry where you want to create both at once
 */
export function useCreateVenueWithCourse() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: {
      venue: CreateVenueInput;
      course?: Partial<CreateCourseInput>;
    }): Promise<{ venue: Venue; course: Course }> => {
      // Create venue first
      const { data: venue, error: venueError } = await (supabase as any)
        .from('venues')
        .insert({
          name: input.venue.name,
          state: input.venue.state ?? null,
          city: input.venue.city ?? null,
          address: input.venue.address ?? null,
          total_holes: input.venue.total_holes ?? 18,
          source: 'manual' as const,
        })
        .select()
        .single();

      if (venueError) throw venueError;

      // Create default course at venue
      const courseName = input.course?.name || input.venue.name;
      const { data: course, error: courseError } = await (supabase as any)
        .from('courses')
        .insert({
          venue_id: venue.id,
          name: courseName,
          description: input.course?.description ?? null,
          holes: input.course?.holes ?? [],
          tees: input.course?.tees ?? null,
          slope_rating: input.course?.slope_rating ?? null,
          course_rating: input.course?.course_rating ?? null,
        })
        .select()
        .single();

      if (courseError) throw courseError;

      return { venue: venue as Venue, course: course as Course };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: venueKeys.all });
      queryClient.invalidateQueries({ queryKey: courseKeys.all });
    },
  });
}

/**
 * Add course to favorites
 * Uses upsert to handle race conditions where favorite might already exist
 */
export function useAddCourseFavorite() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (courseId: string) => {
      if (!user) throw new Error('Must be logged in to add favorites');

      // Use upsert to handle the case where favorite already exists
      // onConflict: ignore will silently succeed if the record exists
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
      queryClient.invalidateQueries({ queryKey: venueKeys.all });
      queryClient.invalidateQueries({ queryKey: courseKeys.all });
    },
  });
}

/**
 * Remove course from favorites
 */
export function useRemoveCourseFavorite() {
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
      queryClient.invalidateQueries({ queryKey: venueKeys.all });
      queryClient.invalidateQueries({ queryKey: courseKeys.all });
    },
  });
}
