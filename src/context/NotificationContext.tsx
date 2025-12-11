/**
 * NotificationContext - Provides notification state to the app
 *
 * This context provides:
 * - Unread notification count for badge display
 * - Real-time subscription status
 * - Automatic setup of Supabase Realtime subscription on mount
 * - Toast notifications for new notifications in real-time
 *
 * Usage:
 * ```tsx
 * import { useNotificationContext } from '@/context/NotificationContext';
 *
 * // Get notification state
 * const { unreadCount, isSubscribed } = useNotificationContext();
 *
 * // Display badge
 * {unreadCount > 0 && <Badge>{unreadCount}</Badge>}
 * ```
 */

import React, { createContext, useContext, useMemo, useEffect, useCallback, ReactNode } from 'react';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import {
  useNotificationSubscription,
  useUnreadNotificationCount,
} from '@/hooks/useNotifications';
import { useNotificationStore } from '@/store/notificationStore';
import { showNotificationToast } from '@/components/notifications/NotificationToast';
import type { RootStackParamList } from '@/navigation/types';
import type { Notification } from '@/types/database.types';

// ============================================================================
// TYPES
// ============================================================================

interface NotificationContextValue {
  /** Number of unread notifications */
  unreadCount: number;

  /** Whether the real-time subscription is active */
  isSubscribed: boolean;
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

  // Store actions - get stable reference
  const setOnNewNotification = useNotificationStore(
    (state) => state.setOnNewNotification
  );

  // Handle new notification - show toast and navigate on press
  // Use ref to avoid recreating callback when navigation changes
  const navigationRef = React.useRef(navigation);
  navigationRef.current = navigation;

  const handleNewNotification = useCallback(
    (notification: Notification) => {
      if (__DEV__) {
        console.log('[NotificationProvider] handleNewNotification called:', notification.id);
      }
      showNotificationToast(notification, () => {
        const nav = navigationRef.current;
        // Navigate based on notification type
        if (notification.competition_id) {
          nav.navigate('CompetitionDetail', {
            id: notification.competition_id,
          });
        } else if (notification.friendship_id) {
          nav.navigate('Friends', { fromProfile: true });
        } else {
          // Default: go to notifications list
          nav.navigate('Notifications');
        }
      });
    },
    [] // No dependencies - uses ref for navigation
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

  const value = useMemo<NotificationContextValue>(
    () => ({
      unreadCount,
      isSubscribed,
    }),
    [unreadCount, isSubscribed]
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
