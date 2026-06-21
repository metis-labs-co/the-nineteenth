import { validateAltShotPairs } from './altShotValidation';

describe('validateAltShotPairs', () => {
  it('returns no offenders when every team has exactly 2 members', () => {
    expect(
      validateAltShotPairs([
        { id: 't1', memberIds: ['a', 'b'] },
        { id: 't2', memberIds: ['c', 'd'] },
      ])
    ).toEqual([]);
  });

  it('flags teams that are not pairs', () => {
    expect(
      validateAltShotPairs([
        { id: 't1', memberIds: ['a', 'b', 'c'] },
        { id: 't2', memberIds: ['d'] },
        { id: 't3', memberIds: ['e', 'f'] },
      ])
    ).toEqual([
      { teamId: 't1', size: 3 },
      { teamId: 't2', size: 1 },
    ]);
  });
});
