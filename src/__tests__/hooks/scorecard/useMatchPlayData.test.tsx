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
import type { Hole } from '@/types';

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
  currentPlayers: [] as { id: string }[],
  isInitialized: false,
  holes: [] as Hole[],
  nineType: 'full',
  loadFromOffline: jest.fn(() => Promise.resolve(false)),
  initializeRound: jest.fn(() => Promise.resolve()),
  resetRound: jest.fn(),
};

jest.mock('@/store/scorecardStore', () => {
  const useScorecardStore = jest.fn(() => mockStoreState);
  // Used by the Supabase hydration effect
  (useScorecardStore as unknown as { getState: () => unknown }).getState = () => ({
    groupScorecards: new Map(),
  });
  (useScorecardStore as unknown as { setState: (s: unknown) => void }).setState = jest.fn();
  return { useScorecardStore };
});

// Round metadata: a FRONT 9 match play round
const mockRoundData = {
  id: ROUND_ID,
  nine_type: 'front9',
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
      then: jest.fn((resolve: (v: unknown) => unknown) => resolve({ data: [], error: null })),
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
});
