import {
  HOLE_CAMERA_ALTITUDE,
  HOLE_CAMERA_ZOOM,
  bearingDegrees,
  holeOrientedCamera,
  lerpCoord,
} from '@/utils/holeOrientation';

describe('bearingDegrees', () => {
  it('returns 0 for due north', () => {
    const b = bearingDegrees(
      { latitude: 0, longitude: 0 },
      { latitude: 1, longitude: 0 }
    );
    expect(b).toBeCloseTo(0, 1);
  });

  it('returns 90 for due east', () => {
    const b = bearingDegrees(
      { latitude: 0, longitude: 0 },
      { latitude: 0, longitude: 1 }
    );
    expect(b).toBeCloseTo(90, 1);
  });

  it('returns 180 for due south', () => {
    const b = bearingDegrees(
      { latitude: 0, longitude: 0 },
      { latitude: -1, longitude: 0 }
    );
    expect(b).toBeCloseTo(180, 1);
  });

  it('returns 270 for due west', () => {
    const b = bearingDegrees(
      { latitude: 0, longitude: 0 },
      { latitude: 0, longitude: -1 }
    );
    expect(b).toBeCloseTo(270, 1);
  });
});

describe('lerpCoord', () => {
  it('returns a at t=0', () => {
    expect(lerpCoord({ latitude: 1, longitude: 2 }, { latitude: 5, longitude: 6 }, 0))
      .toEqual({ latitude: 1, longitude: 2 });
  });

  it('returns b at t=1', () => {
    expect(lerpCoord({ latitude: 1, longitude: 2 }, { latitude: 5, longitude: 6 }, 1))
      .toEqual({ latitude: 5, longitude: 6 });
  });

  it('returns midpoint at t=0.5', () => {
    expect(lerpCoord({ latitude: 0, longitude: 0 }, { latitude: 10, longitude: 20 }, 0.5))
      .toEqual({ latitude: 5, longitude: 10 });
  });
});

describe('holeOrientedCamera', () => {
  it('returns null when tee is missing', () => {
    expect(holeOrientedCamera(null, { latitude: 1, longitude: 1 })).toBeNull();
  });

  it('returns null when green is missing', () => {
    expect(holeOrientedCamera({ latitude: 1, longitude: 1 }, null)).toBeNull();
  });

  it('returns null when both are missing', () => {
    expect(holeOrientedCamera(null, null)).toBeNull();
  });

  it('returns a camera with hole framing when both provided', () => {
    const tee = { latitude: 0, longitude: 0 };
    const green = { latitude: 1, longitude: 0 }; // due north of tee
    const camera = holeOrientedCamera(tee, green);
    expect(camera).not.toBeNull();
    // Heading should be 0 (north) — green is north of tee.
    expect(camera!.heading).toBeCloseTo(0, 1);
    expect(camera!.pitch).toBe(0);
    expect(camera!.altitude).toBe(HOLE_CAMERA_ALTITUDE);
    expect(camera!.zoom).toBe(HOLE_CAMERA_ZOOM);
    // Centre is biased toward the green (lerped 35% from green back toward tee).
    expect(camera!.center.latitude).toBeGreaterThan(0.5);
    expect(camera!.center.latitude).toBeLessThan(1);
  });
});
