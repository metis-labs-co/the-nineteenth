/**
 * useNotifications - Notification Management Hooks
 *
 * Provides comprehensive notification functionality:
 * - Fetch user's notifications list
 * - Track unread notification count
 * - Mark notifications as read (single or all)
 * - Delete notifications
 * - Real-time subscription for new notifications
 *
 * @example
 * ```tsx
 * function NotificationsScreen() {
 *   const { data: notifications, isLoading, refetch } = useNotifications();
 *   const markRead = useMarkNotificationRead();
 *   const unreadCount = useUnreadNotificationCount();
 *
 *   const handleMarkRead = (id: string) => {
 *     markRead.mutate(id);
 *   };
 *
 *   return (
 *     <View>
 *       <Text>Unread: {unreadCount.data}</Text>
 *       <NotificationsList notifications={notifications} onMarkRead={handleMarkRead} />
 *     </View>
 *   );
 * }
 * ```
 */

import { useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/services/supabase/client';
import { CACHE_TIMES, GC_TIMES } from '@/constants/cacheConfig';
import { notificationKeys } from './queryKeys';
import { useAuth } from './useAuth';
import { useNotificationStore } from '@/store/notificationStore';
import type { Notification } from '@/types/database.types';

/**
 * Hook: useNotifications
 * Fetches the current user's notifications list (most recent first)
 */
export function useNotifications() {
  const { user } = useAuth();

  return useQuery({
    queryKey: notificationKeys.list(),
    queryFn: async (): Promise<Notification[]> => {
      if (!user?.id) return [];

      const { data, error } = await supabase
        .from('notifications')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(50);

      if (error) {
        console.error('Error fetching notifications:', error);
        throw error;
      }

      return (data || []) as Notification[];
    },
    enabled: !!user?.id,
    staleTime: CACHE_TIMES.SHORT, // 30 seconds - check fairly frequently
    gcTime: GC_TIMES.SHORT, // 5 minutes
    retry: 2,
    refetchOnWindowFocus: true,
    refetchOnReconnect: true,
  });
}

/**
 * Hook: useUnreadNotificationCount
 * Fetches the count of unread notifications and syncs with store
 */
export function useUnreadNotificationCount() {
  const { user } = useAuth();
  const setUnreadCount = useNotificationStore((state) => state.setUnreadCount);

  const query = useQuery({
    queryKey: notificationKeys.unreadCount(),
    queryFn: async (): Promise<number> => {
      if (!user?.id) return 0;

      const { count, error } = await supabase
        .from('notifications')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', user.id)
        .eq('is_read', false);

      if (error) {
        throw error;
      }

      return count ?? 0;
    },
    enabled: !!user?.id,
    staleTime: CACHE_TIMES.SHORT, // 30 seconds
    gcTime: GC_TIMES.SHORT,
    retry: 2,
    refetchOnWindowFocus: true,
    refetchOnReconnect: true,
  });

  // Sync to store via useEffect instead of inside queryFn to avoid render loop
  useEffect(() => {
    if (query.data !== undefined) {
      setUnreadCount(query.data);
    }
  }, [query.data, setUnreadCount]);

  return query;
}

/**
 * Hook: useMarkNotificationRead
 * Mark a single notification as read
 */
export function useMarkNotificationRead() {
  const queryClient = useQueryClient();
  const decrementUnreadCount = useNotificationStore(
    (state) => state.decrementUnreadCount
  );

  return useMutation({
    mutationFn: async (notificationId: string) => {
      const { data, error } = await supabase
        .from('notifications')
        .update({
          is_read: true,
          read_at: new Date().toISOString(),
        } as never)
        .eq('id', notificationId)
        .select()
        .single();

      if (error) {
        console.error('Error marking notification as read:', error);
        throw error;
      }

      return data as Notification;
    },
    onSuccess: () => {
      // Decrement store count
      decrementUnreadCount();

      // Invalidate queries to refresh data
      queryClient.invalidateQueries({ queryKey: notificationKeys.list() });
      queryClient.invalidateQueries({ queryKey: notificationKeys.unreadCount() });
    },
  });
}

/**
 * Hook: useMarkAllNotificationsRead
 * Mark all user's unread notifications as read
 */
export function useMarkAllNotificationsRead() {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const setUnreadCount = useNotificationStore((state) => state.setUnreadCount);

  return useMutation({
    mutationFn: async () => {
      if (!user?.id) {
        throw new Error('Must be logged in to mark notifications as read');
      }

      const { error } = await supabase
        .from('notifications')
        .update({
          is_read: true,
          read_at: new Date().toISOString(),
        } as never)
        .eq('user_id', user.id)
        .eq('is_read', false);

      if (error) {
        console.error('Error marking all notifications as read:', error);
        throw error;
      }
    },
    onSuccess: () => {
      // Set store count to 0
      setUnreadCount(0);

      // Invalidate queries to refresh data
      queryClient.invalidateQueries({ queryKey: notificationKeys.list() });
      queryClient.invalidateQueries({ queryKey: notificationKeys.unreadCount() });
    },
  });
}

/**
 * Hook: useDeleteNotification
 * Delete a notification by ID
 */
export function useDeleteNotification() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (notificationId: string) => {
      // First check if the notification was unread (to update count)
      const { data: notification } = await supabase
        .from('notifications')
        .select('is_read')
        .eq('id', notificationId)
        .single();

      const { error } = await supabase
        .from('notifications')
        .delete()
        .eq('id', notificationId);

      if (error) {
        console.error('Error deleting notification:', error);
        throw error;
      }

      return { wasUnread: notification && !(notification as { is_read: boolean }).is_read };
    },
    onSuccess: (result) => {
      // If the deleted notification was unread, decrement store count
      if (result.wasUnread) {
        useNotificationStore.getState().decrementUnreadCount();
      }

      // Invalidate queries to refresh data
      queryClient.invalidateQueries({ queryKey: notificationKeys.list() });
      queryClient.invalidateQueries({ queryKey: notificationKeys.unreadCount() });
    },
  });
}

/**
 * Hook: useNotificationSubscription
 * Subscribe to real-time notifications for the current user
 *
 * @example
 * ```tsx
 * function App() {
 *   // Set up subscription when user is authenticated
 *   useNotificationSubscription();
 *
 *   return <Navigation />;
 * }
 * ```
 */
export function useNotificationSubscription() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  // Get stable references to store actions (these don't change)
  const incrementUnreadCount = useNotificationStore(
    (state) => state.incrementUnreadCount
  );
  const addRecentNotification = useNotificationStore(
    (state) => state.addRecentNotification
  );
  const setIsSubscribed = useNotificationStore(
    (state) => state.setIsSubscribed
  );

  // Only depend on user.id, not the entire user object
  const userId = user?.id;

  useEffect(() => {
    if (!userId) {
      setIsSubscribed(false);
      return;
    }

    const channelName = `notifications:${userId}`;

    const channel = supabase
      .channel(channelName)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'notifications',
          filter: `user_id=eq.${userId}`,
        },
        (payload) => {
          const newNotification = payload.new as Notification;

          // Increment unread count in store
          incrementUnreadCount();

          // Add to recent notifications in store
          addRecentNotification(newNotification);

          // Invalidate queries to refresh data
          queryClient.invalidateQueries({ queryKey: notificationKeys.list() });
          queryClient.invalidateQueries({
            queryKey: notificationKeys.unreadCount(),
          });
        }
      )
      .subscribe((status) => {
        if (status === 'SUBSCRIBED') {
          setIsSubscribed(true);
        } else if (status === 'CLOSED' || status === 'CHANNEL_ERROR') {
          setIsSubscribed(false);
        }
      });

    // Cleanup function
    return () => {
      setIsSubscribed(false);
      supabase.removeChannel(channel);
    };
  }, [
    userId,
    queryClient,
    incrementUnreadCount,
    addRecentNotification,
    setIsSubscribed,
  ]);
}
