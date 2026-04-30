/**
 * Skins Hooks - useFinalizeSkinsForSubMatch
 *
 * Wraps `finalizeSkinsForSubMatch` (a non-hook service helper) and
 * invalidates the relevant TanStack Query keys on success so the UI
 * refreshes once the game has been marked completed.
 */

import { useState, useCallback } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { skinsKeys } from '@/hooks/queryKeys';
import { finalizeSkinsForSubMatch } from '@/services/skins/finalizeForSubMatch';

export function useFinalizeSkinsForSubMatch() {
  const queryClient = useQueryClient();
  const [isFinalizing, setIsFinalizing] = useState(false);

  const finalize = useCallback(
    async (subMatchId: string) => {
      try {
        setIsFinalizing(true);
        const result = await finalizeSkinsForSubMatch(subMatchId);

        if (result.finalized && result.gameId) {
          await Promise.all([
            queryClient.invalidateQueries({ queryKey: skinsKeys.game(result.gameId) }),
            queryClient.invalidateQueries({ queryKey: skinsKeys.results(result.gameId) }),
            queryClient.invalidateQueries({ queryKey: skinsKeys.payouts(result.gameId) }),
            queryClient.invalidateQueries({ queryKey: skinsKeys.summary(result.gameId) }),
            queryClient.invalidateQueries({
              queryKey: skinsKeys.gamesBySubMatch(subMatchId),
            }),
            queryClient.invalidateQueries({
              queryKey: skinsKeys.activeGameBySubMatch(subMatchId),
            }),
          ]);
        }

        return result;
      } finally {
        setIsFinalizing(false);
      }
    },
    [queryClient]
  );

  return { finalizeSkinsForSubMatch: finalize, isFinalizing };
}
