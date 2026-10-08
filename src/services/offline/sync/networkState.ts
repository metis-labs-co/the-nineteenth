/**
 * Network State Manager
 *
 * Monitors network connectivity and triggers sync when coming online.
 * Uses @react-native-community/netinfo for network state detection.
 */

import NetInfo, { NetInfoState } from '@react-native-community/netinfo';
import { clearInvalidMockData } from '../database';
import { syncLogger } from '@/utils/debugLogger';

// Module-level network state
let isOnline = true;
let isSyncing = false;

// The signed-in user the queue drains for; null while signed out (and until
// the app root has seen the restored session). Set by useAppSyncService.
let syncAuthUserId: string | null = null;

/**
 * Record who is signed in (null when signed out). syncAll does nothing while
 * it is null: a signed-out drain uploads as anon (RLS retains every card as
 * failed) and reads a queued round as missing, dropping its finalize item.
 */
export function setSyncAuthUser(userId: string | null): void {
  syncAuthUserId = userId;
}

export function getSyncAuthUserId(): string | null {
  return syncAuthUserId;
}

// Callback for when network comes online
let onOnlineCallback: (() => Promise<boolean | void>) | null = null;
// Callback for when network status changes
let onStatusChangeCallback: ((isOnline: boolean) => void) | null = null;

/**
 * Check if device is online
 */
export function getIsOnline(): boolean {
  return isOnline;
}

/**
 * Check if sync is currently in progress
 */
export function getIsSyncing(): boolean {
  return isSyncing;
}

/**
 * Set syncing status
 */
export function setIsSyncing(syncing: boolean): void {
  isSyncing = syncing;
}

/**
 * Set callback for when network comes online
 */
export function setOnOnlineCallback(callback: () => Promise<boolean | void>): void {
  onOnlineCallback = callback;
}

/**
 * Set callback for network status changes
 */
export function setOnStatusChangeCallback(callback: (isOnline: boolean) => void): void {
  onStatusChangeCallback = callback;
}

/**
 * Handle network state changes
 */
async function handleNetworkChange(state: NetInfoState): Promise<void> {
  const wasOffline = !isOnline;
  isOnline = state.isConnected ?? false;

  syncLogger.debug('Network state changed', {
    isOnline,
    wasOffline,
    type: state.type,
    isInternetReachable: state.isInternetReachable,
  });

  // Notify status change listeners
  if (onStatusChangeCallback) {
    onStatusChangeCallback(isOnline);
  }

  if (isOnline && wasOffline) {
    // Just came online - trigger sync
    syncLogger.info('Network restored, triggering sync');
    if (onOnlineCallback) {
      await onOnlineCallback();
    }
  } else if (!isOnline) {
    syncLogger.info('Network offline');
  }
}

/**
 * Initialize network state monitoring
 *
 * @returns Cleanup function to unsubscribe from network changes
 */
export function initNetworkState(): () => void {
  syncLogger.info('Initializing network state monitoring');

  // Subscribe to network state changes
  const unsubscribe = NetInfo.addEventListener(handleNetworkChange);

  // Check initial network state
  NetInfo.fetch().then((state) => {
    isOnline = state.isConnected ?? false;
    syncLogger.info('Initial network state', { isOnline, type: state.type });
    if (onStatusChangeCallback) {
      onStatusChangeCallback(isOnline);
    }
  });

  // Clear any invalid mock data from previous sessions
  clearInvalidMockData()
    .then((cleared) => {
      if (cleared > 0) {
        syncLogger.info('Cleared invalid mock data', { count: cleared });
      }
    })
    .catch((err) => {
      syncLogger.warn('Failed to clear invalid mock data', { error: String(err) });
    });

  return unsubscribe;
}
