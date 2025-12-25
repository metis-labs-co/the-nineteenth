/**
 * FriendSelector Storybook Stories
 *
 * Visual documentation for the unified friend selection component:
 * - Default state
 * - With selected players
 * - Loading state
 * - Empty states
 * - With limits
 * - With current user
 * - With add friend button
 * - Various configurations
 */

import React, { useState } from 'react';
import type { Meta, StoryObj } from '@storybook/react';
import { View } from 'react-native';
import { FriendSelector } from './FriendSelector';
import type { FriendSelectorProps, SelectedPlayer } from './FriendSelector.types';
import type { Friend } from '@/types/database.types';

// ============================================================================
// TEST DATA
// ============================================================================

const createMockFriend = (overrides: Partial<Friend> = {}): Friend => ({
  id: 'friend-1',
  name: 'John Smith',
  email: 'john@example.com',
  handicap: 12,
  photo_url: 'https://i.pravatar.cc/150?u=john',
  friendship_status: 'accepted',
  push_enabled: true,
  push_competition_updates: true,
  push_friend_requests: true,
  push_scorecard_updates: true,
  ...overrides,
});

const mockFriends: Friend[] = [
  createMockFriend({ id: 'friend-1', name: 'John Smith', email: 'john.smith@example.com', handicap: 12 }),
  createMockFriend({ id: 'friend-2', name: 'Jane Doe', email: 'jane.doe@example.com', handicap: 18 }),
  createMockFriend({ id: 'friend-3', name: 'Bob Wilson', email: 'bob.wilson@example.com', handicap: 8 }),
  createMockFriend({ id: 'friend-4', name: 'Alice Brown', email: 'alice.brown@example.com', handicap: 22 }),
  createMockFriend({ id: 'friend-5', name: 'Charlie Davis', email: 'charlie.davis@example.com', handicap: 15 }),
  createMockFriend({ id: 'friend-6', name: 'Diana Evans', email: 'diana.evans@example.com', handicap: 20 }),
];

const mockFriendsWithPending: Friend[] = [
  ...mockFriends,
  createMockFriend({
    id: 'friend-pending-1',
    name: 'Pending Friend',
    email: 'pending@example.com',
    handicap: 14,
    friendship_status: 'pending',
  }),
];

const mockFriendsWithoutDetails: Friend[] = [
  createMockFriend({ id: 'friend-no-email', name: 'No Email Friend', email: null, handicap: 12 }),
  createMockFriend({ id: 'friend-no-handicap', name: 'No Handicap Friend', email: 'friend@example.com', handicap: null }),
  createMockFriend({ id: 'friend-minimal', name: 'Minimal Friend', email: null, handicap: null, photo_url: null }),
];

const mockCurrentUser = {
  id: 'current-user',
  name: 'Current User',
  photo_url: 'https://i.pravatar.cc/150?u=current',
};

// ============================================================================
// WRAPPER COMPONENT
// ============================================================================

interface InteractiveWrapperProps extends Omit<FriendSelectorProps, 'selectedPlayers' | 'onSelectionChange' | 'searchQuery' | 'onSearchQueryChange'> {
  initialSelected?: SelectedPlayer[];
}

const InteractiveWrapper = ({
  initialSelected = [],
  ...props
}: InteractiveWrapperProps) => {
  const [selectedPlayers, setSelectedPlayers] = useState<SelectedPlayer[]>(initialSelected);
  const [searchQuery, setSearchQuery] = useState('');

  return (
    <View style={{ flex: 1, backgroundColor: '#F5F5F5' }}>
      <FriendSelector
        {...props}
        selectedPlayers={selectedPlayers}
        onSelectionChange={setSelectedPlayers}
        searchQuery={searchQuery}
        onSearchQueryChange={setSearchQuery}
      />
    </View>
  );
};

// ============================================================================
// META
// ============================================================================

const meta: Meta<typeof FriendSelector> = {
  title: 'Common/FriendSelector',
  component: FriendSelector,
  parameters: {
    layout: 'fullscreen',
  },
  decorators: [
    (Story) => (
      <View style={{ flex: 1, backgroundColor: '#F5F5F5' }}>
        <Story />
      </View>
    ),
  ],
  argTypes: {
    friendsLoading: { control: 'boolean' },
    showReadyBadge: { control: 'boolean' },
    showPendingBadge: { control: 'boolean' },
    selectedTitle: { control: 'text' },
    listTitle: { control: 'text' },
    emptyMessage: { control: 'text' },
    emptySearchMessage: { control: 'text' },
    addFriendLabel: { control: 'text' },
  },
};

export default meta;
type Story = StoryObj<typeof FriendSelector>;

// ============================================================================
// BASIC STORIES
// ============================================================================

export const Default: Story = {
  render: () => (
    <InteractiveWrapper friends={mockFriends} />
  ),
};

export const WithSelectedPlayers: Story = {
  render: () => {
    const initialSelected: SelectedPlayer[] = [
      { id: 'friend-1', name: 'John Smith', email: 'john.smith@example.com', handicap: 12, photo_url: 'https://i.pravatar.cc/150?u=john' },
      { id: 'friend-2', name: 'Jane Doe', email: 'jane.doe@example.com', handicap: 18, photo_url: 'https://i.pravatar.cc/150?u=jane' },
    ];
    return (
      <InteractiveWrapper
        friends={mockFriends}
        initialSelected={initialSelected}
      />
    );
  },
};

export const MultipleSelected: Story = {
  render: () => {
    const initialSelected: SelectedPlayer[] = [
      { id: 'friend-1', name: 'John Smith', email: 'john@example.com', handicap: 12, photo_url: null },
      { id: 'friend-2', name: 'Jane Doe', email: 'jane@example.com', handicap: 18, photo_url: null },
      { id: 'friend-3', name: 'Bob Wilson', email: 'bob@example.com', handicap: 8, photo_url: null },
      { id: 'friend-4', name: 'Alice Brown', email: 'alice@example.com', handicap: 22, photo_url: null },
    ];
    return (
      <InteractiveWrapper
        friends={mockFriends}
        initialSelected={initialSelected}
      />
    );
  },
};

// ============================================================================
// LOADING STATES
// ============================================================================

export const Loading: Story = {
  render: () => (
    <InteractiveWrapper friends={[]} friendsLoading={true} />
  ),
};

// ============================================================================
// EMPTY STATES
// ============================================================================

export const EmptyNoFriends: Story = {
  render: () => (
    <InteractiveWrapper friends={[]} />
  ),
};

export const EmptyWithAddFriendButton: Story = {
  render: () => (
    <InteractiveWrapper
      friends={[]}
      onAddFriendPress={() => console.log('Add friend pressed')}
    />
  ),
};

export const EmptyWithCustomMessage: Story = {
  render: () => (
    <InteractiveWrapper
      friends={[]}
      emptyMessage="No golf buddies yet!"
    />
  ),
};

// ============================================================================
// LIMIT STORIES
// ============================================================================

export const WithLimitIndicator: Story = {
  render: () => (
    <InteractiveWrapper
      friends={mockFriends}
      limits={{ max: 4 }}
      limitIndicator={{ show: true, label: 'Players', showBar: true }}
    />
  ),
};

export const ApproachingLimit: Story = {
  render: () => {
    const initialSelected: SelectedPlayer[] = [
      { id: 'friend-1', name: 'John Smith', email: 'john@example.com', handicap: 12, photo_url: null },
      { id: 'friend-2', name: 'Jane Doe', email: 'jane@example.com', handicap: 18, photo_url: null },
      { id: 'friend-3', name: 'Bob Wilson', email: 'bob@example.com', handicap: 8, photo_url: null },
    ];
    return (
      <InteractiveWrapper
        friends={mockFriends}
        initialSelected={initialSelected}
        limits={{ max: 4 }}
        limitIndicator={{ show: true, label: 'Players', showBar: true, warningThreshold: 0.75 }}
      />
    );
  },
};

export const AtLimit: Story = {
  render: () => {
    const initialSelected: SelectedPlayer[] = [
      { id: 'friend-1', name: 'John Smith', email: 'john@example.com', handicap: 12, photo_url: null },
      { id: 'friend-2', name: 'Jane Doe', email: 'jane@example.com', handicap: 18, photo_url: null },
      { id: 'friend-3', name: 'Bob Wilson', email: 'bob@example.com', handicap: 8, photo_url: null },
      { id: 'friend-4', name: 'Alice Brown', email: 'alice@example.com', handicap: 22, photo_url: null },
    ];
    return (
      <InteractiveWrapper
        friends={mockFriends}
        initialSelected={initialSelected}
        limits={{ max: 4 }}
        limitIndicator={{ show: true, label: 'Players', showBar: true }}
      />
    );
  },
};

export const WithMinimumRequirement: Story = {
  render: () => (
    <InteractiveWrapper
      friends={mockFriends}
      limits={{ min: 2, max: 4 }}
      limitIndicator={{ show: true, label: 'Players', showBar: true }}
      showReadyBadge={true}
    />
  ),
};

export const MinimumMet: Story = {
  render: () => {
    const initialSelected: SelectedPlayer[] = [
      { id: 'friend-1', name: 'John Smith', email: 'john@example.com', handicap: 12, photo_url: null },
      { id: 'friend-2', name: 'Jane Doe', email: 'jane@example.com', handicap: 18, photo_url: null },
    ];
    return (
      <InteractiveWrapper
        friends={mockFriends}
        initialSelected={initialSelected}
        limits={{ min: 2, max: 4 }}
        limitIndicator={{ show: true, label: 'Players', showBar: true }}
        showReadyBadge={true}
      />
    );
  },
};

// ============================================================================
// CURRENT USER STORIES
// ============================================================================

export const WithCurrentUser: Story = {
  render: () => {
    const currentUserSelected: SelectedPlayer = {
      id: 'current-user',
      name: 'Current User',
      email: 'current@example.com',
      handicap: 15,
      photo_url: 'https://i.pravatar.cc/150?u=current',
    };
    return (
      <InteractiveWrapper
        friends={mockFriends}
        initialSelected={[currentUserSelected]}
        currentUser={mockCurrentUser}
        limits={{ includeCurrentUser: true, max: 4 }}
        limitIndicator={{ show: true, label: 'Players', showBar: true }}
      />
    );
  },
};

export const CurrentUserCannotBeRemoved: Story = {
  render: () => {
    const currentUserSelected: SelectedPlayer = {
      id: 'current-user',
      name: 'Current User',
      email: 'current@example.com',
      handicap: 15,
      photo_url: 'https://i.pravatar.cc/150?u=current',
    };
    const otherPlayer: SelectedPlayer = {
      id: 'friend-1',
      name: 'John Smith',
      email: 'john@example.com',
      handicap: 12,
      photo_url: null,
    };
    return (
      <InteractiveWrapper
        friends={mockFriends}
        initialSelected={[currentUserSelected, otherPlayer]}
        currentUser={mockCurrentUser}
        limits={{ includeCurrentUser: true, max: 4 }}
      />
    );
  },
};

// ============================================================================
// ADD FRIEND BUTTON STORIES
// ============================================================================

export const WithAddFriendButton: Story = {
  render: () => (
    <InteractiveWrapper
      friends={mockFriends}
      onAddFriendPress={() => console.log('Add friend button pressed!')}
    />
  ),
};

export const WithCustomAddFriendLabel: Story = {
  render: () => (
    <InteractiveWrapper
      friends={mockFriends}
      onAddFriendPress={() => console.log('Add partner pressed!')}
      addFriendLabel="Add Partner"
    />
  ),
};

// ============================================================================
// CUSTOM TITLES STORIES
// ============================================================================

export const WithCustomTitles: Story = {
  render: () => (
    <InteractiveWrapper
      friends={mockFriends}
      selectedTitle="PARTNERS"
      listTitle="Select your golf partners"
    />
  ),
};

export const WithListTitle: Story = {
  render: () => (
    <InteractiveWrapper
      friends={mockFriends}
      listTitle="Choose up to 3 friends to join your group"
      limits={{ max: 3 }}
      limitIndicator={{ show: true, label: 'Partners' }}
    />
  ),
};

// ============================================================================
// PENDING BADGE STORIES
// ============================================================================

export const WithPendingBadge: Story = {
  render: () => (
    <InteractiveWrapper
      friends={mockFriendsWithPending}
      showPendingBadge={true}
    />
  ),
};

// ============================================================================
// EDGE CASE STORIES
// ============================================================================

export const FriendsWithoutDetails: Story = {
  render: () => (
    <InteractiveWrapper
      friends={mockFriendsWithoutDetails}
    />
  ),
};

export const SingleFriend: Story = {
  render: () => (
    <InteractiveWrapper
      friends={[mockFriends[0]]}
    />
  ),
};

export const ManyFriends: Story = {
  render: () => {
    const manyFriends = Array.from({ length: 20 }, (_, i) =>
      createMockFriend({
        id: `friend-${i + 1}`,
        name: `Friend ${i + 1}`,
        email: `friend${i + 1}@example.com`,
        handicap: 5 + i,
      })
    );
    return (
      <InteractiveWrapper friends={manyFriends} />
    );
  },
};

// ============================================================================
// ROUND CREATION SCENARIO
// ============================================================================

export const RoundCreationScenario: Story = {
  render: () => {
    const currentUserSelected: SelectedPlayer = {
      id: 'current-user',
      name: 'Sam (You)',
      email: 'sam@example.com',
      handicap: 15,
      photo_url: 'https://i.pravatar.cc/150?u=sam',
    };
    return (
      <InteractiveWrapper
        friends={mockFriends}
        initialSelected={[currentUserSelected]}
        currentUser={{ id: 'current-user', name: 'Sam (You)', photo_url: 'https://i.pravatar.cc/150?u=sam' }}
        limits={{ min: 2, max: 4, includeCurrentUser: true }}
        limitIndicator={{ show: true, label: 'Partners', showBar: true }}
        showReadyBadge={true}
        selectedTitle="YOUR GROUP"
        listTitle="Add partners (2-4 players total)"
        onAddFriendPress={() => console.log('Add friend pressed')}
      />
    );
  },
};

// ============================================================================
// COMPETITION CREATION SCENARIO
// ============================================================================

export const CompetitionCreationScenario: Story = {
  render: () => (
    <InteractiveWrapper
      friends={mockFriends}
      limits={{ min: 4, max: 16 }}
      limitIndicator={{ show: true, label: 'Players', showBar: true }}
      showReadyBadge={true}
      selectedTitle="PARTICIPANTS"
      listTitle="Add at least 4 players to your competition"
      onAddFriendPress={() => console.log('Invite new player pressed')}
      addFriendLabel="Invite New Player"
    />
  ),
};

// ============================================================================
// TEAM FORMATION SCENARIO
// ============================================================================

export const TeamFormationScenario: Story = {
  render: () => {
    const initialSelected: SelectedPlayer[] = [
      { id: 'friend-1', name: 'John Smith', email: 'john@example.com', handicap: 12, photo_url: null },
    ];
    return (
      <InteractiveWrapper
        friends={mockFriends}
        initialSelected={initialSelected}
        limits={{ min: 2, max: 2 }}
        limitIndicator={{ show: true, label: 'Team members', showBar: true }}
        showReadyBadge={true}
        selectedTitle="TEAM MEMBERS"
        listTitle="Select exactly 2 players for your team"
      />
    );
  },
};

// ============================================================================
// READY BADGE SCENARIOS
// ============================================================================

export const ReadyBadgeNotShown: Story = {
  render: () => {
    const initialSelected: SelectedPlayer[] = [
      { id: 'friend-1', name: 'John Smith', email: 'john@example.com', handicap: 12, photo_url: null },
      { id: 'friend-2', name: 'Jane Doe', email: 'jane@example.com', handicap: 18, photo_url: null },
    ];
    return (
      <InteractiveWrapper
        friends={mockFriends}
        initialSelected={initialSelected}
        limits={{ min: 2, max: 4 }}
        showReadyBadge={false}
      />
    );
  },
};

export const ReadyBadgeWhenMinimumMet: Story = {
  render: () => {
    const initialSelected: SelectedPlayer[] = [
      { id: 'friend-1', name: 'John Smith', email: 'john@example.com', handicap: 12, photo_url: null },
      { id: 'friend-2', name: 'Jane Doe', email: 'jane@example.com', handicap: 18, photo_url: null },
      { id: 'friend-3', name: 'Bob Wilson', email: 'bob@example.com', handicap: 8, photo_url: null },
    ];
    return (
      <InteractiveWrapper
        friends={mockFriends}
        initialSelected={initialSelected}
        limits={{ min: 2, max: 4 }}
        showReadyBadge={true}
      />
    );
  },
};

// ============================================================================
// FULL CONFIGURATION STORY
// ============================================================================

export const FullConfiguration: Story = {
  render: () => {
    const currentUserSelected: SelectedPlayer = {
      id: 'current-user',
      name: 'Current User',
      email: 'current@example.com',
      handicap: 15,
      photo_url: 'https://i.pravatar.cc/150?u=current',
    };
    const otherSelected: SelectedPlayer = {
      id: 'friend-1',
      name: 'John Smith',
      email: 'john@example.com',
      handicap: 12,
      photo_url: 'https://i.pravatar.cc/150?u=john',
    };
    return (
      <InteractiveWrapper
        friends={mockFriendsWithPending}
        initialSelected={[currentUserSelected, otherSelected]}
        currentUser={mockCurrentUser}
        limits={{ min: 2, max: 4, includeCurrentUser: true }}
        limitIndicator={{ show: true, label: 'Players', showBar: true, warningThreshold: 0.75 }}
        showReadyBadge={true}
        showPendingBadge={true}
        selectedTitle="YOUR GROUP"
        listTitle="Select your playing partners"
        onAddFriendPress={() => console.log('Add friend pressed')}
        addFriendLabel="Add New Friend"
        emptyMessage="No friends found"
        emptySearchMessage="No matching friends"
        testID="full-config-friend-selector"
      />
    );
  },
};
