import { filterHolesByNineType, filterPlayableHoles } from './holeTransformers';
import type { Hole } from '@/types';

const hole = (n: number): Hole => ({ number: n as Hole['number'], par: 4, strokeIndex: n });
const numbers = (holes: Hole[]) => holes.map((h) => h.number);

const EIGHTEEN: Hole[] = Array.from({ length: 18 }, (_, i) => hole(i + 1));
// Scrambled order, as some course imports deliver holes.
const UNSORTED: Hole[] = [3, 1, 2, 12, 10, 11, 18, 9, 4, 5, 6, 7, 8, 13, 14, 15, 16, 17].map(hole);

describe('filterHolesByNineType (characterization)', () => {
  it('returns the input array itself for full, without sorting', () => {
    expect(filterHolesByNineType(EIGHTEEN, 'full')).toBe(EIGHTEEN);
    expect(filterHolesByNineType(UNSORTED, 'full')).toBe(UNSORTED);
  });

  it('keeps holes 1–9 for front9, in input order', () => {
    expect(numbers(filterHolesByNineType(EIGHTEEN, 'front9'))).toEqual([1, 2, 3, 4, 5, 6, 7, 8, 9]);
    expect(numbers(filterHolesByNineType(UNSORTED, 'front9'))).toEqual([3, 1, 2, 9, 4, 5, 6, 7, 8]);
  });

  it('keeps holes 10–18 for back9, in input order', () => {
    expect(numbers(filterHolesByNineType(EIGHTEEN, 'back9'))).toEqual([10, 11, 12, 13, 14, 15, 16, 17, 18]);
    expect(numbers(filterHolesByNineType(UNSORTED, 'back9'))).toEqual([12, 10, 11, 18, 13, 14, 15, 16, 17]);
  });

  it('is idempotent', () => {
    const back = filterHolesByNineType(EIGHTEEN, 'back9');
    expect(filterHolesByNineType(back, 'back9')).toEqual(back);
    const front = filterHolesByNineType(EIGHTEEN, 'front9');
    expect(filterHolesByNineType(front, 'front9')).toEqual(front);
  });
});

describe('filterPlayableHoles', () => {
  it.each([null, undefined])('is identical to filterHolesByNineType when holesPlayed is %s', (holesPlayed) => {
    expect(filterPlayableHoles(UNSORTED, 'full', holesPlayed)).toBe(UNSORTED);
    expect(filterPlayableHoles(UNSORTED, 'back9', holesPlayed)).toEqual(
      filterHolesByNineType(UNSORTED, 'back9')
    );
  });

  it('keeps holes 1–6 of a full round ended after 6', () => {
    expect(numbers(filterPlayableHoles(EIGHTEEN, 'full', 6))).toEqual([1, 2, 3, 4, 5, 6]);
  });

  it('keeps holes 10–15 of a back-9 round ended after 6 (Review Focus #2)', () => {
    expect(numbers(filterPlayableHoles(EIGHTEEN, 'back9', 6))).toEqual([10, 11, 12, 13, 14, 15]);
  });

  it('keeps holes 1–9 of an 18-hole round ended after 9 (no front-9 conversion)', () => {
    expect(numbers(filterPlayableHoles(EIGHTEEN, 'full', 9))).toEqual([1, 2, 3, 4, 5, 6, 7, 8, 9]);
  });

  it('sorts by hole number before taking the first N', () => {
    expect(numbers(filterPlayableHoles(UNSORTED, 'full', 4))).toEqual([1, 2, 3, 4]);
    expect(numbers(filterPlayableHoles(UNSORTED, 'back9', 3))).toEqual([10, 11, 12]);
  });

  it('returns every planned hole, sorted, when holesPlayed is at or above the planned count', () => {
    expect(numbers(filterPlayableHoles(UNSORTED, 'full', 30))).toEqual(numbers(EIGHTEEN));
    expect(numbers(filterPlayableHoles(UNSORTED, 'front9', 9))).toEqual([1, 2, 3, 4, 5, 6, 7, 8, 9]);
  });

  it.each([0, -3, 2.5])('treats holesPlayed %s as "played as planned"', (holesPlayed) => {
    expect(filterPlayableHoles(UNSORTED, 'full', holesPlayed)).toBe(UNSORTED);
  });

  it('does not mutate the source holes or their order when sorting and truncating', () => {
    const holes = [hole(12), hole(10), hole(11), hole(1)];
    const original = holes.map((h) => ({ ...h }));
    holes.forEach(Object.freeze);
    Object.freeze(holes);

    expect(numbers(filterPlayableHoles(holes, 'back9', 2))).toEqual([10, 11]);
    expect(holes).toEqual(original);
  });
});
