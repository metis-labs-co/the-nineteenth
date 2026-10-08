/**
 * useResolveMismatch — the local SQLite mirror must follow the server write.
 * A resolution refused for a hole the round no longer plays (ended early)
 * must not be written locally either.
 */
import React from 'react';
import { renderHook } from '@testing-library/react-native';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useResolveMismatch } from '@/hooks/scoreMismatch/mutations';

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
