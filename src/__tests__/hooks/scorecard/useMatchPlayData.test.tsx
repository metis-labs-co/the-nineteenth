/**
 * useMatchPlayData Hook Tests
 *
 * Regression tests for the 9-hole match play resume bug: the hook must be
 * nine_type-aware — returning nine-filtered holes, passing nineType into the
 * store's fallback initializeRound, and resetting when the round's nine_type
 * diverges from the store (e.g. after EditNineTypeSheet).
 *
 * @see src/hooks/scorecard/useMatchPlayData.ts
 */

import { renderHook, waitFor } from '@testing-library/react-native';
import { useMatchPlayData } from '@/hooks/scorecard/useMatchPlayData';
import { saveScorecard } from '@/services/offline/database';
import type { Hole } from '@/types';
import { Platform } from 'react-native';

// What hydrateFromSupabase sees: the store's cards and the server's rows.
let mockGroupScorecards = new Map<string, unknown>();
let mockRemoteScorecards: unknown[] = [];

// ============================================================================
// MOCK SETUP
// ============================================================================

const ROUND_ID = 'round-9h';
const P1 = 'player-1';
const P2 = 'player-2';

const mockEighteenHoles: Hole[] = Array.from({ length: 18 }, (_, i) => ({
  number: (i + 1) as Hole['number'],
  par: 4,
  strokeIndex: i + 1,
}));

// Mutable state the store mock returns; tests adjust per scenario
const mockStoreState = {
  currentRoundId: null as string | null,
  captureRoundScoringSession: () => {
    const identity = mockStoreState.currentRoundId;
    return { isCurrent: () => mockStoreState.currentRoundId === identity };
  },
  currentPlayers: [] as { id: string }[],
  isInitialized: false,
  holes: [] as Hole[],
  nineType: 'full',
  holesPlayed: null as number | null,
  loadFromOffline: jest.fn(() => Promise.resolve(false)),
  initializeRound: jest.fn(() => Promise.resolve()),
  resetRound: jest.fn(),
};

jest.mock('@/store/scorecardStore', () => {
  const useScorecardStore = jest.fn(() => mockStoreState);
  // Used by the Supabase hydration effect
  (useScorecardStore as unknown as { getState: () => unknown }).getState = () => ({
    ...mockStoreState,
    groupScorecards: mockGroupScorecards,
  });
  (useScorecardStore as unknown as { setState: (s: { groupScorecards?: typeof mockGroupScorecards }) => void }).setState = jest.fn((state: { groupScorecards?: typeof mockGroupScorecards }) => { if (state.groupScorecards) mockGroupScorecards = state.groupScorecards; });
  return { useScorecardStore };
});

// Round metadata: a FRONT 9 match play round
const mockRoundData = {
  id: ROUND_ID,
  nine_type: 'front9',
  holes_played: null as number | null,
  handicap_source: 'profile',
  selected_tee: { id: 'tee-1', name: 'Blue' },
  course: { id: 'course-1', name: 'East/South Course', club: { name: 'Test GC' } },
};

let mockRoundDetails: { data: typeof mockRoundData | null; isLoading: boolean; error: Error | null };

jest.mock('@/hooks/useRoundDetails', () => ({
  useRoundDetails: jest.fn(() => mockRoundDetails),
  useRoundPlayers: jest.fn(() => ({
    data: [
      { id: 'player-1', name: 'Sam', handicap: 8.3 },
      { id: 'player-2', name: 'Ben', handicap: 10.7 },
    ],
    isLoading: false,
    error: null,
  })),
}));

jest.mock('@/hooks/scorecard/useRoundCourse', () => ({
  useRoundCourse: jest.fn(() => ({
    holes: mockEighteenHoles,
    course: { id: 'course-1', name: 'East/South Course' },
    isLoading: false,
    error: null,
    refetch: jest.fn(),
  })),
}));

jest.mock('@/services/supabase/client', () => ({
  supabase: {
    from: jest.fn(() => ({
      select: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      then: jest.fn((resolve: (v: unknown) => unknown) => resolve({ data: mockRemoteScorecards, error: null })),
    })),
  },
}));

jest.mock('@/services/offline/database', () => ({
  saveScorecard: jest.fn(() => Promise.resolve()),
}));

jest.mock('@/utils/debugLogger', () => {
  const makeLogger = () => ({
    info: jest.fn(),
    debug: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
  });
  return {
    roundDataLogger: makeLogger(),
    storeLogger: makeLogger(),
    createModuleLogger: jest.fn(() => makeLogger()),
  };
});

// ============================================================================
// TEST SUITE
// ============================================================================

describe('useMatchPlayData (nine_type awareness)', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockRoundDetails = { data: mockRoundData, isLoading: false, error: null };
    mockStoreState.currentRoundId = null;
    mockStoreState.currentPlayers = [];
    mockStoreState.isInitialized = false;
    mockStoreState.holes = [];
    mockStoreState.nineType = 'full';
    mockStoreState.holesPlayed = null;
    mockGroupScorecards = new Map();
    mockRemoteScorecards = [];
    mockStoreState.loadFromOffline.mockImplementation(() => Promise.resolve(false));
  });

  const renderTheHook = () =>
    renderHook(() =>
      useMatchPlayData({ roundId: ROUND_ID, player1Id: P1, player2Id: P2 })
    );

  it('returns nine-filtered holes for a front9 round (not the raw 18)', async () => {
    const { result } = renderTheHook();

    await waitFor(() => {
      expect(result.current.holes).toHaveLength(9);
    });
    expect(result.current.holes.map((h) => h.number)).toEqual([1, 2, 3, 4, 5, 6, 7, 8, 9]);
  });

  it('passes nineType and filtered holes into the fallback initializeRound', async () => {
    renderTheHook();

    await waitFor(() => {
      expect(mockStoreState.initializeRound).toHaveBeenCalled();
    });

    const args = mockStoreState.initializeRound.mock.calls[0] as unknown[];
    // (roundId, players, holes, gameType, isStandalone, allowedPlayerIds,
    //  selectedTeeData, handicapSource, playerTeeMap, nineType, startHole)
    expect(args[0]).toBe(ROUND_ID);
    expect((args[2] as Hole[]).length).toBe(9);
    expect(args[3]).toBe('match-play');
    expect(args[9]).toBe('front9');
  });

  it('does not fall back to initializeRound before round metadata resolves', async () => {
    mockRoundDetails = { data: null, isLoading: true, error: null };

    renderTheHook();

    // Give effects a tick to run
    await new Promise((resolve) => setTimeout(resolve, 20));
    expect(mockStoreState.initializeRound).not.toHaveBeenCalled();
  });

  it('returns the store holes when the store is initialized for this round', async () => {
    const storeNine = mockEighteenHoles.slice(0, 9);
    mockStoreState.currentRoundId = ROUND_ID;
    mockStoreState.currentPlayers = [{ id: P1 }, { id: P2 }];
    mockStoreState.isInitialized = true;
    mockStoreState.holes = storeNine;
    mockStoreState.nineType = 'front9';

    const { result } = renderTheHook();

    await waitFor(() => {
      expect(result.current.holes).toBe(storeNine);
    });
    expect(mockStoreState.initializeRound).not.toHaveBeenCalled();
  });

  it('resets the store when its nineType diverges from the round (EditNineTypeSheet recovery)', async () => {
    // Store got poisoned to 'full'/18 holes; server says front9
    mockStoreState.currentRoundId = ROUND_ID;
    mockStoreState.currentPlayers = [{ id: P1 }, { id: P2 }];
    mockStoreState.isInitialized = true;
    mockStoreState.holes = mockEighteenHoles;
    mockStoreState.nineType = 'full';

    renderTheHook();

    await waitFor(() => {
      expect(mockStoreState.resetRound).toHaveBeenCalled();
    });
  });

  it('resets when the server says the round was ended and the store does not (another device)', async () => {
    mockRoundDetails = { data: { ...mockRoundData, holes_played: 6 }, isLoading: false, error: null };
    mockStoreState.currentRoundId = ROUND_ID;
    mockStoreState.currentPlayers = [{ id: P1 }, { id: P2 }];
    mockStoreState.isInitialized = true;
    mockStoreState.holes = mockEighteenHoles.slice(0, 9);
    mockStoreState.nineType = 'front9';

    renderTheHook();

    await waitFor(() => {
      expect(mockStoreState.resetRound).toHaveBeenCalled();
    });
  });

  it('adopts the authoritative server N over a different local end', async () => {
    mockRoundDetails = { data: { ...mockRoundData, holes_played: 6 }, isLoading: false, error: null };
    mockStoreState.currentRoundId = ROUND_ID;
    mockStoreState.currentPlayers = [{ id: P1 }, { id: P2 }];
    mockStoreState.isInitialized = true;
    mockStoreState.nineType = 'front9';
    mockStoreState.holesPlayed = 8;

    renderTheHook();
    await waitFor(() => expect(mockStoreState.resetRound).toHaveBeenCalledTimes(1));
    expect(mockStoreState.loadFromOffline).toHaveBeenCalledWith(ROUND_ID);
  });

  it('leaves a pending local end alone while the server row is still NULL', async () => {
    mockStoreState.currentRoundId = ROUND_ID;
    mockStoreState.currentPlayers = [{ id: P1 }, { id: P2 }];
    mockStoreState.isInitialized = true;
    mockStoreState.holes = mockEighteenHoles.slice(0, 9);
    mockStoreState.nineType = 'front9';
    mockStoreState.holesPlayed = 6;

    renderTheHook();
    await new Promise((resolve) => setTimeout(resolve, 20));

    expect(mockStoreState.resetRound).not.toHaveBeenCalled();
  });

  it('passes the server holes_played into the fallback initializeRound', async () => {
    mockRoundDetails = { data: { ...mockRoundData, holes_played: 4 }, isLoading: false, error: null };

    renderTheHook();

    await waitFor(() => {
      expect(mockStoreState.initializeRound).toHaveBeenCalled();
    });
    const args = mockStoreState.initializeRound.mock.calls[0] as unknown[];
    expect(args[9]).toBe('front9');
    expect(args[10]).toBeUndefined(); // startHole → the slice default (1)
    expect(args[11]).toBe(4);
  });

  it.each([
    ['full', 6, [1, 2, 3, 4, 5, 6, 7, 8], [1, 2, 3, 4, 5, 6]],
    ['back9', 6, [10, 11, 12, 13, 14, 15, 16, 17], [10, 11, 12, 13, 14, 15]],
    ['full', null, [1, 2, 3, 4, 5, 6, 7, 8], [1, 2, 3, 4, 5, 6]],
  ])('drops scores after a local end on %s (server marker %s)', async (nineType, serverMarker, remoteHoles, expectedHoles) => {
    mockRoundDetails = { data: { ...mockRoundData, nine_type: nineType, holes_played: serverMarker }, isLoading: false, error: null };
    mockStoreState.currentRoundId = ROUND_ID;
    mockStoreState.currentPlayers = [{ id: P1 }, { id: P2 }];
    mockStoreState.isInitialized = true;
    mockStoreState.holes = mockEighteenHoles;
    mockStoreState.nineType = nineType;
    mockStoreState.holesPlayed = 6;
    mockGroupScorecards = new Map([[P1, { id: 'scorecard-1', playerId: P1, scores: {} }]]);
    mockRemoteScorecards = [
      {
        player_id: P1,
        scores: Object.fromEntries(remoteHoles.map((h) => [String(h), { strokes: 4 }])),
        total_gross: 32,
        total_net: 32,
        status: 'completed',
      },
    ];

    renderTheHook();

    await waitFor(() => {
      expect(saveScorecard).toHaveBeenCalledTimes(1);
    });
    const saved = (saveScorecard as jest.Mock).mock.calls[0][0] as { scores: Record<number, unknown> };
    expect(Object.keys(saved.scores).map(Number)).toEqual(expectedHoles);
  });
  it('remote terminal hydration drops provisional blank-card none', async () => {
    mockStoreState.currentRoundId = ROUND_ID; mockStoreState.isInitialized = true;
    mockStoreState.nineType = 'front9'; mockStoreState.holesPlayed = null;
    mockGroupScorecards = new Map([['player-1', { id: 'local', playerId: 'player-1', scores: {}, status: 'in-progress', syncHandicapSource: 'none' }]]);
    mockRemoteScorecards = [{ player_id: 'player-1', scores: { '1': { strokes: 4 } }, status: 'completed', total_gross: 4, total_net: 4, revision: 3 }];
    renderTheHook(); await waitFor(() => expect(saveScorecard).toHaveBeenCalledTimes(1));
    expect((saveScorecard as jest.Mock).mock.calls.at(-1)[0].syncHandicapSource).toBeUndefined();
  });

  it('does not install remote scores when provisional replacement is refused', async () => {
    mockStoreState.currentRoundId = ROUND_ID; mockStoreState.isInitialized = true;
    mockStoreState.nineType = 'front9'; mockStoreState.holesPlayed = null;
    const local = { id: 'local', playerId: 'player-1', scores: {}, status: 'in-progress', syncHandicapSource: 'none' };
    mockGroupScorecards = new Map([['player-1', local]]);
    mockRemoteScorecards = [{ player_id: 'player-1', scores: { '1': { strokes: 4 } }, status: 'completed', total_gross: 4, total_net: 4, revision: 3 }];
    (saveScorecard as jest.Mock).mockRejectedValueOnce(new Error('provisional changed'));
    renderTheHook(); await waitFor(() => expect(saveScorecard).toHaveBeenCalledTimes(1));
    expect(mockGroupScorecards.get('player-1')).toBe(local);
  });
  it.each([true, false])(
    'web blank match-play hydration keeps existing behavior with remote scores=%s',
    async (hasScores) => {
      const originalOS = Platform.OS;
      Object.defineProperty(Platform, 'OS', { configurable: true, value: 'web' });
      try {
        mockStoreState.currentRoundId = ROUND_ID;
        mockStoreState.isInitialized = true;
        mockStoreState.nineType = 'front9';
        mockStoreState.holesPlayed = null;
        const local = { id: 'local', playerId: P1, scores: {}, status: 'in-progress' };
        mockGroupScorecards = new Map([[P1, local]]);
        mockRemoteScorecards = [
          {
            player_id: P1,
            scores: hasScores ? { '1': { strokes: 4 } } : {},
            status: 'completed',
            total_gross: 4,
            total_net: 4,
            revision: 3,
          },
        ];
        if (hasScores)
          (saveScorecard as jest.Mock).mockImplementationOnce((_card, options) =>
            options?.replaceProvisionalHandicapSource
              ? Promise.reject(new Error('Native-exclusive replacement unavailable on web'))
              : Promise.resolve()
          );
        renderTheHook();
        if (hasScores) {
          await waitFor(() => expect(saveScorecard).toHaveBeenCalledTimes(1));
          expect((saveScorecard as jest.Mock).mock.calls[0][1]).not.toHaveProperty('replaceProvisionalHandicapSource');
          expect(mockGroupScorecards.get(P1)).toMatchObject({
            scores: { 1: { strokes: 4 } },
            status: 'completed',
          });
          expect((saveScorecard as jest.Mock).mock.calls[0][0].syncHandicapSource).toBeUndefined();
        } else {
          await new Promise((resolve) => setTimeout(resolve, 20));
          expect(saveScorecard).not.toHaveBeenCalled();
          expect(mockGroupScorecards.get(P1)).toBe(local);
        }
      } finally {
        Object.defineProperty(Platform, 'OS', { configurable: true, value: originalOS });
      }
    }
  );



});
