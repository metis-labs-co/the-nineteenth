/**
 * Notification Mutation Hooks
 *
 * TanStack Query mutation hooks for managing notifications.
 *
 * ### Mutation Hooks
 * - `useMarkNotificationRead()` - Mark a single notification as read
 * - `useMarkAllNotificationsRead()` - Mark all notifications as read
 * - `useDeleteNotification()` - Delete a notification
 */

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/services/supabase/client';
import { notificationKeys } from '../queryKeys';
import { useAuth } from '../useAuth';
import { useNotificationStore } from '@/store/notificationStore';
import type { Notification } from '@/types/database.types';

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
