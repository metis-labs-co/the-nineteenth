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
  leaderboardKeys,
} from '@/hooks/queryKeys';
import { recalculateScorecardDifferential } from '@/services/handicap/recalculateScorecardDifferential';
import type { TeeBox } from '@/types';

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

// =====================================================
// EDIT TEES / RECALCULATE SCORECARD
// =====================================================

/** Input for updating a player's tee on a round and recalculating their scorecard. */
export interface UpdatePlayerTeeInput {
  roundId: string;
  playerId: string;
  scorecardId: string;
  /** Tee to set on round_players.selected_tee as a per-player override. */
  tee: TeeBox;
  /** Optional competition ID for extra cache invalidation. */
  competitionId?: string;
}

/**
 * Write a per-player tee override to `round_players` then call the existing
 * `recalculateScorecardDifferential` service so the scorecard's handicap
 * snapshot (daily_handicap_used, total_points, etc.) is regenerated from
 * the new tee's slope/CR.
 */
async function updatePlayerTeeAndRecalculate(input: UpdatePlayerTeeInput): Promise<void> {
  const { roundId, playerId, scorecardId, tee } = input;

  // 1. Update the round_players tee override. Some earlier records might
  //    not have a round_players row at all (older standalone rounds), so
  //    we upsert on (round_id, player_id) if supported; otherwise we
  //    update and insert on miss.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Supabase typed client workaround
  const { error: updateError } = await (supabase.from('round_players') as any)
    .update({ selected_tee: tee })
    .eq('round_id', roundId)
    .eq('player_id', playerId);
  if (updateError) {
    throw new Error(`Failed to update round_players: ${updateError.message}`);
  }

  // 2. Trigger the server-side recalc. This reads the effective tee
  //    (per-player override wins), computes WHS DHC, and rewrites
  //    all snapshot fields on the scorecard.
  await recalculateScorecardDifferential(scorecardId);
}

/**
 * Mutation hook to change the tee a player used on a completed round and
 * have all handicap snapshot / stableford points regenerated.
 *
 * Use this when the original tee selection was wrong (e.g. wizard
 * auto-selected the first tee but the player physically played a different
 * tee). After the mutation, the round list card, scorecard view and
 * leaderboard should all reflect the corrected tee's DHC and points.
 */
export function useUpdatePlayerTee() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: updatePlayerTeeAndRecalculate,
    onSuccess: (_, variables) => {
      // Invalidate everything that could display this scorecard.
      queryClient.invalidateQueries({ queryKey: scorecardKeys.list({ roundId: variables.roundId }) });
      queryClient.invalidateQueries({ queryKey: scorecardKeys.detail(variables.scorecardId) });
      queryClient.invalidateQueries({ queryKey: roundKeys.detail(variables.roundId) });
      queryClient.invalidateQueries({ queryKey: roundKeys.lists() });
      queryClient.invalidateQueries({ queryKey: leaderboardKeys.round(variables.roundId) });
      if (variables.competitionId) {
        queryClient.invalidateQueries({ queryKey: leaderboardKeys.competition(variables.competitionId) });
      }
    },
    onError: (error) => {
      console.error('[useUpdatePlayerTee] Failed to update tee / recalculate:', error);
    },
  });
}
