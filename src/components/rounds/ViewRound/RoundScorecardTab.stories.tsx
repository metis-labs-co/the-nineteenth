/**
 * RoundScorecardTab Stories
 *
 * Storybook stories showcasing different states and configurations
 * of the RoundScorecardTab component.
 */

import React from 'react';
import type { Meta, StoryObj } from '@storybook/react';
import { View, StyleSheet } from 'react-native';
import { RoundScorecardTab } from './RoundScorecardTab';
import type { ScorecardWithPlayer, RoundPlayer } from '@/hooks/useRoundDetails';
import type { Hole } from '@/types/database.types';

// ===========================================================================
// STORY FIXTURES
// ===========================================================================

const createHoles = (): Hole[] => {
  const pars: (3 | 4 | 5)[] = [4, 3, 5, 4, 4, 3, 4, 5, 4, 4, 3, 5, 4, 4, 3, 4, 5, 4];
  const strokeIndexes = [7, 15, 1, 11, 5, 17, 3, 9, 13, 8, 16, 2, 12, 6, 18, 4, 10, 14];

  return pars.map((par, i) => ({
    number: (i + 1) as 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10 | 11 | 12 | 13 | 14 | 15 | 16 | 17 | 18,
    par,
    strokeIndex: strokeIndexes[i],
    yardages: { blue: 400 + i * 10, white: 380 + i * 10, red: 350 + i * 10 },
  }));
};

const holes = createHoles();

function createScorecardWithPlayer(
  playerId: string,
  name: string,
  handicap: number,
  scores: Record<string, { strokes: number }> = {},
  status: 'not-started' | 'in-progress' | 'completed' = 'completed'
): ScorecardWithPlayer {
  return {
    id: `scorecard-${playerId}`,
    round_id: 'round-1',
    player_id: playerId,
    scores,
    total_gross: Object.values(scores).reduce((sum, s) => sum + (s.strokes || 0), 0) || 0,
    total_net: 0,
    total_points: 36,
    status,
    submitted_at: status === 'completed' ? new Date().toISOString() : null,
    submitted_by: null,
    device_id: null,
    synced_at: null,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    player: {
      id: playerId,
      name,
      handicap,
      email: `${playerId}@test.com`,
      phone: null,
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
    },
    ball_totals: null,
  };
}

function createRoundPlayer(id: string, name: string, handicap: number): RoundPlayer {
  return {
    id,
    name,
    handicap,
    email: `${id}@test.com`,
    phone: null,
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
    has_scorecard: false,
  };
}

function generateScores(
  courseHoles: Hole[],
  offset: number = 0
): Record<string, { strokes: number }> {
  const scores: Record<string, { strokes: number }> = {};
  courseHoles.forEach((hole) => {
    scores[String(hole.number)] = { strokes: hole.par + offset };
  });
  return scores;
}

function generateMixedScores(courseHoles: Hole[]): Record<string, { strokes: number }> {
  const scores: Record<string, { strokes: number }> = {};
  const offsets = [-2, -1, 0, 1, 2, 0, -1, 1, 0, 2, -1, 0, 1, 0, -1, 2, 1, 0];
  courseHoles.forEach((hole, index) => {
    scores[String(hole.number)] = {
      strokes: hole.par + offsets[index % offsets.length],
    };
  });
  return scores;
}

function generatePartialScores(
  courseHoles: Hole[],
  completedHoles: number
): Record<string, { strokes: number }> {
  const scores: Record<string, { strokes: number }> = {};
  courseHoles.slice(0, completedHoles).forEach((hole) => {
    scores[String(hole.number)] = { strokes: hole.par };
  });
  return scores;
}

// ===========================================================================
// META CONFIGURATION
// ===========================================================================

const meta: Meta<typeof RoundScorecardTab> = {
  title: 'Rounds/ViewRound/RoundScorecardTab',
  component: RoundScorecardTab,
  parameters: {
    layout: 'fullscreen',
  },
  decorators: [
    (Story) => (
      <View style={styles.container}>
        <Story />
      </View>
    ),
  ],
};

export default meta;
type Story = StoryObj<typeof RoundScorecardTab>;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 16,
    backgroundColor: '#f5f5f5',
  },
});

// ===========================================================================
// STORIES
// ===========================================================================

/**
 * Default state with two players and full scorecards
 */
export const Default: Story = {
  args: {
    scorecards: [
      createScorecardWithPlayer('player-1', 'John Smith', 15, generateScores(holes, 0)),
      createScorecardWithPlayer('player-2', 'Jane Doe', 20, generateScores(holes, 2)),
    ],
    roundPlayers: [],
    holes,
  },
};

/**
 * Empty state when no players are in the round
 */
export const EmptyState: Story = {
  args: {
    scorecards: [],
    roundPlayers: [],
    holes,
  },
};

/**
 * Single player scorecard
 */
export const SinglePlayer: Story = {
  args: {
    scorecards: [
      createScorecardWithPlayer('player-1', 'Solo Golfer', 18, generateMixedScores(holes)),
    ],
    roundPlayers: [],
    holes,
  },
};

/**
 * Four player group - typical foursome
 */
export const FourPlayers: Story = {
  args: {
    scorecards: [
      createScorecardWithPlayer('player-1', 'Alice Anderson', 10, generateScores(holes, -2)),
      createScorecardWithPlayer('player-2', 'Bob Brown', 15, generateScores(holes, 0)),
      createScorecardWithPlayer('player-3', 'Carol Carter', 20, generateScores(holes, 3)),
      createScorecardWithPlayer('player-4', 'Dave Davis', 25, generateScores(holes, 5)),
    ],
    roundPlayers: [],
    holes,
  },
};

/**
 * Large group with many players
 */
export const ManyPlayers: Story = {
  args: {
    scorecards: Array.from({ length: 8 }, (_, i) =>
      createScorecardWithPlayer(
        `player-${i + 1}`,
        ['Alex', 'Blake', 'Casey', 'Dana', 'Evan', 'Fiona', 'George', 'Holly'][i],
        10 + i * 3,
        generateScores(holes, Math.floor(Math.random() * 10) - 3)
      )
    ),
    roundPlayers: [],
    holes,
  },
};

/**
 * Mixed score variations showing different score types
 */
export const MixedScores: Story = {
  args: {
    scorecards: [
      createScorecardWithPlayer('player-1', 'Eagle Eddie', 5, generateMixedScores(holes)),
      createScorecardWithPlayer('player-2', 'Birdie Bob', 10, generateScores(holes, -1)),
      createScorecardWithPlayer('player-3', 'Bogey Bill', 25, generateScores(holes, 1)),
    ],
    roundPlayers: [],
    holes,
  },
};

/**
 * Players with no scores yet (not started)
 */
export const NotStarted: Story = {
  args: {
    scorecards: [
      createScorecardWithPlayer('player-1', 'John Smith', 15, {}, 'not-started'),
      createScorecardWithPlayer('player-2', 'Jane Doe', 20, {}, 'not-started'),
    ],
    roundPlayers: [],
    holes,
  },
};

/**
 * In progress round with partial scores
 */
export const InProgress: Story = {
  args: {
    scorecards: [
      createScorecardWithPlayer(
        'player-1',
        'John Smith',
        15,
        generatePartialScores(holes, 9),
        'in-progress'
      ),
      createScorecardWithPlayer(
        'player-2',
        'Jane Doe',
        20,
        generatePartialScores(holes, 9),
        'in-progress'
      ),
    ],
    roundPlayers: [],
    holes,
  },
};

/**
 * Mixed status - some completed, some in progress
 */
export const MixedStatus: Story = {
  args: {
    scorecards: [
      createScorecardWithPlayer('player-1', 'John Smith', 15, generateScores(holes, 0), 'completed'),
      createScorecardWithPlayer(
        'player-2',
        'Jane Doe',
        20,
        generatePartialScores(holes, 12),
        'in-progress'
      ),
      createScorecardWithPlayer('player-3', 'Bob Wilson', 10, {}, 'not-started'),
    ],
    roundPlayers: [],
    holes,
  },
};

/**
 * Using roundPlayers (from pairings) instead of scorecards
 */
export const WithRoundPlayers: Story = {
  args: {
    scorecards: [],
    roundPlayers: [
      createRoundPlayer('player-1', 'John Smith', 15),
      createRoundPlayer('player-2', 'Jane Doe', 20),
      createRoundPlayer('player-3', 'Bob Wilson', 10),
    ],
    holes,
  },
};

/**
 * Round players with some scorecards linked
 */
export const RoundPlayersWithScorecards: Story = {
  args: {
    scorecards: [
      createScorecardWithPlayer('player-1', 'John Smith', 15, generateScores(holes, 0)),
    ],
    roundPlayers: [
      createRoundPlayer('player-1', 'John Smith', 15),
      createRoundPlayer('player-2', 'Jane Doe', 20),
      createRoundPlayer('player-3', 'Bob Wilson', 10),
    ],
    holes,
  },
};

/**
 * 9-hole course
 */
export const NineHoleCourse: Story = {
  args: {
    scorecards: [
      createScorecardWithPlayer(
        'player-1',
        'John Smith',
        15,
        generateScores(holes.filter((h) => h.number <= 9), 0)
      ),
      createScorecardWithPlayer(
        'player-2',
        'Jane Doe',
        20,
        generateScores(holes.filter((h) => h.number <= 9), 2)
      ),
    ],
    roundPlayers: [],
    holes: holes.filter((h) => h.number <= 9),
  },
};

/**
 * Null holes (should use default 18 holes)
 */
export const NullHoles: Story = {
  args: {
    scorecards: [
      createScorecardWithPlayer('player-1', 'John Smith', 15, generateScores(holes, 0)),
    ],
    roundPlayers: [],
    holes: null,
  },
};

/**
 * Scratch golfer (0 handicap)
 */
export const ScratchGolfer: Story = {
  args: {
    scorecards: [
      createScorecardWithPlayer('player-1', 'Scratch Sam', 0, generateScores(holes, -4)),
    ],
    roundPlayers: [],
    holes,
  },
};

/**
 * High handicapper (54 handicap - max)
 */
export const HighHandicapper: Story = {
  args: {
    scorecards: [
      createScorecardWithPlayer('player-1', 'Beginner Betty', 54, generateScores(holes, 10)),
    ],
    roundPlayers: [],
    holes,
  },
};

/**
 * Varied handicaps in group
 */
export const VariedHandicaps: Story = {
  args: {
    scorecards: [
      createScorecardWithPlayer('player-1', 'Pro Pete', 0, generateScores(holes, -5)),
      createScorecardWithPlayer('player-2', 'Good Gary', 8, generateScores(holes, -2)),
      createScorecardWithPlayer('player-3', 'Average Andy', 18, generateScores(holes, 2)),
      createScorecardWithPlayer('player-4', 'Learner Larry', 36, generateScores(holes, 8)),
    ],
    roundPlayers: [],
    holes,
  },
};

/**
 * With onPlayerPress callback
 */
export const WithPlayerPressCallback: Story = {
  args: {
    scorecards: [
      createScorecardWithPlayer('player-1', 'John Smith', 15, generateScores(holes, 0)),
      createScorecardWithPlayer('player-2', 'Jane Doe', 20, generateScores(holes, 2)),
    ],
    roundPlayers: [],
    holes,
    onPlayerPress: (playerId: string) => {
      console.log('Player pressed:', playerId);
      alert(`Player ${playerId} pressed`);
    },
  },
};

/**
 * All par scores
 */
export const AllPars: Story = {
  args: {
    scorecards: [
      createScorecardWithPlayer('player-1', 'Par Pete', 15, generateScores(holes, 0)),
    ],
    roundPlayers: [],
    holes,
  },
};

/**
 * Exceptional round (under par)
 */
export const ExceptionalRound: Story = {
  args: {
    scorecards: [
      createScorecardWithPlayer('player-1', 'Pro Golfer', 0, generateScores(holes, -4)),
    ],
    roundPlayers: [],
    holes,
  },
};

/**
 * Rough round (over par)
 */
export const RoughRound: Story = {
  args: {
    scorecards: [
      createScorecardWithPlayer('player-1', 'Bad Day Bob', 20, generateScores(holes, 10)),
    ],
    roundPlayers: [],
    holes,
  },
};

/**
 * Player with null player data
 */
export const NullPlayerData: Story = {
  args: {
    scorecards: [
      {
        id: 'scorecard-1',
        round_id: 'round-1',
        player_id: 'player-1',
        scores: generateScores(holes, 0),
        total_gross: 72,
        total_net: 60,
        total_points: 36,
        ball_totals: null,
        status: 'completed',
        submitted_at: null,
        submitted_by: null,
        device_id: null,
        synced_at: null,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        player: null,
      },
    ],
    roundPlayers: [],
    holes,
  },
};

/**
 * Long player names
 */
export const LongPlayerNames: Story = {
  args: {
    scorecards: [
      createScorecardWithPlayer(
        'player-1',
        'Alexander Bartholomew Christopher',
        15,
        generateScores(holes, 0)
      ),
      createScorecardWithPlayer(
        'player-2',
        'Elizabeth Montgomery-Richardson',
        20,
        generateScores(holes, 2)
      ),
    ],
    roundPlayers: [],
    holes,
  },
};
