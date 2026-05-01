import { useMemo } from 'react';
import { useHoleCoordinatesByHole } from '@/hooks/useHoleCoordinates';
import { useHoleHazards } from '@/hooks/hazards';
import type { HoleCoordinateSet } from '@/hooks/coordinates/types';
import type { HoleCoordinate } from '@/types/database/course.types';
import type { HazardPolygon } from '@/types/database/holeHazards.types';
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
  /** Phase C1 — bunker / water polygons. Empty for non-premium tiers. */
  hazards: HazardPolygon[];
}

const toLatLng = (c: HoleCoordinate): LatLng => ({
  latitude: c.latitude,
  longitude: c.longitude,
});

const TEE_ORDER: TeePoiType[] = ['tee_back', 'tee_front'];
const GREEN_ORDER: GreenPoiType[] = ['green_front', 'green_center', 'green_back'];

/**
 * Pure selector. Phase A renders pin only on free tier. Phase B
 * populates tees+greens for non-free. Phase C1 hazards are passed in
 * as a separate parameter (sourced from the hazards query) so this
 * function stays pure.
 */
export function selectHoleMapMarkers(
  set: HoleCoordinateSet | undefined,
  tier: MapTier,
  hazards: HazardPolygon[] = []
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

  // Phase C1: hazards on premium only.
  const hazardsForTier = tier === 'premium' ? hazards : [];

  return { pin, tees, greens, hazards: hazardsForTier };
}

export function useHoleMapMarkers(
  courseId: string,
  holeNumber: number,
  tier: MapTier
): HoleMapMarkers {
  const { data: coords } = useHoleCoordinatesByHole(courseId, holeNumber);
  // Only fetch hazards on premium — saves a query on free/social.
  const { data: hazards } = useHoleHazards(
    tier === 'premium' ? courseId : '',
    tier === 'premium' ? holeNumber : 0
  );
  return useMemo(
    () => selectHoleMapMarkers(coords, tier, hazards ?? []),
    [coords, tier, hazards]
  );
}
