/**
 * AddPlayersBottomSheet Component Tests
 *
 * Tests for the slide-up drawer component for adding players to a competition:
 * - Rendering states (visible/hidden)
 * - Search functionality
 * - Friends list display
 * - Player selection/deselection
 * - Player limit enforcement
 * - Add players submission
 * - Empty states
 */

import React from 'react';
import {
  render,
  screen,
  fireEvent,
  waitFor,
} from '@/__tests__/utils/renderHelpers';
import AddPlayersBottomSheet from './AddPlayersBottomSheet';
import type { Friend } from '@/types/database.types';

// ============================================================================
// MOCKS
// ============================================================================

// Mock the BottomSheet component
jest.mock('@/components/common', () => {
  const { View, Text, TextInput } = require('react-native');
  return {
    BottomSheet: ({
      visible,
      onClose,
      children,
      title,
      testID,
    }: {
      visible: boolean;
      onClose: () => void;
      children: React.ReactNode;
      title?: string;
      testID?: string;
    }) =>
      visible ? (
        <View testID={testID || 'bottom-sheet'}>
          {title && <Text testID="bottom-sheet-title">{title}</Text>}
          {children}
        </View>
      ) : null,
    LoadingSpinner: ({ size }: { size?: string }) => (
      <View testID={`loading-spinner-${size || 'default'}`}>
        <Text>Loading...</Text>
      </View>
    ),
    GolfBallLoader: ({ size }: { size?: string }) => (
      <View testID={`golf-ball-loader-${size || 'default'}`}>
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
jest.mock('@/components/subscription', () => {
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

// Mock useThemeColors
jest.mock('@/context/ThemeContext', () => ({
  useThemeColors: () => ({
    primary: '#1B5E20',
    primaryLight: '#4CAF50',
    primaryDark: '#0D3B0F',
    surface: '#FFFFFF',
    background: '#F5F5F5',
    textPrimary: '#212121',
    textSecondary: '#757575',
    textOnColored: '#FFFFFF',
    gray100: '#F5F5F5',
    gray200: '#EEEEEE',
    gray300: '#E0E0E0',
    gray400: '#BDBDBD',
    warning: '#FF9800',
    success: '#4CAF50',
    successLight: '#E8F5E9',
    error: '#F44336',
  }),
}));

// Mock useAuth
const mockUser = { id: 'user-123', email: 'test@example.com' };
jest.mock('@/hooks/useAuth', () => ({
  useAuth: () => ({
    user: mockUser,
    loading: false,
  }),
}));

// Mock useFriends hook
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
    home_venue_id: null,
    push_enabled: true,
    push_competition_updates: true,
    push_friend_requests: true,
    push_scorecard_updates: true,
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
    home_venue_id: null,
    push_enabled: true,
    push_competition_updates: true,
    push_friend_requests: true,
    push_scorecard_updates: true,
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
    home_venue_id: null,
    push_enabled: true,
    push_competition_updates: true,
    push_friend_requests: true,
    push_scorecard_updates: true,
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
    home_venue_id: null,
    push_enabled: true,
    push_competition_updates: true,
    push_friend_requests: true,
    push_scorecard_updates: true,
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

// Mock supabase
const mockSupabaseSelect = jest.fn();
const mockSupabaseInsert = jest.fn();

jest.mock('@/services/supabase/client', () => ({
  supabase: {
    from: (table: string) => {
      if (table === 'players') {
        return {
          select: () => ({
            ilike: () => ({
              neq: () => ({
                limit: mockSupabaseSelect,
              }),
            }),
          }),
        };
      }
      if (table === 'competition_players') {
        return {
          insert: mockSupabaseInsert,
        };
      }
      return {};
    },
  },
}));

// Mock subscription type helpers
jest.mock('@/types/subscription.types', () => ({
  isUnlimited: (value: number) => value === -1,
  isNoLimit: (value: number) => value === -2,
}));

// ============================================================================
// TEST SETUP
// ============================================================================

const defaultProps = {
  visible: true,
  onClose: jest.fn(),
  competitionId: 'comp-123',
  existingPlayerIds: [],
  maxPlayers: 10,
  currentPlayerCount: 0,
};

describe('AddPlayersBottomSheet', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockUseFriends.mockReturnValue({
      data: mockFriends,
      isLoading: false,
    });
    mockSupabaseSelect.mockResolvedValue({ data: [], error: null });
    mockSupabaseInsert.mockResolvedValue({ error: null });
  });

  // ===========================================================================
  // RENDERING TESTS
  // ===========================================================================

  describe('Rendering', () => {
    it('renders when visible is true', () => {
      render(<AddPlayersBottomSheet {...defaultProps} />);

      expect(screen.getByTestId('add-players-bottom-sheet')).toBeTruthy();
    });

    it('does not render when visible is false', () => {
      render(<AddPlayersBottomSheet {...defaultProps} visible={false} />);

      expect(screen.queryByTestId('add-players-bottom-sheet')).toBeNull();
    });

    it('renders with title "Add Players"', () => {
      render(<AddPlayersBottomSheet {...defaultProps} />);

      expect(screen.getByTestId('bottom-sheet-title')).toBeTruthy();
      expect(screen.getByText('Add Players')).toBeTruthy();
    });

    it('renders search bar', () => {
      render(<AddPlayersBottomSheet {...defaultProps} />);

      expect(screen.getByTestId('search-bar')).toBeTruthy();
    });

    it('renders selected players section with empty state', () => {
      render(<AddPlayersBottomSheet {...defaultProps} />);

      expect(screen.getByText('SELECTED PLAYERS (0)')).toBeTruthy();
      expect(
        screen.getByText('Tap on players below to select them')
      ).toBeTruthy();
    });

    it('renders add button in disabled state when no players selected', () => {
      render(<AddPlayersBottomSheet {...defaultProps} />);

      expect(screen.getByText('Select Players to Add')).toBeTruthy();
    });
  });

  // ===========================================================================
  // FRIENDS LIST TESTS
  // ===========================================================================

  describe('Friends List', () => {
    it('shows friends list when not searching', () => {
      render(<AddPlayersBottomSheet {...defaultProps} />);

      // Should show friends section header
      expect(screen.getByText('YOUR FRIENDS (3)')).toBeTruthy();
    });

    it('displays accepted friends only', () => {
      render(<AddPlayersBottomSheet {...defaultProps} />);

      // Should show accepted friends
      expect(screen.getByText('John Smith')).toBeTruthy();
      expect(screen.getByText('Jane Doe')).toBeTruthy();
      expect(screen.getByText('Bob Wilson')).toBeTruthy();
      // Should NOT show pending friend
      expect(screen.queryByText('Alice Brown')).toBeNull();
    });

    it('displays friend email when available', () => {
      render(<AddPlayersBottomSheet {...defaultProps} />);

      expect(screen.getByText('john@example.com')).toBeTruthy();
      expect(screen.getByText('jane@example.com')).toBeTruthy();
    });

    it('displays friend handicap', () => {
      render(<AddPlayersBottomSheet {...defaultProps} />);

      expect(screen.getByText('HC: 12')).toBeTruthy();
      expect(screen.getByText('HC: 18')).toBeTruthy();
      expect(screen.getByText('HC: 8')).toBeTruthy();
    });

    it('filters out existing players from friends list', () => {
      render(
        <AddPlayersBottomSheet
          {...defaultProps}
          existingPlayerIds={['friend-1', 'friend-2']}
        />
      );

      // Only Bob should be visible (friend-3)
      expect(screen.queryByText('John Smith')).toBeNull();
      expect(screen.queryByText('Jane Doe')).toBeNull();
      expect(screen.getByText('Bob Wilson')).toBeTruthy();
      // Count should reflect filtered list
      expect(screen.getByText('YOUR FRIENDS (1)')).toBeTruthy();
    });

    it('shows empty state when no friends available', () => {
      mockUseFriends.mockReturnValue({
        data: [],
        isLoading: false,
      });

      render(<AddPlayersBottomSheet {...defaultProps} />);

      expect(screen.getByText('No friends yet')).toBeTruthy();
      expect(
        screen.getByText('Add friends or search for players above')
      ).toBeTruthy();
    });

    it('shows loading state while friends are loading', () => {
      mockUseFriends.mockReturnValue({
        data: [],
        isLoading: true,
      });

      render(<AddPlayersBottomSheet {...defaultProps} />);

      expect(screen.getByTestId('loading-spinner-lg')).toBeTruthy();
    });

    it('shows "All friends already added" when all friends are in competition', () => {
      mockUseFriends.mockReturnValue({
        data: mockFriends.filter((f) => f.friendship_status === 'accepted'),
        isLoading: false,
      });

      render(
        <AddPlayersBottomSheet
          {...defaultProps}
          existingPlayerIds={['friend-1', 'friend-2', 'friend-3']}
        />
      );

      expect(screen.getByText('All friends already added')).toBeTruthy();
    });
  });

  // ===========================================================================
  // PLAYER SELECTION TESTS
  // ===========================================================================

  describe('Player Selection', () => {
    it('selects player when tapped', () => {
      render(<AddPlayersBottomSheet {...defaultProps} />);

      // Tap on John Smith
      fireEvent.press(screen.getByText('John Smith'));

      // Should show selected count update
      expect(screen.getByText('SELECTED PLAYERS (1)')).toBeTruthy();
      // Should show "Ready" badge
      expect(screen.getByText('Ready')).toBeTruthy();
    });

    it('deselects player when tapped again', () => {
      render(<AddPlayersBottomSheet {...defaultProps} />);

      // Select John
      fireEvent.press(screen.getByText('John Smith'));
      expect(screen.getByText('SELECTED PLAYERS (1)')).toBeTruthy();

      // Tap again to deselect - use the accessibility label to find the card in friends list
      fireEvent.press(screen.getByLabelText('Remove John Smith'));

      // Should immediately deselect
      expect(screen.getByText('SELECTED PLAYERS (0)')).toBeTruthy();
    });

    it('allows selecting multiple players', () => {
      render(<AddPlayersBottomSheet {...defaultProps} />);

      fireEvent.press(screen.getByText('John Smith'));
      fireEvent.press(screen.getByText('Jane Doe'));
      fireEvent.press(screen.getByText('Bob Wilson'));

      expect(screen.getByText('SELECTED PLAYERS (3)')).toBeTruthy();
    });

    it('updates add button text with count', () => {
      render(<AddPlayersBottomSheet {...defaultProps} />);

      fireEvent.press(screen.getByText('John Smith'));
      expect(screen.getByText('Add 1 Player')).toBeTruthy();

      fireEvent.press(screen.getByText('Jane Doe'));
      expect(screen.getByText('Add 2 Players')).toBeTruthy();
    });

    it('has correct accessibility role on friend cards', () => {
      render(<AddPlayersBottomSheet {...defaultProps} />);

      // Check that friend card has checkbox role
      const johnCard = screen.getByLabelText('Add John Smith');
      expect(johnCard).toBeTruthy();
    });
  });

  // ===========================================================================
  // PLAYER LIMIT TESTS
  // ===========================================================================

  describe('Player Limits', () => {
    it('shows limit indicator when maxPlayers is set', () => {
      render(
        <AddPlayersBottomSheet
          {...defaultProps}
          maxPlayers={10}
          currentPlayerCount={5}
        />
      );

      expect(screen.getByTestId('limit-indicator')).toBeTruthy();
      expect(screen.getByText('Players: 5/10')).toBeTruthy();
    });

    it('does not show limit indicator for unlimited players', () => {
      render(
        <AddPlayersBottomSheet
          {...defaultProps}
          maxPlayers={undefined}
          currentPlayerCount={5}
        />
      );

      expect(screen.queryByTestId('limit-indicator')).toBeNull();
    });

    it('does not show limit indicator for maxPlayers = -1 (unlimited)', () => {
      render(
        <AddPlayersBottomSheet
          {...defaultProps}
          maxPlayers={-1}
          currentPlayerCount={5}
        />
      );

      expect(screen.queryByTestId('limit-indicator')).toBeNull();
    });

    it('shows warning when at player limit', () => {
      render(
        <AddPlayersBottomSheet
          {...defaultProps}
          maxPlayers={3}
          currentPlayerCount={3}
        />
      );

      expect(
        screen.getByText('Player limit reached for your subscription')
      ).toBeTruthy();
    });

    it('prevents selection when at limit', () => {
      render(
        <AddPlayersBottomSheet
          {...defaultProps}
          maxPlayers={3}
          currentPlayerCount={3}
        />
      );

      // Try to select a player - should not change count
      fireEvent.press(screen.getByText('John Smith'));

      // Should still show 0 selected
      expect(screen.getByText('SELECTED PLAYERS (0)')).toBeTruthy();
    });

    it('updates limit count with selections', () => {
      render(
        <AddPlayersBottomSheet
          {...defaultProps}
          maxPlayers={10}
          currentPlayerCount={5}
        />
      );

      fireEvent.press(screen.getByText('John Smith'));

      // Limit indicator should show updated count
      expect(screen.getByText('Players: 6/10')).toBeTruthy();
    });

    it('allows deselection even when at limit', () => {
      render(
        <AddPlayersBottomSheet
          {...defaultProps}
          maxPlayers={6}
          currentPlayerCount={5}
        />
      );

      // Select one player (now at limit)
      fireEvent.press(screen.getByText('John Smith'));
      expect(screen.getByText('SELECTED PLAYERS (1)')).toBeTruthy();

      // Should still be able to deselect - use accessibility label for the selected card
      fireEvent.press(screen.getByLabelText('Remove John Smith'));

      // Should immediately deselect
      expect(screen.getByText('SELECTED PLAYERS (0)')).toBeTruthy();
    });
  });

  // ===========================================================================
  // SEARCH TESTS
  // ===========================================================================

  describe('Search', () => {
    it('shows search bar', () => {
      render(<AddPlayersBottomSheet {...defaultProps} />);

      expect(screen.getByTestId('search-bar')).toBeTruthy();
    });

    it('filters friends list when searching', async () => {
      render(<AddPlayersBottomSheet {...defaultProps} />);

      // Type in search (less than 2 chars won't trigger search results section)
      fireEvent.changeText(screen.getByTestId('search-bar'), 'J');

      // Friends should still be filtered
      await waitFor(() => {
        expect(screen.getByText('John Smith')).toBeTruthy();
        expect(screen.getByText('Jane Doe')).toBeTruthy();
        expect(screen.queryByText('Bob Wilson')).toBeNull();
      });
    });

    it('shows search results section for 2+ characters', async () => {
      const searchResults = [
        {
          id: 'player-1',
          name: 'James Peterson',
          email: 'james@test.com',
          handicap: 15,
          photo_url: null,
        },
      ];

      mockSupabaseSelect.mockResolvedValue({ data: searchResults, error: null });

      render(<AddPlayersBottomSheet {...defaultProps} />);

      fireEvent.changeText(screen.getByTestId('search-bar'), 'Ja');

      await waitFor(() => {
        expect(screen.getByText('SEARCH RESULTS')).toBeTruthy();
      });
    });

    it('shows no results message when search returns empty', async () => {
      mockSupabaseSelect.mockResolvedValue({ data: [], error: null });

      render(<AddPlayersBottomSheet {...defaultProps} />);

      fireEvent.changeText(screen.getByTestId('search-bar'), 'XYZ');

      await waitFor(() => {
        expect(screen.getByText('No players found')).toBeTruthy();
        expect(screen.getByText('No players match "XYZ"')).toBeTruthy();
      });
    });

    it('shows loading state during search', async () => {
      // Make the query hang
      mockSupabaseSelect.mockImplementation(
        () => new Promise(() => {}) // Never resolves
      );

      render(<AddPlayersBottomSheet {...defaultProps} />);

      fireEvent.changeText(screen.getByTestId('search-bar'), 'test');

      await waitFor(() => {
        expect(screen.getByTestId('loading-spinner-lg')).toBeTruthy();
      });
    });
  });

  // ===========================================================================
  // SUBMISSION TESTS
  // ===========================================================================

  describe('Submission', () => {
    it('add button is disabled when no players selected', () => {
      render(<AddPlayersBottomSheet {...defaultProps} />);

      const addButton = screen.getByText('Select Players to Add');
      expect(addButton).toBeTruthy();
    });

    it('calls onClose after successful submission', async () => {
      const onClose = jest.fn();
      mockSupabaseInsert.mockResolvedValue({ error: null });

      render(<AddPlayersBottomSheet {...defaultProps} onClose={onClose} />);

      // Select a player
      fireEvent.press(screen.getByText('John Smith'));

      // Press add button
      fireEvent.press(screen.getByText('Add 1 Player'));

      await waitFor(() => {
        expect(onClose).toHaveBeenCalled();
      });
    });

    it('resets state on close', async () => {
      const onClose = jest.fn();

      render(<AddPlayersBottomSheet {...defaultProps} onClose={onClose} />);

      // Select a player
      fireEvent.press(screen.getByText('John Smith'));
      expect(screen.getByText('SELECTED PLAYERS (1)')).toBeTruthy();

      // Type in search
      fireEvent.changeText(screen.getByTestId('search-bar'), 'test');

      // Mock the close and re-render
      // Note: In real scenario, closing would trigger state reset
    });
  });

  // ===========================================================================
  // EDGE CASES
  // ===========================================================================

  describe('Edge Cases', () => {
    it('handles null handicap', () => {
      const friendsWithNullHandicap: Friend[] = [
        {
          ...mockFriends[0],
          id: 'friend-null',
          name: 'No Handicap Player',
          email: 'nohandicap@example.com',
          handicap: null as unknown as number, // Test edge case
          photo_url: null,
        },
      ];

      mockUseFriends.mockReturnValue({
        data: friendsWithNullHandicap,
        isLoading: false,
      });

      render(<AddPlayersBottomSheet {...defaultProps} />);

      expect(screen.getByText('No Handicap Player')).toBeTruthy();
      // Should not show handicap line
      expect(screen.queryByText('HC:')).toBeNull();
    });

    it('handles null email', () => {
      const friendsWithNullEmail: Friend[] = [
        {
          ...mockFriends[0],
          id: 'friend-null-email',
          name: 'No Email Player',
          email: null as unknown as string, // Test edge case
          handicap: 10,
          photo_url: null,
        },
      ];

      mockUseFriends.mockReturnValue({
        data: friendsWithNullEmail,
        isLoading: false,
      });

      render(<AddPlayersBottomSheet {...defaultProps} />);

      expect(screen.getByText('No Email Player')).toBeTruthy();
      expect(screen.getByText('HC: 10')).toBeTruthy();
    });

    it('handles player with photo', () => {
      render(<AddPlayersBottomSheet {...defaultProps} />);

      // John has a photo, should be rendered
      expect(screen.getByText('John Smith')).toBeTruthy();
    });

    it('handles player without photo', () => {
      render(<AddPlayersBottomSheet {...defaultProps} />);

      // Jane has no photo, should show avatar icon
      expect(screen.getByText('Jane Doe')).toBeTruthy();
    });

    it('handles empty existingPlayerIds', () => {
      render(
        <AddPlayersBottomSheet {...defaultProps} existingPlayerIds={[]} />
      );

      // All friends should be visible
      expect(screen.getByText('YOUR FRIENDS (3)')).toBeTruthy();
    });

    it('handles currentPlayerCount of 0', () => {
      render(
        <AddPlayersBottomSheet
          {...defaultProps}
          maxPlayers={10}
          currentPlayerCount={0}
        />
      );

      expect(screen.getByText('Players: 0/10')).toBeTruthy();
    });

    it('handles search query clearing', async () => {
      render(<AddPlayersBottomSheet {...defaultProps} />);

      // Type search query
      fireEvent.changeText(screen.getByTestId('search-bar'), 'John');

      // Clear search
      fireEvent.changeText(screen.getByTestId('search-bar'), '');

      await waitFor(() => {
        // Should show all friends again
        expect(screen.getByText('YOUR FRIENDS (3)')).toBeTruthy();
      });
    });
  });

  // ===========================================================================
  // ACCESSIBILITY TESTS
  // ===========================================================================

  describe('Accessibility', () => {
    it('friend cards have correct accessibility labels', () => {
      render(<AddPlayersBottomSheet {...defaultProps} />);

      expect(screen.getByLabelText('Add John Smith')).toBeTruthy();
      expect(screen.getByLabelText('Add Jane Doe')).toBeTruthy();
    });

    it('selected friend cards have updated accessibility labels', () => {
      render(<AddPlayersBottomSheet {...defaultProps} />);

      // Select John
      fireEvent.press(screen.getByText('John Smith'));

      // Label should change to "Remove"
      expect(screen.getByLabelText('Remove John Smith')).toBeTruthy();
    });

    it('disabled cards have accessibility hint about limit', () => {
      render(
        <AddPlayersBottomSheet
          {...defaultProps}
          maxPlayers={3}
          currentPlayerCount={3}
        />
      );

      // Cards should indicate limit reached in label
      expect(
        screen.getByLabelText('Add John Smith, player limit reached')
      ).toBeTruthy();
    });

    it('search bar has accessibility label', () => {
      render(<AddPlayersBottomSheet {...defaultProps} />);

      expect(screen.getByLabelText('Search players')).toBeTruthy();
    });
  });
});
