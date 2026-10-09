import { supabase } from '@/services/supabase/client';
import { shapeHoleNumbers, type RoundScoringShape } from './roundScoringWrite';
import { RoundScoringWriteError } from './roundScoringErrors';

export const ROUND_SCORING_READ_TIMEOUT_MS = 8000;

/** A denied/missing/invalid row is unavailable, never evidence of an unended round. */
export async function fetchRoundScoringShape(roundId: string): Promise<RoundScoringShape> {
  const controller = new AbortController();
  let timer: ReturnType<typeof setTimeout> | undefined;
  const timeout = new Promise<never>((_, reject) => {
    timer = setTimeout(() => {
      reject(new RoundScoringWriteError('unavailable', roundId, 'Round shape read timed out'));
      // Requests HTTP cancellation only; the race also bounds transports ignoring abort.
      controller.abort();
    }, ROUND_SCORING_READ_TIMEOUT_MS);
  });
  try {
    const request = supabase
      .from('rounds')
      .select('nine_type, holes_played')
      .eq('id', roundId)
      .is('deleted_at', null)
      .abortSignal(controller.signal)
      .maybeSingle();
    const { data, error } = (await Promise.race([
      Promise.resolve(request),
      timeout,
    ])) as unknown as {
      data: { nine_type?: unknown; holes_played?: unknown } | null;
      error: { message: string; code?: string; hint?: string | null } | null;
    };
    if (error)
      throw new RoundScoringWriteError('unavailable', roundId, error.message, {
        sqlCode: error.code,
        sqlHint: error.hint ?? undefined,
      });
    if (
      !data ||
      !Object.prototype.hasOwnProperty.call(data, 'holes_played') ||
      (data.holes_played !== null && typeof data.holes_played !== 'number')
    ) {
      throw new RoundScoringWriteError('unavailable', roundId, 'Round shape is missing or invalid');
    }
    const shape = data as RoundScoringShape;
    try {
      shapeHoleNumbers(shape);
    } catch {
      throw new RoundScoringWriteError('unavailable', roundId, 'Round shape is invalid');
    }
    return { nine_type: shape.nine_type, holes_played: shape.holes_played };
  } catch (error) {
    if (error instanceof RoundScoringWriteError) throw error;
    throw new RoundScoringWriteError(
      'unavailable',
      roundId,
      error instanceof Error ? error.message : 'Round shape read failed'
    );
  } finally {
    clearTimeout(timer);
  }
}
