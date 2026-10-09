/**
 * useResolveMismatch — the local SQLite mirror must follow the server write.
 * A resolution refused for a hole the round no longer plays (ended early)
 * must not be written locally either.
 */
import React from 'react';
import { renderHook } from '@testing-library/react-native';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useResolveMismatch } from '@/hooks/scoreMismatch/mutations';
import { applyResolvedScoreToScorecard } from '@/services/scoreMismatch/resolution';
import { supabase } from '@/services/supabase/client';

const mockGetMismatch = jest.fn();
const mockResolveMismatch = jest.fn();
const mockApplyResolved = jest.fn();
jest.mock('@/services/scoreMismatch', () => ({
  getMismatch: (...args: unknown[]) => mockGetMismatch(...args),
  resolveMismatch: (...args: unknown[]) => mockResolveMismatch(...args),
  applyResolvedScoreToScorecard: (...args: unknown[]) => mockApplyResolved(...args),
}));

const mockUpdateLocalScore = jest.fn();
jest.mock('@/store/scorecardStore', () => ({
  useScorecardStore: () => ({ updateLocalScore: mockUpdateLocalScore }),
}));

function wrapper({ children }: { children: React.ReactNode }) {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  return <QueryClientProvider client={client}>{children}</QueryClientProvider>;
}

const VARS = {
  mismatchId: 'mismatch-1',
  resolvedScore: 5,
  resolvedBy: 'player-resolver',
  roundId: 'round-1',
  playerId: 'player-1',
  holeNumber: 3,
};

describe('useResolveMismatch', () => {
  beforeEach(() => {
    mockGetMismatch.mockResolvedValue({ status: 'pending' });
    mockResolveMismatch.mockResolvedValue(undefined);
    mockUpdateLocalScore.mockResolvedValue(undefined);
  });

  it('mirrors an applied resolution into the local scorecard (locks current behaviour)', async () => {
    mockApplyResolved.mockResolvedValue(true);
    const { result } = renderHook(() => useResolveMismatch(), { wrapper });

    await expect(result.current.mutateAsync(VARS)).resolves.toEqual({ alreadyResolved: false });

    expect(mockApplyResolved).toHaveBeenCalledWith('round-1', 'player-1', 3, 5);
    expect(mockUpdateLocalScore).toHaveBeenCalledWith('round-1', 'player-1', 3, 5);
  });

  it('skips the local write when the server did not apply the score', async () => {
    mockApplyResolved.mockResolvedValue(false);
    const { result } = renderHook(() => useResolveMismatch(), { wrapper });

    await expect(result.current.mutateAsync(VARS)).resolves.toEqual({ alreadyResolved: false });

    expect(mockUpdateLocalScore).not.toHaveBeenCalled();
  });

  it('does not write either card when the mismatch was already resolved', async () => {
    mockGetMismatch.mockResolvedValue({ status: 'resolved', resolved_by: 'other-player' });
    const { result } = renderHook(() => useResolveMismatch(), { wrapper });
    await expect(result.current.mutateAsync(VARS)).resolves.toEqual({
      alreadyResolved: true,
      resolvedBy: 'other-player',
    });
    expect(mockResolveMismatch).not.toHaveBeenCalled();
    expect(mockApplyResolved).not.toHaveBeenCalled();
    expect(mockUpdateLocalScore).not.toHaveBeenCalled();
  });

  it.each(['resolve', 'apply'])('does not mirror after a %s error', async (stage) => {
    const error = new Error('remote failure');
    mockApplyResolved.mockResolvedValue(true);
    if (stage === 'resolve') mockResolveMismatch.mockRejectedValue(error);
    else mockApplyResolved.mockRejectedValue(error);
    const log = jest.spyOn(console, 'error').mockImplementation(() => undefined);
    try {
      const { result } = renderHook(() => useResolveMismatch(), { wrapper });
      await expect(result.current.mutateAsync(VARS)).rejects.toThrow('remote failure');
      expect(mockUpdateLocalScore).not.toHaveBeenCalled();
      if (stage === 'resolve') expect(mockApplyResolved).not.toHaveBeenCalled();
    } finally {
      log.mockRestore();
    }
  });
});

// Supplementary integration coverage: actual resolution service and shape reader,
// mocked Supabase boundary. The separate mismatch-row operation stays independent.
describe('useResolveMismatch with actual shape-aware resolution', () => {
  const holes = Array.from({ length: 18 }, (_, i) => ({
    number: i + 1,
    par: 4,
    strokeIndex: i + 1,
  }));
  const row = {
    id: 'server-card',
    scores: { '1': { strokes: 4 }, '3': { strokes: 4 } },
    daily_handicap_used: 10,
    round: { game_type: 'stroke', nine_type: 'full', holes_played: null, courses: { holes } },
  };
  const shapeError = { code: '22023', hint: 'round_shape_changed', message: 'Shape changed' };
  let cardRead: jest.Mock;

  beforeEach(() => {
    mockGetMismatch.mockResolvedValue({ status: 'pending' });
    mockResolveMismatch.mockResolvedValue(undefined);
    mockUpdateLocalScore.mockResolvedValue(undefined);
    mockApplyResolved.mockImplementation(applyResolvedScoreToScorecard);
    cardRead = jest.fn().mockResolvedValue({ data: row, error: null });
    const cardChain = {
      select: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      maybeSingle: cardRead,
    };
    const shapeChain = {
      select: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      is: jest.fn().mockReturnThis(),
      abortSignal: jest.fn().mockReturnThis(),
      maybeSingle: jest
        .fn()
        .mockResolvedValue({ data: { nine_type: 'full', holes_played: 2 }, error: null }),
    };
    (supabase.from as jest.Mock).mockImplementation((table) =>
      table === 'rounds' ? shapeChain : cardChain
    );
    (supabase.rpc as jest.Mock).mockReset().mockResolvedValue({ data: true, error: null });
  });

  it.each(['missing-read', 'hidden-at-write', 'removed-after-rejection'])(
    'resolves the mismatch row but does not mirror an unavailable %s correction',
    async (scenario) => {
      if (scenario === 'missing-read') cardRead.mockResolvedValue({ data: null, error: null });
      if (scenario === 'hidden-at-write')
        (supabase.rpc as jest.Mock).mockResolvedValue({ data: false, error: null });
      if (scenario === 'removed-after-rejection')
        (supabase.rpc as jest.Mock).mockResolvedValueOnce({ data: null, error: shapeError });
      const { result } = renderHook(() => useResolveMismatch(), { wrapper });
      await expect(result.current.mutateAsync(VARS)).resolves.toEqual({ alreadyResolved: false });
      expect(mockResolveMismatch).toHaveBeenCalledWith(
        VARS.mismatchId,
        VARS.resolvedScore,
        VARS.resolvedBy
      );
      expect(mockUpdateLocalScore).not.toHaveBeenCalled();
      expect(supabase.rpc).toHaveBeenCalledTimes(scenario === 'missing-read' ? 0 : 1);
    }
  );

  it('mirrors once after a retained correction is freshly accepted', async () => {
    (supabase.rpc as jest.Mock).mockResolvedValueOnce({ data: null, error: shapeError });
    cardRead
      .mockResolvedValueOnce({ data: row, error: null })
      .mockResolvedValue({
        data: { ...row, scores: { '1': { strokes: 4, putts: 1 }, '2': { strokes: 8 } } },
        error: null,
      });
    const { result } = renderHook(() => useResolveMismatch(), { wrapper });
    await expect(result.current.mutateAsync({ ...VARS, holeNumber: 1 })).resolves.toEqual({
      alreadyResolved: false,
    });
    expect(supabase.rpc).toHaveBeenLastCalledWith('write_scorecard_resolution', {
      p_scorecard_id: 'server-card',
      p_patch: {
        expected_round_shape: { nine_type: 'full', holes_played: 2 },
        scores: { '1': { strokes: 5, putts: 1 }, '2': { strokes: 8 } },
        total_gross: 13,
        total_net: 11,
        updated_at: expect.any(String),
      },
    });
    expect(mockUpdateLocalScore).toHaveBeenCalledTimes(1);
    expect(mockUpdateLocalScore).toHaveBeenCalledWith(VARS.roundId, VARS.playerId, 1, 5);
  });

  it('does not mirror after a second shape change', async () => {
    (supabase.rpc as jest.Mock).mockResolvedValue({ data: null, error: shapeError });
    const log = jest.spyOn(console, 'error').mockImplementation(() => undefined);
    try {
      const { result } = renderHook(() => useResolveMismatch(), { wrapper });
      await expect(result.current.mutateAsync({ ...VARS, holeNumber: 1 })).rejects.toMatchObject({
        kind: 'shape_changed',
      });
      expect(mockResolveMismatch).toHaveBeenCalledTimes(1);
      expect(mockUpdateLocalScore).not.toHaveBeenCalled();
      expect(supabase.rpc).toHaveBeenCalledTimes(2);
    } finally {
      log.mockRestore();
    }
  });
});
