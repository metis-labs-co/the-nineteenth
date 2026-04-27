/**
 * Debounced live scorecard sync
 *
 * Pushes in-progress scorecards to Supabase after each hole entry, with a
 * short debounce so rapid taps coalesce into a single sync. Drives the
 * "live leaderboard" experience for organisers and other players watching
 * a competition round in progress on the View Round / Competition Detail
 * screens — events arrive via the Supabase Realtime channel (see
 * `src/hooks/scorecard/useScorecardsRealtime.ts`).
 *
 * The race condition that originally drove "sync only on submit" (see the
 * comment in `scoreUpdateSlice.setPlayerScore`) is mitigated by the
 * server-side completeness check in `scorecardSync.ts:218-230` — an upsert
 * is skipped if the server already has more holes than the local copy,
 * preventing a stale device from clobbering a more complete one.
 *
 * On round submission, `flushPendingScorecardSyncs()` is called first to
 * cancel any pending timers, ensuring the final 'completed' upsert isn't
 * raced by a trailing in-progress one.
 */

import type { Scorecard } from '@/types';
import {
  queueScorecardSync,
  getIsOnline,
  manualSync,
} from '@/services/offline/sync';
import { storeLogger } from '@/utils/debugLogger';

const DEBOUNCE_MS = 2000;
const timers = new Map<string, ReturnType<typeof setTimeout>>();

/**
 * Schedule a Supabase sync for the given scorecard, debounced. If called
 * again before the timer fires, the previous timer is cancelled — only the
 * most recent state is synced.
 *
 * Takes a getter (not a snapshot) so the timer always reads the latest
 * scorecard from the store at the moment the sync runs.
 */
export function debouncedQueueScorecardSync(
  scorecardId: string,
  getScorecard: () => Scorecard | undefined,
): void {
  const existing = timers.get(scorecardId);
  if (existing) clearTimeout(existing);

  const timer = setTimeout(async () => {
    timers.delete(scorecardId);
    const scorecard = getScorecard();
    if (!scorecard) return;
    // Submission path owns the 'completed' upsert; skip live sync here so
    // we never overwrite a freshly-submitted scorecard with an in-progress
    // tail.
    if (scorecard.status === 'completed') return;

    try {
      await queueScorecardSync(scorecard, 'update');
      if (getIsOnline()) {
        manualSync().catch((err) => {
          storeLogger.warn('Live scorecard sync failed', {
            error: err instanceof Error ? err.message : String(err),
            scorecardId,
          });
        });
      }
    } catch (error) {
      storeLogger.warn('Failed to queue debounced scorecard sync', {
        error: error instanceof Error ? error.message : String(error),
        scorecardId,
      });
    }
  }, DEBOUNCE_MS);

  timers.set(scorecardId, timer);
}

/**
 * Cancel every pending debounced sync. Called from the submit path before
 * the final 'completed' upsert so an in-flight in-progress sync can't
 * arrive after submission and confuse the leaderboard view.
 */
export function flushPendingScorecardSyncs(): void {
  for (const timer of timers.values()) {
    clearTimeout(timer);
  }
  timers.clear();
}
