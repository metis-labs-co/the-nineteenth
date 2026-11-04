import { formatDailyHandicap, formatHandicapIndex } from '@/utils/displayHelpers';

describe('formatDailyHandicap', () => {
  it('shows a whole-number Daily Handicap without a sign', () => {
    expect(formatDailyHandicap(14)).toBe('14');
  });

  it('shows plus Daily Handicaps with "+", never "-" (GA Test Procedure 14 ii)', () => {
    expect(formatDailyHandicap(-2)).toBe('+2');
    expect(formatDailyHandicap(-6)).toBe('+6');
  });

  it('shows zero (including -0 from Math.round) as "0"', () => {
    expect(formatDailyHandicap(0)).toBe('0');
    expect(formatDailyHandicap(-0)).toBe('0');
  });

  it('returns the placeholder for missing values', () => {
    expect(formatDailyHandicap(null)).toBe('—');
    expect(formatDailyHandicap(undefined)).toBe('—');
  });
});

describe('formatHandicapIndex', () => {
  it('shows plus handicaps with "+"', () => {
    expect(formatHandicapIndex(-2.4)).toBe('+2.4');
    expect(formatHandicapIndex(12.4)).toBe('12.4');
  });
});
