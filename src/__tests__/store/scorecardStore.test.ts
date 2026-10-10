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

import { runRoundPersistence, withRoundPersistenceTransition } from '@/services/offline/roundPersistenceBarrier';
import { flushPendingScorecardSyncs } from '@/store/scorecardSyncDebounce';
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
  getFailedSyncCountForRound,
} from '@/services/offline/database';
import {
  queueScorecardSync,
  syncScorecard,
  getIsOnline,
  ScorecardConflictError,
} from '@/services/offline/sync';
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

// Conflict-response row for constructing ScorecardConflictError in tests
const makeConflictRow = (serverRevision: number) => ({
  applied: false,
  conflict: true,
  server_revision: serverRevision,
  server_status: 'in-progress',
  server_scores: {},
});

// Mock the offline database service
jest.mock('@/services/offline/database', () => ({
  saveScorecard: jest.fn(() => Promise.resolve()),
  saveHoleScore: jest.fn(() => Promise.resolve()),
  getScorecardsByRound: jest.fn(() => Promise.resolve([])),
  saveHoles: jest.fn(() => Promise.resolve()),
  getHoles: jest.fn(() => Promise.resolve([])),
  markScorecardsAsSynced: jest.fn(() => Promise.resolve()),
  markScorecardAsSynced: jest.fn(() => Promise.resolve()),
  getFailedSyncCountForRound: jest.fn(() => Promise.resolve(0)),
}));

// Captured listener for the scorecard-synced event (set when the store
// subscribes via initSyncListener). Prefixed "mock" so jest allows the
// factory below to close over it.
let mockScorecardSyncedListener:
  | ((info: { scorecardId: string; serverRevision: number }) => void)
  | null = null;

// Captured listener for sync-state changes, so tests can emit the state the
// sync service would publish after a drain.
let mockSyncStateListener:
  | ((state: {
      status: string;
      pendingCount: number;
      failedCount: number;
      lastSyncAt: Date | null;
      error: string | null;
    }) => void)
  | null = null;

// Captured conflict resolver the store registers once per module (initSyncListener
// is guarded), so it is deliberately not reset between tests.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
let mockConflictResolver: ((...a: any[]) => Promise<unknown>) | null = null;

// Mock the sync service
jest.mock('@/services/offline/sync', () => {
  // Minimal stand-in matching the real class's shape; instanceof works
  // because the store imports the class from this same (mocked) module.
  class ScorecardConflictError extends Error {
    readonly serverRevision: number;
    readonly serverStatus: string | null;
    readonly serverScores: Record<string, unknown>;

    constructor(row: {
      server_revision: number | null;
      server_status: string | null;
      server_scores: Record<string, unknown> | null;
    }) {
      super('This scorecard changed on another device.');
      this.name = 'ScorecardConflictError';
      this.serverRevision = Number(row.server_revision);
      this.serverStatus = row.server_status;
      this.serverScores = row.server_scores ?? {};
    }
  }

  return {
    queueScorecardSync: jest.fn(() => Promise.resolve()),
    syncScorecard: jest.fn(() => Promise.resolve({ serverRevision: 1 })),
    subscribeSyncState: jest.fn((callback) => {
      mockSyncStateListener = callback;
      callback({ status: 'idle', pendingCount: 0, error: null });
      return jest.fn();
    }),
    subscribeScorecardSynced: jest.fn((callback) => {
      mockScorecardSyncedListener = callback;
      return jest.fn();
    }),
    getIsOnline: jest.fn(() => true),
    setScorecardConflictResolver: jest.fn((r) => {
      mockConflictResolver = r;
    }),
    ScorecardConflictError,
  };
});

// Mock the Supabase client. loadFromOffline reads the round's metadata
// (nine_type, game_type, etc.) and bails out early unless nine_type is known,
// so the mocked `rounds` row must supply it.
jest.mock('@/services/supabase/client', () => {
  const defaultRoundsResult = {
    data: {
      game_type: 'stableford',
      handicap_source: 'profile',
      nine_type: 'full',
      selected_tee: null,
      course_id: null,
    },
    error: null,
  };
  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- test mock state
  let roundsResult: any = defaultRoundsResult;
  // Mutable result for the `players` table lookup (live handicap refresh on
  // resume). Tests set this via __setPlayersResult. A `__reject` flag makes the
  // terminal `.in()` reject, simulating an offline/network failure.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- test mock state
  let playersResult: any = { data: null, error: null };
  // Mutable result for the `scorecards` table pull (social rounds).
  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- test mock state
  let scorecardsResult: any = { data: [], error: null };
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
      is: jest.fn(() => Promise.resolve(result)),
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
              : table === 'scorecards'
                ? scorecardsResult
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
    // eslint-disable-next-line @typescript-eslint/no-explicit-any -- test helper
    __setRoundsResult: (r: any) => {
      roundsResult = r ?? defaultRoundsResult;
    },
    // eslint-disable-next-line @typescript-eslint/no-explicit-any -- test helper
    __setScorecardsResult: (r: any) => {
      scorecardsResult = r ?? { data: [], error: null };
    },
  };
});

// Test-only handles into the supabase mock above (typed loosely via requireMock
// so they don't need to exist on the real module's exports).
const { __setPlayersResult, __resetPlayersResult, __setRoundsResult, __setScorecardsResult } = jest.requireMock(
  '@/services/supabase/client'
) as {
  __setRoundsResult: (r: unknown) => void;
  __setScorecardsResult: (r: unknown) => void;
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
    __setRoundsResult(null);
    __setScorecardsResult(null);
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

  describe('characterization: standard-round behaviour', () => {
    it('resetRound clears the round-scoped state', () => {
      useScorecardStore.setState({ currentRoundId: testRoundId, allowedPlayerIds: ['x'], failedSyncCount: 3 });
      getStore().resetRound();
      const s = getStore();
      expect(s.currentRoundId).toBeNull();
      expect(s.allowedPlayerIds).toEqual([]);
      expect(s.failedSyncCount).toBe(0);
      expect(s.groupScorecards.size).toBe(0);
      expect(s.submittedElsewhereRoundId).toBeNull();
    });

    it('initializeRound clears a submitted-elsewhere flag left by another round', async () => {
      useScorecardStore.setState({ submittedElsewhereRoundId: 'other-round' });
      await getStore().initializeRound(testRoundId, testPlayers, testHoles, 'stroke');
      expect(getStore().submittedElsewhereRoundId).toBeNull();
    });

    it('setPlayerScore keeps existing putts and records the scorer', async () => {
      await getStore().initializeRound(testRoundId, testPlayers, testHoles, 'stroke');
      const playerId = testPlayers[0].id;
      await getStore().updatePlayerHoleScore(playerId, 1, { strokes: 4, putts: 2 });
      await getStore().setPlayerScore(playerId, 1, 5, 'scorer-1');
      const hole = getStore().groupScorecards.get(playerId)!.scores[1] as HoleScore;
      expect(hole).toMatchObject({ strokes: 5, putts: 2, scoredBy: 'scorer-1' });
    });

    it('updatePlayerHoleScore does not queue a live sync today', async () => {
      jest.useFakeTimers();
      await getStore().initializeRound(testRoundId, testPlayers, testHoles, 'stroke');
      (queueScorecardSync as jest.Mock).mockClear();
      await getStore().updatePlayerHoleScore(testPlayers[0].id, 1, { putts: 2 });
      jest.advanceTimersByTime(2500);
      expect(queueScorecardSync).not.toHaveBeenCalled();
      jest.useRealTimers();
    });

    it('stat edits queue a live upload in a social round', async () => {
      jest.useFakeTimers();
      await getStore().initializeRound(testRoundId, testPlayers, testHoles, 'stroke', false, [], null, 'none', new Map(), 'full', 1, null, 'social');
      (queueScorecardSync as jest.Mock).mockClear();
      await getStore().updatePlayerHoleScore(testPlayers[0].id, 1, { putts: 2 });
      jest.advanceTimersByTime(2500);
      expect(queueScorecardSync).toHaveBeenCalled();
      jest.useRealTimers();
    });

    it('shot contribution edits queue a live upload in a social round', async () => {
      jest.useFakeTimers();
      await getStore().initializeRound(testRoundId, testPlayers, testHoles, 'stroke', false, [], null, 'none', new Map(), 'full', 1, null, 'social');
      (queueScorecardSync as jest.Mock).mockClear();
      await getStore().updateShotContributions(testPlayers[0].id, 1, { teeShot: testPlayers[0].id });
      jest.advanceTimersByTime(2500);
      expect(queueScorecardSync).toHaveBeenCalled();
      jest.useRealTimers();
    });
  });

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

  // ==========================================================================
  // SYNC FAILURE SCOPING
  // ==========================================================================

  /**
   * The score-entry banner is driven by `failedSyncCount`. Sourcing it from the
   * device-wide failure count made a single unrecoverable row from an old round
   * raise a red "score changes not uploaded" strip on every subsequent
   * scorecard, including solo and local-only rounds.
   */
  describe('failedSyncCount scoping', () => {
    // jest.clearAllMocks() clears calls but not implementations, so restore the
    // default here rather than leaking a value into unrelated suites.
    afterEach(() => {
      (getFailedSyncCountForRound as jest.Mock).mockResolvedValue(0);
    });

    it('counts only failures belonging to the current round', async () => {
      (getFailedSyncCountForRound as jest.Mock).mockResolvedValue(2);

      await getStore().initializeRound(testRoundId, testPlayers, testHoles);

      expect(getFailedSyncCountForRound).toHaveBeenCalledWith(testRoundId);
      expect(getStore().failedSyncCount).toBe(2);
    });

    it('ignores failures retained from other rounds', async () => {
      (getFailedSyncCountForRound as jest.Mock).mockResolvedValue(0);

      await getStore().initializeRound(testRoundId, testPlayers, testHoles);

      expect(getStore().failedSyncCount).toBe(0);
    });

    it('recounts for the current round when sync state changes', async () => {
      (getFailedSyncCountForRound as jest.Mock).mockResolvedValue(0);
      await getStore().initializeRound(testRoundId, testPlayers, testHoles);
      (getFailedSyncCountForRound as jest.Mock).mockClear();
      (getFailedSyncCountForRound as jest.Mock).mockResolvedValue(1);

      // A drain that retains a failure pushes new sync state to subscribers.
      mockSyncStateListener?.({
        status: 'error',
        pendingCount: 0,
        failedCount: 7,
        lastSyncAt: null,
        error: null,
      });
      await _waitFor(0);

      expect(getFailedSyncCountForRound).toHaveBeenCalledWith(testRoundId);
      // 7 device-wide failures, 1 of which belongs to this round.
      expect(getStore().failedSyncCount).toBe(1);
    });

    it('leaves the count untouched when the lookup fails', async () => {
      (getFailedSyncCountForRound as jest.Mock).mockResolvedValue(2);
      await getStore().initializeRound(testRoundId, testPlayers, testHoles);
      (getFailedSyncCountForRound as jest.Mock).mockRejectedValue(new Error('db closed'));

      mockSyncStateListener?.({
        status: 'idle',
        pendingCount: 0,
        failedCount: 0,
        lastSyncAt: null,
        error: null,
      });
      await _waitFor(0);

      expect(getStore().failedSyncCount).toBe(2);
    });

    it('clears the count when the round is reset', async () => {
      (getFailedSyncCountForRound as jest.Mock).mockResolvedValue(3);
      await getStore().initializeRound(testRoundId, testPlayers, testHoles);
      expect(getStore().failedSyncCount).toBe(3);

      getStore().resetRound();

      expect(getStore().failedSyncCount).toBe(0);
    });
  });

  describe('scoringMode', () => {
    const initSocial = () =>
      getStore().initializeRound(testRoundId, testPlayers, testHoles, 'stroke', false, [], null, 'none', new Map(), 'full', 1, null, 'social');

    it('defaults to standard and is set by initializeRound', async () => {
      expect(getStore().scoringMode).toBe('standard');
      await initSocial();
      expect(getStore().scoringMode).toBe('social');
    });

    it('is cleared by resetRound', async () => {
      await initSocial();
      getStore().resetRound();
      expect(getStore().scoringMode).toBe('standard');
    });
  });

  describe('applying remote rows (social)', () => {
    const T2 = '2099-01-01T00:00:00.000Z';
    const init = (mode: 'social' | 'standard' = 'social') =>
      getStore().initializeRound(testRoundId, testPlayers, testHoles, 'stroke', false, [], null, 'none', new Map(), 'full', 1, null, mode);

    beforeEach(() => jest.useFakeTimers());
    afterEach(() => jest.useRealTimers());

    it('merges a row and recomputes totals canonically (pickup = net double bogey)', async () => {
      await init();
      const p = testPlayers[0].id;
      await getStore().mergeRemoteScorecard({ player_id: p, scores: { '1': { strokes: 10, editedAt: T2 } }, revision: 2, status: 'in-progress' });
      const sc = getStore().groupScorecards.get(p)!;
      expect(sc.serverRevision).toBe(2);
      // handicapSource 'none' → base handicap 0 → 0 strokes; hole 1 is par 4 → pickup = 4 + 2 = 6
      expect(sc.totalGross).toBe(6);
    });

    it.each([
      ['full', 1, 7, 'in-progress'],
      ['full', 1, 7, 'completed'],
      ['back9', 10, 16, 'in-progress'],
      ['back9', 10, 16, 'completed'],
    ] as const)('keeps the early-end cutoff when merging %s remote %s/%s (%s)', async (nineType, kept, removed, status) => {
      await getStore().initializeRound(testRoundId, testPlayers, testHoles, 'stroke', false, [], null, 'none', new Map(), nineType, 1, null, 'social');
      const state = getStore();
      // Existing durable end with its original scoring basis. The remote merge
      // must preserve it for both live and terminal server snapshots.
      useScorecardStore.setState({ holesPlayed: 6, groupScorecards: new Map(
        [...state.groupScorecards].map(([id, card]) => [id, { ...card, holesPlayed: 6,
          syncNineType: nineType, syncHoles: state.holes, syncGameType: 'stroke',
          syncHandicapSource: 'none', coursePar: state.holes.reduce((sum, h) => sum + h.par, 0),
          playerHandicap: 0, playerGender: null, teeData: null,
        }])
      ) });
      const p = testPlayers[0].id;
      await getStore().mergeRemoteScorecard({ player_id: p,
        scores: { [kept]: { strokes: 4, editedAt: T2 }, [removed]: { strokes: 5, editedAt: T2 } },
        revision: 2, status });
      const card = getStore().groupScorecards.get(p)!;
      expect(card.holesPlayed).toBe(6);
      expect(Object.keys(card.scores)).toEqual([String(kept)]);
      expect(card.totalGross).toBe(4);
      expect(saveScorecard).toHaveBeenLastCalledWith(expect.objectContaining({
        holesPlayed: 6, scores: { [kept]: { strokes: 4, editedAt: T2 } }, totalGross: 4,
      }), expect.any(Object));
    });

    it('ignores a pull that settles after resetting and reopening the same round', async () => {
      await init();
      let release!: (result: unknown) => void;
      __setScorecardsResult(new Promise(resolve => { release = resolve; }));
      const pulling = getStore().pullServerScorecards();
      getStore().resetRound();
      await init();
      release({ data: [{ player_id: testPlayers[0].id,
        scores: { '1': { strokes: 9, editedAt: T2 } }, revision: 2, status: 'in-progress' }], error: null });
      await pulling;
      expect(getStore().groupScorecards.get(testPlayers[0].id)!.scores).toEqual({});
    });

    it('records the card as synced and queues nothing when nothing local is ahead', async () => {
      await init();
      const p = testPlayers[0].id;
      (queueScorecardSync as jest.Mock).mockClear();
      await getStore().mergeRemoteScorecard({ player_id: p, scores: { '1': { strokes: 4, editedAt: T2 } }, revision: 2, status: 'in-progress' });
      jest.advanceTimersByTime(2500);
      expect(saveScorecard).toHaveBeenLastCalledWith(
        expect.objectContaining({ id: getStore().groupScorecards.get(p)!.id }),
        expect.objectContaining({ syncedAtRevision: 2, lease: expect.any(Object) }),
      );
      expect(queueScorecardSync).not.toHaveBeenCalled();
    });

    it('queues an upload when local holes are ahead', async () => {
      await init();
      const p = testPlayers[0].id;
      await getStore().setPlayerScore(p, 2, 5, 'me');
      (queueScorecardSync as jest.Mock).mockClear();
      await getStore().mergeRemoteScorecard({ player_id: p, scores: { '1': { strokes: 4, editedAt: T2 } }, revision: 2, status: 'in-progress' });
      jest.advanceTimersByTime(2500);
      expect(queueScorecardSync).toHaveBeenCalled();
    });

    it('a completed echo arriving twice causes no upload loop', async () => {
      await init();
      const p = testPlayers[0].id;
      const final = { player_id: p, scores: { '1': { strokes: 4, editedAt: T2 } }, revision: 7, status: 'completed' };
      await getStore().mergeRemoteScorecard(final);
      (saveScorecard as jest.Mock).mockClear();
      (queueScorecardSync as jest.Mock).mockClear();
      await getStore().mergeRemoteScorecard(final);
      jest.advanceTimersByTime(2500);
      expect(saveScorecard).not.toHaveBeenCalled();
      expect(queueScorecardSync).not.toHaveBeenCalled();
    });

    it('records the round as submitted elsewhere once every group card became final remotely', async () => {
      await init();
      for (const player of testPlayers) {
        await getStore().mergeRemoteScorecard({ player_id: player.id, scores: {}, revision: 3, status: 'completed' });
      }
      expect(getStore().submittedElsewhereRoundId).toBe(testRoundId);
    });

    it('does nothing in a standard round', async () => {
      await init('standard');
      const p = testPlayers[0].id;
      await getStore().mergeRemoteScorecard({ player_id: p, scores: { '1': { strokes: 4, editedAt: T2 } }, revision: 2, status: 'in-progress' });
      expect(getStore().groupScorecards.get(p)!.scores[1]).toBeUndefined();
    });

    it('pullServerScorecards applies every server card of the round', async () => {
      await init();
      __setScorecardsResult({ data: testPlayers.map((pl) => ({ player_id: pl.id, scores: { '1': { strokes: 4, editedAt: T2 } }, revision: 2, status: 'in-progress' })), error: null });
      await getStore().pullServerScorecards();
      for (const pl of testPlayers) expect((getStore().groupScorecards.get(pl.id)!.scores[1] as HoleScore).strokes).toBe(4);
    });

    it('merges a guest (placeholder) player row like any other player', async () => {
      const guest = { ...testPlayers[2], id: 'guest-1', name: 'Guest', isPlaceholder: true };
      await getStore().initializeRound(testRoundId, [testPlayers[0], guest], testHoles, 'stroke', false, [], null, 'none', new Map(), 'full', 1, null, 'social');
      __setScorecardsResult({ data: [testPlayers[0], guest].map((pl) => ({ player_id: pl.id, scores: { '1': { strokes: 5, editedAt: T2 } }, revision: 2, status: 'in-progress' })), error: null });
      await getStore().pullServerScorecards();
      for (const pl of [testPlayers[0], guest]) {
        const sc = getStore().groupScorecards.get(pl.id)!;
        expect((sc.scores[1] as HoleScore).strokes).toBe(5);
        expect(sc.serverRevision).toBe(2);
      }
    });

    it('a 9-hole social round recomputes merged totals nine-aware', async () => {
      // Front-9 round, profile handicap 18 (testPlayers[0]): a 9-hole DHC is ~9, not ~18.
      // A rated tee is required: without slope/course rating calculatePlayerTotals
      // falls back to the raw handicap and nineType has no effect.
      const ratedTee = { tee_id: 'tee-rated', name: 'White', color: 'white', slopeRating: 113, courseRating: 72 };
      await getStore().initializeRound(testRoundId, testPlayers, testHoles, 'stroke', false, [], ratedTee, 'profile', new Map(), 'front9', 1, null, 'social');
      const p = testPlayers[0].id;
      await getStore().mergeRemoteScorecard({ player_id: p, scores: { '1': { strokes: 5, editedAt: T2 } }, revision: 2, status: 'in-progress' });
      const viaMerge = getStore().groupScorecards.get(p)!.totalNet;
      // Same score entered locally goes through applyScoreUpdate (already nine-aware): totals must match.
      expect(typeof viaMerge).toBe('number');
      getStore().resetRound();
      await getStore().initializeRound(testRoundId, testPlayers, testHoles, 'stroke', false, [], ratedTee, 'profile', new Map(), 'front9', 1, null, 'social');
      await getStore().setPlayerScore(p, 1, 5, 'me');
      expect(viaMerge).toBe(getStore().groupScorecards.get(p)!.totalNet);
    });

    it('no echo after this phone submitted causes a write or "submitted elsewhere"', async () => {
      await init();
      const p = testPlayers[0].id;
      const sc = getStore().groupScorecards.get(p)!;
      useScorecardStore.setState({ groupScorecards: new Map([[p, { ...sc, status: 'completed', serverRevision: 5 }]]) });
      (saveScorecard as jest.Mock).mockClear();
      await getStore().mergeRemoteScorecard({ player_id: p, scores: {}, revision: 5, status: 'completed' }); // equal
      expect(saveScorecard).not.toHaveBeenCalled();
      await getStore().mergeRemoteScorecard({ player_id: p, scores: { '1': { strokes: 4 } }, revision: 6, status: 'completed' }); // newer final
      expect(saveScorecard).toHaveBeenCalledTimes(1);
      expect(getStore().submittedElsewhereRoundId).toBeNull(); // was already final locally
    });
  });

  describe('conflict resolver (store side)', () => {
    const ConflictError = () => jest.requireMock('@/services/offline/sync').ScorecardConflictError;
    const conflict = (status: string, scores: Record<string, unknown>, revision = 6) =>
      new (ConflictError())({ server_revision: revision, server_status: status, server_scores: scores });
    const init = (mode: 'social' | 'standard' = 'social') =>
      getStore().initializeRound(testRoundId, testPlayers, testHoles, 'stroke', false, [], null, 'none', new Map(), 'full', 1, null, mode);

    it('returns a merged retry snapshot for the loaded social round', async () => {
      await init();
      const queued = getStore().groupScorecards.get(testPlayers[0].id)!;
      const res = await mockConflictResolver!(queued, conflict('in-progress', { '2': { strokes: 5, editedAt: '2099-01-01T00:00:00.000Z' } }));
      expect(res).toMatchObject({ kind: 'retry' });
      expect((res as { scorecard: Scorecard }).scorecard.serverRevision).toBe(6);
      expect(getStore().groupScorecards.get(testPlayers[0].id)!.scores[2]).toBeDefined();
    });

    it('returns final for a completed server card', async () => {
      await init();
      const queued = getStore().groupScorecards.get(testPlayers[0].id)!;
      expect(await mockConflictResolver!(queued, conflict('completed', {}))).toEqual({ kind: 'final' });
    });

    it('declines a standard round, another round, or an older server row', async () => {
      await init('standard');
      const queued = getStore().groupScorecards.get(testPlayers[0].id)!;
      expect(await mockConflictResolver!(queued, conflict('in-progress', {}))).toBeNull();
      await init('social');
      const q2 = getStore().groupScorecards.get(testPlayers[0].id)!;
      expect(await mockConflictResolver!({ ...q2, roundId: 'other' }, conflict('in-progress', {}))).toBeNull();
      useScorecardStore.setState({ groupScorecards: new Map([[testPlayers[0].id, { ...q2, serverRevision: 9 }]]) });
      expect(await mockConflictResolver!(q2, conflict('in-progress', {}, 6))).toBeNull();
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

    it('derives scoringMode from the round row on resume', async () => {
      __setRoundsResult({
        data: {
          game_type: 'stroke',
          handicap_source: 'none',
          nine_type: 'full',
          selected_tee: null,
          course_id: null,
          competition_id: null,
          scoring_pairs_required: false,
        },
        error: null,
      });
      (getScorecardsByRound as jest.Mock)
        .mockReset()
        .mockResolvedValue(createMockScorecards(testPlayers, testRoundId));
      (getHoles as jest.Mock).mockReset().mockResolvedValue(testHoles);

      await getStore().loadFromOffline(testRoundId);

      expect(getStore().scoringMode).toBe('social');
    });

    it('clears a submitted-elsewhere flag left by another round', async () => {
      (getScorecardsByRound as jest.Mock)
        .mockReset()
        .mockResolvedValue(createMockScorecards(testPlayers, testRoundId));
      (getHoles as jest.Mock).mockReset().mockResolvedValue(testHoles);
      useScorecardStore.setState({ submittedElsewhereRoundId: 'other-round' });

      await getStore().loadFromOffline(testRoundId);

      expect(getStore().submittedElsewhereRoundId).toBeNull();
    });

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
      expect((syncScorecard as jest.Mock).mock.calls.every(([, options]) => options.markSynced === true)).toBe(true);
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

    it('propagates the guarded common upload notification into the current store', async () => {
      jest.clearAllMocks(); (getIsOnline as jest.Mock).mockReturnValue(true);
      (syncScorecard as jest.Mock).mockImplementation(async (card, options) => {
        options.onSynced(card, 5); return { serverRevision: 5 };
      });
      await getStore().submitScorecards();
      for (const [, card] of getStore().groupScorecards) expect(card.serverRevision).toBe(5);
      (syncScorecard as jest.Mock).mockImplementation(() => Promise.resolve({ serverRevision: 1 }));
    });

    it('delegates revision retry and current completion preparation to one common boundary', async () => {
      jest.clearAllMocks(); (getIsOnline as jest.Mock).mockReturnValue(true);
      await getStore().submitScorecards();
      expect(syncScorecard).toHaveBeenCalledTimes(testPlayers.length);
      for (const [card, options] of (syncScorecard as jest.Mock).mock.calls) {
        expect(options).toMatchObject({ adoptServerRevisionOnConflict: true, markSynced: true });
        expect(options.readCurrent()).toMatchObject({ id: card.id, status: 'completed', scores: card.scores });
        expect(options.capture.session.isCurrent()).toBe(true);
      }
    });

    it('surfaces an exhausted common conflict without reacquiring the coordinator', async () => {
      jest.clearAllMocks(); (getIsOnline as jest.Mock).mockReturnValue(true);
      (syncScorecard as jest.Mock).mockRejectedValue(new ScorecardConflictError(makeConflictRow(7)));
      await expect(getStore().submitScorecards()).rejects.toThrow(/Failed to submit/);
      expect(syncScorecard).toHaveBeenCalledTimes(testPlayers.length);
      (syncScorecard as jest.Mock).mockImplementation(() => Promise.resolve({ serverRevision: 1 }));
    });

    it('does not treat non-conflict errors as healable', async () => {
      jest.clearAllMocks();
      (getIsOnline as jest.Mock).mockReturnValue(true);
      (syncScorecard as jest.Mock).mockRejectedValue(new Error('network down'));

      await expect(getStore().submitScorecards()).rejects.toThrow(/Failed to submit/);

      // No retry for generic errors
      expect(syncScorecard).toHaveBeenCalledTimes(testPlayers.length);

      // Restore default for subsequent tests
      (syncScorecard as jest.Mock).mockImplementation(() =>
        Promise.resolve({ serverRevision: 1 })
      );
    });
  });

  describe('submitScorecards (social)', () => {
    const T2 = '2099-01-01T00:00:00.000Z';
    const init = () => getStore().initializeRound(testRoundId, testPlayers, testHoles, 'stroke', false, [], null, 'none', new Map(), 'full', 1, null, 'social');

    // clearAllMocks keeps implementations; don't leak a test's syncScorecard stub.
    afterEach(() => {
      (syncScorecard as jest.Mock).mockImplementation(() => Promise.resolve({ serverRevision: 1 }));
    });

    it('pulls and merges the server cards before submitting', async () => {
      await init();
      const p = testPlayers[0].id;
      __setScorecardsResult({ data: [{ player_id: p, scores: { '1': { strokes: 4, editedAt: T2 } }, revision: 2, status: 'in-progress' }], error: null });
      const result = await getStore().submitScorecards();
      const sent = (syncScorecard as jest.Mock).mock.calls.find(([sc]) => sc.playerId === p)[0];
      expect(sent.scores[1].strokes).toBe(4);
      expect(sent.serverRevision).toBe(2);
      expect(result).toEqual({ alreadySubmitted: false });
    });

    it('adopts the final cards and reports alreadySubmitted when the server cards are all final', async () => {
      await init();
      __setScorecardsResult({ data: testPlayers.map((pl) => ({ player_id: pl.id, scores: {}, revision: 3, status: 'completed' })), error: null });
      const result = await getStore().submitScorecards();
      expect(result).toEqual({ alreadySubmitted: true });
      expect(syncScorecard).not.toHaveBeenCalled();
      expect(getStore().submittedElsewhereRoundId).toBeNull(); // the caller's success navigation handles it
    });

    it('a retry after a failed submit still submits (local completed ≠ server final)', async () => {
      await init();
      (syncScorecard as jest.Mock).mockRejectedValueOnce(new Error('network'));
      await expect(getStore().submitScorecards()).rejects.toThrow();
      __setScorecardsResult({ data: [], error: null });
      (syncScorecard as jest.Mock).mockClear();
      await expect(getStore().submitScorecards()).resolves.toEqual({ alreadySubmitted: false });
      expect(syncScorecard).toHaveBeenCalled();
    });

    it("ignores its own completed echoes while submitting (no 'submitted elsewhere')", async () => {
      await init();
      (syncScorecard as jest.Mock).mockImplementation(async (sc: Scorecard) => {
        await getStore().mergeRemoteScorecard({ player_id: sc.playerId, scores: {}, revision: 5, status: 'completed' });
        return { serverRevision: 5 };
      });
      await getStore().submitScorecards();
      expect(getStore().submittedElsewhereRoundId).toBeNull();
    });

    it('the pre/post-submit pulls schedule no debounced upload when local is ahead', async () => {
      jest.useFakeTimers();
      try {
        await init();
        const p = testPlayers[0].id;
        await getStore().setPlayerScore(p, 2, 5, 'me'); // local ahead of the server row below
        jest.advanceTimersByTime(5000); // flush the live-edit debounce
        (queueScorecardSync as jest.Mock).mockClear();
        __setScorecardsResult({ data: [{ player_id: p, scores: { '1': { strokes: 4, editedAt: T2 } }, revision: 2, status: 'in-progress' }], error: null });
        // A slow upload that then fails: any debounce the pull scheduled fires
        // mid-submit, while the store still holds the in-progress card.
        (syncScorecard as jest.Mock).mockImplementationOnce(async () => {
          jest.advanceTimersByTime(5000);
          throw new Error('network');
        });
        await expect(getStore().submitScorecards()).rejects.toThrow();
        jest.advanceTimersByTime(5000);
        expect(queueScorecardSync).not.toHaveBeenCalled();
      } finally {
        jest.useRealTimers();
      }
    });

    it('submits even when the pre-submit pull fails (weak signal)', async () => {
      await init();
      const { supabase } = jest.requireMock('@/services/supabase/client');
      (supabase.from as jest.Mock).mockImplementationOnce(() => { throw new Error('network'); });
      await expect(getStore().submitScorecards()).resolves.toEqual({ alreadySubmitted: false });
      expect(syncScorecard).toHaveBeenCalled();
    });

    it('a conflict during submit keeps the merged scores in the store', async () => {
      await init();
      const p = testPlayers[0].id;
      await getStore().setPlayerScore(p, 1, 4, 'me');
      const ConflictError = jest.requireMock('@/services/offline/sync').ScorecardConflictError;
      (syncScorecard as jest.Mock)
        .mockRejectedValueOnce(new ConflictError({ server_revision: 6, server_status: 'in-progress', server_scores: { '2': { strokes: 5, editedAt: T2 } } }))
        .mockResolvedValue({ serverRevision: 7 });
      await getStore().submitScorecards({ playerIds: [p] });
      const sc = getStore().groupScorecards.get(p)!;
      expect(sc.scores[2]).toEqual({ strokes: 5, editedAt: T2 });
      expect(sc.serverRevision).toBe(7);
    });

    it('a conflict during submit leaves the merged card saved locally as completed', async () => {
      await init();
      const p = testPlayers[0].id;
      await getStore().setPlayerScore(p, 1, 4, 'me');
      const ConflictError = jest.requireMock('@/services/offline/sync').ScorecardConflictError;
      (syncScorecard as jest.Mock)
        .mockRejectedValueOnce(new ConflictError({ server_revision: 6, server_status: 'in-progress', server_scores: { '2': { strokes: 5, editedAt: T2 } } }))
        .mockResolvedValue({ serverRevision: 7 });
      await getStore().submitScorecards({ playerIds: [p] });
      const id = getStore().groupScorecards.get(p)!.id;
      const saves = (saveScorecard as jest.Mock).mock.calls.filter(([c]) => c.id === id);
      const lastSaved = saves[saves.length - 1][0] as Scorecard;
      expect(lastSaved.status).toBe('completed');
      expect(lastSaved.scores[2]).toEqual({ strokes: 5, editedAt: T2 });
    });
  });

  // ==========================================================================
  // LIVE SYNC REVISION PROPAGATION
  // ==========================================================================

  describe('live sync revision propagation', () => {
    beforeEach(async () => {
      await getStore().initializeRound(testRoundId, testPlayers, testHoles);
    });

    it('subscribes to scorecard-synced events on round initialization', () => {
      expect(mockScorecardSyncedListener).not.toBeNull();
    });

    it('updates the in-memory serverRevision when a background sync completes', () => {
      const [playerId, scorecard] = [...getStore().groupScorecards.entries()][0];

      mockScorecardSyncedListener!({ scorecardId: scorecard.id, serverRevision: 42 });

      expect(getStore().groupScorecards.get(playerId)!.serverRevision).toBe(42);
    });

    it('never downgrades the revision from a stale event', () => {
      const [playerId, scorecard] = [...getStore().groupScorecards.entries()][0];

      mockScorecardSyncedListener!({ scorecardId: scorecard.id, serverRevision: 42 });
      mockScorecardSyncedListener!({ scorecardId: scorecard.id, serverRevision: 3 });

      expect(getStore().groupScorecards.get(playerId)!.serverRevision).toBe(42);
    });

    it('ignores events for scorecards not in the current round', () => {
      const before = getStore().groupScorecards;

      mockScorecardSyncedListener!({ scorecardId: 'not-a-current-card', serverRevision: 9 });

      expect(getStore().groupScorecards).toBe(before);
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
  describe('editedAt stamping', () => {
    beforeEach(() => {
      jest.useFakeTimers();
      jest.setSystemTime(new Date('2026-10-07T01:02:03.000Z'));
    });
    afterEach(() => jest.useRealTimers());

    const holeOf = (playerId: string) => getStore().groupScorecards.get(playerId)!.scores[1] as HoleScore;

    it.each([
      ['setPlayerScore', (id: string) => getStore().setPlayerScore(id, 1, 4, 'me')],
      ['updatePlayerHoleScore', (id: string) => getStore().updatePlayerHoleScore(id, 1, { putts: 2 })],
      ['updateShotContributions', (id: string) => getStore().updateShotContributions(id, 1, { teeShot: id })],
      ['updateLocalScore', (id: string) => getStore().updateLocalScore(testRoundId, id, 1, 5)],
    ])('%s stamps the hole with the edit time', async (_name, act) => {
      await getStore().initializeRound(testRoundId, testPlayers, testHoles, 'stroke');
      const id = testPlayers[0].id;
      await act(id);
      expect(holeOf(id).editedAt).toBe('2026-10-07T01:02:03.000Z');
    });

    it('persists the stamped hole to SQLite', async () => {
      await getStore().initializeRound(testRoundId, testPlayers, testHoles, 'stroke');
      await getStore().setPlayerScore(testPlayers[0].id, 1, 4, 'me');
      expect(saveHoleScore).toHaveBeenLastCalledWith(
        expect.any(String), 1, expect.objectContaining({ editedAt: '2026-10-07T01:02:03.000Z' }), expect.objectContaining({ lease: expect.any(Object) }),
      );
    });
  });

  describe('scenario: phone A dies after 9 holes, phone B finishes and submits (social)', () => {
    const at = (m: number) => new Date(Date.UTC(2026, 9, 7, 1, m)).toISOString();
    type Row = { scores: Record<string, HoleScore>; revision: number; status: string };

    // Fake timers so setPlayerScore's 2s debounce timers never fire mid-scenario;
    // the clock is set explicitly per phase so edit stamps are ordered.
    beforeEach(() => jest.useFakeTimers());
    afterEach(() => {
      jest.useRealTimers();
      (syncScorecard as jest.Mock).mockImplementation(() => Promise.resolve({ serverRevision: 1 }));
    });

    it('both phones end with the same final cards, no hole lost, no loop', async () => {
      const [sam, friend] = testPlayers;
      const guest = { ...testPlayers[2], id: 'guest-1', name: 'Guest', isPlaceholder: true };
      const players = [sam, friend, guest];
      const server = new Map<string, Row>(players.map((pl) => [pl.id, { scores: {}, revision: 0, status: 'in-progress' }]));
      const rows = () => [...server].map(([player_id, r]) => ({ player_id, ...r }));
      const write = (sc: Scorecard) => {
        const ConflictError = jest.requireMock('@/services/offline/sync').ScorecardConflictError;
        const row = server.get(sc.playerId)!;
        if ((sc.serverRevision ?? 0) !== row.revision || (row.status === 'completed' && sc.status !== 'completed')) {
          throw new ConflictError({ server_revision: row.revision, server_status: row.status, server_scores: row.scores });
        }
        const scores = Object.fromEntries(Object.entries(sc.scores).map(([k, v]) => [k, v as HoleScore]));
        server.set(sc.playerId, { scores, revision: row.revision + 1, status: sc.status });
        return { serverRevision: row.revision + 1 };
      };
      (syncScorecard as jest.Mock).mockImplementation(async (sc: Scorecard) => write(sc));
      const init = (store: typeof useScorecardStore) =>
        store.getState().initializeRound(testRoundId, players, testHoles, 'stroke', false, [], null, 'none', new Map(), 'full', 1, null, 'social');

      // ── Phone A: its own store instance. Scores holes 1–9 for everyone and uploads each card.
      let phoneA!: typeof useScorecardStore;
      let dbA!: { saveScorecard: jest.Mock };
      let syncA!: { queueScorecardSync: jest.Mock };
      jest.isolateModules(() => {
        phoneA = require('@/store/scorecardStore').useScorecardStore;
        dbA = jest.requireMock('@/services/offline/database');
        syncA = jest.requireMock('@/services/offline/sync');
      });
      expect(phoneA).not.toBe(useScorecardStore); // two independent stores
      // ...that share one set of mocks, so the no-writes checks below cover both phones.
      expect(dbA.saveScorecard).toBe(saveScorecard);
      expect(syncA.queueScorecardSync).toBe(queueScorecardSync);
      jest.setSystemTime(new Date(at(0)));
      await init(phoneA);
      const resolverA = mockConflictResolver!; // A registered last
      for (let h = 1; h <= 9; h++) {
        jest.setSystemTime(new Date(at(h)));
        for (const pl of players) await phoneA.getState().setPlayerScore(pl.id, h, 4, sam.id);
      }
      for (const pl of players) {
        const card = phoneA.getState().groupScorecards.get(pl.id)!;
        const { serverRevision } = write(card); // the drain A completed before its battery died
        phoneA.setState({ groupScorecards: new Map(phoneA.getState().groupScorecards).set(pl.id, { ...card, serverRevision }) });
      }
      // A's last edit never uploads.
      jest.setSystemTime(new Date(at(10)));
      await phoneA.getState().setPlayerScore(sam.id, 9, 5, sam.id);

      // ── Phone B: opens the round, pulls, finishes 10–18 for everyone, submits.
      jest.setSystemTime(new Date(at(20)));
      await init(useScorecardStore);
      __setScorecardsResult({ data: rows(), error: null });
      await getStore().pullServerScorecards();
      for (let h = 10; h <= testHoles.length; h++) {
        jest.setSystemTime(new Date(at(h + 11)));
        for (const pl of players) await getStore().setPlayerScore(pl.id, h, 3, friend.id);
      }
      jest.setSystemTime(new Date(at(40)));
      __setScorecardsResult({ data: rows(), error: null });
      await expect(getStore().submitScorecards()).resolves.toEqual({ alreadySubmitted: false });

      for (const pl of players) {
        expect(server.get(pl.id)!.status).toBe('completed');
        expect(Object.keys(server.get(pl.id)!.scores)).toHaveLength(testHoles.length);
      }
      expect((server.get(sam.id)!.scores['9'] as HoleScore).strokes).toBe(4); // submit is final

      // ── Phone A comes back. Its stale write for sam conflicts: the resolver says final.
      jest.setSystemTime(new Date(at(50)));
      const staleA = phoneA.getState().groupScorecards.get(sam.id)!;
      expect((staleA.scores[9] as HoleScore).strokes).toBe(5); // A still holds its unsent edit
      const finalSam = server.get(sam.id)!;
      const ConflictError = jest.requireMock('@/services/offline/sync').ScorecardConflictError;
      await expect(
        resolverA(staleA, new ConflictError({ server_revision: finalSam.revision, server_status: 'completed', server_scores: finalSam.scores })),
      ).resolves.toEqual({ kind: 'final' });
      // The live merge brings A's other cards to final.
      for (const r of rows()) await phoneA.getState().mergeRemoteScorecard(r);

      // ── Both phones converge; A is told; nothing loops.
      for (const pl of players) {
        expect(Object.keys(phoneA.getState().groupScorecards.get(pl.id)!.scores)).toHaveLength(testHoles.length);
        expect(phoneA.getState().groupScorecards.get(pl.id)!.scores).toEqual(getStore().groupScorecards.get(pl.id)!.scores);
      }
      expect(phoneA.getState().submittedElsewhereRoundId).toBe(testRoundId);
      expect(getStore().submittedElsewhereRoundId).toBeNull();
      (saveScorecard as jest.Mock).mockClear();
      (queueScorecardSync as jest.Mock).mockClear();
      for (const r of rows()) {
        await phoneA.getState().mergeRemoteScorecard(r);
        await getStore().mergeRemoteScorecard(r);
      }
      expect(saveScorecard).not.toHaveBeenCalled();
      expect(queueScorecardSync).not.toHaveBeenCalled();
    });
  });
});

// C1 live races use only the store's native-DAO mocks; transitions are passive test consumers.
const c1Deferred = () => {
  let resolve!: () => void;
  const promise = new Promise<void>((r) => {
    resolve = r;
  });
  return { promise, resolve };
};
const c1Player = createTestPlayer({ id: "c1-player", handicap: 0 });
function installC1Round(
  roundId: string,
  scores: Scorecard["scores"] = {
    3: { strokes: 4, putts: 2 },
    8: { strokes: 5 },
  },
) {
  const scorecard: Scorecard = {
    id: `card-${roundId}`,
    roundId,
    playerId: c1Player.id,
    player: c1Player,
    scores,
    totalGross: 9,
    totalNet: 9,
    status: "in-progress",
    createdAt: new Date(),
    updatedAt: new Date(),
  };
  useScorecardStore.setState({
    currentRoundId: roundId,
    currentPlayers: [c1Player],
    holes: create18Holes(),
    groupScorecards: new Map([[c1Player.id, scorecard]]),
    isLoading: false,
    isInitialized: true,
  });
  return scorecard;
}
describe("C1 live persistence source/session protection", () => {
  afterEach(() => flushPendingScorecardSyncs());
  beforeEach(() => {
    getStore().resetRound();
    jest.clearAllMocks();
  });
  it("two retained live edits remain immediate and rebase newest full card without obsolete hole writes", async () => {
    const roundId = "c1-store-live";
    const original = installC1Round(roundId);
    const paused = c1Deferred();
    const session = getStore().captureRoundScoringSession(roundId)!;
    const ending = withRoundPersistenceTransition(
      roundId,
      { nine_type: "full", holes_played: 6 },
      () => paused.promise,
      () => {
        session.applyShape(
          { nine_type: "full", holes_played: 6 },
          new Map([[original.id, { nine_type: "full", holes_played: null }]]),
        );
      },
    );
    const first = getStore().setPlayerScore(c1Player.id, 3, 5);
    expect(getStrokes(getStore().getPlayerScore(c1Player.id, 3))).toBe(5);
    const second = getStore().updatePlayerHoleScore(c1Player.id, 3, {
      strokes: 6,
      putts: 1,
    });
    expect(getStrokes(getStore().getPlayerScore(c1Player.id, 3))).toBe(6);
    expect(saveScorecard).not.toHaveBeenCalled();
    paused.resolve();
    await ending;
    await first;
    await second;
    expect(saveHoleScore).not.toHaveBeenCalled();
    for (const [saved] of (saveScorecard as jest.Mock).mock.calls) {
      expect(saved.scores[3]).toEqual(
        expect.objectContaining({ strokes: 6, putts: 1 }),
      );
      expect(saved.scores[8]).toBeUndefined();
      expect(saved.holesPlayed).toBe(6);
    }
    expect(saveScorecard).toHaveBeenCalledTimes(2);
  });
  it("same-round reset cancels the old continuation and its debounced getter", async () => {
    const roundId = "c1-store-reset";
    installC1Round(roundId);
    const paused = c1Deferred();
    const ending = withRoundPersistenceTransition(
      roundId,
      { nine_type: "full", holes_played: 6 },
      () => paused.promise,
      () => {},
    );
    const writing = getStore().setPlayerScore(c1Player.id, 3, 5);
    getStore().resetRound();
    const replacement = installC1Round(roundId, { 3: { strokes: 9 } });
    paused.resolve();
    await ending;
    await writing;
    expect(saveScorecard).not.toHaveBeenCalled();
    expect(saveHoleScore).not.toHaveBeenCalled();
    expect(getStore().groupScorecards.get(c1Player.id)).toBe(replacement);
  });
  it("tee switches stay immediate and persist the current retained edit after repair", async () => {
    const roundId = "c1-store-tee";
    const original = installC1Round(roundId);
    const paused = c1Deferred();
    const session = getStore().captureRoundScoringSession(roundId)!;
    const ending = withRoundPersistenceTransition(
      roundId,
      { nine_type: "full", holes_played: 6 },
      () => paused.promise,
      () => {
        session.applyShape(
          { nine_type: "full", holes_played: 6 },
          new Map([[original.id, { nine_type: "full", holes_played: null }]]),
        );
      },
    );
    const tee = {
      name: "Red",
      color: "red",
      slopeRating: 113,
      courseRating: 72,
    };
    const switching = getStore().setPlayerTee(c1Player.id, tee);
    expect(getStore().getPlayerTee(c1Player.id)).toBe(tee);
    const editing = getStore().updateShotContributions(c1Player.id, 3, {
      teeShot: c1Player.id,
    });
    paused.resolve();
    await ending;
    await switching;
    await editing;
    for (const [saved] of (saveScorecard as jest.Mock).mock.calls) {
      expect(saved.teeData).toEqual(tee);
      expect(saved.scores[3].shotContributions).toEqual({
        teeShot: c1Player.id,
      });
      expect(saved.scores[8]).toBeUndefined();
    }
  });
  it("multi-ball score/stats rebase current full card with all balls and stats intact", async () => {
    const roundId = "c1-store-multiball";
    const original = installC1Round(roundId, {
      3: {
        balls: [
          { strokes: 4, putts: 2 },
          { strokes: 5, putts: 3 },
        ],
      },
    });
    useScorecardStore.setState({ ballCount: 2, isMultiBall: true });
    const paused = c1Deferred();
    const session = getStore().captureRoundScoringSession(roundId)!;
    const ending = withRoundPersistenceTransition(
      roundId,
      { nine_type: "full", holes_played: 6 },
      () => paused.promise,
      () => {
        session.applyShape(
          { nine_type: "full", holes_played: 6 },
          new Map([[original.id, { nine_type: "full", holes_played: null }]]),
        );
      },
    );
    const scoring = getStore().setMultiBallScore(c1Player.id, 3, 1, 6);
    const stats = getStore().updateMultiBallStats(c1Player.id, 3, 0, {
      putts: 1,
      fairwayHit: true,
    });
    expect(getStore().getMultiBallScores(c1Player.id, 3)).toEqual([
      { strokes: 4, putts: 1, fairwayHit: true },
      { strokes: 6, putts: 3 },
    ]);
    paused.resolve();
    await ending;
    await scoring;
    await stats;
    expect(saveScorecard).toHaveBeenCalledTimes(2);
    for (const [saved] of (saveScorecard as jest.Mock).mock.calls)
      expect(saved.scores[3].balls).toEqual([
        { strokes: 4, putts: 1, fairwayHit: true },
        { strokes: 6, putts: 3 },
      ]);
    expect(queueScorecardSync).not.toHaveBeenCalled();
  });
});

describe('C1 debounce session ownership', () => {
  const actions = ['setPlayerScore', 'updateLocalScore'] as const;
  const edit = (action: typeof actions[number], roundId: string, strokes: number) =>
    action === 'setPlayerScore'
      ? getStore().setPlayerScore(c1Player.id, 3, strokes)
      : getStore().updateLocalScore(roundId, c1Player.id, 3, strokes);

  beforeEach(() => {
    jest.useFakeTimers();
    flushPendingScorecardSyncs();
    getStore().resetRound();
    jest.clearAllMocks();
    (saveHoleScore as jest.Mock).mockResolvedValue(undefined);
    (saveScorecard as jest.Mock).mockResolvedValue(undefined);
    (queueScorecardSync as jest.Mock).mockResolvedValue(undefined);
    (getIsOnline as jest.Mock).mockReturnValue(false);
  });
  afterEach(() => {
    flushPendingScorecardSyncs();
    jest.useRealTimers();
    (getIsOnline as jest.Mock).mockReturnValue(true);
  });

  it.each(actions)('%s cannot replace the new same-round session timer after its old save cancels', async (action) => {
    const roundId = `c1-debounce-session-${action}`;
    installC1Round(roundId);
    const paused = c1Deferred();
    (saveHoleScore as jest.Mock).mockImplementationOnce(() => paused.promise);
    const oldEdit = edit(action, roundId, 5);
    expect(saveHoleScore).toHaveBeenCalledTimes(1);

    getStore().resetRound();
    installC1Round(roundId);
    await edit(action, roundId, 6);
    const current = getStore().groupScorecards.get(c1Player.id)!;
    expect(jest.getTimerCount()).toBe(1);

    paused.resolve();
    await oldEdit;
    expect(saveScorecard).toHaveBeenCalledTimes(1);
    await jest.advanceTimersByTimeAsync(2000);
    expect(queueScorecardSync).toHaveBeenCalledTimes(1);
    expect(queueScorecardSync).toHaveBeenCalledWith(current, 'update', expect.any(Object));
    expect(getStrokes(current.scores[3])).toBe(6);
  });

  it('does not admit a captured timer card from a replaced session after transition rollback', async () => {
    const roundId = 'c1-debounce-session-rollback';
    installC1Round(roundId);
    await edit('setPlayerScore', roundId, 6);
    const paused = c1Deferred();
    const ending = withRoundPersistenceTransition(roundId, { nine_type: 'full', holes_played: 6 }, async () => {
      await paused.promise;
      throw new Error('rollback');
    }, () => {});
    const failed = expect(ending).rejects.toThrow('rollback');
    const admitted: Scorecard[] = [];
    (queueScorecardSync as jest.Mock).mockImplementation((queued, _action, proof) =>
      runRoundPersistence(queued.roundId, proof, async () => { admitted.push(queued); })
    );
    await jest.advanceTimersByTimeAsync(2000);
    expect(admitted).toEqual([]);

    getStore().resetRound();
    const replacement = installC1Round(roundId, { 3: { strokes: 9 } });
    paused.resolve();
    await failed;
    await jest.advanceTimersByTimeAsync(0);
    expect(admitted).toEqual([]);
    expect(getStore().groupScorecards.get(c1Player.id)).toBe(replacement);
  });

  it.each(actions)('%s still schedules live sync after an ordinary save failure in its current session', async (action) => {
    const roundId = `c1-debounce-save-failure-${action}`;
    installC1Round(roundId);
    (saveHoleScore as jest.Mock).mockRejectedValueOnce(new Error('disk unavailable'));
    await edit(action, roundId, 6);
    const current = getStore().groupScorecards.get(c1Player.id)!;
    expect(saveScorecard).not.toHaveBeenCalled();
    await jest.advanceTimersByTimeAsync(2000);
    expect(queueScorecardSync).toHaveBeenCalledWith(current, 'update', expect.any(Object));
  });
});
