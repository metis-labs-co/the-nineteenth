import { forceFinalizeRound, NoCompletedScorecardsError } from '@/services/rounds/forceFinalizeRound';
import { supabase } from '@/services/supabase/client';
import * as refinalize from '@/services/rounds/refinalizeRoundResults';

jest.mock('@/services/supabase/client', () => ({
  supabase: { from: jest.fn() },
}));

/** Build the chainable mock for `from('scorecards').select(...).eq(...)`. */
function mockScorecards(rows: { status: string }[]) {
  const eq = jest.fn().mockResolvedValue({ data: rows, error: null });
  return { select: jest.fn().mockReturnValue({ eq }) };
}

/** Build the chainable mock for `from('rounds').update(...).eq(...).select(...)`. */
function mockRoundsUpdate(result: { data: unknown[] | null; error: unknown }) {
  const select = jest.fn().mockResolvedValue(result);
  const eq = jest.fn().mockReturnValue({ select });
  const update = jest.fn().mockReturnValue({ eq });
  return { update, _update: update, _eq: eq };
}

describe('forceFinalizeRound', () => {
  afterEach(() => jest.restoreAllMocks());

  it('throws NoCompletedScorecardsError when no terminal scorecards exist', async () => {
    (supabase.from as jest.Mock).mockImplementation((table: string) => {
      if (table === 'scorecards') return mockScorecards([{ status: 'in-progress' }]);
      throw new Error(`unexpected table ${table}`);
    });
    const refSpy = jest.spyOn(refinalize, 'refinalizeRoundResults').mockResolvedValue(undefined);

    await expect(forceFinalizeRound('round-1')).rejects.toBeInstanceOf(NoCompletedScorecardsError);
    expect(refSpy).not.toHaveBeenCalled();
  });

  it('flips status to completed and re-finalizes when at least one card is terminal', async () => {
    const rounds = mockRoundsUpdate({ data: [{ id: 'round-1', status: 'completed' }], error: null });
    (supabase.from as jest.Mock).mockImplementation((table: string) => {
      if (table === 'scorecards') return mockScorecards([{ status: 'completed' }, { status: 'in-progress' }]);
      if (table === 'rounds') return rounds;
      throw new Error(`unexpected table ${table}`);
    });
    const refSpy = jest.spyOn(refinalize, 'refinalizeRoundResults').mockResolvedValue(undefined);

    await forceFinalizeRound('round-1');

    expect(rounds._update).toHaveBeenCalledWith({ status: 'completed' });
    expect(rounds._eq).toHaveBeenCalledWith('id', 'round-1');
    expect(refSpy).toHaveBeenCalledWith('round-1');
  });

  it('throws when the update affects 0 rows (RLS)', async () => {
    (supabase.from as jest.Mock).mockImplementation((table: string) => {
      if (table === 'scorecards') return mockScorecards([{ status: 'confirmed' }]);
      if (table === 'rounds') return mockRoundsUpdate({ data: [], error: null });
      throw new Error(`unexpected table ${table}`);
    });
    jest.spyOn(refinalize, 'refinalizeRoundResults').mockResolvedValue(undefined);

    await expect(forceFinalizeRound('round-1')).rejects.toThrow(/0 rows/);
  });
});
