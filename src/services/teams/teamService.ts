/**
 * Team Service
 *
 * Handles CRUD operations for teams in competitions.
 * Features:
 * - Create teams with members
 * - Get competition teams with full player data
 * - Update team membership
 * - Delete teams (cascades to members)
 * - Auto-generate balanced teams using snake draft
 *
 * Split into focused modules:
 * - types.ts — Type definitions and helpers
 * - teamQueries.ts — Read operations
 * - teamMutations.ts — Write operations
 * - teamGeneration.ts — Auto-generation logic
 */

// Re-export types
export type { CreateTeamInput, TeamServiceError } from './types';

// Re-export queries
export { getCompetitionTeams, getTeamWithMembers } from './teamQueries';

// Re-export mutations
export {
  createTeam,
  updateTeamMembers,
  updateTeamName,
  deleteTeam,
  addTeamMember,
  removeTeamMember,
} from './teamMutations';

// Re-export generation
export { autoGenerateTeams } from './teamGeneration';

// Import for singleton object assembly
import { getCompetitionTeams, getTeamWithMembers } from './teamQueries';
import {
  createTeam,
  updateTeamMembers,
  updateTeamName,
  deleteTeam,
  addTeamMember,
  removeTeamMember,
} from './teamMutations';
import { autoGenerateTeams } from './teamGeneration';

// =====================================================
// SINGLETON EXPORT (for consistency with other services)
// =====================================================

/**
 * Team service with all CRUD operations
 */
export const teamService = {
  createTeam,
  getCompetitionTeams,
  getTeamWithMembers,
  updateTeamMembers,
  updateTeamName,
  deleteTeam,
  autoGenerateTeams,
  addTeamMember,
  removeTeamMember,
};

export default teamService;
