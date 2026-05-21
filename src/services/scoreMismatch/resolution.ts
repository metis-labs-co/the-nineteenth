/**
 * Mismatch Resolution
 *
 * Resolves score mismatches and applies resolved scores to scorecards.
 */

import { supabase } from '@/services/supabase/client';
import type { HoleScore, Hole } from '@/types';
import { isSingleBallScore } from '@/types/database/base';
import {
  getStrokesReceived,
  calculateStablefordPointsNet,
} from '@/utils/scoring';
import { createModuleLogger } from '@/utils/debugLogger';
import { fromTable } from './types';
import { createError } from '@/services/errors';

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
 * Apply resolved score to the actual scorecard (hole_scores in scorecards table).
 *
 * Updates the scorecard's JSONB scores field with the resolved value AND
 * recomputes total_gross, total_net, and total_points so downstream views
 * (round list, leaderboards, stats) stay consistent with the scorecard view
 * which live-sums from the scores JSON. Without this, the stored totals
 * drift from reality every time a mismatch is resolved or bypassed.
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

  // Fetch the scorecard along with the round's game type and course holes
  // so we can recompute totals in a single round trip.
  interface ScorecardFetchRow {
    id: string;
    scores: Record<string, HoleScore> | null;
    daily_handicap_used: number | null;
    round: {
      game_type: string | null;
      courses: { holes: Hole[] | null } | null;
    } | null;
  }

  const { data: scorecard, error: fetchError } = (await supabase
    .from('scorecards')
    .select(
      'id, scores, daily_handicap_used, round:rounds(game_type, courses(holes))'
    )
    .eq('round_id', roundId)
    .eq('player_id', playerId)
    .single()) as unknown as {
    data: ScorecardFetchRow | null;
    error: { message: string } | null;
  };

  if (fetchError) {
    logger.error('Failed to fetch scorecard', fetchError);
    throw createError(`Failed to fetch scorecard: ${fetchError.message}`, 'DATABASE');
  }

  if (!scorecard) {
    throw createError('Scorecard not found', 'NOT_FOUND');
  }

  // Update the specific hole score
  const scores: Record<string, HoleScore> = scorecard.scores || {};
  const holeKey = holeNumber.toString();

  if (scores[holeKey]) {
    (scores[holeKey] as { strokes: number }).strokes = resolvedScore;
  } else {
    scores[holeKey] = { strokes: resolvedScore } as HoleScore;
  }

  // Recompute totals from the updated scores JSON. This is the single
  // source-of-truth path — matches calculatePlayerStats in the scorecard view.
  const holes = scorecard.round?.courses?.holes ?? [];
  const gameType = scorecard.round?.game_type ?? null;
  const dhc = scorecard.daily_handicap_used;

  const totals = recomputeScorecardTotals(scores, holes, gameType, dhc);

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const updatePayload: Record<string, any> = {
    scores,
    total_gross: totals.totalGross,
    updated_at: new Date().toISOString(),
  };
  if (totals.totalNet != null) {
    updatePayload.total_net = totals.totalNet;
  }
  if (totals.totalPoints != null) {
    updatePayload.total_points = totals.totalPoints;
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { error: updateError } = await (supabase.from('scorecards') as any)
    .update(updatePayload)
    .eq('id', scorecard.id);

  if (updateError) {
    logger.error('Failed to update scorecard', updateError);
    throw createError(`Failed to update scorecard: ${updateError.message}`, 'DATABASE');
  }
}

/**
 * Recompute stored totals from a scores JSON object. Mirrors the logic in
 * `calculatePlayerStats` (scorecard view) and the sync pipeline so all three
 * writers agree on total_gross / total_net / total_points.
 *
 * - `totalGross`: sum of single-ball strokes across scored holes
 * - `totalNet`: `totalGross - daily_handicap_used` when DHC is present, else null
 * - `totalPoints`: stableford per-hole sum (only when game_type === 'stableford'
 *   and holes + DHC are available), else null
 */
function recomputeScorecardTotals(
  scores: Record<string, HoleScore>,
  holes: Hole[],
  gameType: string | null,
  dhc: number | null
): { totalGross: number; totalNet: number | null; totalPoints: number | null } {
  let totalGross = 0;
  let totalPoints = 0;

  const holeList = Array.isArray(holes) ? holes : [];
  const canComputePoints =
    gameType === 'stableford' && dhc != null && holeList.length > 0;

  if (holeList.length > 0) {
    for (const hole of holeList) {
      const score = scores[String(hole.number)];
      if (!score || !isSingleBallScore(score) || !score.strokes || score.strokes <= 0) {
        continue;
      }
      totalGross += score.strokes;
      if (canComputePoints) {
        const strokesReceived = getStrokesReceived(dhc as number, hole.strokeIndex);
        totalPoints += calculateStablefordPointsNet(
          score.strokes,
          hole.par,
          strokesReceived
        );
      }
    }
  } else {
    // No hole metadata available — fall back to summing whatever single-ball
    // scores exist. This keeps total_gross fresh even when the join fails;
    // total_points can't be recomputed without holes.
    for (const key of Object.keys(scores)) {
      const score = scores[key];
      if (!score || !isSingleBallScore(score) || !score.strokes || score.strokes <= 0) {
        continue;
      }
      totalGross += score.strokes;
    }
  }

  const totalNet = dhc != null ? totalGross - dhc : null;

  return {
    totalGross,
    totalNet,
    totalPoints: canComputePoints ? totalPoints : null,
  };
}
