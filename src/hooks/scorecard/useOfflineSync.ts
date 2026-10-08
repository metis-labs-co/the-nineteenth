/**
 * Offline Sync Hook
 *
 * Provides sync status and manual sync trigger for components.
 *
 * The sync service itself is app-wide: useAppSyncService starts it at the app
 * root and nothing tears it down. This hook only makes sure it is running and
 * subscribes to its state; on unmount it drops its own subscription.
 *
 * Note: For simple online/offline status checks, prefer using
 * useOnlineStatus from '@/hooks/useOnlineStatus' directly.
 */

import { useState, useEffect, useCallback } from 'react';
import {
  subscribeSyncState,
  getSyncState as _getSyncState,
  getIsOnline,
  manualSync,
  retryFailedSyncs,
  ensureSyncServiceStarted,
} from '@/services/offline/sync';
import { initDatabase, getPendingSyncCount } from '@/services/offline/database';
import { useOnlineStatus } from '@/hooks/useOnlineStatus';

type SyncStatus = 'idle' | 'syncing' | 'error' | 'offline';

interface OfflineSyncState {
  status: SyncStatus;
  isOnline: boolean;
  pendingCount: number;
  failedCount: number;
  lastSyncAt: Date | null;
  error: string | null;
}

/**
 * Hook for managing offline sync state
 *
 * @returns Current sync state and sync trigger function
 */
export function useOfflineSync() {
  const [state, setState] = useState<OfflineSyncState>({
    status: 'idle',
    isOnline: true,
    pendingCount: 0,
    failedCount: 0,
    lastSyncAt: null,
    error: null,
  });
  const [isInitialized, setIsInitialized] = useState(false);

  useEffect(() => {
    let cancelled = false;
    let syncUnsubscribe: (() => void) | undefined;

    const init = async () => {
      try {
        // Initialize database
        await initDatabase();

        // App-wide service (started at the app root); a no-op when running.
        // Never torn down here.
        ensureSyncServiceStarted();

        // Get initial pending count
        const _pendingCount = await getPendingSyncCount();
        if (cancelled) return;

        // Subscribe to sync state changes (this hook's view only)
        syncUnsubscribe = subscribeSyncState((syncState) => {
          setState({
            status: syncState.status as SyncStatus,
            isOnline: getIsOnline(),
            pendingCount: syncState.pendingCount,
            failedCount: syncState.failedCount,
            lastSyncAt: syncState.lastSyncAt,
            error: syncState.error,
          });
        });

        setIsInitialized(true);
      } catch (error) {
        console.error('[useOfflineSync] Initialization failed:', error);
        if (cancelled) return;
        setState((prev) => ({
          ...prev,
          status: 'error',
          error: 'Failed to initialize offline storage',
        }));
      }
    };

    init();

    return () => {
      cancelled = true;
      syncUnsubscribe?.();
    };
  }, []);

  const triggerSync = useCallback(async () => {
    if (!state.isOnline) {
      return false;
    }

    try {
      return state.failedCount > 0
        ? await retryFailedSyncs()
        : await manualSync();
    } catch (error) {
      console.error('[useOfflineSync] Manual sync failed:', error);
      return false;
    }
  }, [state.failedCount, state.isOnline]);

  return {
    ...state,
    isInitialized,
    triggerSync,
  };
}

/**
 * Hook to get just the online status
 *
 * @deprecated Use useOnlineStatus from '@/hooks/useOnlineStatus' instead.
 * This hook is maintained for backward compatibility.
 */
export function useIsOnline(): boolean {
  // Delegate to centralized hook
  return useOnlineStatus();
}
