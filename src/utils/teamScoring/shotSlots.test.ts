import { getShotSlotsForPar } from './shotSlots';

describe('getShotSlotsForPar', () => {
  it('returns Tee Shot, Chip, Putt for par 3', () => {
    const slots = getShotSlotsForPar(3);
    expect(slots).toHaveLength(3);
    expect(slots.map((s) => s.label)).toEqual(['Tee Shot', 'Chip', 'Putt']);
    expect(slots.map((s) => s.slot)).toEqual(['teeShot', 'approach', 'putt']);
  });

  it('returns Tee Shot, Approach, Putt for par 4', () => {
    const slots = getShotSlotsForPar(4);
    expect(slots).toHaveLength(3);
    expect(slots.map((s) => s.label)).toEqual(['Tee Shot', 'Approach', 'Putt']);
    expect(slots.map((s) => s.slot)).toEqual(['teeShot', 'approach', 'putt']);
  });

  it('returns Tee Shot, Second Shot, Approach, Putt for par 5', () => {
    const slots = getShotSlotsForPar(5);
    expect(slots).toHaveLength(4);
    expect(slots.map((s) => s.label)).toEqual([
      'Tee Shot',
      'Second Shot',
      'Approach',
      'Putt',
    ]);
    expect(slots.map((s) => s.slot)).toEqual([
      'teeShot',
      'secondShot',
      'approach',
      'putt',
    ]);
  });

  it('reuses the `approach` slot key for the par-3 chip', () => {
    // Important: par 3 "Chip" must write to the same JSON field as par 4
    // "Approach" so the data model stays compact and we don't need a
    // separate `chip` field.
    const par3 = getShotSlotsForPar(3);
    const par4 = getShotSlotsForPar(4);
    const par3Chip = par3.find((s) => s.label === 'Chip');
    const par4Approach = par4.find((s) => s.label === 'Approach');
    expect(par3Chip?.slot).toBe(par4Approach?.slot);
  });

  it('falls back to par-4 layout for unexpected par values', () => {
    const slots = getShotSlotsForPar(2 as 3);
    expect(slots.map((s) => s.label)).toEqual(['Tee Shot', 'Approach', 'Putt']);
  });
});
