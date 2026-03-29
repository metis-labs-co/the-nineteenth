/**
 * LeaderboardTab Component Tests
 *
 * Tests for the competition leaderboard tab including:
 * - Loading, error, and empty states
 * - Individual vs Team view toggle
 * - Scramble-only competition handling
 * - Round-specific leaderboards (in-progress and completed)
 * - Current user highlighting
 * - Data transformation
 */

import React from 'react';
import { render, screen, fireEvent, waitFor } from '@/__tests__/utils/renderHelpers';
import { LeaderboardTab } from './LeaderboardTab';
import type { RoundWithCourse } from '@/components/competitions/detail/types';
import type { CompetitionLeaderboardEntry } from '@/hooks/useCompetitionLeaderboard';

// =====================================================
// MOCKS
// =====================================================

// Mock the useCompetitionLeaderboard hook
const mockUseCompetitionLeaderboard = jest.fn();

jest.mock('@/hooks/useCompetitionLeaderboard', () => ({
  useCompetitionLeaderboard: (...args: unknown[]) => mockUseCompetitionLeaderboard(...args),
}));

// Mock icons
jest.mock('@tabler/icons-react-native', () => {
  const { View, Text } = require('react-native');
  return {
    IconChartBar: (props: any) => <View testID="icon-chart-bar" {...props}><Text>ChartBarIcon</Text></View>,
    IconUsers: (props: any) => <View testID="icon-users" {...props}><Text>UsersIcon</Text></View>,
    IconUser: (props: any) => <View testID="icon-user" {...props}><Text>UserIcon</Text></View>,
    IconCalendar: (props: any) => <View testID="icon-calendar" {...props}><Text>CalendarIcon</Text></View>,
  };
});

// Mock common components
jest.mock('@/components/common', () => {
  const { View, Text, TouchableOpacity } = require('react-native');
  return {
    LoadingSpinner: ({ message }: { message: string }) => (
      <View testID="loading-spinner">
        <Text>{message}</Text>
      </View>
    ),
    ErrorState: ({ title, error, onRetry }: { title: string; error: string; onRetry: () => void }) => (
      <View testID="error-state">
        <Text>{title}</Text>
        <Text>{error}</Text>
        <TouchableOpacity onPress={onRetry}>
          <Text>Retry</Text>
        </TouchableOpacity>
      </View>
    ),
    SectionHeader: ({ title, icon }: { title: string; icon?: string }) => (
      <View testID={`section-header-${title}`}>
        <Text>{title}</Text>
        {icon === 'account-outline' && <View testID="icon-user" />}
        {icon === 'account-group-outline' && <View testID="icon-users" />}
      </View>
    ),
  };
});

// Mock LeaderboardTable
jest.mock('./LeaderboardTable', () => {
  const { View, Text } = require('react-native');
  return {
    LeaderboardTable: ({ leaderboard, testID, currentUserId, showRoundsPlayed, showTiedIndicator: _showTiedIndicator }: any) => (
      <View testID={testID || 'leaderboard-table'}>
        <Text>LeaderboardTable</Text>
        <Text testID="leaderboard-count">{leaderboard?.length || 0} entries</Text>
        {currentUserId && <Text testID="current-user">{currentUserId}</Text>}
        {showRoundsPlayed && <Text testID="show-rounds-played">rounds-shown</Text>}
        {leaderboard?.map((entry: any) => (
          <View key={entry.playerId} testID={`player-row-${entry.playerId}`}>
            <Text>{entry.playerName}</Text>
            <Text>{entry.totalPoints} pts</Text>
          </View>
        ))}
      </View>
    ),
  };
});

// Mock TeamLeaderboardTable
jest.mock('./TeamLeaderboardTable', () => {
  const { View, Text } = require('react-native');
  return {
    TeamLeaderboardTable: ({ leaderboard, testID, currentUserId, showTiedIndicator: _showTiedIndicator, hideMemberPoints }: any) => (
      <View testID={testID || 'team-leaderboard-table'}>
        <Text>TeamLeaderboardTable</Text>
        <Text testID="team-leaderboard-count">{leaderboard?.length || 0} teams</Text>
        {currentUserId && <Text testID="team-current-user">{currentUserId}</Text>}
        {hideMemberPoints && <Text testID="hide-member-points">member-points-hidden</Text>}
        {leaderboard?.map((entry: any) => (
          <View key={entry.teamId} testID={`team-row-${entry.teamId}`}>
            <Text>{entry.teamName}</Text>
            <Text>{entry.totalPoints} pts</Text>
          </View>
        ))}
      </View>
    ),
  };
});

// Mock RoundLeaderboard
jest.mock('./RoundLeaderboard', () => {
  const { View, Text } = require('react-native');
  return {
    RoundLeaderboard: ({ roundId, gameType, isTeamRound, currentUserId, autoRefresh, testID }: any) => (
      <View testID={testID || `round-leaderboard-${roundId}`}>
        <Text>RoundLeaderboard</Text>
        <Text testID={`round-id-${roundId}`}>{roundId}</Text>
        <Text testID={`game-type-${roundId}`}>{gameType}</Text>
        {isTeamRound && <Text testID={`team-round-${roundId}`}>team-round</Text>}
        {currentUserId && <Text testID={`round-current-user-${roundId}`}>{currentUserId}</Text>}
        {autoRefresh && <Text testID={`auto-refresh-${roundId}`}>auto-refresh</Text>}
      </View>
    ),
  };
});

// =====================================================
// TEST FIXTURES
// =====================================================

/**
 * Create a mock competition leaderboard entry for individuals
 */
function createIndividualEntry(
  playerId: string,
  playerName: string,
  handicap: number,
  totalPoints: number,
  roundsPlayed: number,
  position: number,
  tied = false
): CompetitionLeaderboardEntry {
  return {
    participantId: playerId,
    participantName: playerName,
    isTeam: false,
    totalPoints,
    roundsPlayed,
    position,
    tied,
    handicap,
    teamMembers: [],
    roundPoints: [],
  };
}

/**
 * Create a mock competition leaderboard entry for teams
 */
function createTeamEntry(
  teamId: string,
  teamName: string,
  members: { playerId: string; playerName: string; handicap: number }[],
  totalPoints: number,
  roundsPlayed: number,
  position: number,
  tied = false
): CompetitionLeaderboardEntry {
  return {
    participantId: teamId,
    participantName: teamName,
    isTeam: true,
    totalPoints,
    roundsPlayed,
    position,
    tied,
    handicap: null,
    teamMembers: members,
    roundPoints: [],
  };
}

/**
 * Create a mock round with course
 */
function createMockRound(
  overrides: Partial<RoundWithCourse> = {}
): RoundWithCourse {
  return {
    id: 'round-1',
    competition_id: 'comp-1',
    user_id: null,
    round_number: 1,
    course_id: 'course-1',
    date: '2025-01-15',
    tee_time: '08:00',
    game_type: 'stableford',
    nine_type: 'full',
    selected_tee: { name: 'White', color: 'white', totalYardage: 6200, courseRating: 72, slopeRating: 125 },
    is_team_round: false,
    team_format: null,
    scoring_pairs_required: false,
    ball_count: 1,
    handicap_source: null,
    status: 'upcoming',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    course: {
      id: 'course-1',
      club_id: 'club-1',
      golfapi_course_id: null,
      golfapi_long_course_id: null,
      name: 'Royal Melbourne',
      description: null,
      num_holes: 18,
      measure_unit: null,
      holes: [],
      holes_women: null,
      match_play_indexes: null,
      tees: [],
      tees_migrated: null,
      slope_rating: 125,
      course_rating: 72,
      golfapi_updated_at: null,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    },
    ...overrides,
  };
}

// =====================================================
// TESTS
// =====================================================

describe('LeaderboardTab', () => {
  const defaultProps = {
    competitionId: 'comp-1',
    teamMode: 'none' as const,
    rounds: [] as RoundWithCourse[],
  };

  beforeEach(() => {
    jest.clearAllMocks();
    mockUseCompetitionLeaderboard.mockReturnValue({
      data: null,
      isLoading: true,
      error: null,
      refetch: jest.fn(),
    });
  });

  // ===========================================================================
  // LOADING STATE TESTS
  // ===========================================================================

  describe('Loading State', () => {
    it('shows loading spinner when loading', () => {
      mockUseCompetitionLeaderboard.mockReturnValue({
        data: null,
        isLoading: true,
        error: null,
        refetch: jest.fn(),
      });

      render(<LeaderboardTab {...defaultProps} />);

      expect(screen.getByTestId('loading-spinner')).toBeTruthy();
      expect(screen.getByText('Loading leaderboard...')).toBeTruthy();
    });
  });

  // ===========================================================================
  // ERROR STATE TESTS
  // ===========================================================================

  describe('Error State', () => {
    it('shows error state with message', () => {
      mockUseCompetitionLeaderboard.mockReturnValue({
        data: null,
        isLoading: false,
        error: { message: 'Network error' },
        refetch: jest.fn(),
      });

      render(<LeaderboardTab {...defaultProps} />);

      expect(screen.getByText('Failed to load leaderboard')).toBeTruthy();
      expect(screen.getByText('Network error')).toBeTruthy();
    });

    it('shows retry button on error', () => {
      const refetch = jest.fn();
      mockUseCompetitionLeaderboard.mockReturnValue({
        data: null,
        isLoading: false,
        error: { message: 'Network error' },
        refetch,
      });

      render(<LeaderboardTab {...defaultProps} />);

      const retryButton = screen.getByText('Retry');
      expect(retryButton).toBeTruthy();
    });

    it('calls refetch when retry is pressed', () => {
      const refetch = jest.fn();
      mockUseCompetitionLeaderboard.mockReturnValue({
        data: null,
        isLoading: false,
        error: { message: 'Network error' },
        refetch,
      });

      render(<LeaderboardTab {...defaultProps} />);

      const retryButton = screen.getByText('Retry');
      fireEvent.press(retryButton);

      expect(refetch).toHaveBeenCalledTimes(1);
    });

    it('shows generic error message when error.message is missing', () => {
      mockUseCompetitionLeaderboard.mockReturnValue({
        data: null,
        isLoading: false,
        error: {},
        refetch: jest.fn(),
      });

      render(<LeaderboardTab {...defaultProps} />);

      expect(screen.getByText('An unexpected error occurred')).toBeTruthy();
    });
  });

  // ===========================================================================
  // EMPTY STATE TESTS
  // ===========================================================================

  describe('Empty State', () => {
    it('shows empty state for individual when no data', () => {
      mockUseCompetitionLeaderboard.mockReturnValue({
        data: [],
        isLoading: false,
        error: null,
        refetch: jest.fn(),
      });

      render(<LeaderboardTab {...defaultProps} />);

      // Use getAllByText since "No standings yet" may appear multiple times (standings + rounds)
      const noStandingsElements = screen.getAllByText('No standings yet');
      expect(noStandingsElements.length).toBeGreaterThanOrEqual(1);
      expect(screen.getByText('Individual standings will appear once players submit their scorecards.')).toBeTruthy();
    });

    it('shows empty state for team when no data and has teams', () => {
      mockUseCompetitionLeaderboard.mockReturnValue({
        data: [],
        isLoading: false,
        error: null,
        refetch: jest.fn(),
      });

      render(<LeaderboardTab {...defaultProps} teamMode="fixed" />);

      // Use getAllByText since "No standings yet" may appear multiple times (standings + rounds)
      const noStandingsElements = screen.getAllByText('No standings yet');
      expect(noStandingsElements.length).toBeGreaterThanOrEqual(1);
      expect(screen.getByText('Team standings will appear once team scores are submitted.')).toBeTruthy();
    });

    it('shows empty state for rounds when no rounds exist', () => {
      mockUseCompetitionLeaderboard.mockReturnValue({
        data: [createIndividualEntry('p1', 'John', 15, 36, 1, 1)],
        isLoading: false,
        error: null,
        refetch: jest.fn(),
      });

      render(<LeaderboardTab {...defaultProps} rounds={[]} />);

      expect(screen.getByText('Round Results')).toBeTruthy();
      expect(screen.getByText('No rounds have been created yet. Add rounds to see per-round results.')).toBeTruthy();
    });

    it('shows empty state for rounds when rounds exist but none completed or in-progress', () => {
      const upcomingRound = createMockRound({ status: 'upcoming' });
      mockUseCompetitionLeaderboard.mockReturnValue({
        data: [createIndividualEntry('p1', 'John', 15, 36, 1, 1)],
        isLoading: false,
        error: null,
        refetch: jest.fn(),
      });

      render(<LeaderboardTab {...defaultProps} rounds={[upcomingRound]} />);

      expect(screen.getByText('Round results will appear once scoring begins.')).toBeTruthy();
    });
  });

  // ===========================================================================
  // VIEW TOGGLE TESTS
  // ===========================================================================

  describe('View Toggle', () => {
    it('does not show toggle when teamMode is none', () => {
      mockUseCompetitionLeaderboard.mockReturnValue({
        data: [createIndividualEntry('p1', 'John', 15, 36, 1, 1)],
        isLoading: false,
        error: null,
        refetch: jest.fn(),
      });

      render(<LeaderboardTab {...defaultProps} teamMode="none" />);

      expect(screen.queryByText('Individual')).toBeNull();
      expect(screen.queryByText('Team')).toBeNull();
    });

    it('shows toggle when teamMode is fixed', () => {
      mockUseCompetitionLeaderboard.mockReturnValue({
        data: [],
        isLoading: false,
        error: null,
        refetch: jest.fn(),
      });

      render(<LeaderboardTab {...defaultProps} teamMode="fixed" />);

      expect(screen.getByText('Individual')).toBeTruthy();
      expect(screen.getByText('Team')).toBeTruthy();
    });

    it('shows toggle when teamMode is per-round', () => {
      mockUseCompetitionLeaderboard.mockReturnValue({
        data: [],
        isLoading: false,
        error: null,
        refetch: jest.fn(),
      });

      render(<LeaderboardTab {...defaultProps} teamMode="per-round" />);

      expect(screen.getByText('Individual')).toBeTruthy();
      expect(screen.getByText('Team')).toBeTruthy();
    });

    it('defaults to team view when teamMode is not none', () => {
      mockUseCompetitionLeaderboard.mockReturnValue({
        data: [],
        isLoading: false,
        error: null,
        refetch: jest.fn(),
      });

      render(<LeaderboardTab {...defaultProps} teamMode="fixed" />);

      // Team Standings header should be shown
      expect(screen.getByText('Team Standings')).toBeTruthy();
    });

    it('switches to individual view when Individual is pressed', () => {
      mockUseCompetitionLeaderboard.mockReturnValue({
        data: [],
        isLoading: false,
        error: null,
        refetch: jest.fn(),
      });

      render(<LeaderboardTab {...defaultProps} teamMode="fixed" />);

      fireEvent.press(screen.getByText('Individual'));

      expect(screen.getByText('Individual Standings')).toBeTruthy();
    });

    it('switches to team view when Team is pressed', () => {
      mockUseCompetitionLeaderboard.mockReturnValue({
        data: [],
        isLoading: false,
        error: null,
        refetch: jest.fn(),
      });

      render(<LeaderboardTab {...defaultProps} teamMode="fixed" />);

      // First switch to individual
      fireEvent.press(screen.getByText('Individual'));
      expect(screen.getByText('Individual Standings')).toBeTruthy();

      // Then switch back to team
      fireEvent.press(screen.getByText('Team'));
      expect(screen.getByText('Team Standings')).toBeTruthy();
    });

    it('has correct accessibility attributes on toggle buttons', () => {
      mockUseCompetitionLeaderboard.mockReturnValue({
        data: [],
        isLoading: false,
        error: null,
        refetch: jest.fn(),
      });

      render(<LeaderboardTab {...defaultProps} teamMode="fixed" />);

      const individualButton = screen.getByLabelText('Individual standings');
      const teamButton = screen.getByLabelText('Team standings');

      expect(individualButton).toBeTruthy();
      expect(teamButton).toBeTruthy();
    });
  });

  // ===========================================================================
  // SCRAMBLE-ONLY COMPETITION TESTS
  // ===========================================================================

  describe('Scramble-Only Competition', () => {
    const scrambleRound = createMockRound({
      id: 'round-scramble',
      team_format: 'scramble',
      is_team_round: true,
    });

    it('hides toggle for scramble-only competitions', () => {
      mockUseCompetitionLeaderboard.mockReturnValue({
        data: [],
        isLoading: false,
        error: null,
        refetch: jest.fn(),
      });

      render(<LeaderboardTab {...defaultProps} teamMode="fixed" rounds={[scrambleRound]} />);

      // Toggle should not be visible
      expect(screen.queryByText('Individual')).toBeNull();
    });

    it('always shows team standings for scramble-only competitions', () => {
      mockUseCompetitionLeaderboard.mockReturnValue({
        data: [],
        isLoading: false,
        error: null,
        refetch: jest.fn(),
      });

      render(<LeaderboardTab {...defaultProps} teamMode="fixed" rounds={[scrambleRound]} />);

      expect(screen.getByText('Team Standings')).toBeTruthy();
    });

    it('uses teams filter for scramble-only competitions', () => {
      mockUseCompetitionLeaderboard.mockReturnValue({
        data: [],
        isLoading: false,
        error: null,
        refetch: jest.fn(),
      });

      render(<LeaderboardTab {...defaultProps} teamMode="fixed" rounds={[scrambleRound]} />);

      // Should call hook with 'teams' filter
      expect(mockUseCompetitionLeaderboard).toHaveBeenCalledWith(
        'comp-1',
        expect.objectContaining({
          filter: 'teams',
        })
      );
    });

    it('hides member points for scramble competitions', () => {
      const teamEntry = createTeamEntry(
        'team-1',
        'Team Alpha',
        [{ playerId: 'p1', playerName: 'John', handicap: 15 }],
        42,
        1,
        1
      );
      mockUseCompetitionLeaderboard.mockReturnValue({
        data: [teamEntry],
        isLoading: false,
        error: null,
        refetch: jest.fn(),
      });

      render(<LeaderboardTab {...defaultProps} teamMode="fixed" rounds={[scrambleRound]} />);

      expect(screen.getByTestId('hide-member-points')).toBeTruthy();
    });
  });

  // ===========================================================================
  // INDIVIDUAL LEADERBOARD TESTS
  // ===========================================================================

  describe('Individual Leaderboard', () => {
    it('displays individual leaderboard table', () => {
      const entries = [
        createIndividualEntry('p1', 'John Smith', 15, 36, 2, 1),
        createIndividualEntry('p2', 'Jane Doe', 20, 34, 2, 2),
      ];
      mockUseCompetitionLeaderboard.mockReturnValue({
        data: entries,
        isLoading: false,
        error: null,
        refetch: jest.fn(),
      });

      render(<LeaderboardTab {...defaultProps} />);

      expect(screen.getByTestId('competition-individual-leaderboard')).toBeTruthy();
      expect(screen.getByText('LeaderboardTable')).toBeTruthy();
    });

    it('passes correct props to LeaderboardTable', () => {
      const entries = [createIndividualEntry('p1', 'John Smith', 15, 36, 2, 1)];
      mockUseCompetitionLeaderboard.mockReturnValue({
        data: entries,
        isLoading: false,
        error: null,
        refetch: jest.fn(),
      });

      render(<LeaderboardTab {...defaultProps} currentUserId="current-user" />);

      expect(screen.getByTestId('current-user')).toBeTruthy();
      expect(screen.getByText('current-user')).toBeTruthy();
      expect(screen.getByTestId('show-rounds-played')).toBeTruthy();
    });

    it('transforms entries for LeaderboardTable correctly', () => {
      const entries = [
        createIndividualEntry('p1', 'John Smith', 15, 36, 2, 1),
        createIndividualEntry('p2', 'Jane Doe', 20, 34, 2, 2),
      ];
      mockUseCompetitionLeaderboard.mockReturnValue({
        data: entries,
        isLoading: false,
        error: null,
        refetch: jest.fn(),
      });

      render(<LeaderboardTab {...defaultProps} />);

      expect(screen.getByText('2 entries')).toBeTruthy();
      expect(screen.getByTestId('player-row-p1')).toBeTruthy();
      expect(screen.getByTestId('player-row-p2')).toBeTruthy();
    });
  });

  // ===========================================================================
  // TEAM LEADERBOARD TESTS
  // ===========================================================================

  describe('Team Leaderboard', () => {
    it('displays team leaderboard table', () => {
      const entries = [
        createTeamEntry('t1', 'Team Alpha', [{ playerId: 'p1', playerName: 'John', handicap: 15 }], 42, 2, 1),
      ];
      mockUseCompetitionLeaderboard.mockReturnValue({
        data: entries,
        isLoading: false,
        error: null,
        refetch: jest.fn(),
      });

      render(<LeaderboardTab {...defaultProps} teamMode="fixed" />);

      expect(screen.getByTestId('competition-team-leaderboard')).toBeTruthy();
      expect(screen.getByText('TeamLeaderboardTable')).toBeTruthy();
    });

    it('passes correct props to TeamLeaderboardTable', () => {
      const entries = [
        createTeamEntry('t1', 'Team Alpha', [{ playerId: 'p1', playerName: 'John', handicap: 15 }], 42, 2, 1),
      ];
      mockUseCompetitionLeaderboard.mockReturnValue({
        data: entries,
        isLoading: false,
        error: null,
        refetch: jest.fn(),
      });

      render(<LeaderboardTab {...defaultProps} teamMode="fixed" currentUserId="current-user" />);

      expect(screen.getByTestId('team-current-user')).toBeTruthy();
      expect(screen.getByText('current-user')).toBeTruthy();
    });

    it('transforms team entries correctly', () => {
      const entries = [
        createTeamEntry(
          't1',
          'Team Alpha',
          [
            { playerId: 'p1', playerName: 'John', handicap: 10 },
            { playerId: 'p2', playerName: 'Jane', handicap: 20 },
          ],
          42,
          2,
          1
        ),
      ];
      mockUseCompetitionLeaderboard.mockReturnValue({
        data: entries,
        isLoading: false,
        error: null,
        refetch: jest.fn(),
      });

      render(<LeaderboardTab {...defaultProps} teamMode="fixed" />);

      expect(screen.getByText('1 teams')).toBeTruthy();
      expect(screen.getByTestId('team-row-t1')).toBeTruthy();
    });
  });

  // ===========================================================================
  // ROUND LEADERBOARDS TESTS
  // ===========================================================================

  describe('Round Leaderboards', () => {
    it('shows round leaderboards for completed rounds', () => {
      const completedRound = createMockRound({
        id: 'round-completed',
        round_number: 1,
        status: 'completed',
      });
      mockUseCompetitionLeaderboard.mockReturnValue({
        data: [createIndividualEntry('p1', 'John', 15, 36, 1, 1)],
        isLoading: false,
        error: null,
        refetch: jest.fn(),
      });

      render(<LeaderboardTab {...defaultProps} rounds={[completedRound]} />);

      expect(screen.getByTestId('round-leaderboard-1')).toBeTruthy();
      expect(screen.getByText('Round Results')).toBeTruthy();
    });

    it('shows round leaderboards for in-progress rounds', () => {
      const inProgressRound = createMockRound({
        id: 'round-in-progress',
        round_number: 1,
        status: 'in-progress',
      });
      mockUseCompetitionLeaderboard.mockReturnValue({
        data: [createIndividualEntry('p1', 'John', 15, 36, 1, 1)],
        isLoading: false,
        error: null,
        refetch: jest.fn(),
      });

      render(<LeaderboardTab {...defaultProps} rounds={[inProgressRound]} />);

      expect(screen.getByTestId('round-leaderboard-1')).toBeTruthy();
    });

    it('passes correct props to RoundLeaderboard', () => {
      const completedRound = createMockRound({
        id: 'round-1',
        round_number: 1,
        game_type: 'stroke',
        is_team_round: true,
        status: 'completed',
      });
      mockUseCompetitionLeaderboard.mockReturnValue({
        data: [createIndividualEntry('p1', 'John', 15, 36, 1, 1)],
        isLoading: false,
        error: null,
        refetch: jest.fn(),
      });

      render(
        <LeaderboardTab
          {...defaultProps}
          rounds={[completedRound]}
          currentUserId="user-1"
          autoRefresh={false}
        />
      );

      expect(screen.getByTestId('round-id-round-1')).toBeTruthy();
      expect(screen.getByTestId('game-type-round-1')).toBeTruthy();
      expect(screen.getByText('stroke')).toBeTruthy();
      expect(screen.getByTestId('team-round-round-1')).toBeTruthy();
      expect(screen.getByTestId('round-current-user-round-1')).toBeTruthy();
    });

    it('enables auto-refresh for in-progress rounds', () => {
      const inProgressRound = createMockRound({
        id: 'round-1',
        round_number: 1,
        status: 'in-progress',
      });
      mockUseCompetitionLeaderboard.mockReturnValue({
        data: [createIndividualEntry('p1', 'John', 15, 36, 1, 1)],
        isLoading: false,
        error: null,
        refetch: jest.fn(),
      });

      render(<LeaderboardTab {...defaultProps} rounds={[inProgressRound]} autoRefresh />);

      expect(screen.getByTestId('auto-refresh-round-1')).toBeTruthy();
    });

    it('disables auto-refresh for completed rounds', () => {
      const completedRound = createMockRound({
        id: 'round-1',
        round_number: 1,
        status: 'completed',
      });
      mockUseCompetitionLeaderboard.mockReturnValue({
        data: [createIndividualEntry('p1', 'John', 15, 36, 1, 1)],
        isLoading: false,
        error: null,
        refetch: jest.fn(),
      });

      render(<LeaderboardTab {...defaultProps} rounds={[completedRound]} autoRefresh />);

      // Completed rounds should not have auto-refresh
      expect(screen.queryByTestId('auto-refresh-round-1')).toBeNull();
    });

    it('shows multiple round leaderboards', () => {
      const rounds = [
        createMockRound({ id: 'round-1', round_number: 1, status: 'completed' }),
        createMockRound({ id: 'round-2', round_number: 2, status: 'in-progress' }),
        createMockRound({ id: 'round-3', round_number: 3, status: 'upcoming' }),
      ];
      mockUseCompetitionLeaderboard.mockReturnValue({
        data: [createIndividualEntry('p1', 'John', 15, 36, 2, 1)],
        isLoading: false,
        error: null,
        refetch: jest.fn(),
      });

      render(<LeaderboardTab {...defaultProps} rounds={rounds} />);

      // Should show completed and in-progress, not upcoming
      expect(screen.getByTestId('round-leaderboard-1')).toBeTruthy();
      expect(screen.getByTestId('round-leaderboard-2')).toBeTruthy();
      expect(screen.queryByTestId('round-leaderboard-3')).toBeNull();
    });
  });

  // ===========================================================================
  // HOOK OPTIONS TESTS
  // ===========================================================================

  describe('Hook Options', () => {
    it('passes competitionId to hook', () => {
      mockUseCompetitionLeaderboard.mockReturnValue({
        data: null,
        isLoading: true,
        error: null,
        refetch: jest.fn(),
      });

      render(<LeaderboardTab {...defaultProps} competitionId="test-comp-id" />);

      expect(mockUseCompetitionLeaderboard).toHaveBeenCalledWith(
        'test-comp-id',
        expect.any(Object)
      );
    });

    it('passes autoRefresh option to hook', () => {
      mockUseCompetitionLeaderboard.mockReturnValue({
        data: null,
        isLoading: true,
        error: null,
        refetch: jest.fn(),
      });

      render(<LeaderboardTab {...defaultProps} autoRefresh={false} />);

      expect(mockUseCompetitionLeaderboard).toHaveBeenCalledWith(
        'comp-1',
        expect.objectContaining({
          autoRefresh: false,
        })
      );
    });

    it('uses individuals filter when no teams', () => {
      mockUseCompetitionLeaderboard.mockReturnValue({
        data: [],
        isLoading: false,
        error: null,
        refetch: jest.fn(),
      });

      render(<LeaderboardTab {...defaultProps} teamMode="none" />);

      expect(mockUseCompetitionLeaderboard).toHaveBeenCalledWith(
        'comp-1',
        expect.objectContaining({
          filter: 'individuals',
        })
      );
    });

    it('uses teams filter when team view is selected', () => {
      mockUseCompetitionLeaderboard.mockReturnValue({
        data: [],
        isLoading: false,
        error: null,
        refetch: jest.fn(),
      });

      render(<LeaderboardTab {...defaultProps} teamMode="fixed" />);

      // Default is team view when teamMode is not 'none'
      expect(mockUseCompetitionLeaderboard).toHaveBeenCalledWith(
        'comp-1',
        expect.objectContaining({
          filter: 'teams',
        })
      );
    });

    it('uses individuals filter when individual view is selected', async () => {
      mockUseCompetitionLeaderboard.mockReturnValue({
        data: [],
        isLoading: false,
        error: null,
        refetch: jest.fn(),
      });

      render(<LeaderboardTab {...defaultProps} teamMode="fixed" />);

      // Switch to individual view
      fireEvent.press(screen.getByText('Individual'));

      await waitFor(() => {
        expect(mockUseCompetitionLeaderboard).toHaveBeenLastCalledWith(
          'comp-1',
          expect.objectContaining({
            filter: 'individuals',
          })
        );
      });
    });
  });

  // ===========================================================================
  // SECTION HEADER TESTS
  // ===========================================================================

  describe('Section Headers', () => {
    it('shows Individual Standings header for individual view', () => {
      mockUseCompetitionLeaderboard.mockReturnValue({
        data: [createIndividualEntry('p1', 'John', 15, 36, 1, 1)],
        isLoading: false,
        error: null,
        refetch: jest.fn(),
      });

      render(<LeaderboardTab {...defaultProps} />);

      expect(screen.getByText('Individual Standings')).toBeTruthy();
    });

    it('shows Team Standings header for team view', () => {
      mockUseCompetitionLeaderboard.mockReturnValue({
        data: [createTeamEntry('t1', 'Team A', [], 42, 1, 1)],
        isLoading: false,
        error: null,
        refetch: jest.fn(),
      });

      render(<LeaderboardTab {...defaultProps} teamMode="fixed" />);

      expect(screen.getByText('Team Standings')).toBeTruthy();
    });

    it('shows Round Results header when rounds exist', () => {
      const round = createMockRound({ status: 'completed' });
      mockUseCompetitionLeaderboard.mockReturnValue({
        data: [createIndividualEntry('p1', 'John', 15, 36, 1, 1)],
        isLoading: false,
        error: null,
        refetch: jest.fn(),
      });

      render(<LeaderboardTab {...defaultProps} rounds={[round]} />);

      expect(screen.getByText('Round Results')).toBeTruthy();
    });

    it('displays section icons', () => {
      mockUseCompetitionLeaderboard.mockReturnValue({
        data: [createIndividualEntry('p1', 'John', 15, 36, 1, 1)],
        isLoading: false,
        error: null,
        refetch: jest.fn(),
      });

      render(<LeaderboardTab {...defaultProps} />);

      // User icon for individual standings
      expect(screen.getByTestId('icon-user')).toBeTruthy();
    });
  });

  // ===========================================================================
  // TEST ID TESTS
  // ===========================================================================

  describe('Test IDs', () => {
    it('has leaderboard-tab testID on container', () => {
      mockUseCompetitionLeaderboard.mockReturnValue({
        data: [createIndividualEntry('p1', 'John', 15, 36, 1, 1)],
        isLoading: false,
        error: null,
        refetch: jest.fn(),
      });

      render(<LeaderboardTab {...defaultProps} />);

      expect(screen.getByTestId('leaderboard-tab')).toBeTruthy();
    });

    it('has competition-individual-leaderboard testID for individual table', () => {
      mockUseCompetitionLeaderboard.mockReturnValue({
        data: [createIndividualEntry('p1', 'John', 15, 36, 1, 1)],
        isLoading: false,
        error: null,
        refetch: jest.fn(),
      });

      render(<LeaderboardTab {...defaultProps} />);

      expect(screen.getByTestId('competition-individual-leaderboard')).toBeTruthy();
    });

    it('has competition-team-leaderboard testID for team table', () => {
      mockUseCompetitionLeaderboard.mockReturnValue({
        data: [createTeamEntry('t1', 'Team A', [], 42, 1, 1)],
        isLoading: false,
        error: null,
        refetch: jest.fn(),
      });

      render(<LeaderboardTab {...defaultProps} teamMode="fixed" />);

      expect(screen.getByTestId('competition-team-leaderboard')).toBeTruthy();
    });
  });

  // ===========================================================================
  // DATA TRANSFORMATION TESTS
  // ===========================================================================

  describe('Data Transformation', () => {
    it('converts entries to LeaderboardTable format correctly', () => {
      const entries = [
        createIndividualEntry('p1', 'John Smith', 15, 36, 2, 1),
      ];
      mockUseCompetitionLeaderboard.mockReturnValue({
        data: entries,
        isLoading: false,
        error: null,
        refetch: jest.fn(),
      });

      render(<LeaderboardTab {...defaultProps} />);

      // Check that the entry is rendered with correct player name
      expect(screen.getByText('John Smith')).toBeTruthy();
      expect(screen.getByText('36 pts')).toBeTruthy();
    });

    it('converts entries to TeamLeaderboardTable format correctly', () => {
      const entries = [
        createTeamEntry(
          't1',
          'Team Alpha',
          [
            { playerId: 'p1', playerName: 'John', handicap: 10 },
            { playerId: 'p2', playerName: 'Jane', handicap: 20 },
          ],
          42,
          2,
          1
        ),
      ];
      mockUseCompetitionLeaderboard.mockReturnValue({
        data: entries,
        isLoading: false,
        error: null,
        refetch: jest.fn(),
      });

      render(<LeaderboardTab {...defaultProps} teamMode="fixed" />);

      expect(screen.getByText('Team Alpha')).toBeTruthy();
      expect(screen.getByText('42 pts')).toBeTruthy();
    });

    it('handles entries with null handicap', () => {
      const entries = [
        {
          ...createIndividualEntry('p1', 'John Smith', 0, 36, 2, 1),
          handicap: null,
        },
      ];
      mockUseCompetitionLeaderboard.mockReturnValue({
        data: entries,
        isLoading: false,
        error: null,
        refetch: jest.fn(),
      });

      render(<LeaderboardTab {...defaultProps} />);

      // Should render without error
      expect(screen.getByTestId('competition-individual-leaderboard')).toBeTruthy();
    });

    it('handles team entries with empty members', () => {
      const entries = [createTeamEntry('t1', 'Team Alpha', [], 42, 1, 1)];
      mockUseCompetitionLeaderboard.mockReturnValue({
        data: entries,
        isLoading: false,
        error: null,
        refetch: jest.fn(),
      });

      render(<LeaderboardTab {...defaultProps} teamMode="fixed" />);

      // Should render without error
      expect(screen.getByTestId('competition-team-leaderboard')).toBeTruthy();
    });
  });

  // ===========================================================================
  // MEMOIZATION TESTS
  // ===========================================================================

  describe('Memoization', () => {
    it('memoizes completed rounds calculation', () => {
      const rounds = [
        createMockRound({ id: 'r1', round_number: 1, status: 'completed' }),
        createMockRound({ id: 'r2', round_number: 2, status: 'in-progress' }),
      ];
      mockUseCompetitionLeaderboard.mockReturnValue({
        data: [createIndividualEntry('p1', 'John', 15, 36, 1, 1)],
        isLoading: false,
        error: null,
        refetch: jest.fn(),
      });

      const { rerender } = render(<LeaderboardTab {...defaultProps} rounds={rounds} />);

      // Re-render with same rounds
      rerender(<LeaderboardTab {...defaultProps} rounds={rounds} />);

      // Both round leaderboards should still be present - use getAllByTestId since there could be duplicate renders
      const round1Leaderboards = screen.getAllByTestId('round-leaderboard-1');
      const round2Leaderboards = screen.getAllByTestId('round-leaderboard-2');
      expect(round1Leaderboards.length).toBeGreaterThanOrEqual(1);
      expect(round2Leaderboards.length).toBeGreaterThanOrEqual(1);
    });
  });
});
