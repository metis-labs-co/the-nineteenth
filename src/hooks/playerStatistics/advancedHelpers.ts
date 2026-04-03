/**
 * Player Statistics - Advanced Helper Functions
 *
 * Calculation functions for advanced stats:
 * - Fairway miss direction aggregates
 * - Green miss direction aggregates
 * - Bunker statistics
 * - Hazard statistics
 */

import type { FairwayMissDirection, GreenMissDirection, HazardEntry } from '@/types/database/base';
import type {
  FairwayMissDirectionStats,
  GreenMissDirectionStats,
  BunkerStats,
  HazardStats,
} from './types';

/** Enriched hole score with all tracked fields */
export interface EnrichedHoleScore {
  strokes: number;
  par: number;
  gir: boolean | null;
  putts: number | null;
  fairwayHit: boolean | null;
  fairwayMissDirection: FairwayMissDirection | undefined;
  greenMissDirection: GreenMissDirection | undefined;
  bunkerShots: number | undefined;
  hazards: HazardEntry[] | undefined;
}

/**
 * Calculate fairway miss direction aggregates
 */
export function calculateFairwayMissDirectionStats(
  allScores: EnrichedHoleScore[]
): FairwayMissDirectionStats {
  let leftCount = 0;
  let rightCount = 0;

  for (const score of allScores) {
    if (score.fairwayHit === false && score.fairwayMissDirection) {
      if (score.fairwayMissDirection === 'left') leftCount++;
      else if (score.fairwayMissDirection === 'right') rightCount++;
    }
  }

  const totalMisses = leftCount + rightCount;

  return {
    leftCount,
    rightCount,
    totalMisses,
    leftPercentage: totalMisses > 0 ? Math.round((leftCount / totalMisses) * 1000) / 10 : null,
    rightPercentage: totalMisses > 0 ? Math.round((rightCount / totalMisses) * 1000) / 10 : null,
  };
}

/**
 * Calculate green miss direction aggregates
 */
export function calculateGreenMissDirectionStats(
  allScores: EnrichedHoleScore[]
): GreenMissDirectionStats {
  let leftCount = 0;
  let rightCount = 0;
  let longCount = 0;
  let shortCount = 0;

  for (const score of allScores) {
    if (score.gir === false && score.greenMissDirection) {
      switch (score.greenMissDirection) {
        case 'left': leftCount++; break;
        case 'right': rightCount++; break;
        case 'long': longCount++; break;
        case 'short': shortCount++; break;
      }
    }
  }

  const totalMisses = leftCount + rightCount + longCount + shortCount;

  return {
    leftCount,
    rightCount,
    longCount,
    shortCount,
    totalMisses,
    leftPercentage: totalMisses > 0 ? Math.round((leftCount / totalMisses) * 1000) / 10 : null,
    rightPercentage: totalMisses > 0 ? Math.round((rightCount / totalMisses) * 1000) / 10 : null,
    longPercentage: totalMisses > 0 ? Math.round((longCount / totalMisses) * 1000) / 10 : null,
    shortPercentage: totalMisses > 0 ? Math.round((shortCount / totalMisses) * 1000) / 10 : null,
  };
}

/**
 * Calculate bunker statistics
 */
export function calculateBunkerStats(
  allScores: EnrichedHoleScore[],
  roundsPlayed: number
): BunkerStats {
  let totalBunkerShots = 0;
  let holesWithBunkers = 0;
  let totalHolesTracked = 0;

  for (const score of allScores) {
    if (typeof score.bunkerShots === 'number') {
      totalHolesTracked++;
      totalBunkerShots += score.bunkerShots;
      if (score.bunkerShots > 0) holesWithBunkers++;
    }
  }

  return {
    totalBunkerShots,
    holesWithBunkers,
    totalHolesTracked,
    averageBunkerShotsPerRound:
      roundsPlayed > 0 && totalHolesTracked > 0
        ? Math.round((totalBunkerShots / roundsPlayed) * 10) / 10
        : null,
    holesWithBunkersPercentage:
      totalHolesTracked > 0
        ? Math.round((holesWithBunkers / totalHolesTracked) * 1000) / 10
        : null,
  };
}

/**
 * Calculate hazard statistics
 */
export function calculateHazardStats(
  allScores: EnrichedHoleScore[],
  roundsPlayed: number
): HazardStats {
  let waterCount = 0;
  let obCount = 0;
  let lateralCount = 0;
  let lostBallCount = 0;
  let holesWithHazards = 0;
  let totalHolesTracked = 0;

  for (const score of allScores) {
    if (score.hazards !== undefined) {
      totalHolesTracked++;
      if (score.hazards.length > 0) {
        holesWithHazards++;
        for (const hazard of score.hazards) {
          switch (hazard.type) {
            case 'water': waterCount++; break;
            case 'ob': obCount++; break;
            case 'lateral': lateralCount++; break;
            case 'lost_ball': lostBallCount++; break;
          }
        }
      }
    }
  }

  const totalHazards = waterCount + obCount + lateralCount + lostBallCount;

  return {
    waterCount,
    obCount,
    lateralCount,
    lostBallCount,
    totalHazards,
    averageHazardsPerRound:
      roundsPlayed > 0 && totalHolesTracked > 0
        ? Math.round((totalHazards / roundsPlayed) * 10) / 10
        : null,
    holesWithHazards,
    totalHolesTracked,
  };
}
