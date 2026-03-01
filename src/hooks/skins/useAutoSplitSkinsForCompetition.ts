/**
 * Skins Hooks - useAutoSplitSkinsForCompetition
 *
 * Hook to manage auto-split skins across all rounds of a competition.
 * Provides create, sync, and cancel operations that draw from / return to
 * the competition's prize pool.
 */

import { useState, useCallback } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/services/supabase/client';
import { skinsKeys, prizePoolKeys } from '@/hooks/queryKeys';
import { createError } from './helpers';
import type {
  AutoSplitSkinsInput,
  AutoSplitSkinsResult,
  SyncSkinsResult,
} from './types';

/**
 * Hook to manage auto-split skins for a competition
 */
export function useAutoSplitSkinsForCompetition() {
  const queryClient = useQueryClient();
  const [isCreating, setIsCreating] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [isCancelling, setIsCancelling] = useState(false);

  const createAutoSplitSkins = useCallback(
    async (input: AutoSplitSkinsInput): Promise<AutoSplitSkinsResult> => {
      const { competitionId, poolId, potPerRound, scoringType, createdBy } = input;

      try {
        setIsCreating(true);

        const { data: rawRounds, error: roundsError } = await supabase
          .from('rounds')
          .select('id, round_number, status')
          .eq('competition_id', competitionId)
          .eq('status', 'upcoming')
          .order('round_number', { ascending: true });

        if (roundsError) {
          throw createError(`Failed to fetch rounds: ${roundsError.message}`, 'DATABASE');
        }

        const rounds = (rawRounds ?? []) as unknown as Array<{ id: string; round_number: number; status: string }>;

        if (rounds.length === 0) {
          return {
            success: true,
            gamesCreated: 0,
            totalDrawn: 0,
            gameIds: [],
          };
        }

        const { data: rawCompetitionPlayers, error: playersError } = await supabase
          .from('competition_players')
          .select('player_id')
          .eq('competition_id', competitionId);

        if (playersError) {
          throw createError(`Failed to fetch players: ${playersError.message}`, 'DATABASE');
        }

        const competitionPlayers = (rawCompetitionPlayers ?? []) as unknown as Array<{ player_id: string }>;
        const participantIds = competitionPlayers.map((cp) => cp.player_id);

        if (participantIds.length === 0) {
          return {
            success: false,
            gamesCreated: 0,
            totalDrawn: 0,
            gameIds: [],
            error: 'No players in competition',
          };
        }

        const { data: rawExistingGames } = await supabase
          .from('skins_games')
          .select('round_id, status')
          .in('round_id', rounds.map((r) => r.id))
          .neq('status', 'cancelled');

        const existingGames = (rawExistingGames ?? []) as unknown as Array<{ round_id: string; status: string }>;
        const roundsWithGames = new Set(existingGames.map((g) => g.round_id));
        const roundsToCreate = rounds.filter((r) => !roundsWithGames.has(r.id));

        if (roundsToCreate.length === 0) {
          return {
            success: true,
            gamesCreated: 0,
            totalDrawn: 0,
            gameIds: [],
          };
        }

        const { data: results, error: batchError } = await supabase.rpc(
          'create_auto_split_skins_batch' as never,
          {
            p_competition_id: competitionId,
            p_pool_id: poolId,
            p_round_ids: roundsToCreate.map((r) => r.id),
            p_pot_per_round: potPerRound,
            p_scoring_type: scoringType,
            p_created_by: createdBy,
          } as never
        );

        if (batchError) {
          const errorMessage = batchError.message || 'Failed to create skins games';
          return {
            success: false,
            gamesCreated: 0,
            totalDrawn: 0,
            gameIds: [],
            error: errorMessage,
          };
        }

        const batchResults = (results as unknown as Array<{ game_id: string; round_id: string; draw_amount: number }>) ?? [];
        const gameIds = batchResults.map((r) => r.game_id);
        const totalDrawn = batchResults.reduce((sum, r) => sum + (r.draw_amount ?? 0), 0);

        queryClient.invalidateQueries({ queryKey: skinsKeys.all });
        queryClient.invalidateQueries({ queryKey: prizePoolKeys.balance(poolId) });
        queryClient.invalidateQueries({ queryKey: prizePoolKeys.transactions(poolId) });

        return {
          success: true,
          gamesCreated: gameIds.length,
          totalDrawn,
          gameIds,
        };
      } catch (error) {
        console.error('[createAutoSplitSkins] Error:', error);
        return {
          success: false,
          gamesCreated: 0,
          totalDrawn: 0,
          gameIds: [],
          error: error instanceof Error ? error.message : 'Unknown error',
        };
      } finally {
        setIsCreating(false);
      }
    },
    [queryClient]
  );

  const syncAutoSplitSkins = useCallback(
    async (input: Omit<AutoSplitSkinsInput, 'skinsBudget'>): Promise<SyncSkinsResult> => {
      const { competitionId, poolId, potPerRound, scoringType, createdBy } = input;

      try {
        setIsSyncing(true);

        const { data: rawRounds, error: roundsError } = await supabase
          .from('rounds')
          .select('id, round_number, status')
          .eq('competition_id', competitionId)
          .order('round_number', { ascending: true });

        if (roundsError) {
          throw createError(`Failed to fetch rounds: ${roundsError.message}`, 'DATABASE');
        }

        const rounds = (rawRounds ?? []) as unknown as Array<{ id: string; round_number: number; status: string }>;

        const scheduledRoundIds = new Set(
          rounds.filter((r) => r.status === 'upcoming').map((r) => r.id)
        );

        const { data: rawExistingGames, error: gamesError } = await supabase
          .from('skins_games')
          .select('id, round_id, pot_value, pool_draw_amount, status')
          .in('round_id', rounds.map((r) => r.id))
          .eq('pool_source', 'prize_pool')
          .neq('status', 'cancelled');

        if (gamesError) {
          throw createError(`Failed to fetch existing games: ${gamesError.message}`, 'DATABASE');
        }

        const existingGames = (rawExistingGames ?? []) as unknown as Array<{
          id: string;
          round_id: string;
          pot_value: number;
          pool_draw_amount: number;
          status: string;
        }>;

        const existingRoundIds = new Set(existingGames.map((g) => g.round_id));

        const roundsToCreate = rounds.filter(
          (r) => r.status === 'upcoming' && !existingRoundIds.has(r.id)
        );

        const gamesToCancel = existingGames.filter(
          (g) => !scheduledRoundIds.has(g.round_id) && g.status === 'active'
        );

        let participantIds: string[] = [];
        if (roundsToCreate.length > 0) {
          const { data: rawCompetitionPlayers } = await supabase
            .from('competition_players')
            .select('player_id')
            .eq('competition_id', competitionId);

          const competitionPlayers = (rawCompetitionPlayers ?? []) as unknown as Array<{ player_id: string }>;
          participantIds = competitionPlayers.map((cp) => cp.player_id);
        }

        let gamesCreated = 0;
        let gamesCancelled = 0;
        let amountDrawn = 0;
        let amountReturned = 0;

        for (const round of roundsToCreate) {
          if (participantIds.length === 0) continue;

          const { data: drawnAmount, error: drawError } = await supabase.rpc(
            'draw_from_pool' as never,
            {
              p_pool_id: poolId,
              p_round_id: round.id,
              p_amount: potPerRound,
            } as never
          );

          if (drawError) {
            console.error(`[syncAutoSplitSkins] Failed to draw for round ${round.id}:`, drawError);
            continue;
          }

          const actualDrawn = drawnAmount as unknown as number;
          amountDrawn += actualDrawn;

          const { error: gameError } = await supabase.from('skins_games').insert({
            round_id: round.id,
            participant_ids: participantIds,
            pot_type: 'fixed' as const,
            pot_value: actualDrawn,
            currency: 'AUD',
            scoring_type: scoringType,
            pool_source: 'prize_pool' as const,
            pool_draw_amount: actualDrawn,
            status: 'active' as const,
            disclaimer_accepted_at: new Date().toISOString(),
            disclaimer_accepted_by: createdBy,
            created_by: createdBy,
          } as never);

          if (!gameError) {
            gamesCreated++;
          }
        }

        for (const game of gamesToCancel) {
          const { error: cancelError } = await supabase
            .from('skins_games')
            .update({ status: 'cancelled' } as never)
            .eq('id', game.id);

          if (cancelError) {
            console.error(`[syncAutoSplitSkins] Failed to cancel game ${game.id}:`, cancelError);
            continue;
          }

          const returnAmount = game.pool_draw_amount ?? game.pot_value;
          if (returnAmount > 0) {
            const { error: returnError } = await supabase.rpc('return_to_pool' as never, {
              p_pool_id: poolId,
              p_round_id: game.round_id,
              p_amount: returnAmount,
              p_description: 'Auto-split skins cancelled - round removed',
            } as never);

            if (!returnError) {
              amountReturned += returnAmount;
            }
          }

          gamesCancelled++;
        }

        queryClient.invalidateQueries({ queryKey: skinsKeys.all });
        queryClient.invalidateQueries({ queryKey: prizePoolKeys.balance(poolId) });
        queryClient.invalidateQueries({ queryKey: prizePoolKeys.transactions(poolId) });

        return {
          success: true,
          gamesCreated,
          gamesCancelled,
          amountDrawn,
          amountReturned,
        };
      } catch (error) {
        console.error('[syncAutoSplitSkins] Error:', error);
        return {
          success: false,
          gamesCreated: 0,
          gamesCancelled: 0,
          amountDrawn: 0,
          amountReturned: 0,
          error: error instanceof Error ? error.message : 'Unknown error',
        };
      } finally {
        setIsSyncing(false);
      }
    },
    [queryClient]
  );

  const cancelAutoSplitSkins = useCallback(
    async (
      competitionId: string,
      poolId: string
    ): Promise<{ success: boolean; gamesCancelled: number; amountReturned: number; error?: string }> => {
      try {
        setIsCancelling(true);

        const { data: rawRounds } = await supabase
          .from('rounds')
          .select('id')
          .eq('competition_id', competitionId);

        const rounds = (rawRounds ?? []) as unknown as Array<{ id: string }>;

        if (rounds.length === 0) {
          return { success: true, gamesCancelled: 0, amountReturned: 0 };
        }

        const { data: rawGames, error: gamesError } = await supabase
          .from('skins_games')
          .select('id, round_id, pot_value, pool_draw_amount')
          .in('round_id', rounds.map((r) => r.id))
          .eq('pool_source', 'prize_pool')
          .eq('status', 'active');

        if (gamesError) {
          throw createError(`Failed to fetch games: ${gamesError.message}`, 'DATABASE');
        }

        const games = (rawGames ?? []) as unknown as Array<{
          id: string;
          round_id: string;
          pot_value: number;
          pool_draw_amount: number;
        }>;

        if (games.length === 0) {
          return { success: true, gamesCancelled: 0, amountReturned: 0 };
        }

        let gamesCancelled = 0;
        let amountReturned = 0;

        for (const game of games) {
          const { error: cancelError } = await supabase
            .from('skins_games')
            .update({ status: 'cancelled' } as never)
            .eq('id', game.id);

          if (cancelError) {
            console.error(`[cancelAutoSplitSkins] Failed to cancel game ${game.id}:`, cancelError);
            continue;
          }

          const returnAmount = game.pool_draw_amount ?? game.pot_value;
          if (returnAmount > 0) {
            const { error: returnError } = await supabase.rpc('return_to_pool' as never, {
              p_pool_id: poolId,
              p_round_id: game.round_id,
              p_amount: returnAmount,
              p_description: 'Auto-split skins disabled - funds returned',
            } as never);

            if (!returnError) {
              amountReturned += returnAmount;
            }
          }

          gamesCancelled++;
        }

        queryClient.invalidateQueries({ queryKey: skinsKeys.all });
        queryClient.invalidateQueries({ queryKey: prizePoolKeys.balance(poolId) });
        queryClient.invalidateQueries({ queryKey: prizePoolKeys.transactions(poolId) });

        return {
          success: true,
          gamesCancelled,
          amountReturned,
        };
      } catch (error) {
        console.error('[cancelAutoSplitSkins] Error:', error);
        return {
          success: false,
          gamesCancelled: 0,
          amountReturned: 0,
          error: error instanceof Error ? error.message : 'Unknown error',
        };
      } finally {
        setIsCancelling(false);
      }
    },
    [queryClient]
  );

  return {
    createAutoSplitSkins,
    syncAutoSplitSkins,
    cancelAutoSplitSkins,
    isCreating,
    isSyncing,
    isCancelling,
  };
}
