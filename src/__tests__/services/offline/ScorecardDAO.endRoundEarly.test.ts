/** Mock-only transaction/SQL contracts: no database connection or SQL execution. */
import { Platform } from 'react-native';
import { persistRoundEarlyEnd, saveScorecard } from '@/services/offline/dao/ScorecardDAO';
import { getDb } from '@/services/offline/DatabaseManager';
import { bulkSaveHoleScores } from '@/services/offline/dao/HoleScoreDAO';
import type { Scorecard, TeeBox } from '@/types';

jest.mock('@/services/offline/DatabaseManager', () => ({ getDb: jest.fn() }));
jest.mock('@/services/offline/dao/HoleScoreDAO', () => ({
  bulkSaveHoleScores: jest.fn(),
  getHoleScores: jest.fn(),
  deleteHoleScores: jest.fn(),
}));

const tee: TeeBox = { name: 'Red', color: 'red', slopeRating: 113, courseRating: 70 };
const txn = { runAsync: jest.fn() };
const db = {
  runAsync: jest.fn(),
  getFirstAsync: jest.fn(),
  withTransactionAsync: jest.fn(),
  withExclusiveTransactionAsync: jest.fn(),
};
const card: Scorecard = {
  id: 'card-1',
  roundId: 'round-1',
  playerId: 'p1',
  scores: { 10: { strokes: 4 }, 15: { strokes: 5 }, 16: { strokes: 3 } },
  totalGross: 12,
  totalNet: 12,
  status: 'in-progress',
  createdAt: new Date(),
  updatedAt: new Date(),
};

beforeEach(() => {
  jest.clearAllMocks();
  (getDb as jest.Mock).mockResolvedValue(db);
  txn.runAsync.mockReset().mockResolvedValue({ changes: 1 });
  db.runAsync.mockResolvedValue({ changes: 1 });
  db.getFirstAsync.mockResolvedValue(null);
  db.withTransactionAsync.mockImplementation(async (work) => work());
  db.withExclusiveTransactionAsync.mockImplementation(async (work) => work(txn));
});

describe('persistRoundEarlyEnd', () => {
  const end = () =>
    persistRoundEarlyEnd(
      'round-1',
      6,
      'back9',
      [10, 11, 12, 13, 14, 15],
      [
        { scorecardId: 'card-1', teeData: tee },
        { scorecardId: 'card-2', teeData: null },
      ]
    );

  it('stamps ALL expected cards and deletes every unplayed disk row on the exclusive connection', async () => {
    await end();
    expect(db.withExclusiveTransactionAsync).toHaveBeenCalledTimes(1);
    expect(db.withTransactionAsync).not.toHaveBeenCalled();
    expect(db.runAsync).not.toHaveBeenCalled();
    expect(txn.runAsync).toHaveBeenCalledWith(expect.stringContaining('UPDATE scorecards'), [
      6,
      JSON.stringify(tee),
      'back9',
      expect.any(String),
      'card-1',
      'round-1',
    ]);
    expect(txn.runAsync).toHaveBeenCalledWith(expect.stringContaining('UPDATE scorecards'), [
      6,
      null,
      'back9',
      expect.any(String),
      'card-2',
      'round-1',
    ]);
    expect(txn.runAsync).toHaveBeenCalledWith(
      expect.stringContaining('hole_number NOT IN (?, ?, ?, ?, ?, ?)'),
      ['card-2', 10, 11, 12, 13, 14, 15]
    );
  });

  it('rolls back the transaction when a later marker update fails', async () => {
    const rolledBack = jest.fn();
    db.withExclusiveTransactionAsync.mockImplementationOnce(async (work) => {
      try {
        await work(txn);
      } catch (error) {
        rolledBack();
        throw error;
      }
    });
    txn.runAsync.mockImplementation(async (sql, args) => {
      if (sql.includes('UPDATE') && args[4] === 'card-2') throw new Error('marker write failed');
      return { changes: 1 };
    });
    await expect(end()).rejects.toThrow('marker write failed');
    expect(rolledBack).toHaveBeenCalledTimes(1);
    expect(db.runAsync).not.toHaveBeenCalled();
  });

  it('rejects a missing expected card instead of reporting a durable end', async () => {
    txn.runAsync.mockResolvedValueOnce({ changes: 0 });
    await expect(end()).rejects.toThrow(/card-1/);
  });

  it('explicitly refuses web without starting a weaker transaction', async () => {
    const originalOS = Platform.OS;
    Object.defineProperty(Platform, 'OS', { configurable: true, value: 'web' });
    try {
      await expect(end()).rejects.toThrow(/native|web/i);
      expect(db.withExclusiveTransactionAsync).not.toHaveBeenCalled();
      expect(db.withTransactionAsync).not.toHaveBeenCalled();
    } finally {
      Object.defineProperty(Platform, 'OS', { configurable: true, value: originalOS });
    }
  });
});

describe('ordinary save after a durable end', () => {
  it.each([null, 4, 8])(
    'protects durable marker, tee and nine from stale incoming N=%s in the row UPSERT',
    async (holesPlayed) => {
      await saveScorecard({ ...card, holesPlayed, teeData: null, syncNineType: 'full' });
      const sql = db.runAsync.mock.calls[0][0];
      expect(sql).toContain('ON CONFLICT(id) DO UPDATE SET');
      expect(sql).toMatch(
        /holes_played\s*=\s*COALESCE\(scorecards.holes_played, excluded.holes_played\)/
      );
      expect(sql).toMatch(
        /tee_data\s*=\s*CASE WHEN scorecards.holes_played IS NOT NULL AND scorecards.holes_played IS NOT excluded.holes_played THEN scorecards.tee_data ELSE excluded.tee_data END/
      );
      expect(sql).toMatch(
        /sync_nine_type\s*=\s*CASE WHEN scorecards.holes_played IS NOT NULL AND scorecards.holes_played IS NOT excluded.holes_played THEN scorecards.sync_nine_type/
      );
    }
  );

  it('permits a matching-marker tee correction through the same atomic CASE', async () => {
    await saveScorecard({ ...card, holesPlayed: 6, teeData: tee });
    const [sql, args] = db.runAsync.mock.calls[0];
    expect(args[15]).toBe(JSON.stringify(tee));
    expect(args[23]).toBe(6);
    expect(sql).toContain('THEN scorecards.tee_data ELSE excluded.tee_data END');
  });

  it('filters a stale FULL-card save against the durable back9 N, read inside its transaction after UPSERT', async () => {
    db.getFirstAsync.mockImplementationOnce(async () => {
      expect(db.runAsync).toHaveBeenCalledTimes(1);
      return { holes_played: 6, sync_nine_type: 'back9' };
    });
    await saveScorecard({ ...card, holesPlayed: null, syncNineType: 'full' });
    expect(bulkSaveHoleScores).toHaveBeenCalledWith('card-1', {
      10: { strokes: 4 },
      15: { strokes: 5 },
    }, expect.objectContaining({ lease: expect.any(Object) }));
  });

  it('keeps the ordinary non-ended sync-nine clear semantics', async () => {
    await saveScorecard({ ...card, holesPlayed: null, syncNineType: undefined });
    const [sql, args] = db.runAsync.mock.calls[0];
    expect(args[20]).toBeNull();
    expect(sql).toContain('ELSE excluded.sync_nine_type END');
  });

  it('preserves normal non-ended full-card persistence', async () => {
    await saveScorecard(card);
    expect(bulkSaveHoleScores).toHaveBeenCalledWith('card-1', card.scores, expect.objectContaining({ lease: expect.any(Object) }));
  });
});
