/**
 * Score Mismatch Hooks - Mutation Hooks
 *
 * TanStack Query mutation hooks for resolving score mismatches.
 *
 * Hooks:
 * - useResolveMismatch: Resolve a score mismatch with chosen value
 */

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { scoreMismatchKeys } from '@/hooks/queryKeys';
import { useScorecardStore } from '@/store/scorecardStore';
import {
  getMismatch,
  resolveMismatch,
  applyResolvedScoreToScorecard,
} from '@/services/scoreMismatch';
import type { ResolveMismatchResult } from './types';

// =====================================================
// MUTATION HOOKS
// =====================================================

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
