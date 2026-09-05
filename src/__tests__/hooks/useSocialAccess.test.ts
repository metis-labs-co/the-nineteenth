import { renderHook } from '@testing-library/react-native';

import { useSocialAccess } from '@/hooks/useSocialAccess';
import { useAuth } from '@/hooks/useAuth';

jest.mock('@/hooks/useAuth');
const mockUseAuth = useAuth as jest.Mock;

describe('useSocialAccess', () => {
  it('enables social for an eligible player', () => {
    mockUseAuth.mockReturnValue({ player: { age_status: 'eligible' }, isLoading: false });
    const { result } = renderHook(() => useSocialAccess());
    expect(result.current.socialEnabled).toBe(true);
    expect(result.current.isRestricted).toBe(false);
  });

  it('disables social for an under13 player', () => {
    mockUseAuth.mockReturnValue({ player: { age_status: 'under13' }, isLoading: false });
    expect(renderHook(() => useSocialAccess()).result.current.socialEnabled).toBe(false);
  });

  it('disables social while the status is unknown', () => {
    mockUseAuth.mockReturnValue({ player: { age_status: 'unknown' }, isLoading: false });
    expect(renderHook(() => useSocialAccess()).result.current.socialEnabled).toBe(false);
  });

  it('disables social when the profile has not loaded', () => {
    mockUseAuth.mockReturnValue({ player: null, isLoading: true });
    const { result } = renderHook(() => useSocialAccess());
    expect(result.current.socialEnabled).toBe(false);
    expect(result.current.status).toBe('unknown');
  });

  // REGRESSION: "still loading" must not be mistaken for "restricted". Consumers hide
  // routes and content off isRestricted; if it were true during load, every cold start
  // would unregister the Activity routes and break notification deep links.
  it('is NOT restricted while the profile is still loading', () => {
    mockUseAuth.mockReturnValue({ player: null, isLoading: true });
    expect(renderHook(() => useSocialAccess()).result.current.isRestricted).toBe(false);
  });

  it('is restricted once an under13 status has actually loaded', () => {
    mockUseAuth.mockReturnValue({ player: { age_status: 'under13' }, isLoading: false });
    expect(renderHook(() => useSocialAccess()).result.current.isRestricted).toBe(true);
  });

  // A player row with no age_status at all (pre-migration cache) is unresolved,
  // not eligible.
  it('treats a missing age_status as unknown', () => {
    mockUseAuth.mockReturnValue({ player: { id: 'x' }, isLoading: false });
    const { result } = renderHook(() => useSocialAccess());
    expect(result.current.status).toBe('unknown');
    expect(result.current.socialEnabled).toBe(false);
    expect(result.current.isRestricted).toBe(true);
  });
});
