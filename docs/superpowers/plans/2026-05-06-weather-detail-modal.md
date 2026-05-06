# Weather Detail Modal Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make the home-screen weather chip tappable; opening it shows a centered modal with today (Morning + Afternoon buckets) and a 2-day outlook.

**Architecture:** A new pure aggregation util partitions Open-Meteo hourly data into Morning (6-12) and Afternoon (12-18) buckets. A new TanStack Query hook fetches a single Open-Meteo request (3-day horizon, hourly + daily) and assembles the `DetailedForecast` shape using the util. A new `WeatherDetailModal` component renders the result. `HeaderWeatherChip` becomes a `Pressable` and owns the modal-visible state.

**Tech Stack:** React Native, TanStack Query, TypeScript, Open-Meteo API, Jest + React Native Testing Library, React Native Paper, project's StyleSheet + token theming system.

**Spec:** `docs/superpowers/specs/2026-05-06-weather-detail-modal-design.md`

---

## File Structure

**Create:**
- `src/hooks/weather/aggregateWeatherBucket.ts` — pure util + types (`HourlySlice`, `BucketStats`)
- `src/hooks/weather/useDetailedDayForecast.ts` — TanStack Query hook + types (`DaySummary`, `DetailedForecast`)
- `src/screens/home/components/WeatherDetailModal.tsx` — modal component
- `src/__tests__/hooks/weather/aggregateWeatherBucket.test.ts` — unit tests for the aggregator
- `src/__tests__/hooks/weather/useDetailedDayForecast.test.tsx` — hook tests
- `src/screens/home/components/WeatherDetailModal.test.tsx` — component tests

**Modify:**
- `src/hooks/weather/index.ts` — export the new hook + types
- `src/screens/home/components/HeaderWeatherChip.tsx` — wrap in `Pressable`, own modal state
- `src/screens/home/components/HeaderWeatherChip.test.tsx` — extend tests for tap behaviour and a11y

**Conventions to follow** (read the file before writing if unsure):
- Cache config: `src/constants/cacheConfig.ts:46` (`CACHE_TIMES.STATIC`) and `src/constants/cacheConfig.ts:73` (`GC_TIMES.LONG`)
- Existing weather hook patterns: `src/hooks/weather/useWeather.ts` (rounded coords, fail-soft `null` on error, `console.warn` logging)
- Existing weather hook tests: `src/__tests__/hooks/weather/useWeather.test.tsx` (TanStack `wrapper`, `global.fetch = jest.fn()`)
- Theming: per project CLAUDE.md — `useThemeColors()` for colors, `spacing/typography/borderRadius/shadows` imported directly from `@/constants/theme`
- WMO icon mapping reused from `src/hooks/weather/weatherCodeToIcon.ts`

---

## Task 1: Pure aggregation util (TDD)

**Files:**
- Create: `src/hooks/weather/aggregateWeatherBucket.ts`
- Test: `src/__tests__/hooks/weather/aggregateWeatherBucket.test.ts`

### Step 1: Write the failing tests

- [ ] Create `src/__tests__/hooks/weather/aggregateWeatherBucket.test.ts` with this content:

```ts
import {
  aggregateWeatherBucket,
  type HourlySlice,
} from '@/hooks/weather/aggregateWeatherBucket';

// Helper: build an HourlySlice from per-hour rows. Each row is a tuple of
// [time, temp, apparent, code, wind, gust, dir, precipProb, precip, uv].
type Row = [string, number, number, number, number, number, number, number, number, number];

function build(rows: Row[]): HourlySlice {
  return {
    time: rows.map((r) => r[0]),
    temperature_2m: rows.map((r) => r[1]),
    apparent_temperature: rows.map((r) => r[2]),
    weather_code: rows.map((r) => r[3]),
    wind_speed_10m: rows.map((r) => r[4]),
    wind_gusts_10m: rows.map((r) => r[5]),
    wind_direction_10m: rows.map((r) => r[6]),
    precipitation_probability: rows.map((r) => r[7]),
    precipitation: rows.map((r) => r[8]),
    uv_index: rows.map((r) => r[9]),
  };
}

describe('aggregateWeatherBucket', () => {
  const date = '2026-05-06';

  it('returns null when no hours fall in the window', () => {
    const slice = build([
      ['2026-05-06T04:00', 10, 9, 1, 5, 8, 180, 0, 0, 1],
      ['2026-05-06T05:00', 11, 10, 1, 5, 8, 180, 0, 0, 1],
    ]);
    expect(aggregateWeatherBucket(slice, 6, 12, date)).toBeNull();
  });

  it('returns null when the hourly arrays are empty', () => {
    const empty = build([]);
    expect(aggregateWeatherBucket(empty, 6, 12, date)).toBeNull();
  });

  it('aggregates a 6-hour morning window with the documented rules', () => {
    const slice = build([
      // hour 6 - 11
      ['2026-05-06T06:00', 12, 11, 1, 10, 18, 180, 10, 0.0, 2],
      ['2026-05-06T07:00', 14, 13, 1, 12, 22, 190, 20, 0.0, 3],
      ['2026-05-06T08:00', 16, 15, 2, 14, 25, 200, 30, 0.5, 4],
      ['2026-05-06T09:00', 18, 17, 2, 14, 26, 210, 40, 0.5, 5],
      ['2026-05-06T10:00', 19, 18, 3, 15, 28, 220, 50, 1.0, 6],
      ['2026-05-06T11:00', 19, 19, 3, 15, 30, 230, 50, 0.0, 6],
    ]);
    const result = aggregateWeatherBucket(slice, 6, 12, date);
    expect(result).not.toBeNull();
    if (!result) throw new Error('result null');
    expect(result.tempHighC).toBe(19);
    expect(result.tempLowC).toBe(12);
    expect(result.feelsLikeAvgC).toBeCloseTo((11 + 13 + 15 + 17 + 18 + 19) / 6);
    expect(result.windKphAvg).toBeCloseTo((10 + 12 + 14 + 14 + 15 + 15) / 6);
    expect(result.windGustKphMax).toBe(30);
    expect(result.precipProbabilityMax).toBe(50);
    expect(result.precipMm).toBeCloseTo(2.0);
    expect(result.uvIndexMax).toBe(6);
  });

  it('window is half-open: includes start hour, excludes end hour', () => {
    const slice = build([
      ['2026-05-06T05:00', 10, 10, 0, 0, 0, 0, 0, 0, 0],
      ['2026-05-06T06:00', 20, 20, 0, 0, 0, 0, 0, 0, 0],
      ['2026-05-06T11:00', 30, 30, 0, 0, 0, 0, 0, 0, 0],
      ['2026-05-06T12:00', 40, 40, 0, 0, 0, 0, 0, 0, 0],
    ]);
    const result = aggregateWeatherBucket(slice, 6, 12, date);
    if (!result) throw new Error('result null');
    expect(result.tempHighC).toBe(30); // 11 included
    expect(result.tempLowC).toBe(20);  // 5 and 12 excluded
  });

  it('only aggregates rows on the requested date', () => {
    const slice = build([
      ['2026-05-06T08:00', 10, 10, 0, 0, 0, 0, 0, 0, 0],
      ['2026-05-07T08:00', 99, 99, 0, 0, 0, 0, 0, 0, 0], // ignored
    ]);
    const result = aggregateWeatherBucket(slice, 6, 12, date);
    if (!result) throw new Error('result null');
    expect(result.tempHighC).toBe(10);
  });

  it('dominant weather code uses the mode, ties resolved by highest WMO number', () => {
    const slice = build([
      ['2026-05-06T06:00', 0, 0, 1, 0, 0, 0, 0, 0, 0],
      ['2026-05-06T07:00', 0, 0, 1, 0, 0, 0, 0, 0, 0],
      ['2026-05-06T08:00', 0, 0, 3, 0, 0, 0, 0, 0, 0],
      ['2026-05-06T09:00', 0, 0, 3, 0, 0, 0, 0, 0, 0],
    ]);
    const result = aggregateWeatherBucket(slice, 6, 12, date);
    if (!result) throw new Error('result null');
    expect(result.dominantCode).toBe(3); // tie 1 vs 3 → 3 wins (higher severity)
  });

  it('wind direction uses circular mean (350 + 10 → ~0, not 180)', () => {
    const slice = build([
      ['2026-05-06T06:00', 0, 0, 0, 0, 0, 350, 0, 0, 0],
      ['2026-05-06T07:00', 0, 0, 0, 0, 0, 10,  0, 0, 0],
    ]);
    const result = aggregateWeatherBucket(slice, 6, 12, date);
    if (!result) throw new Error('result null');
    // Should be very close to 0°, definitely not ~180°
    const distFromZero = Math.min(result.windDirDegAvg, 360 - result.windDirDegAvg);
    expect(distFromZero).toBeLessThan(1);
  });

  it('all-zero precipitation returns 0 (not NaN)', () => {
    const slice = build([
      ['2026-05-06T06:00', 0, 0, 0, 0, 0, 0, 0, 0, 0],
      ['2026-05-06T07:00', 0, 0, 0, 0, 0, 0, 0, 0, 0],
    ]);
    const result = aggregateWeatherBucket(slice, 6, 12, date);
    if (!result) throw new Error('result null');
    expect(result.precipMm).toBe(0);
    expect(Number.isNaN(result.precipMm)).toBe(false);
  });
});
```

### Step 2: Run the tests; confirm they fail

- [ ] Run: `pnpm test src/__tests__/hooks/weather/aggregateWeatherBucket.test.ts`
- [ ] Expected: all tests fail with "Cannot find module '@/hooks/weather/aggregateWeatherBucket'"

### Step 3: Implement the util

- [ ] Create `src/hooks/weather/aggregateWeatherBucket.ts` with this content:

```ts
/**
 * aggregateWeatherBucket — pure util that partitions an Open-Meteo hourly
 * response into a single time-of-day bucket and computes summary stats.
 *
 * Window semantics: [startHour, endHour) — start inclusive, end exclusive.
 * Only hours whose ISO time begins with `dateIso` are considered.
 * Returns `null` when no hours fall in the window.
 */

export interface HourlySlice {
  time: string[];
  temperature_2m: number[];
  apparent_temperature: number[];
  weather_code: number[];
  wind_speed_10m: number[];
  wind_gusts_10m: number[];
  wind_direction_10m: number[];
  precipitation_probability: number[];
  precipitation: number[];
  uv_index: number[];
}

export interface BucketStats {
  tempHighC: number;
  tempLowC: number;
  feelsLikeAvgC: number;
  dominantCode: number;
  windKphAvg: number;
  windGustKphMax: number;
  windDirDegAvg: number;
  precipProbabilityMax: number;
  precipMm: number;
  uvIndexMax: number;
}

export function aggregateWeatherBucket(
  hourly: HourlySlice,
  startHour: number,
  endHour: number,
  dateIso: string,
): BucketStats | null {
  const indices: number[] = [];
  for (let i = 0; i < hourly.time.length; i++) {
    const t = hourly.time[i];
    if (!t.startsWith(dateIso)) continue;
    const hour = parseInt(t.slice(11, 13), 10);
    if (hour >= startHour && hour < endHour) indices.push(i);
  }
  if (indices.length === 0) return null;

  const pick = (arr: number[]): number[] => indices.map((i) => arr[i]);
  const max = (arr: number[]): number => Math.max(...arr);
  const min = (arr: number[]): number => Math.min(...arr);
  const sum = (arr: number[]): number => arr.reduce((a, b) => a + b, 0);
  const mean = (arr: number[]): number => sum(arr) / arr.length;

  // Dominant code: mode; ties resolved by highest WMO number (= worse condition).
  const codes = pick(hourly.weather_code);
  const codeCounts = new Map<number, number>();
  for (const c of codes) codeCounts.set(c, (codeCounts.get(c) ?? 0) + 1);
  let dominantCode = codes[0];
  let maxCount = 0;
  for (const [code, count] of codeCounts) {
    if (count > maxCount || (count === maxCount && code > dominantCode)) {
      dominantCode = code;
      maxCount = count;
    }
  }

  // Circular mean for wind direction.
  const dirs = pick(hourly.wind_direction_10m);
  const sinSum = dirs.reduce((a, d) => a + Math.sin((d * Math.PI) / 180), 0);
  const cosSum = dirs.reduce((a, d) => a + Math.cos((d * Math.PI) / 180), 0);
  const dirRad = Math.atan2(sinSum / dirs.length, cosSum / dirs.length);
  let dirDeg = (dirRad * 180) / Math.PI;
  if (dirDeg < 0) dirDeg += 360;

  return {
    tempHighC: max(pick(hourly.temperature_2m)),
    tempLowC: min(pick(hourly.temperature_2m)),
    feelsLikeAvgC: mean(pick(hourly.apparent_temperature)),
    dominantCode,
    windKphAvg: mean(pick(hourly.wind_speed_10m)),
    windGustKphMax: max(pick(hourly.wind_gusts_10m)),
    windDirDegAvg: dirDeg,
    precipProbabilityMax: max(pick(hourly.precipitation_probability)),
    precipMm: sum(pick(hourly.precipitation)),
    uvIndexMax: max(pick(hourly.uv_index)),
  };
}
```

### Step 4: Run the tests; confirm they pass

- [ ] Run: `pnpm test src/__tests__/hooks/weather/aggregateWeatherBucket.test.ts`
- [ ] Expected: all 8 tests pass

### Step 5: Commit

- [ ] Run:

```bash
git add src/hooks/weather/aggregateWeatherBucket.ts \
        src/__tests__/hooks/weather/aggregateWeatherBucket.test.ts
git commit -m "feat(weather): add aggregateWeatherBucket pure util"
```

---

## Task 2: `useDetailedDayForecast` hook (TDD)

**Files:**
- Create: `src/hooks/weather/useDetailedDayForecast.ts`
- Test: `src/__tests__/hooks/weather/useDetailedDayForecast.test.tsx`
- Modify: `src/hooks/weather/index.ts` (add new exports)

### Step 1: Write the failing tests

- [ ] Create `src/__tests__/hooks/weather/useDetailedDayForecast.test.tsx` with this content:

```tsx
import { renderHook, waitFor } from '@testing-library/react-native';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import React from 'react';
import { useDetailedDayForecast } from '@/hooks/weather/useDetailedDayForecast';

const wrapper = ({ children }: { children: React.ReactNode }) => {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false, gcTime: 0 } },
  });
  return <QueryClientProvider client={client}>{children}</QueryClientProvider>;
};

// Build a mocked Open-Meteo response covering 3 days of hourly + daily data.
function mockResponse(opts?: { todayIso?: string }) {
  const todayIso = opts?.todayIso ?? '2026-05-06';
  const hours = ['06:00', '07:00', '08:00', '09:00', '10:00', '11:00',
                 '12:00', '13:00', '14:00', '15:00', '16:00', '17:00'];
  const time = hours.map((h) => `${todayIso}T${h}`);
  const fill = (v: number) => hours.map(() => v);
  return {
    timezone: 'Australia/Melbourne',
    hourly: {
      time,
      temperature_2m: fill(15),
      apparent_temperature: fill(14),
      weather_code: fill(1),
      wind_speed_10m: fill(10),
      wind_gusts_10m: fill(20),
      wind_direction_10m: fill(180),
      precipitation_probability: fill(0),
      precipitation: fill(0),
      uv_index: fill(3),
    },
    daily: {
      time: [todayIso, '2026-05-07', '2026-05-08'],
      weather_code: [1, 2, 3],
      temperature_2m_max: [21, 19, 17],
      temperature_2m_min: [11, 9, 8],
      precipitation_probability_max: [10, 30, 60],
      precipitation_sum: [0, 0.5, 5.0],
      wind_gusts_10m_max: [22, 28, 35],
      uv_index_max: [6, 5, 4],
      sunrise: [`${todayIso}T06:42`, '2026-05-07T06:43', '2026-05-08T06:44'],
      sunset: [`${todayIso}T17:31`, '2026-05-07T17:30', '2026-05-08T17:29'],
    },
  };
}

describe('useDetailedDayForecast', () => {
  beforeEach(() => {
    global.fetch = jest.fn();
  });

  afterEach(() => {
    jest.resetAllMocks();
    jest.useRealTimers();
  });

  it('is disabled when coords is null', () => {
    const { result } = renderHook(() => useDetailedDayForecast(null), { wrapper });
    expect(result.current.isFetching).toBe(false);
    expect(global.fetch).not.toHaveBeenCalled();
  });

  it('rounds coords to 2 decimals in the URL', async () => {
    (global.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      json: async () => mockResponse(),
    });
    const { result } = renderHook(
      () => useDetailedDayForecast({ lat: -37.81367, lng: 144.96321 }),
      { wrapper },
    );
    await waitFor(() => expect(result.current.isFetched).toBe(true));
    const url = (global.fetch as jest.Mock).mock.calls[0][0] as string;
    expect(url).toContain('latitude=-37.81');
    expect(url).toContain('longitude=144.96');
    expect(url).toContain('forecast_days=3');
    expect(url).toContain('timezone=auto');
  });

  it('returns morning, afternoon, today summary, and 2-day forecast', async () => {
    // Pretend "now" is 08:00 on the test date so neither bucket is past.
    jest.useFakeTimers().setSystemTime(new Date('2026-05-06T08:00:00'));
    (global.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      json: async () => mockResponse(),
    });
    const { result } = renderHook(
      () => useDetailedDayForecast({ lat: -37.81, lng: 144.96 }),
      { wrapper },
    );
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    const data = result.current.data;
    expect(data).not.toBeNull();
    if (!data) throw new Error('data null');
    expect(data.today.morning).not.toBeNull();
    expect(data.today.afternoon).not.toBeNull();
    expect(data.today.summary.dateIso).toBe('2026-05-06');
    expect(data.today.summary.tempHighC).toBe(21);
    expect(data.today.summary.sunriseIso).toBe('2026-05-06T06:42');
    expect(data.forecast).toHaveLength(2);
    expect(data.forecast[0].dateIso).toBe('2026-05-07');
    expect(data.forecast[1].dateIso).toBe('2026-05-08');
    expect(data.locationIso).toBe('Australia/Melbourne');
  });

  it('marks morning as null when "now" is past noon on todays date', async () => {
    jest.useFakeTimers().setSystemTime(new Date('2026-05-06T14:00:00'));
    (global.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      json: async () => mockResponse(),
    });
    const { result } = renderHook(
      () => useDetailedDayForecast({ lat: 0, lng: 0 }),
      { wrapper },
    );
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    const data = result.current.data;
    if (!data) throw new Error('data null');
    expect(data.today.morning).toBeNull();
    expect(data.today.afternoon).not.toBeNull();
  });

  it('marks both buckets as null when "now" is past 6pm', async () => {
    jest.useFakeTimers().setSystemTime(new Date('2026-05-06T19:00:00'));
    (global.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      json: async () => mockResponse(),
    });
    const { result } = renderHook(
      () => useDetailedDayForecast({ lat: 0, lng: 0 }),
      { wrapper },
    );
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    const data = result.current.data;
    if (!data) throw new Error('data null');
    expect(data.today.morning).toBeNull();
    expect(data.today.afternoon).toBeNull();
  });

  it('resolves to null when the API returns a non-OK status', async () => {
    (global.fetch as jest.Mock).mockResolvedValue({ ok: false, status: 500 });
    const { result } = renderHook(
      () => useDetailedDayForecast({ lat: 0, lng: 0 }),
      { wrapper },
    );
    await waitFor(() => expect(result.current.isFetched).toBe(true));
    expect(result.current.data).toBeNull();
  });

  it('resolves to null when fetch throws', async () => {
    (global.fetch as jest.Mock).mockRejectedValue(new Error('network'));
    const { result } = renderHook(
      () => useDetailedDayForecast({ lat: 0, lng: 0 }),
      { wrapper },
    );
    await waitFor(() => expect(result.current.isFetched).toBe(true));
    expect(result.current.data).toBeNull();
  });
});
```

### Step 2: Run the tests; confirm they fail

- [ ] Run: `pnpm test src/__tests__/hooks/weather/useDetailedDayForecast.test.tsx`
- [ ] Expected: all tests fail with "Cannot find module '@/hooks/weather/useDetailedDayForecast'"

### Step 3: Implement the hook

- [ ] Create `src/hooks/weather/useDetailedDayForecast.ts` with this content:

```ts
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

function summariseDay(daily: any, i: number): DaySummary {
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
    const daily = json.daily;
    const todayIso: string = daily.time[0];

    // Past-bucket check using device local clock.
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
```

### Step 4: Run the tests; confirm they pass

- [ ] Run: `pnpm test src/__tests__/hooks/weather/useDetailedDayForecast.test.tsx`
- [ ] Expected: all 7 tests pass

### Step 5: Update barrel exports

- [ ] Modify `src/hooks/weather/index.ts` to add the new exports. The full file should be:

```ts
export { useWeather } from './useWeather';
export type { WeatherInput, WeatherSnapshot } from './useWeather';
export { useDeviceWeather } from './useDeviceWeather';
export { useUpcomingRoundWeather } from './useUpcomingRoundWeather';
export { useFallbackCourseCoords } from './useFallbackCourseCoords';
export { weatherCodeToIcon } from './weatherCodeToIcon';
export type { WeatherIcon } from './weatherCodeToIcon';
export { useDetailedDayForecast } from './useDetailedDayForecast';
export type { Coords, DaySummary, DetailedForecast } from './useDetailedDayForecast';
export { aggregateWeatherBucket } from './aggregateWeatherBucket';
export type { BucketStats, HourlySlice } from './aggregateWeatherBucket';
```

### Step 6: Commit

- [ ] Run:

```bash
git add src/hooks/weather/useDetailedDayForecast.ts \
        src/hooks/weather/index.ts \
        src/__tests__/hooks/weather/useDetailedDayForecast.test.tsx
git commit -m "feat(weather): add useDetailedDayForecast hook"
```

---

## Task 3: `WeatherDetailModal` component (TDD)

**Files:**
- Create: `src/screens/home/components/WeatherDetailModal.tsx`
- Test: `src/screens/home/components/WeatherDetailModal.test.tsx`

### Step 1: Write the failing tests

- [ ] Create `src/screens/home/components/WeatherDetailModal.test.tsx` with this content:

```tsx
import React from 'react';
import { fireEvent, render } from '@testing-library/react-native';
import { WeatherDetailModal } from './WeatherDetailModal';
import * as hookModule from '@/hooks/weather/useDetailedDayForecast';

jest.mock('@/hooks/weather/useDetailedDayForecast');

const baseStats = {
  tempHighC: 19,
  tempLowC: 14,
  feelsLikeAvgC: 16,
  dominantCode: 1,
  windKphAvg: 12,
  windGustKphMax: 22,
  windDirDegAvg: 0, // N
  precipProbabilityMax: 10,
  precipMm: 0,
  uvIndexMax: 3,
};

const baseSummary = {
  dateIso: '2026-05-06',
  weatherCode: 1,
  tempHighC: 21,
  tempLowC: 11,
  precipProbabilityMax: 10,
  precipMm: 0,
  windGustKphMax: 22,
  uvIndexMax: 6,
  sunriseIso: '2026-05-06T06:42',
  sunsetIso: '2026-05-06T17:31',
};

const successData = {
  locationIso: 'Australia/Melbourne',
  today: {
    morning: baseStats,
    afternoon: { ...baseStats, tempHighC: 21, windGustKphMax: 35, uvIndexMax: 7 },
    summary: baseSummary,
  },
  forecast: [
    { ...baseSummary, dateIso: '2026-05-07', tempHighC: 19, tempLowC: 9, precipProbabilityMax: 30 },
    { ...baseSummary, dateIso: '2026-05-08', tempHighC: 17, tempLowC: 8, precipProbabilityMax: 60 },
  ],
  fetchedAt: '2026-05-06T08:00:00Z',
};

function mockHook(overrides: Partial<{ data: unknown; isLoading: boolean; refetch: jest.Mock }>) {
  (hookModule.useDetailedDayForecast as jest.Mock).mockReturnValue({
    data: overrides.data ?? null,
    isLoading: overrides.isLoading ?? false,
    refetch: overrides.refetch ?? jest.fn(),
  });
}

describe('WeatherDetailModal', () => {
  afterEach(() => jest.clearAllMocks());

  it('renders nothing when visible is false', () => {
    mockHook({ data: successData });
    const { queryByTestId } = render(
      <WeatherDetailModal visible={false} onDismiss={jest.fn()} coords={{ lat: 0, lng: 0 }} />,
    );
    expect(queryByTestId('weather-detail-modal')).toBeNull();
  });

  it('renders skeletons when loading', () => {
    mockHook({ data: undefined, isLoading: true });
    const { getByTestId } = render(
      <WeatherDetailModal visible onDismiss={jest.fn()} coords={{ lat: 0, lng: 0 }} />,
    );
    expect(getByTestId('weather-detail-modal-skeleton')).toBeTruthy();
  });

  it('renders header, both bucket cards, and both forecast rows on success', () => {
    mockHook({ data: successData });
    const { getByText, getByTestId } = render(
      <WeatherDetailModal visible onDismiss={jest.fn()} coords={{ lat: 0, lng: 0 }} />,
    );
    expect(getByTestId('weather-detail-modal')).toBeTruthy();
    expect(getByText(/Morning/)).toBeTruthy();
    expect(getByText(/Afternoon/)).toBeTruthy();
    // Two forecast rows: dates 7 May and 8 May
    expect(getByTestId('forecast-row-2026-05-07')).toBeTruthy();
    expect(getByTestId('forecast-row-2026-05-08')).toBeTruthy();
  });

  it('renders "already passed" placeholder for null morning bucket', () => {
    mockHook({
      data: { ...successData, today: { ...successData.today, morning: null } },
    });
    const { getByTestId } = render(
      <WeatherDetailModal visible onDismiss={jest.fn()} coords={{ lat: 0, lng: 0 }} />,
    );
    expect(getByTestId('bucket-morning-passed')).toBeTruthy();
  });

  it('renders error state with retry when forecast is null', () => {
    const refetch = jest.fn();
    mockHook({ data: null, refetch });
    const { getByText } = render(
      <WeatherDetailModal visible onDismiss={jest.fn()} coords={{ lat: 0, lng: 0 }} />,
    );
    expect(getByText(/Couldn't load weather/i)).toBeTruthy();
    fireEvent.press(getByText(/Retry/i));
    expect(refetch).toHaveBeenCalledTimes(1);
  });

  it('calls onDismiss when the close button is pressed', () => {
    mockHook({ data: successData });
    const onDismiss = jest.fn();
    const { getByTestId } = render(
      <WeatherDetailModal visible onDismiss={onDismiss} coords={{ lat: 0, lng: 0 }} />,
    );
    fireEvent.press(getByTestId('weather-detail-modal-close'));
    expect(onDismiss).toHaveBeenCalledTimes(1);
  });

  it('calls onDismiss when the backdrop is pressed', () => {
    mockHook({ data: successData });
    const onDismiss = jest.fn();
    const { getByTestId } = render(
      <WeatherDetailModal visible onDismiss={onDismiss} coords={{ lat: 0, lng: 0 }} />,
    );
    fireEvent.press(getByTestId('weather-detail-modal-backdrop'));
    expect(onDismiss).toHaveBeenCalledTimes(1);
  });

  it('bucket card has a combined accessibility label', () => {
    mockHook({ data: successData });
    const { getByTestId } = render(
      <WeatherDetailModal visible onDismiss={jest.fn()} coords={{ lat: 0, lng: 0 }} />,
    );
    const morning = getByTestId('bucket-morning');
    const label = morning.props.accessibilityLabel as string;
    expect(label).toMatch(/Morning/);
    expect(label).toMatch(/14/); // low
    expect(label).toMatch(/19/); // high
  });
});
```

### Step 2: Run the tests; confirm they fail

- [ ] Run: `pnpm test src/screens/home/components/WeatherDetailModal.test.tsx`
- [ ] Expected: all tests fail with "Cannot find module './WeatherDetailModal'"

### Step 3: Implement the modal

- [ ] Create `src/screens/home/components/WeatherDetailModal.tsx` with this content:

```tsx
/**
 * WeatherDetailModal — centered modal triggered from HeaderWeatherChip.
 * Shows today (Morning + Afternoon buckets) plus a 2-day outlook for the
 * device location. Loading, error, and "bucket already passed" states are
 * all handled inline.
 */

import React from 'react';
import {
  Modal as RNModal,
  Pressable,
  ScrollView,
  StyleSheet,
  View,
} from 'react-native';
import { Icon, Text } from 'react-native-paper';
import { useThemeColors } from '@/context/ThemeContext';
import { borderRadius, shadows, spacing, typography } from '@/constants/theme';
import {
  useDetailedDayForecast,
  type BucketStats,
  type DaySummary,
  type DetailedForecast,
} from '@/hooks/weather';
import { weatherCodeToIcon } from '@/hooks/weather/weatherCodeToIcon';

interface WeatherDetailModalProps {
  visible: boolean;
  onDismiss: () => void;
  coords: { lat: number; lng: number } | null;
}

export function WeatherDetailModal({
  visible,
  onDismiss,
  coords,
}: WeatherDetailModalProps) {
  const colors = useThemeColors();
  const { data, isLoading, refetch } = useDetailedDayForecast(coords);

  return (
    <RNModal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onDismiss}
    >
      <Pressable
        testID="weather-detail-modal-backdrop"
        style={[styles.backdrop, { backgroundColor: colors.overlay }]}
        onPress={onDismiss}
      >
        <Pressable
          testID="weather-detail-modal"
          accessibilityViewIsModal
          style={[
            styles.card,
            shadows.lg,
            { backgroundColor: colors.surface },
          ]}
          onPress={(e) => e.stopPropagation()}
        >
          <CloseButton onPress={onDismiss} />
          {isLoading || data === undefined ? (
            <SkeletonBody />
          ) : data === null ? (
            <ErrorBody onRetry={refetch} />
          ) : (
            <SuccessBody data={data} />
          )}
        </Pressable>
      </Pressable>
    </RNModal>
  );
}

// ---------------------------------------------------------------------------

function CloseButton({ onPress }: { onPress: () => void }) {
  const colors = useThemeColors();
  return (
    <Pressable
      testID="weather-detail-modal-close"
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel="Close weather details"
      hitSlop={12}
      style={[styles.closeBtn, { backgroundColor: colors.surfaceVariant }]}
    >
      <Icon source="close" size={20} color={colors.textPrimary} />
    </Pressable>
  );
}

function SkeletonBody() {
  const colors = useThemeColors();
  const block = { backgroundColor: colors.surfaceVariant };
  return (
    <View testID="weather-detail-modal-skeleton" style={styles.skeletonBody}>
      <View style={[styles.skeletonHeader, block]} />
      <View style={styles.skeletonRow}>
        <View style={[styles.skeletonCard, block]} />
        <View style={[styles.skeletonCard, block]} />
      </View>
      <View style={[styles.skeletonForecast, block]} />
      <View style={[styles.skeletonForecast, block]} />
    </View>
  );
}

function ErrorBody({ onRetry }: { onRetry: () => void }) {
  const colors = useThemeColors();
  return (
    <View style={styles.errorBody}>
      <Icon source="weather-cloudy-alert" size={36} color={colors.textSecondary} />
      <Text style={[typography.body, { color: colors.textPrimary, marginTop: spacing.md }]}>
        Couldn't load weather right now
      </Text>
      <Pressable
        onPress={onRetry}
        accessibilityRole="button"
        accessibilityLabel="Retry"
        style={[styles.retryBtn, { backgroundColor: colors.primary }]}
      >
        <Text style={[typography.body, { color: colors.onPrimary, fontWeight: '600' }]}>
          Retry
        </Text>
      </Pressable>
    </View>
  );
}

function SuccessBody({ data }: { data: DetailedForecast }) {
  return (
    <ScrollView contentContainerStyle={styles.successBody}>
      <DayHeader summary={data.today.summary} />
      <SectionLabel>TODAY</SectionLabel>
      <View style={styles.bucketRow}>
        <BucketCard label="Morning" testIDBase="morning" stats={data.today.morning} />
        <BucketCard label="Afternoon" testIDBase="afternoon" stats={data.today.afternoon} />
      </View>
      <SectionLabel>NEXT DAYS</SectionLabel>
      {data.forecast.map((day) => (
        <ForecastRow key={day.dateIso} day={day} />
      ))}
    </ScrollView>
  );
}

// ---------------------------------------------------------------------------

function DayHeader({ summary }: { summary: DaySummary }) {
  const colors = useThemeColors();
  const { icon, label } = weatherCodeToIcon(summary.weatherCode);
  return (
    <View style={styles.dayHeader}>
      <View style={styles.dayHeaderTop}>
        <Icon source={icon} size={36} color={colors.textPrimary} />
        <View style={{ flex: 1, marginLeft: spacing.md }}>
          <Text style={[typography.h3, { color: colors.textPrimary }]}>
            {formatDayDate(summary.dateIso)}
          </Text>
          <Text style={[typography.small, { color: colors.textSecondary }]}>
            {label} · High {Math.round(summary.tempHighC)}° / Low {Math.round(summary.tempLowC)}°
          </Text>
        </View>
      </View>
      <View style={styles.sunRow}>
        <SunMeta icon="weather-sunset-up" label="Sunrise" iso={summary.sunriseIso} />
        <SunMeta icon="weather-sunset-down" label="Sunset" iso={summary.sunsetIso} />
      </View>
    </View>
  );
}

function SunMeta({ icon, label, iso }: { icon: string; label: string; iso: string }) {
  const colors = useThemeColors();
  return (
    <View style={styles.sunMeta}>
      <Icon source={icon} size={16} color={colors.textSecondary} />
      <Text style={[typography.caption, { color: colors.textSecondary, marginLeft: spacing.xs }]}>
        {label} {formatTime(iso)}
      </Text>
    </View>
  );
}

function SectionLabel({ children }: { children: React.ReactNode }) {
  const colors = useThemeColors();
  return (
    <Text
      style={[
        typography.caption,
        styles.sectionLabel,
        { color: colors.textSecondary },
      ]}
    >
      {children}
    </Text>
  );
}

function BucketCard({
  label,
  testIDBase,
  stats,
}: {
  label: string;
  testIDBase: string;
  stats: BucketStats | null;
}) {
  const colors = useThemeColors();
  if (stats === null) {
    return (
      <View
        testID={`bucket-${testIDBase}-passed`}
        style={[
          styles.bucketCard,
          { backgroundColor: colors.surfaceVariant, borderColor: colors.borderLight },
        ]}
      >
        <Text style={[typography.small, { color: colors.textSecondary, fontWeight: '600' }]}>
          {label}
        </Text>
        <Text
          style={[typography.caption, { color: colors.textMuted, marginTop: spacing.sm }]}
        >
          Already passed
        </Text>
      </View>
    );
  }

  const { icon, label: condLabel } = weatherCodeToIcon(stats.dominantCode);
  const dirCardinal = degToCardinal(stats.windDirDegAvg);
  const a11y =
    `${label}. ${condLabel}. ` +
    `Temperature ${Math.round(stats.tempLowC)} to ${Math.round(stats.tempHighC)} degrees, ` +
    `feels like ${Math.round(stats.feelsLikeAvgC)}. ` +
    `Wind ${Math.round(stats.windKphAvg)} kph from the ${dirCardinal}, ` +
    `gusts ${Math.round(stats.windGustKphMax)} kph. ` +
    `Rain ${Math.round(stats.precipProbabilityMax)} percent, ` +
    `${stats.precipMm.toFixed(1)} millimetres. ` +
    `UV index ${Math.round(stats.uvIndexMax)}.`;

  return (
    <View
      testID={`bucket-${testIDBase}`}
      accessibilityLabel={a11y}
      accessibilityRole="text"
      style={[
        styles.bucketCard,
        { backgroundColor: colors.surfaceVariant, borderColor: colors.borderLight },
      ]}
    >
      <Text style={[typography.small, { color: colors.textPrimary, fontWeight: '700' }]}>
        {label}
      </Text>
      <View style={styles.bucketCondRow}>
        <Icon source={icon} size={20} color={colors.textPrimary} />
        <Text style={[typography.small, { color: colors.textPrimary, marginLeft: spacing.xs }]}>
          {condLabel}
        </Text>
      </View>
      <BucketLine label={`${Math.round(stats.tempLowC)}° – ${Math.round(stats.tempHighC)}°`} />
      <BucketLine label={`Feels ${Math.round(stats.feelsLikeAvgC)}°`} />
      <BucketLine label={`Wind ${Math.round(stats.windKphAvg)}kph ${dirCardinal}`} />
      <BucketLine label={`Gusts ${Math.round(stats.windGustKphMax)}kph`} />
      <BucketLine
        label={`Rain ${Math.round(stats.precipProbabilityMax)}% · ${stats.precipMm.toFixed(1)}mm`}
      />
      <BucketLine label={`UV ${Math.round(stats.uvIndexMax)}`} />
    </View>
  );
}

function BucketLine({ label }: { label: string }) {
  const colors = useThemeColors();
  return (
    <Text style={[typography.caption, { color: colors.textSecondary, marginTop: spacing.xs }]}>
      {label}
    </Text>
  );
}

function ForecastRow({ day }: { day: DaySummary }) {
  const colors = useThemeColors();
  const { icon, label } = weatherCodeToIcon(day.weatherCode);
  const a11y =
    `${formatDayDate(day.dateIso)}, ${label}, ` +
    `high ${Math.round(day.tempHighC)} degrees, low ${Math.round(day.tempLowC)} degrees, ` +
    `${Math.round(day.precipProbabilityMax)} percent rain.`;
  return (
    <View
      testID={`forecast-row-${day.dateIso}`}
      accessibilityLabel={a11y}
      accessibilityRole="text"
      style={[styles.forecastRow, { borderTopColor: colors.divider }]}
    >
      <Text style={[typography.small, { color: colors.textPrimary, flex: 1 }]}>
        {formatDayDate(day.dateIso)}
      </Text>
      <Icon source={icon} size={20} color={colors.textPrimary} />
      <Text
        style={[
          typography.small,
          { color: colors.textPrimary, marginLeft: spacing.md, width: 70, textAlign: 'right' },
        ]}
      >
        {Math.round(day.tempHighC)}° / {Math.round(day.tempLowC)}°
      </Text>
      <Text
        style={[
          typography.caption,
          { color: colors.textSecondary, marginLeft: spacing.md, width: 60, textAlign: 'right' },
        ]}
      >
        {Math.round(day.precipProbabilityMax)}% rain
      </Text>
    </View>
  );
}

// ---------------------------------------------------------------------------

function formatDayDate(iso: string): string {
  // 'YYYY-MM-DD' → 'Wed 7 May'
  const [y, m, d] = iso.split('-').map((s) => parseInt(s, 10));
  const date = new Date(y, m - 1, d);
  const weekday = date.toLocaleDateString(undefined, { weekday: 'short' });
  const dayNum = date.getDate();
  const month = date.toLocaleDateString(undefined, { month: 'short' });
  return `${weekday} ${dayNum} ${month}`;
}

function formatTime(iso: string): string {
  // 'YYYY-MM-DDTHH:mm' → 'H:MM'
  const hh = iso.slice(11, 13);
  const mm = iso.slice(14, 16);
  return `${parseInt(hh, 10)}:${mm}`;
}

function degToCardinal(deg: number): string {
  const dirs = ['N', 'NE', 'E', 'SE', 'S', 'SW', 'W', 'NW'];
  return dirs[Math.round(((deg % 360) / 45)) % 8];
}

// ---------------------------------------------------------------------------

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.lg,
  },
  card: {
    width: '100%',
    maxWidth: 420,
    borderRadius: borderRadius.xl,
    padding: spacing.lg,
    maxHeight: '85%',
  },
  closeBtn: {
    alignSelf: 'flex-end',
    width: 32,
    height: 32,
    borderRadius: borderRadius.full,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.sm,
  },
  successBody: {
    paddingBottom: spacing.md,
  },
  dayHeader: {
    marginBottom: spacing.md,
  },
  dayHeaderTop: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  sunRow: {
    flexDirection: 'row',
    marginTop: spacing.sm,
    gap: spacing.lg,
  },
  sunMeta: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  sectionLabel: {
    marginTop: spacing.md,
    marginBottom: spacing.sm,
    fontWeight: '600',
    letterSpacing: 0.5,
  },
  bucketRow: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  bucketCard: {
    flex: 1,
    borderRadius: borderRadius.lg,
    padding: spacing.md,
    borderWidth: 1,
  },
  bucketCondRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: spacing.sm,
  },
  forecastRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.sm,
    borderTopWidth: 1,
  },
  errorBody: {
    alignItems: 'center',
    paddingVertical: spacing.xl,
  },
  retryBtn: {
    marginTop: spacing.md,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.lg,
    borderRadius: borderRadius.full,
    minHeight: 44,
    minWidth: 100,
    alignItems: 'center',
    justifyContent: 'center',
  },
  skeletonBody: {
    paddingVertical: spacing.md,
  },
  skeletonHeader: {
    height: 56,
    borderRadius: borderRadius.md,
    marginBottom: spacing.md,
  },
  skeletonRow: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginBottom: spacing.md,
  },
  skeletonCard: {
    flex: 1,
    height: 180,
    borderRadius: borderRadius.lg,
  },
  skeletonForecast: {
    height: 36,
    borderRadius: borderRadius.md,
    marginTop: spacing.sm,
  },
});
```

### Step 4: Run the tests; confirm they pass

- [ ] Run: `pnpm test src/screens/home/components/WeatherDetailModal.test.tsx`
- [ ] Expected: all 8 tests pass

### Step 5: Commit

- [ ] Run:

```bash
git add src/screens/home/components/WeatherDetailModal.tsx \
        src/screens/home/components/WeatherDetailModal.test.tsx
git commit -m "feat(weather): add WeatherDetailModal component"
```

---

## Task 4: Wire `HeaderWeatherChip` to open the modal

**Files:**
- Modify: `src/screens/home/components/HeaderWeatherChip.tsx`
- Modify: `src/screens/home/components/HeaderWeatherChip.test.tsx`

### Step 1: Extend the existing test to assert tap-to-open and a11y hint

- [ ] Replace the contents of `src/screens/home/components/HeaderWeatherChip.test.tsx` with:

```tsx
import React from 'react';
import { fireEvent, render } from '@testing-library/react-native';
import { HeaderWeatherChip } from './HeaderWeatherChip';
import * as useDeviceWeatherModule from '@/hooks/weather/useDeviceWeather';
import * as useOneShotLocationModule from '@/hooks/useOneShotLocation';

jest.mock('@/hooks/weather/useDeviceWeather');
jest.mock('@/hooks/useOneShotLocation');

// The chip embeds WeatherDetailModal. Stub it so this test stays unit-scoped
// — modal internals are covered by WeatherDetailModal.test.tsx.
jest.mock('./WeatherDetailModal', () => ({
  WeatherDetailModal: ({ visible }: { visible: boolean }) =>
    visible ? <></> : null,
}));

function mockSnapshot(snapshot: unknown) {
  (useDeviceWeatherModule.useDeviceWeather as jest.Mock).mockReturnValue({
    data: snapshot,
  });
}

function mockLocation(loc: { latitude: number; longitude: number } | null) {
  (useOneShotLocationModule.useOneShotLocation as jest.Mock).mockReturnValue({
    location: loc,
    isLoading: false,
  });
}

describe('HeaderWeatherChip', () => {
  beforeEach(() => {
    mockLocation({ latitude: -37.81, longitude: 144.96 });
  });

  it('renders nothing when no snapshot', () => {
    mockSnapshot(null);
    const { queryByTestId } = render(<HeaderWeatherChip />);
    expect(queryByTestId('header-weather-chip')).toBeNull();
  });

  it('renders temp + icon when a snapshot is available', () => {
    mockSnapshot({
      tempC: 17.8,
      weatherCode: 2,
      windKph: 5,
      windDirDeg: 90,
      precipProbability: 0,
      fetchedAt: '2026-05-04T08:00:00Z',
    });
    const { getByTestId, getByText } = render(<HeaderWeatherChip />);
    expect(getByTestId('header-weather-chip')).toBeTruthy();
    expect(getByText(/18°/)).toBeTruthy();
  });

  it('exposes an accessibility hint pointing at the modal', () => {
    mockSnapshot({
      tempC: 17.8,
      weatherCode: 2,
      windKph: 5,
      windDirDeg: 90,
      precipProbability: 0,
      fetchedAt: '2026-05-04T08:00:00Z',
    });
    const { getByTestId } = render(<HeaderWeatherChip />);
    const chip = getByTestId('header-weather-chip');
    expect(chip.props.accessibilityRole).toBe('button');
    expect(chip.props.accessibilityHint).toMatch(/detailed forecast/i);
  });

  it('opens the modal when tapped', () => {
    mockSnapshot({
      tempC: 17.8,
      weatherCode: 2,
      windKph: 5,
      windDirDeg: 90,
      precipProbability: 0,
      fetchedAt: '2026-05-04T08:00:00Z',
    });
    const { getByTestId } = render(<HeaderWeatherChip />);
    const chip = getByTestId('header-weather-chip');
    expect(chip.props.accessibilityState?.expanded).toBe(false);
    fireEvent.press(chip);
    // After tap, the chip's accessibilityState should reflect the modal-open
    // state. (The modal itself is mocked, so we verify state via the chip.)
    expect(chip.props.accessibilityState?.expanded).toBe(true);
  });
});
```

### Step 2: Run the tests; confirm the new ones fail

- [ ] Run: `pnpm test src/screens/home/components/HeaderWeatherChip.test.tsx`
- [ ] Expected: the two existing tests pass; the two new tests fail (chip is not yet a button, no `accessibilityHint`, no `accessibilityState`)

### Step 3: Modify `HeaderWeatherChip` to be a Pressable that owns modal state

- [ ] Replace the contents of `src/screens/home/components/HeaderWeatherChip.tsx` with:

```tsx
import React, { useState } from 'react';
import { Pressable, StyleSheet } from 'react-native';
import { Icon, Text } from 'react-native-paper';
import { useThemeColors } from '@/context/ThemeContext';
import { borderRadius, spacing, typography } from '@/constants/theme';
import { useDeviceWeather } from '@/hooks/weather/useDeviceWeather';
import { useOneShotLocation } from '@/hooks/useOneShotLocation';
import { weatherCodeToIcon } from '@/hooks/weather/weatherCodeToIcon';
import { WeatherDetailModal } from './WeatherDetailModal';

export function HeaderWeatherChip() {
  const colors = useThemeColors();
  const { data: snapshot } = useDeviceWeather();
  const { location } = useOneShotLocation();
  const [modalVisible, setModalVisible] = useState(false);

  if (!snapshot) return null;

  const { icon, label } = weatherCodeToIcon(snapshot.weatherCode);
  const tempLabel = `${Math.round(snapshot.tempC)}°`;
  const coords = location
    ? { lat: location.latitude, lng: location.longitude }
    : null;

  return (
    <>
      <Pressable
        testID="header-weather-chip"
        accessibilityRole="button"
        accessibilityLabel={`Currently ${Math.round(snapshot.tempC)} degrees, ${label}`}
        accessibilityHint="Opens detailed forecast"
        accessibilityState={{ expanded: modalVisible }}
        onPress={() => setModalVisible(true)}
        style={[
          styles.chip,
          { backgroundColor: colors.surfaceVariant, borderColor: colors.borderLight },
        ]}
      >
        <Icon source={icon} size={16} color={colors.textSecondary} />
        <Text style={[styles.text, { color: colors.textSecondary }]}>{tempLabel}</Text>
      </Pressable>
      <WeatherDetailModal
        visible={modalVisible}
        onDismiss={() => setModalVisible(false)}
        coords={coords}
      />
    </>
  );
}

const styles = StyleSheet.create({
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: borderRadius.full,
    borderWidth: 1,
    minHeight: 32,
  },
  text: {
    ...typography.small,
    fontWeight: '700',
  },
});
```

### Step 4: Run the tests; confirm they all pass

- [ ] Run: `pnpm test src/screens/home/components/HeaderWeatherChip.test.tsx`
- [ ] Expected: all 4 tests pass

### Step 5: Commit

- [ ] Run:

```bash
git add src/screens/home/components/HeaderWeatherChip.tsx \
        src/screens/home/components/HeaderWeatherChip.test.tsx
git commit -m "feat(weather): make header chip tappable, open detail modal"
```

---

## Task 5: Full verification

### Step 1: Run the whole test suite

- [ ] Run: `pnpm test`
- [ ] Expected: all tests pass with no regressions. If something breaks, fix it before continuing.

### Step 2: Type-check

- [ ] Run: `pnpm type-check`
- [ ] Expected: no errors.

### Step 3: Lint

- [ ] Run: `pnpm lint`
- [ ] Expected: no errors. Auto-fix with `pnpm lint --fix` if available.

### Step 4: Manual smoke test

- [ ] Run: `npx expo start`
- [ ] Open the app on a simulator or device
- [ ] On the home screen, confirm the weather chip is visible (requires location permission already granted)
- [ ] Tap the chip → modal opens with header, both bucket cards, and 2 forecast rows
- [ ] Tap close button → modal dismisses
- [ ] Re-open → tap backdrop → modal dismisses
- [ ] On Android: re-open → press hardware back → modal dismisses
- [ ] (Optional) Disable network → re-open → confirm error state with retry button appears; re-enable network → tap retry → success state renders

### Step 5: Final commit (only if any fixups)

- [ ] If you fixed type/lint/test issues that emerged in steps 1-3, commit them:

```bash
git add -A
git commit -m "chore(weather): fix lint/type-check issues from detail modal"
```

---

## Self-Review Checklist (run before handing off)

- [ ] Spec coverage:
  - [ ] Aggregation rules (max/mean/sum/circular mean) → Task 1 tests + impl
  - [ ] `useDetailedDayForecast` shape (`today.morning`, `today.afternoon`, `today.summary`, `forecast`, `locationIso`, `fetchedAt`) → Task 2 impl
  - [ ] Past-bucket null behaviour → Task 2 tests `morningPassed`/`afternoonPassed`
  - [ ] Centered modal with backdrop dismiss + close button + Android back → Task 3 impl + tests
  - [ ] Loading skeleton, error retry, "Already passed" placeholder → Task 3 impl + tests
  - [ ] Reuse of `weatherCodeToIcon` for all icons → Task 3 imports
  - [ ] Sunrise/sunset use Material icons (`weather-sunset-up`/`weather-sunset-down`), not emoji → Task 3 `SunMeta`
  - [ ] `HeaderWeatherChip` becomes Pressable with `accessibilityHint` → Task 4
  - [ ] Theming via `useThemeColors()`, static tokens imported directly → all Task 3 + 4 code
- [ ] Type consistency: `BucketStats`, `DaySummary`, `DetailedForecast`, `Coords` names match across hook, util, modal, and tests.
- [ ] No placeholders / TBDs in any task.
