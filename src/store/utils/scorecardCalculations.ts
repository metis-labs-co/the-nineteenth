/**
 * Pure calculation functions for the scorecard store.
 * Extracted for testability and reuse.
 */

import type { Scorecard, Hole, GameType } from '@/types';
import { isSingleBallScore } from '@/types/database/base';
import { calculateStablefordPoints, calculateNetScore, calculateParScore, getStrokesOnHole } from '@/utils/scoring';
import { PICKUP_SCORE } from '@/constants/scoring';

/**
 * Calculate player totals based on game type
 */
export function calculatePlayerTotals(
  scorecard: Scorecard,
  holes: Hole[],
  gameType: GameType
): { gross: number; net: number; points: number; parScore: number } {
  const playerHandicap = scorecard.player?.handicap || 0;

  let totalGross = 0;
  let totalNet = 0;
  let totalPoints = 0;
  let totalParScore = 0;

  for (const hole of holes) {
    const rawHoleScore = scorecard.scores[hole.number];
    if (!rawHoleScore) continue;

    // Get strokes based on score type
    const strokes = isSingleBallScore(rawHoleScore)
      ? rawHoleScore.strokes
      : rawHoleScore.balls?.[0]?.strokes; // Use first ball for multi-ball

    if (!strokes || strokes <= 0 || strokes === PICKUP_SCORE) continue;

    totalGross += strokes;

    if (gameType === 'stableford') {
      totalPoints += calculateStablefordPoints(strokes, playerHandicap, hole);
      totalNet = totalPoints; // For stableford, net = points
    } else if (gameType === 'stroke') {
      totalNet += calculateNetScore(strokes, playerHandicap, hole);
    } else if (gameType === 'par') {
      const strokesReceived = getStrokesOnHole(playerHandicap, hole);
      totalParScore += calculateParScore(strokes, hole.par, strokesReceived);
      totalNet += calculateNetScore(strokes, playerHandicap, hole);
    }
  }

  return { gross: totalGross, net: totalNet, points: totalPoints, parScore: totalParScore };
}

/** Validate UUID v4 format */
export function isValidUUID(str: string): boolean {
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  return uuidRegex.test(str);
}
