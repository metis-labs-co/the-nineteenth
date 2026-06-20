/**
 * NotificationContext - Provides notification state to the app
 *
 * This context provides:
 * - Unread notification count for badge display
 * - Real-time subscription status
 * - Automatic setup of Supabase Realtime subscription on mount
 * - Toast notifications for new notifications in real-time
 * - Push notification integration (token registration, permissions, listeners)
 *
 * Usage:
 * ```tsx
 * import { useNotificationContext } from '@/context/NotificationContext';
 *
 * // Get notification state
 * const { unreadCount, isSubscribed, pushEnabled, pushPermissionStatus } = useNotificationContext();
 *
 * // Request push permission
 * const { requestPushPermission } = useNotificationContext();
 * await requestPushPermission();
 *
 * // Display badge
 * {unreadCount > 0 && <Badge>{unreadCount}</Badge>}
 * ```
 */

import React, { createContext, useContext, useMemo, useEffect, useCallback, ReactNode, useRef } from 'react';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import * as Notifications from 'expo-notifications';
import {
  useNotificationSubscription,
  useUnreadNotificationCount,
} from '@/hooks/useNotifications';
import { usePushNotifications } from '@/hooks/usePushNotifications';
import { useNotificationStore } from '@/store/notificationStore';
import { useToast } from '@/context/ToastContext';
import { pushService, type PermissionStatus } from '@/services/notifications';
import { isActivityDetailNotificationType } from '@/services/notifications/activityDeepLink';
import type { RootStackParamList } from '@/navigation/types';
import type { Notification } from '@/types/database.types';
import type { PushNotificationData } from '@/types/push.types';

// ============================================================================
// TYPES
// ============================================================================

interface NotificationContextValue {
  /** Number of unread notifications */
  unreadCount: number;

  /** Whether the real-time subscription is active */
  isSubscribed: boolean;

  /** Whether push notifications are enabled (user preference) */
  pushEnabled: boolean;

  /** Current push notification permission status */
  pushPermissionStatus: PermissionStatus | undefined;

  /** Request push notification permission from the user */
  requestPushPermission: () => Promise<PermissionStatus>;

  /** Whether push notifications are registered and working */
  isPushRegistered: boolean;
}

// ============================================================================
// CONTEXT
// ============================================================================

const NotificationContext = createContext<NotificationContextValue | undefined>(
  undefined
);

// ============================================================================
// PROVIDER
// ============================================================================

interface NotificationProviderProps {
  children: ReactNode;
}

/**
 * NotificationProvider - Wraps app to provide notification state
 *
 * Sets up:
 * - Real-time subscription for new notifications (via useNotificationSubscription)
 * - Initial unread count fetch (via useUnreadNotificationCount)
 * - Context value with unreadCount and isSubscribed from store
 * - Toast notifications when new notifications arrive
 * - Push notification listeners and handlers
 * - Auto-registration of push tokens on authentication
 *
 * @example
 * ```tsx
 * // In App.tsx
 * import { NotificationProvider } from '@/context/NotificationContext';
 *
 * function App() {
 *   return (
 *     <QueryClientProvider client={queryClient}>
 *       <ThemeProvider>
 *         <NotificationProvider>
 *           <Navigation />
 *         </NotificationProvider>
 *       </ThemeProvider>
 *     </QueryClientProvider>
 *   );
 * }
 * ```
 */
export function NotificationProvider({ children }: NotificationProviderProps) {
  if (__DEV__) {
    console.log('[NotificationProvider] Rendering');
  }

  // Navigation for toast press handling
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();

  // Push notifications hook - handles token management and listeners
  // Note: Auto-registration happens within usePushNotifications when user authenticates
  const {
    preferences: pushPreferences,
    permissionStatus: pushPermissionStatus,
    isRegistered: isPushRegistered,
    requestPermission,
  } = usePushNotifications();

  // Unified toast system
  const { showNotificationToast } = useToast();

  // Store actions - get stable reference
  const setOnNewNotification = useNotificationStore(
    (state) => state.setOnNewNotification
  );

  // Handle new notification - show toast and navigate on press
  // Use ref to avoid recreating callback when navigation changes
  const navigationRef = useRef(navigation);
  navigationRef.current = navigation;

  // Track if we've set up push notification listeners
  const pushListenersSetup = useRef(false);

  /**
   * Navigate to the appropriate screen based on notification data
   */
  const navigateToNotificationTarget = useCallback(
    (data: PushNotificationData) => {
      const nav = navigationRef.current;

      // Navigate based on notification data (most specific first)
      // Invitation/response types go to the scheduled-round detail screen.
      if (
        (data.type === 'social_round_invitation' || data.type === 'social_round_response') &&
        data.roundId
      ) {
        nav.navigate('ScheduledRound', { roundId: data.roundId });
      } else if (isActivityDetailNotificationType(data.type) && data.roundId) {
        nav.navigate('RoundActivity', { roundId: data.roundId });
      } else if (data.roundId) {
        // roundId alone is sufficient — standalone rounds have no competitionId
        nav.navigate('ViewRound', {
          roundId: data.roundId,
          competitionId: data.competitionId,
        });
      } else if (data.competitionId) {
        nav.navigate('CompetitionDetail', {
          id: data.competitionId,
        });
      } else if (data.leagueId) {
        nav.navigate('LeagueDetail', {
          id: data.leagueId,
        });
      } else if (data.friendshipId || data.type === 'friend_request_received' || data.type === 'friend_request_accepted') {
        nav.navigate('Friends', { fromProfile: true });
      } else {
        // Default: go to notifications list
        nav.navigate('Notifications');
      }
    },
    []
  );

  /**
   * Handle push notification response (when user taps notification)
   */
  const handleNotificationResponse = useCallback(
    (response: Notifications.NotificationResponse) => {
      if (__DEV__) {
        console.log('[NotificationProvider] Notification tapped:', response.notification.request.identifier);
      }

      // Extract notification data from push notification
      // The data comes from Expo Push API and may have the PushNotificationData shape
      const rawData = response.notification.request.content.data;

      // Safely extract known properties with type narrowing
      const data: Partial<PushNotificationData> | undefined = rawData ? {
        type: (rawData as Record<string, unknown>).type as PushNotificationData['type'] | undefined,
        title: (rawData as Record<string, unknown>).title as string | undefined,
        body: (rawData as Record<string, unknown>).body as string | undefined,
        competitionId: (rawData as Record<string, unknown>).competitionId as string | undefined,
        roundId: (rawData as Record<string, unknown>).roundId as string | undefined,
        playerId: (rawData as Record<string, unknown>).playerId as string | undefined,
        friendshipId: (rawData as Record<string, unknown>).friendshipId as string | undefined,
        leagueId: (rawData as Record<string, unknown>).leagueId as string | undefined,
        data: (rawData as Record<string, unknown>).data as Record<string, unknown> | undefined,
      } : undefined;

      if (data && (data.competitionId || data.roundId || data.friendshipId || data.leagueId || data.type)) {
        navigateToNotificationTarget(data as PushNotificationData);
      } else {
        // No data or no navigation context, just go to notifications list
        navigationRef.current.navigate('Notifications');
      }
    },
    [navigateToNotificationTarget]
  );

  /**
   * Handle foreground notification (when notification received while app is open)
   *
   * We coordinate with the in-app notification system:
   * - In-app notifications come via Supabase Realtime and show as toasts
   * - Push notifications that arrive while foregrounded should NOT show duplicate OS notification
   * - The Realtime subscription will handle showing the toast
   */
  const handleForegroundNotification = useCallback(
    (notification: Notifications.Notification) => {
      if (__DEV__) {
        console.log('[NotificationProvider] Foreground notification received:', notification.request.identifier);
      }

      // The in-app Realtime subscription will show the toast
      // We don't need to do anything here since shouldShowBanner is controlled
      // by the notification handler in pushService

      // However, if we want to suppress the OS notification entirely when foregrounded,
      // we can configure the notification handler dynamically
      // For now, we let both show as the toast is non-intrusive
    },
    []
  );

  // Set up push notification listeners on mount
  useEffect(() => {
    if (pushListenersSetup.current) {
      return;
    }

    pushListenersSetup.current = true;

    if (__DEV__) {
      console.log('[NotificationProvider] Setting up push notification listeners');
    }

    // Configure foreground notification handler. Source of truth lives in
    // src/services/notifications/channels.ts so the behaviour is co-located
    // with channel and category setup.
    pushService.configureNotificationHandler();

    // Set up Android notification channels
    pushService.setupAndroidNotificationChannel();

    // Add listener for foreground notifications
    const foregroundSubscription = pushService.addNotificationReceivedListener(
      handleForegroundNotification
    );

    // Add listener for notification responses (taps)
    const responseSubscription = pushService.addNotificationResponseListener(
      handleNotificationResponse
    );

    // Check for notification that opened the app (cold start)
    pushService.getLastNotificationResponse().then((response) => {
      if (response) {
        if (__DEV__) {
          console.log('[NotificationProvider] App opened from notification:', response.notification.request.identifier);
        }
        handleNotificationResponse(response);
      }
    });

    // Cleanup listeners on unmount
    return () => {
      if (__DEV__) {
        console.log('[NotificationProvider] Cleaning up push notification listeners');
      }
      foregroundSubscription.remove();
      responseSubscription.remove();
      pushListenersSetup.current = false;
    };
  }, [handleForegroundNotification, handleNotificationResponse]);

  const handleNewNotification = useCallback(
    (notification: Notification) => {
      if (__DEV__) {
        console.log('[NotificationProvider] handleNewNotification called:', notification.id);
      }
      showNotificationToast(notification, () => {
        const nav = navigationRef.current;
        // Navigate based on notification data
        // Invitation/response types go to the scheduled-round detail screen.
        if (
          (notification.type === 'social_round_invitation' ||
            notification.type === 'social_round_response') &&
          notification.round_id
        ) {
          nav.navigate('ScheduledRound', { roundId: notification.round_id });
        } else if (isActivityDetailNotificationType(notification.type) && notification.round_id) {
          nav.navigate('RoundActivity', { roundId: notification.round_id });
        } else if (notification.round_id) {
          // round_id first: round-specific notifications should land on the round
          nav.navigate('ViewRound', {
            roundId: notification.round_id,
            competitionId: notification.competition_id ?? undefined,
          });
        } else if (notification.competition_id) {
          nav.navigate('CompetitionDetail', {
            id: notification.competition_id,
          });
        } else if (notification.league_id) {
          nav.navigate('LeagueDetail', {
            id: notification.league_id,
          });
        } else if (notification.friendship_id) {
          nav.navigate('Friends', { fromProfile: true });
        } else {
          // Default: go to notifications list
          nav.navigate('Notifications');
        }
      });
    },
    [showNotificationToast] // showNotificationToast is stable from context
  );

  // Register the callback on mount only
  useEffect(() => {
    if (__DEV__) {
      console.log('[NotificationProvider] Registering callback');
    }
    setOnNewNotification(handleNewNotification);

    // Clean up on unmount
    return () => {
      if (__DEV__) {
        console.log('[NotificationProvider] Cleaning up callback');
      }
      setOnNewNotification(null);
    };
  }, [setOnNewNotification, handleNewNotification]);

  // Set up real-time subscription on mount
  if (__DEV__) {
    console.log('[NotificationProvider] Calling useNotificationSubscription');
  }
  useNotificationSubscription();

  // Fetch initial unread count (syncs with store)
  if (__DEV__) {
    console.log('[NotificationProvider] Calling useUnreadNotificationCount');
  }
  useUnreadNotificationCount();

  // Get values from store (updated by subscription and queries)
  const unreadCount = useNotificationStore((state) => state.unreadCount);
  const isSubscribed = useNotificationStore((state) => state.isSubscribed);

  if (__DEV__) {
    console.log('[NotificationProvider] Store values:', { unreadCount, isSubscribed });
  }

  // Request push permission - wrapper for context value
  const requestPushPermission = useCallback(async (): Promise<PermissionStatus> => {
    return requestPermission();
  }, [requestPermission]);

  // Determine if push is enabled from preferences
  const pushEnabled = pushPreferences?.pushEnabled ?? true;

  const value = useMemo<NotificationContextValue>(
    () => ({
      unreadCount,
      isSubscribed,
      pushEnabled,
      pushPermissionStatus,
      requestPushPermission,
      isPushRegistered,
    }),
    [unreadCount, isSubscribed, pushEnabled, pushPermissionStatus, requestPushPermission, isPushRegistered]
  );

  return (
    <NotificationContext.Provider value={value}>
      {children}
    </NotificationContext.Provider>
  );
}

// ============================================================================
// HOOKS
// ============================================================================

/**
 * Get notification context with unread count and subscription status
 *
 * @throws Error if used outside NotificationProvider
 *
 * @example
 * ```tsx
 * function NotificationBell() {
 *   const { unreadCount, isSubscribed } = useNotificationContext();
 *
 *   return (
 *     <View>
 *       <Icon name="bell" />
 *       {unreadCount > 0 && <Badge>{unreadCount}</Badge>}
 *       {!isSubscribed && <OfflineIndicator />}
 *     </View>
 *   );
 * }
 * ```
 */
export function useNotificationContext(): NotificationContextValue {
  const context = useContext(NotificationContext);
  if (context === undefined) {
    throw new Error(
      'useNotificationContext must be used within a NotificationProvider'
    );
  }
  return context;
}
