import { useMutation, useQueryClient } from '@tanstack/react-query';

import { supabase } from '@/services/supabase/client';
import { roundKeys } from '@/hooks/queryKeys/round';
import type { Round } from '@/types/database.types';

/**
 * Subset of Round columns that per-field edit sheets are allowed to update.
 * Kept small and explicit so accidental writes to sensitive fields (status,
 * competition_id, user_id, …) are a type error.
 */
type RoundUpdate = Partial<
  Pick<
    Round,
    | 'name'
    | 'rules_override'
  >
>;

interface Options {
  roundId: string;
  /** Called after the update + cache invalidation succeed. */
  onSuccess?: () => void;
}

/**
 * Shared mutation for the per-field round edit sheets. Mirror of
 * useUpdateCompetitionField — keeps cache invalidation consistent across
 * every round field edit (name, rules_override, …).
 */
export function useUpdateRoundField({ roundId, onSuccess }: Options) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (updates: RoundUpdate) => {
      const { error } = await supabase
        .from('rounds')
        // @ts-expect-error - Supabase generated types don't properly model partial updates
        .update(updates)
        .eq('id', roundId);
      if (error) throw new Error(error.message);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: roundKeys.detail(roundId) });
      queryClient.invalidateQueries({ queryKey: roundKeys.lists() });
      onSuccess?.();
    },
  });
}
