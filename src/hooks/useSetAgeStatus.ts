import { useCallback } from 'react';
import { useQueryClient } from '@tanstack/react-query';

import { supabase } from '@/services/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { authKeys } from '@/hooks/queryKeys';
import type { AgeStatus, AgeSource } from '@/services/age';

/**
 * Persists the derived age band.
 *
 * ⚠️ Only the band is sent. The date of birth that produced it must never reach
 * this hook, the database, analytics, or any log line.
 *
 * Writes go through the set_age_status RPC rather than a direct update: a
 * trigger on players rejects age_status changes from the ordinary profile-update
 * path, so every transition has a single auditable entry point.
 */
export function useSetAgeStatus() {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  const setStatus = useCallback(
    async (status: AgeStatus, source: AgeSource) => {
      // `as any`: set_age_status is absent from the generated database types
      // until 20260904000000 is applied and types are regenerated.
      const { error } = await (supabase as any).rpc('set_age_status', {
        p_status: status,
        p_source: source,
      });
      if (error) throw error;

      if (user?.id) {
        await queryClient.invalidateQueries({ queryKey: authKeys.player(user.id) });
      }
    },
    [queryClient, user?.id]
  );

  return { setStatus };
}
