/**
 * API Client for The Nineteenth
 *
 * This client provides a unified interface to all API operations.
 * Each domain has its own module, but this class exposes them through a single object.
 *
 * For direct function imports, use the domain-specific modules:
 * - @/services/api/competitions
 * - @/services/api/rounds
 * - @/services/api/permissions
 *
 * Team operations live in @/services/teams.
 */

import * as permissions from './permissions';
import * as competitions from './competitions';
import * as rounds from './rounds';

// Re-export types
export type {
  RoundCreateInput,
  TeamCreateInput,
  RoundResultInput,
  Team,
  TeamMember,
  RoundResult,
  PermissionCheckResult,
} from './types';

// Re-export mappers for external use
export { DEFAULT_POINT_SYSTEM } from './mappers';

/**
 * API Client class
 * Provides a unified interface to all API operations
 */
class ApiClient {
  // =====================================================
  // PERMISSION CHECK METHODS
  // =====================================================

  /**
   * Check if the current user can create a new competition
   * Calls the database function to verify against tier limits
   */
  checkCompetitionCreationPermission = permissions.checkCompetitionCreationPermission;

  /**
   * Check if a round can be added to a competition based on tier limits
   */
  checkCanAddRound = permissions.checkCanAddRound;

  /**
   * Check if a player can be added to a competition based on tier limits
   */
  checkCanAddPlayer = permissions.checkCanAddPlayer;

  // =====================================================
  // COMPETITION METHODS
  // =====================================================

  /**
   * Create a new competition with rounds and players
   */
  createCompetition = competitions.createCompetition;

  /**
   * Get all competitions for the current user
   */
  getCompetitions = competitions.getCompetitions;

  /**
   * Get a single competition by ID
   */
  getCompetition = competitions.getCompetition;

  // =====================================================
  // ROUND METHODS
  // =====================================================

  /**
   * Create a round within a competition
   */
  createRound = rounds.createRound;

  /**
   * Save round results (individual or team)
   */
  saveRoundResults = rounds.saveRoundResults;

  /**
   * Get round results for a round
   */
  getRoundResults = rounds.getRoundResults;

  /**
   * Get all round results for a competition
   */
  getCompetitionResults = rounds.getCompetitionResults;
}

// Export singleton instance
export const apiClient = new ApiClient();
