/**
 * Scoring Pairs Validation
 *
 * Functions for validating scoring pair coverage in golf competitions.
 */

import type { ScoringPairCreateInput } from '@/types';
import type { ScoringPairsCoverageResult } from './types';

/**
 * Validates that scoring pairs provide complete coverage for all players.
 * Checks that every player is scored by exactly one scorer.
 *
 * @param pairs - Array of scoring pairs to validate
 * @param playerIds - Array of all player IDs that should be covered
 * @returns Validation result with details about any coverage issues
 *
 * @example
 * // Valid coverage
 * const result = validateScoringPairsCoverage(
 *   [
 *     { scorerId: 'A', playerId: 'B' },
 *     { scorerId: 'B', playerId: 'A' },
 *   ],
 *   ['A', 'B']
 * );
 * // result.isValid === true
 * // result.missingPlayers === []
 * // result.duplicatePlayers === []
 *
 * @example
 * // Missing player - C has no scorer
 * const result = validateScoringPairsCoverage(
 *   [
 *     { scorerId: 'A', playerId: 'B' },
 *     { scorerId: 'B', playerId: 'A' },
 *   ],
 *   ['A', 'B', 'C']
 * );
 * // result.isValid === false
 * // result.missingPlayers === ['C']
 *
 * @example
 * // Duplicate - B is scored by both A and C
 * const result = validateScoringPairsCoverage(
 *   [
 *     { scorerId: 'A', playerId: 'B' },
 *     { scorerId: 'C', playerId: 'B' },
 *   ],
 *   ['A', 'B', 'C']
 * );
 * // result.isValid === false
 * // result.duplicatePlayers === ['B']
 * // result.missingPlayers === ['A', 'C']
 */
export function validateScoringPairsCoverage(
  pairs: ScoringPairCreateInput[],
  playerIds: string[]
): ScoringPairsCoverageResult {
  const playerIdSet = new Set(playerIds);

  // Track how many times each player is being scored
  const playersBeingScored: Map<string, number> = new Map();

  // Track how many times each player is scoring
  const playersScoring: Map<string, number> = new Map();

  // Initialize counts to 0
  for (const playerId of playerIds) {
    playersBeingScored.set(playerId, 0);
    playersScoring.set(playerId, 0);
  }

  // Count occurrences
  for (const pair of pairs) {
    // Only count if the player is in our expected list
    if (playerIdSet.has(pair.playerId)) {
      const currentCount = playersBeingScored.get(pair.playerId) || 0;
      playersBeingScored.set(pair.playerId, currentCount + 1);
    }

    if (playerIdSet.has(pair.scorerId)) {
      const currentCount = playersScoring.get(pair.scorerId) || 0;
      playersScoring.set(pair.scorerId, currentCount + 1);
    }
  }

  // Find issues
  const missingPlayers: string[] = [];
  const duplicatePlayers: string[] = [];
  const missingScorers: string[] = [];
  const duplicateScorers: string[] = [];

  for (const playerId of playerIds) {
    const scoredCount = playersBeingScored.get(playerId) || 0;
    const scoringCount = playersScoring.get(playerId) || 0;

    // Check if player is being scored
    if (scoredCount === 0) {
      missingPlayers.push(playerId);
    } else if (scoredCount > 1) {
      duplicatePlayers.push(playerId);
    }

    // Check if player is scoring someone
    if (scoringCount === 0) {
      missingScorers.push(playerId);
    } else if (scoringCount > 1) {
      duplicateScorers.push(playerId);
    }
  }

  // Valid if everyone is scored exactly once
  // Note: duplicateScorers is informational - in circular chains, everyone scores exactly once,
  // but in cross-team scenarios, some may score multiple
  const isValid = missingPlayers.length === 0 && duplicatePlayers.length === 0;

  return {
    isValid,
    missingPlayers,
    duplicatePlayers,
    missingScorers,
    duplicateScorers,
  };
}
