/**
 * Score Mismatch Hooks
 *
 * TanStack Query hooks for score mismatch detection and resolution.
 * Used when scoring pairs are enabled to handle self + partner scoring
 * with automatic mismatch detection on submission.
 *
 * Hooks:
 * - usePendingMismatches(roundId) - Get pending mismatches for a round
 * - useSubmissionReadiness(roundId, userId, enabled) - Check if user can submit
 * - usePartnerStatus(roundId, userId) - Get partner's scoring progress with manual refresh
 * - useSubmissionStatus(roundId, playerId) - Get bypass timer status
 * - useResolveMismatch() - Mutation to resolve a mismatch
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useCallback } from 'react';
import { useScorecardStore } from '@/store/scorecardStore';
import {
  getPendingMismatches,
  getMismatch,
  resolveMismatch,
  checkSubmissionReadiness,
  getPartnerProgress,
  applyResolvedScoreToScorecard,
  getSubmissionStatus,
  type ScoreMismatch,
  type SubmissionReadiness,
  type PartnerProgress,
  type ScoreSubmissionStatus,
} from '@/services/scoreMismatch';

// =====================================================
// QUERY KEYS
// =====================================================

export const scoreMismatchKeys = {
  all: ['scoreMismatch'] as const,
  mismatches: (roundId: string) => [...scoreMismatchKeys.all, 'mismatches', roundId] as const,
  readiness: (roundId: string, userId: string) =>
    [...scoreMismatchKeys.all, 'readiness', roundId, userId] as const,
  partnerStatus: (roundId: string, userId: string) =>
    [...scoreMismatchKeys.all, 'partner', roundId, userId] as const,
  submissionStatus: (roundId: string, playerId: string) =>
    [...scoreMismatchKeys.all, 'submission', roundId, playerId] as const,
};

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
    staleTime: 10 * 1000, // Consider data fresh for 10 seconds
    gcTime: 5 * 60 * 1000, // Keep in cache for 5 minutes

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
    gcTime: 5 * 60 * 1000, // Keep in cache for 5 minutes

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
    gcTime: 5 * 60 * 1000, // Keep in cache for 5 minutes

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
    staleTime: 30 * 1000, // Consider data fresh for 30 seconds
    gcTime: 5 * 60 * 1000, // Keep in cache for 5 minutes

    // Retry configuration
    retry: 2,
    retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 10000),

    // Refetch behavior
    refetchOnWindowFocus: true,
    refetchOnReconnect: true,
    refetchOnMount: true,
  });
}

// =====================================================
// MUTATION HOOKS
// =====================================================

/**
 * Resolution result type
 */
export interface ResolveMismatchResult {
  alreadyResolved: boolean;
  resolvedBy?: string;
}

/**
 * Mutation hook to resolve a mismatch
 *
 * Resolves a score mismatch with the chosen value, updates the scorecard,
 * and syncs the local SQLite database. Implements first-write-wins for
 * race conditions when both players try to resolve simultaneously.
 *
 * @returns Mutation result with resolveMismatch function
 *
 * @example
 * ```tsx
 * function MismatchResolutionCard({ mismatch, currentUserId }: Props) {
 *   const { mutate: resolve, isPending } = useResolveMismatch();
 *
 *   const handleResolve = (score: number) => {
 *     resolve(
 *       {
 *         mismatchId: mismatch.id,
 *         resolvedScore: score,
 *         resolvedBy: currentUserId,
 *         roundId: mismatch.round_id,
 *         playerId: mismatch.player_id,
 *         holeNumber: mismatch.hole_number,
 *       },
 *       {
 *         onSuccess: (result) => {
 *           if (result.alreadyResolved) {
 *             Alert.alert('Already Resolved', 'Your partner already resolved this mismatch');
 *           }
 *         },
 *         onError: (error) => {
 *           Alert.alert('Error', error.message);
 *         },
 *       }
 *     );
 *   };
 *
 *   return (
 *     <View>
 *       <Text>Hole {mismatch.hole_number}</Text>
 *       <Button
 *         onPress={() => handleResolve(mismatch.self_score)}
 *         loading={isPending}
 *       >
 *         Your Score: {mismatch.self_score}
 *       </Button>
 *       <Button
 *         onPress={() => handleResolve(mismatch.partner_score)}
 *         loading={isPending}
 *       >
 *         Partner's Score: {mismatch.partner_score}
 *       </Button>
 *     </View>
 *   );
 * }
 * ```
 */
export function useResolveMismatch() {
  const queryClient = useQueryClient();
  const { updateLocalScore } = useScorecardStore();

  return useMutation({
    mutationFn: async ({
      mismatchId,
      resolvedScore,
      resolvedBy,
      roundId,
      playerId,
      holeNumber,
    }: {
      mismatchId: string;
      resolvedScore: number;
      resolvedBy: string;
      roundId: string;
      playerId: string;
      holeNumber: number;
    }): Promise<ResolveMismatchResult> => {
      // Check if already resolved (first-write-wins)
      const existing = await getMismatch(mismatchId);
      if (existing?.status === 'resolved') {
        return {
          alreadyResolved: true,
          resolvedBy: existing.resolved_by ?? undefined,
        };
      }

      // Resolve the mismatch in the database
      await resolveMismatch(mismatchId, resolvedScore, resolvedBy);

      // Update remote scorecard with resolved score
      await applyResolvedScoreToScorecard(roundId, playerId, holeNumber, resolvedScore);

      // Update local SQLite to prevent drift
      await updateLocalScore(roundId, playerId, holeNumber, resolvedScore);

      return { alreadyResolved: false };
    },

    onSuccess: (result, variables) => {
      // Invalidate mismatches list to refresh the UI
      queryClient.invalidateQueries({
        queryKey: scoreMismatchKeys.mismatches(variables.roundId),
      });

      // Invalidate readiness check to update submit button state
      queryClient.invalidateQueries({
        queryKey: scoreMismatchKeys.readiness(variables.roundId, variables.resolvedBy),
      });

      // Also invalidate scorecard queries to reflect updated scores
      queryClient.invalidateQueries({
        queryKey: ['scorecards', 'player', variables.roundId, variables.playerId],
      });
    },

    onError: (error) => {
      console.error('[useResolveMismatch] Failed to resolve mismatch:', error);
    },
  });
}

// =====================================================
// HELPER HOOKS
// =====================================================

/**
 * Combined hook for mismatch resolution flow
 *
 * Provides all the data and actions needed for the mismatch resolution modal.
 *
 * @param roundId - Round UUID
 * @param userId - Current user's player UUID
 * @param scoringPairsEnabled - Whether scoring pairs feature is enabled
 * @param holeCount - Number of holes (9 or 18)
 * @returns Combined data and actions for mismatch resolution
 *
 * @example
 * ```tsx
 * function ReviewScorecardScreen({ roundId }: Props) {
 *   const { userId } = useAuth();
 *   const mismatchFlow = useMismatchResolutionFlow(roundId, userId, true, 18);
 *
 *   if (mismatchFlow.readiness?.reason === 'waiting_for_partner') {
 *     return <WaitingDialog {...mismatchFlow} />;
 *   }
 *
 *   if (mismatchFlow.mismatches?.length > 0) {
 *     return <MismatchModal {...mismatchFlow} />;
 *   }
 *
 *   return <SubmitButton />;
 * }
 * ```
 */
export function useMismatchResolutionFlow(
  roundId: string | undefined,
  userId: string | undefined,
  scoringPairsEnabled: boolean,
  holeCount: number = 18
) {
  const {
    data: mismatches,
    isLoading: mismatchesLoading,
    refetch: refetchMismatches,
  } = usePendingMismatches(roundId);

  const {
    data: readiness,
    isLoading: readinessLoading,
    refetch: refetchReadiness,
  } = useSubmissionReadiness(roundId, userId, scoringPairsEnabled, holeCount);

  const {
    data: partnerStatus,
    isLoading: partnerLoading,
    isRefetching: partnerRefetching,
    refresh: refreshPartner,
  } = usePartnerStatus(roundId, userId, holeCount);

  const { data: submissionStatus, isLoading: submissionStatusLoading } = useSubmissionStatus(
    roundId,
    userId
  );

  const {
    mutate: resolveMismatch,
    isPending: isResolving,
    error: resolveError,
  } = useResolveMismatch();

  // Refresh all data
  const refreshAll = useCallback(() => {
    refetchMismatches();
    refetchReadiness();
    refreshPartner();
  }, [refetchMismatches, refetchReadiness, refreshPartner]);

  return {
    // Data
    mismatches,
    readiness,
    partnerStatus,
    submissionStatus,

    // Loading states
    isLoading: mismatchesLoading || readinessLoading || partnerLoading || submissionStatusLoading,
    isResolving,
    isPartnerRefetching: partnerRefetching,

    // Error
    resolveError,

    // Actions
    resolveMismatch,
    refreshPartner,
    refreshAll,

    // Derived states
    canSubmit: readiness?.canSubmit ?? false,
    hasPendingMismatches: (mismatches?.length ?? 0) > 0,
    pendingMismatchCount: mismatches?.length ?? 0,
    isWaitingForPartner: readiness?.reason === 'waiting_for_partner',
    partnerName: partnerStatus?.partnerName ?? readiness?.partnerName ?? 'Partner',
    partnerProgress: partnerStatus?.progress ?? readiness?.partnerProgress,
  };
}
