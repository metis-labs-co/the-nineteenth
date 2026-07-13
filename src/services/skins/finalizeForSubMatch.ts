/**
 * Finalize a skins game scoped to a single sub-match.
 *
 * Resolves the active skins game for the given sub-match and runs the
 * full finalize sequence (compute payouts, write skins_payouts, mark the
 * game completed). Mirrors the round-level finalize path used in
 * `useFinalizeSkinsForRound`, but narrowed to a sub-match scope.
 *
 * Used as a service helper so it can be invoked from a non-hook context
 * (e.g. inside another mutation's onSuccess).
 */

import { supabase } from '@/services/supabase/client';
import { fetchPlayerListByIds } from '@/services/api/players';
import {
  calculateFinalPayoutsWithCarryover,
} from '@/utils/skins';
import type {
  SkinsGame,
  SkinsResult,
  SkinsParticipant,
} from '@/types/database/skins.types';

export interface FinalizeForSubMatchResult {
  finalized: boolean;
  gameId?: string;
  error?: string;
}

export async function finalizeSkinsForSubMatch(
  subMatchId: string
): Promise<FinalizeForSubMatchResult> {
  if (!subMatchId) {
    return { finalized: false, error: 'subMatchId is required' };
  }

  try {
    const { data: rawGame, error: gameError } = await supabase
      .from('skins_games')
      .select('*')
      .eq('sub_match_id', subMatchId)
      .eq('status', 'active')
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (gameError) {
      return {
        finalized: false,
        error: `Failed to look up sub-match skins game: ${gameError.message}`,
      };
    }

    const game = rawGame as unknown as SkinsGame | null;
    if (!game) {
      return { finalized: false };
    }

    const { data: rawResults, error: resultsError } = await supabase
      .from('skins_results')
      .select('*')
      .eq('skins_game_id', game.id)
      .order('hole_number', { ascending: true });

    if (resultsError) {
      return {
        finalized: false,
        error: `Failed to fetch skins results: ${resultsError.message}`,
      };
    }

    const results = (rawResults ?? []) as unknown as SkinsResult[];

    const participants: SkinsParticipant[] = await fetchPlayerListByIds(
      game.participant_ids
    );

    const payoutResult = calculateFinalPayoutsWithCarryover(game, results, participants);

    await supabase.from('skins_payouts').delete().eq('skins_game_id', game.id);

    const payoutInserts = payoutResult.payouts.map((p) => ({
      skins_game_id: game.id,
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
        return {
          finalized: false,
          error: `Failed to insert payouts: ${insertError.message}`,
        };
      }
    }

    const { error: updateError } = await supabase
      .from('skins_games')
      .update({
        status: 'completed',
        completed_at: new Date().toISOString(),
      } as never)
      .eq('id', game.id);

    if (updateError) {
      return {
        finalized: false,
        error: `Failed to mark game completed: ${updateError.message}`,
      };
    }

    return { finalized: true, gameId: game.id };
  } catch (error) {
    return {
      finalized: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}
