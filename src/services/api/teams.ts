/**
 * API Team Functions
 * Functions for team CRUD operations
 */

import { supabase } from '@/services/supabase/client';
import type { Team as DBTeam } from '@/types/database.types';
import type { Team, TeamCreateInput } from './types';

/**
 * Create a new team in a competition
 */
export async function createTeam(input: TeamCreateInput): Promise<Team> {
  console.log('[API] Creating team:', input);

  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) {
    throw new Error('You must be logged in to create a team');
  }

  // Create the team
  const { data: team, error: teamError } = await supabase
    .from('teams')
    .insert({
      competition_id: input.competitionId,
      name: input.name,
    } as unknown as never)
    .select()
    .single();

  if (teamError) {
    console.error('[API] Error creating team:', teamError);
    throw new Error(`Failed to create team: ${teamError.message}`);
  }

  const dbTeam = team as DBTeam;

  // Add members if provided
  if (input.memberIds && input.memberIds.length > 0) {
    const memberInserts = input.memberIds.map((playerId) => ({
      team_id: dbTeam.id,
      player_id: playerId,
    }));

    const { error: memberError } = await supabase
      .from('team_members')
      .insert(memberInserts as unknown as never);

    if (memberError) {
      console.warn('[API] Could not add team members:', memberError.message);
      // Don't fail - team is created, members can be added later
    }
  }

  return {
    id: dbTeam.id,
    competitionId: dbTeam.competition_id,
    name: dbTeam.name,
    createdAt: new Date(dbTeam.created_at),
    updatedAt: new Date(dbTeam.updated_at),
  };
}

/**
 * Get all teams for a competition
 */
export async function getTeams(competitionId: string): Promise<Team[]> {
  console.log('[API] Fetching teams for competition:', competitionId);

  const { data: teams, error } = await supabase
    .from('teams')
    .select(`
      *,
      team_members (
        team_id,
        player_id,
        joined_at,
        players:player_id (
          id,
          name,
          email,
          handicap,
          photo_url
        )
      )
    `)
    .eq('competition_id', competitionId)
    .order('name');

  if (error) {
    console.error('[API] Error fetching teams:', error);
    throw new Error(`Failed to fetch teams: ${error.message}`);
  }

  return (teams || []).map((t: any) => ({
    id: t.id,
    competitionId: t.competition_id,
    name: t.name,
    members: (t.team_members || []).map((m: any) => ({
      teamId: m.team_id,
      playerId: m.player_id,
      joinedAt: new Date(m.joined_at),
      player: m.players ? {
        id: m.players.id,
        name: m.players.name,
        email: m.players.email,
        handicap: m.players.handicap,
        photoUrl: m.players.photo_url,
        createdAt: new Date(),
        updatedAt: new Date(),
      } : undefined,
    })),
    createdAt: new Date(t.created_at),
    updatedAt: new Date(t.updated_at),
  }));
}

/**
 * Get a single team by ID
 */
export async function getTeam(teamId: string): Promise<Team | null> {
  console.log('[API] Fetching team:', teamId);

  const { data: team, error } = await supabase
    .from('teams')
    .select(`
      *,
      team_members (
        team_id,
        player_id,
        joined_at,
        players:player_id (
          id,
          name,
          email,
          handicap,
          photo_url
        )
      )
    `)
    .eq('id', teamId)
    .single();

  if (error) {
    if (error.code === 'PGRST116') {
      return null; // Not found
    }
    console.error('[API] Error fetching team:', error);
    throw new Error(`Failed to fetch team: ${error.message}`);
  }

  const t = team as any;
  return {
    id: t.id,
    competitionId: t.competition_id,
    name: t.name,
    members: (t.team_members || []).map((m: any) => ({
      teamId: m.team_id,
      playerId: m.player_id,
      joinedAt: new Date(m.joined_at),
      player: m.players ? {
        id: m.players.id,
        name: m.players.name,
        email: m.players.email,
        handicap: m.players.handicap,
        photoUrl: m.players.photo_url,
        createdAt: new Date(),
        updatedAt: new Date(),
      } : undefined,
    })),
    createdAt: new Date(t.created_at),
    updatedAt: new Date(t.updated_at),
  };
}

/**
 * Update a team's name
 */
export async function updateTeam(teamId: string, updates: { name?: string }): Promise<Team> {
  console.log('[API] Updating team:', teamId, updates);

  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) {
    throw new Error('You must be logged in to update a team');
  }

  const { data: team, error } = await supabase
    .from('teams')
    .update({
      name: updates.name,
    } as unknown as never)
    .eq('id', teamId)
    .select()
    .single();

  if (error) {
    console.error('[API] Error updating team:', error);
    throw new Error(`Failed to update team: ${error.message}`);
  }

  const dbTeam = team as DBTeam;
  return {
    id: dbTeam.id,
    competitionId: dbTeam.competition_id,
    name: dbTeam.name,
    createdAt: new Date(dbTeam.created_at),
    updatedAt: new Date(dbTeam.updated_at),
  };
}

/**
 * Delete a team
 */
export async function deleteTeam(teamId: string): Promise<void> {
  console.log('[API] Deleting team:', teamId);

  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) {
    throw new Error('You must be logged in to delete a team');
  }

  // Team members will be cascade-deleted by the database
  const { error } = await supabase
    .from('teams')
    .delete()
    .eq('id', teamId);

  if (error) {
    console.error('[API] Error deleting team:', error);
    throw new Error(`Failed to delete team: ${error.message}`);
  }
}

/**
 * Add a member to a team
 */
export async function addTeamMember(teamId: string, playerId: string): Promise<void> {
  console.log('[API] Adding member to team:', teamId, playerId);

  const { error } = await supabase
    .from('team_members')
    .insert({
      team_id: teamId,
      player_id: playerId,
    } as unknown as never);

  if (error) {
    console.error('[API] Error adding team member:', error);
    throw new Error(`Failed to add team member: ${error.message}`);
  }
}

/**
 * Remove a member from a team
 */
export async function removeTeamMember(teamId: string, playerId: string): Promise<void> {
  console.log('[API] Removing member from team:', teamId, playerId);

  const { error } = await supabase
    .from('team_members')
    .delete()
    .eq('team_id', teamId)
    .eq('player_id', playerId);

  if (error) {
    console.error('[API] Error removing team member:', error);
    throw new Error(`Failed to remove team member: ${error.message}`);
  }
}
