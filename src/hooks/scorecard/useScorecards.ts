/**
 * Scorecard Query Hooks
 *
 * TanStack Query hooks for fetching and caching scorecard data.
 * Includes offline support via SQLite fallback.
 *
 * Note: Uses getIsOnline from sync service for consistency with sync logic.
 * For React components that need reactive online status, use
 * useOnlineStatus from '@/hooks/useOnlineStatus' instead.
 */

import { useQuery } from '@tanstack/react-query';
import { apiClient as _apiClient } from '@/services/api/client';
import { getScorecardsByRound } from '@/services/offline/database';
import { getIsOnline } from '@/services/offline/sync';
import { scorecardKeys } from '@/hooks/queryKeys';
import type { Scorecard } from '@/types';

// Re-export scorecardKeys for backwards compatibility
export { scorecardKeys };

interface UseScorecardsByRoundOptions {
  enabled?: boolean;
}

/**
 * Fetch all scorecards for a round
 * Falls back to offline data when not connected
 */
export function useScorecardsByRound(
  roundId: string | undefined,
  options: UseScorecardsByRoundOptions = {}
) {
  return useQuery({
    queryKey: scorecardKeys.list({ roundId }),
    queryFn: async (): Promise<Scorecard[]> => {
      const isOnline = getIsOnline();

      if (isOnline) {
        try {
          // TODO: Replace with actual API call when backend is ready
          // const response = await apiClient.get<Scorecard[]>(`/rounds/${roundId}/scorecards`);
          // return response.data;

          // For now, try to get from SQLite
          const scorecards = await getScorecardsByRound(roundId!);
          return scorecards;
        } catch {
          // Fall back to offline data
          return getScorecardsByRound(roundId!);
        }
      } else {
        // Offline - get from SQLite
        return getScorecardsByRound(roundId!);
      }
    },
    enabled: !!roundId && options.enabled !== false,
    staleTime: 1000 * 60 * 5, // 5 minutes
    gcTime: 1000 * 60 * 30, // 30 minutes (was cacheTime)
  });
}

/**
 * Fetch a single scorecard by ID
 */
export function useScorecard(scorecardId: string | undefined) {
  return useQuery({
    queryKey: scorecardKeys.detail(scorecardId ?? ''),
    queryFn: async (): Promise<Scorecard | null> => {
      // TODO: Replace with actual API call when backend is ready
      // const response = await apiClient.get<Scorecard>(`/scorecards/${scorecardId}`);
      // return response.data;

      // TODO: Replace with actual API call when backend is ready
      return null;
    },
    enabled: !!scorecardId,
  });
}
