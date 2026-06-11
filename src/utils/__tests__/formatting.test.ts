import { getWeekRange } from '../formatting';

describe('getWeekRange', () => {
  it('returns Monday to Sunday for a midweek date', () => {
    // Thursday 11 June 2026
    expect(getWeekRange(new Date(2026, 5, 11))).toEqual({
      start: '2026-06-08',
      end: '2026-06-14',
    });
  });

  it('treats Monday as the start of its own week', () => {
    expect(getWeekRange(new Date(2026, 5, 8))).toEqual({
      start: '2026-06-08',
      end: '2026-06-14',
    });
  });

  it('keeps Sunday in the preceding week (week starts Monday)', () => {
    expect(getWeekRange(new Date(2026, 5, 14))).toEqual({
      start: '2026-06-08',
      end: '2026-06-14',
    });
  });

  it('spans month boundaries', () => {
    // Wednesday 1 July 2026
    expect(getWeekRange(new Date(2026, 6, 1))).toEqual({
      start: '2026-06-29',
      end: '2026-07-05',
    });
  });
});
