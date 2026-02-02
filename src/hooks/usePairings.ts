/**
 * TanStack Query hooks for Pairings
 *
 * Provides hooks for fetching and mutating player groupings (pairings) with tee times.
 *
 * Hooks:
 * - usePairings(roundId) - Fetch all pairings for a round
 * - useCreatePairings() - Create pairings for a round
 * - useUpdatePairing() - Update a single pairing
 * - useDeletePairing() - Delete a single pairing
 * - useDeleteAllPairings() - Delete all pairings for a round
 * - useAutoGeneratePairings() - Auto-generate balanced pairings using snake draft
 * - useReplacePairings() - Replace all pairings with new groups
 * - useUpdatePairingTeeTimes() - Update tee times for all pairings
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { pairingKeys, leaderboardKeys, scorecardKeys } from '@/hooks/queryKeys';
import {
  getPairingsForRound,
  createPairings,
  updatePairing,
  deletePairing,
  deleteAllPairingsForRound,
  autoGeneratePairings,
  replacePairings,
  updatePairingTeeTimes,
  roundHasPairings,
} from '@/services/pairings';
import type {
  PairingWithPlayers,
  PairingGroup,
  CreatePairingsInput,
  GeneratePairingsResult,
} from '@/types';

// =====================================================
// QUERY HOOKS
// =====================================================

/**
 * Query hook to fetch all pairings for a round
 *
 * Returns pairings with full player data, sorted by tee time.
 *
 * @param roundId - Round UUID
 * @returns Query result with pairings array
 *
 * @example
 * ```tsx
 * function PairingsView({ roundId }: { roundId: string }) {
 *   const { data: pairings, isLoading, error, refetch } = usePairings(roundId);
 *
 *   if (isLoading) return <LoadingSpinner />;
 *   if (error) return <ErrorState message={error.message} onRetry={refetch} />;
 *   if (!pairings?.length) return <EmptyState message="No groups assigned yet" />;
 *
 *   return (
 *     <FlatList
 *       data={pairings}
 *       renderItem={({ item, index }) => (
 *         <GroupCard
 *           groupNumber={index + 1}
 *           teeTime={item.teeTime}
 *           players={item.players}
 *         />
 *       )}
 *     />
 *   );
 * }
 * ```
 */
export function usePairings(roundId: string | undefined) {
  return useQuery({
    queryKey: pairingKeys.list(roundId || ''),
    queryFn: async (): Promise<PairingWithPlayers[]> => {
      if (!roundId) return [];
      return getPairingsForRound(roundId);
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
 * Query hook to check if a round has any pairings
 *
 * @param roundId - Round UUID
 * @returns Query result with boolean
 */
export function useHasPairings(roundId: string | undefined) {
  return useQuery({
    queryKey: [...pairingKeys.list(roundId || ''), 'exists'],
    queryFn: async (): Promise<boolean> => {
      if (!roundId) return false;
      return roundHasPairings(roundId);
    },
    enabled: !!roundId,
    staleTime: 2 * 60 * 1000,
  });
}

// =====================================================
// MUTATION HOOKS
// =====================================================

/**
 * Mutation hook to create pairings for a round
 *
 * Invalidates the pairings list for the round on success.
 *
 * @returns Mutation result with createPairings function
 *
 * @example
 * ```tsx
 * function CreatePairingsButton({ roundId, groups }: Props) {
 *   const { mutate: create, isPending } = useCreatePairings();
 *
 *   const handleCreate = () => {
 *     create(
 *       { roundId, groups },
 *       {
 *         onSuccess: (pairings) => {
 *           Alert.alert('Success', `Created ${pairings.length} groups`);
 *         },
 *         onError: (error) => {
 *           Alert.alert('Error', error.message);
 *         },
 *       }
 *     );
 *   };
 *
 *   return <Button onPress={handleCreate} loading={isPending}>Create Groups</Button>;
 * }
 * ```
 */
export function useCreatePairings() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (
      input: CreatePairingsInput
    ): Promise<PairingWithPlayers[]> => {
      return createPairings(input);
    },

    onSuccess: (_, variables) => {
      // Invalidate the pairings list for this round
      queryClient.invalidateQueries({
        queryKey: pairingKeys.list(variables.roundId),
      });
    },

    onError: (error) => {
      console.error('[useCreatePairings] Failed to create pairings:', error);
    },
  });
}

/**
 * Mutation hook to update a single pairing
 *
 * Invalidates the pairings list for the round on success.
 *
 * @returns Mutation result with updatePairing function
 */
export function useUpdatePairing() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      pairingId,
      data,
    }: {
      pairingId: string;
      roundId: string;
      data: { playerIds?: string[]; teeTime?: string | null };
    }): Promise<PairingWithPlayers> => {
      return updatePairing(pairingId, data);
    },

    onSuccess: (_, variables) => {
      // Invalidate the pairings list for this round
      queryClient.invalidateQueries({
        queryKey: pairingKeys.list(variables.roundId),
      });
    },

    onError: (error) => {
      console.error('[useUpdatePairing] Failed to update pairing:', error);
    },
  });
}

/**
 * Mutation hook to delete a single pairing
 *
 * Invalidates the pairings list for the round on success.
 *
 * @returns Mutation result with deletePairing function
 */
export function useDeletePairing() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      pairingId,
    }: {
      pairingId: string;
      roundId: string;
    }): Promise<void> => {
      return deletePairing(pairingId);
    },

    onSuccess: (_, variables) => {
      // Invalidate the pairings list for this round
      queryClient.invalidateQueries({
        queryKey: pairingKeys.list(variables.roundId),
      });
    },

    onError: (error) => {
      console.error('[useDeletePairing] Failed to delete pairing:', error);
    },
  });
}

/**
 * Mutation hook to delete all pairings for a round
 *
 * Useful when regenerating pairings or resetting round setup.
 * Invalidates the pairings list on success.
 *
 * @returns Mutation result with deleteAllPairings function
 *
 * @example
 * ```tsx
 * function ResetPairingsButton({ roundId }: { roundId: string }) {
 *   const { mutate: deleteAll, isPending } = useDeleteAllPairings();
 *
 *   const handleReset = () => {
 *     Alert.alert(
 *       'Reset Groups',
 *       'Are you sure you want to remove all player groups?',
 *       [
 *         { text: 'Cancel', style: 'cancel' },
 *         {
 *           text: 'Reset',
 *           style: 'destructive',
 *           onPress: () => deleteAll({ roundId }),
 *         },
 *       ]
 *     );
 *   };
 *
 *   return <Button onPress={handleReset} loading={isPending}>Reset Groups</Button>;
 * }
 * ```
 */
export function useDeleteAllPairings() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ roundId }: { roundId: string }): Promise<void> => {
      return deleteAllPairingsForRound(roundId);
    },

    onSuccess: (_, variables) => {
      // Invalidate the pairings list for this round
      queryClient.invalidateQueries({
        queryKey: pairingKeys.list(variables.roundId),
      });
    },

    onError: (error) => {
      console.error('[useDeleteAllPairings] Failed to delete pairings:', error);
    },
  });
}

/**
 * Mutation hook to auto-generate balanced pairings using snake draft
 *
 * Uses snake draft algorithm to create groups balanced by handicap.
 * Deletes existing pairings before creating new ones.
 * Invalidates the pairings list on success.
 *
 * @returns Mutation result with autoGeneratePairings function
 *
 * @example
 * ```tsx
 * function AutoGenerateButton({ roundId, playerIds }: Props) {
 *   const { mutate: generate, isPending } = useAutoGeneratePairings();
 *
 *   const handleGenerate = () => {
 *     generate(
 *       {
 *         roundId,
 *         playerIds,
 *         options: { startTime: '07:00', intervalMinutes: 8, groupSize: 4 },
 *       },
 *       {
 *         onSuccess: ({ pairings, result }) => {
 *           if (result.warnings.length > 0) {
 *             Alert.alert('Generated', result.warnings.join('\n'));
 *           } else {
 *             Alert.alert('Success', `Created ${pairings.length} groups`);
 *           }
 *         },
 *       }
 *     );
 *   };
 *
 *   return <Button onPress={handleGenerate} loading={isPending}>Auto-Generate</Button>;
 * }
 * ```
 */
export function useAutoGeneratePairings() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      roundId,
      playerIds,
      options,
    }: {
      roundId: string;
      playerIds: string[];
      options: {
        startTime: string;
        intervalMinutes: number;
        groupSize?: 2 | 3 | 4;
      };
    }): Promise<{ pairings: PairingWithPlayers[]; result: GeneratePairingsResult }> => {
      return autoGeneratePairings(roundId, playerIds, options);
    },

    onSuccess: (_, variables) => {
      // Invalidate the pairings list for this round
      queryClient.invalidateQueries({
        queryKey: pairingKeys.list(variables.roundId),
      });
      // Also invalidate leaderboard and scorecards as they may show group info
      queryClient.invalidateQueries({
        queryKey: leaderboardKeys.round(variables.roundId),
      });
      queryClient.invalidateQueries({
        queryKey: scorecardKeys.list({ roundId: variables.roundId }),
      });
    },

    onError: (error) => {
      console.error('[useAutoGeneratePairings] Failed to generate pairings:', error);
    },
  });
}

/**
 * Mutation hook to replace all pairings for a round with new groups
 *
 * Atomic operation that deletes existing pairings and creates new ones.
 * Invalidates the pairings list on success.
 *
 * @returns Mutation result with replacePairings function
 *
 * @example
 * ```tsx
 * function SavePairingsButton({ roundId, groups }: Props) {
 *   const { mutate: replace, isPending } = useReplacePairings();
 *
 *   const handleSave = () => {
 *     replace(
 *       { roundId, groups },
 *       {
 *         onSuccess: (pairings) => {
 *           Alert.alert('Saved', `${pairings.length} groups saved`);
 *         },
 *       }
 *     );
 *   };
 *
 *   return <Button onPress={handleSave} loading={isPending}>Save Groups</Button>;
 * }
 * ```
 */
export function useReplacePairings() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      roundId,
      groups,
    }: {
      roundId: string;
      groups: PairingGroup[];
    }): Promise<PairingWithPlayers[]> => {
      return replacePairings(roundId, groups);
    },

    onSuccess: (_, variables) => {
      // Invalidate the pairings list for this round
      queryClient.invalidateQueries({
        queryKey: pairingKeys.list(variables.roundId),
      });
      // Also invalidate leaderboard and scorecards
      queryClient.invalidateQueries({
        queryKey: leaderboardKeys.round(variables.roundId),
      });
      queryClient.invalidateQueries({
        queryKey: scorecardKeys.list({ roundId: variables.roundId }),
      });
    },

    onError: (error) => {
      console.error('[useReplacePairings] Failed to replace pairings:', error);
    },
  });
}

/**
 * Mutation hook to update tee times for all pairings in a round
 *
 * Recalculates tee times based on new start time and interval.
 * Invalidates the pairings list on success.
 *
 * @returns Mutation result with updatePairingTeeTimes function
 *
 * @example
 * ```tsx
 * function UpdateTeeTimesForm({ roundId }: { roundId: string }) {
 *   const { mutate: updateTeeTimes, isPending } = useUpdatePairingTeeTimes();
 *   const [startTime, setStartTime] = useState('07:00');
 *   const [interval, setInterval] = useState(8);
 *
 *   const handleUpdate = () => {
 *     updateTeeTimes(
 *       { roundId, startTime, intervalMinutes: interval },
 *       {
 *         onSuccess: (pairings) => {
 *           Alert.alert('Updated', `Tee times updated for ${pairings.length} groups`);
 *         },
 *       }
 *     );
 *   };
 *
 *   return <Button onPress={handleUpdate} loading={isPending}>Update Tee Times</Button>;
 * }
 * ```
 */
export function useUpdatePairingTeeTimes() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      roundId,
      startTime,
      intervalMinutes,
    }: {
      roundId: string;
      startTime: string;
      intervalMinutes: number;
    }): Promise<PairingWithPlayers[]> => {
      return updatePairingTeeTimes(roundId, startTime, intervalMinutes);
    },

    onSuccess: (_, variables) => {
      // Invalidate the pairings list for this round
      queryClient.invalidateQueries({
        queryKey: pairingKeys.list(variables.roundId),
      });
    },

    onError: (error) => {
      console.error('[useUpdatePairingTeeTimes] Failed to update tee times:', error);
    },
  });
}
