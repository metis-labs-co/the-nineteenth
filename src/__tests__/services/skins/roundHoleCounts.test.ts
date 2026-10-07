/**
 * fetchSkinsHoleCounts — the hole counts a round's skins games are priced
 * and settled on, read from the round row.
 */
import { fetchSkinsHoleCounts } from '@/services/skins/roundHoleCounts';

const mockFrom = jest.fn();
jest.mock('@/services/supabase/client', () => ({
  supabase: { from: (...args: unknown[]) => mockFrom(...args) },
}));

jest.mock('@/services/errors', () => ({
  createError: (message: string) => new Error(message),
}));

/** Chainable builder whose terminal `maybeSingle()` resolves `result`. */
function mockRoundQuery(result: { data: unknown; error: unknown }) {
  const builder: Record<string, jest.Mock> = {};
  builder.select = jest.fn(() => builder);
  builder.eq = jest.fn(() => builder);
  builder.maybeSingle = jest.fn(() => Promise.resolve(result));
  mockFrom.mockReturnValue(builder);
  return builder;
}

describe('fetchSkinsHoleCounts', () => {
  beforeEach(() => {
    mockFrom.mockReset();
  });

  it('reads the round nine type and plans 9 holes for a front nine', async () => {
    const builder = mockRoundQuery({ data: { nine_type: 'front9' }, error: null });

    await expect(fetchSkinsHoleCounts('r1')).resolves.toEqual({ plannedHoles: 9, holesPlayed: 9 });
    expect(mockFrom).toHaveBeenCalledWith('rounds');
    expect(builder.select).toHaveBeenCalledWith('nine_type');
    expect(builder.eq).toHaveBeenCalledWith('id', 'r1');
  });

  it('plans 18 for a full round', async () => {
    mockRoundQuery({ data: { nine_type: 'full' }, error: null });

    await expect(fetchSkinsHoleCounts('r1')).resolves.toEqual({ plannedHoles: 18, holesPlayed: 18 });
  });

  it('keeps the 18-hole default when the round row is not visible', async () => {
    mockRoundQuery({ data: null, error: null });

    await expect(fetchSkinsHoleCounts('r1')).resolves.toEqual({ plannedHoles: 18, holesPlayed: 18 });
  });

  it('throws when the round cannot be read, so money is never settled on a guess', async () => {
    mockRoundQuery({ data: null, error: { message: 'boom' } });

    await expect(fetchSkinsHoleCounts('r1')).rejects.toThrow(
      /Failed to load round for skins pricing: boom/
    );
  });
});
