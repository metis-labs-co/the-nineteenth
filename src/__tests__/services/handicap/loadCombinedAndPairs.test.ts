/**
 * Combined 9+9 entries in the Social Handicap history link to both source
 * rounds so either scorecard can be opened.
 */
import { fetchCombinedHandicapRounds } from '@/services/handicap/loadCombinedAndPairs';

const mockResults: Record<string, { data: unknown; error: unknown }> = {};

function mockChain(table: string) {
  const result = () => Promise.resolve(mockResults[table]);
  const builder: Record<string, unknown> = {};
  for (const m of ['select', 'eq', 'in', 'order']) builder[m] = () => builder;
  builder.limit = result;
  builder.then = (resolve: (v: unknown) => unknown, reject: (e: unknown) => unknown) =>
    result().then(resolve, reject);
  return builder;
}

jest.mock('@/services/supabase/client', () => ({
  supabase: { from: (table: string) => mockChain(table) },
}));

const combinedRow = {
  id: 'combined-1',
  player_id: 'p1',
  front_scorecard_id: 'sc-front',
  back_scorecard_id: 'sc-back',
  course_id: 'c1',
  combined_gross: 90,
  handicap_differential: 15.1,
  course_rating_used: 70,
  slope_rating_used: 125,
  daily_handicap_used: 16,
  effective_date: '2026-10-02',
  courses: { id: 'c1', name: 'The Beach', clubs: { id: 'cl1', name: 'Beach GC' } },
};

describe('fetchCombinedHandicapRounds', () => {
  it('links a combined entry to its front and back rounds', async () => {
    mockResults.handicap_combined_rounds = { data: [combinedRow], error: null };
    mockResults.scorecards = {
      data: [
        { id: 'sc-front', round_id: 'round-front', rounds: { competition_id: null } },
        { id: 'sc-back', round_id: 'round-back', rounds: { competition_id: 'comp-9' } },
      ],
      error: null,
    };

    const [entry] = await fetchCombinedHandicapRounds('p1');

    expect(entry.roundId).toBe('round-front');
    expect(entry.combinedFrontRound).toEqual({ roundId: 'round-front', competitionId: null });
    expect(entry.combinedBackRound).toEqual({ roundId: 'round-back', competitionId: 'comp-9' });
  });

  it('still returns combined entries when the round lookup fails', async () => {
    mockResults.handicap_combined_rounds = { data: [combinedRow], error: null };
    mockResults.scorecards = { data: null, error: { message: 'boom' } };
    jest.spyOn(console, 'error').mockImplementation(() => {});

    const entries = await fetchCombinedHandicapRounds('p1');

    expect(entries).toHaveLength(1);
    expect(entries[0].combinedFrontRound).toBeNull();
  });
});
