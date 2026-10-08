/**
 * fetchSkinsHoleCounts — an ended-early round settles on the holes played.
 *
 * A5a reads only rounds.nine_type (the column didn't exist yet). Once B1a adds
 * rounds.holes_played, the fetch must select it too, or every settlement path
 * (finalizeSkinsGame, the queued finalise, useSkinsGameState's auto-finalise)
 * prices an ended-early round as if it had been played in full.
 *
 * @see src/services/skins/roundHoleCounts.ts
 */
import { fetchSkinsHoleCounts } from '@/services/skins/roundHoleCounts';

const mockFrom = jest.fn();
jest.mock('@/services/supabase/client', () => ({
  supabase: { from: (...args: unknown[]) => mockFrom(...args) },
}));

/**
 * Chainable builder; single() and maybeSingle() both resolve `row`, keeping
 * ONLY the columns named in select() — like PostgREST, so a fetch that
 * doesn't select holes_played never sees it.
 */
function mockRoundQuery(row: Record<string, unknown>) {
  let selected = '';
  const builder: Record<string, jest.Mock> = {};
  const resolve = () => {
    const columns = selected.split(',').map((c) => c.trim());
    const data = Object.fromEntries(Object.entries(row).filter(([key]) => columns.includes(key)));
    return Promise.resolve({ data, error: null });
  };
  builder.select = jest.fn((columns: string) => {
    selected = columns;
    return builder;
  });
  builder.eq = jest.fn(() => builder);
  builder.single = jest.fn(resolve);
  builder.maybeSingle = jest.fn(resolve);
  mockFrom.mockReturnValue(builder);
  return builder;
}

describe('fetchSkinsHoleCounts — holes_played', () => {
  beforeEach(() => {
    mockFrom.mockReset();
  });

  it('selects holes_played alongside nine_type', async () => {
    const builder = mockRoundQuery({ nine_type: 'full', holes_played: null });

    await fetchSkinsHoleCounts('r1');

    expect(mockFrom).toHaveBeenCalledWith('rounds');
    expect(builder.select).toHaveBeenCalledTimes(1);
    const selected = String(builder.select.mock.calls[0][0]);
    expect(selected).toMatch(/\bnine_type\b/);
    expect(selected).toMatch(/\bholes_played\b/);
    expect(builder.eq).toHaveBeenCalledWith('id', 'r1');
  });

  it('settles an 18-hole round ended after 6 on 6 of 18 holes', async () => {
    mockRoundQuery({ nine_type: 'full', holes_played: 6 });

    await expect(fetchSkinsHoleCounts('r1')).resolves.toEqual({ plannedHoles: 18, holesPlayed: 6 });
  });

  it('settles a back-9 round ended after 6 on 6 of 9 holes', async () => {
    mockRoundQuery({ nine_type: 'back9', holes_played: 6 });

    await expect(fetchSkinsHoleCounts('r1')).resolves.toEqual({ plannedHoles: 9, holesPlayed: 6 });
  });

  it('keeps a round played as planned on its planned holes', async () => {
    mockRoundQuery({ nine_type: 'front9', holes_played: null });

    await expect(fetchSkinsHoleCounts('r1')).resolves.toEqual({ plannedHoles: 9, holesPlayed: 9 });
  });
});
