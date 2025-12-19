/**
 * PlayerScoreCard Storybook Stories
 *
 * Stories demonstrating the various configurations of the PlayerScoreCard component.
 * Shows different player states, scores, handicaps, and interaction states.
 */

import React from 'react';
import { View, StyleSheet, ScrollView, Alert } from 'react-native';
import { Text } from 'react-native-paper';
import type { Meta, StoryObj } from '@storybook/react';
import { PlayerScoreCard } from './PlayerScoreCard';
import { create18Holes, createTestPlayer } from '@/__tests__/utils/testFixtures';
import { spacing } from '@/constants/theme';
import type { Hole, HoleScore } from '@/types';

// ===========================================================================
// META
// ===========================================================================

const meta: Meta<typeof PlayerScoreCard> = {
  title: 'Scorecard/PlayerScoreCard',
  component: PlayerScoreCard,
  parameters: {
    layout: 'padded',
  },
  argTypes: {
    disabled: {
      control: 'boolean',
    },
  },
};

export default meta;
type Story = StoryObj<typeof PlayerScoreCard>;

// ===========================================================================
// FIXTURES
// ===========================================================================

const holes = create18Holes();

/**
 * Get a specific hole from fixtures
 */
function getHole(holeNumber: number): Hole {
  const hole = holes.find((h) => h.number === holeNumber);
  if (!hole) throw new Error(`Hole ${holeNumber} not found`);
  return hole;
}

// ===========================================================================
// WRAPPER COMPONENT
// ===========================================================================

interface StoryWrapperProps {
  children: React.ReactNode;
  title: string;
  description?: string;
}

function StoryWrapper({ children, title, description }: StoryWrapperProps) {
  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <Text variant="titleLarge" style={styles.title}>
          {title}
        </Text>
        {description && (
          <Text variant="bodyMedium" style={styles.description}>
            {description}
          </Text>
        )}
      </View>
      <View style={styles.content}>{children}</View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F5F5',
  },
  header: {
    padding: spacing.lg,
    backgroundColor: '#FFFFFF',
    marginBottom: spacing.md,
  },
  title: {
    fontWeight: '600',
    marginBottom: spacing.xs,
  },
  description: {
    color: '#666666',
  },
  content: {
    padding: spacing.md,
  },
  multipleCardsContainer: {
    gap: spacing.md,
  },
  sectionTitle: {
    marginBottom: spacing.sm,
    fontWeight: '600',
  },
  sectionContainer: {
    marginBottom: spacing.lg,
  },
});

// ===========================================================================
// DEFAULT STORY
// ===========================================================================

/**
 * Default state - no score entered yet
 */
export const Default: Story = {
  render: () => (
    <StoryWrapper
      title="Default State"
      description="No score entered yet, showing dash for score display"
    >
      <PlayerScoreCard
        player={createTestPlayer({ id: '1', name: 'John Smith', handicap: 15 })}
        currentHole={getHole(1)}
        currentScore={undefined}
        onScoreSelect={(strokes) => Alert.alert('Score Selected', `Strokes: ${strokes}`)}
        onStatsUpdate={(updates) =>
          Alert.alert('Stats Updated', JSON.stringify(updates))
        }
      />
    </StoryWrapper>
  ),
};

// ===========================================================================
// SCORE STATES
// ===========================================================================

/**
 * Par score selected
 */
export const ParScore: Story = {
  render: () => (
    <StoryWrapper title="Par Score" description="Score matches the hole par (highlighted)">
      <PlayerScoreCard
        player={createTestPlayer({ id: '1', name: 'John Smith', handicap: 15 })}
        currentHole={getHole(1)} // Par 4
        currentScore={{ strokes: 4 }}
        onScoreSelect={(strokes) => Alert.alert('Score Selected', `Strokes: ${strokes}`)}
      />
    </StoryWrapper>
  ),
};

/**
 * Birdie score
 */
export const BirdieScore: Story = {
  render: () => (
    <StoryWrapper title="Birdie Score" description="One under par">
      <PlayerScoreCard
        player={createTestPlayer({ id: '1', name: 'Sarah Johnson', handicap: 8 })}
        currentHole={getHole(1)} // Par 4
        currentScore={{ strokes: 3 }}
        onScoreSelect={(strokes) => Alert.alert('Score Selected', `Strokes: ${strokes}`)}
      />
    </StoryWrapper>
  ),
};

/**
 * Eagle score on par 5
 */
export const EagleScore: Story = {
  render: () => (
    <StoryWrapper title="Eagle Score" description="Two under par on a par 5">
      <PlayerScoreCard
        player={createTestPlayer({ id: '1', name: 'Tiger Woods', handicap: 0 })}
        currentHole={getHole(3)} // Par 5
        currentScore={{ strokes: 3 }}
        onScoreSelect={(strokes) => Alert.alert('Score Selected', `Strokes: ${strokes}`)}
      />
    </StoryWrapper>
  ),
};

/**
 * Bogey score
 */
export const BogeyScore: Story = {
  render: () => (
    <StoryWrapper title="Bogey Score" description="One over par">
      <PlayerScoreCard
        player={createTestPlayer({ id: '1', name: 'Bob Williams', handicap: 20 })}
        currentHole={getHole(1)} // Par 4
        currentScore={{ strokes: 5 }}
        onScoreSelect={(strokes) => Alert.alert('Score Selected', `Strokes: ${strokes}`)}
      />
    </StoryWrapper>
  ),
};

/**
 * Double bogey score
 */
export const DoubleBogeyScore: Story = {
  render: () => (
    <StoryWrapper title="Double Bogey Score" description="Two over par">
      <PlayerScoreCard
        player={createTestPlayer({ id: '1', name: 'Charlie Brown', handicap: 28 })}
        currentHole={getHole(1)} // Par 4
        currentScore={{ strokes: 6 }}
        onScoreSelect={(strokes) => Alert.alert('Score Selected', `Strokes: ${strokes}`)}
      />
    </StoryWrapper>
  ),
};

/**
 * Picked up (gave up on hole)
 */
export const PickedUp: Story = {
  render: () => (
    <StoryWrapper
      title="Picked Up"
      description="Player gave up on the hole (10 strokes, 0 points)"
    >
      <PlayerScoreCard
        player={createTestPlayer({ id: '1', name: 'Beginner Player', handicap: 36 })}
        currentHole={getHole(1)} // Par 4
        currentScore={{ strokes: 10 }}
        onScoreSelect={(strokes) => Alert.alert('Score Selected', `Strokes: ${strokes}`)}
      />
    </StoryWrapper>
  ),
};

// ===========================================================================
// HOLE TYPES
// ===========================================================================

/**
 * Par 3 hole
 */
export const Par3Hole: Story = {
  render: () => (
    <StoryWrapper title="Par 3 Hole" description="Short hole - no FIR checkbox shown">
      <PlayerScoreCard
        player={createTestPlayer({ id: '1', name: 'John Smith', handicap: 15 })}
        currentHole={getHole(2)} // Par 3
        currentScore={{ strokes: 3 }}
        onScoreSelect={(strokes) => Alert.alert('Score Selected', `Strokes: ${strokes}`)}
        onStatsUpdate={(updates) =>
          Alert.alert('Stats Updated', JSON.stringify(updates))
        }
      />
    </StoryWrapper>
  ),
};

/**
 * Par 4 hole
 */
export const Par4Hole: Story = {
  render: () => (
    <StoryWrapper title="Par 4 Hole" description="Standard hole with FIR checkbox">
      <PlayerScoreCard
        player={createTestPlayer({ id: '1', name: 'John Smith', handicap: 15 })}
        currentHole={getHole(1)} // Par 4
        currentScore={{ strokes: 4 }}
        onScoreSelect={(strokes) => Alert.alert('Score Selected', `Strokes: ${strokes}`)}
        onStatsUpdate={(updates) =>
          Alert.alert('Stats Updated', JSON.stringify(updates))
        }
      />
    </StoryWrapper>
  ),
};

/**
 * Par 5 hole
 */
export const Par5Hole: Story = {
  render: () => (
    <StoryWrapper title="Par 5 Hole" description="Long hole with FIR checkbox">
      <PlayerScoreCard
        player={createTestPlayer({ id: '1', name: 'John Smith', handicap: 15 })}
        currentHole={getHole(3)} // Par 5
        currentScore={{ strokes: 5 }}
        onScoreSelect={(strokes) => Alert.alert('Score Selected', `Strokes: ${strokes}`)}
        onStatsUpdate={(updates) =>
          Alert.alert('Stats Updated', JSON.stringify(updates))
        }
      />
    </StoryWrapper>
  ),
};

// ===========================================================================
// HANDICAP VARIATIONS
// ===========================================================================

/**
 * Scratch golfer (0 handicap)
 */
export const ScratchGolfer: Story = {
  render: () => (
    <StoryWrapper title="Scratch Golfer" description="0 handicap - no shots received">
      <PlayerScoreCard
        player={createTestPlayer({ id: '1', name: 'Pro Player', handicap: 0 })}
        currentHole={getHole(1)} // Par 4
        currentScore={{ strokes: 4 }}
        onScoreSelect={(strokes) => Alert.alert('Score Selected', `Strokes: ${strokes}`)}
      />
    </StoryWrapper>
  ),
};

/**
 * High handicap player
 */
export const HighHandicapper: Story = {
  render: () => (
    <StoryWrapper
      title="High Handicapper"
      description="36+ handicap - multiple shots received"
    >
      <PlayerScoreCard
        player={createTestPlayer({ id: '1', name: 'New Golfer', handicap: 36 })}
        currentHole={getHole(1)} // Par 4
        currentScore={{ strokes: 6 }}
        onScoreSelect={(strokes) => Alert.alert('Score Selected', `Strokes: ${strokes}`)}
      />
    </StoryWrapper>
  ),
};

/**
 * Maximum handicap (54)
 */
export const MaximumHandicap: Story = {
  render: () => (
    <StoryWrapper
      title="Maximum Handicap"
      description="54 handicap - 3 shots per hole"
    >
      <PlayerScoreCard
        player={createTestPlayer({ id: '1', name: 'Complete Beginner', handicap: 54 })}
        currentHole={getHole(1)} // Par 4
        currentScore={{ strokes: 7 }}
        onScoreSelect={(strokes) => Alert.alert('Score Selected', `Strokes: ${strokes}`)}
      />
    </StoryWrapper>
  ),
};

// ===========================================================================
// STATS ROW VARIATIONS
// ===========================================================================

/**
 * With all stats filled
 */
export const WithAllStats: Story = {
  render: () => (
    <StoryWrapper
      title="All Stats Filled"
      description="FIR hit, GIR hit, 2 putts"
    >
      <PlayerScoreCard
        player={createTestPlayer({ id: '1', name: 'Detailed Scorer', handicap: 12 })}
        currentHole={getHole(1)} // Par 4
        currentScore={{
          strokes: 4,
          fairwayHit: true,
          greenInRegulation: true,
          putts: 2,
        }}
        onScoreSelect={(strokes) => Alert.alert('Score Selected', `Strokes: ${strokes}`)}
        onStatsUpdate={(updates) =>
          Alert.alert('Stats Updated', JSON.stringify(updates))
        }
      />
    </StoryWrapper>
  ),
};

/**
 * With missed stats
 */
export const WithMissedStats: Story = {
  render: () => (
    <StoryWrapper
      title="Missed Stats"
      description="Missed fairway and green, 3 putts"
    >
      <PlayerScoreCard
        player={createTestPlayer({ id: '1', name: 'Struggling Golfer', handicap: 25 })}
        currentHole={getHole(1)} // Par 4
        currentScore={{
          strokes: 6,
          fairwayHit: false,
          greenInRegulation: false,
          putts: 3,
        }}
        onScoreSelect={(strokes) => Alert.alert('Score Selected', `Strokes: ${strokes}`)}
        onStatsUpdate={(updates) =>
          Alert.alert('Stats Updated', JSON.stringify(updates))
        }
      />
    </StoryWrapper>
  ),
};

/**
 * One putt (holed from off green)
 */
export const OnePutt: Story = {
  render: () => (
    <StoryWrapper title="One Putt" description="Holed a long putt or chipped in">
      <PlayerScoreCard
        player={createTestPlayer({ id: '1', name: 'Lucky Golfer', handicap: 15 })}
        currentHole={getHole(1)} // Par 4
        currentScore={{
          strokes: 3,
          fairwayHit: true,
          greenInRegulation: false,
          putts: 1,
        }}
        onScoreSelect={(strokes) => Alert.alert('Score Selected', `Strokes: ${strokes}`)}
        onStatsUpdate={(updates) =>
          Alert.alert('Stats Updated', JSON.stringify(updates))
        }
      />
    </StoryWrapper>
  ),
};

/**
 * Zero putts (holed out from off green)
 */
export const ZeroPutts: Story = {
  render: () => (
    <StoryWrapper title="Zero Putts" description="Holed out from off the green">
      <PlayerScoreCard
        player={createTestPlayer({ id: '1', name: 'Chip-in Champion', handicap: 15 })}
        currentHole={getHole(1)} // Par 4
        currentScore={{
          strokes: 3,
          fairwayHit: true,
          greenInRegulation: false,
          putts: 0,
        }}
        onScoreSelect={(strokes) => Alert.alert('Score Selected', `Strokes: ${strokes}`)}
        onStatsUpdate={(updates) =>
          Alert.alert('Stats Updated', JSON.stringify(updates))
        }
      />
    </StoryWrapper>
  ),
};

// ===========================================================================
// INTERACTION STATES
// ===========================================================================

/**
 * Disabled state
 */
export const Disabled: Story = {
  render: () => (
    <StoryWrapper
      title="Disabled State"
      description="All controls disabled (e.g., for submitted scorecard)"
    >
      <PlayerScoreCard
        player={createTestPlayer({ id: '1', name: 'John Smith', handicap: 15 })}
        currentHole={getHole(1)}
        currentScore={{ strokes: 4, fairwayHit: true, greenInRegulation: true, putts: 2 }}
        onScoreSelect={(strokes) => Alert.alert('Score Selected', `Strokes: ${strokes}`)}
        onStatsUpdate={(updates) =>
          Alert.alert('Stats Updated', JSON.stringify(updates))
        }
        disabled={true}
      />
    </StoryWrapper>
  ),
};

/**
 * With player press callback
 */
export const WithPlayerPress: Story = {
  render: () => (
    <StoryWrapper
      title="With Player Press"
      description="Tap player name to view detailed scorecard"
    >
      <PlayerScoreCard
        player={createTestPlayer({ id: 'player-123', name: 'John Smith', handicap: 15 })}
        currentHole={getHole(1)}
        currentScore={{ strokes: 4 }}
        onScoreSelect={(strokes) => Alert.alert('Score Selected', `Strokes: ${strokes}`)}
        onPlayerPress={(playerId) =>
          Alert.alert('Player Pressed', `Player ID: ${playerId}`)
        }
      />
    </StoryWrapper>
  ),
};

// ===========================================================================
// MULTIPLE PLAYERS
// ===========================================================================

/**
 * Multiple players in a group
 */
export const MultiplePlayersGroup: Story = {
  render: () => {
    const hole = getHole(1); // Par 4
    const players = [
      { player: createTestPlayer({ id: '1', name: 'John Smith', handicap: 15 }), score: { strokes: 4, fairwayHit: true, greenInRegulation: true, putts: 2 } },
      { player: createTestPlayer({ id: '2', name: 'Sarah Johnson', handicap: 8 }), score: { strokes: 3, fairwayHit: true, greenInRegulation: true, putts: 1 } },
      { player: createTestPlayer({ id: '3', name: 'Bob Williams', handicap: 22 }), score: { strokes: 5, fairwayHit: false, greenInRegulation: false, putts: 2 } },
      { player: createTestPlayer({ id: '4', name: 'Alice Brown', handicap: 18 }), score: undefined as HoleScore | undefined },
    ];

    return (
      <StoryWrapper
        title="Multiple Players"
        description="Typical foursome with varying scores"
      >
        <View style={styles.multipleCardsContainer}>
          {players.map(({ player, score }) => (
            <PlayerScoreCard
              key={player.id}
              player={player}
              currentHole={hole}
              currentScore={score}
              onScoreSelect={(strokes) =>
                Alert.alert('Score Selected', `${player.name}: ${strokes} strokes`)
              }
              onStatsUpdate={(updates) =>
                Alert.alert('Stats Updated', `${player.name}: ${JSON.stringify(updates)}`)
              }
            />
          ))}
        </View>
      </StoryWrapper>
    );
  },
};

// ===========================================================================
// EDGE CASES
// ===========================================================================

/**
 * Long player name
 */
export const LongPlayerName: Story = {
  render: () => (
    <StoryWrapper
      title="Long Player Name"
      description="Very long name that should truncate"
    >
      <PlayerScoreCard
        player={createTestPlayer({
          id: '1',
          name: 'Alexander Maximilian Von Rothschild III',
          handicap: 15,
        })}
        currentHole={getHole(1)}
        currentScore={{ strokes: 4 }}
        onScoreSelect={(strokes) => Alert.alert('Score Selected', `Strokes: ${strokes}`)}
      />
    </StoryWrapper>
  ),
};

/**
 * Minimum score (1)
 */
export const MinimumScore: Story = {
  render: () => (
    <StoryWrapper title="Minimum Score" description="Hole in one on a par 3">
      <PlayerScoreCard
        player={createTestPlayer({ id: '1', name: 'Lucky Golfer', handicap: 10 })}
        currentHole={getHole(2)} // Par 3
        currentScore={{ strokes: 1, putts: 0 }}
        onScoreSelect={(strokes) => Alert.alert('Score Selected', `Strokes: ${strokes}`)}
        onStatsUpdate={(updates) =>
          Alert.alert('Stats Updated', JSON.stringify(updates))
        }
      />
    </StoryWrapper>
  ),
};

/**
 * Maximum putts (6)
 */
export const MaximumPutts: Story = {
  render: () => (
    <StoryWrapper title="Maximum Putts" description="Six putts on the green">
      <PlayerScoreCard
        player={createTestPlayer({ id: '1', name: 'Putting Trouble', handicap: 30 })}
        currentHole={getHole(1)}
        currentScore={{
          strokes: 9,
          fairwayHit: true,
          greenInRegulation: true,
          putts: 6,
        }}
        onScoreSelect={(strokes) => Alert.alert('Score Selected', `Strokes: ${strokes}`)}
        onStatsUpdate={(updates) =>
          Alert.alert('Stats Updated', JSON.stringify(updates))
        }
      />
    </StoryWrapper>
  ),
};

/**
 * Different stroke indexes
 */
export const DifferentStrokeIndexes: Story = {
  render: () => {
    const easyHole = getHole(6); // SI 17 (easiest)
    const hardHole = getHole(3); // SI 1 (hardest)
    const player = createTestPlayer({ id: '1', name: 'John Smith', handicap: 10 });

    return (
      <StoryWrapper
        title="Different Stroke Indexes"
        description="Shows how shots received varies by hole difficulty"
      >
        <View style={styles.multipleCardsContainer}>
          <View style={styles.sectionContainer}>
            <Text variant="titleMedium" style={styles.sectionTitle}>
              SI 1 (Hardest Hole)
            </Text>
            <PlayerScoreCard
              player={player}
              currentHole={hardHole}
              currentScore={{ strokes: 5 }}
              onScoreSelect={(strokes) => Alert.alert('Score Selected', `Strokes: ${strokes}`)}
            />
          </View>
          <View style={styles.sectionContainer}>
            <Text variant="titleMedium" style={styles.sectionTitle}>
              SI 17 (Easiest Hole)
            </Text>
            <PlayerScoreCard
              player={player}
              currentHole={easyHole}
              currentScore={{ strokes: 3 }}
              onScoreSelect={(strokes) => Alert.alert('Score Selected', `Strokes: ${strokes}`)}
            />
          </View>
        </View>
      </StoryWrapper>
    );
  },
};
