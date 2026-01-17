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
import { skinsKeys, prizePoolKeys, roundKeys } from '@/hooks/queryKeys';
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
    mutationFn: async (round: RoundItem) => {
      const roundId = round.id;
      const competitionId = round.competition?.id;

      // Step 1: Clean up skins game if present (pool-sourced)
      if (competitionId) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const { data: skinsGameData } = await (supabase as any)
          .from('skins_games')
          .select('id, pot_value, pool_source')
          .eq('round_id', roundId)
          .eq('pool_source', 'prize_pool')
          .neq('status', 'cancelled')
          .maybeSingle();

        const skinsGame = skinsGameData as { id: string; pot_value: number; pool_source: string } | null;

        if (skinsGame) {
          // Get the prize pool ID
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const { data: poolData } = await (supabase as any)
            .from('competition_prize_pools')
            .select('id')
            .eq('competition_id', competitionId)
            .maybeSingle();

          const pool = poolData as { id: string } | null;

          if (pool) {
            // Return funds to pool
            await supabase.rpc('return_to_pool' as never, {
              p_pool_id: pool.id,
              p_round_id: roundId,
              p_amount: skinsGame.pot_value,
              p_description: 'Round deleted - skins pot returned',
            } as never);

            // Cancel the skins game
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            await (supabase as any)
              .from('skins_games')
              .update({ status: 'cancelled' })
              .eq('id', skinsGame.id);
          }
        }
      }

      // Step 2: Delete related records (round_players, scoring_pairs, scorecards)
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      await (supabase.from('round_players') as any).delete().eq('round_id', roundId);
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      await (supabase.from('scoring_pairs') as any).delete().eq('round_id', roundId);
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      await (supabase.from('scorecards') as any).delete().eq('round_id', roundId);

      // Step 3: Delete the round itself
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { error } = await (supabase.from('rounds') as any)
        .delete()
        .eq('id', roundId)
        .eq('user_id', user?.id); // Only allow deleting own rounds

      if (error) throw error;

      // Step 4: Trigger skins redistribution (non-blocking)
      if (competitionId) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const { data: prizePoolData } = await (supabase as any)
          .from('competition_prize_pools')
          .select('auto_split_skins')
          .eq('competition_id', competitionId)
          .maybeSingle();

        const prizePool = prizePoolData as { auto_split_skins: boolean } | null;

        if (prizePool?.auto_split_skins) {
          // Fire and forget - redistribution is non-blocking
          Promise.resolve(
            supabase.rpc('redistribute_skins_pots' as never, {
              p_competition_id: competitionId,
            } as never)
          ).then(() => {
            console.log('[useRoundActions] Skins redistribution completed');
          }).catch((err: unknown) => {
            console.warn('[useRoundActions] Redistribution error:', err);
          });
        }
      }

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
  };
}
