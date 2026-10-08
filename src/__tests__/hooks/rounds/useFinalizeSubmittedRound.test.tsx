/**
 * finalizeOrQueueRound / useFinalizeSubmittedRound — the step every submit
 * screen runs after submitScorecards.
 *
 * @see src/hooks/rounds/useFinalizeSubmittedRound.ts
 */
import { act, renderHook } from '@testing-library/react-native';
import {
  finalizeOrQueueRound,
  useFinalizeSubmittedRound,
} from '@/hooks/rounds/useFinalizeSubmittedRound';

const mockFinalizeSubmittedRound = jest.fn();
const mockQueueRoundFinalize = jest.fn();
const mockRemoveQueuedRoundFinalize = jest.fn();
jest.mock('@/services/rounds/finalizeSubmittedRound', () => ({
  finalizeSubmittedRound: (...args: unknown[]) => mockFinalizeSubmittedRound(...args),
  queueRoundFinalize: (...args: unknown[]) => mockQueueRoundFinalize(...args),
  removeQueuedRoundFinalize: (...args: unknown[]) => mockRemoveQueuedRoundFinalize(...args),
}));
// isTransientError (@/services/errors/transient) is the real one.

const mockHasUnsynced = jest.fn();
const mockFailedCount = jest.fn();
jest.mock('@/services/offline/database', () => ({
  hasUnsyncedScorecardsForRound: (...args: unknown[]) => mockHasUnsynced(...args),
  getFailedSyncCountForRound: (...args: unknown[]) => mockFailedCount(...args),
}));

const mockGetIsOnline = jest.fn();
jest.mock('@/services/offline/sync/networkState', () => ({
  getIsOnline: () => mockGetIsOnline(),
}));

const mockRequestSyncDrain = jest.fn();
jest.mock('@/services/offline/sync/drain', () => ({
  requestSyncDrain: (...args: unknown[]) => mockRequestSyncDrain(...args),
}));

const mockAwardSkinsAchievements = jest.fn();
jest.mock('@/services/skins/finalizeSkinsGame', () => ({
  awardSkinsAchievements: (...args: unknown[]) => mockAwardSkinsAchievements(...args),
}));

const mockCheckAndAward = jest.fn();
const mockAchievementsReady = { value: true };
jest.mock('@/hooks/useAuth', () => ({ useAuth: () => ({ user: { id: 'user-1' } }) }));
jest.mock('@/hooks/achievements/useCheckAchievements', () => ({
  useCheckAchievements: () => ({ checkAndAward: mockCheckAndAward, isReady: mockAchievementsReady.value }),
}));

const mockShowMultipleToasts = jest.fn();
jest.mock('@/context/AchievementToastContext', () => ({
  useAchievementToast: () => ({ showMultipleToasts: mockShowMultipleToasts }),
}));

const ROUND_ID = '550e8400-e29b-41d4-a716-446655440000';
const SKINS_GAME = { id: 'g1', pot_value: 5, status: 'completed' };
const DONE = { completed: true, skinsGame: null, statusError: null, skinsError: null };
const NOT_COMPLETE = { completed: false, skinsGame: null, statusError: null, skinsError: null };

beforeEach(() => {
  mockAchievementsReady.value = true;
  mockGetIsOnline.mockReturnValue(true);
  mockFinalizeSubmittedRound.mockResolvedValue(DONE);
  mockQueueRoundFinalize.mockResolvedValue(undefined);
  mockRemoveQueuedRoundFinalize.mockResolvedValue(true);
  mockHasUnsynced.mockResolvedValue(false);
  mockFailedCount.mockResolvedValue(0);
  mockAwardSkinsAchievements.mockResolvedValue(undefined);
});

describe('finalizeOrQueueRound', () => {
  it('writes the item first (no drain), finalises online, then removes the item once the round completes', async () => {
    await expect(finalizeOrQueueRound(ROUND_ID)).resolves.toEqual({
      completed: true,
      queued: false,
      skinsGame: null,
    });

    expect(mockQueueRoundFinalize).toHaveBeenCalledWith(ROUND_ID, { requestDrain: false });
    expect(mockFinalizeSubmittedRound).toHaveBeenCalledWith(ROUND_ID);
    expect(mockRemoveQueuedRoundFinalize).toHaveBeenCalledWith(ROUND_ID);
    const [queued] = mockQueueRoundFinalize.mock.invocationCallOrder;
    const [finalized] = mockFinalizeSubmittedRound.mock.invocationCallOrder;
    const [removed] = mockRemoveQueuedRoundFinalize.mock.invocationCallOrder;
    expect(queued).toBeLessThan(finalized);
    expect(finalized).toBeLessThan(removed);
    expect(mockRequestSyncDrain).not.toHaveBeenCalled();
    expect(mockHasUnsynced).not.toHaveBeenCalled();
  });

  it('leaves a durable item behind when the app dies mid-finalise', async () => {
    // The online attempt never returns (the process is killed during it).
    mockFinalizeSubmittedRound.mockReturnValue(new Promise(() => {}));

    void finalizeOrQueueRound(ROUND_ID);
    await new Promise((resolve) => setImmediate(resolve));

    expect(mockQueueRoundFinalize).toHaveBeenCalledWith(ROUND_ID, { requestDrain: false });
    expect(mockFinalizeSubmittedRound).toHaveBeenCalled();
    expect(mockRemoveQueuedRoundFinalize).not.toHaveBeenCalled();
  });

  it('keeps the item when the round is not complete and this device still has its cards to upload', async () => {
    mockFinalizeSubmittedRound.mockResolvedValue(NOT_COMPLETE);
    mockHasUnsynced.mockResolvedValue(true);

    await expect(finalizeOrQueueRound(ROUND_ID)).resolves.toEqual({
      completed: false,
      queued: true,
      skinsGame: null,
    });
    expect(mockHasUnsynced).toHaveBeenCalledWith(ROUND_ID);
    expect(mockRemoveQueuedRoundFinalize).not.toHaveBeenCalled();
    expect(mockRequestSyncDrain).toHaveBeenCalledWith('round-finalize-queued');
  });

  it('keeps the item when the round is not complete and one of its cards is a retained failure', async () => {
    mockFinalizeSubmittedRound.mockResolvedValue(NOT_COMPLETE);
    mockFailedCount.mockResolvedValue(1);

    await expect(finalizeOrQueueRound(ROUND_ID)).resolves.toEqual(
      expect.objectContaining({ queued: true })
    );
    expect(mockRemoveQueuedRoundFinalize).not.toHaveBeenCalled();
  });

  it('removes the item when the round is waiting only on other devices', async () => {
    mockFinalizeSubmittedRound.mockResolvedValue(NOT_COMPLETE);

    await expect(finalizeOrQueueRound(ROUND_ID)).resolves.toEqual({
      completed: false,
      queued: false,
      skinsGame: null,
    });
    expect(mockRemoveQueuedRoundFinalize).toHaveBeenCalledWith(ROUND_ID);
    expect(mockRequestSyncDrain).not.toHaveBeenCalled();
  });

  it.each(['pending', 'retained'])('keeps the item when reading %s cards fails', async (cardState) => {
    mockFinalizeSubmittedRound.mockResolvedValue({ ...NOT_COMPLETE, skinsGame: SKINS_GAME });
    const read = cardState === 'pending' ? mockHasUnsynced : mockFailedCount;
    read.mockRejectedValueOnce(new Error('local queue read failed'));

    await expect(finalizeOrQueueRound(ROUND_ID)).resolves.toEqual({
      completed: false,
      queued: true,
      skinsGame: SKINS_GAME,
    });
    expect(mockRemoveQueuedRoundFinalize).not.toHaveBeenCalled();
    expect(mockRequestSyncDrain).toHaveBeenCalledWith('round-finalize-queued');
  });

  it('still reports a completed round when removing its item fails (the leftover item is harmless)', async () => {
    mockRemoveQueuedRoundFinalize.mockRejectedValue(new Error('disk full'));

    await expect(finalizeOrQueueRound(ROUND_ID)).resolves.toEqual({
      completed: true,
      queued: true,
      skinsGame: null,
    });
    expect(mockRequestSyncDrain).toHaveBeenCalledWith('round-finalize-queued');
  });

  it('keeps the item for a retry when the status write fails, returning the settled skins game', async () => {
    mockFinalizeSubmittedRound.mockResolvedValue({
      completed: false,
      skinsGame: SKINS_GAME,
      statusError: new Error('network down'),
      skinsError: null,
    });

    await expect(finalizeOrQueueRound(ROUND_ID)).resolves.toEqual({
      completed: false,
      queued: true,
      skinsGame: SKINS_GAME,
    });
    expect(mockRemoveQueuedRoundFinalize).not.toHaveBeenCalled();
    expect(mockRequestSyncDrain).toHaveBeenCalledWith('round-finalize-queued');
  });

  it('keeps the item for a retry when skins settlement fails transiently after the round completed', async () => {
    mockFinalizeSubmittedRound.mockResolvedValue({
      ...DONE,
      skinsError: new Error('Failed to insert payouts: TypeError: Network request failed'),
    });

    await expect(finalizeOrQueueRound(ROUND_ID)).resolves.toEqual({
      completed: true,
      queued: true,
      skinsGame: null,
    });
    expect(mockRemoveQueuedRoundFinalize).not.toHaveBeenCalled();
    expect(mockRequestSyncDrain).toHaveBeenCalledWith('round-finalize-queued');
  });

  it('removes the item when skins settlement is refused for good (RLS: not the game creator)', async () => {
    mockFinalizeSubmittedRound.mockResolvedValue({
      ...DONE,
      skinsError: new Error(
        'Failed to insert payouts: new row violates row-level security policy for table "skins_payouts"'
      ),
    });

    await expect(finalizeOrQueueRound(ROUND_ID)).resolves.toEqual({
      completed: true,
      queued: false,
      skinsGame: null,
    });
    expect(mockRemoveQueuedRoundFinalize).toHaveBeenCalledWith(ROUND_ID);
    expect(mockRequestSyncDrain).not.toHaveBeenCalled();
  });

  it('keeps the item when finalisation throws (e.g. an early end still queued, B6b)', async () => {
    mockFinalizeSubmittedRound.mockRejectedValue(new Error('waiting for queued end_early'));

    await expect(finalizeOrQueueRound(ROUND_ID)).resolves.toEqual({
      completed: false,
      queued: true,
      skinsGame: null,
    });
    expect(mockRemoveQueuedRoundFinalize).not.toHaveBeenCalled();
    expect(mockHasUnsynced).not.toHaveBeenCalled();
    expect(mockRequestSyncDrain).toHaveBeenCalledWith('round-finalize-queued');
  });

  it('leaves the round to the queue when a drain is already finalising it', async () => {
    // finalizeSubmittedRound's own atomic in-flight check refuses (A6a-2).
    mockFinalizeSubmittedRound.mockRejectedValue(new Error('Round 550e8400 is already being finalised'));

    await expect(finalizeOrQueueRound(ROUND_ID)).resolves.toEqual({
      completed: false,
      queued: true,
      skinsGame: null,
    });
    expect(mockQueueRoundFinalize).toHaveBeenCalledWith(ROUND_ID, { requestDrain: false });
    expect(mockFinalizeSubmittedRound).toHaveBeenCalledTimes(1);
    expect(mockRemoveQueuedRoundFinalize).not.toHaveBeenCalled();
    expect(mockRequestSyncDrain).toHaveBeenCalledWith('round-finalize-queued');
  });

  it('queues (asking for a drain) without touching the server when offline', async () => {
    mockGetIsOnline.mockReturnValue(false);

    await expect(finalizeOrQueueRound(ROUND_ID)).resolves.toEqual({
      completed: false,
      queued: true,
      skinsGame: null,
    });
    expect(mockFinalizeSubmittedRound).not.toHaveBeenCalled();
    expect(mockQueueRoundFinalize).toHaveBeenCalledTimes(1);
    expect(mockQueueRoundFinalize).toHaveBeenCalledWith(ROUND_ID);
  });

  it('rejects when the queue write itself fails', async () => {
    mockQueueRoundFinalize.mockRejectedValue(new Error('disk full'));

    await expect(finalizeOrQueueRound(ROUND_ID)).rejects.toThrow('disk full');
    expect(mockFinalizeSubmittedRound).not.toHaveBeenCalled();
  });
});

describe('useFinalizeSubmittedRound', () => {
  async function runFinalize(): Promise<{ completed: boolean; queued: boolean } | undefined> {
    const { result } = renderHook(() => useFinalizeSubmittedRound());
    let outcome: { completed: boolean; queued: boolean } | undefined;
    await act(async () => {
      outcome = await result.current(ROUND_ID);
    });
    return outcome;
  }

  it('finalises the round and fires skins achievements for a game it settled', async () => {
    mockFinalizeSubmittedRound.mockResolvedValue({ completed: true, skinsGame: SKINS_GAME, statusError: null });

    await expect(runFinalize()).resolves.toEqual({ completed: true, queued: false });
    expect(mockAwardSkinsAchievements).toHaveBeenCalledWith(SKINS_GAME, {
      playerId: 'user-1',
      checkAndAward: mockCheckAndAward,
      showMultipleToasts: mockShowMultipleToasts,
    });
  });

  it('fires no skins achievements when nothing was settled (e.g. queued offline)', async () => {
    mockGetIsOnline.mockReturnValue(false);

    await expect(runFinalize()).resolves.toEqual({ completed: false, queued: true });
    expect(mockAwardSkinsAchievements).not.toHaveBeenCalled();
  });

  it('fires no skins achievements before the achievement data has loaded', async () => {
    mockAchievementsReady.value = false;
    mockFinalizeSubmittedRound.mockResolvedValue({ completed: true, skinsGame: SKINS_GAME, statusError: null });

    await runFinalize();

    expect(mockAwardSkinsAchievements).not.toHaveBeenCalled();
  });

  it('never rejects: a failure to finalise or queue comes back as not done', async () => {
    const consoleError = jest.spyOn(console, 'error').mockImplementation(() => {});
    mockGetIsOnline.mockReturnValue(false);
    mockQueueRoundFinalize.mockRejectedValue(new Error('disk full'));

    await expect(runFinalize()).resolves.toEqual({ completed: false, queued: false });
    consoleError.mockRestore();
  });
});
