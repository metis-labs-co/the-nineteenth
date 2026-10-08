/**
 * useAppSyncService — the app-root owner of the offline sync service.
 *
 * @see src/hooks/useAppSyncService.ts
 */
import { renderHook, waitFor, act } from '@testing-library/react-native';
import { AppState } from 'react-native';
import { useAppSyncService } from '@/hooks/useAppSyncService';
import { ensureSyncServiceStarted, requestSyncDrain, setSyncAuthUser } from '@/services/offline/sync';
import { initDatabase } from '@/services/offline/database';
import { useAuth } from '@/hooks/useAuth';

jest.mock('@/services/offline/sync', () => ({
  ensureSyncServiceStarted: jest.fn(),
  requestSyncDrain: jest.fn(),
  setSyncAuthUser: jest.fn(),
}));

jest.mock('@/services/offline/database', () => ({
  initDatabase: jest.fn(),
}));

jest.mock('@/hooks/useAuth', () => ({
  useAuth: jest.fn(),
}));

type AppStateListener = (state: 'active' | 'background' | 'inactive') => void;

let removeSubscription: jest.Mock;

function lastAppStateListener(): AppStateListener {
  const calls = (AppState.addEventListener as unknown as jest.Mock).mock.calls;
  return calls[calls.length - 1][1] as AppStateListener;
}

beforeEach(() => {
  removeSubscription = jest.fn();
  jest.spyOn(AppState, 'addEventListener').mockReturnValue({ remove: removeSubscription } as any);
  (initDatabase as jest.Mock).mockResolvedValue(undefined);
  (useAuth as jest.Mock).mockReturnValue({
    session: { user: { id: 'user-1' } },
    user: { id: 'user-1' },
  });
});

describe('useAppSyncService', () => {
  it('opens the database, then starts the sync service and drains once signed in', async () => {
    let resolveDatabase!: () => void;
    (initDatabase as jest.Mock).mockReturnValue(
      new Promise<void>((resolve) => {
        resolveDatabase = resolve;
      })
    );
    renderHook(() => useAppSyncService());

    await act(async () => {
      await Promise.resolve();
    });
    expect(initDatabase).toHaveBeenCalledTimes(1);
    expect(ensureSyncServiceStarted).not.toHaveBeenCalled();
    expect(requestSyncDrain).not.toHaveBeenCalled();

    await act(async () => resolveDatabase());
    await waitFor(() => {
      expect(requestSyncDrain).toHaveBeenCalledWith('app-start');
    });
    expect(ensureSyncServiceStarted).toHaveBeenCalledTimes(1);
    const [opened] = (initDatabase as jest.Mock).mock.invocationCallOrder;
    const [started] = (ensureSyncServiceStarted as jest.Mock).mock.invocationCallOrder;
    expect(opened).toBeLessThan(started);
  });

  it('starts the service but does not drain while signed out', async () => {
    (useAuth as jest.Mock).mockReturnValue({ session: null, user: null });

    renderHook(() => useAppSyncService());

    await waitFor(() => {
      expect(ensureSyncServiceStarted).toHaveBeenCalled();
    });
    expect(requestSyncDrain).not.toHaveBeenCalled();
    expect(AppState.addEventListener).not.toHaveBeenCalled();
    // syncAll's own gate: no drain from any other trigger either.
    expect(setSyncAuthUser).toHaveBeenLastCalledWith(null);
  });

  it('records the signed-in user for syncAll before asking for the first drain', async () => {
    renderHook(() => useAppSyncService());

    await waitFor(() => {
      expect(requestSyncDrain).toHaveBeenCalledWith('app-start');
    });
    expect(setSyncAuthUser).toHaveBeenCalledWith('user-1');
    const [recorded] = (setSyncAuthUser as jest.Mock).mock.invocationCallOrder;
    const [drained] = (requestSyncDrain as jest.Mock).mock.invocationCallOrder;
    expect(recorded).toBeLessThan(drained);
  });

  it('keeps a cached signup user gated until an authenticated session arrives', async () => {
    // Signup caches a user while email confirmation is pending, without a session.
    (useAuth as jest.Mock).mockReturnValue({ session: null, user: { id: 'user-1' } });
    const { rerender } = renderHook(() => useAppSyncService());
    await waitFor(() => {
      expect(ensureSyncServiceStarted).toHaveBeenCalled();
    });

    expect(setSyncAuthUser).toHaveBeenLastCalledWith(null);
    expect(requestSyncDrain).not.toHaveBeenCalled();
    expect(AppState.addEventListener).not.toHaveBeenCalled();

    (useAuth as jest.Mock).mockReturnValue({
      session: { user: { id: 'user-1' } },
      user: { id: 'user-1' },
    });
    rerender({});

    expect(setSyncAuthUser).toHaveBeenLastCalledWith('user-1');
    expect(requestSyncDrain).toHaveBeenCalledWith('app-start');
    (requestSyncDrain as jest.Mock).mockClear();
    act(() => lastAppStateListener()('active'));
    expect(requestSyncDrain).toHaveBeenCalledWith('foreground');
  });

  it('uses the authenticated session identity when the cached user is stale', async () => {
    (useAuth as jest.Mock).mockReturnValue({
      session: { user: { id: 'session-user' } },
      user: { id: 'cached-user' },
    });
    renderHook(() => useAppSyncService());

    await waitFor(() => {
      expect(requestSyncDrain).toHaveBeenCalledWith('app-start');
    });
    expect(setSyncAuthUser).toHaveBeenLastCalledWith('session-user');
  });

  it('closes the gate and removes the foreground listener when the session disappears with a cached user', async () => {
    const { rerender } = renderHook(() => useAppSyncService());
    await waitFor(() => {
      expect(AppState.addEventListener).toHaveBeenCalled();
    });
    (requestSyncDrain as jest.Mock).mockClear();

    (useAuth as jest.Mock).mockReturnValue({ session: null, user: { id: 'user-1' } });
    rerender({});

    expect(setSyncAuthUser).toHaveBeenLastCalledWith(null);
    expect(removeSubscription).toHaveBeenCalledTimes(1);
    expect(AppState.addEventListener).toHaveBeenCalledTimes(1);
    expect(requestSyncDrain).not.toHaveBeenCalled();
  });

  it('clears the user on sign-out, so nothing drains for the next session until it signs in', async () => {
    const { rerender } = renderHook(() => useAppSyncService());
    await waitFor(() => {
      expect(setSyncAuthUser).toHaveBeenCalledWith('user-1');
    });

    (useAuth as jest.Mock).mockReturnValue({ session: null, user: null });
    rerender({});

    expect(setSyncAuthUser).toHaveBeenLastCalledWith(null);
  });

  it('drains when the app returns to the foreground', async () => {
    renderHook(() => useAppSyncService());
    await waitFor(() => {
      expect(AppState.addEventListener).toHaveBeenCalledWith('change', expect.any(Function));
    });
    (requestSyncDrain as jest.Mock).mockClear();

    act(() => lastAppStateListener()('background'));
    expect(requestSyncDrain).not.toHaveBeenCalled();

    act(() => lastAppStateListener()('active'));
    expect(requestSyncDrain).toHaveBeenCalledWith('foreground');
  });

  it('does not start the service when the database fails to open', async () => {
    const consoleError = jest.spyOn(console, 'error').mockImplementation(() => {});
    (initDatabase as jest.Mock).mockRejectedValue(new Error('disk full'));

    renderHook(() => useAppSyncService());
    await act(async () => {
      await Promise.resolve();
    });

    expect(ensureSyncServiceStarted).not.toHaveBeenCalled();
    expect(requestSyncDrain).not.toHaveBeenCalled();
    consoleError.mockRestore();
  });

  it('removes only its foreground listener on unmount', async () => {
    const { unmount } = renderHook(() => useAppSyncService());
    await waitFor(() => {
      expect(AppState.addEventListener).toHaveBeenCalled();
    });

    unmount();

    expect(removeSubscription).toHaveBeenCalledTimes(1);
  });
});
