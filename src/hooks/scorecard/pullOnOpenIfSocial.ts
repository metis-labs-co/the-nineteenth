/**
 * Merge-on-open for social rounds: pull every server card and merge it per
 * hole (last edit wins), even when this phone already has scores — that is
 * how a phone that was off picks up holes entered elsewhere. Returns false for
 * standard rounds so the caller keeps its existing hydrate.
 *
 * After a successful pull the round's own retained failures (e.g. a conflict
 * retained on a cold start, before the round was loaded and the per-hole
 * resolver could run) are re-queued and drained normally, so the resolver now
 * merges them. Only this round's rows are touched, and the drain is the normal
 * one — never `retryFailedSyncs`, which is device-wide and local-wins.
 */
import { useScorecardStore } from '@/store/scorecardStore';
import { resetFailedSyncsForRound } from '@/services/offline/database';
import { manualSync } from '@/services/offline/sync';
import { roundDataLogger } from '@/utils/debugLogger';

export async function pullOnOpenIfSocial(): Promise<boolean> {
  const store = useScorecardStore.getState();
  if (store.scoringMode !== 'social') return false;
  try {
    await store.pullServerScorecards();
  } catch (error) {
    roundDataLogger.warn('Social round pull on open failed', {
      error: error instanceof Error ? error.message : String(error),
    });
    return true;
  }

  const roundId = store.currentRoundId;
  if (!roundId) return true;
  try {
    const requeued = await resetFailedSyncsForRound(roundId);
    if (requeued > 0) await manualSync();
  } catch (error) {
    roundDataLogger.warn('Re-queueing retained social round failures failed', {
      error: error instanceof Error ? error.message : String(error),
    });
  }
  return true;
}
