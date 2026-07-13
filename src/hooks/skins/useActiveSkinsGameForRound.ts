/**
 * Skins Hooks - useActiveSkinsGameForRound
 *
 * Query hook to fetch the active skins game for a given round,
 * including participant details (individual or team).
 */

import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/services/supabase/client';
import { fetchPlayerListByIds } from '@/services/api/players';
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

// =====================================================
// LOCAL DB ROW TYPES
// =====================================================

/** Row shape returned from skins_games table queries */
type SkinsGameRow = SkinsGame;

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
  team_members?: {
    player_id: string;
    players: PlayerRow | null;
  }[];
}

/**
 * Utility hook to get the active skins game for a round
 */
export function useActiveSkinsGameForRound(roundId: string | undefined) {
  return useQuery({
    queryKey: [...skinsKeys.gamesByRound(roundId ?? ''), 'active'],
    queryFn: async (): Promise<SkinsGameWithParticipants | SkinsGameWithTeamParticipants | null> => {
      if (!roundId) {
        return null;
      }

      const { data: rawGame, error } = await supabase
        .from('skins_games')
        .select('*')
        .eq('round_id', roundId)
        .eq('status', 'active')
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      const game = rawGame as unknown as SkinsGameRow | null;

      if (error) {
        console.error('[useActiveSkinsGameForRound] Database error:', error);
        throw createError(`Failed to fetch active skins game: ${error.message}`, 'DATABASE');
      }

      if (!game) return null;

      // Check if this is a team skins game
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
          console.error('[useActiveSkinsGameForRound] Failed to fetch team participants:', teamsError);
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

      // Individual skins - fetch player participants
      const participants: SkinsParticipant[] = await fetchPlayerListByIds(
        game.participant_ids
      );

      return {
        ...game,
        participants,
      } as SkinsGameWithParticipants;
    },
    enabled: !!roundId,
    staleTime: CACHE_TIMES.SHORT,
    gcTime: GC_TIMES.SHORT,
    retry: 2,
    refetchOnWindowFocus: false,
  });
}
