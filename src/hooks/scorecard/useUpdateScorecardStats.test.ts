/**
 * useUpdateScorecardStats Hook Tests
 *
 * Tests for the mutation hook that updates scorecard stats post-submission:
 * - Calls supabase with correct scorecardId and scores
 * - Invalidates actual round and card query keys on success and scoring guard failures
 * - Throws with error message when supabase returns an error
 */

import React from 'react';
import { renderHook, act, waitFor } from '@testing-library/react-native';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useUpdateScorecardStats } from './useUpdateScorecardStats';
import { RoundScoringWriteError } from '@/services/rounds/roundScoringErrors';
import { roundKeys, scorecardKeys } from '@/hooks/queryKeys';

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
      await result.current.mutateAsync({
        scorecardId,
        scores,
        originalScores: scores,
        roundId: 'round',
        roundShape: { nine_type: 'full', holes_played: null },
      });
    });

    // Verify update was called with scores and an updated_at timestamp
    expect(mockUpdate).toHaveBeenCalledTimes(1);
    const updateArg = mockUpdate.mock.calls[0][0];
    expect(updateArg.scores).toEqual(scores);
    expect(typeof updateArg.updated_at).toBe('string');

    // Verify eq was called with the correct scorecardId
    expect(mockEq).toHaveBeenCalledWith('id', scorecardId);
  });

  it('updates only scores and timestamp on a submitted card, leaving totals and revision untouched', async () => {
    const { wrapper } = createWrapper();
    const { result } = renderHook(() => useUpdateScorecardStats(), { wrapper });
    await act(async () => {
      await result.current.mutateAsync({
        roundId: 'round',
        roundShape: { nine_type: 'full', holes_played: null },
        originalScores: { '1': { strokes: 10, putts: 2, pickedUp: true, penalties: 1 } },
        scorecardId: 'confirmed-card',
        scores: { '1': { strokes: 10, putts: 2, pickedUp: true, penalties: 1 } },
      });
    });
    expect(mockUpdate.mock.calls[0][0]).toEqual({
      scores: { '1': { strokes: 10, putts: 2, pickedUp: true, penalties: 1 } },
      updated_at: expect.any(String),
    });
  });

  it('changes only seven stats fields on retained back-nine holes and preserves every opaque value', async () => {
    const { wrapper } = createWrapper();
    const { result } = renderHook(() => useUpdateScorecardStats(), { wrapper });
    const originalScores = {
      '10': {
        strokes: 10,
        pickedUp: true,
        penalties: 2,
        scoredBy: 'scorer',
        custom: { version: 3 },
        putts: 2,
      },
      '11': { balls: [{ strokes: 4, putts: 1 }] },
      '12': { unsupported: true },
      '10-note': { strokes: 77, text: 'metadata' },
      metadata: ['keep', null],
    };
    const stats = {
      putts: 3,
      fairwayHit: false,
      fairwayMissDirection: 'left',
      greenInRegulation: false,
      greenMissDirection: 'short',
      bunkerShots: 1,
      hazards: [{ type: 'water' }],
    };
    await act(async () => {
      await result.current.mutateAsync({
        scorecardId: 'card',
        roundId: 'round',
        roundShape: { nine_type: 'back9', holes_played: 3 },
        originalScores,
        scores: {
          '10': { strokes: 1, penalties: 0, ...stats },
          '11': { strokes: 3, putts: 6 },
          '13': { strokes: 4, putts: 1 },
        },
      });
    });
    expect(mockUpdate.mock.calls[0][0]).toEqual({
      scores: { ...originalScores, '10': { ...originalScores['10'], ...stats } },
      updated_at: expect.any(String),
    });
  });

  it('invalidates actual round and card queries on success', async () => {
    const { wrapper, queryClient } = createWrapper();
    const invalidateSpy = jest.spyOn(queryClient, 'invalidateQueries');

    const { result } = renderHook(() => useUpdateScorecardStats(), { wrapper });

    await act(async () => {
      await result.current.mutateAsync({
        scorecardId: 'scorecard-xyz',
        roundId: 'round',
        roundShape: { nine_type: 'full', holes_played: null },
        originalScores: { '1': { strokes: 5 } },
        scores: { '1': { strokes: 5 } },
      });
    });

    await waitFor(() => {
      expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: roundKeys.detail('round') });
      expect(invalidateSpy).toHaveBeenCalledWith({
        queryKey: scorecardKeys.list({ roundId: 'round' }),
      });
    });
  });

  it.each([
    ['round_score_out_of_play', 'out_of_play'],
    ['round_shape_changed', 'shape_changed'],
    ['round_scoring_busy', 'busy'],
    ['invalid_round_shape', 'invalid_shape'],
  ])(
    'surfaces %s, refreshes actual queries, and never retries the stale payload',
    async (hint, kind) => {
      const { supabase } = jest.requireMock('@/services/supabase/client');
      (supabase.from as jest.Mock).mockReturnValueOnce({
        update: jest.fn(() => ({
          eq: jest.fn(async () => ({ error: { code: '22023', hint, message: 'Round changed' } })),
        })),
      });
      const { wrapper, queryClient } = createWrapper();
      queryClient.setQueryData(roundKeys.detail('round'), { holes_played: null });
      queryClient.setQueryData(scorecardKeys.list({ roundId: 'round' }), ['old']);
      queryClient.setQueryData(scorecardKeys.detail('card'), { revision: 7 });
      const { result } = renderHook(() => useUpdateScorecardStats(), { wrapper });
      let error: unknown;
      await act(async () => {
        try {
          await result.current.mutateAsync({
            scorecardId: 'card',
            roundId: 'round',
            roundShape: { nine_type: 'full', holes_played: null },
            originalScores: { '1': { strokes: 4 } },
            scores: { '1': { strokes: 4, putts: 3 } },
          });
        } catch (caught) {
          error = caught;
        }
      });
      expect(error).toBeInstanceOf(RoundScoringWriteError);
      expect(error).toMatchObject({ kind, roundId: 'round', sqlCode: '22023', sqlHint: hint });
      expect(queryClient.getQueryState(roundKeys.detail('round'))?.isInvalidated).toBe(true);
      expect(
        queryClient.getQueryState(scorecardKeys.list({ roundId: 'round' }))?.isInvalidated
      ).toBe(true);
      expect(queryClient.getQueryState(scorecardKeys.detail('card'))?.isInvalidated).toBe(true);
      expect(supabase.from).toHaveBeenCalledTimes(1);
    }
  );

  it('refuses stale out-of-play numeric keys without deleting data or sending the stale JSON', async () => {
    const { wrapper, queryClient } = createWrapper();
    const spy = jest.spyOn(queryClient, 'invalidateQueries');
    const { result } = renderHook(() => useUpdateScorecardStats(), { wrapper });
    const originalScores = {
      '10': { strokes: 4 },
      '11': { strokes: 5 },
      '12': { strokes: 6 },
      '12-note': { strokes: 88 },
    };
    let error: unknown;
    await act(async () => {
      try {
        await result.current.mutateAsync({
          scorecardId: 'card',
          roundId: 'round',
          roundShape: { nine_type: 'back9', holes_played: 2 },
          originalScores,
          scores: originalScores,
        });
      } catch (caught) {
        error = caught;
      }
    });
    expect(error).toMatchObject({ kind: 'out_of_play', roundId: 'round' });
    expect(mockUpdate).not.toHaveBeenCalled();
    expect(spy).toHaveBeenCalledWith({ queryKey: roundKeys.detail('round') });
    expect(originalScores['12']).toEqual({ strokes: 6 });
  });

  it('preserves null, primitive, unsupported, multi-ball, prefix metadata and unchanged legacy stats', async () => {
    const { wrapper } = createWrapper();
    const { result } = renderHook(() => useUpdateScorecardStats(), { wrapper });
    const originalScores = {
      '1': { strokes: 4, hazards: 'legacy', putts: 99, unknown: ['keep'] },
      '2': null,
      '3': 6,
      '4': { unsupported: true },
      '5': { balls: [{ strokes: 5 }] },
      '19-note': { strokes: 88 },
      metadata: 'keep',
    };
    await act(async () => {
      await result.current.mutateAsync({
        scorecardId: 'card',
        roundId: 'round',
        roundShape: { nine_type: 'front9', holes_played: null },
        originalScores,
        scores: { ...originalScores, '1': { ...originalScores['1'], fairwayHit: true } },
      });
    });
    expect(mockUpdate.mock.calls[0][0].scores).toEqual({
      ...originalScores,
      '1': { ...originalScores['1'], fairwayHit: true },
    });
    expect(originalScores['1']).toEqual({
      strokes: 4,
      hazards: 'legacy',
      putts: 99,
      unknown: ['keep'],
    });
  });

  it('uses explicit undefined to clear a stat while leaving opaque values and other stats intact', async () => {
    const { wrapper } = createWrapper();
    const { result } = renderHook(() => useUpdateScorecardStats(), { wrapper });
    const originalScores = {
      '1': { strokes: 4, putts: 2, fairwayHit: true, fairwayMissDirection: null, custom: 'keep' },
    };
    await act(async () => {
      await result.current.mutateAsync({
        scorecardId: 'card',
        roundId: 'round',
        roundShape: { nine_type: 'full', holes_played: 1 },
        originalScores,
        scores: { '1': { ...originalScores['1'], fairwayHit: undefined } },
      });
    });
    expect(JSON.parse(JSON.stringify(mockUpdate.mock.calls[0][0].scores))).toEqual({
      '1': { strokes: 4, putts: 2, fairwayMissDirection: null, custom: 'keep' },
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
          roundId: 'round',
          roundShape: { nine_type: 'full', holes_played: null },
          originalScores: { '1': { strokes: 4 } },
          scores: { '1': { strokes: 4 } },
        });
      })
    ).rejects.toThrow('Failed to update scorecard stats: DB write failed');
  });
});
