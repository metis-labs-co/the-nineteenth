/**
 * Offline Sync Hook
 *
 * Provides sync status and manual sync trigger for components.
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
  initSyncService,
} from '@/services/offline/sync';
import { initDatabase, getPendingSyncCount } from '@/services/offline/database';
import { useOnlineStatus } from '@/hooks/useOnlineStatus';

type SyncStatus = 'idle' | 'syncing' | 'error' | 'offline';

interface OfflineSyncState {
  status: SyncStatus;
  isOnline: boolean;
  pendingCount: number;
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
    lastSyncAt: null,
    error: null,
  });
  const [isInitialized, setIsInitialized] = useState(false);

  useEffect(() => {
    let unsubscribe: (() => void) | undefined;

    const init = async () => {
      try {
        // Initialize database
        await initDatabase();

        // Initialize sync service
        unsubscribe = initSyncService();

        // Get initial pending count
        const _pendingCount = await getPendingSyncCount();

        // Subscribe to sync state changes
        const syncUnsubscribe = subscribeSyncState((syncState) => {
          setState({
            status: syncState.status as SyncStatus,
            isOnline: getIsOnline(),
            pendingCount: syncState.pendingCount,
            lastSyncAt: syncState.lastSyncAt,
            error: syncState.error,
          });
        });

        setIsInitialized(true);

        return () => {
          unsubscribe?.();
          syncUnsubscribe();
        };
      } catch (error) {
        console.error('[useOfflineSync] Initialization failed:', error);
        setState((prev) => ({
          ...prev,
          status: 'error',
          error: 'Failed to initialize offline storage',
        }));
      }
    };

    init();

    return () => {
      unsubscribe?.();
    };
  }, []);

  const triggerSync = useCallback(async () => {
    if (!state.isOnline) {
      return false;
    }

    try {
      return await manualSync();
    } catch (error) {
      console.error('[useOfflineSync] Manual sync failed:', error);
      return false;
    }
  }, [state.isOnline]);

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
