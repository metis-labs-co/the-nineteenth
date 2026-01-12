/**
 * TanStack Query hooks for Scoring Pairs
 *
 * Provides hooks for fetching and mutating scoring pair data in rounds.
 * Scoring pairs define who scores whom during a round.
 *
 * Hooks:
 * - useScoringPairs(roundId) - Fetch all scoring pairs for a round
 * - usePlayersToScore(roundId, scorerId) - Get players assigned to a scorer
 * - useCreateScoringPairs() - Create scoring pairs
 * - useAutoGenerateScoringPairs() - Auto-generate pairs
 * - useGenerateTeamMatchPlayPairs() - Generate cross-team pairs
 * - useDeleteScoringPairs() - Delete all pairs for a round
 * - useShuffleScoringPairs() - Delete and regenerate pairs with new random assignments
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { scoringPairsKeys } from '@/hooks/queryKeys';
import {
  getRoundScoringPairs,
  getPlayersToScore,
  createScoringPairs,
  autoGenerateAndSaveScoringPairs,
  generateTeamMatchPlayPairs,
  deleteScoringPairs,
} from '@/services/scoringPairs';
import { supabase } from '@/services/supabase/client';
import type { ScoringPairWithPlayers, ScoringPair } from '@/types/database.types';
import type { Player, ScoringPairCreateInput } from '@/types';

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
    staleTime: 5 * 60 * 1000, // Consider data fresh for 5 minutes
    gcTime: 10 * 60 * 1000, // Keep in cache for 10 minutes

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
    staleTime: 5 * 60 * 1000, // Consider data fresh for 5 minutes
    gcTime: 10 * 60 * 1000, // Keep in cache for 10 minutes

    // Retry configuration
    retry: 2,
    retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 10000),

    // Refetch behavior
    refetchOnWindowFocus: false,
    refetchOnReconnect: true,
    refetchOnMount: true,
  });
}

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
 * - Even players: Reciprocal pairs (A↔B)
 * - Odd players: Circular chain (A→B→C→A)
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
 * Team1[0] ↔ Team2[0], Team1[1] ↔ Team2[1], etc.
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

      // 2. Fetch players from round pairings
      // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Supabase generated types restriction workaround
      const { data: pairings, error: pairingsError } = await (supabase as any)
        .from('pairings')
        .select('player_id')
        .eq('round_id', roundId)
        .not('player_id', 'is', null);

      if (pairingsError) {
        throw new Error(`Failed to fetch pairings: ${pairingsError.message}`);
      }

      // If no pairings found, try to get players from competition_players
      let players: { id: string }[] = [];

      if (pairings && pairings.length > 0) {
        players = (pairings as Array<{ player_id: string | null }>)
          .filter((p) => p.player_id)
          .map((p) => ({ id: p.player_id as string }));
      } else {
        // Fallback: get players from competition
        // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Supabase generated types restriction workaround
        const { data: compPlayers, error: compError } = await (supabase as any)
          .from('competition_players')
          .select('player_id')
          .eq('competition_id', competitionId);

        if (compError) {
          throw new Error(`Failed to fetch competition players: ${compError.message}`);
        }

        if (compPlayers) {
          players = (compPlayers as Array<{ player_id: string }>).map((p) => ({ id: p.player_id }));
        }
      }

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
