/**
 * Scorecard Store Mock
 *
 * Provides mock implementations of the Zustand scorecard store
 * for testing scorecard-related components.
 */

import type { Player, Hole, HoleScore } from '@/types/database.types';
import { create18Holes, createTestPlayer } from '../../utils/testFixtures';

// ============================================================================
// TYPES
// ============================================================================

export interface MockScorecardState {
  // Round info
  roundId: string | null;
  competitionId: string | null;
  courseName: string | null;

  // Hole navigation
  currentHole: number;
  holes: Hole[];

  // Players
  currentPlayers: Player[];

  // Scores (playerId -> holeNumber -> score)
  scores: Record<string, Record<string, HoleScore>>;

  // Status
  isLoading: boolean;
  isInitialized: boolean;
  isSyncing: boolean;
  pendingSyncCount: number;
  lastSyncedAt: string | null;

  // Actions
  initializeRound: jest.Mock;
  setCurrentHole: jest.Mock;
  setPlayerScore: jest.Mock;
  updatePlayerHoleScore: jest.Mock;
  getPlayerScore: jest.Mock;
  getHoleInfo: jest.Mock;
  isHoleComplete: jest.Mock;
  getCompletedHolesCount: jest.Mock;
  submitScorecards: jest.Mock;
  resetRound: jest.Mock;
  syncScores: jest.Mock;
}

// ============================================================================
// MOCK FACTORY
// ============================================================================

/**
 * Create a mock scorecard store state
 */
export function createMockScorecardStore(
  overrides: Partial<MockScorecardState> = {}
): MockScorecardState {
  const defaultPlayers = [
    createTestPlayer({ id: 'player-1', name: 'John Smith', handicap: 18 }),
    createTestPlayer({ id: 'player-2', name: 'Jane Doe', handicap: 10 }),
  ];
  const defaultHoles = create18Holes();

  const baseState: MockScorecardState = {
    // Round info
    roundId: 'round-1',
    competitionId: 'comp-1',
    courseName: 'Test Golf Course',

    // Hole navigation
    currentHole: 1,
    holes: defaultHoles,

    // Players
    currentPlayers: defaultPlayers,

    // Scores
    scores: {},

    // Status
    isLoading: false,
    isInitialized: true,
    isSyncing: false,
    pendingSyncCount: 0,
    lastSyncedAt: null,

    // Actions
    initializeRound: jest.fn(),
    setCurrentHole: jest.fn(),
    setPlayerScore: jest.fn(),
    updatePlayerHoleScore: jest.fn(),
    getPlayerScore: jest.fn((playerId: string, holeNumber: number) => {
      const playerScores = baseState.scores[playerId];
      return playerScores?.[holeNumber.toString()] ?? null;
    }),
    getHoleInfo: jest.fn((holeNumber: number) => {
      return defaultHoles.find((h) => h.number === holeNumber) ?? null;
    }),
    isHoleComplete: jest.fn(() => false),
    getCompletedHolesCount: jest.fn(() => 0),
    submitScorecards: jest.fn().mockResolvedValue({ success: true }),
    resetRound: jest.fn(),
    syncScores: jest.fn().mockResolvedValue({ success: true }),

    ...overrides,
  };

  // Update getHoleInfo to use actual holes if provided
  if (overrides.holes) {
    baseState.getHoleInfo = jest.fn((holeNumber: number) => {
      return overrides.holes!.find((h) => h.number === holeNumber) ?? null;
    });
  }

  return baseState;
}

/**
 * Create a mock store with scores filled in
 */
export function createMockScorecardStoreWithScores(
  players: Player[],
  holes: Hole[],
  holeScores: Record<string, Record<string, HoleScore>>
): MockScorecardState {
  const store = createMockScorecardStore({
    currentPlayers: players,
    holes,
    scores: holeScores,
  });

  // Update getPlayerScore to return actual scores
  store.getPlayerScore = jest.fn((playerId: string, holeNumber: number) => {
    return holeScores[playerId]?.[holeNumber.toString()] ?? null;
  });

  // Update isHoleComplete based on actual scores
  store.isHoleComplete = jest.fn((holeNumber: number) => {
    return players.every((player) => {
      const score = holeScores[player.id]?.[holeNumber.toString()];
      return score?.strokes !== undefined && score.strokes > 0;
    });
  });

  // Update getCompletedHolesCount
  store.getCompletedHolesCount = jest.fn(() => {
    let count = 0;
    for (let i = 1; i <= holes.length; i++) {
      if (store.isHoleComplete(i)) count++;
    }
    return count;
  });

  return store;
}

// ============================================================================
// JEST MOCK FACTORY
// ============================================================================

/**
 * Create jest.mock factory for useScorecardStore
 *
 * @example
 * jest.mock('@/store/scorecardStore', () => ({
 *   useScorecardStore: () => createMockScorecardStore(),
 * }));
 */
export function createScorecardStoreMock(overrides: Partial<MockScorecardState> = {}) {
  const mockStore = createMockScorecardStore(overrides);

  return {
    useScorecardStore: jest.fn(() => mockStore),
    // Also export individual selectors if needed
    useCurrentHole: () => mockStore.currentHole,
    useCurrentPlayers: () => mockStore.currentPlayers,
    useHoles: () => mockStore.holes,
    useIsLoading: () => mockStore.isLoading,
    useIsSyncing: () => mockStore.isSyncing,
  };
}

// ============================================================================
// PRESET MOCKS
// ============================================================================

/** Empty scorecard (no scores entered) */
export const emptyScorecardMock = createMockScorecardStore();

/** Scorecard with some scores filled in (partial round) */
export const partialScorecardMock = createMockScorecardStore({
  scores: {
    'player-1': {
      '1': { strokes: 4, putts: 2 },
      '2': { strokes: 3, putts: 1 },
      '3': { strokes: 5, putts: 2 },
    },
    'player-2': {
      '1': { strokes: 5, putts: 2 },
      '2': { strokes: 4, putts: 2 },
      '3': { strokes: 4, putts: 1 },
    },
  },
  currentHole: 4,
});

/** Loading state */
export const loadingScorecardMock = createMockScorecardStore({
  isLoading: true,
  isInitialized: false,
});

/** Syncing state */
export const syncingScorecardMock = createMockScorecardStore({
  isSyncing: true,
  pendingSyncCount: 5,
});
