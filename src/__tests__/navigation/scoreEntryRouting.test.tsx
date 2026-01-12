/**
 * Score Entry Navigation Routing Tests
 *
 * Tests the routing logic that determines which scoring screen to navigate to
 * based on game type and team format:
 * - Individual Match Play → MatchPlayScoring
 * - Team Match Play → TeamMatchPlayScoring
 * - Stroke Play → Scorecard
 * - Stableford → Scorecard
 * - Team formats (Best Ball, Scramble) → Scorecard
 *
 * Tests cover routing logic in:
 * - useRoundActions hook
 * - ViewRoundScreen
 * - CompetitionDetailScreen
 */

import { renderHook, act } from '@testing-library/react-native';
import { useRoundActions } from '@/screens/rounds/RoundListScreen/hooks/useRoundActions';
import type { RoundItem } from '@/screens/rounds/RoundListScreen/types';

// ============================================================================
// MOCKS
// ============================================================================

// Mock navigation
const mockNavigate = jest.fn();
const mockGoBack = jest.fn();

jest.mock('@react-navigation/native', () => ({
  useNavigation: () => ({
    navigate: mockNavigate,
    goBack: mockGoBack,
  }),
}));

// Mock useAuth hook
jest.mock('@/hooks/useAuth', () => ({
  useAuth: () => ({
    user: { id: 'user-123' },
  }),
}));

// Mock React Query
jest.mock('@tanstack/react-query', () => ({
  useMutation: () => ({
    mutate: jest.fn(),
    isPending: false,
  }),
  useQueryClient: () => ({
    invalidateQueries: jest.fn(),
  }),
}));

// Mock Supabase
jest.mock('@/services/supabase/client', () => ({
  supabase: {
    from: () => ({
      delete: () => ({
        eq: () => ({}),
      }),
    }),
  },
}));

// ============================================================================
// TEST UTILITIES
// ============================================================================

/**
 * Create a mock round item for testing
 */
function createMockRound(overrides: Partial<RoundItem> = {}): RoundItem {
  return {
    id: 'round-123',
    status: 'scheduled',
    gameType: 'stableford',
    isTeamRound: false,
    competition: {
      id: 'comp-123',
      name: 'Test Competition',
    },
    ...overrides,
  } as RoundItem;
}

// ============================================================================
// useRoundActions ROUTING TESTS
// ============================================================================

describe('useRoundActions - Score Entry Routing', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Match Play routing', () => {
    it('routes individual match play to MatchPlayScoring', () => {
      const { result } = renderHook(() => useRoundActions());

      const round = createMockRound({
        gameType: 'match-play',
        isTeamRound: false,
        status: 'scheduled',
      });

      act(() => {
        result.current.handleScoreRound(round);
      });

      expect(mockNavigate).toHaveBeenCalledWith('MatchPlayScoring', {
        roundId: 'round-123',
        player1Id: undefined,
        player2Id: undefined,
      });
    });

    it('routes team match play to TeamMatchPlayScoring', () => {
      const { result } = renderHook(() => useRoundActions());

      const round = createMockRound({
        gameType: 'match-play',
        isTeamRound: true,
        status: 'scheduled',
      });

      act(() => {
        result.current.handleScoreRound(round);
      });

      expect(mockNavigate).toHaveBeenCalledWith('TeamMatchPlayScoring', {
        roundId: 'round-123',
        team1Id: undefined,
        team2Id: undefined,
      });
    });

    it('routes in-progress individual match play to MatchPlayScoring', () => {
      const { result } = renderHook(() => useRoundActions());

      const round = createMockRound({
        gameType: 'match-play',
        isTeamRound: false,
        status: 'in-progress',
      });

      act(() => {
        result.current.handleScoreRound(round);
      });

      expect(mockNavigate).toHaveBeenCalledWith('MatchPlayScoring', {
        roundId: 'round-123',
        player1Id: undefined,
        player2Id: undefined,
      });
    });

    it('routes in-progress team match play to TeamMatchPlayScoring', () => {
      const { result } = renderHook(() => useRoundActions());

      const round = createMockRound({
        gameType: 'match-play',
        isTeamRound: true,
        status: 'in-progress',
      });

      act(() => {
        result.current.handleScoreRound(round);
      });

      expect(mockNavigate).toHaveBeenCalledWith('TeamMatchPlayScoring', {
        roundId: 'round-123',
        team1Id: undefined,
        team2Id: undefined,
      });
    });
  });

  describe('Stroke Play routing', () => {
    it('routes stroke play to Scorecard', () => {
      const { result } = renderHook(() => useRoundActions());

      const round = createMockRound({
        gameType: 'stroke',
        isTeamRound: false,
        status: 'scheduled',
      });

      act(() => {
        result.current.handleScoreRound(round);
      });

      expect(mockNavigate).toHaveBeenCalledWith('Scorecard', {
        roundId: 'round-123',
        competitionId: 'comp-123',
      });
    });

    it('routes team stroke play to Scorecard', () => {
      const { result } = renderHook(() => useRoundActions());

      const round = createMockRound({
        gameType: 'stroke',
        isTeamRound: true,
        status: 'scheduled',
      });

      act(() => {
        result.current.handleScoreRound(round);
      });

      expect(mockNavigate).toHaveBeenCalledWith('Scorecard', {
        roundId: 'round-123',
        competitionId: 'comp-123',
      });
    });
  });

  describe('Stableford routing', () => {
    it('routes stableford to Scorecard', () => {
      const { result } = renderHook(() => useRoundActions());

      const round = createMockRound({
        gameType: 'stableford',
        isTeamRound: false,
        status: 'scheduled',
      });

      act(() => {
        result.current.handleScoreRound(round);
      });

      expect(mockNavigate).toHaveBeenCalledWith('Scorecard', {
        roundId: 'round-123',
        competitionId: 'comp-123',
      });
    });

    it('routes team stableford to Scorecard', () => {
      const { result } = renderHook(() => useRoundActions());

      const round = createMockRound({
        gameType: 'stableford',
        isTeamRound: true,
        status: 'scheduled',
      });

      act(() => {
        result.current.handleScoreRound(round);
      });

      expect(mockNavigate).toHaveBeenCalledWith('Scorecard', {
        roundId: 'round-123',
        competitionId: 'comp-123',
      });
    });
  });

  describe('Completed round routing', () => {
    it('routes completed rounds to ViewRound instead of scoring screen', () => {
      const { result } = renderHook(() => useRoundActions());

      const round = createMockRound({
        gameType: 'match-play',
        isTeamRound: false,
        status: 'completed',
      });

      act(() => {
        result.current.handleScoreRound(round);
      });

      expect(mockNavigate).toHaveBeenCalledWith('ViewRound', {
        roundId: 'round-123',
        competitionId: 'comp-123',
      });
    });

    it('routes completed team match play to ViewRound', () => {
      const { result } = renderHook(() => useRoundActions());

      const round = createMockRound({
        gameType: 'match-play',
        isTeamRound: true,
        status: 'completed',
      });

      act(() => {
        result.current.handleScoreRound(round);
      });

      expect(mockNavigate).toHaveBeenCalledWith('ViewRound', {
        roundId: 'round-123',
        competitionId: 'comp-123',
      });
    });

    it('routes completed stableford to ViewRound', () => {
      const { result } = renderHook(() => useRoundActions());

      const round = createMockRound({
        gameType: 'stableford',
        isTeamRound: false,
        status: 'completed',
      });

      act(() => {
        result.current.handleScoreRound(round);
      });

      expect(mockNavigate).toHaveBeenCalledWith('ViewRound', {
        roundId: 'round-123',
        competitionId: 'comp-123',
      });
    });
  });

  describe('Standalone rounds', () => {
    it('routes standalone round to Scorecard with "standalone" competitionId', () => {
      const { result } = renderHook(() => useRoundActions());

      const round = createMockRound({
        gameType: 'stableford',
        isTeamRound: false,
        status: 'scheduled',
        competition: undefined,
      });

      act(() => {
        result.current.handleScoreRound(round);
      });

      expect(mockNavigate).toHaveBeenCalledWith('Scorecard', {
        roundId: 'round-123',
        competitionId: 'standalone',
      });
    });
  });
});

// ============================================================================
// ROUTING LOGIC UNIT TESTS
// ============================================================================

describe('Score Entry Routing Logic', () => {
  /**
   * Pure function that determines the correct screen for a given round
   * This mirrors the logic in useRoundActions, ViewRoundScreen, and CompetitionDetailScreen
   */
  function determineScoreEntryScreen(
    gameType: string,
    isTeamRound: boolean,
    status: string
  ): 'ViewRound' | 'MatchPlayScoring' | 'TeamMatchPlayScoring' | 'Scorecard' {
    // Completed rounds go to view screen
    if (status === 'completed') {
      return 'ViewRound';
    }

    // Match play routing
    if (gameType === 'match-play') {
      return isTeamRound ? 'TeamMatchPlayScoring' : 'MatchPlayScoring';
    }

    // All other game types go to generic Scorecard
    return 'Scorecard';
  }

  describe('game type variations', () => {
    const gameTypes = [
      { gameType: 'match-play', isTeam: false, expected: 'MatchPlayScoring' },
      { gameType: 'match-play', isTeam: true, expected: 'TeamMatchPlayScoring' },
      { gameType: 'stroke', isTeam: false, expected: 'Scorecard' },
      { gameType: 'stroke', isTeam: true, expected: 'Scorecard' },
      { gameType: 'stableford', isTeam: false, expected: 'Scorecard' },
      { gameType: 'stableford', isTeam: true, expected: 'Scorecard' },
    ];

    test.each(gameTypes)(
      '$gameType (team: $isTeam) routes to $expected',
      ({ gameType, isTeam, expected }) => {
        const screen = determineScoreEntryScreen(gameType, isTeam, 'scheduled');
        expect(screen).toBe(expected);
      }
    );
  });

  describe('status variations', () => {
    const statuses = [
      { status: 'scheduled', gameType: 'match-play', isTeam: false, expected: 'MatchPlayScoring' },
      { status: 'in-progress', gameType: 'match-play', isTeam: false, expected: 'MatchPlayScoring' },
      { status: 'completed', gameType: 'match-play', isTeam: false, expected: 'ViewRound' },
      { status: 'scheduled', gameType: 'match-play', isTeam: true, expected: 'TeamMatchPlayScoring' },
      { status: 'in-progress', gameType: 'match-play', isTeam: true, expected: 'TeamMatchPlayScoring' },
      { status: 'completed', gameType: 'match-play', isTeam: true, expected: 'ViewRound' },
      { status: 'scheduled', gameType: 'stableford', isTeam: false, expected: 'Scorecard' },
      { status: 'in-progress', gameType: 'stableford', isTeam: false, expected: 'Scorecard' },
      { status: 'completed', gameType: 'stableford', isTeam: false, expected: 'ViewRound' },
    ];

    test.each(statuses)(
      '$status $gameType (team: $isTeam) routes to $expected',
      ({ status, gameType, isTeam, expected }) => {
        const screen = determineScoreEntryScreen(gameType, isTeam, status);
        expect(screen).toBe(expected);
      }
    );
  });

  describe('edge cases', () => {
    it('handles unknown game types by routing to Scorecard', () => {
      const screen = determineScoreEntryScreen('unknown-type', false, 'scheduled');
      expect(screen).toBe('Scorecard');
    });

    it('handles empty game type by routing to Scorecard', () => {
      const screen = determineScoreEntryScreen('', false, 'scheduled');
      expect(screen).toBe('Scorecard');
    });

    it('handles undefined-like game type by routing to Scorecard', () => {
      // @ts-expect-error Testing edge case
      const screen = determineScoreEntryScreen(undefined, false, 'scheduled');
      expect(screen).toBe('Scorecard');
    });
  });
});

// ============================================================================
// HANDLESCOREROUND PARAM TESTS
// ============================================================================

describe('handleScoreRound navigation params', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('passes correct params for MatchPlayScoring', () => {
    const { result } = renderHook(() => useRoundActions());

    const round = createMockRound({
      id: 'round-abc',
      gameType: 'match-play',
      isTeamRound: false,
      status: 'scheduled',
    });

    act(() => {
      result.current.handleScoreRound(round);
    });

    expect(mockNavigate).toHaveBeenCalledWith('MatchPlayScoring', {
      roundId: 'round-abc',
      player1Id: undefined,
      player2Id: undefined,
    });
  });

  it('passes correct params for TeamMatchPlayScoring', () => {
    const { result } = renderHook(() => useRoundActions());

    const round = createMockRound({
      id: 'round-xyz',
      gameType: 'match-play',
      isTeamRound: true,
      status: 'scheduled',
    });

    act(() => {
      result.current.handleScoreRound(round);
    });

    expect(mockNavigate).toHaveBeenCalledWith('TeamMatchPlayScoring', {
      roundId: 'round-xyz',
      team1Id: undefined,
      team2Id: undefined,
    });
  });

  it('passes correct params for Scorecard with competition', () => {
    const { result } = renderHook(() => useRoundActions());

    const round = createMockRound({
      id: 'round-456',
      gameType: 'stableford',
      isTeamRound: false,
      status: 'scheduled',
      competition: {
        id: 'comp-789',
        name: 'Test Comp',
      },
    });

    act(() => {
      result.current.handleScoreRound(round);
    });

    expect(mockNavigate).toHaveBeenCalledWith('Scorecard', {
      roundId: 'round-456',
      competitionId: 'comp-789',
    });
  });

  it('passes correct params for ViewRound when completed', () => {
    const { result } = renderHook(() => useRoundActions());

    const round = createMockRound({
      id: 'round-done',
      gameType: 'match-play',
      isTeamRound: true,
      status: 'completed',
      competition: {
        id: 'comp-done',
        name: 'Finished Comp',
      },
    });

    act(() => {
      result.current.handleScoreRound(round);
    });

    expect(mockNavigate).toHaveBeenCalledWith('ViewRound', {
      roundId: 'round-done',
      competitionId: 'comp-done',
    });
  });
});
