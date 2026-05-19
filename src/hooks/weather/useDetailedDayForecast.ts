/**
 * useDetailedDayForecast — single TanStack Query hook for Open-Meteo,
 * tailored to the home-screen "tap chip → modal" detail view.
 *
 * Fetches 3 days of hourly + daily data in one request, partitions today's
 * AND tomorrow's hourly slices into Morning (6-12) and Afternoon (12-18)
 * buckets via the pure aggregateWeatherBucket util, and returns a
 * DetailedForecast.
 *
 * Evening mode: when the user's local clock is at or past 18:00, the modal
 * collapses today's full-day summary into a compact row and promotes
 * tomorrow's morning/afternoon split to headline status. The `eveningMode`
 * flag is derived from the local clock at render time so cache hits stay
 * correct.
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

export interface DayBuckets {
  morning: BucketStats | null;
  afternoon: BucketStats | null;
  summary: DaySummary;
}

export interface DetailedForecast {
  locationIso: string;
  today: DayBuckets;
  tomorrow: DayBuckets;
  /** Day-after-tomorrow summary (row only; no hourly buckets). */
  dayAfter: DaySummary;
  /** True when the local clock is at or past 18:00 — flips the modal into
   *  evening mode (today as a compact row, tomorrow as the headline split). */
  eveningMode: boolean;
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

/** Hour-of-day cutoff (local clock) for evening mode. */
export const EVENING_MODE_HOUR = 18;

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
    const tomorrowIso: string = daily.time[1];

    return {
      locationIso: json.timezone ?? 'UTC',
      today: {
        morning: aggregateWeatherBucket(hourly, 6, 12, todayIso),
        afternoon: aggregateWeatherBucket(hourly, 12, 18, todayIso),
        summary: summariseDay(daily, 0),
      },
      tomorrow: {
        morning: aggregateWeatherBucket(hourly, 6, 12, tomorrowIso),
        afternoon: aggregateWeatherBucket(hourly, 12, 18, tomorrowIso),
        summary: summariseDay(daily, 1),
      },
      dayAfter: summariseDay(daily, 2),
      // Placeholder — replaced at render time by deriveEveningMode().
      eveningMode: false,
      fetchedAt: new Date().toISOString(),
    };
  } catch (err) {
    console.warn('[useDetailedDayForecast] fetch threw', err);
    return null;
  }
}

/**
 * Recompute `eveningMode` against the user's local clock at render time.
 * Done here (not in fetchDetailed) so cache hits stay in sync as the clock
 * crosses the cutoff without a re-fetch.
 */
function deriveEveningMode(forecast: DetailedForecast): DetailedForecast {
  const eveningMode = new Date().getHours() >= EVENING_MODE_HOUR;
  if (forecast.eveningMode === eveningMode) return forecast;
  return { ...forecast, eveningMode };
}

export function useDetailedDayForecast(
  coords: Coords | null,
): UseQueryResult<DetailedForecast | null> {
  const enabled = coords !== null;
  const lat = coords ? roundCoord(coords.lat) : 0;
  const lng = coords ? roundCoord(coords.lng) : 0;

  const query = useQuery({
    queryKey: ['weather', 'detailed-day', lat, lng],
    queryFn: () => fetchDetailed(coords as Coords),
    enabled,
    staleTime: CACHE_TIMES.STATIC,
    gcTime: GC_TIMES.LONG,
  });

  const data = query.data ? deriveEveningMode(query.data) : query.data;
  return { ...query, data } as UseQueryResult<DetailedForecast | null>;
}
