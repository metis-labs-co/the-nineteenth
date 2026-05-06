/**
 * useDetailedDayForecast — single TanStack Query hook for Open-Meteo,
 * tailored to the home-screen "tap chip → modal" detail view.
 *
 * Fetches 3 days of hourly + daily data in one request, partitions today's
 * hourly slice into Morning (6-12) and Afternoon (12-18) buckets via the
 * pure aggregateWeatherBucket util, and returns a DetailedForecast.
 *
 * Past-bucket detection: if the user's local clock is already past a
 * bucket's end on today's date, that bucket is returned as `null` so the
 * UI can render an "already passed" placeholder instead of stale data.
 *
 * Errors are logged and resolved as `null` so consumers render fail-soft,
 * mirroring the pattern in useWeather.ts.
 */

import { useQuery, type UseQueryResult } from '@tanstack/react-query';
import { CACHE_TIMES, GC_TIMES } from '@/constants/cacheConfig';
import {
  aggregateWeatherBucket,
  type BucketStats,
  type HourlySlice,
} from './aggregateWeatherBucket';

const OPEN_METEO_URL = 'https://api.open-meteo.com/v1/forecast';

interface DailyResponse {
  time: string[];
  weather_code: number[];
  temperature_2m_max: number[];
  temperature_2m_min: number[];
  precipitation_probability_max: number[];
  precipitation_sum: number[];
  wind_gusts_10m_max: number[];
  uv_index_max: number[];
  sunrise: string[];
  sunset: string[];
}

export type Coords = { lat: number; lng: number };

export interface DaySummary {
  dateIso: string;
  weatherCode: number;
  tempHighC: number;
  tempLowC: number;
  precipProbabilityMax: number;
  precipMm: number;
  windGustKphMax: number;
  uvIndexMax: number;
  sunriseIso: string;
  sunsetIso: string;
}

export interface DetailedForecast {
  locationIso: string;
  today: {
    morning: BucketStats | null;
    afternoon: BucketStats | null;
    summary: DaySummary;
  };
  forecast: DaySummary[];
  fetchedAt: string;
}

function roundCoord(value: number): number {
  return Math.round(value * 100) / 100;
}

function buildUrl(coords: Coords): string {
  const lat = roundCoord(coords.lat);
  const lng = roundCoord(coords.lng);
  const hourly = [
    'temperature_2m',
    'apparent_temperature',
    'weather_code',
    'wind_speed_10m',
    'wind_gusts_10m',
    'wind_direction_10m',
    'precipitation_probability',
    'precipitation',
    'uv_index',
  ].join(',');
  const daily = [
    'weather_code',
    'temperature_2m_max',
    'temperature_2m_min',
    'precipitation_probability_max',
    'precipitation_sum',
    'wind_gusts_10m_max',
    'uv_index_max',
    'sunrise',
    'sunset',
  ].join(',');
  return (
    `${OPEN_METEO_URL}?latitude=${lat}&longitude=${lng}` +
    `&timezone=auto&forecast_days=3&hourly=${hourly}&daily=${daily}`
  );
}

function summariseDay(daily: DailyResponse, i: number): DaySummary {
  return {
    dateIso: daily.time[i],
    weatherCode: daily.weather_code[i],
    tempHighC: daily.temperature_2m_max[i],
    tempLowC: daily.temperature_2m_min[i],
    precipProbabilityMax: daily.precipitation_probability_max?.[i] ?? 0,
    precipMm: daily.precipitation_sum?.[i] ?? 0,
    windGustKphMax: daily.wind_gusts_10m_max?.[i] ?? 0,
    uvIndexMax: daily.uv_index_max?.[i] ?? 0,
    sunriseIso: daily.sunrise[i],
    sunsetIso: daily.sunset[i],
  };
}

async function fetchDetailed(coords: Coords): Promise<DetailedForecast | null> {
  try {
    const res = await fetch(buildUrl(coords));
    if (!res.ok) {
      console.warn('[useDetailedDayForecast] non-ok response', res.status);
      return null;
    }
    const json = await res.json();
    const hourly: HourlySlice = json.hourly;
    const daily: DailyResponse = json.daily;
    const todayIso: string = daily.time[0];

    const now = new Date();
    const nowIso = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
    const isToday = nowIso === todayIso;
    const currentHour = now.getHours();
    const morningPassed = isToday && currentHour >= 12;
    const afternoonPassed = isToday && currentHour >= 18;

    const morning = morningPassed
      ? null
      : aggregateWeatherBucket(hourly, 6, 12, todayIso);
    const afternoon = afternoonPassed
      ? null
      : aggregateWeatherBucket(hourly, 12, 18, todayIso);

    return {
      locationIso: json.timezone ?? 'UTC',
      today: { morning, afternoon, summary: summariseDay(daily, 0) },
      forecast: [summariseDay(daily, 1), summariseDay(daily, 2)],
      fetchedAt: new Date().toISOString(),
    };
  } catch (err) {
    console.warn('[useDetailedDayForecast] fetch threw', err);
    return null;
  }
}

export function useDetailedDayForecast(
  coords: Coords | null,
): UseQueryResult<DetailedForecast | null> {
  const enabled = coords !== null;
  const lat = coords ? roundCoord(coords.lat) : 0;
  const lng = coords ? roundCoord(coords.lng) : 0;

  return useQuery({
    queryKey: ['weather', 'detailed-day', lat, lng],
    queryFn: () => fetchDetailed(coords as Coords),
    enabled,
    staleTime: CACHE_TIMES.STATIC,
    gcTime: GC_TIMES.LONG,
  });
}
