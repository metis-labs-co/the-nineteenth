/**
 * WHS Daily Handicap Calculation
 *
 * Implements the WHS Daily Handicap formula:
 * Daily HC = ((WHS Handicap Index × Slope ÷ 113) + (Course Rating − Par)) × 0.93 × Consistency Factor
 *
 * Consistency Factors:
 * - Men/Boys: 0.9986
 * - Women/Girls: 1.0483
 *
 * @see https://www.golf.org.au/whs
 * @see https://help.miclub.com.au/support/solutions/articles/14000159379
 */

import { STANDARD_SLOPE_RATING } from '@/constants/scoring';
import type { DailyHandicapParams, DailyHandicapResult } from '@/types/handicap.types';
import type { NineType } from '@/types/database/enums';

// =====================================================
// CONSTANTS
// =====================================================

/**
 * WHS handicap multiplier applied to the intermediate calculation
 * This reduces the daily handicap compared to course handicap
 */
export const GA_HANDICAP_MULTIPLIER = 0.93;

/**
 * Consistency factor for male players (Men/Boys)
 */
export const GA_CONSISTENCY_FACTOR_MALE = 0.9986;

/**
 * Consistency factor for female players (Women/Girls)
 */
export const GA_CONSISTENCY_FACTOR_FEMALE = 1.0483;

// =====================================================
// FUNCTIONS
// =====================================================

/**
 * Get the consistency factor based on player gender
 *
 * @param gender - Player's gender ('male', 'female', or null)
 * @returns Consistency factor (0.9986 for male/null, 1.0483 for female)
 */
export function getConsistencyFactor(gender: 'male' | 'female' | null | undefined): number {
  return gender === 'female' ? GA_CONSISTENCY_FACTOR_FEMALE : GA_CONSISTENCY_FACTOR_MALE;
}

/**
 * Calculate WHS Daily Handicap
 *
 * Applies the WHS formula:
 * Daily HC = ((WHS Handicap Index × Slope ÷ 113) + (Course Rating − Par)) × 0.93 × Consistency Factor
 *
 * @param params - Calculation parameters
 * @param params.gaHandicap - Player's WHS Handicap Index
 * @param params.slopeRating - Course/tee slope rating (default: 113)
 * @param params.courseRating - Course/tee scratch rating (default: par)
 * @param params.par - Course par (sum of hole pars)
 * @param params.gender - Player gender for consistency factor (default: male)
 *
 * @returns DailyHandicapResult with dailyHandicap, courseHandicap, and consistencyFactor
 *
 * @example
 * // Male player, HC 18, Slope 125, CR 72.5, Par 72
 * const result = calculateGADailyHandicap({
 *   gaHandicap: 18,
 *   slopeRating: 125,
 *   courseRating: 72.5,
 *   par: 72,
 *   gender: 'male',
 * });
 * // result.dailyHandicap = 19
 * // result.courseHandicap = 19.91
 * // result.consistencyFactor = 0.9986
 */
export function calculateGADailyHandicap(params: DailyHandicapParams): DailyHandicapResult {
  const {
    gaHandicap,
    slopeRating = STANDARD_SLOPE_RATING,
    courseRating,
    par,
    gender,
  } = params;

  // Use par as default course rating if not provided
  const effectiveCourseRating = courseRating ?? par;

  // Get consistency factor based on gender
  const consistencyFactor = getConsistencyFactor(gender);

  // Step 1: Calculate course handicap
  // Course HC = WHS Handicap Index × Slope ÷ 113
  const courseHandicap = (gaHandicap * slopeRating) / STANDARD_SLOPE_RATING;

  // Step 2: Add course rating adjustment
  // Adjustment = Course Rating - Par
  const courseRatingAdjustment = effectiveCourseRating - par;

  // Step 3: Apply WHS multiplier and consistency factor
  // Raw Daily HC = (Course HC + Adjustment) × 0.93 × Consistency Factor
  const rawDailyHandicap =
    (courseHandicap + courseRatingAdjustment) * GA_HANDICAP_MULTIPLIER * consistencyFactor;

  // Step 4: Round to nearest integer for final daily handicap
  const dailyHandicap = Math.round(rawDailyHandicap);

  return {
    dailyHandicap,
    courseHandicap: Math.round(courseHandicap * 10) / 10, // 1 decimal place
    consistencyFactor,
  };
}

/**
 * Parameters for the nine-aware daily handicap calculation.
 */
export interface NineAwareDailyHandicapParams {
  /** Player's WHS Handicap Index */
  gaHandicap: number;
  /** Which holes are being played: 'full' (18), 'front9', or 'back9' */
  nineType: NineType;
  /**
   * Par of the holes actually being played. For a 9-hole round this is the
   * 9-hole par (~36), NOT the full course par. The caller is expected to pass
   * the par summed over the holes it is scoring.
   */
  par: number;
  /** Full 18-hole slope rating for the tee */
  slopeRating?: number;
  /** Full 18-hole course rating for the tee */
  courseRating?: number;
  /** Dedicated 9-hole ratings, when the tee provides them */
  slopeRatingFront9?: number;
  courseRatingFront9?: number;
  slopeRatingBack9?: number;
  courseRatingBack9?: number;
  /** Player gender for consistency factor */
  gender?: 'male' | 'female' | null;
}

/**
 * Calculate a daily handicap that is correct for 9-hole rounds.
 *
 * WHS pitfall: a daily handicap pairs a `courseRating − par` term. For a 9-hole
 * round the par is the 9-hole par (~36), so the course rating MUST also be a
 * 9-hole rating (~36). Pairing the full 18-hole course rating (~72) with a
 * 9-hole par inflates the result by roughly +36 strokes.
 *
 * Resolution order for a 9-hole round (GA / WHS 9-hole formula):
 *
 *   9-hole DH = (((HI ÷ 2) × 9-hole Slope ÷ 113) + (9-hole CR − 9-hole Par)) × 0.93 × CF
 *
 * 1. Use the tee's dedicated 9-hole slope/course ratings when present, with
 *    HALF the handicap index.
 * 2. Otherwise approximate the 9-hole ratings from the 18-hole tee: the 18-hole
 *    slope and half the 18-hole course rating, still with half the index. This
 *    equals the UNROUNDED 18-hole daily handicap ÷ 2, rounded exactly once (no
 *    round-then-halve-then-round double rounding).
 *
 * This is the single source of truth shared by the on-course scoring display,
 * the scoring store's live totals, and the scorecard sync/persistence path so
 * they can never diverge.
 */
export function calculateNineAwareDailyHandicap(
  params: NineAwareDailyHandicapParams,
): DailyHandicapResult {
  const { gaHandicap, nineType, par, slopeRating, courseRating, gender } = params;

  if (nineType === 'full') {
    return calculateGADailyHandicap({ gaHandicap, slopeRating, courseRating, par, gender });
  }

  const nineHoleIndex = gaHandicap / 2;
  const nineCr = nineType === 'front9' ? params.courseRatingFront9 : params.courseRatingBack9;
  const nineSlope = nineType === 'front9' ? params.slopeRatingFront9 : params.slopeRatingBack9;

  // Dedicated 9-hole ratings available: use them directly against the 9-hole par.
  if (nineCr != null) {
    return calculateGADailyHandicap({
      gaHandicap: nineHoleIndex,
      slopeRating: nineSlope ?? slopeRating,
      courseRating: nineCr,
      par,
      gender,
    });
  }

  // No 9-hole ratings: 18-hole slope with half the 18-hole course rating. When
  // the course rating is missing, calculateGADailyHandicap defaults it to par
  // (zero adjustment), matching the 18-hole behaviour.
  return calculateGADailyHandicap({
    gaHandicap: nineHoleIndex,
    slopeRating,
    courseRating: courseRating != null ? courseRating / 2 : undefined,
    par,
    gender,
  });
}
