/**
 * useAchievementLeaderboard Tests
 *
 * The global board anonymises non-friends server-side
 * (get_achievement_leaderboard, migration 20261008000000). The hook must pass
 * the anonymity flag through, and default it to false for older servers that
 * don't return it.
 */

import { renderHook, waitFor } from '@testing-library/react-native';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import React from 'react';
import { useAchievementLeaderboard } from '@/hooks/achievements/queries';

const mockRpc = jest.fn();

jest.mock('@/hooks/useAuth', () => ({
  useAuth: () => ({ user: { id: 'me' }, isAuthenticated: true }),
}));

jest.mock('@/services/supabase/client', () => ({
  supabase: { rpc: (...args: unknown[]) => mockRpc(...args) },
}));

function wrapper({ children }: { children: React.ReactNode }) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return <QueryClientProvider client={client}>{children}</QueryClientProvider>;
}

const baseRow = {
  photo_url: null,
  total_points: 10,
  achievements_earned: 1,
  last_achievement_at: null,
};

describe('useAchievementLeaderboard', () => {
  beforeEach(() => mockRpc.mockReset());

  it('passes through anonymised rows from the global board', async () => {
    mockRpc.mockResolvedValue({
      data: [
        { ...baseRow, rank: 1, player_id: 'me', name: 'Me', is_anonymous: false },
        { ...baseRow, rank: 2, player_id: 'opaque-1', name: 'Dapper Mashie 33', is_anonymous: true },
      ],
      error: null,
    });

    const { result } = renderHook(() => useAchievementLeaderboard('global'), { wrapper });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(mockRpc).toHaveBeenCalledWith('get_achievement_leaderboard', expect.objectContaining({ p_scope: 'global' }));
    expect(result.current.data?.map((r) => r.is_anonymous)).toEqual([false, true]);
    expect(result.current.data?.[1].name).toBe('Dapper Mashie 33');
  });

  it('treats rows without the flag as not anonymous', async () => {
    mockRpc.mockResolvedValue({
      data: [{ ...baseRow, rank: 1, player_id: 'p1', name: 'Friend' }],
      error: null,
    });

    const { result } = renderHook(() => useAchievementLeaderboard('friends'), { wrapper });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(result.current.data?.[0].is_anonymous).toBe(false);
  });
});
