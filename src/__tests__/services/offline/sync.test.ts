/**
 * Offline Sync Service Tests
 *
 * Tests the synchronization between local SQLite database and Supabase,
 * including network state handling, sync queue management, and error recovery.
 *
 * Note: The sync service uses module-level state which makes some tests
 * dependent on execution order. Tests are grouped to minimize state conflicts.
 */

import { captureRoundPersistenceSource as capturePersistence, withRoundPersistenceTransition as transitionPersistence, RoundPersistenceSourceChangedError } from '@/services/offline/roundPersistenceBarrier';
import NetInfo from '@react-native-community/netinfo';
import { Platform } from 'react-native';
import {
  initSyncService,
  getSyncState,
  getIsOnline,
  syncAll,
  queueScorecardSync,
  manualSync,
  retryFailedSyncs,
  clearSyncQueue,
  subscribeSyncState,
  subscribeScorecardSynced,
  discardFailedSync,
  listFailedSyncs,
} from '@/services/offline/sync';
import * as database from '@/services/offline/database';
import { setSyncAuthUser } from '@/services/offline/sync/networkState';
import { supabase } from '@/services/supabase/client';
import * as queryClient from '@/services/queryClient';
import { saveScoreEntries } from '@/services/scoreMismatch';
import { addPendingSync as addActualPendingSync } from '@/services/offline/dao/SyncQueueDAO';
import { getDb } from '@/services/offline/DatabaseManager';
import type { Scorecard, PendingSync } from '@/types';
import { syncScorecard, ScorecardConflictError } from '@/services/offline/sync/scorecardSync';
import { finalizeSubmittedRound, RoundNotReadyError } from '@/services/rounds/finalizeSubmittedRound';
import { registerSyncDrainHandler } from '@/services/offline/sync/drain';
import { ensureSyncServiceStarted, __resetSyncServiceForTests } from '@/services/offline/sync/syncOrchestrator';
import { createError } from '@/services/errors';

// ============================================================================
// MOCK SETUP
// ============================================================================

// Mock the database module
jest.mock('@/services/offline/DatabaseManager', () => ({ getDb: jest.fn() }));
jest.mock('@/services/offline/database', () => ({
  getPendingSyncs: jest.fn(),
  getPendingSyncByEntityKey: jest.fn(), getScorecardsByRound: jest.fn(), recordAcceptedScorecardWrite: jest.fn(),
  removePendingSync: jest.fn(),
  incrementSyncRetryCount: jest.fn(),
  markScorecardsAsSynced: jest.fn(),
  markScorecardAsSynced: jest.fn(),
  getUnsyncedScorecards: jest.fn(),
  addPendingSync: jest.fn(),
  getPendingSyncCount: jest.fn(),
  getFailedSyncCount: jest.fn(),
  getQueuedEntityKeys: jest.fn(),
  markPendingSyncFailed: jest.fn(),
  resetFailedSyncs: jest.fn(),
  clearInvalidMockData: jest.fn(),
  clearAllPendingSyncs: jest.fn(),
  getFailedSyncs: jest.fn(),
  discardPendingSync: jest.fn(),
  updatePendingSyncData: jest.fn(),
  raisePendingSyncServerRevision: jest.fn(),
  recordScorecardServerRevision: jest.fn(),
  hasUnsyncedScorecardsForRound: jest.fn(),
  getFailedSyncCountForRound: jest.fn(),
}));

// Mock query client invalidation
jest.mock('@/services/queryClient', () => ({
  invalidateLeaderboardCache: jest.fn(),
  invalidateScorecardCache: jest.fn(),
  invalidateHandicapCache: jest.fn(),
}));

// Mock getCurrentUser from supabase client (used by syncScorecard for score entry attribution)
jest.mock('@/services/supabase/client', () => ({
  supabase: {
    rpc: jest.fn(() => Promise.resolve({
      data: [{ applied: true, conflict: false, server_revision: 1, server_status: 'completed', server_scores: {} }],
      error: null,
    })),
    from: jest.fn(() => ({
      select: jest.fn().mockReturnThis(),
      insert: jest.fn().mockReturnThis(),
      update: jest.fn().mockReturnThis(),
      delete: jest.fn().mockReturnThis(),
      upsert: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      neq: jest.fn().mockReturnThis(),
      order: jest.fn().mockReturnThis(),
      limit: jest.fn().mockReturnThis(),
      single: jest.fn(() => Promise.resolve({ data: null, error: null })),
      abortSignal: jest.fn().mockReturnThis(), is: jest.fn().mockReturnThis(),
      maybeSingle: jest.fn(() => Promise.resolve({ data: { nine_type: 'full', holes_played: null }, error: null })),
      then: jest.fn((resolve) => resolve({ data: [], error: null })),
    })),
    auth: {
      getUser: jest.fn(() => Promise.resolve({ data: { user: { id: 'test-user-id' } }, error: null })),
    },
  },
  getCurrentUser: jest.fn(() => Promise.resolve({ id: 'test-user-id' })),
}));

// Mock score mismatch service (used by syncScorecard for score entry sync)
jest.mock('@/services/scoreMismatch', () => ({
  saveScoreEntry: jest.fn(() => Promise.resolve()),
  saveScoreEntries: jest.fn(() => Promise.resolve()),
}));

// Mock handicap update service
jest.mock('@/services/handicap/updatePlayerHandicapIndex', () => ({
  updatePlayerHandicapIndex: jest.fn(() => Promise.resolve()),
}));

// Mock round finalisation (run by queued `round` items). The error class is a
// stand-in the orchestrator both catches and (via the mock) receives.
jest.mock('@/services/rounds/finalizeSubmittedRound', () => ({
  finalizeSubmittedRound: jest.fn(),
  RoundNotReadyError: class RoundNotReadyError extends Error {},
}));

// Drain requests are unit-tested in syncDrain.test.ts; here we only check the
// orchestrator registers its handler.
jest.mock('@/services/offline/sync/drain', () => ({
  registerSyncDrainHandler: jest.fn(),
  requestSyncDrain: jest.fn(),
}));

// Store the network change handler for testing
let _networkChangeHandler: ((state: { isConnected: boolean | null; type: string; isInternetReachable: boolean | null }) => Promise<void>) | null = null;
const mockUnsubscribe = jest.fn();

// Reset mocks before each test
beforeEach(() => {
  jest.clearAllMocks();
  _networkChangeHandler = null;
  setSyncAuthUser('test-user-id');

  // Reset NetInfo mock
  (NetInfo.addEventListener as jest.Mock).mockImplementation((_handler) => {
    _networkChangeHandler = _handler;
    return mockUnsubscribe;
  });
  (NetInfo.fetch as jest.Mock).mockResolvedValue({
    type: 'wifi',
    isConnected: true,
    isInternetReachable: true,
  });

  // Reset database mocks with default implementations
  (database.getPendingSyncs as jest.Mock).mockResolvedValue([]);
  (database.getUnsyncedScorecards as jest.Mock).mockResolvedValue([]);
  (database.getPendingSyncCount as jest.Mock).mockResolvedValue(0);
  (database.getFailedSyncCount as jest.Mock).mockResolvedValue(0);
  (database.getQueuedEntityKeys as jest.Mock).mockResolvedValue(new Set());
  (database.clearInvalidMockData as jest.Mock).mockResolvedValue(0);
  (database.clearAllPendingSyncs as jest.Mock).mockResolvedValue(0);
  (database.removePendingSync as jest.Mock).mockImplementation(async (id, revision) => {
    const pending = await (database.getPendingSyncs as jest.Mock).mock.results.at(-1)?.value ?? [];
    const index = pending.findIndex((item: PendingSync) => item.id === id && item.revision === revision);
    if (index >= 0) pending.splice(index, 1);
    return true;
  });
  (database.addPendingSync as jest.Mock).mockResolvedValue(undefined);
  (database.markScorecardsAsSynced as jest.Mock).mockResolvedValue(undefined);
  (database.markScorecardAsSynced as jest.Mock).mockImplementation(async (_id, _revision, options) => {
    if (options?.queued) return database.removePendingSync(options.queued.id, options.queued.revision, options.isCurrent);
    return true;
  });
  (database.recordAcceptedScorecardWrite as jest.Mock).mockResolvedValue(undefined);
  (database.getPendingSyncByEntityKey as jest.Mock).mockImplementation(async (key: string) => {
    const pending = await (database.getPendingSyncs as jest.Mock).mock.results.at(-1)?.value ?? [];
    return pending.find((item: PendingSync) => item.type === 'scorecard' && key === `scorecard:${item.data.roundId}:${item.data.playerId}`) ?? null;
  });
  (database.getScorecardsByRound as jest.Mock).mockImplementation(async (roundId: string) => {
    const pending = await (database.getPendingSyncs as jest.Mock).mock.results.at(-1)?.value ?? [];
    const unsynced = await (database.getUnsyncedScorecards as jest.Mock).mock.results.at(-1)?.value ?? [];
    return [...pending.filter((item: PendingSync) => item.type === 'scorecard').map((item: PendingSync) => item.data), ...unsynced].filter((card: Scorecard) => card.roundId === roundId);
  });
  (database.incrementSyncRetryCount as jest.Mock).mockResolvedValue(undefined);
  (database.markPendingSyncFailed as jest.Mock).mockResolvedValue(true);
  (database.resetFailedSyncs as jest.Mock).mockResolvedValue(0);
  (database.getFailedSyncs as jest.Mock).mockResolvedValue([]);
  (database.discardPendingSync as jest.Mock).mockResolvedValue(true);
  (database.updatePendingSyncData as jest.Mock).mockResolvedValue(true);
  (database.raisePendingSyncServerRevision as jest.Mock).mockResolvedValue(true);
  (database.recordScorecardServerRevision as jest.Mock).mockResolvedValue(undefined);
});

// ============================================================================
// TEST HELPERS
// ============================================================================

/**
 * Create a test scorecard for sync operations
 */
function createTestScorecard(overrides: Partial<Scorecard> = {}): Scorecard {
  return {
    id: 'scorecard-uuid-1234',
    roundId: '550e8400-e29b-41d4-a716-446655440000',
    playerId: '550e8400-e29b-41d4-a716-446655440001',
    player: {
      id: '550e8400-e29b-41d4-a716-446655440001',
      name: 'John Smith',
      email: 'john@test.com',
      handicap: 18,
      createdAt: new Date('2025-01-01'),
      updatedAt: new Date('2025-01-01'),
    },
    scores: {
      1: { strokes: 4, putts: 2 },
      2: { strokes: 5, putts: 2 },
    },
    totalGross: 90,
    totalNet: 72,
    status: 'completed',
    submittedAt: new Date('2025-01-15T10:00:00Z'),
    createdAt: new Date('2025-01-01'),
    updatedAt: new Date('2025-01-01'),
    isStandalone: false,
    ...overrides,
  };
}

/**
 * Create a pending sync entry for testing
 */
function createPendingSync(overrides: Partial<PendingSync> = {}): PendingSync {
  return {
    id: 1,
    type: 'scorecard',
    action: 'update',
    data: createTestScorecard(),
    timestamp: new Date('2025-01-15T10:00:00Z'),
    retryCount: 0,
    revision: 1,
    ...overrides,
  };
}

/**
 * Wait for async operations to complete
 */
async function flushPromises() {
  await new Promise((resolve) => setTimeout(resolve, 10));
}

// ============================================================================
// INITIALIZATION TESTS
// ============================================================================

describe('Sync Service Initialization', () => {
  describe('initSyncService()', () => {
    it('should subscribe to network state changes', () => {
      const unsubscribe = initSyncService();

      expect(NetInfo.addEventListener).toHaveBeenCalled();
      expect(typeof unsubscribe).toBe('function');
    });

    it('should check initial network state', async () => {
      initSyncService();
      await flushPromises();

      expect(NetInfo.fetch).toHaveBeenCalled();
    });

    it('should clear invalid mock data on init', async () => {
      initSyncService();
      await flushPromises();

      expect(database.clearInvalidMockData).toHaveBeenCalled();
    });

    it('should update pending count on init', async () => {
      (database.getPendingSyncCount as jest.Mock).mockResolvedValue(5);

      initSyncService();
      await flushPromises();

      expect(database.getPendingSyncCount).toHaveBeenCalled();
    });

    it('should return unsubscribe function that cleans up listener', () => {
      const unsubscribe = initSyncService();

      unsubscribe();

      expect(mockUnsubscribe).toHaveBeenCalled();
    });
  });
});

// ============================================================================
// SYNC STATE TESTS
// ============================================================================

describe('Sync State Management', () => {
  describe('getSyncState()', () => {
    it('should return state object with expected properties', () => {
      const state = getSyncState();

      expect(state).toHaveProperty('status');
      expect(state).toHaveProperty('pendingCount');
      expect(state).toHaveProperty('lastSyncAt');
      expect(state).toHaveProperty('error');
    });
  });

  describe('subscribeSyncState()', () => {
    it('should call listener immediately with current state', () => {
      const listener = jest.fn();

      subscribeSyncState(listener);

      expect(listener).toHaveBeenCalledWith(expect.objectContaining({
        status: expect.any(String),
        pendingCount: expect.any(Number),
      }));
    });

    it('should return unsubscribe function', () => {
      const listener = jest.fn();

      const unsubscribe = subscribeSyncState(listener);

      expect(typeof unsubscribe).toBe('function');
    });
  });

  describe('getIsOnline()', () => {
    it('should return boolean value', () => {
      const result = getIsOnline();

      expect(typeof result).toBe('boolean');
    });
  });
});

// ============================================================================
// SYNC ALL TESTS
// ============================================================================

describe('Sync Operations', () => {
  beforeEach(() => {
    initSyncService();
  });

  describe('syncAll()', () => {
    it('should process pending syncs and remove them on success', async () => {
      const pendingSync = createPendingSync();
      (database.getPendingSyncs as jest.Mock).mockResolvedValue([pendingSync]);

      await syncAll();

      expect(database.getPendingSyncs).toHaveBeenCalled();
      expect(database.removePendingSync).toHaveBeenCalledWith(pendingSync.id, pendingSync.revision, expect.any(Function));
    });

    it('should mark scorecard as synced after pending queue processing to prevent double-sync overwrite', async () => {
      const scorecard = createTestScorecard();
      const pendingSync = createPendingSync({ data: scorecard });
      (database.getPendingSyncs as jest.Mock).mockResolvedValue([pendingSync]);
      // No unsynced scorecards — the point is that the pending queue path marks it synced
      (database.getUnsyncedScorecards as jest.Mock).mockResolvedValue([]);

      await syncAll();

      // After processing the pending sync, the scorecard should be marked as synced
      // so the unsynced-scorecards path doesn't re-sync with potentially incomplete SQLite data
      expect(database.markScorecardAsSynced).toHaveBeenCalledWith(scorecard.id, 1, expect.objectContaining({ expected: expect.any(Object) }));
    });

    it('does not acknowledge an older revision when a newer edit arrives during upload', async () => {
      const scorecard = createTestScorecard();
      const pendingSync = createPendingSync({ data: scorecard, revision: 4 });
      (database.getPendingSyncs as jest.Mock).mockResolvedValue([pendingSync]);
      (database.removePendingSync as jest.Mock).mockResolvedValue(false);

      await syncAll();

      expect(database.removePendingSync).toHaveBeenCalledWith(pendingSync.id, 4, expect.any(Function));
      expect(database.recordAcceptedScorecardWrite).toHaveBeenCalledWith(scorecard.roundId, scorecard.playerId, { scorecardId: scorecard.id, serverRevision: 1 });
    });

    it('should sync unsynced scorecards and mark as synced', async () => {
      const unsyncedScorecard = createTestScorecard();
      (database.getUnsyncedScorecards as jest.Mock).mockResolvedValue([unsyncedScorecard]);

      await syncAll();

      expect(database.getUnsyncedScorecards).toHaveBeenCalled();
      expect(database.markScorecardAsSynced).toHaveBeenCalledWith(unsyncedScorecard.id, 1, expect.objectContaining({ expected: expect.any(Object) }));
    });

    it('should increment retry count on failure (not max)', async () => {
      const failingSync = createPendingSync({
        retryCount: 1,
        data: createTestScorecard({ roundId: 'invalid-uuid' }),
      });
      (database.getPendingSyncs as jest.Mock).mockResolvedValue([failingSync]);

      await syncAll();

      expect(database.incrementSyncRetryCount).toHaveBeenCalledWith(
        failingSync.id,
        failingSync.revision,
        expect.any(String)
      );
    });

    it('should retain sync as failed after max retries', async () => {
      const maxRetriesSync = createPendingSync({
        retryCount: 3,
        data: createTestScorecard({ roundId: 'invalid-uuid' }),
      });
      (database.getPendingSyncs as jest.Mock).mockResolvedValue([maxRetriesSync]);

      await syncAll();

      expect(database.markPendingSyncFailed).toHaveBeenCalledWith(
        maxRetriesSync.id,
        maxRetriesSync.revision,
        expect.any(String)
      );
      expect(database.removePendingSync).not.toHaveBeenCalledWith(
        maxRetriesSync.id,
        maxRetriesSync.revision
      );
    });

    it('should invalidate caches after successful scorecard sync', async () => {
      const pendingSync = createPendingSync({ type: 'scorecard' });
      (database.getPendingSyncs as jest.Mock).mockResolvedValue([pendingSync]);

      await syncAll();

      expect(queryClient.invalidateLeaderboardCache).toHaveBeenCalled();
      expect(queryClient.invalidateScorecardCache).toHaveBeenCalled();
    });

    it('should return true on success', async () => {
      const result = await syncAll();

      expect(result).toBe(true);
    });
  });

  describe('scorecard synced notifications', () => {
    afterEach(() => {
      // Restore the factory default so later suites see the stock response
      (supabase.rpc as jest.Mock).mockImplementation(() =>
        Promise.resolve({
          data: [
            {
              applied: true,
              conflict: false,
              server_revision: 1,
              server_status: 'completed',
              server_scores: {},
            },
          ],
          error: null,
        })
      );
    });

    const successRpc = (serverRevision: number) => ({
      data: [
        {
          applied: true,
          conflict: false,
          server_revision: serverRevision,
          server_status: 'in-progress',
          server_scores: {},
        },
      ],
      error: null,
    });

    it('notifies subscribers after a queued scorecard sync succeeds', async () => {
      const listener = jest.fn();
      const unsubscribe = subscribeScorecardSynced(listener);
      const scorecard = createTestScorecard();
      (database.getPendingSyncs as jest.Mock).mockResolvedValue([
        createPendingSync({ data: scorecard }),
      ]);
      (supabase.rpc as jest.Mock).mockResolvedValue(successRpc(3));

      await syncAll();

      expect(listener).toHaveBeenCalledWith({
        scorecardId: scorecard.id,
        serverRevision: 3,
      });
      unsubscribe();
    });

    it('notifies subscribers after an unsynced-scorecard fallback sync succeeds', async () => {
      const listener = jest.fn();
      const unsubscribe = subscribeScorecardSynced(listener);
      const scorecard = createTestScorecard();
      (database.getUnsyncedScorecards as jest.Mock).mockResolvedValue([scorecard]);
      (supabase.rpc as jest.Mock).mockResolvedValue(successRpc(4));

      await syncAll();

      expect(listener).toHaveBeenCalledWith({
        scorecardId: scorecard.id,
        serverRevision: 4,
      });
      unsubscribe();
    });

    it('does not notify when the write is rejected as a conflict', async () => {
      const listener = jest.fn();
      const unsubscribe = subscribeScorecardSynced(listener);
      (database.getPendingSyncs as jest.Mock).mockResolvedValue([createPendingSync()]);
      (supabase.rpc as jest.Mock).mockResolvedValue({
        data: [
          {
            applied: false,
            conflict: true,
            server_revision: 9,
            server_status: 'in-progress',
            server_scores: {},
          },
        ],
        error: null,
      });

      await syncAll();

      expect(listener).not.toHaveBeenCalled();
      unsubscribe();
    });

    it('uses the freshest revision for later queued syncs of the same scorecard in one drain', async () => {
      // Two queued edits of the same scorecard, both captured while the
      // client still believed the server was at revision 1. The first write
      // bumps the server to 2; the second must send 2, not the stale 1.
      const scorecard = createTestScorecard({ serverRevision: 1 });
      (database.getPendingSyncs as jest.Mock).mockResolvedValue([
        createPendingSync({ id: 1, data: scorecard, revision: 1 }),
        createPendingSync({ id: 2, data: { ...scorecard }, revision: 2 }),
      ]);
      (supabase.rpc as jest.Mock)
        .mockResolvedValueOnce(successRpc(2))
        .mockResolvedValueOnce(successRpc(3));

      await syncAll();

      const writeCalls = (supabase.rpc as jest.Mock).mock.calls.filter(
        ([fn]) => fn === 'write_scorecard_snapshot'
      );
      expect(writeCalls).toHaveLength(2);
      expect(writeCalls[0][1].p_expected_revision).toBe(1);
      expect(writeCalls[1][1].p_expected_revision).toBe(2);
    });

    describe('when a newer edit arrives during the upload', () => {
      // The write lands at revision 1, but a newer tap replaced the queued row
      // mid-upload, so removePendingSync reports it unacknowledged. That newer
      // edit was snapshotted before revision 1 existed; if the confirmed
      // revision is dropped, its upload is rejected as a conflict with this
      // device's own write ("changed on another device").
      const arrangeSupersededUpload = () => {
        const scorecard = createTestScorecard({ status: 'in-progress' });
        (database.getPendingSyncs as jest.Mock).mockResolvedValue([
          createPendingSync({ id: 7, data: scorecard, revision: 4 }),
        ]);
        (database.removePendingSync as jest.Mock).mockResolvedValue(false);
        (supabase.rpc as jest.Mock).mockResolvedValue(successRpc(1));
        return scorecard;
      };

      it('tells subscribers the revision the server confirmed', async () => {
        const listener = jest.fn();
        const unsubscribe = subscribeScorecardSynced(listener);
        const scorecard = arrangeSupersededUpload();

        await syncAll();

        expect(listener).toHaveBeenCalledWith({
          scorecardId: scorecard.id,
          serverRevision: 1,
        });
        unsubscribe();
      });

      it('fast-forwards the newer queued edit to the confirmed revision', async () => {
        arrangeSupersededUpload();

        await syncAll();

        expect(database.recordAcceptedScorecardWrite).toHaveBeenCalledWith(expect.any(String), expect.any(String), { scorecardId: expect.any(String), serverRevision: 1 });
      });

      it('records the confirmed revision locally without marking the scorecard synced', async () => {
        const scorecard = arrangeSupersededUpload();

        await syncAll();

        expect(database.recordAcceptedScorecardWrite).toHaveBeenCalledWith(scorecard.roundId, scorecard.playerId, { scorecardId: scorecard.id, serverRevision: 1 });
      });
    });
  });

  describe('manualSync()', () => {
    it('should call syncAll and return result', async () => {
      const result = await manualSync();

      expect(result).toBe(true);
      expect(database.getPendingSyncs).toHaveBeenCalled();
    });
  });

  describe('retryFailedSyncs()', () => {
    it('resets retained failures before syncing them', async () => {
      (database.resetFailedSyncs as jest.Mock).mockResolvedValue(2);

      const result = await retryFailedSyncs();

      expect(result).toBe(true);
      expect(database.resetFailedSyncs).toHaveBeenCalled();
      expect(database.getPendingSyncs).toHaveBeenCalled();
    });
  });
});

// ============================================================================
// QUEUE OPERATIONS TESTS
// ============================================================================

describe('Queue Operations', () => {
  beforeEach(() => {
    initSyncService();
  });

  describe('queueScorecardSync()', () => {
    it('should add scorecard to pending sync queue', async () => {
      const scorecard = createTestScorecard();

      await queueScorecardSync(scorecard, 'update');

      expect(database.addPendingSync).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'scorecard',
          action: 'update',
          data: scorecard,
          retryCount: 0,
        })
      );
    });

    it('should skip standalone scorecards', async () => {
      const standaloneScorecard = createTestScorecard({ isStandalone: true });

      await queueScorecardSync(standaloneScorecard);

      expect(database.addPendingSync).not.toHaveBeenCalled();
    });

    it('should skip scorecards with invalid round_id', async () => {
      const invalidScorecard = createTestScorecard({ roundId: 'not-a-uuid' });

      await queueScorecardSync(invalidScorecard);

      expect(database.addPendingSync).not.toHaveBeenCalled();
    });

    it('should skip scorecards with invalid player_id', async () => {
      const invalidScorecard = createTestScorecard({ playerId: 'mock-player-123' });

      await queueScorecardSync(invalidScorecard);

      expect(database.addPendingSync).not.toHaveBeenCalled();
    });

    it('should update pending count after queuing', async () => {
      const scorecard = createTestScorecard();
      (database.getPendingSyncCount as jest.Mock).mockResolvedValue(1);

      await queueScorecardSync(scorecard);
      await flushPromises();

      expect(database.getPendingSyncCount).toHaveBeenCalled();
    });

    it('should accept create action', async () => {
      const scorecard = createTestScorecard();

      await queueScorecardSync(scorecard, 'create');

      expect(database.addPendingSync).toHaveBeenCalledWith(
        expect.objectContaining({
          action: 'create',
        })
      );
    });

    it('should accept delete action', async () => {
      const scorecard = createTestScorecard();

      await queueScorecardSync(scorecard, 'delete');

      expect(database.addPendingSync).toHaveBeenCalledWith(
        expect.objectContaining({
          action: 'delete',
        })
      );
    });
  });

  describe('clearSyncQueue()', () => {
    it('should clear all pending syncs', async () => {
      (database.clearAllPendingSyncs as jest.Mock).mockResolvedValue(5);
      (database.clearInvalidMockData as jest.Mock).mockResolvedValue(2);

      const result = await clearSyncQueue();

      expect(result).toEqual({ pendingCleared: 5, invalidCleared: 2 });
      expect(database.clearAllPendingSyncs).toHaveBeenCalled();
      expect(database.clearInvalidMockData).toHaveBeenCalled();
    });

    it('should update pending count', async () => {
      await clearSyncQueue();

      expect(database.getPendingSyncCount).toHaveBeenCalled();
    });
  });
});

// ============================================================================
// SCORECARD SYNC TESTS
// ============================================================================

describe.skip('Legacy upsert scorecard sync processing', () => {
  beforeEach(() => {
    initSyncService();
  });

  it('should sync scorecards with valid UUIDs', async () => {
    const scorecard = createTestScorecard();
    (database.getUnsyncedScorecards as jest.Mock).mockResolvedValue([scorecard]);

    await syncAll();

    expect(supabase.from).toHaveBeenCalledWith('scorecards');
    expect(database.markScorecardsAsSynced).toHaveBeenCalledWith([scorecard.id]);
  });

  it('should fail for invalid round_id UUID and increment retry', async () => {
    const invalidScorecard = createTestScorecard({
      roundId: 'not-a-valid-uuid',
    });

    const pendingSync = createPendingSync({ data: invalidScorecard });
    (database.getPendingSyncs as jest.Mock).mockResolvedValue([pendingSync]);

    await syncAll();

    expect(database.incrementSyncRetryCount).toHaveBeenCalledWith(
      pendingSync.id,
      pendingSync.revision,
      expect.any(String)
    );
  });

  it('should fail for invalid player_id UUID and increment retry', async () => {
    const invalidScorecard = createTestScorecard({
      playerId: 'mock-player-abc',
    });

    const pendingSync = createPendingSync({ data: invalidScorecard });
    (database.getPendingSyncs as jest.Mock).mockResolvedValue([pendingSync]);

    await syncAll();

    expect(database.incrementSyncRetryCount).toHaveBeenCalledWith(
      pendingSync.id,
      pendingSync.revision,
      expect.any(String)
    );
  });

  it('should handle standalone scorecards that somehow get through (no-op)', async () => {
    // Note: In practice, getUnsyncedScorecards filters out standalone scorecards.
    // This test verifies that if a standalone scorecard does get through,
    // it's handled gracefully (no Supabase upsert error is thrown, but
    // it is still marked as synced to prevent future retry attempts).
    const standaloneScorecard = createTestScorecard({ isStandalone: true });
    (database.getUnsyncedScorecards as jest.Mock).mockResolvedValue([standaloneScorecard]);

    // Should not throw
    const result = await syncAll();

    expect(result).toBe(true);
    // The sync function returns early for standalone, but the outer loop
    // still marks it as synced (which is acceptable behavior)
    expect(database.markScorecardsAsSynced).toHaveBeenCalledWith([standaloneScorecard.id]);
  });

  it('should handle scorecards with Date submittedAt', async () => {
    const scorecard = createTestScorecard({
      submittedAt: new Date('2025-01-15T12:30:00Z'),
    });
    (database.getUnsyncedScorecards as jest.Mock).mockResolvedValue([scorecard]);

    await syncAll();

    expect(database.markScorecardsAsSynced).toHaveBeenCalledWith([scorecard.id]);
  });

  it('should handle scorecards with string submittedAt', async () => {
    const scorecard = createTestScorecard({
      submittedAt: '2025-01-15T12:30:00.000Z' as unknown as Date,
    });
    (database.getUnsyncedScorecards as jest.Mock).mockResolvedValue([scorecard]);

    await syncAll();

    expect(database.markScorecardsAsSynced).toHaveBeenCalledWith([scorecard.id]);
  });

  it('should handle scorecards with undefined submittedAt', async () => {
    const scorecard = createTestScorecard({
      submittedAt: undefined,
    });
    (database.getUnsyncedScorecards as jest.Mock).mockResolvedValue([scorecard]);

    await syncAll();

    expect(database.markScorecardsAsSynced).toHaveBeenCalledWith([scorecard.id]);
  });

  it('includes total_par_score in the upsert payload for Par-game rounds', async () => {
    // Regression: previously the sync omitted total_par_score, so the
    // server column stayed null and round finalization treated every
    // Par-game player as 0. Confirm the sync upload now carries the
    // value the store wrote locally (via calculatePlayerTotals using
    // DHC-derived strokes received).
    const upsertSpy = jest.fn(() => Promise.resolve({ data: null, error: null }));
    (supabase.from as jest.Mock).mockReturnValue({
      select: jest.fn().mockReturnThis(),
      insert: jest.fn().mockReturnThis(),
      update: jest.fn().mockReturnThis(),
      delete: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      order: jest.fn().mockReturnThis(),
      limit: jest.fn().mockReturnThis(),
      single: jest.fn(() => Promise.resolve({ data: null, error: null })),
      maybeSingle: jest.fn(() => Promise.resolve({ data: null, error: null })),
      upsert: upsertSpy,
    });

    const parScorecard = createTestScorecard({
      // eslint-disable-next-line @typescript-eslint/no-explicit-any -- test-only optional fields
      syncGameType: 'par',
      total_par_score: 5,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any -- test-only optional fields
    } as any);
    (database.getUnsyncedScorecards as jest.Mock).mockResolvedValue([parScorecard]);

    await syncAll();

    expect(upsertSpy).toHaveBeenCalled();
    const upsertArg = (upsertSpy.mock.calls as unknown as unknown[][])[0]?.[0] as Record<string, unknown>;
    expect(upsertArg).toHaveProperty('total_par_score');
    expect(upsertArg.total_par_score).toBe(5);
  });

  it('passes total_par_score = null for non-Par game types (avoids overwriting server value)', async () => {
    const upsertSpy = jest.fn(() => Promise.resolve({ data: null, error: null }));
    (supabase.from as jest.Mock).mockReturnValue({
      select: jest.fn().mockReturnThis(),
      insert: jest.fn().mockReturnThis(),
      update: jest.fn().mockReturnThis(),
      delete: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      order: jest.fn().mockReturnThis(),
      limit: jest.fn().mockReturnThis(),
      single: jest.fn(() => Promise.resolve({ data: null, error: null })),
      maybeSingle: jest.fn(() => Promise.resolve({ data: null, error: null })),
      upsert: upsertSpy,
    });

    const stablefordScorecard = createTestScorecard({
      // eslint-disable-next-line @typescript-eslint/no-explicit-any -- test-only optional fields
      syncGameType: 'stableford',
    } as any);
    (database.getUnsyncedScorecards as jest.Mock).mockResolvedValue([stablefordScorecard]);

    await syncAll();

    const upsertArg = (upsertSpy.mock.calls as unknown as unknown[][])[0]?.[0] as Record<string, unknown>;
    // For non-Par rounds, total_par_score is null so we don't clobber a
    // value the server might have from a prior Par round (defensive
    // against game type changes mid-flight).
    expect(upsertArg.total_par_score).toBeNull();
  });
});

// ============================================================================
// ERROR HANDLING TESTS
// ============================================================================

describe('Error Handling', () => {
  beforeEach(() => {
    initSyncService();
  });

  it('should retain unknown sync types instead of acknowledging them', async () => {
    const unknownTypeSync = createPendingSync({
      type: 'unknown' as PendingSync['type'],
    });
    (database.getPendingSyncs as jest.Mock).mockResolvedValue([unknownTypeSync]);

    const result = await syncAll();

    expect(result).toBe(false);
    expect(database.removePendingSync).not.toHaveBeenCalled();
    expect(database.incrementSyncRetryCount).toHaveBeenCalled();
  });

  it('should handle database read errors and return false', async () => {
    (database.getPendingSyncs as jest.Mock).mockRejectedValue(new Error('Database error'));

    const result = await syncAll();

    expect(result).toBe(false);
  });

  it('should continue processing other syncs when one fails', async () => {
    const successSync1 = createPendingSync({ id: 1 });
    const failSync = createPendingSync({
      id: 2,
      data: createTestScorecard({ roundId: 'invalid-uuid' }),
    });
    const successSync2 = createPendingSync({ id: 3, data: createTestScorecard({ playerId: "550e8400-e29b-41d4-a716-446655440003" }) });

    (database.getPendingSyncs as jest.Mock).mockResolvedValue([
      successSync1,
      failSync,
      successSync2,
    ]);

    await syncAll();

    // Should have removed successful syncs
    expect(database.removePendingSync).toHaveBeenCalledWith(1, 1, expect.any(Function));
    expect(database.removePendingSync).toHaveBeenCalledWith(3, 1, expect.any(Function));
    // Should have incremented retry count for failed sync
    expect(database.incrementSyncRetryCount).toHaveBeenCalledWith(2, 1, expect.any(String));
  });

  it('should set error status when syncs fail', async () => {
    const failingSync = createPendingSync({
      retryCount: 0,
      data: createTestScorecard({ roundId: 'invalid-uuid-format' }),
    });
    (database.getPendingSyncs as jest.Mock).mockResolvedValue([failingSync]);

    await syncAll();

    const state = getSyncState();
    expect(state.status).toBe('error');
    expect(state.error).toBeDefined();
  });

  it('should retain pending sync after max retries', async () => {
    const maxRetriedSync = createPendingSync({
      id: 99,
      retryCount: 3, // MAX_RETRY_COUNT
      data: createTestScorecard({ roundId: 'invalid-uuid-format' }),
    });
    (database.getPendingSyncs as jest.Mock).mockResolvedValue([maxRetriedSync]);

    await syncAll();

    expect(database.markPendingSyncFailed).toHaveBeenCalledWith(99, 1, expect.any(String));
    expect(database.removePendingSync).not.toHaveBeenCalledWith(99, 1);
  });

  it.skip('should handle RLS errors by retaining the scorecard for recovery', async () => {
    const scorecard = createTestScorecard();
    (database.getPendingSyncs as jest.Mock).mockResolvedValue([]);
    (database.getUnsyncedScorecards as jest.Mock).mockResolvedValue([scorecard]);

    // Make the upsert fail with an RLS error
    const mockFrom = supabase.from as jest.Mock;
    mockFrom.mockReturnValue({
      select: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      maybeSingle: jest.fn(() => Promise.resolve({ data: null, error: null })),
      upsert: jest.fn(() => Promise.resolve({ data: null, error: { message: 'row-level security policy', code: '42501' } })),
    });

    await syncAll();

    expect(database.addPendingSync).toHaveBeenCalledWith(
      expect.objectContaining({ status: 'failed', data: scorecard })
    );
    expect(database.markScorecardsAsSynced).not.toHaveBeenCalledWith([scorecard.id]);
  });

  it.skip('should retain pending-queue syncs immediately on RLS error (no retries)', async () => {
    // Simulates the production log: a queued scorecard sync hits RLS because
    // the user no longer has access to the round (round deleted, membership
    // revoked). Retrying would burn 3 slots and emit a misleading
    // "PERMANENT SYNC FAILURE" warning. Instead, drop and move on.
    const rlsSync = createPendingSync({ id: 42, retryCount: 0 });
    (database.getPendingSyncs as jest.Mock).mockResolvedValue([rlsSync]);

    const mockFrom = supabase.from as jest.Mock;
    mockFrom.mockReturnValue({
      select: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      maybeSingle: jest.fn(() => Promise.resolve({ data: null, error: null })),
      upsert: jest.fn(() =>
        Promise.resolve({
          data: null,
          error: { message: 'new row violates row-level security policy for table "scorecards"', code: '42501' },
        })
      ),
    });

    await syncAll();

    expect(database.markPendingSyncFailed).toHaveBeenCalledWith(42, 1, expect.any(String));
    expect(database.removePendingSync).not.toHaveBeenCalled();
    expect(database.incrementSyncRetryCount).not.toHaveBeenCalled();
  });
});

// ============================================================================
// SERVER DATA PROTECTION TESTS
// ============================================================================

describe.skip('Legacy hole-count server data protection', () => {
  beforeEach(() => {
    initSyncService();
  });

  it('should skip sync when server has more holes than local (unsynced path)', async () => {
    const scorecard = createTestScorecard({
      scores: {
        1: { strokes: 4 },
        2: { strokes: 5 },
      },
    });
    (database.getPendingSyncs as jest.Mock).mockResolvedValue([]);
    (database.getUnsyncedScorecards as jest.Mock).mockResolvedValue([scorecard]);

    // Mock server returning scorecard with 18 holes
    const serverScores: Record<string, { strokes: number }> = {};
    for (let i = 1; i <= 18; i++) serverScores[String(i)] = { strokes: 4 };
    const mockFrom = supabase.from as jest.Mock;
    mockFrom.mockReturnValue({
      select: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      maybeSingle: jest.fn(() => Promise.resolve({ data: { scores: serverScores }, error: null })),
      upsert: jest.fn(() => Promise.resolve({ data: null, error: null })),
    });

    await syncAll();

    // Should NOT have called upsert — the sync should be skipped
    // The scorecard should still be marked as synced since the server already has complete data
    expect(database.markScorecardsAsSynced).toHaveBeenCalledWith([scorecard.id]);
  });

  it('should proceed with sync when local has more holes than server', async () => {
    const scores: Record<string, { strokes: number }> = {};
    for (let i = 1; i <= 18; i++) scores[i] = { strokes: 4 };
    const scorecard = createTestScorecard({ scores });
    (database.getPendingSyncs as jest.Mock).mockResolvedValue([]);
    (database.getUnsyncedScorecards as jest.Mock).mockResolvedValue([scorecard]);

    // Mock server returning scorecard with only 7 holes
    const serverScores: Record<string, { strokes: number }> = {};
    for (let i = 1; i <= 7; i++) serverScores[String(i)] = { strokes: 4 };
    const mockFrom = supabase.from as jest.Mock;
    mockFrom.mockReturnValue({
      select: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      maybeSingle: jest.fn(() => Promise.resolve({ data: { scores: serverScores }, error: null })),
      upsert: jest.fn(() => Promise.resolve({ data: null, error: null })),
    });

    await syncAll();

    // Should have synced (upsert called) because local has more data
    expect(database.markScorecardsAsSynced).toHaveBeenCalledWith([scorecard.id]);
  });

  it('should proceed with sync when server has no existing data', async () => {
    const scorecard = createTestScorecard();
    (database.getPendingSyncs as jest.Mock).mockResolvedValue([]);
    (database.getUnsyncedScorecards as jest.Mock).mockResolvedValue([scorecard]);

    // Mock server returning no existing scorecard
    const mockFrom = supabase.from as jest.Mock;
    mockFrom.mockReturnValue({
      select: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      maybeSingle: jest.fn(() => Promise.resolve({ data: null, error: null })),
      upsert: jest.fn(() => Promise.resolve({ data: null, error: null })),
    });

    await syncAll();

    expect(database.markScorecardsAsSynced).toHaveBeenCalledWith([scorecard.id]);
  });

  it('should always sync from pending queue path (skipServerCheck)', async () => {
    // Pending queue has only 2 holes but should still sync
    const pendingSync = createPendingSync({
      data: createTestScorecard({
        scores: { 1: { strokes: 4 }, 2: { strokes: 5 } },
      }),
    });
    (database.getPendingSyncs as jest.Mock).mockResolvedValue([pendingSync]);
    (database.getUnsyncedScorecards as jest.Mock).mockResolvedValue([]);

    // Mock server returning 18 holes
    const serverScores: Record<string, { strokes: number }> = {};
    for (let i = 1; i <= 18; i++) serverScores[String(i)] = { strokes: 4 };
    const mockFrom = supabase.from as jest.Mock;
    mockFrom.mockReturnValue({
      select: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      maybeSingle: jest.fn(() => Promise.resolve({ data: { scores: serverScores }, error: null })),
      upsert: jest.fn(() => Promise.resolve({ data: null, error: null })),
    });

    await syncAll();

    // Pending queue path should ALWAYS sync regardless of server state
    expect(database.removePendingSync).toHaveBeenCalledWith(pendingSync.id, pendingSync.revision, expect.any(Function));
  });
});

describe('Scorecard optimistic concurrency', () => {
  it('sends the persisted server revision and returns the incremented revision', async () => {
    const scorecard = createTestScorecard({ serverRevision: 7 });
    (supabase.rpc as jest.Mock).mockResolvedValueOnce({
      data: [{ applied: true, conflict: false, server_revision: 8, server_status: 'completed', server_scores: {} }],
      error: null,
    });

    await expect(syncScorecard(scorecard)).resolves.toEqual({ serverRevision: 8 });
    expect(supabase.rpc).toHaveBeenCalledWith(
      'write_scorecard_snapshot',
      expect.objectContaining({ p_expected_revision: 7 })
    );
  });

  it('rejects a stale write without uploading score entries', async () => {
    (supabase.rpc as jest.Mock).mockResolvedValueOnce({
      data: [{
        applied: false,
        conflict: true,
        server_revision: 9,
        server_status: 'completed',
        server_scores: { 1: { strokes: 3 } },
      }],
      error: null,
    });

    await expect(syncScorecard(createTestScorecard({ serverRevision: 7 })))
      .rejects.toBeInstanceOf(ScorecardConflictError);
  });
});

// ============================================================================
// RETAINED FAILURE RECOVERY
// ============================================================================

/**
 * A queued write rejected for a stale revision used to be parked with the same
 * stale revision it was rejected for, so every later retry reproduced the
 * identical conflict — an unclearable failure that raised the sync banner on
 * every scorecard for the life of the install.
 */
describe('Retained failure recovery', () => {
  beforeEach(() => {
    initSyncService();
  });

  const conflictResponse = (serverRevision: number) => ({
    data: [{
      applied: false,
      conflict: true,
      server_revision: serverRevision,
      server_status: 'in-progress',
      server_scores: {},
    }],
    error: null,
  });

  const appliedResponse = (serverRevision: number) => ({
    data: [{
      applied: true,
      conflict: false,
      server_revision: serverRevision,
      server_status: 'completed',
      server_scores: {},
    }],
    error: null,
  });

  it('writes the fresh server revision back to the queued row on conflict', async () => {
    const pendingSync = createPendingSync({
      id: 55,
      data: createTestScorecard({ serverRevision: 2 }),
    });
    (database.getPendingSyncs as jest.Mock).mockResolvedValue([pendingSync]);
    (supabase.rpc as jest.Mock).mockResolvedValueOnce(conflictResponse(9));

    await syncAll();

    expect(database.raisePendingSyncServerRevision).toHaveBeenCalledWith(55, 9);
    expect(database.markPendingSyncFailed).toHaveBeenCalledWith(55, 1, expect.any(String));
  });

  it('does not overwrite the server during an automatic background drain', async () => {
    const pendingSync = createPendingSync({
      id: 56,
      data: createTestScorecard({ serverRevision: 2 }),
    });
    (database.getPendingSyncs as jest.Mock).mockResolvedValue([pendingSync]);
    (supabase.rpc as jest.Mock).mockResolvedValueOnce(conflictResponse(9));

    await syncAll();

    // One attempt only — the local card never silently replaces the server's.
    expect(supabase.rpc).toHaveBeenCalledTimes(1);
    expect(database.removePendingSync).not.toHaveBeenCalled();
  });

  it('adopts the server revision and retries once when the user taps Retry', async () => {
    const pendingSync = createPendingSync({
      id: 57,
      data: createTestScorecard({ serverRevision: 2 }),
    });
    (database.getPendingSyncs as jest.Mock).mockResolvedValue([pendingSync]);
    (database.resetFailedSyncs as jest.Mock).mockResolvedValue(1);
    (supabase.rpc as jest.Mock)
      .mockResolvedValueOnce(conflictResponse(9))
      .mockResolvedValueOnce(appliedResponse(10));

    const result = await retryFailedSyncs();

    expect(result).toBe(true);
    expect(supabase.rpc).toHaveBeenNthCalledWith(
      2,
      'write_scorecard_snapshot',
      expect.objectContaining({ p_expected_revision: 9 })
    );
    expect(database.removePendingSync).toHaveBeenCalledWith(57, 1, expect.any(Function));
    expect(database.markPendingSyncFailed).not.toHaveBeenCalled();
  });

  it('retains the failure when the adopted retry also conflicts', async () => {
    const pendingSync = createPendingSync({
      id: 58,
      data: createTestScorecard({ serverRevision: 2 }),
    });
    (database.getPendingSyncs as jest.Mock).mockResolvedValue([pendingSync]);
    (database.resetFailedSyncs as jest.Mock).mockResolvedValue(1);
    (supabase.rpc as jest.Mock)
      .mockResolvedValueOnce(conflictResponse(9))
      .mockResolvedValueOnce(conflictResponse(11));

    await retryFailedSyncs();

    expect(database.markPendingSyncFailed).toHaveBeenCalledWith(58, 1, expect.any(String));
    expect(database.raisePendingSyncServerRevision).toHaveBeenLastCalledWith(58, 11);
  });

  it('does not raise a global error message for dormant failures after a clean drain', async () => {
    (database.getPendingSyncs as jest.Mock).mockResolvedValue([]);
    (database.getFailedSyncCount as jest.Mock).mockResolvedValue(3);

    await syncAll();

    const state = getSyncState();
    expect(state.failedCount).toBe(3);
    // The count drives round-scoped messaging; a stale global string would
    // paint a red banner on unrelated rounds forever.
    expect(state.error).toBeNull();
  });

  it('discards a retained failure and refreshes the counts', async () => {
    (database.getFailedSyncCount as jest.Mock).mockResolvedValue(0);

    const discarded = await discardFailedSync(42);

    expect(discarded).toBe(true);
    expect(database.discardPendingSync).toHaveBeenCalledWith(42);
    expect(getSyncState().failedCount).toBe(0);
  });

  it('lists retained failures for troubleshooting', async () => {
    const failure = createPendingSync({ id: 12, status: 'failed', lastError: 'boom' });
    (database.getFailedSyncs as jest.Mock).mockResolvedValue([failure]);

    await expect(listFailedSyncs()).resolves.toEqual([failure]);
  });
});

// ============================================================================
// QUEUED ROUND FINALISATION
// ============================================================================

/**
 * An offline-submitted round used to stay `in-progress` for ever: nothing
 * queued or retried its finalisation. A `round` item now runs the same steps
 * an online submit runs, after every scorecard upload in the drain.
 */
describe('Queued round finalisation', () => {
  const ROUND_ID = '550e8400-e29b-41d4-a716-446655440000';

  function createRoundSync(overrides: Partial<PendingSync> = {}): PendingSync {
    return {
      id: 7,
      type: 'round',
      action: 'update',
      data: { id: ROUND_ID, action: 'finalize' },
      entityKey: `round:${ROUND_ID}:finalize`,
      timestamp: new Date('2025-01-15T09:00:00Z'),
      retryCount: 0,
      revision: 1,
      ...overrides,
    };
  }

  beforeEach(async () => {
    initSyncService();
    await flushPromises();
    (finalizeSubmittedRound as jest.Mock).mockResolvedValue({
      completed: true,
      skinsGame: null,
      statusError: null,
      skinsError: null,
    });
    (database.hasUnsyncedScorecardsForRound as jest.Mock).mockResolvedValue(false);
    (database.getFailedSyncCountForRound as jest.Mock).mockResolvedValue(0);
  });

  it('finalises the round and removes the item once complete', async () => {
    (database.getPendingSyncs as jest.Mock).mockResolvedValue([createRoundSync()]);

    await expect(syncAll()).resolves.toBe(true);

    expect(finalizeSubmittedRound).toHaveBeenCalledWith(ROUND_ID);
    expect(database.removePendingSync).toHaveBeenCalledWith(7, 1);
    expect(database.incrementSyncRetryCount).not.toHaveBeenCalled();
    expect(database.markPendingSyncFailed).not.toHaveBeenCalled();
  });

  it("waits — before any server call, no retry spent — while this device still has the round's cards to upload", async () => {
    (database.getPendingSyncs as jest.Mock).mockResolvedValue([createRoundSync()]);
    (database.hasUnsyncedScorecardsForRound as jest.Mock).mockResolvedValue(true);

    await expect(syncAll()).resolves.toBe(true);

    expect(database.hasUnsyncedScorecardsForRound).toHaveBeenCalledWith(ROUND_ID);
    expect(finalizeSubmittedRound).not.toHaveBeenCalled();
    expect(database.removePendingSync).not.toHaveBeenCalled();
    expect(database.incrementSyncRetryCount).not.toHaveBeenCalled();
    expect(database.markPendingSyncFailed).not.toHaveBeenCalled();
    expect(getSyncState().status).not.toBe('error');
  });

  it('waits, spending no retry, when a submit screen is already finalising the same round', async () => {
    (database.getPendingSyncs as jest.Mock).mockResolvedValue([createRoundSync()]);
    // finalizeSubmittedRound's own atomic in-flight check (A6a-2) refuses.
    (finalizeSubmittedRound as jest.Mock).mockRejectedValue(new RoundNotReadyError('already being finalised'));

    await expect(syncAll()).resolves.toBe(true);

    expect(finalizeSubmittedRound).toHaveBeenCalledWith(ROUND_ID);
    expect(database.removePendingSync).not.toHaveBeenCalled();
    expect(database.incrementSyncRetryCount).not.toHaveBeenCalled();
    expect(database.markPendingSyncFailed).not.toHaveBeenCalled();
    expect(getSyncState().status).not.toBe('error');
  });

  it('drops the item when the round is not complete and this device has nothing left to upload', async () => {
    (database.getPendingSyncs as jest.Mock).mockResolvedValue([createRoundSync()]);
    (finalizeSubmittedRound as jest.Mock).mockResolvedValue({
      completed: false,
      skinsGame: null,
      statusError: null,
      skinsError: null,
    });

    await syncAll();

    expect(database.removePendingSync).toHaveBeenCalledWith(7, 1);
  });

  it("is retained as failed when the round's only unconfirmed cards are retained failures", async () => {
    (database.getPendingSyncs as jest.Mock).mockResolvedValue([createRoundSync()]);
    (database.getFailedSyncCountForRound as jest.Mock).mockResolvedValue(1);

    await expect(syncAll()).resolves.toBe(false);

    expect(finalizeSubmittedRound).not.toHaveBeenCalled();
    expect(database.markPendingSyncFailed).toHaveBeenCalledWith(7, 1, expect.stringContaining('retained'));
    expect(database.incrementSyncRetryCount).not.toHaveBeenCalled();
    expect(database.removePendingSync).not.toHaveBeenCalled();
  });

  it('spends a retry when the status read or write fails', async () => {
    (database.getPendingSyncs as jest.Mock).mockResolvedValue([createRoundSync()]);
    (finalizeSubmittedRound as jest.Mock).mockResolvedValue({
      completed: false,
      skinsGame: null,
      statusError: new Error('network down'),
      skinsError: null,
    });

    await syncAll();

    expect(database.incrementSyncRetryCount).toHaveBeenCalledWith(7, 1, 'network down');
    expect(database.removePendingSync).not.toHaveBeenCalled();
  });

  it('skins network error → retried: spends a retry when settlement failed transiently', async () => {
    (database.getPendingSyncs as jest.Mock).mockResolvedValue([createRoundSync()]);
    (finalizeSubmittedRound as jest.Mock).mockResolvedValue({
      completed: true,
      skinsGame: null,
      statusError: null,
      skinsError: createError('Failed to insert payouts: TypeError: Network request failed', 'DATABASE'),
    });

    await syncAll();

    expect(database.incrementSyncRetryCount).toHaveBeenCalledWith(
      7,
      1,
      'Failed to insert payouts: TypeError: Network request failed'
    );
    expect(database.removePendingSync).not.toHaveBeenCalled();
  });

  it('skins RLS error → item removed: a permanent settlement failure is logged, not retried', async () => {
    // skins_payouts is writable only by the game's creator: a non-creator's
    // settlement fails like this on every attempt.
    (database.getPendingSyncs as jest.Mock).mockResolvedValue([createRoundSync()]);
    (finalizeSubmittedRound as jest.Mock).mockResolvedValue({
      completed: true,
      skinsGame: null,
      statusError: null,
      skinsError: createError(
        'Failed to insert payouts: new row violates row-level security policy for table "skins_payouts"',
        'DATABASE'
      ),
    });

    await expect(syncAll()).resolves.toBe(true);

    expect(database.removePendingSync).toHaveBeenCalledWith(7, 1);
    expect(database.incrementSyncRetryCount).not.toHaveBeenCalled();
    expect(database.markPendingSyncFailed).not.toHaveBeenCalled();
  });

  it('still retries a failed status write when skins also failed permanently', async () => {
    (database.getPendingSyncs as jest.Mock).mockResolvedValue([createRoundSync()]);
    (finalizeSubmittedRound as jest.Mock).mockResolvedValue({
      completed: false,
      skinsGame: null,
      statusError: new Error('network down'),
      skinsError: createError('Skins game not found', 'NOT_FOUND'),
    });

    await syncAll();

    expect(database.incrementSyncRetryCount).toHaveBeenCalledWith(7, 1, 'network down');
    expect(database.removePendingSync).not.toHaveBeenCalled();
  });

  it('is retained as failed after the last automatic retry', async () => {
    (database.getPendingSyncs as jest.Mock).mockResolvedValue([createRoundSync({ retryCount: 2 })]);
    (finalizeSubmittedRound as jest.Mock).mockResolvedValue({
      completed: false,
      skinsGame: null,
      statusError: new Error('network down'),
      skinsError: null,
    });

    await syncAll();

    expect(database.markPendingSyncFailed).toHaveBeenCalledWith(7, 1, 'network down');
    expect(database.incrementSyncRetryCount).not.toHaveBeenCalled();
  });

  it('uploads queued scorecards before finalising, whatever the queue order', async () => {
    const roundSync = createRoundSync({ timestamp: new Date('2025-01-15T09:00:00Z') });
    const cardSync = createPendingSync({ id: 8, timestamp: new Date('2025-01-15T10:00:00Z') });
    // getPendingSyncs returns timestamp order: the round item first.
    (database.getPendingSyncs as jest.Mock).mockResolvedValue([roundSync, cardSync]);

    await syncAll();

    const [cardUpload] = (supabase.rpc as jest.Mock).mock.invocationCallOrder;
    const [roundFinalize] = (finalizeSubmittedRound as jest.Mock).mock.invocationCallOrder;
    expect(cardUpload).toBeLessThan(roundFinalize);
    expect(database.removePendingSync).toHaveBeenCalledWith(8, 1, expect.any(Function));
    expect(database.removePendingSync).toHaveBeenCalledWith(7, 1);
  });

  it('runs after the SQLite fallback uploads', async () => {
    (database.getPendingSyncs as jest.Mock).mockResolvedValue([createRoundSync()]);
    // A submitted card with no queue row: uploaded by the fallback block.
    (database.getUnsyncedScorecards as jest.Mock).mockResolvedValue([createTestScorecard()]);

    await syncAll();

    const [fallbackUpload] = (supabase.rpc as jest.Mock).mock.invocationCallOrder;
    const [roundFinalize] = (finalizeSubmittedRound as jest.Mock).mock.invocationCallOrder;
    expect(fallbackUpload).toBeLessThan(roundFinalize);
  });

  it('spends a retry on an unknown round action instead of dropping it', async () => {
    (database.getPendingSyncs as jest.Mock).mockResolvedValue([
      createRoundSync({ data: { id: ROUND_ID, action: 'bogus' } }),
    ]);

    await syncAll();

    expect(finalizeSubmittedRound).not.toHaveBeenCalled();
    expect(database.incrementSyncRetryCount).toHaveBeenCalledWith(
      7,
      1,
      'Unsupported round sync action: bogus'
    );
  });
});

// ============================================================================
// APP-WIDE SYNC SERVICE
// ============================================================================

/**
 * The service used to live only while a scoring screen was mounted; its
 * cleanup tore the network listener down on every submit. It now starts once
 * at the app root and is never torn down.
 */
describe('App-wide sync service', () => {
  beforeEach(() => {
    __resetSyncServiceForTests();
  });

  it('starts once, however often it is asked', () => {
    ensureSyncServiceStarted();
    ensureSyncServiceStarted();

    expect(NetInfo.addEventListener).toHaveBeenCalledTimes(1);
  });

  it('registers syncAll as the drain handler', async () => {
    ensureSyncServiceStarted();
    await flushPromises();

    const calls = (registerSyncDrainHandler as jest.Mock).mock.calls;
    expect(calls.length).toBeGreaterThan(0);
    const handler = calls[calls.length - 1][0] as () => Promise<unknown>;
    await handler();

    expect(database.getPendingSyncs).toHaveBeenCalled();
  });
});

// ============================================================================
// NO DRAIN WITHOUT A SESSION
// ============================================================================

/**
 * The service now runs while signed out. A signed-out drain would upload as
 * anon (every card retained as failed) and read a queued round as missing
 * (PGRST116 → "not complete"), dropping its finalize item. syncAll refuses to
 * start until the app root records a signed-in user.
 */
describe('No drain without a session', () => {
  const ROUND_ID = '550e8400-e29b-41d4-a716-446655440000';
  const roundItem: PendingSync = {
    id: 7,
    type: 'round',
    action: 'update',
    data: { id: ROUND_ID, action: 'finalize' },
    entityKey: `round:${ROUND_ID}:finalize`,
    timestamp: new Date('2025-01-15T09:00:00Z'),
    retryCount: 0,
    revision: 1,
  };

  beforeEach(async () => {
    initSyncService();
    await flushPromises();
    (database.getPendingSyncs as jest.Mock).mockResolvedValue([roundItem]);
    setSyncAuthUser(null);
  });

  afterEach(() => {
    setSyncAuthUser('test-user-id');
  });

  it('syncAll reads nothing and keeps the queued finalize item while signed out', async () => {
    await expect(syncAll()).resolves.toBe(false);

    expect(database.getPendingSyncs).not.toHaveBeenCalled();
    expect(finalizeSubmittedRound).not.toHaveBeenCalled();
    expect(database.removePendingSync).not.toHaveBeenCalled();
    expect(database.markPendingSyncFailed).not.toHaveBeenCalled();
    expect(supabase.rpc).not.toHaveBeenCalled();
  });

  it('the network-restored callback does not drain while signed out', async () => {
    await _networkChangeHandler!({ isConnected: false, type: 'none', isInternetReachable: false });
    await _networkChangeHandler!({ isConnected: true, type: 'wifi', isInternetReachable: true });
    await flushPromises();

    expect(database.getPendingSyncs).not.toHaveBeenCalled();
  });

  it('queueing a scorecard while signed out queues it without draining', async () => {
    await queueScorecardSync(createTestScorecard());
    await flushPromises();

    expect(database.addPendingSync).toHaveBeenCalled();
    expect(database.getPendingSyncs).not.toHaveBeenCalled();
  });

  it('drains again once a user is signed in', async () => {
    setSyncAuthUser('user-2');
    (finalizeSubmittedRound as jest.Mock).mockResolvedValue({
      completed: true,
      skinsGame: null,
      statusError: null,
      skinsError: null,
    });

    await syncAll();

    expect(database.getPendingSyncs).toHaveBeenCalled();
    expect(finalizeSubmittedRound).toHaveBeenCalledWith(ROUND_ID);
  });
});

// ============================================================================
// ROUND ITEMS BELONG TO THE USER WHO QUEUED THEM
// ============================================================================

/**
 * SQLite survives sign-out. A round item queued by one user must not run
 * under another user's session on the same phone: it waits for its owner.
 */
describe('Round items and the signed-in user', () => {
  const ROUND_ID = '550e8400-e29b-41d4-a716-446655440000';
  const finalizeItem = (data: Record<string, unknown>): PendingSync => ({
    id: 7,
    type: 'round',
    action: 'update',
    data: { id: ROUND_ID, action: 'finalize', ...data },
    entityKey: `round:${ROUND_ID}:finalize`,
    timestamp: new Date('2025-01-15T09:00:00Z'),
    retryCount: 0,
    revision: 1,
  });

  beforeEach(async () => {
    initSyncService();
    await flushPromises();
    (finalizeSubmittedRound as jest.Mock).mockResolvedValue({
      completed: true,
      skinsGame: null,
      statusError: null,
      skinsError: null,
    });
    (database.hasUnsyncedScorecardsForRound as jest.Mock).mockResolvedValue(false);
    (database.getFailedSyncCountForRound as jest.Mock).mockResolvedValue(0);
  });

  it("leaves another user's item pending, with no retry spent and no server call", async () => {
    (database.getPendingSyncs as jest.Mock).mockResolvedValue([finalizeItem({ userId: 'someone-else' })]);

    await expect(syncAll()).resolves.toBe(true);

    expect(finalizeSubmittedRound).not.toHaveBeenCalled();
    expect(database.hasUnsyncedScorecardsForRound).not.toHaveBeenCalled();
    expect(database.removePendingSync).not.toHaveBeenCalled();
    expect(database.incrementSyncRetryCount).not.toHaveBeenCalled();
    expect(database.markPendingSyncFailed).not.toHaveBeenCalled();
  });

  it("runs the signed-in user's own item", async () => {
    (database.getPendingSyncs as jest.Mock).mockResolvedValue([finalizeItem({ userId: 'test-user-id' })]);

    await syncAll();

    expect(finalizeSubmittedRound).toHaveBeenCalledWith(ROUND_ID);
    expect(database.removePendingSync).toHaveBeenCalledWith(7, 1);
  });

  it('runs a legacy item with no owner for whoever is signed in', async () => {
    (database.getPendingSyncs as jest.Mock).mockResolvedValue([finalizeItem({})]);

    await syncAll();

    expect(finalizeSubmittedRound).toHaveBeenCalledWith(ROUND_ID);
  });
});

// C1 local queue admission; existing queue CAS/old-ack tests remain separate.
describe("C1 local queue persistence admission", () => {
  it("holds the lease across queue/count work before allowing repair", async () => {
    let release!: () => void;
    let started!: () => void;
    const paused = new Promise<void>((r) => {
      release = r;
    });
    const admitted = new Promise<void>((r) => {
      started = r;
    });
    const roundId = "550e8400-e29b-41d4-a716-446655440030";
    const scorecard = createTestScorecard({ roundId });
    (database.getPendingSyncCount as jest.Mock).mockImplementationOnce(
      async () => {
        started();
        await paused;
        return 1;
      },
    );
    const queued = queueScorecardSync(scorecard, "update", {
      source: capturePersistence(roundId),
    });
    await admitted;
    const repair = jest.fn(async () => {});
    const ending = transitionPersistence(
      roundId,
      { nine_type: "full", holes_played: 6 },
      repair,
      () => {},
    );
    expect(repair).not.toHaveBeenCalled();
    release();
    await queued;
    await ending;
    expect(repair).toHaveBeenCalledTimes(1);
  });
  it("a captured queue source cannot overwrite a repaired payload; delete stays an operation", async () => {
    const roundId = "550e8400-e29b-41d4-a716-446655440031";
    const scorecard = createTestScorecard({ roundId });
    const source = capturePersistence(roundId);
    await transitionPersistence(
      roundId,
      { nine_type: "full", holes_played: 6 },
      async () => {},
      () => {},
    );
    await expect(
      queueScorecardSync(scorecard, "update", { source }),
    ).rejects.toBeInstanceOf(RoundPersistenceSourceChangedError);
    expect(database.addPendingSync).not.toHaveBeenCalled();
    await expect(queueScorecardSync(scorecard)).rejects.toBeInstanceOf(
      RoundPersistenceSourceChangedError,
    );
    await queueScorecardSync(scorecard, "delete", {
      source: capturePersistence(roundId),
    });
    expect(database.addPendingSync).toHaveBeenCalledWith(
      expect.objectContaining({ action: "delete", data: scorecard }),
    );
  });
});

describe('C2b fallback source retention', () => {
  beforeEach(async () => { initSyncService(); await flushPromises(); jest.clearAllMocks(); });
  it('surfaces unsupported guarded web failure retention without queue or acknowledgment mutation', async () => {
    const previous = Platform.OS;
    Object.defineProperty(Platform, 'OS', { value: 'web', configurable: true });
    try {
      const old = createTestScorecard({ roundId: '550e8400-e29b-41d4-a716-446655440232' });
      const sql = jest.fn(async () => ({ changes: 1 }));
      (getDb as jest.Mock).mockResolvedValue({ runAsync: sql });
      (database.addPendingSync as jest.Mock).mockImplementation(addActualPendingSync);
      (database.getUnsyncedScorecards as jest.Mock).mockResolvedValue([old]);
      (database.getScorecardsByRound as jest.Mock).mockResolvedValue([old]);
      (supabase.rpc as jest.Mock).mockResolvedValueOnce({
        data: null,
        error: { message: 'old upload failed' },
      });
      await expect(syncAll()).resolves.toBe(false);
      expect(getSyncState()).toMatchObject({
        status: 'error',
        error: 'Guarded failure retention requires native SQLite',
      });
      expect(sql).not.toHaveBeenCalled();
      expect(database.markScorecardAsSynced).not.toHaveBeenCalled();
      expect(database.removePendingSync).not.toHaveBeenCalled();
      expect(old.scores).toEqual({ 1: { strokes: 4, putts: 2 }, 2: { strokes: 5, putts: 2 } });
    } finally {
      Object.defineProperty(Platform, 'OS', { value: previous, configurable: true });
    }
  });
  it('refuses fallback retention after owner replacement while acquiring its database', async () => {
    const old = createTestScorecard({ roundId: '550e8400-e29b-41d4-a716-446655440231' });
    const sql = jest.fn(async () => ({ changes: 1 }));
    const db = { runAsync: sql, withExclusiveTransactionAsync: jest.fn() };
    db.withExclusiveTransactionAsync.mockImplementation(async (work) => work(db));
    let entered!: () => void;
    let release!: () => void;
    const acquiring = new Promise<void>((resolve) => {
      entered = resolve;
    });
    const gate = new Promise<void>((resolve) => {
      release = resolve;
    });
    (getDb as jest.Mock).mockImplementationOnce(async () => {
      entered();
      await gate;
      return db;
    });
    (database.addPendingSync as jest.Mock).mockImplementation(addActualPendingSync);
    (database.getUnsyncedScorecards as jest.Mock).mockResolvedValue([old]);
    (database.getScorecardsByRound as jest.Mock).mockResolvedValue([old]);
    (supabase.rpc as jest.Mock).mockResolvedValueOnce({
      data: null,
      error: { message: 'old upload failed' },
    });
    const syncing = syncAll();
    await acquiring;
    setSyncAuthUser('replacement-owner');
    release();
    await syncing;
    expect(sql).not.toHaveBeenCalled();
  });
  it.each(['pending', 'failed'] as const)(
    'preserves a newer %s queue inserted after absence check while the disk read waits',
    async (status) => {
      const old = createTestScorecard({ roundId: '550e8400-e29b-41d4-a716-446655440230' });
      let queue: PendingSync | null = null;
      let retaining = false;
      let entered!: () => void;
      let release!: () => void;
      const reading = new Promise<void>((resolve) => {
        entered = resolve;
      });
      const gate = new Promise<void>((resolve) => {
        release = resolve;
      });
      const sql = jest.fn(async (statement: string, args: unknown[]) => {
        if (queue && statement.includes('ON CONFLICT(entity_key) DO NOTHING')) return { changes: 0 };
        queue = {
          id: queue?.id ?? 998,
          type: 'scorecard',
          action: 'update',
          data: JSON.parse(args[2] as string),
          timestamp: new Date(args[3] as string),
          retryCount: args[4] as number,
          revision: (queue?.revision ?? 0) + 1,
          status: args[7] as PendingSync['status'],
          lastError: args[8] as string,
        };
        return { changes: 1 };
      });
      const db = { runAsync: sql, withExclusiveTransactionAsync: jest.fn() };
      db.withExclusiveTransactionAsync.mockImplementation(async (work) => work(db));
      (getDb as jest.Mock).mockResolvedValue(db);
      (database.addPendingSync as jest.Mock).mockImplementation(addActualPendingSync);
      (database.getUnsyncedScorecards as jest.Mock).mockResolvedValue([old]);
      (database.getPendingSyncByEntityKey as jest.Mock).mockImplementation(async (key) =>
        key.startsWith('scorecard:') ? queue : null
      );
      (database.getScorecardsByRound as jest.Mock).mockImplementation(async () => {
        if (retaining) {
          entered();
          await gate;
        }
        return [old];
      });
      (supabase.rpc as jest.Mock).mockImplementationOnce(async () => {
        retaining = true;
        return { data: null, error: { message: 'old upload failed' } };
      });
      const syncing = syncAll();
      await reading;
      const newer = createPendingSync({
        id: 998,
        revision: 6,
        status,
        retryCount: 2,
        lastError: 'new queue recovery state',
        data: { ...old, scores: { 1: { strokes: 8 } }, status: 'confirmed', serverRevision: 4 },
      });
      queue = newer;
      release();
      await syncing;
      expect(queue).toEqual(newer);
      expect(database.addPendingSync).toHaveBeenCalledTimes(1);
    }
  );
  it('does not retain a failed fallback under a replacement owner at the same source epoch', async () => {
    const card = createTestScorecard({ roundId: '550e8400-e29b-41d4-a716-446655440204' });
    (database.getUnsyncedScorecards as jest.Mock).mockResolvedValue([card]);
    (supabase.rpc as jest.Mock).mockImplementationOnce(async () => {
      setSyncAuthUser('replacement-owner');
      return { data: null, error: { message: 'network failed' } };
    });
    await syncAll();
    expect(database.addPendingSync).not.toHaveBeenCalled();
  });
  it('does not retag an old failed upload after local shape repair', async () => {
    const card = createTestScorecard({ roundId: '550e8400-e29b-41d4-a716-446655440201' });
    (database.getUnsyncedScorecards as jest.Mock).mockResolvedValue([card]);
    (supabase.rpc as jest.Mock).mockImplementationOnce(async () => {
      await transitionPersistence(card.roundId, { nine_type: 'full', holes_played: 6 }, async () => undefined, () => undefined);
      return { data: null, error: { message: 'network failed' } };
    });
    await syncAll();
    expect(database.addPendingSync).not.toHaveBeenCalled();
  });
  it('captures device-wide read provenance before its unknown-round snapshot await', async () => {
    const card = createTestScorecard({ roundId: '550e8400-e29b-41d4-a716-446655440202' });
    (database.getUnsyncedScorecards as jest.Mock).mockImplementationOnce(async () => {
      await transitionPersistence(card.roundId, { nine_type: 'full', holes_played: 6 }, async () => undefined, () => undefined);
      return [card];
    });
    await syncAll();
    expect(supabase.rpc).not.toHaveBeenCalled(); expect(database.addPendingSync).not.toHaveBeenCalled();
  });
});

describe('C4a orchestrator current-source schedules', () => {
  beforeEach(async () => { initSyncService(); await flushPromises(); jest.clearAllMocks(); });
  it.each([7, 11])(
    'retains a same-shape partial fallback failure with monotonic revision %s in the new queue',
    async (confirmedRevision) => {
      const original = createTestScorecard({
        roundId: '550e8400-e29b-41d4-a716-446655440223',
        serverRevision: 2,
        scores: { 1: { strokes: 4, scoredBy: 'test-user-id' } },
      });
      let disk = original;
      let retained: { data: Scorecard; status: unknown; retryCount: unknown } | null = null;
      const sql = jest.fn(async (_statement: string, args: unknown[]) => {
        retained = { data: JSON.parse(args[2] as string), retryCount: args[4], status: args[7] };
        return { changes: 1 };
      });
      const db = { runAsync: sql, withExclusiveTransactionAsync: jest.fn() };
      db.withExclusiveTransactionAsync.mockImplementation(async (work) => work(db));
      (getDb as jest.Mock).mockResolvedValue(db);
      (database.addPendingSync as jest.Mock).mockImplementation(addActualPendingSync);
      (database.getUnsyncedScorecards as jest.Mock).mockResolvedValue([original]);
      (database.getScorecardsByRound as jest.Mock).mockImplementation(async () => [disk]);
      (supabase.rpc as jest.Mock).mockResolvedValueOnce({
        data: [{ applied: true, conflict: false, server_revision: 7 }],
        error: null,
      });
      (saveScoreEntries as jest.Mock).mockImplementationOnce(async () => {
        if (confirmedRevision > 7) disk = { ...disk, serverRevision: confirmedRevision };
        throw { code: '22023', hint: 'round_score_out_of_play', message: 'same-shape invalid entry' };
      });
      (database.recordAcceptedScorecardWrite as jest.Mock).mockImplementation(
        async (_round, _player, acceptedWrite) => {
          disk = {
            ...disk,
            serverRevision: Math.max(disk.serverRevision ?? 0, acceptedWrite.serverRevision),
          };
        }
      );
      await syncAll();
      expect(disk.serverRevision).toBe(confirmedRevision);
      expect(retained).toMatchObject({
        status: 'failed',
        retryCount: 3,
        data: { id: original.id, serverRevision: confirmedRevision, scores: { 1: { strokes: 4 } } },
      });
      expect(database.markScorecardAsSynced).not.toHaveBeenCalled();
      expect(database.removePendingSync).not.toHaveBeenCalled();
      expect(sql).toHaveBeenCalledTimes(1);
    }
  );
  it.each(['snapshot', 'entries'])(
    'retains a same-shape out-of-play %s failure visibly using the current queue revision',
    async (origin) => {
      let disk = createTestScorecard({
        roundId: '550e8400-e29b-41d4-a716-446655440220',
        serverRevision: 2,
        scores: { 1: { strokes: 4, scoredBy: 'test-user-id' } },
      });
      const captured = createPendingSync({ id: 996, revision: 4, retryCount: 2, data: disk });
      let queue = captured;
      (database.getPendingSyncs as jest.Mock).mockResolvedValue([captured]);
      (database.getPendingSyncByEntityKey as jest.Mock).mockImplementation(async (key) =>
        key.startsWith('scorecard:') ? queue : null
      );
      (database.getScorecardsByRound as jest.Mock).mockImplementation(async () => [disk]);
      (database.recordAcceptedScorecardWrite as jest.Mock).mockImplementation(
        async (_round, _player, acceptedWrite) => {
          disk = { ...disk, serverRevision: acceptedWrite.serverRevision };
          queue = {
            ...queue,
            revision: queue.revision! + 1,
            data: { ...queue.data, serverRevision: acceptedWrite.serverRevision },
          };
        }
      );
      (database.markPendingSyncFailed as jest.Mock).mockImplementation(
        async (id, revision, error) => {
          if (id !== queue.id || revision !== queue.revision) return false;
          queue = { ...queue, status: 'failed', lastError: error };
          return true;
        }
      );
      const guard = {
        code: '22023',
        hint: 'round_score_out_of_play',
        message: 'invalid played score payload',
      };
      if (origin === 'snapshot')
        (supabase.rpc as jest.Mock).mockResolvedValueOnce({ data: null, error: guard });
      else {
        (supabase.rpc as jest.Mock).mockResolvedValueOnce({
          data: [{ applied: true, conflict: false, server_revision: 7 }],
          error: null,
        });
        (saveScoreEntries as jest.Mock).mockRejectedValueOnce(guard);
      }
      await syncAll();
      expect(queue).toMatchObject({
        status: 'failed',
        revision: origin === 'entries' ? 5 : 4,
        retryCount: 2,
        lastError: 'invalid played score payload',
        data: { scores: { 1: { strokes: 4 } }, serverRevision: origin === 'entries' ? 7 : 2 },
      });
      expect(database.incrementSyncRetryCount).not.toHaveBeenCalled();
      expect(database.markScorecardAsSynced).not.toHaveBeenCalled();
      expect(database.removePendingSync).not.toHaveBeenCalled();
      if (origin === 'entries')
        expect(database.recordAcceptedScorecardWrite).toHaveBeenCalledWith(
          disk.roundId,
          disk.playerId,
          { scorecardId: disk.id, serverRevision: 7 }
        );
      expect(supabase.rpc).toHaveBeenCalledTimes(1);
    }
  );
  it.each(['pending', 'failed'] as const)(
    'does not refresh an old failure proof over a newer %s queue during partial out-of-play rejection',
    async (status) => {
      const original = createTestScorecard({
        roundId: '550e8400-e29b-41d4-a716-446655440221',
        serverRevision: 2,
        scores: { 1: { strokes: 4, scoredBy: 'test-user-id' } },
      });
      const captured = createPendingSync({ id: 997, revision: 4, retryCount: 1, data: original });
      let queue = captured;
      (database.getPendingSyncs as jest.Mock).mockResolvedValue([captured]);
      (database.getPendingSyncByEntityKey as jest.Mock).mockImplementation(async (key) =>
        key.startsWith('scorecard:') ? queue : null
      );
      (database.getScorecardsByRound as jest.Mock).mockResolvedValue([original]);
      (supabase.rpc as jest.Mock).mockResolvedValueOnce({
        data: [{ applied: true, conflict: false, server_revision: 7 }],
        error: null,
      });
      (saveScoreEntries as jest.Mock).mockImplementationOnce(async () => {
        queue = {
          ...queue,
          revision: 6,
          status,
          retryCount: 2,
          lastError: 'new state',
          data: {
            ...original,
            scores: { 1: { strokes: 8, scoredBy: 'test-user-id' } },
            status: 'confirmed',
          },
        };
        throw { code: '22023', hint: 'round_score_out_of_play', message: 'old entry rejected' };
      });
      (database.recordAcceptedScorecardWrite as jest.Mock).mockImplementation(
        async (_round, _player, acceptedWrite) => {
          queue = {
            ...queue,
            revision: queue.revision! + 1,
            data: { ...queue.data, serverRevision: acceptedWrite.serverRevision },
          };
        }
      );
      (database.markPendingSyncFailed as jest.Mock).mockImplementation(
        async (id, revision, error) => {
          if (id !== queue.id || revision !== queue.revision) return false;
          queue = { ...queue, status: 'failed', lastError: error };
          return true;
        }
      );
      await syncAll();
      expect(queue).toMatchObject({
        revision: 7,
        status,
        retryCount: 2,
        lastError: 'new state',
        data: { status: 'confirmed', scores: { 1: { strokes: 8 } }, serverRevision: 7 },
      });
      expect(database.markPendingSyncFailed).toHaveBeenCalledWith(997, 4, 'old entry rejected');
      expect(database.markScorecardAsSynced).not.toHaveBeenCalled();
      expect(database.removePendingSync).not.toHaveBeenCalled();
      expect(database.incrementSyncRetryCount).not.toHaveBeenCalled();
    }
  );
  it.each(['pending', 'failed', 'foreign', 'malformed'])('defers only the round with a %s end prerequisite without spending retries', async status => {
    const blocked = createTestScorecard({ roundId: '550e8400-e29b-41d4-a716-446655440210' });
    const other = createTestScorecard({ roundId: '550e8400-e29b-41d4-a716-446655440211' });
    const blockedItem = createPendingSync({ id: 991, data: blocked, retryCount: 2 });
    const otherItem = createPendingSync({ id: 992, data: other });
    (database.getPendingSyncs as jest.Mock).mockResolvedValue([blockedItem, otherItem]);
    (database.getPendingSyncByEntityKey as jest.Mock).mockImplementation(async key => {
      if (key === `round:${blocked.roundId}:end_early`) {
        if (status === 'malformed') throw new SyntaxError('bad JSON');
        return { type: 'round', status, data: { userId: status === 'foreign' ? 'other-owner' : 'test-user-id' } };
      }
      return key === `scorecard:${blocked.roundId}:${blocked.playerId}` ? blockedItem :
        key === `scorecard:${other.roundId}:${other.playerId}` ? otherItem : null;
    });
    await syncAll();
    expect((supabase.rpc as jest.Mock).mock.calls.map(([, args]) => args.p_round_id)).toEqual([other.roundId]);
    expect(database.incrementSyncRetryCount).not.toHaveBeenCalled();
    expect(database.markPendingSyncFailed).not.toHaveBeenCalled();
    expect(database.removePendingSync).not.toHaveBeenCalledWith(blockedItem.id, expect.anything(), expect.anything());
    expect(blockedItem.retryCount).toBe(2);
  });
  it('uploads a newly queued payload instead of the earlier SQLite fallback card', async () => {
    const old = createTestScorecard({ roundId: '550e8400-e29b-41d4-a716-446655440212', totalGross: 90 });
    const fresh = { ...old, scores: { 1: { strokes: 8 } }, totalGross: 8, serverRevision: 4 };
    const queued = createPendingSync({ id: 993, revision: 5, data: fresh });
    (database.getUnsyncedScorecards as jest.Mock).mockResolvedValue([old]);
    (database.getPendingSyncByEntityKey as jest.Mock).mockImplementation(async key => key.startsWith('scorecard:') ? queued : null);
    await syncAll();
    expect((supabase.rpc as jest.Mock).mock.calls[0][1]).toMatchObject({ p_expected_revision: 4, p_snapshot: { total_gross: 8, scores: { 1: { strokes: 8 } } } });
  });
  it('cannot replace a newer failed queue payload when an older fallback upload fails', async () => {
    const old = createTestScorecard({ roundId: '550e8400-e29b-41d4-a716-446655440213' });
    let queue: PendingSync | null = null;
    (database.getUnsyncedScorecards as jest.Mock).mockResolvedValue([old]);
    (database.getPendingSyncByEntityKey as jest.Mock).mockImplementation(async key => key.startsWith('scorecard:') ? queue : null);
    (supabase.rpc as jest.Mock).mockImplementationOnce(async () => {
      queue = createPendingSync({ id: 994, revision: 6, status: 'failed', data: { ...old, status: 'confirmed', scores: { 1: { strokes: 8 } } } });
      return { data: null, error: { message: 'offline' } };
    });
    await syncAll();
    expect(database.addPendingSync).not.toHaveBeenCalled();
    expect(queue).toMatchObject({ revision: 6, status: 'failed', data: { status: 'confirmed', scores: { 1: { strokes: 8 } } } });
  });
});

it('C2b conflict after repair raises revision only and cannot write captured discarded scores/status back', async () => {
  initSyncService(); await flushPromises(); jest.clearAllMocks();
  const original = createTestScorecard({ roundId: '550e8400-e29b-41d4-a716-446655440203', scores: { 1: { strokes: 4 }, 7: { strokes: 9 } }, serverRevision: 2 });
  const pending = createPendingSync({ id: 995, data: original });
  let livePayload = original;
  (database.getPendingSyncs as jest.Mock).mockResolvedValue([pending]);
  (database.updatePendingSyncData as jest.Mock).mockImplementationOnce(async (_id, data) => { livePayload = data; return true; });
  (database.raisePendingSyncServerRevision as jest.Mock).mockImplementationOnce(async (_id, revision) => { livePayload = { ...livePayload, serverRevision: Math.max(livePayload.serverRevision ?? 0, revision) }; return true; });
  (supabase.rpc as jest.Mock).mockImplementationOnce(async () => {
    await transitionPersistence(original.roundId, { nine_type: 'full', holes_played: 6 }, async () => undefined, () => {
      livePayload = { ...original, scores: { 1: { strokes: 8 } }, holesPlayed: 6, syncNineType: 'full', status: 'confirmed' };
    });
    return { data: [{ applied: false, conflict: true, server_revision: 9, server_status: 'completed', server_scores: {} }], error: null };
  });
  await syncAll();
  expect(livePayload).toMatchObject({ scores: { 1: { strokes: 8 } }, holesPlayed: 6, status: 'confirmed', serverRevision: 9 });
  expect(livePayload.scores[7]).toBeUndefined(); expect(database.updatePendingSyncData).not.toHaveBeenCalled();
});
