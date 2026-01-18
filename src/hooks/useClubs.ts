/**
 * useClubs - Hook for club and course data fetching
 *
 * ## Hook Responsibilities (Club/Course Hook Architecture)
 *
 * This module is part of a clear hook hierarchy for club/course data:
 *
 * ### CLUB HOOKS (this file)
 * - `useClubsWithCourses(state?)` - List all clubs with nested courses
 *   Use for: Course selection lists, club browsing, home club selection
 * - `useSearchClubs(query, state?)` - Search clubs by name
 *   Use for: Search functionality in course selection
 * - `useFavoriteCoursesWithClubs()` - User's favorite courses with club info
 *   Use for: Favorites section in course selection
 *
 * ### SINGLE CLUB HOOKS (useClubDetails.ts)
 * - `useClubDetails(clubId)` - Single club with all its courses
 *   Use for: Club detail screen, viewing all courses at a club
 *
 * ### COURSE HOOKS (useCourses.ts)
 * - `useCourses()` - List all courses (flat, without club nesting)
 *   Use for: Admin course management, flat course lists
 * - `useSearchCourses(query, state?)` - Search courses by name
 *   Use for: Course-only search (when club grouping not needed)
 *
 * ### SINGLE COURSE HOOKS (useCourseDetails.ts)
 * - `useCourseDetails(courseId)` - Single course with club info
 *   Use for: Course detail screen, scorecard setup
 *
 * ### MUTATION HOOKS
 * - `useCreateClub()` - Create new club
 * - `useCreateCourse()` - Create course at club
 * - `useCreateClubWithCourse()` - Create club + course together
 * - `useAddCourseFavorite/useRemoveCourseFavorite` - Manage favorites
 */

import { useState, useEffect, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/services/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { clubKeys, courseKeys } from '@/hooks/queryKeys';
import {
  useFavoriteEnrichment,
  useAddFavorite as useAddFavoriteBase,
  useRemoveFavorite as useRemoveFavoriteBase,
} from '@/hooks/useFavoriteCourses';
import { useGolfApiSearch, isGolfApiResult } from '@/hooks/useGolfApiSearch';
import type { GolfApiSearchResultItem } from '@/hooks/useGolfApiSearch';
import type { Club, Course, AustralianState } from '@/types/database.types';

// Re-export mutations with club-specific names for backward compatibility
export const useAddCourseFavorite = useAddFavoriteBase;
export const useRemoveCourseFavorite = useRemoveFavoriteBase;

// =====================================================
// SUPABASE RESPONSE TYPES
// =====================================================

/**
 * Club with courses from Supabase join
 */
interface SupabaseClubWithCourses extends Club {
  courses: Course[];
}

/**
 * Player with home club ID
 */
interface SupabasePlayerHomeClub {
  home_club_id: string | null;
}

/**
 * Favorite course with course and club data
 */
interface SupabaseFavoriteCourseWithClub {
  course_id: string;
  courses: Course & { club: Club };
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
 * Club with its courses and metadata for UI display
 */
export interface ClubWithCourses extends Club {
  courses: CourseWithFavoriteStatus[];
  course_count: number;
  is_multi_course: boolean; // true if club has 2+ courses
  is_home: boolean; // true if this is user's home club
}

/**
 * Display item for hybrid list - either a single course or an expandable club group
 */
export interface ClubCourseDisplayItem {
  type: 'single-course' | 'multi-course-club';
  club: Club;
  venue: Club; // @deprecated - use club. Kept for backwards compatibility
  courses: CourseWithFavoriteStatus[];
  is_home?: boolean; // true if this club is the user's home club, defaults to false
  // For single-course clubs, this is the one course
  // For multi-course clubs, these are all courses at the club
}

export interface CreateClubInput {
  name: string;
  state?: AustralianState | null;
  city?: string | null;
  address?: string | null;
  total_holes?: number | null;
}

export interface CreateClubCourseInput {
  club_id: string;
  name: string;
  description?: string | null;
  holes?: Course['holes'];
  tees?: Course['tees'];
  slope_rating?: number | null;
  course_rating?: number | null;
}

// =====================================================
// DEPRECATED TYPE ALIASES (for backward compatibility)
// =====================================================

// =====================================================
// SEARCH RESULT TYPES (for API fallback)
// =====================================================

/**
 * Union type for search results - can be local DB result or GolfAPI.io result
 */
export type SearchResultItem = ClubWithCourses | GolfApiSearchResultItem;

/**
 * Type guard to check if a search result is from local DB
 */
export function isLocalClub(item: SearchResultItem): item is ClubWithCourses {
  return !('source' in item) || item.source !== 'golfapi';
}

// Re-export for convenience
export { isGolfApiResult };
export type { GolfApiSearchResultItem };

// =====================================================
// DEPRECATED TYPE ALIASES (for backward compatibility)
// =====================================================

/**
 * @deprecated Use ClubWithCourses instead
 */
export type VenueWithCourses = ClubWithCourses;

/**
 * @deprecated Use ClubCourseDisplayItem instead
 */
export type VenueCourseDisplayItem = ClubCourseDisplayItem;

/**
 * @deprecated Use CreateClubInput instead
 */
export type CreateVenueInput = CreateClubInput;

// =====================================================
// FETCH HOOKS
// =====================================================

/**
 * Fetch all clubs with their courses
 * Returns data structured for hybrid list display
 */
export function useClubsWithCourses(state?: AustralianState) {
  const { user } = useAuth();
  const { isFavorite, isLoading: favoritesLoading } = useFavoriteEnrichment();

  const query = useQuery({
    queryKey: clubKeys.withCoursesFiltered({ state }),
    queryFn: async (): Promise<{
      clubs: SupabaseClubWithCourses[];
      homeClubId: string | null;
    }> => {
      // Fetch clubs with their courses
      let clubQuery = supabase
        .from('clubs')
        .select(`
          *,
          courses!inner (*)
        `)
        .order('name', { ascending: true });

      if (state) {
        clubQuery = clubQuery.eq('state', state);
      }

      const { data: clubs, error: clubsError } = await clubQuery;

      if (clubsError) throw clubsError;

      // Fetch player's home club ID
      let homeClubId: string | null = null;
      if (user) {
        const { data: player } = (await supabase
          .from('players')
          .select('home_club_id')
          .eq('id', user.id)
          .single()) as { data: SupabasePlayerHomeClub | null };

        homeClubId = player?.home_club_id ?? null;
      }

      return {
        clubs: (clubs as SupabaseClubWithCourses[] | null) ?? [],
        homeClubId,
      };
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
  });

  // Transform to ClubWithCourses with favorite status from shared hook
  const data = query.data
    ? query.data.clubs.map((club: SupabaseClubWithCourses) => {
        const courses = (club.courses ?? []).map((course: Course) => ({
          ...course,
          is_favorite: isFavorite(course.id),
        }));

        return {
          ...club,
          courses,
          course_count: courses.length,
          is_multi_course: courses.length > 1,
          is_home: club.id === query.data.homeClubId,
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
 * Search clubs by name with optional GolfAPI.io fallback
 *
 * When local results are < 3, automatically searches GolfAPI.io
 * and merges results seamlessly.
 */
export function useSearchClubs(searchQuery: string, state?: AustralianState) {
  const { user } = useAuth();
  const { isFavorite, isLoading: favoritesLoading } = useFavoriteEnrichment();

  // Debounce search query for API calls (300ms)
  const [debouncedQuery, setDebouncedQuery] = useState(searchQuery);

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedQuery(searchQuery), 300);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  // Local database query
  const localQuery = useQuery({
    queryKey: clubKeys.withCoursesFiltered({ search: searchQuery, state }),
    queryFn: async (): Promise<{
      clubs: SupabaseClubWithCourses[];
      homeClubId: string | null;
    }> => {
      let queryBuilder = supabase
        .from('clubs')
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

      const { data: clubs, error } = await queryBuilder.order('name', {
        ascending: true,
      });

      if (error) throw error;

      // Fetch player's home club ID
      let homeClubId: string | null = null;
      if (user) {
        const { data: player } = (await supabase
          .from('players')
          .select('home_club_id')
          .eq('id', user.id)
          .single()) as { data: SupabasePlayerHomeClub | null };

        homeClubId = player?.home_club_id ?? null;
      }

      return {
        clubs: (clubs as SupabaseClubWithCourses[] | null) ?? [],
        homeClubId,
      };
    },
    enabled: searchQuery.length >= 2 || !!state,
    staleTime: 2 * 60 * 1000, // 2 minutes
  });

  // Transform local results to ClubWithCourses
  const localResults: ClubWithCourses[] | undefined = localQuery.data
    ? localQuery.data.clubs.map((club: SupabaseClubWithCourses) => {
        const courses = (club.courses ?? []).map((course: Course) => ({
          ...course,
          is_favorite: isFavorite(course.id),
        }));

        return {
          ...club,
          courses,
          course_count: courses.length,
          is_multi_course: courses.length > 1,
          is_home: club.id === localQuery.data.homeClubId,
        };
      })
    : undefined;

  // Determine if we should search GolfAPI.io
  // Only when local search finished AND local results < 3 AND debounced query is 3+ chars
  const shouldSearchApi =
    !localQuery.isLoading &&
    (localResults?.length ?? 0) < 3 &&
    debouncedQuery.length >= 3;

  // GolfAPI.io search (using debounced query)
  const apiQuery = useGolfApiSearch(debouncedQuery, state, shouldSearchApi);

  // Merge results with deduplication
  const mergedResults = useMemo((): SearchResultItem[] | undefined => {
    if (!localResults) return undefined;

    const apiResults = apiQuery.data ?? [];
    if (apiResults.length === 0) return localResults;

    // Get golfapi_club_ids already in local DB
    const localGolfApiIds = new Set(
      localResults
        .filter((c) => c.golfapi_club_id)
        .map((c) => c.golfapi_club_id)
    );

    // Filter out API results already imported locally
    const newApiResults = apiResults.filter(
      (r) => !localGolfApiIds.has(r.golfapi_club_id)
    );

    return [...localResults, ...newApiResults];
  }, [localResults, apiQuery.data]);

  return {
    ...localQuery,
    data: mergedResults,
    isLoading: localQuery.isLoading || favoritesLoading,
    // Additional API search status
    isSearchingApi: apiQuery.isLoading,
    apiSearchEnabled: shouldSearchApi,
  };
}

/**
 * Get display items for hybrid list
 * - Single-course clubs: show course directly with club as subtitle
 * - Multi-course clubs: show as expandable club with nested courses
 *
 * @deprecated Use useClubsWithCourses() and transform inline. This wrapper
 * adds unnecessary indirection. Transform example:
 * ```
 * const { data: clubs } = useClubsWithCourses();
 * const displayItems = (clubs ?? []).map((club) => ({
 *   type: club.is_multi_course ? 'multi-course-club' : 'single-course',
 *   club: { ...club },
 *   courses: club.courses,
 *   is_home: club.is_home,
 * }));
 * ```
 */
export function useClubCourseDisplayItems(state?: AustralianState) {
  const { data: clubs, ...rest } = useClubsWithCourses(state);

  const displayItems: ClubCourseDisplayItem[] = (clubs ?? []).map((club) => {
    const clubData: Club = {
      id: club.id,
      source: club.source,
      golfapi_club_id: club.golfapi_club_id,
      name: club.name,
      state: club.state,
      city: club.city,
      address: club.address,
      postal_code: club.postal_code,
      country: club.country,
      continent: club.continent,
      phone: club.phone,
      email: club.email,
      website: club.website,
      latitude: club.latitude,
      longitude: club.longitude,
      location: club.location,
      total_holes: club.total_holes,
      last_synced: club.last_synced,
      created_at: club.created_at,
      updated_at: club.updated_at,
    };
    return {
      type: club.is_multi_course ? 'multi-course-club' : 'single-course',
      club: clubData,
      venue: clubData, // @deprecated - use club
      courses: club.courses,
      is_home: club.is_home,
    };
  });

  return { data: displayItems, ...rest };
}

/**
 * Favorite course with both club and venue (deprecated) fields for backwards compatibility
 */
export type FavoriteCourseWithClub = CourseWithFavoriteStatus & { club: Club; venue: Club };

/**
 * @deprecated Use FavoriteCourseWithClub instead
 */
export type FavoriteCourseWithVenue = FavoriteCourseWithClub;

/**
 * Get favorite courses with club info
 */
export function useFavoriteCoursesWithClubs() {
  const { user } = useAuth();

  return useQuery({
    queryKey: courseKeys.favorites(),
    queryFn: async (): Promise<FavoriteCourseWithClub[]> => {
      if (!user) return [];

      // Fetch favorites with course and club data
      const { data, error } = await supabase
        .from('favorite_courses')
        .select(`
          course_id,
          courses:course_id (
            *,
            club:club_id (*)
          )
        `)
        .eq('player_id', user.id);

      if (error) throw error;

      const typedData = data as SupabaseFavoriteCourseWithClub[] | null;
      return (typedData ?? [])
        .map((item: SupabaseFavoriteCourseWithClub) => ({
          ...item.courses,
          club: item.courses.club,
          venue: item.courses.club, // @deprecated - use club
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
 * Create a new club
 */
export function useCreateClub() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: CreateClubInput): Promise<Club> => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Supabase generated types restriction workaround
      const { data, error } = await (supabase as any)
        .from('clubs')
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
      return data as Club;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: clubKeys.all });
    },
  });
}

/**
 * Create a new course at a club
 */
export function useCreateCourse() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: CreateClubCourseInput): Promise<Course> => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Supabase generated types restriction workaround
      const { data, error } = await (supabase as any)
        .from('courses')
        .insert({
          club_id: input.club_id,
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
      queryClient.invalidateQueries({ queryKey: clubKeys.all });
      queryClient.invalidateQueries({ queryKey: courseKeys.all });
    },
  });
}

/**
 * Create club and course together (convenience hook)
 * Useful for manual entry where you want to create both at once
 */
export function useCreateClubWithCourse() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: {
      club: CreateClubInput;
      course?: Partial<CreateClubCourseInput>;
    }): Promise<{ club: Club; course: Course }> => {
      // Create club first
      // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Supabase generated types restriction workaround
      const { data: club, error: clubError } = await (supabase as any)
        .from('clubs')
        .insert({
          name: input.club.name,
          state: input.club.state ?? null,
          city: input.club.city ?? null,
          address: input.club.address ?? null,
          total_holes: input.club.total_holes ?? 18,
          source: 'manual',
        })
        .select()
        .single();

      if (clubError) throw clubError;
      if (!club) throw new Error('No club data returned from insert');

      // Create default course at club
      const courseName = input.course?.name || input.club.name;
      // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Supabase generated types restriction workaround
      const { data: course, error: courseError } = await (supabase as any)
        .from('courses')
        .insert({
          club_id: club.id,
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

      return { club: club as Club, course: course as Course };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: clubKeys.all });
      queryClient.invalidateQueries({ queryKey: courseKeys.all });
    },
  });
}

// =====================================================
// DEPRECATED HOOKS (for backward compatibility)
// =====================================================

/**
 * @deprecated Use useClubsWithCourses instead
 */
export const useVenuesWithCourses = useClubsWithCourses;

/**
 * @deprecated Use useSearchClubs instead
 */
export const useSearchVenues = useSearchClubs;

/**
 * @deprecated Use useClubCourseDisplayItems instead
 */
export const useVenueCourseDisplayItems = useClubCourseDisplayItems;

/**
 * @deprecated Use useFavoriteCoursesWithClubs instead
 */
export const useFavoriteCoursesWithVenues = useFavoriteCoursesWithClubs;

/**
 * @deprecated Use useCreateClub instead
 */
export const useCreateVenue = useCreateClub;

/**
 * @deprecated Use useCreateClubWithCourse instead
 */
export const useCreateVenueWithCourse = useCreateClubWithCourse;

// Note: useAddCourseFavorite and useRemoveCourseFavorite are now re-exported
// from useFavoriteCourses at the top of this file for backward compatibility
