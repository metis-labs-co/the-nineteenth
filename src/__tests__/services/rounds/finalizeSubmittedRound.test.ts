/**
 * finalizeSubmittedRound / queueRoundFinalize — the post-submit server steps
 * shared by every submit path and the queued `round` sync item.
 */
import {
  finalizeSubmittedRound,
  queueRoundFinalize,
  removeQueuedRoundFinalize,
  isRoundFinalizeInFlight,
  roundFinalizeEntityKey,
  RoundNotReadyError,
} from '@/services/rounds/finalizeSubmittedRound';

const mockFinalizeRoundStatus = jest.fn();
jest.mock('@/services/rounds/finalizeRoundStatus', () => ({
  finalizeRoundStatus: (...args: unknown[]) => mockFinalizeRoundStatus(...args),
}));

const mockRefinalize = jest.fn();
jest.mock('@/services/rounds/refinalizeRoundResults', () => ({
  refinalizeRoundResults: (...args: unknown[]) => mockRefinalize(...args),
}));

const mockFinalizeActiveSkins = jest.fn();
jest.mock('@/services/skins/finalizeSkinsGame', () => ({
  finalizeActiveSkinsForRound: (...args: unknown[]) => mockFinalizeActiveSkins(...args),
}));

const mockAddPendingSync = jest.fn();
const mockRemoveByEntityKey = jest.fn();
jest.mock('@/services/offline/database', () => ({
  addPendingSync: (...args: unknown[]) => mockAddPendingSync(...args),
  removePendingSyncByEntityKey: (...args: unknown[]) => mockRemoveByEntityKey(...args),
}));

const mockInvalidateQueries = jest.fn();
const mockInvalidateLeaderboardCache = jest.fn();
jest.mock('@/services/queryClient', () => ({
  queryClient: { invalidateQueries: (...args: unknown[]) => mockInvalidateQueries(...args) },
  invalidateLeaderboardCache: (...args: unknown[]) => mockInvalidateLeaderboardCache(...args),
}));

const mockRequestSyncDrain = jest.fn();
jest.mock('@/services/offline/sync/drain', () => ({
  requestSyncDrain: (...args: unknown[]) => mockRequestSyncDrain(...args),
}));

// The signed-in user stamped onto queued items (null: none recorded).
const mockGetSyncAuthUserId = jest.fn((): string | null => null);
jest.mock('@/services/offline/sync/networkState', () => ({
  getSyncAuthUserId: () => mockGetSyncAuthUserId(),
}));

const ROUND_ID = '550e8400-e29b-41d4-a716-446655440000';
const SETTLED_GAME = { id: 'g1', round_id: ROUND_ID, status: 'completed', pot_value: 5 };

describe('finalizeSubmittedRound', () => {
  let consoleError: jest.SpyInstance;
  let consoleWarn: jest.SpyInstance;

  beforeEach(() => {
    consoleError = jest.spyOn(console, 'error').mockImplementation(() => {});
    consoleWarn = jest.spyOn(console, 'warn').mockImplementation(() => {});
    mockFinalizeRoundStatus.mockResolvedValue(true);
    mockRefinalize.mockResolvedValue(undefined);
    mockFinalizeActiveSkins.mockResolvedValue({ finalized: false });
  });
  afterEach(() => {
    consoleError.mockRestore();
    consoleWarn.mockRestore();
  });

  it('runs status, then results, then skins, and reports a completed round', async () => {
    await expect(finalizeSubmittedRound(ROUND_ID)).resolves.toEqual({
      completed: true,
      skinsGame: null,
      statusError: null,
      skinsError: null,
    });

    expect(mockFinalizeRoundStatus).toHaveBeenCalledWith(ROUND_ID);
    expect(mockRefinalize).toHaveBeenCalledWith(ROUND_ID);
    expect(mockFinalizeActiveSkins).toHaveBeenCalledWith(ROUND_ID);
    const [status] = mockFinalizeRoundStatus.mock.invocationCallOrder;
    const [results] = mockRefinalize.mock.invocationCallOrder;
    const [skins] = mockFinalizeActiveSkins.mock.invocationCallOrder;
    expect(status).toBeLessThan(results);
    expect(results).toBeLessThan(skins);
  });

  it('refreshes every round query (the Rounds list is ["rounds", userId])', async () => {
    await finalizeSubmittedRound(ROUND_ID);

    expect(mockInvalidateQueries).toHaveBeenCalledWith({ queryKey: ['rounds'] });
    expect(mockInvalidateQueries).not.toHaveBeenCalledWith({ queryKey: ['skins'] });
  });

  it('refreshes the leaderboards, competitions and Home round lists', async () => {
    await finalizeSubmittedRound(ROUND_ID);

    expect(mockInvalidateLeaderboardCache).toHaveBeenCalledWith();
    expect(mockInvalidateQueries).toHaveBeenCalledWith({ queryKey: ['competitions'] });
    // Prefix of ['home', 'inProgressRounds', uid] and ['home', 'upcomingRounds', uid].
    expect(mockInvalidateQueries).toHaveBeenCalledWith({ queryKey: ['home'] });
  });

  it('marks the round in flight only while it runs', async () => {
    let release!: (value: boolean) => void;
    mockFinalizeRoundStatus.mockReturnValue(
      new Promise<boolean>((resolve) => {
        release = resolve;
      })
    );

    const running = finalizeSubmittedRound(ROUND_ID);
    expect(isRoundFinalizeInFlight(ROUND_ID)).toBe(true);
    expect(isRoundFinalizeInFlight('another-round')).toBe(false);

    release(true);
    await running;
    expect(isRoundFinalizeInFlight(ROUND_ID)).toBe(false);
  });

  // The test-and-set is atomic: no await separates the check from the mark,
  // so a submit screen and a drain can never both run the steps.
  it('runs the steps once when two callers race for the same round; the second gets RoundNotReadyError', async () => {
    let release!: (value: boolean) => void;
    mockFinalizeRoundStatus.mockReturnValue(
      new Promise<boolean>((resolve) => {
        release = resolve;
      })
    );

    const first = finalizeSubmittedRound(ROUND_ID);
    const second = finalizeSubmittedRound(ROUND_ID);

    await expect(second).rejects.toBeInstanceOf(RoundNotReadyError);
    // The loser leaves the winner's mark alone.
    expect(isRoundFinalizeInFlight(ROUND_ID)).toBe(true);

    release(true);
    await expect(first).resolves.toEqual(expect.objectContaining({ completed: true }));
    expect(mockFinalizeRoundStatus).toHaveBeenCalledTimes(1);
    expect(mockRefinalize).toHaveBeenCalledTimes(1);
    expect(mockFinalizeActiveSkins).toHaveBeenCalledTimes(1);
    expect(isRoundFinalizeInFlight(ROUND_ID)).toBe(false);

    // Once the first run has finished, the round can be finalised again.
    mockFinalizeRoundStatus.mockResolvedValue(true);
    await expect(finalizeSubmittedRound(ROUND_ID)).resolves.toEqual(
      expect.objectContaining({ completed: true })
    );
  });

  it('still writes results and settles skins when the round is not complete yet', async () => {
    mockFinalizeRoundStatus.mockResolvedValue(false);

    await expect(finalizeSubmittedRound(ROUND_ID)).resolves.toEqual({
      completed: false,
      skinsGame: null,
      statusError: null,
      skinsError: null,
    });
    expect(mockRefinalize).toHaveBeenCalled();
    expect(mockFinalizeActiveSkins).toHaveBeenCalled();
  });

  it('returns the skins game it settled and refreshes the skins caches', async () => {
    mockFinalizeActiveSkins.mockResolvedValue({ finalized: true, game: SETTLED_GAME });

    const result = await finalizeSubmittedRound(ROUND_ID);

    expect(result.skinsGame).toBe(SETTLED_GAME);
    expect(mockInvalidateQueries).toHaveBeenCalledWith({ queryKey: ['skins'] });
  });

  it('reports a skins error for retry without failing the round', async () => {
    const skinsFailure = new Error('payouts insert failed');
    mockFinalizeActiveSkins.mockResolvedValue({ finalized: false, error: skinsFailure });

    await expect(finalizeSubmittedRound(ROUND_ID)).resolves.toEqual({
      completed: true,
      skinsGame: null,
      statusError: null,
      skinsError: skinsFailure,
    });
  });

  it('reports a failed status write without rejecting, after results and skins ran, keeping the settled game', async () => {
    const failure = new Error('network down');
    mockFinalizeRoundStatus.mockRejectedValue(failure);
    mockFinalizeActiveSkins.mockResolvedValue({ finalized: true, game: SETTLED_GAME });

    await expect(finalizeSubmittedRound(ROUND_ID)).resolves.toEqual({
      completed: false,
      skinsGame: SETTLED_GAME,
      statusError: failure,
      skinsError: null,
    });
    expect(mockRefinalize).toHaveBeenCalled();
    expect(mockFinalizeActiveSkins).toHaveBeenCalled();
  });

  it('does not reject even if the results step throws', async () => {
    mockRefinalize.mockRejectedValue(new Error('boom'));

    await expect(finalizeSubmittedRound(ROUND_ID)).resolves.toEqual(
      expect.objectContaining({ completed: true })
    );
    expect(mockFinalizeActiveSkins).toHaveBeenCalled();
  });
});

describe('queueRoundFinalize', () => {
  beforeEach(() => {
    mockAddPendingSync.mockResolvedValue(undefined);
  });

  it('queues a round finalisation under its own entity key', async () => {
    await queueRoundFinalize(ROUND_ID);

    expect(mockAddPendingSync).toHaveBeenCalledWith({
      type: 'round',
      action: 'update',
      data: { id: ROUND_ID, action: 'finalize' },
      entityKey: `round:${ROUND_ID}:finalize`,
      timestamp: expect.any(Date),
      retryCount: 0,
    });
  });

  it('asks for a drain once the item is queued (a no-op offline)', async () => {
    await queueRoundFinalize(ROUND_ID);

    expect(mockRequestSyncDrain).toHaveBeenCalledWith('round-finalize-queued');
    const [queued] = mockAddPendingSync.mock.invocationCallOrder;
    const [drain] = mockRequestSyncDrain.mock.invocationCallOrder;
    expect(queued).toBeLessThan(drain);
  });

  it('can queue without asking for a drain (the online submit path writes it first)', async () => {
    mockRequestSyncDrain.mockClear();

    await queueRoundFinalize(ROUND_ID, { requestDrain: false });

    expect(mockAddPendingSync).toHaveBeenCalled();
    expect(mockRequestSyncDrain).not.toHaveBeenCalled();
  });

  it('stamps the signed-in user onto the item, so only that user drains it', async () => {
    mockGetSyncAuthUserId.mockReturnValueOnce('user-1');

    await queueRoundFinalize(ROUND_ID);

    expect(mockAddPendingSync).toHaveBeenCalledWith(
      expect.objectContaining({ data: { id: ROUND_ID, action: 'finalize', userId: 'user-1' } })
    );
  });

  it('rejects when the queue write fails', async () => {
    mockAddPendingSync.mockRejectedValue(new Error('disk full'));

    await expect(queueRoundFinalize(ROUND_ID)).rejects.toThrow('disk full');
  });
});

describe('removeQueuedRoundFinalize', () => {
  it('removes the round finalisation by its entity key', async () => {
    mockRemoveByEntityKey.mockResolvedValue(true);

    await expect(removeQueuedRoundFinalize(ROUND_ID)).resolves.toBe(true);
    expect(mockRemoveByEntityKey).toHaveBeenCalledWith(`round:${ROUND_ID}:finalize`);
    expect(roundFinalizeEntityKey(ROUND_ID)).toBe(`round:${ROUND_ID}:finalize`);
  });
});

describe('RoundNotReadyError', () => {
  it('is a named Error that identifies the round', () => {
    const error = new RoundNotReadyError(ROUND_ID);

    expect(error).toBeInstanceOf(Error);
    expect(error.name).toBe('RoundNotReadyError');
    expect(error.message).toContain('550e8400');
  });
});
