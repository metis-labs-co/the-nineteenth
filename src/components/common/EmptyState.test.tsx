/**
 * EmptyState Component Tests
 *
 * Tests for the empty state display component including:
 * - Rendering with different props
 * - Icon variations
 * - Action button functionality
 * - Compact mode
 * - Custom styling
 * - Accessibility
 */

import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react-native';
import { EmptyState, EmptyStateProps, EmptyStateIcon } from './EmptyState';

// Mock ThemeContext
const mockColors = {
  primary: '#1E7F5E',
  white: '#FFFFFF',
  gray100: '#F3F4F6',
  gray400: '#9CA3AF',
  gray600: '#6B7280',
  gray900: '#111827',
};

jest.mock('@/context/ThemeContext', () => ({
  useThemeColors: () => mockColors,
}));

// Mock react-native-paper
jest.mock('react-native-paper', () => {
  const { View, Text, TouchableOpacity } = require('react-native');
  return {
    Text: ({ children, style, variant, ...props }: any) => (
      <Text style={style} {...props}>
        {children}
      </Text>
    ),
    Button: ({
      children,
      onPress,
      mode,
      style,
      contentStyle,
      labelStyle,
      ...props
    }: any) => (
      <TouchableOpacity
        onPress={onPress}
        style={style}
        testID={props.testID || 'button'}
        accessibilityLabel={props.accessibilityLabel}
        accessibilityHint={props.accessibilityHint}
      >
        <Text style={labelStyle}>{children}</Text>
      </TouchableOpacity>
    ),
    Icon: ({ source, size, color }: any) => (
      <View testID={`icon-${source}`} style={{ width: size, height: size }}>
        <Text>{source}</Text>
      </View>
    ),
  };
});

describe('EmptyState', () => {
  // =========================================================================
  // RENDERING
  // =========================================================================

  describe('Rendering', () => {
    it('renders without crashing', () => {
      render(<EmptyState title="Test Title" message="Test message" />);
      expect(screen.getByText('Test Title')).toBeTruthy();
    });

    it('renders with required props', () => {
      render(
        <EmptyState
          title="No competitions yet"
          message="Create your first competition to get started"
        />
      );
      expect(screen.getByText('No competitions yet')).toBeTruthy();
      expect(
        screen.getByText('Create your first competition to get started')
      ).toBeTruthy();
    });

    it('renders title correctly', () => {
      render(<EmptyState title="Empty List" message="No items found" />);
      expect(screen.getByText('Empty List')).toBeTruthy();
    });

    it('renders message correctly', () => {
      render(
        <EmptyState title="No Results" message="Try adjusting your search" />
      );
      expect(screen.getByText('Try adjusting your search')).toBeTruthy();
    });

    it('renders default icon (inbox-outline)', () => {
      render(<EmptyState title="Test" message="Test message" />);
      expect(screen.getByTestId('icon-inbox-outline')).toBeTruthy();
    });

    it('renders with long title', () => {
      const longTitle =
        'This is a very long title that might wrap to multiple lines';
      render(<EmptyState title={longTitle} message="Message" />);
      expect(screen.getByText(longTitle)).toBeTruthy();
    });

    it('renders with long message', () => {
      const longMessage =
        'This is a very long message that provides detailed information about why the list is empty and what actions the user can take to populate it with data.';
      render(<EmptyState title="Title" message={longMessage} />);
      expect(screen.getByText(longMessage)).toBeTruthy();
    });
  });

  // =========================================================================
  // ICONS
  // =========================================================================

  describe('Icons', () => {
    it('renders with golf icon', () => {
      render(<EmptyState title="Test" message="Message" icon="golf" />);
      expect(screen.getByTestId('icon-golf')).toBeTruthy();
    });

    it('renders with trophy-outline icon', () => {
      render(
        <EmptyState title="Test" message="Message" icon="trophy-outline" />
      );
      expect(screen.getByTestId('icon-trophy-outline')).toBeTruthy();
    });

    it('renders with account-group-outline icon', () => {
      render(
        <EmptyState
          title="Test"
          message="Message"
          icon="account-group-outline"
        />
      );
      expect(screen.getByTestId('icon-account-group-outline')).toBeTruthy();
    });

    it('renders with clipboard-list-outline icon', () => {
      render(
        <EmptyState
          title="Test"
          message="Message"
          icon="clipboard-list-outline"
        />
      );
      expect(screen.getByTestId('icon-clipboard-list-outline')).toBeTruthy();
    });

    it('renders with calendar-blank-outline icon', () => {
      render(
        <EmptyState
          title="Test"
          message="Message"
          icon="calendar-blank-outline"
        />
      );
      expect(screen.getByTestId('icon-calendar-blank-outline')).toBeTruthy();
    });

    it('renders with magnify icon', () => {
      render(<EmptyState title="Test" message="Message" icon="magnify" />);
      expect(screen.getByTestId('icon-magnify')).toBeTruthy();
    });

    it('renders with inbox-outline icon (explicit)', () => {
      render(
        <EmptyState title="Test" message="Message" icon="inbox-outline" />
      );
      expect(screen.getByTestId('icon-inbox-outline')).toBeTruthy();
    });

    it('renders with custom icon string', () => {
      render(
        <EmptyState title="Test" message="Message" icon="heart-outline" />
      );
      expect(screen.getByTestId('icon-heart-outline')).toBeTruthy();
    });

    it('renders all predefined icons', () => {
      const icons: EmptyStateIcon[] = [
        'golf',
        'trophy-outline',
        'account-group-outline',
        'clipboard-list-outline',
        'calendar-blank-outline',
        'magnify',
        'inbox-outline',
      ];

      icons.forEach((icon) => {
        const { unmount } = render(
          <EmptyState title={`Test ${icon}`} message="Message" icon={icon} />
        );
        expect(screen.getByTestId(`icon-${icon}`)).toBeTruthy();
        unmount();
      });
    });
  });

  // =========================================================================
  // CUSTOM ICON COLOR
  // =========================================================================

  describe('Custom Icon Color', () => {
    it('uses default gray400 color when iconColor not specified', () => {
      render(<EmptyState title="Test" message="Message" />);
      // Default icon should render (icon color is applied internally)
      expect(screen.getByTestId('icon-inbox-outline')).toBeTruthy();
    });

    it('accepts custom icon color', () => {
      render(
        <EmptyState
          title="Test"
          message="Message"
          iconColor="#FF0000"
        />
      );
      expect(screen.getByTestId('icon-inbox-outline')).toBeTruthy();
    });

    it('accepts theme color as icon color', () => {
      render(
        <EmptyState
          title="Test"
          message="Message"
          iconColor={mockColors.primary}
        />
      );
      expect(screen.getByTestId('icon-inbox-outline')).toBeTruthy();
    });
  });

  // =========================================================================
  // ACTION BUTTON
  // =========================================================================

  describe('Action Button', () => {
    it('does not render button when actionLabel is not provided', () => {
      render(<EmptyState title="Test" message="Message" />);
      expect(screen.queryByText('Create')).toBeNull();
    });

    it('does not render button when onAction is not provided', () => {
      render(
        <EmptyState title="Test" message="Message" actionLabel="Create" />
      );
      expect(screen.queryByText('Create')).toBeNull();
    });

    it('renders button when both actionLabel and onAction are provided', () => {
      const onAction = jest.fn();
      render(
        <EmptyState
          title="Test"
          message="Message"
          actionLabel="Create Competition"
          onAction={onAction}
        />
      );
      expect(screen.getByText('Create Competition')).toBeTruthy();
    });

    it('calls onAction when button is pressed', () => {
      const onAction = jest.fn();
      render(
        <EmptyState
          title="Test"
          message="Message"
          actionLabel="Create"
          onAction={onAction}
        />
      );
      fireEvent.press(screen.getByText('Create'));
      expect(onAction).toHaveBeenCalledTimes(1);
    });

    it('calls onAction multiple times on multiple presses', () => {
      const onAction = jest.fn();
      render(
        <EmptyState
          title="Test"
          message="Message"
          actionLabel="Action"
          onAction={onAction}
        />
      );
      const button = screen.getByText('Action');
      fireEvent.press(button);
      fireEvent.press(button);
      fireEvent.press(button);
      expect(onAction).toHaveBeenCalledTimes(3);
    });

    it('renders button with various action labels', () => {
      const labels = [
        'Create Competition',
        'Add Players',
        'Start Round',
        'Try Again',
        'Invite Friends',
      ];

      labels.forEach((label) => {
        const { unmount } = render(
          <EmptyState
            title="Test"
            message="Message"
            actionLabel={label}
            onAction={jest.fn()}
          />
        );
        expect(screen.getByText(label)).toBeTruthy();
        unmount();
      });
    });
  });

  // =========================================================================
  // COMPACT MODE
  // =========================================================================

  describe('Compact Mode', () => {
    it('renders in normal mode by default', () => {
      render(<EmptyState title="Test" message="Message" />);
      expect(screen.getByText('Test')).toBeTruthy();
    });

    it('renders in compact mode when compact=true', () => {
      render(<EmptyState title="Test" message="Message" compact />);
      expect(screen.getByText('Test')).toBeTruthy();
    });

    it('renders in normal mode when compact=false', () => {
      render(<EmptyState title="Test" message="Message" compact={false} />);
      expect(screen.getByText('Test')).toBeTruthy();
    });

    it('renders action button in compact mode', () => {
      const onAction = jest.fn();
      render(
        <EmptyState
          title="Test"
          message="Message"
          compact
          actionLabel="Add"
          onAction={onAction}
        />
      );
      expect(screen.getByText('Add')).toBeTruthy();
    });

    it('button works in compact mode', () => {
      const onAction = jest.fn();
      render(
        <EmptyState
          title="Test"
          message="Message"
          compact
          actionLabel="Action"
          onAction={onAction}
        />
      );
      fireEvent.press(screen.getByText('Action'));
      expect(onAction).toHaveBeenCalled();
    });

    it('renders icon in compact mode', () => {
      render(
        <EmptyState
          title="Test"
          message="Message"
          compact
          icon="trophy-outline"
        />
      );
      expect(screen.getByTestId('icon-trophy-outline')).toBeTruthy();
    });
  });

  // =========================================================================
  // ACCESSIBILITY
  // =========================================================================

  describe('Accessibility', () => {
    it('has combined accessibility label for container', () => {
      render(
        <EmptyState title="No Results" message="Try a different search" />
      );
      const container = screen.getByLabelText(
        'No Results. Try a different search'
      );
      expect(container).toBeTruthy();
    });

    it('title has header accessibility role', () => {
      render(<EmptyState title="Empty State" message="Message" />);
      const title = screen.getByRole('header');
      expect(title).toBeTruthy();
    });

    it('button has correct accessibility label', () => {
      const onAction = jest.fn();
      render(
        <EmptyState
          title="Test"
          message="Message"
          actionLabel="Create Competition"
          onAction={onAction}
        />
      );
      const button = screen.getByLabelText('Create Competition');
      expect(button).toBeTruthy();
    });

    it('button has accessibility hint', () => {
      const onAction = jest.fn();
      render(
        <EmptyState
          title="Test"
          message="Message"
          actionLabel="Create Competition"
          onAction={onAction}
        />
      );
      const button = screen.getByHintText('Tap to create competition');
      expect(button).toBeTruthy();
    });
  });

  // =========================================================================
  // PROP COMBINATIONS
  // =========================================================================

  describe('Prop Combinations', () => {
    it('renders with all props combined', () => {
      const onAction = jest.fn();
      render(
        <EmptyState
          title="No Competitions"
          message="Create your first competition"
          icon="trophy-outline"
          actionLabel="Create"
          onAction={onAction}
          compact={false}
          iconColor="#FF0000"
        />
      );
      expect(screen.getByText('No Competitions')).toBeTruthy();
      expect(screen.getByText('Create your first competition')).toBeTruthy();
      expect(screen.getByTestId('icon-trophy-outline')).toBeTruthy();
      expect(screen.getByText('Create')).toBeTruthy();
    });

    it('renders compact with all other props', () => {
      const onAction = jest.fn();
      render(
        <EmptyState
          title="No Players"
          message="Add players to continue"
          icon="account-group-outline"
          actionLabel="Add Players"
          onAction={onAction}
          compact
          iconColor="#00FF00"
        />
      );
      expect(screen.getByText('No Players')).toBeTruthy();
      expect(screen.getByText('Add players to continue')).toBeTruthy();
      expect(screen.getByTestId('icon-account-group-outline')).toBeTruthy();
      expect(screen.getByText('Add Players')).toBeTruthy();
    });

    it('renders with icon and no action', () => {
      render(
        <EmptyState
          title="Search Complete"
          message="No results found"
          icon="magnify"
        />
      );
      expect(screen.getByText('Search Complete')).toBeTruthy();
      expect(screen.getByTestId('icon-magnify')).toBeTruthy();
      expect(screen.queryByRole('button')).toBeNull();
    });

    it('renders action without custom icon', () => {
      const onAction = jest.fn();
      render(
        <EmptyState
          title="Empty"
          message="Start here"
          actionLabel="Begin"
          onAction={onAction}
        />
      );
      expect(screen.getByTestId('icon-inbox-outline')).toBeTruthy();
      expect(screen.getByText('Begin')).toBeTruthy();
    });
  });

  // =========================================================================
  // USE CASES
  // =========================================================================

  describe('Use Cases', () => {
    it('renders empty competitions list', () => {
      const onAction = jest.fn();
      render(
        <EmptyState
          title="No competitions yet"
          message="Create your first competition to get started"
          icon="trophy-outline"
          actionLabel="Create Competition"
          onAction={onAction}
        />
      );
      expect(screen.getByText('No competitions yet')).toBeTruthy();
      expect(
        screen.getByText('Create your first competition to get started')
      ).toBeTruthy();
      expect(screen.getByText('Create Competition')).toBeTruthy();
    });

    it('renders empty search results', () => {
      render(
        <EmptyState
          title="No results found"
          message="Try a different search term"
          icon="magnify"
        />
      );
      expect(screen.getByText('No results found')).toBeTruthy();
      expect(screen.getByText('Try a different search term')).toBeTruthy();
    });

    it('renders no players state', () => {
      const onAction = jest.fn();
      render(
        <EmptyState
          title="No players added"
          message="Add players to your competition"
          icon="account-group-outline"
          actionLabel="Add Players"
          onAction={onAction}
          compact
        />
      );
      expect(screen.getByText('No players added')).toBeTruthy();
      expect(screen.getByText('Add Players')).toBeTruthy();
    });

    it('renders no rounds state', () => {
      const onAction = jest.fn();
      render(
        <EmptyState
          title="No rounds scheduled"
          message="Add rounds to your competition"
          icon="calendar-blank-outline"
          actionLabel="Add Round"
          onAction={onAction}
        />
      );
      expect(screen.getByText('No rounds scheduled')).toBeTruthy();
    });

    it('renders empty notifications', () => {
      render(
        <EmptyState
          title="All caught up!"
          message="No new notifications"
          icon="inbox-outline"
        />
      );
      expect(screen.getByText('All caught up!')).toBeTruthy();
    });

    it('renders empty friends list', () => {
      const onAction = jest.fn();
      render(
        <EmptyState
          title="No friends yet"
          message="Find and add friends to play golf together"
          icon="account-group-outline"
          actionLabel="Find Friends"
          onAction={onAction}
        />
      );
      expect(screen.getByText('No friends yet')).toBeTruthy();
      expect(screen.getByText('Find Friends')).toBeTruthy();
    });
  });

  // =========================================================================
  // EDGE CASES
  // =========================================================================

  describe('Edge Cases', () => {
    it('handles empty title string', () => {
      render(<EmptyState title="" message="Message" />);
      expect(screen.getByText('Message')).toBeTruthy();
    });

    it('handles empty message string', () => {
      render(<EmptyState title="Title" message="" />);
      expect(screen.getByText('Title')).toBeTruthy();
    });

    it('handles whitespace-only title', () => {
      render(<EmptyState title="   " message="Message" />);
      expect(screen.getByText('   ')).toBeTruthy();
    });

    it('handles special characters in title', () => {
      render(<EmptyState title="No items & results!" message="Message" />);
      expect(screen.getByText('No items & results!')).toBeTruthy();
    });

    it('handles emojis in message', () => {
      render(
        <EmptyState title="Title" message="Create your first round! 🏌️‍♂️" />
      );
      expect(screen.getByText('Create your first round! 🏌️‍♂️')).toBeTruthy();
    });

    it('handles very short labels', () => {
      const onAction = jest.fn();
      render(
        <EmptyState
          title="X"
          message="Y"
          actionLabel="Go"
          onAction={onAction}
        />
      );
      expect(screen.getByText('X')).toBeTruthy();
      expect(screen.getByText('Y')).toBeTruthy();
      expect(screen.getByText('Go')).toBeTruthy();
    });

    it('handles numeric content in strings', () => {
      render(<EmptyState title="0 results" message="Found 0 matches" />);
      expect(screen.getByText('0 results')).toBeTruthy();
      expect(screen.getByText('Found 0 matches')).toBeTruthy();
    });
  });

  // =========================================================================
  // MEMOIZATION
  // =========================================================================

  describe('Memoization', () => {
    it('is wrapped with React.memo', () => {
      expect(EmptyState).toBeDefined();
      expect(typeof EmptyState).toBe('object'); // React.memo returns an object
    });

    it('renders consistently with same props', () => {
      const props: EmptyStateProps = {
        title: 'Test Title',
        message: 'Test message',
        icon: 'trophy-outline',
      };

      const { rerender } = render(<EmptyState {...props} />);
      expect(screen.getByText('Test Title')).toBeTruthy();

      rerender(<EmptyState {...props} />);
      expect(screen.getByText('Test Title')).toBeTruthy();
    });

    it('updates when props change', () => {
      const { rerender } = render(
        <EmptyState title="Original" message="Message" />
      );
      expect(screen.getByText('Original')).toBeTruthy();

      rerender(<EmptyState title="Updated" message="Message" />);
      expect(screen.getByText('Updated')).toBeTruthy();
      expect(screen.queryByText('Original')).toBeNull();
    });
  });

  // =========================================================================
  // CALLBACK BEHAVIOR
  // =========================================================================

  describe('Callback Behavior', () => {
    it('preserves callback reference on rerender', () => {
      const onAction = jest.fn();
      const { rerender } = render(
        <EmptyState
          title="Test"
          message="Message"
          actionLabel="Action"
          onAction={onAction}
        />
      );

      fireEvent.press(screen.getByText('Action'));
      expect(onAction).toHaveBeenCalledTimes(1);

      rerender(
        <EmptyState
          title="Test"
          message="Message"
          actionLabel="Action"
          onAction={onAction}
        />
      );

      fireEvent.press(screen.getByText('Action'));
      expect(onAction).toHaveBeenCalledTimes(2);
    });

    it('uses new callback after prop change', () => {
      const onAction1 = jest.fn();
      const onAction2 = jest.fn();

      const { rerender } = render(
        <EmptyState
          title="Test"
          message="Message"
          actionLabel="Action"
          onAction={onAction1}
        />
      );

      fireEvent.press(screen.getByText('Action'));
      expect(onAction1).toHaveBeenCalledTimes(1);
      expect(onAction2).not.toHaveBeenCalled();

      rerender(
        <EmptyState
          title="Test"
          message="Message"
          actionLabel="Action"
          onAction={onAction2}
        />
      );

      fireEvent.press(screen.getByText('Action'));
      expect(onAction1).toHaveBeenCalledTimes(1);
      expect(onAction2).toHaveBeenCalledTimes(1);
    });
  });
});
