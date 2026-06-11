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

  it('treats Sunday as the last day of its week, not the first of the next', () => {
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

  it('spans year boundaries', () => {
    // Thursday 31 December 2026
    expect(getWeekRange(new Date(2026, 11, 31))).toEqual({
      start: '2026-12-28',
      end: '2027-01-03',
    });
  });
});
