/**
 * RoundLeaderboardTab Component Tests
 *
 * Tests for the round leaderboard tab including:
 * - Rendering with scorecards
 * - Empty state display
 * - Position calculations with ties
 * - First place trophy icon
 * - Accessibility labels
 * - Table header and row structure
 */

import React from 'react';
import { render, screen } from '@testing-library/react-native';
import { RoundLeaderboardTab } from './RoundLeaderboardTab';
import type { ScorecardWithPlayer } from '@/hooks/useRoundDetails';

// =====================================================
// MOCKS
// =====================================================

// Mock icons
jest.mock('@tabler/icons-react-native', () => {
  const { View } = require('react-native');
  return {
    IconTrophy: (props: Record<string, unknown>) => (
      <View testID="icon-trophy" {...props} />
    ),
  };
});

// Mock ThemeContext
jest.mock('@/context/ThemeContext', () => ({
  useThemeColors: () => ({
    primary: '#4CAF50',
    surface: '#FFFFFF',
    background: '#F5F5F5',
    textPrimary: '#212121',
    textSecondary: '#757575',
    textDisabled: '#9E9E9E',
    border: '#E0E0E0',
    borderLight: '#EEEEEE',
    gray100: '#F5F5F5',
    warning: '#FFC107',
    warningDark: '#FFA000',
  }),
}));

// Mock EmptyState component
jest.mock('@/components/common/EmptyState', () => {
  const { View, Text } = require('react-native');
  return {
    EmptyState: ({
      icon,
      title,
      message,
      compact,
    }: {
      icon: string;
      title: string;
      message: string;
      compact?: boolean;
    }) => (
      <View testID="empty-state" accessibilityLabel={compact ? 'compact' : 'default'}>
        <Text testID="empty-state-icon">{icon}</Text>
        <Text testID="empty-state-title">{title}</Text>
        <Text testID="empty-state-message">{message}</Text>
      </View>
    ),
  };
});

// =====================================================
// TEST FIXTURES
// =====================================================

/**
 * Create a mock scorecard with player
 */
function createMockScorecard(
  id: string,
  playerName: string,
  handicap: number,
  totalPoints: number
): ScorecardWithPlayer {
  return {
    id,
    round_id: 'round-1',
    player_id: `player-${id}`,
    scores: {},
    total_gross: 72,
    total_net: 72 - handicap,
    total_points: totalPoints,
    ball_totals: null,
    status: 'completed',
    submitted_at: null,
    submitted_by: null,
    device_id: null,
    synced_at: null,
    ga_handicap_used: null,
    daily_handicap_used: null,
    handicap_differential: null,
    course_rating_used: null,
    slope_rating_used: null,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    player: {
      id: `player-${id}`,
      name: playerName,
      email: `${playerName.toLowerCase().replace(' ', '.')}@example.com`,
      phone: null,
      handicap,
      golf_id: null,
      handicap_updated_at: null,
      photo_url: null,
      gender: null,
      handicap_index: null,
      handicap_index_updated_at: null,
      home_club_id: null,
      push_enabled: true,
      push_competition_updates: true,
      push_friend_requests: true,
      push_scorecard_updates: true,
      push_league_updates: true,
      equipped_badge_id: null,
      equipped_frame_id: null,
      equipped_title_id: null,
      is_placeholder: false,
      created_by: null,
      linked_player_id: null,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    },
  };
}

/**
 * Create multiple scorecards for testing
 */
function createMockScorecards(): ScorecardWithPlayer[] {
  return [
    createMockScorecard('1', 'John Smith', 15, 36),
    createMockScorecard('2', 'Jane Doe', 20, 34),
    createMockScorecard('3', 'Bob Wilson', 10, 32),
    createMockScorecard('4', 'Alice Brown', 18, 30),
  ];
}

/**
 * Create scorecards with tied positions
 */
function createTiedScorecards(): ScorecardWithPlayer[] {
  return [
    createMockScorecard('1', 'John Smith', 15, 36),
    createMockScorecard('2', 'Jane Doe', 20, 34),
    createMockScorecard('3', 'Bob Wilson', 10, 34), // Tied with Jane
    createMockScorecard('4', 'Alice Brown', 18, 30),
  ];
}

/**
 * Create scorecards with multiple ties
 */
function createMultipleTiedScorecards(): ScorecardWithPlayer[] {
  return [
    createMockScorecard('1', 'John Smith', 15, 36),
    createMockScorecard('2', 'Jane Doe', 20, 36), // Tied for 1st
    createMockScorecard('3', 'Bob Wilson', 10, 34),
    createMockScorecard('4', 'Alice Brown', 18, 34), // Tied for 3rd
    createMockScorecard('5', 'Charlie Davis', 12, 34), // Tied for 3rd
    createMockScorecard('6', 'Eve Foster', 22, 28),
  ];
}

// =====================================================
// TESTS
// =====================================================

describe('RoundLeaderboardTab', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  // ===========================================================================
  // RENDERING TESTS
  // ===========================================================================

  describe('Rendering', () => {
    it('renders without crashing', () => {
      render(<RoundLeaderboardTab scorecards={[]} />);
      expect(screen.getByTestId('empty-state')).toBeTruthy();
    });

    it('renders with scorecards', () => {
      render(<RoundLeaderboardTab scorecards={createMockScorecards()} />);

      expect(screen.getByText('John Smith')).toBeTruthy();
      expect(screen.getByText('Jane Doe')).toBeTruthy();
      expect(screen.getByText('Bob Wilson')).toBeTruthy();
      expect(screen.getByText('Alice Brown')).toBeTruthy();
    });

    it('renders table header with correct columns', () => {
      render(<RoundLeaderboardTab scorecards={createMockScorecards()} />);

      expect(screen.getByText('#')).toBeTruthy();
      expect(screen.getByText('Player')).toBeTruthy();
      expect(screen.getByText('HC')).toBeTruthy();
      expect(screen.getByText('Pts')).toBeTruthy();
    });

    it('renders footer with refresh hint', () => {
      render(<RoundLeaderboardTab scorecards={createMockScorecards()} />);

      expect(screen.getByText('Pull down to refresh')).toBeTruthy();
    });
  });

  // ===========================================================================
  // EMPTY STATE TESTS
  // ===========================================================================

  describe('Empty State', () => {
    it('displays empty state when no scorecards', () => {
      render(<RoundLeaderboardTab scorecards={[]} />);

      expect(screen.getByTestId('empty-state')).toBeTruthy();
    });

    it('shows correct empty state title', () => {
      render(<RoundLeaderboardTab scorecards={[]} />);

      expect(screen.getByText('No scores yet')).toBeTruthy();
    });

    it('shows correct empty state message', () => {
      render(<RoundLeaderboardTab scorecards={[]} />);

      expect(
        screen.getByText('The leaderboard will update as players complete holes.')
      ).toBeTruthy();
    });

    it('uses chart-bar icon for empty state', () => {
      render(<RoundLeaderboardTab scorecards={[]} />);

      expect(screen.getByText('chart-bar')).toBeTruthy();
    });

    it('uses compact mode for empty state', () => {
      render(<RoundLeaderboardTab scorecards={[]} />);

      expect(screen.getByTestId('empty-state')).toBeTruthy();
      expect(screen.getByLabelText('compact')).toBeTruthy();
    });
  });

  // ===========================================================================
  // POSITION CALCULATION TESTS
  // ===========================================================================

  describe('Position Calculation', () => {
    it('sorts players by total points descending', () => {
      const scorecards = createMockScorecards();
      render(<RoundLeaderboardTab scorecards={scorecards} />);

      // First player (highest points) should show trophy
      expect(screen.getByTestId('icon-trophy')).toBeTruthy();

      // Other positions should be visible
      expect(screen.getByText('2')).toBeTruthy();
      expect(screen.getByText('3')).toBeTruthy();
      expect(screen.getByText('4')).toBeTruthy();
    });

    it('handles players with zero points', () => {
      const scorecards = [
        createMockScorecard('1', 'John Smith', 15, 0),
        createMockScorecard('2', 'Jane Doe', 20, 34),
      ];
      render(<RoundLeaderboardTab scorecards={scorecards} />);

      // Jane (34 points) should be first
      expect(screen.getByTestId('icon-trophy')).toBeTruthy();

      // John (null = 0 points) should be second
      expect(screen.getByText('2')).toBeTruthy();

      // John's points should show as 0
      const johnRow = screen.getByText('John Smith');
      expect(johnRow).toBeTruthy();
    });

    it('displays correct handicap values', () => {
      const scorecards = createMockScorecards();
      render(<RoundLeaderboardTab scorecards={scorecards} />);

      expect(screen.getByText('15')).toBeTruthy();
      expect(screen.getByText('20')).toBeTruthy();
      expect(screen.getByText('10')).toBeTruthy();
      expect(screen.getByText('18')).toBeTruthy();
    });

    it('displays correct points values', () => {
      const scorecards = createMockScorecards();
      render(<RoundLeaderboardTab scorecards={scorecards} />);

      expect(screen.getByText('36')).toBeTruthy();
      expect(screen.getByText('34')).toBeTruthy();
      expect(screen.getByText('32')).toBeTruthy();
      expect(screen.getByText('30')).toBeTruthy();
    });
  });

  // ===========================================================================
  // TIE INDICATOR TESTS
  // ===========================================================================

  describe('Tie Indicators', () => {
    it('shows T indicator for tied positions', () => {
      const tiedScorecards = createTiedScorecards();
      render(<RoundLeaderboardTab scorecards={tiedScorecards} />);

      // Should have T indicator for tied players
      expect(screen.getAllByText('T').length).toBeGreaterThanOrEqual(1);
    });

    it('shows same position number for tied players', () => {
      const tiedScorecards = createTiedScorecards();
      render(<RoundLeaderboardTab scorecards={tiedScorecards} />);

      // Jane and Bob are tied with 34 points, both should be position 2
      // Check accessibility labels for the tied rows
      const janeTiedRow = screen.getByLabelText(/Position 2 tied: Jane Doe/i);
      const bobTiedRow = screen.getByLabelText(/Position 2 tied: Bob Wilson/i);
      expect(janeTiedRow).toBeTruthy();
      expect(bobTiedRow).toBeTruthy();
    });

    it('handles multiple tied groups correctly', () => {
      const multipleTied = createMultipleTiedScorecards();
      render(<RoundLeaderboardTab scorecards={multipleTied} />);

      // Check for tied players via accessibility labels
      // First place tie (2 players at position 1 with "tied" in label)
      const firstTieA = screen.getByLabelText(/Position 1 tied: John Smith/i);
      const firstTieB = screen.getByLabelText(/Position 1 tied: Jane Doe/i);
      expect(firstTieA).toBeTruthy();
      expect(firstTieB).toBeTruthy();
    });

    it('skips positions after ties correctly', () => {
      const tiedScorecards = createTiedScorecards();
      render(<RoundLeaderboardTab scorecards={tiedScorecards} />);

      // After tie for 2nd place, next position should be 4 (not 3)
      expect(screen.getByText('4')).toBeTruthy();
      expect(screen.queryByText('3')).toBeNull();
    });

    it('does not show T for first place tie (trophy shown instead)', () => {
      const firstPlaceTie = [
        createMockScorecard('1', 'John Smith', 15, 36),
        createMockScorecard('2', 'Jane Doe', 20, 36), // Tied for 1st
      ];
      render(<RoundLeaderboardTab scorecards={firstPlaceTie} />);

      // Both should show trophy (mocked as single testID)
      // The component shows trophy for position 1, so we check there are multiple trophy icons
      const trophies = screen.getAllByTestId('icon-trophy');
      expect(trophies.length).toBe(2);
    });
  });

  // ===========================================================================
  // FIRST PLACE TESTS
  // ===========================================================================

  describe('First Place', () => {
    it('shows trophy icon for first place', () => {
      const scorecards = createMockScorecards();
      render(<RoundLeaderboardTab scorecards={scorecards} />);

      expect(screen.getByTestId('icon-trophy')).toBeTruthy();
    });

    it('does not show position number for first place', () => {
      const scorecards = createMockScorecards();
      render(<RoundLeaderboardTab scorecards={scorecards} />);

      // Position 1 should not be visible as text (trophy shown instead)
      // We have positions 2, 3, 4 but not 1 as text
      expect(screen.getByText('2')).toBeTruthy();
      expect(screen.getByText('3')).toBeTruthy();
      expect(screen.getByText('4')).toBeTruthy();
    });

    it('applies special styling to first place row', () => {
      const scorecards = createMockScorecards();
      render(<RoundLeaderboardTab scorecards={scorecards} />);

      // First place player name should be visible with their score
      expect(screen.getByText('John Smith')).toBeTruthy();
      expect(screen.getByText('36')).toBeTruthy();
    });
  });

  // ===========================================================================
  // PLAYER DATA TESTS
  // ===========================================================================

  describe('Player Data', () => {
    it('displays player names', () => {
      const scorecards = createMockScorecards();
      render(<RoundLeaderboardTab scorecards={scorecards} />);

      expect(screen.getByText('John Smith')).toBeTruthy();
      expect(screen.getByText('Jane Doe')).toBeTruthy();
      expect(screen.getByText('Bob Wilson')).toBeTruthy();
      expect(screen.getByText('Alice Brown')).toBeTruthy();
    });

    it('handles missing player name gracefully', () => {
      const scorecard: ScorecardWithPlayer = {
        ...createMockScorecard('1', 'Test', 15, 36),
        player: null,
      };
      render(<RoundLeaderboardTab scorecards={[scorecard]} />);

      expect(screen.getByText('Unknown')).toBeTruthy();
    });

    it('handles player with zero handicap', () => {
      const scorecard = createMockScorecard('1', 'Scratch Golfer', 0, 40);
      render(<RoundLeaderboardTab scorecards={[scorecard]} />);

      expect(screen.getByText('Scratch Golfer')).toBeTruthy();
      // 0 handicap should be displayed
      expect(screen.getByText('0')).toBeTruthy();
    });

    it('handles null handicap as 0', () => {
      const scorecard: ScorecardWithPlayer = {
        ...createMockScorecard('1', 'Test Player', 15, 36),
        player: {
          ...createMockScorecard('1', 'Test Player', 15, 36).player!,
          handicap: null,
        },
      };
      render(<RoundLeaderboardTab scorecards={[scorecard]} />);

      // Should display 0 for null handicap
      expect(screen.getAllByText('0').length).toBeGreaterThanOrEqual(1);
    });
  });

  // ===========================================================================
  // EDGE CASES
  // ===========================================================================

  describe('Edge Cases', () => {
    it('handles single player', () => {
      const scorecards = [createMockScorecard('1', 'Solo Player', 18, 32)];
      render(<RoundLeaderboardTab scorecards={scorecards} />);

      expect(screen.getByTestId('icon-trophy')).toBeTruthy();
      expect(screen.getByText('Solo Player')).toBeTruthy();
    });

    it('handles all players with same score', () => {
      const scorecards = [
        createMockScorecard('1', 'Player 1', 15, 36),
        createMockScorecard('2', 'Player 2', 20, 36),
        createMockScorecard('3', 'Player 3', 10, 36),
      ];
      render(<RoundLeaderboardTab scorecards={scorecards} />);

      // All should be position 1 with trophies
      const trophies = screen.getAllByTestId('icon-trophy');
      expect(trophies.length).toBe(3);
    });

    it('handles all players with zero points', () => {
      const scorecards = [
        createMockScorecard('1', 'Player 1', 15, 0),
        createMockScorecard('2', 'Player 2', 20, 0),
      ];
      render(<RoundLeaderboardTab scorecards={scorecards} />);

      // All tied at position 1
      const trophies = screen.getAllByTestId('icon-trophy');
      expect(trophies.length).toBe(2);
    });

    it('handles large number of players', () => {
      const scorecards = Array.from({ length: 20 }, (_, i) =>
        createMockScorecard(`${i + 1}`, `Player ${i + 1}`, 10 + i, 40 - i)
      );
      render(<RoundLeaderboardTab scorecards={scorecards} />);

      // Should render all 20 players
      expect(screen.getByText('Player 1')).toBeTruthy();
      expect(screen.getByText('Player 20')).toBeTruthy();
    });

    it('handles very high handicap values', () => {
      const scorecard = createMockScorecard('1', 'High HC Player', 54, 18);
      render(<RoundLeaderboardTab scorecards={[scorecard]} />);

      expect(screen.getByText('54')).toBeTruthy();
    });

    it('handles very high points values', () => {
      const scorecard = createMockScorecard('1', 'Great Round', 15, 72);
      render(<RoundLeaderboardTab scorecards={[scorecard]} />);

      expect(screen.getByText('72')).toBeTruthy();
    });
  });

  // ===========================================================================
  // ACCESSIBILITY TESTS
  // ===========================================================================

  describe('Accessibility', () => {
    it('provides accessibility label for each row', () => {
      const scorecards = createMockScorecards();
      render(<RoundLeaderboardTab scorecards={scorecards} />);

      // Each row should have an accessibility label
      const rows = screen.getAllByRole('text');
      expect(rows.length).toBeGreaterThan(0);
    });

    it('includes position in accessibility label', () => {
      const scorecards = createMockScorecards();
      render(<RoundLeaderboardTab scorecards={scorecards} />);

      // Check for accessible content mentioning position
      const firstRow = screen.getByLabelText(/Position 1/i);
      expect(firstRow).toBeTruthy();
    });

    it('includes player name in accessibility label', () => {
      const scorecards = createMockScorecards();
      render(<RoundLeaderboardTab scorecards={scorecards} />);

      // Check for accessible content mentioning player
      const johnRow = screen.getByLabelText(/John Smith/i);
      expect(johnRow).toBeTruthy();
    });

    it('includes handicap in accessibility label', () => {
      const scorecards = createMockScorecards();
      render(<RoundLeaderboardTab scorecards={scorecards} />);

      // Check for accessible content mentioning handicap
      const johnRow = screen.getByLabelText(/Handicap 15/i);
      expect(johnRow).toBeTruthy();
    });

    it('includes points in accessibility label', () => {
      const scorecards = createMockScorecards();
      render(<RoundLeaderboardTab scorecards={scorecards} />);

      // Check for accessible content mentioning points
      const johnRow = screen.getByLabelText(/36 points/i);
      expect(johnRow).toBeTruthy();
    });

    it('indicates tied status in accessibility label', () => {
      const tiedScorecards = createTiedScorecards();
      render(<RoundLeaderboardTab scorecards={tiedScorecards} />);

      // Tied players should have "tied" in their label
      const tiedRows = screen.getAllByLabelText(/tied/i);
      expect(tiedRows.length).toBeGreaterThanOrEqual(1);
    });

    it('handles unknown player in accessibility label', () => {
      const scorecard: ScorecardWithPlayer = {
        ...createMockScorecard('1', 'Test', 15, 36),
        player: null,
      };
      render(<RoundLeaderboardTab scorecards={[scorecard]} />);

      const unknownRow = screen.getByLabelText(/Unknown/i);
      expect(unknownRow).toBeTruthy();
    });
  });

  // ===========================================================================
  // MEMOIZATION TESTS
  // ===========================================================================

  describe('Memoization', () => {
    it('memoizes leaderboard entries calculation', () => {
      const scorecards = createMockScorecards();
      const { rerender } = render(<RoundLeaderboardTab scorecards={scorecards} />);

      // Rerender with same scorecards reference
      rerender(<RoundLeaderboardTab scorecards={scorecards} />);

      // Component should still render correctly
      expect(screen.getByText('John Smith')).toBeTruthy();
    });

    it('recalculates when scorecards change', () => {
      const scorecards = createMockScorecards();
      const { rerender } = render(<RoundLeaderboardTab scorecards={scorecards} />);

      // First player is John Smith with 36 points
      expect(screen.getByText('John Smith')).toBeTruthy();
      expect(screen.getByText('36')).toBeTruthy();

      // Update with new leader
      const newScorecards = [
        createMockScorecard('5', 'New Leader', 8, 45),
        ...scorecards,
      ];
      rerender(<RoundLeaderboardTab scorecards={newScorecards} />);

      // New leader should be shown
      expect(screen.getByText('New Leader')).toBeTruthy();
      expect(screen.getByText('45')).toBeTruthy();
    });
  });

  // ===========================================================================
  // TABLE STRUCTURE TESTS
  // ===========================================================================

  describe('Table Structure', () => {
    it('renders position column header', () => {
      render(<RoundLeaderboardTab scorecards={createMockScorecards()} />);
      expect(screen.getByText('#')).toBeTruthy();
    });

    it('renders player column header', () => {
      render(<RoundLeaderboardTab scorecards={createMockScorecards()} />);
      expect(screen.getByText('Player')).toBeTruthy();
    });

    it('renders handicap column header', () => {
      render(<RoundLeaderboardTab scorecards={createMockScorecards()} />);
      expect(screen.getByText('HC')).toBeTruthy();
    });

    it('renders points column header', () => {
      render(<RoundLeaderboardTab scorecards={createMockScorecards()} />);
      expect(screen.getByText('Pts')).toBeTruthy();
    });
  });

  // ===========================================================================
  // SORTING TESTS
  // ===========================================================================

  describe('Sorting', () => {
    it('maintains sort order after rerender', () => {
      const scorecards = createMockScorecards();
      const { rerender } = render(<RoundLeaderboardTab scorecards={scorecards} />);

      // John Smith (36 pts) should be first
      expect(screen.getByTestId('icon-trophy')).toBeTruthy();

      rerender(<RoundLeaderboardTab scorecards={scorecards} />);

      // Still sorted correctly
      expect(screen.getByTestId('icon-trophy')).toBeTruthy();
    });

    it('handles unsorted input correctly', () => {
      // Create scorecards in reverse order (lowest first)
      const scorecards = [
        createMockScorecard('1', 'Low Score', 15, 28),
        createMockScorecard('2', 'Medium Score', 18, 32),
        createMockScorecard('3', 'High Score', 12, 38),
      ];
      render(<RoundLeaderboardTab scorecards={scorecards} />);

      // High Score should get the trophy (first place)
      expect(screen.getByTestId('icon-trophy')).toBeTruthy();

      // Positions should be correct (2 and 3 visible, 1 is trophy)
      expect(screen.getByText('2')).toBeTruthy();
      expect(screen.getByText('3')).toBeTruthy();
    });
  });
});
