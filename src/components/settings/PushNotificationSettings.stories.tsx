/**
 * PushNotificationSettings Storybook Stories
 *
 * Visual documentation for the push notification settings component:
 * - Default state (all enabled)
 * - Disabled master toggle
 * - Permission denied
 * - Permission undetermined
 * - Loading states
 * - Simulator state
 * - Various category combinations
 */

import React from 'react';
import type { Meta, StoryObj } from '@storybook/react';
import { View } from 'react-native';
import { PushNotificationSettings } from './PushNotificationSettings';
import { usePushNotifications } from '@/hooks/usePushNotifications';

// Mock the hook for stories
jest.mock('@/hooks/usePushNotifications', () => ({
  usePushNotifications: jest.fn(),
}));

const mockUsePushNotifications = usePushNotifications as jest.MockedFunction<typeof usePushNotifications>;

// ============================================================================
// META
// ============================================================================

const meta: Meta<typeof PushNotificationSettings> = {
  title: 'Settings/PushNotificationSettings',
  component: PushNotificationSettings,
  parameters: {
    layout: 'padded',
  },
  decorators: [
    (Story) => (
      <View style={{ padding: 16, backgroundColor: '#F5F5F5', minHeight: 400 }}>
        <Story />
      </View>
    ),
  ],
};

export default meta;
type Story = StoryObj<typeof PushNotificationSettings>;

// ============================================================================
// HELPER
// ============================================================================

const createMockHook = (overrides: Partial<ReturnType<typeof usePushNotifications>> = {}) => {
  const defaults: ReturnType<typeof usePushNotifications> = {
    tokens: [],
    preferences: {
      pushEnabled: true,
      pushCompetitionUpdates: true,
      pushFriendRequests: true,
      pushScorecardUpdates: true,
      pushLeagueUpdates: true,
      pushSideGameUpdates: true,
      pushRoundReminders: true,
      pushSocialActivity: true,
    },
    permissionStatus: 'granted',
    isLoadingTokens: false,
    isLoadingPreferences: false,
    isLoadingPermission: false,
    isRegistering: false,
    isUpdatingPreferences: false,
    isRegistered: true,
    isPhysicalDevice: true,
    registerToken: async () => {},
    unregisterToken: async () => {},
    updatePreferences: async () => {},
    requestPermission: async () => 'granted',
    refreshPermissionStatus: async () => {},
    registrationError: null,
    preferencesError: null,
  };

  return {
    ...defaults,
    ...overrides,
  };
};

// ============================================================================
// STORIES - BASIC STATES
// ============================================================================

export const Default: Story = {
  render: () => {
    mockUsePushNotifications.mockReturnValue(createMockHook());
    return <PushNotificationSettings testID="push-settings" />;
  },
};

export const AllEnabled: Story = {
  render: () => {
    mockUsePushNotifications.mockReturnValue(
      createMockHook({
        preferences: {
          pushEnabled: true,
          pushCompetitionUpdates: true,
          pushFriendRequests: true,
          pushScorecardUpdates: true,
          pushLeagueUpdates: true,
          pushSideGameUpdates: true,
          pushRoundReminders: true,
          pushSocialActivity: true,
        },
      })
    );
    return <PushNotificationSettings testID="push-settings" />;
  },
};

export const AllDisabled: Story = {
  render: () => {
    mockUsePushNotifications.mockReturnValue(
      createMockHook({
        preferences: {
          pushEnabled: false,
          pushCompetitionUpdates: false,
          pushFriendRequests: false,
          pushScorecardUpdates: false,
          pushLeagueUpdates: false,
          pushSideGameUpdates: false,
          pushRoundReminders: false,
          pushSocialActivity: false,
        },
      })
    );
    return <PushNotificationSettings testID="push-settings" />;
  },
};

export const MasterDisabled: Story = {
  render: () => {
    mockUsePushNotifications.mockReturnValue(
      createMockHook({
        preferences: {
          pushEnabled: false,
          pushCompetitionUpdates: true,
          pushFriendRequests: true,
          pushScorecardUpdates: true,
          pushLeagueUpdates: true,
          pushSideGameUpdates: true,
          pushRoundReminders: true,
          pushSocialActivity: true,
        },
      })
    );
    return <PushNotificationSettings testID="push-settings" />;
  },
};

// ============================================================================
// STORIES - CATEGORY COMBINATIONS
// ============================================================================

export const OnlyCompetitionUpdates: Story = {
  render: () => {
    mockUsePushNotifications.mockReturnValue(
      createMockHook({
        preferences: {
          pushEnabled: true,
          pushCompetitionUpdates: true,
          pushFriendRequests: false,
          pushScorecardUpdates: false,
          pushLeagueUpdates: false,
          pushSideGameUpdates: false,
          pushRoundReminders: false,
          pushSocialActivity: false,
        },
      })
    );
    return <PushNotificationSettings testID="push-settings" />;
  },
};

export const OnlyFriendRequests: Story = {
  render: () => {
    mockUsePushNotifications.mockReturnValue(
      createMockHook({
        preferences: {
          pushEnabled: true,
          pushCompetitionUpdates: false,
          pushFriendRequests: true,
          pushScorecardUpdates: false,
          pushLeagueUpdates: false,
          pushSideGameUpdates: false,
          pushRoundReminders: false,
          pushSocialActivity: false,
        },
      })
    );
    return <PushNotificationSettings testID="push-settings" />;
  },
};

export const OnlyScorecardUpdates: Story = {
  render: () => {
    mockUsePushNotifications.mockReturnValue(
      createMockHook({
        preferences: {
          pushEnabled: true,
          pushCompetitionUpdates: false,
          pushFriendRequests: false,
          pushScorecardUpdates: true,
          pushLeagueUpdates: false,
          pushSideGameUpdates: false,
          pushRoundReminders: false,
          pushSocialActivity: false,
        },
      })
    );
    return <PushNotificationSettings testID="push-settings" />;
  },
};

export const NoCategorySelected: Story = {
  render: () => {
    mockUsePushNotifications.mockReturnValue(
      createMockHook({
        preferences: {
          pushEnabled: true,
          pushCompetitionUpdates: false,
          pushFriendRequests: false,
          pushScorecardUpdates: false,
          pushLeagueUpdates: false,
          pushSideGameUpdates: false,
          pushRoundReminders: false,
          pushSocialActivity: false,
        },
      })
    );
    return <PushNotificationSettings testID="push-settings" />;
  },
};

// ============================================================================
// STORIES - PERMISSION STATES
// ============================================================================

export const PermissionGranted: Story = {
  render: () => {
    mockUsePushNotifications.mockReturnValue(
      createMockHook({
        permissionStatus: 'granted',
      })
    );
    return <PushNotificationSettings testID="push-settings" />;
  },
};

export const PermissionDenied: Story = {
  render: () => {
    mockUsePushNotifications.mockReturnValue(
      createMockHook({
        permissionStatus: 'denied',
      })
    );
    return <PushNotificationSettings testID="push-settings" />;
  },
};

export const PermissionUndetermined: Story = {
  render: () => {
    mockUsePushNotifications.mockReturnValue(
      createMockHook({
        permissionStatus: 'undetermined',
        preferences: {
          pushEnabled: false,
          pushCompetitionUpdates: true,
          pushFriendRequests: true,
          pushScorecardUpdates: true,
          pushLeagueUpdates: true,
          pushSideGameUpdates: true,
          pushRoundReminders: true,
          pushSocialActivity: true,
        },
      })
    );
    return <PushNotificationSettings testID="push-settings" />;
  },
};

// ============================================================================
// STORIES - DEVICE STATES
// ============================================================================

export const Simulator: Story = {
  render: () => {
    mockUsePushNotifications.mockReturnValue(
      createMockHook({
        isPhysicalDevice: false,
      })
    );
    return <PushNotificationSettings testID="push-settings" />;
  },
};

export const PhysicalDevice: Story = {
  render: () => {
    mockUsePushNotifications.mockReturnValue(
      createMockHook({
        isPhysicalDevice: true,
      })
    );
    return <PushNotificationSettings testID="push-settings" />;
  },
};

// ============================================================================
// STORIES - LOADING STATES
// ============================================================================

export const LoadingPreferences: Story = {
  render: () => {
    mockUsePushNotifications.mockReturnValue(
      createMockHook({
        isLoadingPreferences: true,
      })
    );
    return <PushNotificationSettings testID="push-settings" />;
  },
};

export const LoadingPermission: Story = {
  render: () => {
    mockUsePushNotifications.mockReturnValue(
      createMockHook({
        isLoadingPermission: true,
      })
    );
    return <PushNotificationSettings testID="push-settings" />;
  },
};

export const UpdatingPreferences: Story = {
  render: () => {
    mockUsePushNotifications.mockReturnValue(
      createMockHook({
        isUpdatingPreferences: true,
      })
    );
    return <PushNotificationSettings testID="push-settings" />;
  },
};

export const AllLoading: Story = {
  render: () => {
    mockUsePushNotifications.mockReturnValue(
      createMockHook({
        isLoadingPreferences: true,
        isLoadingPermission: true,
        isUpdatingPreferences: true,
      })
    );
    return <PushNotificationSettings testID="push-settings" />;
  },
};

// ============================================================================
// STORIES - NULL/UNDEFINED STATES
// ============================================================================

export const NullPreferences: Story = {
  render: () => {
    mockUsePushNotifications.mockReturnValue(
      createMockHook({
        preferences: null as any,
      })
    );
    return <PushNotificationSettings testID="push-settings" />;
  },
};

export const UndefinedPreferences: Story = {
  render: () => {
    mockUsePushNotifications.mockReturnValue(
      createMockHook({
        preferences: undefined,
      })
    );
    return <PushNotificationSettings testID="push-settings" />;
  },
};

// ============================================================================
// STORIES - COMBINED STATES
// ============================================================================

export const DeniedWithDisabledMaster: Story = {
  render: () => {
    mockUsePushNotifications.mockReturnValue(
      createMockHook({
        permissionStatus: 'denied',
        preferences: {
          pushEnabled: false,
          pushCompetitionUpdates: true,
          pushFriendRequests: true,
          pushScorecardUpdates: true,
          pushLeagueUpdates: true,
          pushSideGameUpdates: true,
          pushRoundReminders: true,
          pushSocialActivity: true,
        },
      })
    );
    return <PushNotificationSettings testID="push-settings" />;
  },
};

export const SimulatorWithLoading: Story = {
  render: () => {
    mockUsePushNotifications.mockReturnValue(
      createMockHook({
        isPhysicalDevice: false,
        isLoadingPreferences: true,
      })
    );
    return <PushNotificationSettings testID="push-settings" />;
  },
};

export const NewUser: Story = {
  render: () => {
    mockUsePushNotifications.mockReturnValue(
      createMockHook({
        permissionStatus: 'undetermined',
        preferences: {
          pushEnabled: false,
          pushCompetitionUpdates: true,
          pushFriendRequests: true,
          pushScorecardUpdates: true,
          pushLeagueUpdates: true,
          pushSideGameUpdates: true,
          pushRoundReminders: true,
          pushSocialActivity: true,
        },
        isRegistered: false,
      })
    );
    return <PushNotificationSettings testID="push-settings" />;
  },
};

export const FullyConfigured: Story = {
  render: () => {
    mockUsePushNotifications.mockReturnValue(
      createMockHook({
        permissionStatus: 'granted',
        preferences: {
          pushEnabled: true,
          pushCompetitionUpdates: true,
          pushFriendRequests: true,
          pushScorecardUpdates: true,
          pushLeagueUpdates: true,
          pushSideGameUpdates: true,
          pushRoundReminders: true,
          pushSocialActivity: true,
        },
        isPhysicalDevice: true,
        isRegistered: true,
      })
    );
    return <PushNotificationSettings testID="push-settings" />;
  },
};

// ============================================================================
// STORIES - INTERACTION SCENARIOS
// ============================================================================

export const AboutToEnableNotifications: Story = {
  parameters: {
    docs: {
      description: {
        story: 'User is about to enable notifications for the first time.',
      },
    },
  },
  render: () => {
    mockUsePushNotifications.mockReturnValue(
      createMockHook({
        permissionStatus: 'undetermined',
        preferences: {
          pushEnabled: false,
          pushCompetitionUpdates: true,
          pushFriendRequests: true,
          pushScorecardUpdates: true,
          pushLeagueUpdates: true,
          pushSideGameUpdates: true,
          pushRoundReminders: true,
          pushSocialActivity: true,
        },
      })
    );
    return <PushNotificationSettings testID="push-settings" />;
  },
};

export const JustEnabledNotifications: Story = {
  parameters: {
    docs: {
      description: {
        story: 'User just enabled notifications and is seeing category toggles for the first time.',
      },
    },
  },
  render: () => {
    mockUsePushNotifications.mockReturnValue(
      createMockHook({
        permissionStatus: 'granted',
        preferences: {
          pushEnabled: true,
          pushCompetitionUpdates: true,
          pushFriendRequests: true,
          pushScorecardUpdates: true,
          pushLeagueUpdates: true,
          pushSideGameUpdates: true,
          pushRoundReminders: true,
          pushSocialActivity: true,
        },
      })
    );
    return <PushNotificationSettings testID="push-settings" />;
  },
};

export const RevokedPermission: Story = {
  parameters: {
    docs: {
      description: {
        story: 'User previously had notifications enabled but revoked permission in settings.',
      },
    },
  },
  render: () => {
    mockUsePushNotifications.mockReturnValue(
      createMockHook({
        permissionStatus: 'denied',
        preferences: {
          pushEnabled: true, // Still true in DB but permission denied
          pushCompetitionUpdates: true,
          pushFriendRequests: true,
          pushScorecardUpdates: true,
          pushLeagueUpdates: true,
          pushSideGameUpdates: true,
          pushRoundReminders: true,
          pushSocialActivity: true,
        },
      })
    );
    return <PushNotificationSettings testID="push-settings" />;
  },
};
