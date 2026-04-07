/**
 * Score Mismatch Hooks - Mismatch Resolution Flow
 *
 * Combined hook that provides all data and actions needed for the
 * mismatch resolution modal/flow.
 */

import { useCallback } from 'react';
import {
  usePendingMismatches,
  useSubmissionReadiness,
  usePartnerStatus,
  useSubmissionStatus,
} from './queries';
import { useResolveMismatch } from './mutations';

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
