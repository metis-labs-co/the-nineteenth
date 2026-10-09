import {
  getPendingSyncByEntityKey,
  decodePendingSyncRow,
  addPendingSync,
  replacePendingSyncData,
  recordAcceptedScorecardWrite,
  removePendingSync,
} from '@/services/offline/dao/SyncQueueDAO';
import { getDb } from '@/services/offline/DatabaseManager';
jest.mock('@/services/offline/DatabaseManager', () => ({ getDb: jest.fn() }));
const txn = { runAsync: jest.fn() };
const database = {
  runAsync: jest.fn(),
  getFirstAsync: jest.fn(),
  withExclusiveTransactionAsync: jest.fn(),
};
beforeEach(() => {
  jest.clearAllMocks();
  (getDb as jest.Mock).mockResolvedValue(database);
  database.withExclusiveTransactionAsync.mockImplementation(async (work) => work(txn));
  txn.runAsync.mockResolvedValue({ changes: 1 });
});
it('includes failed rows and refuses malformed JSON rather than hiding it', async () => {
  database.getFirstAsync.mockResolvedValueOnce({
    id: 4,
    status: 'failed',
    data: '{"scores":{}}',
    timestamp: '2026-10-01',
    revision: 3,
  });
  await expect(getPendingSyncByEntityKey('key')).resolves.toMatchObject({
    status: 'failed',
    revision: 3,
  });
  expect(database.getFirstAsync.mock.calls[0][0]).not.toContain("status = 'pending'");
  database.getFirstAsync.mockResolvedValueOnce({ data: 'malformed' });
  await expect(getPendingSyncByEntityKey('key')).rejects.toThrow();
});
it('CAS replacement raises revision and makes an old acknowledgment miss', async () => {
  let revision = 3;
  database.runAsync.mockImplementation(async (sql, args) => {
    const expected = args[args.length - 1];
    if (expected !== revision) return { changes: 0 };
    if (sql.includes('UPDATE')) revision++;
    return { changes: 1 };
  });
  await expect(replacePendingSyncData(4, 3, { scores: { 1: { strokes: 3 } } })).resolves.toBe(4);
  await expect(removePendingSync(4, 3)).resolves.toBe(false);
  await expect(replacePendingSyncData(4, 3, {})).resolves.toBeNull();
  expect(database.runAsync.mock.calls[0][0]).toContain('revision = revision + 1');
  expect(database.runAsync.mock.calls[0][0]).not.toContain('status =');
});
it('records accepted revision in one exclusive transaction without replacing newer scores or reviving failure', async () => {
  await recordAcceptedScorecardWrite('r', 'p', { scorecardId: 'c', serverRevision: 9 });
  expect(database.withExclusiveTransactionAsync).toHaveBeenCalledTimes(1);
  expect(database.runAsync).not.toHaveBeenCalled();
  const [cardSQL, queueSQL] = txn.runAsync.mock.calls.map(([sql]) => sql);
  expect(cardSQL).toContain('MAX(COALESCE(server_revision, 0), ?)');
  expect(cardSQL).toContain('is_synced = 0');
  expect(queueSQL).toContain("json_set(data, '$.serverRevision', ?)");
  expect(queueSQL).toContain('revision = revision + 1');
  expect(queueSQL).not.toContain("status = 'pending'");
});
it('propagates a queue revision failure so the card write rolls back too', async () => {
  txn.runAsync.mockResolvedValueOnce({ changes: 1 }).mockRejectedValueOnce(new Error('disk full'));
  await expect(
    recordAcceptedScorecardWrite('r', 'p', { scorecardId: 'c', serverRevision: 9 })
  ).rejects.toThrow('disk full');
});

it('uses the local card identity even when the accepted server record has a different UUID', async () => {
  const localId = 'scorecard-r-p';
  const serverRecord = { id: '550e8400-e29b-41d4-a716-446655440000', serverRevision: 11 };
  await recordAcceptedScorecardWrite('r', 'p', {
    scorecardId: localId,
    serverRevision: serverRecord.serverRevision,
  });
  expect(txn.runAsync.mock.calls[0][1]).toEqual([11, localId, 'r', 'p']);
  expect(txn.runAsync.mock.calls[1][1]).toEqual([11, 'scorecard:r:p', localId, 'r', 'p', 11]);
});


it('preserves queue source metadata and rejects explicit invalid enums at decode', () => {
  const row = { id: 4, type: 'scorecard', action: 'update', data: JSON.stringify({ syncHandicapSource: 'none' }), timestamp: '2026-10-01', revision: 4, status: 'failed' as const, retry_count: 5, entity_key: 'scorecard:r:p', last_error: 'old', last_attempt_at: null };
  expect(decodePendingSyncRow(row).data.syncHandicapSource).toBe('none');
  expect(() => decodePendingSyncRow({ ...row, data: JSON.stringify({ syncHandicapSource: 'bad' }) })).toThrow(/handicap source/i);
});


it('queue admission preserves a recorded source when the incoming payload omits it', async () => {
  await addPendingSync({ type: 'scorecard', action: 'update', data: { id: 'c', roundId: 'r', playerId: 'p', scores: {} }, timestamp: new Date(), retryCount: 0 });
  const [sql] = database.runAsync.mock.calls[0];
  expect(sql).toContain("json_set(excluded.data, '$.syncHandicapSource'");
  expect(sql).toContain("json_extract(excluded.data, '$.syncHandicapSource') IS NULL");
});
