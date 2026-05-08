/**
 * SQLite Database Service for Offline Scorecard Storage
 *
 * This file re-exports from the new DAO architecture for backward compatibility.
 * New code should import directly from the specific DAO modules.
 *
 * @deprecated Import from specific modules instead:
 *   - DatabaseManager: initDatabase, closeDatabase, clearAllData
 *   - dao/ScorecardDAO: saveScorecard, getScorecardsByRound, etc.
 *   - dao/HoleScoreDAO: saveHoleScore, getHoleScores, etc.
 *   - dao/HolesDAO: saveHoles, getHoles
 *   - dao/SyncQueueDAO: addPendingSync, getPendingSyncs, etc.
 */

// Database Manager
export { initDatabase, closeDatabase, clearAllData, __resetDatabaseState } from './DatabaseManager';

// Scorecard operations
export {
  saveScorecard,
  getScorecardsByRound,
  deleteScorecard,
  deleteScorecardsByRound,
  markScorecardsAsSynced,
  getUnsyncedScorecards,
  markAllScorecardsAsSynced,
  markAllForResync,
  deleteOrphanedScorecards,
  clearInvalidMockData,
  getHolesCompletedByRounds,
} from './dao/ScorecardDAO';

// Hole score operations
export { saveHoleScore, getHoleScores } from './dao/HoleScoreDAO';

// Holes operations
export { saveHoles, getHoles, deleteHoles } from './dao/HolesDAO';

// Sync queue operations
export {
  addPendingSync,
  getPendingSyncs,
  removePendingSync,
  incrementSyncRetryCount,
  getPendingSyncCount,
  clearAllPendingSyncs,
} from './dao/SyncQueueDAO';
