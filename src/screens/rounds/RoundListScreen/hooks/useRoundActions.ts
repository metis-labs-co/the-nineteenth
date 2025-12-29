/**
 * useRoundActions - Manages round actions (navigate, delete)
 */

import { useState, useCallback } from 'react';
import { Alert } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { supabase } from '@/services/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import type { RootStackParamList } from '@/navigation/types';
import type { RoundItem, UseRoundActionsReturn } from '../types';

type NavigationProp = NativeStackNavigationProp<RootStackParamList>;

export function useRoundActions(): UseRoundActionsReturn {
  const navigation = useNavigation<NavigationProp>();
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const [deleteDialogVisible, setDeleteDialogVisible] = useState(false);
  const [roundToDelete, setRoundToDelete] = useState<RoundItem | null>(null);

  // Delete round mutation
  const deleteRoundMutation = useMutation({
    mutationFn: async (roundId: string) => {
      // First delete related records (round_players, scoring_pairs, scorecards)
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      await (supabase.from('round_players') as any).delete().eq('round_id', roundId);
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      await (supabase.from('scoring_pairs') as any).delete().eq('round_id', roundId);
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      await (supabase.from('scorecards') as any).delete().eq('round_id', roundId);

      // Then delete the round itself
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { error } = await (supabase.from('rounds') as any)
        .delete()
        .eq('id', roundId)
        .eq('user_id', user?.id); // Only allow deleting own rounds

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['rounds', user?.id] });
    },
    onError: (error) => {
      console.error('Error deleting round:', error);
      Alert.alert('Error', 'Failed to delete round. Please try again.');
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
        // Active rounds (scheduled, in-progress) → Scorecard screen for score entry
        navigation.navigate('Scorecard', {
          roundId: round.id,
          competitionId: round.competition?.id || 'standalone',
        });
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
      deleteRoundMutation.mutate(roundToDelete.id);
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
  };
}
