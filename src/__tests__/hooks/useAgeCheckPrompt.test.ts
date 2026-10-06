import { renderHook, act } from '@testing-library/react-native';

import { useAgeCheckPrompt } from '@/hooks/useAgeCheckPrompt';
import { useSocialAccess } from '@/hooks/useSocialAccess';
import { useAgeGateStore } from '@/store/ageGateStore';

jest.mock('@/hooks/useSocialAccess');
jest.mock('@/hooks/useAuth', () => ({
  useAuth: () => ({ player: { age_resolved_at: null }, user: { id: 'u1' } }),
}));
jest.mock('@/services/age', () => ({
  ...jest.requireActual('@/services/age'),
  resolveAgeStatus: jest.fn().mockResolvedValue('unknown'),
}));
jest.mock('@/hooks/useSetAgeStatus', () => ({
  useSetAgeStatus: () => ({ setStatus: jest.fn() }),
}));

const mockAccess = useSocialAccess as jest.Mock;

const DAY = 24 * 60 * 60 * 1000;

describe('useAgeCheckPrompt', () => {
  // The store is a persisted module-level singleton. Without this reset the
  // dismissal cases contaminate each other and the three-dismissal test can
  // pass for the wrong reason.
  beforeEach(() => {
    useAgeGateStore.setState({ dismissCount: 0, lastDismissedAt: null });
    jest.clearAllMocks();
  });

  it('shows for an unresolved user', () => {
    mockAccess.mockReturnValue({
      status: 'unknown', socialEnabled: false, isRestricted: true, isLoading: false,
    });
    expect(renderHook(() => useAgeCheckPrompt()).result.current.shouldShow).toBe(true);
  });

  it('does not show for an eligible user', () => {
    mockAccess.mockReturnValue({
      status: 'eligible', socialEnabled: true, isRestricted: false, isLoading: false,
    });
    expect(renderHook(() => useAgeCheckPrompt()).result.current.shouldShow).toBe(false);
  });

  it('does not show for a resolved under13 user', () => {
    mockAccess.mockReturnValue({
      status: 'under13', socialEnabled: false, isRestricted: true, isLoading: false,
    });
    expect(renderHook(() => useAgeCheckPrompt()).result.current.shouldShow).toBe(false);
  });

  it('does not show while the profile is still loading', () => {
    mockAccess.mockReturnValue({
      status: 'unknown', socialEnabled: false, isRestricted: false, isLoading: true,
    });
    expect(renderHook(() => useAgeCheckPrompt()).result.current.shouldShow).toBe(false);
  });

  it('hides immediately after a dismissal', () => {
    mockAccess.mockReturnValue({
      status: 'unknown', socialEnabled: false, isRestricted: true, isLoading: false,
    });
    const { result, rerender } = renderHook(() => useAgeCheckPrompt());
    act(() => result.current.dismiss());
    rerender({});
    expect(result.current.shouldShow).toBe(false);
  });

  it('returns after the re-prompt window while still unresolved', () => {
    mockAccess.mockReturnValue({
      status: 'unknown', socialEnabled: false, isRestricted: true, isLoading: false,
    });
    useAgeGateStore.setState({
      dismissCount: 1,
      lastDismissedAt: new Date(Date.now() - 8 * DAY).toISOString(),
    });
    expect(renderHook(() => useAgeCheckPrompt()).result.current.shouldShow).toBe(true);
  });

  it('stops showing after three dismissals, even once the window has passed', () => {
    mockAccess.mockReturnValue({
      status: 'unknown', socialEnabled: false, isRestricted: true, isLoading: false,
    });
    useAgeGateStore.setState({
      dismissCount: 3,
      lastDismissedAt: new Date(Date.now() - 30 * DAY).toISOString(),
    });
    expect(renderHook(() => useAgeCheckPrompt()).result.current.shouldShow).toBe(false);
  });
});
