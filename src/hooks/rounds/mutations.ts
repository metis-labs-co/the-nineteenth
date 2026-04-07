/**
 * Round Mutation Hooks
 *
 * TanStack Query mutation hooks for round operations (delete, etc.).
 *
 * Deletion rules:
 * - Practice rounds: Only the creator can delete
 * - Competition rounds: Only the competition organizer can delete, and only if status is 'upcoming'
 */

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/services/supabase/client';
import {
  roundKeys,
  scorecardKeys,
  competitionKeys,
  skinsKeys,
} from '@/hooks/queryKeys';

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
 * - Skins games for this round (via cascade)
 */
async function deleteRound(
  roundId: string,
): Promise<DeleteRoundResult> {
  // Delete the round - cascading deletes handle related records
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

      // Invalidate skins queries (game may have been cancelled)
      queryClient.invalidateQueries({
        queryKey: skinsKeys.gamesByRound(variables.roundId),
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

        // Invalidate skins queries (games may have been cascade deleted)
        queryClient.invalidateQueries({
          queryKey: skinsKeys.all,
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
