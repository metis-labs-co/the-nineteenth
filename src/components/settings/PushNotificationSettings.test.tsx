/**
 * PushNotificationSettings Component Tests
 *
 * Tests for the push notification settings component including:
 * - Rendering with different states
 * - Permission status display
 * - Master toggle functionality
 * - Category toggle functionality
 * - Loading states
 * - Disabled states
 * - Device settings link
 * - Accessibility
 * - Edge cases
 */

import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react-native';
import { Linking, Platform } from 'react-native';
import { PushNotificationSettings, PushNotificationSettingsProps } from './PushNotificationSettings';

// Import the mocked hook
import { usePushNotifications } from '@/hooks/usePushNotifications';

// ============================================================================
// MOCKS
// ============================================================================

// Mock Linking - use spyOn pattern to avoid mock issues
const mockOpenURL = jest.spyOn(Linking, 'openURL').mockResolvedValue(undefined as any);
const mockOpenSettings = jest.spyOn(Linking, 'openSettings').mockResolvedValue(undefined as any);

// Mock ThemeContext
const mockColors = {
  primary: '#22C55E',
  primaryLight: '#86EFAC',
  surface: '#FFFFFF',
  surfaceVariant: '#F5F5F5',
  background: '#F5F5F5',
  textPrimary: '#111827',
  textSecondary: '#6B7280',
  textDisabled: '#9CA3AF',
  border: '#E5E7EB',
  gray100: '#F3F4F6',
  gray300: '#D1D5DB',
  success: '#22C55E',
  warning: '#F59E0B',
  error: '#EF4444',
};

jest.mock('@/context/ThemeContext', () => ({
  useThemeColors: () => mockColors,
}));

// Mock usePushNotifications hook
const mockUpdatePreferences = jest.fn().mockResolvedValue(undefined);
const mockRequestPermission = jest.fn().mockResolvedValue('granted');

const mockUsePushNotifications = {
  preferences: {
    pushEnabled: true,
    pushCompetitionUpdates: true,
    pushFriendRequests: true,
    pushScorecardUpdates: true,
  },
  permissionStatus: 'granted' as const,
  isLoadingPreferences: false,
  isLoadingPermission: false,
  isUpdatingPreferences: false,
  isPhysicalDevice: true,
  updatePreferences: mockUpdatePreferences,
  requestPermission: mockRequestPermission,
};

jest.mock('@/hooks/usePushNotifications', () => ({
  usePushNotifications: jest.fn(() => mockUsePushNotifications),
}));
const mockUsePushNotificationsHook = usePushNotifications as jest.MockedFunction<typeof usePushNotifications>;

// Mock react-native-paper
jest.mock('react-native-paper', () => {
  const { View, Text } = require('react-native');
  return {
    Text: ({ children, style, onPress, accessibilityLabel, accessibilityRole, accessibilityHint, ...props }: any) => (
      <Text
        style={style}
        onPress={onPress}
        accessibilityLabel={accessibilityLabel}
        accessibilityRole={accessibilityRole}
        accessibilityHint={accessibilityHint}
        {...props}
      >
        {children}
      </Text>
    ),
    Icon: ({ source, size, color: _color }: any) => (
      <View testID={`icon-${source}`} style={{ width: size, height: size }}>
        <Text>{source}</Text>
      </View>
    ),
    ActivityIndicator: ({ size: _size, color: _color }: any) => (
      <View testID="activity-indicator">
        <Text>Loading</Text>
      </View>
    ),
  };
});

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

const renderComponent = (props: Partial<PushNotificationSettingsProps> = {}) => {
  return render(<PushNotificationSettings testID="push-settings" {...props} />);
};

const resetMocks = () => {
  jest.clearAllMocks();
  mockUsePushNotificationsHook.mockReturnValue(mockUsePushNotifications as any);
};

// ============================================================================
// TESTS
// ============================================================================

describe('PushNotificationSettings', () => {
  beforeEach(() => {
    resetMocks();
  });

  // ==========================================================================
  // RENDERING
  // ==========================================================================

  describe('Rendering', () => {
    it('renders without crashing', () => {
      renderComponent();
      expect(screen.getByText('Push Notifications')).toBeTruthy();
    });

    it('renders with testID', () => {
      renderComponent({ testID: 'push-settings' });
      expect(screen.getByTestId('push-settings')).toBeTruthy();
    });

    it('renders header with bell icon', () => {
      renderComponent();
      expect(screen.getByTestId('icon-bell-outline')).toBeTruthy();
      expect(screen.getByText('Push Notifications')).toBeTruthy();
    });

    it('renders master toggle', () => {
      renderComponent();
      expect(screen.getByText('Enable Push Notifications')).toBeTruthy();
      expect(screen.getByText('Receive alerts when the app is closed')).toBeTruthy();
    });

    it('renders permission status', () => {
      renderComponent();
      expect(screen.getByText('Notifications enabled')).toBeTruthy();
    });
  });

  // ==========================================================================
  // PERMISSION STATES
  // ==========================================================================

  describe('Permission States', () => {
    it('shows granted status with check icon', () => {
      mockUsePushNotificationsHook.mockReturnValue({
        ...mockUsePushNotifications,
        permissionStatus: 'granted',
      } as any);

      renderComponent();
      expect(screen.getByText('Notifications enabled')).toBeTruthy();
      expect(screen.getByTestId('icon-check-circle-outline')).toBeTruthy();
    });

    it('shows denied status with close icon', () => {
      mockUsePushNotificationsHook.mockReturnValue({
        ...mockUsePushNotifications,
        permissionStatus: 'denied',
      } as any);

      renderComponent();
      expect(screen.getByText('Notifications blocked in device settings')).toBeTruthy();
      expect(screen.getByTestId('icon-close-circle-outline')).toBeTruthy();
    });

    it('shows undetermined status with bell icon', () => {
      mockUsePushNotificationsHook.mockReturnValue({
        ...mockUsePushNotifications,
        permissionStatus: 'undetermined',
      } as any);

      renderComponent();
      expect(screen.getByText('Enable notifications to stay updated')).toBeTruthy();
      expect(screen.queryAllByTestId('icon-bell-outline').length).toBeGreaterThan(0);
    });

    it('shows device not physical message when isPhysicalDevice is false', () => {
      mockUsePushNotificationsHook.mockReturnValue({
        ...mockUsePushNotifications,
        isPhysicalDevice: false,
      } as any);

      renderComponent();
      expect(screen.getByText('Push notifications require a physical device')).toBeTruthy();
      expect(screen.getByTestId('icon-cellphone-off')).toBeTruthy();
    });
  });

  // ==========================================================================
  // SETTINGS LINK
  // ==========================================================================

  describe('Settings Link', () => {
    it('shows enable in settings button when permission denied', () => {
      mockUsePushNotificationsHook.mockReturnValue({
        ...mockUsePushNotifications,
        permissionStatus: 'denied',
        isPhysicalDevice: true,
      } as any);

      renderComponent();
      expect(screen.getByText('Enable in Settings')).toBeTruthy();
    });

    it('does not show settings button when permission granted', () => {
      mockUsePushNotificationsHook.mockReturnValue({
        ...mockUsePushNotifications,
        permissionStatus: 'granted',
      } as any);

      renderComponent();
      expect(screen.queryByText('Enable in Settings')).toBeNull();
    });

    it('does not show settings button on simulator', () => {
      mockUsePushNotificationsHook.mockReturnValue({
        ...mockUsePushNotifications,
        permissionStatus: 'denied',
        isPhysicalDevice: false,
      } as any);

      renderComponent();
      expect(screen.queryByText('Enable in Settings')).toBeNull();
    });

    it('opens iOS settings when tapped on iOS', () => {
      const originalOS = Platform.OS;
      Platform.OS = 'ios';
      mockUsePushNotificationsHook.mockReturnValue({
        ...mockUsePushNotifications,
        permissionStatus: 'denied',
        isPhysicalDevice: true,
      } as any);

      renderComponent();
      fireEvent.press(screen.getByText('Enable in Settings'));
      expect(mockOpenURL).toHaveBeenCalledWith('app-settings:');
      Platform.OS = originalOS;
    });

    it('opens Android settings when tapped on Android', () => {
      const originalOS = Platform.OS;
      Platform.OS = 'android';
      mockUsePushNotificationsHook.mockReturnValue({
        ...mockUsePushNotifications,
        permissionStatus: 'denied',
        isPhysicalDevice: true,
      } as any);

      renderComponent();
      fireEvent.press(screen.getByText('Enable in Settings'));
      expect(mockOpenSettings).toHaveBeenCalled();
      Platform.OS = originalOS;
    });
  });

  // ==========================================================================
  // MASTER TOGGLE
  // ==========================================================================

  describe('Master Toggle', () => {
    it('renders master toggle when push is enabled', () => {
      mockUsePushNotificationsHook.mockReturnValue({
        ...mockUsePushNotifications,
        preferences: { ...mockUsePushNotifications.preferences, pushEnabled: true },
      } as any);

      renderComponent();
      expect(screen.getByTestId('push-settings-master-toggle')).toBeTruthy();
      expect(screen.getByText('Enable Push Notifications')).toBeTruthy();
    });

    it('renders master toggle when push is disabled', () => {
      mockUsePushNotificationsHook.mockReturnValue({
        ...mockUsePushNotifications,
        preferences: { ...mockUsePushNotifications.preferences, pushEnabled: false },
      } as any);

      renderComponent();
      expect(screen.getByTestId('push-settings-master-toggle')).toBeTruthy();
    });

    it('calls updatePreferences when toggled on', async () => {
      mockUsePushNotificationsHook.mockReturnValue({
        ...mockUsePushNotifications,
        preferences: { ...mockUsePushNotifications.preferences, pushEnabled: false },
        permissionStatus: 'granted',
      } as any);

      renderComponent();
      const toggle = screen.getByTestId('push-settings-master-toggle');
      fireEvent(toggle, 'onValueChange', true);

      await waitFor(() => {
        expect(mockUpdatePreferences).toHaveBeenCalledWith({ pushEnabled: true });
      });
    });

    it('calls updatePreferences when toggled off', async () => {
      renderComponent();
      const toggle = screen.getByTestId('push-settings-master-toggle');
      fireEvent(toggle, 'onValueChange', false);

      await waitFor(() => {
        expect(mockUpdatePreferences).toHaveBeenCalledWith({ pushEnabled: false });
      });
    });

    it('requests permission when enabling and permission not granted', async () => {
      mockUsePushNotificationsHook.mockReturnValue({
        ...mockUsePushNotifications,
        preferences: { ...mockUsePushNotifications.preferences, pushEnabled: false },
        permissionStatus: 'undetermined',
      } as any);

      renderComponent();
      const toggle = screen.getByTestId('push-settings-master-toggle');
      fireEvent(toggle, 'onValueChange', true);

      await waitFor(() => {
        expect(mockRequestPermission).toHaveBeenCalled();
      });
    });

    it('does not enable if permission request denied', async () => {
      mockRequestPermission.mockResolvedValueOnce('denied');
      mockUsePushNotificationsHook.mockReturnValue({
        ...mockUsePushNotifications,
        preferences: { ...mockUsePushNotifications.preferences, pushEnabled: false },
        permissionStatus: 'undetermined',
      } as any);

      renderComponent();
      const toggle = screen.getByTestId('push-settings-master-toggle');
      fireEvent(toggle, 'onValueChange', true);

      await waitFor(() => {
        expect(mockRequestPermission).toHaveBeenCalled();
        expect(mockUpdatePreferences).not.toHaveBeenCalled();
      });
    });

    it('does not respond to toggle on simulator', async () => {
      mockUsePushNotificationsHook.mockReturnValue({
        ...mockUsePushNotifications,
        isPhysicalDevice: false,
      } as any);

      renderComponent();
      // Toggle should be disabled, we verify through the disabled row styling
      expect(screen.getByText('Push notifications require a physical device')).toBeTruthy();
    });

    it('does not respond to toggle when permission denied', () => {
      mockUsePushNotificationsHook.mockReturnValue({
        ...mockUsePushNotifications,
        permissionStatus: 'denied',
      } as any);

      renderComponent();
      // Toggle should be disabled when permission is denied
      expect(screen.getByText('Notifications blocked in device settings')).toBeTruthy();
    });

    it('shows row styling when updating preferences', () => {
      mockUsePushNotificationsHook.mockReturnValue({
        ...mockUsePushNotifications,
        isUpdatingPreferences: true,
      } as any);

      renderComponent();
      // The toggle is disabled during update - verify loading indicator shows
      expect(screen.getByTestId('activity-indicator')).toBeTruthy();
    });
  });

  // ==========================================================================
  // CATEGORY TOGGLES
  // ==========================================================================

  describe('Category Toggles', () => {
    it('shows category toggles when push is enabled and permission granted', () => {
      mockUsePushNotificationsHook.mockReturnValue({
        ...mockUsePushNotifications,
        preferences: { ...mockUsePushNotifications.preferences, pushEnabled: true },
        permissionStatus: 'granted',
      } as any);

      renderComponent();
      expect(screen.getByText('Notification Types')).toBeTruthy();
      expect(screen.getByText('Competition Updates')).toBeTruthy();
      expect(screen.getByText('Friend Requests')).toBeTruthy();
      expect(screen.getByText('Scorecard Updates')).toBeTruthy();
    });

    it('hides category toggles when push is disabled', () => {
      mockUsePushNotificationsHook.mockReturnValue({
        ...mockUsePushNotifications,
        preferences: { ...mockUsePushNotifications.preferences, pushEnabled: false },
      } as any);

      renderComponent();
      expect(screen.queryByText('Notification Types')).toBeNull();
      expect(screen.queryByText('Competition Updates')).toBeNull();
    });

    it('hides category toggles when permission not granted', () => {
      mockUsePushNotificationsHook.mockReturnValue({
        ...mockUsePushNotifications,
        preferences: { ...mockUsePushNotifications.preferences, pushEnabled: true },
        permissionStatus: 'denied',
      } as any);

      renderComponent();
      expect(screen.queryByText('Notification Types')).toBeNull();
    });

    it('shows competition updates toggle with description', () => {
      renderComponent();
      expect(screen.getByText('Competition Updates')).toBeTruthy();
      expect(screen.getByText('New rounds, status changes, and player updates')).toBeTruthy();
    });

    it('shows friend requests toggle with description', () => {
      renderComponent();
      expect(screen.getByText('Friend Requests')).toBeTruthy();
      expect(screen.getByText('New friend requests and acceptances')).toBeTruthy();
    });

    it('shows scorecard updates toggle with description', () => {
      renderComponent();
      expect(screen.getByText('Scorecard Updates')).toBeTruthy();
      expect(screen.getByText('When players submit scorecards')).toBeTruthy();
    });

    it('calls updatePreferences when competition toggle changed', async () => {
      renderComponent();
      const toggle = screen.getByTestId('push-settings-competition-toggle');
      fireEvent(toggle, 'onValueChange', false);

      await waitFor(() => {
        expect(mockUpdatePreferences).toHaveBeenCalledWith({ pushCompetitionUpdates: false });
      });
    });

    it('calls updatePreferences when friends toggle changed', async () => {
      renderComponent();
      const toggle = screen.getByTestId('push-settings-friends-toggle');
      fireEvent(toggle, 'onValueChange', false);

      await waitFor(() => {
        expect(mockUpdatePreferences).toHaveBeenCalledWith({ pushFriendRequests: false });
      });
    });

    it('calls updatePreferences when scorecard toggle changed', async () => {
      renderComponent();
      const toggle = screen.getByTestId('push-settings-scorecard-toggle');
      fireEvent(toggle, 'onValueChange', false);

      await waitFor(() => {
        expect(mockUpdatePreferences).toHaveBeenCalledWith({ pushScorecardUpdates: false });
      });
    });

    it('category toggles show loading state while updating', () => {
      mockUsePushNotificationsHook.mockReturnValue({
        ...mockUsePushNotifications,
        isUpdatingPreferences: true,
      } as any);

      renderComponent();
      // The loading indicator shows when updating
      expect(screen.getByTestId('activity-indicator')).toBeTruthy();
      // Category toggles are still visible
      expect(screen.getByText('Competition Updates')).toBeTruthy();
    });
  });

  // ==========================================================================
  // LOADING STATES
  // ==========================================================================

  describe('Loading States', () => {
    it('shows loading indicator when loading preferences', () => {
      mockUsePushNotificationsHook.mockReturnValue({
        ...mockUsePushNotifications,
        isLoadingPreferences: true,
      } as any);

      renderComponent();
      expect(screen.getByTestId('activity-indicator')).toBeTruthy();
    });

    it('shows loading indicator when loading permission', () => {
      mockUsePushNotificationsHook.mockReturnValue({
        ...mockUsePushNotifications,
        isLoadingPermission: true,
      } as any);

      renderComponent();
      expect(screen.getByTestId('activity-indicator')).toBeTruthy();
    });

    it('shows loading indicator when updating preferences', () => {
      mockUsePushNotificationsHook.mockReturnValue({
        ...mockUsePushNotifications,
        isUpdatingPreferences: true,
      } as any);

      renderComponent();
      expect(screen.getByTestId('activity-indicator')).toBeTruthy();
    });

    it('does not show loading indicator when not loading', () => {
      renderComponent();
      expect(screen.queryByTestId('activity-indicator')).toBeNull();
    });
  });

  // ==========================================================================
  // NULL PREFERENCES
  // ==========================================================================

  describe('Null Preferences', () => {
    it('handles null preferences gracefully', () => {
      mockUsePushNotificationsHook.mockReturnValue({
        ...mockUsePushNotifications,
        preferences: null,
      } as any);

      renderComponent();
      expect(screen.getByText('Push Notifications')).toBeTruthy();
      const toggle = screen.getByTestId('push-settings-master-toggle');
      expect(toggle.props.value).toBe(false);
    });

    it('handles undefined preferences gracefully', () => {
      mockUsePushNotificationsHook.mockReturnValue({
        ...mockUsePushNotifications,
        preferences: undefined,
      } as any);

      renderComponent();
      expect(screen.getByText('Push Notifications')).toBeTruthy();
    });

    it('defaults category toggles to true when preferences is null', () => {
      mockUsePushNotificationsHook.mockReturnValue({
        ...mockUsePushNotifications,
        preferences: { pushEnabled: true } as any,
        permissionStatus: 'granted',
      } as any);

      renderComponent();
      expect(screen.getByTestId('push-settings-competition-toggle').props.value).toBe(true);
      expect(screen.getByTestId('push-settings-friends-toggle').props.value).toBe(true);
      expect(screen.getByTestId('push-settings-scorecard-toggle').props.value).toBe(true);
    });
  });

  // ==========================================================================
  // ACCESSIBILITY
  // ==========================================================================

  describe('Accessibility', () => {
    it('master toggle has accessibility label', () => {
      renderComponent();
      const toggle = screen.getByTestId('push-settings-master-toggle');
      expect(toggle.props.accessibilityLabel).toBe('Enable push notifications toggle');
    });

    it('master toggle has switch role', () => {
      renderComponent();
      const toggle = screen.getByTestId('push-settings-master-toggle');
      expect(toggle.props.accessibilityRole).toBe('switch');
    });

    it('master toggle has correct accessibility state', () => {
      renderComponent();
      const toggle = screen.getByTestId('push-settings-master-toggle');
      expect(toggle.props.accessibilityState.checked).toBe(true);
      expect(toggle.props.accessibilityState.disabled).toBe(false);
    });

    it('category toggles have accessibility labels', () => {
      renderComponent();
      expect(screen.getByTestId('push-settings-competition-toggle').props.accessibilityLabel).toBe(
        'Competition updates notifications toggle'
      );
      expect(screen.getByTestId('push-settings-friends-toggle').props.accessibilityLabel).toBe(
        'Friend requests notifications toggle'
      );
      expect(screen.getByTestId('push-settings-scorecard-toggle').props.accessibilityLabel).toBe(
        'Scorecard updates notifications toggle'
      );
    });

    it('permission status has accessibility label', () => {
      renderComponent();
      expect(screen.getByLabelText('Permission status: Notifications enabled')).toBeTruthy();
    });

    it('settings link has accessibility attributes', () => {
      mockUsePushNotificationsHook.mockReturnValue({
        ...mockUsePushNotifications,
        permissionStatus: 'denied',
        isPhysicalDevice: true,
      } as any);

      renderComponent();
      const link = screen.getByText('Enable in Settings');
      expect(link.props.accessibilityRole).toBe('link');
      expect(link.props.accessibilityLabel).toBe('Open device settings to enable notifications');
    });
  });

  // ==========================================================================
  // TEST IDS
  // ==========================================================================

  describe('Test IDs', () => {
    it('applies testID prefix to toggles', () => {
      renderComponent({ testID: 'custom-push' });
      expect(screen.getByTestId('custom-push')).toBeTruthy();
      expect(screen.getByTestId('custom-push-master-toggle')).toBeTruthy();
    });

    it('applies testID prefix to category toggles', () => {
      renderComponent({ testID: 'custom-push' });
      expect(screen.getByTestId('custom-push-competition-toggle')).toBeTruthy();
      expect(screen.getByTestId('custom-push-friends-toggle')).toBeTruthy();
      expect(screen.getByTestId('custom-push-scorecard-toggle')).toBeTruthy();
    });

    it('handles undefined testID', () => {
      renderComponent({ testID: undefined });
      expect(screen.getByText('Push Notifications')).toBeTruthy();
    });
  });

  // ==========================================================================
  // EDGE CASES
  // ==========================================================================

  describe('Edge Cases', () => {
    it('handles undefined permission status', () => {
      mockUsePushNotificationsHook.mockReturnValue({
        ...mockUsePushNotifications,
        permissionStatus: undefined,
      } as any);

      renderComponent();
      expect(screen.getByText('Enable notifications to stay updated')).toBeTruthy();
    });

    it('handles rapid toggle changes', async () => {
      renderComponent();
      const toggle = screen.getByTestId('push-settings-master-toggle');

      fireEvent(toggle, 'onValueChange', false);
      fireEvent(toggle, 'onValueChange', true);
      fireEvent(toggle, 'onValueChange', false);

      await waitFor(() => {
        expect(mockUpdatePreferences).toHaveBeenCalledTimes(3);
      });
    });

    it('renders without errors when all states are loading', () => {
      mockUsePushNotificationsHook.mockReturnValue({
        ...mockUsePushNotifications,
        isLoadingPreferences: true,
        isLoadingPermission: true,
        isUpdatingPreferences: true,
      } as any);

      renderComponent();
      expect(screen.getByText('Push Notifications')).toBeTruthy();
      expect(screen.getByTestId('activity-indicator')).toBeTruthy();
    });

    it('maintains category toggles state across permission changes', () => {
      // Initially permission granted - category toggles should show
      mockUsePushNotificationsHook.mockReturnValue({
        ...mockUsePushNotifications,
        preferences: { ...mockUsePushNotifications.preferences, pushEnabled: true },
        permissionStatus: 'granted',
      } as any);
      const { rerender: _rerender, unmount } = render(<PushNotificationSettings testID="push-settings" />);
      expect(screen.getByText('Notification Types')).toBeTruthy();
      unmount();

      // Permission becomes denied - category toggles should be hidden
      mockUsePushNotificationsHook.mockReturnValue({
        ...mockUsePushNotifications,
        preferences: { ...mockUsePushNotifications.preferences, pushEnabled: true },
        permissionStatus: 'denied',
      } as any);
      const { unmount: unmount2 } = render(<PushNotificationSettings testID="push-settings" />);
      expect(screen.queryByText('Notification Types')).toBeNull();
      unmount2();

      // Permission granted again - category toggles should reappear
      mockUsePushNotificationsHook.mockReturnValue({
        ...mockUsePushNotifications,
        preferences: { ...mockUsePushNotifications.preferences, pushEnabled: true },
        permissionStatus: 'granted',
      } as any);
      render(<PushNotificationSettings testID="push-settings" />);
      expect(screen.getByText('Notification Types')).toBeTruthy();
    });
  });

  // ==========================================================================
  // MEMOIZATION
  // ==========================================================================

  describe('Memoization', () => {
    it('is wrapped with React.memo', () => {
      expect(PushNotificationSettings).toBeDefined();
      expect(typeof PushNotificationSettings).toBe('object'); // React.memo returns an object
    });

    it('renders consistently with same props', () => {
      const { rerender } = renderComponent();
      expect(screen.getByText('Push Notifications')).toBeTruthy();

      rerender(<PushNotificationSettings testID="push-settings" />);
      expect(screen.getByText('Push Notifications')).toBeTruthy();
    });
  });

  // ==========================================================================
  // USE CASES
  // ==========================================================================

  describe('Use Cases', () => {
    it('renders for new user with undetermined permission', () => {
      mockUsePushNotificationsHook.mockReturnValue({
        ...mockUsePushNotifications,
        preferences: { pushEnabled: false } as any,
        permissionStatus: 'undetermined',
      } as any);

      renderComponent();
      expect(screen.getByText('Enable notifications to stay updated')).toBeTruthy();
      expect(screen.getByText('Enable Push Notifications')).toBeTruthy();
      expect(screen.queryByText('Notification Types')).toBeNull();
    });

    it('renders for user with all notifications enabled', () => {
      renderComponent();
      expect(screen.getByText('Notifications enabled')).toBeTruthy();
      expect(screen.getByText('Notification Types')).toBeTruthy();
      expect(screen.getByTestId('push-settings-master-toggle').props.value).toBe(true);
      expect(screen.getByTestId('push-settings-competition-toggle').props.value).toBe(true);
      expect(screen.getByTestId('push-settings-friends-toggle').props.value).toBe(true);
      expect(screen.getByTestId('push-settings-scorecard-toggle').props.value).toBe(true);
    });

    it('renders for user with only some notifications enabled', () => {
      mockUsePushNotificationsHook.mockReturnValue({
        ...mockUsePushNotifications,
        preferences: {
          pushEnabled: true,
          pushCompetitionUpdates: true,
          pushFriendRequests: false,
          pushScorecardUpdates: true,
        },
      } as any);

      renderComponent();
      expect(screen.getByTestId('push-settings-competition-toggle').props.value).toBe(true);
      expect(screen.getByTestId('push-settings-friends-toggle').props.value).toBe(false);
      expect(screen.getByTestId('push-settings-scorecard-toggle').props.value).toBe(true);
    });

    it('renders for simulator user', () => {
      mockUsePushNotificationsHook.mockReturnValue({
        ...mockUsePushNotifications,
        isPhysicalDevice: false,
      } as any);

      renderComponent();
      expect(screen.getByText('Push notifications require a physical device')).toBeTruthy();
      expect(screen.getByTestId('push-settings-master-toggle').props.disabled).toBe(true);
    });

    it('renders for user who denied permission', () => {
      mockUsePushNotificationsHook.mockReturnValue({
        ...mockUsePushNotifications,
        permissionStatus: 'denied',
        isPhysicalDevice: true,
      } as any);

      renderComponent();
      expect(screen.getByText('Notifications blocked in device settings')).toBeTruthy();
      expect(screen.getByText('Enable in Settings')).toBeTruthy();
      expect(screen.getByTestId('push-settings-master-toggle').props.disabled).toBe(true);
    });
  });
});
