/**
 * applyEndRoundEarly / queueRoundEndEarly — the end-early server write
 * (spec R14): the RPC at confirm time online, a queued round item offline.
 */
import {
  applyEndRoundEarly,
  queueRoundEndEarly,
  fetchRoundHolesPlayed,
  hasQueuedRoundEndEarly,
  roundEndEarlyEntityKey,
  EndRoundEarlyError,
  END_ROUND_EARLY_TIMEOUT_MS,
} from '@/services/rounds/applyEndRoundEarly';
import { queueRoundEarlyEndIntent, getQueuedEntityKeys } from '@/services/offline/database';
import { requestSyncDrain } from '@/services/offline/sync/drain';

// supabase.rpc(...) returns a builder; the service awaits
// builder.abortSignal(signal). mockRpcResult is what that await yields.
const mockRpcResult = jest.fn();
const mockAbortSignal = jest.fn((_signal: AbortSignal) => mockRpcResult());
const mockRpc = jest.fn((..._args: unknown[]) => ({ abortSignal: mockAbortSignal }));
const mockMaybeSingle = jest.fn();
const mockEq = jest.fn(() => ({ maybeSingle: mockMaybeSingle }));
const mockSelect = jest.fn(() => ({ eq: mockEq }));
const mockFrom = jest.fn((..._args: unknown[]) => ({ select: mockSelect }));
jest.mock('@/services/supabase/client', () => ({
  supabase: {
    rpc: (...args: unknown[]) => mockRpc(...args),
    from: (...args: unknown[]) => mockFrom(...args),
  },
}));

jest.mock('@/services/offline/database', () => ({
  queueRoundEarlyEndIntent: jest.fn(),
  getQueuedEntityKeys: jest.fn(),
}));

jest.mock('@/services/offline/sync/drain', () => ({
  requestSyncDrain: jest.fn(),
}));

// The signed-in user stamped onto queued items (null: none recorded).
const mockGetSyncAuthUserId = jest.fn((): string | null => 'user-1');
jest.mock('@/services/offline/sync/networkState', () => ({
  getSyncAuthUserId: () => mockGetSyncAuthUserId(),
}));

const ROUND_ID = '550e8400-e29b-41d4-a716-446655440000';

async function rejectionOf(promise: Promise<unknown>): Promise<EndRoundEarlyError> {
  try {
    await promise;
  } catch (error) {
    expect(error).toBeInstanceOf(EndRoundEarlyError);
    return error as EndRoundEarlyError;
  }
  throw new Error('expected a rejection');
}

describe('applyEndRoundEarly', () => {
  it('requires authenticated ownership before issuing an end request', async () => {
    mockGetSyncAuthUserId.mockReturnValueOnce(null);
    await expect(applyEndRoundEarly(ROUND_ID, 6)).rejects.toMatchObject({ code: 'forbidden' });
    expect(mockRpc).not.toHaveBeenCalled();
  });
  it('defers only explicit busy-card errors', async () => {
    mockRpcResult.mockResolvedValue({
      error: { code: '22023', hint: 'round_scorecards_busy', message: 'busy' },
    });
    await expect(applyEndRoundEarly(ROUND_ID, 6)).rejects.toMatchObject({ code: 'busy' });
  });
  it('calls end_round_early with the round and the holes played', async () => {
    mockRpcResult.mockResolvedValue({ data: null, error: null });

    await expect(applyEndRoundEarly(ROUND_ID, 6)).resolves.toBeUndefined();

    expect(mockRpc).toHaveBeenCalledWith('end_round_early', {
      p_round_id: ROUND_ID,
      p_holes_played: 6,
    });
  });

  it.each([0, -1, 2.5, Number.NaN])(
    'rejects N = %p as invalid without calling the server',
    async (n) => {
      const error = await rejectionOf(applyEndRoundEarly(ROUND_ID, n));

      expect(error.code).toBe('invalid');
      expect(mockRpc).not.toHaveBeenCalled();
    }
  );

  it('rejects a missing round id as invalid', async () => {
    const error = await rejectionOf(applyEndRoundEarly('', 6));

    expect(error.code).toBe('invalid');
    expect(mockRpc).not.toHaveBeenCalled();
  });

  // B1a-1's error contract: every 22023 carries a stable HINT; only
  // 'round_already_ended' is a conflict, and its DETAIL is the server's N.
  it("maps 22023 HINT round_already_ended to 'conflict' with the server's N from DETAIL", async () => {
    mockRpcResult.mockResolvedValue({
      data: null,
      error: {
        code: '22023',
        message: 'Round 550e8400-e29b-41d4-a716-446655440000 was already ended after 6 holes',
        details: '6',
        hint: 'round_already_ended',
      },
    });

    const error = await rejectionOf(applyEndRoundEarly(ROUND_ID, 8));

    expect(error.code).toBe('conflict');
    expect(error.serverHolesPlayed).toBe(6);
    expect(error.message).toContain('already ended after 6 holes');
    // DETAIL was usable, so no read-back.
    expect(mockFrom).not.toHaveBeenCalled();
  });

  it('reads holes_played back when the conflict DETAIL is not a number', async () => {
    mockRpcResult.mockResolvedValue({
      data: null,
      error: {
        code: '22023',
        message: 'already ended',
        details: null,
        hint: 'round_already_ended',
      },
    });
    mockMaybeSingle.mockResolvedValue({ data: { holes_played: 6 }, error: null });

    const error = await rejectionOf(applyEndRoundEarly(ROUND_ID, 8));

    expect(error.code).toBe('conflict');
    expect(error.serverHolesPlayed).toBe(6);
    expect(mockFrom).toHaveBeenCalledWith('rounds');
    expect(mockSelect).toHaveBeenCalledWith('holes_played');
    expect(mockEq).toHaveBeenCalledWith('id', ROUND_ID);
  });

  it('leaves serverHolesPlayed undefined when DETAIL is missing and the read-back fails', async () => {
    mockRpcResult.mockResolvedValue({
      data: null,
      error: { code: '22023', message: 'already ended', hint: 'round_already_ended' },
    });
    mockMaybeSingle.mockResolvedValue({ data: null, error: { message: 'timeout' } });

    const error = await rejectionOf(applyEndRoundEarly(ROUND_ID, 8));

    expect(error.code).toBe('conflict');
    expect(error.serverHolesPlayed).toBeUndefined();
  });

  it.each([
    ['invalid_holes_played', 'holes_played must be between 1 and 17 for a full round (got 18)'],
    ['round_completed', 'Round 550e8400 is already completed'],
    // B1a-1's 'round_not_in_progress' (an upcoming round), and any hint added later, is 'invalid' too.
    ['round_not_in_progress', 'Round 550e8400 is not in progress'],
    [undefined, 'some other 22023'],
  ])("maps 22023 with HINT %p to 'invalid' (no read-back)", async (hint, message) => {
    mockRpcResult.mockResolvedValue({ data: null, error: { code: '22023', message, hint } });

    const error = await rejectionOf(applyEndRoundEarly(ROUND_ID, 6));

    expect(error.code).toBe('invalid');
    expect(error.serverHolesPlayed).toBeUndefined();
    expect(error.message).toContain(message);
    expect(mockFrom).not.toHaveBeenCalled();
  });

  it.each([
    ['P0002', 'not_found'],
    ['42501', 'forbidden'],
    ['22P02', 'invalid'],
    ['23514', 'invalid'],
  ])('maps server code %s to %s, keeping the server message', async (code, expected) => {
    mockRpcResult.mockResolvedValue({
      data: null,
      error: { code, message: `server said ${code}` },
    });

    const error = await rejectionOf(applyEndRoundEarly(ROUND_ID, 6));

    expect(error.code).toBe(expected);
    expect(error.message).toContain(`server said ${code}`);
    expect(mockFrom).not.toHaveBeenCalled();
  });

  it.each([
    ['an empty code (fetch failed)', { code: '', message: 'TypeError: Network request failed' }],
    [
      'a statement timeout',
      { code: '57014', message: 'canceling statement due to statement timeout' },
    ],
    [
      'a missing RPC (migration not deployed)',
      { code: 'PGRST202', message: 'Could not find the function' },
    ],
  ])("maps %s to 'network' (retryable)", async (_label, error) => {
    mockRpcResult.mockResolvedValue({ data: null, error });

    await expect(rejectionOf(applyEndRoundEarly(ROUND_ID, 6))).resolves.toMatchObject({
      code: 'network',
    });
  });

  it("maps a thrown request to 'network'", async () => {
    mockRpcResult.mockRejectedValue(new TypeError('Network request failed'));

    const error = await rejectionOf(applyEndRoundEarly(ROUND_ID, 6));

    expect(error.code).toBe('network');
    expect(error.message).toContain('Network request failed');
  });

  it('passes an abort signal to the request', async () => {
    mockRpcResult.mockResolvedValue({ data: null, error: null });

    await applyEndRoundEarly(ROUND_ID, 6);

    expect(mockAbortSignal).toHaveBeenCalledTimes(1);
    const [signal] = mockAbortSignal.mock.calls[0];
    expect(signal.aborted).toBe(false);
  });

  describe('with no answer from the server', () => {
    beforeEach(() => {
      jest.useFakeTimers();
    });
    afterEach(() => {
      jest.useRealTimers();
    });

    it('keeps a timed-out result rejected when the remote RPC settles after an independent retry', async () => {
      let settle!: (value: { data: null; error: null }) => void;
      mockRpcResult.mockReturnValueOnce(
        new Promise((resolve) => {
          settle = resolve;
        })
      );
      const timedOut = rejectionOf(applyEndRoundEarly(ROUND_ID, 6));
      await jest.advanceTimersByTimeAsync(END_ROUND_EARLY_TIMEOUT_MS);
      await expect(timedOut).resolves.toMatchObject({ code: 'network' });
      mockRpcResult.mockResolvedValueOnce({ data: null, error: null });
      await expect(applyEndRoundEarly(ROUND_ID, 6)).resolves.toBeUndefined();
      settle({ data: null, error: null });
      await Promise.resolve();
      await expect(timedOut).resolves.toMatchObject({ code: 'network' });
      expect(mockRpc).toHaveBeenCalledTimes(2);
    });

    it("gives up after END_ROUND_EARLY_TIMEOUT_MS with 'network' and aborts the request", async () => {
      expect(END_ROUND_EARLY_TIMEOUT_MS).toBe(8000);
      mockRpcResult.mockReturnValueOnce(new Promise(() => {})); // never settles
      let settled = false;
      const outcome = rejectionOf(applyEndRoundEarly(ROUND_ID, 6)).finally(() => {
        settled = true;
      });

      await jest.advanceTimersByTimeAsync(END_ROUND_EARLY_TIMEOUT_MS - 1);
      expect(settled).toBe(false);

      await jest.advanceTimersByTimeAsync(1);
      const error = await outcome;

      expect(error.code).toBe('network');
      expect(error.message).toMatch(/did not answer within 8s/);
      const [signal] = mockAbortSignal.mock.calls[0];
      expect(signal.aborted).toBe(true);
    });
  });
});

describe('fetchRoundHolesPlayed', () => {
  it("returns the round's holes_played", async () => {
    mockMaybeSingle.mockResolvedValue({ data: { holes_played: 6 }, error: null });
    await expect(fetchRoundHolesPlayed(ROUND_ID)).resolves.toBe(6);
  });

  it('returns null for a round played as planned or a missing row', async () => {
    mockMaybeSingle.mockResolvedValueOnce({ data: { holes_played: null }, error: null });
    await expect(fetchRoundHolesPlayed(ROUND_ID)).resolves.toBeNull();

    mockMaybeSingle.mockResolvedValueOnce({ data: null, error: null });
    await expect(fetchRoundHolesPlayed(ROUND_ID)).resolves.toBeNull();
  });

  it('throws on a read error', async () => {
    mockMaybeSingle.mockResolvedValue({ data: null, error: { message: 'timeout' } });
    await expect(fetchRoundHolesPlayed(ROUND_ID)).rejects.toThrow(/timeout/);
  });
});

describe('queueRoundEndEarly', () => {
  it('refuses missing authenticated ownership', async () => {
    mockGetSyncAuthUserId.mockReturnValueOnce(null);
    await expect(queueRoundEndEarly(ROUND_ID, 6)).rejects.toMatchObject({ code: 'forbidden' });
    expect(queueRoundEarlyEndIntent).not.toHaveBeenCalled();
  });
  beforeEach(() => {
    (queueRoundEarlyEndIntent as jest.Mock).mockResolvedValue(undefined);
  });

  it('queues an end_early round item under its own entity key, then requests a drain', async () => {
    await queueRoundEndEarly(ROUND_ID, 6);

    expect(queueRoundEarlyEndIntent).toHaveBeenCalledWith(ROUND_ID, 6, { userId: 'user-1' });
    const [queued] = (queueRoundEarlyEndIntent as jest.Mock).mock.invocationCallOrder;
    const [drained] = (requestSyncDrain as jest.Mock).mock.invocationCallOrder;
    expect(queued).toBeLessThan(drained);
  });

  it('stamps the signed-in user onto the item, so only that user drains it (A6b-1)', async () => {
    mockGetSyncAuthUserId.mockReturnValueOnce('user-1');

    await queueRoundEndEarly(ROUND_ID, 6);

    expect(queueRoundEarlyEndIntent).toHaveBeenCalledWith(ROUND_ID, 6, { userId: 'user-1' });
  });

  it('does not request a drain when queueing fails', async () => {
    (queueRoundEarlyEndIntent as jest.Mock).mockRejectedValue(new Error('disk full'));

    await expect(queueRoundEndEarly(ROUND_ID, 6)).rejects.toThrow('disk full');
    expect(requestSyncDrain).not.toHaveBeenCalled();
  });

  it('refuses an invalid N without queueing', async () => {
    const error = await rejectionOf(queueRoundEndEarly(ROUND_ID, 0));

    expect(error.code).toBe('invalid');
    expect(queueRoundEarlyEndIntent).not.toHaveBeenCalled();
  });
});

describe('hasQueuedRoundEndEarly', () => {
  it('is true only when the round has an end_early row queued', async () => {
    (getQueuedEntityKeys as jest.Mock).mockResolvedValueOnce(
      new Set([roundEndEarlyEntityKey(ROUND_ID)])
    );
    await expect(hasQueuedRoundEndEarly(ROUND_ID)).resolves.toBe(true);

    // A finalize row (round:<id>:finalize, A6a) is not an end_early row.
    (getQueuedEntityKeys as jest.Mock).mockResolvedValueOnce(
      new Set([`round:${ROUND_ID}:finalize`])
    );
    await expect(hasQueuedRoundEndEarly(ROUND_ID)).resolves.toBe(false);
  });
});
