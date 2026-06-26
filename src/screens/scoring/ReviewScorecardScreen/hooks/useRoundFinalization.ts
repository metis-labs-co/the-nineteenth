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

      // Multi-group independence: only complete the ROUND once every scorecard is
      // terminal. The first group's submit must not flip the whole round, or the
      // other group could be locked out. Results still finalize incrementally.
      // eslint-disable-next-line @typescript-eslint/no-explicit-any -- generated-types workaround
      const { data: roundCards } = await (supabase as any)
        .from('scorecards')
        .select('status, player_id')
        .eq('round_id', roundId);

      const cards: { status: string }[] = roundCards ?? [];
      const TERMINAL = new Set(['completed', 'confirmed']);
      const terminalCount = cards.filter((c) => TERMINAL.has(c.status)).length;
      const allTerminal = cards.length > 0 && terminalCount === cards.length;

      // Expected field size = distinct players across the round's pairings.
      // eslint-disable-next-line @typescript-eslint/no-explicit-any -- generated-types workaround
      const { data: pairingRows } = await (supabase as any)
        .from('pairings')
        .select('player_ids')
        .eq('round_id', roundId);
      const expected = pairingRows
        ? new Set(
            (pairingRows as { player_ids: string[] }[]).flatMap((p) => p.player_ids ?? [])
          ).size
        : 0;
      const enoughCards = expected === 0 ? true : terminalCount >= expected;

      if (!allTerminal || !enoughCards) {
        submitLogger.info('Round not yet complete — leaving status unchanged', {
          roundId: roundId.substring(0, 8) + '...',
          terminalCount,
          totalCards: cards.length,
          expected,
        });
        return;
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
