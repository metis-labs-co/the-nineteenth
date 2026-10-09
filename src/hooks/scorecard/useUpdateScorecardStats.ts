/**
 * useUpdateScorecardStats - Mutation hook for updating scorecard stats post-submission
 *
 * Updates the scores JSONB field on an existing scorecard via Supabase.
 * Used by the EditStatsModal for post-submission stats editing.
 */

import { roundKeys, scorecardKeys } from '@/hooks/queryKeys';
import {
  RoundScoringWriteError,
  roundScoringErrorFromSql,
} from '@/services/rounds/roundScoringErrors';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/services/supabase/client';
import { shapeHoleNumbers, type RoundScoringShape } from '@/services/rounds/roundScoringWrite';
import { prepareStatsScores, type StatsScores } from './scorecardStats';

interface UpdateScorecardStatsParams {
  scorecardId: string;
  roundId: string;
  roundShape: RoundScoringShape;
  originalScores: StatsScores;
  scores: StatsScores;
}

export function useUpdateScorecardStats() {
  const queryClient = useQueryClient();

  const invalidate = ({ roundId, scorecardId }: UpdateScorecardStatsParams) =>
    Promise.all([
      queryClient.invalidateQueries({ queryKey: roundKeys.detail(roundId) }),
      queryClient.invalidateQueries({ queryKey: scorecardKeys.list({ roundId }) }),
      queryClient.invalidateQueries({ queryKey: scorecardKeys.detail(scorecardId) }),
    ]);

  return useMutation({
    retry: false,
    mutationFn: async ({
      scorecardId,
      scores,
      originalScores,
      roundShape,
      roundId,
    }: UpdateScorecardStatsParams) => {
      const keep = shapeHoleNumbers(roundShape);
      if (
        Object.keys(originalScores).some((key) => /^[0-9]+$/.test(key) && !keep.has(Number(key)))
      ) {
        throw new RoundScoringWriteError('out_of_play', roundId, 'Round stats need a fresh review');
      }
      const preparedScores = prepareStatsScores(originalScores, scores, roundShape);
      // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Supabase generated types workaround
      const { error } = await (supabase.from('scorecards') as any)
        .update({ scores: preparedScores, updated_at: new Date().toISOString() })
        .eq('id', scorecardId);

      if (error) {
        throw (
          roundScoringErrorFromSql(roundId, error) ??
          new Error(`Failed to update scorecard stats: ${error.message}`)
        );
      }
    },
    onSuccess: async (_data, params) => {
      await invalidate(params);
    },
    onError: async (error, params) => {
      if (error instanceof RoundScoringWriteError) await invalidate(params);
    },
  });
}
