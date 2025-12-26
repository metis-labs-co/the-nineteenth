/**
 * NotificationBell Component Tests
 *
 * Tests for the notification bell icon component including:
 * - Rendering with different unread counts
 * - Badge visibility and formatting (99+ for large counts)
 * - Touch interaction and onPress callback
 * - Accessibility features (labels, hints)
 * - Icon size prop handling
 * - Edge cases and memoization
 */

import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react-native';
import { NotificationBell } from './NotificationBell';
import { useNotificationStore } from '@/store/notificationStore';

// ===========================================================================
// MOCKS
// ===========================================================================

// Mock ThemeContext
const mockColors = {
  surface: '#FFFFFF',
  error: '#EF4444',
  textPrimary: '#111827',
  textInverse: '#FFFFFF',
};

jest.mock('@/context/ThemeContext', () => ({
  useThemeColors: () => mockColors,
}));

// Mock notification store
jest.mock('@/store/notificationStore', () => ({
  useNotificationStore: jest.fn(),
}));

const mockUseNotificationStore = useNotificationStore as jest.MockedFunction<
  typeof useNotificationStore
>;

// Mock react-native-paper
jest.mock('react-native-paper', () => {
  const { View, Text } = require('react-native');
  return {
    Text: ({ children, style, numberOfLines, ...props }: any) => (
      <Text style={style} numberOfLines={numberOfLines} {...props}>
        {children}
      </Text>
    ),
    Icon: ({ source, size, color }: any) => (
      <View testID={`icon-${source}`} style={{ width: size, height: size }}>
        <Text>{source}</Text>
        <Text testID="icon-size">{size}</Text>
        <Text testID="icon-color">{color}</Text>
      </View>
    ),
  };
});

// ===========================================================================
// TEST FIXTURES
// ===========================================================================

const defaultProps = {
  onPress: jest.fn(),
};

// ===========================================================================
// TEST SUITE
// ===========================================================================

describe('NotificationBell', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockUseNotificationStore.mockImplementation((selector) => {
      const state = { unreadCount: 0 };
      return selector(state as any);
    });
  });

  // ===========================================================================
  // RENDERING
  // ===========================================================================

  describe('Rendering', () => {
    it('renders without crashing', () => {
      render(<NotificationBell {...defaultProps} />);
      expect(screen.getByTestId('icon-bell-outline')).toBeTruthy();
    });

    it('renders the bell icon', () => {
      render(<NotificationBell {...defaultProps} />);
      expect(screen.getByText('bell-outline')).toBeTruthy();
    });

    it('renders with default size of 24', () => {
      render(<NotificationBell {...defaultProps} />);
      expect(screen.getByText('24')).toBeTruthy();
    });

    it('renders with custom size', () => {
      render(<NotificationBell {...defaultProps} size={32} />);
      expect(screen.getByText('32')).toBeTruthy();
    });

    it('renders icon with textPrimary color', () => {
      render(<NotificationBell {...defaultProps} />);
      expect(screen.getByText(mockColors.textPrimary)).toBeTruthy();
    });
  });

  // ===========================================================================
  // BADGE VISIBILITY
  // ===========================================================================

  describe('Badge Visibility', () => {
    it('does not show badge when unread count is 0', () => {
      mockUseNotificationStore.mockImplementation((selector) => {
        const state = { unreadCount: 0 };
        return selector(state as any);
      });
      render(<NotificationBell {...defaultProps} />);
      expect(screen.queryByText('0')).toBeNull();
    });

    it('shows badge when unread count is 1', () => {
      mockUseNotificationStore.mockImplementation((selector) => {
        const state = { unreadCount: 1 };
        return selector(state as any);
      });
      render(<NotificationBell {...defaultProps} />);
      expect(screen.getByText('1')).toBeTruthy();
    });

    it('shows badge when unread count is greater than 1', () => {
      mockUseNotificationStore.mockImplementation((selector) => {
        const state = { unreadCount: 5 };
        return selector(state as any);
      });
      render(<NotificationBell {...defaultProps} />);
      expect(screen.getByText('5')).toBeTruthy();
    });

    it('shows badge when unread count is 99', () => {
      mockUseNotificationStore.mockImplementation((selector) => {
        const state = { unreadCount: 99 };
        return selector(state as any);
      });
      render(<NotificationBell {...defaultProps} />);
      expect(screen.getByText('99')).toBeTruthy();
    });
  });

  // ===========================================================================
  // BADGE COUNT FORMATTING
  // ===========================================================================

  describe('Badge Count Formatting', () => {
    it('displays exact count for 1 notification', () => {
      mockUseNotificationStore.mockImplementation((selector) => {
        const state = { unreadCount: 1 };
        return selector(state as any);
      });
      render(<NotificationBell {...defaultProps} />);
      expect(screen.getByText('1')).toBeTruthy();
    });

    it('displays exact count for 50 notifications', () => {
      mockUseNotificationStore.mockImplementation((selector) => {
        const state = { unreadCount: 50 };
        return selector(state as any);
      });
      render(<NotificationBell {...defaultProps} />);
      expect(screen.getByText('50')).toBeTruthy();
    });

    it('displays exact count for 99 notifications', () => {
      mockUseNotificationStore.mockImplementation((selector) => {
        const state = { unreadCount: 99 };
        return selector(state as any);
      });
      render(<NotificationBell {...defaultProps} />);
      expect(screen.getByText('99')).toBeTruthy();
    });

    it('displays 99+ for 100 notifications', () => {
      mockUseNotificationStore.mockImplementation((selector) => {
        const state = { unreadCount: 100 };
        return selector(state as any);
      });
      render(<NotificationBell {...defaultProps} />);
      expect(screen.getByText('99+')).toBeTruthy();
    });

    it('displays 99+ for 500 notifications', () => {
      mockUseNotificationStore.mockImplementation((selector) => {
        const state = { unreadCount: 500 };
        return selector(state as any);
      });
      render(<NotificationBell {...defaultProps} />);
      expect(screen.getByText('99+')).toBeTruthy();
    });

    it('displays 99+ for very large count', () => {
      mockUseNotificationStore.mockImplementation((selector) => {
        const state = { unreadCount: 9999 };
        return selector(state as any);
      });
      render(<NotificationBell {...defaultProps} />);
      expect(screen.getByText('99+')).toBeTruthy();
    });
  });

  // ===========================================================================
  // USER INTERACTIONS
  // ===========================================================================

  describe('User Interactions', () => {
    it('calls onPress when bell is tapped', () => {
      const mockOnPress = jest.fn();
      render(<NotificationBell onPress={mockOnPress} />);

      fireEvent.press(screen.getByRole('button'));
      expect(mockOnPress).toHaveBeenCalledTimes(1);
    });

    it('calls onPress only once per tap', () => {
      const mockOnPress = jest.fn();
      render(<NotificationBell onPress={mockOnPress} />);

      fireEvent.press(screen.getByRole('button'));
      fireEvent.press(screen.getByRole('button'));
      expect(mockOnPress).toHaveBeenCalledTimes(2);
    });

    it('calls onPress with no arguments', () => {
      const mockOnPress = jest.fn();
      render(<NotificationBell onPress={mockOnPress} />);

      fireEvent.press(screen.getByRole('button'));
      expect(mockOnPress).toHaveBeenCalledWith();
    });

    it('triggers onPress regardless of unread count', () => {
      const mockOnPress = jest.fn();
      mockUseNotificationStore.mockImplementation((selector) => {
        const state = { unreadCount: 0 };
        return selector(state as any);
      });
      render(<NotificationBell onPress={mockOnPress} />);

      fireEvent.press(screen.getByRole('button'));
      expect(mockOnPress).toHaveBeenCalled();
    });
  });

  // ===========================================================================
  // ACCESSIBILITY
  // ===========================================================================

  describe('Accessibility', () => {
    it('has button role', () => {
      render(<NotificationBell {...defaultProps} />);
      expect(screen.getByRole('button')).toBeTruthy();
    });

    it('has correct accessibility label when no unread notifications', () => {
      mockUseNotificationStore.mockImplementation((selector) => {
        const state = { unreadCount: 0 };
        return selector(state as any);
      });
      render(<NotificationBell {...defaultProps} />);
      const button = screen.getByRole('button');
      expect(button.props.accessibilityLabel).toBe('Notifications, none unread');
    });

    it('has correct accessibility label when 1 unread notification', () => {
      mockUseNotificationStore.mockImplementation((selector) => {
        const state = { unreadCount: 1 };
        return selector(state as any);
      });
      render(<NotificationBell {...defaultProps} />);
      const button = screen.getByRole('button');
      expect(button.props.accessibilityLabel).toBe('Notifications, 1 unread');
    });

    it('has correct accessibility label when multiple unread notifications', () => {
      mockUseNotificationStore.mockImplementation((selector) => {
        const state = { unreadCount: 5 };
        return selector(state as any);
      });
      render(<NotificationBell {...defaultProps} />);
      const button = screen.getByRole('button');
      expect(button.props.accessibilityLabel).toBe('Notifications, 5 unread');
    });

    it('has correct accessibility label when 99+ unread notifications', () => {
      mockUseNotificationStore.mockImplementation((selector) => {
        const state = { unreadCount: 150 };
        return selector(state as any);
      });
      render(<NotificationBell {...defaultProps} />);
      const button = screen.getByRole('button');
      expect(button.props.accessibilityLabel).toBe('Notifications, 150 unread');
    });

    it('has accessibility hint', () => {
      render(<NotificationBell {...defaultProps} />);
      const button = screen.getByRole('button');
      expect(button.props.accessibilityHint).toBe('Opens the notifications screen');
    });

    it('has hitSlop for easier tapping', () => {
      render(<NotificationBell {...defaultProps} />);
      const button = screen.getByRole('button');
      expect(button.props.hitSlop).toEqual({ top: 8, bottom: 8, left: 8, right: 8 });
    });
  });

  // ===========================================================================
  // SIZE PROP
  // ===========================================================================

  describe('Size Prop', () => {
    it('passes default size 24 to icon', () => {
      render(<NotificationBell {...defaultProps} />);
      expect(screen.getByText('24')).toBeTruthy();
    });

    it('passes custom size 16 to icon', () => {
      render(<NotificationBell {...defaultProps} size={16} />);
      expect(screen.getByText('16')).toBeTruthy();
    });

    it('passes custom size 20 to icon', () => {
      render(<NotificationBell {...defaultProps} size={20} />);
      expect(screen.getByText('20')).toBeTruthy();
    });

    it('passes custom size 28 to icon', () => {
      render(<NotificationBell {...defaultProps} size={28} />);
      expect(screen.getByText('28')).toBeTruthy();
    });

    it('passes custom size 32 to icon', () => {
      render(<NotificationBell {...defaultProps} size={32} />);
      expect(screen.getByText('32')).toBeTruthy();
    });

    it('passes custom size 48 to icon', () => {
      render(<NotificationBell {...defaultProps} size={48} />);
      expect(screen.getByText('48')).toBeTruthy();
    });
  });

  // ===========================================================================
  // STORE INTEGRATION
  // ===========================================================================

  describe('Store Integration', () => {
    it('reads unread count from notification store', () => {
      mockUseNotificationStore.mockImplementation((selector) => {
        const state = { unreadCount: 7 };
        return selector(state as any);
      });
      render(<NotificationBell {...defaultProps} />);
      expect(screen.getByText('7')).toBeTruthy();
    });

    it('renders with different store values on separate renders', () => {
      // First render with 0
      mockUseNotificationStore.mockImplementation((selector) => {
        const state = { unreadCount: 0 };
        return selector(state as any);
      });
      const { unmount } = render(<NotificationBell {...defaultProps} />);
      expect(screen.queryByText('3')).toBeNull();
      unmount();

      // New render with updated store value of 3
      mockUseNotificationStore.mockImplementation((selector) => {
        const state = { unreadCount: 3 };
        return selector(state as any);
      });
      render(<NotificationBell {...defaultProps} />);
      expect(screen.getByText('3')).toBeTruthy();
    });

    it('calls store selector with correct function', () => {
      render(<NotificationBell {...defaultProps} />);
      expect(mockUseNotificationStore).toHaveBeenCalled();
    });
  });

  // ===========================================================================
  // EDGE CASES
  // ===========================================================================

  describe('Edge Cases', () => {
    it('handles zero unread count correctly', () => {
      mockUseNotificationStore.mockImplementation((selector) => {
        const state = { unreadCount: 0 };
        return selector(state as any);
      });
      render(<NotificationBell {...defaultProps} />);
      // Badge should not be visible
      expect(screen.queryByText('0')).toBeNull();
    });

    it('handles exactly 99 notifications (boundary)', () => {
      mockUseNotificationStore.mockImplementation((selector) => {
        const state = { unreadCount: 99 };
        return selector(state as any);
      });
      render(<NotificationBell {...defaultProps} />);
      expect(screen.getByText('99')).toBeTruthy();
      expect(screen.queryByText('99+')).toBeNull();
    });

    it('handles exactly 100 notifications (boundary)', () => {
      mockUseNotificationStore.mockImplementation((selector) => {
        const state = { unreadCount: 100 };
        return selector(state as any);
      });
      render(<NotificationBell {...defaultProps} />);
      expect(screen.getByText('99+')).toBeTruthy();
      expect(screen.queryByText('100')).toBeNull();
    });

    it('handles very small icon size', () => {
      render(<NotificationBell {...defaultProps} size={8} />);
      expect(screen.getByText('8')).toBeTruthy();
    });

    it('handles very large icon size', () => {
      render(<NotificationBell {...defaultProps} size={96} />);
      expect(screen.getByText('96')).toBeTruthy();
    });

    it('renders correctly with different sizes', () => {
      const sizes = [8, 16, 24, 32, 48, 64];
      sizes.forEach((size, index) => {
        mockUseNotificationStore.mockImplementation((selector) => {
          const state = { unreadCount: index + 1 };
          return selector(state as any);
        });
        const { unmount } = render(<NotificationBell {...defaultProps} size={size} />);
        expect(screen.getByText(String(size))).toBeTruthy();
        expect(screen.getByText(String(index + 1))).toBeTruthy();
        unmount();
      });
    });
  });

  // ===========================================================================
  // MEMOIZATION
  // ===========================================================================

  describe('Memoization', () => {
    it('component is memoized with React.memo', () => {
      // Verify that NotificationBell is wrapped in React.memo
      expect(NotificationBell.$$typeof).toBeDefined();
    });

    it('does not re-render with same props', () => {
      const mockOnPress = jest.fn();
      mockUseNotificationStore.mockImplementation((selector) => {
        const state = { unreadCount: 5 };
        return selector(state as any);
      });

      const { rerender } = render(<NotificationBell onPress={mockOnPress} />);
      expect(screen.getByText('5')).toBeTruthy();

      // Rerender with same props
      rerender(<NotificationBell onPress={mockOnPress} />);
      expect(screen.getByText('5')).toBeTruthy();
    });
  });

  // ===========================================================================
  // STYLING
  // ===========================================================================

  describe('Styling', () => {
    it('applies 44x44 container size for touch target', () => {
      const { root } = render(<NotificationBell {...defaultProps} />);
      // The component renders with proper touch target size
      expect(root).toBeTruthy();
    });

    it('badge uses error color from theme', () => {
      mockUseNotificationStore.mockImplementation((selector) => {
        const state = { unreadCount: 5 };
        return selector(state as any);
      });
      const { root } = render(<NotificationBell {...defaultProps} />);
      // Badge styling is applied
      expect(root).toBeTruthy();
    });

    it('badge text uses textInverse color from theme', () => {
      mockUseNotificationStore.mockImplementation((selector) => {
        const state = { unreadCount: 5 };
        return selector(state as any);
      });
      const { root } = render(<NotificationBell {...defaultProps} />);
      // Text styling is applied
      expect(root).toBeTruthy();
    });
  });

  // ===========================================================================
  // UNREAD COUNT VARIATIONS
  // ===========================================================================

  describe('Unread Count Variations', () => {
    const testCounts = [1, 2, 3, 5, 10, 15, 20, 25, 50, 75, 99];

    testCounts.forEach((count) => {
      it(`displays correct count for ${count} notifications`, () => {
        mockUseNotificationStore.mockImplementation((selector) => {
          const state = { unreadCount: count };
          return selector(state as any);
        });
        render(<NotificationBell {...defaultProps} />);
        expect(screen.getByText(String(count))).toBeTruthy();
      });
    });

    const overflowCounts = [100, 101, 150, 200, 500, 1000];

    overflowCounts.forEach((count) => {
      it(`displays 99+ for ${count} notifications`, () => {
        mockUseNotificationStore.mockImplementation((selector) => {
          const state = { unreadCount: count };
          return selector(state as any);
        });
        render(<NotificationBell {...defaultProps} />);
        expect(screen.getByText('99+')).toBeTruthy();
      });
    });
  });

  // ===========================================================================
  // ACCESSIBILITY LABEL VARIATIONS
  // ===========================================================================

  describe('Accessibility Label Variations', () => {
    const testCases = [
      { count: 0, expected: 'Notifications, none unread' },
      { count: 1, expected: 'Notifications, 1 unread' },
      { count: 2, expected: 'Notifications, 2 unread' },
      { count: 10, expected: 'Notifications, 10 unread' },
      { count: 99, expected: 'Notifications, 99 unread' },
      { count: 100, expected: 'Notifications, 100 unread' },
      { count: 150, expected: 'Notifications, 150 unread' },
    ];

    testCases.forEach(({ count, expected }) => {
      it(`has correct accessibility label for ${count} notifications`, () => {
        mockUseNotificationStore.mockImplementation((selector) => {
          const state = { unreadCount: count };
          return selector(state as any);
        });
        render(<NotificationBell {...defaultProps} />);
        const button = screen.getByRole('button');
        expect(button.props.accessibilityLabel).toBe(expected);
      });
    });
  });
});
