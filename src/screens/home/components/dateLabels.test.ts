import { localDateStr, formatDayLabel } from './dateLabels';

describe('localDateStr', () => {
  it('formats a date as local YYYY-MM-DD', () => {
    expect(localDateStr(new Date('2026-06-26T08:30:00'))).toBe('2026-06-26');
  });
});

describe('formatDayLabel', () => {
  it('returns empty string for null', () => {
    expect(formatDayLabel(null)).toBe('');
  });

  it('returns "Today" for today', () => {
    const today = localDateStr(new Date());
    expect(formatDayLabel(today)).toBe('Today');
  });

  it('returns "Tomorrow" for tomorrow', () => {
    const tomorrow = localDateStr(new Date(Date.now() + 24 * 60 * 60 * 1000));
    expect(formatDayLabel(tomorrow)).toBe('Tomorrow');
  });

  it('returns a weekday for a more distant date', () => {
    const today = localDateStr(new Date());
    const distant = today === '2026-06-26' ? '2026-07-10' : '2026-06-26';
    expect(formatDayLabel(distant)).not.toBe('');
    expect(['Today', 'Tomorrow']).not.toContain(formatDayLabel(distant));
  });
});
