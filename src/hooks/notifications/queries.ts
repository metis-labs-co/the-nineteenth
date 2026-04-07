/**
 * Notification Query Hooks
 *
 * TanStack Query hooks for fetching notification data and real-time subscriptions.
 *
 * ### Query Hooks
 * - `useNotifications()` - Fetch user's notifications list
 * - `useUnreadNotificationCount()` - Track unread notification count
 * - `useNotificationSubscription()` - Real-time subscription for new notifications
 */

import { useEffect } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/services/supabase/client';
import { CACHE_TIMES, GC_TIMES } from '@/constants/cacheConfig';
import { notificationKeys } from '../queryKeys';
import { useAuth } from '../useAuth';
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
