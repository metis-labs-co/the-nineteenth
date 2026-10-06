/**
 * useCompetitionWeather — daily forecast for each day a competition runs.
 *
 * Unlike `useUpcomingRoundWeather` (hourly, 2-day window, tied to a single
 * round's tee time), this fetches Open-Meteo's *daily* endpoint (≈16-day
 * window) so the Home upcoming-competition card can show a one-line summary
 * per competition day.
 *
 * Days that fall outside the forecast window simply have no entry in the
 * returned record — the card omits their weather line. Fetch errors are
 * logged and fail soft (those days are omitted), never thrown to the UI.
 */

import { useMemo } from 'react';
import { useQuery, type UseQueryResult } from '@tanstack/react-query';
import { CACHE_TIMES, GC_TIMES } from '@/constants/cacheConfig';
import type { CompetitionDay } from '@/hooks/home/useHomeData';

const OPEN_METEO_URL = 'https://api.open-meteo.com/v1/forecast';
const DAILY_VARS =
  'weather_code,temperature_2m_max,temperature_2m_min,precipitation_probability_max';
const FORECAST_DAYS = 16;

export interface DailyWeather {
  weatherCode: number;
  tempMaxC: number;
  tempMinC: number;
  precipProbabilityMax: number;
}

/** Forecast keyed by `YYYY-MM-DD`. Days with no forecast are absent. */
export type CompetitionWeather = Record<string, DailyWeather>;

function roundCoord(value: number): number {
  return Math.round(value * 100) / 100;
}

/** Stable key for a coordinate, rounded to match the fetch precision. */
function coordKey(lat: number, lng: number): string {
  return `${roundCoord(lat)},${roundCoord(lng)}`;
}

export function buildDailyUrl(lat: number, lng: number): string {
  return (
    `${OPEN_METEO_URL}?latitude=${roundCoord(lat)}&longitude=${roundCoord(lng)}` +
    `&timezone=auto&daily=${DAILY_VARS}&forecast_days=${FORECAST_DAYS}`
  );
}

/**
 * Map one Open-Meteo daily response into a `dateIso -> DailyWeather` record.
 * Returns `{}` for a malformed/empty payload.
 */
export function mapDailyResponse(json: unknown): CompetitionWeather {
  const daily = (json as { daily?: Record<string, unknown[]> } | null)?.daily;
  const time = daily?.time as string[] | undefined;
  if (!time) return {};
  const code = (daily?.weather_code ?? []) as number[];
  const max = (daily?.temperature_2m_max ?? []) as number[];
  const min = (daily?.temperature_2m_min ?? []) as number[];
  const precip = (daily?.precipitation_probability_max ?? []) as number[];

  const out: CompetitionWeather = {};
  for (let i = 0; i < time.length; i++) {
    out[time[i]] = {
      weatherCode: code[i] ?? 0,
      tempMaxC: max[i],
      tempMinC: min[i],
      precipProbabilityMax: precip[i] ?? 0,
    };
  }
  return out;
}

/**
 * Pick each requested day's forecast from the per-coordinate maps. Days whose
 * coordinate has no map, or whose date is outside its map (too far out), are
 * omitted.
 */
export function selectDaysWeather(
  days: CompetitionDay[],
  byCoord: Map<string, CompetitionWeather>,
): CompetitionWeather {
  const out: CompetitionWeather = {};
  for (const day of days) {
    const forecast = byCoord.get(coordKey(day.lat, day.lng))?.[day.dateIso];
    if (forecast) out[day.dateIso] = forecast;
  }
  return out;
}

/** Distinct rounded coordinates across the requested days. */
function uniqueCoords(days: CompetitionDay[]): { lat: number; lng: number }[] {
  const seen = new Map<string, { lat: number; lng: number }>();
  for (const day of days) {
    const key = coordKey(day.lat, day.lng);
    if (!seen.has(key)) {
      seen.set(key, { lat: roundCoord(day.lat), lng: roundCoord(day.lng) });
    }
  }
  return Array.from(seen.values());
}

async function fetchCoordForecast(
  lat: number,
  lng: number,
): Promise<CompetitionWeather> {
  try {
    const res = await fetch(buildDailyUrl(lat, lng));
    if (!res.ok) {
      console.warn('[useCompetitionWeather] non-ok response', res.status);
      return {};
    }
    return mapDailyResponse(await res.json());
  } catch (err) {
    console.warn('[useCompetitionWeather] fetch threw', err);
    return {};
  }
}

async function fetchCompetitionWeather(
  days: CompetitionDay[],
): Promise<CompetitionWeather> {
  const coords = uniqueCoords(days);
  const results = await Promise.all(
    coords.map((c) => fetchCoordForecast(c.lat, c.lng)),
  );
  const byCoord = new Map<string, CompetitionWeather>();
  coords.forEach((c, i) => byCoord.set(coordKey(c.lat, c.lng), results[i]));
  return selectDaysWeather(days, byCoord);
}

export function useCompetitionWeather(
  days: CompetitionDay[],
): UseQueryResult<CompetitionWeather> {
  // Stable cache key independent of array identity: sorted coords + dates.
  const key = useMemo(() => {
    const coords = uniqueCoords(days)
      .map((c) => coordKey(c.lat, c.lng))
      .sort();
    const dates = days.map((d) => d.dateIso).sort();
    return { coords, dates };
  }, [days]);

  return useQuery({
    queryKey: ['weather', 'competition', key.coords, key.dates],
    queryFn: () => fetchCompetitionWeather(days),
    enabled: days.length > 0,
    staleTime: CACHE_TIMES.STATIC,
    gcTime: GC_TIMES.LONG,
  });
}
