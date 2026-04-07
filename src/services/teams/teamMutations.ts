/**
 * Team Mutations
 *
 * Write operations for teams in competitions.
 * - Create teams with members
 * - Update team membership and name
 * - Delete teams
 * - Add/remove individual members
 */

import { supabase } from '@/services/supabase/client';
import type {
  Team,
  TeamWithMembers,
} from '@/types/database.types';
import { createModuleLogger } from '@/utils/debugLogger';
import { createError } from './types';
import type { CreateTeamInput } from './types';
import { getTeamWithMembers } from './teamQueries';

const logger = createModuleLogger('TeamService');

// =====================================================
// CREATE / UPDATE / DELETE
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
    logger.error('Failed to create team', teamError);
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

    logger.error('Failed to add team members', membersError);
    throw createError(
      `Failed to add team members: ${membersError.message}`,
      'DATABASE'
    );
  }

  // Fetch the complete team with members
  return getTeamWithMembers(createdTeam.id);
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
    logger.error('Failed to delete existing members', deleteError);
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
    logger.error('Failed to insert new members', insertError);
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
    logger.error('Failed to delete team members', membersError);
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
    logger.error('Failed to delete team', teamError);
    throw createError(
      `Failed to delete team: ${teamError.message}`,
      'DATABASE'
    );
  }
}

/**
 * Add a single member to a team
 *
 * @param teamId - Team UUID
 * @param playerId - Player UUID to add
 * @throws TeamServiceError if operation fails
 *
 * @example
 * ```typescript
 * await addTeamMember('team-123', 'player-456');
 * ```
 */
export async function addTeamMember(
  teamId: string,
  playerId: string
): Promise<void> {
  if (!teamId) {
    throw createError('Team ID is required', 'VALIDATION');
  }
  if (!playerId) {
    throw createError('Player ID is required', 'VALIDATION');
  }

  const { error } = await supabase
    .from('team_members')
    .insert({
      team_id: teamId,
      player_id: playerId,
    } as unknown as never);

  if (error) {
    if (error.code === '23505') {
      // Player already in team - not an error
      return;
    }
    logger.error('Failed to add team member', error);
    throw createError(
      `Failed to add team member: ${error.message}`,
      'DATABASE'
    );
  }
}

/**
 * Remove a single member from a team
 *
 * @param teamId - Team UUID
 * @param playerId - Player UUID to remove
 * @throws TeamServiceError if operation fails
 *
 * @example
 * ```typescript
 * await removeTeamMember('team-123', 'player-456');
 * ```
 */
export async function removeTeamMember(
  teamId: string,
  playerId: string
): Promise<void> {
  if (!teamId) {
    throw createError('Team ID is required', 'VALIDATION');
  }
  if (!playerId) {
    throw createError('Player ID is required', 'VALIDATION');
  }

  const { error } = await supabase
    .from('team_members')
    .delete()
    .eq('team_id', teamId)
    .eq('player_id', playerId);

  if (error) {
    logger.error('Failed to remove team member', error);
    throw createError(
      `Failed to remove team member: ${error.message}`,
      'DATABASE'
    );
  }
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
    logger.error('Failed to update team name', error);
    throw createError(
      `Failed to update team name: ${error.message}`,
      'DATABASE'
    );
  }

  return team as Team;
}
