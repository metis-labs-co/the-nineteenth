/**
 * RoundListCard Stories
 *
 * Storybook stories for the RoundListCard component showing:
 * - Different round statuses (scheduled, in-progress, completed)
 * - Competition rounds vs standalone/practice rounds
 * - Different game types
 * - Various player configurations
 * - Swipe-to-delete functionality
 * - Edge cases
 */

import React from 'react';
import type { Meta, StoryObj } from '@storybook/react';
import { View, Alert, StyleSheet } from 'react-native';
import { Text } from 'react-native-paper';
import { RoundListCard, RoundListCardData } from './RoundListCard';

const meta: Meta<typeof RoundListCard> = {
  title: 'Rounds/RoundListCard',
  component: RoundListCard,
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
  argTypes: {
    onPress: { action: 'pressed' },
    onDelete: { action: 'deleted' },
  },
};

export default meta;
type Story = StoryObj<typeof RoundListCard>;

// =====================================================
// HELPER FUNCTIONS
// =====================================================

function createRoundData(overrides: Partial<RoundListCardData> = {}): RoundListCardData {
  return {
    id: 'round-1',
    course: {
      id: 'course-1',
      name: 'Royal Melbourne',
      venueName: 'Royal Melbourne Golf Club',
      city: 'Melbourne',
      state: 'VIC',
    },
    competition: {
      id: 'comp-1',
      name: 'Summer Series',
    },
    status: 'scheduled',
    date: '2025-01-15',
    teeTime: '10:30 AM',
    gameType: 'stableford',
    isStandalone: false,
    roundNumber: 1,
    totalRounds: 4,
    holesCompleted: 0,
    totalHoles: 18,
    ...overrides,
  };
}

// =====================================================
// DEFAULT / SCHEDULED ROUND STORIES
// =====================================================

export const Default: Story = {
  args: {
    round: createRoundData(),
  },
};

export const ScheduledRound: Story = {
  args: {
    round: createRoundData({
      status: 'scheduled',
      roundNumber: 2,
      totalRounds: 4,
    }),
  },
};

// =====================================================
// IN-PROGRESS ROUND STORIES
// =====================================================

export const InProgressRound: Story = {
  args: {
    round: createRoundData({
      status: 'in-progress',
      holesCompleted: 9,
      totalHoles: 18,
    }),
  },
};

export const InProgressEarlyRound: Story = {
  args: {
    round: createRoundData({
      status: 'in-progress',
      holesCompleted: 3,
      totalHoles: 18,
    }),
  },
};

export const InProgressNearlyComplete: Story = {
  args: {
    round: createRoundData({
      status: 'in-progress',
      holesCompleted: 17,
      totalHoles: 18,
    }),
  },
};

// =====================================================
// COMPLETED ROUND STORIES
// =====================================================

export const CompletedRound: Story = {
  args: {
    round: createRoundData({
      status: 'completed',
      holesCompleted: 18,
      totalHoles: 18,
    }),
  },
};

// =====================================================
// STANDALONE / PRACTICE ROUND STORIES
// =====================================================

export const StandaloneRound: Story = {
  args: {
    round: createRoundData({
      isStandalone: true,
      competition: null,
      roundNumber: 1,
      totalRounds: 1,
      players: [
        { id: 'player-1', name: 'John Smith' },
        { id: 'player-2', name: 'Jane Doe' },
      ],
    }),
  },
};

export const StandaloneWithManyPlayers: Story = {
  args: {
    round: createRoundData({
      isStandalone: true,
      competition: null,
      roundNumber: 1,
      totalRounds: 1,
      players: [
        { id: 'player-1', name: 'John Smith' },
        { id: 'player-2', name: 'Jane Doe' },
        { id: 'player-3', name: 'Bob Wilson' },
        { id: 'player-4', name: 'Alice Brown' },
      ],
    }),
  },
};

export const StandaloneWithCurrentUser: Story = {
  args: {
    round: createRoundData({
      isStandalone: true,
      competition: null,
      roundNumber: 1,
      totalRounds: 1,
      players: [
        { id: 'current-user', name: 'My Name' },
        { id: 'player-2', name: 'Jane Doe' },
        { id: 'player-3', name: 'Bob Wilson' },
      ],
    }),
    currentUserId: 'current-user',
  },
};

export const StandaloneSinglePlayer: Story = {
  args: {
    round: createRoundData({
      isStandalone: true,
      competition: null,
      roundNumber: 1,
      totalRounds: 1,
      players: [{ id: 'player-1', name: 'Solo Player' }],
    }),
  },
};

// =====================================================
// GAME TYPE STORIES
// =====================================================

export const StrokePlay: Story = {
  args: {
    round: createRoundData({
      gameType: 'stroke',
    }),
  },
};

export const MatchPlay: Story = {
  args: {
    round: createRoundData({
      gameType: 'match_play',
    }),
  },
};

export const Ambrose: Story = {
  args: {
    round: createRoundData({
      gameType: 'ambrose',
    }),
  },
};

export const BestBall: Story = {
  args: {
    round: createRoundData({
      gameType: 'fourball_bestball',
    }),
  },
};

// =====================================================
// COMPETITION CONFIGURATION STORIES
// =====================================================

export const SingleRoundCompetition: Story = {
  args: {
    round: createRoundData({
      roundNumber: 1,
      totalRounds: 1,
    }),
  },
};

export const MultiRoundCompetition: Story = {
  args: {
    round: createRoundData({
      roundNumber: 3,
      totalRounds: 6,
    }),
  },
};

export const LongCompetitionName: Story = {
  args: {
    round: createRoundData({
      competition: {
        id: 'comp-1',
        name: 'The Annual Summer Golf Championship Series Tournament 2025',
      },
    }),
  },
};

// =====================================================
// COURSE DISPLAY STORIES
// =====================================================

export const CourseWithVenueSameName: Story = {
  args: {
    round: createRoundData({
      course: {
        id: 'c1',
        name: 'Kingston Heath',
        venueName: 'Kingston Heath',
      },
    }),
  },
};

export const CourseWithDifferentVenue: Story = {
  args: {
    round: createRoundData({
      course: {
        id: 'c1',
        name: 'West Course',
        venueName: 'Sandbelt Golf Club',
      },
    }),
  },
};

export const CourseWithoutVenue: Story = {
  args: {
    round: createRoundData({
      course: {
        id: 'c1',
        name: 'Public Municipal Course',
      },
    }),
  },
};

export const LongCourseName: Story = {
  args: {
    round: createRoundData({
      course: {
        id: 'c1',
        name: 'The Very Long Named Golf Course',
        venueName: 'Prestigious Country Club Estate',
      },
    }),
  },
};

// =====================================================
// DATE/TIME STORIES
// =====================================================

export const WithoutTeeTime: Story = {
  args: {
    round: createRoundData({
      date: '2025-01-15',
      teeTime: null,
    }),
  },
};

export const WithoutDate: Story = {
  args: {
    round: createRoundData({
      date: null,
      teeTime: null,
    }),
  },
};

export const EarlyMorningTeeTime: Story = {
  args: {
    round: createRoundData({
      date: '2025-01-15',
      teeTime: '6:30 AM',
    }),
  },
};

export const AfternoonTeeTime: Story = {
  args: {
    round: createRoundData({
      date: '2025-01-15',
      teeTime: '2:00 PM',
    }),
  },
};

// =====================================================
// SWIPE TO DELETE STORIES
// =====================================================

export const SwipeEnabled: Story = {
  args: {
    round: createRoundData({
      isStandalone: true,
      competition: null,
    }),
    swipeEnabled: true,
    onDelete: (round) => Alert.alert('Delete', `Deleting round at ${round.course.name}`),
  },
};

export const SwipeEnabledInProgress: Story = {
  args: {
    round: createRoundData({
      isStandalone: true,
      competition: null,
      status: 'in-progress',
      holesCompleted: 5,
    }),
    swipeEnabled: true,
    onDelete: (round) => Alert.alert('Delete', `Deleting round at ${round.course.name}`),
  },
};

// =====================================================
// CUSTOM ACTION LABEL STORIES
// =====================================================

export const CustomActionLabel: Story = {
  args: {
    round: createRoundData({
      status: 'in-progress',
      holesCompleted: 9,
    }),
    actionLabel: 'Continue scoring',
  },
};

// =====================================================
// 9-HOLE ROUND STORIES
// =====================================================

export const NineHoleRound: Story = {
  args: {
    round: createRoundData({
      totalHoles: 9,
      holesCompleted: 0,
    }),
  },
};

export const NineHoleInProgress: Story = {
  args: {
    round: createRoundData({
      status: 'in-progress',
      totalHoles: 9,
      holesCompleted: 5,
    }),
  },
};

// =====================================================
// LIST VIEW STORIES
// =====================================================

export const ListOfRounds: Story = {
  render: () => (
    <View style={styles.listContainer}>
      <RoundListCard
        round={createRoundData({
          id: 'r1',
          status: 'completed',
          competition: { id: 'c1', name: 'Summer Series' },
          roundNumber: 1,
        })}
        onPress={() => Alert.alert('Round 1')}
      />
      <RoundListCard
        round={createRoundData({
          id: 'r2',
          status: 'in-progress',
          competition: { id: 'c1', name: 'Summer Series' },
          roundNumber: 2,
          holesCompleted: 12,
        })}
        onPress={() => Alert.alert('Round 2')}
      />
      <RoundListCard
        round={createRoundData({
          id: 'r3',
          status: 'scheduled',
          competition: { id: 'c1', name: 'Summer Series' },
          roundNumber: 3,
        })}
        onPress={() => Alert.alert('Round 3')}
      />
      <RoundListCard
        round={createRoundData({
          id: 'r4',
          status: 'scheduled',
          competition: { id: 'c1', name: 'Summer Series' },
          roundNumber: 4,
        })}
        onPress={() => Alert.alert('Round 4')}
      />
    </View>
  ),
};

export const MixedRoundsList: Story = {
  render: () => (
    <View style={styles.listContainer}>
      <Text style={styles.sectionTitle}>Competition Rounds</Text>
      <RoundListCard
        round={createRoundData({
          id: 'r1',
          status: 'in-progress',
          holesCompleted: 9,
        })}
        onPress={() => Alert.alert('Competition Round')}
      />
      <Text style={styles.sectionTitle}>Practice Rounds</Text>
      <RoundListCard
        round={createRoundData({
          id: 'r2',
          isStandalone: true,
          competition: null,
          status: 'completed',
          players: [
            { id: 'p1', name: 'John' },
            { id: 'p2', name: 'Jane' },
          ],
        })}
        onPress={() => Alert.alert('Practice Round 1')}
        swipeEnabled
        onDelete={() => Alert.alert('Delete')}
      />
      <RoundListCard
        round={createRoundData({
          id: 'r3',
          isStandalone: true,
          competition: null,
          status: 'scheduled',
          course: { id: 'c2', name: 'Local Links' },
          players: [
            { id: 'p1', name: 'John' },
            { id: 'p3', name: 'Bob' },
          ],
        })}
        onPress={() => Alert.alert('Practice Round 2')}
        swipeEnabled
        onDelete={() => Alert.alert('Delete')}
      />
    </View>
  ),
};

// =====================================================
// STYLES
// =====================================================

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 16,
    backgroundColor: '#f5f5f5',
  },
  listContainer: {
    flex: 1,
    gap: 12,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#666',
    marginTop: 8,
    marginBottom: 4,
    paddingLeft: 4,
  },
});
