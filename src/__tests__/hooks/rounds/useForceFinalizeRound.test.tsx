// src/__tests__/hooks/rounds/useForceFinalizeRound.test.tsx
import { renderHook, waitFor } from '@testing-library/react-native';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import React from 'react';
import { useForceFinalizeRound, useReopenRound } from '@/hooks/rounds/mutations';
import * as forceSvc from '@/services/rounds/forceFinalizeRound';
import * as reopenSvc from '@/services/rounds/reopenRound';

function wrapper({ children }: { children: React.ReactNode }) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return <QueryClientProvider client={client}>{children}</QueryClientProvider>;
}

describe('useForceFinalizeRound / useReopenRound', () => {
  afterEach(() => jest.restoreAllMocks());

  it('calls forceFinalizeRound with the roundId', async () => {
    const spy = jest.spyOn(forceSvc, 'forceFinalizeRound').mockResolvedValue(undefined);
    const { result } = renderHook(() => useForceFinalizeRound(), { wrapper });

    await result.current.mutateAsync({ roundId: 'round-1', competitionId: 'comp-1' });

    await waitFor(() => expect(spy).toHaveBeenCalledWith('round-1'));
  });

  it('calls reopenRound with the roundId', async () => {
    const spy = jest.spyOn(reopenSvc, 'reopenRound').mockResolvedValue(undefined);
    const { result } = renderHook(() => useReopenRound(), { wrapper });

    await result.current.mutateAsync({ roundId: 'round-2', competitionId: 'comp-1' });

    await waitFor(() => expect(spy).toHaveBeenCalledWith('round-2'));
  });
});
