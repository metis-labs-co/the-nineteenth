import { getViewRoundHoles } from './viewRoundHoles';
import { create18Holes } from '@/__tests__/utils/testFixtures';

const range = (from: number, to: number) =>
  Array.from({ length: to - from + 1 }, (_, i) => from + i);
const numbers = (holes: { number: number }[]) => holes.map(h => h.number);

describe('getViewRoundHoles', () => {
  it('plans and plays every hole of a full round played as planned', () => {
    const r = getViewRoundHoles({ nine_type: 'full', holes_played: null, course: { holes: create18Holes() } });
    expect(numbers(r.plannedHoles)).toEqual(range(1, 18));
    expect(numbers(r.playedHoles)).toEqual(range(1, 18));
    expect(r.holesPlayed).toBeNull();
  });

  it('keeps 18 planned holes but plays 1–6 for a full round ended after 6', () => {
    const r = getViewRoundHoles({ nine_type: 'full', holes_played: 6, course: { holes: create18Holes() } });
    expect(numbers(r.plannedHoles)).toEqual(range(1, 18));
    expect(numbers(r.playedHoles)).toEqual(range(1, 6));
    expect(r.holesPlayed).toBe(6);
  });

  it('plans 10–18 and plays 10–15 for a back-9 round ended after 6', () => {
    const r = getViewRoundHoles({ nine_type: 'back9', holes_played: 6, course: { holes: create18Holes() } });
    expect(numbers(r.plannedHoles)).toEqual(range(10, 18));
    expect(numbers(r.playedHoles)).toEqual(range(10, 15));
  });

  it('plans and plays 1–9 for a front-9 round played as planned', () => {
    const r = getViewRoundHoles({ nine_type: 'front9', holes_played: null, course: { holes: create18Holes() } });
    expect(numbers(r.plannedHoles)).toEqual(range(1, 9));
    expect(numbers(r.playedHoles)).toEqual(range(1, 9));
  });

  it.each([undefined, null])('defaults missing nine_type and holes_played to a full planned round (%s)', nine_type => {
    const r = getViewRoundHoles({ nine_type, course: { holes: create18Holes() } });
    expect(numbers(r.plannedHoles)).toEqual(range(1, 18));
    expect(numbers(r.playedHoles)).toEqual(range(1, 18));
    expect(r.holesPlayed).toBeNull();
  });

  it.each([undefined, null, {}, { holes: null }, { holes: [] }])(
    'returns empty hole lists when course hole data is missing (%s)', course => {
      expect(getViewRoundHoles({ nine_type: 'full', course })).toEqual({
        plannedHoles: [], playedHoles: [], holesPlayed: null,
      });
    }
  );

  it('orders only the played back-nine prefix without mutating shuffled course metadata', () => {
    const holes = create18Holes().reverse();
    const r = getViewRoundHoles({ nine_type: 'back9', holes_played: 6, course: { holes } });
    expect(numbers(r.plannedHoles)).toEqual([18, 17, 16, 15, 14, 13, 12, 11, 10]);
    expect(numbers(r.playedHoles)).toEqual([10, 11, 12, 13, 14, 15]);
    expect(numbers(holes)).toEqual([18, 17, 16, 15, 14, 13, 12, 11, 10, 9, 8, 7, 6, 5, 4, 3, 2, 1]);
    expect(r.holesPlayed).toBe(6);
  });

  it.each([0, -1, 2.5, NaN, Infinity])(
    'preserves an invalid raw marker %s without sorting or shortening the planned back nine', holes_played => {
      const holes = create18Holes().reverse();
      const r = getViewRoundHoles({ nine_type: 'back9', holes_played, course: { holes } });
      expect(numbers(r.plannedHoles)).toEqual([18, 17, 16, 15, 14, 13, 12, 11, 10]);
      expect(numbers(r.playedHoles)).toEqual([18, 17, 16, 15, 14, 13, 12, 11, 10]);
      expect(r.holesPlayed).toBe(holes_played);
    }
  );
});
