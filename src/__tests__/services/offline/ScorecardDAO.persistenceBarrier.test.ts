/** Native DAO mocks only: no database connection or SQL execution. */
import type { Scorecard } from '@/types';
import { saveScorecard } from '@/services/offline/dao/ScorecardDAO';
import { bulkSaveHoleScores, saveHoleScore } from '@/services/offline/dao/HoleScoreDAO';
import { getDb } from '@/services/offline/DatabaseManager';
import {
  captureRoundPersistenceSource as capture,
  withRoundPersistence as write,
  withRoundPersistenceTransition as transition,
  RoundPersistenceSourceChangedError,
} from '@/services/offline/roundPersistenceBarrier';

jest.mock('@/services/offline/DatabaseManager', () => ({ getDb: jest.fn() }));
const shape = { nine_type: 'full', holes_played: 6 } as const;
const deferred = () => {
  let resolve!: () => void;
  const promise = new Promise<void>((r) => {
    resolve = r;
  });
  return { promise, resolve };
};
const card = (roundId: string): Scorecard => ({
  id: `card-${roundId}`,
  roundId,
  playerId: 'player',
  scores: { 3: { strokes: 4 }, 4: { balls: [{ strokes: 5, putts: 2 }, { strokes: 6 }] } },
  totalGross: 4,
  totalNet: 4,
  status: 'in-progress',
  createdAt: new Date(),
  updatedAt: new Date(),
});
const db = { runAsync: jest.fn(), getFirstAsync: jest.fn(), withTransactionAsync: jest.fn() };
beforeEach(() => {
  jest.resetAllMocks();
  (getDb as jest.Mock).mockResolvedValue(db);
  db.runAsync.mockResolvedValue({ changes: 1 });
  db.withTransactionAsync.mockImplementation(async (work) => work());
});

it('full -> bulk -> hole reuse the active lease while closing, with one bulk parent read', async () => {
  const scorecard = card('native-nesting');
  const paused = deferred();
  const started = deferred();
  const order: string[] = [];
  db.getFirstAsync.mockImplementation(async (sql: string) =>
    sql.includes('SELECT round_id') ? { round_id: scorecard.roundId } : null
  );
  db.runAsync.mockImplementation(async (sql: string) => {
    if (sql.includes('INTO hole_scores')) {
      order.push('hole');
      if (order.length === 1) {
        started.resolve();
        await paused.promise;
      }
    }
    return { changes: 1 };
  });
  const writing = saveScorecard(scorecard, { source: capture(scorecard.roundId) });
  await started.promise;
  const ending = transition(
    scorecard.roundId,
    shape,
    async () => {
      order.push('trim');
    },
    () => {}
  );
  paused.resolve();
  await writing;
  await ending;
  expect(order).toEqual(['hole', 'hole', 'trim']);
  expect(
    db.getFirstAsync.mock.calls.filter(([sql]) => sql.includes('SELECT round_id'))
  ).toHaveLength(1);
  expect(
    db.runAsync.mock.calls.find(
      ([sql, values]) => sql.includes('INTO hole_scores') && values[1] === 4
    )?.[1][7]
  ).toBe(
    JSON.stringify(
      scorecard.scores[4] && 'balls' in scorecard.scores[4] ? scorecard.scores[4].balls : []
    )
  );
});

it('late old source and missing provenance after commit reject before full-card DML', async () => {
  const scorecard = card('native-late');
  const source = capture(scorecard.roundId);
  await transition(
    scorecard.roundId,
    shape,
    async () => {},
    () => {}
  );
  await expect(saveScorecard(scorecard, { source })).rejects.toBeInstanceOf(
    RoundPersistenceSourceChangedError
  );
  await expect(saveScorecard(scorecard)).rejects.toBeInstanceOf(RoundPersistenceSourceChangedError);
  expect(getDb).not.toHaveBeenCalled();
  await expect(
    saveScorecard({ ...scorecard, holesPlayed: null }, { source: capture(scorecard.roundId) })
  ).rejects.toBeInstanceOf(RoundPersistenceSourceChangedError);
  expect(db.runAsync).not.toHaveBeenCalled();
});

it('rejects a different card parent round before hole DML, for direct and bulk writes', async () => {
  db.getFirstAsync.mockResolvedValue({ round_id: 'parent-B' });
  await write(capture('lease-A'), async (lease) => {
    await expect(saveHoleScore('card-B', 3, { strokes: 4 }, { lease })).rejects.toThrow(
      'Wrong-round'
    );
    await expect(bulkSaveHoleScores('card-B', { 3: { strokes: 4 } }, { lease })).rejects.toThrow(
      'Wrong-round'
    );
  });
  expect(db.runAsync).not.toHaveBeenCalled();
});

it('hole-only missing source resolves the parent and refuses a protected round', async () => {
  const roundId = 'legacy-hole-protected';
  db.getFirstAsync.mockResolvedValue({ round_id: roundId });
  await transition(
    roundId,
    shape,
    async () => {},
    () => {}
  );
  await expect(saveHoleScore('card', 3, { strokes: 4 })).rejects.toBeInstanceOf(
    RoundPersistenceSourceChangedError
  );
  expect(db.runAsync).not.toHaveBeenCalled();
});

it('accepts same-shape tee corrections and actual physical-nine context with a legacy full label', async () => {
  const roundId = 'physical-nine-legacy-full';
  const scorecard = {
    ...card(roundId),
    holesPlayed: 6,
    syncNineType: 'full' as const,
    syncHoles: ([1, 2, 3, 4, 5, 6, 7, 8, 9] as const).map((number) => ({
      number, par: 4 as const, strokeIndex: number,
    })),
    teeData: { name: 'Red', color: 'red', courseRating: 36, slopeRating: 113 },
  };
  await transition(
    roundId,
    shape,
    async () => {},
    () => {}
  );
  db.getFirstAsync.mockImplementation(async (sql: string) =>
    sql.includes('SELECT round_id')
      ? { round_id: roundId }
      : { holes_played: 6, sync_nine_type: 'full' }
  );
  await saveScorecard(scorecard, { source: capture(roundId) });
  const row = db.runAsync.mock.calls.find(([sql]) => sql.includes('INTO scorecards'))!;
  expect(row[1][15]).toBe(JSON.stringify(scorecard.teeData));
  expect(JSON.parse(row[1][22])).toHaveLength(9);
  expect(db.runAsync.mock.calls.filter(([sql]) => sql.includes('INTO hole_scores'))).toHaveLength(
    2
  );
});


it('provisional hydration validates parent and writes every hole on its exclusive connection with the admitted lease', async () => {
  const scorecard = card('provisional-exclusive');
  const txn = { runAsync: jest.fn().mockResolvedValue({ changes: 1 }), getFirstAsync: jest.fn().mockResolvedValue({ round_id: scorecard.roundId }) };
  Object.assign(db, { withExclusiveTransactionAsync: jest.fn(async (work) => work(txn)) });
  await saveScorecard(scorecard, { source: capture(scorecard.roundId), replaceProvisionalHandicapSource: 'none' });
  expect(db.runAsync).not.toHaveBeenCalled(); expect(db.getFirstAsync).not.toHaveBeenCalled();
  expect(txn.getFirstAsync).toHaveBeenCalledWith(expect.stringContaining('SELECT round_id'), [scorecard.id]);
  expect(txn.runAsync.mock.calls.filter(([sql]) => sql.includes('INTO hole_scores'))).toHaveLength(2);
  expect(txn.runAsync.mock.calls.find(([sql, args]) => sql.includes('INTO hole_scores') && args[1] === 4)?.[1][7]).toBe(JSON.stringify('balls' in scorecard.scores[4] ? scorecard.scores[4].balls : []));
});

it('refuses an exclusive-connection wrong-round parent before any hole insert', async () => {
  const txn = { runAsync: jest.fn(), getFirstAsync: jest.fn().mockResolvedValue({ round_id: 'wrong' }) };
  await write(capture('transaction-parent'), async lease => {
    await expect(bulkSaveHoleScores('c', { 1: { strokes: 4 } }, { lease }, txn)).rejects.toThrow('Wrong-round');
  });
  expect(txn.runAsync).not.toHaveBeenCalled(); expect(db.runAsync).not.toHaveBeenCalled();
});
