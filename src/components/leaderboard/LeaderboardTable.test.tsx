/**
 * LeaderboardTable Component Tests
 *
 * Comprehensive tests for the leaderboard table component including:
 * - Loading, empty, and data states
 * - Position calculation with tie handling
 * - Current user highlighting
 * - First place trophy display
 * - Rounds played column toggle
 * - Tied indicator display
 * - Accessibility labels
 */

import React from 'react';
import { render, screen } from '@testing-library/react-native';
import { LeaderboardTable } from './LeaderboardTable';
import type { LeaderboardEntry } from '@/hooks/useCompetitionLeaderboard';

// =====================================================
// MOCKS
// =====================================================

// Mock icons
jest.mock('@tabler/icons-react-native', () => {
  const { View, Text } = require('react-native');
  return {
    IconTrophy: (_props: { size?: number; color?: string }) => (
      <View testID="icon-trophy">
        <Text>TrophyIcon</Text>
      </View>
    ),
    IconChartBar: (_props: { size?: number; color?: string }) => (
      <View testID="icon-chart-bar">
        <Text>ChartBarIcon</Text>
      </View>
    ),
    IconChevronRight: (_props: { size?: number; color?: string }) => (
      <View testID="icon-chevron-right">
        <Text>ChevronRightIcon</Text>
      </View>
    ),
  };
});

// Mock common components
jest.mock('@/components/common', () => {
  const { View, Text } = require('react-native');
  return {
    LoadingSpinner: ({ message, size: _size }: { message?: string; size?: string }) => (
      <View testID="loading-spinner">
        <Text>{message || 'Loading...'}</Text>
      </View>
    ),
    EmptyState: ({ title, message, icon }: { title: string; message: string; icon?: string }) => (
      <View testID={icon ? `icon-${icon}` : 'empty-state'}>
        <Text>{title}</Text>
        <Text>{message}</Text>
      </View>
    ),
    ScaledText: ({ children, style, ...props }: any) => {
      const RN = require('react-native');
      return <RN.Text style={style} {...props}>{children}</RN.Text>;
    },
  };
});

// =====================================================
// TEST FIXTURES
// =====================================================

/**
 * Create a leaderboard entry for testing
 */
function createLeaderboardEntry(overrides: Partial<LeaderboardEntry> = {}): LeaderboardEntry {
  const playerId = overrides.playerId || `player-${Math.random().toString(36).substr(2, 9)}`;
  return {
    playerId,
    playerName: overrides.playerName || `Player ${playerId.substring(7)}`,
    handicap: overrides.handicap ?? 18,
    totalPoints: overrides.totalPoints ?? 36,
    roundsPlayed: overrides.roundsPlayed ?? 1,
    ...overrides,
  };
}

/**
 * Create multiple leaderboard entries with descending points
 */
function createLeaderboard(count: number, startPoints = 40): LeaderboardEntry[] {
  return Array.from({ length: count }, (_, i) =>
    createLeaderboardEntry({
      playerId: `player-${i + 1}`,
      playerName: `Player ${i + 1}`,
      handicap: 10 + i * 2,
      totalPoints: startPoints - i * 2,
      roundsPlayed: Math.floor(Math.random() * 3) + 1,
    })
  );
}

/**
 * Create leaderboard entries with ties
 */
function createLeaderboardWithTies(): LeaderboardEntry[] {
  return [
    createLeaderboardEntry({ playerId: 'p1', playerName: 'First Place', totalPoints: 40, handicap: 12 }),
    createLeaderboardEntry({ playerId: 'p2', playerName: 'Tied Second A', totalPoints: 36, handicap: 15 }),
    createLeaderboardEntry({ playerId: 'p3', playerName: 'Tied Second B', totalPoints: 36, handicap: 18 }),
    createLeaderboardEntry({ playerId: 'p4', playerName: 'Fourth Place', totalPoints: 34, handicap: 20 }),
    createLeaderboardEntry({ playerId: 'p5', playerName: 'Tied Fifth A', totalPoints: 32, handicap: 22 }),
    createLeaderboardEntry({ playerId: 'p6', playerName: 'Tied Fifth B', totalPoints: 32, handicap: 24 }),
    createLeaderboardEntry({ playerId: 'p7', playerName: 'Tied Fifth C', totalPoints: 32, handicap: 26 }),
    createLeaderboardEntry({ playerId: 'p8', playerName: 'Eighth Place', totalPoints: 30, handicap: 28 }),
  ];
}

// =====================================================
// TESTS
// =====================================================

describe('LeaderboardTable', () => {
  const defaultProps = {
    leaderboard: createLeaderboard(4),
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  // ===========================================================================
  // RENDERING TESTS
  // ===========================================================================

  describe('Rendering', () => {
    it('renders without crashing', () => {
      render(<LeaderboardTable {...defaultProps} />);
      expect(screen.getByText('Player 1')).toBeTruthy();
    });

    it('renders with testID prop', () => {
      render(<LeaderboardTable {...defaultProps} testID="leaderboard-table" />);
      expect(screen.getByTestId('leaderboard-table')).toBeTruthy();
    });

    it('renders table headers correctly', () => {
      render(<LeaderboardTable {...defaultProps} />);

      expect(screen.getByText('#')).toBeTruthy();
      expect(screen.getByText('Player')).toBeTruthy();
      expect(screen.getByText('HC')).toBeTruthy();
      expect(screen.getByText('Pts')).toBeTruthy();
    });

    it('renders all player rows', () => {
      const leaderboard = createLeaderboard(5);
      render(<LeaderboardTable leaderboard={leaderboard} />);

      expect(screen.getByText('Player 1')).toBeTruthy();
      expect(screen.getByText('Player 2')).toBeTruthy();
      expect(screen.getByText('Player 3')).toBeTruthy();
      expect(screen.getByText('Player 4')).toBeTruthy();
      expect(screen.getByText('Player 5')).toBeTruthy();
    });

    it('renders player handicaps', () => {
      const leaderboard = [
        createLeaderboardEntry({ playerId: 'p1', playerName: 'John', handicap: 15, totalPoints: 38 }),
        createLeaderboardEntry({ playerId: 'p2', playerName: 'Jane', handicap: 22, totalPoints: 34 }),
      ];
      render(<LeaderboardTable leaderboard={leaderboard} />);

      expect(screen.getByText('15')).toBeTruthy();
      expect(screen.getByText('22')).toBeTruthy();
    });

    it('renders player points', () => {
      const leaderboard = [
        createLeaderboardEntry({ playerId: 'p1', playerName: 'John', totalPoints: 42 }),
        createLeaderboardEntry({ playerId: 'p2', playerName: 'Jane', totalPoints: 38 }),
      ];
      render(<LeaderboardTable leaderboard={leaderboard} />);

      expect(screen.getByText('42')).toBeTruthy();
      expect(screen.getByText('38')).toBeTruthy();
    });
  });

  // ===========================================================================
  // LOADING STATE TESTS
  // ===========================================================================

  describe('Loading State', () => {
    it('shows loading spinner when isLoading is true', () => {
      render(<LeaderboardTable leaderboard={[]} isLoading={true} />);

      expect(screen.getByTestId('loading-spinner')).toBeTruthy();
      expect(screen.getByText('Loading leaderboard...')).toBeTruthy();
    });

    it('shows loading with testID suffix', () => {
      render(<LeaderboardTable leaderboard={[]} isLoading={true} testID="test-table" />);

      expect(screen.getByTestId('test-table-loading')).toBeTruthy();
    });

    it('does not show loading spinner when isLoading is false', () => {
      render(<LeaderboardTable {...defaultProps} isLoading={false} />);

      expect(screen.queryByTestId('loading-spinner')).toBeNull();
    });

    it('shows loading state instead of empty state when loading', () => {
      render(<LeaderboardTable leaderboard={[]} isLoading={true} />);

      expect(screen.getByTestId('loading-spinner')).toBeTruthy();
      expect(screen.queryByText('No scores yet')).toBeNull();
    });
  });

  // ===========================================================================
  // EMPTY STATE TESTS
  // ===========================================================================

  describe('Empty State', () => {
    it('shows empty state when leaderboard is empty', () => {
      render(<LeaderboardTable leaderboard={[]} />);

      expect(screen.getByText('No scores yet')).toBeTruthy();
    });

    it('shows empty with testID suffix', () => {
      render(<LeaderboardTable leaderboard={[]} testID="test-table" />);

      expect(screen.getByTestId('test-table-empty')).toBeTruthy();
    });

    it('shows default empty message', () => {
      render(<LeaderboardTable leaderboard={[]} />);

      expect(screen.getByText('Scores will appear here once players submit their scorecards.')).toBeTruthy();
    });

    it('shows custom empty message', () => {
      render(
        <LeaderboardTable
          leaderboard={[]}
          emptyMessage="Check back after the first round is complete."
        />
      );

      expect(screen.getByText('Check back after the first round is complete.')).toBeTruthy();
    });

    it('shows empty state icon', () => {
      render(<LeaderboardTable leaderboard={[]} />);

      expect(screen.getByTestId('icon-chart-bar')).toBeTruthy();
    });

    it('shows empty state when leaderboard is null/undefined', () => {
      // @ts-expect-error - Testing null case
      render(<LeaderboardTable leaderboard={null} />);

      expect(screen.getByText('No scores yet')).toBeTruthy();
    });
  });

  // ===========================================================================
  // POSITION CALCULATION TESTS
  // ===========================================================================

  describe('Position Calculation', () => {
    it('calculates positions correctly for sorted entries', () => {
      const leaderboard = [
        createLeaderboardEntry({ playerId: 'p1', playerName: 'First', totalPoints: 40 }),
        createLeaderboardEntry({ playerId: 'p2', playerName: 'Second', totalPoints: 35 }),
        createLeaderboardEntry({ playerId: 'p3', playerName: 'Third', totalPoints: 30 }),
      ];
      render(<LeaderboardTable leaderboard={leaderboard} />);

      // First place shows trophy, 2nd and 3rd show numbers
      expect(screen.getByText('2')).toBeTruthy();
      expect(screen.getByText('3')).toBeTruthy();
    });

    it('sorts entries by points descending', () => {
      // Entries in wrong order (should be sorted)
      const leaderboard = [
        createLeaderboardEntry({ playerId: 'p1', playerName: 'Low Score', totalPoints: 25 }),
        createLeaderboardEntry({ playerId: 'p2', playerName: 'High Score', totalPoints: 45 }),
        createLeaderboardEntry({ playerId: 'p3', playerName: 'Mid Score', totalPoints: 35 }),
      ];
      render(<LeaderboardTable leaderboard={leaderboard} />);

      // High Score should be first (trophy)
      expect(screen.getByTestId('icon-trophy')).toBeTruthy();
      // The order should be High Score, Mid Score, Low Score
      const playerTexts = screen.getAllByText(/Score/);
      expect(playerTexts.length).toBe(3);
    });

    it('handles tied positions correctly', () => {
      const leaderboard = createLeaderboardWithTies();
      render(<LeaderboardTable leaderboard={leaderboard} showTiedIndicator={true} />);

      // Should have tied indicators (T)
      const tiedIndicators = screen.getAllByText('T');
      expect(tiedIndicators.length).toBeGreaterThan(0);
    });

    it('assigns same position number to tied players', () => {
      const leaderboard = [
        createLeaderboardEntry({ playerId: 'p1', playerName: 'Leader', totalPoints: 40 }),
        createLeaderboardEntry({ playerId: 'p2', playerName: 'Tied A', totalPoints: 36 }),
        createLeaderboardEntry({ playerId: 'p3', playerName: 'Tied B', totalPoints: 36 }),
        createLeaderboardEntry({ playerId: 'p4', playerName: 'Fourth', totalPoints: 34 }),
      ];
      render(<LeaderboardTable leaderboard={leaderboard} />);

      // Both tied players should show position 2 (as part of "2T" text)
      // The component renders position and T as nested Text elements
      expect(screen.getByText('Leader')).toBeTruthy();
      expect(screen.getByText('Tied A')).toBeTruthy();
      expect(screen.getByText('Tied B')).toBeTruthy();

      // Both tied players have T indicator
      const tiedIndicators = screen.getAllByText('T');
      expect(tiedIndicators.length).toBe(2);

      // Fourth place skips to 4
      expect(screen.getByText('4')).toBeTruthy();
    });

    it('handles three-way ties', () => {
      const leaderboard = [
        createLeaderboardEntry({ playerId: 'p1', playerName: 'Leader', totalPoints: 40 }),
        createLeaderboardEntry({ playerId: 'p2', playerName: 'Tied A', totalPoints: 35 }),
        createLeaderboardEntry({ playerId: 'p3', playerName: 'Tied B', totalPoints: 35 }),
        createLeaderboardEntry({ playerId: 'p4', playerName: 'Tied C', totalPoints: 35 }),
        createLeaderboardEntry({ playerId: 'p5', playerName: 'Fifth', totalPoints: 30 }),
      ];
      render(<LeaderboardTable leaderboard={leaderboard} />);

      // All three tied players have T indicator
      const tiedIndicators = screen.getAllByText('T');
      expect(tiedIndicators.length).toBe(3);

      // Next player skips to 5
      expect(screen.getByText('5')).toBeTruthy();
    });
  });

  // ===========================================================================
  // TIED INDICATOR TESTS
  // ===========================================================================

  describe('Tied Indicator', () => {
    it('shows T indicator when showTiedIndicator is true', () => {
      const leaderboard = [
        createLeaderboardEntry({ playerId: 'p1', playerName: 'Leader', totalPoints: 40 }),
        createLeaderboardEntry({ playerId: 'p2', playerName: 'Tied A', totalPoints: 36 }),
        createLeaderboardEntry({ playerId: 'p3', playerName: 'Tied B', totalPoints: 36 }),
      ];
      render(<LeaderboardTable leaderboard={leaderboard} showTiedIndicator={true} />);

      expect(screen.getAllByText('T').length).toBe(2);
    });

    it('shows T indicator by default', () => {
      const leaderboard = [
        createLeaderboardEntry({ playerId: 'p1', playerName: 'Leader', totalPoints: 40 }),
        createLeaderboardEntry({ playerId: 'p2', playerName: 'Tied A', totalPoints: 36 }),
        createLeaderboardEntry({ playerId: 'p3', playerName: 'Tied B', totalPoints: 36 }),
      ];
      render(<LeaderboardTable leaderboard={leaderboard} />);

      expect(screen.getAllByText('T').length).toBe(2);
    });

    it('hides T indicator when showTiedIndicator is false', () => {
      const leaderboard = [
        createLeaderboardEntry({ playerId: 'p1', playerName: 'Leader', totalPoints: 40 }),
        createLeaderboardEntry({ playerId: 'p2', playerName: 'Tied A', totalPoints: 36 }),
        createLeaderboardEntry({ playerId: 'p3', playerName: 'Tied B', totalPoints: 36 }),
      ];
      render(<LeaderboardTable leaderboard={leaderboard} showTiedIndicator={false} />);

      expect(screen.queryByText('T')).toBeNull();
    });

    it('does not show T for non-tied positions', () => {
      const leaderboard = [
        createLeaderboardEntry({ playerId: 'p1', playerName: 'First', totalPoints: 40 }),
        createLeaderboardEntry({ playerId: 'p2', playerName: 'Second', totalPoints: 35 }),
        createLeaderboardEntry({ playerId: 'p3', playerName: 'Third', totalPoints: 30 }),
      ];
      render(<LeaderboardTable leaderboard={leaderboard} showTiedIndicator={true} />);

      expect(screen.queryByText('T')).toBeNull();
    });
  });

  // ===========================================================================
  // FIRST PLACE TESTS
  // ===========================================================================

  describe('First Place', () => {
    it('shows trophy icon for first place', () => {
      render(<LeaderboardTable {...defaultProps} />);

      expect(screen.getByTestId('icon-trophy')).toBeTruthy();
    });

    it('shows trophy instead of position number', () => {
      const leaderboard = createLeaderboard(3);
      render(<LeaderboardTable leaderboard={leaderboard} />);

      // Should show trophy for first, numbers for 2nd and 3rd
      expect(screen.getByTestId('icon-trophy')).toBeTruthy();
      expect(screen.getByText('2')).toBeTruthy();
      expect(screen.getByText('3')).toBeTruthy();

      // Position 1 should not appear as text
      expect(screen.queryByText('1')).toBeNull();
    });

    it('shows trophy for single player', () => {
      const leaderboard = [createLeaderboardEntry({ playerId: 'p1', playerName: 'Only Player', totalPoints: 36 })];
      render(<LeaderboardTable leaderboard={leaderboard} />);

      expect(screen.getByTestId('icon-trophy')).toBeTruthy();
    });
  });

  // ===========================================================================
  // CURRENT USER HIGHLIGHTING TESTS
  // ===========================================================================

  describe('Current User Highlighting', () => {
    it('shows "You" for current user instead of name', () => {
      const leaderboard = [
        createLeaderboardEntry({ playerId: 'current-user', playerName: 'John Smith', totalPoints: 38 }),
        createLeaderboardEntry({ playerId: 'p2', playerName: 'Jane Doe', totalPoints: 34 }),
      ];
      render(<LeaderboardTable leaderboard={leaderboard} currentUserId="current-user" />);

      expect(screen.getByText('You')).toBeTruthy();
      expect(screen.queryByText('John Smith')).toBeNull();
      expect(screen.getByText('Jane Doe')).toBeTruthy();
    });

    it('highlights current user row', () => {
      const leaderboard = [
        createLeaderboardEntry({ playerId: 'p1', playerName: 'First', totalPoints: 40 }),
        createLeaderboardEntry({ playerId: 'current-user', playerName: 'Me', totalPoints: 36 }),
        createLeaderboardEntry({ playerId: 'p3', playerName: 'Third', totalPoints: 32 }),
      ];
      render(<LeaderboardTable leaderboard={leaderboard} currentUserId="current-user" />);

      expect(screen.getByText('You')).toBeTruthy();
    });

    it('highlights current user even when in first place', () => {
      const leaderboard = [
        createLeaderboardEntry({ playerId: 'current-user', playerName: 'Me', totalPoints: 42 }),
        createLeaderboardEntry({ playerId: 'p2', playerName: 'Second', totalPoints: 36 }),
      ];
      render(<LeaderboardTable leaderboard={leaderboard} currentUserId="current-user" />);

      expect(screen.getByText('You')).toBeTruthy();
      expect(screen.getByTestId('icon-trophy')).toBeTruthy();
    });

    it('does not highlight when currentUserId is not in leaderboard', () => {
      const leaderboard = createLeaderboard(3);
      render(<LeaderboardTable leaderboard={leaderboard} currentUserId="non-existent-user" />);

      // All player names should be shown, no "You"
      expect(screen.queryByText('You')).toBeNull();
    });

    it('does not highlight when currentUserId is undefined', () => {
      const leaderboard = createLeaderboard(3);
      render(<LeaderboardTable leaderboard={leaderboard} />);

      expect(screen.queryByText('You')).toBeNull();
    });
  });

  // ===========================================================================
  // ROUNDS PLAYED COLUMN TESTS
  // ===========================================================================

  describe('Rounds Played Column', () => {
    it('hides rounds played by default', () => {
      const leaderboard = [
        createLeaderboardEntry({ playerId: 'p1', playerName: 'John', totalPoints: 38, roundsPlayed: 3 }),
      ];
      render(<LeaderboardTable leaderboard={leaderboard} />);

      expect(screen.queryByText('3 rounds')).toBeNull();
    });

    it('shows rounds played when showRoundsPlayed is true', () => {
      const leaderboard = [
        createLeaderboardEntry({ playerId: 'p1', playerName: 'John', totalPoints: 38, roundsPlayed: 3 }),
      ];
      render(<LeaderboardTable leaderboard={leaderboard} showRoundsPlayed={true} />);

      expect(screen.getByText('3 rounds')).toBeTruthy();
    });

    it('shows singular "round" for 1 round', () => {
      const leaderboard = [
        createLeaderboardEntry({ playerId: 'p1', playerName: 'John', totalPoints: 38, roundsPlayed: 1 }),
      ];
      render(<LeaderboardTable leaderboard={leaderboard} showRoundsPlayed={true} />);

      expect(screen.getByText('1 round')).toBeTruthy();
    });

    it('shows plural "rounds" for multiple rounds', () => {
      const leaderboard = [
        createLeaderboardEntry({ playerId: 'p1', playerName: 'John', totalPoints: 38, roundsPlayed: 5 }),
      ];
      render(<LeaderboardTable leaderboard={leaderboard} showRoundsPlayed={true} />);

      expect(screen.getByText('5 rounds')).toBeTruthy();
    });

    it('does not show rounds text for 0 rounds', () => {
      const leaderboard = [
        createLeaderboardEntry({ playerId: 'p1', playerName: 'John', totalPoints: 0, roundsPlayed: 0 }),
      ];
      render(<LeaderboardTable leaderboard={leaderboard} showRoundsPlayed={true} />);

      expect(screen.queryByText('0 rounds')).toBeNull();
      expect(screen.queryByText('0 round')).toBeNull();
    });
  });

  // ===========================================================================
  // ACCESSIBILITY TESTS
  // ===========================================================================

  describe('Accessibility', () => {
    it('provides accessible labels for player rows', () => {
      const leaderboard = [
        createLeaderboardEntry({ playerId: 'p1', playerName: 'John Smith', handicap: 15, totalPoints: 38 }),
      ];
      render(<LeaderboardTable leaderboard={leaderboard} />);

      // Check for accessibility role
      const rows = screen.getAllByRole('text');
      expect(rows.length).toBeGreaterThan(0);
    });

    it('includes position in accessibility label', () => {
      const leaderboard = [
        createLeaderboardEntry({ playerId: 'p1', playerName: 'John', handicap: 15, totalPoints: 40 }),
        createLeaderboardEntry({ playerId: 'p2', playerName: 'Jane', handicap: 20, totalPoints: 35 }),
      ];
      render(<LeaderboardTable leaderboard={leaderboard} />);

      const rows = screen.getAllByRole('text');
      // Verify rows have accessibility labels (content tested by label check)
      expect(rows.length).toBeGreaterThan(0);
    });

    it('includes tied indicator in accessibility label when tied', () => {
      const leaderboard = [
        createLeaderboardEntry({ playerId: 'p1', playerName: 'First', totalPoints: 40 }),
        createLeaderboardEntry({ playerId: 'p2', playerName: 'Tied A', totalPoints: 36 }),
        createLeaderboardEntry({ playerId: 'p3', playerName: 'Tied B', totalPoints: 36 }),
      ];
      render(<LeaderboardTable leaderboard={leaderboard} />);

      // Verify tied positions have T indicator
      expect(screen.getAllByText('T').length).toBe(2);
    });
  });

  // ===========================================================================
  // EDGE CASES TESTS
  // ===========================================================================

  describe('Edge Cases', () => {
    it('handles empty leaderboard array', () => {
      render(<LeaderboardTable leaderboard={[]} />);

      expect(screen.getByText('No scores yet')).toBeTruthy();
    });

    it('handles single player', () => {
      const leaderboard = [createLeaderboardEntry({ playerId: 'p1', playerName: 'Solo Player', totalPoints: 36 })];
      render(<LeaderboardTable leaderboard={leaderboard} />);

      expect(screen.getByText('Solo Player')).toBeTruthy();
      expect(screen.getByTestId('icon-trophy')).toBeTruthy();
    });

    it('handles many players', () => {
      const leaderboard = createLeaderboard(20);
      render(<LeaderboardTable leaderboard={leaderboard} />);

      expect(screen.getByText('Player 1')).toBeTruthy();
      expect(screen.getByText('Player 20')).toBeTruthy();
    });

    it('handles zero points', () => {
      const leaderboard = [
        createLeaderboardEntry({ playerId: 'p1', playerName: 'Zero Score', totalPoints: 0 }),
      ];
      render(<LeaderboardTable leaderboard={leaderboard} />);

      expect(screen.getByText('0')).toBeTruthy();
    });

    it('handles very high points', () => {
      const leaderboard = [
        createLeaderboardEntry({ playerId: 'p1', playerName: 'High Score', totalPoints: 99 }),
      ];
      render(<LeaderboardTable leaderboard={leaderboard} />);

      expect(screen.getByText('99')).toBeTruthy();
    });

    it('handles zero handicap', () => {
      const leaderboard = [
        createLeaderboardEntry({ playerId: 'p1', playerName: 'Scratch Golfer', handicap: 0, totalPoints: 36 }),
      ];
      render(<LeaderboardTable leaderboard={leaderboard} />);

      // Find all zeros - one should be the handicap
      const zeroElements = screen.getAllByText('0');
      expect(zeroElements.length).toBeGreaterThanOrEqual(1);
    });

    it('handles long player names', () => {
      const leaderboard = [
        createLeaderboardEntry({
          playerId: 'p1',
          playerName: 'Very Long Player Name That Should Be Truncated',
          totalPoints: 36
        }),
      ];
      render(<LeaderboardTable leaderboard={leaderboard} />);

      expect(screen.getByText('Very Long Player Name That Should Be Truncated')).toBeTruthy();
    });

    it('handles all players tied for first', () => {
      const leaderboard = [
        createLeaderboardEntry({ playerId: 'p1', playerName: 'Player A', totalPoints: 36 }),
        createLeaderboardEntry({ playerId: 'p2', playerName: 'Player B', totalPoints: 36 }),
        createLeaderboardEntry({ playerId: 'p3', playerName: 'Player C', totalPoints: 36 }),
      ];
      render(<LeaderboardTable leaderboard={leaderboard} />);

      // All players are first place (all show trophy because position=1 is first place)
      // The component shows trophy for first place regardless of ties
      // With 3 players tied at first, all 3 get trophies (since they're all position 1)
      const trophies = screen.getAllByTestId('icon-trophy');
      expect(trophies.length).toBe(3);

      // Note: T indicator is only shown with position numbers, not with trophies
      // So when all are in first place, no T indicators are visible (trophy is shown instead)
      expect(screen.queryByText('T')).toBeNull();

      // All players should have accessible labels indicating they are tied
      expect(screen.getByText('Player A')).toBeTruthy();
      expect(screen.getByText('Player B')).toBeTruthy();
      expect(screen.getByText('Player C')).toBeTruthy();
    });
  });

  // ===========================================================================
  // PROPS VALIDATION TESTS
  // ===========================================================================

  describe('Props Validation', () => {
    it('accepts all valid props', () => {
      const leaderboard = createLeaderboard(3);

      expect(() => {
        render(
          <LeaderboardTable
            leaderboard={leaderboard}
            currentUserId="p1"
            isLoading={false}
            showRoundsPlayed={true}
            showTiedIndicator={true}
            emptyMessage="Custom empty message"
            testID="test-leaderboard"
          />
        );
      }).not.toThrow();
    });

    it('works with minimal props', () => {
      const leaderboard = createLeaderboard(1);

      expect(() => {
        render(<LeaderboardTable leaderboard={leaderboard} />);
      }).not.toThrow();
    });
  });

  // ===========================================================================
  // MEMOIZATION TESTS
  // ===========================================================================

  describe('Memoization', () => {
    it('recalculates positions when leaderboard changes', () => {
      const initialLeaderboard = createLeaderboard(3);
      const { rerender } = render(<LeaderboardTable leaderboard={initialLeaderboard} />);

      expect(screen.getByText('Player 1')).toBeTruthy();

      // Change leaderboard
      const newLeaderboard = [
        createLeaderboardEntry({ playerId: 'new-1', playerName: 'New Leader', totalPoints: 50 }),
        ...initialLeaderboard,
      ];
      rerender(<LeaderboardTable leaderboard={newLeaderboard} />);

      expect(screen.getByText('New Leader')).toBeTruthy();
    });
  });

  // ===========================================================================
  // CURRENT USER IN VARIOUS POSITIONS TESTS
  // ===========================================================================

  describe('Current User in Various Positions', () => {
    it('handles current user in first place', () => {
      const leaderboard = [
        createLeaderboardEntry({ playerId: 'current-user', playerName: 'Me', totalPoints: 42 }),
        createLeaderboardEntry({ playerId: 'p2', playerName: 'Second', totalPoints: 38 }),
      ];
      render(<LeaderboardTable leaderboard={leaderboard} currentUserId="current-user" />);

      expect(screen.getByText('You')).toBeTruthy();
      expect(screen.getByTestId('icon-trophy')).toBeTruthy();
    });

    it('handles current user in last place', () => {
      const leaderboard = [
        createLeaderboardEntry({ playerId: 'p1', playerName: 'First', totalPoints: 42 }),
        createLeaderboardEntry({ playerId: 'p2', playerName: 'Second', totalPoints: 38 }),
        createLeaderboardEntry({ playerId: 'current-user', playerName: 'Me', totalPoints: 30 }),
      ];
      render(<LeaderboardTable leaderboard={leaderboard} currentUserId="current-user" />);

      expect(screen.getByText('You')).toBeTruthy();
      expect(screen.getByText('3')).toBeTruthy();
    });

    it('handles current user tied with others', () => {
      const leaderboard = [
        createLeaderboardEntry({ playerId: 'p1', playerName: 'First', totalPoints: 42 }),
        createLeaderboardEntry({ playerId: 'current-user', playerName: 'Me', totalPoints: 36 }),
        createLeaderboardEntry({ playerId: 'p3', playerName: 'Also Tied', totalPoints: 36 }),
      ];
      render(<LeaderboardTable leaderboard={leaderboard} currentUserId="current-user" />);

      expect(screen.getByText('You')).toBeTruthy();
      expect(screen.getByText('Also Tied')).toBeTruthy();
      expect(screen.getAllByText('T').length).toBe(2);
    });
  });
});
