// src/__tests__/hooks/rounds/useUpdateSubMatchResult.test.tsx
import { renderHook, waitFor } from '@testing-library/react-native';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import React from 'react';
import { useUpdateSubMatchResult } from '@/hooks/rounds/subMatches';
import { supabase } from '@/services/supabase/client';
import * as refinalize from '@/services/rounds/refinalizeRoundResults';
import * as finalizeStatus from '@/services/rounds/finalizeRoundStatus';
import * as subMatchSvc from '@/services/subMatches';
import * as skins from '@/services/skins/finalizeForSubMatch';

jest.mock('@/services/supabase/client', () => ({ supabase: { from: jest.fn() } }));

const ROUND_ID = 'round-1';
const COMP_ID = 'comp-1';

function makeClient() {
  return new QueryClient({ defaultOptions: { queries: { retry: false } } });
}
function makeWrapper(client: QueryClient) {
  return function Wrapper({ children }: { children: React.ReactNode }) {
    return <QueryClientProvider client={client}>{children}</QueryClientProvider>;
  };
}

describe('useUpdateSubMatchResult', () => {
  beforeEach(() => {
    jest.restoreAllMocks();
    // Round's competition_id lookup used to invalidate competition caches.
    (supabase.from as jest.Mock).mockImplementation((table: string) => {
      if (table === 'rounds') {
        return {
          select: () => ({
            eq: () => ({
              maybeSingle: () => Promise.resolve({ data: { competition_id: COMP_ID }, error: null }),
            }),
          }),
        };
      }
      return {};
    });
    jest.spyOn(subMatchSvc, 'updateSubMatchResult').mockResolvedValue(undefined as never);
    jest
      .spyOn(skins, 'finalizeSkinsForSubMatch')
      .mockResolvedValue({ finalized: false, error: null } as never);
  });

  it('re-finalizes results and completes the round when a sub-match is forfeited', async () => {
    const refSpy = jest.spyOn(refinalize, 'refinalizeRoundResults').mockResolvedValue(undefined);
    const statusSpy = jest.spyOn(finalizeStatus, 'finalizeRoundStatus').mockResolvedValue(undefined);
    const client = makeClient();
    const invalidateSpy = jest.spyOn(client, 'invalidateQueries');

    const { result } = renderHook(() => useUpdateSubMatchResult(ROUND_ID), {
      wrapper: makeWrapper(client),
    });

    await result.current.mutateAsync({
      subMatchId: 'sm-1',
      status: 'forfeited',
      result: 'forfeit-a',
      finalDifferential: null,
    });

    await waitFor(() => expect(refSpy).toHaveBeenCalledWith(ROUND_ID));
    expect(statusSpy).toHaveBeenCalledWith(ROUND_ID);
    // Competition-scoped caches refreshed so leaderboard + round card update.
    const invalidatedKeys = invalidateSpy.mock.calls.map((c) => JSON.stringify(c[0]?.queryKey));
    expect(invalidatedKeys.some((k) => k.includes('competition') && k.includes(COMP_ID))).toBe(true);
    expect(invalidatedKeys.some((k) => k.includes('leaderboard') && k.includes(COMP_ID))).toBe(true);
  });

  it('does NOT re-finalize or complete the round for a non-terminal update', async () => {
    const refSpy = jest.spyOn(refinalize, 'refinalizeRoundResults').mockResolvedValue(undefined);
    const statusSpy = jest.spyOn(finalizeStatus, 'finalizeRoundStatus').mockResolvedValue(undefined);
    const client = makeClient();

    const { result } = renderHook(() => useUpdateSubMatchResult(ROUND_ID), {
      wrapper: makeWrapper(client),
    });

    await result.current.mutateAsync({
      subMatchId: 'sm-1',
      status: 'in-progress',
      result: null,
      finalDifferential: null,
    });

    expect(refSpy).not.toHaveBeenCalled();
    expect(statusSpy).not.toHaveBeenCalled();
  });
});
