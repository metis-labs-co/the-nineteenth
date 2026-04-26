/**
 * TeamLeaderboardTable Component Tests
 *
 * Tests for the team leaderboard table component including:
 * - Loading, empty states
 * - Team rows with position, name, handicap, points
 * - Expandable rows showing players + per-round points breakdown
 * - Current user highlighting
 * - Tied positions
 * - First place trophy icon
 * - Accessibility
 */

import React from 'react';
import { render, screen, fireEvent, waitFor, within } from '@/__tests__/utils/renderHelpers';
import {
  TeamLeaderboardTable,
  TeamLeaderboardEntry,
  TeamMemberEntry,
  RoundBreakdownEntry,
} from './TeamLeaderboardTable';

// Mock react-native LayoutAnimation to avoid issues in test environment
// LayoutAnimation.configureNext doesn't work in tests, so we mock the entire module
import { LayoutAnimation } from 'react-native';

// =====================================================
// MOCKS
// =====================================================

// Mock icons - use require inside factory to avoid hoisting issues
jest.mock('@tabler/icons-react-native', () => {
  const { View, Text } = require('react-native');
  return {
    IconTrophy: (_props: any) => (
      <View testID="icon-trophy" accessibilityLabel="trophy">
        <Text>TrophyIcon</Text>
      </View>
    ),
    IconChartBar: (_props: any) => (
      <View testID="icon-chart-bar">
        <Text>ChartBarIcon</Text>
      </View>
    ),
    IconChevronDown: (_props: any) => (
      <View testID="icon-chevron-down">
        <Text>ChevronDownIcon</Text>
      </View>
    ),
    IconChevronUp: (_props: any) => (
      <View testID="icon-chevron-up">
        <Text>ChevronUpIcon</Text>
      </View>
    ),
    IconFlag: (_props: any) => (
      <View testID="icon-flag">
        <Text>FlagIcon</Text>
      </View>
    ),
  };
});

// Mock common components
jest.mock('@/components/common', () => {
  const { View, Text } = require('react-native');
  return {
    LoadingSpinner: ({ message, size }: { message?: string; size?: string }) => (
      <View testID="loading-spinner">
        <Text>{message || 'Loading...'}</Text>
        {size && <Text>Size: {size}</Text>}
      </View>
    ),
    EmptyState: ({ title, message, icon }: { title: string; message: string; icon?: string }) => (
      <View testID={icon ? `icon-${icon}` : 'empty-state'}>
        <Text>{title}</Text>
        <Text>{message}</Text>
      </View>
    ),
    ScaledText: ({ children, style, ...props }: any) => (
      <Text style={style} {...props}>{children}</Text>
    ),
    Badge: ({ label }: { label: string }) => (
      <View testID="badge">
        <Text>{label}</Text>
      </View>
    ),
  };
});
jest.spyOn(LayoutAnimation, 'configureNext').mockImplementation(() => {});

// =====================================================
// TEST FIXTURES
// =====================================================

/**
 * Create a team member entry
 *
 * Extra positional args (e.g. previously `points`, `roundsPlayed`) are accepted
 * and ignored to keep older test invocations compiling.
 */
function createTeamMember(
  playerId: string,
  playerName: string,
  handicap: number,
  ..._unused: unknown[]
): TeamMemberEntry {
  return {
    playerId,
    playerName,
    handicap,
  };
}

/**
 * Create a per-round breakdown entry
 */
function createRoundBreakdown(
  roundId: string,
  roundLabel: string,
  position: number,
  points: number,
  courseName?: string
): RoundBreakdownEntry {
  return { roundId, roundLabel, position, points, courseName };
}

/**
 * Create a team leaderboard entry
 */
function createTeamEntry(
  teamId: string,
  teamName: string,
  avgHandicap: number,
  totalPoints: number,
  members: TeamMemberEntry[],
  roundBreakdown?: RoundBreakdownEntry[]
): TeamLeaderboardEntry {
  return {
    teamId,
    teamName,
    avgHandicap,
    totalPoints,
    members,
    roundBreakdown,
  };
}

/**
 * Create a basic team with default members and a single-round breakdown
 */
function createBasicTeam(
  teamId: string,
  teamName: string,
  totalPoints: number
): TeamLeaderboardEntry {
  return createTeamEntry(
    teamId,
    teamName,
    15,
    totalPoints,
    [
      createTeamMember(`${teamId}-player-1`, 'Player One', 12),
      createTeamMember(`${teamId}-player-2`, 'Player Two', 18),
    ],
    [createRoundBreakdown(`${teamId}-round-1`, 'R1', 1, totalPoints)]
  );
}

// =====================================================
// TESTS
// =====================================================

describe('TeamLeaderboardTable', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  // ===========================================================================
  // LOADING STATE TESTS
  // ===========================================================================

  describe('Loading State', () => {
    it('shows loading spinner when isLoading is true', () => {
      render(<TeamLeaderboardTable leaderboard={[]} isLoading={true} testID="team-leaderboard" />);

      expect(screen.getByTestId('team-leaderboard-loading')).toBeTruthy();
      expect(screen.getByTestId('loading-spinner')).toBeTruthy();
      expect(screen.getByText('Loading team standings...')).toBeTruthy();
    });

    it('shows loading spinner with correct size', () => {
      render(<TeamLeaderboardTable leaderboard={[]} isLoading={true} />);

      expect(screen.getByText('Size: lg')).toBeTruthy();
    });
  });

  // ===========================================================================
  // EMPTY STATE TESTS
  // ===========================================================================

  describe('Empty State', () => {
    it('shows empty state when leaderboard is empty', () => {
      render(<TeamLeaderboardTable leaderboard={[]} testID="team-leaderboard" />);

      expect(screen.getByTestId('team-leaderboard-empty')).toBeTruthy();
      expect(screen.getByText('No team standings yet')).toBeTruthy();
    });

    it('shows default empty message', () => {
      render(<TeamLeaderboardTable leaderboard={[]} />);

      expect(
        screen.getByText('Team standings will appear here once scores are submitted.')
      ).toBeTruthy();
    });

    it('shows custom empty message when provided', () => {
      render(
        <TeamLeaderboardTable
          leaderboard={[]}
          emptyMessage="Custom empty message for testing"
        />
      );

      expect(screen.getByText('Custom empty message for testing')).toBeTruthy();
    });

    it('displays chart icon in empty state', () => {
      render(<TeamLeaderboardTable leaderboard={[]} />);

      expect(screen.getByTestId('icon-chart-bar')).toBeTruthy();
    });
  });

  // ===========================================================================
  // TABLE HEADER TESTS
  // ===========================================================================

  describe('Table Header', () => {
    it('displays all column headers', () => {
      const teams = [createBasicTeam('team-1', 'Team Alpha', 42)];
      render(<TeamLeaderboardTable leaderboard={teams} />);

      expect(screen.getByText('#')).toBeTruthy();
      expect(screen.getByText('Team')).toBeTruthy();
      expect(screen.getByText('Avg HC')).toBeTruthy();
      expect(screen.getByText('Pts')).toBeTruthy();
    });
  });

  // ===========================================================================
  // TEAM ROW TESTS
  // ===========================================================================

  describe('Team Rows', () => {
    it('renders team rows with correct data', () => {
      const teams = [
        createTeamEntry('team-1', 'Team Alpha', 14.5, 48, [
          createTeamMember('player-1', 'Alice Smith', 10, 25),
          createTeamMember('player-2', 'Bob Jones', 19, 23),
        ]),
        createTeamEntry('team-2', 'Team Beta', 18.0, 42, [
          createTeamMember('player-3', 'Charlie Brown', 15, 22),
          createTeamMember('player-4', 'Diana Ross', 21, 20),
        ]),
      ];

      render(<TeamLeaderboardTable leaderboard={teams} />);

      // Team names
      expect(screen.getByText('Team Alpha')).toBeTruthy();
      expect(screen.getByText('Team Beta')).toBeTruthy();

      // Points
      expect(screen.getByText('48')).toBeTruthy();
      expect(screen.getByText('42')).toBeTruthy();

      // Average handicaps
      expect(screen.getByText('14.5')).toBeTruthy();
      expect(screen.getByText('18.0')).toBeTruthy();
    });

    it('displays member count correctly', () => {
      const teams = [
        createTeamEntry('team-1', 'Team Alpha', 15, 48, [
          createTeamMember('player-1', 'Alice', 10, 16),
          createTeamMember('player-2', 'Bob', 15, 16),
          createTeamMember('player-3', 'Charlie', 20, 16),
        ]),
      ];

      render(<TeamLeaderboardTable leaderboard={teams} />);

      expect(screen.getByText('3 members')).toBeTruthy();
    });

    it('displays singular member text for single member team', () => {
      const teams = [
        createTeamEntry('team-1', 'Team Solo', 15, 24, [
          createTeamMember('player-1', 'Solo Player', 15, 24),
        ]),
      ];

      render(<TeamLeaderboardTable leaderboard={teams} />);

      expect(screen.getByText('1 member')).toBeTruthy();
    });

    it('sorts teams by points descending', () => {
      const teams = [
        createBasicTeam('team-1', 'Team Third', 30),
        createBasicTeam('team-2', 'Team First', 50),
        createBasicTeam('team-3', 'Team Second', 40),
      ];

      render(<TeamLeaderboardTable leaderboard={teams} />);

      // Get all team names in order
      const teamNames = screen.getAllByText(/Team (First|Second|Third)/);
      expect(teamNames[0].props.children).toBe('Team First');
      expect(teamNames[1].props.children).toBe('Team Second');
      expect(teamNames[2].props.children).toBe('Team Third');
    });
  });

  // ===========================================================================
  // POSITION TESTS
  // ===========================================================================

  describe('Positions', () => {
    it('displays correct positions for teams', () => {
      const teams = [
        createBasicTeam('team-1', 'Team First', 50),
        createBasicTeam('team-2', 'Team Second', 40),
        createBasicTeam('team-3', 'Team Third', 30),
      ];

      render(<TeamLeaderboardTable leaderboard={teams} />);

      // Position 1 shows trophy, positions 2 and 3 show numbers
      expect(screen.getByText('2')).toBeTruthy();
      expect(screen.getByText('3')).toBeTruthy();
    });

    it('shows trophy icon for first place instead of position number', () => {
      const teams = [
        createBasicTeam('team-1', 'Team First', 50),
        createBasicTeam('team-2', 'Team Second', 40),
      ];

      render(<TeamLeaderboardTable leaderboard={teams} />);

      expect(screen.getByTestId('icon-trophy')).toBeTruthy();
      expect(screen.getByText('TrophyIcon')).toBeTruthy();
    });
  });

  // ===========================================================================
  // TIED POSITIONS TESTS
  // ===========================================================================

  describe('Tied Positions', () => {
    it('displays T indicator for tied positions when showTiedIndicator is true', () => {
      const teams = [
        createBasicTeam('team-1', 'Team First', 50),
        createBasicTeam('team-2', 'Team Tied A', 40),
        createBasicTeam('team-3', 'Team Tied B', 40), // Same points as Team Tied A
      ];

      render(<TeamLeaderboardTable leaderboard={teams} showTiedIndicator={true} />);

      // Both tied teams should show T indicator
      const tiedIndicators = screen.getAllByText('T');
      expect(tiedIndicators.length).toBe(2);
    });

    it('does not display T indicator when showTiedIndicator is false', () => {
      const teams = [
        createBasicTeam('team-1', 'Team First', 50),
        createBasicTeam('team-2', 'Team Tied A', 40),
        createBasicTeam('team-3', 'Team Tied B', 40),
      ];

      render(<TeamLeaderboardTable leaderboard={teams} showTiedIndicator={false} />);

      expect(screen.queryByText('T')).toBeNull();
    });

    it('shows tied indicator by default (showTiedIndicator defaults to true)', () => {
      const teams = [
        createBasicTeam('team-1', 'Team First', 50),
        createBasicTeam('team-2', 'Team Tied A', 40),
        createBasicTeam('team-3', 'Team Tied B', 40),
      ];

      render(<TeamLeaderboardTable leaderboard={teams} />);

      expect(screen.getAllByText('T').length).toBe(2);
    });

    it('handles three-way tie correctly', () => {
      const teams = [
        createBasicTeam('team-1', 'Team A', 40),
        createBasicTeam('team-2', 'Team B', 40),
        createBasicTeam('team-3', 'Team C', 40),
      ];

      render(<TeamLeaderboardTable leaderboard={teams} />);

      // When all teams are tied for first place:
      // - All teams have position=1, so all show trophy icons (not position numbers)
      // - All teams have isTied=true
      // - The T indicator only shows next to position NUMBERS, not trophies
      // - Since all teams are in 1st place, there are no position numbers to show "T" next to

      // All teams should be rendered
      expect(screen.getByText('Team A')).toBeTruthy();
      expect(screen.getByText('Team B')).toBeTruthy();
      expect(screen.getByText('Team C')).toBeTruthy();

      // All three teams are tied for first place, so all show trophy icons
      const trophyIcons = screen.getAllByTestId('icon-trophy');
      expect(trophyIcons.length).toBe(3);

      // The accessibility labels should all mention "tied"
      const buttons = screen.getAllByRole('button');
      buttons.forEach((button) => {
        expect(button.props.accessibilityLabel).toContain('tied');
        expect(button.props.accessibilityLabel).toContain('Position 1');
      });
    });
  });

  // ===========================================================================
  // CURRENT USER HIGHLIGHTING TESTS
  // ===========================================================================

  describe('Current User Highlighting', () => {
    it('highlights team row when current user is a member', () => {
      const teams = [
        createTeamEntry('team-1', 'Team Alpha', 15, 50, [
          createTeamMember('current-user', 'Current User', 15, 25),
          createTeamMember('player-2', 'Other Player', 15, 25),
        ]),
        createBasicTeam('team-2', 'Team Beta', 40),
      ];

      render(<TeamLeaderboardTable leaderboard={teams} currentUserId="current-user" />);

      // The team with current user should be rendered (we can't easily check styling in tests)
      expect(screen.getByText('Team Alpha')).toBeTruthy();
    });

    it('does not highlight teams without current user', () => {
      const teams = [
        createBasicTeam('team-1', 'Team Alpha', 50),
        createBasicTeam('team-2', 'Team Beta', 40),
      ];

      render(<TeamLeaderboardTable leaderboard={teams} currentUserId="current-user" />);

      // Both teams should be rendered without issues
      expect(screen.getByText('Team Alpha')).toBeTruthy();
      expect(screen.getByText('Team Beta')).toBeTruthy();
    });
  });

  // ===========================================================================
  // EXPANDABLE ROWS TESTS
  // ===========================================================================

  describe('Expandable Rows', () => {
    it('shows chevron down icon when row is collapsed', () => {
      const teams = [createBasicTeam('team-1', 'Team Alpha', 50)];
      render(<TeamLeaderboardTable leaderboard={teams} />);

      expect(screen.getByTestId('icon-chevron-down')).toBeTruthy();
    });

    it('expands team row on press to show players and breakdown', async () => {
      const teams = [
        createTeamEntry(
          'team-1',
          'Team Alpha',
          15,
          50,
          [
            createTeamMember('player-1', 'Alice Smith', 12),
            createTeamMember('player-2', 'Bob Jones', 18),
          ],
          [createRoundBreakdown('round-1', 'R1', 1, 50)]
        ),
      ];

      render(<TeamLeaderboardTable leaderboard={teams} />);

      // Players line and breakdown should not be visible initially
      expect(screen.queryByText('Players:')).toBeNull();

      // Find and press the team row
      const teamRow = screen.getByText('Team Alpha');
      fireEvent.press(teamRow);

      // After expansion, the players list and round breakdown should be visible
      await waitFor(() => {
        expect(screen.getByText('Players:')).toBeTruthy();
        expect(screen.getByText('Alice Smith (12), Bob Jones (18)')).toBeTruthy();
        expect(screen.getByText('R1')).toBeTruthy();
      });
    });

    it('shows chevron up icon when row is expanded', async () => {
      const teams = [createBasicTeam('team-1', 'Team Alpha', 50)];
      render(<TeamLeaderboardTable leaderboard={teams} />);

      // Press to expand
      fireEvent.press(screen.getByText('Team Alpha'));

      await waitFor(() => {
        expect(screen.getByTestId('icon-chevron-up')).toBeTruthy();
      });
    });

    it('collapses expanded row on second press', async () => {
      const teams = [createBasicTeam('team-1', 'Team Alpha', 50)];

      render(<TeamLeaderboardTable leaderboard={teams} />);

      const teamRow = screen.getByText('Team Alpha');

      // First press - expand
      fireEvent.press(teamRow);
      await waitFor(() => {
        expect(screen.getByText('Players:')).toBeTruthy();
      });

      // Second press - collapse
      fireEvent.press(teamRow);
      await waitFor(() => {
        expect(screen.queryByText('Players:')).toBeNull();
      });
    });

    it('can expand multiple teams simultaneously', async () => {
      const teams = [
        createTeamEntry(
          'team-1',
          'Team Alpha',
          15,
          50,
          [createTeamMember('p1', 'Alice', 12)],
          [createRoundBreakdown('r1-a', 'R1', 1, 50)]
        ),
        createTeamEntry(
          'team-2',
          'Team Beta',
          18,
          40,
          [createTeamMember('p2', 'Bob', 18)],
          [createRoundBreakdown('r1-b', 'R1', 2, 40)]
        ),
      ];

      render(<TeamLeaderboardTable leaderboard={teams} />);

      // Expand first team
      fireEvent.press(screen.getByText('Team Alpha'));
      await waitFor(() => {
        expect(screen.getByText('Alice (12)')).toBeTruthy();
      });

      // Expand second team
      fireEvent.press(screen.getByText('Team Beta'));
      await waitFor(() => {
        expect(screen.getByText('Bob (18)')).toBeTruthy();
        // First team should still be expanded
        expect(screen.getByText('Alice (12)')).toBeTruthy();
      });
    });
  });

  // ===========================================================================
  // EXPANDED CONTENT TESTS — Players line + per-round breakdown
  // ===========================================================================

  describe('Expanded Content', () => {
    it('shows players inline with their handicap', async () => {
      const teams = [
        createTeamEntry(
          'team-1',
          'Team Alpha',
          15,
          50,
          [
            createTeamMember('player-1', 'Alice Smith', 12),
            createTeamMember('player-2', 'Bob Jones', 18),
          ],
          [createRoundBreakdown('round-1', 'R1', 1, 50)]
        ),
      ];

      render(<TeamLeaderboardTable leaderboard={teams} />);
      fireEvent.press(screen.getByText('Team Alpha'));

      await waitFor(() => {
        expect(screen.getByText('Players:')).toBeTruthy();
        expect(screen.getByText('Alice Smith (12), Bob Jones (18)')).toBeTruthy();
      });
    });

    it('renders "You (handicap)" for the current user in the players line', async () => {
      const teams = [
        createTeamEntry(
          'team-1',
          'Team Alpha',
          15,
          50,
          [
            createTeamMember('current-user', 'My Name', 15),
            createTeamMember('player-2', 'Other Player', 15),
          ],
          [createRoundBreakdown('round-1', 'R1', 1, 50)]
        ),
      ];

      render(<TeamLeaderboardTable leaderboard={teams} currentUserId="current-user" />);
      fireEvent.press(screen.getByText('Team Alpha'));

      await waitFor(() => {
        expect(screen.getByText('You (15), Other Player (15)')).toBeTruthy();
        expect(screen.queryByText(/My Name/)).toBeNull();
      });
    });

    it('renders the per-round breakdown header and rows', async () => {
      const teams = [
        createTeamEntry(
          'team-1',
          'Team Alpha',
          15,
          50,
          [createTeamMember('p1', 'Alice', 12)],
          [
            createRoundBreakdown('round-1', 'R1', 1, 30, 'Pebble Beach'),
            createRoundBreakdown('round-2', 'R2', 2, 20, 'Augusta National'),
          ]
        ),
      ];

      render(<TeamLeaderboardTable leaderboard={teams} testID="leaderboard" />);
      fireEvent.press(screen.getByText('Team Alpha'));

      await waitFor(() => {
        // Scope to the breakdown so we don't collide with the main team table headers ("Pts" etc.)
        const breakdown = within(screen.getByTestId('leaderboard-breakdown-team-1'));

        // Header
        expect(breakdown.getByText('Round')).toBeTruthy();
        expect(breakdown.getByText('Pos')).toBeTruthy();
        expect(breakdown.getByText('Pts')).toBeTruthy();
        // Round labels
        expect(breakdown.getByText('R1')).toBeTruthy();
        expect(breakdown.getByText('R2')).toBeTruthy();
        // Course names
        expect(breakdown.getByText('Pebble Beach')).toBeTruthy();
        expect(breakdown.getByText('Augusta National')).toBeTruthy();
        // Ordinal positions
        expect(breakdown.getByText('1st')).toBeTruthy();
        expect(breakdown.getByText('2nd')).toBeTruthy();
        // Points (scoped to breakdown)
        expect(breakdown.getByText('30')).toBeTruthy();
        expect(breakdown.getByText('20')).toBeTruthy();
      });
    });

    it('shows "No rounds played yet" when the breakdown is empty', async () => {
      const teams = [
        createTeamEntry(
          'team-1',
          'Team Alpha',
          15,
          0,
          [createTeamMember('p1', 'Alice', 12)],
          []
        ),
      ];

      render(<TeamLeaderboardTable leaderboard={teams} />);
      fireEvent.press(screen.getByText('Team Alpha'));

      await waitFor(() => {
        expect(screen.getByText('No rounds played yet')).toBeTruthy();
      });
    });

    it('renders a flag icon for every breakdown row', async () => {
      const teams = [
        createTeamEntry(
          'team-1',
          'Team Alpha',
          15,
          50,
          [createTeamMember('p1', 'Alice', 12)],
          [
            createRoundBreakdown('round-1', 'R1', 1, 30),
            createRoundBreakdown('round-2', 'R2', 2, 20),
          ]
        ),
      ];

      render(<TeamLeaderboardTable leaderboard={teams} />);
      fireEvent.press(screen.getByText('Team Alpha'));

      await waitFor(() => {
        expect(screen.getAllByTestId('icon-flag').length).toBe(2);
      });
    });
  });

  // ===========================================================================
  // ACCESSIBILITY TESTS
  // ===========================================================================

  describe('Accessibility', () => {
    it('provides accessible label for team row', () => {
      const teams = [
        createTeamEntry('team-1', 'Team Alpha', 15.5, 48, [
          createTeamMember('player-1', 'Alice', 10, 24),
          createTeamMember('player-2', 'Bob', 21, 24),
        ]),
      ];

      render(<TeamLeaderboardTable leaderboard={teams} />);

      // The row should have accessibility role button and appropriate label
      const row = screen.getByRole('button');
      expect(row.props.accessibilityLabel).toContain('Team Alpha');
      expect(row.props.accessibilityLabel).toContain('Position 1');
      expect(row.props.accessibilityLabel).toContain('15.5');
      expect(row.props.accessibilityLabel).toContain('48 points');
    });

    it('indicates expanded state in accessibility', async () => {
      const teams = [createBasicTeam('team-1', 'Team Alpha', 50)];
      render(<TeamLeaderboardTable leaderboard={teams} />);

      const row = screen.getByRole('button');
      expect(row.props.accessibilityState.expanded).toBe(false);

      fireEvent.press(row);

      await waitFor(() => {
        expect(row.props.accessibilityState.expanded).toBe(true);
      });
    });

    it('provides accessible label for breakdown rows', async () => {
      const teams = [
        createTeamEntry(
          'team-1',
          'Team Alpha',
          15,
          50,
          [createTeamMember('p1', 'Alice', 12)],
          [createRoundBreakdown('round-1', 'R1', 1, 50, 'Pebble Beach')]
        ),
      ];

      render(<TeamLeaderboardTable leaderboard={teams} />);
      fireEvent.press(screen.getByText('Team Alpha'));

      await waitFor(() => {
        const breakdownRow = screen.getByLabelText(/R1.*Pebble Beach.*1st.*50 points/);
        expect(breakdownRow).toBeTruthy();
      });
    });

    it('includes tied status in accessibility label', () => {
      const teams = [
        createBasicTeam('team-1', 'Team First', 50),
        createBasicTeam('team-2', 'Team Tied A', 40),
        createBasicTeam('team-3', 'Team Tied B', 40),
      ];

      render(<TeamLeaderboardTable leaderboard={teams} />);

      // Find team row with "tied" in accessibility label
      const rows = screen.getAllByRole('button');
      const tiedRow = rows.find((row) => row.props.accessibilityLabel?.includes('tied'));
      expect(tiedRow).toBeTruthy();
    });
  });

  // ===========================================================================
  // EDGE CASES
  // ===========================================================================

  describe('Edge Cases', () => {
    it('handles undefined leaderboard gracefully', () => {
      // @ts-expect-error - Testing undefined handling
      render(<TeamLeaderboardTable leaderboard={undefined} />);

      // Should show empty state
      expect(screen.getByText('No team standings yet')).toBeTruthy();
    });

    it('handles empty members array', () => {
      const teams = [createTeamEntry('team-1', 'Team Empty', 0, 0, [])];
      render(<TeamLeaderboardTable leaderboard={teams} />);

      expect(screen.getByText('Team Empty')).toBeTruthy();
      expect(screen.getByText('0 members')).toBeTruthy();
    });

    it('handles teams with same total points', () => {
      const teams = [
        createBasicTeam('team-1', 'All Same A', 40),
        createBasicTeam('team-2', 'All Same B', 40),
        createBasicTeam('team-3', 'All Same C', 40),
      ];

      render(<TeamLeaderboardTable leaderboard={teams} />);

      // All teams should render without errors
      expect(screen.getByText('All Same A')).toBeTruthy();
      expect(screen.getByText('All Same B')).toBeTruthy();
      expect(screen.getByText('All Same C')).toBeTruthy();
    });

    it('handles teams with zero points', () => {
      const teams = [createBasicTeam('team-1', 'Zero Points Team', 0)];
      render(<TeamLeaderboardTable leaderboard={teams} />);

      expect(screen.getByText('Zero Points Team')).toBeTruthy();
      expect(screen.getByText('0')).toBeTruthy();
    });

    it('handles very long team names', () => {
      const teams = [
        createBasicTeam(
          'team-1',
          'This Is A Very Long Team Name That Should Be Truncated Properly',
          50
        ),
      ];
      render(<TeamLeaderboardTable leaderboard={teams} />);

      // Should render without crashing
      expect(
        screen.getByText('This Is A Very Long Team Name That Should Be Truncated Properly')
      ).toBeTruthy();
    });

    it('handles decimal handicaps correctly', () => {
      const teams = [createTeamEntry('team-1', 'Team Decimal', 15.7, 42, [])];
      render(<TeamLeaderboardTable leaderboard={teams} />);

      expect(screen.getByText('15.7')).toBeTruthy();
    });

    it('handles single team leaderboard', () => {
      const teams = [createBasicTeam('team-1', 'Only Team', 50)];
      render(<TeamLeaderboardTable leaderboard={teams} />);

      expect(screen.getByText('Only Team')).toBeTruthy();
      // Should show trophy for first place even with single team
      expect(screen.getByTestId('icon-trophy')).toBeTruthy();
    });

    it('handles currentUserId that does not match any team member', () => {
      const teams = [
        createBasicTeam('team-1', 'Team Alpha', 50),
        createBasicTeam('team-2', 'Team Beta', 40),
      ];

      render(
        <TeamLeaderboardTable leaderboard={teams} currentUserId="non-existent-user" />
      );

      // Should render without issues
      expect(screen.getByText('Team Alpha')).toBeTruthy();
      expect(screen.getByText('Team Beta')).toBeTruthy();
    });

    it('renders with testID prop', () => {
      const teams = [createBasicTeam('team-1', 'Team Alpha', 50)];
      render(<TeamLeaderboardTable leaderboard={teams} testID="my-team-leaderboard" />);

      expect(screen.getByTestId('my-team-leaderboard')).toBeTruthy();
    });

    it('handles large number of teams', () => {
      const teams = Array.from({ length: 20 }, (_, i) =>
        createBasicTeam(`team-${i}`, `Team ${i + 1}`, 100 - i * 5)
      );

      render(<TeamLeaderboardTable leaderboard={teams} />);

      // First and last teams should be visible
      expect(screen.getByText('Team 1')).toBeTruthy();
      expect(screen.getByText('Team 20')).toBeTruthy();
    });

    it('handles large number of team members', async () => {
      const members = Array.from({ length: 10 }, (_, i) =>
        createTeamMember(`player-${i}`, `Player ${i + 1}`, 10 + i)
      );
      const teams = [
        createTeamEntry('team-1', 'Big Team', 15, 50, members, [
          createRoundBreakdown('round-1', 'R1', 1, 50),
        ]),
      ];

      render(<TeamLeaderboardTable leaderboard={teams} />);

      expect(screen.getByText('10 members')).toBeTruthy();

      // Expand and verify the inline players line lists every player
      fireEvent.press(screen.getByText('Big Team'));

      await waitFor(() => {
        const inlineList = members.map((m) => `${m.playerName} (${m.handicap})`).join(', ');
        expect(screen.getByText(inlineList)).toBeTruthy();
      });
    });
  });

  // ===========================================================================
  // PROP COMBINATIONS
  // ===========================================================================

  describe('Prop Combinations', () => {
    it('works with all props set', async () => {
      const teams = [
        createTeamEntry(
          'team-1',
          'Team Alpha',
          15,
          50,
          [
            createTeamMember('current-user', 'Current User', 15),
            createTeamMember('player-2', 'Other Player', 15),
          ],
          [createRoundBreakdown('round-1', 'R1', 1, 50)]
        ),
        createBasicTeam('team-2', 'Team Beta', 50), // Tied with Alpha
      ];

      render(
        <TeamLeaderboardTable
          leaderboard={teams}
          currentUserId="current-user"
          isLoading={false}
          showTiedIndicator={true}
          emptyMessage="Custom message"
          testID="full-props-test"
        />
      );

      expect(screen.getByTestId('full-props-test')).toBeTruthy();
      expect(screen.getByText('Team Alpha')).toBeTruthy();

      // Expand to verify the players line uses "You" for current user
      fireEvent.press(screen.getByText('Team Alpha'));

      await waitFor(() => {
        expect(screen.getByText('You (15), Other Player (15)')).toBeTruthy();
      });
    });

    it('shows empty state even with testID when leaderboard is empty', () => {
      render(
        <TeamLeaderboardTable leaderboard={[]} testID="empty-with-testid" />
      );

      expect(screen.getByTestId('empty-with-testid-empty')).toBeTruthy();
    });

    it('shows loading state even with testID when loading', () => {
      render(
        <TeamLeaderboardTable leaderboard={[]} isLoading={true} testID="loading-with-testid" />
      );

      expect(screen.getByTestId('loading-with-testid-loading')).toBeTruthy();
    });
  });
});
