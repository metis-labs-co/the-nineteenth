/**
 * Sync Module
 *
 * Handles offline synchronization between local SQLite and Supabase.
 *
 * This module is organized into:
 * - types.ts: Shared types and constants
 * - networkState.ts: Network monitoring
 * - scorecardSync.ts: Scorecard sync logic
 * - syncOrchestrator.ts: Main sync coordination
 *
 * @example
 * ```tsx
 * // Import from sync module
 * import { initSyncService, syncAll, queueScorecardSync } from '@/services/offline/sync';
 *
 * // Or from main sync.ts (backward compatible)
 * import { initSyncService, syncAll, queueScorecardSync } from '@/services/offline/sync.ts';
 * ```
 */

// Re-export types
export type { SyncState, SyncStatus, SyncListener } from './types';
export { MAX_RETRY_COUNT, INITIAL_SYNC_STATE } from './types';

// Re-export network state functions
export { getIsOnline, getIsSyncing, setSyncAuthUser } from './networkState';

// Re-export scorecard sync functions
export { isValidUUID, syncScorecard, captureScorecardUpload, processScorecardSync, ScorecardConflictError } from './scorecardSync';

// Drain requests (debounced; see drain.ts)
export { requestSyncDrain } from './drain';

// Re-export orchestrator functions (main API)
export {
  initSyncService,
  ensureSyncServiceStarted,
  subscribeSyncState,
  subscribeScorecardSynced,
  getSyncState,
  syncAll,
  queueScorecardSync,
  manualSync,
  retryFailedSyncs,
  listFailedSyncs,
  discardFailedSync,
  clearSyncQueue,
  setScorecardConflictResolver,
} from './syncOrchestrator';
export type {
  ScorecardSyncedEvent,
  ScorecardConflictResolution,
  ScorecardConflictResolver,
} from './syncOrchestrator';
