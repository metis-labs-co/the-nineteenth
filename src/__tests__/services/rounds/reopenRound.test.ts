// src/__tests__/services/rounds/reopenRound.test.ts
import { reopenRound } from '@/services/rounds/reopenRound';
import { supabase } from '@/services/supabase/client';

jest.mock('@/services/supabase/client', () => ({
  supabase: { from: jest.fn() },
}));

function mockRoundsUpdate(result: { data: unknown[] | null; error: unknown }) {
  const select = jest.fn().mockResolvedValue(result);
  const eq = jest.fn().mockReturnValue({ select });
  const update = jest.fn().mockReturnValue({ eq });
  return { update, _update: update, _eq: eq };
}

describe('reopenRound', () => {
  afterEach(() => jest.restoreAllMocks());

  it('sets status to in-progress', async () => {
    const rounds = mockRoundsUpdate({ data: [{ id: 'r1', status: 'in-progress' }], error: null });
    (supabase.from as jest.Mock).mockReturnValue(rounds);

    await reopenRound('r1');

    expect(supabase.from).toHaveBeenCalledWith('rounds');
    expect(rounds._update).toHaveBeenCalledWith({ status: 'in-progress' });
    expect(rounds._eq).toHaveBeenCalledWith('id', 'r1');
  });

  it('throws when 0 rows are affected (RLS)', async () => {
    (supabase.from as jest.Mock).mockReturnValue(mockRoundsUpdate({ data: [], error: null }));
    await expect(reopenRound('r1')).rejects.toThrow(/0 rows/);
  });
});
