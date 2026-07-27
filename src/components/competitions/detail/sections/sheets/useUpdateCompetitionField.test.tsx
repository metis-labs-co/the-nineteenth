import React from 'react';
import { renderHook, waitFor } from '@testing-library/react-native';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

import { supabase } from '@/services/supabase/client';
import { useUpdateCompetitionField } from './useUpdateCompetitionField';

jest.mock('@/services/supabase/client', () => ({
  supabase: { from: jest.fn() },
}));

describe('useUpdateCompetitionField', () => {
  it.each([
    ['round_reminders_enabled', false],
    ['results_summary_enabled', false],
  ] as const)('updates %s and invalidates competition queries', async (field, value) => {
    const eq = jest.fn().mockResolvedValue({ error: null });
    const update = jest.fn().mockReturnValue({ eq });
    (supabase.from as jest.Mock).mockReturnValue({ update });

    const queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false } },
    });
    const invalidate = jest.spyOn(queryClient, 'invalidateQueries');
    const wrapper = ({ children }: { children: React.ReactNode }) => (
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    );

    const { result } = renderHook(
      () => useUpdateCompetitionField({ competitionId: 'competition-1' }),
      { wrapper }
    );

    await result.current.mutateAsync({ [field]: value });

    expect(update).toHaveBeenCalledWith({ [field]: value });
    expect(eq).toHaveBeenCalledWith('id', 'competition-1');
    await waitFor(() => {
      expect(invalidate).toHaveBeenCalledWith({
        queryKey: ['competition', 'competition-1'],
      });
      expect(invalidate).toHaveBeenCalledWith({
        queryKey: ['competition', 'competition-1', 'details'],
      });
      expect(invalidate).toHaveBeenCalledWith({ queryKey: ['competitions'] });
    });
  });
});
