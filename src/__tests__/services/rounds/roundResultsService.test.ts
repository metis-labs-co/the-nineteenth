/**
 * Round Results Service Tests
 *
 * Tests the round results service for saving, fetching, and finalizing
 * round results in competitions.
 *
 * Covers:
 * - saveRoundResults() - Validation and database operations
 * - getRoundResults() - Fetching with player/team data
 * - getCompetitionResults() - Grouping by round
 * - finalizeRound() - Stableford, Stroke, and Match Play finalization
 * - finalizeTeamRound() - Team result finalization
 * - deleteRoundResults() - Cleanup operations
 * - isRoundFinalized() - Status checking
 */

import { supabase } from '@/services/supabase/client';
import {
  roundResultsService,
  saveRoundResults,
  getRoundResults,
  getCompetitionResults,
  finalizeRound,
  finalizeTeamRound,
  deleteRoundResults,
  isRoundFinalized,
  type SaveRoundResultInput,
} from '@/services/rounds/roundResultsService';
import type { Scorecard, PointSystemConfig, GameType, HoleScore, MultiBallHoleScore } from '@/types/database.types';
import {
  createTestScorecard,
  STANDARD_POINT_SYSTEM,
} from '../../utils/testFixtures';

// ============================================================================
// MOCK SETUP
// ============================================================================

// Track mock calls for assertions
let mockFrom: jest.Mock;
let mockSelect: jest.Mock;
let mockInsert: jest.Mock;
let mockDelete: jest.Mock;
let mockEq: jest.Mock;
let mockIn: jest.Mock;
let mockOrder: jest.Mock;

// Reset mocks before each test
beforeEach(() => {
  jest.clearAllMocks();

  // Create chainable mock methods
  mockOrder = jest.fn().mockResolvedValue({ data: [], error: null });
  mockIn = jest.fn(() => ({ order: mockOrder }));
  mockEq = jest.fn(() => ({ order: mockOrder, in: mockIn }));
  mockSelect = jest.fn(() => ({ eq: mockEq, in: mockIn, order: mockOrder }));
  mockInsert = jest.fn(() => ({ select: jest.fn().mockResolvedValue({ data: [], error: null }) }));
  mockDelete = jest.fn(() => ({ eq: mockEq }));

  mockFrom = jest.fn(() => ({
    select: mockSelect,
    insert: mockInsert,
    delete: mockDelete,
    eq: mockEq,
    in: mockIn,
    order: mockOrder,
  }));

  // Override supabase mock
  (supabase.from as jest.Mock).mockImplementation(mockFrom);
});

// ============================================================================
// TEST HELPERS
// ============================================================================

/**
 * Create a valid UUID for testing
 */
function createUUID(): string {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

/**
 * Create a test round result input
 */
function createTestResultInput(overrides: Partial<SaveRoundResultInput> = {}): SaveRoundResultInput {
  return {
    roundId: createUUID(),
    playerId: createUUID(),
    teamId: undefined,
    rawScore: 36,
    rawResultData: { stableford_points: 36 },
    position: 1,
    competitionPoints: 10,
    isTeamResult: false,
    ...overrides,
  };
}

/**
 * Create a test scorecard with Stableford points
 */
function createStablefordScorecard(
  playerId: string,
  roundId: string,
  totalPoints: number,
  overrides: Partial<Scorecard> = {}
): Scorecard {
  return createTestScorecard({
    id: `scorecard-${playerId}`,
    round_id: roundId,
    player_id: playerId,
    total_points: totalPoints,
    total_gross: 90,
    total_net: 72,
    status: 'completed',
    ...overrides,
  });
}

/**
 * Create a test scorecard with Stroke Play scores
 */
function createStrokeScorecard(
  playerId: string,
  roundId: string,
  grossScore: number,
  netScore: number,
  overrides: Partial<Scorecard> = {}
): Scorecard {
  return createTestScorecard({
    id: `scorecard-${playerId}`,
    round_id: roundId,
    player_id: playerId,
    total_gross: grossScore,
    total_net: netScore,
    total_points: 0,
    status: 'completed',
    ...overrides,
  });
}

/**
 * Create a test scorecard with Match Play data
 */
function createMatchPlayScorecard(
  playerId: string,
  roundId: string,
  opponentId: string,
  result: 'win' | 'loss' | 'halved',
  margin: string = '2&1',
  overrides: Partial<Scorecard> = {}
): Scorecard {
  // Match play scorecards use a different structure for scores
  // Cast to bypass type check for legacy test data structure
  const matchPlayScores = {
    match: {
      opponent_id: opponentId,
      result,
      margin,
      holes_won: result === 'win' ? 10 : result === 'loss' ? 6 : 9,
      holes_lost: result === 'win' ? 6 : result === 'loss' ? 10 : 9,
      holes_halved: 2,
    },
  } as unknown as Record<string, HoleScore | MultiBallHoleScore>;

  return createTestScorecard({
    id: `scorecard-${playerId}`,
    round_id: roundId,
    player_id: playerId,
    scores: matchPlayScores,
    status: 'completed',
    ...overrides,
  });
}

// ============================================================================
// SAVE ROUND RESULTS TESTS
// ============================================================================

describe('saveRoundResults()', () => {
  describe('Validation', () => {
    it('should throw VALIDATION error when roundId is missing', async () => {
      const results = [createTestResultInput()];

      await expect(saveRoundResults('', results)).rejects.toMatchObject({
        message: 'Round ID is required',
        code: 'VALIDATION',
      });
    });

    it('should throw VALIDATION error when results array is empty', async () => {
      const roundId = createUUID();

      await expect(saveRoundResults(roundId, [])).rejects.toMatchObject({
        message: 'At least one result is required',
        code: 'VALIDATION',
      });
    });

    it('should throw VALIDATION error when results is null', async () => {
      const roundId = createUUID();

      await expect(saveRoundResults(roundId, null as unknown as SaveRoundResultInput[])).rejects.toMatchObject({
        message: 'At least one result is required',
        code: 'VALIDATION',
      });
    });

    it('should throw VALIDATION error when result has neither playerId nor teamId', async () => {
      const roundId = createUUID();
      const results = [
        createTestResultInput({ playerId: undefined, teamId: undefined }),
      ];

      await expect(saveRoundResults(roundId, results)).rejects.toMatchObject({
        message: 'Each result must have either playerId or teamId',
        code: 'VALIDATION',
      });
    });

    it('should throw VALIDATION error when result has both playerId and teamId', async () => {
      const roundId = createUUID();
      const results = [
        createTestResultInput({ playerId: createUUID(), teamId: createUUID() }),
      ];

      await expect(saveRoundResults(roundId, results)).rejects.toMatchObject({
        message: 'Each result must have only one of playerId or teamId',
        code: 'VALIDATION',
      });
    });
  });

  describe('Database Operations', () => {
    it('should delete existing results before inserting new ones', async () => {
      const roundId = createUUID();
      const results = [createTestResultInput({ roundId })];

      // Mock successful delete and insert
      mockEq.mockResolvedValueOnce({ data: null, error: null });
      mockInsert.mockReturnValueOnce({
        select: jest.fn().mockResolvedValue({ data: [{ id: 'result-1' }], error: null }),
      });

      await saveRoundResults(roundId, results);

      expect(mockFrom).toHaveBeenCalledWith('round_results');
      expect(mockDelete).toHaveBeenCalled();
      expect(mockEq).toHaveBeenCalledWith('round_id', roundId);
    });

    it('should throw DATABASE error when delete fails', async () => {
      const roundId = createUUID();
      const results = [createTestResultInput({ roundId })];

      mockEq.mockResolvedValueOnce({
        data: null,
        error: { message: 'Delete failed', code: 'PGRST001' },
      });

      await expect(saveRoundResults(roundId, results)).rejects.toMatchObject({
        code: 'DATABASE',
      });
    });

    it('should insert results with correct field mapping', async () => {
      const roundId = createUUID();
      const playerId = createUUID();
      const results = [
        createTestResultInput({
          roundId,
          playerId,
          rawScore: 38,
          rawResultData: { stableford_points: 38 },
          position: 1,
          competitionPoints: 10,
          isTeamResult: false,
        }),
      ];

      // Mock successful operations
      mockEq.mockResolvedValueOnce({ data: null, error: null });
      const mockSelectFn = jest.fn().mockResolvedValue({
        data: [
          {
            id: 'result-1',
            round_id: roundId,
            player_id: playerId,
            raw_score: 38,
            position: 1,
            competition_points: 10,
          },
        ],
        error: null,
      });
      mockInsert.mockReturnValueOnce({ select: mockSelectFn });

      const savedResults = await saveRoundResults(roundId, results);

      expect(mockInsert).toHaveBeenCalledWith(
        expect.arrayContaining([
          expect.objectContaining({
            round_id: roundId,
            player_id: playerId,
            team_id: null,
            raw_score: 38,
            position: 1,
            competition_points: 10,
            is_team_result: false,
          }),
        ])
      );
      expect(savedResults).toHaveLength(1);
    });

    it('should throw DATABASE error when insert fails', async () => {
      const roundId = createUUID();
      const results = [createTestResultInput({ roundId })];

      mockEq.mockResolvedValueOnce({ data: null, error: null });
      mockInsert.mockReturnValueOnce({
        select: jest.fn().mockResolvedValue({
          data: null,
          error: { message: 'Insert failed', code: 'PGRST001' },
        }),
      });

      await expect(saveRoundResults(roundId, results)).rejects.toMatchObject({
        code: 'DATABASE',
      });
    });

    it('should handle team results correctly', async () => {
      const roundId = createUUID();
      const teamId = createUUID();
      const results = [
        createTestResultInput({
          roundId,
          playerId: undefined,
          teamId,
          isTeamResult: true,
        }),
      ];

      mockEq.mockResolvedValueOnce({ data: null, error: null });
      mockInsert.mockReturnValueOnce({
        select: jest.fn().mockResolvedValue({ data: [{ id: 'result-1' }], error: null }),
      });

      await saveRoundResults(roundId, results);

      expect(mockInsert).toHaveBeenCalledWith(
        expect.arrayContaining([
          expect.objectContaining({
            player_id: null,
            team_id: teamId,
            is_team_result: true,
          }),
        ])
      );
    });

    it('should handle multiple results in a single save', async () => {
      const roundId = createUUID();
      const results = [
        createTestResultInput({ roundId, position: 1, competitionPoints: 10 }),
        createTestResultInput({ roundId, position: 2, competitionPoints: 8 }),
        createTestResultInput({ roundId, position: 3, competitionPoints: 6 }),
      ];

      mockEq.mockResolvedValueOnce({ data: null, error: null });
      mockInsert.mockReturnValueOnce({
        select: jest.fn().mockResolvedValue({
          data: results.map((_, i) => ({ id: `result-${i + 1}` })),
          error: null,
        }),
      });

      const savedResults = await saveRoundResults(roundId, results);

      expect(savedResults).toHaveLength(3);
      expect(mockInsert).toHaveBeenCalledWith(expect.any(Array));
      const insertArg = mockInsert.mock.calls[0][0];
      expect(insertArg).toHaveLength(3);
    });
  });
});

// ============================================================================
// GET ROUND RESULTS TESTS
// ============================================================================

describe('getRoundResults()', () => {
  describe('Validation', () => {
    it('should throw VALIDATION error when roundId is missing', async () => {
      await expect(getRoundResults('')).rejects.toMatchObject({
        message: 'Round ID is required',
        code: 'VALIDATION',
      });
    });
  });

  describe('Data Retrieval', () => {
    it('should return empty array when no results exist', async () => {
      mockOrder.mockResolvedValueOnce({ data: [], error: null });

      const results = await getRoundResults(createUUID());

      expect(results).toEqual([]);
    });

    it('should fetch results with player data populated', async () => {
      const roundId = createUUID();
      const playerId = createUUID();
      const mockData = [
        {
          id: 'result-1',
          round_id: roundId,
          player_id: playerId,
          team_id: null,
          raw_score: 38,
          raw_result_data: { stableford_points: 38 },
          position: 1,
          competition_points: 10,
          is_team_result: false,
          created_at: '2025-01-15T10:00:00Z',
          updated_at: '2025-01-15T10:00:00Z',
          player: {
            id: playerId,
            name: 'John Smith',
            email: 'john@test.com',
            handicap: 18,
          },
          team: null,
        },
      ];

      mockOrder.mockResolvedValueOnce({ data: mockData, error: null });

      const results = await getRoundResults(roundId);

      expect(results).toHaveLength(1);
      expect(results[0].player).toBeDefined();
      expect(results[0].player?.name).toBe('John Smith');
      expect(results[0].competition_points).toBe(10);
    });

    it('should fetch results with team data populated', async () => {
      const roundId = createUUID();
      const teamId = createUUID();
      const mockData = [
        {
          id: 'result-1',
          round_id: roundId,
          player_id: null,
          team_id: teamId,
          raw_score: 72,
          raw_result_data: { team_score: 72 },
          position: 1,
          competition_points: 10,
          is_team_result: true,
          created_at: '2025-01-15T10:00:00Z',
          updated_at: '2025-01-15T10:00:00Z',
          player: null,
          team: {
            id: teamId,
            competition_id: 'comp-1',
            name: 'Team Alpha',
            created_at: '2025-01-01T00:00:00Z',
            updated_at: '2025-01-01T00:00:00Z',
            team_members: [
              {
                team_id: teamId,
                player_id: 'player-1',
                joined_at: '2025-01-01T00:00:00Z',
                player: { id: 'player-1', name: 'Player 1', handicap: 15 },
              },
              {
                team_id: teamId,
                player_id: 'player-2',
                joined_at: '2025-01-01T00:00:00Z',
                player: { id: 'player-2', name: 'Player 2', handicap: 20 },
              },
            ],
          },
        },
      ];

      mockOrder.mockResolvedValueOnce({ data: mockData, error: null });

      const results = await getRoundResults(roundId);

      expect(results).toHaveLength(1);
      expect(results[0].team).toBeDefined();
      expect(results[0].team?.name).toBe('Team Alpha');
      expect(results[0].team?.members).toHaveLength(2);
    });

    it('should throw DATABASE error when fetch fails', async () => {
      mockOrder.mockResolvedValueOnce({
        data: null,
        error: { message: 'Fetch failed', code: 'PGRST001' },
      });

      await expect(getRoundResults(createUUID())).rejects.toMatchObject({
        code: 'DATABASE',
      });
    });

    it('should order results by position ascending', async () => {
      const roundId = createUUID();
      mockOrder.mockResolvedValueOnce({ data: [], error: null });

      await getRoundResults(roundId);

      expect(mockOrder).toHaveBeenCalledWith('position', {
        ascending: true,
        nullsFirst: false,
      });
    });
  });
});

// ============================================================================
// GET COMPETITION RESULTS TESTS
// ============================================================================

describe('getCompetitionResults()', () => {
  describe('Validation', () => {
    it('should throw VALIDATION error when competitionId is missing', async () => {
      await expect(getCompetitionResults('')).rejects.toMatchObject({
        message: 'Competition ID is required',
        code: 'VALIDATION',
      });
    });
  });

  describe('Data Retrieval', () => {
    it('should return empty rounds array when no rounds exist', async () => {
      mockOrder.mockResolvedValueOnce({ data: [], error: null });

      const result = await getCompetitionResults(createUUID());

      expect(result).toEqual({ rounds: [] });
    });

    it('should group results by round', async () => {
      const competitionId = createUUID();
      const round1Id = createUUID();
      const round2Id = createUUID();

      // First call: fetch rounds
      const mockRounds = [
        { id: round1Id, round_number: 1, game_type: 'stableford' },
        { id: round2Id, round_number: 2, game_type: 'stroke' },
      ];

      // Second call: fetch results for all rounds
      const mockResults = [
        {
          id: 'result-1',
          round_id: round1Id,
          player_id: 'player-1',
          position: 1,
          competition_points: 10,
          player: { id: 'player-1', name: 'Player 1' },
          team: null,
        },
        {
          id: 'result-2',
          round_id: round2Id,
          player_id: 'player-1',
          position: 2,
          competition_points: 8,
          player: { id: 'player-1', name: 'Player 1' },
          team: null,
        },
      ];

      mockOrder
        .mockResolvedValueOnce({ data: mockRounds, error: null })
        .mockResolvedValueOnce({ data: mockResults, error: null });

      const result = await getCompetitionResults(competitionId);

      expect(result.rounds).toHaveLength(2);
      expect(result.rounds[0].roundId).toBe(round1Id);
      expect(result.rounds[0].roundNumber).toBe(1);
      expect(result.rounds[0].gameType).toBe('stableford');
      expect(result.rounds[0].results).toHaveLength(1);
      expect(result.rounds[1].roundId).toBe(round2Id);
      expect(result.rounds[1].results).toHaveLength(1);
    });

    it('should throw DATABASE error when rounds fetch fails', async () => {
      mockOrder.mockResolvedValueOnce({
        data: null,
        error: { message: 'Rounds fetch failed', code: 'PGRST001' },
      });

      await expect(getCompetitionResults(createUUID())).rejects.toMatchObject({
        code: 'DATABASE',
      });
    });

    it('should throw DATABASE error when results fetch fails', async () => {
      const mockRounds = [{ id: createUUID(), round_number: 1, game_type: 'stableford' }];

      mockOrder
        .mockResolvedValueOnce({ data: mockRounds, error: null })
        .mockResolvedValueOnce({
          data: null,
          error: { message: 'Results fetch failed', code: 'PGRST001' },
        });

      await expect(getCompetitionResults(createUUID())).rejects.toMatchObject({
        code: 'DATABASE',
      });
    });

    it('should handle rounds with no results', async () => {
      const competitionId = createUUID();
      const roundId = createUUID();

      mockOrder
        .mockResolvedValueOnce({
          data: [{ id: roundId, round_number: 1, game_type: 'stableford' }],
          error: null,
        })
        .mockResolvedValueOnce({ data: [], error: null });

      const result = await getCompetitionResults(competitionId);

      expect(result.rounds).toHaveLength(1);
      expect(result.rounds[0].results).toEqual([]);
    });
  });
});

// ============================================================================
// FINALIZE ROUND TESTS
// ============================================================================

describe('finalizeRound()', () => {
  describe('Validation', () => {
    it('should throw VALIDATION error when roundId is missing', async () => {
      const scorecards = [createStablefordScorecard('player-1', 'round-1', 36)];

      await expect(
        finalizeRound('', scorecards, 'stableford', STANDARD_POINT_SYSTEM)
      ).rejects.toMatchObject({
        message: 'Round ID is required',
        code: 'VALIDATION',
      });
    });

    it('should throw VALIDATION error when scorecards is empty', async () => {
      await expect(
        finalizeRound(createUUID(), [], 'stableford', STANDARD_POINT_SYSTEM)
      ).rejects.toMatchObject({
        message: 'At least one scorecard is required',
        code: 'VALIDATION',
      });
    });

    it('should throw VALIDATION error when gameType is missing', async () => {
      const scorecards = [createStablefordScorecard('player-1', 'round-1', 36)];

      await expect(
        finalizeRound(createUUID(), scorecards, '' as GameType, STANDARD_POINT_SYSTEM)
      ).rejects.toMatchObject({
        message: 'Game type is required',
        code: 'VALIDATION',
      });
    });

    it('should throw VALIDATION error when pointSystem is missing', async () => {
      const scorecards = [createStablefordScorecard('player-1', 'round-1', 36)];

      await expect(
        finalizeRound(createUUID(), scorecards, 'stableford', null as unknown as PointSystemConfig)
      ).rejects.toMatchObject({
        message: 'Point system is required',
        code: 'VALIDATION',
      });
    });
  });

  describe('Stableford Finalization', () => {
    it('should calculate positions based on Stableford points (higher is better)', async () => {
      const roundId = createUUID();
      const player1 = createUUID();
      const player2 = createUUID();
      const player3 = createUUID();

      const scorecards = [
        createStablefordScorecard(player1, roundId, 38), // 1st
        createStablefordScorecard(player2, roundId, 32), // 3rd
        createStablefordScorecard(player3, roundId, 36), // 2nd
      ];

      // Mock successful save
      mockEq.mockResolvedValueOnce({ data: null, error: null });
      mockInsert.mockReturnValueOnce({
        select: jest.fn().mockResolvedValue({
          data: [{ id: 'result-1' }, { id: 'result-2' }, { id: 'result-3' }],
          error: null,
        }),
      });

      await finalizeRound(roundId, scorecards, 'stableford', STANDARD_POINT_SYSTEM);

      const insertCall = mockInsert.mock.calls[0][0];

      // Find results by player and check positions
      const p1Result = insertCall.find((r: any) => r.player_id === player1);
      const p2Result = insertCall.find((r: any) => r.player_id === player2);
      const p3Result = insertCall.find((r: any) => r.player_id === player3);

      expect(p1Result.position).toBe(1);
      expect(p1Result.raw_score).toBe(38);
      expect(p2Result.position).toBe(3);
      expect(p3Result.position).toBe(2);
    });

    it('should assign competition points based on position', async () => {
      const roundId = createUUID();
      const player1 = createUUID();
      const player2 = createUUID();

      const scorecards = [
        createStablefordScorecard(player1, roundId, 38),
        createStablefordScorecard(player2, roundId, 36),
      ];

      mockEq.mockResolvedValueOnce({ data: null, error: null });
      mockInsert.mockReturnValueOnce({
        select: jest.fn().mockResolvedValue({
          data: [{ id: 'result-1' }, { id: 'result-2' }],
          error: null,
        }),
      });

      await finalizeRound(roundId, scorecards, 'stableford', STANDARD_POINT_SYSTEM);

      const insertCall = mockInsert.mock.calls[0][0];

      const p1Result = insertCall.find((r: any) => r.player_id === player1);
      const p2Result = insertCall.find((r: any) => r.player_id === player2);

      expect(p1Result.competition_points).toBe(10); // 1st place
      expect(p2Result.competition_points).toBe(8); // 2nd place
    });

    it('should store stableford_points in raw_result_data', async () => {
      const roundId = createUUID();
      const playerId = createUUID();

      const scorecards = [createStablefordScorecard(playerId, roundId, 36)];

      mockEq.mockResolvedValueOnce({ data: null, error: null });
      mockInsert.mockReturnValueOnce({
        select: jest.fn().mockResolvedValue({ data: [{ id: 'result-1' }], error: null }),
      });

      await finalizeRound(roundId, scorecards, 'stableford', STANDARD_POINT_SYSTEM);

      const insertCall = mockInsert.mock.calls[0][0];
      expect(insertCall[0].raw_result_data).toEqual({ stableford_points: 36 });
    });
  });

  describe('Stroke Play Finalization', () => {
    it('should calculate positions based on net score (lower is better)', async () => {
      const roundId = createUUID();
      const player1 = createUUID();
      const player2 = createUUID();
      const player3 = createUUID();

      const scorecards = [
        createStrokeScorecard(player1, roundId, 85, 70), // 1st (lowest net)
        createStrokeScorecard(player2, roundId, 92, 75), // 3rd (highest net)
        createStrokeScorecard(player3, roundId, 88, 72), // 2nd
      ];

      mockEq.mockResolvedValueOnce({ data: null, error: null });
      mockInsert.mockReturnValueOnce({
        select: jest.fn().mockResolvedValue({
          data: [{ id: 'result-1' }, { id: 'result-2' }, { id: 'result-3' }],
          error: null,
        }),
      });

      await finalizeRound(roundId, scorecards, 'stroke', STANDARD_POINT_SYSTEM);

      const insertCall = mockInsert.mock.calls[0][0];

      const p1Result = insertCall.find((r: any) => r.player_id === player1);
      const p2Result = insertCall.find((r: any) => r.player_id === player2);
      const p3Result = insertCall.find((r: any) => r.player_id === player3);

      expect(p1Result.position).toBe(1);
      expect(p1Result.raw_score).toBe(70); // net score
      expect(p2Result.position).toBe(3);
      expect(p3Result.position).toBe(2);
    });

    it('should store gross and net scores in raw_result_data', async () => {
      const roundId = createUUID();
      const playerId = createUUID();

      const scorecards = [createStrokeScorecard(playerId, roundId, 90, 72)];

      mockEq.mockResolvedValueOnce({ data: null, error: null });
      mockInsert.mockReturnValueOnce({
        select: jest.fn().mockResolvedValue({ data: [{ id: 'result-1' }], error: null }),
      });

      await finalizeRound(roundId, scorecards, 'stroke', STANDARD_POINT_SYSTEM);

      const insertCall = mockInsert.mock.calls[0][0];
      expect(insertCall[0].raw_result_data).toEqual({
        gross_score: 90,
        net_score: 72,
      });
    });
  });

  describe('Match Play Finalization', () => {
    it('should assign points for win correctly', async () => {
      const roundId = createUUID();
      const player1 = createUUID();
      const player2 = createUUID();

      const scorecards = [
        createMatchPlayScorecard(player1, roundId, player2, 'win', '3&2'),
        createMatchPlayScorecard(player2, roundId, player1, 'loss', '3&2'),
      ];

      mockEq.mockResolvedValueOnce({ data: null, error: null });
      mockInsert.mockReturnValueOnce({
        select: jest.fn().mockResolvedValue({
          data: [{ id: 'result-1' }, { id: 'result-2' }],
          error: null,
        }),
      });

      await finalizeRound(roundId, scorecards, 'match-play', STANDARD_POINT_SYSTEM);

      const insertCall = mockInsert.mock.calls[0][0];

      const winResult = insertCall.find((r: any) => r.player_id === player1);
      const lossResult = insertCall.find((r: any) => r.player_id === player2);

      expect(winResult.competition_points).toBe(3); // win
      expect(lossResult.competition_points).toBe(0); // loss
    });

    it('should assign points for halved match correctly', async () => {
      const roundId = createUUID();
      const player1 = createUUID();
      const player2 = createUUID();

      const scorecards = [
        createMatchPlayScorecard(player1, roundId, player2, 'halved', 'A/S'),
        createMatchPlayScorecard(player2, roundId, player1, 'halved', 'A/S'),
      ];

      mockEq.mockResolvedValueOnce({ data: null, error: null });
      mockInsert.mockReturnValueOnce({
        select: jest.fn().mockResolvedValue({
          data: [{ id: 'result-1' }, { id: 'result-2' }],
          error: null,
        }),
      });

      await finalizeRound(roundId, scorecards, 'match-play', STANDARD_POINT_SYSTEM);

      const insertCall = mockInsert.mock.calls[0][0];

      expect(insertCall[0].competition_points).toBe(1); // halved/draw
      expect(insertCall[1].competition_points).toBe(1); // halved/draw
    });

    it('should set position to null for match play results', async () => {
      const roundId = createUUID();
      const player1 = createUUID();
      const player2 = createUUID();

      const scorecards = [
        createMatchPlayScorecard(player1, roundId, player2, 'win', '2&1'),
      ];

      mockEq.mockResolvedValueOnce({ data: null, error: null });
      mockInsert.mockReturnValueOnce({
        select: jest.fn().mockResolvedValue({ data: [{ id: 'result-1' }], error: null }),
      });

      await finalizeRound(roundId, scorecards, 'match-play', STANDARD_POINT_SYSTEM);

      const insertCall = mockInsert.mock.calls[0][0];
      expect(insertCall[0].position).toBeNull();
      expect(insertCall[0].raw_score).toBeNull();
    });

    it('should store match play details in raw_result_data', async () => {
      const roundId = createUUID();
      const player1 = createUUID();
      const player2 = createUUID();

      const scorecards = [
        createMatchPlayScorecard(player1, roundId, player2, 'win', '3&2'),
      ];

      mockEq.mockResolvedValueOnce({ data: null, error: null });
      mockInsert.mockReturnValueOnce({
        select: jest.fn().mockResolvedValue({ data: [{ id: 'result-1' }], error: null }),
      });

      await finalizeRound(roundId, scorecards, 'match-play', STANDARD_POINT_SYSTEM);

      const insertCall = mockInsert.mock.calls[0][0];
      expect(insertCall[0].raw_result_data).toMatchObject({
        opponent_id: player2,
        match_result: 'win',
        final_margin: '3&2',
      });
    });

    it('should skip scorecards without match play data and throw if all are skipped', async () => {
      const roundId = createUUID();

      // Scorecard without match data in scores
      const scorecards = [
        createTestScorecard({
          id: 'scorecard-1',
          round_id: roundId,
          player_id: createUUID(),
          scores: {}, // No match data
          status: 'completed',
        }),
      ];

      // When all scorecards are skipped in match play, it results in an empty array
      // which triggers the validation error "At least one result is required"
      await expect(
        finalizeRound(roundId, scorecards, 'match-play', STANDARD_POINT_SYSTEM)
      ).rejects.toMatchObject({
        message: 'At least one result is required',
        code: 'VALIDATION',
      });
    });
  });

  describe('Team Formats', () => {
    it('should handle best-ball game type', async () => {
      const roundId = createUUID();
      const playerId = createUUID();

      const scorecards = [
        createTestScorecard({
          id: 'scorecard-1',
          round_id: roundId,
          player_id: playerId,
          total_points: 40,
          total_gross: 88,
          total_net: 70,
          status: 'completed',
        }),
      ];

      mockEq.mockResolvedValueOnce({ data: null, error: null });
      mockInsert.mockReturnValueOnce({
        select: jest.fn().mockResolvedValue({ data: [{ id: 'result-1' }], error: null }),
      });

      await finalizeRound(roundId, scorecards, 'best-ball', STANDARD_POINT_SYSTEM);

      const insertCall = mockInsert.mock.calls[0][0];
      expect(insertCall[0].raw_result_data).toMatchObject({
        team_score: 40,
        gross_score: 88,
        net_score: 70,
      });
    });

    it('should handle ambrose/scramble game type', async () => {
      const roundId = createUUID();
      const playerId = createUUID();

      const scorecards = [
        createTestScorecard({
          id: 'scorecard-1',
          round_id: roundId,
          player_id: playerId,
          total_points: 0,
          total_gross: 75,
          total_net: 68,
          status: 'completed',
        }),
      ];

      mockEq.mockResolvedValueOnce({ data: null, error: null });
      mockInsert.mockReturnValueOnce({
        select: jest.fn().mockResolvedValue({ data: [{ id: 'result-1' }], error: null }),
      });

      await finalizeRound(roundId, scorecards, 'ambrose', STANDARD_POINT_SYSTEM);

      const insertCall = mockInsert.mock.calls[0][0];
      // For ambrose with no points, should use net score
      expect(insertCall[0].raw_score).toBe(68);
    });
  });

  describe('Edge Cases', () => {
    it('should handle tied positions correctly', async () => {
      const roundId = createUUID();
      const player1 = createUUID();
      const player2 = createUUID();
      const player3 = createUUID();

      // Players 1 and 2 are tied at 36 points
      const scorecards = [
        createStablefordScorecard(player1, roundId, 36),
        createStablefordScorecard(player2, roundId, 36),
        createStablefordScorecard(player3, roundId, 34),
      ];

      mockEq.mockResolvedValueOnce({ data: null, error: null });
      mockInsert.mockReturnValueOnce({
        select: jest.fn().mockResolvedValue({
          data: [{ id: 'result-1' }, { id: 'result-2' }, { id: 'result-3' }],
          error: null,
        }),
      });

      await finalizeRound(roundId, scorecards, 'stableford', STANDARD_POINT_SYSTEM);

      // Tied players should have same position
      const insertCall = mockInsert.mock.calls[0][0];
      const p1Result = insertCall.find((r: any) => r.player_id === player1);
      const p2Result = insertCall.find((r: any) => r.player_id === player2);

      expect(p1Result.position).toBe(p2Result.position);
    });

    it('should use default points for positions beyond defined rules', async () => {
      const roundId = createUUID();

      // Create 10 players - position 9 and 10 should get default points
      const scorecards = Array.from({ length: 10 }, (_, i) =>
        createStablefordScorecard(createUUID(), roundId, 40 - i)
      );

      mockEq.mockResolvedValueOnce({ data: null, error: null });
      mockInsert.mockReturnValueOnce({
        select: jest.fn().mockResolvedValue({
          data: scorecards.map((_, i) => ({ id: `result-${i + 1}` })),
          error: null,
        }),
      });

      await finalizeRound(roundId, scorecards, 'stableford', STANDARD_POINT_SYSTEM);

      const insertCall = mockInsert.mock.calls[0][0];
      const lastPlaceResult = insertCall.find((r: any) => r.position === 10);

      // Default points is 0 in STANDARD_POINT_SYSTEM
      expect(lastPlaceResult.competition_points).toBe(0);
    });
  });
});

// ============================================================================
// FINALIZE TEAM ROUND TESTS
// ============================================================================

describe('finalizeTeamRound()', () => {
  describe('Validation', () => {
    it('should throw VALIDATION error when roundId is missing', async () => {
      const teamScores = [
        { teamId: createUUID(), rawScore: 72, rawResultData: { team_score: 72 } },
      ];

      await expect(
        finalizeTeamRound('', teamScores, 'best-ball', STANDARD_POINT_SYSTEM)
      ).rejects.toMatchObject({
        message: 'Round ID is required',
        code: 'VALIDATION',
      });
    });

    it('should throw VALIDATION error when teamScores is empty', async () => {
      await expect(
        finalizeTeamRound(createUUID(), [], 'best-ball', STANDARD_POINT_SYSTEM)
      ).rejects.toMatchObject({
        message: 'At least one team score is required',
        code: 'VALIDATION',
      });
    });
  });

  describe('Team Result Finalization', () => {
    it('should set isTeamResult to true for all results', async () => {
      const roundId = createUUID();
      const team1 = createUUID();
      const team2 = createUUID();

      const teamScores = [
        { teamId: team1, rawScore: 72, rawResultData: { team_score: 72 } },
        { teamId: team2, rawScore: 74, rawResultData: { team_score: 74 } },
      ];

      mockEq.mockResolvedValueOnce({ data: null, error: null });
      mockInsert.mockReturnValueOnce({
        select: jest.fn().mockResolvedValue({
          data: [{ id: 'result-1' }, { id: 'result-2' }],
          error: null,
        }),
      });

      await finalizeTeamRound(roundId, teamScores, 'best-ball', STANDARD_POINT_SYSTEM);

      const insertCall = mockInsert.mock.calls[0][0];
      expect(insertCall[0].is_team_result).toBe(true);
      expect(insertCall[1].is_team_result).toBe(true);
      // player_id is null (not undefined) when saving team results
      expect(insertCall[0].player_id).toBeNull();
      expect(insertCall[0].team_id).toBeDefined();
    });

    it('should calculate positions based on team scores', async () => {
      const roundId = createUUID();
      const team1 = createUUID();
      const team2 = createUUID();

      const teamScores = [
        { teamId: team1, rawScore: 72, rawResultData: { team_score: 72 } }, // 1st (lower is better for team score)
        { teamId: team2, rawScore: 78, rawResultData: { team_score: 78 } }, // 2nd
      ];

      mockEq.mockResolvedValueOnce({ data: null, error: null });
      mockInsert.mockReturnValueOnce({
        select: jest.fn().mockResolvedValue({
          data: [{ id: 'result-1' }, { id: 'result-2' }],
          error: null,
        }),
      });

      await finalizeTeamRound(roundId, teamScores, 'ambrose', STANDARD_POINT_SYSTEM);

      const insertCall = mockInsert.mock.calls[0][0];
      const team1Result = insertCall.find((r: any) => r.team_id === team1);
      const team2Result = insertCall.find((r: any) => r.team_id === team2);

      expect(team1Result.position).toBe(1);
      expect(team2Result.position).toBe(2);
    });

    it('should assign competition points to teams', async () => {
      const roundId = createUUID();
      const team1 = createUUID();
      const team2 = createUUID();

      const teamScores = [
        { teamId: team1, rawScore: 40, rawResultData: { stableford_points: 40 } },
        { teamId: team2, rawScore: 38, rawResultData: { stableford_points: 38 } },
      ];

      mockEq.mockResolvedValueOnce({ data: null, error: null });
      mockInsert.mockReturnValueOnce({
        select: jest.fn().mockResolvedValue({
          data: [{ id: 'result-1' }, { id: 'result-2' }],
          error: null,
        }),
      });

      await finalizeTeamRound(roundId, teamScores, 'stableford', STANDARD_POINT_SYSTEM);

      const insertCall = mockInsert.mock.calls[0][0];
      const team1Result = insertCall.find((r: any) => r.team_id === team1);
      const team2Result = insertCall.find((r: any) => r.team_id === team2);

      expect(team1Result.competition_points).toBe(10); // 1st
      expect(team2Result.competition_points).toBe(8); // 2nd
    });
  });
});

// ============================================================================
// DELETE ROUND RESULTS TESTS
// ============================================================================

describe('deleteRoundResults()', () => {
  describe('Validation', () => {
    it('should throw VALIDATION error when roundId is missing', async () => {
      await expect(deleteRoundResults('')).rejects.toMatchObject({
        message: 'Round ID is required',
        code: 'VALIDATION',
      });
    });
  });

  describe('Delete Operations', () => {
    it('should delete all results for the round', async () => {
      const roundId = createUUID();

      mockEq.mockResolvedValueOnce({ data: null, error: null });

      await deleteRoundResults(roundId);

      expect(mockFrom).toHaveBeenCalledWith('round_results');
      expect(mockDelete).toHaveBeenCalled();
      expect(mockEq).toHaveBeenCalledWith('round_id', roundId);
    });

    it('should throw DATABASE error when delete fails', async () => {
      mockEq.mockResolvedValueOnce({
        data: null,
        error: { message: 'Delete failed', code: 'PGRST001' },
      });

      await expect(deleteRoundResults(createUUID())).rejects.toMatchObject({
        code: 'DATABASE',
      });
    });
  });
});

// ============================================================================
// IS ROUND FINALIZED TESTS
// ============================================================================

describe('isRoundFinalized()', () => {
  describe('Validation', () => {
    it('should throw VALIDATION error when roundId is missing', async () => {
      await expect(isRoundFinalized('')).rejects.toMatchObject({
        message: 'Round ID is required',
        code: 'VALIDATION',
      });
    });
  });

  describe('Finalization Check', () => {
    it('should return true when round has results', async () => {
      const roundId = createUUID();

      // Mock the select chain for count query
      const mockHeadSelect = jest.fn(() => ({
        eq: jest.fn().mockResolvedValue({ count: 5, error: null }),
      }));
      mockFrom.mockReturnValueOnce({
        select: mockHeadSelect,
      });

      const result = await isRoundFinalized(roundId);

      expect(result).toBe(true);
    });

    it('should return false when round has no results', async () => {
      const roundId = createUUID();

      const mockHeadSelect = jest.fn(() => ({
        eq: jest.fn().mockResolvedValue({ count: 0, error: null }),
      }));
      mockFrom.mockReturnValueOnce({
        select: mockHeadSelect,
      });

      const result = await isRoundFinalized(roundId);

      expect(result).toBe(false);
    });

    it('should return false when count is null', async () => {
      const roundId = createUUID();

      const mockHeadSelect = jest.fn(() => ({
        eq: jest.fn().mockResolvedValue({ count: null, error: null }),
      }));
      mockFrom.mockReturnValueOnce({
        select: mockHeadSelect,
      });

      const result = await isRoundFinalized(roundId);

      expect(result).toBe(false);
    });

    it('should throw DATABASE error when query fails', async () => {
      const roundId = createUUID();

      const mockHeadSelect = jest.fn(() => ({
        eq: jest.fn().mockResolvedValue({
          count: null,
          error: { message: 'Query failed', code: 'PGRST001' },
        }),
      }));
      mockFrom.mockReturnValueOnce({
        select: mockHeadSelect,
      });

      await expect(isRoundFinalized(roundId)).rejects.toMatchObject({
        code: 'DATABASE',
      });
    });
  });
});

// ============================================================================
// SERVICE OBJECT TESTS
// ============================================================================

describe('roundResultsService object', () => {
  it('should export all service functions', () => {
    expect(roundResultsService.saveRoundResults).toBe(saveRoundResults);
    expect(roundResultsService.getRoundResults).toBe(getRoundResults);
    expect(roundResultsService.getCompetitionResults).toBe(getCompetitionResults);
    expect(roundResultsService.finalizeRound).toBe(finalizeRound);
    expect(roundResultsService.finalizeTeamRound).toBe(finalizeTeamRound);
    expect(roundResultsService.deleteRoundResults).toBe(deleteRoundResults);
    expect(roundResultsService.isRoundFinalized).toBe(isRoundFinalized);
  });
});

// ============================================================================
// RE-FINALIZATION TESTS
// ============================================================================

describe('Re-finalization', () => {
  it('should delete old results before saving new ones when re-finalizing', async () => {
    const roundId = createUUID();

    const scorecards = [createStablefordScorecard(createUUID(), roundId, 36)];

    // Track call order
    const callOrder: string[] = [];

    mockEq.mockImplementation(() => {
      callOrder.push('delete');
      return Promise.resolve({ data: null, error: null });
    });

    mockInsert.mockImplementation(() => {
      callOrder.push('insert');
      return {
        select: jest.fn().mockResolvedValue({ data: [{ id: 'result-1' }], error: null }),
      };
    });

    await finalizeRound(roundId, scorecards, 'stableford', STANDARD_POINT_SYSTEM);

    // Verify delete happens before insert
    expect(callOrder).toEqual(['delete', 'insert']);
  });
});
