// src/hooks/moderation/useBlockUser.ts
import { useCallback, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';

import { supabase } from '@/services/supabase/client';

/**
 * Block and unblock other players.
 *
 * Blocking goes through the block_user RPC rather than a direct insert: it must
 * also delete any existing friendship, or the blocked user keeps round
 * visibility via is_friend() and keeps appearing in the activity feed.
 *
 * Unblocking is a plain delete. It does NOT restore the deleted friendship.
 */
export function useBlockUser() {
  const queryClient = useQueryClient();
  const [isBusy, setIsBusy] = useState(false);

  const invalidate = useCallback(async () => {
    await queryClient.invalidateQueries({ queryKey: ['blocked-users'] });
    await queryClient.invalidateQueries({ queryKey: ['friends'] });
    await queryClient.invalidateQueries({ queryKey: ['activity'] });
  }, [queryClient]);

  const block = useCallback(
    async (playerId: string) => {
      setIsBusy(true);
      try {
        // `as any`: block_user is absent from the generated database types until
        // 20260905000000 is applied and types are regenerated.
        const { error } = await (supabase as any).rpc('block_user', { p_blocked: playerId });
        if (error) throw error;
        await invalidate();
      } finally {
        setIsBusy(false);
      }
    },
    [invalidate]
  );

  const unblock = useCallback(
    async (playerId: string) => {
      setIsBusy(true);
      try {
        const { error } = await (supabase as any)
          .from('user_blocks')
          .delete()
          .match({ blocked_id: playerId });
        if (error) throw error;
        await invalidate();
      } finally {
        setIsBusy(false);
      }
    },
    [invalidate]
  );

  return { block, unblock, isBusy };
}
