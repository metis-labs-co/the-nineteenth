/**
 * Sync Orchestrator
 *
 * Coordinates sync operations between local storage and Supabase.
 * Manages sync queue, state, and scheduling.
 */

import {
  getPendingSyncs,
  removePendingSync,
  incrementSyncRetryCount,
  markScorecardsAsSynced,
  getUnsyncedScorecards,
  addPendingSync,
  getPendingSyncCount,
  clearAllPendingSyncs,
  clearInvalidMockData,
} from '../database';
import { invalidateLeaderboardCache, invalidateScorecardCache } from '@/services/queryClient';
import type { Scorecard, PendingSync } from '@/types';
import { syncLogger, logScorecardSummary } from '@/utils/debugLogger';
import {
  MAX_RETRY_COUNT,
  type SyncState,
  type SyncListener,
  INITIAL_SYNC_STATE,
} from './types';
import {
  getIsOnline,
  getIsSyncing,
  setIsSyncing,
  setOnOnlineCallback,
  setOnStatusChangeCallback,
  initNetworkState,
} from './networkState';
import { processScorecardSync, syncScorecard, isValidUUID } from './scorecardSync';

// Re-export types for consumers
export type { SyncState, SyncStatus, SyncListener } from './types';

// Listeners for sync state changes
const listeners: Set<SyncListener> = new Set();

let currentState: SyncState = { ...INITIAL_SYNC_STATE };

/**
 * Update and notify listeners of state changes
 */
function updateState(partial: Partial<SyncState>): void {
  currentState = { ...currentState, ...partial };
  listeners.forEach((listener) => listener(currentState));
}

/**
 * Update pending sync count
 */
async function updatePendingCount(): Promise<void> {
  const count = await getPendingSyncCount();
  updateState({ pendingCount: count });
}

/**
 * Initialize the sync service
 */
export function initSyncService(): () => void {
  syncLogger.info('Initializing sync service');

  // Set up callbacks for network state changes
  setOnOnlineCallback(syncAll);
  setOnStatusChangeCallback((isOnline) => {
    updateState({ status: isOnline ? 'idle' : 'offline' });
  });

  // Initialize network state monitoring
  const unsubscribe = initNetworkState();

  // Initial pending count
  updatePendingCount();

  return unsubscribe;
}

/**
 * Subscribe to sync state changes
 */
export function subscribeSyncState(listener: SyncListener): () => void {
  listeners.add(listener);
  // Immediately call with current state
  listener(currentState);

  return () => {
    listeners.delete(listener);
  };
}

/**
 * Get current sync state
 */
export function getSyncState(): SyncState {
  return currentState;
}

/**
 * Sync all pending changes to the server
 */
export async function syncAll(): Promise<boolean> {
  if (getIsSyncing()) {
    syncLogger.debug('Already syncing, skipping');
    return false;
  }

  if (!getIsOnline()) {
    syncLogger.debug('Offline, skipping sync');
    updateState({ status: 'offline' });
    return false;
  }

  setIsSyncing(true);
  updateState({ status: 'syncing', error: null });
  syncLogger.info('Starting sync all');

  try {
    // Get pending syncs
    const pendingSyncs = await getPendingSyncs();
    syncLogger.info('Processing pending syncs', { count: pendingSyncs.length });

    let successCount = 0;
    let failCount = 0;
    let scorecardsWereSynced = false;

    for (const sync of pendingSyncs) {
      try {
        syncLogger.debug('Processing pending sync', {
          id: sync.id,
          type: sync.type,
          action: sync.action,
          retryCount: sync.retryCount,
        });
        await processPendingSync(sync);
        await removePendingSync(sync.id!);
        successCount++;
        syncLogger.debug('Sync processed successfully', { id: sync.id });
        // Track if any scorecard syncs succeeded
        if (sync.type === 'scorecard') {
          scorecardsWereSynced = true;
          // Mark the scorecard as synced in SQLite to prevent the unsynced-scorecards
          // path (below) from re-syncing potentially incomplete SQLite data and
          // overwriting the complete data we just synced from the queue.
          if (sync.data?.id) {
            await markScorecardsAsSynced([sync.data.id]);
          }
        }
      } catch (error) {
        syncLogger.error('Failed to process sync', error, {
          id: sync.id,
          type: sync.type,
          action: sync.action,
          retryCount: sync.retryCount,
        });
        failCount++;

        if (sync.retryCount < MAX_RETRY_COUNT) {
          await incrementSyncRetryCount(sync.id!);
          syncLogger.debug('Incremented retry count', {
            id: sync.id,
            newRetryCount: sync.retryCount + 1,
          });
        } else {
          // Max retries reached, remove from queue
          syncLogger.warn('Max retries reached, removing sync', {
            id: sync.id,
            maxRetries: MAX_RETRY_COUNT,
          });
          await removePendingSync(sync.id!);
        }
      }
    }

    // Also sync any unsynced scorecards
    const unsyncedScorecards = await getUnsyncedScorecards();

    if (unsyncedScorecards.length > 0) {
      syncLogger.info('Syncing unsynced scorecards', { count: unsyncedScorecards.length });

      // Track rounds that fail with RLS errors - these are likely orphaned/deleted rounds
      const rlsFailedRoundIds = new Set<string>();

      for (const scorecard of unsyncedScorecards) {
        try {
          syncLogger.debug('Syncing unsynced scorecard', logScorecardSummary(scorecard));
          await syncScorecard(scorecard);
          await markScorecardsAsSynced([scorecard.id]);
          successCount++;
          scorecardsWereSynced = true;
          syncLogger.debug('Unsynced scorecard synced successfully', {
            id: scorecard.id.substring(0, 20) + '...',
          });
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : String(error);

          // Check if this is an RLS policy error (code 42501)
          const isRlsError =
            errorMessage.includes('row-level security policy') || errorMessage.includes('42501');

          if (isRlsError) {
            syncLogger.warn('RLS error - marking scorecard as synced to prevent retry', {
              id: scorecard.id.substring(0, 20) + '...',
              roundId: scorecard.roundId.substring(0, 8) + '...',
            });
            // Mark as synced to stop retry attempts - the round likely doesn't exist or user has no access
            await markScorecardsAsSynced([scorecard.id]);
            rlsFailedRoundIds.add(scorecard.roundId);
            // Don't count as failure since we handled it
          } else {
            syncLogger.error('Failed to sync unsynced scorecard', error, {
              id: scorecard.id.substring(0, 20) + '...',
              roundId: scorecard.roundId.substring(0, 8) + '...',
            });
            failCount++;
          }
        }
      }

      // Log summary of RLS failures
      if (rlsFailedRoundIds.size > 0) {
        syncLogger.warn('Rounds with RLS failures (likely deleted/orphaned)', {
          roundCount: rlsFailedRoundIds.size,
          roundIds: Array.from(rlsFailedRoundIds).map((id) => id.substring(0, 8) + '...'),
        });
      }
    }

    // Invalidate caches if any scorecards were synced
    if (scorecardsWereSynced) {
      syncLogger.debug('Invalidating caches after successful sync');
      invalidateLeaderboardCache(); // Invalidate all leaderboard caches
      invalidateScorecardCache(); // Invalidate all scorecard caches
    }

    await updatePendingCount();

    if (failCount > 0) {
      syncLogger.warn('Sync completed with errors', { successCount, failCount });
      updateState({
        status: 'error',
        error: `${failCount} sync(s) failed`,
        lastSyncAt: new Date(),
      });
      return false;
    }

    updateState({
      status: 'idle',
      lastSyncAt: new Date(),
    });

    syncLogger.info('Sync completed successfully', { successCount, failCount });
    return true;
  } catch (error) {
    syncLogger.error('Sync failed with exception', error);
    updateState({
      status: 'error',
      error: error instanceof Error ? error.message : 'Sync failed',
    });
    return false;
  } finally {
    setIsSyncing(false);
  }
}

/**
 * Process a single pending sync
 */
async function processPendingSync(sync: PendingSync): Promise<void> {
  syncLogger.debug('Processing pending sync entry', {
    id: sync.id,
    type: sync.type,
    action: sync.action,
  });

  switch (sync.type) {
    case 'scorecard':
      await processScorecardSync(sync);
      break;
    default:
      syncLogger.warn('Unknown sync type', { type: sync.type });
  }
}

/**
 * Queue a scorecard update for sync
 */
export async function queueScorecardSync(
  scorecard: Scorecard,
  action: 'create' | 'update' | 'delete' = 'update'
): Promise<void> {
  syncLogger.debug('Queueing scorecard sync', {
    id: scorecard.id.substring(0, 20) + '...',
    action,
    isStandalone: scorecard.isStandalone,
    roundId: scorecard.roundId.substring(0, 8) + '...',
  });

  // Skip standalone rounds - they are local-only
  if (scorecard.isStandalone) {
    syncLogger.info('Skipping standalone scorecard queue (local-only)', {
      id: scorecard.id.substring(0, 20) + '...',
    });
    return;
  }

  // Validate UUIDs before queuing - prevents invalid mock data from being synced
  if (!isValidUUID(scorecard.roundId)) {
    syncLogger.warn('Skipping queue - invalid round_id', {
      roundId: scorecard.roundId,
    });
    return;
  }

  if (!isValidUUID(scorecard.playerId)) {
    syncLogger.warn('Skipping queue - invalid player_id', {
      playerId: scorecard.playerId,
    });
    return;
  }

  await addPendingSync({
    type: 'scorecard',
    action,
    data: scorecard,
    timestamp: new Date(),
    retryCount: 0,
  });

  syncLogger.debug('Scorecard added to sync queue', {
    id: scorecard.id.substring(0, 20) + '...',
    action,
  });

  await updatePendingCount();

  // Try to sync immediately if online
  if (getIsOnline() && !getIsSyncing()) {
    syncLogger.debug('Triggering immediate sync (online and not already syncing)');
    // Don't await - sync in background
    syncAll().catch((error) => {
      syncLogger.error('Background sync failed', error);
    });
  } else {
    syncLogger.debug('Sync deferred', { isOnline: getIsOnline(), isSyncing: getIsSyncing() });
  }
}

/**
 * Force a manual sync attempt
 */
export async function manualSync(): Promise<boolean> {
  syncLogger.info('Manual sync requested', { isOnline: getIsOnline() });

  if (!getIsOnline()) {
    syncLogger.warn('Manual sync failed - offline');
    updateState({ status: 'offline', error: 'No network connection' });
    return false;
  }

  return syncAll();
}

/**
 * Clear all pending syncs and invalid data (manual cleanup)
 */
export async function clearSyncQueue(): Promise<{ pendingCleared: number; invalidCleared: number }> {
  syncLogger.info('Clearing sync queue');
  const pendingCleared = await clearAllPendingSyncs();
  const invalidCleared = await clearInvalidMockData();
  await updatePendingCount();
  updateState({ status: 'idle', error: null });
  syncLogger.info('Sync queue cleared', { pendingCleared, invalidCleared });
  return { pendingCleared, invalidCleared };
}
