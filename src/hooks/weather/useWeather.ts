/**
 * useWeather — single TanStack Query hook for Open-Meteo.
 *
 * Two modes:
 *   - 'current'  → current conditions at lat/lng
 *   - 'at-time'  → hourly forecast, picks the hour matching `isoDateTime`
 *
 * Errors are logged and resolved as `null` so consumers render fail-soft.
 */

import { useQuery, type UseQueryResult } from '@tanstack/react-query';
import { CACHE_TIMES, GC_TIMES } from '@/constants/cacheConfig';

const OPEN_METEO_URL = 'https://api.open-meteo.com/v1/forecast';

export type WeatherInput =
  | { kind: 'current'; lat: number; lng: number }
  | { kind: 'at-time'; lat: number; lng: number; isoDateTime: string };

export interface WeatherSnapshot {
  tempC: number;
  weatherCode: number;
  windKph: number;
  windDirDeg: number;
  precipProbability: number;
  fetchedAt: string;
}

function roundCoord(value: number): number {
  return Math.round(value * 100) / 100;
}

function buildUrl(input: WeatherInput): string {
  const lat = roundCoord(input.lat);
  const lng = roundCoord(input.lng);
  const base = `${OPEN_METEO_URL}?latitude=${lat}&longitude=${lng}&timezone=auto`;
  if (input.kind === 'current') {
    return `${base}&current=temperature_2m,weather_code,wind_speed_10m,wind_direction_10m,precipitation`;
  }
  return `${base}&hourly=temperature_2m,weather_code,wind_speed_10m,wind_direction_10m,precipitation_probability&forecast_days=2`;
}

function pickHourIndex(times: string[], isoDateTime: string): number {
  const target = isoDateTime.slice(0, 13);
  const exact = times.findIndex((t) => t.startsWith(target));
  if (exact !== -1) return exact;
  let best = 0;
  for (let i = 0; i < times.length; i++) {
    if (times[i] <= isoDateTime) best = i;
    else break;
  }
  return best;
}

async function fetchSnapshot(input: WeatherInput): Promise<WeatherSnapshot | null> {
  try {
    const res = await fetch(buildUrl(input));
    if (!res.ok) {
      console.warn('[useWeather] non-ok response', res.status);
      return null;
    }
    const json = await res.json();

    if (input.kind === 'current') {
      const c = json.current;
      return {
        tempC: c.temperature_2m,
        weatherCode: c.weather_code,
        windKph: c.wind_speed_10m,
        windDirDeg: c.wind_direction_10m,
        // Open-Meteo's current-conditions endpoint does not return precipitation_probability;
        // only the at-time hourly endpoint does. Set 0 here so consumers fail-soft.
        precipProbability: 0,
        fetchedAt: new Date().toISOString(),
      };
    }

    const h = json.hourly;
    const idx = pickHourIndex(h.time, input.isoDateTime);
    return {
      tempC: h.temperature_2m[idx],
      weatherCode: h.weather_code[idx],
      windKph: h.wind_speed_10m[idx],
      windDirDeg: h.wind_direction_10m[idx],
      precipProbability: h.precipitation_probability[idx] ?? 0,
      fetchedAt: new Date().toISOString(),
    };
  } catch (err) {
    console.warn('[useWeather] fetch threw', err);
    return null;
  }
}

export function useWeather(
  input: WeatherInput | null,
): UseQueryResult<WeatherSnapshot | null> {
  const enabled = input !== null;
  const lat = input ? roundCoord(input.lat) : 0;
  const lng = input ? roundCoord(input.lng) : 0;
  const isoDateTime = input?.kind === 'at-time' ? input.isoDateTime : 'current';

  return useQuery({
    queryKey: ['weather', input?.kind ?? 'idle', lat, lng, isoDateTime],
    queryFn: () => fetchSnapshot(input as WeatherInput),
    enabled,
    staleTime: CACHE_TIMES.STATIC,
    gcTime: GC_TIMES.LONG,
  });
}
