/**
 * useRoundData — round-shape mismatch guard and the network init call
 *
 * The guard resets the store when the round's shape on the server differs
 * from the store's: nine_type (EditNineTypeSheet recovery) and, for end round early,
 * holes_played (another device ended the round). A pending local end — the
 * server row not yet updated — must not be "corrected" away.
 *
 * @see src/hooks/scorecard/useRoundData.ts
 */

import { renderHook } from '@testing-library/react-native';
import { useRoundData } from '@/hooks/scorecard/useRoundData';
import { saveScorecard } from '@/services/offline/database';
import type { Hole, Scorecard } from '@/types';

const ROUND_ID = 'round-ee';

// What hydrateFromSupabase sees: the store's cards and the server's rows.
let mockGroupScorecards = new Map<string, Partial<Scorecard>>();
let mockRemoteScorecards: unknown[] = [];

const mockStoreState = {
  currentRoundId: ROUND_ID as string | null,
  currentPlayers: [{ id: 'player-1', name: 'Sam' }],
  holes: [] as Hole[],
  isInitialized: true,
  nineType: 'full',
  holesPlayed: null as number | null,
  loadFromOffline: jest.fn(() => Promise.resolve(true)),
  initializeRound: jest.fn(() => Promise.resolve()),
  ensureTeamMemberScorecards: jest.fn(() => Promise.resolve()),
  resetRound: jest.fn(),
  updateHoles: jest.fn(() => Promise.resolve()),
  setAllowedPlayers: jest.fn(),
};

jest.mock('@/store/scorecardStore', () => {
  const useScorecardStore = jest.fn(() => mockStoreState);
  (useScorecardStore as unknown as { getState: () => unknown }).getState = () => ({
    ...mockStoreState,
    groupScorecards: mockGroupScorecards,
  });
  (useScorecardStore as unknown as { setState: (s: unknown) => void }).setState = jest.fn();
  return { useScorecardStore };
});

// Stable objects: the hook's callbacks depend on their identity.
const mockMetadata = {
  data: {
    id: ROUND_ID,
    gameType: 'stroke',
    isTeamRound: false,
    teamFormat: null,
    roundFormat: 'combined',
    scoringPairsRequired: false,
    ballCount: 1,
    selectedTee: null,
    selectedTeeData: null,
    courseId: 'course-1',
    courseName: 'Test Course',
    clubName: null,
    courseTees: [],
    roundStatus: 'in-progress',
    teamConfig: null,
    handicapSource: 'profile',
    nineType: 'full',
    holesPlayed: null as number | null,
    playerTeeMap: new Map(),
  },
  isLoading: false,
  error: null,
  refetch: jest.fn(),
};
const mockPlayersHook = {
  players: [{ id: 'player-1', name: 'Sam', email: '' }],
  getPlayer: jest.fn(),
  isLoading: false,
  error: null,
  refetch: jest.fn(),
};
const mockCourseHook = {
  course: null,
  holes: Array.from({ length: 18 }, (_, i) => ({ number: i + 1, par: 4, strokeIndex: i + 1 })),
  startHole: 1,
  getHole: jest.fn(),
  isLoading: false,
  error: null,
  refetch: jest.fn(),
};
const mockTeamsHook = { teams: [], getPlayerTeam: jest.fn(), isLoading: false, error: null, refetch: jest.fn() };
const mockScoringPairsHook = {
  playersToScore: [],
  scoringPairsEnabled: false,
  isLoading: false,
  error: null,
  refetch: jest.fn(),
  myScorer: null,
  isOwnScore: jest.fn(),
};

jest.mock('@/hooks/scorecard/useRoundMetadata', () => ({ useRoundMetadata: () => mockMetadata }));
jest.mock('@/hooks/scorecard/useRoundPlayers', () => ({ useRoundPlayers: () => mockPlayersHook }));
jest.mock('@/hooks/scorecard/useRoundCourse', () => ({ useRoundCourse: () => mockCourseHook }));
jest.mock('@/hooks/scorecard/useRoundTeams', () => ({ useRoundTeams: () => mockTeamsHook }));
jest.mock('@/hooks/scorecard/useRoundScoringPairs', () => ({
  useRoundScoringPairs: () => mockScoringPairsHook,
}));
jest.mock('@/store/initializeRoundSlice', () => ({
  getOfflinePlayersForRound: jest.fn(() => Promise.resolve([])),
}));
jest.mock('@/services/offline/database', () => ({
  saveScorecard: jest.fn(() => Promise.resolve()),
  markScorecardAsSynced: jest.fn(() => Promise.resolve()),
}));
jest.mock('@/services/diagnostics', () => ({ pushDiagnostic: jest.fn() }));
jest.mock('@/services/supabase/client', () => ({
  supabase: {
    from: jest.fn((table: string) => {
      const chain: Record<string, jest.Mock> = {};
      chain.select = jest.fn(() => chain);
      chain.eq = jest.fn(() => chain);
      chain.update = jest.fn(() => chain);
      // hydrateFromSupabase ends its scorecards query with .is('deleted_at', null).
      chain.is = jest.fn(() =>
        Promise.resolve({ data: table === 'scorecards' ? mockRemoteScorecards : [], error: null })
      );
      return chain;
    }),
  },
}));
jest.mock('@/utils/debugLogger', () => {
  const makeLogger = () => ({ info: jest.fn(), debug: jest.fn(), warn: jest.fn(), error: jest.fn() });
  return {
    roundDataLogger: makeLogger(),
    storeLogger: makeLogger(),
    createModuleLogger: jest.fn(() => makeLogger()),
  };
});

const tick = () => new Promise((resolve) => setTimeout(resolve, 20));
const renderTheHook = () => renderHook(() => useRoundData({ roundId: ROUND_ID, competitionId: '' }));

describe('useRoundData — round-shape guard', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockGroupScorecards = new Map();
    mockRemoteScorecards = [];
    mockStoreState.currentRoundId = ROUND_ID;
    mockStoreState.isInitialized = true;
    mockStoreState.nineType = 'full';
    mockStoreState.holesPlayed = null;
    mockStoreState.loadFromOffline.mockImplementation(() => Promise.resolve(true));
    mockMetadata.data.nineType = 'full';
    mockMetadata.data.holesPlayed = null;
  });

  it('characterization: resets when the server nine_type changed under the store', async () => {
    mockMetadata.data.nineType = 'front9';

    renderTheHook();
    await tick();

    expect(mockStoreState.resetRound).toHaveBeenCalledTimes(1);
  });

  it('characterization: leaves the store alone when nothing changed', async () => {
    renderTheHook();
    await tick();

    expect(mockStoreState.resetRound).not.toHaveBeenCalled();
    expect(mockStoreState.loadFromOffline).not.toHaveBeenCalled();
  });
});

describe('useRoundData — holes_played (end round early)', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockGroupScorecards = new Map();
    mockRemoteScorecards = [];
    mockStoreState.currentRoundId = ROUND_ID;
    mockStoreState.isInitialized = true;
    mockStoreState.nineType = 'full';
    mockStoreState.holesPlayed = null;
    mockStoreState.loadFromOffline.mockImplementation(() => Promise.resolve(true));
    mockMetadata.data.nineType = 'full';
    mockMetadata.data.holesPlayed = null;
  });

  it('resets and reloads when the server says the round was ended and the store does not', async () => {
    mockMetadata.data.holesPlayed = 6;

    renderTheHook();
    await tick();

    expect(mockStoreState.resetRound).toHaveBeenCalledTimes(1);
    expect(mockStoreState.loadFromOffline).toHaveBeenCalledWith(ROUND_ID);
  });

  it('adopts the authoritative server N over a different local end', async () => {
    mockStoreState.holesPlayed = 8;
    mockMetadata.data.holesPlayed = 6;

    renderTheHook();
    await tick();

    expect(mockStoreState.resetRound).toHaveBeenCalledTimes(1);
    expect(mockStoreState.loadFromOffline).toHaveBeenCalledWith(ROUND_ID);
  });

  it('recovers a later server end after nine-type recovery in the same mount, once per shape', async () => {
    mockMetadata.data = { ...mockMetadata.data, nineType: 'front9' };
    const hook = renderTheHook();
    await tick();
    expect(mockStoreState.resetRound).toHaveBeenCalledTimes(1);

    // Repeated reads of the same divergent shape cannot cause a reset loop.
    mockMetadata.data = { ...mockMetadata.data };
    hook.rerender({});
    await tick();
    expect(mockStoreState.resetRound).toHaveBeenCalledTimes(1);

    // The first reload succeeded; another device subsequently ends the round.
    mockStoreState.nineType = 'front9';
    hook.rerender({});
    await tick();
    mockMetadata.data = { ...mockMetadata.data, holesPlayed: 6 };
    hook.rerender({});
    await tick();
    expect(mockStoreState.resetRound).toHaveBeenCalledTimes(2);
    expect(mockStoreState.loadFromOffline).toHaveBeenCalledTimes(2);

    mockMetadata.data = { ...mockMetadata.data };
    hook.rerender({});
    await tick();
    expect(mockStoreState.resetRound).toHaveBeenCalledTimes(2);
    expect(mockStoreState.loadFromOffline).toHaveBeenCalledTimes(2);
  });

  it('leaves a pending local end alone while the server row is still NULL', async () => {
    mockStoreState.holesPlayed = 6;

    renderTheHook();
    await tick();

    expect(mockStoreState.resetRound).not.toHaveBeenCalled();
  });

  it('passes the server holes_played into the network initializeRound', async () => {
    mockStoreState.isInitialized = false;
    mockStoreState.currentRoundId = null;
    mockStoreState.loadFromOffline.mockImplementation(() => Promise.resolve(false));
    mockMetadata.data.holesPlayed = 6;

    renderTheHook();
    await tick();

    expect(mockStoreState.initializeRound).toHaveBeenCalledTimes(1);
    const args = mockStoreState.initializeRound.mock.calls[0] as unknown[];
    // (roundId, players, holes, gameType, isStandalone, allowedPlayerIds,
    //  selectedTeeData, handicapSource, playerTeeMap, nineType, startHole, holesPlayed)
    expect(args[9]).toBe('full');
    expect(args[11]).toBe(6);
  });

  it.each([
    ['full', 6, [1, 2, 3, 4, 5, 6, 7, 8], [1, 2, 3, 4, 5, 6]],
    ['back9', 6, [10, 11, 12, 13, 14, 15, 16, 17], [10, 11, 12, 13, 14, 15]],
    ['full', null, [1, 2, 3, 4, 5, 6, 7, 8], [1, 2, 3, 4, 5, 6]],
  ])('drops scores after a local end on %s (server marker %s)', async (nineType, serverMarker, remoteHoles, expectedHoles) => {
    // Phone A ended after 6 (RPC landed); its trimmed snapshot hasn't synced yet.
    mockStoreState.holesPlayed = 6;
    mockStoreState.nineType = nineType;
    mockMetadata.data.nineType = nineType;
    mockMetadata.data.holesPlayed = serverMarker;
    mockGroupScorecards = new Map([
      ['player-1', { id: 'scorecard-1', roundId: ROUND_ID, playerId: 'player-1', scores: {} }],
    ]);
    mockRemoteScorecards = [
      {
        player_id: 'player-1',
        scores: Object.fromEntries(remoteHoles.map((h) => [String(h), { strokes: 4 }])),
        total_gross: 32,
        total_net: 32,
        total_points: null,
        status: 'in-progress',
        revision: 3,
      },
    ];

    renderTheHook();
    await tick();

    expect(saveScorecard).toHaveBeenCalledTimes(1);
    const saved = (saveScorecard as jest.Mock).mock.calls[0][0] as Scorecard;
    expect(Object.keys(saved.scores).map(Number)).toEqual(expectedHoles);
  });
});
