import { useMutation, useQueryClient } from '@tanstack/react-query';

import { supabase } from '@/services/supabase/client';
import type { Competition } from '@/types/database.types';

type CompetitionUpdate = Partial<
  Pick<
    Competition,
    | 'name'
    | 'description'
    | 'competition_type'
    | 'handicap_system'
    | 'team_mode'
    | 'team_size'
    | 'start_date'
    | 'end_date'
    | 'point_system'
    | 'per_round_rules_enabled'
    | 'whatsapp_group_invite_url'
  >
>;

interface Options {
  competitionId: string;
  onSuccess: () => void;
}

/**
 * Shared mutation for the per-field competition edit sheets on the Details
 * tab. Each sheet edits a different subset of columns but invalidates the
 * same query keys, so centralising the mutation keeps cache handling
 * consistent.
 */
export function useUpdateCompetitionField({ competitionId, onSuccess }: Options) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (updates: CompetitionUpdate) => {
      const { error } = await supabase
        .from('competitions')
        // @ts-expect-error - Supabase types don't properly handle partial updates
        .update(updates)
        .eq('id', competitionId);
      if (error) throw new Error(error.message);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['competition', competitionId] });
      queryClient.invalidateQueries({ queryKey: ['competition', competitionId, 'details'] });
      queryClient.invalidateQueries({ queryKey: ['competitions'] });
      onSuccess();
    },
  });
}
