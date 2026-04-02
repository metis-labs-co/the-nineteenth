/**
 * useUpdateScorecardStats - Mutation hook for updating scorecard stats post-submission
 *
 * Updates the scores JSONB field on an existing scorecard via Supabase.
 * Used by the EditStatsModal for post-submission stats editing.
 */

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/services/supabase/client';
import type { HoleScore } from '@/types/database/base';

interface UpdateScorecardStatsParams {
  scorecardId: string;
  scores: Record<string, HoleScore>;
}

export function useUpdateScorecardStats() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ scorecardId, scores }: UpdateScorecardStatsParams) => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Supabase generated types workaround
      const { error } = await (supabase.from('scorecards') as any)
        .update({ scores, updated_at: new Date().toISOString() })
        .eq('id', scorecardId);

      if (error) {
        throw new Error(`Failed to update scorecard stats: ${error.message}`);
      }
    },
    onSuccess: () => {
      // Invalidate round details and scorecard queries to refresh display
      queryClient.invalidateQueries({ queryKey: ['round-details'] });
      queryClient.invalidateQueries({ queryKey: ['scorecards'] });
    },
  });
}
