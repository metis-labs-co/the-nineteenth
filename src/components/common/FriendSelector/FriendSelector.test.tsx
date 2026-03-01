/**
 * FriendSelector Component Tests
 *
 * Tests for the unified friend selection component used across round and competition creation:
 * - Rendering (selected players, friends list, empty states)
 * - Search functionality
 * - Selection/deselection of friends
 * - Limit enforcement
 * - Current user handling
 * - Ready badge display
 * - Add friend button
 */

import React from 'react';
import {
  render,
  screen,
  fireEvent,
} from '@/__tests__/utils/renderHelpers';
import { FriendSelector } from './FriendSelector';
import type { FriendSelectorProps, SelectedPlayer } from './FriendSelector.types';
import type { Friend } from '@/types/database.types';

// ============================================================================
// MOCKS
// ============================================================================

// Mock Tabler icons
jest.mock('@tabler/icons-react-native', () => {
  const { View } = require('react-native');
  return {
    IconUsers: (props: any) => <View testID="icon-users" {...props} />,
    IconUserPlus: (props: any) => <View testID="icon-user-plus" {...props} />,
  };
});

// Mock useThemeColors
jest.mock('@/context/ThemeContext', () => ({
  useThemeColors: () => ({
    primary: '#1B5E20',
    primaryLight: '#4CAF50',
    primaryLighter: '#E8F5E9',
    primaryDark: '#0D3B0F',
    surface: '#FFFFFF',
    background: '#F5F5F5',
    textPrimary: '#212121',
    textSecondary: '#757575',
    textDisabled: '#9E9E9E',
    white: '#FFFFFF',
    gray100: '#F5F5F5',
    gray200: '#EEEEEE',
    gray300: '#E0E0E0',
    gray400: '#BDBDBD',
    warning: '#FF9800',
    warningLight: '#FFF3E0',
    success: '#4CAF50',
    successLight: '#E8F5E9',
    error: '#F44336',
    errorLight: '#FFEBEE',
  }),
}));

// Mock child components
jest.mock('./SelectedPlayerChip', () => {
  const { View, Text, TouchableOpacity } = require('react-native');
  return {
    SelectedPlayerChip: ({
      player,
      onRemove,
      isCurrentUser,
    }: {
      player: { id: string; name: string };
      onRemove?: () => void;
      isCurrentUser?: boolean;
    }) => (
      <View testID={`selected-chip-${player.id}`}>
        <Text testID={`selected-name-${player.id}`}>{player.name}</Text>
        {isCurrentUser && <Text testID="current-user-indicator">(You)</Text>}
        {!isCurrentUser && onRemove && (
          <TouchableOpacity
            testID={`remove-chip-${player.id}`}
            onPress={onRemove}
            accessibilityLabel={`Remove ${player.name}`}
          />
        )}
      </View>
    ),
  };
});

jest.mock('./FriendListItem', () => {
  const { View, Text, TouchableOpacity } = require('react-native');
  return {
    FriendListItem: ({
      friend,
      isSelected,
      isDisabled,
      onToggle,
      showDivider,
      showPendingBadge: _showPendingBadge,
    }: {
      friend: { id: string; name: string; email?: string | null };
      isSelected: boolean;
      isDisabled?: boolean;
      onToggle: () => void;
      showDivider?: boolean;
      showPendingBadge?: boolean;
    }) => (
      <TouchableOpacity
        testID={`friend-item-${friend.id}`}
        onPress={onToggle}
        disabled={isDisabled}
        accessibilityRole="checkbox"
        accessibilityState={{ checked: isSelected, disabled: isDisabled }}
      >
        <Text testID={`friend-name-${friend.id}`}>{friend.name}</Text>
        {isSelected && <Text testID={`friend-selected-${friend.id}`}>Selected</Text>}
        {isDisabled && <Text testID={`friend-disabled-${friend.id}`}>Disabled</Text>}
        {showDivider && <View testID={`friend-divider-${friend.id}`} />}
      </TouchableOpacity>
    ),
  };
});

jest.mock('@/components/common/SearchBar', () => {
  const { TextInput } = require('react-native');
  return {
    SearchBar: ({
      value,
      onChangeText,
      placeholder,
      accessibilityLabel,
    }: {
      value: string;
      onChangeText: (text: string) => void;
      placeholder?: string;
      accessibilityLabel?: string;
    }) => (
      <TextInput
        testID="search-bar"
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        accessibilityLabel={accessibilityLabel}
      />
    ),
  };
});

jest.mock('@/components/common/LoadingSpinner', () => {
  const { View, Text } = require('react-native');
  return {
    LoadingSpinner: ({ size }: { size?: string }) => (
      <View testID={`loading-spinner-${size || 'default'}`}>
        <Text>Loading...</Text>
      </View>
    ),
  };
});

jest.mock('@/components/subscription/LimitIndicator', () => {
  const { View, Text } = require('react-native');
  return {
    LimitIndicator: ({
      current,
      max,
      label,
      showBar,
    }: {
      current: number;
      max: number;
      label: string;
      showBar?: boolean;
    }) => (
      <View testID="limit-indicator">
        <Text testID="limit-indicator-text">
          {label}: {current}/{max}
        </Text>
        {showBar && <View testID="limit-indicator-bar" />}
      </View>
    ),
  };
});

// ============================================================================
// TEST DATA
// ============================================================================

const createMockFriend = (overrides: Partial<Friend> = {}): Friend => ({
  id: 'friend-1',
  name: 'John Smith',
  email: 'john@example.com',
  phone: null,
  handicap: 12,
  golf_id: null,
  handicap_updated_at: null,
  photo_url: 'https://example.com/john.jpg',
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
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString(),
  friendship_id: 'friendship-1',
  friendship_status: 'accepted',
  is_requester: true,
  ...overrides,
});

const mockFriends: Friend[] = [
  createMockFriend({ id: 'friend-1', name: 'John Smith', email: 'john@example.com', handicap: 12 }),
  createMockFriend({ id: 'friend-2', name: 'Jane Doe', email: 'jane@example.com', handicap: 18 }),
  createMockFriend({ id: 'friend-3', name: 'Bob Wilson', email: 'bob@example.com', handicap: 8 }),
  createMockFriend({ id: 'friend-4', name: 'Alice Brown', email: 'alice@example.com', handicap: 22 }),
];

const mockSelectedPlayer: SelectedPlayer = {
  id: 'friend-1',
  name: 'John Smith',
  email: 'john@example.com',
  handicap: 12,
  photo_url: 'https://example.com/john.jpg',
};

const mockCurrentUser = {
  id: 'current-user',
  name: 'Current User',
  photo_url: null,
};

const defaultProps: FriendSelectorProps = {
  selectedPlayers: [],
  onSelectionChange: jest.fn(),
  friends: mockFriends,
  friendsLoading: false,
  searchQuery: '',
  onSearchQueryChange: jest.fn(),
  testID: 'friend-selector',
};

// ============================================================================
// TESTS
// ============================================================================

describe('FriendSelector', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  // --------------------------------------------------------------------------
  // Rendering Tests
  // --------------------------------------------------------------------------
  describe('Rendering', () => {
    it('renders without crashing', () => {
      render(<FriendSelector {...defaultProps} />);
      expect(screen.getByTestId('friend-selector')).toBeTruthy();
    });

    it('renders search bar', () => {
      render(<FriendSelector {...defaultProps} />);
      expect(screen.getByTestId('search-bar')).toBeTruthy();
    });

    it('renders empty selection message when no players selected', () => {
      render(<FriendSelector {...defaultProps} />);
      expect(screen.getByText('No players selected yet')).toBeTruthy();
    });

    it('renders selected players chips', () => {
      render(
        <FriendSelector
          {...defaultProps}
          selectedPlayers={[mockSelectedPlayer]}
        />
      );
      expect(screen.getByTestId('selected-chip-friend-1')).toBeTruthy();
      expect(screen.getByTestId('selected-name-friend-1').children[0]).toBe('John Smith');
    });

    it('renders multiple selected players', () => {
      const selectedPlayers: SelectedPlayer[] = [
        mockSelectedPlayer,
        { id: 'friend-2', name: 'Jane Doe', email: 'jane@example.com', handicap: 18, photo_url: null },
      ];
      render(<FriendSelector {...defaultProps} selectedPlayers={selectedPlayers} />);
      expect(screen.getByTestId('selected-chip-friend-1')).toBeTruthy();
      expect(screen.getByTestId('selected-chip-friend-2')).toBeTruthy();
    });

    it('renders friends list', () => {
      render(<FriendSelector {...defaultProps} />);
      mockFriends.forEach((friend) => {
        expect(screen.getByTestId(`friend-item-${friend.id}`)).toBeTruthy();
      });
    });

    it('renders custom selected title', () => {
      render(<FriendSelector {...defaultProps} selectedTitle="PARTNERS" />);
      expect(screen.getByText('PARTNERS')).toBeTruthy();
    });

    it('renders list title when provided', () => {
      render(<FriendSelector {...defaultProps} listTitle="Select friends to add" />);
      expect(screen.getByText('Select friends to add')).toBeTruthy();
    });
  });

  // --------------------------------------------------------------------------
  // Loading State Tests
  // --------------------------------------------------------------------------
  describe('Loading State', () => {
    it('shows loading spinner when friends are loading', () => {
      render(<FriendSelector {...defaultProps} friendsLoading={true} />);
      expect(screen.getByTestId('loading-spinner-lg')).toBeTruthy();
    });

    it('does not show friends list when loading', () => {
      render(<FriendSelector {...defaultProps} friendsLoading={true} />);
      expect(screen.queryByTestId('friend-item-friend-1')).toBeNull();
    });
  });

  // --------------------------------------------------------------------------
  // Empty States Tests
  // --------------------------------------------------------------------------
  describe('Empty States', () => {
    it('shows empty message when no friends', () => {
      render(<FriendSelector {...defaultProps} friends={[]} />);
      expect(screen.getByText('No friends yet')).toBeTruthy();
    });

    it('shows custom empty message', () => {
      render(
        <FriendSelector
          {...defaultProps}
          friends={[]}
          emptyMessage="You have no golf buddies"
        />
      );
      expect(screen.getByText('You have no golf buddies')).toBeTruthy();
    });

    it('shows empty search message when search has no results', () => {
      render(
        <FriendSelector
          {...defaultProps}
          friends={[]}
          searchQuery="xyz"
        />
      );
      expect(screen.getByText('No friends found')).toBeTruthy();
    });

    it('shows custom empty search message', () => {
      render(
        <FriendSelector
          {...defaultProps}
          friends={[]}
          searchQuery="xyz"
          emptySearchMessage="No matches for your search"
        />
      );
      expect(screen.getByText('No matches for your search')).toBeTruthy();
    });

    it('shows search query in empty state message', () => {
      render(
        <FriendSelector
          {...defaultProps}
          friends={[]}
          searchQuery="xyz"
        />
      );
      expect(screen.getByText('No friends match "xyz"')).toBeTruthy();
    });

    it('shows add friend prompt in empty state when handler provided', () => {
      const onAddFriendPress = jest.fn();
      render(
        <FriendSelector
          {...defaultProps}
          friends={[]}
          onAddFriendPress={onAddFriendPress}
        />
      );
      expect(screen.getByText('Tap the + button above to add friends')).toBeTruthy();
    });

    it('shows default add friend text when no handler', () => {
      render(<FriendSelector {...defaultProps} friends={[]} />);
      expect(screen.getByText('Add friends from the Friends tab')).toBeTruthy();
    });
  });

  // --------------------------------------------------------------------------
  // Search Functionality Tests
  // --------------------------------------------------------------------------
  describe('Search Functionality', () => {
    it('filters friends by name', () => {
      render(<FriendSelector {...defaultProps} searchQuery="john" />);
      expect(screen.getByTestId('friend-item-friend-1')).toBeTruthy();
      expect(screen.queryByTestId('friend-item-friend-2')).toBeNull();
      expect(screen.queryByTestId('friend-item-friend-3')).toBeNull();
    });

    it('filters friends by email', () => {
      render(<FriendSelector {...defaultProps} searchQuery="jane@" />);
      expect(screen.getByTestId('friend-item-friend-2')).toBeTruthy();
      expect(screen.queryByTestId('friend-item-friend-1')).toBeNull();
    });

    it('search is case insensitive', () => {
      render(<FriendSelector {...defaultProps} searchQuery="JOHN" />);
      expect(screen.getByTestId('friend-item-friend-1')).toBeTruthy();
    });

    it('calls onSearchQueryChange when search input changes', () => {
      const onSearchQueryChange = jest.fn();
      render(
        <FriendSelector {...defaultProps} onSearchQueryChange={onSearchQueryChange} />
      );
      fireEvent.changeText(screen.getByTestId('search-bar'), 'new search');
      expect(onSearchQueryChange).toHaveBeenCalledWith('new search');
    });

    it('shows all friends when search query is empty', () => {
      render(<FriendSelector {...defaultProps} searchQuery="" />);
      mockFriends.forEach((friend) => {
        expect(screen.getByTestId(`friend-item-${friend.id}`)).toBeTruthy();
      });
    });

    it('shows all friends when search query is whitespace only', () => {
      render(<FriendSelector {...defaultProps} searchQuery="   " />);
      mockFriends.forEach((friend) => {
        expect(screen.getByTestId(`friend-item-${friend.id}`)).toBeTruthy();
      });
    });
  });

  // --------------------------------------------------------------------------
  // Selection/Deselection Tests
  // --------------------------------------------------------------------------
  describe('Selection/Deselection', () => {
    it('calls onSelectionChange when friend is selected', () => {
      const onSelectionChange = jest.fn();
      render(
        <FriendSelector {...defaultProps} onSelectionChange={onSelectionChange} />
      );
      fireEvent.press(screen.getByTestId('friend-item-friend-1'));
      expect(onSelectionChange).toHaveBeenCalledWith([
        expect.objectContaining({ id: 'friend-1', name: 'John Smith' }),
      ]);
    });

    it('calls onSelectionChange when friend is deselected', () => {
      const onSelectionChange = jest.fn();
      render(
        <FriendSelector
          {...defaultProps}
          selectedPlayers={[mockSelectedPlayer]}
          onSelectionChange={onSelectionChange}
        />
      );
      fireEvent.press(screen.getByTestId('friend-item-friend-1'));
      expect(onSelectionChange).toHaveBeenCalledWith([]);
    });

    it('marks selected friends in the list', () => {
      render(
        <FriendSelector {...defaultProps} selectedPlayers={[mockSelectedPlayer]} />
      );
      expect(screen.getByTestId('friend-selected-friend-1')).toBeTruthy();
      expect(screen.queryByTestId('friend-selected-friend-2')).toBeNull();
    });

    it('handles chip removal via onRemove', () => {
      const onSelectionChange = jest.fn();
      render(
        <FriendSelector
          {...defaultProps}
          selectedPlayers={[mockSelectedPlayer]}
          onSelectionChange={onSelectionChange}
        />
      );
      fireEvent.press(screen.getByTestId('remove-chip-friend-1'));
      expect(onSelectionChange).toHaveBeenCalledWith([]);
    });

    it('adds multiple players correctly', () => {
      const onSelectionChange = jest.fn();
      render(
        <FriendSelector
          {...defaultProps}
          selectedPlayers={[mockSelectedPlayer]}
          onSelectionChange={onSelectionChange}
        />
      );
      fireEvent.press(screen.getByTestId('friend-item-friend-2'));
      expect(onSelectionChange).toHaveBeenCalledWith([
        mockSelectedPlayer,
        expect.objectContaining({ id: 'friend-2', name: 'Jane Doe' }),
      ]);
    });
  });

  // --------------------------------------------------------------------------
  // Limit Enforcement Tests
  // --------------------------------------------------------------------------
  describe('Limit Enforcement', () => {
    it('shows limit indicator when configured', () => {
      render(
        <FriendSelector
          {...defaultProps}
          limits={{ max: 4 }}
          limitIndicator={{ show: true, label: 'Players' }}
        />
      );
      expect(screen.getByTestId('limit-indicator')).toBeTruthy();
      expect(screen.getByText('Players: 0/4')).toBeTruthy();
    });

    it('shows correct count in limit indicator', () => {
      render(
        <FriendSelector
          {...defaultProps}
          selectedPlayers={[mockSelectedPlayer]}
          limits={{ max: 4 }}
          limitIndicator={{ show: true, label: 'Players' }}
        />
      );
      expect(screen.getByText('Players: 1/4')).toBeTruthy();
    });

    it('shows limit indicator bar when configured', () => {
      render(
        <FriendSelector
          {...defaultProps}
          limits={{ max: 4 }}
          limitIndicator={{ show: true, label: 'Players', showBar: true }}
        />
      );
      expect(screen.getByTestId('limit-indicator-bar')).toBeTruthy();
    });

    it('does not show limit indicator when not configured', () => {
      render(<FriendSelector {...defaultProps} />);
      expect(screen.queryByTestId('limit-indicator')).toBeNull();
    });

    it('disables unselected friends when at limit', () => {
      const selectedPlayers: SelectedPlayer[] = [
        { id: 'friend-1', name: 'John Smith', email: 'john@example.com', handicap: 12, photo_url: null },
        { id: 'friend-2', name: 'Jane Doe', email: 'jane@example.com', handicap: 18, photo_url: null },
      ];
      render(
        <FriendSelector
          {...defaultProps}
          selectedPlayers={selectedPlayers}
          limits={{ max: 2 }}
        />
      );
      expect(screen.getByTestId('friend-disabled-friend-3')).toBeTruthy();
      expect(screen.getByTestId('friend-disabled-friend-4')).toBeTruthy();
    });

    it('does not disable selected friends when at limit', () => {
      const selectedPlayers: SelectedPlayer[] = [
        { id: 'friend-1', name: 'John Smith', email: 'john@example.com', handicap: 12, photo_url: null },
        { id: 'friend-2', name: 'Jane Doe', email: 'jane@example.com', handicap: 18, photo_url: null },
      ];
      render(
        <FriendSelector
          {...defaultProps}
          selectedPlayers={selectedPlayers}
          limits={{ max: 2 }}
        />
      );
      expect(screen.queryByTestId('friend-disabled-friend-1')).toBeNull();
      expect(screen.queryByTestId('friend-disabled-friend-2')).toBeNull();
    });

    it('prevents adding new friend when at limit', () => {
      const onSelectionChange = jest.fn();
      const selectedPlayers: SelectedPlayer[] = [
        { id: 'friend-1', name: 'John Smith', email: 'john@example.com', handicap: 12, photo_url: null },
        { id: 'friend-2', name: 'Jane Doe', email: 'jane@example.com', handicap: 18, photo_url: null },
      ];
      render(
        <FriendSelector
          {...defaultProps}
          selectedPlayers={selectedPlayers}
          onSelectionChange={onSelectionChange}
          limits={{ max: 2 }}
        />
      );
      fireEvent.press(screen.getByTestId('friend-item-friend-3'));
      expect(onSelectionChange).not.toHaveBeenCalled();
    });

    it('shows approaching limit warning', () => {
      const selectedPlayers: SelectedPlayer[] = [
        { id: 'friend-1', name: 'John Smith', email: 'john@example.com', handicap: 12, photo_url: null },
        { id: 'friend-2', name: 'Jane Doe', email: 'jane@example.com', handicap: 18, photo_url: null },
        { id: 'friend-3', name: 'Bob Wilson', email: 'bob@example.com', handicap: 8, photo_url: null },
      ];
      render(
        <FriendSelector
          {...defaultProps}
          selectedPlayers={selectedPlayers}
          limits={{ max: 4 }}
          limitIndicator={{ show: true, label: 'Players', warningThreshold: 0.75 }}
        />
      );
      expect(screen.getByText('Approaching limit (3/4)')).toBeTruthy();
    });

    it('shows at limit warning', () => {
      const selectedPlayers: SelectedPlayer[] = [
        { id: 'friend-1', name: 'John Smith', email: 'john@example.com', handicap: 12, photo_url: null },
        { id: 'friend-2', name: 'Jane Doe', email: 'jane@example.com', handicap: 18, photo_url: null },
      ];
      render(
        <FriendSelector
          {...defaultProps}
          selectedPlayers={selectedPlayers}
          limits={{ max: 2 }}
        />
      );
      expect(screen.getByText('Limit reached. Upgrade to add more.')).toBeTruthy();
    });

    it('does not show limit warnings when no limit set', () => {
      const selectedPlayers: SelectedPlayer[] = [
        { id: 'friend-1', name: 'John Smith', email: 'john@example.com', handicap: 12, photo_url: null },
        { id: 'friend-2', name: 'Jane Doe', email: 'jane@example.com', handicap: 18, photo_url: null },
      ];
      render(
        <FriendSelector {...defaultProps} selectedPlayers={selectedPlayers} />
      );
      expect(screen.queryByText(/Limit reached/)).toBeNull();
      expect(screen.queryByText(/Approaching limit/)).toBeNull();
    });
  });

  // --------------------------------------------------------------------------
  // Current User Handling Tests
  // --------------------------------------------------------------------------
  describe('Current User Handling', () => {
    it('marks current user chip correctly', () => {
      const currentUserSelected: SelectedPlayer = {
        id: 'current-user',
        name: 'Current User',
        email: 'current@example.com',
        handicap: 15,
        photo_url: null,
      };
      render(
        <FriendSelector
          {...defaultProps}
          selectedPlayers={[currentUserSelected]}
          currentUser={mockCurrentUser}
        />
      );
      expect(screen.getByTestId('current-user-indicator')).toBeTruthy();
    });

    it('does not show remove button for current user when includeCurrentUser is set', () => {
      const currentUserSelected: SelectedPlayer = {
        id: 'current-user',
        name: 'Current User',
        email: 'current@example.com',
        handicap: 15,
        photo_url: null,
      };
      render(
        <FriendSelector
          {...defaultProps}
          selectedPlayers={[currentUserSelected]}
          currentUser={mockCurrentUser}
          limits={{ includeCurrentUser: true }}
        />
      );
      expect(screen.queryByTestId('remove-chip-current-user')).toBeNull();
    });

    it('prevents removing current user when includeCurrentUser is set', () => {
      const onSelectionChange = jest.fn();
      const currentUserAsFriend: Friend = createMockFriend({
        id: 'current-user',
        name: 'Current User',
        email: 'current@example.com',
        handicap: 15,
        photo_url: null,
      });
      const currentUserSelected: SelectedPlayer = {
        id: 'current-user',
        name: 'Current User',
        email: 'current@example.com',
        handicap: 15,
        photo_url: null,
      };
      render(
        <FriendSelector
          {...defaultProps}
          friends={[...mockFriends, currentUserAsFriend]}
          selectedPlayers={[currentUserSelected]}
          onSelectionChange={onSelectionChange}
          currentUser={mockCurrentUser}
          limits={{ includeCurrentUser: true }}
        />
      );
      fireEvent.press(screen.getByTestId('friend-item-current-user'));
      expect(onSelectionChange).not.toHaveBeenCalled();
    });

    it('allows removing current user when includeCurrentUser is not set', () => {
      const onSelectionChange = jest.fn();
      const currentUserAsFriend: Friend = createMockFriend({
        id: 'current-user',
        name: 'Current User',
        email: 'current@example.com',
        handicap: 15,
        photo_url: null,
      });
      const currentUserSelected: SelectedPlayer = {
        id: 'current-user',
        name: 'Current User',
        email: 'current@example.com',
        handicap: 15,
        photo_url: null,
      };
      render(
        <FriendSelector
          {...defaultProps}
          friends={[...mockFriends, currentUserAsFriend]}
          selectedPlayers={[currentUserSelected]}
          onSelectionChange={onSelectionChange}
          currentUser={mockCurrentUser}
        />
      );
      fireEvent.press(screen.getByTestId('friend-item-current-user'));
      expect(onSelectionChange).toHaveBeenCalledWith([]);
    });
  });

  // --------------------------------------------------------------------------
  // Ready Badge Tests
  // --------------------------------------------------------------------------
  describe('Ready Badge', () => {
    it('shows ready badge when minimum is met and showReadyBadge is true', () => {
      const selectedPlayers: SelectedPlayer[] = [
        { id: 'friend-1', name: 'John Smith', email: 'john@example.com', handicap: 12, photo_url: null },
        { id: 'friend-2', name: 'Jane Doe', email: 'jane@example.com', handicap: 18, photo_url: null },
      ];
      render(
        <FriendSelector
          {...defaultProps}
          selectedPlayers={selectedPlayers}
          limits={{ min: 2, max: 4 }}
          showReadyBadge={true}
        />
      );
      expect(screen.getByText('Ready')).toBeTruthy();
    });

    it('does not show ready badge when minimum is not met', () => {
      render(
        <FriendSelector
          {...defaultProps}
          selectedPlayers={[mockSelectedPlayer]}
          limits={{ min: 2 }}
          showReadyBadge={true}
        />
      );
      expect(screen.queryByText('Ready')).toBeNull();
    });

    it('does not show ready badge when at limit', () => {
      const selectedPlayers: SelectedPlayer[] = [
        { id: 'friend-1', name: 'John Smith', email: 'john@example.com', handicap: 12, photo_url: null },
        { id: 'friend-2', name: 'Jane Doe', email: 'jane@example.com', handicap: 18, photo_url: null },
      ];
      render(
        <FriendSelector
          {...defaultProps}
          selectedPlayers={selectedPlayers}
          limits={{ min: 2, max: 2 }}
          showReadyBadge={true}
        />
      );
      expect(screen.queryByText('Ready')).toBeNull();
    });

    it('does not show ready badge when showReadyBadge is false', () => {
      const selectedPlayers: SelectedPlayer[] = [
        { id: 'friend-1', name: 'John Smith', email: 'john@example.com', handicap: 12, photo_url: null },
        { id: 'friend-2', name: 'Jane Doe', email: 'jane@example.com', handicap: 18, photo_url: null },
      ];
      render(
        <FriendSelector
          {...defaultProps}
          selectedPlayers={selectedPlayers}
          limits={{ min: 2, max: 4 }}
          showReadyBadge={false}
        />
      );
      expect(screen.queryByText('Ready')).toBeNull();
    });
  });

  // --------------------------------------------------------------------------
  // Add Friend Button Tests
  // --------------------------------------------------------------------------
  describe('Add Friend Button', () => {
    it('shows add friend button when onAddFriendPress is provided', () => {
      const onAddFriendPress = jest.fn();
      render(
        <FriendSelector {...defaultProps} onAddFriendPress={onAddFriendPress} />
      );
      expect(screen.getByTestId('icon-user-plus')).toBeTruthy();
    });

    it('does not show add friend button when no handler provided', () => {
      render(<FriendSelector {...defaultProps} />);
      expect(screen.queryByTestId('icon-user-plus')).toBeNull();
    });

    it('calls onAddFriendPress when add friend button is pressed', () => {
      const onAddFriendPress = jest.fn();
      render(
        <FriendSelector {...defaultProps} onAddFriendPress={onAddFriendPress} />
      );
      fireEvent.press(screen.getByLabelText('Add Friend'));
      expect(onAddFriendPress).toHaveBeenCalled();
    });

    it('uses custom add friend label', () => {
      const onAddFriendPress = jest.fn();
      render(
        <FriendSelector
          {...defaultProps}
          onAddFriendPress={onAddFriendPress}
          addFriendLabel="Add Partner"
        />
      );
      expect(screen.getByLabelText('Add Partner')).toBeTruthy();
    });

    it('shows add friend button in empty state', () => {
      const onAddFriendPress = jest.fn();
      render(
        <FriendSelector
          {...defaultProps}
          friends={[]}
          onAddFriendPress={onAddFriendPress}
        />
      );
      expect(screen.getByText('Add Friend')).toBeTruthy();
      fireEvent.press(screen.getByText('Add Friend'));
      expect(onAddFriendPress).toHaveBeenCalled();
    });
  });

  // --------------------------------------------------------------------------
  // Divider Tests
  // --------------------------------------------------------------------------
  describe('Dividers', () => {
    it('shows dividers between friends except last', () => {
      render(<FriendSelector {...defaultProps} />);
      // First 3 friends should have dividers, last one should not
      expect(screen.getByTestId('friend-divider-friend-1')).toBeTruthy();
      expect(screen.getByTestId('friend-divider-friend-2')).toBeTruthy();
      expect(screen.getByTestId('friend-divider-friend-3')).toBeTruthy();
      expect(screen.queryByTestId('friend-divider-friend-4')).toBeNull();
    });
  });

  // --------------------------------------------------------------------------
  // Pending Badge Tests
  // --------------------------------------------------------------------------
  describe('Pending Badge', () => {
    it('passes showPendingBadge to FriendListItem', () => {
      render(<FriendSelector {...defaultProps} showPendingBadge={true} />);
      // We can't directly test this since we mocked FriendListItem,
      // but we verify it doesn't crash
      expect(screen.getByTestId('friend-item-friend-1')).toBeTruthy();
    });
  });

  // --------------------------------------------------------------------------
  // Edge Cases Tests
  // --------------------------------------------------------------------------
  describe('Edge Cases', () => {
    it('handles friends without email', () => {
      const friendsWithoutEmail: Friend[] = [
        createMockFriend({ id: 'friend-no-email', name: 'No Email Friend', email: '' as string }),
      ];
      render(<FriendSelector {...defaultProps} friends={friendsWithoutEmail} />);
      expect(screen.getByTestId('friend-item-friend-no-email')).toBeTruthy();
    });

    it('handles friends without handicap', () => {
      const friendsWithoutHandicap: Friend[] = [
        createMockFriend({ id: 'friend-no-hcp', name: 'No Handicap Friend', handicap: 0 }),
      ];
      render(<FriendSelector {...defaultProps} friends={friendsWithoutHandicap} />);
      expect(screen.getByTestId('friend-item-friend-no-hcp')).toBeTruthy();
    });

    it('handles undefined limits gracefully', () => {
      render(
        <FriendSelector
          {...defaultProps}
          limits={undefined}
          limitIndicator={{ show: true, label: 'Players' }}
        />
      );
      // Should not show limit indicator when max is Infinity
      expect(screen.queryByTestId('limit-indicator')).toBeNull();
    });

    it('handles min of 0 correctly', () => {
      render(
        <FriendSelector
          {...defaultProps}
          limits={{ min: 0, max: 4 }}
          showReadyBadge={true}
        />
      );
      expect(screen.getByText('Ready')).toBeTruthy();
    });

    it('handles empty selected players array', () => {
      render(<FriendSelector {...defaultProps} selectedPlayers={[]} />);
      expect(screen.getByText('No players selected yet')).toBeTruthy();
    });

    it('handles rapid selection/deselection', () => {
      const onSelectionChange = jest.fn();
      render(
        <FriendSelector {...defaultProps} onSelectionChange={onSelectionChange} />
      );

      fireEvent.press(screen.getByTestId('friend-item-friend-1'));
      fireEvent.press(screen.getByTestId('friend-item-friend-2'));

      expect(onSelectionChange).toHaveBeenCalledTimes(2);
    });
  });

  // --------------------------------------------------------------------------
  // Accessibility Tests
  // --------------------------------------------------------------------------
  describe('Accessibility', () => {
    it('has accessible search bar', () => {
      render(<FriendSelector {...defaultProps} />);
      expect(screen.getByLabelText('Search friends')).toBeTruthy();
    });

    it('has accessible add friend button', () => {
      const onAddFriendPress = jest.fn();
      render(
        <FriendSelector {...defaultProps} onAddFriendPress={onAddFriendPress} />
      );
      expect(screen.getByLabelText('Add Friend')).toBeTruthy();
    });

    it('friend items have checkbox role', () => {
      render(<FriendSelector {...defaultProps} />);
      const friendItem = screen.getByTestId('friend-item-friend-1');
      expect(friendItem.props.accessibilityRole).toBe('checkbox');
    });

    it('friend items have correct checked state', () => {
      render(
        <FriendSelector {...defaultProps} selectedPlayers={[mockSelectedPlayer]} />
      );
      const selectedItem = screen.getByTestId('friend-item-friend-1');
      const unselectedItem = screen.getByTestId('friend-item-friend-2');

      expect(selectedItem.props.accessibilityState.checked).toBe(true);
      expect(unselectedItem.props.accessibilityState.checked).toBe(false);
    });

    it('friend items have correct disabled state', () => {
      const selectedPlayers: SelectedPlayer[] = [
        { id: 'friend-1', name: 'John Smith', email: 'john@example.com', handicap: 12, photo_url: null },
        { id: 'friend-2', name: 'Jane Doe', email: 'jane@example.com', handicap: 18, photo_url: null },
      ];
      render(
        <FriendSelector
          {...defaultProps}
          selectedPlayers={selectedPlayers}
          limits={{ max: 2 }}
        />
      );
      const disabledItem = screen.getByTestId('friend-item-friend-3');
      expect(disabledItem.props.accessibilityState.disabled).toBe(true);
    });
  });

  // --------------------------------------------------------------------------
  // testID Tests
  // --------------------------------------------------------------------------
  describe('Test IDs', () => {
    it('applies custom testID to container', () => {
      render(<FriendSelector {...defaultProps} testID="custom-friend-selector" />);
      expect(screen.getByTestId('custom-friend-selector')).toBeTruthy();
    });

    it('renders without testID', () => {
      render(
        <FriendSelector
          {...defaultProps}
          testID={undefined}
        />
      );
      // Component should still render - we can check for the section title
      expect(screen.getByText('SELECTED')).toBeTruthy();
    });
  });
});
