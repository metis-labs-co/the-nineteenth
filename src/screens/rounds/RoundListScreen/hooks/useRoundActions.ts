/**
 * useRoundActions - Manages round actions (navigate, delete)
 */

import { useState, useCallback } from 'react';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useDeleteRound } from '@/hooks/rounds/mutations';
import { useCancelScheduledRound } from '@/hooks/rounds/scheduledRounds';
import { useConfirmationDialog, type DialogConfig } from '@/hooks';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/context/ToastContext';
import type { RootStackParamList } from '@/navigation/types';
import type { RoundItem, UseRoundActionsReturn } from '../types';
import { shouldCancelScheduledRound } from './shouldCancelScheduledRound';

type NavigationProp = NativeStackNavigationProp<RootStackParamList>;

export function useRoundActions(onDeleteSuccess?: () => void): UseRoundActionsReturn & {
  dialogConfig: DialogConfig;
  dismissDialog: () => void;
  pendingDeleteIsCancel: boolean;
} {
  const navigation = useNavigation<NavigationProp>();
  const { user } = useAuth();
  const { showToast } = useToast();

  // Dialog state for error alerts
  const { dialogConfig, showAlert, dismissDialog } = useConfirmationDialog();

  const [deleteDialogVisible, setDeleteDialogVisible] = useState(false);
  const [roundToDelete, setRoundToDelete] = useState<RoundItem | null>(null);

  // Delete round via shared soft-delete hook (RPC handles auth + cache invalidation + undo toast)
  const deleteRoundMutation = useDeleteRound();
  // Cancel path for scheduled rounds with invitees: hard delete -> the
  // notify_scheduled_round_cancelled trigger pushes a "Round cancelled" notice
  // to every invitee and the cascade removes the round for everyone. No undo.
  const cancelScheduledRoundMutation = useCancelScheduledRound();

  // Whether the pending delete will be handled as a cancel (notifies invitees).
  const pendingDeleteIsCancel = shouldCancelScheduledRound(roundToDelete, user?.id);

  const handleScoreRound = useCallback(
    (round: RoundItem) => {
      if (round.status === 'completed') {
        // Completed rounds → ViewRound screen to view details
        navigation.navigate('ViewRound', {
          roundId: round.id,
          competitionId: round.competition?.id,
        });
      } else {
        // Active rounds (scheduled, in-progress) → appropriate scoring screen
        if (round.gameType === 'match-play') {
          if (round.isTeamRound) {
            // Team match play goes to TeamMatchPlayScoring
            navigation.navigate('TeamMatchPlayScoring', {
              roundId: round.id,
              // TODO: Pass actual team IDs from round pairings
              team1Id: undefined,
              team2Id: undefined,
            });
          } else {
            // Individual match play goes to MatchPlayScoring
            navigation.navigate('MatchPlayScoring', {
              roundId: round.id,
              // TODO: Pass actual player IDs from round pairings
              player1Id: undefined,
              player2Id: undefined,
            });
          }
        } else {
          navigation.navigate('Scorecard', {
            roundId: round.id,
            competitionId: round.competition?.id || 'standalone',
          });
        }
      }
    },
    [navigation]
  );

  const handleDeleteRound = useCallback(
    (round: RoundItem) => {
      setRoundToDelete(round);
      setDeleteDialogVisible(true);
    },
    []
  );

  const handleConfirmDelete = useCallback(() => {
    if (!roundToDelete) return;

    if (shouldCancelScheduledRound(roundToDelete, user?.id)) {
      // Scheduled round with invitees -> cancel it. Hard delete fires the
      // BEFORE DELETE trigger that notifies invitees and removes it for all.
      cancelScheduledRoundMutation.mutate(roundToDelete.id, {
        onSuccess: () => {
          showToast({
            variant: 'success',
            title: 'Round cancelled',
            message: 'Invited players have been notified.',
          });
          onDeleteSuccess?.();
        },
        onError: () => showAlert('Error', 'Failed to cancel round. Please try again.'),
      });
    } else {
      deleteRoundMutation.mutate(
        { roundId: roundToDelete.id, competitionId: roundToDelete.competition?.id },
        {
          onSuccess: () => onDeleteSuccess?.(),
          onError: () => showAlert('Error', 'Failed to delete round. Please try again.'),
        }
      );
    }

    setDeleteDialogVisible(false);
    setRoundToDelete(null);
  }, [
    roundToDelete,
    user?.id,
    deleteRoundMutation,
    cancelScheduledRoundMutation,
    showToast,
    showAlert,
    onDeleteSuccess,
  ]);

  const handleCancelDelete = useCallback(() => {
    setDeleteDialogVisible(false);
    setRoundToDelete(null);
  }, []);

  return {
    handleScoreRound,
    handleDeleteRound,
    handleConfirmDelete,
    handleCancelDelete,
    deleteDialogVisible,
    roundToDelete,
    isDeleting: deleteRoundMutation.isPending || cancelScheduledRoundMutation.isPending,
    pendingDeleteIsCancel,
    dialogConfig,
    dismissDialog,
  };
}
