import { compareVersions, isBelow } from '../compareVersions';

describe('compareVersions', () => {
  it('treats equal versions as 0', () => {
    expect(compareVersions('1.13.1', '1.13.1')).toBe(0);
  });

  it('treats missing patch as zero', () => {
    expect(compareVersions('1.9', '1.9.0')).toBe(0);
  });

  it('orders numerically, not lexically (1.9.0 < 1.10.0)', () => {
    expect(compareVersions('1.9.0', '1.10.0')).toBe(-1);
    expect(compareVersions('1.10.0', '1.9.0')).toBe(1);
  });

  it('compares major then minor then patch', () => {
    expect(compareVersions('2.0.0', '1.99.99')).toBe(1);
    expect(compareVersions('1.13.0', '1.13.1')).toBe(-1);
  });

  it('handles leading zeros safely', () => {
    expect(compareVersions('1.08.0', '1.8.0')).toBe(0);
  });
});

describe('isBelow', () => {
  it('is true when running is older than target', () => {
    expect(isBelow('1.13.0', '1.13.1')).toBe(true);
  });
  it('is false when running equals or exceeds target', () => {
    expect(isBelow('1.13.1', '1.13.1')).toBe(false);
    expect(isBelow('1.14.0', '1.13.1')).toBe(false);
  });
});
