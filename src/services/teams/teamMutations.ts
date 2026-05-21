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
import { createError } from '@/services/errors';
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
  const { competitionId, name, memberIds, color } = input;

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
      ...(color ? { color } : {}),
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
 * Clear all members from one or more teams without deleting the team rows.
 *
 * Unlike `updateTeamMembers`, this accepts the result of emptying a team —
 * used by the Teams tab's "Clear" action so organizers can wipe every
 * assignment and then reassign players manually via the add-players sheet.
 *
 * @param teamIds - Team UUIDs to empty
 * @throws TeamServiceError if deletion fails
 */
export async function clearTeamMembers(teamIds: string[]): Promise<void> {
  if (!teamIds || teamIds.length === 0) {
    return;
  }

  const { error } = await supabase
    .from('team_members')
    .delete()
    .in('team_id', teamIds);

  if (error) {
    logger.error('Failed to clear team members', error);
    throw createError(
      `Failed to clear teams: ${error.message}`,
      'DATABASE'
    );
  }
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
 * Update a team's editable metadata (name and/or colour)
 *
 * Only the fields present in `updates` are written. Empty/whitespace
 * names are rejected; an explicit `null` colour is allowed (clears).
 *
 * @param teamId - Team UUID
 * @param updates - Partial update payload ({ name?, color? })
 * @returns Updated team
 * @throws TeamServiceError if update fails
 */
export async function updateTeamMetadata(
  teamId: string,
  updates: { name?: string; color?: string | null }
): Promise<Team> {
  if (!teamId) {
    throw createError('Team ID is required', 'VALIDATION');
  }

  const patch: Record<string, string | null> = {};
  if (updates.name !== undefined) {
    if (!updates.name || updates.name.trim().length === 0) {
      throw createError('Team name is required', 'VALIDATION');
    }
    patch.name = updates.name.trim();
  }
  if (updates.color !== undefined) {
    patch.color = updates.color;
  }

  if (Object.keys(patch).length === 0) {
    throw createError('No updates provided', 'VALIDATION');
  }

  const { data: team, error } = await supabase
    .from('teams')
    .update(patch as unknown as never)
    .eq('id', teamId)
    .select()
    .single();

  if (error) {
    if (error.code === 'PGRST116') {
      throw createError(`Team not found: ${teamId}`, 'NOT_FOUND');
    }
    if (error.code === '23505') {
      throw createError(
        `A team named "${updates.name}" already exists in this competition`,
        'DUPLICATE'
      );
    }
    logger.error('Failed to update team metadata', error);
    throw createError(
      `Failed to update team: ${error.message}`,
      'DATABASE'
    );
  }

  return team as Team;
}
