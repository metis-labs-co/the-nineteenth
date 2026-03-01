/**
 * FriendListItem Stories
 *
 * Storybook stories for the friend card with selection capability.
 * Shows different states: selected, unselected, disabled, pending, with/without email/handicap.
 */

import React from 'react';
import type { Meta, StoryObj } from '@storybook/react';
import { View, StyleSheet } from 'react-native';
import { FriendListItem } from './FriendListItem';
import type { Friend } from '@/types/database.types';

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

const createMockFriend = (overrides: Partial<Friend> = {}): Friend => ({
  id: 'friend-1',
  name: 'John Smith',
  email: 'john.smith@example.com',
  phone: null,
  handicap: 12,
  golf_id: null,
  handicap_updated_at: null,
  photo_url: 'https://i.pravatar.cc/150?u=john',
  gender: null,
  handicap_index: null,
  handicap_index_updated_at: null,
  home_club_id: null,
  push_enabled: true,
  push_competition_updates: true,
  push_friend_requests: true,
  push_scorecard_updates: true,
  push_league_updates: true,
  equipped_badge_id: null,
  equipped_frame_id: null,
  equipped_title_id: null,
  is_placeholder: false,
  created_by: null,
  linked_player_id: null,
  created_at: '2024-01-01T00:00:00Z',
  updated_at: '2024-01-01T00:00:00Z',
  friendship_id: 'friendship-1',
  friendship_status: 'accepted',
  is_requester: false,
  ...overrides,
});

// Decorator to wrap stories in a container
const ContainerDecorator = (Story: React.ComponentType) => (
  <View style={styles.container}>
    <Story />
  </View>
);

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#FFFFFF',
    flex: 1,
  },
});

// ============================================================================
// META
// ============================================================================

const meta: Meta<typeof FriendListItem> = {
  title: 'Common/FriendSelector/FriendListItem',
  component: FriendListItem,
  decorators: [ContainerDecorator],
  parameters: {
    layout: 'fullscreen',
  },
  argTypes: {
    friend: { control: 'object' },
    isSelected: { control: 'boolean' },
    isDisabled: { control: 'boolean' },
    showDivider: { control: 'boolean' },
    showPendingBadge: { control: 'boolean' },
    onToggle: { action: 'toggled' },
  },
};

export default meta;
type Story = StoryObj<typeof FriendListItem>;

// ============================================================================
// BASIC STORIES
// ============================================================================

export const Default: Story = {
  args: {
    friend: createMockFriend(),
    isSelected: false,
    isDisabled: false,
    showDivider: false,
    showPendingBadge: false,
    onToggle: () => {},
  },
};

export const Selected: Story = {
  args: {
    ...Default.args,
    isSelected: true,
  },
};

export const Disabled: Story = {
  args: {
    ...Default.args,
    isDisabled: true,
  },
};

export const SelectedAndDisabled: Story = {
  args: {
    ...Default.args,
    isSelected: true,
    isDisabled: true,
  },
};

// ============================================================================
// DIVIDER STORIES
// ============================================================================

export const WithDivider: Story = {
  args: {
    ...Default.args,
    showDivider: true,
  },
};

export const SelectedWithDivider: Story = {
  args: {
    ...Default.args,
    isSelected: true,
    showDivider: true,
  },
};

// ============================================================================
// PENDING BADGE STORIES
// ============================================================================

export const PendingFriend: Story = {
  args: {
    ...Default.args,
    friend: createMockFriend({
      friendship_status: 'pending',
      name: 'Pending Request',
    }),
    showPendingBadge: true,
  },
};

export const PendingFriendSelected: Story = {
  args: {
    ...Default.args,
    friend: createMockFriend({
      friendship_status: 'pending',
      name: 'Pending Request',
    }),
    isSelected: true,
    showPendingBadge: true,
  },
};

export const AcceptedFriendWithBadgeFlag: Story = {
  args: {
    ...Default.args,
    friend: createMockFriend({
      friendship_status: 'accepted',
    }),
    showPendingBadge: true, // Should not show badge for accepted friends
  },
};

// ============================================================================
// HANDICAP VARIATION STORIES
// ============================================================================

export const NoHandicap: Story = {
  args: {
    ...Default.args,
    friend: createMockFriend({
      name: 'Player Without Handicap',
      handicap: null as any,
    }),
  },
};

export const ZeroHandicap: Story = {
  args: {
    ...Default.args,
    friend: createMockFriend({
      name: 'Scratch Golfer',
      handicap: 0,
    }),
  },
};

export const NegativeHandicap: Story = {
  args: {
    ...Default.args,
    friend: createMockFriend({
      name: 'Plus Handicapper',
      handicap: -2,
    }),
  },
};

export const HighHandicap: Story = {
  args: {
    ...Default.args,
    friend: createMockFriend({
      name: 'Beginner Golfer',
      handicap: 54,
    }),
  },
};

export const DecimalHandicap: Story = {
  args: {
    ...Default.args,
    friend: createMockFriend({
      name: 'Precise Player',
      handicap: 12.5,
    }),
  },
};

// ============================================================================
// EMAIL VARIATION STORIES
// ============================================================================

export const NoEmail: Story = {
  args: {
    ...Default.args,
    friend: createMockFriend({
      name: 'Player Without Email',
      email: null as any,
    }),
  },
};

export const LongEmail: Story = {
  args: {
    ...Default.args,
    friend: createMockFriend({
      name: 'Long Email Player',
      email: 'a.very.long.email.address@some-long-domain-name.example.com',
    }),
  },
};

// ============================================================================
// PHOTO VARIATION STORIES
// ============================================================================

export const NoPhoto: Story = {
  args: {
    ...Default.args,
    friend: createMockFriend({
      name: 'Player Without Photo',
      photo_url: null,
    }),
  },
};

export const WithPhoto: Story = {
  args: {
    ...Default.args,
    friend: createMockFriend({
      name: 'Player With Photo',
      photo_url: 'https://i.pravatar.cc/150?u=unique',
    }),
  },
};

// ============================================================================
// NAME VARIATION STORIES
// ============================================================================

export const LongName: Story = {
  args: {
    ...Default.args,
    friend: createMockFriend({
      name: 'A Very Long Name That Should Be Truncated In The UI',
    }),
  },
};

export const ShortName: Story = {
  args: {
    ...Default.args,
    friend: createMockFriend({
      name: 'Jo',
    }),
  },
};

export const SpecialCharactersName: Story = {
  args: {
    ...Default.args,
    friend: createMockFriend({
      name: "O'Brien-McDonald Jr.",
    }),
  },
};

// ============================================================================
// MINIMAL DATA STORIES
// ============================================================================

export const MinimalData: Story = {
  args: {
    ...Default.args,
    friend: createMockFriend({
      name: 'Minimal Player',
      email: null as any,
      handicap: null as any,
      photo_url: null,
    }),
  },
};

export const MinimalDataSelected: Story = {
  args: {
    ...Default.args,
    friend: createMockFriend({
      name: 'Minimal Player',
      email: null as any,
      handicap: null as any,
      photo_url: null,
    }),
    isSelected: true,
  },
};

// ============================================================================
// COMPLETE DATA STORIES
// ============================================================================

export const CompleteData: Story = {
  args: {
    ...Default.args,
    friend: createMockFriend({
      id: 'friend-complete',
      name: 'Complete Player',
      email: 'complete@example.com',
      handicap: 15.3,
      photo_url: 'https://i.pravatar.cc/150?u=complete',
      phone: '+61 400 000 000',
      golf_id: '1234567890',
    }),
  },
};

// ============================================================================
// LIST SIMULATION STORIES
// ============================================================================

export const ListOfFriends: Story = {
  render: () => (
    <View>
      <FriendListItem
        friend={createMockFriend({ id: '1', name: 'Alice Anderson' })}
        isSelected={true}
        onToggle={() => {}}
        showDivider={true}
      />
      <FriendListItem
        friend={createMockFriend({ id: '2', name: 'Bob Brown', handicap: 8 })}
        isSelected={false}
        onToggle={() => {}}
        showDivider={true}
      />
      <FriendListItem
        friend={createMockFriend({ id: '3', name: 'Charlie Chen', handicap: 20 })}
        isSelected={false}
        isDisabled={true}
        onToggle={() => {}}
        showDivider={true}
      />
      <FriendListItem
        friend={createMockFriend({
          id: '4',
          name: 'Diana Davis',
          friendship_status: 'pending',
        })}
        isSelected={false}
        showPendingBadge={true}
        onToggle={() => {}}
        showDivider={false}
      />
    </View>
  ),
};

export const MixedSelectionList: Story = {
  render: () => (
    <View>
      <FriendListItem
        friend={createMockFriend({
          id: '1',
          name: 'Selected Player',
          handicap: 10,
        })}
        isSelected={true}
        onToggle={() => {}}
        showDivider={true}
      />
      <FriendListItem
        friend={createMockFriend({
          id: '2',
          name: 'Unselected Player',
          handicap: 15,
        })}
        isSelected={false}
        onToggle={() => {}}
        showDivider={true}
      />
      <FriendListItem
        friend={createMockFriend({
          id: '3',
          name: 'Another Selected',
          handicap: 5,
        })}
        isSelected={true}
        onToggle={() => {}}
        showDivider={false}
      />
    </View>
  ),
};

export const AllDisabledList: Story = {
  render: () => (
    <View>
      <FriendListItem
        friend={createMockFriend({ id: '1', name: 'Disabled Player 1' })}
        isSelected={false}
        isDisabled={true}
        onToggle={() => {}}
        showDivider={true}
      />
      <FriendListItem
        friend={createMockFriend({ id: '2', name: 'Disabled Player 2' })}
        isSelected={false}
        isDisabled={true}
        onToggle={() => {}}
        showDivider={true}
      />
      <FriendListItem
        friend={createMockFriend({ id: '3', name: 'Selected But Disabled' })}
        isSelected={true}
        isDisabled={true}
        onToggle={() => {}}
        showDivider={false}
      />
    </View>
  ),
};

// ============================================================================
// INTERACTIVE STORIES
// ============================================================================

export const Interactive: Story = {
  args: {
    ...Default.args,
  },
  parameters: {
    docs: {
      description: {
        story: 'Interactive story - click to toggle selection state',
      },
    },
  },
};

export const InteractiveSelected: Story = {
  args: {
    ...Default.args,
    isSelected: true,
  },
  parameters: {
    docs: {
      description: {
        story: 'Interactive story - starts selected, click to deselect',
      },
    },
  },
};
