/**
 * useFallbackCourseCoords — derives lat/lng for a round when the club row has
 * no `location` set. Open-Meteo only needs ~0.01° precision for forecasts, so
 * any hole coordinate at the course (or a sibling course at the same club)
 * works fine.
 *
 * Resolution order:
 *   1. `hole_coordinates` for the round's course
 *   2. `hole_coordinates` for any course at the same club
 *
 * Disabled until at least a courseId is known. Cached for the long-static TTL
 * because course geography doesn't change.
 */

import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/services/supabase/client';
import { CACHE_TIMES, GC_TIMES } from '@/constants/cacheConfig';

interface Coords {
  lat: number;
  lng: number;
}

async function fetchOneCoord(courseIds: string[]): Promise<Coords | null> {
  if (courseIds.length === 0) return null;
  const { data, error } = await supabase
    .from('hole_coordinates')
    .select('latitude, longitude')
    .in('course_id', courseIds)
    .limit(1);
  if (error || !data || data.length === 0) return null;
  const row = data[0] as { latitude: number; longitude: number };
  if (row.latitude == null || row.longitude == null) return null;
  return { lat: Number(row.latitude), lng: Number(row.longitude) };
}

export function useFallbackCourseCoords(
  courseId: string | null | undefined,
  clubId: string | null | undefined,
) {
  return useQuery({
    queryKey: ['weather', 'fallbackCoords', courseId ?? null, clubId ?? null],
    queryFn: async (): Promise<Coords | null> => {
      if (!courseId) return null;

      const own = await fetchOneCoord([courseId]);
      if (own) return own;

      if (!clubId) return null;

      // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Supabase typed-row workaround
      const { data: siblings, error: siblingsError } = await (supabase
        .from('courses') as any)
        .select('id')
        .eq('club_id', clubId);
      if (siblingsError || !siblings) return null;

      const ids = (siblings as { id: string }[])
        .map((c) => c.id)
        .filter((id) => id && id !== courseId);
      return fetchOneCoord(ids);
    },
    enabled: !!courseId,
    staleTime: CACHE_TIMES.STATIC,
    gcTime: GC_TIMES.LONG,
  });
}
