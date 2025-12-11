/**
 * Teams Service Module
 *
 * Re-exports all team-related services and types.
 */

export {
  teamService,
  createTeam,
  getCompetitionTeams,
  getTeamWithMembers,
  updateTeamMembers,
  updateTeamName,
  deleteTeam,
  autoGenerateTeams,
} from './teamService';

export type { CreateTeamInput, TeamServiceError } from './teamService';
