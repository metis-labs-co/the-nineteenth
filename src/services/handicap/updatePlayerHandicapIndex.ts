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
import { syncLogger } from '@/utils/debugLogger';

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
      .select('handicap_differential, submitted_at, rounds!inner(nine_type)')
      .eq('player_id', playerId)
      .in('status', ['completed', 'confirmed'])
      .not('handicap_differential', 'is', null)
      .eq('rounds.nine_type', 'full')
      .order('submitted_at', { ascending: false })
      .limit(20) as unknown as {
        data: { handicap_differential: number | null; submitted_at: string | null }[] | null;
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
      syncLogger.debug('No qualifying rounds found, skipping index update', {
        playerId: playerId.substring(0, 8) + '...',
      });
      return;
    }

    // Step 2: Merge 18-hole + combined differentials by effective date and
    // keep the 20 most recent for the WHS calculation.
    type DiffEntry = { differential: number; date: string };
    const entries: DiffEntry[] = [];
    if (haveScorecards) {
      for (const sc of scorecards!) {
        if (sc.handicap_differential != null) {
          entries.push({
            differential: sc.handicap_differential,
            date: sc.submitted_at ?? '',
          });
        }
      }
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
    const differentials = entries.slice(0, 20).map((e) => e.differential);

    const newHandicapIndex = calculateHandicapIndex(differentials);

    if (newHandicapIndex === null) {
      syncLogger.debug('Could not calculate handicap index (no valid differentials)', {
        playerId: playerId.substring(0, 8) + '...',
      });
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
