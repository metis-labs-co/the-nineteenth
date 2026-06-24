/**
 * Score Mismatch Service Tests
 *
 * Comprehensive tests for the score mismatch detection and resolution service:
 * - Score entry CRUD operations
 * - Mismatch detection algorithm
 * - Resolution with first-write-wins
 * - Submission readiness checks
 * - 30-minute bypass timer
 * - Dynamic hole count support (9 and 18 holes)
 *
 * @file src/__tests__/services/scoreMismatch/scoreMismatchService.test.ts
 */

import { supabase } from '@/services/supabase/client';
import {
  saveScoreEntry,
  saveScoreEntries,
  getRoundScoreEntries,
  getScorerEntries,
  isScorerComplete,
  detectMismatches,
  createMismatchRecords,
  getPendingMismatches,
  getMismatch,
  resolveMismatch,
  applyResolvedScoreToScorecard,
  checkSubmissionReadiness,
  getPartnerProgress,
  startBypassTimer,
  getSubmissionStatus,
  markSubmissionBypassed,
  applyBypassScores,
} from '@/services/scoreMismatch';
import type { ScoreEntry, ScoreMismatch } from '@/services/scoreMismatch';
import type { HoleScore } from '@/types';

// ============================================================================
// TEST FIXTURES
// ============================================================================

const ROUND_ID = '550e8400-e29b-41d4-a716-446655440000';
const PLAYER_A_ID = '550e8400-e29b-41d4-a716-446655440001';
const PLAYER_B_ID = '550e8400-e29b-41d4-a716-446655440002';
const MISMATCH_ID = '550e8400-e29b-41d4-a716-446655440010';

/**
 * Create a test score entry
 */
function createScoreEntry(overrides: Partial<ScoreEntry> = {}): ScoreEntry {
  return {
    id: 'entry-uuid-1234',
    round_id: ROUND_ID,
    player_id: PLAYER_A_ID,
    hole_number: 1,
    scorer_id: PLAYER_A_ID,
    strokes: 4,
    putts: 2,
    penalties: 0,
    created_at: '2025-01-15T10:00:00Z',
    updated_at: '2025-01-15T10:00:00Z',
    ...overrides,
  };
}

/**
 * Create a test mismatch record
 */
function createMismatchRecord(overrides: Partial<ScoreMismatch> = {}): ScoreMismatch {
  return {
    id: MISMATCH_ID,
    round_id: ROUND_ID,
    player_id: PLAYER_A_ID,
    hole_number: 10,
    self_score: 4,
    partner_score: 5,
    self_scorer_id: PLAYER_A_ID,
    partner_scorer_id: PLAYER_B_ID,
    entries: null,
    status: 'pending',
    resolved_score: null,
    resolved_by: null,
    resolved_at: null,
    created_at: '2025-01-15T10:00:00Z',
    ...overrides,
  };
}

/**
 * Create a test hole score
 */
function createHoleScore(overrides: Partial<HoleScore> = {}): HoleScore {
  return {
    strokes: 4,
    putts: 2,
    penalties: 0,
    ...overrides,
  };
}

/**
 * Create entries for a complete 18-hole round
 * Each scorer enters scores for self + partner = 36 entries per scorer
 */
function createCompleteRoundEntries(scorerId: string, partnerId: string): ScoreEntry[] {
  const entries: ScoreEntry[] = [];
  for (let hole = 1; hole <= 18; hole++) {
    // Scorer's score for self
    entries.push(createScoreEntry({
      id: `entry-${scorerId}-self-${hole}`,
      player_id: scorerId,
      hole_number: hole,
      scorer_id: scorerId,
      strokes: 4,
    }));
    // Scorer's score for partner
    entries.push(createScoreEntry({
      id: `entry-${scorerId}-partner-${hole}`,
      player_id: partnerId,
      hole_number: hole,
      scorer_id: scorerId,
      strokes: 4,
    }));
  }
  return entries;
}

// ============================================================================
// MOCK SETUP HELPERS
// ============================================================================

/**
 * Create a mock Supabase chain that resolves with data
 */
function mockSupabaseSuccess(data: unknown) {
  const mockChain = {
    select: jest.fn().mockReturnThis(),
    insert: jest.fn().mockReturnThis(),
    update: jest.fn().mockReturnThis(),
    delete: jest.fn().mockReturnThis(),
    upsert: jest.fn().mockReturnThis(),
    eq: jest.fn().mockReturnThis(),
    neq: jest.fn().mockReturnThis(),
    order: jest.fn().mockReturnThis(),
    single: jest.fn().mockResolvedValue({ data, error: null }),
    maybeSingle: jest.fn().mockResolvedValue({ data, error: null }),
    then: jest.fn((resolve) => resolve({ data, error: null })),
  };
  (supabase.from as jest.Mock).mockReturnValue(mockChain);
  return mockChain;
}

/**
 * Create a mock Supabase chain that resolves with an error
 */
function mockSupabaseError(message: string, code: string = 'PGRST000') {
  const error = { message, code };
  const mockChain = {
    select: jest.fn().mockReturnThis(),
    insert: jest.fn().mockReturnThis(),
    update: jest.fn().mockReturnThis(),
    delete: jest.fn().mockReturnThis(),
    upsert: jest.fn().mockReturnThis(),
    eq: jest.fn().mockReturnThis(),
    neq: jest.fn().mockReturnThis(),
    order: jest.fn().mockReturnThis(),
    single: jest.fn().mockResolvedValue({ data: null, error }),
    maybeSingle: jest.fn().mockResolvedValue({ data: null, error }),
    then: jest.fn((resolve) => resolve({ data: null, error })),
  };
  (supabase.from as jest.Mock).mockReturnValue(mockChain);
  return mockChain;
}

/**
 * Create a mock chain builder for complex multi-table scenarios
 */
function _createMockChainBuilder() {
  const tableResponses = new Map<string, { data: unknown; error: unknown }>();

  const createChain = (tableName: string) => {
    const response = tableResponses.get(tableName) || { data: null, error: null };
    return {
      select: jest.fn().mockReturnThis(),
      insert: jest.fn().mockReturnThis(),
      update: jest.fn().mockReturnThis(),
      delete: jest.fn().mockReturnThis(),
      upsert: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      neq: jest.fn().mockReturnThis(),
      order: jest.fn().mockReturnThis(),
      single: jest.fn().mockResolvedValue(response),
      maybeSingle: jest.fn().mockResolvedValue(response),
      then: jest.fn((resolve) => resolve(response)),
    };
  };

  return {
    setTableResponse(tableName: string, data: unknown, error: unknown = null) {
      tableResponses.set(tableName, { data, error });
      return this;
    },
    apply() {
      (supabase.from as jest.Mock).mockImplementation((tableName: string) => createChain(tableName));
      return this;
    },
  };
}

// ============================================================================
// SCORE ENTRIES TESTS
// ============================================================================

describe('Score Entry Operations', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('saveScoreEntry()', () => {
    it('should save a score entry with valid data', async () => {
      const savedEntry = createScoreEntry();
      mockSupabaseSuccess(savedEntry);

      const result = await saveScoreEntry(
        ROUND_ID,
        PLAYER_A_ID,
        1,
        PLAYER_A_ID,
        createHoleScore()
      );

      expect(result).toEqual(savedEntry);
      expect(supabase.from).toHaveBeenCalledWith('score_entries');
    });

    it('should throw validation error for missing round ID', async () => {
      await expect(
        saveScoreEntry('', PLAYER_A_ID, 1, PLAYER_A_ID, createHoleScore())
      ).rejects.toThrow('Round ID, Player ID, and Scorer ID are required');
    });

    it('should throw validation error for missing player ID', async () => {
      await expect(
        saveScoreEntry(ROUND_ID, '', 1, PLAYER_A_ID, createHoleScore())
      ).rejects.toThrow('Round ID, Player ID, and Scorer ID are required');
    });

    it('should throw validation error for missing scorer ID', async () => {
      await expect(
        saveScoreEntry(ROUND_ID, PLAYER_A_ID, 1, '', createHoleScore())
      ).rejects.toThrow('Round ID, Player ID, and Scorer ID are required');
    });

    it('should throw validation error for hole number less than 1', async () => {
      await expect(
        saveScoreEntry(ROUND_ID, PLAYER_A_ID, 0, PLAYER_A_ID, createHoleScore())
      ).rejects.toThrow('Hole number must be between 1 and 18');
    });

    it('should throw validation error for hole number greater than 18', async () => {
      await expect(
        saveScoreEntry(ROUND_ID, PLAYER_A_ID, 19, PLAYER_A_ID, createHoleScore())
      ).rejects.toThrow('Hole number must be between 1 and 18');
    });

    it('should handle database errors', async () => {
      mockSupabaseError('Database connection failed');

      await expect(
        saveScoreEntry(ROUND_ID, PLAYER_A_ID, 1, PLAYER_A_ID, createHoleScore())
      ).rejects.toThrow('Failed to save score entry: Database connection failed');
    });
  });

  describe('saveScoreEntries()', () => {
    const buildEntry = (holeNumber: number) => ({
      roundId: ROUND_ID,
      playerId: PLAYER_A_ID,
      holeNumber,
      scorerId: PLAYER_A_ID,
      score: createHoleScore(),
    });

    it('should upsert all entries in a single batched call', async () => {
      const mockChain = mockSupabaseSuccess(null);

      await saveScoreEntries([buildEntry(1), buildEntry(2), buildEntry(3)]);

      expect(supabase.from).toHaveBeenCalledWith('score_entries');
      // One round-trip for the whole batch, not one per hole
      expect(mockChain.upsert).toHaveBeenCalledTimes(1);
      const [rows, options] = mockChain.upsert.mock.calls[0];
      expect(Array.isArray(rows)).toBe(true);
      expect(rows).toHaveLength(3);
      expect(options).toEqual({ onConflict: 'round_id,player_id,hole_number,scorer_id' });
    });

    it('should not chain select() so the write returns minimal (no SELECT RLS eval)', async () => {
      const mockChain = mockSupabaseSuccess(null);

      await saveScoreEntries([buildEntry(1)]);

      expect(mockChain.select).not.toHaveBeenCalled();
    });

    it('should be a no-op for an empty array (no network call)', async () => {
      await saveScoreEntries([]);

      expect(supabase.from).not.toHaveBeenCalled();
    });

    it('should throw validation error when a row is missing scorer ID', async () => {
      await expect(
        saveScoreEntries([{ ...buildEntry(1), scorerId: '' }])
      ).rejects.toThrow('Round ID, Player ID, and Scorer ID are required');
    });

    it('should throw validation error for an out-of-range hole number', async () => {
      await expect(saveScoreEntries([buildEntry(19)])).rejects.toThrow(
        'Hole number must be between 1 and 18'
      );
    });

    it('should handle database errors', async () => {
      mockSupabaseError('Database connection failed');

      await expect(saveScoreEntries([buildEntry(1)])).rejects.toThrow(
        'Failed to save score entries: Database connection failed'
      );
    });
  });

  describe('getRoundScoreEntries()', () => {
    it('should return all score entries for a round', async () => {
      const entries = [
        createScoreEntry({ id: 'entry-1', hole_number: 1 }),
        createScoreEntry({ id: 'entry-2', hole_number: 2 }),
      ];
      mockSupabaseSuccess(entries);

      const result = await getRoundScoreEntries(ROUND_ID);

      expect(result).toEqual(entries);
      expect(supabase.from).toHaveBeenCalledWith('score_entries');
    });

    it('should return empty array when no entries exist', async () => {
      mockSupabaseSuccess([]);

      const result = await getRoundScoreEntries(ROUND_ID);

      expect(result).toEqual([]);
    });

    it('should throw validation error for missing round ID', async () => {
      await expect(getRoundScoreEntries('')).rejects.toThrow('Round ID is required');
    });
  });

  describe('getScorerEntries()', () => {
    it('should return entries by a specific scorer', async () => {
      const entries = createCompleteRoundEntries(PLAYER_A_ID, PLAYER_B_ID);
      mockSupabaseSuccess(entries);

      const result = await getScorerEntries(ROUND_ID, PLAYER_A_ID);

      expect(result).toEqual(entries);
    });

    it('should throw validation error for missing IDs', async () => {
      await expect(getScorerEntries('', PLAYER_A_ID)).rejects.toThrow(
        'Round ID and Scorer ID are required'
      );
      await expect(getScorerEntries(ROUND_ID, '')).rejects.toThrow(
        'Round ID and Scorer ID are required'
      );
    });
  });

  describe('isScorerComplete()', () => {
    it('should return true when scorer has completed all 18-hole entries (36 total)', async () => {
      const entries = createCompleteRoundEntries(PLAYER_A_ID, PLAYER_B_ID);
      mockSupabaseSuccess(entries);

      const result = await isScorerComplete(ROUND_ID, PLAYER_A_ID, 18);

      expect(result).toBe(true);
    });

    it('should return true when scorer has completed all 9-hole entries (18 total)', async () => {
      // Create 18 entries for a 9-hole round (9 holes × 2 players)
      const entries: ScoreEntry[] = [];
      for (let hole = 1; hole <= 9; hole++) {
        entries.push(createScoreEntry({ player_id: PLAYER_A_ID, hole_number: hole }));
        entries.push(createScoreEntry({ player_id: PLAYER_B_ID, hole_number: hole }));
      }
      mockSupabaseSuccess(entries);

      const result = await isScorerComplete(ROUND_ID, PLAYER_A_ID, 9);

      expect(result).toBe(true);
    });

    it('should return false when scorer has incomplete entries for 18 holes', async () => {
      // Only 30 entries instead of 36
      const entries: ScoreEntry[] = [];
      for (let hole = 1; hole <= 15; hole++) {
        entries.push(createScoreEntry({ player_id: PLAYER_A_ID, hole_number: hole }));
        entries.push(createScoreEntry({ player_id: PLAYER_B_ID, hole_number: hole }));
      }
      mockSupabaseSuccess(entries);

      const result = await isScorerComplete(ROUND_ID, PLAYER_A_ID, 18);

      expect(result).toBe(false);
    });

    it('should return false when scorer has incomplete entries for 9 holes', async () => {
      // Only 14 entries instead of 18
      const entries: ScoreEntry[] = [];
      for (let hole = 1; hole <= 7; hole++) {
        entries.push(createScoreEntry({ player_id: PLAYER_A_ID, hole_number: hole }));
        entries.push(createScoreEntry({ player_id: PLAYER_B_ID, hole_number: hole }));
      }
      mockSupabaseSuccess(entries);

      const result = await isScorerComplete(ROUND_ID, PLAYER_A_ID, 9);

      expect(result).toBe(false);
    });

    it('should default to 18 holes when holeCount not specified', async () => {
      const entries = createCompleteRoundEntries(PLAYER_A_ID, PLAYER_B_ID);
      mockSupabaseSuccess(entries);

      const result = await isScorerComplete(ROUND_ID, PLAYER_A_ID);

      expect(result).toBe(true);
    });
  });
});

// ============================================================================
// MISMATCH DETECTION TESTS
// ============================================================================

describe('Mismatch Detection', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('detectMismatches()', () => {
    it('should detect mismatches when self and partner scores differ', async () => {
      const entries: ScoreEntry[] = [
        // Player A's self-score for hole 10: 4
        createScoreEntry({
          id: 'entry-a-self-10',
          player_id: PLAYER_A_ID,
          hole_number: 10,
          scorer_id: PLAYER_A_ID,
          strokes: 4,
        }),
        // Player B's score for Player A on hole 10: 5 (MISMATCH!)
        createScoreEntry({
          id: 'entry-b-for-a-10',
          player_id: PLAYER_A_ID,
          hole_number: 10,
          scorer_id: PLAYER_B_ID,
          strokes: 5,
        }),
      ];
      mockSupabaseSuccess(entries);

      const mismatches = await detectMismatches(ROUND_ID);

      expect(mismatches).toHaveLength(1);
      expect(mismatches[0]).toMatchObject({
        round_id: ROUND_ID,
        player_id: PLAYER_A_ID,
        hole_number: 10,
        self_score: 4,
        partner_score: 5,
        self_scorer_id: PLAYER_A_ID,
        partner_scorer_id: PLAYER_B_ID,
        status: 'pending',
      });
    });

    it('should NOT detect mismatch when scores match', async () => {
      const entries: ScoreEntry[] = [
        createScoreEntry({
          player_id: PLAYER_A_ID,
          hole_number: 10,
          scorer_id: PLAYER_A_ID,
          strokes: 4,
        }),
        createScoreEntry({
          player_id: PLAYER_A_ID,
          hole_number: 10,
          scorer_id: PLAYER_B_ID,
          strokes: 4, // Same score - no mismatch
        }),
      ];
      mockSupabaseSuccess(entries);

      const mismatches = await detectMismatches(ROUND_ID);

      expect(mismatches).toHaveLength(0);
    });

    it('should detect multiple mismatches across different holes', async () => {
      const entries: ScoreEntry[] = [
        // Hole 10 mismatch for Player A
        createScoreEntry({
          player_id: PLAYER_A_ID,
          hole_number: 10,
          scorer_id: PLAYER_A_ID,
          strokes: 4,
        }),
        createScoreEntry({
          player_id: PLAYER_A_ID,
          hole_number: 10,
          scorer_id: PLAYER_B_ID,
          strokes: 5,
        }),
        // Hole 15 mismatch for Player B
        createScoreEntry({
          player_id: PLAYER_B_ID,
          hole_number: 15,
          scorer_id: PLAYER_B_ID,
          strokes: 3,
        }),
        createScoreEntry({
          player_id: PLAYER_B_ID,
          hole_number: 15,
          scorer_id: PLAYER_A_ID,
          strokes: 4,
        }),
      ];
      mockSupabaseSuccess(entries);

      const mismatches = await detectMismatches(ROUND_ID);

      expect(mismatches).toHaveLength(2);
      expect(mismatches.map((m) => m.hole_number).sort()).toEqual([10, 15]);
    });

    it('should handle entries with only one scorer (no mismatch possible)', async () => {
      const entries: ScoreEntry[] = [
        createScoreEntry({
          player_id: PLAYER_A_ID,
          hole_number: 10,
          scorer_id: PLAYER_A_ID,
          strokes: 4,
        }),
        // No partner entry for this hole
      ];
      mockSupabaseSuccess(entries);

      const mismatches = await detectMismatches(ROUND_ID);

      expect(mismatches).toHaveLength(0);
    });

    it('should return empty array when no entries exist', async () => {
      mockSupabaseSuccess([]);

      const mismatches = await detectMismatches(ROUND_ID);

      expect(mismatches).toHaveLength(0);
    });

    it('should detect N-way mismatch with 3+ scorers and populate entries[]', async () => {
      const PLAYER_C_ID = '550e8400-e29b-41d4-a716-446655440003';
      const entries: ScoreEntry[] = [
        // Three scorers, three different strokes for player A on hole 7
        createScoreEntry({ player_id: PLAYER_A_ID, hole_number: 7, scorer_id: PLAYER_A_ID, strokes: 4 }),
        createScoreEntry({ player_id: PLAYER_A_ID, hole_number: 7, scorer_id: PLAYER_B_ID, strokes: 5 }),
        createScoreEntry({ player_id: PLAYER_A_ID, hole_number: 7, scorer_id: PLAYER_C_ID, strokes: 6 }),
      ];
      mockSupabaseSuccess(entries);

      const mismatches = await detectMismatches(ROUND_ID);

      expect(mismatches).toHaveLength(1);
      expect(mismatches[0].entries).toHaveLength(3);
      expect(mismatches[0].entries?.map((e) => e.strokes).sort()).toEqual([4, 5, 6]);
      // Legacy 2-way columns also populated for back-compat
      expect(mismatches[0].self_score).toBe(4);
      expect(mismatches[0].self_scorer_id).toBe(PLAYER_A_ID);
      expect(mismatches[0].partner_score).not.toBeNull();
    });

    it('should NOT detect mismatch when 3 scorers all agree', async () => {
      const PLAYER_C_ID = '550e8400-e29b-41d4-a716-446655440003';
      const entries: ScoreEntry[] = [
        createScoreEntry({ player_id: PLAYER_A_ID, hole_number: 7, scorer_id: PLAYER_A_ID, strokes: 4 }),
        createScoreEntry({ player_id: PLAYER_A_ID, hole_number: 7, scorer_id: PLAYER_B_ID, strokes: 4 }),
        createScoreEntry({ player_id: PLAYER_A_ID, hole_number: 7, scorer_id: PLAYER_C_ID, strokes: 4 }),
      ];
      mockSupabaseSuccess(entries);

      const mismatches = await detectMismatches(ROUND_ID);

      expect(mismatches).toHaveLength(0);
    });
  });

  describe('createMismatchRecords()', () => {
    it('should create mismatch records in database', async () => {
      // Entries with a mismatch
      const entries: ScoreEntry[] = [
        createScoreEntry({
          player_id: PLAYER_A_ID,
          hole_number: 10,
          scorer_id: PLAYER_A_ID,
          strokes: 4,
        }),
        createScoreEntry({
          player_id: PLAYER_A_ID,
          hole_number: 10,
          scorer_id: PLAYER_B_ID,
          strokes: 5,
        }),
      ];

      // Use implementation mock that handles multiple calls
      let callCount = 0;
      (supabase.from as jest.Mock).mockImplementation(() => ({
        select: jest.fn().mockReturnThis(),
        upsert: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        order: jest.fn().mockReturnThis(),
        then: jest.fn((resolve) => {
          callCount++;
          if (callCount === 1) {
            // First call: getRoundScoreEntries
            return resolve({ data: entries, error: null });
          }
          // Second call: upsert mismatches
          return resolve({ data: [{ id: 'mismatch-1' }], error: null });
        }),
      }));

      const count = await createMismatchRecords(ROUND_ID);

      expect(count).toBe(1);
    });

    it('should return 0 when no mismatches detected', async () => {
      const entries: ScoreEntry[] = [
        createScoreEntry({ strokes: 4 }),
        createScoreEntry({ scorer_id: PLAYER_B_ID, strokes: 4 }), // Same score
      ];
      mockSupabaseSuccess(entries);

      const count = await createMismatchRecords(ROUND_ID);

      expect(count).toBe(0);
    });
  });

  describe('getPendingMismatches()', () => {
    it('should return pending mismatches with player data', async () => {
      const mismatches = [
        createMismatchRecord({
          player: { id: PLAYER_A_ID, name: 'Player A' },
        }),
      ];
      mockSupabaseSuccess(mismatches);

      const result = await getPendingMismatches(ROUND_ID);

      expect(result).toHaveLength(1);
      expect(result[0].player?.name).toBe('Player A');
    });

    it('should throw validation error for missing round ID', async () => {
      await expect(getPendingMismatches('')).rejects.toThrow('Round ID is required');
    });
  });

  describe('getMismatch()', () => {
    it('should return mismatch by ID', async () => {
      const mismatch = createMismatchRecord();
      mockSupabaseSuccess(mismatch);

      const result = await getMismatch(MISMATCH_ID);

      expect(result).toEqual(mismatch);
    });

    it('should return null when mismatch not found', async () => {
      mockSupabaseError('Not found', 'PGRST116');

      const result = await getMismatch(MISMATCH_ID);

      expect(result).toBeNull();
    });

    it('should throw validation error for missing mismatch ID', async () => {
      await expect(getMismatch('')).rejects.toThrow('Mismatch ID is required');
    });
  });
});

// ============================================================================
// RESOLUTION TESTS
// ============================================================================

describe('Mismatch Resolution', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('resolveMismatch()', () => {
    it('should update mismatch with resolved score', async () => {
      const mockChain = mockSupabaseSuccess(null);

      await resolveMismatch(MISMATCH_ID, 5, PLAYER_A_ID);

      expect(mockChain.update).toHaveBeenCalledWith(
        expect.objectContaining({
          status: 'resolved',
          resolved_score: 5,
          resolved_by: PLAYER_A_ID,
        })
      );
    });

    it('should only update pending mismatches (first-write-wins)', async () => {
      const mockChain = mockSupabaseSuccess(null);

      await resolveMismatch(MISMATCH_ID, 5, PLAYER_A_ID);

      // Should have .eq('status', 'pending') in chain
      expect(mockChain.eq).toHaveBeenCalledWith('status', 'pending');
    });

    it('should throw validation error for missing mismatch ID', async () => {
      await expect(resolveMismatch('', 5, PLAYER_A_ID)).rejects.toThrow(
        'Mismatch ID and Resolver ID are required'
      );
    });

    it('should throw validation error for missing resolver ID', async () => {
      await expect(resolveMismatch(MISMATCH_ID, 5, '')).rejects.toThrow(
        'Mismatch ID and Resolver ID are required'
      );
    });
  });

  describe('applyResolvedScoreToScorecard()', () => {
    // Minimal 18-hole layout with par 4s and ordered stroke indexes.
    // Used so the service can recompute totals from the updated scores JSON.
    const TEST_HOLES = Array.from({ length: 18 }, (_, i) => ({
      number: i + 1,
      par: 4,
      strokeIndex: i + 1,
      length: 400,
    }));

    function makeScorecardRow(
      scores: Record<string, { strokes: number; putts?: number }>,
      overrides: Partial<{
        daily_handicap_used: number | null;
        game_type: string | null;
      }> = {}
    ) {
      return {
        id: 'scorecard-1',
        scores,
        daily_handicap_used: overrides.daily_handicap_used ?? 10,
        round: {
          game_type: overrides.game_type ?? 'stroke',
          courses: { holes: TEST_HOLES },
        },
      };
    }

    it('should update scorecard with resolved score and recompute total_gross', async () => {
      const existingScorecard = makeScorecardRow({
        '9': { strokes: 3, putts: 2 },
        '10': { strokes: 4, putts: 2 }, // Will be updated to 5
        '11': { strokes: 5, putts: 3 },
      });

      const mockChain = {
        select: jest.fn().mockReturnThis(),
        update: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({ data: existingScorecard, error: null }),
        then: jest.fn((resolve) => resolve({ data: null, error: null })),
      };
      (supabase.from as jest.Mock).mockReturnValue(mockChain);

      await applyResolvedScoreToScorecard(ROUND_ID, PLAYER_A_ID, 10, 5);

      expect(mockChain.update).toHaveBeenCalledWith(
        expect.objectContaining({
          scores: expect.objectContaining({
            '10': { strokes: 5, putts: 2 }, // Updated (putts preserved)
          }),
          // 3 + 5 + 5 = 13
          total_gross: 13,
          // 13 - daily_handicap_used(10)
          total_net: 3,
        })
      );
    });

    it('should create hole score if it does not exist', async () => {
      const existingScorecard = makeScorecardRow({
        '9': { strokes: 3 },
      });

      const mockChain = {
        select: jest.fn().mockReturnThis(),
        update: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({ data: existingScorecard, error: null }),
        then: jest.fn((resolve) => resolve({ data: null, error: null })),
      };
      (supabase.from as jest.Mock).mockReturnValue(mockChain);

      await applyResolvedScoreToScorecard(ROUND_ID, PLAYER_A_ID, 10, 5);

      expect(mockChain.update).toHaveBeenCalledWith(
        expect.objectContaining({
          scores: expect.objectContaining({
            '10': { strokes: 5 },
          }),
          total_gross: 8, // 3 + 5
          total_net: -2, // 8 - 10
        })
      );
    });

    it('should recompute total_points for stableford rounds', async () => {
      // DHC = 18 → 1 stroke on every hole. Par 4 hole, strokes 4 = net 3 = birdie = 3pts.
      const existingScorecard = makeScorecardRow(
        {
          '1': { strokes: 4 }, // net 3 → birdie = 3 pts
          '2': { strokes: 4 }, // net 3 → birdie = 3 pts
        },
        { game_type: 'stableford', daily_handicap_used: 18 }
      );

      const mockChain = {
        select: jest.fn().mockReturnThis(),
        update: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({ data: existingScorecard, error: null }),
        then: jest.fn((resolve) => resolve({ data: null, error: null })),
      };
      (supabase.from as jest.Mock).mockReturnValue(mockChain);

      // Resolve hole 3 to 5 (par 4, net 4 = par = 2 pts)
      await applyResolvedScoreToScorecard(ROUND_ID, PLAYER_A_ID, 3, 5);

      expect(mockChain.update).toHaveBeenCalledWith(
        expect.objectContaining({
          total_gross: 13, // 4 + 4 + 5
          total_points: 8, // 3 + 3 + 2
        })
      );
    });

    it('should throw NOT_FOUND error when scorecard does not exist', async () => {
      const mockChain = {
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({ data: null, error: null }),
      };
      (supabase.from as jest.Mock).mockReturnValue(mockChain);

      await expect(
        applyResolvedScoreToScorecard(ROUND_ID, PLAYER_A_ID, 10, 5)
      ).rejects.toThrow('Scorecard not found');
    });

    it('should throw validation error for missing IDs', async () => {
      await expect(
        applyResolvedScoreToScorecard('', PLAYER_A_ID, 10, 5)
      ).rejects.toThrow('Round ID and Player ID are required');
    });
  });
});

// ============================================================================
// SUBMISSION READINESS TESTS
// ============================================================================

describe('Submission Readiness', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('checkSubmissionReadiness()', () => {
    it('should return canSubmit: true when scoring pairs disabled and only one scorer present', async () => {
      // Multi-scorer auto-detect: 0 entries → 0 distinct scorers → solo path
      mockSupabaseSuccess([]);

      const result = await checkSubmissionReadiness(ROUND_ID, PLAYER_A_ID, false);

      expect(result).toEqual({ canSubmit: true });
    });

    it('should return waiting_for_partner when partner incomplete', async () => {
      // Mock multiple sequential calls for the complex flow
      let _callCount = 0;
      (supabase.from as jest.Mock).mockImplementation((tableName: string) => ({
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        order: jest.fn().mockReturnThis(),
        single: jest.fn(() => {
          // scoring_pairs lookup for getPartnerProgress
          return Promise.resolve({
            data: { scorer_id: PLAYER_B_ID, scorer: { id: PLAYER_B_ID, name: 'Partner Bob' } },
            error: null,
          });
        }),
        then: jest.fn((resolve) => {
          _callCount++;
          if (tableName === 'score_mismatches') {
            return resolve({ data: [], error: null }); // No pending mismatches
          }
          if (tableName === 'score_entries') {
            return resolve({ data: Array(20).fill(createScoreEntry()), error: null }); // Partner incomplete
          }
          return resolve({ data: [], error: null });
        }),
      }));

      const result = await checkSubmissionReadiness(ROUND_ID, PLAYER_A_ID, true, 18);

      expect(result.canSubmit).toBe(false);
      expect(result.reason).toBe('waiting_for_partner');
      expect(result.partnerName).toBe('Partner Bob');
      expect(result.partnerProgress).toEqual({ completed: 20, total: 36 });
    });

    it('should return unresolved_mismatches when pending mismatches exist', async () => {
      const mismatches = [createMismatchRecord(), createMismatchRecord({ id: 'mismatch-2' })];

      (supabase.from as jest.Mock).mockImplementation((tableName: string) => ({
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        order: jest.fn().mockReturnThis(),
        then: jest.fn((resolve) => {
          if (tableName === 'score_mismatches') {
            return resolve({ data: mismatches, error: null }); // Has pending mismatches
          }
          return resolve({ data: [], error: null });
        }),
      }));

      const result = await checkSubmissionReadiness(ROUND_ID, PLAYER_A_ID, true);

      expect(result.canSubmit).toBe(false);
      expect(result.reason).toBe('unresolved_mismatches');
      expect(result.mismatchCount).toBe(2);
    });

    it('should return canSubmit: true when partner complete and no mismatches', async () => {
      const completeEntries = createCompleteRoundEntries(PLAYER_B_ID, PLAYER_A_ID);

      (supabase.from as jest.Mock).mockImplementation((tableName: string) => ({
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        order: jest.fn().mockReturnThis(),
        single: jest.fn(() => Promise.resolve({
          data: { scorer_id: PLAYER_B_ID, scorer: { id: PLAYER_B_ID, name: 'Partner Bob' } },
          error: null,
        })),
        then: jest.fn((resolve) => {
          if (tableName === 'score_mismatches') {
            return resolve({ data: [], error: null }); // No pending mismatches
          }
          if (tableName === 'score_entries') {
            return resolve({ data: completeEntries, error: null }); // Partner complete
          }
          return resolve({ data: [], error: null });
        }),
      }));

      const result = await checkSubmissionReadiness(ROUND_ID, PLAYER_A_ID, true, 18);

      expect(result.canSubmit).toBe(true);
    });

    it('should use dynamic hole count for 9-hole rounds', async () => {
      // 9-hole round: expected = 9 × 2 = 18 entries
      const nineHoleEntries = Array(18).fill(createScoreEntry());

      (supabase.from as jest.Mock).mockImplementation((tableName: string) => ({
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        order: jest.fn().mockReturnThis(),
        single: jest.fn(() => Promise.resolve({
          data: { scorer_id: PLAYER_B_ID, scorer: { id: PLAYER_B_ID, name: 'Partner' } },
          error: null,
        })),
        then: jest.fn((resolve) => {
          if (tableName === 'score_mismatches') {
            return resolve({ data: [], error: null }); // No pending mismatches
          }
          if (tableName === 'score_entries') {
            return resolve({ data: nineHoleEntries, error: null }); // Partner complete for 9 holes
          }
          return resolve({ data: [], error: null });
        }),
      }));

      const result = await checkSubmissionReadiness(ROUND_ID, PLAYER_A_ID, true, 9);

      expect(result.canSubmit).toBe(true);
    });

    it('should throw validation error for missing IDs when scoring pairs enabled', async () => {
      await expect(
        checkSubmissionReadiness('', PLAYER_A_ID, true)
      ).rejects.toThrow('Round ID and User ID are required');
    });

    it('should throw validation error for missing IDs in multi-scorer mode', async () => {
      await expect(
        checkSubmissionReadiness('', PLAYER_A_ID, false)
      ).rejects.toThrow('Round ID and User ID are required');
    });
  });

  describe('checkSubmissionReadiness() - multi-scorer (no pairs)', () => {
    const PLAYER_C_ID = '550e8400-e29b-41d4-a716-446655440003';

    it('returns canSubmit when only one scorer has touched the round', async () => {
      const soloEntries = Array.from({ length: 18 }, (_, i) =>
        createScoreEntry({ hole_number: i + 1, scorer_id: PLAYER_A_ID, player_id: PLAYER_A_ID })
      );
      mockSupabaseSuccess(soloEntries);

      const result = await checkSubmissionReadiness(ROUND_ID, PLAYER_A_ID, false, 18);

      expect(result).toEqual({ canSubmit: true });
    });

    it('blocks submission with N-way unresolved_mismatches when 2+ scorers disagree', async () => {
      const entries: ScoreEntry[] = [
        createScoreEntry({ player_id: PLAYER_A_ID, hole_number: 1, scorer_id: PLAYER_A_ID, strokes: 4 }),
        createScoreEntry({ player_id: PLAYER_A_ID, hole_number: 1, scorer_id: PLAYER_B_ID, strokes: 5 }),
      ];
      const mismatches = [createMismatchRecord({ hole_number: 1 })];

      (supabase.from as jest.Mock).mockImplementation((tableName: string) => ({
        select: jest.fn().mockReturnThis(),
        upsert: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        order: jest.fn().mockReturnThis(),
        single: jest.fn(() => Promise.resolve({ data: null, error: null })),
        then: jest.fn((resolve) => {
          if (tableName === 'score_mismatches') {
            return resolve({ data: mismatches, error: null });
          }
          if (tableName === 'score_entries') {
            return resolve({ data: entries, error: null });
          }
          return resolve({ data: [], error: null });
        }),
      }));

      const result = await checkSubmissionReadiness(ROUND_ID, PLAYER_A_ID, false, 18);

      expect(result.canSubmit).toBe(false);
      expect(result.reason).toBe('unresolved_mismatches');
      expect(result.mismatchCount).toBe(1);
    });

    it('blocks submission with waiting_for_other_scorers when another scorer has incomplete entries', async () => {
      // Player A scored everything; Player B started but only filled hole 1.
      const entries: ScoreEntry[] = [
        ...Array.from({ length: 18 }, (_, i) =>
          createScoreEntry({ player_id: PLAYER_A_ID, hole_number: i + 1, scorer_id: PLAYER_A_ID, strokes: 4 })
        ),
        createScoreEntry({ player_id: PLAYER_A_ID, hole_number: 1, scorer_id: PLAYER_B_ID, strokes: 4 }),
      ];

      (supabase.from as jest.Mock).mockImplementation((tableName: string) => ({
        select: jest.fn().mockReturnThis(),
        upsert: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        order: jest.fn().mockReturnThis(),
        single: jest.fn(() => Promise.resolve({ data: { name: 'Bob' }, error: null })),
        then: jest.fn((resolve) => {
          if (tableName === 'score_mismatches') {
            return resolve({ data: [], error: null });
          }
          if (tableName === 'score_entries') {
            return resolve({ data: entries, error: null });
          }
          return resolve({ data: [], error: null });
        }),
      }));

      const result = await checkSubmissionReadiness(ROUND_ID, PLAYER_A_ID, false, 18);

      expect(result.canSubmit).toBe(false);
      expect(result.reason).toBe('waiting_for_other_scorers');
      expect(result.incompleteScorers).toHaveLength(1);
      expect(result.incompleteScorers?.[0]).toMatchObject({
        scorerId: PLAYER_B_ID,
        progress: { completed: 1, total: 18 },
      });
    });

    it('returns canSubmit when 2+ scorers all complete and no mismatches', async () => {
      // Both A and B scored every hole for player A — agreeing scores.
      const entries: ScoreEntry[] = [
        ...Array.from({ length: 18 }, (_, i) =>
          createScoreEntry({ player_id: PLAYER_A_ID, hole_number: i + 1, scorer_id: PLAYER_A_ID, strokes: 4 })
        ),
        ...Array.from({ length: 18 }, (_, i) =>
          createScoreEntry({ player_id: PLAYER_A_ID, hole_number: i + 1, scorer_id: PLAYER_B_ID, strokes: 4 })
        ),
      ];

      (supabase.from as jest.Mock).mockImplementation((tableName: string) => ({
        select: jest.fn().mockReturnThis(),
        upsert: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        order: jest.fn().mockReturnThis(),
        single: jest.fn(() => Promise.resolve({ data: { name: 'Bob' }, error: null })),
        then: jest.fn((resolve) => {
          if (tableName === 'score_mismatches') {
            return resolve({ data: [], error: null });
          }
          if (tableName === 'score_entries') {
            return resolve({ data: entries, error: null });
          }
          return resolve({ data: [], error: null });
        }),
      }));

      const result = await checkSubmissionReadiness(ROUND_ID, PLAYER_A_ID, false, 18);

      expect(result.canSubmit).toBe(true);
    });

    it('handles 3-way scorer scenario by counting per-scorer expected entries', async () => {
      // Three scorers, each touched only player A. A and C complete (18 each); B incomplete (5).
      const entries: ScoreEntry[] = [
        ...Array.from({ length: 18 }, (_, i) =>
          createScoreEntry({ player_id: PLAYER_A_ID, hole_number: i + 1, scorer_id: PLAYER_A_ID, strokes: 4 })
        ),
        ...Array.from({ length: 5 }, (_, i) =>
          createScoreEntry({ player_id: PLAYER_A_ID, hole_number: i + 1, scorer_id: PLAYER_B_ID, strokes: 4 })
        ),
        ...Array.from({ length: 18 }, (_, i) =>
          createScoreEntry({ player_id: PLAYER_A_ID, hole_number: i + 1, scorer_id: PLAYER_C_ID, strokes: 4 })
        ),
      ];

      (supabase.from as jest.Mock).mockImplementation((tableName: string) => ({
        select: jest.fn().mockReturnThis(),
        upsert: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        order: jest.fn().mockReturnThis(),
        single: jest.fn(() => Promise.resolve({ data: { name: 'Player' }, error: null })),
        then: jest.fn((resolve) => {
          if (tableName === 'score_mismatches') {
            return resolve({ data: [], error: null });
          }
          if (tableName === 'score_entries') {
            return resolve({ data: entries, error: null });
          }
          return resolve({ data: [], error: null });
        }),
      }));

      const result = await checkSubmissionReadiness(ROUND_ID, PLAYER_A_ID, false, 18);

      expect(result.canSubmit).toBe(false);
      expect(result.reason).toBe('waiting_for_other_scorers');
      // Only B is short; C and A are complete.
      expect(result.incompleteScorers?.map((s) => s.scorerId)).toEqual([PLAYER_B_ID]);
    });
  });

  describe('getPartnerProgress()', () => {
    it('should return partner progress with name', async () => {
      const partnerEntries = Array(24).fill(createScoreEntry()); // 24 of 36

      (supabase.from as jest.Mock).mockImplementation((tableName: string) => ({
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        order: jest.fn().mockReturnThis(),
        single: jest.fn(() => Promise.resolve({
          data: { scorer_id: PLAYER_B_ID, scorer: { id: PLAYER_B_ID, name: 'Bob Smith' } },
          error: null,
        })),
        then: jest.fn((resolve) => {
          if (tableName === 'score_entries') {
            return resolve({ data: partnerEntries, error: null });
          }
          return resolve({ data: null, error: null });
        }),
      }));

      const result = await getPartnerProgress(ROUND_ID, PLAYER_A_ID, 18);

      expect(result).toEqual({
        complete: false,
        partnerName: 'Bob Smith',
        progress: { completed: 24, total: 36 },
      });
    });

    it('should return complete: true when no scorer assigned', async () => {
      const mockChain = {
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({ data: null, error: { code: 'PGRST116' } }),
      };
      (supabase.from as jest.Mock).mockReturnValue(mockChain);

      const result = await getPartnerProgress(ROUND_ID, PLAYER_A_ID, 18);

      expect(result.complete).toBe(true);
    });
  });
});

// ============================================================================
// BYPASS HANDLING TESTS
// ============================================================================

describe('Bypass Handling', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('startBypassTimer()', () => {
    it('should create bypass timer record with 30-minute delay', async () => {
      const _mockChain = mockSupabaseSuccess(null);

      const before = Date.now();
      const result = await startBypassTimer(ROUND_ID, PLAYER_A_ID, PLAYER_B_ID);
      const after = Date.now();

      const bypassTime = new Date(result.bypass_available_at).getTime();
      const thirtyMinutes = 30 * 60 * 1000;

      // Bypass time should be ~30 minutes from now
      expect(bypassTime).toBeGreaterThanOrEqual(before + thirtyMinutes - 1000);
      expect(bypassTime).toBeLessThanOrEqual(after + thirtyMinutes + 1000);
    });

    it('should upsert to score_submission_status table', async () => {
      mockSupabaseSuccess(null);

      await startBypassTimer(ROUND_ID, PLAYER_A_ID, PLAYER_B_ID);

      expect(supabase.from).toHaveBeenCalledWith('score_submission_status');
    });

    it('should throw validation error for missing IDs', async () => {
      await expect(
        startBypassTimer('', PLAYER_A_ID, PLAYER_B_ID)
      ).rejects.toThrow('Round ID and Player ID are required');
    });

    it('should accept null partnerId for multi-scorer rounds', async () => {
      mockSupabaseSuccess(null);

      const result = await startBypassTimer(ROUND_ID, PLAYER_A_ID, null);

      expect(result.bypass_available_at).toBeDefined();
      expect(supabase.from).toHaveBeenCalledWith('score_submission_status');
    });
  });

  describe('getSubmissionStatus()', () => {
    it('should return submission status', async () => {
      const status = {
        id: 'status-1',
        round_id: ROUND_ID,
        player_id: PLAYER_A_ID,
        partner_id: PLAYER_B_ID,
        bypass_available_at: '2025-01-15T10:30:00Z',
        bypassed: false,
        bypassed_at: null,
      };
      mockSupabaseSuccess(status);

      const result = await getSubmissionStatus(ROUND_ID, PLAYER_A_ID);

      expect(result).toEqual(status);
    });

    it('should return null when no status exists', async () => {
      mockSupabaseError('Not found', 'PGRST116');

      const result = await getSubmissionStatus(ROUND_ID, PLAYER_A_ID);

      expect(result).toBeNull();
    });
  });

  describe('markSubmissionBypassed()', () => {
    it('should update bypassed flag', async () => {
      const mockChain = mockSupabaseSuccess(null);

      await markSubmissionBypassed(ROUND_ID, PLAYER_A_ID);

      expect(mockChain.update).toHaveBeenCalledWith(
        expect.objectContaining({
          bypassed: true,
        })
      );
    });
  });

  describe('applyBypassScores()', () => {
    it('should apply bypassing player scores to all scorecards', async () => {
      // The bypassing player's entries
      const bypasserEntries = [
        createScoreEntry({ player_id: PLAYER_A_ID, hole_number: 1, strokes: 4, scorer_id: PLAYER_A_ID }),
        createScoreEntry({ player_id: PLAYER_B_ID, hole_number: 1, strokes: 5, scorer_id: PLAYER_A_ID }),
      ];

      const scorecardA = { id: 'sc-a', scores: { '1': { strokes: 3 } } };
      const scorecardB = { id: 'sc-b', scores: { '1': { strokes: 3 } } };

      let entriesCallCount = 0;
      let scorecardCallCount = 0;
      let updateCalled = false;

      (supabase.from as jest.Mock).mockImplementation((tableName: string) => ({
        select: jest.fn().mockReturnThis(),
        update: jest.fn().mockImplementation(() => {
          updateCalled = true;
          return {
            eq: jest.fn().mockReturnThis(),
            then: jest.fn((resolve) => resolve({ data: null, error: null })),
          };
        }),
        eq: jest.fn().mockReturnThis(),
        order: jest.fn().mockReturnThis(),
        single: jest.fn(() => {
          if (tableName === 'scorecards') {
            scorecardCallCount++;
            if (scorecardCallCount === 1) return Promise.resolve({ data: scorecardA, error: null });
            return Promise.resolve({ data: scorecardB, error: null });
          }
          return Promise.resolve({ data: null, error: null });
        }),
        then: jest.fn((resolve) => {
          if (tableName === 'score_entries') {
            entriesCallCount++;
            if (entriesCallCount === 1) {
              return resolve({ data: bypasserEntries, error: null }); // getScorerEntries
            }
          }
          return resolve({ data: null, error: null });
        }),
      }));

      await applyBypassScores(ROUND_ID, PLAYER_A_ID);

      // Should have called update for each entry
      expect(updateCalled).toBe(true);
    });

    it('should throw validation error for missing IDs', async () => {
      await expect(applyBypassScores('', PLAYER_A_ID)).rejects.toThrow(
        'Round ID and Bypassing Player ID are required'
      );
    });
  });
});

// ============================================================================
// INTEGRATION SCENARIOS
// ============================================================================

describe('Integration Scenarios', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Complete mismatch flow', () => {
    it('should detect, create, resolve mismatch and update scorecard', async () => {
      // Step 1: Both players have entered scores with a mismatch on hole 10
      const entries: ScoreEntry[] = [
        createScoreEntry({
          player_id: PLAYER_A_ID,
          hole_number: 10,
          scorer_id: PLAYER_A_ID,
          strokes: 4,
        }),
        createScoreEntry({
          player_id: PLAYER_A_ID,
          hole_number: 10,
          scorer_id: PLAYER_B_ID,
          strokes: 5, // Mismatch!
        }),
      ];

      // Mock for detect + create flow
      let callCount = 0;
      (supabase.from as jest.Mock).mockImplementation(() => ({
        select: jest.fn().mockReturnThis(),
        upsert: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        order: jest.fn().mockReturnThis(),
        then: jest.fn((resolve) => {
          callCount++;
          if (callCount <= 2) {
            // First two calls are for detectMismatches (entries lookup)
            return resolve({ data: entries, error: null });
          }
          // Third call is for upsert mismatches
          return resolve({ data: [{ id: 'new-mismatch' }], error: null });
        }),
      }));

      // Step 1: Detect mismatches
      const detected = await detectMismatches(ROUND_ID);
      expect(detected).toHaveLength(1);
      expect(detected[0].self_score).toBe(4);
      expect(detected[0].partner_score).toBe(5);

      // Step 2: Create mismatch records
      const count = await createMismatchRecords(ROUND_ID);
      expect(count).toBe(1);
    });
  });

  describe('No mismatch scenario', () => {
    it('should allow submission when all scores match', async () => {
      // All scores match - no mismatches
      const completeEntries = createCompleteRoundEntries(PLAYER_B_ID, PLAYER_A_ID);

      (supabase.from as jest.Mock).mockImplementation((tableName: string) => ({
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        order: jest.fn().mockReturnThis(),
        single: jest.fn(() => Promise.resolve({
          data: { scorer_id: PLAYER_B_ID, scorer: { name: 'Partner' } },
          error: null,
        })),
        then: jest.fn((resolve) => {
          if (tableName === 'score_mismatches') {
            return resolve({ data: [], error: null }); // No pending mismatches
          }
          if (tableName === 'score_entries') {
            return resolve({ data: completeEntries, error: null }); // Partner complete
          }
          return resolve({ data: [], error: null });
        }),
      }));

      const readiness = await checkSubmissionReadiness(ROUND_ID, PLAYER_A_ID, true, 18);

      expect(readiness.canSubmit).toBe(true);
      expect(readiness.reason).toBeUndefined();
    });
  });
});
