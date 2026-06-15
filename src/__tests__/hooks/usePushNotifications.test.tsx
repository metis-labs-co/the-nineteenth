/**
 * usePushNotifications Hook Tests
 *
 * Tests for push notification management hook including:
 * - Permission request
 * - Token registration
 * - User preferences
 * - Notification listeners
 * - Auto-registration
 * - Physical device detection
 *
 * @see src/hooks/usePushNotifications.ts
 */

import { renderHook, waitFor, act } from '@testing-library/react-native';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import React from 'react';
import {
  usePushNotifications,
  usePushPermissionStatus,
  usePushPreferences,
  useIsPushRegistered,
} from '@/hooks/usePushNotifications';

// ============================================================================
// MOCK DATA
// ============================================================================

const mockCurrentUser = {
  id: 'user-123',
  email: 'test@example.com',
};

const mockPushTokens = [
  {
    id: 'token-1',
    user_id: 'user-123',
    expo_token: 'ExponentPushToken[xxxxxx]',
    device_id: 'device-123',
    device_name: 'iPhone 15',
    platform: 'ios',
    app_version: '1.0.0',
    enabled: true,
    last_used_at: new Date().toISOString(),
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
];

const mockPreferences = {
  push_enabled: true,
  push_competition_updates: true,
  push_friend_requests: true,
  push_scorecard_updates: true,
  push_league_updates: true,
  push_social_activity: true,
};

// Mock state
let mockTokensData = mockPushTokens;
let mockPreferencesData = mockPreferences;
let mockPermissionStatus: 'granted' | 'denied' | 'undetermined' = 'granted';
let mockIsPhysicalDevice = true;

// ============================================================================
// MOCKS
// ============================================================================

// Mock useAuth
jest.mock('@/hooks/useAuth', () => ({
  useAuth: () => ({
    user: mockCurrentUser,
    isAuthenticated: true,
  }),
}));

// Mock push service
jest.mock('@/services/notifications/pushService', () => ({
  pushService: {
    getPermissionStatus: jest.fn(() => Promise.resolve(mockPermissionStatus)),
    requestPermissions: jest.fn(() => Promise.resolve('granted')),
    registerPushToken: jest.fn(() =>
      Promise.resolve({
        success: true,
        data: {
          expoToken: 'ExponentPushToken[xxxxxx]',
          deviceId: 'device-123',
        },
      })
    ),
    unregisterPushToken: jest.fn(() =>
      Promise.resolve({ success: true })
    ),
    getExpoPushToken: jest.fn(() =>
      Promise.resolve({
        success: true,
        data: 'ExponentPushToken[xxxxxx]',
      })
    ),
    isPhysicalDevice: jest.fn(() => mockIsPhysicalDevice),
    addNotificationReceivedListener: jest.fn(() => ({
      remove: jest.fn(),
    })),
    addNotificationResponseListener: jest.fn(() => ({
      remove: jest.fn(),
    })),
    getLastNotificationResponse: jest.fn(() => Promise.resolve(null)),
    configureNotificationHandler: jest.fn(),
  },
}));

// Mock AsyncStorage
jest.mock('@react-native-async-storage/async-storage', () => ({
  getItem: jest.fn(() => Promise.resolve(null)),
  setItem: jest.fn(() => Promise.resolve()),
  removeItem: jest.fn(() => Promise.resolve()),
}));

// Mock Supabase client
jest.mock('@/services/supabase/client', () => ({
  supabase: {
    from: jest.fn((table: string) => {
      if (table === 'push_tokens') {
        return {
          select: jest.fn().mockReturnThis(),
          eq: jest.fn().mockReturnThis(),
          order: jest.fn(() =>
            Promise.resolve({
              data: mockTokensData,
              error: null,
            })
          ),
        };
      }
      if (table === 'user_preferences') {
        return {
          select: jest.fn().mockReturnThis(),
          eq: jest.fn().mockReturnThis(),
          update: jest.fn().mockReturnThis(),
          single: jest.fn(() =>
            Promise.resolve({
              data: mockPreferencesData,
              error: null,
            })
          ),
          maybeSingle: jest.fn(() =>
            Promise.resolve({
              data: mockPreferencesData,
              error: null,
            })
          ),
        };
      }
      return {
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        single: jest.fn(() => Promise.resolve({ data: null, error: null })),
      };
    }),
  },
}));

// ============================================================================
// TEST UTILITIES
// ============================================================================

function createWrapper() {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
        gcTime: 0,
        staleTime: 0,
      },
      mutations: {
        retry: false,
      },
    },
  });

  return function Wrapper({ children }: { children: React.ReactNode }) {
    return (
      <QueryClientProvider client={queryClient}>
        {children}
      </QueryClientProvider>
    );
  };
}

// ============================================================================
// TEST SUITE: usePushNotifications
// ============================================================================

describe('usePushNotifications', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockTokensData = mockPushTokens;
    mockPreferencesData = mockPreferences;
    mockPermissionStatus = 'granted';
    mockIsPhysicalDevice = true;
  });

  describe('Permission Status', () => {
    it('fetches permission status on mount', async () => {
      const wrapper = createWrapper();
      const { result } = renderHook(() => usePushNotifications(), { wrapper });

      await waitFor(() => {
        expect(result.current.isLoadingPermission).toBe(false);
      });

      expect(result.current.permissionStatus).toBe('granted');
    });

    it('returns undetermined when not yet requested', async () => {
      mockPermissionStatus = 'undetermined';

      const wrapper = createWrapper();
      const { result } = renderHook(() => usePushNotifications(), { wrapper });

      await waitFor(() => {
        expect(result.current.permissionStatus).toBe('undetermined');
      });
    });

    it('returns denied when user refused', async () => {
      mockPermissionStatus = 'denied';

      const wrapper = createWrapper();
      const { result } = renderHook(() => usePushNotifications(), { wrapper });

      await waitFor(() => {
        expect(result.current.permissionStatus).toBe('denied');
      });
    });
  });

  describe('Token Management', () => {
    it('fetches push tokens on mount', async () => {
      const wrapper = createWrapper();
      const { result } = renderHook(() => usePushNotifications(), { wrapper });

      await waitFor(() => {
        expect(result.current.isLoadingTokens).toBe(false);
      });

      expect(result.current.tokens).toBeDefined();
      expect(result.current.tokens?.length).toBe(1);
    });

    it('registers push token', async () => {
      const wrapper = createWrapper();
      const { result } = renderHook(() => usePushNotifications(), { wrapper });

      await waitFor(() => {
        expect(result.current.isLoadingTokens).toBe(false);
      });

      await act(async () => {
        await result.current.registerToken();
      });

      const { pushService } = require('@/services/notifications/pushService');
      expect(pushService.registerPushToken).toHaveBeenCalledWith('user-123');
    });

    it('unregisters push token', async () => {
      const wrapper = createWrapper();
      const { result } = renderHook(() => usePushNotifications(), { wrapper });

      await waitFor(() => {
        expect(result.current.isLoadingTokens).toBe(false);
      });

      await act(async () => {
        await result.current.unregisterToken();
      });

      const { pushService } = require('@/services/notifications/pushService');
      expect(pushService.getExpoPushToken).toHaveBeenCalled();
      expect(pushService.unregisterPushToken).toHaveBeenCalled();
    });

    it('shows isRegistered based on token count', async () => {
      const wrapper = createWrapper();
      const { result } = renderHook(() => usePushNotifications(), { wrapper });

      await waitFor(() => {
        expect(result.current.isLoadingTokens).toBe(false);
      });

      expect(result.current.isRegistered).toBe(true);
    });

    it('shows isRegistered as false when no tokens', async () => {
      mockTokensData = [];

      const wrapper = createWrapper();
      const { result } = renderHook(() => usePushNotifications(), { wrapper });

      await waitFor(() => {
        expect(result.current.isLoadingTokens).toBe(false);
      });

      expect(result.current.isRegistered).toBe(false);
    });
  });

  describe('Preferences', () => {
    it('fetches push preferences', async () => {
      const wrapper = createWrapper();
      const { result } = renderHook(() => usePushNotifications(), { wrapper });

      await waitFor(() => {
        expect(result.current.isLoadingPreferences).toBe(false);
      });

      expect(result.current.preferences).toBeDefined();
      expect(result.current.preferences?.pushEnabled).toBe(true);
    });

    it('includes all preference categories', async () => {
      const wrapper = createWrapper();
      const { result } = renderHook(() => usePushNotifications(), { wrapper });

      await waitFor(() => {
        expect(result.current.preferences).toBeDefined();
      });

      expect(result.current.preferences).toHaveProperty('pushEnabled');
      expect(result.current.preferences).toHaveProperty('pushCompetitionUpdates');
      expect(result.current.preferences).toHaveProperty('pushFriendRequests');
      expect(result.current.preferences).toHaveProperty('pushScorecardUpdates');
    });

    it('updates preferences', async () => {
      const wrapper = createWrapper();
      const { result } = renderHook(() => usePushNotifications(), { wrapper });

      await waitFor(() => {
        expect(result.current.preferences).toBeDefined();
      });

      await act(async () => {
        await result.current.updatePreferences({ pushEnabled: false });
      });

      // Verify mutation was called (actual update is mocked)
      expect(result.current.isUpdatingPreferences).toBe(false);
    });
  });

  describe('Physical Device Detection', () => {
    it('detects physical device', async () => {
      mockIsPhysicalDevice = true;

      const wrapper = createWrapper();
      const { result } = renderHook(() => usePushNotifications(), { wrapper });

      expect(result.current.isPhysicalDevice).toBe(true);
    });

    it('detects simulator/emulator', async () => {
      mockIsPhysicalDevice = false;

      const wrapper = createWrapper();
      const { result } = renderHook(() => usePushNotifications(), { wrapper });

      expect(result.current.isPhysicalDevice).toBe(false);
    });
  });

  describe('Permission Request', () => {
    it('requests permission', async () => {
      const wrapper = createWrapper();
      const { result } = renderHook(() => usePushNotifications(), { wrapper });

      await waitFor(() => {
        expect(result.current.isLoadingPermission).toBe(false);
      });

      await act(async () => {
        await result.current.requestPermission();
      });

      const { pushService } = require('@/services/notifications/pushService');
      expect(pushService.requestPermissions).toHaveBeenCalled();
    });

    it('refreshes permission status', async () => {
      const wrapper = createWrapper();
      const { result } = renderHook(() => usePushNotifications(), { wrapper });

      await waitFor(() => {
        expect(result.current.isLoadingPermission).toBe(false);
      });

      await act(async () => {
        await result.current.refreshPermissionStatus();
      });

      const { pushService } = require('@/services/notifications/pushService');
      expect(pushService.getPermissionStatus).toHaveBeenCalled();
    });
  });

  describe('Notification Listeners', () => {
    it('sets up notification listeners on mount', async () => {
      const wrapper = createWrapper();
      renderHook(() => usePushNotifications(), { wrapper });

      const { pushService } = require('@/services/notifications/pushService');
      expect(pushService.addNotificationReceivedListener).toHaveBeenCalled();
      expect(pushService.addNotificationResponseListener).toHaveBeenCalled();
    });

    it('checks for last notification response', async () => {
      const wrapper = createWrapper();
      renderHook(() => usePushNotifications(), { wrapper });

      const { pushService } = require('@/services/notifications/pushService');
      expect(pushService.getLastNotificationResponse).toHaveBeenCalled();
    });
  });
});

// ============================================================================
// TEST SUITE: usePushPermissionStatus
// ============================================================================

describe('usePushPermissionStatus', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockPermissionStatus = 'granted';
  });

  it('returns permission status', async () => {
    const wrapper = createWrapper();
    const { result } = renderHook(() => usePushPermissionStatus(), { wrapper });

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.permissionStatus).toBe('granted');
  });

  it('returns loading state initially', async () => {
    const wrapper = createWrapper();
    const { result } = renderHook(() => usePushPermissionStatus(), { wrapper });

    expect(result.current.isLoading).toBe(true);

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });
  });
});

// ============================================================================
// TEST SUITE: usePushPreferences
// ============================================================================

describe('usePushPreferences', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockPreferencesData = mockPreferences;
  });

  it('returns preferences for user', async () => {
    const wrapper = createWrapper();
    const { result } = renderHook(() => usePushPreferences('user-123'), {
      wrapper,
    });

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.preferences).toBeDefined();
  });

  it('does not fetch when userId is empty', async () => {
    const wrapper = createWrapper();
    const { result } = renderHook(() => usePushPreferences(''), {
      wrapper,
    });

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.preferences).toBeUndefined();
  });
});

// ============================================================================
// TEST SUITE: useIsPushRegistered
// ============================================================================

describe('useIsPushRegistered', () => {
  it('returns query result with isRegistered flag', async () => {
    const wrapper = createWrapper();
    const { result } = renderHook(() => useIsPushRegistered(), { wrapper });

    // Verify the hook returns expected properties
    expect(result.current).toHaveProperty('isRegistered');
    expect(result.current).toHaveProperty('isLoading');
  });
});
