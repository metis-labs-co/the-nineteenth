/**
 * Wolf Validation Functions
 *
 * Functions for validating Wolf game participants, decisions,
 * and game completion status.
 */

import type {
  WolfHoleDecision,
  WolfHoleScores,
} from '@/types/database/wolf.types';
import { HOLES_PER_ROUND } from '@/constants/scoring';

/** Minimum players for Wolf (3 players) */
const MIN_WOLF_PLAYERS = 3;

/** Maximum players for Wolf (4 players) */
const MAX_WOLF_PLAYERS = 4;

/**
 * Validation result structure.
 */
export interface WolfValidationResult {
  isValid: boolean;
  errors: string[];
}

/**
 * Validate Wolf game participants.
 * Wolf requires exactly 3 or 4 players.
 *
 * @param participantIds - Array of player IDs
 * @returns Validation result
 *
 * @example
 * validateWolfParticipants(['p1', 'p2', 'p3']) // { isValid: true, errors: [] }
 * validateWolfParticipants(['p1', 'p2']) // { isValid: false, errors: ['Wolf requires 3-4 players'] }
 */
export function validateWolfParticipants(
  participantIds: string[]
): WolfValidationResult {
  const errors: string[] = [];

  if (
    participantIds.length < MIN_WOLF_PLAYERS ||
    participantIds.length > MAX_WOLF_PLAYERS
  ) {
    errors.push(`Wolf requires ${MIN_WOLF_PLAYERS}-${MAX_WOLF_PLAYERS} players`);
  }

  // Check for duplicates
  const uniqueIds = new Set(participantIds);
  if (uniqueIds.size !== participantIds.length) {
    errors.push('Duplicate participants not allowed');
  }

  return { isValid: errors.length === 0, errors };
}

/**
 * Validate a Wolf decision.
 *
 * @param wolfId - The Wolf player ID
 * @param partnerId - Partner player ID (null for lone wolf)
 * @param participantIds - All participant IDs
 * @returns Validation result
 *
 * @example
 * validateWolfDecision('wolf', 'p2', ['wolf', 'p2', 'p3'])
 * // { isValid: true, errors: [] }
 *
 * validateWolfDecision('wolf', 'wolf', ['wolf', 'p2', 'p3'])
 * // { isValid: false, errors: ['Wolf cannot partner with themselves'] }
 */
export function validateWolfDecision(
  wolfId: string,
  partnerId: string | null,
  participantIds: string[]
): WolfValidationResult {
  const errors: string[] = [];

  // Wolf must be a participant
  if (!participantIds.includes(wolfId)) {
    errors.push('Wolf must be a game participant');
  }

  // Partner validation (if not lone wolf)
  if (partnerId !== null) {
    if (partnerId === wolfId) {
      errors.push('Wolf cannot partner with themselves');
    }
    if (!participantIds.includes(partnerId)) {
      errors.push('Partner must be a game participant');
    }
  }

  return { isValid: errors.length === 0, errors };
}

/**
 * Check if Blind Wolf is allowed on this hole.
 * Blind Wolf can only be declared before any scores are entered.
 *
 * @param holeScores - Current hole scores (empty if no scores yet)
 * @param blindWolfEnabled - Whether blind wolf is enabled for this game
 * @returns True if Blind Wolf is allowed
 */
export function canDeclareBlindWolf(
  holeScores: WolfHoleScores | null,
  blindWolfEnabled: boolean
): boolean {
  if (!blindWolfEnabled) return false;
  // Blind Wolf only allowed if no scores entered yet
  return !holeScores || Object.keys(holeScores).length === 0;
}

/**
 * Check if a Wolf game is complete (all 18 holes have decisions and results).
 *
 * @param decisions - Array of hole decisions
 * @returns True if all 18 holes are complete
 */
export function isWolfGameComplete(
  decisions: Pick<WolfHoleDecision, 'hole_number' | 'calculated_at'>[]
): boolean {
  const completedHoles = decisions.filter((d) => d.calculated_at !== null);
  return completedHoles.length >= HOLES_PER_ROUND;
}

/**
 * Get the next hole number that needs a decision.
 *
 * @param decisions - Array of existing decisions
 * @returns Next hole number (1-18) or null if all decided
 */
export function getNextHoleForDecision(
  decisions: Pick<WolfHoleDecision, 'hole_number' | 'decided_at'>[]
): number | null {
  const decidedHoles = new Set(
    decisions.filter((d) => d.decided_at !== null).map((d) => d.hole_number)
  );

  for (let hole = 1; hole <= HOLES_PER_ROUND; hole++) {
    if (!decidedHoles.has(hole)) return hole;
  }
  return null;
}

/**
 * Get the next hole number that needs result calculation.
 *
 * @param decisions - Array of existing decisions
 * @returns Next hole number or null if all calculated
 */
export function getNextHoleForCalculation(
  decisions: Pick<WolfHoleDecision, 'hole_number' | 'decided_at' | 'calculated_at'>[]
): number | null {
  // Find holes with decision but no calculation
  const needsCalculation = decisions.filter(
    (d) => d.decided_at !== null && d.calculated_at === null
  );

  if (needsCalculation.length === 0) return null;

  // Return the lowest hole number
  return Math.min(...needsCalculation.map((d) => d.hole_number));
}
