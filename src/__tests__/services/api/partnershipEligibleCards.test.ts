/**
 * Completed scorecards offered when tagging a partnership round. Early-ended
 * rounds carry no handicap differential (I12) and must never be offered.
 */
import { getPartnershipEligibleCards } from '@/services/api/partnershipLeagues';

const mockFrom = jest.fn();
jest.mock('@/services/supabase/client', () => ({
  supabase: { from: (...args: unknown[]) => mockFrom(...args) },
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

function cardRow(id: string, playerId: string, holesPlayed: number | null) {
  return {
    id,
    player_id: playerId,
    total_gross: 88,
    status: 'completed',
    daily_handicap_used: 14,
    course_rating_used: 71.2,
    slope_rating_used: 128,
    rounds: {
      date: '2026-09-10',
      course_id: 'course-1',
      par: 72,
      holes_played: holesPlayed,
      courses: { name: 'Test Course' },
    },
  };
}

let calls: Call[] = [];

function wire(result: { data: unknown; error: unknown }) {
  calls = [];
  mockFrom.mockImplementation(() => recordingQuery(result, calls));
}

describe('getPartnershipEligibleCards', () => {
  beforeEach(() => { jest.clearAllMocks(); });

  it('maps completed scorecards for the given players (locks current behaviour)', async () => {
    wire({ data: [cardRow('sc-1', 'user-1', null)], error: null });
    const cards = await getPartnershipEligibleCards(['user-1', 'user-2']);
    expect(mockFrom).toHaveBeenCalledWith('scorecards');
    expect(cards).toEqual([{
      id: 'sc-1', playerId: 'user-1', totalGross: 88,
      courseName: 'Test Course', courseId: 'course-1',
      courseRating: 71.2, slopeRating: 128, par: 72,
      datePlayed: '2026-09-10', dailyHandicap: 14,
    }]);
  });

  it('preserves the inner join, filters and date order (locks current behaviour)', async () => {
    wire({ data: [], error: null });
    await getPartnershipEligibleCards(['user-1', 'user-2']);
    expect(String(calls.find((c) => c.method === 'select')?.args[0])).toContain('rounds!inner');
    expect(calls).toEqual(expect.arrayContaining([
      { method: 'in', args: ['player_id', ['user-1', 'user-2']] },
      { method: 'in', args: ['status', ['completed', 'confirmed']] },
      { method: 'not', args: ['total_gross', 'is', null] },
      { method: 'is', args: ['rounds.deleted_at', null] },
      { method: 'order', args: ['created_at', { ascending: false }] },
    ]));
    expect(calls.at(-1)).toEqual({ method: 'order', args: ['created_at', { ascending: false }] });
  });

  it('keeps null defaults and numeric zero (locks current behaviour)', async () => {
    wire({ data: [{ id: 'legacy', player_id: 'user-1', total_gross: 0 }], error: null });
    expect(await getPartnershipEligibleCards(['user-1'])).toEqual([{
      id: 'legacy', playerId: 'user-1', totalGross: 0,
      courseName: 'Unknown', courseId: null, courseRating: null,
      slopeRating: null, par: null, datePlayed: null, dailyHandicap: null,
    }]);
    wire({ data: [{ ...cardRow('zero', 'user-1', null), daily_handicap_used: 0,
      course_rating_used: 0, slope_rating_used: 0, rounds: { par: 0, courses: null } }], error: null });
    expect(await getPartnershipEligibleCards(['user-1'])).toEqual([{
      id: 'zero', playerId: 'user-1', totalGross: 88,
      courseName: 'Unknown', courseId: null, courseRating: 0,
      slopeRating: 0, par: 0, datePlayed: null, dailyHandicap: 0,
    }]);
  });

  it('returns an empty list for null data (locks current behaviour)', async () => {
    wire({ data: null, error: null });
    expect(await getPartnershipEligibleCards(['user-1'])).toEqual([]);
  });

  it('throws the query error (locks current behaviour)', async () => {
    const error = { message: 'boom' };
    wire({ data: null, error });
    await expect(getPartnershipEligibleCards(['user-1'])).rejects.toBe(error);
  });

  it('filters early-ended rounds out in the query', async () => {
    wire({ data: [], error: null });
    await getPartnershipEligibleCards(['user-1']);
    expect(String(calls.find((c) => c.method === 'select')?.args[0])).toContain('holes_played');
    expect(calls).toContainEqual({ method: 'is', args: ['rounds.holes_played', null] });
  });

  it('drops an early-ended card even if the server returns it', async () => {
    wire({ data: [cardRow('sc-full', 'user-1', null), cardRow('sc-ended', 'user-1', 6),
      cardRow('sc-ended-nine', 'user-1', 9)], error: null });
    expect((await getPartnershipEligibleCards(['user-1'])).map((c) => c.id)).toEqual(['sc-full']);
  });

  it('uses a joined SQL filter for early-ended rounds', async () => {
    wire({ data: [], error: null });
    await getPartnershipEligibleCards(['user-1']);
    expect(String(calls.find((c) => c.method === 'select')?.args[0])).toContain('rounds!inner');
    expect(calls).toContainEqual({ method: 'is', args: ['rounds.holes_played', null] });
  });

  it('keeps planned-nine and legacy cards (locks current behaviour)', async () => {
    const plannedNine = cardRow('planned-nine', 'user-1', null);
    const { holes_played: _marker, ...legacyRound } = plannedNine.rounds;
    wire({ data: [
      { ...plannedNine, rounds: { ...plannedNine.rounds, nine_type: 'front9' } },
      { ...cardRow('legacy', 'user-1', null), rounds: legacyRound },
    ], error: null });
    expect((await getPartnershipEligibleCards(['user-1'])).map((c) => c.id)).toEqual(['planned-nine', 'legacy']);
  });
});
