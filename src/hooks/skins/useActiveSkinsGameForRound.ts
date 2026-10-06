/**
 * Skins Hooks - useActiveSkinsGameForRound
 *
 * Query hook to fetch the active skins game for a given round,
 * including participant details (individual or team).
 */

import { useQuery } from '@tanstack/react-query';
import {
  fetchActiveSkinsGame,
  resolveSkinsParticipants,
} from '@/services/skins/activeGame';
import { skinsKeys } from '@/hooks/queryKeys';
import { CACHE_TIMES, GC_TIMES } from '@/constants/cacheConfig';
import type {
  SkinsGameWithParticipants,
  SkinsGameWithTeamParticipants,
} from '@/types/database/skins.types';

/**
 * Utility hook to get the active skins game for a round
 */
export function useActiveSkinsGameForRound(roundId: string | undefined) {
  return useQuery({
    queryKey: [...skinsKeys.gamesByRound(roundId ?? ''), 'active'],
    queryFn: async (): Promise<SkinsGameWithParticipants | SkinsGameWithTeamParticipants | null> => {
      if (!roundId) return null;
      const game = await fetchActiveSkinsGame({ roundId });
      return game ? resolveSkinsParticipants(game) : null;
    },
    enabled: !!roundId,
    staleTime: CACHE_TIMES.SHORT,
    gcTime: GC_TIMES.SHORT,
    retry: 2,
    refetchOnWindowFocus: false,
  });
}
