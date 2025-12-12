/**
 * Data fetching hooks for EditRoundScreen
 */

import { supabase } from '@/services/supabase/client';
import type { GameType, TeeBox } from '@/types/database.types';
import type { RoundWithCourse } from '../types';

/**
 * Fetch round with course data
 */
export async function fetchRoundWithCourse(roundId: string): Promise<RoundWithCourse> {
  const { data, error } = await supabase
    .from('rounds')
    .select(`
      *,
      courses (*)
    `)
    .eq('id', roundId)
    .single();

  if (error) {
    throw new Error(`Failed to fetch round: ${error.message}`);
  }

  return data as RoundWithCourse;
}

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
  }
): Promise<void> {
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
