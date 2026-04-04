/**
 * Data mutation functions for EditRoundScreen
 */

import { supabase } from '@/services/supabase/client';
import type { GameType, TeeBox } from '@/types/database.types';

/**
 * Update round data
 */
export async function updateRound(
  roundId: string,
  updates: {
    date?: string;
    tee_time?: string | null;
    game_type?: GameType;
    selected_tee?: TeeBox | null;
    scoring_pairs_required?: boolean;
    course_id?: string | null;
  }
): Promise<void> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Supabase generated types restriction workaround
  const { error } = await (supabase as any)
    .from('rounds')
    .update(updates)
    .eq('id', roundId);

  if (error) {
    throw new Error(`Failed to update round: ${error.message}`);
  }
}

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
