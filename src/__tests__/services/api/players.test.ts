/**
 * Unit tests for the shared player-lookup helpers introduced by the skins/wolf
 * fetch consolidation. These back 13 participant-fetch sites, so their
 * behaviour (dedup, projection, error swallowing) is covered here rather than
 * per consuming hook.
 */

import { fetchPlayersByIds, fetchPlayerListByIds } from '@/services/api/players';

const mockFrom = jest.fn();
jest.mock('@/services/supabase/client', () => ({
  supabase: { from: (...args: unknown[]) => mockFrom(...args) },
}));

/** Wire supabase.from('players').select(...).in('id', ids) to resolve `result`. */
function mockPlayersQuery(result: { data: unknown; error: unknown }) {
  const inFn = jest.fn().mockResolvedValue(result);
  const selectFn = jest.fn(() => ({ in: inFn }));
  mockFrom.mockReturnValue({ select: selectFn });
  return { inFn, selectFn };
}

describe('fetchPlayersByIds', () => {
  let errorSpy: jest.SpyInstance;

  beforeEach(() => {
    mockFrom.mockReset();
    errorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    errorSpy.mockRestore();
  });

  it('short-circuits on an empty id list without querying', async () => {
    const map = await fetchPlayersByIds([]);
    expect(map.size).toBe(0);
    expect(mockFrom).not.toHaveBeenCalled();
  });

  it('deduplicates and drops falsy ids before querying', async () => {
    const { inFn } = mockPlayersQuery({ data: [], error: null });
    await fetchPlayersByIds(['a', 'a', '', undefined as unknown as string, 'b']);
    expect(inFn).toHaveBeenCalledWith('id', ['a', 'b']);
  });

  it('returns a Map keyed by id, projecting to {id, name, handicap}', async () => {
    mockPlayersQuery({
      data: [
        { id: 'a', name: 'Ann', handicap: 5, extra: 'ignored' },
        { id: 'b', name: 'Bob', handicap: null },
      ],
      error: null,
    });
    const map = await fetchPlayersByIds(['a', 'b']);
    expect(map.size).toBe(2);
    // Extra columns are stripped; handicap null is preserved.
    expect(map.get('a')).toEqual({ id: 'a', name: 'Ann', handicap: 5 });
    expect(map.get('b')).toEqual({ id: 'b', name: 'Bob', handicap: null });
  });

  it('logs and returns an empty Map on a query error (never throws)', async () => {
    const error = { message: 'boom' };
    mockPlayersQuery({ data: null, error });
    const map = await fetchPlayersByIds(['a']);
    expect(map.size).toBe(0);
    expect(errorSpy).toHaveBeenCalledWith(
      '[fetchPlayersByIds] Failed to fetch players:',
      error
    );
  });

  it('still returns any rows that came back alongside an error', async () => {
    mockPlayersQuery({
      data: [{ id: 'a', name: 'Ann', handicap: 5 }],
      error: { message: 'partial' },
    });
    const map = await fetchPlayersByIds(['a']);
    expect(map.get('a')).toEqual({ id: 'a', name: 'Ann', handicap: 5 });
    expect(errorSpy).toHaveBeenCalled();
  });

  it('treats null data as an empty result', async () => {
    mockPlayersQuery({ data: null, error: null });
    const map = await fetchPlayersByIds(['a']);
    expect(map.size).toBe(0);
    expect(errorSpy).not.toHaveBeenCalled();
  });
});

describe('fetchPlayerListByIds', () => {
  beforeEach(() => {
    mockFrom.mockReset();
    jest.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('returns the players as an array in DB return order', async () => {
    mockPlayersQuery({
      data: [
        { id: 'b', name: 'Bob', handicap: 2 },
        { id: 'a', name: 'Ann', handicap: 5 },
      ],
      error: null,
    });
    const list = await fetchPlayerListByIds(['a', 'b']);
    expect(list).toEqual([
      { id: 'b', name: 'Bob', handicap: 2 },
      { id: 'a', name: 'Ann', handicap: 5 },
    ]);
  });

  it('returns an empty array for an empty id list', async () => {
    const list = await fetchPlayerListByIds([]);
    expect(list).toEqual([]);
    expect(mockFrom).not.toHaveBeenCalled();
  });
});
