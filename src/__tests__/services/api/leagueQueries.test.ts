// src/__tests__/services/api/leagueQueries.test.ts
/**
 * getEligibleScorecards — early-ended rounds are never offered for league
 * tagging (they carry no handicap differential). Filtered in the query and,
 * as a belt, on the returned rows.
 */
import type { League } from '@/types/database';
import { getEligibleScorecards } from '@/services/api/leagues/queries';

const mockGetUser = jest.fn();
const mockFrom = jest.fn();
jest.mock('@/services/supabase/client', () => ({
  supabase: {
    auth: { getUser: () => mockGetUser() },
    from: (...args: unknown[]) => mockFrom(...args),
  },
}));

type Call = { method: string; args: unknown[] };

/** Chainable + thenable stub that records every call. */
function recordingQuery(result: { data: unknown; error: unknown }, calls: Call[]) {
  const chain: Record<string, unknown> = {};
  for (const method of ['select', 'eq', 'in', 'is', 'not', 'order']) {
    chain[method] = (...args: unknown[]) => {
      calls.push({ method, args });
      return chain;
    };
  }
  chain.then = (resolve: (value: unknown) => unknown, reject?: (reason: unknown) => unknown) =>
    Promise.resolve(result).then(resolve, reject);
  return chain;
}

function eligibleRow(id: string, holesPlayed: number | null) {
  return {
    id,
    round_id: `round-${id}`,
    player_id: 'user-1',
    handicap_differential: 12.3,
    status: 'completed',
    created_at: '2026-09-10T08:00:00Z',
    total_gross: 90,
    rounds: {
      date: '2026-09-10',
      course_id: 'course-1',
      holes_played: holesPlayed,
      courses: { name: 'Test Course' },
    },
  };
}

let scorecardCalls: Call[] = [];

function wireTables(
  rows: unknown[],
  tagged: { scorecard_id: string }[] = [],
  error: { message: string } | null = null
) {
  scorecardCalls = [];
  mockFrom.mockImplementation((table: string) =>
    table === 'scorecards'
      ? recordingQuery({ data: rows, error }, scorecardCalls)
      : recordingQuery({ data: tagged, error: null }, [])
  );
}

describe('getEligibleScorecards — early-ended rounds', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockGetUser.mockResolvedValue({ data: { user: { id: 'user-1' } }, error: null });
  });

  it('lists completed scorecards with their course (locks current behaviour)', async () => {
    wireTables([eligibleRow('sc-1', null)]);

    const eligible = await getEligibleScorecards('league-1');

    expect(eligible).toEqual([
      expect.objectContaining({
        id: 'sc-1',
        course_name: 'Test Course',
        needs_recalculation: false,
      }),
    ]);
  });

  it('filters early-ended rounds out in the query', async () => {
    wireTables([]);

    await getEligibleScorecards('league-1');

    const select = scorecardCalls.find((c) => c.method === 'select');
    expect(String(select?.args[0])).toContain('rounds!inner');
    expect(String(select?.args[0])).toContain('holes_played');
    expect(scorecardCalls).toContainEqual({ method: 'is', args: ['rounds.holes_played', null] });
  });

  it('drops an early-ended row even if the server returns it', async () => {
    wireTables([
      eligibleRow('sc-full', null),
      eligibleRow('sc-ended', 6),
      eligibleRow('sc-ended-nine', 9),
    ]);

    const eligible = await getEligibleScorecards('league-1');

    expect(eligible.map((s) => s.id)).toEqual(['sc-full']);
  });
  it('keeps existing tagged, player, status, deletion, eclectic and order filters (locks current behaviour)', async () => {
    wireTables([], [{ scorecard_id: 'tagged-1' }, { scorecard_id: 'tagged-2' }]);
    await getEligibleScorecards('league-1', {
      league_type: 'eclectic',
      course_id: 'course-1',
    } as League);
    expect(scorecardCalls).toEqual(
      expect.arrayContaining([
        { method: 'eq', args: ['player_id', 'user-1'] },
        { method: 'in', args: ['status', ['completed', 'confirmed']] },
        { method: 'is', args: ['rounds.deleted_at', null] },
        { method: 'order', args: ['created_at', { ascending: false }] },
        { method: 'not', args: ['id', 'in', '(tagged-1,tagged-2)'] },
        { method: 'eq', args: ['rounds.course_id', 'course-1'] },
      ])
    );
    expect(String(scorecardCalls.find((c) => c.method === 'select')?.args[0])).toContain(
      'rounds!inner'
    );
  });

  it('preserves missing metadata and recalculation mapping (locks current behaviour)', async () => {
    const row = { ...eligibleRow('legacy', null), rounds: undefined, handicap_differential: null };
    wireTables([row]);
    expect(await getEligibleScorecards('league-1')).toEqual([
      {
        id: 'legacy',
        round_id: 'round-legacy',
        player_id: 'user-1',
        handicap_differential: null,
        status: 'completed',
        created_at: '2026-09-10T08:00:00Z',
        total_gross: 90,
        course_name: null,
        club_name: null,
        course_id: null,
        needs_recalculation: true,
      },
    ]);
  });

  it('preserves the authentication error (locks current behaviour)', async () => {
    mockGetUser.mockResolvedValue({ data: { user: null }, error: null });
    await expect(getEligibleScorecards('league-1')).rejects.toThrow('You must be logged in');
    expect(mockFrom).not.toHaveBeenCalled();
  });

  it('preserves the query error (locks current behaviour)', async () => {
    wireTables([], [], { message: 'query failed' });
    const logError = jest.spyOn(console, 'error').mockImplementation(() => undefined);
    try {
      await expect(getEligibleScorecards('league-1')).rejects.toThrow(
        'Failed to fetch eligible scorecards: query failed'
      );
      expect(logError).toHaveBeenCalled();
    } finally {
      logError.mockRestore();
    }
  });
});
