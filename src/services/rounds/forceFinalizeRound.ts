/**
 * forceFinalizeRound
 *
 * Organiser override: marks a competition round `completed` even when players'
 * scorecards were never formally submitted. Any card with a score on EVERY hole
 * is promoted to `completed` (with recomputed totals) so it counts; cards
 * missing holes are left non-terminal and surface as DNF. The round is then
 * marked completed and results re-finalized. Allowed even when no card is full
 * (round closes, everyone DNF).
 */
import { supabase } from '@/services/supabase/client';
import { refinalizeRoundResults } from '@/services/rounds/refinalizeRoundResults';
import { getHoleCount } from '@/constants/scoring';
import { recomputeScorecardTotals } from '@/services/scoreMismatch/resolution';
import { getRoundHoles } from '@/services/courses/getRoundHoles';
import { submitLogger } from '@/utils/debugLogger';

const TERMINAL = new Set(['completed', 'confirmed']);

export async function forceFinalizeRound(roundId: string): Promise<void> {
  // Round meta: hole count + game type for promotion scoring.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- generated-types workaround
  const { data: roundMeta } = await (supabase as any)
    .from('rounds')
    .select('nine_type, game_type')
    .eq('id', roundId)
    .single();
  const holeCount = getHoleCount(roundMeta?.nine_type ?? 'full');
  const gameType: string | null = roundMeta?.game_type ?? null;

  // All scorecards for the round.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- generated-types workaround
  const { data: cardRows } = await (supabase as any)
    .from('scorecards')
    .select('id, player_id, status, scores, daily_handicap_used')
    .eq('round_id', roundId);
  const cards: {
    id: string;
    player_id: string | null;
    status: string;
    scores: Record<string, unknown> | null;
    daily_handicap_used: number | null;
  }[] = cardRows ?? [];

  let holes: Awaited<ReturnType<typeof getRoundHoles>> = [];
  try {
    holes = await getRoundHoles(roundId);
  } catch (err) {
    submitLogger.error('forceFinalizeRound: getRoundHoles failed (non-fatal)', err, { roundId: roundId.substring(0, 8) + '...' });
  }

  // Promote any non-terminal card that has a score on every hole.
  for (const card of cards) {
    if (TERMINAL.has(card.status)) continue;
    const scored = Object.keys(card.scores ?? {}).length;
    if (scored < holeCount) continue; // partial → leave as DNF

    const totals = recomputeScorecardTotals(
      // eslint-disable-next-line @typescript-eslint/no-explicit-any -- shared pure util
      (card.scores ?? {}) as any,
      holes,
      gameType,
      card.daily_handicap_used,
    );
    // eslint-disable-next-line @typescript-eslint/no-explicit-any -- generated-types workaround
    const { error: promoteErr } = await (supabase as any)
      .from('scorecards')
      .update({
        status: 'completed',
        total_gross: totals.totalGross,
        total_net: totals.totalNet,
        total_points: totals.totalPoints,
      })
      .eq('id', card.id);
    if (promoteErr) {
      submitLogger.error('forceFinalizeRound: promote card failed (non-fatal)', promoteErr, {
        scorecardId: card.id.substring(0, 8) + '...',
      });
    }
  }

  // Mark the round completed (bypass the all-terminal gate).
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

  await refinalizeRoundResults(roundId);
}
