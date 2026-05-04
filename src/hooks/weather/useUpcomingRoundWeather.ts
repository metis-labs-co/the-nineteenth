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

export function useUpcomingRoundWeather(round: RoundWithCourse | null) {
  const input = useMemo<WeatherInput | null>(() => {
    if (!round || !round.course) return null;
    // Coordinates live on the club, not the course. They are present when the
    // query joins clubs with latitude/longitude selected.
    const lat = round.course.clubs?.latitude;
    const lng = round.course.clubs?.longitude;
    if (lat == null || lng == null) return null;
    if (!round.date) return null;

    // Default tee time to 09:00 if not specified.
    const teeTime = round.tee_time ?? '09:00:00';
    // Open-Meteo hourly times look like "2026-05-04T08:00" (no seconds).
    const isoDateTime = `${round.date}T${teeTime.slice(0, 5)}`;

    return { kind: 'at-time', lat, lng, isoDateTime };
  }, [round]);

  return useWeather(input);
}
