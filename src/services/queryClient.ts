/**
 * React Query Client Configuration
 *
 * Centralized QueryClient instance for use across the app.
 * This allows cache invalidation from non-React contexts (like sync services).
 */

import { QueryClient } from '@tanstack/react-query';
import { leaderboardKeys, scorecardKeys } from '@/hooks/queryKeys';

// Create React Query client
export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 2,
      staleTime: 5 * 60 * 1000, // 5 minutes
      gcTime: 10 * 60 * 1000, // 10 minutes (formerly cacheTime)
    },
  },
});

/**
 * Invalidate leaderboard cache for a competition
 * Call this after scorecard submission/sync
 */
export function invalidateLeaderboardCache(competitionId?: string): void {
  if (competitionId) {
    queryClient.invalidateQueries({
      queryKey: leaderboardKeys.competition(competitionId),
    });
  } else {
    // Invalidate all leaderboard queries
    queryClient.invalidateQueries({
      queryKey: leaderboardKeys.all,
    });
  }
}

/**
 * Invalidate scorecard cache for a round
 */
export function invalidateScorecardCache(roundId?: string): void {
  if (roundId) {
    queryClient.invalidateQueries({
      queryKey: scorecardKeys.list({ roundId }),
    });
  } else {
    queryClient.invalidateQueries({
      queryKey: scorecardKeys.all,
    });
  }
}

/**
 * Invalidate handicap history cache for a player
 * Call this after a scorecard with a differential is synced
 */
export function invalidateHandicapCache(playerId: string): void {
  queryClient.invalidateQueries({
    queryKey: ['handicap', 'history', playerId],
  });
}
