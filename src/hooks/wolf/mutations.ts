/**
 * Wolf Hooks - Mutation Hooks
 *
 * TanStack Query mutation hooks for modifying Wolf game data.
 *
 * Hooks:
 * - useCreateWolfGame: Create a new Wolf game
 * - useSubmitWolfDecision: Submit Wolf's partner decision for a hole
 * - useRecordWolfHoleResult: Record hole scores and calculate result
 * - useFinalizeWolfGame: Finalize a completed game with payouts
 * - useCancelWolfGame: Cancel an active game
 *
 * Note: Type assertions are used for wolf_* tables until the Supabase types
 * are regenerated after running the migration.
 */

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/services/supabase/client';
import { wolfKeys, roundKeys } from '@/hooks/queryKeys';
import {
  determineWolfHoleResult,
  calculateWolfPoints,
  createPayoutRecords,
  validateWolfParticipants,
  validateWolfDecision,
  determineWolfForHole,
} from '@/utils/wolfCalculations';
import { createError } from './helpers';
import type {
  WolfGame,
  WolfHoleDecision,
  CreateWolfGameInput,
  SubmitWolfDecisionInput,
  RecordWolfHoleResultInput,
  WolfHoleScores,
  WolfPointsAwarded,
} from '@/types/database/wolf.types';

// =====================================================
// TYPE HELPERS (until Supabase types are regenerated)
// =====================================================

interface RawWolfGame {
  id: string;
  round_id: string;
  participant_ids: string[];
  wolf_order: string[];
  scoring_type: 'gross' | 'net';
  blind_wolf_enabled: boolean;
  pot_enabled: boolean;
  pot_value_per_point: number | null;
  currency: string;
  status: 'active' | 'completed' | 'cancelled';
  disclaimer_accepted_at: string | null;
  disclaimer_accepted_by: string | null;
  created_by: string;
  created_at: string;
  updated_at: string;
  completed_at: string | null;
}

interface RawWolfHoleDecision {
  id: string;
  wolf_game_id: string;
  hole_number: number;
  wolf_id: string;
  is_blind_wolf: boolean;
  partner_id: string | null;
  hole_scores: Record<string, number> | null;
  is_tie: boolean;
  wolf_team_won: boolean | null;
  points_awarded: Record<string, number> | null;
  decided_at: string | null;
  calculated_at: string | null;
}

// =====================================================
// INPUT TYPES
// =====================================================

/**
 * Extended input for creating Wolf game with disclaimer acceptance
 */
export interface CreateWolfGameWithDisclaimerInput extends CreateWolfGameInput {
  /** User ID who accepted disclaimer and is creating the game */
  disclaimerAcceptedBy: string;
}

// =====================================================
// MUTATION HOOKS
// =====================================================

/**
 * Mutation hook to create a new Wolf game
 *
 * Creates a wolf_games record with participant configuration and settings.
 */
export function useCreateWolfGame() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: CreateWolfGameWithDisclaimerInput): Promise<WolfGame> => {
      const { disclaimerAcceptedBy, ...gameInput } = input;

      // Validate participant count (3-4 players)
      const validation = validateWolfParticipants(gameInput.participant_ids);
      if (!validation.isValid) {
        throw createError(validation.errors.join(', '), 'VALIDATION');
      }

      // Set wolf_order (defaults to participant order if not provided)
      const wolfOrder = gameInput.wolf_order ?? gameInput.participant_ids;

      // Prepare insert data
      const insertData = {
        round_id: gameInput.round_id,
        participant_ids: gameInput.participant_ids,
        wolf_order: wolfOrder,
        scoring_type: gameInput.scoring_type,
        blind_wolf_enabled: gameInput.blind_wolf_enabled ?? true,
        pot_enabled: gameInput.pot_enabled ?? false,
        pot_value: gameInput.pot_enabled ? (gameInput.pot_value ?? null) : null,
        currency: gameInput.currency ?? 'AUD',
        status: 'active' as const,
        disclaimer_accepted_at: gameInput.pot_enabled ? new Date().toISOString() : null,
        disclaimer_accepted_by: gameInput.pot_enabled ? disclaimerAcceptedBy : null,
        created_by: disclaimerAcceptedBy,
      };

      // Type assertion for wolf_games table
      const { data, error } = await supabase
        .from('wolf_games' as 'players')
        .insert(insertData as never)
        .select()
        .single() as unknown as { data: RawWolfGame | null; error: { message: string } | null };

      if (error) {
        throw createError(`Failed to create Wolf game: ${error.message}`, 'DATABASE');
      }

      if (!data) {
        throw createError('Failed to create Wolf game: No data returned', 'DATABASE');
      }

      return data as WolfGame;
    },

    onSuccess: (data) => {
      // Invalidate round queries to show Wolf game in round details
      queryClient.invalidateQueries({
        queryKey: wolfKeys.gameByRound(data.round_id),
      });
      queryClient.invalidateQueries({
        queryKey: roundKeys.detail(data.round_id),
      });
    },

    onError: (error) => {
      console.error('[useCreateWolfGame] Failed to create game:', error);
    },
  });
}

/**
 * Mutation hook to submit Wolf's partner decision for a hole
 *
 * Creates or updates a wolf_hole_decisions record with the Wolf's choice.
 * Does NOT calculate the result yet - that's done by useRecordWolfHoleResult.
 */
export function useSubmitWolfDecision() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: SubmitWolfDecisionInput): Promise<WolfHoleDecision> => {
      const { wolf_game_id, hole_number, is_blind_wolf, partner_id } = input;

      // Fetch the game to validate
      const { data: game, error: gameError } = await supabase
        .from('wolf_games' as 'players')
        .select('*')
        .eq('id', wolf_game_id)
        .single() as unknown as { data: RawWolfGame | null; error: { message: string } | null };

      if (gameError || !game) {
        throw createError('Wolf game not found', 'NOT_FOUND');
      }

      if (game.status !== 'active') {
        throw createError('Wolf game is not active', 'VALIDATION');
      }

      // Determine who should be Wolf for this hole
      const expectedWolfId = determineWolfForHole(game.wolf_order, hole_number);

      // Validate the decision
      const validation = validateWolfDecision(expectedWolfId, partner_id, game.participant_ids);
      if (!validation.isValid) {
        throw createError(validation.errors.join(', '), 'VALIDATION');
      }

      // Blind wolf requires blind_wolf_enabled setting
      if (is_blind_wolf && !game.blind_wolf_enabled) {
        throw createError('Blind Wolf is not enabled for this game', 'VALIDATION');
      }

      // Check if decision already exists
      const { data: existingDecision } = await supabase
        .from('wolf_hole_decisions' as 'players')
        .select('id, hole_scores')
        .eq('wolf_game_id', wolf_game_id)
        .eq('hole_number', hole_number)
        .maybeSingle() as unknown as { data: { id: string; hole_scores: WolfHoleScores | null } | null; error: unknown };

      // Blind Wolf can only be declared if no scores entered yet
      if (is_blind_wolf && existingDecision?.hole_scores && Object.keys(existingDecision.hole_scores).length > 0) {
        throw createError('Blind Wolf cannot be declared after scores are entered', 'VALIDATION');
      }

      let result: RawWolfHoleDecision;

      if (existingDecision) {
        // Update existing decision
        const { data, error } = await supabase
          .from('wolf_hole_decisions' as 'players')
          .update({
            is_blind_wolf,
            partner_id,
            decided_at: new Date().toISOString(),
          } as never)
          .eq('id', existingDecision.id)
          .select()
          .single() as unknown as { data: RawWolfHoleDecision | null; error: { message: string } | null };

        if (error || !data) {
          throw createError(`Failed to update Wolf decision: ${error?.message ?? 'No data returned'}`, 'DATABASE');
        }

        result = data;
      } else {
        // Insert new decision
        const { data, error } = await supabase
          .from('wolf_hole_decisions' as 'players')
          .insert({
            wolf_game_id,
            hole_number,
            wolf_id: expectedWolfId,
            is_blind_wolf,
            partner_id,
            is_tie: false,
            decided_at: new Date().toISOString(),
          } as never)
          .select()
          .single() as unknown as { data: RawWolfHoleDecision | null; error: { message: string } | null };

        if (error || !data) {
          throw createError(`Failed to submit Wolf decision: ${error?.message ?? 'No data returned'}`, 'DATABASE');
        }

        result = data;
      }

      return result as WolfHoleDecision;
    },

    onSuccess: (data) => {
      queryClient.invalidateQueries({
        queryKey: wolfKeys.decisions(data.wolf_game_id),
      });
      queryClient.invalidateQueries({
        queryKey: wolfKeys.decision(data.wolf_game_id, data.hole_number),
      });
      queryClient.invalidateQueries({
        queryKey: wolfKeys.standings(data.wolf_game_id),
      });
    },

    onError: (error) => {
      console.error('[useSubmitWolfDecision] Failed to submit decision:', error);
    },
  });
}

/**
 * Mutation hook to record Wolf hole scores and calculate result
 *
 * Updates wolf_hole_decisions with hole_scores, determines winner,
 * and calculates points_awarded for each player.
 */
export function useRecordWolfHoleResult() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: RecordWolfHoleResultInput): Promise<WolfHoleDecision> => {
      const { wolf_game_id, hole_number, hole_scores, handicap_strokes } = input;

      // Fetch the game
      const { data: game, error: gameError } = await supabase
        .from('wolf_games' as 'players')
        .select('*')
        .eq('id', wolf_game_id)
        .single() as unknown as { data: RawWolfGame | null; error: { message: string } | null };

      if (gameError || !game) {
        throw createError('Wolf game not found', 'NOT_FOUND');
      }

      if (game.status !== 'active') {
        throw createError('Wolf game is not active', 'VALIDATION');
      }

      // Validate all participants have scores
      const missingScores = game.participant_ids.filter((id) => hole_scores[id] === undefined);
      if (missingScores.length > 0) {
        throw createError(`Missing scores for players: ${missingScores.join(', ')}`, 'VALIDATION');
      }

      // Fetch the existing decision (must have been made)
      const { data: existingDecision, error: decisionError } = await supabase
        .from('wolf_hole_decisions' as 'players')
        .select('*')
        .eq('wolf_game_id', wolf_game_id)
        .eq('hole_number', hole_number)
        .maybeSingle() as unknown as { data: RawWolfHoleDecision | null; error: { message: string } | null };

      if (decisionError) {
        throw createError(`Failed to fetch decision: ${decisionError.message}`, 'DATABASE');
      }

      // If no decision exists, we need to create one with the expected Wolf
      const wolfId = existingDecision?.wolf_id ?? determineWolfForHole(game.wolf_order, hole_number);
      const partnerId = existingDecision?.partner_id ?? null;
      const isBlindWolf = existingDecision?.is_blind_wolf ?? false;

      // Calculate the result
      const result = determineWolfHoleResult(
        wolfId,
        partnerId,
        hole_scores,
        game.scoring_type,
        handicap_strokes
      );

      // Calculate points
      const pointsAwarded = calculateWolfPoints(
        wolfId,
        partnerId,
        game.participant_ids,
        result.wolfTeamWon,
        result.isTie,
        isBlindWolf
      );

      // Update or insert the decision with result
      let finalDecision: RawWolfHoleDecision;

      if (existingDecision) {
        const { data, error } = await supabase
          .from('wolf_hole_decisions' as 'players')
          .update({
            hole_scores: hole_scores as unknown as never,
            is_tie: result.isTie,
            wolf_team_won: result.isTie ? null : result.wolfTeamWon,
            points_awarded: pointsAwarded as unknown as never,
            calculated_at: new Date().toISOString(),
          } as never)
          .eq('id', existingDecision.id)
          .select()
          .single() as unknown as { data: RawWolfHoleDecision | null; error: { message: string } | null };

        if (error || !data) {
          throw createError(`Failed to update hole result: ${error?.message ?? 'No data returned'}`, 'DATABASE');
        }

        finalDecision = data;
      } else {
        // No decision was made - create one with default (no partner = lone wolf)
        const { data, error } = await supabase
          .from('wolf_hole_decisions' as 'players')
          .insert({
            wolf_game_id,
            hole_number,
            wolf_id: wolfId,
            is_blind_wolf: false,
            partner_id: null, // Default to lone wolf if no decision was made
            hole_scores: hole_scores as unknown as never,
            is_tie: result.isTie,
            wolf_team_won: result.isTie ? null : result.wolfTeamWon,
            points_awarded: pointsAwarded as unknown as never,
            decided_at: new Date().toISOString(), // Auto-decision
            calculated_at: new Date().toISOString(),
          } as never)
          .select()
          .single() as unknown as { data: RawWolfHoleDecision | null; error: { message: string } | null };

        if (error || !data) {
          throw createError(`Failed to record hole result: ${error?.message ?? 'No data returned'}`, 'DATABASE');
        }

        finalDecision = data;
      }

      return finalDecision as WolfHoleDecision;
    },

    onSuccess: (data) => {
      queryClient.invalidateQueries({
        queryKey: wolfKeys.decisions(data.wolf_game_id),
      });
      queryClient.invalidateQueries({
        queryKey: wolfKeys.decision(data.wolf_game_id, data.hole_number),
      });
      queryClient.invalidateQueries({
        queryKey: wolfKeys.standings(data.wolf_game_id),
      });
      queryClient.invalidateQueries({
        queryKey: wolfKeys.summary(data.wolf_game_id),
      });
    },

    onError: (error) => {
      console.error('[useRecordWolfHoleResult] Failed to record hole result:', error);
    },
  });
}

/**
 * Mutation hook to finalize a Wolf game
 *
 * Calculates final payouts, inserts wolf_payouts records,
 * and updates game status to 'completed'.
 */
export function useFinalizeWolfGame() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ gameId }: { gameId: string }): Promise<WolfGame> => {
      // Fetch the game
      const { data: game, error: gameError } = await supabase
        .from('wolf_games' as 'players')
        .select('*')
        .eq('id', gameId)
        .single() as unknown as { data: RawWolfGame | null; error: { message: string } | null };

      if (gameError || !game) {
        throw createError('Wolf game not found', 'NOT_FOUND');
      }

      if (game.status === 'completed') {
        throw createError('Wolf game is already completed', 'VALIDATION');
      }

      if (game.status === 'cancelled') {
        throw createError('Cannot finalize a cancelled game', 'VALIDATION');
      }

      // Fetch all decisions
      const { data: decisions, error: decisionsError } = await supabase
        .from('wolf_hole_decisions' as 'players')
        .select('*')
        .eq('wolf_game_id', gameId)
        .order('hole_number', { ascending: true }) as unknown as { data: RawWolfHoleDecision[] | null; error: { message: string } | null };

      if (decisionsError) {
        throw createError(`Failed to fetch decisions: ${decisionsError.message}`, 'DATABASE');
      }

      // Calculate standings from decisions
      const standings: Record<string, number> = {};
      for (const playerId of game.participant_ids) {
        standings[playerId] = 0;
      }

      for (const decision of decisions ?? []) {
        if (decision.points_awarded) {
          for (const [playerId, points] of Object.entries(decision.points_awarded)) {
            if (standings[playerId] !== undefined) {
              standings[playerId] += points;
            }
          }
        }
      }

      // Create payout records
      const payoutRecords = createPayoutRecords(standings, game.pot_value_per_point);

      // Delete existing payouts (in case of re-finalization)
      await supabase
        .from('wolf_payouts' as 'players')
        .delete()
        .eq('wolf_game_id', gameId);

      // Insert new payouts
      if (payoutRecords.length > 0) {
        const payoutInserts = payoutRecords.map((p) => ({
          wolf_game_id: gameId,
          player_id: p.player_id,
          total_points: p.total_points,
          total_winnings: p.total_winnings,
          net_result: p.net_result,
          calculated_at: new Date().toISOString(),
        }));

        const { error: insertError } = await supabase
          .from('wolf_payouts' as 'players')
          .insert(payoutInserts as never[]);

        if (insertError) {
          throw createError(`Failed to insert payouts: ${insertError.message}`, 'DATABASE');
        }
      }

      // Update game status
      const { data: updatedGame, error: updateError } = await supabase
        .from('wolf_games' as 'players')
        .update({
          status: 'completed',
          completed_at: new Date().toISOString(),
        } as never)
        .eq('id', gameId)
        .select()
        .single() as unknown as { data: RawWolfGame | null; error: { message: string } | null };

      if (updateError || !updatedGame) {
        throw createError(`Failed to update game status: ${updateError?.message ?? 'No data returned'}`, 'DATABASE');
      }

      return updatedGame as WolfGame;
    },

    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: wolfKeys.game(data.id) });
      queryClient.invalidateQueries({ queryKey: wolfKeys.decisions(data.id) });
      queryClient.invalidateQueries({ queryKey: wolfKeys.payouts(data.id) });
      queryClient.invalidateQueries({ queryKey: wolfKeys.summary(data.id) });
      queryClient.invalidateQueries({ queryKey: wolfKeys.standings(data.id) });
      queryClient.invalidateQueries({ queryKey: wolfKeys.gameByRound(data.round_id) });
      queryClient.invalidateQueries({ queryKey: roundKeys.detail(data.round_id) });
    },

    onError: (error) => {
      console.error('[useFinalizeWolfGame] Failed to finalize game:', error);
    },
  });
}

/**
 * Mutation hook to cancel a Wolf game
 *
 * Updates game status to 'cancelled'. Does not delete any data.
 */
export function useCancelWolfGame() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ gameId }: { gameId: string }): Promise<WolfGame> => {
      // Fetch the game first to validate
      const { data: game, error: gameError } = await supabase
        .from('wolf_games' as 'players')
        .select('*')
        .eq('id', gameId)
        .single() as unknown as { data: RawWolfGame | null; error: { message: string } | null };

      if (gameError || !game) {
        throw createError('Wolf game not found', 'NOT_FOUND');
      }

      if (game.status === 'completed') {
        throw createError('Cannot cancel a completed game', 'VALIDATION');
      }

      if (game.status === 'cancelled') {
        throw createError('Game is already cancelled', 'VALIDATION');
      }

      // Update status
      const { data, error } = await supabase
        .from('wolf_games' as 'players')
        .update({ status: 'cancelled' } as never)
        .eq('id', gameId)
        .select()
        .single() as unknown as { data: RawWolfGame | null; error: { message: string } | null };

      if (error || !data) {
        throw createError(`Failed to cancel Wolf game: ${error?.message ?? 'No data returned'}`, 'DATABASE');
      }

      return data as WolfGame;
    },

    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: wolfKeys.game(data.id) });
      queryClient.invalidateQueries({ queryKey: wolfKeys.gameByRound(data.round_id) });
      queryClient.invalidateQueries({ queryKey: roundKeys.detail(data.round_id) });
    },

    onError: (error) => {
      console.error('[useCancelWolfGame] Failed to cancel game:', error);
    },
  });
}

/**
 * Mutation hook to delete a Wolf game
 *
 * Permanently deletes the game and all associated decisions/payouts.
 * Use with caution - prefer cancellation for audit trail.
 */
export function useDeleteWolfGame() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ gameId }: { gameId: string }): Promise<{ roundId: string }> => {
      // Fetch the game first to get round_id
      const { data: game, error: gameError } = await supabase
        .from('wolf_games' as 'players')
        .select('round_id')
        .eq('id', gameId)
        .single() as unknown as { data: { round_id: string } | null; error: { message: string } | null };

      if (gameError || !game) {
        throw createError('Wolf game not found', 'NOT_FOUND');
      }

      const roundId = game.round_id;

      // Delete the game (cascade will delete decisions and payouts)
      const { error: deleteError } = await supabase
        .from('wolf_games' as 'players')
        .delete()
        .eq('id', gameId);

      if (deleteError) {
        throw createError(`Failed to delete Wolf game: ${deleteError.message}`, 'DATABASE');
      }

      return { roundId };
    },

    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: wolfKeys.all });
      queryClient.invalidateQueries({ queryKey: wolfKeys.gameByRound(data.roundId) });
      queryClient.invalidateQueries({ queryKey: roundKeys.detail(data.roundId) });
    },

    onError: (error) => {
      console.error('[useDeleteWolfGame] Failed to delete game:', error);
    },
  });
}
