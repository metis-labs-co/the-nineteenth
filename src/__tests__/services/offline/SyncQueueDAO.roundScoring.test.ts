import {
  getPendingSyncByEntityKey,
  decodePendingSyncRow,
  addPendingSync,
  replacePendingSyncData,
  recordAcceptedScorecardWrite,
  removePendingSync,
  incrementSyncRetryCount,
  markPendingSyncFailed,
} from '@/services/offline/dao/SyncQueueDAO';
import { getDb } from '@/services/offline/DatabaseManager';
jest.mock('@/services/offline/DatabaseManager', () => ({ getDb: jest.fn() }));
const txn = { runAsync: jest.fn(), getFirstAsync: jest.fn() };
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
  txn.getFirstAsync.mockResolvedValue(null);
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
it.each(['pending', 'failed'])(
  'checks a same-revision %s queue row during native queue-only acknowledgment',
  async (status) => {
    const raw = {
      id: 9,
      revision: 3,
      type: 'scorecard',
      action: 'update',
      entity_key: 'scorecard:r:p',
      data: JSON.stringify({ id: 'c', roundId: 'r', playerId: 'p', scores: {} }),
      timestamp: '2026-10-09T00:00:00.000Z',
      retry_count: 0,
      status: 'pending',
      last_error: null,
      last_attempt_at: null,
    };
    database.getFirstAsync.mockResolvedValueOnce(raw);
    const expectedRecovery = (await getPendingSyncByEntityKey(raw.entity_key))!;
    const failed = status === 'failed' ? { ...raw, status, last_error: 'new failure' } : raw;
    txn.getFirstAsync.mockImplementation(async (sql: string) =>
      sql.includes('pending_syncs') ? failed : null
    );
    const absence = { scorecardId: 'c', roundId: 'r', playerId: 'p', expectedRecovery };
    await expect(removePendingSync(9, 3, () => true, absence)).resolves.toBe(status === 'pending');
    expect(txn.runAsync).toHaveBeenCalledTimes(status === 'pending' ? 1 : 0);
  }
);
it.each([
  ['retry', false],
  ['retry', true],
  ['failure', false],
  ['failure', true],
] as const)(
  'checks recovery fields during guarded %s acquisition (changed=%s)',
  async (action, changed) => {
    let raw = {
      id: 9,
      revision: 3,
      type: 'scorecard',
      action: 'update',
      entity_key: 'scorecard:r:p',
      data: JSON.stringify({ id: 'c', roundId: 'r', playerId: 'p', scores: {} }),
      timestamp: '2026-10-09T00:00:00.000Z',
      retry_count: 0,
      status: 'pending',
      last_error: null as string | null,
      last_attempt_at: null as string | null,
    };
    database.getFirstAsync.mockResolvedValueOnce(raw);
    const expectedRecovery = (await getPendingSyncByEntityKey(raw.entity_key))!;
    txn.getFirstAsync.mockImplementation(async () => raw);
    let entered!: () => void;
    let release!: () => void;
    const waiting = new Promise<void>((resolve) => {
      entered = resolve;
    });
    const gate = new Promise<void>((resolve) => {
      release = resolve;
    });
    (getDb as jest.Mock).mockImplementationOnce(async () => {
      entered();
      await gate;
      return database;
    });
    database.runAsync.mockResolvedValue({ changes: 1 });
    const options = { expectedRecovery, isCurrent: () => true };
    const recovering =
      action === 'retry'
        ? incrementSyncRetryCount(9, 3, 'old error', options)
        : markPendingSyncFailed(9, 3, 'old error', options);
    await waiting;
    if (changed)
      raw = {
        ...raw,
        status: 'failed',
        retry_count: 2,
        last_error: 'new failure',
        last_attempt_at: '2026-10-09T01:00:00.000Z',
      };
    release();
    await expect(recovering).resolves.toBe(!changed);
    expect(database.runAsync).not.toHaveBeenCalled();
    expect(txn.runAsync).toHaveBeenCalledTimes(changed ? 0 : 1);
  }
);

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

it('rolls back a queue-only acknowledgment when captured ownership changes while SQL settles', async () => {
  let current = true;
  txn.runAsync.mockImplementationOnce(async () => { current = false; return { changes: 1 }; });
  await expect(removePendingSync(4, 3, () => current)).rejects.toThrow(/acknowledgment changed/);
  expect(database.withExclusiveTransactionAsync).toHaveBeenCalledTimes(1);
  expect(database.runAsync).not.toHaveBeenCalled();
});
it('refuses queue-only acknowledgment when a disk card is created before deletion', async () => {
  txn.getFirstAsync.mockResolvedValue({ id: 'local-card' });
  await expect(removePendingSync(4, 3, () => true, { scorecardId: 'local-card', roundId: 'r', playerId: 'p' })).resolves.toBe(false);
  expect(txn.runAsync).not.toHaveBeenCalled();
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
it('rolls back conditional failure retention if ownership changes while its insert settles', async () => {
  let current = true;
  let retained: unknown = null;
  const write = async (_sql: string, args: unknown[]) => {
    retained = args[2];
    current = false;
    return { changes: 1 };
  };
  database.runAsync.mockImplementation(write);
  txn.runAsync.mockImplementation(write);
  database.withExclusiveTransactionAsync.mockImplementation(async (work) => {
    const previous = retained;
    try {
      await work(txn);
    } catch (error) {
      retained = previous;
      throw error;
    }
  });
  await expect(
    addPendingSync(
      {
        type: 'scorecard',
        action: 'update',
        data: { id: 'c', roundId: 'r', playerId: 'p', scores: {} },
        timestamp: new Date(0),
        retryCount: 3,
        status: 'failed',
        lastError: 'invalid',
      },
      { ifAbsent: true, isCurrent: () => current }
    )
  ).rejects.toMatchObject({ kind: 'context_changed' });
  expect(retained).toBeNull();
  expect(database.withExclusiveTransactionAsync).toHaveBeenCalledTimes(1);
});

it.each(['unchanged', 'payload', 'entity', 'recovery', 'owner'])(
  'acknowledges an owned round intent only when its native CAS is %s',
  async (change) => {
    let current = true;
    const raw = {
      id: 41,
      revision: 2,
      type: 'round',
      action: 'update',
      entity_key: 'round:r:end_early',
      data: JSON.stringify({ id: 'r', action: 'end_early', holesPlayed: 6, userId: 'owner' }),
      timestamp: '2026-10-09T00:00:00.000Z',
      retry_count: 0,
      status: 'pending' as const,
      last_error: null,
      last_attempt_at: null,
    };
    database.getFirstAsync.mockResolvedValue(raw);
    const expectedRecovery = (await getPendingSyncByEntityKey(raw.entity_key))!;
    txn.getFirstAsync.mockImplementation(async () => {
      if (change === 'owner') current = false;
      return {
        ...raw,
        ...(change === 'payload'
          ? { data: JSON.stringify({ ...expectedRecovery.data, holesPlayed: 4 }) }
          : {}),
        ...(change === 'entity' ? { entity_key: 'round:other:end_early' } : {}),
        ...(change === 'recovery' ? { status: 'failed', last_error: 'new' } : {}),
      };
    });
    // New queue-only guard; keep existing scorecard-absence callers unchanged.
    await expect(
      removePendingSync(41, 2, () => current, undefined, { expectedRecovery })
    ).resolves.toBe(change === 'unchanged');
    expect(txn.runAsync).toHaveBeenCalledTimes(change === 'unchanged' ? 1 : 0);
  }
);

it.each(['web', 'missing guard', 'mixed guards', 'invalid revision'])(
  'refuses new queue-only guarded acknowledgment with %s before deletion',
  async (reason) => {
    const { Platform } = jest.requireActual('react-native');
    const previous = Platform.OS;
    const expectedRecovery = {
      id: 41,
      revision: 2,
      type: 'round',
      action: 'update',
      entityKey: 'round:r:end_early',
      data: { id: 'r', action: 'end_early', holesPlayed: 6, userId: 'owner' },
      timestamp: new Date(0),
      retryCount: 0,
    } as const;
    if (reason === 'web') Platform.OS = 'web';
    try {
      await expect(
        removePendingSync(
          41,
          reason === 'invalid revision' ? undefined : 2,
          reason === 'missing guard' ? undefined : () => true,
          reason === 'mixed guards' ? { scorecardId: 'c', roundId: 'r', playerId: 'p' } : undefined,
          { expectedRecovery }
        )
      ).resolves.toBe(false);
      expect(database.runAsync).not.toHaveBeenCalled();
      expect(txn.runAsync).not.toHaveBeenCalled();
    } finally {
      Platform.OS = previous;
    }
  }
);
it('rolls back owned round acknowledgment after owner changes during deletion settlement', async () => {
  let current = true;
  let deleted = false;
  const raw = {
    id: 41,
    revision: 2,
    type: 'round',
    action: 'update',
    entity_key: 'round:r:end_early',
    data: JSON.stringify({ id: 'r', action: 'end_early', holesPlayed: 6, userId: 'owner' }),
    timestamp: '2026-10-09T00:00:00.000Z',
    retry_count: 0,
    status: 'pending' as const,
    last_error: null,
    last_attempt_at: null,
  };
  database.getFirstAsync.mockResolvedValue(raw);
  const expectedRecovery = (await getPendingSyncByEntityKey(raw.entity_key))!;
  txn.getFirstAsync.mockResolvedValue(raw);
  txn.runAsync.mockImplementation(async () => {
    deleted = true;
    current = false;
    return { changes: 1 };
  });
  database.withExclusiveTransactionAsync.mockImplementation(async (work) => {
    try {
      await work(txn);
    } catch (error) {
      deleted = false;
      throw error;
    }
  });
  await expect(
    removePendingSync(41, 2, () => current, undefined, { expectedRecovery })
  ).rejects.toThrow(/acknowledgment changed/);
  expect(deleted).toBe(false);
});

it('keeps malformed canonical end JSON present in pending/failed lists and keyed reads with raw proof', async () => {
  const { getPendingSyncs, getFailedSyncs } = jest.requireActual(
    '@/services/offline/dao/SyncQueueDAO'
  );
  const raw = {
    id: 51,
    revision: 3,
    type: 'round',
    action: 'update',
    entity_key: 'round:r:end_early',
    data: '{broken',
    timestamp: '2026-10-09T00:00:00.000Z',
    retry_count: 2,
    status: 'pending',
    last_error: null,
    last_attempt_at: null,
  };
  const all = jest.fn(async () => [raw]);
  (getDb as jest.Mock).mockResolvedValue({ ...database, getAllAsync: all });
  database.getFirstAsync.mockResolvedValue(raw);
  for (const read of [
    getPendingSyncs(),
    getFailedSyncs(),
    getPendingSyncByEntityKey(raw.entity_key),
  ]) {
    const result = await read;
    const row = Array.isArray(result) ? result[0] : result;
    expect(row).toMatchObject({
      id: 51,
      revision: 3,
      retryCount: 2,
      entityKey: 'round:r:end_early',
      endIntentRead: { rawData: '{broken', decode: 'invalid_json' },
    });
  }
});

it.each(['unchanged', 'repaired', 'other malformed', 'entity', 'recovery'])(
  'retains exact malformed end snapshot only when CURRENT raw proof is %s',
  async (change) => {
    const raw = {
      id: 51,
      revision: 3,
      type: 'round',
      action: 'update',
      entity_key: 'round:r:end_early',
      data: '{broken',
      timestamp: '2026-10-09T00:00:00.000Z',
      retry_count: 2,
      status: 'pending' as const,
      last_error: null,
      last_attempt_at: null,
    };
    database.getFirstAsync.mockResolvedValue(raw);
    const expectedRecovery = (await getPendingSyncByEntityKey(raw.entity_key))!;
    txn.getFirstAsync.mockResolvedValue({
      ...raw,
      ...(change === 'repaired'
        ? {
            data: JSON.stringify({ id: 'r', action: 'end_early', holesPlayed: 6, userId: 'owner' }),
          }
        : {}),
      ...(change === 'other malformed' ? { data: '{different' } : {}),
      ...(change === 'entity' ? { entity_key: 'round:other:end_early' } : {}),
      ...(change === 'recovery' ? { retry_count: 0 } : {}),
    });
    await expect(
      markPendingSyncFailed(51, 3, 'Malformed end intent', {
        expectedRecovery,
        isCurrent: () => true,
        snapshotMode: 'end_intent',
      })
    ).resolves.toBe(change === 'unchanged');
    expect(txn.runAsync).toHaveBeenCalledTimes(change === 'unchanged' ? 1 : 0);
  }
);

it('never acknowledges invalid JSON or missing raw read proof, and keeps ordinary malformed JSON strict', async () => {
  const raw = {
    id: 51,
    revision: 3,
    type: 'round',
    action: 'update',
    entity_key: 'round:r:end_early',
    data: '{broken',
    timestamp: '2026-10-09T00:00:00.000Z',
    retry_count: 0,
    status: 'pending' as const,
    last_error: null,
    last_attempt_at: null,
  };
  const invalid = decodePendingSyncRow(raw);
  for (const expectedRecovery of [invalid, { ...invalid, endIntentRead: undefined }]) {
    await expect(
      removePendingSync(51, 3, () => true, undefined, { expectedRecovery })
    ).resolves.toBe(false);
  }
  expect(txn.runAsync).not.toHaveBeenCalled();
  expect(() =>
    decodePendingSyncRow({ ...raw, entity_key: 'scorecard:r:p', type: 'scorecard' })
  ).toThrow();
  expect(() =>
    decodePendingSyncRow({
      ...raw,
      data: JSON.stringify({ syncHandicapSource: 'bad' }),
      entity_key: 'scorecard:r:p',
      type: 'scorecard',
    })
  ).toThrow(/handicap source/i);
  expect(
    decodePendingSyncRow({
      ...raw,
      type: 'scorecard',
      data: JSON.stringify({ syncHandicapSource: 'bad' }),
    })
  ).toMatchObject({ entityKey: 'round:r:end_early', endIntentRead: { decode: 'decoded' } });
});
it('freezes original raw proof before awaited acquisition and refuses an equal-revision repaired payload', async () => {
  const raw = {
    id: 51,
    revision: 3,
    type: 'round',
    action: 'update',
    entity_key: 'round:r:end_early',
    data: '{broken',
    timestamp: '2026-10-09T00:00:00.000Z',
    retry_count: 0,
    status: 'pending' as const,
    last_error: null,
    last_attempt_at: null,
  };
  const expectedRecovery = decodePendingSyncRow(raw);
  const repaired = {
    ...raw,
    data: JSON.stringify({ id: 'r', action: 'end_early', holesPlayed: 6, userId: 'owner' }),
  };
  let entered!: () => void;
  let release!: () => void;
  const ready = new Promise<void>((resolve) => {
    entered = resolve;
  });
  const gate = new Promise<void>((resolve) => {
    release = resolve;
  });
  (getDb as jest.Mock).mockImplementationOnce(async () => {
    entered();
    await gate;
    return database;
  });
  const retaining = markPendingSyncFailed(51, 3, 'obsolete malformed', {
    expectedRecovery,
    isCurrent: () => true,
    snapshotMode: 'end_intent',
  });
  await ready;
  expectedRecovery.endIntentRead = { rawData: repaired.data, decode: 'decoded' };
  txn.getFirstAsync.mockResolvedValue(repaired);
  release();
  await expect(retaining).resolves.toBe(false);
  expect(txn.runAsync).not.toHaveBeenCalled();
});
