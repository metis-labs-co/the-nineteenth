/**
 * Team Generation
 *
 * Auto-generation of balanced teams for competitions.
 * Uses snake draft algorithm to create teams balanced by handicap.
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
import { getCompetitionTeams } from './teamQueries';
import { createTeam, deleteTeam } from './teamMutations';

const logger = createModuleLogger('TeamService');

// =====================================================
// AUTO-GENERATION
// =====================================================

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

  // Extract player data and convert to app Player format
  const typedCompetitionPlayers = competitionPlayers as CompetitionPlayerQueryRow[];
  const dbPlayers = typedCompetitionPlayers
    .map((cp) => cp.player)
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
