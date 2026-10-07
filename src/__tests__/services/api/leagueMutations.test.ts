// src/__tests__/services/api/leagueMutations.test.ts
/**
 * tagRoundToLeague — handicap completeness gate (I12)
 *
 * A league row stores the WHS differential, so only a complete 18-hole card
 * may be tagged. The 18-hole check runs BEFORE any retroactive recalculation,
 * and a recalculation that withholds the differential refuses the tag.
 */

const mockGetUser = jest.fn();
const mockFrom = jest.fn();
jest.mock('@/services/supabase/client', () => ({
  supabase: {
    auth: { getUser: () => mockGetUser() },
    from: (...args: unknown[]) => mockFrom(...args),
  },
}));

const mockRecalculate = jest.fn();
jest.mock('@/services/handicap/recalculateScorecardDifferential', () => ({
  recalculateScorecardDifferential: (...args: unknown[]) => mockRecalculate(...args),
}));

import { tagRoundToLeague } from '@/services/api/leagues/mutations';

const USER_ID = 'user-1';
const LEAGUE_ID = 'league-1';
const SCORECARD_ID = 'scorecard-1';

function scoresOn(holeCount: number): Record<string, { strokes: number }> {
  const scores: Record<string, { strokes: number }> = {};
  for (let hole = 1; hole <= holeCount; hole++) scores[String(hole)] = { strokes: 5 };
  return scores;
}

function makeScorecard(overrides: Record<string, unknown> = {}): Record<string, unknown> {
  return {
    id: SCORECARD_ID,
    player_id: USER_ID,
    handicap_differential: null,
    status: 'completed',
    scores: scoresOn(18),
    round_id: 'round-1',
    ...overrides,
  };
}

function recalcResult(handicapDifferential: number | null) {
  return {
    handicapDifferential,
    dailyHandicapUsed: 19,
    courseRatingUsed: 72.5,
    slopeRatingUsed: 125,
    gaHandicapUsed: 18,
  };
}

let leagueRoundInserts: Record<string, unknown>[] = [];

function wireTables(scorecard: Record<string, unknown>) {
  mockFrom.mockImplementation((table: string) => {
    switch (table) {
      case 'scorecards':
        return {
          select: () => ({
            eq: () => ({ single: () => Promise.resolve({ data: scorecard, error: null }) }),
          }),
        };
      case 'leagues':
        return {
          select: () => ({
            eq: () => ({
              single: () =>
                Promise.resolve({
                  // 'ladder' has no extra tag validation (validateTagForLeagueType).
                  data: { id: LEAGUE_ID, status: 'active', league_type: 'ladder' },
                  error: null,
                }),
            }),
          }),
        };
      case 'league_rounds':
        return {
          insert: (payload: Record<string, unknown>) => {
            leagueRoundInserts.push(payload);
            return {
              select: () => ({
                single: () => Promise.resolve({ data: { id: 'league-round-1', ...payload }, error: null }),
              }),
            };
          },
        };
      default:
        throw new Error(`Unexpected table: ${table}`);
    }
  });
}

describe('tagRoundToLeague — handicap completeness gate', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    leagueRoundInserts = [];
    mockGetUser.mockResolvedValue({ data: { user: { id: USER_ID } }, error: null });
    mockRecalculate.mockResolvedValue(recalcResult(-38.4));
  });

  it('tags a complete card that already has a differential, without recalculating (I12 lock)', async () => {
    wireTables(makeScorecard({ handicap_differential: 14.2 }));

    await tagRoundToLeague(LEAGUE_ID, SCORECARD_ID);

    expect(mockRecalculate).not.toHaveBeenCalled();
    expect(leagueRoundInserts).toEqual([
      { league_id: LEAGUE_ID, scorecard_id: SCORECARD_ID, player_id: USER_ID, handicap_differential: 14.2 },
    ]);
  });

  it('tags with the recalculated differential when none was stored (I12 lock)', async () => {
    mockRecalculate.mockResolvedValue(recalcResult(12.3));
    wireTables(makeScorecard());

    await tagRoundToLeague(LEAGUE_ID, SCORECARD_ID);

    expect(mockRecalculate).toHaveBeenCalledWith(SCORECARD_ID);
    expect(leagueRoundInserts[0].handicap_differential).toBe(12.3);
  });

  it('wraps a failed recalculation (I12 lock)', async () => {
    mockRecalculate.mockRejectedValue(new Error('Tee still has no valid slope/course ratings'));
    wireTables(makeScorecard());

    await expect(tagRoundToLeague(LEAGUE_ID, SCORECARD_ID)).rejects.toThrow(
      'This scorecard does not have a handicap differential and recalculation failed: Tee still has no valid slope/course ratings',
    );
  });

  it('rejects a partial card before attempting any recalculation', async () => {
    wireTables(makeScorecard({ scores: scoresOn(6) }));

    await expect(tagRoundToLeague(LEAGUE_ID, SCORECARD_ID)).rejects.toThrow(
      'Only 18-hole rounds can be tagged to leagues',
    );
    expect(mockRecalculate).not.toHaveBeenCalled();
    expect(leagueRoundInserts).toEqual([]);
  });

  it('refuses the tag when recalculation withholds the differential', async () => {
    mockRecalculate.mockResolvedValue(recalcResult(null));
    wireTables(makeScorecard());

    await expect(tagRoundToLeague(LEAGUE_ID, SCORECARD_ID)).rejects.toThrow(
      'This round is not eligible for a handicap differential',
    );
    expect(leagueRoundInserts).toEqual([]);
  });
});
