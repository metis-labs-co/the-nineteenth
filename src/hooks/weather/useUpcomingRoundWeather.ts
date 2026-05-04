/**
 * useUpcomingRoundWeather — at-time forecast for a scheduled round.
 *
 * Combines round.date (YYYY-MM-DD) and round.tee_time (HH:MM:SS) into the
 * local-time string Open-Meteo's hourly response uses (timezone=auto).
 *
 * Coordinate resolution:
 *   1. clubs.latitude / clubs.longitude (pre-hydrated from clubs.location)
 *   2. clubs.location.coordinates (raw GeoJSON)
 *   3. hole_coordinates fallback for the round's course / sibling courses
 *      at the same club (`useFallbackCourseCoords`).
 *
 * Returns null-equivalent state when none of those resolve, or when the round
 * has no date.
 */

import { useMemo } from 'react';
import { useWeather, type WeatherInput } from './useWeather';
import { useFallbackCourseCoords } from './useFallbackCourseCoords';
import type { RoundWithCourse } from '@/components/competitions/detail/types';

/**
 * Reads the tee time from a round object, accepting either the snake_case DB
 * field (`tee_time`) or the camelCase mapped field (`teeTime`). Falls back to
 * 09:00:00 when neither is present.
 */
function readTeeTime(r: { tee_time?: string | null; teeTime?: string | null }): string {
  return r.tee_time ?? r.teeTime ?? '09:00:00';
}

/**
 * Pulls latitude/longitude from a round's course/club, accepting either the
 * already-hydrated camelCase fields or the raw `location` GeoJSON.
 */
function extractClubCoords(
  round: RoundWithCourse,
): { lat: number; lng: number } | null {
  const club = round.course?.clubs as
    | {
        latitude?: number | null;
        longitude?: number | null;
        location?: { type?: string; coordinates?: [number, number] } | null;
      }
    | null
    | undefined;
  if (!club) return null;

  if (club.latitude != null && club.longitude != null) {
    return { lat: club.latitude, lng: club.longitude };
  }
  const coords = club.location?.coordinates;
  if (coords && coords.length >= 2) {
    return { lat: coords[1], lng: coords[0] };
  }
  return null;
}

export function useUpcomingRoundWeather(round: RoundWithCourse | null) {
  const courseId = round?.course?.id ?? null;
  // `club_id` lives on the Course row but isn't in the narrowed type used by
  // RoundWithCourse — read it defensively.
  const clubId =
    (round?.course as { club_id?: string | null } | null | undefined)?.club_id ??
    null;

  // Always issue the fallback query so coords are ready when the club row has
  // no location of its own. The query is keyed by courseId/clubId and cached
  // for the static TTL, so this is cheap.
  const { data: fallbackCoords } = useFallbackCourseCoords(courseId, clubId);

  const input = useMemo<WeatherInput | null>(() => {
    if (!round || !round.course) return null;
    if (!round.date) return null;

    const coords = extractClubCoords(round) ?? fallbackCoords ?? null;
    if (!coords) return null;

    const teeTime = readTeeTime(round);
    // Open-Meteo hourly times look like "2026-05-04T08:00" (no seconds).
    const isoDateTime = `${round.date}T${teeTime.slice(0, 5)}`;

    return { kind: 'at-time', lat: coords.lat, lng: coords.lng, isoDateTime };
  }, [round, fallbackCoords]);

  return useWeather(input);
}
