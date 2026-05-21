/**
 * Teams Service Module
 *
 * Re-exports all team-related services and types.
 *
 * This is the canonical team service. Do not use @/services/api/teams directly.
 */

export {
  teamService,
  createTeam,
  getCompetitionTeams,
  getTeamWithMembers,
  updateTeamMembers,
  updateTeamMetadata,
  clearTeamMembers,
  deleteTeam,
  autoGenerateTeams,
  addTeamMember,
  removeTeamMember,
} from './teamService';

export type { CreateTeamInput } from './teamService';
