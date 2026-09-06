// src/hooks/moderation/useBlockedUsers.ts
import { useQuery } from '@tanstack/react-query';

import { supabase } from '@/services/supabase/client';
import { CACHE_TIMES } from '@/constants/cacheConfig';

export interface BlockedUser {
  blocked_id: string;
  created_at: string;
  player: { id: string; name: string; photo_url: string | null } | null;
}

/** The blocked list backing the management screen. */
export function useBlockedUsers() {
  return useQuery({
    queryKey: ['blocked-users'],
    queryFn: async (): Promise<BlockedUser[]> => {
      const { data, error } = await (supabase as any)
        .from('user_blocks')
        .select('blocked_id, created_at, player:players!user_blocks_blocked_id_fkey(id, name, photo_url)')
        .order('created_at', { ascending: false });
      if (error) throw error;
      return (data ?? []) as BlockedUser[];
    },
    staleTime: CACHE_TIMES.MODERATE,
  });
}
