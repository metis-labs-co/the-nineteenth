/**
 * Data fetching hooks for EditRoundScreen
 */

import { supabase } from '@/services/supabase/client';
import type { GameType, TeeBox, Tee } from '@/types/database.types';
import type { RoundWithCourse } from '../types';

/**
 * Transform Tee (from tees table) to TeeBox (legacy JSONB format)
 */
function teeToTeeBox(tee: Tee): TeeBox {
  return {
    name: tee.name,
    color: tee.color ?? tee.name.toLowerCase(),
    totalYardage: tee.total_length ?? null,
    courseRating: tee.course_rating ?? undefined,
    slopeRating: tee.slope ?? undefined,
  };
}

/**
 * Fetch round with course data including tees from normalized table
 */
export async function fetchRoundWithCourse(roundId: string): Promise<RoundWithCourse> {
  const { data, error } = await supabase
    .from('rounds')
    .select(`
      *,
      courses (
        *,
        tees_from_table:tees (*)
      )
    `)
    .eq('id', roundId)
    .single();

  if (error) {
    throw new Error(`Failed to fetch round: ${error.message}`);
  }

  // Merge tees from table into course.tees for backward compatibility
  const round = data as RoundWithCourse & {
    courses: { tees_from_table?: Tee[] | null } | null;
  };

  if (round.courses) {
    const teesFromTable = round.courses.tees_from_table ?? [];
    const legacyTees = round.courses.tees ?? [];

    // Prefer tees from table, fallback to legacy JSONB
    round.courses.tees =
      teesFromTable.length > 0 ? teesFromTable.map(teeToTeeBox) : legacyTees;

    // Clean up the temporary field
    delete (round.courses as { tees_from_table?: unknown }).tees_from_table;
  }

  return round as RoundWithCourse;
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
