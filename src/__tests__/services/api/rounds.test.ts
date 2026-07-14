/**
 * Unit tests for fetchRoundIdsWithSideGame — the shared helper that stamps
 * has_skins / has_wolf flags onto round lists.
 */

import { fetchRoundIdsWithSideGame } from '@/services/api/rounds';

const mockFrom = jest.fn();
jest.mock('@/services/supabase/client', () => ({
  supabase: { from: (...args: unknown[]) => mockFrom(...args) },
}));

/**
 * Wire supabase.from(table).select('round_id').in('round_id', ids)
 *   .in('status', [...]) to resolve `result` (or throw if `throws` set).
 */
function mockSideGameQuery(result: { data: unknown; error: unknown } | Error) {
  const inStatus = jest.fn(() =>
    result instanceof Error ? Promise.reject(result) : Promise.resolve(result)
  );
  const inRound = jest.fn(() => ({ in: inStatus }));
  const selectFn = jest.fn(() => ({ in: inRound }));
  mockFrom.mockReturnValue({ select: selectFn });
  return { selectFn, inRound, inStatus };
}

describe('fetchRoundIdsWithSideGame', () => {
  let errorSpy: jest.SpyInstance;

  beforeEach(() => {
    mockFrom.mockReset();
    errorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    errorSpy.mockRestore();
  });

  it('short-circuits on an empty round-id list without querying', async () => {
    const set = await fetchRoundIdsWithSideGame('skins_games', []);
    expect(set.size).toBe(0);
    expect(mockFrom).not.toHaveBeenCalled();
  });

  it('queries the given table filtered by round ids and active/completed status', async () => {
    const { selectFn, inRound, inStatus } = mockSideGameQuery({ data: [], error: null });
    await fetchRoundIdsWithSideGame('wolf_games', ['r1', 'r2']);

    expect(mockFrom).toHaveBeenCalledWith('wolf_games');
    expect(selectFn).toHaveBeenCalledWith('round_id');
    expect(inRound).toHaveBeenCalledWith('round_id', ['r1', 'r2']);
    expect(inStatus).toHaveBeenCalledWith('status', ['active', 'completed']);
  });

  it('returns the set of round ids that have a side game', async () => {
    mockSideGameQuery({
      data: [{ round_id: 'r1' }, { round_id: 'r3' }],
      error: null,
    });
    const set = await fetchRoundIdsWithSideGame('skins_games', ['r1', 'r2', 'r3']);
    expect(set.has('r1')).toBe(true);
    expect(set.has('r2')).toBe(false);
    expect(set.has('r3')).toBe(true);
  });

  it('swallows a missing-table (PGRST205) error without logging', async () => {
    mockSideGameQuery({ data: null, error: { code: 'PGRST205', message: 'no table' } });
    const set = await fetchRoundIdsWithSideGame('skins_games', ['r1']);
    expect(set.size).toBe(0);
    expect(errorSpy).not.toHaveBeenCalled();
  });

  it('logs a non-PGRST205 error and returns an empty set', async () => {
    mockSideGameQuery({ data: null, error: { code: '500', message: 'boom' } });
    const set = await fetchRoundIdsWithSideGame('wolf_games', ['r1']);
    expect(set.size).toBe(0);
    expect(errorSpy).toHaveBeenCalled();
  });

  it('returns an empty set if the query throws', async () => {
    mockSideGameQuery(new Error('network'));
    const set = await fetchRoundIdsWithSideGame('skins_games', ['r1']);
    expect(set.size).toBe(0);
  });
});
