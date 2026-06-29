/**
 * forceFinalizeRound
 *
 * Organiser override: marks a competition round `completed` even when some
 * players' scorecards are not terminal. The normal gate (finalizeRoundStatus)
 * refuses until every card is terminal; this bypasses it.
 *
 * Incomplete players are NOT special-cased: refinalizeRoundResults only reads
 * `completed` scorecards, so players who never finished simply get no result
 * row (they surface as "Did Not Finish" on the leaderboard, with no position
 * or points). Their partial scorecards are left untouched, so a later re-open
 * + re-finalize can bring them back into the standings.
 *
 * Guard: requires at least one terminal (completed/confirmed) scorecard — there
 * is nothing meaningful to finalize otherwise.
 */
import { supabase } from '@/services/supabase/client';
import { refinalizeRoundResults } from '@/services/rounds/refinalizeRoundResults';
import { submitLogger } from '@/utils/debugLogger';

const TERMINAL = new Set(['completed', 'confirmed']);

/** Thrown when a force-submit is attempted with zero terminal scorecards. */
export class NoCompletedScorecardsError extends Error {
  constructor() {
    super('At least one player needs a completed scorecard before you can submit this round.');
    this.name = 'NoCompletedScorecardsError';
  }
}

export async function forceFinalizeRound(roundId: string): Promise<void> {
  // Guard: at least one terminal scorecard.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- generated-types workaround
  const { data: cardRows } = await (supabase as any)
    .from('scorecards')
    .select('status')
    .eq('round_id', roundId);
  const cards: { status: string }[] = cardRows ?? [];
  const terminalCount = cards.filter((c) => TERMINAL.has(c.status)).length;
  if (terminalCount === 0) {
    throw new NoCompletedScorecardsError();
  }

  // Bypass the all-terminal gate and mark the round completed directly.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- generated-types workaround
  const { data: updatedRows, error } = await (supabase as any)
    .from('rounds')
    .update({ status: 'completed' })
    .eq('id', roundId)
    .select('id, status');

  if (error) {
    submitLogger.error('forceFinalizeRound: failed to update status', error, {
      roundId: roundId.substring(0, 8) + '...',
    });
    throw error;
  }
  if (!updatedRows || updatedRows.length === 0) {
    throw new Error(
      `Force-submit affected 0 rows for round ${roundId.substring(0, 8)}. Possible RLS policy issue.`
    );
  }

  // Compute results from completed scorecards only → incomplete players excluded.
  await refinalizeRoundResults(roundId);
}
