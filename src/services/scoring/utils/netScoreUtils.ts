/**
 * Net Score Utilities
 *
 * Functions for calculating net scores with handicap adjustments.
 */

import type { HoleScore, Hole } from '../types';
import {
  calculateNetScoreFromStrokes,
  getStrokesReceived,
} from '@/utils/scoring';

// Re-export for backward compatibility within this module
const calculateStrokesForHole = getStrokesReceived;

/**
 * Calculate net score for a hole (gross - strokes received)
 *
 * @deprecated Use calculateNetScoreFromStrokes from '@/utils/scoring' directly.
 * This is kept as an alias for backward compatibility.
 *
 * @param grossScore - The player's gross score on the hole
 * @param strokesReceived - Number of strokes received on this hole
 * @returns Net score for the hole
 */
export const calculateNetScore = calculateNetScoreFromStrokes;

/**
 * Calculate net score relative to par for a hole
 *
 * @param netScore - The player's net score
 * @param par - The hole's par
 * @returns Score relative to par (negative is under par)
 */
export function getNetToPar(netScore: number, par: number): number {
  return netScore - par;
}

/**
 * Calculate total net score for a round
 *
 * @param scores - Array of hole scores with gross scores
 * @param holes - Array of course holes with stroke indexes
 * @param playingHandicap - Player's playing handicap
 * @returns Total net score for the round
 */
export function calculateTotalNetScore(
  scores: HoleScore[],
  holes: Hole[],
  playingHandicap: number
): number {
  let totalNet = 0;

  // Create a map for quick hole lookup
  const holeMap = new Map(holes.map((h) => [h.number, h]));

  for (const score of scores) {
    const hole = holeMap.get(score.holeNumber);
    if (!hole || score.strokes === null || score.strokes === undefined) {
      continue;
    }

    const strokesReceived = calculateStrokesForHole(
      playingHandicap,
      hole.strokeIndex
    );
    const netScore = calculateNetScore(score.strokes, strokesReceived);
    totalNet += netScore;
  }

  return totalNet;
}

/**
 * Calculate total gross score for a round
 *
 * @param scores - Array of hole scores
 * @returns Total gross score
 */
export function calculateTotalGrossScore(scores: HoleScore[]): number {
  return scores.reduce((total, score) => {
    return total + (score.strokes ?? 0);
  }, 0);
}

/**
 * Get hole-by-hole breakdown of net scores
 *
 * @param scores - Array of hole scores
 * @param holes - Array of course holes
 * @param playingHandicap - Player's playing handicap
 * @returns Array of objects with hole number, gross, net, and strokes received
 */
export function getHoleByHoleNetScores(
  scores: HoleScore[],
  holes: Hole[],
  playingHandicap: number
): {
  holeNumber: number;
  gross: number;
  net: number;
  strokesReceived: number;
  par: number;
  netToPar: number;
}[] {
  const holeMap = new Map(holes.map((h) => [h.number, h]));
  const results: ReturnType<typeof getHoleByHoleNetScores> = [];

  for (const score of scores) {
    const hole = holeMap.get(score.holeNumber);
    if (!hole || score.strokes === null || score.strokes === undefined) {
      continue;
    }

    const strokesReceived = calculateStrokesForHole(
      playingHandicap,
      hole.strokeIndex
    );
    const net = calculateNetScore(score.strokes, strokesReceived);

    results.push({
      holeNumber: score.holeNumber,
      gross: score.strokes,
      net,
      strokesReceived,
      par: hole.par,
      netToPar: getNetToPar(net, hole.par),
    });
  }

  // Sort by hole number
  results.sort((a, b) => a.holeNumber - b.holeNumber);

  return results;
}
