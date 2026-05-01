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
    expect(result.tees).toEqual([]);
    expect(result.greens).toEqual([]);
    expect(result.hazards).toEqual([]);
  });

  it('Phase A (free tier) returns empty tees, greens, hazards', () => {
    const result = selectHoleMapMarkers(fullSet, 'free');
    expect(result.tees).toEqual([]);
    expect(result.greens).toEqual([]);
    expect(result.hazards).toEqual([]);
  });

  it('Phase A (social tier) returns empty tees and greens — Phase B will populate them', () => {
    const result = selectHoleMapMarkers(fullSet, 'social');
    expect(result.tees).toEqual([]);
    expect(result.greens).toEqual([]);
  });

  it('Phase A (premium tier) returns empty hazards — Phase C will populate them', () => {
    const result = selectHoleMapMarkers(fullSet, 'premium');
    expect(result.hazards).toEqual([]);
  });
});
