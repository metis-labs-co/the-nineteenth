/**
 * finalizeRoundStatus
 *
 * Flips a round to `completed` — but only when it is genuinely finished:
 *  - Split rounds (players grouped in `sub_matches`) complete only once EVERY
 *    sub-match is terminal (completed/forfeited). This is the same condition
 *    result aggregation requires (see finalizePairResults), and prevents the
 *    first sub-match's submit/forfeit from flipping the whole round.
 *  - Non-split rounds gate on scorecards: every scorecard terminal AND enough
 *    terminal cards to cover the distinct players across the round's pairings
 *    (multi-group independence — one group's submit must not lock out another).
 *
 * Shared by the Review-screen submit flow (useRoundFinalization) and the
 * sub-match result/forfeit flow (useUpdateSubMatchResult) so completion is
 * decided in exactly one place.
 */
import { supabase } from '@/services/supabase/client';
import { submitLogger } from '@/utils/debugLogger';

export async function finalizeRoundStatus(roundId: string): Promise<void> {
  try {
    // Query the round's current status before updating (logging / context).
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

    // eslint-disable-next-line @typescript-eslint/no-explicit-any -- generated-types workaround
    const { data: roundCards } = await (supabase as any)
      .from('scorecards')
      .select('status, player_id')
      .eq('round_id', roundId);

    const cards: { status: string }[] = roundCards ?? [];
    const TERMINAL = new Set(['completed', 'confirmed']);
    const terminalCount = cards.filter((c) => TERMINAL.has(c.status)).length;
    const allTerminal = cards.length > 0 && terminalCount === cards.length;

    // Split rounds group players in `sub_matches` (NOT `pairings`), so the
    // pairings-based field-size guard below sees 0 players and would let the
    // FIRST sub-match's submit/forfeit flip the whole round to completed (the
    // "round shows complete" bug). For split rounds the correct invariant is:
    // complete only once EVERY sub-match is terminal.
    // eslint-disable-next-line @typescript-eslint/no-explicit-any -- generated-types workaround
    const { data: subMatchRows } = await (supabase as any)
      .from('sub_matches')
      .select('status')
      .eq('round_id', roundId);
    const subMatches: { status: string }[] = subMatchRows ?? [];

    if (subMatches.length > 0) {
      const TERMINAL_SM = new Set(['completed', 'forfeited']);
      const terminalSubMatches = subMatches.filter((s) => TERMINAL_SM.has(s.status)).length;
      if (terminalSubMatches !== subMatches.length) {
        submitLogger.info('Split round not yet complete — sub-matches still open', {
          roundId: roundId.substring(0, 8) + '...',
          terminalSubMatches,
          totalSubMatches: subMatches.length,
        });
        return;
      }
      // Every sub-match is terminal → fall through to mark the round completed.
    } else {
      // Non-split round: gate on scorecards. Expected field size = distinct
      // players across the round's pairings.
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
}
