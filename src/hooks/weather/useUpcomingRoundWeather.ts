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

export function useUpcomingRoundWeather(round: RoundWithCourse | null) {
  const input = useMemo<WeatherInput | null>(() => {
    if (!round || !round.course) return null;
    // Coordinates live on the club, not the course. They are present when the
    // query joins clubs with latitude/longitude selected.
    const lat = round.course.clubs?.latitude;
    const lng = round.course.clubs?.longitude;
    if (lat == null || lng == null) return null;
    if (!round.date) return null;

    // Default tee time to 09:00 if not specified. Accept either snake_case (DB
    // Round type) or camelCase (RoundItem mapped type) to be tolerant of both.
    const teeTime = readTeeTime(round);
    // Open-Meteo hourly times look like "2026-05-04T08:00" (no seconds).
    const isoDateTime = `${round.date}T${teeTime.slice(0, 5)}`;

    return { kind: 'at-time', lat, lng, isoDateTime };
  }, [round]);

  return useWeather(input);
}
