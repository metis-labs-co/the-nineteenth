import { useMemo } from 'react';
import { useHoleCoordinatesByHole } from '@/hooks/useHoleCoordinates';
import type { HoleCoordinateSet } from '@/hooks/coordinates/types';
import type { HoleCoordinate } from '@/types/database/course.types';
import type { MapTier } from '@/hooks/useMapTier';

export interface LatLng {
  latitude: number;
  longitude: number;
}

export type TeePoiType = 'tee_back' | 'tee_front';
export type GreenPoiType = 'green_front' | 'green_center' | 'green_back';

export interface PoiMarker<T extends string> {
  type: T;
  coordinate: LatLng;
}

export interface HoleMapMarkers {
  /** Legacy single-anchor pin used by Phase A. green_center → green_front fallback. */
  pin: LatLng | null;
  tees: PoiMarker<TeePoiType>[];
  greens: PoiMarker<GreenPoiType>[];
  hazards: PoiMarker<string>[];
}

const toLatLng = (c: HoleCoordinate): LatLng => ({
  latitude: c.latitude,
  longitude: c.longitude,
});

const TEE_ORDER: TeePoiType[] = ['tee_back', 'tee_front'];
const GREEN_ORDER: GreenPoiType[] = ['green_front', 'green_center', 'green_back'];

export function selectHoleMapMarkers(
  set: HoleCoordinateSet | undefined,
  tier: MapTier
): HoleMapMarkers {
  if (!set) {
    return { pin: null, tees: [], greens: [], hazards: [] };
  }

  const center = set.green_center;
  const front = set.green_front;
  const pin = center ? toLatLng(center) : front ? toLatLng(front) : null;

  if (tier === 'free') {
    return { pin, tees: [], greens: [], hazards: [] };
  }

  const tees: PoiMarker<TeePoiType>[] = TEE_ORDER.flatMap((type) => {
    const c = set[type];
    return c ? [{ type, coordinate: toLatLng(c) }] : [];
  });

  const greens: PoiMarker<GreenPoiType>[] = GREEN_ORDER.flatMap((type) => {
    const c = set[type];
    return c ? [{ type, coordinate: toLatLng(c) }] : [];
  });

  return { pin, tees, greens, hazards: [] };
}

export function useHoleMapMarkers(
  courseId: string,
  holeNumber: number,
  tier: MapTier
): HoleMapMarkers {
  const { data } = useHoleCoordinatesByHole(courseId, holeNumber);
  return useMemo(() => selectHoleMapMarkers(data, tier), [data, tier]);
}
