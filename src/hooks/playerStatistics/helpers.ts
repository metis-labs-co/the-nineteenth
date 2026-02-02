/**
 * Player Statistics Hooks - Helper Functions
 *
 * Utility functions for calculating player statistics.
 *
 * Functions:
 * - getScoreCategory: Categorize a score relative to par
 * - countScoreDistribution: Count scores in each category
 * - calculateParTypeStats: Calculate stats for holes of a specific par
 * - calculateShortGameStats: Calculate scrambling statistics
 * - calculatePuttingDepthStats: Calculate extended putting statistics
 */

import type { Hole, HoleScore } from '@/types/database.types';
import type {
  ScoreDistribution,
  ParTypeStats,
  ShortGameStats,
  PuttingDepthStats,
} from './types';

/**
 * Calculate score relative to par and categorize
 */
export function getScoreCategory(strokes: number, par: number): keyof ScoreDistribution {
  const diff = strokes - par;
  if (diff <= -2) return 'eagles';
  if (diff === -1) return 'birdies';
  if (diff === 0) return 'pars';
  if (diff === 1) return 'bogeys';
  if (diff === 2) return 'doubleBogeys';
  return 'triplePlus';
}

/**
 * Count scores in each hole of a scorecard
 */
export function countScoreDistribution(
  scores: Record<string, HoleScore>,
  holes: Hole[]
): ScoreDistribution {
  const distribution: ScoreDistribution = {
    eagles: 0,
    birdies: 0,
    pars: 0,
    bogeys: 0,
    doubleBogeys: 0,
    triplePlus: 0,
  };

  // Create a map of hole numbers to par values
  const parMap = new Map<number, number>();
  holes.forEach((hole) => {
    parMap.set(hole.number, hole.par);
  });

  // Process each score
  Object.entries(scores).forEach(([holeNum, holeScore]) => {
    if (!holeScore?.strokes) return;

    const par = parMap.get(parseInt(holeNum, 10)) || 4; // Default to par 4
    const category = getScoreCategory(holeScore.strokes, par);
    distribution[category]++;
  });

  return distribution;
}

/**
 * Calculate statistics for holes of a specific par value
 */
export function calculateParTypeStats(
  allScores: Array<{ strokes: number; par: number; gir: boolean | null; putts: number | null }>,
  targetPar: number
): ParTypeStats {
  const parHoles = allScores.filter((s) => s.par === targetPar);
  const holesPlayed = parHoles.length;

  if (holesPlayed === 0) {
    return {
      holesPlayed: 0,
      averageScore: 0,
      scoreToPar: 0,
      girPercentage: null,
      birdiePercentage: 0,
      parPercentage: 0,
      bogeyPercentage: 0,
      doublePlusPercentage: 0,
    };
  }

  const totalStrokes = parHoles.reduce((sum, h) => sum + h.strokes, 0);
  const averageScore = Math.round((totalStrokes / holesPlayed) * 100) / 100;
  const scoreToPar = Math.round((averageScore - targetPar) * 100) / 100;

  // Score distribution for this par type
  let birdies = 0,
    pars = 0,
    bogeys = 0,
    doublePlus = 0;
  parHoles.forEach((h) => {
    const diff = h.strokes - h.par;
    if (diff <= -1) birdies++;
    else if (diff === 0) pars++;
    else if (diff === 1) bogeys++;
    else doublePlus++;
  });

  // GIR calculation (only if we have GIR data)
  const holesWithGIRData = parHoles.filter((h) => typeof h.gir === 'boolean');
  const girPercentage =
    holesWithGIRData.length > 0
      ? Math.round((holesWithGIRData.filter((h) => h.gir).length / holesWithGIRData.length) * 1000) /
        10
      : null;

  return {
    holesPlayed,
    averageScore,
    scoreToPar,
    girPercentage,
    birdiePercentage: Math.round((birdies / holesPlayed) * 1000) / 10,
    parPercentage: Math.round((pars / holesPlayed) * 1000) / 10,
    bogeyPercentage: Math.round((bogeys / holesPlayed) * 1000) / 10,
    doublePlusPercentage: Math.round((doublePlus / holesPlayed) * 1000) / 10,
  };
}

/**
 * Calculate scrambling and short game statistics
 * Scrambling = making par or better after missing the green in regulation
 */
export function calculateShortGameStats(
  allScores: Array<{ strokes: number; par: number; gir: boolean | null }>
): ShortGameStats {
  const totalHoles = allScores.length;

  // Bogey avoidance and double+ rate (always calculable)
  const parOrBetter = allScores.filter((h) => h.strokes <= h.par).length;
  const doublePlus = allScores.filter((h) => h.strokes >= h.par + 2).length;

  const bogeyAvoidanceRate =
    totalHoles > 0 ? Math.round((parOrBetter / totalHoles) * 1000) / 10 : 0;
  const doubleBogeyOrWorseRate =
    totalHoles > 0 ? Math.round((doublePlus / totalHoles) * 1000) / 10 : 0;

  // Scrambling requires GIR data
  const holesWithGIRData = allScores.filter((h) => typeof h.gir === 'boolean');

  if (holesWithGIRData.length === 0) {
    return {
      scramblingPercentage: null,
      scrambleAttempts: 0,
      scramblesMade: 0,
      bogeyAvoidanceRate,
      doubleBogeyOrWorseRate,
    };
  }

  // Scramble attempts = missed GIRs
  const missedGIRs = holesWithGIRData.filter((h) => !h.gir);
  const scrambleAttempts = missedGIRs.length;

  // Scrambles made = missed GIR but still made par or better
  const scramblesMade = missedGIRs.filter((h) => h.strokes <= h.par).length;

  const scramblingPercentage =
    scrambleAttempts > 0 ? Math.round((scramblesMade / scrambleAttempts) * 1000) / 10 : null;

  return {
    scramblingPercentage,
    scrambleAttempts,
    scramblesMade,
    bogeyAvoidanceRate,
    doubleBogeyOrWorseRate,
  };
}

/**
 * Calculate extended putting statistics
 */
export function calculatePuttingDepthStats(
  allScores: Array<{ putts: number | null; gir: boolean | null }>
): PuttingDepthStats {
  const holesWithPutts = allScores.filter((h) => typeof h.putts === 'number' && h.putts >= 0);

  if (holesWithPutts.length === 0) {
    return {
      onePuttPercentage: null,
      threePuttPercentage: null,
      puttsPerGIR: null,
    };
  }

  const onePutts = holesWithPutts.filter((h) => h.putts === 1).length;
  const threePutts = holesWithPutts.filter((h) => h.putts! >= 3).length;

  const onePuttPercentage = Math.round((onePutts / holesWithPutts.length) * 1000) / 10;
  const threePuttPercentage = Math.round((threePutts / holesWithPutts.length) * 1000) / 10;

  // Putts per GIR - only count holes where we hit GIR and tracked putts
  const girHolesWithPutts = allScores.filter(
    (h) => h.gir === true && typeof h.putts === 'number' && h.putts >= 0
  );

  const puttsPerGIR =
    girHolesWithPutts.length > 0
      ? Math.round(
          (girHolesWithPutts.reduce((sum, h) => sum + h.putts!, 0) / girHolesWithPutts.length) * 100
        ) / 100
      : null;

  return {
    onePuttPercentage,
    threePuttPercentage,
    puttsPerGIR,
  };
}
