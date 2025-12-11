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
 */

import { supabase } from '@/services/supabase/client';
import { generateBalancedTeams } from '@/utils/teamGeneration';
import type {
  Team,
  TeamWithMembers,
  Player,
} from '@/types/database.types';
import type { Player as AppPlayer } from '@/types';

// =====================================================
// TYPES
// =====================================================

export interface CreateTeamInput {
  competitionId: string;
  name: string;
  memberIds: string[];
}

export interface TeamServiceError extends Error {
  code: 'NOT_FOUND' | 'DUPLICATE' | 'VALIDATION' | 'DATABASE' | 'UNKNOWN';
}

// =====================================================
// HELPER FUNCTIONS
// =====================================================

/**
 * Creates a typed TeamServiceError
 */
function createError(
  message: string,
  code: TeamServiceError['code']
): TeamServiceError {
  const error = new Error(message) as TeamServiceError;
  error.code = code;
  return error;
}

/**
 * Convert database Player to app Player format
 */
function toAppPlayer(dbPlayer: Player): AppPlayer {
  return {
    id: dbPlayer.id,
    name: dbPlayer.name,
    email: dbPlayer.email,
    phone: dbPlayer.phone ?? undefined,
    handicap: dbPlayer.handicap,
    photoUrl: dbPlayer.photo_url ?? undefined,
    createdAt: new Date(dbPlayer.created_at),
    updatedAt: new Date(dbPlayer.updated_at),
  };
}

// =====================================================
// SERVICE FUNCTIONS
// =====================================================

/**
 * Create a new team with members
 *
 * @param input - Team creation data (competitionId, name, memberIds)
 * @returns Created team with members populated
 * @throws TeamServiceError if creation fails
 *
 * @example
 * ```typescript
 * const team = await createTeam({
 *   competitionId: 'comp-123',
 *   name: 'Team Alpha',
 *   memberIds: ['player-1', 'player-2'],
 * });
 * ```
 */
export async function createTeam(
  input: CreateTeamInput
): Promise<TeamWithMembers> {
  const { competitionId, name, memberIds } = input;

  // Validate input
  if (!competitionId) {
    throw createError('Competition ID is required', 'VALIDATION');
  }
  if (!name || name.trim().length === 0) {
    throw createError('Team name is required', 'VALIDATION');
  }
  if (!memberIds || memberIds.length === 0) {
    throw createError('At least one team member is required', 'VALIDATION');
  }

  // Insert team
  const { data: team, error: teamError } = await supabase
    .from('teams')
    .insert({
      competition_id: competitionId,
      name: name.trim(),
    } as unknown as never)
    .select()
    .single();

  if (teamError) {
    if (teamError.code === '23505') {
      // Unique constraint violation
      throw createError(
        `A team named "${name}" already exists in this competition`,
        'DUPLICATE'
      );
    }
    console.error('[TeamService] Failed to create team:', teamError);
    throw createError(
      `Failed to create team: ${teamError.message}`,
      'DATABASE'
    );
  }

  const createdTeam = team as Team;

  // Insert team members
  const teamMemberInserts = memberIds.map((playerId) => ({
    team_id: createdTeam.id,
    player_id: playerId,
  }));

  const { error: membersError } = await supabase
    .from('team_members')
    .insert(teamMemberInserts as unknown as never);

  if (membersError) {
    // Rollback: delete the team we just created
    await supabase.from('teams').delete().eq('id', createdTeam.id);

    console.error('[TeamService] Failed to add team members:', membersError);
    throw createError(
      `Failed to add team members: ${membersError.message}`,
      'DATABASE'
    );
  }

  // Fetch the complete team with members
  return getTeamWithMembers(createdTeam.id);
}

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
    console.error('[TeamService] Failed to fetch competition teams:', teamsError);
    throw createError(
      `Failed to fetch competition teams: ${teamsError.message}`,
      'DATABASE'
    );
  }

  // Transform response to TeamWithMembers format
  return ((teams as any[]) || []).map((team) => ({
    id: team.id,
    competition_id: team.competition_id,
    name: team.name,
    created_at: team.created_at,
    updated_at: team.updated_at,
    members: (team.team_members || []).map((member: any) => ({
      team_id: member.team_id,
      player_id: member.player_id,
      joined_at: member.joined_at,
      player: member.player as Player | undefined,
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
    console.error('[TeamService] Failed to fetch team:', error);
    throw createError(`Failed to fetch team: ${error.message}`, 'DATABASE');
  }

  const teamData = team as any;

  return {
    id: teamData.id,
    competition_id: teamData.competition_id,
    name: teamData.name,
    created_at: teamData.created_at,
    updated_at: teamData.updated_at,
    members: (teamData.team_members || []).map((member: any) => ({
      team_id: member.team_id,
      player_id: member.player_id,
      joined_at: member.joined_at,
      player: member.player as Player | undefined,
    })),
  };
}

/**
 * Update team members (replace all members)
 *
 * @param teamId - Team UUID
 * @param memberIds - New array of player IDs
 * @returns Updated team with members
 * @throws TeamServiceError if update fails
 *
 * @example
 * ```typescript
 * const updatedTeam = await updateTeamMembers('team-123', ['player-3', 'player-4']);
 * ```
 */
export async function updateTeamMembers(
  teamId: string,
  memberIds: string[]
): Promise<TeamWithMembers> {
  if (!teamId) {
    throw createError('Team ID is required', 'VALIDATION');
  }
  if (!memberIds || memberIds.length === 0) {
    throw createError('At least one team member is required', 'VALIDATION');
  }

  // Verify team exists
  const { data: existingTeam, error: fetchError } = await supabase
    .from('teams')
    .select('id')
    .eq('id', teamId)
    .single();

  if (fetchError || !existingTeam) {
    throw createError(`Team not found: ${teamId}`, 'NOT_FOUND');
  }

  // Delete existing members
  const { error: deleteError } = await supabase
    .from('team_members')
    .delete()
    .eq('team_id', teamId);

  if (deleteError) {
    console.error('[TeamService] Failed to delete existing members:', deleteError);
    throw createError(
      `Failed to update team members: ${deleteError.message}`,
      'DATABASE'
    );
  }

  // Insert new members
  const teamMemberInserts = memberIds.map((playerId) => ({
    team_id: teamId,
    player_id: playerId,
  }));

  const { error: insertError } = await supabase
    .from('team_members')
    .insert(teamMemberInserts as unknown as never);

  if (insertError) {
    console.error('[TeamService] Failed to insert new members:', insertError);
    throw createError(
      `Failed to update team members: ${insertError.message}`,
      'DATABASE'
    );
  }

  // Return updated team
  return getTeamWithMembers(teamId);
}

/**
 * Delete a team and all its members
 *
 * Cascade delete is handled by the database foreign key constraint,
 * but we delete members explicitly for clarity and to handle any
 * databases without cascade configured.
 *
 * @param teamId - Team UUID
 * @throws TeamServiceError if deletion fails
 *
 * @example
 * ```typescript
 * await deleteTeam('team-123');
 * ```
 */
export async function deleteTeam(teamId: string): Promise<void> {
  if (!teamId) {
    throw createError('Team ID is required', 'VALIDATION');
  }

  // Verify team exists
  const { data: existingTeam, error: fetchError } = await supabase
    .from('teams')
    .select('id')
    .eq('id', teamId)
    .single();

  if (fetchError || !existingTeam) {
    throw createError(`Team not found: ${teamId}`, 'NOT_FOUND');
  }

  // Delete members first (explicit cascade)
  const { error: membersError } = await supabase
    .from('team_members')
    .delete()
    .eq('team_id', teamId);

  if (membersError) {
    console.error('[TeamService] Failed to delete team members:', membersError);
    throw createError(
      `Failed to delete team members: ${membersError.message}`,
      'DATABASE'
    );
  }

  // Delete team
  const { error: teamError } = await supabase
    .from('teams')
    .delete()
    .eq('id', teamId);

  if (teamError) {
    console.error('[TeamService] Failed to delete team:', teamError);
    throw createError(
      `Failed to delete team: ${teamError.message}`,
      'DATABASE'
    );
  }
}

/**
 * Auto-generate balanced teams for a competition
 *
 * Uses snake draft algorithm to create teams balanced by handicap.
 * Teams are named sequentially (Team 1, Team 2, etc.)
 *
 * @param competitionId - Competition UUID
 * @param teamSize - Number of players per team (2, 3, or 4)
 * @returns Array of created teams with members
 * @throws TeamServiceError if generation fails
 *
 * @example
 * ```typescript
 * // Create teams of 2 players each
 * const teams = await autoGenerateTeams('comp-123', 2);
 * console.log(`Created ${teams.length} teams`);
 * ```
 */
export async function autoGenerateTeams(
  competitionId: string,
  teamSize: 2 | 3 | 4
): Promise<TeamWithMembers[]> {
  if (!competitionId) {
    throw createError('Competition ID is required', 'VALIDATION');
  }
  if (![2, 3, 4].includes(teamSize)) {
    throw createError('Team size must be 2, 3, or 4', 'VALIDATION');
  }

  // Delete all existing teams for this competition first
  const existingTeams = await getCompetitionTeams(competitionId);
  for (const team of existingTeams) {
    await deleteTeam(team.id);
  }

  // Fetch competition players with accepted status
  const { data: competitionPlayers, error: playersError } = await supabase
    .from('competition_players')
    .select(
      `
      player_id,
      player:players (*)
    `
    )
    .eq('competition_id', competitionId)
    .eq('status', 'accepted');

  if (playersError) {
    console.error('[TeamService] Failed to fetch competition players:', playersError);
    throw createError(
      `Failed to fetch competition players: ${playersError.message}`,
      'DATABASE'
    );
  }

  if (!competitionPlayers || competitionPlayers.length === 0) {
    throw createError(
      'No accepted players found in this competition',
      'VALIDATION'
    );
  }

  // Extract player data and convert to app Player format
  const dbPlayers = (competitionPlayers as any[])
    .map((cp) => cp.player as Player)
    .filter((p): p is Player => p !== null);

  const players: AppPlayer[] = dbPlayers.map(toAppPlayer);

  if (players.length < teamSize) {
    throw createError(
      `Not enough players (${players.length}) for team size of ${teamSize}`,
      'VALIDATION'
    );
  }

  // Generate balanced teams using snake draft
  const generatedTeams = generateBalancedTeams(players, {
    teamSize,
    balanceByHandicap: true,
  });

  // Create teams in database
  const createdTeams: TeamWithMembers[] = [];

  for (const generated of generatedTeams) {
    try {
      const team = await createTeam({
        competitionId,
        name: generated.name,
        memberIds: generated.members.map((m) => m.id),
      });
      createdTeams.push(team);
    } catch (error) {
      // If team creation fails (e.g., duplicate name), clean up created teams
      for (const created of createdTeams) {
        try {
          await deleteTeam(created.id);
        } catch {
          // Ignore cleanup errors
        }
      }
      throw error;
    }
  }

  return createdTeams;
}

/**
 * Update a team's name
 *
 * @param teamId - Team UUID
 * @param name - New team name
 * @returns Updated team
 * @throws TeamServiceError if update fails
 */
export async function updateTeamName(
  teamId: string,
  name: string
): Promise<Team> {
  if (!teamId) {
    throw createError('Team ID is required', 'VALIDATION');
  }
  if (!name || name.trim().length === 0) {
    throw createError('Team name is required', 'VALIDATION');
  }

  const { data: team, error } = await supabase
    .from('teams')
    .update({ name: name.trim() } as unknown as never)
    .eq('id', teamId)
    .select()
    .single();

  if (error) {
    if (error.code === 'PGRST116') {
      throw createError(`Team not found: ${teamId}`, 'NOT_FOUND');
    }
    if (error.code === '23505') {
      throw createError(
        `A team named "${name}" already exists in this competition`,
        'DUPLICATE'
      );
    }
    console.error('[TeamService] Failed to update team name:', error);
    throw createError(
      `Failed to update team name: ${error.message}`,
      'DATABASE'
    );
  }

  return team as Team;
}

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
};

export default teamService;
