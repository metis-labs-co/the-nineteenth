/**
 * Scoring Constants
 *
 * Centralized scoring-related constants used throughout the application.
 * Import from '@/constants/scoring' for all scoring-related constants.
 */

import type { NineType } from '@/types/database/enums';

/**
 * Score used when player picks up (max strokes for stableford)
 * Also used as the maximum strokes per hole for any format
 */
export const PICKUP_SCORE = 10;

/**
 * Maximum strokes per hole for any format
 * Same as PICKUP_SCORE but with semantic naming for clarity
 */
export const MAX_STROKES_PER_HOLE = 10;

/**
 * Stableford point values relative to par (net score)
 * Points are awarded based on net score relative to par.
 *
 * Standard Stableford (used in calculateStablefordPoints):
 * - 2+ under par: 4 points (eagle or better)
 * - 1 under par: 3 points (birdie)
 * - Even with par: 2 points (par)
 * - 1 over par: 1 point (bogey)
 * - 2+ over par: 0 points (double bogey or worse)
 *
 * Extended Stableford (used in calculateStablefordPointsNet):
 * - 3+ under par: 5 points (albatross or better)
 * - 2 under par: 4 points (eagle)
 * - 1 under par: 3 points (birdie)
 * - Even with par: 2 points (par)
 * - 1 over par: 1 point (bogey)
 * - 2+ over par: 0 points (double bogey or worse)
 */
export const STABLEFORD_POINTS = {
  ALBATROSS_OR_BETTER: 5, // 3+ under par (net) - extended format
  EAGLE_OR_BETTER: 4, // 2+ under par (net) - standard format
  EAGLE: 4, // 2 under par (net)
  BIRDIE: 3, // 1 under par (net)
  PAR: 2, // Even with par (net)
  BOGEY: 1, // 1 over par (net)
  DOUBLE_OR_WORSE: 0, // 2+ over par (net)
} as const;

/**
 * Par game point values relative to par (net score)
 * Players win, halve, or lose each hole based on their net score vs par.
 *
 * - Net birdie or better (net score ≤ par - 1): +1 (Win)
 * - Net par (net score = par): 0 (Square)
 * - Net bogey or worse (net score ≥ par + 1): -1 (Loss)
 */
export const PAR_GAME_POINTS = {
  WIN: 1, // Net birdie or better
  SQUARE: 0, // Net par
  LOSS: -1, // Net bogey or worse
} as const;

/**
 * Hole-in-one detection
 */
export const HOLE_IN_ONE_SCORE = 1;

/**
 * Default handicap for new players
 */
export const DEFAULT_HANDICAP = 18;

/**
 * Maximum handicap allowed
 */
export const MAX_HANDICAP = 54;

/**
 * Minimum handicap (scratch or better)
 */
export const MIN_HANDICAP = 0;

/**
 * Number of holes in a full round
 */
export const HOLES_PER_ROUND = 18;

/**
 * Number of holes in a half round (9-hole format)
 */
export const HOLES_PER_HALF = 9;

/**
 * Standard slope rating (USGA baseline)
 */
export const STANDARD_SLOPE_RATING = 113;

/**
 * Get the number of holes for a given nine type
 */
export function getHoleCount(nineType: NineType): number {
  return nineType === 'full' ? HOLES_PER_ROUND : HOLES_PER_HALF;
}

/**
 * Get the hole number range for a given nine type
 */
export function getHoleRange(nineType: NineType): { start: number; end: number } {
  switch (nineType) {
    case 'front9': return { start: 1, end: 9 };
    case 'back9': return { start: 10, end: 18 };
    default: return { start: 1, end: 18 };
  }
}
