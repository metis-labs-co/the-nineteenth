/**
 * Notification Store - Zustand state management for notifications
 *
 * Manages notification state including:
 * - Unread count for badge display
 * - Recent notifications for quick access
 * - Real-time subscription status
 * - Callback for showing toast on new notifications
 */

import { create } from 'zustand';
import type { Notification } from '@/types/database.types';

/** Callback type for handling new notifications (e.g., showing toast) */
type NewNotificationCallback = (notification: Notification) => void;

interface NotificationState {
  // State
  unreadCount: number;
  recentNotifications: Notification[];
  isSubscribed: boolean;

  // Callback for new notifications (set by NotificationProvider)
  onNewNotification: NewNotificationCallback | null;

  // Actions
  setUnreadCount: (count: number) => void;
  incrementUnreadCount: () => void;
  decrementUnreadCount: () => void;
  addRecentNotification: (notification: Notification) => void;
  clearRecentNotifications: () => void;
  setIsSubscribed: (subscribed: boolean) => void;
  setOnNewNotification: (callback: NewNotificationCallback | null) => void;
}

export const useNotificationStore = create<NotificationState>((set, get) => ({
  // Initial state
  unreadCount: 0,
  recentNotifications: [],
  isSubscribed: false,
  onNewNotification: null,

  // Actions
  setUnreadCount: (count) => set({ unreadCount: count }),

  incrementUnreadCount: () =>
    set((state) => ({ unreadCount: state.unreadCount + 1 })),

  decrementUnreadCount: () =>
    set((state) => ({ unreadCount: Math.max(0, state.unreadCount - 1) })),

  addRecentNotification: (notification) => {
    // Update state
    set((state) => ({
      recentNotifications: [notification, ...state.recentNotifications].slice(
        0,
        10
      ), // Keep only 10 most recent
    }));

    // Call the callback if set (to show toast)
    const callback = get().onNewNotification;
    if (callback) {
      callback(notification);
    }
  },

  clearRecentNotifications: () => set({ recentNotifications: [] }),

  setIsSubscribed: (subscribed) => set({ isSubscribed: subscribed }),

  setOnNewNotification: (callback) => set({ onNewNotification: callback }),
}));
