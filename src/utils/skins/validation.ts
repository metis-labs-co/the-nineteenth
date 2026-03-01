/**
 * Skins Validation Functions
 *
 * Functions for validating skins game configuration, hole scores,
 * and game completion status.
 */

import type { SkinsHoleScores, SkinsResult } from '@/types/database';
import { HOLES_PER_ROUND } from '@/constants/scoring';

/**
 * Validation result structure
 */
export interface ValidationResult {
  isValid: boolean;
  errors: string[];
}

/**
 * Hole scores validation result
 */
export interface HoleScoresValidationResult {
  isValid: boolean;
  missingPlayerIds: string[];
}

/**
 * Validate skins game configuration.
 *
 * @param participantIds - Array of player IDs
 * @param potValue - Configured pot value
 * @returns Validation result with isValid flag and error messages
 *
 * @example
 * validateSkinsGame(['p1', 'p2'], 5) // { isValid: true, errors: [] }
 * validateSkinsGame(['p1'], 5) // { isValid: false, errors: ['At least 2 participants required'] }
 */
export function validateSkinsGame(
  participantIds: string[],
  potValue: number
): ValidationResult {
  const errors: string[] = [];

  if (participantIds.length < 2) {
    errors.push('At least 2 participants required');
  }
  if (potValue <= 0) {
    errors.push('Pot value must be greater than 0');
  }

  // Check for duplicate participants
  const uniqueIds = new Set(participantIds);
  if (uniqueIds.size !== participantIds.length) {
    errors.push('Duplicate participants not allowed');
  }

  return {
    isValid: errors.length === 0,
    errors,
  };
}

/**
 * Validate that all participants have scores for a hole.
 *
 * @param holeScores - Scores recorded for the hole
 * @param participantIds - Expected participant IDs
 * @returns Validation result with list of missing players
 *
 * @example
 * validateHoleScores({ p1: {...}, p2: {...} }, ['p1', 'p2', 'p3'])
 * // { isValid: false, missingPlayerIds: ['p3'] }
 */
export function validateHoleScores(
  holeScores: SkinsHoleScores,
  participantIds: string[]
): HoleScoresValidationResult {
  const scoredPlayerIds = new Set(Object.keys(holeScores));
  const missingPlayerIds = participantIds.filter(id => !scoredPlayerIds.has(id));

  return {
    isValid: missingPlayerIds.length === 0,
    missingPlayerIds,
  };
}

/**
 * Check if a skins game is complete (all 18 holes played).
 *
 * @param results - Array of hole results
 * @returns True if all 18 holes have results
 */
export function isSkinsGameComplete(
  results: Pick<SkinsResult, 'hole_number'>[]
): boolean {
  return results.length >= HOLES_PER_ROUND;
}

/**
 * Get the next hole number to process.
 *
 * @param results - Array of existing results
 * @returns Next hole number (1-18) or null if complete
 */
export function getNextHoleNumber(
  results: Pick<SkinsResult, 'hole_number'>[]
): number | null {
  if (results.length >= HOLES_PER_ROUND) return null;

  const completedHoles = new Set(results.map(r => r.hole_number));
  for (let i = 1; i <= HOLES_PER_ROUND; i++) {
    if (!completedHoles.has(i)) return i;
  }
  return null;
}
