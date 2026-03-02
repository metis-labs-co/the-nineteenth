/**
 * useOfflineSync Hook Tests
 *
 * Tests for the useOfflineSync and useIsOnline hooks.
 * These hooks manage offline sync state and provide sync triggers.
 *
 * @see src/hooks/scorecard/useOfflineSync.ts
 */

import { renderHook, act, waitFor } from '@testing-library/react-native';
import { useOfflineSync, useIsOnline } from '@/hooks/scorecard/useOfflineSync';
import * as offlineSync from '@/services/offline/sync';
import * as offlineDatabase from '@/services/offline/database';

// ============================================================================
// MOCK SETUP
// ============================================================================

// Mock the offline sync service
jest.mock('@/services/offline/sync', () => ({
  initSyncService: jest.fn(() => jest.fn()),
  subscribeSyncState: jest.fn((callback) => {
    // Immediately call callback with initial state
    callback({
      status: 'idle',
      pendingCount: 0,
      lastSyncAt: null,
      error: null,
    });
    return jest.fn(); // Return unsubscribe function
  }),
  getSyncState: jest.fn(() => ({
    status: 'idle',
    pendingCount: 0,
    lastSyncAt: null,
    error: null,
  })),
  getIsOnline: jest.fn(() => true),
  manualSync: jest.fn(() => Promise.resolve(true)),
}));

// Mock the offline database
jest.mock('@/services/offline/database', () => ({
  initDatabase: jest.fn(() => Promise.resolve()),
  getPendingSyncCount: jest.fn(() => Promise.resolve(0)),
}));

// ============================================================================
// TEST SUITE: useOfflineSync
// ============================================================================

describe('useOfflineSync', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Initialization', () => {
    it('should initialize database on mount', async () => {
      renderHook(() => useOfflineSync());

      await waitFor(() => {
        expect(offlineDatabase.initDatabase).toHaveBeenCalled();
      });
    });

    it('should initialize sync service on mount', async () => {
      renderHook(() => useOfflineSync());

      await waitFor(() => {
        expect(offlineSync.initSyncService).toHaveBeenCalled();
      });
    });

    it('should return initial sync state', async () => {
      const { result } = renderHook(() => useOfflineSync());

      await waitFor(() => {
        expect(result.current.status).toBe('idle');
        expect(result.current.pendingCount).toBe(0);
        expect(result.current.error).toBeNull();
      });
    });

    it('should set isInitialized to true after initialization', async () => {
      const { result } = renderHook(() => useOfflineSync());

      await waitFor(() => {
        expect(result.current.isInitialized).toBe(true);
      });
    });
  });

  describe('Sync State Subscription', () => {
    it('should subscribe to sync state changes', async () => {
      renderHook(() => useOfflineSync());

      await waitFor(() => {
        expect(offlineSync.subscribeSyncState).toHaveBeenCalled();
      });
    });

    it('should update state when sync state changes', async () => {
      let capturedCallback: ((state: any) => void) | null = null;

      (offlineSync.subscribeSyncState as jest.Mock).mockImplementation((callback) => {
        capturedCallback = callback;
        callback({
          status: 'idle',
          pendingCount: 0,
          lastSyncAt: null,
          error: null,
        });
        return jest.fn();
      });

      const { result } = renderHook(() => useOfflineSync());

      await waitFor(() => {
        expect(result.current.status).toBe('idle');
      });

      // Simulate state change
      if (capturedCallback) {
        act(() => {
          capturedCallback!({
            status: 'syncing',
            pendingCount: 5,
            lastSyncAt: new Date(),
            error: null,
          });
        });
      }

      await waitFor(() => {
        expect(result.current.status).toBe('syncing');
        expect(result.current.pendingCount).toBe(5);
      });
    });

    it('should reflect error state from sync service', async () => {
      (offlineSync.subscribeSyncState as jest.Mock).mockImplementation((callback) => {
        callback({
          status: 'error',
          pendingCount: 3,
          lastSyncAt: null,
          error: 'Network unavailable',
        });
        return jest.fn();
      });

      const { result } = renderHook(() => useOfflineSync());

      await waitFor(() => {
        expect(result.current.status).toBe('error');
        expect(result.current.error).toBe('Network unavailable');
      });
    });
  });

  describe('Manual Sync Trigger', () => {
    it('should call manualSync when triggerSync is called and online', async () => {
      (offlineSync.getIsOnline as jest.Mock).mockReturnValue(true);
      (offlineSync.manualSync as jest.Mock).mockResolvedValue(true);

      const { result } = renderHook(() => useOfflineSync());

      await waitFor(() => {
        expect(result.current.isInitialized).toBe(true);
      });

      let syncResult: boolean = false;
      await act(async () => {
        syncResult = await result.current.triggerSync();
      });

      expect(offlineSync.manualSync).toHaveBeenCalled();
      expect(syncResult).toBe(true);
    });

    it('should NOT call manualSync when offline', async () => {
      (offlineSync.getIsOnline as jest.Mock).mockReturnValue(false);
      (offlineSync.subscribeSyncState as jest.Mock).mockImplementation((callback) => {
        callback({
          status: 'offline',
          pendingCount: 0,
          lastSyncAt: null,
          error: null,
        });
        return jest.fn();
      });

      const { result } = renderHook(() => useOfflineSync());

      await waitFor(() => {
        expect(result.current.isInitialized).toBe(true);
      });

      let syncResult: boolean = true;
      await act(async () => {
        syncResult = await result.current.triggerSync();
      });

      expect(offlineSync.manualSync).not.toHaveBeenCalled();
      expect(syncResult).toBe(false);
    });

    it('should return false when manualSync fails', async () => {
      (offlineSync.getIsOnline as jest.Mock).mockReturnValue(true);
      (offlineSync.manualSync as jest.Mock).mockRejectedValue(new Error('Sync failed'));

      const { result } = renderHook(() => useOfflineSync());

      await waitFor(() => {
        expect(result.current.isInitialized).toBe(true);
      });

      let syncResult: boolean = true;
      await act(async () => {
        syncResult = await result.current.triggerSync();
      });

      expect(syncResult).toBe(false);
    });
  });

  describe('Cleanup', () => {
    it('should unsubscribe on unmount', async () => {
      const unsubscribeMock = jest.fn();
      (offlineSync.initSyncService as jest.Mock).mockReturnValue(unsubscribeMock);

      const { unmount } = renderHook(() => useOfflineSync());

      await waitFor(() => {
        expect(offlineSync.initSyncService).toHaveBeenCalled();
      });

      unmount();

      expect(unsubscribeMock).toHaveBeenCalled();
    });
  });

  describe('Initialization Error Handling', () => {
    it('should handle database initialization error', async () => {
      (offlineDatabase.initDatabase as jest.Mock).mockRejectedValue(
        new Error('Database error')
      );

      const { result } = renderHook(() => useOfflineSync());

      await waitFor(() => {
        expect(result.current.status).toBe('error');
        expect(result.current.error).toBe('Failed to initialize offline storage');
      });
    });
  });

});

// ============================================================================
// TEST SUITE: useIsOnline
// ============================================================================

// The useIsOnline hook now delegates to useOnlineStatus which uses NetInfo directly.
// We need to access the NetInfo mock to control online/offline states.
import NetInfo from '@react-native-community/netinfo';

describe('useIsOnline', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should return initial online status', () => {
    // NetInfo mock defaults to isConnected: true
    const { result } = renderHook(() => useIsOnline());

    expect(result.current).toBe(true);
  });

  it('should return false when offline', async () => {
    // Override NetInfo.fetch to return offline
    (NetInfo.fetch as jest.Mock).mockResolvedValueOnce({
      type: 'none',
      isConnected: false,
      isInternetReachable: false,
    });

    const { result } = renderHook(() => useIsOnline());

    await waitFor(() => {
      expect(result.current).toBe(false);
    });
  });

  it('should subscribe to NetInfo changes for online status', () => {
    renderHook(() => useIsOnline());

    expect(NetInfo.addEventListener).toHaveBeenCalled();
  });

  it('should update when online status changes', async () => {
    let capturedListener: ((state: any) => void) | null = null;

    (NetInfo.addEventListener as jest.Mock).mockImplementation((listener) => {
      capturedListener = listener;
      return jest.fn();
    });

    const { result } = renderHook(() => useIsOnline());

    // Initial state - should be online (from cached value)
    expect(result.current).toBe(true);

    // Simulate network change via NetInfo listener
    if (capturedListener) {
      act(() => {
        capturedListener!({ isConnected: false, type: 'none', isInternetReachable: false });
      });
    }

    await waitFor(() => {
      expect(result.current).toBe(false);
    });
  });

  it('should unsubscribe on unmount', () => {
    const unsubscribeMock = jest.fn();
    (NetInfo.addEventListener as jest.Mock).mockReturnValue(unsubscribeMock);

    const { unmount } = renderHook(() => useIsOnline());

    unmount();

    expect(unsubscribeMock).toHaveBeenCalled();
  });
});
