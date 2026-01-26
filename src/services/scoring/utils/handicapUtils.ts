/**
 * Handicap Utilities
 *
 * Functions for calculating handicap-related adjustments.
 * Updated to use Golf Australia 2025 Daily Handicap formula.
 */

import type { Hole } from '../types';
import type { GameType } from '@/types/database';
import { getStrokesReceived } from '@/utils/scoring';
import { calculateGADailyHandicap } from '@/utils/dailyHandicap';

/**
 * Calculate the number of strokes a player receives on a specific hole
 * based on their playing handicap and the hole's stroke index.
 *
 * @deprecated Use getStrokesReceived from '@/utils/scoring' directly.
 * This is kept as an alias for backward compatibility.
 *
 * @param playingHandicap - Player's adjusted handicap for the round
 * @param strokeIndex - The hole's stroke index (1-18, lower = harder)
 * @returns Number of strokes received (0, 1, or 2+)
 */
export const calculateStrokesForHole = getStrokesReceived;

/**
 * Get the playing handicap adjusted for the course and game type.
 *
 * Uses the Golf Australia 2025 Daily Handicap formula when course data is available:
 * Daily HC = ((GA Handicap × Slope ÷ 113) + (Course Rating − Par)) × 0.93 × Consistency Factor
 *
 * Consistency Factors:
 * - Men/Boys: 0.9986
 * - Women/Girls: 1.0483
 *
 * Falls back to simplified formula when course data is missing:
 * Course Handicap = Handicap Index × (Slope Rating ÷ 113)
 *
 * @param handicapIndex - Player's GA handicap index
 * @param slopeRating - Course slope rating (55-155, default 113)
 * @param courseRating - Course rating (optional, enables GA formula)
 * @param par - Course par (optional, enables GA formula)
 * @param gameType - The game type (may affect handicap allowance)
 * @param gender - Player gender for consistency factor (optional, defaults to male)
 * @returns Adjusted playing handicap (rounded to nearest integer)
 */
export function getPlayingHandicap(
  handicapIndex: number,
  slopeRating = 113,
  courseRating?: number,
  par?: number,
  gameType?: GameType,
  gender?: 'male' | 'female' | null
): number {
  let dailyHandicap: number;

  // Use GA formula when we have complete course data
  if (par !== undefined && par > 0) {
    const result = calculateGADailyHandicap({
      gaHandicap: handicapIndex,
      slopeRating,
      courseRating,
      par,
      gender,
    });
    dailyHandicap = result.dailyHandicap;
  } else {
    // Fallback to simple formula when course data is missing
    dailyHandicap = Math.round((handicapIndex * slopeRating) / 113);
  }

  // Apply game type allowance to the daily handicap
  const allowance = getHandicapAllowance(gameType);
  return Math.round(dailyHandicap * allowance);
}

/**
 * Get the handicap allowance percentage for a game type.
 *
 * Different formats use different percentages of handicap:
 * - Individual stroke play: 95%
 * - Individual Stableford: 95%
 * - Match play: 100%
 * - Best ball: 85%
 * - Shamble: 85% (same as best ball - individual scoring from best drive)
 * - Scramble: 100% (team handicap calculated differently)
 *
 * @param gameType - The game type
 * @returns Allowance as a decimal (e.g., 0.95 for 95%)
 */
export function getHandicapAllowance(gameType?: GameType): number {
  switch (gameType) {
    case 'match-play':
      return 1.0; // 100%
    case 'best-ball':
    case 'shamble':
      return 0.85; // 85%
    case 'scramble':
      return 1.0; // Team handicap calculated differently
    case 'stableford':
    case 'stroke':
    default:
      return 0.95; // 95%
  }
}

/**
 * Calculate strokes received for all holes based on handicap.
 *
 * @param playingHandicap - Player's playing handicap
 * @param holes - Array of course holes with stroke indexes
 * @returns Map of hole number to strokes received
 */
export function getStrokesReceivedPerHole(
  playingHandicap: number,
  holes: Hole[]
): Map<number, number> {
  const strokesMap = new Map<number, number>();

  for (const hole of holes) {
    const strokes = calculateStrokesForHole(playingHandicap, hole.strokeIndex);
    strokesMap.set(hole.number, strokes);
  }

  return strokesMap;
}

/**
 * Calculate team handicap for Ambrose format.
 *
 * Ambrose handicap is typically a fraction of the combined team handicaps.
 * Common formulas:
 * - 2-person: (H1 + H2) / 4
 * - 3-person: (H1 + H2 + H3) / 6
 * - 4-person: (H1 + H2 + H3 + H4) / 8
 *
 * @param teamHandicaps - Array of team member handicaps
 * @returns Team handicap for Ambrose
 */
export function calculateAmbroseHandicap(teamHandicaps: number[]): number {
  if (teamHandicaps.length === 0) return 0;

  const totalHandicap = teamHandicaps.reduce((sum, h) => sum + h, 0);
  const divisor = teamHandicaps.length * 2;

  return Math.round(totalHandicap / divisor);
}
