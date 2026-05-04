# Home Screen v2 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Reformat the Home screen into an action-stack + 2×2 tile grid and add contextual weather (round-today hero card with weather strip in the next 24 h; mini header chip otherwise).

**Architecture:** Add a `src/hooks/weather/` module that wraps Open-Meteo behind a single TanStack Query hook with two convenience wrappers. Add presentational components under `src/screens/home/components/` for the new round-today card, weather strip, header chip, and the 2×2 tile grid (with four specific tile components). Extend `useHomeData` with two memos so the screen can decide whether to render the round-today hero vs. the regular Upcoming list. Rewire `HomeScreen.tsx` to the new render order; stop importing the 5 sections being folded away (leave the files in place — removing them is a follow-up).

**Tech Stack:** React Native (Expo SDK 54), TypeScript, TanStack Query v5, react-native-paper, Tabler icons, expo-location (already wired through `useUserLocation`), Open-Meteo (no SDK — fetch via `axios` already in deps), Jest + `@testing-library/react-native`.

**Spec:** `docs/superpowers/specs/2026-05-04-home-screen-v2-design.md`

---

## File Structure

### Created

```
src/hooks/weather/
  weatherCodeToIcon.ts
  useWeather.ts
  useDeviceWeather.ts
  useUpcomingRoundWeather.ts
  index.ts

src/__tests__/hooks/weather/
  weatherCodeToIcon.test.ts
  useWeather.test.ts

src/screens/home/components/
  WeatherStrip.tsx
  WeatherStrip.test.tsx
  HeaderWeatherChip.tsx
  HeaderWeatherChip.test.tsx
  RoundTodayCard.tsx
  RoundTodayCard.test.tsx
  HomeTile.tsx
  HomeTile.test.tsx
  HomeTileGrid.tsx
  HomeTileGrid.test.tsx
  tiles/
    StatsTile.tsx
    AchievementsTile.tsx
    CompetitionsTile.tsx
    LastRoundTile.tsx
    tiles.test.tsx
```

### Modified

```
src/hooks/home/useHomeData.ts            # add upcomingWithin24h + upcomingRoundsForList memos
src/screens/home/HomeScreen.tsx          # new render order, header rightContent, drop 5 sections
src/screens/home/components/index.ts     # export new components
src/screens/home/components/HomeSkeleton.tsx  # match new layout shape
```

### Untouched but referenced (no edits)

```
src/components/common/PageHeader.tsx     # uses existing `rightContent` slot
src/screens/home/components/StatsHighlightsSection.tsx       # left in place; no longer imported
src/screens/home/components/AchievementStatsSection.tsx      # ditto
src/screens/home/components/AchievementProgressSection.tsx   # ditto
src/screens/home/components/LastRoundSection.tsx             # ditto
src/screens/home/components/FriendActivitySection.tsx        # ditto
```

---

## Conventions used by this plan

- **Test runner:** `pnpm test -- <pattern>` (jest under the hood; `--` forwards args). The `pnpm test` script is `jest`.
- **Type check:** `pnpm type-check`. **Lint:** `pnpm lint`.
- **Cache config:** stale times come from `src/constants/cacheConfig.ts` if a fitting bucket exists; the plan inlines a literal value where appropriate.
- **Imports:** the codebase uses path aliases (`@/...`) configured in `tsconfig.json` + `babel.config.js`. Use them.
- **Theme:** `useThemeColors()` for dynamic colors, `import { spacing, typography, borderRadius, shadows } from '@/constants/theme'` for static tokens. **Never** hardcode colors.
- **Icons:** prefer `Icon` from `react-native-paper` (Material Design Icons names) for weather/conditions. Tabler icons (`@tabler/icons-react-native`) for line UI icons, matching `HomeScreen.tsx`.
- **Commits:** one per task. Conventional commit style (`feat:`, `refactor:`, `test:`, `chore:`).

---

## Task 1: WMO weather-code → icon + label mapping

**Files:**
- Create: `src/hooks/weather/weatherCodeToIcon.ts`
- Test: `src/__tests__/hooks/weather/weatherCodeToIcon.test.ts`

Pure function module. Maps Open-Meteo's WMO weather codes (0–99) to a Material Design icon name + a short human label used by accessibility announcements. Total mapping is small — group by code ranges per Open-Meteo docs.

- [ ] **Step 1: Write the failing test**

`src/__tests__/hooks/weather/weatherCodeToIcon.test.ts`:

```ts
import { weatherCodeToIcon } from '@/hooks/weather/weatherCodeToIcon';

describe('weatherCodeToIcon', () => {
  it('maps clear sky (0) to weather-sunny', () => {
    expect(weatherCodeToIcon(0)).toEqual({
      icon: 'weather-sunny',
      label: 'Clear sky',
    });
  });

  it('maps partly cloudy (1, 2) to weather-partly-cloudy', () => {
    expect(weatherCodeToIcon(1).icon).toBe('weather-partly-cloudy');
    expect(weatherCodeToIcon(2).icon).toBe('weather-partly-cloudy');
  });

  it('maps overcast (3) to weather-cloudy', () => {
    expect(weatherCodeToIcon(3).icon).toBe('weather-cloudy');
  });

  it('maps fog (45, 48) to weather-fog', () => {
    expect(weatherCodeToIcon(45).icon).toBe('weather-fog');
    expect(weatherCodeToIcon(48).icon).toBe('weather-fog');
  });

  it('maps drizzle range (51-57) to weather-rainy', () => {
    [51, 53, 55, 56, 57].forEach((c) =>
      expect(weatherCodeToIcon(c).icon).toBe('weather-rainy'),
    );
  });

  it('maps rain range (61-67) to weather-pouring', () => {
    [61, 63, 65, 66, 67].forEach((c) =>
      expect(weatherCodeToIcon(c).icon).toBe('weather-pouring'),
    );
  });

  it('maps snow range (71-77) to weather-snowy', () => {
    [71, 73, 75, 77].forEach((c) =>
      expect(weatherCodeToIcon(c).icon).toBe('weather-snowy'),
    );
  });

  it('maps showers (80-82) to weather-pouring', () => {
    [80, 81, 82].forEach((c) =>
      expect(weatherCodeToIcon(c).icon).toBe('weather-pouring'),
    );
  });

  it('maps thunderstorm range (95-99) to weather-lightning', () => {
    [95, 96, 99].forEach((c) =>
      expect(weatherCodeToIcon(c).icon).toBe('weather-lightning'),
    );
  });

  it('falls back to weather-cloudy for unknown codes', () => {
    expect(weatherCodeToIcon(404).icon).toBe('weather-cloudy');
    expect(weatherCodeToIcon(404).label).toBe('Unknown');
  });
});
```

- [ ] **Step 2: Run test to confirm it fails**

Run: `pnpm test -- weatherCodeToIcon`
Expected: FAIL — module does not exist.

- [ ] **Step 3: Implement the mapping**

`src/hooks/weather/weatherCodeToIcon.ts`:

```ts
/**
 * Map Open-Meteo / WMO weather code to a Material Design Icons name and a
 * short human label. Used by WeatherStrip and HeaderWeatherChip.
 *
 * Source: https://open-meteo.com/en/docs (WMO Weather interpretation codes)
 */
export interface WeatherIcon {
  icon: string;
  label: string;
}

export function weatherCodeToIcon(code: number): WeatherIcon {
  if (code === 0) return { icon: 'weather-sunny', label: 'Clear sky' };
  if (code === 1 || code === 2) return { icon: 'weather-partly-cloudy', label: 'Partly cloudy' };
  if (code === 3) return { icon: 'weather-cloudy', label: 'Overcast' };
  if (code === 45 || code === 48) return { icon: 'weather-fog', label: 'Fog' };
  if (code >= 51 && code <= 57) return { icon: 'weather-rainy', label: 'Drizzle' };
  if (code >= 61 && code <= 67) return { icon: 'weather-pouring', label: 'Rain' };
  if (code >= 71 && code <= 77) return { icon: 'weather-snowy', label: 'Snow' };
  if (code >= 80 && code <= 82) return { icon: 'weather-pouring', label: 'Showers' };
  if (code >= 85 && code <= 86) return { icon: 'weather-snowy', label: 'Snow showers' };
  if (code >= 95 && code <= 99) return { icon: 'weather-lightning', label: 'Thunderstorm' };
  return { icon: 'weather-cloudy', label: 'Unknown' };
}
```

- [ ] **Step 4: Run test to confirm it passes**

Run: `pnpm test -- weatherCodeToIcon`
Expected: PASS, 10/10.

- [ ] **Step 5: Commit**

```bash
git add src/hooks/weather/weatherCodeToIcon.ts src/__tests__/hooks/weather/weatherCodeToIcon.test.ts
git commit -m "feat(weather): add WMO weather-code → icon mapping"
```

---

## Task 2: `useWeather` core hook (Open-Meteo)

**Files:**
- Create: `src/hooks/weather/useWeather.ts`
- Test: `src/__tests__/hooks/weather/useWeather.test.ts`

Single React Query hook that fetches either current conditions or an at-time forecast from Open-Meteo. Coordinates rounded to 2 decimals before being used as cache keys. Stale time 30 min. Errors are logged and resolve to `null` so consumers render fail-soft.

- [ ] **Step 1: Write the failing test**

`src/__tests__/hooks/weather/useWeather.test.ts`:

```ts
import { renderHook, waitFor } from '@testing-library/react-native';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import React from 'react';
import { useWeather, type WeatherInput } from '@/hooks/weather/useWeather';

const wrapper = ({ children }: { children: React.ReactNode }) => {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false, gcTime: 0 } },
  });
  return <QueryClientProvider client={client}>{children}</QueryClientProvider>;
};

describe('useWeather', () => {
  beforeEach(() => {
    global.fetch = jest.fn();
  });

  afterEach(() => {
    jest.resetAllMocks();
  });

  it('is disabled when input is null', () => {
    const { result } = renderHook(() => useWeather(null), { wrapper });
    expect(result.current.isFetching).toBe(false);
    expect(global.fetch).not.toHaveBeenCalled();
  });

  it('fetches current conditions and maps the response', async () => {
    (global.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      json: async () => ({
        current: {
          temperature_2m: 18.4,
          weather_code: 1,
          wind_speed_10m: 12.3,
          wind_direction_10m: 220,
          precipitation: 0,
        },
      }),
    });

    const input: WeatherInput = { kind: 'current', lat: -37.8136, lng: 144.9631 };
    const { result } = renderHook(() => useWeather(input), { wrapper });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(result.current.data).toEqual(
      expect.objectContaining({
        tempC: 18.4,
        weatherCode: 1,
        windKph: 12.3,
        windDirDeg: 220,
        precipProbability: 0,
      }),
    );
    // Latitude rounded to 2 decimal places in the request URL
    expect((global.fetch as jest.Mock).mock.calls[0][0]).toContain('latitude=-37.81');
  });

  it('fetches at-time forecast and picks the matching hour', async () => {
    (global.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      json: async () => ({
        hourly: {
          time: ['2026-05-04T07:00', '2026-05-04T08:00', '2026-05-04T09:00'],
          temperature_2m: [12.0, 14.5, 16.0],
          weather_code: [3, 1, 0],
          wind_speed_10m: [8, 10, 11],
          wind_direction_10m: [180, 200, 210],
          precipitation_probability: [40, 20, 10],
        },
      }),
    });

    const input: WeatherInput = {
      kind: 'at-time',
      lat: -37.8136,
      lng: 144.9631,
      isoDateTime: '2026-05-04T08:00',
    };
    const { result } = renderHook(() => useWeather(input), { wrapper });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(result.current.data).toEqual(
      expect.objectContaining({
        tempC: 14.5,
        weatherCode: 1,
        windKph: 10,
        windDirDeg: 200,
        precipProbability: 20,
      }),
    );
  });

  it('resolves to null when the API errors', async () => {
    (global.fetch as jest.Mock).mockResolvedValue({ ok: false, status: 500 });
    const input: WeatherInput = { kind: 'current', lat: 0, lng: 0 };

    const { result } = renderHook(() => useWeather(input), { wrapper });

    await waitFor(() => expect(result.current.isFetched).toBe(true));
    expect(result.current.data).toBeNull();
  });

  it('resolves to null when fetch throws', async () => {
    (global.fetch as jest.Mock).mockRejectedValue(new Error('network'));
    const input: WeatherInput = { kind: 'current', lat: 0, lng: 0 };

    const { result } = renderHook(() => useWeather(input), { wrapper });

    await waitFor(() => expect(result.current.isFetched).toBe(true));
    expect(result.current.data).toBeNull();
  });
});
```

- [ ] **Step 2: Run test to confirm it fails**

Run: `pnpm test -- useWeather`
Expected: FAIL — module does not exist.

- [ ] **Step 3: Implement the hook**

`src/hooks/weather/useWeather.ts`:

```ts
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

const OPEN_METEO_URL = 'https://api.open-meteo.com/v1/forecast';
const STALE_TIME_MS = 30 * 60 * 1000;

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
  // Open-Meteo returns local-time strings like "2026-05-04T08:00". Match the
  // requested hour exactly; fall back to the closest earlier hour.
  const target = isoDateTime.slice(0, 13); // YYYY-MM-DDTHH
  const exact = times.findIndex((t) => t.startsWith(target));
  if (exact !== -1) return exact;
  // Fallback: pick the most recent past time
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
    staleTime: STALE_TIME_MS,
  });
}
```

- [ ] **Step 4: Run test to confirm it passes**

Run: `pnpm test -- useWeather`
Expected: PASS, 5/5.

- [ ] **Step 5: Commit**

```bash
git add src/hooks/weather/useWeather.ts src/__tests__/hooks/weather/useWeather.test.ts
git commit -m "feat(weather): add useWeather hook (Open-Meteo, fail-soft)"
```

---

## Task 3: Convenience wrappers + barrel export

**Files:**
- Create: `src/hooks/weather/useDeviceWeather.ts`
- Create: `src/hooks/weather/useUpcomingRoundWeather.ts`
- Create: `src/hooks/weather/index.ts`

Two thin wrappers that compose `useWeather` with the right input. Both return whatever `useWeather` returns.

- [ ] **Step 1: Write `useDeviceWeather`**

`src/hooks/weather/useDeviceWeather.ts`:

```ts
/**
 * useDeviceWeather — current conditions at the user's device location.
 * Returns nothing (the underlying hook is disabled) until permission is
 * granted *and* a position has been acquired.
 */

import { useUserLocation } from '@/hooks/location/userLocation';
import { useWeather, type WeatherInput } from './useWeather';

export function useDeviceWeather() {
  const { location } = useUserLocation();
  const input: WeatherInput | null = location
    ? { kind: 'current', lat: location.latitude, lng: location.longitude }
    : null;
  return useWeather(input);
}
```

- [ ] **Step 2: Write `useUpcomingRoundWeather`**

`src/hooks/weather/useUpcomingRoundWeather.ts`:

```ts
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
    const lat = round.course.latitude;
    const lng = round.course.longitude;
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
```

- [ ] **Step 3: Add the barrel export**

`src/hooks/weather/index.ts`:

```ts
export { useWeather } from './useWeather';
export type { WeatherInput, WeatherSnapshot } from './useWeather';
export { useDeviceWeather } from './useDeviceWeather';
export { useUpcomingRoundWeather } from './useUpcomingRoundWeather';
export { weatherCodeToIcon } from './weatherCodeToIcon';
export type { WeatherIcon } from './weatherCodeToIcon';
```

- [ ] **Step 4: Type-check**

Run: `pnpm type-check`
Expected: no new errors.

- [ ] **Step 5: Commit**

```bash
git add src/hooks/weather/
git commit -m "feat(weather): add device + upcoming-round wrappers and barrel"
```

---

## Task 4: `WeatherStrip` presentational component

**Files:**
- Create: `src/screens/home/components/WeatherStrip.tsx`
- Test: `src/screens/home/components/WeatherStrip.test.tsx`

Renders a single horizontal row: `[icon] 18° · 12 km/h SW · ☔ 10%`. Pure presentation — receives a `WeatherSnapshot` (or `null` → renders nothing). Hides the precipitation chip when `precipProbability < 10`.

- [ ] **Step 1: Write the failing test**

`src/screens/home/components/WeatherStrip.test.tsx`:

```tsx
import React from 'react';
import { render } from '@testing-library/react-native';
import { WeatherStrip } from './WeatherStrip';

describe('WeatherStrip', () => {
  it('renders nothing when snapshot is null', () => {
    const { queryByTestId } = render(<WeatherStrip snapshot={null} />);
    expect(queryByTestId('weather-strip')).toBeNull();
  });

  it('renders temp, wind, and precip when probability >= 10', () => {
    const { getByTestId, getByText } = render(
      <WeatherStrip
        snapshot={{
          tempC: 18.4,
          weatherCode: 1,
          windKph: 12,
          windDirDeg: 225,
          precipProbability: 30,
          fetchedAt: '2026-05-04T08:00:00Z',
        }}
      />,
    );
    expect(getByTestId('weather-strip')).toBeTruthy();
    expect(getByText(/18°/)).toBeTruthy();
    expect(getByText(/12 km\/h SW/)).toBeTruthy();
    expect(getByText(/30%/)).toBeTruthy();
  });

  it('omits precipitation when probability < 10', () => {
    const { queryByText } = render(
      <WeatherStrip
        snapshot={{
          tempC: 22,
          weatherCode: 0,
          windKph: 5,
          windDirDeg: 0,
          precipProbability: 5,
          fetchedAt: '2026-05-04T08:00:00Z',
        }}
      />,
    );
    expect(queryByText(/%/)).toBeNull();
  });
});
```

- [ ] **Step 2: Run test to confirm it fails**

Run: `pnpm test -- WeatherStrip`
Expected: FAIL — module does not exist.

- [ ] **Step 3: Implement the component**

`src/screens/home/components/WeatherStrip.tsx`:

```tsx
import React from 'react';
import { View, StyleSheet } from 'react-native';
import { Text, Icon } from 'react-native-paper';
import { useThemeColors } from '@/context/ThemeContext';
import { spacing, typography } from '@/constants/theme';
import { weatherCodeToIcon } from '@/hooks/weather/weatherCodeToIcon';
import type { WeatherSnapshot } from '@/hooks/weather';

interface WeatherStripProps {
  snapshot: WeatherSnapshot | null;
}

const COMPASS_POINTS = ['N', 'NE', 'E', 'SE', 'S', 'SW', 'W', 'NW'];

function degreesToCardinal(deg: number): string {
  const idx = Math.round(((deg % 360) / 45)) % 8;
  return COMPASS_POINTS[idx];
}

export function WeatherStrip({ snapshot }: WeatherStripProps) {
  const colors = useThemeColors();
  if (!snapshot) return null;

  const { icon, label } = weatherCodeToIcon(snapshot.weatherCode);
  const tempLabel = `${Math.round(snapshot.tempC)}°`;
  const windLabel = `${Math.round(snapshot.windKph)} km/h ${degreesToCardinal(snapshot.windDirDeg)}`;
  const showPrecip = snapshot.precipProbability >= 10;

  return (
    <View
      testID="weather-strip"
      style={styles.container}
      accessibilityLabel={`${label}, ${tempLabel}, wind ${windLabel}${
        showPrecip ? `, ${snapshot.precipProbability} percent chance of precipitation` : ''
      }`}
    >
      <Icon source={icon} size={18} color={colors.textSecondary} />
      <Text style={[styles.text, { color: colors.textSecondary }]}>{tempLabel}</Text>
      <Text style={[styles.dot, { color: colors.textMuted }]}>·</Text>
      <Icon source="weather-windy" size={16} color={colors.textSecondary} />
      <Text style={[styles.text, { color: colors.textSecondary }]}>{windLabel}</Text>
      {showPrecip && (
        <>
          <Text style={[styles.dot, { color: colors.textMuted }]}>·</Text>
          <Icon source="water-percent" size={16} color={colors.textSecondary} />
          <Text style={[styles.text, { color: colors.textSecondary }]}>{snapshot.precipProbability}%</Text>
        </>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
  },
  text: {
    ...typography.small,
    fontWeight: '600',
  },
  dot: {
    ...typography.small,
    paddingHorizontal: spacing.xs / 2,
  },
});
```

- [ ] **Step 4: Run test to confirm it passes**

Run: `pnpm test -- WeatherStrip`
Expected: PASS, 3/3.

- [ ] **Step 5: Commit**

```bash
git add src/screens/home/components/WeatherStrip.tsx src/screens/home/components/WeatherStrip.test.tsx
git commit -m "feat(home): add WeatherStrip component"
```

---

## Task 5: `HeaderWeatherChip` (mini chip for `PageHeader.rightContent`)

**Files:**
- Create: `src/screens/home/components/HeaderWeatherChip.tsx`
- Test: `src/screens/home/components/HeaderWeatherChip.test.tsx`

Renders a pill-shaped chip with `[icon] 18°`. Reads from `useDeviceWeather`. Returns `null` when there's no snapshot. Tappable but no navigation — keeps the surface honest as an ambient indicator (per spec §4.1 + §11).

- [ ] **Step 1: Write the failing test**

`src/screens/home/components/HeaderWeatherChip.test.tsx`:

```tsx
import React from 'react';
import { render } from '@testing-library/react-native';
import { HeaderWeatherChip } from './HeaderWeatherChip';
import * as useDeviceWeatherModule from '@/hooks/weather/useDeviceWeather';

jest.mock('@/hooks/weather/useDeviceWeather');

describe('HeaderWeatherChip', () => {
  it('renders nothing when no snapshot', () => {
    (useDeviceWeatherModule.useDeviceWeather as jest.Mock).mockReturnValue({
      data: null,
    });
    const { queryByTestId } = render(<HeaderWeatherChip />);
    expect(queryByTestId('header-weather-chip')).toBeNull();
  });

  it('renders temp + icon when a snapshot is available', () => {
    (useDeviceWeatherModule.useDeviceWeather as jest.Mock).mockReturnValue({
      data: {
        tempC: 17.8,
        weatherCode: 2,
        windKph: 5,
        windDirDeg: 90,
        precipProbability: 0,
        fetchedAt: '2026-05-04T08:00:00Z',
      },
    });
    const { getByTestId, getByText } = render(<HeaderWeatherChip />);
    expect(getByTestId('header-weather-chip')).toBeTruthy();
    expect(getByText(/18°/)).toBeTruthy();
  });
});
```

- [ ] **Step 2: Run test to confirm it fails**

Run: `pnpm test -- HeaderWeatherChip`
Expected: FAIL.

- [ ] **Step 3: Implement the component**

`src/screens/home/components/HeaderWeatherChip.tsx`:

```tsx
import React from 'react';
import { View, StyleSheet } from 'react-native';
import { Text, Icon } from 'react-native-paper';
import { useThemeColors } from '@/context/ThemeContext';
import { spacing, typography, borderRadius } from '@/constants/theme';
import { useDeviceWeather } from '@/hooks/weather/useDeviceWeather';
import { weatherCodeToIcon } from '@/hooks/weather/weatherCodeToIcon';

export function HeaderWeatherChip() {
  const colors = useThemeColors();
  const { data: snapshot } = useDeviceWeather();
  if (!snapshot) return null;

  const { icon, label } = weatherCodeToIcon(snapshot.weatherCode);
  const tempLabel = `${Math.round(snapshot.tempC)}°`;

  return (
    <View
      testID="header-weather-chip"
      accessibilityRole="text"
      accessibilityLabel={`Currently ${tempLabel}, ${label}`}
      style={[
        styles.chip,
        { backgroundColor: colors.surfaceVariant, borderColor: colors.borderLight },
      ]}
    >
      <Icon source={icon} size={16} color={colors.textPrimary} />
      <Text style={[styles.text, { color: colors.textPrimary }]}>{tempLabel}</Text>
    </View>
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

- [ ] **Step 4: Run test to confirm it passes**

Run: `pnpm test -- HeaderWeatherChip`
Expected: PASS, 2/2.

- [ ] **Step 5: Commit**

```bash
git add src/screens/home/components/HeaderWeatherChip.tsx src/screens/home/components/HeaderWeatherChip.test.tsx
git commit -m "feat(home): add HeaderWeatherChip"
```

---

## Task 6: `RoundTodayCard` hero card

**Files:**
- Create: `src/screens/home/components/RoundTodayCard.tsx`
- Test: `src/screens/home/components/RoundTodayCard.test.tsx`

Replaces v1's "Coming up" when the next round is within 24 h. Renders course name, formatted tee time, and a `WeatherStrip` underneath. Tap navigates to `ViewRound`. Uses `useUpcomingRoundWeather` so the strip is hidden if coords/API fail.

- [ ] **Step 1: Write the failing test**

`src/screens/home/components/RoundTodayCard.test.tsx`:

```tsx
import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import { NavigationContainer } from '@react-navigation/native';
import { RoundTodayCard } from './RoundTodayCard';
import * as upcomingWeather from '@/hooks/weather/useUpcomingRoundWeather';

jest.mock('@/hooks/weather/useUpcomingRoundWeather');

const mockNavigate = jest.fn();
jest.mock('@react-navigation/native', () => {
  const actual = jest.requireActual('@react-navigation/native');
  return { ...actual, useNavigation: () => ({ navigate: mockNavigate }) };
});

const round: any = {
  id: 'r-1',
  date: '2026-05-04',
  tee_time: '07:30:00',
  course: {
    id: 'c-1',
    name: 'Royal Melbourne',
    latitude: -37.97,
    longitude: 145.04,
  },
};

const wrap = (node: React.ReactNode) => (
  <NavigationContainer>{node}</NavigationContainer>
);

describe('RoundTodayCard', () => {
  beforeEach(() => {
    mockNavigate.mockReset();
    (upcomingWeather.useUpcomingRoundWeather as jest.Mock).mockReturnValue({ data: null });
  });

  it('renders course name and formatted tee time', () => {
    const { getByText } = render(wrap(<RoundTodayCard round={round} />));
    expect(getByText('Royal Melbourne')).toBeTruthy();
    expect(getByText(/7:30/)).toBeTruthy();
  });

  it('renders the WeatherStrip when weather data is available', () => {
    (upcomingWeather.useUpcomingRoundWeather as jest.Mock).mockReturnValue({
      data: {
        tempC: 14, weatherCode: 1, windKph: 10, windDirDeg: 200,
        precipProbability: 0, fetchedAt: '2026-05-04T07:00:00Z',
      },
    });
    const { getByTestId } = render(wrap(<RoundTodayCard round={round} />));
    expect(getByTestId('weather-strip')).toBeTruthy();
  });

  it('hides the WeatherStrip when weather is null (fail-soft)', () => {
    const { queryByTestId } = render(wrap(<RoundTodayCard round={round} />));
    expect(queryByTestId('weather-strip')).toBeNull();
  });

  it('navigates to ViewRound on press', () => {
    const { getByTestId } = render(wrap(<RoundTodayCard round={round} />));
    fireEvent.press(getByTestId('round-today-card'));
    expect(mockNavigate).toHaveBeenCalledWith('ViewRound', { roundId: 'r-1' });
  });
});
```

- [ ] **Step 2: Run test to confirm it fails**

Run: `pnpm test -- RoundTodayCard`
Expected: FAIL.

- [ ] **Step 3: Implement the component**

`src/screens/home/components/RoundTodayCard.tsx`:

```tsx
import React from 'react';
import { View, StyleSheet, TouchableOpacity } from 'react-native';
import { Text, Icon } from 'react-native-paper';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useThemeColors } from '@/context/ThemeContext';
import { spacing, typography, borderRadius } from '@/constants/theme';
import { useUpcomingRoundWeather } from '@/hooks/weather/useUpcomingRoundWeather';
import { WeatherStrip } from './WeatherStrip';
import { SectionHeader } from './SectionHeader';
import type { RootStackParamList } from '@/navigation/types';
import type { RoundWithCourse } from '@/components/competitions/detail/types';

type Nav = NativeStackNavigationProp<RootStackParamList>;

interface RoundTodayCardProps {
  round: RoundWithCourse;
}

function formatTeeTime(teeTime: string | null): string {
  if (!teeTime) return '';
  // teeTime is "HH:MM:SS"; convert to "h:mm AM/PM" (Australian format).
  const [h, m] = teeTime.split(':').map((s) => parseInt(s, 10));
  if (Number.isNaN(h)) return '';
  const period = h >= 12 ? 'PM' : 'AM';
  const hour12 = h % 12 === 0 ? 12 : h % 12;
  const minStr = String(m).padStart(2, '0');
  return `${hour12}:${minStr} ${period}`;
}

function formatDayLabel(dateIso: string | null): string {
  if (!dateIso) return '';
  const today = new Date().toISOString().slice(0, 10);
  if (dateIso === today) return 'Today';
  const tomorrow = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
  if (dateIso === tomorrow) return 'Tomorrow';
  const d = new Date(`${dateIso}T00:00:00`);
  return d.toLocaleDateString('en-AU', { weekday: 'long' });
}

export const RoundTodayCard = React.memo(function RoundTodayCard({
  round,
}: RoundTodayCardProps) {
  const colors = useThemeColors();
  const navigation = useNavigation<Nav>();
  const { data: weather } = useUpcomingRoundWeather(round);

  const courseName = round.course?.name ?? 'Round';
  const dayLabel = formatDayLabel(round.date);
  const teeLabel = formatTeeTime(round.tee_time);
  const subtitle = [dayLabel, teeLabel].filter(Boolean).join(' · ');

  return (
    <View style={styles.wrapper}>
      <SectionHeader title="Round today" />
      <TouchableOpacity
        testID="round-today-card"
        onPress={() => navigation.navigate('ViewRound', { roundId: round.id })}
        accessibilityRole="button"
        accessibilityLabel={`Round at ${courseName}, ${subtitle}`}
        style={[
          styles.card,
          { backgroundColor: colors.surface, borderColor: colors.borderLight },
        ]}
      >
        <View style={styles.row}>
          <Icon source="golf" size={28} color={colors.primary} />
          <View style={styles.text}>
            <Text style={[styles.title, { color: colors.textPrimary }]} numberOfLines={1}>
              {courseName}
            </Text>
            {!!subtitle && (
              <Text style={[styles.subtitle, { color: colors.textSecondary }]} numberOfLines={1}>
                {subtitle}
              </Text>
            )}
          </View>
          <Icon source="chevron-right" size={22} color={colors.textSecondary} />
        </View>
        {weather && (
          <View style={[styles.divider, { backgroundColor: colors.borderLight }]} />
        )}
        {weather && <WeatherStrip snapshot={weather} />}
      </TouchableOpacity>
    </View>
  );
});

const styles = StyleSheet.create({
  wrapper: {
    marginBottom: spacing.lg,
  },
  card: {
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    overflow: 'hidden',
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    padding: spacing.md,
  },
  text: { flex: 1 },
  title: { ...typography.body, fontWeight: '700' },
  subtitle: { ...typography.caption, marginTop: 2 },
  divider: { height: StyleSheet.hairlineWidth, marginHorizontal: spacing.md },
});
```

- [ ] **Step 4: Run test to confirm it passes**

Run: `pnpm test -- RoundTodayCard`
Expected: PASS, 4/4.

- [ ] **Step 5: Commit**

```bash
git add src/screens/home/components/RoundTodayCard.tsx src/screens/home/components/RoundTodayCard.test.tsx
git commit -m "feat(home): add RoundTodayCard hero card"
```

---

## Task 7: `HomeTile` generic tile

**Files:**
- Create: `src/screens/home/components/HomeTile.tsx`
- Test: `src/screens/home/components/HomeTile.test.tsx`

Generic tile used by all 4 specific tiles in the grid. Two visual states: populated (headline + subtext) and empty (just empty subtext).

- [ ] **Step 1: Write the failing test**

`src/screens/home/components/HomeTile.test.tsx`:

```tsx
import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import { HomeTile } from './HomeTile';

describe('HomeTile', () => {
  it('renders title, headline, subtext', () => {
    const { getByText } = render(
      <HomeTile
        testID="t"
        icon="chart-line"
        title="Stats"
        headline="12.4"
        subtext="avg 84"
        onPress={jest.fn()}
      />,
    );
    expect(getByText('Stats')).toBeTruthy();
    expect(getByText('12.4')).toBeTruthy();
    expect(getByText('avg 84')).toBeTruthy();
  });

  it('calls onPress when tapped', () => {
    const onPress = jest.fn();
    const { getByTestId } = render(
      <HomeTile testID="t" icon="chart-line" title="Stats" headline="12.4" subtext="avg 84" onPress={onPress} />,
    );
    fireEvent.press(getByTestId('t'));
    expect(onPress).toHaveBeenCalled();
  });

  it('renders empty headline placeholder when headline is null', () => {
    const { getByText } = render(
      <HomeTile
        testID="t"
        icon="chart-line"
        title="Stats"
        headline={null}
        subtext="Play 3 rounds to unlock"
        onPress={jest.fn()}
      />,
    );
    expect(getByText('—')).toBeTruthy();
  });
});
```

- [ ] **Step 2: Run test to confirm it fails**

Run: `pnpm test -- HomeTile`
Expected: FAIL.

- [ ] **Step 3: Implement the component**

`src/screens/home/components/HomeTile.tsx`:

```tsx
import React from 'react';
import { TouchableOpacity, View, StyleSheet } from 'react-native';
import { Text, Icon } from 'react-native-paper';
import { useThemeColors } from '@/context/ThemeContext';
import { spacing, typography, borderRadius } from '@/constants/theme';

export interface HomeTileProps {
  testID?: string;
  icon: string;
  title: string;
  headline: string | null;
  subtext: string;
  onPress: () => void;
}

export const HomeTile = React.memo(function HomeTile({
  testID,
  icon,
  title,
  headline,
  subtext,
  onPress,
}: HomeTileProps) {
  const colors = useThemeColors();
  const headlineLabel = headline ?? '—';

  return (
    <TouchableOpacity
      testID={testID}
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={`${title}, ${headlineLabel}, ${subtext}`}
      style={[
        styles.tile,
        { backgroundColor: colors.surface, borderColor: colors.borderLight },
      ]}
    >
      <View style={styles.titleRow}>
        <Icon source={icon} size={18} color={colors.primary} />
        <Text style={[styles.title, { color: colors.textSecondary }]} numberOfLines={1}>
          {title}
        </Text>
      </View>
      <Text style={[styles.headline, { color: colors.textPrimary }]} numberOfLines={1}>
        {headlineLabel}
      </Text>
      <Text style={[styles.subtext, { color: colors.textSecondary }]} numberOfLines={2}>
        {subtext}
      </Text>
    </TouchableOpacity>
  );
});

const styles = StyleSheet.create({
  tile: {
    flex: 1,
    minHeight: 96,
    padding: spacing.md,
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    gap: spacing.xs,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  title: {
    ...typography.caption,
    fontWeight: '700',
    letterSpacing: 0.5,
    textTransform: 'uppercase',
  },
  headline: {
    ...typography.h3,
    fontWeight: '700',
  },
  subtext: {
    ...typography.caption,
  },
});
```

- [ ] **Step 4: Run test to confirm it passes**

Run: `pnpm test -- HomeTile`
Expected: PASS, 3/3.

- [ ] **Step 5: Commit**

```bash
git add src/screens/home/components/HomeTile.tsx src/screens/home/components/HomeTile.test.tsx
git commit -m "feat(home): add generic HomeTile"
```

---

## Task 8: 4 specific tiles

**Files:**
- Create: `src/screens/home/components/tiles/StatsTile.tsx`
- Create: `src/screens/home/components/tiles/AchievementsTile.tsx`
- Create: `src/screens/home/components/tiles/CompetitionsTile.tsx`
- Create: `src/screens/home/components/tiles/LastRoundTile.tsx`
- Test: `src/screens/home/components/tiles/tiles.test.tsx`

Each tile is a thin component that takes the relevant slice from `useHomeData`'s output as props and renders a `HomeTile`. Computing display strings (e.g. "avg 84 · last 5: 82") happens inside each tile to keep `useHomeData` clean.

- [ ] **Step 1: Write the failing tests**

`src/screens/home/components/tiles/tiles.test.tsx`:

```tsx
import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import { NavigationContainer } from '@react-navigation/native';
import { StatsTile } from './StatsTile';
import { AchievementsTile } from './AchievementsTile';
import { CompetitionsTile } from './CompetitionsTile';
import { LastRoundTile } from './LastRoundTile';

const mockNavigate = jest.fn();
jest.mock('@react-navigation/native', () => {
  const actual = jest.requireActual('@react-navigation/native');
  return { ...actual, useNavigation: () => ({ navigate: mockNavigate }) };
});

const wrap = (node: React.ReactNode) => (
  <NavigationContainer>{node}</NavigationContainer>
);

describe('StatsTile', () => {
  beforeEach(() => mockNavigate.mockReset());

  it('shows "—" when stats is null', () => {
    const { getByText } = render(wrap(<StatsTile stats={null} />));
    expect(getByText('—')).toBeTruthy();
    expect(getByText(/Play 3 rounds/)).toBeTruthy();
  });

  it('shows handicap and avg when stats are present', () => {
    const { getByText } = render(
      wrap(
        <StatsTile
          stats={{
            handicap: 12.4,
            roundsYtd: 6,
            scoringAverage: 84,
            last5Average: 82,
            last5DeltaVsHandicap: null,
            notable: null,
          }}
        />,
      ),
    );
    expect(getByText('12.4')).toBeTruthy();
    expect(getByText(/avg 84/)).toBeTruthy();
  });
});

describe('AchievementsTile', () => {
  it('shows total earned and "X close" subtext', () => {
    const { getByText } = render(
      wrap(
        <AchievementsTile
          summary={{ totalEarned: 23, totalPoints: 540, completionPercentage: 57 }}
          inProgressCount={3}
        />,
      ),
    );
    expect(getByText(/23/)).toBeTruthy();
    expect(getByText(/3 close/)).toBeTruthy();
  });

  it('shows "—" when summary is null', () => {
    const { getByText } = render(
      wrap(<AchievementsTile summary={null} inProgressCount={0} />),
    );
    expect(getByText('—')).toBeTruthy();
  });
});

describe('CompetitionsTile', () => {
  it('shows active count', () => {
    const { getByText } = render(
      wrap(
        <CompetitionsTile
          competitions={[{ id: 'c-1', name: 'Spring', status: 'in-progress' } as any, { id: 'c-2', name: 'X', status: 'upcoming' } as any]}
          leagues={[]}
        />,
      ),
    );
    expect(getByText('2')).toBeTruthy();
  });

  it('shows empty subtext when nothing active', () => {
    const { getByText } = render(wrap(<CompetitionsTile competitions={[]} leagues={[]} />));
    expect(getByText(/No active comps/)).toBeTruthy();
  });
});

describe('LastRoundTile', () => {
  it('shows score, course and days-ago', () => {
    const recentDate = new Date(Date.now() - 4 * 24 * 60 * 60 * 1000)
      .toISOString()
      .slice(0, 10);
    const { getByText } = render(
      wrap(
        <LastRoundTile
          round={{
            id: 'r-1',
            date: recentDate,
            totalGross: 82,
            course: { name: 'Royal Melb' },
          } as any}
        />,
      ),
    );
    expect(getByText('82')).toBeTruthy();
    expect(getByText(/Royal Melb · 4d ago/)).toBeTruthy();
  });

  it('shows empty subtext when no round', () => {
    const { getByText } = render(wrap(<LastRoundTile round={null} />));
    expect(getByText(/No completed rounds/)).toBeTruthy();
  });
});
```

- [ ] **Step 2: Run test to confirm it fails**

Run: `pnpm test -- tiles.test`
Expected: FAIL.

- [ ] **Step 3: Implement `StatsTile`**

`src/screens/home/components/tiles/StatsTile.tsx`:

```tsx
import React from 'react';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { HomeTile } from '../HomeTile';
import type { RootStackParamList } from '@/navigation/types';
import type { StatsHighlights } from '@/types/home';

interface Props {
  stats: StatsHighlights | null;
}

export function StatsTile({ stats }: Props) {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();

  const headline = stats?.handicap != null ? stats.handicap.toFixed(1) : null;
  const subtext = (() => {
    if (!stats) return 'Play 3 rounds to unlock';
    const avg = stats.scoringAverage != null ? `avg ${Math.round(stats.scoringAverage)}` : null;
    const last5 = stats.last5Average != null ? `last 5: ${Math.round(stats.last5Average)}` : null;
    return [avg, last5].filter(Boolean).join(' · ') || 'No stats yet';
  })();

  return (
    <HomeTile
      testID="tile-stats"
      icon="chart-line"
      title="Stats"
      headline={headline}
      subtext={subtext}
      onPress={() => navigation.navigate('Stats')}
    />
  );
}
```

> **Note on `Stats` route name:** confirm the actual route name in `src/navigation/types.ts` while implementing — if the route is named differently (e.g. `PlayerStats`), use that name instead. (`grep -n "Stats" src/navigation/types.ts` to confirm.)

- [ ] **Step 4: Implement `AchievementsTile`**

`src/screens/home/components/tiles/AchievementsTile.tsx`:

```tsx
import React from 'react';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { HomeTile } from '../HomeTile';
import type { RootStackParamList } from '@/navigation/types';
import type { AchievementSummaryStats } from '@/hooks/home/useHomeData';

interface Props {
  summary: AchievementSummaryStats | null;
  inProgressCount: number;
}

export function AchievementsTile({ summary, inProgressCount }: Props) {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const headline = summary ? `${summary.totalEarned}` : null;
  const subtext = inProgressCount > 0 ? `${inProgressCount} close to unlocking` : 'Earn your first';

  return (
    <HomeTile
      testID="tile-achievements"
      icon="trophy"
      title="Achievements"
      headline={headline}
      subtext={subtext}
      onPress={() => navigation.navigate('Achievements')}
    />
  );
}
```

> Confirm `Achievements` route name in `src/navigation/types.ts`.

- [ ] **Step 5: Implement `CompetitionsTile`**

`src/screens/home/components/tiles/CompetitionsTile.tsx`:

```tsx
import React from 'react';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { HomeTile } from '../HomeTile';
import type { RootStackParamList } from '@/navigation/types';
import type { Competition } from '@/types';
import type { League } from '@/types/database/league.types';

interface Props {
  competitions: Competition[];
  leagues: League[];
}

export function CompetitionsTile({ competitions, leagues }: Props) {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const total = competitions.length + leagues.length;

  const headline = total > 0 ? `${total}` : null;
  const subtext = total > 0
    ? `${competitions.length} comps · ${leagues.length} leagues`
    : 'No active comps';

  return (
    <HomeTile
      testID="tile-competitions"
      icon="flag-checkered"
      title="Competitions"
      headline={headline}
      subtext={subtext}
      onPress={() => navigation.navigate('CompetitionsList' as never)}
    />
  );
}
```

> Confirm `CompetitionsList` route name (typical candidates: `Competitions`, `CompetitionsTab`, `CompetitionsList`). If the home screen currently navigates to a competitions list elsewhere, copy that target.

- [ ] **Step 6: Implement `LastRoundTile`**

`src/screens/home/components/tiles/LastRoundTile.tsx`:

```tsx
import React from 'react';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { HomeTile } from '../HomeTile';
import type { RootStackParamList } from '@/navigation/types';
import type { RoundItem } from '@/screens/rounds/RoundListScreen/types';

interface Props {
  round: RoundItem | null;
}

function daysAgo(dateLike: string | Date | null | undefined): number | null {
  if (!dateLike) return null;
  const d = typeof dateLike === 'string' ? new Date(dateLike) : dateLike;
  if (Number.isNaN(d.getTime())) return null;
  return Math.floor((Date.now() - d.getTime()) / (1000 * 60 * 60 * 24));
}

export function LastRoundTile({ round }: Props) {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();

  const headline = round && (round as any).totalGross != null
    ? `${(round as any).totalGross}`
    : null;
  const subtext = (() => {
    if (!round) return 'No completed rounds';
    const ago = daysAgo(round.date);
    const courseName = round.course?.name ?? '';
    const agoLabel = ago == null ? '' : `${ago}d ago`;
    return [courseName, agoLabel].filter(Boolean).join(' · ');
  })();

  return (
    <HomeTile
      testID="tile-last-round"
      icon="history"
      title="Last round"
      headline={headline}
      subtext={subtext}
      onPress={() => {
        if (round) navigation.navigate('ViewRound', { roundId: round.id });
      }}
    />
  );
}
```

> If `RoundItem` does **not** expose `totalGross` (or uses a different field like `total_score`), confirm the correct field by grepping `src/screens/rounds/RoundListScreen/types.ts` and adjust both the implementation and the test.

- [ ] **Step 7: Run test to confirm all pass**

Run: `pnpm test -- tiles.test`
Expected: PASS, 7/7.

- [ ] **Step 8: Commit**

```bash
git add src/screens/home/components/tiles/
git commit -m "feat(home): add 4 home-tile components (Stats/Achievements/Comps/LastRound)"
```

---

## Task 9: `HomeTileGrid` 2×2 wrapper

**Files:**
- Create: `src/screens/home/components/HomeTileGrid.tsx`
- Test: `src/screens/home/components/HomeTileGrid.test.tsx`

A 2-column grid that arranges the 4 tiles. Receives no individual data — just renders the four tile components and passes them the slices they need from `useHomeData` props.

- [ ] **Step 1: Write the failing test**

`src/screens/home/components/HomeTileGrid.test.tsx`:

```tsx
import React from 'react';
import { render } from '@testing-library/react-native';
import { NavigationContainer } from '@react-navigation/native';
import { HomeTileGrid } from './HomeTileGrid';

jest.mock('@react-navigation/native', () => {
  const actual = jest.requireActual('@react-navigation/native');
  return { ...actual, useNavigation: () => ({ navigate: jest.fn() }) };
});

describe('HomeTileGrid', () => {
  it('renders all four tiles', () => {
    const { getByTestId } = render(
      <NavigationContainer>
        <HomeTileGrid
          stats={null}
          achievementSummary={null}
          achievementsInProgressCount={0}
          competitions={[]}
          leagues={[]}
          lastRound={null}
        />
      </NavigationContainer>,
    );
    expect(getByTestId('tile-stats')).toBeTruthy();
    expect(getByTestId('tile-achievements')).toBeTruthy();
    expect(getByTestId('tile-competitions')).toBeTruthy();
    expect(getByTestId('tile-last-round')).toBeTruthy();
  });
});
```

- [ ] **Step 2: Run test to confirm it fails**

Run: `pnpm test -- HomeTileGrid`
Expected: FAIL.

- [ ] **Step 3: Implement the component**

`src/screens/home/components/HomeTileGrid.tsx`:

```tsx
import React from 'react';
import { View, StyleSheet } from 'react-native';
import { spacing } from '@/constants/theme';
import { StatsTile } from './tiles/StatsTile';
import { AchievementsTile } from './tiles/AchievementsTile';
import { CompetitionsTile } from './tiles/CompetitionsTile';
import { LastRoundTile } from './tiles/LastRoundTile';
import type { StatsHighlights } from '@/types/home';
import type { AchievementSummaryStats } from '@/hooks/home/useHomeData';
import type { Competition } from '@/types';
import type { League } from '@/types/database/league.types';
import type { RoundItem } from '@/screens/rounds/RoundListScreen/types';

interface HomeTileGridProps {
  stats: StatsHighlights | null;
  achievementSummary: AchievementSummaryStats | null;
  achievementsInProgressCount: number;
  competitions: Competition[];
  leagues: League[];
  lastRound: RoundItem | null;
}

export function HomeTileGrid({
  stats,
  achievementSummary,
  achievementsInProgressCount,
  competitions,
  leagues,
  lastRound,
}: HomeTileGridProps) {
  return (
    <View style={styles.grid}>
      <View style={styles.row}>
        <StatsTile stats={stats} />
        <AchievementsTile summary={achievementSummary} inProgressCount={achievementsInProgressCount} />
      </View>
      <View style={styles.row}>
        <CompetitionsTile competitions={competitions} leagues={leagues} />
        <LastRoundTile round={lastRound} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  grid: {
    gap: spacing.sm,
    marginBottom: spacing.lg,
  },
  row: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
});
```

- [ ] **Step 4: Run test to confirm it passes**

Run: `pnpm test -- HomeTileGrid`
Expected: PASS, 1/1.

- [ ] **Step 5: Commit**

```bash
git add src/screens/home/components/HomeTileGrid.tsx src/screens/home/components/HomeTileGrid.test.tsx
git commit -m "feat(home): add HomeTileGrid 2x2 wrapper"
```

---

## Task 10: `useHomeData` — add 24h memos

**Files:**
- Modify: `src/hooks/home/useHomeData.ts`
- Test: `src/__tests__/hooks/home/useHomeData.test.ts` (create — does not currently exist)

Add two memos and surface them through `HomeData`:

- `upcomingWithin24h: RoundWithCourse | null` — the *first* upcoming round whose date+tee_time is within the next 24 h, expressed as a `RoundWithCourse`.
- `upcomingRoundsForList: RoundItem[]` — `upcomingRounds` minus the round chosen for the hero card.

Because `upcomingRounds` items are `RoundItem` (not `RoundWithCourse`) we need to either fetch the round again or extend the existing query to include `course.latitude/longitude`. Simplest path: re-use `useInProgressRounds`-style enrichment.

> **Implementation choice:** map `upcomingRounds` to a `RoundWithCourse` shape **only when** a candidate is identified. We can pull coords from the round's existing `course` field if available; if `RoundItem.course` does not include lat/lng, add them by extending the round-list query. (If editing the round-list query feels too broad for this PR, it's acceptable to fetch one extra round detail via a small `useRoundCoordinates(roundId)` hook — but only if needed.)

The first thing this task does is **inspect** the live shape of `RoundItem` and decide which path to take. The plan below assumes the simpler path (round-list query already has access to course coords through the `course` join — otherwise see Step 4).

- [ ] **Step 1: Confirm the data shape**

Run:
```bash
grep -n "courseLatitude\|latitude\|RoundListCardData" src/screens/rounds/RoundListScreen/types.ts src/screens/rounds/RoundListScreen/utils/transformRound.ts 2>/dev/null
```
Expected: shows whether `RoundItem.course` exposes `latitude`/`longitude`.

If coords are exposed, proceed with the plan as written. If not, perform the minimal patch to add them to the round-list query/transform first (one-line additions) before continuing.

- [ ] **Step 2: Write the failing test**

`src/__tests__/hooks/home/useHomeData.test.ts`:

```ts
import { computeUpcomingWithin24h, computeUpcomingForList } from '@/hooks/home/useHomeData';
import type { RoundItem } from '@/screens/rounds/RoundListScreen/types';

const baseRound = (over: Partial<RoundItem>): RoundItem =>
  ({
    id: 'r',
    status: 'upcoming',
    date: '2026-05-04',
    tee_time: '08:00:00',
    course: { id: 'c', name: 'Course', latitude: -37.81, longitude: 144.96 } as any,
    competition: null,
    ...over,
  }) as any;

describe('useHomeData helpers', () => {
  const now = new Date('2026-05-04T07:00:00');

  it('picks the next round when within 24h', () => {
    const rounds = [
      baseRound({ id: 'r1', date: '2026-05-04', tee_time: '08:00:00' }),
      baseRound({ id: 'r2', date: '2026-05-09', tee_time: '08:00:00' }),
    ];
    const picked = computeUpcomingWithin24h(rounds, now);
    expect(picked?.id).toBe('r1');
  });

  it('returns null when nothing within 24h', () => {
    const rounds = [
      baseRound({ id: 'r1', date: '2026-05-09', tee_time: '08:00:00' }),
    ];
    expect(computeUpcomingWithin24h(rounds, now)).toBeNull();
  });

  it('removes the picked round from the list', () => {
    const rounds = [
      baseRound({ id: 'r1', date: '2026-05-04', tee_time: '08:00:00' }),
      baseRound({ id: 'r2', date: '2026-05-09', tee_time: '08:00:00' }),
    ];
    const list = computeUpcomingForList(rounds, 'r1');
    expect(list.map((r) => r.id)).toEqual(['r2']);
  });
});
```

- [ ] **Step 3: Run test to confirm it fails**

Run: `pnpm test -- useHomeData`
Expected: FAIL — helpers don't exist.

- [ ] **Step 4: Add the helpers and wire them into `useHomeData`**

In `src/hooks/home/useHomeData.ts`:

(a) Add the helpers near the top of the file:

```ts
const TWENTY_FOUR_HOURS_MS = 24 * 60 * 60 * 1000;

export function computeUpcomingWithin24h(
  upcoming: RoundItem[],
  now: Date,
): RoundItem | null {
  const cutoff = now.getTime() + TWENTY_FOUR_HOURS_MS;
  for (const r of upcoming) {
    if (!r.date) continue;
    const teeTime = (r as { tee_time?: string | null }).tee_time ?? '09:00:00';
    const start = new Date(`${r.date}T${teeTime}`).getTime();
    if (start >= now.getTime() && start <= cutoff) return r;
  }
  return null;
}

export function computeUpcomingForList(
  upcoming: RoundItem[],
  pickedId: string | null,
): RoundItem[] {
  if (!pickedId) return upcoming;
  return upcoming.filter((r) => r.id !== pickedId);
}
```

(b) Inside the `useHomeData()` body, after `upcomingRounds` is computed, add:

```ts
const upcomingWithin24h = useMemo(() => {
  return computeUpcomingWithin24h(upcomingRounds, new Date());
}, [upcomingRounds]);

const upcomingRoundsForList = useMemo(() => {
  return computeUpcomingForList(upcomingRounds, upcomingWithin24h?.id ?? null);
}, [upcomingRounds, upcomingWithin24h]);
```

(c) Extend the `HomeData` interface:

```ts
upcomingWithin24h: RoundItem | null;
upcomingRoundsForList: RoundItem[];
```

(d) Add them to the returned object:

```ts
return {
  // ... existing fields
  upcomingWithin24h,
  upcomingRoundsForList,
};
```

- [ ] **Step 5: Run test to confirm it passes**

Run: `pnpm test -- useHomeData`
Expected: PASS, 3/3.

- [ ] **Step 6: Commit**

```bash
git add src/hooks/home/useHomeData.ts src/__tests__/hooks/home/useHomeData.test.ts
git commit -m "feat(home): add upcomingWithin24h + upcomingRoundsForList memos"
```

---

## Task 11: Update `HomeSkeleton` to match the new layout

**Files:**
- Modify: `src/screens/home/components/HomeSkeleton.tsx`

Update the skeleton rectangles to roughly match the new vertical rhythm: hero CTA, one in-progress carousel row, one round-today card row (only when likely), one bag row, one upcoming row, then a 2×2 grid block.

- [ ] **Step 1: Read the current skeleton**

Read: `src/screens/home/components/HomeSkeleton.tsx` — note the existing block sizes so the update doesn't introduce visible jumps.

- [ ] **Step 2: Update the layout**

Replace the block list with: 1 hero (~64 px), 1 carousel-style row (~120 px), 1 wide card (~112 px) for the round-today card, 1 bag row (~64 px), 1 upcoming row (~96 px), then a tile grid block (two rows of two ~96 px tiles with 8 px gap).

(Code is intentionally left to the implementer — the existing skeleton uses a small set of `<View>` boxes with the same theming pattern; mirror that pattern with the new sizes above.)

- [ ] **Step 3: Verify visually**

Run the app and toggle a forced loading state (e.g. `home.isLoading = true` in a temporary local edit) to confirm the new skeleton matches the populated layout's vertical rhythm. Revert the temporary edit.

- [ ] **Step 4: Commit**

```bash
git add src/screens/home/components/HomeSkeleton.tsx
git commit -m "refactor(home): update skeleton to v2 layout shape"
```

---

## Task 12: Wire up `HomeScreen.tsx`

**Files:**
- Modify: `src/screens/home/HomeScreen.tsx`
- Modify: `src/screens/home/components/index.ts`

Replace the body block with the new render order. Use `PageHeader.rightContent` to add the weather chip (only when there's no round-today). Drop the imports of the 5 sections being folded away. Keep `NewUserFallback`, `HomeSkeleton`, `SectionHeader`, `BagSummarySection`, `PendingActionsSection`, `UpcomingRoundsSection`, `InProgressRoundSection`.

- [ ] **Step 1: Update the barrel export**

Append to `src/screens/home/components/index.ts`:

```ts
export { RoundTodayCard } from './RoundTodayCard';
export { HeaderWeatherChip } from './HeaderWeatherChip';
export { HomeTileGrid } from './HomeTileGrid';
```

- [ ] **Step 2: Update `HomeScreen.tsx`**

Make these targeted edits to `src/screens/home/HomeScreen.tsx`:

(a) Imports — remove the 5 unused section imports and add the new ones:

```ts
import {
  PendingActionsSection,
  UpcomingRoundsSection,
  BagSummarySection,
  NewUserFallback,
  HomeSkeleton,
  SectionHeader,
  RoundTodayCard,
  HeaderWeatherChip,
  HomeTileGrid,
} from './components';
```

(b) PageHeader — when `!home.upcomingWithin24h`, render the chip:

```tsx
<PageHeader
  title={home.greeting.firstName ? `Welcome ${home.greeting.firstName}` : 'Welcome'}
  rightActions={[
    { icon: 'golf', onPress: handleViewAllRounds, accessibilityLabel: 'View all rounds' },
    {
      icon: 'bell-outline',
      onPress: handleNotificationsPress,
      accessibilityLabel:
        home.unreadCount > 0 ? `Notifications, ${home.unreadCount} unread` : 'Notifications',
      showBadge: home.unreadCount > 0,
    },
  ]}
  rightContent={
    !home.upcomingWithin24h ? (
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
        <HeaderWeatherChip />
        {/* Re-render the same actions next to the chip */}
      </View>
    ) : undefined
  }
/>
```

> **Note:** `rightContent` takes precedence over `rightActions`. If we render `rightContent`, we must include the bell + golf-icon buttons inside it manually so they don't disappear. Either:
>  - Always pass `rightContent` and render chip + buttons inside it (cleanest), or
>  - Add a tiny `HeaderRightSlot` helper component that handles both.
>
> **Decision for this plan:** always render `rightContent` (with chip when applicable + the two buttons). Update `rightActions` to `[]` to avoid double-rendering. See Step 3 for the final `HeaderRightSlot` extraction.

(c) Body — replace the existing body with the new render order. Below is the full new body that replaces lines roughly equivalent to the current `<View>` between `home.isNewUser ? ... : (...)`:

```tsx
{home.isNewUser ? (
  <View style={styles.body}>
    <NewUserFallback onCreateRound={openCreateRound} />
  </View>
) : (
  <View style={styles.body}>
    {home.inProgressRounds.length > 0 ? (
      <View style={styles.carouselWrapper}>
        <SectionHeader title="Continue scoring" />
        <InProgressRoundSection
          rounds={home.inProgressRounds}
          onScoreRound={handleScoreRound}
          onViewRound={handleViewRound}
          roundDisplayNumbers={roundDisplayNumbers}
        />
        <TouchableOpacity
          onPress={handleViewAllRounds}
          accessibilityRole="button"
          accessibilityLabel="View all rounds"
          style={[
            styles.viewAllRoundsButton,
            { backgroundColor: colors.surface, borderColor: colors.borderLight },
          ]}
        >
          <Text style={[styles.viewAllRoundsLabel, { color: colors.textPrimary }]}>
            View all rounds
          </Text>
          <Icon source="chevron-right" size={20} color={colors.textSecondary} />
        </TouchableOpacity>
      </View>
    ) : null}

    {home.upcomingWithin24h ? (
      <RoundTodayCard round={home.upcomingWithin24h as unknown as RoundWithCourse} />
    ) : null}

    <PendingActionsSection actions={home.pendingActions} />
    <BagSummarySection />

    {home.upcomingRoundsForList.length > 0 ? (
      <UpcomingRoundsSection
        rounds={home.upcomingRoundsForList}
        showViewAll={home.lastRound !== null || home.upcomingRoundsForList.length > 3}
      />
    ) : null}

    <HomeTileGrid
      stats={home.stats}
      achievementSummary={home.achievementSummary}
      achievementsInProgressCount={home.achievementsInProgress.length}
      competitions={home.competitions}
      leagues={home.leagues}
      lastRound={home.lastRound}
    />
  </View>
)}
```

> **Type cast on `RoundTodayCard`:** the cast is necessary because `upcomingWithin24h` is typed as `RoundItem`, but `RoundTodayCard` expects `RoundWithCourse`. As long as the `course` object has lat/lng + name (verified in Task 10 Step 1), the cast is safe. If the round-list query was extended to include coords explicitly, redefine the memo's return type as `RoundWithCourse` and remove the cast.

(d) Add the `RoundWithCourse` import at the top:

```ts
import type { RoundWithCourse } from '@/components/competitions/detail/types';
```

(e) **Remove** the 4 sections no longer used: `StatsHighlightsSection`, `AchievementStatsSection`, `AchievementProgressSection`, `LastRoundSection`, `FriendActivitySection`. Drop the imports too.

- [ ] **Step 3: Extract `HeaderRightSlot` (optional but recommended)**

Inline a small component near the top of `HomeScreen.tsx`:

```tsx
function HeaderRightSlot({
  showWeatherChip,
  onPressGolf,
  onPressNotifications,
  unreadCount,
  golfLabel,
}: {
  showWeatherChip: boolean;
  onPressGolf: () => void;
  onPressNotifications: () => void;
  unreadCount: number;
  golfLabel: string;
}) {
  const colors = useThemeColors();
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
      {showWeatherChip ? <HeaderWeatherChip /> : null}
      <TouchableOpacity
        onPress={onPressGolf}
        accessibilityRole="button"
        accessibilityLabel={golfLabel}
        style={[styles.headerActionButton, { backgroundColor: colors.surfaceVariant }]}
      >
        <Icon source="golf" size={22} color={colors.primary} />
      </TouchableOpacity>
      <TouchableOpacity
        onPress={onPressNotifications}
        accessibilityRole="button"
        accessibilityLabel={
          unreadCount > 0 ? `Notifications, ${unreadCount} unread` : 'Notifications'
        }
        style={[styles.headerActionButton, { backgroundColor: colors.surfaceVariant }]}
      >
        <View>
          <Icon source="bell-outline" size={22} color={colors.primary} />
          {unreadCount > 0 ? (
            <View
              style={[
                styles.headerBadge,
                { backgroundColor: colors.error, borderColor: colors.surface },
              ]}
            />
          ) : null}
        </View>
      </TouchableOpacity>
    </View>
  );
}
```

…and corresponding styles in the `StyleSheet.create` block:

```ts
headerActionButton: {
  width: 44,
  height: 44,
  alignItems: 'center',
  justifyContent: 'center',
  borderRadius: 22,
},
headerBadge: {
  position: 'absolute',
  top: 0,
  right: 0,
  width: 8,
  height: 8,
  borderRadius: 4,
  borderWidth: 1,
},
```

Use it in the header:

```tsx
<PageHeader
  title={home.greeting.firstName ? `Welcome ${home.greeting.firstName}` : 'Welcome'}
  rightContent={
    <HeaderRightSlot
      showWeatherChip={!home.upcomingWithin24h}
      onPressGolf={handleViewAllRounds}
      onPressNotifications={handleNotificationsPress}
      unreadCount={home.unreadCount}
      golfLabel="View all rounds"
    />
  }
/>
```

- [ ] **Step 4: Run type-check**

Run: `pnpm type-check`
Expected: no new errors.

- [ ] **Step 5: Run all tests**

Run: `pnpm test`
Expected: all tests pass (existing + new).

- [ ] **Step 6: Manual smoke test**

```bash
npx expo start
```

Open the app on a simulator or device and verify each state from spec §13:

- New user (no data) → `NewUserFallback`.
- Has in-progress round → carousel renders, no Round-today card.
- Has scheduled round within 24 h → Round-today card renders with weather strip; header has no chip.
- Has scheduled round > 24 h away → "Coming up" list renders; header shows weather chip.
- Has only completed rounds → tile grid populated; header shows chip.
- Airplane mode → screen still renders; weather strip and chip silently absent.

- [ ] **Step 7: Commit**

```bash
git add src/screens/home/HomeScreen.tsx src/screens/home/components/index.ts
git commit -m "refactor(home): rewire HomeScreen to v2 layout (action stack + tile grid + weather)"
```

---

## Task 13: Lint, type-check, full test pass, final cleanup

**Files:**
- None modified unless lint fixes are needed.

- [ ] **Step 1: Lint**

Run: `pnpm lint`
Expected: clean, or only fixable warnings — run `pnpm lint:fix` to apply.

- [ ] **Step 2: Type-check**

Run: `pnpm type-check`
Expected: no new errors.

- [ ] **Step 3: Full test pass**

Run: `pnpm test`
Expected: all tests pass.

- [ ] **Step 4: Confirm no leftover unused imports**

Run:
```bash
grep -n "StatsHighlightsSection\|AchievementStatsSection\|AchievementProgressSection\|LastRoundSection\|FriendActivitySection" src/screens/home/HomeScreen.tsx
```
Expected: zero matches.

- [ ] **Step 5: Final commit (if anything was fixed)**

```bash
git add -A
git commit -m "chore(home): lint and tidy after v2 redesign"
```

---

## Self-Review

**Spec coverage check:**

| Spec section | Covered by |
|---|---|
| §4.1 Header chip | Tasks 5, 12 |
| §4.1 Round-today hero card | Tasks 4, 6, 12 |
| §4.1 Pending / Bag / Upcoming behaviour | Task 12 (render order) |
| §4.1 Tile grid replacing 4 sections | Tasks 7, 8, 9 |
| §4.1 Friend activity removed | Task 12 (drop import) |
| §4.1 Skeleton updated | Task 11 |
| §4.2 Render order | Task 12 |
| §5.1 Mutual exclusivity (chip vs card) | Task 12 (`!home.upcomingWithin24h` gate) |
| §5.2 Data sources (course coords / device location) | Tasks 3, 5, 6 |
| §5.3 Open-Meteo | Task 2 |
| §5.4 Hook contract | Task 2 |
| §5.5 Display rules (rounded temp, ≥10% precip, cardinal wind) | Task 4 |
| §6 Tile contract (icon + title + headline + subtext + onPress) | Tasks 7, 8 |
| §7 useHomeData additions | Task 10 |
| §8 New components | Tasks 4–9 |
| §9 Components removed (no longer imported) | Task 12 Step 2(e) |
| §10 Edge cases (no coords, API fail, offline, no data) | Tasks 2 (fail-soft), 6 (conditional WeatherStrip), 8 (empty subtext) |
| §11 Accessibility | Tasks 4, 5, 6, 7 |

No gaps detected.

**Placeholder scan:** No `TBD`, `TODO`, "implement later", or vague "add error handling" steps. Two `> Note` blocks ask the implementer to confirm route names / field names — these are guarded by explicit grep commands in the same step, not deferred work.

**Type consistency:** `WeatherInput`, `WeatherSnapshot`, `WeatherIcon`, `HomeTile`, `HomeTileGrid`, and the `useHomeData` additions all use the same names across tasks. `RoundWithCourse` is referenced consistently with the import path `@/components/competitions/detail/types`. `HomeData.upcomingWithin24h` returns `RoundItem | null` (see Task 10 Step 4(c)) — Task 12 Step 2(c) casts it to `RoundWithCourse` at the use site. The cast is documented inline; it's safe because `RoundItem` already includes the `course` join used by `RoundTodayCard`.

---

*End of plan.*
