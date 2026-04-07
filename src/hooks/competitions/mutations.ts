/**
 * Competition Hooks - Mutation Hooks
 *
 * TanStack Query mutation hooks for competition operations.
 *
 * Hooks:
 * - useCreateCompetition: Create a new competition with rounds and players
 * - useRemoveCompetitionPlayer: Remove a player from a competition with scoring pair checks
 */

import { useCallback, useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/services/api/client';
import { competitionKeys } from '@/hooks/queryKeys';
import { useConfirmationDialog, type DialogConfig } from '../useConfirmationDialog';
import {
  checkPlayerScoringPairs,
  removePlayerFromCompetition,
  type PlayerRemovalCheck,
} from '@/services/competitionPlayers';
import type { CompetitionCreateInput, PlayerCreateInput } from '@/types';
import type { RoundCreateInput } from '@/services/api/types';

// =====================================================
// useCreateCompetition
// =====================================================

interface CreateCompetitionInput extends CompetitionCreateInput {
  // Support both single round and multiple rounds for backwards compatibility
  round?: RoundCreateInput;
  rounds?: RoundCreateInput[];
  players: PlayerCreateInput[];
}

/**
 * Hook to create a new competition with rounds and players
 *
 * Usage:
 * ```tsx
 * const createCompetition = useCreateCompetition();
 *
 * createCompetition.mutate({
 *   name: 'Summer Classic',
 *   startDate: new Date(),
 *   handicapSystem: 'honor',
 *   rounds: [
 *     { courseName: 'Royal Melbourne', date: new Date(), matchType: 'stableford' }
 *   ],
 *   players: [{ name: 'John', email: 'john@example.com' }],
 * });
 * ```
 */
export function useCreateCompetition() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: CreateCompetitionInput) => {
      // Normalize rounds - support both single 'round' and multiple 'rounds'
      const rounds = input.rounds || (input.round ? [input.round] : []);
      return apiClient.createCompetition({ ...input, rounds });
    },

    onSuccess: (data) => {
      // Invalidate competitions list to refetch
      queryClient.invalidateQueries({ queryKey: competitionKeys.all });

      // Optionally set the new competition in cache
      queryClient.setQueryData(
        competitionKeys.detail(data.competition.id),
        data.competition
      );

    },
  });
}

// =====================================================
// useRemoveCompetitionPlayer
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
  /** Dialog configuration - parent should render ConfirmationDialog with this */
  dialogConfig: DialogConfig;
  /** Dismiss dialog callback */
  dismissDialog: () => void;
}

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
  const { dialogConfig, showDialog, dismissDialog } = useConfirmationDialog();

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
   * Handle cancel dialog
   */
  const handleCancelDialog = useCallback(() => {
    dismissDialog();
    setState((prev) => ({
      ...prev,
      isChecking: false,
      removalCheck: null,
    }));
  }, [dismissDialog]);

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

        showDialog({
          title: 'Remove Player?',
          message: `${playerName} has scoring pair assignments in ${roundCount} round${roundCount !== 1 ? 's' : ''}:\n\n${roundsList}\n\nRemoving them will delete those assignments. Affected rounds will need to be re-configured.`,
          confirmLabel: 'Remove Anyway',
          cancelLabel: 'Cancel',
          confirmVariant: 'destructive',
          icon: 'alert',
          onConfirm: () => {
            dismissDialog();
            performRemoval(playerId);
          },
        });
      } else {
        // No scoring pairs, simple confirmation
        showDialog({
          title: 'Remove Player?',
          message: `Are you sure you want to remove ${playerName} from this competition?`,
          confirmLabel: 'Remove',
          cancelLabel: 'Cancel',
          confirmVariant: 'destructive',
          icon: 'account-remove',
          onConfirm: () => {
            dismissDialog();
            performRemoval(playerId);
          },
        });
      }
    },
    [performRemoval, showDialog, dismissDialog]
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
    dialogConfig,
    dismissDialog: handleCancelDialog,
  };
}

export default useRemoveCompetitionPlayer;
