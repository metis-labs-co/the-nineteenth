/**
 * RoundLeaderboard Component Tests
 *
 * Tests for the round leaderboard component including:
 * - Loading, error, and empty states
 * - Stableford leaderboard display
 * - Stroke play leaderboard with gross/net scores
 * - Match play matchup cards
 * - Team round display
 * - Current user highlighting
 * - Round metadata header
 */

import React from 'react';
import { render, screen } from '@/__tests__/utils/renderHelpers';
import { RoundLeaderboard } from './RoundLeaderboard';
import type {
  RoundLeaderboardEntry,
  PlayerLeaderboardEntry,
  TeamLeaderboardEntry,
  RoundLeaderboardResponse,
  StablefordScoreData,
  StrokeScoreData,
  MatchPlayScoreData,
  TeamScoreData,
} from '@/hooks/useRoundLeaderboard';

// =====================================================
// MOCKS
// =====================================================

// Mock the useRoundLeaderboard hook
const mockUseRoundLeaderboard = jest.fn();

jest.mock('@/hooks/useRoundLeaderboard', () => ({
  useRoundLeaderboard: (...args: unknown[]) => mockUseRoundLeaderboard(...args),
  isTeamEntry: (entry: RoundLeaderboardEntry) => entry.isTeamResult,
  isStablefordScore: (data: StablefordScoreData | StrokeScoreData | MatchPlayScoreData | TeamScoreData) =>
    data.type === 'stableford',
  isStrokeScore: (data: StablefordScoreData | StrokeScoreData | MatchPlayScoreData | TeamScoreData) =>
    data.type === 'stroke',
  isMatchPlayScore: (data: StablefordScoreData | StrokeScoreData | MatchPlayScoreData | TeamScoreData) =>
    data.type === 'match-play',
  isTeamScore: (data: StablefordScoreData | StrokeScoreData | MatchPlayScoreData | TeamScoreData) =>
    data.type === 'team',
}));

// Mock icons
jest.mock('@tabler/icons-react-native', () => {
  const { Text } = require('react-native');
  return {
    IconTrophy: () => <Text>TrophyIcon</Text>,
    IconUsers: () => <Text>UsersIcon</Text>,
    IconSwords: () => <Text>SwordsIcon</Text>,
    IconCalendar: () => <Text>CalendarIcon</Text>,
    IconClock: () => <Text>ClockIcon</Text>,
  };
});

// Mock DateTimeDisplay component
jest.mock('@/components/common/DateTimeDisplay', () => {
  const { View: _View, Text } = require('react-native');
  return {
    DateTimeDisplay: ({ date }: { date: string }) => (
      <_View testID="datetime-display">
        <Text>{date}</Text>
      </_View>
    ),
  };
});

// Mock Pill component
jest.mock('@/components/common/Pill', () => {
  const { View, Text } = require('react-native');
  return {
    Pill: ({ label }: { label: string }) => (
      <View testID="pill">
        <Text>{label}</Text>
      </View>
    ),
  };
});

// Mock LoadingSpinner
jest.mock('@/components/common', () => {
  const { View, Text } = require('react-native');
  return {
    LoadingSpinner: ({ message }: { message: string }) => (
      <View testID="loading-spinner">
        <Text>{message}</Text>
      </View>
    ),
  };
});

// Mock ErrorState
jest.mock('@/components/common/ErrorState', () => {
  const { View, Text, TouchableOpacity } = require('react-native');
  return {
    ErrorState: ({ title, error, onRetry }: { title: string; error: string; onRetry: () => void }) => (
      <View testID="error-state">
        <Text>{title}</Text>
        <Text>{error}</Text>
        <TouchableOpacity testID="retry-button" onPress={onRetry}>
          <Text>Retry</Text>
        </TouchableOpacity>
      </View>
    ),
  };
});

// Mock EmptyState
jest.mock('@/components/common/EmptyState', () => {
  const { View, Text } = require('react-native');
  return {
    EmptyState: ({ title, message }: { title: string; message: string }) => (
      <View testID="empty-state">
        <Text>{title}</Text>
        <Text>{message}</Text>
      </View>
    ),
  };
});

// =====================================================
// TEST FIXTURES
// =====================================================

/**
 * Create a Stableford player entry
 */
function createStablefordPlayer(
  playerId: string,
  name: string,
  handicap: number,
  points: number,
  position: number
): PlayerLeaderboardEntry {
  return {
    isTeamResult: false,
    position,
    competitionPoints: position <= 3 ? 11 - position * 3 : 1,
    playerId,
    playerName: name,
    handicap,
    scoreData: {
      type: 'stableford',
      totalPoints: points,
    },
  };
}

/**
 * Create a Stroke play player entry
 */
function createStrokePlayer(
  playerId: string,
  name: string,
  handicap: number,
  grossScore: number,
  position: number
): PlayerLeaderboardEntry {
  return {
    isTeamResult: false,
    position,
    competitionPoints: position <= 3 ? 11 - position * 3 : 1,
    playerId,
    playerName: name,
    handicap,
    scoreData: {
      type: 'stroke',
      grossScore,
      netScore: grossScore - handicap,
    },
  };
}

/**
 * Create a Match play player entry
 */
function createMatchPlayPlayer(
  playerId: string,
  name: string,
  opponentName: string,
  result: 'win' | 'loss' | 'halved',
  margin: string,
  position: number
): PlayerLeaderboardEntry {
  return {
    isTeamResult: false,
    position,
    competitionPoints: result === 'win' ? 3 : result === 'halved' ? 1 : 0,
    playerId,
    playerName: name,
    handicap: 15,
    scoreData: {
      type: 'match-play',
      matchResult: result,
      holesUpDown: margin,
      opponentId: `opponent-${playerId}`,
      opponentName,
      holesWon: result === 'win' ? 5 : result === 'halved' ? 3 : 2,
      holesLost: result === 'loss' ? 5 : result === 'halved' ? 3 : 2,
      holesHalved: 3,
    },
  };
}

/**
 * Create a team entry
 */
function createTeamEntry(
  teamId: string,
  teamName: string,
  members: { playerId: string; playerName: string; handicap: number }[],
  teamScore: number,
  position: number
): TeamLeaderboardEntry {
  return {
    isTeamResult: true,
    position,
    competitionPoints: position <= 3 ? 11 - position * 3 : 1,
    teamId,
    teamName,
    members,
    scoreData: {
      type: 'team',
      teamScore,
      teamFormat: 'best-ball',
    },
  };
}

/**
 * Create mock leaderboard response
 */
function createMockResponse(
  entries: RoundLeaderboardEntry[],
  gameType: 'stableford' | 'stroke' | 'match-play' = 'stableford',
  isTeamRound: boolean = false
): RoundLeaderboardResponse {
  return {
    entries,
    metadata: {
      gameType,
      isTeamRound,
      teamFormat: isTeamRound ? 'best-ball' : null,
      roundId: 'round-1',
      roundNumber: 1,
      courseName: 'Royal Melbourne',
      date: '2025-01-15',
      status: 'in-progress',
    },
  };
}

// =====================================================
// TESTS
// =====================================================

describe('RoundLeaderboard', () => {
  const defaultProps = {
    roundId: 'round-1',
    gameType: 'stableford' as const,
    isTeamRound: false,
  };

  beforeEach(() => {
    jest.clearAllMocks();
    mockUseRoundLeaderboard.mockReturnValue({
      data: null,
      isLoading: true,
      isError: false,
      error: null,
      refetch: jest.fn(),
    });
  });

  // ===========================================================================
  // LOADING STATE TESTS
  // ===========================================================================

  describe('Loading State', () => {
    it('shows loading spinner when loading', () => {
      mockUseRoundLeaderboard.mockReturnValue({
        data: null,
        isLoading: true,
        isError: false,
        error: null,
        refetch: jest.fn(),
      });

      render(<RoundLeaderboard {...defaultProps} testID="leaderboard" />);

      expect(screen.getByTestId('leaderboard-loading')).toBeTruthy();
      expect(screen.getByText('Loading leaderboard...')).toBeTruthy();
    });
  });

  // ===========================================================================
  // ERROR STATE TESTS
  // ===========================================================================

  describe('Error State', () => {
    it('shows error state with retry button', () => {
      const refetch = jest.fn();
      mockUseRoundLeaderboard.mockReturnValue({
        data: null,
        isLoading: false,
        isError: true,
        error: { message: 'Network error' },
        refetch,
      });

      render(<RoundLeaderboard {...defaultProps} testID="leaderboard" />);

      expect(screen.getByTestId('leaderboard-error')).toBeTruthy();
      expect(screen.getByText('Failed to load leaderboard')).toBeTruthy();
      expect(screen.getByText('Network error')).toBeTruthy();
    });
  });

  // ===========================================================================
  // EMPTY STATE TESTS
  // ===========================================================================

  describe('Empty State', () => {
    it('shows empty state when no scores', () => {
      mockUseRoundLeaderboard.mockReturnValue({
        data: createMockResponse([]),
        isLoading: false,
        isError: false,
        error: null,
        refetch: jest.fn(),
      });

      render(<RoundLeaderboard {...defaultProps} testID="leaderboard" />);

      expect(screen.getByTestId('leaderboard-empty')).toBeTruthy();
      expect(screen.getByText('No scores yet')).toBeTruthy();
    });

    it('shows custom empty message', () => {
      mockUseRoundLeaderboard.mockReturnValue({
        data: createMockResponse([]),
        isLoading: false,
        isError: false,
        error: null,
        refetch: jest.fn(),
      });

      render(
        <RoundLeaderboard
          {...defaultProps}
          emptyMessage="Check back after players submit their scores."
        />
      );

      expect(screen.getByText('Check back after players submit their scores.')).toBeTruthy();
    });
  });

  // ===========================================================================
  // HEADER TESTS
  // ===========================================================================

  describe('Header', () => {
    it('displays round number', () => {
      mockUseRoundLeaderboard.mockReturnValue({
        data: createMockResponse([
          createStablefordPlayer('1', 'John Smith', 15, 36, 1),
        ]),
        isLoading: false,
        isError: false,
        error: null,
        refetch: jest.fn(),
      });

      render(<RoundLeaderboard {...defaultProps} />);

      expect(screen.getByText('Round 1')).toBeTruthy();
    });

    it('displays game type badge for Stableford', () => {
      mockUseRoundLeaderboard.mockReturnValue({
        data: createMockResponse([
          createStablefordPlayer('1', 'John Smith', 15, 36, 1),
        ]),
        isLoading: false,
        isError: false,
        error: null,
        refetch: jest.fn(),
      });

      render(<RoundLeaderboard {...defaultProps} />);

      expect(screen.getByText('Stableford')).toBeTruthy();
    });

    it('displays game type badge for Stroke Play', () => {
      mockUseRoundLeaderboard.mockReturnValue({
        data: createMockResponse(
          [createStrokePlayer('1', 'John Smith', 15, 82, 1)],
          'stroke'
        ),
        isLoading: false,
        isError: false,
        error: null,
        refetch: jest.fn(),
      });

      render(<RoundLeaderboard {...defaultProps} gameType="stroke" />);

      expect(screen.getByText('Stroke Play')).toBeTruthy();
    });

    it('displays game type badge for Match Play', () => {
      mockUseRoundLeaderboard.mockReturnValue({
        data: createMockResponse(
          [createMatchPlayPlayer('1', 'John', 'Jane', 'win', '3&2', 1)],
          'match-play'
        ),
        isLoading: false,
        isError: false,
        error: null,
        refetch: jest.fn(),
      });

      render(<RoundLeaderboard {...defaultProps} gameType="match-play" />);

      expect(screen.getByText('Match Play')).toBeTruthy();
    });

    it('displays Teams badge for team rounds', () => {
      mockUseRoundLeaderboard.mockReturnValue({
        data: createMockResponse(
          [
            createTeamEntry(
              'team-1',
              'Team Alpha',
              [
                { playerId: '1', playerName: 'John', handicap: 10 },
                { playerId: '2', playerName: 'Jane', handicap: 15 },
              ],
              42,
              1
            ),
          ],
          'stableford',
          true
        ),
        isLoading: false,
        isError: false,
        error: null,
        refetch: jest.fn(),
      });

      render(<RoundLeaderboard {...defaultProps} isTeamRound />);

      expect(screen.getByText('Teams')).toBeTruthy();
    });

    it('displays course name', () => {
      mockUseRoundLeaderboard.mockReturnValue({
        data: createMockResponse([
          createStablefordPlayer('1', 'John Smith', 15, 36, 1),
        ]),
        isLoading: false,
        isError: false,
        error: null,
        refetch: jest.fn(),
      });

      render(<RoundLeaderboard {...defaultProps} />);

      expect(screen.getByText('Royal Melbourne')).toBeTruthy();
    });
  });

  // ===========================================================================
  // STABLEFORD LEADERBOARD TESTS
  // ===========================================================================

  describe('Stableford Leaderboard', () => {
    it('displays table headers correctly', () => {
      mockUseRoundLeaderboard.mockReturnValue({
        data: createMockResponse([
          createStablefordPlayer('1', 'John Smith', 15, 36, 1),
        ]),
        isLoading: false,
        isError: false,
        error: null,
        refetch: jest.fn(),
      });

      render(<RoundLeaderboard {...defaultProps} />);

      expect(screen.getByText('#')).toBeTruthy();
      expect(screen.getByText('Player')).toBeTruthy();
      expect(screen.getByText('HC')).toBeTruthy();
      expect(screen.getByText('Pts')).toBeTruthy();
    });

    it('displays player rows with position and score', () => {
      mockUseRoundLeaderboard.mockReturnValue({
        data: createMockResponse([
          createStablefordPlayer('1', 'John Smith', 15, 36, 1),
          createStablefordPlayer('2', 'Jane Doe', 20, 34, 2),
          createStablefordPlayer('3', 'Bob Wilson', 10, 32, 3),
        ]),
        isLoading: false,
        isError: false,
        error: null,
        refetch: jest.fn(),
      });

      render(<RoundLeaderboard {...defaultProps} />);

      // Player names
      expect(screen.getByText('John Smith')).toBeTruthy();
      expect(screen.getByText('Jane Doe')).toBeTruthy();
      expect(screen.getByText('Bob Wilson')).toBeTruthy();

      // Positions (2, 3 - first position shows trophy icon)
      expect(screen.getByText('2')).toBeTruthy();
      expect(screen.getByText('3')).toBeTruthy();

      // Handicaps
      expect(screen.getByText('15')).toBeTruthy();
      expect(screen.getByText('20')).toBeTruthy();
      expect(screen.getByText('10')).toBeTruthy();

      // Stableford points
      expect(screen.getByText('36')).toBeTruthy();
      expect(screen.getByText('34')).toBeTruthy();
      expect(screen.getByText('32')).toBeTruthy();
    });

    it('highlights current user row', () => {
      mockUseRoundLeaderboard.mockReturnValue({
        data: createMockResponse([
          createStablefordPlayer('1', 'John Smith', 15, 36, 1),
          createStablefordPlayer('current-user', 'Me', 18, 34, 2),
        ]),
        isLoading: false,
        isError: false,
        error: null,
        refetch: jest.fn(),
      });

      render(<RoundLeaderboard {...defaultProps} currentUserId="current-user" />);

      // Should show "You" instead of name
      expect(screen.getByText('You')).toBeTruthy();
      expect(screen.queryByText('Me')).toBeNull();
    });
  });

  // ===========================================================================
  // STROKE PLAY LEADERBOARD TESTS
  // ===========================================================================

  describe('Stroke Play Leaderboard', () => {
    it('displays Net and Gross columns', () => {
      mockUseRoundLeaderboard.mockReturnValue({
        data: createMockResponse(
          [createStrokePlayer('1', 'John Smith', 15, 82, 1)],
          'stroke'
        ),
        isLoading: false,
        isError: false,
        error: null,
        refetch: jest.fn(),
      });

      render(<RoundLeaderboard {...defaultProps} gameType="stroke" />);

      expect(screen.getByText('Net')).toBeTruthy();
      expect(screen.getByText('Gross')).toBeTruthy();
    });

    it('displays correct net and gross scores', () => {
      mockUseRoundLeaderboard.mockReturnValue({
        data: createMockResponse(
          [
            createStrokePlayer('1', 'John Smith', 15, 85, 1),
            createStrokePlayer('2', 'Jane Doe', 20, 92, 2),
          ],
          'stroke'
        ),
        isLoading: false,
        isError: false,
        error: null,
        refetch: jest.fn(),
      });

      render(<RoundLeaderboard {...defaultProps} gameType="stroke" />);

      // Gross scores
      expect(screen.getByText('85')).toBeTruthy();
      expect(screen.getByText('92')).toBeTruthy();

      // Net scores (gross - handicap)
      expect(screen.getByText('70')).toBeTruthy(); // 85 - 15
      expect(screen.getByText('72')).toBeTruthy(); // 92 - 20
    });
  });

  // ===========================================================================
  // MATCH PLAY LEADERBOARD TESTS
  // ===========================================================================

  describe('Match Play Leaderboard', () => {
    it('displays match cards with results', () => {
      mockUseRoundLeaderboard.mockReturnValue({
        data: createMockResponse(
          [
            createMatchPlayPlayer('1', 'John Smith', 'Jane Doe', 'win', '3&2', 1),
            createMatchPlayPlayer('2', 'Jane Doe', 'John Smith', 'loss', '3&2', 2),
          ],
          'match-play'
        ),
        isLoading: false,
        isError: false,
        error: null,
        refetch: jest.fn(),
      });

      render(<RoundLeaderboard {...defaultProps} gameType="match-play" />);

      // Player names (may appear multiple times as player and opponent)
      expect(screen.getAllByText('John Smith').length).toBeGreaterThanOrEqual(1);

      // Match labels (one per match card)
      expect(screen.getAllByText('Match').length).toBeGreaterThanOrEqual(1);

      // Result margin (3&2 appears in both matches)
      expect(screen.getAllByText('3&2').length).toBeGreaterThanOrEqual(1);

      // VS text (one per match card)
      expect(screen.getAllByText('vs').length).toBeGreaterThanOrEqual(1);
    });

    it('displays halved match correctly', () => {
      mockUseRoundLeaderboard.mockReturnValue({
        data: createMockResponse(
          [createMatchPlayPlayer('1', 'John Smith', 'Jane Doe', 'halved', 'A/S', 1)],
          'match-play'
        ),
        isLoading: false,
        isError: false,
        error: null,
        refetch: jest.fn(),
      });

      render(<RoundLeaderboard {...defaultProps} gameType="match-play" />);

      expect(screen.getByText('Halved')).toBeTruthy();
    });

    it('displays holes won/lost/halved stats', () => {
      mockUseRoundLeaderboard.mockReturnValue({
        data: createMockResponse(
          [createMatchPlayPlayer('1', 'John Smith', 'Jane Doe', 'win', '3&2', 1)],
          'match-play'
        ),
        isLoading: false,
        isError: false,
        error: null,
        refetch: jest.fn(),
      });

      render(<RoundLeaderboard {...defaultProps} gameType="match-play" />);

      // Stats display: 5W - 2L - 3H
      expect(screen.getByText('5W - 2L - 3H')).toBeTruthy();
    });
  });

  // ===========================================================================
  // TEAM ROUND TESTS
  // ===========================================================================

  describe('Team Round', () => {
    it('displays Team column header for team rounds', () => {
      mockUseRoundLeaderboard.mockReturnValue({
        data: createMockResponse(
          [
            createTeamEntry(
              'team-1',
              'Team Alpha',
              [
                { playerId: '1', playerName: 'John', handicap: 10 },
                { playerId: '2', playerName: 'Jane', handicap: 15 },
              ],
              42,
              1
            ),
          ],
          'stableford',
          true
        ),
        isLoading: false,
        isError: false,
        error: null,
        refetch: jest.fn(),
      });

      render(<RoundLeaderboard {...defaultProps} isTeamRound />);

      expect(screen.getByText('Team')).toBeTruthy();
    });

    it('displays team name and members', () => {
      mockUseRoundLeaderboard.mockReturnValue({
        data: createMockResponse(
          [
            createTeamEntry(
              'team-1',
              'Team Alpha',
              [
                { playerId: '1', playerName: 'John', handicap: 10 },
                { playerId: '2', playerName: 'Jane', handicap: 15 },
              ],
              42,
              1
            ),
          ],
          'stableford',
          true
        ),
        isLoading: false,
        isError: false,
        error: null,
        refetch: jest.fn(),
      });

      render(<RoundLeaderboard {...defaultProps} isTeamRound />);

      expect(screen.getByText('Team Alpha')).toBeTruthy();
      expect(screen.getByText('John, Jane')).toBeTruthy();
    });

    it('displays team handicap as average of members', () => {
      mockUseRoundLeaderboard.mockReturnValue({
        data: createMockResponse(
          [
            createTeamEntry(
              'team-1',
              'Team Alpha',
              [
                { playerId: '1', playerName: 'John', handicap: 10 },
                { playerId: '2', playerName: 'Jane', handicap: 20 },
              ],
              42,
              1
            ),
          ],
          'stableford',
          true
        ),
        isLoading: false,
        isError: false,
        error: null,
        refetch: jest.fn(),
      });

      render(<RoundLeaderboard {...defaultProps} isTeamRound />);

      // Average of 10 and 20 = 15
      expect(screen.getByText('15')).toBeTruthy();
    });
  });

  // ===========================================================================
  // TIED POSITIONS TESTS
  // ===========================================================================

  describe('Tied Positions', () => {
    it('displays T indicator for tied positions', () => {
      const entries = [
        createStablefordPlayer('1', 'John Smith', 15, 36, 1),
        createStablefordPlayer('2', 'Jane Doe', 20, 34, 2),
        createStablefordPlayer('3', 'Bob Wilson', 10, 34, 2), // Tied with Jane
      ];

      mockUseRoundLeaderboard.mockReturnValue({
        data: createMockResponse(entries),
        isLoading: false,
        isError: false,
        error: null,
        refetch: jest.fn(),
      });

      render(<RoundLeaderboard {...defaultProps} />);

      // T should appear for tied position
      expect(screen.getByText('T')).toBeTruthy();
    });
  });

  // ===========================================================================
  // FIRST PLACE HIGHLIGHTING
  // ===========================================================================

  describe('First Place', () => {
    it('shows trophy icon for first place', () => {
      mockUseRoundLeaderboard.mockReturnValue({
        data: createMockResponse([
          createStablefordPlayer('1', 'John Smith', 15, 36, 1),
          createStablefordPlayer('2', 'Jane Doe', 20, 34, 2),
        ]),
        isLoading: false,
        isError: false,
        error: null,
        refetch: jest.fn(),
      });

      render(<RoundLeaderboard {...defaultProps} />);

      // Trophy icon is rendered (mocked as text)
      expect(screen.getByText('TrophyIcon')).toBeTruthy();
    });
  });

  // ===========================================================================
  // ACCESSIBILITY TESTS
  // ===========================================================================

  describe('Accessibility', () => {
    it('provides accessible labels for rows', () => {
      mockUseRoundLeaderboard.mockReturnValue({
        data: createMockResponse([
          createStablefordPlayer('1', 'John Smith', 15, 36, 1),
        ]),
        isLoading: false,
        isError: false,
        error: null,
        refetch: jest.fn(),
      });

      render(<RoundLeaderboard {...defaultProps} />);

      // Check for accessibility role on multiple rows
      const rows = screen.getAllByRole('text');
      expect(rows.length).toBeGreaterThanOrEqual(1);
    });
  });

  // ===========================================================================
  // HOOK OPTIONS TESTS
  // ===========================================================================

  describe('Hook Options', () => {
    it('passes auto-refresh options to hook', () => {
      mockUseRoundLeaderboard.mockReturnValue({
        data: createMockResponse([]),
        isLoading: false,
        isError: false,
        error: null,
        refetch: jest.fn(),
      });

      render(
        <RoundLeaderboard
          {...defaultProps}
          autoRefresh={false}
          refetchInterval={60000}
        />
      );

      expect(mockUseRoundLeaderboard).toHaveBeenCalledWith(
        'round-1',
        expect.objectContaining({
          autoRefresh: false,
          refetchInterval: 60000,
        })
      );
    });

    it('enables query only when roundId is provided', () => {
      mockUseRoundLeaderboard.mockReturnValue({
        data: null,
        isLoading: true,
        isError: false,
        error: null,
        refetch: jest.fn(),
      });

      render(<RoundLeaderboard {...defaultProps} roundId="round-123" />);

      expect(mockUseRoundLeaderboard).toHaveBeenCalledWith(
        'round-123',
        expect.objectContaining({
          enabled: true,
        })
      );
    });
  });
});
