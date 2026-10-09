/**
 * finalizeSubmittedRound must not complete a round while its early end is
 * still queued: the end_round_early RPC refuses a completed round whose
 * holes_played is NULL, so the end would be lost for good.
 */
import {
  finalizeSubmittedRound,
  isRoundFinalizeInFlight,
  RoundNotReadyError,
} from '@/services/rounds/finalizeSubmittedRound';

const mockHasQueuedRoundEndEarly = jest.fn();
jest.mock('@/services/rounds/applyEndRoundEarly', () => ({
  hasQueuedRoundEndEarly: (...args: unknown[]) => mockHasQueuedRoundEndEarly(...args),
}));

const mockFinalizeRoundStatus = jest.fn();
jest.mock('@/services/rounds/finalizeRoundStatus', () => ({
  finalizeRoundStatus: (...args: unknown[]) => mockFinalizeRoundStatus(...args),
}));

jest.mock('@/services/rounds/refinalizeRoundResults', () => ({
  refinalizeRoundResults: jest.fn(() => Promise.resolve()),
}));

const mockFinalizeActiveSkins = jest.fn();
jest.mock('@/services/skins/finalizeSkinsGame', () => ({
  finalizeActiveSkinsForRound: (...args: unknown[]) => mockFinalizeActiveSkins(...args),
}));

jest.mock('@/services/queryClient', () => ({
  queryClient: { invalidateQueries: jest.fn() },
  invalidateLeaderboardCache: jest.fn(),
}));

jest.mock('@/services/offline/database', () => ({
  addPendingSync: jest.fn(() => Promise.resolve()),
  removePendingSyncByEntityKey: jest.fn(() => Promise.resolve(true)),
  hasUnsyncedScorecardsForRound: jest.fn(() => Promise.resolve(false)),
  getQueuedEntityKeys: jest.fn(() => Promise.resolve(new Set())),
}));

jest.mock('@/services/offline/sync/drain', () => ({
  requestSyncDrain: jest.fn(),
}));

const ROUND_ID = '550e8400-e29b-41d4-a716-446655440000';

describe('finalizeSubmittedRound — queued early end', () => {
  beforeEach(() => {
    mockFinalizeRoundStatus.mockResolvedValue(true);
    mockFinalizeActiveSkins.mockResolvedValue({ finalized: false });
  });

  it('throws RoundNotReadyError before any server call while an end_early item is queued', async () => {
    mockHasQueuedRoundEndEarly.mockResolvedValue(true);

    await expect(finalizeSubmittedRound(ROUND_ID)).rejects.toBeInstanceOf(RoundNotReadyError);

    expect(mockHasQueuedRoundEndEarly).toHaveBeenCalledWith(ROUND_ID);
    expect(mockFinalizeRoundStatus).not.toHaveBeenCalled();
    expect(mockFinalizeActiveSkins).not.toHaveBeenCalled();
    // The guard runs inside the in-flight mark, which is released on the throw,
    // so the queued 'finalize' item isn't left waiting on a stale mark.
    expect(isRoundFinalizeInFlight(ROUND_ID)).toBe(false);
  });

  it('finalises as before when no early end is queued', async () => {
    mockHasQueuedRoundEndEarly.mockResolvedValue(false);

    await expect(finalizeSubmittedRound(ROUND_ID)).resolves.toEqual({
      completed: true,
      skinsGame: null,
      statusError: null,
      skinsError: null,
    });

    const [checked] = mockHasQueuedRoundEndEarly.mock.invocationCallOrder;
    const [status] = mockFinalizeRoundStatus.mock.invocationCallOrder;
    expect(checked).toBeLessThan(status);
  });
});
