/**
 * Scoring Pairs - Mutation Hooks
 *
 * TanStack Query mutation hooks for creating, auto-generating,
 * deleting, and shuffling scoring pairs.
 *
 * Hooks:
 * - useCreateScoringPairs() - Create scoring pairs
 * - useAutoGenerateScoringPairs() - Auto-generate pairs
 * - useGenerateTeamMatchPlayPairs() - Generate cross-team pairs
 * - useDeleteScoringPairs() - Delete all pairs for a round
 * - useShuffleScoringPairs() - Delete and regenerate pairs with new random assignments
 */

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { scoringPairsKeys } from '@/hooks/queryKeys';
import {
  createScoringPairs,
  autoGenerateAndSaveScoringPairs,
  generateTeamMatchPlayPairs,
  deleteScoringPairs,
} from '@/services/scoringPairs';
import { supabase } from '@/services/supabase/client';
import type { ScoringPair } from '@/types/database.types';
import type { ScoringPairCreateInput } from '@/types';

// =====================================================
// MUTATION HOOKS
// =====================================================

/**
 * Mutation hook to create scoring pairs
 *
 * Replaces any existing pairs for the round with the new pairs.
 * Invalidates the scoring pairs list on success.
 *
 * @returns Mutation result with createScoringPairs function
 *
 * @example
 * ```tsx
 * function SetupScoringPairs({ roundId, players }: Props) {
 *   const { mutate: savePairs, isPending } = useCreateScoringPairs();
 *
 *   const handleSave = (pairs: ScoringPairCreateInput[]) => {
 *     savePairs(
 *       { roundId, pairs },
 *       {
 *         onSuccess: (createdPairs) => {
 *           Alert.alert('Success', `Created ${createdPairs.length} scoring pairs`);
 *         },
 *         onError: (error) => {
 *           Alert.alert('Error', error.message);
 *         },
 *       }
 *     );
 *   };
 *
 *   return (
 *     <Button onPress={() => handleSave(pairs)} loading={isPending}>
 *       Save Pairs
 *     </Button>
 *   );
 * }
 * ```
 */
export function useCreateScoringPairs() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      roundId,
      pairs,
    }: {
      roundId: string;
      pairs: ScoringPairCreateInput[];
    }): Promise<ScoringPair[]> => {
      return createScoringPairs(roundId, pairs);
    },

    onSuccess: (data, variables) => {
      // Invalidate the scoring pairs list for this round
      queryClient.invalidateQueries({
        queryKey: scoringPairsKeys.list(variables.roundId),
      });
      // Also invalidate any playersToScore queries for this round
      queryClient.invalidateQueries({
        queryKey: [...scoringPairsKeys.all, 'playersToScore', variables.roundId],
      });
    },

    onError: (error) => {
      console.error('[useCreateScoringPairs] Failed to create scoring pairs:', error);
    },
  });
}

/**
 * Mutation hook to auto-generate scoring pairs
 *
 * Uses optimal auto-pairing algorithm:
 * - Even players: Reciprocal pairs (A<->B)
 * - Odd players: Circular chain (A->B->C->A)
 *
 * Invalidates the scoring pairs list on success.
 *
 * @returns Mutation result with autoGenerate function
 *
 * @example
 * ```tsx
 * function AutoPairButton({ roundId, players }: Props) {
 *   const { mutate: autoGenerate, isPending } = useAutoGenerateScoringPairs();
 *
 *   const handleAutoGenerate = () => {
 *     autoGenerate(
 *       { roundId, players },
 *       {
 *         onSuccess: (pairs) => {
 *           Alert.alert('Success', `Auto-generated ${pairs.length} pairs`);
 *         },
 *         onError: (error) => {
 *           Alert.alert('Error', error.message);
 *         },
 *       }
 *     );
 *   };
 *
 *   return (
 *     <Button onPress={handleAutoGenerate} loading={isPending}>
 *       Auto-Generate Pairs
 *     </Button>
 *   );
 * }
 * ```
 */
export function useAutoGenerateScoringPairs() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      roundId,
      players,
    }: {
      roundId: string;
      players: { id: string }[];
    }): Promise<ScoringPair[]> => {
      return autoGenerateAndSaveScoringPairs(roundId, players);
    },

    onSuccess: (data, variables) => {
      // Invalidate the scoring pairs list for this round
      queryClient.invalidateQueries({
        queryKey: scoringPairsKeys.list(variables.roundId),
      });
      // Also invalidate any playersToScore queries for this round
      queryClient.invalidateQueries({
        queryKey: [...scoringPairsKeys.all, 'playersToScore', variables.roundId],
      });
    },

    onError: (error) => {
      console.error('[useAutoGenerateScoringPairs] Failed to auto-generate pairs:', error);
    },
  });
}

/**
 * Mutation hook to generate cross-team scoring pairs for team match play
 *
 * Creates reciprocal pairs between players from opposing teams:
 * Team1[0] <-> Team2[0], Team1[1] <-> Team2[1], etc.
 *
 * Invalidates the scoring pairs list on success.
 *
 * @returns Mutation result with generateTeamPairs function
 *
 * @example
 * ```tsx
 * function TeamMatchPlaySetup({ roundId, team1, team2 }: Props) {
 *   const { mutate: generateTeamPairs, isPending } = useGenerateTeamMatchPlayPairs();
 *
 *   const handleSetup = () => {
 *     generateTeamPairs(
 *       {
 *         roundId,
 *         team1Players: team1.map(p => ({ id: p.id })),
 *         team2Players: team2.map(p => ({ id: p.id })),
 *       },
 *       {
 *         onSuccess: (pairs) => {
 *           Alert.alert('Success', `Created ${pairs.length} cross-team pairs`);
 *         },
 *         onError: (error) => {
 *           Alert.alert('Error', error.message);
 *         },
 *       }
 *     );
 *   };
 *
 *   return (
 *     <Button onPress={handleSetup} loading={isPending}>
 *       Set Up Cross-Team Scoring
 *     </Button>
 *   );
 * }
 * ```
 */
export function useGenerateTeamMatchPlayPairs() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      roundId,
      team1Players,
      team2Players,
    }: {
      roundId: string;
      team1Players: { id: string }[];
      team2Players: { id: string }[];
    }): Promise<ScoringPair[]> => {
      return generateTeamMatchPlayPairs(roundId, team1Players, team2Players);
    },

    onSuccess: (data, variables) => {
      // Invalidate the scoring pairs list for this round
      queryClient.invalidateQueries({
        queryKey: scoringPairsKeys.list(variables.roundId),
      });
      // Also invalidate any playersToScore queries for this round
      queryClient.invalidateQueries({
        queryKey: [...scoringPairsKeys.all, 'playersToScore', variables.roundId],
      });
    },

    onError: (error) => {
      console.error('[useGenerateTeamMatchPlayPairs] Failed to generate team pairs:', error);
    },
  });
}

/**
 * Mutation hook to delete all scoring pairs for a round
 *
 * Removes the pairs from cache and invalidates queries.
 *
 * @returns Mutation result with deletePairs function
 *
 * @example
 * ```tsx
 * function DeletePairsButton({ roundId }: { roundId: string }) {
 *   const { mutate: deletePairs, isPending } = useDeleteScoringPairs();
 *
 *   const handleDelete = () => {
 *     Alert.alert(
 *       'Delete Scoring Pairs',
 *       'Are you sure you want to delete all scoring pairs?',
 *       [
 *         { text: 'Cancel', style: 'cancel' },
 *         {
 *           text: 'Delete',
 *           style: 'destructive',
 *           onPress: () => {
 *             deletePairs(
 *               { roundId },
 *               {
 *                 onSuccess: () => {
 *                   Alert.alert('Deleted', 'Scoring pairs have been removed');
 *                 },
 *               }
 *             );
 *           },
 *         },
 *       ]
 *     );
 *   };
 *
 *   return (
 *     <Button onPress={handleDelete} loading={isPending} variant="danger">
 *       Delete All Pairs
 *     </Button>
 *   );
 * }
 * ```
 */
export function useDeleteScoringPairs() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ roundId }: { roundId: string }): Promise<void> => {
      return deleteScoringPairs(roundId);
    },

    onSuccess: (_, variables) => {
      // Invalidate the scoring pairs list for this round
      queryClient.invalidateQueries({
        queryKey: scoringPairsKeys.list(variables.roundId),
      });
      // Also invalidate any playersToScore queries for this round
      queryClient.invalidateQueries({
        queryKey: [...scoringPairsKeys.all, 'playersToScore', variables.roundId],
      });
    },

    onError: (error) => {
      console.error('[useDeleteScoringPairs] Failed to delete scoring pairs:', error);
    },
  });
}

/**
 * Mutation hook to shuffle scoring pairs (delete and regenerate)
 *
 * Deletes existing pairs and generates new random assignments.
 * Fetches players from the round's pairings to regenerate pairs.
 *
 * @returns Mutation result with shufflePairs function
 *
 * @example
 * ```tsx
 * function ShufflePairsButton({ roundId, competitionId }: Props) {
 *   const { mutate: shufflePairs, isPending } = useShuffleScoringPairs();
 *
 *   const handleShuffle = () => {
 *     shufflePairs(
 *       { roundId, competitionId },
 *       {
 *         onSuccess: (pairs) => {
 *           Alert.alert('Success', `Shuffled ${pairs.length} scoring pairs`);
 *         },
 *         onError: (error) => {
 *           Alert.alert('Error', error.message);
 *         },
 *       }
 *     );
 *   };
 *
 *   return (
 *     <Button onPress={handleShuffle} loading={isPending}>
 *       Shuffle Pairs
 *     </Button>
 *   );
 * }
 * ```
 */
export function useShuffleScoringPairs() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      roundId,
      competitionId,
    }: {
      roundId: string;
      competitionId: string;
    }): Promise<ScoringPair[]> => {
      // 1. Delete existing scoring pairs
      await deleteScoringPairs(roundId);

      // 2. Fetch the competition roster. This is the canonical source of
      // players in the round — `pairings` is a tee-time grouping table
      // (column: `player_ids UUID[]`) and isn't guaranteed to exist for
      // every round, so we don't use it here.
      // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Supabase generated types restriction workaround
      const { data: compPlayers, error: compError } = await (supabase as any)
        .from('competition_players')
        .select('player_id')
        .eq('competition_id', competitionId);

      if (compError) {
        throw new Error(`Failed to fetch competition players: ${compError.message}`);
      }

      const players: { id: string }[] = (compPlayers ?? []).map(
        (p: { player_id: string }) => ({ id: p.player_id })
      );

      if (players.length < 2) {
        throw new Error('Not enough players to create scoring pairs');
      }

      // 3. Shuffle the players array for random assignments
      const shuffledPlayers = [...players].sort(() => Math.random() - 0.5);

      // 4. Auto-generate new pairs with shuffled order
      return autoGenerateAndSaveScoringPairs(roundId, shuffledPlayers);
    },

    onSuccess: (data, variables) => {
      // Invalidate the scoring pairs list for this round
      queryClient.invalidateQueries({
        queryKey: scoringPairsKeys.list(variables.roundId),
      });
      // Also invalidate any playersToScore queries for this round
      queryClient.invalidateQueries({
        queryKey: [...scoringPairsKeys.all, 'playersToScore', variables.roundId],
      });
    },

    onError: (error) => {
      console.error('[useShuffleScoringPairs] Failed to shuffle scoring pairs:', error);
    },
  });
}
