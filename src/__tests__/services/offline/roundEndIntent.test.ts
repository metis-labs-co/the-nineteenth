/** Native SQLite collaborator tests only; no runtime SQL. */
import { persistRoundEarlyEnd } from '@/services/offline/dao/ScorecardDAO';
import { queueRoundEarlyEndIntent } from '@/services/offline/dao/SyncQueueDAO';
import { getDb } from '@/services/offline/DatabaseManager';
jest.mock('@/services/offline/DatabaseManager', () => ({ getDb: jest.fn() }));
const txn = { runAsync: jest.fn(), getFirstAsync: jest.fn() };
const database = { withExclusiveTransactionAsync: jest.fn() };
const end = () =>
  persistRoundEarlyEnd('r', 6, 'full', [1, 2, 3, 4, 5, 6], [{ scorecardId: 'c', teeData: null }], {
    intent: { userId: 'owner' },
  });
beforeEach(() => {
  jest.clearAllMocks();
  (getDb as jest.Mock).mockResolvedValue(database);
  txn.getFirstAsync.mockResolvedValue(null);
  txn.runAsync.mockResolvedValue({ changes: 1 });
  database.withExclusiveTransactionAsync.mockImplementation(async (work) => work(txn));
});
it('keeps marker/removals and owned intent on the same exclusive connection', async () => {
  await end();
  expect(txn.runAsync).toHaveBeenCalledWith(
    expect.stringContaining('INSERT INTO pending_syncs'),
    expect.arrayContaining([
      JSON.stringify({ id: 'r', action: 'end_early', holesPlayed: 6, userId: 'owner' }),
    ])
  );
  expect(database.withExclusiveTransactionAsync).toHaveBeenCalledTimes(1);
});
it('keeps a same-owner/same-N failed row completely unchanged', async () => {
  txn.getFirstAsync.mockResolvedValue({
    type: 'round',
    action: 'update',
    data: JSON.stringify({ id: 'r', action: 'end_early', holesPlayed: 6, userId: 'owner' }),
    status: 'failed',
    revision: 7,
  });
  await queueRoundEarlyEndIntent('r', 6, { userId: 'owner' });
  expect(txn.runAsync).not.toHaveBeenCalled();
});
it.each([
  { id: 'r', action: 'end_early', holesPlayed: 6, userId: 'other' },
  { id: 'r', action: 'end_early', holesPlayed: 8, userId: 'owner' },
  { id: 'r', action: 'end_early', holesPlayed: 6 },
  { id: 'r', action: 'finalize', holesPlayed: 6, userId: 'owner' },
])('refuses incompatible existing intent %j inside the transaction', async (data) => {
  txn.getFirstAsync.mockResolvedValue({
    type: 'round',
    action: 'update',
    data: JSON.stringify(data),
  });
  await expect(end()).rejects.toThrow(/intent|collision/i);
});
it.each(['marker', 'intent'])('rolls back both parts when the %s write fails', async (failure) => {
  const durable: string[] = [];
  database.withExclusiveTransactionAsync.mockImplementation(async (work) => {
    const pending: string[] = [];
    txn.runAsync.mockImplementation(async (sql: string) => {
      if (sql.includes(failure === 'marker' ? 'UPDATE scorecards' : 'INSERT INTO pending_syncs'))
        throw new Error(failure);
      pending.push(sql);
      return { changes: 1 };
    });
    await work(txn);
    durable.push(...pending);
  });
  await expect(end()).rejects.toThrow(failure);
  expect(durable).toEqual([]);
});
it('refuses an explicitly empty owner', async () => {
  await expect(queueRoundEarlyEndIntent('r', 6, { userId: '' })).rejects.toThrow(/owner/i);
  expect(database.withExclusiveTransactionAsync).not.toHaveBeenCalled();
});

it.each(['captured marker', 'durable marker'])(
  'refuses ownership reinsertion after intent disappearance with a %s',
  async (marker) => {
    txn.getFirstAsync.mockImplementation(async (sql: string) =>
      sql.includes('scorecards') && marker === 'durable marker'
        ? { holes_played: 6, sync_nine_type: 'full' }
        : null
    );
    await expect(
      persistRoundEarlyEnd(
        'r',
        6,
        'full',
        [1, 2, 3, 4, 5, 6],
        [{ scorecardId: 'c', teeData: null }],
        { intent: { userId: 'owner' }, requireExistingIntent: marker === 'captured marker' }
      )
    ).rejects.toThrow(/owned.*intent|existing.*intent/i);
    expect(txn.runAsync).not.toHaveBeenCalled();
  }
);
