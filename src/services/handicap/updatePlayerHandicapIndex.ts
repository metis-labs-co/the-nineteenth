/**
 * Player Handicap Index Update Service
 *
 * Recalculates and persists a player's WHS Social Handicap Index
 * after a new scorecard with a differential is synced.
 *
 * This function fetches the last 20 completed scorecards with differentials,
 * calculates the new index using the WHS formula, and updates the player record.
 */

import { supabase } from '@/services/supabase/client';
import type { PostgrestError } from '@supabase/supabase-js';
import { queryClient } from '@/services/queryClient';
import { calculateHandicapIndex } from '@/utils/handicapDifferential';
import { isSharedBallRound } from '@/utils/roundFormat';
import { syncLogger } from '@/utils/debugLogger';
import { isCompleteForHandicap } from '@/utils/handicapEligibility';
import { isEndedEarly } from '@/utils/roundShape';
import type { NineType } from '@/types/database/enums';

/** WHS uses the 20 most recent qualifying rounds. */
const WHS_RECENT_ROUNDS = 20;

/**
 * Rows fetched before the client belts (shared-ball, completeness) run.
 * The belts filter after the query, so fetching only 20 would let recent
 * part-filled cards crowd complete ones out of the window — and an empty
 * window would clear a valid index.
 */
const BELT_FETCH_LIMIT = 60;

/**
 * No qualifying differential remains (e.g. the player's only differentials
 * were part-filled cards, nulled by the R21 data fix): the calculated index
 * must not outlive its rounds. players.handicap_index is purely computed
 * (only this service writes it); NULL is the state a new player starts in.
 * Only a row that still holds an index is touched, so the common case (a
 * player with no rounds, every Home load) costs no write and no invalidation.
 */
async function clearHandicapIndex(playerId: string): Promise<void> {
  const { data, error } = await (supabase.from('players') as unknown as {
    update: (values: Record<string, unknown>) => {
      eq: (column: string, value: string) => {
        not: (column: string, operator: string, value: null) => {
          select: (columns: string) => Promise<{ data: { id: string }[] | null; error: PostgrestError | null }>;
        };
      };
    };
  })
    .update({ handicap_index: null, handicap_index_updated_at: new Date().toISOString() })
    .eq('id', playerId)
    .not('handicap_index', 'is', null)
    .select('id');

  if (error) {
    syncLogger.warn('Failed to clear stale player handicap index', {
      playerId: playerId.substring(0, 8) + '...',
      error: error.message,
    });
    return;
  }
  if (!data || data.length === 0) return;

  syncLogger.info('Player handicap index cleared (no qualifying rounds remain)', {
    playerId: playerId.substring(0, 8) + '...',
  });
  queryClient.invalidateQueries({ queryKey: ['player', playerId] });
  queryClient.invalidateQueries({ queryKey: ['players'] });
  queryClient.invalidateQueries({ queryKey: ['auth', 'user'] });
}

/**
 * Recalculate and update a player's handicap index
 *
 * This function should be called after a scorecard with a differential is successfully synced.
 * It's a fire-and-forget operation - errors are logged but don't fail the caller.
 *
 * Steps:
 * 1. Fetch last 20 completed scorecards with differentials for this player
 * 2. Extract differentials and calculate new handicap index
 * 3. Update the player's handicap_index and handicap_index_updated_at
 * 4. Invalidate relevant caches
 *
 * @param playerId - UUID of the player to update
 */
export async function updatePlayerHandicapIndex(playerId: string): Promise<void> {
  syncLogger.debug('Updating player handicap index', {
    playerId: playerId.substring(0, 8) + '...',
  });

  try {
    // Step 1: Fetch last 20 18-hole differentials.
    // Only 18-hole rounds (nine_type = 'full') count toward the WHS Social
    // Handicap Index — 9-hole rounds are excluded unless they've been
    // combined via handicap_combined_rounds.
    const { data: scorecards, error: fetchError } = await supabase
      .from('scorecards')
      .select(
        'handicap_differential, submitted_at, scores, rounds!inner(nine_type, game_type, team_format, holes_played)',
      )
      .eq('player_id', playerId)
      .in('status', ['completed', 'confirmed'])
      .not('handicap_differential', 'is', null)
      .is('rounds.deleted_at', null)
      .eq('rounds.nine_type', 'full')
      // Belt: an early-ended round never counts toward the index (I12, R13).
      .is('rounds.holes_played', null)
      .order('submitted_at', { ascending: false })
      .limit(BELT_FETCH_LIMIT) as unknown as {
        data: {
          handicap_differential: number | null;
          submitted_at: string | null;
          /** Hole-by-hole scores — the completeness belt (I12) reads them. */
          scores: Record<string, unknown> | null;
          rounds: {
            nine_type: NineType | null;
            game_type: string | null;
            team_format: string | null;
            holes_played: number | null;
          } | null;
        }[] | null;
        error: PostgrestError | null;
      };

    // Step 1b: Fetch combined-round differentials. Each combined round
    // represents a user-paired front9 + back9 played on the same course
    // and counts as a single 18-hole entry.
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: combinedRows, error: combinedError } = await ((supabase as any)
      .from('handicap_combined_rounds')
      .select('handicap_differential, effective_date')
      .eq('player_id', playerId)
      .order('effective_date', { ascending: false })
      .limit(20)) as { data: { handicap_differential: number; effective_date: string }[] | null; error: PostgrestError | null };

    if (combinedError) {
      syncLogger.warn('Failed to fetch combined rounds for handicap index', {
        playerId: playerId.substring(0, 8) + '...',
        error: combinedError.message,
      });
    }

    if (fetchError) {
      syncLogger.warn('Failed to fetch scorecards for handicap index calculation', {
        playerId: playerId.substring(0, 8) + '...',
        error: fetchError.message,
      });
      return;
    }

    const haveScorecards = scorecards && scorecards.length > 0;
    const haveCombined = combinedRows && combinedRows.length > 0;
    if (!haveScorecards && !haveCombined) {
      syncLogger.debug('No qualifying rounds found', {
        playerId: playerId.substring(0, 8) + '...',
      });
      // A failed combined-rounds read is not "no rounds": keep the index.
      if (!combinedError) await clearHandicapIndex(playerId);
      return;
    }

    // Step 2: Merge 18-hole + combined differentials by effective date and
    // keep the 20 most recent for the WHS calculation.
    type DiffEntry = { differential: number; date: string };
    const entries: DiffEntry[] = [];
    if (haveScorecards) {
      const cardEntries: DiffEntry[] = [];
      for (const sc of scorecards!) {
        // Defense-in-depth: never let a shared-ball team round (scramble,
        // alt-shot) influence the index even if a stale differential survived
        // the backfill. The canonical guard is the null differential written
        // at sync time; this is a backstop.
        if (isSharedBallRound(sc.rounds ?? {})) continue;
        // Only full scorecards count (I12, R21): a part-filled card that still
        // carries a stored differential (old client, or data from before the
        // server trigger) is skipped. Legacy cards without hole data count.
        if (!isCompleteForHandicap(sc.scores, sc.rounds?.nine_type ?? 'full')) continue;
        // Same backstop for an early-ended round (the card gate and the server
        // trigger already null its differential).
        if (isEndedEarly(sc.rounds)) continue;
        if (sc.handicap_differential != null) {
          cardEntries.push({
            differential: sc.handicap_differential,
            date: sc.submitted_at ?? '',
          });
        }
      }
      // The fetch is newest first: keep the 20 most recent qualifying cards.
      entries.push(...cardEntries.slice(0, WHS_RECENT_ROUNDS));
    }
    if (haveCombined) {
      for (const row of combinedRows!) {
        entries.push({
          differential: row.handicap_differential,
          date: row.effective_date,
        });
      }
    }
    entries.sort((a, b) => (a.date < b.date ? 1 : a.date > b.date ? -1 : 0));
    const differentials = entries.slice(0, WHS_RECENT_ROUNDS).map((e) => e.differential);

    const newHandicapIndex = calculateHandicapIndex(differentials);

    if (newHandicapIndex === null) {
      // Every row was skipped by a belt (shared-ball / incomplete card).
      syncLogger.debug('Could not calculate handicap index (no valid differentials)', {
        playerId: playerId.substring(0, 8) + '...',
      });
      // A full over-fetch that held nothing qualifying may hide older
      // qualifying cards beyond it: keep the stored index rather than wipe a
      // valid one. Only an exhaustive fetch proves nothing qualifies.
      const fetchWasExhaustive = (scorecards?.length ?? 0) < BELT_FETCH_LIMIT;
      if (!combinedError && fetchWasExhaustive) await clearHandicapIndex(playerId);
      return;
    }

    syncLogger.debug('Calculated new handicap index', {
      playerId: playerId.substring(0, 8) + '...',
      newIndex: newHandicapIndex,
      roundsUsed: differentials.length,
    });

    // Step 3: Update the player's handicap_index
    const { error: updateError } = await (supabase.from('players') as unknown as { update: (values: Record<string, unknown>) => { eq: (column: string, value: string) => Promise<{ error: PostgrestError | null }> } })
      .update({
        handicap_index: newHandicapIndex,
        handicap_index_updated_at: new Date().toISOString(),
      })
      .eq('id', playerId);

    if (updateError) {
      syncLogger.warn('Failed to update player handicap index', {
        playerId: playerId.substring(0, 8) + '...',
        error: updateError.message,
      });
      return;
    }

    syncLogger.info('Player handicap index updated successfully', {
      playerId: playerId.substring(0, 8) + '...',
      handicapIndex: newHandicapIndex,
      basedOnRounds: differentials.length,
    });

    // Step 4: Invalidate player profile caches so UI reflects new handicap_index
    queryClient.invalidateQueries({ queryKey: ['player', playerId] });
    queryClient.invalidateQueries({ queryKey: ['players'] });
    queryClient.invalidateQueries({ queryKey: ['auth', 'user'] });

  } catch (error) {
    // Log but don't throw - this is a non-critical operation
    syncLogger.warn('Unexpected error updating player handicap index', {
      playerId: playerId.substring(0, 8) + '...',
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
}
