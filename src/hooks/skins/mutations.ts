/**
 * Skins Hooks - Mutation Hooks
 *
 * TanStack Query mutation hooks for modifying skins game data.
 *
 * Hooks:
 * - useCreateSkinsGame: Create a new skins game
 * - useProcessSkinsHole: Process an individual hole result
 * - useProcessTeamSkinsHole: Process a team hole result
 * - useFinalizeSkinsGame: Finalize a completed game
 * - useCancelSkinsGame: Cancel a game
 */

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/services/supabase/client';
import { skinsKeys } from '@/hooks/queryKeys';
import {
  calculateHoleValue,
  calculateCurrentCarryover,
  calculateFinalPayoutsWithCarryover,
  processHoleResult,
  processTeamHoleResult,
} from '@/utils/skinsCalculations';
import { createError } from './helpers';
import type { ProcessSkinsHoleInput, ProcessTeamSkinsHoleInput } from './types';
import type {
  SkinsGame,
  SkinsResult,
  CreateSkinsGameInput,
} from '@/types/database/skins.types';

// =====================================================
// LOCAL DB ROW TYPES
// =====================================================

/** Row shape returned from skins_games table queries */
type SkinsGameRow = SkinsGame;

/** Row shape returned from skins_results table queries */
interface SkinsResultRow {
  id: string;
  skins_game_id: string;
  hole_number: number;
  winner_id: string | null;
  team_winner_id: string | null;
  is_carryover: boolean;
  hole_scores: unknown;
  hole_pot_value: number;
  carryover_to_next: number;
  payout_amount: number;
  calculated_at: string;
}

/** Row shape for player queries */
interface PlayerRow {
  id: string;
  name: string;
  handicap: number | null;
}

// =====================================================
// TYPES
// =====================================================

/**
 * Input for creating a skins game with disclaimer acceptance
 */
export interface CreateSkinsGameWithDisclaimerInput extends CreateSkinsGameInput {
  /** User ID who accepted disclaimer and is creating the game */
  disclaimerAcceptedBy: string;
}

// =====================================================
// MUTATION HOOKS
// =====================================================

/**
 * Mutation hook to create a new skins game
 */
export function useCreateSkinsGame() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: CreateSkinsGameWithDisclaimerInput): Promise<SkinsGame> => {
      const { disclaimerAcceptedBy, ...gameInput } = input;

      const insertData = {
        round_id: gameInput.round_id,
        pairing_id: gameInput.pairing_id ?? null,
        participant_ids: gameInput.participant_ids,
        pot_type: gameInput.pot_type,
        pot_value: gameInput.pot_value,
        currency: gameInput.currency ?? 'AUD',
        scoring_type: gameInput.scoring_type,
        status: 'active' as const,
        disclaimer_accepted_at: new Date().toISOString(),
        disclaimer_accepted_by: disclaimerAcceptedBy,
        created_by: disclaimerAcceptedBy,
        is_team_skins: gameInput.is_team_skins ?? false,
        participant_team_ids: gameInput.participant_team_ids ?? null,
      };

      const { data, error } = await supabase
        .from('skins_games')
        .insert(insertData as never)
        .select()
        .single();

      if (error) {
        throw createError(`Failed to create skins game: ${error.message}`, 'DATABASE');
      }

      return data as unknown as SkinsGame;
    },

    onSuccess: (data) => {
      queryClient.invalidateQueries({
        queryKey: skinsKeys.gamesByRound(data.round_id),
      });
    },

    onError: (error) => {
      console.error('[useCreateSkinsGame] Failed to create game:', error);
    },
  });
}

/**
 * Mutation hook to process a skins hole result
 */
export function useProcessSkinsHole() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: ProcessSkinsHoleInput): Promise<SkinsResult> => {
      const { skinsGameId, holeNumber, holeScores } = input;

      const { data: rawGame, error: gameError } = await supabase
        .from('skins_games')
        .select('*')
        .eq('id', skinsGameId)
        .single();

      const game = rawGame as unknown as SkinsGameRow | null;

      if (gameError || !game) {
        throw createError('Skins game not found', 'NOT_FOUND');
      }

      const { data: rawExistingResults } = await supabase
        .from('skins_results')
        .select('*')
        .eq('skins_game_id', skinsGameId)
        .order('hole_number', { ascending: true });

      const existingResults = (rawExistingResults ?? []) as unknown as SkinsResultRow[];

      const currentCarryover = calculateCurrentCarryover(existingResults as unknown as SkinsResult[]);
      const baseHoleValue = calculateHoleValue(game.pot_type, game.pot_value);

      const resultData = processHoleResult(
        holeNumber,
        holeScores,
        baseHoleValue,
        currentCarryover,
        game.scoring_type
      );

      const { data: rawExistingHole } = await supabase
        .from('skins_results')
        .select('id')
        .eq('skins_game_id', skinsGameId)
        .eq('hole_number', holeNumber)
        .single();

      const existingHole = rawExistingHole as unknown as { id: string } | null;

      let result: SkinsResult;

      if (existingHole) {
        const { data, error } = await supabase
          .from('skins_results')
          .update({
            winner_id: resultData.winner_id,
            is_carryover: resultData.is_carryover,
            hole_scores: resultData.hole_scores,
            hole_pot_value: resultData.hole_pot_value,
            carryover_to_next: resultData.carryover_to_next,
            payout_amount: resultData.payout_amount,
            calculated_at: new Date().toISOString(),
          } as never)
          .eq('id', existingHole.id)
          .select()
          .single();

        if (error) {
          throw createError(`Failed to update skins result: ${error.message}`, 'DATABASE');
        }

        result = data as unknown as SkinsResult;
      } else {
        const { data, error } = await supabase
          .from('skins_results')
          .insert({
            skins_game_id: skinsGameId,
            hole_number: holeNumber,
            winner_id: resultData.winner_id,
            is_carryover: resultData.is_carryover,
            hole_scores: resultData.hole_scores,
            hole_pot_value: resultData.hole_pot_value,
            carryover_to_next: resultData.carryover_to_next,
            payout_amount: resultData.payout_amount,
          } as never)
          .select()
          .single();

        if (error) {
          throw createError(`Failed to insert skins result: ${error.message}`, 'DATABASE');
        }

        result = data as unknown as SkinsResult;
      }

      return result;
    },

    onSuccess: (data) => {
      queryClient.invalidateQueries({
        queryKey: skinsKeys.results(data.skins_game_id),
        refetchType: 'all',
      });
      queryClient.invalidateQueries({
        queryKey: skinsKeys.summary(data.skins_game_id),
        refetchType: 'all',
      });
      queryClient.invalidateQueries({
        queryKey: skinsKeys.game(data.skins_game_id),
        refetchType: 'all',
      });
    },

    onError: (error) => {
      console.error('[useProcessSkinsHole] Failed to process hole:', error);
    },
  });
}

/**
 * Mutation hook to process a team skins hole result
 */
export function useProcessTeamSkinsHole() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: ProcessTeamSkinsHoleInput): Promise<SkinsResult> => {
      const { skinsGameId, holeNumber, teamScores, teamFormat, skipTeamValidation } = input;

      const { data: rawGame, error: gameError } = await supabase
        .from('skins_games')
        .select('*')
        .eq('id', skinsGameId)
        .single();

      const game = rawGame as unknown as SkinsGameRow | null;

      if (gameError || !game) {
        throw createError('Skins game not found', 'NOT_FOUND');
      }

      if (!skipTeamValidation && !game.is_team_skins) {
        throw createError('This is not a team skins game', 'VALIDATION');
      }

      const { data: rawExistingResults } = await supabase
        .from('skins_results')
        .select('*')
        .eq('skins_game_id', skinsGameId)
        .order('hole_number', { ascending: true });

      const existingResults = (rawExistingResults ?? []) as unknown as SkinsResultRow[];

      const currentCarryover = calculateCurrentCarryover(existingResults as unknown as SkinsResult[]);
      const baseHoleValue = calculateHoleValue(game.pot_type, game.pot_value);

      const resultData = processTeamHoleResult(
        holeNumber,
        teamScores,
        baseHoleValue,
        currentCarryover,
        teamFormat,
        game.scoring_type
      );

      const { data: rawExistingHole, error: _existingError } = await supabase
        .from('skins_results')
        .select('id')
        .eq('skins_game_id', skinsGameId)
        .eq('hole_number', holeNumber)
        .maybeSingle();

      const existingHole = rawExistingHole as unknown as { id: string } | null;

      let result: SkinsResult;

      if (existingHole) {
        const { data, error } = await supabase
          .from('skins_results')
          .update({
            team_winner_id: resultData.team_winner_id,
            winner_id: null,
            is_carryover: resultData.is_carryover,
            hole_scores: resultData.hole_scores,
            hole_pot_value: resultData.hole_pot_value,
            carryover_to_next: resultData.carryover_to_next,
            payout_amount: resultData.payout_amount,
            calculated_at: new Date().toISOString(),
          } as never)
          .eq('id', existingHole.id)
          .select()
          .single();

        if (error) {
          throw createError(`Failed to update team skins result: ${error.message}`, 'DATABASE');
        }

        result = data as unknown as SkinsResult;
      } else {
        const { data, error } = await supabase
          .from('skins_results')
          .upsert({
            skins_game_id: skinsGameId,
            hole_number: holeNumber,
            team_winner_id: resultData.team_winner_id,
            winner_id: null,
            is_carryover: resultData.is_carryover,
            hole_scores: resultData.hole_scores,
            hole_pot_value: resultData.hole_pot_value,
            carryover_to_next: resultData.carryover_to_next,
            payout_amount: resultData.payout_amount,
            calculated_at: new Date().toISOString(),
          } as never, {
            onConflict: 'skins_game_id,hole_number',
          })
          .select()
          .single();

        if (error) {
          throw createError(`Failed to upsert team skins result: ${error.message}`, 'DATABASE');
        }

        result = data as unknown as SkinsResult;
      }

      return result;
    },

    onSuccess: (data) => {
      queryClient.invalidateQueries({
        queryKey: skinsKeys.results(data.skins_game_id),
        refetchType: 'all',
      });
      queryClient.invalidateQueries({
        queryKey: skinsKeys.summary(data.skins_game_id),
        refetchType: 'all',
      });
      queryClient.invalidateQueries({
        queryKey: skinsKeys.game(data.skins_game_id),
        refetchType: 'all',
      });
    },

    onError: (error) => {
      console.error('[useProcessTeamSkinsHole] Failed to process team hole:', error);
    },
  });
}

/**
 * Mutation hook to finalize a skins game
 */
export function useFinalizeSkinsGame() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ gameId }: { gameId: string }): Promise<SkinsGame> => {
      const { data: rawGame, error: gameError } = await supabase
        .from('skins_games')
        .select('*')
        .eq('id', gameId)
        .single();

      const game = rawGame as unknown as SkinsGameRow | null;

      if (gameError || !game) {
        throw createError('Skins game not found', 'NOT_FOUND');
      }

      const { data: rawResults, error: resultsError } = await supabase
        .from('skins_results')
        .select('*')
        .eq('skins_game_id', gameId)
        .order('hole_number', { ascending: true });

      if (resultsError) {
        throw createError(`Failed to fetch results: ${resultsError.message}`, 'DATABASE');
      }

      const results = (rawResults ?? []) as unknown as SkinsResultRow[];

      const { data: rawPlayers } = await supabase
        .from('players')
        .select('id, name, handicap')
        .in('id', game.participant_ids);

      const players = (rawPlayers ?? []) as unknown as PlayerRow[];

      const participants = players.map((p) => ({
        id: p.id,
        name: p.name,
        handicap: p.handicap,
      }));

      const payoutResult = calculateFinalPayoutsWithCarryover(
        game as SkinsGame,
        results as unknown as SkinsResult[],
        participants
      );

      await supabase.from('skins_payouts').delete().eq('skins_game_id', gameId);

      const payoutInserts = payoutResult.payouts.map((p) => ({
        skins_game_id: gameId,
        player_id: p.player_id,
        buy_in: p.buy_in,
        total_winnings: p.total_winnings,
        net_result: p.net_result,
        holes_won: p.holes_won,
        holes_tied: p.holes_tied,
        holes_lost: p.holes_lost,
      }));

      if (payoutInserts.length > 0) {
        const { error: insertError } = await supabase
          .from('skins_payouts')
          .insert(payoutInserts as never);

        if (insertError) {
          throw createError(`Failed to insert payouts: ${insertError.message}`, 'DATABASE');
        }
      }

      const { data: updatedGame, error: updateError } = await supabase
        .from('skins_games')
        .update({
          status: 'completed',
          completed_at: new Date().toISOString(),
        } as never)
        .eq('id', gameId)
        .select()
        .single();

      if (updateError) {
        throw createError(`Failed to update game status: ${updateError.message}`, 'DATABASE');
      }

      return updatedGame as unknown as SkinsGame;
    },

    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: skinsKeys.game(data.id) });
      queryClient.invalidateQueries({ queryKey: skinsKeys.results(data.id) });
      queryClient.invalidateQueries({ queryKey: skinsKeys.payouts(data.id) });
      queryClient.invalidateQueries({ queryKey: skinsKeys.summary(data.id) });
      queryClient.invalidateQueries({ queryKey: skinsKeys.gamesByRound(data.round_id) });
    },

    onError: (error) => {
      console.error('[useFinalizeSkinsGame] Failed to finalize game:', error);
    },
  });
}

/**
 * Mutation hook to cancel a skins game
 */
export function useCancelSkinsGame() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ gameId }: { gameId: string }): Promise<SkinsGame> => {
      const { data, error } = await supabase
        .from('skins_games')
        .update({ status: 'cancelled' } as never)
        .eq('id', gameId)
        .select()
        .single();

      if (error) {
        throw createError(`Failed to cancel skins game: ${error.message}`, 'DATABASE');
      }

      return data as unknown as SkinsGame;
    },

    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: skinsKeys.game(data.id) });
      queryClient.invalidateQueries({ queryKey: skinsKeys.gamesByRound(data.round_id) });
    },

    onError: (error) => {
      console.error('[useCancelSkinsGame] Failed to cancel game:', error);
    },
  });
}
