/**
 * Scoring Flow Integration Tests
 *
 * Tests the complete scoring lifecycle including:
 * - Happy path: Initialize → Score → Submit
 * - Offline to online sync flow
 * - Resume incomplete round from cache
 * - Multi-player concurrent scoring
 *
 * These tests use real store implementations with mocked persistence.
 */

import { useScorecardStore } from '@/store/scorecardStore';
import {
  createTestPlayer,
  create18Holes,
  createTestRound,
} from '../utils/testFixtures';
import type { Player, Hole, HoleScore } from '@/types';

// ============================================================================
// Mocks
// ============================================================================

// Mock the offline database service
const mockSaveScorecard = jest.fn(() => Promise.resolve());
const mockSaveHoleScore = jest.fn(() => Promise.resolve());
const mockGetScorecardsByRound = jest.fn(() => Promise.resolve([]));
const mockSaveHoles = jest.fn(() => Promise.resolve());
const mockGetHoles = jest.fn(() => Promise.resolve([]));

jest.mock('@/services/offline/database', () => ({
  saveScorecard: (...args: unknown[]) => mockSaveScorecard(...args),
  saveHoleScore: (...args: unknown[]) => mockSaveHoleScore(...args),
  getScorecardsByRound: (...args: unknown[]) => mockGetScorecardsByRound(...args),
  saveHoles: (...args: unknown[]) => mockSaveHoles(...args),
  getHoles: (...args: unknown[]) => mockGetHoles(...args),
}));

// Mock the sync service with state tracking
let mockIsOnline = true;
const mockQueueScorecardSync = jest.fn(() => Promise.resolve());
const mockSyncSubscribers: Array<(state: { status: string; pendingCount: number; error: null }) => void> = [];

jest.mock('@/services/offline/sync', () => ({
  queueScorecardSync: (...args: unknown[]) => mockQueueScorecardSync(...args),
  subscribeSyncState: jest.fn((callback) => {
    mockSyncSubscribers.push(callback);
    callback({ status: 'idle', pendingCount: 0, error: null });
    return () => {
      const index = mockSyncSubscribers.indexOf(callback);
      if (index > -1) mockSyncSubscribers.splice(index, 1);
    };
  }),
  getIsOnline: jest.fn(() => mockIsOnline),
}));

// Mock the debug logger
jest.mock('@/utils/debugLogger', () => ({
  storeLogger: {
    info: jest.fn(),
    debug: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
  },
  logScorecardSummary: jest.fn((sc) => ({ id: sc?.id })),
}));

// ============================================================================
// Helper Functions
// ============================================================================

const getStore = () => useScorecardStore.getState();

/**
 * Create test players with valid UUIDs
 */
function createTestPlayersWithUUIDs(count: number): Player[] {
  const uuids = [
    '11111111-1111-4111-a111-111111111111',
    '22222222-2222-4222-a222-222222222222',
    '33333333-3333-4333-a333-333333333333',
    '44444444-4444-4444-a444-444444444444',
  ];

  return Array.from({ length: count }, (_, i) =>
    createTestPlayer({
      id: uuids[i],
      name: `Player ${i + 1}`,
      handicap: 10 + i * 5,
    })
  );
}

/**
 * Simulate scoring all holes for all players
 */
async function scoreAllHoles(
  players: Player[],
  holes: Hole[],
  scoreOffset = 0
): Promise<void> {
  const store = getStore();

  for (const hole of holes) {
    for (const player of players) {
      const strokes = hole.par + scoreOffset;
      await store.setPlayerScore(player.id, hole.number, strokes);
    }
  }
}

/**
 * Score specific holes for specific players
 */
async function scoreHoles(
  playerScores: Array<{ playerId: string; holeNumber: number; strokes: number }>
): Promise<void> {
  const store = getStore();

  for (const { playerId, holeNumber, strokes } of playerScores) {
    await store.setPlayerScore(playerId, holeNumber, strokes);
  }
}

/**
 * Simulate network state change
 */
function setOnlineState(online: boolean): void {
  mockIsOnline = online;
}

// ============================================================================
// Tests
// ============================================================================

describe('Scoring Flow Integration Tests', () => {
  const testRoundId = '123e4567-e89b-42d3-a456-426614174000';
  let testPlayers: Player[];
  let testHoles: Hole[];

  beforeEach(() => {
    // Reset store
    getStore().resetRound();

    // Clear all mocks
    jest.clearAllMocks();

    // Reset mock implementations
    mockSaveScorecard.mockResolvedValue(undefined);
    mockSaveHoleScore.mockResolvedValue(undefined);
    mockGetScorecardsByRound.mockResolvedValue([]);
    mockSaveHoles.mockResolvedValue(undefined);
    mockGetHoles.mockResolvedValue([]);
    mockQueueScorecardSync.mockResolvedValue(undefined);

    // Reset network state
    setOnlineState(true);

    // Create test data
    testPlayers = createTestPlayersWithUUIDs(4);
    testHoles = create18Holes();
  });

  // ==========================================================================
  // HAPPY PATH FLOW
  // ==========================================================================

  describe('Happy Path Flow', () => {
    it('completes full scoring lifecycle: initialize → score → submit', async () => {
      const store = getStore();

      // Step 1: Initialize round
      await store.initializeRound(testRoundId, testPlayers, testHoles);

      expect(getStore().isInitialized).toBe(true);
      expect(getStore().groupScorecards.size).toBe(4);
      expect(getStore().currentHole).toBe(1);
      expect(mockSaveHoles).toHaveBeenCalledWith(testRoundId, testHoles);
      expect(mockSaveScorecard).toHaveBeenCalledTimes(4);

      // Step 2: Score all 18 holes for all players
      await scoreAllHoles(testPlayers, testHoles);

      // Verify totals are calculated
      for (const player of testPlayers) {
        const totals = getStore().getPlayerTotals(player.id);
        expect(totals.gross).toBe(72); // Par for all holes
        expect(totals.points).toBeGreaterThan(0); // Stableford points
      }

      // Step 3: Submit scorecards
      jest.clearAllMocks();
      await store.submitScorecards();

      // Verify status changed to completed
      for (const [, scorecard] of getStore().groupScorecards) {
        expect(scorecard.status).toBe('completed');
        expect(scorecard.submittedAt).toBeDefined();
      }

      // Verify scorecards were saved and queued for sync
      expect(mockSaveScorecard).toHaveBeenCalledTimes(4);
      expect(mockQueueScorecardSync).toHaveBeenCalledTimes(4);
    });

    it('correctly recalculates totals after each score update', async () => {
      const store = getStore();
      const player = testPlayers[0];

      await store.initializeRound(testRoundId, testPlayers, testHoles);

      // Score hole 1 (par 4)
      await store.setPlayerScore(player.id, 1, 4);
      expect(getStore().getPlayerTotals(player.id).gross).toBe(4);

      // Score hole 2 (par 3)
      await store.setPlayerScore(player.id, 2, 3);
      expect(getStore().getPlayerTotals(player.id).gross).toBe(7);

      // Score hole 3 (par 5)
      await store.setPlayerScore(player.id, 3, 6);
      expect(getStore().getPlayerTotals(player.id).gross).toBe(13);

      // Update hole 1 score
      await store.setPlayerScore(player.id, 1, 5);
      expect(getStore().getPlayerTotals(player.id).gross).toBe(14);
    });

    it('tracks hole completion correctly', async () => {
      const store = getStore();

      await store.initializeRound(testRoundId, testPlayers, testHoles);

      // Initially no holes complete
      expect(getStore().isHoleComplete(1)).toBe(false);
      expect(getStore().getCompletedHolesCount()).toBe(0);

      // Score hole 1 for all players
      for (const player of testPlayers) {
        await store.setPlayerScore(player.id, 1, 4);
      }

      expect(getStore().isHoleComplete(1)).toBe(true);
      expect(getStore().getCompletedHolesCount()).toBe(1);

      // Score hole 2 for all players
      for (const player of testPlayers) {
        await store.setPlayerScore(player.id, 2, 3);
      }

      expect(getStore().isHoleComplete(2)).toBe(true);
      expect(getStore().getCompletedHolesCount()).toBe(2);

      // Hole 3 not complete yet
      await store.setPlayerScore(testPlayers[0].id, 3, 5);
      expect(getStore().isHoleComplete(3)).toBe(false);
    });

    it('handles hole navigation correctly', async () => {
      const store = getStore();

      await store.initializeRound(testRoundId, testPlayers, testHoles);

      expect(getStore().currentHole).toBe(1);

      // Navigate to different holes
      store.setCurrentHole(5);
      expect(getStore().currentHole).toBe(5);

      store.setCurrentHole(18);
      expect(getStore().currentHole).toBe(18);

      // Invalid hole numbers should not change current hole
      store.setCurrentHole(0);
      expect(getStore().currentHole).toBe(18);

      store.setCurrentHole(19);
      expect(getStore().currentHole).toBe(18);
    });
  });

  // ==========================================================================
  // OFFLINE TO ONLINE FLOW
  // ==========================================================================

  describe('Offline to Online Flow', () => {
    it('saves scores to SQLite when offline and queues for sync', async () => {
      const store = getStore();

      // Start offline
      setOnlineState(false);

      await store.initializeRound(testRoundId, testPlayers, testHoles);

      // Score holes while offline
      for (let hole = 1; hole <= 5; hole++) {
        for (const player of testPlayers) {
          await store.setPlayerScore(player.id, hole, 4);
        }
      }

      // Verify SQLite was called for each score
      // Each player gets 5 hole scores = 20 calls
      expect(mockSaveHoleScore.mock.calls.length).toBeGreaterThanOrEqual(20);

      // Verify sync was queued
      expect(mockQueueScorecardSync).toHaveBeenCalled();
    });

    it('data persists correctly when scoring offline', async () => {
      const store = getStore();
      const player = testPlayers[0];

      setOnlineState(false);

      await store.initializeRound(testRoundId, testPlayers, testHoles);

      // Score multiple holes
      await store.setPlayerScore(player.id, 1, 4);
      await store.setPlayerScore(player.id, 2, 5);
      await store.setPlayerScore(player.id, 3, 3);

      // Verify in-memory state
      expect(getStore().getPlayerScore(player.id, 1)?.strokes).toBe(4);
      expect(getStore().getPlayerScore(player.id, 2)?.strokes).toBe(5);
      expect(getStore().getPlayerScore(player.id, 3)?.strokes).toBe(3);
      expect(getStore().getPlayerTotals(player.id).gross).toBe(12);

      // Verify persistence calls
      expect(mockSaveScorecard).toHaveBeenCalled();
    });

    it('submits correctly after being offline', async () => {
      const store = getStore();

      setOnlineState(false);

      await store.initializeRound(testRoundId, testPlayers, testHoles);

      // Score all holes offline
      await scoreAllHoles(testPlayers, testHoles);

      // Come back online and submit
      setOnlineState(true);
      jest.clearAllMocks();

      await store.submitScorecards();

      // Should save and queue all scorecards
      expect(mockSaveScorecard).toHaveBeenCalledTimes(4);
      expect(mockQueueScorecardSync).toHaveBeenCalledTimes(4);
    });
  });

  // ==========================================================================
  // RESUME INCOMPLETE ROUND
  // ==========================================================================

  describe('Resume Incomplete Round', () => {
    it('loads cached scorecards from SQLite', async () => {
      const store = getStore();

      // Create mock cached data with 5 holes scored
      const scores: Record<number, HoleScore> = {};
      for (let i = 1; i <= 5; i++) {
        scores[i] = { strokes: 4 };
      }

      const mockScorecards = testPlayers.map((player) => ({
        id: `scorecard-${testRoundId}-${player.id}`,
        roundId: testRoundId,
        playerId: player.id,
        player,
        scores,
        totalGross: 20,
        totalNet: 0,
        status: 'in-progress' as const,
        createdAt: new Date(),
        updatedAt: new Date(),
      }));

      mockGetScorecardsByRound.mockResolvedValue(mockScorecards);
      mockGetHoles.mockResolvedValue(testHoles);

      // Load from offline
      const loaded = await store.loadFromOffline(testRoundId);

      expect(loaded).toBe(true);
      expect(getStore().isInitialized).toBe(true);
      expect(getStore().groupScorecards.size).toBe(4);
    });

    it('resumes at correct hole based on progress', async () => {
      const store = getStore();

      // Mock: All players have holes 1-8 complete
      const scores: Record<number, HoleScore> = {};
      for (let i = 1; i <= 8; i++) {
        scores[i] = { strokes: 4 };
      }

      const mockScorecards = testPlayers.map((player) => ({
        id: `scorecard-${testRoundId}-${player.id}`,
        roundId: testRoundId,
        playerId: player.id,
        player,
        scores,
        totalGross: 32,
        totalNet: 0,
        status: 'in-progress' as const,
        createdAt: new Date(),
        updatedAt: new Date(),
      }));

      mockGetScorecardsByRound.mockResolvedValue(mockScorecards);
      mockGetHoles.mockResolvedValue(testHoles);

      await store.loadFromOffline(testRoundId);

      // Should resume at hole 9 (first incomplete)
      expect(getStore().currentHole).toBe(9);
    });

    it('continues scoring after resume and completes round', async () => {
      const store = getStore();

      // Mock: 9 holes complete
      const scores: Record<number, HoleScore> = {};
      for (let i = 1; i <= 9; i++) {
        scores[i] = { strokes: 4 };
      }

      const mockScorecards = testPlayers.map((player) => ({
        id: `scorecard-${testRoundId}-${player.id}`,
        roundId: testRoundId,
        playerId: player.id,
        player,
        scores,
        totalGross: 36,
        totalNet: 0,
        status: 'in-progress' as const,
        createdAt: new Date(),
        updatedAt: new Date(),
      }));

      mockGetScorecardsByRound.mockResolvedValue(mockScorecards);
      mockGetHoles.mockResolvedValue(testHoles);

      // Load from cache
      await store.loadFromOffline(testRoundId);
      expect(getStore().currentHole).toBe(10);

      // Score remaining holes
      for (let hole = 10; hole <= 18; hole++) {
        for (const player of testPlayers) {
          await store.setPlayerScore(player.id, hole, 4);
        }
      }

      // Verify totals
      for (const player of testPlayers) {
        const totals = getStore().getPlayerTotals(player.id);
        expect(totals.gross).toBe(72); // 18 * 4
      }

      // Submit
      await store.submitScorecards();

      for (const [, scorecard] of getStore().groupScorecards) {
        expect(scorecard.status).toBe('completed');
      }
    });

    it('returns false when no cached data exists', async () => {
      const store = getStore();

      mockGetScorecardsByRound.mockResolvedValue([]);

      const loaded = await store.loadFromOffline(testRoundId);

      expect(loaded).toBe(false);
      expect(getStore().isInitialized).toBe(false);
    });
  });

  // ==========================================================================
  // MULTI-PLAYER CONCURRENT SCORING
  // ==========================================================================

  describe('Multi-Player Concurrent Scoring', () => {
    it('handles concurrent score updates for different players', async () => {
      const store = getStore();

      await store.initializeRound(testRoundId, testPlayers, testHoles);

      // Simulate concurrent scoring for hole 1
      await Promise.all([
        store.setPlayerScore(testPlayers[0].id, 1, 4),
        store.setPlayerScore(testPlayers[1].id, 1, 5),
        store.setPlayerScore(testPlayers[2].id, 1, 3),
        store.setPlayerScore(testPlayers[3].id, 1, 6),
      ]);

      // All scores should be recorded
      expect(getStore().getPlayerScore(testPlayers[0].id, 1)?.strokes).toBe(4);
      expect(getStore().getPlayerScore(testPlayers[1].id, 1)?.strokes).toBe(5);
      expect(getStore().getPlayerScore(testPlayers[2].id, 1)?.strokes).toBe(3);
      expect(getStore().getPlayerScore(testPlayers[3].id, 1)?.strokes).toBe(6);
    });

    it('handles concurrent score updates for different holes', async () => {
      const store = getStore();
      const player = testPlayers[0];

      await store.initializeRound(testRoundId, testPlayers, testHoles);

      // Score multiple holes concurrently
      await Promise.all([
        store.setPlayerScore(player.id, 1, 4),
        store.setPlayerScore(player.id, 2, 3),
        store.setPlayerScore(player.id, 3, 5),
        store.setPlayerScore(player.id, 4, 4),
      ]);

      expect(getStore().getPlayerScore(player.id, 1)?.strokes).toBe(4);
      expect(getStore().getPlayerScore(player.id, 2)?.strokes).toBe(3);
      expect(getStore().getPlayerScore(player.id, 3)?.strokes).toBe(5);
      expect(getStore().getPlayerScore(player.id, 4)?.strokes).toBe(4);
      expect(getStore().getPlayerTotals(player.id).gross).toBe(16);
    });

    it('calculates totals correctly for all 4 players after full round', async () => {
      const store = getStore();

      await store.initializeRound(testRoundId, testPlayers, testHoles);

      // Each player scores differently
      const offsets = [0, 1, 2, -1]; // Player 1 par, 2 bogey, 3 double, 4 birdie

      for (const hole of testHoles) {
        await Promise.all(
          testPlayers.map((player, i) =>
            store.setPlayerScore(player.id, hole.number, hole.par + offsets[i])
          )
        );
      }

      // Verify totals
      const coursePar = testHoles.reduce((sum, h) => sum + h.par, 0);
      expect(getStore().getPlayerTotals(testPlayers[0].id).gross).toBe(coursePar); // Par
      expect(getStore().getPlayerTotals(testPlayers[1].id).gross).toBe(coursePar + 18); // +18
      expect(getStore().getPlayerTotals(testPlayers[2].id).gross).toBe(coursePar + 36); // +36
      expect(getStore().getPlayerTotals(testPlayers[3].id).gross).toBe(coursePar - 18); // -18

      // All should be synced after submit
      jest.clearAllMocks();
      await store.submitScorecards();

      expect(mockSaveScorecard).toHaveBeenCalledTimes(4);
      expect(mockQueueScorecardSync).toHaveBeenCalledTimes(4);
    });
  });

  // ==========================================================================
  // GAME TYPE VARIATIONS
  // ==========================================================================

  describe('Game Type Variations', () => {
    it('calculates Stableford points correctly', async () => {
      const store = getStore();

      await store.initializeRound(testRoundId, testPlayers, testHoles, 'stableford');

      const player = testPlayers[0]; // handicap 10

      // Score par on every hole
      for (const hole of testHoles) {
        await store.setPlayerScore(player.id, hole.number, hole.par);
      }

      const totals = getStore().getPlayerTotals(player.id);
      expect(totals.gross).toBe(72);
      // With handicap 10, should get some extra points
      expect(totals.points).toBeGreaterThan(0);
    });

    it('calculates stroke play (net) correctly', async () => {
      const store = getStore();

      await store.initializeRound(testRoundId, testPlayers, testHoles, 'stroke');

      const player = testPlayers[0]; // handicap 10

      // Score par on every hole
      for (const hole of testHoles) {
        await store.setPlayerScore(player.id, hole.number, hole.par);
      }

      const totals = getStore().getPlayerTotals(player.id);
      expect(totals.gross).toBe(72);
      expect(totals.net).toBeLessThan(72); // Net should account for handicap
      expect(totals.points).toBe(0); // No points in stroke play
    });
  });

  // ==========================================================================
  // EDGE CASES AND ERROR HANDLING
  // ==========================================================================

  describe('Edge Cases and Error Handling', () => {
    it('handles scoring for non-existent player gracefully', async () => {
      const store = getStore();

      await store.initializeRound(testRoundId, testPlayers, testHoles);

      // Should not throw
      await store.setPlayerScore('non-existent-player-id', 1, 4);

      // Store should still be in valid state
      expect(getStore().isInitialized).toBe(true);
    });

    it('handles scoring for invalid hole number gracefully', async () => {
      const store = getStore();

      await store.initializeRound(testRoundId, testPlayers, testHoles);

      // Should not throw for hole 99
      await store.setPlayerScore(testPlayers[0].id, 99, 4);

      // Hole 99 should not be scored
      expect(getStore().getPlayerScore(testPlayers[0].id, 99)).toBeUndefined();
    });

    it('handles allowed player restrictions', async () => {
      const store = getStore();

      // Initialize with only first 2 players allowed
      await store.initializeRound(
        testRoundId,
        testPlayers,
        testHoles,
        'stableford',
        false,
        [testPlayers[0].id, testPlayers[1].id]
      );

      // Score for allowed players should work
      await store.setPlayerScore(testPlayers[0].id, 1, 4);
      expect(getStore().getPlayerScore(testPlayers[0].id, 1)?.strokes).toBe(4);

      // Score for non-allowed players should be ignored
      await store.setPlayerScore(testPlayers[2].id, 1, 5);
      expect(getStore().getPlayerScore(testPlayers[2].id, 1)).toBeUndefined();
    });

    it('handles database save errors gracefully', async () => {
      const store = getStore();

      await store.initializeRound(testRoundId, testPlayers, testHoles);

      // Make save fail
      mockSaveHoleScore.mockRejectedValueOnce(new Error('Database error'));

      // Should not throw, score should still be in memory
      await store.setPlayerScore(testPlayers[0].id, 1, 4);

      expect(getStore().getPlayerScore(testPlayers[0].id, 1)?.strokes).toBe(4);
    });

    it('prevents submission when no round ID set', async () => {
      // Reset without initializing
      getStore().resetRound();

      await expect(getStore().submitScorecards()).rejects.toThrow('No round ID set');
    });

    it('handles partial hole stats (putts, FIR, GIR)', async () => {
      const store = getStore();

      await store.initializeRound(testRoundId, testPlayers, testHoles);

      const player = testPlayers[0];

      // Update with full stats
      await store.updatePlayerHoleScore(player.id, 1, {
        strokes: 4,
        putts: 2,
        fairwayHit: true,
        greenInRegulation: true,
      });

      const score = getStore().getPlayerScore(player.id, 1);
      expect(score?.strokes).toBe(4);
      expect(score?.putts).toBe(2);
      expect(score?.fairwayHit).toBe(true);
      expect(score?.greenInRegulation).toBe(true);

      // Update just strokes - should preserve other stats
      await store.setPlayerScore(player.id, 1, 5);

      const updatedScore = getStore().getPlayerScore(player.id, 1);
      expect(updatedScore?.strokes).toBe(5);
      expect(updatedScore?.putts).toBe(2);
      expect(updatedScore?.fairwayHit).toBe(true);
    });
  });

  // ==========================================================================
  // RESET AND CLEANUP
  // ==========================================================================

  describe('Reset and Cleanup', () => {
    it('resets all state correctly', async () => {
      const store = getStore();

      await store.initializeRound(testRoundId, testPlayers, testHoles);
      await store.setPlayerScore(testPlayers[0].id, 1, 4);

      // Reset
      store.resetRound();

      expect(getStore().currentRoundId).toBeNull();
      expect(getStore().currentPlayers).toHaveLength(0);
      expect(getStore().groupScorecards.size).toBe(0);
      expect(getStore().currentHole).toBe(1);
      expect(getStore().isInitialized).toBe(false);
      expect(getStore().holes).toHaveLength(0);
    });

    it('allows re-initialization after reset', async () => {
      const store = getStore();

      // First round
      await store.initializeRound(testRoundId, testPlayers, testHoles);
      await store.setPlayerScore(testPlayers[0].id, 1, 4);

      // Reset
      store.resetRound();

      // Second round with different ID
      const newRoundId = '99999999-9999-4999-a999-999999999999';
      await store.initializeRound(newRoundId, testPlayers, testHoles);

      expect(getStore().currentRoundId).toBe(newRoundId);
      expect(getStore().isInitialized).toBe(true);
      expect(getStore().getPlayerScore(testPlayers[0].id, 1)).toBeUndefined();
    });
  });
});
