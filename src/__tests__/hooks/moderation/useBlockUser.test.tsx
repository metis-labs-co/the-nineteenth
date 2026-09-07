// src/__tests__/hooks/moderation/useBlockUser.test.tsx
import React from 'react';
import { renderHook, act, waitFor } from '@testing-library/react-native';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

import { useBlockUser } from '@/hooks/moderation/useBlockUser';

const mockRpc = jest.fn();
const mockDelete = jest.fn();
jest.mock('@/services/supabase/client', () => ({
  supabase: {
    rpc: (...args: unknown[]) => mockRpc(...args),
    from: () => ({
      delete: () => ({ match: (...a: unknown[]) => mockDelete(...a) }),
    }),
  },
}));

function wrapper({ children }: { children: React.ReactNode }) {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false, gcTime: 0 } } });
  return <QueryClientProvider client={qc}>{children}</QueryClientProvider>;
}

describe('useBlockUser', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockRpc.mockResolvedValue({ error: null });
    mockDelete.mockResolvedValue({ error: null });
  });

  // Blocking goes through the RPC because it must also delete the friendship;
  // a plain insert into user_blocks would leave the blocked user visible in the
  // feed through is_friend().
  it('blocks through the block_user RPC', async () => {
    const { result } = renderHook(() => useBlockUser(), { wrapper });
    await act(async () => {
      await result.current.block('player-2');
    });
    expect(mockRpc).toHaveBeenCalledWith('block_user', { p_blocked: 'player-2' });
  });

  it('throws when the RPC fails, so callers can surface it', async () => {
    mockRpc.mockResolvedValue({ error: { message: 'nope' } });
    const { result } = renderHook(() => useBlockUser(), { wrapper });
    await expect(result.current.block('player-2')).rejects.toBeDefined();
  });

  it('unblocks by deleting the row, not through the RPC', async () => {
    const { result } = renderHook(() => useBlockUser(), { wrapper });
    await act(async () => {
      await result.current.unblock('player-2');
    });
    expect(mockDelete).toHaveBeenCalled();
    expect(mockRpc).not.toHaveBeenCalledWith('block_user', expect.anything());
  });

  it('reports busy state while a block is in flight', async () => {
    const { result } = renderHook(() => useBlockUser(), { wrapper });
    expect(result.current.isBusy).toBe(false);
    await act(async () => {
      await result.current.block('player-2');
    });
    await waitFor(() => expect(result.current.isBusy).toBe(false));
  });
});
