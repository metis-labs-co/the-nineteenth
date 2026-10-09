/** Mock-only transaction/SQL contracts: no database connection or SQL execution. */
import { Platform } from 'react-native';
import { persistRoundEarlyEnd, saveScorecard, getScorecardsByRound } from '@/services/offline/dao/ScorecardDAO';
import { getDb } from '@/services/offline/DatabaseManager';
import { bulkSaveHoleScores, getHoleScores } from '@/services/offline/dao/HoleScoreDAO';
import type { Scorecard, TeeBox } from '@/types';
import type { ScorecardRow } from '@/services/offline/types';
import { createRoundScoringContext } from '@/services/rounds/roundScoringContext';
import { create18Holes, createTestPlayer } from '../../utils/testFixtures';

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
  getAllAsync: jest.fn(),
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

describe('native nullable gender capture evidence', () => {
  const row: ScorecardRow = {
    id: card.id, round_id: card.roundId, player_id: card.playerId, player_name: 'Player',
    player_handicap: 24, total_gross: 5, total_net: 5, total_points: 0, status: 'in-progress',
    submitted_at: null, submitted_by: null, created_at: '2020-01-01', updated_at: '2020-01-02',
    is_synced: 0, is_standalone: 0, server_revision: 3, tee_data: JSON.stringify(tee),
    player_gender: null, player_handicap_used: null, course_par: null,
    sync_nine_type: null, sync_game_type: null, sync_holes: null,
    sync_handicap_source: 'profile', holes_played: null,
  };
  const decode = async (fields: Partial<ScorecardRow> = {}) => {
    db.getAllAsync.mockResolvedValueOnce([{ ...row, ...fields }]);
    (getHoleScores as jest.Mock).mockResolvedValueOnce({ 1: { strokes: 5 } });
    return (await getScorecardsByRound(card.roundId))[0];
  };

  it('leaves uncaptured active gender absent despite provisional source, tee and revision bookkeeping', async () => {
    const decoded = await decode();
    expect(decoded).not.toHaveProperty('playerGender');
    expect(decoded).toMatchObject({ syncHandicapSource: 'profile', teeData: tee, serverRevision: 3 });
  });

  it.each([
    { player_handicap_used: 0 }, { course_par: 0 },
    { sync_nine_type: '' }, { sync_game_type: '' },
    { sync_holes: '' }, { sync_holes: '[]' }, { sync_holes: 'malformed' },
    { holes_played: 0 }, { holes_played: 6 },
    { status: 'completed' }, { status: 'confirmed' },
    { submitted_at: '' }, { submitted_at: '2020-01-02' }, { submitted_by: '' }, { submitted_by: 'owner' },
  ])('preserves recorded-null evidence for raw partial/terminal bundle %j', async (fields) => {
    expect((await decode(fields)).playerGender).toBeNull();
  });

  it.each(['male', 'female'])('preserves non-null %s even before other metadata was captured', async (player_gender) => {
    expect((await decode({ player_gender })).playerGender).toBe(player_gender);
  });

  it('still refuses a live gender change against decoded partial recorded-null context', async () => {
    const decoded = await decode({ player_handicap_used: 12 });
    const holes = create18Holes();
    const rebuild = createRoundScoringContext(card.roundId, {
      getLiveContext: () => ({ player: createTestPlayer({ id: card.playerId, handicap: 12, gender: 'female' }),
        handicapSource: 'profile', nineType: 'full', holes, gameType: 'stroke', teeData: tee }),
    });
    expect(() => rebuild(decoded, new Set([1,2,3,4,5,6]), { nine_type: 'full', holes_played: 6 }))
      .toThrow(expect.objectContaining({ kind: 'context_changed' }));
  });

  it('keeps a complete decoded recorded-null basis authoritative over a different current profile', async () => {
    const holes = create18Holes();
    const decoded = await decode({ player_handicap_used: 12, course_par: 72,
      sync_nine_type: 'full', sync_game_type: 'stroke', sync_holes: JSON.stringify(holes), holes_played: 6 });
    const getLiveContext = jest.fn(() => ({ player: createTestPlayer({ id: card.playerId, handicap: 24, gender: 'female' }),
      handicapSource: 'profile' as const, nineType: 'full' as const, holes, gameType: 'stroke' as const, teeData: tee }));
    const repaired = createRoundScoringContext(card.roundId, { getLiveContext })(
      decoded, new Set([1,2,3,4,5,6]), { nine_type: 'full', holes_played: 6 });
    expect(repaired).toMatchObject({ playerGender: null, playerHandicap: 12, scores: { 1: { strokes: 5 } } });
    expect(getLiveContext).not.toHaveBeenCalled();
  });
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
  it('web refuses genuine recorded-source replacement before any write', async () => {
    const originalOS = Platform.OS;
    Object.defineProperty(Platform, 'OS', { configurable: true, value: 'web' });
    try {
      await expect(saveScorecard(card, { replaceProvisionalHandicapSource: 'none' })).rejects.toThrow(
        /native/i
      );
      expect(db.runAsync).not.toHaveBeenCalled();
      expect(db.withExclusiveTransactionAsync).not.toHaveBeenCalled();
      expect(db.withTransactionAsync).not.toHaveBeenCalled();
      expect(bulkSaveHoleScores).not.toHaveBeenCalled();
    } finally {
      Object.defineProperty(Platform, 'OS', { configurable: true, value: originalOS });
    }
  });

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


describe('durable handicap-source metadata', () => {
  it('captures none in the atomic marker commit before any best-effort save/restart', async () => {
    await persistRoundEarlyEnd('round-1', 2, 'full', [1,2], [{ scorecardId: card.id, teeData: tee, syncHandicapSource: 'none' }]);
    const [sql, args] = txn.runAsync.mock.calls.find(([sql]) => sql.includes('UPDATE scorecards'))!;
    expect(sql).toContain('sync_handicap_source = COALESCE'); expect(args).toContain('none');
    expect(db.runAsync).not.toHaveBeenCalled();
  });
  it.each([undefined, 'none', 'profile', 'calculated'] as const)('binds source %s and omission preserves the stored stamp', async (syncHandicapSource) => {
    await saveScorecard({ ...card, syncHandicapSource });
    const [sql, args] = db.runAsync.mock.calls[0];
    expect(sql).toContain('sync_handicap_source = COALESCE(excluded.sync_handicap_source, scorecards.sync_handicap_source)');
    expect(args[24]).toBe(syncHandicapSource ?? null);
  });
  it('rejects an explicit invalid source before writing', async () => {
    await expect(saveScorecard({ ...card, syncHandicapSource: 'invalid' as Scorecard['syncHandicapSource'] })).rejects.toThrow(/handicap source/i);
    expect(db.runAsync).not.toHaveBeenCalled();
  });
});


it('mocked restart decodes the atomic end source before best-effort row saves', async () => {
  const stored = { id: card.id, round_id: card.roundId, player_id: card.playerId, player_name: 'Historical',
    total_gross: 20, total_net: 20, status: 'in-progress', player_handicap: 44,
    submitted_at: null, submitted_by: null, created_at: '2026-10-01', updated_at: '2026-10-01',
    is_synced: 0, is_standalone: 0, tee_data: JSON.stringify(tee), course_par: 72,
    player_gender: null, player_handicap_used: null, sync_nine_type: 'full', sync_game_type: 'stroke',
    sync_handicap_source: undefined as string | undefined, holes_played: null as number | null };
  txn.runAsync.mockImplementation(async (sql, args) => {
    if (sql.includes('UPDATE scorecards')) { stored.holes_played = args[0]; stored.sync_handicap_source = args[4]; }
    return { changes: 1 };
  });
  await persistRoundEarlyEnd(card.roundId, 2, 'full', [1,2], [{ scorecardId: card.id, teeData: tee, syncHandicapSource: 'none' }]);
  db.getAllAsync.mockResolvedValue([stored]);
  (getHoleScores as jest.Mock).mockResolvedValue({ 1: { strokes: 4 }, 2: { strokes: 10 } });
  const [restarted] = await getScorecardsByRound(card.roundId);
  expect(restarted).toMatchObject({ holesPlayed: 2, syncHandicapSource: 'none', playerHandicap: null });
  expect(db.runAsync).not.toHaveBeenCalled();
  stored.sync_handicap_source = 'invalid';
  await expect(getScorecardsByRound(card.roundId)).rejects.toThrow(/handicap source/i);
});


describe('guarded provisional hydration replacement', () => {
  it('clears only an empty live provisional row and writes remote holes on the exclusive connection', async () => {
    await saveScorecard({ ...card, scores: { 1: { strokes: 4 } }, status: 'completed', serverRevision: 3 }, { replaceProvisionalHandicapSource: 'none' });
    expect(db.withExclusiveTransactionAsync).toHaveBeenCalledTimes(1); expect(db.withTransactionAsync).not.toHaveBeenCalled();
    const [sql, args] = txn.runAsync.mock.calls[0];
    for (const guard of ['round_id = ?', 'player_id = ?', 'sync_handicap_source = ?', 'holes_played IS NULL', 'submitted_at IS NULL', 'submitted_by IS NULL', 'server_revision IS NULL', 'tee_data IS NULL', 'player_handicap_used IS NULL', 'player_gender IS NULL', 'course_par IS NULL', 'sync_holes IS NULL', 'sync_game_type IS NULL', 'sync_nine_type IS NULL', 'total_gross = 0', 'total_net = 0', 'total_points = 0', 'NOT EXISTS', 'hole_scores', 'pending_syncs']) expect(sql).toContain(guard);
    expect(sql).toContain('sync_handicap_source = NULL'); expect(args).toContain('none');
    expect(bulkSaveHoleScores).toHaveBeenCalledWith(card.id, { 1: { strokes: 4 } }, expect.objectContaining({ lease: expect.any(Object) }), txn);
    expect(db.runAsync).not.toHaveBeenCalled();
  });
  it('refuses the whole replacement on an atomic guard miss before holes or fallback UPSERT', async () => {
    txn.runAsync.mockResolvedValue({ changes: 0 });
    await expect(saveScorecard({ ...card, status: 'completed' }, { replaceProvisionalHandicapSource: 'none' })).rejects.toMatchObject({ kind: 'context_changed' });
    expect(bulkSaveHoleScores).not.toHaveBeenCalled(); expect(db.runAsync).not.toHaveBeenCalled();
  });
});

describe('C2b full atomic end basis survives crash before any full-card metadata save', () => {
  it.each([['calculated', 12], ['none', undefined]] as const)('restarts %s with recorded HI %s and actual planned context', async (source, hi) => {
    const { createRoundScoringContext } = require('@/services/rounds/roundScoringContext');
    const { calculateHandicapData } = require('@/services/offline/sync/scorecardSync');
    const { create18Holes } = require('../../utils/testFixtures');
    const holes = create18Holes();
    // The native mock stores only what the marker transaction itself writes.
    // No saveScorecard call takes place between commit and restart.
    const savedRow = {
      id: 'crash-card', round_id: 'crash-round', player_id: 'p', player_name: 'Player', player_handicap: 24,
      total_gross: 99, total_net: 99, total_points: 0, status: 'in-progress', submitted_at: null, submitted_by: null,
      created_at: '2026-10-01', updated_at: '2026-10-01', is_synced: 0, is_standalone: 0,
    } as Record<string, unknown>;
    txn.runAsync.mockImplementation(async (sql, args) => {
      if (sql.includes('UPDATE scorecards')) {
        expect(sql).toContain('player_handicap_used = ?'); expect(sql).toContain('sync_holes = ?');
        Object.assign(savedRow, { holes_played: args[0], tee_data: args[1], sync_nine_type: args[2],
          sync_handicap_source: args[4], player_handicap_used: args[5], player_gender: args[6],
          course_par: args[7], sync_holes: args[8], sync_game_type: args[9] });
      }
      return { changes: 1 };
    });
    await persistRoundEarlyEnd('crash-round', 6, 'full', [1,2,3,4,5,6], [{
      scorecardId: 'crash-card', teeData: tee, syncHandicapSource: source,
      playerHandicap: hi, playerGender: null, coursePar: 72, syncHoles: holes, syncGameType: 'stroke',
    }]);
    expect(db.withExclusiveTransactionAsync).toHaveBeenCalledTimes(1); expect(db.withTransactionAsync).not.toHaveBeenCalled();
    db.getAllAsync.mockResolvedValueOnce([savedRow]);
    (getHoleScores as jest.Mock).mockResolvedValueOnce({ 1: { strokes: 4 }, 6: { strokes: 4 } });
    const [restored] = await getScorecardsByRound('crash-round');
    expect(restored.player?.handicap).toBe(24);
    expect(restored.playerHandicap ?? undefined).toBe(hi);
    const repaired = createRoundScoringContext('crash-round', {})(restored, new Set([1,2,3,4,5,6]), { nine_type: 'full', holes_played: 6 });
    const snapshot = calculateHandicapData(repaired);
    expect(snapshot.gaHandicapUsed ?? undefined).toBe(hi);
    expect(snapshot.handicapDifferential).toBeNull();
    if (source === 'none') {
      expect(snapshot.dailyHandicapUsed).toBe(0); expect(repaired.totalNet).toBe(repaired.totalGross);
    } else {
      expect(snapshot.dailyHandicapUsed).toBeLessThan(15);
      expect(repaired.playerHandicap).toBe(12);
    }
  });
});
