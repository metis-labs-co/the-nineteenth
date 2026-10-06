/**
 * Skins Hooks - useActiveSkinsGameForSubMatch
 *
 * Fetches the (at most one) currently-active skins game for a sub-match,
 * including resolved participant or team participant detail. Mirrors the
 * shape of `useActiveSkinsGameForRound` but narrows scope to one sub-match.
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

export function useActiveSkinsGameForSubMatch(subMatchId: string | undefined) {
  return useQuery({
    queryKey: skinsKeys.activeGameBySubMatch(subMatchId ?? ''),
    queryFn: async (): Promise<
      SkinsGameWithParticipants | SkinsGameWithTeamParticipants | null
    > => {
      if (!subMatchId) return null;
      const game = await fetchActiveSkinsGame({ subMatchId });
      return game ? resolveSkinsParticipants(game) : null;
    },
    enabled: !!subMatchId,
    staleTime: CACHE_TIMES.SHORT,
    gcTime: GC_TIMES.SHORT,
    retry: 2,
    refetchOnWindowFocus: false,
  });
}
