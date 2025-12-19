/**
 * TeamScoreCard Storybook Stories
 *
 * Stories demonstrating the various configurations of the TeamScoreCard component
 * for Scramble/Ambrose format team scoring. Shows different team compositions,
 * score states, handicap combinations, and interaction states.
 */

import React from 'react';
import { View, StyleSheet, ScrollView, Alert } from 'react-native';
import { Text } from 'react-native-paper';
import type { Meta, StoryObj } from '@storybook/react';
import { TeamScoreCard } from './TeamScoreCard';
import {
  create18Holes,
  createTestPlayer,
  createTeamWithMembers,
} from '@/__tests__/utils/testFixtures';
import { spacing } from '@/constants/theme';
import type { Hole } from '@/types';
import type { TeamWithMembers } from '@/types/database.types';

// ===========================================================================
// META
// ===========================================================================

const meta: Meta<typeof TeamScoreCard> = {
  title: 'Scorecard/TeamScoreCard',
  component: TeamScoreCard,
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
type Story = StoryObj<typeof TeamScoreCard>;

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

/**
 * Create a team with 2 members
 */
function createTwoPlayerTeam(
  name: string,
  handicaps: [number, number] = [15, 20]
): TeamWithMembers {
  const members = [
    createTestPlayer({ id: 'player-1', name: 'John Smith', handicap: handicaps[0] }),
    createTestPlayer({ id: 'player-2', name: 'Jane Doe', handicap: handicaps[1] }),
  ];
  return createTeamWithMembers({ id: 'team-1', name }, members);
}

/**
 * Create a team with 4 members
 */
function createFourPlayerTeam(
  name: string,
  handicaps: [number, number, number, number] = [5, 15, 20, 32]
): TeamWithMembers {
  const members = [
    createTestPlayer({ id: 'player-1', name: 'John Smith', handicap: handicaps[0] }),
    createTestPlayer({ id: 'player-2', name: 'Jane Doe', handicap: handicaps[1] }),
    createTestPlayer({ id: 'player-3', name: 'Bob Wilson', handicap: handicaps[2] }),
    createTestPlayer({ id: 'player-4', name: 'Alice Brown', handicap: handicaps[3] }),
  ];
  return createTeamWithMembers({ id: 'team-1', name }, members);
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
      <TeamScoreCard
        team={createTwoPlayerTeam('Team Alpha')}
        currentHole={getHole(1)}
        currentScore={undefined}
        onScoreSelect={(strokes) => Alert.alert('Score Selected', `Strokes: ${strokes}`)}
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
      <TeamScoreCard
        team={createTwoPlayerTeam('Team Alpha')}
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
      <TeamScoreCard
        team={createTwoPlayerTeam('Team Eagle', [8, 10])}
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
      <TeamScoreCard
        team={createTwoPlayerTeam('Team Pro', [0, 5])}
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
      <TeamScoreCard
        team={createTwoPlayerTeam('Team Bogey', [20, 25])}
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
      <TeamScoreCard
        team={createTwoPlayerTeam('Team Struggle', [28, 32])}
        currentHole={getHole(1)} // Par 4
        currentScore={{ strokes: 6 }}
        onScoreSelect={(strokes) => Alert.alert('Score Selected', `Strokes: ${strokes}`)}
      />
    </StoryWrapper>
  ),
};

/**
 * Picked up (team gave up on hole)
 */
export const PickedUp: Story = {
  render: () => (
    <StoryWrapper
      title="Picked Up"
      description="Team gave up on the hole (10 strokes, 0 points)"
    >
      <TeamScoreCard
        team={createTwoPlayerTeam('Team Beginners', [36, 40])}
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
    <StoryWrapper title="Par 3 Hole" description="Short hole">
      <TeamScoreCard
        team={createTwoPlayerTeam('Team Alpha')}
        currentHole={getHole(2)} // Par 3
        currentScore={{ strokes: 3 }}
        onScoreSelect={(strokes) => Alert.alert('Score Selected', `Strokes: ${strokes}`)}
      />
    </StoryWrapper>
  ),
};

/**
 * Par 4 hole
 */
export const Par4Hole: Story = {
  render: () => (
    <StoryWrapper title="Par 4 Hole" description="Standard hole">
      <TeamScoreCard
        team={createTwoPlayerTeam('Team Alpha')}
        currentHole={getHole(1)} // Par 4
        currentScore={{ strokes: 4 }}
        onScoreSelect={(strokes) => Alert.alert('Score Selected', `Strokes: ${strokes}`)}
      />
    </StoryWrapper>
  ),
};

/**
 * Par 5 hole
 */
export const Par5Hole: Story = {
  render: () => (
    <StoryWrapper title="Par 5 Hole" description="Long hole">
      <TeamScoreCard
        team={createTwoPlayerTeam('Team Alpha')}
        currentHole={getHole(3)} // Par 5
        currentScore={{ strokes: 5 }}
        onScoreSelect={(strokes) => Alert.alert('Score Selected', `Strokes: ${strokes}`)}
      />
    </StoryWrapper>
  ),
};

// ===========================================================================
// TEAM SIZE VARIATIONS
// ===========================================================================

/**
 * Two-player team (pairs)
 */
export const TwoPlayerTeam: Story = {
  render: () => (
    <StoryWrapper
      title="Two-Player Team (Pairs)"
      description="Standard 2-player Scramble format"
    >
      <TeamScoreCard
        team={createTwoPlayerTeam('Team Pairs', [12, 18])}
        currentHole={getHole(1)}
        currentScore={{ strokes: 4 }}
        onScoreSelect={(strokes) => Alert.alert('Score Selected', `Strokes: ${strokes}`)}
      />
    </StoryWrapper>
  ),
};

/**
 * Four-player team (foursome)
 */
export const FourPlayerTeam: Story = {
  render: () => (
    <StoryWrapper
      title="Four-Player Team (Foursome)"
      description="4-player Ambrose/Scramble format"
    >
      <TeamScoreCard
        team={createFourPlayerTeam('Team Foursome', [5, 15, 22, 30])}
        currentHole={getHole(1)}
        currentScore={{ strokes: 4 }}
        onScoreSelect={(strokes) => Alert.alert('Score Selected', `Strokes: ${strokes}`)}
      />
    </StoryWrapper>
  ),
};

// ===========================================================================
// HANDICAP VARIATIONS
// ===========================================================================

/**
 * Scratch team (combined 0 handicap)
 */
export const ScratchTeam: Story = {
  render: () => (
    <StoryWrapper
      title="Scratch Team"
      description="Combined 0 handicap - no shots received"
    >
      <TeamScoreCard
        team={createTwoPlayerTeam('Team Pro', [0, 0])}
        currentHole={getHole(1)}
        currentScore={{ strokes: 4 }}
        onScoreSelect={(strokes) => Alert.alert('Score Selected', `Strokes: ${strokes}`)}
      />
    </StoryWrapper>
  ),
};

/**
 * Low handicap team
 */
export const LowHandicapTeam: Story = {
  render: () => (
    <StoryWrapper
      title="Low Handicap Team"
      description="Team HC: 2.5 (5 + 5) * 0.25"
    >
      <TeamScoreCard
        team={createTwoPlayerTeam('Team Elite', [5, 5])}
        currentHole={getHole(1)}
        currentScore={{ strokes: 4 }}
        onScoreSelect={(strokes) => Alert.alert('Score Selected', `Strokes: ${strokes}`)}
      />
    </StoryWrapper>
  ),
};

/**
 * High handicap team
 */
export const HighHandicapTeam: Story = {
  render: () => (
    <StoryWrapper
      title="High Handicap Team"
      description="Team HC: 18.0 (36 + 36) * 0.25"
    >
      <TeamScoreCard
        team={createTwoPlayerTeam('Team Newbies', [36, 36])}
        currentHole={getHole(1)}
        currentScore={{ strokes: 6 }}
        onScoreSelect={(strokes) => Alert.alert('Score Selected', `Strokes: ${strokes}`)}
      />
    </StoryWrapper>
  ),
};

/**
 * Mixed handicap team
 */
export const MixedHandicapTeam: Story = {
  render: () => (
    <StoryWrapper
      title="Mixed Handicap Team"
      description="Low and high handicap players combined"
    >
      <TeamScoreCard
        team={createTwoPlayerTeam('Team Mixed', [2, 30])}
        currentHole={getHole(1)}
        currentScore={{ strokes: 4 }}
        onScoreSelect={(strokes) => Alert.alert('Score Selected', `Strokes: ${strokes}`)}
      />
    </StoryWrapper>
  ),
};

// ===========================================================================
// CONTRIBUTING PLAYER SELECTOR
// ===========================================================================

/**
 * With contributor selector - no selection
 */
export const WithContributorNoSelection: Story = {
  render: () => (
    <StoryWrapper
      title="Contributor Selector - No Selection"
      description="Show who made the best shot on this hole"
    >
      <TeamScoreCard
        team={createTwoPlayerTeam('Team Alpha')}
        currentHole={getHole(1)}
        currentScore={{ strokes: 4 }}
        onScoreSelect={(strokes) => Alert.alert('Score Selected', `Strokes: ${strokes}`)}
        onContributorSelect={(playerId) =>
          Alert.alert('Contributor Selected', `Player ID: ${playerId}`)
        }
        selectedContributor={undefined}
      />
    </StoryWrapper>
  ),
};

/**
 * With contributor selector - player selected
 */
export const WithContributorSelected: Story = {
  render: () => (
    <StoryWrapper
      title="Contributor Selector - Player Selected"
      description="John Smith made the shot used for this hole"
    >
      <TeamScoreCard
        team={createTwoPlayerTeam('Team Alpha')}
        currentHole={getHole(1)}
        currentScore={{ strokes: 4 }}
        onScoreSelect={(strokes) => Alert.alert('Score Selected', `Strokes: ${strokes}`)}
        onContributorSelect={(playerId) =>
          Alert.alert('Contributor Selected', `Player ID: ${playerId}`)
        }
        selectedContributor="player-1"
      />
    </StoryWrapper>
  ),
};

/**
 * Four-player team with contributor
 */
export const FourPlayerWithContributor: Story = {
  render: () => (
    <StoryWrapper
      title="Four-Player Team with Contributor"
      description="Track which team member contributed each hole"
    >
      <TeamScoreCard
        team={createFourPlayerTeam('Team Foursome')}
        currentHole={getHole(1)}
        currentScore={{ strokes: 3 }}
        onScoreSelect={(strokes) => Alert.alert('Score Selected', `Strokes: ${strokes}`)}
        onContributorSelect={(playerId) =>
          Alert.alert('Contributor Selected', `Player ID: ${playerId}`)
        }
        selectedContributor="player-3"
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
      <TeamScoreCard
        team={createTwoPlayerTeam('Team Alpha')}
        currentHole={getHole(1)}
        currentScore={{ strokes: 4 }}
        onScoreSelect={(strokes) => Alert.alert('Score Selected', `Strokes: ${strokes}`)}
        disabled={true}
      />
    </StoryWrapper>
  ),
};

/**
 * Disabled with contributor
 */
export const DisabledWithContributor: Story = {
  render: () => (
    <StoryWrapper
      title="Disabled with Contributor"
      description="Completed hole showing contributor"
    >
      <TeamScoreCard
        team={createTwoPlayerTeam('Team Alpha')}
        currentHole={getHole(1)}
        currentScore={{ strokes: 4 }}
        onScoreSelect={(strokes) => Alert.alert('Score Selected', `Strokes: ${strokes}`)}
        onContributorSelect={(playerId) =>
          Alert.alert('Contributor Selected', `Player ID: ${playerId}`)
        }
        selectedContributor="player-2"
        disabled={true}
      />
    </StoryWrapper>
  ),
};

// ===========================================================================
// MULTIPLE TEAMS
// ===========================================================================

/**
 * Multiple teams in competition
 */
export const MultipleTeams: Story = {
  render: () => {
    const hole = getHole(1); // Par 4
    const teams = [
      {
        team: createTwoPlayerTeam('Team Eagles', [8, 12]),
        score: { strokes: 3 },
      },
      {
        team: createTwoPlayerTeam('Team Birdies', [15, 18]),
        score: { strokes: 4 },
      },
      {
        team: createTwoPlayerTeam('Team Pars', [22, 25]),
        score: { strokes: 5 },
      },
      {
        team: createTwoPlayerTeam('Team Bogeys', [30, 35]),
        score: undefined,
      },
    ];

    return (
      <StoryWrapper
        title="Multiple Teams"
        description="Four teams with different scores and handicaps"
      >
        <View style={styles.multipleCardsContainer}>
          {teams.map(({ team, score }) => (
            <TeamScoreCard
              key={team.id}
              team={team}
              currentHole={hole}
              currentScore={score}
              onScoreSelect={(strokes) =>
                Alert.alert('Score Selected', `${team.name}: ${strokes} strokes`)
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
 * Long team name
 */
export const LongTeamName: Story = {
  render: () => (
    <StoryWrapper
      title="Long Team Name"
      description="Very long name that should truncate"
    >
      <TeamScoreCard
        team={createTwoPlayerTeam(
          'The Incredibly Long Team Name That Goes On Forever'
        )}
        currentHole={getHole(1)}
        currentScore={{ strokes: 4 }}
        onScoreSelect={(strokes) => Alert.alert('Score Selected', `Strokes: ${strokes}`)}
      />
    </StoryWrapper>
  ),
};

/**
 * Minimum score (1) - Hole in one
 */
export const MinimumScore: Story = {
  render: () => (
    <StoryWrapper title="Minimum Score" description="Hole in one on a par 3">
      <TeamScoreCard
        team={createTwoPlayerTeam('Team Lucky', [5, 10])}
        currentHole={getHole(2)} // Par 3
        currentScore={{ strokes: 1 }}
        onScoreSelect={(strokes) => Alert.alert('Score Selected', `Strokes: ${strokes}`)}
      />
    </StoryWrapper>
  ),
};

/**
 * Maximum regular score (12)
 */
export const MaximumScore: Story = {
  render: () => (
    <StoryWrapper title="Maximum Score" description="12 strokes before pickup">
      <TeamScoreCard
        team={createTwoPlayerTeam('Team Trouble', [36, 40])}
        currentHole={getHole(1)}
        currentScore={{ strokes: 12 }}
        onScoreSelect={(strokes) => Alert.alert('Score Selected', `Strokes: ${strokes}`)}
      />
    </StoryWrapper>
  ),
};

/**
 * Empty team (no members)
 */
export const EmptyTeam: Story = {
  render: () => (
    <StoryWrapper title="Empty Team" description="Team with no members yet">
      <TeamScoreCard
        team={createTeamWithMembers({ id: 'empty', name: 'Empty Team' }, [])}
        currentHole={getHole(1)}
        currentScore={undefined}
        onScoreSelect={(strokes) => Alert.alert('Score Selected', `Strokes: ${strokes}`)}
      />
    </StoryWrapper>
  ),
};

/**
 * Different stroke indexes
 */
export const DifferentStrokeIndexes: Story = {
  render: () => {
    const team = createTwoPlayerTeam('Team Alpha', [10, 14]); // Team HC: 6.0
    const easyHole = getHole(6); // SI 17 (easiest)
    const hardHole = getHole(3); // SI 1 (hardest)

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
            <TeamScoreCard
              team={team}
              currentHole={hardHole}
              currentScore={{ strokes: 5 }}
              onScoreSelect={(strokes) =>
                Alert.alert('Score Selected', `Strokes: ${strokes}`)
              }
            />
          </View>
          <View style={styles.sectionContainer}>
            <Text variant="titleMedium" style={styles.sectionTitle}>
              SI 17 (Easiest Hole)
            </Text>
            <TeamScoreCard
              team={team}
              currentHole={easyHole}
              currentScore={{ strokes: 3 }}
              onScoreSelect={(strokes) =>
                Alert.alert('Score Selected', `Strokes: ${strokes}`)
              }
            />
          </View>
        </View>
      </StoryWrapper>
    );
  },
};

// ===========================================================================
// COMPARISON: 2-PLAYER VS 4-PLAYER TEAMS
// ===========================================================================

/**
 * Team size comparison
 */
export const TeamSizeComparison: Story = {
  render: () => {
    const hole = getHole(1); // Par 4

    return (
      <StoryWrapper
        title="Team Size Comparison"
        description="2-player vs 4-player teams with similar total handicap"
      >
        <View style={styles.multipleCardsContainer}>
          <View style={styles.sectionContainer}>
            <Text variant="titleMedium" style={styles.sectionTitle}>
              2-Player Team (HC: 7.5)
            </Text>
            <TeamScoreCard
              team={createTwoPlayerTeam('Pair Team', [10, 20])}
              currentHole={hole}
              currentScore={{ strokes: 4 }}
              onScoreSelect={(strokes) =>
                Alert.alert('Score Selected', `Strokes: ${strokes}`)
              }
            />
          </View>
          <View style={styles.sectionContainer}>
            <Text variant="titleMedium" style={styles.sectionTitle}>
              4-Player Team (HC: 7.5)
            </Text>
            <TeamScoreCard
              team={createFourPlayerTeam('Foursome Team', [5, 5, 10, 10])}
              currentHole={hole}
              currentScore={{ strokes: 4 }}
              onScoreSelect={(strokes) =>
                Alert.alert('Score Selected', `Strokes: ${strokes}`)
              }
            />
          </View>
        </View>
      </StoryWrapper>
    );
  },
};

// ===========================================================================
// SCORING PROGRESSION
// ===========================================================================

/**
 * Scoring progression through a hole
 */
export const ScoringProgression: Story = {
  render: () => {
    const team = createTwoPlayerTeam('Team Demo', [15, 18]);
    const hole = getHole(1); // Par 4

    return (
      <StoryWrapper
        title="Scoring Progression"
        description="Different score states as team plays the hole"
      >
        <View style={styles.multipleCardsContainer}>
          <View style={styles.sectionContainer}>
            <Text variant="titleMedium" style={styles.sectionTitle}>
              No Score Yet
            </Text>
            <TeamScoreCard
              team={team}
              currentHole={hole}
              currentScore={undefined}
              onScoreSelect={(strokes) =>
                Alert.alert('Score Selected', `Strokes: ${strokes}`)
              }
            />
          </View>
          <View style={styles.sectionContainer}>
            <Text variant="titleMedium" style={styles.sectionTitle}>
              Birdie (3)
            </Text>
            <TeamScoreCard
              team={team}
              currentHole={hole}
              currentScore={{ strokes: 3 }}
              onScoreSelect={(strokes) =>
                Alert.alert('Score Selected', `Strokes: ${strokes}`)
              }
            />
          </View>
          <View style={styles.sectionContainer}>
            <Text variant="titleMedium" style={styles.sectionTitle}>
              Par (4)
            </Text>
            <TeamScoreCard
              team={team}
              currentHole={hole}
              currentScore={{ strokes: 4 }}
              onScoreSelect={(strokes) =>
                Alert.alert('Score Selected', `Strokes: ${strokes}`)
              }
            />
          </View>
          <View style={styles.sectionContainer}>
            <Text variant="titleMedium" style={styles.sectionTitle}>
              Double Bogey (6)
            </Text>
            <TeamScoreCard
              team={team}
              currentHole={hole}
              currentScore={{ strokes: 6 }}
              onScoreSelect={(strokes) =>
                Alert.alert('Score Selected', `Strokes: ${strokes}`)
              }
            />
          </View>
          <View style={styles.sectionContainer}>
            <Text variant="titleMedium" style={styles.sectionTitle}>
              Picked Up
            </Text>
            <TeamScoreCard
              team={team}
              currentHole={hole}
              currentScore={{ strokes: 10 }}
              onScoreSelect={(strokes) =>
                Alert.alert('Score Selected', `Strokes: ${strokes}`)
              }
            />
          </View>
        </View>
      </StoryWrapper>
    );
  },
};
