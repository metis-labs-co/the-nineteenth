/**
 * Skins Hooks - Team Skins Processor
 *
 * Pure async function for processing team skins results.
 * Extracted from utilities.ts for focused responsibility.
 */

import { supabase } from '@/services/supabase/client';
import { prepareTeamHoleScores } from '@/utils/skinsCalculations';
import type { SkinsTeamInfo } from '@/utils/skinsCalculations';
import { useProcessTeamSkinsHole } from './mutations';
import type { ProcessSkinsResult } from './types';
import type { SkinsGame } from '@/types/database/skins.types';
import type { TeamFormat } from '@/types/database/enums';

// =====================================================
// LOCAL DB ROW TYPES
// =====================================================

/** Row shape for rounds with team fields */
interface RoundTeamRow {
  is_team_round?: boolean;
  team_format?: TeamFormat | null;
  team_config?: {
    teams?: Array<{ id: string; name: string; memberIds: string[] }>;
  } | null;
}

/** Row shape for player queries */
interface PlayerRow {
  id: string;
  name: string;
  handicap: number | null;
}

/** Row shape for team with members from the teams table */
interface TeamWithMembersRow {
  id: string;
  name: string;
  team_members?: Array<{
    player_id: string;
    players: PlayerRow | null;
  }>;
}

/**
 * Process team skins for a given hole.
 *
 * Resolves teams from multiple sources:
 * 1. participant_team_ids from the skins game
 * 2. teams table by round_id
 * 3. round.team_config (standalone rounds)
 *
 * Then prepares team hole scores and delegates to the mutation.
 */
export async function processTeamSkins(
  skinsGame: SkinsGame,
  roundId: string,
  holeNumber: number,
  scorecards: Record<string, { [holeNumber: string]: { strokes: number } | number }>,
  hole: { par: number; strokeIndex: number },
  processTeamSkinsHoleMutation: ReturnType<typeof useProcessTeamSkinsHole>
): Promise<ProcessSkinsResult> {
  const { data: rawRound, error: roundError } = await supabase
    .from('rounds')
    .select('team_format, team_config')
    .eq('id', roundId)
    .single();

  const round = rawRound as unknown as RoundTeamRow | null;

  if (roundError || !round?.team_format) {
    console.warn('[processTeamSkins] Could not get team format:', roundError);
    return { processed: false, error: 'Could not determine team format' };
  }

  const teamFormat = round.team_format as TeamFormat;

  // Try multiple sources for teams
  let teams: TeamWithMembersRow[] | null = null;
  let teamsError: { message?: string } | null = null;

  // Source 1: participant_team_ids from skins game
  if (skinsGame.participant_team_ids && skinsGame.participant_team_ids.length > 0) {
    const result = await supabase
      .from('teams')
      .select(`
        id,
        name,
        team_members (
          player_id,
          players (
            id,
            name,
            handicap
          )
        )
      `)
      .in('id', skinsGame.participant_team_ids);
    teams = (result.data ?? []) as unknown as TeamWithMembersRow[];
    teamsError = result.error;
  }

  // Source 2: teams table by round_id
  if (!teams || teams.length === 0) {
    const result = await supabase
      .from('teams')
      .select(`
        id,
        name,
        team_members (
          player_id,
          players (
            id,
            name,
            handicap
          )
        )
      `)
      .eq('round_id' as never, roundId);
    teams = (result.data ?? []) as unknown as TeamWithMembersRow[];
    teamsError = result.error;

    if (teams && teams.length > 0) {
      const teamIds = teams.map(t => t.id);
      await supabase
        .from('skins_games')
        .update({ participant_team_ids: teamIds } as never)
        .eq('id', skinsGame.id);
    }
  }

  // Source 3: round.team_config (standalone rounds)
  if (!teams || teams.length === 0) {
    const teamConfig = round?.team_config;

    if (teamConfig?.teams && teamConfig.teams.length > 0) {
      const allMemberIds = teamConfig.teams.flatMap(t => t.memberIds);
      const { data: rawPlayers } = await supabase
        .from('players')
        .select('id, name, handicap')
        .in('id', allMemberIds);

      const playersList = (rawPlayers ?? []) as unknown as PlayerRow[];
      const playerMap = new Map(playersList.map(p => [p.id, p]));

      teams = teamConfig.teams.map(team => ({
        id: team.id,
        name: team.name,
        team_members: team.memberIds.map(memberId => ({
          player_id: memberId,
          players: playerMap.get(memberId) ?? { id: memberId, name: 'Unknown', handicap: null },
        })),
      }));

      teamsError = null;
    }
  }

  if (teamsError || !teams || teams.length === 0) {
    console.warn('[processTeamSkins] Could not fetch teams:', teamsError);
    return { processed: false, error: 'Could not fetch teams' };
  }

  // Transform teams into SkinsTeamInfo format
  const teamsInfo: SkinsTeamInfo[] = teams.map((team) => {
    const members = (team.team_members ?? []).map((tm) => ({
      id: tm.player_id,
      handicap: tm.players?.handicap ?? null,
    }));

    return {
      id: team.id,
      member_ids: members.map((m) => m.id),
      members,
    };
  });

  const teamHoleScores = prepareTeamHoleScores(
    teamsInfo,
    scorecards,
    hole as { par: 3 | 4 | 5; strokeIndex: number },
    holeNumber,
    teamFormat
  );

  // Check if all teams have scores
  const teamsWithScores = Object.keys(teamHoleScores);
  const totalTeams = teams.length;
  if (teamsWithScores.length < totalTeams) {
    return { processed: false };
  }

  const result = await processTeamSkinsHoleMutation.mutateAsync({
    skinsGameId: skinsGame.id,
    holeNumber,
    teamScores: teamHoleScores,
    teamFormat,
    skipTeamValidation: true,
  });

  if (result.is_carryover) {
    return {
      processed: true,
      hasWinner: false,
      carryoverAmount: result.carryover_to_next,
    };
  } else if (result.team_winner_id) {
    const winningTeam = teams.find((t) => t.id === result.team_winner_id);
    return {
      processed: true,
      hasWinner: true,
      winnerName: winningTeam?.name ?? 'Unknown Team',
      winningsAmount: result.payout_amount,
    };
  }

  return { processed: true };
}
