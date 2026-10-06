/**
 * Pure calculation functions for the scorecard store.
 * Extracted for testability and reuse.
 */

import type { Scorecard, Hole, GameType, TeeBox } from '@/types';
import type { HandicapSource } from '@/types/database';
import { isSingleBallScore } from '@/types/database/base';
import {
  getStrokesReceived,
  calculateStablefordPointsNet,
  calculateParScore,
  getEffectiveGrossStrokes,
} from '@/utils/scoring';
import { calculateGADailyHandicap } from '@/utils/dailyHandicap';
import { getBaseHandicap } from '@/utils/scorecardCalculations';

/**
 * Optional round-level context used to compute the correct WHS daily
 * handicap for stableford / par / stroke calculations. When provided,
 * the store uses the same DHC formula as the sync pipeline and the
 * scorecard view, so live totals match the stored snapshot.
 */
export interface PlayerTotalsContext {
  /** The tee the player is using (honours per-player override). */
  selectedTee?: TeeBox | null;
  /** Whether to read profile HC, social HC, or no HC for the player. */
  handicapSource?: HandicapSource;
}

/**
 * Calculate player totals based on game type.
 *
 * When `context.selectedTee` is provided AND has valid slope/course
 * ratings, the WHS Daily Handicap is computed via
 * `calculateGADailyHandicap` and used for strokes received. Otherwise
 * the function falls back to the player's raw profile handicap, which
 * preserves behaviour for legacy callers that don't pass context.
 */
export function calculatePlayerTotals(
  scorecard: Scorecard,
  holes: Hole[],
  gameType: GameType,
  context?: PlayerTotalsContext
): { gross: number; net: number; points: number; parScore: number } {
  // Resolve the effective handicap for scoring. Prefer WHS DHC from the
  // selected tee (via calculateGADailyHandicap) so totals match the sync
  // pipeline and the scorecard view. Fall back to the raw profile HC only
  // when tee data or course par isn't available.
  const rawHandicap = getBaseHandicap(
    scorecard.player
      ? {
          id: scorecard.player.id,
          name: scorecard.player.name,
          handicap: scorecard.player.handicap ?? null,
          handicap_index: scorecard.player.handicapIndex ?? null,
          gender: scorecard.player.gender ?? null,
        }
      : null,
    context?.handicapSource ?? 'profile'
  );

  const coursePar = holes.reduce((sum, h) => sum + (h.par || 0), 0);

  let effectiveHandicap = rawHandicap;
  if (
    context?.handicapSource !== 'none' &&
    context?.selectedTee?.slopeRating &&
    context?.selectedTee?.courseRating &&
    coursePar > 0
  ) {
    const result = calculateGADailyHandicap({
      gaHandicap: rawHandicap,
      slopeRating: context.selectedTee.slopeRating,
      courseRating: context.selectedTee.courseRating,
      par: coursePar,
      gender: scorecard.player?.gender ?? null,
    });
    effectiveHandicap = result.dailyHandicap;
  }

  let totalGross = 0;
  let totalNet = 0;
  let totalPoints = 0;
  let totalParScore = 0;

  for (const hole of holes) {
    const rawHoleScore = scorecard.scores[hole.number];
    if (!rawHoleScore) continue;

    // Get strokes based on score type
    const rawStrokes = isSingleBallScore(rawHoleScore)
      ? rawHoleScore.strokes
      : rawHoleScore.balls?.[0]?.strokes; // Use first ball for multi-ball

    if (!rawStrokes || rawStrokes <= 0) continue;

    const strokesReceived = getStrokesReceived(effectiveHandicap, hole.strokeIndex);

    // Pickups (>= PICKUP_SCORE) score net double bogey for handicap purposes
    // (WHS "most likely score"), rather than being dropped from the total.
    // Completed holes use their actual strokes. This keeps the stored gross /
    // net / differential consistent with the scorecard view.
    const strokes = getEffectiveGrossStrokes(rawStrokes, hole.par, strokesReceived);
    if (strokes == null) continue;

    totalGross += strokes;

    const netStrokes = strokes - strokesReceived;

    if (gameType === 'stableford') {
      totalPoints += calculateStablefordPointsNet(strokes, hole.par, strokesReceived);
      totalNet = totalPoints; // For stableford, the store overloads net=points
    } else if (gameType === 'stroke') {
      totalNet += netStrokes;
    } else if (gameType === 'par') {
      totalParScore += calculateParScore(strokes, hole.par, strokesReceived);
      totalNet += netStrokes;
    }
  }

  return { gross: totalGross, net: totalNet, points: totalPoints, parScore: totalParScore };
}

/** Validate UUID v4 format */
export function isValidUUID(str: string): boolean {
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  return uuidRegex.test(str);
}
