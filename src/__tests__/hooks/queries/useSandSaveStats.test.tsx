import { renderHook, waitFor } from '@testing-library/react-native';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import React from 'react';
import { useSandSaveStats } from '@/hooks/queries/useSandSaveStats';

const mockFrom = jest.fn();
jest.mock('@/services/supabase/client', () => ({
  supabase: { from: (...a: unknown[]) => mockFrom(...a) },
}));

function makeWrapper() {
  const qc = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={qc}>{children}</QueryClientProvider>
  );
}

describe('useSandSaveStats', () => {
  beforeEach(() => {
    mockFrom.mockReset();
  });

  it('computes percentage from view counts', async () => {
    // First call: v_sand_saves count
    mockFrom.mockReturnValueOnce({
      select: () => ({
        eq: () => Promise.resolve({ count: 7, data: null, error: null }),
      }),
    });
    // Second call: v_sand_save_attempts count
    mockFrom.mockReturnValueOnce({
      select: () => ({
        eq: () => Promise.resolve({ count: 11, data: null, error: null }),
      }),
    });

    const { result } = renderHook(() => useSandSaveStats('player-1'), {
      wrapper: makeWrapper(),
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(result.current.data).toEqual({
      sandSaves: 7,
      sandSaveAttempts: 11,
      sandSavePercentage: (7 / 11) * 100,
    });
  });

  it('returns null percentage when no attempts', async () => {
    mockFrom
      .mockReturnValueOnce({
        select: () => ({ eq: () => Promise.resolve({ count: 0, data: null, error: null }) }),
      })
      .mockReturnValueOnce({
        select: () => ({ eq: () => Promise.resolve({ count: 0, data: null, error: null }) }),
      });

    const { result } = renderHook(() => useSandSaveStats('player-1'), {
      wrapper: makeWrapper(),
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(result.current.data).toEqual({
      sandSaves: 0,
      sandSaveAttempts: 0,
      sandSavePercentage: null,
    });
  });
});
