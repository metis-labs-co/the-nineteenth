import { hazardKeys } from '@/hooks/queryKeys';

describe('hazardKeys', () => {
  it('all is the root scalar', () => {
    expect(hazardKeys.all).toEqual(['holeHazards']);
  });

  it('byCourse nests under all', () => {
    expect(hazardKeys.byCourse('course-1')).toEqual([
      'holeHazards',
      'course',
      'course-1',
    ]);
  });

  it('byHole nests under byCourse', () => {
    expect(hazardKeys.byHole('course-1', 7)).toEqual([
      'holeHazards',
      'course',
      'course-1',
      'hole',
      7,
    ]);
  });
});
