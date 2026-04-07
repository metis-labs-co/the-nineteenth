/**
 * Course Service - Search Operations
 *
 * Search clubs from cache and optionally external API.
 */

import { golfApiClient, RateLimitError, NetworkError } from '@/services/api/golfApiClient';
import { courseCacheService } from '../cacheService';
import { transformApiClubResponse } from '@/services/api/golfApiTransformers';
import type { Club } from '@/types/database.types';
import type { GolfApiSearchParams, GolfApiClubResponse } from '@/services/api/golfApiTypes';
import { createModuleLogger } from '@/utils/debugLogger';
import type { CourseSearchParams, CourseSearchResult } from './types';

const logger = createModuleLogger('CourseService');

/**
 * Search clubs from cache and optionally API
 *
 * @param params - Search parameters
 * @returns Combined search results
 */
export async function searchCourses(params: CourseSearchParams): Promise<CourseSearchResult> {
  const {
    query,
    state,
    city,
    country,
    limit = 20,
    offset = 0,
    searchApi = false,
  } = params;

  // Always search cache first (now searches clubs table)
  const cacheResult = await courseCacheService.searchCachedClubs({
    query,
    state,
    city,
    limit,
    offset,
  });

  const result: CourseSearchResult = {
    cached: cacheResult.clubs,
    apiResults: [],
    fromCache: true,
    apiSearched: false,
    cachedTotal: cacheResult.total,
    hasMoreCached: cacheResult.hasMore,
  };

  // If API search is disabled or not available, return cache only
  if (!searchApi || !golfApiClient.isAvailable()) {
    return result;
  }

  // Try API search
  try {
    const apiParams: GolfApiSearchParams = {
      query,
      state,
      country,
    };

    const apiResults = await golfApiClient.searchClubs(apiParams);

    result.apiSearched = true;

    // Transform API results to Club format
    // Search results have a subset of club fields - cast to satisfy transformer
    const apiClubs = apiResults.map((clubResponse) => transformApiClubResponse(clubResponse as unknown as GolfApiClubResponse));

    // Filter out clubs already in cache (by golfapi_club_id)
    const cachedGolfApiIds = new Set(
      cacheResult.clubs.filter((c: Club) => c.golfapi_club_id).map((c: Club) => c.golfapi_club_id)
    );

    result.apiResults = apiClubs.filter(
      (c) => c.golfapi_club_id && !cachedGolfApiIds.has(c.golfapi_club_id)
    );

    result.fromCache = false;
  } catch (error) {
    result.apiSearched = true;

    if (error instanceof RateLimitError) {
      result.apiError = `Rate limit exceeded. Try again in ${error.retryAfter} seconds.`;
    } else if (error instanceof NetworkError) {
      result.apiError = 'Network error. Showing cached results.';
    } else {
      result.apiError = 'API search failed. Showing cached results.';
    }

    logger.warn('API search failed', { error: error instanceof Error ? error.message : String(error) });
  }

  return result;
}
