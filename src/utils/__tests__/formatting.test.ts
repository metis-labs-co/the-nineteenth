import { getWeekRange, formatTimeAgo } from '../formatting';

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

describe('formatTimeAgo', () => {
  const now = new Date('2026-06-12T12:00:00Z');

  it('returns "now" for under a minute ago', () => {
    expect(formatTimeAgo('2026-06-12T11:59:30Z', now)).toBe('now');
  });

  it('returns minutes under an hour', () => {
    expect(formatTimeAgo('2026-06-12T11:55:00Z', now)).toBe('5m');
  });

  it('returns hours under a day', () => {
    expect(formatTimeAgo('2026-06-12T09:00:00Z', now)).toBe('3h');
  });

  it('returns days under a week', () => {
    expect(formatTimeAgo('2026-06-10T12:00:00Z', now)).toBe('2d');
  });

  it('returns weeks under a year', () => {
    expect(formatTimeAgo('2026-05-29T12:00:00Z', now)).toBe('2w');
  });

  it('returns years beyond that', () => {
    expect(formatTimeAgo('2024-06-12T12:00:00Z', now)).toBe('2y');
  });

  it('returns empty string for null or invalid input', () => {
    expect(formatTimeAgo(null, now)).toBe('');
    expect(formatTimeAgo('not-a-date', now)).toBe('');
  });

  it('returns "59m" at 59 minutes', () => {
    expect(formatTimeAgo('2026-06-12T11:01:00Z', now)).toBe('59m');
  });

  it('returns "1h" at exactly 60 minutes', () => {
    expect(formatTimeAgo('2026-06-12T11:00:00Z', now)).toBe('1h');
  });

  it('returns "1d" at exactly 24 hours', () => {
    expect(formatTimeAgo('2026-06-11T12:00:00Z', now)).toBe('1d');
  });

  it('returns "1w" at exactly 7 days', () => {
    expect(formatTimeAgo('2026-06-05T12:00:00Z', now)).toBe('1w');
  });

  it('returns "52w" at 364 days', () => {
    expect(formatTimeAgo('2025-06-13T12:00:00Z', now)).toBe('52w');
  });

  it('returns "1y" at exactly 365 days', () => {
    expect(formatTimeAgo('2025-06-12T12:00:00Z', now)).toBe('1y');
  });

  it('treats future timestamps as "now"', () => {
    expect(formatTimeAgo('2026-06-12T12:05:00Z', now)).toBe('now');
  });
});
