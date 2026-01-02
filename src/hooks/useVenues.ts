/**
 * useVenues - Hook for venue and course data fetching
 *
 * ## Hook Responsibilities (Venue/Course Hook Architecture)
 *
 * This module is part of a clear hook hierarchy for venue/course data:
 *
 * ### VENUE HOOKS (this file)
 * - `useVenuesWithCourses(state?)` - List all venues with nested courses
 *   Use for: Course selection lists, venue browsing, home venue selection
 * - `useSearchVenues(query, state?)` - Search venues by name
 *   Use for: Search functionality in course selection
 * - `useFavoriteCoursesWithVenues()` - User's favorite courses with venue info
 *   Use for: Favorites section in course selection
 *
 * ### SINGLE VENUE HOOKS (useVenueDetails.ts)
 * - `useVenueDetails(venueId)` - Single venue with all its courses
 *   Use for: Venue detail screen, viewing all courses at a venue
 *
 * ### COURSE HOOKS (useCourses.ts)
 * - `useCourses()` - List all courses (flat, without venue nesting)
 *   Use for: Admin course management, flat course lists
 * - `useSearchCourses(query, state?)` - Search courses by name
 *   Use for: Course-only search (when venue grouping not needed)
 *
 * ### SINGLE COURSE HOOKS (useCourseDetails.ts)
 * - `useCourseDetails(courseId)` - Single course with venue info
 *   Use for: Course detail screen, scorecard setup
 *
 * ### MUTATION HOOKS
 * - `useCreateVenue()` - Create new venue
 * - `useCreateCourse()` - Create course at venue
 * - `useCreateVenueWithCourse()` - Create venue + course together
 * - `useAddCourseFavorite/useRemoveCourseFavorite` - Manage favorites
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/services/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { venueKeys, courseKeys } from '@/hooks/queryKeys';
import {
  useFavoriteEnrichment,
  useAddFavorite as useAddFavoriteBase,
  useRemoveFavorite as useRemoveFavoriteBase,
} from '@/hooks/useFavoriteCourses';
import type { Venue, Course, AustralianState } from '@/types/database.types';

// Re-export mutations with venue-specific names for backward compatibility
export const useAddCourseFavorite = useAddFavoriteBase;
export const useRemoveCourseFavorite = useRemoveFavoriteBase;

// =====================================================
// SUPABASE RESPONSE TYPES
// =====================================================

/**
 * Venue with courses from Supabase join
 */
interface SupabaseVenueWithCourses extends Venue {
  courses: Course[];
}

/**
 * Player with home venue ID
 */
interface SupabasePlayerHomeVenue {
  home_venue_id: string | null;
}

/**
 * Favorite course with course and venue data
 */
interface SupabaseFavoriteCourseWithVenue {
  course_id: string;
  courses: Course & { venue: Venue };
}

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
  const { isFavorite, isLoading: favoritesLoading } = useFavoriteEnrichment();

  const query = useQuery({
    queryKey: venueKeys.withCoursesFiltered({ state }),
    queryFn: async (): Promise<{
      venues: SupabaseVenueWithCourses[];
      homeVenueId: string | null;
    }> => {
      // Fetch venues with their courses
      let venueQuery = supabase
        .from('venues')
        .select(`
          *,
          courses!inner (*)
        `)
        .order('name', { ascending: true });

      if (state) {
        venueQuery = venueQuery.eq('state', state);
      }

      const { data: venues, error: venuesError } = await venueQuery;

      if (venuesError) throw venuesError;

      // Fetch player's home venue ID
      let homeVenueId: string | null = null;
      if (user) {
        const { data: player } = (await supabase
          .from('players')
          .select('home_venue_id')
          .eq('id', user.id)
          .single()) as { data: SupabasePlayerHomeVenue | null };

        homeVenueId = player?.home_venue_id ?? null;
      }

      return {
        venues: (venues as SupabaseVenueWithCourses[] | null) ?? [],
        homeVenueId,
      };
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
  });

  // Transform to VenueWithCourses with favorite status from shared hook
  const data = query.data
    ? query.data.venues.map((venue: SupabaseVenueWithCourses) => {
        const courses = (venue.courses ?? []).map((course: Course) => ({
          ...course,
          is_favorite: isFavorite(course.id),
        }));

        return {
          ...venue,
          courses,
          course_count: courses.length,
          is_multi_course: courses.length > 1,
          is_home: venue.id === query.data.homeVenueId,
        };
      })
    : undefined;

  return {
    ...query,
    data,
    isLoading: query.isLoading || favoritesLoading,
  };
}

/**
 * Search venues by name
 */
export function useSearchVenues(searchQuery: string, state?: AustralianState) {
  const { user } = useAuth();
  const { isFavorite, isLoading: favoritesLoading } = useFavoriteEnrichment();

  const query = useQuery({
    queryKey: venueKeys.withCoursesFiltered({ search: searchQuery, state }),
    queryFn: async (): Promise<{
      venues: SupabaseVenueWithCourses[];
      homeVenueId: string | null;
    }> => {
      let queryBuilder = supabase
        .from('venues')
        .select(`
          *,
          courses!inner (*)
        `);

      // Apply search filter (case-insensitive)
      if (searchQuery.length >= 2) {
        queryBuilder = queryBuilder.ilike('name', `%${searchQuery}%`);
      }

      // Apply state filter
      if (state) {
        queryBuilder = queryBuilder.eq('state', state);
      }

      const { data: venues, error } = await queryBuilder.order('name', {
        ascending: true,
      });

      if (error) throw error;

      // Fetch player's home venue ID
      let homeVenueId: string | null = null;
      if (user) {
        const { data: player } = (await supabase
          .from('players')
          .select('home_venue_id')
          .eq('id', user.id)
          .single()) as { data: SupabasePlayerHomeVenue | null };

        homeVenueId = player?.home_venue_id ?? null;
      }

      return {
        venues: (venues as SupabaseVenueWithCourses[] | null) ?? [],
        homeVenueId,
      };
    },
    enabled: searchQuery.length >= 2 || !!state,
    staleTime: 2 * 60 * 1000, // 2 minutes
  });

  // Transform to VenueWithCourses with favorite status from shared hook
  const data = query.data
    ? query.data.venues.map((venue: SupabaseVenueWithCourses) => {
        const courses = (venue.courses ?? []).map((course: Course) => ({
          ...course,
          is_favorite: isFavorite(course.id),
        }));

        return {
          ...venue,
          courses,
          course_count: courses.length,
          is_multi_course: courses.length > 1,
          is_home: venue.id === query.data.homeVenueId,
        };
      })
    : undefined;

  return {
    ...query,
    data,
    isLoading: query.isLoading || favoritesLoading,
  };
}

/**
 * Get display items for hybrid list
 * - Single-course venues: show course directly with venue as subtitle
 * - Multi-course venues: show as expandable venue with nested courses
 *
 * @deprecated Use useVenuesWithCourses() and transform inline. This wrapper
 * adds unnecessary indirection. Transform example:
 * ```
 * const { data: venues } = useVenuesWithCourses();
 * const displayItems = (venues ?? []).map((venue) => ({
 *   type: venue.is_multi_course ? 'multi-course-venue' : 'single-course',
 *   venue: { ...venue },
 *   courses: venue.courses,
 *   is_home: venue.is_home,
 * }));
 * ```
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

      const typedData = data as SupabaseFavoriteCourseWithVenue[] | null;
      return (typedData ?? [])
        .map((item: SupabaseFavoriteCourseWithVenue) => ({
          ...item.courses,
          venue: item.courses.venue,
          is_favorite: true,
        }))
        .filter((course) => course.id);
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
      // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Supabase generated types restriction workaround
      const { data, error } = await (supabase as any)
        .from('venues')
        .insert({
          name: input.name,
          state: input.state ?? null,
          city: input.city ?? null,
          address: input.address ?? null,
          total_holes: input.total_holes ?? 18,
          source: 'manual',
        })
        .select()
        .single();

      if (error) throw error;
      if (!data) throw new Error('No data returned from insert');
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
      // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Supabase generated types restriction workaround
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
      if (!data) throw new Error('No data returned from insert');
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
      // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Supabase generated types restriction workaround
      const { data: venue, error: venueError } = await (supabase as any)
        .from('venues')
        .insert({
          name: input.venue.name,
          state: input.venue.state ?? null,
          city: input.venue.city ?? null,
          address: input.venue.address ?? null,
          total_holes: input.venue.total_holes ?? 18,
          source: 'manual',
        })
        .select()
        .single();

      if (venueError) throw venueError;
      if (!venue) throw new Error('No venue data returned from insert');

      // Create default course at venue
      const courseName = input.course?.name || input.venue.name;
      // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Supabase generated types restriction workaround
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
      if (!course) throw new Error('No course data returned from insert');

      return { venue: venue as Venue, course: course as Course };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: venueKeys.all });
      queryClient.invalidateQueries({ queryKey: courseKeys.all });
    },
  });
}

// Note: useAddCourseFavorite and useRemoveCourseFavorite are now re-exported
// from useFavoriteCourses at the top of this file for backward compatibility
