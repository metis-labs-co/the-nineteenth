import { indexById } from '@/utils/collections';

describe('indexById', () => {
  it('builds a Map keyed by id, preserving the full object', () => {
    const players = [
      { id: 'a', name: 'Ann' },
      { id: 'b', name: 'Bob' },
    ];
    const byId = indexById(players);
    expect(byId.size).toBe(2);
    expect(byId.get('a')).toBe(players[0]);
    expect(byId.get('b')).toEqual({ id: 'b', name: 'Bob' });
    expect(byId.get('missing')).toBeUndefined();
  });

  it('returns an empty Map for an empty array', () => {
    expect(indexById([]).size).toBe(0);
  });

  it('keeps the last object when ids collide', () => {
    const byId = indexById([
      { id: 'a', v: 1 },
      { id: 'a', v: 2 },
    ]);
    expect(byId.size).toBe(1);
    expect(byId.get('a')).toEqual({ id: 'a', v: 2 });
  });
});
