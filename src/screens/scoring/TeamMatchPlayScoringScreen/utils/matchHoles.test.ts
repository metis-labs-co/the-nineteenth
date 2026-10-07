import { resolveMatchHoles } from './matchHoles';
import { DEFAULT_HOLES } from '../constants';
import { create18Holes } from '@/__tests__/utils/testFixtures';

describe('resolveMatchHoles', () => {
  const course = create18Holes();

  it('keeps all 18 holes for a full round', () => {
    const r = resolveMatchHoles(course, 'full');
    expect(r.holes).toHaveLength(18);
    expect(r.firstHoleNumber).toBe(1);
    expect(r.lastHoleNumber).toBe(18);
  });

  it('narrows a front-9 round to holes 1-9', () => {
    const r = resolveMatchHoles(course, 'front9');
    expect(r.holes.map((h) => h.number)).toEqual([1, 2, 3, 4, 5, 6, 7, 8, 9]);
    expect(r.firstHoleNumber).toBe(1);
    expect(r.lastHoleNumber).toBe(9);
  });

  it('narrows a back-9 round to holes 10-18', () => {
    const r = resolveMatchHoles(course, 'back9');
    expect(r.holes.map((h) => h.number)).toEqual([10, 11, 12, 13, 14, 15, 16, 17, 18]);
    expect(r.firstHoleNumber).toBe(10);
    expect(r.lastHoleNumber).toBe(18);
  });

  it('falls back to the default card, still nine-filtered, when the course has no holes', () => {
    const r = resolveMatchHoles(null, 'back9');
    expect(r.holes.map((h) => h.number)).toEqual([10, 11, 12, 13, 14, 15, 16, 17, 18]);
    expect(r.holes[0]).toBe(DEFAULT_HOLES[9]);
  });

  it("uses the nine's hole range for bounds when the course hole list is empty", () => {
    const r = resolveMatchHoles([], 'back9');
    expect(r.holes).toEqual([]);
    expect(r.firstHoleNumber).toBe(10);
    expect(r.lastHoleNumber).toBe(18);
  });
});
