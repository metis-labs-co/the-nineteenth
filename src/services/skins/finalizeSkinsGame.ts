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
import type {
  AchievementDefinition,
  AchievementEventData,
  AchievementEventType,
} from '@/types/database/achievement.types';
import type { CosmeticDefinition } from '@/types/database/cosmetic.types';

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

/** What awardSkinsAchievements needs from the React side (useAuth / useCheckAchievements / toasts). */
export interface SkinsAchievementContext {
  playerId: string;
  checkAndAward: (
    eventType: AchievementEventType,
    eventData: AchievementEventData
  ) => Promise<{
    hasNewRewards: boolean;
    newAchievements: AchievementDefinition[];
    newCosmetics: CosmeticDefinition[];
  }>;
  showMultipleToasts: (
    achievements: AchievementDefinition[],
    cosmetics?: (CosmeticDefinition | null)[]
  ) => void;
}

/**
 * Skins achievement events for one player after a game settles. Shared by
 * useFinalizeSkinsGame.onSuccess and the round-submit hook (A6c), which
 * settles through finalizeActiveSkinsForRound and so never runs onSuccess.
 * Non-blocking: failures are logged, never thrown.
 */
export async function awardSkinsAchievements(
  game: Pick<SkinsGame, 'id' | 'pot_value'>,
  { playerId, checkAndAward, showMultipleToasts }: SkinsAchievementContext
): Promise<void> {
  try {
    // Query the player's payout to get holes won data
    // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Supabase generated types restriction workaround
    const { data: payout } = await (supabase as any)
      .from('skins_payouts')
      .select('holes_won, holes_tied')
      .eq('skins_game_id', game.id)
      .eq('player_id', playerId)
      .single();

    const holesWon = (payout?.holes_won as number) ?? 0;

    // Count carryover wins: holes the player won where previous hole(s) had carryovers
    // A hole with payout_amount > pot_value indicates accumulated carryovers
    // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Supabase generated types restriction workaround
    const { data: carryoverWins } = await (supabase as any)
      .from('skins_results')
      .select('id, payout_amount')
      .eq('skins_game_id', game.id)
      .eq('winner_id', playerId)
      .eq('is_carryover', false)
      .not('payout_amount', 'is', null);

    // Filter to holes where payout exceeded the base hole value (indicating carryovers)
    const baseHoleValue = game.pot_value ?? 0;
    const carryoverHolesWon =
      (carryoverWins as { payout_amount: number }[] | null)?.filter(
        (r) => r.payout_amount > baseHoleValue
      ).length ?? 0;

    // skins_game_completed
    const r1 = await checkAndAward('skins_game_completed', {
      skins_holes_won: holesWon,
    });
    if (r1.hasNewRewards) showMultipleToasts(r1.newAchievements, r1.newCosmetics);

    // skins_hole_won (with counts)
    if (holesWon > 0) {
      const r2 = await checkAndAward('skins_hole_won', {
        skins_holes_won: holesWon,
        skins_carryover_holes_won: carryoverHolesWon,
      });
      if (r2.hasNewRewards) showMultipleToasts(r2.newAchievements, r2.newCosmetics);
    }
  } catch (error) {
    console.warn('[awardSkinsAchievements] Achievement check failed (non-blocking):', error);
  }
}
