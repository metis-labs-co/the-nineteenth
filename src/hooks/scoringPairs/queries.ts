/**
 * Scoring Pairs - Query Hooks
 *
 * TanStack Query hooks for fetching scoring pair data in rounds.
 * Scoring pairs define who scores whom during a round.
 *
 * Hooks:
 * - useScoringPairs(roundId) - Fetch all scoring pairs for a round
 * - usePlayersToScore(roundId, scorerId) - Get players assigned to a scorer
 */

import { useQuery } from '@tanstack/react-query';
import { CACHE_TIMES, GC_TIMES } from '@/constants/cacheConfig';
import { scoringPairsKeys } from '@/hooks/queryKeys';
import {
  getRoundScoringPairs,
  getPlayersToScore,
} from '@/services/scoringPairs';
import type { ScoringPairWithPlayers } from '@/types/database.types';
import type { Player } from '@/types';

// =====================================================
// QUERY HOOKS
// =====================================================

/**
 * Query hook to fetch all scoring pairs for a round
 *
 * Returns pairs with full scorer and player data populated.
 *
 * @param roundId - Round UUID
 * @returns Query result with scoring pairs array
 *
 * @example
 * ```tsx
 * function ScoringPairsScreen({ roundId }: { roundId: string }) {
 *   const { data: pairs, isLoading, error, refetch } = useScoringPairs(roundId);
 *
 *   if (isLoading) return <LoadingSpinner />;
 *   if (error) return <ErrorState message={error.message} onRetry={refetch} />;
 *   if (!pairs?.length) return <EmptyState message="No scoring pairs set up" />;
 *
 *   return (
 *     <FlatList
 *       data={pairs}
 *       renderItem={({ item }) => (
 *         <Text>{item.scorer?.name} → {item.player?.name}</Text>
 *       )}
 *       refreshing={isLoading}
 *       onRefresh={refetch}
 *     />
 *   );
 * }
 * ```
 */
export function useScoringPairs(roundId: string) {
  return useQuery({
    queryKey: scoringPairsKeys.list(roundId),
    queryFn: async (): Promise<ScoringPairWithPlayers[]> => {
      return getRoundScoringPairs(roundId);
    },

    // Only fetch if roundId is provided
    enabled: !!roundId,

    // Cache configuration
    staleTime: CACHE_TIMES.STANDARD, // Consider data fresh for 5 minutes
    gcTime: GC_TIMES.STANDARD, // Keep in cache for 10 minutes

    // Retry configuration
    retry: 2,
    retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 10000),

    // Refetch behavior
    refetchOnWindowFocus: false,
    refetchOnReconnect: true,
    refetchOnMount: true,
  });
}

/**
 * Query hook to get players that a specific scorer can score
 *
 * Returns players assigned to the given scorer for this round.
 *
 * @param roundId - Round UUID
 * @param scorerId - Scorer (marker) player UUID
 * @returns Query result with players array
 *
 * @example
 * ```tsx
 * function ScoringScreen({ roundId, currentUserId }: Props) {
 *   const { data: playersToScore, isLoading } = usePlayersToScore(
 *     roundId,
 *     currentUserId
 *   );
 *
 *   if (isLoading) return <LoadingSpinner />;
 *   if (!playersToScore?.length) {
 *     return <Text>No players assigned to you for scoring</Text>;
 *   }
 *
 *   return (
 *     <FlatList
 *       data={playersToScore}
 *       renderItem={({ item }) => <PlayerScoreCard player={item} />}
 *     />
 *   );
 * }
 * ```
 */
export function usePlayersToScore(roundId: string, scorerId: string) {
  return useQuery({
    queryKey: scoringPairsKeys.playersToScore(roundId, scorerId),
    queryFn: async (): Promise<Player[]> => {
      return getPlayersToScore(roundId, scorerId);
    },

    // Only fetch if both params are provided
    enabled: !!roundId && !!scorerId,

    // Cache configuration
    staleTime: CACHE_TIMES.STANDARD, // Consider data fresh for 5 minutes
    gcTime: GC_TIMES.STANDARD, // Keep in cache for 10 minutes

    // Retry configuration
    retry: 2,
    retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 10000),

    // Refetch behavior
    refetchOnWindowFocus: false,
    refetchOnReconnect: true,
    refetchOnMount: true,
  });
}
