/**
 * useUpcomingRoundWeather — at-time forecast for a scheduled round.
 *
 * Combines round.date (YYYY-MM-DD) and round.tee_time (HH:MM:SS) into the
 * local-time string Open-Meteo's hourly response uses (timezone=auto).
 *
 * Returns null-equivalent state when the round has no course coords or no date.
 */

import { useMemo } from 'react';
import { useWeather, type WeatherInput } from './useWeather';
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
  const input = useMemo<WeatherInput | null>(() => {
    if (!round || !round.course) {
      console.log('[weather] skip — no round/course', { roundId: round?.id });
      return null;
    }
    const coords = extractClubCoords(round);
    if (!coords) {
      console.log('[weather] skip — no club coords', {
        roundId: round.id,
        courseId: round.course?.id,
        clubKeys: round.course?.clubs ? Object.keys(round.course.clubs) : null,
        hasLocation: !!(round.course?.clubs as { location?: unknown } | null)
          ?.location,
      });
      return null;
    }
    if (!round.date) {
      console.log('[weather] skip — no date', { roundId: round.id });
      return null;
    }

    // Default tee time to 09:00 if not specified. Accept either snake_case (DB
    // Round type) or camelCase (RoundItem mapped type) to be tolerant of both.
    const teeTime = readTeeTime(round);
    // Open-Meteo hourly times look like "2026-05-04T08:00" (no seconds).
    const isoDateTime = `${round.date}T${teeTime.slice(0, 5)}`;

    console.log('[weather] requesting', {
      roundId: round.id,
      lat: coords.lat,
      lng: coords.lng,
      isoDateTime,
    });
    return { kind: 'at-time', lat: coords.lat, lng: coords.lng, isoDateTime };
  }, [round]);

  const result = useWeather(input);
  if (input && result.isError) {
    console.log('[weather] error', { error: result.error });
  }
  if (input && result.data === null && result.isFetched) {
    console.log('[weather] resolved to null (fail-soft)');
  }
  return result;
}
