/**
 * BestBallScoreView Component Stories
 *
 * Storybook stories for the Best Ball scoring view component.
 * Demonstrates various states including:
 * - Basic rendering with no scores
 * - Various score combinations
 * - Best ball highlighting
 * - Disabled state
 * - Different team sizes
 * - Different hole pars
 * - Edge cases
 */

import React from 'react';
import type { Meta, StoryObj } from '@storybook/react';
import { BestBallScoreView } from './BestBallScoreView';
import type { TeamWithMembers, Hole, HoleScore, Player } from '@/types/database.types';

// ===========================================================================
// HELPERS
// ===========================================================================

function createPlayer(id: string, name: string, handicap: number): Player {
  return {
    id,
    name,
    email: `${id}@test.com`,
    phone: null,
    handicap,
    golf_id: null,
    handicap_updated_at: null,
    photo_url: null,
    home_venue_id: null,
    push_enabled: true,
    push_competition_updates: true,
    push_friend_requests: true,
    push_scorecard_updates: true,
    equipped_badge_id: null,
    equipped_frame_id: null,
    equipped_title_id: null,
    is_placeholder: false,
    created_by: null,
    linked_player_id: null,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };
}

function createTeam(id: string, name: string, players: Player[]): TeamWithMembers {
  return {
    id,
    competition_id: 'comp-1',
    name,
    members: players.map((player) => ({
      team_id: id,
      player_id: player.id,
      joined_at: new Date().toISOString(),
      player,
    })),
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };
}

// ===========================================================================
// FIXTURES
// ===========================================================================

const defaultPlayers = [
  createPlayer('player-1', 'John Smith', 15),
  createPlayer('player-2', 'Jane Doe', 20),
  createPlayer('player-3', 'Bob Wilson', 10),
];

const defaultTeam = createTeam('team-1', 'Team Awesome', defaultPlayers);

const par4Hole: Hole = {
  number: 1,
  par: 4,
  strokeIndex: 7,
  yardages: { blue: 420, white: 400, red: 370 },
};

const par3Hole: Hole = {
  number: 2,
  par: 3,
  strokeIndex: 15,
  yardages: { blue: 180, white: 165, red: 140 },
};

const par5Hole: Hole = {
  number: 3,
  par: 5,
  strokeIndex: 1,
  yardages: { blue: 540, white: 520, red: 480 },
};

// ===========================================================================
// META
// ===========================================================================

const meta: Meta<typeof BestBallScoreView> = {
  title: 'Scorecard/BestBallScoreView',
  component: BestBallScoreView,
  parameters: {
    layout: 'padded',
  },
  argTypes: {
    onScoreSelect: { action: 'score selected' },
    disabled: { control: 'boolean' },
  },
  decorators: [
    (Story) => (
      <div style={{ maxWidth: 400, margin: '0 auto', padding: 16 }}>
        <Story />
      </div>
    ),
  ],
};

export default meta;
type Story = StoryObj<typeof BestBallScoreView>;

// ===========================================================================
// BASIC STORIES
// ===========================================================================

export const Default: Story = {
  args: {
    team: defaultTeam,
    currentHole: par4Hole,
    playerScores: new Map(),
    disabled: false,
  },
};

export const WithScores: Story = {
  args: {
    team: defaultTeam,
    currentHole: par4Hole,
    playerScores: new Map([
      ['player-1', { strokes: 4 }],
      ['player-2', { strokes: 5 }],
      ['player-3', { strokes: 4 }],
    ]),
    disabled: false,
  },
};

export const WithBestBallHighlighted: Story = {
  args: {
    team: defaultTeam,
    currentHole: par4Hole,
    playerScores: new Map([
      ['player-1', { strokes: 5 }], // Bogey
      ['player-2', { strokes: 3 }], // Birdie - BEST
      ['player-3', { strokes: 6 }], // Double bogey
    ]),
    disabled: false,
  },
};

// ===========================================================================
// SCORE STATES
// ===========================================================================

export const AllPar: Story = {
  args: {
    team: defaultTeam,
    currentHole: par4Hole,
    playerScores: new Map([
      ['player-1', { strokes: 4 }],
      ['player-2', { strokes: 4 }],
      ['player-3', { strokes: 4 }],
    ]),
    disabled: false,
  },
};

export const MixedScores: Story = {
  args: {
    team: defaultTeam,
    currentHole: par4Hole,
    playerScores: new Map([
      ['player-1', { strokes: 3 }], // Eagle
      ['player-2', { strokes: 5 }], // Bogey
      ['player-3', { strokes: 7 }], // Triple
    ]),
    disabled: false,
  },
};

export const OnePlayerPickedUp: Story = {
  args: {
    team: defaultTeam,
    currentHole: par4Hole,
    playerScores: new Map([
      ['player-1', { strokes: 4 }],
      ['player-2', { strokes: 10 }], // Picked up
      ['player-3', { strokes: 5 }],
    ]),
    disabled: false,
  },
};

export const AllPlayersPickedUp: Story = {
  args: {
    team: defaultTeam,
    currentHole: par4Hole,
    playerScores: new Map([
      ['player-1', { strokes: 10 }],
      ['player-2', { strokes: 10 }],
      ['player-3', { strokes: 10 }],
    ]),
    disabled: false,
  },
};

export const PartialScores: Story = {
  args: {
    team: defaultTeam,
    currentHole: par4Hole,
    playerScores: new Map([
      ['player-1', { strokes: 4 }],
      // player-2 has no score yet
      ['player-3', { strokes: 5 }],
    ]),
    disabled: false,
  },
};

export const BirdieForBest: Story = {
  args: {
    team: defaultTeam,
    currentHole: par4Hole,
    playerScores: new Map([
      ['player-1', { strokes: 3 }], // Birdie - BEST
      ['player-2', { strokes: 4 }], // Par
      ['player-3', { strokes: 5 }], // Bogey
    ]),
    disabled: false,
  },
};

export const EagleForBest: Story = {
  args: {
    team: defaultTeam,
    currentHole: par4Hole,
    playerScores: new Map([
      ['player-1', { strokes: 2 }], // Eagle - BEST
      ['player-2', { strokes: 4 }], // Par
      ['player-3', { strokes: 5 }], // Bogey
    ]),
    disabled: false,
  },
};

// ===========================================================================
// DISABLED STATES
// ===========================================================================

export const Disabled: Story = {
  args: {
    team: defaultTeam,
    currentHole: par4Hole,
    playerScores: new Map([
      ['player-1', { strokes: 4 }],
      ['player-2', { strokes: 5 }],
      ['player-3', { strokes: 4 }],
    ]),
    disabled: true,
  },
};

export const DisabledNoScores: Story = {
  args: {
    team: defaultTeam,
    currentHole: par4Hole,
    playerScores: new Map(),
    disabled: true,
  },
};

// ===========================================================================
// EDITABLE PLAYER RESTRICTIONS
// ===========================================================================

export const PartiallyEditable: Story = {
  args: {
    team: defaultTeam,
    currentHole: par4Hole,
    playerScores: new Map([
      ['player-1', { strokes: 4 }],
      ['player-2', { strokes: 5 }],
      ['player-3', { strokes: 4 }],
    ]),
    editablePlayerIds: new Set(['player-1']), // Only first player editable
    disabled: false,
  },
};

export const TwoPlayersEditable: Story = {
  args: {
    team: defaultTeam,
    currentHole: par4Hole,
    playerScores: new Map([
      ['player-1', { strokes: 4 }],
      ['player-2', { strokes: 5 }],
      ['player-3', { strokes: 4 }],
    ]),
    editablePlayerIds: new Set(['player-1', 'player-3']),
    disabled: false,
  },
};

// ===========================================================================
// DIFFERENT HOLE PARS
// ===========================================================================

export const Par3Hole: Story = {
  args: {
    team: defaultTeam,
    currentHole: par3Hole,
    playerScores: new Map([
      ['player-1', { strokes: 3 }], // Par
      ['player-2', { strokes: 2 }], // Birdie - BEST
      ['player-3', { strokes: 4 }], // Bogey
    ]),
    disabled: false,
  },
};

export const Par5Hole: Story = {
  args: {
    team: defaultTeam,
    currentHole: par5Hole,
    playerScores: new Map([
      ['player-1', { strokes: 5 }], // Par
      ['player-2', { strokes: 4 }], // Birdie - BEST
      ['player-3', { strokes: 6 }], // Bogey
    ]),
    disabled: false,
  },
};

// ===========================================================================
// TEAM SIZE VARIATIONS
// ===========================================================================

export const TwoPlayerTeam: Story = {
  args: {
    team: createTeam('team-2', 'Dynamic Duo', [
      createPlayer('player-a', 'Alice', 12),
      createPlayer('player-b', 'Bob', 18),
    ]),
    currentHole: par4Hole,
    playerScores: new Map([
      ['player-a', { strokes: 4 }],
      ['player-b', { strokes: 5 }],
    ]),
    disabled: false,
  },
};

export const FourPlayerTeam: Story = {
  args: {
    team: createTeam('team-4', 'Fantastic Four', [
      createPlayer('player-w', 'Wayne', 8),
      createPlayer('player-x', 'Xavier', 15),
      createPlayer('player-y', 'Yasmin', 22),
      createPlayer('player-z', 'Zara', 28),
    ]),
    currentHole: par4Hole,
    playerScores: new Map([
      ['player-w', { strokes: 4 }],
      ['player-x', { strokes: 5 }],
      ['player-y', { strokes: 6 }],
      ['player-z', { strokes: 7 }],
    ]),
    disabled: false,
  },
};

export const SinglePlayerTeam: Story = {
  args: {
    team: createTeam('team-solo', 'Solo Golfer', [
      createPlayer('player-solo', 'Solo Sam', 15),
    ]),
    currentHole: par4Hole,
    playerScores: new Map([
      ['player-solo', { strokes: 4 }],
    ]),
    disabled: false,
  },
};

// ===========================================================================
// HANDICAP VARIATIONS
// ===========================================================================

export const HighHandicapPlayers: Story = {
  args: {
    team: createTeam('team-high-hc', 'High Handicappers', [
      createPlayer('player-h1', 'Beginner Bob', 36),
      createPlayer('player-h2', 'Novice Nancy', 42),
      createPlayer('player-h3', 'Starter Steve', 48),
    ]),
    currentHole: par4Hole,
    playerScores: new Map([
      ['player-h1', { strokes: 6 }],
      ['player-h2', { strokes: 7 }],
      ['player-h3', { strokes: 8 }],
    ]),
    disabled: false,
  },
};

export const LowHandicapPlayers: Story = {
  args: {
    team: createTeam('team-low-hc', 'Low Handicappers', [
      createPlayer('player-l1', 'Pro Pete', 2),
      createPlayer('player-l2', 'Scratch Sam', 0),
      createPlayer('player-l3', 'Plus Paul', -2),
    ]),
    currentHole: par4Hole,
    playerScores: new Map([
      ['player-l1', { strokes: 3 }],
      ['player-l2', { strokes: 3 }],
      ['player-l3', { strokes: 2 }],
    ]),
    disabled: false,
  },
};

export const MixedHandicaps: Story = {
  args: {
    team: createTeam('team-mixed-hc', 'Mixed Handicaps', [
      createPlayer('player-m1', 'Pro', 0),
      createPlayer('player-m2', 'Average', 18),
      createPlayer('player-m3', 'Beginner', 36),
    ]),
    currentHole: par4Hole,
    playerScores: new Map([
      ['player-m1', { strokes: 3 }],
      ['player-m2', { strokes: 5 }],
      ['player-m3', { strokes: 7 }],
    ]),
    disabled: false,
  },
};

// ===========================================================================
// EDGE CASES
// ===========================================================================

export const MaxScores: Story = {
  args: {
    team: defaultTeam,
    currentHole: par4Hole,
    playerScores: new Map([
      ['player-1', { strokes: 12 }], // MAX_SCORE
      ['player-2', { strokes: 12 }],
      ['player-3', { strokes: 12 }],
    ]),
    disabled: false,
  },
};

export const MinScores: Story = {
  args: {
    team: defaultTeam,
    currentHole: par4Hole,
    playerScores: new Map([
      ['player-1', { strokes: 1 }], // Hole in one!
      ['player-2', { strokes: 2 }],
      ['player-3', { strokes: 3 }],
    ]),
    disabled: false,
  },
};

export const LongTeamName: Story = {
  args: {
    team: createTeam('team-long', 'The Most Amazing Golf Team in the Entire World Championship', [
      createPlayer('player-ln1', 'Player 1', 15),
      createPlayer('player-ln2', 'Player 2', 18),
    ]),
    currentHole: par4Hole,
    playerScores: new Map([
      ['player-ln1', { strokes: 4 }],
      ['player-ln2', { strokes: 5 }],
    ]),
    disabled: false,
  },
};

export const LongPlayerNames: Story = {
  args: {
    team: createTeam('team-long-names', 'Team Long Names', [
      createPlayer('player-ln1', 'Alexander Hamilton the Third Junior', 15),
      createPlayer('player-ln2', 'Bartholomew Christopher Davidson', 18),
      createPlayer('player-ln3', 'Constantine Demetrius Evangelista', 22),
    ]),
    currentHole: par4Hole,
    playerScores: new Map([
      ['player-ln1', { strokes: 4 }],
      ['player-ln2', { strokes: 5 }],
      ['player-ln3', { strokes: 6 }],
    ]),
    disabled: false,
  },
};

export const EmptyTeam: Story = {
  args: {
    team: createTeam('team-empty', 'Empty Team', []),
    currentHole: par4Hole,
    playerScores: new Map(),
    disabled: false,
  },
};

// ===========================================================================
// TIED SCORES
// ===========================================================================

export const TiedForBest: Story = {
  args: {
    team: defaultTeam,
    currentHole: par4Hole,
    playerScores: new Map([
      ['player-1', { strokes: 3 }], // Birdie - BEST (first)
      ['player-2', { strokes: 3 }], // Birdie - tied
      ['player-3', { strokes: 5 }], // Bogey
    ]),
    disabled: false,
  },
};

export const AllTied: Story = {
  args: {
    team: defaultTeam,
    currentHole: par4Hole,
    playerScores: new Map([
      ['player-1', { strokes: 4 }],
      ['player-2', { strokes: 4 }],
      ['player-3', { strokes: 4 }],
    ]),
    disabled: false,
  },
};

// ===========================================================================
// INTERACTIVE STORY
// ===========================================================================

export const Interactive: Story = {
  args: {
    team: defaultTeam,
    currentHole: par4Hole,
    playerScores: new Map(),
    disabled: false,
  },
  render: function InteractiveStory(args) {
    const [scores, setScores] = React.useState<Map<string, HoleScore | undefined>>(new Map());

    const handleScoreSelect = (playerId: string, strokes: number) => {
      setScores((prev) => {
        const newScores = new Map(prev);
        newScores.set(playerId, { strokes });
        return newScores;
      });
    };

    return (
      <BestBallScoreView
        {...args}
        playerScores={scores}
        onScoreSelect={handleScoreSelect}
      />
    );
  },
};
