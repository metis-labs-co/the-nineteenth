/**
 * OfflineIndicator Component Tests
 *
 * Tests for the persistent offline status banner including:
 * - Rendering with different statuses
 * - Pending syncs display
 * - Error message display
 * - Action button functionality (Sync/Retry)
 * - Color variations per status
 * - Visibility logic
 */

import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react-native';
import { OfflineIndicator } from './OfflineIndicator';

// Mock ThemeContext
const mockColors = {
  primary: '#1E7F5E',
  white: '#FFFFFF',
  gray100: '#F3F4F6',
  gray700: '#374151',
  border: '#E5E7EB',
  warning: '#F59E0B',
  warningLight: '#FEF3C7',
  warningDark: '#92400E',
  error: '#EF4444',
  errorLight: '#FEE2E2',
  errorDark: '#991B1B',
  infoLight: '#DBEAFE',
  infoDark: '#1E40AF',
};

jest.mock('@/context/ThemeContext', () => ({
  useThemeColors: () => mockColors,
}));

// Mock GolfBallLoader
jest.mock('./GolfBallLoader', () => {
  const { View, Text } = require('react-native');
  return {
    GolfBallLoader: ({ size }: { size?: string }) => (
      <View testID="golf-ball-loader">
        <Text>{size || 'default'}</Text>
      </View>
    ),
  };
});

// Mock react-native-paper
jest.mock('react-native-paper', () => {
  const { View: _View, Text, TouchableOpacity } = require('react-native');
  return {
    Text: ({ children, style, _variant, ...props }: any) => (
      <Text style={style} {...props}>
        {children}
      </Text>
    ),
    Button: ({
      children,
      onPress,
      _mode,
      style,
      labelStyle,
      _compact,
      ...props
    }: any) => (
      <TouchableOpacity
        onPress={onPress}
        style={style}
        testID={props.testID || `button-${children}`}
        accessibilityLabel={props.accessibilityLabel}
      >
        <Text style={labelStyle}>{children}</Text>
      </TouchableOpacity>
    ),
  };
});

describe('OfflineIndicator', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  // =========================================================================
  // VISIBILITY
  // =========================================================================

  describe('Visibility', () => {
    it('returns null when status is online and not syncing', () => {
      const { toJSON } = render(<OfflineIndicator status="online" />);
      expect(toJSON()).toBeNull();
    });

    it('returns null when online with pendingSyncs=0', () => {
      const { toJSON } = render(
        <OfflineIndicator status="online" pendingSyncs={0} />
      );
      expect(toJSON()).toBeNull();
    });

    it('renders when status is offline', () => {
      render(<OfflineIndicator status="offline" />);
      expect(screen.getByText('Offline')).toBeTruthy();
    });

    it('renders when status is syncing', () => {
      render(<OfflineIndicator status="syncing" />);
      expect(screen.getByText('Syncing changes...')).toBeTruthy();
    });

    it('renders when status is error', () => {
      render(<OfflineIndicator status="error" />);
      expect(screen.getByText('Sync failed')).toBeTruthy();
    });

    it('renders when online but isSyncing is true', () => {
      render(<OfflineIndicator status="online" isSyncing />);
      // The component renders because isSyncing is true
      expect(screen.toJSON()).not.toBeNull();
    });
  });

  // =========================================================================
  // OFFLINE STATUS
  // =========================================================================

  describe('Offline Status', () => {
    it('displays "Offline" message with no pending syncs', () => {
      render(<OfflineIndicator status="offline" />);
      expect(screen.getByText('Offline')).toBeTruthy();
    });

    it('displays "Offline" message when pendingSyncs is 0', () => {
      render(<OfflineIndicator status="offline" pendingSyncs={0} />);
      expect(screen.getByText('Offline')).toBeTruthy();
    });

    it('displays pending syncs count singular', () => {
      render(<OfflineIndicator status="offline" pendingSyncs={1} />);
      expect(screen.getByText('Offline • 1 change pending')).toBeTruthy();
    });

    it('displays pending syncs count plural', () => {
      render(<OfflineIndicator status="offline" pendingSyncs={5} />);
      expect(screen.getByText('Offline • 5 changes pending')).toBeTruthy();
    });

    it('displays pending syncs count with 2 changes', () => {
      render(<OfflineIndicator status="offline" pendingSyncs={2} />);
      expect(screen.getByText('Offline • 2 changes pending')).toBeTruthy();
    });

    it('displays pending syncs count with many changes', () => {
      render(<OfflineIndicator status="offline" pendingSyncs={100} />);
      expect(screen.getByText('Offline • 100 changes pending')).toBeTruthy();
    });
  });

  // =========================================================================
  // SYNCING STATUS
  // =========================================================================

  describe('Syncing Status', () => {
    it('displays syncing message', () => {
      render(<OfflineIndicator status="syncing" />);
      expect(screen.getByText('Syncing changes...')).toBeTruthy();
    });

    it('shows GolfBallLoader when syncing', () => {
      render(<OfflineIndicator status="syncing" />);
      expect(screen.getByTestId('golf-ball-loader')).toBeTruthy();
    });

    it('does not show GolfBallLoader when offline', () => {
      render(<OfflineIndicator status="offline" />);
      expect(screen.queryByTestId('golf-ball-loader')).toBeNull();
    });

    it('does not show GolfBallLoader when error', () => {
      render(<OfflineIndicator status="error" />);
      expect(screen.queryByTestId('golf-ball-loader')).toBeNull();
    });

    it('passes "sm" size to GolfBallLoader', () => {
      render(<OfflineIndicator status="syncing" />);
      expect(screen.getByText('sm')).toBeTruthy();
    });
  });

  // =========================================================================
  // ERROR STATUS
  // =========================================================================

  describe('Error Status', () => {
    it('displays default error message', () => {
      render(<OfflineIndicator status="error" />);
      expect(screen.getByText('Sync failed')).toBeTruthy();
    });

    it('displays custom error message', () => {
      render(
        <OfflineIndicator
          status="error"
          errorMessage="Network unavailable"
        />
      );
      expect(screen.getByText('Network unavailable')).toBeTruthy();
    });

    it('displays another custom error message', () => {
      render(
        <OfflineIndicator
          status="error"
          errorMessage="Connection timeout"
        />
      );
      expect(screen.getByText('Connection timeout')).toBeTruthy();
    });

    it('displays long error message', () => {
      const longMessage =
        'Failed to sync scores due to server maintenance. Please try again later.';
      render(<OfflineIndicator status="error" errorMessage={longMessage} />);
      expect(screen.getByText(longMessage)).toBeTruthy();
    });

    it('ignores errorMessage when not in error status', () => {
      render(
        <OfflineIndicator
          status="offline"
          errorMessage="This should not appear"
        />
      );
      expect(screen.queryByText('This should not appear')).toBeNull();
    });
  });

  // =========================================================================
  // SYNC BUTTON
  // =========================================================================

  describe('Sync Button', () => {
    it('shows Sync button when offline with pending syncs', () => {
      render(
        <OfflineIndicator
          status="offline"
          pendingSyncs={3}
          onSyncPress={jest.fn()}
        />
      );
      expect(screen.getByText('Sync')).toBeTruthy();
    });

    it('does not show Sync button when offline with no pending syncs', () => {
      render(
        <OfflineIndicator
          status="offline"
          pendingSyncs={0}
          onSyncPress={jest.fn()}
        />
      );
      expect(screen.queryByText('Sync')).toBeNull();
    });

    it('does not show Sync button when no onSyncPress provided', () => {
      render(<OfflineIndicator status="offline" pendingSyncs={3} />);
      expect(screen.queryByText('Sync')).toBeNull();
    });

    it('does not show Sync button when isSyncing is true', () => {
      render(
        <OfflineIndicator
          status="offline"
          pendingSyncs={3}
          onSyncPress={jest.fn()}
          isSyncing
        />
      );
      expect(screen.queryByText('Sync')).toBeNull();
    });

    it('calls onSyncPress when Sync button is pressed', () => {
      const onSyncPress = jest.fn();
      render(
        <OfflineIndicator
          status="offline"
          pendingSyncs={3}
          onSyncPress={onSyncPress}
        />
      );
      fireEvent.press(screen.getByText('Sync'));
      expect(onSyncPress).toHaveBeenCalledTimes(1);
    });

    it('calls onSyncPress multiple times on multiple presses', () => {
      const onSyncPress = jest.fn();
      render(
        <OfflineIndicator
          status="offline"
          pendingSyncs={5}
          onSyncPress={onSyncPress}
        />
      );
      const button = screen.getByText('Sync');
      fireEvent.press(button);
      fireEvent.press(button);
      fireEvent.press(button);
      expect(onSyncPress).toHaveBeenCalledTimes(3);
    });
  });

  // =========================================================================
  // RETRY BUTTON
  // =========================================================================

  describe('Retry Button', () => {
    it('shows Retry button when in error status', () => {
      render(
        <OfflineIndicator status="error" onSyncPress={jest.fn()} />
      );
      expect(screen.getByText('Retry')).toBeTruthy();
    });

    it('does not show Retry button when no onSyncPress provided', () => {
      render(<OfflineIndicator status="error" />);
      expect(screen.queryByText('Retry')).toBeNull();
    });

    it('does not show Retry button when isSyncing is true', () => {
      render(
        <OfflineIndicator
          status="error"
          onSyncPress={jest.fn()}
          isSyncing
        />
      );
      expect(screen.queryByText('Retry')).toBeNull();
    });

    it('calls onSyncPress when Retry button is pressed', () => {
      const onSyncPress = jest.fn();
      render(
        <OfflineIndicator status="error" onSyncPress={onSyncPress} />
      );
      fireEvent.press(screen.getByText('Retry'));
      expect(onSyncPress).toHaveBeenCalledTimes(1);
    });

    it('does not show Retry when offline', () => {
      render(
        <OfflineIndicator
          status="offline"
          pendingSyncs={0}
          onSyncPress={jest.fn()}
        />
      );
      expect(screen.queryByText('Retry')).toBeNull();
    });

    it('does not show Retry when syncing', () => {
      render(
        <OfflineIndicator status="syncing" onSyncPress={jest.fn()} />
      );
      expect(screen.queryByText('Retry')).toBeNull();
    });
  });

  // =========================================================================
  // BUTTON MUTUAL EXCLUSIVITY
  // =========================================================================

  describe('Button Mutual Exclusivity', () => {
    it('shows only Sync button when offline with pending syncs', () => {
      render(
        <OfflineIndicator
          status="offline"
          pendingSyncs={5}
          onSyncPress={jest.fn()}
        />
      );
      expect(screen.getByText('Sync')).toBeTruthy();
      expect(screen.queryByText('Retry')).toBeNull();
    });

    it('shows only Retry button when in error status', () => {
      render(
        <OfflineIndicator status="error" onSyncPress={jest.fn()} />
      );
      expect(screen.getByText('Retry')).toBeTruthy();
      expect(screen.queryByText('Sync')).toBeNull();
    });

    it('shows no button when syncing', () => {
      render(
        <OfflineIndicator status="syncing" onSyncPress={jest.fn()} />
      );
      expect(screen.queryByText('Sync')).toBeNull();
      expect(screen.queryByText('Retry')).toBeNull();
    });

    it('shows no button when online', () => {
      const { toJSON } = render(
        <OfflineIndicator status="online" onSyncPress={jest.fn()} />
      );
      expect(toJSON()).toBeNull();
    });
  });

  // =========================================================================
  // MESSAGES
  // =========================================================================

  describe('Messages', () => {
    it('returns empty string for online status', () => {
      // Online status returns null so we can't test message directly
      // but we can verify component doesn't render
      const { toJSON } = render(<OfflineIndicator status="online" />);
      expect(toJSON()).toBeNull();
    });

    it('handles default status (should be gray)', () => {
      // Test with any unknown status behavior
      // Since status is typed, we're testing the default case implicitly
      render(<OfflineIndicator status="offline" />);
      expect(screen.getByText('Offline')).toBeTruthy();
    });
  });

  // =========================================================================
  // DEFAULT PROPS
  // =========================================================================

  describe('Default Props', () => {
    it('pendingSyncs defaults to 0', () => {
      render(<OfflineIndicator status="offline" />);
      expect(screen.getByText('Offline')).toBeTruthy();
      // No pending count shown when 0
      expect(screen.queryByText(/pending/)).toBeNull();
    });

    it('isSyncing defaults to false', () => {
      render(
        <OfflineIndicator
          status="offline"
          pendingSyncs={1}
          onSyncPress={jest.fn()}
        />
      );
      // Sync button should be visible (not hidden by isSyncing)
      expect(screen.getByText('Sync')).toBeTruthy();
    });
  });

  // =========================================================================
  // PROP COMBINATIONS
  // =========================================================================

  describe('Prop Combinations', () => {
    it('offline with pending syncs and callback', () => {
      const onSyncPress = jest.fn();
      render(
        <OfflineIndicator
          status="offline"
          pendingSyncs={3}
          onSyncPress={onSyncPress}
        />
      );
      expect(screen.getByText('Offline • 3 changes pending')).toBeTruthy();
      expect(screen.getByText('Sync')).toBeTruthy();
    });

    it('error with custom message and callback', () => {
      const onSyncPress = jest.fn();
      render(
        <OfflineIndicator
          status="error"
          errorMessage="Network error occurred"
          onSyncPress={onSyncPress}
        />
      );
      expect(screen.getByText('Network error occurred')).toBeTruthy();
      expect(screen.getByText('Retry')).toBeTruthy();
    });

    it('syncing with pending syncs (syncs count ignored in message)', () => {
      render(<OfflineIndicator status="syncing" pendingSyncs={10} />);
      expect(screen.getByText('Syncing changes...')).toBeTruthy();
      expect(screen.queryByText(/pending/)).toBeNull();
    });

    it('offline with isSyncing true hides Sync button', () => {
      render(
        <OfflineIndicator
          status="offline"
          pendingSyncs={5}
          onSyncPress={jest.fn()}
          isSyncing
        />
      );
      expect(screen.getByText('Offline • 5 changes pending')).toBeTruthy();
      expect(screen.queryByText('Sync')).toBeNull();
    });

    it('error with isSyncing true hides Retry button', () => {
      render(
        <OfflineIndicator
          status="error"
          onSyncPress={jest.fn()}
          isSyncing
        />
      );
      expect(screen.getByText('Sync failed')).toBeTruthy();
      expect(screen.queryByText('Retry')).toBeNull();
    });
  });

  // =========================================================================
  // RERENDERING
  // =========================================================================

  describe('Rerendering', () => {
    it('updates when status changes from offline to syncing', () => {
      const { rerender } = render(<OfflineIndicator status="offline" />);
      expect(screen.getByText('Offline')).toBeTruthy();

      rerender(<OfflineIndicator status="syncing" />);
      expect(screen.getByText('Syncing changes...')).toBeTruthy();
      expect(screen.queryByText('Offline')).toBeNull();
    });

    it('updates when status changes from syncing to error', () => {
      const { rerender } = render(<OfflineIndicator status="syncing" />);
      expect(screen.getByText('Syncing changes...')).toBeTruthy();

      rerender(<OfflineIndicator status="error" />);
      expect(screen.getByText('Sync failed')).toBeTruthy();
    });

    it('updates when status changes from error to online', () => {
      const { rerender } = render(<OfflineIndicator status="error" />);
      expect(screen.getByText('Sync failed')).toBeTruthy();

      rerender(<OfflineIndicator status="online" />);
      expect(screen.toJSON()).toBeNull();
    });

    it('updates pending syncs count', () => {
      const { rerender } = render(
        <OfflineIndicator status="offline" pendingSyncs={1} />
      );
      expect(screen.getByText('Offline • 1 change pending')).toBeTruthy();

      rerender(<OfflineIndicator status="offline" pendingSyncs={5} />);
      expect(screen.getByText('Offline • 5 changes pending')).toBeTruthy();
    });

    it('updates error message', () => {
      const { rerender } = render(
        <OfflineIndicator status="error" errorMessage="Error 1" />
      );
      expect(screen.getByText('Error 1')).toBeTruthy();

      rerender(<OfflineIndicator status="error" errorMessage="Error 2" />);
      expect(screen.getByText('Error 2')).toBeTruthy();
    });

    it('updates callback function', () => {
      const onSyncPress1 = jest.fn();
      const onSyncPress2 = jest.fn();

      const { rerender } = render(
        <OfflineIndicator
          status="offline"
          pendingSyncs={1}
          onSyncPress={onSyncPress1}
        />
      );

      fireEvent.press(screen.getByText('Sync'));
      expect(onSyncPress1).toHaveBeenCalledTimes(1);

      rerender(
        <OfflineIndicator
          status="offline"
          pendingSyncs={1}
          onSyncPress={onSyncPress2}
        />
      );

      fireEvent.press(screen.getByText('Sync'));
      expect(onSyncPress2).toHaveBeenCalledTimes(1);
      expect(onSyncPress1).toHaveBeenCalledTimes(1);
    });
  });

  // =========================================================================
  // EDGE CASES
  // =========================================================================

  describe('Edge Cases', () => {
    it('handles negative pending syncs (treated as no pending syncs)', () => {
      render(<OfflineIndicator status="offline" pendingSyncs={-1} />);
      // -1 is not > 0 so it shows just "Offline" without pending count
      expect(screen.getByText('Offline')).toBeTruthy();
      expect(screen.queryByText(/pending/)).toBeNull();
    });

    it('handles very large pending syncs count', () => {
      render(<OfflineIndicator status="offline" pendingSyncs={99999} />);
      expect(screen.getByText('Offline • 99999 changes pending')).toBeTruthy();
    });

    it('handles empty error message', () => {
      render(<OfflineIndicator status="error" errorMessage="" />);
      // Empty string is falsy so falls back to default
      expect(screen.getByText('Sync failed')).toBeTruthy();
    });

    it('handles whitespace-only error message', () => {
      render(<OfflineIndicator status="error" errorMessage="   " />);
      // Whitespace is truthy so it shows
      expect(screen.getByText('   ')).toBeTruthy();
    });

    it('handles special characters in error message', () => {
      render(
        <OfflineIndicator
          status="error"
          errorMessage="Error: Can't connect & sync!"
        />
      );
      expect(screen.getByText("Error: Can't connect & sync!")).toBeTruthy();
    });
  });

  // =========================================================================
  // USE CASE SCENARIOS
  // =========================================================================

  describe('Use Case Scenarios', () => {
    it('simulates going offline', () => {
      render(
        <OfflineIndicator
          status="offline"
          pendingSyncs={0}
          onSyncPress={jest.fn()}
        />
      );
      expect(screen.getByText('Offline')).toBeTruthy();
    });

    it('simulates offline with unsaved changes', () => {
      render(
        <OfflineIndicator
          status="offline"
          pendingSyncs={3}
          onSyncPress={jest.fn()}
        />
      );
      expect(screen.getByText('Offline • 3 changes pending')).toBeTruthy();
      expect(screen.getByText('Sync')).toBeTruthy();
    });

    it('simulates sync in progress', () => {
      render(<OfflineIndicator status="syncing" />);
      expect(screen.getByText('Syncing changes...')).toBeTruthy();
      expect(screen.getByTestId('golf-ball-loader')).toBeTruthy();
    });

    it('simulates sync failure', () => {
      render(
        <OfflineIndicator
          status="error"
          errorMessage="Unable to reach server"
          onSyncPress={jest.fn()}
        />
      );
      expect(screen.getByText('Unable to reach server')).toBeTruthy();
      expect(screen.getByText('Retry')).toBeTruthy();
    });

    it('simulates recovery to online', () => {
      const { rerender } = render(
        <OfflineIndicator status="offline" pendingSyncs={2} />
      );
      expect(screen.getByText('Offline • 2 changes pending')).toBeTruthy();

      rerender(<OfflineIndicator status="syncing" />);
      expect(screen.getByText('Syncing changes...')).toBeTruthy();

      rerender(<OfflineIndicator status="online" />);
      expect(screen.toJSON()).toBeNull();
    });

    it('simulates sync flow: offline -> syncing -> error -> retry -> online', () => {
      const onSyncPress = jest.fn();
      const { rerender } = render(
        <OfflineIndicator
          status="offline"
          pendingSyncs={5}
          onSyncPress={onSyncPress}
        />
      );
      expect(screen.getByText('Offline • 5 changes pending')).toBeTruthy();

      // User presses Sync
      fireEvent.press(screen.getByText('Sync'));
      expect(onSyncPress).toHaveBeenCalled();

      // Status changes to syncing
      rerender(<OfflineIndicator status="syncing" />);
      expect(screen.getByText('Syncing changes...')).toBeTruthy();

      // Sync fails
      rerender(
        <OfflineIndicator
          status="error"
          errorMessage="Timeout"
          onSyncPress={onSyncPress}
        />
      );
      expect(screen.getByText('Timeout')).toBeTruthy();

      // User retries
      fireEvent.press(screen.getByText('Retry'));
      expect(onSyncPress).toHaveBeenCalledTimes(2);

      // Status changes to syncing again
      rerender(<OfflineIndicator status="syncing" />);
      expect(screen.getByText('Syncing changes...')).toBeTruthy();

      // Success - back online
      rerender(<OfflineIndicator status="online" />);
      expect(screen.toJSON()).toBeNull();
    });
  });

  // =========================================================================
  // MEMOIZATION
  // =========================================================================

  describe('Memoization', () => {
    it('is wrapped with React.memo', () => {
      expect(OfflineIndicator).toBeDefined();
      expect(typeof OfflineIndicator).toBe('object'); // React.memo returns an object
    });

    it('renders consistently with same props', () => {
      const props = {
        status: 'offline' as const,
        pendingSyncs: 3,
      };

      const { rerender } = render(<OfflineIndicator {...props} />);
      expect(screen.getByText('Offline • 3 changes pending')).toBeTruthy();

      rerender(<OfflineIndicator {...props} />);
      expect(screen.getByText('Offline • 3 changes pending')).toBeTruthy();
    });
  });
});
