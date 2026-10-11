import { viewRoundParams } from './openRound';

describe('viewRoundParams', () => {
  it('opens the scorecard tab with the competition id', () => {
    expect(viewRoundParams({ roundId: 'r1', competitionId: 'c1' })).toEqual({
      roundId: 'r1',
      competitionId: 'c1',
      initialTab: 'scorecard',
    });
  });

  it('drops null or empty competition ids (standalone rounds)', () => {
    expect(viewRoundParams({ roundId: 'r1', competitionId: null }).competitionId).toBeUndefined();
    expect(viewRoundParams({ roundId: 'r1', competitionId: '' }).competitionId).toBeUndefined();
  });

  it('honours a requested tab', () => {
    expect(viewRoundParams({ roundId: 'r1', initialTab: 'skins' }).initialTab).toBe('skins');
  });
});
