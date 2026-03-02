/**
 * WHS Handicap Differential Utilities
 *
 * Implements the World Handicap System (WHS) calculations for determining
 * a player's Social Handicap Index based on their last 20 rounds.
 *
 * Key formulas:
 * - Score Differential = (113 / Slope Rating) × (Adjusted Gross Score - Course Rating)
 * - Handicap Index = (Sum of best X differentials) / X × 0.96
 *
 * The number of rounds used depends on total rounds available (see WHS counting table).
 */

import type { ScoreDifferentialParams } from '@/types';
import { STANDARD_SLOPE_RATING, MAX_HANDICAP } from '@/constants/scoring';

/**
 * Tee data with course/slope ratings
 * Used for selecting appropriate ratings based on gender
 */
interface TeeWithRatings {
  course_rating?: number | null;
  slope_rating?: number | null;
  womens_course_rating?: number | null;
  womens_slope_rating?: number | null;
}

/**
 * Result from getRatingsForGender
 */
interface RatingsResult {
  courseRating: number;
  slopeRating: number;
}

/**
 * WHS Counting Table - determines how many of the best differentials to use
 *
 * | Rounds | Best X Used |
 * |--------|-------------|
 * | 1-5    | 1           |
 * | 6-8    | 2           |
 * | 9-11   | 3           |
 * | 12-14  | 4           |
 * | 15-16  | 5           |
 * | 17-18  | 6           |
 * | 19     | 7           |
 * | 20+    | 8           |
 */
const WHS_COUNTING_TABLE: { maxRounds: number; count: number }[] = [
  { maxRounds: 5, count: 1 },
  { maxRounds: 8, count: 2 },
  { maxRounds: 11, count: 3 },
  { maxRounds: 14, count: 4 },
  { maxRounds: 16, count: 5 },
  { maxRounds: 18, count: 6 },
  { maxRounds: 19, count: 7 },
  { maxRounds: Infinity, count: 8 },
];

/**
 * WHS multiplier applied to average differential
 * This ensures handicap is slightly lower than average to encourage improvement
 */
const WHS_MULTIPLIER = 0.96;

/**
 * Calculate the WHS Score Differential for a single round
 *
 * Formula: (113 / Slope Rating) × (Adjusted Gross Score - Course Rating)
 *
 * The differential represents how many strokes above or below the course rating
 * the player scored, normalized to a course with standard 113 slope.
 *
 * @param params - Score differential calculation parameters
 * @returns Differential rounded to 1 decimal place, or null if invalid input
 *
 * @example
 * // Player scores 85 on a course with CR 72.5, slope 125
 * calculateScoreDifferential({ adjustedGrossScore: 85, courseRating: 72.5, slopeRating: 125 })
 * // Returns 11.3
 */
export function calculateScoreDifferential(
  params: ScoreDifferentialParams
): number | null {
  const { adjustedGrossScore, courseRating, slopeRating } = params;

  // Validate inputs - invalid ratings should skip calculation
  if (slopeRating <= 0 || courseRating <= 0) {
    return null;
  }

  // WHS formula: (113 / slope) × (adjusted gross - course rating)
  const differential =
    (STANDARD_SLOPE_RATING / slopeRating) *
    (adjustedGrossScore - courseRating);

  // Round to 1 decimal place
  return Math.round(differential * 10) / 10;
}

/**
 * Get the number of best differentials to use based on total rounds
 *
 * Uses the WHS counting table:
 * - 1-5 rounds: best 1
 * - 6-8 rounds: best 2
 * - 9-11 rounds: best 3
 * - 12-14 rounds: best 4
 * - 15-16 rounds: best 5
 * - 17-18 rounds: best 6
 * - 19 rounds: best 7
 * - 20+ rounds: best 8
 *
 * @param totalRounds - Number of rounds with differentials
 * @returns Number of rounds that count toward index
 *
 * @example
 * getQualifyingCount(12) // Returns 4 (best 4 of 12)
 * getQualifyingCount(20) // Returns 8 (best 8 of 20)
 */
export function getQualifyingCount(totalRounds: number): number {
  if (totalRounds <= 0) {
    return 0;
  }

  for (const tier of WHS_COUNTING_TABLE) {
    if (totalRounds <= tier.maxRounds) {
      return tier.count;
    }
  }

  // Should never reach here due to Infinity in last tier
  return 8;
}

/**
 * Calculate the WHS Handicap Index from an array of differentials
 *
 * Steps:
 * 1. Determine how many rounds to use based on WHS counting table
 * 2. Take the best (lowest) X differentials
 * 3. Calculate average of those differentials
 * 4. Multiply by 0.96 (WHS adjustment factor)
 * 5. Cap at MAX_HANDICAP (54.0)
 *
 * @param differentials - Array of score differentials (most recent first)
 * @returns Calculated handicap index (1 decimal), or null if no differentials
 *
 * @example
 * // 20 differentials ranging from 8.0 to 20.0
 * calculateHandicapIndex([12.5, 14.2, 11.8, 13.0, ...])
 * // Returns best 8 average × 0.96
 */
export function calculateHandicapIndex(differentials: number[]): number | null {
  if (!differentials || differentials.length === 0) {
    return null;
  }

  const totalRounds = differentials.length;
  const countToUse = getQualifyingCount(totalRounds);

  // Sort differentials ascending (best = lowest)
  const sorted = [...differentials].sort((a, b) => a - b);

  // Take the best X differentials
  const bestDifferentials = sorted.slice(0, countToUse);

  // Calculate average
  const sum = bestDifferentials.reduce((acc, diff) => acc + diff, 0);
  const average = sum / countToUse;

  // Apply WHS multiplier (0.96)
  const handicapIndex = average * WHS_MULTIPLIER;

  // Cap at maximum handicap
  const capped = Math.min(handicapIndex, MAX_HANDICAP);

  // Round to 1 decimal place
  return Math.round(capped * 10) / 10;
}

/**
 * Get the appropriate course and slope ratings based on player gender
 *
 * Women typically play from tees with different ratings. This function:
 * - Uses women's ratings if available and player is female
 * - Falls back to men's ratings otherwise
 * - Returns null if no valid ratings are available
 *
 * @param tee - Tee data with course/slope ratings
 * @param gender - Player gender ('male' | 'female' | null)
 * @returns Object with courseRating and slopeRating, or null if no valid ratings
 *
 * @example
 * // Female player with women's ratings available
 * getRatingsForGender(tee, 'female')
 * // Returns { courseRating: 74.5, slopeRating: 130 } (women's ratings)
 *
 * // Female player without women's ratings
 * getRatingsForGender(tee, 'female')
 * // Returns { courseRating: 72.5, slopeRating: 125 } (men's ratings fallback)
 */
export function getRatingsForGender(
  tee: TeeWithRatings | null | undefined,
  gender: 'male' | 'female' | null | undefined
): RatingsResult | null {
  if (!tee) {
    return null;
  }

  // Check for women's ratings if player is female
  if (
    gender === 'female' &&
    tee.womens_course_rating != null &&
    tee.womens_course_rating > 0 &&
    tee.womens_slope_rating != null &&
    tee.womens_slope_rating > 0
  ) {
    return {
      courseRating: tee.womens_course_rating,
      slopeRating: tee.womens_slope_rating,
    };
  }

  // Use men's ratings (or fallback for all genders if women's not available)
  if (
    tee.course_rating != null &&
    tee.course_rating > 0 &&
    tee.slope_rating != null &&
    tee.slope_rating > 0
  ) {
    return {
      courseRating: tee.course_rating,
      slopeRating: tee.slope_rating,
    };
  }

  // No valid ratings available
  return null;
}
