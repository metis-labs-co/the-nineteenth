import { resolveSplitMatchDisplayPoints } from './subMatchLeaderboard';

describe('resolveSplitMatchDisplayPoints', () => {
  it('reads pair_points for a split round', () => {
    expect(
      resolveSplitMatchDisplayPoints({
        round_format: 'split',
        rules_override: { pair_points: { win: 2, tie: 1, loss: 0 } },
      })
    ).toEqual({ win: 2, tie: 1 });
  });

  it('falls back to team_points for a split round without pair_points (legacy data)', () => {
    expect(
      resolveSplitMatchDisplayPoints({
        round_format: 'split',
        rules_override: { team_points: { win: 2, tie: 1, loss: 0 } },
      })
    ).toEqual({ win: 2, tie: 1 });
  });

  it('returns the flat default for a non-split round', () => {
    expect(
      resolveSplitMatchDisplayPoints({
        round_format: 'combined',
        rules_override: { team_points: { win: 5, tie: 2, loss: 0 } },
      })
    ).toEqual({ win: 1, tie: 0.5 });
  });

  it('returns the flat default when there is no override', () => {
    expect(
      resolveSplitMatchDisplayPoints({ round_format: 'split', rules_override: null })
    ).toEqual({ win: 1, tie: 0.5 });
  });
});
