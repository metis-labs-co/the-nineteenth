/**
 * Offline Sync Service Tests
 *
 * Tests the synchronization between local SQLite database and Supabase,
 * including network state handling, sync queue management, and error recovery.
 *
 * Note: The sync service uses module-level state which makes some tests
 * dependent on execution order. Tests are grouped to minimize state conflicts.
 */

import NetInfo from '@react-native-community/netinfo';
import {
  initSyncService,
  getSyncState,
  getIsOnline,
  syncAll,
  queueScorecardSync,
  manualSync,
  clearSyncQueue,
  subscribeSyncState,
} from '@/services/offline/sync';
import * as database from '@/services/offline/database';
import { supabase } from '@/services/supabase/client';
import * as queryClient from '@/services/queryClient';
import type { Scorecard, PendingSync } from '@/types';

// ============================================================================
// MOCK SETUP
// ============================================================================

// Mock the database module
jest.mock('@/services/offline/database', () => ({
  getPendingSyncs: jest.fn(),
  removePendingSync: jest.fn(),
  incrementSyncRetryCount: jest.fn(),
  markScorecardsAsSynced: jest.fn(),
  getUnsyncedScorecards: jest.fn(),
  addPendingSync: jest.fn(),
  getPendingSyncCount: jest.fn(),
  clearInvalidMockData: jest.fn(),
  clearAllPendingSyncs: jest.fn(),
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
      maybeSingle: jest.fn(() => Promise.resolve({ data: null, error: null })),
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
}));

// Mock handicap update service
jest.mock('@/services/handicap/updatePlayerHandicapIndex', () => ({
  updatePlayerHandicapIndex: jest.fn(() => Promise.resolve()),
}));

// Store the network change handler for testing
let _networkChangeHandler: ((state: { isConnected: boolean | null; type: string; isInternetReachable: boolean | null }) => Promise<void>) | null = null;
const mockUnsubscribe = jest.fn();

// Reset mocks before each test
beforeEach(() => {
  jest.clearAllMocks();
  _networkChangeHandler = null;

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
  (database.clearInvalidMockData as jest.Mock).mockResolvedValue(0);
  (database.clearAllPendingSyncs as jest.Mock).mockResolvedValue(0);
  (database.removePendingSync as jest.Mock).mockResolvedValue(undefined);
  (database.addPendingSync as jest.Mock).mockResolvedValue(undefined);
  (database.markScorecardsAsSynced as jest.Mock).mockResolvedValue(undefined);
  (database.incrementSyncRetryCount as jest.Mock).mockResolvedValue(undefined);
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
      expect(database.removePendingSync).toHaveBeenCalledWith(pendingSync.id);
    });

    it('should sync unsynced scorecards and mark as synced', async () => {
      const unsyncedScorecard = createTestScorecard();
      (database.getUnsyncedScorecards as jest.Mock).mockResolvedValue([unsyncedScorecard]);

      await syncAll();

      expect(database.getUnsyncedScorecards).toHaveBeenCalled();
      expect(database.markScorecardsAsSynced).toHaveBeenCalledWith([unsyncedScorecard.id]);
    });

    it('should increment retry count on failure (not max)', async () => {
      const failingSync = createPendingSync({
        retryCount: 1,
        data: createTestScorecard({ roundId: 'invalid-uuid' }),
      });
      (database.getPendingSyncs as jest.Mock).mockResolvedValue([failingSync]);

      await syncAll();

      expect(database.incrementSyncRetryCount).toHaveBeenCalledWith(failingSync.id);
    });

    it('should remove sync after max retries', async () => {
      const maxRetriesSync = createPendingSync({
        retryCount: 3,
        data: createTestScorecard({ roundId: 'invalid-uuid' }),
      });
      (database.getPendingSyncs as jest.Mock).mockResolvedValue([maxRetriesSync]);

      await syncAll();

      expect(database.removePendingSync).toHaveBeenCalledWith(maxRetriesSync.id);
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

  describe('manualSync()', () => {
    it('should call syncAll and return result', async () => {
      const result = await manualSync();

      expect(result).toBe(true);
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

describe('Scorecard Sync Processing', () => {
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

    expect(database.incrementSyncRetryCount).toHaveBeenCalledWith(pendingSync.id);
  });

  it('should fail for invalid player_id UUID and increment retry', async () => {
    const invalidScorecard = createTestScorecard({
      playerId: 'mock-player-abc',
    });

    const pendingSync = createPendingSync({ data: invalidScorecard });
    (database.getPendingSyncs as jest.Mock).mockResolvedValue([pendingSync]);

    await syncAll();

    expect(database.incrementSyncRetryCount).toHaveBeenCalledWith(pendingSync.id);
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
});

// ============================================================================
// ERROR HANDLING TESTS
// ============================================================================

describe('Error Handling', () => {
  beforeEach(() => {
    initSyncService();
  });

  it('should handle unknown sync types gracefully', async () => {
    const unknownTypeSync = createPendingSync({
      type: 'unknown' as PendingSync['type'],
    });
    (database.getPendingSyncs as jest.Mock).mockResolvedValue([unknownTypeSync]);

    const result = await syncAll();

    expect(result).toBe(true);
    expect(database.removePendingSync).toHaveBeenCalledWith(unknownTypeSync.id);
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
    const successSync2 = createPendingSync({ id: 3 });

    (database.getPendingSyncs as jest.Mock).mockResolvedValue([
      successSync1,
      failSync,
      successSync2,
    ]);

    await syncAll();

    // Should have removed successful syncs
    expect(database.removePendingSync).toHaveBeenCalledWith(1);
    expect(database.removePendingSync).toHaveBeenCalledWith(3);
    // Should have incremented retry count for failed sync
    expect(database.incrementSyncRetryCount).toHaveBeenCalledWith(2);
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
});
