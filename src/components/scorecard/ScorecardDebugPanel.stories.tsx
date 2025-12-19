/**
 * ScorecardDebugPanel Storybook Stories
 *
 * Visual tests for the debug panel component showing:
 * - Default state with all sections
 * - Team round with team data
 * - Match play mode
 * - Offline/syncing states
 * - Error states
 */

import React from 'react';
import type { Meta, StoryObj } from '@storybook/react';
import { View } from 'react-native';
import { ScorecardDebugPanel } from './ScorecardDebugPanel';
import type { TeamWithMembers } from '@/types/database.types';
import type { Player } from '@/types';

// Note: In Storybook, we need to mock the store differently
// The actual component uses useScorecardStore which we can't easily mock in stories
// These stories show the props-based data display

const meta: Meta<typeof ScorecardDebugPanel> = {
  title: 'Scorecard/ScorecardDebugPanel',
  component: ScorecardDebugPanel,
  parameters: {
    layout: 'fullscreen',
  },
  decorators: [
    (Story) => (
      <View style={{ flex: 1, backgroundColor: '#F5F5F5' }}>
        <Story />
      </View>
    ),
  ],
  argTypes: {
    visible: {
      control: 'boolean',
      description: 'Whether the panel is visible',
    },
    isTeamRound: {
      control: 'boolean',
      description: 'Whether this is a team format round',
    },
    teamFormat: {
      control: 'select',
      options: ['best-ball', 'scramble', 'match-play-team', null],
      description: 'Team format type',
    },
    scoringPairsEnabled: {
      control: 'boolean',
      description: 'Whether scoring pairs are enabled',
    },
  },
};

export default meta;
type Story = StoryObj<typeof ScorecardDebugPanel>;

// ===========================================================================
// MOCK DATA
// ===========================================================================

const mockPlayers: Player[] = [
  { id: 'player-1', name: 'John Smith', email: 'john@test.com', handicap: 15, phone: null, golf_id: null, handicap_updated_at: null, photo_url: null, created_at: '', updated_at: '' },
  { id: 'player-2', name: 'Jane Doe', email: 'jane@test.com', handicap: 20, phone: null, golf_id: null, handicap_updated_at: null, photo_url: null, created_at: '', updated_at: '' },
  { id: 'player-3', name: 'Bob Wilson', email: 'bob@test.com', handicap: 10, phone: null, golf_id: null, handicap_updated_at: null, photo_url: null, created_at: '', updated_at: '' },
  { id: 'player-4', name: 'Alice Brown', email: 'alice@test.com', handicap: 25, phone: null, golf_id: null, handicap_updated_at: null, photo_url: null, created_at: '', updated_at: '' },
];

const mockTeams: TeamWithMembers[] = [
  {
    id: 'team-1',
    competition_id: 'comp-1',
    name: 'Team Alpha',
    created_at: '',
    updated_at: '',
    members: [
      { team_id: 'team-1', player_id: 'player-1', joined_at: '', player: mockPlayers[0] },
      { team_id: 'team-1', player_id: 'player-2', joined_at: '', player: mockPlayers[1] },
    ],
  },
  {
    id: 'team-2',
    competition_id: 'comp-1',
    name: 'Team Beta',
    created_at: '',
    updated_at: '',
    members: [
      { team_id: 'team-2', player_id: 'player-3', joined_at: '', player: mockPlayers[2] },
      { team_id: 'team-2', player_id: 'player-4', joined_at: '', player: mockPlayers[3] },
    ],
  },
];

const mockMatchPlayData = {
  player1: { id: 'player-1', name: 'John Smith', handicap: 15 },
  player2: { id: 'player-3', name: 'Bob Wilson', handicap: 10 },
  matchStatus: '2 UP through 9',
  holeResults: {
    1: { player1Score: 4, player2Score: 5, winner: 'player1' as const },
    2: { player1Score: 5, player2Score: 4, winner: 'player2' as const },
    3: { player1Score: 4, player2Score: 4, winner: 'halved' as const },
    4: { player1Score: 3, player2Score: 4, winner: 'player1' as const },
    5: { player1Score: 5, player2Score: 5, winner: 'halved' as const },
    6: { player1Score: 4, player2Score: 5, winner: 'player1' as const },
    7: { player1Score: 4, player2Score: 4, winner: 'halved' as const },
    8: { player1Score: 6, player2Score: 5, winner: 'player2' as const },
    9: { player1Score: 4, player2Score: 5, winner: 'player1' as const },
  },
};

// ===========================================================================
// STORIES
// ===========================================================================

/**
 * Default view with basic round data.
 * Shows all standard sections expanded.
 */
export const Default: Story = {
  args: {
    visible: true,
    onClose: () => console.log('Close pressed'),
    roundId: 'round-12345678-abcd-efgh',
    competitionId: 'comp-87654321-wxyz',
    courseName: 'Royal Melbourne Golf Club',
    isTeamRound: false,
    teamFormat: null,
    scoringPairsEnabled: false,
  },
};

/**
 * Hidden state - panel not visible.
 * Useful for testing visibility toggle.
 */
export const Hidden: Story = {
  args: {
    visible: false,
    onClose: () => console.log('Close pressed'),
    roundId: 'round-123',
    courseName: 'Test Course',
  },
};

/**
 * Stableford game type display.
 */
export const StablefordGame: Story = {
  args: {
    visible: true,
    onClose: () => console.log('Close pressed'),
    roundId: 'round-stableford-123',
    competitionId: 'comp-456',
    courseName: 'Metropolitan Golf Club',
    isTeamRound: false,
    scoringPairsEnabled: false,
  },
};

/**
 * Team round with Best Ball format.
 * Shows team section with team data.
 */
export const TeamRoundBestBall: Story = {
  args: {
    visible: true,
    onClose: () => console.log('Close pressed'),
    roundId: 'round-team-bestball-123',
    competitionId: 'comp-team-456',
    courseName: 'Kingston Heath Golf Club',
    isTeamRound: true,
    teamFormat: 'best-ball',
    teams: mockTeams,
    scoringPairsEnabled: false,
  },
};

/**
 * Team round with Scramble/Ambrose format.
 */
export const TeamRoundScramble: Story = {
  args: {
    visible: true,
    onClose: () => console.log('Close pressed'),
    roundId: 'round-team-scramble-123',
    competitionId: 'comp-team-789',
    courseName: 'Victoria Golf Club',
    isTeamRound: true,
    teamFormat: 'scramble',
    teams: mockTeams,
    scoringPairsEnabled: false,
  },
};

/**
 * Individual Match Play round.
 * Shows match play section with hole-by-hole results.
 */
export const MatchPlay: Story = {
  args: {
    visible: true,
    onClose: () => console.log('Close pressed'),
    roundId: 'round-matchplay-123',
    competitionId: 'comp-matchplay-456',
    courseName: 'The National Golf Club',
    isTeamRound: false,
    matchPlayData: mockMatchPlayData,
    scoringPairsEnabled: false,
  },
};

/**
 * Team Match Play round.
 * Shows both teams section and match play results.
 */
export const TeamMatchPlay: Story = {
  args: {
    visible: true,
    onClose: () => console.log('Close pressed'),
    roundId: 'round-team-matchplay-123',
    competitionId: 'comp-team-matchplay',
    courseName: 'Peninsula Kingswood',
    isTeamRound: true,
    teamFormat: 'match-play-team',
    teams: mockTeams,
    matchPlayData: {
      player1: { id: 'team-1', name: 'Team Alpha', handicap: 17 },
      player2: { id: 'team-2', name: 'Team Beta', handicap: 18 },
      matchStatus: '1 UP',
      holeResults: {
        1: { player1Score: 8, player2Score: 9, winner: 'player1' },
        2: { player1Score: 6, player2Score: 6, winner: 'halved' },
        3: { player1Score: 9, player2Score: 8, winner: 'player2' },
      },
    },
    scoringPairsEnabled: false,
  },
};

/**
 * Scoring pairs enabled.
 * Shows which players are assigned to score.
 */
export const WithScoringPairs: Story = {
  args: {
    visible: true,
    onClose: () => console.log('Close pressed'),
    roundId: 'round-scoring-pairs-123',
    competitionId: 'comp-789',
    courseName: 'Yarra Yarra Golf Club',
    isTeamRound: false,
    scoringPairsEnabled: true,
    playersToScore: [mockPlayers[0], mockPlayers[1]],
  },
};

/**
 * Unknown course name.
 * Shows fallback display for null/undefined course.
 */
export const UnknownCourse: Story = {
  args: {
    visible: true,
    onClose: () => console.log('Close pressed'),
    roundId: 'round-unknown-123',
    competitionId: 'comp-unknown-456',
    courseName: null,
    isTeamRound: false,
    scoringPairsEnabled: false,
  },
};

/**
 * Empty teams array.
 * Team round but no teams assigned yet.
 */
export const EmptyTeams: Story = {
  args: {
    visible: true,
    onClose: () => console.log('Close pressed'),
    roundId: 'round-empty-teams',
    competitionId: 'comp-empty-teams',
    courseName: 'Huntingdale Golf Club',
    isTeamRound: true,
    teamFormat: 'best-ball',
    teams: [],
    scoringPairsEnabled: false,
  },
};

/**
 * Single team in team round.
 */
export const SingleTeam: Story = {
  args: {
    visible: true,
    onClose: () => console.log('Close pressed'),
    roundId: 'round-single-team',
    competitionId: 'comp-single-team',
    courseName: 'Commonwealth Golf Club',
    isTeamRound: true,
    teamFormat: 'scramble',
    teams: [mockTeams[0]],
    scoringPairsEnabled: false,
  },
};

/**
 * Match play with halved match (All Square).
 */
export const MatchPlayAllSquare: Story = {
  args: {
    visible: true,
    onClose: () => console.log('Close pressed'),
    roundId: 'round-matchplay-as',
    competitionId: 'comp-matchplay-as',
    courseName: 'Ellerston Golf Course',
    isTeamRound: false,
    matchPlayData: {
      player1: { id: 'player-1', name: 'John Smith', handicap: 15 },
      player2: { id: 'player-3', name: 'Bob Wilson', handicap: 15 },
      matchStatus: 'All Square',
      holeResults: {
        1: { player1Score: 4, player2Score: 4, winner: 'halved' },
        2: { player1Score: 5, player2Score: 5, winner: 'halved' },
        3: { player1Score: 4, player2Score: 4, winner: 'halved' },
      },
    },
    scoringPairsEnabled: false,
  },
};

/**
 * Match play in progress with incomplete holes.
 */
export const MatchPlayInProgress: Story = {
  args: {
    visible: true,
    onClose: () => console.log('Close pressed'),
    roundId: 'round-matchplay-inprogress',
    competitionId: 'comp-matchplay-inprogress',
    courseName: 'Barwon Heads Golf Club',
    isTeamRound: false,
    matchPlayData: {
      player1: { id: 'player-1', name: 'John Smith', handicap: 12 },
      player2: { id: 'player-2', name: 'Jane Doe', handicap: 18 },
      matchStatus: '1 DOWN through 3',
      holeResults: {
        1: { player1Score: 4, player2Score: 4, winner: 'halved' },
        2: { player1Score: 6, player2Score: 5, winner: 'player2' },
        3: { player1Score: null, player2Score: null, winner: null },
      },
    },
    scoringPairsEnabled: false,
  },
};

/**
 * Full configuration with all features enabled.
 */
export const FullConfiguration: Story = {
  args: {
    visible: true,
    onClose: () => console.log('Close pressed'),
    roundId: 'round-full-config-12345678',
    competitionId: 'comp-full-config-87654321',
    courseName: 'Barnbougle Dunes',
    isTeamRound: true,
    teamFormat: 'best-ball',
    teams: mockTeams,
    scoringPairsEnabled: true,
    playersToScore: [mockPlayers[0], mockPlayers[2]],
    matchPlayData: undefined, // No match play in this config
  },
};
