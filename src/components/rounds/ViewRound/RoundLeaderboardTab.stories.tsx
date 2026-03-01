/**
 * RoundLeaderboardTab Storybook Stories
 *
 * Stories showcasing the round leaderboard tab component with:
 * - Various player counts
 * - Tie scenarios
 * - Empty states
 * - Edge cases
 */

import React from 'react';
import type { Meta, StoryObj } from '@storybook/react';
import { View } from 'react-native';
import { RoundLeaderboardTab } from './RoundLeaderboardTab';
import type { ScorecardWithPlayer } from '@/hooks/useRoundDetails';

// =====================================================
// META CONFIGURATION
// =====================================================

const meta: Meta<typeof RoundLeaderboardTab> = {
  title: 'Rounds/RoundLeaderboardTab',
  component: RoundLeaderboardTab,
  decorators: [
    (Story) => (
      <View style={{ flex: 1, padding: 16 }}>
        <Story />
      </View>
    ),
  ],
  parameters: {
    layout: 'fullscreen',
  },
};

export default meta;
type Story = StoryObj<typeof RoundLeaderboardTab>;

// =====================================================
// HELPER FUNCTIONS
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
      email: `${playerName.toLowerCase().replace(/ /g, '.')}@example.com`,
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

// =====================================================
// BASIC STORIES
// =====================================================

export const Default: Story = {
  args: {
    scorecards: [
      createMockScorecard('1', 'John Smith', 15, 36),
      createMockScorecard('2', 'Jane Doe', 20, 34),
      createMockScorecard('3', 'Bob Wilson', 10, 32),
      createMockScorecard('4', 'Alice Brown', 18, 30),
    ],
  },
};

export const Empty: Story = {
  args: {
    scorecards: [],
  },
};

export const SinglePlayer: Story = {
  args: {
    scorecards: [createMockScorecard('1', 'Solo Golfer', 18, 36)],
  },
};

export const TwoPlayers: Story = {
  args: {
    scorecards: [
      createMockScorecard('1', 'Player One', 12, 38),
      createMockScorecard('2', 'Player Two', 18, 32),
    ],
  },
};

// =====================================================
// TIE SCENARIOS
// =====================================================

export const TiedForSecond: Story = {
  args: {
    scorecards: [
      createMockScorecard('1', 'Leader Smith', 15, 40),
      createMockScorecard('2', 'Tied Player 1', 20, 36),
      createMockScorecard('3', 'Tied Player 2', 18, 36),
      createMockScorecard('4', 'Fourth Place', 22, 30),
    ],
  },
};

export const TiedForFirst: Story = {
  args: {
    scorecards: [
      createMockScorecard('1', 'Co-Leader 1', 15, 40),
      createMockScorecard('2', 'Co-Leader 2', 12, 40),
      createMockScorecard('3', 'Third Place', 18, 35),
    ],
  },
};

export const ThreeWayTie: Story = {
  args: {
    scorecards: [
      createMockScorecard('1', 'Leader', 10, 42),
      createMockScorecard('2', 'Tied Player A', 15, 38),
      createMockScorecard('3', 'Tied Player B', 18, 38),
      createMockScorecard('4', 'Tied Player C', 20, 38),
      createMockScorecard('5', 'Fifth Place', 22, 32),
    ],
  },
};

export const MultipleTiedGroups: Story = {
  args: {
    scorecards: [
      createMockScorecard('1', 'First Tie A', 15, 40),
      createMockScorecard('2', 'First Tie B', 12, 40),
      createMockScorecard('3', 'Third Solo', 18, 36),
      createMockScorecard('4', 'Fourth Tie A', 20, 32),
      createMockScorecard('5', 'Fourth Tie B', 22, 32),
      createMockScorecard('6', 'Sixth Place', 25, 28),
    ],
  },
};

export const AllTied: Story = {
  args: {
    scorecards: [
      createMockScorecard('1', 'Player One', 15, 36),
      createMockScorecard('2', 'Player Two', 18, 36),
      createMockScorecard('3', 'Player Three', 20, 36),
      createMockScorecard('4', 'Player Four', 22, 36),
    ],
  },
};

// =====================================================
// HANDICAP VARIATIONS
// =====================================================

export const LowHandicaps: Story = {
  args: {
    scorecards: [
      createMockScorecard('1', 'Scratch Golfer', 0, 40),
      createMockScorecard('2', 'Low HC Player', 5, 38),
      createMockScorecard('3', 'Single Digit', 8, 36),
    ],
  },
};

export const HighHandicaps: Story = {
  args: {
    scorecards: [
      createMockScorecard('1', 'Beginner One', 36, 32),
      createMockScorecard('2', 'Beginner Two', 40, 30),
      createMockScorecard('3', 'New Golfer', 54, 25),
    ],
  },
};

export const MixedHandicaps: Story = {
  args: {
    scorecards: [
      createMockScorecard('1', 'Pro Golfer', 0, 42),
      createMockScorecard('2', 'Mid HC', 18, 38),
      createMockScorecard('3', 'High HC', 36, 35),
      createMockScorecard('4', 'Scratch', 2, 34),
    ],
  },
};

// =====================================================
// SCORE VARIATIONS
// =====================================================

export const HighScores: Story = {
  args: {
    scorecards: [
      createMockScorecard('1', 'Amazing Round', 15, 48),
      createMockScorecard('2', 'Great Round', 12, 44),
      createMockScorecard('3', 'Good Round', 18, 40),
    ],
  },
};

export const LowScores: Story = {
  args: {
    scorecards: [
      createMockScorecard('1', 'Tough Day', 15, 20),
      createMockScorecard('2', 'Struggle Bus', 18, 18),
      createMockScorecard('3', 'Bad Round', 20, 15),
    ],
  },
};

export const ZeroScores: Story = {
  args: {
    scorecards: [
      createMockScorecard('1', 'No Points Yet', 15, 0),
      createMockScorecard('2', 'Still Warming Up', 18, 0),
    ],
  },
};

export const NullScores: Story = {
  args: {
    scorecards: [
      createMockScorecard('1', 'Not Started', 15, 0),
      createMockScorecard('2', 'Also Not Started', 18, 0),
    ],
  },
};

export const MixedNullAndValid: Story = {
  args: {
    scorecards: [
      createMockScorecard('1', 'Finished', 15, 38),
      createMockScorecard('2', 'In Progress', 18, 20),
      createMockScorecard('3', 'Not Started', 20, 0),
    ],
  },
};

// =====================================================
// LARGE GROUP SCENARIOS
// =====================================================

export const EightPlayers: Story = {
  args: {
    scorecards: [
      createMockScorecard('1', 'Leader Smith', 10, 40),
      createMockScorecard('2', 'Second Place', 15, 38),
      createMockScorecard('3', 'Third Spot', 12, 36),
      createMockScorecard('4', 'Fourth Pos', 18, 34),
      createMockScorecard('5', 'Fifth Player', 20, 32),
      createMockScorecard('6', 'Sixth Golfer', 22, 30),
      createMockScorecard('7', 'Seventh Slot', 25, 28),
      createMockScorecard('8', 'Eighth Place', 28, 26),
    ],
  },
};

export const SixteenPlayers: Story = {
  args: {
    scorecards: Array.from({ length: 16 }, (_, i) =>
      createMockScorecard(
        `${i + 1}`,
        `Player ${i + 1}`,
        10 + i,
        45 - i * 2
      )
    ),
  },
};

export const TwentyPlayers: Story = {
  args: {
    scorecards: Array.from({ length: 20 }, (_, i) =>
      createMockScorecard(
        `${i + 1}`,
        `Golfer ${String.fromCharCode(65 + i)}`,
        5 + i * 2,
        50 - i * 2
      )
    ),
  },
};

// =====================================================
// EDGE CASES
// =====================================================

export const VeryLongNames: Story = {
  args: {
    scorecards: [
      createMockScorecard('1', 'Alexander Bartholomew Christopher', 15, 40),
      createMockScorecard('2', 'Maximilian Fitzgerald Wellington III', 18, 38),
      createMockScorecard('3', 'Short Name', 12, 36),
    ],
  },
};

export const MissingPlayerData: Story = {
  args: {
    scorecards: [
      {
        ...createMockScorecard('1', 'Known Player', 15, 40),
      },
      {
        ...createMockScorecard('2', 'Unknown', 18, 38),
        player: null,
      },
      {
        ...createMockScorecard('3', 'Also Unknown', 20, 36),
        player: null,
      },
    ],
  },
};

export const NullHandicaps: Story = {
  args: {
    scorecards: [
      createMockScorecard('1', 'Player One', 15, 40),
      {
        ...createMockScorecard('2', 'Player Two', 18, 38),
        player: {
          ...createMockScorecard('2', 'Player Two', 18, 38).player!,
          handicap: null,
        },
      },
    ],
  },
};

export const CloseCompetition: Story = {
  args: {
    scorecards: [
      createMockScorecard('1', 'Leader', 15, 36),
      createMockScorecard('2', 'Close Second', 18, 35),
      createMockScorecard('3', 'Third', 12, 35),
      createMockScorecard('4', 'Fourth', 20, 34),
      createMockScorecard('5', 'Fifth', 22, 34),
      createMockScorecard('6', 'Sixth', 16, 33),
    ],
  },
};

// =====================================================
// REALISTIC SCENARIOS
// =====================================================

export const WeekendFourball: Story = {
  args: {
    scorecards: [
      createMockScorecard('1', 'Dave Johnson', 18, 38),
      createMockScorecard('2', 'Mike Thompson', 15, 36),
      createMockScorecard('3', 'Steve Wilson', 22, 34),
      createMockScorecard('4', 'Phil Brown', 20, 32),
    ],
  },
};

export const CorporateEvent: Story = {
  args: {
    scorecards: [
      createMockScorecard('1', 'CEO Smith', 24, 38),
      createMockScorecard('2', 'CFO Jones', 18, 36),
      createMockScorecard('3', 'CTO Williams', 30, 35),
      createMockScorecard('4', 'VP Marketing', 22, 34),
      createMockScorecard('5', 'Director Ops', 28, 33),
      createMockScorecard('6', 'Manager Sales', 32, 32),
      createMockScorecard('7', 'Team Lead', 20, 31),
      createMockScorecard('8', 'Analyst', 36, 30),
    ],
  },
};

export const ClubChampionship: Story = {
  args: {
    scorecards: [
      createMockScorecard('1', 'Tiger Woods Jr', 2, 42),
      createMockScorecard('2', 'Rory McIlroy II', 4, 40),
      createMockScorecard('3', 'Brooks Koepka III', 6, 38),
      createMockScorecard('4', 'Justin Thomas IV', 3, 37),
      createMockScorecard('5', 'Jordan Spieth V', 5, 36),
    ],
  },
};

export const SeniorsDay: Story = {
  args: {
    scorecards: [
      createMockScorecard('1', 'Harold Smith', 28, 36),
      createMockScorecard('2', 'Bernard Jones', 32, 34),
      createMockScorecard('3', 'Walter Williams', 30, 33),
      createMockScorecard('4', 'Donald Brown', 35, 32),
    ],
  },
};

export const JuniorCompetition: Story = {
  args: {
    scorecards: [
      createMockScorecard('1', 'Tommy Junior', 28, 32),
      createMockScorecard('2', 'Sarah Youth', 32, 30),
      createMockScorecard('3', 'Michael Kid', 36, 28),
      createMockScorecard('4', 'Emily Teen', 34, 27),
    ],
  },
};

// =====================================================
// IN-PROGRESS SCENARIOS
// =====================================================

export const EarlyRound: Story = {
  args: {
    scorecards: [
      createMockScorecard('1', 'Fast Starter', 15, 12), // 3 holes in
      createMockScorecard('2', 'Quick Play', 18, 10),
      createMockScorecard('3', 'Slow Group', 20, 6),
      createMockScorecard('4', 'Just Teed Off', 22, 0),
    ],
  },
};

export const MidRound: Story = {
  args: {
    scorecards: [
      createMockScorecard('1', 'Front Nine Done', 15, 20), // 9 holes
      createMockScorecard('2', 'Almost Turn', 18, 18),
      createMockScorecard('3', 'Behind Pace', 20, 14),
      createMockScorecard('4', 'Catching Up', 22, 12),
    ],
  },
};

export const NearlyComplete: Story = {
  args: {
    scorecards: [
      createMockScorecard('1', 'Almost Done', 15, 34), // 17 holes
      createMockScorecard('2', 'Last Hole', 18, 32),
      createMockScorecard('3', 'Finishing Up', 20, 30),
      createMockScorecard('4', 'One More', 22, 28),
    ],
  },
};
