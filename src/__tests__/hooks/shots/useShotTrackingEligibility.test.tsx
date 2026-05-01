import { renderHook } from '@testing-library/react-native';
import { useShotTrackingEligibility } from '@/hooks/shots/useShotTrackingEligibility';
import { useMapTier } from '@/hooks/useMapTier';
import { useRoundPlayers } from '@/hooks/rounds';
import { useAuth } from '@/hooks/useAuth';

jest.mock('@/hooks/useMapTier', () => ({ useMapTier: jest.fn() }));
jest.mock('@/hooks/rounds', () => ({ useRoundPlayers: jest.fn() }));
jest.mock('@/hooks/useAuth', () => ({ useAuth: jest.fn() }));

const mockedUseMapTier = useMapTier as jest.MockedFunction<typeof useMapTier>;
const mockedUseRoundPlayers = useRoundPlayers as unknown as jest.Mock;
const mockedUseAuth = useAuth as unknown as jest.Mock;

const setupAuth = (playerId: string | null) => {
  mockedUseAuth.mockReturnValue({ player: playerId ? { id: playerId } : null });
};

const setupPlayers = (players: Array<{ id: string }>) => {
  mockedUseRoundPlayers.mockReturnValue({ data: players, isLoading: false });
};

describe('useShotTrackingEligibility', () => {
  beforeEach(() => {
    mockedUseMapTier.mockReset();
    mockedUseRoundPlayers.mockReset();
    mockedUseAuth.mockReset();
  });

  it('eligible when premium + solo round + auth user is the player', () => {
    mockedUseMapTier.mockReturnValue('premium');
    setupPlayers([{ id: 'player-1' }]);
    setupAuth('player-1');
    const { result } = renderHook(() => useShotTrackingEligibility('round-1'));
    expect(result.current).toEqual({ eligible: true });
  });

  it('not eligible when tier is free', () => {
    mockedUseMapTier.mockReturnValue('free');
    setupPlayers([{ id: 'player-1' }]);
    setupAuth('player-1');
    const { result } = renderHook(() => useShotTrackingEligibility('round-1'));
    expect(result.current).toEqual({ eligible: false, reason: 'not-premium' });
  });

  it('not eligible when tier is social', () => {
    mockedUseMapTier.mockReturnValue('social');
    setupPlayers([{ id: 'player-1' }]);
    setupAuth('player-1');
    const { result } = renderHook(() => useShotTrackingEligibility('round-1'));
    expect(result.current).toEqual({ eligible: false, reason: 'not-premium' });
  });

  it('not eligible when round has more than one player', () => {
    mockedUseMapTier.mockReturnValue('premium');
    setupPlayers([{ id: 'player-1' }, { id: 'player-2' }]);
    setupAuth('player-1');
    const { result } = renderHook(() => useShotTrackingEligibility('round-1'));
    expect(result.current).toEqual({ eligible: false, reason: 'multi-player' });
  });

  it('not eligible when the solo player is not the auth user', () => {
    mockedUseMapTier.mockReturnValue('premium');
    setupPlayers([{ id: 'player-other' }]);
    setupAuth('player-1');
    const { result } = renderHook(() => useShotTrackingEligibility('round-1'));
    expect(result.current).toEqual({ eligible: false, reason: 'not-current-user' });
  });

  it('not eligible when no auth player', () => {
    mockedUseMapTier.mockReturnValue('premium');
    setupPlayers([{ id: 'player-1' }]);
    setupAuth(null);
    const { result } = renderHook(() => useShotTrackingEligibility('round-1'));
    expect(result.current).toEqual({ eligible: false, reason: 'not-current-user' });
  });

  it('not eligible while round players are loading', () => {
    mockedUseMapTier.mockReturnValue('premium');
    mockedUseRoundPlayers.mockReturnValue({ data: undefined, isLoading: true });
    setupAuth('player-1');
    const { result } = renderHook(() => useShotTrackingEligibility('round-1'));
    expect(result.current).toEqual({ eligible: false, reason: 'loading' });
  });
});
