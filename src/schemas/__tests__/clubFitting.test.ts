import { clubFittingSchema } from '../clubFitting';
import { EMPTY_FITTING } from '@/utils/clubFitting';

describe('clubFittingSchema', () => {
  it('accepts an all-null fitting (everything optional)', () => {
    const result = clubFittingSchema.safeParse(EMPTY_FITTING);
    expect(result.success).toBe(true);
  });

  it('trims free-text fields and coerces empty to null', () => {
    const result = clubFittingSchema.safeParse({
      ...EMPTY_FITTING,
      brand: '  Mizuno  ',
      model: '   ',
      notes: '',
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.brand).toBe('Mizuno');
      expect(result.data.model).toBeNull();
      expect(result.data.notes).toBeNull();
    }
  });

  describe('loftDegrees bounds', () => {
    it('accepts 0 (lowest allowed)', () => {
      const result = clubFittingSchema.safeParse({ ...EMPTY_FITTING, loftDegrees: 0 });
      expect(result.success).toBe(true);
    });

    it('accepts 80 (highest allowed)', () => {
      const result = clubFittingSchema.safeParse({ ...EMPTY_FITTING, loftDegrees: 80 });
      expect(result.success).toBe(true);
    });

    it('rejects -1', () => {
      const result = clubFittingSchema.safeParse({ ...EMPTY_FITTING, loftDegrees: -1 });
      expect(result.success).toBe(false);
    });

    it('rejects 81', () => {
      const result = clubFittingSchema.safeParse({ ...EMPTY_FITTING, loftDegrees: 81 });
      expect(result.success).toBe(false);
    });
  });

  describe('lieAngleDegrees bounds', () => {
    it('accepts 50 and 75', () => {
      expect(
        clubFittingSchema.safeParse({ ...EMPTY_FITTING, lieAngleDegrees: 50 }).success
      ).toBe(true);
      expect(
        clubFittingSchema.safeParse({ ...EMPTY_FITTING, lieAngleDegrees: 75 }).success
      ).toBe(true);
    });

    it('rejects 49 and 76', () => {
      expect(
        clubFittingSchema.safeParse({ ...EMPTY_FITTING, lieAngleDegrees: 49 }).success
      ).toBe(false);
      expect(
        clubFittingSchema.safeParse({ ...EMPTY_FITTING, lieAngleDegrees: 76 }).success
      ).toBe(false);
    });
  });

  describe('shaftLengthInches bounds', () => {
    it('accepts 30 and 50', () => {
      expect(
        clubFittingSchema.safeParse({ ...EMPTY_FITTING, shaftLengthInches: 30 }).success
      ).toBe(true);
      expect(
        clubFittingSchema.safeParse({ ...EMPTY_FITTING, shaftLengthInches: 50 }).success
      ).toBe(true);
    });

    it('rejects 29 and 51', () => {
      expect(
        clubFittingSchema.safeParse({ ...EMPTY_FITTING, shaftLengthInches: 29 }).success
      ).toBe(false);
      expect(
        clubFittingSchema.safeParse({ ...EMPTY_FITTING, shaftLengthInches: 51 }).success
      ).toBe(false);
    });
  });

  describe('shaftFlex enum', () => {
    it.each(['L', 'A', 'R', 'S', 'X', 'TX'])('accepts %s', (v) => {
      expect(
        clubFittingSchema.safeParse({ ...EMPTY_FITTING, shaftFlex: v }).success
      ).toBe(true);
    });

    it('rejects an unknown flex', () => {
      expect(
        clubFittingSchema.safeParse({ ...EMPTY_FITTING, shaftFlex: 'Stiff' }).success
      ).toBe(false);
    });
  });

  it('rejects overly long brand text', () => {
    const longBrand = 'x'.repeat(121);
    expect(
      clubFittingSchema.safeParse({ ...EMPTY_FITTING, brand: longBrand }).success
    ).toBe(false);
  });

  it('rejects overly long notes', () => {
    const longNotes = 'x'.repeat(501);
    expect(
      clubFittingSchema.safeParse({ ...EMPTY_FITTING, notes: longNotes }).success
    ).toBe(false);
  });
});
