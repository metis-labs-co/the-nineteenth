/**
 * useMatchPlayScoring Hook Tests
 *
 * Tests for the match play scoring hook that manages:
 * - Score updates persisted to scorecard store
 * - Match status derived from stored scores
 * - Hole results calculated from raw scores
 * - Pickup (concede hole) handling
 */

import { renderHook, act } from '@testing-library/react-native';
import { useMatchPlayScoring } from './useMatchPlayScoring';
import { useScorecardStore } from '@/store/scorecardStore';
import { PICKUP_SCORE } from '@/constants/scoring';
import type { Hole } from '@/types';

// ============================================================================
// MOCKS
// ============================================================================

// Mock the scorecard store
const mockSetPlayerScore = jest.fn();
const mockGetPlayerScore = jest.fn();
const mockGetHoleInfo = jest.fn();

jest.mock('@/store/scorecardStore', () => ({
  useScorecardStore: jest.fn(),
}));

const mockedUseScorecardStore = useScorecardStore as jest.MockedFunction<typeof useScorecardStore>;

// ============================================================================
// TEST FIXTURES
// ============================================================================

function create18Holes(): Hole[] {
  const holes: Hole[] = [];
  for (let i = 1; i <= 18; i++) {
    holes.push({
      number: i as Hole['number'],
      par: (i % 3 === 0 ? 3 : i % 5 === 0 ? 5 : 4) as Hole['par'],
      strokeIndex: i,
    });
  }
  return holes;
}

const defaultHoles = create18Holes();

function buildGroupScorecards(
  scores: Record<string, Record<number, { strokes: number }>>
): Map<string, { scores: Record<number, { strokes: number }> }> {
  const map = new Map<string, { scores: Record<number, { strokes: number }> }>();
  for (const [playerId, playerScores] of Object.entries(scores)) {
    map.set(playerId, { scores: playerScores });
  }
  return map;
}

function setupStoreMock(
  scores: Record<string, Record<number, { strokes: number }>> = {},
  holes: Hole[] = defaultHoles
) {
  mockGetPlayerScore.mockImplementation((playerId: string, holeNumber: number) => {
    const playerScores = scores[playerId];
    if (!playerScores) return undefined;
    const score = playerScores[holeNumber];
    return score ? { strokes: score.strokes } : undefined;
  });

  mockGetHoleInfo.mockImplementation((holeNumber: number) => {
    return holes.find((h) => h.number === holeNumber);
  });

  const groupScorecards = buildGroupScorecards(scores);

  mockedUseScorecardStore.mockReturnValue({
    getPlayerScore: mockGetPlayerScore,
    setPlayerScore: mockSetPlayerScore,
    getHoleInfo: mockGetHoleInfo,
    holes,
    groupScorecards,
  } as any);
}

const defaultParams = {
  player1Id: 'player-1',
  player2Id: 'player-2',
  player1Name: 'John Smith',
  player2Name: 'Jane Doe',
  player1Handicap: 18,
  player2Handicap: 10,
  currentHole: 1,
};

// ============================================================================
// TESTS
// ============================================================================

describe('useMatchPlayScoring', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    setupStoreMock();
  });

  describe('initialization', () => {
    it('initializes with no hole results when no scores exist', () => {
      const { result } = renderHook(() => useMatchPlayScoring({
        ...defaultParams,
        player2Handicap: defaultParams.player1Handicap,
      }));

      expect(result.current.holeResults).toBeDefined();
      expect(result.current.matchStatus.status).toBe('in_progress');
      expect(result.current.isMatchComplete).toBe(false);
    });

    it('returns correct match status text for all square', () => {
      const { result } = renderHook(() =>
        useMatchPlayScoring({
          ...defaultParams,
          player2Handicap: defaultParams.player1Handicap,
        })
      );

      expect(result.current.matchStatusText).toBe('All Square with 18 to play');
    });
  });

  describe('handleScoreSelect', () => {
    it('calls setPlayerScore with correct player ID for player1', () => {
      const { result } = renderHook(() => useMatchPlayScoring(defaultParams));

      act(() => {
        result.current.handleScoreSelect('player1', 4);
      });

      expect(mockSetPlayerScore).toHaveBeenCalledWith('player-1', 1, 4);
    });

    it('calls setPlayerScore with correct player ID for player2', () => {
      const { result } = renderHook(() => useMatchPlayScoring(defaultParams));

      act(() => {
        result.current.handleScoreSelect('player2', 5);
      });

      expect(mockSetPlayerScore).toHaveBeenCalledWith('player-2', 1, 5);
    });

    it('allows score edits even when match is complete (scores locked after submission)', () => {
      // Setup a complete match (player1 wins 10 holes, player2 wins 0)
      const winningScores: Record<string, Record<number, { strokes: number }>> = {
        'player-1': {},
        'player-2': {},
      };
      for (let i = 1; i <= 14; i++) {
        winningScores['player-1'][i] = { strokes: 3 };
        winningScores['player-2'][i] = { strokes: 6 };
      }
      setupStoreMock(winningScores);

      const { result } = renderHook(() => useMatchPlayScoring(defaultParams));

      expect(result.current.isMatchComplete).toBe(true);

      act(() => {
        result.current.handleScoreSelect('player1', 4);
      });

      // Score edits are allowed even after match is complete
      expect(mockSetPlayerScore).toHaveBeenCalledWith('player-1', 1, 4);
    });
  });

  describe('handleScoreAdjust', () => {
    it('increments score from par', () => {
      setupStoreMock({
        'player-1': { 1: { strokes: 4 } },
      });

      const { result } = renderHook(() => useMatchPlayScoring(defaultParams));

      act(() => {
        result.current.handleScoreAdjust('player1', 1);
      });

      expect(mockSetPlayerScore).toHaveBeenCalledWith('player-1', 1, 5);
    });

    it('decrements score', () => {
      setupStoreMock({
        'player-1': { 1: { strokes: 5 } },
      });

      const { result } = renderHook(() => useMatchPlayScoring(defaultParams));

      act(() => {
        result.current.handleScoreAdjust('player1', -1);
      });

      expect(mockSetPlayerScore).toHaveBeenCalledWith('player-1', 1, 4);
    });

    it('initializes to par when no score exists', () => {
      setupStoreMock({});

      const { result } = renderHook(() => useMatchPlayScoring(defaultParams));

      act(() => {
        result.current.handleScoreAdjust('player1', 1);
      });

      // Hole 1 has par 4
      expect(mockSetPlayerScore).toHaveBeenCalledWith('player-1', 1, 4);
    });

    it('does not go below minimum score of 1', () => {
      setupStoreMock({
        'player-1': { 1: { strokes: 1 } },
      });

      const { result } = renderHook(() => useMatchPlayScoring(defaultParams));

      act(() => {
        result.current.handleScoreAdjust('player1', -1);
      });

      expect(mockSetPlayerScore).toHaveBeenCalledWith('player-1', 1, 1);
    });

    it('increments a blow-up score above double bogey without conceding the hole', () => {
      // Hole 1 is par 4, so double bogey is 6. A 6 must be a real, scored hole
      // (not a pickup) and the stepper must keep going past it.
      setupStoreMock({
        'player-1': { 1: { strokes: 6 } },
      });

      const { result } = renderHook(() => useMatchPlayScoring(defaultParams));

      expect(result.current.isPlayerPickedUp('player1')).toBe(false);

      act(() => {
        result.current.handleScoreAdjust('player1', 1);
      });

      expect(mockSetPlayerScore).toHaveBeenCalledWith('player-1', 1, 7);
    });

    it('caps manual score one below the pickup sentinel', () => {
      // PICKUP_SCORE is reserved for explicit concessions, so manual entry must
      // never reach it via the stepper.
      setupStoreMock({
        'player-1': { 1: { strokes: PICKUP_SCORE - 1 } },
      });

      const { result } = renderHook(() => useMatchPlayScoring(defaultParams));

      act(() => {
        result.current.handleScoreAdjust('player1', 1);
      });

      expect(mockSetPlayerScore).toHaveBeenCalledWith('player-1', 1, PICKUP_SCORE - 1);
    });
  });

  describe('handlePickUp', () => {
    it('stores the explicit pickup sentinel for player1', () => {
      setupStoreMock({});

      const { result } = renderHook(() => useMatchPlayScoring(defaultParams));

      act(() => {
        result.current.handlePickUp('player1');
      });

      // A concession is always the same sentinel, independent of par/handicap.
      expect(mockSetPlayerScore).toHaveBeenCalledWith('player-1', 1, PICKUP_SCORE);
    });

    it('stores the same pickup sentinel for player2 regardless of handicap', () => {
      setupStoreMock({});

      const { result } = renderHook(() => useMatchPlayScoring(defaultParams));

      act(() => {
        result.current.handlePickUp('player2');
      });

      expect(mockSetPlayerScore).toHaveBeenCalledWith('player-2', 1, PICKUP_SCORE);
    });

    it('toggles pickup off by setting back to par', () => {
      // First, set up a conceded hole
      setupStoreMock({
        'player-1': { 1: { strokes: PICKUP_SCORE } },
      });

      const { result } = renderHook(() => useMatchPlayScoring(defaultParams));

      // Player should be detected as picked up
      expect(result.current.isPlayerPickedUp('player1')).toBe(true);

      act(() => {
        result.current.handlePickUp('player1');
      });

      // Should toggle off to par
      expect(mockSetPlayerScore).toHaveBeenCalledWith('player-1', 1, 4);
    });
  });

  describe('getHoleResult', () => {
    it('returns empty result for holes with no scores', () => {
      setupStoreMock({});

      const { result } = renderHook(() => useMatchPlayScoring(defaultParams));

      const holeResult = result.current.getHoleResult(1);

      expect(holeResult.player1Score).toBeNull();
      expect(holeResult.player2Score).toBeNull();
      expect(holeResult.winner).toBeNull();
    });

    it('determines player1 as winner when they have lower score', () => {
      setupStoreMock({
        'player-1': { 1: { strokes: 4 } },
        'player-2': { 1: { strokes: 5 } },
      });

      const { result } = renderHook(() => useMatchPlayScoring(defaultParams));

      const holeResult = result.current.getHoleResult(1);

      expect(holeResult.winner).toBe('player1');
    });

    it('determines player2 as winner when they have lower score', () => {
      setupStoreMock({
        'player-1': { 1: { strokes: 5 } },
        'player-2': { 1: { strokes: 4 } },
      });

      const { result } = renderHook(() => useMatchPlayScoring({
        ...defaultParams,
        player2Handicap: defaultParams.player1Handicap,
      }));

      const holeResult = result.current.getHoleResult(1);

      expect(holeResult.winner).toBe('player2');
    });

    it('determines halved when scores are equal', () => {
      setupStoreMock({
        'player-1': { 1: { strokes: 4 } },
        'player-2': { 1: { strokes: 4 } },
      });

      const { result } = renderHook(() => useMatchPlayScoring({
        ...defaultParams,
        player2Handicap: defaultParams.player1Handicap,
      }));

      const holeResult = result.current.getHoleResult(1);

      expect(holeResult.winner).toBe('halved');
    });

    it('applies handicap strokes when comparing equal gross scores', () => {
      // Match-play difference is 8, so the higher-handicap player receives a
      // stroke on SI 1..8. Equal gross on SI 8 resolves to P1 on net.
      setupStoreMock({
        'player-1': { 8: { strokes: 4 } },
        'player-2': { 8: { strokes: 4 } },
      });

      const { result } = renderHook(() =>
        useMatchPlayScoring({ ...defaultParams, currentHole: 8 })
      );

      expect(result.current.getHoleResult(8).winner).toBe('player1');
    });

    it('halves the hole when both players receive the same strokes on the hole', () => {
      // Hole 9 is outside the 8-stroke handicap difference, so neither player
      // receives a stroke and equal gross remains halved.
      setupStoreMock({
        'player-1': { 9: { strokes: 5 } },
        'player-2': { 9: { strokes: 5 } },
      });

      const { result } = renderHook(() => useMatchPlayScoring(defaultParams));

      expect(result.current.getHoleResult(9).winner).toBe('halved');
    });

    it('records a blow-up score above double bogey as a real score, not a pickup', () => {
      // Hole 1 is par 4 → double bogey is 6. A 7 used to be swallowed as a
      // pickup; now it must be a scored hole decided on merit.
      setupStoreMock({
        'player-1': { 1: { strokes: 7 } },
        'player-2': { 1: { strokes: 4 } },
      });

      const { result } = renderHook(() => useMatchPlayScoring({
        ...defaultParams,
        player2Handicap: defaultParams.player1Handicap,
      }));

      const holeResult = result.current.getHoleResult(1);

      expect(holeResult.player1PickedUp).toBe(false);
      expect(holeResult.player1Score).toBe(7);
      // Net: P1 7-1=6 vs P2 4-1=3 → player2 wins on merit.
      expect(holeResult.winner).toBe('player2');
    });

    it('awards the hole to the opponent when a player concedes and the opponent has a score', () => {
      setupStoreMock({
        'player-1': { 1: { strokes: PICKUP_SCORE } },
        'player-2': { 1: { strokes: 4 } },
      });

      const { result } = renderHook(() => useMatchPlayScoring({
        ...defaultParams,
        player2Handicap: defaultParams.player1Handicap,
      }));

      const holeResult = result.current.getHoleResult(1);

      expect(holeResult.player1PickedUp).toBe(true);
      expect(holeResult.player2PickedUp).toBe(false);
      expect(holeResult.winner).toBe('player2');
    });

    it('leaves the hole undecided when a player concedes but the opponent has no score', () => {
      setupStoreMock({
        'player-1': { 1: { strokes: PICKUP_SCORE } },
        // player-2 has not entered a score yet
      });

      const { result } = renderHook(() => useMatchPlayScoring(defaultParams));

      const holeResult = result.current.getHoleResult(1);

      expect(holeResult.player1PickedUp).toBe(true);
      expect(holeResult.winner).toBeNull();
    });

    it('halves the hole when both players concede', () => {
      setupStoreMock({
        'player-1': { 1: { strokes: PICKUP_SCORE } },
        'player-2': { 1: { strokes: PICKUP_SCORE } },
      });

      const { result } = renderHook(() => useMatchPlayScoring(defaultParams));

      expect(result.current.getHoleResult(1).winner).toBe('halved');
    });
  });

  describe('match status calculations', () => {
    it('calculates player1 leading correctly', () => {
      setupStoreMock({
        'player-1': { 1: { strokes: 4 }, 2: { strokes: 3 } },
        'player-2': { 1: { strokes: 5 }, 2: { strokes: 4 } },
      });

      const { result } = renderHook(() => useMatchPlayScoring({
        ...defaultParams,
        player2Handicap: defaultParams.player1Handicap,
      }));

      expect(result.current.matchStatus.status).toBe('in_progress');
      if (result.current.matchStatus.status === 'in_progress') {
        expect(result.current.matchStatus.leader).toBe('player1');
        expect(result.current.matchStatus.holesUp).toBe(2);
        expect(result.current.matchStatus.holesRemaining).toBe(16);
      }
    });

    it('calculates all square correctly', () => {
      setupStoreMock({
        'player-1': { 1: { strokes: 4 }, 2: { strokes: 5 } },
        'player-2': { 1: { strokes: 5 }, 2: { strokes: 4 } },
      });

      const { result } = renderHook(() => useMatchPlayScoring({
        ...defaultParams,
        player2Handicap: defaultParams.player1Handicap,
      }));

      expect(result.current.matchStatus.status).toBe('in_progress');
      if (result.current.matchStatus.status === 'in_progress') {
        expect(result.current.matchStatus.leader).toBeNull();
        expect(result.current.matchStatus.holesUp).toBe(0);
      }
    });

    it('detects match complete when lead exceeds remaining holes', () => {
      // Player1 wins 6 holes, 0 halved, 10 played = 6 up with 8 remaining
      // Actually need to make it 5 up with 4 remaining for early finish
      const scores: Record<string, Record<number, { strokes: number }>> = {
        'player-1': {},
        'player-2': {},
      };
      for (let i = 1; i <= 14; i++) {
        scores['player-1'][i] = { strokes: 3 };
        scores['player-2'][i] = { strokes: i <= 9 ? 6 : 3 }; // Player1 wins first 9
      }
      setupStoreMock(scores);

      const { result } = renderHook(() => useMatchPlayScoring(defaultParams));

      // 9 up with 4 to play = complete
      expect(result.current.matchStatus.status).toBe('complete');
      expect(result.current.isMatchComplete).toBe(true);
    });
  });

  describe('player match status', () => {
    it('returns correct status for leading player', () => {
      setupStoreMock({
        'player-1': { 1: { strokes: 4 }, 2: { strokes: 3 } },
        'player-2': { 1: { strokes: 5 }, 2: { strokes: 4 } },
      });

      const { result } = renderHook(() => useMatchPlayScoring(defaultParams));

      expect(result.current.player1MatchStatus.text).toBe('2 UP');
      expect(result.current.player1MatchStatus.type).toBe('up');
      expect(result.current.player2MatchStatus.text).toBe('2 DN');
      expect(result.current.player2MatchStatus.type).toBe('down');
    });

    it('returns AS for all square', () => {
      setupStoreMock({
        'player-1': { 1: { strokes: 4 } },
        'player-2': { 1: { strokes: 4 } },
      });

      const { result } = renderHook(() =>
        useMatchPlayScoring({
          ...defaultParams,
          player2Handicap: defaultParams.player1Handicap,
        })
      );

      expect(result.current.player1MatchStatus.text).toBe('A/S');
      expect(result.current.player2MatchStatus.text).toBe('A/S');
    });
  });

  describe('getPlayerScore', () => {
    it('returns null when no score exists', () => {
      setupStoreMock({});

      const { result } = renderHook(() => useMatchPlayScoring(defaultParams));

      expect(result.current.getPlayerScore('player1')).toBeNull();
    });

    it('returns score when it exists', () => {
      setupStoreMock({
        'player-1': { 1: { strokes: 4 } },
      });

      const { result } = renderHook(() => useMatchPlayScoring(defaultParams));

      expect(result.current.getPlayerScore('player1')).toBe(4);
    });
  });

  describe('isPlayerPickedUp', () => {
    it('returns false when player has not picked up', () => {
      setupStoreMock({
        'player-1': { 1: { strokes: 4 } },
      });

      const { result } = renderHook(() => useMatchPlayScoring(defaultParams));

      expect(result.current.isPlayerPickedUp('player1')).toBe(false);
    });

    it('returns true when player has picked up', () => {
      setupStoreMock({
        'player-1': { 1: { strokes: PICKUP_SCORE } }, // Conceded hole
      });

      const { result } = renderHook(() => useMatchPlayScoring(defaultParams));

      expect(result.current.isPlayerPickedUp('player1')).toBe(true);
    });
  });

  describe('getScoreColor', () => {
    it('returns birdie color for under par', () => {
      const { result } = renderHook(() => useMatchPlayScoring(defaultParams));

      const colors = {
        textSecondary: '#666',
        birdie: '#00AA00',
        par: '#000',
        bogey: '#FF6600',
        doubleBogey: '#FF0000',
      };

      expect(result.current.getScoreColor(3, 4, colors)).toBe('#00AA00');
    });

    it('returns par color for par', () => {
      const { result } = renderHook(() => useMatchPlayScoring(defaultParams));

      const colors = {
        textSecondary: '#666',
        birdie: '#00AA00',
        par: '#000',
        bogey: '#FF6600',
        doubleBogey: '#FF0000',
      };

      expect(result.current.getScoreColor(4, 4, colors)).toBe('#000');
    });

    it('returns bogey color for bogey', () => {
      const { result } = renderHook(() => useMatchPlayScoring(defaultParams));

      const colors = {
        textSecondary: '#666',
        birdie: '#00AA00',
        par: '#000',
        bogey: '#FF6600',
        doubleBogey: '#FF0000',
      };

      expect(result.current.getScoreColor(5, 4, colors)).toBe('#FF6600');
    });

    it('returns doubleBogey color for double or worse', () => {
      const { result } = renderHook(() => useMatchPlayScoring(defaultParams));

      const colors = {
        textSecondary: '#666',
        birdie: '#00AA00',
        par: '#000',
        bogey: '#FF6600',
        doubleBogey: '#FF0000',
      };

      expect(result.current.getScoreColor(6, 4, colors)).toBe('#FF0000');
    });

    it('returns textSecondary color for null score', () => {
      const { result } = renderHook(() => useMatchPlayScoring(defaultParams));

      const colors = {
        textSecondary: '#666',
        birdie: '#00AA00',
        par: '#000',
        bogey: '#FF6600',
        doubleBogey: '#FF0000',
      };

      expect(result.current.getScoreColor(null, 4, colors)).toBe('#666');
    });
  });

  describe('current hole tracking', () => {
    it('uses the provided currentHole for score operations', () => {
      setupStoreMock({});

      const { result } = renderHook(() =>
        useMatchPlayScoring({ ...defaultParams, currentHole: 5 })
      );

      act(() => {
        result.current.handleScoreSelect('player1', 4);
      });

      expect(mockSetPlayerScore).toHaveBeenCalledWith('player-1', 5, 4);
    });

    it('recalculates hole results when currentHole changes', () => {
      setupStoreMock({
        'player-1': { 1: { strokes: 4 }, 5: { strokes: 3 } },
        'player-2': { 1: { strokes: 5 }, 5: { strokes: 4 } },
      });

      const { result, rerender } = renderHook(
        (props) => useMatchPlayScoring(props),
        { initialProps: { ...defaultParams, currentHole: 1 } }
      );

      expect(result.current.getPlayerScore('player1')).toBe(4);

      rerender({ ...defaultParams, currentHole: 5 });

      expect(result.current.getPlayerScore('player1')).toBe(3);
    });
  });
});
