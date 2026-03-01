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
    // Step 1: Fetch last 20 completed scorecards with differentials
    const { data: scorecards, error: fetchError } = await supabase
      .from('scorecards')
      .select('handicap_differential')
      .eq('player_id', playerId)
      .in('status', ['completed', 'confirmed'])
      .not('handicap_differential', 'is', null)
      .order('submitted_at', { ascending: false })
      .limit(20) as unknown as { data: { handicap_differential: number | null }[] | null; error: any };

    if (fetchError) {
      syncLogger.warn('Failed to fetch scorecards for handicap index calculation', {
        playerId: playerId.substring(0, 8) + '...',
        error: fetchError.message,
      });
      return;
    }

    if (!scorecards || scorecards.length === 0) {
      syncLogger.debug('No scorecards with differentials found, skipping index update', {
        playerId: playerId.substring(0, 8) + '...',
      });
      return;
    }

    // Step 2: Extract differentials and calculate new handicap index
    const differentials = scorecards
      .map((sc) => sc.handicap_differential as number)
      .filter((d) => d !== null);

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
    const { error: updateError } = await (supabase.from('players') as any)
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
