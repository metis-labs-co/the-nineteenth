/**
 * Mismatch Resolution
 *
 * Resolves score mismatches and applies resolved scores to scorecards.
 */

import { supabase } from '@/services/supabase/client';
import type { HoleScore, Hole } from '@/types';
import type { NineType } from '@/types/database/enums';
import type { Database, ScorecardResolutionPatch } from '@/types/database/schema';
import {
  RoundScoringWriteError,
  roundScoringErrorFromSql,
} from '@/services/rounds/roundScoringErrors';
import { fetchRoundScoringShape } from '@/services/rounds/roundScoringShape';
import { getHoleRange } from '@/constants/scoring';
import { isSingleBallScore } from '@/types/database/base';
import {
  getStrokesReceived,
  calculateStablefordPointsNet,
  getEffectiveGrossStrokes,
} from '@/utils/scoring';
import { filterPlayableHoles, transformHolesIfNeeded } from '@/utils/holeTransformers';
import { calculateNetOverHolesPlayed } from '@/utils/scorecardCalculations';
import { isEndedEarly, isHoleAfterEarlyEnd, resolveRoundShape } from '@/utils/roundShape';
import { createModuleLogger } from '@/utils/debugLogger';
import { fromTable } from './types';
import { createError } from '@/services/errors';

const logger = createModuleLogger('ScoreMismatchService');
type ResolutionRpc = Database['public']['Functions']['write_scorecard_resolution'];
type ResolutionWrite = (
  name: 'write_scorecard_resolution',
  args: ResolutionRpc['Args']
) => PromiseLike<{
  data: ResolutionRpc['Returns'] | null;
  error: { code?: string; hint?: string; message: string } | null;
}>;

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

  const { error } = (await fromTable('score_mismatches')
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
 *
 * Only the round's played holes accept corrections. Totals cover the same
 * holes, including the cutoff when the round ended early.
 * @returns true after a successful write; false for an out-of-play hole or
 *   missing/RLS-hidden card. Failed reads remain errors, never absence.
 *   Callers must mirror the correction locally only when true.
 */
export async function applyResolvedScoreToScorecard(
  roundId: string,
  playerId: string,
  holeNumber: number,
  resolvedScore: number
): Promise<boolean> {
  if (!roundId || !playerId) {
    throw createError('Round ID and Player ID are required', 'VALIDATION');
  }

  // Fetch the scorecard along with the round's game type, shape and course holes
  // so we can recompute totals in a single round trip.
  interface ScorecardFetchRow {
    id: string;
    scores: Record<string, HoleScore> | null;
    daily_handicap_used: number | null;
    round: {
      game_type: string | null;
      nine_type: NineType | null;
      holes_played: number | null;
      // Raw course JSONB may use camelCase or snake_case keys.
      courses: { holes: unknown[] | null } | null;
    } | null;
  }

  let retryingShape = false;
  for (;;) {
    const { data: scorecard, error: fetchError } = (await supabase
      .from('scorecards')
      .select(
        'id, scores, daily_handicap_used, round:rounds(game_type, nine_type, holes_played, courses(holes))'
      )
      .eq('round_id', roundId)
      .eq('player_id', playerId)
      .maybeSingle()) as unknown as {
      data: ScorecardFetchRow | null;
      error: { message: string } | null;
    };

    if (fetchError) {
      logger.error('Failed to fetch scorecard', fetchError);
      throw createError(`Failed to fetch scorecard: ${fetchError.message}`, 'DATABASE');
    }

    if (!scorecard) return false;
    if (!scorecard.round)
      throw new RoundScoringWriteError('unavailable', roundId, 'Round scoring shape unavailable');

    const resolved = resolveRoundShape(scorecard.round);
    const shape = retryingShape
      ? await fetchRoundScoringShape(roundId)
      : { nine_type: resolved.nineType, holes_played: resolved.holesPlayed };
    const { nine_type: nineType, holes_played: holesPlayed } = shape;
    const holes = transformHolesIfNeeded(scorecard.round?.courses?.holes ?? []);
    const playableHoles = filterPlayableHoles(holes, nineType, holesPlayed);
    const range = getHoleRange(nineType);
    // Without metadata, enforce both the planned nine and the early-end cutoff.
    const isPlayableHole =
      holes.length > 0
        ? playableHoles.some((hole) => hole.number === holeNumber)
        : Number.isInteger(holeNumber) &&
          holeNumber >= range.start &&
          holeNumber <= range.end &&
          !isHoleAfterEarlyEnd(nineType, holesPlayed, holeNumber);
    if (!isPlayableHole) {
      logger.warn('Ignoring resolved score for a hole the round did not play', {
        roundId: roundId.substring(0, 8) + '...',
        holeNumber,
        nineType,
        holesPlayed,
      });
      return false;
    }

    // Update the specific hole score
    // Match the server guard's numeric-key distinction. Non-hole JSON is opaque
    // metadata; never discard it by parsing a numeric prefix (e.g. "12-note").
    const scores: Record<string, HoleScore> = Object.fromEntries(
      Object.entries(scorecard.scores ?? {}).filter(([key]) => {
        if (!/^[0-9]+$/.test(key)) return true;
        const number = Number(key);
        return (
          number >= range.start &&
          number <= range.end &&
          !isHoleAfterEarlyEnd(nineType, holesPlayed, number)
        );
      })
    );
    const holeKey = holeNumber.toString();

    if (scores[holeKey]) {
      scores[holeKey] = { ...scores[holeKey], strokes: resolvedScore } as HoleScore;
    } else {
      scores[holeKey] = { strokes: resolvedScore } as HoleScore;
    }

    // Recompute totals from the updated scores JSON. This is the single
    // source-of-truth path — matches calculatePlayerStats in the scorecard view.
    const gameType = scorecard.round?.game_type ?? null;
    const dhc = scorecard.daily_handicap_used;

    const totals = recomputeScorecardTotals(scores, holes, gameType, dhc, {
      holesPlayed,
      nineType,
    });

    const updatePayload: ScorecardResolutionPatch = {
      expected_round_shape: shape,
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

    // The installed client's generic schema resolves RPC arguments to never.
    // Limit the assertion to C3's exact wire contract, retaining the RPC receiver.
    const { data: applied, error: updateError } = await (
      supabase.rpc as unknown as ResolutionWrite
    )('write_scorecard_resolution', { p_scorecard_id: scorecard.id, p_patch: updatePayload });

    if (updateError) {
      const guard = roundScoringErrorFromSql(roundId, updateError);
      if (guard) {
        if (!retryingShape && guard.kind === 'shape_changed') {
          // Retain only the correction intent. Refetch card and authorized shape
          // on the next attempt, then filter/recalculate from CURRENT data.
          retryingShape = true;
          continue;
        }
        throw guard;
      }
      logger.error('Failed to update scorecard', updateError);
      throw createError(`Failed to update scorecard: ${updateError.message}`, 'DATABASE');
    }

    if (typeof applied !== 'boolean')
      throw new RoundScoringWriteError('unavailable', roundId, 'Resolution response unavailable');
    return applied;
  }
}

/**
 * Recompute stored totals from a scores JSON object. Mirrors the logic in
 * `calculatePlayerStats` (scorecard view) and the sync pipeline so all three
 * writers agree on total_gross / total_net / total_points.
 *
 * With options, totals cover the round's planned nine and played cutoff.
 * Without options, all supplied holes count (unchanged for force-finalization).
 * Missing hole metadata retains raw gross / gross-minus-DHC fallback, with
 * out-of-play keys excluded when options specify the round shape.
 *
 * - `totalGross`: sum of single-ball strokes across scored holes, with a pickup
 *   counted as net double bogey (I3) when hole data is available
 * - `totalNet`: `totalGross - daily_handicap_used` when DHC is present, else null;
 *   a valid early end with hole metadata uses per-hole net instead.
 * - `totalPoints`: stableford per-hole sum (only when game_type === 'stableford'
 *   and holes + DHC are available), else null
 */
export function recomputeScorecardTotals(
  scores: Record<string, HoleScore>,
  holes: Hole[],
  gameType: string | null,
  dhc: number | null,
  options?: { holesPlayed?: number | null; nineType?: NineType | null }
): { totalGross: number; totalNet: number | null; totalPoints: number | null } {
  let totalGross = 0;
  let totalPoints = 0;

  const holesPlayed = options?.holesPlayed ?? null;
  const nineType = options?.nineType ?? 'full';
  const allHoles = Array.isArray(holes) ? holes : [];
  const holeList = options ? filterPlayableHoles(allHoles, nineType, holesPlayed) : allHoles;
  const singleBallScores: Record<string, HoleScore> = {};
  const canComputePoints = gameType === 'stableford' && dhc != null && holeList.length > 0;

  if (allHoles.length > 0) {
    for (const hole of holeList) {
      const score = scores[String(hole.number)];
      if (!score || !isSingleBallScore(score) || !score.strokes || score.strokes <= 0) {
        continue;
      }
      const strokesReceived = dhc != null ? getStrokesReceived(dhc, hole.strokeIndex) : 0;
      // A pickup counts as net double bogey, matching the store's totals.
      const strokes = getEffectiveGrossStrokes(score.strokes, hole.par, strokesReceived);
      if (strokes == null) continue;
      totalGross += strokes;
      // This writer has always counted single-ball scores only. Feed the same
      // supported entries to the shared helper, which also accepts multi-ball.
      singleBallScores[String(hole.number)] = score;
      if (canComputePoints) {
        totalPoints += calculateStablefordPointsNet(strokes, hole.par, strokesReceived);
      }
    }
  } else {
    // No hole metadata available — fall back to summing whatever single-ball
    // scores exist. This keeps total_gross fresh even when the join fails;
    // total_points can't be recomputed without holes.
    const range = getHoleRange(nineType);
    for (const key of Object.keys(scores)) {
      if (options) {
        const number = Number(key);
        if (
          !Number.isInteger(number) ||
          number < range.start ||
          number > range.end ||
          isHoleAfterEarlyEnd(nineType, holesPlayed, number)
        )
          continue;
      }
      const score = scores[key];
      if (!score || !isSingleBallScore(score) || !score.strokes || score.strokes <= 0) {
        continue;
      }
      totalGross += score.strokes;
    }
  }

  const endedEarly = isEndedEarly({ holes_played: holesPlayed }) && holeList.length > 0;
  const totalNet =
    dhc == null
      ? null
      : endedEarly
        ? calculateNetOverHolesPlayed(singleBallScores, holeList, dhc)
        : totalGross - dhc;

  return {
    totalGross,
    totalNet,
    totalPoints: canComputePoints ? totalPoints : null,
  };
}
