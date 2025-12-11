/**
 * API Services - Barrel Export
 *
 * Re-exports all API functionality for convenient imports
 */

// Export the main client singleton (primary usage)
export { apiClient } from './client';

// Export types
export type {
  RoundCreateInput,
  TeamCreateInput,
  RoundResultInput,
  Team,
  TeamMember,
  RoundResult,
  PermissionCheckResult,
} from './types';

// Export mappers and constants
export { DEFAULT_POINT_SYSTEM } from './mappers';
export {
  mapTeamModeToDb,
  mapTeamModeFromDb,
  convertPointSystemToConfig,
  convertPointSystemFromConfig,
} from './mappers';

// Export helpers for testing/utilities
export {
  generateInviteCode,
  formatDateForDB,
  formatTimeForDB,
  isValidUUID,
  delay,
} from './helpers';

// Export individual domain modules for direct imports
export * as competitionsApi from './competitions';
export * as teamsApi from './teams';
export * as roundsApi from './rounds';
export * as permissionsApi from './permissions';
