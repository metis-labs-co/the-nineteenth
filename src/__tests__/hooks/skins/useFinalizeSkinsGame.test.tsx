/**
 * useFinalizeSkinsGame delegates settlement to the non-hook service with NO
 * hole-count override, so the service reads the round's counts
 * (fetchSkinsHoleCounts). This hook also backs the ViewRound auto-finalise
 * (useSkinsGameState) and useFinalizeSkinsForRound.
 */
import React from 'react';
import { act, renderHook } from '@testing-library/react-native';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useFinalizeSkinsGame } from '@/hooks/skins/mutations';

const mockFinalizeSkinsGame = jest.fn();
const mockAwardSkinsAchievements = jest.fn();
jest.mock('@/services/skins/finalizeSkinsGame', () => ({
  finalizeSkinsGame: (...args: unknown[]) => mockFinalizeSkinsGame(...args),
  awardSkinsAchievements: (...args: unknown[]) => mockAwardSkinsAchievements(...args),
}));

const mockCheckAndAward = jest.fn();
jest.mock('@/hooks/useAuth', () => ({ useAuth: () => ({ user: { id: 'p1' } }) }));
jest.mock('@/hooks/achievements/useCheckAchievements', () => ({
  useCheckAchievements: () => ({ checkAndAward: mockCheckAndAward, isReady: true }),
}));
const mockShowMultipleToasts = jest.fn();
jest.mock('@/context/AchievementToastContext', () => ({
  useAchievementToast: () => ({ showMultipleToasts: mockShowMultipleToasts }),
}));

const SETTLED = { id: 'g1', round_id: 'r1', sub_match_id: null, pot_value: 5, status: 'completed' };

function makeWrapper() {
  const client = new QueryClient({ defaultOptions: { mutations: { retry: false } } });
  return function Wrapper({ children }: { children: React.ReactNode }) {
    return <QueryClientProvider client={client}>{children}</QueryClientProvider>;
  };
}

describe('useFinalizeSkinsGame', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockFinalizeSkinsGame.mockResolvedValue(SETTLED);
    mockAwardSkinsAchievements.mockResolvedValue(undefined);
  });

  it('settles through finalizeSkinsGame(gameId) with no hole-count override', async () => {
    const { result } = renderHook(() => useFinalizeSkinsGame(), { wrapper: makeWrapper() });

    let settled: unknown;
    await act(async () => {
      settled = await result.current.mutateAsync({ gameId: 'g1' });
    });

    expect(mockFinalizeSkinsGame).toHaveBeenCalledTimes(1);
    expect(mockFinalizeSkinsGame.mock.calls[0]).toEqual(['g1']);
    expect(settled).toBe(SETTLED);
  });

  it("fires the current player's skins achievements after settling", async () => {
    const { result } = renderHook(() => useFinalizeSkinsGame(), { wrapper: makeWrapper() });

    await act(async () => {
      await result.current.mutateAsync({ gameId: 'g1' });
    });

    expect(mockAwardSkinsAchievements).toHaveBeenCalledWith(SETTLED, {
      playerId: 'p1',
      checkAndAward: mockCheckAndAward,
      showMultipleToasts: mockShowMultipleToasts,
    });
  });
});
