/**
 * Retroactive Scorecard Differential Recalculation Tests
 *
 * Tests the recalculation service that computes handicap differentials
 * for scorecards that were originally synced without slope/course ratings.
 */

// ============================================================================
// MOCK SETUP — variables prefixed with 'mock' are allowed in jest.mock()
// ============================================================================

// Track mock call chains per table
const mockChains: Record<string, Record<string, jest.Mock>> = {};

function mockCreateChain(resolveValue: { data: unknown; error: unknown }) {
  const chain: Record<string, jest.Mock> = {};
  chain.select = jest.fn().mockReturnValue(chain);
  chain.insert = jest.fn().mockReturnValue(chain);
  chain.update = jest.fn().mockReturnValue(chain);
  chain.upsert = jest.fn().mockReturnValue(chain);
  chain.eq = jest.fn().mockReturnValue(chain);
  chain.in = jest.fn().mockReturnValue(chain);
  chain.not = jest.fn().mockReturnValue(chain);
  chain.order = jest.fn().mockReturnValue(chain);
  chain.limit = jest.fn().mockReturnValue(chain);
  chain.single = jest.fn(() => Promise.resolve(resolveValue));
  chain.maybeSingle = jest.fn(() => Promise.resolve(resolveValue));
  return chain;
}

jest.mock('@/services/supabase/client', () => ({
  supabase: {
    from: jest.fn((table: string) => {
      const chain = mockChains[table];
      if (chain) return chain;
      return mockCreateChain({ data: null, error: null });
    }),
  },
}));

jest.mock('@/services/queryClient', () => ({
  invalidateHandicapCache: jest.fn(),
  queryClient: {
    invalidateQueries: jest.fn(),
  },
}));

jest.mock('@/services/handicap/updatePlayerHandicapIndex', () => ({
  updatePlayerHandicapIndex: jest.fn(() => Promise.resolve()),
}));

jest.mock('@/utils/debugLogger', () => ({
  syncLogger: {
    info: jest.fn(),
    debug: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
  },
}));

// Import after mocks are set up
import { recalculateScorecardDifferential } from '@/services/handicap/recalculateScorecardDifferential';

// ============================================================================
// TEST DATA
// ============================================================================

const SCORECARD_ID = '11111111-1111-1111-1111-111111111111';
const ROUND_ID = '22222222-2222-2222-2222-222222222222';
const PLAYER_ID = '33333333-3333-3333-3333-333333333333';
const COURSE_ID = '44444444-4444-4444-4444-444444444444';
const TEE_ID = '55555555-5555-5555-5555-555555555555';

const mockScorecard = {
  id: SCORECARD_ID,
  round_id: ROUND_ID,
  player_id: PLAYER_ID,
  total_gross: 85,
  ga_handicap_used: 18.5,
};

const mockRound = {
  id: ROUND_ID,
  course_id: COURSE_ID,
  selected_tee: {
    tee_id: TEE_ID,
    name: 'Blue',
    color: 'blue',
    courseRating: undefined,
    slopeRating: undefined,
  },
  courses: {
    holes: Array.from({ length: 18 }, (_, i) => ({
      number: i + 1,
      par: i % 3 === 0 ? 5 : i % 3 === 1 ? 4 : 3,
      strokeIndex: i + 1,
    })),
  },
};

const mockTee = {
  id: TEE_ID,
  name: 'Blue',
  color: '#0000FF',
  slope: 125,
  course_rating: 72.5,
  slope_women: 130,
  course_rating_women: 74.5,
};

const mockPlayer = {
  id: PLAYER_ID,
  gender: 'male' as const,
  handicap: 18.5,
};

// ============================================================================
// HELPERS
// ============================================================================

function setupMocks(overrides: {
  scorecard?: unknown;
  scorecardError?: unknown;
  round?: unknown;
  roundError?: unknown;
  tee?: unknown;
  teeError?: unknown;
  tees?: unknown[];
  teesError?: unknown;
  player?: unknown;
  playerError?: unknown;
  updateError?: unknown;
} = {}) {
  // Scorecards table mock
  const scorecardChain = mockCreateChain({
    data: overrides.scorecard ?? mockScorecard,
    error: overrides.scorecardError ?? null,
  });
  // Also handle update calls
  scorecardChain.update = jest.fn().mockReturnValue({
    eq: jest.fn(() => Promise.resolve({ data: null, error: overrides.updateError ?? null })),
  });
  mockChains['scorecards'] = scorecardChain;

  // Rounds table mock (used via `from('rounds')`)
  const roundChain = mockCreateChain({
    data: overrides.round ?? mockRound,
    error: overrides.roundError ?? null,
  });
  mockChains['rounds'] = roundChain;

  // Tees table mock
  const teeChain = mockCreateChain({
    data: overrides.tee ?? mockTee,
    error: overrides.teeError ?? null,
  });
  // For the case where we fetch all tees (no single())
  if (overrides.tees !== undefined) {
    teeChain.eq = jest.fn((col: string) => {
      if (col === 'id') {
        // Direct tee_id lookup
        return {
          ...teeChain,
          single: jest.fn(() =>
            Promise.resolve({ data: overrides.tee ?? null, error: overrides.teeError ?? null })
          ),
        };
      }
      // course_id lookup returns array
      return Promise.resolve({ data: overrides.tees, error: overrides.teesError ?? null });
    });
  }
  mockChains['tees'] = teeChain;

  // round_players table mock (per-player tee override — default: no override)
  const roundPlayerChain = mockCreateChain({ data: null, error: null });
  mockChains['round_players'] = roundPlayerChain;

  // Players table mock
  const playerChain = mockCreateChain({
    data: overrides.player ?? mockPlayer,
    error: overrides.playerError ?? null,
  });
  mockChains['players'] = playerChain;
}

// ============================================================================
// TESTS
// ============================================================================

describe('recalculateScorecardDifferential', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    // Reset mock chains
    Object.keys(mockChains).forEach((key) => delete mockChains[key]);
  });

  describe('happy path', () => {
    it('recalculates differential when tee now has valid ratings (via tee_id)', async () => {
      setupMocks();

      const result = await recalculateScorecardDifferential(SCORECARD_ID);

      // Expected differential: (113 / 125) × (85 - 72.5) = 11.3
      expect(result.handicapDifferential).toBe(11.3);
      expect(result.courseRatingUsed).toBe(72.5);
      expect(result.slopeRatingUsed).toBe(125);
      expect(result.gaHandicapUsed).toBe(18.5);
      expect(result.dailyHandicapUsed).not.toBeNull();
    });

    it('recalculates with name/color fallback when tee_id is missing', async () => {
      const roundWithoutTeeId = {
        ...mockRound,
        selected_tee: {
          name: 'Blue',
          color: 'blue',
        },
      };

      setupMocks({
        round: roundWithoutTeeId,
        tees: [mockTee],
      });

      const result = await recalculateScorecardDifferential(SCORECARD_ID);

      expect(result.handicapDifferential).toBe(11.3);
      expect(result.courseRatingUsed).toBe(72.5);
      expect(result.slopeRatingUsed).toBe(125);
    });

    it('uses women ratings for female player', async () => {
      setupMocks({
        player: { ...mockPlayer, gender: 'female' },
      });

      const result = await recalculateScorecardDifferential(SCORECARD_ID);

      // Expected: (113 / 130) × (85 - 74.5) = 9.1
      expect(result.handicapDifferential).toBe(9.1);
      expect(result.courseRatingUsed).toBe(74.5);
      expect(result.slopeRatingUsed).toBe(130);
    });
  });

  describe('player handicap handling', () => {
    it('uses ga_handicap_used from scorecard if available', async () => {
      setupMocks({
        scorecard: { ...mockScorecard, ga_handicap_used: 15.0 },
      });

      const result = await recalculateScorecardDifferential(SCORECARD_ID);

      expect(result.gaHandicapUsed).toBe(15.0);
      expect(result.dailyHandicapUsed).not.toBeNull();
    });

    it('falls back to player.handicap if ga_handicap_used is null', async () => {
      setupMocks({
        scorecard: { ...mockScorecard, ga_handicap_used: null },
        player: { ...mockPlayer, handicap: 20.0 },
      });

      const result = await recalculateScorecardDifferential(SCORECARD_ID);

      expect(result.gaHandicapUsed).toBe(20.0);
      expect(result.dailyHandicapUsed).not.toBeNull();
    });

    it('sets daily handicap to null if player has no handicap', async () => {
      setupMocks({
        scorecard: { ...mockScorecard, ga_handicap_used: null },
        player: { ...mockPlayer, handicap: null },
      });

      const result = await recalculateScorecardDifferential(SCORECARD_ID);

      // Differential should still be calculated (doesn't need handicap)
      expect(result.handicapDifferential).toBe(11.3);
      expect(result.dailyHandicapUsed).toBeNull();
      expect(result.gaHandicapUsed).toBeNull();
    });
  });

  describe('error cases', () => {
    it('throws when scorecard not found', async () => {
      setupMocks({ scorecard: null, scorecardError: { message: 'not found' } });

      await expect(
        recalculateScorecardDifferential(SCORECARD_ID)
      ).rejects.toThrow('Scorecard not found');
    });

    it('throws when scorecard has no gross score', async () => {
      setupMocks({
        scorecard: { ...mockScorecard, total_gross: 0 },
      });

      await expect(
        recalculateScorecardDifferential(SCORECARD_ID)
      ).rejects.toThrow('Invalid scorecard data for recalculation');
    });

    it('throws when round not found', async () => {
      setupMocks({ round: null, roundError: { message: 'not found' } });

      await expect(
        recalculateScorecardDifferential(SCORECARD_ID)
      ).rejects.toThrow('Round not found');
    });

    it('throws when round has no course', async () => {
      setupMocks({
        round: { ...mockRound, course_id: null },
      });

      await expect(
        recalculateScorecardDifferential(SCORECARD_ID)
      ).rejects.toThrow('Round has no associated course');
    });

    it('throws when tee still has no ratings', async () => {
      setupMocks({
        tee: { ...mockTee, slope: null, course_rating: null },
      });

      await expect(
        recalculateScorecardDifferential(SCORECARD_ID)
      ).rejects.toThrow('Tee still has no valid slope/course ratings');
    });

    it('throws when no tees found for course', async () => {
      const roundWithoutTeeId = {
        ...mockRound,
        selected_tee: { name: 'Blue', color: 'blue' },
      };

      setupMocks({
        round: roundWithoutTeeId,
        tee: null,
        teeError: { message: 'not found' },
        tees: [],
        teesError: null,
      });

      await expect(
        recalculateScorecardDifferential(SCORECARD_ID)
      ).rejects.toThrow('No tees found');
    });

    it('throws when database update fails', async () => {
      setupMocks({
        updateError: { message: 'permission denied' },
      });

      await expect(
        recalculateScorecardDifferential(SCORECARD_ID)
      ).rejects.toThrow('Failed to update scorecard: permission denied');
    });
  });
});
