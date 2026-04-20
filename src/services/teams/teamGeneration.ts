/**
 * Team Generation
 *
 * Auto-generation of balanced teams for competitions.
 * Uses snake draft + local-search optimisation for handicap balance.
 */

import { supabase } from '@/services/supabase/client';
import { generateBalancedTeams } from '@/utils/teamGeneration';
import type {
  Player,
  TeamWithMembers,
} from '@/types/database.types';
import type { Player as AppPlayer } from '@/types';
import { createModuleLogger } from '@/utils/debugLogger';
import { createError, toAppPlayer } from './types';
import type { CompetitionPlayerQueryRow } from './types';
import { getCompetitionTeams, getTeamWithMembers } from './teamQueries';
import { createTeam, deleteTeam, updateTeamMembers } from './teamMutations';

const logger = createModuleLogger('TeamService');

// =====================================================
// INPUT / OPTIONS
// =====================================================

export interface AutoGenerateTeamsOptions {
  competitionId: string;
  /** Number of teams to produce. Size per team is derived from player count. */
  numTeams: number;
  /**
   * When true, keep existing team rows (ids + names) and only replace their
   * memberships. When false (default), delete all existing teams and create
   * fresh sequential "Team N" rows.
   */
  preserveNames?: boolean;
}

// =====================================================
// AUTO-GENERATION
// =====================================================

/**
 * Auto-generate balanced teams for a competition.
 *
 * Fetches accepted players, runs the snake draft + optimiser, then either
 * wipes & recreates the teams (destructive) or keeps existing rows and
 * rebalances memberships in place (non-destructive, `preserveNames: true`).
 *
 * @throws TeamServiceError when validation, fetch, or persistence fails
 */
export async function autoGenerateTeams(
  options: AutoGenerateTeamsOptions
): Promise<TeamWithMembers[]> {
  const { competitionId, numTeams, preserveNames = false } = options;

  if (!competitionId) {
    throw createError('Competition ID is required', 'VALIDATION');
  }
  if (!Number.isInteger(numTeams) || numTeams < 2) {
    throw createError('numTeams must be an integer >= 2', 'VALIDATION');
  }

  // Fetch competition players (accepted only)
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
    logger.error('Failed to fetch competition players', playersError);
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

  const typedCompetitionPlayers = competitionPlayers as CompetitionPlayerQueryRow[];
  const dbPlayers = typedCompetitionPlayers
    .map((cp) => cp.player)
    .filter((p): p is Player => p !== null);
  const players: AppPlayer[] = dbPlayers.map(toAppPlayer);

  if (players.length < numTeams) {
    throw createError(
      `Not enough players (${players.length}) for ${numTeams} teams`,
      'VALIDATION'
    );
  }

  // Generate balanced assignments. teamSize is a hint here — numTeams wins.
  const generatedTeams = generateBalancedTeams(players, {
    teamSize: 2,
    balanceByHandicap: true,
    numTeams,
  });

  const existingTeams = await getCompetitionTeams(competitionId);

  // Non-destructive path: reuse existing rows where possible, replace members.
  // Only viable when the requested count matches what already exists.
  if (
    preserveNames &&
    existingTeams.length === generatedTeams.length &&
    existingTeams.length > 0
  ) {
    const refreshed: TeamWithMembers[] = [];
    for (let i = 0; i < existingTeams.length; i++) {
      const target = existingTeams[i];
      const generated = generatedTeams[i];
      const memberIds = generated.members.map((m) => m.id);
      const updated = await updateTeamMembers(target.id, memberIds);
      refreshed.push(updated);
    }
    return refreshed;
  }

  // Destructive path: wipe existing and create fresh sequentially named teams.
  for (const team of existingTeams) {
    await deleteTeam(team.id);
  }

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
      // Rollback on partial failure
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

// Re-export to keep the import shape used by tests that touch single teams
export { getTeamWithMembers };
