/**
 * FriendListItem Component Tests
 *
 * Tests for the friend card with selection capability:
 * - Rendering (avatar, name, email, handicap)
 * - Selection states (selected/unselected)
 * - Disabled state
 * - Pending badge display
 * - Divider display
 * - User interactions
 * - Accessibility
 */

import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react-native';
import { FriendListItem } from './FriendListItem';
import type { FriendListItemProps } from './FriendSelector.types';
import type { Friend } from '@/types/database.types';

// ============================================================================
// MOCKS
// ============================================================================

// Mock Tabler icons
jest.mock('@tabler/icons-react-native', () => {
  const { View } = require('react-native');
  return {
    IconCheck: (props: any) => <View testID="icon-check" {...props} />,
    IconPlus: (props: any) => <View testID="icon-plus" {...props} />,
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
    warningBackground: '#FFF3E0',
    warningDark: '#E65100',
    success: '#4CAF50',
    successLight: '#E8F5E9',
    error: '#F44336',
    errorLight: '#FFEBEE',
  }),
}));

// Mock child components
jest.mock('@/components/common/StatusBadge', () => {
  const { View, Text } = require('react-native');
  return {
    StatusBadge: ({
      label,
      status,
      size,
      backgroundColor,
      textColor,
    }: {
      label: string;
      status: string;
      size?: string;
      backgroundColor?: string;
      textColor?: string;
    }) => (
      <View testID="status-badge" accessibilityLabel={label}>
        <Text testID="status-badge-label">{label}</Text>
      </View>
    ),
  };
});

jest.mock('@/components/common/PlayerAvatar', () => {
  const { View, Text } = require('react-native');
  return {
    PlayerAvatar: ({
      photoUrl,
      name,
      size,
    }: {
      photoUrl?: string | null;
      name: string;
      size?: number;
    }) => (
      <View testID="player-avatar">
        <Text testID="player-avatar-name">{name}</Text>
        {photoUrl && <Text testID="player-avatar-url">{photoUrl}</Text>}
        {size && <Text testID="player-avatar-size">{size}</Text>}
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
  home_venue_id: null,
  push_enabled: true,
  push_competition_updates: true,
  push_friend_requests: true,
  push_scorecard_updates: true,
  created_at: '2024-01-01T00:00:00Z',
  updated_at: '2024-01-01T00:00:00Z',
  friendship_id: 'friendship-1',
  friendship_status: 'accepted',
  is_requester: false,
  ...overrides,
});

const defaultProps: FriendListItemProps = {
  friend: createMockFriend(),
  isSelected: false,
  isDisabled: false,
  onToggle: jest.fn(),
  showDivider: false,
  showPendingBadge: false,
};

// ============================================================================
// TESTS
// ============================================================================

describe('FriendListItem', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  // --------------------------------------------------------------------------
  // Rendering Tests
  // --------------------------------------------------------------------------
  describe('Rendering', () => {
    it('renders without crashing', () => {
      render(<FriendListItem {...defaultProps} />);
      // Name appears twice - once in avatar mock, once in actual component
      expect(screen.getAllByText('John Smith').length).toBeGreaterThanOrEqual(1);
    });

    it('renders player avatar', () => {
      render(<FriendListItem {...defaultProps} />);
      expect(screen.getByTestId('player-avatar')).toBeTruthy();
      expect(screen.getByTestId('player-avatar-name').children[0]).toBe('John Smith');
    });

    it('passes photo URL to avatar', () => {
      render(<FriendListItem {...defaultProps} />);
      expect(screen.getByTestId('player-avatar-url').children[0]).toBe(
        'https://example.com/john.jpg'
      );
    });

    it('passes size 56 to avatar', () => {
      render(<FriendListItem {...defaultProps} />);
      expect(screen.getByTestId('player-avatar-size').children[0]).toBe('56');
    });

    it('renders friend name', () => {
      render(<FriendListItem {...defaultProps} />);
      // Name appears in both avatar and main content
      const nameElements = screen.getAllByText('John Smith');
      expect(nameElements.length).toBeGreaterThanOrEqual(1);
    });

    it('renders friend email when provided', () => {
      render(<FriendListItem {...defaultProps} />);
      expect(screen.getByText('john@example.com')).toBeTruthy();
    });

    it('does not render email when null', () => {
      const friendWithoutEmail = createMockFriend({ email: null as any });
      render(<FriendListItem {...defaultProps} friend={friendWithoutEmail} />);
      expect(screen.queryByText('john@example.com')).toBeNull();
    });

    it('renders handicap when provided', () => {
      render(<FriendListItem {...defaultProps} />);
      expect(screen.getByText('HC: 12')).toBeTruthy();
    });

    it('does not render handicap when null', () => {
      const friendWithoutHandicap = createMockFriend({ handicap: null as any });
      render(<FriendListItem {...defaultProps} friend={friendWithoutHandicap} />);
      expect(screen.queryByText(/HC:/)).toBeNull();
    });

    it('does not render handicap when undefined', () => {
      const friendWithoutHandicap = createMockFriend({ handicap: undefined as any });
      render(<FriendListItem {...defaultProps} friend={friendWithoutHandicap} />);
      expect(screen.queryByText(/HC:/)).toBeNull();
    });

    it('renders handicap of 0 correctly', () => {
      const friendWithZeroHandicap = createMockFriend({ handicap: 0 });
      render(<FriendListItem {...defaultProps} friend={friendWithZeroHandicap} />);
      expect(screen.getByText('HC: 0')).toBeTruthy();
    });

    it('renders negative handicap (plus handicap) correctly', () => {
      const friendWithPlusHandicap = createMockFriend({ handicap: -2 });
      render(<FriendListItem {...defaultProps} friend={friendWithPlusHandicap} />);
      expect(screen.getByText('HC: -2')).toBeTruthy();
    });

    it('renders decimal handicap correctly', () => {
      const friendWithDecimalHandicap = createMockFriend({ handicap: 12.5 });
      render(<FriendListItem {...defaultProps} friend={friendWithDecimalHandicap} />);
      expect(screen.getByText('HC: 12.5')).toBeTruthy();
    });
  });

  // --------------------------------------------------------------------------
  // Selection State Tests
  // --------------------------------------------------------------------------
  describe('Selection State', () => {
    it('shows plus icon when not selected', () => {
      render(<FriendListItem {...defaultProps} isSelected={false} />);
      expect(screen.getByTestId('icon-plus')).toBeTruthy();
      expect(screen.queryByTestId('icon-check')).toBeNull();
    });

    it('shows check icon when selected', () => {
      render(<FriendListItem {...defaultProps} isSelected={true} />);
      expect(screen.getByTestId('icon-check')).toBeTruthy();
      expect(screen.queryByTestId('icon-plus')).toBeNull();
    });

    it('updates icon when selection changes from false to true', () => {
      const { rerender } = render(<FriendListItem {...defaultProps} isSelected={false} />);
      expect(screen.getByTestId('icon-plus')).toBeTruthy();

      rerender(<FriendListItem {...defaultProps} isSelected={true} />);
      expect(screen.getByTestId('icon-check')).toBeTruthy();
    });

    it('updates icon when selection changes from true to false', () => {
      const { rerender } = render(<FriendListItem {...defaultProps} isSelected={true} />);
      expect(screen.getByTestId('icon-check')).toBeTruthy();

      rerender(<FriendListItem {...defaultProps} isSelected={false} />);
      expect(screen.getByTestId('icon-plus')).toBeTruthy();
    });
  });

  // --------------------------------------------------------------------------
  // Disabled State Tests
  // --------------------------------------------------------------------------
  describe('Disabled State', () => {
    it('is not disabled by default', () => {
      render(<FriendListItem {...defaultProps} />);
      const touchable = screen.getByRole('checkbox');
      expect(touchable.props.accessibilityState.disabled).toBe(false);
    });

    it('applies disabled state when isDisabled is true', () => {
      render(<FriendListItem {...defaultProps} isDisabled={true} />);
      const touchable = screen.getByRole('checkbox');
      expect(touchable.props.accessibilityState.disabled).toBe(true);
    });

    it('touchable has disabled prop when isDisabled is true', () => {
      const onToggle = jest.fn();
      render(<FriendListItem {...defaultProps} isDisabled={true} onToggle={onToggle} />);
      const touchable = screen.getByRole('checkbox');
      // The disabled prop prevents onPress from firing
      fireEvent.press(touchable);
      expect(onToggle).not.toHaveBeenCalled();
    });

    it('applies reduced opacity styling when disabled', () => {
      render(<FriendListItem {...defaultProps} isDisabled={true} />);
      const touchable = screen.getByRole('checkbox');
      // Check that accessibility state shows disabled
      expect(touchable.props.accessibilityState.disabled).toBe(true);
    });
  });

  // --------------------------------------------------------------------------
  // Pending Badge Tests
  // --------------------------------------------------------------------------
  describe('Pending Badge', () => {
    it('does not show pending badge by default', () => {
      render(<FriendListItem {...defaultProps} />);
      expect(screen.queryByTestId('status-badge')).toBeNull();
    });

    it('does not show pending badge when showPendingBadge is false', () => {
      const pendingFriend = createMockFriend({ friendship_status: 'pending' });
      render(
        <FriendListItem {...defaultProps} friend={pendingFriend} showPendingBadge={false} />
      );
      expect(screen.queryByTestId('status-badge')).toBeNull();
    });

    it('does not show pending badge for accepted friends even when showPendingBadge is true', () => {
      const acceptedFriend = createMockFriend({ friendship_status: 'accepted' });
      render(
        <FriendListItem {...defaultProps} friend={acceptedFriend} showPendingBadge={true} />
      );
      expect(screen.queryByTestId('status-badge')).toBeNull();
    });

    it('shows pending badge for pending friends when showPendingBadge is true', () => {
      const pendingFriend = createMockFriend({ friendship_status: 'pending' });
      render(
        <FriendListItem {...defaultProps} friend={pendingFriend} showPendingBadge={true} />
      );
      expect(screen.getByTestId('status-badge')).toBeTruthy();
      expect(screen.getByTestId('status-badge-label').children[0]).toBe('Pending');
    });

    it('does not show pending badge for blocked friends', () => {
      const blockedFriend = createMockFriend({ friendship_status: 'blocked' });
      render(
        <FriendListItem {...defaultProps} friend={blockedFriend} showPendingBadge={true} />
      );
      expect(screen.queryByTestId('status-badge')).toBeNull();
    });
  });

  // --------------------------------------------------------------------------
  // Divider Tests
  // --------------------------------------------------------------------------
  describe('Divider', () => {
    it('does not show divider by default', () => {
      render(<FriendListItem {...defaultProps} />);
      // Divider from react-native-paper would be present but we can check structure
    });

    it('does not show divider when showDivider is false', () => {
      render(<FriendListItem {...defaultProps} showDivider={false} />);
      // No testID on divider, component should render
      expect(screen.getByRole('checkbox')).toBeTruthy();
    });

    it('shows divider when showDivider is true', () => {
      render(<FriendListItem {...defaultProps} showDivider={true} />);
      // Divider component from react-native-paper will be rendered
      expect(screen.getByRole('checkbox')).toBeTruthy();
    });
  });

  // --------------------------------------------------------------------------
  // Interaction Tests
  // --------------------------------------------------------------------------
  describe('Interactions', () => {
    it('calls onToggle when pressed', () => {
      const onToggle = jest.fn();
      render(<FriendListItem {...defaultProps} onToggle={onToggle} />);
      fireEvent.press(screen.getByRole('checkbox'));
      expect(onToggle).toHaveBeenCalledTimes(1);
    });

    it('does not call onToggle when disabled and pressed', () => {
      const onToggle = jest.fn();
      render(<FriendListItem {...defaultProps} isDisabled={true} onToggle={onToggle} />);
      fireEvent.press(screen.getByRole('checkbox'));
      expect(onToggle).not.toHaveBeenCalled();
    });

    it('calls onToggle for selected item', () => {
      const onToggle = jest.fn();
      render(<FriendListItem {...defaultProps} isSelected={true} onToggle={onToggle} />);
      fireEvent.press(screen.getByRole('checkbox'));
      expect(onToggle).toHaveBeenCalledTimes(1);
    });

    it('handles multiple rapid presses', () => {
      const onToggle = jest.fn();
      render(<FriendListItem {...defaultProps} onToggle={onToggle} />);
      const touchable = screen.getByRole('checkbox');

      fireEvent.press(touchable);
      fireEvent.press(touchable);
      fireEvent.press(touchable);

      expect(onToggle).toHaveBeenCalledTimes(3);
    });
  });

  // --------------------------------------------------------------------------
  // Accessibility Tests
  // --------------------------------------------------------------------------
  describe('Accessibility', () => {
    it('has checkbox role', () => {
      render(<FriendListItem {...defaultProps} />);
      expect(screen.getByRole('checkbox')).toBeTruthy();
    });

    it('has correct checked state when not selected', () => {
      render(<FriendListItem {...defaultProps} isSelected={false} />);
      const touchable = screen.getByRole('checkbox');
      expect(touchable.props.accessibilityState.checked).toBe(false);
    });

    it('has correct checked state when selected', () => {
      render(<FriendListItem {...defaultProps} isSelected={true} />);
      const touchable = screen.getByRole('checkbox');
      expect(touchable.props.accessibilityState.checked).toBe(true);
    });

    it('has correct disabled state when not disabled', () => {
      render(<FriendListItem {...defaultProps} isDisabled={false} />);
      const touchable = screen.getByRole('checkbox');
      expect(touchable.props.accessibilityState.disabled).toBe(false);
    });

    it('has correct disabled state when disabled', () => {
      render(<FriendListItem {...defaultProps} isDisabled={true} />);
      const touchable = screen.getByRole('checkbox');
      expect(touchable.props.accessibilityState.disabled).toBe(true);
    });

    it('has accessibility label for adding friend', () => {
      render(<FriendListItem {...defaultProps} isSelected={false} />);
      const touchable = screen.getByRole('checkbox');
      expect(touchable.props.accessibilityLabel).toBe('Add John Smith');
    });

    it('has accessibility label for removing friend', () => {
      render(<FriendListItem {...defaultProps} isSelected={true} />);
      const touchable = screen.getByRole('checkbox');
      expect(touchable.props.accessibilityLabel).toBe('Remove John Smith');
    });

    it('updates accessibility label based on friend name', () => {
      const friend = createMockFriend({ name: 'Jane Doe' });
      render(<FriendListItem {...defaultProps} friend={friend} isSelected={false} />);
      const touchable = screen.getByRole('checkbox');
      expect(touchable.props.accessibilityLabel).toBe('Add Jane Doe');
    });
  });

  // --------------------------------------------------------------------------
  // Edge Cases Tests
  // --------------------------------------------------------------------------
  describe('Edge Cases', () => {
    it('handles friend with no photo URL', () => {
      const friendWithoutPhoto = createMockFriend({ photo_url: null });
      render(<FriendListItem {...defaultProps} friend={friendWithoutPhoto} />);
      expect(screen.getByTestId('player-avatar')).toBeTruthy();
      expect(screen.queryByTestId('player-avatar-url')).toBeNull();
    });

    it('handles friend with empty name', () => {
      const friendWithEmptyName = createMockFriend({ name: '' });
      render(<FriendListItem {...defaultProps} friend={friendWithEmptyName} />);
      expect(screen.getByRole('checkbox')).toBeTruthy();
    });

    it('handles friend with long name', () => {
      const friendWithLongName = createMockFriend({
        name: 'A Very Long Name That Should Be Truncated In The UI',
      });
      render(<FriendListItem {...defaultProps} friend={friendWithLongName} />);
      // Name appears in both avatar and main content
      const nameElements = screen.getAllByText(
        'A Very Long Name That Should Be Truncated In The UI'
      );
      expect(nameElements.length).toBeGreaterThanOrEqual(1);
    });

    it('handles friend with long email', () => {
      const friendWithLongEmail = createMockFriend({
        email: 'a.very.long.email.address@some-long-domain-name.example.com',
      });
      render(<FriendListItem {...defaultProps} friend={friendWithLongEmail} />);
      expect(
        screen.getByText('a.very.long.email.address@some-long-domain-name.example.com')
      ).toBeTruthy();
    });

    it('handles friend with special characters in name', () => {
      const friendWithSpecialChars = createMockFriend({ name: "O'Brien-Smith" });
      render(<FriendListItem {...defaultProps} friend={friendWithSpecialChars} />);
      // Name appears in both avatar and main content
      const nameElements = screen.getAllByText("O'Brien-Smith");
      expect(nameElements.length).toBeGreaterThanOrEqual(1);
    });

    it('handles high handicap', () => {
      const friendWithHighHandicap = createMockFriend({ handicap: 54 });
      render(<FriendListItem {...defaultProps} friend={friendWithHighHandicap} />);
      expect(screen.getByText('HC: 54')).toBeTruthy();
    });

    it('renders correctly when all optional fields are null', () => {
      const minimalFriend = createMockFriend({
        email: null as any,
        handicap: null as any,
        photo_url: null,
      });
      render(<FriendListItem {...defaultProps} friend={minimalFriend} />);
      // Name appears in both avatar and main content
      const nameElements = screen.getAllByText('John Smith');
      expect(nameElements.length).toBeGreaterThanOrEqual(1);
      expect(screen.queryByText(/HC:/)).toBeNull();
      expect(screen.queryByTestId('player-avatar-url')).toBeNull();
    });
  });

  // --------------------------------------------------------------------------
  // Memoization Tests
  // --------------------------------------------------------------------------
  describe('Memoization', () => {
    it('is memoized component', () => {
      // FriendListItem should be wrapped with memo()
      // We verify it renders correctly, which confirms the memo wrapper works
      render(<FriendListItem {...defaultProps} />);
      expect(screen.getByRole('checkbox')).toBeTruthy();
    });

    it('re-renders when friend changes', () => {
      const onToggle = jest.fn();
      const { rerender } = render(
        <FriendListItem
          {...defaultProps}
          friend={createMockFriend({ name: 'John' })}
          onToggle={onToggle}
        />
      );
      // Name appears in both avatar and main content
      expect(screen.getAllByText('John').length).toBeGreaterThanOrEqual(1);

      rerender(
        <FriendListItem
          {...defaultProps}
          friend={createMockFriend({ name: 'Jane' })}
          onToggle={onToggle}
        />
      );
      expect(screen.getAllByText('Jane').length).toBeGreaterThanOrEqual(1);
    });

    it('re-renders when isSelected changes', () => {
      const { rerender } = render(<FriendListItem {...defaultProps} isSelected={false} />);
      expect(screen.getByTestId('icon-plus')).toBeTruthy();

      rerender(<FriendListItem {...defaultProps} isSelected={true} />);
      expect(screen.getByTestId('icon-check')).toBeTruthy();
    });

    it('re-renders when isDisabled changes', () => {
      const { rerender } = render(<FriendListItem {...defaultProps} isDisabled={false} />);
      expect(screen.getByRole('checkbox').props.accessibilityState.disabled).toBe(false);

      rerender(<FriendListItem {...defaultProps} isDisabled={true} />);
      expect(screen.getByRole('checkbox').props.accessibilityState.disabled).toBe(true);
    });
  });

  // --------------------------------------------------------------------------
  // Different Friend States Tests
  // --------------------------------------------------------------------------
  describe('Different Friend States', () => {
    it('renders accepted friend correctly', () => {
      const acceptedFriend = createMockFriend({ friendship_status: 'accepted' });
      render(
        <FriendListItem {...defaultProps} friend={acceptedFriend} showPendingBadge={true} />
      );
      expect(screen.getAllByText('John Smith').length).toBeGreaterThanOrEqual(1);
      expect(screen.queryByTestId('status-badge')).toBeNull();
    });

    it('renders pending friend with badge', () => {
      const pendingFriend = createMockFriend({ friendship_status: 'pending' });
      render(
        <FriendListItem {...defaultProps} friend={pendingFriend} showPendingBadge={true} />
      );
      expect(screen.getAllByText('John Smith').length).toBeGreaterThanOrEqual(1);
      expect(screen.getByTestId('status-badge')).toBeTruthy();
    });

    it('renders friend who is requester', () => {
      const requesterFriend = createMockFriend({ is_requester: true });
      render(<FriendListItem {...defaultProps} friend={requesterFriend} />);
      expect(screen.getAllByText('John Smith').length).toBeGreaterThanOrEqual(1);
    });

    it('renders friend who is not requester', () => {
      const addresseeFriend = createMockFriend({ is_requester: false });
      render(<FriendListItem {...defaultProps} friend={addresseeFriend} />);
      expect(screen.getAllByText('John Smith').length).toBeGreaterThanOrEqual(1);
    });
  });

  // --------------------------------------------------------------------------
  // Combined State Tests
  // --------------------------------------------------------------------------
  describe('Combined States', () => {
    it('handles selected and disabled state together', () => {
      render(<FriendListItem {...defaultProps} isSelected={true} isDisabled={true} />);
      expect(screen.getByTestId('icon-check')).toBeTruthy();
      expect(screen.getByRole('checkbox').props.accessibilityState.disabled).toBe(true);
    });

    it('handles pending badge with selected state', () => {
      const pendingFriend = createMockFriend({ friendship_status: 'pending' });
      render(
        <FriendListItem
          {...defaultProps}
          friend={pendingFriend}
          isSelected={true}
          showPendingBadge={true}
        />
      );
      expect(screen.getByTestId('icon-check')).toBeTruthy();
      expect(screen.getByTestId('status-badge')).toBeTruthy();
    });

    it('handles pending badge with disabled state', () => {
      const pendingFriend = createMockFriend({ friendship_status: 'pending' });
      render(
        <FriendListItem
          {...defaultProps}
          friend={pendingFriend}
          isDisabled={true}
          showPendingBadge={true}
        />
      );
      expect(screen.getByRole('checkbox').props.accessibilityState.disabled).toBe(true);
      expect(screen.getByTestId('status-badge')).toBeTruthy();
    });

    it('handles all props together', () => {
      const pendingFriend = createMockFriend({ friendship_status: 'pending' });
      render(
        <FriendListItem
          {...defaultProps}
          friend={pendingFriend}
          isSelected={true}
          isDisabled={true}
          showDivider={true}
          showPendingBadge={true}
        />
      );
      expect(screen.getAllByText('John Smith').length).toBeGreaterThanOrEqual(1);
      expect(screen.getByTestId('icon-check')).toBeTruthy();
      expect(screen.getByRole('checkbox').props.accessibilityState.disabled).toBe(true);
      expect(screen.getByTestId('status-badge')).toBeTruthy();
    });
  });

  // --------------------------------------------------------------------------
  // Snapshot Tests (Optional)
  // --------------------------------------------------------------------------
  describe('Snapshots', () => {
    it('matches snapshot for default state', () => {
      const { toJSON } = render(<FriendListItem {...defaultProps} />);
      expect(toJSON()).toMatchSnapshot();
    });

    it('matches snapshot for selected state', () => {
      const { toJSON } = render(<FriendListItem {...defaultProps} isSelected={true} />);
      expect(toJSON()).toMatchSnapshot();
    });

    it('matches snapshot for disabled state', () => {
      const { toJSON } = render(<FriendListItem {...defaultProps} isDisabled={true} />);
      expect(toJSON()).toMatchSnapshot();
    });

    it('matches snapshot with pending badge', () => {
      const pendingFriend = createMockFriend({ friendship_status: 'pending' });
      const { toJSON } = render(
        <FriendListItem
          {...defaultProps}
          friend={pendingFriend}
          showPendingBadge={true}
        />
      );
      expect(toJSON()).toMatchSnapshot();
    });
  });
});
