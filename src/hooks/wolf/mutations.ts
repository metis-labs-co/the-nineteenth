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
 * - useDeleteWolfGame: Permanently delete a game
 */

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { wolfKeys, roundKeys } from '@/hooks/queryKeys';
import { useAuth } from '@/hooks/useAuth';
import { useCheckAchievements } from '@/hooks/achievements/useCheckAchievements';
import { useAchievementToast } from '@/context/AchievementToastContext';
import {
  determineWolfHoleResult,
  calculateWolfPoints,
  createPayoutRecords,
  validateWolfParticipants,
  validateWolfDecision,
  determineWolfForHole,
} from '@/utils/wolf';
import {
  createError,
  wolfGamesTable,
  wolfDecisionsTable,
  wolfPayoutsTable,
  castResult,
  castArrayResult,
} from './helpers';
import type { RawWolfGame, RawWolfHoleDecision } from './helpers';
import type {
  WolfGame,
  WolfHoleDecision,
  CreateWolfGameInput,
  SubmitWolfDecisionInput,
  RecordWolfHoleResultInput,
  WolfHoleScores,
} from '@/types/database/wolf.types';

// =====================================================
// INPUT TYPES
// =====================================================

export interface CreateWolfGameWithDisclaimerInput extends CreateWolfGameInput {
  disclaimerAcceptedBy: string;
}

// =====================================================
// MUTATION HOOKS
// =====================================================

export function useCreateWolfGame() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: CreateWolfGameWithDisclaimerInput): Promise<WolfGame> => {
      const { disclaimerAcceptedBy, ...gameInput } = input;

      const validation = validateWolfParticipants(gameInput.participant_ids);
      if (!validation.isValid) {
        throw createError(validation.errors.join(', '), 'VALIDATION');
      }

      const wolfOrder = gameInput.wolf_order ?? gameInput.participant_ids;

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

      const { data, error } = castResult<RawWolfGame>(
        await wolfGamesTable().insert(insertData as never).select().single()
      );

      if (error) throw createError(`Failed to create Wolf game: ${error.message}`, 'DATABASE');
      if (!data) throw createError('Failed to create Wolf game: No data returned', 'DATABASE');

      return data as WolfGame;
    },

    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: wolfKeys.gameByRound(data.round_id) });
      queryClient.invalidateQueries({ queryKey: roundKeys.detail(data.round_id) });
    },

    onError: (error) => {
      console.error('[useCreateWolfGame] Failed to create game:', error);
    },
  });
}

export function useSubmitWolfDecision() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: SubmitWolfDecisionInput): Promise<WolfHoleDecision> => {
      const { wolf_game_id, hole_number, is_blind_wolf, partner_id } = input;

      const { data: game, error: gameError } = castResult<RawWolfGame>(
        await wolfGamesTable().select('*').eq('id', wolf_game_id).single()
      );

      if (gameError || !game) throw createError('Wolf game not found', 'NOT_FOUND');
      if (game.status !== 'active') throw createError('Wolf game is not active', 'VALIDATION');

      const expectedWolfId = determineWolfForHole(game.wolf_order, hole_number);

      const validation = validateWolfDecision(expectedWolfId, partner_id, game.participant_ids);
      if (!validation.isValid) throw createError(validation.errors.join(', '), 'VALIDATION');

      if (is_blind_wolf && !game.blind_wolf_enabled) {
        throw createError('Blind Wolf is not enabled for this game', 'VALIDATION');
      }

      const { data: existingDecision } = castResult<{ id: string; hole_scores: WolfHoleScores | null }>(
        await wolfDecisionsTable()
          .select('id, hole_scores')
          .eq('wolf_game_id', wolf_game_id)
          .eq('hole_number', hole_number)
          .maybeSingle()
      );

      if (is_blind_wolf && existingDecision?.hole_scores && Object.keys(existingDecision.hole_scores).length > 0) {
        throw createError('Blind Wolf cannot be declared after scores are entered', 'VALIDATION');
      }

      let result: RawWolfHoleDecision;

      if (existingDecision) {
        const { data, error } = castResult<RawWolfHoleDecision>(
          await wolfDecisionsTable()
            .update({ is_blind_wolf, partner_id, decided_at: new Date().toISOString() } as never)
            .eq('id', existingDecision.id)
            .select()
            .single()
        );
        if (error || !data) throw createError(`Failed to update Wolf decision: ${error?.message ?? 'No data returned'}`, 'DATABASE');
        result = data;
      } else {
        const { data, error } = castResult<RawWolfHoleDecision>(
          await wolfDecisionsTable()
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
            .single()
        );
        if (error || !data) throw createError(`Failed to submit Wolf decision: ${error?.message ?? 'No data returned'}`, 'DATABASE');
        result = data;
      }

      return result as WolfHoleDecision;
    },

    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: wolfKeys.decisions(data.wolf_game_id) });
      queryClient.invalidateQueries({ queryKey: wolfKeys.decision(data.wolf_game_id, data.hole_number) });
      queryClient.invalidateQueries({ queryKey: wolfKeys.standings(data.wolf_game_id) });
    },

    onError: (error) => {
      console.error('[useSubmitWolfDecision] Failed to submit decision:', error);
    },
  });
}

export function useRecordWolfHoleResult() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: RecordWolfHoleResultInput): Promise<WolfHoleDecision> => {
      const { wolf_game_id, hole_number, hole_scores, handicap_strokes } = input;

      const { data: game, error: gameError } = castResult<RawWolfGame>(
        await wolfGamesTable().select('*').eq('id', wolf_game_id).single()
      );

      if (gameError || !game) throw createError('Wolf game not found', 'NOT_FOUND');
      if (game.status !== 'active') throw createError('Wolf game is not active', 'VALIDATION');

      const missingScores = game.participant_ids.filter((id) => hole_scores[id] === undefined);
      if (missingScores.length > 0) {
        throw createError(`Missing scores for players: ${missingScores.join(', ')}`, 'VALIDATION');
      }

      const { data: existingDecision, error: decisionError } = castResult<RawWolfHoleDecision>(
        await wolfDecisionsTable()
          .select('*')
          .eq('wolf_game_id', wolf_game_id)
          .eq('hole_number', hole_number)
          .maybeSingle()
      );

      if (decisionError) throw createError(`Failed to fetch decision: ${decisionError.message}`, 'DATABASE');

      const wolfId = existingDecision?.wolf_id ?? determineWolfForHole(game.wolf_order, hole_number);
      const partnerId = existingDecision?.partner_id ?? null;
      const isBlindWolf = existingDecision?.is_blind_wolf ?? false;

      const result = determineWolfHoleResult(wolfId, partnerId, hole_scores, game.scoring_type, handicap_strokes);
      const pointsAwarded = calculateWolfPoints(wolfId, partnerId, game.participant_ids, result.wolfTeamWon, result.isTie, isBlindWolf);

      let finalDecision: RawWolfHoleDecision;

      if (existingDecision) {
        const { data, error } = castResult<RawWolfHoleDecision>(
          await wolfDecisionsTable()
            .update({
              hole_scores: hole_scores as unknown as never,
              is_tie: result.isTie,
              wolf_team_won: result.isTie ? null : result.wolfTeamWon,
              points_awarded: pointsAwarded as unknown as never,
              calculated_at: new Date().toISOString(),
            } as never)
            .eq('id', existingDecision.id)
            .select()
            .single()
        );
        if (error || !data) throw createError(`Failed to update hole result: ${error?.message ?? 'No data returned'}`, 'DATABASE');
        finalDecision = data;
      } else {
        const { data, error } = castResult<RawWolfHoleDecision>(
          await wolfDecisionsTable()
            .insert({
              wolf_game_id,
              hole_number,
              wolf_id: wolfId,
              is_blind_wolf: false,
              partner_id: null,
              hole_scores: hole_scores as unknown as never,
              is_tie: result.isTie,
              wolf_team_won: result.isTie ? null : result.wolfTeamWon,
              points_awarded: pointsAwarded as unknown as never,
              decided_at: new Date().toISOString(),
              calculated_at: new Date().toISOString(),
            } as never)
            .select()
            .single()
        );
        if (error || !data) throw createError(`Failed to record hole result: ${error?.message ?? 'No data returned'}`, 'DATABASE');
        finalDecision = data;
      }

      return finalDecision as WolfHoleDecision;
    },

    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: wolfKeys.decisions(data.wolf_game_id) });
      queryClient.invalidateQueries({ queryKey: wolfKeys.decision(data.wolf_game_id, data.hole_number) });
      queryClient.invalidateQueries({ queryKey: wolfKeys.standings(data.wolf_game_id) });
      queryClient.invalidateQueries({ queryKey: wolfKeys.summary(data.wolf_game_id) });
    },

    onError: (error) => {
      console.error('[useRecordWolfHoleResult] Failed to record hole result:', error);
    },
  });
}

export function useFinalizeWolfGame() {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const { checkAndAward, isReady: isAchievementReady } = useCheckAchievements(user?.id ?? '');
  const { showMultipleToasts } = useAchievementToast();

  return useMutation({
    mutationFn: async ({ gameId }: { gameId: string }): Promise<WolfGame> => {
      const { data: game, error: gameError } = castResult<RawWolfGame>(
        await wolfGamesTable().select('*').eq('id', gameId).single()
      );

      if (gameError || !game) throw createError('Wolf game not found', 'NOT_FOUND');
      if (game.status === 'completed') throw createError('Wolf game is already completed', 'VALIDATION');
      if (game.status === 'cancelled') throw createError('Cannot finalize a cancelled game', 'VALIDATION');

      const { data: decisions, error: decisionsError } = castArrayResult<RawWolfHoleDecision>(
        await wolfDecisionsTable()
          .select('*')
          .eq('wolf_game_id', gameId)
          .order('hole_number', { ascending: true })
      );

      if (decisionsError) throw createError(`Failed to fetch decisions: ${decisionsError.message}`, 'DATABASE');

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

      const payoutRecords = createPayoutRecords(standings, game.pot_value_per_point);

      await wolfPayoutsTable().delete().eq('wolf_game_id', gameId);

      if (payoutRecords.length > 0) {
        const payoutInserts = payoutRecords.map((p) => ({
          wolf_game_id: gameId,
          player_id: p.player_id,
          total_points: p.total_points,
          total_winnings: p.total_winnings,
          net_result: p.net_result,
          calculated_at: new Date().toISOString(),
        }));

        const { error: insertError } = castResult<never>(
          await wolfPayoutsTable().insert(payoutInserts as never[])
        );
        if (insertError) throw createError(`Failed to insert payouts: ${insertError.message}`, 'DATABASE');
      }

      const { data: updatedGame, error: updateError } = castResult<RawWolfGame>(
        await wolfGamesTable()
          .update({ status: 'completed', completed_at: new Date().toISOString() } as never)
          .eq('id', gameId)
          .select()
          .single()
      );

      if (updateError || !updatedGame) {
        throw createError(`Failed to update game status: ${updateError?.message ?? 'No data returned'}`, 'DATABASE');
      }

      return updatedGame as WolfGame;
    },

    onSuccess: async (data) => {
      queryClient.invalidateQueries({ queryKey: wolfKeys.game(data.id) });
      queryClient.invalidateQueries({ queryKey: wolfKeys.decisions(data.id) });
      queryClient.invalidateQueries({ queryKey: wolfKeys.payouts(data.id) });
      queryClient.invalidateQueries({ queryKey: wolfKeys.summary(data.id) });
      queryClient.invalidateQueries({ queryKey: wolfKeys.standings(data.id) });
      queryClient.invalidateQueries({ queryKey: wolfKeys.gameByRound(data.round_id) });
      queryClient.invalidateQueries({ queryKey: roundKeys.detail(data.round_id) });

      // Fire wolf achievement events
      if (!user?.id || !isAchievementReady) return;
      try {
        // wolf_game_completed
        const r1 = await checkAndAward('wolf_game_completed', {});
        if (r1.hasNewRewards) showMultipleToasts(r1.newAchievements, r1.newCosmetics);

        // Check for lone wolf and blind wolf wins in this game's decisions
        const { data: decisions } = castArrayResult<RawWolfHoleDecision>(
          await wolfDecisionsTable()
            .select('*')
            .eq('wolf_game_id', data.id)
            .eq('wolf_id', user.id)
        );

        if (decisions && decisions.length > 0) {
          // Count wins by type to batch achievement checks
          let loneWolfWins = 0;
          let blindWolfWins = 0;
          for (const decision of decisions) {
            if (decision.wolf_team_won) {
              if (!decision.partner_id) loneWolfWins++;
              if (decision.is_blind_wolf) blindWolfWins++;
            }
          }

          if (loneWolfWins > 0) {
            const r = await checkAndAward('wolf_decision_made', { wolf_is_lone: true });
            if (r.hasNewRewards) showMultipleToasts(r.newAchievements, r.newCosmetics);
          }
          if (blindWolfWins > 0) {
            const r = await checkAndAward('wolf_decision_made', { wolf_is_blind: true });
            if (r.hasNewRewards) showMultipleToasts(r.newAchievements, r.newCosmetics);
          }
        }
      } catch (error) {
        console.warn('[useFinalizeWolfGame] Achievement check failed (non-blocking):', error);
      }
    },

    onError: (error) => {
      console.error('[useFinalizeWolfGame] Failed to finalize game:', error);
    },
  });
}

export function useCancelWolfGame() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ gameId }: { gameId: string }): Promise<WolfGame> => {
      const { data: game, error: gameError } = castResult<RawWolfGame>(
        await wolfGamesTable().select('*').eq('id', gameId).single()
      );

      if (gameError || !game) throw createError('Wolf game not found', 'NOT_FOUND');
      if (game.status === 'completed') throw createError('Cannot cancel a completed game', 'VALIDATION');
      if (game.status === 'cancelled') throw createError('Game is already cancelled', 'VALIDATION');

      const { data, error } = castResult<RawWolfGame>(
        await wolfGamesTable()
          .update({ status: 'cancelled' } as never)
          .eq('id', gameId)
          .select()
          .single()
      );

      if (error || !data) throw createError(`Failed to cancel Wolf game: ${error?.message ?? 'No data returned'}`, 'DATABASE');

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

export function useDeleteWolfGame() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ gameId }: { gameId: string }): Promise<{ roundId: string }> => {
      const { data: game, error: gameError } = castResult<{ round_id: string }>(
        await wolfGamesTable().select('round_id').eq('id', gameId).single()
      );

      if (gameError || !game) throw createError('Wolf game not found', 'NOT_FOUND');

      const roundId = game.round_id;

      const { error: deleteError } = castResult<never>(
        await wolfGamesTable().delete().eq('id', gameId)
      );

      if (deleteError) throw createError(`Failed to delete Wolf game: ${deleteError.message}`, 'DATABASE');

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
