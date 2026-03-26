/**
 * useRoundActions - Manages round actions (navigate, delete)
 */

import { useState, useCallback } from 'react';
import { useNavigation } from '@react-navigation/native';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { supabase } from '@/services/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useConfirmationDialog, type DialogConfig } from '@/hooks';
import { skinsKeys, prizePoolKeys, roundKeys } from '@/hooks/queryKeys';
import type { RootStackParamList } from '@/navigation/types';
import type { RoundItem, UseRoundActionsReturn } from '../types';

type NavigationProp = NativeStackNavigationProp<RootStackParamList>;

export function useRoundActions(): UseRoundActionsReturn & {
  dialogConfig: DialogConfig;
  dismissDialog: () => void;
} {
  const navigation = useNavigation<NavigationProp>();
  const { user } = useAuth();
  const queryClient = useQueryClient();

  // Dialog state for error alerts
  const { dialogConfig, showAlert, dismissDialog } = useConfirmationDialog();

  const [deleteDialogVisible, setDeleteDialogVisible] = useState(false);
  const [roundToDelete, setRoundToDelete] = useState<RoundItem | null>(null);

  // Delete round mutation
  const deleteRoundMutation = useMutation({
    mutationFn: async (round: RoundItem) => {
      const roundId = round.id;
      const competitionId = round.competition?.id;

      // Step 1: Delete related records (round_players, scoring_pairs, scorecards)
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      await (supabase.from('round_players') as any).delete().eq('round_id', roundId);
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      await (supabase.from('scoring_pairs') as any).delete().eq('round_id', roundId);
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      await (supabase.from('scorecards') as any).delete().eq('round_id', roundId);

      // Step 2: Delete the round itself
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { error } = await (supabase.from('rounds') as any)
        .delete()
        .eq('id', roundId)
        .eq('user_id', user?.id); // Only allow deleting own rounds

      if (error) throw error;

      return { roundId, competitionId };
    },
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: ['rounds', user?.id] });

      // Invalidate skins and prize pool queries
      if (result?.competitionId) {
        queryClient.invalidateQueries({ queryKey: skinsKeys.all });
        queryClient.invalidateQueries({ queryKey: prizePoolKeys.pool(result.competitionId) });
        queryClient.invalidateQueries({ queryKey: roundKeys.list(result.competitionId) });
      }
    },
    onError: (error) => {
      console.error('Error deleting round:', error);
      showAlert('Error', 'Failed to delete round. Please try again.');
    },
  });

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
      deleteRoundMutation.mutate(roundToDelete);
      setDeleteDialogVisible(false);
      setRoundToDelete(null);
    }
  }, [roundToDelete, deleteRoundMutation]);

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
