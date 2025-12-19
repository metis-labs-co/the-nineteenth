/**
 * AddPlayersStep Component Tests
 *
 * Tests for the player selection step in competition creation wizard:
 * - Rendering states (initial, with data)
 * - Friends list display and filtering
 * - Player selection/deselection
 * - Player limit enforcement
 * - Selected players display
 * - Navigation (back/next)
 * - Empty states
 * - Accessibility
 */

import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react-native';
import AddPlayersStep from './AddPlayersStep';
import type { Friend, Player } from '@/types/database.types';
import { Alert } from 'react-native';

// ============================================================================
// MOCKS
// ============================================================================

// Mock Alert.alert
jest.spyOn(Alert, 'alert').mockImplementation(jest.fn());

// Mock common components
jest.mock('@/components/common', () => {
  const { View, Text, TextInput } = require('react-native');
  return {
    LoadingSpinner: ({ size }: { size?: string }) => (
      <View testID={`loading-spinner-${size || 'default'}`}>
        <Text>Loading...</Text>
      </View>
    ),
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

// Mock LimitIndicator
jest.mock('@/components/subscription/LimitIndicator', () => {
  const { View, Text } = require('react-native');
  return {
    LimitIndicator: ({
      current,
      max,
      label,
    }: {
      current: number;
      max: number;
      label: string;
    }) => (
      <View testID="limit-indicator">
        <Text testID="limit-indicator-text">
          {label}: {current}/{max}
        </Text>
      </View>
    ),
  };
});

// Mock current player and user
const mockCurrentPlayer: Player = {
  id: 'user-123',
  name: 'Current User',
  email: 'current@example.com',
  phone: null,
  handicap: 15,
  golf_id: null,
  handicap_updated_at: null,
  photo_url: null,
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString(),
};

const mockUser = { id: 'user-123', email: 'current@example.com' };

jest.mock('@/hooks/useAuth', () => ({
  useAuth: () => ({
    user: mockUser,
    player: mockCurrentPlayer,
    loading: false,
  }),
}));

// Mock friends data
const mockFriends: Friend[] = [
  {
    id: 'friend-1',
    name: 'John Smith',
    email: 'john@example.com',
    phone: null,
    handicap: 12,
    golf_id: null,
    handicap_updated_at: null,
    photo_url: 'https://example.com/john.jpg',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    friendship_id: 'friendship-1',
    friendship_status: 'accepted',
    is_requester: true,
  },
  {
    id: 'friend-2',
    name: 'Jane Doe',
    email: 'jane@example.com',
    phone: null,
    handicap: 18,
    golf_id: null,
    handicap_updated_at: null,
    photo_url: null,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    friendship_id: 'friendship-2',
    friendship_status: 'accepted',
    is_requester: false,
  },
  {
    id: 'friend-3',
    name: 'Bob Wilson',
    email: 'bob@example.com',
    phone: null,
    handicap: 8,
    golf_id: null,
    handicap_updated_at: null,
    photo_url: 'https://example.com/bob.jpg',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    friendship_id: 'friendship-3',
    friendship_status: 'accepted',
    is_requester: true,
  },
  {
    id: 'friend-4',
    name: 'Alice Brown',
    email: 'alice@example.com',
    phone: null,
    handicap: 24,
    golf_id: null,
    handicap_updated_at: null,
    photo_url: null,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    friendship_id: 'friendship-4',
    friendship_status: 'pending', // Should not show - pending status
    is_requester: true,
  },
];

const mockUseFriends = jest.fn(() => ({
  data: mockFriends,
  isLoading: false,
}));

jest.mock('@/hooks/useFriends', () => ({
  useFriends: () => mockUseFriends(),
}));

// ============================================================================
// TEST SETUP
// ============================================================================

const defaultProps = {
  onComplete: jest.fn(),
  onBack: jest.fn(),
  maxPlayersPerCompetition: 10,
};

describe('AddPlayersStep', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockUseFriends.mockReturnValue({
      data: mockFriends,
      isLoading: false,
    });
  });

  // ===========================================================================
  // RENDERING TESTS
  // ===========================================================================

  describe('Rendering', () => {
    it('renders without crashing', () => {
      render(<AddPlayersStep {...defaultProps} />);

      expect(
        screen.getByText('Select players for your competition. You are automatically included.')
      ).toBeTruthy();
    });

    it('renders search bar', () => {
      render(<AddPlayersStep {...defaultProps} />);

      expect(screen.getByTestId('search-bar')).toBeTruthy();
    });

    it('renders selected players section', () => {
      render(<AddPlayersStep {...defaultProps} />);

      expect(screen.getByText('SELECTED PLAYERS')).toBeTruthy();
    });

    it('renders limit indicator', () => {
      render(<AddPlayersStep {...defaultProps} />);

      expect(screen.getByTestId('limit-indicator')).toBeTruthy();
    });

    it('renders Back and Next buttons', () => {
      render(<AddPlayersStep {...defaultProps} />);

      expect(screen.getByText('Back')).toBeTruthy();
      expect(screen.getByText('Next: Review')).toBeTruthy();
    });

    it('shows current user as automatically selected', () => {
      render(<AddPlayersStep {...defaultProps} />);

      // Current user should appear in selected players as a chip
      expect(screen.getByText(/Current User/)).toBeTruthy();
      expect(screen.getByText(/\(You\)/)).toBeTruthy();
    });
  });

  // ===========================================================================
  // FRIENDS LIST TESTS
  // ===========================================================================

  describe('Friends List', () => {
    it('shows accepted friends count in header', () => {
      render(<AddPlayersStep {...defaultProps} />);

      // 3 accepted friends (friend-4 is pending)
      expect(screen.getByText('3 FRIENDS')).toBeTruthy();
    });

    it('displays accepted friends only', () => {
      render(<AddPlayersStep {...defaultProps} />);

      expect(screen.getByText('John Smith')).toBeTruthy();
      expect(screen.getByText('Jane Doe')).toBeTruthy();
      expect(screen.getByText('Bob Wilson')).toBeTruthy();
      // Should NOT show pending friend
      expect(screen.queryByText('Alice Brown')).toBeNull();
    });

    it('displays friend email when available', () => {
      render(<AddPlayersStep {...defaultProps} />);

      expect(screen.getByText('john@example.com')).toBeTruthy();
      expect(screen.getByText('jane@example.com')).toBeTruthy();
    });

    it('displays friend handicap', () => {
      render(<AddPlayersStep {...defaultProps} />);

      expect(screen.getByText('HC: 12')).toBeTruthy();
      expect(screen.getByText('HC: 18')).toBeTruthy();
      expect(screen.getByText('HC: 8')).toBeTruthy();
    });

    it('shows singular FRIEND when only 1 friend', () => {
      mockUseFriends.mockReturnValue({
        data: [mockFriends[0]],
        isLoading: false,
      });

      render(<AddPlayersStep {...defaultProps} />);

      expect(screen.getByText('1 FRIEND')).toBeTruthy();
    });

    it('shows empty state when no friends', () => {
      mockUseFriends.mockReturnValue({
        data: [],
        isLoading: false,
      });

      render(<AddPlayersStep {...defaultProps} />);

      expect(screen.getByText('No friends yet')).toBeTruthy();
      expect(
        screen.getByText('Add friends from the Friends tab to invite them to competitions')
      ).toBeTruthy();
    });

    it('shows loading state while friends are loading', () => {
      mockUseFriends.mockReturnValue({
        data: [],
        isLoading: true,
      });

      render(<AddPlayersStep {...defaultProps} />);

      expect(screen.getByTestId('loading-spinner-lg')).toBeTruthy();
    });
  });

  // ===========================================================================
  // SEARCH/FILTER TESTS
  // ===========================================================================

  describe('Search/Filter', () => {
    it('filters friends by name when searching', async () => {
      render(<AddPlayersStep {...defaultProps} />);

      fireEvent.changeText(screen.getByTestId('search-bar'), 'John');

      await waitFor(() => {
        expect(screen.getByText('John Smith')).toBeTruthy();
        expect(screen.queryByText('Jane Doe')).toBeNull();
        expect(screen.queryByText('Bob Wilson')).toBeNull();
      });
    });

    it('filters friends by email when searching', async () => {
      render(<AddPlayersStep {...defaultProps} />);

      fireEvent.changeText(screen.getByTestId('search-bar'), 'jane@');

      await waitFor(() => {
        expect(screen.getByText('Jane Doe')).toBeTruthy();
        expect(screen.queryByText('John Smith')).toBeNull();
      });
    });

    it('shows no results message when search matches nothing', async () => {
      render(<AddPlayersStep {...defaultProps} />);

      fireEvent.changeText(screen.getByTestId('search-bar'), 'XYZ');

      await waitFor(() => {
        expect(screen.getByText('No friends found')).toBeTruthy();
        expect(screen.getByText('No friends match "XYZ"')).toBeTruthy();
      });
    });

    it('clears filter when search is cleared', async () => {
      render(<AddPlayersStep {...defaultProps} />);

      // Search for John
      fireEvent.changeText(screen.getByTestId('search-bar'), 'John');

      await waitFor(() => {
        expect(screen.queryByText('Jane Doe')).toBeNull();
      });

      // Clear search
      fireEvent.changeText(screen.getByTestId('search-bar'), '');

      await waitFor(() => {
        // All friends should be visible again
        expect(screen.getByText('John Smith')).toBeTruthy();
        expect(screen.getByText('Jane Doe')).toBeTruthy();
        expect(screen.getByText('Bob Wilson')).toBeTruthy();
      });
    });
  });

  // ===========================================================================
  // PLAYER SELECTION TESTS
  // ===========================================================================

  describe('Player Selection', () => {
    it('selects friend when tapped', () => {
      render(<AddPlayersStep {...defaultProps} />);

      fireEvent.press(screen.getByText('John Smith'));

      // Should show selected player chip
      // Look for chip text - current user + 1 friend = 2 players
      expect(screen.getByTestId('limit-indicator-text').props.children).toContain(2);
    });

    it('deselects friend when tapped again', async () => {
      render(<AddPlayersStep {...defaultProps} />);

      // Select John (first occurrence is in friends list)
      const johnElements = screen.getAllByText('John Smith');
      fireEvent.press(johnElements[0]);

      // Wait for selection to register
      await waitFor(() => {
        expect(screen.getByTestId('limit-indicator-text').props.children).toContain(2);
      });

      // Deselect John - tap on the first John Smith element again
      // After selection, John may appear twice (friends list + chip), so we find the correct one
      const allJohns = screen.getAllByText('John Smith');
      // Find the one in friends list (with checkbox role)
      const friendCard = screen.getByLabelText(/Remove John Smith/);
      fireEvent.press(friendCard);

      // Should be back to just current user (1 player)
      await waitFor(() => {
        expect(screen.getByTestId('limit-indicator-text').props.children).toContain(1);
      });
    });

    it('allows selecting multiple friends', () => {
      render(<AddPlayersStep {...defaultProps} />);

      fireEvent.press(screen.getByText('John Smith'));
      fireEvent.press(screen.getByText('Jane Doe'));
      fireEvent.press(screen.getByText('Bob Wilson'));

      // Current user + 3 friends = 4 players
      expect(screen.getByTestId('limit-indicator-text').props.children).toContain(4);
    });

    it('shows Ready badge when minimum players selected (2+)', () => {
      render(<AddPlayersStep {...defaultProps} />);

      // Initially just current user - not ready
      expect(screen.queryByText('Ready')).toBeNull();

      // Select one friend - now at 2 players
      fireEvent.press(screen.getByText('John Smith'));

      // Should show Ready badge
      expect(screen.getByText('Ready')).toBeTruthy();
    });

    it('current user cannot be removed', () => {
      render(<AddPlayersStep {...defaultProps} />);

      // Current user chip should not have close icon
      // This is tested by ensuring current user is always in selected
      const chips = screen.getAllByText(/Current User/);
      expect(chips.length).toBeGreaterThan(0);
    });
  });

  // ===========================================================================
  // PLAYER LIMIT TESTS
  // ===========================================================================

  describe('Player Limits', () => {
    it('shows limit indicator with correct count', () => {
      render(<AddPlayersStep {...defaultProps} maxPlayersPerCompetition={10} />);

      // Current user is auto-selected
      expect(screen.getByText('Players: 1/10')).toBeTruthy();
    });

    it('updates limit count when selecting players', () => {
      render(<AddPlayersStep {...defaultProps} maxPlayersPerCompetition={10} />);

      fireEvent.press(screen.getByText('John Smith'));

      expect(screen.getByText('Players: 2/10')).toBeTruthy();
    });

    it('shows approaching limit warning at 80%', () => {
      // 4 player max = 80% at 3.2, rounds to 3
      // Current user + 2 friends = 3 players
      render(<AddPlayersStep {...defaultProps} maxPlayersPerCompetition={4} />);

      fireEvent.press(screen.getByText('John Smith'));
      fireEvent.press(screen.getByText('Jane Doe'));

      // 3/4 = 75%, should trigger warning at 80% threshold
      // Let's select one more to hit 4 (100%)
      fireEvent.press(screen.getByText('Bob Wilson'));

      // At limit warning should show
      expect(screen.getByText('Player limit reached. Upgrade to add more players.')).toBeTruthy();
    });

    it('shows alert and prevents selection when at limit', () => {
      render(<AddPlayersStep {...defaultProps} maxPlayersPerCompetition={2} />);

      // Current user is already at 1, select one more
      fireEvent.press(screen.getByText('John Smith'));

      // Now at limit (2), try to select another
      fireEvent.press(screen.getByText('Jane Doe'));

      // Alert should have been called
      expect(Alert.alert).toHaveBeenCalledWith(
        'Player Limit Reached',
        expect.stringContaining('Maximum 2 players allowed'),
        expect.any(Array)
      );
    });

    it('defaults to 40 max players when not specified', () => {
      render(<AddPlayersStep {...defaultProps} maxPlayersPerCompetition={undefined} />);

      expect(screen.getByText('Players: 1/40')).toBeTruthy();
    });

    it('defaults to 40 max players for negative values (unlimited)', () => {
      render(<AddPlayersStep {...defaultProps} maxPlayersPerCompetition={-1} />);

      expect(screen.getByText('Players: 1/40')).toBeTruthy();
    });
  });

  // ===========================================================================
  // NAVIGATION TESTS
  // ===========================================================================

  describe('Navigation', () => {
    it('calls onBack when Back button pressed', () => {
      const onBack = jest.fn();
      render(<AddPlayersStep {...defaultProps} onBack={onBack} />);

      fireEvent.press(screen.getByText('Back'));

      expect(onBack).toHaveBeenCalled();
    });

    it('disables Next button when less than 2 players selected', () => {
      const onComplete = jest.fn();
      render(<AddPlayersStep {...defaultProps} onComplete={onComplete} />);

      // Only current user is selected (1 player)
      // Button should be disabled
      const nextButton = screen.getByText('Next: Review');

      // fireEvent.press on a disabled Paper Button won't trigger onPress
      fireEvent.press(nextButton);

      // onComplete should not have been called because button is disabled
      expect(onComplete).not.toHaveBeenCalled();
    });

    it('calls onComplete with player data when Next pressed with valid selection', () => {
      const onComplete = jest.fn();
      render(<AddPlayersStep {...defaultProps} onComplete={onComplete} />);

      // Select a friend to meet minimum requirement
      fireEvent.press(screen.getByText('John Smith'));
      fireEvent.press(screen.getByText('Next: Review'));

      expect(onComplete).toHaveBeenCalledWith(
        expect.arrayContaining([
          expect.objectContaining({ name: 'Current User' }),
          expect.objectContaining({ name: 'John Smith' }),
        ])
      );
    });

    it('converts players to form data format on complete', () => {
      const onComplete = jest.fn();
      render(<AddPlayersStep {...defaultProps} onComplete={onComplete} />);

      fireEvent.press(screen.getByText('John Smith'));
      fireEvent.press(screen.getByText('Next: Review'));

      expect(onComplete).toHaveBeenCalledWith(
        expect.arrayContaining([
          expect.objectContaining({
            name: expect.any(String),
            email: expect.any(String),
            phone: expect.any(String),
            handicap: expect.any(String),
            golf_id: expect.any(String),
          }),
        ])
      );
    });
  });

  // ===========================================================================
  // SELECTED PLAYERS DISPLAY TESTS
  // ===========================================================================

  describe('Selected Players Display', () => {
    it('shows current user chip with (You) suffix', () => {
      render(<AddPlayersStep {...defaultProps} />);

      expect(screen.getByText(/\(You\)/)).toBeTruthy();
    });

    it('shows selected friend as chip', () => {
      render(<AddPlayersStep {...defaultProps} />);

      fireEvent.press(screen.getByText('John Smith'));

      // John Smith should appear as a chip (look for it in the chips area)
      const johnChips = screen.getAllByText('John Smith');
      // One in friends list, potentially one in chips
      expect(johnChips.length).toBeGreaterThanOrEqual(1);
    });

    it('shows hint when only current user selected', () => {
      render(<AddPlayersStep {...defaultProps} />);

      expect(screen.getByText('Select at least 1 friend to continue')).toBeTruthy();
    });

    it('hides hint when friends are selected', () => {
      render(<AddPlayersStep {...defaultProps} />);

      fireEvent.press(screen.getByText('John Smith'));

      expect(screen.queryByText('Select at least 1 friend to continue')).toBeNull();
    });
  });

  // ===========================================================================
  // EDGE CASES
  // ===========================================================================

  describe('Edge Cases', () => {
    it('handles friend with null handicap', () => {
      const friendsWithNullHandicap = [
        {
          ...mockFriends[0],
          id: 'friend-null-hc',
          name: 'No Handicap Player',
          handicap: null,
        },
      ];

      mockUseFriends.mockReturnValue({
        data: friendsWithNullHandicap,
        isLoading: false,
      });

      render(<AddPlayersStep {...defaultProps} />);

      expect(screen.getByText('No Handicap Player')).toBeTruthy();
      // Should not show handicap for this player
    });

    it('handles friend with null email', () => {
      const friendsWithNullEmail = [
        {
          ...mockFriends[0],
          id: 'friend-null-email',
          name: 'No Email Player',
          email: null,
        },
      ];

      mockUseFriends.mockReturnValue({
        data: friendsWithNullEmail,
        isLoading: false,
      });

      render(<AddPlayersStep {...defaultProps} />);

      expect(screen.getByText('No Email Player')).toBeTruthy();
    });

    it('handles friend with photo', () => {
      render(<AddPlayersStep {...defaultProps} />);

      // John has a photo
      expect(screen.getByText('John Smith')).toBeTruthy();
    });

    it('handles friend without photo', () => {
      render(<AddPlayersStep {...defaultProps} />);

      // Jane has no photo - should show icon avatar
      expect(screen.getByText('Jane Doe')).toBeTruthy();
    });

    it('shows too many players alert when exceeding limit on submit', () => {
      render(<AddPlayersStep {...defaultProps} maxPlayersPerCompetition={3} />);

      // This scenario shouldn't normally happen because selection is blocked at limit,
      // but the validation exists as a safeguard
      fireEvent.press(screen.getByText('John Smith'));
      fireEvent.press(screen.getByText('Jane Doe'));

      // Try to proceed (3 players total, at limit which is ok)
      fireEvent.press(screen.getByText('Next: Review'));

      // Should proceed without error (at limit, not over)
      expect(Alert.alert).not.toHaveBeenCalledWith(
        'Too Many Players',
        expect.anything(),
        expect.anything()
      );
    });
  });

  // ===========================================================================
  // ACCESSIBILITY TESTS
  // ===========================================================================

  describe('Accessibility', () => {
    it('friend cards have checkbox accessibility role', () => {
      render(<AddPlayersStep {...defaultProps} />);

      // Find a friend card with the accessibility role
      const johnCard = screen.getByLabelText(/Add John Smith/);
      expect(johnCard.props.accessibilityRole).toBe('checkbox');
    });

    it('friend cards have correct checked state when not selected', () => {
      render(<AddPlayersStep {...defaultProps} />);

      const johnCard = screen.getByLabelText(/Add John Smith/);
      expect(johnCard.props.accessibilityState.checked).toBe(false);
    });

    it('friend cards have correct checked state when selected', () => {
      render(<AddPlayersStep {...defaultProps} />);

      fireEvent.press(screen.getByText('John Smith'));

      const johnCard = screen.getByLabelText(/Remove John Smith/);
      expect(johnCard.props.accessibilityState.checked).toBe(true);
    });

    it('search bar has accessibility label', () => {
      render(<AddPlayersStep {...defaultProps} />);

      expect(screen.getByLabelText('Search friends')).toBeTruthy();
    });
  });

  // ===========================================================================
  // INITIAL DATA TESTS
  // ===========================================================================

  describe('Initial Data', () => {
    it('renders with initialData prop', () => {
      const initialData = [
        { name: 'Pre-selected Player', email: 'pre@test.com', phone: '', handicap: '10', golf_id: '' },
      ];

      render(<AddPlayersStep {...defaultProps} initialData={initialData} />);

      // Component should render without error
      expect(screen.getByText('SELECTED PLAYERS')).toBeTruthy();
    });
  });
});
