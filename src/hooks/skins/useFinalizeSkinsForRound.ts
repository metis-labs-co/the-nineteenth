/**
 * Skins Hooks - useFinalizeSkinsForRound
 *
 * Hook to finalize a skins game when a round's scorecard is submitted.
 * Finds the active skins game for the round and triggers finalization.
 */

import { useState, useCallback } from 'react';
import { supabase } from '@/services/supabase/client';
import { useFinalizeSkinsGame } from './mutations';

/**
 * Hook to finalize skins game when scorecard is submitted
 */
export function useFinalizeSkinsForRound() {
  const finalizeSkinsGameMutation = useFinalizeSkinsGame();
  const [isFinalizing, setIsFinalizing] = useState(false);

  const finalizeSkinsForRound = useCallback(
    async (roundId: string): Promise<{ finalized: boolean; error?: string }> => {
      try {
        setIsFinalizing(true);

        const { data: rawSkinsGame, error: gameError } = await supabase
          .from('skins_games')
          .select('id, status')
          .eq('round_id', roundId)
          .eq('status', 'active')
          .order('created_at', { ascending: false })
          .limit(1)
          .single();

        const skinsGame = rawSkinsGame as unknown as { id: string; status: string } | null;

        if (gameError || !skinsGame) {
          return { finalized: false };
        }

        await finalizeSkinsGameMutation.mutateAsync({ gameId: skinsGame.id });

        return { finalized: true };
      } catch (error) {
        console.error('[useFinalizeSkinsForRound] Error finalizing skins:', error);
        return {
          finalized: false,
          error: error instanceof Error ? error.message : 'Unknown error',
        };
      } finally {
        setIsFinalizing(false);
      }
    },
    [finalizeSkinsGameMutation]
  );

  return {
    finalizeSkinsForRound,
    isFinalizing,
  };
}
