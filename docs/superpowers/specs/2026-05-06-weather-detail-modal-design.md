# Weather Detail Modal — Design

**Date:** 2026-05-06
**Status:** Approved (brainstormed)
**Author:** Sam (with Claude)
**Surface:** Home screen header

## Problem

The home-screen header has an ambient weather chip (`HeaderWeatherChip`) showing only temperature + a condition icon for the user's device location. Users want to see more detail — what's the day going to look like for golf — without leaving the home screen. The chip is currently a non-interactive `View`.

## Goal

Tap the header weather chip → open a modal showing detailed weather for the user's location:
- **Today**, broken into a Morning (6am–12pm) bucket and an Afternoon (12pm–6pm) bucket
- A slim 2-day outlook (today + 1, today + 2)

Source remains Open-Meteo (free, no API key, already in use).

## Non-Goals

- Multi-location selection (always device GPS, same as the chip)
- Imperial units toggle (kept as °C / kph; can revisit when global units pref lands)
- Course-specific forecast (separate concern; `useUpcomingRoundWeather` already covers scheduled rounds)
- 7-day or 16-day forecast (deemed scope creep for an ambient chip-tap)
- Hourly drilldown view (morning/afternoon aggregation is the chosen abstraction)
- Push notifications, alerts, or background refresh
- Caching beyond the existing TanStack Query defaults

## User Flow

1. User opens the home screen → `HeaderWeatherChip` renders as today (showing °C + icon, unchanged visual).
2. User taps the chip → centered modal opens.
3. Modal mounts → fetches detailed forecast (3 days) from Open-Meteo via a new TanStack Query hook.
4. While loading: skeleton placeholders.
5. On success: header strip + Morning/Afternoon cards + 2-day outlook rows.
6. On failure: inline "Couldn't load weather right now" + retry button.
7. User dismisses via close button (×), backdrop tap, or hardware back (Android).

## Architecture

### File layout

```
src/
  hooks/weather/
    useWeather.ts                  (unchanged)
    useDeviceWeather.ts            (unchanged)
    useDetailedDayForecast.ts      [NEW] — hourly + daily, 3-day horizon
    aggregateWeatherBucket.ts      [NEW] — pure util, partitions hourly arrays
    weatherCodeToIcon.ts           (unchanged)
    index.ts                       [edit] — export new symbols

  screens/home/components/
    HeaderWeatherChip.tsx          [edit] — Pressable wrapper, owns modal-visible state
    WeatherDetailModal.tsx         [NEW] — centered modal, owns layout
    WeatherDetailModal.test.tsx    [NEW]

  __tests__/hooks/weather/
    aggregateWeatherBucket.test.ts [NEW]
    useDetailedDayForecast.test.tsx [NEW]
```

### Data flow

1. `HeaderWeatherChip` retains its `useDeviceWeather()` call for the chip itself. It additionally calls `useOneShotLocation()` (already used internally by `useDeviceWeather`) to obtain raw `coords` to pass to the modal. (Alternative: extend `useDeviceWeather()` to also expose the underlying `coords` so we don't double-call. Decide at implementation time — both are trivial.)
2. `HeaderWeatherChip` becomes a `Pressable` and owns local `modalVisible` state.
3. On tap → `setModalVisible(true)` → renders `<WeatherDetailModal visible coords={...} onDismiss={...} />`.
4. Modal calls `useDetailedDayForecast(coords)` which issues one Open-Meteo request returning hourly + daily blocks for 3 days.
5. The hook calls `aggregateWeatherBucket()` twice (morning, afternoon) for today, derives `DaySummary` rows for day+1 and day+2 from the daily block, and returns a single `DetailedForecast` shape.
6. Errors are logged and resolved as `null` (matches existing `useWeather` fail-soft behaviour at `src/hooks/weather/useWeather.ts:88`).

### Why a new hook (not extending `useWeather`)

`useWeather` is a focused union of two thin shapes (`current` / `at-time`). Adding a third, much heavier shape (`DetailedForecast`) would muddy its discriminated return type and force every caller to narrow. The new hook lives next to it, shares conventions (rounded coords, fail-soft error handling, same cache config), and keeps each file small.

## API: `useDetailedDayForecast`

```ts
type Coords = { lat: number; lng: number };

interface BucketStats {
  tempHighC: number;
  tempLowC: number;
  feelsLikeAvgC: number;
  dominantCode: number;          // most-frequent WMO code in the bucket
  windKphAvg: number;
  windGustKphMax: number;
  windDirDegAvg: number;          // circular mean
  precipProbabilityMax: number;   // 0-100
  precipMm: number;               // sum across bucket
  uvIndexMax: number;
}

interface DaySummary {
  dateIso: string;                // 'YYYY-MM-DD'
  weatherCode: number;            // daily dominant
  tempHighC: number;
  tempLowC: number;
  precipProbabilityMax: number;
  precipMm: number;
  windGustKphMax: number;
  uvIndexMax: number;
  sunriseIso: string;
  sunsetIso: string;
}

interface DetailedForecast {
  locationIso: string;             // resolved tz from API response
  today: {
    morning: BucketStats | null;   // null if window already passed
    afternoon: BucketStats | null;
    summary: DaySummary;
  };
  forecast: DaySummary[];          // length 2 (day+1, day+2)
  fetchedAt: string;
}

function useDetailedDayForecast(
  coords: Coords | null
): UseQueryResult<DetailedForecast | null>;
```

### Open-Meteo request

One GET to `https://api.open-meteo.com/v1/forecast` with:

```
?latitude=…&longitude=…&timezone=auto&forecast_days=3
&hourly=temperature_2m,apparent_temperature,weather_code,
        wind_speed_10m,wind_gusts_10m,wind_direction_10m,
        precipitation_probability,precipitation,uv_index
&daily=weather_code,temperature_2m_max,temperature_2m_min,
       precipitation_probability_max,precipitation_sum,
       wind_gusts_10m_max,uv_index_max,sunrise,sunset
```

### Caching / query config

- `queryKey: ['weather', 'detailed-day', roundedLat, roundedLng]` (lat/lng rounded to 2 decimals — same pattern as `useWeather`)
- `staleTime: CACHE_TIMES.STATIC`
- `gcTime: GC_TIMES.LONG`
- `enabled: coords !== null`
- Errors → log via `console.warn` and resolve as `null`

### Bucket windows (local time, derived from `timezone=auto` response)

- **Morning:** hours where `H >= 6 && H < 12`
- **Afternoon:** hours where `H >= 12 && H < 18`
- If "now" is past a bucket's end on today's date, that bucket returns `null` → modal renders an "Already passed" placeholder card.

## API: `aggregateWeatherBucket`

Pure function. No React, no fetch.

```ts
interface HourlySlice {
  time: string[];                     // ISO strings
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

function aggregateWeatherBucket(
  hourly: HourlySlice,
  startHour: number,    // inclusive (e.g. 6)
  endHour: number,      // exclusive (e.g. 12)
  dateIso: string,      // 'YYYY-MM-DD' — only count hours on this date
): BucketStats | null;
```

### Aggregation rules

| Field | Rule |
|---|---|
| `tempHighC` | max of `temperature_2m` in window |
| `tempLowC` | min of `temperature_2m` |
| `feelsLikeAvgC` | mean of `apparent_temperature` |
| `dominantCode` | mode of `weather_code` (ties → highest WMO number wins) |
| `windKphAvg` | mean of `wind_speed_10m` |
| `windGustKphMax` | max of `wind_gusts_10m` |
| `windDirDegAvg` | circular mean: `atan2(mean(sin θ), mean(cos θ))`, normalised 0–360 |
| `precipProbabilityMax` | max of `precipitation_probability` |
| `precipMm` | sum of `precipitation` |
| `uvIndexMax` | max of `uv_index` |

Returns `null` when no hours fall in the window for the given date.

### Why these specific rules

- **Max** for danger-y fields (gusts, precip prob, UV) so a 30-minute spike isn't averaged away.
- **Mean** for "what's it like overall" fields (feels-like, average wind).
- **Sum** for precipitation mm — total water is the meaningful aggregation.
- **Circular mean** for wind direction — arithmetic mean of 350° + 10° would absurdly give 180°.

## UI: `WeatherDetailModal`

### Props

```ts
interface WeatherDetailModalProps {
  visible: boolean;
  onDismiss: () => void;
  coords: { lat: number; lng: number } | null;
}
```

### Layout (centered, ~85% screen width, scrollable on small devices)

```
┌─────────────────────────────────────────────┐
│  [icon]  Tuesday 6 May            [×]       │
│  Sunny · High 21° / Low 11°                 │
│  [icon] Sunrise 6:42  ·  [icon] Sunset 17:31│
│  (sunrise/sunset use Material icons         │
│  'weather-sunset-up' / 'weather-sunset-down'│
│  via Paper's Icon component, not emoji)     │
├─────────────────────────────────────────────┤
│  TODAY                                      │
│  ┌─────────────────┐  ┌─────────────────┐   │
│  │ Morning         │  │ Afternoon       │   │
│  │ [icon] Sunny    │  │ [icon] Cloudy   │   │
│  │ 14° – 19°       │  │ 18° – 21°       │   │
│  │ Feels 16°       │  │ Feels 20°       │   │
│  │ Wind 12kph N    │  │ Wind 18kph NW   │   │
│  │ Gusts 22kph     │  │ Gusts 35kph     │   │
│  │ Rain 10% · 0mm  │  │ Rain 40% · 1.2mm│   │
│  │ UV 3            │  │ UV 7            │   │
│  └─────────────────┘  └─────────────────┘   │
├─────────────────────────────────────────────┤
│  NEXT DAYS                                  │
│  Wed 7 May   [icon]  19° / 9°   30% rain    │
│  Thu 8 May   [icon]  17° / 8°   60% rain    │
└─────────────────────────────────────────────┘
```

### Internal components (single file, extract only if reused)

- `<DayHeader summary={today.summary} />` — date, condition label, high/low, sunrise/sunset
- `<BucketCard label="Morning" stats={today.morning} />` — one card; renders "Already passed" placeholder when `stats === null`
- `<ForecastRow day={day} />` — slim row used twice in "Next days"

### States

- **Loading:** modal shell + 3 skeleton blocks (header / two bucket cards / forecast list). Matches existing skeleton style in `HomeSkeleton`.
- **Error / null forecast:** centered "Couldn't load weather right now" + retry button (calls `query.refetch()`).
- **Success:** the layout above.

### Theming and tokens

Per CLAUDE.md and the styling rules:
- Colors via `useThemeColors()` (no direct imports)
- Static tokens (`spacing`, `typography`, `borderRadius`, `shadows`) imported directly from `@/constants/theme`
- Cards use `borderRadius.xl`, `colors.surface`, `shadows.sm` — matches the project's pill/rounded shape language
- Reuse `weatherCodeToIcon()` for all condition icons
- All interactive elements ≥ 44×44 touch target

### Accessibility

- Modal: `accessibilityViewIsModal`, default RN Modal focus trap
- Close button: 44×44, `accessibilityLabel="Close weather details"`
- Each bucket card: combined `accessibilityLabel` summarising all stats so VoiceOver users get one read-out per bucket, not eight
- Chip's tap target gets `accessibilityHint="Opens detailed forecast"`
- Each forecast row: combined `accessibilityLabel` (e.g. "Wednesday 7 May, partly cloudy, high 19, low 9, 30 percent rain")

### Dismiss behaviours

- Close button (×)
- Backdrop tap
- Hardware back on Android (RN Modal `onRequestClose`)

### Units

- Celsius and kph (matches existing chip and Open-Meteo defaults)
- No Imperial toggle in scope; revisit when a global units preference exists

## Testing

### Unit tests

**`aggregateWeatherBucket.test.ts`** (covers the meat of the logic):
- Each rule with a hand-crafted 6-hour input (one assertion per field)
- Empty input → `null`
- Date filter: hourly array spanning two dates; only requested date's hours aggregated
- Window edges: `startHour=6, endHour=12` includes 6:00, excludes 12:00
- Wind direction wraparound: `[350, 10]` → ~0°, not 180°
- Tied dominant code: `[1, 1, 3, 3]` → returns 3 (higher WMO severity wins)
- All-zero precipitation → `precipMm: 0` (not `NaN`)

**`useDetailedDayForecast.test.tsx`** (mocked `fetch`, TanStack Query test wrapper):
- `coords: null` → query disabled (`data === undefined`)
- Happy path: mocked Open-Meteo response → returns expected `DetailedForecast` shape (smoke test, not re-testing aggregation)
- Non-OK HTTP response → returns `null`, no throw
- Fetch throws → returns `null`, no throw
- Past-bucket case: simulated "now" at 14:00 on test date → `morning: null`, `afternoon` populated

`weatherCodeToIcon.test.ts` already exists; no changes needed.

### Component tests

**`WeatherDetailModal.test.tsx`:**
- `visible=false` → renders nothing
- Loading → renders skeletons (assert by skeleton testIDs)
- Success → header date/condition rendered, both bucket labels, both forecast rows
- Error (mocked hook returns `null`) → "Couldn't load weather" + retry button; tap retry calls `refetch`
- Past-morning case → Morning card renders the "Already passed" placeholder
- Tap close button → `onDismiss` called
- Tap backdrop → `onDismiss` called
- Bucket card has the combined `accessibilityLabel` summarising all 8 fields

**`HeaderWeatherChip.test.tsx`** (extend existing):
- Tap chip → modal becomes visible
- Chip has `accessibilityHint="Opens detailed forecast"`
- Snapshot-null state still renders nothing and isn't tappable (chip self-hides)

### No e2e

Data layer is fail-soft and aggregation is fully unit-covered. An e2e here would mostly re-test RN Modal mechanics.

### Coverage targets

- `aggregateWeatherBucket`: 100% (pure, small, easy)
- `useDetailedDayForecast` and `WeatherDetailModal`: project-standard 80%+

## Open questions / future work

- If the weather surface set grows (course pages, round cards, league summary), consider promoting to `src/components/features/weather/` (Approach C from brainstorming).
- An expandable "show hourly" drill-down inside each bucket if users ask for it.
- Imperial units toggle — wait for a global units preference before introducing here.
- Multi-day expansion to 7 days — easy via `forecast_days` param if demand surfaces.

## Acceptance criteria

- [ ] Tapping the home-screen weather chip opens a centered modal.
- [ ] Modal shows today's morning + afternoon buckets, each with all 8 fields listed in the layout.
- [ ] Modal shows next 2 days as slim outlook rows.
- [ ] Modal handles loading, error, and "bucket already passed" states.
- [ ] Modal dismissable via close button, backdrop tap, and Android back.
- [ ] All new files theme-compliant (`useThemeColors`, static tokens) per CLAUDE.md.
- [ ] Unit + component tests pass; aggregation util at 100% coverage.
- [ ] No regression to existing `HeaderWeatherChip` ambient chip behaviour.
