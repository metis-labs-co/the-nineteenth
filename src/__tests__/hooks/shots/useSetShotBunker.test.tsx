import { renderHook, waitFor, act } from '@testing-library/react-native';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import React from 'react';
import { useSetShotBunker } from '@/hooks/shots/useSetShotBunker';

const mockUpdate = jest.fn();
const mockEq = jest.fn();
const mockFrom = jest.fn();

jest.mock('@/services/supabase/client', () => ({
  supabase: { from: (...a: unknown[]) => mockFrom(...a) },
}));

function makeWrapper(client: QueryClient) {
  return ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={client}>{children}</QueryClientProvider>
  );
}

describe('useSetShotBunker', () => {
  beforeEach(() => {
    mockUpdate.mockReset();
    mockEq.mockReset();
    mockFrom.mockReset();
    // Builder chain: from('shot_log').update({...}).eq('id', shotId)
    mockEq.mockResolvedValue({ error: null });
    mockUpdate.mockReturnValue({ eq: mockEq });
    mockFrom.mockReturnValue({ update: mockUpdate });
  });

  it('issues UPDATE shot_log SET from_bunker=true WHERE id = shotId', async () => {
    const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    const { result } = renderHook(() => useSetShotBunker(), {
      wrapper: makeWrapper(qc),
    });

    await act(async () => {
      result.current.mutate({ shotId: 'shot-abc' });
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(mockFrom).toHaveBeenCalledWith('shot_log');
    expect(mockUpdate).toHaveBeenCalledWith({ from_bunker: true });
    expect(mockEq).toHaveBeenCalledWith('id', 'shot-abc');
  });

  it('invalidates shotLog and stats/sandSave query keys on success', async () => {
    const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    const invalidateSpy = jest.spyOn(qc, 'invalidateQueries');
    const { result } = renderHook(() => useSetShotBunker(), {
      wrapper: makeWrapper(qc),
    });

    await act(async () => {
      result.current.mutate({ shotId: 'shot-abc' });
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    const calls = invalidateSpy.mock.calls.map((c) => JSON.stringify(c[0]));
    expect(calls.some((c) => c.includes('shotLog'))).toBe(true);
    expect(calls.some((c) => c.includes('sandSave'))).toBe(true);
  });

  it('throws on supabase error', async () => {
    mockEq.mockResolvedValue({ error: new Error('rls denied') });
    const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    const { result } = renderHook(() => useSetShotBunker(), {
      wrapper: makeWrapper(qc),
    });

    await act(async () => {
      result.current.mutate({ shotId: 'shot-abc' });
    });

    await waitFor(() => expect(result.current.isError).toBe(true));
    expect(result.current.error).toBeDefined();
  });
});
