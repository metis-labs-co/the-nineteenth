import { supabase } from '@/services/supabase/client';
import type { Scorecard } from '@/types/database/scorecard.types';

/** Fetch terminal scorecards whose derived round data is safe to consume. */
export async function fetchFinishedScorecardsForRound(roundId: string): Promise<Scorecard[]> {
  const { data, error } = await supabase
    .from('scorecards')
    .select('*')
    .eq('round_id', roundId)
    .in('status', ['completed', 'confirmed']);

  if (error) {
    throw new Error(`Failed to fetch scorecards for round ${roundId}: ${error.message}`);
  }

  return (data ?? []) as Scorecard[];
}
