/**
 * Online Status Hook
 *
 * Centralized hook for checking online/offline status.
 * Provides reactive updates via hook and utility function for non-hook contexts.
 *
 * @example
 * // In React components
 * function MyComponent() {
 *   const isOnline = useOnlineStatus();
 *   return <Text>{isOnline ? 'Online' : 'Offline'}</Text>;
 * }
 *
 * @example
 * // In non-hook contexts (services, utilities)
 * async function syncData() {
 *   if (await checkIsOnline()) {
 *     // Perform sync
 *   }
 * }
 */

import { useState, useEffect, useCallback } from 'react';
import NetInfo, { NetInfoState } from '@react-native-community/netinfo';

// Module-level state for sync service compatibility
let cachedIsOnline = true;

/**
 * React hook for reactive online status updates.
 *
 * Subscribes to NetInfo changes and provides real-time online/offline status.
 * Use this in React components for automatic re-renders when status changes.
 *
 * @returns Boolean indicating whether the device is online
 */
export function useOnlineStatus(): boolean {
  const [isOnline, setIsOnline] = useState(cachedIsOnline);

  useEffect(() => {
    // Get initial state
    NetInfo.fetch().then((state) => {
      const online = state.isConnected ?? true;
      setIsOnline(online);
      cachedIsOnline = online;
    });

    // Subscribe to changes
    const unsubscribe = NetInfo.addEventListener((state: NetInfoState) => {
      const online = state.isConnected ?? true;
      setIsOnline(online);
      cachedIsOnline = online;
    });

    return unsubscribe;
  }, []);

  return isOnline;
}

/**
 * Async utility function for checking online status in non-hook contexts.
 *
 * Use this in services, utilities, or other non-React contexts where
 * you need to check online status imperatively.
 *
 * @returns Promise resolving to boolean indicating online status
 */
export async function checkIsOnline(): Promise<boolean> {
  try {
    const state = await NetInfo.fetch();
    const online = state.isConnected ?? true;
    cachedIsOnline = online;
    return online;
  } catch {
    // If NetInfo fails, assume online
    return true;
  }
}

/**
 * Synchronous getter for cached online status.
 *
 * Returns the last known online status without making an async call.
 * Use when you need immediate access and can tolerate slightly stale data.
 *
 * Note: This is primarily for backward compatibility with existing sync service.
 * Prefer useOnlineStatus() hook or checkIsOnline() async function.
 *
 * @returns Boolean indicating cached online status
 */
export function getIsOnlineCached(): boolean {
  return cachedIsOnline;
}

/**
 * Hook that provides both online status and a manual refresh function.
 *
 * Useful when you need to force a status check, e.g., before critical operations.
 *
 * @returns Object with isOnline state and refreshStatus function
 */
export function useOnlineStatusWithRefresh(): {
  isOnline: boolean;
  refreshStatus: () => Promise<boolean>;
} {
  const isOnline = useOnlineStatus();

  const refreshStatus = useCallback(async (): Promise<boolean> => {
    return checkIsOnline();
  }, []);

  return { isOnline, refreshStatus };
}

/**
 * Initialize the online status module.
 *
 * Call this early in app startup to ensure cachedIsOnline is accurate
 * before any sync operations occur.
 *
 * @returns Cleanup function to unsubscribe from NetInfo
 */
export function initOnlineStatus(): () => void {
  // Set initial state
  NetInfo.fetch().then((state) => {
    cachedIsOnline = state.isConnected ?? true;
  });

  // Subscribe to changes to keep cache updated
  const unsubscribe = NetInfo.addEventListener((state: NetInfoState) => {
    cachedIsOnline = state.isConnected ?? true;
  });

  return unsubscribe;
}
