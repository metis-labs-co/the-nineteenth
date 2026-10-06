import { clampIndex, getHoverIndex, computeReorderShift } from './reorderMath';

describe('clampIndex', () => {
  it('clamps below zero to zero', () => {
    expect(clampIndex(-3, 5)).toBe(0);
  });
  it('clamps above the last index', () => {
    expect(clampIndex(9, 5)).toBe(4);
  });
  it('returns zero for an empty list', () => {
    expect(clampIndex(2, 0)).toBe(0);
  });
  it('passes an in-range value through', () => {
    expect(clampIndex(2, 5)).toBe(2);
  });
});

describe('getHoverIndex', () => {
  const count = 4; // indices 0..3, slot height 100
  it('returns the active index when offset is within half a slot', () => {
    expect(getHoverIndex(0, 40, 100, count)).toBe(0);
  });
  it('advances one index once past the halfway point downward', () => {
    expect(getHoverIndex(0, 60, 100, count)).toBe(1);
  });
  it('moves upward for negative offset past halfway', () => {
    expect(getHoverIndex(2, -60, 100, count)).toBe(1);
  });
  it('clamps at the bottom of the list', () => {
    expect(getHoverIndex(3, 500, 100, count)).toBe(3);
  });
  it('clamps at the top of the list', () => {
    expect(getHoverIndex(0, -500, 100, count)).toBe(0);
  });
  it('returns the active index unchanged when slot height is zero', () => {
    expect(getHoverIndex(2, 300, 0, count)).toBe(2);
  });
});

describe('computeReorderShift', () => {
  // Dragging active row 0 downward to hover index 2:
  it('slides up rows between the old slot and the hover target (dragging down)', () => {
    expect(computeReorderShift(1, 0, 2)).toBe(-1);
    expect(computeReorderShift(2, 0, 2)).toBe(-1);
  });
  it('leaves rows beyond the hover target untouched (dragging down)', () => {
    expect(computeReorderShift(3, 0, 2)).toBe(0);
  });
  // Dragging active row 3 upward to hover index 1:
  it('slides down rows between the hover target and the old slot (dragging up)', () => {
    expect(computeReorderShift(1, 3, 1)).toBe(1);
    expect(computeReorderShift(2, 3, 1)).toBe(1);
  });
  it('leaves rows above the hover target untouched (dragging up)', () => {
    expect(computeReorderShift(0, 3, 1)).toBe(0);
  });
  it('never shifts the active row itself', () => {
    expect(computeReorderShift(0, 0, 2)).toBe(0);
    expect(computeReorderShift(3, 3, 1)).toBe(0);
  });
  it('returns zero shift when nothing is active', () => {
    expect(computeReorderShift(1, -1, -1)).toBe(0);
  });
});
