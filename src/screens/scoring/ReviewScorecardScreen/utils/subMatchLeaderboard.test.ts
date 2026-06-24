import { resolveSubMatchModel } from './subMatchLeaderboard';

describe('resolveSubMatchModel', () => {
  it('maps match-play game type to the match-play model', () => {
    expect(resolveSubMatchModel('match-play', null)).toBe('match-play');
    expect(resolveSubMatchModel('match-play', 'match-play-team')).toBe('match-play');
  });

  it('maps alt-shot and aggregate to net, best-ball to points', () => {
    expect(resolveSubMatchModel('alt-shot', 'alt-shot')).toBe('alt-shot');
    expect(resolveSubMatchModel('stroke', 'aggregate')).toBe('aggregate');
    expect(resolveSubMatchModel('stableford', 'best-ball')).toBe('best-ball');
  });

  it('defaults unknown combinations to aggregate (net)', () => {
    expect(resolveSubMatchModel('stroke', null)).toBe('aggregate');
  });
});
