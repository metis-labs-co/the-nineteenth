/**
 * Sync Service Types
 *
 * Shared types and constants for offline sync modules.
 */

/**
 * Maximum retry count before giving up on a sync operation
 */
export const MAX_RETRY_COUNT = 3;

/**
 * Sync status values
 */
export type SyncStatus = 'idle' | 'syncing' | 'error' | 'offline';

/**
 * Current sync state
 */
export interface SyncState {
  status: SyncStatus;
  pendingCount: number;
  failedCount: number;
  lastSyncAt: Date | null;
  error: string | null;
}

/**
 * Listener callback for sync state changes
 */
export type SyncListener = (state: SyncState) => void;

/**
 * Initial sync state
 */
export const INITIAL_SYNC_STATE: SyncState = {
  status: 'idle',
  pendingCount: 0,
  failedCount: 0,
  lastSyncAt: null,
  error: null,
};
