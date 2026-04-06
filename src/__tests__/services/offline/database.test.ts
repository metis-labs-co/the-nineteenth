/**
 * SQLite Database Service Tests
 *
 * Tests the offline database operations for scorecards, hole scores,
 * holes, and pending sync queue management.
 */

import * as SQLite from 'expo-sqlite';
import {
  initDatabase,
  saveScorecard,
  saveHoleScore,
  getScorecardsByRound,
  getHoleScores,
  deleteScorecard,
  deleteScorecardsByRound,
  markScorecardsAsSynced,
  getUnsyncedScorecards,
  saveHoles,
  getHoles,
  addPendingSync,
  getPendingSyncs,
  removePendingSync,
  incrementSyncRetryCount,
  getPendingSyncCount,
  clearAllData,
  clearInvalidMockData,
  clearAllPendingSyncs,
  closeDatabase,
  markAllScorecardsAsSynced,
  deleteOrphanedScorecards,
  __resetDatabaseState,
} from '@/services/offline/database';
import type { Scorecard, Hole, HoleScore, PendingSync } from '@/types';
import { isSingleBallScore } from '@/types/database';

// ============================================================================
// MOCK SETUP
// ============================================================================

// Track all database calls for assertions
let mockExecAsync: jest.Mock;
let mockRunAsync: jest.Mock;
let mockGetFirstAsync: jest.Mock;
let mockGetAllAsync: jest.Mock;
let mockCloseAsync: jest.Mock;

// Mock database instance
const createMockDatabase = () => {
  mockExecAsync = jest.fn().mockResolvedValue(undefined);
  mockRunAsync = jest.fn().mockResolvedValue({ lastInsertRowId: 1, changes: 1 });
  mockGetFirstAsync = jest.fn().mockResolvedValue(null);
  mockGetAllAsync = jest.fn().mockResolvedValue([]);
  mockCloseAsync = jest.fn().mockResolvedValue(undefined);

  return {
    execAsync: mockExecAsync,
    runAsync: mockRunAsync,
    getFirstAsync: mockGetFirstAsync,
    getAllAsync: mockGetAllAsync,
    closeAsync: mockCloseAsync,
  };
};

// Reset database module state between tests
beforeEach(() => {
  jest.clearAllMocks();

  // Reset internal database state to ensure clean slate
  __resetDatabaseState();

  const mockDb = createMockDatabase();

  (SQLite.openDatabaseAsync as jest.Mock).mockResolvedValue(mockDb);
});

// ============================================================================
// TEST HELPERS
// ============================================================================

/**
 * Create a test scorecard for database operations
 */
function createTestScorecard(overrides: Partial<Scorecard> = {}): Scorecard {
  return {
    id: 'scorecard-uuid-1234',
    roundId: '550e8400-e29b-41d4-a716-446655440000',
    playerId: '550e8400-e29b-41d4-a716-446655440001',
    player: {
      id: '550e8400-e29b-41d4-a716-446655440001',
      name: 'John Smith',
      email: 'john@test.com',
      handicap: 18,
      createdAt: new Date('2025-01-01'),
      updatedAt: new Date('2025-01-01'),
    },
    scores: {},
    totalGross: 0,
    totalNet: 0,
    status: 'in-progress',
    createdAt: new Date('2025-01-01'),
    updatedAt: new Date('2025-01-01'),
    isStandalone: false,
    ...overrides,
  };
}

/**
 * Create test holes for database operations
 */
function createTestHoles(): Hole[] {
  return Array.from({ length: 18 }, (_, i) => ({
    number: (i + 1) as Hole['number'],
    par: (i % 3 === 0 ? 5 : i % 3 === 1 ? 3 : 4) as Hole['par'],
    strokeIndex: ((i % 18) + 1),
    yardages: { white: 350 + i * 10 },
  }));
}

// ============================================================================
// INITIALIZATION TESTS
// ============================================================================

describe('Database Initialization', () => {
  describe('initDatabase()', () => {
    it('should open database with correct name', async () => {
      await initDatabase();

      expect(SQLite.openDatabaseAsync).toHaveBeenCalledWith('the_nineteenth.db');
    });

    it('should create scorecards table', async () => {
      await initDatabase();

      expect(mockExecAsync).toHaveBeenCalled();
      const calls = mockExecAsync.mock.calls.map((call) => call[0]);
      const createScorecardCall = calls.find((sql: string) =>
        sql.includes('CREATE TABLE IF NOT EXISTS scorecards')
      );
      expect(createScorecardCall).toBeDefined();
      expect(createScorecardCall).toContain('id TEXT PRIMARY KEY');
      expect(createScorecardCall).toContain('round_id TEXT NOT NULL');
      expect(createScorecardCall).toContain('player_id TEXT NOT NULL');
      expect(createScorecardCall).toContain('is_synced INTEGER DEFAULT 0');
      expect(createScorecardCall).toContain('is_standalone INTEGER DEFAULT 0');
    });

    it('should create hole_scores table', async () => {
      await initDatabase();

      const calls = mockExecAsync.mock.calls.map((call) => call[0]);
      const createHoleScoresCall = calls.find((sql: string) =>
        sql.includes('CREATE TABLE IF NOT EXISTS hole_scores')
      );
      expect(createHoleScoresCall).toBeDefined();
      expect(createHoleScoresCall).toContain('scorecard_id TEXT NOT NULL');
      expect(createHoleScoresCall).toContain('hole_number INTEGER NOT NULL');
      // strokes is nullable for multi-ball scores (actual data stored in ball_scores JSON)
      expect(createHoleScoresCall).toContain('strokes INTEGER');
      expect(createHoleScoresCall).toContain('UNIQUE(scorecard_id, hole_number)');
    });

    it('should create pending_syncs table', async () => {
      await initDatabase();

      const calls = mockExecAsync.mock.calls.map((call) => call[0]);
      const createPendingSyncsCall = calls.find((sql: string) =>
        sql.includes('CREATE TABLE IF NOT EXISTS pending_syncs')
      );
      expect(createPendingSyncsCall).toBeDefined();
      expect(createPendingSyncsCall).toContain('type TEXT NOT NULL');
      expect(createPendingSyncsCall).toContain('action TEXT NOT NULL');
      expect(createPendingSyncsCall).toContain('data TEXT NOT NULL');
      expect(createPendingSyncsCall).toContain('retry_count INTEGER DEFAULT 0');
    });

    it('should create holes table', async () => {
      await initDatabase();

      const calls = mockExecAsync.mock.calls.map((call) => call[0]);
      const createHolesCall = calls.find((sql: string) =>
        sql.includes('CREATE TABLE IF NOT EXISTS holes')
      );
      expect(createHolesCall).toBeDefined();
      expect(createHolesCall).toContain('round_id TEXT NOT NULL');
      expect(createHolesCall).toContain('hole_number INTEGER NOT NULL');
      expect(createHolesCall).toContain('par INTEGER NOT NULL');
      expect(createHolesCall).toContain('stroke_index INTEGER NOT NULL');
      expect(createHolesCall).toContain('UNIQUE(round_id, hole_number)');
    });

    it('should attempt migration for is_standalone column', async () => {
      await initDatabase();

      const calls = mockExecAsync.mock.calls.map((call) => call[0]);
      const migrationCall = calls.find((sql: string) =>
        sql.includes('ALTER TABLE scorecards ADD COLUMN is_standalone')
      );
      expect(migrationCall).toBeDefined();
    });

    it('should throw error if database fails to open', async () => {
      const error = new Error('Database connection failed');
      (SQLite.openDatabaseAsync as jest.Mock).mockRejectedValueOnce(error);

      await expect(initDatabase()).rejects.toThrow('Database connection failed');
    });
  });
});

// ============================================================================
// SCORECARD OPERATIONS TESTS
// ============================================================================

describe('Scorecard Operations', () => {
  beforeEach(async () => {
    await initDatabase();
  });

  describe('saveScorecard()', () => {
    it('should insert or replace a scorecard', async () => {
      const scorecard = createTestScorecard();

      await saveScorecard(scorecard);

      expect(mockRunAsync).toHaveBeenCalledWith(
        expect.stringContaining('INSERT OR REPLACE INTO scorecards'),
        expect.arrayContaining([
          scorecard.id,
          scorecard.roundId,
          scorecard.playerId,
          scorecard.player?.name || '',
          scorecard.player?.handicap || 0,
          scorecard.totalGross,
          scorecard.totalNet,
        ])
      );
    });

    it('should save with is_synced = 0 for new scorecards', async () => {
      const scorecard = createTestScorecard();

      await saveScorecard(scorecard);

      const insertCall = mockRunAsync.mock.calls.find((call) =>
        call[0].includes('INSERT OR REPLACE INTO scorecards')
      );
      expect(insertCall).toBeDefined();
      // is_synced is at index 13 in the VALUES array
      expect(insertCall[1][13]).toBe(0);
    });

    it('should save is_standalone flag correctly', async () => {
      const standaloneScorecard = createTestScorecard({ isStandalone: true });

      await saveScorecard(standaloneScorecard);

      const insertCall = mockRunAsync.mock.calls.find((call) =>
        call[0].includes('INSERT OR REPLACE INTO scorecards')
      );
      expect(insertCall).toBeDefined();
      // is_standalone is at index 14 in the VALUES array
      expect(insertCall[1][14]).toBe(1);
    });

    it('should save hole scores when present', async () => {
      const scorecard = createTestScorecard({
        scores: {
          1: { strokes: 4, putts: 2 },
          2: { strokes: 5, putts: 2 },
        },
      });

      await saveScorecard(scorecard);

      // Should have called runAsync for hole scores as well
      const holeScoreCalls = mockRunAsync.mock.calls.filter((call) =>
        call[0].includes('INSERT OR REPLACE INTO hole_scores')
      );
      expect(holeScoreCalls.length).toBe(2);
    });

    it('should handle completed status with submittedAt', async () => {
      const submittedAt = new Date('2025-01-15T10:30:00Z');
      const scorecard = createTestScorecard({
        status: 'completed',
        submittedAt,
        submittedBy: 'user-123',
      });

      await saveScorecard(scorecard);

      const insertCall = mockRunAsync.mock.calls.find((call) =>
        call[0].includes('INSERT OR REPLACE INTO scorecards')
      );
      expect(insertCall[1]).toContain('completed');
      expect(insertCall[1]).toContain(submittedAt.toISOString());
      expect(insertCall[1]).toContain('user-123');
    });

    it('should throw error if save fails', async () => {
      mockRunAsync.mockRejectedValueOnce(new Error('SQLite error'));
      const scorecard = createTestScorecard();

      await expect(saveScorecard(scorecard)).rejects.toThrow('SQLite error');
    });
  });

  describe('saveHoleScore()', () => {
    it('should insert or replace a hole score', async () => {
      const score: HoleScore = { strokes: 4, putts: 2, fairwayHit: true, greenInRegulation: true };

      await saveHoleScore('scorecard-1', 5, score);

      expect(mockRunAsync).toHaveBeenCalledWith(
        expect.stringContaining('INSERT OR REPLACE INTO hole_scores'),
        expect.arrayContaining(['scorecard-1', 5, 4, 2])
      );
    });

    it('should handle optional fields correctly', async () => {
      const score: HoleScore = { strokes: 5 };

      await saveHoleScore('scorecard-1', 3, score);

      const call = mockRunAsync.mock.calls.find((c) =>
        c[0].includes('INSERT OR REPLACE INTO hole_scores')
      );
      expect(call).toBeDefined();
      expect(call[1][3]).toBeNull(); // putts
      expect(call[1][4]).toBe(0); // fairway_hit (false -> 0)
      expect(call[1][5]).toBe(0); // green_in_regulation (false -> 0)
      expect(call[1][6]).toBe(0); // penalties
    });

    it('should save penalties correctly', async () => {
      const score: HoleScore = { strokes: 6, penalties: 2 };

      await saveHoleScore('scorecard-1', 10, score);

      const call = mockRunAsync.mock.calls.find((c) =>
        c[0].includes('INSERT OR REPLACE INTO hole_scores')
      );
      expect(call[1][6]).toBe(2);
    });
  });

  describe('getScorecardsByRound()', () => {
    it('should return empty array when no scorecards exist', async () => {
      mockGetAllAsync.mockResolvedValueOnce([]);

      const result = await getScorecardsByRound('round-1');

      expect(result).toEqual([]);
      expect(mockGetAllAsync).toHaveBeenCalledWith(
        expect.stringContaining('SELECT * FROM scorecards WHERE round_id = ?'),
        ['round-1']
      );
    });

    it('should return scorecards with hole scores', async () => {
      const mockScorecardRow = {
        id: 'scorecard-1',
        round_id: 'round-1',
        player_id: 'player-1',
        player_name: 'John Smith',
        player_handicap: 18,
        total_gross: 90,
        total_net: 72,
        total_points: 36,
        status: 'completed',
        submitted_at: '2025-01-15T10:00:00Z',
        submitted_by: 'user-1',
        created_at: '2025-01-15T08:00:00Z',
        updated_at: '2025-01-15T10:00:00Z',
        is_synced: 1,
        is_standalone: 0,
      };

      const mockHoleScoreRows = [
        { hole_number: 1, strokes: 4, putts: 2, fairway_hit: 1, green_in_regulation: 1, penalties: 0 },
        { hole_number: 2, strokes: 5, putts: 2, fairway_hit: 0, green_in_regulation: 0, penalties: 1 },
      ];

      mockGetAllAsync
        .mockResolvedValueOnce([mockScorecardRow])
        .mockResolvedValueOnce(mockHoleScoreRows);

      const result = await getScorecardsByRound('round-1');

      expect(result).toHaveLength(1);
      expect(result[0].id).toBe('scorecard-1');
      expect(result[0].roundId).toBe('round-1');
      expect(result[0].playerId).toBe('player-1');
      expect(result[0].player?.name).toBe('John Smith');
      expect(result[0].totalGross).toBe(90);
      expect(result[0].status).toBe('completed');
      expect(result[0].isStandalone).toBe(false);
      expect(result[0].submittedAt).toBeInstanceOf(Date);
    });

    it('should convert is_standalone flag correctly', async () => {
      const mockRow = {
        id: 'scorecard-standalone',
        round_id: 'round-1',
        player_id: 'player-1',
        player_name: 'Player',
        player_handicap: 10,
        total_gross: 0,
        total_net: 0,
        status: 'in-progress',
        submitted_at: null,
        submitted_by: null,
        created_at: '2025-01-15T08:00:00Z',
        updated_at: '2025-01-15T08:00:00Z',
        is_synced: 0,
        is_standalone: 1,
      };

      mockGetAllAsync
        .mockResolvedValueOnce([mockRow])
        .mockResolvedValueOnce([]);

      const result = await getScorecardsByRound('round-1');

      expect(result[0].isStandalone).toBe(true);
    });
  });

  describe('getHoleScores()', () => {
    it('should return empty object when no scores exist', async () => {
      mockGetAllAsync.mockResolvedValueOnce([]);

      const result = await getHoleScores('scorecard-1');

      expect(result).toEqual({});
    });

    it('should return scores keyed by hole number', async () => {
      const mockRows = [
        { hole_number: 1, strokes: 4, putts: 2, fairway_hit: 1, green_in_regulation: 1, penalties: 0 },
        { hole_number: 2, strokes: 5, putts: 2, fairway_hit: 0, green_in_regulation: 0, penalties: 1 },
      ];

      mockGetAllAsync.mockResolvedValueOnce(mockRows);

      const result = await getHoleScores('scorecard-1');

      expect(result[1]).toEqual({
        strokes: 4,
        putts: 2,
        fairwayHit: true,
        greenInRegulation: true,
        penalties: 0,
      });
      expect(result[2]).toEqual({
        strokes: 5,
        putts: 2,
        fairwayHit: false,
        greenInRegulation: false,
        penalties: 1,
      });
    });

    it('should handle null putts correctly', async () => {
      const mockRows = [
        { hole_number: 1, strokes: 4, putts: null, fairway_hit: 0, green_in_regulation: 0, penalties: 0 },
      ];

      mockGetAllAsync.mockResolvedValueOnce(mockRows);

      const result = await getHoleScores('scorecard-1');
      const score = result[1];

      expect(score && isSingleBallScore(score) ? score.putts : undefined).toBeUndefined();
    });
  });

  describe('deleteScorecard()', () => {
    it('should delete hole scores and scorecard', async () => {
      await deleteScorecard('scorecard-1');

      expect(mockRunAsync).toHaveBeenCalledWith(
        'DELETE FROM hole_scores WHERE scorecard_id = ?',
        ['scorecard-1']
      );
      expect(mockRunAsync).toHaveBeenCalledWith(
        'DELETE FROM scorecards WHERE id = ?',
        ['scorecard-1']
      );
    });
  });

  describe('deleteScorecardsByRound()', () => {
    it('should delete all related data for a round', async () => {
      mockGetAllAsync
        .mockResolvedValueOnce([{ id: 'sc-1' }, { id: 'sc-2' }]) // scorecards
        .mockResolvedValueOnce([]); // pending syncs

      await deleteScorecardsByRound('round-1');

      // Delete hole scores for each scorecard
      expect(mockRunAsync).toHaveBeenCalledWith(
        'DELETE FROM hole_scores WHERE scorecard_id = ?',
        ['sc-1']
      );
      expect(mockRunAsync).toHaveBeenCalledWith(
        'DELETE FROM hole_scores WHERE scorecard_id = ?',
        ['sc-2']
      );

      // Delete scorecards
      expect(mockRunAsync).toHaveBeenCalledWith(
        'DELETE FROM scorecards WHERE round_id = ?',
        ['round-1']
      );

      // Delete holes
      expect(mockRunAsync).toHaveBeenCalledWith(
        'DELETE FROM holes WHERE round_id = ?',
        ['round-1']
      );
    });

    it('should delete pending syncs for the round', async () => {
      const pendingSyncs = [
        { id: 1, data: JSON.stringify({ roundId: 'round-1' }) },
        { id: 2, data: JSON.stringify({ roundId: 'round-2' }) },
      ];

      mockGetAllAsync
        .mockResolvedValueOnce([])
        .mockResolvedValueOnce(pendingSyncs);

      await deleteScorecardsByRound('round-1');

      // Should delete the pending sync for round-1
      expect(mockRunAsync).toHaveBeenCalledWith(
        'DELETE FROM pending_syncs WHERE id = ?',
        [1]
      );
      // Should NOT delete pending sync for round-2
      const deleteRound2Call = mockRunAsync.mock.calls.find(
        (call) => call[0].includes('pending_syncs') && call[1]?.[0] === 2
      );
      expect(deleteRound2Call).toBeUndefined();
    });
  });

  describe('markScorecardsAsSynced()', () => {
    it('should update is_synced = 1 for given IDs', async () => {
      await markScorecardsAsSynced(['sc-1', 'sc-2', 'sc-3']);

      expect(mockRunAsync).toHaveBeenCalledWith(
        'UPDATE scorecards SET is_synced = 1 WHERE id = ?',
        ['sc-1']
      );
      expect(mockRunAsync).toHaveBeenCalledWith(
        'UPDATE scorecards SET is_synced = 1 WHERE id = ?',
        ['sc-2']
      );
      expect(mockRunAsync).toHaveBeenCalledWith(
        'UPDATE scorecards SET is_synced = 1 WHERE id = ?',
        ['sc-3']
      );
    });
  });

  describe('getUnsyncedScorecards()', () => {
    it('should return only unsynced non-standalone scorecards', async () => {
      const mockRows = [
        {
          id: 'sc-1',
          round_id: 'round-1',
          player_id: 'player-1',
          player_name: 'John',
          player_handicap: 18,
          total_gross: 90,
          total_net: 72,
          status: 'completed',
          submitted_at: '2025-01-15T10:00:00Z',
          created_at: '2025-01-15T08:00:00Z',
          updated_at: '2025-01-15T10:00:00Z',
          is_standalone: 0,
        },
      ];

      mockGetAllAsync
        .mockResolvedValueOnce(mockRows)
        .mockResolvedValueOnce([]); // hole scores

      const result = await getUnsyncedScorecards();

      expect(result).toHaveLength(1);
      expect(mockGetAllAsync).toHaveBeenCalledWith(
        expect.stringContaining('is_synced = 0')
      );
      expect(mockGetAllAsync).toHaveBeenCalledWith(
        expect.stringContaining("status = 'completed'")
      );
    });

    it('should not return standalone scorecards', async () => {
      mockGetAllAsync.mockResolvedValueOnce([]);

      await getUnsyncedScorecards();

      const query = mockGetAllAsync.mock.calls[0][0];
      expect(query).toContain('is_standalone = 0 OR is_standalone IS NULL');
    });

    it('should only return completed scorecards, not in-progress ones', async () => {
      mockGetAllAsync.mockResolvedValueOnce([]);

      await getUnsyncedScorecards();

      const query = mockGetAllAsync.mock.calls[0][0];
      expect(query).toContain("status = 'completed'");
    });
  });
});

// ============================================================================
// HOLES OPERATIONS TESTS
// ============================================================================

describe('Holes Operations', () => {
  beforeEach(async () => {
    await initDatabase();
  });

  describe('saveHoles()', () => {
    it('should insert all holes for a round', async () => {
      const holes = createTestHoles();

      await saveHoles('round-1', holes);

      const holeCalls = mockRunAsync.mock.calls.filter((call) =>
        call[0].includes('INSERT OR REPLACE INTO holes')
      );
      expect(holeCalls.length).toBe(18);
    });

    it('should save hole data correctly', async () => {
      const holes: Hole[] = [
        { number: 1, par: 4, strokeIndex: 7, yardages: { white: 380 } },
        { number: 2, par: 3, strokeIndex: 15, yardages: { white: 165 } },
      ];

      await saveHoles('round-1', holes);

      const call1 = mockRunAsync.mock.calls.find(
        (c) => c[0].includes('INSERT OR REPLACE INTO holes') && c[1][1] === 1
      );
      expect(call1[1]).toEqual(['round-1', 1, 4, 7, 380]);

      const call2 = mockRunAsync.mock.calls.find(
        (c) => c[0].includes('INSERT OR REPLACE INTO holes') && c[1][1] === 2
      );
      expect(call2[1]).toEqual(['round-1', 2, 3, 15, 165]);
    });

    it('should handle missing yardage', async () => {
      const holes: Hole[] = [
        { number: 1, par: 4, strokeIndex: 7, yardages: undefined } as Hole,
      ];

      await saveHoles('round-1', holes);

      const call = mockRunAsync.mock.calls.find((c) =>
        c[0].includes('INSERT OR REPLACE INTO holes')
      );
      expect(call[1][4]).toBeNull();
    });
  });

  describe('getHoles()', () => {
    it('should return holes ordered by hole number', async () => {
      const mockRows = [
        { hole_number: 1, par: 4, stroke_index: 7, yardage: 380 },
        { hole_number: 2, par: 3, stroke_index: 15, yardage: 165 },
        { hole_number: 3, par: 5, stroke_index: 1, yardage: 520 },
      ];

      mockGetAllAsync.mockResolvedValueOnce(mockRows);

      const result = await getHoles('round-1');

      expect(result).toHaveLength(3);
      expect(result[0]).toEqual({
        number: 1,
        par: 4,
        strokeIndex: 7,
        yardages: { white: 380 },
      });
      expect(result[1].par).toBe(3);
      expect(result[2].par).toBe(5);

      expect(mockGetAllAsync).toHaveBeenCalledWith(
        expect.stringContaining('ORDER BY hole_number'),
        ['round-1']
      );
    });

    it('should handle null yardage', async () => {
      const mockRows = [{ hole_number: 1, par: 4, stroke_index: 7, yardage: null }];

      mockGetAllAsync.mockResolvedValueOnce(mockRows);

      const result = await getHoles('round-1');

      expect(result[0].yardages).toEqual({ white: 0 });
    });

    it('should return empty array when no holes exist', async () => {
      mockGetAllAsync.mockResolvedValueOnce([]);

      const result = await getHoles('round-1');

      expect(result).toEqual([]);
    });
  });
});

// ============================================================================
// PENDING SYNC OPERATIONS TESTS
// ============================================================================

describe('Pending Sync Operations', () => {
  beforeEach(async () => {
    await initDatabase();
  });

  describe('addPendingSync()', () => {
    it('should insert a pending sync record', async () => {
      const sync: Omit<PendingSync, 'id'> = {
        type: 'scorecard',
        action: 'update',
        data: { scorecardId: 'sc-1', score: 4 },
        timestamp: new Date('2025-01-15T10:00:00Z'),
        retryCount: 0,
      };

      await addPendingSync(sync);

      expect(mockRunAsync).toHaveBeenCalledWith(
        expect.stringContaining('INSERT INTO pending_syncs'),
        expect.arrayContaining([
          'scorecard',
          'update',
          JSON.stringify(sync.data),
          '2025-01-15T10:00:00.000Z',
          0,
        ])
      );
    });

    it('should throw error if insert fails', async () => {
      mockRunAsync.mockRejectedValueOnce(new Error('Insert failed'));

      await expect(
        addPendingSync({
          type: 'scorecard',
          action: 'create',
          data: {},
          timestamp: new Date(),
          retryCount: 0,
        })
      ).rejects.toThrow('Insert failed');
    });
  });

  describe('getPendingSyncs()', () => {
    it('should return pending syncs ordered by timestamp', async () => {
      const mockRows = [
        {
          id: 1,
          type: 'scorecard',
          action: 'update',
          data: '{"id":"sc-1"}',
          timestamp: '2025-01-15T10:00:00Z',
          retry_count: 0,
        },
        {
          id: 2,
          type: 'scorecard',
          action: 'create',
          data: '{"id":"sc-2"}',
          timestamp: '2025-01-15T11:00:00Z',
          retry_count: 1,
        },
      ];

      mockGetAllAsync.mockResolvedValueOnce(mockRows);

      const result = await getPendingSyncs();

      expect(result).toHaveLength(2);
      expect(result[0].id).toBe(1);
      expect(result[0].type).toBe('scorecard');
      expect(result[0].action).toBe('update');
      expect(result[0].data).toEqual({ id: 'sc-1' });
      expect(result[0].timestamp).toBeInstanceOf(Date);
      expect(result[0].retryCount).toBe(0);

      expect(result[1].retryCount).toBe(1);

      expect(mockGetAllAsync).toHaveBeenCalledWith(
        expect.stringContaining('ORDER BY timestamp ASC')
      );
    });

    it('should parse JSON data correctly', async () => {
      const complexData = {
        scorecard: {
          id: 'sc-1',
          scores: { 1: 4, 2: 5 },
          nested: { deep: { value: true } },
        },
      };

      const mockRows = [
        {
          id: 1,
          type: 'scorecard',
          action: 'update',
          data: JSON.stringify(complexData),
          timestamp: '2025-01-15T10:00:00Z',
          retry_count: 0,
        },
      ];

      mockGetAllAsync.mockResolvedValueOnce(mockRows);

      const result = await getPendingSyncs();

      expect(result[0].data).toEqual(complexData);
    });
  });

  describe('removePendingSync()', () => {
    it('should delete pending sync by ID', async () => {
      await removePendingSync(123);

      expect(mockRunAsync).toHaveBeenCalledWith(
        'DELETE FROM pending_syncs WHERE id = ?',
        [123]
      );
    });
  });

  describe('incrementSyncRetryCount()', () => {
    it('should increment retry count for given ID', async () => {
      await incrementSyncRetryCount(456);

      expect(mockRunAsync).toHaveBeenCalledWith(
        'UPDATE pending_syncs SET retry_count = retry_count + 1 WHERE id = ?',
        [456]
      );
    });
  });

  describe('getPendingSyncCount()', () => {
    it('should return count of pending syncs', async () => {
      mockGetFirstAsync.mockResolvedValueOnce({ count: 5 });

      const result = await getPendingSyncCount();

      expect(result).toBe(5);
      expect(mockGetFirstAsync).toHaveBeenCalledWith(
        'SELECT COUNT(*) as count FROM pending_syncs'
      );
    });

    it('should return 0 when result is null', async () => {
      mockGetFirstAsync.mockResolvedValueOnce(null);

      const result = await getPendingSyncCount();

      expect(result).toBe(0);
    });
  });
});

// ============================================================================
// UTILITY FUNCTIONS TESTS
// ============================================================================

describe('Utility Functions', () => {
  beforeEach(async () => {
    await initDatabase();
  });

  describe('clearAllData()', () => {
    it('should delete all data from all tables', async () => {
      await clearAllData();

      expect(mockExecAsync).toHaveBeenCalledWith('DELETE FROM hole_scores');
      expect(mockExecAsync).toHaveBeenCalledWith('DELETE FROM scorecards');
      expect(mockExecAsync).toHaveBeenCalledWith('DELETE FROM pending_syncs');
      expect(mockExecAsync).toHaveBeenCalledWith('DELETE FROM holes');
    });
  });

  describe('clearInvalidMockData()', () => {
    it('should delete scorecards with invalid UUIDs', async () => {
      const scorecards = [
        { id: 'sc-1', round_id: 'not-a-uuid', player_id: 'player-1', is_standalone: 0 },
        {
          id: 'sc-2',
          round_id: '550e8400-e29b-41d4-a716-446655440000',
          player_id: '550e8400-e29b-41d4-a716-446655440001',
          is_standalone: 0,
        },
      ];

      mockGetAllAsync
        .mockResolvedValueOnce(scorecards)
        .mockResolvedValueOnce([]);

      const deleted = await clearInvalidMockData();

      expect(deleted).toBe(1);
      expect(mockRunAsync).toHaveBeenCalledWith(
        'DELETE FROM hole_scores WHERE scorecard_id = ?',
        ['sc-1']
      );
      expect(mockRunAsync).toHaveBeenCalledWith(
        'DELETE FROM scorecards WHERE id = ?',
        ['sc-1']
      );
    });

    it('should not delete standalone scorecards even with invalid UUIDs', async () => {
      const scorecards = [
        { id: 'sc-standalone', round_id: 'mock-round-123', player_id: 'mock-player-456', is_standalone: 1 },
      ];

      mockGetAllAsync
        .mockResolvedValueOnce(scorecards)
        .mockResolvedValueOnce([]);

      const deleted = await clearInvalidMockData();

      expect(deleted).toBe(0);
      const deleteScCall = mockRunAsync.mock.calls.find(
        (call) => call[0].includes('DELETE FROM scorecards WHERE id')
      );
      expect(deleteScCall).toBeUndefined();
    });

    it('should delete pending syncs with invalid UUIDs', async () => {
      const pendingSyncs = [
        { id: 1, data: JSON.stringify({ roundId: 'not-a-uuid', playerId: 'player-1', isStandalone: false }) },
        { id: 2, data: JSON.stringify({ roundId: '550e8400-e29b-41d4-a716-446655440000', isStandalone: false }) },
      ];

      mockGetAllAsync
        .mockResolvedValueOnce([])
        .mockResolvedValueOnce(pendingSyncs);

      const deleted = await clearInvalidMockData();

      expect(deleted).toBe(1);
      expect(mockRunAsync).toHaveBeenCalledWith(
        'DELETE FROM pending_syncs WHERE id = ?',
        [1]
      );
    });

    it('should skip standalone data in pending syncs', async () => {
      const pendingSyncs = [
        { id: 1, data: JSON.stringify({ roundId: 'mock-123', isStandalone: true }) },
      ];

      mockGetAllAsync
        .mockResolvedValueOnce([])
        .mockResolvedValueOnce(pendingSyncs);

      const deleted = await clearInvalidMockData();

      expect(deleted).toBe(0);
    });
  });

  describe('clearAllPendingSyncs()', () => {
    it('should delete all pending syncs and return count', async () => {
      mockGetFirstAsync.mockResolvedValueOnce({ count: 10 });

      const count = await clearAllPendingSyncs();

      expect(count).toBe(10);
      expect(mockExecAsync).toHaveBeenCalledWith('DELETE FROM pending_syncs');
    });
  });

  describe('closeDatabase()', () => {
    it('should close database connection', async () => {
      await closeDatabase();

      expect(mockCloseAsync).toHaveBeenCalled();
    });
  });

  describe('markAllScorecardsAsSynced()', () => {
    it('should mark all unsynced scorecards as synced', async () => {
      mockGetFirstAsync.mockResolvedValueOnce({ count: 5 });

      const count = await markAllScorecardsAsSynced();

      expect(count).toBe(5);
      expect(mockRunAsync).toHaveBeenCalledWith('UPDATE scorecards SET is_synced = 1');
    });

    it('should not update if no unsynced scorecards exist', async () => {
      mockGetFirstAsync.mockResolvedValueOnce({ count: 0 });

      const count = await markAllScorecardsAsSynced();

      expect(count).toBe(0);
      const updateCall = mockRunAsync.mock.calls.find((call) =>
        call[0].includes('UPDATE scorecards SET is_synced = 1')
      );
      expect(updateCall).toBeUndefined();
    });
  });

  describe('deleteOrphanedScorecards()', () => {
    it('should delete scorecards for rounds not in valid list', async () => {
      const localRounds = [
        { round_id: 'round-1' },
        { round_id: 'round-2' },
        { round_id: 'round-3' },
      ];

      mockGetAllAsync
        .mockResolvedValueOnce(localRounds) // Local rounds query
        .mockResolvedValueOnce([{ id: 'sc-1' }]) // Scorecards for round-3
        .mockResolvedValueOnce([]); // Pending syncs

      const deleted = await deleteOrphanedScorecards(['round-1', 'round-2']);

      // round-3 should be deleted as it's not in valid list
      expect(deleted).toBe(1);
    });

    it('should not delete anything if all rounds are valid', async () => {
      const localRounds = [{ round_id: 'round-1' }, { round_id: 'round-2' }];

      mockGetAllAsync.mockResolvedValueOnce(localRounds);

      const deleted = await deleteOrphanedScorecards(['round-1', 'round-2']);

      expect(deleted).toBe(0);
    });

    it('should return 0 when validRoundIds is empty', async () => {
      const deleted = await deleteOrphanedScorecards([]);

      expect(deleted).toBe(0);
      // Should not query local rounds
      expect(mockGetAllAsync).not.toHaveBeenCalledWith(
        expect.stringContaining('SELECT DISTINCT round_id')
      );
    });
  });
});
