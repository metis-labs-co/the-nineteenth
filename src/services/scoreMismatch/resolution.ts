/**
 * Mismatch Resolution
 *
 * Resolves score mismatches and applies resolved scores to scorecards.
 */

import { supabase } from '@/services/supabase/client';
import type { HoleScore } from '@/types';
import { createModuleLogger } from '@/utils/debugLogger';
import { fromTable, createError } from './types';

const logger = createModuleLogger('ScoreMismatchService');

// ============================================================================
// RESOLUTION
// ============================================================================

/**
 * Resolve a mismatch (first-write-wins)
 *
 * @param mismatchId - Mismatch UUID
 * @param resolvedScore - The agreed-upon score
 * @param resolvedBy - Player UUID who resolved it
 */
export async function resolveMismatch(
  mismatchId: string,
  resolvedScore: number,
  resolvedBy: string
): Promise<void> {
  if (!mismatchId || !resolvedBy) {
    throw createError('Mismatch ID and Resolver ID are required', 'VALIDATION');
  }

  const { error } = await (fromTable('score_mismatches')
    .update({
      status: 'resolved',
      resolved_score: resolvedScore,
      resolved_by: resolvedBy,
      resolved_at: new Date().toISOString(),
    })
    .eq('id', mismatchId)
    .eq('status', 'pending')) as { error: { message: string } | null }; // Only update if still pending (first-write-wins)

  if (error) {
    logger.error('Failed to resolve mismatch', error);
    throw createError(`Failed to resolve mismatch: ${error.message}`, 'DATABASE');
  }
}

/**
 * Apply resolved score to the actual scorecard (hole_scores in scorecards table)
 *
 * This updates the final scorecard's JSONB scores field with the resolved value.
 */
export async function applyResolvedScoreToScorecard(
  roundId: string,
  playerId: string,
  holeNumber: number,
  resolvedScore: number
): Promise<void> {
  if (!roundId || !playerId) {
    throw createError('Round ID and Player ID are required', 'VALIDATION');
  }

  // Fetch the current scorecard
  const { data: scorecard, error: fetchError } = await supabase
    .from('scorecards')
    .select('id, scores')
    .eq('round_id', roundId)
    .eq('player_id', playerId)
    .single() as { data: { id: string; scores: Record<string, HoleScore> } | null; error: { message: string } | null };

  if (fetchError) {
    logger.error('Failed to fetch scorecard', fetchError);
    throw createError(`Failed to fetch scorecard: ${fetchError.message}`, 'DATABASE');
  }

  if (!scorecard) {
    throw createError('Scorecard not found', 'NOT_FOUND');
  }

  // Update the specific hole score
  const scores = scorecard.scores || {};
  const holeKey = holeNumber.toString();

  if (scores[holeKey]) {
    scores[holeKey].strokes = resolvedScore;
  } else {
    scores[holeKey] = { strokes: resolvedScore };
  }

  // Save back to scorecard
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { error: updateError } = await (supabase.from('scorecards') as any)
    .update({ scores, updated_at: new Date().toISOString() })
    .eq('id', scorecard.id);

  if (updateError) {
    logger.error('Failed to update scorecard', updateError);
    throw createError(`Failed to update scorecard: ${updateError.message}`, 'DATABASE');
  }
}
