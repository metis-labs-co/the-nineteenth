import { isPairPointsOverride } from './finalizePairResults';

describe('isPairPointsOverride — split team_points fallback', () => {
  it('is true for a split round with pair_points', () => {
    expect(
      isPairPointsOverride('split', { pair_points: { win: 1, tie: 0.5, loss: 0 } })
    ).toBe(true);
  });

  it('is true for a split round with only team_points (legacy singles match play)', () => {
    expect(
      isPairPointsOverride('split', { team_points: { win: 2, tie: 1, loss: 0 } })
    ).toBe(true);
  });

  it('is false for a non-split round even with team_points', () => {
    expect(
      isPairPointsOverride('combined', { team_points: { win: 2, tie: 1, loss: 0 } })
    ).toBe(false);
  });

  it('is false for a split round with no points override', () => {
    expect(isPairPointsOverride('split', null)).toBe(false);
    expect(isPairPointsOverride('split', {})).toBe(false);
  });
});
