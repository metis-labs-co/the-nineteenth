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
  getPendingSyncByEntityKey,
  getScorecardsByRound,
} from '../database';
import {
  finalizeSubmittedRound,
  RoundNotReadyError,
} from '@/services/rounds/finalizeSubmittedRound';
import { isTransientError } from '@/services/errors/transient';
import { invalidateLeaderboardCache, invalidateScorecardCache, queryClient } from '@/services/queryClient';
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
import { processScorecardSync, syncScorecard, isValidUUID, ScorecardConflictError, captureScorecardUploadRead, type ScorecardUploadOptions, type ScorecardSyncResult, type ScorecardUploadSelection } from './scorecardSync';
import { RoundScoringWriteError } from '@/services/rounds/roundScoringErrors';
import { scorecardScoringVersion } from '@/services/rounds/roundScoringWrite';
import { registerSyncDrainHandler } from './drain';
import { applyEndRoundEarly, EndRoundEarlyError, roundEndEarlyEntityKey } from '@/services/rounds/applyEndRoundEarly';
import { withRoundScoringWrite, getRoundEndPrerequisite } from '@/services/rounds/roundScoringCoordinator';
import { fetchRoundScoringShape } from '@/services/rounds/roundScoringShape';
import { pendingSyncRecoveryVersion, roundEndIntentRoundId, capturePendingEndIntentSnapshot } from '../dao/pendingSyncRecovery';
import { roundKeys, skinsKeys } from '@/hooks/queryKeys';

function scoringStore() {
  // eslint-disable-next-line @typescript-eslint/no-require-imports, @typescript-eslint/no-var-requires -- scoring store imports the sync barrel
  return (require('@/store/scorecardStore') as typeof import('@/store/scorecardStore')).useScorecardStore.getState();
}
function isEndEarlySync(sync: PendingSync): boolean {
  return sync.data?.action === 'end_early' || roundEndIntentRoundId(sync.entityKey) !== null;
}


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
    // Capture end provenance before the device-wide read reveals round identities.
    const endReadCapture = captureScorecardUploadRead();
    const endSessionCurrent = scoringStore().captureRoundScoringOperation('');
    const initialSyncs = await getPendingSyncs();
    const endOutcome = await processRoundSyncs(
      initialSyncs.filter(isEndEarlySync),
      endReadCapture, endSessionCurrent
    );
    // A successful adoption advances the epoch and repairs queued payloads.
    // Read CURRENT cards with fresh provenance; never relabel pre-end objects.
    const queuedReadCapture = captureScorecardUploadRead();
    const queuedSyncs = await getPendingSyncs();
    const pendingSyncs = queuedSyncs.filter((sync) => sync.type !== 'round' && !isEndEarlySync(sync));
    const roundSyncs = orderRoundSyncs(queuedSyncs.filter((sync) => sync.type === 'round' && !isEndEarlySync(sync)));
    syncLogger.info('Processing pending syncs', {
      count: pendingSyncs.length,
      roundItems: roundSyncs.length,
    });

    let successCount = endOutcome.successCount;
    let failCount = endOutcome.failCount;
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
      error: ScorecardConflictError,
      selection?: ScorecardUploadSelection
    ): Promise<boolean> => {
      if (sync.type !== 'scorecard' || !sync.data || !Number.isFinite(error.serverRevision)) {
        return false;
      }
      if ((sync.data.serverRevision ?? 0) === error.serverRevision) return false;

      sync.data = { ...sync.data, serverRevision: error.serverRevision };
      if (sync.id != null) {
        await raisePendingSyncServerRevision(sync.id, error.serverRevision, ...(selection ? [{
          scorecardId: sync.data.id, roundId: sync.data.roundId, playerId: sync.data.playerId,
          isCurrent: selection.isOwnerCurrent,
        }] : []));
      }
      return true;
    };

    /**
     * Run one queued operation, optionally re-attempting once against the
     * server's current revision when the user asked for this drain.
     */
    const attemptPendingSync = async (
      sync: PendingSync,
      onSelected: (selection: ScorecardUploadSelection) => void
    ): Promise<ScorecardSyncResult | void> => {
      return processPendingSync(sync, {
        capture: queuedReadCapture(String(sync.data?.roundId ?? '')), onSelected,
        adoptServerRevisionOnConflict, markSynced: true, automatic: !adoptServerRevisionOnConflict,
        onSynced: (card, revision) => notifyScorecardSynced(card.id, revision),
      });
    };

    const handlePendingFailure = async (
      sync: PendingSync,
      error: unknown,
      selection?: ScorecardUploadSelection
    ) => {
      if (selection) {
        try {
          await selection.assertCurrent();
        } catch {
          // C2b: a server revision may advance repaired CURRENT content without reviving old work.
          if (error instanceof ScorecardConflictError) {
            try {
              await refreshQueuedRevision(sync, error, selection);
            } catch {
              /* Obsolete owner/session. */
            }
          }
          return;
        }
      }
      try {
        const recoveryGuard = selection
          ? [{ expectedRecovery: { ...sync }, isCurrent: selection.isCurrent }]
          : [];
        const errorMessage = error instanceof Error ? error.message : String(error);

        if (error instanceof RoundScoringWriteError) {
          if (['invalid_shape', 'context_missing', 'out_of_play'].includes(error.kind)) {
            await markPendingSyncFailed(sync.id!, sync.revision ?? 1, errorMessage, ...recoveryGuard);
            failCount++;
          }
          return;
        }

        if (error instanceof ScorecardConflictError) {
          // Park the server's current revision on the row before retaining it,
          // so the next explicit retry starts from a winnable expectation.
          await refreshQueuedRevision(sync, error, selection);
          await markPendingSyncFailed(sync.id!, sync.revision ?? 1, errorMessage, ...recoveryGuard);
          failCount++;
          conflictCount++;
          return;
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
          await markPendingSyncFailed(sync.id!, sync.revision ?? 1, errorMessage, ...recoveryGuard);
          failCount++;
          return;
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
          await incrementSyncRetryCount(sync.id!, sync.revision ?? 1, errorMessage, ...recoveryGuard);
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
          await markPendingSyncFailed(sync.id!, sync.revision ?? 1, errorMessage, ...recoveryGuard);
        }
      } catch (recoveryError) {
        if (
          !selection ||
          !(recoveryError instanceof RoundScoringWriteError) ||
          recoveryError.kind !== 'context_changed' ||
          recoveryError.roundId !== sync.data?.roundId
        )
          throw recoveryError;
        // Native recovery has refused or rolled back this obsolete operation.
        // Its late guard settlement must not prevent unrelated rounds from syncing.
      }
    };

    for (const sync of pendingSyncs) {
      let selection: ScorecardUploadSelection | undefined;
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
        const result = await attemptPendingSync(sync, current => { selection = current; });
        if (!result) {
          const acknowledged = await removePendingSync(sync.id!, sync.revision ?? 1);
          if (!acknowledged) continue;
        }
        successCount++;
        if (sync.type === 'scorecard') {
          scorecardsWereSynced = true;
          if (result && sync.data?.id) freshestRevisions.set(sync.data.id, result.serverRevision);
        }
      } catch (error) {
        await handlePendingFailure(sync, error, selection);
      }
    }

    // Also sync any unsynced scorecards
    const fallbackReadSource = captureRoundPersistenceRead();
    const fallbackCapture = captureScorecardUploadRead();
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
        const capture = fallbackCapture(scorecard.roundId);
        let selection: ScorecardUploadSelection | undefined;
        const isCurrent = () => !capture.session || capture.session.isCurrent();
        try {
          syncLogger.debug('Syncing unsynced scorecard', logScorecardSummary(scorecard));
          await syncScorecard(scorecard, { capture, markSynced: true, automatic: !adoptServerRevisionOnConflict, onSelected: current => { selection = current; },
            onSynced: (card, revision) => notifyScorecardSynced(card.id, revision),
          });
          successCount++;
          scorecardsWereSynced = true;
          syncLogger.debug('Unsynced scorecard synced successfully', {
            id: scorecard.id.substring(0, 20) + '...',
          });
        } catch (error) {
          if (selection) {
            if (selection.queued) { await handlePendingFailure(selection.queued, error, selection); continue; }
            try { await selection.assertCurrent(); } catch { continue; }
          }
          const failedCard = selection?.scorecard ?? scorecard;
          const errorMessage = error instanceof Error ? error.message : String(error);

          if (error instanceof RoundScoringWriteError) {
            if (['invalid_shape', 'context_missing', 'out_of_play'].includes(error.kind)) {
              failCount++;
              const retainedCard =
                error.acceptedWrite?.scorecardId === failedCard.id
                  ? {
                      ...failedCard,
                      serverRevision: Math.max(
                        failedCard.serverRevision ?? 0,
                        error.acceptedWrite.serverRevision
                      ),
                    }
                  : failedCard;
              await retainFallbackFailure(
                retainedCard,
                errorMessage,
                true,
                source,
                capture.ownerId, selection?.isCurrent ?? isCurrent
              );
            }
            continue;
          }

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
                ? { ...failedCard, serverRevision: error.serverRevision }
                : failedCard,
              errorMessage,
              true,
              source,
              capture.ownerId, selection?.isCurrent ?? isCurrent
            );
          } else if (isRlsError) {
            syncLogger.error('RLS POLICY ERROR: Scorecard cannot be synced - round may have been deleted', undefined, {
              id: scorecard.id.substring(0, 20) + '...',
              roundId: scorecard.roundId.substring(0, 8) + '...',
              playerId: scorecard.playerId.substring(0, 8) + '...',
            });
            await retainFallbackFailure(failedCard, errorMessage, true, source, capture.ownerId, selection?.isCurrent ?? isCurrent);
            rlsFailedRoundIds.add(scorecard.roundId);
            // Don't count as failure since we handled it
          } else {
            syncLogger.error('Failed to sync unsynced scorecard', error, {
              id: scorecard.id.substring(0, 20) + '...',
              roundId: scorecard.roundId.substring(0, 8) + '...',
            });
            failCount++;
            await retainFallbackFailure(failedCard, errorMessage, false, source, capture.ownerId, selection?.isCurrent ?? isCurrent);
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

    // Finalization and existing non-end actions follow both upload sources.
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
async function processPendingSync(sync: PendingSync, options: ScorecardUploadOptions = {}): Promise<ScorecardSyncResult | void> {
  syncLogger.debug('Processing pending sync entry', {
    id: sync.id,
    type: sync.type,
    action: sync.action,
  });

  switch (sync.type) {
    case 'scorecard':
      return processScorecardSync(sync, options);
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
 * Drain round items in their selected phase (ends before uploads; finalizes after):
 *  - RoundNotReadyError → stays pending: no retry spent, not a failure;
 *  - RoundSyncPermanentError → retained as failed immediately;
 *  - anything else → normal retry count, retained as failed at MAX_RETRY_COUNT.
 */
async function processRoundSyncs(
  roundSyncs: PendingSync[],
  endCapture?: ReturnType<typeof captureScorecardUploadRead>,
  endSessionCurrent?: () => boolean
): Promise<{ successCount: number; failCount: number }> {
  let successCount = 0;
  let failCount = 0;

  for (const sync of roundSyncs) {
    if (isEndEarlySync(sync)) {
      const outcome = await processRoundEndEarlySync(sync, endCapture!, endSessionCurrent!);
      successCount += outcome.successCount;
      failCount += outcome.failCount;
      continue;
    }
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
 * Run a non-end queued round item. End intents have their own held boundary.
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

/** One coordinator spans end RPC, shared durable repair and exact owned acknowledgment. */
async function processRoundEndEarlySync(
  initial: PendingSync,
  captureRead: ReturnType<typeof captureScorecardUploadRead>,
  isSessionCurrent: () => boolean
): Promise<{ successCount: number; failCount: number }> {
  const roundId = roundEndIntentRoundId(initial.entityKey);
  if (!roundId) {
    // An explicitly declared end without a canonical key is invalid and unscoped.
    // It cannot establish a C4 prerequisite, and no canonical key is synthesized.
    const snapshot = capturePendingEndIntentSnapshot(initial);
    const capture = captureRead(typeof initial.data?.id === 'string' ? initial.data.id : '');
    const isCurrent = () =>
      Boolean(
        capture.ownerId &&
          getSyncAuthUserId() === capture.ownerId &&
          isSessionCurrent() &&
          isRoundPersistenceSourceCurrent(capture.source)
      );
    try {
      const retained = await markPendingSyncFailed(
        snapshot.id!,
        snapshot.revision ?? 1,
        'Malformed unscoped end_early round item',
        { expectedRecovery: snapshot, isCurrent, snapshotMode: 'end_intent' }
      );
      return { successCount: 0, failCount: retained ? 1 : 0 };
    } catch (error) {
      if (
        error instanceof RoundScoringWriteError &&
        ['context_changed', 'unavailable'].includes(error.kind)
      )
        return { successCount: 0, failCount: 0 };
      syncLogger.error('End intent retention failed; keeping the original row', error, {
        id: snapshot.id,
      });
      return { successCount: 0, failCount: 1 };
    }
  }
  const capture = captureRead(roundId);
  return withRoundScoringWrite(roundId, async () => {
    let selected: PendingSync | null = null;
    let expectedSource = capture.source;
    const isCurrent = () =>
      Boolean(
        capture.ownerId &&
          getSyncAuthUserId() === capture.ownerId &&
          isSessionCurrent() &&
          (!capture.session || capture.session.isCurrent()) &&
          isRoundPersistenceSourceCurrent(expectedSource)
      );
    const assertCurrent = async () => {
      if (!isCurrent()) throw new RoundNotReadyError(roundId, 'scoring context changed');
      const current = await getRoundEndPrerequisite(roundId);
      if (
        !isCurrent() ||
        !selected ||
        !current ||
        current.id !== selected.id ||
        current.revision !== selected.revision ||
        current.entityKey !== selected.entityKey ||
        current.endIntentRead?.rawData !== selected.endIntentRead?.rawData ||
        current.endIntentRead?.decode !== selected.endIntentRead?.decode ||
        JSON.stringify(current.data) !== JSON.stringify(selected.data) ||
        pendingSyncRecoveryVersion(current) !== pendingSyncRecoveryVersion(selected)
      )
        throw new RoundNotReadyError(roundId, 'end intent changed');
    };
    try {
      if (!isCurrent()) return { successCount: 0, failCount: 0 };
      const current = await getRoundEndPrerequisite(roundId);
      if (!isCurrent() || !current || current.status === 'failed')
        return { successCount: 0, failCount: 0 };
      // Freeze the selected operation; recovery fields may change without a revision bump.
      selected = capturePendingEndIntentSnapshot({
        ...current,
        data: JSON.parse(JSON.stringify(current.data)),
      });
      if (!selected.endIntentRead) return { successCount: 0, failCount: 0 };
      if (selected.endIntentRead.decode === 'invalid_json')
        throw new RoundSyncPermanentError(
          `Malformed end_early JSON for ${roundId.substring(0, 8)}`
        );
      const owner = selected.data?.userId;
      const n = selected.data?.holesPlayed;
      if (
        selected.type !== 'round' ||
        selected.action !== 'update' ||
        selected.entityKey !== roundEndEarlyEntityKey(roundId) ||
        selected.data?.id !== roundId ||
        selected.data?.action !== 'end_early' ||
        !Number.isInteger(n) ||
        n < 1 ||
        typeof owner !== 'string' ||
        !owner.trim()
      )
        throw new RoundSyncPermanentError(
          `Malformed end_early round item for ${roundId.substring(0, 8)}`
        );
      if (owner !== capture.ownerId) return { successCount: 0, failCount: 0 };
      await assertCurrent();
      let missing = false;
      try {
        await applyEndRoundEarly(roundId, n);
      } catch (error) {
        if (!(error instanceof EndRoundEarlyError)) throw error;
        if (error.code === 'not_found') missing = true;
        else if (error.code !== 'conflict') throw error;
      }
      await assertCurrent();
      if (!missing) {
        const shape = await fetchRoundScoringShape(roundId);
        await assertCurrent();
        if (shape.holes_played === null)
          throw new RoundNotReadyError(roundId, 'authoritative end is unknown');
        // The held entry reuses the one repair core. Its own committed epoch advance is legitimate.
        const { adoptRoundShapeWithinScoringWrite } =
          // eslint-disable-next-line @typescript-eslint/no-require-imports, @typescript-eslint/no-var-requires -- avoid store/sync import cycle
          require('@/services/rounds/roundScoringAdoption') as typeof import('@/services/rounds/roundScoringAdoption');
        await adoptRoundShapeWithinScoringWrite(roundId, shape, {
          ownerId: capture.ownerId!,
          originalSession: capture.session,
          isCurrent: () =>
            getSyncAuthUserId() === capture.ownerId &&
            isSessionCurrent() &&
            (!capture.session || capture.session.isCurrent()),
        });
        expectedSource = { ...capture.source, epoch: capture.source.epoch + 1 };
        await assertCurrent();
        void queryClient.invalidateQueries({ queryKey: skinsKeys.holeCounts(roundId) });
        void queryClient.invalidateQueries({ queryKey: roundKeys.detail(roundId) });
      }
      // Explicit P0002 only drops matching OWNED work; unavailable reads never enter this path.
      if (missing && owner !== capture.ownerId) return { successCount: 0, failCount: 0 };
      const acknowledged = await removePendingSync(
        selected.id!,
        selected.revision ?? 1,
        isCurrent,
        undefined,
        { expectedRecovery: selected }
      );
      return { successCount: acknowledged ? 1 : 0, failCount: 0 };
    } catch (error) {
      if (!isCurrent()) return { successCount: 0, failCount: 0 };
      if (!selected) {
        if (error instanceof RoundNotReadyError || error instanceof RoundScoringWriteError)
          return { successCount: 0, failCount: 0 };
        syncLogger.error('End intent prerequisite read failed; keeping dependent work blocked', error, {
          roundId,
        });
        return { successCount: 0, failCount: 1 };
      }
      try {
        await assertCurrent();
      } catch (readError) {
        if (
          !isCurrent() ||
          readError instanceof RoundNotReadyError ||
          readError instanceof RoundScoringWriteError
        )
          return { successCount: 0, failCount: 0 };
        syncLogger.error(
          'End intent prerequisite recheck failed; keeping dependent work blocked',
          readError,
          { roundId }
        );
        return { successCount: 0, failCount: 1 };
      }
      const permanent =
        error instanceof RoundSyncPermanentError ||
        (error instanceof EndRoundEarlyError && ['forbidden', 'invalid'].includes(error.code));
      if (!permanent) {
        if (
          error instanceof EndRoundEarlyError ||
          error instanceof RoundNotReadyError ||
          error instanceof RoundScoringWriteError
        )
          return { successCount: 0, failCount: 0 };
        syncLogger.error('End intent repair failed; keeping dependent work blocked', error, {
          roundId,
        });
        return { successCount: 0, failCount: 1 };
      }
      const message = error instanceof Error ? error.message : String(error);
      try {
        const retained = await markPendingSyncFailed(
          selected.id!,
          selected.revision ?? 1,
          message,
          { expectedRecovery: selected, isCurrent, snapshotMode: 'end_intent' }
        );
        return { successCount: 0, failCount: retained ? 1 : 0 };
      } catch (recoveryError) {
        if (
          recoveryError instanceof RoundScoringWriteError &&
          recoveryError.kind === 'context_changed'
        )
          return { successCount: 0, failCount: 0 };
        syncLogger.error('End intent retention failed; keeping the original row', recoveryError, {
          roundId,
        });
        return { successCount: 0, failCount: 1 };
      }
    }
  });
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
  // A retained end must be visible before pending cards mask it, so Retry revives both.
  const end = await getRoundEndPrerequisite(roundId);
  if (end?.status === 'failed') {
    throw new RoundSyncPermanentError(
      `Round ${roundId.substring(0, 8)} is waiting on a retained end-round-early failure; retry that first`
    );
  }
  if (end) throw new RoundNotReadyError(roundId, 'is waiting on end-round-early');
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
  ownerId: string | null,
  isCurrent: () => boolean
): Promise<void> {
  try {
    await runRoundPersistence(
      scorecard.roundId,
      { source },
      async () => {
        if (!ownerId || getSyncAuthUserId() !== ownerId || !isCurrent()) return;
        if (await getPendingSyncByEntityKey(scorecardEntityKey(scorecard))) return;
        const current = (await getScorecardsByRound(scorecard.roundId)).find(
          (card) => card.id === scorecard.id && card.playerId === scorecard.playerId
        );
        if (
          getSyncAuthUserId() !== ownerId ||
          !isCurrent() ||
          !current ||
          scorecardScoringVersion(current) !== scorecardScoringVersion(scorecard)
        )
          return;
        await addPendingSync(
          {
            type: 'scorecard',
            action: 'update',
            data: {
              ...scorecard,
              serverRevision: Math.max(scorecard.serverRevision ?? 0, current.serverRevision ?? 0),
            },
            entityKey: scorecardEntityKey(scorecard),
            timestamp: new Date(),
            retryCount: permanent ? MAX_RETRY_COUNT : 1,
            status: permanent ? 'failed' : 'pending',
            lastError: error,
            lastAttemptAt: new Date(),
          },
          {
            ifAbsent: true,
            expectedScorecard: {
              scorecardId: current.id,
              roundId: current.roundId,
              playerId: current.playerId,
              version: scorecardScoringVersion(current),
            },
            isCurrent: () =>
              getSyncAuthUserId() === ownerId &&
              isRoundPersistenceSourceCurrent(source) &&
              isCurrent(),
          }
        );
      },
      scorecard
    );
  } catch (error) {
    // C4 owns network recovery; an obsolete failure object cannot replace repaired local work.
    if (
      !(error instanceof RoundPersistenceSourceChangedError) &&
      !(error instanceof RoundScoringWriteError && error.kind === 'context_changed')
    )
      throw error;
  }
}
