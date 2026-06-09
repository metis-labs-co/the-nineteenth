import { normalize360, windArrowDegrees } from '../windArrow';

describe('normalize360', () => {
  it('leaves values already in range untouched', () => {
    expect(normalize360(0)).toBe(0);
    expect(normalize360(123)).toBe(123);
    expect(normalize360(359)).toBe(359);
  });

  it('wraps 360 to 0 and values above 360', () => {
    expect(normalize360(360)).toBe(0);
    expect(normalize360(450)).toBe(90);
  });

  it('wraps negative values into range', () => {
    expect(normalize360(-90)).toBe(270);
    expect(normalize360(-360)).toBe(0);
    expect(normalize360(-450)).toBe(270);
  });
});

describe('windArrowDegrees', () => {
  it('points down-screen for a headwind when facing the wind source', () => {
    // Wind FROM north (0). Blows TO south (180). Facing north (heading 0):
    // a headwind pushes toward you → arrow points down (180).
    expect(windArrowDegrees(0, 0)).toBe(180);
  });

  it('points up-screen for a tailwind', () => {
    // Wind FROM south (180) blows TO north (0). Facing north (0): tailwind
    // helps, arrow points up (0).
    expect(windArrowDegrees(180, 0)).toBe(0);
  });

  it('is head-up: rotates opposite to the user turning', () => {
    // Same wind (from north), but now facing east (heading 90). The "blows to
    // south" arrow should appear rotated to 90 (right of screen).
    expect(windArrowDegrees(0, 90)).toBe(90);
    // Facing west (270): arrow swings to 270 (left of screen).
    expect(windArrowDegrees(0, 270)).toBe(270);
  });

  it('normalizes the result into [0, 360)', () => {
    // from 350, heading 0 → 350+180 = 530 → 170
    expect(windArrowDegrees(350, 0)).toBe(170);
    // from 10, heading 300 → 10+180-300 = -110 → 250
    expect(windArrowDegrees(10, 300)).toBe(250);
  });
});
