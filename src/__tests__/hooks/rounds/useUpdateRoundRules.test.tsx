// src/__tests__/hooks/rounds/useUpdateRoundRules.test.tsx
import { renderHook, waitFor } from '@testing-library/react-native';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import React from 'react';
import { useUpdateRoundRules } from '@/hooks/rounds/mutations';
import { supabase } from '@/services/supabase/client';
import * as refinalize from '@/services/rounds/refinalizeRoundResults';

jest.mock('@/services/supabase/client', () => ({
  supabase: { from: jest.fn() },
}));

function wrapper({ children }: { children: React.ReactNode }) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return <QueryClientProvider client={client}>{children}</QueryClientProvider>;
}

describe('useUpdateRoundRules', () => {
  it('writes rules_override and re-finalizes the round', async () => {
    const eq = jest.fn().mockResolvedValue({ error: null });
    const update = jest.fn().mockReturnValue({ eq });
    (supabase.from as jest.Mock).mockReturnValue({ update });
    const refSpy = jest
      .spyOn(refinalize, 'refinalizeRoundResults')
      .mockResolvedValue(undefined);

    const { result } = renderHook(() => useUpdateRoundRules(), { wrapper });

    await result.current.mutateAsync({
      roundId: 'round-1',
      competitionId: 'comp-1',
      rulesOverride: { pair_points: { win: 2, tie: 1, loss: 0 } },
    });

    expect(supabase.from).toHaveBeenCalledWith('rounds');
    expect(update).toHaveBeenCalledWith({
      rules_override: { pair_points: { win: 2, tie: 1, loss: 0 } },
    });
    expect(eq).toHaveBeenCalledWith('id', 'round-1');
    await waitFor(() => expect(refSpy).toHaveBeenCalledWith('round-1'));
  });
});
