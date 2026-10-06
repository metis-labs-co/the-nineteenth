import { decideMarginBonus } from '@/services/rounds/marginBonus';

describe('decideMarginBonus', () => {
  const bonus = { points: 1, tie: 'split' as const };

  it('awards the full bonus to the higher net margin', () => {
    const m = new Map([['a', 2], ['b', -2]]);
    const out = decideMarginBonus(m, bonus);
    expect(out.get('a')).toBe(1);
    expect(out.get('b') ?? 0).toBe(0);
  });

  it('splits on an exact tie when tie=split', () => {
    const m = new Map([['a', 0], ['b', 0]]);
    const out = decideMarginBonus(m, bonus);
    expect(out.get('a')).toBe(0.5);
    expect(out.get('b')).toBe(0.5);
  });

  it('awards nothing on a tie when tie=void', () => {
    const m = new Map([['a', 1], ['b', 1]]);
    const out = decideMarginBonus(m, { points: 1, tie: 'void' });
    expect(out.size).toBe(0);
  });

  it('awards nothing on a tie when tie=carry', () => {
    const m = new Map([['a', 3], ['b', 3]]);
    const out = decideMarginBonus(m, { points: 1, tie: 'carry' });
    expect(out.size).toBe(0);
  });

  it('returns empty for an empty margin map', () => {
    expect(decideMarginBonus(new Map(), bonus).size).toBe(0);
  });
});
