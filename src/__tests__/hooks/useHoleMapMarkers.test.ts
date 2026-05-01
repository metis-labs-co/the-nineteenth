import { selectHoleMapMarkers } from '@/hooks/useHoleMapMarkers';
import type { HoleCoordinate } from '@/types/database/course.types';
import type { HoleCoordinateSet } from '@/hooks/coordinates/types';

const coord = (poi_type: HoleCoordinate['poi_type'], lat: number, lng: number): HoleCoordinate => ({
  id: `${poi_type}-${lat}`,
  course_id: 'c1',
  hole_number: 7,
  poi_type,
  latitude: lat,
  longitude: lng,
  side_of_fairway: null,
  created_at: '2026-01-01T00:00:00Z',
});

const fullSet: HoleCoordinateSet = {
  hole_number: 7,
  tee_back: coord('tee_back', -37.81, 144.96),
  tee_front: coord('tee_front', -37.811, 144.961),
  green_front: coord('green_front', -37.82, 144.97),
  green_center: coord('green_center', -37.821, 144.971),
  green_back: coord('green_back', -37.822, 144.972),
};

describe('selectHoleMapMarkers', () => {
  describe('pin (legacy single-anchor)', () => {
    it('returns the green_center pin when present', () => {
      const result = selectHoleMapMarkers(fullSet, 'free');
      expect(result.pin).toEqual({ latitude: -37.821, longitude: 144.971 });
    });

    it('falls back to green_front when green_center missing', () => {
      const partial: HoleCoordinateSet = { ...fullSet, green_center: undefined };
      const result = selectHoleMapMarkers(partial, 'free');
      expect(result.pin).toEqual({ latitude: -37.82, longitude: 144.97 });
    });

    it('returns null pin when no green coordinates exist', () => {
      const teesOnly: HoleCoordinateSet = {
        hole_number: 7,
        tee_back: fullSet.tee_back,
        tee_front: fullSet.tee_front,
      };
      const result = selectHoleMapMarkers(teesOnly, 'free');
      expect(result.pin).toBeNull();
    });

    it('returns null pin when input is undefined', () => {
      const result = selectHoleMapMarkers(undefined, 'free');
      expect(result.pin).toBeNull();
    });
  });

  describe('Phase A — free tier', () => {
    it('returns empty tees, greens, hazards regardless of input', () => {
      const result = selectHoleMapMarkers(fullSet, 'free');
      expect(result.tees).toEqual([]);
      expect(result.greens).toEqual([]);
      expect(result.hazards).toEqual([]);
    });

    it('returns empty arrays when input is undefined', () => {
      const result = selectHoleMapMarkers(undefined, 'free');
      expect(result.tees).toEqual([]);
      expect(result.greens).toEqual([]);
      expect(result.hazards).toEqual([]);
    });
  });

  describe('Phase B — social tier', () => {
    it('populates tees with typed POI markers', () => {
      const result = selectHoleMapMarkers(fullSet, 'social');
      expect(result.tees).toEqual([
        { type: 'tee_back', coordinate: { latitude: -37.81, longitude: 144.96 } },
        { type: 'tee_front', coordinate: { latitude: -37.811, longitude: 144.961 } },
      ]);
    });

    it('populates greens with typed POI markers in front-center-back order', () => {
      const result = selectHoleMapMarkers(fullSet, 'social');
      expect(result.greens).toEqual([
        { type: 'green_front', coordinate: { latitude: -37.82, longitude: 144.97 } },
        { type: 'green_center', coordinate: { latitude: -37.821, longitude: 144.971 } },
        { type: 'green_back', coordinate: { latitude: -37.822, longitude: 144.972 } },
      ]);
    });

    it('omits POI entries that are missing from the coordinate set', () => {
      const partial: HoleCoordinateSet = {
        hole_number: 7,
        tee_back: fullSet.tee_back,
        green_center: fullSet.green_center,
      };
      const result = selectHoleMapMarkers(partial, 'social');
      expect(result.tees).toEqual([
        { type: 'tee_back', coordinate: { latitude: -37.81, longitude: 144.96 } },
      ]);
      expect(result.greens).toEqual([
        { type: 'green_center', coordinate: { latitude: -37.821, longitude: 144.971 } },
      ]);
    });

    it('returns empty hazards (Phase C will populate them)', () => {
      const result = selectHoleMapMarkers(fullSet, 'social');
      expect(result.hazards).toEqual([]);
    });
  });

  describe('Phase B — premium tier', () => {
    it('populates tees and greens (same as social)', () => {
      const result = selectHoleMapMarkers(fullSet, 'premium');
      expect(result.tees).toHaveLength(2);
      expect(result.greens).toHaveLength(3);
    });

    it('returns empty hazards (Phase C will populate them)', () => {
      const result = selectHoleMapMarkers(fullSet, 'premium');
      expect(result.hazards).toEqual([]);
    });
  });
});
