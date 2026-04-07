/**
 * Club Hooks - Query Hooks
 *
 * TanStack Query hooks for fetching club and course data.
 *
 * Hooks:
 * - useClubsWithCourses: Fetch all clubs with their courses
 * - useSearchClubs: Search clubs with GolfAPI fallback
 * - useClubCourseDisplayItems: Get display items for hybrid list (deprecated)
 * - useFavoriteCoursesWithClubs: Get favorite courses with club info
 */

import { useState, useEffect, useMemo, useRef } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/services/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { clubKeys, courseKeys } from '@/hooks/queryKeys';
import { useFavoriteEnrichment } from '@/hooks/useFavoriteCourses';
import { useGolfApiSearch } from '@/hooks/useGolfApiSearch';
import { isClubStale, hasApiQuota } from '@/services/sync';
import { courseService } from '@/services/courses';
import { CACHE_TIMES } from '@/constants/cacheConfig';
import type { Club } from '@/types/database.types';
import { mergeTees } from './helpers';
import type {
  SupabaseClubWithCourses,
  SupabaseFavoriteCourseWithClub,
  ClubWithCourses,
  ClubCourseDisplayItem,
  FavoriteCourseWithClub,
  SearchResultItem,
} from './types';

// =====================================================
// FETCH HOOKS
// =====================================================

/**
 * Fetch all clubs with their courses
 * Returns data structured for hybrid list display
 */
export function useClubsWithCourses(options?: {
  country?: string;
  region?: string;
  featuredOnly?: boolean;
  enabled?: boolean;
}) {
  const { country, region, featuredOnly, enabled = true } = options ?? {};
  const { player } = useAuth();
  const { isFavorite, isLoading: favoritesLoading } = useFavoriteEnrichment();
  const homeClubId = player?.home_club_id ?? null;

  const query = useQuery({
    queryKey: clubKeys.withCoursesFiltered({ country, state: region, featured: featuredOnly, homeClubId: featuredOnly ? homeClubId : undefined }),
    queryFn: async (): Promise<SupabaseClubWithCourses[]> => {
      let clubQuery = supabase
        .from('clubs')
        .select(
          `
          *,
          courses!inner (*, tees_from_table:tees(*))
        `
        )
        .order('name', { ascending: true });

      if (country) {
        clubQuery = clubQuery.eq('country', country);
      }

      if (region) {
        clubQuery = clubQuery.eq('state', region);
      }

      if (featuredOnly) {
        if (homeClubId) {
          // Always include home club even if not featured
          clubQuery = clubQuery.or(`is_featured.eq.true,id.eq.${homeClubId}`);
        } else {
          clubQuery = clubQuery.eq('is_featured', true);
        }
      }

      const { data: clubs, error: clubsError } = await clubQuery;

      if (clubsError) throw clubsError;

      return (clubs as SupabaseClubWithCourses[] | null) ?? [];
    },
    enabled,
    staleTime: CACHE_TIMES.STANDARD,
  });

  // Transform to ClubWithCourses with favorite status
  const data = query.data
    ? query.data.map((club: SupabaseClubWithCourses) => {
        const courses = (club.courses ?? []).map((course) => ({
          ...mergeTees(course),
          is_favorite: isFavorite(course.id),
        }));

        return {
          ...club,
          courses,
          course_count: courses.length,
          is_multi_course: courses.length > 1,
          is_home: club.id === homeClubId,
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
export function useSearchClubs(searchQuery: string, state?: string) {
  const { player } = useAuth();
  const { isFavorite, isLoading: favoritesLoading } = useFavoriteEnrichment();
  const homeClubId = player?.home_club_id ?? null;

  // Debounce search query for API calls (300ms)
  const [debouncedQuery, setDebouncedQuery] = useState(searchQuery);

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedQuery(searchQuery), 300);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  // Local database query
  const localQuery = useQuery({
    queryKey: clubKeys.withCoursesFiltered({ search: searchQuery, state }),
    queryFn: async (): Promise<SupabaseClubWithCourses[]> => {
      let queryBuilder = supabase.from('clubs').select(`
          *,
          courses!inner (*, tees_from_table:tees(*))
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

      return (clubs as SupabaseClubWithCourses[] | null) ?? [];
    },
    enabled: searchQuery.length >= 2 || !!state,
    staleTime: CACHE_TIMES.MODERATE,
  });

  // Transform local results to ClubWithCourses with favorite status
  const localResults: ClubWithCourses[] | undefined = localQuery.data
    ? localQuery.data.map((club: SupabaseClubWithCourses) => {
        const courses = (club.courses ?? []).map((course) => ({
          ...mergeTees(course),
          is_favorite: isFavorite(course.id),
        }));

        return {
          ...club,
          courses,
          course_count: courses.length,
          is_multi_course: courses.length > 1,
          is_home: club.id === homeClubId,
        };
      })
    : undefined;

  // Determine if we should search GolfAPI.io
  // Only when local search finished AND local results < 3 AND debounced query is 3+ chars
  const shouldSearchApi =
    !localQuery.isLoading && (localResults?.length ?? 0) < 3 && debouncedQuery.length >= 3;

  // GolfAPI.io search (using debounced query)
  const apiQuery = useGolfApiSearch(debouncedQuery, state, shouldSearchApi);

  // Merge results with deduplication
  const mergedResults = useMemo((): SearchResultItem[] | undefined => {
    if (!localResults) return undefined;

    const apiResults = apiQuery.data ?? [];
    if (apiResults.length === 0) return localResults;

    // Get golfapi_club_ids already in local DB
    const localGolfApiIds = new Set(
      localResults.filter((c) => c.golfapi_club_id).map((c) => c.golfapi_club_id)
    );

    // Filter out API results already imported locally
    const newApiResults = apiResults.filter((r) => !localGolfApiIds.has(r.golfapi_club_id));

    return [...localResults, ...newApiResults];
  }, [localResults, apiQuery.data]);

  // =====================================================
  // STALE CLUB SYNC (background refresh)
  // =====================================================

  // Track which clubs we've already queued for refresh this session
  const syncedClubsRef = useRef<Set<string>>(new Set());

  // Check for stale local clubs and queue background refresh
  useEffect(() => {
    if (!localResults) return;

    // Filter local clubs that are stale and can be synced
    const staleClubs = localResults.filter(
      (club) =>
        club.golfapi_club_id &&
        isClubStale(club) &&
        !syncedClubsRef.current.has(club.golfapi_club_id)
    );

    if (staleClubs.length === 0) return;

    // Limit to 3 clubs per search to conserve API quota
    const clubsToSync = staleClubs.slice(0, 3);

    // Queue background refresh for each stale club
    for (const club of clubsToSync) {
      // Check quota before each refresh
      if (!hasApiQuota()) {
        console.warn('[useSearchClubs] Skipping sync - API quota exhausted');
        break;
      }

      // Mark as queued (before async call)
      syncedClubsRef.current.add(club.golfapi_club_id!);

      // Fire and forget - don't await, don't block UI
      courseService.importClubWithCourses(club.golfapi_club_id!).catch((error) => {
        console.warn('[useSearchClubs] Background sync failed:', club.name, error);
        // Remove from synced set so it can be retried later
        syncedClubsRef.current.delete(club.golfapi_club_id!);
      });
    }
  }, [localResults]);

  // Calculate if any local results are stale (for UI indicator)
  const hasStaleResults = useMemo(() => {
    if (!localResults) return false;
    return localResults.some((club) => club.golfapi_club_id && isClubStale(club));
  }, [localResults]);

  return {
    ...localQuery,
    data: mergedResults,
    isLoading: localQuery.isLoading || favoritesLoading,
    // Additional API search status
    isSearchingApi: apiQuery.isLoading,
    apiSearchEnabled: shouldSearchApi,
    // Stale data indicator
    hasStaleResults,
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
export function useClubCourseDisplayItems(state?: string) {
  const { data: clubs, ...rest } = useClubsWithCourses({ region: state });

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
      is_featured: club.is_featured,
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
        .select(
          `
          course_id,
          courses:course_id (
            *,
            club:club_id (*),
            tees_from_table:tees(*)
          )
        `
        )
        .eq('player_id', user.id);

      if (error) throw error;

      const typedData = data as SupabaseFavoriteCourseWithClub[] | null;
      return (typedData ?? [])
        .map((item: SupabaseFavoriteCourseWithClub) => ({
          ...mergeTees(item.courses),
          club: item.courses.club,
          venue: item.courses.club, // @deprecated - use club
          is_favorite: true,
        }))
        .filter((course) => course.id);
    },
    enabled: !!user,
    staleTime: CACHE_TIMES.STANDARD,
  });
}
