/**
 * useRemoveCompetitionPlayer Hook
 *
 * Handles removing a player from a competition with proper warnings
 * about scoring pair assignments that will be deleted.
 *
 * Features:
 * - Check for scoring pair assignments before removal
 * - Show warning dialog with affected rounds
 * - Handle cascade deletion of scoring pairs
 * - Notify organizer about rounds needing re-configuration
 */

import { useCallback, useState } from 'react';
import { Alert } from 'react-native';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  checkPlayerScoringPairs,
  removePlayerFromCompetition,
  type PlayerRemovalCheck,
} from '@/services/competitionPlayers';
import { competitionKeys, scoringPairsKeys } from './queryKeys';

// =====================================================
// TYPES
// =====================================================

export interface RemovePlayerState {
  /** Is the removal check in progress? */
  isChecking: boolean;
  /** Is the removal mutation in progress? */
  isRemoving: boolean;
  /** Error from check or removal */
  error: Error | null;
  /** Result of the pre-removal check */
  removalCheck: PlayerRemovalCheck | null;
}

export interface UseRemoveCompetitionPlayerOptions {
  /** Competition ID */
  competitionId: string;
  /** Callback when player is successfully removed */
  onSuccess?: (playerId: string, affectedRoundIds: string[]) => void;
  /** Callback when removal fails */
  onError?: (error: Error) => void;
}

export interface UseRemoveCompetitionPlayerResult {
  /** Current state of the removal process */
  state: RemovePlayerState;
  /**
   * Initiate player removal - will check for scoring pairs first
   * and show a warning dialog if needed
   */
  removePlayer: (playerId: string, playerName: string) => Promise<void>;
  /** Reset the state */
  reset: () => void;
}

// =====================================================
// HOOK IMPLEMENTATION
// =====================================================

/**
 * Hook for removing a player from a competition
 *
 * @example
 * ```tsx
 * const { removePlayer, state } = useRemoveCompetitionPlayer({
 *   competitionId: 'comp-123',
 *   onSuccess: (playerId, affectedRoundIds) => {
 *     if (affectedRoundIds.length > 0) {
 *       Alert.alert('Info', 'Some rounds need scoring pair re-configuration');
 *     }
 *   },
 * });
 *
 * // In your UI
 * <Button
 *   onPress={() => removePlayer('player-456', 'John Doe')}
 *   loading={state.isChecking || state.isRemoving}
 * >
 *   Remove Player
 * </Button>
 * ```
 */
export function useRemoveCompetitionPlayer({
  competitionId,
  onSuccess,
  onError,
}: UseRemoveCompetitionPlayerOptions): UseRemoveCompetitionPlayerResult {
  const queryClient = useQueryClient();

  const [state, setState] = useState<RemovePlayerState>({
    isChecking: false,
    isRemoving: false,
    error: null,
    removalCheck: null,
  });

  // Mutation for the actual removal
  const removeMutation = useMutation({
    mutationFn: async (playerId: string) => {
      await removePlayerFromCompetition(competitionId, playerId);
      return playerId;
    },
    onSuccess: (playerId) => {
      // Invalidate related queries
      queryClient.invalidateQueries({
        queryKey: competitionKeys.detail(competitionId),
      });
      queryClient.invalidateQueries({
        queryKey: ['competition', competitionId, 'details'],
      });
      queryClient.invalidateQueries({
        queryKey: competitionKeys.list(),
      });

      // Invalidate scoring pairs for all rounds in the competition
      // This ensures the scoring pairs status is refreshed
      queryClient.invalidateQueries({
        predicate: (query) =>
          query.queryKey[0] === 'scoring-pairs' ||
          (Array.isArray(query.queryKey) && query.queryKey.includes('scoring-pairs')),
      });

      const affectedRoundIds =
        state.removalCheck?.scoringPairInfo?.affectedRounds.map((r) => r.roundId) || [];

      setState((prev) => ({
        ...prev,
        isRemoving: false,
        error: null,
      }));

      onSuccess?.(playerId, affectedRoundIds);
    },
    onError: (error: Error) => {
      setState((prev) => ({
        ...prev,
        isRemoving: false,
        error,
      }));
      onError?.(error);
    },
  });

  /**
   * Perform the removal after confirmation
   */
  const performRemoval = useCallback(
    async (playerId: string) => {
      setState((prev) => ({ ...prev, isRemoving: true }));
      await removeMutation.mutateAsync(playerId);
    },
    [removeMutation]
  );

  /**
   * Show confirmation dialog and handle removal
   */
  const showRemovalConfirmation = useCallback(
    (
      playerId: string,
      playerName: string,
      check: PlayerRemovalCheck
    ) => {
      if (check.hasScoringPairs && check.scoringPairInfo) {
        // Show warning about scoring pairs
        const { roundCount, affectedRounds } = check.scoringPairInfo;
        const roundsList = affectedRounds
          .map((r) => `• Round ${r.roundNumber}${r.courseName ? ` (${r.courseName})` : ''}`)
          .join('\n');

        Alert.alert(
          'Remove Player?',
          `${playerName} has scoring pair assignments in ${roundCount} round${roundCount !== 1 ? 's' : ''}:\n\n${roundsList}\n\nRemoving them will delete those assignments. Affected rounds will need to be re-configured.`,
          [
            {
              text: 'Cancel',
              style: 'cancel',
              onPress: () => {
                setState((prev) => ({
                  ...prev,
                  isChecking: false,
                  removalCheck: null,
                }));
              },
            },
            {
              text: 'Remove Anyway',
              style: 'destructive',
              onPress: () => performRemoval(playerId),
            },
          ]
        );
      } else {
        // No scoring pairs, simple confirmation
        Alert.alert(
          'Remove Player?',
          `Are you sure you want to remove ${playerName} from this competition?`,
          [
            {
              text: 'Cancel',
              style: 'cancel',
              onPress: () => {
                setState((prev) => ({
                  ...prev,
                  isChecking: false,
                  removalCheck: null,
                }));
              },
            },
            {
              text: 'Remove',
              style: 'destructive',
              onPress: () => performRemoval(playerId),
            },
          ]
        );
      }
    },
    [performRemoval]
  );

  /**
   * Initiate player removal - checks for scoring pairs first
   */
  const removePlayer = useCallback(
    async (playerId: string, playerName: string) => {
      setState({
        isChecking: true,
        isRemoving: false,
        error: null,
        removalCheck: null,
      });

      try {
        // Check for scoring pairs
        const check = await checkPlayerScoringPairs(competitionId, playerId);

        setState((prev) => ({
          ...prev,
          isChecking: false,
          removalCheck: check,
        }));

        // Show confirmation dialog
        showRemovalConfirmation(playerId, playerName, check);
      } catch (error) {
        const err = error instanceof Error ? error : new Error('Failed to check player');
        setState({
          isChecking: false,
          isRemoving: false,
          error: err,
          removalCheck: null,
        });
        onError?.(err);
      }
    },
    [competitionId, showRemovalConfirmation, onError]
  );

  /**
   * Reset the state
   */
  const reset = useCallback(() => {
    setState({
      isChecking: false,
      isRemoving: false,
      error: null,
      removalCheck: null,
    });
  }, []);

  return {
    state,
    removePlayer,
    reset,
  };
}

export default useRemoveCompetitionPlayer;
