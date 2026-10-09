/** Passive DAO collaborator tests; all SQL is inspected, never executed. */
import { persistAuthoritativeRoundShape } from '@/services/offline/dao/ScorecardDAO';
import { getDb } from '@/services/offline/DatabaseManager';
import { getHoleScores } from '@/services/offline/dao/HoleScoreDAO';
import type { Hole, Scorecard } from '@/types';
import type { ScorecardRow, PendingSyncRow } from '@/services/offline/types';
jest.mock('@/services/offline/DatabaseManager', () => ({ getDb: jest.fn() }));
jest.mock('@/services/offline/dao/HoleScoreDAO', () => ({ getHoleScores: jest.fn() }));
const row: ScorecardRow = {
  id: 'c',
  round_id: 'r',
  player_id: 'p',
  player_name: 'Historical',
  player_handicap: 12,
  total_gross: 44,
  total_net: 30,
  total_points: 10,
  status: 'confirmed',
  submitted_at: '2026-10-01',
  submitted_by: 'owner',
  created_at: '2026-09-01',
  updated_at: '2026-10-01',
  is_synced: 1,
  is_standalone: 0,
  server_revision: 8,
  tee_data: null,
  course_par: 72,
  player_gender: 'female',
  player_handicap_used: 10,
  sync_nine_type: 'full',
  sync_game_type: 'stroke',
  holes_played: 6,
};
const queuedCard: Scorecard = {
  id: 'c',
  roundId: 'r',
  playerId: 'p',
  scores: { 1: { strokes: 3 }, 6: { strokes: 4 }, 7: { strokes: 5 } },
  totalGross: 12,
  totalNet: 12,
  status: 'completed',
  submittedAt: new Date('2026-10-02'),
  createdAt: new Date('2026-09-01'),
  updatedAt: new Date('2026-10-02'),
  holesPlayed: null,
  syncNineType: 'full',
  serverRevision: 9,
};
const queue = (data: Scorecard = queuedCard, action = 'update'): PendingSyncRow => ({
  id: 4,
  type: 'scorecard',
  action,
  data: JSON.stringify(data),
  timestamp: '2026-10-02',
  retry_count: 5,
  entity_key: `scorecard:r:${data.playerId}`,
  revision: 7,
  status: 'failed',
  last_error: 'old error',
  last_attempt_at: null,
});
const txn = { getFirstAsync: jest.fn(), getAllAsync: jest.fn(), runAsync: jest.fn() };
const database = { withExclusiveTransactionAsync: jest.fn() };
const rebuild = jest.fn((card: Scorecard, keep: ReadonlySet<number>): Scorecard => {
  const scores = Object.fromEntries(
    Object.entries(card.scores).filter(([h]) => keep.has(Number(h)))
  );
  return {
    ...card,
    scores,
    totalGross: Object.values(scores).reduce((sum, s) => sum + ('strokes' in s ? s.strokes : 0), 0),
    totalNet: 2,
    total_par_score: 1,
  };
});
const adopt = (n = 8, nine_type: 'full' | 'back9' = 'full') =>
  persistAuthoritativeRoundShape(
    'r',
    { nine_type, holes_played: n },
    { ownerId: 'owner', rebuild, acceptedWrite: { scorecardId: 'c', serverRevision: 10 } }
  );
beforeEach(() => {
  jest.clearAllMocks();
  (getDb as jest.Mock).mockResolvedValue(database);
  (getHoleScores as jest.Mock).mockResolvedValue({
    1: { strokes: 4 },
    6: { strokes: 4 },
    7: { strokes: 5 },
  });
  txn.getFirstAsync.mockResolvedValue(null);
  txn.getAllAsync.mockImplementation(async (sql: string) =>
    sql.includes('FROM scorecards') ? [row] : [queue()]
  );
  txn.runAsync.mockResolvedValue({ changes: 1 });
  database.withExclusiveTransactionAsync.mockImplementation(async (work) => work(txn));
});
it('repairs a closed confirmed card and failed queue independently, never restoring discarded 7-8 on N6->N8', async () => {
  const result = await adopt();
  expect(result.priorLocalShapes.get('c')).toEqual({ nine_type: 'full', holes_played: 6 });
  expect(result.cards[0]).toMatchObject({
    status: 'confirmed',
    submittedBy: 'owner',
    holesPlayed: 8,
    serverRevision: 10,
    playerHandicap: 10,
    scores: { 1: { strokes: 4 }, 6: { strokes: 4 } },
    totalGross: 8,
  });
  expect(result.cards[0].scores[7]).toBeUndefined();
  expect(getHoleScores).toHaveBeenCalledWith('c', txn);
  const [sql, args] = txn.runAsync.mock.calls.find(([sql]) =>
    sql.includes('UPDATE pending_syncs')
  )!;
  const payload = JSON.parse(args[0]);
  expect(payload).toMatchObject({
    status: 'completed',
    serverRevision: 10,
    holesPlayed: 8,
    scores: { 1: { strokes: 3 }, 6: { strokes: 4 } },
    totalGross: 7,
  });
  expect(payload.scores[7]).toBeUndefined();
  expect(sql).toContain('revision = revision + 1');
  expect(sql).toContain('AND revision = ?');
  expect(sql).not.toContain('status =');
  expect(txn.runAsync.mock.calls.some(([sql]) => sql.includes('INSERT'))).toBe(false);
});
it('honors the common prior intersection across disagreeing durable cards', async () => {
  txn.getAllAsync.mockImplementation(async (sql: string) =>
    sql.includes('FROM scorecards')
      ? [row, { ...row, id: 'c2', player_id: 'p2', holes_played: 4 }]
      : [queue()]
  );
  const result = await adopt();
  expect(result.cards[0].scores[6]).toBeUndefined();
});
it.each([3, 8])(
  'supports authoritative N=%s while retaining only source and prior scores',
  async (n) => {
    const { cards } = await adopt(n);
    expect(cards[0].holesPlayed).toBe(n);
    expect(cards[0].scores[7]).toBeUndefined();
    expect(cards[0].scores[6] !== undefined).toBe(n >= 6);
  }
);
it('handles back-nine intersection by actual hole numbers', async () => {
  txn.getAllAsync.mockImplementation(async (sql: string) =>
    sql.includes('FROM scorecards') ? [{ ...row, sync_nine_type: 'back9' }] : []
  );
  (getHoleScores as jest.Mock).mockResolvedValue({
    10: { strokes: 4 },
    15: { strokes: 5 },
    16: { strokes: 3 },
  });
  const { cards } = await adopt(8, 'back9');
  expect(Object.keys(cards[0].scores)).toEqual(['10', '15']);
});
it('repairs queue-only snapshots and skips delete operations without creating cards', async () => {
  txn.getAllAsync.mockImplementation(async (sql: string) =>
    sql.includes('FROM scorecards')
      ? []
      : [queue(), queue({ ...queuedCard, playerId: 'deleted', id: 'd' }, 'delete')]
  );
  const { cards } = await adopt(3);
  expect(cards).toEqual([]);
  expect(txn.runAsync).toHaveBeenCalledTimes(1);
  expect(txn.runAsync.mock.calls[0][0]).toContain('UPDATE pending_syncs');
});
it.each(['foreign', 'malformed', 'context', 'CAS'])(
  'blocks and rolls back repair on %s',
  async (failure) => {
    if (failure === 'foreign')
      txn.getFirstAsync.mockResolvedValue({
        type: 'round',
        action: 'update',
        data: JSON.stringify({ id: 'r', action: 'end_early', holesPlayed: 6, userId: 'other' }),
      });
    if (failure === 'malformed')
      txn.getAllAsync.mockImplementation(async (sql: string) =>
        sql.includes('FROM scorecards') ? [row] : [{ ...queue(), data: '{"roundId":"r"}' }]
      );
    if (failure === 'context')
      rebuild.mockImplementationOnce(() => {
        throw new Error('missing context');
      });
    if (failure === 'CAS')
      txn.runAsync.mockImplementation(async (sql: string) => ({
        changes: sql.includes('UPDATE pending_syncs') ? 0 : 1,
      }));
    const committed: string[] = [];
    database.withExclusiveTransactionAsync.mockImplementation(async (work) => {
      await work(txn);
      committed.push('commit');
    });
    await expect(adopt()).rejects.toThrow();
    expect(committed).toEqual([]);
  }
);

it('persists rebuilt sync context without altering frozen handicap or submission fields', async () => {
  const holes: Hole[] = [{ number: 1, par: 4, strokeIndex: 1 }];
  rebuild.mockImplementationOnce((card) => ({
    ...card,
    totalGross: 4,
    totalNet: 2,
    syncHoles: holes,
    syncGameType: 'stableford',
    playerHandicap: 99,
    status: 'in-progress',
  }));
  const { cards } = await adopt();
  expect(cards[0]).toMatchObject({
    syncGameType: 'stableford',
    syncHoles: holes,
    playerHandicap: 10,
    status: 'confirmed',
  });
  const [sql] = txn.runAsync.mock.calls.find(([sql]) => sql.includes('UPDATE scorecards'))!;
  expect(sql).toContain('sync_holes = ?');
  expect(sql).toContain('sync_game_type = ?');
  expect(sql).toContain('total_points = ?');
  expect(sql).not.toContain('submitted_at =');
  expect(sql).toContain('player_handicap_used =');
});

it.each([false, true])(
  'refuses a cached local card ID reused by another queued player (acceptedWrite=%s)',
  async (withAcceptedWrite) => {
    txn.getAllAsync.mockImplementation(async (sql: string) =>
      sql.includes('FROM scorecards')
        ? [row]
        : [queue({ ...queuedCard, playerId: 'p2', serverRevision: 99 })]
    );
    await expect(
      persistAuthoritativeRoundShape('r', { nine_type: 'full', holes_played: 8 }, {
        ownerId: 'owner',
        rebuild,
        ...(withAcceptedWrite && { acceptedWrite: { scorecardId: 'c', serverRevision: 10 } }),
      })
    ).rejects.toThrow(/identity|malformed/i);
    expect(txn.runAsync).not.toHaveBeenCalled();
    expect(rebuild).not.toHaveBeenCalled();
  }
);

it.each([false, true])(
  'refuses a local card ID shared by queue-only players (acceptedWrite=%s)',
  async (withAcceptedWrite) => {
    txn.getAllAsync.mockImplementation(async (sql: string) =>
      sql.includes('FROM scorecards')
        ? []
        : [queue(), { ...queue({ ...queuedCard, playerId: 'p2', serverRevision: 99 }), id: 5 }]
    );
    await expect(
      persistAuthoritativeRoundShape('r', { nine_type: 'full', holes_played: 8 }, {
        ownerId: 'owner',
        rebuild,
        ...(withAcceptedWrite && { acceptedWrite: { scorecardId: 'c', serverRevision: 10 } }),
      })
    ).rejects.toThrow(/identity|malformed/i);
    expect(txn.runAsync).not.toHaveBeenCalled();
    expect(rebuild).not.toHaveBeenCalled();
  }
);

it('refuses a queued local ID that disagrees with the cached card for the same player', async () => {
  txn.getAllAsync.mockImplementation(async (sql: string) =>
    sql.includes('FROM scorecards') ? [row] : [queue({ ...queuedCard, id: 'different-local-id' })]
  );
  await expect(adopt()).rejects.toThrow(/identity|malformed/i);
  expect(txn.runAsync).not.toHaveBeenCalled();
  expect(rebuild).not.toHaveBeenCalled();
});


it('passes ORIGINAL frozen shape into callback with target separate', async () => {
  await adopt();
  expect(rebuild).toHaveBeenCalledWith(expect.objectContaining({ holesPlayed: 6, syncNineType: 'full' }), expect.any(Set), { nine_type: 'full', holes_played: 8 });
});
it.each(['cached', 'queue', 'intent'])('NULL refuses transaction-current %s final end before writes', async (source) => {
  txn.getAllAsync.mockImplementation(async (sql: string) => sql.includes('FROM scorecards')
    ? source === 'cached' ? [row] : []
    : source === 'queue' ? [queue({ ...queuedCard, holesPlayed: 3 })] : []);
  if (source === 'intent') txn.getFirstAsync.mockResolvedValue({ type: 'round', action: 'update', data: JSON.stringify({ id: 'r', action: 'end_early', holesPlayed: 6, userId: 'owner' }) });
  await expect(persistAuthoritativeRoundShape('r', { nine_type: 'front9', holes_played: null }, { ownerId: 'owner', rebuild })).rejects.toMatchObject({ kind: 'local_end_pending' });
  expect(txn.runAsync).not.toHaveBeenCalled();
});
it('allows NULL nine correction from unended sources, persists proven par/HI/gender/source', async () => {
  txn.getAllAsync.mockImplementation(async (sql: string) => sql.includes('FROM scorecards')
    ? [{ ...row, holes_played: null, player_handicap_used: null, player_gender: null, sync_holes: JSON.stringify([{ number: 1, par: 4, strokeIndex: 1 }]) }] : []);
  rebuild.mockImplementationOnce((source) => ({ ...source, coursePar: 36, playerHandicap: 0, playerGender: 'female', syncHandicapSource: 'none', totalGross: 4, totalNet: 4 }));
  const result = await persistAuthoritativeRoundShape('r', { nine_type: 'front9', holes_played: null }, { ownerId: 'owner', rebuild });
  expect(result.cards[0]).toMatchObject({ coursePar: 36, playerHandicap: 0, playerGender: null, syncHandicapSource: 'none', holesPlayed: null });
  const [sql, args] = txn.runAsync.mock.calls.find(([sql]) => sql.includes('UPDATE scorecards'))!;
  expect(sql).toContain('course_par = ?'); expect(sql).toContain('player_handicap_used = ?');
  expect(sql).toContain('player_gender = ?'); expect(sql).toContain('sync_handicap_source = ?');
  expect(args).toContain('none');
});
