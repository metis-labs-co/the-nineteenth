import { shotLogKeys } from '@/hooks/queryKeys';

describe('shotLogKeys', () => {
  it('all is a stable scalar key', () => {
    expect(shotLogKeys.all).toEqual(['shotLog']);
  });

  it('byRound nests under all', () => {
    expect(shotLogKeys.byRound('round-1')).toEqual(['shotLog', 'round', 'round-1']);
  });

  it('byHole nests under byRound', () => {
    expect(shotLogKeys.byHole('round-1', 7)).toEqual([
      'shotLog',
      'round',
      'round-1',
      'hole',
      7,
    ]);
  });

  it('different rounds produce different keys', () => {
    expect(shotLogKeys.byRound('a')).not.toEqual(shotLogKeys.byRound('b'));
  });
});
