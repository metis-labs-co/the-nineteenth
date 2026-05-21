/**
 * Team Queries
 *
 * Read operations for teams in competitions.
 * - Get competition teams with full player data
 * - Get single team with members
 */

import { supabase } from '@/services/supabase/client';
import type { TeamWithMembers } from '@/types/database.types';
import { createModuleLogger } from '@/utils/debugLogger';
import { createError } from '@/services/errors';
import type { TeamQueryRow, TeamMemberQueryRow } from './types';

const logger = createModuleLogger('TeamService');

// =====================================================
// QUERY FUNCTIONS
// =====================================================

/**
 * Get all teams for a competition with full player data
 *
 * @param competitionId - Competition UUID
 * @returns Array of teams with members and player details
 * @throws TeamServiceError if query fails
 *
 * @example
 * ```typescript
 * const teams = await getCompetitionTeams('comp-123');
 * teams.forEach(team => {
 *   console.log(team.name, team.members.map(m => m.player?.name));
 * });
 * ```
 */
export async function getCompetitionTeams(
  competitionId: string
): Promise<TeamWithMembers[]> {
  if (!competitionId) {
    throw createError('Competition ID is required', 'VALIDATION');
  }

  // Get teams with members and player data in a single query
  const { data: teams, error: teamsError } = await supabase
    .from('teams')
    .select(
      `
      *,
      team_members (
        team_id,
        player_id,
        joined_at,
        player:players (*)
      )
    `
    )
    .eq('competition_id', competitionId)
    .order('name');

  if (teamsError) {
    logger.error('Failed to fetch competition teams', teamsError);
    throw createError(
      `Failed to fetch competition teams: ${teamsError.message}`,
      'DATABASE'
    );
  }

  // Transform response to TeamWithMembers format
  const typedTeams = (teams as TeamQueryRow[]) || [];
  return typedTeams.map((team) => ({
    id: team.id,
    competition_id: team.competition_id,
    name: team.name,
    color: team.color ?? null,
    created_at: team.created_at,
    updated_at: team.updated_at,
    members: (team.team_members || []).map((member: TeamMemberQueryRow) => ({
      team_id: member.team_id,
      player_id: member.player_id,
      joined_at: member.joined_at,
      player: member.player ?? undefined,
    })),
  }));
}

/**
 * Get a single team with members
 *
 * @param teamId - Team UUID
 * @returns Team with members and player details
 * @throws TeamServiceError if team not found or query fails
 */
export async function getTeamWithMembers(
  teamId: string
): Promise<TeamWithMembers> {
  if (!teamId) {
    throw createError('Team ID is required', 'VALIDATION');
  }

  const { data: team, error } = await supabase
    .from('teams')
    .select(
      `
      *,
      team_members (
        team_id,
        player_id,
        joined_at,
        player:players (*)
      )
    `
    )
    .eq('id', teamId)
    .single();

  if (error) {
    if (error.code === 'PGRST116') {
      throw createError(`Team not found: ${teamId}`, 'NOT_FOUND');
    }
    logger.error('Failed to fetch team', error);
    throw createError(`Failed to fetch team: ${error.message}`, 'DATABASE');
  }

  const teamData = team as TeamQueryRow;

  return {
    id: teamData.id,
    competition_id: teamData.competition_id,
    name: teamData.name,
    color: teamData.color ?? null,
    created_at: teamData.created_at,
    updated_at: teamData.updated_at,
    members: (teamData.team_members || []).map((member: TeamMemberQueryRow) => ({
      team_id: member.team_id,
      player_id: member.player_id,
      joined_at: member.joined_at,
      player: member.player ?? undefined,
    })),
  };
}
