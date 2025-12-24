/**
 * QuickScorecardView Component Stories
 *
 * Storybook stories for the horizontal scrolling scorecard quick view.
 * Shows all 18 holes with status indicators and navigation.
 */

import React, { useState } from 'react';
import type { Meta, StoryObj } from '@storybook/react';
import { View, StyleSheet } from 'react-native';
import { Text } from 'react-native-paper';
import { QuickScorecardView } from './QuickScorecardView';
import type { Hole, HoleScore, Player } from '@/types';

// =====================================================
// META
// =====================================================

const meta: Meta<typeof QuickScorecardView> = {
  title: 'Scorecard/QuickScorecardView',
  component: QuickScorecardView,
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
type Story = StoryObj<typeof QuickScorecardView>;

// =====================================================
// STYLES
// =====================================================

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
    padding: 16,
    justifyContent: 'center',
  },
  infoCard: {
    backgroundColor: '#fff',
    padding: 16,
    borderRadius: 8,
    marginTop: 16,
  },
  infoText: {
    fontSize: 14,
    color: '#666',
    marginBottom: 4,
  },
});

// =====================================================
// HELPERS
// =====================================================

const createHole = (number: number, par: 3 | 4 | 5 = 4): Hole => ({
  number: number as Hole['number'],
  par,
  strokeIndex: number,
});

const createHoles = (): Hole[] => [
  createHole(1, 4),
  createHole(2, 5),
  createHole(3, 3),
  createHole(4, 4),
  createHole(5, 5),
  createHole(6, 4),
  createHole(7, 3),
  createHole(8, 4),
  createHole(9, 5),
  createHole(10, 4),
  createHole(11, 3),
  createHole(12, 4),
  createHole(13, 5),
  createHole(14, 4),
  createHole(15, 3),
  createHole(16, 4),
  createHole(17, 5),
  createHole(18, 4),
];

const createPlayer = (id: string, name: string): Player => ({
  id,
  name,
  email: `${name.toLowerCase().replace(' ', '')}@example.com`,
  handicap: 10,
  created_at: '2024-01-01',
  updated_at: '2024-01-01',
});

// =====================================================
// INTERACTIVE WRAPPER
// =====================================================

interface InteractiveWrapperProps {
  initialHole?: number;
  players: Player[];
  scores: Record<string, Record<number, HoleScore>>;
  completedHoles?: number[];
}

function InteractiveWrapper({
  initialHole = 1,
  players,
  scores,
  completedHoles = [],
}: InteractiveWrapperProps) {
  const [currentHole, setCurrentHole] = useState(initialHole);

  const getPlayerHoleScore = (playerId: string, holeNumber: number): HoleScore | undefined => {
    return scores[playerId]?.[holeNumber];
  };

  const isHoleComplete = (holeNumber: number): boolean => {
    return completedHoles.includes(holeNumber);
  };

  return (
    <>
      <QuickScorecardView
        holes={createHoles()}
        currentHole={currentHole}
        players={players}
        getPlayerHoleScore={getPlayerHoleScore}
        isHoleComplete={isHoleComplete}
        onHolePress={setCurrentHole}
      />
      <View style={styles.infoCard}>
        <Text style={styles.infoText}>Current Hole: {currentHole}</Text>
        <Text style={styles.infoText}>Players: {players.length}</Text>
        <Text style={styles.infoText}>Completed Holes: {completedHoles.join(', ') || 'None'}</Text>
      </View>
    </>
  );
}

// =====================================================
// STORIES - BASIC
// =====================================================

/**
 * Default view with single player, no scores.
 */
export const Default: Story = {
  render: () => (
    <InteractiveWrapper
      players={[createPlayer('1', 'Player 1')]}
      scores={{}}
      completedHoles={[]}
    />
  ),
};

/**
 * Starting at hole 1.
 */
export const HoleOne: Story = {
  render: () => (
    <InteractiveWrapper
      initialHole={1}
      players={[createPlayer('1', 'Player 1')]}
      scores={{}}
    />
  ),
};

/**
 * In the middle of the round (hole 9).
 */
export const MiddleOfRound: Story = {
  render: () => (
    <InteractiveWrapper
      initialHole={9}
      players={[createPlayer('1', 'Player 1')]}
      scores={{
        '1': {
          1: { strokes: 4 },
          2: { strokes: 5 },
          3: { strokes: 3 },
          4: { strokes: 5 },
          5: { strokes: 6 },
          6: { strokes: 4 },
          7: { strokes: 3 },
          8: { strokes: 4 },
        },
      }}
      completedHoles={[1, 2, 3, 4, 5, 6, 7, 8]}
    />
  ),
};

/**
 * On the back nine (hole 14).
 */
export const BackNine: Story = {
  render: () => (
    <InteractiveWrapper
      initialHole={14}
      players={[createPlayer('1', 'Player 1')]}
      scores={{
        '1': Object.fromEntries(
          Array.from({ length: 13 }, (_, i) => [i + 1, { strokes: 4 }])
        ),
      }}
      completedHoles={Array.from({ length: 13 }, (_, i) => i + 1)}
    />
  ),
};

/**
 * On the last hole.
 */
export const LastHole: Story = {
  render: () => (
    <InteractiveWrapper
      initialHole={18}
      players={[createPlayer('1', 'Player 1')]}
      scores={{
        '1': Object.fromEntries(
          Array.from({ length: 17 }, (_, i) => [i + 1, { strokes: 4 }])
        ),
      }}
      completedHoles={Array.from({ length: 17 }, (_, i) => i + 1)}
    />
  ),
};

// =====================================================
// STORIES - MULTI-PLAYER
// =====================================================

/**
 * Two players in the round.
 */
export const TwoPlayers: Story = {
  render: () => (
    <InteractiveWrapper
      initialHole={5}
      players={[createPlayer('1', 'Player 1'), createPlayer('2', 'Player 2')]}
      scores={{
        '1': {
          1: { strokes: 4 },
          2: { strokes: 5 },
          3: { strokes: 3 },
          4: { strokes: 5 },
        },
        '2': {
          1: { strokes: 5 },
          2: { strokes: 4 },
          3: { strokes: 4 },
          4: { strokes: 4 },
        },
      }}
      completedHoles={[1, 2, 3, 4]}
    />
  ),
};

/**
 * Four players in the round.
 */
export const FourPlayers: Story = {
  render: () => (
    <InteractiveWrapper
      initialHole={3}
      players={[
        createPlayer('1', 'Player 1'),
        createPlayer('2', 'Player 2'),
        createPlayer('3', 'Player 3'),
        createPlayer('4', 'Player 4'),
      ]}
      scores={{
        '1': { 1: { strokes: 4 }, 2: { strokes: 5 } },
        '2': { 1: { strokes: 5 }, 2: { strokes: 4 } },
        '3': { 1: { strokes: 3 }, 2: { strokes: 6 } },
        '4': { 1: { strokes: 4 }, 2: { strokes: 4 } },
      }}
      completedHoles={[1, 2]}
    />
  ),
};

/**
 * Partial scoring - some players haven't finished current hole.
 */
export const PartialScoring: Story = {
  render: () => (
    <InteractiveWrapper
      initialHole={3}
      players={[
        createPlayer('1', 'Player 1'),
        createPlayer('2', 'Player 2'),
        createPlayer('3', 'Player 3'),
        createPlayer('4', 'Player 4'),
      ]}
      scores={{
        '1': { 1: { strokes: 4 }, 2: { strokes: 5 }, 3: { strokes: 4 } },
        '2': { 1: { strokes: 5 }, 2: { strokes: 4 }, 3: { strokes: 3 } },
        '3': { 1: { strokes: 3 }, 2: { strokes: 6 } }, // Player 3 hasn't scored hole 3
        '4': { 1: { strokes: 4 }, 2: { strokes: 4 } }, // Player 4 hasn't scored hole 3
      }}
      completedHoles={[1, 2]}
    />
  ),
};

// =====================================================
// STORIES - SCORE TYPES
// =====================================================

/**
 * Various score types showing color coding.
 */
export const ScoreColors: Story = {
  render: () => (
    <InteractiveWrapper
      initialHole={10}
      players={[createPlayer('1', 'Player 1')]}
      scores={{
        '1': {
          1: { strokes: 2 }, // Eagle (par 4, -2)
          2: { strokes: 4 }, // Birdie (par 5, -1)
          3: { strokes: 3 }, // Par (par 3, 0)
          4: { strokes: 5 }, // Bogey (par 4, +1)
          5: { strokes: 7 }, // Double Bogey+ (par 5, +2)
          6: { strokes: 6 }, // Double Bogey (par 4, +2)
          7: { strokes: 5 }, // Double Bogey (par 3, +2)
          8: { strokes: 3 }, // Birdie (par 4, -1)
          9: { strokes: 5 }, // Par (par 5, 0)
        },
      }}
      completedHoles={[1, 2, 3, 4, 5, 6, 7, 8, 9]}
    />
  ),
};

/**
 * Pickup scores (marked as 'P').
 */
export const PickupScores: Story = {
  render: () => (
    <InteractiveWrapper
      initialHole={5}
      players={[createPlayer('1', 'Player 1')]}
      scores={{
        '1': {
          1: { strokes: 4 },
          2: { strokes: 10 }, // Pickup
          3: { strokes: 3 },
          4: { strokes: 10 }, // Pickup
        },
      }}
      completedHoles={[1, 2, 3, 4]}
    />
  ),
};

/**
 * All birdies (great round!).
 */
export const AllBirdies: Story = {
  render: () => (
    <InteractiveWrapper
      initialHole={18}
      players={[createPlayer('1', 'Player 1')]}
      scores={{
        '1': {
          1: { strokes: 3 }, // Birdie on par 4
          2: { strokes: 4 }, // Birdie on par 5
          3: { strokes: 2 }, // Birdie on par 3
          4: { strokes: 3 }, // Birdie on par 4
          5: { strokes: 4 }, // Birdie on par 5
          6: { strokes: 3 }, // Birdie on par 4
          7: { strokes: 2 }, // Birdie on par 3
          8: { strokes: 3 }, // Birdie on par 4
          9: { strokes: 4 }, // Birdie on par 5
          10: { strokes: 3 }, // Birdie on par 4
          11: { strokes: 2 }, // Birdie on par 3
          12: { strokes: 3 }, // Birdie on par 4
          13: { strokes: 4 }, // Birdie on par 5
          14: { strokes: 3 }, // Birdie on par 4
          15: { strokes: 2 }, // Birdie on par 3
          16: { strokes: 3 }, // Birdie on par 4
          17: { strokes: 4 }, // Birdie on par 5
        },
      }}
      completedHoles={Array.from({ length: 17 }, (_, i) => i + 1)}
    />
  ),
};

// =====================================================
// STORIES - PROGRESS STATES
// =====================================================

/**
 * No holes completed yet.
 */
export const NoProgress: Story = {
  render: () => (
    <InteractiveWrapper
      initialHole={1}
      players={[createPlayer('1', 'Player 1')]}
      scores={{}}
      completedHoles={[]}
    />
  ),
};

/**
 * Front nine completed.
 */
export const FrontNineComplete: Story = {
  render: () => (
    <InteractiveWrapper
      initialHole={10}
      players={[createPlayer('1', 'Player 1')]}
      scores={{
        '1': Object.fromEntries(
          Array.from({ length: 9 }, (_, i) => [i + 1, { strokes: 4 }])
        ),
      }}
      completedHoles={[1, 2, 3, 4, 5, 6, 7, 8, 9]}
    />
  ),
};

/**
 * Almost finished (17 holes complete).
 */
export const AlmostFinished: Story = {
  render: () => (
    <InteractiveWrapper
      initialHole={18}
      players={[createPlayer('1', 'Player 1')]}
      scores={{
        '1': Object.fromEntries(
          Array.from({ length: 17 }, (_, i) => [i + 1, { strokes: 4 }])
        ),
      }}
      completedHoles={Array.from({ length: 17 }, (_, i) => i + 1)}
    />
  ),
};

/**
 * All 18 holes completed.
 */
export const AllComplete: Story = {
  render: () => (
    <InteractiveWrapper
      initialHole={18}
      players={[createPlayer('1', 'Player 1')]}
      scores={{
        '1': Object.fromEntries(
          Array.from({ length: 18 }, (_, i) => [i + 1, { strokes: 4 }])
        ),
      }}
      completedHoles={Array.from({ length: 18 }, (_, i) => i + 1)}
    />
  ),
};

// =====================================================
// STORIES - EDGE CASES
// =====================================================

/**
 * Empty holes array.
 */
export const EmptyHoles: Story = {
  render: () => {
    const getPlayerHoleScore = (): HoleScore | undefined => undefined;
    const isHoleComplete = (): boolean => false;

    return (
      <QuickScorecardView
        holes={[]}
        currentHole={1}
        players={[createPlayer('1', 'Player 1')]}
        getPlayerHoleScore={getPlayerHoleScore}
        isHoleComplete={isHoleComplete}
        onHolePress={() => {}}
      />
    );
  },
};

/**
 * No players.
 */
export const NoPlayers: Story = {
  render: () => (
    <InteractiveWrapper
      initialHole={1}
      players={[]}
      scores={{}}
      completedHoles={[]}
    />
  ),
};

/**
 * Many players (6 players).
 */
export const ManyPlayers: Story = {
  render: () => (
    <InteractiveWrapper
      initialHole={3}
      players={[
        createPlayer('1', 'Player 1'),
        createPlayer('2', 'Player 2'),
        createPlayer('3', 'Player 3'),
        createPlayer('4', 'Player 4'),
        createPlayer('5', 'Player 5'),
        createPlayer('6', 'Player 6'),
      ]}
      scores={{
        '1': { 1: { strokes: 4 }, 2: { strokes: 5 } },
        '2': { 1: { strokes: 5 }, 2: { strokes: 4 } },
        '3': { 1: { strokes: 3 } },
        '4': { 1: { strokes: 4 } },
        '5': { 1: { strokes: 5 } },
        '6': { 1: { strokes: 4 } },
      }}
      completedHoles={[1]}
    />
  ),
};

/**
 * High scores throughout.
 */
export const HighScores: Story = {
  render: () => (
    <InteractiveWrapper
      initialHole={10}
      players={[createPlayer('1', 'Player 1')]}
      scores={{
        '1': {
          1: { strokes: 8 },
          2: { strokes: 9 },
          3: { strokes: 7 },
          4: { strokes: 8 },
          5: { strokes: 10 }, // Pickup
          6: { strokes: 9 },
          7: { strokes: 6 },
          8: { strokes: 8 },
          9: { strokes: 10 }, // Pickup
        },
      }}
      completedHoles={[1, 2, 3, 4, 5, 6, 7, 8, 9]}
    />
  ),
};

// =====================================================
// STORIES - INTERACTIVE
// =====================================================

/**
 * Full interactive demo - tap holes to navigate.
 */
export const Interactive: Story = {
  render: () => (
    <InteractiveWrapper
      initialHole={5}
      players={[
        createPlayer('1', 'Alice'),
        createPlayer('2', 'Bob'),
        createPlayer('3', 'Charlie'),
      ]}
      scores={{
        '1': {
          1: { strokes: 4 },
          2: { strokes: 5 },
          3: { strokes: 3 },
          4: { strokes: 5 },
        },
        '2': {
          1: { strokes: 5 },
          2: { strokes: 4 },
          3: { strokes: 4 },
          4: { strokes: 4 },
        },
        '3': {
          1: { strokes: 3 },
          2: { strokes: 6 },
          3: { strokes: 3 },
          4: { strokes: 5 },
        },
      }}
      completedHoles={[1, 2, 3, 4]}
    />
  ),
  parameters: {
    docs: {
      description: {
        story: 'Fully interactive demo. Tap any hole button to navigate to that hole.',
      },
    },
  },
};
