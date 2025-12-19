/**
 * ScorecardTable Storybook Stories
 *
 * Stories demonstrating the various configurations of the ScorecardTable component.
 * Shows different player counts, score scenarios, and layout behaviors.
 */

import React from 'react';
import { View, StyleSheet, Dimensions, ScrollView } from 'react-native';
import type { Meta, StoryObj } from '@storybook/react';
import { ScorecardTable } from './ScorecardTable';
import { create18Holes } from '@/__tests__/utils/testFixtures';
import { spacing } from '@/constants/theme';
import type { ScorecardTablePlayer } from './types';
import type { Hole } from '@/types/database.types';

// ===========================================================================
// META
// ===========================================================================

const meta: Meta<typeof ScorecardTable> = {
  title: 'Scorecard/ScorecardTable',
  component: ScorecardTable,
  parameters: {
    layout: 'fullscreen',
  },
  argTypes: {
    screenWidth: {
      control: { type: 'number', min: 300, max: 800, step: 50 },
    },
  },
};

export default meta;
type Story = StoryObj<typeof ScorecardTable>;

// ===========================================================================
// FIXTURES
// ===========================================================================

const holes = create18Holes();
const screenWidth = Dimensions.get('window').width;

/**
 * Create a test player with scores
 */
function createPlayer(
  id: string,
  name: string,
  handicap: number,
  scores: Record<string, { strokes: number }> = {}
): ScorecardTablePlayer {
  return {
    id: `scorecard-${id}`,
    playerId: id,
    player: { id, name, handicap },
    scores,
    hasScorecard: Object.keys(scores).length > 0,
  };
}

/**
 * Generate scores for all holes with a specific offset from par
 */
function generateScores(
  holeList: Hole[],
  offset: number = 0
): Record<string, { strokes: number }> {
  const scores: Record<string, { strokes: number }> = {};
  holeList.forEach((hole) => {
    scores[String(hole.number)] = { strokes: hole.par + offset };
  });
  return scores;
}

/**
 * Generate mixed realistic scores
 */
function generateRealisticScores(holeList: Hole[]): Record<string, { strokes: number }> {
  const offsets = [0, 1, 0, -1, 1, 2, 0, 0, 1, 0, 1, 0, 2, 0, 1, -1, 0, 1];
  const scores: Record<string, { strokes: number }> = {};
  holeList.forEach((hole, index) => {
    scores[String(hole.number)] = { strokes: hole.par + offsets[index % offsets.length] };
  });
  return scores;
}

/**
 * Generate partial scores (only first 9 holes)
 */
function generatePartialScores(holeList: Hole[]): Record<string, { strokes: number }> {
  const scores: Record<string, { strokes: number }> = {};
  holeList.slice(0, 9).forEach((hole) => {
    scores[String(hole.number)] = { strokes: hole.par + Math.floor(Math.random() * 3) };
  });
  return scores;
}

/**
 * Generate scores with exceptional holes (eagles, birdies, double bogeys)
 */
function generateExceptionalScores(holeList: Hole[]): Record<string, { strokes: number }> {
  const scores: Record<string, { strokes: number }> = {};
  holeList.forEach((hole, index) => {
    let offset = 0;
    // Create some exceptional scores
    if (index === 2) offset = -2; // Eagle on par 5
    else if (index === 5) offset = -1; // Birdie
    else if (index === 8) offset = 2; // Double bogey
    else if (index === 11) offset = -2; // Eagle on par 5
    else if (index === 14) offset = 3; // Triple bogey
    else offset = Math.random() > 0.5 ? 1 : 0;

    scores[String(hole.number)] = { strokes: hole.par + offset };
  });
  return scores;
}

// ===========================================================================
// WRAPPER COMPONENT
// ===========================================================================

interface StoryWrapperProps {
  children: React.ReactNode;
  title?: string;
}

function StoryWrapper({ children, title }: StoryWrapperProps) {
  return (
    <ScrollView style={styles.container}>
      {title && (
        <View style={styles.titleContainer}>
          <View style={styles.titleText}>
            {/* Title would be Text component but keeping simple for story */}
          </View>
        </View>
      )}
      {children}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F5F5',
  },
  titleContainer: {
    padding: spacing.lg,
    backgroundColor: '#FFFFFF',
    marginBottom: spacing.md,
  },
  titleText: {
    fontSize: 18,
    fontWeight: '600',
  },
});

// ===========================================================================
// STORIES
// ===========================================================================

/**
 * Single player with complete round (all pars)
 */
export const SinglePlayerPar: Story = {
  render: () => (
    <StoryWrapper>
      <ScorecardTable
        players={[createPlayer('1', 'John Smith', 15, generateScores(holes, 0))]}
        holes={holes}
        screenWidth={screenWidth}
      />
    </StoryWrapper>
  ),
};

/**
 * Single player with realistic mixed scores
 */
export const SinglePlayerRealistic: Story = {
  render: () => (
    <StoryWrapper>
      <ScorecardTable
        players={[createPlayer('1', 'Sarah Johnson', 18, generateRealisticScores(holes))]}
        holes={holes}
        screenWidth={screenWidth}
      />
    </StoryWrapper>
  ),
};

/**
 * Two players with different scores
 */
export const TwoPlayers: Story = {
  render: () => (
    <StoryWrapper>
      <ScorecardTable
        players={[
          createPlayer('1', 'John Smith', 12, generateRealisticScores(holes)),
          createPlayer('2', 'Jane Doe', 20, generateScores(holes, 1)),
        ]}
        holes={holes}
        screenWidth={screenWidth}
      />
    </StoryWrapper>
  ),
};

/**
 * Three players - typical golf group
 */
export const ThreePlayers: Story = {
  render: () => (
    <StoryWrapper>
      <ScorecardTable
        players={[
          createPlayer('1', 'Alice Thompson', 8, generateScores(holes, -1)),
          createPlayer('2', 'Bob Williams', 15, generateRealisticScores(holes)),
          createPlayer('3', 'Charlie Brown', 24, generateScores(holes, 2)),
        ]}
        holes={holes}
        screenWidth={screenWidth}
      />
    </StoryWrapper>
  ),
};

/**
 * Four players - typical foursome (requires horizontal scroll)
 */
export const FourPlayers: Story = {
  render: () => (
    <StoryWrapper>
      <ScorecardTable
        players={[
          createPlayer('1', 'Michael Jordan', 5, generateScores(holes, -1)),
          createPlayer('2', 'Tiger Woods', 0, generateScores(holes, -2)),
          createPlayer('3', 'Phil Mickelson', 2, generateRealisticScores(holes)),
          createPlayer('4', 'Rory McIlroy', 1, generateScores(holes, 0)),
        ]}
        holes={holes}
        screenWidth={screenWidth}
      />
    </StoryWrapper>
  ),
};

/**
 * Players with exceptional scores (eagles, birdies, double bogeys)
 */
export const ExceptionalScores: Story = {
  render: () => (
    <StoryWrapper>
      <ScorecardTable
        players={[
          createPlayer('1', 'Pro Golfer', 0, generateExceptionalScores(holes)),
          createPlayer('2', 'Amateur Golfer', 25, generateScores(holes, 2)),
        ]}
        holes={holes}
        screenWidth={screenWidth}
      />
    </StoryWrapper>
  ),
};

/**
 * Round in progress - only front 9 completed
 */
export const PartialRound: Story = {
  render: () => (
    <StoryWrapper>
      <ScorecardTable
        players={[
          createPlayer('1', 'John Smith', 15, generatePartialScores(holes)),
          createPlayer('2', 'Jane Doe', 20, generatePartialScores(holes)),
        ]}
        holes={holes}
        screenWidth={screenWidth}
      />
    </StoryWrapper>
  ),
};

/**
 * Empty scorecard - no scores entered yet
 */
export const EmptyScorecard: Story = {
  render: () => (
    <StoryWrapper>
      <ScorecardTable
        players={[
          createPlayer('1', 'John Smith', 15, {}),
          createPlayer('2', 'Jane Doe', 20, {}),
        ]}
        holes={holes}
        screenWidth={screenWidth}
      />
    </StoryWrapper>
  ),
};

/**
 * High handicap players
 */
export const HighHandicapPlayers: Story = {
  render: () => (
    <StoryWrapper>
      <ScorecardTable
        players={[
          createPlayer('1', 'Beginner One', 36, generateScores(holes, 3)),
          createPlayer('2', 'Beginner Two', 45, generateScores(holes, 4)),
          createPlayer('3', 'Beginner Three', 54, generateScores(holes, 5)),
        ]}
        holes={holes}
        screenWidth={screenWidth}
      />
    </StoryWrapper>
  ),
};

/**
 * Scratch golfers (0 handicap)
 */
export const ScratchGolfers: Story = {
  render: () => (
    <StoryWrapper>
      <ScorecardTable
        players={[
          createPlayer('1', 'Scratch Player', 0, generateScores(holes, -1)),
          createPlayer('2', 'Near Scratch', 2, generateScores(holes, 0)),
        ]}
        holes={holes}
        screenWidth={screenWidth}
      />
    </StoryWrapper>
  ),
};

/**
 * Interactive with player press callback
 */
export const WithPlayerPress: Story = {
  render: () => (
    <StoryWrapper>
      <ScorecardTable
        players={[
          createPlayer('player-1', 'John Smith', 15, generateRealisticScores(holes)),
          createPlayer('player-2', 'Jane Doe', 20, generateScores(holes, 1)),
        ]}
        holes={holes}
        screenWidth={screenWidth}
        onPlayerPress={(playerId) => {
          // eslint-disable-next-line no-alert
          alert(`Player pressed: ${playerId}`);
        }}
      />
    </StoryWrapper>
  ),
};

/**
 * Narrow screen (mobile portrait)
 */
export const NarrowScreen: Story = {
  render: () => (
    <StoryWrapper>
      <ScorecardTable
        players={[
          createPlayer('1', 'Player One', 15, generateRealisticScores(holes)),
          createPlayer('2', 'Player Two', 20, generateScores(holes, 1)),
          createPlayer('3', 'Player Three', 18, generateScores(holes, 0)),
        ]}
        holes={holes}
        screenWidth={320}
      />
    </StoryWrapper>
  ),
};

/**
 * Wide screen (tablet landscape)
 */
export const WideScreen: Story = {
  render: () => (
    <StoryWrapper>
      <ScorecardTable
        players={[
          createPlayer('1', 'Player One', 15, generateRealisticScores(holes)),
          createPlayer('2', 'Player Two', 20, generateScores(holes, 1)),
          createPlayer('3', 'Player Three', 18, generateScores(holes, 0)),
          createPlayer('4', 'Player Four', 22, generateScores(holes, 2)),
        ]}
        holes={holes}
        screenWidth={768}
      />
    </StoryWrapper>
  ),
};

/**
 * 9-hole course (front 9 only)
 */
export const NineHoleCourse: Story = {
  render: () => {
    const front9 = holes.filter((h) => h.number <= 9);
    return (
      <StoryWrapper>
        <ScorecardTable
          players={[
            createPlayer('1', 'John Smith', 15, generateScores(front9, 0)),
            createPlayer('2', 'Jane Doe', 20, generateScores(front9, 1)),
          ]}
          holes={front9}
          screenWidth={screenWidth}
        />
      </StoryWrapper>
    );
  },
};
