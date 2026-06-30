import { formatMatchMargin } from '@/utils/matchMargin';

describe('formatMatchMargin', () => {
  it('formats a dormie win as "X&Y"', () => {
    expect(formatMatchMargin(6, 5, false)).toBe('6&5');
    expect(formatMatchMargin(3, 2, false)).toBe('3&2');
  });
  it('formats a win that went the distance as "XUP"', () => {
    expect(formatMatchMargin(1, 0, false)).toBe('1UP');
    expect(formatMatchMargin(4, 0, false)).toBe('4UP');
  });
  it('formats a halved match as "A/S"', () => {
    expect(formatMatchMargin(0, 0, true)).toBe('A/S');
    expect(formatMatchMargin(5, 3, true)).toBe('A/S');
  });
});
