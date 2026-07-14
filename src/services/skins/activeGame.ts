/**
 * Shared skins active-game data access.
 *
 * Both useActiveSkinsGameForRound and useActiveSkinsGameForSubMatch were ~95%
 * identical: fetch the single active skins game for a scope, then resolve its
 * participants (individual players, or teams with members). These helpers hold
 * that shared logic so the hooks are thin wrappers.
 */

import { supabase } from '@/services/supabase/client';
import { fetchPlayerListByIds } from '@/services/api/players';
import { createError } from '@/services/errors';
import type {
  SkinsGame,
  SkinsGameWithParticipants,
  SkinsGameWithTeamParticipants,
  SkinsParticipant,
  SkinsTeamParticipant,
} from '@/types/database/skins.types';

/** Row shape for the nested team → members → player select. */
interface TeamWithMembersRow {
  id: string;
  name: string;
  team_members?: {
    player_id: string;
    players: { id: string; name: string; handicap: number | null } | null;
  }[];
}

/** Nested `teams` select that pulls each member's player id/name/handicap. */
export const TEAM_WITH_MEMBERS_SELECT = `
  id,
  name,
  team_members (
    player_id,
    players:player_id (
      id,
      name,
      handicap
    )
  )
` as const;

/**
 * Fetch the single active skins game for a round or a sub-match (the most
 * recent one, though there should be at most one). Returns null when none
 * exists. Throws a DATABASE error on a query failure.
 */
export async function fetchActiveSkinsGame(
  scope: { roundId: string } | { subMatchId: string }
): Promise<SkinsGame | null> {
  const base = supabase.from('skins_games').select('*');
  const scoped =
    'roundId' in scope
      ? base.eq('round_id', scope.roundId)
      : base.eq('sub_match_id', scope.subMatchId);

  const { data, error } = await scoped
    .eq('status', 'active')
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) {
    console.error('[fetchActiveSkinsGame] Database error:', error);
    throw createError(`Failed to fetch active skins game: ${error.message}`, 'DATABASE');
  }

  return (data as unknown as SkinsGame | null) ?? null;
}

/**
 * Resolve a skins game's participants into the display shape: team participants
 * (with members) for a team game, otherwise individual participants. A failed
 * team fetch is logged and yields empty teams rather than throwing, matching the
 * prior hook behaviour.
 */
export async function resolveSkinsParticipants(
  game: SkinsGame
): Promise<SkinsGameWithParticipants | SkinsGameWithTeamParticipants> {
  if (game.is_team_skins && game.participant_team_ids?.length) {
    const { data: rawTeams, error: teamsError } = await supabase
      .from('teams')
      .select(TEAM_WITH_MEMBERS_SELECT)
      .in('id', game.participant_team_ids);

    if (teamsError) {
      console.error('[resolveSkinsParticipants] Failed to fetch team participants:', teamsError);
    }

    const teams = (rawTeams ?? []) as unknown as TeamWithMembersRow[];

    const teamParticipants: SkinsTeamParticipant[] = teams.map((team) => ({
      id: team.id,
      name: team.name,
      members: (team.team_members ?? []).map((tm) => ({
        id: tm.player_id,
        name: tm.players?.name ?? 'Unknown',
        handicap: tm.players?.handicap ?? null,
      })),
    }));

    return {
      ...game,
      participants: [],
      teams: teamParticipants,
    } as SkinsGameWithTeamParticipants;
  }

  const participants: SkinsParticipant[] = await fetchPlayerListByIds(game.participant_ids);

  return {
    ...game,
    participants,
  } as SkinsGameWithParticipants;
}
