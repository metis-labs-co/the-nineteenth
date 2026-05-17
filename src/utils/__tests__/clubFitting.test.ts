import {
  EMPTY_FITTING,
  countFilledFields,
  fittingEquals,
  fittingSummary,
  hasFitting,
  isShaftFlex,
  mergeFitting,
  otherIronsInBag,
  type ClubFitting,
} from '../clubFitting';
import type { ClubKey } from '@/constants/clubs';

const filled: ClubFitting = {
  brand: 'Mizuno',
  model: 'JPX 925 Tour',
  loftDegrees: 27,
  lieAngleDegrees: 62.5,
  shaftBrand: 'Project X',
  shaftModel: 'LZ',
  shaftFlex: 'S',
  shaftLengthInches: 37.5,
  notes: '+1° upright',
};

describe('hasFitting', () => {
  it('returns false for an all-null fitting', () => {
    expect(hasFitting(EMPTY_FITTING)).toBe(false);
  });

  it('returns true when any field is set', () => {
    expect(hasFitting({ ...EMPTY_FITTING, brand: 'Ping' })).toBe(true);
    expect(hasFitting({ ...EMPTY_FITTING, loftDegrees: 10.5 })).toBe(true);
    expect(hasFitting({ ...EMPTY_FITTING, notes: 'x' })).toBe(true);
  });

  it('ignores empty strings (treats them as unset)', () => {
    expect(hasFitting({ ...EMPTY_FITTING, brand: '' })).toBe(false);
  });
});

describe('fittingSummary', () => {
  it('returns null when nothing is set', () => {
    expect(fittingSummary(EMPTY_FITTING)).toBeNull();
  });

  it('prefers Brand · Model when present', () => {
    expect(fittingSummary(filled)).toBe('Mizuno · JPX 925 Tour');
  });

  it('uses just brand if model missing', () => {
    expect(fittingSummary({ ...EMPTY_FITTING, brand: 'Ping' })).toBe('Ping');
  });

  it('falls back to loft/flex/length/lie when no brand/model', () => {
    expect(
      fittingSummary({
        ...EMPTY_FITTING,
        loftDegrees: 10.5,
        shaftFlex: 'S',
        shaftLengthInches: 45.5,
        lieAngleDegrees: 60,
      })
    ).toBe('10.5° · Stiff · 45.5" · lie 60°');
  });
});

describe('mergeFitting', () => {
  it('copies non-null source fields onto target', () => {
    const target: ClubFitting = { ...EMPTY_FITTING, loftDegrees: 30 };
    const source: ClubFitting = {
      ...EMPTY_FITTING,
      brand: 'Mizuno',
      shaftFlex: 'S',
    };
    expect(mergeFitting(target, source)).toEqual({
      ...EMPTY_FITTING,
      loftDegrees: 30,
      brand: 'Mizuno',
      shaftFlex: 'S',
    });
  });

  it('null source fields do NOT overwrite target', () => {
    const target: ClubFitting = { ...EMPTY_FITTING, loftDegrees: 30, brand: 'Old' };
    const source: ClubFitting = { ...EMPTY_FITTING, brand: 'New', loftDegrees: null };
    const out = mergeFitting(target, source);
    expect(out.brand).toBe('New');
    // target.loftDegrees preserved because source.loftDegrees was null
    expect(out.loftDegrees).toBe(30);
  });

  it('empty string source fields do NOT overwrite target', () => {
    const target: ClubFitting = { ...EMPTY_FITTING, brand: 'Old' };
    const source: ClubFitting = { ...EMPTY_FITTING, brand: '' };
    expect(mergeFitting(target, source).brand).toBe('Old');
  });
});

describe('otherIronsInBag', () => {
  it('returns numbered irons in the bag excluding the given key', () => {
    const bag: ClubKey[] = [
      'putter',
      'driver',
      '5-iron',
      '6-iron',
      '7-iron',
      '8-iron',
      '9-iron',
      'pitching-wedge',
      'sand-wedge',
    ];
    expect(otherIronsInBag(bag, '7-iron')).toEqual([
      '5-iron',
      '6-iron',
      '8-iron',
      '9-iron',
    ]);
  });

  it('excludes wedges (including PW) and putter', () => {
    const bag: ClubKey[] = ['5-iron', 'pitching-wedge', 'sand-wedge', 'putter'];
    expect(otherIronsInBag(bag, '5-iron')).toEqual([]);
  });

  it('returns empty when no other irons present', () => {
    expect(otherIronsInBag(['driver', 'putter'], 'driver')).toEqual([]);
  });
});

describe('fittingEquals', () => {
  it('returns true for two empty fittings', () => {
    expect(fittingEquals(EMPTY_FITTING, EMPTY_FITTING)).toBe(true);
  });

  it('returns false when one field differs', () => {
    expect(fittingEquals(filled, { ...filled, loftDegrees: 28 })).toBe(false);
  });

  it('returns true for deeply-equal fittings', () => {
    expect(fittingEquals(filled, { ...filled })).toBe(true);
  });
});

describe('countFilledFields', () => {
  it('counts zero for empty', () => {
    expect(countFilledFields(EMPTY_FITTING)).toBe(0);
  });

  it('counts the right number for a fully filled fitting', () => {
    expect(countFilledFields(filled)).toBe(9);
  });

  it('does not count empty strings', () => {
    expect(countFilledFields({ ...EMPTY_FITTING, brand: '' })).toBe(0);
  });
});

describe('isShaftFlex', () => {
  it('accepts known flex codes', () => {
    expect(isShaftFlex('S')).toBe(true);
    expect(isShaftFlex('TX')).toBe(true);
  });

  it('rejects unknown values', () => {
    expect(isShaftFlex('Stiff')).toBe(false);
    expect(isShaftFlex(null)).toBe(false);
    expect(isShaftFlex(undefined)).toBe(false);
    expect(isShaftFlex('')).toBe(false);
  });
});
