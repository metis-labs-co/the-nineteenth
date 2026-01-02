/**
 * SwipeableHoleNavigator Storybook Stories
 *
 * Stories demonstrating the swipeable hole navigation component.
 * Shows different hole positions, player counts, and enabled states.
 */

import React, { useState } from 'react';
import { View, StyleSheet, Dimensions } from 'react-native';
import { Text, Button, Surface } from 'react-native-paper';
import type { Meta, StoryObj } from '@storybook/react';
import { SwipeableHoleNavigator } from './SwipeableHoleNavigator';
import { spacing, borderRadius } from '@/constants/theme';

// ===========================================================================
// META
// ===========================================================================

const meta: Meta<typeof SwipeableHoleNavigator> = {
  title: 'Scorecard/SwipeableHoleNavigator',
  component: SwipeableHoleNavigator,
  parameters: {
    layout: 'fullscreen',
  },
  argTypes: {
    currentHole: {
      control: { type: 'number', min: 1, max: 18, step: 1 },
      description: 'Current hole number (1-18)',
    },
    totalHoles: {
      control: { type: 'number', min: 1, max: 27, step: 1 },
      description: 'Total number of holes',
    },
    enabled: {
      control: { type: 'boolean' },
      description: 'Whether swipe gestures are enabled',
    },
    playerCount: {
      control: { type: 'number', min: 1, max: 4, step: 1 },
      description: 'Number of players for skeleton preview',
    },
  },
};

export default meta;
type Story = StoryObj<typeof SwipeableHoleNavigator>;

// ===========================================================================
// FIXTURES
// ===========================================================================

const _screenWidth = Dimensions.get('window').width;

interface MockHoleData {
  number: number;
  par: 3 | 4 | 5;
  yardage: number;
  strokeIndex: number;
}

const mockHoles: MockHoleData[] = [
  { number: 1, par: 4, yardage: 410, strokeIndex: 7 },
  { number: 2, par: 3, yardage: 185, strokeIndex: 15 },
  { number: 3, par: 5, yardage: 520, strokeIndex: 1 },
  { number: 4, par: 4, yardage: 385, strokeIndex: 11 },
  { number: 5, par: 4, yardage: 420, strokeIndex: 5 },
  { number: 6, par: 3, yardage: 165, strokeIndex: 17 },
  { number: 7, par: 4, yardage: 390, strokeIndex: 3 },
  { number: 8, par: 5, yardage: 545, strokeIndex: 9 },
  { number: 9, par: 4, yardage: 430, strokeIndex: 13 },
  { number: 10, par: 4, yardage: 405, strokeIndex: 8 },
  { number: 11, par: 3, yardage: 175, strokeIndex: 16 },
  { number: 12, par: 5, yardage: 535, strokeIndex: 2 },
  { number: 13, par: 4, yardage: 380, strokeIndex: 12 },
  { number: 14, par: 4, yardage: 415, strokeIndex: 6 },
  { number: 15, par: 3, yardage: 190, strokeIndex: 18 },
  { number: 16, par: 4, yardage: 400, strokeIndex: 4 },
  { number: 17, par: 5, yardage: 550, strokeIndex: 10 },
  { number: 18, par: 4, yardage: 445, strokeIndex: 14 },
];

// ===========================================================================
// MOCK COMPONENTS
// ===========================================================================

interface MockHoleContentProps {
  hole: MockHoleData;
  playerCount?: number;
}

function MockHoleContent({ hole, playerCount = 1 }: MockHoleContentProps) {
  return (
    <View style={styles.holeContent}>
      {/* Hole Header */}
      <Surface style={styles.holeHeader}>
        <View style={styles.holeHeaderLeft}>
          <Text style={styles.holeLabel}>HOLE</Text>
          <Text style={styles.holeNumber}>{hole.number}</Text>
        </View>
        <View style={styles.holeHeaderRight}>
          <View style={styles.parBadge}>
            <Text style={styles.parText}>{hole.par}</Text>
          </View>
          <View style={styles.detailItem}>
            <Text style={styles.detailLabel}>SI</Text>
            <Text style={styles.detailValue}>{hole.strokeIndex}</Text>
          </View>
          <View style={styles.detailItem}>
            <Text style={styles.detailLabel}>YDS</Text>
            <Text style={styles.detailValue}>{hole.yardage}</Text>
          </View>
        </View>
      </Surface>

      {/* Player Cards */}
      <View style={styles.playerCards}>
        {Array.from({ length: playerCount }, (_, i) => (
          <MockPlayerCard key={i} playerIndex={i + 1} hole={hole} />
        ))}
      </View>

      {/* Swipe Hint */}
      <View style={styles.swipeHint}>
        <Text style={styles.swipeHintText}>
          Swipe left/right to navigate between holes
        </Text>
      </View>
    </View>
  );
}

interface MockPlayerCardProps {
  playerIndex: number;
  hole: MockHoleData;
}

function MockPlayerCard({ playerIndex, hole }: MockPlayerCardProps) {
  const names = ['John Smith', 'Jane Doe', 'Bob Wilson', 'Alice Brown'];
  const handicaps = [15, 20, 8, 25];
  const name = names[(playerIndex - 1) % names.length];
  const handicap = handicaps[(playerIndex - 1) % handicaps.length];

  return (
    <Surface style={styles.playerCard}>
      <View style={styles.playerHeader}>
        <View>
          <Text style={styles.playerName}>{name}</Text>
          <Text style={styles.playerHandicap}>HC: {handicap}</Text>
        </View>
        <View style={styles.playerStats}>
          <View style={styles.statBox}>
            <Text style={styles.statLabel}>GROSS</Text>
            <Text style={styles.statValue}>{hole.par}</Text>
          </View>
          <View style={styles.statBox}>
            <Text style={styles.statLabel}>NET</Text>
            <Text style={styles.statValue}>{hole.par - 1}</Text>
          </View>
        </View>
      </View>
      <View style={styles.playerDivider} />
      <View style={styles.playerControls}>
        <View style={styles.controlButton}>
          <Text style={styles.controlText}>-</Text>
        </View>
        <View style={styles.scoreDisplay}>
          <Text style={styles.scoreValue}>{hole.par}</Text>
        </View>
        <View style={styles.controlButton}>
          <Text style={styles.controlText}>+</Text>
        </View>
      </View>
    </Surface>
  );
}

// ===========================================================================
// WRAPPER COMPONENTS
// ===========================================================================

interface InteractiveWrapperProps {
  initialHole?: number;
  totalHoles?: number;
  enabled?: boolean;
  playerCount?: number;
}

function InteractiveWrapper({
  initialHole = 1,
  totalHoles = 18,
  enabled = true,
  playerCount = 1,
}: InteractiveWrapperProps) {
  const [currentHole, setCurrentHole] = useState(initialHole);

  const handleHoleChange = (newHole: number) => {
    setCurrentHole(newHole);
  };

  const hole = mockHoles[(currentHole - 1) % mockHoles.length];

  return (
    <View style={styles.container}>
      <View style={styles.statusBar}>
        <Text style={styles.statusText}>
          Current Hole: {currentHole} / {totalHoles}
        </Text>
        <Text style={styles.statusText}>
          Swipe: {enabled ? 'Enabled' : 'Disabled'}
        </Text>
      </View>

      <SwipeableHoleNavigator
        currentHole={currentHole}
        totalHoles={totalHoles}
        onHoleChange={handleHoleChange}
        enabled={enabled}
        playerCount={playerCount}
      >
        <MockHoleContent hole={hole} playerCount={playerCount} />
      </SwipeableHoleNavigator>

      <View style={styles.buttonBar}>
        <Button
          mode="outlined"
          onPress={() => setCurrentHole(Math.max(1, currentHole - 1))}
          disabled={currentHole === 1}
        >
          Prev
        </Button>
        <Button
          mode="outlined"
          onPress={() => setCurrentHole(Math.min(totalHoles, currentHole + 1))}
          disabled={currentHole === totalHoles}
        >
          Next
        </Button>
      </View>
    </View>
  );
}

// ===========================================================================
// STYLES
// ===========================================================================

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F5F5',
  },
  statusBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    padding: spacing.md,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E0E0E0',
  },
  statusText: {
    fontSize: 14,
    color: '#666666',
  },
  buttonBar: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    padding: spacing.md,
    backgroundColor: '#FFFFFF',
    borderTopWidth: 1,
    borderTopColor: '#E0E0E0',
  },
  holeContent: {
    flex: 1,
    backgroundColor: '#F5F5F5',
  },
  holeHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: spacing.lg,
    backgroundColor: '#FFFFFF',
    elevation: 2,
  },
  holeHeaderLeft: {
    alignItems: 'center',
  },
  holeLabel: {
    fontSize: 10,
    fontWeight: '600',
    color: '#888888',
    letterSpacing: 1,
  },
  holeNumber: {
    fontSize: 36,
    fontWeight: '700',
    color: '#333333',
  },
  holeHeaderRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.lg,
  },
  parBadge: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#4CAF50',
    justifyContent: 'center',
    alignItems: 'center',
  },
  parText: {
    fontSize: 18,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  detailItem: {
    alignItems: 'center',
  },
  detailLabel: {
    fontSize: 10,
    color: '#888888',
    letterSpacing: 0.5,
  },
  detailValue: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333333',
  },
  playerCards: {
    padding: spacing.lg,
  },
  playerCard: {
    borderRadius: borderRadius.lg,
    padding: spacing.lg,
    marginBottom: spacing.md,
    backgroundColor: '#FFFFFF',
    elevation: 2,
  },
  playerHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  playerName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333333',
  },
  playerHandicap: {
    fontSize: 12,
    color: '#888888',
    marginTop: 2,
  },
  playerStats: {
    flexDirection: 'row',
    gap: spacing.md,
  },
  statBox: {
    alignItems: 'center',
    backgroundColor: '#F5F5F5',
    padding: spacing.sm,
    borderRadius: borderRadius.sm,
    minWidth: 48,
  },
  statLabel: {
    fontSize: 8,
    color: '#888888',
    letterSpacing: 0.5,
  },
  statValue: {
    fontSize: 18,
    fontWeight: '700',
    color: '#333333',
  },
  playerDivider: {
    height: 1,
    backgroundColor: '#E0E0E0',
    marginVertical: spacing.md,
  },
  playerControls: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.lg,
  },
  controlButton: {
    width: 56,
    height: 56,
    borderRadius: borderRadius.md,
    backgroundColor: '#F5F5F5',
    justifyContent: 'center',
    alignItems: 'center',
  },
  controlText: {
    fontSize: 28,
    fontWeight: '600',
    color: '#666666',
  },
  scoreDisplay: {
    width: 64,
    height: 56,
    borderRadius: borderRadius.md,
    backgroundColor: '#E8F5E9',
    justifyContent: 'center',
    alignItems: 'center',
  },
  scoreValue: {
    fontSize: 28,
    fontWeight: '700',
    color: '#4CAF50',
  },
  swipeHint: {
    padding: spacing.md,
    alignItems: 'center',
  },
  swipeHintText: {
    fontSize: 12,
    color: '#888888',
    fontStyle: 'italic',
  },
});

// ===========================================================================
// STORIES
// ===========================================================================

/**
 * Default state - first hole with one player
 */
export const Default: Story = {
  render: () => <InteractiveWrapper />,
};

/**
 * First hole - swipe right is disabled (rubber band effect)
 */
export const FirstHole: Story = {
  render: () => <InteractiveWrapper initialHole={1} />,
};

/**
 * Middle hole - can swipe in both directions
 */
export const MiddleHole: Story = {
  render: () => <InteractiveWrapper initialHole={9} />,
};

/**
 * Last hole - swipe left is disabled (rubber band effect)
 */
export const LastHole: Story = {
  render: () => <InteractiveWrapper initialHole={18} />,
};

/**
 * With two players
 */
export const TwoPlayers: Story = {
  render: () => <InteractiveWrapper playerCount={2} />,
};

/**
 * With three players
 */
export const ThreePlayers: Story = {
  render: () => <InteractiveWrapper playerCount={3} />,
};

/**
 * With four players (maximum typical group)
 */
export const FourPlayers: Story = {
  render: () => <InteractiveWrapper playerCount={4} />,
};

/**
 * 9-hole course
 */
export const NineHoleCourse: Story = {
  render: () => <InteractiveWrapper totalHoles={9} initialHole={5} />,
};

/**
 * Swipe disabled - buttons only navigation
 */
export const SwipeDisabled: Story = {
  render: () => <InteractiveWrapper enabled={false} />,
};

/**
 * Near the turn (hole 9 of 18)
 */
export const AtTheTurn: Story = {
  render: () => <InteractiveWrapper initialHole={9} />,
};

/**
 * Back nine start (hole 10)
 */
export const BackNineStart: Story = {
  render: () => <InteractiveWrapper initialHole={10} />,
};

/**
 * Single player with detailed card
 */
export const SinglePlayer: Story = {
  render: () => <InteractiveWrapper playerCount={1} initialHole={5} />,
};

/**
 * Full foursome at challenging hole
 */
export const FoursomeAtHole3: Story = {
  render: () => (
    <InteractiveWrapper
      playerCount={4}
      initialHole={3}
    />
  ),
};

/**
 * 27-hole course (three nines)
 */
export const ThreeNinesCourse: Story = {
  render: () => <InteractiveWrapper totalHoles={27} initialHole={15} />,
};

/**
 * Starting position with full group
 */
export const StartingPosition: Story = {
  render: () => <InteractiveWrapper initialHole={1} playerCount={4} />,
};

/**
 * Finishing hole with full group
 */
export const FinishingHole: Story = {
  render: () => <InteractiveWrapper initialHole={18} playerCount={4} />,
};

/**
 * Dark mode appearance
 */
export const DarkMode: Story = {
  render: () => (
    <View style={[styles.container, { backgroundColor: '#121212' }]}>
      <InteractiveWrapper playerCount={2} initialHole={7} />
    </View>
  ),
};
