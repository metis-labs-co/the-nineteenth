import { syncScorecard } from '@/services/offline/sync/scorecardSync';
import { setSyncAuthUser } from '@/services/offline/sync/networkState';
import { supabase } from '@/services/supabase/client';
import { saveScoreEntries } from '@/services/scoreMismatch';
import * as database from '@/services/offline/database';
import { withRoundScoringWrite } from '@/services/rounds/roundScoringCoordinator';
import { withRoundPersistenceTransition } from '@/services/offline/roundPersistenceBarrier';
import type { Scorecard } from '@/types';
import { Platform } from 'react-native';

jest.mock('@/services/supabase/client', () => ({
  supabase: { rpc: jest.fn(), from: jest.fn() },
  getCurrentUser: jest.fn(async () => ({ id: 'owner' })),
}));
jest.mock('@/services/queryClient', () => ({ invalidateHandicapCache: jest.fn() }));
jest.mock('@/services/handicap/updatePlayerHandicapIndex', () => ({
  updatePlayerHandicapIndex: jest.fn(async () => {}),
}));
jest.mock('@/services/scoreMismatch', () => ({ saveScoreEntries: jest.fn(async () => {}) }));
jest.mock('@/services/offline/database', () => ({
  getPendingSyncByEntityKey: jest.fn(async () => null),
  getScorecardsByRound: jest.fn(async () => []),
  recordAcceptedScorecardWrite: jest.fn(async () => {}),
  markScorecardAsSynced: jest.fn(async () => true),
  removePendingSync: jest.fn(async () => true),
  getPendingSyncs: jest.fn(async () => []),
  getFailedSyncs: jest.fn(async () => []),
  getHoles: jest.fn(async () => []),
  persistAuthoritativeRoundShape: jest.fn(),
}));
let mockLive: Scorecard[] = [];
let mockSessionCurrent = true;
jest.mock('@/store/scorecardStore', () => ({
  useScorecardStore: {
    getState: () => ({
      currentRoundId: mockLive[0]?.roundId,
      captureRoundScoringSession: (id: string) =>
        mockLive[0]?.roundId === id
          ? {
              isCurrent: () => mockSessionCurrent,
              getCards: () => mockLive,
              getLiveContext: () => undefined,
            }
          : null,
    }),
  },
}));

const roundId = '550e8400-e29b-41d4-a716-446655440000';
const card = (overrides: Partial<Scorecard> = {}): Scorecard => ({
  id: 'local-card',
  roundId,
  playerId: '550e8400-e29b-41d4-a716-446655440001',
  scores: { 1: { strokes: 5, scoredBy: 'owner' } },
  totalGross: 5,
  totalNet: 5,
  status: 'in-progress',
  createdAt: new Date(0),
  updatedAt: new Date(0),
  syncNineType: 'full',
  ...overrides,
});
function deferred<T>() {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>((r) => {
    resolve = r;
  });
  return { promise, resolve };
}
const accepted = { data: [{ applied: true, conflict: false, server_revision: 7 }], error: null };
beforeEach(() => {
  jest.clearAllMocks();
  mockLive = [];
  mockSessionCurrent = true;
  setSyncAuthUser('owner');
  (supabase.rpc as jest.Mock).mockResolvedValue(accepted);
  (database.getPendingSyncByEntityKey as jest.Mock).mockResolvedValue(null);
  (database.getScorecardsByRound as jest.Mock).mockResolvedValue([]);
  (database.recordAcceptedScorecardWrite as jest.Mock).mockResolvedValue(undefined);
});

describe('common scorecard upload boundary', () => {
  it('preserves a normal snapshot and historical best-effort entry failures', async () => {
    (saveScoreEntries as jest.Mock).mockRejectedValueOnce(new Error('historical entry failure'));
    await expect(syncScorecard(card())).resolves.toMatchObject({ serverRevision: 7 });
    expect((supabase.rpc as jest.Mock).mock.calls[0][1].p_snapshot).toMatchObject({
      scores: { 1: { strokes: 5 } },
      total_gross: 5,
    });
  });
  it('declares the same planned shape used to prepare a normal snapshot', async () => {
    await syncScorecard(card());
    expect((supabase.rpc as jest.Mock).mock.calls[0][1].p_snapshot.expected_round_shape).toEqual({
      nine_type: 'full',
      holes_played: null,
    });
  });
  it.each([
    { applied: true, conflict: false, server_revision: -1 },
    { applied: true, conflict: false, server_revision: 1.5 },
    { applied: 'true', conflict: false, server_revision: 7 },
  ])('rejects malformed concurrency response %j without entries or acknowledgment', async (row) => {
    (supabase.rpc as jest.Mock).mockResolvedValueOnce({ data: [row], error: null });
    await expect(syncScorecard(card(), { markSynced: true })).rejects.toThrow(
      'invalid concurrency response'
    );
    expect(saveScoreEntries).not.toHaveBeenCalled();
    expect(database.markScorecardAsSynced).not.toHaveBeenCalled();
  });
  it.each(['pending', 'failed', 'foreign', 'malformed'])(
    'defers an upload with a live %s end prerequisite',
    async (status) => {
      (database.getPendingSyncByEntityKey as jest.Mock).mockImplementation(async (key: string) =>
        key.startsWith('round:')
          ? { type: 'round', status, data: { userId: status === 'foreign' ? 'other' : 'owner' } }
          : null
      );
      await expect(syncScorecard(card())).rejects.toMatchObject({ kind: 'local_end_pending' });
      expect(supabase.rpc).not.toHaveBeenCalled();
    }
  );
  it('defers only the affected round when live prerequisite decoding fails', async () => {
    (database.getPendingSyncByEntityKey as jest.Mock).mockImplementation(async (key: string) => {
      if (key === `round:${roundId}:end_early`) throw new SyntaxError('malformed JSON');
      return null;
    });
    await expect(syncScorecard(card())).rejects.toMatchObject({ kind: 'local_end_pending' });
    await expect(
      syncScorecard(card({ roundId: '550e8400-e29b-41d4-a716-446655440015', scores: {} }))
    ).resolves.toMatchObject({ serverRevision: 7 });
    expect(supabase.rpc).toHaveBeenCalledTimes(1);
  });
  it('keeps newer queue fields and its failed status when entries reject an accepted older snapshot', async () => {
    const original = card();
    let queued = {
      id: 9,
      revision: 3,
      type: 'scorecard',
      action: 'update',
      status: 'pending',
      data: original,
    };
    (database.getPendingSyncByEntityKey as jest.Mock).mockImplementation(async (key) =>
      key.startsWith('scorecard:') ? queued : null
    );
    (saveScoreEntries as jest.Mock).mockImplementationOnce(async () => {
      queued = {
        ...queued,
        revision: 4,
        status: 'failed',
        data: card({ status: 'confirmed', scores: { 1: { strokes: 8 } }, totalGross: 8 }),
      };
      throw { code: '55P03', hint: 'round_scoring_busy', message: 'busy' };
    });
    (database.recordAcceptedScorecardWrite as jest.Mock).mockImplementationOnce(
      async (_round, _player, acceptedWrite) => {
        queued = {
          ...queued,
          revision: queued.revision + 1,
          data: { ...queued.data, serverRevision: acceptedWrite.serverRevision },
        };
      }
    );
    await expect(syncScorecard(original, { markSynced: true })).rejects.toMatchObject({
      kind: 'busy',
      acceptedWrite: { scorecardId: 'local-card', serverRevision: 7 },
    });
    expect(queued).toMatchObject({
      revision: 5,
      status: 'failed',
      data: { status: 'confirmed', scores: { 1: { strokes: 8 } }, serverRevision: 7 },
    });
    expect(database.markScorecardAsSynced).not.toHaveBeenCalled();
    expect(database.removePendingSync).not.toHaveBeenCalled();
  });
  it('refuses accepted continuation after replacement of the private scoring session', async () => {
    mockLive = [card()];
    const response = deferred<typeof accepted>();
    (supabase.rpc as jest.Mock).mockReturnValueOnce(response.promise);
    const upload = syncScorecard(mockLive[0], { markSynced: true });
    while (!(supabase.rpc as jest.Mock).mock.calls.length) await Promise.resolve();
    mockSessionCurrent = false;
    response.resolve(accepted);
    await expect(upload).rejects.toMatchObject({
      kind: 'context_changed',
      acceptedWrite: { scorecardId: 'local-card', serverRevision: 7 },
    });
    expect(database.markScorecardAsSynced).not.toHaveBeenCalled();
    expect(saveScoreEntries).not.toHaveBeenCalled();
  });
  it.each(['round_score_out_of_play', 'round_scoring_busy'])(
    'preserves the accepted LOCAL identity and revision when trailing entries reject with %s',
    async (hint) => {
      (saveScoreEntries as jest.Mock).mockRejectedValueOnce({
        code: '22023',
        hint,
        message: 'entry guard',
      });
      await expect(syncScorecard(card())).rejects.toMatchObject({
        sqlCode: '22023',
        sqlHint: hint,
        acceptedWrite: { scorecardId: 'local-card', serverRevision: 7 },
      });
      expect(database.recordAcceptedScorecardWrite).toHaveBeenCalledWith(roundId, card().playerId, {
        scorecardId: 'local-card',
        serverRevision: 7,
      });
    }
  );
  it('blocks ended cards whose historical reconstruction context is unknown', async () => {
    await expect(syncScorecard(card({ holesPlayed: 6 }))).rejects.toMatchObject({
      kind: 'context_missing',
    });
    expect(supabase.rpc).not.toHaveBeenCalled();
  });
  it('records a late accepted revision without entries or acknowledgment after owner replacement', async () => {
    const response = deferred<typeof accepted>();
    (supabase.rpc as jest.Mock).mockReturnValueOnce(response.promise);
    const upload = syncScorecard(card());
    while (!(supabase.rpc as jest.Mock).mock.calls.length) await Promise.resolve();
    setSyncAuthUser('new-owner');
    response.resolve(accepted);
    await expect(upload).rejects.toMatchObject({
      kind: 'context_changed',
      acceptedWrite: { scorecardId: 'local-card', serverRevision: 7 },
    });
    expect(saveScoreEntries).not.toHaveBeenCalled();
    expect(database.recordAcceptedScorecardWrite).toHaveBeenCalled();
  });
  it('records a late accepted revision after a local source transition', async () => {
    const response = deferred<typeof accepted>();
    const input = card({ roundId: '550e8400-e29b-41d4-a716-446655440009' });
    (supabase.rpc as jest.Mock).mockReturnValueOnce(response.promise);
    const upload = syncScorecard(input);
    while (!(supabase.rpc as jest.Mock).mock.calls.length) await Promise.resolve();
    await withRoundPersistenceTransition(
      input.roundId,
      { nine_type: 'full', holes_played: 6 },
      async () => {},
      () => {}
    );
    response.resolve(accepted);
    await expect(upload).rejects.toMatchObject({
      kind: 'context_changed',
      acceptedWrite: { scorecardId: 'local-card', serverRevision: 7 },
    });
    expect(saveScoreEntries).not.toHaveBeenCalled();
  });
  it('keeps a newer disk edit unsynced while its debounce has not queued it', async () => {
    const response = deferred<typeof accepted>();
    const old = card({ roundId: '550e8400-e29b-41d4-a716-446655440008' });
    let disk = old;
    (database.getScorecardsByRound as jest.Mock).mockImplementation(async () => [disk]);
    (supabase.rpc as jest.Mock).mockReturnValueOnce(response.promise);
    const upload = syncScorecard(old, { markSynced: true });
    while (!(supabase.rpc as jest.Mock).mock.calls.length) await Promise.resolve();
    disk = { ...old, scores: { 1: { strokes: 8 } }, totalGross: 8 };
    response.resolve(accepted);
    await expect(upload).rejects.toMatchObject({
      kind: 'context_changed',
      acceptedWrite: { scorecardId: 'local-card', serverRevision: 7 },
    });
    expect(database.markScorecardAsSynced).not.toHaveBeenCalled();
    expect(database.recordAcceptedScorecardWrite).toHaveBeenCalledWith(old.roundId, old.playerId, {
      scorecardId: 'local-card',
      serverRevision: 7,
    });
  });
  it('acknowledges the current queue and unchanged older cache using their own captured baselines', async () => {
    const old = card();
    const fresh = card({ scores: { 1: { strokes: 8 } }, totalGross: 8, totalNet: 8 });
    const queued = { id: 9, revision: 3, type: 'scorecard', action: 'update', data: fresh };
    (database.getPendingSyncByEntityKey as jest.Mock).mockImplementation(async (key) =>
      key.startsWith('scorecard:') ? queued : null
    );
    (database.getScorecardsByRound as jest.Mock).mockResolvedValue([old]);
    await expect(syncScorecard(old, { markSynced: true })).resolves.toMatchObject({
      serverRevision: 7,
    });
    expect((supabase.rpc as jest.Mock).mock.calls[0][1].p_snapshot).toMatchObject({
      scores: { 1: { strokes: 8 } },
      total_gross: 8,
    });
    expect(database.markScorecardAsSynced).toHaveBeenCalledWith(
      'local-card',
      7,
      expect.objectContaining({ expected: old, queued: { id: 9, revision: 3 } })
    );
    expect(old.scores).toEqual({ 1: { strokes: 5, scoredBy: 'owner' } });
    expect(database.recordAcceptedScorecardWrite).not.toHaveBeenCalled();
    expect(database.removePendingSync).not.toHaveBeenCalled();
  });
  it('preserves accepted metadata when fallback transaction refuses a newly created queue', async () => {
    (database.getScorecardsByRound as jest.Mock).mockResolvedValue([card()]);
    (database.markScorecardAsSynced as jest.Mock).mockResolvedValueOnce(false);
    const notified = jest.fn();
    await expect(
      syncScorecard(card(), { markSynced: true, onSynced: notified })
    ).rejects.toMatchObject({
      kind: 'context_changed',
      acceptedWrite: { scorecardId: 'local-card', serverRevision: 7 },
    });
    expect(database.markScorecardAsSynced).toHaveBeenCalledWith(
      'local-card',
      7,
      expect.objectContaining({ expected: card() })
    );
    expect(database.recordAcceptedScorecardWrite).toHaveBeenCalledWith(roundId, card().playerId, {
      scorecardId: 'local-card',
      serverRevision: 7,
    });
    expect(database.removePendingSync).not.toHaveBeenCalled();
    expect(notified).toHaveBeenCalledTimes(1); // revision metadata only, not an acknowledgment
  });
  it('carries expected disk absence into queue-only acknowledgment and preserves accepted revision on refusal', async () => {
    const queued = { id: 9, revision: 3, type: 'scorecard', action: 'update', data: card() };
    (database.getPendingSyncByEntityKey as jest.Mock).mockImplementation(async (key) =>
      key.startsWith('scorecard:') ? queued : null
    );
    (database.removePendingSync as jest.Mock).mockResolvedValueOnce(false);
    await expect(syncScorecard(card(), { markSynced: true })).rejects.toMatchObject({
      kind: 'context_changed',
      acceptedWrite: { scorecardId: 'local-card', serverRevision: 7 },
    });
    expect(database.removePendingSync).toHaveBeenCalledWith(9, 3, expect.any(Function), {
      scorecardId: 'local-card',
      roundId,
      playerId: card().playerId,
    });
    expect(database.markScorecardAsSynced).not.toHaveBeenCalled();
    expect(database.recordAcceptedScorecardWrite).toHaveBeenCalled();
  });
  it('holds the coordinator through trailing entries while another round makes progress', async () => {
    const entry = deferred<void>();
    const started = deferred<void>();
    (saveScoreEntries as jest.Mock).mockImplementationOnce(async () => {
      started.resolve();
      await entry.promise;
    });
    const first = syncScorecard(card({ roundId: '550e8400-e29b-41d4-a716-446655440012' }));
    await started.promise;
    let ended = false;
    const ending = withRoundScoringWrite('550e8400-e29b-41d4-a716-446655440012', async () => {
      ended = true;
    });
    await syncScorecard(card({ roundId: '550e8400-e29b-41d4-a716-446655440013', scores: {} }));
    expect(ended).toBe(false);
    entry.resolve();
    await first;
    await ending;
    expect(ended).toBe(true);
  });
  it('preserves ordinary web uploads with owner/session/content guards and no native recovery', async () => {
    const previous = Platform.OS;
    Object.defineProperty(Platform, 'OS', { value: 'web', configurable: true });
    try {
      mockLive = [card()];
      await expect(syncScorecard(mockLive[0], { markSynced: true })).resolves.toMatchObject({
        serverRevision: 7,
      });
      expect(database.markScorecardAsSynced).toHaveBeenCalled();
      expect(database.getScorecardsByRound).not.toHaveBeenCalled();
      expect(database.recordAcceptedScorecardWrite).not.toHaveBeenCalled();
    } finally {
      Object.defineProperty(Platform, 'OS', { value: previous, configurable: true });
    }
  });
  it('refuses a web acknowledgment notification if live content changes while the local mutation settles', async () => {
    const previous = Platform.OS;
    Object.defineProperty(Platform, 'OS', { value: 'web', configurable: true });
    try {
      mockLive = [card()];
      const notified = jest.fn();
      (database.markScorecardAsSynced as jest.Mock).mockImplementationOnce(async () => {
        mockLive = [card({ scores: { 1: { strokes: 8 } }, totalGross: 8 })];
        return true;
      });
      (database.recordAcceptedScorecardWrite as jest.Mock).mockRejectedValueOnce(
        new Error('Accepted scoring writes require native SQLite')
      );
      await expect(
        syncScorecard(mockLive[0], { markSynced: true, onSynced: notified })
      ).rejects.toMatchObject({
        kind: 'unavailable',
        acceptedWrite: { scorecardId: 'local-card', serverRevision: 7 },
      });
      expect(notified).not.toHaveBeenCalled();
    } finally {
      Object.defineProperty(Platform, 'OS', { value: previous, configurable: true });
    }
  });
  it('refuses a visibly newer web edit and reports unsupported accepted recovery without acknowledgment', async () => {
    const previous = Platform.OS;
    Object.defineProperty(Platform, 'OS', { value: 'web', configurable: true });
    try {
      mockLive = [card()];
      const response = deferred<typeof accepted>();
      (database.recordAcceptedScorecardWrite as jest.Mock).mockRejectedValueOnce(
        new Error('Accepted scoring writes require native SQLite')
      );
      (supabase.rpc as jest.Mock).mockReturnValueOnce(response.promise);
      const upload = syncScorecard(mockLive[0], { markSynced: true });
      while (!(supabase.rpc as jest.Mock).mock.calls.length) await Promise.resolve();
      mockLive = [card({ scores: { 1: { strokes: 8 } }, totalGross: 8 })];
      response.resolve(accepted);
      await expect(upload).rejects.toMatchObject({
        kind: 'unavailable',
        acceptedWrite: { scorecardId: 'local-card', serverRevision: 7 },
      });
      expect(database.markScorecardAsSynced).not.toHaveBeenCalled();
    } finally {
      Object.defineProperty(Platform, 'OS', { value: previous, configurable: true });
    }
  });
  it.each([true, false])(
    'reconstructs stale NULL snapshots after cross-device end (extra keys=%s)',
    async (extraKeys) => {
      const id = extraKeys
        ? '550e8400-e29b-41d4-a716-446655440010'
        : '550e8400-e29b-41d4-a716-446655440011';
      let disk = card({
        roundId: id,
        totalGross: 40,
        totalNet: 99,
        playerHandicap: 18,
        playerGender: 'male',
        teeData: { name: 'White', color: 'white', courseRating: 72, slopeRating: 113 },
        coursePar: 72,
        syncGameType: 'stroke',
        syncHoles: Array.from({ length: 18 }, (_, i) => ({
          number: (i + 1) as 1,
          par: 4,
          strokeIndex: i + 1,
        })),
        scores: Object.fromEntries(
          (extraKeys ? [1, 2, 3, 4, 5, 6, 7] : [1, 2, 3, 4, 5, 6]).map((h) => [h, { strokes: 4 }])
        ),
      });
      (database.getScorecardsByRound as jest.Mock).mockImplementation(async () => [disk]);
      const shape = { nine_type: 'full', holes_played: 6 };
      const builder = {
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        is: jest.fn().mockReturnThis(),
        abortSignal: jest.fn().mockReturnThis(),
        maybeSingle: jest.fn(async () => ({ data: shape, error: null })),
      };
      (supabase.from as jest.Mock).mockReturnValue(builder);
      (database.persistAuthoritativeRoundShape as jest.Mock).mockImplementation(
        async (_id, target, options) => {
          disk = options.rebuild(disk, new Set([1, 2, 3, 4, 5, 6]), target);
          return { priorLocalShapes: new Map() };
        }
      );
      (supabase.rpc as jest.Mock).mockResolvedValueOnce({
        data: null,
        error: { code: '22023', hint: 'round_shape_changed', message: 'stale shape' },
      });
      await expect(syncScorecard(disk)).resolves.toMatchObject({ serverRevision: 7 });
      expect((supabase.rpc as jest.Mock).mock.calls[1][1].p_snapshot).toMatchObject({
        expected_round_shape: shape,
        total_gross: 24,
        total_net: 18,
        daily_handicap_used: 17,
      });
      expect(Object.keys((supabase.rpc as jest.Mock).mock.calls[1][1].p_snapshot.scores)).toEqual([
        '1',
        '2',
        '3',
        '4',
        '5',
        '6',
      ]);
      expect(disk).toMatchObject({ holesPlayed: 6, totalGross: 24 });
    }
  );
  it('waits behind the same-round coordinator and uploads a newly queued payload', async () => {
    const gate = deferred<void>();
    const entered = deferred<void>();
    const held = withRoundScoringWrite(roundId, async () => {
      entered.resolve();
      await gate.promise;
    });
    await entered.promise;
    const upload = syncScorecard(card());
    await Promise.resolve();
    expect(supabase.rpc).not.toHaveBeenCalled();
    (database.getPendingSyncByEntityKey as jest.Mock).mockImplementation(async (key: string) =>
      key.startsWith('scorecard:')
        ? {
            id: 9,
            revision: 3,
            type: 'scorecard',
            action: 'update',
            data: card({ scores: { 1: { strokes: 8 } }, totalGross: 8, serverRevision: 4 }),
          }
        : null
    );
    gate.resolve();
    await held;
    await upload;
    expect((supabase.rpc as jest.Mock).mock.calls[0][1]).toMatchObject({
      p_expected_revision: 4,
      p_snapshot: { scores: { 1: { strokes: 8 } }, total_gross: 8 },
    });
  });
  it('keeps an unsuccessful authorized shape read blocked rather than retrying an unended default', async () => {
    (supabase.rpc as jest.Mock).mockResolvedValueOnce({
      data: null,
      error: { code: '22023', hint: 'round_shape_changed', message: 'shape' },
    });
    const builder = {
      select: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      is: jest.fn().mockReturnThis(),
      abortSignal: jest.fn().mockReturnThis(),
      maybeSingle: jest.fn(async () => ({ data: null, error: { message: 'offline' } })),
    };
    (supabase.from as jest.Mock).mockReturnValue(builder);
    await expect(syncScorecard(card())).rejects.toMatchObject({ kind: 'unavailable' });
    expect(supabase.rpc).toHaveBeenCalledTimes(1);
    expect(database.persistAuthoritativeRoundShape).not.toHaveBeenCalled();
  });
  it('declares back nine and prepares only its played prefix using planned handicap', async () => {
    const back = card({
      syncNineType: 'back9',
      holesPlayed: 3,
      syncHandicapSource: 'profile',
      playerHandicap: 18,
      playerGender: 'male',
      syncGameType: 'stroke',
      teeData: { name: 'White', color: 'white', courseRating: 72, slopeRating: 113 },
      coursePar: 36,
      syncHoles: Array.from({ length: 18 }, (_, i) => ({
        number: (i + 1) as 1,
        par: 4,
        strokeIndex: i + 1,
      })),
      scores: { 10: { strokes: 4 }, 11: { strokes: 4 }, 12: { strokes: 4 }, 13: { strokes: 9 } },
      totalGross: 99,
    });
    await syncScorecard(back);
    expect((supabase.rpc as jest.Mock).mock.calls[0][1].p_snapshot).toMatchObject({
      expected_round_shape: { nine_type: 'back9', holes_played: 3 },
      total_gross: 12,
      total_net: 12,
      daily_handicap_used: 8,
    });
    expect(Object.keys((supabase.rpc as jest.Mock).mock.calls[0][1].p_snapshot.scores)).toEqual([
      '10',
      '11',
      '12',
    ]);
  });
});
