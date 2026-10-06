/**
 * reopenRound
 *
 * Organiser action: flips a `completed` competition round back to
 * `in-progress` so an incomplete (DNF) player can finish and the round can be
 * re-finalized. The status-sync trigger cascades the parent competition's
 * status back to in-progress automatically.
 *
 * Existing `round_results` rows are left in place; they are harmlessly replaced
 * (delete-then-insert) on the next finalize / "Recalculate Results".
 */
import { supabase } from '@/services/supabase/client';
import { submitLogger } from '@/utils/debugLogger';

export async function reopenRound(roundId: string): Promise<void> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- generated-types workaround
  const { data: updatedRows, error } = await (supabase as any)
    .from('rounds')
    .update({ status: 'in-progress' })
    .eq('id', roundId)
    .select('id, status');

  if (error) {
    submitLogger.error('reopenRound: failed to update status', error, {
      roundId: roundId.substring(0, 8) + '...',
    });
    throw error;
  }
  if (!updatedRows || updatedRows.length === 0) {
    throw new Error(
      `Re-open affected 0 rows for round ${roundId.substring(0, 8)}. Possible RLS policy issue.`
    );
  }
}
