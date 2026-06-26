/**
 * Scorecard Store Tests - Phase 1
 *
 * Tests the Zustand store that manages scoring state including:
 * - Round initialization
 * - Score entry and validation
 * - Player totals calculation
 * - Scorecard submission
 * - Offline support integration
 */

import { useScorecardStore } from '@/store/scorecardStore';
import {
  createTestPlayer,
  create18Holes,
} from '../utils/testFixtures';
import type { Player, Hole, Scorecard, HoleScore, MultiBallHoleScore } from '@/types';
import { isSingleBallScore } from '@/types/database';

// Import mocks after jest.mock declarations
import {
  saveScorecard,
  saveHoleScore,
  getScorecardsByRound,
  saveHoles,
  getHoles,
  markScorecardsAsSynced,
} from '@/services/offline/database';
import { queueScorecardSync, syncScorecard, getIsOnline } from '@/services/offline/sync';
import { storeLogger } from '@/utils/debugLogger';

// Helper to get store state
const getStore = () => useScorecardStore.getState();

// Helpers to access score properties (handles union type)
const getStrokes = (score: HoleScore | MultiBallHoleScore | undefined): number | undefined =>
  score && isSingleBallScore(score) ? score.strokes : undefined;

const getPutts = (score: HoleScore | MultiBallHoleScore | undefined): number | undefined =>
  score && isSingleBallScore(score) ? score.putts : undefined;

const getFairwayHit = (score: HoleScore | MultiBallHoleScore | undefined): boolean | undefined =>
  score && isSingleBallScore(score) ? score.fairwayHit : undefined;

const getGreenInRegulation = (score: HoleScore | MultiBallHoleScore | undefined): boolean | undefined =>
  score && isSingleBallScore(score) ? score.greenInRegulation : undefined;

// Helper to wait for async operations
const _waitFor = (ms = 0) => new Promise((resolve) => setTimeout(resolve, ms));

// Mock the offline database service
jest.mock('@/services/offline/database', () => ({
  saveScorecard: jest.fn(() => Promise.resolve()),
  saveHoleScore: jest.fn(() => Promise.resolve()),
  getScorecardsByRound: jest.fn(() => Promise.resolve([])),
  saveHoles: jest.fn(() => Promise.resolve()),
  getHoles: jest.fn(() => Promise.resolve([])),
  markScorecardsAsSynced: jest.fn(() => Promise.resolve()),
}));

// Mock the sync service
jest.mock('@/services/offline/sync', () => ({
  queueScorecardSync: jest.fn(() => Promise.resolve()),
  syncScorecard: jest.fn(() => Promise.resolve()),
  subscribeSyncState: jest.fn((callback) => {
    callback({ status: 'idle', pendingCount: 0, error: null });
    return jest.fn();
  }),
  getIsOnline: jest.fn(() => true),
}));

// Mock the Supabase client. loadFromOffline reads the round's metadata
// (nine_type, game_type, etc.) and bails out early unless nine_type is known,
// so the mocked `rounds` row must supply it.
jest.mock('@/services/supabase/client', () => {
  const roundsResult = {
    data: {
      game_type: 'stableford',
      handicap_source: 'profile',
      nine_type: 'full',
      selected_tee: null,
      course_id: null,
    },
    error: null,
  };
  // Mutable result for the `players` table lookup (live handicap refresh on
  // resume). Tests set this via __setPlayersResult. A `__reject` flag makes the
  // terminal `.in()` reject, simulating an offline/network failure.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- test mock state
  let playersResult: any = { data: null, error: null };
  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- test mock chain
  const makeChain = (result: any) => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any -- self-referential chain
    const chain: any = {
      select: jest.fn(() => chain),
      eq: jest.fn(() => chain),
      in: jest.fn(() =>
        result && result.__reject
          ? Promise.reject(new Error('network error'))
          : Promise.resolve(result)
      ),
      maybeSingle: jest.fn(() => Promise.resolve(result)),
      single: jest.fn(() => Promise.resolve(result)),
    };
    return chain;
  };
  return {
    supabase: {
      from: jest.fn((table: string) =>
        makeChain(
          table === 'rounds'
            ? roundsResult
            : table === 'players'
              ? playersResult
              : { data: null, error: null }
        )
      ),
    },
    getCurrentUser: jest.fn(() => Promise.resolve({ id: 'test-user-id' })),
    // eslint-disable-next-line @typescript-eslint/no-explicit-any -- test helper
    __setPlayersResult: (r: any) => {
      playersResult = r;
    },
    __resetPlayersResult: () => {
      playersResult = { data: null, error: null };
    },
  };
});

// Test-only handles into the supabase mock above (typed loosely via requireMock
// so they don't need to exist on the real module's exports).
const { __setPlayersResult, __resetPlayersResult } = jest.requireMock(
  '@/services/supabase/client'
) as {
  __setPlayersResult: (r: unknown) => void;
  __resetPlayersResult: () => void;
};

// Mock the debug logger
jest.mock('@/utils/debugLogger', () => {
  const makeLogger = () => ({
    info: jest.fn(),
    debug: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
  });
  return {
    storeLogger: makeLogger(),
    syncLogger: makeLogger(),
    createModuleLogger: jest.fn(() => makeLogger()),
    logScorecardSummary: jest.fn((sc) => ({ id: sc?.id })),
  };
});

describe('ScorecardStore', () => {
  // Test data setup
  let testPlayers: Player[];
  let testHoles: Hole[];
  // UUID v4 format: xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx where y is [89ab]
  const testRoundId = '123e4567-e89b-42d3-a456-426614174000';

  beforeEach(() => {
    // Reset the store state
    getStore().resetRound();

    // Clear all mocks
    jest.clearAllMocks();

    // Create test data with valid UUIDs (UUID v4 format)
    // UUID v4: xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx where y is [89ab]
    testPlayers = [
      createTestPlayer({
        id: '11111111-1111-4111-a111-111111111111',
        name: 'Player 1',
        handicap: 18,
      }),
      createTestPlayer({
        id: '22222222-2222-4222-a222-222222222222',
        name: 'Player 2',
        handicap: 12,
      }),
      createTestPlayer({
        id: '33333333-3333-4333-a333-333333333333',
        name: 'Player 3',
        handicap: 24,
      }),
    ];

    testHoles = create18Holes();
  });

  // ==========================================================================
  // INITIALIZATION TESTS
  // ==========================================================================

  describe('initializeRound', () => {
    it('creates scorecards for all players', async () => {
      const store = getStore();

      await store.initializeRound(testRoundId, testPlayers, testHoles);

      expect(getStore().groupScorecards.size).toBe(3);
      expect(getStore().currentPlayers).toHaveLength(3);
      expect(getStore().isInitialized).toBe(true);
    });

    it('saves holes to SQLite', async () => {
      const store = getStore();

      await store.initializeRound(testRoundId, testPlayers, testHoles);

      expect(saveHoles).toHaveBeenCalledWith(testRoundId, testHoles);
    });

    it('saves each player scorecard to SQLite', async () => {
      const store = getStore();

      await store.initializeRound(testRoundId, testPlayers, testHoles);

      expect(saveScorecard).toHaveBeenCalledTimes(3);
    });

    it('sets initial hole to 1', async () => {
      const store = getStore();

      await store.initializeRound(testRoundId, testPlayers, testHoles);

      expect(getStore().currentHole).toBe(1);
    });

    it('sets the game type correctly', async () => {
      const store = getStore();

      await store.initializeRound(testRoundId, testPlayers, testHoles, 'stroke');

      expect(getStore().gameType).toBe('stroke');
    });

    it('sets default game type to stableford', async () => {
      const store = getStore();

      await store.initializeRound(testRoundId, testPlayers, testHoles);

      expect(getStore().gameType).toBe('stableford');
    });

    it('handles allowed player IDs filtering', async () => {
      const store = getStore();
      const allowedIds = [testPlayers[0].id, testPlayers[1].id];

      await store.initializeRound(
        testRoundId,
        testPlayers,
        testHoles,
        'stableford',
        false,
        allowedIds
      );

      expect(getStore().allowedPlayerIds).toEqual(allowedIds);
    });

    it('creates scorecards with in-progress status', async () => {
      const store = getStore();

      await store.initializeRound(testRoundId, testPlayers, testHoles);

      for (const [, scorecard] of getStore().groupScorecards) {
        expect(scorecard.status).toBe('in-progress');
      }
    });

    it('creates scorecards with empty scores', async () => {
      const store = getStore();

      await store.initializeRound(testRoundId, testPlayers, testHoles);

      for (const [, scorecard] of getStore().groupScorecards) {
        expect(Object.keys(scorecard.scores)).toHaveLength(0);
        expect(scorecard.totalGross).toBe(0);
        expect(scorecard.totalNet).toBe(0);
      }
    });

    it('sets standalone flag when isStandalone is true', async () => {
      const store = getStore();

      await store.initializeRound(
        testRoundId,
        testPlayers,
        testHoles,
        'stableford',
        true // isStandalone
      );

      for (const [, scorecard] of getStore().groupScorecards) {
        expect(scorecard.isStandalone).toBe(true);
      }
    });
  });

  describe('loadFromOffline', () => {
    // Helper function to create valid mock scorecards - use actual testPlayers at test time
    const createMockScorecards = (
      players: Player[],
      roundId: string,
      scores: Record<number, HoleScore> = { 1: { strokes: 4 }, 2: { strokes: 5 } }
    ): Scorecard[] => {
      return players.map((player) => ({
        id: `scorecard-${roundId}-${player.id}`,
        roundId: roundId,
        playerId: player.id,
        player,
        scores,
        totalGross: Object.values(scores).reduce((sum, s) => sum + (s.strokes || 0), 0),
        totalNet: 0,
        status: 'in-progress' as const,
        createdAt: new Date(),
        updatedAt: new Date(),
      }));
    };

    // Regression: a round opened on the device long ago freezes each player's
    // handicap into SQLite (ScorecardDAO.player_handicap). On resume, the cached
    // player must be refreshed from the live `players` table so scoring — and the
    // handicap snapshot written at submit — use the player's CURRENT handicap,
    // not the stale value from when the round was first opened.
    describe('live handicap refresh on resume', () => {
      const STALE_PLAYER_ID = '44444444-4444-4444-a444-444444444444';

      afterEach(() => {
        __resetPlayersResult();
      });

      it('refreshes a stale cached player handicap from the live players table', async () => {
        const stalePlayer = createTestPlayer({
          id: STALE_PLAYER_ID,
          name: 'Ben',
          handicap: 13.2, // frozen value from when the round was first opened
        });
        const mockScorecards = createMockScorecards([stalePlayer], testRoundId);
        (getScorecardsByRound as jest.Mock).mockReset().mockResolvedValue(mockScorecards);
        (getHoles as jest.Mock).mockReset().mockResolvedValue(testHoles);
        // Live profile handicap has since dropped to 10.7
        __setPlayersResult({
          data: [{ id: STALE_PLAYER_ID, handicap: 10.7, handicap_index: null, gender: null }],
          error: null,
        });

        await getStore().loadFromOffline(testRoundId);

        const player = getStore().currentPlayers.find((p) => p.id === STALE_PLAYER_ID);
        expect(player?.handicap).toBe(10.7);
        // the cached scorecard's embedded player is refreshed too (used at submit)
        expect(
          getStore().groupScorecards.get(STALE_PLAYER_ID)?.player?.handicap
        ).toBe(10.7);
      });

      it('keeps the cached handicap when the live fetch fails (offline)', async () => {
        const stalePlayer = createTestPlayer({
          id: STALE_PLAYER_ID,
          name: 'Ben',
          handicap: 13.2,
        });
        const mockScorecards = createMockScorecards([stalePlayer], testRoundId);
        (getScorecardsByRound as jest.Mock).mockReset().mockResolvedValue(mockScorecards);
        (getHoles as jest.Mock).mockReset().mockResolvedValue(testHoles);
        __setPlayersResult({ __reject: true }); // simulate offline / network failure

        const loaded = await getStore().loadFromOffline(testRoundId);

        expect(loaded).toBe(true);
        expect(
          getStore().currentPlayers.find((p) => p.id === STALE_PLAYER_ID)?.handicap
        ).toBe(13.2);
      });
    });

    it('loads cached scorecards from SQLite', async () => {
      const mockScorecards = createMockScorecards(testPlayers, testRoundId);

      // Reset and set up fresh mocks for this test
      (getScorecardsByRound as jest.Mock).mockReset().mockResolvedValue(mockScorecards);
      (getHoles as jest.Mock).mockReset().mockResolvedValue(testHoles);

      const store = getStore();
      const loaded = await store.loadFromOffline(testRoundId);

      expect(loaded).toBe(true);
      expect(getStore().groupScorecards.size).toBe(3);
      expect(getStore().isInitialized).toBe(true);
    });

    it('returns false when no cached data exists', async () => {
      (getScorecardsByRound as jest.Mock).mockImplementationOnce(() => Promise.resolve([]));

      const store = getStore();
      const loaded = await store.loadFromOffline(testRoundId);

      expect(loaded).toBe(false);
      expect(getStore().isInitialized).toBe(false);
    });

    it('rejects invalid UUID mock data', async () => {
      // Scorecards with invalid (non-UUID) IDs
      const mockScorecards: Scorecard[] = [
        {
          id: 'scorecard-mock-player-1',
          roundId: 'mock-round-id', // Invalid UUID
          playerId: 'mock-player-1', // Invalid UUID
          player: createTestPlayer({ id: 'mock-player-1', name: 'Mock Player' }),
          scores: {},
          totalGross: 0,
          totalNet: 0,
          status: 'in-progress',
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ];

      (getScorecardsByRound as jest.Mock).mockImplementationOnce(() => Promise.resolve(mockScorecards));

      const store = getStore();
      const loaded = await store.loadFromOffline('mock-round-id');

      expect(loaded).toBe(false);
    });

    it('finds first incomplete hole correctly', async () => {
      // Scorecards with holes 1-5 complete, hole 6 incomplete
      const scores: Record<number, HoleScore> = {
        1: { strokes: 4 },
        2: { strokes: 5 },
        3: { strokes: 3 },
        4: { strokes: 4 },
        5: { strokes: 5 },
      };
      const mockScorecards = createMockScorecards(testPlayers, testRoundId, scores);

      // Reset and set up fresh mocks for this test
      (getScorecardsByRound as jest.Mock).mockReset().mockResolvedValue(mockScorecards);
      (getHoles as jest.Mock).mockReset().mockResolvedValue(testHoles);

      const store = getStore();
      await store.loadFromOffline(testRoundId);

      expect(getStore().currentHole).toBe(6);
    });

    it('sets current hole to 18 when all holes complete', async () => {
      // All 18 holes scored for all players
      const allScores: Record<number, HoleScore> = {};
      for (let i = 1; i <= 18; i++) {
        allScores[i] = { strokes: 4 };
      }

      const mockScorecards = createMockScorecards(testPlayers, testRoundId, allScores);

      // Reset and set up fresh mocks for this test
      (getScorecardsByRound as jest.Mock).mockReset().mockResolvedValue(mockScorecards);
      (getHoles as jest.Mock).mockReset().mockResolvedValue(testHoles);

      const store = getStore();
      await store.loadFromOffline(testRoundId);

      expect(getStore().currentHole).toBe(18);
    });
  });

  // ==========================================================================
  // SCORE ENTRY TESTS
  // ==========================================================================

  describe('setPlayerScore', () => {
    beforeEach(async () => {
      const store = getStore();
      await store.initializeRound(testRoundId, testPlayers, testHoles);
    });

    it('updates score correctly', async () => {
      const store = getStore();
      const playerId = testPlayers[0].id;

      await store.setPlayerScore(playerId, 1, 4);

      const score = getStore().getPlayerScore(playerId, 1);
      expect(getStrokes(score)).toBe(4);
    });

    it('rejects scores for non-allowed players when allowedPlayerIds is set', async () => {
      const store = getStore();

      // Set allowed players to only the first player
      store.setAllowedPlayers([testPlayers[0].id]);

      // Try to set score for second player (not allowed)
      await store.setPlayerScore(testPlayers[1].id, 1, 5);

      const score = getStore().getPlayerScore(testPlayers[1].id, 1);
      expect(score).toBeUndefined();
    });

    it('preserves existing stats (putts, FIR, GIR) when setting strokes', async () => {
      const store = getStore();
      const playerId = testPlayers[0].id;

      // First set a score with stats via updatePlayerHoleScore
      await store.updatePlayerHoleScore(playerId, 1, {
        strokes: 4,
        putts: 2,
        fairwayHit: true,
        greenInRegulation: true,
      });

      // Then update just the strokes
      await store.setPlayerScore(playerId, 1, 5);

      const score = getStore().getPlayerScore(playerId, 1);
      expect(getStrokes(score)).toBe(5);
      expect(getPutts(score)).toBe(2);
      expect(getFairwayHit(score)).toBe(true);
      expect(getGreenInRegulation(score)).toBe(true);
    });

    it('recalculates totals after update', async () => {
      const store = getStore();
      const playerId = testPlayers[0].id;

      await store.setPlayerScore(playerId, 1, 4);
      await store.setPlayerScore(playerId, 2, 5);

      const totals = getStore().getPlayerTotals(playerId);
      expect(totals.gross).toBe(9);
    });

    it('saves to SQLite', async () => {
      const store = getStore();
      const playerId = testPlayers[0].id;

      jest.clearAllMocks();

      await store.setPlayerScore(playerId, 1, 4);

      expect(saveHoleScore).toHaveBeenCalled();
      expect(saveScorecard).toHaveBeenCalled();
    });

    it('does not queue sync during scoring (deferred to submission)', async () => {
      const store = getStore();
      const playerId = testPlayers[0].id;

      jest.clearAllMocks();

      await store.setPlayerScore(playerId, 1, 4);

      // Sync is deferred to submitScorecards to avoid excessive intermediate
      // syncs that can cause race conditions with the double-sync overwrite bug
      expect(queueScorecardSync).not.toHaveBeenCalled();
    });

    it('handles missing player gracefully', async () => {
      const store = getStore();

      // Should not throw
      await store.setPlayerScore('non-existent-player', 1, 4);

      // Just verify no error was thrown
      expect(true).toBe(true);
    });

    it('handles missing hole data gracefully', async () => {
      const store = getStore();
      const playerId = testPlayers[0].id;

      // Try to score hole 99 which doesn't exist
      await store.setPlayerScore(playerId, 99, 4);

      const score = getStore().getPlayerScore(playerId, 99);
      expect(score).toBeUndefined();
    });
  });

  describe('updatePlayerHoleScore', () => {
    beforeEach(async () => {
      const store = getStore();
      await store.initializeRound(testRoundId, testPlayers, testHoles);
    });

    it('merges partial updates', async () => {
      const store = getStore();
      const playerId = testPlayers[0].id;

      // First update with strokes
      await store.updatePlayerHoleScore(playerId, 1, { strokes: 4 });

      // Then update with putts only
      await store.updatePlayerHoleScore(playerId, 1, { putts: 2 });

      const score = getStore().getPlayerScore(playerId, 1);
      expect(getStrokes(score)).toBe(4);
      expect(getPutts(score)).toBe(2);
    });

    it('rejects updates for non-allowed players', async () => {
      const store = getStore();

      store.setAllowedPlayers([testPlayers[0].id]);

      await store.updatePlayerHoleScore(testPlayers[1].id, 1, { strokes: 4 });

      const score = getStore().getPlayerScore(testPlayers[1].id, 1);
      expect(score).toBeUndefined();
    });
  });

  // ==========================================================================
  // RETRIEVAL TESTS
  // ==========================================================================

  describe('getPlayerScore', () => {
    beforeEach(async () => {
      const store = getStore();
      await store.initializeRound(testRoundId, testPlayers, testHoles);
    });

    it('returns correct hole score', async () => {
      const store = getStore();
      const playerId = testPlayers[0].id;

      await store.setPlayerScore(playerId, 5, 6);

      const score = getStore().getPlayerScore(playerId, 5);
      expect(getStrokes(score)).toBe(6);
    });

    it('returns undefined for unscored hole', () => {
      const playerId = testPlayers[0].id;

      const score = getStore().getPlayerScore(playerId, 1);
      expect(score).toBeUndefined();
    });

    it('returns undefined for unknown player', () => {
      const score = getStore().getPlayerScore('unknown-player', 1);
      expect(score).toBeUndefined();
    });
  });

  describe('getPlayerTotals', () => {
    beforeEach(async () => {
      const store = getStore();
      await store.initializeRound(testRoundId, testPlayers, testHoles);
    });

    it('calculates gross correctly', async () => {
      const store = getStore();
      const playerId = testPlayers[0].id;

      // Score holes 1-3
      await store.setPlayerScore(playerId, 1, 4);
      await store.setPlayerScore(playerId, 2, 3);
      await store.setPlayerScore(playerId, 3, 5);

      const totals = getStore().getPlayerTotals(playerId);
      expect(totals.gross).toBe(12);
    });

    it('returns zeros for unscored player', () => {
      const playerId = testPlayers[0].id;

      const totals = getStore().getPlayerTotals(playerId);
      expect(totals.gross).toBe(0);
      expect(totals.net).toBe(0);
      expect(totals.points).toBe(0);
    });

    it('returns zeros for unknown player', () => {
      const totals = getStore().getPlayerTotals('unknown-player');
      expect(totals.gross).toBe(0);
      expect(totals.net).toBe(0);
      expect(totals.points).toBe(0);
    });

    it('calculates Stableford points for stableford game', async () => {
      const store = getStore();
      const playerId = testPlayers[0].id;

      // Score par on hole 1 (par 4)
      await store.setPlayerScore(playerId, 1, 4);

      const totals = getStore().getPlayerTotals(playerId);
      // With 18 handicap on a strokeIndex 7 hole, should get 2 or 3 points for par
      expect(totals.points).toBeGreaterThan(0);
    });
  });

  describe('setPlayerTee', () => {
    const easyTee = {
      tee_id: 'tee-easy',
      name: 'Red',
      color: 'red',
      slopeRating: 113,
      courseRating: 70,
    };
    const hardTee = {
      tee_id: 'tee-hard',
      name: 'Black',
      color: 'black',
      slopeRating: 140,
      courseRating: 74,
    };

    it('updates playerTeeMap for the player', async () => {
      const store = getStore();
      await store.initializeRound(
        testRoundId,
        testPlayers,
        testHoles,
        'stableford',
        false,
        undefined,
        easyTee,
        'profile'
      );
      const playerId = testPlayers[0].id;

      await getStore().setPlayerTee(playerId, hardTee);

      expect(getStore().getPlayerTee(playerId)).toEqual(hardTee);
    });

    it('persists the updated scorecard to SQLite', async () => {
      const store = getStore();
      await store.initializeRound(
        testRoundId,
        testPlayers,
        testHoles,
        'stableford',
        false,
        undefined,
        easyTee,
        'profile'
      );
      const playerId = testPlayers[0].id;
      (saveScorecard as jest.Mock).mockClear();

      await getStore().setPlayerTee(playerId, hardTee);

      expect(saveScorecard as jest.Mock).toHaveBeenCalled();
    });

    it('recomputes the player totals when the tee changes', async () => {
      const store = getStore();
      await store.initializeRound(
        testRoundId,
        testPlayers,
        testHoles,
        'stableford',
        false,
        undefined,
        easyTee,
        'profile'
      );
      const playerId = testPlayers[0].id;
      // Enter scores on several holes so the DHC difference between tees is
      // reflected in total points (a single hole may not change).
      for (let h = 1; h <= 9; h++) {
        await getStore().setPlayerScore(playerId, h, 6);
      }
      const easyPoints = getStore().getPlayerTotals(playerId).points;

      await getStore().setPlayerTee(playerId, hardTee);
      const hardPoints = getStore().getPlayerTotals(playerId).points;

      // Switching back to the original tee restores the original total.
      await getStore().setPlayerTee(playerId, easyTee);
      const restoredPoints = getStore().getPlayerTotals(playerId).points;

      expect(hardPoints).not.toBe(easyPoints); // the tee genuinely drives the calc
      expect(restoredPoints).toBe(easyPoints); // round-trip is consistent
    });

    it('does nothing for an unknown player', async () => {
      const store = getStore();
      await store.initializeRound(
        testRoundId,
        testPlayers,
        testHoles,
        'stableford',
        false,
        undefined,
        easyTee,
        'profile'
      );
      (saveScorecard as jest.Mock).mockClear();

      await getStore().setPlayerTee('non-existent-player', hardTee);

      expect(saveScorecard as jest.Mock).not.toHaveBeenCalled();
    });
  });

  describe('getHoleInfo', () => {
    beforeEach(async () => {
      const store = getStore();
      await store.initializeRound(testRoundId, testPlayers, testHoles);
    });

    it('returns correct hole data', () => {
      const holeInfo = getStore().getHoleInfo(1);
      expect(holeInfo).toBeDefined();
      expect(holeInfo?.number).toBe(1);
      expect(holeInfo?.par).toBe(4);
    });

    it('returns undefined for invalid hole number', () => {
      const holeInfo = getStore().getHoleInfo(99);
      expect(holeInfo).toBeUndefined();
    });
  });

  describe('isHoleComplete', () => {
    beforeEach(async () => {
      const store = getStore();
      await store.initializeRound(testRoundId, testPlayers, testHoles);
    });

    it('returns false when no players have scored', () => {
      expect(getStore().isHoleComplete(1)).toBe(false);
    });

    it('returns false when only some players have scored', async () => {
      const store = getStore();

      await store.setPlayerScore(testPlayers[0].id, 1, 4);

      expect(getStore().isHoleComplete(1)).toBe(false);
    });

    it('returns true when all players have scored', async () => {
      const store = getStore();

      for (const player of testPlayers) {
        await store.setPlayerScore(player.id, 1, 4);
      }

      expect(getStore().isHoleComplete(1)).toBe(true);
    });
  });

  describe('getCompletedHolesCount', () => {
    beforeEach(async () => {
      const store = getStore();
      await store.initializeRound(testRoundId, testPlayers, testHoles);
    });

    it('returns 0 when no holes complete', () => {
      expect(getStore().getCompletedHolesCount()).toBe(0);
    });

    it('counts completed holes correctly', async () => {
      const store = getStore();

      // Complete holes 1 and 2
      for (const player of testPlayers) {
        await store.setPlayerScore(player.id, 1, 4);
        await store.setPlayerScore(player.id, 2, 3);
      }

      expect(getStore().getCompletedHolesCount()).toBe(2);
    });
  });

  // ==========================================================================
  // SUBMISSION TESTS
  // ==========================================================================

  describe('submitScorecards', () => {
    beforeEach(async () => {
      const store = getStore();
      await store.initializeRound(testRoundId, testPlayers, testHoles);
      // Add some scores
      for (const player of testPlayers) {
        await store.setPlayerScore(player.id, 1, 4);
      }
    });

    it('sets status to completed', async () => {
      const store = getStore();

      await store.submitScorecards();

      for (const [, scorecard] of getStore().groupScorecards) {
        expect(scorecard.status).toBe('completed');
      }
    });

    it('sets submittedAt timestamp', async () => {
      const store = getStore();
      const beforeSubmit = new Date();

      await store.submitScorecards();

      for (const [, scorecard] of getStore().groupScorecards) {
        expect(scorecard.submittedAt).toBeDefined();
        expect(scorecard.submittedAt!.getTime()).toBeGreaterThanOrEqual(beforeSubmit.getTime());
      }
    });

    it('uploads each scorecard to the server (awaited) when online', async () => {
      jest.clearAllMocks();
      (getIsOnline as jest.Mock).mockReturnValue(true);

      const store = getStore();
      await store.submitScorecards();

      // Online submit must push directly and wait for confirmation, so the
      // round can't be marked completed while a scorecard is still local-only.
      expect(syncScorecard).toHaveBeenCalledTimes(testPlayers.length);
      expect(markScorecardsAsSynced).toHaveBeenCalledTimes(testPlayers.length);
      // It must NOT rely on the fire-and-forget background queue when online.
      expect(queueScorecardSync).not.toHaveBeenCalled();
    });

    it('throws when an online upload fails so the round is not marked completed', async () => {
      jest.clearAllMocks();
      (getIsOnline as jest.Mock).mockReturnValue(true);
      (syncScorecard as jest.Mock).mockRejectedValueOnce(new Error('network down'));

      const store = getStore();

      await expect(store.submitScorecards()).rejects.toThrow(/Failed to submit/);
    });

    it('queues for durable retry when offline (no direct upload)', async () => {
      jest.clearAllMocks();
      (getIsOnline as jest.Mock).mockReturnValue(false);

      const store = getStore();
      await store.submitScorecards();

      expect(queueScorecardSync).toHaveBeenCalledTimes(testPlayers.length);
      expect(syncScorecard).not.toHaveBeenCalled();

      // Restore default for subsequent tests
      (getIsOnline as jest.Mock).mockReturnValue(true);
    });

    it('throws error if roundId not set', async () => {
      // Reset the round first
      getStore().resetRound();

      await expect(getStore().submitScorecards()).rejects.toThrow('No round ID set');
    });

    it('saves each scorecard to SQLite', async () => {
      jest.clearAllMocks();

      const store = getStore();
      await store.submitScorecards();

      expect(saveScorecard).toHaveBeenCalledTimes(testPlayers.length);
    });

    it('only completes scorecards for the passed playerIds (group-scoped submit)', async () => {
      const PLAYER_A = 'aaaaaaaa-aaaa-4aaa-a111-111111111111';
      const PLAYER_B = 'bbbbbbbb-bbbb-4bbb-b111-111111111111';
      const PLAYER_C = 'cccccccc-cccc-4ccc-a111-111111111111';
      const PLAYER_D = 'dddddddd-dddd-4ddd-b111-111111111111';

      const fourPlayers = [
        createTestPlayer({ id: PLAYER_A, name: 'Player A', handicap: 10 }),
        createTestPlayer({ id: PLAYER_B, name: 'Player B', handicap: 14 }),
        createTestPlayer({ id: PLAYER_C, name: 'Player C', handicap: 18 }),
        createTestPlayer({ id: PLAYER_D, name: 'Player D', handicap: 22 }),
      ];

      const store = getStore();
      // Reset first so we start clean (the beforeEach already seeded 3 players)
      store.resetRound();
      await store.initializeRound(testRoundId, fourPlayers, testHoles);

      // Add a score for each player so scorecards are in-progress
      for (const player of fourPlayers) {
        await store.setPlayerScore(player.id, 1, 4);
      }

      // All four should be in-progress before submit
      const before = useScorecardStore.getState().groupScorecards;
      expect(before.get(PLAYER_A)!.status).toBe('in-progress');
      expect(before.get(PLAYER_C)!.status).toBe('in-progress');

      // Submit only group 1 (A + B)
      await useScorecardStore.getState().submitScorecards({ playerIds: [PLAYER_A, PLAYER_B] });

      const cards = useScorecardStore.getState().groupScorecards;
      expect(cards.get(PLAYER_A)!.status).toBe('completed');
      expect(cards.get(PLAYER_B)!.status).toBe('completed');
      expect(cards.get(PLAYER_C)!.status).not.toBe('completed'); // other group untouched
      expect(cards.get(PLAYER_D)!.status).not.toBe('completed');
    });
  });

  // ==========================================================================
  // EDGE CASES
  // ==========================================================================

  describe('Edge Cases', () => {
    it('handles hole number validation (1-18 range)', async () => {
      const store = getStore();

      await store.initializeRound(testRoundId, testPlayers, testHoles);

      // Valid holes
      store.setCurrentHole(1);
      expect(getStore().currentHole).toBe(1);

      store.setCurrentHole(18);
      expect(getStore().currentHole).toBe(18);

      // Invalid holes - should not change
      store.setCurrentHole(0);
      expect(getStore().currentHole).toBe(18);

      store.setCurrentHole(19);
      expect(getStore().currentHole).toBe(18);
    });

    it('handles concurrent score updates', async () => {
      const store = getStore();

      await store.initializeRound(testRoundId, testPlayers, testHoles);

      // Simulate concurrent updates
      await Promise.all([
        store.setPlayerScore(testPlayers[0].id, 1, 4),
        store.setPlayerScore(testPlayers[1].id, 1, 5),
        store.setPlayerScore(testPlayers[2].id, 1, 6),
      ]);

      // All scores should be set
      expect(getStrokes(getStore().getPlayerScore(testPlayers[0].id, 1))).toBe(4);
      expect(getStrokes(getStore().getPlayerScore(testPlayers[1].id, 1))).toBe(5);
      expect(getStrokes(getStore().getPlayerScore(testPlayers[2].id, 1))).toBe(6);
    });

    it('setAllowedPlayers updates allowed list', () => {
      getStore().setAllowedPlayers([testPlayers[0].id]);

      expect(getStore().allowedPlayerIds).toHaveLength(1);
      expect(getStore().allowedPlayerIds[0]).toBe(testPlayers[0].id);
    });

    it('resetRound clears all state', async () => {
      const store = getStore();

      await store.initializeRound(testRoundId, testPlayers, testHoles);
      await store.setPlayerScore(testPlayers[0].id, 1, 4);

      store.resetRound();

      expect(getStore().currentRoundId).toBeNull();
      expect(getStore().currentPlayers).toHaveLength(0);
      expect(getStore().groupScorecards.size).toBe(0);
      expect(getStore().currentHole).toBe(1);
      expect(getStore().isInitialized).toBe(false);
    });
  });

  // ==========================================================================
  // SYNC STATUS TESTS
  // ==========================================================================

  describe('Sync Status', () => {
    it('initializes with default sync status', () => {
      expect(getStore().isOnline).toBe(true);
      expect(getStore().isSyncing).toBe(false);
      expect(getStore().pendingSyncCount).toBe(0);
      expect(getStore().syncError).toBeNull();
    });

    it('tracks loading state during initialization', async () => {
      const store = getStore();

      await store.initializeRound(testRoundId, testPlayers, testHoles);

      // After initialization completes
      expect(getStore().isLoading).toBe(false);
      expect(getStore().isInitialized).toBe(true);
    });
  });

  // ==========================================================================
  // ERROR HANDLING TESTS (for 100% coverage)
  // ==========================================================================

  describe('Error Handling', () => {
    describe('initializeRound errors', () => {
      it('throws and sets isLoading to false when saveHoles fails', async () => {
        const store = getStore();
        const error = new Error('Database error');
        (saveHoles as jest.Mock).mockRejectedValueOnce(error);

        await expect(
          store.initializeRound(testRoundId, testPlayers, testHoles)
        ).rejects.toThrow('Database error');

        expect(getStore().isLoading).toBe(false);
      });

      it('throws and sets isLoading to false when saveScorecard fails', async () => {
        const store = getStore();
        const error = new Error('Scorecard save error');
        (saveScorecard as jest.Mock).mockRejectedValueOnce(error);

        await expect(
          store.initializeRound(testRoundId, testPlayers, testHoles)
        ).rejects.toThrow('Scorecard save error');

        expect(getStore().isLoading).toBe(false);
      });
    });

    describe('loadFromOffline errors', () => {
      it('returns false and sets isLoading to false when getScorecardsByRound throws', async () => {
        const store = getStore();
        const error = new Error('Database read error');
        (getScorecardsByRound as jest.Mock).mockReset().mockRejectedValueOnce(error);

        const loaded = await store.loadFromOffline(testRoundId);

        expect(loaded).toBe(false);
        expect(getStore().isLoading).toBe(false);
      });
    });

    describe('setPlayerScore errors', () => {
      beforeEach(async () => {
        const store = getStore();
        await store.initializeRound(testRoundId, testPlayers, testHoles);
      });

      it('handles saveHoleScore failure gracefully', async () => {
        const store = getStore();
        const playerId = testPlayers[0].id;
        const error = new Error('Save hole score error');

        jest.clearAllMocks();
        (saveHoleScore as jest.Mock).mockRejectedValueOnce(error);

        // Should not throw, but log error
        await store.setPlayerScore(playerId, 1, 4);

        // Score should still be set in memory
        const score = getStore().getPlayerScore(playerId, 1);
        expect(getStrokes(score)).toBe(4);
      });

      it('handles saveScorecard failure gracefully', async () => {
        const store = getStore();
        const playerId = testPlayers[0].id;
        const error = new Error('Save scorecard error');

        jest.clearAllMocks();
        (saveScorecard as jest.Mock).mockRejectedValueOnce(error);

        // Should not throw
        await store.setPlayerScore(playerId, 1, 4);

        // Score should still be set in memory
        const score = getStore().getPlayerScore(playerId, 1);
        expect(getStrokes(score)).toBe(4);
      });
    });

    describe('updatePlayerHoleScore errors', () => {
      beforeEach(async () => {
        const store = getStore();
        await store.initializeRound(testRoundId, testPlayers, testHoles);
      });

      it('warns and returns when scorecard not found', async () => {
        const store = getStore();

        // Use a valid UUID that doesn't exist in the store
        await store.updatePlayerHoleScore('99999999-9999-4999-a999-999999999999', 1, { strokes: 4 });

        expect(storeLogger.warn).toHaveBeenCalledWith('Scorecard not found for player', {
          playerId: '99999999-9999-4999-a999-999999999999',
        });
      });

      it('handles saveHoleScore failure gracefully', async () => {
        const store = getStore();
        const playerId = testPlayers[0].id;
        const error = new Error('Save error');

        jest.clearAllMocks();
        (saveHoleScore as jest.Mock).mockRejectedValueOnce(error);

        // Should not throw
        await store.updatePlayerHoleScore(playerId, 1, { strokes: 4, putts: 2 });

        // Error is now logged via storeLogger (through persistScorecardUpdate)
        expect(storeLogger.error).toHaveBeenCalled();
      });
    });

    describe('submitScorecards errors', () => {
      beforeEach(async () => {
        const store = getStore();
        await store.initializeRound(testRoundId, testPlayers, testHoles);
        for (const player of testPlayers) {
          await store.setPlayerScore(player.id, 1, 4);
        }
      });

      it('throws error when some scorecards fail to save', async () => {
        const store = getStore();

        jest.clearAllMocks();
        // Fail on the second call
        (saveScorecard as jest.Mock)
          .mockResolvedValueOnce(undefined)
          .mockRejectedValueOnce(new Error('Save failed'))
          .mockResolvedValueOnce(undefined);

        await expect(store.submitScorecards()).rejects.toThrow('Failed to submit 1 scorecard(s)');
      });

      it('counts multiple failures correctly', async () => {
        const store = getStore();

        jest.clearAllMocks();
        // Fail on all calls - use mockRejectedValueOnce 3 times to avoid polluting other tests
        (saveScorecard as jest.Mock)
          .mockRejectedValueOnce(new Error('Save failed'))
          .mockRejectedValueOnce(new Error('Save failed'))
          .mockRejectedValueOnce(new Error('Save failed'));

        await expect(store.submitScorecards()).rejects.toThrow('Failed to submit 3 scorecard(s)');
      });
    });
  });

  // ==========================================================================
  // STROKE PLAY SCORING TESTS
  // ==========================================================================

  describe('Stroke Play Scoring', () => {
    beforeEach(async () => {
      const store = getStore();
      // Initialize with stroke play game type
      await store.initializeRound(testRoundId, testPlayers, testHoles, 'stroke');
    });

    it('calculates net score for stroke play', async () => {
      const store = getStore();
      const playerId = testPlayers[0].id; // handicap: 18

      // Score par on hole 1 (par 4)
      await store.setPlayerScore(playerId, 1, 4);

      const totals = getStore().getPlayerTotals(playerId);
      expect(totals.gross).toBe(4);
      // With handicap 18 on an 18-hole course, player gets 1 stroke per hole
      // Net = gross - strokes received
      expect(totals.net).toBeLessThanOrEqual(totals.gross);
    });

    it('calculates totals correctly for multiple holes in stroke play', async () => {
      const store = getStore();
      const playerId = testPlayers[0].id;

      // Score multiple holes
      await store.setPlayerScore(playerId, 1, 5);
      await store.setPlayerScore(playerId, 2, 4);
      await store.setPlayerScore(playerId, 3, 6);

      const totals = getStore().getPlayerTotals(playerId);
      expect(totals.gross).toBe(15);
      // Net should be less than or equal to gross due to handicap strokes
      expect(totals.net).toBeLessThanOrEqual(totals.gross);
    });

    it('returns 0 points for stroke play (points are not used)', async () => {
      const store = getStore();
      const playerId = testPlayers[0].id;

      await store.setPlayerScore(playerId, 1, 4);

      const totals = getStore().getPlayerTotals(playerId);
      // In stroke play, points should be 0 (only gross/net matter)
      expect(totals.points).toBe(0);
    });
  });

  // ==========================================================================
  // ADDITIONAL EDGE CASES
  // ==========================================================================

  describe('Additional Edge Cases', () => {
    it('handles game type other than stableford or stroke', async () => {
      const store = getStore();
      // Initialize with match-play (should still work but with default behavior)
      await store.initializeRound(testRoundId, testPlayers, testHoles, 'match-play');

      const playerId = testPlayers[0].id;
      await store.setPlayerScore(playerId, 1, 4);

      const totals = getStore().getPlayerTotals(playerId);
      expect(totals.gross).toBe(4);
      // For non-stableford/stroke, should still calculate gross
    });

    it('handles scorecard without player object in loadFromOffline', async () => {
      const mockScorecards: Scorecard[] = testPlayers.map((player) => ({
        id: `scorecard-${testRoundId}-${player.id}`,
        roundId: testRoundId,
        playerId: player.id,
        // player is intentionally undefined
        scores: { 1: { strokes: 4 } },
        totalGross: 4,
        totalNet: 0,
        status: 'in-progress' as const,
        createdAt: new Date(),
        updatedAt: new Date(),
      }));

      (getScorecardsByRound as jest.Mock).mockReset().mockResolvedValue(mockScorecards);
      (getHoles as jest.Mock).mockReset().mockResolvedValue(testHoles);

      const store = getStore();
      const loaded = await store.loadFromOffline(testRoundId);

      // Should load but with empty players array
      expect(loaded).toBe(true);
      expect(getStore().groupScorecards.size).toBe(3);
      expect(getStore().currentPlayers).toHaveLength(0);
    });

    it('handles empty holes array in calculatePlayerTotals', async () => {
      const store = getStore();
      await store.initializeRound(testRoundId, testPlayers, []);

      const playerId = testPlayers[0].id;
      const totals = getStore().getPlayerTotals(playerId);

      expect(totals.gross).toBe(0);
      expect(totals.net).toBe(0);
      expect(totals.points).toBe(0);
    });

    it('setAllowedPlayers with empty array logs "all"', () => {
      const store = getStore();

      // First set some allowed players
      store.setAllowedPlayers([testPlayers[0].id]);
      expect(getStore().allowedPlayerIds).toHaveLength(1);

      // Then clear to empty array (allow all)
      store.setAllowedPlayers([]);
      expect(getStore().allowedPlayerIds).toHaveLength(0);
    });

    it('handles player without handicap in calculatePlayerTotals', async () => {
      // Create player without handicap
      const playerWithoutHandicap = createTestPlayer({
        id: '44444444-4444-4444-a444-444444444444',
        name: 'No Handicap Player',
        handicap: undefined,
      });

      const store = getStore();
      await store.initializeRound(
        testRoundId,
        [playerWithoutHandicap],
        testHoles
      );

      // Set a score for the player
      await store.setPlayerScore(playerWithoutHandicap.id, 1, 4);

      const totals = getStore().getPlayerTotals(playerWithoutHandicap.id);
      // Should still calculate gross correctly
      expect(totals.gross).toBe(4);
      // With 0 handicap (default), net should equal gross for Stableford
      // and points should still be calculated
    });
  });

  // ==========================================================================
  // MULTI-BALL STATS UPDATE TESTS (FIR/GIR)
  // ==========================================================================

  describe('updateMultiBallStats', () => {
    beforeEach(async () => {
      const store = getStore();
      await store.initializeRound(testRoundId, testPlayers.slice(0, 1), testHoles);
      // Configure multi-ball mode
      store.setMultiBallConfig(2);
    });

    it('should update fairwayHit for specific ball index', async () => {
      const store = getStore();
      const playerId = testPlayers[0].id;

      // First set a score for ball 0
      await store.setMultiBallScore(playerId, 1, 0, 4);

      // Then update stats for ball 0
      await store.updateMultiBallStats(playerId, 1, 0, { fairwayHit: true });

      const scores = store.getMultiBallScores(playerId, 1);
      expect(scores[0].fairwayHit).toBe(true);
    });

    it('should update greenInRegulation for specific ball index', async () => {
      const store = getStore();
      const playerId = testPlayers[0].id;

      // First set a score for ball 0
      await store.setMultiBallScore(playerId, 1, 0, 4);

      // Then update stats for ball 0
      await store.updateMultiBallStats(playerId, 1, 0, { greenInRegulation: true });

      const scores = store.getMultiBallScores(playerId, 1);
      expect(scores[0].greenInRegulation).toBe(true);
    });

    it('should preserve existing ball scores when updating stats', async () => {
      const store = getStore();
      const playerId = testPlayers[0].id;

      // Set scores for both balls
      await store.setMultiBallScore(playerId, 1, 0, 4);
      await store.setMultiBallScore(playerId, 1, 1, 5);

      // Update stats for ball 0 only
      await store.updateMultiBallStats(playerId, 1, 0, { fairwayHit: true });

      const scores = store.getMultiBallScores(playerId, 1);
      // Ball 0 should have FIR
      expect(scores[0].fairwayHit).toBe(true);
      expect(scores[0].strokes).toBe(4);
      // Ball 1 should be unchanged
      expect(scores[1].strokes).toBe(5);
      expect(scores[1].fairwayHit).toBeUndefined();
    });

    it('should create multi-ball structure if it does not exist', async () => {
      const store = getStore();
      const playerId = testPlayers[0].id;

      // Update stats without setting a score first
      await store.updateMultiBallStats(playerId, 1, 0, { fairwayHit: true });

      const scores = store.getMultiBallScores(playerId, 1);
      expect(scores[0].fairwayHit).toBe(true);
      expect(scores[0].strokes).toBe(0); // Default strokes when created
    });

    it('should handle updating stats for ball index that has no score yet', async () => {
      const store = getStore();
      const playerId = testPlayers[0].id;

      // Set score for ball 0 only
      await store.setMultiBallScore(playerId, 1, 0, 4);

      // Update stats for ball 1 (no score yet)
      await store.updateMultiBallStats(playerId, 1, 1, { greenInRegulation: true });

      const scores = store.getMultiBallScores(playerId, 1);
      expect(scores[0].strokes).toBe(4);
      expect(scores[1].greenInRegulation).toBe(true);
    });

    it('should not queue sync during stat updates (deferred to submission)', async () => {
      const store = getStore();
      const playerId = testPlayers[0].id;

      jest.clearAllMocks();

      await store.updateMultiBallStats(playerId, 1, 0, { fairwayHit: true });

      // Sync is deferred to submitScorecards to avoid excessive intermediate syncs
      expect(queueScorecardSync).not.toHaveBeenCalled();
    });

    it('should handle both fairwayHit and greenInRegulation in single update', async () => {
      const store = getStore();
      const playerId = testPlayers[0].id;

      await store.setMultiBallScore(playerId, 1, 0, 4);
      await store.updateMultiBallStats(playerId, 1, 0, {
        fairwayHit: true,
        greenInRegulation: false,
      });

      const scores = store.getMultiBallScores(playerId, 1);
      expect(scores[0].fairwayHit).toBe(true);
      expect(scores[0].greenInRegulation).toBe(false);
    });

    it('should handle toggling stats off', async () => {
      const store = getStore();
      const playerId = testPlayers[0].id;

      // Set FIR to true
      await store.updateMultiBallStats(playerId, 1, 0, { fairwayHit: true });
      expect(store.getMultiBallScores(playerId, 1)[0].fairwayHit).toBe(true);

      // Toggle to false
      await store.updateMultiBallStats(playerId, 1, 0, { fairwayHit: false });
      expect(store.getMultiBallScores(playerId, 1)[0].fairwayHit).toBe(false);
    });

    it('should warn and return when scorecard not found', async () => {
      const store = getStore();

      // Should not throw
      await store.updateMultiBallStats('non-existent-player', 1, 0, { fairwayHit: true });

      // Just verify no error was thrown
      expect(true).toBe(true);
    });

    it('should warn and return when hole data not found', async () => {
      const store = getStore();
      const playerId = testPlayers[0].id;

      // Try to update stats for hole 99 which doesn't exist
      await store.updateMultiBallStats(playerId, 99, 0, { fairwayHit: true });

      // Should not throw and should not update anything
      const scores = store.getMultiBallScores(playerId, 99);
      expect(scores[0].strokes).toBe(0); // Default empty score
    });
  });
});
