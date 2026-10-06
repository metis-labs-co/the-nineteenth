/**
 * Skins Hooks - useSkinsGamesBySubMatch
 *
 * Lists every skins game (active + completed + cancelled) scoped to a single
 * sub-match. Mirrors `useSkinsGamesByRound` but narrows to one sub-match.
 */

import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/services/supabase/client';
import { fetchPlayersByIds } from '@/services/api/players';
import { skinsKeys } from '@/hooks/queryKeys';
import { CACHE_TIMES, GC_TIMES } from '@/constants/cacheConfig';
import { createError } from '@/services/errors';
import type {
  SkinsGame,
  SkinsGameWithParticipants,
  SkinsParticipant,
} from '@/types/database/skins.types';

type SkinsGameRow = SkinsGame;

export function useSkinsGamesBySubMatch(subMatchId: string | undefined) {
  return useQuery({
    queryKey: skinsKeys.gamesBySubMatch(subMatchId ?? ''),
    queryFn: async (): Promise<SkinsGameWithParticipants[]> => {
      if (!subMatchId) return [];

      const { data: rawGames, error } = await supabase
        .from('skins_games')
        .select('*')
        .eq('sub_match_id', subMatchId)
        .order('created_at', { ascending: false });

      if (error) {
        throw createError(`Failed to fetch sub-match skins games: ${error.message}`, 'DATABASE');
      }

      const games = (rawGames ?? []) as unknown as SkinsGameRow[];
      if (games.length === 0) return [];

      const allParticipantIds = [...new Set(games.flatMap((g) => g.participant_ids))];

      const playerMap = await fetchPlayersByIds(allParticipantIds);

      return games.map((game) => ({
        ...game,
        participants: game.participant_ids
          .map((id) => playerMap.get(id))
          .filter((p): p is SkinsParticipant => p !== undefined),
      })) as SkinsGameWithParticipants[];
    },
    enabled: !!subMatchId,
    staleTime: CACHE_TIMES.SHORT,
    gcTime: GC_TIMES.SHORT,
    retry: 2,
    refetchOnWindowFocus: false,
  });
}
