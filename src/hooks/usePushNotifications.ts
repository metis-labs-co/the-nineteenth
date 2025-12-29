/**
 * usePushNotifications - Push Notification Management Hook
 *
 * Provides comprehensive push notification functionality using TanStack Query:
 * - Push token management (register, unregister)
 * - Permission status tracking
 * - User push preferences
 * - Notification listeners setup
 * - Auto-registration on authentication
 *
 * Features:
 * - Queries for push tokens and preferences
 * - Mutations for registering tokens and updating preferences
 * - Automatic notification listeners on mount
 * - Device detection (physical device required)
 * - Auto-registration when authenticated
 *
 * @example
 * ```tsx
 * function NotificationSettings() {
 *   const {
 *     preferences,
 *     permissionStatus,
 *     isRegistered,
 *     registerToken,
 *     updatePreferences,
 *   } = usePushNotifications();
 *
 *   return (
 *     <Switch
 *       value={preferences?.pushEnabled}
 *       onValueChange={(enabled) => updatePreferences({ pushEnabled: enabled })}
 *     />
 *   );
 * }
 * ```
 */

import { useEffect, useCallback, useRef } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import * as Notifications from 'expo-notifications';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { supabase } from '@/services/supabase/client';
import { pushService, type PermissionStatus } from '@/services/notifications/pushService';
import { pushKeys, authKeys } from './queryKeys';
import { useAuth } from './useAuth';
import type {
  PushToken,
  PushPreferences,
  DBPushToken,
  mapDBPushToken,
} from '@/types/push.types';
import type { Player } from '@/types/database.types';

// =====================================================
// CONSTANTS
// =====================================================

const PUSH_TOKEN_REGISTERED_KEY = '@push_token_registered';
const STALE_TIME = 5 * 60 * 1000; // 5 minutes

// =====================================================
// TYPES
// =====================================================

/**
 * Push preferences update input
 */
export interface UpdatePushPreferencesInput {
  pushEnabled?: boolean;
  pushCompetitionUpdates?: boolean;
  pushFriendRequests?: boolean;
  pushScorecardUpdates?: boolean;
}

/**
 * Return type for usePushNotifications hook
 */
export interface UsePushNotificationsReturn {
  // Data
  tokens: PushToken[] | undefined;
  preferences: PushPreferences | undefined;
  permissionStatus: PermissionStatus | undefined;

  // Status
  isLoadingTokens: boolean;
  isLoadingPreferences: boolean;
  isLoadingPermission: boolean;
  isRegistering: boolean;
  isUpdatingPreferences: boolean;
  isRegistered: boolean;
  isPhysicalDevice: boolean;

  // Actions
  registerToken: () => Promise<void>;
  unregisterToken: () => Promise<void>;
  updatePreferences: (preferences: UpdatePushPreferencesInput) => Promise<void>;
  requestPermission: () => Promise<PermissionStatus>;
  refreshPermissionStatus: () => Promise<void>;

  // Errors
  registrationError: Error | null;
  preferencesError: Error | null;
}

// =====================================================
// HELPER FUNCTIONS
// =====================================================

/**
 * Map database PushToken (snake_case) to app PushToken (camelCase)
 */
function mapTokenFromDB(db: DBPushToken): PushToken {
  return {
    id: db.id,
    userId: db.user_id,
    expoToken: db.expo_token,
    deviceId: db.device_id,
    deviceName: db.device_name,
    platform: db.platform,
    appVersion: db.app_version,
    enabled: db.enabled,
    lastUsedAt: db.last_used_at ? new Date(db.last_used_at) : null,
    createdAt: new Date(db.created_at),
    updatedAt: new Date(db.updated_at),
  };
}

/**
 * Extract push preferences from player record
 */
function extractPreferences(player: Player): PushPreferences {
  return {
    pushEnabled: player.push_enabled,
    pushCompetitionUpdates: player.push_competition_updates,
    pushFriendRequests: player.push_friend_requests,
    pushScorecardUpdates: player.push_scorecard_updates,
  };
}

/**
 * Check if push token has been registered on this device
 */
async function hasRegisteredOnDevice(): Promise<boolean> {
  try {
    const value = await AsyncStorage.getItem(PUSH_TOKEN_REGISTERED_KEY);
    return value === 'true';
  } catch {
    return false;
  }
}

/**
 * Mark push token as registered on this device
 */
async function markRegisteredOnDevice(registered: boolean): Promise<void> {
  try {
    if (registered) {
      await AsyncStorage.setItem(PUSH_TOKEN_REGISTERED_KEY, 'true');
    } else {
      await AsyncStorage.removeItem(PUSH_TOKEN_REGISTERED_KEY);
    }
  } catch (error) {
    console.error('[usePushNotifications] Error updating registration status:', error);
  }
}

// =====================================================
// MAIN HOOK
// =====================================================

/**
 * Main push notifications hook
 *
 * Provides all push notification functionality including:
 * - Token management (register/unregister)
 * - Permission handling
 * - Preference management
 * - Auto-registration
 * - Notification listeners
 */
export function usePushNotifications(): UsePushNotificationsReturn {
  const queryClient = useQueryClient();
  const { user, isAuthenticated } = useAuth();
  const userId = user?.id ?? '';

  // Track if we've attempted auto-registration this session
  const hasAttemptedAutoRegister = useRef(false);

  // =====================================================
  // QUERIES
  // =====================================================

  /**
   * Query: User's push tokens from push_tokens table
   */
  const {
    data: tokens,
    isLoading: isLoadingTokens,
    error: tokensError,
  } = useQuery({
    queryKey: pushKeys.tokens(userId),
    queryFn: async (): Promise<PushToken[]> => {
      if (!userId) return [];

      const { data, error } = await supabase
        .from('push_tokens')
        .select('*')
        .eq('user_id', userId)
        .eq('enabled', true)
        .order('last_used_at', { ascending: false, nullsFirst: false });

      if (error) {
        console.error('[usePushNotifications] Error fetching tokens:', error);
        throw error;
      }

      return (data ?? []).map((token) => mapTokenFromDB(token as DBPushToken));
    },
    enabled: !!userId && isAuthenticated,
    staleTime: STALE_TIME,
  });

  /**
   * Query: User's push preferences from players table
   */
  const {
    data: preferences,
    isLoading: isLoadingPreferences,
    error: preferencesError,
  } = useQuery({
    queryKey: pushKeys.preferences(userId),
    queryFn: async (): Promise<PushPreferences | undefined> => {
      if (!userId) return undefined;

      type PushPrefsRow = {
        push_enabled: boolean;
        push_competition_updates: boolean;
        push_friend_requests: boolean;
        push_scorecard_updates: boolean;
      };

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data, error } = await (supabase as any)
        .from('user_preferences')
        .select('push_enabled, push_competition_updates, push_friend_requests, push_scorecard_updates')
        .eq('user_id', userId)
        .single() as { data: PushPrefsRow | null; error: Error | null };

      if (error) {
        console.error('[usePushNotifications] Error fetching preferences:', error);
        throw error;
      }

      if (!data) return undefined;

      return {
        pushEnabled: data.push_enabled,
        pushCompetitionUpdates: data.push_competition_updates,
        pushFriendRequests: data.push_friend_requests,
        pushScorecardUpdates: data.push_scorecard_updates,
      };
    },
    enabled: !!userId && isAuthenticated,
    staleTime: STALE_TIME,
  });

  /**
   * Query: Current permission status
   */
  const {
    data: permissionStatus,
    isLoading: isLoadingPermission,
    refetch: refetchPermission,
  } = useQuery({
    queryKey: pushKeys.permissionStatus(),
    queryFn: async (): Promise<PermissionStatus> => {
      return pushService.getPermissionStatus();
    },
    staleTime: 60 * 1000, // 1 minute - permissions don't change often
  });

  // =====================================================
  // MUTATIONS
  // =====================================================

  /**
   * Mutation: Register push token
   */
  const registerTokenMutation = useMutation({
    mutationFn: async (): Promise<void> => {
      if (!userId) {
        throw new Error('User must be authenticated to register push token');
      }

      const result = await pushService.registerPushToken(userId);

      if (!result.success) {
        throw new Error(result.error ?? 'Failed to register push token');
      }

      // Mark as registered on this device
      await markRegisteredOnDevice(true);

      if (__DEV__) {
        console.log('[usePushNotifications] Token registered:', result.data?.expoToken);
      }
    },
    onSuccess: () => {
      // Invalidate tokens query to refresh the list
      queryClient.invalidateQueries({ queryKey: pushKeys.tokens(userId) });
      // Refresh permission status
      queryClient.invalidateQueries({ queryKey: pushKeys.permissionStatus() });
    },
    onError: (error) => {
      console.error('[usePushNotifications] Registration error:', error);
    },
  });

  /**
   * Mutation: Unregister push token
   */
  const unregisterTokenMutation = useMutation({
    mutationFn: async (): Promise<void> => {
      // Get current device's token
      const tokenResult = await pushService.getExpoPushToken();

      if (!tokenResult.success || !tokenResult.data) {
        // If we can't get the token, just clear the local registration status
        await markRegisteredOnDevice(false);
        return;
      }

      const result = await pushService.unregisterPushToken(tokenResult.data);

      if (!result.success) {
        throw new Error(result.error ?? 'Failed to unregister push token');
      }

      // Mark as not registered on this device
      await markRegisteredOnDevice(false);

      if (__DEV__) {
        console.log('[usePushNotifications] Token unregistered');
      }
    },
    onSuccess: () => {
      // Invalidate tokens query to refresh the list
      queryClient.invalidateQueries({ queryKey: pushKeys.tokens(userId) });
    },
    onError: (error) => {
      console.error('[usePushNotifications] Unregistration error:', error);
    },
  });

  /**
   * Mutation: Update push preferences
   */
  const updatePreferencesMutation = useMutation({
    mutationFn: async (input: UpdatePushPreferencesInput): Promise<PushPreferences> => {
      if (!userId) {
        throw new Error('User must be authenticated to update push preferences');
      }

      type PushPrefsRow = {
        push_enabled: boolean;
        push_competition_updates: boolean;
        push_friend_requests: boolean;
        push_scorecard_updates: boolean;
      };

      // Build update object with only provided fields
      const updateData: Partial<PushPrefsRow> = {};

      if (input.pushEnabled !== undefined) {
        updateData.push_enabled = input.pushEnabled;
      }
      if (input.pushCompetitionUpdates !== undefined) {
        updateData.push_competition_updates = input.pushCompetitionUpdates;
      }
      if (input.pushFriendRequests !== undefined) {
        updateData.push_friend_requests = input.pushFriendRequests;
      }
      if (input.pushScorecardUpdates !== undefined) {
        updateData.push_scorecard_updates = input.pushScorecardUpdates;
      }

      if (Object.keys(updateData).length === 0) {
        throw new Error('No preferences to update');
      }

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data, error } = await (supabase as any)
        .from('user_preferences')
        .update(updateData)
        .eq('user_id', userId)
        .select('push_enabled, push_competition_updates, push_friend_requests, push_scorecard_updates')
        .single() as { data: PushPrefsRow | null; error: Error | null };

      if (error) {
        console.error('[usePushNotifications] Error updating preferences:', error);
        throw error;
      }

      if (!data) {
        throw new Error('No data returned from update');
      }

      return {
        pushEnabled: data.push_enabled,
        pushCompetitionUpdates: data.push_competition_updates,
        pushFriendRequests: data.push_friend_requests,
        pushScorecardUpdates: data.push_scorecard_updates,
      };
    },
    onMutate: async (input) => {
      // Cancel outgoing refetches
      await queryClient.cancelQueries({ queryKey: pushKeys.preferences(userId) });

      // Snapshot previous value
      const previousPreferences = queryClient.getQueryData<PushPreferences>(
        pushKeys.preferences(userId)
      );

      // Optimistically update
      if (previousPreferences) {
        queryClient.setQueryData<PushPreferences>(pushKeys.preferences(userId), {
          ...previousPreferences,
          ...input,
        });
      }

      return { previousPreferences };
    },
    onError: (err, _variables, context) => {
      // Rollback on error
      if (context?.previousPreferences) {
        queryClient.setQueryData(
          pushKeys.preferences(userId),
          context.previousPreferences
        );
      }
    },
    onSettled: () => {
      // Always refetch after error or success
      queryClient.invalidateQueries({ queryKey: pushKeys.preferences(userId) });
      // Also invalidate the player query to keep auth context in sync
      queryClient.invalidateQueries({ queryKey: authKeys.player(userId) });
    },
  });

  // =====================================================
  // NOTIFICATION LISTENERS
  // =====================================================

  useEffect(() => {
    // Set up notification listeners
    const receivedSubscription = pushService.addNotificationReceivedListener(
      (notification) => {
        if (__DEV__) {
          console.log('[usePushNotifications] Notification received in foreground:', notification);
        }
        // Foreground notifications are handled by the notification handler
        // configured in pushService.configureNotificationHandler()
      }
    );

    const responseSubscription = pushService.addNotificationResponseListener(
      (response) => {
        if (__DEV__) {
          console.log('[usePushNotifications] Notification tapped:', response);
        }
        // Navigation handling should be done in NotificationContext
        // This hook just provides the listener setup
      }
    );

    // Check for notification that opened the app
    pushService.getLastNotificationResponse().then((response) => {
      if (response) {
        if (__DEV__) {
          console.log('[usePushNotifications] App opened from notification:', response);
        }
        // Handle cold start notification
      }
    });

    // Cleanup
    return () => {
      receivedSubscription.remove();
      responseSubscription.remove();
    };
  }, []);

  // =====================================================
  // AUTO-REGISTRATION
  // =====================================================

  useEffect(() => {
    // Auto-register when:
    // 1. User is authenticated
    // 2. Running on physical device
    // 3. Haven't registered on this device yet
    // 4. Haven't attempted auto-registration this session
    const attemptAutoRegister = async () => {
      if (
        !isAuthenticated ||
        !userId ||
        !pushService.isPhysicalDevice() ||
        hasAttemptedAutoRegister.current
      ) {
        return;
      }

      hasAttemptedAutoRegister.current = true;

      // Check if already registered on this device
      const alreadyRegistered = await hasRegisteredOnDevice();
      if (alreadyRegistered) {
        if (__DEV__) {
          console.log('[usePushNotifications] Already registered on this device, skipping auto-registration');
        }
        return;
      }

      // Check current permission status
      const currentPermission = await pushService.getPermissionStatus();
      if (currentPermission === 'denied') {
        if (__DEV__) {
          console.log('[usePushNotifications] Permission denied, skipping auto-registration');
        }
        return;
      }

      // Attempt registration (will request permission if undetermined)
      if (__DEV__) {
        console.log('[usePushNotifications] Attempting auto-registration...');
      }

      try {
        await registerTokenMutation.mutateAsync();
      } catch (error) {
        // Don't block app flow if auto-registration fails
        console.warn('[usePushNotifications] Auto-registration failed:', error);
      }
    };

    attemptAutoRegister();
  }, [isAuthenticated, userId]);

  // =====================================================
  // ACTION HANDLERS
  // =====================================================

  const registerToken = useCallback(async (): Promise<void> => {
    await registerTokenMutation.mutateAsync();
  }, [registerTokenMutation]);

  const unregisterToken = useCallback(async (): Promise<void> => {
    await unregisterTokenMutation.mutateAsync();
  }, [unregisterTokenMutation]);

  const updatePreferences = useCallback(
    async (input: UpdatePushPreferencesInput): Promise<void> => {
      await updatePreferencesMutation.mutateAsync(input);
    },
    [updatePreferencesMutation]
  );

  const requestPermission = useCallback(async (): Promise<PermissionStatus> => {
    const status = await pushService.requestPermissions();
    // Refresh the permission status query
    await queryClient.invalidateQueries({ queryKey: pushKeys.permissionStatus() });
    return status;
  }, [queryClient]);

  const refreshPermissionStatus = useCallback(async (): Promise<void> => {
    await refetchPermission();
  }, [refetchPermission]);

  // =====================================================
  // COMPUTED VALUES
  // =====================================================

  // Check if user has any enabled tokens (registered)
  const isRegistered = (tokens?.length ?? 0) > 0;

  // Check if running on physical device
  const isPhysicalDevice = pushService.isPhysicalDevice();

  // =====================================================
  // RETURN
  // =====================================================

  return {
    // Data
    tokens,
    preferences,
    permissionStatus,

    // Status
    isLoadingTokens,
    isLoadingPreferences,
    isLoadingPermission,
    isRegistering: registerTokenMutation.isPending,
    isUpdatingPreferences: updatePreferencesMutation.isPending,
    isRegistered,
    isPhysicalDevice,

    // Actions
    registerToken,
    unregisterToken,
    updatePreferences,
    requestPermission,
    refreshPermissionStatus,

    // Errors
    registrationError: registerTokenMutation.error as Error | null,
    preferencesError: preferencesError as Error | null,
  };
}

// =====================================================
// CONVENIENCE HOOKS
// =====================================================

/**
 * Hook: usePermissionStatus
 * Lightweight hook for accessing only permission status
 */
export function usePushPermissionStatus() {
  const { data: permissionStatus, isLoading } = useQuery({
    queryKey: pushKeys.permissionStatus(),
    queryFn: async (): Promise<PermissionStatus> => {
      return pushService.getPermissionStatus();
    },
    staleTime: 60 * 1000,
  });

  return { permissionStatus, isLoading };
}

/**
 * Hook: usePushPreferences
 * Lightweight hook for accessing only push preferences
 */
export function usePushPreferences(userId: string) {
  const { data: preferences, isLoading } = useQuery({
    queryKey: pushKeys.preferences(userId),
    queryFn: async (): Promise<PushPreferences | undefined> => {
      if (!userId) return undefined;

      type PushPrefsRow = {
        push_enabled: boolean;
        push_competition_updates: boolean;
        push_friend_requests: boolean;
        push_scorecard_updates: boolean;
      };

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data, error } = await (supabase as any)
        .from('user_preferences')
        .select('push_enabled, push_competition_updates, push_friend_requests, push_scorecard_updates')
        .eq('user_id', userId)
        .single() as { data: PushPrefsRow | null; error: Error | null };

      if (error || !data) return undefined;

      return {
        pushEnabled: data.push_enabled,
        pushCompetitionUpdates: data.push_competition_updates,
        pushFriendRequests: data.push_friend_requests,
        pushScorecardUpdates: data.push_scorecard_updates,
      };
    },
    enabled: !!userId,
    staleTime: STALE_TIME,
  });

  return { preferences, isLoading };
}

/**
 * Hook: useIsPushRegistered
 * Lightweight hook to check if user has registered push notifications
 */
export function useIsPushRegistered() {
  const { user } = useAuth();
  const userId = user?.id ?? '';

  const { data: tokens, isLoading } = useQuery({
    queryKey: pushKeys.tokens(userId),
    queryFn: async (): Promise<number> => {
      if (!userId) return 0;

      const { count, error } = await supabase
        .from('push_tokens')
        .select('id', { count: 'exact', head: true })
        .eq('user_id', userId)
        .eq('enabled', true);

      if (error) return 0;
      return count ?? 0;
    },
    enabled: !!userId,
    staleTime: STALE_TIME,
  });

  return {
    isRegistered: (tokens ?? 0) > 0,
    isLoading,
  };
}

export default usePushNotifications;
