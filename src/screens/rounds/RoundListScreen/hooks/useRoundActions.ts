/**
 * useRoundActions - Manages round actions (navigate, delete)
 */

import { useState, useCallback } from 'react';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useDeleteRound } from '@/hooks/rounds/mutations';
import { useConfirmationDialog, type DialogConfig } from '@/hooks';
import type { RootStackParamList } from '@/navigation/types';
import type { RoundItem, UseRoundActionsReturn } from '../types';

type NavigationProp = NativeStackNavigationProp<RootStackParamList>;

export function useRoundActions(): UseRoundActionsReturn & {
  dialogConfig: DialogConfig;
  dismissDialog: () => void;
} {
  const navigation = useNavigation<NavigationProp>();

  // Dialog state for error alerts
  const { dialogConfig, showAlert, dismissDialog } = useConfirmationDialog();

  const [deleteDialogVisible, setDeleteDialogVisible] = useState(false);
  const [roundToDelete, setRoundToDelete] = useState<RoundItem | null>(null);

  // Delete round via shared soft-delete hook (RPC handles auth + cache invalidation + undo toast)
  const deleteRoundMutation = useDeleteRound();

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
    if (roundToDelete) {
      deleteRoundMutation.mutate(
        { roundId: roundToDelete.id, competitionId: roundToDelete.competition?.id },
        {
          onError: () => showAlert('Error', 'Failed to delete round. Please try again.'),
        }
      );
      setDeleteDialogVisible(false);
      setRoundToDelete(null);
    }
  }, [roundToDelete, deleteRoundMutation, showAlert]);

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
    isDeleting: deleteRoundMutation.isPending,
    dialogConfig,
    dismissDialog,
  };
}
