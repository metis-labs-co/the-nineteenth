/**
 * usePlayerScorecard Hook Tests
 *
 * Focus: the read-only vs live-scoring data sourcing introduced so the screen
 * works when opened from a leaderboard (store NOT populated for that round).
 */

import { renderHook } from '@testing-library/react-native';
import { usePlayerScorecard } from './usePlayerScorecard';
import { useScorecardStore } from '@/store/scorecardStore';
import { useRoundScorecards, useRoundDetails } from '@/hooks/rounds/queries';
import type { Hole } from '@/types/database/base';

jest.mock('@/store/scorecardStore', () => ({
  useScorecardStore: jest.fn(),
}));

jest.mock('@/hooks/rounds/queries', () => ({
  useRoundScorecards: jest.fn(),
  useRoundDetails: jest.fn(),
}));

const mockedUseScorecardStore = useScorecardStore as unknown as jest.Mock;
const mockedUseRoundScorecards = useRoundScorecards as unknown as jest.Mock;
const mockedUseRoundDetails = useRoundDetails as unknown as jest.Mock;

// 18 par-4 holes, stroke index = hole number.
const holes: Hole[] = Array.from({ length: 18 }, (_, i) => ({
  number: (i + 1) as Hole['number'],
  par: 4,
  strokeIndex: i + 1,
}));

/** Default (empty) live store — not initialised, simulating "opened from leaderboard". */
function emptyStore() {
  return {
    currentRoundId: null,
    currentPlayers: [],
    groupScorecards: new Map(),
    holes: [],
    isLoading: false,
    isInitialized: false,
    isMultiBall: false,
    ballCount: 1,
    selectedTeeData: null,
    handicapSource: 'profile',
    startHole: 1,
  };
}

beforeEach(() => {
  jest.clearAllMocks();
  mockedUseScorecardStore.mockReturnValue(emptyStore());
  mockedUseRoundScorecards.mockReturnValue({ data: undefined, isLoading: false });
  mockedUseRoundDetails.mockReturnValue({ data: undefined, isLoading: false });
});

describe('usePlayerScorecard — read-only (from leaderboard)', () => {
  beforeEach(() => {
    mockedUseRoundScorecards.mockReturnValue({
      data: [
        {
          player_id: 'p1',
          // daily_handicap_used: 0 → strokes-received = 0 on every hole (deterministic).
          daily_handicap_used: 0,
          ga_handicap_used: 10,
          scores: {
            '1': { strokes: 4, putts: 2 }, // par → 2 pts
            '2': { strokes: 5, putts: 2 }, // bogey → 1 pt
            '3': { strokes: 3, putts: 1 }, // birdie → 3 pts
          },
          player: {
            id: 'p1',
            name: 'Alice',
            email: 'alice@example.com',
            handicap: 10,
            handicap_index: null,
            gender: 'male',
          },
        },
      ],
      isLoading: false,
    });
    mockedUseRoundDetails.mockReturnValue({
      data: {
        id: 'r1',
        nine_type: 'full',
        selected_tee: { slopeRating: 113, courseRating: 72 },
        course: { holes },
        competition: { handicap_source: 'profile' },
      },
      isLoading: false,
    });
  });

  it('flags read-only and loads the player from the database', () => {
    const { result } = renderHook(() => usePlayerScorecard('p1', 'r1'));

    expect(result.current.isReadOnly).toBe(true);
    expect(result.current.player?.name).toBe('Alice');
    expect(result.current.scorecard).toBeDefined();
  });

  it('computes gross and stableford totals from the fetched scores', () => {
    const { result } = renderHook(() => usePlayerScorecard('p1', 'r1'));

    expect(result.current.playerStats.totalGross).toBe(12); // 4 + 5 + 3
    expect(result.current.playerStats.totalStableford).toBe(6); // 2 + 1 + 3
  });

  it('does not fetch read-only data once the live store owns the round', () => {
    mockedUseScorecardStore.mockReturnValue({
      ...emptyStore(),
      currentRoundId: 'r1',
      isInitialized: true,
      holes,
      currentPlayers: [{ id: 'p1', name: 'Bob', handicap: 0, email: 'b@x.com' }],
      groupScorecards: new Map([['p1', { scores: { '1': { strokes: 4 } } }]]),
    });

    const { result } = renderHook(() => usePlayerScorecard('p1', 'r1'));

    expect(result.current.isReadOnly).toBe(false);
    expect(result.current.player?.name).toBe('Bob');
    // Read-only queries are gated off while the store owns the round.
    expect(mockedUseRoundScorecards).toHaveBeenCalledWith('r1', { enabled: false });
    expect(mockedUseRoundDetails).toHaveBeenCalledWith('r1', { enabled: false });
  });
});
