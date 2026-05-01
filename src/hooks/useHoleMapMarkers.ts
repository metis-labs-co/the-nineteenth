import { useMemo } from 'react';
import { useHoleCoordinatesByHole } from '@/hooks/useHoleCoordinates';
import type { HoleCoordinateSet } from '@/hooks/coordinates/types';
import type { HoleCoordinate } from '@/types/database/course.types';
import type { MapTier } from '@/hooks/useMapTier';

export interface LatLng {
  latitude: number;
  longitude: number;
}

export interface HoleMapMarkers {
  pin: LatLng | null;
  tees: LatLng[];
  greens: LatLng[];
  hazards: LatLng[];
}

const toLatLng = (c: HoleCoordinate): LatLng => ({
  latitude: c.latitude,
  longitude: c.longitude,
});

export function selectHoleMapMarkers(
  set: HoleCoordinateSet | undefined,
  _tier: MapTier
): HoleMapMarkers {
  if (!set) {
    return { pin: null, tees: [], greens: [], hazards: [] };
  }

  const center = set.green_center;
  const front = set.green_front;
  const pin = center ? toLatLng(center) : front ? toLatLng(front) : null;

  return { pin, tees: [], greens: [], hazards: [] };
}

export function useHoleMapMarkers(
  courseId: string,
  holeNumber: number,
  tier: MapTier
): HoleMapMarkers {
  const { data } = useHoleCoordinatesByHole(courseId, holeNumber);
  return useMemo(() => selectHoleMapMarkers(data, tier), [data, tier]);
}
