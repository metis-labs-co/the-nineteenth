/**
 * Hazard query hook (Phase C1).
 *
 * Reads hole_hazards rows for a given (course, hole) and decodes the
 * stored GeoJSON polygon into LatLng arrays for map rendering.
 */

import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/services/supabase/client';
import { hazardKeys } from '@/hooks/queryKeys';
import { CACHE_TIMES } from '@/constants/cacheConfig';
import type {
  HazardPolygon,
  HoleHazardRow,
} from '@/types/database/holeHazards.types';

// Until the supabase Database types are regenerated post-migration, the
// generated client doesn't know about `hole_hazards`. Cast to bypass.
const hazardsTable = () =>
  (supabase as unknown as { from: (table: string) => any }).from('hole_hazards');

/**
 * Decode a Postgres GeoJSON polygon (outer ring only) to LatLng[].
 */
function decodePolygon(
  geoJson: HoleHazardRow['polygon']
): HazardPolygon['polygon'] {
  if (!geoJson || geoJson.type !== 'Polygon') return [];
  const ring = geoJson.coordinates?.[0] ?? [];
  // GeoJSON is [lng, lat]; convert to {latitude, longitude}.
  return ring.map(([lng, lat]) => ({ latitude: lat, longitude: lng }));
}

export async function fetchHoleHazards(
  courseId: string,
  holeNumber: number
): Promise<HazardPolygon[]> {
  const { data, error } = await hazardsTable()
    .select('*')
    .eq('course_id', courseId)
    .eq('hole_number', holeNumber);

  if (error) throw error;
  return ((data ?? []) as HoleHazardRow[]).map((row) => ({
    type: row.hazard_type,
    source: row.source,
    externalId: row.external_id,
    polygon: decodePolygon(row.polygon),
  })).filter((h) => h.polygon.length >= 3);
}

export function useHoleHazards(courseId: string, holeNumber: number) {
  return useQuery({
    queryKey: hazardKeys.byHole(courseId, holeNumber),
    queryFn: () => fetchHoleHazards(courseId, holeNumber),
    enabled: !!courseId && holeNumber >= 1 && holeNumber <= 18,
    staleTime: CACHE_TIMES.STATIC,
  });
}
