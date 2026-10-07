/**
 * Skins game settlement — the non-hook core of useFinalizeSkinsGame.
 *
 * Computes each participant's payout, rewrites skins_payouts and marks the
 * game completed. The buy-in is priced over the round's hole counts
 * (fetchSkinsHoleCounts): a 9-hole round's pot covers 9 holes, and a round
 * ended early settles over the holes played, so individual payouts stay
 * zero-sum within cent rounding (I11).
 *
 * Lives outside React so finalizeSubmittedRound — and the queued "finalise
 * round" sync item it backs — can settle a game without a hook.
 */

import { supabase } from '@/services/supabase/client';
import { createError } from '@/services/errors';
import { calculateFinalPayoutsWithCarryover } from '@/utils/skins';
import { fetchActiveSkinsGame } from './activeGame';
import { fetchSkinsHoleCounts } from './roundHoleCounts';
import type { SkinsGame, SkinsResult } from '@/types/database/skins.types';

/**
 * Settle one skins game. Hole counts are always read from the game's round
 * (fetchSkinsHoleCounts); there is deliberately no override.
 *
 * @param gameId - Skins game to settle
 * @returns The game, now `completed`. Throws on any failure.
 */
export async function finalizeSkinsGame(gameId: string): Promise<SkinsGame> {
  const { data: rawGame, error: gameError } = await supabase
    .from('skins_games')
    .select('*')
    .eq('id', gameId)
    .single();

  const game = rawGame as unknown as SkinsGame | null;

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

  const results = (rawResults ?? []) as unknown as SkinsResult[];

  // The buy-in divisor is the game's own participant list. The calculator
  // only needs ids, and a players read (fetchPlayerListByIds) swallows errors,
  // so a failed read would have settled on an empty list.
  const participants = game.participant_ids.map((id) => ({ id }));
  const holeCounts = await fetchSkinsHoleCounts(game.round_id);

  const payoutResult = calculateFinalPayoutsWithCarryover(game, results, participants, holeCounts);

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
}

export interface FinalizeActiveSkinsResult {
  finalized: boolean;
  /** The settled game (status `completed`) when one was finalised. */
  game?: SkinsGame;
  /**
   * The caught failure (the raw value), set whenever settlement failed. A
   * caller that can retry (the queued 'finalize' round item) should treat it
   * as retryable: only `active` games are looked up, so a retry never settles
   * a game twice.
   */
  error?: unknown;
}

/**
 * Settle the round's active skins game, if it has one. Never throws: a
 * failure comes back as `{ finalized: false, error }`.
 */
export async function finalizeActiveSkinsForRound(roundId: string): Promise<FinalizeActiveSkinsResult> {
  try {
    const activeGame = await fetchActiveSkinsGame({ roundId });
    if (!activeGame) {
      return { finalized: false };
    }

    const game = await finalizeSkinsGame(activeGame.id);
    return { finalized: true, game };
  } catch (error) {
    console.error('[finalizeActiveSkinsForRound] Error finalizing skins:', error);
    return { finalized: false, error };
  }
}
