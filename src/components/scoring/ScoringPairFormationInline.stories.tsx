/**
 * ScoringPairFormationInline Storybook Stories
 *
 * Stories demonstrating the compact inline scoring pair formation component.
 * Shows different player counts, pairing types, and states.
 */

import React, { useState, useCallback } from 'react';
import { View, StyleSheet, ScrollView, Alert } from 'react-native';
import { Text } from 'react-native-paper';
import type { Meta, StoryObj } from '@storybook/react';
import {
  ScoringPairFormationInline,
  InlinePlayer,
} from './ScoringPairFormationInline';
import { spacing, typography, borderRadius } from '@/constants/theme';
import type { ScoringPairCreateInput } from '@/types';
import { autoGenerateScoringPairs } from '@/utils/scoringPairs';

// ===========================================================================
// META
// ===========================================================================

const meta: Meta<typeof ScoringPairFormationInline> = {
  title: 'Scoring/ScoringPairFormationInline',
  component: ScoringPairFormationInline,
  parameters: {
    layout: 'fullscreen',
  },
};

export default meta;
type Story = StoryObj<typeof ScoringPairFormationInline>;

// ===========================================================================
// FIXTURES
// ===========================================================================

function createInlinePlayer(
  id: string,
  name: string,
  handicap: number = 15,
  photoUrl: string | null = null
): InlinePlayer {
  return {
    id,
    name,
    handicap,
    photo_url: photoUrl,
  };
}

const twoPlayers: InlinePlayer[] = [
  createInlinePlayer('player-1', 'John Smith', 15),
  createInlinePlayer('player-2', 'Jane Doe', 20),
];

const threePlayers: InlinePlayer[] = [
  createInlinePlayer('player-1', 'John Smith', 15),
  createInlinePlayer('player-2', 'Jane Doe', 20),
  createInlinePlayer('player-3', 'Bob Wilson', 10),
];

const fourPlayers: InlinePlayer[] = [
  createInlinePlayer('player-1', 'John Smith', 15),
  createInlinePlayer('player-2', 'Jane Doe', 20),
  createInlinePlayer('player-3', 'Bob Wilson', 10),
  createInlinePlayer('player-4', 'Alice Brown', 25),
];

const fivePlayers: InlinePlayer[] = [
  createInlinePlayer('player-1', 'John Smith', 15),
  createInlinePlayer('player-2', 'Jane Doe', 20),
  createInlinePlayer('player-3', 'Bob Wilson', 10),
  createInlinePlayer('player-4', 'Alice Brown', 25),
  createInlinePlayer('player-5', 'Charlie Davis', 18),
];

const sixPlayers: InlinePlayer[] = [
  createInlinePlayer('player-1', 'John Smith', 15),
  createInlinePlayer('player-2', 'Jane Doe', 20),
  createInlinePlayer('player-3', 'Bob Wilson', 10),
  createInlinePlayer('player-4', 'Alice Brown', 25),
  createInlinePlayer('player-5', 'Charlie Davis', 18),
  createInlinePlayer('player-6', 'Diana Evans', 22),
];

const playersWithPhotos: InlinePlayer[] = [
  createInlinePlayer('player-1', 'John Smith', 15, 'https://i.pravatar.cc/150?u=john'),
  createInlinePlayer('player-2', 'Jane Doe', 20, 'https://i.pravatar.cc/150?u=jane'),
  createInlinePlayer('player-3', 'Bob Wilson', 10, 'https://i.pravatar.cc/150?u=bob'),
  createInlinePlayer('player-4', 'Alice Brown', 25, 'https://i.pravatar.cc/150?u=alice'),
];

const singlePlayer: InlinePlayer[] = [
  createInlinePlayer('player-1', 'Solo Player', 15),
];

// Helper to create pairs
function createPairs(players: InlinePlayer[], type: 'reciprocal' | 'circular'): ScoringPairCreateInput[] {
  const pairs: ScoringPairCreateInput[] = [];

  if (type === 'reciprocal') {
    for (let i = 0; i < players.length; i += 2) {
      if (i + 1 < players.length) {
        pairs.push({ scorerId: players[i].id, playerId: players[i + 1].id });
        pairs.push({ scorerId: players[i + 1].id, playerId: players[i].id });
      }
    }
  } else {
    for (let i = 0; i < players.length; i++) {
      const nextIndex = (i + 1) % players.length;
      pairs.push({ scorerId: players[i].id, playerId: players[nextIndex].id });
    }
  }

  return pairs;
}

// ===========================================================================
// WRAPPER COMPONENTS
// ===========================================================================

const StoryWrapper = ({ children, title }: { children: React.ReactNode; title?: string }) => (
  <ScrollView style={styles.wrapper} contentContainerStyle={styles.scrollContent}>
    {title && (
      <View style={styles.titleContainer}>
        <Text style={styles.title}>{title}</Text>
      </View>
    )}
    <View style={styles.content}>
      {children}
    </View>
  </ScrollView>
);

// Interactive wrapper that manages state
const InteractiveWrapper = ({
  players,
  initialPairs = [],
  title,
}: {
  players: InlinePlayer[];
  initialPairs?: ScoringPairCreateInput[];
  title?: string;
}) => {
  const [pairs, setPairs] = useState<ScoringPairCreateInput[]>(initialPairs);
  const [pairingType, setPairingType] = useState<'reciprocal' | 'circular'>('reciprocal');

  const handlePairsChange = useCallback(
    (newPairs: ScoringPairCreateInput[], type: 'reciprocal' | 'circular') => {
      setPairs(newPairs);
      setPairingType(type);
      Alert.alert(
        'Pairs Updated',
        `${newPairs.length} pairs created (${type})`
      );
    },
    []
  );

  return (
    <StoryWrapper title={title}>
      <ScoringPairFormationInline
        players={players}
        pairs={pairs}
        onPairsChange={handlePairsChange}
        testID="scoring-pair-inline"
      />
      <View style={styles.infoCard}>
        <Text style={styles.infoText}>
          Players: {players.length} | Pairs: {pairs.length} | Type: {pairingType}
        </Text>
      </View>
    </StoryWrapper>
  );
};

// ===========================================================================
// STYLES
// ===========================================================================

const styles = StyleSheet.create({
  wrapper: {
    flex: 1,
    backgroundColor: '#F5F5F5',
  },
  scrollContent: {
    padding: spacing.lg,
  },
  content: {
    gap: spacing.md,
  },
  titleContainer: {
    marginBottom: spacing.md,
  },
  title: {
    ...typography.h3,
    color: '#333333',
  },
  infoCard: {
    padding: spacing.md,
    backgroundColor: '#FFFFFF',
    borderRadius: borderRadius.lg,
    marginTop: spacing.md,
  },
  infoText: {
    ...typography.small,
    color: '#666666',
    textAlign: 'center',
  },
  section: {
    marginBottom: spacing.xl,
  },
  sectionTitle: {
    ...typography.bodyBold,
    color: '#333333',
    marginBottom: spacing.sm,
  },
});

// ===========================================================================
// BASIC STORIES
// ===========================================================================

/**
 * Default - Two players (reciprocal pairs)
 */
export const Default: Story = {
  render: () => (
    <InteractiveWrapper
      players={twoPlayers}
      title="Two Players - Reciprocal"
    />
  ),
};

/**
 * Three players - Circular chain
 */
export const ThreePlayers: Story = {
  render: () => (
    <InteractiveWrapper
      players={threePlayers}
      title="Three Players - Circular Chain"
    />
  ),
};

/**
 * Four players - Reciprocal pairs
 */
export const FourPlayers: Story = {
  render: () => (
    <InteractiveWrapper
      players={fourPlayers}
      title="Four Players - Reciprocal"
    />
  ),
};

/**
 * Five players - Circular chain
 */
export const FivePlayers: Story = {
  render: () => (
    <InteractiveWrapper
      players={fivePlayers}
      title="Five Players - Circular Chain"
    />
  ),
};

/**
 * Six players - Reciprocal pairs
 */
export const SixPlayers: Story = {
  render: () => (
    <InteractiveWrapper
      players={sixPlayers}
      title="Six Players - Reciprocal"
    />
  ),
};

// ===========================================================================
// STATE STORIES
// ===========================================================================

/**
 * Empty state - No players
 */
export const EmptyState: Story = {
  render: () => (
    <StoryWrapper title="Empty State">
      <ScoringPairFormationInline
        players={[]}
        pairs={[]}
        onPairsChange={() => {}}
        testID="scoring-pair-inline"
      />
    </StoryWrapper>
  ),
};

/**
 * Single player - Not enough players
 */
export const SinglePlayer: Story = {
  render: () => (
    <StoryWrapper title="Single Player">
      <ScoringPairFormationInline
        players={singlePlayer}
        pairs={[]}
        onPairsChange={() => {}}
        testID="scoring-pair-inline"
      />
    </StoryWrapper>
  ),
};

/**
 * With pre-generated pairs
 */
export const WithExistingPairs: Story = {
  render: () => {
    const pairs = createPairs(fourPlayers, 'reciprocal');
    return (
      <StoryWrapper title="With Existing Pairs">
        <ScoringPairFormationInline
          players={fourPlayers}
          pairs={pairs}
          onPairsChange={(newPairs, type) => {
            Alert.alert('Pairs Changed', `${newPairs.length} pairs (${type})`);
          }}
          testID="scoring-pair-inline"
        />
      </StoryWrapper>
    );
  },
};

// ===========================================================================
// PLAYER VARIATIONS
// ===========================================================================

/**
 * Players with photos
 */
export const WithPhotos: Story = {
  render: () => (
    <InteractiveWrapper
      players={playersWithPhotos}
      title="Players with Photos"
    />
  ),
};

/**
 * Players with long names
 */
export const LongNames: Story = {
  render: () => {
    const longNamePlayers: InlinePlayer[] = [
      createInlinePlayer('p1', 'Bartholomew Christopher Wellington III', 15),
      createInlinePlayer('p2', 'Alexandra Elizabeth Montgomery-Worthington', 20),
      createInlinePlayer('p3', 'Maximilian Sebastian von Habsburg', 10),
      createInlinePlayer('p4', 'Valentina Isabella Marchetti-Romano', 25),
    ];
    return (
      <InteractiveWrapper
        players={longNamePlayers}
        title="Long Player Names"
      />
    );
  },
};

/**
 * Players with single-word names
 */
export const SingleWordNames: Story = {
  render: () => {
    const singleNames: InlinePlayer[] = [
      createInlinePlayer('p1', 'Madonna', 15),
      createInlinePlayer('p2', 'Cher', 20),
      createInlinePlayer('p3', 'Prince', 10),
    ];
    return (
      <InteractiveWrapper
        players={singleNames}
        title="Single Word Names"
      />
    );
  },
};

/**
 * Mixed handicaps
 */
export const MixedHandicaps: Story = {
  render: () => {
    const mixedPlayers: InlinePlayer[] = [
      createInlinePlayer('p1', 'Scratch Player', 0),
      createInlinePlayer('p2', 'Low Handicapper', 5),
      createInlinePlayer('p3', 'Mid Handicapper', 15),
      createInlinePlayer('p4', 'High Handicapper', 28),
    ];
    return (
      <InteractiveWrapper
        players={mixedPlayers}
        title="Mixed Handicap Levels"
      />
    );
  },
};

// ===========================================================================
// PAIRING TYPE STORIES
// ===========================================================================

/**
 * Reciprocal pairing demonstration
 */
export const ReciprocalPairing: Story = {
  render: () => (
    <StoryWrapper title="Reciprocal Pairing (Even Players)">
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>2 Players</Text>
        <ScoringPairFormationInline
          players={twoPlayers}
          pairs={createPairs(twoPlayers, 'reciprocal')}
          onPairsChange={() => {}}
        />
      </View>
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>4 Players</Text>
        <ScoringPairFormationInline
          players={fourPlayers}
          pairs={createPairs(fourPlayers, 'reciprocal')}
          onPairsChange={() => {}}
        />
      </View>
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>6 Players</Text>
        <ScoringPairFormationInline
          players={sixPlayers}
          pairs={createPairs(sixPlayers, 'reciprocal')}
          onPairsChange={() => {}}
        />
      </View>
    </StoryWrapper>
  ),
};

/**
 * Circular pairing demonstration
 */
export const CircularPairing: Story = {
  render: () => (
    <StoryWrapper title="Circular Pairing (Odd Players)">
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>3 Players</Text>
        <ScoringPairFormationInline
          players={threePlayers}
          pairs={createPairs(threePlayers, 'circular')}
          onPairsChange={() => {}}
        />
      </View>
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>5 Players</Text>
        <ScoringPairFormationInline
          players={fivePlayers}
          pairs={createPairs(fivePlayers, 'circular')}
          onPairsChange={() => {}}
        />
      </View>
    </StoryWrapper>
  ),
};

// ===========================================================================
// INTERACTIVE STORIES
// ===========================================================================

/**
 * Interactive with shuffle functionality
 */
export const Interactive: Story = {
  render: () => (
    <InteractiveWrapper
      players={fourPlayers}
      title="Interactive - Tap Shuffle"
    />
  ),
};

/**
 * Large group scenario
 */
export const LargeGroup: Story = {
  render: () => {
    const largePlayers = Array.from({ length: 8 }, (_, i) =>
      createInlinePlayer(`player-${i + 1}`, `Player ${i + 1}`, 10 + i * 2)
    );
    return (
      <InteractiveWrapper
        players={largePlayers}
        title="Large Group (8 Players)"
      />
    );
  },
};

// ===========================================================================
// DARK MODE STORIES
// ===========================================================================

/**
 * Dark mode - Two players
 */
export const DarkModeTwoPlayers: Story = {
  parameters: {
    backgrounds: { default: 'dark' },
  },
  render: () => (
    <InteractiveWrapper
      players={twoPlayers}
      title="Dark Mode - Two Players"
    />
  ),
};

/**
 * Dark mode - Three players
 */
export const DarkModeThreePlayers: Story = {
  parameters: {
    backgrounds: { default: 'dark' },
  },
  render: () => (
    <InteractiveWrapper
      players={threePlayers}
      title="Dark Mode - Three Players"
    />
  ),
};

/**
 * Dark mode - Four players
 */
export const DarkModeFourPlayers: Story = {
  parameters: {
    backgrounds: { default: 'dark' },
  },
  render: () => (
    <InteractiveWrapper
      players={fourPlayers}
      title="Dark Mode - Four Players"
    />
  ),
};

// ===========================================================================
// EDGE CASE STORIES
// ===========================================================================

/**
 * Minimum players (exactly 2)
 */
export const MinimumPlayers: Story = {
  render: () => (
    <StoryWrapper title="Minimum Players (2)">
      <ScoringPairFormationInline
        players={twoPlayers}
        pairs={createPairs(twoPlayers, 'reciprocal')}
        onPairsChange={() => {}}
        testID="scoring-pair-inline"
      />
      <View style={styles.infoCard}>
        <Text style={styles.infoText}>
          Minimum 2 players required for scoring pairs
        </Text>
      </View>
    </StoryWrapper>
  ),
};

/**
 * With test ID
 */
export const WithTestID: Story = {
  render: () => (
    <StoryWrapper title="With Test ID">
      <ScoringPairFormationInline
        players={fourPlayers}
        pairs={createPairs(fourPlayers, 'reciprocal')}
        onPairsChange={() => {}}
        testID="custom-test-id"
      />
    </StoryWrapper>
  ),
};

// ===========================================================================
// COMPARISON STORIES
// ===========================================================================

/**
 * Even vs Odd player count comparison
 */
export const EvenVsOddComparison: Story = {
  render: () => (
    <StoryWrapper title="Even vs Odd Player Count">
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Even (4 players) - Reciprocal</Text>
        <ScoringPairFormationInline
          players={fourPlayers}
          pairs={createPairs(fourPlayers, 'reciprocal')}
          onPairsChange={() => {}}
        />
      </View>
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Odd (5 players) - Circular</Text>
        <ScoringPairFormationInline
          players={fivePlayers}
          pairs={createPairs(fivePlayers, 'circular')}
          onPairsChange={() => {}}
        />
      </View>
    </StoryWrapper>
  ),
};

/**
 * All states comparison
 */
export const AllStatesComparison: Story = {
  render: () => (
    <StoryWrapper title="All States">
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Empty (No Players)</Text>
        <ScoringPairFormationInline
          players={[]}
          pairs={[]}
          onPairsChange={() => {}}
        />
      </View>
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Single Player</Text>
        <ScoringPairFormationInline
          players={singlePlayer}
          pairs={[]}
          onPairsChange={() => {}}
        />
      </View>
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Two Players (Reciprocal)</Text>
        <ScoringPairFormationInline
          players={twoPlayers}
          pairs={createPairs(twoPlayers, 'reciprocal')}
          onPairsChange={() => {}}
        />
      </View>
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Three Players (Circular)</Text>
        <ScoringPairFormationInline
          players={threePlayers}
          pairs={createPairs(threePlayers, 'circular')}
          onPairsChange={() => {}}
        />
      </View>
    </StoryWrapper>
  ),
};
