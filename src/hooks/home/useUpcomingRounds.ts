/**
 * useUpcomingRounds — returns the user's upcoming rounds in the
 * RoundWithCourse shape, used by the Home screen's round-today hero card.
 *
 * Scope:
 *   - Standalone rounds (no competition) where the user is the round owner.
 *   - Competition rounds where the user is an accepted player.
 *
 * Includes both `clubs(*)` (so `course.clubs.location` is available for the
 * weather forecast) and `competition:competitions(id, name, description)` so
 * the hero/upcoming-competition cards can show the comp name and blurb.
 *
 * Filters to `status = 'upcoming'` and `date >= today` so the cache stays
 * small (we don't care about rounds long in the past).
 */

import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/services/supabase/client';
import { CACHE_TIMES, GC_TIMES } from '@/constants/cacheConfig';
import { useAuth } from '@/hooks/useAuth';
import {
  fetchAcceptedCompetitionIds,
  applyUserRoundScope,
} from './roundScope';
import type { RoundWithCourse } from '@/components/competitions/detail/types';

const ROUND_SELECT = `
  *,
  course:courses!course_id(
    *,
    clubs(*)
  ),
  competition:competitions(id, name, description)
`;

function todayIsoDate(): string {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

/**
 * `clubs.latitude` / `clubs.longitude` are TypeScript-only convenience
 * fields — the underlying DB stores GPS only in `clubs.location` (a PostGIS
 * GEOGRAPHY returned as GeoJSON `{ type: 'Point', coordinates: [lng, lat] }`).
 * Derive the camelCase numeric fields from the location so downstream
 * consumers (useUpcomingRoundWeather) can read them directly.
 */
function hydrateClubCoords(rounds: RoundWithCourse[]): RoundWithCourse[] {
  for (const round of rounds) {
    const club = round.course?.clubs as
      | {
          location?: { type: 'Point'; coordinates: [number, number] } | null;
          latitude?: number | null;
          longitude?: number | null;
        }
      | null
      | undefined;
    if (!club) continue;
    const loc = club.location;
    if (loc?.coordinates && loc.coordinates.length >= 2) {
      club.longitude = loc.coordinates[0];
      club.latitude = loc.coordinates[1];
    }
  }
  return rounds;
}

export function useUpcomingRounds() {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['home', 'upcomingRounds', user?.id],
    queryFn: async (): Promise<RoundWithCourse[]> => {
      if (!user?.id) return [];

      // Step 1: find competition IDs the user is an accepted player in.
      const competitionIds = await fetchAcceptedCompetitionIds(
        user.id,
        'useUpcomingRounds'
      );

      // Step 2: fetch upcoming rounds (standalone owned by user OR
      // competition rounds in accepted comps), dated today or later.
      const today = todayIsoDate();
      // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Supabase typed-row workaround
      const baseQuery = (supabase.from('rounds') as any)
        .select(ROUND_SELECT)
        .eq('status', 'upcoming')
        .gte('date', today)
        .is('deleted_at', null)
        .order('date', { ascending: true })
        .order('tee_time', { ascending: true });
      const query = applyUserRoundScope(baseQuery, user.id, competitionIds);

      const { data, error } = await query;

      if (error) {
        console.error('[useUpcomingRounds] Error fetching rounds:', error);
        throw error;
      }

      return hydrateClubCoords((data ?? []) as RoundWithCourse[]);
    },
    enabled: !!user?.id,
    staleTime: CACHE_TIMES.SHORT,
    gcTime: GC_TIMES.SHORT,
    refetchOnWindowFocus: true,
    refetchOnReconnect: true,
  });
}
