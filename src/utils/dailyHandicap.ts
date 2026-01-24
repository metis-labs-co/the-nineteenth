/**
 * Golf Australia Daily Handicap Calculation
 *
 * Implements the GA 2025 Daily Handicap formula:
 * Daily HC = ((GA Handicap × Slope ÷ 113) + (Course Rating − Par)) × 0.93 × Consistency Factor
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

// =====================================================
// CONSTANTS
// =====================================================

/**
 * GA handicap multiplier applied to the intermediate calculation
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
 * Calculate GA Daily Handicap
 *
 * Applies the Golf Australia 2025 formula:
 * Daily HC = ((GA Handicap × Slope ÷ 113) + (Course Rating − Par)) × 0.93 × Consistency Factor
 *
 * @param params - Calculation parameters
 * @param params.gaHandicap - Player's GA Handicap Index
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
  // Course HC = GA Handicap × Slope ÷ 113
  const courseHandicap = (gaHandicap * slopeRating) / STANDARD_SLOPE_RATING;

  // Step 2: Add course rating adjustment
  // Adjustment = Course Rating - Par
  const courseRatingAdjustment = effectiveCourseRating - par;

  // Step 3: Apply GA multiplier and consistency factor
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
