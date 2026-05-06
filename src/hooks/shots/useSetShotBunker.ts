/**
 * Mutation that flips shot_log.from_bunker to true on a single shot,
 * used by the V2 Phase B bunker-prompt fallback's "Yes" tap.
 *
 * Bypasses the shot_log_detect_bunker_before_insert trigger (which
 * fires on INSERT only) — manual user choice is authoritative.
 *
 * RLS: shot_log_update permits UPDATE on own shots in 'in-progress'
 * rounds, which matches the prompt's caller context.
 */

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/services/supabase/client';
import { shotLogKeys } from '@/hooks/queryKeys';

// Until the supabase Database types are regenerated post-migration,
// the generated client doesn't know about `from_bunker`. Cast to
// bypass the typed `update()` signature. Drop once gen:db-types runs.
const shotLogTable = () =>
  (supabase as unknown as { from: (table: string) => any }).from('shot_log');

interface SetShotBunkerInput {
  shotId: string;
}

export function useSetShotBunker() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ shotId }: SetShotBunkerInput) => {
      const { error } = await shotLogTable()
        .update({ from_bunker: true })
        .eq('id', shotId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: shotLogKeys.all });
      queryClient.invalidateQueries({ queryKey: ['stats', 'sandSave'] });
    },
  });
}
