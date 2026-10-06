import { buildPositionalRoundNumbers } from './roundNumbering';

describe('buildPositionalRoundNumbers', () => {
  it('numbers rounds positionally by display_order (1-based), ignoring round_number gaps', () => {
    const rounds = [
      { id: 'c', display_order: 3 },
      { id: 'a', display_order: 1 },
      { id: 'b', display_order: 2 },
    ];
    const map = buildPositionalRoundNumbers(rounds);
    expect(map.get('a')).toBe(1);
    expect(map.get('b')).toBe(2);
    expect(map.get('c')).toBe(3);
  });

  it('closes gaps left by a deleted round (display_order 1,2,4 -> positions 1,2,3)', () => {
    const rounds = [
      { id: 'a', display_order: 1 },
      { id: 'b', display_order: 2 },
      { id: 'd', display_order: 4 },
    ];
    const map = buildPositionalRoundNumbers(rounds);
    expect(map.get('a')).toBe(1);
    expect(map.get('b')).toBe(2);
    expect(map.get('d')).toBe(3);
  });

  it('returns an empty map for no rounds', () => {
    expect(buildPositionalRoundNumbers([]).size).toBe(0);
  });
});
