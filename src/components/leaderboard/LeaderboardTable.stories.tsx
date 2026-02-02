/**
 * LeaderboardTable Stories
 *
 * Storybook stories for the LeaderboardTable component showcasing:
 * - Different data states (empty, loading, populated)
 * - Current user highlighting
 * - First place trophy display
 * - Tied positions with T indicator
 * - Rounds played column
 * - Various edge cases
 */

import React from 'react';
import type { Meta, StoryObj } from '@storybook/react';
import { LeaderboardTable } from './LeaderboardTable';
import type { LeaderboardEntry } from '@/hooks/useCompetitionLeaderboard';

// =====================================================
// META CONFIGURATION
// =====================================================

const meta: Meta<typeof LeaderboardTable> = {
  title: 'Leaderboard/LeaderboardTable',
  component: LeaderboardTable,
  parameters: {
    layout: 'padded',
  },
  argTypes: {
    leaderboard: {
      description: 'Array of leaderboard entries to display',
    },
    currentUserId: {
      description: 'ID of the current user for highlighting',
      control: 'text',
    },
    isLoading: {
      description: 'Whether the data is loading',
      control: 'boolean',
    },
    showRoundsPlayed: {
      description: 'Show rounds played column',
      control: 'boolean',
    },
    showTiedIndicator: {
      description: 'Show tied indicator (T) next to position',
      control: 'boolean',
    },
    emptyMessage: {
      description: 'Custom empty state message',
      control: 'text',
    },
    testID: {
      description: 'Test ID for testing',
      control: 'text',
    },
  },
  decorators: [
    (Story) => (
      <div style={{ padding: 16, maxWidth: 500 }}>
        <Story />
      </div>
    ),
  ],
};

export default meta;
type Story = StoryObj<typeof LeaderboardTable>;

// =====================================================
// FIXTURE HELPERS
// =====================================================

function createEntry(overrides: Partial<LeaderboardEntry> = {}): LeaderboardEntry {
  const id = overrides.playerId || `player-${Math.random().toString(36).substr(2, 6)}`;
  return {
    playerId: id,
    playerName: overrides.playerName || `Player ${id.substr(7)}`,
    handicap: overrides.handicap ?? 18,
    totalPoints: overrides.totalPoints ?? 36,
    roundsPlayed: overrides.roundsPlayed ?? 1,
    ...overrides,
  };
}

// =====================================================
// BASIC STORIES
// =====================================================

export const Default: Story = {
  args: {
    leaderboard: [
      createEntry({ playerId: 'p1', playerName: 'John Smith', handicap: 12, totalPoints: 40, roundsPlayed: 2 }),
      createEntry({ playerId: 'p2', playerName: 'Jane Doe', handicap: 18, totalPoints: 38, roundsPlayed: 2 }),
      createEntry({ playerId: 'p3', playerName: 'Bob Wilson', handicap: 15, totalPoints: 36, roundsPlayed: 2 }),
      createEntry({ playerId: 'p4', playerName: 'Sarah Jones', handicap: 22, totalPoints: 34, roundsPlayed: 2 }),
      createEntry({ playerId: 'p5', playerName: 'Mike Brown', handicap: 10, totalPoints: 32, roundsPlayed: 2 }),
    ],
  },
};

export const Loading: Story = {
  args: {
    leaderboard: [],
    isLoading: true,
  },
};

export const Empty: Story = {
  args: {
    leaderboard: [],
    isLoading: false,
  },
};

export const EmptyWithCustomMessage: Story = {
  args: {
    leaderboard: [],
    isLoading: false,
    emptyMessage: 'The round has not started yet. Check back once players begin submitting their scores.',
  },
};

// =====================================================
// CURRENT USER STORIES
// =====================================================

export const CurrentUserHighlighted: Story = {
  args: {
    leaderboard: [
      createEntry({ playerId: 'p1', playerName: 'John Smith', handicap: 12, totalPoints: 40 }),
      createEntry({ playerId: 'p2', playerName: 'Jane Doe', handicap: 18, totalPoints: 38 }),
      createEntry({ playerId: 'current-user', playerName: 'You (highlighted)', handicap: 15, totalPoints: 36 }),
      createEntry({ playerId: 'p4', playerName: 'Sarah Jones', handicap: 22, totalPoints: 34 }),
    ],
    currentUserId: 'current-user',
  },
};

export const CurrentUserInFirstPlace: Story = {
  args: {
    leaderboard: [
      createEntry({ playerId: 'current-user', playerName: 'Me', handicap: 12, totalPoints: 42 }),
      createEntry({ playerId: 'p2', playerName: 'Jane Doe', handicap: 18, totalPoints: 38 }),
      createEntry({ playerId: 'p3', playerName: 'Bob Wilson', handicap: 15, totalPoints: 36 }),
    ],
    currentUserId: 'current-user',
  },
};

export const CurrentUserInLastPlace: Story = {
  args: {
    leaderboard: [
      createEntry({ playerId: 'p1', playerName: 'John Smith', handicap: 12, totalPoints: 42 }),
      createEntry({ playerId: 'p2', playerName: 'Jane Doe', handicap: 18, totalPoints: 38 }),
      createEntry({ playerId: 'p3', playerName: 'Bob Wilson', handicap: 15, totalPoints: 36 }),
      createEntry({ playerId: 'current-user', playerName: 'Me', handicap: 24, totalPoints: 28 }),
    ],
    currentUserId: 'current-user',
  },
};

// =====================================================
// TIED POSITIONS STORIES
// =====================================================

export const WithTiedPositions: Story = {
  args: {
    leaderboard: [
      createEntry({ playerId: 'p1', playerName: 'Leader', handicap: 10, totalPoints: 42 }),
      createEntry({ playerId: 'p2', playerName: 'Tied Second A', handicap: 15, totalPoints: 38 }),
      createEntry({ playerId: 'p3', playerName: 'Tied Second B', handicap: 18, totalPoints: 38 }),
      createEntry({ playerId: 'p4', playerName: 'Fourth Place', handicap: 12, totalPoints: 36 }),
      createEntry({ playerId: 'p5', playerName: 'Tied Fifth A', handicap: 20, totalPoints: 34 }),
      createEntry({ playerId: 'p6', playerName: 'Tied Fifth B', handicap: 22, totalPoints: 34 }),
    ],
    showTiedIndicator: true,
  },
};

export const WithTiedIndicatorHidden: Story = {
  args: {
    leaderboard: [
      createEntry({ playerId: 'p1', playerName: 'Leader', handicap: 10, totalPoints: 42 }),
      createEntry({ playerId: 'p2', playerName: 'Tied Second A', handicap: 15, totalPoints: 38 }),
      createEntry({ playerId: 'p3', playerName: 'Tied Second B', handicap: 18, totalPoints: 38 }),
    ],
    showTiedIndicator: false,
  },
};

export const ThreeWayTie: Story = {
  args: {
    leaderboard: [
      createEntry({ playerId: 'p1', playerName: 'Leader', handicap: 10, totalPoints: 44 }),
      createEntry({ playerId: 'p2', playerName: 'Tied A', handicap: 12, totalPoints: 38 }),
      createEntry({ playerId: 'p3', playerName: 'Tied B', handicap: 15, totalPoints: 38 }),
      createEntry({ playerId: 'p4', playerName: 'Tied C', handicap: 18, totalPoints: 38 }),
      createEntry({ playerId: 'p5', playerName: 'Fifth', handicap: 20, totalPoints: 34 }),
    ],
  },
};

export const AllTiedForFirst: Story = {
  args: {
    leaderboard: [
      createEntry({ playerId: 'p1', playerName: 'Player A', handicap: 10, totalPoints: 36 }),
      createEntry({ playerId: 'p2', playerName: 'Player B', handicap: 15, totalPoints: 36 }),
      createEntry({ playerId: 'p3', playerName: 'Player C', handicap: 18, totalPoints: 36 }),
    ],
  },
};

export const CurrentUserTied: Story = {
  args: {
    leaderboard: [
      createEntry({ playerId: 'p1', playerName: 'Leader', handicap: 10, totalPoints: 42 }),
      createEntry({ playerId: 'current-user', playerName: 'Me', handicap: 15, totalPoints: 38 }),
      createEntry({ playerId: 'p3', playerName: 'Also Tied', handicap: 18, totalPoints: 38 }),
      createEntry({ playerId: 'p4', playerName: 'Fourth', handicap: 20, totalPoints: 34 }),
    ],
    currentUserId: 'current-user',
  },
};

// =====================================================
// ROUNDS PLAYED STORIES
// =====================================================

export const WithRoundsPlayed: Story = {
  args: {
    leaderboard: [
      createEntry({ playerId: 'p1', playerName: 'John Smith', handicap: 12, totalPoints: 78, roundsPlayed: 3 }),
      createEntry({ playerId: 'p2', playerName: 'Jane Doe', handicap: 18, totalPoints: 72, roundsPlayed: 2 }),
      createEntry({ playerId: 'p3', playerName: 'Bob Wilson', handicap: 15, totalPoints: 70, roundsPlayed: 3 }),
      createEntry({ playerId: 'p4', playerName: 'Sarah Jones', handicap: 22, totalPoints: 36, roundsPlayed: 1 }),
    ],
    showRoundsPlayed: true,
  },
};

export const SingleRound: Story = {
  args: {
    leaderboard: [
      createEntry({ playerId: 'p1', playerName: 'John Smith', handicap: 12, totalPoints: 40, roundsPlayed: 1 }),
      createEntry({ playerId: 'p2', playerName: 'Jane Doe', handicap: 18, totalPoints: 38, roundsPlayed: 1 }),
    ],
    showRoundsPlayed: true,
  },
};

export const MixedRoundsPlayed: Story = {
  args: {
    leaderboard: [
      createEntry({ playerId: 'p1', playerName: 'Played 5 rounds', handicap: 10, totalPoints: 180, roundsPlayed: 5 }),
      createEntry({ playerId: 'p2', playerName: 'Played 3 rounds', handicap: 15, totalPoints: 108, roundsPlayed: 3 }),
      createEntry({ playerId: 'p3', playerName: 'Played 1 round', handicap: 20, totalPoints: 36, roundsPlayed: 1 }),
      createEntry({ playerId: 'p4', playerName: 'No rounds yet', handicap: 18, totalPoints: 0, roundsPlayed: 0 }),
    ],
    showRoundsPlayed: true,
  },
};

// =====================================================
// EDGE CASE STORIES
// =====================================================

export const SinglePlayer: Story = {
  args: {
    leaderboard: [
      createEntry({ playerId: 'p1', playerName: 'Only Player', handicap: 18, totalPoints: 36 }),
    ],
  },
};

export const TwoPlayers: Story = {
  args: {
    leaderboard: [
      createEntry({ playerId: 'p1', playerName: 'First Place', handicap: 12, totalPoints: 40 }),
      createEntry({ playerId: 'p2', playerName: 'Second Place', handicap: 18, totalPoints: 36 }),
    ],
  },
};

export const ManyPlayers: Story = {
  args: {
    leaderboard: Array.from({ length: 16 }, (_, i) =>
      createEntry({
        playerId: `p${i + 1}`,
        playerName: `Player ${i + 1}`,
        handicap: 10 + i,
        totalPoints: 45 - i * 2,
        roundsPlayed: 2,
      })
    ),
  },
};

export const LongPlayerNames: Story = {
  args: {
    leaderboard: [
      createEntry({ playerId: 'p1', playerName: 'Alexander Montgomery-Worthington III', handicap: 12, totalPoints: 42 }),
      createEntry({ playerId: 'p2', playerName: 'Elizabeth Anne Katherine Smith-Johnson', handicap: 18, totalPoints: 38 }),
      createEntry({ playerId: 'p3', playerName: 'Christopher Benjamin Davidson', handicap: 15, totalPoints: 36 }),
    ],
  },
};

export const ZeroHandicaps: Story = {
  args: {
    leaderboard: [
      createEntry({ playerId: 'p1', playerName: 'Scratch Golfer A', handicap: 0, totalPoints: 40 }),
      createEntry({ playerId: 'p2', playerName: 'Scratch Golfer B', handicap: 0, totalPoints: 38 }),
      createEntry({ playerId: 'p3', playerName: 'High Handicapper', handicap: 36, totalPoints: 36 }),
    ],
  },
};

export const HighScores: Story = {
  args: {
    leaderboard: [
      createEntry({ playerId: 'p1', playerName: 'Amazing Round', handicap: 10, totalPoints: 48 }),
      createEntry({ playerId: 'p2', playerName: 'Great Round', handicap: 12, totalPoints: 45 }),
      createEntry({ playerId: 'p3', playerName: 'Good Round', handicap: 15, totalPoints: 42 }),
    ],
  },
};

export const LowScores: Story = {
  args: {
    leaderboard: [
      createEntry({ playerId: 'p1', playerName: 'Struggled Today', handicap: 18, totalPoints: 18 }),
      createEntry({ playerId: 'p2', playerName: 'Tough Day', handicap: 22, totalPoints: 15 }),
      createEntry({ playerId: 'p3', playerName: 'Very Tough', handicap: 28, totalPoints: 12 }),
    ],
  },
};

export const ZeroPoints: Story = {
  args: {
    leaderboard: [
      createEntry({ playerId: 'p1', playerName: 'Some Points', handicap: 18, totalPoints: 20 }),
      createEntry({ playerId: 'p2', playerName: 'Few Points', handicap: 22, totalPoints: 10 }),
      createEntry({ playerId: 'p3', playerName: 'No Points Yet', handicap: 28, totalPoints: 0 }),
    ],
  },
};

// =====================================================
// SORTING STORIES
// =====================================================

export const UnsortedInput: Story = {
  args: {
    leaderboard: [
      createEntry({ playerId: 'p1', playerName: 'Should be 3rd', handicap: 18, totalPoints: 34 }),
      createEntry({ playerId: 'p2', playerName: 'Should be 1st', handicap: 12, totalPoints: 42 }),
      createEntry({ playerId: 'p3', playerName: 'Should be 2nd', handicap: 15, totalPoints: 38 }),
      createEntry({ playerId: 'p4', playerName: 'Should be 4th', handicap: 20, totalPoints: 30 }),
    ],
  },
};

// =====================================================
// REALISTIC SCENARIOS
// =====================================================

export const CompetitionLeaderboard: Story = {
  args: {
    leaderboard: [
      createEntry({ playerId: 'p1', playerName: 'Michael Thompson', handicap: 8, totalPoints: 116, roundsPlayed: 3 }),
      createEntry({ playerId: 'p2', playerName: 'David Chen', handicap: 12, totalPoints: 112, roundsPlayed: 3 }),
      createEntry({ playerId: 'p3', playerName: 'Sarah Williams', handicap: 15, totalPoints: 108, roundsPlayed: 3 }),
      createEntry({ playerId: 'p4', playerName: 'James Anderson', handicap: 18, totalPoints: 105, roundsPlayed: 3 }),
      createEntry({ playerId: 'p5', playerName: 'Emily Davis', handicap: 20, totalPoints: 102, roundsPlayed: 3 }),
      createEntry({ playerId: 'p6', playerName: 'Robert Taylor', handicap: 22, totalPoints: 98, roundsPlayed: 3 }),
      createEntry({ playerId: 'p7', playerName: 'Jennifer Brown', handicap: 24, totalPoints: 95, roundsPlayed: 3 }),
      createEntry({ playerId: 'p8', playerName: 'William Clark', handicap: 26, totalPoints: 92, roundsPlayed: 3 }),
    ],
    showRoundsPlayed: true,
  },
};

export const WeeklyStablefordWithCurrentUser: Story = {
  args: {
    leaderboard: [
      createEntry({ playerId: 'p1', playerName: 'Tom Harris', handicap: 14, totalPoints: 42 }),
      createEntry({ playerId: 'p2', playerName: 'Lisa Martinez', handicap: 19, totalPoints: 40 }),
      createEntry({ playerId: 'current-user', playerName: 'Current User', handicap: 16, totalPoints: 38 }),
      createEntry({ playerId: 'p4', playerName: 'Andrew Lee', handicap: 22, totalPoints: 36 }),
      createEntry({ playerId: 'p5', playerName: 'Karen Wilson', handicap: 25, totalPoints: 34 }),
    ],
    currentUserId: 'current-user',
  },
};

export const CloseCompetition: Story = {
  args: {
    leaderboard: [
      createEntry({ playerId: 'p1', playerName: 'Leader', handicap: 12, totalPoints: 39 }),
      createEntry({ playerId: 'p2', playerName: 'Close Second', handicap: 15, totalPoints: 38 }),
      createEntry({ playerId: 'p3', playerName: 'Tied Third A', handicap: 18, totalPoints: 37 }),
      createEntry({ playerId: 'p4', playerName: 'Tied Third B', handicap: 20, totalPoints: 37 }),
      createEntry({ playerId: 'p5', playerName: 'Fifth Place', handicap: 22, totalPoints: 36 }),
    ],
    showTiedIndicator: true,
  },
};

// =====================================================
// COMBINED FEATURES STORIES
// =====================================================

export const AllFeaturesEnabled: Story = {
  args: {
    leaderboard: [
      createEntry({ playerId: 'p1', playerName: 'Leader', handicap: 10, totalPoints: 120, roundsPlayed: 3 }),
      createEntry({ playerId: 'p2', playerName: 'Tied 2nd A', handicap: 14, totalPoints: 112, roundsPlayed: 3 }),
      createEntry({ playerId: 'p3', playerName: 'Tied 2nd B', handicap: 16, totalPoints: 112, roundsPlayed: 3 }),
      createEntry({ playerId: 'current-user', playerName: 'Current User', handicap: 18, totalPoints: 108, roundsPlayed: 3 }),
      createEntry({ playerId: 'p5', playerName: 'Fifth', handicap: 20, totalPoints: 104, roundsPlayed: 3 }),
    ],
    currentUserId: 'current-user',
    showRoundsPlayed: true,
    showTiedIndicator: true,
  },
};

export const FullCompetitionWithAllStates: Story = {
  args: {
    leaderboard: [
      createEntry({ playerId: 'p1', playerName: 'Tournament Leader', handicap: 8, totalPoints: 126, roundsPlayed: 4 }),
      createEntry({ playerId: 'p2', playerName: 'Second Place', handicap: 12, totalPoints: 120, roundsPlayed: 4 }),
      createEntry({ playerId: 'p3', playerName: 'Tied 3rd A', handicap: 14, totalPoints: 116, roundsPlayed: 4 }),
      createEntry({ playerId: 'p4', playerName: 'Tied 3rd B', handicap: 15, totalPoints: 116, roundsPlayed: 4 }),
      createEntry({ playerId: 'p5', playerName: 'Tied 3rd C', handicap: 17, totalPoints: 116, roundsPlayed: 4 }),
      createEntry({ playerId: 'current-user', playerName: 'You', handicap: 18, totalPoints: 112, roundsPlayed: 4 }),
      createEntry({ playerId: 'p7', playerName: 'Seventh Place', handicap: 20, totalPoints: 108, roundsPlayed: 4 }),
      createEntry({ playerId: 'p8', playerName: 'Eighth Place', handicap: 22, totalPoints: 104, roundsPlayed: 4 }),
      createEntry({ playerId: 'p9', playerName: 'Ninth Place', handicap: 24, totalPoints: 100, roundsPlayed: 4 }),
      createEntry({ playerId: 'p10', playerName: 'Tenth Place', handicap: 26, totalPoints: 96, roundsPlayed: 4 }),
    ],
    currentUserId: 'current-user',
    showRoundsPlayed: true,
    showTiedIndicator: true,
  },
};
