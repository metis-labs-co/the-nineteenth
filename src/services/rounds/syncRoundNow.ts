/**
 * Push this round's latest scores before a destructive action (delete), so
 * the Undo toast restores everything. Cancels debounce timers and queues every
 * non-completed card's current state directly. Failed rows count as unsynced.
 */

import { manualSync, queueScorecardSync } from '@/services/offline/sync';
import { getFailedSyncCountForRound, hasUnsyncedScorecardsForRound } from '@/services/offline/database';
import { captureRoundPersistenceSource, withRoundPersistence } from '@/services/offline/roundPersistenceBarrier';
import { cancelPendingScorecardSync } from '@/store/scorecardSyncDebounce';
import type { Scorecard } from '@/types';

export async function syncRoundNow(roundId: string, cards: Scorecard[], timeoutMs = 5000): Promise<boolean> {
  for (const card of cards) {
    cancelPendingScorecardSync(card.id);
    if (card.status !== 'completed') {
      await withRoundPersistence(captureRoundPersistenceSource(roundId), (lease) =>
        queueScorecardSync(card, 'update', { lease })
      );
    }
  }
  await Promise.race([
    manualSync().catch(() => false),
    new Promise((resolve) => setTimeout(resolve, timeoutMs)),
  ]);
  if (await hasUnsyncedScorecardsForRound(roundId)) return false;
  return (await getFailedSyncCountForRound(roundId)) === 0;
}
