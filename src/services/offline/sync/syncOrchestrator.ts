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
  markScorecardAsSynced,
  recordScorecardServerRevision,
  getUnsyncedScorecards,
  addPendingSync,
  getPendingSyncCount,
  getFailedSyncCount,
  getQueuedEntityKeys,
  markPendingSyncFailed,
  resetFailedSyncs,
  clearAllPendingSyncs,
  clearInvalidMockData,
  getFailedSyncs,
  discardPendingSync,
  updatePendingSyncData,
  raisePendingSyncServerRevision,
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
import { processScorecardSync, syncScorecard, isValidUUID, ScorecardConflictError, type ScorecardSyncResult } from './scorecardSync';

// Re-export types for consumers
export type { SyncState, SyncStatus, SyncListener } from './types';

// Listeners for sync state changes
const listeners: Set<SyncListener> = new Set();

let currentState: SyncState = { ...INITIAL_SYNC_STATE };

/**
 * Notification fired after a scorecard write is accepted by the server.
 * The live scorecard store subscribes so its in-memory `serverRevision`
 * tracks the server; without this, the next write_scorecard_snapshot call
 * sends a stale expected revision and is falsely rejected as a conflict.
 */
export interface ScorecardSyncedEvent {
  scorecardId: string;
  serverRevision: number;
}

type ScorecardSyncedListener = (event: ScorecardSyncedEvent) => void;

const scorecardSyncedListeners: Set<ScorecardSyncedListener> = new Set();

export function subscribeScorecardSynced(listener: ScorecardSyncedListener): () => void {
  scorecardSyncedListeners.add(listener);
  return () => {
    scorecardSyncedListeners.delete(listener);
  };
}

function notifyScorecardSynced(scorecardId: string, serverRevision: number): void {
  scorecardSyncedListeners.forEach((listener) => listener({ scorecardId, serverRevision }));
}

export type ScorecardConflictResolution =
  | { kind: 'retry'; scorecard: Scorecard } // merged snapshot at the server revision
  | { kind: 'final' } // server card is final: drop the queued write
  | null; // not handled: keep today's behaviour

export type ScorecardConflictResolver = (
  queued: Scorecard,
  conflict: ScorecardConflictError
) => Promise<ScorecardConflictResolution>;

let conflictResolver: ScorecardConflictResolver | null = null;

/** Register who may merge a scorecard revision conflict (the store, for social rounds). */
export function setScorecardConflictResolver(resolver: ScorecardConflictResolver | null): void {
  conflictResolver = resolver;
}

async function resolveConflict(
  scorecard: Scorecard,
  error: ScorecardConflictError
): Promise<ScorecardConflictResolution> {
  if (!conflictResolver) return null;
  try {
    return await conflictResolver(scorecard, error);
  } catch (resolverError) {
    syncLogger.warn('Scorecard conflict resolver failed', {
      error: resolverError instanceof Error ? resolverError.message : String(resolverError),
    });
    return null;
  }
}

/** The server copy is final (submitted): this queued edit is obsolete. */
class FinalScorecardError extends Error {
  constructor() {
    super('Scorecard already submitted on another device');
    this.name = 'FinalScorecardError';
  }
}

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
async function updateSyncCounts(): Promise<void> {
  const [pendingCount, failedCount] = await Promise.all([
    getPendingSyncCount(),
    getFailedSyncCount(),
  ]);
  updateState({ pendingCount, failedCount });
}

/**
 * Initialize the sync service
 */
export function initSyncService(): () => void {
  syncLogger.info('Initializing sync service');

  // Set up callbacks for network state changes
  setOnOnlineCallback(syncAll);
  setOnStatusChangeCallback((isOnline) => {
    updateState({
      status: isOnline ? (currentState.failedCount > 0 ? 'error' : 'idle') : 'offline',
    });
  });

  // Initialize network state monitoring
  const unsubscribe = initNetworkState();

  // Initial pending count
  updateSyncCounts();

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
 * Options for a single drain of the sync queue.
 */
interface SyncAllOptions {
  /**
   * Adopt the server's revision and retry once when a write is rejected as
   * stale.
   *
   * Only ever set for a drain the user explicitly asked for (the Retry
   * button). At that point the scorer's local card is the authoritative one —
   * the same reasoning the submit path uses. An automatic background drain
   * must never make that call on the user's behalf, because the "conflicting"
   * server state may be another device's legitimate scores.
   */
  adoptServerRevisionOnConflict?: boolean;
}

/**
 * Sync all pending changes to the server
 */
export async function syncAll(options: SyncAllOptions = {}): Promise<boolean> {
  const { adoptServerRevisionOnConflict = false } = options;

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
    let conflictCount = 0;
    let scorecardsWereSynced = false;
    // Server revisions confirmed during THIS drain, keyed by scorecard id.
    // Later queued edits of the same scorecard were snapshotted before the
    // earlier write bumped the server revision; without this they would be
    // falsely rejected as conflicts.
    const freshestRevisions = new Map<string, number>();

    /**
     * Write a server-supplied revision back onto the queued row.
     *
     * A rejected write leaves the row holding the very revision the server
     * refused. Persisting the server's current revision is what makes a later
     * retry winnable; without it the row reproduces the same conflict forever.
     */
    const refreshQueuedRevision = async (
      sync: PendingSync,
      error: ScorecardConflictError
    ): Promise<boolean> => {
      if (sync.type !== 'scorecard' || !sync.data || !Number.isFinite(error.serverRevision)) {
        return false;
      }
      if ((sync.data.serverRevision ?? 0) === error.serverRevision) return false;

      sync.data = { ...sync.data, serverRevision: error.serverRevision };
      if (sync.id != null) {
        await updatePendingSyncData(sync.id, sync.data);
      }
      return true;
    };

    /**
     * Run one queued operation, optionally re-attempting once against the
     * server's current revision when the user asked for this drain.
     */
    const attemptPendingSync = async (
      sync: PendingSync
    ): Promise<ScorecardSyncResult | void> => {
      try {
        return await processPendingSync(sync);
      } catch (error) {
        if (!(error instanceof ScorecardConflictError) || sync.type !== 'scorecard' || !sync.data) {
          throw error;
        }

        const resolution = await resolveConflict(sync.data, error);
        if (resolution?.kind === 'final') throw new FinalScorecardError();
        if (resolution?.kind === 'retry') {
          // Retry in memory only. Never write the merged snapshot back into the queue
          // row: a tap during the merge may already have queued a newer edit there,
          // and an unconditional row update would overwrite it. If a newer edit did
          // arrive, removePendingSync's revision check leaves it pending and the
          // superseded-upload path (9609f1ee) carries the confirmed revision forward.
          return await processPendingSync({ ...sync, data: resolution.scorecard });
        }

        if (!adoptServerRevisionOnConflict) throw error;
        if (!(await refreshQueuedRevision(sync, error))) throw error;

        syncLogger.warn('Retrying queued write against the server revision', {
          id: sync.id,
          serverRevision: error.serverRevision,
        });
        return await processPendingSync(sync);
      }
    };

    for (const sync of pendingSyncs) {
      try {
        syncLogger.debug('Processing pending sync', {
          id: sync.id,
          type: sync.type,
          action: sync.action,
          retryCount: sync.retryCount,
        });
        if (sync.type === 'scorecard' && sync.data?.id) {
          const freshest = freshestRevisions.get(sync.data.id);
          if (freshest !== undefined && freshest > (sync.data.serverRevision ?? 0)) {
            sync.data.serverRevision = freshest;
          }
        }
        const result = await attemptPendingSync(sync);
        const acknowledged = await removePendingSync(sync.id!, sync.revision ?? 1);
        if (!acknowledged) {
          syncLogger.info('A newer queued revision arrived during sync; leaving it pending', {
            id: sync.id,
            revision: sync.revision,
          });
          // The server still accepted this write. The newer edit queued behind
          // it was snapshotted before that revision existed, so carry the
          // confirmed revision forward or its upload self-conflicts. Notify
          // first so any edit queued from here on already carries it.
          if (sync.type === 'scorecard' && sync.data?.id && result?.serverRevision !== undefined) {
            notifyScorecardSynced(sync.data.id, result.serverRevision);
            await raisePendingSyncServerRevision(sync.id!, result.serverRevision);
            await recordScorecardServerRevision(sync.data.id, result.serverRevision);
          }
          continue;
        }
        successCount++;
        syncLogger.debug('Sync processed successfully', { id: sync.id, revision: sync.revision });
        // Track if any scorecard syncs succeeded
        if (sync.type === 'scorecard') {
          scorecardsWereSynced = true;
          // Mark the scorecard as synced in SQLite to prevent the unsynced-scorecards
          // path (below) from re-syncing potentially incomplete SQLite data and
          // overwriting the complete data we just synced from the queue.
          if (sync.data?.id) {
            const confirmedRevision =
              result?.serverRevision ?? sync.data.serverRevision ?? 0;
            await markScorecardAsSynced(sync.data.id, confirmedRevision);
            freshestRevisions.set(sync.data.id, confirmedRevision);
            notifyScorecardSynced(sync.data.id, confirmedRevision);
          }
        }
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);

        if (error instanceof FinalScorecardError) {
          await discardPendingSync(sync.id!);
          continue;
        }

        if (error instanceof ScorecardConflictError) {
          // Park the server's current revision on the row before retaining it,
          // so the next explicit retry starts from a winnable expectation.
          await refreshQueuedRevision(sync, error);
          await markPendingSyncFailed(sync.id!, sync.revision ?? 1, errorMessage);
          failCount++;
          conflictCount++;
          continue;
        }

        // RLS policy errors (42501) mean the current user has no permission
        // to write this row — almost always because the round/competition
        // was deleted, the user was removed, or the scorecard belongs to a
        // round the user no longer has access to. Retrying won't help, so
        // drop the sync immediately rather than burning retry slots and
        // emitting misleading "PERMANENT SYNC FAILURE" warnings.
        const isRlsError =
          errorMessage.includes('row-level security policy') || errorMessage.includes('42501');

        if (isRlsError) {
          syncLogger.warn('RLS POLICY ERROR: Retaining sync for explicit recovery', {
            id: sync.id,
            type: sync.type,
            roundId: sync.data?.roundId?.substring(0, 8) + '...',
            playerId: sync.data?.playerId?.substring(0, 8) + '...',
          });
          await markPendingSyncFailed(sync.id!, sync.revision ?? 1, errorMessage);
          failCount++;
          continue;
        }

        syncLogger.error('Failed to process sync', error, {
          id: sync.id,
          type: sync.type,
          action: sync.action,
          retryCount: sync.retryCount,
        });
        failCount++;

        const failureCount = sync.retryCount + 1;
        if (failureCount < MAX_RETRY_COUNT) {
          await incrementSyncRetryCount(sync.id!, sync.revision ?? 1, errorMessage);
          syncLogger.debug('Incremented retry count', {
            id: sync.id,
            newRetryCount: failureCount,
          });
        } else {
          syncLogger.error('SYNC FAILURE RETAINED: Automatic retries exhausted', undefined, {
            id: sync.id,
            type: sync.type,
            roundId: sync.data?.roundId?.substring(0, 8) + '...',
            playerId: sync.data?.playerId?.substring(0, 8) + '...',
            maxRetries: MAX_RETRY_COUNT,
            lastError: errorMessage,
          });
          await markPendingSyncFailed(sync.id!, sync.revision ?? 1, errorMessage);
        }
      }
    }

    // Also sync any unsynced scorecards
    const [allUnsyncedScorecards, queuedEntityKeys] = await Promise.all([
      getUnsyncedScorecards(),
      getQueuedEntityKeys(),
    ]);
    const unsyncedScorecards = allUnsyncedScorecards.filter(
      (scorecard) => !queuedEntityKeys.has(scorecardEntityKey(scorecard))
    );

    if (unsyncedScorecards.length > 0) {
      syncLogger.info('Syncing unsynced scorecards', { count: unsyncedScorecards.length });

      // Track rounds that fail with RLS errors - these are likely orphaned/deleted rounds
      const rlsFailedRoundIds = new Set<string>();

      for (const scorecard of unsyncedScorecards) {
        try {
          syncLogger.debug('Syncing unsynced scorecard', logScorecardSummary(scorecard));
          let result;
          try {
            result = await syncScorecard(scorecard);
          } catch (error) {
            if (!(error instanceof ScorecardConflictError)) throw error;
            const resolution = await resolveConflict(scorecard, error);
            if (resolution?.kind === 'final') {
              await markScorecardAsSynced(scorecard.id, error.serverRevision);
              continue;
            }
            if (resolution?.kind !== 'retry') throw error;
            result = await syncScorecard(resolution.scorecard);
          }
          await markScorecardAsSynced(scorecard.id, result.serverRevision);
          notifyScorecardSynced(scorecard.id, result.serverRevision);
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

          if (error instanceof ScorecardConflictError) {
            failCount++;
            conflictCount++;
            // Retain against the server's current revision, so the retained
            // row is recoverable rather than permanently self-conflicting.
            await retainFallbackFailure(
              Number.isFinite(error.serverRevision)
                ? { ...scorecard, serverRevision: error.serverRevision }
                : scorecard,
              errorMessage,
              true
            );
          } else if (isRlsError) {
            syncLogger.error('RLS POLICY ERROR: Scorecard cannot be synced - round may have been deleted', undefined, {
              id: scorecard.id.substring(0, 20) + '...',
              roundId: scorecard.roundId.substring(0, 8) + '...',
              playerId: scorecard.playerId.substring(0, 8) + '...',
            });
            await retainFallbackFailure(scorecard, errorMessage, true);
            rlsFailedRoundIds.add(scorecard.roundId);
            // Don't count as failure since we handled it
          } else {
            syncLogger.error('Failed to sync unsynced scorecard', error, {
              id: scorecard.id.substring(0, 20) + '...',
              roundId: scorecard.roundId.substring(0, 8) + '...',
            });
            failCount++;
            await retainFallbackFailure(scorecard, errorMessage, false);
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

    await updateSyncCounts();

    if (failCount > 0) {
      syncLogger.warn('Sync completed with errors', { successCount, failCount });
      updateState({
        status: 'error',
        error: conflictCount > 0
          ? `${conflictCount} scorecard${conflictCount === 1 ? '' : 's'} changed on another device. Local scores were kept.`
          : `${failCount} sync(s) failed`,
        lastSyncAt: new Date(),
      });
      return false;
    }

    // This drain succeeded. Any rows still retained are dormant failures from
    // earlier sessions — they are reported through `failedCount`, which each
    // surface scopes for itself. Publishing a device-wide message here would
    // paint an error banner over unrelated rounds indefinitely.
    updateState({
      status: currentState.failedCount > 0 ? 'error' : 'idle',
      error: null,
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
async function processPendingSync(sync: PendingSync): Promise<ScorecardSyncResult | void> {
  syncLogger.debug('Processing pending sync entry', {
    id: sync.id,
    type: sync.type,
    action: sync.action,
  });

  switch (sync.type) {
    case 'scorecard':
      return processScorecardSync(sync);
    default:
      throw new Error(`Unsupported sync type: ${sync.type}`);
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

  await updateSyncCounts();

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
 * Retry entries retained after exhausting automatic attempts.
 *
 * An explicit user retry is treated as a decision that the device's own copy
 * should win, so stale-revision rejections are re-attempted against the
 * server's current revision (see `SyncAllOptions`).
 */
export async function retryFailedSyncs(): Promise<boolean> {
  if (!getIsOnline()) {
    updateState({ status: 'offline', error: 'No network connection' });
    return false;
  }

  await resetFailedSyncs();
  await updateSyncCounts();
  return syncAll({ adoptServerRevisionOnConflict: true });
}

/**
 * List operations retained after their automatic retries were exhausted.
 *
 * Retained failures are excluded from every normal drain, so this is the only
 * way to see what is stuck and why.
 */
export async function listFailedSyncs(): Promise<PendingSync[]> {
  return getFailedSyncs();
}

/**
 * Abandon a single retained failure.
 *
 * Some failures can never succeed — the round was deleted, or the user's
 * access to it was revoked — and would otherwise be retained for the life of
 * the install with no way to clear them short of wiping the whole queue.
 */
export async function discardFailedSync(id: number): Promise<boolean> {
  const discarded = await discardPendingSync(id);
  await updateSyncCounts();
  if (currentState.failedCount === 0 && currentState.status === 'error') {
    updateState({ status: getIsOnline() ? 'idle' : 'offline', error: null });
  }
  return discarded;
}

/**
 * Clear all pending syncs and invalid data (manual cleanup)
 */
export async function clearSyncQueue(): Promise<{ pendingCleared: number; invalidCleared: number }> {
  syncLogger.info('Clearing sync queue');
  const pendingCleared = await clearAllPendingSyncs();
  const invalidCleared = await clearInvalidMockData();
  await updateSyncCounts();
  updateState({ status: 'idle', error: null, failedCount: 0 });
  syncLogger.info('Sync queue cleared', { pendingCleared, invalidCleared });
  return { pendingCleared, invalidCleared };
}

function scorecardEntityKey(scorecard: Scorecard): string {
  return `scorecard:${scorecard.roundId}:${scorecard.playerId}`;
}

async function retainFallbackFailure(
  scorecard: Scorecard,
  error: string,
  permanent: boolean
): Promise<void> {
  await addPendingSync({
    type: 'scorecard',
    action: 'update',
    data: scorecard,
    entityKey: scorecardEntityKey(scorecard),
    timestamp: new Date(),
    retryCount: permanent ? MAX_RETRY_COUNT : 1,
    status: permanent ? 'failed' : 'pending',
    lastError: error,
    lastAttemptAt: new Date(),
  });
}
