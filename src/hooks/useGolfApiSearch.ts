/**
 * useGolfApiSearch - Hook for searching GolfAPI.io for clubs
 *
 * Used as a fallback when local database search returns few/no results.
 * Results are transformed to match local ClubWithCourses shape for seamless merging.
 */

import { useQuery } from '@tanstack/react-query';
import { golfApiClient } from '@/services/api/golfApiClient';
import type { GolfApiClubSearchResult } from '@/services/api/golfApiTypes';
import type { RegionFilter } from '@/types/database.types';

// =====================================================
// TYPES
// =====================================================

/**
 * API search result transformed to match local display format
 */
export interface GolfApiSearchResultItem {
  /** Prefixed ID to distinguish from local DB IDs */
  id: string;
  /** Club name */
  name: string;
  /** Region/state code */
  state: string | null;
  /** City */
  city: string | null;
  /** Marker to identify as API result */
  source: 'golfapi';
  /** Original GolfAPI.io club ID (needed for import) */
  golfapi_club_id: string;
  /** Empty courses array (not yet imported) */
  courses: [];
  /** Course count (unknown until imported) */
  course_count: number;
  /** Whether multi-course (based on API response if available) */
  is_multi_course: boolean;
  /** Not home club (can't be until imported) */
  is_home: false;
  /** Original latitude from API */
  latitude: number | null;
  /** Original longitude from API */
  longitude: number | null;
}

// =====================================================
// TRANSFORM FUNCTIONS
// =====================================================

/**
 * Transform GolfAPI.io search result to local display format
 */
function transformApiResult(result: GolfApiClubSearchResult): GolfApiSearchResultItem {
  // Parse state - GolfAPI might return full name or abbreviation
  const state = result.state as string | undefined;

  // Parse latitude/longitude (stored as strings in API response)
  const latitude = result.latitude ? parseFloat(result.latitude) : null;
  const longitude = result.longitude ? parseFloat(result.longitude) : null;

  // Check if multi-course based on courses array if available
  const courseCount = result.courses?.length ?? 0;

  return {
    id: `golfapi_${result.clubID}`,
    name: result.clubName,
    state: state || null,
    city: result.city || null,
    source: 'golfapi',
    golfapi_club_id: result.clubID,
    courses: [],
    course_count: courseCount,
    is_multi_course: courseCount > 1,
    is_home: false,
    latitude: isNaN(latitude!) ? null : latitude,
    longitude: isNaN(longitude!) ? null : longitude,
  };
}

// =====================================================
// HOOK
// =====================================================

/**
 * Search GolfAPI.io for clubs
 *
 * @param searchQuery - Search text (min 3 characters)
 * @param state - Optional Australian state filter
 * @param enabled - Whether to run the query
 * @returns Query result with transformed API results
 */
export function useGolfApiSearch(
  searchQuery: string,
  state?: RegionFilter,
  enabled: boolean = true
) {
  return useQuery({
    queryKey: ['golfapi', 'search', searchQuery, state],
    queryFn: async (): Promise<GolfApiSearchResultItem[]> => {
      // Check if API is available
      if (!golfApiClient.isAvailable()) {
        console.log('[useGolfApiSearch] GolfAPI.io not configured, skipping');
        return [];
      }

      // Check quota before making request
      if (!golfApiClient.hasQuota(1)) {
        console.warn('[useGolfApiSearch] Low API quota, skipping search');
        return [];
      }

      try {
        const results = await golfApiClient.searchClubs({
          query: searchQuery,
          // country defaults to 'Australia' in golfApiClient
          state: state,
        });

        return results.map(transformApiResult);
      } catch (error) {
        // Log error but don't fail - API search is optional
        console.error('[useGolfApiSearch] Search failed:', error);
        return [];
      }
    },
    enabled: enabled && searchQuery.length >= 3,
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 10 * 60 * 1000, // 10 minutes
    retry: false, // Don't retry API failures
  });
}

/**
 * Check if an item is from GolfAPI.io (not local DB)
 */
export function isGolfApiResult(item: { source?: string }): item is GolfApiSearchResultItem {
  return item.source === 'golfapi';
}
