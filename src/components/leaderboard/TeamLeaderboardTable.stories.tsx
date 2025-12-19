/**
 * TeamLeaderboardTable Storybook Stories
 *
 * Stories demonstrating the various configurations of the TeamLeaderboardTable component.
 * Shows different states, team configurations, and user scenarios.
 */

import React from 'react';
import { View, StyleSheet, ScrollView } from 'react-native';
import type { Meta, StoryObj } from '@storybook/react';
import {
  TeamLeaderboardTable,
  TeamLeaderboardEntry,
  TeamMemberEntry,
} from './TeamLeaderboardTable';
import { spacing } from '@/constants/theme';

// ===========================================================================
// META
// ===========================================================================

const meta: Meta<typeof TeamLeaderboardTable> = {
  title: 'Leaderboard/TeamLeaderboardTable',
  component: TeamLeaderboardTable,
  parameters: {
    layout: 'fullscreen',
  },
  argTypes: {
    isLoading: { control: 'boolean' },
    showTiedIndicator: { control: 'boolean' },
    hideMemberPoints: { control: 'boolean' },
    emptyMessage: { control: 'text' },
    currentUserId: { control: 'text' },
  },
  decorators: [
    (Story) => (
      <ScrollView style={styles.container}>
        <View style={styles.content}>
          <Story />
        </View>
      </ScrollView>
    ),
  ],
};

export default meta;
type Story = StoryObj<typeof TeamLeaderboardTable>;

// ===========================================================================
// HELPER FUNCTIONS
// ===========================================================================

function createMember(
  playerId: string,
  playerName: string,
  handicap: number,
  points: number,
  roundsPlayed?: number
): TeamMemberEntry {
  return { playerId, playerName, handicap, points, roundsPlayed };
}

function createTeam(
  teamId: string,
  teamName: string,
  avgHandicap: number,
  totalPoints: number,
  members: TeamMemberEntry[]
): TeamLeaderboardEntry {
  return { teamId, teamName, avgHandicap, totalPoints, members };
}

// ===========================================================================
// MOCK DATA
// ===========================================================================

const basicTeams: TeamLeaderboardEntry[] = [
  createTeam('team-1', 'The Eagles', 14.5, 86, [
    createMember('player-1', 'John Smith', 12, 45, 3),
    createMember('player-2', 'Jane Doe', 17, 41, 3),
  ]),
  createTeam('team-2', 'Birdie Brigade', 16.0, 78, [
    createMember('player-3', 'Bob Wilson', 14, 40, 3),
    createMember('player-4', 'Alice Brown', 18, 38, 3),
  ]),
  createTeam('team-3', 'Par Patrol', 18.5, 72, [
    createMember('player-5', 'Charlie Davis', 16, 38, 3),
    createMember('player-6', 'Diana Evans', 21, 34, 3),
  ]),
];

const tiedTeams: TeamLeaderboardEntry[] = [
  createTeam('team-1', 'The Eagles', 14.5, 86, [
    createMember('player-1', 'John Smith', 12, 45),
    createMember('player-2', 'Jane Doe', 17, 41),
  ]),
  createTeam('team-2', 'Birdie Brigade', 16.0, 78, [
    createMember('player-3', 'Bob Wilson', 14, 40),
    createMember('player-4', 'Alice Brown', 18, 38),
  ]),
  createTeam('team-3', 'Par Patrol', 15.0, 78, [
    createMember('player-5', 'Charlie Davis', 12, 40),
    createMember('player-6', 'Diana Evans', 18, 38),
  ]),
  createTeam('team-4', 'Bogey Busters', 17.5, 78, [
    createMember('player-7', 'Edward Fox', 15, 39),
    createMember('player-8', 'Fiona Green', 20, 39),
  ]),
];

const largeTeams: TeamLeaderboardEntry[] = [
  createTeam('team-1', 'Team Alpha', 15.0, 120, [
    createMember('player-1', 'Player One', 10, 32),
    createMember('player-2', 'Player Two', 12, 30),
    createMember('player-3', 'Player Three', 15, 30),
    createMember('player-4', 'Player Four', 18, 28),
  ]),
  createTeam('team-2', 'Team Beta', 16.5, 110, [
    createMember('player-5', 'Player Five', 12, 29),
    createMember('player-6', 'Player Six', 14, 28),
    createMember('player-7', 'Player Seven', 17, 27),
    createMember('player-8', 'Player Eight', 20, 26),
  ]),
];

const singleMemberTeams: TeamLeaderboardEntry[] = [
  createTeam('team-1', 'Solo Player', 15.0, 42, [
    createMember('player-1', 'Lone Wolf', 15, 42),
  ]),
];

const manyTeams: TeamLeaderboardEntry[] = Array.from({ length: 12 }, (_, i) =>
  createTeam(`team-${i + 1}`, `Team ${i + 1}`, 15 + i * 0.5, 100 - i * 5, [
    createMember(`player-${i * 2 + 1}`, `Player ${i * 2 + 1}`, 12 + i, Math.floor((100 - i * 5) / 2)),
    createMember(`player-${i * 2 + 2}`, `Player ${i * 2 + 2}`, 18 + i, Math.ceil((100 - i * 5) / 2)),
  ])
);

const scrambleTeams: TeamLeaderboardEntry[] = [
  createTeam('team-1', 'Scramble Stars', 12.5, 68, [
    createMember('player-1', 'John Smith', 8, 0),
    createMember('player-2', 'Jane Doe', 12, 0),
    createMember('player-3', 'Bob Wilson', 15, 0),
    createMember('player-4', 'Alice Brown', 15, 0),
  ]),
  createTeam('team-2', 'Team Effort', 14.0, 65, [
    createMember('player-5', 'Charlie Davis', 10, 0),
    createMember('player-6', 'Diana Evans', 12, 0),
    createMember('player-7', 'Edward Fox', 16, 0),
    createMember('player-8', 'Fiona Green', 18, 0),
  ]),
];

// ===========================================================================
// STYLES
// ===========================================================================

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F5F5',
  },
  content: {
    padding: spacing.md,
  },
});

// ===========================================================================
// STORIES - BASIC
// ===========================================================================

/**
 * Default team leaderboard with 3 teams
 */
export const Default: Story = {
  args: {
    leaderboard: basicTeams,
  },
};

/**
 * Team leaderboard with test ID for automated testing
 */
export const WithTestID: Story = {
  args: {
    leaderboard: basicTeams,
    testID: 'team-leaderboard',
  },
};

// ===========================================================================
// STORIES - STATES
// ===========================================================================

/**
 * Loading state with spinner
 */
export const Loading: Story = {
  args: {
    leaderboard: [],
    isLoading: true,
    testID: 'team-leaderboard',
  },
};

/**
 * Empty state with default message
 */
export const Empty: Story = {
  args: {
    leaderboard: [],
    testID: 'team-leaderboard',
  },
};

/**
 * Empty state with custom message
 */
export const EmptyCustomMessage: Story = {
  args: {
    leaderboard: [],
    emptyMessage: 'No teams have submitted scores yet. Standings will appear once play begins.',
    testID: 'team-leaderboard',
  },
};

// ===========================================================================
// STORIES - CURRENT USER
// ===========================================================================

/**
 * Current user's team highlighted
 */
export const CurrentUserTeam: Story = {
  args: {
    leaderboard: basicTeams,
    currentUserId: 'player-3', // Bob Wilson in Team 2
  },
};

/**
 * Current user in first place team
 */
export const CurrentUserFirstPlace: Story = {
  args: {
    leaderboard: basicTeams,
    currentUserId: 'player-1', // John Smith in The Eagles
  },
};

/**
 * Current user in last place team
 */
export const CurrentUserLastPlace: Story = {
  args: {
    leaderboard: basicTeams,
    currentUserId: 'player-6', // Diana Evans in Par Patrol
  },
};

// ===========================================================================
// STORIES - TIED POSITIONS
// ===========================================================================

/**
 * Teams with tied scores showing T indicator
 */
export const TiedPositions: Story = {
  args: {
    leaderboard: tiedTeams,
    showTiedIndicator: true,
  },
};

/**
 * Tied positions without T indicator
 */
export const TiedNoIndicator: Story = {
  args: {
    leaderboard: tiedTeams,
    showTiedIndicator: false,
  },
};

/**
 * Three-way tie for first place
 */
export const ThreeWayTieFirst: Story = {
  args: {
    leaderboard: [
      createTeam('team-1', 'Team Alpha', 15.0, 80, [
        createMember('player-1', 'Player A1', 15, 40),
        createMember('player-2', 'Player A2', 15, 40),
      ]),
      createTeam('team-2', 'Team Beta', 15.0, 80, [
        createMember('player-3', 'Player B1', 15, 40),
        createMember('player-4', 'Player B2', 15, 40),
      ]),
      createTeam('team-3', 'Team Gamma', 15.0, 80, [
        createMember('player-5', 'Player G1', 15, 40),
        createMember('player-6', 'Player G2', 15, 40),
      ]),
    ],
  },
};

// ===========================================================================
// STORIES - TEAM SIZES
// ===========================================================================

/**
 * Single member teams (individual competition)
 */
export const SingleMemberTeams: Story = {
  args: {
    leaderboard: [
      createTeam('team-1', 'John Smith', 12, 42, [
        createMember('player-1', 'John Smith', 12, 42),
      ]),
      createTeam('team-2', 'Jane Doe', 17, 38, [
        createMember('player-2', 'Jane Doe', 17, 38),
      ]),
      createTeam('team-3', 'Bob Wilson', 14, 36, [
        createMember('player-3', 'Bob Wilson', 14, 36),
      ]),
    ],
  },
};

/**
 * Large teams (4 members each)
 */
export const LargeTeams: Story = {
  args: {
    leaderboard: largeTeams,
  },
};

/**
 * Single team in leaderboard
 */
export const SingleTeam: Story = {
  args: {
    leaderboard: [basicTeams[0]],
  },
};

/**
 * Many teams (12 teams showing scroll)
 */
export const ManyTeams: Story = {
  args: {
    leaderboard: manyTeams,
  },
};

// ===========================================================================
// STORIES - SCRAMBLE FORMAT
// ===========================================================================

/**
 * Scramble/Ambrose format (hide member points)
 */
export const ScrambleFormat: Story = {
  args: {
    leaderboard: scrambleTeams,
    hideMemberPoints: true,
  },
};

/**
 * Scramble with current user
 */
export const ScrambleWithCurrentUser: Story = {
  args: {
    leaderboard: scrambleTeams,
    hideMemberPoints: true,
    currentUserId: 'player-2', // Jane Doe in Scramble Stars
  },
};

// ===========================================================================
// STORIES - EDGE CASES
// ===========================================================================

/**
 * Team with zero points
 */
export const ZeroPoints: Story = {
  args: {
    leaderboard: [
      createTeam('team-1', 'Leader', 15, 50, [
        createMember('player-1', 'Player One', 15, 25),
        createMember('player-2', 'Player Two', 15, 25),
      ]),
      createTeam('team-2', 'Zero Team', 20, 0, [
        createMember('player-3', 'Player Three', 20, 0),
        createMember('player-4', 'Player Four', 20, 0),
      ]),
    ],
  },
};

/**
 * Very long team names
 */
export const LongTeamNames: Story = {
  args: {
    leaderboard: [
      createTeam(
        'team-1',
        'The Extraordinarily Long Named Golf Team From Melbourne',
        15,
        80,
        [
          createMember('player-1', 'Alexander Hamilton Washington', 15, 40),
          createMember('player-2', 'Elizabeth Bennet Darcy Smith', 15, 40),
        ]
      ),
      createTeam(
        'team-2',
        'Another Ridiculously Long Team Name For Testing Purposes',
        18,
        75,
        [
          createMember('player-3', 'Christopher Robin Pooh Bear', 18, 38),
          createMember('player-4', 'Samantha Patricia O\'Brien', 18, 37),
        ]
      ),
    ],
  },
};

/**
 * High handicap teams
 */
export const HighHandicapTeams: Story = {
  args: {
    leaderboard: [
      createTeam('team-1', 'High Handicappers', 36.5, 85, [
        createMember('player-1', 'Beginner One', 38, 45),
        createMember('player-2', 'Beginner Two', 35, 40),
      ]),
      createTeam('team-2', 'Learning Curve', 32.0, 75, [
        createMember('player-3', 'Newbie One', 30, 38),
        createMember('player-4', 'Newbie Two', 34, 37),
      ]),
    ],
  },
};

/**
 * Low handicap teams (scratch players)
 */
export const LowHandicapTeams: Story = {
  args: {
    leaderboard: [
      createTeam('team-1', 'Scratch Squad', 0.5, 92, [
        createMember('player-1', 'Pro One', 0, 47),
        createMember('player-2', 'Pro Two', 1, 45),
      ]),
      createTeam('team-2', 'Single Digits', 4.5, 88, [
        createMember('player-3', 'Elite One', 3, 45),
        createMember('player-4', 'Elite Two', 6, 43),
      ]),
    ],
  },
};

/**
 * Decimal handicaps
 */
export const DecimalHandicaps: Story = {
  args: {
    leaderboard: [
      createTeam('team-1', 'Precision Team', 15.7, 82, [
        createMember('player-1', 'Player A', 14.3, 42),
        createMember('player-2', 'Player B', 17.1, 40),
      ]),
      createTeam('team-2', 'Calculated Squad', 18.3, 78, [
        createMember('player-3', 'Player C', 16.9, 40),
        createMember('player-4', 'Player D', 19.7, 38),
      ]),
    ],
  },
};

/**
 * Team with empty members array
 */
export const EmptyMembersTeam: Story = {
  args: {
    leaderboard: [
      createTeam('team-1', 'Full Team', 15, 80, [
        createMember('player-1', 'Player One', 15, 40),
        createMember('player-2', 'Player Two', 15, 40),
      ]),
      createTeam('team-2', 'No Members Yet', 0, 0, []),
    ],
  },
};

// ===========================================================================
// STORIES - COMBINATIONS
// ===========================================================================

/**
 * Full feature showcase: current user, ties, many teams
 */
export const FullFeatures: Story = {
  args: {
    leaderboard: [
      createTeam('team-1', 'Leaders', 12.0, 95, [
        createMember('player-1', 'Top Player', 10, 50),
        createMember('current-user', 'You', 14, 45),
      ]),
      createTeam('team-2', 'Tied A', 15.0, 85, [
        createMember('player-3', 'Player Three', 14, 43),
        createMember('player-4', 'Player Four', 16, 42),
      ]),
      createTeam('team-3', 'Tied B', 16.0, 85, [
        createMember('player-5', 'Player Five', 15, 43),
        createMember('player-6', 'Player Six', 17, 42),
      ]),
      createTeam('team-4', 'Contenders', 18.0, 75, [
        createMember('player-7', 'Player Seven', 17, 38),
        createMember('player-8', 'Player Eight', 19, 37),
      ]),
      createTeam('team-5', 'Underdogs', 22.0, 65, [
        createMember('player-9', 'Player Nine', 20, 33),
        createMember('player-10', 'Player Ten', 24, 32),
      ]),
    ],
    currentUserId: 'current-user',
    showTiedIndicator: true,
    testID: 'full-features-leaderboard',
  },
};

/**
 * Competition in progress (mixed scores)
 */
export const InProgress: Story = {
  args: {
    leaderboard: [
      createTeam('team-1', 'Leading Team', 15.0, 42, [
        createMember('player-1', 'Fast Player', 14, 22, 2),
        createMember('player-2', 'Quick Scorer', 16, 20, 2),
      ]),
      createTeam('team-2', 'Catching Up', 17.0, 36, [
        createMember('player-3', 'Steady Eddie', 15, 18, 2),
        createMember('player-4', 'Slow Start', 19, 18, 1),
      ]),
      createTeam('team-3', 'Just Started', 20.0, 18, [
        createMember('player-5', 'Late Arrival', 18, 10, 1),
        createMember('player-6', 'New Entry', 22, 8, 1),
      ]),
    ],
  },
};
