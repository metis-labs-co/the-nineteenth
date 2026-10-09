import { getScorecardsByRound, markScorecardAsSynced } from '@/services/offline/dao/ScorecardDAO';
import { getDb } from '@/services/offline/DatabaseManager';
import {
  captureRoundPersistenceSource,
  withRoundPersistence,
} from '@/services/offline/roundPersistenceBarrier';
jest.mock('@/services/offline/DatabaseManager', () => ({ getDb: jest.fn() }));
const row = {
  id: 'local-id',
  round_id: 'round',
  player_id: 'player',
  player_name: 'Name',
  player_handicap: 0,
  total_gross: 5,
  total_net: 5,
  status: 'in-progress',
  created_at: '2026-10-09T00:00:00.000Z',
  updated_at: '2026-10-09T00:00:00.000Z',
  is_standalone: 0,
  server_revision: 4,
};
const db = {
  getFirstAsync: jest.fn(),
  getAllAsync: jest.fn(),
  runAsync: jest.fn(),
  withExclusiveTransactionAsync: jest.fn(),
};
beforeEach(() => {
  jest.clearAllMocks();
  (getDb as jest.Mock).mockResolvedValue(db);
  db.getFirstAsync.mockImplementation(async (sql: string) =>
    sql.includes('pending_syncs') ? null : row
  );
  db.getAllAsync.mockImplementation(async (sql: string) =>
    sql.includes('hole_scores') ? [{ hole_number: 1, strokes: 5, penalties: 0 }] : [row]
  );
  db.runAsync.mockResolvedValue({ changes: 1 });
  db.withExclusiveTransactionAsync.mockImplementation(async (work) => work(db));
});
it('rejects equal-timestamp retained-hole changes inside native acknowledgment', async () => {
  const [expected] = await getScorecardsByRound('round');
  db.getAllAsync.mockImplementation(async (sql: string) =>
    sql.includes('hole_scores') ? [{ hole_number: 1, strokes: 8, penalties: 0 }] : [row]
  );
  const applied = await withRoundPersistence(captureRoundPersistenceSource('round'), (lease) =>
    markScorecardAsSynced('local-id', 7, { lease, expected })
  );
  expect(applied).toBe(false);
  expect(db.runAsync).not.toHaveBeenCalled();
});
it('acknowledges unchanged parent and holes using monotonic revision and exact identity', async () => {
  const [expected] = await getScorecardsByRound('round');
  const applied = await withRoundPersistence(captureRoundPersistenceSource('round'), (lease) =>
    markScorecardAsSynced('local-id', 7, { lease, expected })
  );
  expect(applied).toBe(true);
  expect(db.withExclusiveTransactionAsync).toHaveBeenCalledTimes(1);
  expect(db.runAsync.mock.calls[0]).toEqual([
    expect.stringContaining('MAX(COALESCE(server_revision, 0), ?)'),
    [7, 'local-id', 'round', 'player'],
  ]);
});
it('leaves both disk and queue unacknowledged when a newer queue version wins the transaction', async () => {
  const [expected] = await getScorecardsByRound('round');
  db.getFirstAsync.mockImplementation(async (sql: string) =>
    sql.includes('pending_syncs') ? null : row
  );
  const applied = await withRoundPersistence(captureRoundPersistenceSource('round'), (lease) =>
    markScorecardAsSynced('local-id', 7, { lease, expected, queued: { id: 9, revision: 3 } })
  );
  expect(applied).toBe(false);
  expect(db.runAsync).not.toHaveBeenCalled();
});
it('acknowledges unchanged card and matching queued version in the same transaction', async () => {
  const [expected] = await getScorecardsByRound('round');
  db.getFirstAsync.mockImplementation(async (sql: string) =>
    sql.includes('pending_syncs') ? { id: 9 } : row
  );
  const applied = await withRoundPersistence(captureRoundPersistenceSource('round'), (lease) =>
    markScorecardAsSynced('local-id', 7, { lease, expected, queued: { id: 9, revision: 3 } })
  );
  expect(applied).toBe(true);
  expect(db.runAsync.mock.calls[1]).toEqual([
    expect.stringContaining('DELETE FROM pending_syncs WHERE id = ? AND revision = ?'),
    [9, 3],
  ]);
});
it('refuses an older server acknowledgment without lowering a newer accepted revision', async () => {
  const [expected] = await getScorecardsByRound('round');
  db.getFirstAsync.mockImplementation(async (sql: string) =>
    sql.includes('pending_syncs') ? null : { ...row, server_revision: 11 }
  );
  await expect(
    withRoundPersistence(captureRoundPersistenceSource('round'), (lease) =>
      markScorecardAsSynced('local-id', 7, { lease, expected })
    )
  ).resolves.toBe(false);
  expect(db.runAsync).not.toHaveBeenCalled();
});
it('refuses a fallback acknowledgment when a queue is created before its transaction', async () => {
  const [expected] = await getScorecardsByRound('round');
  db.getFirstAsync.mockImplementation(async (sql: string) =>
    sql.includes('pending_syncs') ? { id: 12, revision: 1 } : row
  );
  await expect(
    withRoundPersistence(captureRoundPersistenceSource('round'), (lease) =>
      markScorecardAsSynced('local-id', 7, { lease, expected })
    )
  ).resolves.toBe(false);
  expect(db.runAsync).not.toHaveBeenCalled();
});
it('rolls back disk acknowledgment when ownership changes while the mutation settles', async () => {
  const [expected] = await getScorecardsByRound('round');
  let current = true;
  db.runAsync.mockImplementationOnce(async () => {
    current = false;
    return { changes: 1 };
  });
  await expect(
    withRoundPersistence(captureRoundPersistenceSource('round'), (lease) =>
      markScorecardAsSynced('local-id', 7, { lease, expected, isCurrent: () => current })
    )
  ).rejects.toMatchObject({ kind: 'context_changed' });
  expect(db.withExclusiveTransactionAsync).toHaveBeenCalledTimes(1);
});
