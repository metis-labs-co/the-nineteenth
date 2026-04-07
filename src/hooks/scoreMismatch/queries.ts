/**
 * Score Mismatch Hooks - Query Hooks
 *
 * TanStack Query hooks for fetching score mismatch data.
 *
 * Hooks:
 * - usePendingMismatches: Get pending mismatches for a round
 * - useSubmissionReadiness: Check if user can submit scorecard
 * - usePartnerStatus: Get partner's scoring progress with manual refresh
 * - useSubmissionStatus: Get bypass timer status
 */

import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useCallback } from 'react';
import { CACHE_TIMES, GC_TIMES } from '@/constants/cacheConfig';
import { scoreMismatchKeys } from '@/hooks/queryKeys';
import {
  getPendingMismatches,
  getPartnerProgress,
  checkSubmissionReadiness,
  getSubmissionStatus,
  type ScoreMismatch,
  type SubmissionReadiness,
  type PartnerProgress,
  type ScoreSubmissionStatus,
} from '@/services/scoreMismatch';

// =====================================================
// QUERY HOOKS
// =====================================================

/**
 * Query hook to get pending mismatches for a round
 *
 * Returns mismatches that need resolution before submission.
 *
 * @param roundId - Round UUID
 * @returns Query result with pending mismatches array
 *
 * @example
 * ```tsx
 * function MismatchList({ roundId }: { roundId: string }) {
 *   const { data: mismatches, isLoading, error } = usePendingMismatches(roundId);
 *
 *   if (isLoading) return <LoadingSpinner />;
 *   if (error) return <ErrorState message={error.message} />;
 *   if (!mismatches?.length) return <Text>No mismatches found</Text>;
 *
 *   return (
 *     <FlatList
 *       data={mismatches}
 *       renderItem={({ item }) => (
 *         <MismatchCard mismatch={item} />
 *       )}
 *     />
 *   );
 * }
 * ```
 */
export function usePendingMismatches(roundId: string | undefined) {
  return useQuery({
    queryKey: scoreMismatchKeys.mismatches(roundId!),
    queryFn: async (): Promise<ScoreMismatch[]> => {
      return getPendingMismatches(roundId!);
    },

    // Only fetch if roundId is provided
    enabled: !!roundId,

    // Cache configuration - refresh frequently since mismatches can be resolved by partner
    staleTime: CACHE_TIMES.REALTIME, // Consider data fresh for 10 seconds
    gcTime: GC_TIMES.SHORT, // Keep in cache for 5 minutes

    // Retry configuration
    retry: 2,
    retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 10000),

    // Refetch behavior
    refetchOnWindowFocus: true, // Refetch when user returns
    refetchOnReconnect: true,
    refetchOnMount: true,
  });
}

/**
 * Query hook to check submission readiness
 *
 * Checks if the user can submit their scorecard:
 * - Partner must have completed all entries
 * - No pending mismatches
 *
 * @param roundId - Round UUID
 * @param userId - Current user's player UUID
 * @param scoringPairsEnabled - Whether scoring pairs feature is enabled
 * @param holeCount - Number of holes (9 or 18)
 * @returns Query result with readiness status
 *
 * @example
 * ```tsx
 * function SubmitButton({ roundId, userId }: Props) {
 *   const { data: readiness, isLoading } = useSubmissionReadiness(
 *     roundId,
 *     userId,
 *     true,
 *     18
 *   );
 *
 *   if (isLoading) return <Button disabled loading>Checking...</Button>;
 *
 *   if (!readiness?.canSubmit) {
 *     return (
 *       <View>
 *         <Button disabled>Submit Scorecard</Button>
 *         <Text>{readiness?.reason === 'waiting_for_partner'
 *           ? `Waiting for ${readiness.partnerName}`
 *           : 'Resolve mismatches first'
 *         }</Text>
 *       </View>
 *     );
 *   }
 *
 *   return <Button onPress={handleSubmit}>Submit Scorecard</Button>;
 * }
 * ```
 */
export function useSubmissionReadiness(
  roundId: string | undefined,
  userId: string | undefined,
  scoringPairsEnabled: boolean,
  holeCount: number = 18
) {
  return useQuery({
    queryKey: scoreMismatchKeys.readiness(roundId!, userId!),
    queryFn: async (): Promise<SubmissionReadiness> => {
      return checkSubmissionReadiness(roundId!, userId!, scoringPairsEnabled, holeCount);
    },

    // Only fetch if both params are provided and scoring pairs are enabled
    enabled: !!roundId && !!userId && scoringPairsEnabled,

    // Cache configuration - check frequently
    staleTime: 5 * 1000, // Consider data fresh for 5 seconds
    gcTime: GC_TIMES.SHORT, // Keep in cache for 5 minutes

    // Retry configuration
    retry: 2,
    retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 10000),

    // Refetch behavior
    refetchOnWindowFocus: true,
    refetchOnReconnect: true,
    refetchOnMount: true,
  });
}

/**
 * Query hook for partner status with manual refresh
 *
 * Gets the partner's scoring progress and provides a manual refresh function.
 * Simpler than realtime subscriptions for a once-per-round flow.
 *
 * @param roundId - Round UUID
 * @param userId - Current user's player UUID
 * @param holeCount - Number of holes (9 or 18)
 * @returns Query result with partner progress and refresh function
 *
 * @example
 * ```tsx
 * function WaitingForPartner({ roundId, userId }: Props) {
 *   const { data: status, isLoading, isRefetching, refresh } = usePartnerStatus(
 *     roundId,
 *     userId,
 *     18
 *   );
 *
 *   if (isLoading) return <LoadingSpinner />;
 *
 *   const holesComplete = Math.floor(status.progress.completed / 2);
 *   const totalHoles = Math.floor(status.progress.total / 2);
 *
 *   return (
 *     <View>
 *       <Text>
 *         Waiting for {status.partnerName}
 *       </Text>
 *       <Text>
 *         Progress: {holesComplete}/{totalHoles} holes
 *       </Text>
 *       <Button
 *         onPress={refresh}
 *         loading={isRefetching}
 *       >
 *         Check Again
 *       </Button>
 *     </View>
 *   );
 * }
 * ```
 */
export function usePartnerStatus(
  roundId: string | undefined,
  userId: string | undefined,
  holeCount: number = 18
) {
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: scoreMismatchKeys.partnerStatus(roundId!, userId!),
    queryFn: async (): Promise<PartnerProgress> => {
      return getPartnerProgress(roundId!, userId!, holeCount);
    },

    // Only fetch if both params are provided
    enabled: !!roundId && !!userId,

    // Always refetch on manual refresh (staleTime: 0)
    staleTime: 0,
    gcTime: GC_TIMES.SHORT, // Keep in cache for 5 minutes

    // Retry configuration
    retry: 2,
    retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 10000),

    // Refetch behavior
    refetchOnWindowFocus: false, // Only manual refresh
    refetchOnReconnect: true,
    refetchOnMount: true,
  });

  // Manual refresh function for "Check again" button
  const refresh = useCallback(() => {
    if (roundId && userId) {
      queryClient.invalidateQueries({
        queryKey: scoreMismatchKeys.partnerStatus(roundId, userId),
      });
    }
  }, [queryClient, roundId, userId]);

  return { ...query, refresh };
}

/**
 * Query hook to get submission status (bypass timer info)
 *
 * Returns information about the bypass timer, including when bypass
 * becomes available and whether it has been used.
 *
 * @param roundId - Round UUID
 * @param playerId - Player UUID
 * @returns Query result with submission status
 *
 * @example
 * ```tsx
 * function BypassButton({ roundId, playerId, onBypass }: Props) {
 *   const { data: status } = useSubmissionStatus(roundId, playerId);
 *
 *   if (!status?.bypass_available_at) return null;
 *
 *   const bypassAvailable = new Date(status.bypass_available_at) <= new Date();
 *
 *   if (!bypassAvailable) {
 *     return <Text>Bypass available in X minutes</Text>;
 *   }
 *
 *   return (
 *     <Button onPress={onBypass}>
 *       Submit without partner verification
 *     </Button>
 *   );
 * }
 * ```
 */
export function useSubmissionStatus(roundId: string | undefined, playerId: string | undefined) {
  return useQuery({
    queryKey: scoreMismatchKeys.submissionStatus(roundId!, playerId!),
    queryFn: async (): Promise<ScoreSubmissionStatus | null> => {
      return getSubmissionStatus(roundId!, playerId!);
    },

    // Only fetch if both params are provided
    enabled: !!roundId && !!playerId,

    // Cache configuration - refresh periodically to check bypass availability
    staleTime: CACHE_TIMES.SHORT, // Consider data fresh for 30 seconds
    gcTime: GC_TIMES.SHORT, // Keep in cache for 5 minutes

    // Retry configuration
    retry: 2,
    retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 10000),

    // Refetch behavior
    refetchOnWindowFocus: true,
    refetchOnReconnect: true,
    refetchOnMount: true,
  });
}
