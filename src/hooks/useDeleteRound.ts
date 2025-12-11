/**
 * useDeleteRound - Hook for deleting rounds
 *
 * @description
 * Provides a mutation hook for deleting rounds (both standalone practice rounds
 * and competition rounds). Handles cache invalidation for rounds and related data.
 *
 * Deletion rules:
 * - Practice rounds: Only the creator can delete
 * - Competition rounds: Only the competition organizer can delete, and only if status is 'upcoming'
 */

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/services/supabase/client';
import { roundKeys, scorecardKeys, competitionKeys } from '@/hooks/queryKeys';

// =====================================================
// TYPES
// =====================================================

export interface DeleteRoundInput {
  /** The round ID to delete */
  roundId: string;
  /** Competition ID if this is a competition round (for cache invalidation) */
  competitionId?: string;
}

export interface DeleteRoundResult {
  success: boolean;
  roundId: string;
}

// =====================================================
// SERVICE FUNCTION
// =====================================================

/**
 * Delete a round and all related data
 *
 * This will cascade delete:
 * - Scorecards for this round
 * - Hole scores for this round
 * - Pairings for this round
 * - Scoring pairs for this round
 * - Round results for this round
 */
async function deleteRound(roundId: string): Promise<DeleteRoundResult> {
  // Delete the round - cascading deletes should handle related records
  // based on ON DELETE CASCADE foreign key constraints
  const { error } = await supabase
    .from('rounds')
    .delete()
    .eq('id', roundId);

  if (error) {
    console.error('[deleteRound] Failed to delete round:', error);
    throw new Error(`Failed to delete round: ${error.message}`);
  }

  return {
    success: true,
    roundId,
  };
}

// =====================================================
// HOOK
// =====================================================

/**
 * Mutation hook to delete a round
 *
 * Handles deletion and cache invalidation for rounds and related data.
 *
 * @returns Mutation result with deleteRound function
 *
 * @example
 * ```tsx
 * function DeleteRoundButton({ round, competitionId }: Props) {
 *   const { mutate: deleteRound, isPending } = useDeleteRound();
 *   const navigation = useNavigation();
 *
 *   const handleDelete = () => {
 *     deleteRound(
 *       { roundId: round.id, competitionId },
 *       {
 *         onSuccess: () => {
 *           navigation.goBack();
 *         },
 *         onError: (error) => {
 *           Alert.alert('Error', error.message);
 *         },
 *       }
 *     );
 *   };
 *
 *   return (
 *     <Button onPress={handleDelete} loading={isPending}>
 *       Delete Round
 *     </Button>
 *   );
 * }
 * ```
 */
export function useDeleteRound() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: DeleteRoundInput): Promise<DeleteRoundResult> => {
      return deleteRound(input.roundId);
    },

    onSuccess: (_, variables) => {
      // Remove the specific round from cache
      queryClient.removeQueries({
        queryKey: roundKeys.detail(variables.roundId),
      });

      // Invalidate scorecards for this round
      queryClient.invalidateQueries({
        queryKey: scorecardKeys.list({ roundId: variables.roundId }),
      });

      // If this was a competition round, invalidate competition-related queries
      if (variables.competitionId) {
        // Invalidate rounds list for this competition
        queryClient.invalidateQueries({
          queryKey: roundKeys.list(variables.competitionId),
        });

        // Invalidate the competition detail to reflect updated round count
        queryClient.invalidateQueries({
          queryKey: competitionKeys.detail(variables.competitionId),
        });
      }

      // Invalidate all rounds lists (for standalone rounds)
      queryClient.invalidateQueries({
        queryKey: roundKeys.lists(),
      });
    },

    onError: (error) => {
      console.error('[useDeleteRound] Failed to delete round:', error);
    },
  });
}

export default useDeleteRound;
