/**
 * Sync Orchestrator
 *
 * Coordinates sync operations between local storage and Supabase.
 * Manages sync queue, state, and scheduling.
 */

import { captureRoundPersistenceRead, isRoundPersistenceSourceCurrent, RoundPersistenceSourceChangedError, runRoundPersistence, type RoundPersistenceOptions, type RoundPersistenceSource } from '../roundPersistenceBarrier';
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
  raisePendingSyncServerRevision,
  hasUnsyncedScorecardsForRound,
  getFailedSyncCountForRound,
} from '../database';
import {
  finalizeSubmittedRound,
  RoundNotReadyError,
} from '@/services/rounds/finalizeSubmittedRound';
import { isTransientError } from '@/services/errors/transient';
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
  getSyncAuthUserId,
} from './networkState';
import { processScorecardSync, syncScorecard, isValidUUID, ScorecardConflictError, type ScorecardSyncResult } from './scorecardSync';
import { registerSyncDrainHandler } from './drain';

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

  // requestSyncDrain (drain.ts) runs this; registering it here keeps that
  // module free of an import of the orchestrator.
  registerSyncDrainHandler(() => syncAll());

  // Initialize network state monitoring
  const unsubscribe = initNetworkState();

  // Initial pending count
  updateSyncCounts();

  return unsubscribe;
}

let syncServiceStarted = false;

/**
 * Start the sync service for the app's lifetime. Idempotent. The app root
 * calls it once the SQLite database is open (useAppSyncService), and
 * useOfflineSync calls it as a fallback. Its network listener is never torn
 * down: queued uploads and round finalisations must keep draining after the
 * scoring screens unmount. Draining itself is requested separately
 * (requestSyncDrain), once a user is signed in.
 */
export function ensureSyncServiceStarted(): void {
  if (syncServiceStarted) return;
  syncServiceStarted = true;
  initSyncService();
}

/** Test-only: let ensureSyncServiceStarted start the service again. */
export function __resetSyncServiceForTests(): void {
  syncServiceStarted = false;
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

  // No drain while signed out, whatever triggered it (network callback,
  // queueScorecardSync, a drain request, Retry). useAppSyncService records
  // the user and requests a drain on sign-in.
  if (!getSyncAuthUserId()) {
    syncLogger.debug('No signed-in user, skipping sync');
    return false;
  }

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
    // Get pending syncs. `round` items are held back: they run after every
    // scorecard upload in this drain — the queue AND the SQLite fallback below.
    const queuedSyncs = await getPendingSyncs();
    const pendingSyncs = queuedSyncs.filter((sync) => sync.type !== 'round');
    const roundSyncs = orderRoundSyncs(queuedSyncs.filter((sync) => sync.type === 'round'));
    syncLogger.info('Processing pending syncs', {
      count: pendingSyncs.length,
      roundItems: roundSyncs.length,
    });

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
        await raisePendingSyncServerRevision(sync.id, error.serverRevision);
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
        if (!adoptServerRevisionOnConflict) throw error;
        if (!(error instanceof ScorecardConflictError)) throw error;
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
    const fallbackReadSource = captureRoundPersistenceRead();
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
        const source = fallbackReadSource(scorecard.roundId);
        if (!isRoundPersistenceSourceCurrent(source)) continue;
        try {
          syncLogger.debug('Syncing unsynced scorecard', logScorecardSummary(scorecard));
          const result = await syncScorecard(scorecard);
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
              true,
              source
            );
          } else if (isRlsError) {
            syncLogger.error('RLS POLICY ERROR: Scorecard cannot be synced - round may have been deleted', undefined, {
              id: scorecard.id.substring(0, 20) + '...',
              roundId: scorecard.roundId.substring(0, 8) + '...',
              playerId: scorecard.playerId.substring(0, 8) + '...',
            });
            await retainFallbackFailure(scorecard, errorMessage, true, source);
            rlsFailedRoundIds.add(scorecard.roundId);
            // Don't count as failure since we handled it
          } else {
            syncLogger.error('Failed to sync unsynced scorecard', error, {
              id: scorecard.id.substring(0, 20) + '...',
              roundId: scorecard.roundId.substring(0, 8) + '...',
            });
            failCount++;
            await retainFallbackFailure(scorecard, errorMessage, false, source);
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

    // Round items last: every upload this device could make has been tried.
    const roundOutcome = await processRoundSyncs(roundSyncs);
    successCount += roundOutcome.successCount;
    failCount += roundOutcome.failCount;

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
 * A round item that must not be retried automatically: it is retained as
 * `failed` at once, for an explicit Retry. Used when the round's only
 * unconfirmed cards are retained failures (B6b also throws it for the
 * end-early RPC's validation errors).
 */
class RoundSyncPermanentError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'RoundSyncPermanentError';
  }
}

/**
 * Order `round` items: every action other than 'finalize' (B6b's
 * 'end_early') first, then queue order. Array.prototype.sort is stable.
 */
function orderRoundSyncs(syncs: PendingSync[]): PendingSync[] {
  const rank = (sync: PendingSync): number => (sync.data?.action === 'finalize' ? 1 : 0);
  return [...syncs].sort((a, b) => rank(a) - rank(b));
}

/**
 * Drain the `round` items (after all scorecard uploads):
 *  - RoundNotReadyError → stays pending: no retry spent, not a failure;
 *  - RoundSyncPermanentError → retained as failed immediately;
 *  - anything else → normal retry count, retained as failed at MAX_RETRY_COUNT.
 */
async function processRoundSyncs(
  roundSyncs: PendingSync[]
): Promise<{ successCount: number; failCount: number }> {
  let successCount = 0;
  let failCount = 0;

  for (const sync of roundSyncs) {
    try {
      await processRoundSync(sync);
      const acknowledged = await removePendingSync(sync.id!, sync.revision ?? 1);
      if (acknowledged) {
        successCount++;
      } else {
        // Re-queued while it ran; the newer row runs on the next drain.
        syncLogger.info('Round item re-queued during sync; leaving the newer one pending', { id: sync.id });
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);

      if (error instanceof RoundNotReadyError) {
        // This device's cards are still uploading, or the round is being
        // finalised right now (A6a-2's in-flight check).
        syncLogger.info('Round item not ready yet; leaving it queued', {
          id: sync.id,
          roundId: String(sync.data?.id ?? '').substring(0, 8) + '...',
          reason: errorMessage,
        });
        continue;
      }

      failCount++;

      if (error instanceof RoundSyncPermanentError) {
        syncLogger.warn('Round item retained for explicit retry', { id: sync.id, reason: errorMessage });
        await markPendingSyncFailed(sync.id!, sync.revision ?? 1, errorMessage);
        continue;
      }

      syncLogger.error('Failed to process round sync', error, {
        id: sync.id,
        action: sync.data?.action,
        retryCount: sync.retryCount,
      });
      if (sync.retryCount + 1 < MAX_RETRY_COUNT) {
        await incrementSyncRetryCount(sync.id!, sync.revision ?? 1, errorMessage);
      } else {
        await markPendingSyncFailed(sync.id!, sync.revision ?? 1, errorMessage);
      }
    }
  }

  return { successCount, failCount };
}

/**
 * Run one queued `round` item. Extension point: B6b adds
 * `case 'end_early'` (queueRoundEndEarly).
 */
async function processRoundSync(sync: PendingSync): Promise<void> {
  const roundId: unknown = sync.data?.id;
  if (typeof roundId !== 'string' || roundId.length === 0) {
    throw new Error('Round sync item has no round id');
  }

  // SQLite survives sign-out: an item queued by another user on this phone
  // waits for them (no retry spent) instead of running under this session.
  // Items without an owner (older builds) run for whoever is signed in.
  const owner: unknown = sync.data?.userId;
  if (typeof owner === 'string' && owner.length > 0 && owner !== getSyncAuthUserId()) {
    throw new RoundNotReadyError(roundId, 'is queued for another user');
  }

  const action: unknown = sync.data?.action;
  switch (action) {
    case 'finalize':
      return processRoundFinalize(roundId);
    default:
      throw new Error(`Unsupported round sync action: ${String(action)}`);
  }
}

/** Rethrow a non-Error failure value as an Error (so its message is recorded). */
function asError(value: unknown): Error {
  return value instanceof Error ? value : new Error(String(value));
}

/**
 * A queued "finalise round" (queueRoundFinalize): the same status → results
 * → skins steps an online submit runs (finalizeSubmittedRound).
 */
async function processRoundFinalize(roundId: string): Promise<void> {
  // 1. Before any server call: wait while this device's own uploads for the
  //    round are pending.
  if (await hasUnsyncedScorecardsForRound(roundId)) {
    throw new RoundNotReadyError(roundId);
  }

  // 2. A card retained as failed never uploads on its own; finalising now
  //    would drop this item for good. Fail it too, so Retry revives both and
  //    the drain order uploads the card first.
  if ((await getFailedSyncCountForRound(roundId)) > 0) {
    throw new RoundSyncPermanentError(
      `Round ${roundId.substring(0, 8)} is waiting on a retained scorecard upload failure; retry that upload first`
    );
  }

  // Step 3 (B6b-2): end_early gate. A finalize item for a round whose
  // 'end_early' item is retained as failed must not sit pending for ever
  // behind it. B6b-2 owns that check and adds it here, before any server call.

  // 4. Run the steps. If a submit screen is finalising this round right now,
  //    finalizeSubmittedRound's atomic in-flight check rejects with
  //    RoundNotReadyError: the item waits (its finalizeOrQueueRound keeps or
  //    removes it when it finishes). A failed status write, then a TRANSIENT
  //    skins failure, takes the normal retry path; re-running the steps is
  //    idempotent.
  const { completed, statusError, skinsError } = await finalizeSubmittedRound(roundId);
  if (statusError) {
    throw asError(statusError);
  }
  if (skinsError) {
    if (isTransientError(skinsError)) {
      throw asError(skinsError);
    }
    // Permanent (an RLS refusal — skins_payouts is creator-only — validation,
    // a missing game): no retry can fix it, so don't let it end retained.
    syncLogger.warn('Skins settlement failed permanently; not retrying', {
      roundId: roundId.substring(0, 8) + '...',
      error: asError(skinsError).message,
    });
  }

  if (!completed) {
    // Not every card is in yet, but none of the missing ones are on this
    // device: whichever device submits the last card completes the round.
    syncLogger.info('Round not complete yet; the last submitting device will complete it', {
      roundId: roundId.substring(0, 8) + '...',
    });
  }
}

/**
 * Queue a scorecard update for sync
 */
export async function queueScorecardSync(
  scorecard: Scorecard,
  action: 'create' | 'update' | 'delete' = 'update',
  options: RoundPersistenceOptions = {},
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

  await runRoundPersistence(scorecard.roundId, options, async () => {
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
  }, action === 'delete' ? undefined : scorecard);

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
  permanent: boolean,
  source: RoundPersistenceSource,
): Promise<void> {
  try {
    await runRoundPersistence(scorecard.roundId, { source }, async () => addPendingSync({
    type: 'scorecard',
    action: 'update',
    data: scorecard,
    entityKey: scorecardEntityKey(scorecard),
    timestamp: new Date(),
    retryCount: permanent ? MAX_RETRY_COUNT : 1,
    status: permanent ? 'failed' : 'pending',
    lastError: error,
    lastAttemptAt: new Date(),
    }), scorecard);
  } catch (error) {
    // C4 owns network recovery; an obsolete failure object cannot replace repaired local work.
    if (!(error instanceof RoundPersistenceSourceChangedError)) throw error;
  }
}
