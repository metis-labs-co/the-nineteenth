/**
 * useUpdateScorecardStats Hook Tests
 *
 * Tests for the mutation hook that updates scorecard stats post-submission:
 * - Calls supabase with correct scorecardId and scores
 * - Invalidates round-details and scorecards query keys on success
 * - Throws with error message when supabase returns an error
 */

import React from 'react';
import { renderHook, act, waitFor } from '@testing-library/react-native';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useUpdateScorecardStats } from './useUpdateScorecardStats';

// ============================================================================
// MOCKS
// ============================================================================

const mockUpdate = jest.fn();
const mockEq = jest.fn();

jest.mock('@/services/supabase/client', () => ({
  supabase: {
    from: jest.fn(() => ({
      update: jest.fn((...args: unknown[]) => {
        mockUpdate(...args);
        return {
          eq: jest.fn((...eqArgs: unknown[]) => {
            mockEq(...eqArgs);
            return Promise.resolve({ error: null });
          }),
        };
      }),
    })),
  },
}));

// ============================================================================
// HELPERS
// ============================================================================

const createWrapper = () => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  });
  return {
    queryClient,
    wrapper: ({ children }: { children: React.ReactNode }) =>
      React.createElement(QueryClientProvider, { client: queryClient }, children),
  };
};

// ============================================================================
// TESTS
// ============================================================================

describe('useUpdateScorecardStats', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('calls supabase update with the correct scorecardId and scores', async () => {
    const { wrapper } = createWrapper();
    const { result } = renderHook(() => useUpdateScorecardStats(), { wrapper });

    const scorecardId = 'scorecard-abc-123';
    const scores = {
      '1': { strokes: 4, putts: 2, fairwayHit: true, greenInRegulation: true },
      '2': { strokes: 3, putts: 1, fairwayHit: false, greenInRegulation: true },
    };

    await act(async () => {
      await result.current.mutateAsync({ scorecardId, scores });
    });

    // Verify update was called with scores and an updated_at timestamp
    expect(mockUpdate).toHaveBeenCalledTimes(1);
    const updateArg = mockUpdate.mock.calls[0][0];
    expect(updateArg.scores).toEqual(scores);
    expect(typeof updateArg.updated_at).toBe('string');

    // Verify eq was called with the correct scorecardId
    expect(mockEq).toHaveBeenCalledWith('id', scorecardId);
  });

  it('invalidates round-details and scorecards queries on success', async () => {
    const { wrapper, queryClient } = createWrapper();
    const invalidateSpy = jest.spyOn(queryClient, 'invalidateQueries');

    const { result } = renderHook(() => useUpdateScorecardStats(), { wrapper });

    await act(async () => {
      await result.current.mutateAsync({
        scorecardId: 'scorecard-xyz',
        scores: { '1': { strokes: 5 } },
      });
    });

    await waitFor(() => {
      expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: ['round-details'] });
      expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: ['scorecards'] });
    });
  });

  it('rejects with an error message when supabase returns an error', async () => {
    // Override the mock to return an error for this test
    const { supabase } = jest.requireMock('@/services/supabase/client');
    (supabase.from as jest.Mock).mockReturnValueOnce({
      update: jest.fn(() => ({
        eq: jest.fn(() => Promise.resolve({ error: { message: 'DB write failed' } })),
      })),
    });

    const { wrapper } = createWrapper();
    const { result } = renderHook(() => useUpdateScorecardStats(), { wrapper });

    await expect(
      act(async () => {
        await result.current.mutateAsync({
          scorecardId: 'scorecard-fail',
          scores: { '1': { strokes: 4 } },
        });
      })
    ).rejects.toThrow('Failed to update scorecard stats: DB write failed');
  });
});
