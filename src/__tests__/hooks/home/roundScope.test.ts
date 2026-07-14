/**
 * Unit tests for the shared Home round-scope helpers used by
 * useInProgressRounds and useUpcomingRounds.
 */

import {
  fetchAcceptedCompetitionIds,
  applyUserRoundScope,
} from '@/hooks/home/roundScope';

const mockFrom = jest.fn();
jest.mock('@/services/supabase/client', () => ({
  supabase: { from: (...args: unknown[]) => mockFrom(...args) },
}));

/**
 * Wire supabase.from('competition_players').select('competition_id')
 *   .eq('player_id', id).eq('status', 'accepted') to resolve `result`,
 * capturing the select/eq calls for assertions.
 */
function mockCompetitionPlayers(result: { data: unknown; error: unknown }) {
  const eqStatus = jest.fn().mockResolvedValue(result);
  const eqPlayer = jest.fn(() => ({ eq: eqStatus }));
  const selectFn = jest.fn(() => ({ eq: eqPlayer }));
  mockFrom.mockReturnValue({ select: selectFn });
  return { selectFn, eqPlayer, eqStatus };
}

describe('fetchAcceptedCompetitionIds', () => {
  let errorSpy: jest.SpyInstance;

  beforeEach(() => {
    mockFrom.mockReset();
    errorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    errorSpy.mockRestore();
  });

  it('queries accepted competition_players for the user', async () => {
    const { selectFn, eqPlayer, eqStatus } = mockCompetitionPlayers({
      data: [],
      error: null,
    });
    await fetchAcceptedCompetitionIds('user-1', 'useUpcomingRounds');

    expect(mockFrom).toHaveBeenCalledWith('competition_players');
    expect(selectFn).toHaveBeenCalledWith('competition_id');
    expect(eqPlayer).toHaveBeenCalledWith('player_id', 'user-1');
    expect(eqStatus).toHaveBeenCalledWith('status', 'accepted');
  });

  it('returns competition ids, filtering out falsy values', async () => {
    mockCompetitionPlayers({
      data: [
        { competition_id: 'c1' },
        { competition_id: '' },
        { competition_id: 'c2' },
      ],
      error: null,
    });
    const ids = await fetchAcceptedCompetitionIds('user-1', 'useInProgressRounds');
    expect(ids).toEqual(['c1', 'c2']);
  });

  it('logs (tagged) and returns [] on error, never throwing', async () => {
    const error = { message: 'nope' };
    mockCompetitionPlayers({ data: null, error });
    const ids = await fetchAcceptedCompetitionIds('user-1', 'useUpcomingRounds');
    expect(ids).toEqual([]);
    expect(errorSpy).toHaveBeenCalledWith(
      '[useUpcomingRounds] Error fetching competition players:',
      error
    );
  });

  it('treats null data as no accepted competitions', async () => {
    mockCompetitionPlayers({ data: null, error: null });
    const ids = await fetchAcceptedCompetitionIds('user-1', 'useInProgressRounds');
    expect(ids).toEqual([]);
  });
});

describe('applyUserRoundScope', () => {
  it('ORs owned standalone rounds with accepted-competition rounds', () => {
    const orFn = jest.fn(() => 'or-result');
    const query = { or: orFn, eq: jest.fn(), is: jest.fn() };

    const result = applyUserRoundScope(query, 'user-1', ['c1', 'c2']);

    expect(orFn).toHaveBeenCalledWith(
      'user_id.eq.user-1,competition_id.in.(c1,c2)'
    );
    expect(result).toBe('or-result');
    expect(query.eq).not.toHaveBeenCalled();
  });

  it('restricts to owned standalone rounds when no accepted competitions', () => {
    const isFn = jest.fn(() => 'scoped-result');
    const eqFn = jest.fn(() => ({ is: isFn }));
    const orFn = jest.fn();
    const query = { eq: eqFn, is: isFn, or: orFn };

    const result = applyUserRoundScope(query, 'user-1', []);

    expect(eqFn).toHaveBeenCalledWith('user_id', 'user-1');
    expect(isFn).toHaveBeenCalledWith('competition_id', null);
    expect(result).toBe('scoped-result');
    expect(orFn).not.toHaveBeenCalled();
  });
});
