/**
 * useRoundFinalization - Async functions for updating round status and finalizing results
 */

import { useCallback } from 'react';
import { supabase } from '@/services/supabase/client';
import { refinalizeRoundResults } from '@/services/rounds/refinalizeRoundResults';
import { submitLogger } from '@/utils/debugLogger';

export function useRoundFinalization() {
  const updateRoundStatus = useCallback(async (roundId: string): Promise<void> => {
    try {
      // Query the round's current status before updating
      // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Supabase generated types restriction workaround
      const { data: currentRound, error: fetchError } = await (supabase as any)
        .from('rounds')
        .select('id, status, user_id, competition_id')
        .eq('id', roundId)
        .single();

      if (fetchError) {
        submitLogger.error('Failed to fetch round before status update', fetchError, { roundId: roundId.substring(0, 8) + '...' });
      } else {
        submitLogger.info('Round current state before update', {
          roundId: roundId.substring(0, 8) + '...',
          currentStatus: currentRound?.status,
          userId: currentRound?.user_id?.substring(0, 8) + '...',
          competitionId: currentRound?.competition_id?.substring(0, 8) || 'standalone',
        });
      }

      submitLogger.info('Updating round status to completed', { roundId: roundId.substring(0, 8) + '...' });

      // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Supabase generated types restriction workaround
      const { data: updatedRows, error } = await (supabase as any)
        .from('rounds')
        .update({ status: 'completed' })
        .eq('id', roundId)
        .select('id, status');

      if (error) {
        submitLogger.error('Failed to update round status', error, { roundId: roundId.substring(0, 8) + '...' });
        throw error;
      }

      if (!updatedRows || updatedRows.length === 0) {
        submitLogger.error('Round status update affected 0 rows - possible RLS policy issue', undefined, {
          roundId: roundId.substring(0, 8) + '...',
        });
        throw new Error(`Round status update affected 0 rows for round ${roundId.substring(0, 8)}. Possible RLS policy issue.`);
      }

      submitLogger.info('Round status updated successfully', {
        roundId: roundId.substring(0, 8) + '...',
        newStatus: updatedRows[0]?.status,
        rowsAffected: updatedRows.length,
      });
    } catch (error) {
      submitLogger.error('Error updating round status', error, { roundId: roundId.substring(0, 8) + '...' });
      throw error;
    }
  }, []);

  const finalizeRoundResults = useCallback(
    (roundId: string): Promise<void> => refinalizeRoundResults(roundId),
    []
  );

  return { updateRoundStatus, finalizeRoundResults };
}
