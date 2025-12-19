/**
 * CompetitionListCard Stories
 *
 * Storybook stories for the CompetitionListCard component showing:
 * - Different competition statuses (draft, upcoming, active, completed, cancelled)
 * - Organizer vs Player roles
 * - Various round and player counts
 * - Date display variations
 * - Swipe-to-delete functionality
 * - Edge cases
 */

import React from 'react';
import type { Meta, StoryObj } from '@storybook/react';
import { View, Alert, StyleSheet } from 'react-native';
import { Text } from 'react-native-paper';
import { CompetitionListCard, CompetitionListCardData } from './CompetitionListCard';

const meta: Meta<typeof CompetitionListCard> = {
  title: 'Competitions/CompetitionListCard',
  component: CompetitionListCard,
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
type Story = StoryObj<typeof CompetitionListCard>;

// =====================================================
// HELPER FUNCTIONS
// =====================================================

function createCompetitionData(
  overrides: Partial<CompetitionListCardData> = {}
): CompetitionListCardData {
  return {
    id: 'comp-1',
    name: 'Summer Series 2025',
    status: 'active',
    rounds: 4,
    players: 12,
    isOrganizer: true,
    startDate: '2025-01-15',
    ...overrides,
  };
}

// =====================================================
// DEFAULT STORY
// =====================================================

export const Default: Story = {
  args: {
    competition: createCompetitionData(),
  },
};

// =====================================================
// STATUS STORIES
// =====================================================

export const DraftStatus: Story = {
  args: {
    competition: createCompetitionData({
      name: 'New Competition Draft',
      status: 'draft',
      rounds: 1,
      players: 0,
      startDate: null,
    }),
  },
};

export const UpcomingStatus: Story = {
  args: {
    competition: createCompetitionData({
      name: 'Upcoming Tournament',
      status: 'upcoming',
      rounds: 3,
      players: 8,
      startDate: '2025-02-15',
    }),
  },
};

export const ActiveStatus: Story = {
  args: {
    competition: createCompetitionData({
      name: 'Active Championship',
      status: 'active',
      rounds: 4,
      players: 16,
    }),
  },
};

export const InProgressStatus: Story = {
  args: {
    competition: createCompetitionData({
      name: 'In-Progress Series',
      status: 'in-progress',
      rounds: 6,
      players: 24,
    }),
  },
};

export const CompletedStatus: Story = {
  args: {
    competition: createCompetitionData({
      name: 'Finished Championship',
      status: 'completed',
      rounds: 4,
      players: 16,
      startDate: '2024-12-01',
    }),
  },
};

export const CancelledStatus: Story = {
  args: {
    competition: createCompetitionData({
      name: 'Cancelled Event',
      status: 'cancelled',
      rounds: 2,
      players: 6,
    }),
  },
};

// =====================================================
// ROLE STORIES
// =====================================================

export const OrganizerRole: Story = {
  args: {
    competition: createCompetitionData({
      name: 'My Competition',
      isOrganizer: true,
    }),
  },
};

export const PlayerRole: Story = {
  args: {
    competition: createCompetitionData({
      name: 'Joined Competition',
      isOrganizer: false,
    }),
  },
};

// =====================================================
// ROUND COUNT STORIES
// =====================================================

export const SingleRound: Story = {
  args: {
    competition: createCompetitionData({
      name: 'One-Off Event',
      rounds: 1,
    }),
  },
};

export const ManyRounds: Story = {
  args: {
    competition: createCompetitionData({
      name: 'Season League',
      rounds: 12,
    }),
  },
};

export const NoRounds: Story = {
  args: {
    competition: createCompetitionData({
      name: 'New Draft',
      status: 'draft',
      rounds: 0,
    }),
  },
};

// =====================================================
// PLAYER COUNT STORIES
// =====================================================

export const SinglePlayer: Story = {
  args: {
    competition: createCompetitionData({
      name: 'Solo Competition',
      players: 1,
    }),
  },
};

export const SmallGroup: Story = {
  args: {
    competition: createCompetitionData({
      name: 'Small Group Event',
      players: 4,
    }),
  },
};

export const MediumGroup: Story = {
  args: {
    competition: createCompetitionData({
      name: 'Medium Competition',
      players: 16,
    }),
  },
};

export const LargeGroup: Story = {
  args: {
    competition: createCompetitionData({
      name: 'Large Tournament',
      players: 48,
    }),
  },
};

export const NoPlayers: Story = {
  args: {
    competition: createCompetitionData({
      name: 'Empty Competition',
      status: 'draft',
      players: 0,
    }),
  },
};

// =====================================================
// DATE STORIES
// =====================================================

export const WithStartDate: Story = {
  args: {
    competition: createCompetitionData({
      name: 'Scheduled Competition',
      startDate: '2025-03-15',
    }),
  },
};

export const WithoutStartDate: Story = {
  args: {
    competition: createCompetitionData({
      name: 'TBD Competition',
      status: 'draft',
      startDate: null,
    }),
  },
};

// =====================================================
// SWIPE TO DELETE STORIES
// =====================================================

export const SwipeEnabled: Story = {
  args: {
    competition: createCompetitionData({
      name: 'Swipeable Competition',
    }),
    swipeEnabled: true,
    onDelete: (comp) => Alert.alert('Delete', `Deleting: ${comp.name}`),
  },
};

export const SwipeDisabled: Story = {
  args: {
    competition: createCompetitionData({
      name: 'Non-Swipeable Competition',
    }),
    swipeEnabled: false,
  },
};

// =====================================================
// EDGE CASE STORIES
// =====================================================

export const LongName: Story = {
  args: {
    competition: createCompetitionData({
      name: 'The Annual Summer Golf Championship Series Tournament 2025 - Extended Edition',
    }),
  },
};

export const ShortName: Story = {
  args: {
    competition: createCompetitionData({
      name: 'Cup',
    }),
  },
};

export const SpecialCharactersInName: Story = {
  args: {
    competition: createCompetitionData({
      name: "John's Golf & Social Club - 2025 (Round 1)",
    }),
  },
};

export const EmojiInName: Story = {
  args: {
    competition: createCompetitionData({
      name: '⛳ Summer Golf Series 🏆',
    }),
  },
};

// =====================================================
// COMBINED STATE STORIES
// =====================================================

export const DraftOrganizerNoPlayers: Story = {
  args: {
    competition: createCompetitionData({
      name: 'New Draft',
      status: 'draft',
      isOrganizer: true,
      rounds: 1,
      players: 0,
      startDate: null,
    }),
  },
};

export const ActivePlayerManyParticipants: Story = {
  args: {
    competition: createCompetitionData({
      name: 'Popular Tournament',
      status: 'active',
      isOrganizer: false,
      rounds: 6,
      players: 32,
      startDate: '2025-01-01',
    }),
  },
};

export const CompletedOrganizerWithDate: Story = {
  args: {
    competition: createCompetitionData({
      name: 'Past Championship',
      status: 'completed',
      isOrganizer: true,
      rounds: 4,
      players: 16,
      startDate: '2024-11-15',
    }),
  },
};

// =====================================================
// LIST VIEW STORIES
// =====================================================

export const ListOfCompetitions: Story = {
  render: () => (
    <View style={styles.listContainer}>
      <CompetitionListCard
        competition={createCompetitionData({
          id: 'c1',
          name: 'Active Series',
          status: 'active',
          isOrganizer: true,
          rounds: 4,
          players: 12,
        })}
        onPress={() => Alert.alert('Competition 1')}
      />
      <CompetitionListCard
        competition={createCompetitionData({
          id: 'c2',
          name: 'Upcoming Tournament',
          status: 'upcoming',
          isOrganizer: false,
          rounds: 2,
          players: 8,
          startDate: '2025-02-01',
        })}
        onPress={() => Alert.alert('Competition 2')}
      />
      <CompetitionListCard
        competition={createCompetitionData({
          id: 'c3',
          name: 'Completed Championship',
          status: 'completed',
          isOrganizer: true,
          rounds: 6,
          players: 24,
          startDate: '2024-12-01',
        })}
        onPress={() => Alert.alert('Competition 3')}
      />
      <CompetitionListCard
        competition={createCompetitionData({
          id: 'c4',
          name: 'Draft Competition',
          status: 'draft',
          isOrganizer: true,
          rounds: 1,
          players: 0,
          startDate: null,
        })}
        onPress={() => Alert.alert('Competition 4')}
      />
    </View>
  ),
};

export const MixedRolesList: Story = {
  render: () => (
    <View style={styles.listContainer}>
      <Text style={styles.sectionTitle}>Organizing</Text>
      <CompetitionListCard
        competition={createCompetitionData({
          id: 'c1',
          name: 'My Summer Series',
          status: 'active',
          isOrganizer: true,
          rounds: 4,
          players: 12,
        })}
        onPress={() => Alert.alert('My Competition 1')}
        swipeEnabled
        onDelete={() => Alert.alert('Delete')}
      />
      <CompetitionListCard
        competition={createCompetitionData({
          id: 'c2',
          name: 'My Winter Cup',
          status: 'upcoming',
          isOrganizer: true,
          rounds: 2,
          players: 8,
        })}
        onPress={() => Alert.alert('My Competition 2')}
        swipeEnabled
        onDelete={() => Alert.alert('Delete')}
      />
      <Text style={styles.sectionTitle}>Participating</Text>
      <CompetitionListCard
        competition={createCompetitionData({
          id: 'c3',
          name: 'Club Championship',
          status: 'active',
          isOrganizer: false,
          rounds: 3,
          players: 32,
        })}
        onPress={() => Alert.alert('Joined Competition 1')}
      />
      <CompetitionListCard
        competition={createCompetitionData({
          id: 'c4',
          name: 'Pro-Am Event',
          status: 'upcoming',
          isOrganizer: false,
          rounds: 1,
          players: 48,
        })}
        onPress={() => Alert.alert('Joined Competition 2')}
      />
    </View>
  ),
};

export const AllStatusesList: Story = {
  render: () => (
    <View style={styles.listContainer}>
      <Text style={styles.sectionTitle}>All Status Types</Text>
      <CompetitionListCard
        competition={createCompetitionData({
          id: 'c1',
          name: 'Draft Competition',
          status: 'draft',
        })}
        onPress={() => Alert.alert('Draft')}
      />
      <CompetitionListCard
        competition={createCompetitionData({
          id: 'c2',
          name: 'Upcoming Competition',
          status: 'upcoming',
        })}
        onPress={() => Alert.alert('Upcoming')}
      />
      <CompetitionListCard
        competition={createCompetitionData({
          id: 'c3',
          name: 'Active Competition',
          status: 'active',
        })}
        onPress={() => Alert.alert('Active')}
      />
      <CompetitionListCard
        competition={createCompetitionData({
          id: 'c4',
          name: 'In-Progress Competition',
          status: 'in-progress',
        })}
        onPress={() => Alert.alert('In Progress')}
      />
      <CompetitionListCard
        competition={createCompetitionData({
          id: 'c5',
          name: 'Completed Competition',
          status: 'completed',
        })}
        onPress={() => Alert.alert('Completed')}
      />
      <CompetitionListCard
        competition={createCompetitionData({
          id: 'c6',
          name: 'Cancelled Competition',
          status: 'cancelled',
        })}
        onPress={() => Alert.alert('Cancelled')}
      />
    </View>
  ),
};

export const SwipeableList: Story = {
  render: () => (
    <View style={styles.listContainer}>
      <Text style={styles.sectionTitle}>Swipe left to delete</Text>
      <CompetitionListCard
        competition={createCompetitionData({
          id: 'c1',
          name: 'Swipeable Draft',
          status: 'draft',
        })}
        onPress={() => Alert.alert('Pressed')}
        swipeEnabled
        onDelete={(comp) => Alert.alert('Delete', `Deleting: ${comp.name}`)}
      />
      <CompetitionListCard
        competition={createCompetitionData({
          id: 'c2',
          name: 'Swipeable Active',
          status: 'active',
        })}
        onPress={() => Alert.alert('Pressed')}
        swipeEnabled
        onDelete={(comp) => Alert.alert('Delete', `Deleting: ${comp.name}`)}
      />
      <CompetitionListCard
        competition={createCompetitionData({
          id: 'c3',
          name: 'Swipeable Completed',
          status: 'completed',
        })}
        onPress={() => Alert.alert('Pressed')}
        swipeEnabled
        onDelete={(comp) => Alert.alert('Delete', `Deleting: ${comp.name}`)}
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
