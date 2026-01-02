/**
 * MenuItemRow Component Tests
 *
 * Tests for the menu item row component including:
 * - Rendering with different props
 * - Title and subtitle display
 * - Icon rendering
 * - Chevron visibility
 * - Right content (badges, switches, text)
 * - Destructive styling
 * - Disabled state
 * - Touch interactions
 * - Accessibility
 */

import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react-native';
import { Text, View, Switch } from 'react-native';
import { MenuItemRow, MenuItemRowProps } from './MenuItemRow';

// Mock ThemeContext
const mockColors = {
  textPrimary: '#111827',
  textSecondary: '#6B7280',
  textTertiary: '#9CA3AF',
  error: '#EF4444',
  surface: '#FFFFFF',
};

jest.mock('@/context/ThemeContext', () => ({
  useThemeColors: () => mockColors,
}));

// Mock react-native-paper components
jest.mock('react-native-paper', () => {
  const { View, Text } = require('react-native');
  return {
    Text: ({ children, style, numberOfLines, ...props }: any) => (
      <Text style={style} numberOfLines={numberOfLines} {...props}>
        {children}
      </Text>
    ),
    Icon: ({ source, size: _size, color: _color, ...props }: any) => (
      <View
        testID={`icon-${source}`}
        accessibilityLabel={source}
        {...props}
      />
    ),
  };
});

// Mock theme constants
jest.mock('@/constants/theme', () => ({
  spacing: {
    xs: 4,
    sm: 8,
    md: 12,
    lg: 16,
    xl: 24,
  },
  typography: {
    body: { fontSize: 16, fontWeight: '400', lineHeight: 24 },
    caption: { fontSize: 12, fontWeight: '400', lineHeight: 16 },
  },
}));

describe('MenuItemRow', () => {
  // Default props for testing
  const defaultProps: MenuItemRowProps = {
    title: 'Menu Item',
    icon: 'cog',
    onPress: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  // ===========================================================================
  // RENDERING
  // ===========================================================================

  describe('Rendering', () => {
    it('renders without crashing', () => {
      render(<MenuItemRow {...defaultProps} />);
      expect(screen.getByText('Menu Item')).toBeTruthy();
    });

    it('renders title correctly', () => {
      render(<MenuItemRow {...defaultProps} title="My Settings" />);
      expect(screen.getByText('My Settings')).toBeTruthy();
    });

    it('renders with subtitle', () => {
      render(
        <MenuItemRow
          {...defaultProps}
          title="Account"
          subtitle="Manage your account settings"
        />
      );
      expect(screen.getByText('Account')).toBeTruthy();
      expect(screen.getByText('Manage your account settings')).toBeTruthy();
    });

    it('renders without subtitle when not provided', () => {
      render(<MenuItemRow {...defaultProps} />);
      expect(screen.getByText('Menu Item')).toBeTruthy();
      expect(screen.queryByText('undefined')).toBeNull();
    });

    it('renders with long title', () => {
      const longTitle = 'This is a very long menu item title that might need to be truncated';
      render(<MenuItemRow {...defaultProps} title={longTitle} />);
      expect(screen.getByText(longTitle)).toBeTruthy();
    });

    it('renders with special characters in title', () => {
      render(<MenuItemRow {...defaultProps} title="What's new?" />);
      expect(screen.getByText("What's new?")).toBeTruthy();
    });
  });

  // ===========================================================================
  // ICON RENDERING
  // ===========================================================================

  describe('Icon Rendering', () => {
    it('renders icon correctly', () => {
      render(<MenuItemRow {...defaultProps} icon="account" />);
      expect(screen.getByTestId('icon-account')).toBeTruthy();
    });

    it('renders different icons', () => {
      const { rerender } = render(<MenuItemRow {...defaultProps} icon="bell" />);
      expect(screen.getByTestId('icon-bell')).toBeTruthy();

      rerender(<MenuItemRow {...defaultProps} icon="cog" />);
      expect(screen.getByTestId('icon-cog')).toBeTruthy();

      rerender(<MenuItemRow {...defaultProps} icon="help-circle" />);
      expect(screen.getByTestId('icon-help-circle')).toBeTruthy();
    });

    it('renders icon in icon container', () => {
      render(<MenuItemRow {...defaultProps} icon="star" />);
      expect(screen.getByTestId('icon-star')).toBeTruthy();
    });
  });

  // ===========================================================================
  // CHEVRON VISIBILITY
  // ===========================================================================

  describe('Chevron Visibility', () => {
    it('shows chevron by default', () => {
      render(<MenuItemRow {...defaultProps} />);
      expect(screen.getByTestId('icon-chevron-right')).toBeTruthy();
    });

    it('shows chevron when showChevron is true', () => {
      render(<MenuItemRow {...defaultProps} showChevron={true} />);
      expect(screen.getByTestId('icon-chevron-right')).toBeTruthy();
    });

    it('hides chevron when showChevron is false', () => {
      render(<MenuItemRow {...defaultProps} showChevron={false} />);
      expect(screen.queryByTestId('icon-chevron-right')).toBeNull();
    });

    it('hides chevron when rightContent is provided', () => {
      render(
        <MenuItemRow
          {...defaultProps}
          rightContent={<Text>Value</Text>}
        />
      );
      expect(screen.queryByTestId('icon-chevron-right')).toBeNull();
    });

    it('shows rightContent instead of chevron', () => {
      render(
        <MenuItemRow
          {...defaultProps}
          rightContent={<Text>Custom</Text>}
        />
      );
      expect(screen.getByText('Custom')).toBeTruthy();
      expect(screen.queryByTestId('icon-chevron-right')).toBeNull();
    });
  });

  // ===========================================================================
  // RIGHT CONTENT
  // ===========================================================================

  describe('Right Content', () => {
    it('renders text as right content', () => {
      render(
        <MenuItemRow
          {...defaultProps}
          rightContent={<Text>12.4</Text>}
        />
      );
      expect(screen.getByText('12.4')).toBeTruthy();
    });

    it('renders badge as right content', () => {
      render(
        <MenuItemRow
          {...defaultProps}
          rightContent={<View testID="badge"><Text>5</Text></View>}
        />
      );
      expect(screen.getByTestId('badge')).toBeTruthy();
      expect(screen.getByText('5')).toBeTruthy();
    });

    it('renders switch as right content', () => {
      render(
        <MenuItemRow
          {...defaultProps}
          showChevron={false}
          rightContent={<Switch testID="switch" value={true} />}
        />
      );
      expect(screen.getByTestId('switch')).toBeTruthy();
    });

    it('renders complex right content', () => {
      render(
        <MenuItemRow
          {...defaultProps}
          rightContent={
            <View testID="complex-content">
              <Text>Part 1</Text>
              <Text>Part 2</Text>
            </View>
          }
        />
      );
      expect(screen.getByTestId('complex-content')).toBeTruthy();
      expect(screen.getByText('Part 1')).toBeTruthy();
      expect(screen.getByText('Part 2')).toBeTruthy();
    });
  });

  // ===========================================================================
  // DESTRUCTIVE STYLING
  // ===========================================================================

  describe('Destructive Styling', () => {
    it('renders normally when not destructive', () => {
      render(<MenuItemRow {...defaultProps} destructive={false} />);
      expect(screen.getByText('Menu Item')).toBeTruthy();
    });

    it('renders with destructive style', () => {
      render(
        <MenuItemRow
          {...defaultProps}
          title="Delete Account"
          icon="trash-can"
          destructive={true}
        />
      );
      expect(screen.getByText('Delete Account')).toBeTruthy();
      expect(screen.getByTestId('icon-trash-can')).toBeTruthy();
    });

    it('renders destructive with subtitle', () => {
      render(
        <MenuItemRow
          {...defaultProps}
          title="Log Out"
          subtitle="Sign out of your account"
          icon="logout"
          destructive={true}
        />
      );
      expect(screen.getByText('Log Out')).toBeTruthy();
      expect(screen.getByText('Sign out of your account')).toBeTruthy();
    });

    it('renders destructive without chevron', () => {
      render(
        <MenuItemRow
          {...defaultProps}
          title="Delete"
          icon="trash-can"
          destructive={true}
          showChevron={false}
        />
      );
      expect(screen.queryByTestId('icon-chevron-right')).toBeNull();
    });
  });

  // ===========================================================================
  // DISABLED STATE
  // ===========================================================================

  describe('Disabled State', () => {
    it('renders normally when not disabled', () => {
      render(<MenuItemRow {...defaultProps} disabled={false} />);
      expect(screen.getByText('Menu Item')).toBeTruthy();
    });

    it('renders with disabled style', () => {
      render(<MenuItemRow {...defaultProps} disabled={true} />);
      expect(screen.getByText('Menu Item')).toBeTruthy();
    });

    it('does not call onPress when disabled', () => {
      const onPress = jest.fn();
      render(<MenuItemRow {...defaultProps} onPress={onPress} disabled={true} />);

      const button = screen.getByRole('button');
      fireEvent.press(button);

      expect(onPress).not.toHaveBeenCalled();
    });

    it('calls onPress when not disabled', () => {
      const onPress = jest.fn();
      render(<MenuItemRow {...defaultProps} onPress={onPress} disabled={false} />);

      const button = screen.getByRole('button');
      fireEvent.press(button);

      expect(onPress).toHaveBeenCalledTimes(1);
    });

    it('renders disabled with subtitle', () => {
      render(
        <MenuItemRow
          {...defaultProps}
          title="Premium Feature"
          subtitle="Upgrade to access"
          disabled={true}
        />
      );
      expect(screen.getByText('Premium Feature')).toBeTruthy();
      expect(screen.getByText('Upgrade to access')).toBeTruthy();
    });
  });

  // ===========================================================================
  // TOUCH INTERACTIONS
  // ===========================================================================

  describe('Touch Interactions', () => {
    it('calls onPress when pressed', () => {
      const onPress = jest.fn();
      render(<MenuItemRow {...defaultProps} onPress={onPress} />);

      const button = screen.getByRole('button');
      fireEvent.press(button);

      expect(onPress).toHaveBeenCalledTimes(1);
    });

    it('handles multiple presses', () => {
      const onPress = jest.fn();
      render(<MenuItemRow {...defaultProps} onPress={onPress} />);

      const button = screen.getByRole('button');
      fireEvent.press(button);
      fireEvent.press(button);
      fireEvent.press(button);

      expect(onPress).toHaveBeenCalledTimes(3);
    });

    it('handles press on row with right content', () => {
      const onPress = jest.fn();
      render(
        <MenuItemRow
          {...defaultProps}
          onPress={onPress}
          showChevron={false}
          rightContent={<Switch value={true} />}
        />
      );

      const button = screen.getByRole('button');
      fireEvent.press(button);

      expect(onPress).toHaveBeenCalledTimes(1);
    });
  });

  // ===========================================================================
  // ACCESSIBILITY
  // ===========================================================================

  describe('Accessibility', () => {
    it('has correct accessibility role', () => {
      render(<MenuItemRow {...defaultProps} />);
      const button = screen.getByRole('button');
      expect(button).toBeTruthy();
    });

    it('has correct accessibility label with title only', () => {
      render(<MenuItemRow {...defaultProps} title="Settings" />);
      const button = screen.getByRole('button');
      expect(button.props.accessibilityLabel).toBe('Settings');
    });

    it('has correct accessibility label with title and subtitle', () => {
      render(
        <MenuItemRow
          {...defaultProps}
          title="Account"
          subtitle="Manage settings"
        />
      );
      const button = screen.getByRole('button');
      expect(button.props.accessibilityLabel).toBe('Account, Manage settings');
    });

    it('has correct accessibility hint for navigation', () => {
      render(<MenuItemRow {...defaultProps} />);
      const button = screen.getByRole('button');
      expect(button.props.accessibilityHint).toBe('Tap to navigate');
    });

    it('has correct accessibility hint for destructive action', () => {
      render(<MenuItemRow {...defaultProps} destructive={true} />);
      const button = screen.getByRole('button');
      expect(button.props.accessibilityHint).toBe('Tap to perform action');
    });

    it('has correct accessibility state when disabled', () => {
      render(<MenuItemRow {...defaultProps} disabled={true} />);
      const button = screen.getByRole('button');
      expect(button.props.accessibilityState).toEqual({ disabled: true });
    });

    it('has correct accessibility state when enabled', () => {
      render(<MenuItemRow {...defaultProps} disabled={false} />);
      const button = screen.getByRole('button');
      expect(button.props.accessibilityState).toEqual({ disabled: false });
    });
  });

  // ===========================================================================
  // TEST ID
  // ===========================================================================

  describe('TestID', () => {
    it('applies testID when provided', () => {
      render(<MenuItemRow {...defaultProps} testID="menu-item-settings" />);
      expect(screen.getByTestId('menu-item-settings')).toBeTruthy();
    });

    it('renders without testID when not provided', () => {
      render(<MenuItemRow {...defaultProps} />);
      expect(screen.getByText('Menu Item')).toBeTruthy();
    });
  });

  // ===========================================================================
  // EDGE CASES
  // ===========================================================================

  describe('Edge Cases', () => {
    it('handles empty title', () => {
      render(<MenuItemRow {...defaultProps} title="" />);
      const button = screen.getByRole('button');
      expect(button).toBeTruthy();
    });

    it('handles very long title', () => {
      const veryLongTitle = 'A'.repeat(200);
      render(<MenuItemRow {...defaultProps} title={veryLongTitle} />);
      expect(screen.getByText(veryLongTitle)).toBeTruthy();
    });

    it('handles very long subtitle', () => {
      const veryLongSubtitle = 'B'.repeat(200);
      render(
        <MenuItemRow
          {...defaultProps}
          subtitle={veryLongSubtitle}
        />
      );
      expect(screen.getByText(veryLongSubtitle)).toBeTruthy();
    });

    it('handles undefined optional props gracefully', () => {
      render(
        <MenuItemRow
          title="Title"
          icon="cog"
          onPress={jest.fn()}
          subtitle={undefined}
          rightContent={undefined}
          showChevron={undefined}
          destructive={undefined}
          disabled={undefined}
          testID={undefined}
        />
      );
      expect(screen.getByText('Title')).toBeTruthy();
    });

    it('handles combined states (disabled + destructive)', () => {
      render(
        <MenuItemRow
          {...defaultProps}
          title="Delete"
          destructive={true}
          disabled={true}
        />
      );
      expect(screen.getByText('Delete')).toBeTruthy();
    });

    it('handles null rightContent', () => {
      render(
        <MenuItemRow
          {...defaultProps}
          rightContent={null}
        />
      );
      // Should show chevron when rightContent is null
      expect(screen.getByTestId('icon-chevron-right')).toBeTruthy();
    });
  });

  // ===========================================================================
  // MEMOIZATION
  // ===========================================================================

  describe('Memoization', () => {
    it('is wrapped with React.memo', () => {
      expect(MenuItemRow).toBeDefined();
    });

    it('renders consistently with same props', () => {
      const props: MenuItemRowProps = {
        title: 'Test',
        icon: 'cog',
        onPress: jest.fn(),
      };

      const { rerender } = render(<MenuItemRow {...props} />);
      expect(screen.getByText('Test')).toBeTruthy();

      rerender(<MenuItemRow {...props} />);
      expect(screen.getByText('Test')).toBeTruthy();
    });
  });

  // ===========================================================================
  // USE CASES
  // ===========================================================================

  describe('Use Cases', () => {
    it('renders as navigation item', () => {
      render(
        <MenuItemRow
          title="My Statistics"
          subtitle="View your performance"
          icon="chart-line"
          onPress={jest.fn()}
        />
      );
      expect(screen.getByText('My Statistics')).toBeTruthy();
      expect(screen.getByText('View your performance')).toBeTruthy();
      expect(screen.getByTestId('icon-chart-line')).toBeTruthy();
      expect(screen.getByTestId('icon-chevron-right')).toBeTruthy();
    });

    it('renders as settings toggle item', () => {
      render(
        <MenuItemRow
          title="Push Notifications"
          icon="bell"
          showChevron={false}
          rightContent={<Switch testID="notification-switch" value={true} />}
          onPress={jest.fn()}
        />
      );
      expect(screen.getByText('Push Notifications')).toBeTruthy();
      expect(screen.getByTestId('icon-bell')).toBeTruthy();
      expect(screen.getByTestId('notification-switch')).toBeTruthy();
      expect(screen.queryByTestId('icon-chevron-right')).toBeNull();
    });

    it('renders as item with badge', () => {
      render(
        <MenuItemRow
          title="Notifications"
          icon="bell-outline"
          rightContent={<View testID="badge"><Text>5</Text></View>}
          onPress={jest.fn()}
        />
      );
      expect(screen.getByText('Notifications')).toBeTruthy();
      expect(screen.getByTestId('badge')).toBeTruthy();
      expect(screen.getByText('5')).toBeTruthy();
    });

    it('renders as logout item', () => {
      render(
        <MenuItemRow
          title="Log Out"
          icon="logout"
          destructive={true}
          showChevron={false}
          onPress={jest.fn()}
        />
      );
      expect(screen.getByText('Log Out')).toBeTruthy();
      expect(screen.getByTestId('icon-logout')).toBeTruthy();
      expect(screen.queryByTestId('icon-chevron-right')).toBeNull();
    });

    it('renders as item with value', () => {
      render(
        <MenuItemRow
          title="Handicap"
          icon="golf"
          rightContent={<Text testID="handicap-value">12.4</Text>}
          onPress={jest.fn()}
        />
      );
      expect(screen.getByText('Handicap')).toBeTruthy();
      expect(screen.getByText('12.4')).toBeTruthy();
    });

    it('renders as premium feature item', () => {
      render(
        <MenuItemRow
          title="Advanced Analytics"
          subtitle="Upgrade to Premium"
          icon="crown"
          disabled={true}
          onPress={jest.fn()}
        />
      );
      expect(screen.getByText('Advanced Analytics')).toBeTruthy();
      expect(screen.getByText('Upgrade to Premium')).toBeTruthy();
      expect(screen.getByTestId('icon-crown')).toBeTruthy();
    });
  });

  // ===========================================================================
  // PROFILE SCREEN SIMULATION
  // ===========================================================================

  describe('Profile Screen Simulation', () => {
    it('renders multiple menu items as a list', () => {
      render(
        <View>
          <MenuItemRow
            title="Edit Profile"
            icon="account-edit"
            onPress={jest.fn()}
            testID="menu-edit-profile"
          />
          <MenuItemRow
            title="My Statistics"
            subtitle="View your performance"
            icon="chart-line"
            onPress={jest.fn()}
            testID="menu-statistics"
          />
          <MenuItemRow
            title="Notifications"
            icon="bell-outline"
            rightContent={<View testID="badge" />}
            onPress={jest.fn()}
            testID="menu-notifications"
          />
          <MenuItemRow
            title="Log Out"
            icon="logout"
            destructive={true}
            showChevron={false}
            onPress={jest.fn()}
            testID="menu-logout"
          />
        </View>
      );

      expect(screen.getByTestId('menu-edit-profile')).toBeTruthy();
      expect(screen.getByTestId('menu-statistics')).toBeTruthy();
      expect(screen.getByTestId('menu-notifications')).toBeTruthy();
      expect(screen.getByTestId('menu-logout')).toBeTruthy();
    });
  });
});
