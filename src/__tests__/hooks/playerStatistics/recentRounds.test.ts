import { excludeEndedEarly, recentRoundEndedEarlyLabel } from '@/hooks/playerStatistics/recentRounds';

describe('recentRoundEndedEarlyLabel', () => {
  it.each([
    ['full', 'Ended after 6 of 18'], ['front9', 'Ended after 6 of 9'], ['back9', 'Ended after 6 of 9'],
  ] as const)('labels an ended %s round', (nineType, expected) => {
    expect(recentRoundEndedEarlyLabel({ roundHolesPlayed: 6, nineType })).toBe(expected);
  });

  it('defaults old summaries without a nine type to full', () => {
    expect(recentRoundEndedEarlyLabel({ roundHolesPlayed: 6 })).toBe('Ended after 6 of 18');
  });

  it.each([null, undefined, 0, -1, 1.5, NaN])('keeps invalid/ordinary marker %s unlabelled', (roundHolesPlayed) => {
    expect(recentRoundEndedEarlyLabel({ roundHolesPlayed, nineType: 'full' })).toBeNull();
  });
});

describe('excludeEndedEarly', () => {
  it('drops valid ends independently of scored count and keeps ordinary invalid markers in order', () => {
    const rounds = [
      { roundId: 'null', roundHolesPlayed: null, holesPlayed: 9 },
      { roundId: 'ended', roundHolesPlayed: 6, holesPlayed: 18 },
      { roundId: 'missing', holesPlayed: 6 },
      ...[0, -1, 1.5, NaN].map((roundHolesPlayed, i) => ({ roundId: `invalid-${i}`, roundHolesPlayed })),
    ];
    const result = excludeEndedEarly(rounds);
    expect(result.map((r) => r.roundId)).toEqual(['null', 'missing', 'invalid-0', 'invalid-1', 'invalid-2', 'invalid-3']);
    expect(result[0]).toBe(rounds[0]);
    expect(rounds).toHaveLength(7);
  });

  it('always returns a fresh array so subsequent sorting cannot mutate input', () => {
    const rounds = [{ roundId: 'b', roundHolesPlayed: null }, { roundId: 'a' }];
    const result = excludeEndedEarly(rounds);
    expect(result).not.toBe(rounds);
    result.sort((a, b) => a.roundId.localeCompare(b.roundId));
    expect(rounds.map((r) => r.roundId)).toEqual(['b', 'a']);
    const empty: typeof rounds = [];
    expect(excludeEndedEarly(empty)).not.toBe(empty);
  });
});
