/**
 * useBiometricLock Hook Tests
 *
 * Focuses on the warm-resume timeout behaviour, including the extended
 * timeout that applies when an active scoring session is in progress.
 */

import { renderHook, act, waitFor } from '@testing-library/react-native';
import { AppState } from 'react-native';

// ============================================================================
// MOCKS
// ============================================================================

jest.mock('@/services/biometric', () => ({
  biometricService: {
    checkAvailability: jest.fn(),
    authenticate: jest.fn(),
  },
}));

let mockBiometricEnabled = true;
jest.mock('@/store/settingsStore', () => ({
  useSettingsStore: (selector: any) =>
    selector({ biometricEnabled: mockBiometricEnabled }),
}));

let mockScorecardState: { currentRoundId: string | null; isInitialized: boolean } = {
  currentRoundId: null,
  isInitialized: false,
};
jest.mock('@/store/scorecardStore', () => ({
  useScorecardStore: {
    getState: () => mockScorecardState,
  },
}));

import { useBiometricLock } from '@/hooks/auth/biometricLock';
import { biometricService } from '@/services/biometric';

const mockedService = biometricService as jest.Mocked<typeof biometricService>;

type AppStateListener = (status: 'active' | 'background' | 'inactive') => void;

function captureAppStateListener(): AppStateListener {
  const calls = (AppState.addEventListener as unknown as jest.Mock).mock.calls;
  const last = calls[calls.length - 1];
  return last[1] as AppStateListener;
}

beforeEach(() => {
  jest.useFakeTimers();
  jest.spyOn(AppState, 'addEventListener').mockReturnValue({ remove: jest.fn() } as any);
  mockBiometricEnabled = true;
  mockScorecardState = { currentRoundId: null, isInitialized: false };

  // Default: biometric is available, but disable cold-start lock by gating
  // the initial availability check resolution per-test.
  mockedService.checkAvailability.mockResolvedValue({
    isAvailable: true,
    biometricType: 'facial',
  });
  mockedService.authenticate.mockResolvedValue({ success: true });
});

afterEach(() => {
  jest.useRealTimers();
});

describe('useBiometricLock — warm resume timeouts', () => {
  it('locks after 5 minutes in background when no scoring session is active', async () => {
    const { result } = renderHook(() => useBiometricLock(true));

    // Wait for cold-start availability check to settle and clear the resulting lock.
    await act(async () => {
      await Promise.resolve();
    });

    // Simulate already unlocked, so we can isolate the warm-resume path.
    await waitFor(() => expect(result.current.isLocked).toBe(false));

    const listener = captureAppStateListener();

    act(() => listener('background'));
    // Advance past the 5-minute threshold.
    act(() => {
      jest.setSystemTime(Date.now() + 6 * 60 * 1000);
    });
    act(() => listener('active'));

    expect(result.current.isLocked).toBe(true);
  });

  it('does NOT lock after 5 minutes in background when scoring is active', async () => {
    mockScorecardState = { currentRoundId: 'round-123', isInitialized: true };

    const { result } = renderHook(() => useBiometricLock(true));

    await act(async () => {
      await Promise.resolve();
    });
    await waitFor(() => expect(result.current.isLocked).toBe(false));

    const listener = captureAppStateListener();

    act(() => listener('background'));
    act(() => {
      jest.setSystemTime(Date.now() + 30 * 60 * 1000); // 30 minutes
    });
    act(() => listener('active'));

    expect(result.current.isLocked).toBe(false);
  });

  it('still locks after the extended timeout (4h) even when scoring is active', async () => {
    mockScorecardState = { currentRoundId: 'round-123', isInitialized: true };

    const { result } = renderHook(() => useBiometricLock(true));

    await act(async () => {
      await Promise.resolve();
    });
    await waitFor(() => expect(result.current.isLocked).toBe(false));

    const listener = captureAppStateListener();

    act(() => listener('background'));
    act(() => {
      jest.setSystemTime(Date.now() + 5 * 60 * 60 * 1000); // 5 hours
    });
    act(() => listener('active'));

    expect(result.current.isLocked).toBe(true);
  });
});
