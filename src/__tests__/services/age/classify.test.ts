import {
  classifyDateOfBirth,
  classifyAgeRangeResponse,
} from '@/services/age/classify';

// Constructed from local components on purpose. `new Date('2013-09-05')` parses as
// UTC midnight but classifyDateOfBirth compares with local getters, so in any
// negative-offset timezone the boundary cases would land a day early and these
// tests would fail on CI while passing locally.
const NOW = new Date(2026, 8, 4, 12, 0, 0); // 4 Sep 2026, local noon

describe('classifyDateOfBirth', () => {
  it('returns under13 the day before the 13th birthday', () => {
    expect(classifyDateOfBirth(new Date(2013, 8, 5), NOW)).toBe('under13');
  });

  it('returns eligible on the 13th birthday', () => {
    expect(classifyDateOfBirth(new Date(2013, 8, 4), NOW)).toBe('eligible');
  });

  it('returns eligible the day after the 13th birthday', () => {
    expect(classifyDateOfBirth(new Date(2013, 8, 3), NOW)).toBe('eligible');
  });

  it('returns under13 for a 12-year-old', () => {
    expect(classifyDateOfBirth(new Date(2015, 0, 1), NOW)).toBe('under13');
  });

  it('handles a 29 February birthday without throwing', () => {
    expect(classifyDateOfBirth(new Date(2012, 1, 29), NOW)).toBe('eligible');
  });

  it('returns under13 in the birth month before the birthday lands', () => {
    // Same month as NOW, day still ahead: the off-by-one this guards against
    // would report eligible.
    expect(classifyDateOfBirth(new Date(2013, 8, 30), NOW)).toBe('under13');
  });

  it('returns unknown for a future date', () => {
    expect(classifyDateOfBirth(new Date(2030, 0, 1), NOW)).toBe('unknown');
  });

  it('returns unknown for an invalid date', () => {
    expect(classifyDateOfBirth(new Date('nonsense'), NOW)).toBe('unknown');
  });
});

describe('classifyAgeRangeResponse', () => {
  it('returns eligible when the lower bound is at or above 13', () => {
    expect(classifyAgeRangeResponse({ lowerBound: 13, upperBound: 15 })).toBe('eligible');
    expect(classifyAgeRangeResponse({ lowerBound: 18, upperBound: null })).toBe('eligible');
  });

  it('returns under13 when the upper bound is below 13', () => {
    expect(classifyAgeRangeResponse({ lowerBound: null, upperBound: 12 })).toBe('under13');
  });

  it('returns unknown when both bounds are null', () => {
    expect(classifyAgeRangeResponse({ lowerBound: null, upperBound: null })).toBe('unknown');
  });

  // expo-age-range@0.2.1 declares both bounds as optional (number | undefined),
  // not nullable as the newer SDK docs describe. Absent must behave like null.
  it('returns unknown when the bounds are absent entirely', () => {
    expect(classifyAgeRangeResponse({})).toBe('unknown');
  });

  it('returns eligible when only an adult lowerBound is present', () => {
    expect(classifyAgeRangeResponse({ lowerBound: 18 })).toBe('eligible');
  });
});
