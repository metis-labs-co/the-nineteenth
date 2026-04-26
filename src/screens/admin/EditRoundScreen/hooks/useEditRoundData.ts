/**
 * Data mutation functions for EditRoundScreen
 *
 * `updateRound` lives in the shared services layer (`@/services/rounds`) so
 * every "edit one field" sheet imports from the same place. Re-exported here
 * for back-compat with the existing call sites that still import via this
 * module.
 */

import { supabase } from '@/services/supabase/client';

export { updateRound, type UpdateRoundFields } from '@/services/rounds/updateRound';

/**
 * Shuffle/clear scoring pairs for a round
 */
export async function shuffleScoringPairs(roundId: string): Promise<void> {
  // Delete existing scoring pairs
  const { error: deleteError } = await supabase
    .from('scoring_pairs')
    .delete()
    .eq('round_id', roundId);

  if (deleteError) {
    throw new Error(`Failed to shuffle scoring pairs: ${deleteError.message}`);
  }
}
