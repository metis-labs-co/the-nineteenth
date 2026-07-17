/**
 * Offline Sync Service
 *
 * @deprecated This file re-exports from the new modular sync service.
 * Import directly from '@/services/offline/sync' for new code.
 *
 * @example
 * ```tsx
 * // Preferred: Import from new module
 * import { initSyncService, syncAll, queueScorecardSync } from '@/services/offline/sync';
 *
 * // Legacy: Still works for backward compatibility
 * import { initSyncService, syncAll } from '@/services/offline/sync.ts';
 * ```
 */

// Re-export everything from the new sync module
export {
  // Types
  type SyncState,
  type SyncStatus,
  type SyncListener,
  MAX_RETRY_COUNT,
  INITIAL_SYNC_STATE,
  // Network state
  getIsOnline,
  getIsSyncing,
  // Scorecard sync
  isValidUUID,
  syncScorecard,
  processScorecardSync,
  ScorecardConflictError,
  // Orchestrator (main API)
  initSyncService,
  subscribeSyncState,
  subscribeScorecardSynced,
  type ScorecardSyncedEvent,
  getSyncState,
  syncAll,
  queueScorecardSync,
  manualSync,
  retryFailedSyncs,
  clearSyncQueue,
} from './sync/index';
