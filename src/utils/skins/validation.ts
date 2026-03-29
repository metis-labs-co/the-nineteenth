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
 * Check if a skins game is complete (all holes played).
 *
 * @param results - Array of hole results
 * @param totalHoles - Number of holes in the round (default 18)
 * @returns True if all holes have results
 */
export function isSkinsGameComplete(
  results: Pick<SkinsResult, 'hole_number'>[],
  totalHoles: number = HOLES_PER_ROUND,
): boolean {
  return results.length >= totalHoles;
}

/**
 * Get the next hole number to process.
 *
 * @param results - Array of existing results
 * @param totalHoles - Number of holes in the round (default 18)
 * @param startHole - First hole number (default 1)
 * @returns Next hole number or null if complete
 */
export function getNextHoleNumber(
  results: Pick<SkinsResult, 'hole_number'>[],
  totalHoles: number = HOLES_PER_ROUND,
  startHole: number = 1,
): number | null {
  const endHole = startHole + totalHoles - 1;
  if (results.length >= totalHoles) return null;

  const completedHoles = new Set(results.map(r => r.hole_number));
  for (let i = startHole; i <= endHole; i++) {
    if (!completedHoles.has(i)) return i;
  }
  return null;
}
