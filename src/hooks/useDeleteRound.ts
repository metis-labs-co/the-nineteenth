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
import {
  roundKeys,
  scorecardKeys,
  competitionKeys,
  skinsKeys,
  prizePoolKeys,
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
 * Handle skins game cleanup before round deletion
 *
 * If the round has a pool-sourced skins game:
 * 1. Return the pot to the prize pool
 * 2. Cancel the skins game
 *
 * @returns The competition ID if skins cleanup was performed (for redistribution)
 */
async function cleanupSkinsGame(
  roundId: string,
  competitionId?: string
): Promise<void> {
  // Check for pool-sourced skins game
  const { data: skinsGameData } = await supabase
    .from('skins_games')
    .select('id, pot_value, pool_source')
    .eq('round_id', roundId)
    .eq('pool_source', 'prize_pool')
    .neq('status', 'cancelled')
    .maybeSingle();

  const skinsGame = skinsGameData as { id: string; pot_value: number; pool_source: string } | null;

  if (!skinsGame || !competitionId) {
    return;
  }

  // Get the prize pool ID
  const { data: poolData } = await supabase
    .from('competition_prize_pools')
    .select('id')
    .eq('competition_id', competitionId)
    .maybeSingle();

  const pool = poolData as { id: string } | null;

  if (!pool) {
    console.warn('[deleteRound] No prize pool found for skins cleanup');
    return;
  }

  // Return funds to pool
  const { error: returnError } = await supabase.rpc('return_to_pool' as never, {
    p_pool_id: pool.id,
    p_round_id: roundId,
    p_amount: skinsGame.pot_value,
    p_description: 'Round deleted - skins pot returned',
  } as never);

  if (returnError) {
    console.error('[deleteRound] Failed to return pot to pool:', returnError);
    // Continue with deletion - don't block on this
  }

  // Cancel the skins game
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { error: cancelError } = await (supabase as any)
    .from('skins_games')
    .update({ status: 'cancelled' })
    .eq('id', skinsGame.id);

  if (cancelError) {
    console.error('[deleteRound] Failed to cancel skins game:', cancelError);
  }

  console.log('[deleteRound] Skins cleanup completed, pot returned to pool');
}

/**
 * Trigger redistribution of skins pots after round deletion
 */
async function triggerSkinsRedistribution(competitionId: string): Promise<void> {
  // Check if competition has auto_split_skins enabled
  const { data: poolData } = await supabase
    .from('competition_prize_pools')
    .select('auto_split_skins')
    .eq('competition_id', competitionId)
    .maybeSingle();

  const pool = poolData as { auto_split_skins: boolean } | null;

  if (!pool?.auto_split_skins) {
    return;
  }

  // Trigger redistribution
  const { error } = await supabase.rpc('redistribute_skins_pots' as never, {
    p_competition_id: competitionId,
  } as never);

  if (error) {
    console.warn('[deleteRound] Skins redistribution failed:', error);
  } else {
    console.log('[deleteRound] Skins redistribution completed');
  }
}

/**
 * Delete a round and all related data
 *
 * This will cascade delete:
 * - Scorecards for this round
 * - Hole scores for this round
 * - Pairings for this round
 * - Scoring pairs for this round
 * - Round results for this round
 *
 * Additionally handles:
 * - Skins game cleanup (returns pot to prize pool if pool-sourced)
 * - Skins pot redistribution (rebalances remaining rounds if auto_split_skins enabled)
 */
async function deleteRound(
  roundId: string,
  competitionId?: string
): Promise<DeleteRoundResult> {
  // Step 1: Clean up skins game if present (return pot to pool, cancel game)
  await cleanupSkinsGame(roundId, competitionId);

  // Step 2: Delete the round - cascading deletes handle related records
  // based on ON DELETE CASCADE foreign key constraints
  const { error } = await supabase
    .from('rounds')
    .delete()
    .eq('id', roundId);

  if (error) {
    console.error('[deleteRound] Failed to delete round:', error);
    throw new Error(`Failed to delete round: ${error.message}`);
  }

  // Step 3: Trigger redistribution for remaining rounds (non-blocking)
  if (competitionId) {
    // Run async - don't block on this
    triggerSkinsRedistribution(competitionId).catch((err) => {
      console.warn('[deleteRound] Redistribution error:', err);
    });
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
      return deleteRound(input.roundId, input.competitionId);
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

        // Invalidate skins queries (redistribution may have occurred)
        queryClient.invalidateQueries({
          queryKey: skinsKeys.all,
        });

        // Invalidate prize pool queries (balance may have changed)
        queryClient.invalidateQueries({
          queryKey: prizePoolKeys.pool(variables.competitionId),
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
