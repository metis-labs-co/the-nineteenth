import vectors from '../../../fixtures/distance-vectors.json';
import { calculateDistance } from '@/utils/gpsCalculations';

type DistanceVector = {
  name: string;
  from: { latitude: number; longitude: number };
  to: { latitude: number; longitude: number };
  metres: number;
};

describe('distance fixtures parity (TS side)', () => {
  it.each(vectors as DistanceVector[])('$name', (v) => {
    const m = calculateDistance(v.from.latitude, v.from.longitude, v.to.latitude, v.to.longitude);
    expect(m).toBeCloseTo(v.metres, 0);
  });
});
