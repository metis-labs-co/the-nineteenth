/**
 * Offline Sync Service
 *
 * Handles synchronization between local SQLite database and Supabase.
 * Implements background sync when network becomes available.
 */

import NetInfo, { NetInfoState } from '@react-native-community/netinfo';
import {
  getPendingSyncs,
  removePendingSync,
  incrementSyncRetryCount,
  markScorecardsAsSynced,
  getUnsyncedScorecards,
  addPendingSync,
  getPendingSyncCount,
  clearInvalidMockData,
  clearAllPendingSyncs,
} from './database';
import { supabase } from '@/services/supabase/client';
import { invalidateLeaderboardCache, invalidateScorecardCache } from '@/services/queryClient';
import type { Scorecard, PendingSync } from '@/types';
import { syncLogger, logScorecardSummary } from '@/utils/debugLogger';

const MAX_RETRY_COUNT = 3;

type SyncStatus = 'idle' | 'syncing' | 'error' | 'offline';

interface SyncState {
  status: SyncStatus;
  pendingCount: number;
  lastSyncAt: Date | null;
  error: string | null;
}

// Listeners for sync state changes
type SyncListener = (state: SyncState) => void;
const listeners: Set<SyncListener> = new Set();

let currentState: SyncState = {
  status: 'idle',
  pendingCount: 0,
  lastSyncAt: null,
  error: null,
};

let isOnline = true;
let isSyncing = false;

/**
 * Initialize the sync service
 */
export function initSyncService(): () => void {
  syncLogger.info('Initializing sync service');

  // Subscribe to network state changes
  const unsubscribe = NetInfo.addEventListener(handleNetworkChange);

  // Check initial network state
  NetInfo.fetch().then((state) => {
    isOnline = state.isConnected ?? false;
    syncLogger.info('Initial network state', { isOnline, type: state.type });
    updateState({ status: isOnline ? 'idle' : 'offline' });
  });

  // Clear any invalid mock data from previous sessions
  clearInvalidMockData()
    .then((cleared) => {
      if (cleared > 0) {
        syncLogger.info('Cleared invalid mock data', { count: cleared });
      }
    })
    .catch((err) => {
      syncLogger.warn('Failed to clear invalid mock data', { error: String(err) });
    });

  // Initial pending count
  updatePendingCount();

  return unsubscribe;
}

/**
 * Handle network state changes
 */
async function handleNetworkChange(state: NetInfoState): Promise<void> {
  const wasOffline = !isOnline;
  isOnline = state.isConnected ?? false;

  syncLogger.debug('Network state changed', {
    isOnline,
    wasOffline,
    type: state.type,
    isInternetReachable: state.isInternetReachable,
  });

  if (isOnline && wasOffline) {
    // Just came online - trigger sync
    syncLogger.info('Network restored, triggering sync');
    await syncAll();
  } else if (!isOnline) {
    syncLogger.info('Network offline');
    updateState({ status: 'offline' });
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
async function updatePendingCount(): Promise<void> {
  const count = await getPendingSyncCount();
  updateState({ pendingCount: count });
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
 * Check if device is online
 */
export function getIsOnline(): boolean {
  return isOnline;
}

/**
 * Sync all pending changes to the server
 */
export async function syncAll(): Promise<boolean> {
  if (isSyncing) {
    syncLogger.debug('Already syncing, skipping');
    return false;
  }

  if (!isOnline) {
    syncLogger.debug('Offline, skipping sync');
    updateState({ status: 'offline' });
    return false;
  }

  isSyncing = true;
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
          const isRlsError = errorMessage.includes('row-level security policy') ||
                            errorMessage.includes('42501');

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
          roundIds: Array.from(rlsFailedRoundIds).map(id => id.substring(0, 8) + '...'),
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
    isSyncing = false;
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
 * Process scorecard sync
 */
async function processScorecardSync(sync: PendingSync): Promise<void> {
  const { action, data } = sync;

  syncLogger.debug('Processing scorecard sync', { action, dataId: data?.id });

  switch (action) {
    case 'create':
    case 'update':
      await syncScorecard(data as Scorecard);
      break;
    case 'delete':
      syncLogger.info('Delete scorecard (not implemented)', { dataId: data.id });
      break;
    default:
      syncLogger.warn('Unknown action', { action });
  }
}

/**
 * Check if a string is a valid UUID
 */
function isValidUUID(str: string): boolean {
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  return uuidRegex.test(str);
}

/**
 * Sync a scorecard to the server (Supabase)
 */
async function syncScorecard(scorecard: Scorecard): Promise<void> {
  syncLogger.info('Syncing scorecard to Supabase', logScorecardSummary(scorecard));

  // Skip standalone rounds - they are local-only and don't sync to server
  if (scorecard.isStandalone) {
    syncLogger.info('Skipping standalone scorecard (local-only)', {
      id: scorecard.id.substring(0, 20) + '...',
    });
    return;
  }

  // Validate that round_id and player_id are valid UUIDs
  if (!isValidUUID(scorecard.roundId)) {
    syncLogger.error('Invalid round_id (not a UUID)', undefined, {
      roundId: scorecard.roundId,
      playerId: scorecard.playerId,
    });
    throw new Error(`Invalid round_id: ${scorecard.roundId} is not a valid UUID. Make sure you're using real competition data, not mock data.`);
  }

  if (!isValidUUID(scorecard.playerId)) {
    syncLogger.error('Invalid player_id (not a UUID)', undefined, {
      roundId: scorecard.roundId,
      playerId: scorecard.playerId,
    });
    throw new Error(`Invalid player_id: ${scorecard.playerId} is not a valid UUID. Make sure you're using real competition data, not mock data.`);
  }

  // Transform scores object to ensure string keys (Supabase JSONB compatibility)
  const scoresForDb: Record<string, { strokes: number; putts?: number; penalties?: number }> = {};
  let holesWithScores = 0;
  for (const [holeNum, score] of Object.entries(scorecard.scores)) {
    if (score && score.strokes !== undefined) {
      scoresForDb[String(holeNum)] = {
        strokes: score.strokes,
        putts: score.putts,
        penalties: score.penalties || 0,
      };
      holesWithScores++;
    }
  }

  syncLogger.debug('Prepared scores for Supabase', {
    holesWithScores,
    totalGross: scorecard.totalGross,
    totalNet: scorecard.totalNet,
    status: scorecard.status,
  });

  // Helper to safely convert date to ISO string (handles both Date objects and strings)
  const toISOString = (date: Date | string | undefined | null): string | null => {
    if (!date) return null;
    if (date instanceof Date) return date.toISOString();
    // Already a string (from JSON.parse of stored data)
    return typeof date === 'string' ? date : null;
  };

  // Prepare data for Supabase upsert
  // Don't send 'id' - let Supabase generate it or use the unique constraint (round_id, player_id)
  const scorecardData = {
    round_id: scorecard.roundId,
    player_id: scorecard.playerId,
    scores: scoresForDb,
    total_gross: scorecard.totalGross || 0,
    total_net: scorecard.totalNet || 0,
    total_points: scorecard.totalNet || 0, // For Stableford, use totalNet as points
    status: scorecard.status === 'in-progress' ? 'in-progress' : scorecard.status,
    submitted_at: toISOString(scorecard.submittedAt),
    submitted_by: scorecard.submittedBy || null,
    synced_at: new Date().toISOString(),
  };

  syncLogger.debug('Upserting to Supabase', {
    roundId: scorecard.roundId.substring(0, 8) + '...',
    playerId: scorecard.playerId.substring(0, 8) + '...',
    status: scorecardData.status,
    hasSubmittedAt: !!scorecardData.submitted_at,
  });

  // Use type assertion due to Supabase types configuration
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { error, data } = await (supabase
    .from('scorecards') as any)
    .upsert(scorecardData, {
      onConflict: 'round_id,player_id',
    });

  if (error) {
    syncLogger.error('Supabase upsert error', error, {
      errorCode: error.code,
      errorMessage: error.message,
      errorDetails: error.details,
      errorHint: error.hint,
      roundId: scorecard.roundId.substring(0, 8) + '...',
      playerId: scorecard.playerId.substring(0, 8) + '...',
    });
    throw new Error(`Failed to sync scorecard: ${error.message}`);
  }

  syncLogger.info('Scorecard synced successfully', {
    roundId: scorecard.roundId.substring(0, 8) + '...',
    playerId: scorecard.playerId.substring(0, 8) + '...',
    holesScored: holesWithScores,
  });
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
  if (isOnline && !isSyncing) {
    syncLogger.debug('Triggering immediate sync (online and not already syncing)');
    // Don't await - sync in background
    syncAll().catch((error) => {
      syncLogger.error('Background sync failed', error);
    });
  } else {
    syncLogger.debug('Sync deferred', { isOnline, isSyncing });
  }
}

/**
 * Force a manual sync attempt
 */
export async function manualSync(): Promise<boolean> {
  syncLogger.info('Manual sync requested', { isOnline });

  if (!isOnline) {
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
