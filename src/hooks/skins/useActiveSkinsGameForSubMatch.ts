/**
 * Skins Hooks - useActiveSkinsGameForSubMatch
 *
 * Fetches the (at most one) currently-active skins game for a sub-match,
 * including resolved participant or team participant detail. Mirrors the
 * shape of `useActiveSkinsGameForRound` but narrows scope to one sub-match.
 */

import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/services/supabase/client';
import { skinsKeys } from '@/hooks/queryKeys';
import { CACHE_TIMES, GC_TIMES } from '@/constants/cacheConfig';
import { createError } from '@/services/errors';
import type {
  SkinsGame,
  SkinsGameWithParticipants,
  SkinsGameWithTeamParticipants,
  SkinsParticipant,
  SkinsTeamParticipant,
} from '@/types/database/skins.types';

type SkinsGameRow = SkinsGame;

interface PlayerRow {
  id: string;
  name: string;
  handicap: number | null;
}

interface TeamWithMembersRow {
  id: string;
  name: string;
  team_members?: {
    player_id: string;
    players: PlayerRow | null;
  }[];
}

export function useActiveSkinsGameForSubMatch(subMatchId: string | undefined) {
  return useQuery({
    queryKey: skinsKeys.activeGameBySubMatch(subMatchId ?? ''),
    queryFn: async (): Promise<
      SkinsGameWithParticipants | SkinsGameWithTeamParticipants | null
    > => {
      if (!subMatchId) return null;

      const { data: rawGame, error } = await supabase
        .from('skins_games')
        .select('*')
        .eq('sub_match_id', subMatchId)
        .eq('status', 'active')
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (error) {
        throw createError(
          `Failed to fetch active sub-match skins game: ${error.message}`,
          'DATABASE'
        );
      }

      const game = rawGame as unknown as SkinsGameRow | null;
      if (!game) return null;

      // Team skins path — resolve participant teams from the teams table.
      if (game.is_team_skins && game.participant_team_ids?.length) {
        const { data: rawTeams, error: teamsError } = await supabase
          .from('teams')
          .select(`
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
          `)
          .in('id', game.participant_team_ids);

        if (teamsError) {
          console.error('[useActiveSkinsGameForSubMatch] team fetch failed:', teamsError);
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

      // Individual skins path.
      const { data: rawPlayers } = await supabase
        .from('players')
        .select('id, name, handicap')
        .in('id', game.participant_ids);

      const players = (rawPlayers ?? []) as unknown as PlayerRow[];
      const participants: SkinsParticipant[] = players.map((p) => ({
        id: p.id,
        name: p.name,
        handicap: p.handicap,
      }));

      return {
        ...game,
        participants,
      } as SkinsGameWithParticipants;
    },
    enabled: !!subMatchId,
    staleTime: CACHE_TIMES.SHORT,
    gcTime: GC_TIMES.SHORT,
    retry: 2,
    refetchOnWindowFocus: false,
  });
}
