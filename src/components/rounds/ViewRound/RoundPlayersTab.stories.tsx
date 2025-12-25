/**
 * RoundPlayersTab Stories
 *
 * Storybook stories for the RoundPlayersTab component.
 * Shows various states including:
 * - Empty state (no players)
 * - Single player
 * - Multiple players
 * - Players with different score breakdowns
 * - Players not started
 * - Players with completed rounds
 * - Edge cases (null data, long names, etc.)
 */

import React from 'react';
import type { Meta, StoryObj } from '@storybook/react';
import { View, StyleSheet } from 'react-native';
import { RoundPlayersTab } from './RoundPlayersTab';
import { create18Holes, createTestPlayer, createTestScorecard } from '@/__tests__/utils/testFixtures';
import type { ScorecardWithPlayer } from '@/hooks/useRoundDetails';
import type { Hole } from '@/types/database.types';

const meta: Meta<typeof RoundPlayersTab> = {
  title: 'Rounds/ViewRound/RoundPlayersTab',
  component: RoundPlayersTab,
  parameters: {
    layout: 'padded',
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
type Story = StoryObj<typeof RoundPlayersTab>;

// ===========================================================================
// HELPERS
// ===========================================================================

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 16,
    backgroundColor: '#f5f5f5',
  },
});

function createScorecardWithPlayer(
  playerName: string,
  handicap: number,
  totalPoints: number,
  scores: Record<string, { strokes: number }> = {}
): ScorecardWithPlayer {
  const player = createTestPlayer({
    id: `player-${playerName.toLowerCase().replace(/\s/g, '-')}`,
    name: playerName,
    handicap,
  });

  const scorecard = createTestScorecard({
    id: `scorecard-${player.id}`,
    player_id: player.id,
    total_points: totalPoints,
    scores,
  });

  return {
    ...scorecard,
    player,
  };
}

function createScoresForHoles(
  holes: Hole[],
  offsets: number[]
): Record<string, { strokes: number }> {
  const scores: Record<string, { strokes: number }> = {};
  holes.forEach((hole, index) => {
    const offset = offsets[index % offsets.length] || 0;
    scores[String(hole.number)] = { strokes: hole.par + offset };
  });
  return scores;
}

const standardHoles = create18Holes();
const nineHoles = standardHoles.slice(0, 9);

// ===========================================================================
// BASIC STORIES
// ===========================================================================

export const Default: Story = {
  args: {
    scorecards: [
      createScorecardWithPlayer('John Smith', 15, 36),
      createScorecardWithPlayer('Jane Doe', 12, 34),
      createScorecardWithPlayer('Mike Wilson', 20, 32),
    ],
    holes: standardHoles,
  },
};

export const EmptyState: Story = {
  args: {
    scorecards: [],
    holes: standardHoles,
  },
};

export const SinglePlayer: Story = {
  args: {
    scorecards: [createScorecardWithPlayer('Solo Golfer', 18, 38)],
    holes: standardHoles,
  },
};

// ===========================================================================
// PLAYER COUNT VARIATIONS
// ===========================================================================

export const TwoPlayers: Story = {
  args: {
    scorecards: [
      createScorecardWithPlayer('Player One', 10, 40),
      createScorecardWithPlayer('Player Two', 14, 38),
    ],
    holes: standardHoles,
  },
};

export const FourPlayers: Story = {
  args: {
    scorecards: [
      createScorecardWithPlayer('Alice Johnson', 8, 42),
      createScorecardWithPlayer('Bob Smith', 12, 38),
      createScorecardWithPlayer('Carol Williams', 16, 35),
      createScorecardWithPlayer('David Brown', 22, 30),
    ],
    holes: standardHoles,
  },
};

export const EightPlayers: Story = {
  args: {
    scorecards: [
      createScorecardWithPlayer('Player 1', 5, 44),
      createScorecardWithPlayer('Player 2', 8, 42),
      createScorecardWithPlayer('Player 3', 12, 39),
      createScorecardWithPlayer('Player 4', 15, 36),
      createScorecardWithPlayer('Player 5', 18, 34),
      createScorecardWithPlayer('Player 6', 22, 31),
      createScorecardWithPlayer('Player 7', 25, 28),
      createScorecardWithPlayer('Player 8', 28, 25),
    ],
    holes: standardHoles,
  },
};

export const SixteenPlayers: Story = {
  args: {
    scorecards: Array.from({ length: 16 }, (_, i) =>
      createScorecardWithPlayer(`Player ${i + 1}`, 10 + i * 2, 40 - i * 2)
    ),
    holes: standardHoles,
  },
};

// ===========================================================================
// SCORING STATES
// ===========================================================================

export const PlayersNotStarted: Story = {
  args: {
    scorecards: [
      createScorecardWithPlayer('John Smith', 15, 0, {}),
      createScorecardWithPlayer('Jane Doe', 12, 0, {}),
      createScorecardWithPlayer('Mike Wilson', 20, 0, {}),
    ],
    holes: standardHoles,
  },
};

export const PartiallyCompleted: Story = {
  args: {
    scorecards: [
      createScorecardWithPlayer(
        'Front 9 Done',
        15,
        18,
        createScoresForHoles(nineHoles, [0, 0, -1, 1, 0, 0, 1, -1, 0])
      ),
      createScorecardWithPlayer(
        '6 Holes Done',
        12,
        12,
        createScoresForHoles(standardHoles.slice(0, 6), [0, 0, 0, 0, 0, 0])
      ),
      createScorecardWithPlayer('Not Started', 20, 0, {}),
    ],
    holes: standardHoles,
  },
};

export const AllCompleted: Story = {
  args: {
    scorecards: [
      createScorecardWithPlayer(
        'Winner',
        10,
        42,
        createScoresForHoles(standardHoles, [-1, 0, 0, 0, 0, -1, 0, 0, 0, 0, -1, 0, 0, 0, 0, -1, 0, 0])
      ),
      createScorecardWithPlayer(
        'Runner Up',
        15,
        38,
        createScoresForHoles(standardHoles, [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0])
      ),
      createScorecardWithPlayer(
        'Third Place',
        18,
        35,
        createScoresForHoles(standardHoles, [0, 1, 0, 0, 1, 0, 0, 0, 0, 0, 1, 0, 0, 0, 0, 0, 0, 0])
      ),
    ],
    holes: standardHoles,
  },
};

// ===========================================================================
// SCORE BREAKDOWN VARIATIONS
// ===========================================================================

export const WithEagles: Story = {
  args: {
    scorecards: [
      createScorecardWithPlayer(
        'Eagle Master',
        5,
        48,
        {
          '1': { strokes: 2 }, // Eagle on par 4
          '3': { strokes: 3 }, // Eagle on par 5
          '2': { strokes: 2 }, // Birdie on par 3
          '4': { strokes: 4 }, // Par
          '5': { strokes: 4 }, // Par
          '6': { strokes: 3 }, // Par on par 3
        }
      ),
    ],
    holes: standardHoles,
  },
};

export const AllBirdies: Story = {
  args: {
    scorecards: [
      createScorecardWithPlayer(
        'Birdie Machine',
        0,
        54,
        createScoresForHoles(standardHoles, [-1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1])
      ),
    ],
    holes: standardHoles,
  },
};

export const AllPars: Story = {
  args: {
    scorecards: [
      createScorecardWithPlayer(
        'Steady Eddie',
        12,
        36,
        createScoresForHoles(standardHoles, [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0])
      ),
    ],
    holes: standardHoles,
  },
};

export const AllBogeys: Story = {
  args: {
    scorecards: [
      createScorecardWithPlayer(
        'Bogey Golf',
        28,
        18,
        createScoresForHoles(standardHoles, [1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1])
      ),
    ],
    holes: standardHoles,
  },
};

export const WithDoubleBogeys: Story = {
  args: {
    scorecards: [
      createScorecardWithPlayer(
        'Rough Day',
        36,
        12,
        createScoresForHoles(standardHoles, [2, 2, 1, 2, 1, 2, 1, 1, 2, 2, 1, 2, 1, 2, 1, 1, 2, 2])
      ),
    ],
    holes: standardHoles,
  },
};

export const MixedScores: Story = {
  args: {
    scorecards: [
      createScorecardWithPlayer(
        'Mixed Bag',
        15,
        34,
        {
          '1': { strokes: 2 }, // Eagle
          '2': { strokes: 2 }, // Birdie
          '3': { strokes: 5 }, // Par
          '4': { strokes: 4 }, // Par
          '5': { strokes: 5 }, // Bogey
          '6': { strokes: 4 }, // Bogey
          '7': { strokes: 5 }, // Bogey
          '8': { strokes: 7 }, // Double+
          '9': { strokes: 4 }, // Par
        }
      ),
    ],
    holes: standardHoles,
  },
};

// ===========================================================================
// HANDICAP VARIATIONS
// ===========================================================================

export const ScratchGolfer: Story = {
  args: {
    scorecards: [createScorecardWithPlayer('Scratch Player', 0, 36)],
    holes: standardHoles,
  },
};

export const PlusHandicap: Story = {
  args: {
    scorecards: [createScorecardWithPlayer('Pro Player', -3, 42)],
    holes: standardHoles,
  },
};

export const HighHandicap: Story = {
  args: {
    scorecards: [createScorecardWithPlayer('Beginner', 54, 18)],
    holes: standardHoles,
  },
};

export const MixedHandicaps: Story = {
  args: {
    scorecards: [
      createScorecardWithPlayer('Low HC', 5, 40),
      createScorecardWithPlayer('Mid HC', 18, 34),
      createScorecardWithPlayer('High HC', 36, 28),
    ],
    holes: standardHoles,
  },
};

export const NullHandicap: Story = {
  args: {
    scorecards: [
      (() => {
        const scorecard = createScorecardWithPlayer('Unknown HC', 18, 32);
        scorecard.player!.handicap = null;
        return scorecard;
      })(),
    ],
    holes: standardHoles,
  },
};

// ===========================================================================
// COURSE VARIATIONS
// ===========================================================================

export const NineHoleCourse: Story = {
  args: {
    scorecards: [
      createScorecardWithPlayer(
        'Nine Holer',
        15,
        18,
        createScoresForHoles(nineHoles, [0, 0, 0, 0, 0, 0, 0, 0, 0])
      ),
    ],
    holes: nineHoles,
  },
};

export const NullHoles: Story = {
  args: {
    scorecards: [
      createScorecardWithPlayer('Player 1', 15, 36),
      createScorecardWithPlayer('Player 2', 18, 32),
    ],
    holes: null,
  },
};

export const EmptyHoles: Story = {
  args: {
    scorecards: [createScorecardWithPlayer('Player 1', 15, 36)],
    holes: [],
  },
};

// ===========================================================================
// EDGE CASES
// ===========================================================================

export const LongPlayerName: Story = {
  args: {
    scorecards: [
      createScorecardWithPlayer(
        'Bartholomew Fitzgerald Wellington III',
        18,
        35
      ),
    ],
    holes: standardHoles,
  },
};

export const SpecialCharactersInName: Story = {
  args: {
    scorecards: [
      createScorecardWithPlayer("O'Connor-Smith", 15, 36),
      createScorecardWithPlayer('Jean-Pierre', 12, 38),
      createScorecardWithPlayer('Sr. Martinez', 20, 32),
    ],
    holes: standardHoles,
  },
};

export const NullPlayer: Story = {
  args: {
    scorecards: [
      (() => {
        const scorecard = createScorecardWithPlayer('Will Be Null', 18, 30);
        scorecard.player = null;
        return scorecard;
      })(),
    ],
    holes: standardHoles,
  },
};

export const ZeroPoints: Story = {
  args: {
    scorecards: [createScorecardWithPlayer('Zero Points', 36, 0)],
    holes: standardHoles,
  },
};

export const HighPoints: Story = {
  args: {
    scorecards: [createScorecardWithPlayer('Perfect Round', 0, 72)],
    holes: standardHoles,
  },
};

export const NullScores: Story = {
  args: {
    scorecards: [
      (() => {
        const scorecard = createScorecardWithPlayer('Null Scores', 18, 0);
        scorecard.scores = null as any;
        return scorecard;
      })(),
    ],
    holes: standardHoles,
  },
};

// ===========================================================================
// PROGRESS STATES
// ===========================================================================

export const OneHoleCompleted: Story = {
  args: {
    scorecards: [
      createScorecardWithPlayer('Just Started', 15, 2, { '1': { strokes: 4 } }),
    ],
    holes: standardHoles,
  },
};

export const HalfwayThrough: Story = {
  args: {
    scorecards: [
      createScorecardWithPlayer(
        'Halfway',
        15,
        18,
        createScoresForHoles(standardHoles.slice(0, 9), [0, 0, 0, 0, 0, 0, 0, 0, 0])
      ),
    ],
    holes: standardHoles,
  },
};

export const AlmostDone: Story = {
  args: {
    scorecards: [
      createScorecardWithPlayer(
        'Almost There',
        15,
        34,
        createScoresForHoles(standardHoles.slice(0, 17), [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0])
      ),
    ],
    holes: standardHoles,
  },
};

// ===========================================================================
// COMPETITIVE SCENARIOS
// ===========================================================================

export const CloseCompetition: Story = {
  args: {
    scorecards: [
      createScorecardWithPlayer(
        'Leader',
        12,
        38,
        createScoresForHoles(standardHoles, [0, -1, 0, 0, 0, 0, -1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0])
      ),
      createScorecardWithPlayer(
        'Second',
        14,
        37,
        createScoresForHoles(standardHoles, [-1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, -1, 0, 0, 0, 1, 0, 0])
      ),
      createScorecardWithPlayer(
        'Third',
        10,
        36,
        createScoresForHoles(standardHoles, [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0])
      ),
    ],
    holes: standardHoles,
  },
};

export const WideSpread: Story = {
  args: {
    scorecards: [
      createScorecardWithPlayer('Dominant', 5, 48),
      createScorecardWithPlayer('Average', 18, 32),
      createScorecardWithPlayer('Struggling', 36, 16),
    ],
    holes: standardHoles,
  },
};

// ===========================================================================
// LIVE ROUND SIMULATION
// ===========================================================================

export const LiveRoundInProgress: Story = {
  args: {
    scorecards: [
      createScorecardWithPlayer(
        'Leading',
        12,
        24,
        createScoresForHoles(standardHoles.slice(0, 12), [-1, 0, 0, -1, 0, 0, 0, 0, -1, 0, 0, 0])
      ),
      createScorecardWithPlayer(
        'Second',
        15,
        22,
        createScoresForHoles(standardHoles.slice(0, 11), [0, 0, 0, 0, -1, 0, 0, 0, 0, 0, -1])
      ),
      createScorecardWithPlayer(
        'Third',
        18,
        20,
        createScoresForHoles(standardHoles.slice(0, 10), [0, 0, 0, 0, 0, 0, 0, 0, 0, 0])
      ),
      createScorecardWithPlayer(
        'Fourth',
        22,
        16,
        createScoresForHoles(standardHoles.slice(0, 9), [0, 1, 0, 0, 1, 0, 0, 0, 0])
      ),
    ],
    holes: standardHoles,
  },
};
